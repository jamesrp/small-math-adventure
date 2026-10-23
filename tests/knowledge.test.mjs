// Who knows: the Week 84 worksheet's worked examples and problems, every
// puzzle's knowledge states checked by exhaustive search over its worlds,
// removing cards and Next with its refusals, replies chosen with the doll's
// own headband hidden and Show with its refusals, Can't, the café design,
// Undo, hints, saves, rendering and the playground.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import knowledgeModule, {knowledgeMechanics, worlds, cafeReply, dollReply, roundOf, after, ruledOut, fault, runOf, conversations, coachRun, fitTables, claimable} from '../dist/families/knowledge/knowledge.js';
import {loadPack} from '../scripts/packs.mjs';

const own = JSON.parse(await readFile(new URL('../dist/families/knowledge/knowledge.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = knowledgeMechanics.knowledge;
const byId = id => own.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal from ${JSON.stringify(b.board)}`); return next; }, a);
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const board = (p, a) => mech.render(p, {...a, hintLevel: 0}, {});
const undo = a => ({...a, board: a.history.at(-1).board, history: a.history.slice(0, -1)});
const remove = (...cards) => cards.map(card => ({type: 'card', card}));
const replies = (...rs) => rs.map((reply, doll) => ({type: 'reply', doll, reply}));
const N = 'notyet', P = 'prove';
const uiOf = (html, cls) => { const m = html.match(new RegExp(`class="[^"]*${cls}[^"]*" data-action="mechanic-ui" data-ui='([^']+)'`)); return m ? JSON.parse(m[1].replace(/&quot;/g, '"')) : null; };

// --- Exhaustive search: what everyone knows, from the definitions ------------------
// A world's history is replayed from all of its worlds; the public table after
// k steps is every world whose first k answers match. Agent views: café
// person i sees place i; doll k sees every place but k.
const sees = (kind, i) => (kind === 'cafe' ? (v, w) => v[i] === w[i] : (v, w) => [...v].every((c, j) => j === i || c === w[j]));
const knows = (S, kind, i, w, fact) => S.filter(v => sees(kind, i)(v, w)).every(fact);
function cafeHistory(n, w) {
  let S = worlds('cafe', n);
  return Array.from({length: n}, (_, i) => {
    const r = knows(S, 'cafe', i, w, v => !v.includes('N')) ? 'yes' : knows(S, 'cafe', i, w, v => v.includes('N')) ? 'no' : 'notyet';
    S = S.filter(v => (knows(S, 'cafe', i, v, u => !u.includes('N')) ? 'yes' : knows(S, 'cafe', i, v, u => u.includes('N')) ? 'no' : 'notyet') === r);
    return r;
  });
}
function dollHistory(n, least, w, rounds) {
  let S = worlds('dolls', n).filter(v => [...v].filter(c => c === 'B').length >= least);
  const out = [];
  for (let r = 0; r < rounds; r++) {
    const row = [...w].map((_, k) => (knows(S, 'dolls', k, w, v => v[k] === 'B') ? P : N));
    out.push(row);
    S = S.filter(v => [...v].every((_, k) => (knows(S, 'dolls', k, v, u => u[k] === 'B') ? P : N) === row[k]));
  }
  return out;
}

test('every puzzle’s tables and answers, by exhaustive search over its worlds', () => {
  for (const p of own.puzzles.filter(x => x.parameters.mode !== 'playground')) {
    const q = p.parameters, s = p.solution;
    if (q.mode === 'fit' && q.kind === 'cafe') {
      const all = worlds('cafe', q.n);
      s.tables.forEach((table, k) => assert.deepEqual(table, all.filter(w => cafeHistory(q.n, w).slice(0, k).join() === q.said.slice(0, k).join()), `${p.id}: the table after ${k} answers`));
    } else if (q.mode === 'fit') {
      const all = worlds('dolls', q.n), base = all.filter(w => w.includes('B'));
      assert.deepEqual(s.tables[0], all);
      assert.deepEqual(s.tables[1], base, `${p.id}: the announcement removes RRR`);
      q.rounds.forEach((_, r) => assert.deepEqual(s.tables[r + 2], base.filter(w => JSON.stringify(dollHistory(q.n, 1, w, r + 1)) === JSON.stringify(q.rounds.slice(0, r + 1))), `${p.id}: the table after round ${r + 1}`));
    } else if (q.mode === 'design') {
      const fits = worlds('cafe', q.n).filter(w => cafeHistory(q.n, w).join() === s.said.join());
      assert.deepEqual(s.left, fits);
      assert.equal(fits.length, q.target);
      const counts = new Map();
      for (const w of worlds('cafe', q.n)) { const k = cafeHistory(q.n, w).join(); counts.set(k, (counts.get(k) || 0) + 1); }
      assert.deepEqual([...counts.values()].filter(c => c === q.target).length, 1, `${p.id}: exactly one conversation leaves ${q.target}`);
    } else {
      // Each round's replies: who knows they are blue, from the deal's own view of the table.
      const h = dollHistory(q.n, q.least, q.deal, s.rounds.length);
      assert.deepEqual(s.rounds, h, `${p.id}: every round’s replies`);
      const blue = [...q.deal].map(c => c === 'B');
      const proved = h.findIndex(row => row.every((x, k) => !blue[k] || x === P));
      assert.equal(s.proved, proved < 0 ? null : proved + 1, `${p.id}: the proving round`);
      // No red doll ever proves; no blue doll proves before the others.
      for (const row of h) { assert.ok(row.every((x, k) => blue[k] || x === N)); assert.ok(row.filter((x, k) => blue[k]).every((x, _, all) => x === all[0])); }
    }
  }
});

test('the worked examples: two people, two dolls', () => {
  // Page 1: person 1 says NO, leaving NO YES and NO NO.
  assert.deepEqual(after(worlds('cafe', 2), {type: 'say', who: 0, reply: 'no'}), ['NY', 'NN']);
  // Page 2: deal RB after the announcement; doll 1 matches BB and RB, doll 2 only RB.
  const S = after(worlds('dolls', 2), {type: 'announce', least: 1});
  assert.deepEqual(S, ['BB', 'BR', 'RB']);
  assert.deepEqual(roundOf(S, 'RB'), [N, P]);
  assert.deepEqual(ruledOut(S, {type: 'round', replies: [N, P]}), ['BB', 'BR']);
  assert.deepEqual(roundOf(S, 'BB'), [N, N]);
  assert.deepEqual(roundOf(S, 'BR'), [P, N]);
});

test('Problem 1: four conversations, and the deals that fit (1 + 4 + 2 + 1)', () => {
  const c = conversations(3);
  assert.deepEqual(c.map(x => [x.said.join(' '), x.left.join(' ')]), [
    ['notyet notyet no', 'YYN'], ['notyet notyet yes', 'YYY'], ['notyet no no', 'YNY YNN'], ['no no no', 'NYY NYN NNY NNN']
  ]);
  assert.equal(cafeReply(worlds('cafe', 3), 0, 'YNN'), 'notyet', 'a YES card cannot answer yet');
  assert.equal(cafeReply(['NYY', 'NYN', 'NNY', 'NNN'], 1, 'NYY'), 'no', 'after a NO, a YES card says NO');
  assert.deepEqual(conversations(4).filter(x => x.left.length === 2).map(x => x.said.join(' ')), ['notyet notyet no no']);
});

test('Problems 2–4: k blue dolls prove in round k; no announcement, never', () => {
  assert.equal(coachRun({n: 3, deal: 'BRR', least: 1}).proved, 1);
  assert.deepEqual(coachRun({n: 3, deal: 'BBR', least: 1}).rounds, [[N, N, N], [P, P, N]]);
  assert.deepEqual(coachRun({n: 3, deal: 'BBB', least: 1}).rounds, [[N, N, N], [N, N, N], [P, P, P]]);
  const seven = worlds('dolls', 3).filter(w => w.includes('B'));
  const hist = w => JSON.stringify(dollHistory(3, 1, w, 2));
  assert.equal(new Set(seven.map(hist)).size, 7, 'Problem 3: all seven told apart by round 2');
  for (const n of [2, 3, 4]) for (const deal of worlds('dolls', n)) {
    assert.equal(coachRun({n, deal, least: 0}).proved, null);
    if (deal.includes('B')) assert.equal(coachRun({n, deal, least: 1}).proved, [...deal].filter(c => c === 'B').length);
  }
  assert.deepEqual(coachRun({n: 4, deal: 'BBBR', least: 2}).tables.map(t => t.length), [16, 11, 5]);
  assert.equal(coachRun({n: 4, deal: 'BBBR', least: 2}).proved, 2);
});

test('removing cards and Next: a card wrongly kept or removed is refused with its answers', () => {
  const p = byId('knowledge-05');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'next'}), null, 'Next with nothing removed');
  let html = board(p, a);
  assert.deepEqual(uiOf(html, 'wk-next').told, {why: 'kept', cards: ['NYY']});
  a = play(p, a, ...remove('NYY', 'NYN', 'NNY', 'NNN', 'YYY'));
  assert.deepEqual(fault(runOf(p.parameters, a.board).S, {type: 'say', who: 0, reply: N}, a.board.out), {why: 'removed', card: 'YYY'});
  mech.ui(p, {...uiOf(board(p, a), 'wk-next'), at: JSON.stringify(a.board)});
  html = mech.render(p, {...a, hintLevel: 0}, {});
  assert.match(html, /This card gives the same answer\./);
  assert.match(html, /wk-whatif-line/, 'the card’s own answer is shown');
  assert.match(html, /class="wk-card out marked"/);
  a = play(p, a, ...remove('YYY'));
  assert.ok(!board(p, a).includes('This card gives'), 'the refusal went with the board');
  a = play(p, a, {type: 'next'});
  assert.equal(a.board.steps, 1);
  assert.equal(move(p, a, {type: 'card', card: 'NNN'}), null, 'a card already gone');
  a = play(p, a, ...remove('YNY', 'YNN'), {type: 'next'}, ...remove('YYY'));
  assert.match(board(p, a), />That’s all</, 'the last answer is checked by That’s all');
  a = play(p, a, {type: 'next'});
  assert.ok(isSolved(p, a.board));
});

test('replies: the coached doll’s headband is hidden; Show refuses a wrong reply with the cards', () => {
  const p = byId('knowledge-08');
  let a = play(p, freshAttempt(p), ...remove('RRR'), {type: 'next'});
  let html = board(p, a);
  assert.match(html, /aria-label="Doll 1, headband hidden"/, 'doll 1 is coached first');
  assert.match(html, /aria-label="Doll 2, blue"/);
  assert.match(html, /wk-hb wk-B focus/, 'doll 1’s place is ringed on the cards');
  assert.ok(!html.includes('data-action="expansion-move" data-move="{&quot;type&quot;:&quot;card'), 'no card can be removed before Show');
  a = play(p, a, {type: 'reply', doll: 0, reply: P});
  assert.match(board(p, a), /aria-label="Doll 2, headband hidden"/, 'the next doll is coached');
  a = play(p, a, ...replies(P, N, N).slice(1));
  assert.equal(move(p, a, {type: 'show'}), null);
  const told = uiOf(board(p, a), 'wk-show').told;
  assert.deepEqual(told, {why: 'could', doll: 0, cards: ['RBR']});
  mech.ui(p, {told, at: JSON.stringify(a.board)});
  assert.match(mech.render(p, {...a, hintLevel: 0}, {}), /Doll 1 could be red\./);
  // Tapping a doll coaches it.
  mech.ui(p, {coach: 2, at: JSON.stringify(a.board)});
  assert.match(mech.render(p, {...a, hintLevel: 0}, {}), /aria-label="Doll 3, headband hidden"/);
  a = play(p, a, {type: 'reply', doll: 0, reply: N}, {type: 'show'});
  html = board(p, a);
  assert.match(html, /aria-label="Doll 1, blue"/, 'every headband shows once the replies are out');
  a = play(p, a, ...remove('BRR', 'RBR', 'RRB'), {type: 'next'});
  // Round 2: doll 3 wrongly NOT YET is fine; doll 1 wrongly NOT YET is refused with every card that fits.
  a = play(p, a, ...replies(N, P, N));
  assert.deepEqual(uiOf(board(p, a), 'wk-show').told, {why: 'can', doll: 0, cards: ['BBR']});
  a = play(p, a, {type: 'reply', doll: 0, reply: P}, {type: 'show'});
  assert.ok(isSolved(p, a.board), 'both blue dolls prove in round 2');
});

test('Can’t: refused while cards leave the table, right after a round that removes none', () => {
  const ten = byId('knowledge-10');
  let a = play(ten, freshAttempt(ten), ...remove('RRR'), {type: 'next'});
  assert.match(board(ten, a), /class="secondary wk-button wk-cant"[^>]*disabled/, 'off before a round');
  a = play(ten, a, ...replies(N, N, N), {type: 'show'}, ...remove('BRR', 'RBR', 'RRB'), {type: 'next'});
  assert.equal(move(ten, a, {type: 'cant'}), null);
  assert.equal(uiOf(board(ten, a), 'wk-cant').told.why, 'never');
  const twelve = byId('knowledge-12');
  let b = play(twelve, freshAttempt(twelve), ...replies(N, N, N), {type: 'show'});
  assert.deepEqual(ruledOut(runOf(twelve.parameters, b.board).S, runOf(twelve.parameters, b.board).event), [], 'a round of NOT YETs removes nothing');
  b = play(twelve, b, {type: 'next'});
  assert.ok(claimable(twelve.parameters, b.board));
  assert.equal(nextHint(twelve, b).action.type, 'cant');
  b = play(twelve, b, {type: 'cant'});
  assert.ok(isSolved(twelve, b.board));
  const two = byId('knowledge-04');
  assert.ok(!board(two, play(two, freshAttempt(two), ...remove('RR'), {type: 'next'})).includes('Can’t'), 'no Can’t on the two-doll puzzles');
});

test('the café design: answers no card gives are refused; two deals solve it', () => {
  const p = byId('knowledge-09');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'say', reply: 'yes'}), null);
  assert.equal(uiOf(board(p, a), 'wk-r-yes').told.why, 'cannot');
  a = play(p, a, {type: 'say', reply: 'no'}, ...remove('YYY', 'YYN', 'YNY', 'YNN'), {type: 'next'});
  assert.equal(move(p, a, {type: 'say', reply: N}), null, 'after a NO, only NO');
  a = play(p, a, {type: 'say', reply: 'no'}, {type: 'next'}, {type: 'say', reply: 'no'}, {type: 'next'});
  assert.ok(!isSolved(p, a.board));
  assert.match(board(p, a), /wk-puzzle wk-cafe wk-design wk-n3 missed/);
  assert.equal(nextHint(p, a).action.type, 'again');
  a = play(p, a, {type: 'again'}, {type: 'say', reply: N}, ...remove('NYY', 'NYN', 'NNY', 'NNN'), {type: 'next'}, {type: 'say', reply: 'no'}, ...remove('YYY', 'YYN'), {type: 'next'}, {type: 'say', reply: 'no'}, {type: 'next'});
  assert.ok(isSolved(p, a.board));
});

test('the onlookers’ puzzle hides every headband until one card is left', () => {
  const p = byId('knowledge-11');
  let a = freshAttempt(p);
  assert.equal((board(p, a).match(/headband hidden/g) || []).length, 3);
  for (const t of p.solution.tables.slice(1)) {
    const S = runOf(p.parameters, a.board).S;
    a = play(p, a, ...remove(...S.filter(w => !t.includes(w))), {type: 'next'});
  }
  assert.ok(isSolved(p, a.board));
  assert.match(board(p, a), /aria-label="Doll 2, red"/);
  assert.match(board(p, a), /wk-card deal/);
});

test('Undo takes back a removal, a reply, a Show and a Next', () => {
  const p = byId('knowledge-04');
  let a = play(p, freshAttempt(p), ...remove('RR'), {type: 'next'}, {type: 'reply', doll: 0, reply: N}, {type: 'reply', doll: 1, reply: N}, {type: 'show'}, ...remove('BR'));
  assert.deepEqual(undo(a).board.out, []);
  assert.equal(undo(undo(a)).board.shown, false);
  assert.deepEqual(undo(undo(undo(a))).board.replies, [N, null]);
  const back = undo(undo(undo(undo(undo(a)))));
  assert.equal(back.board.steps, 0);
  assert.deepEqual(back.board.out, ['RR']);
});

test('hints: a card, Next, a reply, Show; hints alone solve every puzzle; never “Press Can’t”', () => {
  const p = byId('knowledge-08');
  let a = freshAttempt(p);
  assert.equal(nextHint(p, a).text, 'Remove R, R, R.');
  a = play(p, a, ...remove('BBB'));
  assert.equal(nextHint(p, a).text, 'Put back B, B, B.');
  a = play(p, a, ...remove('BBB', 'RRR'));
  assert.equal(nextHint(p, a).text, 'Press Next.');
  a = play(p, a, {type: 'next'});
  assert.equal(nextHint(p, a).text, 'Doll 1: Not yet.');
  const five = byId('knowledge-05');
  assert.equal(nextHint(five, freshAttempt(five)).text, 'Remove NO, YES, YES.');
  for (const q of own.puzzles.filter(x => x.parameters.mode !== 'playground')) {
    let b = freshAttempt(q), k = 0;
    while (!isSolved(q, b.board)) { const h = nextHint(q, b); assert.equal(h.type, 'move'); assert.ok(!/^Press Can’t/.test(h.text)); b = play(q, b, h.action); assert.ok(++k < 200, `${q.id}: hints finish`); }
  }
});

test('saves are replayed, and forged ones are rejected', () => {
  const p = byId('knowledge-10');
  const a = play(p, freshAttempt(p), ...remove('RRR'), {type: 'next'}, ...replies(N, N, N));
  assert.ok(validBoard(p, a.board));
  for (const [b, why] of [
    [{...a.board, shown: true, replies: [P, N, N]}, 'wrong replies shown'],
    [{...a.board, out: ['BRR']}, 'a card off before Show'],
    [{...a.board, cant: true}, 'Can’t while the table is changing'],
    [{...a.board, steps: 9}, 'rounds that never happened'],
    [{...a.board, replies: [N, N]}, 'too few replies'],
    [{...a.board, extra: 1}, 'an unknown field']
  ]) assert.equal(validBoard(p, b), false, why);
  const fit = byId('knowledge-06');
  assert.equal(validBoard(fit, {steps: 0, out: ['YYY', 'YYY']}), false, 'a card twice');
  assert.equal(validBoard(fit, {steps: 4, out: []}), false, 'past the last answer');
  const design = byId('knowledge-09');
  assert.equal(validBoard(design, {said: ['yes'], steps: 0, out: []}), false, 'an answer no card gives');
});

test('rendering: the café question, one objective line, no counts', () => {
  const p = byId('knowledge-06');
  const html = view(p, freshAttempt(p));
  assert.match(html, /Does everyone want a cup\?/);
  assert.match(html, /Remove every deal that doesn’t fit\./);
  assert.ok(!/\d+ (deals|cards) left|of 8/.test(html), 'no count of the cards left');
  assert.equal((html.match(/<button type="button" class="wk-card"/g) || []).length, 8, 'every card is a button');
  const coach = byId('knowledge-03');
  assert.match(view(coach, freshAttempt(coach)), /Keep going until every blue doll proves blue\./);
  assert.match(view(coach, freshAttempt(coach)), /At least one is blue\./);
});

test('the playground: set-up until the first move, never solved, no hints', () => {
  const p = byId('knowledge-playground');
  let a = freshAttempt(p);
  assert.equal(mech.noHint(p), true);
  assert.equal(nextHint(p, a).type, 'done');
  a = play(p, a, {type: 'size', n: 4}, {type: 'flip', doll: 2}, {type: 'flip', doll: 3});
  assert.equal(a.board.deal, 'BBBB');
  a = play(p, a, ...remove('RRRR'));
  assert.equal(move(p, a, {type: 'flip', doll: 0}), null, 'set-up locks once play starts');
  a = play(p, a, {type: 'next'});
  for (let r = 0; r < 3; r++) {
    a = play(p, a, ...replies(N, N, N, N), {type: 'show'});
    const run = runOf(p.parameters, a.board);
    a = play(p, a, ...remove(...ruledOut(run.S, run.event)), {type: 'next'});
  }
  a = play(p, a, ...replies(P, P, P, P), {type: 'show'});
  assert.equal(runOf(p.parameters, a.board).phase, 'proved', 'four blue dolls prove in round 4');
  assert.ok(!isSolved(p, a.board));
  a = play(p, a, {type: 'again'});
  assert.equal(a.board.deal, 'BBBB');
  assert.match(board(p, a), /wk-toggle now/);
  a = play(p, a, {type: 'announce', on: false});
  assert.match(board(p, a), /wk-toggle off/);
});

test('the family entry and its symbol', () => {
  assert.equal(knowledgeModule.id, 'knowledge');
  assert.equal(knowledgeModule.family.symbol, '⊨');
  assert.ok(pack.puzzles.some(p => p.id === 'knowledge-13'));
  assert.equal(dollReply(['BB', 'BR', 'RB'], 1, 'RB'), P);
  assert.deepEqual(fitTables(byId('knowledge-01').parameters).at(-1), ['YY']);
});
