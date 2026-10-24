// A quick double tap on a claim button that opens a claim mode is one press
// (pattern 6 of docs/claims-audit.md). Each such button carries data-toggle,
// and the click right after its press, within 350 ms, is dropped when it is
// the same slot or lands within 40 px of the first tap (dist/main.js, and
// api.repeatToggle for the buttons chips, rotor and holes wire themselves).
// For each puzzle the suite applies hints until the claim button is on and
// closed, then checks:
// - a double tap (two taps 90 ms apart at one point) draws the board exactly
//   as one tap does: the claim open and nothing else changed, even where
//   opening the claim moves the button and puts Restart, a stepper or a piece
//   of the board under the finger;
// - a second tap that follows the redrawn button, 90 ms later, leaves the
//   claim open too, and with data-toggle taken off the button it closes the
//   claim again (so the check above can fail);
// - a tap 400 ms later, a separate press, closes the claim.
// Same environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a 390 × 844 phone with touch,
// TEST_SIZE=820x1180 for another touch screen); TEST_FAMILY=<id>[,<id>] runs
// only those modules.
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const [width, height] = (process.env.TEST_SIZE || (process.env.TEST_PHONE === '1' ? '390x844' : '1280x900')).split('x').map(Number);
const touch = process.env.TEST_PHONE === '1' || Boolean(process.env.TEST_SIZE);
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, '');
// [module, puzzle, the claim button, its data-toggle slot]: one puzzle per
// claim button (two where a module has two kinds), the one whose claim needs
// the fewest hint moves to switch on, or one where opening the claim moves
// things under the finger. The button is found by its own classes, so a
// button that has lost data-toggle still shows what a double tap does.
const CASES = [
  ['squares', 'squares-03', '.sq-cant', 'sq-cant'],
  ['sites', 'sites-11', '.st-cant', 'st-cant'],
  ['averages', 'averages-05', '.av-cant', 'av-cant'],
  ['cardmachines', 'cardmachines-04', '.cm-cant', 'cm-cant'],
  ['diffs', 'diffs-04', '.df-cant', 'df-cant'],
  ['mobius', 'mobius-05', '.mb-bar button[aria-pressed]', 'mb-cant'],
  ['shares', 'shares-04', '.sh-cant', 'sh-cant'], ['shares', 'shares-02', '.sh-cant', 'sh-cant'],
  ['strings', 'strings-02', '.st-button.cant', 'strings-cant'],
  ['trios', 'trios-05', '.ts-cant', 'ts-cant'],
  ['globe', 'globe-03', '.gl-cant', 'globe-cant'],
  ['geoboard', 'geoboard-10', '.geo-cant', 'geo-cant'],
  ['creases', 'creases-10', '.cr-cant', 'cr-cant'], ['creases', 'creases-06', '.cr-cant', 'cr-cant'],
  ['friezes', 'friezes-02', '.fz-claim', 'fz-claim-0'], ['friezes', 'friezes-04', '.fz-claim', 'fz-claim-1'], ['friezes', 'friezes-10', '.fz-claim', 'fz-claim-2'],
  ['tetra', 'tetra-02', '.tt-cant', 'tt-cant'], ['tetra', 'tetra-11', '.tt-cant', 'tt-cant'],
  ['islands', 'islands-05', '.isl-bar button[aria-pressed]', 'isl-claim'], ['islands', 'islands-08', '.isl-bar button[aria-pressed]', 'isl-claim'],
  ['towers', 'towers-03', '.tw-no', 'tw-no'],
  ['stairs', 'stairs-01', '.st-fewest', 'st-fewest'],
  ['gapflood', 'gapflood-02', '.gp-button[aria-pressed]', 'gp-cant'],
  ['reshape', 'reshape-09', '.rs-cant', 'rs-cant'],
  ['tropical', 'tropical-11', '.tr-cant', 'tr-cant'],
  ['votes', 'votes-01', '.vt-cant', 'vt-cant'], ['votes', 'votes-03', '.vt-cant', 'vt-cant'],
  ['chips', 'chips-s02', '.chip-claim[aria-pressed]', 'chip-pick'],
  ['rotor', 'rotor-01', '.ro-cant', 'ro-cant'],
  ['holes', 'holes-01', '.hl-cant', 'hl-cant'],
  // Guarded since October 24 by the portal lane (Strands' claim buttons have
  // no pressed state, so its own suite checks them) and the other claims-audit
  // lanes (billiard is Mirror Couriers' shape puzzles, where opening the
  // corner map takes Launch away and moves Can't).
  ['glued', 'glued-01', '.gl-cant', 'gl-cant'],
  ['shields', 'shields-06', '.ps-button', 'ps-claim'],
  // Paint's and hills' hint for Can't holds the claim open while it shows,
  // so their first move is made by hand: [..., the control tapped first].
  ['paint', 'paint-03', '.paint-cant', 'paint-cant', '.paint-hand button:not([disabled])'],
  ['hills', 'hills-02', '.hills-cant', 'hills-cant', '.hills-cell:is(button):not([disabled])'],
  ['billiard', 'billiard-16', '.cr-button[aria-pressed]', 'cr-cant']
];
const only = process.env.TEST_FAMILY ? new Set(process.env.TEST_FAMILY.split(',')) : null;
const context = await browser.newContext({viewport: {width, height}, hasTouch: touch});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const button = name => page.getByRole('button', {name, exact: true});
const tapAt = async (x, y) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const failures = [];
let checked = 0;
// One case. Its quick pairs of taps must reach the page under 330 ms apart
// (90 ms are asked for); on a loaded machine they may not, and the case is
// tried again from the start, since a slow second tap is a separate press
// and may have restarted the puzzle.
async function trial(id, selector, slot, retry, first) {
  const claim = page.locator(`[data-puzzle-id="${id}"] ${selector}`).first();
  const state = async () => (await claim.count()) ? claim.getAttribute('aria-pressed') : 'gone';
  // The puzzle's board panel, without what moves on its own (chip animations).
  const drawn = () => page.locator(`[data-puzzle-id="${id}"] .board-panel`).evaluate(el => el.outerHTML.replace(/ data-animating="\d+"/g, ''));
  // The button's centre once the page has stopped scrolling (a move can send
  // focus, and a smooth scroll, somewhere else) and nothing animates over it
  // (tetra's models fly to their stacks, and one can cross the button after
  // a single look found it clear, so the button must be on top three looks
  // running).
  const centre = async () => {
    await claim.scrollIntoViewIfNeeded();
    let b = await claim.boundingBox();
    for (let k = 0; k < 20; k++) { await page.waitForTimeout(50); const c = await claim.boundingBox(); if (c.x === b.x && c.y === b.y) break; b = c; }
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    for (let k = 0; k < 30 && await page.evaluate(() => document.getAnimations().some(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity)); k++) await page.waitForTimeout(50);
    for (let k = 0, clear = 0; k < 60 && clear < 3; k++) {
      clear = await claim.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [x, y]) ? clear + 1 : 0;
      if (clear < 3) await page.waitForTimeout(50);
    }
    return [x, y];
  };
  const tap = async () => { const [x, y] = await centre(); await tapAt(x, y); await settle(); };
  const gap = () => page.evaluate(() => { const t = window.__taps; return t.length < 2 ? Infinity : t.at(-1) - t.at(-2); });
  const out = {failures: [], slow: false, hints: 0};
  const fail = text => out.failures.push(`${id} (${width}×${height}): ${text}`);
  // A child can't reach the next puzzle within 350 ms of the last tap.
  await page.waitForTimeout(400);
  await page.goto(`${base}/#play/${id}`);
  await page.locator(`[data-puzzle-id="${id}"] .board-panel`).waitFor();
  // A try again starts the puzzle afresh.
  const again = page.locator(`[data-puzzle-id="${id}"] :is([data-action="restart"], [data-action="replay"])`).first();
  if (retry && await again.count()) { await again.click(); await page.locator(`[data-puzzle-id="${id}"] .board-panel`).waitFor(); }
  // Hints until the claim is on and closed (the claim waits for an attempt).
  let n = 0;
  if (first) { await page.locator(`[data-puzzle-id="${id}"] ${first}`).first().click(); await settle(); }
  while (!first && n++ < 30) {
    if (await claim.count() && await claim.isEnabled() && await state() !== 'true') break;
    for (let k = 0; k < 3 && !await button('Apply hint').count() && await button('Hint').count(); k++) await button('Hint').click();
    if (!await button('Apply hint').count()) break;
    await button('Apply hint').click();
    await settle();
  }
  out.hints = first ? 0 : n - 1;
  if (!(await claim.count() && await claim.isEnabled() && await state() === 'false')) { fail(`the claim button ${slot} never switched on`); return out; }
  if (await claim.getAttribute('data-toggle') !== slot) fail(`the claim button has data-toggle ${await claim.getAttribute('data-toggle')}, not ${slot}`);
  // One tap, as the reference; a separate tap later closes it again.
  await tap();
  if (await state() !== 'true') { fail(`one tap leaves ${slot} ${await state()}`); return out; }
  const once = await drawn();
  await page.waitForTimeout(400); await tap();
  if (await state() !== 'false') { fail(`a second tap 400 ms later leaves ${slot} ${await state()}`); return out; }
  // A double tap at one point is one tap.
  await page.waitForTimeout(400);
  { const [x, y] = await centre(); await tapAt(x, y); await page.waitForTimeout(90); await tapAt(x, y); await settle(); }
  if (await gap() >= 330) { out.slow = true; return out; }
  if (await state() !== 'true') fail(`a double tap leaves ${slot} ${await state()}`);
  else if (await drawn() !== once) fail('a double tap changes more than one tap does');
  await page.waitForTimeout(400);
  if (await state() === 'true') await tap();
  // A second tap on the redrawn button, wherever it moved: dropped with
  // data-toggle, and closing the claim without it.
  for (const strip of [false, true]) {
    await page.waitForTimeout(400);
    const [x, y] = await centre();
    if (strip) await claim.evaluate(el => el.removeAttribute('data-toggle'));
    await tapAt(x, y); await page.waitForTimeout(90);
    if (!await claim.count()) { fail(`${slot} is gone after one tap`); break; }
    const b2 = await claim.boundingBox(); await tapAt(b2.x + b2.width / 2, b2.y + b2.height / 2); await settle();
    if (await gap() >= 330) { out.slow = true; return out; }
    if (await state() !== (strip ? 'false' : 'true')) fail(strip ? `without data-toggle a quick second press leaves ${slot} ${await state()}, so the check proves nothing` : `a quick second press on the moved ${slot} leaves it ${await state()}`);
    if (!strip && await state() === 'true') { await page.waitForTimeout(400); await tap(); }
  }
  return out;
}
try {
  await page.goto(base);
  await page.locator('#nickname').fill('Toggle QA');
  await page.locator('#profile-form button[type=submit]').click();
  await page.locator('#main').waitFor();
  // Every tap's time as the page sees it (pointerdown, which a disabled
  // button gets too, unlike click).
  await page.evaluate(() => { window.__taps = []; addEventListener('pointerdown', () => window.__taps.push(performance.now()), true); });
  for (const [mod, id, selector, slot, first] of CASES.filter(c => !only || only.has(c[0]))) {
    let out, tries = 0;
    do out = await trial(id, selector, slot, tries > 0, first); while (out.slow && ++tries < 4);
    if (out.slow) { failures.push(`${id} (${width}×${height}): no quick pair of taps reached the page under 330 ms apart in four tries`); continue; }
    failures.push(...out.failures);
    if (!out.failures.length) { checked++; console.log(`${mod} ${id}: ok after ${first ? 'one move' : `${out.hints} hint moves`}${tries ? ` (${tries} slow ${tries === 1 ? 'try' : 'tries'} again)` : ''}`); }
  }
  if (errors.length) failures.push(`page errors: ${errors.join('; ')}`);
  assert.deepEqual(failures, []);
  console.log(`Passed: a double tap is one press on the claim button in ${checked} puzzles (${width}×${height}${touch ? ', touch' : ''}).`);
} finally {
  await browser.close();
}
