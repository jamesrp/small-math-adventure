// Checks the Prime bags pack (dist/families/primes/primes.json) by methods
// unlike the mechanic's: values are the divisors of the bag's whole value
// found by trial division of every number up to it (never by choosing
// tokens); primes are numbers with exactly two divisors; a split route is a
// walk through multisets of whole numbers, and every route of every split
// card is followed to its end, both as multisets and through the engine; the
// least number with k divisors is found by counting divisors of 1, 2, 3, …
// with any primes allowed, and the design answers by listing every number
// 2^a 3^b 5^c 7^d with at most seven factors. Then every buildable bag is
// judged by That's all through the engine against those counts; the answers
// and the grown-up notes' claims; hint chains from fresh, after random play
// and after Undo; illegal moves; forged saves; Undo keeping kept values, the
// shelf and a refused That's all, with every press changing the screen; and
// the playground. Run: node scripts/validate-primes.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';

// --- An independent model --------------------------------------------------------
const divisors = n => { const out = []; for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d); return out; };
const tau = n => divisors(n).length;
const prime = n => tau(n) === 2;
function factor(n) { const out = []; let m = n; for (const d of divisors(n)) { if (d > 1 && prime(d)) while (m % d === 0) { out.push(d); m /= d; } } return out; }
const product = list => list.reduce((t, x) => t * x, 1);
const P = [2, 3, 5, 7];
const exps = n => P.map(p => { let e = 0; while (n % p === 0) { n /= p; e++; } return e; });
const bagTokens = c => c.flatMap((e, i) => Array(e).fill(P[i]));
const tokens0 = bagTokens;
const msKey = list => [...list].sort((x, y) => x - y).join(',');
const keySplits = c => [2, 3, 4, 5, 6, 7, 8, 9].filter(d => d < c && c % d === 0);
// Every route from a card through multisets: each step replaces one composite
// number c by d and c ÷ d. Returns the finished multisets and the number of
// state sequences (the math check's audit count) and the first splits.
function routes(n) {
  const ends = new Set(); let count = 0;
  (function walk(state) {
    const composites = [...new Set(state.filter(x => !prime(x)))];
    if (!composites.length) { ends.add(msKey(state)); count++; return; }
    const next = new Set();
    for (const c of composites) for (const d of divisors(c).filter(d => d > 1 && d < c)) {
      const i = state.indexOf(c), s = msKey([...state.slice(0, i), ...state.slice(i + 1), d, c / d]);
      next.add(s);
    }
    for (const s of next) walk(s.split(',').map(Number));
  })([n]);
  const firsts = divisors(n).filter(d => d > 1 && d * d <= n).map(d => [d, n / d]);
  return {ends: [...ends], count, firsts};
}
// The least number with k divisors, any primes allowed.
const leastWith = k => { for (let m = 1; ; m++) if (tau(m) === k) return m; };
// Every number the design board can build: 2^a 3^b 5^c 7^d, a + b + c + d ≤ 7.
const BUILDABLE = (() => { const out = []; for (let a = 0; a <= 7; a++) for (let b = 0; a + b <= 7; b++) for (let c = 0; a + b + c <= 7; c++) for (let d = 0; a + b + c + d <= 7; d++) out.push(2 ** a * 3 ** b * 5 ** c * 7 ** d); return out; })();

// --- Play through the engine --------------------------------------------------------
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next && next !== x, `${p.id}: ${JSON.stringify(action)} is legal from ${JSON.stringify(x.board)}`); return next; }, a);
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const takeBack = (p, a) => { const b = undo(a); return b === a ? a : {...b, board: mechanicFor(p).carry(p, a.board, b.board)}; };
function seeded(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; }
const bagOfBoard = (p, b) => (p.parameters.mode === 'every' ? p.parameters.bag : b.bag);
// The picks that choose value v (a divisor of the bag's value) from scratch.
function pickActions(p, a, v) {
  const tokens = bagTokens(bagOfBoard(p, a.board)), want = factor(v), out = [], have = [...a.board.pick];
  for (const i of have) out.push({type: 'pick', token: i});
  const used = new Set();
  for (const x of want) { const i = tokens.findIndex((t, k) => t === x && !used.has(k)); used.add(i); out.push({type: 'pick', token: i}); }
  return out;
}
const keepValue = (p, a, v) => play(p, a, [...pickActions(p, a, v), {type: 'keep'}]);
const build = (p, a, n) => play(p, a, factor(n).map(x => ({type: 'add', prime: x})));

function hintSolve(p, a, limit = 600) {
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
// Random legal play: a random control the board offers.
function wander(p, a, rnd, steps) {
  const m = mechanicFor(p);
  for (let s = 0; s < steps && !isSolved(p, a.board); s++) {
    const html = m.render(p, {...a, hintLevel: 0}, {});
    const moves = [...html.matchAll(/data-move="([^"]+)"/g)].map(x => JSON.parse(x[1].replace(/&quot;/g, '"')));
    const live = moves.map(action => move(p, a, action)).filter(Boolean);
    if (!live.length) break;
    const next = live[Math.floor(rnd() * live.length)];
    a = isSolved(p, next.board) && p.parameters.mode !== 'playground' ? a : next;
  }
  return a;
}

export default async function validatePrimes() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/primes/primes.json', import.meta.url), 'utf8'));
  const report = {puzzles: 0, routesPlayed: 0, bagsJudged: 0, hintMoves: 0};
  for (const p of pack.puzzles) {
    const q = p.parameters;
    if (q.mode === 'playground') { checkPlayground(p); continue; }
    report.puzzles++;
    if (q.mode === 'every') checkEvery(p);
    if (q.mode === 'split') report.routesPlayed += checkSplit(p);
    if (q.mode === 'design') report.bagsJudged += checkDesign(p);
    checkCopy(p);
    checkIllegal(p);
    checkSaves(p);
    report.hintMoves += hintSolve(p, freshAttempt(p));
    for (let seed = 1; seed <= 6; seed++) {
      let a = wander(p, freshAttempt(p), seeded(seed * 97 + p.number), 25 + seed * 9);
      report.hintMoves += hintSolve(p, a);
      for (let k = 0; k < 1 + seed % 3 && a.history.length; k++) a = takeBack(p, a);
      assert.ok(validBoard(p, a.board), `${p.id}: an undone board is valid`);
      report.hintMoves += hintSolve(p, a);
    }
    checkUndoPresses(p);
  }
  checkClaims(pack);
  assert.equal(pack.puzzles.filter(p => p.parameters.mode !== 'playground').length, 14);
  return report;
}

// Every value: the divisors of the bag's value, kept through the engine; That's
// all refused while any one is missing, kept through Undo, and solving at the end.
function checkEvery(p) {
  const q = p.parameters, n = product(bagTokens(q.bag)), ds = divisors(n);
  assert.deepEqual(p.solution.values, ds, `${p.id}: the values are the divisors of ${n}`);
  assert.equal(p.solution.count, ds.length);
  let a = freshAttempt(p);
  refuse(p, a, {type: 'all'}, 'That’s all with an empty tray');
  for (const v of ds) {
    a = keepValue(p, a, v);
    // Choosing the same value with other tokens of the same number is not new.
    refuse(p, a, {type: 'keep'}, `keeping ${v} twice`);
    if (a.board.tray.length < ds.length) {
      const b = play(p, a, [{type: 'all'}]);
      assert.equal(b.board.said, 'more', `${p.id}: a tray without every divisor is refused`);
      assert.ok(!isSolved(p, b.board));
      refuse(p, b, {type: 'all'}, 'That’s all twice on one tray');
    }
  }
  assert.deepEqual(a.board.tray.map(c => product(bagTokens(c))), ds, `${p.id}: the tray holds the divisors, smallest first`);
  // Another token with the same number makes a value already kept.
  const twice = P.find((x, i) => q.bag[i] >= 2);
  if (twice) {
    const i = tokens0(q.bag).indexOf(twice), clear = a.board.pick.map(token => ({type: 'pick', token}));
    const b = play(p, a, [...clear, {type: 'pick', token: i + 1}]);
    refuse(p, b, {type: 'keep'}, `keeping ${twice} from its second token`);
  }
  // Every token choice makes a divisor, and every divisor is made: the
  // engine's value of each of the 2^tokens choices.
  const tokens = bagTokens(q.bag);
  for (let mask = 0; mask < 2 ** tokens.length; mask++) {
    const chosen = tokens.filter((_, i) => mask >> i & 1), v = product(chosen);
    assert.ok(ds.includes(v), `${p.id}: ${chosen} makes a divisor`);
  }
  a = play(p, a, [{type: 'all'}]);
  assert.ok(isSolved(p, a.board), `${p.id}: the full tray solves`);
  refuse(p, a, {type: 'keep'}, 'a move after the solve');
  // Missing any one divisor is refused.
  for (const v of ds) {
    let b = freshAttempt(p);
    for (const w of ds) if (w !== v) b = keepValue(p, b, w);
    b = play(p, b, [{type: 'all'}]);
    assert.equal(b.board.said, 'more', `${p.id}: a tray missing ${v} is refused`);
    // Undo keeps the refusal while the tray is the same, and keeps the tray.
    const back = takeBack(p, takeBack(p, b));
    assert.equal(back.board.tray.length, ds.length - 1, `${p.id}: Undo keeps kept values`);
    assert.equal(back.board.said, 'more', `${p.id}: Undo keeps the refusal while the tray is the same`);
    const done = play(p, keepValue(p, back, v), [{type: 'all'}]);
    assert.ok(isSolved(p, done.board), `${p.id}: keeping ${v} then solves`);
  }
}

// Splitting: every route through multisets ends in one bag; the first splits
// are the factor pairs; every route through the engine, from every first
// split, puts the right item on the shelf; That's all refused until complete.
function checkSplit(p) {
  const q = p.parameters, n = q.card, r = routes(n), bag = factor(n);
  assert.deepEqual(r.ends, [msKey(bag)], `${p.id}: every route ends in ${bag}`);
  assert.deepEqual(p.solution.splits, r.firsts, `${p.id}: the first splits are the factor pairs`);
  assert.deepEqual(p.solution.bag, bag);
  assert.ok(r.firsts.every(([d]) => keySplits(n).includes(d)), `${p.id}: every first split has a key`);
  // Every route through the engine: (card place, key) at each step.
  let played = 0;
  const seen = new Set();
  (function walk(a) {
    const cards = cardsShown(p, a);
    if (cards.every(prime)) {
      played++;
      assert.equal(msKey(cards), msKey(bag), `${p.id}: an engine route ends in ${bag}`);
      assert.equal(a.board.shelf.length, 1, `${p.id}: a finished run joins the shelf`);
      seen.add(String(a.board.shelf[0].pair));
      assert.deepEqual(a.board.shelf[0].bag, bag);
      return;
    }
    cards.forEach((c, i) => { if (!prime(c)) for (const d of keySplits(c)) walk(play(p, a, [{type: 'split', card: i, by: d}])); });
  })(freshAttempt(p));
  assert.deepEqual([...seen].sort(), r.firsts.map(String).sort(), `${p.id}: engine routes start with every first split`);
  // The shelf and That's all.
  let a = freshAttempt(p);
  refuse(p, a, {type: 'all'}, 'That’s all with an empty shelf');
  const finish = (a, first) => {
    a = play(p, a, [{type: 'split', card: 0, by: first}]);
    while (!cardsShown(p, a).every(prime)) { const cards = cardsShown(p, a), i = cards.findIndex(c => !prime(c)); a = play(p, a, [{type: 'split', card: i, by: keySplits(cards[i])[0]}]); }
    return a;
  };
  for (const [k, [d, e]] of r.firsts.entries()) {
    a = finish(a, k % 2 && keySplits(n).includes(e) ? e : d);
    refuse(p, a, {type: 'split', card: 0, by: 2}, 'a split after every card is prime');
    if (k < r.firsts.length - 1) {
      a = play(p, a, [{type: 'all'}]);
      assert.equal(a.board.said, 'more', `${p.id}: an incomplete shelf is refused`);
      refuse(p, a, {type: 'all'}, 'That’s all twice on one shelf');
      a = play(p, a, [{type: 'new'}]);
      refuse(p, a, {type: 'all'}, 'That’s all after New run with the same shelf');
      const back = takeBack(p, a);
      assert.equal(back.board.said, 'more', `${p.id}: Undo keeps the refusal`);
      assert.equal(back.board.shelf.length, k + 1, `${p.id}: Undo keeps the shelf`);
      // The same first split again adds nothing.
      const again = finish(a, d);
      assert.equal(again.board.shelf.length, k + 1, `${p.id}: a first split found again adds nothing`);
      assert.equal(again.board.said, 'more');
    }
  }
  a = play(p, a, [{type: 'all'}]);
  assert.ok(isSolved(p, a.board), `${p.id}: every first split solves`);
  return played;
}
function cardsShown(p, a) {
  const html = mechanicFor(p).render(p, {...a, hintLevel: 0}, {});
  const row = html.slice(html.indexOf('pb-cards'), html.indexOf('</div>', html.indexOf('pb-cards')));
  return [...row.matchAll(/>(\d+)<\/(?:span|button)>/g)].map(x => Number(x[1]));
}

// Design: every buildable bag judged by That's all with its complete tray.
function checkDesign(p) {
  const q = p.parameters, least = leastWith(q.goal), hits = BUILDABLE.filter(m => tau(m) === q.goal);
  assert.equal(p.solution.leastValue, least, `${p.id}: the least number with ${q.goal} divisors, any primes`);
  assert.ok(BUILDABLE.includes(least), `${p.id}: the least is buildable from 2, 3, 5, 7`);
  assert.equal(p.solution.bags, hits.length, `${p.id}: bags with ${q.goal} values`);
  assert.equal(hits.filter(m => m === least).length, 1);
  for (let m = 1; m < least; m++) assert.notEqual(tau(m), q.goal, `${p.id}: ${m} does not have ${q.goal} divisors`);
  let judged = 0;
  for (const m of BUILDABLE) {
    let a = build(p, freshAttempt(p), m);
    assert.equal(product(bagTokens(a.board.bag)), m);
    const tray = divisors(m).map(exps);
    a = {...a, board: {...a.board, tray}};
    assert.ok(validBoard(p, a.board), `${p.id}: a complete tray for ${m} is valid`);
    const b = play(p, a, [{type: 'all'}]);
    const want = tau(m) !== q.goal ? 'short' : q.least && m > least ? 'smaller' : 'done';
    if (want === 'done') assert.ok(isSolved(p, b.board), `${p.id}: ${m} solves`);
    else assert.equal(b.board.said, want, `${p.id}: ${m} is refused as ${want}`);
    judged++;
  }
  // Through keeps: the witness, a refusal kept through Undo, kept values
  // pruned by taking a token out and given back by Undo.
  const w = product(bagTokens(p.solution.witness));
  let a = build(p, freshAttempt(p), w);
  for (const v of divisors(w).slice(0, -1)) a = keepValue(p, a, v);
  a = play(p, a, [{type: 'all'}]);
  assert.equal(a.board.said, 'more', `${p.id}: a missing value is refused`);
  const shown = a.board.tray.length, top = factor(w).at(-1);
  let b = play(p, a, [{type: 'drop', prime: top}]);
  assert.ok(b.board.tray.length < shown && b.board.said === null, `${p.id}: taking a token out drops the values that need it and lifts the refusal`);
  b = takeBack(p, b);
  assert.equal(b.board.tray.length, shown, `${p.id}: Undo gives the values back`);
  assert.equal(b.board.said, 'more', `${p.id}: and the refusal with them`);
  b = play(p, b, [{type: 'add', prime: 2}]);
  assert.equal(b.board.tray.length, shown, `${p.id}: adding a token keeps every kept value`);
  a = play(p, keepValue(p, a, w), [{type: 'all'}]);
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  // A complete tray of the wrong count, through keeps, then Undo.
  const off = q.least ? BUILDABLE.find(m => tau(m) === q.goal && m > least) : BUILDABLE.find(m => m > 1 && tau(m) !== q.goal);
  let c = build(p, freshAttempt(p), off);
  for (const v of divisors(off)) c = keepValue(p, c, v);
  c = play(p, c, [{type: 'all'}]);
  assert.equal(c.board.said, q.least ? 'smaller' : 'short');
  const html = mechanicFor(p).render(p, {...c, hintLevel: 0}, {});
  assert.ok(html.includes(q.least ? 'There is a smaller bag.' : `Every value is here, but not ${q.goal}.`), `${p.id}: the refusal says so`);
  refuse(p, c, {type: 'all'}, 'That’s all twice on one bag and tray');
  refuse(p, c, {type: 'keep'}, 'Keep with every value kept');
  assert.equal(takeBack(p, play(p, c, [{type: 'pick', token: 0}])).board.said, c.board.said, `${p.id}: Undo of a choice keeps the refusal`);
  return judged;
}

// Copy never gives a count away.
function checkCopy(p) {
  const q = p.parameters;
  if (q.mode === 'design') {
    assert.ok(p.visibleObjective.includes(String(q.goal)), `${p.id}: the goal is shown`);
    return;
  }
  for (const text of [p.objective, p.visibleObjective]) assert.ok(!/\d/.test(text), `${p.id}: no number in "${text}"`);
  const word = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][p.solution.count];
  // "Two numbers" is the rule of a split, not an answer.
  for (const text of [p.title, p.objective, p.visibleObjective, p.hints[0]].map(t => t.replace(/two (whole )?numbers/g, ''))) {
    assert.ok(!new RegExp(`\\b${word}\\b`, 'i').test(text), `${p.id}: "${text}" does not give the count away`);
    assert.ok(!new RegExp(`\\b${p.solution.count}\\b`).test(text.replace(/Split \d+/, '')), `${p.id}: "${text}" does not give the count away`);
  }
  const html = mechanicFor(p).render(p, {...freshAttempt(p), hintLevel: 0}, {});
  assert.ok(!/slot|of \d+/.test(html), `${p.id}: no slots and no counter`);
}

function checkIllegal(p) {
  const q = p.parameters, fresh = freshAttempt(p);
  refuse(p, fresh, {type: 'nonsense'}, 'an unknown move');
  refuse(p, fresh, {type: 'all'}, 'That’s all with nothing found');
  if (q.mode === 'split') {
    const n = q.card, bad = [2, 3, 4, 5, 6, 7, 8, 9].find(d => d < n && n % d);
    refuse(p, fresh, {type: 'split', card: 0, by: bad}, `${bad} on ${n}`);
    refuse(p, fresh, {type: 'split', card: 0, by: 1}, 'a split by 1');
    refuse(p, fresh, {type: 'split', card: 0, by: n}, 'a split by the card itself');
    refuse(p, fresh, {type: 'split', card: 0, by: 10}, 'a key that is not there');
    refuse(p, fresh, {type: 'split', card: 1, by: 2}, 'a card that is not there');
    refuse(p, fresh, {type: 'split', card: 0, by: 2, extra: 1}, 'a move with an unknown field');
    refuse(p, fresh, {type: 'new'}, 'New run before anything happens');
    refuse(p, fresh, {type: 'pick', token: 0}, 'a choice of tokens');
    const a = play(p, fresh, [{type: 'split', card: 0, by: 2}]);
    refuse(p, a, {type: 'split', card: 0, by: 2}, 'splitting a prime');
    return;
  }
  refuse(p, fresh, {type: 'pick', token: -1}, 'a token off the bag');
  refuse(p, fresh, {type: 'pick', token: 0, extra: 1}, 'a move with an unknown field');
  refuse(p, fresh, {type: 'split', card: 0, by: 2}, 'a split');
  if (q.mode === 'every') {
    refuse(p, fresh, {type: 'pick', token: q.bag.reduce((t, e) => t + e, 0)}, 'a token past the bag');
    refuse(p, fresh, {type: 'add', prime: 2}, 'changing a given bag');
    refuse(p, fresh, {type: 'drop', prime: 2}, 'changing a given bag');
  } else {
    refuse(p, fresh, {type: 'drop', prime: 2}, 'taking out a token that is not there');
    refuse(p, fresh, {type: 'add', prime: 4}, 'a token that is not prime');
    refuse(p, fresh, {type: 'add', prime: 11}, 'a prime the supply lacks');
    refuse(p, fresh, {type: 'pick', token: 0}, 'a choice from an empty bag');
    const full = play(p, fresh, Array(7).fill({type: 'add', prime: 2}));
    refuse(p, full, {type: 'add', prime: 3}, 'an eighth token');
  }
  const kept = play(p, fresh, [{type: 'keep'}]);
  refuse(p, kept, {type: 'keep'}, 'keeping 1 twice');
}

function checkSaves(p) {
  const q = p.parameters, fresh = freshAttempt(p).board;
  const forged = [[{...fresh, extra: 1}, 'an unknown field'], [{...fresh, said: 'maybe'}, 'an unknown answer'], [{...fresh, done: true}, 'done with nothing found']];
  if (q.mode === 'split') {
    const n = q.card, firsts = p.solution.splits, bag = p.solution.bag;
    forged.push(
      [{...fresh, steps: [[0, n]]}, 'a split by the card itself'], [{...fresh, steps: [[0, 7]]}, 'a split by a key that does not divide'], [{...fresh, steps: 'x'}, 'steps that are not a list'],
      [{...fresh, shelf: [{pair: [1, n], bag}]}, 'a split with a 1'], [{...fresh, shelf: [{pair: firsts[0], bag: [n]}]}, 'a run that did not finish'],
      [{...fresh, shelf: [{pair: firsts[0], bag}, {pair: firsts[0], bag}]}, 'a first split twice'], [{...fresh, shelf: [{pair: [firsts[0][1], firsts[0][0]], bag}]}, 'a pair written backwards'],
      [{...fresh, shelf: [...firsts].reverse().map(pair => ({pair, bag}))}, 'a shelf out of order'], [{...fresh, said: 'more'}, 'a refusal with an empty shelf'],
      [{...fresh, shelf: firsts.map(pair => ({pair, bag})), said: 'more'}, 'a refusal of a complete shelf'], [{...fresh, shelf: [{pair: firsts[0], bag}], done: true}, 'done with a shelf short of first splits']);
    assert.ok(validBoard(p, {...fresh, shelf: firsts.map(pair => ({pair, bag})), done: true}), `${p.id}: a complete, claimed shelf is a valid save`);
  } else {
    const bag = q.mode === 'every' ? q.bag : exps(p.solution.leastValue), withBag = b => (q.mode === 'every' ? b : {...b, bag});
    const tray = divisors(product(bagTokens(bag))).map(exps);
    forged.push(
      [withBag({...fresh, pick: [0, 0]}), 'a token chosen twice'], [withBag({...fresh, pick: [1, 0]}), 'choices out of order'], [withBag({...fresh, pick: [99]}), 'a token off the bag'],
      [withBag({...fresh, tray: [[bag[0] + 1, 0, 0, 0]]}), 'a value the bag cannot make'],
      [withBag({...fresh, tray: [tray[0], tray[0]]}), 'a value twice'], [withBag({...fresh, tray: [tray[1], tray[0]]}), 'a tray out of order'], [withBag({...fresh, tray: [[0, 0, 0]]}), 'a value with the wrong shape'],
      [withBag({...fresh, tray, said: 'more'}), 'a refusal of a complete tray'], [withBag({...fresh, tray: tray.slice(1), done: true}), 'done with a value missing'], [withBag({...fresh, said: 'more'}), 'a refusal with an empty tray']);
    assert.ok(validBoard(p, withBag({...fresh, tray, done: true})), `${p.id}: a complete, claimed tray is a valid save`);
    if (q.mode === 'design') {
      const wrong = BUILDABLE.find(m => m > 1 && tau(m) !== q.goal), wb = exps(wrong), wt = divisors(wrong).map(exps);
      forged.push([{...fresh, bag: [8, 0, 0, 0]}, 'a bag over the limit'], [{...fresh, bag: [1, 1, 1]}, 'a bag with the wrong shape'], [{...fresh, bag: wb, tray: wt, done: true}, `done with ${wrong}, which misses the count`], [{...fresh, bag: wb, tray: wt, said: 'smaller'}, 'the wrong refusal']);
      if (q.least) {
        const big = BUILDABLE.find(m => tau(m) === q.goal && m > p.solution.leastValue), bb = exps(big), bt = divisors(big).map(exps);
        forged.push([{...fresh, bag: bb, tray: bt, done: true}, `done with ${big}, not the smallest`]);
        assert.ok(validBoard(p, {...fresh, bag: bb, tray: bt, said: 'smaller'}), `${p.id}: a refused bigger bag is a valid save`);
      }
    }
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

// Every Undo press changes the screen, after a refusal too.
function checkUndoPresses(p) {
  const m = mechanicFor(p), view = a => m.render(p, {...a, hintLevel: 0}, {});
  let a = wander(p, freshAttempt(p), seeded(p.number * 31), 40);
  const all = move(p, a, {type: 'all'});
  if (all && !isSolved(p, all.board)) a = all;
  let shown = view(a);
  while (a.history.length) { a = undoPress(p, a, view); const now = view(a); assert.notEqual(now, shown, `${p.id}: an Undo press changes the screen`); shown = now; }
}

// Claims in the grown-up notes and the family's mathematics, by trial division.
function checkClaims(pack) {
  const byId = id => pack.puzzles.find(p => p.id === id);
  assert.deepEqual([4, 6, 8, 9, 10, 12].map(leastWith), [6, 12, 24, 36, 48, 60], 'least numbers with 4, 6, 8, 9, 10 and 12 divisors');
  assert.equal(tau(2 ** 7 * 3 ** 4), 40, 'seven 2s and four 3s: forty divisors');
  assert.equal(2 ** 7 * 3 ** 4, 10368);
  assert.equal(tau(32), 6, 'five 2s make six values');
  assert.deepEqual([36, 60, 72].map(tau), [9, 12, 12]);
  assert.deepEqual([24, 30].map(tau), [8, 8], 'four tokens and three tokens tie');
  assert.deepEqual([12, 18, 20, 28, 45, 50, 32].map(tau), Array(7).fill(6), 'puzzle 9’s examples make six values');
  assert.deepEqual(BUILDABLE.filter(m => tau(m) === 6).length, 16, 'sixteen buildable bags make six values');
  assert.ok(BUILDABLE.filter(m => tau(m) === 6).every(m => { const e = exps(m).filter(Boolean).sort(); return String(e) === '5' || String(e) === '1,2'; }), 'six values: p⁵ or p²q');
  assert.deepEqual([30, 24, 128].map(tau), [8, 8, 8], 'puzzle 13’s patterns');
  assert.deepEqual([60, 72, 96, 2048].map(tau), [12, 12, 12, 12], 'puzzle 14’s patterns');
  assert.equal(tau(54), 8);
  assert.ok(!BUILDABLE.includes(2048), '2¹¹ needs more tokens than the bag holds');
  for (let m = 1; m < 60; m++) assert.ok(tau(m) < 12, '60 has more divisors than any smaller number');
  assert.deepEqual(keySplits(60), [2, 3, 4, 5, 6], 'the keys that divide 60');
  assert.equal(tau(36) % 2, 1, '36 has an odd number of divisors');
  assert.equal(tau(60) / 2, 6, '60 has six divisor pairs');
  assert.deepEqual(routes(12).count, 2, 'math check: two routes for 12');
  assert.deepEqual(routes(36).count, 7, 'math check: seven routes for 36');
  assert.deepEqual(routes(60).count, 11, 'math check: eleven routes for 60');
  // Adding a token keeps every value: the divisors of n divide n · p.
  for (const m of BUILDABLE.filter(m => m <= 2000)) for (const x of P) assert.ok(divisors(m).every(d => (m * x) % d === 0));
  assert.equal(byId('primes-02').solution.count, 4);
  assert.deepEqual(byId('primes-01').solution.values, [1, 2, 3, 6]);
}

function checkPlayground(p) {
  const m = mechanicFor(p);
  assert.equal(m.noHint(p), true, `${p.id}: no Hint`);
  let a = freshAttempt(p);
  assert.equal(nextHint(p, a).type, 'done');
  a = build(p, a, 60);
  for (const v of divisors(60)) a = keepValue(p, a, v);
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  refuse(p, a, {type: 'all'}, 'That’s all');
  a = play(p, a, [{type: 'drop', prime: 5}]);
  assert.deepEqual(a.board.tray.map(c => product(bagTokens(c))), divisors(12), `${p.id}: taking out the 5 keeps the divisors of 12`);
  a = takeBack(p, a);
  assert.equal(a.board.tray.length, 12, `${p.id}: Undo gives them back`);
  for (const [board, why] of [[{bag: [8, 0, 0, 0], pick: [], tray: []}, 'a bag over the limit'], [{bag: [0, 0, 0, 0], pick: [], tray: [], said: null}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validatePrimes(), null, 2));
