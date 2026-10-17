// Checks Pebble Duel's Buckets group (dist/families/buckets/buckets.json):
// content fields and sources; every answer against independent methods (the
// all-even rule and, in the encore, the multiple-of-4 rule, and a separate
// game-tree search with its own move generator; the module searches with
// another); that the winning move is unique wherever the first player wins,
// and that the encore rule needs adds of 3; that the opponent never misses a
// win and, when losing, plays a longest game; that about half the drawn
// starts are second-player starts and none is one move from the end; that
// the solver wins every round and always going first rarely does; that hints
// alone finish every duel and every reply, from a fresh start and after a
// wrong move, and every Every start, from fresh and after wrong marks,
// play-outs and practice games; that That's all judges every mark at once,
// plays a wrong card out and clears the marks, locks after "There is
// another." until a change, is hard to pass by chance, and costs far more to
// use as an oracle than knowing the answer; illegal moves; forged saves; the
// most fish a bucket holds; and CPU time per tap.
// Run: node scripts/validate-buckets.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoToSolvable} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {bucketMechanics, gameSolve, opponentMove, drawStart, startPool, cardStart, judge, PLAY, STREAK} from '../dist/families/buckets/buckets.js';
import {loadPack} from './packs.mjs';

export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// --- Independent answers -----------------------------------------------------------
// The rules: the second player wins exactly when every bucket is a multiple of
// m, where m is 2 for the capped game and 4 for the encore.
const modulus = q => (q.takes || 1) > 1 ? 4 : 2;
const ruleSecond = (q, pos) => pos.every(c => c % modulus(q) === 0);
// The repair move: take from the rightmost bucket that is not a multiple of m
// what is over a multiple, and top up each bucket on its left.
function repair(q, pos) {
  const m = modulus(q), j = pos.findLastIndex(c => c % m);
  if (j < 0) return null;
  return {from: j + 1, take: pos[j] % m, add: pos.map((c, i) => i < j ? (m - c % m) % m : 0)};
}
// A separate search with its own move generator: refills are built bucket by
// bucket by recursion (the module counts through them in base cap + 1).
function successors(q, pos) {
  const cap = q.cap || 1, takes = q.takes || 1, out = [];
  for (let j = 0; j < pos.length; j++) for (let t = 1; t <= takes && t <= pos[j]; t++) {
    const fill = (i, cur) => {
      if (i === j) { out.push({move: {from: j + 1, take: t, add: [...cur.map((c, k) => k < j ? c - pos[k] : 0)]}, to: cur}); return; }
      for (let a = 0; a <= cap; a++) fill(i + 1, cur.map((c, k) => k === i ? c + a : c));
    };
    fill(0, pos.map((c, k) => k === j ? c - t : c));
  }
  return out;
}
const searchMemo = new Map();
function searchWins(q, pos) {
  const key = `${q.cap || 1}/${q.takes || 1}/${pos}`;
  if (!searchMemo.has(key)) searchMemo.set(key, successors(q, pos).some(s => !searchWins(q, s.to)));
  return searchMemo.get(key);
}
const winsBySearch = (q, pos) => successors(q, pos).filter(s => !searchWins(q, s.to)).map(s => s.move);
const key = m => `${m.from}:${m.take}:${m.add.join(',')}`;
function box(n, max) {
  const out = [];
  (function build(prefix) { if (prefix.length === n) { out.push(prefix); return; } for (let c = 0; c <= max; c++) build([...prefix, c]); })([]);
  return out;
}
const longestBySearch = (() => {
  const memo = new Map();
  return function L(q, pos) {
    const k = `${q.cap || 1}/${pos}`;
    if (!memo.has(k)) memo.set(k, Math.max(0, ...successors({cap: q.cap, takes: 1}, pos).map(s => 1 + L(q, s.to))));
    return memo.get(k);
  };
})();

// --- Playing through the mechanics ------------------------------------------------------
const cpu = f => { const t = process.cpuUsage(); const out = f(); const u = process.cpuUsage(t); return {out, ms: (u.user + u.system) / 1000}; };
// Follow hints until solved; a deadend is answered with the rescue Undo the
// hint card offers.
function followHints(p, a, label, report) {
  for (let i = 0; i < 600 && !isSolved(p, a.board); i++) {
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
function standing(q, start, turns) {
  let pos = [...start];
  for (const t of turns) pos = pos.map((c, i) => c + t.add[i] - (i === t.from - 1 ? t.take : 0));
  return pos;
}

export default async function validateBuckets() {
  const json = JSON.parse(await readFile(new URL('../dist/families/buckets/buckets.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const report = {puzzles: json.puzzles.length, duels: 0, replies: 0, rounds: 0, sorts: 0, roundGamesPlayed: 0, alwaysFirstShare: {}, randomSolveShare: null, guessCost: null, mostFish: {}, maxTapMs: 0};
  assert.ok(json.puzzles.length >= 6 && json.puzzles.length <= 8, 'six to eight puzzles, as the card asks');
  assert.equal(new Set(json.sources.map(s => s.id)).size, json.sources.length);
  for (const s of json.sources) assert.match(s.url, /^https:\/\//, s.id);
  for (const [i, p] of json.puzzles.entries()) assert.equal(p.number, i + 1);

  // The theorems behind every answer, on finite cases, by the separate search:
  // the all-even rule for adds of 1 (and of up to 3, which changes nothing),
  // the multiple-of-4 rule for the encore, a single winning move wherever the
  // first player wins, and the encore rule failing with adds of 1 or 2.
  const cases = [[{cap: 1, takes: 1}, 1, 7], [{cap: 1, takes: 1}, 2, 6], [{cap: 1, takes: 1}, 3, 4], [{cap: 3, takes: 1}, 2, 5], [{cap: 3, takes: 3}, 1, 12], [{cap: 3, takes: 3}, 2, 8], [{cap: 3, takes: 3}, 3, 4]];
  let checkedStarts = 0;
  for (const [q, n, max] of cases) for (const pos of box(n, max)) {
    const second = (q.takes > 1 ? pos.every(c => c % 4 === 0) : pos.every(c => c % 2 === 0));
    assert.equal(!searchWins(q, pos), second, `${JSON.stringify(q)} ${pos}: the rule`);
    // With adds of up to 3 but takes of 1 the rule still holds, but a move can
    // add 0 or 2, so the winning move need not be unique.
    if (!second && (q.cap === 1 || q.takes > 1)) {
      const wins = winsBySearch(q, pos);
      assert.equal(wins.length, 1, `${JSON.stringify(q)} ${pos}: one winning move`);
      assert.equal(key(wins[0]), key(repair(q, pos)), `${pos}: it is the repair move`);
    }
    checkedStarts++;
  }
  for (const cap of [1, 2]) assert.equal(searchWins({cap, takes: 3}, [1, 1]), false, `with adds of ${cap}, 1 and 1 is a second-player start: the encore needs adds of 3`);
  report.theoremStarts = checkedStarts;
  // The longest game is the buckets read in base cap + 1.
  for (const cap of [1, 3]) for (const pos of box(cap === 1 ? 3 : 2, 3)) assert.equal(longestBySearch({cap}, pos), pos.reduce((s, c, i) => s + c * (cap + 1) ** i, 0), `longest game from ${pos}`);

  for (const p of json.puzzles) {
    const q = p.parameters, m = bucketMechanics[p.mechanic];
    // Content.
    for (const k of ['id', 'title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id}: ${k}`);
    assert.equal(p.libraryFamily, 'nim'); assert.equal(p.band, 'all'); assert.equal(p.familyTitle, 'Pebble Duel'); assert.equal(p.group, 'Buckets');
    assert.ok(['easy', 'medium', 'hard'].includes(p.difficulty_level));
    assert.equal(p.hints.length, 3);
    for (const k of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[k]?.trim(), `${p.id}: parent.${k}`);
    for (const id of p.parent.sourceIds) assert.ok(pack.sources.some(s => s.id === id), `${p.id}: source ${id}`);
    assert.match(p.provenance, /Week 81/);
    assert.match(p.controls, /^A move takes /, `${p.id}: How to play opens with the move`);
    assert.equal(p.proof, true, `${p.id}: How to play leaves out the grown-ups’ notes`);
    // No title, How to play line or first hint says "even" or names the rule.
    for (const text of [p.title, p.controls, ...p.rules, p.hints[0], p.visibleObjective, p.objective]) assert.doesNotMatch(text, /\beven\b|\bodd\b|pair|multiple|four|parity/i, `${p.id}: “${text}” gives nothing away`);
    for (const text of [p.title, p.controls, ...p.hints, p.visibleObjective]) assert.doesNotMatch(text, /\b\d+ (starts|cards) (to find|left)\b/i, `${p.id}: no count`);

    if (p.mechanic === 'bucketsort') {
      report.sorts++;
      const cards = Array.from({length: 15}, (_, i) => i + 1);
      const second = cards.filter(c => !searchWins(PLAY, cardStart(c)));
      assert.deepEqual(second, cards.filter(c => ruleSecond(PLAY, cardStart(c))), `${p.id}: the search agrees with the rule`);
      assert.deepEqual(p.solution.cards, second, `${p.id}: pack answers`);
      assert.deepEqual(p.solution.starts, second.map(cardStart));
      const wrongs = cards.filter(c => !second.includes(c));
      assert.equal(judge(second), null);
      assert.deepEqual(judge(second.slice(1)), {more: true});
      assert.deepEqual(judge([...second, wrongs[0]]), {wrong: wrongs[0]});
      for (const c of wrongs) assert.deepEqual(judge([c]), {more: true}, `${p.id}: one card alone says nothing`);
      // Hints alone: from fresh, after wrong marks and a play-out, and from a practice game.
      followHints(p, freshAttempt(p), 'from fresh', report);
      let a = freshAttempt(p);
      for (const c of [wrongs.at(-1), ...second]) a = move(p, a, {type: 'mark', cell: c});
      const partial = move(p, a, {type: 'mark', cell: second[0]});
      const asked = move(p, partial, {type: 'all'});
      assert.deepEqual(asked.board.refused, {more: true}, `${p.id}: missing comes first`); assert.equal(asked.board.play, null);
      assert.equal(move(p, asked, {type: 'all'}), null, `${p.id}: That’s all waits for a change`);
      // Every answer marked and a wrong card: I go first from it and win
      // against any reply; then the marks are cleared.
      for (let seed = 1; seed <= 30; seed++) {
        const r = seeded(seed);
        let b = m.move(p, a.board, {type: 'all'}, r);
        assert.deepEqual(b.refused, {wrong: wrongs.at(-1)});
        assert.equal(b.play.kind, 'out'); assert.equal(b.play.first, 'opponent');
        if (b.marked.length) assert.equal(m.move(p, b, {type: 'back'}), null, `${p.id}: the play-out cannot be left`);
        for (let step = 0; step < 60 && b.marked.length; step++) {
          const pos = standing(PLAY, cardStart(b.play.start), b.play.turns);
          const options = successors(PLAY, pos).map(s => s.move);
          b = m.move(p, b, {type: 'move', ...options[Math.floor(r() * options.length)]}, r);
          assert.ok(b && validBoard(p, JSON.parse(JSON.stringify(b))), `${p.id}: play-out move`);
        }
        assert.equal(b.play.turns.at(-1).player, 'opponent', `${p.id}: I win the play-out (seed ${seed})`);
        assert.deepEqual(b.marked, [], `${p.id}: then the marks are cleared`);
        b = m.move(p, b, {type: 'back'});
        assert.deepEqual(b, m.fresh(p));
      }
      followHints(p, move(p, a, {type: 'all'}, seeded(3)), 'during a play-out', report);
      let practice = move(p, freshAttempt(p), {type: 'try'});
      assert.equal(move(p, practice, {type: 'choose', first: 'you'}), null, `${p.id}: a card comes first`);
      practice = move(p, practice, {type: 'start', cell: 5});
      practice = move(p, practice, {type: 'choose', first: 'opponent'});
      followHints(p, practice, 'from a practice game', report);
      // Random mark sets rarely pass: the claim can fail.
      const r = seeded(5), shares = {};
      for (const [name, chance] of Object.entries({half: .5, matched: 3 / 15})) {
        let solved = 0;
        for (let i = 0; i < 20000; i++) { const kept = cards.filter(() => r() < chance); if (kept.length && judge(kept) === null) solved++; }
        shares[name] = solved / 20000;
      }
      report.randomSolveShare = shares;
      assert.ok(shares.half < .01 && shares.matched < .05, `${p.id}: random marks rarely pass`);
      // What guessing with That's all costs, in taps (a mark, That's all, Back
      // and End turn are one each; building a move is one tap a fish): knowing
      // the answer; marking every card and letting play-outs strip the wrong
      // ones; and leaving one card out at a time ("There is another." then
      // says it is an answer). Playing every card second, perfectly, is the
      // most solving by play can cost.
      const gameTaps = mv => 1 + mv.take + mv.add.reduce((x, y) => x + y, 0);
      const run = strategy => {
        let b = m.fresh(p), taps = 0, lost = 0;
        const act = (action, n = 1) => { b = m.move(p, b, action, seeded(taps)); assert.ok(b, `${p.id} ${strategy}: ${JSON.stringify(action)}`); taps += n; };
        const playOn = () => { for (let i = 0; i < 40 && b.play && !standing(PLAY, cardStart(b.play.start), b.play.turns).every(c => !c); i++) { const pos = standing(PLAY, cardStart(b.play.start), b.play.turns), mv = (winsBySearch(PLAY, pos)[0] || successors(PLAY, pos)[0].move); act({type: 'move', ...mv}, gameTaps(mv)); } };
        const markTo = target => { for (const c of [...b.marked]) if (!target.includes(c)) act({type: 'mark', cell: c}); for (const c of target) if (!b.marked.includes(c)) act({type: 'mark', cell: c}); };
        if (strategy === 'knowing') { markTo(second); act({type: 'all'}); }
        if (strategy === 'stripping') {
          const known = new Set();
          while (!b.done) { markTo(cards.filter(c => !known.has(c))); act({type: 'all'}); if (b.play) { known.add(b.refused.wrong); lost++; playOn(); act({type: 'back'}); } }
        }
        if (strategy === 'leaveOneOut') {
          const wrong = new Set(), right = new Set();
          for (const c of cards) {
            if (b.done) break;
            for (;;) {
              markTo(cards.filter(x => x !== c && !wrong.has(x)));
              act({type: 'all'});
              if (b.done) break;
              if (b.play) { wrong.add(b.refused.wrong); lost++; playOn(); act({type: 'back'}); if (b.done || wrong.has(c)) break; continue; }
              right.add(c); act({type: 'mark', cell: c}); break;
            }
          }
          if (!b.done) { markTo(second); act({type: 'all'}); }
        }
        if (strategy === 'byPlay') {
          const won = [];
          for (const c of cards) {
            act({type: 'try'}); act({type: 'start', cell: c}); act({type: 'choose', first: 'opponent'});
            playOn();
            if (b.play.turns.at(-1)?.player === 'you') won.push(c);
            act({type: 'back'});
          }
          assert.deepEqual(won, second, `${p.id}: playing perfectly second wins exactly from the answers`);
          markTo(second); act({type: 'all'});
        }
        assert.ok(b.done, `${p.id}: ${strategy} solves`);
        return {taps, lost};
      };
      const costs = {knowing: run('knowing'), byPlay: run('byPlay'), stripping: run('stripping'), leaveOneOut: run('leaveOneOut')};
      report.guessCost = costs;
      assert.ok(costs.stripping.lost === wrongs.length && costs.stripping.taps > 5 * costs.knowing.taps, `${p.id}: marking everything loses a game per wrong card`);
      assert.ok(costs.leaveOneOut.taps > 10 * costs.knowing.taps, `${p.id}: testing one card at a time costs far more than knowing the answer`);
      // Illegal moves and forged saves.
      const fresh = freshAttempt(p);
      for (const action of [{type: 'all'}, {type: 'mark', cell: 0}, {type: 'mark', cell: 16}, {type: 'mark', cell: 1.5}, {type: 'move', from: 1, take: 1, add: [0, 0]}, {type: 'back'}, {type: 'start', cell: 4}, {type: 'choose', first: 'you'}, {type: 'keep'}]) assert.equal(move(p, fresh, action), null, `${p.id}: rejects ${JSON.stringify(action)}`);
      let t = move(p, move(p, move(p, fresh, {type: 'try'}), {type: 'start', cell: 5}), {type: 'choose', first: 'you'});
      for (const bad of [{from: 2, take: 1, add: [0, 1]}, {from: 1, take: 1, add: [1, 0]}, {from: 2, take: 1, add: [2, 0]}, {from: 2, take: 2, add: [0, 0]}, {from: 3, take: 1, add: [0, 0]}, {from: 2, take: 1, add: [0]}]) assert.equal(move(p, t, {type: 'move', ...bad}), null, `${p.id}: rejects ${JSON.stringify(bad)} in a game`);
      const out = (marked, turns) => ({marked, refused: {wrong: 5}, play: {kind: 'out', start: 5, first: 'opponent', turns}, done: false});
      const forged = [
        {...fresh.board, done: true},
        {...fresh.board, marked: second.slice(1), done: true},
        {...fresh.board, marked: [0]},
        {...fresh.board, marked: [second[1], second[0]]},
        {...fresh.board, marked: [second[0], second[0]]},
        {...fresh.board, marked: [second[0]], refused: {wrong: second[0]}},
        {...fresh.board, marked: [second[0]], refused: {more: true}, done: true},
        {...fresh.board, marked: second, refused: {more: true}},
        out([...second, 5].sort((x, y) => x - y), []),
        out([...second, 5].sort((x, y) => x - y), [{player: 'opponent', from: 2, take: 1, add: [0, 0]}]),
        out([], [{player: 'opponent', from: 2, take: 1, add: [1, 0]}]),
        out([5], [{player: 'opponent', from: 2, take: 1, add: [1, 0]}]),
        {...fresh.board, marked: [...second, 10], refused: {wrong: 10}, play: {kind: 'out', start: 10, first: 'opponent', turns: []}},
        {...fresh.board, play: {kind: 'try', start: null, first: 'you', turns: []}},
        {...fresh.board, play: {kind: 'try', start: 0, first: null, turns: []}},
        {...fresh.board, play: {kind: 'try', start: 5, first: 'you', turns: [{player: 'you', from: 2, take: 1, add: [0, 1]}]}},
        {...fresh.board, extra: 1}
      ];
      assert.ok(validBoard(p, out([...second, 5].sort((x, y) => x - y), [{player: 'opponent', from: 2, take: 1, add: [1, 0]}])), `${p.id}: an honest play-out save`);
      for (const [i, board] of forged.entries()) assert.equal(validBoard(p, board), false, `${p.id}: rejects forged save ${i}`);
      const right = {...fresh.board, marked: second, done: true};
      assert.ok(validBoard(p, right) && isSolved(p, right));
      continue;
    }

    // --- Duels, every reply and rounds ---
    const fresh = m.fresh(p, seeded(4));
    if (q.mode === 'duel') {
      report.duels++;
      assert.equal(searchWins(q, q.start), true, `${p.id}: the first player wins`);
      assert.equal(ruleSecond(q, q.start), false);
      const wins = winsBySearch(q, q.start);
      assert.equal(wins.length, 1, `${p.id}: one winning first move`);
      assert.deepEqual(p.solution.winningMoves.map(key), wins.map(key), `${p.id}: pack answer`);
      assert.equal(key(wins[0]), key(repair(q, q.start)));
      followHints(p, freshAttempt(p), 'from fresh', report);
      // After each losing first move, hints (with the rescue Undo) still finish.
      for (const s of successors(q, q.start).filter(s => searchWins(q, s.to))) {
        const a = move(p, freshAttempt(p), {type: 'move', ...s.move}, seeded(2));
        assert.ok(a, `${p.id}: ${key(s.move)} is legal`);
        assert.equal(nextHint(p, a).type, 'deadend', `${p.id}: after ${key(s.move)} I can always win`);
        if (a.board.pos.some(Boolean)) assert.equal(nextHint(p, a).quiet, true, `${p.id}: and that is said only behind Hint`);
        followHints(p, a, `after ${key(s.move)}`, report);
      }
    } else if (q.mode === 'replies') {
      report.replies++;
      assert.equal(searchWins(q, q.start), false, `${p.id}: the second player wins`);
      const firsts = successors(q, q.start);
      assert.equal(firsts.length, p.solution.replies.length);
      for (const [i, s] of firsts.entries()) {
        const w = winsBySearch(q, s.to);
        assert.equal(w.length, 1);
        assert.deepEqual(p.solution.replies[i].leaves, s.to);
        assert.equal(key(p.solution.replies[i].reply), key(w[0]));
      }
      followHints(p, freshAttempt(p), 'from fresh', report);
      // A wrong reply loses that game; Try again replays it, and hints still finish.
      let a = freshAttempt(p);
      const bad = successors(q, a.board.pos).find(s => searchWins(q, s.to));
      a = move(p, a, {type: 'move', ...bad.move}, seeded(1));
      followHints(p, a, 'after a wrong reply', report);
    } else {
      report.rounds++;
      const pool = startPool(q);
      assert.equal(pool.length, p.solution.pool);
      assert.deepEqual(pool.filter(s => !searchWins(q, s)).map(String).sort(), p.solution.secondStarts.map(String).sort(), `${p.id}: second-player starts by search`);
      assert.deepEqual(pool.filter(s => ruleSecond(q, s)).map(String).sort(), p.solution.secondStarts.map(String).sort(), `${p.id}: and by the rule`);
      for (const s of pool) assert.ok(!successors(q, s).some(x => x.to.every(c => !c)), `${p.id}: ${s} is not one move from the end`);
      assert.equal(box(q.buckets, q.max).filter(s => s.some(Boolean) && !pool.some(t => String(t) === String(s))).every(s => successors(q, s).some(x => x.to.every(c => !c))), true, `${p.id}: only one-move starts are left out`);
      const second = new Set(p.solution.secondStarts.map(String));
      const random = seeded(11);
      let losing = 0, prev = null;
      for (let i = 0; i < 4000; i++) {
        const s = drawStart(q, random, prev);
        if (prev) assert.notEqual(String(s), String(prev), `${p.id}: a new start is new`);
        if (second.has(String(s))) losing++;
        prev = s;
      }
      assert.ok(losing / 4000 > .45 && losing / 4000 < .55, `${p.id}: half the starts are second-player starts`);
      for (let seed = 1; seed <= 25; seed++) {
        const r = seeded(seed);
        let b = m.fresh(p, r), steps = 0;
        while (!m.solved(p, b) && steps++ < 400) { b = m.move(p, b, gameSolve(p, b), r); assert.ok(b && m.valid(p, JSON.parse(JSON.stringify(b))), `${p.id}: solver move`); }
        assert.ok(m.solved(p, b), `${p.id}: the solver wins 3 in a row (seed ${seed})`);
        report.roundGamesPlayed += 3;
      }
      let passes = 0;
      for (let seed = 1; seed <= 1000; seed++) {
        const r = seeded(1000 + seed);
        let b = m.fresh(p, r);
        for (let step = 0; step < 400 && !m.solved(p, b); step++) {
          if (b.first !== null && b.turns.length && b.pos.every(c => !c) && b.turns.at(-1).player === 'opponent') break;
          b = m.move(p, b, b.first === null ? {type: 'choose', first: 'you'} : gameSolve(p, b), r);
        }
        if (m.solved(p, b)) passes++;
      }
      report.alwaysFirstShare[p.id] = passes / 1000;
      assert.ok(passes / 1000 < .25, `${p.id}: always going first rarely wins the streak`);
      assert.equal(m.hint(p, fresh).type, 'note', `${p.id}: hints never say who starts`);
      assert.equal(m.hint(p, m.move(p, fresh, {type: 'choose', first: 'you'}, seeded(1))).type, 'note');
    }

    // The opponent never misses a win and, when losing, plays a longest game.
    const n = q.start ? q.start.length : q.buckets;
    for (const pos of box(n, q.cap > 1 ? 7 : 4)) {
      if (pos.every(c => !c)) continue;
      for (const r of [0, .4, .999]) {
        const mv = opponentMove(q, pos, () => r), to = standing(q, pos, [mv]);
        assert.ok(successors(q, pos).some(s => key(s.move) === key(mv)), `${p.id}: the opponent's move is legal`);
        if (searchWins(q, pos)) assert.equal(searchWins(q, to), false, `${p.id}: from ${pos} the opponent wins`);
        else assert.equal(longestBySearch({cap: q.cap}, to), Math.max(...successors(q, pos).map(s => longestBySearch({cap: q.cap}, s.to))), `${p.id}: from ${pos} a longest game`);
      }
    }
    // The most fish in one bucket over random games from the puzzle's starts.
    const starts = q.mode === 'streak' ? startPool(q) : [q.start];
    let most = 0;
    const r = seeded(17);
    for (let g = 0; g < 400; g++) {
      let pos = [...starts[g % starts.length]];
      while (pos.some(Boolean)) { const opts = successors(q, pos); pos = opts[Math.floor(r() * opts.length)].to; most = Math.max(most, ...pos); }
    }
    report.mostFish[p.id] = most;

    // Illegal moves: refills on or right of the bucket, more than the cap,
    // taking more than allowed or from an empty bucket, a wrong length; and
    // anything before the choice.
    if (q.mode === 'streak') for (const action of [{type: 'move', from: 1, take: 1, add: Array(n).fill(0)}, {type: 'new'}, {type: 'again'}, {type: 'choose', first: 'both'}, null, {type: 'jump'}]) assert.equal(m.move(p, fresh, action), null, `${p.id}: rejects ${JSON.stringify(action)} before the choice`);
    const going = q.mode === 'streak' ? m.move(p, {...fresh, start: Array(n).fill(q.max), pos: Array(n).fill(q.max)}, {type: 'choose', first: 'you'}, seeded(1)) : fresh;
    if (going && !going.pos.every(c => !c) && (q.mode !== 'streak' || going.turns.length === 0)) {
      const pos = going.pos, j = pos.findLastIndex(c => c > 0), zeros = pos.map(() => 0);
      const bad = [
        {from: j + 1, take: 1, add: zeros.map((_, i) => i === j ? 1 : 0)},
        ...(j + 1 < n ? [{from: j + 1, take: 1, add: zeros.map((_, i) => i === j + 1 ? 1 : 0)}] : []),
        ...(j > 0 ? [{from: j + 1, take: 1, add: zeros.map((_, i) => i === 0 ? (q.cap || 1) + 1 : 0)}] : []),
        {from: j + 1, take: (q.takes || 1) + 1, add: zeros},
        {from: j + 1, take: 0, add: zeros},
        {from: j + 1, take: 1, add: zeros.slice(1)},
        {from: n + 1, take: 1, add: zeros},
        ...(pos.findIndex(c => c === 0) >= 0 ? [{from: pos.findIndex(c => c === 0) + 1, take: 1, add: zeros}] : [])
      ];
      for (const mv of bad) assert.equal(m.move(p, going, {type: 'move', ...mv}), null, `${p.id}: rejects ${JSON.stringify(mv)}`);
      if (q.mode === 'streak') assert.equal(m.move(p, going, {type: 'choose', first: 'opponent'}), null, `${p.id}: the choice is final`);
    }
    // Forged saves, including a forged win and a forged streak.
    // A real win: the repair move each turn against the opponent's replies.
    const win = start => {
      const turns = [];
      let pos = [...start];
      for (let i = 0; pos.some(Boolean); i++) {
        const mv = i % 2 ? opponentMove(q, pos, seeded(i)) : repair(q, pos);
        turns.push({player: i % 2 ? 'opponent' : 'you', ...mv});
        pos = standing(q, pos, [mv]);
      }
      return {start, first: 'you', turns};
    };
    const forgedCommon = [
      {...fresh, extra: 1},
      {...fresh, pos: fresh.pos.map(c => c + 1)},
      {...fresh, turns: [{player: 'you', from: 1, take: 1, add: Array(n).fill(0)}]}
    ];
    for (const [i, board] of forgedCommon.entries()) assert.equal(validBoard(p, board), false, `${p.id}: rejects forged save ${i}`);
    if (q.mode === 'duel') {
      const lose = successors(q, q.start).find(s => searchWins(q, s.to));
      const sloppy = {start: q.start, pos: [...q.start], first: 'you', turns: [{player: 'you', ...lose.move}, {player: 'opponent', ...successors(q, lose.to).find(s => searchWins(q, s.to)).move}]};
      sloppy.pos = standing(q, q.start, sloppy.turns);
      assert.equal(validBoard(p, sloppy), false, `${p.id}: rejects an opponent that misses a win`);
      assert.equal(validBoard(p, {...fresh, first: 'opponent'}), false);
      assert.equal(validBoard(p, {...fresh, start: q.start.map(c => c + 2), pos: q.start.map(c => c + 2)}), false);
      const done = {start: q.start, pos: q.start.map(() => 0), first: 'you', turns: [{player: 'you', take: 1, from: 1, add: Array(n).fill(0)}]};
      assert.equal(validBoard(p, done), false, `${p.id}: rejects a forged win`);
    }
    if (q.mode === 'replies') {
      assert.equal(validBoard(p, {...fresh, round: 2}), false, `${p.id}: the round's first move`);
      assert.equal(validBoard(p, {...fresh, round: 3}), false);
      assert.equal(validBoard(p, {...fresh, first: 'you'}), false);
    }
    if (q.mode === 'streak') {
      const pool = startPool(q), a = pool.find(s => searchWins(q, s)), b2 = pool.find(s => searchWins(q, s) && String(s) !== String(a));
      const current = (game, extra) => ({start: game.start, pos: standing(q, game.start, game.turns), first: game.first, turns: game.turns, streak: 0, won: [], fresh: true, ...extra});
      assert.ok(validBoard(p, current(win(a), {streak: 1, won: [win(a)]})), `${p.id}: an honest first win`);
      assert.ok(validBoard(p, current(win(b2), {streak: 2, won: [win(a), win(b2)]})), `${p.id}: an honest second win`);
      const forged = [
        {...fresh, streak: STREAK},
        {...fresh, streak: STREAK, won: [win(a), win(b2), win(a)]},
        {...fresh, streak: 1, won: [win(a)], fresh: false},
        current(win(a), {}),
        current(win(a), {streak: 2, won: [win(a), win(a)]}),
        {...fresh, start: a, pos: a, streak: 1, won: [win(a)]},
        {...fresh, won: [{...win(a), extra: 1}], streak: 1},
        {...fresh, start: Array(n).fill(q.max + 1), pos: Array(n).fill(q.max + 1)},
        {...fresh, start: Array(n).fill(0).map((_, i) => i ? 0 : 1), pos: Array(n).fill(0).map((_, i) => i ? 0 : 1)},
        {...fresh, streak: 1, won: [{start: a, first: 'you', turns: [{player: 'you', ...successors(q, a)[0].move}]}]}
      ];
      for (const [i, board] of forged.entries()) assert.equal(validBoard(p, board), false, `${p.id}: rejects forged round save ${i}`);
    }
    // Taps are fast: a move with its reply, a hint and a render.
    const at = q.mode === 'streak' ? m.move(p, fresh, {type: 'choose', first: 'you'}, seeded(5)) : fresh;
    if (at && !at.pos.every(c => !c) && at.turns.at(-1)?.player !== 'you') {
      const t1 = cpu(() => m.move(p, at, gameSolve(p, at), seeded(6))), t2 = cpu(() => m.render(p, {board: at, hintLevel: 2})), t3 = cpu(() => m.hint(p, at));
      report.maxTapMs = Math.max(report.maxTapMs, t1.ms, t2.ms, t3.ms);
    }
  }
  assert.ok(report.maxTapMs < 100, `taps respond in well under 100 ms (max ${report.maxTapMs} ms CPU)`);
  for (const p of json.puzzles) assert.equal(mechanicFor(p), bucketMechanics[p.mechanic]);
  return report;
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateBuckets(), null, 2));
