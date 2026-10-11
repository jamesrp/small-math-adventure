// Checks the Ruler strips pack (dist/families/ranges/ranges.json): content
// fields and sources; every answer recomputed by a method unlike the
// mechanic's enumeration of settings (each measure as a linear form in the
// strips' lengths, minimised and maximised band by band, with a locked total
// substituted out first; the widest band from the window less the other
// bands); the widest band's uniqueness by a separate brute force over every
// band and setting; witnesses played as moves; hint chains from fresh and
// after wrong moves and wrong claims; Undo keeping a refused Can't; illegal
// moves; forged saves; the playground; and the speed of moves and hints.
// Run: node scripts/validate-ranges.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {settings} from '../dist/families/ranges/ranges.js';
import {loadPack} from './packs.mjs';

// The table in docs/ranges/README.md.
const TABLE = {
  'ranges-01': {mode: 'break', range: [7, 10], breakable: true},
  'ranges-02': {mode: 'break', range: [8, 12], breakable: true},
  'ranges-03': {mode: 'gap', gaps: [[3, 4]]},
  'ranges-04': {mode: 'break', range: [8, 10], breakable: false},
  'ranges-05': {mode: 'widen', band: [4, 5]},
  'ranges-06': {mode: 'gap', gaps: [[1, 5]]},
  'ranges-07': {mode: 'gap', gaps: [[3, 3], [1, 5]]},
  'ranges-08': {mode: 'widen', band: [3, 5]},
  'ranges-09': {mode: 'gap', gaps: [[2, 6]], reachA: [7, 9]}
};

// A row as a linear form: how many times each strip appears, plus the white pieces.
const rowForm = row => row.reduce((f, piece) => typeof piece === 'number' ? {...f, k: f.k + piece} : {...f, c: {...f.c, [piece]: (f.c[piece] || 0) + 1}}, {c: {}, k: 0});
const minus = (f, g) => { const c = {...f.c}; for (const [s, n] of Object.entries(g.c)) c[s] = (c[s] || 0) - n; return {c, k: f.k - g.k}; };
// Substitute a locked total s1 + s2 = sum: s2 becomes sum − s1, and s1's band
// is cut to where s2 stays in its own.
function substitute(form, cards, total) {
  if (!total) return {form, cards};
  const [s1, s2] = total.strips, n = form.c[s2] || 0, c = {...form.c};
  c[s1] = (c[s1] || 0) - n; delete c[s2];
  const band = [Math.max(cards[s1][0], total.sum - cards[s2][1]), Math.min(cards[s1][1], total.sum - cards[s2][0])];
  const rest = {...cards, [s1]: band}; delete rest[s2];
  return {form: {c, k: form.k + n * total.sum}, cards: rest};
}
// The least and greatest value of a linear form, one band at a time.
function span(form0, cards0, total) {
  const {form, cards} = substitute(form0, cards0, total);
  let lo = form.k, hi = form.k;
  for (const [s, n] of Object.entries(form.c)) { const [a, b] = cards[s]; lo += Math.min(n * a, n * b); hi += Math.max(n * a, n * b); }
  return [lo, hi];
}
const joinSpan = (q, cards) => span(rowForm(q.rows[0]), cards, null);
const gapSpans = q => q.pairs.map(([t, u]) => span(minus(rowForm(q.rows[t]), rowForm(q.rows[u])), q.cards, q.total));
// How many times the band being widened is in the join.
const copies = q => q.rows[0].filter(x => x === q.edit).length;
// The widest band from the window: its left end makes the shortest join reach
// the window, its right end keeps the longest inside (a strip in the join n
// times moves it n units per unit).
function widestByWindow(q) {
  const others = q.rows[0].filter(x => x !== q.edit), n = copies(q);
  const lo = Math.ceil((q.window[0] - others.reduce((t, x) => t + (typeof x === 'number' ? x : q.cards[x][0]), 0)) / n);
  const hi = Math.floor((q.window[1] - others.reduce((t, x) => t + (typeof x === 'number' ? x : q.cards[x][1]), 0)) / n);
  return [Math.max(1, lo), hi];
}
// A separate simulator: every whole setting of the bands, its join's end.
function allEnds(q, cards) {
  const names = Object.keys(cards), out = [];
  (function go(k, len) {
    if (k === names.length) { out.push(q.rows[0].reduce((t, x) => t + (typeof x === 'number' ? x : len[x]), 0)); return; }
    for (let v = cards[names[k]][0]; v <= cards[names[k]][1]; v++) go(k + 1, {...len, [names[k]]: v});
  })(0, {});
  return out;
}

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
// Pin two settings in turn.
const pinBoth = (p, a, pins) => play(p, setTo(p, play(p, setTo(p, a, pins[0]), {type: 'pin'}), pins[1]), {type: 'pin'});
const setTo = (p, a, len) => Object.keys(len).reduce((b, s) => b.board.len[s] === len[s] || isSolved(p, b.board) ? b : play(p, b, {type: 'set', strip: s, length: len[s]}), a);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 40; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(h.text && !/Press (Can’t|Widest)/.test(h.text), `${p.id} ${label}: a hint has words, and never says Press Can’t or Press Widest`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}

export async function validateRanges() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/ranges/ranges.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-51')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-51.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'ranges');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  let hintSteps = 0, slowest = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'ranges');
    assert.ok(p.id.startsWith('ranges-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    assert.ok(!/press can’t/i.test(p.hints[0]), `${p.id}: the first hint is not Press Can’t`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: fresh board is valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: not solved at the start`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    const row = TABLE[p.id];
    assert.equal(q.mode, row.mode, `${p.id}: mode`);
    // Every board fits on its ruler.
    const maxCards = q.mode === 'widen' ? {...q.cards, [q.edit]: [1, q.ruler]} : q.cards;
    for (const r of q.rows) if (q.mode !== 'widen') assert.ok(span(rowForm(r), maxCards, q.total)[1] <= q.ruler, `${p.id}: every row fits the ruler`);
    // No visible objective names an answer.
    assert.ok(!/Can’t|widest band is|\b(biggest|smallest) (is|gap is)\b/i.test(p.visibleObjective), `${p.id}: the visible objective names no answer`);
    const t0 = performance.now();
    if (q.mode === 'break') hintSteps += checkBreak(p, fresh, row);
    else if (q.mode === 'widen') hintSteps += checkWiden(p, fresh, row);
    else hintSteps += checkGap(p, fresh, row);
    // Moves and hints stay fast: replay the hint chain and time each step,
    // best of three so a busy machine's scheduling doesn't count as work.
    let a = fresh;
    while (!isSolved(p, a.board)) {
      let best = Infinity, next;
      for (let k = 0; k < 3; k++) { const t = performance.now(); next = move(p, a, nextHint(p, a).action); best = Math.min(best, performance.now() - t); }
      slowest = Math.max(slowest, best); a = next;
    }
    assert.ok(performance.now() - t0 < 5000, `${p.id}: checks finish`);
  }
  assert.ok(slowest < 100, `a hint and its move take ${slowest.toFixed(1)} ms at most`);
  return {puzzles: pack.puzzles.length, hintSteps, slowestHintMs: Number(slowest.toFixed(2))};
}

const joinOf = (q, len) => q.rows[0].reduce((t, x) => t + (typeof x === 'number' ? x : len[x]), 0);
// A wrong pair of pins: refused with the right words, the pins cleared, the
// refusal kept through Undo while the strips stay put, and cleared by a move;
// a wrong first pin makes the hint a dead end that Undo clears.
function checkWrongPins(p, a, pins, told) {
  const once = play(p, setTo(p, a, pins[0]), {type: 'pin'}), twice = play(p, setTo(p, once, pins[1]), {type: 'pin'});
  assert.equal(twice.board.told, told, `${p.id}: pins ${JSON.stringify(pins)} are refused (${told})`);
  assert.deepEqual(twice.board.pins, [], `${p.id}: a refusal clears the pins`);
  assert.ok(!isSolved(p, twice.board));
  const back = mechanicFor(p).carry(p, twice.board, undo(twice).board);
  assert.equal(back.told, told, `${p.id}: Undo keeps the refusal`);
  assert.deepEqual(back.pins, [], `${p.id}: Undo doesn’t bring a refused pin back`);
  const h = nextHint(p, once);
  if (JSON.stringify(pins[0]) === JSON.stringify(pins[1])) assert.ok(h.type === 'move', `${p.id}: a good first pin has a partner`);
  hintsSolve(p, twice, `after pins ${JSON.stringify(pins)} were refused`);
}

function forged(p, list) { for (const [board, why] of list) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`); }

function checkBreak(p, fresh, row) {
  const q = p.parameters, B = fresh.board, [lo, hi] = joinSpan(q, q.cards);
  assert.deepEqual([lo, hi], row.range, `${p.id}: the join range, band by band`);
  const ends = allEnds(q, q.cards);
  assert.deepEqual([Math.min(...ends), Math.max(...ends)], row.range, `${p.id}: the join range by the separate simulator`);
  for (let v = lo; v <= hi; v++) assert.ok(ends.includes(v), `${p.id}: the join can end at ${v}`);
  const out = ends.some(v => v < q.window[0] || v > q.window[1]);
  assert.equal(out, row.breakable, `${p.id}: breakable`);
  refuse(p, fresh, {type: 'cant'}, 'Can’t before any try');
  let steps = hintsSolve(p, fresh, 'from fresh');
  const first = Object.keys(q.cards)[0], other = q.cards[first][0] === B.len[first] ? q.cards[first][1] : q.cards[first][0];
  const tried = play(p, fresh, {type: 'set', strip: first, length: other});
  if (row.breakable) {
    // The witness: every setting ending outside breaks it.
    for (const len of p.solution.breaks) assert.ok(isSolved(p, setTo(p, fresh, len).board), `${p.id}: ${JSON.stringify(len)} breaks the claim`);
    // A wrong Can't gets no verdict on the press; its pins are refused, since
    // a join outside the window would break the claim before it was pinned.
    const wrong = play(p, tried, {type: 'cant'});
    assert.deepEqual([wrong.board.cant, wrong.board.told, wrong.board.pins], [true, null, []], `${p.id}: Can’t gives no verdict on the press`);
    assert.ok(!isSolved(p, wrong.board), `${p.id}: Can’t alone is no solve`);
    refuse(p, wrong, {type: 'cant'}, 'Can’t again');
    const inside = settings(q, q.cards).filter(len => joinOf(q, len) >= q.window[0] && joinOf(q, len) <= q.window[1]);
    const lowIn = inside.reduce((u, v) => joinOf(q, v) < joinOf(q, u) ? v : u), highIn = inside.reduce((u, v) => joinOf(q, v) > joinOf(q, u) ? v : u);
    checkWrongPins(p, wrong, [lowIn, highIn], joinOf(q, lowIn) > lo ? 'shorter' : 'longer');
    steps += hintsSolve(p, wrong, 'after a wrong Can’t');
    steps += hintsSolve(p, tried, 'after a try');
  } else {
    const right = play(p, tried, {type: 'cant'});
    assert.deepEqual([right.board.cant, right.board.told], [true, null], `${p.id}: Can’t gives no verdict on the press`);
    assert.ok(!isSolved(p, right.board), `${p.id}: Can’t alone is no solve`);
    assert.deepEqual(p.solution.pins.map(len => joinOf(q, len)), row.range, `${p.id}: the pins are the shortest and the longest join`);
    assert.ok(isSolved(p, pinBoth(p, right, p.solution.pins).board), `${p.id}: the shortest and the longest join certify it`);
    checkWrongPins(p, right, [p.solution.pins[0], p.solution.pins[0]], 'longer');
    checkWrongPins(p, right, [p.solution.pins[1], p.solution.pins[1]], 'shorter');
    steps += hintsSolve(p, right, 'after Can’t');
    steps += hintsSolve(p, tried, 'after a try');
  }
  const s = Object.keys(q.cards)[0];
  for (const [action, why] of [[{type: 'set', strip: s, length: q.cards[s][1] + 1}, 'a length past the band'], [{type: 'set', strip: s, length: q.cards[s][0] - 1}, 'a length short of the band'], [{type: 'set', strip: s, length: 4.5}, 'a length between units'], [{type: 'set', strip: 'Z', length: 4}, 'an unknown strip'], [{type: 'set', strip: s, length: B.len[s]}, 'the same length'], [{type: 'card', strip: s, end: 'lo', value: 1}, 'changing a band'], [{type: 'widest'}, 'Widest'], [{type: 'jump'}, 'an unknown move']]) refuse(p, fresh, action, why);
  forged(p, [
    [{...B, len: {...B.len, [s]: q.cards[s][1] + 1}}, 'a length past its band'],
    [{...B, len: {[s]: B.len[s]}}, 'a missing strip'],
    [{...B, extra: 1}, 'an unknown field'],
    [{...B, tried: 'yes'}, 'a try that is not true or false'],
    [{...B, cant: 'yes', tried: true}, 'a Can’t that is not true or false'],
    [{...B, cant: 'maybe'}, 'an unknown answer'],
    [{...B, pins: [{...B.len}]}, 'a pin before Can’t'],
    [{...B, told: 'shorter'}, 'a refused pin before Can’t'],
    [{...B, tried: true, cant: true, pins: [settings(q, q.cards)[0], settings(q, q.cards)[0]]}, 'two pins that are not the certificate'],
    [{...B, tried: true, cant: true, pins: [{...B.len}], told: 'longer'}, 'a refusal with a pin standing'],
    [{...B, tried: true, cant: true, told: 'bigger'}, 'a gap’s refusal on a join'],
    [{...B, tried: false, cant: true}, 'Can’t without a try']
  ]);
  return steps;
}

function checkWiden(p, fresh, row) {
  const q = p.parameters, B = fresh.board;
  assert.deepEqual(widestByWindow(q), row.band, `${p.id}: the widest band from the window`);
  // Brute force, with the separate simulator: every band, every setting.
  let best = -1, bests = [];
  const top = Math.floor((q.ruler - q.rows[0].filter(x => x !== q.edit).reduce((t, x) => t + (typeof x === 'number' ? x : q.cards[x][1]), 0)) / copies(q));
  for (let lo = 1; lo <= top; lo++) for (let hi = lo; hi <= top; hi++) {
    const ends = allEnds(q, {...q.cards, [q.edit]: [lo, hi]});
    if (ends.some(v => v < q.window[0] || v > q.window[1])) continue;
    if (hi - lo > best) { best = hi - lo; bests = []; }
    if (hi - lo === best) bests.push([lo, hi]);
  }
  assert.deepEqual(bests, [row.band], `${p.id}: one widest band`);
  assert.deepEqual(p.solution.band, row.band, `${p.id}: the pack’s answer`);
  const others = Object.keys(q.cards).filter(s => s !== q.edit);
  assert.equal(copies(q) * (row.band[1] - row.band[0]), q.window[1] - q.window[0] - others.reduce((t, s) => t + q.rows[0].filter(x => x === s).length * (q.cards[s][1] - q.cards[s][0]), 0), `${p.id}: widths add, and the widest band’s joins fill the window exactly`);
  // The strips can't move before Widest; the app shows its attack.
  refuse(p, fresh, {type: 'set', strip: others[0], length: q.cards[others[0]][0] === B.len[others[0]] ? q.cards[others[0]][1] : q.cards[others[0]][0]}, 'moving a strip before Widest');
  refuse(p, fresh, {type: 'widest'}, 'Widest before the band has moved');
  let steps = hintsSolve(p, fresh, 'from fresh');
  // A wrong Widest, on an unsafe band and on a safe band that can grow: no
  // verdict on the press; the pins of its shortest and longest join are refused.
  const unsafe = [row.band[0] - 1, row.band[1]], narrow = [row.band[0] + 1, row.band[1]];
  for (const band of [unsafe, narrow]) {
    let a = fresh;
    if (a.board.card[1] !== band[1]) a = play(p, a, {type: 'card', strip: q.edit, end: 'hi', value: band[1]});
    if (a.board.card[0] !== band[0]) a = play(p, a, {type: 'card', strip: q.edit, end: 'lo', value: band[0]});
    const ends = allEnds(q, {...q.cards, [q.edit]: band}), end = a.board.len && q.rows[0].reduce((t, x) => t + a.board.len[x], 0);
    if (band === unsafe) assert.ok(end < q.window[0] || end > q.window[1], `${p.id}: the app shows a join that escapes ${JSON.stringify(band)}`);
    else assert.ok(ends.every(v => v >= q.window[0] && v <= q.window[1]), `${p.id}: ${JSON.stringify(band)} is safe`);
    const wrong = play(p, a, {type: 'widest'});
    assert.deepEqual([wrong.board.claim, wrong.board.told, wrong.board.pins], [true, null, []], `${p.id}: Widest on ${JSON.stringify(band)} gives no verdict on the press`);
    refuse(p, wrong, {type: 'widest'}, 'Widest again');
    const cards = {...q.cards, [q.edit]: band}, all = settings(q, cards), short = all.reduce((u, v) => joinOf(q, v) < joinOf(q, u) ? v : u), long = all.reduce((u, v) => joinOf(q, v) > joinOf(q, u) ? v : u);
    checkWrongPins(p, wrong, [short, long], band === unsafe ? 'outside' : 'wider');
    steps += hintsSolve(p, wrong, `after Widest on ${JSON.stringify(band)}`);
  }
  // The witness.
  let a = fresh;
  for (const [end, value] of [['lo', row.band[0]], ['hi', row.band[1]]]) if (a.board.card[end === 'lo' ? 0 : 1] !== value) a = play(p, a, {type: 'card', strip: q.edit, end, value});
  a = play(p, a, {type: 'widest'});
  assert.deepEqual([a.board.claim, a.board.told], [true, null], `${p.id}: Widest gives no verdict on the press`);
  const at = joinOf(q, a.board.len);
  assert.ok(at > q.window[0] && at < q.window[1], `${p.id}: after Widest the strips start between the edges, so neither pin is free`);
  assert.equal(play(p, a, {type: 'card', strip: q.edit, end: 'lo', value: row.band[0] - 1}).board.claim, false, `${p.id}: moving the band takes Widest back`);
  assert.deepEqual(p.solution.pins.map(len => joinOf(q, len)), q.window, `${p.id}: the pins touch both edges of the window`);
  assert.ok(isSolved(p, pinBoth(p, a, p.solution.pins).board), `${p.id}: the shortest and the longest join certify it`);
  checkWrongPins(p, a, [p.solution.pins[0], p.solution.pins[0]], 'longer');
  for (const [action, why] of [[{type: 'card', strip: q.edit, end: 'hi', value: top + 1}, 'a band past the ruler'], [{type: 'card', strip: q.edit, end: 'lo', value: 0}, 'a band from 0'], [{type: 'card', strip: q.edit, end: 'lo', value: B.card[1] + 1}, 'a band turned round'], [{type: 'card', strip: others[0], end: 'lo', value: 1}, 'another strip’s band'], [{type: 'cant'}, 'Can’t']]) refuse(p, fresh, action, why);
  forged(p, [
    [{...B, len: {...B.len, [others[0]]: q.cards[others[0]][0] === B.len[others[0]] ? q.cards[others[0]][1] : q.cards[others[0]][0]}}, 'strips that are not the app’s attack'],
    [{...B, claim: 'yes'}, 'a claim that is not true or false'],
    [{...B, claim: true}, 'Widest on the starting band'],
    [{...B, card: [...row.band], claim: true, len: {...p.solution.pins[0]}, pins: [p.solution.pins[0], p.solution.pins[0]]}, 'two pins that are not the certificate'],
    [{...B, card: [...unsafe], claim: true, len: {...p.solution.pins[0]}, pins: (() => { const all = settings(q, {...q.cards, [q.edit]: unsafe}); return [all[0], all[all.length - 1]]; })()}, 'two pins on a band that lets a join out'],
    [{...B, told: 'wider'}, 'a refusal before Widest'],
    [{...B, card: [0, 3]}, 'a band from 0'],
    [{...B, card: [5, 4]}, 'a band turned round'],
    [{...B, pins: [{...B.len}]}, 'a pin before Widest']
  ]);
  return steps;
}

function checkGap(p, fresh, row) {
  const q = p.parameters, B = fresh.board;
  assert.deepEqual(gapSpans(q), row.gaps, `${p.id}: gap ranges, band by band`);
  assert.deepEqual(p.solution.gaps.map(g => [g.smallest, g.biggest]), row.gaps, `${p.id}: the pack’s answer`);
  let steps = hintsSolve(p, fresh, 'from fresh');
  // The witness: two pins that make every pair's biggest and smallest gap,
  // checked against the linear forms.
  const forms = q.pairs.map(([t, u]) => minus(rowForm(q.rows[t]), rowForm(q.rows[u])));
  const value = (f, len) => f.k + Object.entries(f.c).reduce((x, [s, n]) => x + n * len[s], 0);
  forms.forEach((f, i) => { const v = p.solution.pins.map(len => value(f, len)); assert.deepEqual([Math.min(...v), Math.max(...v)], row.gaps[i], `${p.id}: the pins make pair ${i + 1}’s extremes`); });
  assert.ok(isSolved(p, pinBoth(p, fresh, p.solution.pins).board), `${p.id}: the two pins solve it`);
  const i = row.gaps.findIndex(([lo, hi]) => lo < hi), big = p.solution.pins.find(len => value(forms[i], len) === row.gaps[i][1]), small = p.solution.pins.find(len => value(forms[i], len) === row.gaps[i][0]);
  checkWrongPins(p, fresh, [big, big], 'smaller');
  checkWrongPins(p, fresh, [small, small], 'bigger');
  // After a wrong move: hints still solve.
  const s = Object.keys(q.cards)[0], [r0, r1] = q.total ? row.reachA : q.cards[s];
  const moved = play(p, fresh, {type: 'set', strip: s, length: B.len[s] === r0 ? r1 : r0});
  steps += hintsSolve(p, moved, 'after a move');
  if (q.total) {
    const [a1, a2] = row.reachA, [c1, c2] = q.cards.A;
    assert.ok(c1 < a1 || c2 > a2, `${p.id}: the total cuts A’s band`);
    refuse(p, fresh, {type: 'set', strip: 'A', length: c2}, 'a length the total rules out');
    const set = play(p, fresh, {type: 'set', strip: 'B', length: q.total.sum - a1});
    assert.equal(set.board.len.A, a1, `${p.id}: moving B moves A`);
    forged(p, [[{...B, len: {A: c2, B: q.cards.B[0]}}, 'a setting off the total']]);
  }
  for (const [action, why] of [[{type: 'set', strip: s, length: q.cards[s][1] + 1}, 'a length past the band'], [{type: 'cant'}, 'Can’t'], [{type: 'widest'}, 'Widest'], [{type: 'card', strip: s, end: 'hi', value: 9}, 'changing a band']]) refuse(p, fresh, action, why);
  forged(p, [
    [{...B, pins: [big, big]}, 'two pins that are not the certificate'],
    [{...B, pins: [big, small, big]}, 'three pins'],
    [{...B, pins: [{...big, Z: 1}]}, 'a pin with an unknown strip'],
    [{...B, told: 'shorter'}, 'a join’s refusal on a gap'],
    [{...B, pins: [big], told: 'bigger'}, 'a refusal with a pin standing'],
    [{...B, len: {...B.len, [s]: 100}}, 'a length off the ruler'],
    [{...B, extra: 1}, 'an unknown field']
  ]);
  return steps;
}

function checkPlayground(p, fresh) {
  const q = p.parameters, B = fresh.board;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  let a = play(p, fresh, {type: 'card', strip: 'A', end: 'hi', value: 6});
  assert.deepEqual(a.board.cards.A, [2, 6], `${p.id}: a band grows`);
  a = play(p, a, {type: 'set', strip: 'A', length: 6});
  a = play(p, a, {type: 'card', strip: 'A', end: 'hi', value: 3});
  assert.equal(a.board.len.A, 3, `${p.id}: a strip stays inside its narrowed band`);
  refuse(p, a, {type: 'card', strip: 'B', end: 'hi', value: q.ruler}, 'a band past the ruler');
  refuse(p, a, {type: 'card', strip: 'A', end: 'lo', value: 4}, 'a band turned round');
  refuse(p, a, {type: 'cant'}, 'Can’t');
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  forged(p, [[{...B, cards: {...B.cards, A: [0, 2]}}, 'a band from 0'], [{...B, cards: {A: [2, 9], B: [3, 9]}, len: {A: 2, B: 3}}, 'bands past the ruler'], [{...B, len: {A: 9, B: 4}}, 'a length past its band']]);
}

export default validateRanges;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateRanges(), null, 2));
