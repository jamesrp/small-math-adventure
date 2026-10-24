// Reload stress: does the app start every time once its service worker is in
// charge? A fresh browser context opens the app, makes an explorer, waits for
// the worker to control the page with every asset cached, opens a road board,
// then reloads it RELOAD_COUNT times. A reload that shows the start-up failure
// screen (or no board within a minute) is a failure, and for each one the
// harness records which requests failed and how:
//
//   server        the server answered an error (serve.mjs: 404 missing, 500 read error)
//   worker-fetch  the worker's own network fallback failed (dist/sw.js `fetch`)
//   chromium      the page's request was cancelled (net::ERR_ABORTED) with no
//                 error from the server or the worker's fetch; with tracing on,
//                 the trace names the step that gave up
//   other         anything else (its net error is listed)
//
// It serves dist/ itself, in process, through scripts/serve.mjs's handler, so
// every server answer is seen (TEST_URL uses another server instead, and then
// only what the page and the worker saw). Results go to
// test-results/reload-stress/. Exit code 1 when any reload failed, 2 when the
// run stopped early: the browser closed, or RELOAD_TIMEOUT minutes passed
// (default: a minute per reload per context, at least 10). The summary still
// counts the reloads done.
//
// Environment: PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE; RELOAD_COUNT (default
// 200); RELOAD_CONTEXTS (contexts reloading side by side, default 1);
// RELOAD_LOAD (busy threads loading the machine meanwhile, default 0);
// RELOAD_WORKER=block (no service worker, every request to the server);
// RELOAD_TRACE=0 (no trace ring buffer); RELOAD_PORT; TEST_URL;
// RELOAD_FAULT=server or abort, a self-check of the classifier: on the second
// reload, stars.js gets a 500 read error from the server, or the browser
// aborts it (with RELOAD_WORKER=block, so the request reaches the network).
//
//   node scripts/reload-stress.mjs                          # 200 reloads, quiet machine
//   RELOAD_COUNT=400 RELOAD_CONTEXTS=3 RELOAD_LOAD=4 node scripts/reload-stress.mjs
import http from 'node:http';
import { Worker } from 'node:worker_threads';
import { mkdir, writeFile } from 'node:fs/promises';
import { distHandler } from './serve.mjs';
import { waitForOffline } from './browser-offline.mjs';

// Playwright reports the worker's own requests only with this set.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ??= '1';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const count = Number(process.env.RELOAD_COUNT || 200), contexts = Number(process.env.RELOAD_CONTEXTS || 1), load = Number(process.env.RELOAD_LOAD || 0);
const deadline = Date.now() + 60000 * Number(process.env.RELOAD_TIMEOUT || Math.max(10, count));
const block = process.env.RELOAD_WORKER === 'block', tracing = process.env.RELOAD_TRACE !== '0' && !block;
const output = new URL('../test-results/reload-stress/', import.meta.url), stamp = Date.now();
await mkdir(output, { recursive: true });

// The server: every answer that wasn't a 200 or 206, by path.
const served = [], fault = process.env.RELOAD_FAULT, FAULT_PATH = '/families/stars/stars.js';
let server = null, faultArmed = false, base = process.env.TEST_URL?.replace(/\/$/, '');
if (!base) {
  const read = async file => { if (fault === 'server' && faultArmed && file.endsWith(FAULT_PATH)) throw Object.assign(new Error('EIO'), { code: 'EIO' }); return (await import('node:fs/promises')).readFile(file); };
  server = http.createServer(distHandler({ read, log: () => {}, onResponse: r => { if (r.status !== 200 && r.status !== 206) served.push({ ...r, at: Date.now() }); } }));
  await new Promise(done => server.listen(Number(process.env.RELOAD_PORT || 0), '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
}
// Load: busy threads for the whole run.
const burners = Array.from({ length: load }, () => new Worker('let x=0;for(;;)x=Math.sqrt(x+1);', { eval: true }));

const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
// Stop, keeping what was counted, when the browser goes away or time runs out;
// a reload that cannot finish then is not counted as a failure.
let stopped = null;
browser.on('disconnected', () => { stopped ??= 'browser closed'; });
const timer = setTimeout(() => { stopped ??= 'timeout'; }, deadline - Date.now());
setTimeout(() => { console.error('reload-stress: no clean stop two minutes after the timeout'); process.exit(2); }, deadline - Date.now() + 120000).unref();
const pathOf = url => { try { return new URL(url).pathname; } catch { return url; } };

// The trace: a ring buffer of the browser's ServiceWorker and loading events,
// read back after a failure.
const bcdp = tracing ? await browser.newBrowserCDPSession() : null;
// 32 MB keeps the last few reloads and stays well inside a string's length.
const startTrace = () => bcdp?.send('Tracing.start', { transferMode: 'ReturnAsStream', traceConfig: { recordMode: 'recordContinuously', traceBufferSizeInKb: 32 * 1024, includedCategories: ['ServiceWorker', 'loading', 'blink.resource', 'navigation'] } });
async function readTrace() {
  if (!bcdp) return null;
  const done = new Promise(resolve => bcdp.once('Tracing.tracingComplete', resolve));
  await bcdp.send('Tracing.end');
  const { stream } = await done;
  const chunks = [];
  for (;;) { const r = await bcdp.send('IO.read', { handle: stream, size: 1 << 20 }); chunks.push(Buffer.from(r.data, r.base64Encoded ? 'base64' : 'utf8')); if (r.eof) break; }
  await bcdp.send('IO.close', { handle: stream });
  await startTrace();
  return Buffer.concat(chunks).toString();
}
// What gave up, from the trace: every service-worker load that completed with an error.
function traceErrors(data) {
  const events = JSON.parse(data), list = Array.isArray(events) ? events : events.traceEvents;
  return list.filter(e => /CommitCompleted|OnBodyReadingComplete|OnConnectionClosed|FetchDataLoadFailed|ResponseRejected/.test(e.name) && e.args && e.args.error_code && e.args.error_code !== 'net::OK')
    .map(e => ({ name: e.name, error: e.args.error_code, reason: e.args.reason }));
}

async function run(index) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: block ? 'block' : 'allow' });
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  let events = [], document = null;
  await cdp.send('Network.enable'); await cdp.send('Page.enable');
  const requests = new Map();
  cdp.on('Page.frameNavigated', e => { if (!e.frame.parentId) document = e.frame.loaderId; });
  cdp.on('Network.requestWillBeSent', e => requests.set(e.requestId, { url: e.request.url, document: e.loaderId }));
  cdp.on('Network.loadingFailed', e => { const r = requests.get(e.requestId) || {}; events.push({ kind: 'page-failed', path: pathOf(r.url), document: r.document, error: e.errorText, canceled: Boolean(e.canceled), at: Date.now() }); });
  cdp.on('Network.responseReceived', e => { if (e.response.status >= 400) events.push({ kind: 'page-status', path: pathOf(e.response.url), status: e.response.status, fromWorker: e.response.fromServiceWorker, at: Date.now() }); });
  context.on('requestfailed', r => { if (r.serviceWorker()) events.push({ kind: 'worker-fetch-failed', path: pathOf(r.url()), error: r.failure()?.errorText, at: Date.now() }); });
  context.on('response', r => { if (r.request().serviceWorker() && r.status() >= 400) events.push({ kind: 'worker-fetch-status', path: pathOf(r.url()), status: r.status(), at: Date.now() }); });
  page.on('pageerror', e => events.push({ kind: 'page-error', message: e.message.slice(0, 300), at: Date.now() }));

  await page.goto(base);
  await page.locator('#nickname').fill(`Stress ${index}`); await page.locator('[name=band][value="23"]').check(); await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.lr-overview').waitFor({ timeout: 60000 });
  if (!block) {
    await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(done => navigator.serviceWorker.addEventListener('controllerchange', done, { once: true })); });
    await waitForOffline(page);
  }
  await page.locator('[data-action=start-journey]:visible').first().click(); await page.locator('.board-panel').waitFor({ timeout: 60000 });
  if (fault === 'abort') await context.route(`**${FAULT_PATH}`, route => faultArmed ? route.abort('aborted') : route.continue());
  const failures = [], times = [];
  for (let i = 0; i < count && !stopped; i++) {
    events = []; const from = Date.now(), servedFrom = served.length;
    faultArmed = Boolean(fault) && i === 1;
    await page.reload({ timeout: 60000 }).catch(() => {});
    const result = await Promise.race([
      page.locator('.board-panel').waitFor({ timeout: 60000 }).then(() => 'ok'),
      page.locator('.startup-failed').waitFor({ timeout: 60000 }).then(() => 'failure screen'),
    ]).catch(() => 'no board in 60 s');
    if (stopped || page.isClosed()) { stopped ??= 'page closed'; break; }
    times.push(Date.now() - from);
    if (i % 50 === 49) console.log(JSON.stringify({ context: index, reloads: i + 1, failures: failures.length + (result === 'ok' ? 0 : 1) }));
    if (result === 'ok') continue;
    const here = events.filter(e => e.kind !== 'page-failed' || e.document === document);
    const server = served.slice(servedFrom);
    const failed = here.filter(e => e.kind === 'page-failed' || (e.kind === 'page-status' && !e.fromWorker));
    const requests = failed.filter((f, k) => failed.findIndex(g => g.path === f.path) === k).map(f => {
      const answer = server.find(s => s.path === f.path), worker = here.find(e => e.kind.startsWith('worker-fetch') && e.path === f.path);
      const how = answer ? 'server' : worker ? 'worker-fetch' : f.canceled ? 'chromium' : 'other';
      return { path: f.path, how, error: f.error || null, status: f.status || answer?.status || worker?.status || null, serverCode: answer?.code || null, workerError: worker?.error || null };
    });
    const trace = await readTrace().catch(() => null);
    let errors = null; try { errors = trace && traceErrors(trace); } catch {}
    const record = { context: index, reload: i, result, ms: Date.now() - from, controlled: await page.evaluate(() => Boolean(navigator.serviceWorker.controller)).catch(() => null), requests, pageErrors: here.filter(e => e.kind === 'page-error').map(e => e.message), serverErrors: server, traceErrors: errors };
    failures.push(record);
    const name = `failure-${stamp}-${index}-${i}`;
    await writeFile(new URL(`${name}.json`, output), JSON.stringify(record, null, 1));
    if (trace) await writeFile(new URL(`${name}.trace.json`, output), trace);
    console.log(JSON.stringify(record));
  }
  await context.close().catch(() => {});
  return { failures, times };
}

let results;
try {
  await startTrace();
  results = await Promise.all(Array.from({ length: contexts }, (_, i) => run(i).catch(error => { if (stopped) return { failures: [], times: [] }; throw error; })));
} finally {
  clearTimeout(timer);
  stopped ??= false; // closing the browser below is not a stop
  await browser.close().catch(() => {});
  for (const b of burners) await b.terminate();
  server?.close();
}
const failures = results.flatMap(r => r.failures), times = results.flatMap(r => r.times).sort((a, b) => a - b);
const summary = { url: base, worker: block ? 'blocked' : 'on', stopped, reloads: times.length, contexts, load, failures: failures.length, byKind: Object.fromEntries(['server', 'worker-fetch', 'chromium', 'other'].map(k => [k, failures.filter(f => f.requests.some(r => r.how === k)).length])), medianMs: times[times.length >> 1], slowestMs: times.at(-1), records: failures };
await writeFile(new URL(`summary-${stamp}.json`, output), JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ ...summary, records: undefined }));
process.exit(failures.length ? 1 : stopped ? 2 : 0);
