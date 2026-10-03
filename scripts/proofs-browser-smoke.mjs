// Plays every proof puzzle through the real interface: drag and tap dominoes,
// star and paint proofs, fast strokes, cancelled drags, the Checker tool,
// keyboard activation, the flip map, one-check rounds, hints that give nothing
// away, focus after round actions, and the choose-who-starts duel. Same environment variables
// as the other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a phone viewport). Screenshots go in test-results/proofs/.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { classifyBoard, tripPossible } from '../dist/proofs.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1180, height: 820 }, hasTouch: phone });
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = process.env.TEST_URL || 'http://127.0.0.1:4187', key = 'small-math-adventure:saves:v1';
const { puzzles } = JSON.parse(await readFile(new URL('../dist/proofs.json', import.meta.url), 'utf8'));
const out = new URL('../test-results/proofs/', import.meta.url);
const shot = name => page.screenshot({ path: new URL(`${name}${phone ? '-phone' : ''}.png`, out).pathname, fullPage: true });
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator('.proof-puzzle').waitFor(); };
const done = () => page.locator('#completion-heading').waitFor({ timeout: 5000 });
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const center = async selector => { const b = await page.locator(selector).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
async function drag(from, to) {
  const [x1, y1] = await center(`.pg-cell[data-cell="${from}"]`), [x2, y2] = await center(`.pg-cell[data-cell="${to}"]`);
  await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: 6 }); await page.mouse.up();
}
const tool = name => page.locator('.proof-toolbox button', { hasText: name }).first().click();
const checks = [];
try {
  await mkdir(out, { recursive: true });
  await page.goto(base); await page.locator('#nickname').fill('Proof QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();
  const tileFamily = page.locator('.satchel-family[data-view-key="family-tile"]');
  await tileFamily.locator('summary').click();
  assert.equal(await tileFamily.locator('.library-band h2').first().textContent(), 'Proofs');
  assert.equal(await tileFamily.locator('.library-proofs [data-action=open-puzzle]').count(), puzzles.filter(p => p.libraryFamily === 'tile').length);
  await fit('library'); await shot('library');
  await tileFamily.locator('[data-id="proof-garden-01"]').click(); await page.locator('.proof-garden').waitFor();
  checks.push('Proofs group first in the Tile gardens satchel');

  // 1: one star with no partner. The Undo button works for gardens.
  await page.getByRole('button', { name: /Prove it can’t/ }).click();
  await page.locator('.pg-cell[data-cell="0"]').click(); await done(); await shot('garden-01-proved');
  checks.push('star proof by tap');

  // 2: keyboard stars keep focus on the cell.
  await open('proof-garden-02');
  await page.getByRole('button', { name: /Prove it can’t/ }).click();
  await page.locator('.pg-cell[data-cell="0"]').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'pg-cell-0', 'focus stays on the starred cell');
  assert.deepEqual((await board('proof-garden-02')).stars, [0]);
  await page.locator('.pg-cell[data-cell="8"]').focus(); await page.keyboard.press(' ');
  await done(); checks.push('star proof by keyboard');

  // 3: paint gold by a drag stroke and taps, then Fill blanks with green.
  await open('proof-garden-03');
  await page.getByRole('button', { name: /Prove it can’t/ }).click();
  await tool('Paint');
  const gold = [1, 3, 4, 6, 9, 11, 12, 14];
  await drag(1, 6); // a diagonal stroke paints only the two diagonal squares
  assert.deepEqual((await board('proof-garden-03')).paint.flatMap((c, i) => c ? [i] : []), [1, 6], 'diagonal stroke paints squares on the diagonal only');
  // A fast stroke along row 3 (two pointer events) paints every square it crosses.
  {
    const [x1, y1] = await center('.pg-cell[data-cell="8"]'), [x2, y2] = await center('.pg-cell[data-cell="11"]');
    await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: 1 }); await page.mouse.up();
    assert.deepEqual((await board('proof-garden-03')).paint.flatMap((c, i) => c ? [i] : []), [1, 6, 8, 9, 10, 11], 'a fast stroke paints every square it crosses');
    await tool('Erase'); await drag(8, 11); await tool('Paint');
  }
  for (const cell of gold.filter(c => ![1, 6].includes(c))) await page.locator(`.pg-cell[data-cell="${cell}"]`).click();
  await page.locator('.proof-toolbox button').nth(2).click(); // green paint
  await page.getByRole('button', { name: /Fill blanks/ }).click();
  await done(); await shot('garden-03-proved');
  checks.push('paint proof with a stroke, taps and Fill blanks');

  // 4: cover by dragging dominoes. A drag that runs past its second square
  // places nothing, as on Tile Garden boards.
  await open('proof-garden-04');
  {
    const [x1, y1] = await center('.pg-cell[data-cell="9"]'), [x2, y2] = await center('.pg-cell[data-cell="10"]'), [x3, y3] = await center('.pg-cell[data-cell="11"]');
    await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: 4 }); await page.mouse.move(x3, y3, { steps: 4 }); await page.mouse.up();
    assert.deepEqual((await board('proof-garden-04')).doms, [], 'an overlong drag places nothing');
  }
  for (const [a, b] of puzzles.find(p => p.id === 'proof-garden-04').solution) await drag(a, b);
  await done(); checks.push('covering by dragging dominoes');

  // 5: the Checker tool is earned after garden 3.
  await open('proof-garden-05');
  await page.getByRole('button', { name: /Prove it can’t/ }).click();
  await tool('Checker'); await page.locator('.pg-cell[data-cell="1"]').click();
  await done(); await shot('garden-05-checker'); checks.push('Checker tool after the first paint proof');

  // 6: a balanced garden: paint cannot prove it; stars can.
  await open('proof-garden-06');
  await page.getByRole('button', { name: /Prove it can’t/ }).click();
  await tool('Checker'); await page.locator('.pg-cell[data-cell="1"]').click();
  assert.equal(await page.locator('#completion-heading').count(), 0, 'balanced colors do not prove anything');
  await tool('Star'); await page.locator('.pg-cell[data-cell="1"]').click(); await page.locator('.pg-cell[data-cell="6"]').click();
  await done(); await fit('garden 6'); checks.push('stars where paint fails');

  // 7: tap-tap placement of the stored covering.
  await open('proof-garden-07');
  for (const [a, b] of puzzles.find(p => p.id === 'proof-garden-07').solution) { await page.locator(`.pg-cell[data-cell="${a}"]`).click(); await page.locator(`.pg-cell[data-cell="${b}"]`).click(); }
  await done(); checks.push('covering by tapping pairs');

  // Flip map: walk 4, prove 5, numbers, trips.
  await open('proof-flip-01');
  for (const card of [1, 0, 1, 0]) await page.locator(`.flip-card[data-card="${card}"]`).click();
  await done(); checks.push('walk the flip map');
  await open('proof-flip-02');
  for (const card of [1, 0, 1, 0, 1]) await page.locator(`.flip-card[data-card="${card}"]`).click();
  assert.equal(await page.locator('#completion-heading').count(), 0, 'five flips never return to A');
  await page.getByRole('button', { name: /Prove it can’t/ }).click();
  const colors = [1, 2, 1, 1, 2, 1];
  for (const [card, color] of colors.entries()) { await page.locator('.proof-toolbox button').nth(color - 1).click(); await page.locator(`.flip-card[data-card="${card}"]`).click(); }
  await done(); assert.equal(await page.locator('.flip-strip').count(), 1); await fit('flip proof'); await shot('flip-02-proved');
  checks.push('paint proof on the flip map');
  // Numbers: the worksheet question, then a different trip; two right in a row.
  await open('proof-flip-03');
  for (let question = 0; question < 2; question++) {
    const q = await board('proof-flip-03');
    if (question === 0) assert.deepEqual([q.s, q.e], [0, 0]);
    for (let n = 1; n <= 12; n++) if (tripPossible(q.s, q.e, n)) await page.getByRole('button', { name: String(n), exact: true }).click();
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    if (question === 0) {
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus), 'proof-primary', 'focus moves to Next question');
      await page.getByRole('button', { name: 'Next question', exact: true }).click();
      assert.notDeepEqual(await board('proof-flip-03').then(b => [b.s, b.e]), [0, 0]);
    }
  }
  await done(); checks.push('numbers: two different trips, one check each');
  await open('proof-flip-04');
  for (let round = 0; round < 2; round++) {
    if (round) await page.getByRole('button', { name: 'Next cards', exact: true }).click();
    const trips = (await board('proof-flip-04')).cards;
    for (const [i, c] of trips.entries()) await page.getByRole('button', { name: `${tripPossible(c.s, c.e, c.k) ? 'Can be done' : 'Cannot be done'}: card ${i + 1}` }).click();
    assert.equal(await page.locator('button[data-action=undo]').isDisabled(), true, 'no Undo in one-check rounds');
    await page.getByRole('button', { name: 'Check', exact: true }).click();
  }
  await done(); checks.push('trip cards: two clean rounds');

  // Sorting: hints give nudges, never answers; two clean rounds; a wrong round
  // resets the count; focus stays on the round's main button.
  await open('proof-sort-03');
  for (let i = 0; i < 3; i++) await page.locator('[data-action=hint]').click();
  assert.equal(await page.locator('[data-action=apply-hint]').count(), 0, 'no Apply hint on a one-check round');
  assert.equal(await page.locator('.hint-card').textContent(), puzzles.find(p => p.id === 'proof-sort-03').hints[2]);
  let s = await board('proof-sort-03');
  for (const [i, h] of s.boards.entries()) await page.getByRole('button', { name: `${classifyBoard(h).ok ? 'Cannot be covered' : 'Can be covered'}: garden ${i + 1}` }).click();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  assert.equal((await board('proof-sort-03')).clean, 0); await shot('sort-03-reveal'); await fit('sorting reveal');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'New round', 'focus moves to New round');
  for (let round = 0; round < 2; round++) {
    await page.locator('.proof-actions button.primary').click();
    s = await board('proof-sort-03');
    for (const [i, h] of s.boards.entries()) await page.getByRole('button', { name: `${classifyBoard(h).ok ? 'Can be covered' : 'Cannot be covered'}: garden ${i + 1}` }).click();
    await page.getByRole('button', { name: 'Check', exact: true }).click();
  }
  await done(); checks.push('sorting: miss, then two clean rounds');

  // Duel: choose who starts, lift pebbles, Take; three wins from new starts.
  await open('proof-duel-01');
  for (let game = 0; game < 3; game++) {
    let d = await board('proof-duel-01');
    const equal = d.piles[0] === d.piles[1];
    await page.getByRole('button', { name: equal ? 'You first' : 'Me first', exact: true }).click();
    if (game === 0) assert.equal(await page.evaluate(() => document.activeElement?.className), 'duel-status', 'focus moves to the duel status');
    for (let turn = 0; turn < 20; turn++) {
      d = await board('proof-duel-01');
      if (!d.piles.some(Boolean)) break;
      const big = d.piles[0] > d.piles[1] ? 0 : 1, from = d.piles[1 - big];
      const names = ['left', 'right'];
      await page.getByRole('button', { name: `Lift ${d.piles[big] - from} ${d.piles[big] - from === 1 ? 'pebble' : 'pebbles'} from the ${names[big]} pile` }).click();
      if (turn === 0 && game === 0) { await shot('duel-lifted'); await fit('duel'); }
      await page.getByRole('button', { name: `Take ${d.piles[big] - from}`, exact: true }).click();
    }
    if (game < 2) await page.getByRole('button', { name: 'New start', exact: true }).click();
  }
  await done(); checks.push('duel: three wins from new starts');

  // How to play never shows the grown-up notes for a proof puzzle.
  await open('proof-garden-07');
  await page.locator('[data-action=demo]').first().click();
  assert.equal(await page.locator('dialog details summary', { hasText: 'For grown-ups' }).count(), 0, 'no grown-up notes in How to play');
  checks.push('How to play keeps the verdict hidden');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ viewport: phone ? 'phone' : 'tablet', checks, errors }, null, 2));
} finally { await browser.close(); }
