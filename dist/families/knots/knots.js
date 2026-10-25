// Knot colours (worksheet Week 40, loop colour certificates). A knot diagram
// is drawn as arcs: an arc runs from one underpass to the next, over any
// crossings between. Each arc gets one of three colours, and at every crossing
// the over arc and the two arcs that stop there are all one colour or all
// three colours. With colours 0, 1, 2 that is one rule, a + b + c ≡ 0 (mod 3),
// symmetric in the three arcs, so any two arcs at a crossing force the third.
//
// Reidemeister moves carry colourings across one for one, so the number of
// colourings is a knot invariant. A plain loop has only its three one-colour
// colourings, so a colouring with more than one colour certifies that a loop
// is knotted (the trefoil, the granny knot, 6_1). The converse fails: the
// figure-eight, 5_1 and 5_2 are knotted and still have only one-colour
// colourings, so equal counts never say two loops are the same.
//
// A tap on an arc cycles its colour; each crossing shows whether it works once
// its three arcs have colours. Solves: complete the colours, use more than one
// colour, find every colouring and press That's all, and match end colours on
// a tangle. The claims are the child's own certificates: One colour only is
// accepted when one crossing is coloured all different, every other coloured
// arc is forced from it, and a crossing clashes; Can't when every coloured arc
// is forced by the dots and a crossing or a dot clashes. A refusal says only
// what is missing from the chain, never whether the claim is true.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const COLOURS = ['red', 'blue', 'yellow'];
const isColour = c => c === 0 || c === 1 || c === 2;
const mod3 = n => ((n % 3) + 3) % 3;
export const nextColour = c => c === null ? 0 : (c + 1) % 3;
// The crossing rule: all one colour or all different, as one equation.
export const works = (a, b, c) => mod3(a + b + c) === 0;

// --- Pictures -----------------------------------------------------------------
// A puzzle's parameters (or a playground knot) hold the drawn pieces:
//   arcs: [{d: [[x, y], …], name, pic}]          polylines in a box 100 wide
//   crossings: [{at: [x, y], over, under: [in, out], pic}]
//   ends: [{at: [x, y], arc, colour?, match?}]    end dots of tangle strands
//   locked: [colour or null per arc]              arcs given at the start
//   pictures: [{code}]                            the exact crossing code of each picture
export const playKnot = (q, b) => q.knots[b.knot];
const shapeOf = (p, b) => p.parameters.mode === 'playground' ? playKnot(p.parameters, b) : p.parameters;
const lockedOf = q => q.locked || q.arcs.map(() => null);
const slots = (q, x) => [x.over, ...x.under];

// --- Status of crossings and end dots -----------------------------------------
export function crossingState(q, colours, x) {
  const c = slots(q, x).map(a => colours[a]);
  if (c.some(v => v === null)) return 'open';
  return works(...c) ? 'ok' : 'clash';
}
export function endState(q, colours, e) {
  const own = colours[e.arc];
  if (isColour(e.colour)) return own === null ? 'open' : own === e.colour ? 'ok' : 'clash';
  if (Number.isInteger(e.match)) {
    const other = colours[q.ends[e.match].arc];
    return own === null || other === null ? 'open' : own === other ? 'ok' : 'clash';
  }
  return 'free';
}
const full = colours => colours.every(isColour);
export const allWork = (q, colours) => q.crossings.every(x => crossingState(q, colours, x) !== 'clash') && q.ends.every(e => endState(q, colours, e) !== 'clash');
export const isColouring = (q, colours) => full(colours) && allWork(q, colours);
export const keyOf = colours => colours.map(c => c === null ? '-' : c).join('');
const fromKey = key => [...key].map(ch => ch === '-' ? null : Number(ch));
const manyColours = colours => new Set(colours).size > 1;

// --- Forced colours -------------------------------------------------------------
// Two arcs at a crossing force the third; a fixed end dot forces its arc; a
// matched end dot forces its partner's arc. Returns the forced colours and the
// first clash found, or null when none.
function constraints(q) {
  const out = q.crossings.map((x, i) => ({kind: 'crossing', i, arcs: slots(q, x)}));
  q.ends.forEach((e, i) => {
    if (isColour(e.colour)) out.push({kind: 'end', i, arcs: [e.arc], fixed: e.colour});
    else if (Number.isInteger(e.match) && e.match > i) out.push({kind: 'match', i, arcs: [e.arc, q.ends[e.match].arc]});
  });
  return out;
}
export function propagate(q, start) {
  const colours = [...start], cons = constraints(q), order = start.map((c, i) => c === null ? -1 : i).filter(i => i >= 0);
  const set = (a, c) => { colours[a] = c; order.push(a); };
  for (let changed = true; changed;) {
    changed = false;
    for (const k of cons) {
      if (k.kind === 'end') {
        const a = k.arcs[0];
        if (colours[a] === null) { set(a, k.fixed); changed = true; }
        else if (colours[a] !== k.fixed) return {colours, clash: k, order};
        continue;
      }
      if (k.kind === 'match') {
        const [a, b] = k.arcs;
        if (colours[a] === null && colours[b] !== null) { set(a, colours[b]); changed = true; }
        else if (colours[b] === null && colours[a] !== null) { set(b, colours[a]); changed = true; }
        else if (colours[a] !== null && colours[a] !== colours[b]) return {colours, clash: k, order};
        continue;
      }
      // A crossing: the slots add to 0 mod 3 (an arc in two slots counts twice).
      const unknown = [...new Set(k.arcs.filter(a => colours[a] === null))];
      const known = k.arcs.filter(a => colours[a] !== null).reduce((s, a) => s + colours[a], 0);
      if (!unknown.length) { if (mod3(known)) return {colours, clash: k, order}; continue; }
      if (unknown.length > 1) continue;
      const times = mod3(k.arcs.filter(a => a === unknown[0]).length);
      if (!times) { if (mod3(known)) return {colours, clash: k, order}; continue; }
      set(unknown[0], mod3(-known * times)); // 1 and 2 are their own inverses mod 3
      changed = true;
    }
  }
  return {colours, clash: null, order};
}
// Every way to finish the colours from a partial start (locked arcs kept),
// by depth-first search with forcing, in the order of arcs and colours.
const answerCache = new Map();
export function completions(q, start = lockedOf(q)) {
  const key = JSON.stringify([q.arcs.length, q.crossings.map(x => slots(q, x)), q.ends, start]);
  if (answerCache.has(key)) return answerCache.get(key);
  const out = [], seen = new Set();
  (function search(cols) {
    const {colours, clash} = propagate(q, cols);
    if (clash) return;
    const free = colours.indexOf(null);
    if (free < 0) { const k = keyOf(colours); if (!seen.has(k) && isColouring(q, colours)) { seen.add(k); out.push(colours); } return; }
    for (const c of [0, 1, 2]) { const next = [...colours]; next[free] = c; search(next); }
  })([...start]);
  out.sort((a, b) => keyOf(a) < keyOf(b) ? -1 : 1);
  answerCache.set(key, out);
  return out;
}
// The answers each mode asks for.
export const nonConstant = q => completions(q).filter(manyColours);
export function targets(q) {
  if (q.mode === 'more') return nonConstant(q);
  return completions(q);
}
// "One colour only": no colouring uses two colours. "Can't": no completion.
export const claimTrue = q => q.claim === 'one' ? nonConstant(q).length === 0 : q.claim === 'cant' ? completions(q).length === 0 : false;

// A chain of forced colours. One colour only: colour a crossing all different
// (by default top red, in blue, out yellow; `perm` gives another order) and
// follow the forced colours to a clash. A colouring with two colours has a
// crossing like that somewhere, since colour changes only at a crossing whose
// two stopping arcs differ, and every order of three colours keeps the rule,
// so a clash from every crossing rules out every colouring with two colours.
// Can't: the colours forced by the dots and the given arcs, up to the clash.
export function certificate(q, seed = 0, perm = [0, 1, 2]) {
  if (q.claim === 'cant') return propagate(q, lockedOf(q));
  const x = q.crossings[seed], start = q.arcs.map(() => null);
  [start[x.over], start[x.under[0]], start[x.under[1]]] = perm;
  return propagate(q, start);
}
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
// The full boards a hint can aim at when the claim is true: every chain that
// colours every arc and ends in a clash, with the order its arcs are forced.
const chainCache = new Map();
export function chains(q) {
  const key = JSON.stringify([q.claim, q.arcs.length, q.crossings.map(x => slots(q, x)), q.ends]);
  if (!chainCache.has(key)) {
    const all = q.claim === 'cant' ? [certificate(q)] : q.crossings.flatMap((_, i) => PERMS.map(perm => ({...certificate(q, i, perm), seed: i})));
    chainCache.set(key, all.filter(c => c.clash && c.colours.every(isColour)));
  }
  return chainCache.get(key);
}
const hasClash = (q, colours) => q.crossings.some(x => crossingState(q, colours, x) === 'clash') || q.ends.some(e => endState(q, colours, e) === 'clash');
const allDifferent = (q, colours, x) => { const c = slots(q, x).map(a => colours[a]); return c.every(isColour) && new Set(c).size === 3; };
// The arcs a chain reaches on this board: from the `known` arcs, an arc joins
// when its colour is what a crossing's other arcs (all joined) force, or what
// a fixed dot gives it, or what a matched dot's joined partner has.
function reach(q, colours, known) {
  const joined = [...known];
  for (let changed = true; changed;) {
    changed = false;
    const join = a => { if (!joined[a]) { joined[a] = true; changed = true; } };
    for (const x of q.crossings) {
      const s = slots(q, x);
      for (const a of new Set(s)) {
        if (joined[a] || colours[a] === null) continue;
        const others = s.filter(v => v !== a), times = mod3(s.length - others.length);
        if (times && others.every(v => joined[v]) && mod3(-others.reduce((t, v) => t + colours[v], 0) * times) === colours[a]) join(a);
      }
    }
    q.ends.forEach(e => {
      if (joined[e.arc] || colours[e.arc] === null) return;
      if (isColour(e.colour) && colours[e.arc] === e.colour) join(e.arc);
      if (Number.isInteger(e.match) && joined[q.ends[e.match].arc] && colours[q.ends[e.match].arc] === colours[e.arc]) join(e.arc);
    });
  }
  return joined;
}
// Whether the board is a certificate for the puzzle's claim, and if not, why:
// 'seed' (no crossing coloured all different), 'loose' (coloured arcs the
// chain does not force, listed) or 'clash' (no clash yet). For One colour only
// the seed is the all-different crossing whose chain reaches the most arcs.
export function claimCheck(q, colours) {
  const loose = joined => colours.map((c, i) => c !== null && !joined[i] ? i : -1).filter(i => i >= 0);
  let best;
  if (q.claim === 'cant') best = {seed: null, loose: loose(reach(q, colours, lockedOf(q).map(c => c !== null)))};
  else {
    const seeds = q.crossings.map((x, i) => allDifferent(q, colours, x) ? i : -1).filter(i => i >= 0);
    if (!seeds.length) return {ok: false, reason: 'seed', seed: null, loose: []};
    best = seeds.map(i => { const known = q.arcs.map(() => false); for (const a of slots(q, q.crossings[i])) known[a] = true; return {seed: i, loose: loose(reach(q, colours, known))}; }).sort((a, b) => a.loose.length - b.loose.length)[0];
  }
  if (best.loose.length) return {ok: false, reason: 'loose', ...best};
  return hasClash(q, colours) ? {ok: true, reason: null, ...best} : {ok: false, reason: 'clash', ...best};
}
const REFUSED = {seed: 'No crossing is all different.', loose: 'Ringed arcs aren’t forced.', clash: 'No clash yet.'};

// --- Boards -------------------------------------------------------------------
// complete: {colours[, claim]}   more: {colours, claim}
// every: {colours, found, told, done}   playground: {knot, colours}
// `claim` is null, 'kept' (the board is a certificate) or 'refused' (it is
// not; shown with what is missing until the next colour changes).
// `found` lists the colourings found as keys ("012"); `told` answers That's
// all ({kind: 'more'}, kept until a new colouring) or a colouring found
// already ({kind: 'again', key}, until the next colour changes).
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {knot: 0, colours: q.knots[0].arcs.map(() => null)};
  const colours = [...lockedOf(q)];
  if (q.mode === 'every') return {colours, found: [], told: null, done: false};
  return q.claim ? {colours, claim: null} : {colours};
}
const validColours = (q, colours) => Array.isArray(colours) && colours.length === q.arcs.length && colours.every(c => c === null || isColour(c)) && lockedOf(q).every((c, i) => c === null || colours[i] === c);
function valid(p, b) {
  const q0 = p.parameters;
  if (!object(b)) return false;
  if (q0.mode === 'playground') return Object.keys(b).sort().join() === 'colours,knot' && Number.isInteger(b.knot) && b.knot >= 0 && b.knot < q0.knots.length && validColours(q0.knots[b.knot], b.colours);
  if (!validColours(q0, b.colours)) return false;
  if (q0.mode === 'every') {
    if (Object.keys(b).sort().join() !== 'colours,done,found,told' || typeof b.done !== 'boolean' || !Array.isArray(b.found)) return false;
    const answers = completions(q0).map(keyOf);
    if (!b.found.every(k => answers.includes(k)) || new Set(b.found).size !== b.found.length) return false;
    // A colouring is kept the moment it is made, so one on the board is found.
    if (isColouring(q0, b.colours) && !b.found.includes(keyOf(b.colours))) return false;
    const t = b.told;
    if (b.done && (b.found.length !== answers.length || t !== null)) return false;
    if (t === null) return true;
    if (!object(t)) return false;
    if (t.kind === 'more') return Object.keys(t).length === 1 && b.found.length < answers.length;
    if (t.kind === 'again') return Object.keys(t).sort().join() === 'key,kind' && b.found.includes(t.key) && keyOf(b.colours) === t.key;
    return false;
  }
  const keys = q0.claim ? 'claim,colours' : 'colours';
  if (Object.keys(b).sort().join() !== keys) return false;
  if (!q0.claim) return true;
  if (![null, 'kept', 'refused'].includes(b.claim)) return false;
  // A kept claim stands on a certificate on the board; a refused one does not.
  return b.claim === null || (b.claim === 'kept') === accepts(q0, b.colours);
}
// The claim is accepted only on a certificate (and a certificate exists only
// when the claim is true; the validator checks every partial board).
const accepts = (q, colours) => claimCheck(q, colours).ok && claimTrue(q);
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'every') return b.done;
  if (b.claim === 'kept') return true;
  if (!isColouring(q, b.colours)) return false;
  return q.mode === 'more' ? manyColours(b.colours) : true;
}

function move(p, b, action) {
  const q0 = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const q = shapeOf(p, b);
  if (action.type === 'paint') {
    const {arc, colour} = action;
    if (!Number.isInteger(arc) || arc < 0 || arc >= q.arcs.length || !isColour(colour) || lockedOf(q)[arc] !== null || b.colours[arc] === colour) return null;
    const colours = [...b.colours]; colours[arc] = colour;
    if (q0.mode === 'playground') return {...b, colours};
    if (q0.mode !== 'every') return q0.claim ? {colours, claim: null} : {colours};
    const told = b.told?.kind === 'more' ? b.told : null;
    if (!isColouring(q, colours)) return {...b, colours, told};
    const key = keyOf(colours);
    return b.found.includes(key) ? {...b, colours, told: {kind: 'again', key}} : {...b, colours, found: [...b.found, key], told: null};
  }
  if (action.type === 'claim' && q0.claim && b.claim === null) return {...b, claim: accepts(q0, b.colours) ? 'kept' : 'refused'};
  if (action.type === 'all' && q0.mode === 'every' && b.told?.kind !== 'more') {
    return b.found.length === completions(q0).length ? {...b, told: null, done: true} : {...b, told: {kind: 'more'}};
  }
  if (q0.mode === 'playground' && action.type === 'knot' && Number.isInteger(action.knot) && action.knot >= 0 && action.knot < q0.knots.length && action.knot !== b.knot) return {knot: action.knot, colours: q0.knots[action.knot].arcs.map(() => null)};
  if (q0.mode === 'playground' && action.type === 'clear' && b.colours.some(c => c !== null)) return {...b, colours: b.colours.map(() => null)};
  return null;
}

// --- Hints --------------------------------------------------------------------
// Aim at the target colouring nearest the board (fewest arcs to change). Change
// first an arc whose colour is forced by arcs already right: one at a crossing
// whose other two arcs match the target, or at a fixed end dot. When the claim
// is true, aim instead at the nearest chain (a crossing all different and its
// forced arcs up to a clash, or the dots' forced arcs), arc by arc in the order
// the chain forces them, and press the button once the clash is on the board.
function forcedFirst(q, colours, aim, wrong) {
  const right = a => colours[a] === aim[a];
  const forced = wrong.find(a => q.crossings.some(x => { const s = slots(q, x); return s.includes(a) && s.filter(v => v !== a).every(right); }) || q.ends.some(e => e.arc === a && isColour(e.colour)));
  return forced ?? wrong.find(a => colours[a] !== null) ?? wrong[0];
}
export function nearest(q, colours, aims) {
  let best = null, bestD = Infinity;
  for (const t of aims) { const d = t.filter((c, i) => c !== colours[i]).length; if (d < bestD) { best = t; bestD = d; } }
  return best;
}
const nearestChain = (all, colours) => all.reduce((best, c) => { const d = c.colours.filter((v, i) => v !== colours[i]).length; return d < best.d ? {c, d} : best; }, {c: null, d: Infinity}).c;
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  if (q.claim && claimTrue(q)) {
    if (claimCheck(q, b.colours).ok) return {type: 'move', action: {type: 'claim'}, text: q.claim === 'one' ? 'Press One colour only.' : 'Press Can’t.'};
    const chain = nearestChain(chains(q), b.colours), arc = chain.order.find(a => b.colours[a] !== chain.colours[a]);
    return {type: 'move', action: {type: 'paint', arc, colour: chain.colours[arc]}, text: `Make ${q.arcs[arc].name} ${COLOURS[chain.colours[arc]]}.`, arc};
  }
  let aims = targets(q);
  if (q.mode === 'every') aims = aims.filter(t => !b.found.includes(keyOf(t)));
  if (!aims.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  const aim = nearest(q, b.colours, aims);
  const wrong = aim.map((c, i) => c !== b.colours[i] ? i : -1).filter(i => i >= 0);
  const arc = forcedFirst(q, b.colours, aim, wrong);
  return {type: 'move', action: {type: 'paint', arc, colour: aim[arc]}, text: `Make ${q.arcs[arc].name} ${COLOURS[aim[arc]]}.`, arc};
}

// --- Drawing ------------------------------------------------------------------
const f = n => Number(n.toFixed(2));
const pathOf = d => `M${d.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}`;
const colourWord = c => c === null ? 'no colour' : COLOURS[c];
const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const heightOf = q => 100 / q.aspect;
// What an arc's end dots ask, for its spoken name.
function dotWords(q, i) {
  const fixed = {}, matched = q.ends.filter(e => e.arc === i && Number.isInteger(e.match)).length;
  for (const e of q.ends) if (e.arc === i && isColour(e.colour)) fixed[COLOURS[e.colour]] = (fixed[COLOURS[e.colour]] || 0) + 1;
  const parts = Object.entries(fixed).map(([c, n]) => n > 1 ? `${n === 2 ? 'two' : n} ${c} dots` : `a ${c} dot`);
  if (matched) parts.push(matched > 1 ? 'two dots matched with the other picture' : 'a dot matched with the other picture');
  return parts.length ? `, ends at ${listWords(parts)}` : '';
}
// The board: rings under the crossings that have colours on all three arcs
// (pine when they work, a dashed brick ring when they clash, ochre round the
// crossing a kept chain starts from), the arcs as ink-edged cords filled with
// their colour (a dashed brick halo round arcs a refused claim's chain does
// not force), and the end dots. A board with frames (a before and an after
// picture) draws each picture in its own frame, with an arrow between.
function pictureSvg(q, colours, {act = true, hinted = null, label = 'Knot', seed = null, loose = []} = {}, frame = [0, 0, 100, heightOf(q)], mine = () => true) {
  const locked = lockedOf(q);
  const rings = q.crossings.map((x, i) => mine(x.pic) ? `<g class="kn-cross ${crossingState(q, colours, x)}${seed === i ? ' seed' : ''}"><circle cx="${f(x.at[0])}" cy="${f(x.at[1])}" r="6.4"/></g>` : '').join('');
  const arcs = q.arcs.map((a, i) => {
    if (!mine(a.pic)) return '';
    const c = colours[i], d = pathOf(a.d), fixed = locked[i] !== null, control = act && !fixed, name = `${a.name}, ${colourWord(c)}${dotWords(q, i)}`;
    const attrs = control ? `data-arc="${i}" role="button" tabindex="0" data-focus="kn-arc-${i}" aria-label="${esc(`${name}. Change colour`)}"` : `role="img" aria-label="${esc(name)}"`;
    return `<g class="kn-arc${fixed ? ' fixed' : ''}${hinted === i ? ' hinted' : ''}${loose.includes(i) ? ' loose' : ''}" ${attrs}>${control ? `<path class="kn-hit" d="${d}"/>` : ''}<path class="kn-halo" d="${d}"/><path class="kn-ink" d="${d}"/><path class="kn-fill ${c === null ? 'blank' : `k${c}`}" d="${d}"/></g>`;
  }).join('');
  const dots = q.ends.map(e => {
    if (!mine(e.pic)) return '';
    const s = endState(q, colours, e), own = isColour(e.colour) ? e.colour : colours[e.arc];
    return `<g class="kn-end ${s}${isColour(e.colour) ? ' fixed' : ''}"><circle class="kn-end-ring" cx="${f(e.at[0])}" cy="${f(e.at[1])}" r="4.6"/><circle class="kn-dot ${own === null ? 'blank' : `k${own}`}" cx="${f(e.at[0])}" cy="${f(e.at[1])}" r="2.7"/></g>`;
  }).join('');
  return `<svg class="kn-board" viewBox="${frame.map(f).join(' ')}" role="group" aria-label="${esc(label)}">${rings}${arcs}${dots}</svg>`;
}
function boardSvg(q, colours, opts = {}) {
  if (!q.frames) return pictureSvg(q, colours, opts);
  const [first, second] = q.frames.map((frame, k) => pictureSvg(q, colours, {...opts, label: k ? 'Second picture' : 'First picture'}, frame, pic => pic === k));
  return `<div class="kn-pair">${first}<svg class="kn-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h17M14 6l6 6-6 6"/></svg>${second}</div>`;
}
// A small picture: the arcs in their colours, and rings where asked
// ({crossing: class}). A pair is drawn with both pictures side by side.
function mini(q, colours, label, rings = {}) {
  const box = q.frames ? [0, 0, q.frames.at(-1)[0] + q.frames.at(-1)[2], q.frames[0][3]] : [0, 0, 100, heightOf(q)];
  const marks = Object.entries(rings).map(([i, cls]) => { const x = q.crossings[i]; return `<g class="kn-cross ${cls}"><circle cx="${f(x.at[0])}" cy="${f(x.at[1])}" r="6.4"/></g>`; }).join('');
  const arcs = q.arcs.map((a, i) => `<path class="kn-mini-arc ${colours[i] === null ? 'blank' : `k${colours[i]}`}" d="${pathOf(a.d)}"/>`).join('');
  return `<svg class="kn-mini" viewBox="${box.map(f).join(' ')}" role="img" aria-label="${esc(label)}">${marks}${arcs}</svg>`;
}
// After a kept One colour only: the chain from each crossing, all different
// there (red on top, blue in, yellow out), with the clash it reaches.
function clashRow(q) {
  const items = q.crossings.map((_, i) => {
    const c = certificate(q, i), rings = {[i]: 'ok seed'};
    if (c.clash?.kind === 'crossing' && c.clash.i !== i) rings[c.clash.i] = 'clash';
    return `<li>${mini(q, c.colours, `From crossing ${i + 1} to a clash`, rings)}</li>`;
  }).join('');
  return `<ul class="kn-shelf kn-clashes" aria-label="A clash from each crossing">${items}</ul>`;
}
const moveButton = (label, action, enabled, hinted) => `<button type="button" class="secondary kn-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="kn-${action.type}" ${enabled ? '' : 'disabled'}>${label}</button>`;
function status(q, colours) {
  const states = q.crossings.map(x => crossingState(q, colours, x)), ends = q.ends.map(e => endState(q, colours, e));
  const n = s => states.filter(v => v === s).length + ends.filter(v => v === s).length;
  const blank = colours.filter(c => c === null).length;
  const parts = [];
  if (n('ok')) parts.push(`${n('ok')} ${n('ok') === 1 ? 'place works' : 'places work'}`);
  if (n('clash')) parts.push(`${n('clash')} ${n('clash') === 1 ? 'clashes' : 'clash'}`);
  if (blank) parts.push(`${blank} ${blank === 1 ? 'arc has' : 'arcs have'} no colour`);
  return parts.length ? `${parts.join('; ')}.` : '';
}

function render(p, a) {
  const q0 = p.parameters, b = a.board, q = shapeOf(p, b), done = solved(p, b);
  const hinted = a.hintLevel >= 2 && !done && q0.mode !== 'playground' ? hint(p, b) : null;
  let top = '', below = '', told = '', shelf = '';
  // A kept claim keeps the child's chain on the board, its first crossing
  // ringed; a refused one rings the arcs the chain does not force.
  const check = q0.claim && b.claim ? claimCheck(q0, b.colours) : null;
  const board = boardSvg(q, b.colours, {act: !done, hinted: hinted?.arc ?? null, label: q0.mode === 'playground' ? `${q.name}` : 'Knot', seed: b.claim === 'kept' ? check.seed : null, loose: b.claim === 'refused' ? check.loose : []});
  if (done && b.claim === 'kept' && q0.claim === 'one') shelf = clashRow(q);
  if (q0.mode === 'playground') {
    const picks = q0.knots.map((k, i) => `<button type="button" class="secondary kn-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'knot', knot: i}))}" data-focus="kn-knot-${i}" aria-pressed="${b.knot === i}" aria-label="${esc(k.name)}">${mini(k, k.arcs.map(() => null), k.name)}</button>`).join('');
    top = `<div class="kn-picks" role="group" aria-label="Knots">${picks}</div>`;
    below = `<div class="kn-bar">${moveButton('Clear', {type: 'clear'}, b.colours.some(c => c !== null), false)}</div>`;
  } else if (!done) {
    const buttons = [];
    if (q0.claim === 'one') buttons.push(moveButton('One colour only', {type: 'claim'}, b.claim === null, hinted?.action?.type === 'claim'));
    if (q0.claim === 'cant') buttons.push(moveButton('Can’t', {type: 'claim'}, b.claim === null, hinted?.action?.type === 'claim'));
    if (q0.mode === 'every') buttons.push(moveButton('That’s all', {type: 'all'}, b.told?.kind !== 'more', hinted?.action?.type === 'all'));
    if (buttons.length) below = `<div class="kn-bar">${buttons.join('')}</div>`;
    if (b.claim === 'refused') told = REFUSED[check.reason] || REFUSED.clash;
    if (b.told?.kind === 'more') told = 'There is another.';
    if (b.told?.kind === 'again') told = 'Found already.';
  }
  if (q0.mode === 'every' && b.found.length) {
    shelf = `<ul class="kn-shelf${q.frames ? ' wide' : ''}" aria-label="Colourings found">${b.found.map(k => `<li class="${b.told?.kind === 'again' && b.told.key === k ? 'again' : ''}">${mini(q, fromKey(k), listWords(fromKey(k).map(c => COLOURS[c])))}</li>`).join('')}</ul>`;
  }
  const note = told ? `<p class="kn-told">${esc(told)}</p>` : '';
  const say = `${status(q, b.colours)}${told ? ` ${told}` : ''}`;
  return `<div class="kn-puzzle${done ? ' solved' : ''}" data-mechanic-wire="knots">${top}<div class="kn-frame">${board}</div>${note}${below}${shelf}<p class="sr-only" role="status">${esc(say)}</p></div>`;
}

// The arc a tap is nearest to, among the arcs that take taps in the tapped
// picture. Tap bands are wide (16 units, so 40 px or more on a phone) and may
// overlap where cords run close; the nearest cord takes the tap, and at a
// crossing that is the cord on top, since the one beneath has a gap there.
export function nearestArc(q, arcs, [x, y]) {
  let best = null;
  for (const i of arcs) {
    const d = q.arcs[i].d;
    for (let k = 0; k + 1 < d.length; k++) {
      const [ax, ay] = d[k], [bx, by] = d[k + 1], vx = bx - ax, vy = by - ay, len = vx * vx + vy * vy;
      const t = len ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / len)) : 0, dist = Math.hypot(x - ax - t * vx, y - ay - t * vy);
      if (!best || dist < best.dist) best = {i, dist};
    }
  }
  return best?.i ?? null;
}
function wire(root, p, api) {
  const paint = i => ({type: 'paint', arc: i, colour: nextColour(api.attempt().board.colours[i])});
  const act = target => {
    const arc = target.closest('[data-arc]');
    return arc && root.contains(arc) ? paint(Number(arc.dataset.arc)) : null;
  };
  const tapped = e => {
    const arc = e.target.closest?.('[data-arc]'), svg = arc?.closest('svg'), ctm = svg?.getScreenCTM?.();
    if (!arc || !root.contains(arc) || !ctm || !e.detail) return act(e.target);
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const i = nearestArc(shapeOf(p, api.attempt().board), [...svg.querySelectorAll('[data-arc]')].map(el => Number(el.dataset.arc)), [pt.x, pt.y]);
    return i === null ? act(e.target) : paint(i);
  };
  root.addEventListener('click', e => { const action = tapped(e); if (action) api.apply(action); });
  root.addEventListener('keydown', e => {
    if (!['Enter', ' '].includes(e.key) || !e.target.closest?.('[data-arc]')) return;
    e.preventDefault();
    const action = act(e.target);
    if (action) api.apply(action);
  });
}

export const knotsMechanics = {
  knots: {
    fresh, valid, solved, move, hint, render, wire,
    // Undo keeps the colourings already found.
    carry(p, from, to) {
      if (p.parameters.mode !== 'every' || !object(from) || !object(to) || !Array.isArray(from.found)) return to;
      return {...to, found: [...from.found], told: null, done: false};
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'knots',
  family: {id: 'knots', symbol: '⌘', area: 'surfaces', region: 'shape'},
  mechanics: knotsMechanics,
  pack: new URL('./knots.json', import.meta.url).href,
  css: new URL('./knots.css', import.meta.url).href,
  focus: '.kn-arc[role=button],.kn-button:not([disabled]),.kn-pick'
};
