// One tap on a touchscreen is one action. A board that takes a press itself
// (pointerdown … pointerup) still gets the click the browser sends after a
// touch tap, aimed at whatever the board has drawn under the finger since;
// dist/click-echo.js drops it. Before October 24 that click lifted the tile a
// tap had just placed in Tile gardens, and let go of the square a tap had
// just chosen.
//
// The suite plays the same taps on two pages from the same fresh start: as
// mouse clicks on one, as CDP touch taps (touchStart, touchEnd) on the other.
// After each tap the two screens, saves and addresses must agree, and so must
// the number of times the page redrew. It walks the first puzzle of every
// mechanic in the merged pack (TOUCH_ALL=1: the first of each mode, shape or
// band as well) and every encounter of one road trail with the encounters
// before it solved (TEST_BAND, default 45). The k-th tap goes to a control
// chosen by the same rule on both pages, a board's own pieces before a bare
// picture. When the touch's press lands on another control than the mouse's
// (Chromium moves a touch to a nearby control), that puzzle stops there and
// is counted as moved, not failed. A board that changes nothing for a tap
// still counts: both pages must agree.
//
// Same environment variables as the other browser suites (PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE, TEST_URL); TEST_SIZE=820x1180 for a tablet (390x844 by
// default), TEST_FAMILY=<id>[,<id>] for some modules or mechanics only (the
// road is skipped then), TEST_ROAD=0 to skip the road or TEST_ROAD=only for
// the road alone.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {loadPack, FAMILIES} from './packs.mjs';
import {startJourney, beginEncounter, recordSolve, campaignId, MAIN, SIDE} from '../dist/road.js';
import {freshAttempt, move, isSolved, nextHint} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, '');
const [width, height] = (process.env.TEST_SIZE || '390x844').split('x').map(Number);
const only = process.env.TEST_FAMILY?.split(',');
const band = process.env.TEST_BAND || '45';
const STEPS = 4, GAP = 450, KEY = 'small-math-adventure:saves:v1';
const pack = await loadPack(), puzzles = pack.puzzles;

// The puzzles: the first of each mechanic (and of each mode with TOUCH_ALL).
const moduleOf = mechanic => FAMILIES.find(m => m.mechanics && Object.hasOwn(m.mechanics, mechanic))?.id;
const byMechanic = new Map();
for (const p of puzzles) if (!p.campaignOnly) byMechanic.set(p.mechanic, [...(byMechanic.get(p.mechanic) || []), p]);
const library = [];
for (const [mechanic, list] of byMechanic) {
  if (process.env.TEST_ROAD === 'only') break;
  if (only && !only.includes(mechanic) && !only.includes(moduleOf(mechanic))) continue;
  const kinds = new Map();
  for (const p of list) { const kind = p.parameters?.mode ?? p.tileShape ?? p.band ?? ''; if (!kinds.has(kind)) kinds.set(kind, p); }
  const chosen = process.env.TOUCH_ALL === '1' ? [...new Set([list[0], ...kinds.values()])] : [list[0]];
  library.push(...chosen.map(p => ({id: p.id, url: `#play/${p.id}`})));
}

// Taps in a set order where a board's pieces need choosing first: Tile
// gardens' squares, tiles and lifts, and the proof garden's cover, star and
// paint taps.
const cell = (board, n) => `${board}[data-cell="${n}"]`, garden = n => cell('.garden-cell', n), plot = n => cell('.pf-cell', n);
const scripted = [
  {id: 'tile-45-01', steps: [garden(0), garden(1), garden(1), garden(2), garden(2)]},
  {id: 'tile-45-08', steps: [garden(0), garden(5), garden(6), garden(1), garden(2), garden(7), garden(6)]},
  {id: 'proof-garden-03', steps: [plot(1), plot(2), plot(2), 'button[data-move*=\'"mode":"prove"\']', '.proof-tool[aria-label="Star"]', plot(5), plot(6), plot(5), '.proof-tool[aria-label="Paint gold"]', plot(9), plot(9), '.proof-tool[aria-label="Erase"]', plot(6)]}
].filter(item => process.env.TEST_ROAD !== 'only').filter(item => !only || only.some(id => item.id.startsWith(id.replace('proofgarden', 'proof-garden')))).map(item => ({...item, url: `#play/${item.id}`}));
for (const item of scripted) assert.ok(puzzles.some(p => p.id === item.id), `${item.id} is in the pack`);

// The road: one explorer per encounter, with the main road solved up to it
// (all of it for the side puzzles, so both tools are earned).
const explorers = [], road = [];
if (!only && process.env.TEST_ROAD !== '0') {
  const solveTo = (t, n) => {
    for (let i = 0; i < n; i++) {
      const o = beginEncounter(t, puzzles);
      let a = freshAttempt(o.puzzle);
      for (let k = 0; k < 400 && !isSolved(o.puzzle, a.board); k++) {
        const m = mechanicFor(o.puzzle), next = move(o.puzzle, a, m?.solve ? m.solve(o.puzzle, a.board) : (h => h.action || h.pair)(nextHint(o.puzzle, a)));
        if (!next) break;
        a = next;
      }
      assert.ok(isSolved(o.puzzle, a.board), `road set-up solves ${o.puzzle.id}`);
      t.attempts[o.puzzle.id] = a;
      recordSolve(t, o.puzzle.id, o.encounter.id, puzzles);
    }
  };
  for (const [n, e] of [...MAIN.map((e, i) => [i, e]), ...SIDE.map(e => [MAIN.length, e])]) {
    const t = {id: `taps-${e.id}`, name: e.id, avatar: 0, band, sound: false, attempts: {}};
    startJourney(t);
    solveTo(t, n);
    explorers.push(t);
    road.push({id: campaignId(e.id, band), url: `#play/${campaignId(e.id, band)}/${e.id}`, explorer: t.id});
  }
}

// Two pages alike but for the input: the same screen, motion reduced, the
// same random numbers after every load.
const page = async () => {
  const context = await browser.newContext({viewport: {width, height}, hasTouch: true, isMobile: true, reducedMotion: 'reduce', serviceWorkers: 'block'});
  await context.addInitScript(() => {
    let s = 1;
    window.reseed = n => { s = n >>> 0 || 1; };
    Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 1000003) / 1000003; };
  });
  const pg = await context.newPage();
  pg.errors = [];
  pg.on('pageerror', e => pg.errors.push(e.message));
  return {context, pg, cdp: await context.newCDPSession(pg)};
};
const M = await page(), T = await page();
// Count redraws of #app, and note where each press went.
const watch = pg => pg.evaluate(() => {
  if (window.redraws !== undefined) return;
  window.redraws = 0;
  new MutationObserver(records => { for (const r of records) if (r.addedNodes.length) window.redraws++; }).observe(document.querySelector('#app'), {childList: true});
  window.addEventListener('pointerdown', e => { const t = e.target; window.pressed = `${t.tagName}.${t.getAttribute?.('class') || ''}${JSON.stringify({...t.dataset})}`; }, true);
  if (window.speechSynthesis) window.speechSynthesis.speak = () => {};
});
// The k-th control on the board (and on a road stage), by one rule on both
// pages: a visible control whose middle is its own, the board's own pieces
// before a bare picture, at a fixed share of the way through the list.
function chooseTarget(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  el.scrollIntoView({block: 'center'});
  const r = el.getBoundingClientRect();
  return {x: r.left + r.width / 2, y: r.top + r.height / 2, what: selector};
}
function pickTarget(k) {
  const roots = [document.querySelector('.lr-stage'), document.querySelector('[data-mechanic-wire]') || document.querySelector('.board-panel')].filter(Boolean);
  const skip = new Set(['hint', 'undo', 'restart', 'demo', 'speak', 'apply-hint', 'rescue', 'replay', 'open-puzzle', 'library', 'puzzle-notes', 'map', 'journal', 'home', 'finish-encounter', 'hear-story', 'stop-sheet', 'continue-journey']);
  const selector = 'button:not(:disabled),[role="button"]:not([aria-disabled="true"]),[data-sg-cell],[data-sg-point],[data-sg-edge],[data-sg-piece],[data-tg-cell],[data-tg-point],[data-tg-edge],[data-tg-piece],[data-gb-node],[data-gb-edge],[data-pb-point],[data-pb-vertex],.pf-cell,.garden-cell,[tabindex="0"],svg';
  let found = [];
  for (const el of roots.flatMap(root => [...root.querySelectorAll(selector)])) {
    if (skip.has(el.dataset?.action) || el.closest('dialog,.play-heading,.tool-grid,.lr-keeper,.lr-done,.caravan-topbar')) continue;
    const r = el.getBoundingClientRect(), svg = el.tagName.toLowerCase() === 'svg';
    if (r.width < 6 || r.height < 6 || (svg && (r.width < 80 || r.height < 60))) continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
    const hit = document.elementFromPoint(x, y);
    if (hit && (hit === el || el.contains(hit))) found.push({el, x, y, svg});
  }
  if (found.some(c => !c.svg)) found = found.filter(c => !c.svg);
  if (!found.length) return null;
  const c = found[Math.min(found.length - 1, Math.floor([0, .5, .25, .75][k % 4] * found.length))];
  return {x: c.x, y: c.y, what: `${c.el.tagName.toLowerCase()}.${(c.el.getAttribute('class') || '').trim().split(/\s+/).slice(0, 2).join('.')}`};
}
const screen = (pg, id) => pg.evaluate(([id, key]) => {
  const main = document.querySelector('#main');
  let a = null;
  try { a = JSON.parse(localStorage.getItem(key)).profiles.find(p => p.id === JSON.parse(localStorage.getItem(key)).activeProfileId).attempts[id]; } catch {}
  return {
    // Clock times some boards keep in the page (a run's token, when a line
    // was seen) differ by a few ms, and a keeper's talk pose ends on a timer
    // that started when each page loaded.
    html: (main?.innerHTML || '').replace(/\s+/g, ' ').replace(/\b1\d{12}(\.\d+)?\b/g, 'TIME').replace(/(keeper\/[a-z]+\/)(talk|idle)\b/g, '$1pose'),
    save: a ? JSON.stringify({board: a.board, moves: a.moves, history: a.history?.length, hints: a.hintLevel}) : null,
    hash: location.hash, redraws: window.redraws, pressed: window.pressed, dialog: Boolean(document.querySelector('dialog[open]'))
  };
}, [id, KEY]);
const touchTap = (cdp, x, y) => cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y, id: 1}]}).then(() => cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}));
const failures = [], moved = [], report = {size: `${width}x${height}`, band, puzzles: 0, taps: 0, moved, failures};

async function walk(item, n) {
  const ready = await Promise.all([M, T].map(async ({pg}) => {
    // A library puzzle opens in the same page, its random numbers started
    // afresh; a road encounter loads the app again with its explorer.
    if (item.explorer) {
      await pg.evaluate(([key, who, explorers]) => {
        const s = JSON.parse(localStorage.getItem(key));
        s.profiles.push(...explorers.filter(e => !s.profiles.some(p => p.id === e.id)));
        s.activeProfileId = who;
        localStorage.setItem(key, JSON.stringify(s));
      }, [KEY, item.explorer, explorers]);
      await pg.goto(`${base}/?walk=${n}${item.url}`);
    } else {
      await pg.evaluate(n => window.reseed(n), n + 1);
      await pg.goto(`${base}/${item.url}`);
    }
    try { await pg.locator(`[data-puzzle-id="${item.id}"] .board-panel`).waitFor({timeout: 15000}); } catch { return false; }
    await watch(pg);
    await pg.waitForTimeout(300);
    return true;
  }));
  assert.ok(ready.every(Boolean), `${item.id}: opens`);
  report.puzzles++;
  for (let k = 0; k < (item.steps?.length ?? STEPS); k++) {
    const [m, t] = await Promise.all([M, T].map(({pg}) => item.steps ? pg.evaluate(chooseTarget, item.steps[k]) : pg.evaluate(pickTarget, k)));
    if (item.steps) assert.ok(m, `${item.id}: ${item.steps[k]} is on the board`);
    if (!m) return;
    assert.ok(t && t.what === m.what && Math.hypot(t.x - m.x, t.y - m.y) < 1, `${item.id}: both pages offer the same tap ${k + 1}`);
    const [before, beforeT] = await Promise.all([M.pg.evaluate(() => window.redraws), T.pg.evaluate(() => window.redraws)]);
    await Promise.all([M.pg.mouse.click(m.x, m.y), touchTap(T.cdp, t.x, t.y)]);
    await Promise.all([M.pg.waitForTimeout(GAP), T.pg.waitForTimeout(GAP)]);
    const [a, b] = await Promise.all([screen(M.pg, item.id), screen(T.pg, item.id)]);
    report.taps++;
    if (a.pressed !== b.pressed) { moved.push(`${item.id} tap ${k + 1} (${m.what})`); return; }
    const differs = ['html', 'save', 'hash', 'dialog'].filter(f => a[f] !== b[f]);
    if (b.redraws - beforeT !== a.redraws - before) differs.push(`redraws ${a.redraws - before} by mouse, ${b.redraws - beforeT} by touch`);
    if (differs.length) {
      let i = 0;
      while (i < a.html.length && a.html[i] === b.html[i]) i++;
      failures.push({puzzle: item.id, tap: k + 1, control: m.what, differs, mouse: a.save, touch: b.save, mouseScreen: a.html.slice(Math.max(0, i - 80), i + 120), touchScreen: b.html.slice(Math.max(0, i - 80), i + 120)});
      return;
    }
    if (a.dialog) await Promise.all([M.pg.keyboard.press('Escape'), T.pg.keyboard.press('Escape')]);
    if (!a.hash.includes(item.id)) return;
  }
}

try {
  for (const {pg} of [M, T]) {
    await pg.goto(base);
    await pg.locator('#nickname').fill('Touch taps');
    await pg.locator('#profile-form button[type=submit]').click();
    await pg.locator('#main').waitFor();
  }
  await Promise.all([watch(M.pg), watch(T.pg)]);
  const items = [...scripted, ...library, ...road];
  for (const [n, item] of items.entries()) await walk(item, n);
  await mkdir(new URL('../test-results/', import.meta.url), {recursive: true});
  await writeFile(new URL('../test-results/touch-taps-browser.json', import.meta.url), JSON.stringify(report, null, 2));
  assert.deepEqual(failures, [], `a touch tap did something a mouse click did not:\n${failures.map(f => `${f.puzzle}, tap ${f.tap} on ${f.control}: ${f.differs.join(', ')}\n  mouse: ${f.mouse}\n  touch: ${f.touch}\n  mouse screen: …${f.mouseScreen}…\n  touch screen: …${f.touchScreen}…`).join('\n')}`);
  assert.deepEqual([...M.pg.errors, ...T.pg.errors], []);
  console.log(`Touch taps passed at ${width}×${height}: ${report.taps} taps on ${report.puzzles} boards (${scripted.length} in a set order, ${library.length} library puzzles, ${road.length} road encounters on trail ${band}) did as a mouse click did${moved.length ? `; ${moved.length} moved to a nearby control by the browser and stopped there` : ''}.`);
} finally { await browser.close(); }
