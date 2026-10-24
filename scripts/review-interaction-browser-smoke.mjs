// Direct binary entry and checked chip collections, using a disposable save;
// and the claims audit's base fixes (docs/claims-audit.md): the option already
// chosen does nothing, and dead ends wait behind Hint while a budget remains.
// TEST_PHONE=1 adds touch and taps the claims checks.
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = process.env.TEST_URL || 'http://127.0.0.1:4187';
const key = 'small-math-adventure:saves:v1';
const attempt = id => page.evaluate(({key, id}) => JSON.parse(localStorage.getItem(key)).profiles[0].attempts[id], {key, id});
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] .board-panel`).waitFor(); };
const chip = node => page.locator(`.chip-node[data-node="${node}"]`).click();
const press = locator => phone ? locator.tap() : locator.click();
const line = () => page.locator('.feedback').innerText();
const GENERIC = /not allowed|How to play\./;
// Press a control drawn as the option already chosen: nothing changes and no line appears.
async function chosenDoesNothing(id, locator, label) {
  const before = await attempt(id);
  assert.equal(await locator.getAttribute('aria-pressed'), 'true', `${label}: drawn as chosen`);
  await press(locator);
  assert.equal(await line(), '', `${label}: no line`);
  assert.doesNotMatch(await page.locator('main').innerText(), GENERIC, `${label}: no generic error`);
  assert.deepEqual((await attempt(id)).board, before.board, `${label}: nothing changes`);
}
try {
  await page.goto(base);
  await page.locator('#nickname').fill('Review QA');
  await page.locator('#profile-form button[type=submit]').click();
  await open('code-01');
  await page.getByRole('button', {name: 'Position 1: 0', exact: true}).click();
  await page.getByRole('button', {name: 'Position 2: 1', exact: true}).click();
  assert.deepEqual((await attempt('code-01')).board.bits, [0, 1], 'each bit takes one direct choice');
  await page.getByRole('button', {name: 'Check', exact: true}).click();
  await page.locator('#completion-heading').waitFor();
  await open('code-12');
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({width, height: 844});
    const geometry = await page.locator('.code-choices').evaluate(node => ({viewport: innerWidth, document: document.documentElement.scrollWidth, board: node.closest('.board-panel').getBoundingClientRect().width, choices: node.getBoundingClientRect().width}));
    assert.ok(geometry.document <= width + 1, `binary entries fit ${width}px: ${JSON.stringify(geometry)}`);
    assert.equal(await page.locator('.code-position').count(), 6);
  }
  await page.setViewportSize({width: 390, height: 844});
  await open('chips-01');
  assert.equal(await page.locator('.chip-slot.empty').count(), 0, 'answer count stays hidden');
  await chip('A'); await chip('B');
  await page.getByRole('button', {name: 'That’s all', exact: true}).click();
  assert.equal(await page.locator('#completion-heading').count(), 0);
  assert.equal(await page.locator('.chip-feedback').innerText(), 'There is another.');
  await page.getByRole('button', {name: 'New run', exact: true}).click();
  assert.deepEqual((await attempt('chips-01')).board.found, ['AB'], 'new run keeps the collection');
  await chip('B'); await chip('A');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'completion waits for the claim');
  await page.reload(); await page.locator('.chips-puzzle').waitFor();
  assert.deepEqual((await attempt('chips-01')).board.found, ['AB', 'BA'], 'unclaimed collection persists');
  await page.getByRole('button', {name: 'That’s all', exact: true}).focus();
  await page.keyboard.press('Enter');
  await page.locator('#completion-heading').waitFor();
  assert.ok((await attempt('chips-01')).completed);
  for (const [id, definition] of [['trios-01', /shapes are all the same or all different/], ['copies-01', /goes back.*copy/i], ['bags-playground', /possible pairs/], ['code-12', /Choose 0 or 1 in each position/], ['nim-12', /one or more pebbles from one pile/]]) {
    await open(id);
    await page.getByRole('button', {name: 'How to play', exact: true}).click();
    const primary = (await page.locator('.dialog-body>p').allTextContents()).join(' ');
    assert.match(primary, definition, `${id}: definition is in the primary Help`);
    await page.getByRole('button', {name: 'Done', exact: true}).click();
  }
  // Claims audit: tapping the option already chosen does nothing (the shared
  // guard in main.js, for board buttons and for taps a family's wire() applies).
  await open('code-02');
  await press(page.getByRole('button', {name: 'Position 1: 0', exact: true}));
  await chosenDoesNothing('code-02', page.getByRole('button', {name: 'Position 1: 0', exact: true}), 'code: the bit already chosen');
  await open('weigh-01');
  await chosenDoesNothing('weigh-01', page.getByRole('button', {name: 'Put pebble A off the scale', exact: true}), 'weigh: Off for a pebble off the scale');
  await press(page.getByRole('button', {name: 'Put pebble A on the left pan', exact: true}));
  await chosenDoesNothing('weigh-01', page.getByRole('button', {name: 'Put pebble A on the left pan', exact: true}), 'weigh: the pan a pebble is on');
  // Check again on the answer already given changes nothing.
  const secret = (await attempt('weigh-01')).board.secret, coin = ['A', 'B', 'C'].find(c => c !== secret[0]);
  await press(page.locator(`.answer-coin:has(input[value="${coin}"])`));
  await press(page.getByRole('button', {name: 'Check', exact: true}));
  const refused = await attempt('weigh-01');
  await press(page.getByRole('button', {name: 'Check', exact: true}));
  assert.equal(await line(), '', 'weigh: no line for Check again');
  assert.doesNotMatch(await page.locator('main').innerText(), GENERIC, 'weigh: no generic error for Check again');
  assert.equal((await attempt('weigh-01')).history.length, refused.history.length, 'weigh: Check again is not a move');
  await open('kits-02');
  await chosenDoesNothing('kits-02', page.locator('.kit-target[aria-pressed="true"]'), 'kits: the target on the scale');
  await chosenDoesNothing('kits-02', page.getByRole('button', {name: 'Weight 1: off', exact: true}), 'kits: the place a weight has');
  for (const place of ['beside the target', 'other pan']) {
    const button = page.getByRole('button', {name: `Weight 1: ${place}`, exact: true});
    await press(button);
    await chosenDoesNothing('kits-02', button, `kits: ${place}, where the weight already is`);
  }
  await press(page.locator('.kit-target[aria-pressed="false"]').first());
  await chosenDoesNothing('kits-02', page.locator('.kit-target[aria-pressed="true"]'), 'kits: a target just chosen');
  // Catches' bag sizes (06 and 10) and Tank's target level, which lane B left to this guard.
  for (const id of ['catches-06', 'catches-10']) {
    await open(id);
    await chosenDoesNothing(id, page.locator('.ck-bag-chip[aria-pressed="true"]'), `${id}: the starting bag`);
    await press(page.locator('.ck-bag-chip[aria-pressed="false"]').first());
    await chosenDoesNothing(id, page.locator('.ck-bag-chip[aria-pressed="true"]'), `${id}: a bag just chosen`);
  }
  for (const id of ['tank-02', 'tank-07']) {
    await open(id);
    await press(page.locator('.tank-target[aria-pressed="false"]').nth(4));
    await chosenDoesNothing(id, page.locator('.tank-target[aria-pressed="true"]'), `${id}: the level chosen`);
  }
  await open('pictures-playground');
  await chosenDoesNothing('pictures-playground', page.locator('.pic-size[aria-pressed="true"]'), 'pictures: the grid size chosen');
  await open('sorting-playground');
  await chosenDoesNothing('sorting-playground', page.locator('[data-sort-move][aria-pressed="true"]').first(), 'sorting (through its wire): the lanes chosen');
  // A lantern tapped with the colour it already has stays as it is.
  await open('color-02');
  const lantern = page.locator('.network-graph button[data-node]').first();
  await press(lantern); const coloured = await attempt('color-02');
  await press(lantern);
  assert.equal(await line(), '', 'color: no line for the same colour again');
  assert.equal((await attempt('color-02')).history.length, coloured.history.length, 'color: no undo step');
  // Lantern Wires (budget = fewest): a wasted press is told only behind Hint;
  // with the presses spent, the line says what is wrong.
  await open('toggle-03');
  const wire = page.locator('.wire-hit').first();
  await press(wire);
  assert.equal(await line(), '', 'toggle: no line while a press remains');
  await press(page.getByRole('button', {name: 'Hint', exact: true}));
  assert.match(await page.locator('.hint-card').innerText(), /^This picture needs 2 more presses, but only 1 press remains\. Undo a press or start again\.$/);
  await press(page.getByRole('button', {name: 'Restart', exact: true}));
  await press(wire); await press(page.locator('.wire-hit').first());
  assert.equal(await line(), 'The lanterns don’t match the goal card. Undo.', 'toggle: the line once the budget is spent');
  // Symbol Orchard: the repeat line shows once, on the board; a dead end with no repeat says nothing unasked.
  await open('latin-06');
  await press(page.locator('.latin-cell[data-cell="0"]'));
  await press(page.getByRole('button', {name: 'Mark 3', exact: true}));
  assert.equal(((await page.locator('.board-panel').innerText()) + (await line())).match(/repeats/g)?.length, 1, 'latin: the repeat line once');
  await press(page.getByRole('button', {name: 'Mark 1', exact: true}));
  assert.equal(await line(), '', 'latin: no unasked dead-end line');
  assert.doesNotMatch(await page.locator('.board-panel').innerText(), /repeats|complete orchard/);
  await page.screenshot({path: new URL(`../test-results/claims-latin${phone ? '-phone' : ''}.png`, import.meta.url).pathname, fullPage: true});
  assert.deepEqual(errors, []);
  console.log('Passed the claims audit base fixes: chosen options do nothing (board buttons and wired taps), the same colour stays, quiet dead ends behind Hint and the spent-budget line.');
  console.log('Passed direct binary entry, responsive entries, partial/full chip claims, new run, save/reload and keyboard completion.');
} finally { await browser.close(); }
