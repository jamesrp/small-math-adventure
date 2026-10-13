// Plays Sharing circles through the real interface on the shared graph board:
// choosing places by tapping them (also at the edge of a shape facing its
// neighbour, where two places' tap areas come closest), the number row, Enter,
// digits and arrow keys, cards that move, one changed square at a time, Found
// already, That's all and its refusal held through Undo, Can't only after an
// attempt, the chase tapped to a smaller square with nothing marking the next
// place, a tap away from the chase, the argument drawn, a wrong Can't kept
// through Undo, keyboard focus after moves, and the playground's boards. Same
// environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/averages/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/averages/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.av-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const place = id => page.locator(`.av-board .gb-node[data-node="${id}"]`);
const numberKey = v => page.locator(`.av-keys [data-focus="av-key-${v}"]`);
const told = () => page.locator('.av-told').textContent().catch(() => null);
const classes = async id => (await place(id).getAttribute('class')).split(/\s+/);
const focused = () => page.evaluate(() => document.activeElement?.dataset.focus || document.activeElement?.className || document.activeElement?.tagName);
// Taps land through real hit-testing: the touchscreen on a phone, the mouse otherwise.
const tapAt = async (x, y) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const centre = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2, b.width / 2]; };
const tap = async locator => { const [x, y] = await centre(locator); await tapAt(x, y); };
// A tap just inside a place's shape on the side facing another place, where
// two tap areas come closest.
async function edgeTap(id, toward) {
  const [x1, y1, r] = await centre(place(id).locator('.gb-dot')), [x2, y2] = await centre(place(toward).locator('.gb-dot'));
  const d = Math.hypot(x2 - x1, y2 - y1), s = r * 0.92 / d;
  await tapAt(x1 + (x2 - x1) * s, y1 + (y2 - y1) * s);
}
const setPlace = async (id, value, toward = null) => { if (toward) await edgeTap(id, toward); else await tap(place(id)); await tap(numberKey(value)); };
const undoButton = () => page.locator('[data-action="undo"]').click();
const notClaim = async label => assert.ok(!['av-all', 'av-cant', 'av-stop'].includes(await focused()), `${label}: focus is not on That’s all or Can’t (${await focused()})`);

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Circles QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 1: find every way, with taps, keys, That's all and Found already.
  let P = 'averages-01';
  await open(P); await fit('star');
  assert.equal(await page.locator('.puzzle-goal').textContent().then(t => t.trim()), 'Find every way to make the circle work.', 'one short objective');
  assert.ok((await classes('t')).includes('chosen'), 'the first free place starts chosen');
  assert.equal(await place('c').getAttribute('role'), 'img', 'the given circle is not a control');
  await tap(place('l')); await page.keyboard.press('Tab');
  assert.equal(await focused(), 'gb-node-r', 'Tab reaches the right square');
  assert.ok((await classes('r')).includes('chosen'), 'focus chooses the right square');
  await page.keyboard.press('1');
  assert.deepEqual((await board(P)).values, {t: null, l: null, r: 1}, 'typing edits the focused square, leaving the clicked square alone');
  await page.keyboard.press('ArrowUp');
  assert.equal((await board(P)).values.r, 2, 'arrows edit the focused square too');
  await tap(numberKey(3));
  assert.equal((await board(P)).values.r, 3, 'the keypad follows keyboard focus');
  for (let k = 0; k < 3; k++) await undoButton();
  await tap(place('t'));
  await tap(numberKey(2));
  assert.equal((await board(P)).values.t, 2, 'a number goes on the chosen place');
  assert.equal(await focused(), 'av-key-2', 'focus stays on the number row');
  await setPlace('l', 2, 'c');
  assert.equal((await board(P)).values.l, 2, 'a tap at the edge of the left square, facing the circle, chooses it');
  await setPlace('r', 2, 'c');
  assert.deepEqual((await board(P)).found, [[2, 2, 2]], 'a way is kept the moment it is made');
  assert.ok((await classes('c')).includes('lit'), 'the circle lights');
  assert.equal(await page.locator('.av-shelf li').count(), 1);
  await tap(page.locator('.av-all'));
  assert.equal((await board(P)).more, true);
  assert.equal(await told(), 'There is another.');
  assert.equal(await page.locator('.av-all').isDisabled(), true, 'That’s all waits for a new way');
  await notClaim('after a refused That’s all');
  await place('l').focus(); await page.keyboard.press('Enter');
  assert.ok((await classes('l')).includes('chosen'), 'Enter chooses a place');
  await page.keyboard.press('ArrowDown');
  assert.equal((await board(P)).values.l, 1, 'an arrow steps the number');
  await place('r').focus(); await page.keyboard.press('Enter'); await page.keyboard.press('3');
  assert.deepEqual((await board(P)).found, [[2, 2, 2], [2, 1, 3]], 'a digit sets the number');
  assert.equal(await focused(), 'gb-node-r', 'focus stays on the place');
  assert.equal(await page.locator('.av-all').isDisabled(), false, 'a new way lifts the refusal');
  await tap(page.locator('.av-all'));
  await undoButton();
  assert.equal((await board(P)).found.length, 2, 'Undo keeps the ways found');
  assert.equal((await board(P)).more, true, 'and the refusal');
  assert.equal(await page.locator('.av-all').isDisabled(), true);
  await setPlace('l', 2); await setPlace('r', 2);
  assert.equal(await told(), 'Found already.');
  assert.equal(await page.locator('.av-shelf li.again').count(), 1);
  await shot('found-already'); await fit('found already');

  // Puzzle 2: cards move between places.
  P = 'averages-02';
  await open(P);
  await tap(numberKey(1));
  await setPlace('c', 1);
  assert.deepEqual((await board(P)).values, {l: null, c: 1, r: null}, 'the card leaves the square');
  await tap(place('l'));
  assert.match(await numberKey(1).getAttribute('class'), /used/, 'a card on another place looks used');
  await tap(numberKey(0)); await setPlace('r', 2);
  assert.deepEqual((await board(P)).found, [[0, 1, 2]]);
  await fit('cards');

  // Puzzle 3: one changed square at a time, then That's all.
  P = 'averages-03';
  await open(P);
  assert.ok((await classes('l')).includes('chosen'));
  await tap(numberKey(5));
  assert.deepEqual((await board(P)).found, [[5, 7]]);
  assert.ok((await classes('l')).includes('changed'), 'the changed square is marked');
  await setPlace('r', 11, 'c');
  assert.deepEqual((await board(P)).values, {l: 1, r: 11}, 'changing the other square puts the first back');
  await tap(page.locator('.av-all'));
  await done();

  // Puzzle 8: Can't after an attempt, a tap away from the chase, the chase,
  // Undo, the argument. Nothing marks the next place to tap.
  P = 'averages-08';
  await open(P); await fit('branch');
  assert.equal(await page.locator('.av-cant').isDisabled(), true, 'Can’t waits for an attempt');
  await setPlace('a', 12, 'b');
  await tap(page.locator('.av-cant'));
  assert.deepEqual((await board(P)).chase, ['c']);
  await notClaim('after Can’t');
  assert.equal(await page.evaluate(() => document.activeElement?.matches('.av-board')), true, 'focus goes to the board, not to a place');
  assert.equal(await page.locator('.av-board .gb-node.can-go').count(), 0, 'no place is tinted');
  await edgeTap('z', 'a');
  assert.equal((await board(P)).chase, null, 'a tap on a place not joined to the chase ends it');
  assert.equal(await told(), 'Not joined to the chase.');
  await tap(page.locator('.av-cant'));
  assert.deepEqual((await board(P)).chase, ['c'], 'Can’t again starts a new chase');
  await place('b').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P)).chase, ['c', 'b'], 'Enter extends the chase');
  await edgeTap('t', 'b');
  assert.ok((await classes('t')).includes('agree'), 'the 12 square agrees');
  await undoButton();
  assert.deepEqual((await board(P)).chase, ['c', 'b'], 'Undo takes back a tap');
  await edgeTap('a', 'b');
  assert.deepEqual((await board(P)).chase, ['c', 'b', 'a'], 'a tap at the circle’s edge, facing the junction');
  await shot('chase'); await fit('chase');
  await edgeTap('z', 'a');
  await done();
  assert.ok((await classes('z')).includes('clash'), 'the smaller square is marked');
  assert.equal(await page.locator('.av-path').count(), 1, 'the argument is drawn');
  await shot('argument'); await fit('argument');

  // Puzzle 12: a wrong Can't runs out, stays through Undo, and a new number lifts it.
  P = 'averages-12';
  await open(P);
  await setPlace('c', 3);
  await tap(page.locator('.av-cant'));
  for (const id of ['c', 'B', 'T']) await tap(place(id));
  assert.equal(await told(), 'Every square it reaches is 8.');
  assert.equal((await board(P)).chase, null, 'the chase ends when it runs out');
  assert.equal(await page.locator('.av-cant').isDisabled(), true, 'Can’t stays off');
  await notClaim('after a chase ran out');
  for (let k = 0; k < 5; k++) await undoButton();
  assert.equal((await board(P)).told, 'out', 'Undo keeps it');
  assert.equal(await page.locator('.av-cant').isDisabled(), true);
  await setPlace('c', 8);
  assert.equal(await page.locator('.av-cant').isDisabled(), false, 'a new number lifts it');
  await setPlace('a', 5); await setPlace('b', 5);
  await done();

  // Puzzle 5: the chase through a circle to the 0 square, tapped at the shapes' edges.
  P = 'averages-05';
  await open(P);
  await setPlace('a', 8);
  await tap(page.locator('.av-cant'));
  await edgeTap('a', 'b');
  await edgeTap('z', 'a');
  await done();

  // The playground: boards, every place free, no Hint.
  P = 'averages-playground';
  await open(P); await fit('playground');
  assert.equal(await page.locator('[data-action="hint"]').count(), 0, 'no Hint');
  await setPlace('p', 3); await setPlace('q', 6); await setPlace('r', 9);
  assert.equal(await page.locator('.av-board .gb-node.lit').count(), 3, 'the path lights in equal steps');
  await tap(page.locator('.av-pick[aria-label="Triangle"]'));
  assert.equal((await board(P)).board, 'triangle');
  await setPlace('t', 4); await setPlace('l', 4); await setPlace('r', 4);
  assert.equal(await page.locator('.av-board .gb-node.lit').count(), 3, 'all the same works with no squares');
  await setPlace('r', 5);
  assert.equal(await page.locator('.av-board .gb-node.lit').count(), 0);
  await shot('playground'); await fit('playground triangle');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`Sharing circles browser smoke passed${phone ? ' (phone)' : ''}.`);
} finally {
  await browser.close();
}
