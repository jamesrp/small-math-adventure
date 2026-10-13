// Plays Circle strings through the real interface: strings laid by tapping two
// dots (and by Enter on focused dots), taps between close dots, a crossing
// refused and drawn, a string cut, Can't refused on a board that can be
// finished; Can't let go by a miss, a wrong part refused and kept through
// Undo, then the trapped part tapped, shaded and outlined; the child's own
// trap refused; taps on and around the left-over dot the hint rings; a whole puzzle by
// keyboard; collecting every pairing with Found already, There is another and
// That's all; neighbours refused, a string tapped near another for Can't; a
// path decoded; a tree grown and pruned; strings for a tree; swaps by corner,
// one taken back, the certificate after the solve; hints applied to the end;
// focus after each move; the playground. Same environment variables as the
// other browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL,
// TEST_PHONE=1 for a 375-pixel phone with touch). Screenshots go in
// test-results/strings/, or SHOTS if set.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {dotAt} from '../dist/families/strings/strings.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const phone = process.env.TEST_PHONE === '1';
const context = await browser.newContext({viewport: phone ? {width: 375, height: 812} : {width: 1280, height: 860}, hasTouch: phone});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, ''), key = 'small-math-adventure:saves:v1';
const out = process.env.SHOTS ? `${process.env.SHOTS.replace(/\/$/, '')}/` : new URL('../test-results/strings/', import.meta.url).pathname;
const shot = name => page.screenshot({path: `${out}${name}${phone ? '-375' : '-desktop'}.png`, fullPage: true});
const board = id => page.evaluate(([k, id]) => JSON.parse(localStorage.getItem(k)).profiles[0].attempts[id]?.board, [key, id]);
const open = async id => {
  await page.goto(`${base}/#play/${id}`); await page.locator('[data-mechanic-wire="strings"]').waitFor();
  const labels = page.locator('[data-mechanic-wire="strings"] .st-dot text');
  if (await labels.count()) assert.equal(await labels.first().evaluate(e => getComputedStyle(e).stroke), 'none', 'dot numerals do not inherit another family’s stroke');
};
const done = () => page.locator('#completion-heading').waitFor({timeout: 5000});
const fit = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: no page overflow`);
const told = text => page.locator('.st-told', {hasText: text}).waitFor({timeout: 5000});
const button = name => page.getByRole('button', {name, exact: true});
const tapAt = async ([x, y]) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
// A point of the circle's drawing (viewBox units) on the screen.
const screen = ([x, y], sel = '.st-circle:not(.st-mini)') => page.evaluate(([x, y, sel]) => { const svg = document.querySelector(sel), p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()); return [p.x, p.y]; }, [x, y, sel]);
const dotPoint = (n, d) => screen(dotAt(n, d));
const tapDot = async (n, d) => tapAt(await dotPoint(n, d));
const join = async (n, ...pairs) => { for (const [a, b] of pairs) { await tapDot(n, a); await tapDot(n, b); } };
// A point inside a part of the circle: the mean of points round its edge (the
// parts are convex).
const regionPoint = gap => page.evaluate(g => {
  const el = document.querySelector(`.st-region[data-gap="${g}"]`), L = el.getTotalLength();
  let x = 0, y = 0;
  for (let i = 0; i < 60; i++) { const p = el.getPointAtLength(L * i / 60); x += p.x; y += p.y; }
  const p = new DOMPoint(x / 60, y / 60).matrixTransform(el.getScreenCTM());
  return [p.x, p.y];
}, gap);
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const focused = () => page.evaluate(() => { const el = document.activeElement; return {focus: el?.dataset?.focus || '', text: el?.textContent?.trim() || '', inPuzzle: Boolean(el?.closest?.('.st-puzzle')), tag: el?.tagName}; });
// After a move, keyboard focus is on the board or a move control, never on Can't or That's all.
const focusSafe = async label => { const f = await focused(); assert.ok(!/^st-(cant|all)$/.test(f.focus) && !['Can’t', 'That’s all'].includes(f.text), `${label}: focus is not on Can’t or That’s all (${JSON.stringify(f)})`); };
const hintToEnd = async (id, limit = 40) => {
  for (let k = 0; k < limit && !(await page.locator('#completion-heading').count()); k++) {
    while (!(await button('Apply hint').count())) await button('Hint').click();
    await button('Apply hint').click();
  }
  await done();
};
try {
  await mkdir(out, {recursive: true});
  await page.goto(base); await page.locator('#nickname').fill('Strings QA'); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click(); await page.locator('.caravan-library').waitFor();

  // Puzzle 2: taps, a tap between close dots, a crossing refused, a cut, a solve.
  const P2 = 'strings-02';
  await open(P2); await fit('finish');
  await shot('02-fresh');
  // Between dots 5 and 6, nearer 5: picks 5.
  await tapAt(await screen(lerp(dotAt(8, 5), dotAt(8, 6), 0.42)));
  assert.equal(await page.locator('.st-dot.picked[data-dot="5"]').count(), 1, 'a tap between two dots picks the nearer');
  await tapAt(await screen(lerp(dotAt(8, 5), dotAt(8, 6), 0.58)));
  assert.deepEqual((await board(P2)).strings, [[5, 6]], 'then the other joins them');
  await join(8, [2, 7]);
  assert.deepEqual((await board(P2)).strings, [[5, 6]], 'a crossing is not laid');
  assert.equal(await page.locator('.st-tried').count(), 1, 'the crossing try is drawn');
  assert.equal(await page.locator('.st-blocker').count(), 1, 'and the dark string it crosses');
  await shot('02-crossing');
  await tapDot(8, 6);
  assert.deepEqual((await board(P2)).strings, [], 'a tap on a strung dot takes the string off');
  // Can't on a board that can be finished: one claim, and the refusal says
  // what is true of the part tapped, as on any board. It stays through Undo.
  await join(8, [2, 3]);
  await button('Can’t').click();
  const outside = await page.evaluate(() => [...document.querySelectorAll('.st-region')].find(r => /dots 5, 6, 7 and 8/.test(r.getAttribute('aria-label'))).dataset.gap);
  await tapAt(await regionPoint(outside));
  await told('Nothing is trapped there.');
  assert.equal(await page.getByText('There is a way').count(), 0, 'nothing tells that the board can be finished');
  assert.equal(await button('Can’t').isDisabled(), true, 'one claim on these strings');
  await button('↶ Undo').click();
  await told('Nothing is trapped there.');
  assert.equal(await button('Can’t').isDisabled(), true, 'Undo keeps the refusal');
  await join(8, [5, 8], [6, 7]);
  await done();
  await shot('02-solved');

  // Puzzle 3: Can't waits for an attempt; a wrong part refused and kept
  // through Undo; then the trapped part.
  const P3 = 'strings-03';
  await open(P3); await fit('seven');
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for an attempt');
  await join(7, [2, 3]);
  await button('Can’t').click();
  assert.equal(await page.locator('.st-circle.mode-regions').count(), 1, 'Can’t makes the parts buttons');
  assert.equal((await focused()).focus, 'st-board', 'focus goes to the board, not to a part');
  assert.equal(await page.locator('.st-region.hinted').count(), 0, 'no part is marked');
  await shot('03-cant');
  // A tap that misses every part lets go of Can't.
  await tapAt(await screen([2, 2]));
  assert.equal(await page.locator('.st-circle.mode-dots').count(), 1, 'a miss lets go of Can’t');
  assert.equal(await button('Can’t').getAttribute('aria-pressed'), 'false');
  assert.equal((await board(P3)).refused, null, 'and claims nothing');
  await button('Can’t').click();
  await tapAt(await regionPoint(2));
  assert.equal((await board(P3)).refused, 2, 'the empty part between 2 and 3 is refused');
  await told('Nothing is trapped there.');
  assert.equal(await button('Can’t').isDisabled(), true, 'one claim per attempt');
  await shot('03-refused');
  await button('↶ Undo').click();
  assert.equal(await button('Can’t').isDisabled(), true, 'Undo keeps the refusal');
  assert.deepEqual((await board(P3)).strings, [[2, 3]]);
  await join(7, [4, 6]);
  await button('Can’t').click();
  await tapAt(await regionPoint(4));
  await done();
  assert.equal(await page.locator('.st-trap').count(), 1, 'the trapped part is shaded');
  assert.equal(await page.locator('.st-here').count(), 1, 'the part tapped is outlined');
  assert.equal(await page.locator('.st-dot.ringed').count(), 1, 'and its left-over dot ringed');
  await shot('03-solved');

  // Puzzle 5 by taps: a dot shut in by the child's own string is refused;
  // then taps on the left-over dot the hint rings (its centre, outside it,
  // inside it) each claim its part, never letting go of Can't.
  const P5 = 'strings-05';
  await open(P5); await fit('two dark strings');
  await join(10, [2, 4]);
  await button('Can’t').click();
  await tapDot(10, 3);
  assert.equal((await board(P5)).refused, 2, 'a tap on dot 3 claims its part');
  await told('Your own strings trap it.');
  await shot('05-own');
  for (const k of [1, 1.12, 1.24, 0.9]) {
    // Start again: Replay after a solve, Restart after the refusal.
    if (await page.locator('#completion-heading').count()) await page.locator('[data-action=replay]').click();
    else await page.locator('[data-action=restart]').click();
    await page.locator('.st-circle.mode-dots').waitFor();
    assert.deepEqual((await board(P5)).strings, []);
    await join(10, [2, 3]);
    while (!(await button('Can’t').evaluate(b => b.classList.contains('hinted')))) await button('Hint').click();
    await button('Can’t').click();
    const ringed = Number(await page.locator('.st-dot.hinted text').textContent());
    assert.ok([8, 10].includes(ringed), `the hint rings a left-over dot (${ringed})`);
    if (k === 1) await shot('05-ringed');
    await tapAt(await screen(dotAt(10, ringed).map(v => 50 + (v - 50) * k)));
    await done();
    assert.equal(await page.locator('.st-dot.ringed').count(), 1, `a tap at ${k} of the radius on dot ${ringed} claims its part`);
  }
  await shot('05-solved');
  await page.locator('[data-action=replay]').click();

  // Puzzle 5 by keyboard: Enter on dots, arrow keys, Can't, Enter on a part.
  await page.locator('.st-circle.mode-dots').waitFor();
  await page.locator('.st-dot[data-dot="2"]').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  assert.equal((await focused()).focus, 'st-dot-3', 'arrow keys walk round the dots');
  await page.keyboard.press('Enter');
  assert.deepEqual((await board(P5)).strings, [[2, 3]], 'Enter on two dots joins them');
  await focusSafe('after a keyboard string');
  assert.equal((await focused()).focus, 'st-dot-3', 'focus stays on the dot');
  await button('Can’t').focus(); await page.keyboard.press('Enter');
  assert.equal((await focused()).focus, 'st-board');
  await page.keyboard.press('Tab');
  assert.match((await focused()).focus, /^st-region-/, 'Tab reaches the parts');
  // The part between 2 and 3 holds no free dot.
  const gapOf = await page.evaluate(() => [...document.querySelectorAll('.st-region')].map(r => [r.dataset.gap, r.getAttribute('aria-label')]));
  const empty = gapOf.find(([, label]) => /no free dots/.test(label))[0];
  await page.locator(`.st-region[data-gap="${empty}"]`).focus(); await page.keyboard.press('Enter');
  assert.equal((await board(P5)).refused, Number(empty), 'a part with no free dot is refused');
  await focusSafe('after a refused Can’t');
  assert.ok((await focused()).inPuzzle, 'focus is on the board');
  await page.keyboard.press('Escape');
  await page.locator('.st-dot[data-dot="2"]').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P5)).strings, [], 'Enter on a strung dot takes its string off');
  await page.locator('.st-dot[data-dot="4"]').focus(); await page.keyboard.press('Enter');
  await page.locator('.st-dot[data-dot="5"]').focus(); await page.keyboard.press('Enter');
  await button('Can’t').focus(); await page.keyboard.press('Enter');
  const eight = (await page.evaluate(() => [...document.querySelectorAll('.st-region')].map(r => [r.dataset.gap, r.getAttribute('aria-label')]))).find(([, label]) => /dot 8\b/.test(label))[0];
  await page.locator(`.st-region[data-gap="${eight}"]`).focus(); await page.keyboard.press('Enter');
  await done();

  // Puzzle 1: every pairing of six, Found already, There is another, That's all.
  const P1 = 'strings-01';
  await open(P1); await fit('every');
  await join(6, [1, 2], [3, 4], [5, 6]);
  assert.deepEqual((await board(P1)).found, ['1-2 3-4 5-6'], 'a pairing goes on the shelf');
  await button('That’s all').click();
  await told('There is another.');
  assert.equal(await button('That’s all').isDisabled(), true, 'That’s all waits for a new pairing');
  await focusSafe('after a wrong That’s all');
  await tapDot(6, 1); await join(6, [1, 2]);
  await told('Found already.');
  assert.equal(await page.locator('.st-shelf li.again').count(), 1, 'the shelf shows which');
  for (const pairing of [[[1, 2], [3, 6], [4, 5]], [[1, 4], [2, 3], [5, 6]], [[1, 6], [2, 3], [4, 5]], [[1, 6], [2, 5], [3, 4]]]) {
    for (const s of (await board(P1)).strings) await tapDot(6, s[0]);
    await join(6, ...pairing);
  }
  assert.equal((await board(P1)).found.length, 5);
  assert.equal(await page.locator('#completion-heading').count(), 0, 'not solved before That’s all');
  await shot('01-shelf');
  await button('That’s all').click();
  await done();

  // Puzzle 7: neighbours refused; Can't waits for two strings; a string with
  // room beside it refused; a string leaving one dot refused; then a string
  // with two neighbours beside it, tapped near another.
  const P7 = 'strings-07';
  await open(P7); await fit('neighbours');
  await join(10, [4, 5]);
  await told('Those two are neighbours.');
  assert.deepEqual((await board(P7)).strings, []);
  await join(10, [1, 6]);
  assert.equal(await button('Can’t').isDisabled(), true, 'Can’t waits for two strings');
  await join(10, [7, 9]);
  await button('Can’t').click();
  assert.equal(await page.locator('.st-circle.mode-strings').count(), 1);
  assert.equal((await focused()).focus, 'st-board', 'focus on the board, not a string');
  await tapAt(await screen(lerp(dotAt(10, 1), dotAt(10, 6), 0.5)));
  await told('A string can still go beside it.');
  await join(10, [2, 4]);
  await button('Can’t').click();
  await tapAt(await screen(lerp(dotAt(10, 2), dotAt(10, 4), 0.5)));
  await told('This string leaves dot 3 on its own.');
  await tapDot(10, 2);
  await join(10, [2, 5]);
  await button('Can’t').click();
  // Between 1–6 and 2–5, nearer 2–5.
  const mid25 = lerp(dotAt(10, 2), dotAt(10, 5), 0.5), mid16 = lerp(dotAt(10, 1), dotAt(10, 6), 0.5);
  await tapAt(await screen(lerp(mid16, mid25, 0.75)));
  await done();
  assert.deepEqual((await board(P7)).claimed, [2, 5], 'the nearer string was tapped');
  assert.equal(await page.locator('.st-ghost').count(), 1, 'the forced neighbour string is drawn');
  await shot('07-solved');

  // Puzzle 4: a path decoded, a wrong step marked.
  const P4 = 'strings-04';
  await open(P4); await fit('decode');
  await join(6, [1, 2]);
  assert.ok(await page.locator('.st-step.off').count() >= 1, 'a step that goes the other way is marked');
  await shot('04-wrong');
  await tapDot(6, 1);
  await join(6, [1, 6], [2, 3], [4, 5]);
  await done();

  // Puzzle 8: a tree grown, an edge taken away, the walk over the path.
  const P8 = 'strings-08';
  await open(P8); await fit('tree');
  const node = pos => page.locator(`.st-tnode[data-focus="st-node-${pos}"]`);
  const tapNode = async pos => { const b = await node(pos).boundingBox(); await tapAt([b.x + b.width / 2, b.y + b.height / 2]); };
  await tapNode('root');
  await tapNode('0');
  await tapNode('0-0');
  assert.deepEqual((await board(P8)).parents, [0, 1, 2]);
  await shot('08-deep');
  // A tap on the middle of an edge takes it away.
  const mid = await page.locator('.st-tedge[data-focus="st-edge-0-0-0"] .st-tline').boundingBox();
  await tapAt([mid.x + mid.width / 2, mid.y + mid.height / 2]);
  assert.deepEqual((await board(P8)).parents, [0, 1], 'a tap on an edge takes it away');
  await focusSafe('after a prune');
  await tapNode('0-0');
  const edge = page.locator('.st-tedge[data-focus="st-edge-0-0-0"]');
  await edge.focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P8)).parents, [0, 1], 'and Enter on a focused edge');
  await node('0').focus(); await page.keyboard.press('Enter');
  assert.deepEqual((await board(P8)).parents, [0, 1, 1], 'Enter on a focused dot grows it');
  await tapNode('0');
  await done();
  await shot('08-solved');

  // Puzzle 11: strings for a tree, = when they match.
  const P11 = 'strings-11';
  await open(P11); await fit('treepair');
  await join(10, [1, 6], [2, 3], [4, 5]);
  assert.equal(await page.locator('.st-vs').textContent(), '≠');
  await shot('11-partial');
  await join(10, [7, 10], [8, 9]);
  await done();

  // Puzzle 9: swaps by corner, one taken back, the long way is not a solve,
  // hints to the end, the certificate after.
  const P9 = 'strings-09';
  await open(P9); await fit('swaps');
  const corner = at => page.locator(`.st-corner[data-corner="${at}"]`);
  const tapCorner = async at => { const b = await corner(at).boundingBox(); await tapAt([b.x + b.width / 2, b.y + b.height / 2]); };
  assert.equal(await corner(1).count(), 0, 'a peak at height 1 is no corner');
  await tapCorner(2);
  assert.deepEqual((await board(P9)).route, [2]);
  await tapCorner(2);
  assert.deepEqual((await board(P9)).route, [], 'the same corner takes the swap back');
  for (const at of [2, 4, 2, 6, 2, 3, 5, 4]) await tapCorner(at);
  await told('Fewer swaps can do it.');
  assert.equal(await page.locator('#completion-heading').count(), 0, 'the long way is not a solve');
  await shot('09-long');
  await hintToEnd(P9);
  assert.equal(await page.locator('.st-sum').textContent(), '3 + 2 + 1 + 0 = 6', 'the D-before-U count after the solve');
  assert.equal(await page.locator('.st-diamond').count(), 6, 'six diamonds, one per swap');
  await shot('09-solved');

  // Puzzle 12: hints from fresh to the end.
  await open('strings-12'); await fit('move the mountain');
  await hintToEnd('strings-12');
  await shot('12-solved');
  // Puzzle 10 and 6: hints from fresh to the end (every pairing, That's all).
  await open('strings-06'); await fit('every way to finish');
  await hintToEnd('strings-06');
  await open('strings-10'); await fit('eight dots');
  await join(8, [1, 2], [3, 4], [5, 6], [7, 8]);
  await shot('10-first');
  await hintToEnd('strings-10', 80);
  await shot('10-solved');

  // The playground: more and fewer dots, Clear, the path and the tree.
  const G = 'strings-playground';
  await open(G); await fit('playground');
  assert.equal(await button('Hint').count(), 0, 'no Hint');
  await join(6, [1, 4], [2, 3], [5, 6]);
  assert.match(await page.locator('.st-path').getAttribute('aria-label'), /Path U U D D U D/);
  await button('More dots').click();
  assert.equal((await board(G)).n, 7);
  await focusSafe('after More dots');
  for (let k = 0; k < 5; k++) await button('More dots').click();
  assert.equal(await button('More dots').isDisabled(), true, 'twelve at most');
  await fit('playground at twelve');
  await shot('playground-12');
  await button('Clear').click();
  assert.deepEqual((await board(G)).strings, []);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed: true, phone, errors}));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser.close(); }
