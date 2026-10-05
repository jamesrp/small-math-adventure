// Lattice visibility (worksheet Week 31, "Hidden orchard"), the Sight lines
// group inside Mirror Couriers. Trees and lanterns stand on the points of a
// square grid, and the courier at one point sends a straight beam to each
// lantern. The beam stops at the first tree or lantern exactly on its line. Seen from
// (a, b) away, a lantern is hidden in a full orchard exactly when a and b
// share a factor d > 1, and then d - 1 points sit on the line between.
// Three moves: cut trees to light lanterns, plant trees to hide them, or move
// the courier. "Decide" puzzles may be impossible: after one move the child
// may say so, and the claim is checked.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const MAX_SIDE = 12;

const key = ([x, y]) => `${x},${y}`;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const isPoint = value => Array.isArray(value) && value.length === 2 && value.every(integer);
const inField = (q, pt) => isPoint(pt) && pt[0] >= 0 && pt[1] >= 0 && pt[0] <= q.size && pt[1] <= q.size;
const byPlace = (a, b) => a[0] - b[0] || a[1] - b[1];
const sorted = points => [...points].sort(byPlace);
export const field = q => Array.from({length: (q.size + 1) ** 2}, (_, i) => [i % (q.size + 1), Math.floor(i / (q.size + 1))]);
const isLantern = (q, pt) => q.lanterns.some(l => same(l, pt));
const start = q => q.courier ?? [0, 0];
export const courierOf = (q, b) => q.mode === 'stand' ? b.at : start(q);
const decides = q => q.decide === true;
const goalOf = q => q.mode === 'chop' ? (q.light ?? q.lanterns.length) : q.lanterns.length;

// The points strictly between v and t on the straight segment, nearest first,
// found by testing every point of the field (the validator uses gcd instead).
export function between(q, v, t) {
  const dx = t[0] - v[0], dy = t[1] - v[1], length = dx * dx + dy * dy;
  return field(q).filter(([x, y]) => {
    const px = x - v[0], py = y - v[1], along = px * dx + py * dy;
    return px * dy - py * dx === 0 && along > 0 && along < length;
  }).sort((a, b) => Math.abs(a[0] - v[0]) + Math.abs(a[1] - v[1]) - (Math.abs(b[0] - v[0]) + Math.abs(b[1] - v[1])));
}

// What stands where: every point is the courier, a lantern, a tree, a cut
// tree (chop) or empty (plant).
export function occupant(q, b, pt) {
  if (same(courierOf(q, b), pt)) return 'courier';
  if (isLantern(q, pt)) return 'lantern';
  if (q.mode === 'chop') return b.cut.some(c => same(c, pt)) ? 'cut' : 'tree';
  if (q.mode === 'plant') return b.trees.some(c => same(c, pt)) ? 'tree' : 'empty';
  return 'tree';
}
const blocks = kind => kind === 'tree' || kind === 'lantern';

// Each lantern's beam: the points on its line, where the beam stops (null when
// it reaches the lantern) and whether the lantern is lit.
export function sight(q, b) {
  const v = courierOf(q, b);
  return q.lanterns.map(lantern => {
    const line = between(q, v, lantern), stop = line.find(pt => blocks(occupant(q, b, pt))) ?? null;
    return {lantern, line, stop, lit: stop === null};
  });
}
const litCount = (q, b) => sight(q, b).filter(s => s.lit).length;
function goalMet(q, b) {
  const lit = litCount(q, b);
  return q.mode === 'plant' ? lit === 0 : lit >= goalOf(q);
}

// Puzzle answers, worked out on the grid. For chop: the cheapest lanterns to
// light and the trees to cut. For plant: one tree per lit lantern, on its
// line. For stand: every spot that sees all the lanterns.
export function plan(q) {
  const fresh = freshBoard({parameters: q});
  if (q.mode === 'chop') {
    const costs = sight(q, fresh).map((s, i) => ({i, line: s.line, cost: s.line.some(pt => isLantern(q, pt)) ? Infinity : s.line.length}))
      .sort((a, b) => a.cost - b.cost || a.i - b.i).slice(0, goalOf(q));
    const cut = sorted(costs.flatMap(c => c.line));
    const ok = costs.length === goalOf(q) && costs.every(c => c.cost < Infinity);
    return {possible: ok && cut.length <= q.budget, lanterns: costs.map(c => c.i).sort((a, b) => a - b), cut: ok ? cut : null};
  }
  if (q.mode === 'plant') {
    const lit = sight(q, fresh).filter(s => s.lit);
    const spots = lit.map(s => s.line);
    const ok = spots.every(line => line.length > 0);
    return {possible: ok && lit.length <= q.budget, trees: ok ? sorted(spots.map(line => line[0])) : null, spots: spots.map(line => sorted(line))};
  }
  const spots = field(q).filter(pt => !isLantern(q, pt) && litCount(q, {at: pt}) === q.lanterns.length);
  return {possible: spots.length > 0, spots};
}
const plans = new Map();
const planOf = q => { const k = JSON.stringify(q); if (!plans.has(k)) plans.set(k, plan(q)); return plans.get(k); };
export const possible = q => planOf(q).possible;

function freshBoard(p) {
  const q = p.parameters;
  const board = q.mode === 'chop' ? {cut: []} : q.mode === 'plant' ? {trees: []} : {at: start(q)};
  return decides(q) ? {...board, moved: false, claimed: false, wrong: false} : board;
}

function validParams(q) {
  return object(q) && ['chop', 'plant', 'stand'].includes(q.mode) && integer(q.size) && q.size >= 2 && q.size <= MAX_SIDE
    && Array.isArray(q.lanterns) && q.lanterns.length > 0 && q.lanterns.every(l => inField(q, l))
    && (q.mode === 'stand' || integer(q.budget) && q.budget > 0);
}
function validBoard(p, b) {
  const q = p.parameters;
  if (!validParams(q) || !object(b)) return false;
  const keys = [q.mode === 'chop' ? 'cut' : q.mode === 'plant' ? 'trees' : 'at', ...(decides(q) ? ['moved', 'claimed', 'wrong'] : [])];
  if (Object.keys(b).length !== keys.length || !keys.every(k => Object.hasOwn(b, k))) return false;
  if (q.mode === 'stand') { if (!inField(q, b.at) || isLantern(q, b.at)) return false; }
  else {
    const pts = b[keys[0]];
    if (!Array.isArray(pts) || pts.length > q.budget || !pts.every(pt => inField(q, pt))) return false;
    if (pts.some((pt, i) => i && byPlace(pts[i - 1], pt) >= 0)) return false;
    if (pts.some(pt => same(pt, start(q)) || isLantern(q, pt))) return false;
  }
  if (!decides(q)) return true;
  // A claim is saved only when it is true and a refusal only when it was
  // false, both after a move.
  if (![b.moved, b.claimed, b.wrong].every(v => typeof v === 'boolean')) return false;
  if ((b.claimed || b.wrong) && !b.moved) return false;
  if (b.claimed && (b.wrong || possible(q))) return false;
  return !b.wrong || possible(q);
}
function solvedBoard(p, b) {
  if (!validBoard(p, b)) return false;
  const q = p.parameters;
  return (decides(q) && b.claimed) || goalMet(q, b);
}

function move(p, b, action) {
  const q = p.parameters;
  if (!validBoard(p, b) || solvedBoard(p, b) || !object(action)) return null;
  if (action.type === 'claim') {
    if (!decides(q) || !b.moved || b.wrong) return null;
    return possible(q) ? {...b, wrong: true} : {...b, claimed: true};
  }
  if (action.type !== 'tap' || !inField(q, action.at)) return null;
  const pt = [action.at[0], action.at[1]], kind = occupant(q, b, pt);
  let next = null;
  if (q.mode === 'chop') {
    if (kind === 'cut') next = {...b, cut: b.cut.filter(c => !same(c, pt))};
    else if (kind === 'tree' && b.cut.length < q.budget) next = {...b, cut: sorted([...b.cut, pt])};
  } else if (q.mode === 'plant') {
    if (kind === 'tree') next = {...b, trees: b.trees.filter(c => !same(c, pt))};
    else if (kind === 'empty' && b.trees.length < q.budget) next = {...b, trees: sorted([...b.trees, pt])};
  } else if (kind === 'tree') next = {...b, at: pt};
  if (!next) return null;
  return decides(q) ? {...next, moved: true, wrong: false} : next;
}

const place = ([x, y]) => `${x} across, ${y} up`;
function hint(p, b) {
  const q = p.parameters;
  if (!validBoard(p, b)) return {type: 'deadend', text: 'Restart to reset the field.'};
  if (solvedBoard(p, b)) return {type: 'done'};
  if (decides(q)) return {type: 'note'};
  const beams = sight(q, b);
  if (q.mode === 'stand') {
    const here = b.at, spots = planOf(q).spots;
    const best = [...spots].sort((s, t) => (Math.abs(s[0] - here[0]) + Math.abs(s[1] - here[1])) - (Math.abs(t[0] - here[0]) + Math.abs(t[1] - here[1])) || byPlace(s, t))[0];
    const dark = beams.filter(s => !s.lit).length;
    return {type: 'move', action: {type: 'tap', at: best}, text: `From here ${plural(dark, 'lantern is', 'lanterns are')} hidden. Try standing at the outlined tree.`};
  }
  if (q.mode === 'chop') {
    // Finish the cheapest lanterns from here; put back a cut that no lantern
    // in the answer needs when there are not enough cuts left.
    const need = beams.map((s, i) => ({i, s, left: s.line.filter(pt => occupant(q, b, pt) !== 'cut'), stuck: s.line.some(pt => isLantern(q, pt))}))
      .filter(c => !c.stuck).sort((x, y) => x.left.length - y.left.length || x.i - y.i).slice(0, goalOf(q));
    const todo = need.flatMap(c => c.left);
    if (b.cut.length + todo.length <= q.budget) {
      const c = need.find(c => c.left.length);
      return {type: 'move', action: {type: 'tap', at: c.left[0]}, text: `The beam to a dark lantern stops at a tree on its line. Cut that tree.`};
    }
    const keep = new Set(planOf(q).cut.map(key)), spare = b.cut.find(pt => !keep.has(key(pt)));
    return {type: 'move', action: {type: 'tap', at: spare}, text: `This cut tree is not on the line to a lantern you need. Put it back.`};
  }
  // Plant: one tree on each lit lantern's line. A tree no beam stops at hides
  // nothing; take one away when the trees left would not cover the lit lanterns.
  const useful = new Set(beams.filter(s => s.stop && occupant(q, b, s.stop) === 'tree').map(s => key(s.stop)));
  const lit = beams.filter(s => s.lit);
  const spare = b.trees.find(pt => !useful.has(key(pt)));
  if (spare && b.trees.length + lit.length > q.budget) return {type: 'move', action: {type: 'tap', at: spare}, text: 'This tree hides nothing. Take it away.'};
  const target = lit.find(s => s.line.some(pt => occupant(q, b, pt) === 'empty'));
  if (!target) return {type: 'deadend', text: 'No point on the line to that lantern is free.'};
  return {type: 'move', action: {type: 'tap', at: target.line.find(pt => occupant(q, b, pt) === 'empty')}, text: 'A lit lantern needs a tree exactly on its beam, between it and the courier.'};
}

// The field: a square of points, the beams in an SVG behind them. Lanterns
// are rounded squares, trees and the courier are circles.
function point(q, pt) { const n = q.size + 1; return [((pt[0] + .5) * 100 / n).toFixed(2), ((q.size - pt[1] + .5) * 100 / n).toFixed(2)]; }
function beamLines(q, b) {
  const from = point(q, courierOf(q, b));
  return sight(q, b).map(s => {
    const end = point(q, s.stop ?? s.lantern), to = point(q, s.lantern);
    const beam = `<line class="orchard-beam${s.lit ? ' lit' : ''}" x1="${from[0]}" y1="${from[1]}" x2="${end[0]}" y2="${end[1]}"/>`;
    return s.lit ? beam : `${beam}<line class="orchard-thread" x1="${end[0]}" y1="${end[1]}" x2="${to[0]}" y2="${to[1]}"/>`;
  }).join('');
}
const LABEL = {
  chop: {tree: 'Tree, tap to cut', cut: 'Cut tree, tap to put back'},
  plant: {tree: 'Planted tree, tap to take away', empty: 'Empty, tap to plant a tree'},
  stand: {tree: 'Tree, tap to stand here'}
};
function renderField(p, a, hinted) {
  const q = p.parameters, b = a.board, solved = solvedBoard(p, b), lit = new Set(sight(q, b).filter(s => s.lit).map(s => key(s.lantern)));
  const pts = field(q).map(pt => {
    const kind = occupant(q, b, pt), [x, y] = point(q, pt), style = `left:${x}%;top:${y}%`;
    if (kind === 'courier') return `<span class="orchard-pt courier" style="${style}" role="img" aria-label="Courier at ${place(pt)}"></span>`;
    if (kind === 'lantern') return `<span class="orchard-pt lantern${lit.has(key(pt)) ? ' lit' : ''}" style="${style}" role="img" aria-label="Lantern at ${place(pt)}, ${lit.has(key(pt)) ? 'lit' : 'dark'}"></span>`;
    const label = `${LABEL[q.mode][kind]}, ${place(pt)}`;
    return `<button type="button" class="orchard-pt ${kind}${hinted && same(hinted, pt) ? ' hinted' : ''}" style="${style}" data-orchard-move="${esc(JSON.stringify({type: 'tap', at: pt}))}" data-focus="orchard-${key(pt)}" aria-label="${esc(label)}" ${solved ? 'disabled' : ''}></button>`;
  }).join('');
  return `<div class="orchard-field" style="--n:${q.size + 1}" role="group" aria-label="Orchard of ${q.size + 1} by ${q.size + 1} points"><svg class="orchard-beams" viewBox="0 0 100 100" aria-hidden="true">${beamLines(q, b)}</svg>${pts}</div>`;
}
function budgetRow(q, b) {
  if (q.mode === 'stand') return '';
  const used = (q.mode === 'chop' ? b.cut : b.trees).length, word = q.mode === 'chop' ? 'cut' : 'tree';
  const tokens = Array.from({length: q.budget}, (_, i) => `<i class="${i < q.budget - used ? 'left' : 'used'}"></i>`).join('');
  return `<div class="orchard-budget ${q.mode}" role="img" aria-label="${plural(q.budget - used, word)} left">${tokens}</div>`;
}
const CLAIM = {plant: 'Some can’t be hidden', stand: 'No spot sees them all', chop: 'They can’t all be lit'};
const REFUSED = {plant: 'Every lantern can be hidden. Keep looking.', stand: 'Some spot sees every lantern. Keep looking.', chop: 'They can all be lit. Keep looking.'};
const RIGHT = {plant: 'Right: some lantern has no point on its line to hide it.', stand: 'Right: no spot sees every lantern.', chop: 'Right: they can’t all be lit.'};
function render(p, a) {
  const q = p.parameters, b = a.board, solved = solvedBoard(p, b);
  const shown = a.hintLevel >= 2 && !solved ? hint(p, b) : null;
  const hinted = shown?.action?.type === 'tap' ? shown.action.at : null;
  const claim = decides(q) && !solved ? `<button type="button" class="secondary orchard-claim" data-orchard-move="${esc(JSON.stringify({type: 'claim'}))}" data-focus="orchard-claim" ${b.moved && !b.wrong ? '' : 'disabled'}>${CLAIM[q.mode]}</button>` : '';
  const said = !decides(q) ? '' : b.claimed ? RIGHT[q.mode] : b.wrong ? REFUSED[q.mode] : '';
  const beams = sight(q, b), litN = beams.filter(s => s.lit).length;
  const status = `${litN} of ${plural(q.lanterns.length, 'lantern')} lit.${q.mode === 'stand' ? ` Courier at ${place(b.at)}.` : ''}`;
  return `<div class="orchard-puzzle mode-${q.mode}" data-mechanic-wire="orchard">${renderField(p, a, hinted)}${budgetRow(q, b)}${claim ? `<div class="orchard-tools">${claim}</div>` : ''}${said ? `<p class="orchard-note${b.claimed ? ' good' : ''}" role="status">${esc(said)}</p><p class="sr-only">${esc(status)}</p>` : `<p class="sr-only" role="status">${esc(status)}</p>`}</div>`;
}

// Taps go through the module, so an illegal tap shakes the point instead of
// reporting an error.
function wire(root, p, api) {
  root.addEventListener('click', e => {
    const control = e.target.closest('[data-orchard-move]');
    if (!control || !root.contains(control) || control.disabled) return;
    let action;
    try { action = JSON.parse(control.dataset.orchardMove); } catch { return; }
    if (!move(p, api.attempt().board, action)) {
      control.classList.remove('shake'); void control.offsetWidth; control.classList.add('shake');
      return;
    }
    api.apply(action);
  });
}

export const orchardMechanics = {
  orchard: {fresh: freshBoard, valid: validBoard, solved: solvedBoard, move, hint, render, wire}
};

// The family seam entry (dist/families.js). The puzzles join Mirror Couriers
// as its Sight lines group, so the module adds no satchel family.
export default {
  id: 'orchard',
  mechanics: orchardMechanics,
  pack: new URL('./orchard.json', import.meta.url).href,
  css: new URL('./orchard.css', import.meta.url).href,
  focus: '.orchard-pt:not(:disabled),.orchard-claim:not(:disabled)'
};
