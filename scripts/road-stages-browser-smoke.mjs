// The road's staged boards (the ferry's seats, bell and lamps, the marsh
// boardwalks) and the scene around every road puzzle, on phones and tablets,
// as a child meets each encounter: pieces inside the picture and clear of the
// keeper and Plume's card, 40 px taps (ropes measured along and across), 12 px
// text, a tap on a lamp lighting its ropes without a move, the bell's refusals
// in words, How to play in the stage's own words with Done in reach, the bell's
// chart on a short phone, the board starting on screen on a tablet in
// landscape, keepers' names at 12 px, and the balance's answer rows on phones;
// since the October 24 replay also the crypt door's words and its line after a
// wrong Check in view, an answer beside a tap on a stop further on or on a
// platform no boardwalk reaches, the 44 px Checker switch, and keepers' circles
// in their colour while their pictures load.
// Isolated browser profiles only. Environment: PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_BANDS (e.g. "k1"), TEST_PHONE=1 (the two
// phones only). Screenshots go in test-results/road-stages/.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { MAIN, BAND_KEYS, CAST, startJourney, beginEncounter, recordSolve, campaignId, withCampaignPuzzles } from '../dist/road.js';
import { mechanicFor } from '../dist/expansion.js';
import { freshAttempt, nextHint, move, isSolved } from '../dist/engine.js';
import { emptyStore, SAVE_KEY } from '../dist/storage.js';
import { stageKind, stageHelp } from '../dist/road-stage.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, '');
const pack = JSON.parse(await readFile(new URL('../dist/puzzles.json', import.meta.url), 'utf8'));
const proofs = JSON.parse(await readFile(new URL('../dist/proofs.json', import.meta.url), 'utf8'));
const puzzles = [...pack.puzzles, ...proofs.puzzles], all = withCampaignPuzzles(puzzles);
const bands = (process.env.TEST_BANDS || BAND_KEYS.join(',')).split(',').filter(band => BAND_KEYS.includes(band));
const PHONES = [{ width: 390, height: 844 }, { width: 375, height: 667 }];
const sizes = process.env.TEST_PHONE === '1' ? PHONES : [...PHONES, { width: 820, height: 1180 }, { width: 1180, height: 820 }];
const output = new URL('../test-results/road-stages/', import.meta.url);
await mkdir(output, { recursive: true });
const errors = [], checks = new Set();
// Words of the library boards that a stage dresses differently.
const LIBRARY_WORDS = /\b(cups?|letters?|clocks?|wires?|lanterns?|roads?|dots?)\b/i;

// The save a child has on arriving at each encounter: the trail finished up to the one before.
function arrivals(band) {
  const profile = { id: `stages-${band}`, name: 'Explorer', band, avatar: 0, sound: false, attempts: {} }, saves = {};
  startJourney(profile);
  for (const e of MAIN) {
    saves[e.id] = JSON.stringify({ ...emptyStore(), activeProfileId: profile.id, profiles: [profile] });
    const o = beginEncounter(profile, puzzles);
    assert.equal(o.encounter.id, e.id, `${band}: ${e.id} comes next`);
    let a = freshAttempt(o.puzzle);
    for (let i = 0; i < 500 && !isSolved(o.puzzle, a.board); i++) a = move(o.puzzle, a, mechanicFor(o.puzzle)?.solve ? mechanicFor(o.puzzle).solve(o.puzzle, a.board) : (h => h.action || h.pair)(nextHint(o.puzzle, a)));
    profile.attempts[o.puzzle.id] = { ...a, completed: true }; recordSolve(profile, o.puzzle.id, e.id, puzzles);
  }
  return saves;
}

// In the page: px sizes of what a child taps and reads, and what covers what.
function survey() {
  const box = el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
  const name = el => `${el.getAttribute('class')?.split(' ').slice(0, 2).join('.') || el.localName} ${el.getAttribute('aria-label') || el.dataset.stageLamp || el.textContent.trim().slice(0, 12)}`;
  const shown = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  // A tap stroke's reach in screen px, across it and along it, at its middle.
  function reach(el) {
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const len = el.getTotalLength(), m = el.getScreenCTM(), at = t => { const p = el.getPointAtLength(Math.max(0, Math.min(len, t))); return new DOMPoint(p.x, p.y).matrixTransform(m); };
    const mid = at(len / 2), a = at(len / 2 - 1), b = at(len / 2 + 1), d = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
    const hits = (x, y) => document.elementFromPoint(x, y) === el;
    let across = 0, along = 0;
    for (const s of [1, -1]) { let k = 0; while (k < 120 && hits(mid.x - uy * s * k, mid.y + ux * s * k)) k++; across += k; }
    for (const s of [1, -1]) { let t = len / 2, last = mid; for (let n = 0; n < 2000; n++) { const next = at(t + s); if (!hits(next.x, next.y) || (t + s < 0 || t + s > len)) break; along += Math.hypot(next.x - last.x, next.y - last.y); last = next; t += s; } }
    return { name: name(el), across, along: Math.round(along) };
  }
  const textPx = el => { const m = el.getScreenCTM?.(), size = parseFloat(getComputedStyle(el).fontSize); return m ? size * Math.hypot(m.a, m.b) : size; };
  const stage = document.querySelector('.lr-stage'), art = document.querySelector('.lr-scene-art'), portrait = document.querySelector('.lr-keeper .lr-portrait'), card = document.querySelector('.lr-rival');
  const pieces = stage ? [...stage.querySelectorAll('button.stage-piece, .stage-tag, .stage-wheel, .stage-lamp-hit, .stage-pad text')].filter(shown) : [];
  const covered = [];
  for (const el of pieces) {
    const r = box(el);
    if (portrait) { const p = box(portrait), cx = (p.left + p.right) / 2, cy = (p.top + p.bottom) / 2, round = el.matches('.stage-tag, .stage-lamp-hit');
      const depth = round ? p.width / 2 + r.width / 2 - Math.hypot((r.left + r.right) / 2 - cx, (r.top + r.bottom) / 2 - cy) : p.width / 2 - Math.hypot(Math.max(r.left, Math.min(cx, r.right)) - cx, Math.max(r.top, Math.min(cy, r.bottom)) - cy);
      if (depth > 3) covered.push(`keeper over ${name(el)} by ${Math.round(depth)} px`); }
    if (card) { const c = box(card), ix = Math.min(r.right, c.right) - Math.max(r.left, c.left), iy = Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top);
      if (ix > 2 && iy > 2) covered.push(`Plume's card over ${name(el)} by ${Math.round(ix)}×${Math.round(iy)} px`); }
    const s = box(stage);
    if (r.left < s.left - 1 || r.right > s.right + 1 || r.top < s.top - 1 || r.bottom > s.bottom + 1) covered.push(`${name(el)} cut off by the picture's edge`);
  }
  const targets = [...document.querySelectorAll('.lr-stage button.stage-piece, .board-panel .pair-button, .board-panel .bell-number, .board-panel button[type=submit], .board-panel .bell-count input')].filter(shown).map(el => ({ name: name(el), ...box(el) }));
  const texts = [...document.querySelectorAll('.lr-stage .stage-lamp-label, .lr-stage .clock-position text, .lr-stage .clock-center, .lr-stage .stage-pad-label, .stage-tag b, .stage-goal-label, .lantern text, .lr-speaker')].filter(el => shown(el) && el.textContent.trim()).map(el => ({ name: name(el), px: Math.round(textPx(el) * 10) / 10 }));
  const panel = document.querySelector('.board-panel'), panelBox = panel && box(panel);
  // Each rope is measured in the middle of the screen, then the page goes back to the top.
  const ropes = [...document.querySelectorAll('.stage-rope-hit, .lantern-wires .wire-hit')].filter(shown).map(reach);
  scrollTo(0, 0);
  return { covered, targets, texts, ropes, stage: stage && box(stage), art: art && box(art), card: card && box(card), panel: panelBox, form: document.querySelector('#bell-form')?.getBoundingClientRect().bottom, heading: panel?.querySelector('h1')?.textContent.trim(), label: document.querySelector('[data-puzzle-id]')?.getAttribute('aria-label'), vh: innerHeight, vw: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
}

// The pebble games (Pebbles with Plume, Plume's rematch) as a child taps them,
// by touch on a phone, without scrolling first: the controls needed next are
// on screen when they are needed (Go first / Go second before the rematch,
// Take / Cancel once a pebble is lifted, from the top of the page and from its
// bottom), a pebble tapped before the start asks who goes first and makes the
// two buttons call, the rematch says "in a row" once, and Hint pressed at the
// screen's bottom edge brings its card into view. At 390 px wide, a lost
// rematch game gets the rematch's own gloat.
async function pebbleGame(page, e, id, size, phone, where, profile) {
  const onScreen = sel => page.locator(sel).evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { name: el.textContent.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom), on: r.top >= -0.5 && r.bottom <= innerHeight + 0.5 }; }));
  const allOn = async (sel, names, label) => { const got = await onScreen(sel); assert.deepEqual(got.map(b => b.name), names, `${where}: ${label}`); for (const b of got) assert.ok(b.on, `${where}: ${b.name} on screen when needed (${b.top}–${b.bottom} of ${size.height}) ${label}`); };
  const tap = async ({ x, y }) => { if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  // The topmost (or lowest) pebble that shows on screen now, clear of the
  // button row. When none shows yet, scroll just far enough for the first one,
  // as a child would, before tapping.
  const pebble = which => page.evaluate(which => {
    for (let tries = 0; tries < 6; tries++) {
      const row = document.querySelector('.proof-actions:not(:empty)')?.getBoundingClientRect(), limit = row && row.top > 0 ? Math.min(row.top, innerHeight) : innerHeight;
      const all = [...document.querySelectorAll('.duel-pebble:not(.gone):not(:disabled)')].map(n => n.getBoundingClientRect()), seen = all.filter(r => r.top >= 0 && r.bottom <= limit);
      if (seen.length) { const r = seen.sort((a, b) => which === 'top' ? a.top - b.top : b.bottom - a.bottom)[0]; return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      if (!all.length) return null;
      scrollBy(0, Math.min(...all.map(r => r.bottom)) - limit + 8);
    }
    return null;
  }, which);
  const press = async name => { const b = await page.locator('.proof-actions button', { hasText: name }).boundingBox(); await tap({ x: b.x + b.width / 2, y: b.y + b.height / 2 }); };
  const take = /^Take \d+$/;
  // Every pebble and bowl sits inside the board's card, within its padding.
  const spill = await page.evaluate(() => {
    const card = document.querySelector('.board-panel'), cs = getComputedStyle(card), box = card.getBoundingClientRect();
    const left = box.left + card.clientLeft + parseFloat(cs.paddingLeft) - .5, right = box.right - card.clientLeft - parseFloat(cs.paddingRight) + .5;
    return [...document.querySelectorAll('.duel-pebble, .duel-base')].map(n => n.getBoundingClientRect()).filter(r => r.left < left || r.right > right).length;
  });
  assert.equal(spill, 0, `${where}: the piles sit inside the board`);
  checks.add('both pebble games: the piles sit inside the board');
  if (e.mechanic === 'duel') {
    assert.equal((await page.locator('.board-panel').innerText()).match(/in a row/gi)?.length, 1, `${where}: "in a row" once, in the goal`);
    await allOn('.proof-actions button', ['Go first', 'Go second'], 'before the start');
    const first = await pebble('top');
    assert.ok(first, `${where}: a pebble shows on the first screen`);
    await tap(first);
    assert.equal(await page.locator('.duel-status').innerText(), 'Choose who goes first.', `${where}: a pebble tap before the start`);
    assert.equal(await page.locator('.proof-actions.is-calling').count(), 1, `${where}: the two buttons call`);
    assert.equal(await page.locator('.duel-pebble.lift').count(), 0, `${where}: nothing lifts before the start`);
    await allOn('.proof-actions button', ['Go first', 'Go second'], 'after a pebble tap');
    await press('Go first');
    assert.equal(await page.locator('.proof-actions.is-calling').count(), 0, `${where}: the call ends with the choice`);
    checks.add('the rematch: "in a row" once; Go first / Go second on screen; a pebble tap before the start asks who goes first and the buttons call');
  }
  await page.evaluate(() => scrollTo(0, 0));
  for (const which of ['top', 'bottom']) {
    if (which === 'bottom') await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const at = await pebble(which);
    assert.ok(at, `${where}: a pebble shows on screen (${which} of the page)`);
    await tap(at);
    const names = (await onScreen('.proof-actions button')).map(b => b.name);
    assert.ok(names.length === 2 && take.test(names[0]) && names[1] === 'Cancel', `${where}: Take / Cancel (${names})`);
    await allOn('.proof-actions button', names, `with a pebble lifted (${which} of the page)`);
    if (which === 'top') await page.screenshot({ path: new URL(`${e.id}-${size.width}x${size.height}-lifted.png`, output).pathname });
    await press('Cancel');
  }
  checks.add('both pebble games: Take / Cancel on screen when a pebble is lifted, at the top of the page and at its bottom');
  // Hint pressed with its button at the screen's bottom edge: the card comes into view.
  await page.evaluate(() => { const r = document.querySelector('[data-action=hint]').getBoundingClientRect(); scrollBy(0, r.bottom - innerHeight + 2); });
  const hint = await page.locator('[data-action=hint]').boundingBox();
  await tap({ x: hint.x + hint.width / 2, y: hint.y + hint.height / 2 });
  await page.waitForFunction(() => { const r = document.querySelector('.play-sidebar .hint-card')?.getBoundingClientRect(); return r && r.top >= -0.5 && r.bottom <= innerHeight + 0.5; }, null, { timeout: 4000 }).catch(() => {});
  await allOn('.play-sidebar .hint-card', [await page.locator('.play-sidebar .hint-card').innerText()], 'after Hint');
  checks.add('Hint at the bottom edge brings its card into view');
  if (e.mechanic !== 'duel' || size.width !== 390) return;
  // Lose a rematch game on purpose: start on the losing side, then take one at a time.
  await page.locator('[data-action=restart]:visible').click(); await page.locator('.proof-actions button', { hasText: 'Go second' }).waitFor();
  const start = (await profile()).attempts[id].board.start;
  await press(start.reduce((a, b) => a ^ b, 0) === 0 ? 'Go first' : 'Go second');
  for (let i = 0; i < 60; i++) {
    const board = (await profile()).attempts[id].board;
    if (!board.piles.some(Boolean)) break;
    const pile = board.piles.findIndex(Boolean) + 1, n = board.piles[pile - 1];
    await page.locator(`.duel-pebble[data-ui='${JSON.stringify({ pick: { pile, from: n - 1 } })}']`).click();
    await press('Take 1');
  }
  assert.equal(await page.locator('.duel-status').innerText(), 'Plume took the last pebble.', `${where}: the game is lost`);
  await allOn('.proof-actions button', ['Same start again', 'New start'], 'after a lost game');
  const gloat = await page.locator('.lr-bubble').innerText();
  assert.ok(gloat.includes(e.lines.gloat), `${where}: the rematch's own gloat (${gloat})`);
  assert.doesNotMatch(gloat, /undo/i, `${where}: no Undo in the rematch's gloat`);
  checks.add("a lost rematch game gets the rematch's own gloat");
}

try {
  for (const band of bands) {
    const saves = arrivals(band);
    for (const size of sizes) {
      const tag = `${band} ${size.width}×${size.height}`, phone = size.width <= 620;
      const context = await browser.newContext({ viewport: size, hasTouch: phone, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(`${tag}: ${error.message}`));
      const profile = async () => page.evaluate(key => { const s = JSON.parse(localStorage.getItem(key)); return s.profiles.find(p => p.id === s.activeProfileId); }, SAVE_KEY);
      await page.goto(base);
      // A tap on a stop further along the road answers beside the tap.
      const tapAt = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2; if (phone) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
      const noteShown = async (pattern, where) => {
        const note = page.locator('.tap-note'); await note.waitFor();
        assert.match(await note.innerText(), pattern, where);
        const r = await note.evaluate(el => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, px: parseFloat(getComputedStyle(el).fontSize), w: innerWidth, h: innerHeight }; });
        assert.ok(r.left >= 0 && r.right <= r.w && r.top >= 0 && r.bottom <= r.h && r.px >= 12, `${where}: the note is on screen at ${r.px} px`);
      };
      await page.evaluate(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, saves['ferry-bell']]);
      await page.goto(`${base}/#map`); await page.locator('.lr-overview').waitFor();
      const ahead = page.locator('.lr-map-layer:visible .lr-stop[data-id="hollow"]');
      assert.equal(await ahead.getAttribute('aria-disabled'), 'true', `${tag}: a stop ahead is marked, not dead`);
      await tapAt(ahead);
      await noteShown(/^That’s further on!$/, `${tag}: a stop ahead`);
      assert.equal(await page.locator('.lr-overview').count(), 1, `${tag}: the map stays`);
      checks.add('a tap on a stop further on says so beside it');
      for (const e of MAIN) {
        const id = campaignId(e.id, band), p = all.find(q => q.id === id), kind = stageKind(e, p);
        await page.evaluate(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, saves[e.id]]);
        await page.goto(`${base}/?stages=${id}-${size.width}#play/${id}/${e.id}`);
        await page.locator(`[data-puzzle-id="${id}"] .board-panel`).waitFor();
        await page.evaluate(async () => { await document.fonts?.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
        const s = await page.evaluate(survey), where = `${tag} ${e.id}`;
        assert.equal(s.overflow, false, `${where}: no sideways scroll`);
        // Every toggle board's wires and lanterns, staged or not: 40 px to tap along and across, 12 px letters.
        for (const r of s.ropes) assert.ok(r.across >= 40 && r.along >= 40, `${where}: ${r.name} takes taps ${r.across} px across and ${r.along} px along`);
        for (const t of s.texts) assert.ok(t.px >= 12, `${where}: ${t.name} reads at ${t.px} px`);
        if (e.mechanic === 'toggle') checks.add('toggle boards: ropes and wires 40 px along and across, letters 12 px');
        checks.add("keepers' names 12 px or more");
        // The balance's answer on a phone: the pebbles in one line or two even ones, then Weight beside Check (or Check alone).
        if (e.mechanic === 'weigh' && phone) {
          const a = await page.locator('.balance-answer').evaluate(form => {
            const box = el => el.getBoundingClientRect(), rows = els => [...new Set(els.map(el => Math.round(box(el).top)))];
            const coins = [...form.querySelectorAll('.answer-coin')], choices = [...form.querySelectorAll('.answer-choice')], check = form.querySelector('[type=submit]');
            const lines = rows(coins).map(top => coins.filter(el => Math.round(box(el).top) === top).length);
            return { lines, coin: Math.min(...coins.map(el => Math.min(box(el).width, box(el).height))), choices: rows(choices), check: box(check), choiceBottom: choices.length ? Math.max(...choices.map(el => box(el).bottom)) : null, width: form.scrollWidth - form.clientWidth };
          });
          assert.ok(a.lines.length <= 2 && Math.max(...a.lines) - Math.min(...a.lines) <= 1, `${where}: pebbles in even lines (${a.lines})`);
          assert.ok(a.coin >= 44 - .5, `${where}: pebble answers ${Math.round(a.coin)} px`);
          if (a.choiceBottom !== null) assert.ok(a.choices.length === 1 && Math.abs(a.check.bottom - a.choiceBottom) < 2, `${where}: Heavy, Light and Check share one row`);
          assert.ok(a.width <= 0, `${where}: the answer fits the board`);
          checks.add('the balance answers on a phone: even lines of pebbles, then Weight beside Check');
        }
        // On a wide, short screen the board starts near the top; a staged board fits whole.
        if (size.width === 1180 && !kind) assert.ok(s.panel.top <= 300, `${where}: the board starts at ${Math.round(s.panel.top)} px`);
        if (!phone && kind) assert.ok(s.panel.bottom <= s.vh + 1, `${where}: the controls under the picture end at ${Math.round(s.panel.bottom)} px of ${s.vh}`);
        // The workshop's art has Sprocket in its top-right quarter: Plume's card keeps off it.
        if (e.stop === 'workshop' && s.card) assert.ok(s.card.top >= s.art.bottom - 1 || s.card.right <= s.art.left + s.art.width * .72, `${where}: Plume's card clear of Sprocket (ends at ${Math.round(s.card.right - s.art.left)} of ${Math.round(s.art.width)} px)`);
        // Plume's card counts the child's moves; neither the stage nor the route's distance line counts them again.
        if (s.card) {
          assert.equal(await page.locator('.network-score:visible').count(), 0, `${where}: one count, on Plume's card`);
          if (kind === 'boardwalks') assert.match(await page.locator('.stage-count').innerText(), /^\d+ of \d+ lamps lit$/, `${where}: the stage counts lamps, not steps`);
          checks.add("one count of the child's moves, on Plume's card");
        }
        // The keeper's circle is the keeper's colour until the picture has loaded.
        const ring = await page.locator('.lr-keeper .lr-portrait').evaluate(el => getComputedStyle(el).backgroundColor);
        const hex = CAST[e.speaker].color.match(/[0-9a-f]{2}/gi).map(h => parseInt(h, 16));
        assert.equal(ring, `rgb(${hex.join(', ')})`, `${where}: the portrait's circle takes ${CAST[e.speaker].name}'s colour`);
        checks.add("keepers' circles in their colour while the picture loads");
        if (e.mechanic === 'tile') {
          const toggle = await page.locator('.checker-toggle').boundingBox(), knob = await page.locator('#checker').boundingBox();
          assert.ok(toggle.height >= 44 - .5 && knob.width >= 44 - .5, `${where}: Checker colors is a 44 px switch (${Math.round(toggle.height)} tall, ${Math.round(knob.width)} wide)`);
          assert.equal(await page.locator('#checker').getAttribute('role'), 'switch');
          checks.add('Checker colors is a 44 px switch');
        }
        if (e.id === 'hollow-crypt') {
          // The crypt door in a child's words; after a wrong Check the line saying
          // what to do comes into view, even when the child scrolled down to Check.
          assert.deepEqual(await page.locator('.code-transcript thead th').allInnerTexts(), ['Old try', 'Right'], `${where}: the table`);
          assert.equal(s.heading, 'Each old try shows how many lights were right. Find the code.', `${where}: the goal`);
          for (let i = 0; i < p.parameters.length; i++) await tapAt(page.getByRole('button', { name: `Light ${i + 1}: 1`, exact: true }));
          const check = page.locator('.deduction-form-controls button');
          await check.evaluate(button => scrollTo(0, button.getBoundingClientRect().top + scrollY - 8));
          await tapAt(check);
          await page.waitForFunction(() => { const r = document.querySelector('.code-feedback:not([hidden])')?.getBoundingClientRect(); return r && r.top >= 0 && r.bottom <= innerHeight; }, null, { timeout: 5000 });
          assert.equal(await page.locator('.code-feedback').innerText(), band === 'k1' ? 'Change one light and try again.' : 'Some old tries don’t fit yet. Change a light and check again.');
          assert.ok(await page.locator('.code-mismatch .code-mark-bad').count() > 0, `${where}: a row that doesn't fit is marked ✗`);
          checks.add("the crypt door: lights, old tries, Right, and what to do in view after a wrong Check");
        }
        if (e.mechanic === 'nim' || e.mechanic === 'duel') await pebbleGame(page, e, id, size, phone, where, profile);
        if (!kind) continue;
        await page.screenshot({ path: new URL(`${band}-${e.id}-${size.width}x${size.height}.png`, output).pathname });
        if (kind === 'boardwalks') {
          // A platform no boardwalk reaches from Hops answers a tap, beside it, in the stage's words.
          if (!await page.locator('.stage-junction[data-action="refuse"]').count()) await tapAt(page.locator('.stage-junction:not([disabled])').first());
          const far = page.locator('.stage-junction[data-action="refuse"]').first();
          await tapAt(far);
          await noteShown(/^No boardwalk goes from \w to \w\.$/, `${where}: a far platform`);
          checks.add('a tap on a platform no boardwalk reaches says so beside it');
        }
        assert.deepEqual(s.covered, [], `${where}: pieces in the picture and uncovered`);
        for (const t of s.targets) assert.ok(Math.min(t.width, t.height) >= 40 - .5, `${where}: ${t.name} is ${Math.round(t.width)}×${Math.round(t.height)} px`);
        // The stage's own words, in the heading and the page's name.
        const help = stageHelp(kind, p);
        assert.equal(s.label, e.title, `${where}: the page is named for the encounter`);
        if (s.heading !== e.title) assert.equal(s.heading, help.objective, `${where}: heading`);
        assert.doesNotMatch(`${help.objective} ${help.instructions}`, LIBRARY_WORDS, `${where}: How to play in the stage's words`);
        if (kind === 'seats' && phone) {
          const tags = await page.locator('.stage-tag').evaluateAll(els => els.map(el => el.getBoundingClientRect().width));
          assert.ok(tags.every(w => w >= 32), `${where}: seat tags ${tags.map(Math.round)} px`);
          checks.add('seat tags with faces 32 px or more on phones');
        }
        if (size.width === 390) {
          // How to play: the stage's words, and Done in reach with the grown-up notes open.
          await page.locator('[data-action="demo"]:visible').first().click();
          const dialog = page.locator('dialog.modal[open]');
          const lines = await dialog.locator('.dialog-body > p').evaluateAll(ps => ps.slice(0, 2).map(p => p.textContent));
          assert.deepEqual(lines, [help.objective, help.instructions], `${where}: How to play text`);
          await dialog.locator('summary', { hasText: 'For grown-ups' }).click();
          assert.match(await dialog.locator('.note-stage').innerText(), /^On the road /);
          const done = await dialog.locator('.dialog-actions button').last().boundingBox();
          assert.ok(done && done.y >= 0 && done.y + done.height <= size.height, `${where}: Done on screen with the notes open`);
          await dialog.locator('.dialog-actions button').last().click();
          checks.add('How to play names the stage; Done stays on screen with the notes open');
        }
        if (kind === 'lights') {
          // A lamp's tap lights its ropes and moves nothing; a rope's tap is the move.
          const lamp = await page.locator('.stage-lamp-hit').first().getAttribute('data-stage-lamp');
          const before = (await profile()).attempts[id]?.board?.presses?.length ?? 0;
          await page.locator('.stage-lamp-hit').first().click({ force: true });
          const pulsing = await page.locator('.stage-rope-set.is-pulsing').evaluateAll(els => els.map(el => el.dataset.ends));
          const expected = p.parameters.edges.filter(edge => edge.includes(lamp)).map(edge => edge.join(' '));
          assert.deepEqual(pulsing.sort(), expected.sort(), `${where}: lamp ${lamp} lights its ropes`);
          assert.equal((await profile()).attempts[id]?.board?.presses?.length ?? 0, before, `${where}: a lamp tap is not a move`);
          const rope = await page.locator('.stage-rope-hit').first().evaluate(el => { const p = el.getPointAtLength(el.getTotalLength() / 2), q = new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM()); return { x: q.x, y: q.y }; });
          await page.mouse.click(rope.x, rope.y);
          await page.waitForFunction(([key, pid, n]) => { const st = JSON.parse(localStorage.getItem(key)), pr = st.profiles.find(x => x.id === st.activeProfileId); return (pr.attempts[pid]?.board?.presses?.length ?? 0) === n + 1; }, [SAVE_KEY, id, before]);
          checks.add('a lamp tap lights its ropes without a move; a rope tap presses it');
        }
        if (kind === 'bell') {
          // Ring with nothing chosen, or a count past the chart: a line says what to do, and nothing is rung.
          const typed = await page.locator('.board-panel input[type=number]').count();
          if (typed) await page.locator('.board-panel input[type=number]').fill('99');
          await page.locator('.board-panel button[type=submit]').click();
          const max = typed ? await page.locator('.board-panel input[type=number]').getAttribute('max') : null;
          await page.locator('.feedback', { hasText: typed ? `Choose 1 to ${max} bells.` : 'Tap a number first.' }).waitFor();
          assert.equal((await profile()).attempts[id]?.board?.prediction ?? null, null, `${where}: nothing rung`);
          checks.add('the bell refuses a missing or too-large count in words');
          // On a short phone the goal, the whole chart and Ring are on screen under the picture.
          if (size.height === 667) assert.ok(s.form <= size.height, `${where}: the bell's chart and Ring end at ${Math.round(s.form)} px of 667`);
        }
        checks.add(`${kind}: pieces inside the picture and clear of the keeper and Plume, 40 px taps, 12 px text`);
      }
      await context.close();
    }
    checks.add(`${band}: ${sizes.map(v => `${v.width}×${v.height}`).join(', ')}`);
  }
  assert.deepEqual(errors, [], 'no page errors');
  console.log(JSON.stringify({ ok: true, checks: [...checks] }, null, 1));
} finally {
  await browser.close();
}
