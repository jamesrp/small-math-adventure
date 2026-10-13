// Exercises both count controls, native validation, playback edits and submission.
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, '');
const key = 'small-math-adventure:saves:v1';
const saved = id => page.evaluate(([key, id]) => JSON.parse(localStorage.getItem(key)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.clock-board').waitFor(); };
const ring = () => page.getByRole('button', {name: 'Ring', exact: true}).click();
try {
  await page.goto(base);
  await page.locator('#nickname').fill('Clock QA');
  await page.locator('#profile-form button[type=submit]').click();
  await open('clock-01');
  assert.equal(await page.locator('.bell-number').count(), 10, 'introductory counts retain tap choices');
  await page.locator('[name="activations"][value="3"]').check();
  await ring();
  await page.locator('#completion-heading').waitFor();

  await open('clock-12');
  const count = page.getByRole('spinbutton', {name: 'Bells', exact: true});
  assert.equal(await page.locator('.bell-number').count(), 0, 'a sixty-button bank becomes one input');
  assert.equal(await count.getAttribute('max'), '60');
  assert.equal(await count.inputValue(), '');
  await count.fill('0'); await ring();
  assert.equal(await count.evaluate(el => el.validity.rangeUnderflow), true);
  assert.equal((await saved('clock-12')).prediction, null, 'zero is not submitted');
  await count.fill('61'); await ring();
  assert.equal(await count.evaluate(el => el.validity.rangeOverflow), true);
  assert.equal((await saved('clock-12')).prediction, null, 'the original answer range remains enforced');
  await count.fill('18'); await ring();
  assert.equal((await saved('clock-12')).prediction, 18);
  assert.equal(await page.locator('#completion-heading').count(), 0, 'a later or earlier count does not complete');
  // Typing during playback cancels its timer and preserves every entered digit.
  await count.fill('1');
  await page.waitForTimeout(450);
  assert.equal(await count.inputValue(), '1');
  await count.press('9');
  assert.equal(await count.inputValue(), '19');
  await ring();
  await page.locator('#completion-heading').waitFor();
  assert.equal((await saved('clock-12')).prediction, 19, 'the first simultaneous landing completes');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'the compact count control fits');
  assert.deepEqual(errors, []);
  console.log(`Clock controls browser smoke passed${phone ? ' (phone)' : ''}.`);
} finally {
  await browser.close();
}
