// Checks the Pebble Duel menus pack (dist/families/menus/menus.json): content
// fields and sources; every game's winning first takes and every round's
// losing starts against an independent Grundy-value computation (the module
// searches whole positions instead); that the opponent never misses a win;
// that a first take that is not winning always loses; that hints alone win
// every game and the solver wins every round; illegal moves and forged saves.
// Run: node scripts/validate-menus.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {solveAction, opponentMove, drawStart} from '../dist/families/menus/menus.js';
import {loadPack} from './packs.mjs';

// Grundy values of one pile, by the mex rule, for normal play. A misère
// one-pile game is checked by its own outcome table.
function grundy(menu, n) {
  const g = [];
  for (let k = 0; k <= n; k++) {
    const seen = new Set(menu.filter(m => m <= k).map(m => g[k - m]));
    let x = 0;
    while (seen.has(x)) x++;
    g.push(x);
  }
  return g;
}
function misereLoses(menu, n) {
  const lose = [];
  for (let k = 0; k <= n; k++) {
    const options = menu.filter(m => m <= k).map(m => k - m);
    lose.push(options.length ? options.every(j => !lose[j]) : false);
  }
  return lose;
}
// Whether the player to move loses from these piles, by Sprague–Grundy.
function loses(q, piles) {
  const top = Math.max(...piles, 1);
  if (q.misere) { assert.equal(piles.length, 1, 'misère puzzles have one pile'); return misereLoses(q.menu, top)[piles[0]]; }
  const g = grundy(q.menu, top);
  return piles.reduce((x, n) => x ^ g[n], 0) === 0;
}
const takesFrom = (q, piles) => piles.flatMap((n, i) => q.menu.filter(m => m <= n).map(take => ({pile: i + 1, take})));
const after = (piles, m) => piles.map((n, i) => i === m.pile - 1 ? n - m.take : n);
const sameMoves = (a, b) => JSON.stringify(a.map(m => `${m.pile}:${m.take}`).sort()) === JSON.stringify(b.map(m => `${m.pile}:${m.take}`).sort());
function seeded(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

export default async function validateMenus() {
  const menus = JSON.parse(await readFile(new URL('../dist/families/menus/menus.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  assert.equal(menus.puzzles.length, 12);
  assert.deepEqual(menus.puzzles.map(p => p.number), Array.from({length: 12}, (_, i) => i + 1));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(menus.puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const s of menus.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  let games = 0, rounds = 0, hintTakes = 0;
  for (const p of menus.puzzles) {
    const q = p.parameters, label = p.id;
    assert.equal(p.id, `menus-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'menu'); assert.equal(p.libraryFamily, 'nim'); assert.equal(p.group, 'Menus'); assert.equal(p.band, 'all');
    assert.equal(p.familyTitle, 'Pebble Duel');
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(q.menu.length >= 2 && q.menu.every((m, i) => Number.isInteger(m) && m >= 1 && (!i || m > q.menu[i - 1])), `${label}: a sorted menu`);
    assert.ok(!q.misere || q.menu[0] === 1, `${label}: misère menus include 1, so the game ends with an empty pile`);
    assert.ok(isExpansion(p));
    if (q.mode === 'game') {
      games++;
      assert.ok(!loses(q, q.start), `${label}: the first player can win`);
      const winning = takesFrom(q, q.start).filter(m => loses(q, after(q.start, m)));
      assert.ok(sameMoves(winning, p.solution.winningFirstTakes), `${label}: winning first takes`);
      // Hints alone win, against every kind of reply.
      for (let seed = 1; seed <= 25; seed++) {
        const random = seeded(seed);
        let a = freshAttempt(p, random);
        for (let step = 0; step < 80 && !isSolved(p, a.board); step++) {
          const h = nextHint(p, a);
          assert.equal(h.type, 'move', `${label}: hints keep a winning move`);
          assert.ok(loses(q, after(a.board.piles, h.action)), `${label}: the hinted take leaves a losing position`);
          a = move(p, a, h.action, random); hintTakes++;
          assert.ok(a, `${label}: the hinted take is legal`);
        }
        assert.ok(isSolved(p, a.board), `${label}: hints win (seed ${seed})`);
      }
      // A first take that is not winning loses to the opponent, however the child goes on.
      for (const first of takesFrom(q, q.start).filter(m => !loses(q, after(q.start, m)))) {
        for (let seed = 1; seed <= 20; seed++) {
          const random = seeded(seed * 7 + first.take);
          let a = move(p, freshAttempt(p), {type: 'take', ...first}, random);
          while (a && !isSolved(p, a.board) && takesFrom(q, a.board.piles).length) {
            const options = takesFrom(q, a.board.piles);
            a = move(p, a, {type: 'take', ...options[Math.floor(random() * options.length)]}, random);
          }
          assert.ok(a && !isSolved(p, a.board), `${label}: a losing first take ${first.pile}:${first.take} cannot win`);
        }
      }
      // Undo returns to the child's turn before the take and the reply.
      const a1 = move(p, freshAttempt(p), {type: 'take', ...p.solution.winningFirstTakes[0]}, seeded(3));
      assert.deepEqual(undo(a1).board, freshAttempt(p).board);
    } else {
      rounds++;
      const all = [];
      (function build(prefix) { if (prefix.length === q.piles) { if (takesFrom(q, prefix).length) all.push(prefix); return; } for (let n = q.range[0]; n <= q.range[1]; n++) build([...prefix, n]); })([]);
      const losing = all.filter(piles => loses(q, piles)).map(piles => piles.join(','));
      assert.deepEqual(p.solution.losingStarts, losing, `${label}: losing starts`);
      assert.equal(p.solution.winningStarts, all.length - losing.length);
      assert.ok(losing.length >= 3 && all.length - losing.length >= 3, `${label}: both kinds of start`);
      // About half the drawn starts lose for the first player.
      const random = seeded(11);
      let drawnLosing = 0;
      for (let i = 0; i < 2000; i++) if (losing.includes(drawStart(q, random).join(','))) drawnLosing++;
      assert.ok(drawnLosing > 850 && drawnLosing < 1150, `${label}: about half the starts lose for the first player (${drawnLosing} of 2000)`);
      // The solver (who starts, then winning takes) completes the streak.
      for (let seed = 1; seed <= 10; seed++) {
        const r = seeded(seed * 13);
        let a = freshAttempt(p, r);
        for (let step = 0; step < 400 && !isSolved(p, a.board); step++) a = move(p, a, solveAction(p, a.board).action, r);
        assert.ok(isSolved(p, a.board), `${label}: the solver wins ${q.streak} in a row (seed ${seed})`);
      }
      // Always going first loses at least once in twenty fresh starts.
      let lostOne = false;
      for (let seed = 1; seed <= 20 && !lostOne; seed++) {
        const r = seeded(seed * 17);
        let a = freshAttempt(p, r);
        a = move(p, a, {type: 'choose', first: 'you'}, r);
        while (a && takesFrom(q, a.board.piles).length) { const h = solveAction(p, a.board); a = move(p, a, h.action, r); }
        if (!a.board.streak) lostOne = true;
      }
      assert.ok(lostOne, `${label}: "Me first" every time does not win`);
      assert.equal(nextHint(p, freshAttempt(p, seeded(5))).type, 'note', `${label}: round hints never name who starts`);
      assert.ok(mechanicFor(p).noUndo(p), `${label}: rounds have no Undo`);
    }
    // The opponent takes a winning move whenever one exists.
    const top = q.mode === 'game' ? Math.max(...q.start) : q.range[1];
    const positions = q.mode === 'game' && q.start.length === 2 ? Array.from({length: (q.start[0] + 1) * (q.start[1] + 1)}, (_, i) => [Math.floor(i / (q.start[1] + 1)), i % (q.start[1] + 1)]) : (q.piles || q.start.length) === 2 ? Array.from({length: (top + 1) ** 2}, (_, i) => [Math.floor(i / (top + 1)), i % (top + 1)]) : Array.from({length: top + 1}, (_, n) => [n]);
    for (const piles of positions) {
      if (!takesFrom(q, piles).length || loses(q, piles)) continue;
      for (let seed = 1; seed <= 3; seed++) assert.ok(loses(q, after(piles, opponentMove(q, piles, seeded(seed)))), `${label}: the opponent wins from ${piles}`);
    }
    // Illegal moves and forged saves.
    const fresh = freshAttempt(p, seeded(2));
    const playing = q.mode === 'game' ? fresh : move(p, fresh, {type: 'choose', first: 'you'}, seeded(2));
    const pile = playing.board.piles.findIndex(n => n >= q.menu.at(-1)) + 1 || 1;
    const offMenu = Array.from({length: 7}, (_, i) => i + 1).find(n => !q.menu.includes(n));
    for (const action of [{type: 'take', pile, take: offMenu}, {type: 'take', pile, take: 0}, {type: 'take', pile: 9, take: 1}, {type: 'take', pile, take: 99}, {type: 'new'}, {type: 'again'}, {type: 'shrug'}, null]) {
      assert.equal(move(p, playing, action), null, `${label}: rejects ${JSON.stringify(action)}`);
    }
    if (q.mode === 'game') assert.equal(move(p, fresh, {type: 'choose', first: 'opponent'}), null, `${label}: games have a fixed first player`);
    else assert.equal(move(p, fresh, {type: 'take', pile: 1, take: q.menu[0]}), null, `${label}: no take before choosing who starts`);
    const b = playing.board;
    for (const forged of [{...b, piles: b.piles.map(n => n + 1)}, {...b, streak: 9}, {...b, start: b.start.map(n => n + 50)}, {...b, turns: [{player: 'opponent', pile: 1, take: q.menu[0]}]}, {...b, first: q.mode === 'game' ? null : 'someone'}, {...b, fresh: 'yes'}]) {
      assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save`);
    }
  }
  return {puzzles: menus.puzzles.length, games, rounds, hintTakes};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateMenus(), null, 2));
