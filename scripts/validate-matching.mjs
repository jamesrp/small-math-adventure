// Checks the Pairs that stay pack (dist/families/matching/matching.json):
// content fields and sources; every answer recomputed with rank tables and a
// separate permutation walk (Heap's), not the mechanic's helpers; deferred
// acceptance from both sides, which must give the asking side its best
// pairing that can stay and the other side its worst; the repair theorem (one
// strip works exactly when the blocking pairs share a letter) over every
// two-pair case and the first 60,000 three-pair cases; the three-pair
// census (34,080 / 11,484 / 1,092, and at most three last choices); witnesses
// played as moves; hint chains from fresh and after wrong moves of every
// kind; illegal moves; forged saves; the playground.
// Run: node scripts/validate-matching.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// --- An independent model -----------------------------------------------------
// Markets as index tables: rc[i][j] is circle i's rank of square j, rs[j][i]
// square j's rank of circle i (0 is first). A pairing is an array m, m[i] the
// square of circle i.
function tables(q, L) {
  const C = [...q.circles], S = [...q.squares];
  return {C, S, rc: C.map(c => S.map(s => L[c].indexOf(s))), rs: S.map(s => C.map(c => L[s].indexOf(c)))};
}
function heap(n) {
  const out = [], a = [...Array(n).keys()], c = Array(n).fill(0);
  out.push([...a]);
  for (let i = 1; i < n;) {
    if (c[i] < i) { const j = i % 2 ? c[i] : 0; [a[j], a[i]] = [a[i], a[j]]; out.push([...a]); c[i]++; i = 1; } else { c[i] = 0; i++; }
  }
  return out;
}
const PERMS = {2: heap(2), 3: heap(3), 4: heap(4)};
function blockingPairs(t, m) {
  const n = t.C.length, holder = Array(n);
  m.forEach((j, i) => { holder[j] = i; });
  const out = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (m[i] !== j && t.rc[i][j] < t.rc[i][m[i]] && t.rs[j][i] < t.rs[j][holder[j]]) out.push(t.C[i] + t.S[j]);
  return out;
}
const keyOf = (t, m) => m.map(j => t.S[j]).join('');
const fromKey = (t, k) => [...k].map(s => t.S.indexOf(s));
const stableKeys = t => PERMS[t.C.length].filter(m => !blockingPairs(t, m).length).map(m => keyOf(t, m)).sort();
// Deferred acceptance: free askers ask down their lists; receivers hold the best so far.
function askers(t, circlesAsk) {
  const n = t.C.length, ask = circlesAsk ? t.rc : t.rs, judge = circlesAsk ? t.rs : t.rc;
  const order = ask.map(r => [...Array(n).keys()].sort((x, y) => r[x] - r[y]));
  const next = Array(n).fill(0), held = Array(n).fill(-1), free = [...Array(n).keys()];
  let requests = 0;
  while (free.length) {
    const a = free.shift(), r = order[a][next[a]++];
    requests++;
    if (held[r] < 0) held[r] = a;
    else if (judge[r][a] < judge[r][held[r]]) { free.push(held[r]); held[r] = a; } else free.push(a);
  }
  assert.ok(requests <= n * n - n + 1, 'deferred acceptance stays within n² − n + 1 requests');
  const m = Array(n);
  held.forEach((a, r) => { if (circlesAsk) m[a] = r; else m[r] = a; });
  return keyOf(t, m);
}
const swapAt = (s, i, j) => { const a = [...s]; [a[i], a[j]] = [a[j], a[i]]; return a.join(''); };
const ordersOf = s => PERMS[s.length].map(p => p.map(i => s[i]).join(''));
// Every single-strip change that lets the pairing k stay.
function singleRepairs(q, L, k) {
  const out = [];
  for (const o of [...q.circles, ...q.squares]) for (const order of ordersOf(L[o])) if (order !== L[o] && !blockingPairs(tables(q, {...L, [o]: order}), fromKey(tables(q, L), k)).length) out.push(`${o}:${order}`);
  return out.sort();
}
const shareLetter = list => list.length > 0 && [...list[0]].some(x => list.every(b => b.includes(x)));
function* profiles(q) {
  const owners = [...q.circles, ...q.squares], choices = owners.map(o => ordersOf(o.length && q.circles.includes(o) ? q.squares : q.circles));
  const idx = Array(owners.length).fill(0);
  for (;;) {
    yield Object.fromEntries(owners.map((o, i) => [o, choices[i][idx[i]]]));
    let i = owners.length - 1;
    while (i >= 0 && ++idx[i] === choices[i].length) idx[i--] = 0;
    if (i < 0) return;
  }
}
const lastCount = (t, m) => { let n = 0; m.forEach((j, i) => { if (t.rc[i][j] === t.C.length - 1) n++; if (t.rs[j][i] === t.C.length - 1) n++; }); return n; };

// The table in docs/matching/README.md.
const TABLE = {
  'matching-01': {mode: 'check', blockers: ['AY']},
  'matching-02': {mode: 'check', blockers: []},
  'matching-03': {mode: 'repair', repairs: ['A:XY', 'Y:BA']},
  'matching-04': {mode: 'repair', repairs: [], cant: ['AY', 'BX']},
  'matching-05': {mode: 'check', blockers: ['CX']},
  'matching-06': {mode: 'every', edit: 2},
  'matching-07': {mode: 'repair', repairs: ['X:CAB', 'X:CBA']},
  'matching-08': {mode: 'every', stable: ['YXZW', 'ZXYW', 'ZYXW']},
  'matching-09': {mode: 'every', stable: ['WYZX', 'ZYWX']},
  'matching-10': {mode: 'every', stable: ['WXYZ', 'WXZY', 'XWYZ', 'XWZY']},
  'matching-11': {mode: 'every', edit: 2},
  'matching-12': {mode: 'last', most: 3}
};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: a hint says something`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// A circle and a square, not together, that don't block: one says no.
const oneSided = (q, L, k) => { const t = tables(q, L), b = blockingPairs(t, fromKey(t, k)); for (const c of q.circles) for (const s of q.squares) if (k[q.circles.indexOf(c)] !== s && !b.includes(c + s)) return [c, s]; return null; };

export async function validateMatching() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/matching/matching.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-27')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-27.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'matching');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  assert.ok(!/marri|wife|husband|bride|groom|romance|love/i.test(JSON.stringify(pack.puzzles)), 'no people or romance in the puzzles');
  // Find-every puzzles have four pairs, so they are not a six-case tap-through.
  for (const p of puzzles.filter(p => p.parameters.mode === 'every' && !p.parameters.edit)) assert.equal(p.parameters.circles.length, 4, `${p.id}: four pairs`);

  // Theorems over every small market.
  const census = {two: [0, 0, 0, 0], three: [0, 0, 0, 0, 0], mostLast: 0, repairCases: 0, daRuns: 0};
  const m2 = {circles: 'AB', squares: 'XY'}, m3 = {circles: 'ABC', squares: 'XYZ'};
  for (const [q, counts] of [[m2, census.two], [m3, census.three]]) {
    for (const L of profiles(q)) {
      const t = tables(q, L), keys = stableKeys(t);
      counts[keys.length]++;
      assert.ok(keys.length >= 1, 'some pairing can stay');
      // Deferred acceptance from each side gives that side's best pairing that can stay.
      const ca = askers(t, true), sa = askers(t, false);
      census.daRuns += 2;
      assert.ok(keys.includes(ca) && keys.includes(sa), 'asking ends in a pairing that can stay');
      for (const k of keys) for (let i = 0; i < t.C.length; i++) {
        const j = t.S.indexOf(k[i]);
        assert.ok(t.rc[i][t.S.indexOf(ca[i])] <= t.rc[i][j], 'circles asking: every circle’s best');
        assert.ok(t.rs[j][t.C.indexOf(t.C[sa.indexOf(t.S[j])])] <= t.rs[j][i], 'squares asking: every square’s best');
        assert.ok(t.rs[j][ca.indexOf(t.S[j])] >= t.rs[j][i], 'circles asking: every square’s worst');
        assert.ok(t.rc[i][t.S.indexOf(sa[i])] >= t.rc[i][j], 'squares asking: every circle’s worst');
      }
      for (const m of PERMS[t.C.length]) {
        const b = blockingPairs(t, m);
        if (!b.length) census.mostLast = Math.max(census.mostLast, q === m3 ? lastCount(t, m) : 0);
        // One strip repairs m exactly when its blocking pairs share a letter.
        if (b.length && (q === m2 || census.repairCases < 60000)) {
          census.repairCases++;
          assert.equal(singleRepairs(q, L, keyOf(t, m)).length > 0, shareLetter(b), 'the repair theorem');
        }
      }
    }
  }
  assert.deepEqual(census.two, [0, 14, 2, 0], 'two pairs: 14 sets of strips with one pairing that can stay, 2 with both');
  assert.deepEqual(census.three, [0, 34080, 11484, 1092, 0], 'three pairs: 34,080 / 11,484 / 1,092');
  assert.equal(census.mostLast, 3, 'at most three last choices in a three-pair pairing that can stay');

  let hintSteps = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'matching');
    assert.ok(p.id.startsWith('matching-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    assert.equal(nextHint(p, fresh).type, 'move', `${p.id}: a first hint`);
    const row = TABLE[p.id], t = tables(q, q.lists), k = q.pairing;
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    for (const o of [...q.circles, ...q.squares]) assert.equal([...q.lists[o]].sort().join(''), [...(q.circles.includes(o) ? q.squares : q.circles)].sort().join(''), `${p.id}: ${o}’s strip lists the other side once each`);
    hintSteps += hintsSolve(p, fresh, 'from fresh');
    if (q.mode === 'check') hintSteps += checkCheck(p, fresh, row, t, k);
    if (q.mode === 'repair') hintSteps += checkRepair(p, fresh, row, t, k);
    if (q.mode === 'every') hintSteps += row.edit ? checkDesign(p, fresh, row) : checkEvery(p, fresh, row, t, k);
    if (q.mode === 'last') hintSteps += checkLast(p, fresh, row);
    commonRefusals(p, fresh);
  }
  return {matchingPuzzles: puzzles.length, profilesChecked: census.two.reduce((x, y) => x + y) + census.three.reduce((x, y) => x + y), askingRuns: census.daRuns, repairCases: census.repairCases, hintSteps};
}

function checkCheck(p, fresh, row, t, k) {
  const q = p.parameters, b = blockingPairs(t, fromKey(t, k));
  assert.deepEqual(b, row.blockers, `${p.id}: blocking pairs by rank tables`);
  let steps = 0;
  if (b.length) {
    for (const x of b) assert.ok(isSolved(p, play(p, fresh, {type: 'block', c: x[0], s: x[1]}).board), `${p.id}: ${x} is a solve`);
    const wrong = play(p, fresh, {type: 'stays'});
    assert.ok(!isSolved(p, wrong.board), `${p.id}: a wrong Stays is no solve`);
    refuse(p, wrong, {type: 'stays'}, 'Stays twice');
    steps += hintsSolve(p, wrong, 'after a wrong Stays');
  } else {
    assert.ok(isSolved(p, play(p, fresh, {type: 'stays'}).board), `${p.id}: Stays is a solve`);
  }
  const one = oneSided(q, q.lists, k);
  if (one) {
    const a = play(p, fresh, {type: 'block', c: one[0], s: one[1]});
    assert.ok(!isSolved(p, a.board), `${p.id}: a one-sided wish is no solve`);
    refuse(p, a, {type: 'block', c: one[0], s: one[1]}, 'the same claim twice');
    steps += hintsSolve(p, a, 'after a wrong claim');
  }
  const partner = [q.circles[0], k[0]];
  refuse(p, fresh, {type: 'block', c: partner[0], s: partner[1]}, 'a claim on partners');
  for (const [action, why] of [[{type: 'pair', c: 'A', s: k[1]}, 'pairing a fixed pairing'], [{type: 'swap', owner: 'A', i: 0, j: 1}, 'changing a strip'], [{type: 'all'}, 'That’s all'], [{type: 'cant'}, 'Can’t']]) refuse(p, fresh, action, why);
  for (const [board, why] of [[{said: 'stays', more: 1}, 'an unknown field'], [{said: partner.join('')}, 'a claim on partners'], [{said: 'AA'}, 'a claim on two circles'], [{said: 'yes'}, 'an unknown claim'], [{}, 'a missing field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkRepair(p, fresh, row, t, k) {
  const q = p.parameters, b = blockingPairs(t, fromKey(t, k)), repairs = singleRepairs(q, q.lists, k);
  assert.ok(b.length > 0, `${p.id}: the drawn pairing can’t stay`);
  assert.deepEqual(repairs, [...row.repairs].sort(), `${p.id}: every single-strip repair`);
  assert.equal(repairs.length > 0, shareLetter(b), `${p.id}: repairs exactly when the blocking pairs share a letter`);
  let steps = 0;
  if (repairs.length) {
    // Each repair, made by swaps on its strip, then Stays.
    for (const r of repairs) {
      const [o, order] = r.split(':');
      let a = fresh, cur = q.lists[o];
      while (cur !== order) { const i = [...cur].findIndex((x, n) => x !== order[n]), j = cur.indexOf(order[i]); a = play(p, a, {type: 'swap', owner: o, i, j}); cur = swapAt(cur, i, j); }
      assert.ok(isSolved(p, play(p, a, {type: 'stays'}).board), `${p.id}: ${r} then Stays solves`);
    }
    const wrong = play(p, fresh, {type: 'cant'});
    assert.ok(!isSolved(p, wrong.board), `${p.id}: a wrong Can’t is no solve`);
    refuse(p, wrong, {type: 'cant'}, 'Can’t twice');
    steps += hintsSolve(p, wrong, 'after a wrong Can’t');
  } else {
    assert.deepEqual(row.cant.every(x => b.includes(x)) && row.cant[0][0] !== row.cant[1][0] && row.cant[0][1] !== row.cant[1][1], true, `${p.id}: the certificate is two blocking pairs with no letter in common`);
    assert.ok(isSolved(p, play(p, fresh, {type: 'cant'}).board), `${p.id}: Can’t is a solve`);
  }
  // A strip change that doesn't repair, a Stays on it, a second strip that puts the first back.
  const owners = [...q.circles, ...q.squares];
  const bad = owners.find(o => !repairs.some(r => r.startsWith(`${o}:`)));
  if (bad) {
    let a = play(p, fresh, {type: 'swap', owner: bad, i: 0, j: 1});
    assert.deepEqual(a.board.strip, {owner: bad, order: swapAt(q.lists[bad], 0, 1)});
    a = play(p, a, {type: 'stays'});
    assert.ok(!isSolved(p, a.board), `${p.id}: Stays after a change that doesn’t repair`);
    steps += hintsSolve(p, a, 'after a wrong strip and Stays');
    const other = owners.find(o => o !== bad);
    const two = play(p, play(p, fresh, {type: 'swap', owner: bad, i: 0, j: 1}), {type: 'swap', owner: other, i: 0, j: 1});
    assert.equal(two.board.strip.owner, other, `${p.id}: a second strip puts the first back`);
    const back = play(p, play(p, fresh, {type: 'swap', owner: bad, i: 0, j: 1}), {type: 'swap', owner: bad, i: 0, j: 1});
    assert.equal(back.board.strip, null, `${p.id}: swapping back restores the strip`);
  }
  const one = oneSided(q, q.lists, k);
  if (one) assert.ok(!isSolved(p, play(p, fresh, {type: 'block', c: one[0], s: one[1]}).board), `${p.id}: a claim is no solve`);
  for (const [action, why] of [[{type: 'swap', owner: 'Q', i: 0, j: 1}, 'an unknown strip'], [{type: 'swap', owner: 'A', i: 0, j: 0}, 'a place with itself'], [{type: 'swap', owner: 'A', i: 0, j: 9}, 'a place off the strip'], [{type: 'pair', c: 'A', s: k[1]}, 'pairing a fixed pairing'], [{type: 'all'}, 'That’s all']]) refuse(p, fresh, action, why);
  const o = owners[0];
  for (const [board, why] of [[{strip: {owner: o, order: q.lists[o]}, said: null}, 'a strip unchanged'], [{strip: {owner: o, order: 'QQ'}, said: null}, 'a strip of unknown letters'], [{strip: {owner: 'Q', order: q.lists[o]}, said: null}, 'an unknown owner'], [{strip: null, said: 'maybe'}, 'an unknown claim'], [{strip: null}, 'a missing field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkEvery(p, fresh, row, t, k) {
  const q = p.parameters, keys = stableKeys(t);
  assert.deepEqual(keys, row.stable, `${p.id}: every pairing that can stay, by rank tables`);
  assert.ok(blockingPairs(t, fromKey(t, k)).length > 0, `${p.id}: the starting pairing can’t stay`);
  assert.ok(keys.includes(askers(t, true)) && keys.includes(askers(t, false)), `${p.id}: asking from both sides`);
  // Witness: pair into each one in turn, keep it, then That's all.
  let a = fresh;
  const to = (a, key) => { let b = a; for (let i = 0; i < key.length; i++) if (b.board.pairing[i] !== key[i]) b = play(p, b, {type: 'pair', c: q.circles[i], s: key[i]}); return b; };
  for (const [n, key] of keys.entries()) {
    a = play(p, to(a, key), {type: 'stays'});
    assert.deepEqual(a.board.kept, keys.slice(0, n + 1), `${p.id}: ${key} is kept`);
    refuse(p, a, {type: 'stays'}, 'keeping a pairing twice');
    if (n === 0 && keys.length > 1) {
      const early = play(p, a, {type: 'all'});
      assert.equal(early.board.missed, true, `${p.id}: there’s another`);
      refuse(p, early, {type: 'all'}, 'That’s all again before a new pairing');
      let steps = hintsSolve(p, early, 'after an early That’s all');
      void steps;
    }
  }
  assert.ok(isSolved(p, play(p, a, {type: 'all'}).board), `${p.id}: That’s all after every one`);
  let steps = 0;
  // A wrong Stays holds the pairing until a blocking pair is tapped.
  const held = play(p, fresh, {type: 'stays'});
  assert.equal(held.board.pending, true, `${p.id}: a wrong Stays holds the pairing`);
  refuse(p, held, {type: 'pair', c: q.circles[0], s: k[1]}, 'pairing while held');
  refuse(p, held, {type: 'all'}, 'That’s all while held');
  refuse(p, held, {type: 'stays'}, 'Stays while held');
  const one = oneSided(q, q.lists, k), right = blockingPairs(t, fromKey(t, k))[0];
  const wrong = play(p, held, {type: 'block', c: one[0], s: one[1]});
  assert.equal(wrong.board.pending, true, `${p.id}: a one-sided wish keeps it held`);
  steps += hintsSolve(p, wrong, 'after a wrong claim');
  const freed = play(p, held, {type: 'block', c: right[0], s: right[1]});
  assert.equal(freed.board.pending, false, `${p.id}: a blocking pair frees it`);
  play(p, freed, {type: 'pair', c: right[0], s: right[1]});
  refuse(p, fresh, {type: 'block', c: right[0], s: right[1]}, 'a claim before Stays');
  refuse(p, fresh, {type: 'swap', owner: 'A', i: 0, j: 1}, 'changing a strip');
  // A wasted pairing move, then hints.
  steps += hintsSolve(p, play(p, fresh, {type: 'pair', c: q.circles[1], s: k[0]}), 'after a wasted move');
  // Undo keeps what was kept.
  const kept = play(p, to(fresh, keys[0]), {type: 'stays'}), carried = mechanicFor(p).carry(p, kept.board, fresh.board);
  assert.deepEqual(carried.kept, [keys[0]], `${p.id}: Undo keeps the shelf`);
  assert.ok(validBoard(p, carried), `${p.id}: the carried board is valid`);
  // Forged saves.
  const B = fresh.board, notOne = PERMS[4].map(m => keyOf(t, m)).find(x => !keys.includes(x));
  for (const [board, why] of [
    [{...B, kept: [notOne]}, 'a kept pairing that can’t stay'], [{...B, kept: [keys[0], keys[0]]}, 'a pairing kept twice'], [{...B, claimed: true}, 'That’s all with nothing kept'],
    [{...B, kept: [...keys], missed: true}, '“there’s another” when none is'], [{...B, kept: keys.slice(0, 1), claimed: keys.length > 1}, 'That’s all accepted early'],
    [{...B, pairing: keys[0], pending: true}, 'a held pairing that can stay'], [{...B, pending: true, said: right}, 'a held pairing with its blocking pair found'],
    [{...B, said: one.join('')}, 'a free pairing with a wrong claim'], [{...B, pairing: 'WWXY'}, 'a pairing with a square twice'], [{...B, pending: 'yes'}, 'a held flag that is not true or false'],
    [{...B, lists: q.lists}, 'strips in a puzzle whose strips are fixed'], [{...B, extra: 1}, 'an unknown field']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkDesign(p, fresh, row) {
  const q = p.parameters;
  assert.equal(q.count, row.edit, `${p.id}: the count`);
  assert.notEqual(stableKeys(tables(q, q.lists)).length, q.count, `${p.id}: the starting strips don’t already do it`);
  const example = p.solution.example, t = tables(q, example), keys = stableKeys(t);
  assert.equal(keys.length, q.count, `${p.id}: the example has exactly ${q.count}`);
  // Witness: change the strips to the example by swaps, keep each, That's all.
  let a = fresh;
  for (const o of [...q.circles, ...q.squares]) { let cur = a.board.lists[o]; while (cur !== example[o]) { const i = [...cur].findIndex((x, n) => x !== example[o][n]), j = cur.indexOf(example[o][i]); a = play(p, a, {type: 'swap', owner: o, i, j}); cur = a.board.lists[o]; } }
  for (const key of keys) { for (let i = 0; i < key.length; i++) if (a.board.pairing[i] !== key[i]) a = play(p, a, {type: 'pair', c: q.circles[i], s: key[i]}); a = play(p, a, {type: 'stays'}); }
  assert.ok(isSolved(p, play(p, a, {type: 'all'}).board), `${p.id}: the example solves`);
  let steps = 0;
  // The starting strips: keep what can stay and claim That's all; it is right, and no solve.
  const t0 = tables(q, q.lists), k0 = stableKeys(t0);
  let b = fresh;
  for (const key of k0) { for (let i = 0; i < key.length; i++) if (b.board.pairing[i] !== key[i]) b = play(p, b, {type: 'pair', c: q.circles[i], s: key[i]}); b = play(p, b, {type: 'stays'}); }
  b = play(p, b, {type: 'all'});
  assert.ok(b.board.claimed && !isSolved(p, b.board), `${p.id}: all the starting strips’ pairings, but not ${q.count}`);
  steps += hintsSolve(p, b, 'after claiming the starting strips');
  // Changing a strip clears the shelf.
  const changed = play(p, b, {type: 'swap', owner: 'A', i: 0, j: 1});
  assert.deepEqual(changed.board.kept, [], `${p.id}: new strips clear the shelf`);
  assert.equal(mechanicFor(p).carry(p, b.board, changed.board), changed.board, `${p.id}: Undo across a strip change doesn’t carry the shelf`);
  steps += hintsSolve(p, changed, 'after a strip change');
  // A wrong Stays on the starting strips holds the pairing.
  const bad = PERMS[q.circles.length].map(m => keyOf(t0, m)).find(x => !k0.includes(x));
  let h = fresh;
  for (let i = 0; i < bad.length; i++) if (h.board.pairing[i] !== bad[i]) h = play(p, h, {type: 'pair', c: q.circles[i], s: bad[i]});
  h = play(p, h, {type: 'stays'});
  assert.equal(h.board.pending, true, `${p.id}: a wrong Stays holds`);
  refuse(p, h, {type: 'swap', owner: 'A', i: 0, j: 1}, 'changing a strip while held');
  steps += hintsSolve(p, h, 'after a wrong Stays');
  for (const [action, why] of [[{type: 'swap', owner: 'A', i: 0, j: 0}, 'a place with itself'], [{type: 'swap', owner: 'A', i: -1, j: 0}, 'a place off the strip'], [{type: 'swap', owner: 'Q', i: 0, j: 1}, 'an unknown strip']]) refuse(p, fresh, action, why);
  for (const [board, why] of [[{...fresh.board, lists: {...q.lists, A: 'XX' + q.squares.slice(2)}}, 'a strip with a letter twice'], [{...fresh.board, lists: {...q.lists, Q: 'AB'}}, 'an unknown strip'], [(({lists, ...r}) => r)(fresh.board), 'missing strips']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkLast(p, fresh, row) {
  const q = p.parameters, ex = p.solution.example, t = tables(q, ex.lists), m = fromKey(t, ex.pairing);
  assert.equal(blockingPairs(t, m).length, 0, `${p.id}: the example can stay`);
  assert.equal(lastCount(t, m), row.most, `${p.id}: the example has three last choices`);
  assert.equal(q.goal, row.most, `${p.id}: the goal is the most possible`);
  let a = fresh;
  for (const o of [...q.circles, ...q.squares]) { let cur = a.board.lists[o]; while (cur !== ex.lists[o]) { const i = [...cur].findIndex((x, n) => x !== ex.lists[o][n]), j = cur.indexOf(ex.lists[o][i]); a = play(p, a, {type: 'swap', owner: o, i, j}); cur = a.board.lists[o]; } }
  for (let i = 0; i < 3; i++) if (a.board.pairing[i] !== ex.pairing[i]) a = play(p, a, {type: 'pair', c: q.circles[i], s: ex.pairing[i]});
  assert.ok(isSolved(p, play(p, a, {type: 'stays'}).board), `${p.id}: the example solves`);
  let steps = 0;
  // Stays on the start: it can stay, with no last choices: no solve.
  const short = play(p, fresh, {type: 'stays'});
  assert.ok(!isSolved(p, short.board) && short.board.said === 'stays', `${p.id}: a pairing that stays with too few last choices`);
  refuse(p, short, {type: 'stays'}, 'Stays twice');
  steps += hintsSolve(p, short, 'after too few last choices');
  // A pairing that can't stay is held until a blocking pair is tapped.
  const t0 = tables(q, q.lists), bad = PERMS[3].find(x => blockingPairs(t0, x).length);
  let h = fresh;
  for (let i = 0; i < 3; i++) if (h.board.pairing[i] !== keyOf(t0, bad)[i]) h = play(p, h, {type: 'pair', c: q.circles[i], s: keyOf(t0, bad)[i]});
  h = play(p, h, {type: 'stays'});
  assert.equal(h.board.pending, true, `${p.id}: a wrong Stays holds`);
  steps += hintsSolve(p, h, 'after a wrong Stays');
  refuse(p, fresh, {type: 'all'}, 'That’s all');
  refuse(p, fresh, {type: 'block', c: 'A', s: 'Y'}, 'a claim before Stays');
  for (const [board, why] of [[{...fresh.board, said: 'stays', pending: true}, 'Stays both kept and held'], [{...fresh.board, pairing: 'XXZ'}, 'a square twice'], [{...fresh.board, kept: []}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function commonRefusals(p, fresh) {
  for (const [action, why] of [[null, 'nothing'], ['stays', 'a string'], [{type: 'fly'}, 'an unknown move'], [{type: 'pair'}, 'a pair with no letters'], [{type: 'block', c: 'A', s: 'A'}, 'a claim on one side'], [{type: 'size', size: 2}, 'a playground size']]) refuse(p, fresh, action, why);
  assert.equal(validBoard(p, null), false, `${p.id}: rejects no board`);
  assert.equal(validBoard(p, []), false, `${p.id}: rejects a list`);
}

function checkPlayground(p, fresh) {
  const q = p.parameters;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  assert.equal(nextHint(p, fresh).type, 'done');
  for (const [n, m] of Object.entries(q.markets)) {
    let a = Number(n) === fresh.board.size ? fresh : play(p, fresh, {type: 'size', size: Number(n)});
    assert.equal(a.board.size, Number(n));
    const t = tables(m, m.lists), keys = stableKeys(t);
    for (const key of keys) { for (let i = 0; i < key.length; i++) if (a.board.pairing[i] !== key[i]) a = play(p, a, {type: 'pair', c: m.circles[i], s: key[i]}); a = play(p, a, {type: 'stays'}); }
    assert.deepEqual(a.board.kept, keys, `${p.id}: ${n} pairs keeps every one`);
    assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
    refuse(p, a, {type: 'all'}, 'That’s all in the playground');
    const changed = play(p, a, {type: 'swap', owner: 'A', i: 0, j: 1});
    assert.deepEqual(changed.board.kept, [], `${p.id}: changing a strip clears the shelf`);
  }
  refuse(p, fresh, {type: 'size', size: 7}, 'an unknown size');
  refuse(p, fresh, {type: 'size', size: fresh.board.size}, 'the same size');
  for (const [board, why] of [[{...fresh.board, size: 7}, 'an unknown size'], [{...fresh.board, kept: ['ZZZ']}, 'a kept pairing that isn’t one'], [{...fresh.board, claimed: false}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}
export default validateMatching;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateMatching(), null, 2));
