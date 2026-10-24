// Saves from before an update (docs/save-compat.md): an attempt that no longer
// matches its puzzle starts afresh and keeps its star, an attempt at a puzzle
// that is gone is dropped, the untouched save is kept under REPAIR_KEY, and
// everything outside the attempts is as strict as before. Imports stay strict.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved} from '../dist/engine.js';
import {emptyStore, validateStore, repairStore, parseBackup, loadStore, persistStore, SAVE_KEY, BACKUP_KEY, REPAIR_KEY, REPAIRED_WARNING} from '../dist/storage.js';
import {startJourney, beginEncounter, recordSolve, withCampaignPuzzles} from '../dist/road.js';

const {puzzles} = JSON.parse(await readFile(new URL('../dist/puzzles.json', import.meta.url), 'utf8'));
const cups = puzzles.find(p => p.id === 'swap-k1-01'), cups2 = puzzles.find(p => p.id === 'swap-23-04'), garden = puzzles.find(p => p.id === 'tile-k1-01');
const profile = (id, attempts, extra = {}) => ({id, name: `Explorer ${id}`, band: 'k1', avatar: 1, sound: false, attempts, ...extra});
const store = (...profiles) => ({...emptyStore(), activeProfileId: profiles[0]?.id ?? null, profiles});
function memory(values = {}, limit = Infinity) {
  const map = new Map(Object.entries(values));
  const size = () => [...map.values()].reduce((n, v) => n + v.length, 0);
  return {
    map, getItem: k => map.has(k) ? map.get(k) : null, removeItem: k => map.delete(k),
    setItem(k, v) { const before = map.get(k); map.set(k, String(v)); if (size() > limit) { if (before === undefined) map.delete(k); else map.set(k, before); throw Error('QuotaExceededError'); } },
  };
}
const played = p => move(p, freshAttempt(p), p.edges[0]);
// Saved before its puzzle changed: a board, an Undo history or a revision this pack no longer reads.
const staleBoard = {...freshAttempt(cups), board: [0, 0], moves: 4, hintLevel: 2, helpUsed: true, completed: true, lastPlayed: 1700000000000};
const staleHistory = {...played(cups2), history: [{board: ['x'], moves: 0}], completed: false, helpUsed: false, lastPlayed: 1700000000001};
const staleRevision = {...freshAttempt(garden), revision: 7, completed: true, helpUsed: false, lastPlayed: 1700000000002};

test('a stale attempt starts afresh, keeping its star, help mark and last played', () => {
  const original = store(profile('one', {[cups.id]: staleBoard}));
  assert.throws(() => validateStore(original, puzzles), /swap-k1-01 does not match/);
  const storage = memory({[SAVE_KEY]: JSON.stringify(original)});
  const {store: loaded, warning} = loadStore(storage, puzzles);
  const a = loaded.profiles[0].attempts[cups.id];
  assert.deepEqual(a.board, freshAttempt(cups).board);
  assert.deepEqual(a.history, []);
  assert.equal(a.moves, 0); assert.equal(a.hintLevel, 0);
  assert.equal(a.completed, true); assert.equal(a.helpUsed, true); assert.equal(a.lastPlayed, staleBoard.lastPlayed);
  assert.equal(warning, REPAIRED_WARNING);
  assert.doesNotThrow(() => validateStore(loaded, puzzles));
  for (const [p, stale] of [[cups2, staleHistory], [garden, staleRevision]]) {
    const r = loadStore(memory({[SAVE_KEY]: JSON.stringify(store(profile('one', {[p.id]: stale})))}), puzzles);
    assert.equal(r.warning, REPAIRED_WARNING);
    assert.deepEqual(r.store.profiles[0].attempts[p.id], {...freshAttempt(p), lastPlayed: stale.lastPlayed, completed: stale.completed, helpUsed: stale.helpUsed});
  }
});

test('only booleans carry a star or help mark over, and a bad time is replaced', () => {
  const odd = {board: 'gone', completed: 'yes', helpUsed: 1, lastPlayed: -5, extra: {__proto__: {polluted: true}}};
  const {store: loaded} = loadStore(memory({[SAVE_KEY]: JSON.stringify(store(profile('one', {[cups.id]: odd})))}), puzzles);
  const a = loaded.profiles[0].attempts[cups.id];
  assert.equal(a.completed, false); assert.equal(a.helpUsed, false);
  assert.ok(Number.isFinite(a.lastPlayed) && a.lastPlayed > 0);
  assert.deepEqual(Object.keys(a).sort(), Object.keys(freshAttempt(cups)).sort(), 'only documented fields');
  const notObject = loadStore(memory({[SAVE_KEY]: JSON.stringify(store(profile('one', {[cups.id]: 'broken'})))}), puzzles);
  assert.deepEqual(notObject.store.profiles[0].attempts[cups.id].board, freshAttempt(cups).board);
});

test('an attempt at a puzzle that no longer exists is dropped', () => {
  const good = played(cups);
  const original = store(profile('one', {[cups.id]: good, 'retired-puzzle-07': {...freshAttempt(cups), completed: true}}));
  const {store: loaded, warning} = loadStore(memory({[SAVE_KEY]: JSON.stringify(original)}), puzzles);
  assert.deepEqual(Object.keys(loaded.profiles[0].attempts), [cups.id]);
  assert.deepEqual(loaded.profiles[0].attempts[cups.id], good);
  assert.equal(warning, REPAIRED_WARNING);
  assert.deepEqual(repairStore(original, puzzles).repairs.map(r => [r.puzzleId, r.reset]), [['retired-puzzle-07', false]]);
});

// A finished road encounter whose board changed: the attempt starts afresh and
// stays completed, so the road (which needs it completed) still reads.
function roadExplorer() {
  const pr = profile('two', {}, {band: 'k1', avatar: 3});
  startJourney(pr);
  const opened = beginEncounter(pr, puzzles);
  let a = freshAttempt(opened.puzzle);
  while (!isSolved(opened.puzzle, a.board)) { const h = nextHint(opened.puzzle, a); a = move(opened.puzzle, a, h.action || h.pair); }
  pr.attempts[opened.puzzle.id] = a;
  assert.ok(recordSolve(pr, opened.puzzle.id, opened.encounter.id, puzzles));
  return {pr, id: opened.puzzle.id};
}

test('a mixed store across two explorers keeps every good attempt and the road, and resets only the stale ones', () => {
  const road = roadExplorer();
  const goodOne = played(cups), goodTwo = {...played(cups2), helpUsed: true, hintLevel: 1};
  const roadBoard = road.pr.attempts[road.id];
  const one = profile('one', {[cups.id]: goodOne, [garden.id]: staleRevision});
  const two = {...road.pr, attempts: {...road.pr.attempts, [road.id]: {...roadBoard, history: [{board: [9, 9, 9], moves: 0}]}, [cups2.id]: goodTwo, [cups.id]: staleBoard}};
  const original = {...store(one, two), activeProfileId: 'two'};
  assert.throws(() => validateStore(original, puzzles));
  const storage = memory({[SAVE_KEY]: JSON.stringify(original)});
  const {store: loaded, warning} = loadStore(storage, puzzles);
  assert.equal(warning, REPAIRED_WARNING);
  assert.equal(loaded.activeProfileId, 'two');
  assert.deepEqual(loaded.profiles.map(p => [p.id, p.name, p.band, p.avatar]), [['one', 'Explorer one', 'k1', 1], ['two', 'Explorer two', 'k1', 3]]);
  assert.deepEqual(loaded.profiles[0].attempts[cups.id], goodOne);
  assert.deepEqual(loaded.profiles[1].attempts[cups2.id], goodTwo);
  assert.equal(loaded.profiles[0].attempts[garden.id].revision, garden.revision || 1);
  assert.equal(loaded.profiles[0].attempts[garden.id].completed, true);
  assert.deepEqual(loaded.profiles[1].attempts[cups.id].board, freshAttempt(cups).board);
  const roadAttempt = loaded.profiles[1].attempts[road.id];
  assert.equal(roadAttempt.completed, true); assert.equal(roadAttempt.moves, 0);
  assert.deepEqual(loaded.profiles[1].journey, road.pr.journey, 'the road and its stars are untouched');
  const repairs = repairStore(original, puzzles).repairs.map(r => `${r.profileId}/${r.puzzleId}/${r.reset}`).sort();
  assert.deepEqual(repairs, [`one/${garden.id}/true`, `two/${cups.id}/true`, `two/${road.id}/true`].sort());
  // What the app writes next is the repaired store, and it reads back unchanged.
  assert.equal(persistStore(storage, loaded, puzzles), '');
  assert.deepEqual(loadStore(storage, puzzles), {store: loaded, warning: ''});
});

test('the untouched save is kept before anything changes, and the stale one never becomes the previous good save', () => {
  const original = JSON.stringify(store(profile('one', {[cups.id]: staleBoard, [cups2.id]: played(cups2)})));
  const storage = memory({[SAVE_KEY]: original, [BACKUP_KEY]: 'an older good save'});
  const {store: loaded} = loadStore(storage, puzzles);
  assert.equal(storage.getItem(REPAIR_KEY), original);
  assert.equal(storage.getItem(SAVE_KEY), original, 'loading writes nothing else');
  assert.equal(persistStore(storage, loaded, puzzles), '');
  assert.equal(storage.getItem(REPAIR_KEY), original);
  assert.equal(storage.getItem(BACKUP_KEY), 'an older good save');
  assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)), loaded);
});

test('a valid store is untouched: no warning, no copy', () => {
  const road = roadExplorer();
  const original = store(profile('one', {[cups.id]: played(cups), [garden.id]: freshAttempt(garden)}), road.pr);
  const storage = memory({[SAVE_KEY]: JSON.stringify(original)});
  const loaded = loadStore(storage, puzzles);
  assert.equal(loaded.warning, '');
  assert.deepEqual(loaded.store, validateStore(original, puzzles));
  assert.deepEqual(loaded.store, original);
  assert.equal(storage.getItem(REPAIR_KEY), null);
  assert.deepEqual(repairStore(original, puzzles).repairs, []);
});

test('problems outside the attempts still make the save unreadable, and nothing is copied', () => {
  const stale = {[cups.id]: staleBoard};
  const road = roadExplorer();
  const brokenRoad = {...road.pr, attempts: {...road.pr.attempts, ...stale}, journey: {...road.pr.journey, trails: {k1: {...road.pr.journey.trails.k1, completed: ['tree-lights']}}}};
  for (const bad of [
    {...store(profile('one', stale)), contentVersion: 99},
    {...store(profile('one', stale)), schemaVersion: 2},
    store(profile('one', stale, {avatar: 9})),
    store(profile('one', stale, {name: ''})),
    store(profile('one', stale), profile('one', {})),
    {...store(profile('one', stale)), activeProfileId: 'missing'},
    store(brokenRoad),
  ]) {
    const storage = memory({[SAVE_KEY]: JSON.stringify(bad)});
    const loaded = loadStore(storage, puzzles);
    assert.match(loaded.warning, /Saved data could not be read/);
    assert.deepEqual(loaded.store, emptyStore());
    assert.equal(storage.getItem(REPAIR_KEY), null);
    assert.throws(() => repairStore(bad, puzzles));
  }
});

test('a stale previous good save is repaired too when the latest save is damaged', () => {
  const previous = JSON.stringify(store(profile('one', {[cups.id]: staleBoard})));
  const storage = memory({[SAVE_KEY]: '{damaged', [BACKUP_KEY]: previous});
  const loaded = loadStore(storage, puzzles);
  assert.match(loaded.warning, /previous good save was recovered/);
  assert.ok(loaded.warning.endsWith(REPAIRED_WARNING));
  assert.equal(loaded.store.profiles[0].attempts[cups.id].completed, true);
  assert.equal(storage.getItem(REPAIR_KEY), previous);
  assert.equal(storage.getItem(SAVE_KEY), '{damaged');
});

test('imports stay strict', () => {
  const backup = JSON.stringify(store(profile('one', {[cups.id]: staleBoard})));
  assert.throws(() => parseBackup(backup, puzzles), /does not match/);
  assert.throws(() => parseBackup(JSON.stringify(store(profile('one', {'retired-puzzle-07': freshAttempt(cups)}))), puzzles), /does not match/);
});

test('when the copy cannot be kept the stars still load, and a full device drops the copy before today’s progress', () => {
  const original = JSON.stringify(store(profile('one', {[cups.id]: staleBoard})));
  const full = memory({[SAVE_KEY]: original}, original.length + 10);
  const loaded = loadStore(full, puzzles);
  assert.equal(loaded.warning, REPAIRED_WARNING);
  assert.equal(full.getItem(REPAIR_KEY), null);
  assert.equal(loaded.store.profiles[0].attempts[cups.id].completed, true);
  // The copy fits, but then a bigger save does not fit beside it.
  const tight = memory({[SAVE_KEY]: original}, original.length * 2 + 10);
  const kept = loadStore(tight, puzzles).store;
  assert.equal(tight.getItem(REPAIR_KEY), original);
  kept.profiles[0].attempts[cups2.id] = played(cups2);
  kept.profiles[0].name = 'A longer explorer name';
  assert.equal(persistStore(tight, kept, puzzles), '');
  assert.equal(tight.getItem(REPAIR_KEY), null);
  assert.deepEqual(JSON.parse(tight.getItem(SAVE_KEY)), kept);
});

test('an attempt at a road board the trail has not reached is dropped', () => {
  const road = roadExplorer();
  // The last road board in this pack, many encounters past the first.
  const p = withCampaignPuzzles(puzzles).filter(q => q.campaignVersion === 4 && q.band === 'k1' && !q.requiresTool).at(-1), later = p.id;
  assert.notEqual(later, road.id);
  const original = store({...road.pr, attempts: {...road.pr.attempts, [later]: freshAttempt(p)}});
  assert.throws(() => validateStore(original, puzzles), /not been reached/);
  const {store: loaded, warning} = loadStore(memory({[SAVE_KEY]: JSON.stringify(original)}), puzzles);
  assert.equal(warning, REPAIRED_WARNING);
  assert.equal(Object.hasOwn(loaded.profiles[0].attempts, later), false);
  assert.deepEqual(loaded.profiles[0].journey, road.pr.journey);
});
