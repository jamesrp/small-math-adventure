// Checks the Flat folds pack (dist/families/creases/creases.json): content
// fields and sources; every answer recomputed by methods unlike the
// mechanic's incremental search over layer orders: the crimp reduction
// (Bern–Hayes, Hull) written afresh here, a brute force over every layer
// order (foldcheck.py's conditions, ported), and the answers foldcheck.py
// itself printed (embedded below); right-angle disks by Maekawa's parity;
// the mechanic cross-checked against the crimp on random patterns of 4, 6
// and 8 rays; witnesses played as moves; hint chains from fresh, after
// wrong moves, after refused claims and after Undo; how often random
// tapping solves a puzzle or a certificate; illegal moves; forged saves.
// Run: node scripts/validate-creases.mjs
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';
import {validWords, foldResult} from '../dist/families/creases/fold.js';

// The table in docs/creases/README.md. random: how many of the random taps
// counted below win, out of how many: letters on the open rays (a fold), a
// colouring after Can't (a can't), a use of all the tabs or a marking of
// every disk (tabs), a free tick and letters (a ray).
const TABLE = {
  'creases-01': {level: 'easy', mode: 'ray', at: 300, words: 6, random: [6, 336]},
  'creases-02': {level: 'easy', mode: 'fold', words: ['MMMV'], random: [1, 4]},
  'creases-03': {level: 'easy', mode: 'tabs', ways: 4, random: [4, 15]},
  'creases-04': {level: 'easy', mode: 'fold', words: [], cant: 'odd', random: [14, 128]},
  'creases-05': {level: 'medium', mode: 'fold', words: ['MVVV'], random: [1, 4]},
  'creases-06': {level: 'medium', mode: 'tabs', ways: 0, odd: [1, 2], random: [1, 8]},
  'creases-07': {level: 'medium', mode: 'ray', at: 270, words: 4, random: [4, 336]},
  'creases-08': {level: 'medium', mode: 'fold', words: [], cant: 'gap', random: [2, 16]},
  'creases-09': {level: 'hard', mode: 'fold', words: ['VVMMMMVM', 'VVMMMVMM'], random: [2, 32]},
  'creases-10': {level: 'hard', mode: 'fold', words: [], cant: 'gap', random: [2, 64]},
  'creases-11': {level: 'hard', mode: 'tabs', ways: 8, random: [8, 70]},
  'creases-12': {level: 'hard', mode: 'ray', at: 330, words: 18, random: [18, 1216]}
};
// Design ceilings on the random share, with room below each to catch a
// regression that the exact counts above would also catch: a fold's letters
// by level (two open rays can't go below one in four), a certificate
// colouring (one in eight: a five-wedge odd disk, at 10 in 32, fails), a
// marking of the tab disks, a use of the tabs by level, a ray.
const CEILING = {letters: {easy: 0.25, medium: 0.25, hard: 0.1}, colouring: 0.125, marking: 0.125, tabs: {easy: 0.3, medium: 0.2, hard: 0.15}, ray: 0.05};
// foldcheck.py's valid_words (brute force over layer orders, which agreed
// with its crimp_words) for every disk in the pack, printed on 2026-10-17
// from plans/review/checks/week-28/foldcheck.py.
const FOLDCHECK = {
  '60,120,120,60': ['MMMV', 'MVMM', 'MVVV', 'VMMM', 'VMVV', 'VVVM'],
  '30,60,150,120': ['MVMM', 'MVVV', 'VMMM', 'VMVV'],
  '30,30,30,60,60,30,60,60': ['MMVVMMVM', 'MMVVMVMM', 'MMVVVMVV', 'MMVVVVMV', 'MVMVMMVM', 'MVMVMVMM', 'MVMVVMVV', 'MVMVVVMV', 'MVVMMMVM', 'MVVMMVMM', 'MVVMVMVV', 'MVVMVVMV', 'VMMVMMVM', 'VMMVMVMM', 'VMMVVMVV', 'VMMVVVMV', 'VMVMMMVM', 'VMVMMVMM', 'VMVMVMVV', 'VMVMVVMV', 'VVMMMMVM', 'VVMMMVMM', 'VVMMVMVV', 'VVMMVVMV'],
  '30,30,60,60,60,60,60': [],
  '45,90,90,135': [],
  '30,30,30,60,90,120': [],
  '90,90,90,90': ['MMMV', 'MMVM', 'MVMM', 'MVVV', 'VMMM', 'VMVV', 'VVMV', 'VVVM'],
  '60,90,120,90': ['MVMM', 'MVVV', 'VMMM', 'VMVV'],
  '30,60,60,90,90,30': ['MMMVMV', 'MMVMMV', 'MMVVVV', 'MVMMMV', 'MVMVMM', 'MVMVVV', 'MVVMMM', 'MVVMVV', 'MVVVVM', 'VMMMMV', 'VMMVMM', 'VMMVVV', 'VMVMMM', 'VMVMVV', 'VMVVVM', 'VVMMMM', 'VVMVVM', 'VVVMVM']
};
// The only tick where the missing ray lets each ray puzzle close, by
// foldcheck.py over all 24 ticks.
const FOLDCHECK_RAY = {'0,60,180': [300], '0,60,150': [270], '0,30,90,150,240': [330]};

const sum = xs => xs.reduce((a, b) => a + b, 0);
const allWords = n => Array.from({length: 2 ** n}, (_, m) => [...m.toString(2).padStart(n, '0')].map(c => (c === '1' ? 'V' : 'M')).join(''));
const sectors = rays => { const r = [...rays].sort((a, b) => a - b); return r.map((x, k) => (k + 1 < r.length ? r[k + 1] : r[0] + 360) - x); };

// The crimp reduction: crimp any wedge no larger than its neighbours whose
// two creases differ (the wedge and its creases fold up like a Z and the
// three wedges become one), and finish with two equal creases on a straight
// line. Wedge k lies between ray k and ray k + 1 (0-based).
function crimpFolds(angles, word) {
  let a = [...angles], w = [...word];
  if (a.length % 2 || sum(a.filter((_, k) => k % 2 === 0)) !== sum(a.filter((_, k) => k % 2))) return false;
  while (a.length > 2) {
    const n = a.length;
    const i = a.findIndex((x, k) => x <= a[(k + n - 1) % n] && x <= a[(k + 1) % n] && w[k] !== w[(k + 1) % n]);
    if (i < 0) return false;
    const r = (i + n - 1) % n, a2 = [...a.slice(r), ...a.slice(0, r)], w2 = [...w.slice(r), ...w.slice(0, r)];
    a = [a2[0] - a2[1] + a2[2], ...a2.slice(3)];
    w = [w2[0], ...w2.slice(3)];
  }
  return w[0] === w[1];
}
const crimpWords = angles => allWords(angles.length).filter(w => crimpFolds(angles, w));

// foldcheck.py's brute force: every bottom-to-top order of the wedges, with
// its three conditions, and the word read off each legal order.
function* permutations(xs) {
  if (xs.length <= 1) { yield xs; return; }
  for (let i = 0; i < xs.length; i++) for (const rest of permutations([...xs.slice(0, i), ...xs.slice(i + 1)])) yield [xs[i], ...rest];
}
function bruteWords(angles) {
  const n = angles.length, s = angles.map((_, k) => (k % 2 ? -1 : 1)), theta = [0];
  for (let k = 0; k < n; k++) theta.push(theta[k] + s[k] * angles[k]);
  if (n % 2 || theta[n] !== 0) return [];
  const iv = angles.map((_, k) => [Math.min(theta[k], theta[k + 1]), Math.max(theta[k], theta[k + 1])]);
  const found = new Set();
  for (const perm of permutations([...Array(n).keys()])) {
    const h = Array(n); perm.forEach((sec, pos) => { h[sec] = pos; });
    const cs = [];
    let ok = true;
    for (let k = 0; k < n && ok; k++) {
      const i = (k + n - 1) % n, j = k, x = theta[k], lo = Math.min(h[i], h[j]), hi = Math.max(h[i], h[j]);
      for (let m = 0; m < n; m++) if (m !== i && m !== j && iv[m][0] < x && x < iv[m][1] && lo < h[m] && h[m] < hi) ok = false;
      cs.push([x, s[k], lo, hi]);
    }
    for (let p = 0; p < n && ok; p++) for (let q = p + 1; q < n && ok; q++) {
      const [x1, s1, l1, h1] = cs[p], [x2, s2, l2, h2] = cs[q];
      if (x1 !== x2) continue;
      if (s1 === s2 ? (l1 < l2 && l2 < h1) + (l1 < h2 && h2 < h1) === 1 : !(h1 < l2 || h2 < l1)) ok = false;
    }
    if (!ok) continue;
    found.add(Array.from({length: n}, (_, k) => { const i = (k + n - 1) % n, up = s[i] === 1 ? i : k, down = up === i ? k : i; return h[down] > h[up] ? 'V' : 'M'; }).join(''));
  }
  return [...found].sort();
}
const fits = (fixed, w) => fixed.every((f, k) => !f || w[k] === f);
const blanksOf = d => d.fixed.map((f, k) => (f ? -1 : k)).filter(k => k >= 0);
// Right-angle disks: Maekawa's parity (one or three mountains) and nothing
// else, so the M tabs a disk can take follow from its printed letters.
const rightWords = d => allWords(4).filter(w => fits(d.fixed, w) && [1, 3].includes([...w].filter(c => c === 'M').length));
function tabWays(q) {
  let ways = [[]];
  for (const d of q.disks) ways = ways.flatMap(prefix => rightWords(d).map(w => [...prefix, w]));
  return ways.filter(ws => sum(ws.map((w, i) => blanksOf(q.disks[i]).filter(k => w[k] === 'M').length)) === q.stock.M);
}

export async function validateCreases() {
  const pack = await loadPack(), list = pack.puzzles.filter(p => p.mechanic === 'creases'), report = {};
  const puzzles = list.filter(p => p.parameters.mode !== 'playground');
  assert.equal(puzzles.length, 12, '12 puzzles');
  assert.equal(list.length, 13, 'and a playground');
  assert.deepEqual(puzzles.map(p => p.id).sort(), Object.keys(TABLE).sort(), 'the table names every puzzle');
  for (const level of ['easy', 'medium', 'hard']) assert.equal(puzzles.filter(p => p.difficulty_level === level).length, 4, `4 ${level} puzzles`);
  for (const p of list) {
    for (const key of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id}: ${key}`);
    assert.equal(p.hints.length, 3, `${p.id}: three hints`);
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id}: parent.${key}`);
    for (const id of p.parent.sourceIds) assert.ok(pack.sources.some(s => s.id === id), `${p.id}: source ${id}`);
    assert.match(p.controls, /^A crease is a mountain \(M\)/, `${p.id}: How to play opens with the mathematics`);
    assert.ok(!/press can.t/i.test(p.hints[0]), `${p.id}: the first hint is not a claim`);
    assert.ok(!/(fold|close)s? flat\?/i.test(p.title), `${p.id}: no will-it-fold question in the title`);
  }

  // Answers, three ways where the disks are small enough.
  const checkWords = (angles, label) => {
    const key = angles.join(','), crimp = crimpWords(angles);
    assert.deepEqual(crimp, FOLDCHECK[key], `${label}: the crimp agrees with foldcheck.py`);
    if (angles.length <= 7) assert.deepEqual(bruteWords(angles), FOLDCHECK[key], `${label}: the brute force agrees with foldcheck.py`);
    assert.deepEqual(validWords(angles), crimp, `${label}: the mechanic agrees`);
    return crimp;
  };
  for (const p of puzzles) {
    const q = p.parameters, t = TABLE[p.id];
    assert.equal(p.difficulty_level, t.level, `${p.id}: level`);
    assert.equal(q.mode, t.mode, `${p.id}: mode`);
    if (q.mode === 'fold') {
      assert.equal(sum(q.angles), 360, `${p.id}: a whole disk`);
      const words = checkWords(q.angles, p.id).filter(w => fits(q.fixed, w));
      assert.deepEqual(words, t.words, `${p.id}: completions`);
      if (!words.length) {
        // The colouring certificate is right only for an odd count or a gap
        // in the alternating sums, never for letters alone.
        const odd = q.angles.length % 2 === 1, gap = sum(q.angles.filter((_, k) => k % 2 === 0)) !== 180;
        assert.equal(odd ? 'odd' : gap ? 'gap' : 'letters', t.cant, `${p.id}: why it can't`);
        assert.deepEqual(p.solution, odd ? {cant: 'odd', rays: q.angles.length} : {cant: 'gap', sums: [sum(q.angles.filter((_, k) => k % 2 === 0)), sum(q.angles.filter((_, k) => k % 2))]}, `${p.id}: solution`);
      } else assert.deepEqual(p.solution.words, t.words, `${p.id}: solution`);
    }
    if (q.mode === 'tabs') {
      assert.equal(sum(q.disks.map(d => blanksOf(d).length)), q.stock.M + q.stock.V, `${p.id}: a tab for every open ray`);
      for (const d of q.disks) {
        assert.deepEqual(d.angles, [90, 90, 90, 90], `${p.id}: right angles`);
        assert.deepEqual(checkWords(d.angles, p.id).filter(w => fits(d.fixed, w)), rightWords(d), `${p.id}: Maekawa's parity is the whole story on right angles`);
      }
      const ways = tabWays(q);
      assert.equal(ways.length, t.ways, `${p.id}: ways`);
      if (ways.length) assert.deepEqual(p.solution.ways, ways.map(ws => ws.join('/')).sort(), `${p.id}: solution`);
      else {
        // The certificate: the disks whose every folding completion takes an
        // odd number of M tabs; the rest take an even number, so the parity
        // of the M tabs used is fixed, and the stock has the other parity.
        const parities = q.disks.map(d => new Set(rightWords(d).map(w => blanksOf(d).filter(k => w[k] === 'M').length % 2)));
        assert.ok(parities.every(s => s.size === 1), `${p.id}: every disk has one parity`);
        const odd = parities.map((s, i) => (s.has(1) ? i : -1)).filter(i => i >= 0);
        assert.deepEqual(odd, t.odd, `${p.id}: the certificate disks`);
        assert.notEqual(odd.length % 2, q.stock.M % 2, `${p.id}: the stock has the other parity`);
        assert.deepEqual(p.solution.disks, t.odd, `${p.id}: solution`);
        assert.deepEqual(p.solution.marks, q.disks.map((_, i) => (odd.includes(i) ? 'odd' : 'even')), `${p.id}: the marks`);
      }
    }
    if (q.mode === 'ray') {
      assert.equal(q.rays[0], 0, `${p.id}: ray 1 at the top`);
      const ticks = Array.from({length: 24}, (_, k) => k * 15).filter(at => !q.rays.includes(at));
      const good = ticks.filter(at => crimpWords(sectors([...q.rays, at])).length > 0);
      assert.deepEqual(good, FOLDCHECK_RAY[q.rays.join(',')], `${p.id}: the one tick, by the crimp and foldcheck.py`);
      assert.deepEqual(good, [t.at], `${p.id}: where the ray goes`);
      assert.equal(checkWords(sectors([...q.rays, t.at]), p.id).length, t.words, `${p.id}: labellings that fold`);
      assert.equal(p.solution.at, t.at, `${p.id}: solution`);
    }
  }

  // The mechanic against the crimp on random disks (4, 6 and 8 rays on
  // 15-degree ticks, alternate wedges making half-turns), and on disks that
  // can't close.
  let seed = 28;
  const rand = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const half = k => { const cuts = new Set(); while (cuts.size < k - 1) cuts.add(1 + rand(11)); const c = [0, ...[...cuts].sort((a, b) => a - b), 12]; return c.slice(1).map((x, i) => (x - c[i]) * 15); };
  let compared = 0;
  for (const [n, count] of [[4, 40], [6, 30], [8, 6]]) for (let r = 0; r < count; r++) {
    const o = half(n / 2), e = half(n / 2), angles = o.flatMap((x, k) => [x, e[k]]);
    assert.deepEqual(validWords(angles), crimpWords(angles), `random ${angles}: mechanic and crimp agree`);
    if (n <= 6) assert.deepEqual(crimpWords(angles), bruteWords(angles), `random ${angles}: crimp and brute force agree`);
    compared++;
  }
  for (const angles of [[120, 120, 120], [60, 90, 60, 90, 60], [30, 60, 90, 180], [15, 30, 45, 60, 90, 120]]) {
    assert.deepEqual(validWords(angles), [], `${angles}: nothing folds`);
    assert.equal(foldResult(angles, 'M'.repeat(angles.length)).kind, angles.length % 2 ? 'clash' : 'gap', `${angles}: the right reason`);
  }
  report.randomDisksCompared = compared;

  // Witnesses and the certificate flows, as moves.
  const mech = mechanicFor(puzzles[0]);
  const carry = (p, from, to) => ({...to, board: mech.carry(p, from.board, to.board)});
  const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, a);
  const labelMoves = (q, word, from) => [...word].map((c, k) => (q.fixed[k] || from[k] === c ? null : {type: 'label', ray: k, to: c})).filter(Boolean);
  const witness = p => {
    const q = p.parameters, t = TABLE[p.id];
    if (q.mode === 'fold' && t.words.length) return [...labelMoves(q, t.words[0], q.fixed), {type: 'fold'}];
    if (q.mode === 'fold') {
      const n = q.angles.length;
      return [...labelMoves(q, 'M'.repeat(n), q.fixed), {type: 'fold'}, {type: 'cant'}, ...Array.from({length: n}, (_, k) => ({type: 'paint', sector: k, to: k % 2 ? 'B' : 'F'})), {type: 'check'}];
    }
    if (q.mode === 'tabs') {
      const tabs = [];
      if (t.ways) p.solution.ways[0].split('/').forEach((w, i) => [...w].forEach((c, k) => { if (!q.disks[i].fixed[k]) tabs.push({type: 'tab', disk: i, ray: k, to: c}); }));
      else {
        // Any placement, M tabs first.
        let m = q.stock.M;
        q.disks.forEach((d, i) => blanksOf(d).forEach(k => { tabs.push({type: 'tab', disk: i, ray: k, to: m-- > 0 ? 'M' : 'V'}); }));
      }
      // A tap marks a disk as taking one M tab and one V tab, a second tap as
      // taking two the same.
      return t.ways ? [...tabs, {type: 'fold'}] : [...tabs, {type: 'fold'}, {type: 'cant'}, ...q.disks.flatMap((_, d) => Array(t.odd.includes(d) ? 1 : 2).fill({type: 'pick', disk: d})), {type: 'check'}];
    }
    const angles = sectors([...q.rays, t.at]), word = validWords(angles)[0], order = [...q.rays.map((r, k) => [r, k]), [t.at, q.rays.length]].sort((x, y) => x[0] - y[0]).map(([, k]) => k);
    return [{type: 'place', at: t.at}, ...[...word].map((c, pos) => ({type: 'label', ray: order[pos], to: c})), {type: 'fold'}];
  };
  for (const p of puzzles) {
    const a = play(p, freshAttempt(p), witness(p));
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves it`);
  }

  // Hints alone solve every puzzle from fresh, after a wrong move, after a
  // refused claim and after Undo; a hint is never a claim first.
  const runHints = (p, a, label) => {
    for (let i = 0; i < 80 && !isSolved(p, a.board); i++) {
      const h = nextHint(p, a);
      assert.equal(h.type, 'move', `${p.id} ${label}: ${h.text}`);
      const next = move(p, a, h.action);
      assert.ok(next, `${p.id} ${label}: the hint ${JSON.stringify(h.action)} is legal`);
      a = next;
    }
    assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints solve it`);
    return a;
  };
  const steps = {};
  for (const p of puzzles) {
    const q = p.parameters, fresh = freshAttempt(p), first = nextHint(p, fresh);
    assert.notEqual(first.action?.type, 'cant', `${p.id}: the first hint is not Can't`);
    assert.notEqual(first.action?.type, 'check', `${p.id}: nor Check`);
    let a = fresh, n = 0;
    for (; !isSolved(p, a.board) && n < 80; n++) a = move(p, a, nextHint(p, a).action);
    steps[p.id] = n;
    runHints(p, fresh, 'from fresh');
    // A wrong move: a letter or tab that no answer uses there, or the ray
    // in the wrong place.
    let wrong;
    if (q.mode === 'fold') { const k = q.fixed.findIndex(f => !f); wrong = {type: 'label', ray: k, to: TABLE[p.id].words[0]?.[k] === 'M' ? 'V' : 'M'}; }
    if (q.mode === 'tabs') { const i = q.disks.findIndex(d => blanksOf(d).length), k = blanksOf(q.disks[i])[0]; wrong = {type: 'tab', disk: i, ray: k, to: TABLE[p.id].ways && p.solution.ways.every(w => w.split('/')[i][k] === 'M') ? 'V' : 'M'}; }
    if (q.mode === 'ray') wrong = {type: 'place', at: (TABLE[p.id].at + 45) % 360};
    const w1 = move(p, fresh, wrong);
    assert.ok(w1, `${p.id}: the wrong move is legal`);
    runHints(p, w1, 'after a wrong move');
    // A wrong fold, then a claim: a refused Can't on a possible puzzle, a
    // refused certificate on an impossible one; hints from there and after
    // Undo of the refusal.
    if (q.mode === 'ray') continue;
    const tried = q.mode === 'fold'
      ? play(p, fresh, [...labelMoves(q, TABLE[p.id].words.length ? allWords(q.angles.length).find(w => fits(q.fixed, w) && !TABLE[p.id].words.includes(w)) : 'V'.repeat(q.angles.length), q.fixed), {type: 'fold'}])
      : play(p, fresh, (() => { let m = q.stock.M; const out = []; q.disks.forEach((d, i) => blanksOf(d).forEach(k => out.push({type: 'tab', disk: i, ray: k, to: m-- > 0 ? 'M' : 'V'}))); return out; })().concat([{type: 'fold'}]));
    assert.ok(!isSolved(p, tried.board), `${p.id}: that attempt fails`);
    assert.equal(move(p, fresh, {type: 'cant'}), null, `${p.id}: Can't needs an attempt first`);
    const claiming = move(p, tried, {type: 'cant'});
    assert.ok(claiming, `${p.id}: Can't after a fold`);
    const marks = q.mode === 'fold'
      ? q.angles.map((_, k) => ({type: 'paint', sector: k, to: 'F'}))
      : q.disks.map((_, d) => ({type: 'pick', disk: d}));
    if (q.mode === 'tabs') assert.equal(move(p, play(p, claiming, marks.slice(1)), {type: 'check'}), null, `${p.id}: Check waits for every disk`);
    const checked = move(p, play(p, claiming, marks), {type: 'check'});
    assert.ok(checked && !isSolved(p, checked.board), `${p.id}: a wrong or early claim is refused`);
    const possible = TABLE[p.id].words?.length || TABLE[p.id].ways;
    assert.equal(checked.board.told, possible ? 'way' : q.mode === 'fold' ? 'match' : 'pick', `${p.id}: the refusal`);
    runHints(p, checked, 'after a refused claim');
    if (possible) {
      // The refusal stays through Undo until the board changes, and Can't
      // stays off meanwhile.
      const back = carry(p, checked, undo(checked));
      assert.equal(back.board.told, 'way', `${p.id}: Undo keeps There is a way`);
      assert.notDeepEqual(back.board, checked.board, `${p.id}: Undo still changes the board`);
      const back2 = carry(p, back, undo(back));
      assert.equal(back2.board.told, 'way', `${p.id}: and again`);
      assert.equal(move(p, checked, {type: 'cant'}), null, `${p.id}: Can't stays off after There is a way`);
      assert.equal(move(p, back2, {type: 'check'}), null, `${p.id}: and Check stays off after Undo`);
      const changed = q.mode === 'fold'
        ? move(p, checked, {type: 'label', ray: q.fixed.findIndex(f => !f), to: checked.board.labels[q.fixed.findIndex(f => !f)] === 'M' ? 'V' : 'M'})
        : move(p, checked, {type: 'tab', disk: q.disks.findIndex(d => blanksOf(d).length), ray: blanksOf(q.disks.find(d => blanksOf(d).length))[0], to: null});
      assert.equal(changed.board.told, null, `${p.id}: a change to the board clears the refusal`);
      runHints(p, back, 'after Undo of a refusal');
    } else runHints(p, carry(p, checked, undo(checked)), 'after Undo of a refusal');
  }
  report.hintSteps = steps;

  // How often random tapping wins: random letters on the open rays (a fold
  // puzzle), a random use of all the tabs, a random tick and letters for the
  // ray; and random certificates: a random colouring, a random marking of
  // every disk. Each count is the table's, and under its ceiling.
  const rates = {};
  const rate = (p, won, total, unit, ceiling) => {
    rates[p.id] = `${won}/${total} ${unit}`;
    assert.deepEqual([won, total], TABLE[p.id].random, `${p.id}: random ${unit}`);
    assert.ok(won / total <= ceiling, `${p.id}: random ${unit} win at most ${ceiling} of the time`);
  };
  for (const p of puzzles) {
    const q = p.parameters, t = TABLE[p.id];
    if (q.mode === 'fold' && t.words.length) {
      const open = q.fixed.filter(f => !f).length;
      rate(p, allWords(open).filter(w => { const word = q.fixed.map(f => f); let i = 0; word.forEach((f, k) => { if (!f) word[k] = w[i++]; }); return validWords(q.angles).includes(word.join('')); }).length, 2 ** open, 'letterings', CEILING.letters[t.level]);
    }
    if (q.mode === 'fold' && !t.words.length) {
      const n = q.angles.length, mech2 = mechanicFor(p);
      const won = allWords(n).map(w => w.replace(/M/g, 'F').replace(/V/g, 'B')).filter(paint => {
        const b = {labels: q.fixed.map(f => f || 'M'), tried: q.fixed.map(f => f || 'M').join(''), paint, told: null, done: null};
        assert.ok(mech2.valid(p, b), `${p.id}: a colouring board`);
        return mech2.move(p, b, {type: 'check'})?.done === 'cant';
      }).length;
      rate(p, won, 2 ** n, 'colourings', CEILING.colouring);
    }
    if (q.mode === 'tabs' && t.ways) {
      const slots = q.disks.flatMap((d, i) => blanksOf(d).map(k => [i, k]));
      let total = 0, won = 0;
      for (let m = 0; m < 2 ** slots.length; m++) {
        const bits = [...m.toString(2).padStart(slots.length, '0')];
        if (bits.filter(c => c === '1').length !== q.stock.M) continue;
        total++;
        const words = q.disks.map((d, i) => d.fixed.map((f, k) => f || (bits[slots.findIndex(([a, b]) => a === i && b === k)] === '1' ? 'M' : 'V')).join(''));
        if (words.every((w, i) => rightWords({...q.disks[i], fixed: [...w]}).length === 1)) won++;
      }
      assert.equal(won, t.ways, `${p.id}: the ways again, by placements`);
      rate(p, won, total, 'placements', CEILING.tabs[t.level]);
    }
    if (q.mode === 'tabs' && !t.ways) {
      const d = q.disks.length, mech2 = mechanicFor(p), sol = witness(p), tried = play(p, freshAttempt(p), sol.slice(0, sol.findIndex(x => x.type === 'cant') + 1)).board;
      let won = 0;
      for (let m = 0; m < 2 ** d; m++) {
        const pick = [...Array(d).keys()].map(i => ((m >> i) & 1 ? 'odd' : 'even'));
        assert.ok(mech2.valid(p, {...tried, pick}), `${p.id}: a marking board`);
        if (mech2.move(p, {...tried, pick}, {type: 'check'})?.done === 'cant') won++;
      }
      assert.equal(won, 1, `${p.id}: one marking certifies`);
      rate(p, won, 2 ** d, 'markings', CEILING.marking);
    }
    if (q.mode === 'ray') {
      const ticks = Array.from({length: 24}, (_, k) => k * 15).filter(at => !q.rays.includes(at)), n = q.rays.length + 1;
      const won = sum(ticks.map(at => crimpWords(sectors([...q.rays, at])).length));
      assert.equal(won, t.words, `${p.id}: only the one tick folds`);
      rate(p, won, ticks.length * 2 ** n, 'places and letterings', CEILING.ray);
    }
  }
  report.randomTapSuccess = rates;

  // Illegal moves.
  const illegal = (p, b, action, why) => assert.equal(mechanicFor(p).move(p, b, action), null, `${p.id}: ${why}`);
  for (const p of puzzles) {
    const q = p.parameters, b = freshAttempt(p).board;
    illegal(p, b, {type: 'fold'}, 'Fold with open rays');
    illegal(p, b, {type: 'cant'}, 'Can’t on a fresh board');
    illegal(p, b, {type: 'check'}, 'Check without a claim');
    illegal(p, b, {type: 'jump'}, 'an unknown move');
    if (q.mode === 'fold') {
      const k = q.fixed.findIndex(Boolean);
      if (k >= 0) illegal(p, b, {type: 'label', ray: k, to: q.fixed[k] === 'M' ? 'V' : 'M'}, 'a printed letter');
      illegal(p, b, {type: 'label', ray: q.angles.length, to: 'M'}, 'a ray that is not there');
      illegal(p, b, {type: 'label', ray: q.fixed.findIndex(f => !f), to: 'X'}, 'a letter that is not M or V');
      illegal(p, b, {type: 'paint', sector: 0, to: 'F'}, 'colouring without Can’t');
    }
    if (q.mode === 'tabs') {
      const i = q.disks.findIndex(d => d.fixed.some(Boolean)), k = q.disks[i].fixed.findIndex(Boolean);
      illegal(p, b, {type: 'tab', disk: i, ray: k, to: 'V'}, 'a tab on a printed ray');
      illegal(p, b, {type: 'tab', disk: q.disks.length, ray: 0, to: 'M'}, 'a disk that is not there');
      illegal(p, b, {type: 'pick', disk: 0}, 'a disk picked without Can’t');
      // More M tabs than the stock.
      let x = b, placed = 0;
      for (const [di, d] of q.disks.entries()) for (const kk of blanksOf(d)) { if (placed < q.stock.M) { x = mechanicFor(p).move(p, x, {type: 'tab', disk: di, ray: kk, to: 'M'}); placed++; } }
      const spare = q.disks.flatMap((d, di) => blanksOf(d).map(kk => [di, kk])).find(([di, kk]) => x.at[di][kk] === null);
      illegal(p, x, {type: 'tab', disk: spare[0], ray: spare[1], to: 'M'}, 'an M tab the stock doesn’t have');
    }
    if (q.mode === 'ray') {
      illegal(p, b, {type: 'place', at: q.rays[1]}, 'the new ray on a given ray');
      illegal(p, b, {type: 'place', at: 7}, 'the new ray off a tick');
      illegal(p, b, {type: 'place', at: 360}, 'the new ray off the disk');
      illegal(p, b, {type: 'cant'}, 'Can’t (a ray always works)');
    }
  }
  const play0 = list.find(p => p.parameters.mode === 'playground'), pb = freshAttempt(play0).board, pm = mechanicFor(play0);
  assert.equal(pm.move(play0, pb, {type: 'add', at: 90}), null, 'playground: a ray where one is');
  assert.equal(pm.move(play0, pb, {type: 'add', at: 100}), null, 'playground: off a tick');
  let full = pb; for (const at of [15, 30, 45, 60]) full = pm.move(play0, full, {type: 'add', at});
  assert.equal(full.rays.length, 8, 'playground: eight rays');
  assert.equal(pm.move(play0, full, {type: 'add', at: 120}), null, 'playground: no ninth ray');
  assert.equal(pm.move(play0, pb, {type: 'fold'}), null, 'playground: Fold waits for letters');
  let lettered = freshAttempt(play0);
  for (const at of [0, 90, 180, 270]) lettered = move(play0, lettered, {type: 'label', at, to: at ? 'M' : 'V'});
  const foldedPlay = move(play0, lettered, {type: 'fold'});
  assert.ok(foldedPlay && validBoard(play0, foldedPlay.board), 'playground: a fold is a legal move and a valid save');
  assert.ok(!isSolved(play0, foldedPlay.board), 'playground: nothing to solve');
  assert.equal(nextHint(play0, freshAttempt(play0)).type, 'note', 'playground: no move hints');

  // Forged saves, including a forged done.
  const forged = (p, b, why) => { assert.equal(validBoard(p, b), false, `${p.id}: ${why}`); assert.equal(isSolved(p, b), false, `${p.id}: ${why} is not solved`); };
  for (const p of puzzles) {
    const q = p.parameters, b = freshAttempt(p).board, t = TABLE[p.id];
    forged(p, {...b, extra: 1}, 'an extra field');
    forged(p, null, 'no board');
    if (q.mode === 'fold') {
      const n = q.angles.length, wrongWord = allWords(n).find(w => fits(q.fixed, w) && !t.words.includes(w));
      forged(p, {...b, labels: [...wrongWord], done: 'fold'}, 'done on letters that jam');
      forged(p, {...b, labels: [...wrongWord], tried: wrongWord, paint: 'F'.repeat(n), done: 'cant'}, 'Can’t with a colouring that is not a certificate');
      if (t.words.length) {
        forged(p, {...b, labels: [...t.words[0]], tried: wrongWord, paint: 'FB'.repeat(n).slice(0, n), done: 'cant'}, 'Can’t on a possible disk');
        forged(p, {...b, labels: [...t.words[0]], tried: t.words[0]}, 'a fold that worked recorded as tried');
      } else {
        forged(p, {...b, labels: [...wrongWord], told: 'way'}, 'There is a way on an impossible disk');
        forged(p, {...b, labels: q.fixed.map(f => f || 'M'), paint: 'F'.repeat(n)}, 'colours without a fold first');
      }
      if (q.fixed.some(Boolean)) forged(p, {...b, labels: b.labels.map((l, k) => (q.fixed[k] ? (q.fixed[k] === 'M' ? 'V' : 'M') : l))}, 'a changed printed letter');
    }
    if (q.mode === 'tabs') {
      const allM = b.at.map((labels, i) => labels.map((l, k) => l || (q.disks[i].fixed[k] ? l : 'M')));
      forged(p, {...b, at: allM}, 'more M tabs than the stock');
      if (t.ways) forged(p, {...b, done: 'cant', tried: 'x', pick: q.disks.map(() => 'odd')}, 'Can’t on a possible stock');
      else {
        const sol = witness(p), tried = play(p, freshAttempt(p), sol.slice(0, sol.findIndex(x => x.type === 'cant'))).board;
        const truth = q.disks.map((_, i) => (t.odd.includes(i) ? 'odd' : 'even'));
        forged(p, {...tried, pick: q.disks.map(() => 'odd'), done: 'cant'}, 'Can’t with the wrong marks');
        forged(p, {...tried, pick: truth.map((m, i) => (i ? m : null)), done: 'cant'}, 'Can’t with a disk unmarked');
        forged(p, {...tried, pick: t.odd, done: 'cant'}, 'Can’t with the old list of disks');
        forged(p, {...tried, done: 'fold'}, 'done on tabs that jam');
        forged(p, {...tried, pick: truth, done: 'cant', told: 'way'}, 'a done that was also refused');
        forged(p, {...tried, pick: truth, told: 'pick'}, 'a refusal that kept its marks');
      }
    }
    if (q.mode === 'ray') {
      forged(p, {...b, at: (t.at + 15) % 360 || 15, labels: b.labels.map(() => 'M'), done: true}, 'done with the ray in the wrong place');
      forged(p, {...b, at: q.rays[1]}, 'the new ray on a given ray');
      forged(p, {...b, done: 'yes'}, 'a done that is not true or false');
    }
  }
  forged(play0, {...pb, rays: [0, 45, 90, 135, 180, 225, 270, 315, 330], labels: Array(9).fill(null)}, 'nine rays');
  forged(play0, {...pb, rays: [90, 0, 180, 270]}, 'rays out of order');
  return report;
}
export default validateCreases;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateCreases(), null, 2));
