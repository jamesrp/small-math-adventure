// Plays Corners through the real interface: the satchel's two groups, adding
// corners by tapping shapes, taking one out by a tap and by Enter, a tap on
// two overlapping corners going to the one on top, a tap on a pinned corner
// doing nothing, Fold and laying the corner flat again, Keep shelving with no
// verdict, That's all judging the shelf with its refusals kept through Undo,
// a shelf ring taken off, Can't after a fold with its refusal kept through
// Undo and then accepted on the smallest ring, hints up to Apply hint, the
// opened drawings with taps near a dot going to the nearest line, a tap on a
// dot doing nothing, Enter on a line, cut-off dots and a line drawn back, the
// playground, where focus lands after moves and claims, the busiest board on
// a 375 × 667 phone, and no page overflow. Same environment variables as the
// other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone with touch); SHOTS_DIR moves the screenshots out
// of test-results/corners/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const pack = JSON.parse(await readFile(new URL('../dist/families/corners/corners.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const out = process.env.SHOTS_DIR ? pathToFileURL(process.env.SHOTS_DIR.replace(/\/?$/, '/')) : new URL('../test-results/corners/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="corners"]').first().waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const told = async () => (await page.locator('.cr-told').count()) ? page.locator('.cr-told').innerText() : null;
const button = name => page.getByRole('button', {name, exact: true});
const NAME = {T: 'triangle', S: 'square', P: 'pentagon'};
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(phone ? 400 : 30); };
const centre = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tap = async locator => tapAt(await centre(locator));
const add = async word => { for (const c of word) await tap(button(`Add a ${NAME[c]} corner`)); };
// A point of an svg board, in its own units, on the screen.
const onScreen = (selector, [x, y]) => page.evaluate(([s, x, y]) => { const svg = document.querySelector(s), p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()); return [p.x, p.y]; }, [selector, x, y]);
// The middle of a polygon's corners, on the screen.
const pieceAt = i => polyAt(`.cr-board [data-cr-take="${i}"]`);
const polyAt = selector => page.evaluate(selector => { const el = document.querySelector(selector), pts = [...el.points], m = el.getScreenCTM(); const c = pts.reduce((s, p) => [s[0] + p.x / pts.length, s[1] + p.y / pts.length], [0, 0]); const q = new DOMPoint(c[0], c[1]).matrixTransform(m); return [q.x, q.y]; }, selector);
const focused = () => page.evaluate(() => { const e = document.activeElement; return {tag: e?.tagName || '', cls: e?.getAttribute('class') || '', text: e?.textContent?.trim() || '', focus: e?.dataset?.focus || ''}; });
const focusOk = async label => {
  const f = await focused();
  assert.notEqual(f.tag, 'BODY', `${label}: focus is not on the page body`);
  assert.ok(!['That’s all', 'Can’t'].includes(f.text), `${label}: focus is not on a claim (${f.text})`);
  assert.match(f.cls + f.focus, /cr-add|cr-move|cr-piece|cr-folded|cr-shelf|gb-hit|completion/, `${label}: focus on the board or a move control (${f.cls} ${f.focus})`);
};
const undoButton = () => page.locator('[data-action="undo"]').click();
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Corners QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // The satchel: the family with its symbol, the playground and two flat groups.
  const family = page.locator('.satchel-family[data-view-key="family-corners"]');
  assert.equal(await family.locator('.family-ink-symbol').innerText(), '∡');
  assert.deepEqual(await family.locator('.library-band h2').allInnerTexts(), ['Rings', 'Trees'], 'two groups, Rings then Trees');
  assert.equal(await family.locator('.satchel-playground').count(), 1);
  await fit('satchel');

  // Rings 1: add, Fold, lay flat, Keep with no verdict, That's all.
  const R1 = 'corners-ring-01';
  await open(R1); await fit('find every');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Find every ring that folds to a point.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a shelf');
  assert.equal(await button('Fold').isDisabled(), true, 'Fold waits for three corners');
  await add('TT');
  assert.equal(await button('Fold').isDisabled(), true);
  await add('T');
  assert.deepEqual((await board(R1)).ring, ['T', 'T', 'T'], 'taps add corners');
  assert.equal(await page.locator('.cr-board .cr-gap').count(), 1, 'the gap is shaded');
  await button('Fold').focus(); await page.keyboard.press('Enter');
  assert.equal((await board(R1)).fold, 'point');
  assert.equal(await page.locator('.cr-folded-board .cr-face').count(), 3, 'three faces folded');
  await focusOk('after Fold');
  await tap(page.locator('[data-cr-unfold]'));
  assert.equal((await board(R1)).fold, null, 'a tap lays it flat again');
  await button('Keep').click();
  assert.equal((await board(R1)).shelf.length, 1, 'Keep shelves the ring');
  assert.equal(await told(), null, 'with no verdict');
  await button('That’s all').click();
  assert.equal(await told(), 'There is another.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for the shelf to change');
  await focusOk('after a refused That’s all');
  await shot('another');
  await undoButton();
  assert.deepEqual((await board(R1)).refused, {kind: 'more'}, 'Undo keeps the refusal');
  assert.equal(await told(), null, 'and the words go, so the board changes');
  assert.equal(await button('That’s all').isDisabled(), true, 'still locked');
  // Enter on a corner takes it out.
  await page.locator('.cr-board [data-cr-take="2"]').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(R1)).ring, ['T', 'T'], 'Enter takes a corner out');
  await focusOk('after Enter on a corner');
  await add('TT'); await button('Keep').click();
  await add('T'); await button('Keep').click();
  await add('T'); await button('Keep').click();
  assert.equal((await board(R1)).shelf.length, 4);
  await button('That’s all').click();
  assert.equal(await told(), 'This one lies flat.');
  assert.equal(await page.locator('.cr-shelf-item.ringed').count(), 1, 'the ring is marked on the shelf');
  assert.ok(!/\d/.test(await told()), 'no numbers');
  await tap(page.locator('.cr-shelf-item.ringed'));
  assert.equal((await board(R1)).shelf.length, 3, 'a tap takes a ring off the shelf');
  await focusOk('after taking a ring off');
  await button('That’s all').click();
  await done(); await fit('find every solved');
  assert.equal(await page.locator('.cr-shelf .cr-face').count() > 0, true, 'the shelf drawn folded');
  await shot('every-solved');

  // Rings 9: a tap where two corners overlap goes to the one on top, and the
  // busiest board fits a phone.
  const R9 = 'corners-ring-09';
  await open(R9);
  await add('SSSTT');
  assert.equal(await page.locator('.cr-board .cr-piece.past').count(), 1, 'the corner past a whole turn is faded');
  // At 15° the last triangle lies over the first square.
  await tapAt(await onScreen('.cr-board', [15 * Math.cos(15 * Math.PI / 180), -15 * Math.sin(15 * Math.PI / 180)]));
  assert.deepEqual((await board(R9)).ring, ['S', 'S', 'S', 'T'], 'the corner on top is taken out');
  for (const w of ['SSST', 'TTTTT', 'STTTT', 'SSTT', 'STST', 'SSS', 'SST', 'STT', 'TTT', 'TTTT', 'STTT']) {
    const ring = (await board(R9)).ring;
    for (let i = ring.length - 1; i >= 0; i--) await tapAt(await pieceAt(i));
    await add(w); await button('Keep').click();
  }
  await add('TTTTTTTT');
  assert.equal((await board(R9)).shelf.length, 11);
  await fit('busiest ring board');
  const span = await page.evaluate(() => { const top = document.querySelector('.cr-adds').getBoundingClientRect().top, bottom = document.querySelector('.cr-actions').getBoundingClientRect().bottom; return bottom - top; });
  assert.ok(span <= 470, `the corners, board and move controls fit a phone screen together (${span}px)`);
  await shot('busiest');
  await page.locator('.cr-board [data-cr-take="7"]').focus(); await page.keyboard.press('Enter');
  await button('That’s all').click();
  await done();

  // Rings 6: Can't after a fold, refused and kept through Undo, then accepted.
  const R6 = 'corners-ring-06';
  await open(R6); await fit('make');
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Fold a pointed corner.');
  assert.equal(await page.locator('.cr-pin').count(), 2, 'the fixed corners are pinned');
  await tapAt(await polyAt('.cr-board .cr-piece.locked'));
  assert.deepEqual((await board(R6)).ring, ['S', 'S'], 'a tap on a fixed corner does nothing');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for an attempt');
  await add('TSP');
  assert.equal(await button('Can’t').isDisabled(), true, 'and for a fold');
  await button('Fold').click();
  assert.equal(await told(), 'They overlap.');
  await button('Can’t').click();
  assert.equal(await told(), 'This corner could be smaller.');
  assert.equal(await page.locator('.cr-board [data-ringed]').count(), 1, 'the corner is marked');
  await focusOk('after a refused Can’t');
  await shot('smaller');
  await undoButton();
  assert.equal((await board(R6)).refused.kind, 'smaller', 'Undo keeps Can’t’s answer');
  assert.equal(await told(), 'They overlap.', 'and the board changes');
  assert.equal(await button('Can’t').isDisabled(), true);
  await tapAt(await pieceAt(4)); await tapAt(await pieceAt(3));
  assert.equal((await board(R6)).refused, null, 'a new ring clears it');
  await add('TT');
  await button('Fold').click();
  assert.equal(await told(), 'It lies flat.');
  assert.equal(await page.locator('.cr-folded-board.is-flat').count(), 1);
  await button('Can’t').click();
  await done(); await fit('can’t solved');
  assert.equal(await told(), 'Even the smallest corners make a whole turn.');
  await shot('cant');

  // Rings 5: the first hint, then hints up to Apply hint.
  const R5 = 'corners-ring-05';
  await open(R5);
  await button('Hint').click();
  assert.equal(await page.locator('.hint-card').innerText(), byId(R5).hints[0], 'the first hint is the puzzle’s own');
  await add('SP');
  for (let i = 0; i < 3 && !(await button('Apply hint').count()); i++) await button('Hint').click();
  assert.equal(await page.locator('.cr-board .cr-piece.hinted').count(), 1, 'the hint marks a corner to take out');
  for (let i = 0; i < 8 && !(await page.locator('#completion-heading').count()); i++) await button('Apply hint').click();
  await done();

  // Trees 2: taps near a dot go to the nearest line; a dot is not a control.
  const T2 = 'corners-tree-02', q = byId(T2).parameters, H = 100 / q.aspect, at = id => [q.nodes[id][0], q.nodes[id][1] * H / 100];
  await open(T2); await fit('tree');
  assert.equal(await page.locator('.ct-region').count(), 5, 'five shaded regions');
  const [ax, ay] = at('A');
  await tapAt(await onScreen('.ct-map', [ax + 8, ay - 2.5]));
  assert.deepEqual((await board(T2)).erased, [0], 'a tap between the bottom line and a spoke goes to the nearer line');
  assert.equal(await page.locator('.ct-region').count(), 4, 'a region opens');
  await tapAt(await onScreen('.ct-map', [ax + 6, ay - 5.5]));
  assert.deepEqual((await board(T2)).erased, [0, 8], 'a tap on the spoke near the dot');
  await tapAt(await onScreen('.ct-map', at('E')));
  assert.deepEqual((await board(T2)).erased, [0, 8], 'a tap on a dot does nothing');
  await tap(page.locator('.ct-map [data-gb-edge="3"]'));
  assert.equal(await page.locator('.ct-map .gb-node.cut').count(), 1, 'corner A is cut off');
  await page.locator('.ct-map [data-gb-edge="3"]').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(T2)).erased, [0, 8], 'Enter on a line draws it back');
  assert.equal(await page.locator('.ct-map .gb-node.cut').count(), 0);
  await focusOk('after Enter on a line');
  for (const line of [1, 2, 4]) await tap(page.locator(`.ct-map [data-gb-edge="${line}"]`));
  await done(); await fit('tree solved');
  assert.equal(await page.locator('.ct-map .gb-stroke.tree').count(), 7, 'the tree drawn');
  await shot('tree');

  // Trees 3: the busiest drawing, cut and hinted.
  const T3 = 'corners-tree-03';
  await open(T3); await fit('octahedron');
  for (const line of [0, 2, 6, 7]) await tap(page.locator(`.ct-map [data-gb-edge="${line}"]`));
  assert.equal(await page.locator('.ct-map .gb-node.cut').count(), 1, 'the top dot is cut off');
  await button('Hint').click(); await button('Hint').click();
  assert.equal(await page.locator('.ct-map .gb-edge.hinted').count(), 1, 'the hint marks a line to draw back');
  await shot('octahedron-cut');
  await button('Hint').click();
  for (let i = 0; i < 12 && !(await page.locator('#completion-heading').count()); i++) await button('Apply hint').click();
  await done();

  // The playground.
  const G = 'corners-playground';
  await open(G); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await add('PPP');
  await button('Fold').click();
  assert.equal((await board(G)).fold, 'point');
  await shot('playground');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
