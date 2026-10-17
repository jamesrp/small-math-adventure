// Checks Pebble Duel's Star race and Every start groups
// (dist/families/rookrace/rookrace.json): content fields and sources; every
// puzzle's second-player squares and starts against independent methods (the
// diagonal, Wythoff's pairs from the golden ratio, Bouton's Nim-sum, and a
// separate game-tree search with its own move generator; the module fills a
// table outward from the star instead); that the opponent never misses a win;
// that about half the drawn starts are second-player starts, so always going
// first fails; that the solver wins every race and hints alone finish every
// Every start puzzle, from a fresh start and after wrong marks, play-outs and
// practice games; that That's all judges the whole shelf, locks until it
// changes, and is hard to pass by chance; illegal moves; forged saves; and
// CPU time per tap. Run: node scripts/validate-rookrace.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {rookraceMechanics, raceSolve, everyHint, judge, opponentSquare, opponentTake, drawSquare, keyOf, cellOf, squareOf, STREAK} from '../dist/families/rookrace/rookrace.js';
import {loadPack} from './packs.mjs';

const PHI = (1 + Math.sqrt(5)) / 2;
export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// --- Independent answers ---------------------------------------------------------
// Second-player squares by formula: the diagonal, or Wythoff's pairs.
function formulaSquares(q) {
  const out = [];
  if (!q.queen) for (let k = 1; k < q.size; k++) out.push([k, k]);
  else for (let k = 1; Math.floor(k * PHI) < q.size; k++) {
    const a = Math.floor(k * PHI), b = Math.floor(k * PHI * PHI);
    assert.equal(b - a, k, 'Wythoff pairs differ by k');
    if (b < q.size) out.push([a, b], [b, a]); else out.push();
  }
  return out.map(s => s.join(',')).sort();
}
// A separate game-tree search: a position loses for the player to move when
// every move from it reaches a winning one. Moves are generated here, not by the module.
function treeSearch(moves) {
  const memo = new Map();
  const wins = s => {
    const key = JSON.stringify(s);
    if (!memo.has(key)) memo.set(key, moves(s).some(t => !wins(t)));
    return memo.get(key);
  };
  return wins;
}
function slides(q) {
  return ([x, y]) => {
    const out = [];
    for (let d = 1; d <= x; d++) out.push([x - d, y]);
    for (let d = 1; d <= y; d++) out.push([x, y - d]);
    if (q.queen) for (let d = 1; d <= Math.min(x, y); d++) out.push([x - d, y - d]);
    return out;
  };
}
const takes = piles => piles.flatMap((n, i) => Array.from({length: n}, (_, k) => piles.map((m, j) => j === i ? k : m)));
const pileWins = treeSearch(takes);
function searchedSquares(q) {
  const wins = treeSearch(slides(q)), out = [];
  for (let x = 0; x < q.size; x++) for (let y = 0; y < q.size; y++) if ((x || y) && !wins([x, y])) out.push(`${x},${y}`);
  return out.sort();
}
function bruteStarts(q) {
  const out = [];
  for (let a = 1; a <= q.max; a++) for (let b = a; b <= q.max; b++) for (let c = b; c <= q.max; c++) if (!pileWins([a, b, c])) out.push(`${a},${b},${c}`);
  return out;
}
function boutonStarts(q) {
  const out = [];
  for (let a = 1; a <= q.max; a++) for (let b = a; b <= q.max; b++) { const c = a ^ b; if (c >= b && c <= q.max) out.push(`${a},${b},${c}`); }
  return out;
}

const cpu = f => { const t = process.cpuUsage(); const out = f(); const u = process.cpuUsage(t); return {out, ms: (u.user + u.system) / 1000}; };
const play = (p, b, ...actions) => actions.reduce((board, action) => { const next = rookraceMechanics[p.mechanic].move(p, board, action, seeded(7)); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, b);

export default async function validateRookrace() {
  const json = JSON.parse(await readFile(new URL('../dist/families/rookrace/rookrace.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const report = {puzzles: json.puzzles.length, races: 0, everyStart: 0, raceGamesPlayed: 0, randomSolveShare: {}, alwaysFirstShare: {}, maxTapMs: 0};
  assert.ok(json.puzzles.length >= 8 && json.puzzles.length <= 12);
  assert.equal(new Set(json.sources.map(s => s.id)).size, json.sources.length);
  for (const s of json.sources) assert.match(s.url, /^https:\/\//, s.id);

  for (const p of json.puzzles) {
    const q = p.parameters, m = rookraceMechanics[p.mechanic];
    // Content.
    for (const key of ['id', 'title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id}: ${key}`);
    assert.equal(p.libraryFamily, 'nim'); assert.equal(p.band, 'all'); assert.equal(p.familyTitle, 'Pebble Duel');
    assert.ok(['easy', 'medium', 'hard'].includes(p.difficulty_level));
    assert.equal(p.hints.length, 3);
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id}: parent.${key}`);
    for (const id of p.parent.sourceIds) assert.ok(pack.sources.some(s => s.id === id), `${p.id}: source ${id}`);
    assert.match(p.provenance, /Week 8/);
    assert.match(p.controls, /^A turn /, `${p.id}: How to play opens with the move`);
    // Neither a title, How to play nor a first hint gives the answer away.
    for (const text of [p.title, p.controls, p.hints[0], p.visibleObjective, p.objective]) assert.doesNotMatch(text, /\bdiagonal\b|\bequal|golden|bundle|even number|1, 2 and 3|Wythoff/i, `${p.id}: “${text}” gives nothing away`);
    for (const text of [p.title, p.controls, ...p.hints, p.visibleObjective]) assert.doesNotMatch(text, /\b\d+ (starts|squares) (to find|left)\b/i, `${p.id}: no count`);

    // Answers by independent methods.
    if (q.kind === 'piles') {
      const brute = bruteStarts(q), bouton = boutonStarts(q);
      assert.deepEqual(brute, [...bouton].sort(), `${p.id}: the search agrees with Bouton`);
      assert.deepEqual(p.solution.secondStarts, brute, `${p.id}: pack answers`);
    } else {
      const searched = searchedSquares(q);
      assert.deepEqual(searched, formulaSquares(q), `${p.id}: the search agrees with the formula`);
      assert.deepEqual(p.solution.secondSquares.map(s => s.join(',')).sort(), searched, `${p.id}: pack answers`);
      assert.deepEqual(p.solution.cells, p.solution.secondSquares.map(s => s[1] * q.size + s[0]));
    }

    // The opponent never misses a win, whatever its random draw.
    if (q.kind !== 'piles') {
      const wins = treeSearch(slides(q));
      for (let x = 0; x < q.size; x++) for (let y = 0; y < q.size; y++) {
        if (!x && !y) continue;
        for (const r of [0, .3, .6, .999]) {
          const to = opponentSquare(q, [x, y], () => r);
          assert.ok(slides(q)([x, y]).some(t => t.join() === to.join()), `${p.id}: opponent move is legal`);
          if (wins([x, y])) assert.equal(wins(to), false, `${p.id}: from ${x},${y} the opponent wins`);
        }
      }
    } else {
      for (let a = 0; a <= q.max; a++) for (let b = 0; b <= q.max; b++) for (let c = 0; c <= q.max; c++) {
        if (!a && !b && !c) continue;
        for (const r of [0, .5, .999]) {
          const t = opponentTake([a, b, c], () => r), after = [a, b, c].map((n, i) => i === t.pile - 1 ? n - t.take : n);
          assert.ok(t.take >= 1 && t.take <= [a, b, c][t.pile - 1]);
          if (a ^ b ^ c) assert.equal(after[0] ^ after[1] ^ after[2], 0, `${p.id}: from ${a},${b},${c} the opponent wins`);
        }
      }
    }

    if (q.kind === 'race') {
      report.races++;
      const second = new Set(p.solution.secondSquares.map(s => s.join()));
      // About half the drawn starts are second-player starts; a new start differs from the last.
      const random = seeded(11);
      let losing = 0, prev = null;
      for (let i = 0; i < 4000; i++) { const s = drawSquare(q, random, prev); if (prev) assert.notEqual(s.join(), prev.join(), `${p.id}: a new start is new`); if (second.has(s.join())) losing++; prev = s; }
      assert.ok(losing / 4000 > .45 && losing / 4000 < .55, `${p.id}: half the starts are second-player starts (${losing / 4000})`);
      // The solver wins three in a row from fresh, for many seeds.
      for (let seed = 1; seed <= 25; seed++) {
        const r = seeded(seed);
        let b = m.fresh(p, r), steps = 0;
        while (!m.solved(p, b) && steps++ < 200) { b = m.move(p, b, raceSolve(p, b), r); assert.ok(b && m.valid(p, JSON.parse(JSON.stringify(b))), `${p.id}: solver move`); }
        assert.ok(m.solved(p, b), `${p.id}: the solver wins 3 in a row (seed ${seed})`);
        assert.equal(b.streak, STREAK);
        report.raceGamesPlayed += 3;
      }
      // Always going first, then playing perfectly, rarely passes: about 1 in 8.
      let passes = 0;
      for (let seed = 1; seed <= 1000; seed++) {
        const r = seeded(1000 + seed);
        let b = m.fresh(p, r);
        for (let step = 0; step < 300 && !m.solved(p, b); step++) {
          if (b.first !== null && b.turns.length && b.at[0] === 0 && b.at[1] === 0 && b.turns.at(-1).player === 'opponent') break;
          const action = b.first === null ? {type: 'choose', first: 'you'} : raceSolve(p, b);
          b = m.move(p, b, action, r);
        }
        if (m.solved(p, b)) passes++;
      }
      report.alwaysFirstShare[p.id] = passes / 1000;
      assert.ok(passes / 1000 < .25, `${p.id}: always going first rarely wins the streak`);
      // Hints are the authored nudges during a game, never who starts or a move.
      let b = m.fresh(p, seeded(3));
      assert.equal(m.hint(p, b).type, 'note');
      b = play(p, b, {type: 'choose', first: 'you'});
      if (b.at[0] || b.at[1]) assert.equal(m.hint(p, b).type, 'note');
      // Illegal moves.
      const fresh = m.fresh(p, seeded(4));
      for (const action of [{type: 'move', to: [0, 0]}, {type: 'new'}, {type: 'again'}, {type: 'choose', first: 'both'}, null, {type: 'jump'}]) assert.equal(m.move(p, fresh, action), null, `${p.id}: rejects ${JSON.stringify(action)} before the choice`);
      const going = play(p, {...fresh, start: [q.size - 1, q.size - 2], at: [q.size - 1, q.size - 2]}, {type: 'choose', first: 'you'});
      const at = going.at;
      for (const to of [[at[0] + 1, at[1]], [at[0], at[1] + 1], [at[0] - 1, at[1] - 1 - (q.queen ? 1 : 0)], [at[0], at[1]], [q.size, 0], [-1, 0], ['a', 0]]) {
        if (q.queen && to[0] === at[0] - 1 && to[1] === at[1] - 1) continue;
        assert.equal(m.move(p, going, {type: 'move', to}), null, `${p.id}: rejects a move to ${to}`);
      }
      assert.equal(m.move(p, going, {type: 'choose', first: 'opponent'}), null, `${p.id}: the choice is final`);
      assert.equal(m.move(p, going, {type: 'new'}), null, `${p.id}: no new start mid-game`);
      // Forged saves, including a forged full streak. A won game is a real win
      // against the perfect opponent, replayed move by move.
      const corner = [q.size - 1, q.size - 1];
      const win = (x, y) => ({start: [x, y], first: 'you', turns: [{player: 'you', to: [0, 0]}]});
      const current = (game, extra) => ({start: game.start, at: game.turns.at(-1)?.to ?? game.start, first: game.first, turns: game.turns, streak: 0, won: [], fresh: true, lost: [], ...extra});
      const sloppy = {start: [3, 1], first: 'opponent', turns: [{player: 'opponent', to: [0, 1]}, {player: 'you', to: [0, 0]}]};
      const lostGame = {start: [2, 2], first: 'you', turns: [{player: 'you', to: [0, 2]}, {player: 'opponent', to: [0, 0]}]};
      const forged = [
        {...fresh, streak: STREAK},
        {...fresh, streak: STREAK, won: [win(1, 0), win(0, 1), win(1, 0)]},
        {...fresh, streak: 1, won: [win(1, 0)], fresh: false},
        current(sloppy, {streak: 1, won: [sloppy]}),
        current(lostGame, {streak: 1, won: [win(1, 0)]}),
        current(win(1, 0), {}),
        current(win(1, 0), {streak: 2, won: [win(1, 0), win(1, 0)]}),
        {...fresh, start: [1, 0], at: [1, 0], streak: 1, won: [win(1, 0)]},
        {...fresh, won: [{...win(1, 0), extra: 1}], streak: 1},
        {...fresh, start: [0, 0], at: [0, 0]},
        {...fresh, lost: [[0, 0]]},
        {...fresh, extra: 1},
        current({start: corner, first: 'you', turns: [{player: 'you', to: [0, corner[1]]}]}, {}),
        current({start: [3, 1], first: 'you', turns: [{player: 'you', to: [1, 1]}]}, {}),
        current({start: [2, 2], first: 'you', turns: [{player: 'opponent', to: [1, 1]}]}, {}),
        current({start: [2, 2], first: 'you', turns: [{player: 'you', to: [1, 0]}, {player: 'opponent', to: [0, 0]}, {player: 'you', to: [0, 0]}]}, {})
      ];
      // The same records with honest wins are accepted.
      assert.ok(validBoard(p, current(win(1, 0), {streak: 1, won: [win(1, 0)]})), `${p.id}: an honest first win`);
      assert.ok(validBoard(p, current(win(0, 1), {streak: 2, won: [win(1, 0), win(0, 1)]})), `${p.id}: an honest second win`);
      for (const [i, board] of forged.entries()) assert.equal(validBoard(p, board), false, `${p.id}: rejects forged save ${i}`);
      // An honest finished save is valid and solved.
      const honest = (() => { const r = seeded(9); let b = m.fresh(p, r); while (!m.solved(p, b)) b = m.move(p, b, raceSolve(p, b), r); return b; })();
      assert.ok(validBoard(p, JSON.parse(JSON.stringify(honest))) && isSolved(p, honest));
      // Taps are fast: a move with the reply, and a render.
      const r = seeded(21);
      let b2 = m.fresh(p, r); b2 = m.move(p, b2, {type: 'choose', first: 'you'}, r);
      if (b2.at[0] || b2.at[1]) {
        const t = cpu(() => m.move(p, b2, raceSolve(p, b2), r)); const t2 = cpu(() => m.render(p, {board: b2, hintLevel: 2}));
        report.maxTapMs = Math.max(report.maxTapMs, t.ms, t2.ms);
      }
      continue;
    }

    // --- Every start ---
    report.everyStart++;
    const answers = q.kind === 'piles' ? p.solution.secondStarts : p.solution.cells;
    const candidates = q.kind === 'piles' ? (() => { const out = []; for (let a = 1; a <= q.max; a++) for (let b = a; b <= q.max; b++) for (let c = b; c <= q.max; c++) out.push(`${a},${b},${c}`); return out; })() : Array.from({length: q.size * q.size - 1}, (_, i) => i + 1);
    const wrongs = candidates.filter(c => !answers.includes(c));
    assert.equal(judge(q, answers), null, `${p.id}: the answers pass`);
    assert.deepEqual(judge(q, answers.slice(1)), {more: true}, `${p.id}: a missing answer is “There is another.”`);
    assert.deepEqual(judge(q, [...answers, wrongs[0]]), {wrong: wrongs[0]}, `${p.id}: a wrong answer is named`);
    // Hints alone, from fresh: every hint is a legal move and they finish.
    const follow = (a, label) => {
      for (let i = 0; i < 400 && !isSolved(p, a.board); i++) {
        const hint = nextHint(p, a);
        assert.equal(hint.type, 'move', `${p.id} ${label}: ${hint.text}`);
        const t = cpu(() => move(p, a, hint.action));
        report.maxTapMs = Math.max(report.maxTapMs, t.ms);
        assert.ok(t.out, `${p.id} ${label}: hint ${JSON.stringify(hint.action)} is legal`);
        a = t.out;
      }
      assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints alone finish`);
      return a;
    };
    follow(freshAttempt(p), 'from fresh');
    // After wrong moves: a wrong mark or start, That's all, a play-out and a practice game.
    let a = freshAttempt(p);
    const add = (a, c) => q.kind === 'piles' ? [0, 1, 2].reduce((x, i) => move(p, x, {type: 'set', pile: i, n: Number(c.split(',')[i])}), a) : move(p, a, {type: 'mark', cell: c});
    a = add(a, wrongs.at(-1)); if (q.kind === 'piles') a = move(p, a, {type: 'keep'});
    a = add(a, answers[0]); if (q.kind === 'piles') a = move(p, a, {type: 'keep'});
    a = move(p, a, {type: 'all'});
    assert.deepEqual(a.board.refused, {wrong: wrongs.at(-1)}, `${p.id}: That’s all names the wrong one`);
    assert.equal(move(p, a, {type: 'all'}), null, `${p.id}: That’s all waits for a change`);
    assert.ok(!isSolved(p, a.board));
    // The play-out: the app goes first from the refused start and wins against any reply.
    for (let seed = 1; seed <= 20; seed++) {
      const r = seeded(seed);
      let b = rookraceMechanics.everystart.move(p, a.board, {type: 'out'}, r);
      for (let step = 0; step < 60; step++) {
        const run = b.play;
        const lastPlayer = run.turns.at(-1)?.player;
        const html = rookraceMechanics.everystart.render(p, {board: b, hintLevel: 0});
        if (/reached the star|took the last pebble/.test(html)) break;
        const choices = q.kind === 'piles'
          ? (() => { const piles = run.turns.reduce((x, t) => x.map((n, i) => i === t.pile - 1 ? n - t.take : n), run.start); return piles.flatMap((n, i) => Array.from({length: n}, (_, k) => ({type: 'take', pile: i + 1, take: k + 1}))); })()
          : (() => { const s = run.turns.reduce((s, t) => t.to, squareOf(q, a.board.refused.wrong)); return slides(q)(s).map(to => ({type: 'move', to})); })();
        assert.equal(lastPlayer, 'opponent');
        b = rookraceMechanics.everystart.move(p, b, choices[Math.floor(r() * choices.length)], r);
        assert.ok(b && validBoard(p, JSON.parse(JSON.stringify(b))), `${p.id}: play-out move`);
      }
      assert.equal(b.play.turns.at(-1).player, 'opponent', `${p.id}: the app wins the play-out (seed ${seed})`);
      assert.ok(validBoard(p, JSON.parse(JSON.stringify(b))));
    }
    a = move(p, a, {type: 'out'});
    follow(a, 'after a wrong start and its play-out');
    if (q.kind === 'piles') {
      let t = move(p, freshAttempt(p), {type: 'try'});
      t = move(p, t, {type: 'choose', first: 'opponent'});
      follow(t, 'from a practice game');
      // Keeping a start twice says so, and changes nothing else.
      let k = move(p, freshAttempt(p), {type: 'keep'}); k = move(p, k, {type: 'keep'});
      assert.equal(k.board.told, 'again'); assert.deepEqual(k.board.shelf, ['1,1,1']);
    }
    // Random shelves almost never pass: the claim can fail. Two guessers: each
    // start kept with chance 1/2, and with the chance that matches the answer count.
    const r = seeded(5), shares = {half: .5, matched: answers.length / candidates.length}, out = {};
    for (const [name, chance] of Object.entries(shares)) {
      let solved = 0;
      for (let i = 0; i < 20000; i++) { const kept = candidates.filter(() => r() < chance); if (kept.length && judge(q, kept) === null) solved++; }
      out[name] = solved / 20000;
    }
    report.randomSolveShare[p.id] = out;
    assert.ok(out.half < .01 && out.matched < .05, `${p.id}: random shelves rarely pass`);
    // Illegal moves.
    const fresh = freshAttempt(p);
    const bad = q.kind === 'piles'
      ? [{type: 'all'}, {type: 'out'}, {type: 'set', pile: 3, n: 1}, {type: 'set', pile: 0, n: 0}, {type: 'set', pile: 0, n: q.max + 1}, {type: 'drop', key: '1,2,3'}, {type: 'take', pile: 1, take: 1}, {type: 'back'}, {type: 'mark', cell: 4}]
      : [{type: 'all'}, {type: 'out'}, {type: 'mark', cell: 0}, {type: 'mark', cell: q.size * q.size}, {type: 'mark', cell: -1}, {type: 'mark', cell: 1.5}, {type: 'move', to: [0, 0]}, {type: 'keep'}, {type: 'back'}];
    for (const action of bad) assert.equal(move(p, fresh, action), null, `${p.id}: rejects ${JSON.stringify(action)}`);
    // Forged saves, including a forged done.
    const forged = q.kind === 'piles' ? [
      {...fresh.board, done: true},
      {...fresh.board, shelf: answers.slice(1), done: true},
      {...fresh.board, shelf: [...answers].reverse().length > 1 ? [...answers].reverse() : ['3,2,1']},
      {...fresh.board, shelf: ['3,2,1']},
      {...fresh.board, shelf: [answers[0], answers[0]]},
      {...fresh.board, shelf: [answers[0]], refused: {wrong: answers[0]}},
      {...fresh.board, shelf: [answers[0]], refused: {more: true}, done: true},
      {...fresh.board, told: 'again'},
      {...fresh.board, build: [0, 1, 1]},
      {...fresh.board, play: {kind: 'out', start: [1, 1, 1], first: 'opponent', turns: []}},
      {...fresh.board, play: {kind: 'try', start: [1, 1, 1], first: 'you', turns: [{player: 'you', pile: 1, take: 1}]}},
      {...fresh.board, shelf: ['1,1,2'], refused: {wrong: '1,1,2'}, play: {kind: 'out', start: [1, 1, 2], first: 'opponent', turns: [{player: 'opponent', pile: 1, take: 1}]}},
      {...fresh.board, extra: 1}
    ] : [
      {...fresh.board, done: true},
      {...fresh.board, marked: answers.slice(1), done: true},
      {...fresh.board, marked: [0]},
      {...fresh.board, marked: [answers[1], answers[0]]},
      {...fresh.board, marked: [answers[0], answers[0]]},
      {...fresh.board, marked: [answers[0]], refused: {wrong: answers[0]}},
      {...fresh.board, marked: [answers[0]], refused: {more: true}, done: true},
      {...fresh.board, play: {kind: 'out', first: 'opponent', turns: []}},
      {...fresh.board, marked: [1], refused: {wrong: 1}, play: {kind: 'out', first: 'opponent', turns: [{player: 'opponent', to: [0, 0]}, {player: 'you', to: [0, 0]}]}},
      {...fresh.board, marked: [q.size + 2], refused: {wrong: q.size + 2}, play: {kind: 'out', first: 'opponent', turns: [{player: 'opponent', to: [2, 0]}]}},
      {...fresh.board, told: null}
    ];
    for (const [i, board] of forged.entries()) assert.equal(validBoard(p, board), false, `${p.id}: rejects forged save ${i}`);
    const right = q.kind === 'piles' ? {...fresh.board, shelf: answers, done: true} : {...fresh.board, marked: answers, done: true};
    assert.ok(validBoard(p, right) && isSolved(p, right), `${p.id}: the right shelf, done, is a valid save`);
    const t = cpu(() => rookraceMechanics.everystart.render(p, {board: right, hintLevel: 0}));
    report.maxTapMs = Math.max(report.maxTapMs, t.ms);
  }
  assert.ok(report.maxTapMs < 100, `taps respond in well under 100 ms (max ${report.maxTapMs} ms CPU)`);
  // The groups sit in Pebble Duel, below its levels, with their own mechanics.
  for (const p of json.puzzles) assert.equal(mechanicFor(p), rookraceMechanics[p.mechanic]);
  return report;
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateRookrace(), null, 2));
