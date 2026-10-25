// Plays the whole Lantern Road through the real interface on each grade trail:
// keepers' lines and reactions, Plume's score cards and duel, stars, both tools
// and both side puzzles, the fair finale, earlier-story archives, reloads, and
// phone/tablet/desktop layouts. Isolated browser profiles only. Environment:
// PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL, TEST_BANDS (e.g. "k1").
// Screenshots and results go in test-results/road/.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { waitForOffline } from './browser-offline.mjs';
import { MAIN, SIDE, CAST, SCORE_UNITS, getEncounter, getProgress, campaignId, withCampaignPuzzles, rivalScore, resolvePuzzle, plumeTaunt, scoreOf, starTally } from '../dist/road.js';
import { KEEPERS } from '../dist/road-cast.js';
import { mechanicFor } from '../dist/expansion.js';
import { freshAttempt, nextHint, move, isSolved, solveSwaps } from '../dist/engine.js';
import * as road3 from '../dist/caravan-road3.js';
import * as legacy from '../dist/caravan-legacy.js';
import * as rescue from '../dist/caravan-rescue.js';
import { emptyStore, parseBackup, SAVE_KEY } from '../dist/storage.js';
import { REGIONS } from '../dist/families.js';

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
// A K–1 save that has played the road up to an encounter (or to the end), each board solved by its solver or hints.
async function roadSave(id, until = null) {
  const { startJourney, beginEncounter, recordSolve } = await import('../dist/road.js');
  const save = { id, name: id, band: 'k1', avatar: 0, sound: false, attempts: {} };
  startJourney(save);
  for (let o = beginEncounter(save, puzzles); o && o.encounter.id !== until && !getProgress(save).complete; o = beginEncounter(save, puzzles)) {
    let a = save.attempts[o.puzzle.id] || freshAttempt(o.puzzle);
    for (let i = 0; i < 400 && !isSolved(o.puzzle, a.board); i++) a = move(o.puzzle, a, mechanicFor(o.puzzle)?.solve ? mechanicFor(o.puzzle).solve(o.puzzle, a.board) : (h => h.action || h.pair)(nextHint(o.puzzle, a)));
    save.attempts[o.puzzle.id] = a; recordSolve(save, o.puzzle.id, o.encounter.id, puzzles);
  }
  return save;
}
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
// A stand-in browser voice that says each line at once and logs it (window.said()).
function autoVoice() {
  const said = [];
  Object.defineProperty(window, 'speechSynthesis', { value: { speak(u) { said.push(u.text); setTimeout(() => { u.onstart?.(); setTimeout(() => u.onend?.(), 0); }, 0); }, cancel() {}, getVoices: () => [] }, configurable: true });
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  window.said = () => said.slice();
}

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
    // Phone and tablet run with reduced motion: a pressed map button must not jump out from under the finger.
    const context = await browser.newContext({ viewport, hasTouch: band !== '45', reducedMotion: band === '45' ? 'no-preference' : 'reduce' }), page = await context.newPage(), ui = wire(page);
    // K–1 reads aloud by default: a stand-in voice hears every hint card, solved strip and the finale.
    const hears = async (text, label) => { if (band === 'k1') await page.waitForFunction(want => window.said().includes(want), text, { timeout: 8000 }).catch(async () => assert.fail(`${label}: “${text}” not read (${JSON.stringify((await page.evaluate(() => window.said())).slice(-4))})`)); };
    if (band === 'k1') await page.addInitScript(autoVoice);
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
    assert.equal(await page.locator('.lr-map-layer:visible .lr-wagon-party').count(), 1, `${band}: the wagon waits at the ferry`);
    for (let count = 0; count < MAIN.length; count++) {
      const e = MAIN[count];
      // From the map, tap the stop itself (the first matching control); Next already opened puzzles within a stop.
      if (await page.locator('.lr-overview').count()) {
        const stop = page.locator(`.lr-map-layer:visible .lr-stop[data-id="${e.stop}"]`);
        assert.equal(await stop.getAttribute('data-action'), count === 0 ? 'start-journey' : 'continue-journey', `${band}: ${e.stop} is the stop to tap`);
        await stop.click();
      }
      await page.locator('.board-panel').waitFor();
      const id = await page.evaluate(() => location.hash.split('/')[1]);
      assert.equal(id, campaignId(e.id, band), `${band}: encounter ${count} is ${e.id}`);
      const p = all.find(q => q.id === id), rival = rivalScore(e, p);
      // The keeper opens with one line; Plume's card shows only where there is a count.
      assert.equal(apos(await ui.bubble()).includes(apos(e.lines.open)), true, `${id}: open line`);
      assert.equal(await page.locator('.lr-rival').count(), rival === null ? 0 : 1, `${id}: Plume card`);
      if (rival !== null) {
        // The race: both counts beside the card; Plume's first line on the first card.
        const unit = SCORE_UNITS[p.mechanic][rival === 1 ? 0 : 1];
        assert.equal((await page.locator('.lr-race').innerText()).replace(/\s+/g, ' ').trim(), `You 0 · Plume ${rival} ${unit}`, `${id}: race count`);
        const taunt = plumeTaunt(e, band);
        assert.equal(await page.locator('.lr-rival-line').count(), taunt ? 1 : 0, `${id}: Plume speaks only on the first card`);
        if (taunt) { assert.ok(apos(await page.locator('.lr-rival-line').innerText()).includes(apos(taunt.text))); checks.push(`${band}: Plume's first line and the race count`); }
      }
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
      // The first Hint is a free nudge: Snooze says no place; the No-hints star stays.
      await ui.action('hint').click();
      assert.equal((await ui.profile()).attempts[id].hintLevel, 1);
      assert.ok(apos(await ui.bubble()).includes(apos(CAST[e.speaker].nudge || CAST[e.speaker].hint)), `${id}: first hint line`);
      await hears(await page.locator('.hint-card .lr-listen').getAttribute('data-text'), `${id}: the hint card`);
      for (let i = 0; i < 2; i++) await ui.action('hint').click();
      assert.ok(apos(await ui.bubble()).includes(apos(CAST[e.speaker].hint)) || (CAST[e.speaker].nudge && apos(await ui.bubble()).includes(apos(CAST[e.speaker].nudge))), `${id}: hint line`);
      const saved = (await ui.profile()).attempts[id];
      await page.reload(); await page.locator('.board-panel').waitFor(); assert.deepEqual((await ui.profile()).attempts[id], saved, `${id}: hints and board survive reload`);
      await solveUI(p, id);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'completion-heading', `${id}: completion focus`);
      const after = await ui.profile(), trail = after.journey.trails[band];
      assert.equal(trail.completed.length, count + 1);
      assert.ok(apos(await ui.bubble()).includes(apos(e.lines.win)), `${id}: win line`);
      await hears(await page.locator('.lr-done').getAttribute('data-say'), `${id}: the solved strip`);
      if (band === 'k1') { const heard = await page.evaluate(() => window.said()); assert.ok(heard.lastIndexOf(e.lines.win) < heard.lastIndexOf(await page.locator('.lr-done').getAttribute('data-say')), `${id}: the win line before the strip`); }
      const stars = await page.locator('#completion-heading .lr-stars i.on').count();
      assert.equal(stars, trail.stars[e.id], `${id}: stars shown match stars saved`);
      assert.equal(await page.locator('#completion-heading .lr-stars i').count(), rival === null ? 2 : 3);
      // Three hints cost the No-hints star; the strip says a replay can win it back, and repeats the race.
      const reasons = await page.locator('.lr-star-reasons').innerText();
      assert.match(reasons, /Replay to win it/, `${id}: the hint star can be won back`);
      if (rival !== null) assert.ok(reasons.includes(`You ${scoreOf(p, after.attempts[id])} · Plume ${rival} `), `${id}: both counts on the strip`);
      if (e.grants) { assert.equal(await page.locator('.lr-tool-earned').count(), 1, `${id}: tool earned`); checks.push(`${e.grants} earned at ${e.id}`); }
      assert.equal(await page.locator('.board-panel button:enabled,.board-panel input:enabled,.board-panel select:enabled').count(), 0, `${id}: solved board is locked until Replay`);
      if (e.step === 2) await capture(`${e.stop}-lit`);
      results.push({ band, id, stars: trail.stars[e.id] });
      if (e.id === 'fair-final') {
        await ui.action('finale').click(); await page.locator('.lr-finale').waitFor(); await capture('finale');
        for (const line of [...KEEPERS.map(k => CAST[k].bye), CAST.plume.concede, await page.locator('.lr-medal-award').getAttribute('data-say')]) await hears(line, `${band} finale`);
        // Goodbyes, Plume's concession, the medal, stars of the most, and the next trail up.
        assert.equal(await page.locator('.lr-bye').count(), KEEPERS.length + 1);
        assert.ok(apos(await page.locator('.lr-byes').innerText()).includes(apos(CAST.plume.concede)));
        assert.equal(await page.locator(`.lr-medal-award.band-${band}`).count(), 1);
        const tally = starTally(await ui.profile(), puzzles);
        assert.equal((await page.locator('.lr-finale-stars').innerText()).replace(/\s+/g, ' ').trim(), `★ ${tally.earned} of ${tally.max}`);
        assert.equal(await page.locator('.lr-missing [data-action=open-encounter]').count(), tally.missing.length);
        assert.equal(await page.locator('[data-action=switch-band]').getAttribute('data-id').catch(() => null), { k1: '23', '23': '45', '45': null }[band], `${band}: never a lower trail`);
        // The finished fair on the map opens its sheet, with the finale.
        await ui.action('map').click(); await page.locator('.lr-overview').waitFor();
        // The finished map keeps the medal key and the party wagon off the fair's stars and pips.
        const boxOf = selector => page.locator(selector).first().boundingBox();
        const [badge, key, wagon] = await Promise.all(['.lr-map-layer:visible .lr-stop[data-id="fair"] .lr-stop-badge', '.lr-medal-key', '.lr-map-layer:visible .lr-wagon-party'].map(boxOf));
        const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
        assert.equal(overlap(badge, key), 0, `${band}: the medal key clear of the fair's pips`);
        assert.equal(overlap(badge, wagon), 0, `${band}: the wagon clear of the fair's pips`);
        checks.push(`${band}: the finished map keeps the medal key and wagon off the fair's stars`);
        await page.locator('.lr-map-layer:visible .lr-stop[data-id="fair"]').click();
        await page.getByRole('button', { name: 'Finale' }).click(); await page.locator('.lr-finale').waitFor();
        checks.push(`${band}: finale goodbyes, medal, stars of ${tally.max}, the fair's sheet`);
        if (band === 'k1') {
          // A replay from the finale: lose the Plume star on purpose (a pair
          // swapped and back), and the solved strip says how to win it back,
          // then leads back to the finale, also after a reload.
          const parts = getEncounter('workshop-parts'), pp = all.find(q => q.id === campaignId(parts.id, band)), beat = rivalScore(parts, pp);
          await page.getByRole('button', { name: `Replay ${parts.title}`, exact: true }).click(); await page.locator('.board-panel').waitFor();
          assert.equal(await page.evaluate(() => location.hash), `#play/${pp.id}/${parts.id}/finale`, 'the replay remembers the finale');
          const cups = async ([x, y]) => { await page.locator(`.cup-button[data-cell="${x}"]`).click(); await page.locator(`.cup-button[data-cell="${y}"]`).click(); };
          for (let i = 0; i < beat; i++) { await cups(pp.edges[0]); await cups(pp.edges[0]); }
          for (let i = 0; i < 40 && !await page.locator('#completion-heading').count(); i++) { const pr = await ui.profile(); await cups(nextHint(pp, pr.attempts[pp.id]).pair); }
          const plumeRow = page.locator('.lr-star-reasons li').filter({ hasText: 'Plume' });
          assert.equal(await plumeRow.getAttribute('class'), '', 'the Plume star is missed');
          assert.match(await plumeRow.innerText(), /You \d+ · Plume \d+ swaps\s*Replay to win it/, 'the missed Plume star says how to win it back');
          assert.equal(await page.locator('.lr-star-reasons li').filter({ hasText: 'No hints' }).getAttribute('class'), 'got');
          assert.equal((await page.locator('.lr-star-reasons').innerText()).match(/Replay to win it/g).length, 1, 'one nudge, for the one star missed');
          await capture('finale-replay-solved');
          await page.reload(); await page.locator('#completion-heading').waitFor();
          const back = page.locator('.lr-done-actions .primary');
          assert.match(await back.innerText(), /^The Lantern Fair/, 'the strip leads back to the finale');
          await back.click(); await page.locator('.lr-finale').waitFor();
          assert.equal(await page.evaluate(() => location.hash), '#finale');
          checks.push('k1: a missed Plume star says Replay to win it; a replay from the finale returns to #finale');
        }
        break;
      }
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
          assert.equal(await page.locator('[data-action=hint]:visible').count(), 0, 'no Hint before the pump');
          assert.match(await page.locator('.needs-tool').innerText(), /Needs the pump/);
          if (band === 'k1') await capture('bath-locked');
          await ui.action('map').click(); checks.push('side puzzle locked before its tool');
          // The ferry's sheet shows the bath's need, as its map tile does, not Play.
          await page.locator('.lr-map-layer:visible .lr-stop[data-id="ferry"]').click();
          const sheet = page.locator('dialog.modal[open]');
          assert.equal(await sheet.locator('.lr-needs[data-id="ferry-bath"]').innerText(), 'Needs the pump');
          assert.equal(await sheet.getByRole('button', { name: 'Play Snooze’s bath' }).count(), 0, 'no Play on a locked side puzzle');
          await sheet.getByRole('button', { name: 'Done' }).click();
          checks.push('a stop sheet shows what a locked side puzzle needs');
        }
        if (e.stop === 'workshop') {
          for (const side of SIDE) {
            await page.locator(`.lr-map-layer:visible [data-action=open-encounter][data-id="${side.id}"]`).click(); await page.locator('.board-panel').waitFor();
            assert.ok(apos(await ui.bubble()).includes(apos(side.lines.open)), `${side.id}: unlocked line`);
            await hintThrice(); await solveUI(all.find(q => q.id === campaignId(side.id, band)), side.id);
            await hears(await page.locator('.lr-done').getAttribute('data-say'), `${side.id}: the solved strip`);
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
    checks.push(`${band}: all ${MAIN.length} encounters, finale, offline replay${band === 'k1' ? '; every hint card, solved strip and goodbye read aloud' : ''}`);
    // The Puzzles library opens closed, with the road's mechanics on a shelf of
    // their own at the top and every other family once, under its region.
    await ui.action('library').click(); await page.locator('.caravan-library').waitFor();
    assert.equal(await page.locator('.satchel-family[open]').count(), 0, `${band}: the library opens with every family closed`);
    const shelves = await page.locator('.caravan-library').evaluate(root => { const out = {}; let at = null; for (const n of root.children) { if (n.matches('.library-shelf')) out[at = n.textContent] = []; else if (at && n.matches('.satchel-family')) out[at].push({ title: n.querySelector('summary strong').textContent, summary: n.querySelector('summary').textContent }); } return out; });
    const [shelfName, ...regionNames] = Object.keys(shelves);
    assert.equal(shelfName, 'From the road', `${band}: the road's shelf comes first`);
    assert.ok(shelves['From the road'].some(f => f.title === 'Cup swaps') && shelves['From the road'].length >= 8, `${band}: the shelf holds the road's mechanics`);
    assert.deepEqual(regionNames, Object.values(REGIONS).filter(name => regionNames.includes(name)), `${band}: then the regions in order, each heading only its name`);
    assert.ok(regionNames.length >= 6, `${band}: the other families sit in regions (${regionNames.join(', ')})`);
    const titles = Object.values(shelves).flat().map(f => f.title);
    assert.equal(new Set(titles).size, titles.length, `${band}: a family on the shelf is not listed again under its region`);
    assert.equal(titles.length, await page.locator('.satchel-family').count(), `${band}: every family is on the shelf or under a region`);
    // AGENTS.md: no total/explored counters in puzzle selection; a solved puzzle shows the road's ✓ instead.
    assert.ok(Object.values(shelves).flat().every(f => !/\d/.test(f.summary)), `${band}: no family shows a count`);
    await page.locator('.satchel-family').first().locator('summary').click();
    await page.locator('.satchel-family[open] .puzzle-card').first().click(); await page.locator('.board-panel').waitFor();
    await capture('library-to-board');
    const libraryId = await page.evaluate(() => decodeURIComponent(location.hash.split('/')[1]));
    for (let steps = 0; !await page.locator('#completion-heading').count() && steps < 80; steps++) await ui.action(await page.locator('[data-action=apply-hint]:visible').count() ? 'apply-hint' : 'hint').click();
    assert.equal(await page.locator('#completion-heading').count(), 1, `${band}: ${libraryId} solved in the library`);
    await ui.action('library').click(); await page.locator('.caravan-library').waitFor();
    const solvedFamily = page.locator('.satchel-family').filter({ has: page.locator(`[data-id="${libraryId}"]`) });
    if (!await solvedFamily.evaluate(d => d.open)) await solvedFamily.locator('summary').click();
    const solvedCard = page.locator(`.puzzle-card[data-id="${libraryId}"]`);
    assert.equal(await solvedCard.locator('.puzzle-check').innerText(), '✓', `${band}: a solved puzzle shows the road's ✓`);
    assert.match(await solvedCard.getAttribute('aria-label'), /, completed$/);
    assert.equal(await page.locator('.puzzle-check').count(), 1, `${band}: only the solved puzzle carries the mark`);
    assert.ok(!/\d/.test(await solvedFamily.locator('summary').innerText()), `${band}: still no count once a puzzle is solved`);
    await capture('library-solved');
    checks.push(`${band}: library opens closed, road shelf first then ${regionNames.length} regions with each family once, two taps to a board, no family counts, a solved puzzle marked ✓`);
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

  // Talk means speaking now: a new line shows the talk still for a beat as
  // long as the line, then idle; the talk loop plays only while a voice is
  // heard (a recording, then the browser voice) and idle follows when it stops.
  {
    const fixture = name => readFile(new URL(`../tests/fixtures/art/${name}`, import.meta.url));
    // Two seconds of silence as an 8-bit WAV: the recorded line.
    const wav = (rate = 8000, n = 16000) => { const b = Buffer.alloc(44 + n, 128); b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40); return b; };
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' }), page = await context.newPage(), ui = wire(page);
    // A browser voice that starts on the next task, as a real one does, and
    // ends when the suite says. Like a real voice it cannot end before it has
    // started: the suite waits for voiceHeard() when nothing on screen shows
    // the start (with reduced motion the line's beat already shows the talk
    // still), and endVoice() before the start fails instead of leaving a
    // late start that nothing ends.
    await context.addInitScript(() => {
      const voice = { speaking: null, started: null, speak(u) { this.speaking = u; setTimeout(() => { u.onstart?.(); this.started = u; }, 0); }, cancel() { const u = this.speaking; this.speaking = null; u?.onerror?.({ error: 'canceled' }); }, getVoices: () => [] };
      Object.defineProperty(window, 'speechSynthesis', { value: voice, configurable: true });
      window.SpeechSynthesisUtterance = function (text) { this.text = text; };
      window.voiceHeard = () => Boolean(voice.speaking) && voice.started === voice.speaking;
      window.endVoice = () => { const u = voice.speaking; if (u && voice.started !== u) throw new Error('endVoice: the voice has not started yet'); voice.speaking = null; u?.onend?.(); };
    });
    await page.route('**/art/manifest.json', route => route.fulfill({ json: { version: 1, assets: { 'keeper/snooze/idle': { status: 'ready', image: 'k/still.png', video: 'k/idle.webm' }, 'keeper/snooze/talk': { status: 'ready', image: 'k/talk.png', video: 'k/talk.webm' }, 'voice/ferry-seats/open': { status: 'ready', audio: 'k/line.wav' } } } }));
    for (const [name, file, type] of [['still.png', 'still.png', 'image/png'], ['talk.png', 'still.png', 'image/png'], ['idle.webm', 'idle.webm', 'video/webm'], ['talk.webm', 'idle.webm', 'video/webm']]) await page.route(`**/art/k/${name}`, async route => route.fulfill({ body: await fixture(file), contentType: type }));
    await page.route('**/art/k/line.wav', route => route.fulfill({ body: wav(), contentType: 'audio/wav' }));
    const shown = () => page.locator('.lr-keeper > .art-slot').evaluate(n => n.dataset.artSrc.replace(/^.*\/art\//, ''));
    const until = src => page.waitForFunction(want => document.querySelector('.lr-keeper > .art-slot')?.dataset.artSrc.endsWith(want), src, { timeout: 8000 });
    // A 2–3 explorer: the screen is not read aloud by itself (K–1 below).
    await page.goto(base); await page.locator('#nickname').fill('Talk'); await page.locator('[name=band][value="23"]').check(); await page.locator('#profile-form button[type=submit]').click(); await page.locator('.lr-overview').waitFor();
    await ui.action('start-journey').click(); await page.locator('.board-panel').waitFor();
    const opened = Date.now();
    assert.equal(await shown(), 'k/talk.png', 'a new line: the talk still, not the loop');
    await until('k/idle.webm');
    const beat = Date.now() - opened;
    assert.ok(beat > 2000 && beat < 6000, `then idle after a beat as long as the line (${beat} ms)`);
    await ui.action('hear-story').click();
    await until('k/talk.webm');
    assert.equal(await page.locator('.lr-keeper video').evaluate(v => v.loop), true, 'the talk loop while the recording plays');
    await until('k/idle.webm');
    checks.push(`talk: a ${beat} ms beat for the opening, the loop while its recording plays`);
    await page.locator('[data-action=hint]:visible').first().click();
    assert.equal(await shown(), 'k/talk.png', 'a hint is a new line');
    await ui.action('hear-story').click();
    await until('k/talk.webm');
    await page.evaluate(() => window.endVoice());
    await until('k/idle.webm');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ui.action('hear-story').click();
    await page.waitForFunction(() => window.voiceHeard(), null, { timeout: 8000 });
    assert.equal(await shown(), 'k/talk.png', 'with reduced motion a heard voice shows the talk still, not the loop');
    await page.evaluate(() => window.endVoice());
    await until('k/still.png');
    checks.push('talk: the browser voice, and stills with reduced motion'); await context.close();
  }

  // Reading aloud for K–1 (docs/ROAD.md, "K–1 hear the road"): the first time
  // each puzzle screen opens in a visit, the keeper's line, Plume's (after the
  // number on Plume's card it points at) and the board's instruction; then
  // what answers the child as it appears: the hint card (with its own Listen),
  // a refusal or the board's feedback, one at a time, never the same line twice
  // in a row and cancelled by the next move, and the solved strip as one
  // sentence. Only the button whose line is read shows the stop square (44 px,
  // named Stop reading) and stops it; Read aloud's square shows. A revisit or a
  // re-render reads nothing; Grown-ups turns it off. With reduced motion.
  const voiceStub = () => {
    const voice = { said: [], canceled: [], speaking: null, started: null, speak(u) { this.said.push(u.text); this.speaking = u; setTimeout(() => { if (this.speaking === u) { u.onstart?.(); this.started = u; } }, 0); }, cancel() { const u = this.speaking; this.speaking = null; if (u) this.canceled.push(u.text); u?.onerror?.({ error: 'canceled' }); }, getVoices: () => [] };
    Object.defineProperty(window, 'speechSynthesis', { value: voice, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    window.said = () => voice.said.slice();
    window.canceled = () => voice.canceled.slice();
    window.voiceHeard = () => Boolean(voice.speaking) && voice.started === voice.speaking;
    window.endVoice = () => { const u = voice.speaking; voice.speaking = null; u?.onend?.(); };
  };
  const reader = async page => {
    const said = () => page.evaluate(() => window.said());
    const heard = () => page.waitForFunction(() => window.voiceHeard(), null, { timeout: 8000 });
    // The next line in turn: end the one heard and wait for the next to be heard.
    const next = async () => { await page.evaluate(() => window.endVoice()); await heard(); return (await said()).at(-1); };
    const quiet = async () => { await page.waitForTimeout(150); return said(); };
    // Which buttons show the stop square now, by whose line they read.
    const marked = () => page.evaluate(() => [...document.querySelectorAll('.lr-listen,.play-help [data-action=speak]')].filter(b => b.classList.contains('is-reading') || b.getAttribute('aria-label') === 'Stop reading').map(b => b.dataset.action === 'speak' ? 'speak' : b.dataset.text));
    return { said, heard, next, quiet, marked };
  };
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' }), page = await context.newPage(), ui = wire(page);
    await context.addInitScript(voiceStub);
    await page.route('**/art/manifest.json', route => route.fulfill({ json: { version: 1, assets: {} } }));
    const { said, heard, next, quiet, marked } = await reader(page), listen = page.locator('.lr-listen');
    await page.goto(base); await page.locator('#nickname').fill('Reader'); await page.locator('#profile-form button[type=submit]').click(); await page.locator('.lr-overview').waitFor();
    assert.deepEqual(await quiet(), [], 'the map is not read aloud');
    await ui.action('start-journey').click(); await page.locator('.board-panel').waitFor(); await heard();
    const e = MAIN[0], seats = all.find(q => q.id === campaignId(e.id, 'k1')), rival = rivalScore(e, seats);
    // What the screen should say: each Listen line in the scene (the keeper's,
    // then Plume's after the number it points at), then the goal; and whose
    // button shows the stop square meanwhile.
    const expected = await page.evaluate(() => [...document.querySelectorAll('.lr-scene .lr-listen')].flatMap(b => [...(b.dataset.lead ? [[b.dataset.lead, b.dataset.text]] : []), [b.dataset.text, b.dataset.text]]).concat([[(document.querySelector('.puzzle-goal')?.textContent || '').trim(), 'speak']]).filter(([text]) => text));
    assert.deepEqual(expected.slice(0, 3).map(([text]) => apos(text)), [apos(e.lines.open), `Plume ${rival} swaps.`, apos(plumeTaunt(e, 'k1').text)], 'the keeper, then Plume’s number and boast');
    assert.deepEqual((await said()).map(apos), [apos(e.lines.open)], 'the keeper’s line first');
    assert.deepEqual(await marked(), [e.lines.open], 'only the keeper’s Listen shows the stop square');
    const box = await listen.first().boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44, `Listen is ${box.width}×${box.height} px`);
    for (let k = 1; k < expected.length; k++) { assert.equal(await next(), expected[k][0], `then line ${k + 1} of the screen`); assert.deepEqual(await marked(), [expected[k][1]], `line ${k + 1}: one stop square, on its own button`); }
    if (!await page.locator('.puzzle-goal').count()) { expected.push([await next(), 'speak']); assert.ok(expected.at(-1)[0], 'then the goal How to play gives'); assert.deepEqual(await marked(), ['speak'], 'the goal: Read aloud shows the stop square'); }
    // Read aloud's stop square is drawn (it used to go blank).
    const square = await page.locator('.play-help [data-action=speak]').evaluate(b => { const after = getComputedStyle(b, '::after'); return { icon: getComputedStyle(b.querySelector('svg')).display, w: after.width, h: after.height, display: after.display }; });
    assert.deepEqual(square, { icon: 'none', w: '14px', h: '14px', display: 'block' }, 'Read aloud shows a 14 px stop square in place of its speaker');
    await page.evaluate(() => window.endVoice());
    await page.waitForFunction(() => !document.querySelector('.is-reading'));
    const n = expected.length;
    assert.equal((await said()).length, n);
    checks.push(`K–1 hears the screen’s ${n} lines in turn, once, with Plume’s number before “that many”; one stop square at a time; Listen ${box.width}×${box.height} px`);
    // The hint card is read when it opens, after the keeper's reaction, and has its own Listen.
    await page.locator('[data-action=cup]').first().click();
    assert.equal((await quiet()).length, n, 'a re-render reads nothing new');
    await ui.action('hint').click(); await heard();
    const hintText = await page.locator('.hint-card .lr-listen').getAttribute('data-text');
    assert.equal(hintText, (await page.locator('.hint-card p').allInnerTexts()).join(' '), 'the hint card’s Listen reads the card');
    assert.equal(apos((await said()).at(-1)), apos(CAST.snooze.nudge), 'the keeper’s reaction first');
    assert.equal(await next(), hintText, 'then the hint card');
    assert.deepEqual(await marked(), [hintText], 'the hint card’s Listen shows the stop square');
    const hintBox = await page.locator('.hint-card .lr-listen').boundingBox();
    assert.ok(hintBox.width >= 44 && hintBox.height >= 44, `the hint card’s Listen is ${hintBox.width}×${hintBox.height} px`);
    await page.locator('.hint-card .lr-listen').click();
    assert.equal(await page.evaluate(() => window.voiceHeard()), false, 'the hint card’s Listen stops its reading');
    assert.equal((await quiet()).length, n + 2, 'nothing after it is read');
    await page.locator('.hint-card .lr-listen').click(); await heard();
    assert.equal((await said()).at(-1), hintText, 'Listen reads the hint again');
    await page.evaluate(() => window.endVoice());
    checks.push('the hint card is read after the keeper’s reaction, with its own 44 px Listen');
    // A solve: the keeper's win line, Plume's verdict, then the strip as one sentence.
    const solution = solveSwaps(seats, (await ui.profile()).attempts[seats.id].board);
    for (const [x, y] of solution) await page.locator(`[data-action=swap-pair][data-pair="${x},${y}"]`).click();
    await page.locator('#completion-heading').waitFor(); await heard();
    const strip = await page.locator('.lr-done').getAttribute('data-say'), stars = await page.locator('#completion-heading .lr-stars i.on').count();
    assert.match(strip, new RegExp(`^${['One', 'Two', 'Three'][stars - 1]} stars?(, with no hints)?!( You (beat|tied) Plume\\.)?$`), `the strip’s sentence says its stars (${strip})`);
    assert.equal(/with no hints/.test(strip), await page.locator('.lr-star-reasons li.got', { hasText: 'No hints' }).count() === 1, 'and the No-hints star as the strip shows it');
    const won = [apos(e.lines.win), apos(await page.locator('.lr-rival-line .lr-listen').getAttribute('data-text')), strip];
    assert.equal(apos((await said()).at(-1)), won[0], 'the win line first');
    assert.equal(apos(await next()), won[1], 'then Plume’s verdict');
    assert.equal(await next(), won[2], 'then the strip’s sentence');
    assert.deepEqual(await marked(), [], 'the strip has no button of its own, so no stop square');
    await page.evaluate(() => window.endVoice());
    checks.push(`a solve reads the win line, Plume’s verdict and “${strip}”`);
    // The bell: a refusal is read, and not again while it stays; the board's
    // feedback is read, and a stale one is cancelled by the next ring.
    await ui.action('finish-encounter').click(); await page.locator('#bell-form').waitFor(); await heard();
    while (await page.evaluate(() => window.voiceHeard())) { await page.evaluate(() => window.endVoice()); await page.waitForTimeout(60); }
    const bell = all.find(q => q.id === campaignId('ferry-bell', 'k1')), wrong = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(k => !isSolved(bell, { prediction: k }));
    let count = (await said()).length;
    await page.locator('#bell-form button[type=submit]').click(); await heard();
    assert.equal((await said()).at(-1), 'Tap a number first.', 'a refusal is read');
    await page.evaluate(() => window.endVoice());
    await page.locator('#bell-form button[type=submit]').click();
    assert.equal((await quiet()).length, count + 1, 'the same refusal is not read twice in a row');
    const ring = async k => { await page.locator(`.bell-number:has(input[value="${k}"])`).click(); await page.locator('#bell-form button[type=submit]').click(); await page.locator('.motion-result').waitFor(); };
    await ring(wrong[0]); await heard();
    const first = await page.locator('.motion-result').innerText();
    assert.equal((await said()).at(-1), first, 'the board’s feedback is read after a ring');
    await ring(wrong[1]); await page.waitForFunction(text => document.querySelector('.motion-result')?.innerText !== text, first); await heard();
    assert.ok((await page.evaluate(() => window.canceled())).includes(first), 'the next ring cancels the stale feedback');
    assert.equal((await said()).at(-1), await page.locator('.motion-result').innerText(), 'and its own feedback is read');
    await page.evaluate(() => window.endVoice());
    count = (await said()).length;
    await page.locator('#bell-form button[type=submit]').click();
    assert.equal((await quiet()).length, count, 'ringing the same count again reads nothing');
    checks.push('the bell: a refusal read once, feedback read, a stale line cancelled by the next ring');
    count = (await said()).length;
    await ui.action('map').click(); await page.locator('.lr-overview').waitFor();
    await ui.action('continue-journey').click(); await page.locator('.board-panel').waitFor();
    assert.equal((await quiet()).length, count, 'a screen already read is not read again');
    // Stopping: a new visit reads the screen again; Listen stops it and nothing after it is read.
    await page.goto(base); await page.locator('.lr-overview').waitFor();
    await ui.action('continue-journey').click(); await page.locator('.board-panel').waitFor(); await heard();
    assert.equal((await said()).length, 1, 'a new page load starts a new visit');
    await listen.first().click();
    assert.equal(await page.evaluate(() => window.voiceHeard()), false, 'Listen stops the reading');
    assert.equal((await quiet()).length, 1, 'nothing after it is read');
    assert.notEqual(await listen.first().getAttribute('aria-label'), 'Stop reading');
    // A library board reads its instruction; Read aloud stops it.
    await ui.action('library').click(); await page.locator('.caravan-library').waitFor();
    await page.locator('.satchel-family').filter({ hasText: 'Cup swaps' }).first().locator('summary').click();
    await page.locator('.satchel-family[open] [data-action=open-puzzle][data-id="swap-k1-02"]').click(); await page.locator('.board-panel').waitFor(); await heard();
    assert.equal((await said()).length, 2, 'a library board reads its instruction');
    const readAloud = page.locator('.play-help [data-action=speak]:visible').first();
    assert.equal(await readAloud.getAttribute('aria-label'), 'Stop reading');
    await readAloud.click();
    assert.equal(await page.evaluate(() => window.voiceHeard()), false, 'Read aloud stops the reading');
    assert.notEqual(await readAloud.getAttribute('aria-label'), 'Stop reading');
    assert.equal((await quiet()).length, 2, 'stopping does not start anything else');
    checks.push('the reading stops from Listen or Read aloud');
    // Grown-ups turns it off.
    await page.locator('.explorer-toggle').click(); await page.getByRole('button', { name: 'Grown-ups', exact: true }).click(); await page.getByRole('button', { name: 'I’m a grown-up', exact: true }).click();
    await page.locator('#sound-toggle').uncheck();
    assert.equal((await ui.profile()).readAloud, false);
    await page.evaluate(() => { location.hash = 'play/swap-k1-03'; }); await page.locator('.board-panel').waitFor();
    assert.equal((await quiet()).length, 2, 'with the setting off nothing is read');
    checks.push('Grown-ups turns reading aloud off'); await context.close();
  }

  // K–1 reading at the Old Workshop, the marsh boardwalks and the finale: a
  // keeper's reaction, then the refusal, in turn; a legal move while the
  // reaction is read stops it and skips the refusal waiting behind it; a refused
  // platform's note once; the finale reads each goodbye in order
  // (each on its own Listen's stop square), then the medal and the stars.
  {
    const workshop = await roadSave('reader-workshop', 'workshop-parts'), marsh = await roadSave('reader-marsh', 'marsh-boardwalks'), done = await roadSave('reader-finale');
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' }), page = await context.newPage(), ui = wire(page);
    await context.addInitScript(voiceStub);
    await context.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, { key: SAVE_KEY, value: JSON.stringify({ ...emptyStore(), activeProfileId: workshop.id, profiles: [workshop, marsh, done] }) });
    await page.route('**/art/manifest.json', route => route.fulfill({ json: { version: 1, assets: {} } }));
    const { said, heard, next, quiet, marked } = await reader(page);
    await page.goto(base); await page.locator('.lr-overview').waitFor();
    await ui.action('continue-journey').click(); await page.locator('.board-panel').waitFor(); await heard();
    while (await page.evaluate(() => window.voiceHeard())) { await page.evaluate(() => window.endVoice()); await page.waitForTimeout(60); }
    const p = all.find(q => q.id === campaignId('workshop-parts', 'k1')), edges = p.edges.map(edge => edge.join(','));
    const [x, y] = [[1, 2], [1, 3], [2, 3]].find(([a, b]) => !edges.includes(`${a},${b}`));
    const tap = async (a, b) => { await page.locator(`.cup-button[data-cell="${a}"]`).click(); await page.locator(`.cup-button[data-cell="${b}"]`).click(); };
    const legal = p.edges.find(([a, b]) => { const board = [...p.start]; [board[a], board[b]] = [board[b], board[a]]; return !isSolved(p, board); });
    const swap = () => page.locator(`[data-action=swap-pair][data-pair="${legal.join(',')}"]`).click();
    await tap(x, y); await heard();
    const oops = await page.locator('.lr-keeper .lr-listen').getAttribute('data-text'), refusal = await page.locator('.feedback').innerText();
    assert.ok(CAST.sprocket.oops.includes(oops) && refusal, 'a keeper reaction and a refusal');
    assert.equal((await said()).at(-1), oops, 'the reaction first');
    assert.deepEqual(await marked(), [oops], 'on the keeper’s Listen');
    assert.equal(await next(), refusal, 'then the refusal');
    assert.deepEqual(await marked(), [], 'which has no button of its own');
    await page.evaluate(() => window.endVoice());
    // A second mistake: another reaction, then the refusal again (choosing a cup cleared it).
    await tap(x, y); await heard();
    const again = await page.locator('.lr-keeper .lr-listen').getAttribute('data-text');
    assert.notEqual(again, oops, 'a second mistake gets another reaction');
    assert.equal((await said()).at(-1), again);
    assert.equal(await next(), refusal);
    await page.evaluate(() => window.endVoice());
    let count = (await said()).length;
    // A legal swap clears both and reads nothing; after a mistake, a legal swap
    // while its reaction is read stops it and skips the refusal behind it.
    await swap(); assert.equal((await quiet()).length, count, 'a legal swap with nothing new reads nothing');
    await tap(x, y); await heard();
    const third = (await said()).at(-1);
    assert.equal(third, await page.locator('.lr-keeper .lr-listen').getAttribute('data-text'));
    count = (await said()).length;
    await swap();
    await page.waitForFunction(() => !window.voiceHeard());
    assert.ok((await page.evaluate(() => window.canceled())).includes(third), 'the next move stops the stale reaction');
    assert.equal((await quiet()).length, count, 'and the refusal waiting behind it is not read');
    checks.push('a keeper reaction, then the refusal; the next move stops a stale reaction and skips what waits');
    // The marsh boardwalks: a refused platform's note (beside the tap, outside
    // the redrawn page) is read once, not again for the same tap, and the next
    // walk stops it.
    const switchTo = async id => { await page.locator('.explorer-toggle').click(); await page.getByRole('button', { name: 'Grown-ups', exact: true }).click(); await page.getByRole('button', { name: 'I’m a grown-up', exact: true }).click(); await page.locator(`[data-action=choose-profile][data-id="${id}"]`).click(); await page.locator('.lr-overview').waitFor(); };
    const tapAt = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
    await switchTo(marsh.id);
    await ui.action('continue-journey').click(); await page.locator('.stage-junction').first().waitFor(); await heard();
    while (await page.evaluate(() => window.voiceHeard())) { await page.evaluate(() => window.endVoice()); await page.waitForTimeout(60); }
    await tapAt(page.locator('.stage-junction.can-go').first()); await page.locator('.stage-junction[data-action="refuse"]').first().waitFor();
    while (await page.evaluate(() => window.voiceHeard())) { await page.evaluate(() => window.endVoice()); await page.waitForTimeout(60); }
    const far = page.locator('.stage-junction[data-action="refuse"]').first(), note = await far.getAttribute('data-text');
    await tapAt(far); await heard();
    assert.match(note, /^No boardwalk goes from \w to \w\.$/);
    assert.equal(await page.locator('.tap-note').innerText(), note, 'the note is on screen');
    assert.equal((await said()).at(-1), note, 'a refused platform’s note is read');
    assert.deepEqual(await marked(), [], 'with no stop square');
    count = (await said()).length;
    await tapAt(far); assert.equal((await quiet()).length, count, 'the same tap again is not read twice');
    assert.ok(await page.evaluate(() => window.voiceHeard()), 'and does not stop the note being read');
    await tapAt(page.locator('.stage-junction.can-go:not(.is-here)').first());
    await page.waitForFunction(text => window.canceled().includes(text), note);
    checks.push('a refused boardwalk’s note is read once, not for the same tap again, and the next walk stops it');
    await page.evaluate(() => window.endVoice());
    // The finale: each goodbye in order, then the medal and the stars.
    await switchTo(done.id);
    await page.locator('.lr-map-layer:visible .lr-stop[data-id="fair"]').click();
    const before = (await said()).length;
    await page.getByRole('button', { name: 'Finale', exact: true }).click(); await page.locator('.lr-finale').waitFor(); await heard();
    const byes = [...KEEPERS.map(id => CAST[id].bye), CAST.plume.concede], award = await page.locator('.lr-medal-award').getAttribute('data-say');
    const tally = starTally(done, puzzles);
    assert.equal(award, `Grades K to 1 medal! ${tally.earned} of ${tally.max} stars.`);
    for (const [k, bye] of byes.entries()) { if (k) assert.equal(await next(), bye, `goodbye ${k + 1}`); else assert.equal((await said()).at(-1), bye, 'the first goodbye'); assert.deepEqual(await marked(), [bye], `goodbye ${k + 1}: its own stop square`); }
    assert.equal(await next(), award, 'then the medal and the stars');
    assert.deepEqual(await marked(), [], 'no button of its own');
    await page.evaluate(() => window.endVoice());
    assert.equal((await quiet()).length, before + byes.length + 1, 'and nothing more');
    checks.push(`the finale reads ${byes.length} goodbyes in order, then “${award}”`); await context.close();
  }

  assert.deepEqual(errors, []);
  await writeFile(new URL('results.json', output), JSON.stringify({ passed: true, bands, checks, results, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, bands, checks }, null, 2));
} catch (error) {
  await writeFile(new URL('results.json', output), JSON.stringify({ passed: false, error: String(error?.stack || error), checks, results, errors }, null, 2));
  throw error;
} finally { await browser.close(); }
