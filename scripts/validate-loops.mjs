// Validates Loop worlds (worksheet Week 100) by an independent model: a world
// on n cards is a pair of set partitions, the 2-classes refining the
// 4-classes, and every world is enumerated (358 on five cards, 2,471 on six,
// 167,894 on eight). Checks by exhaustive search: the one world that fits
// each full clue list; no world for each Can't puzzle, and which triples of
// clues are certificates; every one-clue repair and That's all; the fewest
// clues that pin each hidden world (every smaller set misses some other
// world) and the app's pin check and second world against the model; the
// app's loops against the model on small cards; hints alone from fresh and
// after mistakes; illegal moves and forged saves. Run by `npm run build`, or
// alone: node scripts/validate-loops.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as W from '../dist/families/loops/world.js';
import {loopMechanics, repairs} from '../dist/families/loops/loops.js';

// --- An independent model -----------------------------------------------------
// Restricted growth strings for the 4-classes; 2-classes grow inside them.
function worldsOf(n) {
  const out = [], r4 = Array(n), r2 = Array(n), home = [];
  (function four(i, k) {
    if (i === n) { two(0, 0); return; }
    for (let b = 0; b <= k; b++) { r4[i] = b; four(i + 1, Math.max(k, b + 1)); }
  })(0, 0);
  function two(i, k) {
    if (i === n) { out.push({r2: [...r2], r4: [...r4]}); return; }
    for (let b = 0; b < k; b++) if (home[b] === r4[i]) { r2[i] = b; two(i + 1, k); }
    r2[i] = k; home[k] = r4[i]; two(i + 1, k + 1);
  }
  return out;
}
const pairsOf = n => { const out = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]); return out; };
const dist = (w, i, j) => w.r2[i] === w.r2[j] ? 2 : w.r4[i] === w.r4[j] ? 4 : 8;
const tableOf = (w, P) => P.map(([i, j]) => dist(w, i, j));
// The loops of a model world, built here: each class of two or more cards,
// leaving out a 4-class that is a 2-class.
function loopsOf(w, cards) {
  const cls = r => [...new Set(r)].map(b => cards.filter((_, i) => r[i] === b)).filter(s => s.length > 1);
  const two = cls(w.r2), four = cls(w.r4).filter(s => !two.some(t => t.join() === s.join()));
  return [...two.map(s => [2, s]), ...four.map(s => [4, s])];
}
const popcount = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
// Every other world's set of pairs where it disagrees with t0, kept minimal:
// a set of pairs pins t0 when it meets every one of them.
function minimalDisagreements(tables, t0) {
  const masks = [];
  for (const t of tables) { let m = 0; for (let k = 0; k < t.length; k++) if (t[k] !== t0[k]) m |= 1 << k; if (m) masks.push(m); }
  masks.sort((a, b) => popcount(a) - popcount(b));
  const keep = [];
  for (const m of masks) if (!keep.some(k => (k & m) === k)) keep.push(m);
  return keep;
}
const hitsAll = (mask, D) => D.every(d => (d & mask) !== 0);
function* combos(n, k, from = 0, mask = 0) {
  if (k === 0) { yield mask; return; }
  for (let i = from; i <= n - k; i++) yield* combos(n, k - 1, i + 1, mask | (1 << i));
}
function minimumHitting(D, size) {
  for (let k = 0; k <= size; k++) for (const m of combos(size, k)) if (hitsAll(m, D)) return k;
  return Infinity;
}
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// --- Play ---------------------------------------------------------------------
function hintsSolve(m, p, b, why) {
  for (let k = 0; k < 120 && !m.solved(p, b); k++) {
    const h = m.hint(p, b);
    assert.equal(h.type, 'move', `${p.id}: a hint moves ${why} (${h.text})`);
    const next = m.move(p, b, h.action);
    assert.ok(next, `${p.id}: the hint ${JSON.stringify(h.action)} is legal ${why}`);
    b = next;
  }
  assert.ok(m.solved(p, b), `${p.id}: hints alone solve it ${why}`);
  return b;
}
// A few random legal moves: loops added and taken away, claims, changes, asks.
function wander(m, p, rand, steps) {
  const q = p.parameters, cards = q.cards;
  let b = m.fresh(p);
  for (let s = 0; s < steps; s++) {
    const pick = () => cards.filter(() => rand() < .4);
    const options = [];
    if (q.mode === 'pin') {
      const u = cards[Math.floor(rand() * cards.length)], v = cards[Math.floor(rand() * cards.length)];
      options.push({type: rand() < .7 ? 'ask' : 'drop', pair: [u, v]});
    } else {
      options.push({type: 'add', label: rand() < .5 ? 2 : 4, cards: pick()});
      if (b.loops.length) { const [l, set] = b.loops[Math.floor(rand() * b.loops.length)]; options.push({type: 'remove', label: l, cards: set}); }
      if (q.mode === 'make' && q.cant) options.push({type: 'cant', clues: [0, 1, 2].map(() => Math.floor(rand() * q.clues.length))});
      if (q.mode === 'repair') options.push({type: 'change', clue: Math.floor(rand() * q.clues.length)}, {type: 'all'});
    }
    const next = m.move(p, b, options[Math.floor(rand() * options.length)]);
    if (next && !m.solved(p, next)) b = next;
  }
  return b;
}

export default async function validateLoops() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/loops/loops.json', import.meta.url), 'utf8'));
  const stats = {worlds: {}, uniqueWorlds: 0, cantPuzzles: 0, certificateTriples: 0, repairsChecked: 0, pinSubsetsChecked: 0, pinAgreement: 0, otherWorlds: 0, hintRuns: 0, illegalMoves: 0, refusedForgeries: 0, characterized: 0};
  const cache = new Map();
  const worlds = n => { if (!cache.has(n)) { const ws = worldsOf(n), P = pairsOf(n); cache.set(n, {ws, P, tables: ws.map(w => tableOf(w, P))}); } return cache.get(n); };

  // Counts of worlds, as the card's math check gives them.
  const counts = [1, 2, 3, 4, 5, 6].map(n => worlds(n).ws.length);
  assert.deepEqual(counts, [1, 3, 12, 60, 358, 2471], 'worlds on 1 to 6 cards');
  assert.equal(worlds(8).ws.length, 167894, 'worlds on eight cards');
  stats.worlds = {5: 358, 6: 2471, 8: 167894};
  const fourLoops = worlds(6).ws.filter(w => loopsOf(w, [...'ABCDEF']).filter(l => l[0] === 4).length === 3).length;
  assert.equal(fourLoops, 15, 'six-card worlds with three 4 loops (Problem 10 needs a third 4 label)');

  // The app's worlds against the model, on up to five cards: every model world
  // is a legal app world with the same distances, and the app rebuilds it from
  // its table; the fewest clues formula is the model's minimum hitting set.
  for (const n of [2, 3, 4, 5]) {
    const cards = [...'ABCDE'].slice(0, n), {ws, P, tables} = worlds(n);
    ws.forEach((w, k) => {
      const loops = loopsOf(w, cards), t = tables[k];
      assert.ok(W.isWorld(cards, loops), `n=${n}: a model world is an app world`);
      assert.deepEqual(P.map(([i, j]) => W.distance(loops, cards[i], cards[j])), t, `n=${n}: the same distances`);
      const clues = P.map(([i, j], x) => [cards[i], cards[j], t[x]]);
      assert.equal(JSON.stringify(W.canonical(cards, W.worldOfClues(cards, clues))), JSON.stringify(W.canonical(cards, loops)), `n=${n}: rebuilt from its table`);
      const D = minimalDisagreements(tables, t);
      assert.equal(W.fewest(cards, loops), minimumHitting(D, P.length), `n=${n}: fewest clues for ${JSON.stringify(loops)}`);
      if (n <= 4) for (let m = 0; m < 1 << P.length; m++) {
        const asked = P.filter((_, x) => m & (1 << x)).map(([i, j]) => [cards[i], cards[j]]);
        assert.equal(W.pins(cards, loops, asked), hitsAll(m, D), `n=${n}: the pin check on ${JSON.stringify(asked)}`);
        stats.pinAgreement++;
      }
      stats.characterized++;
    });
    // Tables no world has are refused by the app's rebuild.
    if (n <= 4) {
      const seen = new Set(tables.map(t => t.join()));
      for (let code = 0; code < 3 ** P.length; code++) {
        const t = P.map((_, x) => W.VALUES[Math.floor(code / 3 ** x) % 3]);
        const clues = P.map(([i, j], x) => [cards[i], cards[j], t[x]]);
        assert.equal(W.worldOfClues(cards, clues) !== null, seen.has(t.join()), `n=${n}: rebuild of ${t.join()}`);
      }
    }
  }
  // Triples: a certificate exactly when no world on three cards fits.
  {
    const {tables} = worlds(3), fits = new Set(tables.map(t => t.join()));
    for (const a of W.VALUES) for (const b of W.VALUES) for (const c of W.VALUES) {
      const clues = [['A', 'B', a], ['A', 'C', b], ['B', 'C', c]];
      assert.equal(W.isCertificate(clues), !fits.has([a, b, c].join()), `triple ${a}, ${b}, ${c}`);
      stats.certificateTriples++;
    }
  }
  // The app's refusals against an independent rule on random loops: loops
  // nested or apart, a loop strictly inside another with a smaller number, the
  // same cards only with different numbers; distances are the smallest number.
  {
    const rand = mulberry(100), cards = [...'ABCDEF'];
    for (let run = 0; run < 400; run++) {
      let loops = [];
      for (let s = 0; s < 12; s++) {
        const set = cards.filter(() => rand() < .45), label = rand() < .5 ? 2 : 4;
        const ok = set.length >= 2 && loops.every(([l, t]) => {
          const meet = set.some(x => t.includes(x)), inS = set.every(x => t.includes(x)), inT = t.every(x => set.includes(x));
          if (!meet) return true;
          if (inS && inT) return l !== label;
          if (inS) return label < l;
          if (inT) return l < label;
          return false;
        });
        assert.equal(W.refusal(loops, label, set) === null, ok, `refusal of ${label}:${set} beside ${JSON.stringify(loops)}`);
        if (ok) loops = [...loops, [label, set]];
        assert.ok(W.isWorld(cards, loops));
        // The distances make an ultrametric.
        for (const x of cards) for (const y of cards) for (const z of cards) if (x < y && y < z) {
          const ds = [W.distance(loops, x, y), W.distance(loops, x, z), W.distance(loops, y, z)].sort((a, b) => a - b);
          assert.equal(ds[1], ds[2], 'the largest of three occurs twice');
        }
      }
    }
  }

  const loopsMech = m => loopMechanics[m];
  for (const p of pack.puzzles) {
    const q = p.parameters, m = loopsMech(p.mechanic), n = q.cards.length, at = new Map(q.cards.map((c, i) => [c, i]));
    assert.ok(m, `${p.id}: a loops mechanic`);
    if (q.mode === 'playground') continue;
    const {P, tables, ws} = worlds(n);
    const pairIndex = (u, v) => P.findIndex(([i, j]) => (i === at.get(u) && j === at.get(v)) || (i === at.get(v) && j === at.get(u)));
    const fitting = clues => { const idx = clues.map(([u, v, d]) => [pairIndex(u, v), d]); return tables.filter(t => idx.every(([x, d]) => t[x] === d)); };

    if (q.mode === 'make') {
      const fit = fitting(q.clues);
      if (q.world) {
        assert.equal(fit.length, 1, `${p.id}: exactly one world fits its clues`);
        assert.deepEqual(fit[0], P.map(([i, j]) => W.distance(q.world, q.cards[i], q.cards[j])), `${p.id}: and it is the stated world`);
        stats.uniqueWorlds++;
      } else {
        assert.equal(fit.length, 0, `${p.id}: no world fits its clues`);
        stats.cantPuzzles++;
      }
      // Every claim of three clues: solved exactly when no world fits those three.
      for (let i = 0; i < q.clues.length; i++) for (let j = i + 1; j < q.clues.length; j++) for (let k = j + 1; k < q.clues.length; k++) {
        const three = [q.clues[i], q.clues[j], q.clues[k]], b = m.move(p, m.fresh(p), {type: 'cant', clues: [k, i, j]});
        if (!W.triangle(three)) { assert.equal(b && m.valid(p, b), null, `${p.id}: a claim needs three cards`); continue; }
        assert.ok(b, `${p.id}: a claim on three cards is taken`);
        assert.equal(m.solved(p, b), fitting(three).length === 0, `${p.id}: claim ${i}, ${j}, ${k}`);
        if (q.world) assert.equal(m.solved(p, b), false, `${p.id}: no certificate where a world fits`);
      }
      const once = m.move(p, m.fresh(p), {type: 'cant', clues: [0, 1, 2]});
      if (once && !m.solved(p, once)) assert.equal(m.move(p, once, {type: 'cant', clues: [0, 1, 2]}), null, `${p.id}: Can’t is shut after a refused claim`);
    }

    if (q.mode === 'repair') {
      assert.equal(fitting(q.clues).length, 0, `${p.id}: the clues as given can’t`);
      const found = [];
      q.clues.forEach(([u, v, d], i) => W.VALUES.filter(x => x !== d).forEach(x => {
        const fit = fitting(q.clues.map((c, j) => j === i ? [u, v, x] : c));
        assert.ok(fit.length <= 1, `${p.id}: a full clue list fits one world at most`);
        if (fit.length) found.push([i, x]);
        stats.repairsChecked++;
      }));
      assert.deepEqual(repairs(q), found, `${p.id}: the app’s repairs are every repair`);
      assert.equal(found.length, 3, `${p.id}: exactly three repairs`);
      // That's all: refused before any repair, "There is another." with some, solved with all.
      let b = m.fresh(p);
      assert.equal(m.move(p, b, {type: 'all'}), null, `${p.id}: no That’s all before a repair`);
      b = hintsSolve(m, p, b, 'from fresh');
      assert.equal(b.found.length, 3);
      for (let keep = 1; keep < 3; keep++) {
        let c = m.fresh(p);
        for (let k = 0; k < 60 && c.found.length < keep; k++) c = m.move(p, c, m.hint(p, c).action);
        c = m.move(p, c, {type: 'all'});
        assert.equal(c.told, 'more', `${p.id}: That’s all with ${keep} found says There is another`);
        assert.equal(m.solved(p, c), false);
        assert.equal(m.move(p, c, {type: 'all'}), null, `${p.id}: That’s all stays shut until a new repair`);
        hintsSolve(m, p, c, `after That’s all with ${keep}`);
      }
    }

    if (q.mode === 'pin') {
      const t0 = P.map(([i, j]) => W.distance(q.world, q.cards[i], q.cards[j]));
      const D = minimalDisagreements(tables, t0), k = q.budget;
      assert.equal(W.fewest(q.cards, q.world), k, `${p.id}: the app’s fewest`);
      // No k − 1 clues pin the world; k clues can.
      let small = 0;
      for (const mask of combos(P.length, k - 1)) { assert.equal(hitsAll(mask, D), false, `${p.id}: ${k - 1} clues never pin`); small++; }
      stats.pinSubsetsChecked += small;
      const b = hintsSolve(m, p, m.fresh(p), 'from fresh');
      const mask = b.asked.reduce((s, [u, v]) => s | (1 << pairIndex(u, v)), 0);
      assert.ok(hitsAll(mask, D) && b.asked.length === k, `${p.id}: the hints’ ${k} clues pin the world`);
      // The app's pin check and second world on k clues: every set on up to
      // six cards; on eight, every pinning set and a sample of the rest.
      const pairs = P.map(([i, j]) => [q.cards[i], q.cards[j]]);
      const check = mask => {
        const asked = pairs.filter((_, x) => mask & (1 << x)), pinned = hitsAll(mask, D);
        assert.equal(W.pins(q.cards, q.world, asked), pinned, `${p.id}: pin check on ${JSON.stringify(asked)}`);
        const other = W.otherWorld(q.cards, q.world, asked);
        if (pinned) assert.equal(other, null);
        else {
          assert.ok(W.isWorld(q.cards, other), `${p.id}: the second world is a world`);
          const t = P.map(([i, j]) => W.distance(other, q.cards[i], q.cards[j]));
          assert.ok(t.some((d, x) => d !== t0[x]), `${p.id}: the second world differs`);
          assert.ok(asked.every(([u, v]) => t[pairIndex(u, v)] === t0[pairIndex(u, v)]), `${p.id}: and fits every clue`);
          stats.otherWorlds++;
        }
        stats.pinAgreement++;
      };
      if (n <= 6) for (const mask of combos(P.length, k)) check(mask);
      else {
        let pinning = 0;
        for (const mask of combos(P.length, k)) if (hitsAll(mask, D)) { check(mask); pinning++; }
        assert.equal(pinning, 256, `${p.id}: 1 · 4 · 4 · 16 sets of seven clues pin the number world`);
        const rand = mulberry(15);
        for (let s = 0; s < 3000; s++) { const idx = new Set(); while (idx.size < k) idx.add(Math.floor(rand() * P.length)); check([...idx].reduce((a, x) => a | (1 << x), 0)); }
      }
      // Asking past the pips, twice, or a card with itself is refused.
      const loose = pairs.slice(0, k), more = pairs[k];
      assert.equal(m.move(p, {asked: loose}, {type: 'ask', pair: more}), null, `${p.id}: no ask past the pips`);
      assert.equal(m.move(p, {asked: [pairs[0]]}, {type: 'ask', pair: [...pairs[0]].reverse()}), null, `${p.id}: no clue twice`);
      assert.equal(m.move(p, m.fresh(p), {type: 'ask', pair: [q.cards[0], q.cards[0]]}), null);
      stats.illegalMoves += 3;
    }

    // Hints alone, from fresh and after random play.
    const rand = mulberry(p.number * 977 + n);
    hintsSolve(m, p, m.fresh(p), 'from fresh');
    for (let r = 0; r < 12; r++) { hintsSolve(m, p, wander(m, p, rand, 4 + r), `after wandering (${r})`); stats.hintRuns++; }
    assert.ok(!/Can’t|That’s all/.test(p.hints[0]), `${p.id}: the first hint never gives the answer away`);

    // Illegal loops, on these cards with clues no loops make, so that no
    // move ends the puzzle.
    if (q.mode !== 'pin') {
      const [a, b, c] = q.cards, pr = {...p, parameters: {mode: 'make', cards: q.cards, clues: [[a, b, 2], [a, c, 2], [b, c, 8]]}};
      const go = (board, action) => m.move(pr, board, action), s = go(m.fresh(pr), {type: 'add', label: 2, cards: [a, b]});
      assert.ok(s);
      assert.equal(go(s, {type: 'add', label: 2, cards: [b, c]}), null, `${p.id}: loops can’t cross`);
      assert.equal(go(s, {type: 'add', label: 2, cards: [a, b, c]}), null, `${p.id}: a 2 loop round a 2 loop`);
      assert.equal(go(s, {type: 'add', label: 2, cards: [a, b]}), null, `${p.id}: the same loop twice`);
      assert.ok(go(s, {type: 'add', label: 4, cards: [a, b]}), `${p.id}: a 4 loop round the same two cards is allowed`);
      assert.equal(go(go(m.fresh(pr), {type: 'add', label: 4, cards: [a, b, c]}), {type: 'add', label: 4, cards: [a, b]}), null, `${p.id}: a 4 inside a 4`);
      assert.equal(go(m.fresh(pr), {type: 'add', label: 8, cards: [a, b]}), null, `${p.id}: no 8 loops; the frame is 8`);
      assert.equal(go(m.fresh(pr), {type: 'add', label: 2, cards: [a]}), null, `${p.id}: a loop holds two cards`);
      assert.equal(go(m.fresh(pr), {type: 'add', label: 2, cards: [a, 'Z']}), null);
      assert.equal(go(m.fresh(pr), {type: 'remove', label: 2, cards: [a, b]}), null, `${p.id}: no loop to take away`);
      stats.illegalMoves += 9;
    }

    // Forged saves.
    const forged = q.mode === 'pin'
      ? [{asked: Array(q.budget + 1).fill(0).map((_, x) => [q.cards[0], q.cards[x + 1] || q.cards[1]])}, {asked: [[q.cards[1], q.cards[0]]]}, {asked: [[q.cards[0], q.cards[1]], [q.cards[0], q.cards[1]]]}, {asked: [], extra: 1}]
      : [
          {...m.fresh(p), loops: [[2, [q.cards[0]]]]},
          {...m.fresh(p), loops: [[2, [q.cards[0], q.cards[1]]], [2, [q.cards[1], q.cards[2]]]]},
          {...m.fresh(p), loops: [[4, [q.cards[0], q.cards[1]]], [2, [q.cards[0], q.cards[1], q.cards[2]]]]},
          {...m.fresh(p), loops: [[2, [q.cards[1], q.cards[0]]]]},
          {...m.fresh(p), extra: 1},
          ...(q.mode === 'make' ? [{loops: [], claim: [0, 1]}, {loops: [], claim: [0, 0, 1]}, ...(q.cant ? [] : [{loops: [], claim: [0, 1, 2]}])] : []),
          ...(q.mode === 'repair' ? [{loops: [], change: [0, q.clues[0][2]], found: [], told: null}, {loops: [], change: null, found: [[3, 4]], told: null}, {loops: [], change: null, found: [repairs(q)[0]], told: 'all'}] : [])
        ];
    for (const f of forged) { assert.equal(m.valid(p, f), false, `${p.id}: forged ${JSON.stringify(f)}`); stats.refusedForgeries++; }
  }
  return stats;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(await validateLoops());
