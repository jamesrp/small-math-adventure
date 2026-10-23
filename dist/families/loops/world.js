// Loop worlds: the pure core. Cards sit in loops that are inside one another
// or apart, never crossing, with numbers that grow outward; the frame round
// every card is the loop 8. The distance of two cards is the number on the
// smallest loop round both. A world is a list of loops [label, [card, …]]
// (cards in puzzle order). Such a distance is an ultrametric: among three
// cards the largest distance occurs at least twice.
export const LABELS = [2, 4];
export const FRAME = 8;
export const VALUES = [2, 4, 8];

const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const subset = (a, b) => a.every(x => b.includes(x));
export const pairKey = (u, v) => u < v ? `${u}|${v}` : `${v}|${u}`;
// Cards in puzzle order.
export const inOrder = (cards, list) => cards.filter(c => list.includes(c));

// The distance of two cards in a world.
export function distance(loops, u, v) {
  if (u === v) return 0;
  let d = FRAME;
  for (const [label, set] of loops) if (label < d && set.includes(u) && set.includes(v)) d = label;
  return d;
}
// Every pair's distance, keyed by pairKey.
export function table(cards, loops) {
  const t = {};
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) t[pairKey(cards[i], cards[j])] = distance(loops, cards[i], cards[j]);
  return t;
}
// Whether a new loop may join the world: null, or why not and which loop is
// in the way ('few' for under two cards, 'cross', 'order' when numbers would
// not grow outward, 'same' for a loop already there).
export function refusal(loops, label, set) {
  if (!LABELS.includes(label) || set.length < 2) return {why: 'few', loop: -1};
  for (let i = 0; i < loops.length; i++) {
    const [l, s] = loops[i];
    const meet = set.some(x => s.includes(x));
    if (!meet) continue;
    const inside = subset(set, s), outside = subset(s, set);
    if (!inside && !outside) return {why: 'cross', loop: i};
    if (inside && outside) { if (l === label) return {why: 'same', loop: i}; continue; }
    if (inside && l <= label) return {why: 'order', loop: i};
    if (outside && l >= label) return {why: 'order', loop: i};
  }
  return null;
}
// Whether a list of loops is a world: each loop legal beside the others.
export function isWorld(cards, loops) {
  if (!Array.isArray(loops)) return false;
  for (let i = 0; i < loops.length; i++) {
    const loop = loops[i];
    if (!Array.isArray(loop) || loop.length !== 2 || !Array.isArray(loop[1])) return false;
    const [label, set] = loop;
    if (!set.every(x => cards.includes(x)) || new Set(set).size !== set.length) return false;
    if (set.join() !== inOrder(cards, set).join()) return false;
    if (refusal(loops.slice(0, i), label, set)) return false;
  }
  return true;
}

// --- Clues ----------------------------------------------------------------------
// A clue is [u, v, d]: the distance of u and v is d.
export const holds = (loops, [u, v, d]) => distance(loops, u, v) === d;
// Three clues on three cards whose largest number occurs once: no world fits
// them, since the two loops for the smaller numbers share a card, so one holds
// the other and with it all three cards.
export function triangle(clues) {
  if (clues.length !== 3) return null;
  const cards = [...new Set(clues.flatMap(([u, v]) => [u, v]))];
  if (cards.length !== 3) return null;
  const keys = new Set(clues.map(([u, v]) => pairKey(u, v)));
  return keys.size === 3 ? cards : null;
}
export const uniqueLargest = clues => { const ds = clues.map(c => c[2]), m = Math.max(...ds); return ds.filter(d => d === m).length === 1; };
export const isCertificate = clues => triangle(clues) !== null && uniqueLargest(clues);
// Every triangle of clues with a unique largest number, as index triples.
export function badTriangles(clues) {
  const out = [];
  for (let i = 0; i < clues.length; i++) for (let j = i + 1; j < clues.length; j++) for (let k = j + 1; k < clues.length; k++) {
    if (isCertificate([clues[i], clues[j], clues[k]])) out.push([i, j, k]);
  }
  return out;
}

// --- Worlds from distances --------------------------------------------------------
// The classes of "distance at most r", when it is an equivalence.
function classes(cards, d, r) {
  const out = [];
  for (const c of cards) {
    const home = out.find(cls => d(cls[0], c) <= r);
    if (home) home.push(c); else out.push([c]);
  }
  // Within a class every distance is at most r, and across classes more.
  for (const cls of out) for (const x of cls) for (const y of cards) if (x !== y && (d(x, y) <= r) !== cls.includes(y)) return null;
  return out;
}
// The world of a complete table of distances in 2, 4 and 8 (a function of
// two cards): its 2 loops and the 4 loops that hold more than a 2 loop. Null
// when no world has those distances.
export function worldOf(cards, d) {
  const two = classes(cards, d, 2), four = classes(cards, d, 4);
  if (!two || !four) return null;
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) if (!VALUES.includes(d(cards[i], cards[j]))) return null;
  const loops = two.filter(c => c.length > 1).map(c => [2, c]);
  for (const c of four) if (c.length > 1 && !two.some(t => sameSet(t, c))) loops.push([4, c]);
  return loops;
}
// The world of a full clue list, or null.
export function worldOfClues(cards, clues) {
  const t = new Map(clues.map(([u, v, d]) => [pairKey(u, v), d]));
  if (t.size !== cards.length * (cards.length - 1) / 2) return null;
  return worldOf(cards, (u, v) => t.get(pairKey(u, v)));
}
// The world with only the loops that change a distance, in a fixed order.
export function canonical(cards, loops) {
  const w = worldOf(cards, (u, v) => distance(loops, u, v));
  return w.sort((a, b) => a[0] - b[0] || cards.indexOf(a[1][0]) - cards.indexOf(b[1][0]));
}
export const sameWorld = (cards, a, b) => JSON.stringify(table(cards, a)) === JSON.stringify(table(cards, b));

// --- Pinning a world with clues ---------------------------------------------------
// The nodes of a world: its frame and each loop that changes a distance, with
// the parts directly inside (smaller loops, and single cards).
const nodeMemo = new Map();
export function nodes(cards, loops) {
  const key = JSON.stringify([cards, loops]);
  if (!nodeMemo.has(key)) { if (nodeMemo.size > 200) nodeMemo.clear(); nodeMemo.set(key, nodesOf(cards, loops)); }
  return nodeMemo.get(key).map(n => ({...n, parts: n.parts.map(s => [...s]), set: [...n.set]}));
}
function nodesOf(cards, loops) {
  const w = canonical(cards, loops), all = [[FRAME, [...cards]], ...w];
  // A loop round every card leaves the frame one part, which needs no clue.
  return all.map(([label, set]) => {
    const inner = all.filter(([l, s]) => l < label && subset(s, set));
    const maximal = inner.filter(([l, s]) => !inner.some(([m, t]) => t !== s && subset(s, t) && (t.length > s.length || m > l)));
    const parts = maximal.map(([, s]) => s);
    for (const c of set) if (!parts.some(s => s.includes(c))) parts.push([c]);
    parts.sort((a, b) => cards.indexOf(a[0]) - cards.indexOf(b[0]));
    return {label, set, parts};
  });
}
// What pins a world: at a 2 loop (the smallest number) the clues inside must
// join its parts, since two clues of 2 force the third; at a 4 loop or the
// frame every two parts need a clue between them, since a missing one could
// be smaller. The fewest clues: parts − 1 at each 2 loop, and a clue for
// every two parts at 4 loops and the frame.
export const needs = node => node.label === 2 ? node.parts.length - 1 : node.parts.length * (node.parts.length - 1) / 2;
export const fewest = (cards, loops) => nodes(cards, loops).reduce((s, n) => s + needs(n), 0);
const partOf = (node, c) => node.parts.findIndex(s => s.includes(c));
// Each node's check against asked pairs: the first unmet need, or null.
export function unmet(cards, loops, asked) {
  for (const node of nodes(cards, loops).sort((a, b) => a.label - b.label || a.set.length - b.set.length)) {
    const here = asked.filter(([u, v]) => node.set.includes(u) && node.set.includes(v) && partOf(node, u) !== partOf(node, v)).map(([u, v]) => [partOf(node, u), partOf(node, v)]);
    if (node.label === 2) {
      const group = node.parts.map((_, i) => i), find = i => group[i] === i ? i : (group[i] = find(group[i]));
      for (const [a, b] of here) group[find(a)] = find(b);
      const comps = new Map();
      node.parts.forEach((s, i) => { const r = find(i); comps.set(r, [...(comps.get(r) || []), ...s]); });
      if (comps.size > 1) return {node, split: [...comps.values()].map(s => inOrder(cards, s))};
    } else {
      for (let i = 0; i < node.parts.length; i++) for (let j = i + 1; j < node.parts.length; j++) {
        if (!here.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) return {node, merge: [node.parts[i], node.parts[j]]};
      }
    }
  }
  return null;
}
// Another world with the same distance on every asked pair, or null when the
// asked pairs pin the world: a 2 loop split where its clues leave it in
// pieces, or two parts of a 4 loop or the frame pulled one number closer.
export function otherWorld(cards, loops, asked) {
  const u = unmet(cards, loops, asked);
  if (!u) return null;
  const w = canonical(cards, loops), {node} = u;
  let next;
  if (u.split) {
    // The pieces stay 2 apart inside; between them the distance becomes 4.
    next = w.filter(([l, s]) => !(l === 2 && sameSet(s, node.set)));
    for (const s of u.split) if (s.length > 1) next.push([2, s]);
    if (!w.some(([l, s]) => l === 4 && subset(node.set, s))) next.push([4, [...node.set]]);
  } else {
    const [a, b] = u.merge, union = inOrder(cards, [...a, ...b]), lower = node.label === 4 ? 2 : 4;
    next = w.filter(([l, s]) => !(l === lower && (sameSet(s, a) || sameSet(s, b))));
    next.push([lower, union]);
  }
  return canonical(cards, next);
}
export const pins = (cards, loops, asked) => unmet(cards, loops, asked) === null;

// --- Drawing ----------------------------------------------------------------------
// A world laid out in a row (wrapping the frame's parts when wide), each loop
// round a run of cards, nested boxes growing outward. Units are svg user units.
export const CARD = 44, GAP = 8, PADX = 8, PADTOP = 22, PADBOT = 8, ROWGAP = 10;
export function tree(cards, loops) {
  // Parents: the smallest loop holding each loop (by cards, then number) and each card.
  const order = loops.map((l, i) => ({i, label: l[0], set: l[1]})).sort((a, b) => b.set.length - a.set.length || b.label - a.label);
  const root = {loop: -1, label: FRAME, set: [...cards], kids: []};
  const place = (node, into) => {
    const home = into.kids.find(k => k.loop !== undefined && k.set && subset(node.set, k.set) && (k.set.length > node.set.length || k.label > node.label));
    if (home) place(node, home); else into.kids.push(node);
  };
  for (const o of order) place({loop: o.i, label: o.label, set: o.set, kids: []}, root);
  for (const c of cards) place({card: c, set: [c]}, root);
  const sortKids = n => { if (!n.kids) return; n.kids.sort((a, b) => cards.indexOf(a.set[0]) - cards.indexOf(b.set[0])); n.kids.forEach(sortKids); };
  sortKids(root);
  return root;
}
function measure(n) {
  if (n.card !== undefined) { n.w = CARD; n.level = 0; return; }
  n.kids.forEach(measure);
  n.w = n.kids.reduce((s, k) => s + k.w, 0) + GAP * (n.kids.length - 1) + 2 * PADX;
  n.level = 1 + Math.max(...n.kids.map(k => k.level));
}
// Every card in a row shares one line; a loop reaches PADTOP above and PADBOT
// below the loops inside it.
function position(n, x, top, out) {
  if (n.card !== undefined) { out.cards[n.card] = {x, y: top}; return; }
  out.loops.push({loop: n.loop, label: n.label, set: n.set, level: n.level, x, y: top - PADTOP * n.level, w: n.w, h: CARD + (PADTOP + PADBOT) * n.level});
  let cx = x + PADX;
  for (const k of n.kids) { position(k, cx, top, out); cx += k.w + GAP; }
}
// maxWidth wraps the frame's parts into rows.
export function layout(cards, loops, maxWidth = 400) {
  const root = tree(cards, loops);
  root.kids.forEach(measure);
  const rows = [];
  for (const k of root.kids) {
    const row = rows.at(-1), width = row ? row.reduce((s, r) => s + r.w, 0) + GAP * row.length + k.w : k.w;
    if (row && width <= maxWidth) row.push(k); else rows.push([k]);
  }
  const rowW = row => row.reduce((s, r) => s + r.w, 0) + GAP * (row.length - 1), rowL = row => Math.max(...row.map(r => r.level));
  const inner = Math.max(...rows.map(rowW));
  const out = {cards: {}, loops: [], rows: rows.length};
  let y = PADTOP;
  for (const row of rows) {
    const L = rowL(row), top = y + PADTOP * L;
    let x = PADX + (inner - rowW(row)) / 2;
    for (const k of row) { position(k, x, top, out); x += k.w + GAP; }
    y = top + CARD + PADBOT * L + ROWGAP;
  }
  const W = inner + 2 * PADX, H = y - ROWGAP + PADBOT;
  out.frame = {x: 0, y: 0, w: W, h: H};
  out.width = W; out.height = H;
  return out;
}
