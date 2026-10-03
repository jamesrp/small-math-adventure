// Checks the Proofs pack (dist/proofs.json): content fields, sources, every
// witness and refutation, solve chains to completion, that hints on evidence
// puzzles never give an answer, soundness of the proof checkers, the
// sorting-round generator against named wrong rules, and the duel opponent.
// Run: node scripts/validate-proofs.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { freshAttempt, move, isSolved, nextHint, validBoard } from '../dist/engine.js';
import { isExpansion, mechanicFor } from '../dist/expansion.js';
import { proofMechanics, starStatus, paintStatus, classifyBoard, makeSortRound, tripPossible, duelStart } from '../dist/proofs.js';

export function seeded(seed = 1) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
const nimSum = piles => piles.reduce((a, b) => a ^ b, 0);
// The next step toward a solve: a mechanic's solve() where it has one (the
// evidence puzzles, whose hints never give answers), otherwise its hint.
export function solveStep(p, a) {
  const solve = mechanicFor(p).solve;
  if (solve) return { type: 'move', action: solve(p, a.board) };
  return nextHint(p, a);
}
// Hints on evidence puzzles may only move between rounds or games.
const NAVIGATION = new Set(['next', 'deal', 'new']);

export async function validateProofs() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const main = await read('../dist/puzzles.json'), proofs = await read('../dist/proofs.json');
  const all = [...main.puzzles, ...proofs.puzzles], sources = [...main.sources, ...proofs.sources];
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across both packs');
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'source ids are unique across both packs');
  for (const s of proofs.sources) { if (s.url) assert.match(s.url, /^https:\/\//); else assert.ok(s.path?.startsWith('/')); assert.ok(s.title); }
  const groups = new Map();
  let checks = 0;
  for (const p of proofs.puzzles) {
    assert.equal(p.band, 'proofs', p.id); assert.equal(p.revision, 1, p.id);
    assert.ok(['tile', 'nim'].includes(p.libraryFamily), p.id);
    assert.ok(isExpansion(p), `${p.id}: registered mechanic`);
    for (const key of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id} ${key}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.rules.every(r => r.trim()), `${p.id} rules`);
    assert.equal(p.hints.length, 3, p.id); p.hints.forEach(h => assert.ok(h.trim()));
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id} parent.${key}`);
    assert.ok(p.parent.sourceIds.length); for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
    const key = p.libraryFamily; groups.set(key, [...(groups.get(key) || []), p.number]);
    // Every puzzle starts unsolved and reaches completion by solve steps. On
    // evidence puzzles (no Undo), a hint never names an answer or a move.
    const random = seeded(p.number * 97 + p.id.length), evidence = Boolean(mechanicFor(p).noUndo?.(p));
    if (evidence) assert.equal(typeof mechanicFor(p).solve, 'function', `${p.id}: evidence puzzles have solve()`);
    let a = freshAttempt(p, random);
    assert.ok(validBoard(p, a.board), `${p.id}: valid start`); assert.ok(!isSolved(p, a.board), `${p.id}: starts unsolved`);
    for (let i = 0; !isSolved(p, a.board) && i < 400; i++) {
      if (evidence) {
        const hint = nextHint(p, a);
        assert.ok(hint.type === 'note' || (hint.type === 'move' && NAVIGATION.has(hint.action.type)), `${p.id}: hint gives nothing away (${JSON.stringify(hint)})`);
        assert.ok(!hint.pair, `${p.id}: no highlighted answer`);
      }
      const step = solveStep(p, a);
      assert.equal(step.type, 'move', `${p.id}: ${step.text}`);
      const next = move(p, a, step.action, random);
      assert.ok(next && next !== a, `${p.id}: step ${JSON.stringify(step.action)} is legal and changes the board`);
      if (evidence) assert.equal(next.history.length, 0, `${p.id}: no Undo history`);
      a = next; checks++;
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solve steps reach completion`);
  }
  for (const [family, numbers] of groups) assert.deepEqual([...numbers].sort((a, b) => a - b), numbers.map((_, i) => i + 1), `${family} proof numbers run 1..n`);

  // Gardens: each is either coverable (with a stored witness) or refutable,
  // and the proof checkers never accept a refutation of a coverable garden:
  // every proper painting (two per connected piece) has equal counts, and no
  // set of at most four stars that do not touch has fewer partners.
  const garden = proofMechanics.proofgarden;
  for (const p of proofs.puzzles.filter(p => p.mechanic === 'proofgarden')) {
    const { cols, rows, cells, coverable, refutation } = p.parameters, region = new Set(cells);
    assert.equal(Boolean(garden.cover(cols, rows, region)), coverable, `${p.id}: coverable flag`);
    const near = c => [c - cols, c + cols, c % cols ? c - 1 : -1, c % cols < cols - 1 ? c + 1 : -1].filter(n => region.has(n));
    let a = freshAttempt(p);
    if (coverable) {
      for (const pair of p.solution) { a = move(p, a, { type: 'place', cells: pair }); assert.ok(a, `${p.id}: witness domino`); }
      assert.ok(isSolved(p, a.board), `${p.id}: witness covers the garden`);
      const pieces = [], seen = new Set();
      for (const c of cells) {
        if (seen.has(c)) continue;
        const piece = [c]; seen.add(c);
        for (let i = 0; i < piece.length; i++) for (const n of near(piece[i])) if (!seen.has(n)) { seen.add(n); piece.push(n); }
        pieces.push(piece);
      }
      for (let mask = 0; mask < 2 ** pieces.length; mask++) {
        const paint = Array(cols * rows).fill(0);
        pieces.forEach((piece, i) => piece.forEach(c => { paint[c] = ((Math.floor(c / cols) + c % cols) % 2 === ((mask >> i) & 1)) ? 1 : 2; }));
        assert.ok(!paintStatus(p, paint).clash, `${p.id}: checkerboard painting is proper`);
        assert.ok(!paintStatus(p, paint).proved, `${p.id}: no paint proof of a coverable garden`);
        checks++;
      }
      const independent = (set, c) => !set.some(x => near(x).includes(c));
      const grow = (set, from) => {
        if (set.length) { assert.ok(!starStatus(p, set).proved, `${p.id}: no star proof of a coverable garden (${set})`); checks++; }
        if (set.length === 4) return;
        for (let i = from; i < cells.length; i++) if (independent(set, cells[i])) grow([...set, cells[i]], i + 1);
      };
      grow([], 0);
    } else {
      a = move(p, a, { type: 'mode', mode: 'prove' });
      if (refutation.kind === 'stars') a = move(p, a, { type: 'star', cells: refutation.stars, on: true });
      else a = move(p, a, { type: 'checker', cell: cells[0] });
      assert.ok(a && isSolved(p, a.board), `${p.id}: stored refutation is accepted`);
    }
  }

  // Flip map: the possibility rule matches an exhaustive count of walks.
  const edges = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5]], adjacent = (a, b) => edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  for (let s = 0; s < 6; s++) for (let e = 0; e < 6; e++) {
    let reach = new Set([s]);
    for (let k = 1; k <= 12; k++) {
      const next = new Set(); for (const x of reach) for (let y = 0; y < 6; y++) if (adjacent(x, y)) next.add(y);
      reach = next; assert.equal(reach.has(e), tripPossible(s, e, k), `walk ${s}→${e} in ${k}`); checks++;
    }
  }

  // Sorting rounds refute each named wrong rule in every round; answers are right.
  const corner = new Set([0, 5, 30, 35]);
  const balanced = h => { let gold = 0; for (let c = 0; c < 36; c++) if (!h.includes(c) && (Math.floor(c / 6) + c % 6) % 2 === 0) gold++; return gold * 2 === 36 - h.length; };
  const isStranded = h => { const region = new Set(Array.from({ length: 36 }, (_, i) => i).filter(i => !h.includes(i))); return [...region].some(c => ![c - 6, c + 6, c % 6 ? c - 1 : -1, c % 6 < 5 ? c + 1 : -1].some(n => region.has(n))); };
  const wrongRules = {
    1: [['even number of holes ⇒ ✓', h => h.length % 2 === 0]],
    2: [['missing corner ⇒ ✗, else colors', h => !h.some(c => corner.has(c)) && balanced(h)]],
    3: [['colors balance ⇒ ✓', balanced], ['stranded ⇒ ✗, ignore colors', h => !isStranded(h)]]
  };
  const opposite = h => h.length === 2 && h.every(c => corner.has(c)) && (h[0] + h[1]) === 35;
  for (const level of [1, 2, 3]) {
    const random = seeded(level * 7919);
    let oppositeRounds = 0;
    for (let t = 0; t < 400; t++) {
      const round = makeSortRound(level, random);
      assert.equal(round.length, 6);
      for (const [name, rule] of wrongRules[level]) assert.ok(round.some(h => rule(h) !== classifyBoard(h).ok), `level ${level}: round refutes “${name}”`);
      for (const h of round) { const c = classifyBoard(h); if (c.ok) assert.equal(c.tiling.length * 2, 36 - h.length); }
      if (round.some(opposite)) { oppositeRounds++; assert.ok(round.filter(opposite).every(h => !classifyBoard(h).ok)); }
      checks++;
    }
    // Level 2 also refutes “two missing corners ⇒ ✓” in about half its rounds.
    if (level === 2) assert.ok(oppositeRounds > 120, `level 2: ${oppositeRounds} of 400 rounds have opposite corners`);
  }

  // Numbers: after every check the next question is a different trip.
  const numbersPuzzle = proofs.puzzles.find(p => p.parameters.task === 'numbers');
  {
    const random = seeded(77);
    let a = freshAttempt(numbersPuzzle, random);
    assert.deepEqual([a.board.s, a.board.e], [0, 0], 'the first question is A back to A');
    const asked = new Set();
    for (let t = 0; t < 200; t++) {
      a = move(numbersPuzzle, a, { type: 'toggle', n: 1 + (t % 12) }, random);
      a = move(numbersPuzzle, a, { type: 'check' }, random);
      if (isSolved(numbersPuzzle, a.board)) a = freshAttempt(numbersPuzzle, random);
      const before = [a.board.s, a.board.e];
      if (!a.board.checked) continue;
      a = move(numbersPuzzle, a, { type: 'next' }, random);
      assert.notDeepEqual([a.board.s, a.board.e], before, 'a new question is a new trip');
      asked.add(`${a.board.s}-${a.board.e}`); checks++;
    }
    assert.ok(asked.size > 20, `numbers: ${asked.size} different trips asked`);
  }

  // Duel: the opponent always moves to Nim-sum 0 when it can; starts are about half losing.
  const duelPuzzle = proofs.puzzles.find(p => p.mechanic === 'duel' && p.parameters.piles === 3);
  const random = seeded(4242);
  let losing = 0;
  for (let t = 0; t < 1000; t++) if (nimSum(duelStart(duelPuzzle.parameters, random)) === 0) losing++;
  assert.ok(losing > 400 && losing < 600, `duel starts: ${losing} of 1000 losing`);
  for (let t = 0; t < 300; t++) {
    let a = freshAttempt(duelPuzzle, random);
    a = move(duelPuzzle, a, { type: 'choose', first: 'you' }, random);
    while (a && a.board.piles.some(Boolean)) {
      const moves = a.board.piles.flatMap((n, i) => Array.from({ length: n }, (_, k) => ({ pile: i + 1, remove: k + 1 })));
      const mine = moves[Math.floor(random() * moves.length)];
      const before = a.board.piles.map((n, i) => i === mine.pile - 1 ? n - mine.remove : n);
      a = move(duelPuzzle, a, { type: 'take', ...mine }, random);
      if (before.some(Boolean) && nimSum(before) !== 0) assert.equal(nimSum(a.board.piles), 0, 'opponent restores Nim-sum 0');
      checks++;
    }
  }
  return { proofPuzzles: proofs.puzzles.length, sources: proofs.sources.length, checks };
}
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateProofs(), null, 2));
