// Plays Lamplighter (a group in Lantern Wires) through the real interface:
// the group in the satchel; a street puzzle by taps, with a far lantern
// refused, a wasted move answered with Undo and the lamplighter gliding; the
// same puzzle solved with the keyboard alone (arrow keys walk, Enter and
// Space light, focus following the lamplighter); a spent budget with every
// lantern greyed and the hint saying Undo; the ring with the left arrow key
// walking anticlockwise round past the top; the grid with all four arrows; a
// hinted lantern ringed and the puzzle finished by hints. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone viewport).
// Screenshots go in test-results/lamplighter/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/lamplighter/', import.meta.url);
const shot = async name => { await page.waitForTimeout(400); await page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true}); };
const word = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board.word ?? '', [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="lamplighter"]').waitFor(); };
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const lamp = name => page.locator(`.ll-lamp[aria-label="${name}"]`);
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); const [x, y] = [b.x + b.width / 2, b.y + b.height / 2]; if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const button = name => page.getByRole('button', {name, exact: true});
const focusedLabel = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
const solved = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const status = () => page.locator('.ll-board [role=status]').innerText();
async function hintSolve() {
  for (let i = 0; i < 3; i++) await button('Hint').click();
  for (let s = 0; !await page.locator('#completion-heading').count() && s < 30; s++) await button('Apply hint').click();
  await solved();
}
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Lamp QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const family = page.locator('.satchel-family[data-view-key="family-toggle"]');
  await family.locator('summary').click();
  assert.equal(await family.locator('h2', {hasText: 'Lamplighter'}).count(), 1, 'a group in Lantern Wires');
  assert.equal(await family.locator('[data-id^="lamplighter-"]').count(), 12);

  // A street by taps: a far lantern is refused, a wasted move says Undo, the
  // lamplighter glides.
  const P2 = 'lamplighter-02';
  await open(P2); await fit('both sides'); await shot('02-start');
  assert.equal(await page.locator('.ll-slot').count(), 5);
  assert.equal(await page.locator('.ll-lamp:not([aria-disabled])').count(), 3, 'the lantern underfoot and its two neighbours');
  await tap(lamp('Lantern 3'));
  assert.equal(await word(P2), '', 'a far lantern is refused');
  assert.equal(await page.locator('.feedback').innerText(), '', 'quietly');
  await tap(lamp('Walk to lantern 1'));
  assert.equal(await word(P2), 'R');
  if (!await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)) assert.ok(await page.evaluate(() => document.getAnimations().length > 0), 'the lamplighter glides');
  await page.locator('.feedback', {hasText: 'Too few moves are left. Undo.'}).waitFor();
  await shot('02-wasted');
  await button('↶ Undo').click();
  assert.equal(await word(P2), '');
  await tap(lamp('Walk to lantern −1')); await tap(lamp('Light lantern −1'));
  assert.equal(await page.locator('.ll-move').count(), 2, 'two moves recorded');
  assert.equal(await page.locator('.ll-slot').count(), 3);
  await tap(lamp('Walk to lantern 0')); await tap(lamp('Walk to lantern 1')); await tap(lamp('Light lantern 1'));
  await solved(); await fit('both sides solved'); await shot('02-solved');

  // The same street with the keyboard alone: focus follows the lamplighter.
  const P3 = 'lamplighter-03';
  await open(P3);
  await lamp('Light lantern 0').focus();
  await page.keyboard.press('Enter');
  assert.equal(await word(P3), 'F');
  assert.equal(await focusedLabel(), 'Put out lantern 0', 'focus stays on the lantern underfoot');
  await page.keyboard.press('ArrowRight');
  assert.equal(await focusedLabel(), 'Light lantern 1', 'focus follows the lamplighter');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press(' ');
  assert.equal(await word(P3), 'FRRF');
  assert.match(await status(), /^Lanterns 0 and 2 lit; the lamplighter at 2\. 2 of 6 moves left\.$/);
  await page.keyboard.press('ArrowUp');
  assert.equal(await word(P3), 'FRRF', 'up does nothing on a street');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  await solved();
  assert.equal(await word(P3), 'FRRFLL');

  // A spent budget: every lantern greys, the hint says Undo, Undo rescues.
  const P1 = 'lamplighter-01';
  await open(P1);
  await tap(lamp('Walk to lantern −1')); await tap(lamp('Walk to lantern 0'));
  assert.equal(await word(P1), 'LR');
  assert.equal(await page.locator('.ll-lamp:not([aria-disabled])').count(), 0, 'no move past the budget');
  await tap(lamp('Lantern 1'));
  assert.equal(await word(P1), 'LR');
  await button('Hint').click(); await button('Hint').click();
  await page.locator('.hint-card', {hasText: 'Too few moves are left. Undo.'}).waitFor();
  await shot('01-spent');
  await page.locator('.hint-card').getByRole('button', {name: 'Undo'}).click();
  assert.equal(await word(P1), '', 'Undo goes back to a board that can still finish');

  // The ring: left is anticlockwise, round past the top.
  const P10 = 'lamplighter-10';
  await open(P10); await fit('ring');
  await lamp('Light lantern 0').focus();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await word(P10), 'L');
  assert.equal(await focusedLabel(), 'Light lantern 7', 'anticlockwise from the top is lantern 7');
  await page.keyboard.press('ArrowRight');
  assert.equal(await word(P10), 'LR');
  await page.locator('.feedback', {hasText: 'Undo'}).waitFor();
  await button('↶ Undo').click(); await button('↶ Undo').click();
  await shot('10-ring');
  await hintSolve(); await fit('ring solved'); await shot('10-solved');
  assert.equal((await word(P10)).length, 11);

  // The grid: four arrows, no diagonal taps.
  const P12 = 'lamplighter-12';
  await open(P12); await fit('grid');
  assert.equal(await page.locator('.ll-lamp:not([aria-disabled])').count(), 4, 'up, down, right and the lantern underfoot');
  await lamp('Light lantern in row 2, column 1').focus();
  for (const k of ['ArrowDown', 'ArrowRight', 'Enter', 'ArrowUp', 'ArrowUp', 'Enter']) await page.keyboard.press(k);
  assert.equal(await word(P12), 'DRFUUF');
  assert.equal(await focusedLabel(), 'Put out lantern in row 1, column 2');
  await page.keyboard.press('ArrowUp');
  assert.equal(await word(P12), 'DRFUUF', 'no walking off the top');
  await shot('12-grid');
  await hintSolve(); await fit('grid solved'); await shot('12-solved');

  // A hint rings its lantern; Apply hint makes the move.
  const P8 = 'lamplighter-08';
  await open(P8);
  await button('Hint').click();
  assert.equal(await page.locator('.hint-card').innerText().then(t => t.includes('Which lanterns already look right?')), true, 'the first hint is the authored nudge');
  await button('Hint').click();
  assert.equal(await page.locator('.ll-halo.hint').count(), 1, 'the hinted lantern is ringed');
  await page.locator('.hint-card', {hasText: 'Walk right.'}).waitFor();
  await shot('08-hint');
  await button('Hint').click(); await button('Apply hint').click();
  assert.equal(await word(P8), 'R');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
