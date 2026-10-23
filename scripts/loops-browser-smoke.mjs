// Plays Loop worlds through the real interface: the satchel and its group;
// How to play; cards chosen and let go, a loop by a number, a crossing loop
// refused with its line and the loop in the way ringed, a loop taken away by
// its tag; Can't with three clues not on three cards, a refused claim with its
// small world and Can't shut, Undo keeping it, a loop opening Can't, and the
// certificate; every repair with That's all too early; a pin with the pips
// full and a second world drawn, a clue taken away and the solve; the number
// cards; the playground's distance; a card chosen by keyboard; focus after
// each kind of tap; and fit at phone and desktop sizes. Same environment
// variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_PHONE=1 for a phone with touch).
// Screenshots go in test-results/loops/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {loopMechanics} from '../dist/families/loops/loops.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : {width: 1024, height: 768}, hasTouch: phone});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const pack = JSON.parse(await readFile(new URL('../dist/families/loops/loops.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const out = new URL('../test-results/loops/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] [data-mechanic-wire]`).waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const press = name => page.getByRole('button', {name, exact: true});
const card = c => page.locator(`[data-mechanic-wire] .lp-world:not(.mini) [data-lp-card="${c}"]`);
const label = n => page.locator(`[data-mechanic-wire] [data-lp-label="${n}"]`);
const clue = i => page.locator(`[data-mechanic-wire] [data-lp-clue="${i}"]`);
const tag = (n, set) => page.locator(`[data-mechanic-wire] [data-focus="lp-loop-${n}-${set.join('')}"]`);
const told = async () => (await page.locator('.lp-told').count()) ? page.locator('.lp-told').innerText() : '';
// Taps go through real hit-testing at the centre of the control, by touch on
// a phone and by mouse otherwise.
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(phone ? 200 : 40); };
const focused = () => page.evaluate(() => { const e = document.activeElement; return {tag: e?.tagName || '', cls: e?.getAttribute('class') || '', focus: e?.dataset?.focus || '', id: e?.id || ''}; });
const focusOk = async what => {
  const f = await focused();
  assert.notEqual(f.tag, 'BODY', `${what}: focus is not on the page body`);
  assert.match(`${f.cls} ${f.focus} ${f.id}`, /lp-|completion/, `${what}: focus on the board or a move control (${JSON.stringify(f)})`);
};
const inView = async (locator, what) => { await page.evaluate(() => scrollTo(0, 0)); const b = await locator.first().boundingBox(); const h = await page.evaluate(() => innerHeight); assert.ok(b && b.y >= 0 && b.y + b.height <= h, `${what}: in view without scrolling (${b && Math.round(b.y + b.height)} of ${h})`); };
const checks = [];

// One step of the app's own hint, made by taps on the board and buttons.
async function step(p, what) {
  const b = await board(p.id) || loopMechanics[p.mechanic].fresh(p), h = loopMechanics[p.mechanic].hint(p, b);
  if (h.type !== 'move') return h;
  const a = h.action;
  if (a.type === 'add') { for (const c of a.cards) await tap(card(c)); await tap(label(a.label)); }
  else if (a.type === 'remove') await tap(tag(a.label, a.cards));
  else if (a.type === 'cant') { await tap(press('Can’t')); for (const i of a.clues) await tap(clue(i)); }
  else if (a.type === 'change') await tap(clue(a.clue));
  else if (a.type === 'all') await tap(press('That’s all'));
  else if (a.type === 'ask') { await tap(card(a.pair[0])); await tap(card(a.pair[1])); }
  else if (a.type === 'drop') await tap(page.locator(`[data-mechanic-wire] [data-focus="lp-clue-${a.pair.join('')}"]`));
  await focusOk(`${what}: ${a.type}`);
  assert.notDeepEqual(await board(p.id), b, `${what}: the ${a.type} taps made a move`);
  return h;
}
async function finish(p, what) {
  for (let i = 0; i < 60 && !await page.locator('#completion-heading').count(); i++) { const h = await step(p, `${what} ${i + 1}`); if (h.type !== 'move') break; }
  await done();
}

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Loops QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // The satchel: the symbol, the playground, the puzzles and the group.
  const family = page.locator('.satchel-family[data-view-key="family-loops"]');
  if (!(await family.evaluate(el => el.open))) await family.locator('summary').click();
  assert.equal(await family.locator('.family-ink-symbol').innerText(), '⦾');
  assert.equal(await family.locator('.satchel-playground').count(), 1);
  const bands = await family.locator('.library-band h2').allInnerTexts();
  assert.ok(bands.includes('Number cards'), `the Number cards group (${bands})`);
  await fit('satchel'); await family.screenshot({path: new URL(`satchel${phone ? '-phone' : ''}.png`, out).pathname});

  // 2, 4 and 4: How to play; choose and let go; a loop; a crossing loop refused; a loop by its tag; the solve.
  let p = byId('loops-02');
  await open(p.id); await fit('make, fresh');
  await page.locator('[data-action="demo"]').first().click();
  assert.match(await page.locator('dialog').innerText(), /Tap cards, then 2 or 4, to put a loop round them\./);
  await press('Done').click();
  assert.equal(await label(2).isDisabled(), true, 'the numbers wait for two cards');
  await tap(card('C')); await focusOk('a card chosen');
  assert.equal(await page.locator('.lp-card.picked').count(), 1);
  await tap(card('C'));
  assert.equal(await page.locator('.lp-card.picked').count(), 0, 'a second tap lets it go');
  await tap(card('A')); await tap(card('B')); await tap(label(2)); await focusOk('a loop made');
  assert.deepEqual((await board(p.id)).loops, [[2, ['A', 'B']]]);
  assert.equal(await page.locator('.lp-clue.lit').count(), 1, 'A–B lights');
  await tap(card('B')); await tap(card('C')); await tap(label(4));
  assert.match(await told(), /^Loops can’t cross\.$/);
  assert.equal(await page.locator('.lp-loop.refused').count(), 1, 'the loop in the way is ringed');
  assert.deepEqual((await board(p.id)).loops, [[2, ['A', 'B']]], 'nothing changes');
  await shot('make-refused'); await fit('make, refused');
  await tap(tag(2, ['A', 'B'])); await focusOk('a loop taken away');
  assert.deepEqual((await board(p.id)).loops, [], 'a tap on its tag takes the loop away');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(p.id)).loops, [[2, ['A', 'B']]], 'Undo puts it back');
  await tap(card('A')); await tap(card('B')); await tap(card('C')); await tap(label(4)); await done();
  assert.equal(await page.locator('.lp-clue.lit').count(), 3);
  await shot('make-solved'); checks.push('2, 4, 4: choose, let go, loop, refused crossing, tag, Undo, solve');

  // A chain of twos: three clues not on three cards; a refused claim; Undo; a loop opens Can't; the certificate.
  p = byId('loops-07');
  await open(p.id); await inView(press('Can’t'), 'chain, Can’t');
  await tap(press('Can’t')); await focusOk('Can’t pressed');
  assert.equal(await press('Can’t').getAttribute('aria-pressed'), 'true');
  await tap(clue(0)); await tap(clue(1)); await tap(clue(5));
  assert.match(await told(), /^Tap three clues on three cards\.$/);
  await tap(clue(0)); await tap(clue(2)); await tap(clue(4));
  assert.deepEqual((await board(p.id)).claim, [0, 2, 4]);
  assert.match(await told(), /^Loops can make these\.$/);
  assert.equal(await page.locator('.lp-world.mini').count(), 1, 'a small world for the three');
  assert.equal(await press('Can’t').isDisabled(), true, 'Can’t is shut');
  await shot('cant-refused'); await fit('chain, refused');
  await tap(card('A')); await tap(card('B')); await tap(label(2));
  assert.equal((await board(p.id)).claim, null, 'a loop opens Can’t');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual(await board(p.id), {loops: [], claim: [0, 2, 4]}, 'Undo takes back the loop and keeps the refusal');
  await tap(card('C')); await tap(card('D')); await tap(label(4));
  await tap(press('Can’t')); await tap(clue(0)); await tap(clue(1)); await tap(clue(3)); await done();
  await shot('cant-solved'); checks.push('chain of twos: not three cards, refused claim, Undo keeps it, certificate');

  // Every repair: changes, a repair found, That's all too early, then all three.
  p = byId('loops-10');
  await open(p.id); await fit('repair, fresh');
  await tap(clue(1)); await focusOk('a clue changed');
  assert.deepEqual((await board(p.id)).change, [1, 4]);
  assert.equal(await page.locator('.lp-clue.changed').count(), 1);
  for (let i = 0; i < 10 && !(await board(p.id)).found.length; i++) await step(p, `repair first ${i}`);
  assert.deepEqual((await board(p.id)).found, [[0, 4]]);
  assert.equal(await page.locator('.lp-found .lp-clue').count(), 1, 'the change goes on the shelf');
  await tap(press('That’s all'));
  assert.match(await told(), /^There is another\.$/);
  assert.equal(await press('That’s all').isDisabled(), true);
  await shot('repair-more'); await fit('repair, more');
  await finish(p, 'repair');
  assert.equal(await page.locator('.lp-found .lp-clue').count(), 3);
  await shot('repair-solved'); checks.push('every repair: change cycles, shelf, That’s all too early, three repairs');

  // Pin the ten-clue world: full pips with another world; a clue taken away; the solve.
  p = byId('loops-11');
  await open(p.id); await fit('pin, fresh');
  for (const [u, v] of [['A', 'B'], ['D', 'E'], ['A', 'C'], ['B', 'C']]) { await tap(card(u)); await tap(card(v)); }
  assert.equal(await page.locator('.lp-pips i.on').count(), 4);
  assert.match(await told(), /^This world fits too\.$/);
  assert.equal(await page.locator('.lp-world.mini').count(), 1);
  await shot('pin-other'); await fit('pin, other world');
  await tap(card('A')); await tap(card('D'));
  assert.match(await told(), /^Take a clue away first\.$/);
  await tap(page.locator('[data-mechanic-wire] [data-focus="lp-clue-BC"]')); await focusOk('a clue taken away');
  assert.equal((await board(p.id)).asked.length, 3);
  await tap(card('C')); await tap(card('E')); await done();
  await shot('pin-solved'); checks.push('pin: full pips draw another world, a full tap told, a clue dropped, solve');
  p = byId('loops-13');
  await open(p.id); await finish(p, 'two triples'); checks.push('two triples: five clues by hints');

  // The number cards.
  p = byId('loops-num-01');
  await open(p.id); await fit('numbers, fresh'); await shot('numbers-fresh');
  await finish(p, 'number cards'); await shot('numbers-solved'); await fit('numbers, solved');
  p = byId('loops-num-02');
  await open(p.id); await shot('numbers-pin'); await finish(p, 'pin the number world');
  checks.push('number cards: seven clues made, seven clues pin');

  // The playground: a loop, two cards and their distance; a card by keyboard.
  p = byId('loops-playground');
  await open(p.id); await fit('playground');
  await tap(card('A')); await tap(card('B')); await tap(label(2));
  await tap(card('A')); await tap(card('C'));
  assert.match(await page.locator('.lp-clues').innerText(), /8/);
  await tap(card('A')); await tap(card('C'));
  assert.equal(await page.locator('.lp-clues').count(), 0, 'no distance with the cards let go');
  await tap(card('A')); await tap(card('B')); await tap(card('C')); await tap(label(4));
  await tap(card('A')); await tap(card('C'));
  assert.match(await page.locator('.lp-clues').innerText(), /4/, 'the distance follows the loops');
  await shot('playground'); await fit('playground, loops');
  await tap(card('A')); await tap(card('C'));
  await card('D').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.lp-card.picked').count(), 1, 'Enter chooses a card');
  await focusOk('a card by keyboard');
  checks.push('playground: loops and distances, Enter on a card');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, checks, errors}, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
