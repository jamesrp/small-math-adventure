// Renders every art slot's drawn placeholder to a PNG at the slot's shape, as a
// composition guide for image generation (artwork/road4/reference/). The map
// guides also mark where each stop button sits, and the stage guides outline
// the areas the game draws its puzzle pieces in. Needs Playwright.
//   node scripts/export-art-references.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { artSlots } from '../dist/art-slots.js';
import { keeperArt, sceneArt, mapArt, wagonArt, toolArt, finaleArt, MAP_POINTS } from '../dist/road-placeholders.js';
import { ferryStage, marshStage, bellArt, hopsArt } from '../dist/stage-placeholders.js';
import { companionSvg } from '../dist/caravan-art.js';
import { CAST } from '../dist/road-cast.js';
import { STOPS } from '../dist/road.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = new URL('../artwork/road4/reference/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch(), page = await browser.newPage();
const titles = Object.fromEntries(STOPS.map(s => [s.id, s.title]));
// Red outlines for the stage guides, in the 1600 × 900 picture
// (docs/art/batches/03-stage-boards.md).
const red = 'fill="none" stroke="#e0245e" stroke-width="6"', note = (x, y, text) => `<text x="${x}" y="${y}" font-family="system-ui" font-size="28" font-weight="700" fill="#e0245e" stroke="#fff" stroke-width="6" paint-order="stroke">${text}</text>`;
const crops = `<g ${red} stroke-dasharray="18 14" stroke-width="4"><rect x="200" y="3" width="1200" height="894"/></g>${note(210, 890, 'phone view')}`;
const covered = `<g ${red} stroke-dasharray="6 8"><rect x="3" y="3" width="330" height="110"/><rect x="3" y="787" width="250" height="110"/></g>${note(14, 100, 'Plume’s card')}${note(14, 780, 'keeper portrait')}`;
const STAGE_MARKS = {
  ferry: `<g ${red}><ellipse cx="650" cy="548" rx="470" ry="208"/><path d="M400 470H900M330 645H970" stroke-dasharray="10 10"/><rect x="1078" y="40" width="30" height="750"/><rect x="1384" y="40" width="30" height="735"/><rect x="1060" y="24" width="372" height="36"/><circle cx="1245" cy="60" r="12"/><rect x="1110" y="250" width="270" height="530" stroke-dasharray="14 10"/><polygon points="1040,610 1410,560 1410,780 1040,790"/><rect x="15" y="470" width="220" height="170" stroke-dasharray="10 10"/><rect x="1380" y="480" width="220" height="220" stroke-dasharray="4 8"/></g>
    <rect x="700" y="3" width="897" height="894" fill="none" stroke="#e0245e" stroke-width="4" stroke-dasharray="40 14"/>
    ${note(470, 360, 'deck: seats, travelers, lamps')}${note(1122, 300, 'bell wheels')}${note(1256, 100, 'bell')}${note(1050, 840, 'bow platform')}${note(20, 462, 'wagon')}${note(1400, 470, 'face')}${note(710, 40, 'phone bell view →')}`,
  marsh: `<g ${red}><rect x="300" y="220" width="1000" height="600"/><rect x="500" y="800" width="600" height="100" stroke-dasharray="10 10"/></g>${note(320, 260, 'open water: boardwalks, platforms, lamps')}${note(560, 860, 'bank: Hops starts here')}`,
};
const stageGuide = (art, marks) => `<div style="position:relative;width:100%;height:100%">${art}<svg viewBox="0 0 1600 900" style="position:absolute;inset:0">${marks}${crops}${covered}</svg></div>`;
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
  if (kind === 'stage' && b === 'bell') return bellArt();
  if (kind === 'stage' && b === 'hops') return hopsArt(CAST.hops?.color);
  if (kind === 'stage') return stageGuide(a === 'ferry' ? ferryStage(b === 'awake') : marshStage(), STAGE_MARKS[a]);
  return '';
}
for (const slot of artSlots()) {
  const scale = Math.min(1, 1200 / slot.w), w = Math.round(slot.w * scale), h = Math.round(slot.h * scale);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${slot.transparent ? 'transparent' : '#fff'}}svg{display:block;width:100%;height:100%}</style>${svgFor(slot)}`);
  await page.screenshot({ path: new URL(`${slot.id.replaceAll('/', '_')}.png`, out).pathname, omitBackground: Boolean(slot.transparent) });
}
await writeFile(new URL('README.md', out), `# Placeholder references\n\nOne PNG per art slot, rendered from the drawn placeholders by \`scripts/export-art-references.mjs\`. Use them as composition guides (what is where, what changes between stages), not as style references. File names replace “/” in the slot ID with “_”. The map guides mark each stop button’s position in red; keep each stop’s landmark under its mark. The stage guides outline in red where the game draws its puzzle pieces, what the phone views show (dashed) and the corners Plume’s card and the keeper portrait cover; keep those areas plain (docs/art/batches/03-stage-boards.md).\n`);
console.log(`Wrote ${artSlots().length} references.`);
await browser.close();
