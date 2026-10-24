// Portal shields (Week 70): shots and where they stop, the halfway theorem in
// three rooms, fewest shields, shots that cross, Fewest and Can't with the
// shots tapped as their proof, judged at the last shot, refusals that survive Undo, hints, the
// playground, forged saves, rendering, and the portal board's wider tap disc.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {surfaceOf, roomBoard, planeBoard} from '../dist/portal-board.js';
import {ROOM, fate, isShot, endOf, shotAt, shotClasses, escaping, fewestSets, crossings, meet, targetWords, windowFor, targetsIn, extendPicks, hintPool} from '../dist/families/shields/shields.js';
import {loadPack} from '../scripts/packs.mjs';

const shields = JSON.parse(await readFile(new URL('../dist/families/shields/shields.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => shields.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const put = (...crosses) => crosses.map(at => ({type: 'shield', at}));
const tap = (p, ...dirs) => dirs.map(d => ({type: 'pick', at: endOf(p.parameters, d)}));
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
// The app's Undo: the engine's, then the mechanic's carry (dist/main.js).
const undoApp = (p, a) => { const next = undo(a); return {...next, board: mechanicFor(p).carry(p, a.board, next.board)}; };
const C = {T: [4, 4]}, NONE = {T: null}, EDGE = {T: [4, 0]};

test('a shot stops at its first T, or back at S, and passes only crosses on its line', () => {
  assert.deepEqual(fate(C.T, [1, 1]), {end: 'T', t: 4, crosses: ['1,1', '2,2', '3,3']});
  assert.deepEqual(fate(C.T, [1, 3]).crosses, ['1,3', '2,6', '3,1']);
  assert.equal(fate(C.T, [1, 0]).end, 'S', 'along the bottom edge it never meets the centre');
  assert.deepEqual(fate(null, [1, 0]), {end: 'S', t: 8, crosses: ['1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0']});
  assert.deepEqual(fate(EDGE.T, [1, 2]).crosses, ['1,2', '2,4', '3,6']);
  assert.ok(isShot(C, [5, 3]) && !isShot(C, [1, 2]) && !isShot(C, [2, 2]));
  assert.deepEqual(endOf(C, [5, 3]), [20, 12]);
  // A tap on a far copy names the shot along it, which may stop sooner.
  assert.deepEqual(shotAt(C, [12, 12]), [1, 1]);
  assert.deepEqual(endOf(C, shotAt(C, [12, 12])), [4, 4]);
  assert.equal(shotAt(C, [8, 8]), null, 'an S is not a T');
  assert.equal(shotAt(C, [4 + 8 * 9, 4]), null, 'too far to tap');
  assert.deepEqual(shotAt(NONE, [8, 0]), [1, 0]);
});

test('the halfway crosses stop every shot, in all three rooms, and only they do', () => {
  assert.equal(shotClasses(C).length, 16);
  assert.equal(shotClasses(NONE).length, 48);
  assert.equal(shotClasses(EDGE).length, 16);
  for (const [q, mids] of [[C, [[2, 2], [2, 6], [6, 2], [6, 6]]], [NONE, [[0, 4], [4, 0], [4, 4]]], [EDGE, [[2, 0], [2, 4], [6, 0], [6, 4]]]]) {
    assert.deepEqual(escaping(q, mids), []);
    const {k, sets} = fewestSets(q);
    assert.equal(k, mids.length);
    assert.deepEqual(sets, [mids]);
    // Long shots too: every primitive direction up to 15.
    for (let a = -15; a <= 15; a++) for (let b = -15; b <= 15; b++) if (isShot(q, [a, b])) assert.ok(fate(q.T, [a, b]).crosses.some(c => mids.some(m => `${m}` === c)), `${a},${b}`);
  }
  // Three shields never do: the card's finite check leaves only the midpoints.
  const card = {T: [4, 4], shots: [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 3], [3, 1], [3, -1], [5, 1]]};
  assert.deepEqual(fewestSets(card), {k: 4, sets: [[[2, 2], [2, 6], [6, 2], [6, 6]]]});
});

test('two shots cross where one is a whole number of rooms from the other', () => {
  // The corner shots meet only at S and T.
  for (const d of [[-1, 1], [1, -1], [-1, -1]]) assert.equal(meet(C, [1, 1], d), false);
  // The steep shots cross twice, at (1, 3) and (3, 1).
  assert.deepEqual(crossings(C, [1, 3], [3, 1]).map(({t}) => t), [1, 3]);
  // Opposite shots along one line: they overlap only when together longer than a room.
  assert.equal(meet(C, [1, 1], [-1, -1]), false);
  assert.equal(meet(NONE, [1, 0], [-1, 0]), true);
  assert.equal(meet(EDGE, [1, 0], [-1, 0]), false);
  // The return room's three shots share only S; the diagonals cross at the centre.
  assert.equal(meet(NONE, [1, 0], [0, 1]) || meet(NONE, [1, 0], [1, 1]) || meet(NONE, [0, 1], [1, 1]), false);
  assert.equal(meet(NONE, [1, 1], [-1, 1]), true);
  assert.equal(meet(EDGE, [1, 2], [-1, 2]), false);
});

test('the puzzles’ answers and certificates', () => {
  const table = {'shields-01': [2, 6], 'shields-02': [4, 81], 'shields-03': [2, 2], 'shields-04': [4, 9], 'shields-05': [3, 21], 'shields-06': [4, 1], 'shields-07': [4, 1], 'shields-08': [2, 1], 'shields-09': [3, 1], 'shields-10': [4, 1]};
  for (const p of shields.puzzles.filter(p => p.band !== 'playground')) {
    const q = p.parameters, {k, sets} = fewestSets(q);
    assert.deepEqual([k, sets.length], table[p.id], p.id);
    const cert = q.certificate;
    assert.equal(cert.length, q.mode === 'budget' && k > q.budget ? q.budget + 1 : k, `${p.id}: certificate size`);
    for (let x = 0; x < cert.length; x++) for (let y = x + 1; y < cert.length; y++) assert.equal(meet(q, cert[x], cert[y]), false, `${p.id}: ${cert[x]} ${cert[y]}`);
    if (q.shots) for (const d of cert) assert.ok(q.shots.some(s => `${s}` === `${d}`));
  }
});

test('shields toggle on crosses, never on S or T, and never past a budget', () => {
  const p = byId('shields-01'), a = freshAttempt(p);
  const one = play(p, a, ...put([1, 3]));
  assert.deepEqual(one.board.shields, [[1, 3]]);
  assert.deepEqual(play(p, one, ...put([1, 3])).board.shields, []);
  assert.deepEqual(play(p, a, ...put([3, 1], [1, 1])).board.shields, [[1, 1], [3, 1]], 'kept in order');
  for (const at of [[0, 0], [4, 4], [8, 0], [-1, 2], [1.5, 1]]) assert.equal(move(p, a, {type: 'shield', at}), null, `${at}`);
  const b = byId('shields-07'), full = play(b, freshAttempt(b), ...put([1, 1], [1, 3], [3, 1]));
  assert.equal(move(b, full, {type: 'shield', at: [5, 5]}), null, 'three is the budget');
  assert.ok(move(b, full, {type: 'shield', at: [1, 1]}), 'taking one off is fine');
});

test('Fewest: refused while a shot gets through; a claim is judged only at its last shot', () => {
  const p = byId('shields-01'), a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'fewest'}), null, 'nothing to claim yet');
  const open = play(p, a, ...put([1, 1]));
  assert.equal(move(p, open, {type: 'fewest'}), null, 'the steep shots get through');
  // Three shields stop all three shots, but two can. Pressing Fewest says nothing yet.
  const three = play(p, open, ...put([1, 3], [3, 1]));
  const over = play(p, three, {type: 'fewest'});
  assert.equal(over.board.claim, 'fewest');
  assert.equal(over.board.note, null, 'pressing Fewest is not judged');
  assert.match(view(p, over), /Tap 3 shots that cross only at S and T\./);
  const two1 = play(p, over, ...tap(p, [1, 3], [3, 1]));
  assert.equal(two1.board.note, null, 'crossing shots before the last are not judged');
  const told = play(p, two1, ...tap(p, [1, 1]));
  assert.equal(told.board.note, 'fewer');
  assert.equal(told.board.claim, null);
  assert.equal(move(p, told, {type: 'fewest'}), null, 'one refusal at three');
  assert.match(view(p, told), /Fewer can do it\./);
  // Undo takes back the last shot, never the refusal, and the claim stays closed.
  const back = undoApp(p, told);
  assert.equal(back.board.fewer, 3);
  assert.equal(back.board.claim, null);
  assert.equal(move(p, back, {type: 'fewest'}), null, 'still refused at three after Undo');
  // Two shields: Fewest, then two shots sharing only S and T. Two that cross
  // are named, both crossings ringed, and the shots cleared, through Undo too.
  const two = play(p, back, ...put([3, 1]));
  const claim = play(p, two, {type: 'fewest'});
  assert.equal(claim.board.claim, 'fewest');
  assert.equal(move(p, claim, {type: 'shield', at: [5, 5]}), null, 'crosses rest during a claim');
  assert.match(view(p, claim), /Tap 2 shots that cross only at S and T\./);
  const first = play(p, claim, ...tap(p, [1, 3]));
  const clash = play(p, first, ...tap(p, [3, 1]));
  assert.deepEqual(clash.board.note, {cross: [[1, 3], [3, 1]]});
  assert.deepEqual(clash.board.picks, []);
  assert.match(view(p, clash), /Those two cross\./);
  assert.match(view(p, clash), /ps-clash/);
  assert.deepEqual(undoApp(p, clash).board.picks, [], 'Undo doesn’t bring crossing shots back');
  const done = play(p, clash, ...tap(p, [1, 3], [1, 1]));
  assert.ok(isSolved(p, done.board));
  assert.match(view(p, done), /ps-ring k1/);
  // Fewest again before finishing goes back to the shields.
  assert.equal(play(p, first, {type: 'fewest'}).board.claim, null);
  // Only the copy where a shot stops can be tapped, and only drawn shots.
  assert.equal(move(p, claim, {type: 'pick', at: [12, 12]}), null);
  assert.equal(move(p, claim, {type: 'pick', at: endOf(p.parameters, [-1, -1])}), null, 'not drawn here');
});

test('Can’t: only after a try; right with three, refused for good with four, at the last shot', () => {
  const four = byId('shields-06'), three = byId('shields-07');
  assert.equal(move(three, freshAttempt(three), {type: 'cant'}), null, 'a try first');
  assert.equal(nextHint(three, freshAttempt(three)).action.type, 'shield', 'the first hint is a try');
  const tried = play(three, freshAttempt(three), ...put([2, 2]));
  const h = nextHint(three, tried);
  assert.equal(h.action.type, 'cant');
  assert.match(h.text, /corner shots cross only at S and T/);
  const claim = play(three, tried, {type: 'cant'});
  assert.match(view(three, claim), /Tap 4 shots that cross only at S and T\./);
  const done = play(three, claim, ...tap(three, [1, 1], [-1, 1], [1, -1], [-1, -1]));
  assert.ok(isSolved(three, done.board));
  // With four shields there is a way: Can't is told so at its last shot, and Undo doesn't bring it back.
  const t4 = play(four, freshAttempt(four), ...put([1, 1]));
  const claim4 = play(four, t4, {type: 'cant'});
  assert.equal(claim4.board.note, null, 'pressing Can’t is not judged');
  assert.match(view(four, claim4), /Tap 5 shots that cross only at S and T\./);
  const told = play(four, claim4, ...tap(four, [1, 1], [-1, 1], [1, -1], [-1, -1], [1, 3]));
  assert.equal(told.board.note, 'way');
  assert.equal(told.board.claim, null);
  assert.match(view(four, told), /There is a way\./);
  const back = undoApp(four, told);
  assert.equal(back.board.way, true);
  assert.equal(back.board.claim, null);
  assert.equal(move(four, back, {type: 'cant'}), null);
  assert.ok(isSolved(four, play(four, freshAttempt(four), ...put([2, 2], [2, 6], [6, 2], [6, 6])).board));
});

test('hints alone solve every puzzle, from fresh and after wrong moves', () => {
  for (const p of shields.puzzles.filter(p => p.band !== 'playground')) {
    for (const start of [freshAttempt(p), play(p, freshAttempt(p), ...put([0, 1], [7, 7]))]) {
      let a = start, n = 0;
      while (!isSolved(p, a.board) && n++ < 40) { const h = nextHint(p, a); assert.equal(h.type, 'move', `${p.id}: ${h.text}`); a = play(p, a, h.action); }
      assert.ok(isSolved(p, a.board), p.id);
    }
  }
  // In a claim, a crossing choice is dropped by the hints.
  const p = byId('shields-05'), q = p.parameters;
  const claim = play(p, freshAttempt(p), ...put(...fewestSets(q).sets[0]), {type: 'fewest'});
  const odd = play(p, claim, ...tap(p, [1, 3]));
  assert.ok(extendPicks(q, odd.board.picks, 3) === null || nextHint(p, odd).action.type === 'pick');
  assert.equal(hintPool({T: [4, 4], certificate: [[1, 1]]})[0].join(), '1,1');
});

test('the playground: three rooms, shots aimed at far copies stop at the first target or a shield', () => {
  const p = byId('shields-playground'), a = freshAttempt(p), m = mechanicFor(p);
  assert.equal(m.noHint(p), true);
  assert.equal(nextHint(p, a).type, 'done');
  const aimed = play(p, a, {type: 'aim', at: [20, 20]});
  assert.match(view(p, aimed), /class="ps-shot escape" x1="0" y1="0" x2="4" y2="-4"/, 'stops at the first T');
  const stopped = play(p, aimed, ...put([2, 2]));
  assert.match(view(p, stopped), /class="ps-shot stopped" x1="0" y1="0" x2="2" y2="-2"/);
  const none = play(p, a, {type: 'room', room: 'none'});
  assert.ok(move(p, none, {type: 'aim', at: [8, 0]}));
  assert.equal(move(p, none, {type: 'aim', at: [4, 4]}), null, 'no T in this room');
  assert.equal(move(p, a, {type: 'fewest'}), null);
  let many = a;
  for (const at of [[4, 4], [-4, 4], [4, -4], [-4, -4], [12, 4], [4, 12], [-12, 4], [4, -12], [12, -4]]) many = play(p, many, {type: 'aim', at});
  assert.equal(many.board.aims.length, 8, 'the oldest aim goes');
  assert.ok(!isSolved(p, many.board));
});

test('forged saves are rejected; an open claim is not judged', () => {
  const p = byId('shields-01'), b = freshAttempt(p).board;
  assert.ok(validBoard(p, {...b, shields: [[1, 1], [1, 3], [3, 1]], claim: 'fewest', picks: [[1, 3], [3, 1]]}), 'too many shields, two crossing shots, not yet judged');
  for (const board of [
    {...b, extra: 1}, {...b, shields: [[1, 1], [1, 1]]}, {...b, shields: [[3, 1], [1, 1]]}, {...b, shields: [[4, 4]]}, {...b, shields: [[0, 0]]},
    {...b, claim: 'fewest'}, {...b, shields: [[1, 1], [1, 3], [3, 1]], claim: 'fewest', picks: [[1, 1], [1, 3], [3, 1]]}, {...b, shields: [[1, 1], [1, 3]], claim: 'fewest', picks: [[1, 3], [3, 1]]},
    {...b, shields: [[1, 1], [1, 3]], claim: 'fewest', picks: [[1, 3]], note: {cross: [[1, 3], [3, 1]]}},
    {...b, shields: [[1, 1], [1, 3]], claim: 'fewest', picks: [[1, 1], [1, 3], [3, 1]]}, {...b, picks: [[1, 1]]}, {...b, note: 'fewer'}, {...b, fewer: 2}, {...b, way: true},
    {...b, claim: 'cant', shields: [[1, 1]]}, {...b, shields: [[1, 1], [1, 3]], claim: 'fewest', picks: [[-1, -1]]}
  ]) assert.equal(validBoard(p, board), false, JSON.stringify(board));
  const t = byId('shields-07'), tb = freshAttempt(t).board;
  assert.ok(validBoard(t, {...tb, shields: [[2, 2]], claim: 'cant', picks: [[1, 3], [3, 1]]}), 'crossing shots while choosing');
  for (const board of [{...tb, shields: [[1, 1], [1, 3], [3, 1], [3, 3]]}, {...tb, claim: 'cant'}, {...tb, way: true}, {...tb, shields: [[2, 2]], claim: 'cant', picks: [[1, 1], [1, 3], [3, 1], [-1, -1]]}]) assert.equal(validBoard(t, board), false, JSON.stringify(board));
  const g = byId('shields-playground'), gb = freshAttempt(g).board;
  for (const board of [{...gb, room: 'moon'}, {...gb, aims: [[1, 1]]}, {...gb, claim: 'fewest'}]) assert.equal(validBoard(g, board), false, JSON.stringify(board));
});

test('every puzzle renders both views; the goal is one line with no count; crosses are the controls', () => {
  for (const p of shields.puzzles) {
    const a = freshAttempt(p), html = view(p, a), q = p.parameters;
    assert.match(html, /ps-puzzle/);
    assert.match(html, /pb-board pb-room/);
    assert.match(html, /pb-board pb-plane/);
    // 63 crosses (61 with T) are buttons, and their seam copies too; no discs for shields.
    const room = html.slice(html.indexOf('pb-room'), html.indexOf('pb-plane'));
    assert.equal(new Set([...room.matchAll(/data-pb-point="(o,\d,\d)" data-pb-view="room" role="button"/g)].map(m => m[1])).size, q.mode === 'playground' ? 62 : q.T ? 62 : 63, p.id);
    assert.doesNotMatch(html, /\b\d+ of \d+ shields\b|slot/i);
    if (p.visibleObjective) assert.ok(html.includes(p.visibleObjective), `${p.id}: the one objective`);
    if (q.mode === 'fewest') assert.doesNotMatch(p.visibleObjective, /\d/);
  }
  // Hint level 2 marks the cross to tap.
  const p = byId('shields-01');
  assert.match(view(p, {...freshAttempt(p), hintLevel: 2}), /pb-point hinted act" data-pb-point="o,1,1"/);
  // A full budget leaves the free crosses quiet.
  const t = byId('shields-07'), full = play(t, freshAttempt(t), ...put([1, 1], [1, 3], [3, 1]));
  assert.doesNotMatch(view(t, full), /data-pb-point="o,5,5" data-pb-view="room" role="button"/);
  assert.match(view(t, full), /data-pb-point="o,1,1" data-pb-view="room" role="button"/);
});

test('the window holds every shot drawn; copies to tap sit inside it', () => {
  assert.deepEqual(windowFor([]), [-2, -2, 1, 1]);
  const w = windowFor([[20, 12]]);
  assert.ok(w[2] * 8 + 8 > 20 && w[3] * 8 + 8 > 12);
  assert.equal(w[2] - w[0], w[3] - w[1], 'square');
  assert.equal(targetsIn(C, [-2, -2, 1, 1]).length, 16);
  assert.equal(targetsIn(NONE, [-2, -2, 1, 1]).length, 8);
  assert.equal(targetWords(C, [4, 4]), 'T in the shaded copy');
  assert.equal(targetWords(C, [-4, 12]), 'T in the copy 1 left, 1 up');
  assert.equal(targetWords(NONE, [8, 8]), 'the S at the top right corner of the shaded copy');
  assert.equal(targetWords(EDGE, [-4, 8]), 'the T on the bottom edge of the copy 1 left, 1 up');
});

test('the portal board widens a cross’s tap disc when asked, keeps .42 otherwise, and leaves out a point whose look is false', () => {
  const S = surfaceOf(ROOM);
  const plain = roomBoard(S, {point: () => ({act: true, label: 'x'})});
  assert.match(plain, /<circle class="pb-hit" cx="1" cy="-1" r="0.42"\/>/);
  const wide = planeBoard(S, {window: [0, 0, 0, 0], point: pt => pt.u === 4 && pt.v === 4 ? {act: true, r: 2.3, label: 'T'} : {}});
  assert.match(wide, /data-pb-point="4,4" data-pb-view="plane" role="button"[^>]*><circle class="pb-hit" cx="4" cy="-4" r="2.3"\/>/);
  assert.match(roomBoard(S, {point: () => ({r: -1})}), /r="0.42"/, 'a bad radius is ignored');
  // false leaves a point out; {} and null keep it as a quiet point.
  assert.equal((wide.match(/data-pb-point=/g) || []).length, 64, 'every point the copy owns');
  const sparse = planeBoard(S, {window: [0, 0, 0, 0], point: pt => pt.u === 4 && pt.v === 4 ? {act: true, label: 'T'} : false});
  assert.equal((sparse.match(/data-pb-point=/g) || []).length, 1);
  assert.equal((roomBoard(S, {point: pt => pt.i === 1 && pt.j === 1 ? null : false}).match(/data-pb-point=/g) || []).length, 1);
  // The shields views leave out every plane point but the copies to tap.
  const p = byId('shields-01'), html = view(p, freshAttempt(p));
  assert.equal((html.slice(html.indexOf('pb-plane')).match(/data-pb-point=/g) || []).length, 0, 'nothing to tap in the unrolled view before a claim');
});

test('the S label keeps its size on screen when a long shot zooms the view out; the claim button is one slot', () => {
  // The label's share of the unrolled view's width is the same on every puzzle
  // (about 15 px where the view is 330 px wide), so it grows with the zoom.
  const share = p => {
    const html = view(p, freshAttempt(p)), plane = html.slice(html.indexOf('pb-board pb-plane'));
    const width = +plane.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) /)[1], size = +plane.match(/class="ps-label plane"[^>]*font-size:([\d.]+)px/)[1];
    return {width, size, share: size / width};
  };
  const near = share(byId('shields-01')), far = share(byId('shields-08'));
  assert.ok(far.width > near.width && far.size > near.size, 'shields-08 zooms out and its label grows');
  for (const p of shields.puzzles) assert.ok(Math.abs(share(p).share - near.share) < 1e-3 && share(p).share * 330 >= 13, `${p.id}: the S label at ${(share(p).share * 330).toFixed(1)} px`);
  // Fewest or Can't opens a claim and closes it in the same place: data-toggle
  // makes a quick double tap open it once (dist/main.js).
  for (const id of ['shields-01', 'shields-07']) {
    const p = byId(id), a = play(p, freshAttempt(p), ...put([1, 1]));
    assert.match(view(p, a), /class="secondary ps-button[^"]*"[^>]*data-toggle="ps-claim"/, id);
  }
});

test('Portal shields’ classes are its own: ps-, beside Fair shares’ sh-', async () => {
  // Every family's stylesheet is loaded on every screen, so a class another
  // family styles without scoping would restyle these boards (Fair shares'
  // .sh-puzzle capped this one at 560 px and shrank it on a tablet).
  const css = await readFile(new URL('../dist/families/shields/shields.css', import.meta.url), 'utf8');
  const js = await readFile(new URL('../dist/families/shields/shields.js', import.meta.url), 'utf8');
  assert.doesNotMatch(css + js, /\bsh-/, 'no sh- class left');
  for (const f of await readdir(new URL('../dist/families/', import.meta.url))) {
    if (f === 'shields') continue;
    const other = await readFile(new URL(`../dist/families/${f}/${f}.css`, import.meta.url), 'utf8').catch(() => '');
    assert.doesNotMatch(other.replace(/\/\*[\s\S]*?\*\//g, ''), /\.ps-[a-z]/, `${f}.css styles no ps- class`);
  }
});
