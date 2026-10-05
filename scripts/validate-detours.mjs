// Checks the Road detours pack (dist/families/detours/detours.json): content
// fields and sources; every shortening against a stack of road steps and
// against every order of cancelling; every find-every answer and every count
// in the notes against a plain enumeration of walks; witnesses and hint chains
// from fresh and messy boards; illegal moves; forged saves.
// Run: node scripts/validate-detours.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// Walks and their reduced forms, written separately from the mechanic: a trip
// becomes a list of signed road steps (+i along road i as written, −i back),
// and a stack cancels a step against the one before it when they are inverse.
const roadSteps = (q, trip) => trip.slice(1).map((v, k) => {
  const u = trip[k], i = q.roads.findIndex(([a, b]) => (a === u && b === v) || (a === v && b === u));
  assert.ok(i >= 0, `${u}${v} is a road`);
  return q.roads[i][0] === u ? i + 1 : -(i + 1);
});
function stackReduce(q, trip) {
  const stack = [];
  for (const s of roadSteps(q, trip)) { if (stack.length && stack.at(-1) === -s) stack.pop(); else stack.push(s); }
  // Back to dots: follow the kept steps from the start.
  const out = [trip[0]];
  for (const s of stack) { const [a, b] = q.roads[Math.abs(s) - 1]; out.push(s > 0 ? b : a); }
  return out;
}
// Every result of every order of cancelling, by breadth-first search.
function everyOrder(trip) {
  const seen = new Set([trip.join('')]), queue = [trip], ends = new Set();
  for (let k = 0; k < queue.length; k++) {
    const t = queue[k];
    let any = false;
    for (let i = 1; i < t.length - 1; i++) if (t[i - 1] === t[i + 1]) {
      any = true;
      const next = [...t.slice(0, i), ...t.slice(i + 2)], key = next.join('');
      if (!seen.has(key)) { seen.add(key); queue.push(next); }
    }
    if (!any) ends.add(t.join(''));
  }
  return [...ends];
}
const nextTo = (q, id) => q.roads.flatMap(([a, b]) => a === id ? [b] : b === id ? [a] : []);
// Every walk from q.start of q.min to q.max steps ending at q.finish that
// meets the puzzle's road rules, with no pruning beyond the step limit.
function walks(q) {
  const out = [];
  const ok = trip => {
    const use = q.roads.map(() => [0, 0]);
    for (const s of roadSteps(q, trip)) use[Math.abs(s) - 1][s > 0 ? 0 : 1]++;
    if (q.everyRoad && use.some(([a, b]) => a + b === 0)) return false;
    if ((q.eachWay || []).some(i => use[i][0] !== 1 || use[i][1] !== 1)) return false;
    if (q.groups && q.groups.some(group => group.every(i => use[i][0] + use[i][1] === 0))) return false;
    return true;
  };
  (function go(trip) {
    const n = trip.length - 1;
    if (n >= q.min && trip.at(-1) === q.finish && ok(trip)) out.push(trip);
    if (n < q.max) for (const v of nextTo(q, trip.at(-1))) go([...trip, v]);
  })([q.start]);
  return out;
}
const want = (q, trip, r) => q.result === 'empty' ? r.length === 1 : q.result === 'kept' ? r.join('') === trip.join('') : Array.isArray(q.result) ? r.join('') === q.result.join('') : true;
// The counts stated in the puzzles' notes.
const NOTES = {
  'detours-03': {trips: 48, kept: 48},
  'detours-04': {trips: 21, answers: 1},
  'detours-05': {trips: 128, kept: 28},
  'detours-06': {answers: 5},
  'detours-07': {trips: 27624, kept: 104},
  'detours-08': {answers: 4},
  'detours-09': {trips: 36, kept: 4},
  'detours-10': {trips: 216, kept: 8}
};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 400; steps++) {
    const h = nextHint(p, a);
    if (h.type === 'deadend') { assert.ok(a.history.length, `${p.id} ${label}: a dead end can be undone`); a = undo(a); continue; }
    assert.equal(h.type, 'move', `${p.id} ${label}: ${h.text}`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
const walk = (p, a, dots) => [...dots].reduce((b, to) => play(p, b, {type: 'step', to}), a);
// Cancel the last turning point each time, the opposite of the hints' choice.
const cancelLast = (p, a) => {
  for (;;) {
    const t = a.board.trip, at = [...t.keys()].filter(k => k > 0 && k < t.length - 1 && t[k - 1] === t[k + 1]).at(-1);
    if (at === undefined) return a;
    a = play(p, a, {type: 'cancel', at});
  }
};

export async function validateDetours() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/detours/detours.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'detours');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  let steps = 0, orders = 0, walked = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'detours');
    assert.ok(p.id.startsWith('detours-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 10, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    if (q.mode === 'playground') {
      for (const [id, m] of Object.entries(q.maps)) {
        let a = id === fresh.board.map ? fresh : play(p, fresh, {type: 'map', map: id});
        const there = nextTo(m, m.start)[0];
        a = walk(p, a, [there, m.start, there]);
        a = play(p, a, {type: 'cancel', at: 1});
        assert.deepEqual(a.board.trip, [m.start, there], `${p.id}: ${id} walks and cancels in any order`);
      }
      assert.equal(move(p, fresh, {type: 'map', map: 'moon'}), null, `${p.id}: unknown map`);
      continue;
    }
    // Map shape: no road joins a dot to itself, none is doubled, every dot is reached.
    const keys = q.roads.map(([a, b]) => [a, b].sort().join());
    assert.equal(new Set(keys).size, keys.length, `${p.id}: no doubled road`);
    assert.ok(q.roads.every(([a, b]) => a !== b && Object.hasOwn(q.nodes, a) && Object.hasOwn(q.nodes, b)), `${p.id}: roads join two dots`);
    if (q.mode === 'shorten') {
      const ends = everyOrder(q.trip);
      orders += ends.length;
      assert.equal(ends.length, 1, `${p.id}: every order of cancelling ends the same`);
      assert.equal(ends[0], stackReduce(q, q.trip).join(''), `${p.id}: the stack agrees`);
      const a1 = hintsSolve(p, fresh, 'from fresh'), a2 = cancelLast(p, fresh);
      steps += a1;
      assert.ok(isSolved(p, a2.board), `${p.id}: cancelling the last turning point each time also solves`);
      assert.equal(a2.board.trip.join(''), ends[0]);
      assert.equal(validBoard(p, {trip: [...stackReduce(q, q.trip)].reverse()}), false, `${p.id}: a trip that can’t be reached`);
      assert.equal(move(p, fresh, {type: 'cancel', at: 0}), null, `${p.id}: the start is not a turning point`);
      assert.equal(move(p, fresh, {type: 'step', to: q.trip[1]}), null, `${p.id}: no walking`);
      continue;
    }
    const list = walks(q), good = list.filter(t => want(q, t, stackReduce(q, t)));
    walked += list.length;
    const resultKeys = [...new Set(list.map(t => stackReduce(q, t).join('')))];
    const notes = NOTES[p.id] || {};
    if (notes.trips !== undefined) assert.equal(list.length, notes.trips, `${p.id}: trips that fit`);
    if (notes.kept !== undefined) assert.equal(good.length, notes.kept, `${p.id}: trips that work`);
    if (q.mode === 'every') {
      assert.equal(resultKeys.length, q.answers, `${p.id}: answers`);
      if (notes.answers !== undefined) assert.equal(q.answers, notes.answers, `${p.id}: answers in the notes`);
    }
    assert.ok(good.length > 0, `${p.id}: possible`);
    // A witness played as moves: walk, press Shorten, cancel from the back.
    if (q.mode === 'make') {
      const w = good[good.length - 1];
      let a = play(p, walk(p, fresh, w.slice(1)), {type: 'shorten'});
      a = cancelLast(p, a);
      assert.ok(isSolved(p, a.board), `${p.id}: a witness solves`);
      // A trip that fits but fails, when there is one, is told so.
      const bad = list.find(t => !want(q, t, stackReduce(q, t)));
      if (bad) {
        let b = play(p, walk(p, fresh, bad.slice(1)), {type: 'shorten'});
        if (q.result === 'kept') assert.equal(b.board.told.kind, 'pair', `${p.id}: a turning point is shown`);
        else { b = cancelLast(p, b); assert.equal(b.board.told.kind, 'miss', `${p.id}: a miss is told`); steps += hintsSolve(p, b, 'after a miss'); }
      }
    } else {
      // Collect every answer through moves, with one repeat and one early That's all.
      let a = fresh;
      const reps = resultKeys.map(key => list.find(t => stackReduce(q, t).join('') === key));
      for (const [k, t] of reps.entries()) {
        a = cancelLast(p, play(p, walk(p, a, t.slice(1)), {type: 'shorten'}));
        assert.equal(a.board.found.length, k + 1, `${p.id}: a new route joins the row`);
        if (k === 0) {
          a = cancelLast(p, play(p, walk(p, play(p, a, {type: 'new'}), t.slice(1)), {type: 'shorten'}));
          assert.equal(a.board.told.kind, 'again', `${p.id}: found already`);
          if (q.answers > 1) assert.equal(play(p, a, {type: 'all'}).board.told.kind, 'more', `${p.id}: there is another`);
        }
        a = k < reps.length - 1 ? play(p, a, {type: 'new'}) : a;
      }
      a = play(p, a, {type: 'all'});
      assert.ok(isSolved(p, a.board), `${p.id}: every route found`);
      assert.equal(validBoard(p, {...fresh.board, found: [[q.start, q.finish]]}), false, `${p.id}: a forged route`);
      assert.equal(validBoard(p, {...fresh.board, done: true}), false, `${p.id}: a forged That’s all`);
    }
    steps += hintsSolve(p, fresh, 'from fresh');
    // A messy start: wander toward the far end of the step limit first.
    let messy = fresh;
    for (let k = 0; k < q.max; k++) {
      const options = nextTo(q, messy.board.trip.at(-1)), next = move(p, messy, {type: 'step', to: options[k % options.length]});
      if (!next) break;
      messy = next;
    }
    steps += hintsSolve(p, messy, 'from a messy board');
    // Illegal moves and forged saves.
    for (const bad of [null, 'step', {type: 'step'}, {type: 'step', to: 'Z'}, {type: 'step', to: q.start}, {type: 'cancel', at: 0}, {type: 'shorten'}, {type: 'new'}, {type: 'fly'}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    const far = Object.keys(q.nodes).find(id => id !== q.start && !nextTo(q, q.start).includes(id));
    if (far) assert.equal(validBoard(p, {...fresh.board, trip: [q.start, far]}), false, `${p.id}: a step off the roads`);
    const w = good[0];
    assert.equal(validBoard(p, {...fresh.board, trip: [q.start], input: w}), stackReduce(q, w).length === 1, `${p.id}: only a trip that vanishes can be shortened to staying put`);
    if (q.mode === 'make') assert.equal(validBoard(p, {...fresh.board, told: {kind: 'miss'}}), false, `${p.id}: a forged answer`);
  }
  return {detoursPuzzles: puzzles.length, cancellingOrders: orders, walksChecked: walked, hintSteps: steps};
}
export default validateDetours;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateDetours(), null, 2));
