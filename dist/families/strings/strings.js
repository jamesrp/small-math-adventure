// Circle strings (worksheet Week 12, Catalan bijections). Dots sit around a
// circle, numbered 1 to n clockwise from the top. A string joins two dots
// across the inside of the circle; each dot takes at most one string, and two
// strings may not cross: strings a–b and c–d (a < b, c < d) cross exactly
// when a < c < b < d or c < a < d < b. A pairing uses every dot once.
//
// - Regions. Noncrossing strings cut the disc into regions, each touching the
//   circle. A string can only join two free dots of one region, and the free
//   dots of a region lie in order round its edge, so a set of strings can be
//   finished exactly when every region has an even number of free dots. A
//   region with an odd number is the certificate for Can't; an odd number of
//   dots in all is the case with no strings.
// - Neighbours. Every pairing joins two neighbours round the circle: in a
//   pairing, a string with no string on one side (an innermost string) has no
//   dots on that side. The certificate for "can't avoid neighbours" is an
//   innermost string of the child's own attempt whose free side is stuck: an
//   odd number of dots, or exactly two, which are neighbours.
// - Paths and trees. Reading dots 1 to n, write U at the first end of each
//   string and D at the other: a path of up and down steps that never dips
//   below its start. The noncrossing rule forces the way back (each D closes
//   the most recent open U), so each path comes from exactly one pairing. The
//   strings nest into an ordered tree (a string's children are the strings
//   just inside it), whose walk (U away from the root, D back) is the same
//   path. All three are counted by 1, 2, 5, 14, 42, 132.
// - Swaps. Swapping a neighbouring D U to U D raises one corner of a path by
//   two; U D to D U lowers it. Each swap changes the number of D-before-U
//   pairs by exactly one, and the mountain U…U D…D has none, so the fewest
//   swaps to the mountain is that count. To any other path it is half the
//   summed height gap, and each swap fills or empties one diamond between.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = value => Number.isInteger(value);
export const MODES = ['finish', 'every', 'neighbours', 'decode', 'tree', 'treepair', 'swaps', 'playground'];
export const MIN_DOTS = 2, MAX_DOTS = 12, MAX_ROUTE = 40;

// --- Pairings -------------------------------------------------------------------
export const norm = ([a, b]) => a < b ? [a, b] : [b, a];
export const crosses = ([a, b], [c, d]) => (a < c && c < b && b < d) || (c < a && a < d && d < b);
export const neighbours = (n, [a, b]) => b - a === 1 || (a === 1 && b === n && n > 2);
export const sortStrings = strings => strings.map(norm).sort((x, y) => x[0] - y[0]);
export const keyOf = strings => sortStrings(strings).map(([a, b]) => `${a}-${b}`).join(' ');
export const fromKey = key => key ? key.split(' ').map(s => s.split('-').map(Number)) : [];
export function partnersOf(n, strings) {
  const p = Array(n + 1).fill(0);
  for (const [a, b] of strings) { p[a] = b; p[b] = a; }
  return p;
}
export const usedDots = strings => new Set(strings.flat());
export const freeDots = (n, strings) => { const used = usedDots(strings); return Array.from({length: n}, (_, i) => i + 1).filter(d => !used.has(d)); };
export const complete = (n, strings) => 2 * strings.length === n;
// A list of strings that use dots 1..n at most once each and never cross.
export function goodStrings(n, strings) {
  if (!Array.isArray(strings)) return false;
  const seen = new Set();
  for (const s of strings) {
    if (!Array.isArray(s) || s.length !== 2 || !s.every(d => int(d) && d >= 1 && d <= n) || s[0] >= s[1]) return false;
    for (const d of s) { if (seen.has(d)) return false; seen.add(d); }
  }
  return strings.every((s, i) => strings.every((t, j) => j <= i || !crosses(s, t)));
}

// Every noncrossing pairing of a list of points in order round a circle (or
// along one side of a region): the first point joins the 2nd, 4th, 6th…,
// leaving an even number inside and outside.
function pairList(points) {
  if (!points.length) return [[]];
  const out = [], [first] = points;
  for (let j = 1; j < points.length; j += 2) {
    const inside = pairList(points.slice(1, j)), outside = pairList(points.slice(j + 1));
    for (const x of inside) for (const y of outside) out.push([[first, points[j]], ...x, ...y]);
  }
  return out;
}

// --- Regions --------------------------------------------------------------------
// Gap g is the arc from dot g to dot g + 1 (gap n runs from n back to 1); every
// region touches at least one gap. Walk clockwise from a gap: at a free dot
// carry on round the circle; at a strung dot cross along its string and carry
// on from the other end. `walk` lists the arcs and strings of the region's
// edge, for drawing.
const regionCache = new Map();
export function regions(n, strings) {
  const key = `${n}|${keyOf(strings)}`;
  if (regionCache.has(key)) return regionCache.get(key);
  const partner = partnersOf(n, strings), owner = Array(n + 1).fill(-1), out = [];
  for (let g = 1; g <= n; g++) {
    if (owner[g] >= 0) continue;
    const r = {id: out.length, gaps: [], free: [], walk: []};
    let gap = g, guard = 0;
    do {
      owner[gap] = r.id; r.gaps.push(gap);
      const d = gap % n + 1;
      r.walk.push(['arc', gap, d]);
      if (partner[d]) { r.walk.push(['string', d, partner[d]]); gap = partner[d]; } else { r.free.push(d); gap = d; }
    } while (gap !== g && ++guard <= 2 * n);
    out.push(r);
  }
  const result = {list: out, owner};
  regionCache.set(key, result);
  return result;
}
export const regionOf = (n, strings, gap) => { const {list, owner} = regions(n, strings); return list[owner[gap]]; };
// The region a free dot lies in (by the gap just after it).
export const regionOfDot = (n, strings, d) => regionOf(n, strings, d);
// Strings that can finish these, as lists of the strings to add.
const completionCache = new Map();
export function completions(n, fixed) {
  const key = `${n}|${keyOf(fixed)}`;
  if (completionCache.has(key)) return completionCache.get(key);
  let out = [[]];
  for (const r of regions(n, fixed).list) {
    if (r.free.length % 2) { out = []; break; }
    // The free dots of a region, in order round the circle from its first gap.
    const ways = pairList(r.free);
    out = out.flatMap(x => ways.map(y => [...x, ...y]));
  }
  out = out.map(sortStrings).sort((x, y) => keyOf([...fixed, ...x]) < keyOf([...fixed, ...y]) ? -1 : 1);
  completionCache.set(key, out);
  return out;
}
export const pairings = n => completions(n, []);
// The certificate for Can't: a region of the board with an odd number of free
// dots, inside a region of the fixed strings with an odd number too (so the
// child's own strings did not trap it). The gap names the region tapped.
export function trapCheck(n, fixed, mine, gap) {
  if (!int(gap) || gap < 1 || gap > n) return {ok: false, why: 'gap'};
  const here = regionOf(n, [...fixed, ...mine], gap), whole = regionOf(n, fixed, gap);
  if (here.free.length % 2 === 0) return {ok: false, why: 'even', here, whole};
  if (whole.free.length % 2 === 0) return {ok: false, why: 'own', here, whole};
  return {ok: true, here, whole};
}

// --- Neighbours -----------------------------------------------------------------
// The two sides of a string: the dots strictly between its ends one way round,
// then the other.
export function sidesOf(n, [a, b]) {
  const inside = [], outside = [];
  for (let d = a + 1; d < b; d++) inside.push(d);
  for (let d = b + 1; d <= n; d++) outside.push(d);
  for (let d = 1; d < a; d++) outside.push(d);
  return [inside, outside];
}
// A side is stuck when no string lies on it and its dots (all free) are odd in
// number, or exactly two, which are then neighbours.
export function stuckSides(n, strings, s) {
  return sidesOf(n, s).filter(side => {
    const set = new Set(side);
    if (strings.some(t => set.has(t[0]) || set.has(t[1]))) return false;
    return side.length % 2 === 1 || side.length === 2;
  });
}

// --- Paths ------------------------------------------------------------------------
export const heights = word => { const h = [0]; for (const c of word) h.push(h.at(-1) + (c === 'U' ? 1 : -1)); return h; };
export const isPath = word => typeof word === 'string' && /^[UD]*$/.test(word) && word.length % 2 === 0 && Math.min(...heights(word)) >= 0 && heights(word).at(-1) === 0;
// U at the first end of each string, D at the other, a dot for a free dot.
export function codeOf(n, strings) {
  const p = partnersOf(n, strings);
  return Array.from({length: n}, (_, i) => !p[i + 1] ? '.' : p[i + 1] > i + 1 ? 'U' : 'D').join('');
}
// The strings of a path: each D closes the most recent open U.
export function pairingOfWord(word) {
  const open = [], out = [];
  [...word].forEach((c, i) => { if (c === 'U') open.push(i + 1); else out.push([open.pop(), i + 1]); });
  return sortStrings(out);
}
// The path of the strung dots only, in order (each string gives a U and a D).
export const stringPath = (n, strings) => codeOf(n, strings).replace(/\./g, '');

// --- Trees ------------------------------------------------------------------------
// A tree is nested lists of children, in order. A board's tree is a list of
// parents: node k (1-based) hangs from parents[k - 1], an earlier node or the
// root 0; a parent's children are in the order they were added.
export const MAX_EDGES = 8;
export function treeOfParents(parents) {
  const kids = Array.from({length: parents.length + 1}, () => []);
  parents.forEach((p, i) => kids[p].push(i + 1));
  const build = v => kids[v].map(build);
  return build(0);
}
export const walkOf = tree => tree.map(c => `U${walkOf(c)}D`).join('');
export function treeOfWord(word) {
  const root = [], stack = [root];
  for (const c of word) { if (c === 'U') { const kid = []; stack.at(-1).push(kid); stack.push(kid); } else stack.pop(); }
  return root;
}
// The nesting of strings read along 1..n: a string's children are the strings
// just inside it, in order; the root's are the outermost.
export function treeOfStrings(strings) {
  const sorted = sortStrings(strings), root = [], stack = [{end: Infinity, kids: root}];
  for (const [a, b] of sorted) {
    while (stack.at(-1).end < a) stack.pop();
    const node = {end: b, kids: []};
    stack.at(-1).kids.push(node.kids);
    stack.push(node);
  }
  return root;
}
export const edgesOf = tree => tree.reduce((s, c) => s + 1 + edgesOf(c), 0);
// Positions: each node as the list of child numbers from the root, in walk order.
export function positions(tree, at = []) { return tree.flatMap((c, i) => [[...at, i], ...positions(c, [...at, i])]); }
// The parents list's node number for each position, in the same order.
function nodesByPosition(parents) {
  const kids = Array.from({length: parents.length + 1}, () => []);
  parents.forEach((p, i) => kids[p].push(i + 1));
  const out = new Map(), go = (v, at) => kids[v].forEach((k, i) => { const pos = [...at, i]; out.set(pos.join(','), k); go(k, pos); });
  out.set('', 0);
  go(0, []);
  return out;
}
export function pruned(parents, node) {
  const gone = new Set([node]);
  parents.forEach((p, i) => { if (gone.has(p)) gone.add(i + 1); });
  const keep = parents.map((p, i) => i + 1).filter(k => !gone.has(k)), renum = new Map([[0, 0], ...keep.map((k, i) => [k, i + 1])]);
  return keep.map(k => renum.get(parents[k - 1]));
}
const validParents = (parents, cap) => Array.isArray(parents) && parents.length <= cap && parents.every((p, i) => int(p) && p >= 0 && p <= i);

// --- Swaps --------------------------------------------------------------------------
export const swapAt = (word, i) => word.slice(0, i - 1) + word[i] + word[i - 1] + word.slice(i + 1);
// Fewest swaps between two paths of one length: half the summed height gap.
export function swapDistance(a, b) {
  const ha = heights(a), hb = heights(b);
  return ha.reduce((s, h, i) => s + Math.abs(h - hb[i]), 0) / 2;
}
export const dBeforeU = word => { let ds = 0, n = 0; for (const c of word) { if (c === 'D') ds++; else n += ds; } return n; };
export const mountainOf = len => 'U'.repeat(len / 2) + 'D'.repeat(len / 2);
// The word after a route, or null if a swap is illegal on the way.
export function replay(start, route) {
  let w = start;
  for (const [k, i] of route.entries()) {
    if (!int(i) || i < 1 || i >= w.length || w[i - 1] === w[i] || (k > 0 && route[k - 1] === i)) return null;
    w = swapAt(w, i);
    if (!isPath(w)) return null;
  }
  return w;
}
// The corners of a path that can be swapped: a valley (D U) always, a peak
// (U D) only above height 1.
export function corners(word) {
  const h = heights(word), out = [];
  for (let i = 1; i < word.length; i++) {
    if (word[i - 1] === word[i]) continue;
    if (word[i - 1] === 'D') out.push({at: i, kind: 'valley', h: h[i]});
    else if (h[i] >= 2) out.push({at: i, kind: 'peak', h: h[i]});
  }
  return out;
}

// --- Words ------------------------------------------------------------------------
const NUMBER = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
export const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const capital = s => s[0].toUpperCase() + s.slice(1);
const stringWords = ([a, b]) => `the string from ${a} to ${b}`;
const dotsWords = dots => dots.length === 1 ? `Dot ${dots[0]}` : `Dots ${listWords(dots.map(String))}`;
export function nodeWords(pos) {
  if (!pos.length) return 'the root';
  let s = `the root’s ${ORDINAL[pos[0]] || `${pos[0] + 1}th`} child`;
  for (const k of pos.slice(1)) s = `the ${ORDINAL[k] || `${k + 1}th`} child of ${s}`;
  return s;
}

// --- Boards -------------------------------------------------------------------------
// finish:     {strings, claimed, refused}   claimed / refused: a gap or null
// every:      {strings, found, told, done}  told: null, {kind: 'more'} or {kind: 'again', key}
// neighbours: {strings, claimed, refused}   claimed / refused: a string or null
// decode, treepair: {strings}
// tree:       {parents}
// swaps:      {route}                      the corners swapped, in order
// playground: {n, strings}
const fixedOf = q => q.fixed || [];
const dotsOf = (q, b) => q.mode === 'playground' ? b.n : q.n;
const allStrings = (q, b) => [...fixedOf(q), ...b.strings];
export const targetOf = q => q.word ? pairingOfWord(q.word) : null;
export const totalOf = q => completions(q.n, fixedOf(q)).length;

function fresh(p) {
  const q = p.parameters;
  switch (q.mode) {
    case 'finish': case 'neighbours': return {strings: [], claimed: null, refused: null};
    case 'every': return {strings: [], found: [], told: null, done: false};
    case 'tree': return {parents: []};
    case 'swaps': return {route: []};
    case 'playground': return {n: q.start || 6, strings: []};
    default: return {strings: []};
  }
}
const keys = b => Object.keys(b).sort().join();
function validStrings(q, b, n = dotsOf(q, b)) {
  if (!goodStrings(n, b.strings)) return false;
  const fixed = fixedOf(q), ends = usedDots(fixed);
  if (b.strings.some(s => ends.has(s[0]) || ends.has(s[1]) || fixed.some(t => crosses(s, t)))) return false;
  if (q.mode === 'neighbours' && b.strings.some(s => neighbours(n, s))) return false;
  return true;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  switch (q.mode) {
    case 'finish': {
      if (keys(b) !== 'claimed,refused,strings' || !validStrings(q, b)) return false;
      if (b.claimed !== null && (b.refused !== null || !b.strings.length || !trapCheck(q.n, fixedOf(q), b.strings, b.claimed).ok)) return false;
      if (b.refused !== null && (!b.strings.length || !int(b.refused) || b.refused < 1 || b.refused > q.n || trapCheck(q.n, fixedOf(q), b.strings, b.refused).ok)) return false;
      return true;
    }
    case 'neighbours': {
      if (keys(b) !== 'claimed,refused,strings' || !validStrings(q, b)) return false;
      const known = s => Array.isArray(s) && b.strings.some(t => t[0] === s[0] && t[1] === s[1]);
      if (b.claimed !== null && (b.refused !== null || !known(b.claimed) || !stuckSides(q.n, b.strings, b.claimed).length)) return false;
      if (b.refused !== null && (!known(b.refused) || stuckSides(q.n, b.strings, b.refused).length)) return false;
      return true;
    }
    case 'every': {
      if (keys(b) !== 'done,found,strings,told' || !validStrings(q, b) || typeof b.done !== 'boolean') return false;
      const answers = new Set(completions(q.n, fixedOf(q)).map(c => keyOf([...fixedOf(q), ...c])));
      if (!Array.isArray(b.found) || !b.found.every(k => answers.has(k)) || new Set(b.found).size !== b.found.length) return false;
      const all = allStrings(q, b);
      // A pairing is kept the moment it is made.
      if (complete(q.n, all) && !b.found.includes(keyOf(all))) return false;
      const t = b.told;
      if (t !== null) {
        if (!object(t)) return false;
        if (t.kind === 'more') { if (keys(t) !== 'kind' || b.found.length >= answers.size || b.done) return false; }
        else if (t.kind === 'again') { if (keys(t) !== 'key,kind' || !b.found.includes(t.key) || keyOf(all) !== t.key) return false; }
        else return false;
      }
      return !b.done || b.found.length === answers.size;
    }
    case 'decode': case 'treepair': return keys(b) === 'strings' && validStrings(q, b);
    case 'tree': return keys(b) === 'parents' && validParents(b.parents, Math.min(MAX_EDGES, q.word.length / 2 + 2));
    case 'swaps': return keys(b) === 'route' && Array.isArray(b.route) && b.route.length <= MAX_ROUTE && replay(q.start, b.route) !== null;
    case 'playground': return keys(b) === 'n,strings' && int(b.n) && b.n >= MIN_DOTS && b.n <= MAX_DOTS && goodStrings(b.n, b.strings);
    default: return false;
  }
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  switch (q.mode) {
    case 'finish': return b.claimed !== null || complete(q.n, allStrings(q, b));
    case 'neighbours': return b.claimed !== null;
    case 'every': return b.done;
    case 'decode': case 'treepair': return keyOf(b.strings) === keyOf(targetOf(q));
    case 'tree': return walkOf(treeOfParents(b.parents)) === q.word;
    case 'swaps': return replay(q.start, b.route) === q.target && b.route.length === swapDistance(q.start, q.target);
    default: return false;
  }
}

// Why a string can't be laid now: 'used', 'cross' (with the strings it crosses),
// 'neighbours', or null when it can.
export function layProblem(q, b, s) {
  const n = dotsOf(q, b), [a, c] = norm(s);
  if (!int(a) || !int(c) || a < 1 || c > n || a === c) return {why: 'used'};
  const all = q.mode === 'playground' ? b.strings : allStrings(q, b), used = usedDots(all);
  if (used.has(a) || used.has(c)) return {why: 'used'};
  const blockers = all.filter(t => crosses([a, c], t));
  if (blockers.length) return {why: 'cross', blockers};
  if (q.mode === 'neighbours' && neighbours(n, [a, c])) return {why: 'neighbours'};
  return null;
}
const stringsMove = (q, b, action) => {
  if (action.type === 'lay') {
    if (!Array.isArray(action.s) || action.s.length !== 2 || layProblem(q, b, action.s)) return null;
    return [...b.strings, norm(action.s)];
  }
  if (action.type === 'cut') {
    const d = action.dot, i = b.strings.findIndex(s => s.includes(d));
    return int(d) && i >= 0 ? b.strings.filter((_, k) => k !== i) : null;
  }
  return null;
};
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  let next = null;
  switch (q.mode) {
    case 'finish': case 'neighbours': {
      if (action.type === 'lay' || action.type === 'cut') { const strings = stringsMove(q, b, action); next = strings && {strings, claimed: null, refused: null}; break; }
      // Can't comes after an attempt, once per change of the strings.
      if (action.type !== 'cant' || !b.strings.length || b.refused !== null) break;
      if (q.mode === 'finish') next = trapCheck(q.n, fixedOf(q), b.strings, action.gap).ok ? {...b, claimed: action.gap} : int(action.gap) && action.gap >= 1 && action.gap <= q.n ? {...b, refused: action.gap} : null;
      else {
        const s = Array.isArray(action.s) && b.strings.find(t => t[0] === action.s[0] && t[1] === action.s[1]);
        if (s) next = stuckSides(q.n, b.strings, s).length ? {...b, claimed: [...s]} : {...b, refused: [...s]};
      }
      break;
    }
    case 'every': {
      if (action.type === 'all') {
        if (b.told?.kind === 'more') break;
        next = b.found.length === totalOf(q) ? {...b, told: null, done: true} : {...b, told: {kind: 'more'}};
        break;
      }
      const strings = stringsMove(q, b, action);
      if (!strings) break;
      const all = [...fixedOf(q), ...strings], more = b.told?.kind === 'more' ? b.told : null;
      if (!complete(q.n, all)) { next = {...b, strings, told: more}; break; }
      const key = keyOf(all);
      next = b.found.includes(key) ? {...b, strings, told: {kind: 'again', key}} : {...b, strings, found: [...b.found, key], told: null};
      break;
    }
    case 'decode': case 'treepair': { const strings = stringsMove(q, b, action); next = strings && {strings}; break; }
    case 'tree': {
      const cap = Math.min(MAX_EDGES, q.word.length / 2 + 2);
      if (action.type === 'grow' && int(action.at) && action.at >= 0 && action.at <= b.parents.length && b.parents.length < cap) next = {parents: [...b.parents, action.at]};
      else if (action.type === 'prune' && int(action.node) && action.node >= 1 && action.node <= b.parents.length) next = {parents: pruned(b.parents, action.node)};
      break;
    }
    case 'swaps': {
      if (action.type !== 'swap' || !int(action.at)) break;
      // Swapping the corner just swapped takes that swap back.
      const route = b.route.at(-1) === action.at ? b.route.slice(0, -1) : [...b.route, action.at];
      if (route.length <= MAX_ROUTE && replay(q.start, route) !== null) next = {route};
      break;
    }
    case 'playground': {
      if (action.type === 'size' && int(action.n) && action.n >= MIN_DOTS && action.n <= MAX_DOTS && action.n !== b.n) next = {n: action.n, strings: b.strings.filter(s => s[1] <= action.n)};
      else if (action.type === 'clear' && b.strings.length) next = {...b, strings: []};
      else { const strings = stringsMove(q, b, action); next = strings && {...b, strings}; }
      break;
    }
  }
  if (next) Object.assign(ui(p), {pick: null, tried: null, cant: false});
  return next && valid(p, next) ? next : null;
}

// --- Hints ----------------------------------------------------------------------------
const sameString = (s, t) => s[0] === t[0] && s[1] === t[1];
// Steps from the child's strings to a target set of strings: take off strings
// not in it, then lay the missing ones, innermost first.
function towards(target, mine) {
  const extra = mine.find(s => !target.some(t => sameString(s, t)));
  if (extra) return {type: 'move', action: {type: 'cut', dot: extra[0]}, text: `Take off ${stringWords(extra)}.`, dots: extra};
  const missing = target.filter(t => !mine.some(s => sameString(s, t))).sort((x, y) => (x[1] - x[0]) - (y[1] - y[0]) || x[0] - y[0])[0];
  if (missing) return {type: 'move', action: {type: 'lay', s: missing}, text: `Join ${missing[0]} and ${missing[1]}.`, dots: missing};
  return null;
}
const shared = (target, mine) => mine.filter(s => target.some(t => sameString(s, t))).length - mine.filter(s => !target.some(t => sameString(s, t))).length;
const nearest = (targets, mine) => targets.reduce((best, t) => shared(t, mine) > shared(best, mine) ? t : best, targets[0]);
// A string that can be laid now: the first two free dots of the region with
// the most free dots (consecutive round its edge, so it crosses nothing).
function anyLay(q, b, n, all) {
  const list = regions(n, all).list.filter(r => r.free.length >= 2).sort((x, y) => y.free.length - x.free.length);
  for (const r of list) for (let i = 0; i + 1 < r.free.length; i++) {
    const s = norm([r.free[i], r.free[i + 1]]);
    if (!layProblem(q, b, s)) return s;
  }
  return null;
}
function finishHint(q, b) {
  const fixed = fixedOf(q), ways = completions(q.n, fixed);
  if (ways.length) return towards(nearest(ways, b.strings), b.strings);
  // Impossible: make an attempt first, then point at a trapped region.
  const odd = regions(q.n, fixed).list.filter(r => r.free.length % 2).sort((x, y) => x.free.length - y.free.length);
  if (!b.strings.length || b.refused !== null) {
    const inOdd = odd.find(r => r.free.length >= 3);
    const s = [inOdd && norm([inOdd.free[0], inOdd.free[1]]), anyLay(q, b, q.n, allStrings(q, b))].find(t => t && !layProblem(q, b, t));
    if (s) return {type: 'move', action: {type: 'lay', s}, text: `Join ${s[0]} and ${s[1]}.`, dots: s};
    const last = b.strings.at(-1);
    return {type: 'move', action: {type: 'cut', dot: last[0]}, text: `Take off ${stringWords(last)}.`, dots: last};
  }
  // The board's odd regions inside odd fixed regions; the smallest one.
  const here = regions(q.n, allStrings(q, b)).list.filter(r => r.free.length % 2 && regionOf(q.n, fixed, r.gaps[0]).free.length % 2).sort((x, y) => x.free.length - y.free.length)[0];
  const whole = regionOf(q.n, fixed, here.gaps[0]), lone = here.free.at(-1);
  const reason = !fixed.length ? `There are ${NUMBER[q.n]} dots, and each string takes two.`
    : whole.free.length === 1 ? `Dot ${whole.free[0]} can’t join any other dot.`
    : `${dotsWords(whole.free)} can only join each other, and each string takes two.`;
  // The reason only: the second level marks Can't, then the part to tap.
  return {type: 'move', action: {type: 'cant', gap: here.gaps[0]}, text: reason, gap: here.gaps[0], dot: lone};
}
function everyHint(q, b) {
  const fixed = fixedOf(q), found = new Set(b.found);
  const left = completions(q.n, fixed).filter(c => !found.has(keyOf([...fixed, ...c])));
  if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Every pairing is on the shelf.'};
  return towards(nearest(left, b.strings), b.strings);
}
function neighboursHint(q, b) {
  const n = q.n;
  if (b.refused === null) {
    const cert = b.strings.find(s => stuckSides(n, b.strings, s).length);
    if (cert) {
      const side = stuckSides(n, b.strings, cert)[0];
      const reason = side.length === 1 ? `Dot ${side[0]} is alone on one side of ${stringWords(cert)}.`
        : side.length === 2 ? `Dots ${side[0]} and ${side[1]} are alone on one side of ${stringWords(cert)}, and they are neighbours.`
        : `${dotsWords(side)} are alone on one side of ${stringWords(cert)}, and each string takes two.`;
      return {type: 'move', action: {type: 'cant', s: cert}, text: reason, string: cert};
    }
  }
  // Lay a string that skips one dot, on a side with no strings.
  const sides = b.strings.length ? b.strings.flatMap(s => sidesOf(n, s)).filter(side => side.length >= 3 && !b.strings.some(t => side.includes(t[0]))) : [Array.from({length: n}, (_, i) => i + 1)];
  for (const side of sides) for (let i = 0; i + 2 < side.length; i++) {
    const s = norm([side[i], side[i + 2]]);
    if (!layProblem(q, b, s)) return {type: 'move', action: {type: 'lay', s}, text: `Join ${s[0]} and ${s[1]}.`, dots: s};
  }
  const last = b.strings.at(-1);
  return {type: 'move', action: {type: 'cut', dot: last[0]}, text: `Take off ${stringWords(last)}.`, dots: last};
}
// Tree hints name a dot by the up step of the child's own walk that reaches
// it (the walk is drawn over the path, steps numbered underneath).
function treeHint(q, b) {
  const want = positions(treeOfWord(q.word)).map(x => x.join(',')), wanted = new Set(want);
  const have = nodesByPosition(b.parents), mine = positions(treeOfParents(b.parents)), walk = walkOf(treeOfParents(b.parents));
  const ups = [...walk].map((c, i) => c === 'U' ? i + 1 : 0).filter(Boolean), stepOf = pos => ups[mine.findIndex(x => x.join(',') === pos.join(','))];
  const extra = mine.find(x => !wanted.has(x.join(',')));
  if (extra) return {type: 'move', action: {type: 'prune', node: have.get(extra.join(','))}, text: `Take away the edge walked up at step ${stepOf(extra)}.`, node: have.get(extra.join(',')), prune: true};
  const missing = want.find(x => !have.has(x)).split(',').map(Number), parent = missing.slice(0, -1), at = have.get(parent.join(','));
  const one = b.parents.includes(at) ? 'another' : 'a';
  return {type: 'move', action: {type: 'grow', at}, text: parent.length ? `Give the dot at the top of step ${stepOf(parent)} ${one} child.` : `Give the root ${one} child.`, node: at};
}
function swapsHint(q, b) {
  const w = replay(q.start, b.route), best = swapDistance(q.start, q.target);
  if (b.route.length + swapDistance(w, q.target) > best) {
    const i = b.route.at(-1);
    return {type: 'move', action: {type: 'swap', at: i}, text: `Swap steps ${i} and ${i + 1} back.`, at: i};
  }
  const ht = heights(q.target), c = corners(w).find(c => (c.kind === 'valley' && c.h < ht[c.at]) || (c.kind === 'peak' && c.h > ht[c.at]));
  return {type: 'move', action: {type: 'swap', at: c.at}, text: `Swap steps ${c.at} and ${c.at + 1}.`, at: c.at};
}
const hintCache = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const key = `${p.id}|${JSON.stringify(b)}`;
  if (hintCache.has(key)) return hintCache.get(key);
  let h;
  switch (q.mode) {
    case 'finish': h = finishHint(q, b); break;
    case 'every': h = everyHint(q, b); break;
    case 'neighbours': h = neighboursHint(q, b); break;
    case 'decode': case 'treepair': h = towards(targetOf(q), b.strings); break;
    case 'tree': h = treeHint(q, b); break;
    case 'swaps': h = swapsHint(q, b); break;
  }
  if (hintCache.size > 500) hintCache.clear();
  hintCache.set(key, h || {type: 'done'});
  return hintCache.get(key);
}

// --- View state -------------------------------------------------------------------------
// The dot picked for a string, Can't pressed, and a refused try (a string
// that would cross or join neighbours) are view state, outside the save.
const uiState = new Map();
export function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {pick: null, tried: null, cant: false}); return uiState.get(p.id); }

// --- Drawing --------------------------------------------------------------------------
const f = n => Number(n.toFixed(2));
const C = 50, R = 38;
export const dotAt = (n, d) => { const t = -Math.PI / 2 + 2 * Math.PI * (d - 1) / n; return [C + R * Math.cos(t), C + R * Math.sin(t)]; };
const labelAt = (n, d) => { const t = -Math.PI / 2 + 2 * Math.PI * (d - 1) / n; return [C + (R + 9) * Math.cos(t), C + (R + 9) * Math.sin(t) + 1.9]; };
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
// A region's edge: arcs along the circle and straight strings.
export function regionPath(n, r) {
  const [first] = r.walk;
  let d = `M${pt(dotAt(n, first[1]))}`;
  for (const [kind, , to] of r.walk) d += kind === 'arc' ? `A${R} ${R} 0 0 1 ${pt(dotAt(n, to))}` : `L${pt(dotAt(n, to))}`;
  return `${d}Z`;
}
// One side of a string: along the circle through the side's dots, and back
// along the string.
function sidePath(n, [a, b], side) {
  const from = side.length && side[0] === a + 1 ? a : b, to = from === a ? b : a;
  let d = `M${pt(dotAt(n, from))}`, at = from;
  do { at = at % n + 1; d += `A${R} ${R} 0 0 1 ${pt(dotAt(n, at))}`; } while (at !== to);
  return `${d}Z`;
}
const line = ([a, b], n, cls, extra = '') => { const [x1, y1] = dotAt(n, a), [x2, y2] = dotAt(n, b); return `<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"${extra}/>`; };
const stringSvg = (s, n, cls) => `<g class="st-string ${cls}">${line(s, n, 'st-edge')}${line(s, n, 'st-core')}</g>`;

// The circle: regions (as buttons when Can't is pressed), strings, dots with
// their numbers. Options: what is a control, and what is marked.
function circleSvg(n, opts) {
  const {fixed = [], mine = [], pick = null, tried = null, mode = 'dots', marks = {}, label = 'Circle of dots', shade = '', small = false} = opts;
  const all = [...fixed, ...mine], used = usedDots(all), mineEnds = usedDots(mine);
  const reg = regions(n, all).list;
  const regionLayer = mode === 'regions'
    ? reg.map(r => `<path class="st-region${marks.gap && r.gaps.includes(marks.gap) ? ' hinted' : ''}" d="${regionPath(n, r)}" data-gap="${r.gaps[0]}" role="button" tabindex="0" data-focus="st-region-${r.gaps[0]}" aria-label="${esc(r.free.length ? `The part with ${r.free.length === 1 ? `dot ${r.free[0]}` : `dots ${listWords(r.free.map(String))}`}` : 'A part with no free dots')}. Claim it is trapped"/>`).join('')
    : '';
  const strings = [
    ...fixed.map(s => stringSvg(s, n, 'fixed')),
    ...mine.map(s => {
      const target = mode === 'strings';
      const cls = `mine${marks.string && sameString(marks.string, s) ? ' hinted' : ''}${marks.bad?.some(t => sameString(t, s)) ? ' blocked' : ''}${marks.cert && sameString(marks.cert, s) ? ' cert' : ''}`;
      const attrs = target ? ` data-string="${s[0]}-${s[1]}" role="button" tabindex="0" data-focus="st-string-${s[0]}-${s[1]}" aria-label="${esc(`The string from ${s[0]} to ${s[1]}. Claim it is stuck`)}"` : '';
      return target ? `<g class="st-string ${cls} st-target"${attrs}>${line(s, n, 'st-hit')}${line(s, n, 'st-edge')}${line(s, n, 'st-core')}</g>` : stringSvg(s, n, cls);
    })
  ].join('');
  const blockers = (tried?.blockers || []).map(s => line(s, n, 'st-blocker')).join('');
  const attempt = tried ? line(tried.s, n, 'st-tried') : '';
  const extra = (marks.ghost || []).map(s => line(s, n, 'st-ghost')).join('');
  const dots = Array.from({length: n}, (_, i) => {
    const d = i + 1, [x, y] = dotAt(n, d), [lx, ly] = labelAt(n, d), control = mode === 'dots';
    const state = !used.has(d) ? 'free' : mineEnds.has(d) ? 'mine' : 'fixed';
    const cls = `st-dot ${state}${pick === d ? ' picked' : ''}${marks.dots?.includes(d) ? ' hinted' : ''}${marks.ring?.includes(d) ? ' ringed' : ''}${marks.wrong?.includes(d) ? ' wrong' : ''}`;
    const partner = state === 'free' ? '' : `, joined to ${all.find(s => s.includes(d)).find(e => e !== d)}`;
    const doing = !control ? '' : pick === d ? '. Put it down' : state === 'free' ? (pick ? `. Join it to ${pick}` : '. Pick it') : state === 'mine' ? '. Take off its string' : '';
    // A dark string's dots stay in the arrow-key ring but do nothing.
    const attrs = control ? ` data-dot="${d}" role="button" tabindex="0" data-focus="st-dot-${d}"${state === 'fixed' ? ' aria-disabled="true"' : ''} aria-label="${esc(`Dot ${d}${partner}${doing}`)}"` : '';
    return `<g class="${cls}"${attrs}><circle class="st-ring" cx="${f(x)}" cy="${f(y)}" r="5.6"/><circle class="st-disc" cx="${f(x)}" cy="${f(y)}" r="3.3"/>${small ? '' : `<text x="${f(lx)}" y="${f(ly)}">${d}</text>`}</g>`;
  }).join('');
  const board = mode === 'regions' || mode === 'strings' ? ' tabindex="-1" data-focus="st-board"' : '';
  return `<svg class="st-circle${small ? ' st-mini' : ''} mode-${mode}" viewBox="${small ? '6 6 88 88' : '0 0 100 100'}" role="group" aria-label="${esc(label)}"${board}><circle class="st-rim" cx="${C}" cy="${C}" r="${R}"/>${shade}${regionLayer}${strings}${extra}${blockers}${attempt}${dots}</svg>`;
}
const mini = (n, fixed, mine, label) => circleSvg(n, {fixed, mine, mode: 'picture', label, small: true});

// A path: steps on a grid, numbered underneath. `steps` gives each step's
// class; `over` is a second path drawn on top; `corners` are buttons.
const S = 10, PAD = 6;
function pathSvg(word, {label = 'Path', steps = () => '', over = null, dashed = null, cornerAt = null, corners: hot = [], hinted = null, under = '', top = 0} = {}) {
  const len = Math.max(word.length, over?.length || 0, dashed?.length || 0, 2);
  const tall = Math.max(1, top, ...heights(word), ...(over ? heights(over) : [0]), ...(dashed ? heights(dashed) : [0]));
  const W = len * S + 2 * PAD, H = tall * S + 2 * PAD + 7, y0 = PAD + tall * S;
  const P = (i, h) => [PAD + i * S, y0 - h * S];
  const grid = [];
  for (let h = 0; h <= tall; h++) grid.push(`<line class="st-grid${h === 0 ? ' ground' : ''}" x1="${PAD}" y1="${f(y0 - h * S)}" x2="${PAD + len * S}" y2="${f(y0 - h * S)}"/>`);
  const segs = (w, cls, each = () => '') => { const h = heights(w); return [...w].map((c, i) => `<line class="${cls} ${each(i)}" x1="${f(P(i, h[i])[0])}" y1="${f(P(i, h[i])[1])}" x2="${f(P(i + 1, h[i + 1])[0])}" y2="${f(P(i + 1, h[i + 1])[1])}"/>`).join(''); };
  const nums = Array.from({length: len}, (_, i) => `<text class="st-num" x="${f(PAD + (i + 0.5) * S)}" y="${f(y0 + 6.2)}">${i + 1}</text>`).join('');
  const hw = heights(word);
  const cornerSvg = hot.map(c => {
    const [x, y] = P(c.at, hw[c.at]), label = `${c.kind === 'valley' ? 'Low corner' : 'Peak'} after step ${c.at}, height ${hw[c.at]}. Swap steps ${c.at} and ${c.at + 1}`;
    return `<g class="st-corner ${c.kind}${hinted === c.at ? ' hinted' : ''}" data-corner="${c.at}" role="button" tabindex="0" data-focus="st-corner-${c.at}" aria-label="${esc(label)}"><circle class="st-corner-hit" cx="${f(x)}" cy="${f(y)}" r="6.5"/><circle class="st-corner-ring" cx="${f(x)}" cy="${f(y)}" r="3.6"/></g>`;
  }).join('');
  const dots = heights(word).map((h, i) => `<circle class="st-vertex" cx="${f(P(i, h)[0])}" cy="${f(P(i, h)[1])}" r="1.3"/>`).join('');
  return `<svg class="st-path" viewBox="0 0 ${f(W)} ${f(H)}" role="img" aria-label="${esc(label)}">${grid.join('')}${under}${dashed ? segs(dashed, 'st-dash') : ''}${segs(word, 'st-step', steps)}${over ? segs(over, 'st-over') : ''}${dots}${nums}${cornerSvg}</svg>`.replace('role="img"', hot.length ? 'role="group"' : 'role="img"');
}
// Diamonds between two paths of one length: at each corner, one per two units
// of height gap. `labels` numbers some of them ({"at,y": text}).
function diamondsSvg(a, b, labels = {}) {
  const ha = heights(a), hb = heights(b), tall = Math.max(1, ...ha, ...hb), y0 = PAD + tall * S;
  const out = [];
  for (let i = 1; i < a.length; i++) {
    const lo = Math.min(ha[i], hb[i]), hi = Math.max(ha[i], hb[i]);
    for (let y = lo + 1; y < hi; y += 2) {
      const x = PAD + i * S, cy = y0 - y * S, text = labels[`${i},${y}`];
      out.push(`<g class="st-diamond"><path d="M${f(x)} ${f(cy - S)}L${f(x + S)} ${f(cy)}L${f(x)} ${f(cy + S)}L${f(x - S)} ${f(cy)}Z"/>${text ? `<text x="${f(x)}" y="${f(cy + 2)}">${text}</text>` : ''}</g>`);
    }
  }
  return out.join('');
}

// A tree, root at the top. Leaves spread evenly; a parent sits over the middle
// of its children. Nodes and edges can be buttons.
function treeLayout(tree) {
  const nodes = [], edges = [];
  let leaf = 0;
  const go = (t, depth, pos) => {
    const id = nodes.length;
    nodes.push({pos, depth, x: 0});
    const kids = t.map((c, i) => go(c, depth + 1, [...pos, i]));
    nodes[id].x = kids.length ? (nodes[kids[0]].x + nodes[kids.at(-1)].x) / 2 : leaf++;
    for (const k of kids) edges.push([id, k]);
    return id;
  };
  go(tree, 0, []);
  return {nodes, edges, leaves: Math.max(leaf, 1), depth: Math.max(...nodes.map(n => n.depth))};
}
function treeSvg(tree, {label = 'Tree', cls = '', act = false, posNode = null, hinted = null, prune = false, width = 0, depth = 0} = {}) {
  const L = treeLayout(tree), dx = 13, dy = 12, pad = 7;
  const cols = Math.max(L.leaves, width), rows = Math.max(L.depth, depth, 1);
  const W = (cols - 1) * dx + 2 * pad, H = rows * dy + 2 * pad, shift = (cols - L.leaves) * dx / 2;
  const at = n => [pad + shift + n.x * dx, pad + n.depth * dy];
  const nodeId = n => posNode ? posNode.get(n.pos.join(',')) : null;
  const edges = L.edges.map(([u, v]) => {
    const [x1, y1] = at(L.nodes[u]), [x2, y2] = at(L.nodes[v]), node = nodeId(L.nodes[v]);
    const mark = hinted !== null && prune && node === hinted ? ' hinted' : '';
    const attrs = act ? ` data-prune="${node}" role="button" tabindex="0" data-focus="st-edge-${L.nodes[v].pos.join('-')}" aria-label="${esc(`Edge to ${nodeWords(L.nodes[v].pos)}. Take it away`)}"` : '';
    return `<g class="st-tedge${mark}"${attrs}>${act ? `<line class="st-hit" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>` : ''}<line class="st-tline" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/></g>`;
  }).join('');
  const nodes = L.nodes.map((n, i) => {
    const [x, y] = at(n), node = nodeId(n), mark = hinted !== null && !prune && node === hinted ? ' hinted' : '';
    const attrs = act ? ` data-grow="${node}" role="button" tabindex="0" data-focus="st-node-${n.pos.join('-') || 'root'}" aria-label="${esc(`${capital(nodeWords(n.pos))}. Give it a new child`)}"` : '';
    return `<g class="st-tnode${i === 0 ? ' root' : ''}${mark}"${attrs}>${act ? `<circle class="st-hit" cx="${f(x)}" cy="${f(y)}" r="6.4"/>` : ''}<circle class="st-tdot" cx="${f(x)}" cy="${f(y)}" r="${i === 0 ? 3.4 : 2.8}"/></g>`;
  }).join('');
  // About four pixels a unit at most, so a small tree is not blown up.
  return `<svg class="st-tree ${cls}" viewBox="0 0 ${f(W)} ${f(H)}" style="max-width:${Math.round(W * 4)}px" role="${act ? 'group' : 'img'}" aria-label="${esc(label)}">${edges}${nodes}</svg>`;
}
const treeWords = tree => tree.length ? `the root has ${NUMBER[tree.length]} ${tree.length === 1 ? 'child' : 'children'}${tree.some(c => c.length) ? `; ${tree.map((c, i) => c.length ? `its ${ORDINAL[i]} has ${NUMBER[edgesOf(c)]} below it` : '').filter(Boolean).join('; ')}` : ''}` : 'just the root';

const button = (label, action, cls, enabled, hinted) => `<button type="button" class="secondary st-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="st-${action.type}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const sizeButton = (label, n, cls, name, enabled) => `<button type="button" class="secondary st-button st-${cls}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'size', n}))}" data-focus="st-${cls}" aria-label="${name}" ${enabled ? '' : 'disabled'}>${label}</button>`;
// A toggle's data-focus names what takes focus after it is pressed.
const toggle = (label, payload, cls, pressed, enabled, hinted, focus = `st-${cls}`) => `<button type="button" class="secondary st-button ${cls}${hinted ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify(payload)}' data-focus="${focus}" aria-pressed="${pressed}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const told = text => text ? `<p class="st-told">${esc(text)}</p>` : '';
const status = text => `<p class="sr-only" role="status">${esc(text)}</p>`;
const stringsSay = (n, all) => all.length ? `Strings: ${sortStrings(all).map(([a, b]) => `${a} to ${b}`).join(', ')}.` : 'No strings.';
const FINISH_REFUSAL = {even: 'Nothing is trapped there.', own: 'Your own strings trap it.'};
// Why a tapped string is not stuck: strings on both sides, or a side where a
// string can still go (four or more free dots, an even number).
export const neighbourRefusal = (n, strings, s) => sidesOf(n, s).every(side => strings.some(t => side.includes(t[0]))) ? 'It has strings on both sides.' : 'A string can still go beside it.';

function renderCircleMode(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), n = dotsOf(q, b), state = ui(p);
  const fixed = q.mode === 'playground' ? [] : fixedOf(q);
  const h = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b) : null;
  const hinting = h?.type === 'move' ? h : null;
  const cantKind = q.mode === 'finish' ? 'regions' : q.mode === 'neighbours' ? 'strings' : null;
  const claiming = cantKind && !done && state.cant && b.strings.length && b.refused === null;
  const hintCant = hinting?.action.type === 'cant';
  const mode = done ? 'picture' : claiming ? cantKind : 'dots';
  const marks = {dots: hintCant ? (mode === 'regions' ? [hinting.dot] : null) : hinting?.dots, gap: hintCant && mode === 'regions' ? hinting.gap : null, string: hintCant && mode === 'strings' ? hinting.string : null, bad: state.tried?.blockers};
  let shade = '', words = '', below = '', shelf = '', say = '';
  // Claims: a kept Can't shades the trapped region and rings its dots; a kept
  // neighbours claim shades the stuck side of the tapped string.
  if (q.mode === 'finish' && b.claimed !== null) {
    const c = trapCheck(n, fixed, b.strings, b.claimed);
    shade = `<path class="st-trap" d="${regionPath(n, c.whole)}"/>`;
    marks.ring = c.whole.free;
    say = `Trapped: ${c.whole.free.length === 1 ? `dot ${c.whole.free[0]}` : `dots ${listWords(c.whole.free.map(String))}`}, ${NUMBER[c.whole.free.length]} in all.`;
  }
  if (q.mode === 'neighbours' && b.claimed !== null) {
    const side = stuckSides(n, b.strings, b.claimed)[0];
    shade = `<path class="st-trap" d="${sidePath(n, b.claimed, side)}"/>`;
    marks.ring = side; marks.cert = b.claimed;
    if (side.length === 2) marks.ghost = [side];
    say = side.length === 2 ? `Only dots ${side[0]} and ${side[1]} are left beside the string, and they are neighbours.` : `${capital(NUMBER[side.length])} ${side.length === 1 ? 'dot is' : 'dots are'} left beside the string.`;
  }
  // On a board that can be finished, any Can't is refused with "There is a way."
  if (q.mode === 'finish' && b.refused !== null) words = completions(n, fixed).length ? 'There is a way.' : FINISH_REFUSAL[trapCheck(n, fixed, b.strings, b.refused).why] || '';
  if (q.mode === 'neighbours' && b.refused !== null) words = neighbourRefusal(n, b.strings, b.refused);
  if (q.mode === 'every') {
    if (b.told?.kind === 'more') words = 'There is another.';
    if (b.told?.kind === 'again') words = 'Found already.';
    if (b.found.length) shelf = `<ul class="st-shelf" aria-label="Pairings found">${b.found.map(k => `<li class="${b.told?.kind === 'again' && b.told.key === k ? 'again' : ''}">${mini(n, fixed, fromKey(k).filter(s => !fixed.some(t => sameString(s, t))), stringsSay(n, fromKey(k)))}</li>`).join('')}</ul>`;
  }
  if (!done) {
    const parts = [];
    if (cantKind) {
      // Pressing Can't sends focus to the circle itself, not to any part or
      // string, so nothing points at the answer; Tab then walks the choices.
      parts.push(toggle('Can’t', {cant: !state.cant}, 'cant', Boolean(claiming), b.strings.length > 0 && b.refused === null, hintCant && !state.cant, claiming ? 'st-cant' : 'st-board'));
    }
    if (q.mode === 'every') parts.push(button('That’s all', {type: 'all'}, 'all', b.told?.kind !== 'more', hinting?.action.type === 'all'));
    if (q.mode === 'playground') parts.push(`<span class="st-size" role="group" aria-label="Dots">${sizeButton('−', n - 1, 'fewer', 'Fewer dots', n > MIN_DOTS)}${sizeButton('+', n + 1, 'more', 'More dots', n < MAX_DOTS)}</span>`, button('Clear', {type: 'clear'}, 'clear', b.strings.length > 0, false));
    if (parts.length) below = `<div class="st-bar">${parts.join('')}</div>`;
  }
  if (state.tried && !done) {
    words ||= state.tried.why === 'neighbours' ? 'Those two are neighbours.' : '';
    say = `${say} ${state.tried.why === 'cross' ? `${state.tried.s[0]} to ${state.tried.s[1]} would cross ${listWords(state.tried.blockers.map(s => `${s[0]} to ${s[1]}`))}.` : ''}`;
  }
  let extra = '';
  if (q.mode === 'decode') {
    const code = codeOf(n, b.strings);
    const wrong = [...q.word].map((c, i) => code[i] !== '.' && code[i] !== c ? i + 1 : 0).filter(Boolean);
    marks.wrong = wrong;
    extra = `<div class="st-side">${pathSvg(q.word, {label: `Path ${q.word.split('').join(' ')}`, steps: i => code[i] === '.' ? 'todo' : code[i] === q.word[i] ? 'ok' : 'off'})}</div>`;
    say = `${say} ${wrong.length ? `${wrong.length === 1 ? 'Step' : 'Steps'} ${listWords(wrong.map(String))} go the other way.` : ''}`;
  }
  if (q.mode === 'treepair') {
    const goal = treeOfWord(q.word), mineTree = treeOfStrings(b.strings), L1 = treeLayout(goal), L2 = treeLayout(mineTree);
    const width = Math.max(L1.leaves, L2.leaves), depth = Math.max(L1.depth, L2.depth, 1), same = walkOf(mineTree) === q.word;
    extra = `<div class="st-trees${same ? ' same' : ''}">${treeSvg(goal, {label: `Tree to make: ${treeWords(goal)}`, cls: 'goal', width, depth})}<span class="st-vs" aria-hidden="true">${same ? '=' : '≠'}</span>${treeSvg(mineTree, {label: `Tree of your strings: ${treeWords(mineTree)}`, cls: 'yours', width, depth})}</div>`;
  }
  if (q.mode === 'playground') {
    const path = stringPath(n, b.strings), tree = treeOfStrings(b.strings);
    extra = `<div class="st-side">${b.strings.length ? pathSvg(path, {label: `Path ${path.split('').join(' ')}`}) : ''}${treeSvg(tree, {label: `Tree: ${treeWords(tree)}`, cls: 'yours'})}</div>`;
  }
  const board = circleSvg(n, {fixed, mine: b.strings, pick: done ? null : state.pick, tried: done ? null : state.tried, mode, marks, shade, label: q.mode === 'playground' ? `Circle of ${n} dots` : 'Circle of dots'});
  const layout = q.mode === 'decode' || q.mode === 'playground' ? ' st-two' : '';
  const sayAll = `${stringsSay(n, [...fixed, ...b.strings])}${state.pick && !done ? ` Dot ${state.pick} is picked.` : ''} ${say} ${words}`.replace(/\s+/g, ' ').trim();
  const top = q.mode === 'treepair' ? extra : '';
  const side = q.mode === 'treepair' ? '' : extra;
  return `<div class="st-puzzle${done ? ' solved' : ''}${layout}" data-mechanic-wire="strings">${top}<div class="st-row"><div class="st-frame">${board}</div>${side}</div>${told(words)}${below}${shelf}${status(sayAll)}</div>`;
}

function renderTree(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), tree = treeOfParents(b.parents), walk = walkOf(tree);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const cap = Math.min(MAX_EDGES, q.word.length / 2 + 2);
  const board = treeSvg(tree, {label: `Your tree: ${treeWords(tree)}`, cls: 'build', act: !done, posNode: nodesByPosition(b.parents), hinted: h?.type === 'move' ? h.node : null, prune: Boolean(h?.prune), width: 3, depth: 2});
  const path = pathSvg(q.word, {label: `Path ${q.word.split('').join(' ')}; your walk ${walk ? walk.split('').join(' ') : 'is empty'}`, over: walk, steps: i => walk[i] === undefined ? '' : walk[i] === q.word[i] && walk.slice(0, i) === q.word.slice(0, i) ? 'ok' : ''});
  const full = b.parents.length >= cap && !done;
  // A full tree takes no new child: say so, since a tap does nothing.
  const words = full ? 'The tree is as big as it can be.' : '';
  return `<div class="st-puzzle st-tree-puzzle${done ? ' solved' : ''}" data-mechanic-wire="strings" data-full="${full}"><div class="st-frame st-tree-frame">${board}</div><div class="st-side">${path}</div>${told(words)}${status(`Your walk: ${walk ? walk.split('').join(' ') : 'nothing yet'}. ${words}`)}</div>`;
}

function renderSwaps(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), w = replay(q.start, b.route);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const hot = done ? [] : corners(w);
  const mountain = q.target === mountainOf(q.target.length);
  let under = '', cert = '';
  if (done) {
    // Number each diamond between the start and the target by the swap that
    // filled or emptied it.
    const labels = {};
    let cur = q.start;
    b.route.forEach((i, k) => { const before = heights(cur)[i]; cur = swapAt(cur, i); labels[`${i},${(before + heights(cur)[i]) / 2}`] = String(k + 1); });
    under = diamondsSvg(q.start, q.target, labels);
    if (mountain) {
      const tags = [...q.start].map((c, i) => c === 'D' ? [...q.start.slice(i)].filter(x => x === 'U').length : null);
      cert = `<div class="st-cards st-start" role="img" aria-label="${esc(`Start ${q.start.split('').join(' ')}: each D has ${listWords(tags.filter(t => t !== null).map(String))} U after it, ${dBeforeU(q.start)} in all`)}">${[...q.start].map((c, i) => `<span class="st-card ${c}"><b>${c}</b>${tags[i] !== null ? `<i>${tags[i]}</i>` : ''}</span>`).join('')}<span class="st-sum">${tags.filter(t => t !== null).join(' + ')} = ${dBeforeU(q.start)}</span></div>`;
    }
  }
  const board = pathSvg(w, {label: `Path ${w.split('').join(' ')}`, dashed: done ? q.start : q.target, corners: hot, hinted: h?.type === 'move' ? h.at : null, under, top: Math.max(...heights(q.target))});
  const beads = `<div class="st-beads" role="img" aria-label="${b.route.length} ${b.route.length === 1 ? 'swap' : 'swaps'}">${b.route.map(() => '<i></i>').join('')}</div>`;
  const words = !done && w === q.target ? 'Fewer swaps can do it.' : '';
  return `<div class="st-puzzle st-swaps${done ? ' solved' : ''}" data-mechanic-wire="strings"><div class="st-frame st-path-frame">${board}</div>${cert}${beads}${told(words)}${status(`Path ${w.split('').join(' ')}. ${b.route.length} ${b.route.length === 1 ? 'swap' : 'swaps'}. ${words}`)}</div>`;
}

function render(p, a) {
  const q = p.parameters;
  if (q.mode === 'tree') return renderTree(p, a);
  if (q.mode === 'swaps') return renderSwaps(p, a);
  return renderCircleMode(p, a);
}

// --- Taps and keys ------------------------------------------------------------------------
// A tap on the circle goes to the nearest dot (or, while Can't is pressed, the
// nearest string, or the region under the finger), so a tap between targets
// reaches what is closest.
// A dot's reach is half the gap to its neighbours, at most 13 (about a
// finger's width on a phone), so neighbouring dots' reaches meet.
export function nearestDot(n, [x, y], reach = Math.min(13, R * Math.sin(Math.PI / n))) {
  let best = null, bestD = reach;
  for (let d = 1; d <= n; d++) { const [px, py] = dotAt(n, d), dist = Math.hypot(px - x, py - y); if (dist < bestD) { best = d; bestD = dist; } }
  return best;
}
const segDist = ([x, y], [x1, y1], [x2, y2]) => { const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - x1 - t * dx, y - y1 - t * dy); };
export function nearestString(n, strings, point, reach = 7) {
  let best = null, bestD = reach;
  for (const s of strings) { const dist = segDist(point, dotAt(n, s[0]), dotAt(n, s[1])); if (dist < bestD) { best = s; bestD = dist; } }
  return best;
}
// What a tap on dot d does: pick it, join it to the picked dot, put the picked
// dot down, or take off the child's string there.
export function dotAction(q, b, pick, d) {
  const n = dotsOf(q, b), fixedEnds = usedDots(q.mode === 'playground' ? [] : fixedOf(q));
  if (fixedEnds.has(d)) return null;
  if (b.strings.some(s => s.includes(d))) return {move: {type: 'cut', dot: d}};
  if (pick === null) return {ui: {pick: d}};
  if (pick === d) return {ui: {pick: null}};
  const s = norm([pick, d]), problem = layProblem(q, b, s);
  if (!problem) return {move: {type: 'lay', s}};
  if (problem.why === 'cross' || problem.why === 'neighbours') return {ui: {tried: {s, why: problem.why, blockers: problem.blockers || []}}};
  return null;
}
function svgPoint(svg, e) {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return [p.x, p.y];
}
function wire(root, p, api) {
  const q = p.parameters;
  const now = () => api.attempt().board;
  const run = r => { if (!r) return; if (r.move) api.apply(r.move); else if (r.ui) api.ui(r.ui); };
  const circle = root.querySelector('.st-circle:not(.st-mini)');
  const onCircle = (target, point) => {
    const b = now(), n = dotsOf(q, b), state = ui(p);
    if (solved(p, b)) return null;
    if (circle.classList.contains('mode-regions')) {
      // A claim is one tap, judged at once. A tap that misses every part
      // lets go of Can't rather than doing nothing.
      const gap = Number(target?.closest?.('[data-gap]')?.dataset.gap);
      return gap ? {move: {type: 'cant', gap}} : {ui: {cant: false}};
    }
    if (circle.classList.contains('mode-strings')) {
      const el = target?.closest?.('[data-string]'), s = point ? nearestString(n, b.strings, point) : el ? el.dataset.string.split('-').map(Number) : null;
      return s ? {move: {type: 'cant', s: [...s]}} : {ui: {cant: false}};
    }
    if (!circle.classList.contains('mode-dots')) return null;
    const d = point ? nearestDot(n, point) : Number(target?.closest?.('[data-dot]')?.dataset.dot) || null;
    if (d === null) return state.pick !== null || state.tried ? {ui: {pick: null}} : null;
    return dotAction(q, b, state.pick, d);
  };
  if (circle) {
    circle.addEventListener('click', e => {
      // Region taps go by what is under the finger; dots and strings by distance.
      const point = circle.classList.contains('mode-regions') ? null : svgPoint(circle, e);
      run(onCircle(e.target, point));
    });
    circle.addEventListener('keydown', e => {
      const el = e.target.closest?.('[data-dot],[data-gap],[data-string]');
      if (!el) return;
      if (['Enter', ' '].includes(e.key)) { e.preventDefault(); run(onCircle(el, null)); return; }
      // Arrow keys walk round the dots.
      const d = Number(el.dataset.dot);
      if (d && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const n = dotsOf(q, now()), next = ['ArrowRight', 'ArrowDown'].includes(e.key) ? d % n + 1 : (d + n - 2) % n + 1;
        circle.querySelector(`[data-dot="${next}"]`)?.focus();
      }
      if (e.key === 'Escape' && (ui(p).pick !== null || ui(p).cant)) { e.preventDefault(); api.ui({pick: null, cant: false}); }
    });
  }
  const tree = root.querySelector('.st-tree.build');
  if (tree) {
    const act = el => {
      if (solved(p, now())) return null;
      const grow = el?.closest?.('[data-grow]'), prune = el?.closest?.('[data-prune]');
      if (grow) return root.dataset.full === 'true' ? null : {move: {type: 'grow', at: Number(grow.dataset.grow)}};
      if (prune) return {move: {type: 'prune', node: Number(prune.dataset.prune)}};
      return null;
    };
    // A tap goes to the dot it is close to, else to the nearest edge, else to
    // the nearest dot, so the middle of a short edge is not lost to the
    // dots at its ends.
    const pick = e => {
      const at = svgPoint(tree, e);
      if (!at) return e.target;
      const [x, y] = at, num = (el, k) => Number(el.getAttribute(k));
      const nodes = [...tree.querySelectorAll('[data-grow]')].map(el => { const c = el.querySelector('.st-tdot'); return [Math.hypot(num(c, 'cx') - x, num(c, 'cy') - y), el]; }).sort((u, v) => u[0] - v[0]);
      const edges = [...tree.querySelectorAll('[data-prune]')].map(el => { const l = el.querySelector('.st-tline'); return [segDist([x, y], [num(l, 'x1'), num(l, 'y1')], [num(l, 'x2'), num(l, 'y2')]), el]; }).sort((u, v) => u[0] - v[0]);
      if (nodes[0] && nodes[0][0] <= 4) return nodes[0][1];
      if (edges[0] && edges[0][0] <= 4) return edges[0][1];
      return nodes[0] && nodes[0][0] <= 6.4 ? nodes[0][1] : e.target;
    };
    tree.addEventListener('click', e => run(act(pick(e))));
    tree.addEventListener('keydown', e => { if (['Enter', ' '].includes(e.key) && e.target.closest?.('[data-grow],[data-prune]')) { e.preventDefault(); run(act(e.target)); } });
  }
  const path = root.querySelector('.st-swaps .st-path');
  if (path) {
    const act = el => { const c = el?.closest?.('[data-corner]'); return c && !solved(p, now()) ? {move: {type: 'swap', at: Number(c.dataset.corner)}} : null; };
    path.addEventListener('click', e => run(act(e.target)));
    path.addEventListener('keydown', e => { if (['Enter', ' '].includes(e.key) && e.target.closest?.('[data-corner]')) { e.preventDefault(); run(act(e.target)); } });
  }
}

export const stringsMechanics = {
  strings: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      const s = ui(p);
      if (payload.pick === null || int(payload.pick)) { s.pick = payload.pick; s.tried = null; }
      if (object(payload.tried)) { s.tried = payload.tried; s.pick = null; }
      if (typeof payload.cant === 'boolean') { s.cant = payload.cant; s.pick = null; s.tried = null; }
    },
    reset: p => { uiState.delete(p.id); },
    // Undo keeps what a claim settled: the pairings found and a wrong That's
    // all, and a refused Can't while the strings are the same.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      if (q.mode === 'every' && Array.isArray(from.found)) return {...to, found: [...from.found], told: from.told?.kind === 'more' ? from.told : null, done: false};
      if ((q.mode === 'finish' || q.mode === 'neighbours') && from.refused !== null && keyOf(from.strings) === keyOf(to.strings)) return {...to, refused: from.refused, claimed: null};
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'strings',
  family: {id: 'strings', symbol: '⌒'},
  mechanics: stringsMechanics,
  pack: new URL('./strings.json', import.meta.url).href,
  css: new URL('./strings.css', import.meta.url).href,
  focus: '.st-dot[role=button]:not([aria-disabled=true]),.st-region[role=button],.st-string[role=button],.st-tnode[role=button],.st-corner[role=button]'
};
