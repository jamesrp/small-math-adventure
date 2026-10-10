// Checks the Lamplighter pack (dist/families/lamplighter/lamplighter.json):
// content fields and sources; every puzzle's budget by a different method
// from the mechanic's breadth-first search (one flip for each lantern that
// differs, plus the shortest walk through those lanterns found by trying
// every order, with distances by formula: |a − b| on the street, the shorter
// way round on the ring, Manhattan on the grid), by the street formula, and
// by a separate search on a separate simulator; the witness word; the
// theorems the notes rely on (the street formula and the dead ends for every
// state with lanterns in −3 … 3, and flips plus walk between every pair of
// states on a small street, ring and grid); that hints alone finish every
// puzzle from fresh, after a wasted move and from a spent budget; illegal
// taps; and forged saves.
// Run: node scripts/validate-lamplighter.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoToSolvable} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {fewest as searched} from '../dist/families/lamplighter/lamplighter.js';
import {loadPack} from './packs.mjs';

const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
// The simulator. A board is a list of lantern names (numbers on a street or
// ring, "r,c" on a grid) with a function giving the lantern a letter walks
// to; a state is a name and a sorted list of lit names.
function boardFor(q) {
  if (q.geometry === 'street') return {names: range(q.min, q.max), go: (p, c) => ({L: p - 1, R: p + 1})[c], has: p => p >= q.min && p <= q.max, dist: (a, b) => Math.abs(a - b), letters: 'LRF'};
  if (q.geometry === 'ring') return {names: range(0, q.size - 1), go: (p, c) => ({L: (p + q.size - 1) % q.size, R: (p + 1) % q.size})[c], has: () => true, dist: (a, b) => Math.min(Math.abs(a - b), q.size - Math.abs(a - b)), letters: 'LRF'};
  const name = (r, c) => `${r},${c}`, names = range(0, q.rows - 1).flatMap(r => range(0, q.cols - 1).map(c => name(r, c)));
  const at = new Map(names.map(p => [p, p.split(',').map(Number)])), step = {U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1]};
  return {
    names,
    go: (p, c) => { const [r, k] = at.get(p), d = step[c]; return name(r + d[0], k + d[1]); },
    has: p => at.has(p),
    dist: (a, b) => { const x = at.get(a), y = at.get(b); return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]); },
    letters: 'UDLRF'
  };
}
const nameOf = (q, pos) => q.geometry === 'grid' ? pos.join(',') : pos;
const stateOf = (q, s) => ({p: nameOf(q, s.at), lit: s.lit.map(x => nameOf(q, x)).sort()});
const differ = (from, to) => [...from.lit.filter(x => !to.lit.includes(x)), ...to.lit.filter(x => !from.lit.includes(x))];
// Lit lists are kept in one order (the default sort), so a key is a join.
const key = s => `${s.p}|${s.lit.join(' ')}`;
function stepOn(B, s, c) {
  if (c === 'F') { const lit = s.lit.includes(s.p) ? s.lit.filter(x => x !== s.p) : [...s.lit, s.p].sort(); return {p: s.p, lit}; }
  const p = B.go(s.p, c);
  return p !== undefined && B.has(p) ? {p, lit: s.lit} : null;
}
const play = (B, s, word) => [...word].reduce((t, c) => t && stepOn(B, t, c), s);
// Breadth-first distances from one state over the whole board, with a state
// coded as (lantern number) · 2^n + (lit lanterns as bits) for speed.
function search(B, from) {
  const n = B.names.length, size = 2 ** n, at = new Map(B.names.map((x, i) => [x, i]));
  const walks = B.letters.replace('F', '').split('').map(c => B.names.map(x => { const y = B.go(x, c); return y !== undefined && B.has(y) ? at.get(y) : -1; }));
  const code = s => at.get(s.p) * size + s.lit.reduce((m, x) => m | 1 << at.get(x), 0);
  const dist = new Int16Array(n * size).fill(-1), queue = new Int32Array(n * size);
  let tail = 0;
  dist[queue[tail++] = code(from)] = 0;
  for (let head = 0; head < tail; head++) {
    const c = queue[head], i = Math.floor(c / size), m = c % size, next = [i * size + (m ^ 1 << i), ...walks.map(w => w[i] < 0 ? -1 : w[i] * size + m)];
    for (const t of next) if (t >= 0 && dist[t] < 0) { dist[t] = dist[c] + 1; queue[tail++] = t; }
  }
  return {get: s => dist[code(s)]};
}
// Flips plus the shortest walk from p through every lantern of D to q,
// trying every order of D (a depth-first search over orders, cut off when a
// partial walk is already too long).
function flipsAndWalk(B, from, to) {
  const D = differ(from, to);
  let walk = Infinity;
  const extend = (at, used, sum) => {
    if (sum >= walk) return;
    if (used === (1 << D.length) - 1) { walk = Math.min(walk, sum + B.dist(at, to.p)); return; }
    for (let i = 0; i < D.length; i++) if (!(used >> i & 1)) extend(D[i], used | 1 << i, sum + B.dist(at, D[i]));
  };
  extend(from.p, 0, 0);
  return D.length + walk;
}
// The street formula, with a and b the ends of D.
function streetFormula(from, to) {
  const D = differ(from, to), p = from.p, q = to.p;
  if (!D.length) return Math.abs(p - q);
  const a = Math.min(...D), b = Math.max(...D);
  return D.length + Math.min(Math.abs(p - a) + (b - a) + Math.abs(b - q), Math.abs(p - b) + (b - a) + Math.abs(a - q));
}
const allStates = B => B.names.flatMap(p => range(0, 2 ** B.names.length - 1).map(m => ({p, lit: B.names.filter((_, i) => m >> i & 1).sort()})));

// The theorems, over every small case.
function theorems() {
  let checked = 0;
  // The street from the dark street, home at 0: lanterns −6 … 6 so that no
  // state with lanterns in −3 … 3 meets the end of the board.
  const wide = boardFor({geometry: 'street', min: -6, max: 6}), dark = {p: 0, lit: []}, dist = search(wide, dark);
  let deadEnds = 0;
  for (const p of range(-3, 3)) for (let m = 0; m < 128; m++) {
    const s = {p, lit: range(-3, 3).filter((_, i) => m >> i & 1).sort()}, d = dist.get(s);
    assert.equal(d, streetFormula(dark, s), `the street formula for ${key(s)}`);
    const near = wide.letters.split('').map(c => dist.get(stepOn(wide, s, c)));
    assert.ok(near.every(x => Math.abs(x - d) === 1), 'every move changes the distance by one');
    const dead = near.every(x => x < d), home = p === 0 && s.lit.includes(0) && s.lit.some(x => x < 0) && s.lit.some(x => x > 0);
    assert.equal(dead, home, `${key(s)}: a dead end exactly when home, home lit and lit on both sides`);
    if (dead) deadEnds++;
    checked++;
  }
  assert.equal(deadEnds, 49, 'dead ends with lanterns in −3 … 3: 7 × 7 choices of the two sides');
  assert.equal(dist.get({p: 0, lit: [-1, 0, 1]}), 7);
  // Between every pair of states: one flip for each lantern that differs plus
  // the shortest walk through them, on a street of 5, a ring of 6 and a 2 × 3
  // grid; and the street formula on the street.
  for (const q of [{geometry: 'street', min: -2, max: 2}, {geometry: 'ring', size: 6}, {geometry: 'grid', rows: 2, cols: 3}]) {
    const B = boardFor(q), states = allStates(B);
    for (const from of states) {
      const d = search(B, from);
      for (const to of states) {
        const found = d.get(to);
        if (found !== flipsAndWalk(B, from, to) || q.geometry === 'street' && found !== streetFormula(from, to)) assert.fail(`${q.geometry}: ${key(from)} to ${key(to)} takes ${found}`);
        checked++;
      }
    }
  }
  return {checked, deadEnds};
}

const hintRun = (p, a, label, limit = 40) => {
  let steps = 0;
  for (; steps < limit && !isSolved(p, a.board); steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${label}: hints keep naming a move (${h.text})`);
    assert.match(h.text, /^(Walk (left|right|up|down|clockwise|anticlockwise)|Light this lantern|Put out this lantern)\.$/, `${label}: hint text in words`);
    a = move(p, a, h.action);
    assert.ok(a, `${label}: the hinted move ${JSON.stringify(h.action)} is legal`);
  }
  assert.ok(isSolved(p, a.board), `${label}: hints finish the puzzle`);
  assert.equal(nextHint(p, a).type, 'done');
  return steps;
};
// The lantern index a tap uses: lanterns in board order.
const indexOf = (q, B, name) => B.names.indexOf(name);
const tapsFor = (q, B, s, word) => { const taps = []; for (const c of word) { s = stepOn(B, s, c); taps.push({lantern: indexOf(q, B, s.p)}); } return taps; };

export default async function validateLamplighter() {
  const own = JSON.parse(await readFile(new URL('../dist/families/lamplighter/lamplighter.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  const {puzzles} = own;
  assert.equal(puzzles.length, 12);
  assert.deepEqual(puzzles.map(p => p.number), range(1, 12));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const s of own.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(own.families.length, 1);
  assert.equal(own.families[0].id, 'lamplighter');
  assert.ok(own.families[0].sourceIds.every(id => ids.has(id)));
  assert.ok(pack.puzzles.some(p => p.mechanic === 'toggle' && p.familyTitle === 'Lantern Wires'), 'Lantern Wires is in the base pack');
  let hintSteps = 0, refusals = 0, forgeries = 0;
  for (const p of puzzles) {
    const q = p.parameters, label = p.id, B = boardFor(q);
    assert.equal(p.id, `lamplighter-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'lamplighter'); assert.equal(p.band, 'all'); assert.equal(p.group, 'Lamplighter');
    assert.equal(p.libraryFamily, 'toggle'); assert.equal(p.familyTitle, 'Lantern Wires');
    assert.equal(p.visibleObjective, '', `${label}: the goal card says it all`);
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.ok(p.rules.length >= 3, `${label}: rules`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.includes('lamplighter-week66') && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.match(p.provenance, /^(Week 66|New for the app)/, `${label}: provenance names the worksheet problem or says New`);
    assert.ok(isExpansion(p));
    assert.ok([q.start.at, q.goal.at, ...q.start.lit, ...q.goal.lit].every(x => B.has(nameOf(q, x))), `${label}: positions on the board`);

    // The budget: flips plus every order of the walk, the street formula, a
    // separate search, and the mechanic's own search all agree.
    const from = stateOf(q, q.start), to = stateOf(q, q.goal);
    const byOrders = flipsAndWalk(B, from, to), bySearch = search(B, from).get(to);
    assert.equal(q.budget, byOrders, `${label}: budget = flips + shortest walk`);
    assert.equal(q.budget, bySearch, `${label}: budget = separate search`);
    assert.equal(q.budget, searched(q), `${label}: budget = the mechanic's search`);
    if (q.geometry === 'street') assert.equal(q.budget, streetFormula(from, to), `${label}: the street formula`);
    assert.equal(p.solution.fewest, q.budget);
    assert.equal(p.solution.word.length, q.budget);
    assert.equal(key(play(B, from, p.solution.word)), key(to), `${label}: the witness reaches the goal`);
    assert.equal(p.solution.flips, differ(from, to).length, `${label}: one flip per lantern that differs`);
    assert.equal([...p.solution.word].filter(c => c === 'F').length, p.solution.flips);

    const fresh = freshAttempt(p);
    assert.deepEqual(fresh.board, {word: ''});
    assert.ok(validBoard(p, fresh.board), `${label}: fresh board is valid`);
    assert.ok(!isSolved(p, fresh.board), `${label}: not solved at the start`);
    const html = mechanicFor(p).render(p, fresh);
    assert.equal((html.match(/<button type="button" class="ll-lamp[ "]/g) || []).length, B.names.length, `${label}: a button for every lantern`);
    assert.equal((html.match(/class="ll-slot"/g) || []).length, q.budget, `${label}: an outline for every move`);

    // The witness, tapped.
    let a = fresh;
    for (const tap of tapsFor(q, B, from, p.solution.word)) { assert.ok(!isSolved(p, a.board)); a = move(p, a, tap); assert.ok(a, `${label}: witness tap ${JSON.stringify(tap)}`); }
    assert.ok(isSolved(p, a.board), `${label}: the witness solves`);
    assert.equal(a.board.word, p.solution.word);
    for (let k = 0; k < B.names.length; k++) assert.equal(move(p, a, {lantern: k}), null, `${label}: nothing after a solve`);

    // Hints alone from fresh; after a wasted move (the hint says Undo, Undo
    // finds a solvable board, hints finish); from a spent budget.
    hintSteps += hintRun(p, fresh, label);
    // The first wasteful move along the witness: one after which the moves
    // left are fewer than flips plus walk.
    let wasted = null;
    for (let i = 0; i < q.budget && !wasted; i++) {
      const s = play(B, from, p.solution.word.slice(0, i)), c = B.letters.split('').find(x => { const t = stepOn(B, s, x); return t && flipsAndWalk(B, t, to) > q.budget - i - 1; });
      if (c) wasted = [...tapsFor(q, B, from, p.solution.word.slice(0, i)), {lantern: indexOf(q, B, stepOn(B, s, c).p)}].reduce((x, tap) => move(p, x, tap), fresh);
    }
    assert.ok(wasted && !isSolved(p, wasted.board), `${label}: a wasted move`);
    assert.deepEqual(nextHint(p, wasted), {type: 'deadend', text: 'Too few moves are left. Undo.'}, `${label}: a wasted move means Undo`);
    hintSteps += hintRun(p, undoToSolvable(p, wasted), `${label} after Undo`);
    let spent = wasted;
    while (spent.board.word.length < q.budget) {
      const s = play(B, from, spent.board.word), c = B.letters.split('').find(x => stepOn(B, s, x) && key(stepOn(B, s, x)) !== key(to));
      spent = move(p, spent, {lantern: indexOf(q, B, stepOn(B, s, c).p)});
    }
    assert.ok(!isSolved(p, spent.board));
    assert.equal(nextHint(p, spent).type, 'deadend', `${label}: a spent budget says Undo`);
    for (let k = 0; k < B.names.length; k++) assert.equal(move(p, spent, {lantern: k}), null, `${label}: no move past the budget`);
    hintSteps += hintRun(p, undoToSolvable(p, spent), `${label} after Undo from a spent budget`);

    // Illegal taps: two places away, off the board, round the end of a
    // street, malformed.
    const here = indexOf(q, B, from.p), n = B.names.length;
    for (let k = 0; k < n; k++) {
      const legal = k === here || B.letters.split('').some(c => c !== 'F' && stepOn(B, from, c)?.p === B.names[k]);
      assert.equal(Boolean(move(p, fresh, {lantern: k})), legal, `${label}: tap ${k} is ${legal ? 'legal' : 'refused'}`);
      if (!legal) refusals++;
    }
    for (const action of [{lantern: -1}, {lantern: n}, {lantern: '0'}, {lantern: here + .5}, {lantern: null}, {step: 'L'}, {}, null, 'L', 3]) {
      assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
      refusals++;
    }
    if (q.geometry === 'street') {
      const end = {word: 'L'.repeat(from.p - q.min)};
      if (end.word.length <= q.budget) assert.equal(move(p, {...fresh, board: end}, {lantern: n - 1}), null, `${label}: no walking round the end of a street`);
    }

    // Forged saves.
    const offBoard = q.geometry === 'street' ? 'L'.repeat(from.p - q.min + 1) : q.geometry === 'grid' ? 'UUUU' : null;
    const forged = [
      {word: 'X'}, {word: 'f'}, {word: q.geometry === 'grid' ? 'Q' : 'U'}, {word: 7}, {word: ['L']}, {}, {word: '', extra: 1}, null, 'LF',
      {word: 'F'.repeat(q.budget + 1)}, {word: p.solution.word + 'F'},
      ...(offBoard && offBoard.length <= q.budget ? [{word: offBoard}] : [])
    ];
    for (const f of forged) {
      assert.equal(validBoard(p, f), false, `${label}: rejects a forged save ${JSON.stringify(f)}`);
      forgeries++;
    }
    assert.ok(validBoard(p, {word: 'F'.repeat(q.budget)}), `${label}: any legal word within the budget is a valid save`);
  }
  return {puzzles: puzzles.length, ...theorems(), hintSteps, refusals, forgeries};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateLamplighter(), null, 2));
