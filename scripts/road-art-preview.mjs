// Captures the road with whatever art is in dist/art: the map at several
// points along the road and every stop's scene before and after its puzzles,
// on phone, tablet and desktop. For reviewing art and layout by eye; it checks
// nothing. Output: test-results/road-preview/. Environment: PLAYWRIGHT_MODULE,
// TEST_URL, PREVIEW (comma list of: map, scenes, finale; default all).
import { readFile, mkdir } from 'node:fs/promises';
import { STOPS, MAIN, startJourney, beginEncounter, recordSolve } from '../dist/road.js';
import { freshAttempt, nextHint, move, isSolved } from '../dist/engine.js';
import { mechanicFor } from '../dist/expansion.js';
import { emptyStore, SAVE_KEY } from '../dist/storage.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4187';
const want = new Set((process.env.PREVIEW || 'map,scenes,finale').split(','));
const pack = JSON.parse(await readFile(new URL('../dist/puzzles.json', import.meta.url), 'utf8'));
const proofs = JSON.parse(await readFile(new URL('../dist/proofs.json', import.meta.url), 'utf8'));
const puzzles = [...pack.puzzles, ...proofs.puzzles];
const out = new URL('../test-results/road-preview/', import.meta.url);
await mkdir(out, { recursive: true });
const sizes = { phone: { width: 390, height: 844 }, tablet: { width: 1024, height: 768 }, desktop: { width: 1440, height: 1000 } };

const step = (p, a) => mechanicFor(p)?.solve ? mechanicFor(p).solve(p, a.board) : (h => h.action || h.pair)(nextHint(p, a));
function solve(p, a = freshAttempt(p)) {
  for (let i = 0; !isSolved(p, a.board) && i < 400; i++) a = move(p, a, step(p, a));
  return { ...a, completed: true };
}
// A profile that has finished the first n main encounters of the K–1 trail.
function profileAt(n) {
  const profile = { id: `preview-${n}`, name: 'Preview', band: 'k1', avatar: 0, sound: false, attempts: {} };
  startJourney(profile);
  for (let i = 0; i < n; i++) {
    const opened = beginEncounter(profile, puzzles);
    profile.attempts[opened.puzzle.id] = solve(opened.puzzle);
    if (!recordSolve(profile, opened.puzzle.id, opened.encounter.id, puzzles)) throw new Error(`could not record ${opened.encounter.id}`);
  }
  return profile;
}
const browser = await chromium.launch({ headless: true });
async function shoot(profile, size, name, go) {
  const context = await browser.newContext({ viewport: sizes[size], serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: SAVE_KEY, value: JSON.stringify({ ...emptyStore(), activeProfileId: profile.id, profiles: [profile] }) });
  const page = await context.newPage();
  page.on('pageerror', e => console.error(name, e.message));
  await page.goto(base); await page.locator('.lr-overview').waitFor();
  if (go) await go(page);
  await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  await page.waitForTimeout(150);
  await page.screenshot({ path: new URL(`${name}-${size}.png`, out).pathname, fullPage: !!go });
  await context.close();
}
const cont = page => page.locator('.lr-map-layer:visible .lr-stop.is-current').click().then(() => page.locator('.lr-scene').waitFor());
try {
  const firstOf = STOPS.map(s => MAIN.findIndex(e => e.stop === s.id));
  if (want.has('map')) for (const n of [0, 4, 11, 21]) for (const size of Object.keys(sizes)) await shoot(profileAt(n), size, `map-${String(n).padStart(2, '0')}`);
  if (want.has('scenes')) for (const [i, stop] of STOPS.entries()) {
    for (const size of ['phone', 'desktop']) await shoot(profileAt(firstOf[i]), size, `scene-${i + 1}-${stop.id}-open`, cont);
  }
  if (want.has('finale')) for (const size of Object.keys(sizes)) await shoot(profileAt(21), size, 'finale', page => page.locator('[data-action="finale"]:visible').first().click().then(() => page.locator('.lr-finale').waitFor()));
} finally { await browser.close(); }
console.log('wrote', out.pathname);
