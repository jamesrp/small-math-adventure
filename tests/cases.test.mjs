// The shared case engine (dist/cases.js): listing every case, the honest
// shelf, groups, and the drawing of cups, shelves, bins, hoops and catalogs.
// The families that use it test their own rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {permutations, sequences, rowsOf, isRow, atHome, differences, keepCase, missingCases, claimCases, validShelf, nearestCase, groupCases, hoopCases, evenGroups, shelfHTML, binsHTML, hoopsHTML, catalogHTML, cupsBoard, cupMini, swapRow} from '../dist/cases.js';

const mini = key => `<b>${key}</b>`, say = key => `row ${key}`;

test('every case: permutations in dictionary order, sequences, rows of cups', () => {
  assert.deepEqual(permutations([1, 2, 3]).map(p => p.join('')), ['123', '132', '213', '231', '312', '321']);
  assert.deepEqual(permutations([]), [[]]);
  assert.equal(sequences(['R', 'B'], 3).length, 8);
  assert.deepEqual(sequences(['R', 'B'], 2).map(s => s.join('')), ['RR', 'RB', 'BR', 'BB']);
  assert.equal(rowsOf(5).length, 120);
  assert.equal(rowsOf(4)[0], 'ABCD');
  assert.equal(isRow(3, 'CAB'), true);
  assert.equal(isRow(3, 'CAA'), false);
  assert.equal(isRow(3, 'ABCD'), false);
  assert.deepEqual(atHome('ACB'), ['A']);
  assert.equal(differences('ABCD', 'BACD'), 2);
  assert.equal(swapRow('ABCD', 0, 3), 'DBCA');
});

test('the shelf keeps a case once, only if it counts, and That’s all needs every one', () => {
  const target = ['BCA', 'CAB'], counts = key => target.includes(key);
  assert.deepEqual(keepCase([], 'BCA', counts), ['BCA']);
  assert.equal(keepCase(['BCA'], 'BCA', counts), null, 'once');
  assert.equal(keepCase([], 'ABC', counts), null, 'only if it counts');
  assert.equal(keepCase(['BCA'], 'CAB', counts, 1), null, 'within the limit');
  assert.deepEqual(missingCases(target, ['CAB']), ['BCA']);
  assert.deepEqual(claimCases(target, ['CAB']), {claimed: false, missed: true});
  assert.deepEqual(claimCases(target, ['CAB', 'BCA']), {claimed: true, missed: false});
  assert.equal(validShelf({kept: ['CAB'], claimed: false, missed: true}, target), true);
  assert.equal(validShelf({kept: ['CAB'], claimed: true, missed: false}, target), false, 'claimed with one missing');
  assert.equal(validShelf({kept: target, claimed: false, missed: true}, target), false, 'missed with none missing');
  assert.equal(validShelf({kept: ['ABC'], claimed: false, missed: false}, target), false, 'a case that does not count');
  assert.equal(validShelf({kept: ['CAB', 'CAB'], claimed: false, missed: false}, target), false, 'a repeat');
  assert.equal(nearestCase(['DCBA', 'BADC', 'ABDC'], 'ABCD'), 'ABDC');
});

test('groups: bins are disjoint, hoops may overlap, and even groups have equal weight', () => {
  const keys = ['ABC', 'ACB', 'CBA', 'BCA'];
  const bins = groupCases(keys, [{id: 'A'}, {id: 'B'}, {id: 'C'}], key => key[0]);
  assert.deepEqual(bins.map(b => b.keys), [['ABC', 'ACB'], ['BCA'], ['CBA']]);
  assert.equal(evenGroups(bins), false);
  assert.equal(evenGroups(groupCases(['AB', 'BA'], [{id: 'A'}, {id: 'B'}], key => key[0])), true);
  const hoops = [{has: key => key[0] === 'A'}, {has: key => key[1] === 'B'}];
  assert.deepEqual(hoopCases(keys, hoops), {left: ['ACB'], both: ['ABC'], right: ['CBA'], outside: ['BCA']});
});

test('drawing: a shelf of buttons that load, columns, two hoops and a catalog', () => {
  const shelf = shelfHTML(['BCA', 'CAB'], {mini, say, current: 'CAB', load: true});
  assert.equal((shelf.match(/data-case="/g) || []).length, 2);
  assert.match(shelf, /class="case-kept current"[^>]*data-case="CAB"[^>]*aria-label="row CAB, on the board"/);
  assert.equal(shelfHTML([], {mini, say}), '', 'an empty shelf draws nothing');
  assert.doesNotMatch(shelfHTML(['BCA'], {mini, say}), /data-case/, 'without load the cases are pictures');
  const bins = binsHTML(['BCA'], [{id: 'B', label: 'B'}, {id: 'C', label: 'C'}], key => key[0], {mini, say, always: true});
  assert.equal((bins.match(/class="case-bin"/g) || []).length, 2, 'empty bins keep their place');
  const hoops = hoopsHTML(['ABC', 'ACB', 'CBA'], [{label: 'A', say: 'A at home', has: k => k[0] === 'A'}, {label: 'B', say: 'B at home', has: k => k[1] === 'B'}], {mini, say});
  assert.match(hoops, /case-hoop-part both" aria-label="A at home and B at home"><ol class="case-list"><li class="case-kept" aria-label="row ABC">/);
  assert.doesNotMatch(hoops, /outside/, 'no outside part when every case is in a hoop');
  const cat = catalogHTML(['ABC', 'BCA', 'CAB'], [{id: 'A', label: 'A'}, {id: 'B', label: 'B'}, {id: 'C', label: 'C'}], k => k[0], {mini, say, mark: k => k === 'ABC' ? 'no' : 'yes'});
  assert.match(cat, /case-kept no/);
  assert.equal((cat.match(/case-kept yes/g) || []).length, 2);
  // No count of how many there are, anywhere.
  for (const html of [shelf, bins, hoops, cat]) assert.doesNotMatch(html, /\d+ of \d+/);
});

test('cups: one button per home, a pinned cup stays, and a cup at home marks its home', () => {
  const html = cupsBoard('DBCA', {pinned: ['A'], picked: 1, hinted: [2, 3]});
  assert.equal((html.match(/data-cup="/g) || []).length, 4);
  assert.match(html, /data-cup="0"[^>]*aria-label="Home A: cup D, stays put"[^>]*aria-disabled="true"/);
  assert.match(html, /selected[^"]*" data-cup="1"[^>]*aria-label="Home B: cup B, at home, chosen"/);
  assert.equal((html.match(/case-home at-home/g) || []).length, 2, 'B and C are at home');
  assert.equal((html.match(/ hinted/g) || []).length, 2);
  assert.match(cupsBoard('ABC', {still: true}), /aria-disabled="true"[^]*aria-disabled="true"[^]*aria-disabled="true"/);
  assert.equal((cupMini('CAB').match(/<i class="cm/g) || []).length, 3);
});
