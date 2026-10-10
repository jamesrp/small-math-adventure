// Knot colours: the crossing rule, colourings and claims, the crossing codes
// rebuilt from the drawings (and a flipped crossing caught), completing,
// One colour only and Can't with their certificates, finding every colouring,
// matched end dots, hints, the playground, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {knotsMechanics, works, nextColour, completions, nonConstant, claimTrue, certificate, crossingState, keyOf} from '../dist/families/knots/knots.js';
import {codeFromArcs, jonesOfCode, JONES, samePolynomial, bruteColourings} from '../scripts/validate-knots.mjs';
import {diagram, drawings, placed, aspectOf} from '../scripts/build-knots.mjs';
import {loadPack} from '../scripts/packs.mjs';

const knots = JSON.parse(await readFile(new URL('../dist/families/knots/knots.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => knots.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const paint = (arc, colour) => ({type: 'paint', arc, colour});
const paintAll = colours => colours.map((c, i) => paint(i, c));
const view = (p, a) => { knotsMechanics.knots.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const visibleText = html => html.replace(/<p class="sr-only"[^]*?<\/p>/g, '').replace(/<[^>]+>/g, ' ');
const arcsOf = (q, k) => q.arcs.map((a, index) => ({...a, index})).filter(a => a.pic === k);

test('the crossing rule: all one colour or all different, and any two arcs decide the third', () => {
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
    const third = [0, 1, 2].filter(c => works(a, b, c));
    assert.equal(third.length, 1, `${a}${b} decide one colour`);
    assert.equal(third[0], a === b ? a : 3 - a - b);
    assert.ok(works(b, third[0], a) && works(third[0], a, b), 'the rule is symmetric');
  }
  assert.deepEqual([null, 0, 1, 2].map(nextColour), [0, 1, 2, 0], 'a tap cycles red, blue, yellow');
});

test('colourings and claims of each knot', () => {
  const count = id => completions(byId(id).parameters).length;
  assert.equal(count('knots-02'), 9, 'trefoil');
  assert.equal(nonConstant(byId('knots-02').parameters).length, 6, 'trefoil: six use three colours');
  assert.equal(count('knots-06'), 3, 'figure-eight: one colour only');
  assert.equal(count('knots-08'), 27, 'granny knot');
  assert.equal(count('knots-09'), 3, 'cinquefoil');
  assert.equal(count('knots-10'), 9, 'stevedore knot');
  assert.equal(count('knots-11'), 3, 'three-twist knot');
  assert.deepEqual(['knots-02', 'knots-06', 'knots-08', 'knots-09', 'knots-10', 'knots-11'].map(id => claimTrue(byId(id).parameters)), [false, true, false, true, false, true]);
  assert.equal(claimTrue(byId('knots-03').parameters), false, 'the first bend can be done');
  assert.equal(claimTrue(byId('knots-04').parameters), true, 'the second cannot');
  for (const id of ['knots-02', 'knots-06', 'knots-08', 'knots-10']) assert.deepEqual(completions(byId(id).parameters).map(c => c.join('')), bruteColourings(byId(id).parameters), `${id}: forcing search and brute force agree`);
});

test('crossing codes: rebuilt from the drawn arcs; one flipped crossing changes the knot', () => {
  for (const p of knots.puzzles.slice(1)) p.parameters.pictures.forEach((pic, k) => assert.deepEqual(codeFromArcs(arcsOf(p.parameters, k), p.id).code, pic.code, `${p.id} picture ${k + 1}`));
  const q = byId('knots-02').parameters;
  const flipped = structuredClone(q.pictures[0].code); flipped.signs[0] *= -1;
  assert.notDeepEqual(codeFromArcs(arcsOf(q, 0), 'trefoil').code, flipped, 'a flipped sign in the stored code is caught');
  assert.ok(samePolynomial(jonesOfCode(q.pictures[0].code), JONES.trefoil));
  // Draw the trefoil again with its first crossing the other way up.
  const raw = drawings.trefoil(), {box} = aspectOf(raw), pic = placed(raw, box);
  const sign = x => -Math.sign(x.a.dir[0] * x.b.dir[1] - x.a.dir[1] * x.b.dir[0]);
  let first = true;
  const d = diagram(pic.strands, x => { const a = sign(x) === -1 ? 'a' : 'b'; if (!first) return a; first = false; return a === 'a' ? 'b' : 'a'; });
  assert.deepEqual(codeFromArcs(d.arcs.map((a, index) => ({d: a, index, pic: 0})), 'flipped').code, d.code, 'the flipped drawing’s code is read from its arcs');
  assert.ok(samePolynomial(jonesOfCode(d.code), JONES.plain), 'the trefoil with one crossing flipped is a plain loop');
  assert.ok(!samePolynomial(jonesOfCode(d.code), JONES.trefoil));
});

test('complete: nine crossings; each has one answer, and a wrong one clashes', () => {
  const p = byId('knots-01'), q = p.parameters;
  let a = freshAttempt(p);
  assert.equal(completions(q).length, 1);
  const right = completions(q)[0];
  const free = q.crossings.map(x => x.under[1]);
  const wrongColour = (right[free[0]] + 1) % 3;
  a = play(p, a, paint(free[0], wrongColour));
  assert.equal(crossingState(q, a.board.colours, q.crossings[0]), 'clash');
  assert.match(view(p, a), /kn-cross clash/);
  a = play(p, a, ...free.map(i => paint(i, right[i])));
  assert.ok(isSolved(p, a.board), 'the Latin square solves it');
  assert.equal(move(p, freshAttempt(p), paint(q.crossings[0].over, 1)), null, 'a given arc stays as it is');
});

test('One colour only: refused on the trefoil, kept on the figure-eight with a clash from each crossing', () => {
  const t = byId('knots-02');
  let a = play(t, freshAttempt(t), {type: 'claim'});
  assert.equal(a.board.claim, 'refused');
  assert.match(visibleText(view(t, a)), /More than one colour works\./);
  assert.equal(move(t, a, {type: 'claim'}), null, 'one claim until the colours change');
  a = play(t, a, paint(0, 0));
  assert.equal(a.board.claim, null, 'a colour change clears the refusal');
  a = play(t, a, paint(1, 1), paint(2, 2));
  assert.ok(isSolved(t, a.board), 'three colours solve it');

  const f = byId('knots-06'), q = f.parameters;
  let b = play(f, freshAttempt(f), paint(0, 0), paint(1, 1));
  b = play(f, b, {type: 'claim'});
  assert.ok(isSolved(f, b.board), 'a true claim solves it');
  knotsMechanics.knots.reset(f);
  let html = playView(f, b, {pack, selected: null, message: ''});
  assert.match(html, /Two colours here force a clash\./);
  assert.equal((html.match(/data-seed="/g) || []).length, q.crossings.length, 'each crossing can start the clash');
  assert.match(html, /kn-cross clash/);
  assert.match(html, /aria-pressed="true"/);
  for (let i = 0; i < q.crossings.length; i++) assert.ok(certificate(q, i).clash, `the clash from crossing ${i + 1}`);
  knotsMechanics.knots.ui(f, {seed: 2});
  html = playView(f, b, {pack, selected: null, message: ''});
  assert.match(html, /data-seed="2" role="button" tabindex="0" data-focus="kn-seed-2" aria-label="Start the clash at crossing 3" aria-pressed="true"/);
  assert.doesNotMatch(html, /data-arc=/, 'no arc is a control once solved');
});

test('Can’t: the dots on the bend, possible and impossible', () => {
  const yes = byId('knots-03'), no = byId('knots-04');
  const a = play(yes, freshAttempt(yes), {type: 'claim'});
  assert.equal(a.board.claim, 'refused');
  assert.match(visibleText(view(yes, a)), /It can be done\./);
  const solved = play(yes, freshAttempt(yes), ...paintAll(completions(yes.parameters)[0]));
  assert.ok(isSolved(yes, solved.board));
  const b = play(no, freshAttempt(no), {type: 'claim'});
  assert.ok(isSolved(no, b.board));
  const html = view(no, b);
  assert.match(html, /The end dots force a clash\./);
  assert.match(html, /kn-end clash|kn-cross clash/);
  assert.equal((html.match(/data-seed=/g) || []).length, 0, 'the dots start this clash');
});

test('find every: kept when made, found already, there is another, That’s all; Undo keeps the shelf', () => {
  const p = byId('knots-05'), all = completions(p.parameters);
  let a = play(p, freshAttempt(p), ...paintAll(all[0]));
  assert.deepEqual(a.board.found, [keyOf(all[0])]);
  a = play(p, a, {type: 'all'});
  assert.deepEqual(a.board.told, {kind: 'more'});
  assert.match(visibleText(view(p, a)), /There is another\./);
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all waits for a new colouring');
  a = play(p, a, ...paintAll(all[1]).filter((m, i) => a.board.colours[i] !== m.colour));
  assert.equal(a.board.told, null);
  const before = a;
  a = play(p, a, ...paintAll(all[0]).filter((m, i) => a.board.colours[i] !== m.colour));
  assert.deepEqual(a.board.told, {kind: 'again', key: keyOf(all[0])});
  assert.match(visibleText(view(p, a)), /Found already\./);
  assert.match(view(p, a), /<li class="again">/);
  const back = undo(a), carried = knotsMechanics.knots.carry(p, a.board, back.board);
  assert.deepEqual(carried.found, a.board.found, 'Undo keeps the colourings found');
  assert.ok(validBoard(p, carried));
  for (const c of all.slice(2)) a = play(p, a, ...paintAll(c).filter((m, i) => a.board.colours[i] !== m.colour));
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  const html = visibleText(view(p, before));
  assert.doesNotMatch(html, /\b\d+\s*(of|found|left)\b/i, 'no counter on the board');
});

test('before and after: matched dots clash until they agree', () => {
  const p = byId('knots-07'), q = p.parameters, right = completions(q)[0];
  const second = q.ends.findIndex(e => e.pic === 1 && Number.isInteger(e.match));
  const partner = q.ends[q.ends[second].match];
  let a = play(p, freshAttempt(p), paint(q.ends[second].arc, (right[partner.arc] + 1) % 3), paint(partner.arc, right[partner.arc]));
  assert.match(view(p, a), /kn-end clash/);
  a = play(p, a, ...paintAll(right).filter((m, i) => a.board.colours[i] !== m.colour));
  assert.ok(isSolved(p, a.board));
  const html = view(p, freshAttempt(p));
  assert.equal((html.match(/class="kn-board"/g) || []).length, 2, 'two pictures');
  assert.match(html, /kn-arrow/);
  assert.match(html, /aria-label="the second picture’s bend, no colour\. Change colour"/);
});

test('hints: the first hint, then named arcs toward the nearest answer, and the claim when it is true', () => {
  for (const p of knots.puzzles.slice(1)) {
    const fresh = freshAttempt(p), h = nextHint(p, fresh);
    assert.equal(h.type, 'move', `${p.id}: a first hint`);
    const card = playView(p, {...fresh, hintLevel: 1}, {pack, selected: null, message: ''});
    assert.ok(card.includes(p.hints[0].replace(/’/g, '&#39;')) || card.includes(p.hints[0]), `${p.id}: the authored first hint`);
  }
  const t = byId('knots-02');
  let a = play(t, freshAttempt(t), paint(0, 0), paint(1, 0));
  const h = nextHint(t, a);
  assert.equal(h.action.type, 'paint');
  assert.match(h.text, /^Make the (top|bottom left|bottom right) arc (red|blue|yellow)\.$/);
  assert.match(nextHint(byId('knots-06'), freshAttempt(byId('knots-06'))).text, /Press One colour only\./);
  assert.match(nextHint(byId('knots-04'), freshAttempt(byId('knots-04'))).text, /Press Can’t\./);
  const marked = playView(t, {...a, hintLevel: 2}, {pack, selected: null, message: ''});
  assert.match(marked, /kn-arc[^"]*hinted/, 'level 2 marks the arc');
});

test('the playground: seven knots, Clear, never solved, no Hint', () => {
  const p = byId('knots-playground'), q = p.parameters;
  assert.equal(q.knots.length, 7);
  assert.equal(knotsMechanics.knots.noHint(p), true);
  let a = freshAttempt(p);
  a = play(p, a, {type: 'knot', knot: 1}, paint(0, 0), paint(1, 1), paint(2, 2));
  assert.ok(!isSolved(p, a.board));
  assert.match(view(p, a), /kn-cross ok/);
  a = play(p, a, {type: 'clear'});
  assert.ok(a.board.colours.every(c => c === null));
  assert.equal(move(p, a, {type: 'clear'}), null);
  const html = view(p, a);
  assert.equal((html.match(/class="secondary kn-pick"/g) || []).length, 7);
  assert.match(html, /aria-label="Trefoil"/);
});

test('forged saves are rejected', () => {
  const t = byId('knots-02'), f = byId('knots-06'), e = byId('knots-05');
  const fresh = p => freshAttempt(p).board;
  assert.equal(validBoard(t, {...fresh(t), claim: 'kept'}), false, 'a false claim kept');
  assert.equal(validBoard(f, {...fresh(f), claim: 'refused'}), false, 'a true claim refused');
  assert.equal(validBoard(e, {...fresh(e), done: true}), false, 'done with colourings missing');
  assert.equal(validBoard(e, {...fresh(e), found: ['012', '012']}), false, 'a colouring found twice');
  assert.equal(validBoard(t, {...fresh(t), colours: [0, 1]}), false, 'too few arcs');
  const g = byId('knots-01');
  assert.equal(validBoard(g, {colours: fresh(g).colours.map((c, i) => i === 0 ? (c + 1) % 3 : c)}), false, 'a given arc changed');
});

test('every puzzle renders its board; one short objective at most; no count asked or shown', () => {
  for (const p of knots.puzzles) {
    const a = freshAttempt(p), html = view(p, a);
    assert.match(html, new RegExp(`data-puzzle-id="${p.id}"`));
    assert.match(html, /class="kn-puzzle/);
    const q = p.parameters.mode === 'playground' ? p.parameters.knots[0] : p.parameters;
    assert.equal((html.match(/class="kn-arc/g) || []).length, q.arcs.length, `${p.id}: every arc drawn`);
    const locked = (q.locked || []).filter(c => c !== null).length;
    assert.equal((html.match(/data-arc="/g) || []).length, q.arcs.length - locked, `${p.id}: free arcs are controls, given ones are not`);
    assert.doesNotMatch(visibleText(html), /\b(how many|count|\d+ of \d+)\b/i, `${p.id}: no count`);
    assert.ok(p.visibleObjective.length <= 60, `${p.id}: a short objective`);
  }
});
