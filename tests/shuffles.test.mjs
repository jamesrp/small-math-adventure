import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {runStory, stories, byOrder, targetKeys, verdict, PLAY_RULES} from '../dist/families/shuffles/shuffles.js';
import {validateShuffles} from '../scripts/validate-shuffles.mjs';
import {loadPack} from '../scripts/packs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const shuffles = await read('../dist/families/shuffles/shuffles.json');
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const draw = ticket => ({type: 'draw', ticket}), keep = {type: 'keep'}, claim = {type: 'claim'}, again = {type: 'again'};
const draws = (...tickets) => tickets.map(draw);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const solve = p => { let a = freshAttempt(p); for (let i = 0; !isSolved(p, a.board) && i < 400; i++) a = move(p, a, nextHint(p, a).action); return a; };

test('the pack validates: answers match a separate simulation, hints solve, illegal moves fail', async () => {
  const report = await validateShuffles();
  assert.equal(report.shufflesPuzzles, 9);
  assert.deepEqual(report.theorems.anySlot, {ABC: 4, ACB: 5, BAC: 5, BCA: 5, CAB: 4, CBA: 4});
  assert.equal(report.theorems.designs.length, 6);
});

test('a story swaps each step’s slot with the slot on its ticket', () => {
  const later = PLAY_RULES.later(3);
  assert.equal(runStory('ABC', later, [3, 3]), 'CAB');
  assert.equal(runStory('ABC', later, [1, 2]), 'ABC', 'a ticket for its own slot leaves the cups');
  assert.deepEqual(stories(later), ['12', '13', '22', '23', '32', '33']);
  assert.ok(Object.values(byOrder('BAC', later)).every(s => s.length === 1), 'fair from any start');
  assert.equal(stories(PLAY_RULES.any(3)).length, 27);
  assert.deepEqual(Object.keys(byOrder('ABC', PLAY_RULES.never(3))).filter(r => byOrder('ABC', PLAY_RULES.never(3))[r].length), ['BCA', 'CAB']);
  assert.deepEqual(verdict('ABC', PLAY_RULES.any(3)).kind, 'twice');
  assert.deepEqual(verdict('ABC', PLAY_RULES.never(3)), {kind: 'never', row: 'ABC'});
  assert.deepEqual(verdict('ABCD', PLAY_RULES.later(4)), {kind: 'once'});
});

test('make a row: draw tickets until the cups match, Again to start over', () => {
  const p = byId('shuffles-01');
  let a = freshAttempt(p);
  assert.equal(move(p, a, draw(4)), null, 'no ticket 4 with three cups');
  a = play(p, a, draws(2, 3));
  assert.equal(runStory('ABC', p.parameters.steps, a.board.story), 'BCA');
  assert.ok(!isSolved(p, a.board));
  assert.equal(move(p, a, draw(3)), null, 'the story is over');
  assert.equal(nextHint(p, a).text, 'Start again.');
  a = play(p, a, [again, ...draws(3, 3)]);
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, again), null, 'no moves after a solve');
});

test('every story: Keep files a story under the order it makes; an early That’s all says there’s another', () => {
  const p = byId('shuffles-02');
  let a = play(p, freshAttempt(p), draws(1, 2));
  a = play(p, a, [keep]);
  assert.deepEqual(a.board.kept, ['12']);
  assert.equal(move(p, a, keep), null, 'kept once');
  a = play(p, a, [claim]);
  assert.equal(a.board.missed, true);
  assert.match(view(p, a), /There’s another\./);
  assert.equal(move(p, a, claim), null, 'not twice in a row');
  assert.ok(!undo(a).board.missed, 'Undo takes it back');
  a = play(p, a, [again, ...draws(3, 3), keep, {type: 'load', key: '12'}]);
  assert.deepEqual(a.board.story, [1, 2], 'a kept story plays again');
  assert.equal(move(p, a, {type: 'load', key: '23'}), null, 'only kept stories load');
  const done = solve(p);
  assert.equal(done.board.kept.length, 6);
  const html = view(p, done);
  assert.equal((html.match(/class="case-bin"/g) || []).length, 6, 'the shelf is the catalog: a column per order');
  assert.equal((html.match(/class="case-kept"/g) || []).length, 6, 'one story in each');
});

test('rows a rule can make: ticket 1 lost makes four rows; never itself makes only the two loops', () => {
  const lost = byId('shuffles-04');
  assert.deepEqual(targetKeys(lost.parameters).sort(), ['BAC', 'BCA', 'CAB', 'CBA']);
  let a = play(lost, freshAttempt(lost), draws(2, 2));
  assert.equal(runStory('ABC', lost.parameters.steps, a.board.story), 'BAC');
  a = play(lost, a, [keep, again, ...draws(2, 2)]);
  assert.equal(move(lost, a, keep), null, 'a row is kept once');
  assert.deepEqual(play(lost, a, [again, ...draws(3, 3), keep]).board.kept, ['BAC', 'CAB']);
  const never = byId('shuffles-05');
  assert.equal(move(never, freshAttempt(never), draw(1)), null, 'no ticket for its own slot');
  const html = view(never, solve(never));
  assert.equal((html.match(/case-kept yes/g) || []).length, 2);
  assert.equal((html.match(/case-kept no/g) || []).length, 4);
  assert.equal(move(never, play(never, freshAttempt(never), [...draws(2, 3), keep, again]), {type: 'load', key: 'BCA'}), null, 'a kept row has many stories, so it does not load');
});

test('any slot: four stories make A B C and five make A C B', () => {
  const abc = byId('shuffles-06'), acb = byId('shuffles-07');
  assert.deepEqual(targetKeys(abc.parameters), ['123', '132', '213', '321']);
  assert.deepEqual(targetKeys(acb.parameters), ['122', '133', '212', '231', '311']);
  let a = play(abc, freshAttempt(abc), draws(1, 2, 3));
  a = play(abc, a, [keep, again, ...draws(1, 1, 1)]);
  assert.equal(move(abc, a, keep), null, '1, 1, 1 makes C B A');
  const html = view(abc, solve(abc));
  assert.equal((html.match(/case-kept yes/g) || []).length, 4, 'the catalog marks the four');
  assert.equal((html.match(/case-kept no/g) || []).length, 23);
});

test('design: every ticket in every cup fails with two stories that meet; puzzle 8’s rule passes', () => {
  const p = byId('shuffles-09');
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {sets: [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4]], tried: false});
  a = play(p, a, [{type: 'try'}]);
  assert.ok(!isSolved(p, a.board));
  assert.match(view(p, a), /These make the same order\./);
  a = play(p, a, [{type: 'toggle', step: 1, ticket: 1}, {type: 'toggle', step: 2, ticket: 1}, {type: 'toggle', step: 2, ticket: 2}, {type: 'try'}]);
  assert.deepEqual(a.board.sets, [[1, 2, 3, 4], [2, 3, 4], [3, 4]]);
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /case-catalog/);
  const few = play(p, freshAttempt(p), [[1, 1], [2, 1], [2, 2], [2, 4], [-1]].map(([step, ticket]) => step < 0 ? {type: 'try'} : {type: 'toggle', step, ticket}));
  assert.deepEqual(few.board.sets, [[1, 2, 3, 4], [2, 3, 4], [3]], 'twelve stories, all different');
  assert.match(view(p, few), /No story makes this order\./);
  const hints = [];
  let b = freshAttempt(p);
  for (let i = 0; !isSolved(p, b.board) && i < 20; i++) { const h = nextHint(p, b); hints.push(h.text); b = move(p, b, h.action); }
  assert.ok(isSolved(p, b.board));
  assert.match(hints[0], /^Take ticket \d out of the cup for slot \d\.$/);
  assert.equal(hints.at(-1), 'Try it.');
});

test('every puzzle renders cups in numbered slots and its ticket cups; Keep and That’s all start greyed', () => {
  for (const p of shuffles.puzzles) {
    const a = freshAttempt(p), html = view(p, a), q = p.parameters, cups = q.cups || 3;
    assert.equal((html.match(/data-cup="/g) || []).length, cups, `${p.id}: a cup per slot`);
    assert.match(html, /aria-label="Slot 1: cup [A-D]/, `${p.id}: slots are numbered`);
    assert.doesNotMatch(html, /\d+ of \d+/, `${p.id}: no count of the answers`);
    if (p.band === 'playground') { assert.equal((html.match(/class="case-bin"/g) || []).length, 6, 'a column per order'); continue; }
    assert.ok(html.includes(p.objective), `${p.id}: objective shown`);
    if (q.mode === 'design') {
      assert.equal((html.match(/class="shuffle-ticket in/g) || []).length, 12, 'four tickets in each of three cups');
      assert.match(html, /<span class="cup-button case-cup[^"]*" data-cup="0" role="img"/, 'the cups are a picture');
      continue;
    }
    assert.match(html, /aria-label="Slot \d: cup [A-D], chosen"/, `${p.id}: this step’s slot is lifted`);
    assert.equal((html.match(/class="shuffle-step now/g) || []).length, 1, `${p.id}: one ticket cup at a time`);
    if (q.mode === 'target') { assert.doesNotMatch(html, /data-shuffle-move="[^"]*keep/); continue; }
    assert.match(html, /data-shuffle-move="[^"]*keep[^"]*"[^>]*disabled/, `${p.id}: nothing to keep yet`);
    assert.match(html, /data-shuffle-move="[^"]*claim[^"]*"[^>]*disabled/, `${p.id}: nothing kept yet`);
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Ticket shuffles/);
});

test('the playground: three rules, three or four cups, Draw finishes a story, never solved', () => {
  const pg = byId('shuffles-playground');
  let a = play(pg, freshAttempt(pg), [draw(2), {type: 'random'}, keep]);
  assert.equal(a.board.kept.length, 1);
  a = play(pg, a, [{type: 'rule', rule: 'any'}]);
  assert.deepEqual(a.board, {cups: 3, rule: 'any', story: [], kept: []});
  a = play(pg, a, [{type: 'random'}]);
  assert.equal(a.board.story.length, 3);
  a = play(pg, a, [keep, {type: 'cups', cups: 4}]);
  assert.deepEqual(a.board, {cups: 4, rule: 'any', story: [], kept: []});
  assert.equal((view(pg, a).match(/class="case-bin"/g) || []).length, 24);
  assert.ok(!isSolved(pg, a.board));
  assert.equal(nextHint(pg, a).type, 'done');
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const p = byId('shuffles-06'), a = solve(p);
  const half = play(byId('shuffles-02'), freshAttempt(byId('shuffles-02')), [...draws(2, 3), keep]);
  const design = play(byId('shuffles-09'), freshAttempt(byId('shuffles-09')), [{type: 'toggle', step: 0, ticket: 2}]);
  const pg = byId('shuffles-playground'), toy = play(pg, freshAttempt(pg), [{type: 'rule', rule: 'never'}, ...draws(2, 3), keep]);
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[p.id]: a, 'shuffles-02': half, 'shuffles-09': design, [pg.id]: toy})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of [[p.id, a], ['shuffles-02', half], ['shuffles-09', design], [pg.id, toy]]) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  assert.deepEqual(resumeAttempt(p, a).board, freshAttempt(p).board);
  const forged = {...store, profiles: [profile({[p.id]: {...a, board: {...a.board, kept: a.board.kept.slice(1)}}})]};
  assert.throws(() => validateStore(forged, puzzles), 'claimed with a story missing');
  const outsider = {...store, profiles: [profile({[p.id]: {...half, board: {story: [], kept: ['111'], claimed: false, missed: false}}})]};
  assert.throws(() => validateStore(outsider, puzzles), 'a kept story that does not make A B C');
});

test('the satchel lists Ticket shuffles with its playground and nine puzzles', () => {
  const html = libraryView(profile({'shuffles-02': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-shuffles"/);
  assert.match(html, /data-id="shuffles-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 9; n++) assert.ok(html.includes(`data-id="shuffles-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Ticket shuffles, Easy, puzzle 2, completed/);
});
