---
title: "Two people typed in the same document at once. Who wins?"
slug: collaborative-editing
order: 65
level: 5
levelName: Systems & architecture
concepts: [Last write wins, Operational transformation (OT), CRDTs, Convergence, Offline editing, Yjs and Automerge]
readTime: 14 min
quiz:
  - question: "Your notes app saves the whole note when someone clicks Save. Alice and Bob open the same note. Alice adds a line and saves. Then Bob changes a word in his copy and saves. What happens?"
    options:
      - text: "Both changes are kept, because they touched different lines"
      - text: "The app shows an error to both users"
      - text: "Alice's new line is lost, because Bob's save replaced the whole note with his older copy plus his change"
        correct: true
      - text: "Bob's change is lost, because Alice saved first"
    explanation: "This is last write wins. Bob's copy was loaded before Alice saved, so it doesn't have her line. When he saves the whole note, his version replaces hers. This is a lost update."

  - question: "The document says \"cat\". At the same moment, Bob inserts \"The \" at position 0 and Alice inserts \"s\" at position 3. With operational transformation, what happens to Alice's change when it reaches Bob?"
    options:
      - text: "It is applied at position 3, giving \"Thes cat\""
      - text: "It is moved to position 7, because Bob added 4 characters before it, giving \"The cats\""
        correct: true
      - text: "It is thrown away because it came second"
      - text: "Bob is asked to choose which change to keep"
    explanation: "OT adjusts (transforms) each change against the changes that happened at the same time. Bob added 4 characters in front of Alice's position, so her insert moves from 3 to 7."

  - question: "How does a CRDT avoid the \"position 3 is now in the wrong place\" problem?"
    options:
      - text: "It locks the document so only one person types at a time"
      - text: "It sends every change to a server that decides the order"
      - text: "It asks users to merge changes by hand"
      - text: "It gives each character a permanent ID and describes inserts as \"after this ID\", so changes don't depend on positions"
        correct: true
    explanation: "Positions shift when others type, but IDs never change. Because of this, every device can apply the same changes in any order and still end up with the same text."

  - question: "You're building a notes app that must work on a plane with no internet, then sync when the user lands. Which approach fits best?"
    options:
      - text: "A CRDT library such as Yjs or Automerge"
        correct: true
      - text: "Last write wins on the whole note"
      - text: "Operational transformation that needs every change to pass through a live server"
      - text: "Locking the note while the user is offline"
    explanation: "CRDTs are designed to let each device edit on its own and merge later, without a central server deciding the order. That's exactly the offline case."

  - question: "Alice changes the word \"red\" to \"blue\" and, at the same time, Bob changes it to \"green\". A text CRDT merges both. What is a likely result?"
    options:
      - text: "The app crashes"
      - text: "Both words, like \"bluegreen\", the same on every device"
        correct: true
      - text: "\"red\", because the changes cancel out"
      - text: "Each user keeps seeing their own word forever"
    explanation: "A CRDT guarantees that everyone ends up with the same text, not that the text is what people meant. Both inserts survive, so humans may still need to tidy up."

  - question: "Your team wants real-time co-editing in the app. What's the most sensible plan?"
    options:
      - text: "Ask the AI to write a new OT algorithm from scratch"
      - text: "Save the whole document every second and hope for the best"
      - text: "Use a well-tested library like Yjs or Automerge, and keep authorization and saving on your server"
        correct: true
      - text: "Store every keystroke in a separate database row"
    explanation: "OT and CRDTs are full of rare edge cases that take experts years to get right. Libraries have already solved them. Your job is the parts only you can do: who can edit, and where documents are stored."
---

# Two people typed in the same document at once. Who wins?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Lost update:** two people read the same value, and one save silently overwrites the other. *([A customer got charged twice. How?](/lessons/charged-twice))*
> - **WebSocket:** a connection that stays open, so the server and browser can both send messages at any moment. *([How chat apps update without you refreshing](/lessons/realtime-updates))*
> - **Eventual consistency:** copies of data that catch up a moment later, instead of instantly. *([When everything calls everything, everything breaks](/lessons/event-driven-architecture))*
> - **Event sourcing:** storing every change, in order, instead of only the latest state. *([What if your database remembered everything that ever happened?](/lessons/event-sourcing))*

## The paragraph that disappeared

You built a shared notes app for study groups. It has a big text box and a Save button. When you click Save, the app sends the whole note to the server, and the server stores it.

Alice and Bob open the group's note at 7:00. It says:

```text
Exam on Friday. Bring a calculator.
```

At 7:02, Alice adds a line, *"Chapter 4 is not on the exam"*, and saves. At 7:03, Bob changes "Friday" to "Friday at 9:00" in his copy and saves.

The note now says exactly what Bob's screen said: the exam time, but no Chapter 4 line. Alice's work is gone. Nobody saw an error. On Thursday night, half the group studies Chapter 4 for nothing.

So who wins when two people type in the same document? In your app: whoever clicked Save **last**. This lesson shows why that's a bad rule, the two smart ideas real editors use instead, and why you should almost never build either one yourself.

---

## Why "last write wins" loses work

Your app uses a rule called **last write wins (LWW)**: when two versions collide, the one saved last replaces the other completely.

Bob's copy was loaded at 7:00, before Alice's change. When he saved at 7:03, he didn't send "fix one word". He sent "the note is now *this*", with his whole old copy plus his change. That's the **lost update** you met with database rows, now with a document.

LWW isn't always wrong. For one field, such as a profile's display name, the latest value is usually the right one. It's wrong when the value is big and people change *different parts* of it, like a document.

### The simple fixes, and where they stop

Before reaching for anything clever, there are two simple options:

1. **Lock the document.** While Alice edits, Bob can only read. No conflicts, but no working together either.
2. **Detect the conflict and ask.** Give each note a version number. A save only succeeds if the version hasn't changed since you loaded it:

```sql
UPDATE notes SET body = $1, version = version + 1
WHERE id = $2 AND version = $3;
-- 0 rows updated: someone saved first. Reload and try again.
```

Bob's save says "I loaded version 7". Alice's save already made it version 8, so no row matches, nothing is overwritten, and the app tells Bob to reload. This is enough for many apps: wikis, settings pages, product descriptions.

But it isn't what people expect from Google Docs. There, both people type at the same time, they see each other's letters appear, and nobody is told "please reload". For that, each keystroke has to be sent as a small change, and the changes from different people have to be combined. That's where the real problem starts.

---

## The real problem: positions move

Send changes instead of whole documents. A change is something like "insert `s` at position 3". The **position** is how many characters come before it, counting from 0.

The document says `cat`. At the same moment:

- **Bob** types `The ` at the start: *insert "The " at position 0*. His screen shows `The cat`.
- **Alice** types `s` at the end: *insert "s" at position 3*. Her screen shows `cats`.

Each change is sent to the other person. Alice applies Bob's change to `cats` and gets `The cats`. Correct.

Bob applies Alice's change, "insert `s` at position 3", to `The cat`:

```text
T h e _ c a t
0 1 2 3 4 5 6
        ^ position 3 is now here
Result: "Thes cat"
```

Alice meant "after `cat`". But on Bob's screen, Bob's four new characters pushed `cat` to the right, so position 3 now points somewhere else. Alice sees `The cats`, Bob sees `Thes cat`, and they'll never agree again.

The goal of collaborative editing is **convergence**: once everyone has received every change, everyone sees the same document. There are two well-known ways to get there.

---

## Idea 1: Operational transformation (OT)

**Operational transformation (OT)** fixes the position before applying a change. When a change arrives, it's adjusted, or **transformed**, against the changes that happened at the same time that it didn't know about.

In our example, Bob's side knows that Bob inserted 4 characters at position 0, before position 3. So Alice's change is transformed from "insert `s` at 3" to "insert `s` at 7". Bob's screen becomes `The cats`. Both match.

Rules like this exist for every pair of operation types: insert vs insert, insert vs delete, delete vs delete, and in rich text, formatting vs all of those. The rules are small. Getting all of them right, in every order, is very hard.

OT systems usually rely on a **central server**: every change goes through it, the server puts all changes into one official order, and each browser transforms incoming changes against its own changes that the server hasn't confirmed yet.

Google Docs is the best-known example. In a 2010 series about its new editor, Google explained that it uses OT to merge editors' changes, together with a protocol between each browser and Google's servers. Google wrote that if OT is implemented correctly, everyone ends up looking at the same version once all changes have arrived. The older editor, they wrote, compared whole document versions instead, and that approach often couldn't tell how two people's changes were meant to fit together.

**OT in short:** changes are positions plus a clever adjustment step, with a server keeping the official order.

---

## Idea 2: CRDTs

A **CRDT** (**conflict-free replicated data type**) takes a different route: it removes the problem instead of fixing it after the fact.

The problem was that positions move. So a text CRDT doesn't use positions. It gives **every character a permanent, unique ID**, for example the author's ID plus a counter. Say Alice typed `cat`: its letters get the IDs `alice-1`, `alice-2` and `alice-3`. Changes then point at IDs instead of numbers:

- Alice's change: *insert "s" after the character `t` (ID `alice-3`)*
- Bob's change: *insert "The " at the very start*

When Bob's device applies Alice's change, it looks for `alice-3`. That `t` is still the same `t`, wherever Bob's typing pushed it. So `s` lands after it, and both get `The cats`. No adjustment needed.

What if two people insert after the *same* character at the same time? The CRDT has a fixed tie-break rule, for example "compare the authors' IDs". Every device uses the same rule, so every device picks the same order.

This leads to the key property. CRDT changes can be applied **in any order, and even more than once**, and every copy still ends up the same. The Yjs documentation describes its updates in exactly these terms: they can be applied in any order and multiple times.

Because order doesn't matter, CRDTs **don't need a central server** to decide it. Devices can edit offline for hours, then exchange changes with a server, or directly with each other (**peer-to-peer**), and still converge.

**CRDTs in short:** every piece of data gets a permanent identity, so changes merge the same way everywhere, in any order.

---

## How it goes wrong: the trade-offs

Neither idea is free. Here's how they compare:

| | OT | CRDTs |
|---|---|---|
| Who decides the order? | A central server | Nobody needs to |
| Offline editing for hours | Hard | Designed for it |
| Peer-to-peer (no server) | Hard | Possible |
| Extra data stored | Little: the document stays plain text | IDs for every piece of text, and some trace of deleted text |
| Main difficulty | Transformation rules for every pair of operations | Keeping that extra data small and fast |

Some products mix ideas. Figma, the design tool, wrote in 2019 that it chose not to use OT because it was more complex than its problem needed. Instead, its system was *inspired* by CRDTs, but it isn't a true CRDT: because Figma's server is the central authority, they could leave out some of the extra work a fully decentralized CRDT needs.

### "Conflict-free" doesn't mean "what you meant"

A CRDT guarantees that everyone sees **the same** document. It doesn't guarantee it's **a sensible** one. Say the note says `red`. Alice selects it and types `blue`. At the same time, Bob selects it and types `green`. Both deleted `red`, and both inserts survive. Everyone converges on something like `bluegreen`. Consistent, and still wrong. Humans have to fix it, so show people where others are typing, and keep a version history so mistakes can be undone.

### The bugs you'll actually hit

- **Building it yourself.** "Make my editor collaborative" can lead the AI to write its own OT or merge logic. It will work in a demo with two tabs and fail in rare cases you won't see until users lose text.
- **No authorization on the sync server.** The editor syncs perfectly, and anyone who guesses a document's ID can connect and read or change it. Every collaboration server needs the same ownership check as any API route.
- **Saving only in memory.** The sync server holds documents in memory and restarts during a deploy. Store documents in your database, too.
- **Mixing models.** The text syncs through the library, but the title is saved with a normal form and LWW. Now some fields merge and others overwrite.

> **Go deeper:** [Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed) (Level 2) covers the authorization check every connection still needs.

---

## What good looks like: use a library, own the edges

The practical answer for almost everyone: **don't implement OT or a CRDT yourself. Use a library.** Two well-known open-source ones are:

- **Yjs:** a CRDT library for building collaborative apps. It works over any network, including WebSocket and WebRTC (a way for browsers to connect to each other directly), and doesn't need a central source of truth. It has ready-made connections to popular text editors such as ProseMirror, Tiptap, Quill, CodeMirror and Monaco.
- **Automerge:** a CRDT library for "local-first" apps, where each device keeps its own copy and works offline. It merges concurrent changes without needing a central server and keeps a history of changes, so you can look at and compare old versions.

Here's two copies of a Yjs document syncing, in the browser or in Node:

```js
const alice = new Y.Doc();
const bob = new Y.Doc();
alice.on("update", (u) => Y.applyUpdate(bob, u)); // send Alice's changes to Bob
bob.on("update", (u) => Y.applyUpdate(alice, u)); // and Bob's to Alice

alice.getText("note").insert(0, "cat");
bob.getText("note").insert(0, "The ");
```

Each document is a `Y.Doc`. `getText("note")` gives a shared piece of text, and `insert(index, text)` edits it. When a document changes, it fires an `update` with a small binary description of the change. Here we pass it straight to the other document. In a real app, you'd send it over a WebSocket to your server and other users. You never write merge logic; the library does it.

Your job is the parts no library can decide for you:

1. **Choose by your users' needs.** Do people really edit at the same time? If not, a version number and "please reload" is far simpler. Do they need offline? If yes, lean toward CRDTs.
2. **Keep a server, even with CRDTs.** Use it to check who may open each document, store documents in your database, and keep backups. "No central server needed" is a capability, not a requirement.
3. **Plan for size.** CRDT documents carry extra data. Test with your biggest real document, not a short demo.
4. **Add the human parts:** see other people's cursors, undo, and version history.

> **Go deeper:** [How chat apps update without you refreshing](/lessons/realtime-updates) (Level 4) explains the WebSocket connections that carry these changes.

---

## Test it yourself

1. **The two-tab test.** Open the same document in two browser windows, logged in as two users. Type in both at once, in the same sentence. Does every letter survive? Do both windows end up identical?
2. **The stale-save test.** Load a document in both windows. Edit and save in window 1. Then edit and save in window 2 *without reloading*. Is window 1's change still there?
3. **The offline test.** In developer tools, open the **Network** tab and set it to **Offline** in one window. (If your editor's connection stays open anyway, turn off that computer's Wi-Fi instead.) Type there, type in the other window too, then go back online. What happens?
4. **The stranger test.** Log in as a third user who isn't invited. Try to open or connect to the document by its ID.

---

## Takeaways

**Key terms**
- **Last write wins (LWW):** the version saved last replaces the other, losing its changes
- **Convergence:** once all changes arrive, everyone sees the same document
- **Operational transformation (OT):** adjusting each change against the changes made at the same time, usually with a central server setting the order
- **CRDT:** a data type where every piece has a permanent identity, so changes merge the same way in any order, without a central server
- **Peer-to-peer:** devices exchanging changes directly, without a server in the middle
- **Yjs and Automerge:** widely used open-source CRDT libraries

**Which step broke?**
- A user's whole edit vanished → saving whole documents with last write wins
- Letters land in the wrong place → changes based on positions, with no transformation
- Two screens show different text forever → home-made merge logic
- Anyone with the link can edit → no authorization on the sync server
- Documents vanish after a deploy → the sync server kept them only in memory
- Text merged into nonsense like "bluegreen" → working as designed; add cursors and history

**Ask your AI**
- *"When two users edit the same record or document in my app at the same time, what exactly happens? Walk me through it step by step."*
- *"Should my app use a version check, OT or a CRDT library like Yjs? Ask me about offline use, how many people edit at once and document size before you answer."*
- *"Show me where my collaboration server checks that the connecting user is allowed to open this document, and where documents are saved to the database."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Deleted text in CRDTs.** If Bob deletes `t` while Alice inserts `s` after it, Alice's change still says "after `alice-3`". So a CRDT can't forget deleted characters right away. Many keep a marker for deleted content, often called a **tombstone**, and clean up when it's safe. This is part of why CRDT documents are larger than the plain text.

**Why OT is so hard to get right.** With two users and only inserts, the rules are short. Add deletes, rich text formatting, tables and undo, and the number of combinations grows quickly. Google's 2010 post noted that its OT logic had to handle the different ways its insert, delete and formatting operations could interact. Most OT systems avoid the hardest cases by having one server decide the order.

**Not only text.** CRDTs also exist for lists, maps (key-value objects), counters and sets. Yjs offers shared types such as maps and arrays besides text. For a single value, like a title, many CRDTs fall back to "last write wins" for that one field, which is fine for a small value.

**State vectors.** When two Yjs documents reconnect after being offline, they don't need to send everything. Each can describe what it already has (a "state vector"), and the other sends only the missing changes using `Y.encodeStateAsUpdate(doc, stateVector)`.

**How this connects to event sourcing.** OT and CRDT systems are, in a sense, logs of small changes that everyone replays. Automerge leans into this: it keeps the change history, so you can view old versions, compare them and create branches.

</details>

## References

- [What's different about the new Google Docs: Working together, even apart](https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs_21.html): Google Drive Blog, September 2010. The old editor compared whole document versions, which couldn't always merge changes the way editors meant; the new one stores a list of changes.
- [What's different about the new Google Docs: Conflict resolution](https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs_22.html): Google Drive Blog, September 2010. Google Docs uses operational transformation to merge editors' changes, the guarantee that editors converge when OT is implemented correctly, and OT handling every way its insert, delete and style operations interact.
- [What's different about the new Google Docs: Making collaboration fast](https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs.html): Google Drive Blog, September 2010. The collaboration protocol between each browser and Google's servers, with the server keeping one official order of changes.
- [How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/): Figma, October 2019. Figma decided against OT, and its system is inspired by CRDTs but isn't a true CRDT, with Figma's server as the central authority.
- [About CRDTs](https://crdt.tech/): crdt.tech. What a CRDT is: copies updated independently and without coordination can always be merged into a consistent state.
- [Yjs: Introduction](https://docs.yjs.dev/): Yjs docs. Yjs is a CRDT for collaborative apps, network-agnostic, needs no central source of truth, and has editor bindings for ProseMirror, Tiptap, Monaco, Quill and CodeMirror.
- [Yjs: Document Updates](https://docs.yjs.dev/api/document-updates): Yjs docs. The `update` event, `Y.applyUpdate`, `Y.encodeStateAsUpdate`, and updates that can be applied in any order and multiple times.
- [Yjs: Y.Text](https://docs.yjs.dev/api/shared-types/y.text): Yjs docs. `getText` and `insert(index, content)`.
- [Welcome to Automerge](https://automerge.org/docs/hello/): Automerge docs. Automerge as a CRDT library that merges concurrent changes without a central server, works offline, and keeps change history.
