import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { freshAttempt, move, nextHint, isSolved, restart, validBoard, undo } from '../dist/engine.js';
import { mechanicFor, isExpansion } from '../dist/expansion.js';
import { clockPeriod } from '../dist/motion.js';
import { STOPS, SIDE, MAIN, CAST, TOOLS, BAND_KEYS, SCORE_UNITS, freshJourney, getEncounter, getProgress, startJourney, beginEncounter, recordSolve, validateJourney, withCampaignPuzzles, resolvePuzzle, canVisitEncounter, campaignId, trailFor, hasTool, medals, scoreOf, optimumOf, rivalScore, starsFor, maxStars, rivalVerdict, stopReached, plumeTaunt, starTally, hintCostsStar } from '../dist/road.js';
import { KEEPERS } from '../dist/road-cast.js';
import { emptyStore, validateStore, parseBackup } from '../dist/storage.js';
import { playView } from '../dist/ui.js';
import { roadMapView, journalView, encounterLine, encounterScene, encounterDone, stopSheet, finaleView, talkBeat, sayLine, startTalk, stopTalk, resetTalk } from '../dist/road-ui.js';
import { playInstructions } from '../dist/expansion.js';
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
    assert.match(finaleView(pr, puzzles), /The Lantern Fair/);
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
  // A clean, quick replay earns all three; the first Hint (a nudge) costs nothing,
  // a hint that shows a move costs the No-hints star.
  a = solve(p, restart(p, a)); pr.attempts[p.id] = a;
  assert.equal(starsFor(e, p, { ...a, hintLevel: 1, helpUsed: true }), 3);
  assert.equal(starsFor(e, p, { ...a, hintLevel: 2, helpUsed: true }), 2);
  assert.equal(hintCostsStar({ ...a, hintLevel: 1 }), false); assert.equal(hintCostsStar({ ...a, hintLevel: 2 }), true);
  assert.equal(starsFor(e, p, a), 3); assert.equal(recordSolve(pr, p.id, e.id, puzzles).stars, 3);
  assert.equal(trailFor(pr).stars['ferry-seats'], 3);
  // Undo removes moves from Plume's count.
  let u = restart(p, a); u = move(p, u, p.edges[0]); u = undo(u);
  assert.equal(scoreOf(p, u), 0);
});

test('Plume’s scores are always reachable and tighten along the road', () => {
  const capped = [];
  for (const band of BAND_KEYS) for (const e of MAIN) {
    const p = all.find(p => p.id === campaignId(e.id, band)), rival = rivalScore(e, p);
    if (!SCORE_UNITS[p.mechanic] || e.rival) { assert.equal(rival, null, e.id); assert.equal(maxStars(e, p), 2); continue; }
    // Where the fewest presses fill the press budget, every solve would tie
    // Plume: no card and no third star (docs/ROAD.md).
    const budget = p.parameters?.press_budget;
    if (budget != null && optimumOf(p) >= budget) { assert.equal(rival, null, `${e.id}/${band}: no card at the budget`); assert.equal(maxStars(e, p), 2); capped.push(`${e.id}/${band}`); continue; }
    if (budget != null) assert.ok(rival < budget, `${e.id}/${band}: Plume under the budget`);
    assert.ok(rival >= optimumOf(p), `${e.id}/${band}: Plume never beats the best possible`);
    if (['lighthouse', 'fair'].includes(e.stop)) assert.equal(rival, optimumOf(p), `${e.id}/${band}: Plume is perfect by the lighthouse`);
    assert.equal(maxStars(e, p), 3);
    // An optimal hint-free solve always ties or beats Plume.
    const a = solve(p);
    assert.ok(scoreOf(p, a) <= rival, `${e.id}/${band}: hint path within Plume’s score`);
  }
  assert.deepEqual(capped.sort(), ['ferry-lights/23', 'ferry-lights/45', 'hollow-pumpkins/23', 'lighthouse-lamps/23', 'lighthouse-lamps/45']);
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
    // Locked, the bath shows what it needs instead of a Hint; hints pressed in an
    // older save are not held against it once the pump arrives.
    a = { ...a, hintLevel: 2, helpUsed: true };
    const lockedView = playView(locked, a, { pack: fullPack, profile: pr, encounter: getEncounter('ferry-bath'), selected: null, message: '' });
    assert.match(lockedView, /class="needs-tool"[^>]*>.*Needs the pump/s);
    assert.doesNotMatch(lockedView, /data-action="hint"/); assert.doesNotMatch(lockedView, /class="hint-card"/);
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
    assert.equal(pr.attempts[bath.id].hintLevel, 0, 'the unlocked bath starts with no hints');
    assert.match(playView(resolvePuzzle(bath, pr), pr.attempts[bath.id], { pack: fullPack, profile: pr, encounter: getEncounter('ferry-bath'), selected: null, message: '' }), /data-action="hint"/);
    const sideBath = finish(pr, 'ferry-bath'), sideGarden = finish(pr, 'marsh-garden');
    assert.equal(sideBath.result.stars, 2);
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
  // The first Hint is a nudge with no place in it; a hint that points at a move says where.
  const nudged = { ...a, hintLevel: 1 }, pointed = { ...a, hintLevel: 2 };
  assert.equal(encounterLine(encounter, puzzle, nudged, { kind: 'hint' }).text, CAST.snooze.nudge);
  assert.equal(nextHint(puzzle, pointed).type, 'move');
  assert.equal(encounterLine(encounter, puzzle, pointed, { kind: 'hint' }).text, CAST.snooze.hint);
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
      assert.equal(/class="stage-piece stage-wagon"/.test(html), id !== 'marsh-boardwalks', `${band} ${id}: the wagon rides on the ferry`);
      const count = re => (html.match(re) || []).length;
      if (id === 'ferry-seats') {
        // Each traveler is a button in its seat; the swap pairs sit below.
        assert.equal(count(/class="stage-piece stage-traveler [^"]*" [^>]*data-action="cup"/g), p.start.length);
        assert.equal(count(/data-action="swap-pair"/g), p.edges.length);
        assert.equal(count(/class="stage-piece stage-traveler is-still is-standing"/g), 6 - p.start.length);
      }
      if (id === 'ferry-bell') {
        // Everyone sits where the seats puzzle left them; the bell rings the chosen count.
        assert.equal(count(/class="stage-piece stage-traveler is-still"/g) + count(/is-standing/g), 6);
        assert.equal(count(/class="stage-wheel"/g), p.parameters.clocks.length);
        assert.match(html, /<button type="submit" form="bell-form" class="stage-piece stage-bell/);
        assert.match(html, /<form data-puzzle-form [^>]*id="bell-form" novalidate>/);
        assert.match(html, /class="lr-stage stage-ferry kind-bell has-crop" style="--px0:700;--pvw:900;--py0:40;--pvh:\d+;--pshort:\d+px"/);
        if (clockPeriod(p.parameters) > 20) {
          assert.match(html, /type="number" name="activations"/);
          assert.equal(count(/name="activations"/g), 1);
        } else {
          assert.doesNotMatch(html, /type="number"/);
          assert.ok(count(/name="activations"/g) >= 10);
        }
      }
      if (id === 'ferry-lights') {
        assert.equal(count(/class="wire-hit stage-rope-hit/g), p.parameters.edges.length);
        // Each rope is drawn once (a set the lamp tap lights up) and pressed through one hit above everything drawn.
        assert.equal(count(/class="stage-rope-set" data-ends="/g), p.parameters.edges.length);
        assert.match(html, /<svg class="stage-layer stage-hits"[^>]*>(<path class="wire-hit stage-rope-hit[^>]*\/>)+(<circle class="stage-lamp-hit"[^>]*\/>)+<\/svg>/);
        assert.equal(count(/class="stage-lamp-hit" [^>]*data-stage-lamp="/g), p.parameters.vertices.length);
        assert.equal(count(/class="stage-lamp /g), p.parameters.vertices.length, 'the picture');
        assert.equal(count(/class="stage-goal-lamp /g), p.parameters.vertices.length, 'the goal card');
        assert.match(html, /class="stage-goal"/);
      }
      if (id === 'marsh-boardwalks') {
        assert.equal(count(/class="stage-piece stage-junction/g), p.parameters.vertices.length);
        assert.equal(count(/class="stage-walk /g), p.parameters.edges.length);
        assert.match(html, /class="stage-piece stage-hops"/);
        // Plume's card counts the steps; the stage counts only the lamps lit, so the child sees one count.
        assert.equal(count(/class="lr-race"/g), 1, `${band}: Plume's card counts the walk`);
        assert.equal(html.match(/<p class="stage-count[ "].*?<\/p>/)?.[0], `<p class="stage-count is-lit"><strong>0</strong> of ${p.parameters.edges.length} lamps lit</p>`);
      }
      pr.attempts[p.id] = solve(p, a); recordSolve(pr, p.id, e.id, puzzles);
    }
    const next = beginEncounter(pr, puzzles);
    assert.equal(stageKind(next.encounter, next.puzzle), null, 'the lily pads keep their own board');
  }
});

test('a staged board speaks the stage’s words, and a phone shows the part of the picture that holds its pieces', async () => {
  const { stageKind, stageHelp, dress, phoneView } = await import('../dist/road-stage.js');
  const library = /\b(cups?|letters?|clocks?|wires?|lanterns?|roads?|dots?)\b/i;
  assert.equal(dress('lights', 'Press wire A to C; flip both lanterns.'), 'Press rope A to C; flip both lamps.');
  assert.equal(dress('boardwalks', 'Roads: Dots are junctions; crossings without dots are not junctions.'), 'Boardwalks: Platforms are junctions; crossings without platforms are not junctions.');
  assert.equal(dress('bell', 'Each clock'), 'Each wheel');
  assert.equal(dress('seats', 'Put one cup in its spot.'), 'Put one traveler in its seat.');
  assert.equal(dress(null, 'cups'), 'cups');
  for (const band of BAND_KEYS) {
    const pr = profile(band); startJourney(pr);
    for (let n = 0; n < 4; n++) {
      const { puzzle: p, encounter: e } = beginEncounter(pr, puzzles), a = freshAttempt(p), kind = stageKind(e, p), help = stageHelp(kind, p);
      const where = `${band} ${e.id}`;
      assert.doesNotMatch(`${help.objective} ${help.instructions}`, library, `${where}: How to play in the stage's words`);
      assert.match(help.note, /^On the road /, `${where}: the grown-up notes say what the stage dresses`);
      const html = playView(p, a, { pack: fullPack, profile: pr, encounter: e, selected: null, message: '' });
      // The page is named for the encounter, never "Cup swaps"; a shown goal is the stage's.
      assert.match(html, new RegExp(`data-puzzle-id="${p.id}" class="[^"]*" aria-label="${e.title}"`), where);
      const goal = html.match(/<h1 class="puzzle-goal">([^<]*)<\/h1>/)?.[1];
      if (goal) assert.equal(goal, help.objective, `${where}: goal`); else assert.match(html, new RegExp(`<h1 class="sr-only">${e.title}</h1>`));
      // A hint is dressed too.
      const hinted = playView(p, { ...a, hintLevel: 2 }, { pack: fullPack, profile: pr, encounter: e, selected: null, message: '' });
      assert.doesNotMatch(hinted.match(/<section class="hint-card"[^]*?<\/section>/)?.[0] ?? '', library, `${where}: hint`);
      // On a phone: a crop inside the picture that holds every piece a child taps or reads.
      const view = phoneView(kind, p), crop = view ?? { x0: 200, w: 1200, y0: 0, h: 900 };
      assert.ok(crop.x0 >= 0 && crop.y0 >= 0 && crop.x0 + crop.w <= 1600 && crop.y0 + crop.h <= 900, `${where}: crop inside the picture`);
      const inside = (x, y, half, label) => assert.ok(x - half >= crop.x0 - 1 && x + half <= crop.x0 + crop.w + 1 && y - half >= crop.y0 - 1 && y + half <= crop.y0 + crop.h + 1, `${where}: ${label} at ${x},${y} inside ${JSON.stringify(crop)}`);
      const stage = html.match(/<div class="lr-stage [^]*$/)[0];
      for (const [, cls, x, y, s] of stage.matchAll(/class="stage-piece (stage-(?:traveler|tag|junction|bell)[^"]*)" style="--x:(-?\d+);--y:(-?\d+);--s:(\d+)"/g)) {
        if (/is-still/.test(cls) && !(kind === 'seats' && /is-standing/.test(cls))) continue;  // scenery, except who stands on the bow in the seats puzzle
        const size = Number(s), up = /traveler/.test(cls) ? size / 2 : 0;
        inside(Number(x), Number(y) - up, size / 2, cls.split(' ')[0]);
      }
      for (const [, x, y, r] of stage.matchAll(/class="stage-lamp-hit" cx="([\d.]+)" cy="([\d.]+)" r="(\d+)"/g)) inside(Number(x), Number(y), Number(r), 'lamp');
      for (const [, x, y, w] of stage.matchAll(/<svg class="stage-wheel" x="([\d.]+)" y="([\d.]+)" width="(\d+)"/g)) inside(Number(x) + w / 2, Number(y) + w / 2, w / 2, 'wheel');
      if (kind === 'boardwalks') { const [, x, y, s] = stage.match(/class="stage-piece stage-hops" style="--x:(\d+);--y:(\d+);--s:(\d+)"/); inside(Number(x), Number(y) - s / 2, s / 2, 'Hops'); }
      if (view) assert.match(stage, new RegExp(`has-crop" style="--px0:${view.x0};--pvw:${view.w};--py0:${view.y0};--pvh:${view.h}`));
      // A crop zooms in on the middle 1200 for seats and lamps.
      if (kind === 'seats' || kind === 'lights') assert.ok(view.w < 1200, `${where}: ${view.w} wide`);
      pr.attempts[p.id] = solve(p, a); recordSolve(pr, p.id, e.id, puzzles);
    }
  }
});

test('a stage only takes boards it can draw, and road routes hint at repeats rather than exact-once walks', async () => {
  const { stageKind, stageBoard } = await import('../dist/road-stage.js');
  const seats = getEncounter('ferry-seats');
  for (const p of fullPack.puzzles.filter(q => q.mechanic === 'swap')) {
    const kind = stageKind(seats, p);
    assert.equal(kind === 'seats', p.start.length >= 4 && p.start.length <= 6, `${p.id}: ${p.start.length} seats`);
    if (kind) assert.doesNotThrow(() => stageBoard(kind, { ...p, band: '45' }, freshAttempt(p), { pack: fullPack, profile: profile('45'), sceneStage: 0 }));
  }
  for (const p of puzzles.filter(q => q.mechanic === 'route' && q.parameters.mode === 'cover')) {
    assert.match(p.hints[0], /twice/, p.id);
    assert.equal(p.hint, p.hints[0]);
  }
});

test('the keeper talks while a line is said: its still for a beat, its loop only while a voice plays, then idle', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  resetTalk();
  const pr = profile(); startJourney(pr);
  const { puzzle, encounter } = beginEncounter(pr, puzzles), a = freshAttempt(puzzle);
  const art = pose => ({ status: 'ready', image: `keeper/snooze/${pose}.webp`, video: `keeper/snooze/${pose}.mp4` });
  setManifest({ version: 1, assets: Object.fromEntries(['idle', 'talk', 'oops'].map(pose => [`keeper/snooze/${pose}`, art(pose)])) });
  const scene = (b, reaction = null) => encounterScene(encounter, pr, puzzle, b, { reaction });
  const portraitOf = html => html.match(/<div class="lr-keeper"[^>]*>(.*?)<p class="lr-bubble"/s)[1];
  const lineOf = html => html.match(/<div class="lr-keeper" data-line="([^"]+)"/)[1];
  const still = pose => new RegExp(`<img src="\\./art/keeper/snooze/${pose}\\.webp"`), loop = pose => new RegExp(`<video src="\\./art/keeper/snooze/${pose}\\.mp4"`);
  try {
    // A new opening line: the talk still, never the talk loop without a voice.
    const open = scene(a), line = lineOf(open), text = encounter.lines.open;
    assert.match(portraitOf(open), still('talk'));
    sayLine(line, text);
    t.mock.timers.tick(talkBeat(text) - 1);
    assert.match(portraitOf(scene(a)), still('talk'), 'talking for the beat');
    t.mock.timers.tick(1);
    assert.match(portraitOf(scene(a)), loop('idle'), 'then idle, before any move');
    const moved = move(puzzle, a, step(puzzle, a));
    assert.ok(moved && !isSolved(puzzle, moved.board));
    assert.equal(encounterLine(encounter, puzzle, moved, null).pose, 'talk', 'the line asks to talk whatever the moves');
    assert.match(portraitOf(scene(moved)), loop('idle'), 'a line already said stays idle');
    // Listen: the loop plays while the voice is heard, and idle when it stops.
    const token = startTalk(line);
    assert.match(portraitOf(scene(moved)), loop('talk'));
    globalThis.matchMedia = () => ({ matches: true });
    try { assert.match(portraitOf(scene(moved)), still('talk'), 'reduced motion: the talk still'); } finally { delete globalThis.matchMedia; }
    stopTalk(token);
    assert.match(portraitOf(scene(moved)), loop('idle'));
    // A mistake shows its own face; Listen on it talks, then settles to idle.
    const oops = scene(moved, { kind: 'oops', n: 1 }), oopsLine = lineOf(oops);
    assert.notEqual(oopsLine, line);
    assert.match(portraitOf(oops), /<video src="\.\/art\/keeper\/snooze\/oops\.mp4"[^>]*data-then-video/);
    const heard = startTalk(oopsLine);
    assert.match(portraitOf(scene(moved, { kind: 'oops', n: 1 })), loop('talk'));
    stopTalk(heard);
    assert.match(portraitOf(scene(moved, { kind: 'oops', n: 1 })), loop('idle'), 'not the reaction again');
    // A voice that stops after another line began changes nothing.
    const old = startTalk(oopsLine);
    sayLine(line, text); stopTalk(old);
    assert.match(portraitOf(scene(moved)), still('talk'));
    t.mock.timers.tick(talkBeat(text));
    assert.match(portraitOf(scene(moved)), loop('idle'));
    // Each hint press is a new line; a new screen says the opening again.
    assert.match(portraitOf(scene(moved, { kind: 'hint', n: 1 })), still('talk'));
    resetTalk();
    assert.match(portraitOf(scene(moved)), still('talk'));
    // A pose that borrows talk shows its still.
    setManifest({ version: 1, assets: { 'keeper/snooze/talk': art('talk') } });
    sayLine(line, text); t.mock.timers.tick(talkBeat(text));
    assert.match(portraitOf(scene(moved)), still('talk'), 'idle borrowing talk: no moving mouth');
    // The beat follows the line's length, with its pauses, between 1.2 and 4.5 seconds.
    assert.equal(talkBeat('Hm.'), 1200);
    assert.equal(talkBeat('word '.repeat(20)), 4500);
    assert.ok(talkBeat('Zzz… only the right bell wakes me… zzz…') > talkBeat('Zzz only the right bell wakes me zzz'));
    assert.ok(talkBeat(CAST.snooze.hint) < talkBeat(text));
  } finally { setManifest(null); resetTalk(); }
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
    assert.ok(ids.has(encounterLine(e, p, { ...a, hintLevel: 2 }, { kind: 'hint' }).voice), `${e.id}: a hint that shows a move`);
    for (const band of BAND_KEYS) { const taunt = plumeTaunt(e, band); if (taunt) assert.equal(lines.find(l => l.id === taunt.voice)?.speaker, 'plume'); }
  }
  for (const id of KEEPERS) assert.ok(ids.has(`${id}/bye`), id);
  assert.ok(ids.has('plume/concede'));
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

test('proof gardens: the keeper teases a stuck cover and points to stars after equal counts, without the idea', () => {
  const hollow = getEncounter('hollow-plots'), other = getEncounter('marsh-garden');
  const lonely = all.find(q => q.id === campaignId('hollow-plots', 'k1'));
  let a = freshAttempt(lonely);
  assert.equal(encounterLine(hollow, lonely, a, null).voice, 'hollow-plots/open');
  for (const pair of [[2, 3], [6, 7], [10, 11], [8, 12], [5, 9]]) a = move(lonely, a, { type: 'place', cells: pair });
  const stuck = encounterLine(hollow, lonely, a, null);
  assert.deepEqual([stuck.text, stuck.voice], ['Stuck? Mwahaha! Maybe nobody can…', 'hollow-plots/stuck']);
  assert.equal(encounterLine(hollow, lonely, a, { kind: 'hint' }).voice, 'rattle/hint', 'a Hint press still answers first');
  assert.equal(encounterLine(hollow, lonely, move(lonely, a, { type: 'lift', cell: 5 }), null).voice, 'hollow-plots/open');
  // 4–5's other garden needs a star proof; its colors balance.
  const pr = profile('45'), shared = resolvePuzzle(all.find(q => q.id === campaignId('marsh-garden', '45')), { ...pr, journey: { version: 4, trails: { 45: { started: true, completed: MAIN.slice(0, 12).map(e => e.id), side: [], stars: Object.fromEntries(MAIN.slice(0, 12).map(e => [e.id, 1])) } } } });
  assert.ok(!shared.missingAbility, 'the chalk is earned');
  let b = move(shared, move(shared, freshAttempt(shared), { type: 'mode', mode: 'prove' }), { type: 'checker', cell: shared.parameters.cells[0] });
  b = move(shared, b, { type: 'more', color: 0 });
  const even = encounterLine(other, shared, b, null);
  assert.deepEqual([even.text, even.voice], ['Hmm. I’d try stars, myself.', 'marsh-garden/even']);
  for (const line of [stuck.text, even.text, other.lines.stuck]) assert.doesNotMatch(line, /color|paint|count|partner|neighbo/i, 'the line gives no idea away');
});

// The road review fixes of October 24 (docs/ROAD.md, design decisions).
const esc = text => text.replace(/'/g, '&#39;');
test('the race: Plume’s first line on the ferry, a live count beside the card, both counts on the solved strip', () => {
  for (const band of BAND_KEYS) {
    const pr = profile(band); startJourney(pr);
    const { puzzle: p, encounter: e } = beginEncounter(pr, puzzles), rival = rivalScore(e, p), taunt = plumeTaunt(e, band);
    assert.equal(e.id, 'ferry-seats');
    // The card shows the number; the boast points at it without repeating it,
    // and its Listen says the card's number first (replay could, October 24).
    assert.doesNotMatch(taunt.text, /\d/, `${band}: the boast leaves the number to the card (${taunt.text})`);
    assert.equal(MAIN.filter(x => plumeTaunt(x, band)).length, 1, 'one taunt per trail');
    let a = freshAttempt(p);
    const first = encounterScene(e, pr, p, a);
    assert.match(first, new RegExp(`You <b>0</b>.*Plume <b>${rival}</b> swaps`, 's'));
    assert.ok(first.includes(esc(taunt.text)), 'Plume speaks on the first meeting');
    assert.match(first, new RegExp(`data-voice="voice/${taunt.voice}" data-lead="Plume ${rival} swaps\\."`), `${band}: Listen says Plume's real number first`);
    a = move(p, a, step(p, a));
    assert.match(encounterScene(e, pr, p, a), /You <b>1<\/b>/, 'the count is live');
    a = solve(p, a); pr.attempts[p.id] = a;
    const result = recordSolve(pr, p.id, e.id, puzzles);
    assert.ok(encounterDone(e, pr, p, a, result).includes(`You ${scoreOf(p, a)} · Plume ${rival} swaps`));
    // A replay meets the card without the taunt.
    assert.doesNotMatch(encounterScene(e, pr, p, restart(p, a)), /I did it in|data-lead/);
    // A hinted solve says the star can be won back.
    const hinted = { ...a, hintLevel: 2, helpUsed: true }, fresh = profile(band); startJourney(fresh);
    assert.match(encounterDone(e, fresh, p, hinted, null), /Replay to win it/);
    assert.doesNotMatch(encounterDone(e, fresh, p, { ...a, hintLevel: 1 }, null), /Replay to win it/);
  }
  assert.deepEqual(SCORE_UNITS.color, ['paint', 'paints']);
});

// Reading aloud reads what is on screen (docs/ROAD.md, "K–1 hear the road"):
// these are the marks dist/main.js reads by.
test('reading aloud: reactions are marked, Plume’s verdict and the hint card have Listen, the strip and the medal have one sentence each', async () => {
  const { stripSentence } = await import('../dist/road-ui.js');
  const { voiceLines } = await import('../dist/art-slots.js');
  const ids = new Set(voiceLines().map(l => l.id));
  const pr = profile(); startJourney(pr);
  const { puzzle: p, encounter: e } = beginEncounter(pr, puzzles);
  let a = freshAttempt(p);
  // Only a line that answers the child is a reaction; the opening line coming back is not.
  assert.equal(encounterLine(e, p, a, null).reacts, undefined);
  for (const reaction of [{ kind: 'oops', n: 0 }, { kind: 'hint' }]) assert.equal(encounterLine(e, p, a, reaction).reacts, true, reaction.kind);
  assert.doesNotMatch(encounterScene(e, pr, p, a), /data-reacts/);
  assert.match(encounterScene(e, pr, p, a, { reaction: { kind: 'oops', n: 1 } }), /class="lr-keeper"[^>]*data-reacts="1"/);
  // The hint card: its words and a Listen with the same words, on the road and in the library.
  const card = html => { const section = html.match(/<section class="hint-card"[^]*?<\/section>/)?.[0] || ''; return { words: [...section.matchAll(/<p>([^<]*)<\/p>/g)].map(m => m[1]).join(' '), listen: section.match(/class="lr-listen" data-action="hear-story" data-text="([^"]*)"/)?.[1] }; };
  for (const [q, level, ctx] of [[p, 1, { encounter: e, profile: pr }], [p, 2, { encounter: e, profile: pr }], [puzzles.find(x => x.id === 'tile-k1-01'), 1, {}], [puzzles.find(x => x.id === 'toggle-02'), 1, {}]]) {
    const shown = card(playView(q, { ...freshAttempt(q), hintLevel: level }, { pack: fullPack, selected: null, message: '', ...ctx }));
    assert.ok(shown.words, `${q.id}: hint card words`); assert.equal(shown.listen, shown.words, `${q.id} at hint ${level}: Listen reads the card`);
  }
  // A solve: Plume's verdict line has its own Listen and voice line; the strip says its stars in one sentence.
  a = solve(p, a); pr.attempts[p.id] = a;
  const result = recordSolve(pr, p.id, e.id, puzzles), scene = encounterScene(e, pr, p, a), verdict = rivalVerdict(e, p, a);
  const voice = scene.match(/class="lr-rival-line">[^<]*<button type="button" class="lr-listen" data-action="hear-story" data-text="[^"]*" data-voice="voice\/([^"]+)"/)?.[1];
  assert.match(voice, new RegExp(`^plume/${verdict.result}-\\d$`)); assert.ok(ids.has(voice), voice);
  assert.match(scene, /class="lr-keeper"[^>]*data-reacts="1"/, 'the win line is a reaction');
  assert.match(encounterDone(e, pr, p, a, result), /data-say="Three stars, with no hints! You beat Plume\."/);
  const reasons = (hints, plume) => [{ kind: 'solved', got: true }, { kind: 'hints', got: hints }, ...(plume ? [{ kind: 'plume', got: plume !== 'lose', name: plume === 'tie' ? 'Tied Plume' : 'Beat Plume' }] : [])];
  assert.equal(stripSentence(2, reasons(false, 'beat')), 'Two stars! You beat Plume.');
  assert.equal(stripSentence(2, reasons(true, 'lose')), 'Two stars, with no hints!');
  assert.equal(stripSentence(3, reasons(true, 'tie')), 'Three stars, with no hints! You tied Plume.');
  assert.equal(stripSentence(1, reasons(false, null), 'Chalk'), 'One star! You got the chalk!');
  // The finale: the medals and the stars as one sentence, after the goodbyes.
  while (!getProgress(pr).complete) finish(pr);
  const tally = starTally(pr, puzzles);
  assert.match(finaleView(pr, puzzles), new RegExp(`class="lr-medal-award band-k1" data-say="Grades K to 1 medal! ${tally.earned} of ${tally.max} stars\\."`));
});

test('Pebbles with Plume: Plume shows off while winning, so sensible play can win and random tapping almost never does', () => {
  const never = () => { throw new Error('the showing-off rival never rolls dice'); };
  const rates = {};
  for (const band of BAND_KEYS) {
    const p = all.find(q => q.id === campaignId('ridge-duel', band)), fair = all.find(q => q.id === campaignId('fair-final', band));
    assert.equal(p.rival, 'Plume'); assert.equal(p.parameters.rival_slips, 2);
    assert.equal(fair.rival, 'Plume'); assert.equal(fair.parameters.rival_slips, undefined, 'the rematch is perfect play');
    assert.match(playInstructions(p), /Plume replies automatically/);
    const choices = piles => piles.flatMap((n, i) => Array.from({ length: n }, (_, k) => ({ type: 'choose', pile: i + 1, remove: k + 1 })));
    const memo = new Map();
    // The exact chance of winning when every move is uniformly random among the
    // allowed ones (careful: take a whole last pile, never leave a single pile).
    const chance = (a, careful) => {
      const key = `${careful}|${JSON.stringify(a.board.turns)}`;
      if (memo.has(key)) return memo.get(key);
      let result;
      if (isSolved(p, a.board)) result = 1;
      else if (!a.board.piles.some(Boolean)) result = 0;
      else {
        let options = choices(a.board.piles);
        if (careful) {
          const left = o => a.board.piles.map((n, i) => (i === o.pile - 1 ? n - o.remove : n)).filter(Boolean).length;
          const win = options.find(o => left(o) === 0), safe = options.filter(o => left(o) !== 1);
          options = win ? [win] : safe.length ? safe : options;
        }
        result = options.reduce((sum, o) => sum + chance(move(p, a, o, never), careful), 0) / options.length;
      }
      memo.set(key, result);
      return result;
    };
    const start = freshAttempt(p);
    rates[band] = [chance(start, false), chance(start, true)].map(x => Math.round(x * 100));
    // Deterministic: Undo and the same take meet the same reply.
    const take = choices(start.board.piles).at(-1), once = move(p, start, take, never);
    assert.deepEqual(move(p, undo(once), take, never).board, once.board);
    // A loss names Plume, and waits behind Hint.
    let lost = start;
    for (let i = 0; i < 20 && lost.board.piles.some(Boolean); i++) lost = move(p, lost, { type: 'choose', pile: lost.board.piles.findIndex(Boolean) + 1, remove: 1 }, never);
    if (!isSolved(p, lost.board)) { const h = nextHint(p, lost); assert.match(h.text, /^Plume took the last pebble/); assert.equal(h.quiet, true); }
  }
  // docs/ROAD.md quotes these (random, careful), in percent.
  assert.deepEqual(rates, { k1: [14, 57], '23': [11, 28], '45': [14, 39] });
});

test('Plume’s rematch: Plume speaks, the choose screen says three in a row, and No hints is judged on the winning run', () => {
  const e = getEncounter('fair-final'), p = all.find(q => q.id === campaignId('fair-final', 'k1')), m = mechanicFor(p);
  const rnd = () => 0.3, play = action => { a = move(p, a, action, rnd); assert.ok(a, JSON.stringify(action)); };
  const status = () => m.render(p, a, {});
  let a = freshAttempt(p, rnd);
  assert.match(status(), /Win three in a row\./);
  // A game lost after a hint: the panel closes and the hint is forgotten.
  a = { ...a, hintLevel: 2, helpUsed: true };
  play({ type: 'choose', first: 'you' });
  while (a.board.piles.some(Boolean)) play({ type: 'take', pile: a.board.piles.findIndex(Boolean) + 1, remove: 1 });
  assert.equal(a.board.turns.at(-1).player, 'opponent');
  assert.match(status(), /Plume took the last pebble\./); assert.doesNotMatch(status(), /\bI took/);
  assert.equal(a.hintLevel, 0); assert.equal(a.board.hinted, undefined);
  play({ type: 'again' }); assert.match(status(), /Wins count from a new start\./);
  // A run whose first win used a hint keeps that hint until the run ends.
  a = restart(p, a);
  const win = () => { do play(m.solve(p, a.board)); while (a.board.piles.some(Boolean) || a.board.first === null); };
  a = { ...a, hintLevel: 2 }; win();
  assert.equal(a.hintLevel, 0); assert.equal(a.board.hinted, true); assert.equal(a.board.streak, 1);
  play({ type: 'new' }); assert.match(status(), /Two more in a row\./); assert.equal(a.board.hinted, true);
  win(); play({ type: 'new' }); win();
  assert.ok(isSolved(p, a.board)); assert.equal(starsFor(e, p, a), 1, 'the hinted run');
  // A clean run after Restart earns No hints; a first nudge does not cost it.
  a = restart(p, a); a = { ...a, hintLevel: 1 }; win(); play({ type: 'new' }); win(); play({ type: 'new' }); win();
  assert.ok(isSolved(p, a.board)); assert.equal(starsFor(e, p, a), 2);
  assert.doesNotThrow(() => validBoard(p, a.board));
});

test('the finale: goodbyes, Plume concedes, the medal, stars out of the most, stars still to win, and never a lower trail', () => {
  const most = { k1: 62, '23': 59, '45': 60 };
  for (const band of BAND_KEYS) {
    const pr = profile(band); startJourney(pr);
    finish(pr, undefined, { hints: true });
    while (!getProgress(pr).complete) finish(pr);
    const html = finaleView(pr, puzzles), tally = starTally(pr, puzzles);
    assert.equal(tally.max, most[band]);
    for (const id of KEEPERS) assert.match(html, new RegExp(`data-voice="voice/${id}/bye"`));
    assert.match(html, /data-voice="voice\/plume\/concede"/);
    assert.match(html, new RegExp(`class="lr-medal-award band-${band}"`));
    assert.ok(html.includes(`★ ${tally.earned} <span>of ${tally.max}</span>`));
    assert.match(html, /data-action="open-encounter" [^>]*data-id="ferry-seats" data-replay="1"/, 'the hinted seats can be replayed');
    assert.match(html, /data-action="open-encounter" [^>]*data-id="ferry-bath" aria-label="Play/, 'an unplayed side puzzle');
    assert.match(html, /data-action="library"/);
    const up = html.match(/data-action="switch-band"[^>]*data-id="([^"]+)"/)?.[1];
    assert.equal(up, { k1: '23', '23': '45', '45': undefined }[band], `${band}: the next trail up, never down`);
    // A star earned under an older rule stays and counts.
    const old = copy(pr); old.journey.trails[band].stars['ferry-lights'] = 3;
    if (maxStars(getEncounter('ferry-lights'), all.find(q => q.id === campaignId('ferry-lights', band))) === 2) assert.equal(starTally(old, puzzles).max, tally.max + 1);
    // The finished fair opens its sheet (with the finale button in main.js).
    assert.match(roadMapView(pr), /data-action="stop-sheet" data-id="fair"/);
  }
});

test('the map: the wagon waits at the ferry before the first puzzle, stops show focus, medals are explained, replays start fresh', () => {
  const pr = profile();
  assert.match(roadMapView(pr), /class="lr-wagon lr-wagon-party /, 'the party wagon on a fresh map');
  startJourney(pr);
  assert.doesNotMatch(roadMapView(pr), /lr-medal-key/);
  finish(pr); finish(pr); finish(pr);
  assert.match(roadMapView(pr), /class="lr-medal-key"[^>]*aria-label="Medals: Grades K–1, Grades 2–3, Grades 4–5"/);
  assert.match(stopSheet('ferry', pr, puzzles), /data-id="ferry-seats" data-replay="1"/);
  assert.doesNotMatch(stopSheet('marsh', pr, puzzles), /data-replay/);
});

// Road replay, October 24 evening ------------------------------------------------

test('the crypt door speaks to a child: lights, old tries, Right, ✗ in the row and what to do, on every trail', async () => {
  const { puzzleObjective } = await import('../dist/puzzle-copy.js');
  const crypt = getEncounter('hollow-crypt');
  for (const band of BAND_KEYS) {
    const pr = profile(band); startJourney(pr);
    const p = all.find(q => q.id === campaignId('hollow-crypt', band)), code = mechanicFor(p), n = p.parameters.length;
    // A wrong code: every light 1 (no crypt code is all ones).
    let a = freshAttempt(p);
    for (let i = 0; i < n; i++) a = move(p, a, { type: 'set', position: i, value: 1 });
    a = move(p, a, { type: 'submit' });
    assert.equal(isSolved(p, a.board), false, `${band}: 1…1 is not the code`);
    const html = playView(p, a, { pack: fullPack, profile: pr, encounter: crypt, selected: null, message: '' });
    const text = html.replace(/<[^>]*>/g, ' ');
    assert.match(html, /<h1 class="puzzle-goal">Each old try shows how many lights were right\. Find the code\.<\/h1>/, `${band}: the goal`);
    assert.match(html, /<th scope="col">Old try<\/th><th scope="col">Right<\/th><th scope="col">Your code<\/th>/, `${band}: the table`);
    assert.match(html, /aria-label="Light 1: 0"/); assert.match(html, /role="group" aria-label="Light 1"/);
    assert.doesNotMatch(text, /lantern|Exact matches|recheck|recorded|score|Position/i, `${band}: no adult or library words`);
    // What to do sits under the table, before the code buttons, and shows.
    const feedback = html.match(/<p class="deduction-feedback code-feedback" role="status">([^<]+)<\/p>/)?.[1];
    assert.equal(feedback, band === 'k1' ? 'Change one light and try again.' : 'Some old tries don’t fit yet. Change a light and check again.');
    assert.ok(html.indexOf('code-feedback') > html.indexOf('</table>') && html.indexOf('code-feedback') < html.indexOf('code-choices'));
    // K–1 rows show only ✓ or ✗; older trails also the number the code gives.
    const cells = [...html.matchAll(/<td>([^<]*)<span class="code-mark code-mark-(good|bad)">(✓|✗)<\/span><\/td>/g)];
    assert.equal(cells.length, p.parameters.transcript.length);
    for (const [, count] of cells) assert.equal(count.trim() === '', band === 'k1', `${band}: counts in the row`);
    assert.ok(cells.some(([, , kind]) => kind === 'bad'));
    // Changing a light clears the line; a fresh board has none.
    assert.match(code.render(p, move(p, a, { type: 'set', position: 0, value: 0 })), /code-feedback" role="status" hidden>/);
    // How to play and the hints use the same words.
    assert.equal(puzzleObjective(p), 'Each old try shows how many lights were right. Find the code.');
    assert.match(playInstructions(p), /^Tap 0 or 1 for each light, then Check\./);
    assert.ok(p.rules.every(rule => !/position|display|submit/i.test(rule)), `${band}: plain rules`);
    assert.match(p.hints[0], /light/); assert.doesNotMatch(p.hints[0], /place|position|score|test/i);
    const fresh = freshAttempt(p);
    assert.match(code.hint(p, fresh.board).text, /^Try [01] for light \d\.$/);
  }
  // The library keeps its own words.
  const library = puzzles.find(q => q.id === 'code-02');
  assert.match(mechanicFor(library).render(library, freshAttempt(library)), /Exact matches[\s\S]*aria-label="Position 1: 0"/);
  assert.equal(library.codeWords, undefined);
});

test('one noun per board: each keeper’s line names what the board names', async () => {
  const { visiblePuzzleObjective, puzzleObjective } = await import('../dist/puzzle-copy.js');
  const nouns = { 'ridge-stones': /pebble/, 'fair-prizes': /pebble/, 'hollow-pumpkins': /lantern/, 'workshop-parts': /cups?\b/i, 'lighthouse-gears': /bell/, 'fair-stalls': /road/ };
  for (const [id, noun] of Object.entries(nouns)) {
    const e = getEncounter(id);
    assert.match(e.lines.open, noun, `${id}: keeper`);
    for (const band of BAND_KEYS) {
      const p = all.find(q => q.id === campaignId(id, band));
      const board = `${visiblePuzzleObjective(p)} ${puzzleObjective(p)} ${isExpansion(p) ? playInstructions(p) : ''}`;
      assert.match(board, noun, `${id}/${band}: board`);
    }
  }
  assert.doesNotMatch(getEncounter('ridge-stones').lines.open, /stone/);
  assert.doesNotMatch(getEncounter('fair-prizes').lines.open, /prize is/);
  assert.equal(getEncounter('ridge-stones').title, 'Cable-car pebbles');
  assert.equal(getEncounter('workshop-parts').title, 'Turntable cups');
});

test('kites and stalls: letters a child can read, road lengths beside their roads and only where they differ', async () => {
  const { vertexLabel } = await import('../dist/networks.js');
  const kites = all.find(q => q.id === campaignId('ridge-kites', '45')), color = mechanicFor(kites);
  assert.deepEqual(kites.parameters.vertices.map(v => vertexLabel(kites, v)), [...'ABCDEFGHIJ']);
  let a = move(kites, move(kites, freshAttempt(kites), { vertex: 'o0', color: 1 }), { vertex: 'o1', color: 1 });
  const html = color.render(kites, a);
  assert.doesNotMatch(html.replace(/data-(node|move|focus)="[^"]*"/g, ''), /\b[oi][0-4]\b/, 'no o0…i4 a child can see or hear');
  assert.match(html, /aria-label="Lantern A, color 1, ●/); assert.match(html, /Matching neighbors: A–B/);
  assert.match(color.help(kites, a), /A–B, B–C/);
  assert.equal(a.board.colors.length, 10, 'saves keep colors by position');
  // Stall roads: every length 1 on K–1 and 2–3, so none is printed; 4–5 prints each beside its road.
  for (const band of BAND_KEYS) {
    const p = all.find(q => q.id === campaignId('fair-stalls', band)), route = mechanicFor(p);
    const lengths = new Set(p.parameters.edges.map(e => e[2])), svg = route.render(p, freshAttempt(p)).match(/<svg[\s\S]*?<\/svg>/)[0];
    const labels = [...svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"[^>]*>([^<]*)<\/text>/g)];
    assert.equal(labels.length, lengths.size > 1 ? p.parameters.edges.length : 0, `${band}: lengths shown only where they differ`);
    const lines = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)].map(m => m.slice(1).map(Number));
    labels.forEach(([, x, y], i) => {
      const [x1, y1, x2, y2] = lines[i], len = Math.hypot(x2 - x1, y2 - y1), off = Math.abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / len;
      assert.ok(off >= 3, `${band}: label ${i} sits beside its road (${off.toFixed(1)})`);
    });
  }
});

test('taps that can’t act answer: a stop further on, a junction no road reaches', async () => {
  const { stageBoard } = await import('../dist/road-stage.js');
  const pr = profile('23'); startJourney(pr);
  const map = roadMapView(pr);
  assert.match(map, /<button type="button" class="lr-stop[^"]*is-ahead"[^>]*data-action="refuse" data-id="hollow"[^>]*data-text="That’s further on!" aria-disabled="true"/);
  assert.doesNotMatch(map, /data-action="noop"|lr-stop[^>]*\sdisabled[\s>]/);
  // The stalls on K–1: from the start no road goes straight to the far side.
  const stalls = all.find(q => q.id === campaignId('fair-stalls', 'k1')), route = mechanicFor(stalls), q = stalls.parameters;
  const html = route.render(stalls, freshAttempt(stalls));
  const refused = [...html.matchAll(/data-action="refuse" data-text="([^"]+)" aria-disabled="true"[^>]*data-node="([^"]+)"/g)];
  assert.ok(refused.length > 0);
  for (const [, text, v] of refused) {
    assert.equal(text, `No road goes from ${q.start} to ${v}.`);
    assert.ok(!q.edges.some(([u, w]) => [u, w].includes(q.start) && [u, w].includes(v)));
  }
  assert.doesNotMatch(html, /data-action="refuse"[^>]*\sdisabled[\s>]/);
  // The boardwalks say it in the stage's words.
  const walks = all.find(p => p.id === campaignId('marsh-boardwalks', '23')), w = walks.parameters;
  let b = freshAttempt(walks); b = move(walks, b, { vertex: w.vertices[0] });
  const stage = stageBoard('boardwalks', walks, b, { pack: fullPack, profile: pr, sceneStage: 0 });
  const refusedWalk = [...stage.matchAll(/data-action="refuse" data-text="([^"]+)"/g)].map(m => m[1]);
  assert.ok(refusedWalk.length > 0 && refusedWalk.every(t => /^No boardwalk goes from /.test(t)), refusedWalk.join());
});

test('a stop sheet shows what a locked side puzzle needs; keepers’ circles take their colour while art loads', () => {
  const pr = profile('23'); startJourney(pr);
  finish(pr);
  const sheet = stopSheet('ferry', pr, puzzles);
  assert.match(sheet, /class="secondary small lr-needs" data-action="open-encounter" data-id="ferry-bath"[^>]*aria-label="Snooze’s bath, needs the pump">[\s\S]*Needs the pump<\/button>/);
  assert.doesNotMatch(sheet, /aria-label="Play Snooze’s bath"/);
  assert.match(sheet, /<div style="--keeper:#5fa57f" class="art-slot lr-portrait"/);
});
