// Plays the whole Lantern Road through the real interface on each grade trail:
// keepers' lines and reactions, Plume's score cards and duel, stars, both tools
// and both side puzzles, the fair finale, earlier-story archives, reloads, and
// phone/tablet/desktop layouts. Isolated browser profiles only. Environment:
// PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_BANDS (e.g. "k1").
// Screenshots and results go in test-results/road/.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { waitForOffline } from './browser-offline.mjs';
import { MAIN, SIDE, CAST, getEncounter, getProgress, campaignId, withCampaignPuzzles, rivalScore, resolvePuzzle } from '../dist/road.js';
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
const output = new URL('../test-results/road/', import.meta.url);
await mkdir(output, { recursive: true });
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
    bubble: () => page.locator('.lr-bubble').innerText(),
  };
}
const apos = text => text.replace(/’/g, "'");

try {
  // Earlier stories become archives; the road starts fresh beside them.
  for (const [api, version, count, field] of [[legacy, 1, 4, 'caravanJourney'], [rescue, 2, 6, 'rescueJourney'], [road3, 3, 7, 'roadJourney']]) {
    const original = oldProfile(api, version, count), context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    await context.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, { key: SAVE_KEY, value: JSON.stringify({ ...emptyStore(), activeProfileId: original.id, profiles: [original] }) });
    const page = await context.newPage(), ui = wire(page);
    await page.goto(base); await page.locator('.lr-overview').waitFor();
    await ui.action('journal').click(); await page.locator('.earlier-journey').first().waitFor();
    await page.locator(`.earlier-journey[data-view-key="${version === 1 ? 'caravan' : version === 2 ? 'rescue' : 'road3'}-archive"] summary`).click();
    assert.equal(await page.locator('.earlier-journey[open] .journal-entry').count(), count);
    await ui.action('map').click(); await ui.action('change-band').click(); await page.getByRole('button', { name: 'Apply', exact: true }).click();
    const migrated = await ui.profile();
    assert.equal(migrated.journey.version, 4); assert.deepEqual(migrated.attempts, original.attempts); assert.deepEqual(migrated[field], original.journey);
    parseBackup(JSON.stringify(await ui.state()), puzzles);
    await page.reload(); await page.locator('.lr-overview').waitFor();
    assert.deepEqual(await ui.profile(), migrated);
    await page.screenshot({ path: new URL(`migration-v${version}.png`, output).pathname, fullPage: true });
    checks.push(`v${version} story archived, attempts kept, reload`); await context.close();
  }

  for (const band of bands) {
    const viewport = band === 'k1' ? { width: 390, height: 844 } : band === '23' ? { width: 1024, height: 768 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, hasTouch: band !== '45' }), page = await context.newPage(), ui = wire(page);
    const capture = async name => { await ui.fit(`${band}/${name}`); await page.screenshot({ path: new URL(`${band}-${name}.png`, output).pathname, fullPage: true, animations: 'disabled' }); };
    const hintThrice = async () => { for (let i = 0; i < 3; i++) await ui.action('hint').click(); };
    const solveUI = async (p, label) => {
      for (let steps = 0; !await page.locator('#completion-heading').count() && steps < 400; steps++) {
        if (await page.locator('[data-action=apply-hint]:visible').count()) { await ui.action('apply-hint').click(); continue; }
        // Evidence puzzles never show an answer: play the duel from its solver through real controls.
        const pr = await ui.profile(), id = await page.evaluate(() => location.hash.split('/')[1]), p = resolvePuzzle(all.find(q => q.id === id), pr);
        const action = mechanicFor(p).solve(p, pr.attempts[id].board);
        if (action.type === 'take') {
          const size = pr.attempts[id].board.piles[action.pile - 1];
          await page.locator(`.duel-pebble[data-ui='${JSON.stringify({ pick: { pile: action.pile, from: size - action.remove } })}']`).click();
        }
        await page.locator(`[data-action="expansion-move"][data-move='${JSON.stringify(action)}']`).click();
      }
      assert.equal(await page.locator('#completion-heading').count(), 1, `${label}: completed through controls`);
    };
    await page.goto(base); await page.locator('#nickname').fill(`Road ${band}`); await page.locator(`[name=band][value="${band}"]`).check(); await page.locator('#profile-form button[type=submit]').click();
    await page.locator('.lr-overview').waitFor(); await capture('map-start'); await waitForOffline(page);
    for (let count = 0; count < MAIN.length; count++) {
      const e = MAIN[count];
      await ui.action(count === 0 ? 'start-journey' : 'continue-journey').click().catch(() => {});
      await page.locator('.board-panel').waitFor();
      const id = await page.evaluate(() => location.hash.split('/')[1]);
      assert.equal(id, campaignId(e.id, band), `${band}: encounter ${count} is ${e.id}`);
      const p = all.find(q => q.id === id), rival = rivalScore(e, p);
      // The keeper opens with one line; Plume's card shows only where there is a count.
      assert.equal(apos(await ui.bubble()).includes(apos(e.lines.open)), true, `${id}: open line`);
      assert.equal(await page.locator('.lr-rival').count(), rival === null ? 0 : 1, `${id}: Plume card`);
      if (rival !== null) assert.match(await page.locator('.lr-rival').innerText(), new RegExp(`\\b${rival}\\b`));
      assert.equal(await page.locator(`body[data-stop="${e.stop}"]`).count(), 1, `${id}: page takes the stop's mood`);
      await ui.fit(`${id}/unsolved`);
      if (e.step === 0) await capture(`${e.stop}-puzzle`);
      if (e.id === 'workshop-parts') {
        // An illegal swap gets the keeper's reaction, not a rule.
        const edges = p.edges.map(edge => edge.join(','));
        const pair = [[1, 2], [1, 3], [2, 3]].find(([a, b]) => !edges.includes(`${a},${b}`));
        await page.locator(`.cup-button[data-cell="${pair[0]}"]`).click(); await page.locator(`.cup-button[data-cell="${pair[1]}"]`).click();
        const said = apos(await ui.bubble());
        assert.ok(CAST.sprocket.oops.map(apos).some(line => said.includes(line)), `${id}: oops line`);
        checks.push('illegal move gets a keeper reaction');
      }
      await hintThrice();
      assert.ok(apos(await ui.bubble()).includes(apos(CAST[e.speaker].hint)), `${id}: hint line`);
      const saved = (await ui.profile()).attempts[id];
      await page.reload(); await page.locator('.board-panel').waitFor(); assert.deepEqual((await ui.profile()).attempts[id], saved, `${id}: hints and board survive reload`);
      await solveUI(p, id);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'completion-heading', `${id}: completion focus`);
      const after = await ui.profile(), trail = after.journey.trails[band];
      assert.equal(trail.completed.length, count + 1);
      assert.ok(apos(await ui.bubble()).includes(apos(e.lines.win)), `${id}: win line`);
      const stars = await page.locator('#completion-heading .lr-stars i.on').count();
      assert.equal(stars, trail.stars[e.id], `${id}: stars shown match stars saved`);
      assert.equal(await page.locator('#completion-heading .lr-stars i').count(), rival === null ? 2 : 3);
      if (e.grants) { assert.equal(await page.locator('.lr-tool-earned').count(), 1, `${id}: tool earned`); checks.push(`${e.grants} earned at ${e.id}`); }
      assert.equal(await page.locator('.board-panel button:enabled,.board-panel input:enabled,.board-panel select:enabled').count(), 0, `${id}: solved board is locked until Replay`);
      if (e.step === 2) await capture(`${e.stop}-lit`);
      results.push({ band, id, stars: trail.stars[e.id] });
      if (e.id === 'fair-final') { await ui.action('finale').click(); await page.locator('.lr-finale').waitFor(); await capture('finale'); break; }
      await ui.action('finish-encounter').click();
      if (e.step === 2) {
        await page.locator('.lr-overview').waitFor();
        assert.equal(await page.locator('.lr-map-layer:visible .lr-stop.is-lit').count(), e.stopIndex + 1, `${band}: lit stops`);
        await capture(`map-${e.stop}`);
        // Side puzzles: tried before their tool, finished after it.
        if (e.stop === 'ferry') {
          await page.locator('.lr-map-layer:visible [data-action=open-encounter][data-id="ferry-bath"]').click(); await page.locator('.board-panel').waitFor();
          assert.ok(apos(await ui.bubble()).includes(apos(getEncounter('ferry-bath').lines.locked)));
          assert.equal(await page.getByRole('button', { name: /^Fill jug/ }).count(), 0, 'no Fill without the pump');
          await ui.action('map').click(); checks.push('side puzzle locked before its tool');
        }
        if (e.stop === 'workshop') {
          for (const side of SIDE) {
            await page.locator(`.lr-map-layer:visible [data-action=open-encounter][data-id="${side.id}"]`).click(); await page.locator('.board-panel').waitFor();
            assert.ok(apos(await ui.bubble()).includes(apos(side.lines.open)), `${side.id}: unlocked line`);
            await hintThrice(); await solveUI(all.find(q => q.id === campaignId(side.id, band)), side.id);
            assert.ok((await ui.profile()).journey.trails[band].side.includes(side.id));
            await capture(`side-${side.id}`);
            await ui.action('finish-encounter').click(); await page.locator('.lr-overview').waitFor();
          }
          checks.push('both side puzzles finished after their tools');
        }
      }
    }
    const final = await ui.profile();
    assert.equal(getProgress(final).complete, true); parseBackup(JSON.stringify(await ui.state()), puzzles);
    // Offline replay of a finished encounter keeps the trail.
    await context.setOffline(true); await page.goto(`${base}/#play/${campaignId('ferry-seats', band)}/ferry-seats`); await page.locator('#completion-heading').waitFor();
    await ui.action('replay').click(); await page.locator('.board-panel').waitFor();
    assert.equal((await ui.profile()).journey.trails[band].completed.length, MAIN.length);
    await context.setOffline(false);
    checks.push(`${band}: all ${MAIN.length} encounters, finale, offline replay`);
    await context.close();
  }

  // Finished art replaces placeholders: a fake manifest with one video scene.
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' }), page = await context.newPage(), ui = wire(page);
  await page.route('**/art/manifest.json', route => route.fulfill({ json: { version: 1, assets: { 'map/wide': { status: 'ready', image: 'map/wide.svg' }, 'keeper/snooze/talk': { status: 'todo', image: 'missing.webp' } } } }));
  await page.route('**/art/map/wide.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 4"><rect width="10" height="4" fill="#3a6"/></svg>' }));
  await page.goto(base); await page.locator('#nickname').fill('Art'); await page.locator('#profile-form button[type=submit]').click(); await page.locator('.lr-overview').waitFor();
  assert.equal(await page.locator('.lr-map-wide [data-art="map/wide"] img').count(), 1, 'ready art replaces the placeholder');
  await ui.action('start-journey').click(); await page.locator('.board-panel').waitFor();
  assert.equal(await page.locator('[data-art="keeper/snooze/talk"][data-placeholder="true"]').count(), 1, 'unfinished art keeps the placeholder');
  checks.push('manifest-driven art slots'); await context.close();

  // Video hand-off: a keeper's one-shot reaction plays once, then settles into
  // the idle loop; a pose without art borrows idle rather than a placeholder.
  {
    const save = { id: 'video', name: 'Video', band: 'k1', avatar: 0, sound: false, attempts: {} };
    const { startJourney, beginEncounter, recordSolve } = await import('../dist/road.js');
    startJourney(save);
    while (beginEncounter(save, puzzles)?.encounter.id !== 'workshop-parts') {
      const o = beginEncounter(save, puzzles); let a = freshAttempt(o.puzzle);
      for (let i = 0; i < 400 && !isSolved(o.puzzle, a.board); i++) a = move(o.puzzle, a, mechanicFor(o.puzzle)?.solve ? mechanicFor(o.puzzle).solve(o.puzzle, a.board) : (h => h.action || h.pair)(nextHint(o.puzzle, a)));
      save.attempts[o.puzzle.id] = a; recordSolve(save, o.puzzle.id, o.encounter.id, puzzles);
    }
    const fixture = name => readFile(new URL(`../tests/fixtures/art/${name}`, import.meta.url));
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' }), page = await context.newPage(), ui = wire(page);
    await context.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, { key: SAVE_KEY, value: JSON.stringify({ ...emptyStore(), activeProfileId: 'video', profiles: [save] }) });
    await page.route('**/art/manifest.json', route => route.fulfill({ json: { version: 1, assets: { 'keeper/sprocket/idle': { status: 'ready', image: 'k/still.png', video: 'k/idle.webm' }, 'keeper/sprocket/oops': { status: 'ready', image: 'k/still.png', video: 'k/oops.webm' } } } }));
    for (const name of ['still.png', 'idle.webm', 'oops.webm']) await page.route(`**/art/k/${name}`, async route => route.fulfill({ body: await fixture(name), contentType: name.endsWith('png') ? 'image/png' : 'video/webm' }));
    await page.goto(base); await ui.action('continue-journey').click(); await page.locator('.board-panel').waitFor();
    const keeperVideo = () => page.locator('.lr-keeper video').evaluate(v => ({ src: v.currentSrc || v.src, loop: v.loop, ended: v.ended }));
    assert.match((await keeperVideo()).src, /idle\.webm$/, 'talk without art borrows the idle loop');
    const p = all.find(q => q.id === campaignId('workshop-parts', 'k1')), edges = p.edges.map(e => e.join(','));
    const pair = [[1, 2], [1, 3], [2, 3]].find(([a, b]) => !edges.includes(`${a},${b}`));
    await page.locator(`.cup-button[data-cell="${pair[0]}"]`).click(); await page.locator(`.cup-button[data-cell="${pair[1]}"]`).click();
    const reacting = await keeperVideo();
    assert.match(reacting.src, /oops\.webm$/); assert.equal(reacting.loop, false, 'a reaction plays once');
    await page.waitForFunction(() => /idle\.webm$/.test(document.querySelector('.lr-keeper video')?.currentSrc || ''), null, { timeout: 8000 });
    assert.equal((await keeperVideo()).loop, true, 'the reaction hands over to the idle loop');
    await page.locator('[data-action=hint]:visible').first().click();
    assert.match((await keeperVideo()).src, /idle\.webm$/, 'a re-render keeps the loop running');
    checks.push('video reaction plays once and hands over to the idle loop'); await context.close();
  }

  assert.deepEqual(errors, []);
  await writeFile(new URL('results.json', output), JSON.stringify({ passed: true, bands, checks, results, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, bands, checks }, null, 2));
} catch (error) {
  await writeFile(new URL('results.json', output), JSON.stringify({ passed: false, error: String(error?.stack || error), checks, results, errors }, null, 2));
  throw error;
} finally { await browser.close(); }
