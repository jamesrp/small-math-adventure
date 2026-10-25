// The Puzzles library's order and the Grown-ups page (road review, October 24):
// a From the road shelf, then the other families under their regions, each
// family once, every family closed with no count (each solved puzzle carries
// the road's ✓ instead), each explorer's road in Grown-ups, copies told apart,
// the mathematics by area, and the read-aloud setting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshAttempt, move, nextHint, isSolved} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {MAIN, SIDE, BAND_KEYS, startJourney, beginEncounter, recordSolve, campaignId} from '../dist/road.js';
import {emptyStore, validateStore, parseBackup, importProfiles} from '../dist/storage.js';
import {libraryView, roadFamilies, regionOf, explorerNote, caravanHeader, caravanProfiles} from '../dist/caravan-ui.js';
import {parentView, readsAloud} from '../dist/ui.js';
import {FAMILIES, AREAS, REGIONS, newFamilies} from '../dist/families.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = await loadPack(), puzzles = pack.puzzles;
const familyOf = p => p.libraryFamily || p.mechanic;
const explorer = (band = 'k1', extra = {}) => ({id: `x-${band}`, name: 'Ada', avatar: 0, band, sound: false, attempts: {}, ...extra});
const step = (p, a) => mechanicFor(p)?.solve ? mechanicFor(p).solve(p, a.board) : (h => h.action || h.pair)(nextHint(p, a));
function finish(pr, id) {
  const o = beginEncounter(pr, puzzles, id);
  let a = pr.attempts[o.puzzle.id] || freshAttempt(o.puzzle);
  for (let i = 0; i < 400 && !isSolved(o.puzzle, a.board); i++) a = move(o.puzzle, a, step(o.puzzle, a));
  pr.attempts[o.puzzle.id] = a; recordSolve(pr, o.puzzle.id, o.encounter.id, puzzles);
}
// Ada has finished the K–1 road with both side puzzles and walked the 2–3 road to the Hollow.
const ada = explorer();
startJourney(ada); for (const e of [...MAIN, ...SIDE]) finish(ada, e.id);
ada.band = '23'; startJourney(ada); for (const e of MAIN.slice(0, 10)) finish(ada, e.id); ada.band = 'k1';
const families = html => [...html.matchAll(/data-view-key="family-([^"]+)"/g)].map(m => m[1]);
// The library's headings in order, each with its region key (none for the
// road's shelf), its text and the families listed under it.
const sections = html => html.split('<h2 class="library-shelf').slice(1).map(part => ({region: part.match(/^[^>]*data-region="([^"]+)"/)?.[1] ?? null, heading: part.slice(part.indexOf('>') + 1, part.indexOf('</h2>')), families: families(part)}));
const byRegion = ids => Object.keys(REGIONS).flatMap(region => ids.filter(id => regionOf(id) === region));

test('Puzzles: a From the road shelf of the families met on the road, in road order, then the rest', () => {
  const fresh = explorer();
  assert.deepEqual(roadFamilies(fresh, puzzles), [], 'nothing met before the road starts');
  startJourney(fresh);
  fresh.attempts[campaignId('ferry-seats', 'k1')] = freshAttempt(puzzles.find(p => p.id === 'swap-k1-05'));
  assert.deepEqual(roadFamilies(fresh, puzzles), ['swap'], 'an opened road board counts as met');
  const met = roadFamilies(ada, puzzles);
  assert.deepEqual(met, ['swap', 'clock', 'toggle', 'route', 'latin', 'jug', 'weigh', 'nim', 'color', 'code', 'tile', 'billiard'], 'every road family, in the order the road first shows it');
  const html = libraryView(ada, puzzles), order = families(html), newest = newFamilies().map(f => f.id);
  assert.deepEqual(order.slice(0, met.length), met);
  assert.deepEqual(order.slice(met.length), byRegion(newest), 'then the new families by region, newest first inside each');
  assert.equal(sections(html)[0].heading, 'From the road');
  assert.deepEqual(sections(html)[0].families, met);
  assert.doesNotMatch(html, /More puzzles/, 'regions, not one long list');
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/, 'every family starts closed');
  for (const p of puzzles.filter(p => !p.campaignOnly)) assert.equal(html.split(`data-id="${p.id}"`).length - 1, 1, `${p.id} appears once`);
  // A trail part-way: only what this explorer has met, on any trail.
  const ben = explorer('23'); startJourney(ben); for (const e of MAIN.slice(0, 4)) finish(ben, e.id);
  assert.deepEqual(roadFamilies(ben, puzzles), ['swap', 'clock', 'toggle', 'route']);
});

test('Puzzles: every family in the pack appears once, on the road’s shelf or under its region, whatever the explorer has met', () => {
  const all = [...new Set(puzzles.filter(p => !p.campaignOnly).map(familyOf))], newest = newFamilies().map(f => f.id);
  assert.deepEqual(new Set(all.filter(id => !newest.includes(id))), new Set(['tile', 'swap', 'toggle', 'clock', 'billiard', 'route', 'color', 'latin', 'code', 'nim', 'jug', 'weigh']), 'the twelve base families, and every other one from the seam');
  for (const id of all) assert.ok(regionOf(id), `${id}: a region (family.region in its module, or the base list in dist/caravan-ui.js)`);
  // Nothing met; part of each trail; all of each trail with both side puzzles.
  const explorers = [['nothing met', explorer()]];
  for (const band of BAND_KEYS) {
    const part = explorer(band, {id: `part-${band}`}), whole = explorer(band, {id: `all-${band}`});
    startJourney(part); for (const e of MAIN.slice(0, 5)) finish(part, e.id);
    startJourney(whole); for (const e of [...MAIN, ...SIDE]) finish(whole, e.id);
    explorers.push([`part of ${band}`, part], [`all of ${band}`, whole]);
  }
  const shelves = new Set();
  for (const [who, pr] of explorers) {
    const html = libraryView(pr, puzzles), shelf = roadFamilies(pr, puzzles), at = sections(html);
    shelves.add(shelf.length);
    for (const id of all) assert.equal(html.split(`data-view-key="family-${id}"`).length - 1, 1, `${who}: ${id} once`);
    assert.equal(families(html).length, all.length, `${who}: nothing else`);
    if (shelf.length) assert.deepEqual(at.shift(), {region: null, heading: 'From the road', families: shelf}, `${who}: the road's shelf first, unchanged`);
    else assert.doesNotMatch(html, /From the road/, `${who}: no shelf before the road`);
    const left = [...all.filter(id => !newest.includes(id)), ...newest.filter(id => all.includes(id))].filter(id => !shelf.includes(id));
    assert.deepEqual(at.map(s => s.region), Object.keys(REGIONS).filter(region => left.some(id => regionOf(id) === region)), `${who}: every region with something left, in order, and nothing else`);
    for (const s of at) {
      assert.equal(s.heading, REGIONS[s.region], `${who}: a region heading is only its name`);
      assert.deepEqual(s.families, left.filter(id => regionOf(id) === s.region), `${who}: ${s.region} holds its families not on the shelf, base first, then newest first`);
    }
  }
  assert.deepEqual([...shelves].sort((a, b) => a - b).slice(0, 1), [0]);
  assert.ok(shelves.size >= 3, 'empty, part and whole shelves were all checked');
});

test('Puzzles: each family’s symbol is its own within its region', () => {
  for (const s of sections(libraryView(explorer(), puzzles))) {
    const part = libraryView(explorer(), puzzles).split(`data-region="${s.region}"`)[1].split('<h2 class="library-shelf')[0];
    const symbols = [...part.matchAll(/<summary><span class="family-ink-symbol" aria-hidden="true">([^<]+)<\/span><strong>([^<]+)<\/strong>/g)].map(m => [m[1], m[2]]);
    assert.equal(symbols.length, s.families.length);
    for (const [symbol, title] of symbols) assert.equal(symbols.filter(([other]) => other === symbol).length, 1, `${s.heading}: ${title}'s ${symbol} is shared`);
  }
});

test('Puzzles: no family carries a solved/total count; each solved puzzle shows the road’s ✓, and the explorer’s grade comes first', () => {
  const pr = explorer('45', {attempts: {'tile-45-01': {completed: true}, 'tile-k1-02': {completed: true}, 'proof-garden-01': {completed: true}, 'clock-03': {completed: false}}});
  const html = libraryView(pr, puzzles), tile = html.slice(html.indexOf('data-view-key="family-tile"'), html.indexOf('</details>', html.indexOf('data-view-key="family-tile"')));
  // AGENTS.md: no total/explored counters in puzzle selection (the organizer's standing rule).
  for (const summary of html.match(/<summary>[^]*?<\/summary>/g)) {
    assert.doesNotMatch(summary.replace(/<[^>]+>/g, ''), /\d/, `no count in ${summary.slice(0, 120)}`);
    assert.doesNotMatch(summary, /solved|family-count/);
  }
  const card = id => html.match(new RegExp(`<button type="button" class="puzzle-card[^"]*" data-action="open-puzzle" data-id="${id}"[^>]*>[^]*?</button>`))[0];
  for (const id of ['tile-45-01', 'tile-k1-02', 'proof-garden-01']) {
    assert.match(card(id), /class="puzzle-card complete"/, `${id}: solved card`);
    assert.match(card(id), /<span class="puzzle-check" aria-hidden="true">✓<\/span>/, `${id}: the road's Solved mark`);
    assert.match(card(id), /, completed"/, `${id}: named as completed`);
  }
  assert.doesNotMatch(card('clock-03'), /✓|complete"/, 'started is not solved'); assert.match(card('clock-03'), /, in progress"/);
  assert.doesNotMatch(card('tile-45-02'), /✓|complete"|in progress/, 'untouched');
  assert.equal(html.split('puzzle-check').length - 1, 3, 'one ✓ per solved puzzle, nothing else');
  assert.ok(tile.indexOf('<h2>Proofs</h2>') < tile.indexOf('<h2>Grades 4–5</h2>') && tile.indexOf('<h2>Grades 4–5</h2>') < tile.indexOf('<h2>Grades K–1</h2>') && tile.indexOf('<h2>Grades K–1</h2>') < tile.indexOf('<h2>Grades 2–3</h2>'), 'Proofs, then the explorer’s grade, then the others');
  // Partial profiles from older tests still render.
  assert.doesNotThrow(() => libraryView({attempts: {}}, puzzles));
});

test('Grown-ups: each explorer shows the road, when it was last played, and that the other counts are the library’s', () => {
  const ben = explorer('23', {id: 'ben', name: 'Ben'}), lib = explorer('k1', {id: 'lib', name: 'Lin', attempts: {'clock-01': {...freshAttempt(puzzles.find(p => p.id === 'clock-01')), completed: true, helpUsed: true, lastPlayed: Date.parse('2026-10-21T15:00:00Z')}}});
  const html = parentView({...emptyStore(), profiles: [ada, ben, lib], activeProfileId: ada.id}, ada, pack, 'Ready');
  const row = name => html.slice(html.indexOf(`<strong>${name}</strong>`), html.indexOf('data-action="delete-profile"', html.indexOf(`<strong>${name}</strong>`)));
  assert.match(row('Ada'), /Road K–1: finished · ★ \d+ · Chalk, Pump/);
  assert.match(row('Ada'), /Road 2–3: Spooky Hollow, stop 4 of 7 · ★ \d+</, 'the trail part-way, with no tool yet');
  assert.match(row('Ada'), /last played [A-Z][a-z]{2} \d{1,2}/);
  assert.match(row('Ada'), /Puzzles library: 0 solved · 0 with hints/);
  assert.match(row('Ben'), /not played yet/); assert.match(row('Ben'), /Road: not started/);
  assert.match(row('Lin'), /last played Oct 21/); assert.match(row('Lin'), /Puzzles library: 1 solved · 1 with hints/);
});

test('Grown-ups: explorers, offline play, notes and paper first; the mathematics closed by area', () => {
  const html = parentView({...emptyStore(), profiles: [ada], activeProfileId: ada.id}, ada, pack, 'Ready');
  const at = [...html.matchAll(/<h2>([^<]+)<\/h2>/g)].map(m => m[1]);
  assert.deepEqual(at.slice(0, 5), ['Explorers & saves', 'Play on iPad', 'Puzzle notes', 'Paper activities', 'Mathematics']);
  const math = html.slice(html.indexOf('<h2>Mathematics</h2>'));
  const areas = [...math.matchAll(/data-view-key="area-([a-z]+)"/g)].map(m => m[1]);
  assert.deepEqual(areas, Object.keys(AREAS), 'every area, in order, and none left over as More');
  assert.doesNotMatch(math, /<details[^>]*class="research-area"[^>]*\bopen\b/, 'every area starts closed');
  for (const record of pack.families) assert.equal(math.split(record.mathematics.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')).length - 1, 1, `${record.id}: its mathematics once`);
  assert.match(math, /class="research-area"[^>]*data-view-key="area-shapes"><summary>Tilings and shapes <small>[^<]*Tile gardens/);
  assert.doesNotMatch(html, /data-action="apply-update"/, 'Reload only when a new version waits');
  assert.match(parentView({...emptyStore(), profiles: [ada], activeProfileId: ada.id}, ada, pack, 'A new version of the app is ready.', 'k1', true), /data-action="apply-update"/);
});

test('every family module names an area of mathematics and a region of the library', () => {
  for (const m of FAMILIES.filter(m => m.family)) {
    assert.ok(Object.hasOwn(AREAS, m.family.area), `${m.id}: area ${m.family.area}`);
    assert.ok(Object.hasOwn(REGIONS, m.family.region), `${m.id}: region ${m.family.region}`);
  }
  for (const name of Object.values(REGIONS)) assert.match(name, /^[A-Z][a-z]+(?: [a-z]+)*$/, `${name}: a short name, no count or teaser`);
});

test('an imported explorer that shares a name is labelled with the day it arrived', () => {
  const day = Date.parse('2026-10-24T18:05:00Z');
  const store = {...emptyStore(), profiles: [explorer('k1', {id: 'a'})], activeProfileId: 'a'};
  const backup = validateStore({...emptyStore(), profiles: [explorer('k1', {id: 'b'})], activeProfileId: 'b'}, puzzles);
  let ids = 0;
  const once = importProfiles(store, backup, () => `new-${++ids}`, day), copy = once.profiles[1];
  assert.equal(copy.importedAt, day);
  assert.equal(explorerNote(once.profiles, once.profiles[0]), '', 'the explorer that was here first has no label');
  assert.match(explorerNote(once.profiles, copy), /^\(imported Oct 24\)$/);
  const twice = importProfiles(once, backup, () => `new-${++ids}`, day + 60000);
  assert.match(explorerNote(twice.profiles, twice.profiles[2]), /^\(imported Oct 24, \d{1,2}:\d{2} [AP]M\)$/, 'a second copy the same day shows its time');
  const cy = explorer('k1', {id: 'c', name: 'Cy', importedAt: day});
  assert.equal(explorerNote([...twice.profiles, cy], cy), '', 'a unique name needs no label');
  assert.match(parentView(once, once.profiles[0], pack, 'Ready'), /<strong>Ada<\/strong> <span class="explorer-note">\(imported Oct 24\)<\/span>/);
  assert.match(caravanProfiles(once), /<small class="explorer-note">\(imported Oct 24\)<\/small>/);
  assert.equal((parentView(twice, twice.profiles[0], pack, 'Ready').match(/class="explorer-note">\(imported Oct 24, /g) || []).length, 2, 'both same-day copies show their time');
});

test('saves keep importedAt and readAloud; old saves without them still load', () => {
  const old = {...emptyStore(), profiles: [explorer()], activeProfileId: 'x-k1'};
  assert.deepEqual(validateStore(old, puzzles), old, 'an old save reads unchanged');
  const now = {...emptyStore(), profiles: [explorer('k1', {readAloud: false, importedAt: 1761300000000})], activeProfileId: 'x-k1'};
  assert.deepEqual(parseBackup(JSON.stringify(now), puzzles), now);
  for (const bad of [{readAloud: 'yes'}, {importedAt: -1}, {importedAt: 'today'}]) assert.throws(() => validateStore({...old, profiles: [explorer('k1', bad)]}, puzzles), /not valid/);
});

test('read aloud: on for K–1 and for the old setting, off for older trails, a grown-up’s choice wins', () => {
  assert.equal(readsAloud(explorer('k1')), true);
  assert.equal(readsAloud(explorer('23')), false);
  assert.equal(readsAloud(explorer('45', {sound: true})), true, 'the old Read instructions aloud setting stays on');
  assert.equal(readsAloud(explorer('k1', {readAloud: false})), false);
  assert.equal(readsAloud(explorer('45', {readAloud: true})), true);
  assert.equal(readsAloud(null), false);
  const html = parentView({...emptyStore(), profiles: [explorer('23')], activeProfileId: 'x-23'}, explorer('23'), pack, 'Ready');
  assert.match(html, /<input id="sound-toggle" type="checkbox" > Read each puzzle aloud to Ada when it opens/);
});

test('no top-bar tab is marked current on Grown-ups', () => {
  assert.doesNotMatch(caravanHeader(ada, ''), /aria-current/);
  assert.match(caravanHeader(ada, 'journey'), /class="active"[^>]*aria-current="page">Road/);
});

test('Puzzles: the family a child just left by the Puzzles tab is open again; Spring-water Jugs has its own glyph', () => {
  const closed = libraryView(ada, puzzles);
  assert.doesNotMatch(closed, /<details[^>]* open>/, 'from anywhere else every family starts closed');
  const back = libraryView(ada, puzzles, 'jug');
  assert.deepEqual([...back.matchAll(/<details class="satchel-family" data-view-key="family-([^"]+)" open>/g)].map(m => m[1]), ['jug']);
  assert.doesNotMatch(closed, /♒/, 'not the Aquarius sign');
  assert.match(closed, /<span class="family-ink-symbol" aria-hidden="true">⊔<\/span><strong>Spring-water Jugs<\/strong>/);
});
