// Plays Corners through the real interface: the satchel's two groups, adding
// corners by tapping shapes, taking one out by a tap and by Enter, a tap on
// two overlapping corners going to the one on top, a tap on a pinned corner
// doing nothing, Fold and laying the corner flat again, Keep shelving with no
// verdict (a turned copy too), That's all judging the shelf with its answer
// on the shelf, kept through Undo, marking one thing at a time and finding a
// ring kept twice, a shelf ring taken off, the solved shelf in rows, Can't
// after a fold with its one refusal (nothing marked) kept through Undo and
// then accepted on the smallest ring, hints up to Apply hint, the opened
// drawings with taps near a dot going to the nearest line, a tap on a dot
// doing nothing, Enter on a line, cut-off dots and a line drawn back, end
// dots taken off a tree by a tap near them and by Enter, the playground,
// where focus lands after moves and claims, the busiest board on a 375 × 667
// phone, and no page overflow. Same environment variables as the
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
const shelfTold = async () => (await page.locator('.cr-shelf-box .cr-shelf-told').count()) ? page.locator('.cr-shelf-box .cr-shelf-told').innerText() : null;
const ringedCount = () => page.locator('.cr-shelf-item.ringed').count();
const clearRing = async id => { if (await page.locator('[data-cr-unfold]').count()) await tap(page.locator('[data-cr-unfold]')); const ring = (await board(id)).ring; for (let i = ring.length - 1; i >= 0; i--) await tapAt(await pieceAt(i)); };
const button = name => page.getByRole('button', {name, exact: true});
const NAME = {T: 'triangle', S: 'square', P: 'pentagon'};
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(phone ? 400 : 30); };
const centre = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
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
  assert.match(f.cls + f.focus, /cr-add|cr-move|cr-piece|cr-folded|cr-shelf|gb-hit|gb-node|completion/, `${label}: focus on the board or a move control (${f.cls} ${f.focus})`);
};
const undoButton = () => page.locator('[data-action="undo"]').click();
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Corners QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // The satchel: the family with its symbol, the playground and two flat groups.
  const family = page.locator('.satchel-family[data-view-key="family-corners"]');
  // Every family starts closed: open this one.
  if (!(await family.evaluate(el => el.open))) await family.locator('summary').click();
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
  assert.equal(await shelfTold(), null);
  assert.equal(await button('Keep').isDisabled(), true, 'Keep waits for the ring to change');
  await button('That’s all').click();
  assert.equal(await shelfTold(), 'There is another.', 'the answer sits on the shelf');
  assert.equal(await told(), null, 'not under the board');
  assert.equal(await ringedCount(), 0);
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for the shelf to change');
  await focusOk('after a refused That’s all');
  await shot('another');
  await undoButton();
  assert.deepEqual((await board(R1)).refused, {kind: 'more'}, 'Undo keeps the refusal');
  assert.equal(await shelfTold(), null, 'and the words go, so the board changes');
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
  assert.equal(await shelfTold(), 'This one lies flat.');
  assert.equal(await ringedCount(), 1, 'the ring is marked on the shelf');
  assert.ok(!/\d/.test(await shelfTold()), 'no numbers');
  await tap(page.locator('.cr-shelf-item.ringed'));
  assert.equal((await board(R1)).shelf.length, 3, 'a tap takes a ring off the shelf');
  await focusOk('after taking a ring off');
  await button('That’s all').click();
  await done(); await fit('find every solved');
  assert.equal(await page.locator('.cr-cases .cr-row').count(), 4, 'the solved shelf in rows: three, four, five and six corners');
  assert.equal(await page.locator('.cr-cases .cr-face').count() > 0, true, 'its rings drawn folded');
  assert.equal(await page.locator('.cr-cases .cr-shelf-item.misses').count(), 1, 'six triangles end it');
  await shot('every-solved');

  // Rings 9: a tap where two corners overlap goes to the one on top, and the
  // busiest board fits a phone.
  const R9 = 'corners-ring-09';
  await open(R9);
  // The review's case: SSTT and SSSS kept, That's all, then TSST kept.
  await add('SSTT'); await button('Keep').click();
  await clearRing(R9); await add('SSSS'); await button('Keep').click();
  await button('That’s all').click();
  assert.equal(await shelfTold(), 'This one lies flat.');
  assert.equal(await ringedCount(), 1);
  await clearRing(R9);
  assert.equal(await shelfTold(), 'This one lies flat.', 'the shelf’s answer stays while the board changes');
  await add('TSST'); await button('Keep').click();
  assert.equal((await board(R9)).shelf.length, 3, 'a turned copy goes on the shelf');
  assert.equal(await shelfTold(), null, 'its answer goes with the old shelf');
  assert.equal(await ringedCount(), 0, 'nothing marked');
  await button('That’s all').click();
  assert.equal(await shelfTold(), 'This one lies flat.');
  assert.equal(await ringedCount(), 1, 'one ring marked');
  await tap(page.locator('.cr-shelf-item.ringed'));
  await button('That’s all').click();
  assert.equal(await shelfTold(), 'Two of these are the same ring.');
  assert.equal(await ringedCount(), 0, 'which two is left to the child');
  assert.ok(await button('That’s all').isDisabled(), 'locked while the shelf is the same');
  await shot('same-ring');
  await tap(page.locator('.cr-shelf-item').last());
  await tap(page.locator('.cr-shelf-item').first());
  assert.equal((await board(R9)).shelf.length, 0);
  await clearRing(R9);
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
  assert.equal(await told(), 'That ring doesn’t show it.');
  assert.equal(await page.locator('[data-ringed], .ringed').count(), 0, 'nothing is marked');
  await focusOk('after a refused Can’t');
  await shot('cant-refused');
  await undoButton();
  assert.deepEqual((await board(R6)).refused, {kind: 'no'}, 'Undo keeps Can’t’s answer');
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

  // Rings 2: the same refusal where a ring can fold.
  const R2 = 'corners-ring-02';
  await open(R2);
  await add('P'); await button('Fold').click(); await button('Can’t').click();
  assert.equal(await told(), 'That ring doesn’t show it.', 'the same words on a puzzle that can be done');
  assert.equal(await page.locator('[data-ringed]').count(), 0);

  // Rings 5: a flat ring, the first hint, then hints up to Apply hint.
  const R5 = 'corners-ring-05';
  await open(R5);
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Make a ring that lies flat.');
  await button('Hint').click();
  assert.equal(await page.locator('.hint-card').innerText(), byId(R5).hints[0], 'the first hint is the puzzle’s own');
  await add('SP');
  await button('Hint').click();
  assert.equal(await page.locator('.hint-card').innerText(), 'Take out a pentagon.', 'the words name a shape before anything is marked');
  for (let i = 0; i < 3 && !(await button('Apply hint').count()); i++) await button('Hint').click();
  assert.equal(await page.locator('.cr-board .cr-piece.hinted').count(), 1, 'the hint marks a corner to take out');
  for (let i = 0; i < 8 && !(await page.locator('#completion-heading').count()); i++) await button('Apply hint').click();
  await done();

  // Trees 2: taps near a dot go to the nearest line; a dot is not a control.
  const T2 = 'corners-tree-02', q = byId(T2).parameters, H = 100 / q.aspect, at = id => [q.nodes[id][0], q.nodes[id][1] * H / 100];
  await open(T2); await fit('tree');
  const tints = async () => page.locator('.cn-region').evaluateAll(els => els.map(e => e.getAttribute('class')));
  assert.equal(await page.locator('.cn-region').count(), 5, 'five shaded regions');
  assert.equal(new Set(await tints()).size, 5, 'each with its own tint');
  const [ax, ay] = at('A');
  await tapAt(await onScreen('.cn-map', [ax + 8, ay - 2.5]));
  assert.deepEqual((await board(T2)).erased, [0], 'a tap between the bottom line and a spoke goes to the nearer line');
  assert.equal(await page.locator('.cn-region').count(), 4, 'a region opens');
  await tapAt(await onScreen('.cn-map', [ax + 6, ay - 5.5]));
  assert.deepEqual((await board(T2)).erased, [0, 9], 'a tap on the spoke near the dot');
  assert.equal(new Set(await tints()).size, 3, 'two regions became one: one tint fewer');
  await tapAt(await onScreen('.cn-map', at('E')));
  assert.deepEqual((await board(T2)).erased, [0, 9], 'a tap on a dot does nothing');
  await tap(page.locator('.cn-map [data-gb-edge="4"]'));
  assert.equal(await page.locator('.cn-map .gb-node.cut').count(), 1, 'corner A is cut off');
  await page.locator('.cn-map [data-gb-edge="4"]').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(T2)).erased, [0, 9], 'Enter on a line draws it back');
  assert.equal(await page.locator('.cn-map .gb-node.cut').count(), 0);
  await focusOk('after Enter on a line');
  // The dot on the bottom side: erasing its other line cuts it off.
  await tap(page.locator('.cn-map [data-gb-edge="1"]'));
  assert.equal(await page.locator('.cn-map .gb-node.cut').count(), 1, 'the dot on the bottom side is cut off');
  await tap(page.locator('.cn-map [data-gb-edge="1"]'));
  for (const line of [2, 3, 5]) await tap(page.locator(`.cn-map [data-gb-edge="${line}"]`));
  await done(); await fit('tree solved');
  assert.equal(await page.locator('.cn-map .gb-stroke.tree').count(), 8, 'the tree drawn');
  await shot('tree');

  // Trees 3: the busiest drawing, cut and hinted; then down to a tree and end dots taken off.
  const T3 = 'corners-tree-03', q3 = byId(T3).parameters, H3 = 100 / q3.aspect, at3 = id => [q3.nodes[id][0], q3.nodes[id][1] * H3 / 100];
  await open(T3); await fit('octahedron');
  assert.equal(new Set(await tints()).size, 7, 'seven regions, seven tints');
  for (const line of [0, 2, 6, 7]) await tap(page.locator(`.cn-map [data-gb-edge="${line}"]`));
  assert.equal(await page.locator('.cn-map .gb-node.cut').count(), 1, 'the top dot is cut off');
  await button('Hint').click(); await button('Hint').click();
  assert.equal(await page.locator('.cn-map .gb-edge.hinted').count(), 1, 'the hint marks a line to draw back');
  await shot('octahedron-cut');
  await page.locator('.cn-map [data-gb-edge="7"]').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.cn-map .gb-node.cut').count(), 0, 'drawn back');
  for (const line of [1, 8, 11, 3]) await tap(page.locator(`.cn-map [data-gb-edge="${line}"]`));
  assert.deepEqual((await board(T3)).erased, [0, 1, 2, 3, 6, 8, 11], 'the route’s tree');
  assert.equal(await page.locator('.cn-map.cn-leafing').count(), 1, 'a tree: end dots can come off');
  assert.equal(await page.locator('.cn-map .gb-hit').count(), 0, 'the lines are no longer controls');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'a tree is not the end here');
  // Which dots are end dots now: A (AF), B (BE), C (CD). A tap that takes
  // nothing off says the rule (not which dots are end dots), is not a move,
  // and goes at the next move.
  const RULE = 'Only an end dot comes off.';
  const moves3 = () => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.moves, [key, T3]);
  const before3 = await moves3(), marked3 = () => page.locator('.cn-map .gb-node.hinted, .cn-map .gb-node.ringed').count(), marks3 = await marked3();
  await tapAt(await onScreen('.cn-map', at3('E')));
  assert.deepEqual((await board(T3)).gone, [], 'a dot with more lines stays');
  assert.equal(await told(), RULE, 'a tap on a dot with more lines says the rule');
  assert.equal(await moves3(), before3, 'a refused tap is not a move');
  assert.equal(await marked3(), marks3, 'and marks no dot (beyond the hint already showing)');
  await focusOk('after a refused dot');
  await tapAt(await onScreen('.cn-map', [at3('A')[0] + 3.5, at3('A')[1] + 2]));
  assert.deepEqual((await board(T3)).gone, [['A', 7]], 'a tap near an end dot takes it off with its line');
  assert.equal(await told(), null, 'the next move clears the words');
  assert.equal(await page.locator('.cn-map .gb-node.gone').count(), 1, 'drawn faint');
  await focusOk('after taking a dot off');
  // A tap on a line, between E and F away from the dots, says the rule too.
  await tapAt(await onScreen('.cn-map', [0, 1].map(k => (at3('E')[k] + at3('F')[k]) / 2)));
  assert.equal(await told(), RULE, 'a tap on a line says the rule');
  assert.equal((await board(T3)).gone.length, 1, 'and takes nothing off');
  await focusOk('after a refused line');
  await page.locator('.cn-map [data-gb-node="D"]').focus(); await page.keyboard.press('Enter');
  assert.equal(await told(), RULE, 'Enter on a dot with more lines says the rule');
  assert.equal((await board(T3)).gone.length, 1);
  await focusOk('after Enter on a refused dot');
  await page.locator('.cn-map [data-gb-node="B"]').focus(); await page.keyboard.press('Enter');
  assert.equal((await board(T3)).gone.length, 2, 'Enter on an end dot');
  assert.equal(await told(), null, 'and the words go');
  await shot('octahedron-leaves');
  await undoButton();
  assert.equal((await board(T3)).gone.length, 1, 'Undo puts a dot back');
  await button('Hint').click(); await button('Hint').click(); await button('Hint').click();
  for (let i = 0; i < 8 && !(await page.locator('#completion-heading').count()); i++) await button('Apply hint').click();
  await done(); await fit('octahedron solved');
  assert.equal(await page.locator('.cn-map .gb-node:not(.gone)').count(), 1, 'one dot left');

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
