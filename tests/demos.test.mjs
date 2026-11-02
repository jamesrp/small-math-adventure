// How to play's demos (dist/demo.js, docs/demos.md): every demo plays legal
// steps on a board that is no puzzle's, and draws at every step.
import test from 'node:test';
import assert from 'node:assert/strict';
import {demoEntry, demoKey, demoPuzzle, demoFrames} from '../dist/demo.js';
import {boardHTML} from '../dist/ui.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {loadPack} from '../scripts/packs.mjs';

const {puzzles} = await loadPack();
// What makes a board: a seam mechanic's parameters, or the first mechanics' own fields.
const BOARD_FIELDS = ['start', 'target', 'edges', 'cells', 'cols', 'rows', 'tileShape'];
const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => [k, sorted(value[k])])) : value;
const boardOf = p => JSON.stringify(sorted(isExpansion(p) ? p.parameters : Object.fromEntries(BOARD_FIELDS.map(k => [k, p[k]]))));

// One case per demo: the first puzzle of each mechanic, and of each variant a demo names.
const cases = [], seen = new Set();
for (const p of puzzles) {
  const entry = demoEntry(p), key = entry && `${p.mechanic}|${demoKey(entry)}`;
  if (!entry || seen.has(key)) continue;
  seen.add(key);
  cases.push({key, entry, demo: demoPuzzle(p, puzzles, entry)});
}

test('every puzzle mechanic and mode has a How to play demo', () => {
  for (const p of puzzles)
    assert.ok(demoEntry(p), `${p.id} (${p.mechanic}, ${p.parameters?.mode ?? 'default'}): has a demo`);
});

test('every demo plays a few legal steps', () => {
  for (const {key, entry, demo} of cases) {
    assert.ok(Array.isArray(entry.steps) && entry.steps.length >= 1 && entry.steps.length <= 8, `${key}: 1 to 8 steps`);
    for (const step of entry.steps) {
      assert.ok(step && (Object.hasOwn(step, 'move') !== Object.hasOwn(step, 'ui')), `${key}: each step is a move or a ui change`);
      for (const field of Object.keys(step)) assert.ok(['move', 'ui', 'taps', 'view', 'drag'].includes(field), `${key}: step field ${field}`);
      for (const tap of step.taps || []) assert.ok(typeof tap === 'string' || (tap && typeof tap.after === 'string' && Object.keys(tap).length === 1), `${key}: a tap is a selector or {after: selector}`);
      if (Object.hasOwn(step, 'drag')) assert.ok(step.drag === true && (step.taps || []).length >= 2, `${key}: a drag names where it starts and ends`);
    }
    assert.ok(entry.steps.some(step => Object.hasOwn(step, 'move')), `${key}: at least one move`);
    assert.ok(demoFrames(demo, entry), `${key}: every move is legal and changes the board`);
  }
});

test('a demo board is no puzzle\'s board', () => {
  for (const {key, demo} of cases) {
    const own = boardOf(demo);
    const same = puzzles.filter(q => q.mechanic === demo.mechanic && boardOf(q) === own).map(q => q.id);
    assert.deepEqual(same, [], `${key}: its board differs from every puzzle's`);
  }
});

test('every demo frame draws, and a ui step changes the drawing', () => {
  for (const {key, entry, demo} of cases) {
    const frames = demoFrames(demo, entry);
    if (isExpansion(demo)) mechanicFor(demo).reset?.(demo);
    let before = boardHTML(demo, frames[0].attempt, {demo: true});
    for (const {attempt, step} of frames.slice(1)) {
      if (Object.hasOwn(step, 'ui')) mechanicFor(demo).ui?.(demo, step.ui);
      const after = boardHTML(demo, attempt, {...(step.view || {}), demo: true});
      assert.ok(typeof after === 'string' && after.length > 0, `${key}: draws`);
      if (Object.hasOwn(step, 'ui')) assert.notEqual(after, before, `${key}: ui step ${JSON.stringify(step.ui)} changes the board`);
      before = after;
    }
    if (isExpansion(demo)) mechanicFor(demo).reset?.(demo);
  }
});

test('every variant a demo names is some puzzle\'s, and has a name', () => {
  const mechanics = new Set(puzzles.map(p => p.mechanic));
  for (const mechanic of mechanics) {
    const p = puzzles.find(q => q.mechanic === mechanic), own = demoEntry(p) && (isExpansion(p) ? mechanicFor(p).howTo : null);
    if (!own) continue;
    const list = Array.isArray(own) ? own : [own], keys = list.map(demoKey);
    assert.equal(new Set(keys).size, keys.length, `${mechanic}: each entry has its own variant name (${keys.join(', ')})`);
    for (const entry of list) {
      if (typeof entry.when === 'function') assert.ok(typeof entry.variant === 'string' && entry.variant, `${mechanic}: a when test comes with a variant name`);
      if (entry.mode === undefined && entry.when === undefined) continue;
      assert.ok(puzzles.some(q => q.mechanic === mechanic && demoEntry(q) === entry), `${mechanic}|${demoKey(entry)}: shown for some puzzle`);
    }
  }
});
