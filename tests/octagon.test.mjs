// Octagon streets: the rewriting system (confluence, relators, normal forms),
// the drawing's geometry, walks and fences, Can't with its certificates and
// refusals, Undo keeping a refusal, hints (CPU time), saves, taps and
// rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {octagonMechanics, rulesFor, reduce, inverse, expand, stateOf, dotKey, roomKey, trace, atHome, fenceLegal, inside, mapOf, patchOf, halfwayState, claimTargets, canGo, spent, TURNS} from '../dist/families/octagon/octagon.js';
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

test('home goals: a solve, Can’t after a try, There is a way, a certificate tap and a wrong one', () => {
  const p1 = byNumber(1), p2 = byNumber(2);
  let a = play(p1, freshAttempt(p1), ...walkOn(0, 'LLLLLLLL'));
  assert.ok(isSolved(p1, a.board), 'eight lefts');
  // Puzzle 2: squares then octagons.
  a = freshAttempt(p2);
  assert.equal(move(p2, a, {type: 'claim', floor: 1, cert: ''}), null, 'no Can’t on a fresh floor');
  a = play(p2, a, ...walkOn(0, 'LLLS'));
  assert.equal(move(p2, a, {type: 'go', floor: 0, turn: 'L'}), null, 'four moves at most');
  a = play(p2, a, {type: 'claim', floor: 0, cert: ''});
  assert.equal(a.board.floors[0].told, 'way', 'There is a way.');
  assert.ok(view(p2, a).includes('There is a way.'));
  assert.equal(move(p2, a, {type: 'claim', floor: 0, cert: 'H'}), null, 'no second claim until the walk changes');
  // Undo keeps the refusal and takes back the last move with it.
  let b = undoApp(p2, a);
  assert.deepEqual(b.board.floors[0], {walk: 'LLL', told: 'way', cert: null}, 'Undo takes back a move and keeps the refusal');
  b = undoApp(p2, b);
  assert.deepEqual(b.board.floors[0], {walk: 'LL', told: 'way', cert: null});
  b = play(p2, b, ...walkOn(0, 'LL'));
  assert.equal(b.board.floors[0].told, null, 'a move clears it');
  // Octagons: four lefts, a wrong tap, Undo, another try, the right tap.
  a = play(p2, b, ...walkOn(1, 'LLLL'));
  const half = halfwayState('oct', 'LLLL');
  a = play(p2, a, {type: 'claim', floor: 1, cert: 'H'});
  assert.equal(a.board.floors[1].told, 'miss');
  assert.ok(view(p2, a).includes('Not that dot.'));
  assert.equal(move(p2, a, {type: 'claim', floor: 1, cert: half}), null, 'the refusal stands until the walk changes');
  let c = undoApp(p2, a);
  assert.deepEqual(c.board.floors[1], {walk: 'LLL', told: 'miss', cert: null});
  c = play(p2, c, {type: 'go', floor: 1, turn: 'S'});
  assert.equal(c.board.floors[1].told, null);
  c = play(p2, c, {type: 'claim', floor: 1, cert: halfwayState('oct', 'LLLS')});
  assert.notEqual(c.board.floors[1].cert, null, 'the dot after two moves');
  assert.ok(isSolved(p2, c.board));
  assert.ok(validBoard(p2, c.board));
  // The certificate can be any state at that dot.
  const other = play(p2, play(p2, b, ...walkOn(1, 'LLLL')), {type: 'claim', floor: 1, cert: reduce('oct', half + 'T')});
  assert.notEqual(other.board.floors[1].cert, null);
});

test('odd goals: Can’t is a bare press after a try, and the colouring is drawn', () => {
  const p5 = byNumber(5);
  let a = play(p5, freshAttempt(p5), ...walkOn(0, 'LLLLLLL'));
  assert.equal(move(p5, a, {type: 'claim', floor: 0, cert: ''}), null, 'nothing to tap');
  a = play(p5, a, {type: 'claim', floor: 0});
  assert.equal(a.board.floors[0].cert, '');
  assert.ok(view(p5, a).includes('oc-dark'), 'the colouring');
  a = play(p5, a, ...walkOn(1, 'SSSSSSS'), {type: 'claim', floor: 1});
  assert.ok(isSolved(p5, a.board));
});

test('fence goals: budgets, the shared wall, and a wall that is not it', () => {
  const p8 = byNumber(8), p3 = byNumber(3);
  let a = play(p3, freshAttempt(p3), ...walkOn(0, 'SLLSLL'), ...walkOn(1, 'SLLLLLLSLLLLLL'));
  assert.ok(isSolved(p3, a.board), 'both tight fences');
  assert.ok(view(p3, a).includes('oc-inside'), 'the rooms inside are shaded');
  a = freshAttempt(p8);
  assert.equal(move(p8, a, {type: 'go', floor: 1, turn: 'R'}), null, 'no right turns');
  a = play(p8, a, ...walkOn(1, 'SLLLLLLSLLLLL'));
  assert.equal(move(p8, a, {type: 'go', floor: 1, turn: 'L'}), null, 'the eleven left turns are used');
  assert.ok(spent('oct', p8.parameters, a.board.floors[1].walk), 'a finished try');
  a = play(p8, a, {type: 'claim', floor: 1, cert: 'H'});
  assert.equal(a.board.floors[1].told, 'miss', 'home’s own road is not the shared wall');
  let b = undoApp(p8, a);
  b = play(p8, b, {type: 'go', floor: 1, turn: 'S'});
  assert.equal(move(p8, b, {type: 'claim', floor: 1, cert: 'T'}), null, 'Can’t needs a finished try again');
  b = play(p8, b, {type: 'go', floor: 1, turn: 'L'}, {type: 'claim', floor: 1, cert: reduce('oct', 'TH')});
  assert.notEqual(b.board.floors[1].cert, null, 'the wall from its other end');
  assert.ok(view(p8, b).includes('oc-tight'), 'the tight fence is drawn');
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
  assert.deepEqual(a.board.floors[0], {walk: 'SSS', told: 'way', cert: null}, 'back keeps the refusal');
});

test('saves: forged certificates, refusals and walks are refused', () => {
  const p2 = byNumber(2), p8 = byNumber(8), p6 = byNumber(6);
  const blank = {walk: '', told: null, cert: null};
  assert.equal(validBoard(p2, {floors: [blank, {walk: 'LLLL', told: null, cert: 'H'}]}), false, 'a wrong certificate');
  assert.equal(validBoard(p2, {floors: [blank, {walk: 'LLLL', told: null, cert: halfwayState('oct', 'LLLL')}]}), true, 'the right one');
  assert.equal(validBoard(p2, {floors: [{walk: 'LLLL', told: null, cert: 'TH'}, blank]}), false, 'a certificate where there is a way');
  assert.equal(validBoard(p8, {floors: [blank, {walk: 'SLLLLLLSLLLL', told: null, cert: 'T'}]}), false, 'a certificate before the try is finished');
  assert.equal(validBoard(p8, {floors: [blank, {walk: 'SLLLLLLSLLLLL', told: null, cert: 'T'}]}), true);
  assert.equal(validBoard(p6, {floors: [{walk: 'R', told: null, cert: null}]}), false, 'a right turn on a no-right floor');
  assert.equal(validBoard(p6, {floors: [{walk: 'SLLLLLSLLLLLSLLLLLSLLLLL', told: 'way', cert: null}]}), false, 'a refusal on a finished fence');
  assert.equal(validBoard(p6, {floors: [blank], solved: true}), false, 'a forged done');
});

test('taps: targets after Can’t are every dot or wall in view, alike', () => {
  const p2 = byNumber(2), p8 = byNumber(8);
  const a = play(p2, freshAttempt(p2), ...walkOn(1, 'LLLL'));
  const dots = claimTargets(p2, a, 1);
  assert.ok(dots.length > 30, 'many dots');
  assert.equal(new Set(dots.map(d => dotKey('oct', d))).size, dots.length, 'one target per dot');
  assert.equal(dots.filter(d => dotKey('oct', d) === dotKey('oct', halfwayState('oct', 'LLLL'))).length, 1, 'the dot after two moves is one of them');
  const b = play(p8, freshAttempt(p8), ...walkOn(1, 'SLLLLLLSLLLLL'));
  assert.ok(claimTargets(p8, b, 1).length > 40, 'many walls');
  // The board lists the targets with no hint of which is right.
  mech.reset(p2);
  mech.ui(p2, {claim: 1});
  const html = view(p2, a, true);
  const marks = html.match(/class="oc-target"/g) || [];
  assert.equal(marks.length, dots.length, 'every target drawn alike');
  assert.ok(!html.includes('oc-hinted'), 'no target marked');
  for (const turn of TURNS) assert.equal(canGo('oct', p2.parameters, 'LLLL', turn), false);
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
