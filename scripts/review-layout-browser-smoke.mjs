// Sample the entry and an advanced instance in every library family after
// shared stylesheet changes. Family suites check the individual interactions.
import assert from 'node:assert/strict';
import {loadPack} from './packs.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = process.env.TEST_URL || 'http://127.0.0.1:4187';
const families = new Map();
for (const p of (await loadPack()).puzzles) {
  if (p.band === 'playground' || p.band === 'proofs') continue;
  const family = p.libraryFamily || p.mechanic;
  if (!families.has(family)) families.set(family, []);
  families.get(family).push(p);
}
try {
  await page.goto(base);
  await page.locator('#nickname').fill('Layout review');
  await page.locator('#profile-form button[type=submit]').click();
  let samples = 0;
  for (const [family, puzzles] of families) {
    const advanced = puzzles.filter(p => p.difficulty_level === 'hard').at(-1) || puzzles.at(-1);
    for (const p of new Set([puzzles[0], advanced])) {
      await page.goto(`${base}/#play/${p.id}`);
      await page.locator(`[data-puzzle-id="${p.id}"] .board-panel`).waitFor();
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({width, height: width === 1280 ? 720 : 844});
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${family}: ${p.id} fits ${width}px`);
      }
      samples++;
    }
  }
  assert.deepEqual(errors, []);
  console.log(`Passed ${samples} sample boards across ${families.size} library families at 320, 390 and 1280px, with no page errors.`);
} finally { await browser.close(); }
