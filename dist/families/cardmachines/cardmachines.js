// Card machines (worksheet Week 17, machine memory). A machine is a few
// circles, each with one R arrow, one B arrow and a fixed ✓ or ×. A marker
// starts on circle 1; each card of a row moves it along that card's arrow from
// the circle it is on, and the circle where it stops gives the answer (with no
// cards, circle 1's). The circle is the machine's whole memory.
//
// So two rows that leave the marker on the same circle get the same answer
// after any shared ending: the next card takes both along the same arrow. If
// some shared ending gives one ✓ and one ×, the two rows need different
// circles in every machine that follows the rule, and k rows that can be split
// two at a time need k circles. A working machine with k circles then shows k
// is the fewest (the easy half of the Myhill–Nerode theorem).
//
// Puzzles: build a machine for a rule with exactly the fewest circles (Test
// compares it with the rule on every row and shows one shortest row it gets
// wrong); split pairs of rows with one shared ending, or claim Can't; and show
// that fewer circles are not enough with the child's own rows and an ending
// for each pair. The app applies an ending to both rows of a pair at once.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const CARDS = ['R', 'B'];
const slot = card => (card === 'R' ? 0 : 1);
export const MAX_ROW = 6;        // the longest row or ending a child makes
export const MAX_TEST = 24;      // longer than any shortest wrong row here
export const MAX_CIRCLES = 5;
export const MODES = ['build', 'split', 'fewest', 'playground'];
const isRow = (s, max = MAX_ROW) => typeof s === 'string' && s.length <= max && /^[RB]*$/.test(s);
export const pairsOf = n => { const out = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]); return out; };

// --- Machines -----------------------------------------------------------------
// A machine is {arrows: [[r, b], …], marks: [true for ✓, …]}, circle 0 first.
// An arrow is a circle index, or null while it is not yet placed.
export const sizeOf = m => m.marks.length;
export const complete = m => m.arrows.every(a => a.every(t => t !== null));
// The circles a row visits, from circle 0; it stops early at an arrow not placed.
export function runMachine(m, row) {
  const path = [0];
  for (const c of row) { const t = m.arrows[path.at(-1)][slot(c)]; if (t === null) break; path.push(t); }
  return path;
}
export const machineSays = (m, row) => { const path = runMachine(m, row); return path.length === row.length + 1 ? m.marks[path.at(-1)] : null; };
function validMachine(m, k) {
  if (!object(m) || !Array.isArray(m.arrows) || !Array.isArray(m.marks) || m.arrows.length !== k || m.marks.length !== k) return false;
  return m.marks.every(x => typeof x === 'boolean') && m.arrows.every(a => Array.isArray(a) && a.length === 2 && a.every(t => t === null || (Number.isInteger(t) && t >= 0 && t < k)));
}
const machineOf = b => ({arrows: b.arrows, marks: b.marks});

// --- Rules --------------------------------------------------------------------
// Each rule is a step function on its own states. `last` (the last card),
// `seen` (a word has appeared as neighbouring cards), `ends` (the row ends with
// a word), `mod` (the reds make groups of m), `even2` (reds and blues both
// even) have finitely many; `equal` (as many reds as blues) does not.
function prefixState(word, s, c, absorbing) {
  if (absorbing && s === word.length) return s;
  const seen = word.slice(0, s) + c;
  for (let n = Math.min(word.length, seen.length); n > 0; n--) if (seen.endsWith(word.slice(0, n))) return n;
  return 0;
}
const RAW = {
  last: r => ({start: 0, step: (s, c) => (c === r.card ? 1 : 0), accept: s => s === 1}),
  seen: r => ({start: 0, step: (s, c) => prefixState(r.word, s, c, true), accept: s => s === r.word.length}),
  ends: r => ({start: 0, step: (s, c) => prefixState(r.word, s, c, false), accept: s => s === r.word.length}),
  mod: r => ({start: 0, step: (s, c) => (c === 'R' ? (s + 1) % r.m : s), accept: s => s === 0}),
  even2: () => ({start: 0, step: (s, c) => s ^ (c === 'R' ? 1 : 2), accept: s => s === 0}),
  equal: () => ({start: 0, step: (s, c) => s + (c === 'R' ? 1 : -1), accept: s => s === 0, infinite: true})
};
export function validRule(r) {
  if (!object(r) || !Object.hasOwn(RAW, r.kind)) return false;
  const keys = Object.keys(r).sort().join();
  switch (r.kind) {
    case 'last': return keys === 'card,kind' && CARDS.includes(r.card);
    case 'seen': case 'ends': return keys === 'kind,word' && /^[RB]{1,4}$/.test(r.word);
    case 'mod': return keys === 'kind,m' && Number.isInteger(r.m) && r.m >= 1 && r.m <= MAX_CIRCLES;
    default: return keys === 'kind';
  }
}
// Moore refinement: split circles by their mark, then by where their arrows
// lead, until nothing splits. The blocks are renumbered breadth first from
// circle 0, R before B, keeping only the circles a row can reach.
export function minimise(m) {
  let block = m.marks.map(x => (x ? 1 : 0)), count = new Set(block).size;
  for (;;) {
    const sig = m.arrows.map((a, s) => `${block[s]},${block[a[0]]},${block[a[1]]}`), ids = [...new Set(sig)];
    if (ids.length === count) break;
    block = sig.map(x => ids.indexOf(x)); count = ids.length;
  }
  const order = [block[0]], arrows = [], marks = [];
  for (let k = 0; k < order.length; k++) {
    const s = block.indexOf(order[k]);
    arrows.push(m.arrows[s].map(t => { if (!order.includes(block[t])) order.push(block[t]); return order.indexOf(block[t]); }));
    marks.push(m.marks[s]);
  }
  return {arrows, marks};
}
// The rule's smallest machine (null for a rule that has none).
const smallest = new Map();
export function ruleMachine(rule) {
  const key = JSON.stringify(rule);
  if (smallest.has(key)) return smallest.get(key);
  const raw = RAW[rule.kind](rule);
  let m = null;
  if (!raw.infinite) {
    const ids = [raw.start], index = new Map([[raw.start, 0]]), arrows = [];
    for (let k = 0; k < ids.length; k++) arrows.push(CARDS.map(c => { const t = raw.step(ids[k], c); if (!index.has(t)) { index.set(t, ids.length); ids.push(t); } return index.get(t); }));
    m = minimise({arrows, marks: ids.map(raw.accept)});
  }
  smallest.set(key, m);
  return m;
}
export const fewest = rule => ruleMachine(rule)?.marks.length ?? Infinity;
// The rule as a step function on canonical states: the smallest machine's
// circles, or the rule's own count (reds minus blues) for `equal`.
function canon(rule) {
  const m = ruleMachine(rule);
  return m ? {start: 0, step: (s, c) => m.arrows[s][slot(c)], accept: s => m.marks[s]} : RAW[rule.kind](rule);
}
export const ruleState = (rule, row) => { const r = canon(rule); return [...row].reduce((s, c) => r.step(s, c), r.start); };
export const ruleSays = (rule, row) => canon(rule).accept(ruleState(rule, row));
// Two rows can be split exactly when they end on different canonical states:
// different circles of the smallest machine, or different counts for `equal`
// (with d ≥ 0 reds over, d blues balance one row and not the other).
export const separable = (rule, a, b) => ruleState(rule, a) !== ruleState(rule, b);
// The shortest shared ending (R before B) that gives one ✓ and one ×, or null.
export function splitter(rule, a, b, max = MAX_ROW) {
  const r = canon(rule), seen = new Set();
  let layer = [[ruleState(rule, a), ruleState(rule, b), '']];
  for (let d = 0; d <= max && layer.length; d++) {
    const next = [];
    for (const [x, y, w] of layer) {
      const key = `${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (r.accept(x) !== r.accept(y)) return w;
      if (d < max) for (const c of CARDS) next.push([r.step(x, c), r.step(y, c), w + c]);
    }
    layer = next;
  }
  return null;
}
export const splits = (rule, a, b, end) => ruleSays(rule, a + end) !== ruleSays(rule, b + end);
// The shortest row (R before B) on which a complete machine and a rule with
// finitely many states disagree, by a search over pairs of states; null when
// they agree on every row.
export function counterexample(m, rule) {
  const r = canon(rule), seen = new Set();
  let layer = [[0, r.start, '']];
  while (layer.length) {
    const next = [];
    for (const [s, t, w] of layer) {
      const key = `${s},${t}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (m.marks[s] !== r.accept(t)) return w;
      for (const c of CARDS) next.push([m.arrows[s][slot(c)], r.step(t, c), w + c]);
    }
    layer = next;
  }
  return null;
}
export const correct = (m, rule) => complete(m) && counterexample(m, rule) === null;

// --- Boards -------------------------------------------------------------------
// build:  {arrows, marks, checked, tests, presses}
// split:  {ends, cant, refused}
// fewest: {arrows, marks, checked, tests, presses, rows, ends}, or {rows, ends}
//         when no machine is built first
// playground: {arrows, marks, row}
// `checked` says Test has looked at this machine; `tests` are the rows Test
// has shown, oldest first, and `presses` counts Test presses (kept by Undo).
const hasMachine = q => q.mode === 'build' || q.mode === 'playground' || (q.mode === 'fewest' && q.circles > 0);
const blankMachine = k => ({arrows: Array.from({length: k}, () => [null, null]), marks: Array(k).fill(false)});
const passed = (q, b) => b.checked && correct(machineOf(b), q.rule);
// In a fewest puzzle with a machine, rows open once the machine has passed.
const proving = (q, b) => q.mode === 'fewest' && (q.circles === 0 || passed(q, b));

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {arrows: q.machine.arrows.map(a => [...a]), marks: [...q.machine.marks], row: ''};
  if (q.mode === 'split') return {ends: q.pairs.map(() => ''), cant: q.pairs.map(() => false), refused: q.pairs.map(() => false)};
  const machine = hasMachine(q) ? {...blankMachine(q.circles), checked: false, tests: [], presses: 0} : {};
  return q.mode === 'build' ? machine : {...machine, rows: Array(q.rows).fill(''), ends: pairsOf(q.rows).map(() => '')};
}
function validTesting(q, b) {
  if (!validMachine(b, q.circles) || typeof b.checked !== 'boolean' || !Array.isArray(b.tests) || !Number.isInteger(b.presses)) return false;
  if (!b.tests.every(t => isRow(t, MAX_TEST)) || new Set(b.tests).size !== b.tests.length || b.presses < b.tests.length) return false;
  if (!b.checked) return true;
  // A Test of a wrong machine always shows its shortest wrong row.
  if (!complete(b) || b.presses < 1) return false;
  const wrong = counterexample(machineOf(b), q.rule);
  return wrong === null || b.tests.includes(wrong);
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  const keys = Object.keys(b).sort().join();
  if (q.mode === 'playground') {
    const k = Array.isArray(b.marks) ? b.marks.length : 0;
    return keys === 'arrows,marks,row' && k >= 1 && k <= MAX_CIRCLES && validMachine(b, k) && complete(b) && isRow(b.row, 12);
  }
  if (q.mode === 'split') {
    const n = q.pairs.length;
    if (keys !== 'cant,ends,refused' || ![b.ends, b.cant, b.refused].every(list => Array.isArray(list) && list.length === n)) return false;
    return q.pairs.every(([x, y], i) => {
      const e = b.ends[i], cant = b.cant[i], refused = b.refused[i];
      if (!isRow(e) || typeof cant !== 'boolean' || typeof refused !== 'boolean' || (cant && refused)) return false;
      // A right Can't clears the ending and holds only for rows that can't be
      // split; a refused one stands until the ending changes.
      if (cant) return e === '' && !separable(q.rule, x, y);
      if (refused) return separable(q.rule, x, y) && !splits(q.rule, x, y, e);
      return true;
    });
  }
  const want = q.mode === 'build' ? 'arrows,checked,marks,presses,tests' : hasMachine(q) ? 'arrows,checked,ends,marks,presses,rows,tests' : 'ends,rows';
  if (keys !== want || (hasMachine(q) && !validTesting(q, b))) return false;
  if (q.mode === 'build') return true;
  if (!Array.isArray(b.rows) || b.rows.length !== q.rows || !b.rows.every(r => isRow(r))) return false;
  if (!Array.isArray(b.ends) || b.ends.length !== pairsOf(q.rows).length || !b.ends.every(e => isRow(e))) return false;
  // Rows wait for a machine that has passed.
  return proving(q, b) || [...b.rows, ...b.ends].every(s => s === '');
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'build') return passed(q, b);
  if (q.mode === 'split') return q.pairs.every(([x, y], i) => b.cant[i] || splits(q.rule, x, y, b.ends[i]));
  return proving(q, b) && pairsOf(q.rows).every(([i, j], n) => splits(q.rule, b.rows[i], b.rows[j], b.ends[n]));
}

// --- Moves --------------------------------------------------------------------
// {type: 'arrow', from, card, to}  place or move one arrow
// {type: 'mark', circle}           switch a circle between ✓ and ×
// {type: 'test'}                   compare the machine with the rule
// {type: 'key', target, index, card}  a card ('R', 'B') or 'back' for a row,
//                                  an ending ('end') or the playground's row
// {type: 'cant', pair}             no shared ending splits this pair
// {type: 'circles', n}, {type: 'mix'}  the playground's circles
function edit(b, list, index, card) {
  const s = b[list][index];
  if (card === 'back') return s.length ? s.slice(0, -1) : null;
  return CARDS.includes(card) && s.length < MAX_ROW ? s + card : null;
}
function machineMove(q, b, action, random) {
  const k = b.marks.length;
  if (action.type === 'arrow') {
    const {from, card, to} = action;
    if (![from, to].every(i => Number.isInteger(i) && i >= 0 && i < k) || !CARDS.includes(card)) return null;
    if (b.arrows[from][slot(card)] === to) return b;
    const arrows = b.arrows.map((a, i) => (i === from ? a.map((t, c) => (c === slot(card) ? to : t)) : a));
    return q.mode === 'playground' ? {...b, arrows} : {...b, arrows, checked: false};
  }
  if (action.type === 'mark') {
    const i = action.circle;
    if (!Number.isInteger(i) || i < 0 || i >= k) return null;
    const marks = b.marks.map((x, j) => (j === i ? !x : x));
    return q.mode === 'playground' ? {...b, marks} : {...b, marks, checked: false};
  }
  if (action.type === 'test' && q.mode !== 'playground') {
    if (b.checked || !complete(b)) return null;
    const wrong = counterexample(machineOf(b), q.rule);
    const tests = wrong === null || b.tests.includes(wrong) ? b.tests : [...b.tests, wrong];
    return {...b, checked: true, tests, presses: b.presses + 1};
  }
  if (q.mode === 'playground') {
    if (action.type === 'circles') {
      const n = action.n;
      if (!Number.isInteger(n) || n < 1 || n > MAX_CIRCLES || n === k) return null;
      // New circles start with both arrows looping; arrows into a removed circle loop too.
      const arrows = Array.from({length: n}, (_, i) => (i < k ? b.arrows[i].map(t => (t < n ? t : i)) : [i, i]));
      return {...b, arrows, marks: Array.from({length: n}, (_, i) => (i < k ? b.marks[i] : false))};
    }
    if (action.type === 'mix') {
      const pick = () => Math.floor(random() * k) % k;
      return {...b, arrows: b.arrows.map(() => [pick(), pick()]), marks: b.marks.map(() => random() < 0.5)};
    }
    if (action.type === 'key' && action.target === 'bench') {
      const s = action.card === 'clear' ? (b.row ? '' : null) : action.card === 'back' ? (b.row ? b.row.slice(0, -1) : null) : CARDS.includes(action.card) && b.row.length < 12 ? b.row + action.card : null;
      return s === null ? null : {...b, row: s};
    }
  }
  return null;
}
function move(p, b, action, random = Math.random) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  let next = null;
  if (q.mode === 'split') {
    const i = action.index ?? action.pair;
    if (!Number.isInteger(i) || i < 0 || i >= q.pairs.length || b.cant[i]) return null;
    const [x, y] = q.pairs[i];
    if (action.type === 'key' && action.target === 'end') {
      const e = edit(b, 'ends', i, action.card);
      if (e !== null) next = {...b, ends: b.ends.map((s, j) => (j === i ? e : s)), refused: b.refused.map((r, j) => (j === i ? false : r))};
    } else if (action.type === 'cant' && !b.refused[i] && !splits(q.rule, x, y, b.ends[i])) {
      next = separable(q.rule, x, y)
        ? {...b, refused: b.refused.map((r, j) => (j === i ? true : r))}
        : {...b, ends: b.ends.map((s, j) => (j === i ? '' : s)), cant: b.cant.map((c, j) => (j === i ? true : c))};
    }
    // After a right Can't the keys go to the next open pair.
    if (next) ui(p).sel = next.cant[i] ? null : ['pair', i];
    return next;
  }
  if (['arrow', 'mark', 'test', 'circles', 'mix'].includes(action.type) || action.target === 'bench') {
    if (!hasMachine(q) || (q.mode === 'fewest' && proving(q, b))) return null;
    next = machineMove(q, b, action, random);
    if (next && action.type === 'arrow') ui(p).arm = null;
    if (next && action.type === 'test') ui(p).pick = null;
    return next;
  }
  if (q.mode === 'fewest' && action.type === 'key' && proving(q, b)) {
    const list = action.target === 'row' ? 'rows' : action.target === 'end' ? 'ends' : null, i = action.index;
    if (!list || !Number.isInteger(i) || i < 0 || i >= b[list].length) return null;
    const s = edit(b, list, i, action.card);
    if (s === null) return null;
    ui(p).sel = [list === 'rows' ? 'row' : 'pair', i];
    return {...b, [list]: b[list].map((t, j) => (j === i ? s : t))};
  }
  return null;
}

// --- Hints --------------------------------------------------------------------
// A machine is right with the fewest circles exactly when it is the rule's
// smallest machine with its circles renamed (circle 1 stays the start): a
// right machine with k circles reaches every circle, or fewer would do. The
// hint aims at the renaming that needs the fewest changes; on a tie, the one
// with the fewest long arrows as drawn (diagonals across a square).
function longArrows(m) {
  const L = layout(m.marks.length), d = (s, t) => Math.hypot(L.at[t][0] - L.at[s][0], L.at[t][1] - L.at[s][1]);
  const near = Math.min(...L.at.flatMap((_, s) => L.at.map((__, t) => (s === t ? Infinity : d(s, t)))));
  return m.arrows.reduce((n, a, s) => n + a.filter(t => d(s, t) > 1.2 * near).length, 0);
}
export function renamings(rule) {
  const d = ruleMachine(rule), k = d.marks.length, out = [];
  const others = Array.from({length: k - 1}, (_, i) => i + 1);
  const orders = items => (items.length <= 1 ? [items] : items.flatMap((x, i) => orders([...items.slice(0, i), ...items.slice(i + 1)]).map(t => [x, ...t])));
  for (const tail of orders(others)) {
    const pi = [0, ...tail], arrows = Array(k), marks = Array(k);
    d.arrows.forEach((a, s) => { arrows[pi[s]] = a.map(t => pi[t]); marks[pi[s]] = d.marks[s]; });
    out.push({arrows, marks});
  }
  return out.map(m => [m, longArrows(m)]).sort((x, y) => x[1] - y[1]).map(([m]) => m);
}
const changes = (m, t) => m.arrows.reduce((n, a, s) => n + a.filter((x, c) => x !== t.arrows[s][c]).length + (m.marks[s] !== t.marks[s] ? 1 : 0), 0);
export const circleName = i => `circle ${i + 1}`;
const markWord = yes => (yes ? '✓' : '×');
function buildHint(q, b) {
  const target = renamings(q.rule).reduce((best, t) => (changes(b, t) < changes(b, best) ? t : best));
  for (let s = 0; s < b.arrows.length; s++) for (const card of CARDS) {
    const to = target.arrows[s][slot(card)];
    if (b.arrows[s][slot(card)] !== to) return {type: 'move', action: {type: 'arrow', from: s, card, to}, text: `Send ${circleName(s)}’s ${card} arrow ${to === s ? 'back to itself' : `to ${circleName(to)}`}.`};
  }
  for (let s = 0; s < b.marks.length; s++) if (b.marks[s] !== target.marks[s]) return {type: 'move', action: {type: 'mark', circle: s}, text: `Make ${circleName(s)} say ${markWord(target.marks[s])}.`};
  return {type: 'move', action: {type: 'test'}, text: 'Press Test.'};
}
// The cheapest way to turn a row into one that reaches a wanted state: take
// cards off the end, then add the fewest cards, never passing MAX_ROW.
function reshape(rule, row, wanted, max = MAX_ROW) {
  const r = canon(rule);
  let best = null;
  for (let keep = row.length; keep >= 0; keep--) {
    const cut = row.length - keep;
    if (best && cut >= best.cost) break;
    const seen = new Set();
    let layer = [[ruleState(rule, row.slice(0, keep)), '']];
    for (let d = 0; keep + d <= max && layer.length; d++) {
      const hit = layer.find(([s]) => wanted(s));
      if (hit) { if (!best || cut + d < best.cost) best = {keep, add: hit[1], cost: cut + d}; break; }
      const next = [];
      for (const [s, w] of layer) for (const c of CARDS) { const t = r.step(s, c); if (!seen.has(t)) { seen.add(t); next.push([t, w + c]); } }
      layer = next;
    }
  }
  return best;
}
const rowWords = row => (row ? [...row].join(' ') : 'no cards');
function endHint(rule, x, y, e, said) {
  // Keep the start of the ending that needs the fewest cards taken off and
  // added (the longest on a tie), then add the shortest split from there.
  let best = null;
  for (let keep = e.length; keep >= 0; keep--) {
    const rest = splitter(rule, x + e.slice(0, keep), y + e.slice(0, keep), MAX_ROW - keep);
    if (rest !== null && (!best || e.length - keep + rest.length < best.cost)) best = {keep, rest, cost: e.length - keep + rest.length};
  }
  if (!best) return null;
  if (best.keep < e.length) return {card: 'back', text: `${said}: take the last card off the ending.`};
  return {card: best.rest[0], text: `${said}: add ${best.rest[0]} after both.`};
}
function splitHint(q, b) {
  for (let i = 0; i < q.pairs.length; i++) {
    const [x, y] = q.pairs[i];
    if (b.cant[i] || splits(q.rule, x, y, b.ends[i])) continue;
    const said = `${rowWords(x)} and ${rowWords(y)}`;
    if (!separable(q.rule, x, y)) return {type: 'move', action: {type: 'cant', pair: i}, text: `${said}: press Can’t.`, pair: i};
    const h = endHint(q.rule, x, y, b.ends[i], said);
    if (h) return {type: 'move', action: {type: 'key', target: 'end', index: i, card: h.card}, text: h.text, pair: i};
  }
  return {type: 'done'};
}
function proveHint(q, b) {
  // Rows first: each row on a state of its own.
  const states = b.rows.map(r => ruleState(q.rule, r));
  for (let i = 0; i < b.rows.length; i++) {
    if (!states.slice(0, i).includes(states[i])) continue;
    const used = states.filter((_, j) => j !== i);
    const plan = reshape(q.rule, b.rows[i], s => !used.includes(s));
    if (!plan) continue;
    const card = plan.keep < b.rows[i].length ? 'back' : plan.add[0];
    return {type: 'move', action: {type: 'key', target: 'row', index: i, card}, text: card === 'back' ? `Take the last card off row ${i + 1}.` : `Add ${card} to row ${i + 1}.`, row: i};
  }
  const pairs = pairsOf(q.rows);
  for (let n = 0; n < pairs.length; n++) {
    const [i, j] = pairs[n], x = b.rows[i], y = b.rows[j];
    if (splits(q.rule, x, y, b.ends[n])) continue;
    const h = endHint(q.rule, x, y, b.ends[n], `Rows ${i + 1} and ${j + 1}`);
    if (h) return {type: 'move', action: {type: 'key', target: 'end', index: n, card: h.card}, text: h.text, pair: n};
  }
  return {type: 'done'};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  if (q.mode === 'split') return splitHint(q, b);
  if (hasMachine(q) && !proving(q, b)) return buildHint(q, b);
  return proveHint(q, b);
}

// --- View state ---------------------------------------------------------------
// The chip being moved (`arm`), the Test row traced on the machine (`pick`,
// null for the newest) and the row or ending the keys edit (`sel`) stay out
// of the save.
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {arm: null, pick: null, sel: null}); return uiState.get(p.id); }
function selection(p, b) {
  const q = p.parameters, s = ui(p).sel;
  if (q.mode === 'split') {
    if (s?.[0] === 'pair' && s[1] < q.pairs.length) return s;
    const open = q.pairs.findIndex(([x, y], i) => !b.cant[i] && !splits(q.rule, x, y, b.ends[i]));
    return ['pair', Math.max(open, 0)];
  }
  if (s && ((s[0] === 'row' && s[1] < q.rows) || (s[0] === 'pair' && s[1] < pairsOf(q.rows).length))) return s;
  return ['row', Math.min(1, q.rows - 1)];
}

// --- Drawing the machine ------------------------------------------------------
// Circles sit on a regular polygon (two side by side), circle 1 first and the
// rest clockwise, so no arrow passes through a circle. Arrows between two
// circles bend apart when there are several; a loop leaves on the outside.
const f = n => Number(n.toFixed(2));
const deg = a => (a * Math.PI) / 180;
const dirOf = a => [Math.cos(deg(a)), Math.sin(deg(a))];
const add = (p, v, s = 1) => [p[0] + v[0] * s, p[1] + v[1] * s];
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const pt = p => `${f(p[0])},${f(p[1])}`;
export function layout(k) {
  const L = {
    1: {at: [[50, 30]], r: 9.5},
    2: {at: [[29, 30], [71, 30]], r: 9.5},
    3: {at: [[27, 29], [73, 29], [50, 66]], r: 9.5},
    4: {at: [[27, 28], [73, 28], [73, 72], [27, 72]], r: 9},
    5: {at: [198, 270, 342, 54, 126].map(a => add([50, 53], dirOf(a), 32)), r: 8.5}
  }[k];
  const c = L.at.reduce((s, p) => [s[0] + p[0] / k, s[1] + p[1] / k], [0, 0]);
  const out = L.at.map(p => (k === 1 ? 180 : (Math.atan2(p[1] - c[1], p[0] - c[0]) * 180) / Math.PI));
  const bottom = Math.max(...L.at.map(p => p[1])) + L.r + 17;
  return {...L, out, h: f(bottom)};
}
const SPREAD = 42;
const sideAngle = (L, i, card) => L.out[i] + (card === 'R' ? -SPREAD : SPREAD);
// Where each placed arrow runs: a path, its arrowhead and the chip's spot.
function arrowShapes(L, arrows) {
  const shapes = [];
  const between = new Map();
  arrows.forEach((a, s) => a.forEach((t, c) => { if (t === null || t === s) return; const key = [Math.min(s, t), Math.max(s, t)].join(); if (!between.has(key)) between.set(key, []); between.get(key).push({s, t, card: CARDS[c]}); }));
  for (const [s, a] of arrows.entries()) for (const [c, t] of a.entries()) {
    const card = CARDS[c], center = L.at[s];
    if (t === null) {
      const d = dirOf(sideAngle(L, s, card)), from = add(center, d, L.r), chip = add(center, d, L.r + 11.5);
      shapes.push({s, card, t, stub: true, path: `M${pt(from)}L${pt(add(center, d, L.r + 8))}`, chip});
      continue;
    }
    if (t === s) {
      const a0 = sideAngle(L, s, card), p0 = add(center, dirOf(a0 - 24), L.r), p2 = add(center, dirOf(a0 + 24), L.r + 0.6);
      const c1 = add(center, dirOf(a0 - 32), L.r + 17), c2 = add(center, dirOf(a0 + 32), L.r + 17);
      const tip = p2, back = add(tip, unit(tip, c2), 3.4);
      const chip = [(p0[0] + 3 * c1[0] + 3 * c2[0] + p2[0]) / 8, (p0[1] + 3 * c1[1] + 3 * c2[1] + p2[1]) / 8];
      shapes.push({s, card, t, path: `M${pt(p0)}C${pt(c1)} ${pt(c2)} ${pt(back)}`, head: headAt(tip, unit(c2, tip)), chip});
      continue;
    }
    const lo = Math.min(s, t), hi = Math.max(s, t), group = between.get(`${lo},${hi}`);
    const rank = ({s: a, card: k}) => (a === lo ? (k === 'R' ? 0 : 1) : k === 'B' ? 2 : 3);
    group.sort((x, y) => rank(x) - rank(y));
    const n = group.findIndex(g => g.s === s && g.card === card), offset = (n - (group.length - 1) / 2) * 7;
    const A = L.at[lo], B = L.at[hi], dir = unit(A, B), normal = [-dir[1], dir[0]], mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const ctrl = add(mid, normal, offset * 2), from = L.at[s], to = L.at[t];
    const p0 = add(from, unit(from, ctrl), L.r), tip = add(to, unit(to, ctrl), L.r + 0.6), back = add(tip, unit(tip, ctrl), 3.4);
    const at = u => [(1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * ctrl[0] + u * u * tip[0], (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * ctrl[1] + u * u * tip[1]];
    shapes.push({s, card, t, path: `M${pt(p0)}Q${pt(ctrl)} ${pt(back)}`, head: headAt(tip, unit(ctrl, tip)), chip: at(0.4)});
  }
  return shapes;
}
function headAt(tip, d) {
  const n = [-d[1], d[0]], base = add(tip, d, -3.6);
  return `${pt(tip)} ${pt(add(base, n, 2.1))} ${pt(add(base, n, -2.1))}`;
}
const chipGlyph = card => (card === 'R' ? '<rect class="cm-chip-face" x="-3.6" y="-3.6" width="7.2" height="7.2" rx="1.3"/>' : '<circle class="cm-chip-face" r="3.9"/>');
// Marker spots on a circle's rim, for up to four markers on one circle.
const RIM = [50, 130, -50, -130];
function markerShapes(L, markers) {
  const at = new Map();
  return markers.map(m => {
    const n = at.get(m.circle) || 0;
    at.set(m.circle, n + 1);
    const [x, y] = add(L.at[m.circle], dirOf(RIM[n % 4]), L.r * 0.92);
    return `<g class="cm-marker ${m.cls}" transform="translate(${f(x)},${f(y)})"><circle r="3.3"/>${m.text ? `<text y="1.25">${esc(m.text)}</text>` : ''}</g>`;
  }).join('');
}
// The machine as one SVG. opts: {edit, arm, hinted, used (Set of "s,c"),
// markers: [{circle, cls, text}], cls, label}.
export function machineSVG(m, opts = {}) {
  const k = m.marks.length, L = layout(k), edit = Boolean(opts.edit), arm = opts.arm, hinted = opts.hinted || {};
  const shapes = arrowShapes(L, m.arrows), used = opts.used || new Set();
  const start = (() => { const d = dirOf(L.out[0]), tip = add(L.at[0], d, L.r + 0.6), tail = add(L.at[0], d, L.r + 10); return `<path class="cm-start" d="M${pt(tail)}L${pt(add(tip, d, 3.4))}"/><polygon class="cm-start-head" points="${headAt(tip, [-d[0], -d[1]])}"/>`; })();
  const lines = shapes.map(sh => {
    const glow = used.has(`${sh.s},${sh.card}`) ? `<path class="cm-used" d="${sh.path}"/>` : '';
    return `<g class="cm-arrow ${sh.card === 'R' ? 'r' : 'b'}${sh.stub ? ' stub' : ''}">${glow}<path class="cm-line" d="${sh.path}"/>${sh.head ? `<polygon class="cm-head" points="${sh.head}"/>` : ''}</g>`;
  }).join('');
  const chips = shapes.map(sh => {
    const name = `${sh.card} arrow from ${circleName(sh.s)}`, where = sh.t === null ? 'not placed' : sh.t === sh.s ? 'back to itself' : `to ${circleName(sh.t)}`;
    const on = arm && arm.from === sh.s && arm.card === sh.card, hint = hinted.chip && hinted.chip.from === sh.s && hinted.chip.card === sh.card;
    const control = edit ? `role="button" tabindex="0" aria-pressed="${Boolean(on)}" aria-label="${esc(`${name}, ${where}`)}" data-chip="${sh.s},${sh.card}" data-focus="cm-chip-${sh.s}-${sh.card}"` : 'aria-hidden="true"';
    return `<g class="cm-chip ${sh.card === 'R' ? 'r' : 'b'}${on ? ' armed' : ''}${hint ? ' hinted' : ''}" transform="translate(${pt(sh.chip)})" ${control}>${edit ? '<circle class="cm-hit" r="6.8"/>' : ''}${chipGlyph(sh.card)}<text y="1.6">${sh.card}</text></g>`;
  }).join('');
  const circles = L.at.map((c, i) => {
    const target = arm ? `. Send ${arm.card} from ${circleName(arm.from)} here` : '. Tap to change';
    const control = edit ? `role="button" tabindex="0" aria-label="${esc(`${circleName(i)}, ${markWord(m.marks[i])}${target}`)}" data-circle="${i}" data-focus="cm-circle-${i}"` : `role="img" aria-label="${esc(`${circleName(i)}, ${markWord(m.marks[i])}`)}"`;
    const cls = [m.marks[i] ? 'yes' : 'no', arm ? 'target' : '', hinted.circle === i ? 'hinted' : ''].join(' ');
    return `<g class="cm-circle ${cls}" transform="translate(${pt(c)})" ${control}><circle class="cm-ring" r="${L.r}"/><text class="cm-num" y="${f(-L.r * 0.42)}">${i + 1}</text><text class="cm-mark" y="${f(L.r * 0.5)}">${markWord(m.marks[i])}</text></g>`;
  }).join('');
  const markers = markerShapes(L, opts.markers || []);
  return `<svg class="cm-machine${edit ? ' edit' : ''} k${k} ${opts.cls || ''}" viewBox="-2 -2 104 ${f(L.h + 4)}" role="group" aria-label="${esc(opts.label || 'Machine')}" data-cm-machine>${start}<g class="cm-arrows">${lines}</g><g class="cm-circles">${circles}</g><g class="cm-chips">${chips}</g><g class="cm-markers" aria-hidden="true">${markers}</g></svg>`;
}
// The arrows a row uses on a machine, for drawing its trace.
function usedBy(m, row) {
  const path = runMachine(m, row), used = new Set();
  for (let n = 1; n < path.length; n++) used.add(`${path[n - 1]},${row[n - 1]}`);
  return {used, end: path.at(-1), whole: path.length === row.length + 1};
}
export function describeMachine(m) {
  return m.arrows.map((a, s) => `${circleName(s)} says ${markWord(m.marks[s])}; ${a.map((t, c) => `${CARDS[c]} ${t === null ? 'not placed' : t === s ? 'stays' : `to ${t + 1}`}`).join(', ')}`).join('. ') + '.';
}

// --- Rows, keys and the rest of the board -------------------------------------
const cardsHTML = row => (row ? `<span class="cm-cards" aria-hidden="true">${[...row].map(c => `<i class="cm-c ${c === 'R' ? 'r' : 'b'}">${c}</i>`).join('')}</span>` : '<span class="cm-none">no cards</span>');
const sayHTML = yes => `<span class="cm-say ${yes ? 'yes' : 'no'}" aria-hidden="true">${markWord(yes)}</span>`;
const moveData = action => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}"`;
const uiData = payload => `data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}"`;
function keys(target, index, value, hinted, extra = '') {
  const key = (card, label, aria, enabled) => `<button type="button" class="cm-key ${card === 'R' ? 'r' : card === 'B' ? 'b' : 'back'}${hinted === card ? ' hinted' : ''}" ${moveData({type: 'key', target, index, card})} data-focus="cm-key-${card}" aria-label="${aria}" ${enabled ? '' : 'disabled'}>${label}</button>`;
  return `<div class="cm-keys" role="group" aria-label="Cards">${key('R', '<i class="cm-c r">R</i>', 'Add R', value.length < MAX_ROW)}${key('B', '<i class="cm-c b">B</i>', 'Add B', value.length < MAX_ROW)}${key('back', '⌫', 'Take back a card', value.length > 0)}${extra}</div>`;
}
const button = (label, action, cls, enabled, hinted, focus) => `<button type="button" class="secondary cm-button ${cls}${hinted ? ' hinted' : ''}" ${moveData(action)} data-focus="${focus}" ${enabled ? '' : 'disabled'}>${label}</button>`;

function testsHTML(q, b, m, pick) {
  if (!b.tests.length) return '';
  const items = [...b.tests].reverse().map(t => {
    const want = ruleSays(q.rule, t), got = machineSays(m, t), off = got !== null && got !== want;
    return `<button type="button" class="cm-test${t === pick ? ' picked' : ''}${off ? ' off' : ''}" ${uiData({pick: t})} data-focus="cm-test-${t || 'none'}" aria-pressed="${t === pick}" aria-label="${esc(`${rowWords(t)}: should be ${markWord(want)}${off ? `, this machine says ${markWord(got)}` : ''}`)}">${cardsHTML(t)}${sayHTML(want)}</button>`;
  }).join('');
  return `<div class="cm-tests" role="group" aria-label="Rows Test showed">${items}</div>`;
}
function machineBlock(p, a, q, b, h) {
  const m = machineOf(b), state = ui(p), locked = q.mode === 'fewest' && proving(q, b), done = solved(p, b);
  const editing = !done && !locked;
  const act = h?.action, hinted = {chip: act?.type === 'arrow' ? {from: act.from, card: act.card} : null, circle: act?.type === 'arrow' ? act.to : act?.type === 'mark' ? act.circle : null};
  let used = new Set(), markers = [];
  if (q.mode === 'playground') {
    const t = usedBy(m, b.row);
    used = t.used; markers = [{circle: t.end, cls: 'trace'}];
  } else if (locked) {
    // The rows' markers, or the selected pair's two rows with its ending.
    const s = selection(p, b);
    if (s[0] === 'pair') { const [i, j] = pairsOf(q.rows)[s[1]], e = b.ends[s[1]]; markers = [i, j].map(r => ({circle: runMachine(m, b.rows[r] + e).at(-1), cls: `d${r + 1}`, text: String(r + 1)})); }
    else markers = b.rows.map((r, i) => ({circle: runMachine(m, r).at(-1), cls: `d${i + 1}${i === s[1] ? ' sel' : ''}`, text: String(i + 1)}));
  } else {
    const pick = b.tests.includes(state.pick) ? state.pick : b.tests.at(-1);
    if (pick !== undefined) { const t = usedBy(m, pick); used = t.used; markers = [{circle: t.end, cls: t.whole ? 'trace' : 'trace stuck'}]; }
  }
  const svg = machineSVG(m, {edit: editing, arm: editing ? state.arm : null, hinted, used, markers, label: 'Machine'});
  if (q.mode === 'playground') return svg;
  const test = editing ? `<div class="cm-bar">${button('Test', {type: 'test'}, 'cm-test-button', complete(m) && !b.checked, act?.type === 'test', 'cm-test')}</div>` : '';
  const pick = b.tests.includes(state.pick) ? state.pick : b.tests.at(-1);
  return `${svg}${test}${locked || done ? '' : testsHTML(q, b, m, pick)}`;
}

// A pair: two rows, one bracketed ending after both, and the two answers.
function pairHTML(p, q, b, n, x, y, opts) {
  const e = b.ends[n], sel = opts.sel, cant = opts.cant, split = !cant && splits(q.rule, x, y, e);
  const label = `${opts.names[0]} and ${opts.names[1]}: ${cant ? 'can’t be split' : `ending ${rowWords(e)}${split ? ', split' : ''}`}`;
  const end = cant ? '<span class="cm-cant-mark">can’t</span>' : `<span class="cm-plus" aria-hidden="true">+</span>${e ? cardsHTML(e) : '<span class="cm-blank" aria-hidden="true"></span>'}`;
  const endButton = opts.locked ? `<span class="cm-end" role="img" aria-label="${esc(label)}">${end}</span>` : `<button type="button" class="cm-end${sel ? ' sel' : ''}${opts.hinted ? ' hinted' : ''}" ${uiData({sel: ['pair', n]})} data-focus="cm-pair-${n}" aria-pressed="${sel}" aria-label="${esc(label)}">${end}</button>`;
  const lines = [x, y].map((r, k) => `<span class="cm-line l${k + 1}"><span class="cm-dot ${opts.dots[k]}" aria-hidden="true">${opts.marks[k]}</span>${cardsHTML(r)}</span>`).join('');
  const answers = cant ? '' : [x, y].map(r => sayHTML(ruleSays(q.rule, r + e))).join('');
  return `<div class="cm-pair${split ? ' split' : ''}${cant ? ' cant' : ''}${sel ? ' sel' : ''}"><div class="cm-pair-grid">${lines}${endButton}${answers ? `<span class="cm-answers">${answers}</span>` : ''}</div>${opts.after || ''}</div>`;
}
function splitBlock(p, a, q, b, h) {
  const done = solved(p, b), s = selection(p, b), act = h?.action;
  const hintPair = h?.pair ?? null;
  const machine = q.machine ? (() => {
    const [x, y] = q.pairs[s[1]], e = b.ends[s[1]];
    const markers = [x, y].map((r, k) => ({circle: runMachine(q.machine, r + e).at(-1), cls: `l${k + 1}`}));
    return machineSVG(q.machine, {markers, label: 'Machine'});
  })() : '';
  const items = q.pairs.map(([x, y], n) => {
    const sel = !done && s[1] === n, cant = b.cant[n];
    let after = '';
    if (cant && !q.machine) {
      // The certificate: on the rule's machine both rows end on one circle.
      const m = ruleMachine(q.rule), end = runMachine(m, x).at(-1);
      after = `<div class="cm-proof">${machineSVG(m, {markers: [{circle: end, cls: 'l1'}, {circle: runMachine(m, y).at(-1), cls: 'l2'}], cls: 'mini', label: `Both rows end on ${circleName(end)} of this machine`})}</div>`;
    } else if (b.refused[n]) after = '<p class="cm-told">Keep looking.</p>';
    const open = !b.refused[n] && !splits(q.rule, x, y, b.ends[n]);
    const extra = `<button type="button" class="secondary cm-button cm-cant${act?.type === 'cant' && hintPair === n ? ' hinted' : ''}" ${moveData({type: 'cant', pair: n})} data-focus="cm-cant" ${open ? '' : 'disabled'}>Can’t</button>`;
    const html = pairHTML(p, q, b, n, x, y, {sel, cant, names: [rowWords(x), rowWords(y)], dots: ['l1', 'l2'], marks: ['', ''], hinted: hintPair === n, locked: done || cant, after});
    return html + (sel && !cant ? keys('end', n, b.ends[n], act?.type === 'key' && hintPair === n ? act.card : null, extra) : '');
  }).join('');
  return `${machine}<div class="cm-pairs">${items}</div>`;
}
function proveBlock(p, a, q, b, h) {
  const done = solved(p, b), s = selection(p, b), act = h?.action;
  const rows = b.rows.map((r, i) => {
    const sel = !done && s[0] === 'row' && s[1] === i, hint = h?.row === i;
    const line = `<button type="button" class="cm-row${sel ? ' sel' : ''}${hint ? ' hinted' : ''}" ${uiData({sel: ['row', i]})} data-focus="cm-row-${i}" aria-pressed="${sel}" aria-label="${esc(`Row ${i + 1}: ${rowWords(r)}, ${markWord(ruleSays(q.rule, r))}`)}" ${done ? 'disabled' : ''}><span class="cm-dot d${i + 1}" aria-hidden="true">${i + 1}</span>${cardsHTML(r)}${sayHTML(ruleSays(q.rule, r))}</button>`;
    return line + (sel ? keys('row', i, r, act?.type === 'key' && hint ? act.card : null) : '');
  }).join('');
  const pairs = pairsOf(q.rows).map(([i, j], n) => {
    const sel = !done && s[0] === 'pair' && s[1] === n, hint = h?.pair === n;
    const html = pairHTML(p, q, b, n, b.rows[i], b.rows[j], {sel, cant: false, names: [`Row ${i + 1}`, `row ${j + 1}`], dots: [`d${i + 1}`, `d${j + 1}`], marks: [i + 1, j + 1], hinted: hint, locked: done});
    return html + (sel ? keys('end', n, b.ends[n], act?.type === 'key' && hint ? act.card : null) : '');
  }).join('');
  // With no machine first, the objective already says this; after a machine
  // has passed it is the one new goal.
  const fewer = q.rows - 1, task = q.circles > 0 ? `<p class="cm-task">Show ${fewer} ${fewer === 1 ? 'circle is' : 'circles are'} not enough.</p>` : '';
  return `<div class="cm-prove">${task}<div class="cm-rows">${rows}</div><div class="cm-pairs">${pairs}</div></div>`;
}
function benchBlock(p, b) {
  const k = b.marks.length, says = machineSays(machineOf(b), b.row);
  const sizes = `<div class="cm-bar">${button('−', {type: 'circles', n: k - 1}, 'cm-less', k > 1, false, 'cm-less').replace('>−<', ' aria-label="Fewer circles">−<')}${button('+', {type: 'circles', n: k + 1}, 'cm-more', k < MAX_CIRCLES, false, 'cm-more').replace('>+<', ' aria-label="More circles">+<')}${button('Mix', {type: 'mix'}, 'cm-mix', true, false, 'cm-mix')}</div>`;
  const key = (card, label, aria, enabled) => `<button type="button" class="cm-key ${card === 'R' ? 'r' : card === 'B' ? 'b' : 'back'}" ${moveData({type: 'key', target: 'bench', card})} data-focus="cm-bench-${card}" aria-label="${aria}" ${enabled ? '' : 'disabled'}>${label}</button>`;
  const bench = `<div class="cm-bench"><span class="cm-row bench" aria-label="${esc(`Row: ${rowWords(b.row)}, the machine says ${markWord(says)}`)}" role="img">${cardsHTML(b.row)}${sayHTML(says)}</span><div class="cm-keys" role="group" aria-label="Cards">${key('R', '<i class="cm-c r">R</i>', 'Add R', b.row.length < 12)}${key('B', '<i class="cm-c b">B</i>', 'Add B', b.row.length < 12)}${key('back', '⌫', 'Take back a card', b.row.length > 0)}${key('clear', '✕', 'Clear the row', b.row.length > 0)}</div></div>`;
  return sizes + bench;
}

function render(p, a, ctx = {}) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const h = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b) : null;
  let body = '', status = '';
  if (q.mode === 'playground') {
    body = machineBlock(p, a, q, b, null) + benchBlock(p, b);
    status = `${describeMachine(machineOf(b))} Row ${rowWords(b.row)}: ${markWord(machineSays(machineOf(b), b.row))}.`;
  } else if (q.mode === 'split') {
    body = splitBlock(p, a, q, b, h);
    status = q.pairs.map(([x, y], i) => `${rowWords(x)} and ${rowWords(y)}: ${b.cant[i] ? 'can’t be split' : `+ ${rowWords(b.ends[i])}, ${markWord(ruleSays(q.rule, x + b.ends[i]))} and ${markWord(ruleSays(q.rule, y + b.ends[i]))}`}${b.refused[i] ? '. Keep looking' : ''}`).join('. ') + '.';
  } else {
    const building = hasMachine(q) && !proving(q, b);
    body = (hasMachine(q) ? machineBlock(p, a, q, b, building ? h : null) : '') + (proving(q, b) ? proveBlock(p, a, q, b, h) : '');
    if (hasMachine(q)) {
      const m = machineOf(b), last = b.tests.at(-1);
      status = building ? `${describeMachine(m)}${b.checked && last !== undefined && !passed(q, b) ? ` Test: ${rowWords(last)} should be ${markWord(ruleSays(q.rule, last))}.` : ''}` : 'The machine passed Test.';
    }
    if (proving(q, b)) status += ` ${b.rows.map((r, i) => `Row ${i + 1}: ${rowWords(r)}`).join('. ')}.`;
  }
  return `<div class="cm-puzzle${done ? ' solved' : ''} ${q.mode}" data-mechanic-wire="cardmachines">${body}<p class="sr-only" role="status">${esc(status.trim())}</p></div>`;
}

// --- Taps, drags and keys -----------------------------------------------------
// A chip (the R or B on an arrow) is dragged onto a circle, or tapped and then
// a circle tapped. A tap on a circle with no chip chosen switches its mark.
// R, B and Backspace type into the selected row or ending.
const chipOf = el => { const c = el?.closest?.('[data-chip]'); if (!c) return null; const [from, card] = c.dataset.chip.split(','); return {from: Number(from), card}; };
const circleOf = el => { const c = el?.closest?.('[data-circle]'); return c ? Number(c.dataset.circle) : null; };
// One drag at a time, followed on the document so a finger can leave the chip.
let drag = null, listening = false, dragged = false;
function dragMove(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  const svg = drag.svg;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
  if (!drag.moved) {
    drag.moved = true;
    const [x1, y1] = layout(svg.querySelectorAll('[data-circle]').length).at[drag.from];
    drag.line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    drag.line.setAttribute('class', `cm-rubber ${drag.card === 'R' ? 'r' : 'b'}`);
    drag.line.setAttribute('x1', x1); drag.line.setAttribute('y1', y1);
    svg.appendChild(drag.line);
    svg.classList.add('dragging');
  }
  const m = svg.getScreenCTM();
  if (m) { const at = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); drag.line.setAttribute('x2', f(at.x)); drag.line.setAttribute('y2', f(at.y)); }
  const over = circleOf(document.elementFromPoint(e.clientX, e.clientY));
  if (over !== drag.over) {
    svg.querySelector('.cm-circle.drop')?.classList.remove('drop');
    if (over !== null) svg.querySelector(`[data-circle="${over}"]`)?.classList.add('drop');
    drag.over = over;
  }
}
function dragEnd(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  const d = drag;
  drag = null;
  d.line?.remove(); d.svg.classList.remove('dragging'); d.svg.querySelector('.cm-circle.drop')?.classList.remove('drop');
  if (!d.moved) return;
  // The click that follows a drag belongs to the drag, not to a tap.
  dragged = true;
  setTimeout(() => { dragged = false; }, 0);
  const to = e.type === 'pointerup' ? circleOf(document.elementFromPoint(e.clientX, e.clientY)) : null;
  if (to !== null) d.api.apply({type: 'arrow', from: d.from, card: d.card, to});
}
function wire(root, p, api) {
  const svg = root.querySelector('svg.cm-machine.edit');
  const keyTarget = () => {
    const q = p.parameters, b = api.attempt().board;
    if (q.mode === 'playground') return {type: 'key', target: 'bench'};
    if (q.mode === 'split') { const s = selection(p, b); return {type: 'key', target: 'end', index: s[1]}; }
    if (q.mode === 'fewest' && proving(q, b)) { const s = selection(p, b); return {type: 'key', target: s[0] === 'row' ? 'row' : 'end', index: s[1]}; }
    return null;
  };
  root.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape' && ui(p).arm) { e.preventDefault(); api.ui({arm: null}); return; }
    if (e.target.closest('input,select,textarea,svg')) return;
    const card = /^[rR]$/.test(e.key) ? 'R' : /^[bB]$/.test(e.key) ? 'B' : e.key === 'Backspace' ? 'back' : null;
    const target = card && keyTarget();
    if (!target) return;
    e.preventDefault();
    api.apply({...target, card});
  });
  if (!svg) return;
  if (!listening) { document.addEventListener('pointermove', dragMove); document.addEventListener('pointerup', dragEnd); document.addEventListener('pointercancel', dragEnd); listening = true; }
  const tapCircle = i => {
    const arm = ui(p).arm;
    if (arm) api.apply({type: 'arrow', from: arm.from, card: arm.card, to: i});
    else api.apply({type: 'mark', circle: i});
  };
  const tapChip = c => { const arm = ui(p).arm; api.ui({arm: arm && arm.from === c.from && arm.card === c.card ? null : c}); };
  svg.addEventListener('click', e => {
    if (dragged) return;
    const c = chipOf(e.target);
    if (c) { tapChip(c); return; }
    const i = circleOf(e.target);
    if (i !== null) tapCircle(i);
  });
  svg.addEventListener('keydown', e => {
    if (!['Enter', ' '].includes(e.key)) return;
    const c = chipOf(e.target), i = circleOf(e.target);
    if (!c && i === null) return;
    e.preventDefault();
    if (c) tapChip(c); else tapCircle(i);
  });
  svg.addEventListener('pointerdown', e => {
    const c = chipOf(e.target);
    if (!c || e.button > 0) return;
    drag = {...c, svg, api, pointer: e.pointerId, x: e.clientX, y: e.clientY, moved: false, line: null, over: null};
  });
}

export const cardMechanics = {
  cardmachine: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      const s = ui(p);
      if ('arm' in payload) s.arm = object(payload.arm) && Number.isInteger(payload.arm.from) && CARDS.includes(payload.arm.card) ? {from: payload.arm.from, card: payload.arm.card} : null;
      if (typeof payload.pick === 'string') s.pick = payload.pick;
      if (Array.isArray(payload.sel) && ['row', 'pair'].includes(payload.sel[0]) && Number.isInteger(payload.sel[1])) s.sel = [payload.sel[0], payload.sel[1]];
    },
    reset: p => { uiState.delete(p.id); },
    // Undo keeps the rows Test has shown and the count of presses.
    carry(p, from, to) {
      if (!object(from) || !object(to) || !Array.isArray(from.tests) || !Array.isArray(to.tests)) return to;
      return {...to, tests: [...from.tests], presses: Math.max(from.presses, to.presses)};
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'cardmachines',
  family: {id: 'cardmachines', symbol: '◎'},
  mechanics: cardMechanics,
  pack: new URL('./cardmachines.json', import.meta.url).href,
  css: new URL('./cardmachines.css', import.meta.url).href,
  focus: '.cm-key:not([disabled]),.cm-button:not([disabled]),[data-chip],[data-circle],.cm-end,.cm-row'
};
