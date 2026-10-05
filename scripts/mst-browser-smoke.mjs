// Plays Cheapest networks through the real interface on the shared graph
// board: buying and returning links by tap and by keyboard, a loop, a wrong
// claim and its swap, collecting every cheapest network with That's all and
// Undo, the swap budget, a split, a loop certificate and price design. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone viewport).
// Screenshots go in test-results/mst/.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const {puzzles} = JSON.parse(await readFile(new URL('../dist/families/mst/mst.json', import.meta.url), 'utf8'));
const L = (id, name) => puzzles.find(p => p.id === id).parameters.links.findIndex(([u, v]) => u + v === name);
const out = new URL('../test-results/mst/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.mst-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const center = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
// Taps land at the control's centre through real hit-testing (a straight
// vertical or horizontal link has a zero-width box, which Playwright treats as hidden).
const tap = async locator => { const [x, y] = await center(locator); if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const link = i => page.locator(`.gb-hit[data-gb-edge="${i}"]`);
const buy = async (id, ...names) => { for (const n of names) await tap(link(L(id, n))); };
const button = name => page.locator('.mst-button', {hasText: name});
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Network QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // First network: a loop, a wrong claim and its swap, then the cheapest.
  const A = 'mst-01';
  await open(A); await fit('first network');
  assert.equal(await button('Cheapest').isDisabled(), true, 'no claim before every place is joined');
  await buy(A, 'AB', 'BC', 'AC');
  assert.equal(await page.locator('.gb-stroke.loop').count(), 3, 'the loop shows');
  await tap(link(L(A, 'AC')));
  await link(L(A, 'CD')).focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(A)).bought.sort(), [L(A, 'AB'), L(A, 'BC'), L(A, 'CD')].sort(), 'taps and keys buy and return');
  assert.equal(await page.locator('.gb-node.lit').count(), 4, 'every place lights up');
  await button('Cheapest').click();
  await page.locator('.mst-told').waitFor();
  assert.equal(await page.locator('.gb-stroke.told-add').count(), 1); assert.equal(await page.locator('.gb-stroke.told-drop').count(), 1);
  await shot('first-told');
  await buy(A, 'AC', 'AB', 'CD', 'AD');
  assert.equal(await page.locator('.mst-pile b').innerText(), '6');
  await button('Cheapest').click();
  await done();

  // Every cheapest network: keep, That's all too early, Undo keeps the row.
  const E = 'mst-03';
  await open(E);
  await buy(E, 'AC', 'AB', 'AD'); await button('Cheapest').click();
  assert.equal(await page.locator('.mst-found li').count(), 1);
  await button('That’s all').click();
  assert.match(await page.locator('.mst-told').innerText(), /another/);
  await page.locator('[data-action="undo"]').click();
  await page.locator('[data-action="undo"]').click();
  assert.equal(await page.locator('.mst-found li').count(), 1, 'Undo keeps what was found');
  await buy(E, 'AD');
  assert.equal(await page.locator('.mst-found li').count(), 1);
  await buy(E, 'CD'); await button('Cheapest').click();
  await buy(E, 'AB', 'BC'); await button('Cheapest').click();
  await buy(E, 'CD', 'AD'); await button('Cheapest').click();
  assert.equal(await page.locator('.mst-found li').count(), 4);
  await shot('every-found');
  await button('That’s all').click();
  await done();

  // Swaps: the third new link is refused; the plan solves it.
  const S = 'mst-05';
  await open(S); await fit('swaps');
  assert.equal(await page.locator('.mst-swap:not(.used)').count(), 2);
  await buy(S, 'AC', 'AD');
  assert.equal(await page.locator('.mst-swap:not(.used)').count(), 0);
  assert.equal(await link(L(S, 'AE')).count(), 0, 'no more new links');
  await buy(S, 'AC', 'AD', 'AE', 'AB', 'DE', 'BC');
  await shot('swaps');
  await button('Cheapest').click();
  await done();

  // A split: tap places.
  const F = 'mst-07';
  await open(F);
  await tap(page.locator('.gb-node[data-node="E"]'));
  assert.equal(await page.locator('.gb-edge.across').count(), 3);
  await page.locator('.gb-node[data-node="F"]').focus(); await page.keyboard.press(' ');
  await done();

  // A loop certificate.
  const X = 'mst-08';
  await open(X);
  await buy(X, 'AC', 'AD', 'CD');
  await done();

  // Price design: change prices, a wrong Check lists networks, then four.
  const D = 'mst-12';
  await open(D); await fit('design');
  await button('Check').click();
  assert.equal(await page.locator('.mst-list li').count(), 16);
  await tap(link(L(D, 'AB'))); await tap(link(L(D, 'CD')));
  assert.equal(await page.locator('.mst-list').count(), 0, 'a price change clears the list');
  await shot('design');
  await button('Check').click();
  await done();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
