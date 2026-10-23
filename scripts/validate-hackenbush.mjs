// Checks Pebble Duel's Stalks group (dist/families/hackenbush/hackenbush.json):
// content fields and sources, and that no title, How to play line, objective
// or first hint names a number; every answer against a separate game-tree
// search with its own board representation and move generator (the module
// searches with another); the theorem behind them on every board of up to
// three stalks of up to four segments (Blue wins whoever starts exactly when
// the sign-expansion sum is positive, Red when negative, the second player
// when zero, and no board is a first-player win); that each choice in boards
// and rounds wins exactly when it is the right one, whatever start I give;
// that the opponent never misses a win; that about a third of drawn boards
// are of each kind and a new board is new; that the solver wins every round
// and always making one choice rarely does; that hints alone finish every
// duel, every reply, boards and build, from fresh and after a wrong cut,
// choice or Check; that Check on a board that does not balance is played out
// with me winning, keeps the built stalks and waits for a change, and that
// random builds rarely balance; illegal moves; forged saves; and CPU time per tap.
// Run: node scripts/validate-hackenbush.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoToSolvable} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {hackenbushMechanics, gameSolve, opponentMove, drawStart, boardPool, balancingBuilds, STREAK} from '../dist/families/hackenbush/hackenbush.js';
import {loadPack} from './packs.mjs';

export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// --- Independent answers -----------------------------------------------------------
// This script's own game: a board is a list of stalks, each a list of +1
// (blue) and −1 (red) from the ground up; Blue is +1. Cuts are generated from
// the top of each stalk down, and positions are keyed by the stalks sorted
// by length, then by colours.
const toCodes = pos => pos.map(s => [...s].map(c => c === 'B' ? 1 : -1));
const codeKey = codes => codes.filter(s => s.length).map(s => s.map(x => x > 0 ? '+' : '-').join('')).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)).join('/');
function cutsOf(codes, side) {
  const out = [];
  for (let i = 0; i < codes.length; i++) for (let k = codes[i].length - 1; k >= 0; k--) if (codes[i][k] === side) out.push({stalk: i, at: k, to: codes.map((s, j) => j === i ? s.slice(0, k) : s)});
  return out;
}
const searchMemo = new Map();
// Whether `side` (+1 Blue, −1 Red), moving now, wins.
function sideWins(codes, side) {
  const key = `${side}|${codeKey(codes)}`;
  if (!searchMemo.has(key)) searchMemo.set(key, cutsOf(codes, side).some(c => !sideWins(c.to, -side)));
  return searchMemo.get(key);
}
const SIDE = {B: 1, R: -1};
const searchWins = (pos, colour) => sideWins(toCodes(pos), SIDE[colour]);
const winsBySearch = (pos, colour) => cutsOf(toCodes(pos), SIDE[colour]).filter(c => !sideWins(c.to, -SIDE[colour])).map(c => `${c.stalk}:${c.at}`).sort();
function kindBySearch(pos) {
  const b = searchWins(pos, 'B'), r = searchWins(pos, 'R');
  return b && r ? 'first' : b ? 'B' : r ? 'R' : 'second';
}
// Sign expansion, computed here as an exact fraction over 2^n: a stalk's
// first run counts ±1 each, then each segment ±1/2, ±1/4, …
function signValue(s) {
  const n = s.length, den = 2 ** n;
  let num = 0, i = 0;
  while (i < n && s[i] === s[0]) { num += (s[i] === 'B' ? 1 : -1) * den; i++; }
  for (let step = den / 2; i < n; i++, step /= 2) num += (s[i] === 'B' ? 1 : -1) * step;
  return num / den;
}
const sumValue = pos => pos.reduce((v, s) => v + signValue(s), 0);
const stalksUpTo = h => { const out = ['']; for (let n = 1; n <= h; n++) for (let c = 0; c < 2 ** n; c++) out.push(Array.from({length: n}, (_, i) => (c >> i) & 1 ? 'R' : 'B').join('')); return out; };
function multisets(items, k) {
  const out = [];
  (function go(from, chosen) { if (chosen.length === k) { out.push(chosen); return; } for (let i = from; i < items.length; i++) go(i, [...chosen, items[i]]); })(0, []);
  return out;
}
const after = (pos, m) => pos.map((s, i) => i === m.stalk ? s.slice(0, m.at) : s);
const other = c => c === 'B' ? 'R' : 'B';

// --- Playing through the mechanics ------------------------------------------------------
const cpu = f => { const t = process.cpuUsage(); const out = f(); const u = process.cpuUsage(t); return {out, ms: (u.user + u.system) / 1000}; };
// Follow hints until solved; a deadend is answered with the rescue Undo the
// hint card offers.
function followHints(p, a, label, report) {
  for (let i = 0; i < 400 && !isSolved(p, a.board); i++) {
    const t = cpu(() => nextHint(p, a));
    report.maxTapMs = Math.max(report.maxTapMs, t.ms);
    const hint = t.out;
    if (hint.type === 'deadend') { const back = undoToSolvable(p, a); assert.notEqual(back, a, `${p.id} ${label}: a deadend can be undone`); a = back; continue; }
    assert.equal(hint.type, 'move', `${p.id} ${label}: ${hint.text}`);
    const m = cpu(() => move(p, a, hint.action, seeded(i)));
    report.maxTapMs = Math.max(report.maxTapMs, m.ms);
    assert.ok(m.out, `${p.id} ${label}: hint ${JSON.stringify(hint.action)} is legal`);
    a = m.out;
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints alone finish`);
  return a;
}
// Where a game stands, replayed by this script.
const standing = (start, turns) => turns.reduce((pos, t) => after(pos, t), [...start]);
// Play out a game with the child making random legal cuts (or the given
// chooser's), checking every save; returns the final board.
function playOut(p, m, b, r, label, chooser = null) {
  for (let step = 0; step < 40; step++) {
    const pos = standing(b.start, b.turns), toMove = b.turns.length % 2 === 0 ? b.first : (b.first === 'you' ? 'opponent' : 'you');
    if (!cutsOf(toCodes(pos), SIDE[toMove === 'you' ? b.colour : other(b.colour)]).length) return b;
    assert.equal(toMove, 'you', `${p.id} ${label}: saves land on the child's turn`);
    const options = cutsOf(toCodes(pos), SIDE[b.colour]);
    const c = chooser ? chooser(pos) : options[Math.floor(r() * options.length)];
    b = m.move(p, b, {type: 'cut', stalk: c.stalk, at: c.at}, r);
    assert.ok(b && m.valid(p, JSON.parse(JSON.stringify(b))), `${p.id} ${label}: cut ${c.stalk}:${c.at}`);
  }
  throw new Error(`${p.id} ${label}: the game ends`);
}
const winner = b => {
  const pos = standing(b.start, b.turns), toMove = b.turns.length % 2 === 0 ? b.first : (b.first === 'you' ? 'opponent' : 'you');
  return cutsOf(toCodes(pos), SIDE[toMove === 'you' ? b.colour : other(b.colour)]).length ? null : (toMove === 'you' ? 'opponent' : 'you');
};
const perfectChooser = colour => pos => cutsOf(toCodes(pos), SIDE[colour]).find(c => !sideWins(c.to, -SIDE[colour])) || cutsOf(toCodes(pos), SIDE[colour])[0];
const NUMBER_WORDS = /\d+\s*\/\s*\d+|\bhalf\b|\bquarter\b|\bworth\b|\bnumber\b|\bvalue\b|\bzero\b|\bpositive\b|\bnegative\b|\bsum\b|\badd up\b/i;

export default async function validateHackenbush() {
  const json = JSON.parse(await readFile(new URL('../dist/families/hackenbush/hackenbush.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const report = {puzzles: json.puzzles.length, theoremBoards: 0, duels: 0, replies: 0, boards: 0, rounds: 0, builds: 0, alwaysShare: {}, drawShares: null, randomBuildShare: {}, maxTapMs: 0};
  assert.ok(json.puzzles.length >= 8 && json.puzzles.length <= 12, 'eight to twelve puzzles');
  assert.equal(new Set(json.sources.map(s => s.id)).size, json.sources.length);
  for (const s of json.sources) assert.match(s.url, /^https:\/\//, s.id);
  for (const [i, p] of json.puzzles.entries()) assert.equal(p.number, i + 1);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(json.puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  // The theorem behind every answer, on every board of up to three stalks of
  // up to four segments, by this script's search: the sign of the
  // sign-expansion sum decides who wins, and no board is a first-player win.
  const stalks = stalksUpTo(4);
  for (const k of [1, 2, 3]) for (const pos of multisets(stalks, k)) {
    if (!pos.some(Boolean)) continue;
    const v = sumValue(pos), kind = kindBySearch(pos);
    assert.equal(kind, v > 0 ? 'B' : v < 0 ? 'R' : 'second', `${pos}: the sign of ${v} decides`);
    report.theoremBoards++;
  }
  // A stalk balances its colour swap, and the stalks the worksheet names have their numbers.
  for (const s of stalks.filter(Boolean)) assert.equal(kindBySearch([s, [...s].map(other).join('')]), 'second', `${s} balances its colour swap`);
  for (const [s, v] of [['BR', 1 / 2], ['BRR', 1 / 4], ['RB', -1 / 2], ['BRB', 3 / 4], ['RBB', -1 / 4], ['RRB', -3 / 2]]) assert.equal(signValue(s), v, s);

  for (const p of json.puzzles) {
    const q = p.parameters, m = hackenbushMechanics[p.mechanic];
    // Content.
    for (const k of ['id', 'title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id}: ${k}`);
    assert.equal(p.libraryFamily, 'nim'); assert.equal(p.band, 'all'); assert.equal(p.familyTitle, 'Pebble Duel'); assert.equal(p.group, 'Stalks');
    assert.ok(['easy', 'medium', 'hard'].includes(p.difficulty_level));
    assert.equal(p.hints.length, 3);
    for (const k of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[k]?.trim(), `${p.id}: parent.${k}`);
    for (const id of p.parent.sourceIds) assert.ok(pack.sources.some(s => s.id === id), `${p.id}: source ${id}`);
    assert.match(p.provenance, /Week 83 Problem/);
    assert.match(p.controls, /^Blue cuts one blue segment/, `${p.id}: How to play opens with the move`);
    assert.equal(p.proof, true, `${p.id}: How to play leaves out the grown-ups’ notes`);
    // No title, How to play line, objective or first hint names a number.
    for (const text of [p.title, p.controls, ...p.rules, p.hints[0], p.visibleObjective, p.objective]) assert.doesNotMatch(text, NUMBER_WORDS, `${p.id}: “${text}” names no number`);

    if (p.mechanic === 'stalkbuild') {
      report.builds++;
      // Every way to fill the spots, by this script's search.
      const fills = multisets(stalksUpTo(q.height), q.slots), good = fills.filter(f => kindBySearch([...q.given, ...f]) === 'second');
      assert.equal(good.length, p.solution.count, `${p.id}: balancing builds by search`);
      assert.deepEqual(good.map(f => f.filter(Boolean).sort().join('|')).sort(), p.solution.balancingBuilds.map(f => [...f].sort().join('|')).sort(), `${p.id}: the pack lists them`);
      assert.deepEqual(balancingBuilds(q).map(f => [...f].sort().join('|')).sort(), good.map(f => [...f].sort().join('|')).sort(), `${p.id}: the hints steer toward the same builds`);
      assert.equal(kindBySearch([...q.given, ...p.solution.witness]), 'second', `${p.id}: the witness balances`);
      assert.notEqual(kindBySearch(q.given), 'second', `${p.id}: the given board does not balance alone`);
      report.randomBuildShare[p.id] = good.length / fills.length;
      assert.ok(good.length / fills.length < .05, `${p.id}: a random fill rarely balances`);
      followHints(p, freshAttempt(p), 'from fresh', report);
      // A wrong board: Check plays it out, I go first in the winning colour and
      // win against any cuts; Back keeps the built stalks, and Check waits.
      const wrong = fills.find(f => f.filter(Boolean).length === q.slots && kindBySearch([...q.given, ...f]) !== 'second');
      let a = freshAttempt(p);
      for (const [slot, s] of wrong.entries()) for (const c of s) a = move(p, a, {type: 'add', slot, colour: c});
      assert.deepEqual(a.board.built, wrong);
      for (let seed = 1; seed <= 30; seed++) {
        const r = seeded(seed);
        let b = m.move(p, a.board, {type: 'check'}, r);
        assert.ok(b.checked && b.play && !b.done, `${p.id}: a wrong Check is played out`);
        const board = [...q.given, ...wrong], kind = kindBySearch(board);
        assert.equal(b.play.colour, other(kind), `${p.id}: I take the colour that wins going first`);
        const game = () => ({start: board, colour: b.play.colour, first: 'opponent', turns: b.play.turns});
        if (winner(game()) === null) assert.equal(m.move(p, b, {type: 'back'}), null, `${p.id}: the play-out is played to the end`);
        for (let step = 0; step < 40 && winner(game()) === null; step++) {
          const pos = standing(board, b.play.turns), options = cutsOf(toCodes(pos), SIDE[b.play.colour]);
          const c = options[Math.floor(r() * options.length)];
          b = m.move(p, b, {type: 'cut', stalk: c.stalk, at: c.at}, r);
          assert.ok(b && validBoard(p, JSON.parse(JSON.stringify(b))), `${p.id}: play-out cut`);
        }
        assert.equal(winner(game()), 'opponent', `${p.id}: I win the play-out (seed ${seed})`);
        b = m.move(p, b, {type: 'back'});
        assert.deepEqual(b, {built: wrong, play: null, checked: true, done: false}, `${p.id}: Back keeps the built stalks`);
        assert.equal(m.move(p, b, {type: 'check'}), null, `${p.id}: Check waits for a change`);
      }
      followHints(p, move(p, a, {type: 'check'}, seeded(3)), 'during a play-out', report);
      followHints(p, a, 'from a wrong board', report);
      // Illegal moves and forged saves.
      const fresh = freshAttempt(p);
      const full = fresh.board.built.map(() => 'B'.repeat(q.height));
      for (const action of [{type: 'add', slot: q.slots, colour: 'B'}, {type: 'add', slot: 0, colour: 'G'}, {type: 'cut', stalk: 0, at: 0}, {type: 'cut', stalk: q.given.length, at: 0}, {type: 'back'}, {type: 'claim', claim: 'B'}, {type: 'jump'}]) assert.equal(move(p, fresh, action), null, `${p.id}: rejects ${JSON.stringify(action)}`);
      assert.equal(m.move(p, {...fresh.board, built: full}, {type: 'add', slot: 0, colour: 'R'}), null, `${p.id}: a spot holds ${q.height}`);
      const witnessBoard = {built: [...p.solution.witness].sort((x, y) => (x === '') - (y === '')), play: null, checked: false, done: true};
      assert.ok(validBoard(p, witnessBoard) && isSolved(p, witnessBoard), `${p.id}: an honest solve`);
      const outFor = (turns, colour) => ({built: wrong, play: {colour, first: 'opponent', turns}, checked: true, done: false});
      const kind = kindBySearch([...q.given, ...wrong]);
      const firstWin = cutsOf(toCodes([...q.given, ...wrong]), SIDE[kind]).find(c => !sideWins(c.to, -SIDE[kind]));
      const firstLose = cutsOf(toCodes([...q.given, ...wrong]), SIDE[kind]).find(c => sideWins(c.to, -SIDE[kind]));
      assert.ok(validBoard(p, outFor([{player: 'opponent', stalk: firstWin.stalk, at: firstWin.at}], other(kind))), `${p.id}: an honest play-out`);
      const forged = [
        {...fresh.board, done: true},
        {built: wrong, play: null, checked: false, done: true},
        {...witnessBoard, checked: true, done: false},
        {...fresh.board, built: full.map(s => s + 'B')},
        {...fresh.board, built: [...fresh.board.built, '']},
        {...fresh.board, built: fresh.board.built.map(() => 'X')},
        outFor([{player: 'opponent', stalk: firstWin.stalk, at: firstWin.at}], kind),
        ...(firstLose ? [outFor([{player: 'opponent', stalk: firstLose.stalk, at: firstLose.at}], other(kind))] : []),
        outFor([], other(kind)),
        {...outFor([{player: 'opponent', stalk: firstWin.stalk, at: firstWin.at}], other(kind)), checked: false},
        {...fresh.board, extra: 1}
      ];
      for (const [i, board] of forged.entries()) assert.equal(validBoard(p, board), false, `${p.id}: rejects forged save ${i}`);
      continue;
    }

    // --- Duels, every reply, boards and rounds ---
    const fresh = m.fresh(p, seeded(4));
    if (q.mode === 'duel') {
      report.duels++;
      assert.equal(kindBySearch(q.start), q.colour, `${p.id}: ${q.colour} wins whoever starts`);
      const wins = winsBySearch(q.start, q.colour);
      assert.deepEqual(p.solution.winningCuts.map(c => `${c.stalk}:${c.at}`).sort(), wins, `${p.id}: pack answer`);
      assert.ok(wins.length < cutsOf(toCodes(q.start), SIDE[q.colour]).length, `${p.id}: some first cut loses`);
      followHints(p, freshAttempt(p), 'from fresh', report);
      // After each losing first cut, hints (with the rescue Undo) still finish.
      for (const c of cutsOf(toCodes(q.start), SIDE[q.colour]).filter(c => sideWins(c.to, -SIDE[q.colour]))) {
        const a = move(p, freshAttempt(p), {type: 'cut', stalk: c.stalk, at: c.at}, seeded(2));
        assert.ok(a, `${p.id}: ${c.stalk}:${c.at} is legal`);
        assert.equal(nextHint(p, a).type, 'deadend', `${p.id}: after ${c.stalk}:${c.at} I can always win`);
        if (winner(a.board) === null) assert.equal(nextHint(p, a).quiet, true, `${p.id}: and that is said only behind Hint`);
        followHints(p, a, `after ${c.stalk}:${c.at}`, report);
      }
      // A forged win, an opponent that misses a win, a wrong colour or first player.
      const lose = cutsOf(toCodes(q.start), SIDE[q.colour]).find(c => sideWins(c.to, -SIDE[q.colour]));
      const miss = cutsOf(lose.to, -SIDE[q.colour]).find(c => sideWins(c.to, SIDE[q.colour]));
      if (miss) {
        const sloppy = {start: q.start, pos: [], colour: q.colour, first: 'you', turns: [{player: 'you', stalk: lose.stalk, at: lose.at}, {player: 'opponent', stalk: miss.stalk, at: miss.at}]};
        sloppy.pos = standing(q.start, sloppy.turns);
        assert.equal(validBoard(p, sloppy), false, `${p.id}: rejects an opponent that misses a win`);
      }
      assert.equal(validBoard(p, {...fresh, colour: other(q.colour)}), false);
      assert.equal(validBoard(p, {...fresh, first: 'opponent'}), false);
      assert.equal(validBoard(p, {...fresh, pos: fresh.pos.map(() => '')}), false);
    } else if (q.mode === 'replies') {
      report.replies++;
      assert.equal(kindBySearch(q.start), 'second', `${p.id}: the second player wins`);
      // First cuts: each colour's cuts, one for each board they leave.
      const seen = new Map();
      for (const colour of ['B', 'R']) for (const c of cutsOf(toCodes(q.start), SIDE[colour]).reverse()) { const k = `${colour}|${codeKey(c.to)}`; if (!seen.has(k)) seen.set(k, {colour, stalk: c.stalk, at: c.at}); }
      assert.equal(p.solution.replies.length, seen.size, `${p.id}: the number of first cuts`);
      for (const r of p.solution.replies) {
        assert.ok(seen.has(`${r.first.colour}|${codeKey(toCodes(r.leaves))}`), `${p.id}: ${JSON.stringify(r.first)} is a first cut`);
        assert.deepEqual(r.replies.map(c => `${c.stalk}:${c.at}`).sort(), winsBySearch(r.leaves, other(r.first.colour)), `${p.id}: winning replies`);
        assert.ok(r.replies.length, `${p.id}: a reply wins`);
      }
      followHints(p, freshAttempt(p), 'from fresh', report);
      // A wrong reply loses that game; Try again replays it, and hints still finish.
      let a = freshAttempt(p);
      const bad = cutsOf(toCodes(a.board.pos), SIDE[a.board.colour]).find(c => sideWins(c.to, -SIDE[a.board.colour]));
      a = move(p, a, {type: 'cut', stalk: bad.stalk, at: bad.at}, seeded(1));
      followHints(p, a, 'after a wrong reply', report);
      // Forged rounds.
      assert.equal(validBoard(p, {...fresh, round: 1}), false, `${p.id}: the round's first cut`);
      assert.equal(validBoard(p, {...fresh, colour: other(fresh.colour)}), false);
      assert.equal(validBoard(p, {...fresh, first: 'you'}), false);
    } else if (q.mode === 'boards') {
      report.boards++;
      for (const [i, start] of q.boards.entries()) assert.equal(p.solution.boards[i].outcome, kindBySearch(start), `${p.id}: board ${i + 1}`);
      // Each choice wins exactly when it is the right one, whatever start and
      // colour I give and however I play: the child playing perfectly.
      for (const [round, start] of q.boards.entries()) for (const claim of ['B', 'R', 'second']) for (let seed = 1; seed <= 12; seed++) {
        const r = seeded(seed * 7 + round);
        let b = {start: [...start], pos: [...start], claim: null, colour: null, first: null, turns: [], round: 0, won: []};
        const solo = {...p, parameters: {...q, boards: [start]}};
        b = m.move(solo, b, {type: 'claim', claim}, r);
        assert.ok(b, `${p.id}: claim ${claim}`);
        b = playOut(solo, m, b, r, `claim ${claim}`, perfectChooser(b.colour));
        const right = kindBySearch(start) === claim;
        assert.equal(winner(b), right ? 'you' : 'opponent', `${p.id} board ${round + 1}: ${claim} ${right ? 'wins' : 'loses'} (seed ${seed})`);
      }
      followHints(p, freshAttempt(p), 'from fresh', report);
      // A wrong choice loses; Try again; hints finish.
      const wrongClaim = ['B', 'R', 'second'].find(c => c !== kindBySearch(q.boards[0]));
      let a = move(p, freshAttempt(p), {type: 'claim', claim: wrongClaim}, seeded(2));
      assert.ok(a);
      followHints(p, a, 'after a wrong choice', report);
      for (const action of [{type: 'cut', stalk: 0, at: 0}, {type: 'next'}, {type: 'again'}, {type: 'claim', claim: 'first'}, {type: 'new'}]) assert.equal(m.move(p, fresh, action), null, `${p.id}: rejects ${JSON.stringify(action)} before the choice`);
      assert.equal(m.move(p, a.board, {type: 'claim', claim: 'B'}), null, `${p.id}: the choice is final`);
      // Forged boards: a skipped board, a forged win, an assignment I may not give.
      assert.equal(validBoard(p, {...fresh, round: 1, start: q.boards[1], pos: q.boards[1]}), false, `${p.id}: rejects a skipped board`);
      const blueFirstOnBalanced = q.boards.findIndex(s => kindBySearch(s) === 'second');
      if (blueFirstOnBalanced >= 0) {
        const s = q.boards[blueFirstOnBalanced];
        const solo = {...p, parameters: {...q, boards: [s]}};
        // Choosing Blue on a balanced board means you start: a save where I
        // started (and cut) is forged.
        const mine = cutsOf(toCodes(s), SIDE.R)[0], turns = [{player: 'opponent', stalk: mine.stalk, at: mine.at}];
        const forgedGame = {start: s, pos: standing(s, turns), claim: 'B', colour: 'B', first: 'opponent', turns, round: 0, won: []};
        assert.equal(validBoard(solo, forgedGame), false, `${p.id}: Blue on a balanced board means you start`);
        assert.ok(validBoard(solo, {...forgedGame, claim: 'second'}), `${p.id}: the same game is honest after Go second`);
      }
    } else {
      report.rounds++;
      // The pool by this script's own enumeration.
      const pool = [];
      for (const k of [2, 3, 4]) for (const set of multisets(q.pieces, k)) {
        const n = set.join('').length, joined = set.join('');
        if (n >= q.least && n <= q.most && joined.includes('B') && joined.includes('R') && set.some(s => s.includes('B') && s.includes('R'))) pool.push(set);
      }
      assert.equal(pool.length, p.solution.pool, `${p.id}: pool size`);
      assert.equal(boardPool(q).length, pool.length);
      const counts = {B: 0, R: 0, second: 0, first: 0};
      for (const s of pool) counts[kindBySearch(s)]++;
      assert.equal(counts.first, 0, `${p.id}: no first-player board`);
      assert.deepEqual({B: counts.B, R: counts.R, second: counts.second}, p.solution.counts, `${p.id}: kinds by search`);
      const random = seeded(11), drawn = {B: 0, R: 0, second: 0};
      let prev = null;
      for (let i = 0; i < 3000; i++) {
        const s = drawStart(q, random, prev);
        if (prev) assert.notEqual(codeKey(toCodes(s)), codeKey(toCodes(prev)), `${p.id}: a new board is new`);
        drawn[kindBySearch(s)]++;
        prev = s;
      }
      report.drawShares = Object.fromEntries(Object.entries(drawn).map(([k, n]) => [k, n / 3000]));
      for (const share of Object.values(report.drawShares)) assert.ok(share > .29 && share < .38, `${p.id}: a third of the boards of each kind`);
      for (let seed = 1; seed <= 25; seed++) {
        const r = seeded(seed);
        let b = m.fresh(p, r), steps = 0;
        while (!m.solved(p, b) && steps++ < 300) { b = m.move(p, b, gameSolve(p, b), r); assert.ok(b && m.valid(p, JSON.parse(JSON.stringify(b))), `${p.id}: solver move`); }
        assert.ok(m.solved(p, b), `${p.id}: the solver wins 3 in a row (seed ${seed})`);
      }
      // Always the same choice rarely wins three in a row, even with perfect cuts.
      for (const claim of ['B', 'R', 'second']) {
        let passes = 0;
        for (let seed = 1; seed <= 400; seed++) {
          const r = seeded(5000 + seed);
          let b = m.fresh(p, r);
          for (let step = 0; step < 300 && !m.solved(p, b); step++) {
            if (b.first === null) b = m.move(p, b, {type: 'claim', claim}, r);
            else if (winner(b) === 'opponent') break;
            else b = m.move(p, b, gameSolve(p, b), r);
          }
          if (m.solved(p, b)) passes++;
        }
        report.alwaysShare[claim] = passes / 400;
        assert.ok(passes / 400 < .1, `${p.id}: always choosing ${claim} rarely wins the streak`);
      }
      assert.equal(m.hint(p, fresh).type, 'note', `${p.id}: hints never say what to choose`);
      const going = m.move(p, fresh, {type: 'claim', claim: 'B'}, seeded(1));
      if (winner(going) === null) assert.equal(m.hint(p, going).type, 'note');
      assert.equal(m.move(p, going, {type: 'claim', claim: 'R'}), null, `${p.id}: the choice is final`);
      // Forged streaks.
      const win = start => {
        const claim = kindBySearch(start), colour = claim === 'second' ? 'B' : claim, first = claim === 'second' ? 'opponent' : 'you';
        let b = {start, pos: [...start], claim, colour, first, turns: [], streak: 0, won: [], fresh: true};
        const turns = [];
        let pos = [...start], who = first;
        for (let i = 0; i < 40; i++) {
          const c = who === 'you' ? colour : other(colour), options = cutsOf(toCodes(pos), SIDE[c]);
          if (!options.length) break;
          const pickC = who === 'you' ? perfectChooser(colour)(pos) : opponentMove(pos, c, seeded(i));
          turns.push({player: who, stalk: pickC.stalk, at: pickC.at});
          pos = after(pos, pickC);
          who = who === 'you' ? 'opponent' : 'you';
        }
        return {start, claim, colour, first, turns};
      };
      const blue = pool.find(s => kindBySearch(s) === 'B'), red = pool.find(s => kindBySearch(s) === 'R');
      const current = (game, extra) => ({...game, pos: standing(game.start, game.turns), streak: 0, won: [], fresh: true, ...extra});
      assert.ok(validBoard(p, current(win(blue), {streak: 1, won: [win(blue)]})), `${p.id}: an honest first win`);
      assert.ok(validBoard(p, current(win(red), {streak: 2, won: [win(blue), win(red)]})), `${p.id}: an honest second win`);
      const forged = [
        {...fresh, streak: STREAK},
        {...fresh, streak: STREAK, won: [win(blue), win(red), win(blue)]},
        {...fresh, streak: 1, won: [win(blue)], fresh: false},
        current(win(blue), {}),
        current(win(blue), {streak: 2, won: [win(blue), win(blue)]}),
        {...fresh, won: [{...win(blue), extra: 1}], streak: 1},
        {...fresh, start: ['B', 'BB'], pos: ['B', 'BB']},
        {...fresh, streak: 1, won: [{...win(blue), claim: 'R'}]},
        {...fresh, claim: 'B'}
      ];
      for (const [i, board] of forged.entries()) assert.equal(validBoard(p, board), false, `${p.id}: rejects forged round save ${i}`);
    }
    // Common forged saves.
    for (const [i, board] of [{...fresh, extra: 1}, {...fresh, pos: fresh.pos.map(s => s + 'B')}, {...fresh, turns: [{player: 'you', stalk: 0, at: 0}]}].entries()) assert.equal(validBoard(p, board), false, `${p.id}: rejects forged save ${i}`);
    // Illegal cuts: the other colour, out of range, a non-integer.
    const at = fresh.first === null ? m.move(p, fresh, {type: 'claim', claim: 'second'}, seeded(3)) : fresh;
    if (at && winner(at) === null) {
      const pos = at.pos, mine = at.colour;
      const theirs = cutsOf(toCodes(pos), SIDE[other(mine)])[0];
      for (const bad of [...(theirs ? [{stalk: theirs.stalk, at: theirs.at}] : []), {stalk: pos.length, at: 0}, {stalk: 0, at: 9}, {stalk: 0.5, at: 0}, {stalk: -1, at: 0}]) assert.equal(m.move(p, at, {type: 'cut', ...bad}), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      const t1 = cpu(() => m.move(p, at, gameSolve(p, at), seeded(6))), t2 = cpu(() => m.render(p, {board: at, hintLevel: 2})), t3 = cpu(() => m.hint(p, at));
      report.maxTapMs = Math.max(report.maxTapMs, t1.ms, t2.ms, t3.ms);
    }
    // The opponent never misses a win, over every board reachable from the puzzle's starts.
    const starts = q.mode === 'streak' ? boardPool(q) : q.mode === 'boards' ? q.boards : [q.start];
    const seen = new Set();
    const visit = pos => {
      const k = codeKey(toCodes(pos));
      if (seen.has(k)) return;
      seen.add(k);
      for (const colour of ['B', 'R']) {
        if (!cutsOf(toCodes(pos), SIDE[colour]).length) continue;
        for (const r of [0, .5, .999]) {
          const mv = opponentMove(pos, colour, () => r);
          assert.ok(cutsOf(toCodes(pos), SIDE[colour]).some(c => c.stalk === mv.stalk && c.at === mv.at), `${p.id}: the opponent's cut is legal`);
          if (searchWins(pos, colour)) assert.equal(searchWins(after(pos, mv), other(colour)), false, `${p.id}: from ${pos} the opponent wins`);
        }
        for (const c of cutsOf(toCodes(pos), SIDE[colour])) visit(after(pos, c));
      }
    };
    for (const s of starts.slice(0, q.mode === 'streak' ? 60 : starts.length)) visit(s);
  }
  assert.ok(report.maxTapMs < 100, `taps respond in well under 100 ms (max ${report.maxTapMs} ms CPU)`);
  for (const p of json.puzzles) assert.equal(mechanicFor(p), hackenbushMechanics[p.mechanic]);
  return report;
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateHackenbush(), null, 2));
