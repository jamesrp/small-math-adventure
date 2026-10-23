// Checks the Fold and stretch pack (dist/families/tent/tent.json) by methods
// unlike the mechanic's: positions are numbers of units, the move is
// T(x) = 16 − |2x − 16| (exact for these dyadic positions), and every band's
// possible places come from sampling its starts every 1/2048 of a unit, never
// from the interval rule. Then the answers, counts and claims in the pack and
// the grown-up notes; that each board's grid of starts reaches the same
// lowest and highest landings as every start in the band, so a pinned
// certificate on the board is a certificate for the claim; hint chains from
// fresh, after wrong presses and pins, after random play and after Undo;
// illegal moves; forged saves; Undo keeping shelves, goals met and refusals,
// with every press changing the screen.
// Run: node scripts/validate-tent.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';

// --- An independent model ------------------------------------------------------
const T = x => 16 - Math.abs(2 * x - 16);
const Tn = (x, n) => { for (let k = 0; k < n; k++) x = T(x); return x; };
const FINE = 2048;
const units = ticks => ticks / 32;
const ticks = x => Math.round(x * 32);
// Every possible place of a band of starts after n moves, by sampling its starts.
function sampled(lo, hi, n) {
  let min = Infinity, max = -Infinity;
  for (let k = Math.round(lo * FINE); k <= Math.round(hi * FINE); k++) { const v = Tn(k / FINE, n); if (v < min) min = v; if (v > max) max = v; }
  return [min, max];
}
const full = ([lo, hi]) => lo === 0 && hi === 16;
function firstFull(lo, hi, most) { for (let k = 0; k <= most; k++) if (full(sampled(lo, hi, k))) return k; return null; }
const gridOf = (lo, hi, step) => { const out = []; for (let x = lo; x <= hi + 1e-12; x += step) out.push(x); return out; };

const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next && next !== x, `${p.id}: ${JSON.stringify(action)} is legal from ${JSON.stringify(x.board)}`); return next; }, a);
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const takeBack = (p, a) => { const b = undo(a); return b === a ? a : {...b, board: mechanicFor(p).carry(p, a.board, b.board)}; };
function seeded(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; }
function hintSolve(p, a, limit = 200) {
  let k = 0;
  while (!isSolved(p, a.board)) {
    const h = nextHint(p, a);
    // Never a dead end: the app would show one at once, judging a first pin before the second.
    assert.equal(h.type, 'move', `${p.id}: a hint names a move from ${JSON.stringify(a.board)} (${h.text || h.type})`);
    assert.ok(h.text && !/Press (Can’t|Widest|That’s all)/.test(h.text), `${p.id}: hint text`);
    a = play(p, a, [h.action]);
    assert.ok(++k <= limit, `${p.id}: hints finish within ${limit} moves`);
  }
  return k;
}
// A random action of the kinds the board's controls make, legal or not.
function randomAction(q, b, rnd) {
  const pick = list => list[Math.floor(rnd() * list.length)];
  const spot = (lo, hi) => lo + Math.floor(rnd() * ((hi - lo) / q.step + 1)) * q.step;
  const r = rnd();
  if (q.mode === 'pairs') return r < 0.1 ? {type: 'all'} : {type: 'set', which: pick([0, 1]), at: spot(0, 512)};
  if (q.mode === 'pieces') return r < 0.1 ? {type: 'all'} : {type: 'slide', at: spot(0, 512 - q.width)};
  if (q.mode === 'fill') return {type: 'slide', at: spot(0, 512 - q.width)};
  if (q.mode === 'width') return {type: 'band', end: pick(['lo', 'hi']), at: spot(0, 512)};
  if (q.mode === 'break') return r < 0.15 ? {type: 'cant'} : r < 0.35 ? {type: 'pin'} : {type: 'set', at: spot(q.band[0], q.band[1])};
  return r < 0.15 ? {type: 'widest'} : r < 0.35 ? {type: 'pin'} : r < 0.65 ? {type: 'band', end: 'hi', at: spot(q.step, q.zoom)} : {type: 'set', at: spot(0, b.hi)};
}
function wander(p, a, rnd, steps) {
  for (let s = 0; s < steps; s++) {
    const next = move(p, a, randomAction(p.parameters, a.board, rnd));
    if (next && !isSolved(p, next.board)) a = next;
  }
  return a;
}

export default async function validateTent() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/tent/tent.json', import.meta.url), 'utf8'));
  const report = {puzzles: 0, hintMoves: 0, wanders: 0, refusals: 0, forgeries: 0};
  for (const p of pack.puzzles) {
    assert.equal(p.libraryFamily, 'ranges', `${p.id}: a group in Ruler strips`);
    assert.equal(p.group, 'Fold and stretch');
    assert.ok(!/\d/.test(p.title), `${p.id}: no digits in the title`);
    checkAnswers(p);
    let a = freshAttempt(p);
    assert.ok(validBoard(p, a.board), `${p.id}: fresh board is valid`);
    assert.ok(!isSolved(p, a.board), `${p.id}: not solved at the start`);
    report.hintMoves += hintSolve(p, a);
    for (let s = 0; s < 6; s++) {
      const rnd = seeded(p.number * 97 + s);
      const w = wander(p, freshAttempt(p), rnd, 30);
      report.hintMoves += hintSolve(p, w);
      // and after an Undo of the wander's last step
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
  const q = p.parameters, s = p.solution, step = units(q.step);
  if (q.mode === 'pairs') {
    const pairs = [];
    for (let x = 0; x <= 16; x++) for (let y = x + 1; y <= 16; y++) if (T(x) === T(y)) pairs.push(`${ticks(x)},${ticks(y)}`);
    assert.deepEqual(s.answers, pairs, `${p.id}: meeting pairs`);
    assert.equal(pairs.length, 8);
  }
  if (q.mode === 'break') {
    const [a, b] = q.band.map(units), [c, d] = q.window.map(units), n = q.moves;
    const truth = sampled(a, b, n), grid = gridOf(a, b, step).map(x => [x, Tn(x, n)]);
    const gmin = Math.min(...grid.map(([, v]) => v)), gmax = Math.max(...grid.map(([, v]) => v));
    // The board's starts reach the band's lowest and highest landing, so pins on the board certify the claim.
    assert.deepEqual([gmin, gmax], truth, `${p.id}: grid starts reach every start’s extremes`);
    const out = grid.filter(([, v]) => v < c || v > d).map(([x]) => ticks(x));
    const endsSay = [Math.min(Tn(a, n), Tn(b, n)), Math.max(Tn(a, n), Tn(b, n))];
    assert.deepEqual(endsSay, [c, d], `${p.id}: the claim is what moving only the ends gives`);
    if (s.cant) {
      assert.deepEqual(out, [], `${p.id}: no start breaks the claim`);
      assert.ok(truth[0] >= c && truth[1] <= d, `${p.id}: every start lands inside`);
      assert.deepEqual([s.lowest, s.highest].map(units), truth);
      assert.deepEqual(s.lowStarts, grid.filter(([, v]) => v === gmin).map(([x]) => ticks(x)));
      assert.deepEqual(s.highStarts, grid.filter(([, v]) => v === gmax).map(([x]) => ticks(x)));
    } else {
      assert.deepEqual(s.breaks, out, `${p.id}: the starts that break the claim`);
      assert.ok(out.length > 0);
    }
  }
  if (q.mode === 'width') {
    s.goals.forEach((bands, i) => {
      const [sw, lw] = q.goals[i], found = [];
      for (let lo = 0; lo <= 16; lo++) for (let hi = lo + 1; hi <= 16; hi++) { const [x, y] = sampled(lo, hi, 1); if ((y - x) * sw === (hi - lo) * lw) found.push([ticks(lo), ticks(hi)]); }
      assert.deepEqual(bands, found, `${p.id}: bands for goal ${i}`);
      assert.ok(found.length > 0);
    });
  }
  if (q.mode === 'fill' || q.mode === 'pieces') {
    const w = units(q.width), byK = new Map();
    for (const lo of gridOf(0, 16 - w, step)) { const k = firstFull(lo, lo + w, q.rows); byK.set(k, [...(byK.get(k) || []), ticks(lo)]); }
    if (q.mode === 'fill') { q.goals.forEach((k, i) => assert.deepEqual(s.goals[i], byK.get(k), `${p.id}: bands first full on move ${k}`)); assert.equal(fresh(p).reached.length, 1, `${p.id}: the start meets one goal`); }
    else { assert.deepEqual(s.answers, byK.get(q.on), `${p.id}: every band first full on move ${q.on}`); assert.equal(s.count, s.answers.length); }
  }
  if (q.mode === 'widest') {
    const [c, d] = q.window.map(units), safe = hi => { for (let k = 0; k <= Math.round(hi * FINE); k++) { const x = k / FINE; for (let m = 1; m <= q.moves; m++) { const v = Tn(x, m); if (v < c || v > d) return false; } } return true; };
    const ends = gridOf(step, units(q.zoom), step).filter(safe);
    assert.equal(units(s.widest), Math.max(...ends), `${p.id}: the widest band`);
    assert.equal(Tn(units(s.widest), q.moves), d, `${p.id}: its end lands exactly on the window’s edge`);
    assert.equal(units(s.widest), 2 / 2 ** q.moves, `${p.id}: the widest band is 2/2^n`);
    assert.ok(!safe(units(q.start)), `${p.id}: the starting band escapes`);
  }
}
const fresh = p => freshAttempt(p).board;
// Whether two pins after Can’t are refused, played through the engine.
function mechanicJudge(p, u, v) {
  const q = p.parameters;
  let a = play(p, freshAttempt(p), [{type: 'set', at: q.start === q.band[0] ? q.band[1] : q.band[0]}]);
  if (Tn(units(a.board.at), q.moves) < units(q.window[0]) || Tn(units(a.board.at), q.moves) > units(q.window[1])) return true;
  a = play(p, a, [{type: 'cant'}]);
  for (const x of [u, v]) a = play(p, a, [...(a.board.at === x ? [] : [{type: 'set', at: x}]), {type: 'pin'}]);
  return !isSolved(p, a.board) && a.board.told !== null;
}

// Illegal moves, from the board's rules alone.
function checkIllegal(p) {
  const q = p.parameters, a = freshAttempt(p), b = a.board;
  let n = 0;
  const no = (action, why) => { refuse(p, a, action, why); n++; };
  no({type: 'nothing'}, 'an unknown move');
  no(null, 'no move');
  if (q.mode === 'pairs') {
    no({type: 'set', which: 0, at: 16}, 'a marker off the grid'); no({type: 'set', which: 2, at: 0}, 'a third marker'); no({type: 'set', which: 0, at: 544}, 'a marker off the track');
    no({type: 'set', which: 0, at: b.at[0]}, 'a marker that does not move'); no({type: 'all'}, 'That’s all with an empty shelf'); no({type: 'slide', at: 0}, 'a band move');
  }
  if (q.mode === 'break') {
    no({type: 'set', at: q.band[0] - q.step}, 'a start left of the band'); no({type: 'set', at: q.band[1] + q.step}, 'a start right of the band'); no({type: 'set', at: q.band[0] + 1}, 'a start off the grid');
    no({type: 'cant'}, 'Can’t before a try'); no({type: 'pin'}, 'a pin before Can’t'); no({type: 'band', end: 'hi', at: q.band[1]}, 'moving the claim’s band');
  }
  if (q.mode === 'width') {
    no({type: 'band', end: 'lo', at: b.band[1] + q.step}, 'a band turned inside out'); no({type: 'band', end: 'hi', at: 513}, 'a band off the track'); no({type: 'band', end: 'mid', at: 64}, 'a third end'); no({type: 'band', end: 'lo', at: 33}, 'an end off the grid');
  }
  if (q.mode === 'fill' || q.mode === 'pieces') {
    no({type: 'slide', at: 512 - q.width + q.step}, 'a band past 16'); no({type: 'slide', at: -q.step}, 'a band before 0'); no({type: 'slide', at: q.step / 2}, 'a band off the grid'); no({type: 'slide', at: b.lo}, 'a band that does not move');
    if (q.mode === 'pieces') no({type: 'all'}, 'That’s all with an empty shelf');
  }
  if (q.mode === 'widest') {
    no({type: 'set', at: 0}, 'moving the app’s marker before Widest'); no({type: 'widest'}, 'Widest before the band moves'); no({type: 'pin'}, 'a pin before Widest');
    no({type: 'band', end: 'hi', at: 0}, 'a band with no width'); no({type: 'band', end: 'hi', at: q.zoom + q.step}, 'a band past the enlarged ruler'); no({type: 'band', end: 'lo', at: q.step}, 'moving the band’s 0 end');
  }
  return n;
}

// Wrong presses and pins: refused with the right words, kept through Undo, lifted by a new find.
function checkRefusals(p) {
  const q = p.parameters, s = p.solution, m = mechanicFor(p), view = a => m.render(p, {...a, hintLevel: 0}, {});
  let n = 0;
  if (q.mode === 'pairs' || q.mode === 'pieces') {
    let a = freshAttempt(p);
    const first = q.mode === 'pairs' ? [{type: 'set', which: 0, at: 0}, {type: 'set', which: 1, at: 512}] : [{type: 'slide', at: s.answers[0]}];
    a = play(p, a, first);
    assert.equal(a.board.found.length, 1, `${p.id}: the find is kept as it happens`);
    a = play(p, a, [{type: 'all'}]);
    assert.equal(a.board.told, 'more'); assert.ok(view(a).includes('There is another.')); n++;
    refuse(p, a, {type: 'all'}, 'a second That’s all before a new find');
    const moved = play(p, a, [q.mode === 'pairs' ? {type: 'set', which: 0, at: 32} : {type: 'slide', at: s.answers[0] + q.step}]);
    assert.equal(moved.board.told, 'more', `${p.id}: the refusal stays until something new is kept`);
    const back = takeBack(p, moved);
    assert.equal(back.board.told, 'more', `${p.id}: Undo keeps the refusal`); assert.equal(back.board.found.length, 1, `${p.id}: Undo keeps the shelf`);
    const again = play(p, moved, q.mode === 'pairs' ? [{type: 'set', which: 1, at: 480}] : [{type: 'slide', at: s.answers[1]}]);
    assert.equal(again.board.told, null, `${p.id}: a new find lifts the refusal`); assert.equal(again.board.found.length, 2);
    // Undo past the find keeps the shelf too.
    assert.equal(takeBack(p, again).board.found.length, 2, `${p.id}: Undo keeps a find`);
  }
  if (q.mode === 'break') {
    let a = play(p, freshAttempt(p), [{type: 'set', at: q.band[0] === q.start ? q.band[1] : q.band[0]}, {type: 'cant'}]);
    assert.ok(view(a).includes('Pin the lowest and the highest landing.'));
    // Two starts that do not break the claim and are not both extremes: judged with the second pin.
    const inside = gridOf(units(q.band[0]), units(q.band[1]), units(q.step)).map(ticks).filter(u => { const v = Tn(units(u), q.moves); return v >= units(q.window[0]) && v <= units(q.window[1]); });
    const cert = s.cant ? new Set([...s.lowStarts, ...s.highStarts]) : new Set();
    const pair = inside.filter(u => !cert.has(u)).slice(0, 2);
    while (pair.length < 2) pair.push(inside.find(u => !pair.includes(u)));
    const pinAt = (x, u) => play(p, x, [...(x.board.at === u ? [] : [{type: 'set', at: u}]), {type: 'pin'}]);
    // One wrong pin is not judged, by the board or by the hint.
    const one = pinAt(a, pair[0]);
    assert.equal(one.board.told, null); assert.equal(nextHint(p, one).type, 'move', `${p.id}: the hint after one pin names a move`);
    const w = pinAt(one, pair[1]);
    assert.ok(['lower', 'higher'].includes(w.board.told), `${p.id}: wrong pins refused (${w.board.told})`); n++;
    assert.deepEqual(w.board.pins, []);
    assert.ok(view(w).includes(w.board.told === 'lower' ? 'A start lands lower.' : 'A start lands higher.'));
    const back = takeBack(p, w);
    assert.equal(back.board.told, w.board.told, `${p.id}: Undo keeps the refusal while the marker is where it was`);
    if (s.cant) {
      const ok = pinAt(pinAt(a, s.lowStarts[0]), s.highStarts[0]);
      assert.ok(isSolved(p, ok.board), `${p.id}: the lowest and highest landings certify Can’t`);
      assert.deepEqual(ok.board.pins.map(u => Tn(units(u), q.moves)), [units(s.lowest), units(s.highest)]);
    } else {
      // On a board that breaks, no pair of pins certifies Can’t: every start that can be pinned lands inside.
      for (const u of inside) for (const v of inside) assert.ok(mechanicJudge(p, u, v), `${p.id}: pins ${u} and ${v} are refused`);
    }
  }
  if (q.mode === 'widest') {
    const goal = s.widest;
    // Too wide: Widest, then pin the end that escapes.
    let a = play(p, freshAttempt(p), [{type: 'band', end: 'hi', at: goal * 2 === q.start ? goal * 3 : goal * 2}, {type: 'widest'}]);
    assert.ok(a.board.at < a.board.hi, `${p.id}: after Widest the marker starts inside the band`);
    let w = play(p, a, [{type: 'set', at: a.board.hi}, {type: 'pin'}]);
    assert.equal(w.board.told, 'outside'); n++;
    assert.equal(takeBack(p, w).board.told, 'outside', `${p.id}: Undo keeps the refusal`);
    // Too narrow.
    const narrow = goal / 2 >= q.step ? goal / 2 : null;
    if (narrow) { w = play(p, freshAttempt(p), [{type: 'band', end: 'hi', at: narrow}, {type: 'widest'}, {type: 'set', at: narrow}, {type: 'pin'}]); assert.equal(w.board.told, 'wider'); n++; }
    // Widest band, wrong pin.
    a = play(p, freshAttempt(p), [{type: 'band', end: 'hi', at: goal}, {type: 'widest'}]);
    if (a.board.at !== goal) { w = play(p, a, [{type: 'pin'}]); assert.equal(w.board.told, 'farther'); n++; }
    // Moving the band takes Widest back.
    const moved = play(p, a, [{type: 'band', end: 'hi', at: goal + q.step}]);
    assert.equal(moved.board.claim, false, `${p.id}: moving the band takes Widest back`);
    assert.ok(isSolved(p, play(p, a, [...(a.board.at === goal ? [] : [{type: 'set', at: goal}]), {type: 'pin'}]).board), `${p.id}: the end that lands on the edge certifies Widest`);
  }
  if (q.mode === 'width' || q.mode === 'fill') {
    const a = hintSolvePartial(p);
    assert.ok(a.board.reached.length >= 1);
  }
  return n;
}
// Meet a goal, move away, Undo: the goal stays met. Undo after the last goal takes it back.
function hintSolvePartial(p) {
  const q = p.parameters;
  let a = freshAttempt(p);
  const start = a.board.reached.length;
  while (a.board.reached.length === start) a = play(p, a, [nextHint(p, a).action]);
  const kept = a.board.reached;
  if (isSolved(p, a.board)) {
    const back = takeBack(p, a);
    assert.ok(!isSolved(p, back.board), `${p.id}: Undo after the last goal opens the puzzle again`);
    assert.equal(back.board.reached.length, start, `${p.id}: and keeps the goals met before it`);
    return a;
  }
  const away = q.mode === 'width' ? {type: 'band', end: 'lo', at: a.board.band[0] === 0 ? q.step : 0} : {type: 'slide', at: a.board.lo === 0 ? q.step : 0};
  const moved = play(p, a, [away]);
  assert.deepEqual(moved.board.reached.filter(i => kept.includes(i)), kept, `${p.id}: a goal met stays met`);
  assert.deepEqual(takeBack(p, takeBack(p, moved)).board.reached, kept, `${p.id}: Undo keeps a goal met`);
  return moved;
}

// Forged saves.
function checkSaves(p) {
  const q = p.parameters, s = p.solution, b = fresh(p), forged = [];
  forged.push([{...b, extra: 1}, 'an extra field'], [null, 'no board'], [[], 'a list']);
  if (q.mode === 'pairs') {
    forged.push([{...b, found: [[0, 32]]}, 'a pair that does not meet'], [{...b, found: [[0, 512]], done: true}, 'done with one pair'], [{...b, told: 'more'}, 'a refusal with an empty shelf'], [{...b, found: [[32, 480], [0, 512]]}, 'a shelf out of order'], [{...b, found: [[0, 512], [0, 512]]}, 'a pair twice'], [{...b, at: [3, 64]}, 'a marker off the grid']);
    const all = s.answers.map(k => k.split(',').map(Number));
    assert.ok(validBoard(p, {...b, found: all, done: true}), `${p.id}: a complete shelf is a valid save`);
    forged.push([{...b, found: all, told: 'more'}, 'a refusal with every pair found']);
  }
  if (q.mode === 'pieces') forged.push([{...b, found: [q.step]}, 'a band that is not first full on the move'], [{...b, found: [s.answers[0]], done: true}, 'done with one band'], [{...b, lo: 512}, 'a band past 16']);
  if (q.mode === 'break') {
    forged.push([{...b, cant: true}, 'Can’t before a try'], [{...b, at: q.band[1] + q.step}, 'a marker outside its band'], [{...b, tried: true, pins: [q.band[0]]}, 'a pin before Can’t'], [{...b, tried: true, cant: true, told: 'wider'}, 'a refusal from another mode']);
    if (s.cant) forged.push([{...b, tried: true, cant: true, pins: [q.band[0] + q.step, q.band[0] + q.step]}, 'a pair of pins that is not the certificate']);
  }
  if (q.mode === 'width') forged.push([{...b, band: [64, 32]}, 'a band inside out'], [{...b, reached: [5]}, 'a goal that is not there'], [{...b, reached: [1, 0]}, 'goals out of order']);
  if (q.mode === 'fill') forged.push([{...b, reached: [3]}, 'a goal that is not there'], [{...b, lo: 8}, 'a band off the grid']);
  if (q.mode === 'widest') forged.push([{...b, at: 0}, 'the app’s marker moved before Widest'], [{...b, claim: true}, 'Widest before the band moved'], [{...b, hi: 0, at: 0}, 'a band with no width'], [{hi: s.widest, at: s.widest, claim: true, pins: [s.widest - q.step], told: null}, 'a wrong pin kept as a solve']);
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return forged.length;
}

// Every Undo press changes the screen.
function checkUndoPresses(p) {
  const m = mechanicFor(p), view = a => m.render(p, {...a, hintLevel: 0}, {});
  for (let s = 0; s < 3; s++) {
    let a = wander(p, freshAttempt(p), seeded(p.number * 7 + s), 40), shown = view(a);
    while (a.history.length) { a = undoPress(p, a, view); const now = view(a); assert.notEqual(now, shown, `${p.id}: an Undo press changes the screen`); shown = now; }
  }
}

// Claims in the grown-up notes, from the model alone.
function checkClaims(pack) {
  const byId = id => pack.puzzles.find(p => p.id === id);
  // Puzzle 1: 0 and 1 move apart on each of the first four moves.
  const gaps = [0, 1, 2, 3, 4, 5].map(n => Math.abs(Tn(1, n) - Tn(0, n)));
  assert.deepEqual(gaps, [1, 2, 4, 8, 16, 0]);
  // Puzzle 2: any band from 8 − h to 8 + h has ends that land together.
  for (let h = 1; h <= 8; h++) assert.equal(T(8 - h), T(8 + h));
  // Puzzle 4's extension: 6 to 10 lands on 12 to 16.
  assert.deepEqual(sampled(6, 10, 1), [12, 16]);
  // Puzzle 5: 7 to 8 first full on move 4, 7½ to 8½ on 5, 7 to 9 on 4.
  assert.equal(firstFull(7, 8, 6), 4); assert.equal(firstFull(7.5, 8.5, 6), 5); assert.equal(firstFull(7, 9, 6), 4);
  assert.deepEqual(sampled(7.5, 8.5, 1), [15, 16]);
  // Puzzle 6: no band lands narrower or more than twice as wide; just as wide only with 8 in the middle.
  for (let lo = 0; lo <= 16; lo += 0.5) for (let hi = lo + 0.5; hi <= 16; hi += 0.5) {
    const [x, y] = sampled(lo, hi, 1), w = hi - lo, v = y - x;
    assert.ok(v >= w && v <= 2 * w, `band ${lo}–${hi} lands between as wide and twice as wide`);
    if (v === w) assert.equal(lo + hi, 16, `band ${lo}–${hi}: just as wide only with 8 in the middle`);
  }
  // Puzzle 7: exactly the starts strictly between 3 and 5 break 0 to 12 after two moves.
  for (let k = 3 * 64; k <= 8 * 64; k++) { const x = k / 64; assert.equal(Tn(x, 2) > 12, x > 3 && x < 5, `start ${x}`); }
  // Puzzle 8's extension: with whole ends, 5 to b breaks 0 to 12 after two moves exactly when b ≥ 12.
  for (let b = 6; b <= 16; b++) assert.equal(sampled(5, b, 2)[1] > 12, b >= 12, `band 5–${b}`);
  // Puzzles 9 and 10: the widest bands for four and five moves.
  const widest = n => { let best = 0; for (let k = 1; k <= 64; k++) { const q = k / 64; if (sampled(0, q, 0) && [...Array(n)].every((_, m) => sampled(0, q, m + 1)[1] <= 2)) best = q; } return best; };
  assert.equal(widest(4), 1 / 8); assert.equal(widest(5), 1 / 16); assert.equal(widest(3), 1 / 4); assert.equal(widest(6), 1 / 32);
  // Puzzle 11's extension: sixteen bands 1 wide (on the half-unit grid) are first full on move 4, all with whole ends.
  const ones = gridOf(0, 15, 0.5).filter(lo => firstFull(lo, lo + 1, 6) === 4);
  assert.deepEqual(ones, gridOf(0, 15, 1));
  // The objectives name what the board asks.
  for (const p of pack.puzzles) {
    assert.ok(p.objective.length > 10 && p.controls && p.rules.length >= 2, `${p.id}: copy`);
    if (p.visibleObjective) assert.ok(!/press/i.test(p.visibleObjective), `${p.id}: the visible goal names the task, not the buttons`);
    for (const h of p.hints) assert.ok(!/Press (Can’t|Widest|That’s all)/.test(h), `${p.id}: authored hints never say press Can’t`);
  }
  assert.equal(byId('tent-01').solution.count, 8); assert.equal(byId('tent-11').solution.count, 8);
  for (const id of ['tent-01', 'tent-11']) assert.ok(!/\beight\b/i.test(byId(id).hints[0]) && !/\beight\b/i.test(byId(id).objective), `${id}: the count is not given away`);
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await validateTent(), null, 2));
