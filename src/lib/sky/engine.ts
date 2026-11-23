// Sky for the home page: gas waves drifting across a night sky, drawn as a grid of cells.
//
// How it stays fast (the idea studied from Aria's sky):
// - The shader runs once per CELL, not once per screen pixel. The canvas is the size of the grid
//   (about 480 x 300 on a laptop). The browser scales it up by a whole number of device pixels with
//   `image-rendering: pixelated`, so every cell is a crisp square and nothing is computed per pixel.
// - Every cell picks one tone from a fixed ladder of 8 colours. Between two tones, a 4 x 4 Bayer
//   pattern chooses which one. This gives the clean dithered look.
// - A frame is drawn only when something visible changed (scroll, pointer, size, scene), or on a slow
//   ambient tick for the drift. Otherwise the frame is skipped.
// - Positions of sections and text are measured on load and resize, never during a frame.
//
// The page marks sections with `data-sky="<scene name>"` and text areas with `data-dim`.
// The sky stays near black behind `data-dim` areas so text stays readable.

type RGB = [number, number, number];
export interface Scene {
  gas: number; // amount of gas
  energy: number; // height and speed of the waves
  ripple: number; // rings that spread out from the centre (the hero)
  stars: number; // star density multiplier
}

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;

// ONE tone ladder for the whole page: black, then grey, then green, then near white.
// Faint gas is grey; only the brightest gas turns green. Because there is one ladder and one gas
// field, there are no separate colour layers to blend: the colour follows the brightness.
const LADDER = ['#050506', '#0b0c0d', '#121414', '#1a1f1d', '#22312a', '#2c4d3d', '#4f9772', '#dff7ea'].map(hex);

// Scenes only change how much gas there is and how it moves, never the colours.
const calm = { gas: 0.5, energy: 0.4, ripple: 0, stars: 0.9 };
const open = { gas: 0.66, energy: 0.6, ripple: 0, stars: 1 };
export const SCENES: Record<string, Scene> = {
  hero: { gas: 0.6, energy: 0.45, ripple: 1, stars: 1 },
  why: open,
  path: open,
  lesson: calm,
  index: calm,
  tools: open,
  promise: { ...open, gas: 0.72, energy: 0.7 },
  faq: calm,
  start: { gas: 0.7, energy: 0.6, ripple: 0.35, stars: 0.9 },
};

function mixScene(a: Scene, b: Scene, k: number): Scene {
  const m = (x: number, y: number) => x + (y - x) * k;
  return { gas: m(a.gas, b.gas), energy: m(a.energy, b.energy), ripple: m(a.ripple, b.ripple), stars: m(a.stars, b.stars) };
}

const VERT = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uGrid;          // grid size in cells
uniform float uTime;         // seconds (frozen with reduced motion)
uniform float uScroll;       // scroll in screen heights
uniform vec4 uScene;         // gas, energy, ripple, stars
uniform vec3 uPtr;           // pointer x, y (cells), strength 0..1
uniform vec3 uReveal;        // intro mask: centre x, y (cells), radius (cells); radius < 0 means off
uniform vec4 uDims[8];       // text areas in cells: left, top, right, bottom
uniform int uNDims;
uniform vec3 uLadder[8];

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++){ v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }

void main(){
  // Cell coordinates, origin top-left, y down.
  vec2 cell = vec2(gl_FragCoord.x, uGrid.y - gl_FragCoord.y);
  vec2 p = (cell - 0.5 * uGrid) / uGrid.y;   // height units, centred
  float t = uTime;
  float gasAmt = uScene.x, energy = uScene.y, rippleAmt = uScene.z;

  // One gas field. It drifts up a little slower than the page (parallax).
  vec2 q = p + vec2(0.0, uScroll * 0.12);
  vec2 w = vec2(fbm(q * 1.1 + vec2(t * 0.015, 0.0)), fbm(q * 1.1 + vec2(4.7, -t * 0.012)));
  float n = fbm(q * 1.7 + w * 1.6);
  float rid = 1.0 - abs(2.0 * fbm(q * 2.6 + w * 2.0 + vec2(-t * 0.01, t * 0.008)) - 1.0);
  rid = rid * rid * rid;                      // thin filaments, like spreading gas

  // Long wave bands, bent by the noise. Vertical streaks inside the bands give them the look of
  // aurora light. This is the same gas, not a second layer.
  float rays = 0.55 + 0.45 * sin(q.x * 34.0 + 3.0 * fbm(vec2(q.x * 2.5, t * 0.06)));
  float waves = 0.0;
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    float y0 = -0.3 + fi * 0.3 + 0.04 * sin(t * 0.07 + fi * 2.1);
    float amp = 0.06 + 0.06 * energy;
    float yy = q.y - y0 - amp * sin(q.x * (1.6 + fi * 0.55) + t * (0.1 + 0.05 * energy) * (1.0 + 0.3 * fi) + w.x * 4.0) - 0.06 * (w.y - 0.5);
    float wid = 0.035 + 0.018 * fi + 0.012 * energy;
    waves += exp(-yy * yy / (wid * wid)) * (0.35 + 1.1 * rid) * (0.55 + 0.65 * rays);
  }

  // Rings of gas that spread out from the centre (the hero only).
  float r = length(p - vec2(0.0, -0.02));
  float ring = pow(0.5 + 0.5 * sin(r * 24.0 - t * 1.1 + n * 5.0), 6.0);
  float ripple = ring * smoothstep(0.8, 0.2, r) * smoothstep(0.06, 0.2, r) * (0.35 + rid);

  float gas = gasAmt * (n * n * 0.5 + waves * 0.75 * (0.55 + 0.45 * energy)) + rippleAmt * ripple * 0.7;

  // Text areas (soft edges, 24 cells wide).
  float dimM = 0.0;
  for (int i = 0; i < 8; i++){
    if (i >= uNDims) break;
    vec4 d = uDims[i];
    vec2 e = min(cell - d.xy, d.zw - cell);
    dimM = max(dimM, smoothstep(-24.0, 16.0, min(e.x, e.y)));
  }

  // Pointer: a soft light that lifts the gas near it.
  float pd = length(cell - uPtr.xy) / uGrid.y;
  float light = uPtr.z * exp(-pd * pd / 0.012) * (0.4 + gas * 1.5);

  // Ladder position (0 = empty sky, 7 = brightest).
  float v = 0.25 + gas * 6.4 + light * 2.0;

  // Stars: single cells, the brightest as a small cross. None behind text.
  vec2 sc = floor(cell + vec2(0.0, floor(uScroll * uGrid.y * 0.05)));
  float dens = 0.0055 * uScene.w;
  float h = hash(sc);
  float tw = 0.65 + 0.35 * sin(t * (0.6 + h * 2.0) + h * 80.0);
  float star = h > 1.0 - dens ? tw : 0.0;
  float big = 1.0 - dens * 0.08;
  if (hash(sc + vec2(1, 0)) > big || hash(sc - vec2(1, 0)) > big || hash(sc + vec2(0, 1)) > big || hash(sc - vec2(0, 1)) > big) star = max(star, 0.55 * tw);
  star *= 1.0 - dimM;
  if (star > 0.0) v = max(v, 3.5 + star * 3.5);

  // Behind text the sky stays near black.
  v = min(v, mix(7.0, 1.2, dimM));

  // Intro: the sky pours out from the centre of the title.
  if (uReveal.z >= 0.0){
    float rd = length(cell - uReveal.xy);
    float edge = exp(-pow((rd - uReveal.z) / 9.0, 2.0));
    v *= smoothstep(uReveal.z + 16.0, uReveal.z - 10.0, rd);
    v += edge * 2.0 * (1.0 - dimM);
  }

  // Dither between two neighbouring steps of the one ladder.
  float b = bayer4(cell);
  v = clamp(v, 0.0, 7.0);
  int idx = min(int(floor(v)) + (fract(v) > b ? 1 : 0), 7);
  o = vec4(uLadder[idx], 1.0);
}`;

export interface SkyOptions {
  reducedMotion: boolean;
  ambientFps?: number;
}

export function createSky(canvas: HTMLCanvasElement, opts: SkyOptions) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    grid: U('uGrid'), time: U('uTime'), scroll: U('uScroll'), scene: U('uScene'), ptr: U('uPtr'),
    reveal: U('uReveal'), dims: U('uDims'), ndims: U('uNDims'), ladder: U('uLadder'),
  };
  gl.uniform3fv(u.ladder, LADDER.flat());

  const reduce = opts.reducedMotion;
  const ambient = opts.ambientFps ?? 24;

  // Grid and size.
  const S = { gw: 0, gh: 0, cellCss: 3, vw: 0, vh: 0 };
  const resize = () => {
    const vw = Math.max(1, innerWidth);
    const vh = Math.max(1, innerHeight);
    const dpr = Math.max(1, Math.min(devicePixelRatio || 1, 3));
    const cellCss = Math.max(3, Math.round(Math.max(vw, vh * 1.4) / 480));
    const cellDev = Math.max(1, Math.round(cellCss * dpr));
    const gw = Math.ceil((vw * dpr) / cellDev);
    let gh = Math.ceil((vh * dpr) / cellDev);
    // Phone toolbars change the height while scrolling: keep the taller grid instead of resizing.
    if (gw === S.gw && gh <= S.gh && gh > S.gh * 0.8) gh = S.gh;
    S.vw = vw;
    S.vh = vh;
    S.cellCss = cellDev / dpr;
    if (gw !== S.gw || gh !== S.gh) {
      S.gw = gw;
      S.gh = gh;
      canvas.width = gw;
      canvas.height = gh;
      canvas.style.width = `${(gw * cellDev) / dpr}px`;
      canvas.style.height = `${(gh * cellDev) / dpr}px`;
      gl.viewport(0, 0, gw, gh);
    }
    measure();
    dirty = true;
  };

  // Sections and text areas, measured in page coordinates (not per frame).
  let sections: { top: number; h: number; name: string }[] = [];
  let dimRects: [number, number, number, number][] = [];
  const measure = () => {
    const y = scrollY;
    sections = [...document.querySelectorAll<HTMLElement>('[data-sky]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + y, h: Math.max(1, r.height), name: el.dataset.sky || 'hero' };
    });
    dimRects = [...document.querySelectorAll<HTMLElement>('[data-dim]')].map((el) => {
      const r = el.getBoundingClientRect();
      return [r.left, r.top + y, r.right, r.bottom + y];
    });
  };

  // Scene for the current scroll position: blend into the next section over the last 40% of this one.
  const sceneAt = (sy: number): Scene => {
    if (!sections.length) return SCENES.hero;
    const anchor = sy + S.vh * 0.5;
    let i = sections.findIndex((s) => anchor < s.top + s.h);
    if (i < 0) i = sections.length - 1;
    const a = SCENES[sections[i].name] || SCENES.hero;
    const next = sections[i + 1];
    if (!next) return a;
    const k = Math.min(1, Math.max(0, ((anchor - sections[i].top) / sections[i].h - 0.6) / 0.4));
    const e = k * k * (3 - 2 * k);
    return e > 0 ? mixScene(a, SCENES[next.name] || a, e) : a;
  };

  // Pointer light that eases toward the pointer.
  const P = { x: -1e4, y: -1e4, ex: 0, ey: 0, a: 0, here: false };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    P.x = e.clientX;
    P.y = e.clientY;
    if (!P.here) {
      P.ex = P.x;
      P.ey = P.y;
    }
    P.here = true;
  };
  const onLeave = () => (P.here = false);

  // Intro: the sky pours out from the centre of the hero title.
  const titleEl = document.querySelector<HTMLElement>('[data-sky-origin]');
  const intro = { on: !reduce && !!titleEl, start: -1, cx: 0, cy: 0, max: 0 };

  let dirty = true;
  let lastRender = -1e9;
  let lastNow = 0;
  let clock = reduce ? 30 : 0;
  let lastSig = '';
  let raf = 0;
  let running = true;
  const dimBuf = new Float32Array(32);

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!running || document.hidden) return;
    render(now);
  };

  const render = (now: number, force = false) => {
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;
    if (!reduce) clock += dt;

    const k = 1 - Math.exp(-dt * 8);
    P.ex += (P.x - P.ex) * k;
    P.ey += (P.y - P.ey) * k;
    P.a += ((P.here ? 1 : 0) - P.a) * Math.min(1, dt * 3);
    if (P.a < 0.003) P.a = 0;

    const sy = scrollY;
    let reveal = -1;
    if (intro.on) {
      if (intro.start < 0) {
        intro.start = now;
        const r = titleEl!.getBoundingClientRect();
        intro.cx = r.left + r.width / 2;
        intro.cy = r.top + r.height / 2;
        intro.max = Math.hypot(S.vw, S.vh);
      }
      const p = Math.min(1, (now - intro.start) / 1800);
      reveal = (1 - (1 - p) ** 3) * intro.max;
      if (p >= 1) intro.on = false;
    }

    const sig = `${sy.toFixed(0)}|${P.ex.toFixed(0)},${P.ey.toFixed(0)},${P.a.toFixed(2)}|${reveal.toFixed(0)}`;
    const changed = sig !== lastSig || dirty;
    const due = !reduce && now - lastRender >= 1000 / ambient - 4;
    if (!changed && !due && !force) return; // nothing on screen would change: skip this frame
    lastSig = sig;
    dirty = false;
    lastRender = now;

    const sc = sceneAt(sy);
    const toCell = 1 / S.cellCss;
    let nd = 0;
    for (const [l, t, r, b] of dimRects) {
      const top = t - sy;
      const bottom = b - sy;
      if (bottom < -40 || top > S.vh + 40 || nd >= 8) continue;
      dimBuf.set([l * toCell, top * toCell, r * toCell, bottom * toCell], nd * 4);
      nd++;
    }

    gl.uniform2f(u.grid, S.gw, S.gh);
    gl.uniform1f(u.time, clock);
    gl.uniform1f(u.scroll, sy / S.vh);
    gl.uniform4f(u.scene, sc.gas, sc.energy, reduce ? 0 : sc.ripple, sc.stars);
    gl.uniform3f(u.ptr, P.ex * toCell, P.ey * toCell, P.a);
    gl.uniform3f(u.reveal, intro.cx * toCell, intro.cy * toCell, reveal < 0 ? -1 : reveal * toCell);
    gl.uniform4fv(u.dims, dimBuf);
    gl.uniform1i(u.ndims, nd);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    stats.renders++;
  };

  const stats = { renders: 0 };
  const onResize = () => resize();
  const ro = new ResizeObserver(() => {
    measure();
    dirty = true;
  });
  ro.observe(document.body);
  addEventListener('resize', onResize);
  addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  document.fonts?.ready.then(() => {
    measure();
    dirty = true;
  });
  resize();
  raf = requestAnimationFrame(frame);

  // Timing check: draws n frames and waits for the GPU. Returns milliseconds per frame.
  const bench = (n = 60) => {
    const px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < n; i++) render(t0 + i * 16, true);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return { msPerFrame: (performance.now() - t0) / n, cells: S.gw * S.gh };
  };

  return {
    stats,
    bench,
    pause: (v: boolean) => (running = !v),
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener('resize', onResize);
      removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    },
  };
}
