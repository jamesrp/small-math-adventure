// Knot colours: the crossing rule, colourings and claims, the crossing codes
// rebuilt from the drawings (and a flipped crossing caught), completing,
// One colour only and Can't with their certificates, finding every colouring,
// matched end dots, hints, the playground, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {knotsMechanics, works, nextColour, completions, nonConstant, claimTrue, certificate, chains, claimCheck, crossingState, keyOf} from '../dist/families/knots/knots.js';
import {codeFromArcs, jonesOfCode, JONES, samePolynomial, bruteColourings} from '../scripts/validate-knots.mjs';
import {diagram, drawings, placed, aspectOf} from '../scripts/build-knots.mjs';
import {loadPack} from '../scripts/packs.mjs';

const knots = JSON.parse(await readFile(new URL('../dist/families/knots/knots.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => knots.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const paint = (arc, colour) => ({type: 'paint', arc, colour});
const paintAll = colours => colours.map((c, i) => paint(i, c));
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
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

test('One colour only is the child’s chain: refusals say what is missing, never whether the claim is true', () => {
  const t = byId('knots-02'), f = byId('knots-06'), s = byId('knots-10'), q = f.parameters;
  // On a blank board the trefoil (false claim) and the figure-eight (true) get the same words.
  for (const p of [t, f]) {
    const a = play(p, freshAttempt(p), {type: 'claim'});
    assert.equal(a.board.claim, 'refused', `${p.id}: no chain yet`);
    assert.match(visibleText(view(p, a)), /No crossing is all different\./);
    assert.equal(move(p, a, {type: 'claim'}), null, 'one claim until the colours change');
    assert.equal(play(p, a, paint(0, 0)).board.claim, null, 'a colour change clears the refusal');
  }
  // A crossing all different and nothing more: the same words for the figure-eight and the stevedore knot.
  const seedOnly = p => { const x = p.parameters.crossings[0], c = certificate(p.parameters, 0).colours; return [x.over, ...x.under].map(i => paint(i, c[i])); };
  for (const p of [f, s]) {
    const a = play(p, play(p, freshAttempt(p), ...seedOnly(p)), {type: 'claim'});
    assert.equal(a.board.claim, 'refused', `${p.id}: no clash yet`);
    assert.match(visibleText(view(p, a)), /No clash yet\./);
  }
  // An arc that no chain from the all-different crossing forces is ringed, though the claim is true.
  const c5 = byId('knots-09'), q5 = c5.parameters, x5 = q5.crossings[0], start5 = [x5.over, ...x5.under];
  const [odd, wrong] = q5.arcs.flatMap((_, i) => start5.includes(i) ? [] : [0, 1, 2].map(v => [i, v]))
    .find(([i, v]) => { const cols = q5.arcs.map(() => null); for (const m of seedOnly(c5)) cols[m.arc] = m.colour; cols[i] = v; return claimCheck(q5, cols).reason === 'loose'; });
  let b = play(c5, freshAttempt(c5), ...seedOnly(c5), paint(odd, wrong), {type: 'claim'});
  assert.equal(b.board.claim, 'refused');
  assert.match(visibleText(view(c5, b)), /Ringed arcs aren’t forced\./);
  assert.match(view(c5, b), new RegExp(`class="kn-arc loose" data-arc="${odd}"`));
  const chain = certificate(q, 0);
  // The chain built arc by arc, in the order it forces them, is accepted.
  b = play(f, freshAttempt(f), ...chain.order.map(i => paint(i, chain.colours[i])), {type: 'claim'});
  assert.equal(b.board.claim, 'kept');
  assert.ok(isSolved(f, b.board), 'a certificate solves it');
  const html = view(f, b);
  assert.match(html, /kn-cross clash/, 'the clash stays on the board');
  assert.match(html, /kn-cross ok seed/, 'the starting crossing is ringed');
  assert.doesNotMatch(html, /data-arc=/, 'no arc is a control once solved');
  const row = html.match(/<ul class="kn-shelf kn-clashes" aria-label="A clash from each crossing">([^]*?)<\/ul>/);
  assert.ok(row, 'a row of clashes');
  assert.equal((row[1].match(/<li>/g) || []).length, q.crossings.length, 'one small picture for each crossing');
  for (let i = 0; i < q.crossings.length; i++) {
    assert.ok(certificate(q, i).clash, `the clash from crossing ${i + 1}`);
    assert.match(row[1], new RegExp(`aria-label="From crossing ${i + 1} to a clash"`));
  }
  assert.doesNotMatch(visibleText(row[1]), /\w/, 'the row has no words');
  // A false claim is never accepted, whatever is on the board.
  for (const p of [t, s, byId('knots-08')]) assert.equal(chains(p.parameters).length, 0, `${p.id}: no chain ends in a clash`);
});

test('Can’t is the chain from the dots, on the bend that can and the bend that can’t', () => {
  const yes = byId('knots-03'), no = byId('knots-04');
  for (const p of [yes, no]) {
    const a = play(p, freshAttempt(p), {type: 'claim'});
    assert.equal(a.board.claim, 'refused', `${p.id}: nothing on the board yet`);
    assert.match(visibleText(view(p, a)), /No clash yet\./);
  }
  const solved = play(yes, freshAttempt(yes), ...paintAll(completions(yes.parameters)[0]));
  assert.ok(isSolved(yes, solved.board));
  // An arc coloured against what the dots force is ringed, not accepted.
  let b = play(no, freshAttempt(no), paint(0, 0), paint(1, 1), paint(2, 1), paint(3, 0), {type: 'claim'});
  assert.equal(b.board.claim, 'refused');
  assert.match(visibleText(view(no, b)), /Ringed arcs aren’t forced\./);
  const [chain] = chains(no.parameters);
  b = play(no, freshAttempt(no), ...chain.order.map(i => paint(i, chain.colours[i])), {type: 'claim'});
  assert.ok(isSolved(no, b.board));
  const html = view(no, b);
  assert.match(html, /kn-end clash|kn-cross clash/);
  assert.doesNotMatch(html, /kn-clashes/, 'the dots start this chain, so there is no row');
  // Following the crossings to red on the right arc clashes with its blue dot: also a chain.
  b = play(no, freshAttempt(no), paint(0, 0), paint(3, 0), paint(1, 0), paint(2, 0), {type: 'claim'});
  assert.equal(b.board.claim, 'kept');
  assert.match(view(no, b), /kn-end clash/);
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

test('pull the bend off: every way to colour both pictures with matching dots', () => {
  const p = byId('knots-07'), q = p.parameters, all = completions(q);
  assert.equal(all.length, 9);
  for (const c of all) assert.ok(q.ends.every(e => !Number.isInteger(e.match) || c[e.arc] === c[q.ends[e.match].arc]), 'matched dots agree');
  const second = q.ends.findIndex(e => e.pic === 1 && Number.isInteger(e.match));
  const partner = q.ends[q.ends[second].match];
  let a = play(p, freshAttempt(p), paint(q.ends[second].arc, 1), paint(partner.arc, 0));
  assert.match(view(p, a), /kn-end clash/);
  for (const c of all) a = play(p, a, ...paintAll(c).filter((m, i) => a.board.colours[i] !== m.colour));
  assert.equal(a.board.found.length, 9);
  assert.match(view(p, a), /<ul class="kn-shelf wide" aria-label="Colourings found">/);
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  const html = view(p, freshAttempt(p));
  assert.equal((html.match(/class="kn-board"/g) || []).length, 2, 'two pictures');
  assert.match(html, /kn-arrow/);
  assert.match(html, /aria-label="the second picture’s bend, no colour, ends at two dots matched with the other picture\. Change colour"/);
});

test('arcs say which end dots they reach', () => {
  const html = view(byId('knots-03'), freshAttempt(byId('knots-03')));
  assert.match(html, /aria-label="the bend, no colour, ends at two blue dots\. Change colour"/);
  assert.match(html, /aria-label="the left arc, no colour, ends at a red dot\. Change colour"/);
  assert.match(html, /aria-label="the middle arc, no colour\. Change colour"/);
  const pair = view(byId('knots-12'), freshAttempt(byId('knots-12')));
  assert.match(pair, /aria-label="the first picture’s curved arc, no colour, ends at two dots matched with the other picture\. Change colour"/);
  assert.match(pair, /aria-label="the first picture’s top left arc, no colour, ends at a red dot\. Change colour"/);
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
  // On a true claim, hints walk a chain arc by arc and say to press only once it is on the board.
  for (const id of ['knots-04', 'knots-06', 'knots-09', 'knots-11']) {
    const p = byId(id), q = p.parameters, press = q.claim === 'one' ? 'Press One colour only.' : 'Press Can’t.';
    let a = freshAttempt(p), steps = 0;
    while (!isSolved(p, a.board)) {
      const h = nextHint(p, a);
      if (h.action.type === 'claim') {
        assert.equal(h.text, press);
        assert.ok(claimCheck(q, a.board.colours).ok, `${id}: press only on a chain`);
      } else {
        assert.equal(h.action.type, 'paint', `${id}: colour an arc first`);
        assert.match(h.text, /^Make the .+ (red|blue|yellow)\.$/);
      }
      a = play(p, a, h.action);
      assert.ok(++steps <= q.arcs.length + 1, `${id}: the hints finish`);
    }
    assert.equal(a.board.claim, 'kept');
  }
  assert.equal(byId('knots-12').hints[0].startsWith('In the first picture,'), true);
  const marked = playView(t, {...a, hintLevel: 2}, {pack, selected: null, message: ''});
  assert.match(marked, /kn-arc[^"]*hinted/, 'level 2 marks the arc');
});

test('the tap target of an arc ends square at its crossing', async () => {
  const css = await readFile(new URL('../dist/families/knots/knots.css', import.meta.url), 'utf8');
  assert.match(css, /\.kn-arc \.kn-hit\{[^}]*stroke-linecap:butt/, 'a round cap would reach over the under gap into the next arc');
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
  assert.equal(validBoard(f, {...fresh(f), claim: 'kept'}), false, 'a true claim kept on a blank board');
  const [chain] = chains(f.parameters);
  assert.equal(validBoard(f, {colours: chain.colours, claim: 'refused'}), false, 'a chain refused');
  assert.equal(validBoard(f, {colours: chain.colours, claim: 'kept'}), true, 'a chain kept');
  assert.equal(validBoard(f, {...fresh(f), claim: 'refused'}), true, 'a blank board refused');
  assert.equal(validBoard(byId('knots-07'), {...fresh(byId('knots-07')), found: ['000000', '012345']}), false, 'a found key that is no colouring');
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

import {nearestArc} from '../dist/families/knots/knots.js';
test('a tap goes to the nearest cord: a point drawn on an arc finds that arc among its picture', () => {
  const shapes = knots.puzzles.flatMap(p => p.parameters.mode === 'playground' ? p.parameters.knots.map((q, k) => [`${p.id} knot ${k}`, q]) : [[p.id, p.parameters]]);
  assert.ok(shapes.some(([id]) => id.includes('playground')), 'the playground knots are checked too');
  for (const [id, q] of shapes) {
    for (const [i, a] of q.arcs.entries()) {
      const group = q.arcs.map((b, k) => k).filter(k => q.arcs[k].pic === a.pic);
      assert.equal(nearestArc(q, group, a.d[Math.floor(a.d.length / 2)]), i, `${id}: arc ${i}`);
    }
  }
});
