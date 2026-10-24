// Road puzzles played inside their picture. On the Turtle Ferry the travelers
// sit in the deck's seats, the bell wheels hang on the bow frame and the
// landing lamps stand on the rail; in Glowworm Marsh Hops walks the
// boardwalks lighting their lamps. Each stage draws its pieces over a backdrop
// (art slot stage/<stop>/<part>, 1600 × 900) and leaves the rest of its
// controls (swap pairs, the bell chart, the goal card) in a row under it.
//
// Coordinates are in the backdrop's 1600 × 900 space. Phones show only part
// of it (`phoneView`): the middle (x 200–1400) for the seats and boardwalks,
// the bow above the deck for the bell, and the lamps' own box for the lamps,
// so everything a child needs stays inside that and is drawn larger.
import { nextHint } from './engine.js';
import { getEncounter } from './road.js';
import { PARTY, PARTY_NAMES, CAST } from './road-cast.js';
import { media, slots, asset } from './art.js';
import { companionDrawing } from './caravan-art.js';
import { ferryStage, marshStage, bellArt, hopsArt } from './stage-placeholders.js';
import { wagonArt } from './road-placeholders.js';
import { clockFace, clockPlace, bellChart, clockFeedback, clockPeriod } from './motion.js';
import { routeInfo, networkPositions } from './networks.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const at = (x, y, size) => `--x:${Math.round(x)};--y:${Math.round(y)}${size ? `;--s:${size}` : ''}`;
const move = action => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}"`;

// Which road puzzles have a stage. The checks keep a stage to boards it can draw.
const KINDS = {
  'ferry-seats': { kind: 'seats', fits: p => p.mechanic === 'swap' && seatsFit(p) },
  'ferry-bell': { kind: 'bell', fits: p => p.mechanic === 'clock' && p.parameters.mode !== 'choose_jump' && p.parameters.clocks.length <= 2 },
  'ferry-lights': { kind: 'lights', fits: p => p.mechanic === 'toggle' && (p.parameters.topology === 'cycle' && p.parameters.vertices.length <= 6 || p.parameters.topology === 'complete_binary_tree_depth_2') },
  'marsh-boardwalks': { kind: 'boardwalks', fits: p => p.mechanic === 'route' && p.parameters.mode === 'cover' },
};
export function stageKind(e, p) {
  const entry = e && !e.side ? KINDS[e.id] : null;
  return entry && entry.fits(p) ? entry.kind : null;
}

// Ferry ---------------------------------------------------------------------------
// Seats in two staggered rows on the round deck, each back seat between two
// front ones, numbered back row first, left to right. A traveler is drawn
// standing on the spot, feet at (x, y). Travelers without a seat on a smaller
// ferry stand on the bow, under the bell wheel.
const DECK = { cx: 650, back: 470, front: 645, gap: 225, size: 180 };
const STANDING = [{ x: 1172, y: 792 }, { x: 1318, y: 792 }];
// Four to six seats: everyone without a seat needs a place to stand.
function seatsFit(p) {
  return Array.isArray(p?.start) && Array.isArray(p.target) && p.start.length <= PARTY.length && p.start.length >= PARTY.length - STANDING.length;
}
function seatSpots(n) {
  const start = DECK.cx - (n - 1) * DECK.gap / 4, spots = Array.from({ length: n }, (_, j) => ({ x: start + j * DECK.gap / 2, y: j % 2 ? DECK.front : DECK.back }));
  return [...spots.filter((_, j) => j % 2 === 0), ...spots.filter((_, j) => j % 2)];
}
// Cushions take the color of the traveler the seat belongs to.
const CUSHION = { pip: '#f0c98f', moss: '#9cc47f', rook: '#86a6c8', bea: '#e07068', fern: '#e39a62', tumble: '#d8cba8' };
const travelerArt = id => media(slots.party(id), `<svg viewBox="0 0 120 120" aria-hidden="true">${companionDrawing(id)}</svg>`, { key: `stage-${id}`, cls: 'stage-art-piece' });

function chair({ x, y }, home) {
  return `<g class="stage-chair"><rect x="${x - 72}" y="${y - 150}" width="144" height="120" rx="44" fill="#9c6a3e" stroke="#5e3b1f" stroke-width="5"/><ellipse cx="${x}" cy="${y - 6}" rx="82" ry="30" fill="#8a5a33"/><ellipse cx="${x}" cy="${y - 14}" rx="78" ry="27" fill="${CUSHION[home] || '#e9d3a6'}" stroke="#5e3b1f" stroke-width="4"/></g>`;
}
// The seats puzzle's travelers in their current seats; the other ferry
// puzzles keep everyone in their own seat, where the first puzzle left them.
function ferryParty(seats, opts) {
  const { seated, homes, p, selected = null, hinted = [], interactive = false } = opts, spots = seatSpots(seats);
  const back = spots.map((spot, i) => chair(spot, homes[i])).join('');
  const tags = interactive ? spots.map((spot, i) => `<span class="stage-piece stage-tag ${seated[i] === homes[i] ? 'is-matched' : ''}" style="${at(spot.x, spot.y + 34, 70)}" aria-hidden="true"><b>${i + 1}</b>${media(slots.party(homes[i]), `<svg viewBox="0 0 120 120">${companionDrawing(homes[i])}</svg>`, { key: `stage-home-${i}` })}</span>`).join('') : '';
  const people = spots.map((spot, i) => {
    const id = seated[i], home = seated[i] === homes[i];
    if (!interactive) return `<div class="stage-piece stage-traveler is-still" style="${at(spot.x, spot.y, DECK.size)}" aria-hidden="true">${travelerArt(id)}</div>`;
    return `<button type="button" class="stage-piece stage-traveler ${selected === i ? 'is-selected' : ''} ${hinted.includes(i) ? 'is-hinted' : ''} ${home ? 'is-home' : ''}" style="${at(spot.x, spot.y, DECK.size)}" data-action="cup" data-cell="${i}" data-focus="cup-${i}" data-flip="${esc(p.id)}:${id}" aria-pressed="${selected === i}" aria-label="Seat ${i + 1}: ${PARTY_NAMES[id]}; this is ${PARTY_NAMES[homes[i]]}’s seat${home ? ', home' : ''}">${travelerArt(id)}</button>`;
  }).join('');
  const standing = PARTY.filter(id => !seated.includes(id)).map((id, i) => `<div class="stage-piece stage-traveler is-still is-standing" style="${at(STANDING[i].x, STANDING[i].y, DECK.size * .82)}" aria-hidden="true">${travelerArt(id)}</div>`).join('');
  return { back, pieces: standing + tags + people };
}
// Seat i belongs to traveler PARTY[target[i]], in the seats puzzle of this trail.
function homeSeats(p, ctx) {
  const id = getEncounter('ferry-seats')?.selection[p.band], seats = ctx.pack?.puzzles.find(q => q.id === id);
  return seatsFit(seats) ? seats.target.map(t => PARTY[t]) : PARTY.slice(0, 6);
}

// The caravan's wagon rides on Snooze's shell at the stern, beside the jetty it
// rolled off (decided with James, October 10). It goes up Windy Ridge as cable-car cargo.
const WAGON = { x: 125, y: 640, size: 220 };
const wagonPiece = () => `<div class="stage-piece stage-wagon" style="${at(WAGON.x, WAGON.y, WAGON.size)}" aria-hidden="true">${media(slots.wagon('party'), wagonArt('party'), { key: 'stage-wagon' })}</div>`;

// The bell hangs from the bow frame; the bell wheels sit on the frame's board.
const BELL = { x: 1245, y: 135, size: 150 };
const WHEELS = [[{ x: 1247, y: 470, s: 268 }], [{ x: 1247, y: 384, s: 256 }, { x: 1247, y: 644, s: 256 }]];
const bellPiece = (ringing, interactive) => interactive
  ? `<button type="submit" form="bell-form" class="stage-piece stage-bell ${ringing ? 'is-ringing' : ''}" style="${at(BELL.x, BELL.y, BELL.size)}" data-focus="stage-bell" aria-label="Ring the bell">${media(slots.stage('ferry', 'bell'), bellArt(), { key: 'stage-bell' })}</button>`
  : `<div class="stage-piece stage-bell is-still" style="${at(BELL.x, BELL.y, BELL.size)}" aria-hidden="true">${media(slots.stage('ferry', 'bell'), bellArt(), { key: 'stage-bell' })}</div>`;
function bellWheels(p, a, ctx) {
  const clocks = p.parameters.clocks, prediction = a.board.prediction, presentation = ctx.clockPresentation ?? {};
  const total = prediction ?? 0, count = presentation.count ?? total;
  return clocks.map((clock, i) => {
    const w = WHEELS[clocks.length - 1][i], label = `${clocks.length > 1 ? `Wheel ${i + 1}: ` : 'Bell wheel: '}${clock.positions} places, jump ${clock.jump}, star at ${clock.target}. Marker ${count ? 'at' : 'starts at'} ${clockPlace(clock, count)}${count ? ` after ${count} ${count === 1 ? 'bell' : 'bells'}` : ''}.`;
    return `<svg class="stage-wheel" x="${w.x - w.s / 2}" y="${w.y - w.s / 2}" width="${w.s}" height="${w.s}" viewBox="0 0 320 320" role="img" aria-label="${esc(label)}"><circle class="stage-wheel-rim" cx="160" cy="160" r="156"/>${clockFace(clock, count, total, { big: true })}</svg>`;
  }).join('');
}

// Landing lamps: on posts around the deck's rail (a ring), or on a lamp tree
// above the deck. Ropes run along the rail between neighbors, or along the
// tree's branches; pressing a rope flips the two lamps at its ends. A tap on a
// lamp flips nothing: its ropes glow for a moment (`pulseRopes`), so a child
// who tries the lamps learns what reaches them.
const RIM = { cx: 650, cy: 548, rx: 410, ry: 200, lift: 112 };
// The tree is spread wide over the deck so its short branches keep a 40 px
// reach between the lamps on a phone; its middle row hangs low enough to stay
// under Plume's card in the top-left corner on a tablet.
const TREE = [[620, 62], [365, 196], [875, 196], [205, 270], [525, 270], [715, 270], [1035, 270]];
// Glass radius, and the reach of a lamp's own tap: wide on the ring, where
// lamps stand apart; a little inside the glass on the tree, so its short
// branches keep a 40 px reach on a phone.
const LAMP = { ring: { r: 40, hit: 60 }, tree: { r: 34, hit: 30 } };
const isTree = p => p.parameters.topology === 'complete_binary_tree_depth_2';
function lampSpots(p) {
  const { vertices } = p.parameters;
  if (isTree(p)) return vertices.map((v, i) => ({ v, x: TREE[i][0], y: TREE[i][1], base: null }));
  const start = vertices.length === 4 ? -135 : -90;
  return vertices.map((v, i) => {
    const t = (start + i * 360 / vertices.length) * Math.PI / 180, x = RIM.cx + RIM.rx * Math.cos(t), y = RIM.cy + RIM.ry * Math.sin(t);
    return { v, x, y: y - RIM.lift, base: y, t };
  });
}
function ropePath(spots, a, b) {
  const [s, e] = [spots[a], spots[b]], n = spots.length;
  if (s.base === null) return `M${s.x} ${s.y}L${e.x} ${e.y}`;
  const [from, to] = (b - a + n) % n === 1 ? [s, e] : (a - b + n) % n === 1 ? [e, s] : [null, null];
  if (!from) return `M${s.x} ${s.base}L${e.x} ${e.base}`;
  const ax = RIM.cx + RIM.rx * Math.cos(from.t), ay = RIM.cy + RIM.ry * Math.sin(from.t), bx = RIM.cx + RIM.rx * Math.cos(to.t), by = RIM.cy + RIM.ry * Math.sin(to.t);
  return `M${ax.toFixed(1)} ${ay.toFixed(1)}A${RIM.rx} ${RIM.ry} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}`;
}
function lamp(spot, lit, r) {
  const post = spot.base === null ? `<path d="M${spot.x} ${spot.y - r - 14}v-12" stroke="#5e3b1f" stroke-width="5"/>` : `<path d="M${spot.x} ${spot.base}V${spot.y + r}" stroke="#5e3b1f" stroke-width="9" stroke-linecap="round"/>`;
  return `<g class="stage-lamp ${lit ? 'is-lit' : ''}">${post}${lit ? `<circle class="stage-glow" cx="${spot.x}" cy="${spot.y}" r="${r * 2.4}"/>` : ''}<rect x="${spot.x - r * .7}" y="${spot.y - r - 10}" width="${r * 1.4}" height="14" rx="5" class="stage-lamp-cap"/><circle cx="${spot.x}" cy="${spot.y}" r="${r}" class="stage-lamp-glass"/><text x="${spot.x}" y="${spot.y + r * .36}" class="stage-lamp-label">${esc(spot.v)}</text></g>`;
}
function lightsLayers(p, a, hint) {
  const { edges, vertices, press_budget: budget } = p.parameters, spots = lampSpots(p), on = new Set(a.board.on), size = LAMP[isTree(p) ? 'tree' : 'ring'];
  const full = budget != null && a.board.presses.length >= budget, index = v => vertices.indexOf(v);
  const back = [], front = [], hits = [];
  edges.forEach(([u, v], i) => {
    const path = ropePath(spots, index(u), index(v)), mid = (spots[index(u)].base ?? spots[index(u)].y) + (spots[index(v)].base ?? spots[index(v)].y);
    (spots[0].base !== null && mid / 2 < RIM.cy ? back : front).push(`<g class="stage-rope-set" data-ends="${esc(u)} ${esc(v)}"><path class="stage-rope-under" d="${path}"/><path class="stage-rope" d="${path}"/></g>`);
    hits.push(`<path class="wire-hit stage-rope-hit ${hint?.action?.edge === i ? 'is-hinted' : ''}" d="${path}" role="button" tabindex="${full ? -1 : 0}" aria-label="Press the rope from ${esc(u)} to ${esc(v)}; flip both lamps" aria-disabled="${full}" ${full ? '' : move({ edge: i })} data-focus="wire-${i}"/>`);
  });
  spots.forEach(spot => (spot.base !== null && spot.base < RIM.cy - RIM.ry / 2 ? back : front).push(lamp(spot, on.has(spot.v), size.r)));
  // Each lamp's own tap lies over the ropes' reach, so a tap on a lamp never presses a rope.
  spots.forEach(spot => hits.push(`<circle class="stage-lamp-hit" cx="${spot.x}" cy="${spot.y}" r="${size.hit}" data-stage-lamp="${esc(spot.v)}" aria-hidden="true"/>`));
  if (spots[0].base === null) back.unshift(`<path d="M${TREE[0][0]} ${TREE[0][1]}V430" stroke="#6b4527" stroke-width="16" stroke-linecap="round"/>`);
  return { back: back.join(''), front: front.join(''), hits: hits.join('') };
}
// A tap on a lamp makes the ropes at that lamp glow (CSS .is-pulsing), once
// per tap; a press on a rope is the move. Wired once, for every stage.
let pulseTimer = null;
export function pulseRopes(stage, v) {
  const sets = [...stage.querySelectorAll('.stage-rope-set')];
  sets.forEach(set => set.classList.remove('is-pulsing'));
  void stage.getBoundingClientRect();
  sets.filter(set => set.dataset.ends.split(' ').includes(v)).forEach(set => set.classList.add('is-pulsing'));
  clearTimeout(pulseTimer);
  pulseTimer = setTimeout(() => sets.forEach(set => set.classList.remove('is-pulsing')), 1400);
}
if (typeof document !== 'undefined') document.addEventListener('click', event => {
  const hit = event.target.closest?.('[data-stage-lamp]'), stage = hit?.closest('.lr-stage');
  if (stage) pulseRopes(stage, hit.dataset.stageLamp);
});
// The goal card: the same lamps, lit as Snooze wants them. Drawn in its own
// space with large lamps (the tree a little taller), and at least wide enough
// for 13 px labels (`--goal-w`).
function lightsGoal(p) {
  const { vertices, edges, target_on } = p.parameters, on = new Set(target_on), index = v => vertices.indexOf(v);
  const spots = lampSpots(p).map(s => ({ ...s, y: isTree(p) ? s.y * 1.6 : s.y }));
  let near = Infinity;
  spots.forEach((s, i) => spots.slice(i + 1).forEach(t => { near = Math.min(near, Math.hypot(s.x - t.x, s.y - t.y)); }));
  const r = Math.round(Math.min(70, near * .34)), font = Math.round(r * .95), pad = r + 22;
  const xs = spots.map(s => s.x), ys = spots.map(s => s.y);
  const box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad].map(Math.round);
  const lines = edges.map(([u, v]) => `<line x1="${spots[index(u)].x}" y1="${spots[index(u)].y}" x2="${spots[index(v)].x}" y2="${spots[index(v)].y}"/>`).join('');
  const lamps = spots.map(s => `<g class="stage-goal-lamp ${on.has(s.v) ? 'is-lit' : ''}">${on.has(s.v) ? `<circle class="stage-goal-glow" cx="${s.x}" cy="${s.y}" r="${Math.round(r * 1.3)}"/>` : ''}<circle cx="${s.x}" cy="${s.y}" r="${r}" class="stage-lamp-glass"/><text x="${s.x}" y="${Math.round(s.y + font * .36)}" class="stage-goal-label" style="font-size:${font}px">${esc(s.v)}</text></g>`).join('');
  return `<svg viewBox="${box.join(' ')}" style="--goal-w:${Math.ceil(box[2] * 13 / font)}px" role="img" aria-label="Goal: lit ${esc(target_on.join(', ') || 'none')}; the others dark."><g class="stage-goal-lines" style="stroke-width:${Math.round(r * .22)}px">${lines}</g>${lamps}</svg>`;
}

// Marsh ------------------------------------------------------------------------------
// The road puzzle's junctions, mapped from the board layout onto the water.
const MARSH = { x0: 300, sx: 10, y0: 250, sy: 5.4, entrance: { x: 800, y: 850 } };
function junctions(p) {
  const xy = networkPositions(p);
  return Object.fromEntries(p.parameters.vertices.map(v => [v, { x: MARSH.x0 + xy[v][0] * MARSH.sx, y: MARSH.y0 + xy[v][1] * MARSH.sy }]));
}
function boardwalk(a, b, used, i) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  let nx = -uy, ny = ux; if (ny > 0 || ny === 0 && nx < 0) { nx = -nx; ny = -ny; }
  const s = { x: a.x + ux * 46, y: a.y + uy * 46 }, e = { x: b.x - ux * 46, y: b.y - uy * 46 }, w = 28;
  const strip = dy0 => [[s.x + nx * w, s.y + ny * w + dy0], [e.x + nx * w, e.y + ny * w + dy0], [e.x - nx * w, e.y - ny * w + dy0], [s.x - nx * w, s.y - ny * w + dy0]].map(pt => pt.map(n => n.toFixed(1)).join(',')).join(' ');
  const planks = Array.from({ length: Math.max(0, Math.floor((len - 92) / 26)) }, (_, k) => { const t = 13 + k * 26, cx = s.x + ux * t, cy = s.y + uy * t; return `M${(cx + nx * w).toFixed(1)} ${(cy + ny * w).toFixed(1)}L${(cx - nx * w).toFixed(1)} ${(cy - ny * w).toFixed(1)}`; }).join('');
  const m = { x: (a.x + b.x) / 2 + nx * 52, y: (a.y + b.y) / 2 + ny * 52 };
  const lampHead = { v: '', x: m.x, y: m.y - 58, base: m.y };
  return `<g class="stage-walk ${used ? 'is-walked' : ''}" data-walk="${i}"><polygon points="${strip(12)}" class="stage-walk-side"/><polygon points="${strip(0)}" class="stage-walk-top"/><path d="${planks}" class="stage-walk-planks"/></g><g class="stage-marsh-lamp ${used ? 'is-lit' : ''}"><path d="M${m.x} ${m.y}V${lampHead.y + 16}" stroke="#3b2a1a" stroke-width="7" stroke-linecap="round"/>${used ? `<circle class="stage-glow" cx="${m.x}" cy="${lampHead.y}" r="54"/>` : ''}<circle cx="${m.x}" cy="${lampHead.y}" r="17" class="stage-lamp-glass"/></g>`;
}
function hopsPiece(p, spot) {
  const own = slots.stage('marsh', 'hops'), portrait = slots.keeper('hops', 'idle');
  const art = asset(own) || !asset(portrait) ? media(own, hopsArt(CAST.hops?.color), { key: 'stage-hops' }) : `<span class="stage-token">${media(portrait, '', { key: 'stage-hops' })}</span>`;
  return `<div class="stage-piece stage-hops" style="${at(spot.x, spot.y + 10, 170)}" data-flip="${esc(p.id)}:hops" aria-hidden="true">${art}</div>`;
}
function marshLayers(p, a, hint) {
  const q = p.parameters, spots = junctions(p), info = routeInfo(p, a.board) || { uses: q.edges.map(() => 0), cost: 0, current: undefined };
  const cap = q.cost_cap ?? q.target_cost, here = info.current;
  const walks = q.edges.map(([u, v], i) => boardwalk(spots[u], spots[v], info.uses[i] > 0, i)).join('');
  const pads = q.vertices.map(v => { const { x, y } = spots[v]; return `<g class="stage-pad"><ellipse cx="${x}" cy="${y + 10}" rx="66" ry="40" fill="#4a3220"/><ellipse cx="${x}" cy="${y}" rx="66" ry="40" fill="#8d6a43" stroke="#3b2a1a" stroke-width="5"/><ellipse cx="${x - 14}" cy="${y - 8}" rx="30" ry="12" fill="#5d7f45" opacity=".8"/><text x="${x - 62}" y="${y + 50}" class="stage-pad-label">${esc(v)}</text></g>`; }).join('');
  const reachable = v => !here || q.edges.some(([u, w, cost]) => (u === here && w === v || w === here && u === v) && info.cost + cost <= cap);
  const buttons = q.vertices.map(v => { const { x, y } = spots[v], go = reachable(v); return `<button type="button" class="stage-piece stage-junction ${here === v ? 'is-here' : ''} ${go ? 'can-go' : ''} ${hint?.action?.vertex === v ? 'is-hinted' : ''}" style="${at(x, y, 150)}" ${move({ vertex: v })} data-focus="junction-${esc(v)}" aria-label="${here ? `${here === v ? 'Hops is here. ' : ''}Walk to ${esc(v)}` : `Start at ${esc(v)}`}" ${here === v ? 'aria-current="location"' : ''} ${go ? '' : 'disabled'}></button>`; }).join('');
  return { back: walks + pads, pieces: buttons + hopsPiece(p, here ? spots[here] : MARSH.entrance), info };
}

// Phones ----------------------------------------------------------------------------------
// The part of the 1600 × 900 picture a phone shows, when it is not the middle
// 1200 (road.css): the seats and the travelers standing on the bow; the bow
// from the bell to the bottom of its wheels, and on a short screen no wider
// than `short` px, so the chart below stays on screen; the lamps' own box.
// Each draws its pieces larger than the middle 1200 would.
// On a phone the keeper's portrait (80 px, its centre 48 px in and 6 px above
// the stage's bottom edge) covers the bottom-left corner: `clearOfKeeper` says
// whether a circle (centre and radius in px, on a stage `height` px tall)
// keeps out of it.
const PHONE_STAGE = 341;  // the stage's width on a 375 px phone, the narrowest
const clearOfKeeper = (x, y, r, height) => Math.hypot(x - 48, y - (height - 6)) >= 40 + r + 4;
export function phoneView(kind, p) {
  if (kind === 'seats') {
    const n = p.start.length, spots = seatSpots(n), xs = spots.map(s => s.x), half = DECK.size / 2, pad = 24, standing = PARTY.length - n;
    const x1 = standing ? STANDING[standing - 1].x + half * .82 + pad : Math.max(...xs) + half + pad;
    // From the back row's heads to the front row's tags, or the feet of those standing.
    const y0 = DECK.back - DECK.size - pad, y1 = (standing ? STANDING[0].y : DECK.front + 34 + 35) + pad;
    // Widen to the left until the front-left seat's tag and traveler clear the keeper.
    const frontLeft = Math.min(...spots.filter(s => s.y === DECK.front).map(s => s.x));
    const clear = x0 => {
      const k = PHONE_STAGE / (x1 - x0), height = (y1 - y0) * k;
      return clearOfKeeper((frontLeft - x0) * k, (DECK.front + 34 - y0) * k, Math.max(35 * k, 18) + 3, height) && clearOfKeeper((frontLeft - half - x0) * k, (DECK.front - y0) * k, 0, height);
    };
    let x0 = Math.min(...xs) - half - pad;
    while (x0 > 0 && !clear(x0)) x0 -= 10;
    return { x0: Math.floor(x0), w: Math.ceil(x1 - x0), y0, h: y1 - y0 };
  }
  if (kind === 'boardwalks') {
    // The junctions with room for their pads, lamps and labels, down to Hops's bank.
    const spots = Object.values(junctions(p)), xs = spots.map(s => s.x), x0 = Math.min(...xs) - 150, w = Math.max(...xs) + 150 - x0, k = PHONE_STAGE / w;
    // Taller, from the top, until every junction (56 × 46 px on a phone) clears the keeper.
    const clear = y0 => spots.every(j => clearOfKeeper(Math.max(0, (j.x - x0) * k - 28), (j.y - y0) * k + 23, 0, (900 - y0) * k));
    let y0 = Math.min(...spots.map(j => j.y)) - 170;  // Hops stands 160 tall at a junction
    while (y0 > 0 && !clear(y0)) y0 -= 10;
    y0 = Math.max(0, Math.floor(y0));
    return { x0: Math.floor(x0), w: Math.ceil(w), y0, h: 900 - y0 };
  }
  if (kind === 'bell') return p.parameters.clocks.length > 1 ? { x0: 700, w: 900, y0: 40, h: 750, short: 300 } : { x0: 700, w: 900, y0: 40, h: 580, short: 290 };
  if (kind !== 'lights') return null;
  const spots = lampSpots(p), { r } = LAMP[isTree(p) ? 'tree' : 'ring'], pad = 16, xs = spots.map(s => s.x);
  // A ring's ropes run along the rail, and each takes taps 22 px either side
  // of it (about 60 units on a phone), so the crop keeps that much beyond it.
  const left = Math.min(...xs) - r, right = Math.max(...xs) + r, top = Math.min(...spots.map(s => s.y)) - r - 26, reach = 64;
  const [x0, x1] = isTree(p) ? [left - pad, right + pad] : [Math.min(left - pad, RIM.cx - RIM.rx - reach), Math.max(right + pad, RIM.cx + RIM.rx + reach)];
  const y0 = Math.max(0, Math.floor(top - pad)), y1 = Math.min(900, Math.ceil(isTree(p) ? Math.max(...spots.map(s => s.y)) + r + 150 : RIM.cy + RIM.ry + reach));
  return { x0: Math.floor(x0), w: Math.ceil(x1 - x0), y0, h: y1 - y0 };
}

// Help in the stage's own words ------------------------------------------------------------
// How to play and read-aloud name what the stage shows (travelers and seats,
// the bell wheel, ropes and lamps, boardwalks and platforms), not the library
// board underneath (cups and letters, clocks, wires, roads). `note` opens the
// grown-up notes, which were written for the library board; `dress` turns the
// library's words in hints and feedback into the stage's.
const WORDS = {
  seats: [['cups', 'travelers'], ['cup', 'traveler'], ['positions', 'seats'], ['position', 'seat'], ['spots', 'seats'], ['spot', 'seat']],
  bell: [['clocks', 'wheels'], ['clock', 'wheel']],
  lights: [['wires', 'ropes'], ['wire', 'rope'], ['lanterns', 'lamps'], ['lantern', 'lamp']],
  boardwalks: [['roads', 'boardwalks'], ['road', 'boardwalk'], ['dots', 'platforms'], ['dot', 'platform']],
};
export function dress(kind, text) {
  const words = WORDS[kind];
  if (!words || typeof text !== 'string') return text;
  return text.replace(new RegExp(`\\b(${words.map(([from]) => from).join('|')})\\b`, 'gi'), found => {
    const to = words.find(([from]) => from === found.toLowerCase())[1];
    return found[0] === found[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to;
  });
}
export function stageHelp(kind, p) {
  const q = p.parameters;
  if (kind === 'seats') return {
    objective: 'Swap travelers until everyone sits in their own seat.',
    instructions: 'The face under each seat shows whose seat it is. Tap two travelers to swap them, or tap a pair of seat numbers below. Only the listed pairs can swap.',
    note: 'On the road the cups are the travelers, and the face under each seat stands for the letter of its home.',
  };
  if (kind === 'bell') return {
    objective: q.clocks.length > 1 ? 'Find the first bell that lands every marker on its star.' : 'Find the first bell that lands the marker on its star.',
    instructions: `${clockPeriod(q) > 20 ? 'Type' : 'Tap'} a number of bells, then ring the bell or press Ring. Each bell moves ${q.clocks.length > 1 ? 'every marker' : 'the marker'} one jump; the red arrow shows one jump. The start is bell zero; passing over a star does not count.`,
    note: `On the road the clock${q.clocks.length > 1 ? 's are the bell wheels' : ' is the bell wheel'}.`,
  };
  if (kind === 'lights') return {
    objective: q.press_budget == null ? 'Match the goal card.' : `Match the goal card in at most ${q.press_budget} presses.`,
    instructions: 'Tap a rope to flip both lamps at its ends. Tap a lamp to see its ropes. With a keyboard, Tab to a rope and press Enter or Space.',
    note: 'On the road the wires are ropes and the lanterns are lamps.',
  };
  return {
    objective: q.closed ? `Walk every boardwalk and come back to ${q.start}.` : 'Walk every boardwalk.',
    instructions: 'Tap a platform to start Hops there, then tap the next platform to walk him along a boardwalk. Walking a boardwalk again adds its steps.',
    note: 'On the road the roads are boardwalks and the dots are platforms.',
  };
}

// The stage ---------------------------------------------------------------------------------
// `sceneStage` is how many of the stop's puzzles the scene shows as done.
export function stageBoard(kind, p, a, ctx = {}) {
  const hint = a.hintLevel >= 2 ? nextHint(p, a) : null;
  let backdrop, back = '', front = '', pieces = '', hits = '', stop = 'ferry';
  if (kind === 'boardwalks') {
    stop = 'marsh'; backdrop = media(slots.stage('marsh', 'night'), marshStage(), { key: 'stage-backdrop', cls: 'stage-backdrop' });
    ({ back, pieces } = marshLayers(p, a, hint));
  } else {
    const awake = (ctx.sceneStage ?? 0) >= 2, part = awake ? 'awake' : 'asleep';
    backdrop = media(slots.stage('ferry', part), ferryStage(awake), { key: 'stage-backdrop', cls: 'stage-backdrop' });
    const homes = kind === 'seats' ? p.target.map(t => PARTY[t]) : homeSeats(p, ctx);
    const party = ferryParty(homes.length, kind === 'seats'
      ? { seated: a.board.map(t => PARTY[t]), homes, p, selected: ctx.selected ?? null, hinted: hint?.type === 'move' && hint.pair ? hint.pair : [], interactive: true }
      : { seated: homes, homes, p });
    const presentation = ctx.clockPresentation;
    back = party.back + (kind === 'bell' ? bellWheels(p, a, ctx) : '');
    pieces = wagonPiece() + party.pieces + bellPiece(Boolean(presentation && presentation.count < presentation.total), kind === 'bell');
    if (kind === 'lights') { const layers = lightsLayers(p, a, hint); back += layers.back; front = layers.front; hits = layers.hits; }
  }
  const glow = '<defs><radialGradient id="stage-glow"><stop offset="0" stop-color="#fff2a8" stop-opacity=".9"/><stop offset=".45" stop-color="#ffd653" stop-opacity=".45"/><stop offset="1" stop-color="#ffd653" stop-opacity="0"/></radialGradient></defs>';
  const layer = (cls, body) => body ? `<svg class="stage-layer ${cls}" viewBox="0 0 1600 900" preserveAspectRatio="none">${cls === 'stage-back' ? glow : ''}${body}</svg>` : '';
  const view = phoneView(kind, p), crop = view ? ` style="--px0:${view.x0};--pvw:${view.w};--py0:${view.y0};--pvh:${view.h}${view.short ? `;--pshort:${view.short}px` : ''}"` : '';
  return `<div class="lr-stage stage-${stop} kind-${kind}${kind === 'lights' && isTree(p) ? ' is-tree' : ''}${view ? ' has-crop' : ''}"${crop} role="group" aria-label="${esc(kind === 'boardwalks' ? 'The marsh boardwalks' : 'The ferry')}"><div class="stage-world">${backdrop}${layer('stage-back', back)}<div class="stage-pieces">${pieces}</div>${layer('stage-front', front)}${layer('stage-hits', hits)}</div></div>`;
}

// What sits under the picture: the swap pairs, the bell chart, the goal card,
// or the walk's step count.
export function stageControls(kind, p, a, ctx = {}) {
  if (kind === 'seats') return `<div class="allowed-pairs stage-pairs"><div>${p.edges.map(([x, y]) => `<button type="button" class="pair-button" data-action="swap-pair" data-pair="${x},${y}" data-focus="action-swap-pair" aria-label="Swap seats ${x + 1} and ${y + 1}">${x + 1} ↔ ${y + 1}</button>`).join('')}</div></div>`;
  if (kind === 'bell') {
    const feedback = clockFeedback(p, a);
    return `<form data-puzzle-form class="motion-form stage-bell-form" id="bell-form" novalidate>${bellChart(p, a, ctx.clockPresentation ?? {})}<button type="submit" class="primary" data-focus="submit-puzzle">Ring</button></form>${feedback ? `<p class="motion-result" role="status">${esc(feedback)}</p>` : ''}`;
  }
  if (kind === 'lights') {
    const budget = p.parameters.press_budget, left = budget == null ? null : budget - a.board.presses.length, on = new Set(a.board.on);
    const lit = p.parameters.vertices.filter(v => on.has(v)).map(esc).join(', ') || 'none';
    return `<div class="stage-goal-row"><figure class="stage-goal"><figcaption>Goal</figcaption>${lightsGoal(p)}</figure>${left === null ? '' : `<p class="stage-count"><strong>${left}</strong> ${left === 1 ? 'press' : 'presses'} left</p>`}</div><p class="sr-only" role="status">Lit: ${lit}${left === null ? '' : `. ${left} ${left === 1 ? 'press' : 'presses'} left`}</p>`;
  }
  const info = routeInfo(p, a.board), lit = info ? info.uses.filter(n => n > 0).length : 0;
  return `<p class="stage-count"><strong>${info?.cost ?? 0}</strong> ${info?.cost === 1 ? 'step' : 'steps'}<span>${lit} of ${p.parameters.edges.length} lamps lit</span></p><p class="sr-only" role="status">${a.board.path.map(esc).join(' → ')}</p>`;
}
