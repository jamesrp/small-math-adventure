// Cops and robbers on a map: the game itself, with no drawing. Dots are joined
// by roads. C (the cop) chooses a dot, then R (the robber) chooses another. C
// moves first; on a turn a piece stays or takes one road. Positions are always
// visible, and C catches R by landing on R's dot. R never steps onto C: that
// move only ends the game sooner, so it is never offered.
//
// One cop catches R from every start exactly on the maps that fold to one dot
// (Nowakowski and Winkler; Quilliot): a dot v folds into a neighbour u when u
// reaches every dot v reaches, by staying or taking one road. Trees fold leaf
// by leaf; a bare ring of four or more dots has no fold, and R stays out of C's
// reach forever. Two cops catch on every ring.
//
// Everything here works with dot indices; the mechanics turn ids into indices
// with graphOf.

export const INF = Infinity;

const graphCache = new Map();
// The map with its closed neighbourhoods: nb[v] lists v and its neighbours.
export function graphOf(ids, roads) {
  const key = JSON.stringify([ids, roads]);
  if (graphCache.has(key)) return graphCache.get(key);
  const n = ids.length, index = Object.fromEntries(ids.map((id, i) => [id, i]));
  const adj = Array.from({length: n}, () => Array(n).fill(false));
  for (const [u, v] of roads) { adj[index[u]][index[v]] = adj[index[v]][index[u]] = true; }
  for (let v = 0; v < n; v++) adj[v][v] = true;
  const nb = adj.map(row => row.flatMap((on, j) => on ? [j] : []));
  const G = {ids, n, index, adj, nb, key};
  if (graphCache.size > 400) graphCache.clear();
  graphCache.set(key, G);
  return G;
}

// Fewest roads between every two dots.
export function distances(G) {
  if (G.dist) return G.dist;
  const d = Array.from({length: G.n}, () => Array(G.n).fill(INF));
  for (let s = 0; s < G.n; s++) {
    d[s][s] = 0;
    const queue = [s];
    for (let k = 0; k < queue.length; k++) for (const v of G.nb[queue[k]]) if (d[s][v] === INF) { d[s][v] = d[s][queue[k]] + 1; queue.push(v); }
  }
  G.dist = d;
  return d;
}
export const connected = G => distances(G)[0].every(x => x < INF);

// --- One cop ------------------------------------------------------------------
// V[c][r]: with C to move from c and R on r, the fewest C moves (the catching
// move included) that catch R however R plays, or INF when R can stay free
// forever. Computed by relaxing from INF: values only fall, and each pass
// lets one more round of C moves count.
export function oneCop(G) {
  if (G.one) return G.one;
  const {n, nb} = G, V = Array.from({length: n}, () => Array(n).fill(INF));
  const after = (c2, r) => { let worst = -1; for (const r2 of nb[r]) if (r2 !== c2 && V[c2][r2] > worst) worst = V[c2][r2]; return worst; };
  for (let changed = true; changed;) {
    changed = false;
    for (let c = 0; c < n; c++) for (let r = 0; r < n; r++) {
      if (c === r) continue;
      let best = INF;
      for (const c2 of nb[c]) { const v = c2 === r ? 1 : 1 + after(c2, r); if (v < best) best = v; }
      if (best < V[c][r]) { V[c][r] = best; changed = true; }
    }
  }
  // W(c2, r): R to move from r with C just arrived on c2 (c2 ≠ r).
  const W = (c2, r) => after(c2, r);
  // The worst start for C on c: R chooses the dot that holds out longest.
  const start = c => Math.max(...G.ids.map((_, r) => r === c ? -1 : V[c][r]));
  G.one = {V, W, start};
  return G.one;
}
// Where R goes: the dot that holds out longest; then the dot farthest from C;
// then staying; then the first dot.
export function robberReply(G, c, r) {
  const {V} = oneCop(G), d = distances(G);
  let best = null;
  for (const r2 of G.nb[r]) {
    if (r2 === c) continue;
    const key = [V[c][r2], d[c][r2], r2 === r ? 1 : 0, -r2];
    if (!best || better(key, best.key)) best = {r2, key};
  }
  return best.r2;
}
export function robberPlace(G, c) {
  const {V} = oneCop(G), d = distances(G);
  let best = null;
  for (let r = 0; r < G.n; r++) {
    if (r === c) continue;
    const key = [V[c][r], d[c][r], -r];
    if (!best || better(key, best.key)) best = {r, key};
  }
  return best.r;
}
const better = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };
const lower = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; };
// The value of C's move to c2 when R is on r.
export const moveValue = (G, c2, r) => c2 === r ? 1 : 1 + oneCop(G).W(c2, r);
// R's replies to C on c2 that keep R free forever.
export const safeReplies = (G, c2, r) => G.nb[r].filter(r2 => r2 !== c2 && oneCop(G).V[c2][r2] === INF).length;
// C's moves from c with R on r, best first: catching, then the fewest moves
// to a catch, then (when R is free forever) the fewest safe replies for R,
// then nearest R, then the first dot. This is the cop the app plays.
export function copMoves(G, c, r) {
  const d = distances(G);
  const keyOf = c2 => [c2 === r ? 0 : 1, moveValue(G, c2, r), c2 === r ? 0 : safeReplies(G, c2, r), d[c2][r], c2];
  return [...G.nb[c]].sort((x, y) => lower(keyOf(x), keyOf(y)) ? -1 : lower(keyOf(y), keyOf(x)) ? 1 : 0);
}
// The best start for C: the fewest moves against R's hardest start, then the
// dot nearest every other (smallest total distance), then the first dot.
export function bestStarts(G) {
  const {start} = oneCop(G), m = Math.min(...G.ids.map((_, c) => start(c)));
  return G.ids.map((_, c) => c).filter(c => start(c) === m);
}
// The app's start as C: the best start, then the fewest safe places for R,
// then the dot nearest the others.
export function copStart(G) {
  const {start, V} = oneCop(G), d = distances(G);
  const keyOf = c => [start(c), G.ids.filter((_, r) => r !== c && V[c][r] === INF).length, d[c].reduce((s, x) => s + x, 0), c];
  return G.ids.map((_, c) => c).sort((x, y) => lower(keyOf(x), keyOf(y)) ? -1 : 1)[0];
}

// --- Two cops -----------------------------------------------------------------
// V2[c1][c2][r] as V, with both cops moving in one cop turn.
export function twoCops(G) {
  if (G.two) return G.two;
  const {n, nb} = G, V = Array.from({length: n}, () => Array.from({length: n}, () => Array(n).fill(INF)));
  const after = (a, b, r) => { let worst = -1; for (const r2 of nb[r]) if (r2 !== a && r2 !== b && V[a][b][r2] > worst) worst = V[a][b][r2]; return worst; };
  for (let changed = true; changed;) {
    changed = false;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let r = 0; r < n; r++) {
      if (r === a || r === b) continue;
      let best = INF;
      for (const a2 of nb[a]) for (const b2 of nb[b]) { const v = a2 === r || b2 === r ? 1 : 1 + after(a2, b2, r); if (v < best) best = v; }
      if (best < V[a][b][r]) { V[a][b][r] = best; changed = true; }
    }
  }
  const W = (a2, b2, r) => after(a2, b2, r);
  const start = (a, b) => Math.max(...G.ids.map((_, r) => r === a || r === b ? -1 : V[a][b][r]));
  G.two = {V, W, start};
  return G.two;
}
export function robberReply2(G, a, b, r) {
  const {V} = twoCops(G), d = distances(G);
  let best = null;
  for (const r2 of G.nb[r]) {
    if (r2 === a || r2 === b) continue;
    const key = [V[a][b][r2], Math.min(d[a][r2], d[b][r2]), r2 === r ? 1 : 0, -r2];
    if (!best || better(key, best.key)) best = {r2, key};
  }
  return best.r2;
}
export function robberPlace2(G, a, b) {
  const {V} = twoCops(G), d = distances(G);
  let best = null;
  for (let r = 0; r < G.n; r++) {
    if (r === a || r === b) continue;
    const key = [V[a][b][r], Math.min(d[a][r], d[b][r]), -r];
    if (!best || better(key, best.key)) best = {r, key};
  }
  return best.r;
}
export const moveValue2 = (G, a2, b2, r) => a2 === r || b2 === r ? 1 : 1 + twoCops(G).W(a2, b2, r);
// The cops' best move: the fewest moves to a catch, then nearest R, then the
// first pair of dots.
export function copMove2(G, a, b, r) {
  const d = distances(G);
  let best = null;
  for (const a2 of G.nb[a]) for (const b2 of G.nb[b]) {
    const key = [moveValue2(G, a2, b2, r), d[a2][r] + d[b2][r], a2, b2];
    if (!best || lower(key, best.key)) best = {a2, b2, key};
  }
  return [best.a2, best.b2];
}

// --- Folds --------------------------------------------------------------------
// With the dots in `gone` removed, v folds into u when u ≠ v and every dot v
// reaches (itself and its neighbours) u reaches too. missed() names one dot v
// reaches that u does not, or -1.
export function missed(G, gone, v, u) {
  for (const w of G.nb[v]) if (!gone.has(w) && !G.adj[u][w]) return w;
  return -1;
}
export function folds(G, gone) {
  const out = [];
  for (let v = 0; v < G.n; v++) if (!gone.has(v)) for (let u = 0; u < G.n; u++) if (u !== v && !gone.has(u) && missed(G, gone, v, u) < 0) out.push([v, u]);
  return out;
}

// --- Symmetry -----------------------------------------------------------------
// Every relabelling of the dots that keeps the roads (the map's automorphisms).
export function automorphisms(G) {
  if (G.auts) return G.auts;
  const {n, adj} = G, deg = G.nb.map(list => list.length), out = [], map = Array(n).fill(-1), used = Array(n).fill(false);
  (function extend(v) {
    if (v === n) { out.push([...map]); return; }
    for (let w = 0; w < n; w++) {
      if (used[w] || deg[w] !== deg[v]) continue;
      let ok = true;
      for (let u = 0; u < v && ok; u++) if (adj[v][u] !== adj[w][map[u]]) ok = false;
      if (!ok) continue;
      map[v] = w; used[w] = true;
      extend(v + 1);
      map[v] = -1; used[w] = false;
    }
  })(0);
  G.auts = out;
  return out;
}
// A position (C on c, R on r) up to the map's symmetry.
export const pairClass = (G, c, r) => Math.min(...automorphisms(G).map(s => s[c] * G.n + s[r]));
export const dotClass = (G, c) => Math.min(...automorphisms(G).map(s => s[c]));

// --- Every C move answered ----------------------------------------------------
// R gets away forever when the child, as R, has a reply to every move C can
// make from every position the replies lead to. The app's cop tries every
// start and every move, depth first from where the pieces stand, and asks for
// a reply only to a position unlike (up to the map's symmetry) any already
// answered; a reply is never asked twice. When no position on its stack has
// an unanswered move, every C move is answered: a position reached is like
// one answered, and the answer there, turned by the symmetry, keeps R free.
//
// answers lists the child's dots in order: R's start for each C start, then
// each reply. The result says what comes next:
//   {status: 'place', c}            C has chosen c; place R
//   {status: 'reply', c, r, from}   C moved from `from` to c; R on r replies
//   {status: 'caught', c, r, from}  C has caught R
//   {status: 'done', at}            every C move is answered; `at` is where
//                                   the last answer left the pieces
// with `jump` when C moves from a position other than the one the last answer
// made (C goes back to try another move) and `fresh` when C starts again
// elsewhere. `answered` counts the answers used; a bad answer gives
// {status: 'bad', bad: index}.
export function explore(G, answers) {
  const n = G.n, {start, V} = oneCop(G);
  // C's starts, one per symmetry class: the hardest for R first.
  const free = c => G.ids.filter((_, r) => r !== c && V[c][r] === INF).length;
  const starts = [];
  for (let c = 0; c < n; c++) if (dotClass(G, c) === c) starts.push(c);
  starts.sort((x, y) => start(x) - start(y) || free(x) - free(y) || x - y);
  const answered = new Set(), stack = [];
  let k = 0, last = null, nextStart = 0;
  const shown = (status, top, c2) => ({status, c: c2, r: top.r, from: {c: top.c, r: top.r}, answered: k, bad: -1, jump: Boolean(last && (last.c !== top.c || last.r !== top.r))});
  for (let guard = 0; guard < 100000; guard++) {
    if (!stack.length) {
      if (nextStart >= starts.length) return {status: 'done', answered: k, bad: -1, at: last};
      const c = starts[nextStart];
      if (k >= answers.length) return {status: 'place', c, fresh: nextStart > 0, answered: k, bad: -1, jump: false};
      const r = answers[k];
      if (!Number.isInteger(r) || r < 0 || r >= n || r === c) return {status: 'bad', bad: k};
      k++; nextStart++;
      last = {c, r};
      stack.push(last);
      continue;
    }
    const top = stack.at(-1);
    const c2 = copMoves(G, top.c, top.r).find(m => m === top.r || !answered.has(pairClass(G, m, top.r)));
    if (c2 === undefined) { stack.pop(); continue; }
    if (c2 === top.r) return shown('caught', top, c2);
    if (k >= answers.length) return shown('reply', top, c2);
    const r2 = answers[k];
    if (!Number.isInteger(r2) || !G.nb[top.r].includes(r2) || r2 === c2) return {status: 'bad', bad: k};
    k++;
    answered.add(pairClass(G, c2, top.r));
    last = {c: c2, r: r2};
    stack.push(last);
  }
  throw new Error('explore did not finish');
}
// The replies that keep R free forever, best first: one that returns to a
// position already answered, then the farthest from C.
export function escapeReplies(G, c, r) {
  const {V} = oneCop(G), d = distances(G);
  return G.nb[r].filter(r2 => r2 !== c && V[c][r2] === INF).sort((x, y) => d[c][y] - d[c][x] || (y === r) - (x === r) || x - y);
}
export function escapePlaces(G, c) {
  const {V} = oneCop(G), d = distances(G);
  return G.ids.map((_, r) => r).filter(r => r !== c && V[c][r] === INF).sort((x, y) => d[c][y] - d[c][x] || x - y);
}
