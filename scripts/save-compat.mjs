// Saved progress across a deploy (docs/save-compat.md). Makes saves with the
// deployed app (a folder laid out like gh-pages) and reads each one with this
// checkout: the strict store validator and loadStore in Node, and the app in a
// browser. Not part of npm test; run it before a deploy.
//
//   node scripts/save-compat.mjs          make the browser saves, then check
//   node scripts/save-compat.mjs make     only make them (keeps finished chunks with RESUME=1)
//   node scripts/save-compat.mjs check    check the saves already made, and the Node-made ones
//
// DEPLOYED_DIR  the deployed copy (default: origin/gh-pages extracted into OUT/deployed)
// CURRENT_DIR   the build to check (default: this checkout's dist/)
// OUT           results folder (default test-results/save-compat)
// DEPLOYED_PORT, CURRENT_PORT  servers this script starts (4431, 4432)
// TEST_FAMILY   chunk ids, comma separated: a family module id, a base mechanic
//               (tile, swap, …) or road
// SKIP_BROWSER=1  Node checks only; PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE as in browser-smoke.mjs
import {spawn, execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(process.env.OUT || join(root, 'test-results/save-compat'));
const savesDir = join(out, 'saves');
const deployedDir = resolve(process.env.DEPLOYED_DIR || join(out, 'deployed'));
const currentDir = resolve(process.env.CURRENT_DIR || join(root, 'dist'));
const ports = {deployed: Number(process.env.DEPLOYED_PORT || 4431), current: Number(process.env.CURRENT_PORT || 4432)};
const only = process.env.TEST_FAMILY ? new Set(process.env.TEST_FAMILY.split(',').map(s => s.trim()).filter(Boolean)) : null;
const mode = process.argv[2] || 'all';
const browserOn = !process.env.SKIP_BROWSER;
if (!['all', 'make', 'check'].includes(mode)) { console.error('Usage: node scripts/save-compat.mjs [make|check]'); process.exit(1); }
mkdirSync(savesDir, {recursive: true});
const readJSON = file => JSON.parse(readFileSync(file, 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args);

// The deployed copy ---------------------------------------------------------

function prepareDeployed() {
  if (process.env.DEPLOYED_DIR) {
    if (!existsSync(join(deployedDir, 'storage.js'))) throw Error(`DEPLOYED_DIR ${deployedDir} has no storage.js`);
    return;
  }
  if (mode === 'check' && existsSync(join(deployedDir, 'storage.js'))) return;
  rmSync(deployedDir, {recursive: true, force: true});
  mkdirSync(deployedDir, {recursive: true});
  const commit = execFileSync('git', ['rev-parse', 'origin/gh-pages'], {cwd: root, encoding: 'utf8'}).trim();
  const tar = execFileSync('git', ['archive', commit], {cwd: root, maxBuffer: 1 << 30});
  execFileSync('tar', ['-x', '-C', deployedDir], {input: tar});
  writeFileSync(join(out, 'deployed.json'), JSON.stringify({commit, subject: execFileSync('git', ['log', '-1', '--format=%s', commit], {cwd: root, encoding: 'utf8'}).trim()}, null, 2));
}

// One build's modules and merged pack, read as dist/main.js reads them.
async function loadBuild(dir) {
  const at = file => pathToFileURL(join(dir, file)).href;
  const families = await import(at('families.js'));
  const [engine, road, storage] = await Promise.all(['engine.js', 'road.js', 'storage.js'].map(f => import(at(f))));
  const base = readJSON(join(dir, 'puzzles.json'));
  const modules = families.FAMILIES.filter(m => m.pack);
  const packs = modules.map(m => readJSON(fileURLToPath(m.pack)));
  const pack = families.mergePacks(base, packs);
  // Chunks: a family module's pack, a base mechanic, or the road's own boards.
  const chunkOf = new Map();
  for (const p of base.puzzles) chunkOf.set(p.id, p.mechanic);
  modules.forEach((m, i) => { for (const p of packs[i].puzzles) chunkOf.set(p.id, m.id); });
  const all = road.withCampaignPuzzles(pack.puzzles);
  for (const p of all) if (!chunkOf.has(p.id)) chunkOf.set(p.id, p.campaignVersion === 4 ? 'road' : 'archive');
  return {engine, road, storage, pack, puzzles: pack.puzzles, all, chunkOf, families};
}

function chunks(build) {
  const byChunk = new Map();
  for (const p of build.puzzles) { const c = build.chunkOf.get(p.id); if (!byChunk.has(c)) byChunk.set(c, []); byChunk.get(c).push(p); }
  return [...byChunk].filter(([c]) => !only || only.has(c));
}

// Servers ---------------------------------------------------------------------

const servers = [];
async function serve(port, serveRoot) {
  const child = spawn(process.execPath, [join(root, 'scripts/serve.mjs')], {env: {...process.env, PORT: String(port), ...(serveRoot ? {SERVE_ROOT: serveRoot} : {})}, stdio: ['ignore', 'pipe', 'inherit']});
  servers.push(child);
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(Error(`server on ${port} did not start`)), 30000);
    child.stdout.on('data', d => { if (String(d).includes('Small math adventure')) { clearTimeout(timer); done(); } });
    child.on('exit', code => { clearTimeout(timer); fail(Error(`server on ${port} exited (${code}); is the port in use?`)); });
  });
  return `http://127.0.0.1:${port}`;
}
const stopServers = () => { for (const s of servers) s.kill(); };
process.on('exit', stopServers);

async function launch() {
  const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  return chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
}
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([promise, new Promise((_, fail) => { timer = setTimeout(() => fail(Error(`${label}: timed out after ${ms} ms`)), ms); })]).finally(() => clearTimeout(timer));
}

// Saves made with the deployed app in a browser ---------------------------------

const SAVE_KEY = 'small-math-adventure:saves:v1';
// Opened, after a Hint, after one to three applied hints, and solved where the
// hints can solve it; each snapshot is that puzzle's saved attempt.
async function playChunk(browser, base, chunk, puzzles) {
  const file = join(savesDir, `${chunk}.json`);
  if (process.env.RESUME && existsSync(file)) { log(`${chunk}: kept`); return; }
  const context = await browser.newContext({viewport: {width: 1024, height: 768}, serviceWorkers: 'block'});
  const page = await context.newPage(), errors = [], snapshots = [], problems = [];
  page.on('pageerror', e => errors.push(e.message));
  const started = Date.now();
  const attemptOf = id => page.evaluate(({key, id}) => JSON.parse(localStorage.getItem(key) || 'null')?.profiles?.[0]?.attempts?.[id] ?? null, {key: SAVE_KEY, id});
  const seen = new Set();
  const snap = async (id, state) => {
    const attempt = await attemptOf(id), key = id + JSON.stringify(attempt && {...attempt, lastPlayed: 0});
    if (attempt && !seen.has(key)) { seen.add(key); snapshots.push({id, state, attempt}); }
  };
  try {
    await page.goto(base);
    await page.locator('#nickname').fill('Compat');
    await page.locator('#profile-form button[type=submit]').click();
    await page.locator('.caravan-nav [data-action=library]').waitFor();
    for (const p of puzzles) {
      try {
        await withTimeout((async () => {
          await page.evaluate(id => { location.hash = `#play/${id}`; }, p.id);
          await page.locator(`[data-puzzle-id="${p.id}"] .board-panel`).waitFor({timeout: 20000});
          await snap(p.id, 'opened');
          const hint = page.locator('[data-action=hint]');
          if (!await hint.count()) return;
          await hint.first().click();
          await snap(p.id, 'hint');
          const apply = page.locator('[data-action=apply-hint]');
          for (let i = 0; i < 2 && !await apply.count() && await hint.count(); i++) await hint.first().click();
          for (let k = 1; k <= 3; k++) {
            if (!await apply.count() || await page.locator('#completion-heading').count()) break;
            await apply.first().click();
            await snap(p.id, `move${k}`);
          }
          // The rest of the solve in the page, one applied hint per frame.
          const solved = await page.evaluate(async () => {
            for (let i = 0; i < 400; i++) {
              if (document.querySelector('#completion-heading')) return true;
              const button = document.querySelector('[data-action=apply-hint]');
              if (!button || button.disabled) return false;
              button.click();
              await new Promise(r => setTimeout(r, 0));
            }
            return Boolean(document.querySelector('#completion-heading'));
          });
          if (solved) await snap(p.id, 'solved');
        })(), 120000, p.id);
        await withTimeout(explore(page, p.id, snap), 60000, `${p.id} explore`);
      } catch (error) {
        problems.push({id: p.id, error: String(error.message).split('\n')[0]});
        await page.goto(base).catch(() => {});
      }
    }
    const save = await page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
    writeFileSync(file, JSON.stringify({chunk, puzzles: puzzles.length, seconds: Math.round((Date.now() - started) / 1000), save, snapshots, problems, errors}));
    log(`${chunk}: ${puzzles.length} puzzles, ${snapshots.length} saves, ${snapshots.filter(s => s.state === 'solved').length} solved, ${problems.length} problems, ${Math.round((Date.now() - started) / 1000)} s`);
  } finally { await context.close(); }
}

// A child's own moves, which hints never make (wrong moves, refused claims,
// Can't and That's all): reopen the puzzle (a solved one starts afresh, keeping
// its star) and press up to eight of its board's controls, picked by a seeded
// random order, saving after each press.
const NOT_PLAY = new Set(['hint', 'apply-hint', 'undo', 'restart', 'replay', 'help', 'library', 'journal', 'parents', 'profiles', 'map', 'next']);
async function explore(page, id, snap) {
  await page.evaluate(() => { location.hash = '#library'; });
  await page.locator('.caravan-library').waitFor({timeout: 20000});
  await page.evaluate(id => { location.hash = `#play/${id}`; }, id);
  await page.locator(`[data-puzzle-id="${id}"] .board-panel`).waitFor({timeout: 20000});
  let seed = [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  for (let i = 0; i < 8; i++) {
    if (await page.locator('#completion-heading').count()) break;
    const picked = await page.evaluate(({id, skip, r}) => {
      for (const el of document.querySelectorAll('[data-compat-pick]')) el.removeAttribute('data-compat-pick');
      const panel = document.querySelector(`[data-puzzle-id="${id}"]`);
      if (!panel) return false;
      const controls = [...panel.querySelectorAll('button, [role=button], [data-action]')].filter(el => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && !el.closest('dialog, a, header, nav')
          && !skip.includes(el.dataset.action) && !/^(Hint|Apply hint|Undo|Restart|Replay|How to play|Next|Read aloud)$/i.test((el.getAttribute('aria-label') || el.textContent || '').trim());
      });
      if (!controls.length) return false;
      controls[Math.floor(r * controls.length)].setAttribute('data-compat-pick', '');
      return true;
    }, {id, skip: [...NOT_PLAY], r: random()});
    if (!picked) break;
    await page.locator('[data-compat-pick]').first().click({timeout: 2500}).catch(() => {});
    if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
    await snap(id, `own${i + 1}`);
  }
}

// Saves made with the deployed modules in Node -----------------------------------

// The same states and a few more (Undo, half way, one move from solved, Replay),
// made the way the deployed main.js makes them: Hint raises hintLevel and an
// applied hint is move(p, a, nextHint(p, a).action || .pair).
function nodeStates(E, p) {
  const states = [];
  let a = E.freshAttempt(p);
  states.push(['opened', a]);
  a = {...a, hintLevel: 1, helpUsed: true};
  states.push(['hint', a]);
  a = {...a, hintLevel: 3};
  const line = [];
  for (let i = 0; i < 400; i++) {
    if (E.isSolved(p, a.board)) break;
    let h;
    try { h = E.nextHint(p, a); } catch { break; }
    if (h?.type !== 'move') break;
    const next = E.move(p, a, h.action || h.pair, () => 0.5);
    if (!next || next === a) break;
    a = next; line.push(a);
  }
  line.slice(0, 3).forEach((s, i) => states.push([`move${i + 1}`, s]));
  if (line.length >= 3 && E.undo) { try { const u = E.undo(line[2]); if (u) states.push(['undo', u]); } catch { /* not every board undoes */ } }
  if (line.length > 6) states.push(['half', line[Math.floor(line.length / 2)]]);
  if (line.length > 4) states.push(['nearly', line.at(-2)]);
  if (line.length && E.isSolved(p, line.at(-1).board)) {
    states.push(['solved', line.at(-1)]);
    try { states.push(['replayed', E.restart(p, line.at(-1), () => 0.5)]); } catch { /* restart needs the board */ }
  }
  return states.map(([state, attempt]) => ({id: p.id, state, attempt: clone(attempt)}));
}

// Each trail of the deployed road played in order, its boards solved by hints;
// a snapshot of the explorer after the first encounter, half way and at the end.
function nodeRoads(D) {
  const roads = [];
  for (const band of D.road.BAND_KEYS) {
    const pr = {id: `road-${band}`, name: 'Compat', band, avatar: 0, sound: false, attempts: {}};
    D.road.startJourney(pr);
    const opened = [];
    for (let i = 0; i < 60; i++) {
      const progress = D.road.getProgress(pr);
      const trail = D.road.trailFor(pr), sides = D.road.SIDE.filter(e => D.road.canVisitEncounter(pr, e.id) && !trail.side.includes(e.id) && (!e.requires || D.road.hasTool(trail, e.requires)));
      const next = sides.length ? D.road.beginEncounter(pr, D.puzzles, sides[0].id) : progress.complete ? null : D.road.beginEncounter(pr, D.puzzles);
      if (!next) break;
      const {puzzle: p, encounter: e} = next;
      const states = nodeStates(D.engine, p), solved = states.find(s => s.state === 'solved');
      if (!solved) { pr.attempts[p.id] = states.find(s => s.state === 'move1')?.attempt || states[0].attempt; roads.push({band, stage: `stuck at ${e.id}`, profile: clone(pr)}); break; }
      // One snapshot holds this encounter part played, before its solve.
      const part = states.find(s => s.state === 'move1');
      if (part && (opened.length === 0 || opened.length === 10)) roads.push({band, stage: `playing ${e.id}`, profile: clone({...pr, attempts: {...pr.attempts, [p.id]: part.attempt}})});
      pr.attempts[p.id] = solved.attempt;
      D.road.recordSolve(pr, p.id, e.id, D.puzzles);
      opened.push(e.id);
      if (opened.length === 1 || opened.length === 11) roads.push({band, stage: `after ${e.id}`, profile: clone(pr)});
    }
    roads.push({band, stage: `end (${opened.length} encounters)`, profile: clone(pr)});
  }
  return roads;
}

// Checks against this checkout ---------------------------------------------------

function memoryStorage(values = {}) {
  const map = new Map(Object.entries(values));
  return {getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), map};
}
const storeOf = (profile, attempts) => ({schemaVersion: 1, contentVersion: 1, activeProfileId: profile.id, profiles: [{...profile, attempts}]});

// Attempts that come back from loadStore on a new board: started afresh by a
// repair or by an older migration (Mirror Couriers, Nim, L-tromino gardens), or dropped.
const restartedIn = (store, loaded) => store.profiles.flatMap((pr, i) => Object.entries(pr.attempts).filter(([id, a]) => {
  const now = loaded.store.profiles[i]?.attempts[id];
  return !now || now.moves !== a?.moves || JSON.stringify(now.board) !== JSON.stringify(a?.board) || JSON.stringify(now.history) !== JSON.stringify(a?.history);
}).map(([id]) => id));

// strict: validateStore (also what an import does). load: what the app shows
// (loadStore over a stand-in for localStorage). repairs: what loadStore resets
// or drops, where this checkout repairs saves on load.
function checkStore(C, store) {
  let strict = null, repairs = [];
  try { C.storage.validateStore(store, C.puzzles); } catch (error) { strict = error.message; }
  if (strict && C.storage.repairStore) { try { repairs = C.storage.repairStore(store, C.puzzles).repairs; } catch { /* a store-level problem */ } }
  const text = JSON.stringify(store), storage = memoryStorage({[C.storage.SAVE_KEY]: text});
  const loaded = C.storage.loadStore(storage, C.puzzles);
  const lost = loaded.store.profiles.length !== store.profiles.length;
  return {
    strict, lost, warning: loaded.warning, restarted: lost ? [] : restartedIn(store, loaded),
    resets: repairs.filter(r => r.reset).map(r => r.puzzleId), dropped: repairs.filter(r => !r.reset).map(r => r.puzzleId),
    starsKept: !lost && store.profiles.every((pr, i) => Object.entries(pr.attempts).every(([id, a]) => a?.completed !== true || loaded.store.profiles[i].attempts[id]?.completed === true)),
    originalKept: strict && C.storage.REPAIR_KEY ? storage.getItem(C.storage.REPAIR_KEY) === text : null,
  };
}

// Which saved attempts make the strict validator fail: take out the named one
// (or, for a road board a finished encounter needs, start it afresh) and retry.
function failingAttempts(C, store) {
  const found = [], work = clone(store);
  for (let i = 0; i < 2000; i++) {
    let message;
    try { C.storage.validateStore(work, C.puzzles); return {found, rest: null}; } catch (error) { message = error.message; }
    const pr = work.profiles.find(pr => Object.keys(pr.attempts).some(id => message.includes(` ${id} `)));
    const id = pr && Object.keys(pr.attempts).find(id => message.includes(` ${id} `));
    if (!id) return {found, rest: message};
    found.push({id, reason: message});
    const p = C.all.find(q => q.id === id);
    if (p && pr.attempts[id]?.completed === true) pr.attempts[id] = {...C.engine.freshAttempt(C.road.resolvePuzzle(p, pr)), completed: true, helpUsed: pr.attempts[id].helpUsed === true};
    else delete pr.attempts[id];
  }
  return {found, rest: 'too many'};
}

async function browserLoads(browser, base, stores) {
  const context = await browser.newContext({viewport: {width: 1024, height: 768}, serviceWorkers: 'block'});
  const page = await context.newPage(), results = [];
  page.on('pageerror', e => results.push({label: 'page error', error: e.message}));
  try {
    await page.goto(base);
    await page.locator('#nickname').waitFor();
    for (const {label, store} of stores) {
      await page.evaluate(({key, value}) => { for (const k of Object.keys(localStorage)) if (k.startsWith('small-math-adventure:')) localStorage.removeItem(k); localStorage.setItem(key, value); }, {key: SAVE_KEY, value: JSON.stringify(store)});
      await page.reload();
      await page.locator('#main').waitFor();
      const banner = await page.locator('.error-banner').count() ? (await page.locator('.error-banner').innerText()).trim() : '';
      // An unreadable save leaves no explorer, so the app asks for a new one.
      results.push({label, warning: banner, couldNotRead: /could not be read/.test(banner), explorersLost: await page.locator('#nickname').isVisible()});
    }
  } finally { await context.close(); }
  return results;
}

// Report ----------------------------------------------------------------------------

function summarize(rows) {
  const families = {};
  for (const r of rows) {
    const f = (families[r.chunk] ||= {puzzles: new Set(), states: 0, failing: {}, restarted: {}});
    if (!r.id.startsWith('(')) f.puzzles.add(r.id);
    if (!r.restartedOnly) f.states++;
    if (r.restarted?.includes(r.id)) { const x = (f.restarted[r.id] ||= {states: new Set(), how: new Set(), starsKept: true}); x.states.add(r.state); x.how.add(r.how || (r.strict ? 'repair' : 'migration')); x.starsKept &&= r.starsKept !== false; }
    if (r.strict) (f.failing[r.id] ||= {states: [], reasons: new Set(), lost: false, source: new Set()});
    if (r.strict) { const x = f.failing[r.id]; x.states.push(r.state); x.reasons.add(r.strict); x.lost ||= r.lost; x.source.add(r.source); }
  }
  return Object.fromEntries(Object.entries(families).sort().map(([c, f]) => [c, {
    puzzles: f.puzzles.size, states: f.states,
    failing: Object.fromEntries(Object.entries(f.failing).map(([id, x]) => [id, {states: [...new Set(x.states)], reasons: [...x.reasons], storeLost: x.lost, source: [...x.source]}])),
    restarted: Object.fromEntries(Object.entries(f.restarted).map(([id, x]) => [id, {states: [...x.states], how: [...x.how], starsKept: x.starsKept}])),
  }]));
}

async function main() {
  prepareDeployed();
  const D = await loadBuild(deployedDir);
  const deployed = existsSync(join(out, 'deployed.json')) ? readJSON(join(out, 'deployed.json')) : {dir: deployedDir};
  log(`deployed: ${deployed.commit || deployedDir} (${D.puzzles.length} puzzles, ${D.all.length} with road boards)`);
  let browser;
  try {
    if (mode !== 'check' && browserOn) {
      const base = await serve(ports.deployed, deployedDir);
      browser = await launch();
      for (const [chunk, puzzles] of chunks(D)) await playChunk(browser, base, chunk, puzzles);
    }
    if (mode === 'make') return;

    const C = await loadBuild(currentDir);
    log(`current: ${C.puzzles.length} puzzles, ${C.all.length} with road boards; repair on load: ${C.storage.REPAIR_KEY ? 'yes' : 'no'}`);
    const shell = {id: 'compat', name: 'Compat', band: 'k1', avatar: 0, sound: false};
    const rows = [], combined = [];

    // Browser-made saves: every snapshot alone, and each chunk's final save.
    const files = existsSync(savesDir) ? readdirSync(savesDir).filter(f => f.endsWith('.json')).filter(f => !only || only.has(f.slice(0, -5))) : [];
    const everything = {};
    let everyone = null, browserPuzzles = 0, browserSnapshots = 0, browserProblems = [];
    for (const f of files.sort()) {
      const made = readJSON(join(savesDir, f));
      browserPuzzles += made.puzzles; browserSnapshots += made.snapshots.length; browserProblems.push(...made.problems.map(p => ({chunk: made.chunk, ...p})));
      const saved = made.save ? JSON.parse(made.save) : null, profile = saved?.profiles?.[0];
      const base = profile ? Object.fromEntries(Object.entries(profile).filter(([k]) => k !== 'attempts')) : shell;
      for (const s of made.snapshots) {
        const r = checkStore(C, storeOf(base, {[s.id]: s.attempt}));
        rows.push({source: 'browser', chunk: made.chunk, id: s.id, state: s.state, ...r});
      }
      if (saved) { combined.push({label: `browser ${made.chunk}`, store: saved}); Object.assign(everything, profile.attempts); everyone ||= base; }
    }
    if (everyone) combined.push({label: 'browser, every chunk in one explorer', store: storeOf(everyone, everything)});

    // Node-made saves from the deployed modules: every catalog puzzle and the road.
    let nodeCount = 0;
    for (const [chunk, puzzles] of chunks(D)) for (const p of puzzles) {
      let states;
      try { states = nodeStates(D.engine, p); } catch (error) { rows.push({source: 'node', chunk, id: p.id, state: 'make', strict: `could not make: ${error.message}`, lost: false}); continue; }
      for (const s of states) { nodeCount++; rows.push({source: 'node', chunk, id: s.id, state: s.state, ...checkStore(C, storeOf(shell, {[s.id]: s.attempt}))}); }
    }
    const roads = !only || only.has('road') ? nodeRoads(D) : [];
    for (const r of roads) {
      const store = storeOf(r.profile, r.profile.attempts), result = checkStore(C, store);
      combined.push({label: `node road ${r.band}, ${r.stage}`, store});
      const {found, rest} = result.strict ? failingAttempts(C, store) : {found: [], rest: null};
      for (const x of found) rows.push({source: 'node-road', chunk: 'road', id: x.id, state: r.stage, strict: x.reason, lost: result.lost});
      if (rest) rows.push({source: 'node-road', chunk: 'road', id: `(${r.band} explorer)`, state: r.stage, strict: rest, lost: result.lost});
      if (!result.strict) rows.push({source: 'node-road', chunk: 'road', id: `(${r.band} explorer)`, state: r.stage, strict: null, lost: result.lost});
      for (const id of Object.keys(r.profile.attempts)) rows.push({source: 'node-road', chunk: 'road', id, state: r.stage, strict: null, restarted: result.restarted.includes(id) ? [id] : [], how: found.some(x => x.id === id) ? 'repair' : 'migration', starsKept: result.starsKept, restartedOnly: true});
    }

    const results = combined.map(({label, store}) => ({label, attempts: store.profiles.reduce((n, p) => n + Object.keys(p.attempts).length, 0), bytes: JSON.stringify(store).length, ...checkStore(C, store)}));
    let browserResults = [];
    if (browserOn && combined.length) {
      const base = await serve(ports.current, process.env.CURRENT_DIR ? currentDir : null);
      browser ||= await launch();
      browserResults = await browserLoads(browser, base, combined);
    }
    const families = summarize(rows);
    const failingIds = new Set(rows.filter(r => r.strict).map(r => r.id));
    const report = {
      deployed, current: currentDir, checkedAt: new Date().toISOString(), repairOnLoad: Boolean(C.storage.REPAIR_KEY),
      totals: {
        deployedPuzzles: D.puzzles.length, deployedWithRoad: D.all.length, browserPuzzles, browserSnapshots, nodeSnapshots: nodeCount, roadSnapshots: roads.length,
        puzzlesFailingStrict: failingIds.size, puzzlesRestarting: new Set(rows.filter(r => r.restarted?.includes(r.id)).map(r => r.id)).size, statesFailingStrict: rows.filter(r => r.strict).length, statesLosingStore: rows.filter(r => r.lost).length, starsLost: rows.filter(r => r.starsKept === false && !r.lost).length,
      },
      combined: results.map(({resets, dropped, ...r}) => ({...r, resets: resets.length, dropped: dropped.length})),
      browserLoads: browserResults, browserProblems, families,
    };
    writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.totals, null, 2));
    for (const [chunk, f] of Object.entries(families)) {
      const ids = Object.keys(f.failing);
      if (ids.length) console.log(`${chunk}: ${ids.length} of ${f.puzzles} puzzles fail strict validation${ids.some(id => f.failing[id].storeLost) ? ' and empty the whole store on load' : ', repaired on load'}: ${ids.join(', ')}`);
      const again = Object.keys(f.restarted);
      if (again.length) console.log(`${chunk}: ${again.length} of ${f.puzzles} puzzles start afresh on load (${[...new Set(again.flatMap(id => f.restarted[id].how))].join(', ')}${again.every(id => f.restarted[id].starsKept) ? ', stars kept' : ', SOME STARS LOST'}): ${again.join(', ')}`);
    }
    for (const r of results) if (r.lost || r.strict) console.log(`${r.label}: ${r.lost ? 'STORE LOST' : 'repaired'} (${r.attempts} attempts, ${r.resets.length} reset, ${r.dropped.length} dropped, ${r.bytes} bytes)${r.lost ? ': ' + r.strict : ''}`);
    for (const r of browserResults) if (r.warning || r.error) console.log(`browser ${r.label}: ${r.error || r.warning}`);
    console.log(`Report: ${join(out, 'report.json')}`);
    if (rows.some(r => r.lost) || results.some(r => r.lost) || browserResults.some(r => r.couldNotRead || r.explorersLost || r.error)) process.exitCode = 1;
  } finally {
    await browser?.close();
    stopServers();
  }
}
main().catch(error => { console.error(error); stopServers(); process.exitCode = 1; });
