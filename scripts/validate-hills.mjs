// Checks the Gentle hills pack (dist/families/hills/hills.json): content
// fields and sources; every puzzle's answer against separate searches (every
// height vector listed for the fill and every-landscape puzzles, a count of
// landscapes by dynamic programming for every set of pins); the theorems the
// notes rely on, over every small case (clues fit exactly when no two are too
// far apart; the lowest and highest landscapes are the pointwise envelopes;
// every height between them occurs; the fewest pins are the ends and the
// turning towers, and every pinning that works contains them); that hints
// alone finish every puzzle; illegal moves; forged saves; and the playground.
// Run: node scripts/validate-hills.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import * as hills from '../dist/families/hills/hills.js';
import {loadPack} from './packs.mjs';

const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const dist = (q, i, j) => { const d = Math.abs(i - j); return q.ring ? Math.min(d, q.sites - d) : d; };
const gentle = (q, h) => h.every((v, i) => i === 0 || Math.abs(v - h[i - 1]) <= 1) && (!q.ring || q.sites < 3 || Math.abs(h[0] - h[q.sites - 1]) <= 1);
// Every landscape of n towers with heights 0..top, by listing every vector.
const lists = new Map();
function allVectors(q) {
  const k = `${q.sites},${q.ring},${q.top}`;
  if (lists.has(k)) return lists.get(k);
  const out = [];
  for (let m = 0; m < (q.top + 1) ** q.sites; m++) {
    const h = Array.from({length: q.sites}, (_, i) => Math.floor(m / (q.top + 1) ** (q.sites - 1 - i)) % (q.top + 1));
    if (gentle(q, h)) out.push(h);
  }
  lists.set(k, out);
  return out;
}
const fits = (h, clues) => clues.every(([c, a]) => h[c] === a);
// The number of landscapes that keep the pinned heights, by dynamic
// programming over the towers (on a ring, once for each first height).
function countWith(q, h, pins) {
  const allowed = i => pins.includes(i) ? [h[i]] : range(0, q.top);
  const firsts = q.ring ? allowed(0) : [null];
  let total = 0;
  for (const f of firsts) {
    let ways = new Map(allowed(0).filter(v => f === null || v === f).map(v => [v, 1]));
    for (let i = 1; i < q.sites; i++) {
      const next = new Map();
      for (const v of allowed(i)) for (const [u, w] of ways) if (Math.abs(u - v) <= 1) next.set(v, (next.get(v) || 0) + w);
      ways = next;
    }
    for (const [v, w] of ways) if (!q.ring || q.sites < 3 || Math.abs(v - f) <= 1) total += w;
  }
  return total;
}
const subsets = n => Array.from({length: 2 ** n}, (_, m) => range(0, n - 1).filter(i => (m >> i) & 1));
const turning = (q, h) => range(0, q.sites - 1).filter(i => {
  if (!q.ring && (i === 0 || i === q.sites - 1)) return true;
  const a = h[(i + q.sites - 1) % q.sites], b = h[(i + 1) % q.sites];
  return !((a < h[i] && h[i] < b) || (a > h[i] && h[i] > b));
});

// The theorems, over every small case: rows and rings of 2 to 5 towers with
// heights up to 3, every set of clues, and for pinning every landscape of up
// to 6 towers with heights up to 3 and every set of pins.
function theorems() {
  let checked = 0;
  for (const ring of [false, true]) for (let n = ring ? 3 : 2; n <= 5; n++) for (let top = 1; top <= 3; top++) {
    const q0 = {sites: n, ring, top}, land = allVectors(q0);
    for (const sites of subsets(n)) {
      for (let m = 0; m < (top + 1) ** sites.length; m++) {
        const clues = sites.map((s, k) => [s, Math.floor(m / (top + 1) ** k) % (top + 1)]);
        const q = {...q0, clues}, found = land.filter(h => fits(h, clues));
        const ok = clues.every(([c, a]) => clues.every(([d, b]) => Math.abs(a - b) <= dist(q, c, d)));
        assert.equal(found.length > 0, ok, `clues fit exactly when no two are too far apart: ${JSON.stringify(q)}`);
        assert.equal(hills.conflicts(q).length === 0, ok);
        assert.equal(hills.completions(q).length, found.length, 'the module lists every landscape');
        if (!found.length) { checked++; continue; }
        const lo = range(0, n - 1).map(i => Math.max(0, ...clues.map(([c, a]) => a - dist(q, i, c))));
        const hi = range(0, n - 1).map(i => Math.min(top, ...clues.map(([c, a]) => a + dist(q, i, c))));
        for (let i = 0; i < n; i++) {
          const heights = new Set(found.map(h => h[i]));
          assert.equal(Math.min(...heights), lo[i], 'the lowest landscape is the lower envelope');
          assert.equal(Math.max(...heights), hi[i], 'the highest landscape is the upper envelope');
          assert.equal(heights.size, hi[i] - lo[i] + 1, 'every height between occurs');
        }
        assert.ok(found.some(h => h.every((v, i) => v === lo[i])) && found.some(h => h.every((v, i) => v === hi[i])), 'both envelopes are landscapes');
        assert.deepEqual(hills.lowest(q), lo); assert.deepEqual(hills.highest(q), hi);
        checked++;
      }
    }
  }
  for (const ring of [false, true]) for (let n = ring ? 3 : 2; n <= 6; n++) for (let top = 1; top <= 3; top++) {
    const q0 = {sites: n, ring, top};
    for (const h of allVectors(q0)) {
      const q = {...q0, land: h, clues: []}, need = turning(q, h);
      const works = subsets(n).filter(pins => countWith(q, h, pins) === 1);
      assert.ok(works.some(p => p.length === need.length && p.every((s, k) => s === need[k])), `the turning towers fix ${h}`);
      assert.ok(works.every(p => need.every(s => p.includes(s))), `every pinning of ${h} contains the turning towers`);
      assert.deepEqual(hills.needed(q), need);
      for (const pins of subsets(n)) assert.equal(hills.fixed(q, pins), countWith(q, h, pins) === 1, `fixed ${h} by ${pins}`);
      checked++;
    }
  }
  return checked;
}

const hintRun = (p, a, label, limit = 80) => {
  let steps = 0;
  for (; steps < limit && !isSolved(p, a.board); steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${label}: hints keep naming a move`);
    assert.ok(h.text && !/undefined|NaN/.test(h.text), `${label}: hint text: ${h.text}`);
    a = move(p, a, h.action);
    assert.ok(a, `${label}: the hinted move ${JSON.stringify(h.action)} is legal`);
  }
  assert.ok(isSolved(p, a.board), `${label}: hints finish the puzzle`);
  assert.equal(nextHint(p, a).type, 'done');
  return steps;
};

export default async function validateHills() {
  const pack0 = JSON.parse(await readFile(new URL('../dist/families/hills/hills.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  const puzzles = pack0.puzzles.filter(p => p.band !== 'playground'), playground = pack0.puzzles.find(p => p.band === 'playground');
  assert.equal(puzzles.length, 12);
  assert.deepEqual(puzzles.map(p => p.number), range(1, 12));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const mode of hills.MODES) assert.ok(puzzles.some(p => p.parameters.mode === mode), `a ${mode} puzzle`);
  for (const s of pack0.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack0.families[0].id, 'hills');
  let hintSteps = 0, refusals = 0, forgeries = 0;
  for (const p of puzzles) {
    const q = p.parameters, label = p.id, n = q.sites;
    assert.equal(p.id, `hills-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'hills'); assert.equal(p.band, 'all'); assert.equal(p.familyTitle, 'Gentle hills');
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    assert.ok(Number.isInteger(n) && n >= 3 && n <= 9 && Number.isInteger(q.top) && q.top >= 1 && q.top <= 6);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${label}: fresh board is valid`);
    assert.ok(!isSolved(p, fresh.board), `${label}: not solved at the start`);
    assert.ok(mechanicFor(p).render(p, fresh).length > 100, `${label}: renders`);
    hintSteps += hintRun(p, fresh, label);

    if (q.mode === 'pin') {
      // The pins: the shown landscape is gentle; the authored pins fix it
      // (one landscape keeps them, counted separately); no smaller set does;
      // and the board accepts no pin past the budget.
      assert.ok(gentle(q, q.land) && q.land.every(v => v >= 0 && v <= q.top), `${label}: the landscape is gentle`);
      assert.deepEqual(q.clues, []);
      assert.equal(countWith(q, q.land, p.solution.pins), 1, `${label}: the pins fix the landscape`);
      const works = subsets(n).filter(pins => countWith(q, q.land, pins) === 1), fewest = Math.min(...works.map(s => s.length));
      assert.equal(fewest, p.solution.fewest, `${label}: the fewest pins`);
      assert.equal(works.filter(s => s.length === fewest).length, 1, `${label}: one smallest pinning`);
      let a = fresh;
      for (const s of p.solution.pins) { assert.ok(!isSolved(p, a.board)); a = move(p, a, {type: 'pin', site: s}); }
      assert.ok(isSolved(p, a.board), `${label}: the pins solve`);
      // Wrong pins fill the budget: no more pins, and a second landscape shows.
      const wrong = range(0, n - 1).filter(s => !p.solution.pins.includes(s)).slice(0, p.solution.fewest);
      if (wrong.length === p.solution.fewest) {
        let w = fresh;
        for (const s of wrong) w = move(p, w, {type: 'pin', site: s});
        assert.ok(w && !isSolved(p, w.board));
        assert.equal(move(p, w, {type: 'pin', site: p.solution.pins.find(s => !wrong.includes(s))}), null, `${label}: no pin past the budget`);
        assert.match(mechanicFor(p).render(p, w), /hills-peek-marker/, `${label}: a second landscape shows`);
        hintSteps += hintRun(p, w, `${label} from wrong pins`);
      }
      for (const action of [{type: 'pin', site: n}, {type: 'pin', site: -1}, {type: 'pin', site: '0'}, {type: 'set', site: 0, h: 1}, {type: 'cant', pair: [0, 1]}, {type: 'done'}, null, 'pin']) assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
      for (const f of [{pins: [n]}, {pins: [1, 0]}, {pins: [0, 0]}, {pins: range(0, Math.min(n - 1, p.solution.fewest))}, {pins: [], h: []}, {}, {pins: 'all'}]) {
        assert.equal(validBoard(p, f), false, `${label}: rejects a forged save ${JSON.stringify(f)}`);
        forgeries++;
      }
      continue;
    }

    // Fill and every: the landscapes by listing every vector.
    const found = allVectors(q).filter(h => fits(h, q.clues)).map(h => h.join(','));
    assert.ok(q.clues.length >= 1 && q.clues.every(([c, a]) => Number.isInteger(c) && c >= 0 && c < n && Number.isInteger(a) && a >= 0 && a <= q.top));
    const tooFar = q.clues.flatMap(([c, a], k) => q.clues.slice(k + 1).filter(([d, b]) => Math.abs(a - b) > dist(q, c, d)).map(([d]) => [Math.min(c, d), Math.max(c, d)]));
    if (q.mode === 'every') {
      assert.deepEqual(p.solution.landscapes, [...found].sort(), `${label}: every landscape`);
      assert.equal(p.solution.count, found.length);
      // That's all too soon is refused; each landscape is recorded once.
      let a = move(p, fresh, {type: 'done'});
      assert.ok(a && a.board.said === 'wrong' && !isSolved(p, a.board), `${label}: That's all too soon`);
      for (const f of found) {
        const h = f.split(',').map(Number);
        for (let i = 0; i < n; i++) if (a.board.h[i] !== h[i]) a = move(p, a, {type: 'set', site: i, h: h[i]});
      }
      assert.deepEqual(a.board.found, [...found].sort(), `${label}: every landscape recorded`);
      a = move(p, a, {type: 'done'});
      assert.ok(isSolved(p, a.board), `${label}: That's all with every landscape`);
      hintSteps += hintRun(p, move(p, fresh, {type: 'done'}), `${label} after That's all too soon`);
      for (const f of [{...fresh.board, found: ['9,9']}, {...fresh.board, found: [found[0], found[0]]}, {...fresh.board, found: [...found].sort().reverse()}, {...fresh.board, said: 'done'}, {...fresh.board, said: 'yes'}, {...fresh.board, claimed: null}]) {
        assert.equal(validBoard(p, f), false, `${label}: rejects a forged save ${JSON.stringify(f).slice(0, 80)}`);
        forgeries++;
      }
    } else if (p.solution.apart) {
      // Clues that can never be joined: no vector fits, the pair is too far
      // apart, the claim on it solves, and claims on other pairs are refused.
      assert.equal(found.length, 0, `${label}: no landscape fits`);
      assert.ok(q.cant, `${label}: Can't is offered`);
      assert.deepEqual(p.solution.pairs, tooFar, `${label}: the pairs too far apart`);
      const a = move(p, fresh, {type: 'cant', pair: [...p.solution.apart].reverse()});
      assert.ok(a && isSolved(p, a.board), `${label}: the right claim solves`);
      assert.match(mechanicFor(p).render(p, a), /apart/);
    } else {
      // Clues that fit: a landscape is listed, building it solves.
      assert.ok(found.length >= 1, `${label}: some landscape fits`);
      assert.equal(p.solution.count, found.length);
      assert.ok(found.includes(p.solution.landscape.join(',')));
      let a = fresh;
      for (let i = 0; i < n; i++) if (a.board.h[i] !== p.solution.landscape[i]) a = move(p, a, {type: 'set', site: i, h: p.solution.landscape[i]});
      assert.ok(isSolved(p, a.board), `${label}: the witness solves`);
    }
    if (q.mode === 'fill' && q.cant) {
      const cluePairs = q.clues.flatMap(([c], k) => q.clues.slice(k + 1).map(([d]) => [Math.min(c, d), Math.max(c, d)]));
      for (const pair of cluePairs.filter(pr => !tooFar.some(t => t.join() === pr.join()))) {
        const r = move(p, fresh, {type: 'cant', pair});
        assert.ok(r && !isSolved(p, r.board) && r.board.refused.join() === pair.join(), `${label}: claim on ${pair} refused`);
        assert.match(mechanicFor(p).render(p, r), /Those two clues fit/);
        const free = range(0, n - 1).find(i => !q.clues.some(([c]) => c === i));
        assert.equal(move(p, r, {type: 'set', site: free, h: 0}).board.refused, null, `${label}: the refusal clears`);
        hintSteps += hintRun(p, r, `${label} after a refused claim`);
        refusals++;
      }
      const clue = q.clues[0][0], free = range(0, n - 1).find(i => !q.clues.some(([c]) => c === i));
      for (const pair of [[clue, clue], [clue, free], [clue], [clue, n]]) assert.equal(move(p, fresh, {type: 'cant', pair}), null, `${label}: rejects a claim on ${pair}`);
    } else if (q.mode === 'fill') assert.equal(move(p, fresh, {type: 'cant', pair: q.clues.slice(0, 2).map(([c]) => c)}), null, `${label}: no Can’t`);
    if (q.mode === 'fill') {
      const pair = q.clues.length > 1 ? [q.clues[0][0], q.clues[1][0]].sort((x, y) => x - y) : null;
      const forged = [{...fresh.board, h: fresh.board.h.slice(1)}, {...fresh.board, h: fresh.board.h.map((v, i) => i === q.clues[0][0] ? v + 1 : v)}, {...fresh.board, h: fresh.board.h.map(v => v ?? q.top + 1)}, {...fresh.board, extra: 1}, {h: fresh.board.h}];
      if (pair) forged.push(tooFar.some(t => t.join() === pair.join()) ? {...fresh.board, refused: pair} : {...fresh.board, claimed: pair}, {...fresh.board, claimed: [...pair].reverse()});
      for (const f of forged) {
        assert.equal(validBoard(p, f), false, `${label}: rejects a forged save ${JSON.stringify(f).slice(0, 80)}`);
        forgeries++;
      }
    }
    // Illegal moves: a clue tower, a height off the board, a missing height.
    const clue = q.clues[0][0], free = range(0, n - 1).find(i => !q.clues.some(([c]) => c === i));
    for (const action of [{type: 'set', site: clue, h: 0}, {type: 'set', site: free, h: q.top + 1}, {type: 'set', site: free, h: -1}, {type: 'set', site: free}, {type: 'set', site: n, h: 0}, {type: 'pin', site: free}, {type: 'shrug'}, null]) {
      assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
    }
  }

  // The playground: sizes, row or ring, heights, pins, Clear; never solved.
  assert.ok(playground);
  assert.equal(playground.mechanic, 'hills'); assert.equal(playground.parameters.mode, 'playground');
  let a = freshAttempt(playground);
  assert.ok(validBoard(playground, a.board));
  assert.equal(mechanicFor(playground).noHint(playground), true);
  a = move(playground, a, {type: 'set', site: 0, h: 0});
  a = move(playground, a, {type: 'set', site: 6, h: 6});
  a = move(playground, move(playground, a, {type: 'pin', site: 0}), {type: 'pin', site: 6});
  assert.deepEqual(a.board.pins, [0, 6]);
  assert.match(mechanicFor(playground).render(playground, a), /ghost/, 'pins show the heights the others allow');
  assert.equal(move(playground, a, {type: 'set', site: 0, h: 2}), null, 'a pinned tower keeps its height');
  assert.equal(move(playground, a, {type: 'pin', site: 3}), null, 'only a built tower can be pinned');
  assert.ok(!isSolved(playground, a.board));
  const ring = move(playground, a, {type: 'shape', ring: true});
  assert.match(mechanicFor(playground).render(playground, ring), /hills-col clue copy|hills-col copy/);
  assert.equal(move(playground, move(playground, a, {type: 'set', site: 3, h: 2}), {type: 'clear'}).board.h[3], null, 'Clear');
  assert.equal(move(playground, a, {type: 'size', sites: 9}).board.sites, 9);
  for (const f of [{...a.board, sites: 6}, {...a.board, pins: [1]}, {...a.board, h: [...a.board.h.slice(0, 6), 7]}, {...a.board, ring: 'yes'}, {...a.board, extra: 1}]) {
    assert.equal(validBoard(playground, f), false, `playground rejects ${JSON.stringify(f).slice(0, 60)}`);
    forgeries++;
  }
  return {puzzles: puzzles.length, theoremCases: theorems(), hintSteps, refusals, forgeries};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateHills(), null, 2));
