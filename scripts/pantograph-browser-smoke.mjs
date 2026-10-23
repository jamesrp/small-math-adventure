// Plays Drawing machines through the real interface: the satchel; How to
// play; a knob drag that draws, taken back with Undo, and a tap that lifts the
// knob; dots solved by drags and taps; a stray line on the house, its quiet
// hint and the Undo it offers; the box with a refused That's all kept through
// Undo; a pin dragged and a shape traced; the green shape dragged; both pins
// of two machines; arrow keys on the knob and on a pin; the playground's ×2/×½
// and Clear; no page overflow and no errors. Every puzzle is played to the end
// by the app's own hints, made as drags and taps. Same environment variables
// as the other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE,
// TEST_URL; TEST_PHONE=1 for a phone with touch, TEST_TABLET=1 for a tablet
// with touch). Screenshots go in test-results/pantograph/.
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {pantographMechanics, LIFT} from '../dist/families/pantograph/pantograph.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1', tablet = process.env.TEST_TABLET === '1', touch = phone || tablet;
const size = phone ? 'phone' : tablet ? 'tablet' : 'desktop';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 667} : tablet ? {width: 768, height: 1024} : {width: 1024, height: 768}, hasTouch: touch});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const pack = JSON.parse(await readFile(new URL('../dist/families/pantograph/pantograph.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const mech = pantographMechanics.pantograph;
const out = new URL('../test-results/pantograph/', import.meta.url);
const shot = name => page.screenshot({path: new URL(`${name}-${size}.png`, out).pathname, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] [data-mechanic-wire]`).waitFor(); await page.locator('.pg-board').scrollIntoViewIfNeeded(); };
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
  const b = await page.locator('.pg-board').boundingBox(), w = await page.evaluate(() => innerWidth);
  assert.ok(b.x >= 0 && b.x + b.width <= w + 1, `${label}: the sheet fits across`);
};
const press = name => page.getByRole('button', {name, exact: true});
const settle = () => page.waitForTimeout(touch ? 120 : 30);
// A lattice dot's place on the screen.
const at = ([x, y]) => page.evaluate(([x, y]) => {
  const svg = document.querySelector('.pg-board'), m = svg.getScreenCTM(), p = svg.createSVGPoint();
  p.x = x * 10; p.y = (Number(svg.dataset.h) - y) * 10;
  const r = p.matrixTransform(m);
  return [r.x, r.y];
}, [x, y]);
const centre = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
async function tapAt([x, y]) { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await settle(); }
// A drag from one place to another. On a touch screen the dragged thing rides
// LIFT px above the finger, so the finger stops LIFT px below the target.
let cdp = null;
async function drag(from, to) {
  const target = touch ? [to[0], to[1] + LIFT] : to;
  if (!touch) {
    await page.mouse.move(...from); await page.mouse.down();
    await page.mouse.move(...target, {steps: 12});
    await page.mouse.up(); await settle();
    return;
  }
  cdp ||= await context.newCDPSession(page);
  const t = (type, [x, y]) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
  await t('touchStart', from);
  for (let s = 1; s <= 12; s++) await t('touchMove', [from[0] + (target[0] - from[0]) * s / 12, from[1] + (target[1] - from[1]) * s / 12]);
  await t('touchEnd', target); await settle();
}
const knob = () => centre(page.locator('.pg-machine .pg-knob-disc'));
const pin = k => centre(page.locator(`.pg-machine .pg-pin.m${k} .pg-pin-head`));
async function stencilGrip(p) {
  // The middle of the green shape, where the knob is not.
  const q = p.parameters, b = await board(p.id), shift = (b?.log || []).filter(m => m.type === 'stencil').at(-1)?.to || [0, 0];
  const c = q.stencil.reduce((s, [x, y]) => [s[0] + x / q.stencil.length, s[1] + y / q.stencil.length], [0, 0]);
  return [c[0] + shift[0], c[1] + shift[1]];
}
// One step of the app's own hint, made by a drag, a tap or a press.
async function step(p, label) {
  const b = await board(p.id) || mech.fresh?.(p) || {log: []};
  const h = mech.hint(p, b);
  if (h.type !== 'move') return h;
  const a = h.action;
  await page.locator('.pg-board').scrollIntoViewIfNeeded();
  if (a.type === 'hop') await tapAt(await at(a.to));
  else if (a.type === 'draw') await drag(await knob(), await at(a.to));
  else if (a.type === 'pin') await drag(await pin(a.k), await at(a.to));
  else if (a.type === 'stencil') {
    const g = await stencilGrip(p), shift = (b.log || []).filter(m => m.type === 'stencil').at(-1)?.to || [0, 0];
    await drag(await at(g), await at([g[0] + a.to[0] - shift[0], g[1] + a.to[1] - shift[1]]));
  } else if (a.type === 'all') await press('That’s all').click();
  const after = await board(p.id);
  assert.notDeepEqual(after, b, `${label}: the ${a.type} gesture made a move (${JSON.stringify(a)})`);
  return h;
}
async function finish(p, label) {
  for (let i = 0; i < 40 && !await page.locator('#completion-heading').count(); i++) { const h = await step(p, `${label} ${i + 1}`); if (h.type !== 'move') break; }
  await done();
}
const checks = [];

try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Machines QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // The satchel: the symbol, the playground and twelve puzzles.
  const family = page.locator('.satchel-family[data-view-key="family-pantograph"]');
  if (!(await family.evaluate(el => el.open))) await family.locator('summary').click();
  assert.equal(await family.locator('.family-ink-symbol').innerText(), '⟋');
  assert.equal(await family.locator('.satchel-playground').count(), 1);
  await family.screenshot({path: new URL(`satchel-${size}.png`, out).pathname});
  checks.push('satchel');

  // Dot to dot: How to play; a drag draws, Undo takes it back; a tap lifts the knob.
  let p = byId('pantograph-01');
  await open(p.id); await fit('dots, fresh');
  await page.locator('[data-action="demo"]').first().click();
  assert.match(await page.locator('dialog').innerText(), /Drag the knob/);
  await press('Done').click();
  await shot('01-fresh');
  await drag(await knob(), await at([3, 1]));
  assert.deepEqual((await board(p.id)).log, [{type: 'draw', to: [3, 1]}], 'a drag draws to the dot it is let go on');
  assert.equal(await page.locator('.pg-sheet:not(.faded) .pg-ink').count(), 1);
  assert.equal(await page.locator('.pg-target-dot.hit').count(), 1, 'the line reached (6, 2)');
  await page.locator('[data-action="undo"]').click();
  assert.deepEqual((await board(p.id)).log, []);
  await tapAt(await at([5, 2]));
  assert.deepEqual((await board(p.id)).log, [{type: 'hop', to: [5, 2]}], 'a tap lifts the knob there');
  assert.equal(await page.locator('.pg-sheet:not(.faded) .pg-ink').count(), 0, 'a lift draws nothing');
  // A drag that would take the pencil off the sheet does nothing.
  await drag(await knob(), await at([10, 2]));
  assert.equal((await board(p.id)).log.length, 1, 'off the sheet: no move');
  assert.equal(await page.getByText('That move is not allowed').count(), 0, 'and no telling-off');
  await finish(p, 'dots'); await shot('01-solved');
  checks.push('dots: drag, Undo, tap, off-sheet drag refused quietly, solved by gestures');

  // Pin in the middle, by hints as gestures.
  p = byId('pantograph-02'); await open(p.id); await shot('02-fresh'); await finish(p, 'pin in the middle'); checks.push('pin in the middle');

  // Big square: arrow keys on the knob.
  p = byId('pantograph-03'); await open(p.id); await shot('03-fresh');
  await page.locator('[data-focus="pg-knob"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.deepEqual((await board(p.id)).log, [{type: 'draw', to: [2, 1]}]);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.focus), 'pg-knob', 'focus stays on the knob');
  await page.keyboard.press('Shift+ArrowUp');
  assert.deepEqual((await board(p.id)).log.at(-1), {type: 'hop', to: [2, 2]});
  await page.locator('[data-action="restart"]').click();
  await finish(p, 'big square'); await shot('03-solved');
  checks.push('big square: arrow keys draw and lift, focus kept');

  // House: a stray line turns red; Hint offers Undo.
  p = byId('pantograph-04'); await open(p.id); await shot('04-fresh');
  await drag(await knob(), await at([3, 2]));
  assert.equal(await page.locator('.pg-ink.off').count(), 1, 'the stray line is red');
  await shot('04-stray'); await fit('house, stray');
  await press('Hint').click(); await press('Hint').click();
  assert.match(await page.locator('.hint-card').innerText(), /The pencil drew off the outline\. Undo\./);
  await page.locator('.hint-card [data-action="rescue"]').click();
  assert.equal(await page.locator('.pg-ink.off').count(), 0);
  await finish(p, 'house'); await shot('04-solved');
  checks.push('house: red stray, quiet hint, Undo from the hint');

  // The box: a refused That's all, kept through Undo.
  p = byId('pantograph-05'); await open(p.id); await shot('05-fresh');
  await tapAt(await at([3, 2]));
  assert.equal(await page.locator('.pg-mark.in').count(), 1);
  await press('That’s all').click();
  assert.equal(await page.locator('.pg-told').innerText(), 'There are more.');
  assert.ok(await press('That’s all').isDisabled(), 'That’s all is off');
  await shot('05-refused');
  await page.locator('[data-action="undo"]').click();
  assert.equal(await page.locator('.pg-told').count(), 1, 'Undo keeps the refusal');
  assert.equal(await page.locator('.pg-mark.in').count(), 0, 'and takes back the dot before it');
  await finish(p, 'box'); await shot('05-solved');
  checks.push('box: marks, refused That’s all through Undo, claimed');

  for (const id of ['pantograph-06', 'pantograph-07']) { p = byId(id); await open(id); await shot(`${id.slice(-2)}-fresh`); await fit(id); await finish(p, id); }
  checks.push('swap the tips, small box');

  // Place the pin: a drag of the pin starts a fresh sheet; arrow keys move it.
  p = byId('pantograph-08'); await open(p.id); await shot('08-fresh');
  await drag(await knob(), await at([4, 3]));
  await drag(await pin(0), await at([1, 5]));
  assert.deepEqual((await board(p.id)).log.at(-1), {type: 'pin', k: 0, to: [1, 5]});
  assert.equal(await page.locator('.pg-sheet.faded').count(), 1, 'the first try fades');
  await page.locator('[data-focus="pg-pin-0"]').focus(); await page.keyboard.press('ArrowLeft');
  assert.deepEqual((await board(p.id)).log.at(-1), {type: 'pin', k: 0, to: [0, 5]});
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.focus), 'pg-pin-0');
  await shot('08-moved');
  await finish(p, 'place the pin'); await shot('08-solved');
  checks.push('place the pin: pin drag, fresh sheet, arrow keys');

  p = byId('pantograph-09'); await open(p.id); await shot('09-fresh'); await finish(p, 'half copy'); checks.push('pin for a half copy');

  // Move the picture: the green shape dragged.
  p = byId('pantograph-10'); await open(p.id); await shot('10-fresh');
  const g = await stencilGrip(p);
  await drag(await at(g), await at([g[0] + 2, g[1] + 1]));
  assert.deepEqual((await board(p.id)).log, [{type: 'stencil', to: [2, 1]}], 'the shape moves by the drag');
  await page.locator('[data-action="undo"]').click();
  await finish(p, 'move the picture'); await shot('10-solved');
  checks.push('move the picture: shape drag, Undo');

  // Two machines.
  for (const id of ['pantograph-11', 'pantograph-12']) { p = byId(id); await open(id); await shot(`${id.slice(-2)}-fresh`); await fit(id); await finish(p, id); await shot(`${id.slice(-2)}-solved`); }
  checks.push('two machines, both pins');

  // The playground.
  p = byId('pantograph-playground'); await open(p.id);
  assert.equal(await press('Hint').count(), 0, 'no Hint in the playground');
  await drag(await knob(), await at([6, 4]));
  await press('×½').click();
  assert.equal(await page.locator('.pg-kind[aria-pressed="true"]').innerText(), '×½');
  await drag(await knob(), await at([8, 6]));
  await drag(await pin(0), await at([3, 6]));
  await drag(await knob(), await at([9, 2]));
  await shot('playground'); await fit('playground');
  assert.equal(await page.locator('.pg-sheet.faded').count(), 2);
  await press('Clear').click();
  assert.deepEqual((await board(p.id)).log, []);
  assert.ok(await press('Clear').isDisabled());
  checks.push('playground: draw, ×½, pin, Clear');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(JSON.stringify({size, checks}, null, 1));
} finally {
  await browser.close();
}
