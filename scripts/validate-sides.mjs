// Checks the Hidden sides pack (dist/families/sides/sides.json): content
// fields and sources; every puzzle's answer against a separate enumeration (a
// card as its two colours, a side as a card and which side, a cup as a set of
// sides); the theorems the notes rely on (with every side in the cup a red
// side hides red 2 times in 3, and a blue side blue; a cup of sides 1 and 3
// ties; a red clue ties exactly when the cup holds side 3 and one of sides 1
// and 2, 16 cups of 64; whole cards, one of each at most, never tie; copies
// tie exactly when there are twice as many mixed cards as red cards, and hide
// red 3 times in 4 exactly when 2 × red = 3 × mixed); hint chains to a solve
// from the start, from every cup, table or draw a child can reach, and from
// random walks with Undo; sorting by the colour underneath only after the card
// is turned over; Can't accepted only when no table works; illegal moves;
// forged saves; and the playground.
// Run: node scripts/validate-sides.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// A separate enumeration. Cards are colour pairs; sides are numbered 1 to 6
// card by card, so side n is card ⌈n/2⌉, side (n − 1) mod 2 of it.
const CARDS = [['R', 'R'], ['R', 'B'], ['B', 'B']];
const SIDES = CARDS.flatMap((c, i) => [0, 1].map(s => ({n: 2 * i + s + 1, up: c[s], down: c[1 - s]})));
const cups = Array.from({length: 64}, (_, m) => SIDES.filter(s => m >> (s.n - 1) & 1));
const showing = (cup, clue) => cup.filter(s => s.up === clue);
const under = (cup, clue) => ({R: showing(cup, clue).filter(s => s.down === 'R').length, B: showing(cup, clue).filter(s => s.down === 'B').length});
const works = (goal, cup, clue = 'R') => { const u = under(cup, clue); return u.R + u.B > 0 && (goal === 'tie' ? u.R === u.B : goal === 'blue' ? u.R === 0 : u.B === 0); };
const nums = cup => cup.map(s => s.n);
// A table of whole cards: copies of each card, every side of each copy in the cup.
const table = counts => counts.flatMap((k, i) => Array.from({length: k}, () => SIDES.filter(s => Math.ceil(s.n / 2) === i + 1)).flat());
const tableWorks = (goal, counts) => { const u = under(table(counts), 'R'); return u.R + u.B > 0 && (goal === 'tie' ? u.R === u.B : u.R === 3 * u.B); };
const tables = max => Array.from({length: (max + 1) ** 3}, (_, m) => [m % (max + 1), Math.floor(m / (max + 1)) % (max + 1), Math.floor(m / (max + 1) ** 2)]);
const key = list => list.join('');
const sorted = list => [...list].sort();

function theorems() {
  const all = SIDES;
  assert.deepEqual(under(all, 'R'), {R: 2, B: 1}, 'red shows: red underneath 2 ways, blue 1');
  assert.deepEqual(under(all, 'B'), {R: 1, B: 2}, 'blue shows: blue underneath 2 ways, red 1');
  assert.equal(SIDES.filter(s => s.up === s.down).length, 4, 'the colour underneath matches 4 times in 6');
  assert.deepEqual(under(SIDES.filter(s => [1, 3].includes(s.n)), 'R'), {R: 1, B: 1}, 'only 1 and 3: a tie');
  const ties = cups.filter(c => works('tie', c));
  assert.equal(ties.length, 16);
  for (const c of cups) {
    const has = n => nums(c).includes(n);
    assert.equal(works('tie', c), has(3) && has(1) !== has(2), `${key(nums(c))}: ties exactly with 3 and one of 1 and 2`);
    assert.equal(works('blue', c), has(3) && !has(1) && !has(2), `${key(nums(c))}: always blue with 3 and neither 1 nor 2`);
    assert.equal(works('red', c), (has(1) || has(2)) && !has(3), `${key(nums(c))}: always red with 1 or 2 and not 3`);
    assert.equal(works('tie', c, 'B'), has(4) && has(5) !== has(6), `${key(nums(c))}: blue ties with 4 and one of 5 and 6`);
  }
  // Whole cards, one of each at most: never a tie.
  for (const t of tables(1)) assert.equal(tableWorks('tie', t), false, `${t}: whole cards never tie`);
  // Copies, up to six of each: a tie exactly when mixed = 2 × red > 0, three to one exactly when 2 × red = 3 × mixed > 0.
  for (const t of tables(6)) {
    assert.deepEqual(under(table(t), 'R'), {R: 2 * t[0], B: t[1]});
    assert.equal(tableWorks('tie', t), t[1] === 2 * t[0] && t[1] > 0, `${t}: tie`);
    assert.equal(tableWorks('three', t), 2 * t[0] === 3 * t[1] && t[1] > 0, `${t}: three to one`);
  }
  return {ties: ties.map(c => key(nums(c)))};
}

// The answers each puzzle asks for, by the enumeration.
function answer(q) {
  if (q.mode === 'draw') return SIDES.filter(s => q.cup.includes(s.n) && s.up === q.clue).map(s => String(s.n));
  if (q.mode === 'design') return cups.filter(c => works(q.goal, c)).map(c => key(nums(c)));
  if (q.mode === 'designs') return cups.filter(c => works('tie', c)).map(c => key(nums(c)));
  return tables(q.max ?? 3).filter(t => tableWorks(q.goal, t)).map(key);
}
const TIES = ['13', '134', '1345', '13456', '1346', '135', '1356', '136', '23', '234', '2345', '23456', '2346', '235', '2356', '236'];
const expected = {
  'sides-01': ['1', '2', '3'], 'sides-02': ['4', '5', '6'], 'sides-03': ['1', '3'], 'sides-04': TIES,
  'sides-05': ['3', '34', '345', '3456', '346', '35', '356', '36'],
  'sides-07': TIES, 'sides-08': [], 'sides-09': ['120', '121', '122', '123'], 'sides-10': ['320', '321', '322', '323']
};

// Follow hints from a board to a solve; every hint is a legal move.
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const hint = nextHint(p, a);
    assert.equal(hint.type, 'move', `${label}: ${hint.text}`);
    const next = move(p, a, hint.action);
    assert.ok(next && next !== a, `${label}: hint ${JSON.stringify(hint.action)} is legal`);
    a = next;
  }
  assert.ok(isSolved(p, a.board), `${label}: hints reach a solve`);
  return [a, steps];
}
const at = (start, board) => ({...start, board: {...start.board, ...board}});
// A random walk of legal moves, with Undo now and then; hints solve from every
// board on the way.
function walk(p, start, actions, label, steps = 40) {
  let a = start, seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < steps && !isSolved(p, a.board); i++) {
    if (a.moves && random() < 0.15) a = undo(a);
    else { const next = move(p, a, actions[Math.floor(random() * actions.length)]); if (next) a = next; }
    assert.ok(validBoard(p, a.board), `${label}: a walk stays valid`);
    if (!isSolved(p, a.board)) hintsSolve(p, a, `${label} walk ${i}`);
  }
}

export async function validateSides() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const pack = await read('../dist/families/sides/sides.json'), {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'source ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  const family = pack.families[0];
  assert.equal(family.id, 'sides'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = pack.puzzles.filter(p => p.band === 'all'), playgrounds = pack.puzzles.filter(p => p.band === 'playground');
  assert.equal(playgrounds.length, 1); assert.equal(core.length + 1, pack.puzzles.length);
  assert.ok(core.length >= 8 && core.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(core.map(p => p.number), core.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(core.some(p => p.difficulty_level === level), level);
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'sides'); assert.ok(isExpansion(p)); assert.equal(p.revision, 1);
    assert.ok(p.id === 'sides-playground' || p.id === `sides-${String(p.number).padStart(2, '0')}`, `${p.id}: id`);
    for (const k of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id} ${k}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3); p.hints.forEach(h => assert.ok(h.trim()));
    for (const k of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[k]?.trim(), `${p.id} parent.${k}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
  }
  const facts = theorems();

  let hintSteps = 0;
  const answers = {};
  for (const p of core) {
    const q = p.parameters, want = answer(q);
    if (expected[p.id]) assert.deepEqual(sorted(want), expected[p.id], `${p.id}: the notes' answer`);
    if (p.id === 'sides-06') assert.equal(want.length, 24);
    answers[p.id] = want.length;

    const start = freshAttempt(p);
    assert.ok(validBoard(p, start.board) && !isSolved(p, start.board), `${p.id}: valid unsolved start`);
    const [a, steps] = hintsSolve(p, start, p.id);
    hintSteps += steps;
    for (const bad of [{type: 'draw', ticket: 1}, {type: 'look'}, {type: 'keep'}, {type: 'keep', bin: 'R'}, {type: 'claim'}, {type: 'toggle', ticket: 1}, {type: 'try'}, {type: 'cant'}, {type: 'count', card: 0, by: 1}]) assert.equal(move(p, a, bad), null, `${p.id}: no ${bad.type} after a solve`);
    const f = start.board;

    if (q.mode === 'draw') {
      assert.deepEqual(sorted(a.board.kept), sorted(want), `${p.id}: solved with every side, each once`);
      const bin = t => SIDES[t - 1].down;
      // Hints from any side shown, covered or turned over, with any sides already kept.
      for (let m = 0; m < 2 ** want.length; m++) {
        const kept = want.filter((_, i) => m >> i & 1);
        if (kept.length === want.length) continue;
        for (const shown of [null, ...q.cup]) for (const looked of shown === null ? [false] : [false, true]) for (const missed of kept.length ? [false, true] : [false]) hintsSolve(p, at(start, {shown, looked, kept, missed}), `${p.id} from ${shown}${looked ? ' turned' : ''} with ${kept}${missed ? ', missed' : ''}`);
      }
      walk(p, start, [...[1, 2, 3, 4, 5, 6].map(ticket => ({type: 'draw', ticket})), {type: 'look'}, {type: 'keep', bin: 'R'}, {type: 'keep', bin: 'B'}, {type: 'claim'}], p.id, 80);
      for (const bad of [null, 'draw', {type: 'draw', ticket: 7}, {type: 'draw', ticket: '1'}, {type: 'draw'}, {type: 'look'}, {type: 'keep'}, {type: 'keep', bin: 'R'}, {type: 'claim'}, {type: 'toggle', ticket: 1}, {type: 'try'}, {type: 'cant'}, {type: 'random'}]) assert.equal(move(p, start, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      for (const t of [1, 2, 3, 4, 5, 6]) assert.equal(!!move(p, start, {type: 'draw', ticket: t}), q.cup.includes(t), `${p.id}: side ${t} can be drawn only from the cup`);
      const wrongColour = q.cup.find(t => SIDES[t - 1].up !== q.clue);
      if (wrongColour) {
        const looked = move(p, move(p, start, {type: 'draw', ticket: wrongColour}), {type: 'look'});
        for (const c of ['R', 'B']) assert.equal(move(p, looked, {type: 'keep', bin: c}), null, `${p.id}: a side of the other colour isn't kept`);
      }
      const t0 = Number(want[0]), first = move(p, start, {type: 'draw', ticket: t0});
      assert.equal(first.board.looked, false, `${p.id}: drawn with the other side covered`);
      assert.equal(move(p, first, {type: 'draw', ticket: t0}), null, `${p.id}: the same side again`);
      for (const c of ['R', 'B']) assert.equal(move(p, first, {type: 'keep', bin: c}), null, `${p.id}: no sorting before the card is turned over`);
      const turned = move(p, first, {type: 'look'});
      assert.equal(move(p, turned, {type: 'look'}), null, `${p.id}: turned over once`);
      assert.equal(move(p, turned, {type: 'keep', bin: bin(t0) === 'R' ? 'B' : 'R'}), null, `${p.id}: the wrong pile is refused`);
      for (const bad of [{type: 'keep'}, {type: 'keep', bin: 'Y'}]) assert.equal(move(p, turned, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      const kept = move(p, turned, {type: 'keep', bin: bin(t0)});
      assert.deepEqual(kept.board.kept, [want[0]]); assert.equal(kept.board.shown, null, `${p.id}: sorting puts the side away`);
      assert.equal(move(p, move(p, move(p, kept, {type: 'draw', ticket: t0}), {type: 'look'}), {type: 'keep', bin: bin(t0)}), null, `${p.id}: kept once`);
      const early = move(p, kept, {type: 'claim'});
      assert.ok(early.board.missed && !isSolved(p, early.board), `${p.id}: an early That’s all says there is another`);
      assert.equal(move(p, early, {type: 'claim'}), null, `${p.id}: not twice in a row`);
      assert.ok(!undo(early).board.missed && undo(kept).board.shown === t0 && undo(kept).board.looked, `${p.id}: Undo`);
      const forged = [null, [], {...f, shown: 9}, {...f, shown: q.cup.length < 6 ? [1, 2, 3, 4, 5, 6].find(t => !q.cup.includes(t)) : 0}, {...f, looked: true}, {...f, looked: 'yes'}, {...f, kept: [want[0], want[0]]}, {...f, kept: ['9']}, {...f, kept: [String(wrongColour || 9)]}, {...f, claimed: true}, {...f, missed: true}, {...f, extra: 1}, {shown: null, kept: [], claimed: false, missed: false}];
      for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      assert.ok(validBoard(p, {...f, kept: a.board.kept, claimed: true}), `${p.id}: a real solve is a valid save`);
      continue;
    }

    if (q.mode === 'cards') {
      const max = q.max ?? 3;
      if (want.length) assert.ok(want.includes(key(a.board.counts)) && a.board.tried, `${p.id}: solved with a table that works`);
      else assert.ok(a.board.cant, `${p.id}: solved by Can’t`);
      for (const t of tables(max)) for (const tried of [false, true]) for (const cant of [false, true]) {
        const there = at(start, {counts: t, tried, cant});
        assert.ok(validBoard(p, there.board), `${p.id}: ${t} is a valid table`);
        if (!isSolved(p, there.board)) hintsSolve(p, there, `${p.id} from ${t}${tried ? ', tried' : ''}${cant ? ', Can’t' : ''}`);
      }
      walk(p, start, [0, 1, 2].flatMap(card => [1, -1].map(by => ({type: 'count', card, by}))).concat([{type: 'try'}, {type: 'try'}, {type: 'cant'}]), p.id, 60);
      // Can't is checked: right when no table within the limit works, refused otherwise.
      const cant = move(p, start, {type: 'cant'});
      assert.equal(isSolved(p, cant.board), want.length === 0, `${p.id}: Can’t is ${want.length ? 'refused' : 'right'}`);
      if (want.length) {
        assert.equal(move(p, cant, {type: 'cant'}), null, `${p.id}: Can’t once until the table changes`);
        assert.equal(move(p, cant, {type: 'count', card: 2, by: max > 1 ? 1 : -1}).board.cant, false, `${p.id}: a change clears the refusal`);
      }
      for (const bad of [null, {type: 'count', card: 3, by: 1}, {type: 'count', card: 0, by: 2}, {type: 'count', card: '0', by: 1}, {type: 'count'}, {type: 'toggle', ticket: 1}, {type: 'draw', ticket: 1}, {type: 'look'}, {type: 'keep'}, {type: 'claim'}]) assert.equal(move(p, start, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      let full = start;
      while (full.board.counts[0] < max) full = move(p, full, {type: 'count', card: 0, by: 1});
      assert.equal(move(p, full, {type: 'count', card: 0, by: 1}), null, `${p.id}: ${max} of a card at most`);
      let none = start;
      while (none.board.counts[2] > 0) none = move(p, none, {type: 'count', card: 2, by: -1});
      assert.equal(move(p, none, {type: 'count', card: 2, by: -1}), null, `${p.id}: no fewer than none`);
      const tried = move(p, start, {type: 'try'});
      assert.ok(tried.board.tried && !isSolved(p, tried.board), `${p.id}: the starting table doesn't work`);
      assert.equal(move(p, tried, {type: 'try'}), null, `${p.id}: Try it once until something changes`);
      assert.equal(move(p, tried, {type: 'count', card: 1, by: -1}).board.tried, false, `${p.id}: a change clears the try`);
      const forged = [null, {counts: [1, 1, 1], tried: false}, {...f, counts: [max + 1, 0, 0]}, {...f, counts: [-1, 0, 0]}, {...f, counts: [1, 1]}, {...f, tried: 'yes'}, {...f, cant: 1}, {...f, extra: 1}];
      for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      continue;
    }

    // A design, or every design.
    const cupOf = n => n.split('').map(Number);
    if (q.mode === 'design') {
      assert.ok(want.includes(key(a.board.cup)), `${p.id}: solved with a cup that works`);
      for (const c of cups) {
        if (!c.length) continue;
        for (const tried of [false, true]) {
          const there = at(start, {cup: nums(c), tried});
          if (!isSolved(p, there.board)) hintsSolve(p, there, `${p.id} from ${key(nums(c))}${tried ? ', tried' : ''}`);
        }
      }
      let one = at(start, {cup: [4], tried: false});
      assert.equal(move(p, one, {type: 'toggle', ticket: 4}), null, `${p.id}: the cup is never empty`);
      const tried = move(p, start, {type: 'try'});
      assert.ok(tried.board.tried && !isSolved(p, tried.board), `${p.id}: the full cup doesn't work`);
      assert.equal(move(p, tried, {type: 'try'}), null);
      assert.equal(move(p, tried, {type: 'toggle', ticket: 6}).board.tried, false, `${p.id}: a change clears the try`);
      for (const bad of [null, {type: 'toggle', ticket: 7}, {type: 'toggle'}, {type: 'draw', ticket: 1}, {type: 'keep'}, {type: 'claim'}, {type: 'count', card: 0, by: 1}]) assert.equal(move(p, start, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      for (const board of [null, {cup: [1]}, {...f, cup: []}, {...f, cup: [2, 1]}, {...f, cup: [1, 1]}, {...f, cup: [7]}, {...f, tried: 1}, {...f, extra: 1}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      continue;
    }

    assert.deepEqual(sorted(a.board.kept), sorted(want), `${p.id}: every tie kept once`);
    // Hints from every cup, with shelves of every size and That's all refused.
    for (const n of [0, 1, 2, 5, 8, 11, 14, 15]) for (const c of cups) {
      if (!c.length) continue;
      const shelfKeys = want.slice(n % 2 ? want.length - n : 0, n % 2 ? want.length : n);
      for (const missed of n ? [false, true] : [false]) {
        hintsSolve(p, at(start, {cup: nums(c), kept: shelfKeys, missed}), `${p.id} from ${key(nums(c))} with ${shelfKeys.length} kept${missed ? ', missed' : ''}`);
        if (!works('tie', c)) hintsSolve(p, at(start, {cup: nums(c), kept: shelfKeys, missed, wrong: true}), `${p.id} from ${key(nums(c))}, refused`);
      }
    }
    walk(p, start, [...[1, 2, 3, 4, 5, 6].map(ticket => ({type: 'toggle', ticket})), {type: 'keep'}, {type: 'keep'}, {type: 'claim'}], p.id, 120);
    // Keep checks the cup: a cup that doesn't tie is refused once, with a note.
    const wrong = move(p, start, {type: 'keep'});
    assert.ok(wrong.board.wrong && !wrong.board.kept.length, `${p.id}: the full cup is refused`);
    assert.equal(move(p, wrong, {type: 'keep'}), null, `${p.id}: not twice in a row`);
    const three = [1, 2, 4, 5, 6].reduce((x, t) => move(p, x, {type: 'toggle', ticket: t}), wrong);
    assert.deepEqual(three.board.cup, [3]);
    assert.equal(three.board.wrong, false, `${p.id}: a change clears the note`);
    assert.ok(move(p, three, {type: 'keep'}).board.wrong, `${p.id}: side 3 alone always hides blue, no tie`);
    const both = move(p, three, {type: 'toggle', ticket: 1});
    const kept = move(p, both, {type: 'keep'});
    assert.deepEqual(kept.board.kept, ['13']);
    assert.equal(move(p, kept, {type: 'keep'}), null, `${p.id}: kept once`);
    const early = move(p, kept, {type: 'claim'});
    assert.ok(early.board.missed && !isSolved(p, early.board), `${p.id}: an early That’s all`);
    assert.equal(move(p, early, {type: 'claim'}), null);
    const changed = move(p, early, {type: 'toggle', ticket: 6});
    assert.ok(changed.board.missed && move(p, changed, {type: 'claim'}) === null, `${p.id}: That’s all waits for something new to be kept, not just a new cup`);
    let one = at(start, {cup: [4]});
    assert.equal(move(p, one, {type: 'toggle', ticket: 4}), null, `${p.id}: the cup is never empty`);
    assert.deepEqual(undo(kept).board, both.board, `${p.id}: Undo takes a Keep back`);
    for (const bad of [null, {type: 'toggle', ticket: 0}, {type: 'draw', ticket: 1}, {type: 'try'}, {type: 'count', card: 0, by: 1}, {type: 'claim'}]) assert.equal(move(p, start, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    const forged = [null, {...f, kept: ['123']}, {...f, kept: ['13', '13']}, {...f, claimed: true}, {...f, wrong: true, cup: cupOf('13')}, {...f, wrong: true, kept: want, claimed: true}, {...f, wrong: 'no'}, {...f, cup: []}, {...f, cup: [], wrong: true}, {...f, extra: 1}, {cup: [1], kept: [], claimed: false, missed: false}];
    for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
    assert.ok(validBoard(p, {...f, kept: want, claimed: true}), `${p.id}: a real solve is a valid save`);
    assert.ok(validBoard(p, {...f, kept: ['13'], missed: true, wrong: true}), `${p.id}: a refused cup after an early That’s all`);
  }

  // Playground: any cup that isn't empty, random sides from it, piles cleared
  // when the cup changes; it never counts as solved.
  const [pg] = playgrounds;
  let a = freshAttempt(pg);
  assert.ok(validBoard(pg, a.board) && !isSolved(pg, a.board));
  assert.deepEqual(a.board, {cup: [1, 2, 3, 4, 5, 6], draws: []});
  a = move(pg, a, {type: 'random'}, () => 0.99);
  assert.deepEqual(a.board.draws, [6]);
  a = move(pg, a, {type: 'random', n: 10}, () => 0);
  assert.equal(a.board.draws.length, 11);
  assert.ok(a.board.draws.slice(1).every(t => t === 1));
  assert.deepEqual(move(pg, a, {type: 'toggle', ticket: 2}).board, {cup: [1, 3, 4, 5, 6], draws: []}, 'a new cup clears the piles');
  let full = a;
  while (full.board.draws.length + 10 <= 60) full = move(pg, full, {type: 'random', n: 10});
  assert.equal(move(pg, full, {type: 'random', n: 10}), null, 'at most 60 draws');
  let small = a;
  for (const t of [2, 3, 4, 5, 6]) small = move(pg, small, {type: 'toggle', ticket: t});
  assert.deepEqual(small.board.cup, [1]);
  assert.equal(move(pg, small, {type: 'toggle', ticket: 1}), null, 'the cup is never empty');
  assert.ok(move(pg, small, {type: 'random', n: 10}).board.draws.every(t => t === 1), 'only side 1 can come');
  assert.equal(move(pg, move(pg, a, {type: 'clear'}), {type: 'clear'}), null);
  for (const bad of [{type: 'random', n: 5}, {type: 'toggle', ticket: 7}, {type: 'draw', ticket: 1}, {type: 'keep'}, {type: 'claim'}, {type: 'try'}]) assert.equal(move(pg, a, bad), null, `playground rejects ${JSON.stringify(bad)}`);
  for (const board of [{...a.board, cup: []}, {...a.board, cup: [3, 1]}, {...a.board, draws: [7]}, {cup: [1], draws: [2]}, {...a.board, draws: Array(61).fill(1)}, {...a.board, extra: 1}]) assert.equal(validBoard(pg, board), false, `playground rejects ${JSON.stringify(board)}`);
  return {sidesPuzzles: core.length, playground: 1, sources: pack.sources.length, answers, hintSteps, ties: facts.ties.length};
}
export default validateSides;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateSides(), null, 2));
