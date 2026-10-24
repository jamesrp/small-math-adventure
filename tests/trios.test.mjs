// Trios: third cards, trios through a tile, splits, sets with no trio and
// Can't with a tapped trio, colourings and counts, the avoidance game, the
// playground, hints, Undo and Restart, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, restart} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {triosMechanics, trios, third, isTrio, triosIn, capsOfSize, blockedSet, blocker, splits, designs, cardName, tileName, throughPairs, appClaim, moverWins, winningClaims, opposite, replay, layout} from '../dist/families/trios/trios.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = await loadPack();
const json = JSON.parse(await readFile(new URL('../dist/families/trios/trios.json', import.meta.url), 'utf8'));
const byId = id => json.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const mech = triosMechanics.trios;
// View state (Can't mode, picks, a lit pair) starts fresh in each view unless kept.
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
// Tiles: shape + 3 × fill.
const T = {CO: 0, TO: 1, SO: 2, CH: 3, TH: 4, SH: 5, CF: 6, TF: 7, SF: 8};

test('cards, trios and third cards', () => {
  assert.equal(trios(2).length, 12);
  assert.equal(trios(3).length, 117);
  assert.equal(tileName(T.TH), 'striped triangle');
  assert.equal(cardName(3, T.SF + 18), 'three solid squares');
  assert.equal(cardName(3, T.CO), 'one open circle');
  assert.equal(cardName(4, T.CO + 9 + 27 * 2), 'two blue open circles');
  assert.equal(third(2, T.CO, T.CH), T.CF, 'same shape: the missing fill');
  assert.equal(third(2, T.CH, T.TF), T.SO, 'both differ: the missing shape and the missing fill');
  assert.ok(isTrio(2, T.CO, T.TH, T.SF));
  assert.ok(!isTrio(2, T.CO, T.TO, T.SH));
  assert.deepEqual(throughPairs(T.CO).length, 4);
  assert.equal(splits().length, 4);
  assert.equal(capsOfSize(2, 4).length, 54);
  assert.equal(capsOfSize(2, 5).length, 0);
  assert.deepEqual(triosIn(2, [T.CO, T.TO, T.SO, T.CH]), [[T.CO, T.TO, T.SO]]);
  assert.deepEqual(blocker(2, [T.CO, T.TO], T.SO), [T.CO, T.TO]);
  assert.equal(blockedSet(2, [T.CO, T.TO, T.CH, T.TH]).size, 5, 'four tiles with no trio rule out the other five');
  assert.equal(designs(2, 'mono').length, 0);
  assert.equal(designs(3, 'card').length, 162);
});

test('third tile: a wrong tap shows the rule row by row; the right tap moves on', () => {
  const p = byId('trios-01'), [x, y] = p.parameters.pairs[0];
  let a = play(p, freshAttempt(p), {type: 'pick', card: T.SF});
  assert.equal(a.board.miss, T.SF);
  const html = view(p, a);
  assert.match(html, /aria-label="shapes two the same"/, 'circle, circle, square: two the same');
  assert.match(html, /aria-label="fills all different"/, 'open, striped, solid');
  assert.match(html, /ts-card[^"]*missed/);
  assert.equal(move(p, a, {type: 'pick', card: x}), null, 'a ringed tile is not a choice');
  a = play(p, a, {type: 'pick', card: third(2, x, y)});
  assert.deepEqual(a.board, {round: 1, miss: null});
  assert.match(view(p, a), /ts-shelf/, 'the trio made goes on the shelf');
  assert.match(nextHint(p, freshAttempt(p)).text, /^Circle and circle: circle; open and striped: solid\. Tap the solid circle\.$/);
  for (const pair of p.parameters.pairs.slice(1)) a = play(p, a, {type: 'pick', card: third(2, ...pair)});
  assert.ok(isSolved(p, a.board));
});

test('through one tile: pairs make trios, found already, there is another, That’s all; Undo keeps finds', () => {
  const p = byId('trios-02'), c = p.parameters.centre;
  let a = play(p, freshAttempt(p), {type: 'pick', card: T.CH}, {type: 'pick', card: T.CF});
  assert.deepEqual(a.board.found, ['3.6']);
  assert.deepEqual(a.board.pick, []);
  const again = play(p, a, {type: 'pick', card: T.CF}, {type: 'pick', card: T.CH});
  assert.equal(again.board.told, 'again');
  assert.match(view(p, again), /Found already\./);
  const wrong = play(p, a, {type: 'pick', card: T.TO}, {type: 'pick', card: T.TH});
  assert.deepEqual(wrong.board.pick, [T.TO, T.TH], 'not a trio: both stay picked, marked');
  assert.match(view(p, wrong), /ts-strip/);
  assert.deepEqual(play(p, wrong, {type: 'pick', card: T.SO}).board.pick, [T.SO], 'a third tap starts a new pair');
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.told, 'more');
  assert.match(view(p, a), /There is another\./);
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all waits for a new trio');
  assert.match(view(p, a), /class="secondary ts-button all"[^>]*disabled/);
  const kept = mech.carry(p, a.board, undo(a).board);
  assert.equal(kept.told, 'more', 'Undo keeps the answer');
  assert.deepEqual(kept.found, ['3.6']);
  for (const k of throughPairs(c).filter(k => k !== '3.6')) a = play(p, a, ...k.split('.').map(Number).map(card => ({type: 'pick', card})));
  assert.equal(a.board.told, null);
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  const html = view(p, freshAttempt(p));
  assert.doesNotMatch(html, /\b[0-4] of 4\b|ts-count/, 'no found-count');
});

test('every split: trays fill in turn, a split is kept and the trays empty, wrong trays stay', () => {
  const p = byId('trios-04');
  const place = (...cards) => cards.map(card => ({type: 'place', card}));
  let a = play(p, freshAttempt(p), ...place(T.CO, T.TO, T.SO, T.CH, T.TH, T.SH));
  assert.deepEqual(a.board.trays, [[T.CO, T.TO, T.SO], [T.CH, T.TH, T.SH], []]);
  assert.match(view(p, a), /Tray 1, a trio/);
  a = play(p, a, ...place(T.CF, T.TF, T.SF));
  assert.equal(a.board.found.length, 1);
  assert.deepEqual(a.board.trays, [[], [], []]);
  let b = play(p, a, ...place(T.CO, T.TO, T.CH));
  assert.match(view(p, b), /Tray 1, not a trio/);
  b = play(p, b, {type: 'lift', card: T.CH});
  assert.deepEqual(b.board.trays, [[T.CO, T.TO], [], []]);
  assert.equal(move(p, b, {type: 'lift', card: T.SF}), null, 'only a tile in a tray can come out');
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.told, 'more');
  for (const s of splits()) a = play(p, a, ...place(...s.flat()));
  assert.equal(a.board.found.length, 4, 'the fill split again is not kept twice');
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
});

test('four with no trio: Can’t after a full try is refused, and the refusal survives Undo and Restart', () => {
  const p = byId('trios-03');
  let a = play(p, freshAttempt(p), {type: 'pick', card: T.CO}, {type: 'pick', card: T.TO}, {type: 'pick', card: T.SO});
  assert.equal(move(p, a, {type: 'cant', trio: [T.CO, T.TO, T.SO]}), null, 'Can’t needs a full try');
  assert.match(view(p, a), /class="secondary ts-button ts-cant"[^>]*disabled/);
  a = play(p, a, {type: 'pick', card: T.CH});
  let html = view(p, a);
  assert.doesNotMatch(html, /ts-line bad|in-bad/, 'the trio is the child’s to find: not drawn');
  assert.match(html, /There is a trio\./, 'but reported');
  assert.doesNotMatch(html, /A trio: /, 'and not named to a screen reader either');
  a = play(p, a, {type: 'cant', trio: [T.SO, T.CO, T.TO]});
  assert.equal(a.board.told, 'way');
  assert.match(view(p, a, true), /There is a way\./, 'said right after the claim');
  assert.equal(move(p, a, {type: 'cant', trio: [T.CO, T.TO, T.SO]}), null);
  const back = {...undo(a), board: mech.carry(p, a.board, undo(a).board)};
  assert.equal(back.board.told, 'way', 'Undo keeps the refusal');
  assert.doesNotMatch(view(p, back, true), /There is a way\./, 'but does not say it again');
  assert.match(view(p, back, true), /class="secondary ts-button ts-cant"[^>]*disabled/, 'Can’t stays off');
  assert.equal(mech.carryOnRestart(p, a.board, restart(p, a).board).told, 'way', 'Restart keeps it too');
  const later = play(p, a, {type: 'pick', card: T.CH}, {type: 'pick', card: T.TH});
  assert.equal(later.board.told, 'way');
  html = view(p, later, true);
  assert.match(html, /There is a trio\./, 'a later full try with a trio gets the usual note');
  assert.doesNotMatch(html, /There is a way\./);
  a = play(p, a, {type: 'pick', card: T.SO}, {type: 'pick', card: T.TH});
  assert.ok(isSolved(p, a.board), 'open and striped circles and triangles');
});

test('five with no trio: hints try first, then Can’t with the trio tapped; the dishes are drawn', () => {
  const p = byId('trios-05');
  const first = nextHint(p, freshAttempt(p));
  assert.equal(first.action.type, 'pick', 'the first hint is a try, not Can’t');
  let a = play(p, freshAttempt(p), ...[T.CO, T.TO, T.CH, T.TH].map(card => ({type: 'pick', card})));
  const h = nextHint(p, a);
  assert.equal(h.action.type, 'pick');
  a = play(p, a, {type: 'pick', card: T.SF});
  const trio = triosIn(2, a.board.chosen)[0];
  assert.deepEqual(nextHint(p, a).action, {type: 'cant', trio});
  assert.match(nextHint(p, a).text, /make a trio\.$/, 'the reason; the second level marks Can’t');
  assert.doesNotMatch(nextHint(p, a).text, /Can’t/);
  const wrong = play(p, a, {type: 'cant', trio: [T.CO, T.TO, T.CH]});
  assert.equal(wrong.board.told, 'not');
  assert.match(view(p, wrong), /Not a trio\./);
  assert.equal(move(p, wrong, {type: 'cant', trio: [T.CO, T.TO, T.CH]}), wrong, 'a second wrong claim is judged and refused again');
  const outside = play(p, a, {type: 'cant', trio: [T.CO, T.TO, T.SO]});
  assert.equal(outside.board.told, 'out', 'a real trio, but not all in the five');
  assert.match(view(p, outside), /Not a trio in your five\./);
  // Undo leaves Can't mode and its picks.
  mech.reset(p);
  mech.ui(p, {claiming: true});
  mech.ui(p, {pick: trio[0]});
  const undone = {...undo(wrong), board: mech.carry(p, wrong.board, undo(wrong).board)};
  const undoneHtml = view(p, undone, true);
  assert.doesNotMatch(undoneHtml, /Tap the trio\.|claim-picked/, 'Undo clears Can’t mode and its picks');
  assert.doesNotMatch(undoneHtml, /aria-pressed="true"[^>]*>Can’t/);
  // Can't mode: the first two taps are view state; the third sends the claim.
  mech.reset(p);
  mech.ui(p, {claiming: true});
  let html = view(p, a, true);
  assert.match(html, /Tap the trio\./);
  assert.doesNotMatch(html, /claimable|ts-card[^"]*hinted/, 'nothing marks the tiles to tap');
  assert.match(html, /aria-label="Open square\. Pick for Can’t"/, 'a tile not chosen can be tapped too');
  assert.match(html, /aria-pressed="true"[^>]*>Can’t/);
  mech.ui(p, {pick: trio[0]});
  mech.ui(p, {pick: trio[1]});
  html = view(p, a, true);
  assert.ok(html.includes(`data-move="${JSON.stringify({type: 'cant', trio: [trio[0], trio[1], trio[2]]}).replaceAll('"', '&quot;')}"`), 'the third tile sends the claim');
  a = play(p, a, {type: 'cant', trio});
  assert.ok(isSolved(p, a.board));
  html = view(p, a);
  assert.match(html, /ts-line bad/, 'the claimed trio is drawn once the claim is right');
  assert.match(html, /ts-dishes/);
  assert.match(html, /The open square completes 1 pair/);
  assert.match(html, /6 pairs complete inside the five/, 'two trios: ten pairs, four in dishes, six inside');
});

test('nine of 27: dimmed cards can’t be chosen and light the pair that rules them out', () => {
  const p = byId('trios-09');
  let a = play(p, freshAttempt(p), {type: 'pick', card: 0}, {type: 'pick', card: 1});
  assert.equal(move(p, a, {type: 'pick', card: 2}), null, 'the third card of two chosen is dimmed');
  mech.reset(p);
  mech.ui(p, {why: 2});
  const html = view(p, a, true);
  assert.match(html, /pair-lit/);
  assert.match(html, /aria-label="One square, ruled out by two chosen cards\. Show why"|ruled out by two chosen cards\. Show why/);
  assert.match(html, /ts-strip/, 'the rule rows for the three');
  const ten = byId('trios-10');
  const stuck = freshAttempt(ten);
  assert.equal(stuck.board.chosen.length, 8);
  assert.equal(blockedSet(3, stuck.board.chosen).size, 19, 'every other card is dimmed');
  assert.match(view(ten, stuck), /Every other card is ruled out\./);
  assert.equal(nextHint(ten, stuck).action.type, 'pick');
  assert.ok(stuck.board.chosen.includes(nextHint(ten, stuck).action.card), 'the hint takes a card out');
});

test('colours: two colours fail with a trio tapped, three work; counts draw cards', () => {
  const p = byId('trios-07'), paint = (list, a = freshAttempt(p)) => play(p, a, ...list.map((value, tile) => ({type: 'paint', tile, value})));
  let a = paint([0, 0, 1, 0, 0, 1, 1, 1, 0]);
  assert.equal(move(p, freshAttempt(p), {type: 'cant', trio: [0, 1, 2]}), null, 'Can’t once every tile is coloured');
  const yellow = trios(2).find(t => t.every(i => a.board.paint[i] === 0));
  a = play(p, a, {type: 'cant', trio: yellow});
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /ts-classes/);
  assert.match(view(p, a), /5 yellow tiles/);
  const three = byId('trios-08');
  const good = designs(3, 'mono')[0];
  let b = play(three, freshAttempt(three), ...good.map((value, tile) => ({type: 'paint', tile, value})));
  assert.ok(isSolved(three, b.board));
  const counts = byId('trios-11');
  const c = freshAttempt(counts);
  assert.equal(nextHint(counts, c).action.type, 'paint');
  assert.match(view(counts, c), /aria-label="One open circle\. Make it two shapes"/);
  assert.match(view(counts, c), /12 trios are marked/);
  assert.equal(move(counts, c, {type: 'cant', trio: [0, 1, 2]}), null, 'no Can’t here');
});

test('the game: the app answers at once; the opposite wins; a losing turn is taken back by the hints', () => {
  const p = byId('trios-12');
  let a = play(p, freshAttempt(p), {type: 'claim', tile: T.TH});
  assert.equal(a.board.turns.length, 2);
  const x = a.board.turns[1];
  assert.equal(x, appClaim(1 << T.TH, 0));
  assert.ok(winningClaims(1 << T.TH, 1 << x).includes(opposite(T.TH, x)), 'the opposite wins');
  assert.equal(nextHint(p, a).action.tile, opposite(T.TH, x));
  assert.match(nextHint(p, a).text, /makes a trio with your first tile and their/);
  // A claim that loses: the hint (not an automatic message) takes it back.
  const bad = [...Array(9).keys()].filter(t => t !== T.TH && t !== x).find(t => { const b = move(p, a, {type: 'claim', tile: t}); const s = replay(b.board.turns); return !s.over && !moverWins(s.you, s.app); });
  assert.notEqual(bad, undefined, 'some claim loses');
  const b = play(p, a, {type: 'claim', tile: bad});
  assert.deepEqual(nextHint(p, b), {type: 'move', action: {type: 'back'}, text: 'From here the app can always win. Undo your last turn.'});
  assert.deepEqual(play(p, b, {type: 'back'}).board.turns, a.board.turns);
  assert.doesNotMatch(view(p, b), /can always win/, 'nothing tells the child until they ask');
  let w = freshAttempt(p);
  for (let k = 0; k < p.solution.turns.length; k += 2) w = play(p, w, {type: 'claim', tile: p.solution.turns[k]});
  assert.ok(isSolved(p, w.board));
  assert.match(view(p, w), /They own a trio\./);
});

test('the playground: three decks, dimmed cards, Clear, never solved', () => {
  const p = json.puzzles.find(x => x.band === 'playground');
  let a = play(p, freshAttempt(p), {type: 'pick', card: 0}, {type: 'pick', card: 1});
  assert.equal(move(p, a, {type: 'pick', card: 2}), null);
  a = play(p, a, {type: 'deck', deck: 4});
  assert.deepEqual(a.board, {deck: 4, chosen: []});
  a = play(p, a, {type: 'pick', card: 80});
  assert.match(view(p, a), /ts-board ts-deck-4/);
  a = play(p, a, {type: 'clear'});
  assert.equal(isSolved(p, a.board), false);
  assert.equal(nextHint(p, a).type, 'done');
  assert.equal(mech.noHint(p), true);
});

test('forged saves are rejected', () => {
  const cap = byId('trios-05'), b = freshAttempt(cap).board;
  assert.equal(validBoard(cap, {...b, chosen: [0, 1, 2], claim: [0, 1, 2]}), false, 'a claim before a full try');
  assert.ok(validBoard(cap, {...b, chosen: [0, 1, 2, 3, 4], claim: [0, 1, 2]}), 'a claim on a full try with that trio');
  assert.equal(validBoard(byId('trios-03'), {...freshAttempt(byId('trios-03')).board, chosen: [0, 1, 2, 3], claim: [0, 1, 2]}), false, 'a claim where four can be done');
  assert.equal(validBoard(cap, {...b, told: 'way'}), false, 'a refusal where five can’t be done');
  const through = byId('trios-02');
  assert.equal(validBoard(through, {pick: [], found: ['1.3'], told: null, done: false}), false);
  assert.equal(validBoard(through, {pick: [], found: ['1.2'], told: 'again', done: true}), false, '“found already” with That’s all done');
  assert.ok(validBoard(through, {pick: [], found: ['1.2'], told: 'again', done: false}), '“found already” mid-search');
  const split = byId('trios-04'), one = splits().map(s => s.map(t => [...t].sort((x, y) => x - y).join('.')).sort().join('|'))[0];
  assert.equal(validBoard(split, {trays: [[], [], []], found: [one], told: 'again', done: true}), false, 'a split “found already” with That’s all done');
  assert.ok(validBoard(split, {trays: [[], [], []], found: [one], told: 'again', done: false}));
  assert.equal(validBoard(cap, {...b, told: 'out'}), false, 'a trio outside the try before a full try');
  assert.equal(validBoard(byId('trios-12'), {turns: [0, 0]}), false);
  assert.equal(validBoard(byId('trios-09'), {chosen: [0, 1, 2], claim: null, told: null}), false, 'a trio with dimming');
});

test('every puzzle renders a board, with one short objective', () => {
  for (const p of json.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /ts-puzzle/, p.id);
    assert.match(html, /ts-board/, p.id);
    assert.ok(p.visibleObjective.length < 60, p.id);
  }
  const L = layout(2, byId('trios-01').parameters.order);
  assert.equal(L.pos.length, 9);
  for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) assert.ok(Math.hypot(L.pos[i][0] - L.pos[j][0], L.pos[i][1] - L.pos[j][1]) >= L.w, 'ring tiles do not overlap');
});

test('taps are fast: hints and renders well under 100 ms', () => {
  // The one-time searches (caps, colourings, the game tree) run once per
  // puzzle and are memoised; a tap after that only reads them. Medians keep
  // the check steady on a busy machine.
  const median = list => [...list].sort((x, y) => x - y)[Math.floor(list.length / 2)];
  const first = [], taps = [];
  for (const p of json.puzzles.filter(x => x.band !== 'playground')) {
    let a = freshAttempt(p);
    let t0 = performance.now();
    nextHint(p, a);
    first.push(performance.now() - t0);
    for (let k = 0; k < 12 && !isSolved(p, a.board); k++) {
      t0 = performance.now();
      const h = nextHint(p, a);
      a = move(p, a, h.action);
      view(p, a);
      taps.push(performance.now() - t0);
    }
  }
  assert.ok(Math.max(...first) < 400, `the slowest first search takes ${Math.round(Math.max(...first))} ms`);
  assert.ok(median(taps) < 25, `a tap takes ${median(taps).toFixed(1)} ms (median)`);
});
