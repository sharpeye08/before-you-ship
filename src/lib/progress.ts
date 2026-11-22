// Reader progress, stored only in this browser. No login, nothing sent anywhere.
// Every access is wrapped in try/catch: storage can be blocked or unavailable.

const COMPLETED_KEY = 'bys:completed';
const RECENT_KEY = 'bys:recent';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: progress just won't be saved */
  }
}

export function getCompleted(): string[] {
  const value = read<unknown>(COMPLETED_KEY, []);
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
}

export function isCompleted(slug: string): boolean {
  return getCompleted().includes(slug);
}

export function setCompleted(slug: string, done: boolean) {
  const set = new Set(getCompleted());
  if (done) set.add(slug);
  else set.delete(slug);
  write(COMPLETED_KEY, [...set]);
}

export interface RecentVisit {
  slug: string;
  at: number;
}

export function getRecent(): RecentVisit[] {
  const value = read<unknown>(RECENT_KEY, []);
  return Array.isArray(value)
    ? value.filter((v): v is RecentVisit => v && typeof v.slug === 'string' && typeof v.at === 'number')
    : [];
}

export function recordVisit(slug: string) {
  const rest = getRecent().filter((v) => v.slug !== slug);
  write(RECENT_KEY, [{ slug, at: Date.now() }, ...rest].slice(0, 10));
}

export function timeAgo(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
