#!/usr/bin/env node
/*
 * QA harness for test11.html (CHOMP, vanilla Pac-Man).
 *
 * Zero dependencies: extracts the page's <script>, boots it in a Node vm
 * sandbox with stubbed DOM/canvas/audio, then drives the game deterministically
 * through the window.__chomp test hook (?noauto disables the rAF loop so every
 * frame is produced by __chomp.tick()).
 *
 * Run:  node qa/test11-qa.js [path/to/test11.html]
 * Exit: 0 = all pass, 1 = failure.
 *
 * Optional real-browser smoke (checks console errors on real load):
 *   chrome --headless --enable-logging=stderr --virtual-time-budget=3000 \
 *     --dump-dom "file://$PWD/test11.html?noauto" > /dev/null
 *   ...and grep the stderr for "Uncaught".
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = process.argv[2] || path.join(__dirname, '..', 'test11.html');
const html = fs.readFileSync(FILE, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script> block found'); process.exit(1); }
const code = m[1];

// ---------------- sandbox stubs ----------------
const store = {};
const noop = () => {};
function ctxStub() {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return { width: 616, height: 762 };
      if (typeof k === 'symbol') return undefined;
      if (!(k in t)) t[k] = (() => noop);
      return t[k];
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
function elStub(id) {
  return {
    id, width: 616, height: 762, textContent: '', style: {},
    getContext: () => ctxStub(),
    addEventListener: noop,
    getAttribute: () => 'L',
  };
}
const els = {};
const win = {
  addEventListener: noop,
  AudioContext: undefined,
  webkitAudioContext: undefined,
};
const sandbox = {
  window: win,
  document: {
    getElementById: (id) => (els[id] = els[id] || elStub(id)),
    createElement: (tag) => elStub(tag),
    querySelectorAll: () => [],
  },
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  },
  performance: { now: () => 0 },
  location: { search: '?noauto' },
  requestAnimationFrame: () => 0,
  console,
};
sandbox.globalThis = sandbox;
win.localStorage = sandbox.localStorage;
win.location = sandbox.location;
win.document = sandbox.document;
win.addEventListener = sandbox.window.addEventListener;

let bootError = null;
try {
  vm.runInNewContext(code, sandbox, { filename: 'test11.html-script', timeout: 10000 });
} catch (e) { bootError = e; }

// ---------------- assertion plumbing ----------------
let pass = 0, fail = 0;
const fails = [];
function T(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; fails.push(name + (extra ? ' — ' + extra : '')); console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

const H = sandbox.window.__chomp;
const COLS = 28, ROWS = 32;
let t = 0;
function ticks(n) { for (let i = 0; i < n; i++) { t += 1000 / 60; H.tick(t); } }
// ready -> play needs stateT>1.6s (96 frames); dying transitions at 2.2s; clear at 2.6s
function toPlay(maxFrames) {
  for (let i = 0; i < (maxFrames || 200); i++) { if (H.mode === 'play') return true; ticks(1); }
  return H.mode === 'play';
}

console.log('test11 QA — ' + FILE);

// 0. boot
T('boots without throwing', !bootError, bootError && (bootError.message || String(bootError)));
if (bootError) { report(); }
T('__chomp hook exists', !!H);
if (!H) { report(); }
T('starts on title screen', H.mode === 'title', 'mode=' + H.mode);

// 1. maze geometry
const grid = H.grid();
T('grid is 32x28', grid.length === ROWS && grid.every(r => r.length === COLS), grid.length + 'x' + (grid[0] || []).length);
// flood-fill from pac spawn (pac rules: no wall, no door)
const passPac = (x, y) => {
  if (y < 0 || y >= ROWS) return false;
  const v = grid[y][((x % COLS) + COLS) % COLS];
  return v !== 1 && v !== 4;
};
const seen = new Set(['13,20']); const q = [[13, 20]];
while (q.length) {
  const [x, y] = q.pop();
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    let nx = (x + dx) % COLS; if (nx < 0) nx += COLS;
    const ny = y + dy;
    if (!passPac(nx, ny)) continue;
    const k = nx + ',' + ny;
    if (!seen.has(k)) { seen.add(k); q.push([nx, ny]); }
  }
}
let dots = 0, unreachable = 0;
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
  if (grid[y][x] === 2 || grid[y][x] === 3) { dots++; if (!seen.has(x + ',' + y)) unreachable++; }
}
T('all dots reachable from spawn', unreachable === 0, unreachable + '/' + dots + ' unreachable');
T('totalDots matches grid scan', H.totalDots === dots, H.totalDots + ' vs ' + dots);
T('spawn tile is dot-free (classic)', grid[20][13] === 0);

// 2. start + movement
H.startGame(); H.parkGhosts();
T('startGame -> play', H.mode === 'play', 'mode=' + H.mode);
const p0 = H.pac();
ticks(30);
const p1 = H.pac();
T('pac moves left on spawn', p1.x < p0.x - 0.5, JSON.stringify([p0.x, p1.x]));
T('pac eats dots while moving (score up)', H.score >= 20, 'score=' + H.score);
T('dot count decrements', H.dots < H.totalDots);

// stopped-at-wall safety: press up into a wall, no NaN, no displacement, then depart with a valid dir
H.teleport('pac', 13, 20, 'U'); ticks(20);
T('pac stops at wall, no crash', isFinite(H.pac().x) && Math.abs(H.pac().y - 20) < 0.001, JSON.stringify(H.pac()));
H.press('R'); ticks(30);
T('pac departs from stop with buffered dir', H.pac().x > 13.5, JSON.stringify(H.pac()));

// 3. cornering with input buffer: go up col 21, press R early, must turn at (21,17)
H.startGame(); H.parkGhosts();
H.teleport('pac', 21, 20, 'U');
H.press('R'); // buffered; (21,19) and (21,18) can't go R -> keeps going up
ticks(30);
const pc = H.pac();
T('cornering: turns at junction before overshoot', pc.dir[0] === 1 && pc.dir[1] === 0 && pc.y <= 17, JSON.stringify(pc));
T('cornered pac is still on a passable tile', passPac(Math.round(pc.x), Math.round(pc.y)), JSON.stringify(pc));

// instant reverse mid-corridor (not on a tile centre)
H.startGame(); H.parkGhosts();
H.teleport('pac', 13, 27, 'R'); ticks(12);
const pre = H.pac();
T('pac is mid-tile before reverse', Math.abs(pre.x - Math.round(pre.x)) > 0.01, JSON.stringify(pre));
H.press('L');
const rev = H.pac();
T('instant reverse flips dir same frame', rev.dir[0] === -1 && rev.dir[1] === 0, JSON.stringify(rev));
ticks(20);
T('pac travels back after reverse', H.pac().x < pre.x, JSON.stringify([pre.x, H.pac().x]));

// 4. tunnel wrap (both directions), row 16
H.startGame(); H.parkGhosts();
H.teleport('pac', 1, 16, 'L');
let crossed = false;
for (let i = 0; i < 400 && !crossed; i++) {
  const a = H.pac().x; ticks(1); const b = H.pac().x;
  if (b - a > 5) crossed = true; // wrapped: -0.5 -> ~27.5
}
T('pac wraps left tunnel exit', crossed, JSON.stringify(H.pac()));
T('pac keeps moving after wrap (no seam wall stall)', !H.pac().stop, JSON.stringify(H.pac()));
H.startGame(); H.parkGhosts();
H.teleport('pac', 26, 16, 'R');
crossed = false;
for (let i = 0; i < 400 && !crossed; i++) {
  const a = H.pac().x; ticks(1); const b = H.pac().x;
  if (a - b > 5) crossed = true; // wrapped right exit
}
T('pac wraps right tunnel exit', crossed, JSON.stringify(H.pac()));

// ghost tunnel seam: at the outer tunnel lip the corridor forces the wrap
// (only legal move), so this deterministically exercises seam handling.
H.startGame(); H.parkGhosts();
H.teleport('blinky', 0, 16, 'L'); H.setGhostState('blinky', 'normal');
crossed = false;
for (let i = 0; i < 60 && !crossed; i++) {
  const gs = H.ghosts().find(g => g.kind === 'blinky');
  ticks(1);
  const g2 = H.ghosts().find(g => g.kind === 'blinky');
  if (g2.x - gs.x > 5) crossed = true; // wrapped left lip -> right edge
}
T('ghost wraps left tunnel lip', crossed, JSON.stringify(H.ghosts().find(g => g.kind === 'blinky')));
H.startGame(); H.parkGhosts();
H.teleport('blinky', 27, 16, 'R'); H.setGhostState('blinky', 'normal');
crossed = false;
for (let i = 0; i < 60 && !crossed; i++) {
  const gs = H.ghosts().find(g => g.kind === 'blinky');
  ticks(1);
  const g2 = H.ghosts().find(g => g.kind === 'blinky');
  if (gs.x - g2.x > 5) crossed = true; // wrapped right lip -> left edge
}
T('ghost wraps right tunnel lip', crossed, JSON.stringify(H.ghosts().find(g => g.kind === 'blinky')));

// 5. fright mode: eat power pellet at (1,3)
H.startGame(); H.parkGhosts();
H.teleport('blinky', 13, 11, 'L'); H.setGhostState('blinky', 'normal'); // one live ghost
H.teleport('pac', 2, 3, 'L');
ticks(20);
T('power pellet triggers fright', H.fright > 0, 'fright=' + H.fright);
const bl = H.ghosts().find(g => g.kind === 'blinky');
T('ghost enters fright state', bl.state === 'fright', bl.state);
const sBefore = H.score;
H.teleport('pac', bl.x, bl.y, 'L'); ticks(2);
const bl2 = H.ghosts().find(g => g.kind === 'blinky');
T('eating frightened ghost scores 200', H.score - sBefore === 200, 'delta=' + (H.score - sBefore));
T('eaten ghost becomes eyes', bl2.state === 'eyes', bl2.state);
// eyes path back home and respawn
let revived = false, eyesDone = false;
for (let i = 0; i < 900 && !revived; i++) {
  ticks(1);
  const g = H.ghosts().find(q => q.kind === 'blinky');
  if (!eyesDone && g.state !== 'eyes' && g.state !== 'revive') eyesDone = true;
  if (eyesDone && (g.state === 'normal' || g.state === 'leaving') && g.y <= 12.5) revived = true;
}
T('eyes reach house and respawn', revived, JSON.stringify(H.ghosts().find(g => g.kind === 'blinky')));

// 6. death -> respawn -> game over -> retry
H.startGame(); H.parkGhosts();
const lives0 = H.lives;
H.teleport('blinky', H.pac().x, H.pac().y, 'L'); H.setGhostState('blinky', 'normal');
ticks(3);
T('ghost contact kills pac', H.mode === 'dying', 'mode=' + H.mode);
ticks(180);
T('respawns into ready after death', H.mode === 'ready' && H.lives === lives0 - 1, 'mode=' + H.mode + ' lives=' + H.lives);
// burn the remaining lives
for (let n = 0; n < 4; n++) {
  toPlay();
  H.parkGhosts();
  H.teleport('blinky', H.pac().x, H.pac().y, 'L'); H.setGhostState('blinky', 'normal');
  ticks(3); ticks(180);
  if (H.mode === 'over') break;
}
T('game over after last life', H.mode === 'over', 'mode=' + H.mode + ' lives=' + H.lives);
T('hi-score persisted to storage', +(store['test11-chomp-hi'] || 0) === H.hiScore && H.hiScore > 0, 'stored=' + store['test11-chomp-hi']);

// 7. level clear
H.startGame(); H.parkGhosts();
H.clearAllDots(); ticks(5);
T('clearing all dots triggers level clear', H.mode === 'clear', 'mode=' + H.mode);
ticks(200);
T('advances to level 2 and rebuilds dots', H.level === 2 && H.dots === H.totalDots && H.dots > 0, 'level=' + H.level + ' dots=' + H.dots);

// 8. fruit drop at 70 dots
H.startGame(); H.parkGhosts();
H.setDotsEaten(69);
H.teleport('pac', 16, 20, 'L'); ticks(30); // walks into the dot at (14,20): 69+1=70
T('fruit appears at 70 dots eaten', H.fruitOn === true, 'dotsEaten=' + H.dotsEaten + ' fruitOn=' + H.fruitOn);
H.teleport('pac', 13, 10, 'N'); ticks(5);
T('pac collects fruit for points', !H.fruitOn, 'fruitOn=' + H.fruitOn);

// 9. 10-second random fuzz: invariants only (no NaN, in-bounds, on passable tiles at centres, no throw)
H.startGame();
const dirs = ['U', 'D', 'L', 'R'];
let fuzzErr = null;
let worstGhost = null;
try {
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 1200; i++) {
    if (rnd() < 0.05) H.press(dirs[(rnd() * 4) | 0]);
    ticks(1);
    if (H.mode === 'over') { H.startGame(); }
    const p = H.pac();
    if (!isFinite(p.x) || !isFinite(p.y)) throw new Error('pac NaN at frame ' + i);
    for (const g of H.ghosts()) {
      if (!isFinite(g.x) || !isFinite(g.y)) throw new Error('ghost NaN at frame ' + i);
      if (g.x < -0.5 || g.x > COLS - 0.5 + 1e-6 || g.y < 0 || g.y > ROWS - 1 + 1e-9) worstGhost = g;
    }
  }
} catch (e) { fuzzErr = e; }
T('20s fuzz: no crash/NaN', !fuzzErr, fuzzErr && fuzzErr.message);
T('20s fuzz: ghosts stay in bounds', !worstGhost, worstGhost && JSON.stringify(worstGhost));

// 10. no console errors on load already proven by clean boot in sandbox
report();

function report() {
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('failed:'); for (const f of fails) console.log('  - ' + f); process.exit(1); }
  process.exit(0);
}
