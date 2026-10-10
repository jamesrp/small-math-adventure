// Road puzzles played inside their picture. On the Turtle Ferry the travelers
// sit in the deck's seats, the bell wheels hang on the bow frame and the
// landing lamps stand on the rail; in Glowworm Marsh Hops walks the
// boardwalks lighting their lamps. Each stage draws its pieces over a backdrop
// (art slot stage/<stop>/<part>, 1600 × 900) and leaves the rest of its
// controls (swap pairs, the bell chart, the goal card) in a row under it.
//
// Coordinates are in the backdrop's 1600 × 900 space. Phones show only its
// middle (x 200–1400), or the bow (x 700–1600) for the bell, so everything a
// child needs stays inside that.
import { nextHint } from './engine.js';
import { getEncounter } from './road.js';
import { PARTY, PARTY_NAMES, CAST } from './road-cast.js';
import { media, slots, asset } from './art.js';
import { companionDrawing } from './caravan-art.js';
import { ferryStage, marshStage, bellArt, hopsArt } from './stage-placeholders.js';
import { wagonArt } from './road-placeholders.js';
import { clockFace, clockPlace, bellChart, clockFeedback } from './motion.js';
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
// tree's branches; pressing a rope flips the two lamps at its ends.
const RIM = { cx: 650, cy: 548, rx: 410, ry: 200, lift: 112 };
const TREE = [[650, 82], [455, 166], [845, 166], [355, 252], [555, 252], [745, 252], [945, 252]];
function lampSpots(p) {
  const { vertices, topology } = p.parameters;
  if (topology === 'complete_binary_tree_depth_2') return vertices.map((v, i) => ({ v, x: TREE[i][0], y: TREE[i][1], base: null }));
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
function lamp(spot, lit, small = false) {
  const r = small ? 26 : 32, post = spot.base === null ? `<path d="M${spot.x} ${spot.y - r - 14}v-12" stroke="#5e3b1f" stroke-width="5"/>` : `<path d="M${spot.x} ${spot.base}V${spot.y + r}" stroke="#5e3b1f" stroke-width="9" stroke-linecap="round"/>`;
  return `<g class="stage-lamp ${lit ? 'is-lit' : ''}">${small ? '' : post}${lit ? `<circle class="stage-glow" cx="${spot.x}" cy="${spot.y}" r="${r * 2.4}"/>` : ''}<rect x="${spot.x - r * .7}" y="${spot.y - r - 10}" width="${r * 1.4}" height="14" rx="5" class="stage-lamp-cap"/><circle cx="${spot.x}" cy="${spot.y}" r="${r}" class="stage-lamp-glass"/><text x="${spot.x}" y="${spot.y + r * .36}" class="stage-lamp-label">${esc(spot.v)}</text></g>`;
}
function lightsLayers(p, a, hint) {
  const { edges, vertices, press_budget: budget } = p.parameters, spots = lampSpots(p), on = new Set(a.board.on);
  const full = budget != null && a.board.presses.length >= budget, index = v => vertices.indexOf(v);
  const back = [], front = [];
  edges.forEach(([u, v], i) => {
    const path = ropePath(spots, index(u), index(v)), mid = (spots[index(u)].base ?? spots[index(u)].y) + (spots[index(v)].base ?? spots[index(v)].y);
    const hit = `<path class="wire-hit stage-rope-hit ${hint?.action?.edge === i ? 'is-hinted' : ''}" d="${path}" role="button" tabindex="${full ? -1 : 0}" aria-label="Press the rope from ${esc(u)} to ${esc(v)}; flip both lamps" aria-disabled="${full}" ${full ? '' : move({ edge: i })} data-focus="wire-${i}"/>`;
    (spots[0].base !== null && mid / 2 < RIM.cy ? back : front).push(`<path class="stage-rope-under" d="${path}"/><path class="stage-rope" d="${path}"/>${hit}`);
  });
  spots.forEach(spot => (spot.base !== null && spot.base < RIM.cy - RIM.ry / 2 ? back : front).push(lamp(spot, on.has(spot.v))));
  if (spots[0].base === null) back.unshift(`<path d="M${TREE[0][0]} ${TREE[0][1]}V430" stroke="#6b4527" stroke-width="16" stroke-linecap="round"/>`);
  return { back: back.join(''), front: front.join('') };
}
// The goal card: the same lamps, small, lit as Snooze wants them.
function lightsGoal(p) {
  const spots = lampSpots(p), on = new Set(p.parameters.target_on), index = v => p.parameters.vertices.indexOf(v);
  const xs = spots.map(s => s.x), ys = spots.map(s => s.y), pad = 44;
  const box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad];
  const lines = p.parameters.edges.map(([u, v]) => `<line x1="${spots[index(u)].x}" y1="${spots[index(u)].y}" x2="${spots[index(v)].x}" y2="${spots[index(v)].y}"/>`).join('');
  return `<svg viewBox="${box.map(n => Math.round(n)).join(' ')}" role="img" aria-label="Goal: lit ${esc(p.parameters.target_on.join(', ') || 'none')}; the others dark."><g class="stage-goal-lines">${lines}</g>${spots.map(s => lamp({ ...s, base: null }, on.has(s.v), true)).join('')}</svg>`;
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

// The stage ---------------------------------------------------------------------------------
// `sceneStage` is how many of the stop's puzzles the scene shows as done.
export function stageBoard(kind, p, a, ctx = {}) {
  const hint = a.hintLevel >= 2 ? nextHint(p, a) : null;
  let backdrop, back = '', front = '', pieces = '', stop = 'ferry';
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
    if (kind === 'lights') { const layers = lightsLayers(p, a, hint); back += layers.back; front = layers.front; }
  }
  const glow = '<defs><radialGradient id="stage-glow"><stop offset="0" stop-color="#fff2a8" stop-opacity=".9"/><stop offset=".45" stop-color="#ffd653" stop-opacity=".45"/><stop offset="1" stop-color="#ffd653" stop-opacity="0"/></radialGradient></defs>';
  const layer = (cls, body) => body ? `<svg class="stage-layer ${cls}" viewBox="0 0 1600 900" preserveAspectRatio="none">${cls === 'stage-back' ? glow : ''}${body}</svg>` : '';
  return `<div class="lr-stage stage-${stop} kind-${kind}" role="group" aria-label="${esc(kind === 'boardwalks' ? 'The marsh boardwalks' : 'The ferry')}"><div class="stage-world">${backdrop}${layer('stage-back', back)}<div class="stage-pieces">${pieces}</div>${layer('stage-front', front)}</div></div>`;
}

// What sits under the picture: the swap pairs, the bell chart, the goal card,
// or the walk's step count.
export function stageControls(kind, p, a, ctx = {}) {
  if (kind === 'seats') return `<div class="allowed-pairs stage-pairs"><div>${p.edges.map(([x, y]) => `<button type="button" class="pair-button" data-action="swap-pair" data-pair="${x},${y}" data-focus="action-swap-pair" aria-label="Swap seats ${x + 1} and ${y + 1}">${x + 1} ↔ ${y + 1}</button>`).join('')}</div></div>`;
  if (kind === 'bell') {
    const feedback = clockFeedback(p, a);
    return `<form data-puzzle-form class="motion-form stage-bell-form" id="bell-form">${bellChart(p, a, ctx.clockPresentation ?? {})}<button type="submit" class="primary" data-focus="submit-puzzle">Ring</button></form>${feedback ? `<p class="motion-result" role="status">${esc(feedback)}</p>` : ''}`;
  }
  if (kind === 'lights') {
    const budget = p.parameters.press_budget, left = budget == null ? null : budget - a.board.presses.length, on = new Set(a.board.on);
    const lit = p.parameters.vertices.filter(v => on.has(v)).map(esc).join(', ') || 'none';
    return `<div class="stage-goal-row"><figure class="stage-goal"><figcaption>Goal</figcaption>${lightsGoal(p)}</figure>${left === null ? '' : `<p class="stage-count"><strong>${left}</strong> ${left === 1 ? 'press' : 'presses'} left</p>`}</div><p class="sr-only" role="status">Lit: ${lit}${left === null ? '' : `. ${left} ${left === 1 ? 'press' : 'presses'} left`}</p>`;
  }
  const info = routeInfo(p, a.board), lit = info ? info.uses.filter(n => n > 0).length : 0;
  return `<p class="stage-count"><strong>${info?.cost ?? 0}</strong> ${info?.cost === 1 ? 'step' : 'steps'}<span>${lit} of ${p.parameters.edges.length} lamps lit</span></p><p class="sr-only" role="status">${a.board.path.map(esc).join(' → ')}</p>`;
}
