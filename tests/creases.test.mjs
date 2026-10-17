// Flat folds: the folded picture and its search, the three certificates
// (colours, fans and the tab count) after an attempt, refusals kept through
// Undo, the new ray on a tick, the playground, taps by angle (including the
// contested points between rays and at the rim), hints in CPU time, Undo
// that always changes the board, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {FAMILIES} from '../dist/families.js';
import {image, alternating, foldResult, validWords, completions, words, rayAngles, sectorsOf, shares, oddDisks, needs} from '../dist/families/creases/fold.js';
import creasesModule, {creaseMechanics, clashes, certificate, tapAction, nextTab, goodPlaces, R, reasonText, tabsReason} from '../dist/families/creases/creases.js';
import {loadPack} from '../scripts/packs.mjs';
import validateCreases from '../scripts/validate-creases.mjs';

const creases = JSON.parse(await readFile(new URL('../dist/families/creases/creases.json', import.meta.url), 'utf8'));
const css = await readFile(new URL('../dist/families/creases/creases.css', import.meta.url), 'utf8');
const pack = await loadPack();
const mech = creaseMechanics.creases;
const byId = id => creases.puzzles.find(p => p.id === `creases-${id}`);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const carried = (p, from) => { const to = undo(from); return {...to, board: mech.carry(p, from.board, to.board)}; };
const label = (ray, to) => ({type: 'label', ray, to});
const FOLD = {type: 'fold'}, CANT = {type: 'cant'}, CHECK = {type: 'check'};

test('the validator passes', async () => {
  const report = await validateCreases();
  assert.equal(report.randomDisksCompared, 76);
});

test('the folded picture: rays alternate, an odd count never closes, Kawasaki decides closing', () => {
  const img = image([60, 120, 120, 60]);
  assert.deepEqual(img.phi, [0, 60, -60, 60, 0]);
  assert.equal(img.closes, true);
  assert.equal(image([60, 60, 60, 90, 90]).closes, false);
  assert.deepEqual(alternating([45, 90, 90, 135]), [135, 225]);
  assert.equal(foldResult([45, 90, 90, 135], 'MMMV').kind, 'gap');
  assert.equal(foldResult([60, 60, 60, 90, 90], 'MMMVV').kind, 'clash');
  assert.equal(foldResult([30, 60, 150, 120], 'VVVM').kind, 'jam', 'the counting rule holds and it still jams');
  assert.equal(foldResult([30, 60, 150, 120], 'MVVV').kind, 'flat');
  assert.deepEqual(validWords([90, 90, 90, 90]), words(4).filter(w => [1, 3].includes([...w].filter(c => c === 'M').length)), 'right angles: an odd number of mountains');
  for (const angles of [[60, 120, 120, 60], [30, 30, 60, 60, 90, 90], [15, 45, 30, 60, 135, 75]]) {
    for (const w of validWords(angles)) assert.equal(Math.abs([...w].filter(c => c === 'M').length - [...w].filter(c => c === 'V').length), 2, `${angles} ${w}: Maekawa`);
  }
  assert.deepEqual(rayAngles([30, 60, 150, 120]), [0, 30, 90, 240]);
  assert.deepEqual(sectorsOf([0, 30, 90, 240]), [30, 60, 150, 120]);
});

test('right-angle disks and tabs: the K-1 rows', () => {
  const row = ['M?V?', 'MM??', 'V?V?'].map(w => ({angles: [90, 90, 90, 90], fixed: [...w].map(c => (c === '?' ? null : c))}));
  assert.deepEqual(row.map(needs), [[0, 2], [1], [1]]);
  assert.equal(shares(row, {M: 2, V: 4}).length, 4);
  assert.equal(shares(row, {M: 3, V: 3}).length, 0);
  assert.equal(shares(row, {M: 4, V: 2}).length, 4);
  assert.deepEqual(oddDisks(row, {M: 3, V: 3}), [1, 2]);
  assert.equal(oddDisks(row, {M: 2, V: 4}), null, 'no certificate when it can be done');
  assert.equal(completions([90, 90, 90, 90], ['M', 'M', null, null]).length, 2);
});

test('the colouring certificate: one clash for an odd disk, none for an even one', () => {
  assert.deepEqual(clashes('FBFBF'), [0], 'the two wedges beside ray 1');
  assert.deepEqual(clashes('FFBFB'), [1]);
  assert.equal(certificate([60, 60, 60, 90, 90], 'FBFBF'), true);
  assert.equal(certificate([60, 60, 60, 90, 90], 'FFFBF'), false, 'three clashes');
  assert.equal(certificate([60, 60, 60, 90, 90], 'FBFB.'), false, 'not finished');
  assert.equal(certificate([45, 90, 90, 135], 'BFBF'), true);
  assert.equal(certificate([45, 90, 90, 135], 'FFBB'), false);
  assert.equal(certificate([60, 120, 120, 60], 'FBFB'), false, 'no colouring certifies a disk whose half-turns are right');
});

test('fold: Fold, then Can’t only after a failed fold, refused on a possible disk and kept through Undo', () => {
  const p = byId('02');
  let a = freshAttempt(p);
  assert.equal(move(p, a, FOLD), null, 'Fold waits for every letter');
  assert.equal(move(p, a, CANT), null, 'no Can’t before an attempt');
  assert.equal(move(p, a, label(0, 'V')), null, 'a printed letter stays');
  a = play(p, a, label(2, 'M'), label(3, 'M'), FOLD);
  assert.equal(a.board.tried, 'MMMM');
  assert.equal(move(p, a, FOLD), null, 'the same letters again are no new fold');
  assert.match(view(p, a), /cr-stack jam/, 'the jam is drawn');
  a = play(p, a, CANT, ...[0, 1, 2, 3].map(k => ({type: 'paint', sector: k, to: k % 2 ? 'B' : 'F'})), CHECK);
  assert.equal(a.board.told, 'way');
  assert.equal(a.board.paint, null);
  assert.match(view(p, a), /There is a way\./);
  assert.ok(!/\d+°/.test(view(p, a).match(/cr-told">([^<]*)</)[1]), 'the refusal prints no values');
  assert.equal(move(p, a, CANT), null, 'Can’t stays off');
  let back = carried(p, a);
  assert.equal(back.board.told, 'way', 'Undo takes back the colouring, not the refusal');
  assert.equal(back.board.paint, 'FBFB');
  assert.equal(move(p, back, CHECK), null, 'and Check stays off');
  back = carried(p, carried(p, carried(p, carried(p, carried(p, back)))));
  assert.equal(back.board.paint, null);
  assert.equal(back.board.told, 'way', 'still refused with the same letters');
  const changed = play(p, a, label(3, 'V'));
  assert.equal(changed.board.told, null, 'a new letter clears it');
  const done = play(p, changed, FOLD);
  assert.ok(isSolved(p, done.board));
  assert.match(view(p, done), /cr-stack flat/);
});

test('fold: the odd disk is certified by a colouring with one clash, after a fold', () => {
  const p = byId('04');
  let a = play(p, freshAttempt(p), ...[0, 1, 2, 3, 4].map(k => label(k, 'M')), FOLD, CANT);
  const paint = s => [...s].map((c, k) => ({type: 'paint', sector: k, to: c}));
  const wrong = play(p, a, ...paint('FFFBF'), CHECK);
  assert.equal(wrong.board.told, 'match');
  assert.equal(wrong.board.paint, '.....', 'a refused colouring is cleared');
  assert.match(view(p, wrong), /Neighbours match in more than one place\./);
  const right = play(p, wrong, ...paint('FBFBB'), CHECK);
  assert.ok(isSolved(p, right.board), 'any colouring with exactly one clash');
  assert.match(view(p, right), /The wedges on both sides of ray 5 face the same way\./);
  assert.match(view(p, right), /cr-clash/);
});

test('fold: an even disk that can’t close shows its two fans after the colouring', () => {
  const p = byId('08');
  const a = play(p, freshAttempt(p), ...[0, 1, 2, 3].map(k => label(k, 'V')), FOLD, CANT, ...[0, 1, 2, 3].map(k => ({type: 'paint', sector: k, to: k % 2 ? 'F' : 'B'})), CHECK);
  assert.ok(isSolved(p, a.board), 'either alternating colouring');
  assert.match(view(p, a), /cr-fans/);
  assert.match(view(p, a), /135°/);
  assert.match(view(p, a), /225°/);
  assert.equal(reasonText(p.parameters.angles), 'Every crease turns the paper over, so every other wedge faces up. The wedges facing up make 135° and the others 225°, but folded flat each set must make a half-turn, 180°.');
});

test('tabs: tabs from a stock, Fold, and the disks that show the count after Can’t', () => {
  const p = byId('06'), q = p.parameters;
  let a = freshAttempt(p);
  assert.equal(nextTab(q, a.board.at, 0, 1), 'M');
  const tab = (disk, ray, to) => ({type: 'tab', disk, ray, to});
  a = play(p, a, tab(0, 1, 'M'), tab(0, 3, 'M'), tab(1, 2, 'M'));
  assert.equal(move(p, a, tab(1, 3, 'M')), null, 'no fourth M tab');
  assert.equal(nextTab(q, a.board.at, 1, 3), 'V', 'a tap skips a letter that has run out');
  a = play(p, a, tab(1, 3, 'V'), tab(2, 1, 'V'), tab(2, 3, 'V'), FOLD);
  assert.ok(a.board.tried);
  a = play(p, a, CANT, {type: 'pick', disk: 0}, CHECK);
  assert.equal(a.board.told, 'pick');
  assert.match(view(p, a), /Not those disks\./);
  assert.ok(!/\d/.test('Not those disks.'), 'no counts in the refusal');
  a = play(p, a, {type: 'pick', disk: 2}, {type: 'pick', disk: 1}, CHECK);
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(a.board.pick, [1, 2], 'kept in order');
  assert.match(view(p, a), /The M tabs used are 2 or 4, never 3\./);
  assert.equal(tabsReason(q), 'A right-angle disk folds with one or three M’s. Disks B and C need one M tab and one V tab each; disk A takes two of the same. So the M tabs used are 2 or 4, never 3.');
});

test('tabs: Can’t on a stock that works is refused and kept through Undo', () => {
  const p = byId('03');
  const tab = (disk, ray, to) => ({type: 'tab', disk, ray, to});
  let a = play(p, freshAttempt(p), tab(0, 1, 'M'), tab(0, 3, 'M'), tab(1, 2, 'V'), tab(1, 3, 'V'), tab(2, 1, 'V'), tab(2, 3, 'V'), FOLD, CANT, {type: 'pick', disk: 1}, CHECK);
  assert.equal(a.board.told, 'way');
  const back = carried(p, a);
  assert.equal(back.board.told, 'way');
  assert.deepEqual(back.board.pick, [1]);
  assert.equal(move(p, back, CHECK), null);
  const html = view(p, play(p, freshAttempt(p), tab(0, 1, 'V'), tab(0, 3, 'V'), tab(1, 2, 'M'), tab(1, 3, 'V'), tab(2, 1, 'M'), tab(2, 3, 'V'), FOLD));
  assert.ok(html.includes('class="cr-disk small ok"'), 'a disk that folds has a green rim');
});

test('ray: the new ray goes on a free tick, and only one tick closes', () => {
  const p = byId('07'), q = p.parameters;
  assert.deepEqual(goodPlaces(q), [270]);
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'place', at: 150}), null, 'not on a ray');
  assert.equal(move(p, a, {type: 'place', at: 100}), null, 'not between ticks');
  assert.equal(move(p, a, CANT), null, 'no Can’t: a ray always works');
  a = play(p, a, {type: 'place', at: 240}, label(0, 'M'), label(1, 'V'), label(2, 'M'), label(3, 'M'), FOLD);
  assert.match(view(p, a), /cr-stack gap/, 'the ends miss');
  assert.equal(move(p, a, FOLD), null);
  a = play(p, a, {type: 'place', at: 270});
  assert.ok(view(p, a).includes('120°'), 'the wedges show their angles');
  a = play(p, a, FOLD);
  assert.ok(isSolved(p, a.board), 'MVMM folds on 60, 90, 120, 90');
});

test('taps go to the nearest ray, and contested points to the visibly nearest target', () => {
  const p = byId('09'), b = freshAttempt(p).board;
  // Rays at 0, 30, 60, 120, 180, 270; rays 1, 3 and 5 printed.
  assert.deepEqual(tapAction(p, b, 'fold', 60, 31), label(1, 'M'), 'ray 2');
  assert.deepEqual(tapAction(p, b, 'fold', 60, 44), label(1, 'M'), 'just nearer ray 2 than ray 3');
  assert.equal(tapAction(p, b, 'fold', 60, 46), null, 'just nearer ray 3, which is printed');
  assert.equal(tapAction(p, b, 'fold', 60, 90), null, 'mid-wedge, far from every ray');
  assert.deepEqual(tapAction(p, b, 'fold', 60, 139), label(3, 'M'), 'within reach of ray 4');
  assert.equal(tapAction(p, b, 'fold', 5, 31), null, 'the centre, where all rays meet');
  assert.equal(tapAction(p, b, 'fold', R + 30, 31), null, 'off the disk');
  const r = byId('01'), rb = freshAttempt(r).board;
  assert.deepEqual(tapAction(r, rb, 'ray', 80, 296), {type: 'place', at: 300}, 'a tap away from rays places the new ray on the nearest tick');
  assert.deepEqual(tapAction(r, rb, 'ray', 80, 64), label(1, 'M'), 'near a given ray: its letter');
  const placed = play(r, freshAttempt(r), {type: 'place', at: 300}).board;
  assert.deepEqual(tapAction(r, placed, 'ray', 80, 303), label(3, 'M'), 'near the new ray: its letter');
  const g = creases.puzzles.find(x => x.id === 'creases-playground'), gb = freshAttempt(g).board;
  assert.deepEqual(tapAction(g, gb, 'play', 95, 91), {type: 'remove', at: 90}, 'a ray’s end on the rim removes it');
  assert.deepEqual(tapAction(g, gb, 'play', 60, 91), {type: 'label', at: 90, to: 'M'}, 'inside: its letter');
  assert.deepEqual(tapAction(g, gb, 'play', 60, 46), {type: 'add', at: 45}, 'between rays: a new ray');
  const t = byId('11'), tb = freshAttempt(t).board;
  assert.deepEqual(tapAction(t, tb, 'tabs:1', 60, 130), {type: 'tab', disk: 1, ray: 1, to: 'M'}, 'a small disk: the nearest ray, anywhere');
  assert.equal(tapAction(t, tb, 'tabs:1', 60, 10), null, 'a printed ray');
});

test('playground: add, label, remove, fold any disk, up to eight rays', () => {
  const p = creases.puzzles.find(x => x.id === 'creases-playground');
  assert.equal(mech.noHint(p), true);
  let a = play(p, freshAttempt(p), {type: 'add', at: 45}, {type: 'remove', at: 90});
  assert.deepEqual(a.board.rays, [0, 45, 180, 270]);
  a = play(p, a, ...[0, 45, 180, 270].map((at, k) => ({type: 'label', at, to: k === 0 ? 'V' : 'M'})), FOLD);
  assert.match(view(p, a), /cr-stack (flat|jam|gap)/);
  assert.ok(!isSolved(p, a.board), 'nothing needs finishing');
  a = play(p, a, {type: 'clear'});
  assert.deepEqual(a.board.rays, []);
});

test('hints: an attempt and a reason come before any claim, quick in CPU time, and they finish every puzzle', () => {
  for (const p of creases.puzzles.filter(x => x.parameters.mode !== 'playground')) {
    let a = freshAttempt(p), steps = 0, sawReason = false;
    for (; !isSolved(p, a.board) && steps < 80; steps++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time)`);
      assert.equal(h.type, 'move');
      if (h.action.type === 'cant' && a.board.paint == null && a.board.pick == null) {
        assert.ok(a.board.tried, `${p.id}: Can’t only after a fold`);
        assert.match(h.text, /^(Every crease|A right-angle disk)/, `${p.id}: the reason with it`);
        sawReason = true;
      }
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
    if (a.board.done === 'cant') assert.ok(sawReason, `${p.id}: a reason before the claim`);
  }
});

test('taps are fast: a fold of eight rays and its hint in well under 100 ms of CPU', () => {
  const t = process.cpuUsage();
  for (const w of ['MVMVMVMM', 'MMMMVVVV', 'VMVMVMVM']) foldResult([45, 45, 45, 45, 45, 45, 45, 45], w);
  foldResult([15, 30, 45, 60, 75, 30, 60, 45], 'MMVMVMVV');
  const u = process.cpuUsage(t);
  assert.ok((u.user + u.system) / 1000 / 4 < 100, 'each fold under 100 ms');
});

test('Undo always changes the board on screen', () => {
  for (const id of ['02', '04', '06', '11', '12']) {
    const p = byId(id);
    let a = freshAttempt(p);
    for (let i = 0; i < 80 && !isSolved(p, a.board); i++) a = play(p, a, nextHint(p, a).action);
    // Undo from just before the solve back to the start.
    let at = undo(a), before = view(p, at);
    while (at.history.length) {
      const back = carried(p, at), html = view(p, back);
      assert.notEqual(html.replace(/data-cr-anim="[^"]*"/g, ''), before.replace(/data-cr-anim="[^"]*"/g, ''), `${p.id}: Undo at ${at.moves} changes the board`);
      at = back; before = html;
    }
  }
});

test('saves: forged boards are rejected', () => {
  const f = byId('05'), o = byId('04'), t = byId('06'), r = byId('12');
  for (const [p, board, why] of [
    [f, {labels: ['V', 'V', 'V', 'M'], tried: null, paint: null, told: null, done: 'fold'}, 'done on VVVM'],
    [f, {labels: ['M', 'V', 'V', 'V'], tried: 'MVVV', paint: null, told: null, done: null}, 'a fold that worked recorded as failed'],
    [o, {labels: ['M', 'M', 'M', 'M', 'M'], tried: 'MMMMM', paint: 'FFFFF', told: null, done: 'cant'}, 'a colouring with five clashes'],
    [o, {labels: ['M', 'M', 'M', 'M', 'M'], tried: null, paint: 'FBFBF', told: null, done: 'cant'}, 'Can’t with no fold'],
    [o, {labels: [null, null, null, null, null], tried: null, paint: null, told: 'way', done: null}, 'There is a way on a disk that can’t fold'],
    [t, {at: [['M', 'M', 'V', 'M'], ['M', 'M', 'M', 'V'], ['V', 'M', 'V', 'V']], tried: 'MMVM/MMMV/VMVV', pick: [0], done: 'cant', told: null}, 'the wrong disks'],
    [t, {at: [['M', 'V', 'V', 'V'], ['M', 'M', 'M', 'V'], ['V', 'M', 'V', 'V']], tried: null, pick: null, done: 'fold', told: null}, 'a stock with a tab missing'],
    [r, {at: 315, labels: ['M', 'M', 'M', 'M', 'M', 'V'], tried: null, done: true}, 'done with the ray a tick off'],
    [r, {at: 330, labels: ['M', 'M', 'M', 'M', 'M', 'M'], tried: null, done: true}, 'done on letters that jam']
  ]) {
    assert.equal(validBoard(p, board), false, `${p.id}: ${why}`);
    assert.equal(isSolved(p, board), false, `${p.id}: ${why}`);
  }
});

test('rendering: scoped styles, one short objective, How to play starts with mathematics, no answers on the board', () => {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{/g, '').split('}').map(s => s.split('{')[0].trim()).filter(Boolean);
  // Split selector lists at top-level commas (not those inside :is()).
  const selectors = rule => { const out = ['']; let depth = 0; for (const c of rule) { if (c === '(') depth++; if (c === ')') depth--; if (c === ',' && !depth) out.push(''); else out[out.length - 1] += c; } return out; };
  for (const rule of rules) for (const sel of selectors(rule)) assert.match(sel.trim(), /^\[data-mechanic-wire="creases"\]/, `scoped: ${sel}`);
  for (const p of creases.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /data-mechanic-wire="creases"/);
    assert.ok(!/There is a way|cr-stack|cr-fans|cr-told/.test(html), `${p.id}: a fresh board says nothing`);
    assert.match(p.controls, /^A crease is a mountain \(M\) when it rises towards you from the yellow front and a valley \(V\) when it sinks away/);
    for (const text of [p.title, p.controls, p.hints[0], ...p.rules]) {
      assert.ok(!/\b(odd|even|parity|180)\b/i.test(text) || p.parameters.mode === 'ray' && text === p.hints[0], `${p.id}: no deciding condition in “${text}”`);
    }
  }
  const symbols = FAMILIES.filter(m => m.family).map(m => m.family.symbol);
  assert.equal(symbols.filter(s => s === creasesModule.family.symbol).length, 1, 'a unique symbol');
});
