// Plays Flip switches through the real interface on the shared graph board:
// setting switches by tapping them, by tapping a road and by Enter, a second
// tap on the chosen road or tree doing nothing, Send kept off until every
// switch is set, a red letter and Undo, Can't through taps of a switch and two
// letters with its refusal lines (the same kind of answer on a target that
// can be made, with Can't staying on), a right proof, 44 px switches on the
// eight-exit tree on a phone, Keep and That's all with "There is another.",
// and the playground's trees, cap and Clear. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone viewport with touch
// taps). Screenshots go in test-results/rotor/.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1180, height: 820}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = new URL('../test-results/rotor/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.ro-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const node = id => page.locator(`.gb-node[data-node="${id}"]`);
const road = i => page.locator(`[data-gb-edge="${i}"]`);
const slot = k => page.locator(`.ro-slot[data-rr-at="${k}"]`);
const button = name => page.locator(`.ro-${name}`);
// Every control is pressed at its centre, by a touch tap on a phone and a
// mouse click on a desktop, after scrolling it into view as a child would.
const tap = async locator => {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
  if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
};
const send = async n => { for (let k = 0; k < n; k++) await tap(button('send')); };
const undo = () => page.locator('[data-action="undo"]').click();
const panel = () => page.locator('.ro-puzzle').innerHTML();
const told = async () => (await page.locator('.ro-told').count()) ? page.locator('.ro-told').innerText() : '';
const count = selector => page.locator(selector).count();
const refusedMove = async () => (await page.locator('.feedback').count()) && /not allowed/.test(await page.locator('.feedback').first().innerText());
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Rotor QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  assert.equal(await page.locator('.satchel-family[data-view-key="family-rotor"] .family-ink-symbol').innerText(), '⋎', 'in the satchel');

  // One switch: Send waits for the switch; Enter sets it; four counters take turns.
  const O = 'rotor-01';
  await open(O); await fit('one switch');
  assert.equal(await count('.ro-told'), 0, 'no line under the board');
  assert.doesNotMatch(await page.locator('.board-panel').innerText(), /Make the counters|Find every/, 'no objective line on a make puzzle');
  assert.equal(await button('send').isDisabled(), true, 'Send waits until the switch is set');
  assert.equal(await button('cant').isDisabled(), true, 'Can’t waits for a counter');
  await node('s0').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(O)).start, ['L'], 'Enter points the switch left first');
  await shot('one-set');
  await send(4);
  await done();
  await shot('one-solved');

  // Four exits: a road tap points a switch; a wrong letter shows red; Undo.
  const F = 'rotor-04';
  await open(F); await fit('four exits');
  await tap(road(1));
  assert.deepEqual((await board(F)).start, ['R', null, null], 'a road tap points its switch that way');
  const chosen = await panel();
  await tap(road(1));
  assert.equal(await refusedMove(), false, 'a second tap on the chosen road shows no error');
  assert.equal(await panel(), chosen, 'and changes nothing');
  assert.equal(await road(1).getAttribute('aria-label'), 'Road from the top switch to the right, the next road');
  await tap(node('s1')); await tap(node('s2'));
  assert.equal(await button('send').isDisabled(), false, 'Send once every switch is set');
  await send(1);
  assert.equal(await count('.ro-arrivals .ro-slot.wrong'), 1, 'C where A was wanted shows red');
  assert.equal(await count('.ro-trail'), 1, 'the trip glows');
  assert.equal(await count('.gb-node.sw[role="button"]'), 0, 'switches are fixed after the first counter');
  await shot('four-wrong');
  // Can't on a target that can be made: the claim gets its own verdict, as on
  // an impossible target, and Can't stays on.
  await tap(button('cant'));
  assert.equal(await count('.ro-puzzle.claiming'), 1);
  await tap(node('s0')); await tap(slot(0)); await tap(slot(1));
  assert.equal(await told(), 'Those two go different ways there.');
  assert.equal(await button('cant').isDisabled(), false, 'Can’t stays on');
  await shot('four-refused');
  let before = await panel(); await undo();
  assert.notEqual(await panel(), before, 'Undo changes the screen');
  assert.equal(await told(), '', 'Undo takes the line away');
  assert.equal((await board(F)).sent, 1, 'and only the line');
  before = await panel(); await undo();
  assert.notEqual(await panel(), before);
  assert.equal((await board(F)).sent, 0, 'Undo takes back the counter');
  await tap(node('s0'));
  assert.deepEqual((await board(F)).start, ['L', 'L', 'L']);
  await send(4);
  await done();

  // ABCD can't be made: a wrong proof is told and Can't stays on; the right one solves.
  const C = 'rotor-05';
  await open(C);
  for (const id of ['s0', 's1', 's2']) await tap(node(id));
  await send(1);
  await tap(button('cant')); await tap(node('s1')); await tap(slot(0)); await tap(slot(1));
  assert.equal(await told(), 'Those two go different ways there.');
  assert.equal(await button('cant').isDisabled(), false, 'a wrong proof leaves Can’t on');
  await tap(button('cant')); await tap(slot(0)); await tap(slot(1)); await tap(node('s2'));
  assert.equal(await told(), 'Both counters must pass that switch.');
  await tap(button('cant'));
  await tap(slot(1));
  assert.equal(await count('.ro-slot.chosen'), 1, 'a picked letter is marked');
  await tap(button('cant'));
  assert.equal(await count('.ro-puzzle.claiming'), 0, 'pressing Can’t again lets go');
  // Can't is a data-toggle slot: a press within 350 ms of the last is taken
  // for a double tap and dropped (dist/main.js), so the suite waits.
  await page.waitForTimeout(400);
  await tap(button('cant')); await tap(slot(1)); await tap(slot(0)); await tap(node('s0'));
  await done();
  assert.deepEqual((await board(C)).claim, {node: 's0', at: [0, 1]}, 'the claim is stored in order');
  assert.equal(await count('.ro-slot.claimed'), 2); assert.equal(await count('.gb-node.claimed'), 1);
  await shot('abcd-proof');

  // Eight exits: another counter between them; the switch below the top is the proof.
  const E = 'rotor-11';
  await open(E); await fit('eight exits');
  if (phone) for (const box of await page.locator('.gb-node.sw .gb-reach').evaluateAll(els => els.map(e => e.getBoundingClientRect().width))) assert.ok(box >= 44, `a switch’s tap area is 44 px or more (${box.toFixed(1)})`);
  for (let i = 0; i < 7; i++) await tap(node(`s${i}`));
  await send(3);
  await tap(button('cant')); await tap(node('s0')); await tap(slot(0)); await tap(slot(2));
  assert.equal(await told(), 'Another counter passes that switch between them.');
  await shot('eight-between');
  await tap(button('cant')); await tap(node('s1')); await tap(slot(0)); await tap(slot(2));
  await done();
  await shot('eight-proof');

  // Find every: Keep brings the counters back; That's all too early is told.
  const V = 'rotor-06';
  await open(V); await fit('find every');
  assert.match(await page.locator('.board-panel').innerText(), /Find every order that fits\./, 'one objective line');
  await tap(road(1)); await tap(node('s1')); await tap(road(5));
  assert.deepEqual((await board(V)).start, ['R', 'L', 'R']);
  assert.equal(await button('keep').isDisabled(), true, 'Keep waits for a full row');
  await send(4);
  await tap(button('keep'));
  assert.deepEqual((await board(V)).kept, ['DACB']);
  assert.equal((await board(V)).sent, 0, 'Keep brings the counters back');
  assert.equal(await count('.ro-tray-dot'), 4);
  await tap(button('all'));
  assert.equal(await told(), 'There is another.');
  assert.equal(await button('all').isDisabled(), true, 'That’s all stays off for this shelf');
  await shot('every-more');
  await tap(node('s1'));
  assert.equal(await button('all').isDisabled(), true, 'still off while the shelf is the same');
  await send(4);
  assert.equal(await button('keep').isDisabled(), false);
  await tap(button('keep'));
  assert.equal(await button('all').isDisabled(), false, 'on again for a new shelf');
  await shot('every-shelf');
  await tap(button('all'));
  await done();

  // The playground: trees, the cap of two blocks, Clear.
  const G = 'rotor-playground';
  await open(G); await fit('playground');
  assert.equal(await page.getByRole('button', {name: 'Hint', exact: true}).count(), 0, 'no Hint');
  assert.equal(await count('.ro-tree-button'), 3);
  await tap(page.locator('.ro-tree-button').nth(0));
  assert.equal(await refusedMove(), false, 'a tap on the chosen tree shows no error');
  assert.equal((await board(G))?.depth ?? 1, 1);
  await tap(page.locator('.ro-tree-button').nth(2));
  assert.equal(await count('.gb-node.sw'), 7, 'the eight-exit tree');
  await fit('playground, eight exits');
  for (let i = 0; i < 7; i++) await tap(node(`s${i}`));
  await send(16);
  assert.equal((await board(G)).sent, 16);
  assert.equal(await button('send').isDisabled(), true, 'two blocks fill the row');
  assert.equal(await count('.ro-arrivals .ro-slot.full'), 16);
  await shot('playground');
  await tap(button('clear'));
  assert.equal((await board(G)).sent, 0); assert.deepEqual((await board(G)).start, Array(7).fill('L'), 'Clear keeps the switches');
  assert.equal(await button('clear').isDisabled(), true, 'nothing left to clear');
  await tap(page.locator('.ro-tree-button').nth(0));
  assert.equal(await count('.gb-node.sw'), 1, 'the one-switch tree');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
