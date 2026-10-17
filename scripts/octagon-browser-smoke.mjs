// Plays Octagon streets through the real interface: moves by button, by a tap
// on a road ahead of the robot and by arrow keys; a drag that slides the
// floor without moving the robot; Can't judged tap first (a wrong dot reads
// the same on squares, where there is a way, as on octagons; only the right
// dot says There is a way), a contested tap between two dots that goes to the
// nearer, taps on home and at the rim that choose nothing, a refusal kept
// through Undo, the same walk again and Restart until a different finished
// walk; a dot beyond the targets brought within reach by a drag; the home
// marker; the walk's light dots tapped for an odd goal; puzzle 8's bare Can't
// with the tight fence and its corners; focus after moves; hints to Apply
// hint; the playground; and the fit of the busiest boards. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a 375 × 667 phone with
// touch). Screenshots go in test-results/octagon/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1280, height: 860}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/octagon/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.oc-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const floor = i => page.locator(`.oc-wrap[data-floor="${i}"]`);
const svg = i => page.locator(`svg.oc-board[data-floor="${i}"]`);
const press = async (i, label) => { await floor(i).getByRole('button', {name: label, exact: true}).click(); };
const moves = async (i, w) => { for (const m of w) await press(i, {L: 'Turn left', S: 'Go straight', R: 'Turn right'}[m]); };
const cant = i => floor(i).getByRole('button', {name: 'Can’t', exact: true});
const told = i => floor(i).locator('.oc-told');
// A narrow screen shows one floor at a time.
const show = async i => { if (phone && await page.locator('.oc-tabs').isVisible()) await page.locator('.oc-tab').nth(i).click(); };
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
// A point given in the floor's disk coordinates (radius 1, y up).
const tapDisk = async (i, zx, zy) => { const b = await svg(i).boundingBox(); await tapAt(b.x + (zx * 100 + 104) / 208 * b.width, b.y + (-zy * 100 + 104) / 208 * b.height); };
// Where each Can't target is, and which are right (dots named by any word at
// them), from the page's own module.
const targets = (i, words) => page.evaluate(async ([i, words]) => {
  const m = await import('/families/octagon/octagon.js');
  const s = document.querySelector(`svg.oc-board[data-floor="${i}"]`), kind = s.classList.contains('oct') ? 'oct' : 'sq';
  const want = new Set(words.map(w => m.dotKey(kind, m.reduce(kind, w))));
  return [...s.querySelectorAll('.oc-target')].map(t => { const r = t.getBoundingClientRect(), c = t.dataset.cert; return {x: r.x + r.width / 2, y: r.y + r.height / 2, cert: c, right: want.has(m.dotKey(kind, m.reduce(kind, c)))}; });
}, [i, words]);
const halfway = (kind, walk) => page.evaluate(async ([kind, walk]) => (await import('/families/octagon/octagon.js')).halfwayState(kind, walk), [kind, walk]);
const lightDots = (kind, walk) => page.evaluate(async ([kind, walk]) => (await import('/families/octagon/octagon.js')).evenDots(kind, walk), [kind, walk]);
const nearestTo = (list, t) => list.filter(u => u !== t && !u.right).sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0];
// The k-th point of a floor's trail (the dot after k moves), in disk coordinates.
const trailPoint = async (i, k) => { const d = await svg(i).locator('.oc-trail').getAttribute('d'), m = d.split('M')[k + 1].match(/^(-?[\d.]+) (-?[\d.]+)/); return [Number(m[1]) / 100, -Number(m[2]) / 100]; };
// A drag between two points in disk coordinates, by mouse or by touch.
const dragDisk = async (i, [ax, ay], [bx, by]) => {
  const b = await svg(i).boundingBox(), X = zx => b.x + (zx * 100 + 104) / 208 * b.width, Y = zy => b.y + (-zy * 100 + 104) / 208 * b.height;
  if (phone) {
    const cdp = await context.newCDPSession(page), touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
    await touch('touchStart', X(ax), Y(ay));
    for (let s = 1; s <= 10; s++) await touch('touchMove', X(ax + (bx - ax) * s / 10), Y(ay + (by - ay) * s / 10));
    await touch('touchEnd', 0, 0);
  } else {
    await page.mouse.move(X(ax), Y(ay)); await page.mouse.down();
    await page.mouse.move(X(bx), Y(by), {steps: 10}); await page.mouse.up();
  }
};
const focusIsGood = () => page.evaluate(() => { const a = document.activeElement; return Boolean(a && (a.matches('svg.oc-board') || a.matches('.oc-go')) && !a.matches('.oc-cant')); });
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Octagon QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1: a road tap, buttons, arrow keys, a drag.
  const P1 = 'octagon-01';
  await open(P1); await fit('puzzle 1');
  const width = (await svg(0).boundingBox()).width;
  assert.ok(width <= 382 && width >= 280, `the floor is compact (${width})`);
  assert.equal(await page.locator('.puzzle-goal').innerText(), 'Home in exactly 8 moves, facing the same way.');
  await tapDisk(0, -0.3, 0.02);
  assert.equal((await board(P1)).floors[0].walk, 'L', 'a tap on the road to the robot’s left turns left');
  assert.ok(await focusIsGood(), 'focus on the board after a tap');
  await tapDisk(0, 0.02, -0.3);
  assert.equal((await board(P1)).floors[0].walk, 'LL', 'the floor slid, so left is now down the picture');
  const before = await svg(0).innerHTML();
  const b0 = await svg(0).boundingBox();
  if (phone) {
    const cdp = await context.newCDPSession(page), touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
    await touch('touchStart', b0.x + b0.width / 2, b0.y + b0.height / 2);
    for (let s = 1; s <= 8; s++) await touch('touchMove', b0.x + b0.width / 2 + s * 10, b0.y + b0.height / 2 + s * 4);
    await touch('touchEnd', 0, 0);
  } else {
    await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2); await page.mouse.down();
    await page.mouse.move(b0.x + b0.width / 2 + 80, b0.y + b0.height / 2 + 30, {steps: 8}); await page.mouse.up();
  }
  assert.notEqual(await svg(0).innerHTML(), before, 'a drag slides the floor');
  assert.equal((await board(P1)).floors[0].walk, 'LL', 'a drag moves nothing');
  await press(0, 'Turn left');
  assert.ok(await focusIsGood(), 'focus stays on the move buttons');
  await svg(0).focus();
  for (let k = 0; k < 5; k++) await page.keyboard.press('ArrowLeft');
  await done(); await fit('puzzle 1 solved');
  await shot('p1-solved');

  // Puzzle 2: squares, where there is a way: a wrong dot is refused, kept
  // through Undo and the same walk again; only the right dot says There is a
  // way. Octagons: taps on home and at the rim, a contested tap, Undo keeping
  // the refusal, the right dot; Restart keeping the squares refusal.
  const P2 = 'octagon-02';
  await open(P2); await fit('puzzle 2');
  await show(0);
  assert.equal(await cant(0).isDisabled(), true, 'Can’t waits for a try');
  await moves(0, 'SSSS');
  await cant(0).click();
  assert.equal(await cant(0).getAttribute('aria-pressed'), 'true');
  assert.ok(await focusIsGood(), 'focus on the board after Can’t');
  let list = await targets(0, [await halfway('sq', 'SSSS')]);
  assert.equal(list.filter(t => t.right).length, 1, 'squares: the dot after two moves is a target');
  const sqWrong = list.find(t => !t.right);
  await tapAt(sqWrong.x, sqWrong.y);
  assert.equal(await told(0).innerText(), 'Not that dot.', 'squares: a wrong dot is refused');
  assert.equal(await cant(0).isDisabled(), true, 'Can’t shut while the refusal stands');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await told(0).innerText(), 'Not that dot.', 'Undo keeps the refusal');
  assert.equal((await board(P2)).floors[0].walk, 'SSS', 'and takes back a move');
  await moves(0, 'S');
  assert.equal(await told(0).innerText(), 'Not that dot.', 'the same walk again keeps it');
  assert.equal(await cant(0).isDisabled(), true, 'and keeps Can’t shut');
  await page.locator('[data-action="undo"]').click();
  await moves(0, 'L');
  assert.equal(await told(0).count(), 0, 'a different finished walk ends it');
  await cant(0).click();
  list = await targets(0, [await halfway('sq', 'SSSL')]);
  const sqRight = list.find(t => t.right); await tapAt(sqRight.x, sqRight.y);
  assert.equal(await told(0).innerText(), 'There is a way.', 'squares: the right dot says there is a way');
  await shot('p2-way');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await told(0).innerText(), 'There is a way.', 'Undo keeps it');
  await show(1);
  await moves(1, 'LLLL');
  await cant(1).click();
  const right = await halfway('oct', 'LLLL');
  list = await targets(1, [right]);
  assert.equal(list.filter(t => t.right).length, 1, 'the dot after two moves is one target among many');
  assert.ok(list.length > 12);
  assert.equal(await page.locator('.oc-target.hinted, .oc-hinted').count(), 0, 'no target is marked');
  assert.equal(await floor(1).locator('.oc-dot').count(), 0, 'only targets are drawn');
  await shot('p2-claiming');
  // Home is drawn but is no target; the rim is beyond reach.
  const homeRing = await floor(1).locator('.oc-home').boundingBox(), before2 = JSON.stringify(await board(P2));
  await tapAt(homeRing.x + homeRing.width / 2, homeRing.y + homeRing.height / 2);
  await tapDisk(1, 0.7, -0.69); await tapDisk(1, -0.99, 0.05);
  assert.equal(JSON.stringify(await board(P2)), before2, 'taps on home and at the rim choose nothing');
  assert.equal(await cant(1).getAttribute('aria-pressed'), 'true', 'Can’t still waits for a tap');
  const good = list.find(t => t.right), near = nearestTo(list, good);
  // A tap between the right dot and its nearest neighbour, nearer the neighbour.
  await tapAt(good.x + (near.x - good.x) * 0.75, good.y + (near.y - good.y) * 0.75);
  assert.equal(await told(1).innerText(), 'Not that dot.', 'a contested tap goes to the nearer dot, refused in the same words as on squares');
  await shot('p2-wrong-dot');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await told(1).innerText(), 'Not that dot.', 'Undo keeps the refusal');
  assert.equal((await board(P2)).floors[1].walk, 'LLL');
  await moves(1, 'S');
  assert.equal(await told(1).count(), 0, 'a different walk clears it');
  await cant(1).click();
  list = await targets(1, [await halfway('oct', 'LLLS')]);
  const good2 = list.find(t => t.right), near2 = nearestTo(list, good2);
  await tapAt(good2.x + (near2.x - good2.x) * 0.25, good2.y + (near2.y - good2.y) * 0.25);
  assert.notEqual((await board(P2)).floors[1].cert, null, 'a tap nearer the right dot takes it');
  assert.equal(await floor(1).locator('.oc-proof').count(), 1, 'the first two moves are drawn');
  await shot('p2-certificate');
  await page.locator('[data-action="restart"]').click();
  await show(0);
  assert.equal(await told(0).innerText(), 'There is a way.', 'Restart keeps the refusal');
  assert.equal((await board(P2)).floors[0].walk, '', 'on a fresh floor');
  await moves(0, 'LLLL');
  assert.equal(await told(0).count(), 0);
  await show(1);
  await moves(1, 'LLLS');
  await cant(1).click();
  list = await targets(1, [await halfway('oct', 'LLLS')]);
  const g3 = list.find(t => t.right); await tapAt(g3.x, g3.y);
  await done();

  // Puzzle 4: home off the drawing has a marker; after six straight moves the
  // dot after three is drawn near the rim, too small to tap, and a drag brings
  // it within reach.
  const P4 = 'octagon-04';
  await open(P4);
  await show(1); await moves(1, 'SSSSSS');
  assert.equal(await floor(1).locator('.oc-homeward').count(), 1, 'a marker points to home');
  assert.equal(await floor(1).locator('.oc-home').count(), 0, 'home is off the drawing');
  await shot('p4-home-marker');
  await cant(1).click();
  const half4 = await halfway('oct', 'SSSSSS'), z4 = await trailPoint(1, 3);
  assert.ok(Math.hypot(...z4) > 0.94, `the dot after three moves is near the rim (${Math.hypot(...z4).toFixed(3)})`);
  assert.equal((await targets(1, [half4])).filter(t => t.right).length, 0, 'it is not a target');
  const before4 = JSON.stringify(await board(P4));
  await tapDisk(1, ...z4);
  assert.equal(JSON.stringify(await board(P4)), before4, 'a tap on it chooses nothing');
  await dragDisk(1, [z4[0] * 0.3, z4[1] * 0.3], [-z4[0] * 0.5, -z4[1] * 0.5]);
  list = await targets(1, [half4]);
  assert.equal(list.filter(t => t.right).length, 1, 'after a drag it is a target');
  const g4 = list.find(t => t.right); await tapAt(g4.x, g4.y);
  assert.notEqual((await board(P4)).floors[1].cert, null, 'and a tap on it takes it');
  await shot('p4-dragged');
  await show(0); await moves(0, 'LLSLLS');
  await done();

  // Puzzle 5: after Can't, the walk's light dots are tapped; a wrong set is
  // refused once, on the last tap.
  const P5 = 'octagon-05';
  await open(P5);
  await show(0); await moves(0, 'LLSLLSL'); await cant(0).click();
  list = await targets(0, await lightDots('sq', 'LLSLLSL'));
  const light = list.filter(t => t.right), dark = list.find(t => !t.right);
  assert.equal(light.length, 2, 'both light dots of the walk are targets');
  await tapAt(light[0].x, light[0].y);
  assert.equal(await floor(0).locator('.oc-target.oc-marked').count(), 1, 'a tapped dot is marked');
  assert.equal(await floor(0).locator('.oc-target[aria-pressed="true"]').count(), 1);
  assert.equal((await board(P5)).floors[0].told, null, 'nothing judged yet');
  await shot('p5-marking');
  await tapAt(dark.x, dark.y);
  assert.equal(await told(0).innerText(), 'Not those dots.', 'judged on the last tap');
  assert.equal(await floor(0).locator('.oc-target').count(), 0, 'the taps are cleared');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await told(0).innerText(), 'Not those dots.', 'Undo keeps the refusal');
  await moves(0, 'R');
  assert.equal(await told(0).count(), 0, 'a different walk clears it');
  await cant(0).click();
  list = await targets(0, await lightDots('sq', 'LLSLLSR'));
  for (const t of list.filter(u => u.right)) await tapAt(t.x, t.y);
  assert.equal(await floor(0).locator('.oc-dark').count(), 1, 'the colouring is drawn');
  assert.equal(await floor(0).locator('.oc-ring').count(), 1, 'with the tapped dots ringed');
  await show(1); await moves(1, 'LLLLLLL'); await cant(1).click();
  list = await targets(1, await lightDots('oct', 'LLLLLLL'));
  assert.equal(list.filter(t => t.right).length, 3);
  for (const t of list.filter(u => u.right)) await tapAt(t.x, t.y);
  await done(); await shot('p5-colouring');

  // Puzzle 8: squares fence with four lefts; octagons run out of left turns,
  // and Can't alone draws the tight fence and its 12 corners.
  const P8 = 'octagon-08';
  await open(P8);
  await show(1);
  assert.equal(await floor(1).getByRole('button', {name: 'Turn right', exact: true}).isDisabled(), true, 'no right turns');
  await moves(1, 'SLLLLLLSLLLLL');
  assert.equal(await floor(1).getByRole('button', {name: 'Turn left', exact: true}).isDisabled(), true, 'the left turns are used up');
  assert.ok(await focusIsGood(), 'focus moves off a button that is now disabled to the board');
  await cant(1).click();
  assert.equal((await board(P8)).floors[1].cert, '', 'Can’t alone');
  assert.equal(await floor(1).locator('.oc-tight').count(), 1, 'the tight fence round the flowers is drawn');
  assert.equal(((await floor(1).locator('.oc-corner').getAttribute('d')).match(/M/g) || []).length, 12, 'with its 12 corners');
  await shot('p8-fence');
  await show(0); await moves(0, 'SLLSLL');
  await done(); await fit('puzzle 8 solved');

  // Hints: three presses reach Apply hint, which makes a move.
  const P7 = 'octagon-07';
  await open(P7);
  for (let k = 0; k < 3; k++) await page.locator('[data-action="hint"]').click();
  await page.getByRole('button', {name: 'Apply hint', exact: true}).click();
  assert.equal((await board(P7)).floors[0].walk.length, 1, 'Apply hint moves');
  await moves(0, 'LLLLLSLLLLLLS');
  await done();

  // The busiest boards fit: fourteen move boxes, nineteen left turns.
  await open(P1); await open(P7); await moves(0, 'LLLLLLSLLLLL'); await fit('puzzle 7 busy'); await shot('p7-busy');
  assert.equal(new Set(await floor(0).locator('.oc-record i').evaluateAll(is => is.map(i => i.getBoundingClientRect().top))).size, 1, 'fourteen move boxes in one row');
  const P9 = 'octagon-09';
  await open(P9); await moves(0, 'SLLLLLSLLLLLL'); await fit('puzzle 9 busy'); await shot('p9-busy');
  // The goal, the floor, the budget and the move buttons fit in one screen.
  const goal = await page.locator('.puzzle-goal').boundingBox(), controls = await floor(0).locator('.oc-controls').boundingBox();
  assert.ok(controls.y + controls.height - goal.y <= 640, `the board and its buttons fit a screen (${Math.round(controls.y + controls.height - goal.y)} px)`);
  assert.equal(new Set(await floor(0).locator('.oc-budget i').evaluateAll(is => is.map(i => i.getBoundingClientRect().top))).size, 1, 'the budget is one row');
  await moves(0, 'RLLLLLL');
  await done();

  // The playground: both floors, and Clear.
  const PG = 'octagon-playground';
  await open(PG);
  await show(0); await moves(0, 'LLLL');
  await show(1); await moves(1, 'LLLLLLLL');
  assert.deepEqual((await board(PG)).walks, ['LLLL', 'LLLLLLLL']);
  await floor(1).getByRole('button', {name: 'Clear', exact: true}).click();
  assert.deepEqual((await board(PG)).walks, ['LLLL', '']);
  assert.equal(await page.locator('[data-action="hint"]').count(), 0, 'no Hint in the playground');
  await shot('playground');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`Octagon streets browser smoke passed${phone ? ' (phone)' : ''}.`);
} finally {
  await browser.close();
}
