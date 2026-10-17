// Plays Flat folds through the real interface: rays labelled by taps inside
// the disk (including the contested points between two rays) and by keys on
// the letter chips, Fold with the side view of a jam and of a flat fold
// (eight rays too), Can't after a fold with the wedges coloured and Check
// (refused with There is a way, kept through Undo; refused colourings; the
// clash and the fans), tabs placed from a stock with Can't and each disk
// marked with the tabs it takes, the busiest tab board on a 375 x 667 phone,
// the new ray dragged, stepped by a tap on the knob, moved by keys and by
// the rim band, and left alone by a tap inside that letters a ray, the
// playground (add, letter, press and hold to remove, keys, Clear), focus
// after moves, and no page overflow. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone with touch). Screenshots go in
// test-results/creases/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/creases/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const attempt = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id], [key, id]);
const board = async id => (await attempt(id))?.board;
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="creases"]').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const settle = () => page.waitForTimeout(80);
const button = name => page.getByRole('button', {name, exact: true});
const told = () => page.locator('.cr-told').innerText();
const active = () => page.evaluate(() => { const e = document.activeElement; return {focus: e?.dataset?.focus || '', tag: e?.tagName || '', cls: e?.getAttribute?.('class') || '', text: e?.textContent?.trim().slice(0, 20) || ''}; });
// Focus after a move rests on the board or the move controls, never on
// Can't or the page.
async function focusOnBoard(label) {
  const f = await active();
  assert.ok(!/cr-cant/.test(f.cls), `${label}: focus is not on Can’t (${JSON.stringify(f)})`);
  assert.ok(!['BODY', 'HTML'].includes(f.tag), `${label}: focus is not lost (${JSON.stringify(f)})`);
  assert.ok(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-mechanic-wire="creases"]'))), `${label}: focus is in the board (${JSON.stringify(f)})`);
}
async function tapXY([x, y]) { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await settle(); }
async function tap(locator) { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); await tapXY([b.x + b.width / 2, b.y + b.height / 2]); }
// A point of a disk, by direction (degrees clockwise from the top) and
// radius in the disk's own units (the rim is at 100).
async function diskPoint(svg, deg, r) {
  await svg.scrollIntoViewIfNeeded();
  const b = await svg.boundingBox(), s = b.width / 284, cx = b.x + b.width / 2, cy = b.y + b.height / 2, t = deg * Math.PI / 180;
  return [cx + r * s * Math.sin(t), cy - r * s * Math.cos(t)];
}
const tapDisk = async (svg, deg, r) => tapXY(await diskPoint(svg, deg, r));
const disk = (n = 0) => page.locator('svg.cr-disk').nth(n);
const chip = (k, prefix = 'cr') => page.locator(`[data-focus="${prefix}-c${k}"]`);
const wedge = k => page.locator(`[data-focus="cr-w${k}"]`);
// A tap in the middle of wedge k of a disk with these angles.
const tapWedge = (angles, k) => tapDisk(disk(), angles.slice(0, k).reduce((a, b) => a + b, 0) + angles[k] / 2, 65);
let cdp = null;
async function drag(from, to) {
  if (!phone) {
    await page.mouse.move(...from); await page.mouse.down();
    await page.mouse.move(to[0], to[1], {steps: 12}); await page.mouse.up();
  } else {
    cdp ||= await context.newCDPSession(page);
    const touch = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
    await touch('touchStart', from);
    for (let s = 1; s <= 12; s++) await touch('touchMove', [from[0] + (to[0] - from[0]) * s / 12, from[1] + (to[1] - from[1]) * s / 12]);
    await touch('touchEnd', to);
    await page.waitForTimeout(400);
  }
  await settle();
}
// Press and hold a point for 0.7 s.
async function hold([x, y]) {
  if (!phone) { await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); }
  else {
    cdp ||= await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
    await page.waitForTimeout(700);
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  }
  await page.waitForTimeout(250);
}
const centre = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const undo = () => page.locator('[data-action="undo"]').click().then(settle);

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Creases QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 2: taps inside the disk, a key on a chip, a jam, a refused Can't
  // kept through Undo, then a flat fold.
  let P = 'creases-02';
  await open(P); await fit('fold');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Fold the disk flat.', 'one short objective');
  assert.equal(await button('Fold').isDisabled(), true, 'Fold waits for every letter');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for a fold');
  await tapDisk(disk(), 175, 60);
  assert.deepEqual((await board(P)).labels, ['M', 'M', 'M', null], 'a tap near ray 3 labels it');
  await tapDisk(disk(), 175, 60);
  assert.equal((await board(P)).labels[2], 'V', 'again: a valley');
  await tapDisk(disk(), 175, 60);
  await tapDisk(disk(), 2, 60);
  assert.equal((await board(P)).labels[0], 'M', 'a tap near a printed ray changes nothing');
  await chip(3).focus(); await page.keyboard.press('Enter'); await settle();
  assert.equal((await board(P)).labels[3], 'M', 'Enter on a chip');
  assert.equal((await active()).focus, 'cr-c3', 'focus stays on the chip');
  await tap(button('Fold'));
  assert.equal((await board(P)).tried, 'MMMM');
  await page.locator('svg.cr-stack.jam').waitFor();
  await page.waitForTimeout(1200);
  await focusOnBoard('after Fold');
  await shot('02-jam');
  await tap(button('Can’t'));
  assert.equal((await active()).focus, 'cr-w0', 'Can’t sends focus to the first wedge');
  for (let k = 0; k < 4; k++) await tapWedge([60, 120, 120, 60], k);
  assert.equal((await board(P)).paint, 'FFFF');
  await tap(button('Check'));
  assert.equal(await told(), 'There is a way.');
  await focusOnBoard('after a refused Check');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t stays off');
  await undo();
  assert.equal((await board(P)).told, 'way', 'Undo keeps the refusal');
  assert.equal((await board(P)).paint, 'FFFF', 'and takes back the Check: the colours are back');
  assert.equal(await told(), 'There is a way.');
  assert.equal(await button('Check').isDisabled(), true, 'Check stays off');
  await tap(button('Can’t'));
  assert.equal((await board(P)).paint, null, 'Can’t puts the colours away');
  await tap(chip(3));
  assert.equal((await board(P)).told, null, 'a new letter clears the refusal');
  await tap(button('Fold'));
  await done();
  await page.locator('svg.cr-stack.flat').waitFor();
  await page.waitForTimeout(1200);
  await shot('02-flat');

  // Puzzle 9: eight rays (0, 30, 60, 90, 150, 210, 240, 300; rays 1, 2 and
  // 5 printed); the contested points between two rays 30 degrees apart;
  // then a flat fold.
  P = 'creases-09';
  await open(P);
  await tapDisk(disk(), 46, 55);
  assert.equal((await board(P)).labels[2], 'M', '16° from ray 2 and 14° from ray 3: ray 3');
  await tapDisk(disk(), 44, 55);
  assert.deepEqual((await board(P)).labels, ['V', 'V', 'M', null, 'M', null, null, null], '14° from ray 2 (printed) and 16° from ray 3: nothing');
  await tapDisk(disk(), 287, 30);
  assert.equal((await board(P)).labels[7], 'M', 'near the centre, still the nearest ray');
  await tapDisk(disk(), 120, 70);
  assert.deepEqual((await board(P)).labels, ['V', 'V', 'M', null, 'M', null, null, 'M'], 'mid-wedge, 30° from both rays: nothing');
  await tap(chip(3)); await tap(chip(5)); await tap(chip(6)); await tap(chip(6));
  assert.deepEqual((await board(P)).labels, [...'VVMMMMVM'], 'chips');
  await fit('eight rays');
  await tap(button('Fold'));
  await done();
  await page.locator('svg.cr-stack.flat').waitFor();
  await page.waitForTimeout(1200);
  await shot('09-eight');

  // Puzzle 4: seven rays, two printed; a wrong colouring is refused in
  // words that don't state the rule, and cleared; one clash.
  P = 'creases-04';
  await open(P);
  for (const k of [1, 2, 4, 5, 6]) await tap(chip(k));
  await tap(button('Fold'));
  await page.locator('svg.cr-stack.clash').waitFor();
  await tap(button('Can’t'));
  const seven = [30, 30, 60, 60, 60, 60, 60];
  const colour = async word => { for (const [k, c] of [...word].entries()) { const now = (await board(P)).paint[k]; if (now === c) continue; await tapWedge(seven, k); if ((await board(P)).paint[k] !== c) await tapWedge(seven, k); } };
  await colour('FFFFFFF');
  await tap(button('Check'));
  assert.equal(await told(), 'Not that colouring.');
  assert.equal((await board(P)).paint, '.......', 'the colours are cleared');
  await colour('FBFBFBF');
  await tap(button('Check'));
  await done();
  await page.locator('.cr-clash').waitFor();
  assert.match(await page.locator('[data-mechanic-wire="creases"] [role="status"]').innerText(), /The wedges on both sides of ray 1 face the same way\./);
  await shot('04-clash');

  // Puzzle 8: the fans of an even disk.
  P = 'creases-08';
  await open(P);
  for (let k = 0; k < 4; k++) await tap(chip(k));
  await tap(button('Fold'));
  await page.locator('svg.cr-stack.gap').waitFor();
  await tap(button('Can’t'));
  for (let k = 0; k < 4; k++) { await tapWedge([45, 90, 90, 135], k); if (k % 2) await tapWedge([45, 90, 90, 135], k); }
  assert.equal((await board(P)).paint, 'FBFB');
  await tap(button('Check'));
  await done();
  await page.locator('svg.cr-fans').waitFor();
  assert.match(await page.locator('svg.cr-fans').getAttribute('aria-label'), /135° and the green wedges 225°/);
  await shot('08-fans');

  // Puzzle 6: tabs from a stock by taps on the small disks, Fold, Can't,
  // the wrong disks, then the disks that need one of each.
  P = 'creases-06';
  await open(P);
  const tabsBy = async (i, deg) => tapDisk(disk(i), deg, 45);
  await tabsBy(0, 85); await tabsBy(0, 275); await tabsBy(1, 182);
  assert.equal(await page.locator('.cr-tab.used').count(), 3, 'three tabs used');
  await tabsBy(1, 268);
  assert.equal((await board(P)).at[1][3], 'V', 'the M tabs are gone, so a tap gives a V');
  await tabsBy(2, 95); await tabsBy(2, 265);
  await tap(button('Fold'));
  assert.ok((await board(P)).tried, 'folded');
  await page.waitForTimeout(1200);
  await shot('06-tabs');
  await tap(button('Can’t'));
  assert.equal((await active()).focus, 'cr-pick-0', 'Can’t sends focus to the first disk');
  const pickDisk = i => tap(page.locator('button.cr-disk-pick').nth(i));
  await pickDisk(0);
  assert.equal(await button('Check').isDisabled(), true, 'Check waits for every disk');
  await pickDisk(1); await pickDisk(2);
  assert.deepEqual((await board(P)).pick, ['odd', 'odd', 'odd']);
  await shot('06-marks');
  await tap(button('Check'));
  assert.equal(await told(), 'Not those tabs.');
  await focusOnBoard('after a refused marking');
  await pickDisk(1); await pickDisk(2); await pickDisk(0); await pickDisk(0);
  assert.deepEqual((await board(P)).pick, ['even', 'odd', 'odd'], 'a second tap: two the same');
  await tap(button('Check'));
  await done();
  assert.equal(await page.locator('.cr-sum').innerText(), 'The M tabs used are 2 or 4, never 3.');
  await shot('06-count');

  // Puzzle 11 (the busiest board): every tab on, Fold; the buttons stay
  // reachable on a phone.
  P = 'creases-11';
  await open(P);
  const fixed = ['MM??', 'V?V?', 'M?V?', '?M?V'];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) if (fixed[i][k] === '?') await tap(chip(k, `cr-d${i}`));
  await tap(button('Fold'));
  await page.waitForTimeout(1200);
  await fit('four disks');
  if (phone) {
    await page.locator('.puzzle-goal').evaluate(e => e.scrollIntoView({block: 'start'}));
    const tools = await page.locator('.cr-tools').boundingBox();
    assert.ok(tools.y + tools.height <= 667, `the buttons fit below the busiest board (${Math.round(tools.y + tools.height)})`);
  }
  await shot('11-busiest');

  // Puzzle 12: the new ray dragged in, stepped by a tap on the knob, moved
  // by keys and by the rim band; a tap inside letters a ray and leaves the
  // new ray where it is.
  P = 'creases-12';
  await open(P);
  const knob = page.locator('.cr-knob');
  await drag(await centre(knob), await diskPoint(disk(), 330, 89));
  assert.equal((await board(P)).at, 330, 'dragged to 330°');
  await tap(knob);
  assert.equal((await board(P)).at, 345, 'a tap on the knob steps it a tick');
  await knob.focus(); await page.keyboard.press('ArrowLeft'); await settle();
  assert.equal((await board(P)).at, 330, 'a key moves it a tick');
  assert.equal((await active()).focus, 'cr-knob', 'focus stays on the knob');
  await tapDisk(disk(), 40, 60);
  assert.equal((await board(P)).at, 330, 'a tap inside 10° from ray 2 leaves the new ray');
  assert.equal((await board(P)).labels[1], 'M', 'and letters ray 2');
  await tapDisk(disk(), 300, 60);
  assert.equal((await board(P)).at, 330, 'a tap inside far from every ray does nothing');
  await tapDisk(disk(), 300, 95);
  assert.equal((await board(P)).at, 300, 'a tap in the rim band moves the new ray there');
  await tapDisk(disk(), 333, 95);
  assert.equal((await board(P)).at, 330, 'a rim tap 3° from a tick, 33° from the new ray, moves it');
  for (const [pos, times] of [[0, 1], [2, 1], [3, 2], [4, 1], [5, 2]]) for (let t = 0; t < times; t++) await tap(chip(pos));
  assert.deepEqual((await board(P)).labels, ['M', 'M', 'M', 'V', 'M', 'V'], 'the new ray’s letter is last');
  await tap(button('Fold'));
  await done();
  await page.waitForTimeout(1200);
  await shot('12-ray');

  // The playground: add, remove, keys, Clear.
  P = 'creases-playground';
  await open(P);
  await tapDisk(disk(), 46, 60);
  assert.deepEqual((await board(P)).rays, [0, 45, 90, 180, 270], 'a tap between rays adds one');
  await tapDisk(disk(), 90, 96);
  assert.deepEqual((await board(P)).rays, [0, 45, 90, 180, 270], 'a tap on a ray’s end keeps it');
  assert.equal((await board(P)).labels[2], 'M', 'and letters it');
  await hold(await diskPoint(disk(), 90, 60));
  assert.deepEqual((await board(P)).rays, [0, 45, 180, 270], 'press and hold removes it');
  await page.locator('.cr-knob').focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  assert.deepEqual((await board(P)).rays, [0, 45, 180, 270], 'keys move the knob, not the board');
  await page.keyboard.press('Enter'); await settle();
  assert.deepEqual((await board(P)).rays, [0, 30, 45, 180, 270], 'Enter adds the ray two ticks on');
  assert.equal((await active()).focus, 'cr-knob', 'focus stays on the knob');
  await chip(1).focus(); await page.keyboard.press('Delete'); await settle();
  assert.deepEqual((await board(P)).rays, [0, 45, 180, 270], 'Delete on a chip removes its ray');
  for (let k = 0; k < 4; k++) await tap(chip(k));
  await tap(button('Fold'));
  await page.locator('svg.cr-stack').waitFor();
  await page.waitForTimeout(1200);
  await shot('playground');
  await button('Clear').focus(); await page.keyboard.press('Enter'); await settle();
  assert.deepEqual((await board(P)).rays, []);
  await focusOnBoard('after Clear');
  await fit('playground');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`creases browser smoke passed${phone ? ' (phone)' : ''}`);
} finally {
  await browser.close();
}
