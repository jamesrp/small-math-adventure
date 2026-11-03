import {freshAttempt, move} from './engine.js';
import {isExpansion, mechanicFor} from './expansion.js';
import {boardHTML} from './ui.js';
// How to play's demo: a few seconds of a mechanic's move on a board that isn't
// a puzzle, the app's version of the worksheets' "launch together" rule. A
// mechanic declares it in its optional `howTo` hook (docs/demos.md); the twelve
// first mechanics, which predate the hooks, declare theirs here. The board is
// drawn by the mechanic's own renderer, inert and hidden from screen readers
// (How to play's text says the same thing in words), and nothing is saved.

// The twelve first mechanics, which predate the hooks. Positions, cells and
// pebbles count from 0, as their actions do.
const BASE_DEMOS = {
  swap: {puzzle: {start: [0, 2, 1, 3], target: [0, 1, 2, 3], edges: [[0, 1], [1, 2], [2, 3]]},
    steps: [{move: [1, 2], taps: ['[data-cell="1"]', '[data-cell="2"]']}]},
  tile: {puzzle: {cols: 2, rows: 3, cells: [0, 1, 2, 3, 4, 5]},
    steps: [{move: [0, 1], taps: ['[data-cell="0"]', '[data-cell="1"]']}, {move: [3, 5], taps: ['[data-cell="3"]', '[data-cell="5"]']}]},
  toggle: {parameters: {topology: 'path', vertices: ['1', '2', '3'], edges: [['1', '2'], ['2', '3']], initial_on: [], target_on: ['1', '2', '3'], press_budget: null},
    steps: [{move: {edge: 0}}, {move: {edge: 1}}]},
  clock: [
    {mode: 'choose_first_activation_count', parameters: {mode: 'choose_first_activation_count', clocks: [{positions: 5, jump: 2, start: 0, target: 4}]},
      steps: [{move: {activations: 2}, taps: ['.bell-number:nth-of-type(2)', 'button[type="submit"]']}]},
    {mode: 'choose_jump', parameters: {mode: 'choose_jump', positions: 6, start: 0, jump_min: 1, jump_max: 5, required_first_return: 3},
      steps: [{move: {jump: 4}, taps: ['[role="slider"]', 'button[type="submit"]']}]}
  ],
  billiard: [
    {mode: 'shape', parameters: {mode: 'shape', cols: 3, rows: 3, start: [1, 1], target: {corner: 'top-left'}, map: [3, 3]},
      steps: [{move: {type: 'launch', room: [1, 1]}}, {move: {type: 'launch', room: [2, 1]}, taps: ['.cr-controls .primary']}]},
    {mode: 'aim', parameters: {mode: 'aim', width: 1, height: 1, sheet: [3, 3], target: {corner: 'top-right', bounces: 2}},
      steps: [{move: {type: 'launch', aim: [1, 2]}, taps: ['.cr-controls .primary']}]},
    {mode: 'cross', parameters: {mode: 'cross', width: 1, height: 2, sheet: [4, 4]},
      steps: [{move: {type: 'tap', at: [1, 2]}, taps: ['.cr-crossing[data-at="1,2"]']}]},
    {mode: 'every', parameters: {mode: 'every', cols: 4, rows: 4, start: [1, 1], bounces: 2},
      steps: [{move: {type: 'launch', room: [1, 1]}}, {move: {type: 'launch', room: [3, 1]}, taps: ['.cr-controls .primary']}]}
  ],
  route: {parameters: {vertices: ['A', 'B', 'C', 'D'], edges: [['A', 'B', 1], ['B', 'C', 1], ['C', 'A', 1], ['C', 'D', 1]], mode: 'each_edge_once', start: null, closed: false, target_cost: 4},
    steps: [{move: {vertex: 'D'}}, {move: {vertex: 'C'}}, {move: {vertex: 'A'}}]},
  color: {parameters: {vertices: ['A', 'B', 'C'], edges: [['A', 'B', 1], ['B', 'C', 1]], palette_size: 2},
    steps: [{move: {vertex: 'A'}}, {move: {type: 'palette', color: 2}}, {move: {vertex: 'B'}}]},
  latin: {parameters: {order: 3, givens: [[0, 2, 0], [0, 0, 0], [0, 0, 1]], blank: 0},
    steps: [{move: {type: 'set', cell: 0, value: 1}, view: {selected: 0}, taps: ['[data-cell="0"]']}, {move: {type: 'set', cell: 2, value: 3}, view: {selected: 2}, taps: ['[data-cell="2"]']}]},
  code: {parameters: {length: 3, alphabet: ['0', '1'], repetitions_allowed: true, feedback: 'total_exact_position_matches_only', transcript: [{guess: '110', matches: 1}]},
    steps: [{move: {type: 'set', position: 0, value: 1}}, {move: {type: 'set', position: 1, value: 0}}, {move: {type: 'set', position: 2, value: 0}}, {move: {type: 'submit'}}]},
  nim: {parameters: {piles: [3, 2], normal_play: true, task: 'win_game', allowed_removal: 'any positive amount from exactly one nonempty pile'},
    steps: [{ui: {pick: {pile: 1, from: 1}}}, {move: {type: 'choose', pile: 1, remove: 2}}]},
  jug: {parameters: {capacities: [5, 2], start: [0, 0], source_and_drain: true, target_amount: 3},
    steps: [{move: {type: 'fill', jug: 1}}, {move: {type: 'pour', from: 1, to: 0}}]},
  weigh: {parameters: {coins: ['A', 'B', 'C', 'D'], odd_kind: 'light', known_genuine: [], weighing_budget: 2, fixed_secret: ['B', -1]},
    steps: [{move: {type: 'place', coin: 'A', pan: 'left'}}, {move: {type: 'place', coin: 'B', pan: 'right'}}, {move: {type: 'weigh'}}]}
};

// The demo entry for a puzzle: a mechanic's `howTo` is one entry or a list.
// An entry may name the variant it is for: `mode` (the puzzle's
// parameters.mode) and `when` (other parameters, as {name: value} or as a
// test of the parameters, with a `variant` name). The first entry whose
// conditions all hold wins; an entry with none is the fallback.
const conditional = d => d.mode !== undefined || d.when !== undefined;
function holds(d, p) {
  const q = p.parameters ?? {};
  if (d.mode !== undefined && q.mode !== d.mode) return false;
  if (typeof d.when === 'function') return Boolean(d.when(q));
  if (d.when) return Object.entries(d.when).every(([k, v]) => same(q[k], v));
  return true;
}
export function demoEntry(p) {
  const own = (isExpansion(p) ? mechanicFor(p).howTo : null) ?? BASE_DEMOS[p.mechanic];
  if (!own) return null;
  const list = Array.isArray(own) ? own : [own];
  return list.find(d => conditional(d) && holds(d, p)) || list.find(d => !conditional(d)) || null;
}

// A name for an entry's variant ('' for the fallback): its mode, then its
// variant name or its `when` values.
export function demoKey(entry) {
  const when = entry.variant ?? (entry.when && typeof entry.when === 'object' ? Object.values(entry.when).map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join('-') : undefined);
  return [entry.mode, when].filter(v => v !== undefined && v !== '').join('-');
}

// The demo's own puzzle: the first puzzle of the mechanic (and of the entry's
// variant) with the entry's board in place of the puzzle's, so the demo is
// the same whichever puzzle opened How to play.
export function demoPuzzle(p, puzzles, entry = demoEntry(p)) {
  if (!entry) return null;
  const base = puzzles.find(q => q.mechanic === p.mechanic && holds(entry, q)) || p, key = demoKey(entry);
  const id = `demo-${p.mechanic}${key ? `-${key}` : ''}`;
  return {...base, ...entry.puzzle, id, parameters: entry.parameters ?? base.parameters};
}

// A fixed sequence of random numbers, so a demo plays the same every time.
function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const parsed = text => { try { return JSON.parse(text); } catch { return undefined; } };

// Every attempt the demo shows, from the fresh board through each step. A step
// is {move: action} or {ui: payload}, with optional `taps` (where the rings
// go, in order), `drag` (the ring slides from one tap to the next) and
// `view`. Returns null when a step is refused, so a broken demo never shows.
export function demoFrames(p, entry) {
  const random = seeded();
  let attempt = freshAttempt(p, random);
  const frames = [{attempt, step: null}];
  for (const step of entry.steps || []) {
    if (step && Object.hasOwn(step, 'move')) {
      const next = move(p, attempt, step.move, random);
      if (!next || next === attempt) return null;
      attempt = next;
    } else if (!(step && Object.hasOwn(step, 'ui'))) return null;
    frames.push({attempt, step});
  }
  return frames;
}

const resetView = p => { if (isExpansion(p)) mechanicFor(p).reset?.(p); };

// A step's ring marks, in order: each `taps` entry (a CSS selector on the
// board before the step, or {after: selector}, where that control is once the
// step is made, for a tap on an empty spot or the end of a drag), then the
// control whose data-move or data-ui equals the step, unless a tap named it.
const afterTap = t => Boolean(t && typeof t === 'object' && typeof t.after === 'string');
function controlFor(stage, step) {
  const key = Object.hasOwn(step, 'move') ? 'move' : 'ui', want = step[key];
  return [...stage.querySelectorAll(`[data-${key}]`)].find(node => same(parsed(node.dataset[key]), want)) || null;
}

const DESIGN_WIDTH = 360; // px: the narrowest board a demo is drawn at before it is scaled down

// Plays the demo in `slot` (How to play's first child). Returns a stop function.
export function playDemo(slot, p, puzzles, {reduced = false} = {}) {
  const entry = demoEntry(p), demo = demoPuzzle(p, puzzles, entry), frames = demo && demoFrames(demo, entry);
  if (!frames) { slot.remove(); return () => {}; }
  slot.innerHTML = `<div class="howto-frame" aria-hidden="true" inert><div class="howto-stage board-panel ${isExpansion(demo) ? 'expansion-board' : ''} ${demo.mechanic}"></div><span class="howto-tap"></span></div><button type="button" class="howto-play quiet small" aria-label="Show the move"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></button>`;
  const frame = slot.querySelector('.howto-frame'), stage = slot.querySelector('.howto-stage'), tap = slot.querySelector('.howto-tap'), play = slot.querySelector('.howto-play');
  let timers = [], stopped = false;
  const later = (ms, run) => new Promise(resolve => timers.push(setTimeout(() => { if (!stopped) { run?.(); resolve(); } }, ms)));
  const fit = () => {
    const width = slot.clientWidth || DESIGN_WIDTH, design = Math.max(width, DESIGN_WIDTH);
    stage.style.width = `${design}px`;
    stage.style.transform = '';
    const tall = Math.max(stage.scrollHeight, 1), room = Math.max(160, innerHeight * 0.42);
    const scale = Math.min(1, width / design, room / tall);
    stage.style.transform = scale < 1 ? `scale(${scale})` : '';
    frame.style.height = `${Math.ceil(tall * scale)}px`;
    frame.style.width = `${Math.ceil(design * scale)}px`;
  };
  const show = (attempt, view = {}) => {
    try { stage.innerHTML = boardHTML(demo, attempt, {...view, demo: true}); } catch (error) { console.error(error); stop(); slot.remove(); return false; }
    fit();
    return true;
  };
  // The centre of a control, from the frame's top left corner.
  const spot = node => {
    if (!node) return null;
    const box = frame.getBoundingClientRect(), r = node.getBoundingClientRect();
    return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2];
  };
  // Where the step's rings go. An {after} tap is measured on the board as it
  // will be, drawn and taken down again before anything is painted.
  const spotsFor = (step, attempt) => {
    const taps = step.taps || [], control = controlFor(stage, step);
    const before = taps.map(t => afterTap(t) ? null : stage.querySelector(t));
    // Drawing the after board detaches these nodes, so measure them first.
    const beforeSpots = before.map(spot), controlSpot = spot(control);
    let after = [];
    if (taps.some(afterTap)) {
      const drawn = stage.innerHTML, style = [stage.style.width, stage.style.transform, frame.style.width, frame.style.height];
      if (!show(attempt)) return null;
      after = taps.map(t => afterTap(t) ? spot(stage.querySelector(t.after)) : null);
      stage.innerHTML = drawn;
      [stage.style.width, stage.style.transform, frame.style.width, frame.style.height] = style;
    }
    const spots = taps.map((t, i) => afterTap(t) ? after[i] : beforeSpots[i]);
    if (control && !before.includes(control)) spots.push(controlSpot);
    return spots.filter(Boolean);
  };
  const place = ([x, y]) => { tap.style.left = `${x}px`; tap.style.top = `${y}px`; };
  const pulse = at => {
    tap.classList.remove('is-on', 'is-drag');
    place(at);
    void tap.offsetWidth;
    tap.classList.add('is-on');
  };
  const run = async () => {
    play.hidden = true;
    delete slot.dataset.untapped;
    delete slot.dataset.dragged;
    tap.classList.remove('is-on', 'is-drag');
    resetView(demo);
    if (!show(frames[0].attempt)) return;
    await later(700);
    let shown = frames[0].attempt;
    for (const {attempt, step} of frames.slice(1)) {
      if (step.view && !show(shown, step.view)) return;
      // A ui step's view changes first, so its after spots are measured on it.
      if (Object.hasOwn(step, 'ui')) mechanicFor(demo).ui?.(demo, step.ui);
      const spots = spotsFor(step, attempt);
      if (!spots) return;
      if (!spots.length) slot.dataset.untapped = Number(slot.dataset.untapped || 0) + 1;
      if (step.drag && spots.length > 1) {
        // A drag: pressed where it starts, then the ring slides to each next spot.
        pulse(spots[0]);
        await later(600);
        for (const at of spots.slice(1)) { tap.classList.add('is-drag'); void tap.offsetWidth; place(at); await later(650); }
        slot.dataset.dragged = Number(slot.dataset.dragged || 0) + 1;
      } else for (const at of spots) { pulse(at); await later(600); }
      tap.classList.remove('is-on', 'is-drag');
      if (!show(attempt)) return;
      shown = attempt;
      await later(1000);
    }
    play.setAttribute('aria-label', 'Show again');
    play.hidden = false;
    slot.dataset.played = 'true';
  };
  const stop = () => { stopped = true; timers.forEach(clearTimeout); timers = []; resetView(demo); };
  play.addEventListener('click', () => { stopped = false; timers.forEach(clearTimeout); timers = []; run(); });
  if (reduced) { resetView(demo); show(frames[0].attempt); } else run();
  return stop;
}
