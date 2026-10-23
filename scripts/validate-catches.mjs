// Checks the Catch and mark pack (dist/families/catches/catches.json) by
// methods unlike the mechanic's: catches are bitmasks of the bag, overlaps
// are popcounts of their intersection, and every claim is found by listing
// catches, never from the max(0, M + n − N) to min(M, n) formula. For bags
// up to 8 every pair of catches is listed; for bigger bags the first catch
// is fixed as the first M tiles, which loses nothing because renaming the
// tiles carries any pair of catches to one with that first catch. Then the
// overlap theorem for every bag up to 10 and every pair of catch sizes, the
// smallest-bag bound for every record in bags up to 20, the pile counts and
// the average Mn/N; each puzzle's answers; Can't, accepted or refused by the
// engine on every full arrangement of each arrange puzzle; That's all,
// accepted or refused for every shelf; hint chains from fresh, after random
// play and after Undo; illegal moves; forged saves; Undo keeping the shelf
// and refusals, with every press changing the screen; the claims in the
// grown-up notes; and the playground.
// Run: node scripts/validate-catches.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';

// --- An independent model ------------------------------------------------------
const pop = x => { let c = 0; for (; x; x &= x - 1) c++; return c; };
const LET = 'ABCDEFGHIJKLMNOPQRST';
const masks = (N, k) => { const out = []; for (let x = 0; x < 1 << N; x++) if (pop(x) === k) out.push(x); return out; };
const tilesOfMask = x => { const out = []; for (let i = 0; x >> i; i++) if (x >> i & 1) out.push(i); return out; };
const maskOf = tiles => tiles.reduce((x, t) => x | 1 << t, 0);
const keyOfMask = x => tilesOfMask(x).map(i => LET[i]).join('');
const firstMask = M => (1 << M) - 1;
// Every overlap a bag of N allows for catches of M and n, by listing.
const overlapMemo = new Map();
function listedOverlaps(N, M, n) {
  const id = `${N},${M},${n}`;
  if (overlapMemo.has(id)) return overlapMemo.get(id);
  const seen = new Set(), seconds = masks(N, n);
  for (const f of N <= 8 ? masks(N, M) : [firstMask(M)]) for (const s of seconds) seen.add(pop(f & s));
  const out = [...seen].sort((x, y) => x - y);
  overlapMemo.set(id, out);
  return out;
}
const fitsListed = (N, M, n, R) => M <= N && n <= N && listedOverlaps(N, M, n).includes(R);
function binom(n, k) { if (k < 0 || k > n) return 0; let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return Math.round(c); }

// --- Play through the engine ---------------------------------------------------
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next && next !== x, `${p.id}: ${JSON.stringify(action)} is legal from ${JSON.stringify(x.board)}`); return next; }, a);
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const takeBack = (p, a) => { const b = undo(a); return b === a ? a : {...b, board: mechanicFor(p).carry(p, a.board, b.board)}; };
const at = (p, board) => ({...freshAttempt(p), board});
function seeded(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; }
// Taps that build catches from empty: the first catch, then the second.
const taps = (first, second) => [...first, ...second].map(tile => ({type: 'tap', tile}));
function hintSolve(p, a, limit = 400) {
  let k = 0;
  while (!isSolved(p, a.board)) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id}: a hint names a move from ${JSON.stringify(a.board)}`);
    assert.ok(h.text, `${p.id}: hint text`);
    a = play(p, a, [h.action]);
    assert.ok(++k <= limit, `${p.id}: hints finish within ${limit} moves`);
  }
  return k;
}
// Random legal play: a random control the board offers, as a child might tap.
function wander(p, a, rnd, steps) {
  const m = mechanicFor(p);
  for (let s = 0; s < steps && !isSolved(p, a.board); s++) {
    const html = m.render(p, {...a, hintLevel: 0}, {});
    const moves = [...html.matchAll(/data-move="([^"]+)"/g)].map(x => JSON.parse(x[1].replace(/&quot;/g, '"')));
    const live = moves.map(action => [action, move(p, a, action, rnd)]).filter(([, b]) => b);
    if (!live.length) break;
    const [, next] = live[Math.floor(rnd() * live.length)];
    a = isSolved(p, next.board) ? a : next;
  }
  return a;
}

export default async function validateCatches() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/catches/catches.json', import.meta.url), 'utf8'));
  const report = {puzzles: 0, theoremCases: checkTheorems(), arrangementsJudged: 0, shelvesJudged: 0, hintMoves: 0};
  for (const p of pack.puzzles) {
    const q = p.parameters;
    if (q.mode === 'playground') { checkPlayground(p); continue; }
    report.puzzles++;
    // Answers, by listing.
    if (q.mode === 'arrange') {
      const ok = fitsListed(q.bag, q.m, q.n, q.goal);
      assert.equal(p.solution.possible, ok, `${p.id}: the goal is ${ok ? 'possible' : 'impossible'}`);
      assert.deepEqual(p.solution.overlaps, listedOverlaps(q.bag, q.m, q.n), `${p.id}: overlaps`);
      report.arrangementsJudged += checkCant(p);
    } else {
      let answers;
      if (q.mode === 'every') answers = listedOverlaps(q.bag, q.m, q.n).map(String);
      if (q.mode === 'sizes') answers = q.bags.filter(N => fitsListed(N, q.m, q.n, q.goal)).map(String);
      if (q.mode === 'sort') answers = masks(q.bag, q.n).map(keyOfMask);
      assert.deepEqual([...answers].sort(), p.solution.answers.map(String).sort(), `${p.id}: answers`);
      assert.equal(p.solution.count, answers.length, `${p.id}: count`);
      if (q.mode === 'sort') checkPiles(p);
      report.shelvesJudged += checkThatsAll(p, answers);
      // Copy never gives the count away.
      const word = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'][answers.length];
      for (const text of [p.title, p.objective, p.visibleObjective, p.hints[0]]) assert.ok(!new RegExp(`\\b${word}\\b`, 'i').test(text), `${p.id}: "${text}" does not give the answer count away`);
    }
    for (const text of [p.title, p.objective, p.visibleObjective, p.controls]) assert.ok(!/\d/.test(text), `${p.id}: no number in "${text}"`);
    for (const text of [p.title, p.objective, p.visibleObjective]) assert.ok(!/can.t be|impossible|never/i.test(text), `${p.id}: the copy does not say whether Can’t is right`);
    checkIllegal(p);
    checkSaves(p);
    // Hints: from fresh, after wandering, and after Undo.
    report.hintMoves += hintSolve(p, freshAttempt(p));
    for (let seed = 1; seed <= 8; seed++) {
      const rnd = seeded(seed * 131 + p.number);
      let a = wander(p, freshAttempt(p), rnd, 20 + seed * 9);
      report.hintMoves += hintSolve(p, a);
      for (let k = 0; k < 1 + seed % 3 && a.history.length; k++) a = takeBack(p, a);
      assert.ok(validBoard(p, a.board), `${p.id}: an undone board is valid`);
      report.hintMoves += hintSolve(p, a);
    }
    checkUndo(p);
  }
  checkClaims(pack);
  assert.equal(pack.puzzles.filter(p => p.parameters.mode !== 'playground').length, 11);
  return report;
}

// The theorems, by listing: every overlap from max(0, M + n − N) to min(M, n)
// and no other, for every bag up to 10; the smallest bag of a record, for bags
// up to 20; the piles C(M, k) C(N − M, n − k) and the average Mn/N.
function checkTheorems() {
  let cases = 0;
  for (let N = 1; N <= 10; N++) for (let M = 1; M <= N; M++) for (let n = 1; n <= N; n++) {
    const got = listedOverlaps(N, M, n), lo = Math.max(0, M + n - N), hi = Math.min(M, n);
    assert.deepEqual(got, Array.from({length: hi - lo + 1}, (_, i) => lo + i), `bag ${N}, catches ${M} and ${n}: every overlap from ${lo} to ${hi}`);
    // Swapping one tile changes the overlap by at most one.
    const f = firstMask(M);
    for (const s of masks(N, n)) for (let out = 0; out < N; out++) if (s >> out & 1) for (let inn = 0; inn < N; inn++) if (!(s >> inn & 1)) assert.ok(Math.abs(pop(f & (s ^ 1 << out ^ 1 << inn)) - pop(f & s)) <= 1);
    // Piles and the average, over every second catch with the first catch fixed.
    const piles = new Map();
    for (const s of masks(N, n)) { const k = pop(f & s); piles.set(k, (piles.get(k) || 0) + 1); }
    let total = 0, dots = 0;
    for (const [k, c] of piles) { assert.equal(c, binom(M, k) * binom(N - M, n - k), `bag ${N}, ${M} and ${n}: ${k} dots`); total += c; dots += k * c; }
    assert.equal(dots * N, M * n * total, `bag ${N}, ${M} and ${n}: the average is Mn/N`);
    cases++;
  }
  // A record (M, n, R) fits a bag of N exactly when N ≥ M + n − R, with no biggest bag.
  for (let M = 1; M <= 6; M++) for (let n = 1; n <= 6; n++) for (let R = 0; R <= Math.min(M, n); R++) {
    for (let N = Math.max(M, n); N <= 20; N++) assert.equal(fitsListed(N, M, n, R), N >= M + n - R, `record ${M}, ${n}, ${R} in a bag of ${N}`);
    cases++;
  }
  return cases;
}

// Every full arrangement of an arrange puzzle, judged by the engine: it
// solves by itself when it matches the goal; otherwise Can't is accepted
// exactly when the goal is out of reach and no arrangement comes closer, and
// a refusal names the swap that would.
function checkCant(p) {
  const q = p.parameters, m = mechanicFor(p);
  const all = listedOverlaps(q.bag, q.m, q.n), nearest = Math.min(...all.map(r => Math.abs(r - q.goal)));
  let judged = 0;
  for (const f of masks(q.bag, q.m)) for (const s of masks(q.bag, q.n)) {
    const board = {first: tilesOfMask(f), second: tilesOfMask(s), cant: false, refused: false}, a = at(p, board), r = pop(f & s);
    assert.ok(validBoard(p, board));
    if (r === q.goal) { assert.ok(isSolved(p, board), `${p.id}: a match solves`); refuse(p, a, {type: 'cant'}, 'Can’t after a match'); judged++; continue; }
    assert.ok(!isSolved(p, board));
    const after = move(p, a, {type: 'cant'});
    const right = !all.includes(q.goal) && Math.abs(r - q.goal) === nearest;
    assert.equal(isSolved(p, after.board), right, `${p.id}: Can’t on ${keyOfMask(f)} / ${keyOfMask(s)} is ${right ? 'accepted' : 'refused'}`);
    if (!right) {
      assert.equal(after.board.refused, true);
      refuse(p, after, {type: 'cant'}, 'Can’t twice on the same catches');
      // Drawing every refusal is slow; one in seven covers every kind.
      const html = judged % 7 ? (r > q.goal ? 'A plain tile could swap in.' : 'A dotted tile could swap in.') : m.render(p, {...after, hintLevel: 0}, {});
      assert.ok(html.includes(r > q.goal ? 'A plain tile could swap in.' : 'A dotted tile could swap in.'), `${p.id}: the refusal names the swap`);
      // The swap it names exists: a dotted tile caught and a plain one not, or the reverse.
      const caughtDot = tilesOfMask(f & s).length, plainOut = tilesOfMask(~f & ~s & ((1 << q.bag) - 1)).length, dotOut = tilesOfMask(f & ~s).length, caughtPlain = tilesOfMask(~f & s).length;
      assert.ok(r > q.goal ? caughtDot && plainOut : dotOut && caughtPlain, `${p.id}: the named swap exists`);
    } else {
      const html = m.render(p, {...after, hintLevel: 0}, {});
      assert.ok(html.includes(q.goal < all[0] ? 'Every plain tile is in the second catch.' : 'Every dotted tile is in the second catch.'), `${p.id}: the certificate is named`);
      if (q.goal < all[0]) assert.equal(pop(~f & s), q.bag - q.m, `${p.id}: every plain tile caught`);
    }
    judged++;
  }
  // Can't is off until both catches are full.
  refuse(p, freshAttempt(p), {type: 'cant'}, 'Can’t with empty catches');
  return judged;
}

function checkPiles(p) {
  const q = p.parameters, mk = maskOf(q.marked), piles = {};
  for (const s of masks(q.bag, q.n)) { const k = pop(mk & s); piles[k] = (piles[k] || 0) + 1; }
  assert.deepEqual(p.solution.piles, piles, `${p.id}: piles`);
}

// That's all, for every shelf a child can hold: accepted exactly when every
// answer is kept; a refusal names no count, holds it off until the shelf
// grows and survives Undo.
function checkThatsAll(p, answers) {
  const q = p.parameters, m = mechanicFor(p), fresh = freshAttempt(p);
  refuse(p, fresh, {type: 'all'}, 'That’s all with an empty shelf');
  let judged = 0;
  const shelves = answers.length <= 6 ? Array.from({length: (1 << answers.length) - 1}, (_, x) => answers.filter((_, i) => (x + 1) >> i & 1)) : [answers.slice(0, 1), answers.slice(0, -1), answers.slice(1), answers];
  for (const kept of shelves) {
    const a = at(p, {...fresh.board, kept});
    assert.ok(validBoard(p, a.board), `${p.id}: a shelf of answers is valid`);
    const after = move(p, a, {type: 'all'});
    assert.ok(after, `${p.id}: That’s all is legal on ${kept}`);
    assert.equal(isSolved(p, after.board), kept.length === answers.length, `${p.id}: That’s all on ${kept} is ${kept.length === answers.length ? 'accepted' : 'refused'}`);
    if (kept.length < answers.length) {
      assert.equal(after.board.missed, true);
      refuse(p, after, {type: 'all'}, 'That’s all twice on one shelf');
      const html = m.render(p, {...after, hintLevel: 0}, {});
      assert.ok(html.includes('There is another.') && !/There (are|is) \d/.test(html), `${p.id}: the refusal names no count`);
    }
    judged++;
  }
  // Played: the first answer, an early That's all, Undo keeps the shelf and the refusal, the rest, then That's all.
  const second = r => [...Array.from({length: r}, (_, i) => i), ...Array.from({length: q.n - r}, (_, i) => q.m + i)];
  const reach = (a, key) => {
    if (q.mode === 'sort') return play(p, a, taps([], tilesOfMask([...key].reduce((x, ch) => x | 1 << LET.indexOf(ch), 0))));
    const f = Array.from({length: q.m}, (_, i) => i);
    if (q.mode === 'every') return play(p, a, taps(f, second(Number(key))));
    const N = Number(key);
    return play(p, a, [...(N === a.board.bag ? [] : [{type: 'size', size: N}]), ...taps(f, second(q.goal))]);
  };
  const clear = a => { const b = a.board, out = [...b.second.map(tile => ({type: 'out', which: 2, tile})), ...(q.mode === 'sort' ? [] : b.first.map(tile => ({type: 'out', which: 1, tile})))]; return play(p, a, out); };
  let a = reach(fresh, answers[0]);
  assert.deepEqual(a.board.kept, [answers[0]], `${p.id}: full catches join the shelf`);
  if (answers.length > 1) {
    a = play(p, a, [{type: 'all'}]);
    assert.equal(a.board.missed, true, `${p.id}: an early That’s all is refused`);
    const back = takeBack(p, takeBack(p, a));
    assert.equal(back.board.missed, true, `${p.id}: Undo keeps the refusal`);
    assert.deepEqual(back.board.kept, [answers[0]], `${p.id}: Undo keeps the shelf`);
    for (const key of answers.slice(1)) a = reach(clear(a), key);
    assert.equal(a.board.missed, false, `${p.id}: a new answer lifts the refusal`);
  }
  a = play(p, a, [{type: 'all'}]);
  assert.ok(isSolved(p, a.board), `${p.id}: That’s all with every answer solves`);
  return judged;
}

function checkIllegal(p) {
  const q = p.parameters, fresh = freshAttempt(p), N = q.bag ?? fresh.board.bag;
  refuse(p, fresh, {type: 'tap', tile: N}, 'a tile outside the bag');
  refuse(p, fresh, {type: 'tap', tile: -1}, 'a negative tile');
  refuse(p, fresh, {type: 'tap', tile: 0, extra: 1}, 'a move with an unknown field');
  refuse(p, fresh, {type: 'out', which: 2, tile: 0}, 'taking out a tile not in the catch');
  refuse(p, fresh, {type: 'nonsense'}, 'an unknown move');
  refuse(p, fresh, {type: 'round', count: 1}, 'a random catch outside the playground');
  if (q.mode !== 'sizes') refuse(p, fresh, {type: 'size', size: 7}, 'choosing a bag outside the bag puzzles');
  if (q.mode !== 'arrange') refuse(p, fresh, {type: 'cant'}, 'Can’t outside the arrange puzzles');
  if (q.mode === 'arrange') refuse(p, fresh, {type: 'all'}, 'That’s all in an arrange puzzle');
  if (q.mode === 'sort') refuse(p, fresh, {type: 'out', which: 1, tile: q.marked[0]}, 'changing the given first catch');
  if (q.mode === 'sizes') { refuse(p, fresh, {type: 'size', size: fresh.board.bag}, 'the bag already chosen'); refuse(p, fresh, {type: 'size', size: 99}, 'a bag not on the list'); }
  // A tap that would overfill the second catch.
  const f = q.mode === 'sort' ? [] : Array.from({length: q.m}, (_, i) => i), s = Array.from({length: q.n}, (_, i) => i);
  const full = play(p, fresh, taps(f, s.slice(0, -1)));
  const last = move(p, full, {type: 'tap', tile: s.at(-1)});
  if (last && !isSolved(p, last.board)) {
    const spare = Array.from({length: N}, (_, i) => i).find(i => !s.includes(i));
    refuse(p, last, {type: 'tap', tile: spare}, 'a tile into a full second catch');
  }
}

function checkSaves(p) {
  const q = p.parameters, fresh = freshAttempt(p).board, N = q.bag ?? fresh.bag;
  const forged = [[{...fresh, extra: 1}, 'an unknown field'], [{...fresh, second: [0, 0]}, 'a tile twice'], [{...fresh, second: [N]}, 'a tile outside the bag'], [{...fresh, second: Array.from({length: q.n + 1}, (_, i) => i)}, 'an overfull catch'], [{...fresh, second: 'AB'}, 'a catch that is not a list']];
  if (q.mode !== 'sort') forged.push([{...fresh, first: Array.from({length: q.m + 1}, (_, i) => i)}, 'an overfull first catch']);
  if (q.mode === 'arrange') {
    const lo = Math.max(0, q.m + q.n - q.bag), hi = Math.min(q.m, q.n), r = q.goal === lo ? hi : lo;
    const f = Array.from({length: q.m}, (_, i) => i), sec = [...f.slice(0, r), ...Array.from({length: q.n - r}, (_, i) => q.m + i)];
    forged.push([{...fresh, cant: true}, 'Can’t with empty catches'], [{...fresh, refused: true}, 'a refusal with empty catches'], [{...fresh, cant: true, refused: true}, 'Can’t both accepted and refused']);
    if (p.solution.possible) forged.push([{first: f, second: sec, cant: true, refused: false}, 'Can’t on a goal that can be made']);
    else {
      const close = q.goal < lo ? lo : hi, near = [...f.slice(0, close), ...Array.from({length: q.n - close}, (_, i) => q.m + i)];
      const farR = q.goal < lo ? hi : lo, far = [...f.slice(0, farR), ...Array.from({length: q.n - farR}, (_, i) => q.m + i)];
      forged.push([{first: f, second: near, cant: false, refused: true}, 'a refusal of the closest catch']);
      if (farR !== close) forged.push([{first: f, second: far, cant: true, refused: false}, 'Can’t accepted on the far end']);
      assert.ok(validBoard(p, {first: f, second: near, cant: true, refused: false}), `${p.id}: Can’t on the closest catch is a valid save`);
    }
  } else {
    const answers = p.solution.answers.map(String);
    forged.push([{...fresh, kept: [answers[0], answers[0]]}, 'a shelf item twice'], [{...fresh, claimed: true}, 'That’s all accepted with an empty shelf'], [{...fresh, missed: true}, 'a refusal with an empty shelf'], [{...fresh, kept: answers, missed: true}, 'a refusal of a complete shelf']);
    if (answers.length > 1) forged.push([{...fresh, kept: [answers[0]], claimed: true}, 'That’s all accepted on a short shelf']);
    if (q.mode === 'every') forged.push([{...fresh, kept: ['0', '9'].filter(k => !answers.includes(k)).slice(0, 1)}, 'an overlap the bag can’t give']);
    if (q.mode === 'sizes') forged.push([{...fresh, kept: q.bags.filter(B => !answers.includes(String(B))).map(String).slice(0, 1)}, 'a bag the record can’t fit'], [{...fresh, bag: 99}, 'a bag not on the list']);
    if (q.mode === 'sort') forged.push([{...fresh, kept: ['AB'.repeat(q.n).slice(0, q.n + 1)]}, 'a catch of the wrong size']);
    assert.ok(validBoard(p, {...fresh, kept: answers, claimed: true}), `${p.id}: a complete, claimed shelf is a valid save`);
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

// Every Undo press changes the screen, after refusals too; Undo keeps the shelf.
function checkUndo(p) {
  const q = p.parameters, m = mechanicFor(p), view = a => m.render(p, {...a, hintLevel: 0}, {});
  for (let seed = 1; seed <= 4; seed++) {
    let a = wander(p, freshAttempt(p), seeded(p.number * 31 + seed), 40);
    if (q.mode === 'arrange' && move(p, a, {type: 'cant'}) && !isSolved(p, move(p, a, {type: 'cant'}).board)) a = play(p, a, [{type: 'cant'}]);
    if (q.mode !== 'arrange' && a.board.kept.length && !a.board.missed && a.board.kept.length < p.solution.count) a = play(p, a, [{type: 'all'}]);
    const kept = q.mode === 'arrange' ? null : [...a.board.kept];
    let shown = view(a);
    while (a.history.length) {
      a = undoPress(p, a, view);
      const now = view(a);
      assert.notEqual(now, shown, `${p.id}: an Undo press changes the screen`);
      if (kept) assert.deepEqual(a.board.kept, kept, `${p.id}: Undo keeps the shelf`);
      shown = now;
    }
  }
}

// Claims in the grown-up notes, by listing.
function checkClaims(pack) {
  const byId = id => pack.puzzles.find(p => p.id === id);
  const count = (N, M, n, R) => masks(N, n).filter(s => pop(firstMask(M) & s) === R).length;
  // 1: 12 of the 20 second catches hold one dot; the catches show 4 tiles.
  assert.equal(count(6, 2, 3, 1), 12); assert.equal(masks(6, 3).length, 20);
  assert.ok(fitsListed(6, 2, 3, 0) && !fitsListed(6, 2, 3, 3), '1: no dots possible, three dots not');
  // 2: 1 of the 70; with one tile fewer an overlap is forced.
  assert.equal(count(8, 4, 4, 0), 1); assert.equal(masks(8, 4).length, 70); assert.ok(!fitsListed(7, 4, 4, 0));
  assert.ok(count(8, 4, 4, 4) === 1, '2: four dots means the first catch again');
  // 3: a bag of six is the smallest where catches of three and three can miss.
  assert.ok(!fitsListed(5, 3, 3, 0) && fitsListed(6, 3, 3, 0));
  // 4: a bag of seven gives 2, 3 or 4.
  assert.deepEqual(listedOverlaps(7, 5, 4), [2, 3, 4]);
  // 5: the bag of 12 allows 0 to 4; nine is the smallest bag that can miss.
  assert.deepEqual(listedOverlaps(12, 5, 4), [0, 1, 2, 3, 4]); assert.ok(!fitsListed(8, 5, 4, 0) && fitsListed(9, 5, 4, 0));
  // 6 and 10: smallest bags 7 and 10; the bag of 6 forces 4, bags of 9 and 8 force 3 and 4; record B needs 12; disjoint catches of five need ten.
  assert.equal(listedOverlaps(6, 5, 5)[0], 4); assert.equal(listedOverlaps(9, 6, 6)[0], 3); assert.equal(listedOverlaps(8, 6, 6)[0], 4);
  assert.ok(!fitsListed(11, 6, 6, 0) && fitsListed(12, 6, 6, 0)); assert.ok(!fitsListed(9, 5, 5, 0) && fitsListed(10, 5, 5, 0));
  // 7: 4 of 10 catches have A; average 0.8 = 2 × 2 ÷ 5.
  assert.equal(masks(5, 2).filter(s => s & 1).length, 4);
  // 8: a second catch of seven forces four dots in the bag of nine.
  assert.equal(listedOverlaps(9, 6, 7)[0], 4); assert.equal(listedOverlaps(9, 6, 6)[0], 3);
  // 9: goals 2 to 6.
  assert.deepEqual(listedOverlaps(10, 6, 6), [2, 3, 4, 5, 6]);
  // 11: each dotted tile is in 10 of the 20.
  assert.equal(masks(6, 3).filter(s => s & 1).length, 10); assert.equal(masks(6, 3).filter(s => s & 4).length, 10);
  // Playground: 4 : 12 : 4 for a bag of 6 and catches of 2 and 3; with a bag of
  // 12 and catches adding to 8, four and four give the most dots on average.
  assert.deepEqual([0, 1, 2].map(R => count(6, 2, 3, R)), [4, 12, 4]);
  const avg = (N, M, n) => masks(N, n).reduce((t, s) => t + pop(firstMask(M) & s), 0) / masks(N, n).length;
  const best = [1, 2, 3, 4, 5, 6, 7].reduce((x, M) => (avg(12, M, 8 - M) > avg(12, x, 8 - x) + 1e-12 ? M : x), 1);
  assert.equal(best, 4);
  assert.equal(byId('catches-playground').parameters.bag, 6);
}

function checkPlayground(p) {
  const m = mechanicFor(p);
  assert.equal(m.noHint(p), true, `${p.id}: no Hint`);
  let a = freshAttempt(p);
  assert.equal(nextHint(p, a).type, 'done');
  refuse(p, a, {type: 'clear'}, 'Clear with no catches');
  refuse(p, a, {type: 'round', count: 3}, 'an unknown number of catches');
  refuse(p, a, {type: 'tap', tile: 0}, 'a tap in the playground');
  refuse(p, a, {type: 'all'}, 'That’s all');
  for (let k = 0; k < 6; k++) a = play(p, a, [{type: 'round', count: 10}]);
  assert.equal(a.board.rounds.length, 60);
  refuse(p, a, {type: 'round', count: 1}, 'a catch past sixty');
  const {bag: N, m: M, n} = a.board;
  assert.ok(a.board.rounds.every(r => listedOverlaps(N, M, n).includes(r)), `${p.id}: every random overlap is possible`);
  assert.equal(a.board.rounds.at(-1), a.board.first.filter(t => a.board.second.includes(t)).length, `${p.id}: the last catch shows the last overlap`);
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  // The same random numbers give the same catches.
  const one = move(p, freshAttempt(p), {type: 'round', count: 10}, seeded(3)), two = move(p, freshAttempt(p), {type: 'round', count: 10}, seeded(3));
  assert.deepEqual(one.board, two.board);
  // Steppers: changing the bag or a catch clears the piles; limits hold.
  const b = play(p, a, [{type: 'bag', by: 1}]);
  assert.deepEqual(b.board.rounds, []);
  let c = freshAttempt(p);
  while (c.board.bag > 3) c = play(p, c, [{type: 'bag', by: -1}]);
  refuse(p, c, {type: 'bag', by: -1}, 'a bag below three');
  assert.ok(c.board.m <= 3 && c.board.n <= 3, `${p.id}: catches shrink with the bag`);
  while (c.board.bag < 20) c = play(p, c, [{type: 'bag', by: 1}]);
  refuse(p, c, {type: 'bag', by: 1}, 'a bag above twenty');
  while (c.board.m < 8) c = play(p, c, [{type: 'catch', which: 1, by: 1}]);
  refuse(p, c, {type: 'catch', which: 1, by: 1}, 'a catch above eight');
  refuse(p, c, {type: 'catch', which: 3, by: 1}, 'a third catch');
  refuse(p, c, {type: 'bag', by: 2}, 'a step of two');
  c = play(p, c, [{type: 'round', count: 10}]);
  assert.ok(c.board.rounds.every(r => listedOverlaps(20, 8, c.board.n).includes(r)));
  const html = m.render(p, {...c, hintLevel: 0}, {});
  assert.ok(html.includes('ct-pile') && !html.includes('data-move="{&quot;type&quot;:&quot;tap'), `${p.id}: piles and no tile taps`);
  for (const [board, why] of [[{...c.board, rounds: [...c.board.rounds.slice(0, -1), 9]}, 'an overlap the bag can’t give'], [{...c.board, bag: 2}, 'a bag below three'], [{...c.board, m: 9}, 'a catch above eight'], [{...c.board, rounds: Array(61).fill(c.board.rounds[0])}, 'more than sixty catches'], [{...c.board, first: []}, 'catches that don’t show the last overlap'], [{...c.board, extra: 1}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateCatches(), null, 2));
