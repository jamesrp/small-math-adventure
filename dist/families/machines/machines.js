// Shuffle machines (worksheet Week 3), a group in Cup swaps. Lettered cups
// stand on lettered homes. A machine is a set of arrows, one out of every home
// and one into every home, and one turn moves every cup along its arrow at
// once. Following one cup's arrows brings it back to its home: the homes it
// visits make a loop, and a loop of length L brings its cups home first after
// L turns. So all the cups are home first after the least common multiple of
// the loop lengths, and the turn counts a machine on n cups can take are the
// least common multiples of the ways to split n into loops: 1 to 6 for five
// cups, and 1 to 7, 10 and 12 for seven, where 12 (a loop of 4 and one of 3)
// is the most. No machine moves exactly one cup: a cup that leaves its home
// needs another cup to take its place. A machine undoes itself exactly when
// its loops have length 1 or 2, so one that moves every cup pairs the cups up
// and needs an even number of them. Reversing every arrow undoes a machine,
// and undoing A then B means undoing B, then A.
//
// Following the review card, the lower row shows where one turn sends the
// cups now on top; swapping two cups there swaps two arrowheads. Turn
// runs the machine once, a loop takes its colour only once its cups have come
// home, and the run stops when every cup is home. Solves are checked by
// running. The shelf, catalog and cups come from the shared case engine.
import {esc} from '../../expansion-controls.js';
import {LETTERS, letters, isRow, rowsOf, differences, keepCase, claimCases, missingCases, validShelf, shelfHTML, catalogHTML, wireCases, cupsBoard, sayRow, andList, swapRow, wireCups} from '../../cases.js';

export const PLAY_CUPS = [3, 4, 5, 6, 7];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const at = letter => LETTERS.indexOf(letter);

// A machine on n cups is a row of n letters: m[h] is the home whose cup one
// turn brings to home h. Every cup staying is the row A, B, C, …
export const straight = n => letters(n);
export const isMachine = (n, m) => isRow(n, m);
export const machinesOf = n => rowsOf(n);
// One turn: the cup on home m[h] moves to home h.
export const turn = (row, m) => [...m].map(src => row[at(src)]).join('');
export const power = (m, t) => { let row = straight(m.length); for (let i = 0; i < t; i++) row = turn(row, m); return row; };
export const isHome = row => row === straight(row.length);
// One turn of A, then one of B, is one turn of a single machine.
// (Not named `then`: a module exporting `then` would be a thenable.)
export const andThen = (a, b) => turn(a, b);
// Reversing every arrow.
export function undoOf(m) {
  const r = Array(m.length);
  [...m].forEach((src, h) => { r[at(src)] = LETTERS[h]; });
  return r.join('');
}
// The loops: each a list of homes in the order a cup visits them, starting
// from its smallest home; loops in order of their smallest home.
export function loopsOf(m) {
  const next = Array(m.length), seen = new Set(), loops = [];
  [...m].forEach((src, h) => { next[at(src)] = h; });
  for (let i = 0; i < m.length; i++) {
    if (seen.has(i)) continue;
    const loop = [];
    for (let j = i; !seen.has(j); j = next[j]) { seen.add(j); loop.push(j); }
    loops.push(loop);
  }
  return loops;
}
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const lcm = (a, b) => a / gcd(a, b) * b;
const orders = new Map();
export const orderOf = m => { if (!orders.has(m)) orders.set(m, loopsOf(m).reduce((t, loop) => lcm(t, loop.length), 1)); return orders.get(m); };
export const movedOf = m => [...m].filter((src, h) => src !== LETTERS[h]).length;
// A split: the loop lengths, longest first. Every split of n, longest parts first.
export const splitOf = m => loopsOf(m).map(loop => loop.length).sort((x, y) => y - x);
export const splitKey = parts => parts.join('+');
const splits = new Map();
export function splitsOf(n, most = n) {
  const k = `${n}:${most}`;
  if (!splits.has(k)) splits.set(k, n === 0 ? [[]] : Array.from({length: Math.min(n, most)}, (_, i) => Math.min(n, most) - i).flatMap(first => splitsOf(n - first, first).map(rest => [first, ...rest])));
  return splits.get(k);
}
export const splitOrder = parts => parts.reduce(lcm, 1);
// The turn counts a machine on n cups can take, smallest first.
export const ordersOf = n => [...new Set(splitsOf(n).map(splitOrder))].sort((x, y) => x - y);

// What a puzzle asks a machine to do.
//   {turns: k}: bring every cup home in exactly k turns
//   {moved: k}: move exactly k cups
//   {self: true}: move every cup and bring them all home in 2 turns
export function meets(goal, m) {
  if (goal.turns) return orderOf(m) === goal.turns;
  if (goal.moved) return movedOf(m) === goal.moved;
  if (goal.self) return orderOf(m) === 2 && movedOf(m) === m.length;
  return false;
}
const memo = new Map();
const cached = (k, make) => { if (!memo.has(k)) memo.set(k, make()); return memo.get(k); };
export const machinesMeeting = (n, goal) => cached(`meet:${n}:${JSON.stringify(goal)}`, () => machinesOf(n).filter(m => meets(goal, m)));
export const achievable = (n, goal) => machinesMeeting(n, goal).length > 0;
// What a find-every puzzle asks for: machines, or turn counts.
export const everyOf = q => q.rule === 'self' ? machinesMeeting(q.cups, {self: true}) : machinesOf(q.cups);
export const countsOf = q => q.rule === 'most' ? [Math.max(...ordersOf(q.cups))] : ordersOf(q.cups);
// The undo puzzles: the row after the fixed machines, and the one machine that
// puts every cup home from there.
export const chainRow = q => q.chain.reduce(andThen, straight(q.cups));
export const undoAnswer = q => undoOf(chainRow(q));
// The answer a puzzle has, for the build script and the notes.
export function answersOf(q) {
  if (q.mode === 'run') return [q.machine];
  if (q.mode === 'make') return machinesMeeting(q.cups, q.goal);
  if (q.mode === 'undo') return [undoAnswer(q)];
  if (q.mode === 'every') return everyOf(q);
  if (q.mode === 'counts') return countsOf(q).map(String);
  return undefined;
}

// Saves.
//   run:    {machine, turns}: the puzzle's machine, never edited
//   make:   {machine, turns, cant, wrong}: wrong is a refused Can't
//   undo:   {machine, stage}: stage counts the turns of the chain, then yours
//   every:  {machine, turns, kept, claimed, missed}: kept machines
//   counts: {machine, turns, kept, claimed, missed}: kept machines, one per turn count
// `turns` counts the turns since the cups were last all home; the run is over
// when it reaches the machine's turn count, with every cup home again.
const len = q => q.chain.length;
const done = b => b.turns === orderOf(b.machine);
const turnsOk = b => Number.isInteger(b.turns) && b.turns >= 0 && b.turns <= orderOf(b.machine);
const keys = (b, list) => Object.keys(b).length === list.length && list.every(k => Object.hasOwn(b, k));
function rowOf(q, b) {
  if (q.mode !== 'undo') return power(b.machine, b.turns);
  const row = q.chain.slice(0, Math.min(b.stage, len(q))).reduce(turn, straight(q.cups));
  return b.stage > len(q) ? turn(row, b.machine) : row;
}
const keptOrders = kept => kept.map(orderOf);
function countsDone(q, kept) {
  const have = keptOrders(kept);
  return countsOf(q).every(k => have.includes(k));
}
function validCounts(q, b) {
  const want = ordersOf(q.cups);
  if (!Array.isArray(b.kept) || b.kept.length > want.length || !b.kept.every(m => isMachine(q.cups, m))) return false;
  if (new Set(keptOrders(b.kept)).size !== b.kept.length) return false;
  if (typeof b.claimed !== 'boolean' || typeof b.missed !== 'boolean' || (b.claimed && b.missed) || (b.missed && !b.kept.length)) return false;
  const all = countsDone(q, b.kept);
  return !(b.claimed && !all) && !(b.missed && all);
}

function freshPuzzle(p) {
  const q = p.parameters, machine = q.mode === 'run' ? q.machine : straight(q.cups);
  if (q.mode === 'run') return {machine, turns: 0};
  if (q.mode === 'make') return {machine, turns: 0, cant: false, wrong: false};
  if (q.mode === 'undo') return {machine, stage: 0};
  return {machine, turns: 0, kept: [], claimed: false, missed: false};
}
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!object(b) || !isMachine(q.cups, b.machine)) return false;
  switch (q.mode) {
    case 'run': return keys(b, ['machine', 'turns']) && b.machine === q.machine && turnsOk(b);
    case 'make': {
      if (!keys(b, ['machine', 'turns', 'cant', 'wrong']) || !turnsOk(b) || typeof b.cant !== 'boolean' || typeof b.wrong !== 'boolean') return false;
      const can = achievable(q.cups, q.goal);
      return !(b.cant && (can || b.wrong)) && !(b.wrong && !can);
    }
    case 'undo': return keys(b, ['machine', 'stage']) && Number.isInteger(b.stage) && b.stage >= 0 && b.stage <= len(q) + 1;
    case 'every': return keys(b, ['machine', 'turns', 'kept', 'claimed', 'missed']) && turnsOk(b) && validShelf(b, everyOf(q), everyOf(q).length);
    case 'counts': return keys(b, ['machine', 'turns', 'kept', 'claimed', 'missed']) && turnsOk(b) && validCounts(q, b);
  }
  return false;
}
function solvedPuzzle(p, b) {
  const q = p.parameters;
  if (!validPuzzle(p, b)) return false;
  if (q.mode === 'run') return done(b);
  if (q.mode === 'make') return b.cant || (done(b) && meets(q.goal, b.machine));
  if (q.mode === 'undo') return b.stage === len(q) + 1 && isHome(rowOf(q, b));
  return b.claimed;
}
// Keep: a find-every machine (one that must pass a test is kept only after a
// run has shown it), or a machine whose run is over and whose turn count isn't
// on the shelf yet.
function canKeep(q, b) {
  if (q.mode === 'every') return !b.kept.includes(b.machine) && (q.rule !== 'self' || (done(b) && everyOf(q).includes(b.machine)));
  if (q.mode === 'counts') return done(b) && !keptOrders(b.kept).includes(orderOf(b.machine));
  return false;
}
const canTurn = (q, b) => q.mode === 'undo' ? b.stage <= len(q) : !done(b);
const started = (q, b) => q.mode === 'undo' ? b.stage > 0 : b.turns > 0;
function movePuzzle(p, b, action) {
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  const q = p.parameters;
  switch (action.type) {
    case 'swap': {
      const {a, b: c} = action, ok = i => Number.isInteger(i) && i >= 0 && i < q.cups;
      if (q.mode === 'run' || !ok(a) || !ok(c) || a === c) return null;
      const machine = swapRow(b.machine, a, c);
      // A new machine starts its run again; in an undo puzzle the fixed machines' turns stay.
      if (q.mode === 'undo') return {...b, machine, stage: Math.min(b.stage, len(q))};
      return {...b, machine, turns: 0, ...(q.mode === 'make' ? {wrong: false} : {})};
    }
    case 'turn':
      if (!canTurn(q, b)) return null;
      return q.mode === 'undo' ? {...b, stage: b.stage + 1} : {...b, turns: b.turns + 1};
    case 'home':
      if (!started(q, b)) return null;
      return q.mode === 'undo' ? {...b, stage: 0} : {...b, turns: 0};
    case 'cant':
      // Can't is checked: right when no machine does it, otherwise refused until the machine changes.
      if (q.mode !== 'make' || b.wrong) return null;
      return achievable(q.cups, q.goal) ? {...b, wrong: true} : {...b, cant: true};
    case 'keep': {
      if (!canKeep(q, b)) return null;
      const kept = keepCase(b.kept, b.machine, () => true, q.mode === 'every' ? everyOf(q).length : ordersOf(q.cups).length);
      return kept ? {...b, kept, missed: false} : null;
    }
    case 'load':
      if ((q.mode !== 'every' && q.mode !== 'counts') || !b.kept.includes(action.machine) || action.machine === b.machine) return null;
      return {...b, machine: action.machine, turns: 0};
    case 'claim': {
      if ((q.mode !== 'every' && q.mode !== 'counts') || !b.kept.length || b.missed) return null;
      if (q.mode === 'every') return {...b, ...claimCases(everyOf(q), b.kept)};
      return countsDone(q, b.kept) ? {...b, claimed: true, missed: false} : {...b, claimed: false, missed: true};
    }
  }
  return null;
}

// Hints walk toward the nearest machine that does what is missing, run it,
// then keep it or claim.
// `row` is the cups on top, so the text names the cups the lower row shows.
function swapToward(m, goal, row) {
  const h = [...m].findIndex((src, i) => src !== goal[i]), j = m.indexOf(goal[h]), shown = turn(row, m);
  return {type: 'move', action: {type: 'swap', a: h, b: j}, text: `Swap ${shown[h]} and ${shown[j]} in the lower row.`};
}
// The machine nearest the board (fewest homes that differ, ties alphabetical),
// found in one pass: the lists run to thousands of machines on seven cups.
function nearest(list, from) {
  let best = null, gap = Infinity;
  for (const m of list) { const d = differences(m, from); if (d < gap || (d === gap && m < best)) { best = m; gap = d; } }
  return best;
}
const turnHint = text => ({type: 'move', action: {type: 'turn'}, text});
const CANT = {
  moved: 'A cup that leaves its home needs another cup to take its place. Press Can’t.',
  self: 'Moving every cup and coming home in 2 turns means the cups swap in pairs. Can five cups pair up? Press Can’t.'
};
const names = q => [...q.chain.map((_, i) => 'AB'[i]), 'your machine'];
function hintPuzzle(p, b) {
  if (solvedPuzzle(p, b)) return {type: 'done'};
  const q = p.parameters, row = rowOf(q, b);
  if (q.mode === 'run') return turnHint('Turn the machine.');
  if (q.mode === 'make') {
    if (!achievable(q.cups, q.goal)) return {type: 'move', action: {type: 'cant'}, text: q.goal.self ? CANT.self : CANT.moved};
    if (meets(q.goal, b.machine)) return turnHint('Turn the machine until every cup is home.');
    return swapToward(b.machine, nearest(machinesMeeting(q.cups, q.goal), b.machine), row);
  }
  // An undo turns the fixed machines first, so the lower row shows where yours sends their cups.
  if (q.mode === 'undo') {
    if (b.stage < len(q)) return turnHint(`Turn ${names(q)[b.stage]}.`);
    const want = undoAnswer(q);
    if (b.machine !== want) return swapToward(b.machine, want, row);
    return turnHint('Turn your machine.');
  }
  if (q.mode === 'every') {
    const missing = missingCases(everyOf(q), b.kept);
    if (!missing.length) return {type: 'move', action: {type: 'claim'}, text: 'You have found them all.'};
    if (!missing.includes(b.machine)) return swapToward(b.machine, nearest(missing, b.machine), row);
    if (q.rule === 'self' && !done(b)) return turnHint('Turn the machine until every cup is home.');
    return {type: 'move', action: {type: 'keep'}, text: 'Keep this machine.'};
  }
  const have = keptOrders(b.kept), missing = countsOf(q).filter(k => !have.includes(k));
  if (!missing.length) return {type: 'move', action: {type: 'claim'}, text: q.rule === 'most' ? 'No machine on these cups takes more turns.' : 'You have found every number.'};
  if (!missing.includes(orderOf(b.machine))) return swapToward(b.machine, nearest(machinesOf(q.cups).filter(m => missing.includes(orderOf(m))), b.machine), row);
  if (!done(b)) return turnHint('Turn the machine until every cup is home.');
  return {type: 'move', action: {type: 'keep'}, text: 'Keep this machine.'};
}

// The playground: three to seven cups, any machine.
function freshPlay(cups = 5) { return {cups, machine: straight(cups), turns: 0}; }
function validPlay(b) {
  return object(b) && keys(b, ['cups', 'machine', 'turns']) && PLAY_CUPS.includes(b.cups) && isMachine(b.cups, b.machine) && turnsOk(b);
}
function movePlay(b, action, random = Math.random) {
  if (!validPlay(b) || !object(action)) return null;
  switch (action.type) {
    case 'cups': return PLAY_CUPS.includes(action.cups) && action.cups !== b.cups ? freshPlay(action.cups) : null;
    case 'swap': {
      const {a, b: c} = action, ok = i => Number.isInteger(i) && i >= 0 && i < b.cups;
      return ok(a) && ok(c) && a !== c ? {...b, machine: swapRow(b.machine, a, c), turns: 0} : null;
    }
    case 'turn': return done(b) ? null : {...b, turns: b.turns + 1};
    case 'home': return b.turns ? {...b, turns: 0} : null;
    case 'mix': {
      const pool = machinesOf(b.cups).filter(m => m !== b.machine);
      return {...b, machine: pool[Math.floor(random() * pool.length) % pool.length], turns: 0};
    }
    case 'straight': return b.machine === straight(b.cups) ? null : {...b, machine: straight(b.cups), turns: 0};
  }
  return null;
}

// Drawing. The board is two rows of cups on the same homes with the arrows
// between them, drawn to scale so an arrow leaves the middle of one home and
// points at the middle of another.
const W = 100, H = 110;
const round = x => Math.round(x * 10) / 10;
function arrowsSVG(m, closed, o = {}) {
  const n = m.length, w = o.w || W, h = o.h || H, top = o.top || 4, bottom = h - (o.bottom || 4), head = o.head || 18, wide = o.wide || 9;
  const loopOf = Array(n);
  loopsOf(m).forEach((loop, k) => loop.forEach(i => { loopOf[i] = k; }));
  return [...m].map((src, to) => {
    const i = at(src), x1 = i * w + w / 2, x2 = to * w + w / 2, dx = x2 - x1, dy = bottom - top, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
    const bx = x2 - head * ux, by = bottom - head * uy, px = -uy * wide, py = ux * wide;
    const cls = closed(loopOf[i]) ? ` loop loop-${loopOf[i] % 7}` : '';
    return `<g class="mach-arrow${cls}"><line x1="${round(x1)}" y1="${top}" x2="${round(bx)}" y2="${round(by)}"/><polygon points="${round(x2)},${bottom} ${round(bx + px)},${round(by + py)} ${round(bx - px)},${round(by - py)}"/></g>`;
  }).join('');
}
const band = (m, closed) => `<svg class="mach-band" viewBox="0 0 ${m.length * W} ${H}" style="aspect-ratio:${m.length * W}/${H}" aria-hidden="true">${arrowsSVG(m, closed)}</svg>`;
// A machine in small, for the fixed machines, the shelf and the catalog: home
// letters on top, arrows, and the cups one turn brings to each home below.
const MW = 30, MH = 66;
export function machineMini(m, cls = '') {
  const n = m.length;
  const tops = [...letters(n)].map((h, i) => `<text x="${i * MW + MW / 2}" y="13" class="mach-mini-home">${h}</text>`).join('');
  const cups = [...m].map((src, i) => `<g class="mach-mini-cup mm${at(src)}"><rect x="${i * MW + 3}" y="${MH - 23}" width="${MW - 6}" height="21" rx="4"/><text x="${i * MW + MW / 2}" y="${MH - 7}">${src}</text></g>`).join('');
  return `<svg class="mach-mini${cls ? ` ${cls}` : ''}" viewBox="0 0 ${n * MW} ${MH}" style="--n:${n}" aria-hidden="true">${tops}${arrowsSVG(m, () => false, {w: MW, h: MH - 22, top: 18, bottom: 2, head: 7, wide: 4})}${cups}</svg>`;
}
// A split in small: one bar per loop, as long as the loop.
const splitMini = parts => `<span class="mach-split">${parts.map((l, k) => `<i class="mach-loop-${k % 7}" style="--l:${l}">${l}</i>`).join('')}</span>`;
export function sayMachine(m) {
  const loops = loopsOf(m).filter(loop => loop.length > 1).map(loop => [...loop, loop[0]].map(i => LETTERS[i]).join(' to '));
  const stay = [...m].filter((src, h) => src === LETTERS[h]);
  return [loops.length ? `loops ${andList(loops)}` : '', stay.length ? `${andList(stay)} ${stay.length === 1 ? 'stays' : 'stay'}` : ''].filter(Boolean).join('; ');
}
// The arrows in words, for the board and the shelf while a child builds:
// naming the loops there would announce what a run is for.
export function sayArrows(m) {
  const to = Array(m.length);
  [...m].forEach((src, h) => { to[at(src)] = LETTERS[h]; });
  const arrows = to.flatMap((dest, i) => dest === LETTERS[i] ? [] : [`${LETTERS[i]} to ${dest}`]);
  const stay = to.flatMap((dest, i) => dest === LETTERS[i] ? [LETTERS[i]] : []);
  if (!arrows.length) return 'every cup stays';
  return [`arrows ${andList(arrows)}`, stay.length ? `${andList(stay)} ${stay.length === 1 ? 'stays' : 'stay'}` : ''].filter(Boolean).join('; ');
}
const turnsWord = k => `${k} ${k === 1 ? 'turn' : 'turns'}`;
const saySplit = parts => `loops of ${andList(parts.map(String))}: ${turnsWord(splitOrder(parts))}`;

const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {pick: null}); return uiState.get(p.id); };
let pending = null;

const button = (label, action, cls = '', extra = '') => `<button type="button" class="secondary case-action ${cls}" data-mach-move="${esc(JSON.stringify(action))}" data-focus="mach-${action.type}${action.cups ?? ''}" ${extra}>${label}</button>`;
const note = text => `<p class="case-note" role="status">${esc(text)}</p>`;
// The cups on top, the arrows, and below them the cups one turn would bring
// to each home, so each arrow joins a cup to itself. Swapping two cups below
// swaps two arrowheads. `closed` says which loops have closed; `still`
// disables the lower row.
function rowsHTML(row, m, o) {
  const top = cupsBoard(row, {inert: true, label: 'Cups'});
  const lower = cupsBoard(turn(row, m), {picked: o.still ? null : o.pick, hinted: o.hinted, still: o.still, label: 'After one turn'});
  return `<div class="mach-rows" style="--cups:${m.length}"><div class="mach-top">${top}</div>${band(m, o.closed || (() => false))}<div class="mach-lower" role="group" aria-label="${esc(`The machine: ${sayArrows(m)}`)}">${lower}</div></div>`;
}
// The turn counter, and the run's controls.
function runHTML(b, h, solved) {
  const over = done(b), count = over ? `Every cup home after <b>${b.turns}</b> ${b.turns === 1 ? 'turn' : 'turns'}` : `<b>${b.turns}</b> ${b.turns === 1 ? 'turn' : 'turns'}`;
  const tally = `<span class="mach-count${over ? ' over' : ''}">${count}</span>`;
  if (solved) return `<div class="case-actions mach-run">${tally}</div>`;
  const hinted = type => h?.type === type ? 'hinted' : '';
  return `<div class="case-actions mach-run">${button('Turn', {type: 'turn'}, `mach-turn ${hinted('turn')}`, over ? 'disabled' : '')}${tally}${button(over ? 'Start again' : 'Cups home', {type: 'home'}, hinted('home'), b.turns ? '' : 'disabled')}</div>`;
}
// Certificates after a solve.
function splitCatalog(n, column, columns, mark, label) {
  const keysOf = splitsOf(n).map(splitKey), parts = key => key.split('+').map(Number);
  return catalogHTML(keysOf, columns, key => column(parts(key)), {mini: key => splitMini(parts(key)), say: key => saySplit(parts(key)), label, mark: key => mark(parts(key))});
}
const turnColumns = n => ordersOf(n).map(k => ({id: String(k), label: turnsWord(k)}));
function certificate(q) {
  if (q.mode === 'make' && q.goal.moved) {
    const columns = Array.from({length: q.cups + 1}, (_, k) => ({id: String(k), label: `${k} ${k === 1 ? 'cup moves' : 'cups move'}`}));
    const why = '<p class="mach-why">Every swap moves two arrowheads: a cup that leaves its home lands on another, and that cup has to move too.</p>';
    return why + splitCatalog(q.cups, parts => String(parts.filter(l => l > 1).reduce((s, l) => s + l, 0)), columns, () => '', 'Every machine, by the loops it makes');
  }
  if (q.mode === 'make' && q.goal.self) return splitCatalog(q.cups, parts => String(splitOrder(parts)), turnColumns(q.cups), parts => splitOrder(parts) <= 2 ? 'yes' : 'no', 'Every machine, by the loops it makes');
  if (q.mode === 'counts') return splitCatalog(q.cups, parts => String(splitOrder(parts)), turnColumns(q.cups), parts => q.rule === 'most' ? (splitOrder(parts) === countsOf(q)[0] ? 'yes' : 'no') : '', 'Every machine, by the loops it makes');
  if (q.mode === 'every' && q.rule === 'self') {
    const all = machinesOf(q.cups).filter(m => orderOf(m) <= 2), moves = [...new Set(all.map(movedOf))].sort((x, y) => x - y);
    return catalogHTML(all, moves.map(k => ({id: String(k), label: k ? `${k} cups move` : 'Every cup stays'})), m => String(movedOf(m)), {mini: m => machineMini(m), say: sayMachine, label: 'Every machine that comes home in 2 turns or fewer', mark: m => movedOf(m) === q.cups ? 'yes' : ''});
  }
  if (q.mode === 'every') return catalogHTML(machinesOf(q.cups), turnColumns(q.cups), m => String(orderOf(m)), {mini: m => machineMini(m), say: m => sayMachine(m) || 'every cup stays', label: 'Every machine', mark: () => ''});
  return '';
}

function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, solved = solvedPuzzle(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action;
  const hinted = type => h?.type === type ? 'hinted' : '';
  const row = rowOf(q, b), pick = ui(p).pick;
  const wrap = (...parts) => `<div class="mach-puzzle mode-${q.mode}" data-mechanic-wire="machines">${parts.join('')}<p class="sr-only" role="status">${esc(status(q, b, row))}</p></div>`;
  const rowsFor = closed => rowsHTML(row, b.machine, {still: solved || q.mode === 'run', pick, hinted: h?.type === 'swap' ? [h.a, h.b] : [], closed});
  // A loop takes its colour once its cups have all come home in this run.
  const closedIn = turns => k => loopsOf(b.machine)[k].length <= turns;
  if (q.mode === 'undo') {
    const chain = `<div class="mach-chain">${q.chain.map((m, i) => `<figure class="mach-fixed${b.stage > i ? ' turned' : ''}" role="img" aria-label="${esc(`Machine ${'AB'[i]}: ${sayArrows(m)}`)}"><figcaption>${'AB'[i]}</figcaption>${machineMini(m)}</figure>`).join('')}</div>`;
    const next = b.stage <= len(q) ? names(q)[b.stage] : null;
    const run = solved ? '' : `<div class="case-actions mach-run">${button(next ? `Turn ${next}` : 'Turn', {type: 'turn'}, `mach-turn ${hinted('turn')}`, next ? '' : 'disabled')}${button('Cups home', {type: 'home'}, hinted('home'), b.stage ? '' : 'disabled')}</div>`;
    const missed = b.stage === len(q) + 1 && !solved ? note('Not every cup is home.') : '';
    return wrap(chain, rowsFor(() => false), run, missed);
  }
  const rows = rowsFor(solved ? () => true : closedIn(b.turns));
  const run = runHTML(b, h, solved);
  if (q.mode === 'run') return wrap(rows, run);
  if (q.mode === 'make') {
    const actions = solved ? '' : `<div class="case-actions">${button('Can’t', {type: 'cant'}, hinted('cant'), b.wrong ? 'disabled' : '')}</div>`;
    return wrap(rows, run, actions, b.wrong ? note('Keep looking.') : '', solved && b.cant ? certificate(q) : '');
  }
  const keepable = canKeep(q, b), claim = q.mode === 'counts' && q.rule === 'most' ? 'That’s the most' : 'That’s all';
  const actions = solved ? '' : `<div class="case-actions">${button('Keep', {type: 'keep'}, hinted('keep'), keepable ? '' : 'disabled')}${button(claim, {type: 'claim'}, hinted('claim'), b.kept.length && !b.missed ? '' : 'disabled')}</div>`;
  const missed = b.missed ? note(q.mode === 'counts' && q.rule === 'most' ? 'A slower machine exists.' : 'There’s another.') : '';
  const shown = q.mode === 'counts' ? [...b.kept].sort((x, y) => orderOf(x) - orderOf(y)) : b.kept;
  const mini = q.mode === 'counts' ? m => `${machineMini(m)}<b class="mach-kept-turns">${turnsWord(orderOf(m))}</b>` : m => machineMini(m);
  const say = m => `${sayArrows(m)}${q.mode === 'counts' ? `: ${turnsWord(orderOf(m))}` : ''}`;
  const shelf = shelfHTML(shown, {mini, say, current: solved ? null : b.machine, load: !solved, label: q.mode === 'counts' ? 'Machines kept, by turns' : 'Machines kept'});
  return wrap(rows, run, actions, missed, shelf, solved ? certificate(q) : '');
}
function status(q, b, row) {
  const cups = `Cups ${sayRow(row)}.`;
  // A turn that leaves cups away is announced by the note on the board.
  if (q.mode === 'undo') return `${cups}${b.stage <= len(q) ? ` Next: turn ${names(q)[b.stage]}.` : isHome(row) ? ' Every cup is home.' : ''}`;
  return `${cups} ${done(b) ? `Every cup home after ${turnsWord(b.turns)}.` : turnsWord(b.turns) + '.'}${q.mode === 'every' || q.mode === 'counts' ? (b.kept.includes(b.machine) ? ' Kept.' : '') : ''}`;
}
function renderPlay(p, a) {
  const b = a.board;
  if (ui(p).pick >= b.cups) ui(p).pick = null;
  const pickers = `<div class="case-tools" role="group" aria-label="Cups">${PLAY_CUPS.map(n => button(String(n), {type: 'cups', cups: n}, 'case-tool', `aria-pressed="${b.cups === n}" aria-label="${n} cups"`)).join('')}</div>`;
  const rows = rowsHTML(power(b.machine, b.turns), b.machine, {pick: ui(p).pick, closed: k => loopsOf(b.machine)[k].length <= b.turns});
  const actions = `<div class="case-actions">${button('Mix', {type: 'mix'})}${button('Straight arrows', {type: 'straight'}, '', b.machine === straight(b.cups) ? 'disabled' : '')}</div>`;
  return `<div class="mach-play" data-mechanic-wire="machines">${pickers}${rows}${runHTML(b, null, false)}${actions}<p class="sr-only" role="status">${esc(`Cups ${sayRow(power(b.machine, b.turns))}. ${done(b) ? `Every cup home after ${turnsWord(b.turns)}.` : turnsWord(b.turns) + '.'}`)}</p></div>`;
}

const isPlay = p => p.parameters.mode === 'playground';
// The machine that just turned, for the cups' glide.
function turnedBy(p, b) {
  const q = p.parameters;
  if (q.mode !== 'undo') return b.machine;
  return b.stage <= len(q) ? q.chain[b.stage - 1] : b.machine;
}
function wire(root, p, api) {
  const state = ui(p);
  const apply = action => { pending = {id: p.id, moves: api.attempt().moves, action}; state.pick = null; api.apply(action); };
  const lower = root.querySelector('.mach-lower');
  if (lower) wireCups(lower, {picked: () => state.pick, pick: h => api.ui({pick: h}), swap: (i, j) => apply({type: 'swap', a: i, b: j})});
  wireCases(root, m => { if (m !== api.attempt().board.machine) apply({type: 'load', machine: m}); });
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-mach-move]');
    if (!el || !root.contains(el) || el.disabled || el.getAttribute('aria-pressed') === 'true') return;
    try { apply(JSON.parse(el.dataset.machMove)); } catch { /* malformed control data is ignored */ }
  });
  // A machine just kept arrives on the shelf; two swapped cups settle; after a
  // turn every cup glides from its old home to its new one.
  const last = pending;
  pending = null;
  if (!last || last.id !== p.id || api.attempt().moves !== last.moves + 1) return;
  const b = api.attempt().board;
  if (last.action.type === 'keep') root.querySelector(`[data-case="${CSS.escape(b.machine)}"]`)?.classList.add('fresh');
  if (last.action.type === 'swap') for (const i of [last.action.a, last.action.b]) lower?.querySelector(`[data-cup="${i}"]`)?.classList.add('arrived');
  if (last.action.type === 'turn' && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    const m = turnedBy(p, b), cups = [...root.querySelectorAll('.mach-top [data-cup]')], step = (root.querySelector('.mach-top')?.getBoundingClientRect().width || 0) / m.length;
    cups.forEach((el, h) => { const dx = (at(m[h]) - h) * step; if (dx) el.animate?.([{transform: `translate(${dx}px,0)`}, {transform: `translate(${dx / 2}px,-14px)`}, {transform: 'none'}], {duration: 420, easing: 'ease-in-out'}); });
  }
}

export const machineMechanics = {
  machine: {
    fresh: p => isPlay(p) ? freshPlay() : freshPuzzle(p),
    valid: (p, b) => isPlay(p) ? validPlay(b) : validPuzzle(p, b),
    solved: (p, b) => isPlay(p) ? false : solvedPuzzle(p, b),
    move: (p, b, action, random) => isPlay(p) ? movePlay(b, action, random) : movePuzzle(p, b, action),
    hint: (p, b) => isPlay(p) ? {type: 'done'} : hintPuzzle(p, b),
    render: (p, a) => isPlay(p) ? renderPlay(p, a) : renderPuzzle(p, a),
    wire,
    ui(p, payload) {
      if (!object(payload) || !Object.hasOwn(payload, 'pick')) return;
      ui(p).pick = Number.isInteger(payload.pick) ? payload.pick : null;
    },
    reset: p => { uiState.delete(p.id); },
    noHint: isPlay
  }
};

// The family seam entry (dist/families.js). The puzzles join Cup swaps as its
// Shuffle machines group, so the module adds no satchel family.
export default {
  id: 'machines',
  mechanics: machineMechanics,
  pack: new URL('./machines.json', import.meta.url).href,
  css: new URL('./machines.css', import.meta.url).href,
  // When the control used goes grey (Turn at the end of a run, Keep, Can't),
  // focus moves to the next action, not back up to the cups.
  focus: '.case-action:not([disabled])'
};
