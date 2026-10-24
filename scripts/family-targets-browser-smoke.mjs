// Tap targets and small text that the October 24 layout audit flagged in
// tank, kits, cardmachines, sumsets, joins, menus, codebooks, secrets,
// matching, rookrace, globe, totals, sorting, friezes, robot and votes, kept
// at their fixed sizes on 375 × 667 and 390 × 844 phones and an 820 × 1180
// tablet. A target's size is what a tap reaches: from its centre the walk
// goes out across and down with elementFromPoint, so a hit area larger than
// the drawing counts and a neighbour drawn on top does not. Boards that
// cannot fit 40 px targets across a phone keep a stated smaller floor.
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const base = process.env.TEST_URL || 'http://127.0.0.1:4187';
const PHONES = ['375x667', '390x844'], ALL = [...PHONES, '820x1180'];
// [puzzle, selector, floor in px, sizes]; kind 'text' checks a rendered font size.
const CASES = [
  ['tank-10', 'button.tank-target', 40, ALL], ['tank-playground', 'button.tank-target', 40, ALL], ['tank-12', 'button.tank-target', 40, ALL], ['tank-10', '.tank-back', 44, ALL],
  ['tank-10', '.tank-art .tank-scale', 12, ALL, 'text'],
  ['kits-playground', '.kit-target', 40, ALL], ['kits-playground', '.kit-pick', 44, ALL],
  ['cardmachines-playground', '[data-chip]', 40, ALL], ['cardmachines-04', '.cm-num', 12, ALL, 'text'],
  ['votes-03', 'button.vt-l', 40, ALL], ['votes-14', 'button.vt-voter', 12, ALL, 'text'], ['votes-03', '.vt-who', 12, ALL, 'text'],
  ['totals-playground', '.rt-slot', 40, ALL], ['totals-playground', '.rt-hs', 12, ALL, 'text'],
  ['matching-playground', 'button.sm-cell', 40, ALL], ['matching-playground', '.sm-mini text', 12, ALL, 'text'],
  ['rookrace-03', '.rr-cell', 40, ALL], ['everystart-04', '.rr-cell', 40, ALL], ['everystart-01', '.rr-cell', 40, ALL], ['everystart-05', '.es-slot', 40, ALL],
  ['sumsets-06', '.ss-num', 12, ALL, 'text'],
  ['joins-playground', 'button.jn-strip', 40, ALL], ['joins-11', 'button.jn-strip', 40, ALL],
  ['codebooks-12', 'button.cb-lantern', 40, ALL], ['codebooks-07', 'button.cb-lantern', 40, ALL],
  ['secrets-13', 'button.sx-lantern', 40, ALL], ['secrets-12', 'button.sx-lantern', 40, ALL],
  ['friezes-04', 'rect.fz-hit:not(.point)', 40, ALL],
  ['globe-03', '.gl-turn', 44, ALL],
  ['robot-05', 'g.mr-step', 40, ALL],
  ['menus-04', 'button.menu-square', 40, ALL], ['menus-13', 'button.menu-square', 40, ALL],
  ['sorting-07', '.sort-peg', 40, ALL], ['sorting-07', 'button.sort-card', 40, ALL],
  // Too many targets in a row for 40 px on a phone; the floors say what fits.
  ['votes-14', 'button.vt-voter', 29, PHONES], ['sumsets-06', '.ss-card', 30, PHONES], ['menus-17', 'button.menu-square', 30, PHONES],
  ['menus-17', 'button.menu-square', 40, ['820x1180']], ['everystart-06', '.rr-cell', 28, PHONES], ['everystart-06', '.rr-cell', 40, ['820x1180']],
  ['friezes-playground', 'rect.fz-hit:not(.point)', 35, PHONES]
];
function measure([selector, kind]) {
  const els = [...document.querySelectorAll(selector)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
  if (kind === 'text') return els.map(e => { const px = parseFloat(getComputedStyle(e).fontSize); const m = e.getScreenCTM?.(); return px * (m ? Math.hypot(m.a, m.b) : 1); });
  const inside = (e, x, y) => { const hit = document.elementFromPoint(x, y); return hit && (hit === e || e.contains(hit)); };
  return els.map(e => {
    e.scrollIntoView({block: 'center'});
    const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (!inside(e, cx, cy)) return 0;
    const reach = (dx, dy) => { let n = 0; while (n < 120 && inside(e, cx + dx * (n + 1), cy + dy * (n + 1))) n++; return n; };
    return Math.min(reach(-1, 0) + reach(1, 0) + 1, reach(0, -1) + reach(0, 1) + 1);
  });
}
const failures = [];
let checked = 0;
try {
  for (const size of ALL) {
    const [width, height] = size.split('x').map(Number);
    const context = await browser.newContext({viewport: {width, height}, hasTouch: true});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.locator('#nickname').fill('Targets');
    await page.locator('#profile-form button[type=submit]').click();
    await page.locator('#main').waitFor();
    for (const id of [...new Set(CASES.filter(c => c[3].includes(size)).map(c => c[0]))]) {
      await page.goto(`${base}/#play/${id}`);
      await page.locator(`[data-puzzle-id="${id}"] .board-panel`).waitFor();
      await page.evaluate(async () => { await document.fonts?.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
      await page.waitForTimeout(400);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) failures.push(`${id} at ${size}: the page is wider than the screen`);
      for (const [, selector, floor, , kind] of CASES.filter(c => c[0] === id && c[3].includes(size))) {
        const sizes = await page.evaluate(measure, [selector, kind]);
        if (!sizes.length) { failures.push(`${id} at ${size}: no ${selector}`); continue; }
        const least = Math.min(...sizes);
        if (least < floor - 0.05) failures.push(`${id} at ${size}: ${selector} ${least.toFixed(1)} px, under ${floor}`);
        checked++;
      }
    }
    if (errors.length) failures.push(`${size}: page errors ${errors.join('; ')}`);
    await context.close();
  }
  assert.deepEqual(failures, []);
  console.log(`Passed ${checked} target and text checks across ${new Set(CASES.map(c => c[0])).size} puzzles at ${ALL.join(', ')}.`);
} finally { await browser.close(); }
