import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from '../scripts/packs.mjs';
import {libraryView} from '../dist/caravan-ui.js';
import tentModule, {UNIT, tent, after, pathOf, imageOf, bandsOf, fullOn, meetingPairs, landings, breakers, ratioBands, fillStarts, widestEnd, fmt, targetsOf, actionFor} from '../dist/families/tent/tent.js';

const pack = JSON.parse(await readFile(new URL('../dist/families/tent/tent.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const u = x => Math.round(x * UNIT);
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${JSON.stringify(action)} from ${JSON.stringify(x.board)}`); return next; }, a);
const view = (p, a) => mechanicFor(p).render(p, {...a, hintLevel: 0}, {});
const back = (p, a) => undoPress(p, a, x => view(p, x));

test('the move doubles the distance to the nearer end, exactly on ticks', () => {
  assert.equal(tent(u(13)), u(6));
  assert.equal(tent(u(8)), u(16));
  assert.equal(tent(u(16)), 0);
  assert.deepEqual(pathOf(u(1), 5).map(fmt), ['1', '2', '4', '8', '16', '0']);
  assert.equal(after(u(1 / 32), 6), u(2));
  assert.deepEqual(['13', '7½', '1/4', '3/32', '0'].map(s => s), [u(13), u(7.5), u(0.25), 3, 0].map(fmt));
});

test('a band lands on an interval: doubled on one half, up to 16 across the middle', () => {
  assert.deepEqual(imageOf([u(5), u(10)]).map(fmt), ['10', '16']);
  assert.deepEqual(imageOf([u(10), u(15)]).map(fmt), ['2', '12']);
  assert.deepEqual(imageOf([u(6), u(11)]).map(fmt), ['10', '16']);
  assert.deepEqual(bandsOf([u(1), u(2)], 4).map(b => b.map(fmt).join('-')), ['1-2', '2-4', '4-8', '8-16', '0-16']);
  assert.equal(fullOn([u(1), u(2)], 6), 4);
  assert.equal(fullOn([u(7), u(9)], 6), 4, 'wider, no sooner');
  assert.equal(fullOn([u(7.5), u(8.5)], 6), 5);
});

test('the pack’s answers', () => {
  assert.equal(meetingPairs(byId('tent-01').parameters).length, 8);
  assert.deepEqual(breakers(byId('tent-02').parameters).map(fmt), ['7', '8', '9']);
  assert.deepEqual(breakers(byId('tent-03').parameters), []);
  assert.deepEqual(breakers(byId('tent-07').parameters).map(fmt), ['4']);
  const e = landings(byId('tent-08').parameters);
  assert.deepEqual([e.lo, e.hi].map(fmt), ['0', '12']);
  assert.deepEqual(ratioBands(byId('tent-06').parameters, [2, 3]).map(b => b.map(fmt).join('-')), ['2-10', '5-9', '6-14', '7-11']);
  assert.equal(widestEnd(byId('tent-09').parameters), u(1 / 4));
  assert.equal(widestEnd(byId('tent-10').parameters), u(1 / 16), 'five moves: wider than the finest step, 1/32');
  assert.deepEqual(fillStarts(byId('tent-11').parameters, 3).map(fmt), ['0', '2', '4', '6', '8', '10', '12', '14']);
});

test('pairs: a meeting pair goes on the shelf as it happens; That’s all is judged and kept through Undo', () => {
  const p = byId('tent-01');
  let a = freshAttempt(p);
  assert.ok(!view(p, a).includes('tn-shelf'), 'no shelf, no slot per answer');
  a = play(p, a, [{type: 'set', which: 0, at: u(3)}, {type: 'set', which: 1, at: u(13)}]);
  assert.deepEqual(a.board.found, [[u(3), u(13)]]);
  assert.match(view(p, a), /class="tn-meet"/);
  a = play(p, a, [{type: 'set', which: 0, at: u(13)}, {type: 'set', which: 1, at: u(3)}]);
  assert.equal(a.board.found.length, 1, 'the same pair either way round is one pair');
  a = play(p, a, [{type: 'all'}]);
  assert.equal(a.board.told, 'more');
  assert.match(view(p, a), /There is another\./);
  assert.equal(move(p, a, {type: 'all'}), null, 'off until something new is kept');
  const b = back(p, a);
  assert.equal(b.board.told, 'more', 'Undo keeps the refusal');
  for (let x = 0; x < 8; x++) a = play(p, a, [{type: 'set', which: 0, at: u(x)}, {type: 'set', which: 1, at: u(16 - x)}].filter(m => a.board.at[m.which] !== m.at));
  assert.equal(a.board.found.length, 8);
  a = play(p, a, [{type: 'all'}]);
  assert.ok(isSolved(p, a.board));
});

test('break: a landing outside the window solves; Can’t opens the pins, which decide', () => {
  const p2 = byId('tent-02');
  let a = play(p2, freshAttempt(p2), [{type: 'set', at: u(8)}]);
  assert.ok(isSolved(p2, a.board));
  const p = byId('tent-03');
  a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'cant'}), null, 'Can’t comes after a try');
  a = play(p, a, [{type: 'set', at: u(11)}, {type: 'cant'}]);
  assert.match(view(p, a), /Pin the lowest and the highest landing\./);
  a = play(p, a, [{type: 'pin'}, {type: 'set', at: u(13)}, {type: 'pin'}]);
  assert.equal(a.board.told, 'lower');
  assert.deepEqual(a.board.pins, []);
  const b = back(p, a);
  assert.equal(b.board.told, null, 'one Undo press goes back past the refusal it would only redraw');
  a = play(p, a, [{type: 'set', at: u(15)}, {type: 'pin'}, {type: 'set', at: u(10)}, {type: 'pin'}]);
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /class="tn-span"/);
});

test('widest: the app’s marker shows the band’s end until Widest; the end landing on 2 certifies it', () => {
  const p = byId('tent-09');
  let a = freshAttempt(p);
  assert.equal(a.board.at, a.board.hi, 'the app sets the marker on the band’s right end');
  assert.match(view(p, a), /tn-dot m-ink broken/, 'it escapes');
  assert.equal(move(p, a, {type: 'set', at: 0}), null, 'not the child’s before Widest');
  assert.equal(move(p, a, {type: 'widest'}), null, 'Widest comes after a try');
  a = play(p, a, [{type: 'band', end: 'hi', at: u(1 / 8)}, {type: 'widest'}]);
  assert.ok(a.board.at < a.board.hi);
  a = play(p, a, [{type: 'set', at: a.board.hi}, {type: 'pin'}]);
  assert.equal(a.board.told, 'wider');
  assert.match(view(p, a), /The band can be wider\./);
  a = play(p, a, [{type: 'band', end: 'hi', at: u(1 / 4)}]);
  assert.equal(a.board.claim, false, 'moving the band takes Widest back');
  assert.ok(!/tn-dot m-ink broken/.test(view(p, a)));
  a = play(p, a, [{type: 'widest'}, {type: 'set', at: u(1 / 4)}, {type: 'pin'}]);
  assert.ok(isSolved(p, a.board));
});

test('width and fill goals: met as they happen, kept through Undo, and the last one taken back by Undo', () => {
  const p = byId('tent-06');
  let a = freshAttempt(p);
  assert.deepEqual(a.board.reached, [], 'the starting band lands twice as wide');
  a = play(p, a, [{type: 'band', end: 'hi', at: u(10)}]);
  assert.deepEqual(a.board.reached, [], '4 to 10 lands 8 to 16: wider');
  a = play(p, a, [{type: 'band', end: 'hi', at: u(12)}]);
  assert.deepEqual(a.board.reached, [0], '4 to 12, with 8 in the middle, lands 8 to 16: just as wide');
  a = play(p, a, [{type: 'band', end: 'lo', at: u(5)}]);
  assert.deepEqual(a.board.reached, [0], '5 to 12 lands 8 to 16, not half as wide again; the met goal stays');
  a = play(p, a, [{type: 'band', end: 'hi', at: u(9)}]);
  assert.ok(isSolved(p, a.board));
  const b = back(p, a);
  assert.ok(!isSolved(p, b.board));
  assert.deepEqual(b.board.reached, [0]);
  const f = byId('tent-05');
  let c = freshAttempt(f);
  assert.deepEqual(c.board.reached, [], 'the start (first full on move 4) meets no goal');
  assert.match(view(f, c), /First full on move 5<\/div>/);
  c = play(f, c, [{type: 'slide', at: u(3)}]);
  assert.ok(!isSolved(f, c.board));
  c = play(f, c, [{type: 'slide', at: u(3.5)}]);
  assert.ok(isSolved(f, c.board));
});

test('pieces: every band first full on move 3, with That’s all', () => {
  const p = byId('tent-11');
  let a = freshAttempt(p);
  assert.deepEqual(a.board.found, [], 'the start (1 to 3) is first full on move 4');
  for (let x = 0; x <= 14; x += 2) a = play(p, a, [{type: 'slide', at: u(x)}]);
  assert.equal(a.board.found.length, 8);
  a = play(p, a, [{type: 'all'}]);
  assert.ok(isSolved(p, a.board));
});

test('hints solve every puzzle and never say press', () => {
  for (const p of pack.puzzles) {
    let a = freshAttempt(p), k = 0;
    while (!isSolved(p, a.board)) {
      const h = nextHint(p, a);
      assert.equal(h.type, 'move', p.id);
      assert.ok(!/Press/.test(h.text), `${p.id}: ${h.text}`);
      a = play(p, a, [h.action]);
      assert.ok(++k < 40, p.id);
    }
  }
});

test('forged saves are refused', () => {
  assert.equal(validBoard(byId('tent-01'), {at: [0, 64], found: [[0, 32]], told: null, done: false}), false);
  assert.equal(validBoard(byId('tent-11'), {lo: 0, found: [0], told: null, done: true}), false);
  assert.equal(validBoard(byId('tent-03'), {at: u(12), tried: false, cant: true, pins: [], told: null}), false);
  assert.equal(validBoard(byId('tent-09'), {hi: u(1 / 4), at: 0, claim: false, pins: [], told: null}), false);
  assert.equal(validBoard(byId('tent-06'), {band: [u(6), u(10)], reached: [3]}), false);
});

test('the drawing: deterministic, rows labelled by move, controls only where the child acts', () => {
  for (const p of pack.puzzles) {
    const a = freshAttempt(p), html = view(p, a);
    assert.equal(html, view(p, a), `${p.id}: the same board draws the same`);
    assert.match(html, /data-mechanic-wire="tent"/);
    const rows = p.parameters.mode === 'break' || p.parameters.mode === 'widest' ? p.parameters.moves : p.parameters.rows;
    assert.equal((html.match(/class="tn-rowlabel"/g) || []).length, rows, `${p.id}: one row per move`);
    assert.equal((html.match(/class="tn-(knob|handle)/g) || []).length, targetsOf(p.parameters, a.board).length);
  }
  const p = byId('tent-09'), html = view(p, freshAttempt(p));
  assert.match(html, />1\/4</); assert.match(html, />1\/2</); assert.match(html, /class="tn-link"/);
});

test('a press goes to the nearest control, snapped to the grid and held in its reach', () => {
  const q = byId('tent-02').parameters, b = freshAttempt(byId('tent-02')).board;
  const [t] = targetsOf(q, b);
  assert.deepEqual(actionFor(q, b, t, u(3)), {type: 'set', at: u(6)}, 'held inside the band');
  assert.deepEqual(actionFor(q, b, t, u(8.4)), {type: 'set', at: u(8)}, 'snapped to whole units');
  const r = byId('tent-11').parameters, c = freshAttempt(byId('tent-11')).board;
  assert.deepEqual(actionFor(r, c, targetsOf(r, c)[0], u(16)), {type: 'slide', at: u(14)}, 'a band slides by its middle and stays on the track');
});

test('a group in Ruler strips, below its levels', async () => {
  assert.equal(tentModule.family, undefined, 'no family of its own');
  for (const p of pack.puzzles) { assert.equal(p.libraryFamily, 'ranges'); assert.equal(p.group, 'Fold and stretch'); assert.equal(p.familyTitle, 'Ruler strips'); }
  const merged = await loadPack();
  const html = libraryView({nickname: 'T', attempts: {}}, merged.puzzles);
  const family = html.slice(html.indexOf('data-view-key="family-ranges"')), ruler = family.slice(0, family.indexOf('</details>'));
  assert.ok(ruler.indexOf('<h2>Hard</h2>') < ruler.indexOf('<h2>Fold and stretch</h2>'));
  assert.match(ruler, /aria-label="Ruler strips, Fold and stretch, puzzle 1"/);
});
