// Checks the Seams pack (dist/families/mobius/mobius.json): content fields
// and sources; every answer recomputed by a method unlike the mechanic's (a
// band refined into quarter-step square cells glued by explicit seam maps
// y -> y or W - y, with cell corners joined by union-find: pieces are
// components of cells, closed edges are components of unglued sides through
// shared corners, orientability by signing each gluing, Euler
// characteristic V - E + F; holes and notches are removed cells), instead of
// the mechanic's cycles of a seam map on whole edges and lanes; the parity
// rule for every circle of up to six strips; every ring picture by trying
// every way four dots can fall on the closed edges; every seam choice and
// every board of seams, cuts and holes; how often random taps solve each
// seam and pieces puzzle and each Can't certificate (and in page order);
// witnesses played as moves; hint chains from fresh, after a wrong move,
// after a wrong Can't and after Undo; illegal moves; forged saves, including
// a forged claim; the playground; the time hints take (CPU time).
// Run: node scripts/validate-mobius.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoToSolvable} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';
// Only to compare the playground's pieces with this file's own band.
import {topologyOf} from '../dist/families/mobius/mobius.js';

// --- An independent band ----------------------------------------------------------------
// K strips of 4L x 4n quarter-step cells (i along, j up). The right end of
// strip k is glued to the left end of strip k + 1 by y -> y (M) or
// y -> W - y (R), W = 4n. Cuts are heights c (in steps): cells are not glued
// across 4c. Removed cells make holes (the four cells round an inner lattice
// point, half a step across) and notches (the two cells against an edge at a
// lattice point).
const SCALE = 4;
class UF {
  constructor() { this.p = new Map(); }
  find(a) { if (!this.p.has(a)) this.p.set(a, a); let r = a; while (this.p.get(r) !== r) r = this.p.get(r); while (this.p.get(a) !== r) { const n = this.p.get(a); this.p.set(a, r); a = n; } return r; }
  union(a, b) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.p.set(ra, rb); }
}
function band({K, L, n, seams, cuts = [], spots = [], holes = []}) {
  const I = SCALE * L, W = SCALE * n, cutAt = new Set(cuts.map(c => SCALE * c)), removed = new Set();
  for (const s of holes.map(h => spots[h])) {
    const k = s.k || 0, x = SCALE * s.x, y = SCALE * s.y;
    if (s.y === 0) [x - 1, x].forEach(i => removed.add(`${k},${i},0`));
    else if (s.y === n) [x - 1, x].forEach(i => removed.add(`${k},${i},${W - 1}`));
    else for (const i of [x - 1, x]) for (const j of [y - 1, y]) removed.add(`${k},${i},${j}`);
  }
  const faces = [];
  for (let k = 0; k < K; k++) for (let i = 0; i < I; i++) for (let j = 0; j < W; j++) if (!removed.has(`${k},${i},${j}`)) faces.push([k, i, j]);
  const has = new Set(faces.map(f => f.join(',')));
  const fk = f => f.join(',');
  const corners = ([, i, j]) => [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
  const sides = f => { const c = corners(f); return {B: [c[0], c[1]], R: [c[1], c[2]], T: [c[2], c[3]], Lf: [c[3], c[0]]}; };
  const ck = (f, c) => `${fk(f)}|${c[0]},${c[1]}`;
  const pairs = [];
  for (const f of faces) {
    const [k, i, j] = f;
    if (i < I - 1) { const g = [k, i + 1, j]; if (has.has(fk(g))) pairs.push({f, s: 'R', g, s2: 'Lf', cm: [[[i + 1, j], [i + 1, j]], [[i + 1, j + 1], [i + 1, j + 1]]]}); }
    else {
      const k2 = (k + 1) % K, phi = y => seams[k] === 'R' ? W - y : y, y0 = phi(j), y1 = phi(j + 1), g = [k2, 0, Math.min(y0, y1)];
      if (has.has(fk(g))) pairs.push({f, s: 'R', g, s2: 'Lf', cm: [[[I, j], [0, y0]], [[I, j + 1], [0, y1]]]});
    }
    if (j < W - 1 && !cutAt.has(j + 1)) { const g = [k, i, j + 1]; if (has.has(fk(g))) pairs.push({f, s: 'T', g, s2: 'B', cm: [[[i, j + 1], [i, j + 1]], [[i + 1, j + 1], [i + 1, j + 1]]]}); }
  }
  const piece = new UF(), vert = new UF(), glued = new Set();
  for (const f of faces) { piece.find(fk(f)); for (const c of corners(f)) vert.find(ck(f, c)); }
  for (const {f, s, g, s2, cm} of pairs) {
    glued.add(`${fk(f)}|${s}`); glued.add(`${fk(g)}|${s2}`);
    piece.union(fk(f), fk(g));
    for (const [c, c2] of cm) vert.union(ck(f, c), ck(g, c2));
  }
  // Closed edges: unglued sides, joined where they share a corner point.
  const edge = new UF(), degree = new Map(), bsides = [];
  for (const f of faces) for (const [s, [a, b]] of Object.entries(sides(f))) {
    if (glued.has(`${fk(f)}|${s}`)) continue;
    const va = vert.find(ck(f, a)), vb = vert.find(ck(f, b)), key = `${fk(f)}|${s}`;
    bsides.push(key);
    edge.union(`v${va}`, `v${vb}`); edge.union(`v${va}`, `s${key}`);
    degree.set(va, (degree.get(va) || 0) + 1); degree.set(vb, (degree.get(vb) || 0) + 1);
  }
  assert.ok([...degree.values()].every(d => d === 2), 'every edge point has two edge sides: the edges are circles');
  const bsideSet = new Set(bsides);
  const circleIds = [...new Set(bsides.map(k => edge.find(`s${k}`)))];
  const circleOfSide = key => circleIds.indexOf(edge.find(`s${key}`));
  const pieceIds = [...new Set(faces.map(f => piece.find(fk(f))))];
  const pieceOfFace = key => pieceIds.indexOf(piece.find(key));
  // Each piece: its closed edges, Euler characteristic and orientability.
  const info = pieceIds.map(() => ({edges: 0, F: 0, V: new Set(), E: 0, orientable: true}));
  for (const k of new Set(bsides.map(k => edge.find(`s${k}`)))) { const any = bsides.find(s => edge.find(`s${s}`) === k); info[pieceOfFace(any.split('|')[0])].edges++; }
  for (const f of faces) { const p = info[pieceOfFace(fk(f))]; p.F++; for (const c of corners(f)) p.V.add(vert.find(ck(f, c))); }
  const gluedCount = new Map();
  for (const {f} of pairs) { const p = pieceOfFace(fk(f)); gluedCount.set(p, (gluedCount.get(p) || 0) + 1); }
  info.forEach((p, idx) => { p.E = 4 * p.F - (gluedCount.get(idx) || 0); p.chi = p.V.size - p.E + p.F; });
  // Orientability: cells two-coloured so that each gluing reverses the side (sign +1) or keeps it (-1).
  const adj = new Map();
  for (const {f, s, g, s2, cm} of pairs) {
    const [a, b] = sides(f)[s], [a2, b2] = sides(g)[s2], map = new Map(cm.map(([c, c2]) => [c.join(), c2.join()]));
    const sign = map.get(a.join()) === b2.join() && map.get(b.join()) === a2.join() ? 1 : map.get(a.join()) === a2.join() && map.get(b.join()) === b2.join() ? -1 : 0;
    assert.notEqual(sign, 0, 'a gluing matches corners');
    for (const [x, y] of [[fk(f), fk(g)], [fk(g), fk(f)]]) { if (!adj.has(x)) adj.set(x, []); adj.get(x).push([y, sign]); }
  }
  const colour = new Map();
  for (const f of faces.map(fk)) {
    if (colour.has(f)) continue;
    colour.set(f, 1);
    const stack = [f];
    while (stack.length) {
      const x = stack.pop();
      for (const [y, sign] of adj.get(x) || []) {
        const want = colour.get(x) * sign;
        if (!colour.has(y)) { colour.set(y, want); stack.push(y); }
        else if (colour.get(y) !== want) info[pieceOfFace(x)].orientable = false;
      }
    }
  }
  // The circle of a mechanic segment "k:hs:x": the unglued side of the half-cells along it.
  const segCircle = key => {
    const [, k, h, s, x] = /^(\d+):(\d+)([ud]):(\d+)$/.exec(key).map((v, i) => i === 3 ? v : +v);
    const found = Array.from({length: SCALE}, (_, d) => SCALE * x + d).map(i => s === 'u' ? `${k},${i},${SCALE * h}|B` : `${k},${i},${SCALE * h - 1}|T`).filter(sk => bsideSet.has(sk));
    assert.ok(found.length, `${key} is an edge`);
    const cs = new Set(found.map(circleOfSide));
    assert.equal(cs.size, 1, `${key} lies on one closed edge`);
    return [...cs][0];
  };
  return {circles: circleIds.length, pieces: info.map(p => ({edges: p.edges, chi: p.chi, orientable: p.orientable})), segCircle, edgeList: desc(info.map(p => p.edges))};
}
const desc = list => [...list].sort((a, b) => b - a);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const kind = p => p.orientable ? (p.chi === 0 && p.edges === 2 ? 'annulus' : p.chi === 1 && p.edges === 1 ? 'disc' : `orientable χ${p.chi} b${p.edges}`) : (p.chi === 0 && p.edges === 1 ? 'Möbius band' : `non-orientable χ${p.chi} b${p.edges}`);
const shapeOf = s => ({K: s.strips, L: s.len * s.n, n: s.n});

// --- The answers ------------------------------------------------------------------------------
// Dots: closed edges and whether the picture can be made. Seams: the only
// seams. Pieces: how many boards solve, of how many.
const TABLE = {
  'mobius-01': {mode: 'dots', circles: 2, possible: true, pieces: ['annulus']},
  'mobius-02': {mode: 'dots', circles: 1, possible: false, pieces: ['Möbius band']},
  'mobius-03': {mode: 'dots', circles: 4, possible: true, pieces: ['annulus', 'annulus']},
  'mobius-04': {mode: 'dots', circles: 2, possible: true, pieces: ['annulus']},
  'mobius-05': {mode: 'dots', circles: 2, possible: false, pieces: ['annulus']},
  'mobius-06': {mode: 'seams', solutions: ['RMR'], of: 8},
  'mobius-07': {mode: 'pieces', solves: 1, of: 6, pieces: ['annulus', 'Möbius band']},
  'mobius-08': {mode: 'pieces', solves: 7, of: 30},
  'mobius-09': {mode: 'dots', circles: 3, possible: false, pieces: ['annulus', 'Möbius band']},
  'mobius-10': {mode: 'seams', solutions: ['MRRM'], of: 8},
  'mobius-11': {mode: 'pieces', solves: 1, of: 12, pieces: ['annulus', 'Möbius band']},
  'mobius-12': {mode: 'pieces', solves: 2, of: 48}
};
// Random taps may solve at most this share of seam and pieces puzzles (a
// uniformly random board, or as many random moves as the fewest) and of
// Can't certificates (one to six random edge taps).
const RANDOM_BOARD = .25, RANDOM_TAPS = .25, RANDOM_CERT = .26;

const play = (p, a, ...actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next && next !== x, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, a);
const refused = (p, a, action, label) => assert.equal(move(p, a, action), null, `${p.id}: ${label}`);
const undoCarry = (p, a) => { const next = undo(a); return next === a ? a : {...next, board: mechanicFor(p).carry(p, a.board, next.board)}; };
let cpuWorst = 0;
function hintsSolve(p, a, label) {
  let steps = 0, sawReason = false;
  while (!isSolved(p, a.board)) {
    const t0 = process.cpuUsage(), h = nextHint(p, a), t = process.cpuUsage(t0);
    cpuWorst = Math.max(cpuWorst, (t.user + t.system) / 1000);
    if (h.type === 'deadend') { a = undoToSolvable(p, a); assert.ok(++steps < 60, `${p.id} ${label}: hints finish`); continue; }
    assert.equal(h.type, 'move', `${p.id} ${label}: a move hint`);
    assert.ok(typeof h.text === 'string' && h.text.length > 8, `${p.id} ${label}: hint words`);
    if (h.action.type === 'cant') { assert.ok(/closed edge/.test(h.text) && /rings/.test(h.text) && /Can’t/.test(h.text), `${p.id} ${label}: the reason comes with Can’t`); sawReason = true; }
    a = play(p, a, h.action);
    assert.ok(++steps < 60, `${p.id} ${label}: hints finish`);
  }
  if (TABLE[p.id]?.mode === 'dots' && !TABLE[p.id].possible) assert.ok(sawReason || a.board.claimed, `${p.id} ${label}: ends with the claim`);
  // Saves keep only booleans here: a solve the store can't write is lost.
  assert.equal(isSolved(p, a.board), true, `${p.id} ${label}: solved is a boolean`);
  if (steps) assert.equal(a.completed, true, `${p.id} ${label}: the attempt is completed`);
  return steps;
}
// Every segment of the band's edges (walls and cut sides), in the order the
// board offers them: by line from the bottom, then along.
function segments(s, cuts) {
  const out = [], hs = [0, ...[...cuts].sort((a, b) => a - b), s.n];
  for (let k = 0; k < s.strips; k++) hs.forEach((h, i) => {
    if (i > 0) for (let x = 0; x < s.len * s.n; x++) out.push(`${k}:${h}d:${x}`);
    if (i < hs.length - 1) for (let x = 0; x < s.len * s.n; x++) out.push(`${k}:${h}u:${x}`);
  });
  return out;
}
const binom = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };

function checkDots(p, fresh, row) {
  const q = p.parameters, B = band({...shapeOf(q), seams: q.seams, cuts: q.cuts}), segs = segments(q, q.cuts);
  assert.equal(B.circles, row.circles, `${p.id}: closed edges`);
  assert.deepEqual(B.pieces.map(kind).sort(), [...row.pieces].sort(), `${p.id}: the pieces`);
  // Every way four dots can fall on the closed edges: the picture is possible
  // exactly when one of them groups like the rings.
  let possible = false;
  const rings = desc(q.rings);
  for (let code = 0; code < B.circles ** 4; code++) {
    const count = Array(B.circles).fill(0);
    for (let d = 0, c = code; d < 4; d++, c = Math.floor(c / B.circles)) count[c % B.circles]++;
    if (same(desc(count.filter(Boolean)), rings)) possible = true;
  }
  assert.equal(possible, row.possible, `${p.id}: possible`);
  assert.equal(Boolean(p.solution.cant), !possible, `${p.id}: solution says Can’t`);
  // The mechanic agrees on dot groupings: 400 placements of four dots.
  const circleOf = new Map(segs.map(k => [k, B.segCircle(k)]));
  let seed = 7;
  const rand = m => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % m; };
  for (let t = 0; t < 400; t++) {
    const dots = [];
    while (dots.length < 4) { const k = segs[rand(segs.length)]; if (!dots.includes(k)) dots.push(k); }
    const count = new Map();
    for (const d of dots) count.set(circleOf.get(d), (count.get(circleOf.get(d)) || 0) + 1);
    const match = same(desc([...count.values()]), rings);
    assert.equal(isSolved(p, {dots, told: null, flags: [], claimed: false}), match, `${p.id}: the mechanic agrees on ${dots.join(' ')}`);
  }
  // How often four random dots (every set of four segments equally likely)
  // match a picture that can be made: the lights do this work, so it is
  // reported, not bounded.
  let randomDots = 0;
  if (possible) {
    const cs = segs.map(k => circleOf.get(k));
    let hit = 0;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) for (let k = j + 1; k < cs.length; k++) for (let l = k + 1; l < cs.length; l++) {
      const count = new Map();
      for (const c of [cs[i], cs[j], cs[k], cs[l]]) count.set(c, (count.get(c) || 0) + 1);
      if (same(desc([...count.values()]), rings)) hit++;
    }
    randomDots = hit / binom(segs.length, 4);
  }
  // The witness: the pack's dots match (or, for Can't, its taps certify).
  if (possible) assert.ok(isSolved(p, {dots: p.solution.dots, told: null, flags: [], claimed: false}), `${p.id}: witness dots`);
  // Dots: tap to place, tap again to lift, at most four.
  const four = segs.filter((_, i) => i % 3 === 0).slice(0, 4);
  let a = play(p, fresh, ...four.slice(0, 3).map(seg => ({type: 'dot', seg})));
  refused(p, a, {type: 'cant', flags: [segs[0]]}, 'Can’t before four dots');
  a = play(p, a, {type: 'dot', seg: four[0]});
  assert.equal(a.board.dots.length, 2, `${p.id}: a dot lifts`);
  refused(p, fresh, {type: 'dot', seg: '0:9u:0'}, 'a dot off the band');
  refused(p, fresh, {type: 'dot', seg: `0:0u:${q.len * q.n}`}, 'a dot past the end');
  if (!q.cuts.length) refused(p, fresh, {type: 'dot', seg: '0:2u:1'}, 'a dot on a cut that isn’t there');
  // Four dots that don't match, for the claims below: all on one closed edge
  // when the picture has more than one ring, else spread out.
  const byCircle = c => segs.filter(k => circleOf.get(k) === c);
  const wrong = rings.length > 1 ? byCircle(0).slice(0, 4) : [byCircle(0)[0], ...byCircle(B.circles > 1 ? 1 : 0).slice(1, 4)];
  let tried = play(p, fresh, ...wrong.map(seg => ({type: 'dot', seg})));
  assert.ok(!isSolved(p, tried.board), `${p.id}: four dots that don’t match`);
  refused(p, tried, {type: 'dot', seg: segs.find(k => !wrong.includes(k))}, 'no fifth dot');
  refused(p, tried, {type: 'cant', flags: []}, 'Can’t with no taps');
  refused(p, tried, {type: 'cant', flags: [segs[0], segs[0]]}, 'Can’t with a tap twice');
  refused(p, tried, {type: 'cant', flags: segs.slice(0, 7)}, 'Can’t with seven taps');
  // A certificate is one tap on each closed edge. Two on one closed edge, or
  // one missing, is refused ("Tap each closed edge once.") and Can't stays open.
  const cert = Array.from({length: B.circles}, (_, c) => byCircle(c)[c % byCircle(c).length]);
  const twice = [...cert, byCircle(0).find(k => k !== cert[0])];
  const short = cert.slice(0, -1);
  for (const [flags, label] of [[twice, 'a closed edge tapped twice'], ...(short.length ? [[short, 'a closed edge missed']] : [])]) {
    // A second refusal of the same kind leaves the board as it was.
    const r = move(p, tried, {type: 'cant', flags});
    assert.ok(r, `${p.id}: ${label} is a claim`);
    assert.equal(r.board.told, 'flags', `${p.id}: ${label} is refused`);
    assert.ok(!isSolved(p, r.board));
    tried = r;
  }
  const t2 = tried;
  if (possible) {
    // A whole certificate on a band that can do it: "There is a way.", kept
    // through Undo while the dots are the same, lifted by a dot.
    const r = play(p, t2, {type: 'cant', flags: cert});
    assert.equal(r.board.told, 'way', `${p.id}: a whole certificate on a possible picture`);
    assert.deepEqual(r.board.flags, cert, `${p.id}: the certificate stays drawn with "There is a way."`);
    refused(p, r, {type: 'cant', flags: cert}, 'no second Can’t while refused');
    const back = undoCarry(p, r);
    assert.equal(back.board.told, 'way', `${p.id}: Undo keeps "There is a way."`);
    assert.deepEqual(back.board.flags, [], `${p.id}: Undo takes back the certificate's flags, so the board changes`);
    assert.ok(validBoard(p, back.board), `${p.id}: the board after Undo is valid`);
    refused(p, back, {type: 'cant', flags: cert}, 'no Can’t after Undo');
    const moved = play(p, back, {type: 'dot', seg: wrong[3]});
    assert.equal(moved.board.told, null, `${p.id}: a dot lifts the refusal`);
    assert.equal(validBoard(p, {...r.board, told: null, flags: [], claimed: cert}), false, `${p.id}: a claim on a possible picture is forged`);
    assert.equal(validBoard(p, {...r.board, flags: twice}), false, `${p.id}: flags that aren't a certificate are forged`);
    hintsSolve(p, r, 'after "There is a way."');
    hintsSolve(p, back, 'after Undo of a refused Can’t');
  } else {
    // Every certificate claims; the claim is final.
    const r = play(p, t2, {type: 'cant', flags: [...cert].reverse()});
    assert.ok(isSolved(p, r.board) === true && r.completed === true && Array.isArray(r.board.claimed), `${p.id}: a right Can’t`);
    refused(p, r, {type: 'dot', seg: wrong[0]}, 'no move after the claim');
    assert.deepEqual(p.solution.taps.map(k => circleOf.get(k)).sort(), Array.from({length: B.circles}, (_, c) => c), `${p.id}: the pack’s taps certify`);
  }
  // Random taps: how often a certificate of m random distinct edge taps
  // passes (m from one to six, equally likely), and with m right; and the
  // first m segments in page order.
  const sizes = Array.from({length: B.circles}, (_, c) => byCircle(c).length);
  const right = sizes.reduce((m, s) => m * s, 1) / binom(segs.length, B.circles);
  const random = B.circles <= 6 ? right / 6 : 0;
  const pageOrder = [1, 2, 3, 4, 5, 6].filter(m => new Set(segs.slice(0, m).map(k => circleOf.get(k))).size === m && m === B.circles).length;
  if (!possible) assert.ok(random <= RANDOM_CERT, `${p.id}: random taps pass the certificate ${random.toFixed(3)} of the time`);
  // Forged saves.
  const b = fresh.board, t2b = t2.board;
  const forged = [
    {...b, extra: 1},
    {...b, dots: [segs[0], segs[0]]},
    {...b, dots: segs.slice(0, 5)},
    {...b, dots: ['0:9u:0']},
    {...b, told: 'yes'},
    {...b, claimed: true},
    {...b, claimed: cert},
    {...t2b, told: null, claimed: twice},
    {...t2b, told: 'flags', claimed: cert},
    {...b, told: 'flags'},
    {...b, told: 'way'},
    {...t2b, dots: t2b.dots.slice(0, 3), told: 'way'},
    {...b, flags: 'x'},
    {...b, flags: cert},
    {...t2b, told: 'flags', flags: cert},
    {...t2b, told: null, flags: cert},
    {...t2b, told: null, flags: [], claimed: cert, extra: true},
    ...(possible ? [{...b, dots: p.solution.dots, told: 'flags'}] : [{...t2b, told: 'way'}])
  ];
  forged.forEach((f, i) => assert.equal(validBoard(p, f), false, `${p.id}: forged save ${i} refused`));
  refused(p, fresh, {type: 'seam', k: 0}, 'the seam is fixed here');
  refused(p, fresh, {type: 'cut', h: 1}, 'no cutting here');
  const steps = hintsSolve(p, fresh, 'from fresh') + hintsSolve(p, t2, 'after a wrong Can’t') + hintsSolve(p, play(p, fresh, {type: 'dot', seg: wrong[0]}, {type: 'dot', seg: wrong[1]}), 'after wrong dots');
  return {steps, closedEdges: B.circles, certificateRandom: Number(random.toFixed(4)), certificatePageOrder: pageOrder > 0, segments: segs.length, ...(possible ? {randomDots: Number(randomDots.toFixed(4))} : {})};
}

// Every seam choice the free seams allow.
function seamChoices(start, fixed) {
  let out = [[]];
  start.forEach((m, k) => { out = out.flatMap(c => fixed[k] ? [[...c, m]] : [[...c, 'M'], [...c, 'R']]); });
  return out;
}
// The share of m-move random walks (each legal move equally likely) that
// pass through a solve, by exact enumeration.
function randomWalk(start, movesOf, isGoal, m) {
  let total = 0;
  const go = (b, depth, pr) => {
    if (isGoal(b)) { total += pr; return; }
    if (depth === m) return;
    const moves = movesOf(b);
    for (const next of moves) go(next, depth + 1, pr / moves.length);
  };
  go(start, 0, 1);
  return total;
}

function checkSeams(p, fresh, row) {
  const q = p.parameters, sh = shapeOf(q), choices = seamChoices(q.start, q.fixed);
  const meets = seams => {
    const B = band({...sh, seams});
    const c = q.marks.map(m => B.segCircle(`${m.k}:${m.top ? q.n : 0}${m.top ? 'd' : 'u'}:${m.x}`));
    return q.marks.every((m, i) => q.marks.every((m2, j) => (m.kind === m2.kind) === (c[i] === c[j])));
  };
  const sols = choices.filter(meets).map(s => s.join(''));
  assert.deepEqual(sols, row.solutions, `${p.id}: the only seams`);
  assert.equal(choices.length, row.of, `${p.id}: seam choices`);
  for (const seams of choices) assert.equal(isSolved(p, {seams}), meets(seams), `${p.id}: the mechanic agrees on ${seams.join('')}`);
  assert.equal(p.solution.seams.join(''), sols[0]);
  // Fewest changes, and random taps.
  const dist = s => s.filter((m, k) => m !== q.start[k]).length, fewest = dist(sols[0].split(''));
  assert.equal(p.solution.fewest, fewest, `${p.id}: fewest changes`);
  assert.ok(fewest >= 2, `${p.id}: more than one change`);
  const share = sols.length / choices.length;
  const walk = randomWalk(q.start, s => s.flatMap((m, k) => q.fixed[k] ? [] : [s.map((x, i) => i === k ? (x === 'M' ? 'R' : 'M') : x)]), meets, fewest);
  assert.ok(share <= RANDOM_BOARD && walk <= RANDOM_TAPS, `${p.id}: random seams solve ${share} of boards, random taps ${walk.toFixed(3)}`);
  // The start doesn't meet the goal on parity alone: the start's parity is
  // the answer's, or a single change of parity doesn't solve it.
  const oneChange = choices.filter(s => dist(s) === 1);
  assert.ok(oneChange.every(s => !meets(s)), `${p.id}: no single change solves it`);
  // Witness as moves; illegal moves; forged saves.
  let a = fresh;
  q.start.forEach((m, k) => { if (m !== sols[0][k]) a = play(p, a, {type: 'seam', k}); });
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  q.fixed.forEach((fx, k) => { if (fx) refused(p, fresh, {type: 'seam', k}, `seam ${k + 1} is fixed`); });
  refused(p, fresh, {type: 'seam', k: q.start.length}, 'no such seam');
  refused(p, fresh, {type: 'cut', h: 1}, 'no cuts here');
  refused(p, fresh, {type: 'dot', seg: '0:0u:0'}, 'no dots here');
  const forged = [{seams: q.start.slice(1)}, {seams: q.start.map(() => 'X')}, {...fresh.board, extra: 1}, ...q.fixed.map((fx, k) => fx ? {seams: q.start.map((m, i) => i === k ? (m === 'M' ? 'R' : 'M') : m)} : null).filter(Boolean)];
  forged.forEach((f, i) => assert.equal(validBoard(p, f), false, `${p.id}: forged save ${i} refused`));
  const free = q.fixed.indexOf(false), wrongMove = {type: 'seam', k: q.start.findIndex((m, k) => !q.fixed[k] && m === sols[0][k])};
  const steps = hintsSolve(p, fresh, 'from fresh') + hintsSolve(p, play(p, fresh, wrongMove.k >= 0 ? wrongMove : {type: 'seam', k: free}), 'after a wrong move');
  return {steps, randomBoard: share, randomTaps: Number(walk.toFixed(4)), fewest};
}

// Every board of a pieces puzzle or a playground shape: each seam choice,
// each set of cut curves (a cut on an R band runs on round to n - h), each
// set of holes within the budget.
function subsets(list) { return list.reduce((acc, x) => [...acc, ...acc.map(s => [...s, x])], [[]]); }
function allBoards(shape) {
  const s = {...shape, lines: shape.lines || [], spots: shape.spots || []}, out = [];
  for (const seams of seamChoices(s.start, s.fixed)) {
    const curves = s.strips === 1 && seams[0] === 'R' ? s.lines.filter(h => h <= s.n - h).map(h => [...new Set([h, s.n - h])]) : s.lines.map(h => [h]);
    for (const cs of subsets(curves)) for (const holes of subsets(s.spots.map((_, i) => i))) {
      if (s.budget && holes.length > s.budget) continue;
      out.push({seams, cuts: cs.flat().sort((a, b) => a - b), holes});
    }
  }
  return out;
}
const edgeMemo = new Map();
const edgesOf = (s, b) => {
  const key = JSON.stringify([s.strips, s.len, s.n, s.spots, b.seams, b.cuts, b.holes]);
  if (!edgeMemo.has(key)) edgeMemo.set(key, band({...shapeOf(s), seams: b.seams, cuts: b.cuts, spots: s.spots, holes: b.holes}).edgeList);
  return edgeMemo.get(key);
};

function checkPieces(p, fresh, row) {
  const q = p.parameters, boards = allBoards(q), goal = desc(q.goal);
  const solves = boards.filter(b => same(edgesOf(q, b), goal));
  assert.equal(boards.length, row.of, `${p.id}: boards`);
  assert.equal(solves.length, row.solves, `${p.id}: solving boards`);
  for (const b of boards) assert.equal(isSolved(p, b), same(edgesOf(q, b), goal), `${p.id}: the mechanic agrees on ${JSON.stringify(b)}`);
  assert.deepEqual(p.solution.boards.map(b => JSON.stringify(b)).sort(), solves.map(b => JSON.stringify(b)).sort(), `${p.id}: the pack’s solving boards`);
  if (row.pieces) for (const b of solves) assert.deepEqual(band({...shapeOf(q), seams: b.seams, cuts: b.cuts}).pieces.map(kind).sort(), [...row.pieces].sort(), `${p.id}: the pieces are ${row.pieces.join(' and ')}`);
  // Moves: change a free seam (not while cut), cut or tape a curve, punch or
  // fill a hole within the budget. Fewest moves and random taps.
  const movesOf = b => {
    const out = [];
    if (!b.cuts.length) q.fixed.forEach((fx, k) => { if (!fx) out.push({...b, seams: b.seams.map((m, i) => i === k ? (m === 'M' ? 'R' : 'M') : m)}); });
    const curves = b.seams[0] === 'R' ? q.lines.filter(h => h <= q.n - h).map(h => [...new Set([h, q.n - h])]) : q.lines.map(h => [h]);
    for (const c of curves) out.push({...b, cuts: c.every(h => b.cuts.includes(h)) ? b.cuts.filter(h => !c.includes(h)) : [...b.cuts, ...c].sort((x, y) => x - y)});
    q.spots.forEach((_, i) => { if (b.holes.includes(i)) out.push({...b, holes: b.holes.filter(x => x !== i)}); else if (!q.budget || b.holes.length < q.budget) out.push({...b, holes: [...b.holes, i].sort((x, y) => x - y)}); });
    return out;
  };
  const start = {seams: q.start, cuts: [], holes: []}, key = b => JSON.stringify(b), isGoal = b => same(edgesOf(q, b), goal);
  const dist = new Map([[key(start), 0]]), queue = [start];
  for (let i = 0; i < queue.length; i++) for (const next of movesOf(queue[i])) if (!dist.has(key(next))) { dist.set(key(next), dist.get(key(queue[i])) + 1); queue.push(next); }
  assert.equal(dist.size, boards.length, `${p.id}: every board can be reached`);
  const fewest = Math.min(...solves.map(b => dist.get(key(b))));
  assert.equal(p.solution.fewest, fewest, `${p.id}: fewest moves`);
  const share = solves.length / boards.length, walk = randomWalk(start, movesOf, isGoal, fewest);
  assert.ok(share <= RANDOM_BOARD && walk <= RANDOM_TAPS, `${p.id}: random boards solve ${share.toFixed(3)}, random taps ${walk.toFixed(3)}`);
  if (q.budget) assert.ok(Math.min(...solves.map(b => b.holes.length)) < q.budget, `${p.id}: the budget is more than the fewest holes`);
  // The witness as moves, in a different order from the hints: holes first.
  const w = solves[0];
  let a = fresh;
  for (const i of w.holes) a = play(p, a, {type: 'hole', i});
  if (w.seams[0] !== q.start[0]) a = play(p, a, {type: 'seam', k: 0});
  for (const h of w.cuts.filter(h => h <= q.n - h || w.seams[0] === 'M')) if (!a.board.cuts.includes(h)) a = play(p, a, {type: 'cut', h});
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  // Illegal moves.
  if (q.lines.length) {
    const cut = play(p, fresh, {type: 'cut', h: q.lines[0]});
    refused(p, cut, {type: 'seam', k: 0}, 'no seam change while cut');
    const taped = play(p, cut, {type: 'cut', h: q.lines[0]});
    assert.deepEqual(taped.board.cuts, [], `${p.id}: a cut tapes back`);
    play(p, taped, {type: 'seam', k: 0});
  }
  refused(p, fresh, {type: 'cut', h: q.n}, 'an edge is not a line');
  refused(p, fresh, {type: 'hole', i: q.spots.length}, 'no such spot');
  refused(p, fresh, {type: 'dot', seg: '0:0u:0'}, 'no dots here');
  refused(p, fresh, {type: 'seam', k: 1}, 'no second seam');
  if (q.budget) {
    const full = play(p, fresh, ...Array.from({length: q.budget}, (_, i) => ({type: 'hole', i})));
    refused(p, full, {type: 'hole', i: q.budget}, 'no hole past the budget');
  }
  // Forged saves.
  const b = fresh.board;
  const forged = [
    {...b, extra: 1},
    {...b, cuts: [q.n]},
    {...b, cuts: q.lines.length > 1 ? [...q.lines].reverse() : [1.5]},
    {...b, holes: [q.spots.length]},
    {...b, holes: [0, 0]},
    {...b, seams: ['X']},
    {...b, seams: ['M', 'M']},
    ...(q.lines.length > 1 && q.lines.some(h => h !== q.n - h) ? [{...b, seams: ['R'], cuts: [q.lines.find(h => h !== q.n - h)]}] : []),
    ...(q.budget ? [{...b, holes: q.spots.map((_, i) => i).slice(0, q.budget + 1)}] : [])
  ];
  forged.forEach((f, i) => assert.equal(validBoard(p, f), false, `${p.id}: forged save ${i} refused`));
  // Hints from fresh and after a wrong move: one that leaves the band no
  // nearer a solve (moves are toggles, so distances from the solves are
  // distances to them).
  const toGoal = new Map(solves.map(b => [key(b), 0])), q2 = [...solves];
  for (let i = 0; i < q2.length; i++) for (const next of movesOf(q2[i])) if (!toGoal.has(key(next))) { toGoal.set(key(next), toGoal.get(key(q2[i])) + 1); q2.push(next); }
  const actions = [...q.lines.map(h => ({type: 'cut', h})), ...q.spots.map((_, i) => ({type: 'hole', i})), {type: 'seam', k: 0}];
  const wrongAction = actions.find(action => { const next = move(p, fresh, action); return next && toGoal.get(key(next.board)) >= toGoal.get(key(start)); });
  assert.ok(wrongAction, `${p.id}: a wrong first move exists`);
  const wrong = play(p, fresh, wrongAction);
  const steps = hintsSolve(p, fresh, 'from fresh') + hintsSolve(p, wrong, 'after a wrong move');
  return {steps, randomBoard: Number(share.toFixed(4)), randomTaps: Number(walk.toFixed(4)), fewest};
}

function checkPlayground(p, fresh) {
  const q = p.parameters, M = mechanicFor(p);
  assert.equal(M.noHint(p), true, 'the playground has no Hint');
  let boards = 0;
  for (const [id, s] of Object.entries(q.shapes)) {
    const a = id === fresh.board.shape ? fresh : play(p, fresh, {type: 'shape', id});
    for (const b of allBoards({...s, budget: null})) {
      const board = {shape: id, ...b};
      assert.ok(validBoard(p, board), `${id}: ${JSON.stringify(b)} is a playground board`);
      assert.equal(isSolved(p, board), false, 'the playground is never solved');
      assert.deepEqual(topologyOf(q, board).sorted, edgesOf({...s, spots: s.spots || []}, b), `${id} ${JSON.stringify(b)}: the mechanic’s pieces and closed edges`);
      boards++;
    }
    // The parity rule on this shape: one closed edge exactly when an odd number of seams are R.
    for (const seams of seamChoices(s.start, s.fixed)) {
      const B = band({...shapeOf(s), seams}), odd = seams.filter(m => m === 'R').length % 2 === 1;
      assert.equal(B.circles, odd ? 1 : 2, `${id} ${seams.join('')}: closed edges`);
      assert.equal(B.pieces[0].orientable, !odd, `${id} ${seams.join('')}: one-sided exactly when odd`);
    }
    refused(p, a, {type: 'shape', id}, 'the same shape again');
  }
  refused(p, fresh, {type: 'shape', id: 'nowhere'}, 'no such shape');
  for (const f of [{...fresh.board, shape: 'nowhere'}, {...fresh.board, seams: ['M', 'M']}, {...fresh.board, extra: 1}, {shape: 'four', seams: ['M', 'M', 'M', 'M'], cuts: [1], holes: []}]) assert.equal(validBoard(p, f), false, 'a forged playground save');
  return boards;
}

// The parity rule for every circle of one to six strips, and the carried
// arrow: two closed edges and two-sided exactly when the number of R seams is
// even; a cut down the middle splits A in two and leaves B in one piece.
function checkParity() {
  let words = 0;
  for (let K = 1; K <= 6; K++) for (let code = 0; code < 2 ** K; code++) {
    const seams = Array.from({length: K}, (_, k) => (code >> k) & 1 ? 'R' : 'M'), odd = seams.filter(m => m === 'R').length % 2 === 1;
    const B = band({K, L: 1, n: 2, seams});
    assert.equal(B.circles, odd ? 1 : 2, `${seams.join('')}: closed edges`);
    assert.equal(B.pieces[0].orientable, !odd, `${seams.join('')}: the arrow comes back flipped exactly when odd`);
    assert.equal(B.pieces[0].chi, 0);
    words++;
  }
  assert.deepEqual(band({K: 1, L: 2, n: 2, seams: ['M'], cuts: [1]}).pieces.map(kind), ['annulus', 'annulus'], 'A cut down the middle');
  assert.deepEqual(band({K: 1, L: 2, n: 2, seams: ['R'], cuts: [1]}).pieces.map(kind), ['annulus'], 'B cut down the middle');
  assert.deepEqual(band({K: 1, L: 2, n: 3, seams: ['R'], cuts: [1, 2]}).pieces.map(kind).sort(), ['annulus', 'Möbius band'].sort(), 'B cut in thirds');
  assert.deepEqual(band({K: 1, L: 2, n: 4, seams: ['R'], cuts: [1, 2, 3]}).pieces.map(kind), ['annulus', 'annulus'], 'bonus 4R: two annuli');
  return words;
}

export async function validateMobius() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/mobius/mobius.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-38')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-38.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'mobius');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  const parityWords = checkParity();
  const report = {mobiusPuzzles: puzzles.length, parityWords, hintSteps: 0, random: {}, playgroundBoards: 0};
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'mobius');
    assert.ok(p.id.startsWith('mobius-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 4, `${p.id}: ${field}`);
    assert.ok(/^A (band|circle of strips) is /.test(p.controls), `${p.id}: How to play opens with the definition`);
    assert.ok(/Week 38/.test(p.provenance), `${p.id}: provenance names the worksheet`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok((p.visibleObjective.match(/[.?!]/g) || []).length <= 1, `${p.id}: at most one sentence on the board`);
    assert.ok(!/how many|predict|guess/i.test(p.visibleObjective + p.objective + p.title), `${p.id}: no prediction or counting quiz`);
    assert.ok(!/can’t|cannot|impossible|one edge|two edges|möbius/i.test(p.title + p.visibleObjective), `${p.id}: the title and goal don’t give the answer away`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    assert.ok(!/press can’t|that’s all/i.test(p.hints[0]), `${p.id}: the first hint is not a claim`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (p.parameters.mode === 'playground') { report.playgroundBoards = checkPlayground(p, fresh); continue; }
    assert.equal(nextHint(p, fresh).type, 'move', `${p.id}: a first hint`);
    assert.notEqual(nextHint(p, fresh).action.type, 'cant', `${p.id}: never Can’t first`);
    const row = TABLE[p.id];
    assert.equal(p.parameters.mode, row.mode, `${p.id}: kind`);
    const r = row.mode === 'dots' ? checkDots(p, fresh, row) : row.mode === 'seams' ? checkSeams(p, fresh, row) : checkPieces(p, fresh, row);
    report.hintSteps += r.steps;
    const {steps, ...rest} = r;
    report.random[p.id] = rest;
  }
  assert.ok(cpuWorst < 150, `the slowest hint took ${cpuWorst.toFixed(1)} ms of CPU`);
  report.slowestHintCpuMs = Number(cpuWorst.toFixed(1));
  return report;
}

export default validateMobius;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateMobius(), null, 2));
