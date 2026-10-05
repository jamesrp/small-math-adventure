// Checks the Pebble Duel menus pack (dist/families/menus/menus.json): content
// fields and sources; every game's winning first takes and every round's
// losing starts against an independent Grundy-value computation (the module
// searches whole positions instead); that the opponent never misses a win;
// that a first take that is not winning always loses; that hints alone win
// every game and the solver wins every round; every-reply rounds; tracks and
// charts (squares to leave, the explanation of the lowest wrong square, and
// that the opponent wins when a wrong square is played out); the design
// puzzle against every menu; illegal moves and forged saves.
// Run: node scripts/validate-menus.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {solveAction, opponentMove, drawStart, firstDifference, DESIGN_LAST} from '../dist/families/menus/menus.js';
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
  assert.equal(menus.puzzles.length, 18);
  assert.deepEqual(menus.puzzles.map(p => p.number), Array.from({length: 18}, (_, i) => i + 1));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(menus.puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const s of menus.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  let games = 0, rounds = 0, hintTakes = 0, replies = 0, tracks = 0, explained = 0, playedOut = 0, designs = 0;
  for (const p of menus.puzzles) {
    const q = p.parameters, label = p.id;
    assert.equal(p.id, `menus-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, q.mode === 'track' || q.mode === 'design' ? 'menutrack' : 'menu'); assert.equal(p.libraryFamily, 'nim'); assert.equal(p.group, 'Menus'); assert.equal(p.band, 'all');
    assert.equal(p.familyTitle, 'Pebble Duel');
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    if (q.mode === 'design') { designs++; validateDesign(p); continue; }
    assert.ok(q.menu.length >= 2 && q.menu.every((m, i) => Number.isInteger(m) && m >= 1 && (!i || m > q.menu[i - 1])), `${label}: a sorted menu`);
    assert.ok(!q.misere || q.menu[0] === 1, `${label}: misère menus include 1, so the game ends with an empty pile`);
    if (q.mode === 'track') { tracks++; const r = validateTrack(p); explained += r.explained; playedOut += r.playedOut; continue; }
    if (q.mode === 'replies') { replies++; hintTakes += validateReplies(p); }
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
    } else if (q.mode === 'streak') {
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
    const top = q.start ? Math.max(...q.start) : q.range[1];
    const positions = q.start?.length === 2 ? Array.from({length: (q.start[0] + 1) * (q.start[1] + 1)}, (_, i) => [Math.floor(i / (q.start[1] + 1)), i % (q.start[1] + 1)]) : (q.piles || q.start.length) === 2 ? Array.from({length: (top + 1) ** 2}, (_, i) => [Math.floor(i / (top + 1)), i % (top + 1)]) : Array.from({length: top + 1}, (_, n) => [n]);
    for (const piles of positions) {
      if (!takesFrom(q, piles).length || loses(q, piles)) continue;
      for (let seed = 1; seed <= 3; seed++) assert.ok(loses(q, after(piles, opponentMove(q, piles, seeded(seed)))), `${label}: the opponent wins from ${piles}`);
    }
    // Illegal moves and forged saves.
    const fresh = freshAttempt(p, seeded(2));
    const playing = q.mode !== 'streak' ? fresh : move(p, fresh, {type: 'choose', first: 'you'}, seeded(2));
    const pile = playing.board.piles.findIndex(n => n >= q.menu.at(-1)) + 1 || 1;
    const offMenu = Array.from({length: 7}, (_, i) => i + 1).find(n => !q.menu.includes(n));
    for (const action of [{type: 'take', pile, take: offMenu}, {type: 'take', pile, take: 0}, {type: 'take', pile: 9, take: 1}, {type: 'take', pile, take: 99}, {type: 'new'}, {type: 'again'}, {type: 'shrug'}, null]) {
      assert.equal(move(p, playing, action), null, `${label}: rejects ${JSON.stringify(action)}`);
    }
    if (q.mode !== 'streak') assert.equal(move(p, fresh, {type: 'choose', first: 'opponent'}), null, `${label}: games have a fixed first player`);
    else assert.equal(move(p, fresh, {type: 'take', pile: 1, take: q.menu[0]}), null, `${label}: no take before choosing who starts`);
    const b = playing.board;
    for (const forged of [{...b, piles: b.piles.map(n => n + 1)}, {...b, streak: 9}, {...b, start: b.start.map(n => n + 50)}, {...b, turns: q.mode === 'replies' ? [] : [{player: 'opponent', pile: 1, take: q.menu[0]}]}, {...b, first: q.mode !== 'streak' ? null : 'someone'}, {...b, fresh: 'yes'}]) {
      assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save`);
    }
  }
  return {puzzles: menus.puzzles.length, games, rounds, replies, tracks, designs, hintTakes, explained, playedOut};
}

// Every reply: the start loses for the first player; each round's answers;
// hints win all rounds; a wrong reply loses; rounds have no Undo.
function validateReplies(p) {
  const q = p.parameters, label = p.id;
  assert.ok(loses(q, q.start), `${label}: the start loses for the first player`);
  const firsts = takesFrom(q, q.start);
  assert.deepEqual(p.solution.replies.map(r => r.first), firsts.map(m => m.take), `${label}: one round per first take`);
  for (const [i, m] of firsts.entries()) {
    const rest = after(q.start, m), answers = takesFrom(q, rest).filter(r => loses(q, after(rest, r))).map(r => r.take);
    assert.ok(answers.length, `${label}: round ${i} has an answer`);
    assert.deepEqual(p.solution.replies[i].answers, answers, `${label}: answers to ${m.take}`);
  }
  assert.ok(mechanicFor(p).noUndo(p), `${label}: rounds have no Undo`);
  let taken = 0;
  for (let seed = 1; seed <= 15; seed++) {
    const random = seeded(seed);
    let a = freshAttempt(p, random);
    for (let step = 0; step < 200 && !isSolved(p, a.board); step++) { a = move(p, a, nextHint(p, a).action, random); taken++; assert.ok(a, `${label}: the hinted move is legal`); }
    assert.ok(isSolved(p, a.board), `${label}: hints answer every first take (seed ${seed})`);
  }
  // A wrong reply in the last round loses, and the round can be replayed.
  let a = freshAttempt(p, seeded(1));
  while (a.board.round < firsts.length - 1) {
    while (takesFrom(q, a.board.piles).length) a = move(p, a, nextHint(p, a).action, seeded(1));
    a = move(p, a, {type: 'next'});
  }
  const wrong = takesFrom(q, a.board.piles).find(r => !loses(q, after(a.board.piles, r)));
  let b = move(p, a, {type: 'take', ...wrong}, seeded(4));
  while (takesFrom(q, b.board.piles).length) b = move(p, b, {type: 'take', ...takesFrom(q, b.board.piles)[0]}, seeded(4));
  assert.ok(!isSolved(p, b.board), `${label}: a wrong reply loses`);
  assert.deepEqual(move(p, b, {type: 'again'}).board, a.board, `${label}: Try again replays the round`);
  assert.equal(move(p, b, {type: 'next'}), null);
  for (const forged of [{...a.board, round: 0}, {...a.board, round: 9}, {...a.board, round: '1'}, {...a.board, first: 'you'}]) assert.equal(validBoard(p, forged), false, `${label}: rejects a forged round`);
  return taken;
}

const independentLoses = (q, pos) => loses({menu: q.menu}, pos);
const squarePositions = q => {
  const n = q.last + 1, out = [];
  if (q.piles !== 2) return Array.from({length: n}, (_, s) => ({id: s, pos: [s]}));
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) out.push({id: a * n + b, pos: [a, b]});
  return out;
};
// Tracks and charts: the squares to leave; that hints alone finish from a
// fresh board and from random colourings; that each check explains the
// lowest wrong square truthfully; that playing it out loses for the child.
function validateTrack(p) {
  const q = p.parameters, label = p.id, squares = squarePositions(q);
  const truth = squares.filter(s => independentLoses(q, s.pos));
  const stored = p.solution.toLeave.map(v => typeof v === 'string' ? v.split(',').map(Number) : [v]);
  assert.deepEqual(stored.map(pos => pos.join(',')), truth.map(s => s.pos.join(',')), `${label}: squares to leave`);
  assert.ok(truth.length >= 3 && squares.length - truth.length >= 3, `${label}: both kinds of square`);
  const ids = new Set(truth.map(s => s.id));
  const sum = pos => pos.reduce((a, b) => a + b, 0);
  let explained = 0, playedOut = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const random = seeded(seed * 31);
    // A random colouring, near the truth so that the first wrong square varies.
    const marked = squares.filter(s => (random() < .15) !== ids.has(s.id)).map(s => s.id).sort((a, b) => a - b);
    if (!marked.length) continue;
    let a = {...freshAttempt(p), board: {marked, checked: false, play: null}};
    assert.ok(validBoard(p, a.board));
    a = move(p, a, {type: 'check'});
    const d = firstDifference(q, marked);
    if (!d) { assert.ok(isSolved(p, a.board)); continue; }
    assert.ok(!isSolved(p, a.board), `${label}: a wrong colouring is not solved`);
    const mine = new Set(marked), at = squares.find(s => s.id === d.square);
    // Every square that comes before it (fewer pebbles in all) is right.
    for (const s of squares) if (sum(s.pos) < sum(at.pos)) assert.equal(mine.has(s.id), ids.has(s.id), `${label}: squares below the first difference agree`);
    const idOf = pos => squares.find(s => s.pos.join() === pos.join()).id;
    if (d.extra) {
      assert.ok(mine.has(d.square) && !ids.has(d.square), `${label}: an extra square is coloured and not one to leave`);
      assert.ok(q.menu.includes(d.move.take) && mine.has(idOf(d.leaves[0])) && ids.has(idOf(d.leaves[0])), `${label}: its take reaches a coloured square to leave`);
    } else {
      assert.ok(!mine.has(d.square) && ids.has(d.square), `${label}: a missing square is one to leave`);
      assert.equal(d.leaves.length, takesFrom(q, at.pos).length);
      for (const pos of d.leaves) assert.ok(!mine.has(idOf(pos)) && !ids.has(idOf(pos)), `${label}: every take from it reaches an uncoloured square`);
    }
    explained++;
    // Play it out: the opponent wins, whatever the child does.
    let b = move(p, a, {type: 'play'}, random);
    assert.ok(b, `${label}: play after a wrong check`);
    for (let step = 0; step < 60; step++) {
      let piles = [...at.pos];
      for (const t of b.board.play.turns) piles = after(piles, t);
      const options = takesFrom(q, piles);
      if (!options.length) { assert.equal(b.board.play.turns.length % 2 === 0, !d.extra, `${label}: the child is the one left without a move`); break; }
      b = move(p, b, {type: 'take', ...options[Math.floor(random() * options.length)]}, random);
      assert.ok(b, `${label}: a legal take in the play-out`);
    }
    assert.ok(!isSolved(p, b.board));
    assert.equal(move(p, b, {type: 'check'}), null, `${label}: no check during a play-out`);
    assert.deepEqual(move(p, b, {type: 'back'}).board, a.board, `${label}: Back returns to the checked track`);
    playedOut++;
  }
  // Hints alone, from a fresh board.
  let a = freshAttempt(p);
  for (let step = 0; step < 300 && !isSolved(p, a.board); step++) a = move(p, a, nextHint(p, a).action);
  assert.ok(isSolved(p, a.board), `${label}: hints finish the track`);
  // Illegal moves and forged saves.
  const fresh = freshAttempt(p);
  for (const action of [{type: 'check'}, {type: 'play'}, {type: 'back'}, {type: 'take', pile: 1, take: q.menu[0]}, {type: 'mark', square: squares.length}, {type: 'mark', square: -1}, {type: 'mark', square: 1.5}, {type: 'choose', take: 1}, null]) {
    assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
  }
  for (const forged of [{marked: [1, 0], checked: false, play: null}, {marked: [], checked: true, play: null}, {marked: [0], checked: false}, {marked: [0], checked: false, play: {turns: []}}, {marked: [squares.length], checked: false, play: null}, {menu: [1], checked: false}]) {
    assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save ${JSON.stringify(forged)}`);
  }
  return {explained, playedOut};
}

// The design puzzle: every menu drawn from the choices is checked, and the
// ones that work are exactly those with 1 to period − 1 and no multiple of
// the period. Checking to DESIGN_LAST agrees with checking much further.
function validateDesign(p) {
  const q = p.parameters, label = p.id, far = 240;
  const all = q.choices.reduce((acc, x) => [...acc, ...acc.map(s => [...s, x])], [[]]).filter(s => s.length);
  const works = (menu, last) => Array.from({length: last + 1}, (_, s) => s).every(s => loses({menu}, [s]) === (s % q.period === 0));
  const good = all.filter(menu => works(menu, far));
  assert.deepEqual(p.solution.menus, good.map(m => m.join(',')), `${label}: the menus that work`);
  for (const menu of all) {
    assert.equal(works(menu, DESIGN_LAST), works(menu, far), `${label}: checking to ${DESIGN_LAST} settles ${menu}`);
    const theorem = Array.from({length: q.period - 1}, (_, i) => i + 1).every(t => menu.includes(t)) && menu.every(t => t % q.period);
    assert.equal(works(menu, far), theorem, `${label}: ${menu} works exactly when it has 1 to ${q.period - 1} and no multiple of ${q.period}`);
    let a = freshAttempt(p);
    for (const take of menu) a = move(p, a, {type: 'choose', take});
    a = move(p, a, {type: 'check'});
    assert.equal(isSolved(p, a.board), theorem, `${label}: Check on ${menu}`);
    if (!theorem) {
      const html = mechanicFor(p).render(p, a);
      assert.match(html, /Not yet: with takes of/, `${label}: a miss is explained`);
      assert.equal(move(p, a, {type: 'check'}), null, `${label}: change a take before checking again`);
    }
  }
  assert.equal(nextHint(p, freshAttempt(p)).type, 'note', `${label}: design hints are the authored ones`);
  assert.equal(move(p, freshAttempt(p), {type: 'check'}), null, `${label}: choose a take first`);
  for (const action of [{type: 'choose', take: 0}, {type: 'choose', take: 10}, {type: 'mark', square: 1}, {type: 'play'}]) assert.equal(move(p, freshAttempt(p), action), null, `${label}: rejects ${JSON.stringify(action)}`);
  for (const forged of [{menu: [2, 1], checked: false}, {menu: [], checked: true}, {menu: [1], checked: false, play: null}, {marked: [], checked: false, play: null}]) assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateMenus(), null, 2));
