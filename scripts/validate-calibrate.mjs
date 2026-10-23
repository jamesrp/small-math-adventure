// Checks the Hidden machines pack (dist/families/calibrate/calibrate.json) by
// methods unlike the mechanic's: machines, request lengths, fits and repairs
// are enumerated afresh here; whether a position can always be won is an
// independent minimax over request lengths; slopes come from a grid eight
// times finer than the board's. Then the slippery machine: over every
// sequence of requests in every request puzzle, its reports fit the machines
// it keeps, those are exactly the machines that fit, and a round ends with
// one machine exactly when every request was one that always works, so no
// round is won or lost by luck. Then the claims in the grown-up notes; hint
// chains from fresh, after random play, after Undo and from lost rounds;
// illegal moves; wrong That’s all presses and pins refused and kept through
// Undo; forged saves; every Undo press changing the screen.
// Run: node scripts/validate-calibrate.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {play as keeperPlay} from '../dist/families/calibrate/calibrate.js';

// --- An independent model ------------------------------------------------------
const machinesFor = q => { const out = []; for (const c of q.copies) for (let e = q.extras[0]; e <= q.extras[1]; e++) out.push([c, e]); return out; };
const out = (m, L) => m[0] * L + m[1];
const name = m => `${m[0]}/${m[1]}`;
// Requests: one to q.tray different strips of the kit, laid end to end.
function requestsFor(q) {
  const names = Object.keys(q.kit).sort(), list = [];
  const grow = (from, chosen) => {
    if (chosen.length) list.push(chosen);
    if (chosen.length === q.tray) return;
    for (let i = from; i < names.length; i++) grow(i + 1, [...chosen, names[i]]);
  };
  grow(0, []);
  return list;
}
const lengthFor = (q, r) => r.reduce((t, s) => t + q.kit[s], 0);
const split = (ms, L) => { const g = {}; for (const m of ms) (g[out(m, L)] ||= []).push(m); return Object.values(g); };
// Whether every machine in ms can always be told apart with `left` more requests.
const memo = new Map();
function canWin(q, ms, left) {
  if (ms.length <= 1) return true;
  if (left === 0) return false;
  const key = `${JSON.stringify(q.kit)}|${q.tray}|${ms.map(name).join(' ')}|${left}`;
  if (memo.has(key)) return memo.get(key);
  const lengths = [...new Set(requestsFor(q).map(r => lengthFor(q, r)))];
  const win = lengths.some(L => split(ms, L).every(g => canWin(q, g, left - 1)));
  memo.set(key, win);
  return win;
}
// A request that always works from here: every report leaves a position that can be won.
const sure = (q, ms, left, L) => split(ms, L).every(g => canWin(q, g, left - 1));

const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next && next !== x, `${p.id}: ${JSON.stringify(action)} is legal from ${JSON.stringify(x.board)}`); return next; }, a);
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const takeBack = (p, a) => { const b = undo(a); return b === a ? a : {...b, board: mechanicFor(p).carry(p, a.board, b.board)}; };
const view = (p, a) => mechanicFor(p).render(p, {...a, hintLevel: 0}, {});
function seeded(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; }
function hintSolve(p, a, limit = 200) {
  let k = 0;
  while (!isSolved(p, a.board)) {
    const h = nextHint(p, a);
    // Never a dead end: the app would show one at once, judging a first pin before the second.
    assert.equal(h.type, 'move', `${p.id}: a hint names a move from ${JSON.stringify(a.board)} (${h.text || h.type})`);
    assert.ok(h.text && !/Press/.test(h.text), `${p.id}: hint text names the reason, not the button`);
    a = play(p, a, [h.action]);
    assert.ok(++k <= limit, `${p.id}: hints finish within ${limit} moves`);
  }
  return k;
}
// A random action of the kinds the board's controls make, legal or not.
function randomAction(q, b, rnd) {
  const pick = list => list[Math.floor(rnd() * list.length)], r = rnd();
  if (q.mode === 'find') {
    if (r < 0.35) return {type: 'strip', strip: pick(Object.keys(q.kit))};
    if (r < 0.55) return {type: 'send'};
    if (r < 0.9) return {type: 'dial', which: pick(['c', 'e']), value: Math.floor(rnd() * 8)};
    return r < 0.97 ? {type: 'name'} : {type: 'again'};
  }
  if (q.mode === 'every') return r < 0.1 ? {type: 'all'} : {type: 'dial', which: pick(['c', 'e']), value: Math.floor(rnd() * 8)};
  if (q.mode === 'build') return r < 0.1 ? {type: 'all'} : {type: 'set', which: pick([...q.rows.filter(x => x.length === undefined).map(x => x.name), 'e']), value: Math.floor(rnd() * (q.longest + 2))};
  if (q.mode === 'repair') return r < 0.1 ? {type: 'all'} : r < 0.4 ? {type: 'pick', row: Math.floor(rnd() * 4)} : {type: 'step', by: pick([1, -1])};
  return r < 0.2 ? {type: 'pin'} : {type: 'step', ref: pick([0, 1]), by: pick([1, -1])};
}
function wander(p, a, rnd, steps) {
  for (let s = 0; s < steps; s++) {
    const next = move(p, a, randomAction(p.parameters, a.board, rnd));
    if (next && !isSolved(p, next.board)) a = next;
  }
  return a;
}

export default async function validateCalibrate() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/calibrate/calibrate.json', import.meta.url), 'utf8'));
  const report = {puzzles: 0, sequences: 0, hintMoves: 0, wanders: 0, refusals: 0, forgeries: 0};
  assert.ok(pack.puzzles.length >= 8 && pack.puzzles.length <= 15);
  for (const p of pack.puzzles) {
    assert.equal(p.libraryFamily, 'ranges', `${p.id}: a group in Ruler strips`);
    assert.equal(p.group, 'Hidden machines');
    assert.ok(!/\d/.test(p.title), `${p.id}: no digits in the title`);
    checkAnswers(p);
    if (p.parameters.mode === 'find') report.sequences += checkKeeper(p);
    let a = freshAttempt(p);
    assert.ok(validBoard(p, a.board), `${p.id}: fresh board is valid`);
    assert.ok(!isSolved(p, a.board), `${p.id}: not solved at the start`);
    report.hintMoves += hintSolve(p, a);
    for (let s = 0; s < 6; s++) {
      const w = wander(p, freshAttempt(p), seeded(p.number * 131 + s), 30);
      report.hintMoves += hintSolve(p, w);
      report.hintMoves += hintSolve(p, takeBack(p, w));
      report.wanders++;
    }
    report.refusals += checkIllegal(p);
    report.refusals += checkRefusals(p);
    report.forgeries += checkSaves(p);
    checkUndoPresses(p);
    report.puzzles++;
  }
  checkClaims(pack);
  return report;
}

// Every answer, from the model alone.
function checkAnswers(p) {
  const q = p.parameters, s = p.solution;
  if (q.mode === 'find') {
    const ms = machinesFor(q);
    assert.equal(s.machines, ms.length, `${p.id}: machines`);
    assert.ok(canWin(q, ms, q.budget), `${p.id}: the round can always be won with ${q.budget} requests`);
    if (q.budget > 1) assert.ok(!canWin(q, ms, q.budget - 1), `${p.id}: and not with fewer`);
    assert.ok(!canWin(q, ms, 0), `${p.id}: naming at once never always works`);
    assert.equal(s.fewest, q.budget);
  }
  if (q.mode === 'every') {
    const fits = machinesFor(q).filter(m => q.given.every(([L, r]) => out(m, L) === r));
    assert.deepEqual(s.answers, fits.map(m => m.join(',')), `${p.id}: every machine that fits`);
    assert.equal(s.count, fits.length);
  }
  if (q.mode === 'build') {
    const names = q.rows.filter(r => r.length === undefined).map(r => r.name), found = [];
    const tryLens = (k, len) => {
      if (k === names.length) {
        for (let e = q.extras[0]; e <= q.extras[1]; e++) if (q.rows.every(r => (r.length ?? len[r.name]) + e === r.report)) found.push([...names.map(n => len[n]), e].join(','));
        return;
      }
      for (let v = 1; v <= q.longest; v++) tryLens(k + 1, {...len, [names[k]]: v});
    };
    tryLens(0, {});
    if (q.every) { assert.deepEqual([...s.answers].sort(), [...found].sort(), `${p.id}: every pair of lengths`); assert.equal(s.count, found.length); assert.ok(found.length > 1); }
    else { assert.equal(found.length, 1, `${p.id}: one answer`); assert.equal([...names.map(n => s.answer[n]), s.answer.e].join(','), found[0]); }
    // Every answer fits on the board's ruler and dials.
    for (const k of found) assert.ok(k.split(',').map(Number).slice(0, -1).every(v => v <= q.longest));
    assert.ok(q.rows.every(r => r.report <= q.ruler));
  }
  if (q.mode === 'repair') {
    const xs = q.rows.map(([x]) => x), found = [];
    // Fits by exact arithmetic on halves: the extra test, or the cross product for a line going up.
    const fits = ys => {
      if (q.machine === 'extra') { const d = ys.map((y, i) => y - xs[i]); return d.every(v => v === d[0]) && d[0] >= q.extras[0] && d[0] <= q.extras[1]; }
      const [X, Y] = [xs.map(x => 2 * x), ys.map(y => 2 * y)];
      const cross = (X[1] - X[0]) * (Y[2] - Y[0]) - (X[2] - X[0]) * (Y[1] - Y[0]);
      return cross === 0 && (Y[1] - Y[0]) * (X[1] - X[0]) > 0;
    };
    assert.ok(!fits(q.rows.map(([, y]) => y)), `${p.id}: the reports as given don’t fit one machine`);
    q.rows.forEach(([, y], i) => {
      for (let k = Math.round(q.lo / q.step); k <= Math.round(q.hi / q.step); k++) {
        const v = k * q.step;
        if (v !== y && fits(q.rows.map(([, w], j) => j === i ? v : w))) found.push(`${i}:${v}`);
      }
    });
    assert.deepEqual(s.answers, found, `${p.id}: every repair`);
    assert.equal(s.count, found.length);
    if (q.machine === 'extra') assert.ok(q.rows.every(([, y]) => y <= q.ruler));
    else assert.ok(found.every(k => Number(k.split(':')[1]) <= q.ymax) && q.rows.every(([x]) => x <= q.xmax));
  }
  if (q.mode === 'stretch') {
    const [[x1, d1], [x2, d2]] = q.refs, D = x2 - x1;
    let lo = Infinity, hi = -Infinity;
    for (let i = -8 * q.err; i <= 8 * q.err; i++) for (let j = -8 * q.err; j <= 8 * q.err; j++) {
      const slope = (d2 + j / 8 - (d1 + i / 8)) / D;
      lo = Math.min(lo, slope); hi = Math.max(hi, slope);
    }
    assert.equal(s.lo, lo, `${p.id}: the shallowest stretch`); assert.equal(s.hi, hi, `${p.id}: the steepest stretch`);
    assert.equal(hi - lo, 4 * q.err / D, `${p.id}: the range is 4e/D wide`);
    // The board's steps reach both extremes: they are the bars' opposite ends.
    assert.ok(Number.isInteger(q.err / q.step));
    assert.ok(q.refs.every(([x, d]) => x <= q.xmax && d + q.err <= q.ymax));
  }
}

// The slippery machine, over every sequence of requests up to the budget.
function checkKeeper(p) {
  const q = p.parameters, all = machinesFor(q), reqs = requestsFor(q);
  let n = 0;
  const walk = seq => {
    if (seq.length) {
      const {reports, alive} = keeperPlay(q, seq);
      assert.equal(reports.length, seq.length);
      // Its reports keep a machine, and it keeps exactly the machines that fit them.
      const fit = all.filter(m => seq.every((r, k) => out(m, lengthFor(q, r)) === reports[k]));
      assert.ok(fit.length >= 1, `${p.id}: the reports to ${JSON.stringify(seq)} fit some machine`);
      assert.deepEqual(alive.map(name).sort(), fit.map(name).sort(), `${p.id}: it keeps exactly the machines that fit`);
      // No luck: one machine is left exactly when every request always worked.
      let ms = all, allSure = true;
      seq.forEach((r, k) => {
        const L = lengthFor(q, r), left = q.budget - k;
        if (!sure(q, ms, left, L)) allSure = false;
        ms = ms.filter(m => out(m, L) === reports[k]);
        // A position that could be won stays winnable only after a request that always works; one that could not stays lost.
        assert.equal(canWin(q, ms, left - 1), allSure && canWin(q, all, q.budget), `${p.id}: after ${JSON.stringify(seq.slice(0, k + 1))}`);
      });
      if (seq.length === q.budget) assert.equal(alive.length === 1, allSure, `${p.id}: ${JSON.stringify(seq)} ends with one machine exactly when every request always worked`);
      n++;
      // Reports are replayed from saved requests: the same requests, the same reports.
      assert.deepEqual(keeperPlay(q, seq).reports, reports);
    }
    if (seq.length < q.budget) for (const r of reqs) walk([...seq, r]);
  };
  walk([]);
  return n;
}

// Illegal moves, from the board's rules alone.
function checkIllegal(p) {
  const q = p.parameters, a = freshAttempt(p), b = a.board;
  let n = 0;
  const no = (x, action, why) => { refuse(p, x, action, why); n++; };
  no(a, {type: 'nothing'}, 'an unknown move');
  no(a, null, 'no move');
  if (q.mode === 'find') {
    no(a, {type: 'strip', strip: 'Z'}, 'a strip not in the kit'); no(a, {type: 'send'}, 'Send with an empty tray');
    no(a, {type: 'dial', which: 'e', value: q.extras[1] + 1}, 'an extra off the dial'); no(a, {type: 'dial', which: 'c', value: 4}, 'copies off the dial');
    assert.ok(b.dials.e === null && (q.copies.length === 1 || b.dials.c === null), `${p.id}: the dials start unset`);
    no(a, {type: 'name'}, 'naming with unset dials'); no(a, {type: 'dial', which: 'e', value: null}, 'unsetting a dial');
    const set = play(p, a, [{type: 'dial', which: 'e', value: q.extras[0]}]);
    no(set, {type: 'dial', which: 'e', value: q.extras[0]}, 'a dial that does not change'); no(a, {type: 'dial', which: 'x', value: 1}, 'a third dial');
    no(a, {type: 'again'}, 'Again before a lost round'); no(a, {type: 'all'}, 'That’s all in a request puzzle');
    let full = a;
    for (let k = 0; k < q.budget; k++) full = play(p, full, [{type: 'strip', strip: 'A'}, {type: 'send'}]);
    no(full, {type: 'strip', strip: 'B'}, 'a strip after every request is used');
    if (q.tray > 1) no(play(p, a, [{type: 'strip', strip: 'A'}, {type: 'strip', strip: 'B'}]), {type: 'strip', strip: 'C'}, 'one strip too many in the tray');
    else assert.deepEqual(play(p, a, [{type: 'strip', strip: 'A'}, {type: 'strip', strip: 'B'}]).board.tray, ['B'], `${p.id}: a one-strip tray swaps`);
  }
  if (q.mode === 'every') { no(a, {type: 'all'}, 'That’s all with an empty shelf'); no(a, {type: 'dial', which: 'e', value: -1}, 'an extra below the dial'); no(a, {type: 'dial', which: 'c', value: 0}, 'no copies'); no(a, {type: 'strip', strip: 'A'}, 'a request'); }
  if (q.mode === 'build') {
    const hiddenNames = q.rows.filter(r => r.length === undefined).map(r => r.name), known = q.rows.find(r => r.length !== undefined);
    no(a, {type: 'set', which: hiddenNames[0], value: 0}, 'a strip with no length'); no(a, {type: 'set', which: hiddenNames[0], value: q.longest + 1}, 'a strip past the longest');
    no(a, {type: 'set', which: 'e', value: q.extras[1] + 1}, 'an extra off the dial'); no(a, {type: 'set', which: 'Z', value: 1}, 'a strip that is not on the board');
    if (known) no(a, {type: 'set', which: known.name, value: known.length + 1}, 'changing the known strip');
    no(a, {type: 'set', which: hiddenNames[0], value: 1.5}, 'a length off the units');
    if (q.every) no(a, {type: 'all'}, 'That’s all with an empty shelf'); else no(a, {type: 'all'}, 'That’s all with one answer');
  }
  if (q.mode === 'repair') {
    no(a, {type: 'step', by: 1}, 'a change before a report is picked'); no(a, {type: 'pick', row: q.rows.length}, 'a fourth report'); no(a, {type: 'all'}, 'That’s all with an empty shelf');
    const top = play(p, a, [{type: 'pick', row: 0}]);
    no(top, {type: 'pick', row: 0}, 'picking the picked report'); no(top, {type: 'step', by: 2}, 'a jump of two steps');
    let down = top; while (down.board.value - q.step >= q.lo) down = play(p, down, [{type: 'step', by: -1}]);
    if (!isSolved(p, down.board)) no(down, {type: 'step', by: -1}, 'a report below the lowest');
  }
  if (q.mode === 'stretch') {
    no(a, {type: 'step', ref: 2, by: 1}, 'a third reference'); no(a, {type: 'step', ref: 0, by: 2}, 'a jump');
    let up = a; for (let k = 0; k < q.err / q.step; k++) up = play(p, up, [{type: 'step', ref: 0, by: 1}]);
    no(up, {type: 'step', ref: 0, by: 1}, 'a true report outside its bar');
  }
  return n;
}

// Wrong presses and pins: refused with the right words and kept through Undo; lost rounds certified.
function checkRefusals(p) {
  const q = p.parameters, s = p.solution;
  let n = 0;
  if (s.answers && s.count > 1) {
    const hintMove = a => play(p, a, [nextHint(p, a).action]);
    let a = freshAttempt(p);
    while (a.board.found.length < 1) a = hintMove(a);
    a = play(p, a, [{type: 'all'}]);
    assert.equal(a.board.told, 'more'); assert.ok(view(p, a).includes('There is another.')); n++;
    refuse(p, a, {type: 'all'}, 'a second That’s all before a new find');
    const back = takeBack(p, a);
    assert.equal(back.board.told, 'more', `${p.id}: Undo keeps the refusal`); assert.equal(back.board.found.length, 1, `${p.id}: Undo keeps the shelf`);
    let b = a;
    while (b.board.found.length < 2) { b = hintMove(b); if (b.board.found.length < 2) assert.equal(b.board.told, 'more', `${p.id}: the refusal stays until something new is kept`); }
    assert.equal(b.board.told, null, `${p.id}: a new find lifts the refusal`);
    assert.equal(takeBack(p, b).board.found.length, 2, `${p.id}: Undo keeps a find`);
  }
  if (q.mode === 'stretch') {
    const set = (a, t) => { let x = a; for (const i of [0, 1]) while (x.board.t[i] !== t[i]) x = play(p, x, [{type: 'step', ref: i, by: t[i] > x.board.t[i] ? 1 : -1}]); return x; };
    const shown = q.refs.map(([, d]) => d), steep = [shown[0] - q.err, shown[1] + q.err], flat = [shown[0] + q.err, shown[1] - q.err];
    const one = play(p, set(freshAttempt(p), shown), [{type: 'pin'}]);
    assert.equal(one.board.told, null); assert.equal(nextHint(p, one).type, 'move', `${p.id}: one pin is not judged, by the board or by the hint`);
    let w = play(p, set(one, steep), [{type: 'pin'}]);
    assert.equal(w.board.told, 'shallower'); assert.deepEqual(w.board.pins, []); assert.ok(view(p, w).includes('A line can be shallower.')); n++;
    assert.equal(takeBack(p, w).board.told, 'shallower', `${p.id}: Undo keeps the refusal while the line is where it was`);
    w = play(p, set(play(p, set(freshAttempt(p), flat), [{type: 'pin'}]), shown), [{type: 'pin'}]);
    assert.equal(w.board.told, 'steeper'); n++;
    assert.equal(play(p, w, [{type: 'step', ref: 0, by: 1}]).board.told, null, `${p.id}: moving the line clears the refusal`);
    assert.ok(isSolved(p, play(p, set(play(p, set(freshAttempt(p), flat), [{type: 'pin'}]), steep), [{type: 'pin'}]).board), `${p.id}: the steepest and shallowest lines solve it, in either order`);
  }
  if (q.mode === 'find') {
    // A round that uses a request that does not always work ends lost, with two machines that both fit.
    const reqs = requestsFor(q);
    const seqs = [[]];
    for (let k = 0; k < q.budget; k++) seqs.splice(0, seqs.length, ...seqs.flatMap(seq => reqs.map(r => [...seq, r])));
    const bad = seqs.find(seq => keeperPlay(q, seq).alive.length > 1);
    if (p.id !== 'calibrate-01') assert.ok(bad, `${p.id}: some round is lost by its requests`);
    if (bad) {
      let a = freshAttempt(p);
      for (const r of bad) a = play(p, a, [...r.map(strip => ({type: 'strip', strip})), {type: 'send'}]);
      assert.ok(!isSolved(p, a.board));
      const html = view(p, a), {alive, reports} = keeperPlay(q, a.board.requests);
      assert.ok(alive.length >= 2 && html.includes('These both fit every report:'), `${p.id}: a lost round shows two machines`);
      const named = [...html.matchAll(/<li class="cb-item">([^<]*)<\/li>/g)].map(m => m[1]);
      assert.equal(named.length, 2);
      for (const words of named) {
        const nums = words.match(/\d+/g).map(Number), m = nums.length === 2 ? nums : [1, nums[0]];
        assert.ok(a.board.requests.every((r, k) => out(m, lengthFor(q, r)) === reports[k]), `${p.id}: ${words} fits every report`);
      }
      refuse(p, a, {type: 'name'}, 'naming after a lost round'); refuse(p, a, {type: 'dial', which: 'e', value: q.extras[1]}, 'dials after a lost round');
      assert.deepEqual(play(p, a, [{type: 'again'}]).board, freshAttempt(p).board, `${p.id}: Again starts a new round`);
      n++;
    }
    // Naming with no request loses, and shows two machines.
    const early = play(p, freshAttempt(p), [...(q.copies.length > 1 ? [{type: 'dial', which: 'c', value: q.copies[0]}] : []), {type: 'dial', which: 'e', value: q.extras[0]}, {type: 'name'}]);
    assert.equal(early.board.named, 'lost'); assert.ok(view(p, early).includes('These both fit every report:')); n++;
    assert.equal(undo(early), early, `${p.id}: a request round keeps no Undo`);
  }
  return n;
}

// Forged saves.
function checkSaves(p) {
  const q = p.parameters, s = p.solution, b = freshAttempt(p).board, forged = [];
  forged.push([{...b, extra: 1}, 'an extra field'], [null, 'no board'], [[], 'a list']);
  if (q.mode === 'find') {
    const tooMany = [...Array(q.budget + 1)].map(() => ['A']);
    forged.push([{...b, requests: tooMany}, 'more requests than the budget'], [{...b, requests: [['Z']]}, 'a strip not in the kit'], [{...b, named: 'won'}, 'a win with no request'],
      [{...b, tray: ['A'], named: 'lost'}, 'a named round with strips in the tray'], [{...b, dials: {c: 9, e: 0}}, 'copies off the dial'], [{...b, requests: [[]]}, 'an empty request'],
      [{...b, requests: [['A', 'A']]}, 'a strip twice in a request'], [{...b, named: 'maybe'}, 'an unknown verdict'], [{...b, named: 'lost'}, 'named with unset dials']);
    if (q.copies.length === 1) forged.push([{...b, dials: {c: null, e: null}}, 'copies unset when there is one choice']);
    if (q.tray === 1) forged.push([{...b, tray: ['A', 'B']}, 'two strips in a one-strip tray']);
  }
  if (s.answers) {
    const done = {...b, found: s.answers, told: null, done: true};
    assert.ok(validBoard(p, done), `${p.id}: a complete shelf is a valid save`);
    forged.push([{...b, found: ['9,9,9']}, 'a find that is not an answer'], [{...b, told: 'more'}, 'a refusal with an empty shelf'],
      [{...b, found: [s.answers[0], s.answers[0]]}, 'a find twice'], [{...done, told: 'more', done: false}, 'a refusal with every find']);
    if (s.answers.length > 1) forged.push([{...b, found: [s.answers[1], s.answers[0]]}, 'a shelf out of order'], [{...b, found: [s.answers[0]], done: true}, 'done with one find']);
  }
  if (q.mode === 'build') forged.push([{...b, len: {...b.len, [Object.keys(b.len)[0]]: q.longest + 1}}, 'a strip past the longest'], [{...b, e: q.extras[1] + 1}, 'an extra off the dial'], [{...b, len: {}}, 'no strips']);
  if (q.mode === 'repair') forged.push([{...b, pick: 0}, 'a pick with no value'], [{...b, pick: 0, value: q.hi + q.step}, 'a report past the top'], [{...b, pick: 0, value: q.lo + q.step / 2}, 'a report off the steps']);
  if (q.mode === 'every') forged.push([{...b, dials: {c: 1, e: q.extras[1] + 1}}, 'an extra off the dial']);
  if (q.mode === 'stretch') {
    const shown = q.refs.map(([, d]) => d);
    forged.push([{...b, t: [shown[0] + q.err + q.step, shown[1]]}, 'a true report outside its bar'], [{...b, pins: [shown, shown]}, 'two pins that are not the steepest and shallowest'],
      [{...b, pins: [shown], told: 'steeper'}, 'a refusal with a pin in'], [{...b, t: [shown[0] + q.step / 2, shown[1]]}, 'a report off the steps']);
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return forged.length;
}

// Every Undo press changes the screen.
function checkUndoPresses(p) {
  if (mechanicFor(p).noUndo?.(p)) return;
  for (let s = 0; s < 3; s++) {
    let a = wander(p, freshAttempt(p), seeded(p.number * 7 + s), 40), shown = view(p, a);
    while (a.history.length) { a = undoPress(p, a, x => view(p, x)); const now = view(p, a); assert.notEqual(now, shown, `${p.id}: an Undo press changes the screen`); shown = now; }
  }
}

// Claims in the grown-up notes, from the model alone.
function checkClaims(pack) {
  const byId = id => pack.puzzles.find(p => p.id === id).parameters;
  // Puzzle 1: every strip in the kit tells the six extras apart.
  const q1 = byId('calibrate-01');
  for (const L of Object.values(q1.kit)) assert.equal(new Set(machinesFor(q1).map(m => out(m, L))).size, 6);
  // Puzzles 2 and 3: Q − P is the same in every pair.
  for (const id of ['calibrate-02', 'calibrate-03']) {
    const p = pack.puzzles.find(x => x.id === id), gaps = new Set(p.solution.answers.map(k => { const [P, Q] = k.split(',').map(Number); return Q - P; }));
    assert.equal(gaps.size, 1, `${id}: Q − P never changes`);
  }
  // Puzzle 4's extension: K 6 long reporting 8 gives extra 2, P 7 and Q 10.
  assert.deepEqual([9 - 2, 12 - 2], [7, 10]);
  // Puzzle 5: with an extra-only machine and exactly one wrong report out of three, there is exactly one repair.
  for (const xs of [[1, 2, 3], [2, 4, 6], [1, 3, 8]]) for (let e = 1; e <= 6; e++) for (let i = 0; i < 3; i++) for (let wrong = 0; wrong <= 14; wrong++) {
    if (wrong === xs[i] + e) continue;
    const ys = xs.map((x, j) => j === i ? wrong : x + e);
    let repairs = 0;
    for (let j = 0; j < 3; j++) for (let v = 0; v <= 14; v++) { if (v === ys[j]) continue; const zs = ys.map((y, k) => k === j ? v : y), d = zs.map((z, k) => z - xs[k]); if (d.every(t => t === d[0]) && d[0] >= 1 && d[0] <= 6) repairs++; }
    assert.equal(repairs, 1, `one repair for ${xs} → ${ys}`);
  }
  // Puzzle 6: two different lengths always tell the 21 machines apart; one strip of the kit never does.
  const q6 = byId('calibrate-06'), m21 = machinesFor(q6);
  assert.equal(m21.length, 21);
  for (let L = 1; L <= 12; L++) for (let M = 1; M <= 12; M++) if (L !== M) assert.equal(new Set(m21.map(m => `${out(m, L)},${out(m, M)}`)).size, 21, `lengths ${L} and ${M}`);
  for (const L of Object.values(q6.kit)) assert.ok(new Set(m21.map(m => out(m, L))).size < 21);
  assert.equal(out([1, 6], 6), 12); assert.equal(out([2, 0], 6), 12);
  // Puzzle 7: L + 4, 2L + 2 and 3L agree only at L = 2; 6 → 24 comes from one machine only.
  for (let L = 1; L <= 30; L++) assert.equal(new Set([L + 4, 2 * L + 2, 3 * L]).size === 3, L !== 2);
  assert.equal(m21.filter(m => out(m, 6) === 24).length, 1);
  // Puzzle 8: one length tells the 21 machines apart exactly when it is 7 or more; with extras 0–9, 10 or more.
  for (let L = 1; L <= 20; L++) assert.equal(new Set(m21.map(m => out(m, L))).size === 21, L >= 7, `length ${L}`);
  const m30 = machinesFor({copies: [1, 2, 3], extras: [0, 9]});
  for (let L = 1; L <= 20; L++) assert.equal(new Set(m30.map(m => out(m, L))).size === 30, L >= 10, `length ${L}, extras to 9`);
  // Puzzle 9: each repair puts the point on the line through the other two.
  const p9 = pack.puzzles.find(x => x.id === 'calibrate-09');
  assert.deepEqual(p9.solution.answers, ['0:6', '1:11.5', '2:15']);
  // Puzzles 10 and 11: from lengths 1 to 10, the references 1 and 10 leave the narrowest range.
  let best = null;
  for (let x1 = 1; x1 <= 10; x1++) for (let x2 = x1 + 1; x2 <= 10; x2++) { const w = 4 / (x2 - x1); if (!best || w < best.w) best = {w, x1, x2}; }
  assert.deepEqual([best.x1, best.x2], [1, 10]);
  // The copy: goals name the task, hints never say press, and the counts are not given away.
  for (const p of pack.puzzles) {
    assert.ok(p.objective.length > 10 && p.controls && p.rules.length >= 1 && p.prerequisites && p.parent?.explanation, `${p.id}: copy`);
    if (p.visibleObjective) assert.ok(!/press/i.test(p.visibleObjective), `${p.id}: the visible goal names the task, not the buttons`);
    for (const h of p.hints) assert.ok(!/Press/.test(h), `${p.id}: authored hints never say press`);
    if (p.solution?.count) {
      const words = [String(p.solution.count), ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'][p.solution.count]].join('|');
      assert.ok(![p.objective, p.visibleObjective, p.hints[0]].some(t => new RegExp(`\\b(${words}) (pairs|machines|repairs|ways)\\b`, 'i').test(t)), `${p.id}: the count is not given away`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await validateCalibrate(), null, 2));
