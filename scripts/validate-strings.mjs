// Checks the Circle strings pack (dist/families/strings/strings.json). Every
// answer is recomputed by methods unlike the mechanic's: all perfect
// matchings by brute force with an interleaving test (the mechanic splits
// region by region), regions by a separation test (the mechanic walks round
// region edges), the one pairing for a path and for a tree by searching every
// pairing, the one tree for a walk by searching every parents list, and swap
// distances by breadth-first search. Then: the theorems behind each claim
// (Catalan counts to 12 dots, the even-region test for every partial pairing
// of 8 and 10 dots, neighbours in every pairing), every Can't tap on every
// partial attempt of the impossible puzzles, witnesses played as moves, hint
// chains from fresh, after wrong moves, refused claims, a wrong That's all and
// random play, hint texts against what they name, illegal moves, forged saves
// and the playground. Run: node scripts/validate-strings.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import * as S from '../dist/families/strings/strings.js';
import {loadPack} from './packs.mjs';

// --- Independent methods -----------------------------------------------------------
// Every perfect matching of a list of points (crossing or not).
function matchings(points) {
  if (!points.length) return [[]];
  const [a, ...rest] = points, out = [];
  rest.forEach((b, i) => { for (const m of matchings(rest.filter((_, j) => j !== i))) out.push([[a, b], ...m]); });
  return out;
}
const range = n => Array.from({length: n}, (_, i) => i + 1);
const inside = (x, [a, b]) => a < x && x < b;
// Two strings interleave when exactly one end of one lies strictly inside the other.
const interleave = (s, t) => inside(t[0], s) !== inside(t[1], s);
const noncrossing = m => m.every((s, i) => m.every((t, j) => j <= i || !interleave(s, t)));
const key = m => m.map(([a, b]) => a < b ? [a, b] : [b, a]).sort((x, y) => x[0] - y[0]).map(s => s.join('-')).join(' ');
const isNeighbour = (n, [a, b]) => Math.abs(a - b) === 1 || Math.abs(a - b) === n - 1;
const matchCache = new Map();
const noncrossingOf = n => { if (!matchCache.has(n)) matchCache.set(n, matchings(range(n)).filter(noncrossing).map(m => m.map(s => [...s].sort((x, y) => x - y)))); return matchCache.get(n); };
const contains = (m, fixed) => fixed.every(f => m.some(s => s[0] === f[0] && s[1] === f[1]));
// The free dots in the same region as a point x (a dot, or g + 0.5 for gap g):
// those no string separates from it.
const separated = (x, y, strings) => strings.some(s => inside(x, s) !== inside(y, s));
const regionFree = (n, strings, x) => { const used = new Set(strings.flat()); return range(n).filter(d => !used.has(d) && !separated(x, d, strings)); };
const gapPoint = g => g + 0.5;
// Paths and trees.
const codeOfPairing = (n, m) => range(n).map(d => { const s = m.find(t => t.includes(d)); return s[0] === d ? 'U' : 'D'; }).join('');
// The tree of strings: a string's parent is the shortest string around it.
function treeShape(m) {
  const parent = s => m.filter(t => inside(s[0], t)).sort((x, y) => (x[1] - x[0]) - (y[1] - y[0]))[0] || null;
  const kids = t => m.filter(s => parent(s) === t).sort((x, y) => x[0] - y[0]);
  const shape = t => `(${kids(t).map(shape).join('')})`;
  return shape(null);
}
const walkOfShape = shape => shape.slice(1, -1).replace(/\(/g, 'U').replace(/\)/g, 'D');
function parentsShape(parents) {
  const kids = v => parents.map((p, i) => p === v ? i + 1 : -1).filter(k => k >= 0);
  const shape = v => `(${kids(v).map(shape).join('')})`;
  return shape(0);
}
function allParents(k) {
  if (k === 0) return [[]];
  return allParents(k - 1).flatMap(ps => range(k).map(p => [...ps, p - 1]));
}
// Breadth-first search over swaps that keep a path off the floor.
const dyck = w => { let h = 0; for (const c of w) { h += c === 'U' ? 1 : -1; if (h < 0) return false; } return h === 0; };
const swapNext = w => { const out = []; for (let i = 1; i < w.length; i++) if (w[i - 1] !== w[i]) { const v = w.slice(0, i - 1) + w[i] + w[i - 1] + w.slice(i + 1); if (dyck(v)) out.push(v); } return out; };
function bfs(from) {
  const dist = new Map([[from, 0]]), queue = [from];
  while (queue.length) { const w = queue.shift(); for (const v of swapNext(w)) if (!dist.has(v)) { dist.set(v, dist.get(w) + 1); queue.push(v); } }
  return dist;
}
const dyckWords = len => { const out = []; const go = (w, h, u) => { if (w.length === len) { if (h === 0) out.push(w); return; } if (u < len / 2) go(w + 'U', h + 1, u + 1); if (h > 0) go(w + 'D', h - 1, u); }; go('', 0, 0); return out; };
const inversions = w => { let n = 0; for (let i = 0; i < w.length; i++) for (let j = i + 1; j < w.length; j++) if (w[i] === 'D' && w[j] === 'U') n++; return n; };

// The table in docs/strings/README.md.
const TABLE = {
  'strings-01': {mode: 'every', count: 5},
  'strings-02': {mode: 'finish', ways: 2},
  'strings-03': {mode: 'finish', ways: 0, attempt: [[2, 3]], gap: 1},
  'strings-04': {mode: 'decode', pairing: '1-6 2-3 4-5'},
  'strings-05': {mode: 'finish', ways: 0, attempt: [[2, 3]], gap: 3},
  'strings-06': {mode: 'every', count: 4},
  'strings-07': {mode: 'neighbours', attempt: [[1, 3]], cert: [1, 3]},
  'strings-08': {mode: 'tree', shape: '((()()()))'},
  'strings-09': {mode: 'swaps', best: 6},
  'strings-10': {mode: 'every', count: 14},
  'strings-11': {mode: 'treepair', pairing: '1-6 2-3 4-5 7-10 8-9'},
  'strings-12': {mode: 'swaps', best: 6}
};

// --- Playing --------------------------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const layAll = (p, a, strings) => strings.reduce((b, s) => play(p, b, {type: 'lay', s}), a);
let slowest = 0;
// A hint in under 100 ms. A slow reading is timed again on copies of the
// puzzle under new ids (so the remembered hint is not reused), and the
// fastest counts: a garbage-collection pause is not the hint's own time.
function timedHint(p, a) {
  const time = q => { const t = performance.now(); nextHint(q, a); return performance.now() - t; };
  const t = performance.now(), h = nextHint(p, a);
  let took = performance.now() - t;
  for (let k = 0; took >= 50 && k < 3; k++) took = Math.min(took, time({...p, id: `${p.id}-timing-${k}-${Math.random()}`}));
  slowest = Math.max(slowest, took);
  assert.ok(took < 100, `${p.id}: a hint in under 100 ms (${took.toFixed(1)})`);
  assert.equal(nextHint(p, a), h, `${p.id}: hints are remembered`);
  return h;
}
// Follow the hints to a solve; check each one as it goes.
function hintsSolve(p, a, label) {
  const q = p.parameters;
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 120; steps++) {
    const h = timedHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: hint text`);
    checkHintText(p, a.board, h);
    // A hint after a move shows at level 1 too, so it never names a claim
    // button: level 2 marks the button instead.
    assert.ok(!/Press (Can’t|That’s all)/.test(h.text), `${p.id} ${label}: no hint text says to press a claim button (${h.text})`);
    if (h.action.type === 'cant') {
      assert.ok(a.board.strings.length > 0, `${p.id} ${label}: Can’t is hinted only after an attempt`);
      assert.ok(!/Press|Can’t|tap/i.test(h.text.replace(/can’t join/, '')), `${p.id} ${label}: the Can’t hint gives the reason only (${h.text})`);
    }
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  if (q.mode === 'swaps') assert.equal(a.board.route.length, S.swapDistance(q.start, q.target), `${p.id} ${label}: in the fewest swaps`);
  return steps;
}
// Hint texts say what the move does, and the reasons they give are true.
function checkHintText(p, b, h) {
  const q = p.parameters, a = h.action;
  if (a.type === 'lay') assert.equal(h.text, `Join ${a.s[0]} and ${a.s[1]}.`);
  if (a.type === 'cut') { const s = b.strings.find(t => t.includes(a.dot)); assert.equal(h.text, `Take off the string from ${s[0]} to ${s[1]}.`); }
  if (a.type === 'all') assert.equal(h.text, 'Every pairing is on the shelf.');
  if (a.type === 'swap') assert.match(h.text, new RegExp(`^Swap steps ${a.at} and ${a.at + 1}( back)?\\.$`));
  if (a.type === 'cant' && q.mode === 'finish') {
    const fixed = q.fixed, whole = regionFree(q.n, fixed, gapPoint(a.gap)), here = regionFree(q.n, [...fixed, ...b.strings], gapPoint(a.gap));
    const named = !fixed.length ? `There are ${['', '', '', 'three', '', 'five', '', 'seven', '', 'nine', '', 'eleven'][q.n]} dots` : whole.length === 1 ? `Dot ${whole[0]} can’t join` : `Dots ${S.listWords(whole.map(String))} can only join each other`;
    assert.ok(h.text.startsWith(named), `${p.id}: the Can’t hint names the trapped dots (${h.text})`);
    const beside = h.dot;
    assert.ok(here.includes(beside), `${p.id}: the Can’t hint marks a free dot of the tapped part (${h.text}, dot ${beside})`);
    assert.equal(S.regionOf(q.n, [...fixed, ...b.strings], beside).gaps.includes(a.gap), true, `${p.id}: the dot named lies on the part the hint taps`);
    assert.ok(here.length % 2 === 1 && whole.length % 2 === 1, `${p.id}: the hinted part is odd inside an odd part of the dark strings`);
  }
  if (a.type === 'cant' && q.mode === 'neighbours') {
    const [lo, hi] = a.s, inner = range(q.n).filter(d => inside(d, a.s)), outer = range(q.n).filter(d => d !== lo && d !== hi && !inside(d, a.s));
    const side = [inner, outer].find(sd => !b.strings.some(t => sd.includes(t[0])) && (sd.length % 2 === 1 || sd.length === 2));
    assert.ok(side, `${p.id}: the hinted string has a stuck side`);
    const named = h.text.match(/^Dots? ([\d, and]+?) (is|are) alone/)?.[1].split(/, | and /).map(Number).sort((x, y) => x - y);
    assert.deepEqual(named, side, `${p.id}: the neighbours hint names the stuck dots (${h.text})`);
    if (side.length === 2) assert.ok(isNeighbour(q.n, side), `${p.id}: two stuck dots are neighbours`);
  }
  if (a.type === 'grow' || a.type === 'prune') {
    // The step named walks up to the node the hint acts on (or its parent).
    const walk = S.walkOf(S.treeOfParents(b.parents)), k = Number(h.text.match(/step (\d+)/)?.[1]);
    if (a.type === 'grow' && a.at === 0) assert.match(h.text, /^Give the root an?(other)? child\.$/);
    else {
      assert.equal(walk[k - 1], 'U', `${p.id}: step ${k} walks up`);
      // Node ids in the order the walk first reaches them.
      const order = [], go = v => b.parents.forEach((par, i) => { if (par === v) { order.push(i + 1); go(i + 1); } });
      go(0);
      const node = order[walk.slice(0, k).split('U').length - 2];
      assert.equal(node, a.type === 'grow' ? a.at : a.node, `${p.id}: “${h.text}” names the dot acted on`);
    }
  }
}
// Every legal action from a board, for random play.
function actions(p, b) {
  const q = p.parameters, n = q.mode === 'playground' ? b.n : q.n, out = [];
  if (['finish', 'every', 'neighbours', 'decode', 'treepair', 'playground'].includes(q.mode)) {
    for (let x = 1; x <= n; x++) for (let y = x + 1; y <= n; y++) out.push({type: 'lay', s: [x, y]});
    for (let d = 1; d <= n; d++) out.push({type: 'cut', dot: d});
  }
  if (q.mode === 'finish') for (let g = 1; g <= n; g++) out.push({type: 'cant', gap: g});
  if (q.mode === 'neighbours') for (const s of b.strings) out.push({type: 'cant', s});
  if (q.mode === 'every') out.push({type: 'all'});
  if (q.mode === 'tree') { for (let v = 0; v <= b.parents.length; v++) out.push({type: 'grow', at: v}); for (let v = 1; v <= b.parents.length; v++) out.push({type: 'prune', node: v}); }
  if (q.mode === 'swaps') for (let i = 1; i < q.start.length; i++) out.push({type: 'swap', at: i});
  return out;
}
let seed = 12;
const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
function randomPlay(p, a, steps) {
  for (let k = 0; k < steps; k++) {
    const legal = actions(p, a.board).map(x => [x, move(p, a, x)]).filter(([, next]) => next && next !== a && !isSolved(p, next.board));
    if (!legal.length) break;
    a = legal[Math.floor(random() * legal.length)][1];
  }
  return a;
}

// --- The theorems ----------------------------------------------------------------------
function checkTheorems() {
  const CATALAN = [1, 1, 2, 5, 14, 42, 132];
  for (let n = 2; n <= 12; n += 2) {
    const all = noncrossingOf(n);
    assert.equal(all.length, CATALAN[n / 2], `${n} dots: ${CATALAN[n / 2]} pairings`);
    assert.deepEqual(S.pairings(n).map(c => S.keyOf(c)), all.map(key).sort(), `${n} dots: the mechanic lists the same pairings`);
    // Each path from exactly one pairing, and the tree's walk is the same path.
    const codes = all.map(m => codeOfPairing(n, m));
    assert.equal(new Set(codes).size, all.length, `${n} dots: different pairings, different paths`);
    assert.deepEqual([...new Set(codes)].sort(), dyckWords(n).sort(), `${n} dots: the paths are exactly those that stay off the floor`);
    for (const m of all) {
      const code = codeOfPairing(n, m);
      assert.equal(walkOfShape(treeShape(m)), code, `${n} dots: the tree's walk is the path`);
      assert.equal(S.keyOf(S.pairingOfWord(code)), key(m), 'the stack rule gives the pairing back');
      assert.equal(S.walkOf(S.treeOfStrings(m)), code, 'the mechanic’s tree walks the same path');
      // Every pairing joins two neighbours.
      assert.ok(m.some(s => isNeighbour(n, s)), `${n} dots: ${key(m)} joins neighbours`);
    }
  }
  assert.equal(matchings(range(8)).filter(m => !noncrossing(m) && !m.some(s => isNeighbour(8, s))).length, 31, 'eight dots: 31 crossing pairings avoid neighbours (the card’s count)');
  // Odd numbers of dots: no pairing.
  for (const n of [3, 5, 7, 9]) assert.equal(S.completions(n, []).length, 0, `${n} dots: none`);
  // The even-region test, for every partial set of strings on 8 and 10 dots:
  // the mechanic's completions match brute force, finishable exactly when every
  // region has an even number of free dots, and trapCheck matches separation.
  let partials = 0, taps = 0;
  for (const n of [8, 10]) {
    const all = noncrossingOf(n), seen = new Set();
    for (const m of all) for (let mask = 0; mask < 1 << m.length; mask++) {
      const fixed = m.filter((_, i) => mask & 1 << i), k = key(fixed);
      if (seen.has(k)) continue;
      seen.add(k); partials++;
      const brute = all.filter(x => contains(x, fixed)).map(key).sort();
      assert.deepEqual(S.completions(n, fixed).map(c => key([...fixed, ...c])).sort(), brute, `${n} dots, ${k}: completions`);
      const free = S.freeDots(n, fixed), even = free.every(d => regionFree(n, fixed, d).length % 2 === 0);
      assert.equal(brute.length > 0, even, `${n} dots, ${k}: finishable exactly when every region is even`);
    }
    // Partial pairings that are not parts of a full one (odd regions).
    for (const m of matchings(range(n)).slice(0, 400)) for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) {
      const two = [m[i], m[j]].map(s => [...s].sort((x, y) => x - y));
      if (!noncrossing(two)) continue;
      for (const [fixed, mine] of [[[two[0]], [two[1]]], [[], two], [two, []]]) for (let g = 1; g <= n; g++) {
        const here = regionFree(n, [...fixed, ...mine], gapPoint(g)), whole = regionFree(n, fixed, gapPoint(g));
        assert.equal(S.trapCheck(n, fixed, mine, g).ok, here.length % 2 === 1 && whole.length % 2 === 1, `${n} dots: trap test at gap ${g}`);
        taps++;
      }
    }
  }
  // Swaps: the D-before-U count is the distance to the mountain, half the
  // summed height gap the distance between any two paths.
  for (const len of [4, 6, 8, 10]) {
    const words = dyckWords(len), top = S.mountainOf(len), fromTop = bfs(top);
    for (const w of words) {
      assert.equal(fromTop.get(w), inversions(w), `${w}: swaps to the mountain`);
      assert.equal(S.dBeforeU(w), inversions(w));
      const d = bfs(w);
      for (const v of words) assert.equal(S.swapDistance(w, v), d.get(v), `${w} to ${v}`);
    }
  }
  return {partialPairingsChecked: partials, trapTapsChecked: taps};
}

// --- Each puzzle -------------------------------------------------------------------------
export async function validateStrings() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/strings/strings.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-12')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-12.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'strings');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  const theorems = checkTheorems();

  let hintSteps = 0, claimsChecked = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'strings');
    assert.ok(p.id.startsWith('strings-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    // The card's false guide hint stays out; no first hint says Press Can't;
    // no count of answers or fewest swaps is shown before the solve.
    const copy = JSON.stringify(p);
    assert.ok(!/single numbered dot|only the partners/i.test(copy), `${p.id}: no single-dot duplicate test`);
    assert.ok(!/Press Can’t/.test(p.hints[0]) && !/Can’t/.test(p.hints[0]), `${p.id}: the first hint leads to an attempt`);
    for (const text of [p.title, p.visibleObjective, p.hints[0]]) assert.ok(!/\b(5|14|42|six swaps|6 swaps|fourteen|five pairings)\b/.test(text), `${p.id}: no answer in “${text}”`);
    const q = p.parameters, fresh = freshAttempt(p);
    S.stringsMechanics.strings.reset(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    assert.equal(nextHint(p, fresh).type, 'move', `${p.id}: a first hint`);
    assert.notEqual(nextHint(p, fresh).action.type, 'cant', `${p.id}: the first hint is not Can’t`);

    const row = TABLE[p.id];
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    if (q.mode === 'every' || q.mode === 'finish') {
      const brute = noncrossingOf(q.n).filter(m => contains(m, q.fixed)).map(key).sort();
      if (q.mode === 'every') { assert.equal(brute.length, row.count, `${p.id}: ${row.count} pairings by brute force`); hintSteps += checkEvery(p, fresh, brute); }
      else { assert.equal(brute.length, row.ways, `${p.id}: ${row.ways} ways by brute force`); const r = checkFinish(p, fresh, brute, row); hintSteps += r.steps; claimsChecked += r.claims; }
    }
    if (q.mode === 'neighbours') { const r = checkNeighbours(p, fresh, row); hintSteps += r.steps; claimsChecked += r.claims; }
    if (q.mode === 'decode' || q.mode === 'treepair') {
      const matches = noncrossingOf(q.n).filter(m => q.mode === 'decode' ? codeOfPairing(q.n, m) === q.word : walkOfShape(treeShape(m)) === q.word);
      assert.deepEqual(matches.map(key), [row.pairing], `${p.id}: exactly one pairing, by search`);
      const a = layAll(p, fresh, S.fromKey(row.pairing));
      assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
      // A wrong string first: the hints take it off.
      const wrong = actions(p, fresh.board).find(x => x.type === 'lay' && !S.fromKey(row.pairing).some(s => s[0] === x.s[0] && s[1] === x.s[1]) && move(p, fresh, x));
      const b = play(p, fresh, wrong);
      assert.equal(nextHint(p, b).action.type, 'cut', `${p.id}: after a wrong string the hint takes it off`);
      hintSteps += hintsSolve(p, b, 'after a wrong string');
      checkStringRefusals(p, fresh);
    }
    if (q.mode === 'tree') {
      const k = q.word.length / 2, shapes = allParents(k).filter(ps => walkOfShape(parentsShape(ps)) === q.word).map(parentsShape);
      assert.ok(shapes.length && shapes.every(s => s === row.shape), `${p.id}: one tree for the walk, by search`);
      assert.equal(parentsShape(p.solution.parents), row.shape, `${p.id}: the witness tree`);
      let a = p.solution.parents.reduce((x, at) => play(p, x, {type: 'grow', at}), fresh);
      assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
      const wrong = play(p, play(p, fresh, {type: 'grow', at: 0}), {type: 'grow', at: 0});
      assert.equal(nextHint(p, wrong).action.type, 'prune', `${p.id}: after a wrong child the hint takes it away`);
      hintSteps += hintsSolve(p, wrong, 'after a wrong child');
      checkTreeRefusals(p, fresh);
    }
    if (q.mode === 'swaps') hintSteps += checkSwaps(p, fresh, row);
    hintSteps += hintsSolve(p, fresh, 'from fresh');
    for (let k = 0; k < 25; k++) hintSteps += hintsSolve(p, randomPlay(p, fresh, 1 + k % 9), `after random play ${k}`);
    checkForged(p, fresh);
  }
  return {stringsPuzzles: puzzles.length, ...theorems, claimsChecked, hintSteps, slowestHintMs: Number(slowest.toFixed(1))};
}

function checkEvery(p, fresh, brute) {
  const q = p.parameters;
  let a = fresh, steps = 0;
  const mine = k => S.fromKey(k).filter(s => !q.fixed.some(t => t[0] === s[0] && t[1] === s[1]));
  for (const [i, k] of brute.entries()) {
    for (const s of a.board.strings.slice()) a = play(p, a, {type: 'cut', dot: s[0]});
    a = layAll(p, a, mine(k));
    assert.deepEqual(a.board.found, brute.slice(0, i + 1), `${p.id}: a pairing goes on the shelf`);
    if (i === 0) {
      let again = play(p, a, {type: 'cut', dot: mine(k)[0][0]});
      again = play(p, again, {type: 'lay', s: mine(k)[0]});
      assert.deepEqual(again.board.told, {kind: 'again', key: k}, `${p.id}: found already`);
      assert.deepEqual(again.board.found, a.board.found);
      // Undo keeps the shelf.
      const back = undo(again), carried = {...back, board: S.stringsMechanics.strings.carry(p, again.board, back.board)};
      assert.ok(validBoard(p, carried.board) && carried.board.found.length === 1, `${p.id}: Undo keeps the shelf`);
    }
    if (i < brute.length - 1) assert.ok(!isSolved(p, a.board));
  }
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board), `${p.id}: That’s all after every pairing`);
  // That's all too early: there is another, locked until a new pairing.
  const early = play(p, fresh, {type: 'all'});
  assert.deepEqual(early.board.told, {kind: 'more'}, `${p.id}: there is another`);
  refuse(p, early, {type: 'all'}, 'That’s all again before a new pairing');
  const back = undo(early), carried = {...back, board: S.stringsMechanics.strings.carry(p, early.board, back.board)};
  assert.deepEqual(carried.board.told, {kind: 'more'}, `${p.id}: Undo keeps “there is another”`);
  steps += hintsSolve(p, early, 'after a wrong That’s all');
  // One short of all, That's all is still wrong.
  let most = fresh;
  for (const k of brute.slice(0, -1)) { for (const s of most.board.strings.slice()) most = play(p, most, {type: 'cut', dot: s[0]}); most = layAll(p, most, mine(k)); }
  const short = play(p, most, {type: 'all'});
  assert.deepEqual(short.board.told, {kind: 'more'}, `${p.id}: one short is not all`);
  steps += hintsSolve(p, short, 'one short of all');
  checkStringRefusals(p, fresh);
  return steps;
}

function checkFinish(p, fresh, brute, row) {
  const q = p.parameters;
  let steps = 0, claims = 0;
  refuse(p, fresh, {type: 'cant', gap: 1}, 'Can’t before any string');
  if (brute.length) {
    const a = layAll(p, fresh, S.fromKey(brute[0]).filter(s => !q.fixed.some(t => t[0] === s[0] && t[1] === s[1])));
    assert.ok(isSolved(p, a.board), `${p.id}: a finished pairing solves`);
    // A string in no finished pairing: the hint takes it off.
    const wrong = actions(p, fresh.board).find(x => x.type === 'lay' && move(p, fresh, x) && !brute.some(k => S.fromKey(k).some(s => s[0] === x.s[0] && s[1] === x.s[1])));
    assert.ok(wrong, `${p.id}: a string that leads nowhere`);
    const b = play(p, fresh, wrong);
    assert.equal(nextHint(p, b).action.type, 'cut', `${p.id}: the hint takes off a string that leads nowhere`);
    steps += hintsSolve(p, b, 'after a wrong string');
    // Every Can't tap is refused, and the refusal holds through Undo.
    for (let g = 1; g <= q.n; g++) {
      const c = play(p, b, {type: 'cant', gap: g});
      assert.equal(c.board.refused, g, `${p.id}: Can’t at gap ${g} is refused`);
      assert.ok(!isSolved(p, c.board));
      refuse(p, c, {type: 'cant', gap: g === 1 ? 2 : 1}, 'a second Can’t with the same strings');
      claims++;
    }
    const c = play(p, b, {type: 'cant', gap: 1});
    // On a board that can be finished the refusal says only that, and it
    // stays through Undo while the strings are the same.
    const M = S.stringsMechanics.strings;
    assert.match(M.render(p, c), /<p class="st-told">There is a way\.<\/p>/, `${p.id}: a refused Can’t says there is a way`);
    const back = undo(c), carried = M.carry(p, c.board, back.board);
    assert.equal(carried.refused, 1, `${p.id}: Undo keeps the refusal`);
    assert.match(M.render(p, {...back, board: carried}), /There is a way\./, `${p.id}: the refusal is still shown after Undo`);
    steps += hintsSolve(p, c, 'after a refused Can’t');
    return {steps, claims};
  }
  // Impossible: the witness attempt and claim.
  let a = layAll(p, fresh, row.attempt);
  a = play(p, a, {type: 'cant', gap: row.gap});
  assert.ok(isSolved(p, a.board), `${p.id}: the witness claim is kept`);
  // Every partial attempt (up to three strings) and every tap: kept exactly
  // when the separation test finds an odd part inside an odd part of the dark
  // strings; a refused claim holds through Undo with the same strings.
  const lays = actions(p, fresh.board).filter(x => x.type === 'lay').map(x => x.s);
  const attempts = [[]];
  for (let size = 1; size <= 3; size++) for (const base of attempts.filter(x => x.length === size - 1)) for (const s of lays) {
    if (base.length && (s[0] < base.at(-1)[0])) continue;
    const t = [...base, s];
    if (S.goodStrings(q.n, t) && t.every(x => !q.fixed.some(f => interleave(x, f)) && !q.fixed.flat().some(d => x.includes(d)))) attempts.push(t);
  }
  for (const t of attempts.slice(1)) {
    const at = layAll(p, fresh, t);
    for (let g = 1; g <= q.n; g++) {
      const here = regionFree(q.n, [...q.fixed, ...t], gapPoint(g)), whole = regionFree(q.n, q.fixed, gapPoint(g)), ok = here.length % 2 === 1 && whole.length % 2 === 1;
      const c = play(p, at, {type: 'cant', gap: g});
      assert.equal(isSolved(p, c.board), ok, `${p.id}: ${S.keyOf(t)} Can’t at gap ${g}`);
      if (!ok) {
        assert.equal(c.board.refused, g);
        const back = undo(c), carried = S.stringsMechanics.strings.carry(p, c.board, back.board);
        assert.equal(carried.refused, g, `${p.id}: Undo keeps a refused Can’t`);
        refuse(p, {...back, board: carried}, {type: 'cant', gap: g}, 'Can’t again after Undo');
      }
      claims++;
    }
  }
  // A refused claim, then the hints: they lay a new string before Can't.
  const tryOne = layAll(p, fresh, [row.attempt[0]]);
  const g = range(q.n).find(x => !S.trapCheck(q.n, q.fixed, [row.attempt[0]], x).ok);
  const refused = play(p, tryOne, {type: 'cant', gap: g});
  assert.notEqual(nextHint(p, refused).action.type, 'cant', `${p.id}: after a refused Can’t the hint makes a new attempt`);
  steps += hintsSolve(p, refused, 'after a refused Can’t');
  checkStringRefusals(p, fresh);
  // The child's own strings can trap dots where the dark strings leave an even
  // number: that is refused, on a made-up circle of nine with 1–6 dark.
  const own = {...p, id: 'strings-own-trap', parameters: {mode: 'finish', n: 9, fixed: [[1, 6]]}};
  S.stringsMechanics.strings.reset(own);
  const o = layAll(own, freshAttempt(own), [[2, 4]]);
  const gap3 = play(own, o, {type: 'cant', gap: 2});
  assert.equal(gap3.board.refused, 2, 'own trap refused');
  assert.equal(S.trapCheck(9, [[1, 6]], [[2, 4]], 2).why, 'own');
  steps += hintsSolve(own, gap3, 'after an own trap');
  return {steps, claims};
}

function checkNeighbours(p, fresh, row) {
  const q = p.parameters, n = q.n;
  let steps = 0, claims = 0;
  // No pairing avoids neighbours, by brute force.
  assert.equal(noncrossingOf(n).filter(m => !m.some(s => isNeighbour(n, s))).length, 0, `${p.id}: every pairing joins neighbours`);
  refuse(p, fresh, {type: 'cant', s: [1, 3]}, 'Can’t before any string');
  refuse(p, fresh, {type: 'lay', s: [1, 2]}, 'neighbours');
  refuse(p, fresh, {type: 'lay', s: [1, n]}, 'neighbours across the top');
  let a = layAll(p, fresh, row.attempt);
  a = play(p, a, {type: 'cant', s: row.cert});
  assert.ok(isSolved(p, a.board), `${p.id}: the witness claim is kept`);
  // Every partial attempt without neighbours: every tapped string is kept
  // exactly when one side has no strings and its dots are odd in number or
  // two; a kept side really can't be paired; the refusal says why truly.
  const lays = actions(p, fresh.board).filter(x => x.type === 'lay' && !isNeighbour(n, x.s)).map(x => x.s);
  let frontier = [[]];
  const seen = new Set();
  while (frontier.length) {
    const next = [];
    for (const t of frontier) for (const s of lays) {
      const u = [...t, s].sort((x, y) => x[0] - y[0]), k = key(u);
      if (seen.has(k) || !S.goodStrings(n, u) || u.length > 4) continue;
      seen.add(k); next.push(u);
    }
    frontier = next;
  }
  for (const k of seen) {
    const t = S.fromKey(k), at = layAll(p, fresh, t);
    for (const s of t) {
      const sides = [range(n).filter(d => inside(d, s)), range(n).filter(d => !s.includes(d) && !inside(d, s))];
      const stuck = sides.filter(sd => !t.some(x => sd.includes(x[0])) && (sd.length % 2 === 1 || sd.length === 2));
      const c = play(p, at, {type: 'cant', s});
      assert.equal(isSolved(p, c.board), stuck.length > 0, `${p.id}: ${k} Can’t on ${s}`);
      for (const sd of stuck) assert.equal(matchings(sd).filter(m => noncrossing(m) && !m.some(x => isNeighbour(n, x))).length, 0, `${p.id}: a stuck side can't be paired`);
      if (!stuck.length) {
        const text = S.neighbourRefusal(n, t, s);
        if (text === 'It has strings on both sides.') assert.ok(sides.every(sd => t.some(x => sd.includes(x[0]))), `${p.id}: ${k}: strings on both sides of ${s}`);
        else assert.ok(sides.some(sd => !t.some(x => sd.includes(x[0])) && sd.some((x, i) => sd.slice(i + 2).some(y => !isNeighbour(n, [x, y])))), `${p.id}: ${k}: a string can still go beside ${s}`);
        const back = undo(c), carried = S.stringsMechanics.strings.carry(p, c.board, back.board);
        assert.deepEqual(carried.refused, s, `${p.id}: Undo keeps a refused Can’t`);
        refuse(p, {...back, board: carried}, {type: 'cant', s}, 'Can’t again after Undo');
      }
      claims++;
    }
    if (t.length) steps += hintsSolve(p, at, `from ${k}`);
  }
  // After a refused claim the hint lays a string before Can't again.
  const wide = layAll(p, fresh, [[1, 6]]);
  const refused = play(p, wide, {type: 'cant', s: [1, 6]});
  assert.equal(refused.board.refused[0], 1, `${p.id}: 1–6 with four dots each side is refused`);
  assert.equal(S.neighbourRefusal(n, [[1, 6]], [1, 6]), 'A string can still go beside it.');
  assert.equal(nextHint(p, refused).action.type, 'lay', `${p.id}: after a refused Can’t the hint lays a string`);
  steps += hintsSolve(p, refused, 'after a refused Can’t');
  checkStringRefusals(p, fresh);
  return {steps, claims};
}

function checkSwaps(p, fresh, row) {
  const q = p.parameters;
  let steps = 0;
  const d = bfs(q.start);
  assert.equal(d.get(q.target), row.best, `${p.id}: ${row.best} swaps by breadth-first search`);
  assert.equal(S.swapDistance(q.start, q.target), row.best);
  if (q.target === S.mountainOf(q.target.length)) assert.equal(inversions(q.start), row.best, `${p.id}: the D-before-U count`);
  let a = p.solution.route.reduce((x, at) => play(p, x, {type: 'swap', at}), fresh);
  assert.ok(isSolved(p, a.board), `${p.id}: the witness route solves`);
  // A swap away from the target: the hint takes it back. Reaching the target
  // the long way is not a solve, and the hints still finish.
  // The first route (by breadth) whose last swap leaves the fewest routes.
  let wrongRoute = null;
  for (let queue = [[]]; queue.length && !wrongRoute;) {
    const r = queue.shift(), w = S.replay(q.start, r);
    for (const c of S.corners(w)) {
      if (c.at === r.at(-1)) continue;
      const next = [...r, c.at];
      if (next.length + S.swapDistance(S.swapAt(w, c.at), q.target) > row.best) { wrongRoute = next; break; }
      queue.push(next);
    }
  }
  const away = {at: wrongRoute.at(-1)};
  const b = wrongRoute.reduce((x, at) => play(p, x, {type: 'swap', at}), fresh);
  const h = nextHint(p, b);
  assert.deepEqual(h.action, {type: 'swap', at: away.at}, `${p.id}: after a wrong swap the hint takes it back`);
  assert.equal(h.text, `Swap steps ${away.at} and ${away.at + 1} back.`);
  steps += hintsSolve(p, b, 'after a wrong swap');
  // The long way: a wrong swap, a different swap, then the fewest route from there.
  const other = S.corners(S.replay(q.start, b.board.route)).find(c => c.at !== away.at);
  let long = play(p, b, {type: 'swap', at: other.at});
  let w = S.replay(q.start, long.board.route), guard = 0;
  while (w !== q.target && guard++ < 40) {
    const ht = S.heights(q.target), c = S.corners(w).find(c => (c.kind === 'valley' && c.h < ht[c.at]) || (c.kind === 'peak' && c.h > ht[c.at]));
    if (c.at === long.board.route.at(-1)) break;
    long = play(p, long, {type: 'swap', at: c.at}); w = S.swapAt(w, c.at);
  }
  assert.equal(w, q.target, `${p.id}: the long way reaches the target`);
  {
    assert.ok(!isSolved(p, long.board) && long.board.route.length > row.best, `${p.id}: the target the long way is not a solve`);
    assert.equal(nextHint(p, long).action.at, long.board.route.at(-1), `${p.id}: at the target the long way, the hint takes back a swap`);
    steps += hintsSolve(p, long, 'after the long way');
  }
  for (const [action, why] of [[{type: 'swap', at: 0}, 'a corner before step 1'], [{type: 'swap', at: q.start.length}, 'a corner after the last step'], [{type: 'swap', at: '1'}, 'a corner named by a string'], [{type: 'lay', s: [1, 2]}, 'a string']]) refuse(p, fresh, action, why);
  const flat = q.start.indexOf('UD') + 1;
  if (flat && S.heights(q.start)[flat] === 1) refuse(p, fresh, {type: 'swap', at: flat}, 'a peak at height 1 (it would go below the line)');
  const same = q.start.indexOf('UU') + 1;
  if (same) refuse(p, fresh, {type: 'swap', at: same}, 'two steps the same way');
  return steps;
}

function checkStringRefusals(p, fresh) {
  const q = p.parameters, n = q.n, fixed = q.fixed || [];
  for (const [action, why] of [[null, 'nothing'], ['lay', 'a string'], [{type: 'lay'}, 'no dots'], [{type: 'lay', s: [1, 1]}, 'a dot to itself'], [{type: 'lay', s: [0, 2]}, 'dot 0'], [{type: 'lay', s: [1, n + 1]}, 'a dot past the last'], [{type: 'lay', s: ['1', '3']}, 'dots named by strings'], [{type: 'cut', dot: 1}, 'cutting where there is no string of yours'], [{type: 'grow', at: 0}, 'growing a tree'], [{type: 'swap', at: 1}, 'a swap'], [{type: 'fly'}, 'an unknown move']]) refuse(p, fresh, action, why);
  if (q.mode !== 'every') refuse(p, fresh, {type: 'all'}, 'That’s all');
  if (q.mode !== 'finish' && q.mode !== 'neighbours') refuse(p, fresh, {type: 'cant', gap: 1}, 'Can’t');
  for (const f of fixed) { refuse(p, fresh, {type: 'cut', dot: f[0]}, 'cutting a dark string'); const other = range(n).find(d => !fixed.flat().includes(d)); refuse(p, fresh, {type: 'lay', s: [f[0], other].sort((x, y) => x - y)}, 'a string on a dark dot'); }
  // A crossing, wherever one can be made.
  const first = actions(p, fresh.board).find(x => x.type === 'lay' && move(p, fresh, x) && x.s[1] - x.s[0] >= 2);
  if (first) {
    const a = play(p, fresh, first), [x, y] = first.s;
    const cross = actions(p, a.board).find(z => z.type === 'lay' && z.s.every(d => !a.board.strings.flat().includes(d) && !fixed.flat().includes(d)) && interleave(first.s, z.s));
    if (cross) { refuse(p, a, cross, `a string crossing ${x}–${y}`); assert.equal(S.layProblem(q, a.board, cross.s).why, 'cross'); }
    refuse(p, a, {type: 'lay', s: [x, range(n).find(d => d !== x && d !== y && !fixed.flat().includes(d) && !a.board.strings.flat().includes(d))].sort((u, v) => u - v)}, 'a second string on a dot');
  }
}

function checkTreeRefusals(p, fresh) {
  for (const [action, why] of [[{type: 'grow', at: 1}, 'a child of a node not there'], [{type: 'grow', at: -1}, 'a negative node'], [{type: 'prune', node: 0}, 'taking away the root'], [{type: 'prune', node: 1}, 'taking away a node not there'], [{type: 'lay', s: [1, 2]}, 'a string'], [{type: 'grow', at: '0'}, 'a node named by a string']]) refuse(p, fresh, action, why);
  const cap = Math.min(S.MAX_EDGES, p.parameters.word.length / 2 + 2);
  let a = fresh;
  for (let k = 0; k < cap; k++) a = play(p, a, {type: 'grow', at: k});
  refuse(p, a, {type: 'grow', at: 0}, 'a tree past its size');
  const cut = play(p, a, {type: 'prune', node: 2});
  assert.deepEqual(cut.board.parents, [0], `${p.id}: taking away an edge takes everything below it`);
}

function checkForged(p, fresh) {
  const q = p.parameters, B = fresh.board, n = q.n;
  const forged = [[{...B, extra: 1}, 'an unknown field'], [null, 'nothing'], [[], 'a list']];
  const circle = ['finish', 'every', 'neighbours', 'decode', 'treepair'].includes(q.mode);
  if (circle) {
    const free = S.freeDots(n, q.fixed || []);
    forged.push(
      [{...B, strings: [[free[0], free[2]], [free[1], free[3]]]}, 'crossing strings'],
      [{...B, strings: [[free[0], free[1]], [free[1], free[2]]]}, 'two strings on a dot'],
      [{...B, strings: [[free[1], free[0]]]}, 'a string written backwards'],
      [{...B, strings: [[0, free[1]]]}, 'dot 0'],
      [{...B, strings: [[free[0], n + 1]]}, 'a dot past the last'],
      [{...B, strings: 'none'}, 'strings that are not a list']
    );
    for (const f of q.fixed || []) forged.push([{...B, strings: [[...f]]}, 'a dark string as the child’s'], [{...B, strings: [[f[0], free.find(d => d > f[0]) || n]].map(s => s.sort((x, y) => x - y))}, 'a string on a dark dot']);
  }
  if (q.mode === 'finish') {
    const lone = [S.freeDots(n, q.fixed)[0], S.freeDots(n, q.fixed)[1]];
    forged.push([{...B, claimed: 1}, 'a claim with no strings'], [{...B, refused: 1}, 'a refusal with no strings'], [{...B, strings: [lone], claimed: 1, refused: 1}, 'a claim both kept and refused']);
    const good = range(n).find(g => S.trapCheck(n, q.fixed, [lone], g).ok), bad = range(n).find(g => !S.trapCheck(n, q.fixed, [lone], g).ok);
    if (bad) forged.push([{...B, strings: [lone], claimed: bad}, 'a kept claim on a part that is not trapped']);
    if (good) forged.push([{...B, strings: [lone], refused: good}, 'a refusal of a trapped part']);
    forged.push([{...B, strings: [lone], refused: n + 1}, 'a refusal off the circle'], [{...B, strings: [lone], claimed: '1'}, 'a claim named by a string']);
  }
  if (q.mode === 'neighbours') forged.push([{...B, strings: [[1, 2]]}, 'neighbours'], [{...B, strings: [[1, 3]], claimed: [1, 4]}, 'a claim on a string not laid'], [{...B, strings: [[1, 6]], claimed: [1, 6]}, 'a kept claim that is not stuck'], [{...B, strings: [[1, 3]], refused: [1, 3]}, 'a refusal of a stuck string'], [{...B, claimed: [1, 3]}, 'a claim with no strings']);
  if (q.mode === 'every') {
    const ks = S.completions(n, q.fixed).map(c => S.keyOf([...q.fixed, ...c]));
    const notOne = S.keyOf([...q.fixed, ...S.freeDots(n, q.fixed).reduce((acc, d, i, list) => i % 2 ? acc : [...acc, [d, list[i + 1]]], [])]);
    forged.push(
      [{...B, found: ['1-2 3-5 4-6']}, 'a found pairing that crosses'],
      [{...B, found: [ks[0], ks[0]]}, 'a pairing found twice'],
      [{...B, done: true}, 'That’s all before every pairing'],
      [{...B, found: ks, told: {kind: 'more'}}, '“there is another” when none is'],
      [{...B, told: {kind: 'again', key: ks[0]}}, '“found already” for a pairing not found'],
      [{...B, found: [ks[0]], told: {kind: 'again', key: ks[0]}}, '“found already” with the strings elsewhere'],
      [{...B, strings: S.fromKey(ks[0]).filter(s => !q.fixed.some(t => t[0] === s[0] && t[1] === s[1]))}, 'a finished pairing not on the shelf'],
      [{...B, done: 'yes'}, 'a done flag that is not true or false'],
      [{...B, told: {kind: 'more', extra: 1}}, 'a told note with extra fields'],
      [{...B, found: 'all'}, 'a shelf that is not a list']
    );
    if (!ks.includes(notOne)) forged.push([{...B, found: [notOne]}, 'a found pairing that is not one']);
  }
  if (q.mode === 'tree') forged.push([{parents: [1]}, 'a node hanging from itself'], [{parents: [0, 5]}, 'a node hanging from a later one'], [{parents: Array(11).fill(0)}, 'a tree past its size'], [{parents: [0.5]}, 'a parent that is not a whole number'], [{parents: 'root'}, 'parents that are not a list']);
  if (q.mode === 'swaps') {
    const peak = q.start.indexOf('UD') + 1;
    forged.push([{route: [0]}, 'a corner before step 1'], [{route: [q.start.indexOf('UU') + 1 || 99]}, 'two steps the same way'], [{route: Array(41).fill(0).map((_, i) => p.solution.route[i % 2])}, 'a route past 40 swaps'], [{route: 'all'}, 'a route that is not a list']);
    if (S.heights(q.start)[peak] === 1) forged.push([{route: [peak]}, 'a path below the line']);
    const v = S.corners(q.start).find(c => c.kind === 'valley');
    if (v) forged.push([{route: [v.at, v.at]}, 'the same corner twice in a row']);
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

function checkPlayground(p, fresh) {
  const m = mechanicFor(p);
  assert.equal(m.noHint(p), true, `${p.id}: no Hint`);
  assert.equal(nextHint(p, fresh).type, 'done', `${p.id}: no hints`);
  assert.equal(fresh.board.n, 6);
  let a = layAll(p, fresh, [[1, 4], [2, 3], [5, 6]]);
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  refuse(p, a, {type: 'lay', s: [1, 4]}, 'a dot already strung');
  a = play(p, a, {type: 'cut', dot: 5});
  refuse(p, play(p, fresh, {type: 'lay', s: [1, 3]}), {type: 'lay', s: [2, 4]}, 'a crossing');
  const big = play(p, a, {type: 'size', n: 12});
  assert.equal(big.board.n, 12);
  const small = play(p, a, {type: 'size', n: 3});
  assert.deepEqual(small.board.strings, [[2, 3]], `${p.id}: fewer dots drop the strings past the last dot`);
  refuse(p, a, {type: 'size', n: 13}, 'more than 12 dots');
  refuse(p, a, {type: 'size', n: 1}, 'fewer than 2 dots');
  refuse(p, a, {type: 'size', n: 6}, 'the same number of dots');
  assert.deepEqual(play(p, a, {type: 'clear'}).board.strings, []);
  refuse(p, fresh, {type: 'clear'}, 'clearing nothing');
  refuse(p, fresh, {type: 'cant', gap: 1}, 'Can’t in the playground');
  refuse(p, fresh, {type: 'all'}, 'That’s all in the playground');
  // Neighbours are allowed in the playground.
  play(p, fresh, {type: 'lay', s: [1, 2]});
  for (const [board, why] of [[{n: 13, strings: []}, 'more than 12 dots'], [{n: 1, strings: []}, 'one dot'], [{n: 6, strings: [[1, 7]]}, 'a dot past the last'], [{n: 6, strings: [[1, 3], [2, 4]]}, 'a crossing'], [{n: 6, strings: [], found: []}, 'an unknown field'], [{n: '6', strings: []}, 'a number of dots named by a string']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}
export default validateStrings;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateStrings(), null, 2));
