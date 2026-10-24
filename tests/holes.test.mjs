// Holes (dist/families/holes/holes.js), the group in Lantern Wires: tiles
// that flip their three wires, loops round holes and empty triangles, Can't
// with the face that keeps a loop lit, schedules where the first loop must
// go out with the marked tile, races between a yellow and a pink loop,
// refusals and their lock through Undo, hints (quick, and never Can't
// first), rendering, saves and the satchel.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {boardOf, facesInside, startLit, litAfter, certificates, canGoDark, replaySchedule, raceSets, canRace, replayRace, raceRefusal, simpleLoop, spanningTree, edgesOf, maskOf, placeArea, internals} from '../dist/families/holes/holes.js';
import holesModule from '../dist/families/holes/holes.js';
import validateHoles from '../scripts/validate-holes.mjs';
import {loadPack} from '../scripts/packs.mjs';

const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const P = n => byId(`holes-${String(n).padStart(2, '0')}`);
const mine = puzzles.filter(p => p.mechanic === 'holes');
const hooks = holesModule.mechanics.holes;
const html = (p, a) => mechanicFor(p).render(p, a);
const play = (p, a, actions) => actions.reduce((x, t) => { const next = move(p, x, t); assert.ok(next, `${p.id}: ${JSON.stringify(t)}`); return next; }, a);
const undoInApp = (p, a) => { const next = undo(a); return {...next, board: hooks.carry(p, a.board, next.board)}; };
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const wireOf = (p, a, b) => boardOf(p.parameters).m.index.get(a < b ? `${a},${b}` : `${b},${a}`);

test('the pack validates by sums of outlines, ray casting and searches over every choice', async () => {
  const report = await validateHoles();
  assert.equal(report.puzzles, 12);
  assert.ok(report.loopsChecked > 50);
  assert.ok(report.refusals > 50 && report.forgeries > 100);
  assert.deepEqual(report.firstWires, ['holes-09 3/6', 'holes-10 11/19']);
});

test('boards: triangles, a hole, wires and the faces each loop goes round', () => {
  const ring = boardOf(P(4).parameters), strip = boardOf(P(2).parameters), square = boardOf(P(1).parameters);
  assert.deepEqual([ring.T, ring.E, ring.V, ring.holes.length], [18, 36, 18, 1]);
  assert.deepEqual([strip.T, strip.E, strip.holes.length], [6, 13, 0]);
  assert.deepEqual([square.T, square.E], [2, 5]);
  assert.equal(ring.holes[0].edges.length, 6, 'a hexagonal hole');
  // The hole's rim goes round the hole alone; a triangle's sides round it.
  assert.deepEqual(facesInside(ring, maskOf(ring, ring.holes[0].edges)), [18]);
  assert.deepEqual(facesInside(ring, maskOf(ring, ring.m.cellEdges[5])), [5]);
  // Wires with an odd number at a dot are no loop.
  assert.equal(facesInside(ring, maskOf(ring, [ring.m.cellEdges[5][0]])), null);
  assert.ok(simpleLoop(ring, maskOf(ring, ring.holes[0].edges)));
  assert.ok(spanningTree(boardOf(P(9).parameters), maskOf(boardOf(P(9).parameters), edgesOf(boardOf(P(9).parameters), P(9).parameters.start))));
});

test('a tap flips the tile’s three wires; an empty triangle can’t be tapped', () => {
  const p = P(1), a = play(p, freshAttempt(p), [{tile: 0}]);
  const lit = litAfter(p, a.board.taps), B = boardOf(p.parameters);
  const diagonal = wireOf(p, 0, 3);
  assert.equal(lit[diagonal], 1, 'the diagonal lights');
  assert.deepEqual(facesInside(B, lit), [1], 'the loop now goes round the other half');
  assert.ok(isSolved(p, play(p, a, [{tile: 1}]).board), 'both halves: every wire dark');
  const back = play(p, a, [{tile: 0}]);
  assert.deepEqual(facesInside(B, litAfter(p, back.board.taps)), [0, 1], 'a second tap flips the wires back');
  assert.equal(move(P(2), freshAttempt(P(2)), {tile: 5}), null, 'triangle 6 has no tile');
});

test('which loops can go dark: every face inside a tile, or the face that keeps it lit', () => {
  const answers = mine.filter(p => p.parameters.kind === 'cancel').map(p => canGoDark(p) ? 'dark' : certificates(p).join());
  assert.deepEqual(answers, ['dark', 'dark', '2', '18', 'dark', 'dark', '6', '6']);
  // Tapping tiles never changes the faces that keep a loop lit.
  for (const p of [P(4), P(7), P(8)]) {
    const B = boardOf(p.parameters), want = certificates(p);
    let taps = [];
    for (const t of p.parameters.filled.slice(0, 9)) { taps = [...taps, t]; assert.deepEqual(facesInside(B, litAfter(p, taps)).filter(f => !p.parameters.filled.includes(f)), want, p.id); }
  }
  // In Star the hole is crossed twice: outside.
  assert.ok(!facesInside(boardOf(P(6).parameters), startLit(P(6))).includes(18));
});

test('Can’t: only after a tap; the right face solves and shows the reason; a wrong one is refused and locks Can’t through Undo', () => {
  const p = P(4), fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {cant: 18}), null, 'no claim on a fresh board');
  assert.match(html(p, fresh), /class="secondary hl-tool hl-cant"[^>]*aria-pressed="false" disabled/);
  const tried = play(p, fresh, [{tile: 2}]);
  const right = move(p, tried, {cant: 18});
  assert.ok(isSolved(p, right.board));
  assert.match(html(p, right), /class="hl-shade over-hole"/, 'the faces inside are shaded');
  assert.match(html(p, right), /class="hl-ring"/, 'the hole is ringed');
  assert.match(html(p, right), /The hole stays inside the loop, so it can’t go dark\./);
  const wrong = move(p, tried, {cant: 5});
  assert.deepEqual(wrong.board.refused, {face: 5, shown: true});
  assert.match(html(p, wrong), /<p class="hl-note">That one doesn’t keep it lit\.<\/p>/);
  assert.match(html(p, wrong), /hl-cant"[^>]*disabled/, 'Can’t is off after a refusal');
  assert.equal(move(p, wrong, {cant: 18}), null);
  const back = undoInApp(p, wrong);
  assert.deepEqual(back.board, {taps: [2], cant: null, refused: {face: 5, shown: false}}, 'Undo keeps the lock');
  assert.notEqual(html(p, back), html(p, wrong), 'and Undo changes what is on screen: the note goes');
  assert.equal(move(p, back, {cant: 18}), null);
  const again = play(p, back, [{tile: 3}]);
  assert.equal(again.board.refused, null, 'a tap reopens Can’t');
  assert.ok(isSolved(p, move(p, again, {cant: 18}).board));
  // The refusal says the same of a wrong face on every board.
  for (const q of mine.filter(x => x.parameters.kind === 'cancel')) {
    const a = play(q, freshAttempt(q), [{tile: q.parameters.filled[0]}]);
    const face = [...Array(boardOf(q.parameters).F).keys()].find(f => !certificates(q).includes(f));
    assert.ok(html(q, move(q, a, {cant: face})).includes('That one doesn’t keep it lit.'), q.id);
  }
});

test('schedules: the first wire closes and lights a loop; tiles need three wires; the loop goes out with its last tile', () => {
  const p = P(9), B = boardOf(p.parameters), fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {tile: 0}), null, 'no tile before its three wires');
  // The rim has its gap at the left end; each wire across the strip closes a
  // loop round the triangles to its right.
  const gap = wireOf(p, 0, 4), three = wireOf(p, 6, 1), small = wireOf(p, 7, 2);
  assert.deepEqual(facesInside(B, replaySchedule(p, [{edge: gap}]).saved), [0, 1, 2, 3, 4, 5], 'the gap closes the whole rim');
  assert.deepEqual(replaySchedule(p, [{edge: wireOf(p, 5, 0)}]).inside, [1, 2, 3, 4, 5], 'the wire nearest the gap closes a loop round five');
  assert.deepEqual(replaySchedule(p, [{edge: three}]).inside, [3, 4, 5]);
  assert.deepEqual(replaySchedule(p, [{edge: small}]).inside, [5]);
  // Fill the small loop's own tile first: it goes out too soon.
  const soon = play(p, fresh, [{edge: small}, {tile: 5}]);
  assert.equal(replaySchedule(p, soon.board.steps).out, 1);
  assert.deepEqual(nextHint(p, soon), {type: 'deadend', text: 'It went out too soon. Undo.'});
  assert.match(html(p, soon), /class="hl-out"/, 'a loop that went out leaves a trace');
  // The loop round three triangles, filled in any order, goes out with tile 3.
  const win = play(p, fresh, [{edge: three}, {edge: wireOf(p, 6, 2)}, {edge: small}, {tile: 5}, {tile: 3}, {tile: 4}]);
  assert.ok(isSolved(p, win.board));
  // The rim needs six tiles, so it is still lit at the marked third.
  const across = [[5, 0], [5, 1], [6, 1], [6, 2], [7, 2]].map(([a, b]) => ({edge: wireOf(p, a, b)}));
  const lit = play(p, fresh, [{edge: gap}, ...across, {tile: 0}, {tile: 1}, {tile: 2}]);
  assert.deepEqual(nextHint(p, lit), {type: 'deadend', text: 'It is still lit. Undo.'});
  assert.equal(move(p, lit, {tile: 3}), null, 'nothing after the marked tile');
  // Before the board shows it, a doomed first wire leaves no line under the board.
  assert.deepEqual(nextHint(p, play(p, fresh, [{edge: gap}])), {type: 'deadend', text: ''});
  assert.deepEqual(nextHint(p, play(p, fresh, [{edge: wireOf(p, 5, 1)}])), {type: 'deadend', text: ''}, 'a loop round four needs four tiles');
  // Screen readers hear which triangles are ready, not which are inside.
  assert.doesNotMatch(html(p, play(p, fresh, [{edge: three}, {edge: wireOf(p, 6, 2)}])), /inside/);
  const track = html(p, win);
  assert.equal((track.match(/<li class="hl-slot/g) || []).length, 3, 'an outline for each tile up to the marked one');
  assert.match(track, /hl-slot filled target out/);
});

test('a loop round the hole never goes out', () => {
  const p = P(10), B = boardOf(p.parameters);
  const gap = wireOf(p, 0, 1), s = replaySchedule(p, [{edge: gap}]);
  assert.ok(s.inside.includes(18), 'the gap closes a loop round the hole');
  // Put in every wire and fill as many triangles as the board takes: out never comes.
  const steps = [{edge: gap}, ...[...Array(B.E).keys()].filter(e => e !== gap && !s.present[e]).map(edge => ({edge}))];
  const after = replaySchedule(p, [...steps, {tile: 0}, {tile: 1}]);
  assert.equal(after.out, 0);
  assert.equal(nextHint(p, play(p, freshAttempt(p), [...steps, {tile: 0}, {tile: 1}])).text, 'It is still lit. Undo.');
});

test('races: the yellow loop out while the pink one is lit, or Can’t with the tiles that fill the pink loop', () => {
  const p = P(11);
  assert.ok(canRace(p));
  assert.deepEqual(raceSets(p).pinkOnly, [1]);
  const win = play(p, freshAttempt(p), [0, 2, 3, 4, 5].map(tile => ({tile})));
  assert.ok(isSolved(p, win.board));
  const together = play(p, freshAttempt(p), [0, 1, 2, 3, 4, 5].map(tile => ({tile})));
  assert.deepEqual(nextHint(p, together), {type: 'deadend', text: 'They went out together. Undo.'});
  const r = replayRace(p, together.board.fills);
  assert.deepEqual([r.yellow, r.pink], [6, 6]);
  // The right tiles on a possible board: "There is a way."
  const tried = play(p, freshAttempt(p), [{tile: 2}]);
  const refused = move(p, tried, {cant: [0, 1, 3, 4, 5]});
  assert.equal(raceRefusal(p, [0, 1, 3, 4, 5]), 'There is a way.');
  assert.match(html(p, refused), /<p class="hl-note">There is a way\.<\/p>/);
  assert.equal(move(p, refused, {cant: [0, 1, 3, 4, 5]}), null);
  assert.equal(raceRefusal(p, [1]), 'Those tiles don’t fill the pink loop.');
  // Nested: Can't with the pink loop's tiles solves.
  const q = P(12);
  assert.ok(!canRace(q));
  assert.equal(move(q, freshAttempt(q), {cant: [4, 5, 6, 7, 8]}), null, 'a fill first');
  const t = play(q, freshAttempt(q), [{tile: 1}]);
  assert.ok(isSolved(q, move(q, t, {cant: [4, 5, 6, 7, 8]}).board));
  assert.equal(move(q, t, {cant: [4, 5, 6, 7]}).board.refused.shown, true);
  // Once the pink loop is out, Can't waits for Undo.
  const out = play(q, freshAttempt(q), [4, 5, 6, 7, 8].map(tile => ({tile})));
  assert.equal(move(q, out, {cant: [4, 5, 6, 7, 8]}), null);
  assert.deepEqual(nextHint(q, out), {type: 'deadend', text: 'The pink loop went out first. Undo.'});
});

test('pointing after Can’t: every face is a button, taps are ringed in a race and judged on Check', () => {
  const p = P(12), a = play(p, freshAttempt(p), [{tile: 1}]);
  hooks.reset(p);
  hooks.ui(p, {point: true});
  let board = html(p, a);
  assert.equal((board.match(/data-tg-cell=/g) || []).length, 16, 'every triangle is a button');
  assert.match(board, /class="hl-board hl-race pointing"/);
  assert.match(board, /hl-check"[^>]*disabled/, 'Check waits for a tap');
  hooks.ui(p, {pick: 4}); hooks.ui(p, {pick: 6}); hooks.ui(p, {pick: 4});
  board = html(p, a);
  assert.equal((board.match(/class="hl-pick"/g) || []).length, 1, 'a second tap unrings');
  assert.match(board, /data-hl-move='\{&quot;cant&quot;:\[6\]\}'/);
  hooks.carry(p, a.board, a.board);
  assert.doesNotMatch(html(p, a), /pointing/, 'Undo ends pointing');
  // A cancel board: tiles, empty triangles and the hole are all buttons.
  const c = P(8), b = play(c, freshAttempt(c), [{tile: 0}]);
  hooks.reset(c); hooks.ui(c, {point: true});
  const cb = html(c, b);
  assert.equal((cb.match(/data-tg-cell=/g) || []).length, 18);
  assert.match(cb, /data-tg-piece="hole-0"/);
  assert.match(cb, /aria-label="The hole\. Claim it keeps the loop lit"/);
  hooks.reset(c);
  assert.doesNotMatch(html(c, b), /data-tg-piece/, 'without Can’t the hole is no button');
  assert.equal((html(c, b).match(/data-tg-cell=/g) || []).length, 16, 'only tiles are buttons');
});

test('while pointing after Can’t, the goal line says what to tap; it comes back after a claim, Undo or Can’t again', () => {
  const goal = (p, a) => hooks.objective(p, a.board);
  for (const n of [3, 8]) {
    const p = P(n), a = play(p, freshAttempt(p), [{tile: p.parameters.filled[0]}]);
    hooks.reset(p);
    assert.equal(goal(p, a), undefined, `${p.id}: the puzzle’s own goal before Can’t`);
    hooks.ui(p, {point: true});
    assert.equal(goal(p, a), 'Tap what keeps the loop lit.', `${p.id}: what to tap while pointing`);
    assert.match(html(p, a), /role="status">[^<]*Tap the triangle( or hole)? that keeps the loop lit\./, `${p.id}: and in the status`);
    const face = [...Array(boardOf(p.parameters).F).keys()].find(f => !certificates(p).includes(f) && !p.parameters.filled.includes(f));
    hooks.ui(p, {point: false});
    const wrong = play(p, a, [{cant: face}]);
    hooks.ui(p, {point: true});
    assert.equal(goal(p, wrong), undefined, `${p.id}: Can’t is locked after a refusal, so no pointing line`);
    assert.match(html(p, wrong), /<p class="hl-note">That one doesn’t keep it lit\.<\/p>/);
    hooks.carry(p, wrong.board, a.board);
    assert.equal(goal(p, a), undefined, `${p.id}: Undo ends pointing`);
    hooks.reset(p);
  }
  const r = P(12), a = play(r, freshAttempt(r), [{tile: 1}]);
  hooks.reset(r);
  assert.equal(goal(r, freshAttempt(r)), undefined);
  hooks.ui(r, {point: true});
  assert.equal(goal(r, a), 'Tap the tiles that fill the pink loop, then Check.');
  hooks.ui(r, {point: false});
  assert.equal(goal(r, a), undefined, 'pressing Can’t again brings the goal back');
  const s = P(9);
  hooks.ui(s, {point: true});
  assert.equal(goal(s, freshAttempt(s)), undefined, 'schedules have no Can’t');
  for (const q of [r, s]) hooks.reset(q);
});

test('dashed places: a tap goes to the nearest wire, never to a ready triangle, and none near a dot', () => {
  const inside = (poly, [x, y]) => { let s = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) s = !s; } return s; };
  const toLine = ([x, y], [a, b]) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(a[0] + t * dx - x, a[1] + t * dy - y); };
  for (const n of [9, 10]) {
    const p = P(n), B = boardOf(p.parameters), start = new Set(edgesOf(B, p.parameters.start));
    const places = [...B.m.edges.keys()].filter(e => !start.has(e)), areas = new Map(places.map(e => [e, placeArea(B, e)]));
    const seg = e => B.m.edges[e].map(k => B.m.xy[k]);
    const [x0, y0, w, h] = B.m.box;
    let covered = 0;
    for (let x = x0 - 3; x <= x0 + w + 3; x += .25) for (let y = y0 - 3; y <= y0 + h + 3; y += .25) {
      const hits = places.filter(e => inside(areas.get(e), [x, y]));
      assert.ok(hits.length <= 1, `${p.id}: places never overlap (${x}, ${y})`);
      if (!hits.length) continue;
      covered++;
      const e = hits[0], d = toLine([x, y], seg(e));
      // Nearest: no other wire of a triangle beside it is nearer.
      for (const t of B.sides[e].filter(f => f >= 0 && f < B.T)) for (const f of B.m.cellEdges[t]) assert.ok(toLine([x, y], seg(f)) >= d - 1e-9, `${p.id}: the nearest wire (${x}, ${y})`);
      // Only in a triangle beside the place (never ready while it is dashed).
      const cell = [...B.m.cells.keys()].find(t => inside(B.m.cells[t].map(k => B.m.xy[k]), [x, y]));
      if (cell !== undefined) assert.ok(B.sides[e].includes(cell), `${p.id}: no place over another triangle (${x}, ${y})`);
      // None close to a dot.
      for (const [a, b] of [seg(e), seg(e).reverse()]) assert.ok(Math.hypot(x - a[0], y - a[1]) > 1, `${p.id}: no place within a tenth of a side of a dot`);
    }
    assert.ok(covered > 0);
    // Each place reaches a quarter of a side off its wire's middle, both ways.
    for (const e of places) {
      const [a, b] = seg(e), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], len = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
      for (const k of [-2.5, 2.5]) assert.ok(inside(areas.get(e), [m[0] + nx * k, m[1] + ny * k]), `${p.id}: place ${e} reaches ${k} units off its middle`);
    }
  }
});

test('hints: a move first, never Can’t; the reason in words; quick in CPU time', () => {
  for (const p of mine) {
    let a = freshAttempt(p), steps = 0;
    const first = nextHint(p, a);
    assert.ok(!('cant' in first.action), `${p.id}: never a claim first`);
    assert.doesNotMatch(p.hints[0], /Can’t/);
    for (; !isSolved(p, a.board) && steps < 60; steps++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time, so a loaded machine doesn't fail it)`);
      assert.equal(h.type, 'move');
      if ('cant' in h.action) assert.match(h.text, /(stays inside it|first or with it)\.$/, `${p.id}: the reason, not “Press Can’t”`);
      a = move(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
  }
  // From the second hint the board marks the claim: Can't and the face.
  const p = P(7), a = {...play(p, freshAttempt(p), [{tile: 1}]), hintLevel: 2};
  assert.match(html(p, a), /hl-cant hinted/);
  assert.match(html(p, a), /class="hl-mark"/);
  assert.equal(nextHint(p, a).text, 'The loop goes round an empty triangle. Tapping tiles moves the loop, but that triangle stays inside it.');
});

test('the board: buttons sized to the triangles, a focus target that is always a control, words for screen readers', () => {
  const p = P(5), board = html(p, freshAttempt(p));
  assert.equal((board.match(/class="tg-hit hl-hit"/g) || []).length, 16, 'one button per tile');
  assert.match(board, /aria-label="Tile on triangle 11: flip its three wires"/);
  assert.match(board, /role="status">7 wires lit\.|role="status">\d+ wires lit\./);
  assert.match(board, /<pattern id="hl-hatch"/, 'the hole is hatched');
  assert.match(holesModule.focus, /\[tabindex="0"\]$/, 'focus goes to a control');
  const s = P(10), sb = html(s, freshAttempt(s));
  assert.equal((sb.match(/class="tg-hit hl-place-hit"/g) || []).length, 19, 'a dashed place for each wire not in');
  assert.equal((sb.match(/data-tg-cell=/g) || []).length, 0, 'no triangle has three wires yet');
});

test('every style rule is scoped under the group’s root', async () => {
  const css = await readFile(new URL('../dist/families/holes/holes.css', import.meta.url), 'utf8');
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map(r => r.trim()).filter(Boolean);
  for (const rule of rules) {
    if (rule.startsWith('@import')) { assert.match(rule, /tri-grid\.css/); continue; }
    // A rule inside @supports: check the rule itself.
    const inner = /^@(supports|media)/.test(rule) ? rule.slice(rule.indexOf('{') + 1) : rule;
    const selectors = inner.slice(0, inner.indexOf('{')).split(',');
    for (const sel of selectors) assert.match(sel.trim(), /^\[data-mechanic-wire="holes"\]/, sel);
  }
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const p = P(4), q = P(9), r = P(12);
  const half = play(p, freshAttempt(p), [{tile: 2}, {tile: 6}]);
  const sched = play(q, freshAttempt(q), q.solution.steps.slice(0, 3));
  const race = play(r, freshAttempt(r), [{tile: 1}]);
  const saved = {[p.id]: half, [q.id]: sched, [r.id]: race};
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile(saved)]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of Object.entries(saved)) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  for (const board of [{taps: [2], cant: 18, refused: null, extra: 1}, {taps: [], cant: 18, refused: null}, {taps: [2], cant: 5, refused: null}, {taps: [2], cant: null, refused: {face: 18, shown: true}}, {taps: [2]}]) {
    assert.equal(validBoard(p, board), false, JSON.stringify(board));
    const forged = {...store, profiles: [profile({[p.id]: {...half, board}})]};
    assert.throws(() => validateStore(forged, puzzles), JSON.stringify(board));
  }
  assert.equal(validBoard(q, {steps: [{tile: 0}]}), false);
  assert.equal(validBoard(r, {fills: [1], cant: [4, 5, 6], refused: null}), false, 'a forged solve with the wrong tiles');
});

test('the satchel lists the Holes group in Lantern Wires, beside Lamplighter', () => {
  const view = libraryView(profile({'holes-03': {completed: true}}), puzzles);
  const family = view.slice(view.indexOf('data-view-key="family-toggle"'));
  const section = family.slice(0, family.indexOf('</details>'));
  assert.match(section, /<h2>Holes<\/h2>/);
  assert.match(section, /<h2>Lamplighter<\/h2>/);
  assert.ok(section.indexOf('<h2>Hard</h2>') < section.indexOf('<h2>Holes</h2>'), 'below Lantern Wires’ own levels');
  for (let n = 1; n <= 12; n++) assert.ok(section.includes(`data-id="holes-${String(n).padStart(2, '0')}"`));
  assert.match(section, /Lantern Wires, Holes, puzzle 3, completed/);
  assert.equal(holesModule.family, undefined, 'a group adds no satchel family');
  assert.ok(internals.validCancel);
});
