import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { freshAttempt, move, nextHint, isSolved, restart, validBoard, undo } from '../dist/engine.js';
import { mechanicFor, isExpansion } from '../dist/expansion.js';
import { STOPS, SIDE, MAIN, CAST, TOOLS, BAND_KEYS, SCORE_UNITS, freshJourney, getEncounter, getProgress, startJourney, beginEncounter, recordSolve, validateJourney, withCampaignPuzzles, resolvePuzzle, canVisitEncounter, campaignId, trailFor, hasTool, medals, scoreOf, optimumOf, rivalScore, starsFor, maxStars, rivalVerdict, stopReached } from '../dist/road.js';
import { emptyStore, validateStore, parseBackup } from '../dist/storage.js';
import { playView } from '../dist/ui.js';
import { roadMapView, journalView, encounterLine, finaleView } from '../dist/road-ui.js';
import { setManifest, media, asset } from '../dist/art.js';

const pack = JSON.parse(await readFile(new URL('../dist/puzzles.json', import.meta.url), 'utf8'));
const proofs = JSON.parse(await readFile(new URL('../dist/proofs.json', import.meta.url), 'utf8'));
const puzzles = [...pack.puzzles, ...proofs.puzzles], all = withCampaignPuzzles(puzzles);
const fullPack = { ...pack, puzzles, sources: [...pack.sources, ...proofs.sources] };
const copy = value => JSON.parse(JSON.stringify(value));
const profile = (band = 'k1') => ({ id: 'one', name: 'Explorer', avatar: 0, band, sound: false, attempts: {} });
const storeFor = p => ({ ...emptyStore(), activeProfileId: p.id, profiles: [p] });
const step = (p, a) => mechanicFor(p)?.solve ? mechanicFor(p).solve(p, a.board) : (h => (assert.equal(h.type, 'move', `${p.id}: ${h.text}`), h.action || h.pair))(nextHint(p, a));
function solve(p, a = freshAttempt(p), { hints = false } = {}) {
  for (let i = 0; !isSolved(p, a.board) && i < 400; i++) { a = move(p, a, step(p, a)); assert.ok(a, `${p.id}: legal step`); }
  assert.ok(isSolved(p, a.board), `${p.id}: solved`);
  return hints ? { ...a, hintLevel: 3, helpUsed: true } : a;
}
function finish(pr, id, options) {
  const opened = beginEncounter(pr, puzzles, id);
  assert.ok(opened, `${pr.band}: can open ${id || 'next'}`);
  pr.attempts[opened.puzzle.id] = solve(opened.puzzle, pr.attempts[opened.puzzle.id] || freshAttempt(opened.puzzle), options);
  return { ...opened, result: recordSolve(pr, opened.puzzle.id, opened.encounter.id, puzzles) };
}

test('seven stops, three encounters each, every mechanic, keepers who speak briefly', () => {
  assert.deepEqual(STOPS.map(s => s.id), ['ferry', 'marsh', 'ridge', 'hollow', 'workshop', 'lighthouse', 'fair']);
  assert.equal(MAIN.length, 21);
  assert.equal(new Set([...MAIN, ...SIDE].map(e => e.id)).size, 23);
  const mechanics = new Set(MAIN.map(e => e.mechanic));
  for (const m of ['tile', 'swap', 'toggle', 'clock', 'billiard', 'route', 'color', 'latin', 'code', 'nim', 'jug', 'weigh', 'proofgarden', 'duel']) assert.ok(mechanics.has(m), m);
  // Dark and bright stops alternate along the road.
  assert.deepEqual(STOPS.map(s => s.mood), ['morning', 'night', 'day', 'spooky', 'rain', 'storm', 'fair']);
  for (const e of [...MAIN, ...SIDE]) {
    assert.ok(CAST[e.speaker], `${e.id}: speaker`);
    for (const key of ['open', 'win', ...(e.side ? ['locked'] : [])]) {
      assert.ok(e.lines[key]?.trim(), `${e.id}: ${key} line`);
      assert.ok(e.lines[key].split(/\s+/).length <= 12, `${e.id}: ${key} line stays short`);
    }
    assert.equal(getEncounter(e.id), e);
    for (const band of BAND_KEYS) {
      const p = all.find(p => p.id === campaignId(e.id, band));
      assert.ok(p, `${e.id}/${band}: campaign board`);
      assert.equal(p.band, band); assert.equal(p.campaignVersion, 4); assert.equal(p.campaignEncounter, e.id);
      assert.equal(p.mechanic, e.mechanic);
    }
  }
  for (const c of Object.values(CAST)) for (const line of [c.hint, ...c.oops]) assert.ok(line.split(/\s+/).length <= 8, line);
  // Each side puzzle is reachable before the encounter that earns its tool.
  for (const side of SIDE) {
    const from = MAIN.findIndex(e => e.id === TOOLS[side.requires].from);
    assert.ok(MAIN.findIndex(e => e.stop === side.stop) < from, `${side.id} can be tried before its tool`);
    assert.equal(MAIN[from].grants, side.requires);
  }
  assert.equal(all.filter(p => p.campaignVersion === 4).length, 69);
  assert.equal(withCampaignPuzzles(all), all);
});

test('every trail plays to the fair: stops light, tools arrive, Plume moves, saves round-trip', () => {
  for (const band of BAND_KEYS) {
    const pr = profile(band); startJourney(pr);
    assert.equal(getProgress(pr).plumeAt, 1, 'Plume starts one stop ahead');
    for (let i = 0; i < MAIN.length; i++) {
      const e = MAIN[i];
      if (MAIN[i + 1]) assert.equal(beginEncounter(pr, puzzles, MAIN[i + 1].id), null, 'the encounter after the next one is closed');
      const { puzzle, result } = finish(pr);
      assert.equal(puzzle.id, campaignId(e.id, band));
      assert.equal(pr.attempts[puzzle.sourceId], undefined, 'road play never touches the library save');
      assert.equal(result.first, true); assert.ok(result.stars >= 1 && result.stars <= result.max);
      assert.equal(result.grants, e.grants || null);
      assert.equal(result.stopLit, e.step === 2);
      const progress = getProgress(pr);
      assert.equal(progress.completedCount, i + 1);
      assert.equal(progress.litStops.length, Math.floor((i + 1) / 3));
      if (e.id === 'hollow-plots') assert.ok(hasTool(progress.trail, 'chalk'));
      if (e.id === 'workshop-pump') assert.ok(hasTool(progress.trail, 'pump'));
      if (progress.stop.id === 'ridge' && !progress.trail.completed.includes('ridge-duel')) assert.equal(progress.plumeAt, 2, 'Plume waits at the ridge');
      assert.deepEqual(parseBackup(JSON.stringify(storeFor(pr)), puzzles), storeFor(pr));
      // Solving again does not advance or duplicate anything.
      assert.equal(recordSolve(pr, puzzle.id, e.id, puzzles).first, false);
      assert.equal(getProgress(pr).completedCount, i + 1);
    }
    const done = getProgress(pr);
    assert.equal(done.complete, true); assert.equal(done.encounter, null);
    assert.deepEqual(medals(pr).fair, [band]);
    assert.match(finaleView(pr), /The Lantern Fair/);
    assert.doesNotThrow(() => validateStore(storeFor(pr), puzzles));
  }
});

test('stars: solved, no hints, and Plume’s score; replays only raise them', () => {
  const pr = profile('23'); startJourney(pr);
  const opened = beginEncounter(pr, puzzles), p = opened.puzzle, e = opened.encounter;
  assert.equal(e.id, 'ferry-seats');
  assert.equal(rivalScore(e, p), p.minimumMoves + 2);
  // A hinted best solve: two stars (solved, beat Plume).
  pr.attempts[p.id] = solve(p, freshAttempt(p), { hints: true });
  assert.equal(starsFor(e, p, pr.attempts[p.id]), 2);
  assert.deepEqual(rivalVerdict(e, p, pr.attempts[p.id]), { rival: p.minimumMoves + 2, mine: p.minimumMoves, result: 'beat' });
  assert.equal(recordSolve(pr, p.id, e.id, puzzles).stars, 2);
  // A slow replay without hints still earns its own star but never lowers the best.
  let a = restart(p, pr.attempts[p.id]);
  for (let i = 0; i < 4; i++) a = move(p, a, p.edges[0]);
  a = solve(p, a);
  assert.equal(a.hintLevel, 0); assert.ok(scoreOf(p, a) > rivalScore(e, p));
  assert.equal(starsFor(e, p, a), 2);
  pr.attempts[p.id] = a; assert.equal(recordSolve(pr, p.id, e.id, puzzles).stars, 2);
  // A clean, quick replay earns all three.
  a = solve(p, restart(p, a)); pr.attempts[p.id] = a;
  assert.equal(starsFor(e, p, a), 3); assert.equal(recordSolve(pr, p.id, e.id, puzzles).stars, 3);
  assert.equal(trailFor(pr).stars['ferry-seats'], 3);
  // Undo removes moves from Plume's count.
  let u = restart(p, a); u = move(p, u, p.edges[0]); u = undo(u);
  assert.equal(scoreOf(p, u), 0);
});

test('Plume’s scores are always reachable and tighten along the road', () => {
  for (const band of BAND_KEYS) for (const e of MAIN) {
    const p = all.find(p => p.id === campaignId(e.id, band)), rival = rivalScore(e, p);
    if (!SCORE_UNITS[p.mechanic] || e.rival) { assert.equal(rival, null, e.id); assert.equal(maxStars(e, p), 2); continue; }
    assert.ok(rival >= optimumOf(p), `${e.id}/${band}: Plume never beats the best possible`);
    if (['lighthouse', 'fair'].includes(e.stop)) assert.equal(rival, optimumOf(p), `${e.id}/${band}: Plume is perfect by the lighthouse`);
    assert.equal(maxStars(e, p), 3);
    // An optimal hint-free solve always ties or beats Plume.
    const a = solve(p);
    assert.ok(scoreOf(p, a) <= rival, `${e.id}/${band}: hint path within Plume’s score`);
  }
});

test('scores count the right thing for each family', () => {
  const code = all.find(p => p.id === campaignId('hollow-crypt', 'k1'));
  let a = freshAttempt(code);
  const answer = solve(code).board.bits, wrong = answer.map(b => 1 - b);
  wrong.forEach((bit, position) => { a = move(code, a, { type: 'set', position, value: bit }); });
  a = move(code, a, { type: 'submit' });
  assert.ok(!isSolved(code, a.board));
  answer.forEach((bit, position) => { a = move(code, a, { type: 'set', position, value: bit }); });
  a = move(code, a, { type: 'submit' });
  assert.ok(isSolved(code, a.board)); assert.equal(scoreOf(code, a), 2, 'two checks');
  const color = all.find(p => p.id === campaignId('ridge-kites', 'k1'));
  let c = freshAttempt(color);
  c = move(color, c, { type: 'palette', color: 2 });
  assert.equal(scoreOf(color, c), 0, 'choosing a color is not a move on the card');
  const toggle = all.find(p => p.id === campaignId('ferry-lights', 'k1'));
  const t = solve(toggle); assert.equal(scoreOf(toggle, t), t.board.presses.length);
});

test('side puzzles: tried before the tool, finished after it', () => {
  for (const band of BAND_KEYS) {
    const pr = profile(band); startJourney(pr);
    const bath = all.find(p => p.id === campaignId('ferry-bath', band));
    assert.equal(canVisitEncounter(pr, 'ferry-bath'), true, 'the bath is visible from the first stop');
    assert.equal(canVisitEncounter(pr, 'marsh-garden'), false, 'the garden appears when the marsh is reached');
    const locked = resolvePuzzle(bath, pr);
    assert.equal(locked.parameters.source_and_drain, false); assert.equal(locked.missingAbility, 'pump');
    let a = freshAttempt(locked);
    assert.equal(move(locked, a, { type: 'fill', jug: 1 }), null);
    a = move(locked, a, { type: 'pour', from: 0, to: 1 }); assert.ok(a);
    assert.equal(nextHint(locked, a).type, 'equipment');
    pr.attempts[bath.id] = a;
    assert.equal(recordSolve(pr, bath.id, 'ferry-bath', puzzles), null);
    while (getProgress(pr).stop.id === 'ferry') finish(pr);
    const garden = all.find(p => p.id === campaignId('marsh-garden', band)), lockedGarden = resolvePuzzle(garden, pr);
    assert.equal(lockedGarden.parameters.proveLocked, true);
    const g = freshAttempt(lockedGarden);
    assert.equal(move(lockedGarden, g, { type: 'mode', mode: 'prove' }), null);
    assert.equal(nextHint(lockedGarden, g).type, 'equipment');
    assert.doesNotMatch(playView(lockedGarden, g, { pack: fullPack, profile: pr, encounter: getEncounter('marsh-garden'), selected: null, message: '' }), /data-move="[^"]*prove/);
    pr.attempts[garden.id] = g;
    assert.deepEqual(parseBackup(JSON.stringify(storeFor(pr)), puzzles), storeFor(pr), 'tried side boards save before the tool');
    // Earn both tools, then finish both side puzzles.
    while (!hasTool(trailFor(pr), 'pump')) finish(pr);
    const sideBath = finish(pr, 'ferry-bath'), sideGarden = finish(pr, 'marsh-garden');
    assert.equal(sideBath.puzzle.parameters.source_and_drain, true); assert.equal(sideBath.result.first, true);
    assert.equal(sideGarden.puzzle.parameters.proveLocked, undefined); assert.equal(sideGarden.result.max, 2);
    assert.deepEqual(trailFor(pr).side, ['ferry-bath', 'marsh-garden']);
    assert.equal(getProgress(pr).completedCount, 14, 'side puzzles never advance the road');
    assert.deepEqual(parseBackup(JSON.stringify(storeFor(pr)), puzzles), storeFor(pr));
  }
});

test('each grade trail keeps its own road, stars and tools', () => {
  const pr = profile('k1'); startJourney(pr); finish(pr); finish(pr);
  pr.band = '45';
  assert.equal(getProgress(pr).started, false); assert.equal(getProgress(pr).completedCount, 0);
  startJourney(pr); const opened = finish(pr);
  assert.equal(opened.puzzle.band, '45');
  assert.equal(trailFor(pr, 'k1').completed.length, 2); assert.equal(trailFor(pr, '45').completed.length, 1);
  assert.deepEqual(parseBackup(JSON.stringify(storeFor(pr)), puzzles), storeFor(pr));
  // A board from the other trail stays reachable by its own trail.
  assert.equal(canVisitEncounter(pr, 'ferry-bell', 'k1'), true);
  assert.equal(canVisitEncounter(pr, 'ferry-lights', 'k1'), true);
  assert.equal(canVisitEncounter(pr, 'marsh-boardwalks', 'k1'), false);
});

test('library play, forged progress and unreached boards cannot move the road', () => {
  const pr = profile(); startJourney(pr);
  const opened = beginEncounter(pr, puzzles), source = puzzles.find(p => p.id === opened.puzzle.sourceId);
  pr.attempts[source.id] = solve(source);
  assert.equal(recordSolve(pr, source.id, opened.encounter.id, puzzles), null);
  assert.equal(beginEncounter(pr, puzzles, 'fair-final'), null);
  const future = all.find(p => p.id === campaignId('fair-prizes', 'k1'));
  const forged = copy(pr); forged.attempts[future.id] = solve(future);
  assert.throws(() => validateStore(storeFor(forged), puzzles), /not been reached/);
  finish(pr); finish(pr);
  for (const mutate of [
    j => { j.version = 3; }, j => { j.trails.k1.started = false; }, j => { j.trails.k1.completed.reverse(); },
    j => { j.trails.k1.completed.push('marsh-lilies'); }, j => { j.trails.k1.stars['ferry-seats'] = 4; },
    j => { j.trails.k1.stars['ferry-lights'] = 1; }, j => { delete j.trails.k1.stars['ferry-seats']; },
    j => { j.trails.k1.side.push('ferry-bath'); }, j => { j.trails.k1.side.push('unknown'); }, j => { j.trails.x = j.trails.k1; },
    j => { j.trails.k1.stars = []; },
  ]) { const broken = copy(pr); mutate(broken.journey); assert.throws(() => validateStore(storeFor(broken), puzzles)); }
  const unsolved = copy(pr); unsolved.attempts[campaignId('ferry-seats', 'k1')] = freshAttempt(opened.puzzle);
  assert.throws(() => validateStore(storeFor(unsolved), puzzles), 'a completed encounter needs its completed board');
  assert.throws(() => validateJourney(null, pr, puzzles));
  const blank = profile(); blank.journey = freshJourney();
  assert.deepEqual(validateStore(storeFor(blank), puzzles), storeFor(blank));
});

test('keeper lines react to mistakes, hints, solves, locks and Plume’s wins', () => {
  const pr = profile(); startJourney(pr);
  const { puzzle, encounter } = beginEncounter(pr, puzzles), a = freshAttempt(puzzle);
  assert.equal(encounterLine(encounter, puzzle, a, null).text, encounter.lines.open);
  assert.ok(CAST.snooze.oops.includes(encounterLine(encounter, puzzle, a, { kind: 'oops', n: 4 }).text));
  assert.equal(encounterLine(encounter, puzzle, a, { kind: 'hint' }).text, CAST.snooze.hint);
  assert.equal(encounterLine(encounter, puzzle, solve(puzzle), null).text, encounter.lines.win);
  const bath = resolvePuzzle(all.find(p => p.id === campaignId('ferry-bath', 'k1')), pr);
  assert.equal(encounterLine(getEncounter('ferry-bath'), bath, freshAttempt(bath), null).text, getEncounter('ferry-bath').lines.locked);
  const duel = all.find(p => p.id === campaignId('ridge-duel', 'k1'));
  let lost = freshAttempt(duel);
  for (let i = 0; i < 20 && lost.board.piles.some(Boolean); i++) {
    const piles = lost.board.piles, pile = piles.findIndex(Boolean) + 1;
    lost = move(duel, lost, { type: 'choose', pile, remove: 1 }, () => 0);
  }
  if (!isSolved(duel, lost.board)) assert.ok(CAST.plume.gloat.includes(encounterLine(getEncounter('ridge-duel'), duel, lost, null).text));
});

test('views render the road, scenes and journal without art, and use art once it is ready', () => {
  const pr = profile(); startJourney(pr); finish(pr);
  assert.match(roadMapView(pr), /data-art="map\/wide"/);
  assert.match(roadMapView(pr), /data-placeholder="true"/);
  const { puzzle, encounter } = beginEncounter(pr, puzzles), a = freshAttempt(puzzle);
  const html = playView(puzzle, a, { pack: fullPack, profile: pr, encounter, selected: null, message: '' });
  // The wake-up bell is played in its picture; the lily pads keep a scene above their board.
  assert.match(html, /data-art="stage\/ferry\/asleep"/); assert.match(html, /data-art="keeper\/snooze\/talk"/);
  assert.match(html, new RegExp(encounter.lines.open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/’/g, '&#39;|’')));
  finish(pr); finish(pr); finish(pr);
  const lilies = beginEncounter(pr, puzzles);
  assert.equal(lilies.encounter.id, 'marsh-lilies');
  assert.match(playView(lilies.puzzle, freshAttempt(lilies.puzzle), { pack: fullPack, profile: pr, encounter: lilies.encounter, selected: null, message: '' }), /data-art="scene\/marsh\/1"/);
  assert.match(journalView(pr, puzzles), /Turtle Ferry/);
  setManifest({ version: 1, assets: { 'scene/ferry/1': { status: 'ready', image: 'scenes/ferry-1.webp', video: 'scenes/ferry-1.mp4' }, 'keeper/snooze/idle': { status: 'todo', image: 'x.webp' } } });
  assert.ok(asset('scene/ferry/1')); assert.equal(asset('keeper/snooze/idle'), null);
  assert.match(media('scene/ferry/1', 'P'), /<video src=".\/art\/scenes\/ferry-1.mp4" poster=".\/art\/scenes\/ferry-1.webp"/);
  setManifest(null);
});

test('the ferry and marsh puzzles are played in their picture, with the rest of their controls below', async () => {
  const { stageKind } = await import('../dist/road-stage.js');
  const staged = { 'ferry-seats': 'seats', 'ferry-bell': 'bell', 'ferry-lights': 'lights', 'marsh-boardwalks': 'boardwalks' };
  for (const band of BAND_KEYS) {
    const pr = profile(band); startJourney(pr);
    for (const id of Object.keys(staged)) {
      const { puzzle: p, encounter: e } = beginEncounter(pr, puzzles), a = freshAttempt(p);
      assert.equal(e.id, id);
      assert.equal(stageKind(e, p), staged[id], `${band} ${id}`);
      const html = playView(p, a, { pack: fullPack, profile: pr, encounter: e, selected: null, message: '' });
      assert.match(html, /class="lr-stage /); assert.doesNotMatch(html, /lr-scene-art/, `${band} ${id}: no scene above`);
      const count = re => (html.match(re) || []).length;
      if (id === 'ferry-seats') {
        // Each traveler is a button in its seat; the swap pairs sit below.
        assert.equal(count(/class="stage-piece stage-traveler [^"]*" [^>]*data-action="cup"/g), p.start.length);
        assert.equal(count(/data-action="swap-pair"/g), p.edges.length);
        assert.equal(count(/class="stage-piece stage-traveler is-still is-standing"/g), 6 - p.start.length);
      }
      if (id === 'ferry-bell') {
        // Everyone sits where the seats puzzle left them; the bell rings the chart's number.
        assert.equal(count(/class="stage-piece stage-traveler is-still"/g) + count(/is-standing/g), 6);
        assert.equal(count(/class="stage-wheel"/g), p.parameters.clocks.length);
        assert.match(html, /<button type="submit" form="bell-form" class="stage-piece stage-bell/);
        assert.match(html, /<form data-puzzle-form [^>]*id="bell-form">/);
        assert.doesNotMatch(html, /type="number"/);
        assert.ok(count(/name="activations"/g) >= 10);
      }
      if (id === 'ferry-lights') {
        assert.equal(count(/class="wire-hit stage-rope-hit/g), p.parameters.edges.length);
        assert.equal(count(/class="stage-lamp /g), 2 * p.parameters.vertices.length, 'picture and goal card');
        assert.match(html, /class="stage-goal"/);
      }
      if (id === 'marsh-boardwalks') {
        assert.equal(count(/class="stage-piece stage-junction/g), p.parameters.vertices.length);
        assert.equal(count(/class="stage-walk /g), p.parameters.edges.length);
        assert.match(html, /class="stage-piece stage-hops"/);
      }
      pr.attempts[p.id] = solve(p, a); recordSolve(pr, p.id, e.id, puzzles);
    }
    const next = beginEncounter(pr, puzzles);
    assert.equal(stageKind(next.encounter, next.puzzle), null, 'the lily pads keep their own board');
  }
});

test('a keeper reaction shows its own face as a still and settles on idle after its clip', () => {
  const idle = { status: 'ready', image: 'keeper/wick/idle.webp' }, oops = { status: 'ready', image: 'keeper/wick/oops.webp' };
  const react = () => media('keeper/wick/oops', 'P', { then: 'keeper/wick/idle', loop: false });
  setManifest({ version: 1, assets: { 'keeper/wick/idle': idle, 'keeper/wick/oops': oops } });
  assert.match(react(), /<img src=".\/art\/keeper\/wick\/oops.webp"/);
  setManifest({ version: 1, assets: { 'keeper/wick/idle': idle, 'keeper/wick/oops': { ...oops, video: 'keeper/wick/oops.mp4' } } });
  assert.match(react(), /<video src=".\/art\/keeper\/wick\/oops.mp4" poster=".\/art\/keeper\/wick\/oops.webp"[^>]*data-then-image=".\/art\/keeper\/wick\/idle.webp"/);
  globalThis.matchMedia = () => ({ matches: true });
  try { assert.match(react(), /<img src=".\/art\/keeper\/wick\/oops.webp"/); }
  finally { delete globalThis.matchMedia; setManifest(null); }
});

test('every line has a voice ID the art manifest can fill, and every slot has a placeholder', async () => {
  const { voiceLines, artSlots } = await import('../dist/art-slots.js');
  const lines = voiceLines(), ids = new Set(lines.map(l => l.id));
  assert.equal(ids.size, lines.length, 'voice IDs are unique');
  const pr = profile(); startJourney(pr);
  for (const e of [...MAIN, ...SIDE]) {
    const p = resolvePuzzle(all.find(q => q.id === campaignId(e.id, 'k1')), pr), a = freshAttempt(p);
    for (const reaction of [null, { kind: 'oops', n: 0 }, { kind: 'oops', n: 2 }, { kind: 'hint' }]) assert.ok(ids.has(encounterLine(e, p, a, reaction).voice), `${e.id}: ${JSON.stringify(reaction)}`);
  }
  const slots = artSlots();
  assert.equal(slots.length, 95); assert.equal(new Set(slots.map(s => s.id)).size, 95);
  for (const s of slots) assert.ok(s.w > 0 && s.h > 0 && s.about, s.id);
});

test('a board from another trail records on its own trail, and the next step follows the same rule as its label', async () => {
  const { continueAfter } = await import('../dist/road.js');
  const pr = profile('k1'); startJourney(pr);
  const opened = beginEncounter(pr, puzzles);
  pr.band = '45';
  pr.attempts[opened.puzzle.id] = solve(opened.puzzle);
  const result = recordSolve(pr, opened.puzzle.id, opened.encounter.id, puzzles);
  assert.equal(result.first, true); assert.deepEqual(trailFor(pr, 'k1').completed, ['ferry-seats']);
  assert.equal(trailFor(pr, '45').started, false);
  assert.equal(continueAfter(pr, opened.encounter, 'k1').id, 'ferry-bell');
  assert.equal(continueAfter(pr, getEncounter('ferry-bath'), 'k1'), null);
  pr.band = 'k1'; finish(pr); finish(pr);
  assert.equal(continueAfter(pr, getEncounter('ferry-lights'), 'k1'), null, 'a lit stop returns to the map');
  assert.equal(continueAfter(pr, getEncounter('ferry-seats'), 'k1'), null, 'an older replay returns to the map');
});
