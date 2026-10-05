// Saves around the Lantern Road, through actual controls and isolated browser
// profiles: earlier stories carried through a real backup file, Undo and reload
// partway through a puzzle, solved boards held until Next, library free play
// beside the road, half a trail finished offline, Journal replay, and an
// export/import round trip of a finished trail. Keepers, Plume, stars, tools,
// side puzzles and art are the road suite's (road-browser-smoke.mjs).
// Environment: PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_BANDS
// (e.g. "k1"). Screenshots and results go in test-results/caravan/.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { waitForOffline } from './browser-offline.mjs';
import { MAIN, getProgress, campaignId, withCampaignPuzzles, resolvePuzzle, freshJourney } from '../dist/road.js';
import { mechanicFor } from '../dist/expansion.js';
import { freshAttempt, nextHint, move, isSolved } from '../dist/engine.js';
import * as road3 from '../dist/caravan-road3.js';
import * as legacy from '../dist/caravan-legacy.js';
import * as rescue from '../dist/caravan-rescue.js';
import { emptyStore, parseBackup, SAVE_KEY } from '../dist/storage.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const base = process.env.TEST_URL || 'http://127.0.0.1:4187';
const pack = JSON.parse(await readFile(new URL('../dist/puzzles.json', import.meta.url), 'utf8'));
const proofs = JSON.parse(await readFile(new URL('../dist/proofs.json', import.meta.url), 'utf8'));
const puzzles = [...pack.puzzles, ...proofs.puzzles], all = withCampaignPuzzles(puzzles);
const bands = (process.env.TEST_BANDS || 'k1,23,45').split(',').filter(band => ['k1', '23', '45'].includes(band));
const output = new URL('../test-results/caravan/', import.meta.url);
await mkdir(output, { recursive: true });
const outputPath = name => new URL(name, output).pathname;
const errors = [], checks = [], results = [];
const solveFixture = (p, a = freshAttempt(p)) => {
  for (let i = 0; !isSolved(p, a.board) && i < 300; i++) { const h = nextHint(p, a); a = move(p, a, h.action || h.pair); }
  assert.ok(isSolved(p, a.board), `${p.id}: fixture solved`); return a;
};
function oldProfile(api, version, count) {
  const profile = { id: `old-${version}`, name: `Earlier ${version}`, band: 'k1', avatar: 0, sound: false, attempts: {} };
  api.startJourney(profile);
  for (let i = 0; i < count; i++) {
    let progress = api.getProgress(profile, pack.puzzles);
    if (progress.needsRoute) api.chooseRoute(profile, 'reeds');
    progress = api.getProgress(profile, pack.puzzles);
    if (progress.needsLiftVisit) { const o = api.beginEncounter(profile, pack.puzzles); profile.attempts[o.puzzle.id] = move(o.puzzle, freshAttempt(o.puzzle), { type: 'pour', from: 0, to: 1 }); }
    const opened = api.beginEncounter(profile, pack.puzzles);
    profile.attempts[opened.puzzle.id] = solveFixture(opened.puzzle, profile.attempts[opened.puzzle.id]);
    assert.equal(api.completeEncounter(profile, opened.puzzle.id, opened.encounter.id, pack.puzzles), true);
  }
  return profile;
}
function wire(page) {
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
  return {
    action: name => page.locator(`[data-action="${name}"]:visible`).first(),
    state,
    profile: async () => { const s = await state(); return s.profiles.find(p => p.id === s.activeProfileId); },
    fit: async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no horizontal overflow`),
  };
}
// Grown-ups → Export, saved to test-results; returns the parsed backup and its path.
async function exportBackup(page, ui, name) {
  await ui.action('parents-gate').click(); await page.getByRole('button', { name: 'I’m a grown-up', exact: true }).click();
  const download = page.waitForEvent('download'); await ui.action('export').click();
  const path = outputPath(name); await (await download).saveAs(path);
  return { backup: parseBackup(await readFile(path, 'utf8'), puzzles), path };
}
async function importBackup(page, path) {
  await page.locator('#import-file').setInputFiles(path); await page.getByRole('button', { name: 'Done', exact: true }).click();
}

try {
  // Earlier stories (v1 caravan, v2 rescue, v3 road) survive a real backup
  // file: exported, imported as new explorers, and readable in their Journals.
  {
    const earlier = [[legacy, 1, 4, 'caravanJourney', 'caravan'], [rescue, 2, 6, 'rescueJourney', 'rescue'], [road3, 3, 7, 'roadJourney', 'road3']];
    const originals = earlier.map(([api, version, count]) => oldProfile(api, version, count));
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
    await context.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, { key: SAVE_KEY, value: JSON.stringify({ ...emptyStore(), activeProfileId: originals[0].id, profiles: originals }) });
    const page = await context.newPage(), ui = wire(page);
    const readArchive = async (profileId, [, version, count, , key]) => {
      await ui.action('profiles').click(); await page.locator(`[data-action=choose-profile][data-id="${profileId}"]`).click(); await page.locator('.lr-overview').waitFor();
      await ui.action('journal').click(); await page.locator(`.earlier-journey[data-view-key="${key}-archive"] summary`).click();
      assert.equal(await page.locator('.earlier-journey[open] .journal-entry').count(), count, `v${version} archive entries in ${profileId}'s Journal`);
    };
    await page.goto(base); await page.locator('.lr-overview').waitFor();
    for (const [i, story] of earlier.entries()) await readArchive(originals[i].id, story);
    const { backup, path } = await exportBackup(page, ui, 'earlier-stories-backup.json');
    for (const [i, [, version, , field]] of earlier.entries()) {
      const saved = backup.profiles[i];
      assert.deepEqual(saved[field], originals[i].journey, `v${version}: archive in the backup`);
      assert.deepEqual(saved.attempts, originals[i].attempts, `v${version}: attempts in the backup`);
      assert.deepEqual(saved.journey, freshJourney(), `v${version}: a fresh road beside the archive`);
    }
    await importBackup(page, path);
    const imported = await ui.state();
    assert.equal(imported.profiles.length, 6); assert.equal(new Set(imported.profiles.map(p => p.id)).size, 6, 'imported explorers get new IDs');
    for (const [i, [, , , field]] of earlier.entries()) {
      assert.deepEqual(imported.profiles[i + 3][field], originals[i].journey); assert.deepEqual(imported.profiles[i + 3].attempts, originals[i].attempts);
    }
    await page.reload(); await page.locator('.parent-layout').waitFor();
    assert.deepEqual(await ui.state(), imported, 'imported saves survive reload');
    for (const [i, story] of earlier.entries()) await readArchive(imported.profiles[i + 3].id, story);
    await page.screenshot({ path: outputPath('earlier-stories.png'), fullPage: true });
    checks.push('v1, v2 and v3 archives through export, import, reload and the Journal'); await context.close();
  }

  for (const band of bands) {
    const viewport = band === 'k1' ? { width: 390, height: 844 } : band === '23' ? { width: 1024, height: 768 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, hasTouch: band !== '45', acceptDownloads: true }), page = await context.newPage(), ui = wire(page);
    const capture = async name => { await ui.fit(`${band}/${name}`); await page.screenshot({ path: outputPath(`${band}-${name}.png`), fullPage: true, animations: 'disabled' }); };
    const liveId = () => page.evaluate(() => location.hash.split('/')[1]);
    const hintThrice = async () => { for (let i = 0; i < 3; i++) await ui.action('hint').click(); };
    const solveUI = async label => {
      for (let steps = 0; !await page.locator('#completion-heading').count() && steps < 400; steps++) {
        if (await page.locator('[data-action=apply-hint]:visible').count()) { await ui.action('apply-hint').click(); continue; }
        // Evidence puzzles never show an answer: play the duel from its solver through real controls.
        const pr = await ui.profile(), id = await liveId(), p = resolvePuzzle(all.find(q => q.id === id), pr);
        const action = mechanicFor(p).solve(p, pr.attempts[id].board);
        if (action.type === 'take') {
          const size = pr.attempts[id].board.piles[action.pile - 1];
          await page.locator(`.duel-pebble[data-ui='${JSON.stringify({ pick: { pile: action.pile, from: size - action.remove } })}']`).click();
        }
        await page.locator(`[data-action="expansion-move"][data-move='${JSON.stringify(action)}']`).click();
      }
      assert.equal(await page.locator('#completion-heading').count(), 1, `${label}: completed through controls`);
    };
    const undoChecks = [];
    const verifyMap = async lit => {
      await page.locator('.lr-overview').waitFor();
      assert.equal(await page.locator('.lr-map-layer:visible .lr-stop.is-lit').count(), lit, `${band}: exactly the finished stops are lit`);
      await ui.fit(`${band}/map/${lit}`);
    };
    // Free play of a catalog puzzle has its own save and never moves the road.
    const freePlay = async (puzzleId, label) => {
      const before = structuredClone(await ui.profile());
      await ui.action('library').click(); await page.locator('.caravan-library').waitFor();
      assert.equal(await page.locator(`[data-action=open-puzzle][data-id="${puzzleId}"]`).count(), 1, `${puzzleId} is in Puzzles`);
      await page.goto(`${base}/#play/${puzzleId}`); await page.locator('.board-panel').waitFor();
      assert.equal(await page.locator('.lr-scene').count(), 0, `${label}: free play has no road scene`);
      await hintThrice(); await solveUI(label);
      const after = await ui.profile();
      assert.deepEqual(after.journey, before.journey, `${label}: free play cannot move the road`);
      for (const [id, attempt] of Object.entries(before.attempts)) if (id !== puzzleId) assert.deepEqual(after.attempts[id], attempt, `${id}: free play leaves road boards alone`);
      assert.equal(after.attempts[puzzleId].completed, true);
    };

    await page.goto(base); await page.locator('#nickname').fill(`Caravan ${band}`); await page.locator(`[name=band][value="${band}"]`).check(); await page.locator('#profile-form button[type=submit]').click();
    await verifyMap(0); await capture('opening'); await waitForOffline(page);
    for (let count = 0; count < MAIN.length; count++) {
      const e = MAIN[count], last = e.id === 'fair-final';
      if (await page.locator('.lr-overview').count()) await ui.action(count === 0 ? 'start-journey' : 'continue-journey').click();
      await page.locator('.board-panel').waitFor();
      const id = await liveId(), before = await ui.profile();
      assert.equal(id, campaignId(e.id, band)); assert.equal(await page.evaluate(() => location.hash.split('/')[2]), e.id);
      assert.equal(getProgress(before).completedCount, count);
      assert.equal(await page.locator('.lr-scene').count(), 1);
      await ui.fit(`${band}/${id}/unsolved`);
      await hintThrice();
      const saved = (await ui.profile()).attempts[id];
      await page.reload(); await page.locator('.board-panel').waitFor(); assert.deepEqual((await ui.profile()).attempts[id], saved, `${id}: hints, board and history after reload`);
      // A move and Undo restore the board without touching the trail.
      if (e.step === 0) {
        await ui.action('apply-hint').click();
        if (!await page.locator('#completion-heading').count()) {
          assert.ok((await ui.profile()).attempts[id].history.length > saved.history.length, `${id}: move has history`);
          await ui.action('undo').click();
          const undone = (await ui.profile()).attempts[id];
          assert.deepEqual(undone.board, saved.board, `${id}: Undo board`); assert.deepEqual(undone.history, saved.history, `${id}: Undo history`); assert.equal(undone.moves, saved.moves);
          assert.equal((await ui.profile()).journey.trails[band].completed.length, count);
          await page.reload(); await page.locator('.board-panel').waitFor(); assert.deepEqual((await ui.profile()).attempts[id], undone);
          undoChecks.push(e.id);
        }
      }
      await solveUI(id);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'completion-heading', `${id}: accessible completion focus`);
      assert.equal((await ui.profile()).journey.trails[band].completed.length, count + 1);
      const next = last ? 'finale' : 'finish-encounter';
      assert.equal(await page.locator('[data-action=finish-encounter],[data-action=finale]').count(), 1, `${id}: one continuation action`);
      assert.equal(await page.locator(`[data-action=${next}]`).count(), 1, `${id}: continues with ${next}`);
      assert.equal(await page.evaluate(next => document.querySelector(`[data-action=${next}]`).getBoundingClientRect().top < document.querySelector('.board-panel').getBoundingClientRect().top, next), true, `${id}: Next appears above the solved board`);
      if (band === 'k1') assert.equal(await page.evaluate(next => document.querySelector(`[data-action=${next}]`).getBoundingClientRect().bottom <= innerHeight, next), true, `${id}: Next is visible without scrolling after the solve`);
      assert.equal(await page.locator('.board-panel').count(), 1, `${id}: board stays beside the consequence`);
      assert.equal(await page.locator('.board-panel button:enabled,.board-panel input:enabled,.board-panel select:enabled').count(), 0, `${id}: solved road controls stay locked until Replay`);
      assert.equal(await page.locator('.board-panel [role=button]:not([aria-disabled=true]),.board-panel [role=slider]:not([aria-disabled=true])').count(), 0, `${id}: solved SVG controls stay locked`);
      assert.equal(await page.locator('.lr-scene').getAttribute('data-stage'), String(e.step + 1), `${id}: the scene shows the solve`);
      assert.equal(await page.locator('.error-banner').count(), 0); parseBackup(JSON.stringify(await ui.state()), puzzles); await ui.fit(`${id}/solved`);
      if (e.step === 2) {
        const solvedAttempt = structuredClone((await ui.profile()).attempts[id]);
        await page.reload(); await page.locator('#completion-heading').waitFor();
        assert.deepEqual((await ui.profile()).attempts[id], solvedAttempt, `${id}: reload keeps the solved board until Next`);
        assert.equal(await page.locator('.lr-scene').getAttribute('data-stage'), '3');
        await capture(`${e.stop}-lit`);
      }
      results.push({ band, id, encounter: e.id, mechanic: e.mechanic });
      if (last) { await ui.action('finale').click(); await page.locator('.lr-finale').waitFor(); await ui.action('map').click(); await verifyMap(e.stopIndex + 1); console.log(`Passed ${band}: ${count + 1}/${MAIN.length} ${e.id}`); break; }
      await ui.action('finish-encounter').click();
      if (e.step === 2) {
        await verifyMap(e.stopIndex + 1);
        if (e.stop === 'ferry') {
          await freePlay(all.find(p => p.id === id).sourceId, `${band}/source free play`);
          await ui.action('map').click(); await verifyMap(1);
        }
        if (e.stop === 'hollow' && band === '23') {
          await context.setOffline(true); await page.reload(); await verifyMap(e.stopIndex + 1); checks.push('second half of the middle trail finished offline after reload');
        }
      } else {
        await page.waitForFunction(expected => location.hash.split('/')[2] === expected, MAIN[count + 1].id);
        await page.locator('.board-panel').waitFor();
      }
      console.log(`Passed ${band}: ${count + 1}/${MAIN.length} ${e.id}`);
    }
    assert.equal(getProgress(await ui.profile()).complete, true);
    // Each stop's first puzzle took a move and an Undo, unless one move solved it.
    assert.ok(undoChecks.length >= 5, `${band}: Undo checked at ${undoChecks.join(', ')}`);
    const played = new Set(results.filter(r => r.band === band).map(r => r.mechanic));
    for (const mechanic of new Set(pack.puzzles.map(p => p.mechanic))) assert.ok(played.has(mechanic), `${band}: the road plays ${mechanic}`);
    // Every stop stays lit after reopening the finished road.
    await page.reload(); await verifyMap(7); await capture('complete');
    const finished = structuredClone(await ui.profile());
    await ui.action('journal').click(); await page.locator('.lr-journal-view').waitFor();
    assert.equal(await page.locator('.lr-journal-view [data-action=open-encounter][aria-label^="Replay"]').count(), MAIN.length);
    const first = MAIN[0], firstId = campaignId(first.id, band);
    await page.locator(`.lr-journal-view [data-action=open-encounter][data-id="${first.id}"]`).click(); await page.locator('.board-panel').waitFor();
    assert.equal(await page.locator('#completion-heading').count(), 1); assert.deepEqual((await ui.profile()).attempts[firstId], finished.attempts[firstId], 'revisit keeps the solved road board');
    await ui.action('replay').click(); assert.equal(await page.locator('#completion-heading').count(), 0);
    assert.equal((await ui.profile()).attempts[firstId].moves, 0); assert.deepEqual((await ui.profile()).journey, finished.journey, 'Replay keeps the trail');
    await hintThrice(); await solveUI('replay');
    const replayed = (await ui.profile()).journey.trails[band], kept = finished.journey.trails[band];
    assert.deepEqual(replayed.completed, kept.completed); assert.deepEqual(replayed.side, kept.side);
    for (const [encounterId, stars] of Object.entries(kept.stars)) assert.ok(replayed.stars[encounterId] >= stars, `${encounterId}: a replay never lowers stars`);
    await ui.action('finish-encounter').click(); await verifyMap(7);
    const campaign = structuredClone(await ui.profile());
    await freePlay(`swap-${band}-01`, `${band}/library after the road`);
    await ui.action('map').click(); await verifyMap(7); await context.setOffline(false);
    const { backup, path } = await exportBackup(page, ui, `${band}-backup.json`);
    assert.equal(backup.profiles[0].journey.trails[band].completed.length, MAIN.length);
    assert.deepEqual(backup.profiles[0].journey, campaign.journey);
    await importBackup(page, path);
    const imported = await ui.state();
    assert.equal(imported.profiles.length, 2); assert.notEqual(imported.profiles[0].id, imported.profiles[1].id);
    assert.deepEqual(imported.profiles[1].journey, imported.profiles[0].journey); assert.deepEqual(imported.profiles[1].attempts, imported.profiles[0].attempts);
    checks.push(`${band}: whole road with hints and reload, Undo at ${undoChecks.join(', ')}, solved boards held until Next, Journal replay, free play beside the road, backup round trip`);
    await context.close();
  }

  assert.deepEqual(errors, []);
  const report = { passed: true, bands, encounters: results.length, checks, errors, results };
  await writeFile(outputPath(bands.length === 3 ? 'results.json' : `results-${bands.join('-')}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
} catch (error) {
  await writeFile(outputPath('results.json'), JSON.stringify({ passed: false, error: String(error?.stack || error), checks, results, errors }, null, 2));
  throw error;
} finally { await browser.close(); }
