// The road's staged boards (the ferry's seats, bell and lamps, the marsh
// boardwalks) and the scene around every road puzzle, on phones and tablets,
// as a child meets each encounter: pieces inside the picture and clear of the
// keeper and Plume's card, 40 px taps (ropes measured along and across), 12 px
// text, a tap on a lamp lighting its ropes without a move, the bell's refusals
// in words, How to play in the stage's own words with Done in reach, the bell's
// chart on a short phone, and the board starting on screen on a tablet in
// landscape. Isolated browser profiles only. Environment: PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL, TEST_BANDS (e.g. "k1"), TEST_PHONE=1 (the two
// phones only). Screenshots go in test-results/road-stages/.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { MAIN, BAND_KEYS, startJourney, beginEncounter, recordSolve, campaignId, withCampaignPuzzles } from '../dist/road.js';
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
  const texts = [...document.querySelectorAll('.lr-stage .stage-lamp-label, .lr-stage .clock-position text, .lr-stage .clock-center, .lr-stage .stage-pad-label, .stage-tag b, .stage-goal-label, .lantern text')].filter(el => shown(el) && el.textContent.trim()).map(el => ({ name: name(el), px: Math.round(textPx(el) * 10) / 10 }));
  const panel = document.querySelector('.board-panel'), panelBox = panel && box(panel);
  // Each rope is measured in the middle of the screen, then the page goes back to the top.
  const ropes = [...document.querySelectorAll('.stage-rope-hit, .lantern-wires .wire-hit')].filter(shown).map(reach);
  scrollTo(0, 0);
  return { covered, targets, texts, ropes, stage: stage && box(stage), art: art && box(art), card: card && box(card), panel: panelBox, form: document.querySelector('#bell-form')?.getBoundingClientRect().bottom, heading: panel?.querySelector('h1')?.textContent.trim(), label: document.querySelector('[data-puzzle-id]')?.getAttribute('aria-label'), vh: innerHeight, vw: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
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
        // On a wide, short screen the board starts near the top; a staged board fits whole.
        if (size.width === 1180 && !kind) assert.ok(s.panel.top <= 300, `${where}: the board starts at ${Math.round(s.panel.top)} px`);
        if (!phone && kind) assert.ok(s.panel.bottom <= s.vh + 1, `${where}: the controls under the picture end at ${Math.round(s.panel.bottom)} px of ${s.vh}`);
        // The workshop's art has Sprocket in the top-right: Plume's card keeps off it.
        if (e.stop === 'workshop' && s.card) assert.ok(s.card.top >= s.art.bottom - 1 || s.card.right <= s.art.left + s.art.width * .55, `${where}: Plume's card clear of Sprocket`);
        if (!kind) continue;
        await page.screenshot({ path: new URL(`${band}-${e.id}-${size.width}x${size.height}.png`, output).pathname });
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
