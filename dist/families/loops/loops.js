// Loop worlds (worksheet Week 100, Distance in nested worlds). Cards sit in
// loops that are inside one another or apart, never crossing, with numbers
// that grow outward; the frame round every card is 8. The distance of two
// cards is the number on the smallest loop round both. The child makes loops
// by tapping cards and then 2 or 4, and takes one away by tapping its number;
// the app refuses a loop that would cross another or break the outward
// growth, which paper can't.
//
// Modes of the `loops` mechanic: make (light every clue, or Can't by tapping
// three clues whose largest number occurs once), repair (every change of one
// clue that lets every clue light, then That's all), pin (choose the fewest
// clues that fit only a shown world; if another fits, the app draws it) and
// the playground. `loopsnum` is the same mechanic for the number cards group.
import {esc} from '../../expansion-controls.js';
import * as W from './world.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (o, list) => object(o) && Object.keys(o).sort().join() === [...list].sort().join();
export const MODES = ['make', 'repair', 'pin', 'playground'];
const isCard = (q, c) => typeof c === 'string' && q.cards.includes(c);
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const sortPair = (q, [u, v]) => q.cards.indexOf(u) < q.cards.indexOf(v) ? [u, v] : [v, u];
const pairIs = (a, b) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);

// --- Clues --------------------------------------------------------------------
// The clues in play: a repair changes one clue's number.
export function cluesOf(q, b) {
  if (q.mode === 'repair' && b.change) return q.clues.map((c, i) => i === b.change[0] ? [c[0], c[1], b.change[1]] : c);
  if (q.mode === 'pin') return b.asked.map(([u, v]) => [u, v, W.distance(q.world, u, v)]);
  return q.clues || [];
}
// Every change of one clue to another number that some world fits.
export function repairs(q) {
  const out = [];
  q.clues.forEach((c, i) => W.VALUES.filter(v => v !== c[2]).forEach(v => {
    if (W.worldOfClues(q.cards, q.clues.map((d, j) => j === i ? [d[0], d[1], v] : d))) out.push([i, v]);
  }));
  return out;
}
export const nextValue = (q, b, i) => {
  const now = b.change && b.change[0] === i ? b.change[1] : q.clues[i][2];
  return W.VALUES[(W.VALUES.indexOf(now) + 1) % W.VALUES.length];
};
const allHold = (loops, clues) => clues.every(c => W.holds(loops, c));

// --- Boards -------------------------------------------------------------------
// make:       {loops, claim}            claim: null, or three clue indices
// repair:     {loops, change, found, told}
//             change: null or [clue, number]; found: [[clue, number], …]
//             sorted; told: null, 'more' (There is another.) or 'all' (solved)
// pin:        {asked}                   asked: pairs of cards, in the order asked
// playground: {loops}
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'pin') return {asked: []};
  if (q.mode === 'repair') return {loops: [], change: null, found: [], told: null};
  if (q.mode === 'playground') return {loops: []};
  return {loops: [], claim: null};
}
const loopsOk = (q, loops) => Array.isArray(loops) && loops.length <= 2 * q.cards.length && W.isWorld(q.cards, loops);
const isRepair = (q, r) => Array.isArray(r) && r.length === 2 && repairs(q).some(([i, v]) => i === r[0] && v === r[1]);
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'pin') {
    if (!keys(b, ['asked']) || !Array.isArray(b.asked) || b.asked.length > q.budget) return false;
    const ok = b.asked.every(pr => Array.isArray(pr) && pr.length === 2 && isCard(q, pr[0]) && isCard(q, pr[1]) && pr[0] !== pr[1] && sortPair(q, pr)[0] === pr[0]);
    return ok && new Set(b.asked.map(pr => pr.join())).size === b.asked.length;
  }
  if (q.mode === 'playground') return keys(b, ['loops']) && loopsOk(q, b.loops);
  if (q.mode === 'repair') {
    if (!keys(b, ['loops', 'change', 'found', 'told']) || !loopsOk(q, b.loops)) return false;
    if (b.change !== null && !(Array.isArray(b.change) && b.change.length === 2 && Number.isInteger(b.change[0]) && b.change[0] >= 0 && b.change[0] < q.clues.length && W.VALUES.includes(b.change[1]) && b.change[1] !== q.clues[b.change[0]][2])) return false;
    if (!Array.isArray(b.found) || !b.found.every(r => isRepair(q, r))) return false;
    const sorted = [...b.found].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    if (JSON.stringify(sorted) !== JSON.stringify(b.found) || new Set(b.found.map(r => r.join())).size !== b.found.length) return false;
    const all = repairs(q).length;
    if (b.told === 'all') return b.found.length === all;
    if (b.told === 'more') return b.found.length < all;
    return b.told === null;
  }
  if (!keys(b, ['loops', 'claim']) || !loopsOk(q, b.loops)) return false;
  if (b.claim === null) return true;
  if (!q.cant || !Array.isArray(b.claim) || b.claim.length !== 3 || !b.claim.every(i => Number.isInteger(i) && i >= 0 && i < q.clues.length)) return false;
  if (!(b.claim[0] < b.claim[1] && b.claim[1] < b.claim[2])) return false;
  // A claim on three cards: accepted (the solve) or refused (loops can make it).
  return W.triangle(b.claim.map(i => q.clues[i])) !== null;
}
function solved(p, b) {
  const q = p.parameters;
  if (!valid(p, b) || q.mode === 'playground') return false;
  if (q.mode === 'pin') return b.asked.length === q.budget && W.pins(q.cards, q.world, b.asked);
  if (q.mode === 'repair') return b.told === 'all';
  if (b.claim) return W.isCertificate(b.claim.map(i => q.clues[i]));
  return allHold(b.loops, q.clues);
}
const refused = (q, b) => q.mode === 'make' && b.claim !== null && !W.isCertificate(b.claim.map(i => q.clues[i]));

// --- Moves --------------------------------------------------------------------
// The loops after an add or a remove, or null.
function editLoops(q, loops, action) {
  if (!Array.isArray(action.cards) || !action.cards.every(c => isCard(q, c)) || new Set(action.cards).size !== action.cards.length) return null;
  const set = W.inOrder(q.cards, action.cards);
  if (action.type === 'add') return W.refusal(loops, action.label, set) ? null : [...loops, [action.label, set]];
  const at = loops.findIndex(([l, s]) => l === action.label && sameSet(s, set));
  return at < 0 ? null : loops.filter((_, i) => i !== at);
}
// A repair is kept when every clue lights with one clue changed.
function record(q, b) {
  if (!b.change || !allHold(b.loops, cluesOf(q, b)) || b.found.some(r => r[0] === b.change[0] && r[1] === b.change[1])) return b;
  const found = [...b.found, [...b.change]].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  return {...b, found, told: null};
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  let next = null;
  if (q.mode === 'pin') {
    if (!Array.isArray(action.pair) || action.pair.length !== 2 || !isCard(q, action.pair[0]) || !isCard(q, action.pair[1]) || action.pair[0] === action.pair[1]) return null;
    const pair = sortPair(q, action.pair), have = b.asked.some(a => pairIs(a, pair));
    if (action.type === 'ask' && !have && b.asked.length < q.budget) next = {asked: [...b.asked, pair]};
    if (action.type === 'drop' && have) next = {asked: b.asked.filter(a => !pairIs(a, pair))};
  } else if (action.type === 'add' || action.type === 'remove') {
    const loops = editLoops(q, b.loops, action);
    if (!loops) return null;
    if (q.mode === 'make') next = {loops, claim: null};
    else if (q.mode === 'repair') next = record(q, {...b, loops});
    else next = {loops};
  } else if (q.mode === 'make' && action.type === 'cant') {
    if (!q.cant || b.claim !== null || !Array.isArray(action.clues) || action.clues.length !== 3) return null;
    const claim = [...action.clues].sort((x, y) => x - y);
    next = {...b, claim};
  } else if (q.mode === 'repair' && action.type === 'change') {
    const i = action.clue;
    if (!Number.isInteger(i) || i < 0 || i >= q.clues.length) return null;
    const v = nextValue(q, b, i);
    next = record(q, {...b, change: v === q.clues[i][2] ? null : [i, v]});
  } else if (q.mode === 'repair' && action.type === 'all') {
    if (b.told === 'more' || !b.found.length) return null;
    next = {...b, told: b.found.length === repairs(q).length ? 'all' : 'more'};
  }
  return next && valid(p, next) ? next : null;
}

// --- Hints --------------------------------------------------------------------
const names = (set) => set.length === 2 ? `${set[0]} and ${set[1]}` : `${set.slice(0, -1).join(', ')} and ${set.at(-1)}`;
const clueWords = ([u, v]) => `${u}–${v}`;
// Steps from the child's loops to a world: take away a loop that no world
// with these distances has, else add the next missing loop, smallest first.
function loopStep(q, loops, target) {
  const d = (u, v) => W.distance(target, u, v);
  const bad = loops.find(([label, set]) => {
    const cls = q.cards.filter(c => d(set[0], c) <= label || c === set[0]);
    return !sameSet(cls, set);
  });
  if (bad) return {type: 'move', action: {type: 'remove', label: bad[0], cards: bad[1]}, text: `Take away the ${bad[0]} loop round ${names(bad[1])}.`, loop: bad};
  const want = W.canonical(q.cards, target).find(([l, s]) => !loops.some(([m, t]) => m === l && sameSet(s, t)));
  if (!want) return null;
  return {type: 'move', action: {type: 'add', label: want[0], cards: want[1]}, text: `Put a ${want[0]} loop round ${names(want[1])}.`, cards: want[1]};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  if (q.mode === 'pin') return pinHint(q, b);
  if (q.mode === 'repair') {
    const missing = repairs(q).filter(([i, v]) => !b.found.some(r => r[0] === i && r[1] === v));
    if (!missing.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
    const [i, v] = missing[0];
    if (!b.change || b.change[0] !== i || b.change[1] !== v) return {type: 'move', action: {type: 'change', clue: i}, text: `Change ${clueWords(q.clues[i])} to ${v}.`, clue: i};
    return loopStep(q, b.loops, W.worldOfClues(q.cards, cluesOf(q, b))) || {type: 'done'};
  }
  if (q.world) return loopStep(q, b.loops, q.world) || {type: 'done'};
  const bad = W.badTriangles(q.clues)[0];
  if (refused(q, b)) {
    // Can't is shut until a loop changes.
    const last = b.loops.at(-1);
    if (last) return {type: 'move', action: {type: 'remove', label: last[0], cards: last[1]}, text: `Take away the ${last[0]} loop round ${names(last[1])}, then press Can’t.`, loop: last};
    const two = q.clues.find(c => c[2] === 2) || q.clues[0];
    return {type: 'move', action: {type: 'add', label: 2, cards: sortPair(q, two)}, text: `Put a 2 loop round ${two[0]} and ${two[1]}, then press Can’t.`, cards: [two[0], two[1]]};
  }
  return {type: 'move', action: {type: 'cant', clues: bad}, text: `Press Can’t, then tap ${bad.map(i => clueWords(q.clues[i])).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`, clues: bad};
}
// Pin: take away a clue the others already settle, else add one the world needs.
export function wasted(q, asked) {
  const nodes = W.nodes(q.cards, q.world);
  const seen = new Map();
  for (const pr of asked) {
    const node = nodes.filter(n => n.set.includes(pr[0]) && n.set.includes(pr[1])).sort((a, b) => a.set.length - b.set.length || a.label - b.label)[0];
    const i = node.parts.findIndex(s => s.includes(pr[0])), j = node.parts.findIndex(s => s.includes(pr[1]));
    const k = nodes.indexOf(node);
    if (!seen.has(k)) seen.set(k, node.parts.map((_, t) => t));
    const group = seen.get(k), find = t => group[t] === t ? t : (group[t] = find(group[t]));
    if (node.label === 2) { if (find(i) === find(j)) return pr; group[find(i)] = find(j); }
    else {
      const key = `${k}:${Math.min(i, j)}-${Math.max(i, j)}`;
      if (seen.has(key)) return pr;
      seen.set(key, true);
    }
  }
  return null;
}
function pinHint(q, b) {
  const waste = wasted(q, b.asked);
  if (waste) return {type: 'move', action: {type: 'drop', pair: waste}, text: `Take away the clue ${clueWords(waste)}.`, cards: waste};
  const u = W.unmet(q.cards, q.world, b.asked);
  if (!u) return {type: 'done'};
  const pair = u.split ? [u.split[0][0], u.split[1][0]] : [u.merge[0][0], u.merge[1][0]];
  const pr = sortPair(q, pair);
  return {type: 'move', action: {type: 'ask', pair: pr}, text: `Add the clue ${clueWords(pr)}.`, cards: pr};
}

// --- View state ---------------------------------------------------------------
// The cards chosen for a new loop (or the first card of a pin clue), the
// clues tapped after Can't, and a refused loop's line. Each belongs to the
// board it was drawn for.
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {pick: null, claiming: null, told: null}); return uiState.get(p.id); }
const current = (p, b, field) => ui(p)[field] && ui(p)[field].at === JSON.stringify(b) ? ui(p)[field].value : null;
export const picked = (p, b) => current(p, b, 'pick') || [];
// What a tap on a card does: choose it or let it go; in a pin, the second
// card asks or drops the clue on the two.
export function cardTap(p, b, card) {
  const q = p.parameters, pick = picked(p, b);
  if (q.mode === 'pin') {
    if (!pick.length) return {pick: [card]};
    if (pick[0] === card) return {pick: []};
    const pair = sortPair(q, [pick[0], card]);
    if (b.asked.some(a => pairIs(a, pair))) return {move: {type: 'drop', pair}};
    if (b.asked.length >= q.budget) return {pick: [], told: 'full'};
    return {move: {type: 'ask', pair}};
  }
  return {pick: pick.includes(card) ? pick.filter(c => c !== card) : W.inOrder(q.cards, [...pick, card])};
}
// What a label button does with the chosen cards.
export function labelTap(p, b, label) {
  const q = p.parameters, pick = picked(p, b);
  if (pick.length < 2) return null;
  const why = W.refusal(b.loops, label, pick);
  return why ? {told: why.why, loop: why.loop} : {move: {type: 'add', label, cards: pick}};
}
// What a clue tap does after Can't: choose it, let it go, or claim the three.
export function clueTap(p, b, i) {
  const q = p.parameters, chosen = current(p, b, 'claiming') || [];
  if (chosen.includes(i)) return {claiming: chosen.filter(t => t !== i)};
  const next = [...chosen, i].sort((x, y) => x - y);
  if (next.length < 3) return {claiming: next};
  if (!W.triangle(next.map(t => q.clues[t]))) return {claiming: [], told: 'three'};
  return {move: {type: 'cant', clues: next}};
}

// --- Drawing ------------------------------------------------------------------
const f = n => Number(n.toFixed(2));
const SHAPES = {
  A: 'circle', B: 'triangle', C: 'square', D: 'star', E: 'pentagon', F: 'hexagon'
};
const poly = (n, r, turn = -Math.PI / 2) => Array.from({length: n}, (_, k) => { const a = turn + 2 * Math.PI * k / n; return `${f(r * Math.cos(a))},${f(r * Math.sin(a))}`; }).join(' ');
const star = r => Array.from({length: 10}, (_, k) => { const a = -Math.PI / 2 + Math.PI * k / 5, s = k % 2 ? r * .45 : r; return `${f(s * Math.cos(a))},${f(s * Math.sin(a))}`; }).join(' ');
// A card's face centred on 0, 0 in a square of side `size`.
export function face(card, size = W.CARD) {
  const r = size * .36, shape = SHAPES[card];
  const outline = !shape ? '' : shape === 'circle' ? `<circle class="lp-shape" r="${f(r)}"/>` : shape === 'square' ? `<rect class="lp-shape" x="${f(-r * .82)}" y="${f(-r * .82)}" width="${f(r * 1.64)}" height="${f(r * 1.64)}"/>` : `<polygon class="lp-shape" points="${shape === 'star' ? star(r * 1.12) : poly({triangle: 3, pentagon: 5, hexagon: 6}[shape], shape === 'triangle' ? r * 1.15 : r)}"/>`;
  const dy = shape === 'triangle' ? size * .1 : 0;
  return `<rect class="lp-face" x="${f(-size / 2)}" y="${f(-size / 2)}" width="${size}" height="${size}" rx="${f(size * .14)}"/>${outline}<text class="lp-letter${shape ? '' : ' plain'}" y="${f(dy + size * (shape ? .12 : .16))}" font-size="${f(size * (shape ? .34 : .46))}">${esc(card)}</text>`;
}
const icon = card => `<svg class="lp-icon" viewBox="-12 -12 24 24" aria-hidden="true">${face(card, 24)}</svg>`;
// A world: cards in a row (rows when wide), loops as nested boxes with their
// numbers on top, the frame 8 round all. `look` sets classes, labels and
// which parts are controls.
export function worldSvg(q, loops, look = {}) {
  const L = W.layout(q.cards, loops, look.maxWidth || 400), act = look.act;
  const box = (x, y, w, h) => `<rect class="lp-loop-line" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(Math.min(14, h / 3))}"/>`;
  const badgeAt = (x, y, label, attrs, cls) => `<g class="lp-badge l${label}${cls}" transform="translate(${f(x)},${f(y)})" ${attrs}><circle class="lp-hit" r="15"/><circle class="lp-tag" r="10"/><text y="5.1">${label}</text></g>`;
  const frame = `<g class="lp-loop lp-frame">${box(1, 1, L.width - 2, L.height - 2)}</g>`;
  const loopParts = L.loops.map(o => {
    const [label, set] = loops[o.loop], c = look.loop?.(o.loop, label, set) || {};
    return `<g class="lp-loop l${label}${c.cls ? ` ${c.cls}` : ''}">${box(o.x, o.y, o.w, o.h)}</g>`;
  }).join('');
  const badges = [badgeAt(L.width - 24, 1, 8, 'role="img" aria-label="Frame 8"', ' frame'), ...L.loops.map(o => {
    const [label, set] = loops[o.loop], c = look.loop?.(o.loop, label, set) || {};
    const attrs = act && c.act ? `role="button" tabindex="0" aria-label="${esc(c.label)}" data-lp-loop="${esc(JSON.stringify([label, set]))}" data-focus="lp-loop-${label}-${set.join('')}"` : `role="img" aria-label="${esc(c.label || `${label} loop round ${names(set)}`)}"`;
    return badgeAt(o.x + o.w - 22, o.y, label, attrs, c.cls ? ` ${c.cls}` : '');
  })].join('');
  const cardParts = q.cards.map(card => {
    const at = L.cards[card], c = look.card?.(card) || {};
    const attrs = act && c.act ? `role="button" tabindex="0" aria-label="${esc(c.label || `Card ${card}`)}" data-lp-card="${esc(card)}" data-focus="lp-card-${esc(card)}"` : `role="img" aria-label="Card ${esc(card)}"`;
    return `<g class="lp-card${c.cls ? ` ${c.cls}` : ''}" transform="translate(${f(at.x + W.CARD / 2)},${f(at.y + W.CARD / 2)})" ${attrs}>${face(card)}</g>`;
  }).join('');
  return `<svg class="lp-world${look.cls ? ` ${look.cls}` : ''}" viewBox="-2 -12 ${f(L.width + 4)} ${f(L.height + 14)}" style="--lp-w:${f(L.width + 4)}" role="group" aria-label="${esc(look.label || 'Cards and loops')}">${frame}${loopParts}${cardParts}${badges}</svg>`;
}
const clueTile = (c, cls, attrs) => `<${attrs ? 'button type="button"' : 'span role="img"'} class="lp-clue${cls}" ${attrs || `aria-label="${esc(`${clueWords(c)} ${c[2]}`)}"`}>${icon(c[0])}<i class="lp-dash">–</i>${icon(c[1])}<b>${c[2]}</b></${attrs ? 'button' : 'span'}>`;
const labelButton = (label, enabled, hinted) => `<button type="button" class="lp-label l${label}${hinted ? ' hinted' : ''}" data-lp-label="${label}" data-focus="lp-label-${label}" aria-label="Loop ${label}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const button = (label, action, cls, enabled, hinted) => `<button type="button" class="secondary lp-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="lp-${esc(action.type)}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const pips = (used, of) => `<span class="lp-pips" role="img" aria-label="${used} of ${of} clues">${Array.from({length: of}, (_, k) => `<i class="${k < used ? 'on' : ''}"></i>`).join('')}</span>`;
const TOLD = {cross: 'Loops can’t cross.', order: 'Numbers grow outward.', same: 'That loop is there.', three: 'Tap three clues on three cards.', full: 'Take a clue away first.'};

function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), live = !done;
  const h = a.hintLevel >= 2 && live && q.mode !== 'playground' ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  const pick = live ? picked(p, b) : [], told = live ? current(p, b, 'told') : null;
  const claiming = live && q.mode === 'make' ? current(p, b, 'claiming') : null;
  const clues = cluesOf(q, b), loops = q.mode === 'pin' ? q.world : b.loops;
  const hintCards = h?.cards || (act?.type === 'add' ? act.cards : []);
  const isOff = refused(q, b);
  // The clues: lit when they hold; buttons after Can't, in a repair and in a pin.
  let clueRow = '';
  if (q.mode !== 'playground') {
    const tiles = clues.map((c, i) => {
      const lit = q.mode !== 'pin' && W.holds(loops, c), chosen = (claiming || []).includes(i) || (b.claim || []).includes(i);
      const changed = q.mode === 'repair' && b.change && b.change[0] === i;
      const hinted = (h?.clues || []).includes(i) || h?.clue === i || (act?.type === 'drop' && pairIs(act.pair, c));
      const cls = `${lit ? ' lit' : ''}${chosen ? ' chosen' : ''}${changed ? ' changed' : ''}${hinted ? ' hinted' : ''}`;
      const words = `${clueWords(c)} ${c[2]}${lit ? ', holds' : ''}`;
      let attrs = '';
      if (live && claiming) attrs = `data-lp-clue="${i}" data-focus="lp-clue-${i}" aria-pressed="${chosen}" aria-label="${esc(words)}"`;
      else if (live && q.mode === 'repair') attrs = `data-lp-clue="${i}" data-focus="lp-clue-${i}" aria-label="${esc(`${words}. Change it to ${nextValue(q, b, i)}`)}"`;
      else if (live && q.mode === 'pin') attrs = `data-lp-drop="${esc(JSON.stringify([c[0], c[1]]))}" data-focus="lp-clue-${c[0]}${c[1]}" aria-label="${esc(`${words}. Take it away`)}"`;
      return clueTile(c, cls, attrs);
    }).join('');
    clueRow = `<div class="lp-clues${q.mode === 'pin' ? ' asked' : ''}" role="group" aria-label="Clues">${tiles}</div>`;
  } else if (pick.length === 2) {
    const c = [...pick, W.distance(b.loops, pick[0], pick[1])];
    clueRow = `<div class="lp-clues" role="group" aria-label="Distance">${clueTile(c, ' lit', '')}</div>`;
  }
  // The bar: loop numbers, Can't, That's all, the pips.
  const bar = [];
  if (live && q.mode !== 'pin') {
    const canLoop = pick.length >= 2 && !claiming;
    bar.push(...W.LABELS.map(l => labelButton(l, canLoop, act?.type === 'add' && act.label === l)));
  }
  if (live && q.mode === 'make' && q.cant) bar.push(`<button type="button" class="secondary lp-button lp-cant${act?.type === 'cant' ? ' hinted' : ''}" data-lp-cant data-focus="lp-cant" aria-pressed="${Boolean(claiming)}" ${isOff ? 'disabled' : ''}>Can’t</button>`);
  if (live && q.mode === 'repair') bar.push(button('That’s all', {type: 'all'}, 'lp-all', b.told !== 'more' && b.found.length > 0, act?.type === 'all'));
  if (q.mode === 'pin' && live) bar.push(pips(b.asked.length, q.budget));
  // The board.
  const loopLook = (i, label, set) => {
    const bad = (told === 'cross' || told === 'order' || told === 'same') && current(p, b, 'loop') === i;
    const hinted = act?.type === 'remove' && act.label === label && sameSet(act.cards, set);
    const cls = [bad ? 'refused' : '', hinted ? 'hinted' : ''].filter(Boolean).join(' ');
    return {cls, act: live && q.mode !== 'pin', label: `Take away the ${label} loop round ${names(set)}`};
  };
  const cardLook = card => {
    const on = pick.includes(card), hinted = hintCards.includes(card);
    const cls = [on ? 'picked' : '', hinted ? 'hinted' : ''].filter(Boolean).join(' ');
    const words = q.mode === 'pin' ? (on ? `Card ${card}, chosen` : pick.length ? `Card ${card}. The clue ${pick[0]}–${card}` : `Card ${card}`) : `Card ${card}${on ? ', chosen' : ''}`;
    return {cls, act: live && !claiming, label: words};
  };
  const board = worldSvg(q, loops, {act: live, loop: loopLook, card: cardLook, maxWidth: q.maxWidth, label: q.mode === 'pin' ? 'The world' : 'Cards and loops'});
  // Below: a refused loop or claim, a world that fits too, repairs found.
  let line = told ? TOLD[told] : '', extra = '';
  if (isOff) {
    line = 'Loops can make these.';
    const three = b.claim.map(i => q.clues[i]), cards = q.cards.filter(c => three.some(t => t[0] === c || t[1] === c));
    extra = `<div class="lp-other">${worldSvg({cards}, W.worldOfClues(cards, three), {cls: 'mini', label: 'A world for these three clues'})}</div>`;
  }
  if (q.mode === 'pin' && live && b.asked.length === q.budget) {
    const other = W.otherWorld(q.cards, q.world, b.asked);
    if (other) { line = told ? line : 'This world fits too.'; extra = `<div class="lp-other">${worldSvg(q, other, {cls: 'mini', label: 'Another world that fits these clues', maxWidth: q.maxWidth})}</div>`; }
  }
  if (q.mode === 'repair' && b.told === 'more') line = 'There is another.';
  let shelf = '';
  if (q.mode === 'repair' && b.found.length) {
    shelf = `<div class="lp-found" role="group" aria-label="Changes found">${b.found.map(([i, v]) => clueTile([q.clues[i][0], q.clues[i][1], v], ' found', '')).join('')}</div>`;
  }
  const where = q.mode === 'pin' ? `${b.asked.length} of ${q.budget} clues.` : `${b.loops.length ? b.loops.map(([l, s]) => `${l} loop round ${names(s)}`).join('; ') : 'No loops'}.${clues.length ? ` ${clues.filter(c => W.holds(loops, c)).length} of ${clues.length} clues hold.` : ''}`;
  const status = `${where}${pick.length ? ` Chosen: ${pick.join(', ')}.` : ''}${line ? ` ${line}` : ''}`;
  return `<div class="lp-puzzle ${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="loops">${clueRow}${shelf}${bar.length ? `<div class="lp-bar">${bar.join('')}</div>` : ''}${board}${line ? `<p class="lp-told">${esc(line)}</p>` : ''}${extra}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

function wire(root, p, api) {
  const now = () => api.attempt().board;
  const at = () => JSON.stringify(now());
  // A move closes the view state, so Undo back to an earlier board never
  // brings back the cards chosen or a line drawn for it.
  const go = action => { uiState.delete(p.id); api.apply(action); };
  const press = el => {
    const b = now();
    if (solved(p, b)) return;
    if (el.dataset.lpCard !== undefined) {
      const r = cardTap(p, b, el.dataset.lpCard);
      if (r.move) go(r.move); else api.ui({pick: r.pick, told: r.told || null, at: at()});
    } else if (el.dataset.lpLoop !== undefined) {
      const [label, cards] = JSON.parse(el.dataset.lpLoop);
      go({type: 'remove', label, cards});
    } else if (el.dataset.lpLabel !== undefined) {
      const r = labelTap(p, b, Number(el.dataset.lpLabel));
      if (!r) return;
      if (r.move) go(r.move); else api.ui({told: r.told, loop: r.loop, pick: picked(p, b), at: at()});
    } else if (el.dataset.lpClue !== undefined) {
      const i = Number(el.dataset.lpClue);
      if (p.parameters.mode === 'repair') { go({type: 'change', clue: i}); return; }
      const r = clueTap(p, b, i);
      if (r.move) go(r.move); else api.ui({claiming: r.claiming, told: r.told || null, at: at()});
    } else if (el.dataset.lpDrop !== undefined) {
      go({type: 'drop', pair: JSON.parse(el.dataset.lpDrop)});
    } else if (el.dataset.lpCant !== undefined) {
      api.ui({claiming: current(p, b, 'claiming') ? null : [], pick: [], at: at()});
    }
  };
  const target = e => e.target.closest?.('[data-lp-card],[data-lp-loop],[data-lp-label],[data-lp-clue],[data-lp-drop],[data-lp-cant]');
  root.addEventListener('click', e => { const el = target(e); if (!el || el.disabled) return; e.preventDefault(); press(el); });
  root.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = target(e);
    if (!el || el.tagName === 'BUTTON') return;
    e.preventDefault(); press(el);
  });
}

export const loopsMechanic = {
  fresh, valid, solved, move, hint, render, wire,
  ui(p, payload) {
    if (!object(payload) || typeof payload.at !== 'string') return;
    const s = ui(p), keep = (field, value) => { s[field] = value === null || value === undefined ? null : {value, at: payload.at}; };
    if (Object.hasOwn(payload, 'pick')) keep('pick', payload.pick);
    if (Object.hasOwn(payload, 'claiming')) keep('claiming', payload.claiming);
    keep('told', payload.told || null);
    keep('loop', Number.isInteger(payload.loop) ? payload.loop : null);
  },
  reset: p => { uiState.delete(p.id); },
  // Undo takes back loops, not claims: a refused Can't stays while the loops
  // are the same, and repairs found and "There is another." stay too.
  carry(p, from, to) {
    const q = p.parameters;
    // Undo also closes the cards chosen and the lines drawn.
    uiState.delete(p.id);
    if (!object(from) || !object(to)) return to;
    if (q.mode === 'make' && refused(q, from) && to.claim === null && JSON.stringify(from.loops) === JSON.stringify(to.loops)) return {...to, claim: from.claim};
    if (q.mode === 'repair' && Array.isArray(from.found) && Array.isArray(to.found)) {
      return {...to, found: from.found.map(r => [...r]), told: from.told === 'more' ? 'more' : null};
    }
    return to;
  },
  noHint: p => p.parameters.mode === 'playground'
};

// The family seam entry (dist/families.js).
export const loopMechanics = {loops: loopsMechanic, loopsnum: {...loopsMechanic}};
export default {
  id: 'loops',
  family: {id: 'loops', symbol: '⦾', area: 'numbers', region: 'shape'},
  mechanics: loopMechanics,
  pack: new URL('./loops.json', import.meta.url).href,
  css: new URL('./loops.css', import.meta.url).href,
  focus: '.lp-card[role=button],.lp-badge[role=button],.lp-label:not([disabled]),.lp-clue[data-lp-clue],.lp-button:not([disabled])'
};
