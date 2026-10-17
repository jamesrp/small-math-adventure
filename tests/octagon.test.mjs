// Octagon streets: the rewriting system (confluence, relators, normal forms),
// the drawing's geometry, walks and fences, Can't judged tap first with its
// certificates and refusals, refusals kept until a different finished walk,
// hints (CPU time), saves, taps (targets, reach, order, labels), the home
// marker, recentring after Undo, and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {octagonMechanics, rulesFor, reduce, inverse, expand, stateOf, dotKey, roomKey, trace, atHome, fenceLegal, inside, mapOf, patchOf, halfwayState, evenDots, claimTargets, pickAt, drawnAt, TARGET_R, canGo, spent, TURNS} from '../dist/families/octagon/octagon.js';
import {loadPack, FAMILIES} from '../scripts/packs.mjs';

const octagon = JSON.parse(await readFile(new URL('../dist/families/octagon/octagon.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = octagonMechanics.octagon;
const byNumber = n => octagon.puzzles.find(p => p.number === n);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next && next !== b, `${JSON.stringify(action)} is legal`); return next; }, a);
const walkOn = (floor, w) => [...w].map(turn => ({type: 'go', floor, turn}));
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
// The undo the app does: the engine's, then the mechanic's carry.
const undoApp = (p, a) => { const next = undo(a); return {...next, board: mech.carry(p, a.board, next.board)}; };

test('the rewriting system is confluent and terminating, and its normal forms are right', () => {
  const shortlex = (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
  for (const [kind, p] of [['oct', 8], ['sq', 4]]) {
    const rules = rulesFor(p);
    // Every right side is shortlex-smaller (T < t < H), so rewriting stops.
    const rank = w => w.replace(/T/g, 'a').replace(/t/g, 'b').replace(/H/g, 'c');
    for (const [l, r] of rules) assert.ok(shortlex(rank(r), rank(l)) < 0, `${kind}: ${l} → ${r} shortens`);
    // Every critical pair (an overlap of two left sides, or one inside the
    // other) reduces to one word both ways, so the system is confluent.
    let pairs = 0;
    for (const [l1, r1] of rules) for (const [l2, r2] of rules) {
      for (let k = 1; k < Math.min(l1.length, l2.length); k++) {
        if (l1.slice(-k) !== l2.slice(0, k)) continue;
        const w = l1 + l2.slice(k);
        assert.equal(reduce(kind, r1 + l2.slice(k)), reduce(kind, l1.slice(0, -k) + r2), `${kind}: overlap ${w}`);
        pairs++;
      }
      const at = l1.indexOf(l2);
      if (l1 !== l2 && at >= 0) { assert.equal(reduce(kind, r1), reduce(kind, l1.slice(0, at) + r2 + l1.slice(at + l2.length)), `${kind}: ${l2} inside ${l1}`); pairs++; }
    }
    assert.ok(pairs > 10, `${kind}: critical pairs checked`);
    for (const rel of ['TTTT', 'HH', 'TH'.repeat(p), 'Tt', 'tT']) assert.equal(reduce(kind, rel), '', `${kind}: ${rel} = 1`);
    for (const w of ['THTHHt', 'HTTHtH', 'TTHTHTTH']) assert.equal(reduce(kind, w + inverse(w)), '', `${kind}: a word times its inverse`);
  }
  assert.equal(stateOf('oct', 'LLLLLLLL'), '', 'eight lefts round an octagon');
  assert.notEqual(stateOf('oct', 'LLLL'), '', 'four lefts are not enough');
  assert.equal(stateOf('sq', 'LLLL'), '');
  assert.equal(stateOf('sq', 'SLLSLL'), '');
  assert.equal(expand('LSR'), 'THTTHTTtHTT');
});

test('the drawing geometry satisfies the relations, and the floor is drawn from the patch', () => {
  const close = (M, label) => { const s = Math.hypot(M.b[0], M.b[1]) + Math.abs(Math.abs(M.a[0]) - 1) + Math.abs(M.a[1]); assert.ok(s < 1e-9, label); };
  for (const [kind, p] of [['oct', 8], ['sq', 4]]) for (const rel of ['TTTT', 'HH', 'TH'.repeat(p)]) close(mapOf(kind, rel), `${kind}: ${rel} is the identity in the picture`);
  // Patch dots: one per dot, and every road joins two of them.
  for (const kind of ['oct', 'sq']) {
    const {verts, roads} = patchOf(kind), keys = verts.map(v => dotKey(kind, v.word));
    assert.equal(new Set(keys).size, keys.length, `${kind}: patch dots are different dots`);
    assert.ok(roads.every(r => r.a < verts.length && r.b < verts.length && r.a !== r.b));
    // Different dots are drawn apart.
    for (let i = 0; i < Math.min(verts.length, 60); i++) for (let j = i + 1; j < Math.min(verts.length, 60); j++) assert.ok(Math.hypot(verts[i].z[0] - verts[j].z[0], verts[i].z[1] - verts[j].z[1]) > 1e-6, `${kind}: dots ${i} and ${j} drawn apart`);
  }
});

test('walks: fences never reuse a dot, and inside() finds the rooms a fence goes round', () => {
  assert.equal(fenceLegal('oct', 'LLLLLLL'), true);
  assert.equal(fenceLegal('oct', 'LLLLLLLL'), true, 'closing at home is allowed');
  assert.equal(fenceLegal('oct', 'LLLLLLLLL'), false, 'going on from home is not');
  const tight = inside('oct', 'SLLLLLLSLLLLLL');
  assert.deepEqual(new Set(tight.rooms), new Set(['T', ''].map(w => roomKey('oct', w))), 'the two rooms left of home');
  assert.equal(tight.ccw, true);
  assert.deepEqual(new Set(inside('sq', 'SLLSLL').rooms), new Set(['T', ''].map(w => roomKey('sq', w))));
  // A big rectangle on squares: every square inside is found.
  const big = 'SSSS' + 'LSSSS' + 'LSSSSS' + 'LSSSS' + 'LS';
  assert.ok(atHome('sq', big) && fenceLegal('sq', big));
  assert.equal(inside('sq', big).rooms.length, 30, 'a 6 × 5 rectangle');
  assert.equal(trace('oct', 'LLLL').dots.length, 5);
});

test('home goals: the tap is judged first on every floor, and a refusal stands until a different finished walk', () => {
  const p1 = byNumber(1), p2 = byNumber(2);
  let a = play(p1, freshAttempt(p1), ...walkOn(0, 'LLLLLLLL'));
  assert.ok(isSolved(p1, a.board), 'eight lefts');
  // Puzzle 2: squares (there is a way) then octagons (there is none).
  a = freshAttempt(p2);
  assert.equal(move(p2, a, {type: 'claim', floor: 1, cert: ''}), null, 'no Can’t on a fresh floor');
  a = play(p2, a, ...walkOn(0, 'LLLS'));
  assert.equal(move(p2, a, {type: 'go', floor: 0, turn: 'L'}), null, 'four moves at most');
  assert.equal(move(p2, a, {type: 'claim', floor: 0}), null, 'a dot to tap');
  // A wrong dot on squares is refused just as on octagons.
  const sqHalf = halfwayState('sq', 'LLLS');
  const w = play(p2, a, {type: 'claim', floor: 0, cert: ''});
  assert.deepEqual(w.board.floors[0].told, {say: 'miss', walk: 'LLLS'}, 'home is not the dot after two moves');
  assert.ok(view(p2, w).includes('<p class="oc-told">Not that dot.</p>'));
  assert.equal(move(p2, w, {type: 'claim', floor: 0, cert: sqHalf}), null, 'the refusal stands');
  // Only the right dot says there is a way.
  const r = play(p2, a, {type: 'claim', floor: 0, cert: sqHalf});
  assert.deepEqual(r.board.floors[0].told, {say: 'way', walk: 'LLLS'});
  assert.ok(view(p2, r).includes('<p class="oc-told">There is a way.</p>'));
  // Undo takes back the refusal with the last move, and keeps it showing.
  let b = undoApp(p2, r);
  assert.deepEqual(b.board.floors[0], {walk: 'LLL', told: {say: 'way', walk: 'LLLS'}, cert: null});
  assert.ok(!view(p2, b).includes('There is a way.'), 'its words wait for that walk');
  b = play(p2, b, {type: 'go', floor: 0, turn: 'S'});
  assert.deepEqual(b.board.floors[0].told, {say: 'way', walk: 'LLLS'}, 'the same walk again keeps it');
  assert.ok(view(p2, b).includes('<p class="oc-told">There is a way.</p>'), 'and shows it');
  assert.equal(move(p2, b, {type: 'claim', floor: 0, cert: sqHalf}), null, 'and keeps Can’t shut');
  b = play(p2, undoApp(p2, b), {type: 'go', floor: 0, turn: 'R'});
  assert.deepEqual(b.board.floors[0], {walk: 'LLLR', told: null, cert: null}, 'a different finished walk ends it');
  b = undoApp(p2, b);
  assert.deepEqual(b.board.floors[0].told, {say: 'way', walk: 'LLLS'}, 'Undo brings it back');
  b = play(p2, b, {type: 'go', floor: 0, turn: 'L'});
  assert.deepEqual(b.board.floors[0], {walk: 'LLLL', told: null, cert: null}, 'home');
  // Octagons: a wrong tap, Undo, another try, the right tap.
  a = play(p2, b, ...walkOn(1, 'LLLL'));
  const half = halfwayState('oct', 'LLLL');
  let c = play(p2, a, {type: 'claim', floor: 1, cert: 'H'});
  assert.deepEqual(c.board.floors[1].told, {say: 'miss', walk: 'LLLL'});
  assert.ok(view(p2, c).includes('<p class="oc-told">Not that dot.</p>'), 'the same words as on squares');
  assert.equal(move(p2, c, {type: 'claim', floor: 1, cert: half}), null, 'the refusal stands until the walk changes');
  const restarted = mech.carryOnRestart(p2, c.board, mech.fresh(p2));
  assert.deepEqual(restarted.floors[1], {walk: '', told: {say: 'miss', walk: 'LLLL'}, cert: null}, 'Restart keeps it');
  assert.ok(validBoard(p2, restarted));
  assert.ok(!view(p2, {...freshAttempt(p2), board: restarted}).includes('oc-told'), 'not shown under an empty floor');
  assert.ok(view(p2, play(p2, {...freshAttempt(p2), board: restarted}, ...walkOn(1, 'LLLL'))).includes('<p class="oc-told">Not that dot.</p>'), 'shown when that walk is finished again');
  c = undoApp(p2, c);
  assert.deepEqual(c.board.floors[1], {walk: 'LLL', told: {say: 'miss', walk: 'LLLL'}, cert: null});
  c = play(p2, c, {type: 'go', floor: 1, turn: 'S'});
  assert.equal(c.board.floors[1].told, null);
  c = play(p2, c, {type: 'claim', floor: 1, cert: halfwayState('oct', 'LLLS')});
  assert.notEqual(c.board.floors[1].cert, null, 'the dot after two moves');
  assert.ok(isSolved(p2, c.board));
  assert.ok(validBoard(p2, c.board));
  // Any state at that dot will do; it is saved as the dot's key.
  const other = play(p2, a, {type: 'claim', floor: 1, cert: reduce('oct', half + 'T')});
  assert.equal(other.board.floors[1].cert, dotKey('oct', half));
});

test('odd goals: after Can’t the walk’s dots of home’s colour are tapped, judged as one claim', () => {
  const p5 = byNumber(5);
  let a = play(p5, freshAttempt(p5), ...walkOn(0, 'LLSLLSL'));
  assert.equal(move(p5, a, {type: 'claim', floor: 0}), null, 'dots to tap');
  // (0,0) → (0,1) → (−1,1) → (−2,1) → (−2,0) → (−1,0) → (0,0) → (0,1): after
  // 2 and 4 moves the robot was at (−1,1) and (−2,0); after 6 it was home.
  const want = evenDots('sq', 'LLSLLSL');
  assert.equal(want.length, 2, 'two light dots other than home');
  assert.ok(!want.includes(dotKey('sq', '')));
  for (const wrong of [[want[0]], [want[0], dotKey('sq', 'H')], [...want, dotKey('sq', 'H')]]) {
    const x = play(p5, a, {type: 'claim', floor: 0, cert: wrong});
    assert.deepEqual(x.board.floors[0].told, {say: 'miss', walk: 'LLSLLSL'}, `refuses ${wrong.length} dots`);
    assert.ok(view(p5, x).includes('<p class="oc-told">Not those dots.</p>'));
  }
  assert.equal(move(p5, a, {type: 'claim', floor: 0, cert: [want[0], want[0]]}), null, 'a dot twice is not a claim');
  // Marks show while the dots are tapped; none is marked as right.
  mech.reset(p5);
  mech.ui(p5, {claim: 0});
  mech.ui(p5, {marks: [want[0]]});
  const marking = view(p5, a, true);
  assert.equal((marking.match(/class="oc-target oc-marked"/g) || []).length, 1, 'one dot marked');
  assert.equal((marking.match(/class="oc-target[^"]*"[^>]*aria-pressed="true"/g) || []).length, 1, 'that dot pressed');
  assert.match(marking, /class="oc-target oc-marked"[^>]*aria-pressed="true"/);
  // Order and other names for the same dots do not matter.
  a = play(p5, a, {type: 'claim', floor: 0, cert: [reduce('sq', want[1] + 'T'), want[0]]});
  assert.deepEqual(a.board.floors[0].cert, want);
  const html = view(p5, a);
  assert.ok(html.includes('oc-dark') && html.includes('oc-ring'), 'the colouring, with the tapped dots ringed');
  a = play(p5, a, ...walkOn(1, 'SSSSSSS'), {type: 'claim', floor: 1, cert: evenDots('oct', 'SSSSSSS')});
  assert.equal(evenDots('oct', 'SSSSSSS').length, 3);
  assert.ok(isSolved(p5, a.board));
});

test('fence goals: budgets, and puzzle 8’s bare Can’t with the tight fence and its 12 corners drawn', () => {
  const p8 = byNumber(8), p3 = byNumber(3);
  let a = play(p3, freshAttempt(p3), ...walkOn(0, 'SLLSLL'), ...walkOn(1, 'SLLLLLLSLLLLLL'));
  assert.ok(isSolved(p3, a.board), 'both tight fences');
  assert.ok(view(p3, a).includes('oc-inside'), 'the rooms inside are shaded');
  a = freshAttempt(p8);
  assert.equal(move(p8, a, {type: 'go', floor: 1, turn: 'R'}), null, 'no right turns');
  assert.equal(move(p8, a, {type: 'claim', floor: 1}), null, 'Can’t needs a finished try');
  a = play(p8, a, ...walkOn(1, 'SLLLLLLSLLLLL'));
  assert.equal(move(p8, a, {type: 'go', floor: 1, turn: 'L'}), null, 'the eleven left turns are used');
  assert.ok(spent('oct', p8.parameters, a.board.floors[1].walk), 'a finished try');
  assert.equal(move(p8, a, {type: 'claim', floor: 1, cert: 'H'}), null, 'nothing to tap');
  const b = play(p8, a, {type: 'claim', floor: 1});
  assert.equal(b.board.floors[1].cert, '');
  assert.equal(b.board.floors[1].told, null);
  const html = view(p8, b);
  assert.ok(html.includes('oc-tight'), 'the tight fence is drawn');
  assert.equal((html.match(/<path class="oc-corner" d="([^"]*)"/)[1].match(/M/g) || []).length, 12, 'its 12 corners');
  // Puzzle 9: the left budget forces a right turn.
  const p9 = byNumber(9);
  let c = play(p9, freshAttempt(p9), ...walkOn(0, 'SLLLLLSLLLLLSLLLLL'));
  assert.equal(lefts(c.board.floors[0].walk), 15);
  c = play(p9, freshAttempt(p9), ...walkOn(0, 'SLLLLLSLLLLLLRLLLLLL'));
  assert.ok(isSolved(p9, c.board));
});
const lefts = w => [...w].filter(x => x === 'L').length;

test('hints: quick in CPU time, the reason before Can’t, and they finish every puzzle', () => {
  for (const p of octagon.puzzles.filter(x => x.band !== 'playground')) {
    let a = freshAttempt(p), steps = 0;
    const first = nextHint(p, a);
    assert.ok(!/^Press Can’t/.test(first.text), `${p.id}: never “Press Can’t” first`);
    for (; !isSolved(p, a.board) && steps < 120; steps++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time)`);
      if (h.action?.type === 'claim') assert.ok(h.text.indexOf('Press Can’t') > 20, `${p.id}: the reason comes before Can’t`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
  }
});

test('hints take moves back and never report a dead end, which the app would show unasked', () => {
  for (const p of octagon.puzzles.filter(x => x.band !== 'playground')) {
    const q = p.parameters;
    // A few wrong tries on each floor.
    for (const [i] of q.floors.entries()) for (const w of ['S', 'SS', 'LS', 'RRR', 'SLS']) {
      let a = freshAttempt(p);
      for (const x of w) { const n = move(p, a, {type: 'go', floor: i, turn: x}); if (n) a = n; }
      const h = nextHint(p, a);
      assert.notEqual(h.type, 'deadend', `${p.id} floor ${i} after ${w}`);
    }
  }
  const p2 = byNumber(2);
  let a = play(p2, freshAttempt(p2), ...walkOn(0, 'SSSS'), {type: 'claim', floor: 0, cert: ''});
  const h = nextHint(p2, a);
  assert.deepEqual(h.action, {type: 'back', floor: 0});
  assert.equal(h.text, 'This walk can’t come home in time. Take back the last move.');
  a = play(p2, a, h.action);
  assert.deepEqual(a.board.floors[0], {walk: 'SSS', told: {say: 'miss', walk: 'SSSS'}, cert: null}, 'back keeps the refusal');
  // On a floor with no answer, after a refusal the hints finish a different try.
  let b = play(p2, freshAttempt(p2), ...walkOn(1, 'LLLL'), {type: 'claim', floor: 1, cert: 'H'});
  for (let k = 0; k < 6 && b.board.floors[1].told; k++) b = play(p2, b, nextHint(p2, b).action);
  assert.equal(b.board.floors[1].told, null, 'the hints end the refusal with a different walk');
  assert.notEqual(b.board.floors[1].walk, 'LLLL');
});

test('saves: forged certificates, refusals and walks are refused', () => {
  const p2 = byNumber(2), p5 = byNumber(5), p8 = byNumber(8), p6 = byNumber(6);
  const blank = {walk: '', told: null, cert: null};
  const half = dotKey('oct', halfwayState('oct', 'LLLL'));
  assert.equal(validBoard(p2, {floors: [blank, {walk: 'LLLL', told: null, cert: 'H'}]}), false, 'a wrong certificate');
  assert.equal(validBoard(p2, {floors: [blank, {walk: 'LLLL', told: null, cert: half}]}), true, 'the right one');
  assert.equal(validBoard(p2, {floors: [blank, {walk: 'LLLL', told: null, cert: reduce('oct', half + 'T')}]}), half === reduce('oct', half + 'T'), 'saved only as its dot key');
  assert.equal(validBoard(p2, {floors: [{walk: 'LLLL', told: null, cert: dotKey('sq', 'TH')}, blank]}), false, 'a certificate where there is a way');
  assert.equal(validBoard(p2, {floors: [blank, {walk: 'LLLL', told: 'miss', cert: null}]}), false, 'a refusal not keyed to a walk');
  assert.equal(validBoard(p2, {floors: [blank, {walk: 'LLLL', told: {say: 'way', walk: 'LLLL'}, cert: null}]}), false, 'There is a way where there is none');
  assert.equal(validBoard(p2, {floors: [blank, {walk: 'LLLS', told: {say: 'miss', walk: 'LLLL'}, cert: null}]}), false, 'a refusal past a different finished walk');
  assert.equal(validBoard(p2, {floors: [blank, {walk: 'LL', told: {say: 'miss', walk: 'LLLL'}, cert: null}]}), true, 'a refusal standing over an unfinished walk');
  const dots = evenDots('sq', 'LLSLLSL');
  assert.equal(validBoard(p5, {floors: [{walk: 'LLSLLSL', told: null, cert: dots}, blank]}), true, 'the walk’s light dots');
  assert.equal(validBoard(p5, {floors: [{walk: 'LLSLLSL', told: null, cert: dots.slice(1)}, blank]}), false, 'a dot missing');
  assert.equal(validBoard(p5, {floors: [{walk: 'LLSLLSL', told: null, cert: [...dots].reverse()}, blank]}), false, 'not saved in order');
  assert.equal(validBoard(p5, {floors: [{walk: 'LLSLLSL', told: null, cert: ''}, blank]}), false, 'a bare certificate where dots are tapped');
  assert.equal(validBoard(p8, {floors: [blank, {walk: 'SLLLLLLSLLLL', told: null, cert: ''}]}), false, 'a certificate before the try is finished');
  assert.equal(validBoard(p8, {floors: [blank, {walk: 'SLLLLLLSLLLLL', told: null, cert: ''}]}), true);
  assert.equal(validBoard(p8, {floors: [blank, {walk: 'SLLLLLLSLLLLL', told: null, cert: 'T'}]}), false, 'a tapped wall where Can’t is pressed alone');
  assert.equal(validBoard(p8, {floors: [blank, {walk: 'SLLLLLLSLLLLL', told: {say: 'miss', walk: 'SLLLLLLSLLLLL'}, cert: null}]}), false, '“Not that” where nothing is tapped');
  assert.equal(validBoard(p6, {floors: [{walk: 'R', told: null, cert: null}]}), false, 'a right turn on a no-right floor');
  assert.equal(validBoard(p6, {floors: [{walk: 'SLLLLLSLLLLLSLLLLLSLLLLL', told: {say: 'way', walk: 'SLLLLLSLLLLLSLLLLLSLLLLL'}, cert: null}]}), false, 'a refusal on a finished fence');
  assert.equal(validBoard(p6, {floors: [blank], solved: true}), false, 'a forged done');
});

// Target paths on a board: centre, label, key.
const targetsIn = html => [...html.matchAll(/<path class="oc-target[^"]*" d="M(-?[\d.]+) (-?[\d.]+)a([\d.]+)[^"]*"[^>]*aria-label="([^"]*)"[^>]*data-cert="([^"]*)"/g)]
  .map(m => ({z: [(Number(m[1]) + Number(m[3])) / 100, -Number(m[2]) / 100], label: m[4], cert: m[5]}));

test('taps: after Can’t only targets are drawn, all alike, outward from the robot, with plain labels', () => {
  const p2 = byNumber(2);
  const a = play(p2, freshAttempt(p2), ...walkOn(1, 'LLLL'));
  const certs = claimTargets(p2, a, 1);
  assert.ok(certs.length > 20, 'many dots');
  assert.equal(new Set(certs).size, certs.length, 'one target per dot');
  assert.ok(!certs.includes(dotKey('oct', '')), 'home is not a target');
  assert.ok(certs.includes(dotKey('oct', halfwayState('oct', 'LLLL'))), 'the dot after two moves is one');
  mech.reset(p2);
  mech.ui(p2, {claim: 1});
  const html = view(p2, a, true).split('<svg class="oc-board')[2], drawn = targetsIn(html);
  assert.deepEqual(drawn.map(t => t.cert), certs, 'every target drawn, in the order listed');
  assert.ok(!html.includes('class="oc-dot"'), 'no dots drawn that cannot be tapped');
  assert.ok(!html.includes('oc-hinted'), 'no target marked');
  for (const t of drawn) assert.ok(Math.hypot(...t.z) < TARGET_R + 0.01, `${t.cert}: within reach of a finger`);
  // Tab order: outward from the robot in the middle, clockwise within a ring.
  assert.ok(Math.hypot(...drawnAt(p2, 1, trace('oct', 'LLLL').states.at(-1))) < 1e-9, 'the robot is in the middle');
  for (let k = 1; k < drawn.length; k++) assert.ok(Math.hypot(...drawn[k].z) >= Math.hypot(...drawn[k - 1].z) - 0.01, 'outward');
  // Labels say which dots the walk used (as the picture does), never which is right.
  assert.deepEqual(new Set(drawn.map(t => t.label)), new Set(['Dot', 'Dot on the walk']));
  const onWalk = new Set(trace('oct', 'LLLL').dots.filter(d => d !== dotKey('oct', '')));
  assert.equal(drawn.filter(t => t.label === 'Dot on the walk').length, onWalk.size);
  assert.equal((html.match(/data-focus="oc-t-1-/g) || []).length, drawn.length, 'each target keeps focus across renders');
  for (const turn of TURNS) assert.equal(canGo('oct', p2.parameters, 'LLLL', turn), false);
});

test('taps: reach shrinks toward the rim, and a tap chooses only among drawn targets', () => {
  const p2 = byNumber(2), p4 = byNumber(4);
  let a = play(p2, freshAttempt(p2), ...walkOn(1, 'LLLL'));
  mech.reset(p2);
  mech.ui(p2, {claim: 1});
  const drawn = targetsIn(view(p2, a, true));
  for (const t of drawn.filter((_, k) => k % 5 === 0)) assert.equal(pickAt(p2, a, 1, t.z)?.cert, t.cert, `a tap on ${t.cert} chooses it`);
  // A tap takes the target drawn nearest it, or nothing: never one drawn
  // farther away than another.
  let taken = 0;
  for (let x = -0.99; x <= 0.99; x += 0.03) for (let y = -0.99; y <= 0.99; y += 0.03) {
    if (Math.hypot(x, y) >= 1) continue;
    const pick = pickAt(p2, a, 1, [x, y]);
    if (!pick) continue;
    taken++;
    const d = t => Math.hypot(t.z[0] - x, t.z[1] - y), best = Math.min(...drawn.map(d));
    assert.ok(d(drawn.find(t => t.cert === pick.cert)) <= best + 0.002, `a tap at (${x.toFixed(2)}, ${y.toFixed(2)}) takes the nearest target`);
  }
  assert.ok(taken > 300, `most taps near the middle take a dot (${taken})`);
  // Home is drawn but is not a target, and a tap on it chooses nothing.
  const home = drawnAt(p2, 1, '');
  assert.ok(Math.hypot(...home) < 0.99, 'home is drawn');
  assert.equal(pickAt(p2, a, 1, home), null, 'a tap on home');
  // Near the rim, nothing is within reach.
  for (let k = 0; k < 16; k++) { const t = k * Math.PI / 8; assert.equal(pickAt(p2, a, 1, [0.985 * Math.cos(t), 0.985 * Math.sin(t)]), null, `a tap at the rim (${k})`); }
  // Puzzle 4: the dot after three straight moves is near the rim, too small to
  // tap; a tap there chooses nothing until the floor is dragged.
  a = play(p4, freshAttempt(p4), ...walkOn(1, 'SSSSSS'));
  mech.reset(p4);
  mech.ui(p4, {claim: 1});
  const html = view(p4, a, true), half = dotKey('oct', halfwayState('oct', 'SSSSSS')), z = drawnAt(p4, 1, half);
  assert.ok(Math.hypot(...z) > TARGET_R, 'drawn beyond the targets');
  assert.ok(!targetsIn(html).some(t => t.cert === half), 'not a target');
  assert.equal(pickAt(p4, a, 1, z)?.cert === half, false, 'a tap on it does not choose it');
  // The moves’ reach also shrinks: a tap far beyond a road ahead chooses nothing.
  const b = freshAttempt(p4);
  mech.reset(p4);
  view(p4, b, true);
  assert.equal(pickAt(p4, b, 1, [0, 0.99]), null, 'a tap at the rim straight ahead');
  assert.equal(pickAt(p4, b, 1, [0, 0.4])?.turn, 'S', 'a tap on the road straight ahead');
});

test('home off the drawing: a marker on the edge, outside every target, points to it', () => {
  const p4 = byNumber(4);
  let a = play(p4, freshAttempt(p4), ...walkOn(1, 'SS'));
  let html = view(p4, a);
  assert.ok(html.includes('class="oc-home"') && !html.includes('oc-homeward'), 'home in view: its ring');
  for (const floor of [1, 0]) {
    a = play(p4, freshAttempt(p4), ...walkOn(floor, 'SSSSSS'));
    html = view(p4, a);
    const board = html.split('<svg class="oc-board').slice(1)[floor];
    const d = (board.match(/<path class="oc-homeward" d="([^"]*)"/) || [])[1];
    assert.ok(d && !board.includes('class="oc-home"'), `floor ${floor}: home off the drawing, a marker instead`);
    const pts = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
    // The robot walked straight up the picture, so home is straight down.
    assert.ok(Math.abs(pts[0][0]) < 1 && pts[0][1] > 100, `floor ${floor}: the marker points down past the edge (${pts[0]})`);
    const out = floor === 1 ? z => Math.hypot(...z) : z => Math.max(Math.abs(z[0]), Math.abs(z[1]));
    for (const z of pts) assert.ok(out(z) >= 96, `floor ${floor}: the marker is outside the targets (${z})`);
    assert.ok(board.lastIndexOf('oc-homeward') > board.lastIndexOf('oc-robot'), `floor ${floor}: drawn last, outside the square’s clip`);
  }
});

test('the second hint level brings the next dot to tap within reach, and a line asks for a drag', () => {
  const p5 = byNumber(5), p4 = byNumber(4), p2 = byNumber(2);
  let a = play(p5, freshAttempt(p5), ...walkOn(0, 'LLSLLSL'), {type: 'claim', floor: 0, cert: evenDots('sq', 'LLSLLSL')}, ...walkOn(1, 'SSSSSSS'));
  const dots = trace('oct', 'SSSSSSS').dots, [d2, d4, d6] = [dots[2], dots[4], dots[6]];
  const reach = z => Math.hypot(...z) < TARGET_R;
  mech.reset(p5);
  mech.ui(p5, {claim: 1});
  let html = view(p5, a, true);
  assert.ok(html.includes('<p class="oc-cue">Drag the floor to reach dots near the edge.</p>'), 'dots of the walk are beyond reach');
  assert.ok(reach(drawnAt(p5, 1, d6)) && !reach(drawnAt(p5, 1, d4)) && !reach(drawnAt(p5, 1, d2)), 'only the last light dot within reach');
  const hinted = {...a, hintLevel: 2};
  html = view(p5, hinted, true);
  assert.ok(html.includes('oc-hinted'), 'the hint rings the dot within reach');
  assert.ok(reach(drawnAt(p5, 1, d6)), 'no slide while a dot to tap is within reach');
  mech.ui(p5, {marks: [d6]});
  view(p5, hinted, true);
  assert.ok(Math.hypot(...drawnAt(p5, 1, d2)) < 1e-9, 'then the floor slides to the first light dot not yet marked');
  mech.ui(p5, {marks: [d6, d2]});
  view(p5, hinted, true);
  assert.ok(reach(drawnAt(p5, 1, d4)) && Math.hypot(...drawnAt(p5, 1, d2)) < 1e-9, 'the last is within reach from there, so no slide');
  // One dot: the dot after half the moves.
  a = play(p4, freshAttempt(p4), ...walkOn(0, 'LLSLLS'), ...walkOn(1, 'SSSSSS'));
  mech.reset(p4);
  mech.ui(p4, {claim: 1});
  view(p4, {...a, hintLevel: 2}, true);
  assert.ok(Math.hypot(...drawnAt(p4, 1, halfwayState('oct', 'SSSSSS'))) < 1e-9, 'the halfway dot slides to the middle');
  // No line when every dot of the walk can be tapped.
  a = play(p2, freshAttempt(p2), ...walkOn(1, 'LLLL'));
  mech.reset(p2);
  mech.ui(p2, {claim: 1});
  assert.ok(view(p2, a, true).includes('<p class="oc-cue" hidden>'), 'the line is hidden');
});

test('after Undo of a right Can’t, the next right Can’t brings its dot to the middle again', () => {
  const p2 = byNumber(2), half = halfwayState('oct', 'LLLL');
  mech.reset(p2);
  let a = play(p2, freshAttempt(p2), ...walkOn(1, 'LLLL'));
  view(p2, a, true);
  a = play(p2, a, {type: 'claim', floor: 1, cert: half});
  const ringAt = html => html.match(/<path class="oc-ring" d="M(-?[\d.]+) (-?[\d.]+)/).slice(1).join(' ');
  assert.equal(ringAt(view(p2, a, true)), '-11 0', 'the dot in the middle');
  // Undo the claim and the last move, walk it again (the view follows the
  // robot), and claim again: the dot comes to the middle again.
  a = undoApp(p2, a);
  view(p2, a, true);
  a = undoApp(p2, a);
  view(p2, a, true);
  a = play(p2, a, {type: 'go', floor: 1, turn: 'L'});
  view(p2, a, true);
  assert.ok(Math.hypot(...drawnAt(p2, 1, half)) > 0.1, 'the view has moved away from the dot');
  a = play(p2, a, {type: 'claim', floor: 1, cert: half});
  assert.equal(ringAt(view(p2, a, true)), '-11 0', 'in the middle again');
});

test('rendering: copy, budgets, record, tabs, focus targets and scoped styles', async () => {
  for (const p of octagon.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.ok(html.includes('data-mechanic-wire="octagon"'), `${p.id}: the root`);
    assert.equal((html.match(/<svg class="oc-board/g) || []).length, p.parameters.floors.length, `${p.id}: one board per floor`);
    assert.ok(!/\b\d+ of \d+\b/.test(html.replace(/aria-label="[^"]*"/g, '')), `${p.id}: no “x of n” counters on the page`);
    if (p.parameters.floors.length > 1) assert.ok(html.includes('oc-tabs'), `${p.id}: tabs for a narrow panel`);
  }
  const p9 = byNumber(9), p1 = byNumber(1);
  assert.equal((view(p9, freshAttempt(p9)).match(/<i class="">↰<\/i>/g) || []).length, 19, 'nineteen left turns shown');
  assert.equal((view(p1, freshAttempt(p1)).match(/<i class=""><\/i>/g) || []).length, 8, 'eight empty move boxes');
  const css = await readFile(new URL('../dist/families/octagon/octagon.css', import.meta.url), 'utf8');
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@container[^{]*\{/g, '').split('}').map(r => r.trim()).filter(r => r && r.includes('{'));
  for (const r of rules) for (const sel of r.slice(0, r.indexOf('{')).split(',')) assert.ok(sel.trim().startsWith('[data-mechanic-wire="octagon"]'), `scoped: ${sel.trim()}`);
  // The family symbol is unique.
  const symbols = FAMILIES.filter(m => m.family).map(m => m.family.symbol);
  assert.equal(symbols.filter(s => s === '⊛').length, 1, 'a unique symbol');
  assert.ok(!['▰', '⇄', '☀', '◷', '↗', '♧', '▦', '◐', '●', '◆', '♒', '⚖'].includes('⊛'));
});
