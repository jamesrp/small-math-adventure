// Checks Pebble Duel's Star race and Every start groups
// (dist/families/rookrace/rookrace.json): content fields and sources; every
// puzzle's second-player squares and starts against independent methods (the
// diagonal, Wythoff's pairs from the golden ratio, Bouton's Nim-sum, and a
// separate game-tree search with its own move generator; the module fills a
// table outward from the star instead); that the opponent never misses a win;
// that about half the drawn starts are second-player starts, so always going
// first fails; that the solver wins every race and hints alone finish every
// Every start puzzle, from a fresh start and after wrong marks, play-outs and
// practice games; that That's all judges the whole shelf, plays a wrong start
// out at once and then clears the marks, locks after "There is another." until
// a change, is hard to pass by chance, and costs far more to use as an oracle
// than knowing the answer; illegal moves; forged saves; and CPU time per tap. Run: node scripts/validate-rookrace.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {rookraceMechanics, raceSolve, everyHint, judge, opponentSquare, opponentTake, drawSquare, keyOf, cellOf, squareOf, squareWins, pilesWin, STREAK} from '../dist/families/rookrace/rookrace.js';
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

// --- What guessing with That's all costs -----------------------------------------
// Taps a child spends: a mark, a slot, Keep, That's all, Back and a board move
// are one tap each; a pile take is two (lift, then Take). Three ways to solve:
// knowing the answer (mark or keep it, then That's all); marking everything and
// letting That's all strip the wrong starts one at a time; and asking That's
// all about one start at a time. "before" counts the second and third under the
// first design (a wrong start was named first and rung, so one tap took it off);
// "after" plays them against the mechanic, where That's all says "There is
// another." whenever an answer is missing, so one start alone learns nothing,
// and a wrong start (named only when nothing is missing) is a game I win going
// first, after which the marks or the shelf are cleared. "leaveOneOut" is the
// cheapest test of a single start that is left.
function slotTaps(build, key) {
  const t = key.split(',').map(Number);
  return Math.min(...[[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map(o => o.filter((i, k) => t[i] !== build[k]).length));
}
function guessCosts(p, candidates, answers) {
  const q = p.parameters, piles = q.kind === 'piles', m = rookraceMechanics.everystart, N = candidates.length, A = answers.length;
  // The before model: the same taps to keep a start; a wrong That's all then
  // cost the tap that took the ringed start off.
  let build = [1, 1, 1];
  const keepTaps = c => { if (!piles) return 1; const taps = slotTaps(build, c) + 1; build = c.split(',').map(Number); return taps; };
  const before = {stripping: 0, oneAtATime: 0};
  for (const c of candidates) before.stripping += keepTaps(c);
  before.stripping += 2 * (N - A) + 1;
  build = [1, 1, 1];
  let solved = false;
  for (const c of candidates) {
    before.oneAtATime += keepTaps(c) + 1;
    if (A === 1 && answers.includes(c)) { solved = true; break; }
    before.oneAtATime += 1;
  }
  if (!solved) { for (const c of answers) before.oneAtATime += keepTaps(c); before.oneAtATime += 1; }
  // The after simulation, on the mechanic itself.
  const run = strategy => {
    const r = seeded(13);
    let b = m.fresh(p), taps = 0, presses = 0;
    const act = (action, n = 1) => { b = m.move(p, b, action, r); assert.ok(b, `${p.id}: ${JSON.stringify(action)}`); taps += n; if (action.type === 'all') presses++; };
    const keep = c => {
      if (!piles) return act({type: 'mark', cell: c});
      const t = c.split(',').map(Number), order = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map(o => o.map(i => t[i]));
      const best = order.sort((x, y) => x.filter((n, k) => n !== b.build[k]).length - y.filter((n, k) => n !== b.build[k]).length)[0];
      best.forEach((n, i) => { if (b.build[i] !== n) act({type: 'set', pile: i, n}); });
      act({type: 'keep'});
    };
    const drop = c => act(piles ? {type: 'drop', key: c} : {type: 'mark', cell: c});
    // A play-out, ended as fast as the child can: on a board, step next to the
    // star; with piles, take the biggest pile away.
    const playOut = () => {
      for (let i = 0; i < 40 && b.play; i++) {
        const turns = b.play.turns;
        if (piles) {
          const at = turns.reduce((x, t) => x.map((n, k) => k === t.pile - 1 ? n - t.take : n), b.play.start);
          if (at.every(n => !n)) break;
          const pile = at.indexOf(Math.max(...at));
          act({type: 'take', pile: pile + 1, take: at[pile]}, 2);
        } else {
          const at = turns.at(-1)?.to ?? squareOf(q, b.play.start);
          if (!at[0] && !at[1]) break;
          const options = slides(q)(at);
          act({type: 'move', to: options.find(s => slides(q)(s).some(t => !t[0] && !t[1])) || options[0]});
        }
      }
      act({type: 'back'});
    };
    if (strategy === 'knowing') { for (const c of answers) keep(c); act({type: 'all'}); }
    if (strategy === 'stripping') {
      const known = new Set();
      while (!b.done) {
        for (const c of candidates) if (!known.has(c) && !keptOf(b).includes(c)) keep(c);
        act({type: 'all'});
        if (b.play) { known.add(b.refused.wrong); playOut(); }
      }
    }
    // One start at a time: what does That's all say about each start alone?
    if (strategy === 'oneAtATime') {
      for (const c of candidates) {
        keep(c); act({type: 'all'});
        verdicts.add(b.done ? 'done' : b.play ? 'wrong' : 'more');
        if (b.done) break;
        if (b.play) playOut(); else drop(c);
      }
      if (!b.done) { for (const c of answers) keep(c); act({type: 'all'}); }
    }
    // The cheapest test of one start left: keep every start but that one (and
    // those known to be wrong). "There is another." means it is an answer;
    // otherwise a wrong start is named, played out and the shelf cleared.
    if (strategy === 'leaveOneOut') {
      const wrong = new Set();
      for (let i = 0; i < candidates.length && !b.done; i++) {
        const c = candidates[i];
        if (wrong.has(c)) continue;
        const target = candidates.filter(x => x !== c && !wrong.has(x));
        for (const x of [...keptOf(b)]) if (!target.includes(x)) drop(x);
        for (const x of target) if (!keptOf(b).includes(x)) keep(x);
        act({type: 'all'});
        if (b.play) { wrong.add(b.refused.wrong); playOut(); i--; }
      }
    }
    // Solving by play: try every start in a practice game, letting me go first
    // and playing perfectly, then keep the ones won and press That's all. A
    // child who thinks plays far fewer games; this is the most play can cost.
    if (strategy === 'byPlay') {
      const won = [];
      for (const c of candidates) {
        if (piles) { const t = c.split(',').map(Number); t.forEach((n, i) => { if (b.build[i] !== n) act({type: 'set', pile: i, n}); }); act({type: 'try'}); }
        else { act({type: 'try'}); act({type: 'start', cell: c}); }
        act({type: 'choose', first: 'opponent'});
        for (let k = 0; k < 40; k++) {
          const turns = b.play.turns;
          if (piles) {
            const at = turns.reduce((x, t) => x.map((n, j) => j === t.pile - 1 ? n - t.take : n), b.play.start);
            if (at.every(n => !n)) break;
            const moves = at.flatMap((n, j) => Array.from({length: n}, (_, d) => ({pile: j + 1, take: d + 1})));
            const best = moves.find(m => !pilesWin(at.map((n, j) => j === m.pile - 1 ? n - m.take : n))) || moves[0];
            act({type: 'take', ...best}, 2);
          } else {
            const at = turns.at(-1)?.to ?? squareOf(q, b.play.start);
            if (!at[0] && !at[1]) break;
            const options = slides(q)(at);
            act({type: 'move', to: options.find(t => !squareWins(q, t)) || options[0]});
          }
        }
        if (b.play.turns.at(-1).player === 'you') won.push(c);
        act({type: 'back'});
      }
      assert.deepEqual([...won].sort(), [...answers].sort(), `${p.id}: playing perfectly second wins exactly from the answers`);
      for (const c of answers) keep(c);
      act({type: 'all'});
    }
    assert.ok(b.done, `${p.id}: ${strategy} solves`);
    return {taps, presses};
  };
  const keptOf = b => piles ? b.shelf : b.marked;
  const verdicts = new Set();
  const after = {stripping: run('stripping'), oneAtATime: run('oneAtATime'), leaveOneOut: run('leaveOneOut')};
  after.oneAtATime.verdicts = [...verdicts].sort();
  return {knowing: run('knowing').taps, byPlay: run('byPlay').taps, before, after};
}

const cpu = f => { const t = process.cpuUsage(); const out = f(); const u = process.cpuUsage(t); return {out, ms: (u.user + u.system) / 1000}; };
const play = (p, b, ...actions) => actions.reduce((board, action) => { const next = rookraceMechanics[p.mechanic].move(p, board, action, seeded(7)); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, b);

export default async function validateRookrace() {
  const json = JSON.parse(await readFile(new URL('../dist/families/rookrace/rookrace.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const report = {puzzles: json.puzzles.length, races: 0, everyStart: 0, raceGamesPlayed: 0, randomSolveShare: {}, guessCost: {}, alwaysFirstShare: {}, maxTapMs: 0};
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
      for (let i = 0; i < 4000; i++) {
        const s = drawSquare(q, random, prev);
        if (prev) assert.notEqual(s.join(), prev.join(), `${p.id}: a new start is new`);
        if (second.has(s.join())) losing++;
        // On boards up to 5 by 5 no start is one move from the star.
        if (q.size <= 5) assert.ok(!slides(q)(s).some(t => !t[0] && !t[1]), `${p.id}: ${s} is one move from the star`);
        prev = s;
      }
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
    assert.deepEqual(judge(q, [wrongs[0]]), {more: true}, `${p.id}: but only when nothing is missing`);
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
    // After wrong moves: a wrong mark or start, then That's all, which plays it
    // out at once (I go first and win against any reply) and then clears the
    // marks or the shelf; and practice games.
    let a = freshAttempt(p);
    const add = (a, c) => q.kind === 'piles' ? [0, 1, 2].reduce((x, i) => move(p, x, {type: 'set', pile: i, n: Number(c.split(',')[i])}), a) : move(p, a, {type: 'mark', cell: c});
    a = add(a, wrongs.at(-1)); if (q.kind === 'piles') a = move(p, a, {type: 'keep'});
    for (const c of answers) { a = add(a, c); if (q.kind === 'piles') a = move(p, a, {type: 'keep'}); }
    const judged = a.board;
    // With an answer missing, the same wrong start gets only "There is another.".
    const partial = move(p, a, q.kind === 'piles' ? {type: 'drop', key: answers[0]} : {type: 'mark', cell: answers[0]});
    const asked = move(p, partial, {type: 'all'});
    assert.deepEqual(asked.board.refused, {more: true}, `${p.id}: missing comes first`);
    assert.equal(asked.board.play, null);
    for (let seed = 1; seed <= 20; seed++) {
      const r = seeded(seed);
      let b = rookraceMechanics.everystart.move(p, judged, {type: 'all'}, r);
      assert.deepEqual(b.refused, {wrong: wrongs.at(-1)}, `${p.id}: That’s all names the wrong one`);
      assert.equal(b.play.kind, 'out', `${p.id}: and plays it out at once`);
      if ((q.kind === 'piles' ? b.shelf : b.marked).length) assert.equal(rookraceMechanics.everystart.move(p, b, {type: 'back'}), null, `${p.id}: the play-out cannot be left`);
      for (let step = 0; step < 60 && b.play.turns.at(-1)?.player === 'opponent' && (q.kind === 'piles' ? b.shelf : b.marked).length; step++) {
        const run = b.play;
        const choices = q.kind === 'piles'
          ? (() => { const piles = run.turns.reduce((x, t) => x.map((n, i) => i === t.pile - 1 ? n - t.take : n), run.start); return piles.flatMap((n, i) => Array.from({length: n}, (_, k) => ({type: 'take', pile: i + 1, take: k + 1}))); })()
          : (() => { const s = run.turns.reduce((s, t) => t.to, squareOf(q, run.start)); return slides(q)(s).map(to => ({type: 'move', to})); })();
        b = rookraceMechanics.everystart.move(p, b, choices[Math.floor(r() * choices.length)], r);
        assert.ok(b && validBoard(p, JSON.parse(JSON.stringify(b))), `${p.id}: play-out move`);
      }
      assert.equal(b.play.turns.at(-1).player, 'opponent', `${p.id}: I win the play-out (seed ${seed})`);
      assert.deepEqual(q.kind === 'piles' ? b.shelf : b.marked, [], `${p.id}: then the ${q.kind === 'piles' ? 'shelf' : 'marks'} are cleared`);
      assert.ok(validBoard(p, JSON.parse(JSON.stringify(b))));
      b = rookraceMechanics.everystart.move(p, b, {type: 'back'});
      assert.ok(b && b.play === null && b.refused === null && !b.done);
    }
    follow(move(p, a, {type: 'all'}, seeded(3)), 'during a play-out');
    // A missing start: "There is another.", and That's all waits for a change.
    if (answers.length > 1) {
      let more = add(freshAttempt(p), answers[0]); if (q.kind === 'piles') more = move(p, more, {type: 'keep'});
      more = move(p, more, {type: 'all'});
      assert.deepEqual(more.board.refused, {more: true}); assert.equal(more.board.play, null);
      assert.equal(move(p, more, {type: 'all'}), null, `${p.id}: That’s all waits for a change`);
    }
    // Practice games: from the start being built, or from a tapped square.
    let practice = move(p, freshAttempt(p), {type: 'try'});
    if (q.kind !== 'piles') { assert.equal(move(p, practice, {type: 'choose', first: 'you'}), null, `${p.id}: a start comes first`); practice = move(p, practice, {type: 'start', cell: wrongs[0]}); }
    practice = move(p, practice, {type: 'choose', first: 'opponent'});
    follow(practice, 'from a practice game');
    if (q.kind === 'piles') {
      // Keeping a start twice says so, and changes nothing else.
      let k = move(p, freshAttempt(p), {type: 'keep'}); k = move(p, k, {type: 'keep'});
      assert.equal(k.board.told, 'again'); assert.deepEqual(k.board.shelf, ['1,1,1']);
    }
    // Guessing with That's all now costs far more than knowing the answer.
    const costs = guessCosts(p, candidates, answers);
    report.guessCost[p.id] = costs;
    assert.ok(costs.after.stripping.taps >= 3 * costs.before.stripping, `${p.id}: marking everything costs several times what it did`);
    assert.ok(costs.after.leaveOneOut.taps >= 10 * costs.knowing, `${p.id}: testing one start at a time costs far more than knowing the answer`);
    for (const way of ['stripping', 'leaveOneOut']) assert.ok(costs.after[way].taps > costs.byPlay, `${p.id}: ${way} costs more than playing every start`);
    // One start alone: with more than one answer, That's all only ever says "There is another.".
    if (answers.length > 1) assert.deepEqual(costs.after.oneAtATime.verdicts, ['more'], `${p.id}: one start alone learns nothing`);
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
      ? [{type: 'all'}, {type: 'out'}, {type: 'set', pile: 3, n: 1}, {type: 'set', pile: 0, n: 0}, {type: 'set', pile: 0, n: q.max + 1}, {type: 'drop', key: '1,2,3'}, {type: 'take', pile: 1, take: 1}, {type: 'back'}, {type: 'mark', cell: 4}, {type: 'start', cell: 4}, {type: 'choose', first: 'you'}]
      : [{type: 'all'}, {type: 'out'}, {type: 'mark', cell: 0}, {type: 'mark', cell: q.size * q.size}, {type: 'mark', cell: -1}, {type: 'mark', cell: 1.5}, {type: 'move', to: [0, 0]}, {type: 'keep'}, {type: 'back'}, {type: 'start', cell: 4}, {type: 'choose', first: 'you'}];
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
      {...fresh.board, shelf: ['1,1,2'], refused: {wrong: '1,1,2'}, play: {kind: 'out', start: [1, 1, 2], first: 'opponent', turns: [{player: 'opponent', pile: 3, take: 2}, {player: 'you', pile: 1, take: 1}, {player: 'opponent', pile: 2, take: 1}]}},
      {...fresh.board, shelf: [], refused: {wrong: '1,1,2'}, play: {kind: 'out', start: [1, 1, 2], first: 'opponent', turns: [{player: 'opponent', pile: 3, take: 2}]}},
      {...fresh.board, shelf: ['1,1,2'], refused: {wrong: '1,1,2'}, play: {kind: 'out', start: [1, 1, 2], first: 'you', turns: []}},
      {...fresh.board, shelf: ['1,1,2'], refused: {wrong: '1,1,2'}, play: null},
      {...fresh.board, play: {kind: 'try', start: [1, 1, 2], first: null, turns: []}},
      {...fresh.board, extra: 1}
    ] : [
      {...fresh.board, done: true},
      {...fresh.board, marked: answers.slice(1), done: true},
      {...fresh.board, marked: [0]},
      {...fresh.board, marked: [answers[1], answers[0]]},
      {...fresh.board, marked: [answers[0], answers[0]]},
      {...fresh.board, marked: [answers[0]], refused: {wrong: answers[0]}},
      {...fresh.board, marked: [answers[0]], refused: {more: true}, done: true},
      {...fresh.board, play: {kind: 'out', start: 1, first: 'opponent', turns: []}},
      {...fresh.board, marked: [1], refused: {wrong: 1}, play: {kind: 'out', start: 1, first: 'opponent', turns: [{player: 'opponent', to: [0, 0]}, {player: 'you', to: [0, 0]}]}},
      {...fresh.board, marked: [q.size + 2], refused: {wrong: q.size + 2}, play: {kind: 'out', start: q.size + 2, first: 'opponent', turns: [{player: 'opponent', to: [2, 0]}]}},
      {...fresh.board, marked: [1], refused: {wrong: 1}, play: {kind: 'out', start: 1, first: 'opponent', turns: [{player: 'opponent', to: [0, 0]}]}},
      {...fresh.board, marked: [], refused: {wrong: q.size + 2}, play: {kind: 'out', start: q.size + 2, first: 'opponent', turns: [{player: 'opponent', to: [1, 1]}]}},
      {...fresh.board, marked: [answers[0]], refused: {wrong: answers[0]}, play: {kind: 'out', start: answers[0], first: 'opponent', turns: []}},
      {...fresh.board, marked: [1], refused: {wrong: 1}, play: null},
      {...fresh.board, play: {kind: 'try', start: null, first: 'you', turns: []}},
      {...fresh.board, play: {kind: 'try', start: 0, first: null, turns: []}},
      {...fresh.board, play: {kind: 'try', first: null, turns: []}},
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
