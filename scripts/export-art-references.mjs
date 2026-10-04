// Renders every art slot's drawn placeholder to a PNG at the slot's shape, as a
// composition guide for image generation (artwork/road4/reference/). The map
// guides also mark where each stop button sits. Needs Playwright.
//   node scripts/export-art-references.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { artSlots } from '../dist/art-slots.js';
import { keeperArt, sceneArt, mapArt, wagonArt, toolArt, finaleArt, MAP_POINTS } from '../dist/road-placeholders.js';
import { companionSvg } from '../dist/caravan-art.js';
import { CAST } from '../dist/road-cast.js';
import { STOPS } from '../dist/road.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = new URL('../artwork/road4/reference/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch(), page = await browser.newPage();
const titles = Object.fromEntries(STOPS.map(s => [s.id, s.title]));
function svgFor(slot) {
  const [kind, a, b] = slot.id.split('/');
  if (kind === 'map' && (a === 'wide' || a === 'tall')) {
    const marks = Object.entries(MAP_POINTS[a]).map(([id, [x, y]]) => `<div style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;border:4px solid #e0245e;background:#fff8"></div><div style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,22px);font:600 20px system-ui;color:#e0245e;background:#fff;padding:2px 8px;border-radius:8px;white-space:nowrap">${titles[id]} (${x}%, ${y}%)</div>`).join('');
    return `<div style="position:relative;width:100%;height:100%">${mapArt(a)}${marks}</div>`;
  }
  if (kind === 'map') return wagonArt(a === 'wagon-plume' ? 'plume' : 'party');
  if (kind === 'finale') return finaleArt();
  if (kind === 'tool') return toolArt(a);
  if (kind === 'party') return companionSvg(a);
  if (kind === 'keeper') return keeperArt(a, b, CAST[a].color);
  if (kind === 'scene') return sceneArt(a, Number(b.split('-').at(-1)));
  return '';
}
for (const slot of artSlots()) {
  const scale = Math.min(1, 1200 / slot.w), w = Math.round(slot.w * scale), h = Math.round(slot.h * scale);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${slot.transparent ? 'transparent' : '#fff'}}svg{display:block;width:100%;height:100%}</style>${svgFor(slot)}`);
  await page.screenshot({ path: new URL(`${slot.id.replaceAll('/', '_')}.png`, out).pathname, omitBackground: Boolean(slot.transparent) });
}
await writeFile(new URL('README.md', out), `# Placeholder references\n\nOne PNG per art slot, rendered from the drawn placeholders by \`scripts/export-art-references.mjs\`. Use them as composition guides (what is where, what changes between stages), not as style references. File names replace “/” in the slot ID with “_”. The map guides mark each stop button’s position in red; keep each stop’s landmark under its mark.\n`);
console.log(`Wrote ${artSlots().length} references.`);
await browser.close();
