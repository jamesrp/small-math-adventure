// The family seam (dist/families.js): what every module must deliver, and the
// shared rules the app applies to all of them. See docs/ADDING-A-FAMILY.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {FAMILIES, newFamilies} from '../dist/families.js';
import {expansionMechanics, playInstructions} from '../dist/expansion.js';
import {motionMechanics} from '../dist/motion.js';
import {networkMechanics} from '../dist/networks.js';
import {deductionMechanics} from '../dist/deduction.js';
import {measurementMechanics} from '../dist/measurement.js';
import {freshAttempt, validBoard} from '../dist/engine.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView} from '../dist/ui.js';
import {puzzleObjective, visiblePuzzleObjective} from '../dist/puzzle-copy.js';
import {loadPack} from '../scripts/packs.mjs';

const root = new URL('../', import.meta.url);
const pack = await loadPack();
const base = JSON.parse(await readFile(new URL('dist/puzzles.json', root), 'utf8'));
const baseMechanics = ['tile', 'swap', ...Object.keys({...motionMechanics, ...networkMechanics, ...deductionMechanics, ...measurementMechanics})];
const baseFamilies = new Set(base.puzzles.map(p => p.libraryFamily || p.mechanic));
const familyOf = p => p.libraryFamily || p.mechanic;
const profile = {id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts: {}};
const packOf = async m => JSON.parse(await readFile(new URL(m.pack), 'utf8'));

test('each module has a unique id and its own mechanics with every required hook', () => {
  assert.ok(FAMILIES.length >= 2);
  assert.equal(new Set(FAMILIES.map(m => m.id)).size, FAMILIES.length, 'module ids are unique');
  const seen = new Set(baseMechanics);
  for (const m of FAMILIES) {
    assert.match(m.id, /^[a-z][a-z0-9-]*$/, `${m.id}: id is lowercase`);
    const names = Object.keys(m.mechanics || {});
    assert.ok(names.length, `${m.id}: adds at least one mechanic`);
    for (const name of names) {
      assert.ok(!seen.has(name), `${m.id}: mechanic ${name} is not already registered`);
      seen.add(name);
      for (const hook of ['fresh', 'valid', 'solved', 'move', 'hint', 'render']) assert.equal(typeof m.mechanics[name][hook], 'function', `${m.id}: ${name}.${hook}`);
      assert.equal(expansionMechanics[name], m.mechanics[name], `${m.id}: ${name} is registered`);
    }
  }
});

test('each module with a pack ships its validator, tests, notes and stylesheet', async () => {
  const html = await readFile(new URL('dist/index.html', root), 'utf8');
  for (const m of FAMILIES.filter(m => m.pack)) {
    assert.ok(existsSync(new URL(m.pack)), `${m.id}: pack exists`);
    const validator = new URL(`scripts/validate-${m.id}.mjs`, root);
    assert.ok(existsSync(validator), `${m.id}: scripts/validate-${m.id}.mjs`);
    assert.equal(typeof (await import(validator)).default, 'function', `${m.id}: the validator's default export runs it`);
    assert.ok(existsSync(new URL(`tests/${m.id}.test.mjs`, root)), `${m.id}: tests/${m.id}.test.mjs`);
    assert.ok(existsSync(new URL(`docs/${m.id}/README.md`, root)), `${m.id}: docs/${m.id}/README.md`);
    if (m.css) {
      assert.ok(existsSync(new URL(m.css)), `${m.id}: stylesheet exists`);
      assert.ok(!html.includes(m.css.split('/').pop()), `${m.id}: index.html does not also link its stylesheet`);
    }
  }
});

test('the merged pack has unique ids, and every module puzzle uses its own mechanic', async () => {
  assert.equal(new Set(pack.puzzles.map(p => p.id)).size, pack.puzzles.length, 'puzzle ids are unique across packs');
  assert.equal(new Set(pack.sources.map(s => s.id)).size, pack.sources.length, 'source ids are unique across packs');
  for (const m of FAMILIES.filter(m => m.pack)) {
    for (const p of (await packOf(m)).puzzles) {
      assert.ok(Object.hasOwn(m.mechanics, p.mechanic), `${p.id}: uses one of ${m.id}'s own mechanics, so Next puzzle stays in its group`);
      if (p.group) assert.equal(p.band, 'all', `${p.id}: a group is grade-free`);
      assert.ok(baseFamilies.has(familyOf(p)) || newFamilies().some(f => f.id === familyOf(p)), `${p.id}: joins a base family or one on the seam`);
    }
  }
});

test('every module puzzle starts valid and has an objective, controls and a board', async () => {
  for (const m of FAMILIES.filter(m => m.pack)) {
    for (const p of (await packOf(m)).puzzles) {
      const a = freshAttempt(p);
      assert.ok(validBoard(p, a.board), `${p.id}: fresh board is valid`);
      assert.ok(puzzleObjective(p).trim(), `${p.id}: objective`);
      assert.ok(String(playInstructions(p) || '').trim(), `${p.id}: controls`);
      assert.ok(p.familyTitle?.trim(), `${p.id}: familyTitle`);
      assert.match(playView(p, a, {pack, selected: null, message: ''}), new RegExp(`data-puzzle-id="${p.id}"`), `${p.id}: renders`);
    }
  }
});

test('a module that adds a family names it and gives it a symbol', () => {
  for (const m of FAMILIES.filter(m => m.family)) {
    assert.ok(!baseFamilies.has(m.family.id), `${m.id}: family ${m.family.id} is new`);
    assert.ok(typeof m.family.symbol === 'string' && m.family.symbol.trim(), `${m.id}: symbol`);
    assert.ok(pack.puzzles.some(p => familyOf(p) === m.family.id), `${m.id}: has puzzles`);
  }
});

test('new families come first in the satchel, newest first, and only the newest starts open', () => {
  const html = libraryView(profile, pack.puzzles), newest = newFamilies().map(f => f.id);
  const order = [...html.matchAll(/data-view-key="family-([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(order.slice(0, newest.length), newest);
  assert.deepEqual(order.slice(newest.length), [...new Set(pack.puzzles.map(familyOf))].filter(id => !newest.includes(id)), 'base families keep pack order');
  assert.deepEqual([...html.matchAll(/data-view-key="family-([^"]+)" open/g)].map(match => match[1]), newest.slice(0, 1));
  for (const f of newFamilies()) assert.ok(html.includes(`<span class="family-ink-symbol" aria-hidden="true">${f.symbol}</span>`), `${f.id}: symbol shown`);
});

test('puzzles with a group name join an existing family as their own group, below its levels', () => {
  const stars = [2, 1].map(number => ({id: `stars-${number}`, mechanic: 'stars', libraryFamily: 'clock', group: 'Stars', band: 'all', difficulty_level: 'easy', number}));
  const html = libraryView(profile, [...pack.puzzles, ...stars]);
  const family = html.slice(html.indexOf('data-view-key="family-clock"'));
  const clock = family.slice(0, family.indexOf('</details>'));
  assert.ok(clock.indexOf('<h2>Hard</h2>') < clock.indexOf('<h2>Stars</h2>'), 'the group follows Hard');
  assert.ok(clock.indexOf('data-id="stars-1"') < clock.indexOf('data-id="stars-2"'), 'numbered order');
  assert.match(clock, /aria-label="Clockwork Gates, Stars, puzzle 1"/);
  assert.match(clock, /<div class="library-band library-group"><h2>Stars<\/h2>/);
  const hard = clock.slice(clock.indexOf('<h2>Hard</h2>'), clock.indexOf('<h2>Stars</h2>'));
  assert.ok(!hard.includes('stars-'), 'grouped puzzles stay out of the level groups');
});

test('a pack can set or hide the visible objective', () => {
  const p = pack.puzzles.find(q => q.id === 'chips-01');
  assert.equal(visiblePuzzleObjective(p), p.objective);
  assert.equal(visiblePuzzleObjective({...p, visibleObjective: ''}), '');
  assert.equal(visiblePuzzleObjective({...p, visibleObjective: 'Find them all.'}), 'Find them all.');
});
