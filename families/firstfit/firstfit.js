// First fit and Why not fewer (worksheet Week 62), two groups inside Neighbor
// Lanterns. Linked lanterns must have different colours.
// - First fit: the child taps lanterns one at a time and each takes the first
//   colour none of its lit neighbours has. The order decides how many colours
//   appear, from the fewest up to the Grundy number (at most one more than the
//   most links at any lantern).
// - Why not fewer: colour with as few colours as possible, then prove that
//   fewer cannot work by tapping lanterns that all link to each other (a
//   clique) or a ring of odd length (an odd cycle needs three colours).
// Graphs use the Neighbor Lanterns format: vertices, edges and positions.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const index = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const MARKS = ['●', '▲', '■', '◆', '★'];

// Neighbour lists by vertex index.
const neighbourMemo = new WeakMap();
export function neighbours(q) {
  if (!neighbourMemo.has(q)) {
    const list = q.vertices.map(() => []);
    for (const [u, v] of q.edges) { const a = q.vertices.indexOf(u), b = q.vertices.indexOf(v); list[a].push(b); list[b].push(a); }
    neighbourMemo.set(q, list);
  }
  return neighbourMemo.get(q);
}
const linked = (q, a, b) => neighbours(q)[a].includes(b);

// ---------------------------------------------------------------- first fit
// The colours an order gives: each vertex takes the first colour absent from
// its already coloured neighbours.
export function firstFit(q, order) {
  const colors = q.vertices.map(() => 0), near = neighbours(q);
  for (const v of order) {
    const used = new Set(near[v].map(w => colors[w]));
    let c = 1;
    while (used.has(c)) c++;
    colors[v] = c;
  }
  return colors;
}
const used = colors => Math.max(0, ...colors);
// Completes an order from a prefix so that first fit uses exactly `target`
// colours, or returns null. Partial colourings already shown to fail are
// remembered.
export function completeOrder(q, prefix, target) {
  const n = q.vertices.length, near = neighbours(q), failed = new Set();
  const order = [...prefix], colors = firstFit(q, prefix);
  if (used(colors) > target) return null;
  const go = () => {
    if (order.length === n) return used(colors) === target;
    const key = colors.join('');
    if (failed.has(key)) return false;
    for (let v = 0; v < n; v++) {
      if (colors[v]) continue;
      const taken = new Set(near[v].map(w => colors[w]));
      let c = 1;
      while (taken.has(c)) c++;
      if (c > target) continue;
      colors[v] = c; order.push(v);
      if (go()) return true;
      colors[v] = 0; order.pop();
    }
    failed.add(key);
    return false;
  };
  return go() ? order : null;
}
// The most colours any order uses (the Grundy number), by search.
const grundyMemo = new WeakMap();
export function mostColors(q) {
  if (!grundyMemo.has(q)) {
    let best = 0;
    for (let k = 1; k <= q.vertices.length; k++) if (completeOrder(q, [], k)) best = k;
    grundyMemo.set(q, best);
  }
  return grundyMemo.get(q);
}
const reachable = (q, k) => mostColors(q) >= k && Boolean(completeOrder(q, [], k));

// Board: {order, tried, claimed, wrong}. `tried` counts finished orders;
// `claimed` is an accepted claim that no order reaches the target.
function fitFresh() { return {order: [], tried: 0, claimed: false, wrong: false}; }
function fitValid(q, b) {
  const n = q.vertices.length;
  if (!Array.isArray(b.order) || b.order.length > n || !b.order.every(v => integer(v) && v >= 0 && v < n) || new Set(b.order).size !== b.order.length) return false;
  if (!integer(b.tried) || b.tried < 0 || b.tried > 999 || typeof b.claimed !== 'boolean' || typeof b.wrong !== 'boolean') return false;
  if (b.order.length === n && b.tried < 1) return false;
  if (b.claimed && (q.goal !== 'decide' || reachable(q, q.target) || b.tried < 1)) return false;
  return !b.wrong || (q.goal === 'decide' && b.tried >= 1 && reachable(q, q.target));
}
const finished = (q, b) => b.order.length === q.vertices.length;
const fitSolved = (q, b) => b.claimed || (finished(q, b) && used(firstFit(q, b.order)) === q.target);
function fitMove(q, b, action) {
  if (action.type === 'tap') {
    const v = index(action.vertex);
    if (!integer(v) || v < 0 || v >= q.vertices.length || b.order.includes(v)) return null;
    const order = [...b.order, v];
    return {...b, order, tried: order.length === q.vertices.length ? b.tried + 1 : b.tried, wrong: false};
  }
  if (action.type === 'again') return b.order.length ? {...b, order: [], wrong: false} : null;
  if (action.type === 'claim') {
    if (q.goal !== 'decide' || b.tried < 1 || b.wrong) return null;
    return reachable(q, q.target) ? {...b, wrong: true} : {...b, claimed: true, wrong: false};
  }
  return null;
}
function fitHint(q, b) {
  if (q.goal === 'decide') return {type: 'note'};
  const rest = completeOrder(q, b.order, q.target);
  if (!rest) return {type: 'move', action: {type: 'again'}, text: finished(q, b) ? `This order used ${plural(used(firstFit(q, b.order)), 'colour')}. Press Again and try another order.` : `From here no order uses exactly ${plural(q.target, 'colour')}. Press Again.`};
  const v = rest[b.order.length], c = firstFit(q, rest.slice(0, b.order.length + 1))[v];
  return {type: 'move', action: {type: 'tap', vertex: v}, text: `Tap ${q.vertices[v]} next. It takes colour ${c}.`};
}

// ---------------------------------------------------------------- why not fewer
// Board: {colors, selected, proving, proof, checked}. While colouring, a tap
// paints the selected colour (or clears with colour 0); while proving, a tap
// adds a lantern to the proof or takes it off.
function fewFresh(q) { return {colors: q.vertices.map(() => 0), selected: 1, proving: false, proof: [], checked: false}; }
function fewValid(q, b) {
  const n = q.vertices.length;
  if (!Array.isArray(b.colors) || b.colors.length !== n || !b.colors.every(c => integer(c) && c >= 0 && c <= q.palette)) return false;
  if (!integer(b.selected) || b.selected < 0 || b.selected > q.palette || typeof b.proving !== 'boolean' || typeof b.checked !== 'boolean') return false;
  if (!Array.isArray(b.proof) || !b.proof.every(v => integer(v) && v >= 0 && v < n) || new Set(b.proof).size !== b.proof.length) return false;
  if (b.proving && !proper(q, b.colors)) return false;
  return !b.checked || b.proving;
}
export const proper = (q, colors) => colors.every(Boolean) && q.edges.every(([u, v]) => colors[q.vertices.indexOf(u)] !== colors[q.vertices.indexOf(v)]);
const clashes = (q, colors) => q.edges.filter(([u, v]) => { const a = colors[q.vertices.indexOf(u)]; return a && a === colors[q.vertices.indexOf(v)]; });
// How many colours a proof shows are needed: a clique of size r needs r; a
// ring of odd length (in tap order) needs 3. Otherwise 0.
export function shows(q, proof) {
  const k = proof.length;
  if (k >= 2 && proof.every((a, i) => proof.slice(i + 1).every(b => linked(q, a, b)))) return k;
  if (k >= 3 && k % 2 === 1 && proof.every((a, i) => linked(q, a, proof[(i + 1) % k]))) return 3;
  return 0;
}
const fewSolved = (q, b) => b.checked && proper(q, b.colors) && shows(q, b.proof) === used(b.colors);
function fewMove(q, b, action) {
  if (action.type === 'palette') {
    const c = index(action.color);
    if (b.proving || !integer(c) || c < 0 || c > q.palette || c === b.selected) return null;
    return {...b, selected: c};
  }
  if (action.type === 'tap') {
    const v = index(action.vertex);
    if (!integer(v) || v < 0 || v >= q.vertices.length) return null;
    if (b.proving) return {...b, checked: false, proof: b.proof.includes(v) ? b.proof.filter(w => w !== v) : [...b.proof, v]};
    if (b.colors[v] === b.selected) return null;
    return {...b, colors: b.colors.map((c, w) => w === v ? b.selected : c)};
  }
  if (action.type === 'prove') return !b.proving && proper(q, b.colors) ? {...b, proving: true, checked: false} : null;
  if (action.type === 'recolour') return b.proving ? {...b, proving: false, proof: [], checked: false} : null;
  if (action.type === 'check') return b.proving && !b.checked && b.proof.length ? {...b, checked: true} : null;
  return null;
}
// An optimal colouring that keeps as much of the child's as it can.
function colourWith(q, colors, k) {
  const n = q.vertices.length, near = neighbours(q), out = [...colors];
  const go = v => {
    if (v === n) return true;
    const options = out[v] && out[v] <= k ? [out[v], ...Array.from({length: k}, (_, i) => i + 1).filter(c => c !== out[v])] : Array.from({length: k}, (_, i) => i + 1);
    const was = out[v];
    for (const c of options) {
      if (near[v].some(w => w < v && out[w] === c)) continue;
      out[v] = c;
      if (go(v + 1)) return true;
    }
    out[v] = was;
    return false;
  };
  return go(0) ? out : null;
}
export const fewestColors = q => Array.from({length: q.vertices.length}, (_, i) => i + 1).find(k => colourWith(q, q.vertices.map(() => 0), k));
function fewHint(q, b) {
  const k = fewestColors(q);
  if (!b.proving) {
    if (proper(q, b.colors) && used(b.colors) === k) return {type: 'move', action: {type: 'prove'}, text: `${plural(k, 'colour')} is the fewest. Now show why fewer cannot work.`};
    const target = colourWith(q, b.colors, k);
    const v = target.findIndex((c, i) => c !== b.colors[i]);
    if (b.selected !== target[v]) return {type: 'move', action: {type: 'palette', color: target[v]}, text: `Choose colour ${target[v]} (${MARKS[target[v] - 1]}).`};
    return {type: 'move', action: {type: 'tap', vertex: v}, text: `Give ${q.vertices[v]} colour ${target[v]}. ${plural(k, 'colour')} can do it.`};
  }
  if (used(b.colors) !== k) return {type: 'move', action: {type: 'recolour'}, text: `These lanterns use ${plural(used(b.colors), 'colour')}. Fewer can work: recolour.`};
  const proof = q.proof.map(name => q.vertices.indexOf(name));
  const extra = b.proof.find(v => !proof.includes(v));
  if (extra !== undefined || b.proof.some((v, i) => v !== proof[i])) return {type: 'move', action: {type: 'tap', vertex: extra ?? b.proof.at(-1)}, text: `Take ${q.vertices[extra ?? b.proof.at(-1)]} off the proof.`};
  if (b.proof.length < proof.length) { const v = proof[b.proof.length]; return {type: 'move', action: {type: 'tap', vertex: v}, text: `Add ${q.vertices[v]} to the proof.`}; }
  return {type: 'move', action: {type: 'check'}, text: 'Check the proof.'};
}

// ---------------------------------------------------------------- shared
const MODES = {
  firstfit: {fresh: fitFresh, valid: fitValid, solved: fitSolved, move: fitMove},
  fewest: {fresh: fewFresh, valid: fewValid, solved: fewSolved, move: fewMove}
};
const modeOf = p => MODES[p.mechanic];
const valid = (p, b) => object(b) && modeOf(p).valid(p.parameters, b);
const solved = (p, b) => valid(p, b) && modeOf(p).solved(p.parameters, b);
function move(p, b, action) {
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const next = modeOf(p).move(p.parameters, b, action);
  return next && valid(p, next) ? next : null;
}
function hint(p, b) {
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart to clear the board.'};
  if (solved(p, b)) return {type: 'done'};
  return p.mechanic === 'firstfit' ? fitHint(p.parameters, b) : fewHint(p.parameters, b);
}

// ---------------------------------------------------------------- render
function graph(q, {colors, order = [], proof = [], hinted = null, tap, disabled = false}) {
  const xy = q.positions, near = neighbours(q);
  const lines = q.edges.map(([u, v]) => {
    const [x1, y1] = xy[u], [x2, y2] = xy[v], a = q.vertices.indexOf(u), b = q.vertices.indexOf(v);
    const clash = colors[a] && colors[a] === colors[b];
    const inProof = proof.length > 1 && proof.includes(a) && proof.includes(b) && (shows(q, proof) === proof.length ? true : Math.abs(proof.indexOf(a) - proof.indexOf(b)) === 1 || Math.abs(proof.indexOf(a) - proof.indexOf(b)) === proof.length - 1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${clash ? 'ff-clash' : ''}${inProof ? ' ff-proof-line' : ''}"/>`;
  }).join('');
  const dots = q.vertices.map((name, v) => {
    const [x, y] = xy[name], c = colors[v], step = order.indexOf(v), mark = proof.indexOf(v);
    const label = `Lantern ${name}${c ? `, colour ${c}` : ', no colour'}${step >= 0 ? `, tapped ${step + 1}` : ''}${mark >= 0 ? `, in the proof` : ''}, ${plural(near[v].length, 'link')}`;
    return `<button type="button" class="ff-dot${c ? ` c${c}` : ''}${mark >= 0 ? ' in-proof' : ''}${hinted === v ? ' hinted' : ''}" style="left:${x}%;top:${y}%" data-ff-move="${esc(JSON.stringify({type: 'tap', vertex: v}))}" data-focus="ff-${esc(name)}" aria-label="${esc(label)}" ${disabled ? 'disabled' : ''}><span class="ff-name">${esc(name)}</span><span class="ff-mark" aria-hidden="true">${c ? MARKS[c - 1] : ''}</span>${step >= 0 ? `<span class="ff-step" aria-hidden="true">${step + 1}</span>` : ''}</button>`;
  }).join('');
  return `<div class="ff-graph" role="group" aria-label="Lanterns and links"><svg class="ff-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${dots}</div>`;
}
const control = (label, action, cls = 'secondary', extra = '') => `<button type="button" class="${cls} ff-action" data-ff-move="${esc(JSON.stringify(action))}" data-focus="ff-${esc(action.type)}${action.color !== undefined ? `-${action.color}` : ''}" ${extra}>${label}</button>`;
const swatches = k => Array.from({length: k}, (_, i) => `<span class="ff-swatch c${i + 1}" aria-hidden="true">${MARKS[i]}</span>`).join('');
function renderFit(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), colors = firstFit(q, b.order), n = used(colors);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const strip = `<p class="ff-order" aria-label="Order so far: ${b.order.length ? b.order.map(v => q.vertices[v]).join(', ') : 'none'}">${b.order.length ? b.order.map(v => `<span class="ff-chip c${colors[v]}">${esc(q.vertices[v])}</span>`).join('') : '<span class="ff-empty">Tap a lantern to start.</span>'}</p>`;
  const tally = `<p class="ff-tally" aria-label="${plural(n, 'colour')} so far">${swatches(n)}${n ? '' : '&nbsp;'}</p>`;
  let say = '';
  if (finished(q, b) && !done) say = `<p class="ff-say" role="status">This order used ${plural(n, 'colour')}.${q.goal === 'decide' ? '' : ` The goal is ${q.target}.`}</p>`;
  if (b.wrong) say = `<p class="ff-say" role="status">Some order does use ${plural(q.target, 'colour')}. Keep looking.</p>`;
  if (b.claimed) say = `<p class="ff-say good" role="status">Right: no order uses ${plural(q.target, 'colour')}.</p>`;
  const tools = done ? '' : `${control('<span aria-hidden="true">↺</span> Again', {type: 'again'}, `secondary${shown?.action?.type === 'again' ? ' hinted' : ''}`, b.order.length ? '' : 'disabled')}${q.goal === 'decide' ? control(`No order uses ${q.target}`, {type: 'claim'}, 'secondary ff-claim', b.tried && !b.wrong ? '' : 'disabled') : ''}`;
  return `<div class="firstfit-puzzle mode-fit" data-mechanic-wire="firstfit">${tally}${graph(q, {colors, order: b.order, hinted: shown?.action?.type === 'tap' ? shown.action.vertex : null, disabled: done || finished(q, b)})}${strip}<div class="ff-tools">${tools}</div>${say}</div>`;
}
function renderFew(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), n = used(b.colors);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const hinted = shown?.action?.type === 'tap' ? shown.action.vertex : null;
  const palette = b.proving ? '' : `<div class="ff-palette" role="group" aria-label="Choose a colour">${Array.from({length: q.palette}, (_, i) => control(`${MARKS[i]} ${i + 1}`, {type: 'palette', color: i + 1}, `secondary ff-pick c${i + 1}${shown?.action?.type === 'palette' && shown.action.color === i + 1 ? ' hinted' : ''}`, `aria-pressed="${b.selected === i + 1}" aria-label="Colour ${i + 1}, ${MARKS[i]}"`)).join('')}${control('Clear', {type: 'palette', color: 0}, 'secondary ff-pick', `aria-pressed="${b.selected === 0}"`)}</div>`;
  const bad = clashes(q, b.colors);
  let say = '';
  if (!b.proving) say = `<p class="ff-say" role="status">${bad.length ? `Linked lanterns share a colour: ${bad.map(([u, v]) => `${esc(u)}–${esc(v)}`).join(', ')}.` : proper(q, b.colors) ? `Every lantern is lit, with ${plural(n, 'colour')}. Now show why fewer cannot work.` : ''}</p>`;
  else if (b.checked && !done) {
    const k = shows(q, b.proof);
    say = `<p class="ff-say" role="status">${k ? `These lanterns show that at least ${plural(k, 'colour')} are needed, but your lanterns use ${n}.` : 'These lanterns do not all link to each other, and they are not a ring of odd length in the order you tapped them.'}</p>`;
  } else if (done) say = `<p class="ff-say good" role="status">${plural(n, 'colour')}, and no fewer.</p>`;
  else say = `<p class="ff-say" role="status">Tap lanterns that all link to each other, or go around a ring of odd length.</p>`;
  const tools = done ? '' : b.proving
    ? `${control('Check', {type: 'check'}, `primary${shown?.action?.type === 'check' ? ' hinted' : ''}`, b.proof.length && !b.checked ? '' : 'disabled')}${control('Recolour', {type: 'recolour'}, `secondary${shown?.action?.type === 'recolour' ? ' hinted' : ''}`)}`
    : control('Show why not fewer', {type: 'prove'}, `primary${shown?.action?.type === 'prove' ? ' hinted' : ''}`, proper(q, b.colors) ? '' : 'disabled');
  return `<div class="firstfit-puzzle mode-fewest${b.proving ? ' proving' : ''}" data-mechanic-wire="firstfit">${palette}${graph(q, {colors: b.colors, proof: b.proving ? b.proof : [], hinted, disabled: done})}<div class="ff-tools">${tools}</div>${say}</div>`;
}

let tapped = null;
function wire(root, p, api) {
  if (tapped !== null) root.querySelector(`[data-focus="ff-${CSS.escape(tapped)}"]`)?.classList.add('placed');
  tapped = null;
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-ff-move]');
    if (!el || !root.contains(el) || el.disabled) return;
    let action;
    try { action = JSON.parse(el.dataset.ffMove); } catch { return; }
    if (!move(p, api.attempt().board, action)) {
      if (action.type === 'tap') { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
      return;
    }
    tapped = action.type === 'tap' && p.mechanic === 'firstfit' ? p.parameters.vertices[action.vertex] : null;
    api.apply(action);
  });
}

const shared = {valid, solved, move, hint, wire};
export const firstFitMechanics = {
  firstfit: {
    ...shared,
    fresh: () => fitFresh(),
    render: renderFit,
    demo: 'Tap the lanterns one at a time. Each lantern takes the first colour that none of its linked neighbours has. The order you choose decides how many colours appear.'
  },
  fewest: {
    ...shared,
    fresh: p => fewFresh(p.parameters),
    render: renderFew,
    demo: 'Choose a colour, then tap lanterns to colour them; linked lanterns must differ. Then show why fewer colours cannot work: tap lanterns that all link to each other, or go around a ring of odd length.'
  }
};

// The family seam entry (dist/families.js). The puzzles join Neighbor
// Lanterns as its First fit and Why not fewer groups.
export default {
  id: 'firstfit',
  mechanics: firstFitMechanics,
  pack: new URL('./firstfit.json', import.meta.url).href,
  css: new URL('./firstfit.css', import.meta.url).href,
  focus: '.ff-dot:not(:disabled),.firstfit-puzzle .primary:not(:disabled)'
};
