// Single-vertex flat folding (worksheet Week 28). A paper disk is creased
// along rays from its centre; the sectors between them have angles a1..an,
// clockwise from ray 1 at the top. Each ray is folded fully flat, as a
// mountain (M) or a valley (V) seen from the marked front.
//
// Flattened, every crease reflects the next sector, so sector k faces up when
// k is odd and down when k is even (counting from 1), and the rays land at
// phi1 = 0, phi(k+1) = phi(k) ± ak. An odd number of rays can never close
// (sector n would face the same way as sector 1 across ray 1), and an even
// number closes only when the alternating sums are equal, both 180 degrees
// (Kawasaki). The flat state is then a one-dimensional picture: each sector
// is an interval of directions, and the layers have one order from bottom to
// top. A labelling folds exactly when some order makes every crease bend the
// way its label says and no crease has to pass through a layer or another
// crease. This module searches those orders; nothing here is a theorem
// beyond that search, which scripts/validate-creases.mjs checks against the
// crimp reduction and the review's foldcheck.py results.

const memo = (cache, key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
export const sum = xs => xs.reduce((a, b) => a + b, 0);

// Ray directions (degrees clockwise from the top) and back again.
export const rayAngles = angles => angles.slice(0, -1).reduce((out, a) => [...out, out.at(-1) + a], [0]);
export function sectorsOf(rays) {
  const r = [...rays].sort((x, y) => x - y);
  return r.map((x, k) => (k + 1 < r.length ? r[k + 1] : r[0] + 360) - x);
}

// The flattened picture: facing s (+1 up, -1 down), ray positions phi
// (phi[n] is where the last sector ends), and each sector's interval.
export function image(angles) {
  const n = angles.length, s = angles.map((_, k) => (k % 2 ? -1 : 1)), phi = [0];
  for (let k = 0; k < n; k++) phi.push(phi[k] + s[k] * angles[k]);
  const iv = angles.map((_, k) => [Math.min(phi[k], phi[k + 1]), Math.max(phi[k], phi[k + 1])]);
  return {n, s, phi, iv, odd: n % 2 === 1, closes: n % 2 === 0 && phi[n] === 0};
}
// The two alternating sums, odd-numbered sectors first.
export const alternating = angles => [sum(angles.filter((_, k) => k % 2 === 0)), sum(angles.filter((_, k) => k % 2 === 1))];

// The creases in the flat picture. Ray k joins sectors k-1 and k (ray 0, the
// seam, joins the last sector to the first and exists only when the picture
// closes). Both sectors of a crease run from x towards side.
export function creases(img) {
  const out = [];
  for (let k = img.closes ? 0 : 1; k < img.n; k++) out.push({k, i: (k + img.n - 1) % img.n, j: k, x: img.phi[k], side: img.s[k]});
  return out;
}
// The label a crease gets from an order: a valley when the face-down sector
// lies above the face-up one (the front faces fold together).
export function labelAt(img, c, h) {
  const up = img.s[c.i] === 1 ? c.i : c.j, down = up === c.i ? c.j : c.i;
  return h[down] > h[up] ? 'V' : 'M';
}
// Everything wrong with an order h (h[k] = height of sector k): creases bent
// the other way from their labels ('turn'), a crease that would pass through
// a layer ('through'), and two creases at one place that would cross
// ('cross'). An empty list is a flat fold.
export function problems(img, cs, h, word) {
  const out = [];
  for (const c of cs) {
    if (word && labelAt(img, c, h) !== word[c.k]) out.push({kind: 'turn', k: c.k});
    const lo = Math.min(h[c.i], h[c.j]), hi = Math.max(h[c.i], h[c.j]);
    for (let m = 0; m < img.n; m++) {
      if (m === c.i || m === c.j) continue;
      if (img.iv[m][0] < c.x && c.x < img.iv[m][1] && lo < h[m] && h[m] < hi) out.push({kind: 'through', k: c.k, m});
    }
  }
  for (let p = 0; p < cs.length; p++) for (let q = p + 1; q < cs.length; q++) {
    const a = cs[p], b = cs[q];
    if (a.x !== b.x) continue;
    const [al, ah] = [Math.min(h[a.i], h[a.j]), Math.max(h[a.i], h[a.j])], [bl, bh] = [Math.min(h[b.i], h[b.j]), Math.max(h[b.i], h[b.j])];
    // Same side: nested or apart, never interleaved. Opposite sides: one wraps
    // round the other's layers unless their heights are apart.
    const bad = a.side === b.side ? (al < bl && bl < ah) !== (al < bh && bh < ah) : !(ah < bl || bh < al);
    if (bad) out.push({kind: 'cross', k: a.k, l: b.k});
  }
  return out;
}
// A search over orders from the bottom layer up: each step puts one more
// sector on top, and every problem that the placed sectors already decide
// (a crease between two of them bent the wrong way, a layer between them
// that the crease would pass through, two finished creases at one place
// that would cross) is counted then. A bend the wrong way costs 100 and any
// other problem 1. With limit 1 the search stops at the first flat order;
// otherwise it finds an order of least cost, branch and bound.
function search(img, cs, word, limit) {
  const n = img.n, h = Array(n).fill(-1), order = [], found = [];
  const at = Array.from({length: n}, () => []);
  for (const c of cs) { at[c.i].push(c); at[c.j].push(c); }
  let best = null, bestCost = limit;
  const go = cost => {
    if (order.length === n) { if (cost < bestCost) { bestCost = cost; best = {h: [...h], problems: [...found]}; } return; }
    for (let m = 0; m < n; m++) {
      if (h[m] >= 0) continue;
      const top = order.length, mark = found.length;
      h[m] = top;
      let added = 0;
      for (const c of at[m]) {
        const p = c.i === m ? c.j : c.i;
        if (h[p] < 0 || p === m) continue;
        if (word && labelAt(img, c, h) !== word[c.k]) { found.push({kind: 'turn', k: c.k}); added += 100; }
        for (const q of order) if (q !== p && h[q] > h[p] && img.iv[q][0] < c.x && c.x < img.iv[q][1]) { found.push({kind: 'through', k: c.k, m: q}); added++; }
        const [al, ah] = [h[p], top];
        for (const d of cs) {
          if (d === c || d.x !== c.x || h[d.i] < 0 || h[d.j] < 0) continue;
          const [bl, bh] = [Math.min(h[d.i], h[d.j]), Math.max(h[d.i], h[d.j])];
          const bad = d.side === c.side ? (al < bl && bl < ah) !== (al < bh && bh < ah) : !(ah < bl || bh < al);
          if (bad) { found.push({kind: 'cross', k: c.k, l: d.k}); added++; }
        }
      }
      if (cost + added < bestCost) { order.push(m); go(cost + added); order.pop(); }
      found.length = mark;
      h[m] = -1;
      if (limit === 1 && best) return;
    }
  };
  go(0);
  return best;
}

// A flat order for a labelling, or null.
const orderCache = new Map();
export function flatOrder(angles, word) {
  return memo(orderCache, `${angles.join(',')}|${word}`, () => {
    const img = image(angles);
    if (!img.closes || word.length !== img.n || !/^[MV]+$/.test(word)) return null;
    return search(img, creases(img), word, 1)?.h || null;
  });
}
export const folds = (angles, word) => flatOrder(angles, word) !== null;
export const words = n => Array.from({length: 2 ** n}, (_, m) => Array.from({length: n}, (_, k) => (m >> (n - 1 - k)) & 1 ? 'V' : 'M').join(''));
const wordCache = new Map();
export const validWords = angles => memo(wordCache, angles.join(','), () => words(angles.length).filter(w => folds(angles, w)));
// Every completion of fixed labels (null where open) that folds: only the
// words that keep the fixed labels are searched (32 of 256 for eight rays
// with three printed), unless every word already has been.
const completionCache = new Map();
export const completions = (angles, fixed) => memo(completionCache, `${angles.join(',')}|${fixed.map(f => f || '.').join('')}`, () => {
  const fits = w => fixed.every((f, k) => !f || w[k] === f);
  return wordCache.has(angles.join(',')) ? validWords(angles).filter(fits) : words(angles.length).filter(w => fits(w) && folds(angles, w));
});

// What a fold shows. 'flat' with its order; 'clash' (an odd number of
// rays), 'gap' (the alternating sums differ) or 'jam' (the labels) with the
// attempt drawn: the order of least cost, with what is wrong with it. The
// seam of a picture that does not close is left out of the attempt.
const resultCache = new Map();
export function foldResult(angles, word) {
  return memo(resultCache, `${angles.join(',')}|${word}`, () => {
    const img = image(angles);
    if (img.closes) {
      const h = flatOrder(angles, word);
      if (h) return {kind: 'flat', h, problems: []};
    }
    const best = search(img, creases(img), word, Infinity);
    return {kind: img.odd ? 'clash' : img.closes ? 'jam' : 'gap', ...best};
  });
}

// Right-angle disks and tabs. A disk is {angles, fixed}; a stock is how many
// M and V tabs there are. needs(disk) lists how many M tabs each folding
// completion uses.
export const blanks = disk => disk.fixed.map((f, k) => (f ? -1 : k)).filter(k => k >= 0);
export const needs = disk => [...new Set(completions(disk.angles, disk.fixed).map(w => blanks(disk).filter(k => w[k] === 'M').length))].sort((a, b) => a - b);
// Every way to share the stock: one folding completion per disk, using
// exactly the stock.
export function shares(disks, stock) {
  const options = disks.map(d => completions(d.angles, d.fixed)), out = [];
  const go = (i, used, picked) => {
    if (i === disks.length) { if (used === stock.M) out.push([...picked]); return; }
    for (const w of options[i]) {
      const m = blanks(disks[i]).filter(k => w[k] === 'M').length;
      if (used + m <= stock.M && blanks(disks[i]).length - m <= stock.V) { picked.push(w); go(i + 1, used + m, picked); picked.pop(); }
    }
  };
  if (sum(disks.map(d => blanks(d).length)) === stock.M + stock.V) go(0, 0, []);
  return out.filter(p => sum(p.map((w, i) => blanks(disks[i]).filter(k => w[k] === 'V').length)) === stock.V);
}
// The parity certificate for a stock that can't be shared: the disks whose
// folding completions all take an odd number of M tabs, when every disk's
// needs have one parity and their count has the other parity from the M
// tabs. Null when there is no such certificate.
export function oddDisks(disks, stock) {
  const parity = disks.map(d => { const ps = new Set(needs(d).map(m => m % 2)); return ps.size === 1 ? [...ps][0] : null; });
  if (parity.some(p => p === null)) return null;
  const odd = parity.map((p, i) => (p === 1 ? i : -1)).filter(i => i >= 0);
  return odd.length % 2 !== stock.M % 2 ? odd : null;
}
