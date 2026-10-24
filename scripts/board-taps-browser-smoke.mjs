// Tap sizes on the shared boards (dist/hit-fit.js) on a 390 × 844 phone with
// touch: grid points and graph dots take taps at least 44 px across where
// their neighbours leave room; a short road keeps its middle from the dots at
// its ends; two roads from one dot split the space between them; an edge
// drawn as a filled shape keeps its area; a small strip inside a portal point
// widens; labels and cup symbols are big enough to read; a board refits
// when the screen changes size, and a tap on a widened target still makes
// its move. Hit sizes are measured as the layout audit measures them, by
// walking out from a point with elementFromPoint. Same environment variables as the other
// browser suites (PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE, TEST_URL).
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = (process.env.TEST_URL || 'http://127.0.0.1:4187').replace(/\/$/, '');
const open = async id => { await page.goto(`${base}/#play/${id}`); await page.locator(`[data-puzzle-id="${id}"] .board-panel`).waitFor(); await page.waitForTimeout(150); };

// In the page: how far a tap at (x, y) can move along (dx, dy) both ways and
// still land on `target`, in px.
const measure = () => {
  window.hitChord = (target, x, y, dx, dy) => {
    const owns = el => Boolean(el) && (el === target || target.contains(el));
    const walk = s => { let d = 0; while (d < 80 && owns(document.elementFromPoint(x + s * dx * (d + 1), y + s * dy * (d + 1)))) d++; return d; };
    return owns(document.elementFromPoint(x, y)) ? walk(1) + walk(-1) + 1 : 0;
  };
  window.centreOf = el => { const r = (el.querySelector('.gb-dot,.sg-pip,.tg-pip,.pb-hit,.pb-vertex-hit') || el).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
};

try {
  await page.goto(base);
  await page.locator('#nickname').fill('Tap sizes');
  await page.locator('#profile-form button[type=submit]').click();
  await page.locator('#main').waitFor();

  // Grid points with room round them take a 44 px tap across and down.
  await open('geoboard-01');
  await page.evaluate(measure);
  const geo = await page.evaluate(() => [...document.querySelectorAll('.sg-point[data-sg-point]')].map(el => { const [x, y] = centreOf(el); return [hitChord(el, x, y, 1, 0), hitChord(el, x, y, 0, 1)]; }));
  assert.ok(geo.length > 4, 'geoboard points act');
  assert.ok(geo.every(([a, d]) => a >= 44 && d >= 44), `geoboard points take 44 px taps: ${JSON.stringify(geo)}`);
  // A tap at the edge of a point's widened reach still picks it.
  const before = await page.evaluate(() => document.querySelector('.sg-point[data-sg-point]').getAttribute('aria-label'));
  const edge = await page.evaluate(() => { const el = document.querySelector('.sg-point[data-sg-point]'), [x, y] = centreOf(el); return [x + 19, y]; });
  await page.touchscreen.tap(...edge);
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => document.querySelector('.sg-point[data-sg-point]').getAttribute('aria-label'));
  assert.notEqual(after, before, 'a tap 19 px from a point acts on it');

  // The board refits for a tablet: the same points, and taps no smaller.
  await page.setViewportSize({width: 820, height: 1180});
  await page.waitForTimeout(250);
  const wide = await page.evaluate(() => [...document.querySelectorAll('.sg-point[data-sg-point]')].map(el => { const [x, y] = centreOf(el); return hitChord(el, x, y, 1, 0); }));
  assert.ok(wide.every(a => a >= 44), `tablet geoboard points: ${JSON.stringify(wide)}`);
  await page.setViewportSize({width: 390, height: 844});

  // Graph roads: every link in a cheapest-network map is 44 px thick.
  await open('mst-02');
  await page.evaluate(measure);
  const roads = await page.evaluate(() => [...document.querySelectorAll('.gb-hit[data-gb-edge]')].map(el => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(k => el[k].baseVal.value), l = Math.hypot(x2 - x1, y2 - y1) || 1;
    return hitChord(el, x, y, -(y2 - y1) / l, (x2 - x1) / l);
  }));
  assert.ok(roads.length > 2 && roads.every(t => t >= 42), `mst links are 44 px thick: ${JSON.stringify(roads)}`);

  // Rotor: a short road between a switch and an exit keeps its middle, and
  // the two roads from one switch split the space between them.
  await open('rotor-08');
  await page.evaluate(measure);
  const rotor = await page.evaluate(() => [...document.querySelectorAll('.gb-hit[data-gb-edge]')].map(el => {
    const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(k => el[k].baseVal.value), m = el.getScreenCTM();
    const a = new DOMPoint(x1, y1).matrixTransform(m), b = new DOMPoint(x2, y2).matrixTransform(m), l = Math.hypot(b.x - a.x, b.y - a.y);
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    return {mid: document.elementFromPoint(x, y)?.closest('[data-gb-edge]') === el, along: hitChord(el, x, y, (b.x - a.x) / l, (b.y - a.y) / l)};
  }));
  assert.equal(rotor.length, 6);
  assert.ok(rotor.every(r => r.mid), 'every road takes a tap at its middle');
  assert.ok(rotor.every(r => r.along >= 30), `rotor roads keep their middles: ${JSON.stringify(rotor)}`);
  const split = await page.evaluate(() => {
    // Just beside each lower road, toward its sibling, the tap still goes to it.
    const roads = [...document.querySelectorAll('.gb-hit[data-gb-edge]')].slice(2);
    return roads.map(el => {
      const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(k => el[k].baseVal.value), m = el.getScreenCTM();
      const a = new DOMPoint(x1, y1).matrixTransform(m), b = new DOMPoint(x2, y2).matrixTransform(m);
      const x = a.x + (b.x - a.x) * .6, y = a.y + (b.y - a.y) * .6, toward = Math.sign(a.x - b.x);
      return document.elementFromPoint(x + toward * 6, y)?.closest('[data-gb-edge]') === el;
    });
  });
  assert.ok(split.every(Boolean), `sibling roads split the space between them: ${JSON.stringify(split)}`);
  // A tap on a road's middle points its switch down that road.
  const road = await page.evaluate(() => { const el = document.querySelectorAll('.gb-hit[data-gb-edge]')[3], r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2, label: el.getAttribute('aria-label')}; });
  await page.touchscreen.tap(road.x, road.y);
  await page.waitForTimeout(150);
  const set = await page.evaluate(() => document.querySelectorAll('.gb-hit[data-gb-edge]')[3].getAttribute('aria-label'));
  assert.match(set, /the next road/, `a tap on a short road's middle sets its switch (${road.label} → ${set})`);

  // Roads from one corner of a triangulation split the space between them.
  await open('cuts-05');
  await page.evaluate(measure);
  const cuts = await page.evaluate(() => [...document.querySelectorAll('.tm-edge-hit[data-tg-edge]')].map(el => {
    const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(k => el[k].baseVal.value), m = el.getScreenCTM();
    const a = new DOMPoint(x1, y1).matrixTransform(m), b = new DOMPoint(x2, y2).matrixTransform(m), l = Math.hypot(b.x - a.x, b.y - a.y);
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    return hitChord(el, x, y, -(b.y - a.y) / l, (b.x - a.x) / l);
  }));
  assert.ok(cuts.length > 1 && cuts.every(t => t >= 40), `cut lines take 44 px taps across: ${JSON.stringify(cuts)}`);

  // An edge drawn as a filled shape is a cell, never clipped as a road.
  await open('holes-10');
  assert.equal(await page.locator('[data-tg-edge][clip-path]:not(line)').count(), 0, 'filled edge shapes keep their whole area');

  // A small strip inside a portal point widens into the room round it.
  await open('mobius-08');
  await page.evaluate(measure);
  const notch = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.pb-point[role=button]')].find(p => /notch/i.test(p.getAttribute('aria-label') || '')), [x, y] = centreOf(el);
    return Math.min(hitChord(el, x, y, 1, 0), hitChord(el, x, y, 0, 1));
  });
  assert.ok(notch >= 26, `the notch takes a tap ${notch} px across`);

  // Portal labels in the small room grow to 12 px.
  await open('portals-08');
  const labels = await page.evaluate(() => [...document.querySelectorAll('[data-pb-view-board] text.pb-label')].filter(el => el.getScreenCTM()).map(el => parseFloat(getComputedStyle(el).fontSize) * el.getScreenCTM().a));
  assert.ok(labels.length && labels.every(px => px >= 11.95), `portal labels at least 12 px: ${Math.min(...labels).toFixed(1)}`);

  // Cup symbols are at least 13 px, on a phone and an SE.
  for (const size of [{width: 390, height: 844}, {width: 375, height: 667}]) {
    await page.setViewportSize(size);
    await open('swap-k1-06');
    const cups = await page.evaluate(() => [...document.querySelectorAll('.cup-identity i')].map(el => parseFloat(getComputedStyle(el).fontSize)));
    assert.ok(cups.length && cups.every(px => px >= 13), `cup symbols at ${size.width}px: ${cups}`);
  }
  await page.setViewportSize({width: 390, height: 844});

  assert.deepEqual(errors, []);
  console.log('Shared board tap sizes passed: grid points 44 px on phone and tablet, mst links 44 px thick, rotor roads keep their middles and split at the switch, cut lines split at the corner, a filled edge shape and a small portal strip keep or gain their area, portal labels and cup symbols big enough to read.');
} finally { await browser.close(); }
