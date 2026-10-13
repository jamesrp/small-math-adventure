// Direct binary entry and checked chip collections, using a disposable save.
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const context = await browser.newContext({viewport: {width: 390, height: 844}});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = process.env.TEST_URL || 'http://127.0.0.1:4187';
const key = 'small-math-adventure:saves:v1';
const attempt = id => page.evaluate(({key, id}) => JSON.parse(localStorage.getItem(key)).profiles[0].attempts[id], {key, id});
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] .board-panel`).waitFor(); };
const chip = node => page.locator(`.chip-node[data-node="${node}"]`).click();
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
  assert.equal(await page.locator('.chip-feedback').innerText(), 'More orders remain.');
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
  for (const [id, definition] of [['trios-01', /shapes are all the same or all different/], ['copies-01', /goes back.*copy/i], ['bags-playground', /possible pairs/], ['code-12', /Choose 0 or 1 in each position/], ['nim-12', /choose how many to take/]]) {
    await open(id);
    await page.getByRole('button', {name: 'How to play', exact: true}).click();
    const primary = (await page.locator('.dialog-body>p').allTextContents()).join(' ');
    assert.match(primary, definition, `${id}: definition is in the primary Help`);
    await page.getByRole('button', {name: 'Done', exact: true}).click();
  }
  assert.deepEqual(errors, []);
  console.log('Passed direct binary entry, responsive entries, partial/full chip claims, new run, save/reload and keyboard completion.');
} finally { await browser.close(); }
