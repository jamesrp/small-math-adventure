// Checks the Paint rows pack (dist/families/paint/paint.json): content fields
// and sources; every puzzle's fewest cards, or its two starts that never
// become one, against a separate simulator (rows as bit masks, every run of
// cards listed in turn rather than searched, and pairs of rows searched
// separately); the theorems the notes rely on, over every small case (Hamming
// distance, 2^u finishes, turns keep every difference, the last paint then its
// turns, copies keep the one-colour rows, one paint and copies, the shift is
// one-to-one, paint-and-shift needs 2n − 1 cards, equally likely finishes);
// that hints alone finish every puzzle; illegal moves; forged saves; and the
// playground.
// Run: node scripts/validate-paint.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoToSolvable} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
// The simulator. Tile i of n is bit n − i, blue = 1. A pattern card is three
// masks: the tiles it paints, the colours it paints them, the tiles it turns.
// A copy reads one bit and writes another; the shift rotates the bits left.
const toMask = row => [...row].reduce((m, c) => (m << 1) | (c === 'B' ? 1 : 0), 0);
const toRow = (m, n) => m.toString(2).padStart(n, '0').replace(/0/g, 'Y').replace(/1/g, 'B');
const bit = (n, tile) => 1 << (n - tile);
function toCard(card, n) {
  if (card === '<') return {paint: 0, blue: 0, turn: 0, shift: true, play: m => ((m << 1) & (2 ** n - 1)) | (m >> (n - 1))};
  if (card[0] === 'C') {
    const from = bit(n, Number(card[1])), to = bit(n, Number(card[2]));
    return {paint: 0, blue: 0, turn: 0, copy: to, play: m => (m & from) ? m | to : m & ~to};
  }
  const c = {paint: toMask(card.replace(/[YB]/g, 'B').replace(/[.F]/g, 'Y')), blue: toMask(card.replace(/[.FY]/g, 'Y')), turn: toMask(card.replace(/[YB.]/g, 'Y').replace(/F/g, 'B'))};
  return {...c, play: m => ((m & ~c.paint) | c.blue) ^ c.turn};
}
const startsFor = q => q.rows === 'all' ? range(0, 2 ** q.slots - 1) : q.rows.map(toMask);
const done = (q, rows) => rows.every(r => r === rows[0]) && (!q.target || rows[0] === toMask(q.target));
// Every run of exactly len cards from the hand, as lists of hand indices.
function* runs(size, len) {
  const at = Array(len).fill(0);
  if (len === 0) { yield []; return; }
  for (;;) {
    yield [...at];
    let i = len - 1;
    while (i >= 0 && ++at[i] === size) at[i--] = 0;
    if (i < 0) return;
  }
}
const finish = (q, cards, run) => startsFor(q).map(s => run.reduce((m, k) => cards[k].play(m), s));
// The fewest cards by listing every run of each length in turn, up to max.
function fewest(q, max) {
  const cards = q.hand.map(c => toCard(c, q.slots));
  for (let len = 0; len <= max; len++) for (const run of runs(cards.length, len)) if (done(q, finish(q, cards, run))) return {len, run};
  return null;
}
const countRuns = (q, len) => { const cards = q.hand.map(c => toCard(c, q.slots)); let c = 0; for (const run of runs(cards.length, len)) if (done(q, finish(q, cards, run))) c++; return c; };
// The pairs of starts no run of cards ever joins: every pair of rows the hand
// can reach from them, searched.
function neverPairs(q) {
  const cards = q.hand.map(c => toCard(c, q.slots)), starts = startsFor(q), out = [];
  for (let i = 0; i < starts.length; i++) for (let j = i + 1; j < starts.length; j++) {
    const seen = new Set([`${starts[i]},${starts[j]}`]), queue = [[starts[i], starts[j]]];
    let joined = false;
    while (queue.length && !joined) {
      const [x, y] = queue.shift();
      for (const c of cards) {
        const a = c.play(x), b = c.play(y);
        if (a === b) { joined = true; break; }
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        if (!seen.has(key)) { seen.add(key); queue.push([a, b]); }
      }
    }
    if (!joined) out.push([toRow(starts[i], q.slots), toRow(starts[j], q.slots)].sort().join());
  }
  return out;
}
// Why a pair never joins, by the two certificates the notes give: a tile that
// only turn cards ever change (no paint, copy or shift touches it), where the
// pair differs; or a hand of copies and turns only, which keeps two rows that
// differ at every tile differing at every tile.
function certified(q, pair) {
  const n = q.slots, cards = q.hand.map(c => toCard(c, n)), [a, b] = pair.map(toMask);
  const onlyTurned = range(1, n).filter(t => cards.every(c => !c.shift && !(c.paint & bit(n, t)) && c.copy !== bit(n, t)));
  if (onlyTurned.some(t => (a ^ b) & bit(n, t))) return 'a tile only turns';
  if (cards.every(c => !c.shift && !c.paint) && (a ^ b) === 2 ** n - 1) return 'rows that differ everywhere';
  return null;
}

const hintRun = (p, a, label, limit = 60) => {
  let steps = 0;
  for (; steps < limit && !isSolved(p, a.board); steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${label}: hints keep naming a move`);
    assert.ok(h.text && !/[.]{2}|[YBF]{2}|C\d\d|</.test(h.text), `${label}: hint text in words: ${h.text}`);
    a = move(p, a, h.action);
    assert.ok(a, `${label}: the hinted move ${JSON.stringify(h.action)} is legal`);
  }
  assert.ok(isSolved(p, a.board), `${label}: hints finish the puzzle`);
  assert.equal(nextHint(p, a).type, 'done');
  return steps;
};

// The theorems, over every small case.
function theorems() {
  let checked = 0;
  for (let n = 1; n <= 4; n++) {
    const singles = range(1, n).flatMap(t => ['Y', 'B', 'F'].map(c => Array.from({length: n}, (_, j) => j === t - 1 ? c : '.').join('')));
    const paints = singles.filter(c => !c.includes('F'));
    // Two rows: the fewest single paint cards is the Hamming distance.
    for (let a = 0; a < 2 ** n; a++) for (let b = 0; b < 2 ** n; b++) {
      const q = {slots: n, rows: [toRow(a, n), toRow(b, n)], hand: paints};
      const hamming = [...(a ^ b).toString(2)].filter(c => c === '1').length;
      assert.equal(fewest(q, n).len, hamming, `fewest cards for ${q.rows} is their Hamming distance`);
      checked++;
    }
    if (n > 3) continue;
    const cards = singles.map(c => toCard(c, n)), all = range(0, 2 ** n - 1);
    for (let len = 0; len <= 4; len++) for (const run of runs(cards.length, len)) {
      const out = all.map(s => run.reduce((m, k) => cards[k].play(m), s));
      // 2^u different finishes, u = tiles never painted.
      const painted = run.reduce((m, k) => m | cards[k].paint, 0), u = n - [...painted.toString(2)].filter(c => c === '1').length;
      assert.equal(new Set(out).size, 2 ** u, `${run.map(k => singles[k]).join(' ')}: 2^${u} finishes`);
      // Turns alone keep every difference: the run is one-to-one.
      if (!painted) for (const s of all) for (const t of all) assert.equal(out[s] ^ out[t], s ^ t, 'turns keep the differences');
      // A painted tile ends as its last paint, turned once per later turn.
      for (let tile = 1; tile <= n; tile++) {
        const b = bit(n, tile), last = run.map((k, i) => (cards[k].paint & b) ? i : -1).reduce((x, y) => Math.max(x, y), -1);
        if (last < 0) continue;
        const flips = run.slice(last + 1).filter(k => cards[k].turn & b).length, colour = ((cards[run[last]].blue & b) ? 1 : 0) ^ (flips % 2);
        for (const m of out) assert.equal((m & b) ? 1 : 0, colour, 'the last paint, then its turns');
      }
      checked++;
    }
  }
  // Copies (bonus Problem 1): every run of up to five of the six copies on
  // three tiles keeps the all-yellow and all-blue rows, and keeps every pair
  // of rows that differ at every tile differing at every tile.
  const copies = ['C12', 'C13', 'C21', 'C23', 'C31', 'C32'], copyCards = copies.map(c => toCard(c, 3));
  for (let len = 0; len <= 5; len++) for (const run of runs(6, len)) {
    const go = m => run.reduce((x, k) => copyCards[k].play(x), m);
    assert.equal(go(0), 0, 'copies keep YYY'); assert.equal(go(7), 7, 'copies keep BBB');
    for (let s = 0; s < 8; s++) assert.equal(go(s) ^ go(7 - s), 7, 'copies keep rows that differ everywhere apart');
    checked++;
  }
  // One paint and copies (bonus Problem 1 extension): for every set of copies
  // on three tiles and every tile painted, the 8 starts can be joined exactly
  // when the copies lead from the painted tile to every tile.
  for (let graph = 0; graph < 64; graph++) {
    const hand0 = copies.filter((_, k) => (graph >> k) & 1);
    for (let t = 1; t <= 3; t++) {
      const q = {slots: 3, rows: 'all', hand: [Array.from({length: 3}, (_, j) => j === t - 1 ? 'B' : '.').join(''), ...hand0]};
      const reach = new Set([t]);
      for (let grew = true; grew;) { grew = false; for (const c of hand0) if (reach.has(Number(c[1])) && !reach.has(Number(c[2]))) { reach.add(Number(c[2])); grew = true; } }
      assert.equal(neverPairs(q).length === 0, reach.size === 3, `one paint on tile ${t} with ${hand0.join(' ')}`);
      checked++;
    }
  }
  // The shift is one-to-one; painting tile 1 and shifting needs 2n − 1 cards,
  // and the shortest story is unique (bonus Problem 3 and its extension).
  for (let n = 2; n <= 5; n++) {
    const shift = toCard('<', n);
    assert.equal(new Set(range(0, 2 ** n - 1).map(shift.play)).size, 2 ** n, `the shift on ${n} tiles is one-to-one`);
    const q = {slots: n, rows: 'all', hand: [`Y${'.'.repeat(n - 1)}`, '<']};
    for (let len = 0; len < 2 * n - 1; len++) assert.equal(countRuns(q, len), 0, `${n} tiles: no story of ${len}`);
    assert.equal(countRuns(q, 2 * n - 1), 1, `${n} tiles: one story of 2n − 1`);
    checked++;
  }
  // Grades 4–5 Problem 6: positions 1, 3, 1, 2 with 16 colour stories give
  // each of the 8 finishes twice, from every start.
  const tally = new Map();
  for (let colours = 0; colours < 16; colours++) {
    const run = [1, 3, 1, 2].map((tile, i) => toCard(Array.from({length: 3}, (_, j) => j === tile - 1 ? ((colours >> i) & 1 ? 'B' : 'Y') : '.').join(''), 3));
    for (let s = 0; s < 8; s++) { const f = run.reduce((m, c) => c.play(m), s); tally.set(`${s}:${f}`, (tally.get(`${s}:${f}`) || 0) + 1); }
  }
  for (let s = 0; s < 8; s++) for (let f = 0; f < 8; f++) assert.equal(tally.get(`${s}:${f}`), 2, 'each finish equally likely');
  return checked;
}

const rowsNow = (p, a) => { const q = p.parameters, cards = q.hand.map(c => toCard(c, q.slots)); return finish(q, cards, a.board.story).map(m => toRow(m, q.slots)); };

export default async function validatePaint() {
  const paint = JSON.parse(await readFile(new URL('../dist/families/paint/paint.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  const puzzles = paint.puzzles.filter(p => p.band !== 'playground'), playground = paint.puzzles.find(p => p.band === 'playground');
  assert.equal(puzzles.length, 11);
  assert.deepEqual(puzzles.map(p => p.number), range(1, 11));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const s of paint.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(paint.families[0].id, 'paint');
  let hintSteps = 0, refusals = 0, forgeries = 0;
  for (const p of puzzles) {
    const q = p.parameters, label = p.id, n = q.slots;
    assert.equal(p.id, `paint-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'paint'); assert.equal(p.band, 'all'); assert.equal(p.familyTitle, 'Paint rows');
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    assert.ok(q.hand.every(c => c === '<' || (/^C\d\d$/.test(c) && c[1] !== c[2] && Number(c[1]) <= n && Number(c[2]) <= n) || (new RegExp(`^[.YBF]{${n}}$`).test(c) && /[YBF]/.test(c))), `${label}: cards fit the rows`);
    assert.equal(new Set(q.hand).size, q.hand.length, `${label}: no card twice`);
    if (q.rows !== 'all') { assert.equal(q.rows.length, 2); assert.notEqual(q.rows[0], q.rows[1], `${label}: two different rows`); assert.equal(q.cant, false, `${label}: Can’t only with every start`); }
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${label}: fresh board is valid`);
    assert.ok(!isSolved(p, fresh.board), `${label}: not solved at the start`);
    assert.ok(mechanicFor(p).render(p, fresh).length > 100, `${label}: renders`);

    const never = neverPairs(q), starts = startsFor(q).map(m => toRow(m, n));
    let joinable = null;
    for (let i = 0; i < starts.length && !joinable; i++) for (let j = i + 1; j < starts.length && !joinable; j++) if (!never.includes([starts[i], starts[j]].sort().join())) joinable = [starts[i], starts[j]].sort();
    if (p.solution.apart) {
      // Two starts that never join: the pair search agrees, a certificate
      // explains every such pair, no run of up to six cards solves, and the
      // claim on the pair is accepted, before any card and after some.
      assert.ok(q.cant && !q.budget, `${label}: Can’t is offered and there is no budget`);
      assert.ok(never.includes(p.solution.apart.join()), `${label}: the pair search agrees`);
      for (const pair of never) assert.ok(certified(q, pair.split(',')), `${label}: ${pair} has a certificate`);
      assert.equal(fewest(q, Math.min(6, Math.floor(Math.log(20000) / Math.log(q.hand.length)))), null, `${label}: no short run solves`);
      const a = move(p, fresh, {type: 'cant', rows: p.solution.apart});
      assert.ok(a && isSolved(p, a.board), `${label}: the right claim solves`);
      assert.deepEqual(a.board.claimed, p.solution.apart);
      assert.equal(move(p, a, {type: 'play', card: 0}), null, `${label}: nothing after a solve`);
      let later = fresh;
      for (let k = 0; k < q.hand.length; k++) later = move(p, later, {type: 'play', card: k});
      const cards = q.hand.map(c => toCard(c, n)), now = p.solution.apart.map(r => toRow(later.board.story.reduce((m, k) => cards[k].play(m), toMask(r)), n));
      assert.notEqual(now[0], now[1]);
      const b = move(p, later, {type: 'cant', rows: now});
      assert.ok(b && isSolved(p, b.board), `${label}: the claim on the same pair later solves`);
    } else {
      // A solvable puzzle: the fewest cards by listing every run, the budget
      // equal to it, and the witness played as moves.
      assert.deepEqual(never, [], `${label}: every pair of starts can join`);
      const best = fewest(q, q.budget ?? 8);
      assert.ok(best, `${label}: solvable`);
      assert.equal(best.len, p.solution.fewest, `${label}: fewest cards`);
      if (q.budget) assert.equal(q.budget, best.len, `${label}: the budget is the fewest`);
      if (q.budget) assert.equal(countRuns(q, q.budget - 1), 0, `${label}: one card fewer never works`);
      if (p.difficulty_level === 'hard') assert.equal(countRuns(q, q.budget), 1, `${label}: exactly one shortest order`);
      let a = fresh;
      for (const card of p.solution.cards) {
        assert.ok(!isSolved(p, a.board));
        a = move(p, a, {type: 'play', card: q.hand.indexOf(card)});
        assert.ok(a, `${label}: the witness card ${card} is legal`);
      }
      assert.ok(isSolved(p, a.board), `${label}: the witness solves`);
      if (q.budget) assert.equal(move(p, undo(a), {type: 'play', card: q.hand.indexOf(p.solution.cards.at(-1))}).board.story.length, q.budget);
    }
    // A claim on two rows that can still join is refused, with the board kept;
    // the refusal clears on the next card, and hints still finish.
    if (q.cant) {
      const r = move(p, fresh, {type: 'cant', rows: joinable});
      assert.ok(r && !isSolved(p, r.board) && r.board.refused.join() === joinable.join(), `${label}: claim on ${joinable} refused`);
      assert.deepEqual(r.board.story, fresh.board.story);
      assert.match(mechanicFor(p).render(p, r), /can still become one/);
      const after = move(p, r, {type: 'play', card: 0});
      assert.equal(after.board.refused, null, `${label}: the refusal clears on the next card`);
      hintSteps += hintRun(p, r, `${label} after a refused claim`);
      refusals++;
      // A claim must name two different rows on the table.
      const rows = rowsNow(p, fresh);
      for (const bad of [[rows[0], rows[0]], [rows[0]], [rows[0], 'Y'.repeat(n + 1)], 'YY', null]) assert.equal(move(p, fresh, {type: 'cant', rows: bad}), null, `${label}: rejects a claim on ${JSON.stringify(bad)}`);
    } else assert.equal(move(p, fresh, {type: 'cant', rows: [...q.rows]}), null, `${label}: no Can’t`);

    // Hints alone, from a fresh board and from wasted cards.
    hintSteps += hintRun(p, fresh, label);
    if (q.budget) {
      let wasted = fresh;
      for (let i = 0; i < q.budget; i++) wasted = move(p, wasted, {type: 'play', card: (i * 2 + 1) % q.hand.length}) || wasted;
      if (!isSolved(p, wasted.board)) {
        assert.equal(nextHint(p, wasted).type, 'deadend', `${label}: a spent budget is a dead end`);
        hintSteps += hintRun(p, undoToSolvable(p, wasted), `${label} after Undo from wasted cards`);
      }
    }

    // Illegal moves.
    for (const action of [{type: 'play', card: q.hand.length}, {type: 'play', card: -1}, {type: 'play', card: '0'}, {type: 'cant', tile: 1}, {type: 'draw'}, {type: 'size', slots: 3}, {type: 'shrug'}, null, 'play']) {
      assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
    }
    if (q.budget) {
      let full = fresh;
      for (let i = 0; i < q.budget && !isSolved(p, full.board); i++) full = move(p, full, {type: 'play', card: i % q.hand.length});
      if (!isSolved(p, full.board)) assert.equal(move(p, full, {type: 'play', card: 0}), null, `${label}: no card past the budget`);
    }

    // Forged saves.
    const b = fresh.board, apartPair = never.length ? never[0].split(',') : null;
    const forged = [
      {...b, story: [q.hand.length]}, {...b, story: [-1]}, {...b, story: ['0']}, {...b, story: 'none'},
      {...b, story: Array(q.budget ? q.budget + 1 : 41).fill(0)}, {...b, extra: 1}, {story: []},
      {...b, claimed: joinable}, {...b, claimed: 1}, {...b, claimed: [joinable[0]]}, {...b, refused: [joinable[0], joinable[0]]},
      {...b, claimed: [...joinable].reverse()}, {...b, refused: ['Y'.repeat(n + 1), joinable[1]]},
      ...(apartPair ? [{...b, refused: apartPair}, {...b, claimed: apartPair, refused: joinable}, {...b, claimed: [...apartPair].reverse()}] : [])
    ];
    if (!q.cant) forged.push({...b, refused: joinable});
    for (const f of forged) {
      assert.equal(validBoard(p, f), false, `${label}: rejects a forged save ${JSON.stringify(f).slice(0, 80)}`);
      forgeries++;
    }
  }

  // The playground: sizes, two rows or every start, every single card, Draw,
  // Clear; never solved and no hints.
  assert.ok(playground);
  assert.equal(playground.mechanic, 'paint'); assert.equal(playground.parameters.mode, 'playground');
  let a = freshAttempt(playground);
  assert.ok(validBoard(playground, a.board));
  assert.equal(mechanicFor(playground).noHint(playground), true);
  a = move(playground, a, {type: 'rows', rows: 'all'});
  let seed = 1;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let draws = 0;
  const playRows = board => finish({slots: board.slots, rows: 'all'}, board.story.map(c => toCard(c, board.slots)), range(0, board.story.length - 1));
  while (new Set(playRows(a.board)).size > 1) { a = move(playground, a, {type: 'draw'}, random); draws++; }
  assert.ok(draws >= 3 && draws < 200, 'Draw joins every start in the end');
  assert.ok(a.board.story.every(c => !c.includes('F')), 'Draw plays paint cards');
  assert.ok(!isSolved(playground, a.board), 'the playground is never solved');
  assert.equal(move(playground, a, {type: 'play', card: '...Y'}), null, 'a card must fit the rows');
  assert.equal(move(playground, a, {type: 'play', card: 'YY.'}), null, 'only single-tile cards');
  assert.equal(move(playground, a, {type: 'play', card: '<'}), null, 'no shift in the playground');
  assert.ok(move(playground, a, {type: 'play', card: '.F.'}), 'a turn card');
  assert.equal(move(playground, a, {type: 'clear'}).board.story.length, 0, 'Clear');
  const four = move(playground, a, {type: 'size', slots: 4});
  assert.equal(four.board.slots, 4); assert.equal(four.board.rows, 'all'); assert.deepEqual(four.board.story, []);
  const two = move(playground, four, {type: 'rows', rows: 'two'}, random);
  assert.equal(two.board.rows.length, 2); assert.notEqual(two.board.rows[0], two.board.rows[1]);
  for (const f of [{...a.board, slots: 5}, {...a.board, story: ['YY.']}, {...a.board, story: ['C12']}, {...two.board, rows: ['YYYY']}, {...a.board, rows: ['YB', 'BY']}, {...a.board, extra: 1}]) {
    assert.equal(validBoard(playground, f), false, `playground rejects ${JSON.stringify(f).slice(0, 60)}`);
    forgeries++;
  }
  return {puzzles: puzzles.length, theoremCases: theorems(), hintSteps, refusals, forgeries};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validatePaint(), null, 2));
