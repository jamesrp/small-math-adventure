// Checks the Footprint borders pack (dist/families/friezes/friezes.json) by
// geometry unlike the mechanic's: each F is placed in the plane as a centre
// and a 2 × 2 sign matrix, and a move is a plane isometry (x, y) → (mx·x +
// tx, my·y + ty), applied to every F and looked up in the border's periodic
// set. First the F's own outline is shown to have no symmetry, so an F
// coincides with another only when centre and matrix agree. Then: every cell
// (or every arrangement of the starting Fs) is searched for each build;
// shortest slides and glides, centres and the absence of every off-strip,
// off-axis or off-grid move are checked; on a border with a row empty no
// claim can be made; every claim tap (gaps too) is judged by the validator's
// own reading of the certificate and compared with the app's, with the share
// of random taps that pass, and taps in page order and keyboard order fail;
// true claims that can't be shown are counted (none on an answer); witnesses
// are played as moves; an attempt followed by an edit still counts, from
// the copy where it stands; refusals stay through edits and back, slides and
// back, and Undo, and Restart clears them; hints solve from fresh, after
// wrong edits and copy moves, after a refused claim, after Undo and after
// Restart, and say Restart (on the board too) when every way left is
// refused; illegal moves and forged saves are refused; and the playground.
// Run: node scripts/validate-friezes.mjs
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, restart} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import * as M from '../dist/families/friezes/friezes.js';
import {loadPack} from './packs.mjs';

// --- The F, in the plane ----------------------------------------------------
// Its outline in half units (the drawing's units doubled), as written in the
// worksheet's launch figure: a bar with a notch and a short arm.
const OUTLINE = [[-26, -22], [26, -22], [26, -8], [16, -8], [16, -13], [-10, -13], [-10, 0], [12, 0], [12, 9], [-10, 9], [-10, 22], [-26, 22]];
const SIGNS = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
// The four forms, by what they are: as drawn, flipped across (x → −x),
// flipped down (y → −y), half-turned.
const FORM_MATRIX = {0: [1, 1], 1: [-1, 1], 2: [1, -1], 3: [-1, -1]};
const formOf = O => Number(Object.keys(FORM_MATRIX).find(k => FORM_MATRIX[k][0] === O[0] && FORM_MATRIX[k][1] === O[1]));
function outlineHasNoSymmetry() {
  const key = pts => pts.map(([x, y]) => `${x},${y}`).sort().join(' ');
  const c = OUTLINE.reduce(([a, b], [x, y]) => [a + x / OUTLINE.length, b + y / OUTLINE.length], [0, 0]);
  // A symmetry fixes the centroid of the vertices, so its translation is
  // c − S·c; with the linear part a sign matrix S, only S = identity works.
  return SIGNS.every(([sx, sy]) => {
    const image = OUTLINE.map(([x, y]) => [sx * x + c[0] - sx * c[0], sy * y + c[1] - sy * c[1]]).map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6]);
    const same = key(image) === key(OUTLINE);
    return (sx === 1 && sy === 1) === same;
  });
}

// --- Borders ----------------------------------------------------------------
// Places are 2 units wide; place c of the cell has its centre at x = 2c + 1,
// the top row at y = 1 and the bottom at y = −1 (y up). A border is the set
// of its Fs repeated every 2P units.
const placed = cell => cell.flatMap((row, r) => row.flatMap((F, c) => (F === null ? [] : [{x: 2 * c + 1, y: r === 0 ? 1 : -1, O: FORM_MATRIX[F]}])));
const modP = (x, n) => ((x % n) + n) % n;
function borderSet(cell) {
  const P = cell[0].length, set = new Set();
  for (const f of placed(cell)) set.add(`${modP(f.x, 2 * P)},${f.y},${f.O}`);
  return set;
}
// Does the isometry map the border onto itself? Every F's image is an F.
function matches(cell, iso, set = borderSet(cell), fs = placed(cell)) {
  const P = cell[0].length;
  if (!fs.length) return false;
  return fs.every(f => {
    const x = iso.m[0] * f.x + iso.t[0], y = iso.m[1] * f.y + iso.t[1];
    if (!Number.isInteger(x)) return false;
    return set.has(`${modP(x, 2 * P)},${y},${[iso.m[0] * f.O[0], iso.m[1] * f.O[1]]}`);
  });
}
// Every isometry keeping the strip, with translations up to two cells (for
// slides and glides) and every line and centre in a cell (for the others).
const isos = P => SIGNS.flatMap(m => Array.from({length: 8 * P + 1}, (_, k) => ({m, t: [k - 4 * P, 0]})));
const kind = iso => (iso.m[0] === 1 ? (iso.m[1] === 1 ? (iso.t[0] === 0 ? 'identity' : 'slide') : iso.t[0] === 0 ? 'flip' : 'glide') : iso.m[1] === 1 ? 'mirror' : 'turn');
const matching = cell => isos(cell[0].length).filter(iso => kind(iso) !== 'identity' && matches(cell, iso));
// The facts each goal needs, from the matching isometries.
function facts(cell) {
  const P = cell[0].length, list = matching(cell), has = (k, f = () => true) => list.some(i => kind(i) === k && f(i));
  const shortest = k => { const d = list.filter(i => kind(i) === k).map(i => Math.abs(i.t[0]) / 2); return d.length ? Math.min(...d) : null; };
  return {
    slide: has('slide'), flip: has('flip'), glide: has('glide'), turn: has('turn'), mirror: has('mirror'),
    crossing: has('mirror', i => i.t[0] === 2 * P), slideBy: d => has('slide', i => Math.abs(i.t[0]) === 2 * d),
    shortestSlide: shortest('slide'), shortestGlide: shortest('glide'),
    centres: list.filter(i => kind(i) === 'turn').map(i => i.t[0] / 2)
  };
}
// One F whose image needs a matrix its row (or the other row) never has:
// the certificate for no half-turn or no flip across anywhere.
function familyShown(cell, move) {
  const fs = placed(cell), m = move === 'turn' ? [-1, -1] : [-1, 1];
  return fs.some(f => { const need = [m[0] * f.O[0], m[1] * f.O[1]], y = move === 'turn' ? -f.y : f.y; return !fs.some(g => g.y === y && g.O[0] === need[0] && g.O[1] === need[1]); });
}
// Is the cell an answer to every part of the puzzle? Each goal asks for the
// isometries it needs, and the first that fails ends the search.
function answerBy(q, cell) {
  const fs = placed(cell);
  if (!fs.length) return {ok: false, unshown: false};
  const P = cell[0].length, set = borderSet(cell);
  const any = (m, ts) => ts.some(t => matches(cell, {m, t: [t, 0]}, set, fs));
  const T = Array.from({length: 8 * P + 1}, (_, k) => k - 4 * P), moving = T.filter(t => t !== 0);
  const has = {slide: () => any([1, 1], moving), flip: () => any([1, -1], [0]), glide: () => any([1, -1], moving), turn: () => any([-1, -1], T), mirror: () => any([-1, 1], T)};
  let unshown = false;
  for (const g of q.goals) {
    let holds = true;
    if (g.type === 'match') holds = g.line ? any([-1, 1], [2 * P]) : has[g.move]();
    if (g.type === 'cant') {
      holds = g.move === 'slide' ? !any([1, 1], [2 * g.by, -2 * g.by]) : !has[g.move]();
      if (holds && (g.move === 'turn' || g.move === 'mirror') && !familyShown(cell, g.move)) unshown = true;
    }
    if (g.type === 'centre') holds = has.turn();
    if (!holds) return {ok: false, unshown: false};
  }
  return {ok: !unshown, unshown};
}
const show = cell => cell.map(row => row.map(v => (v === null ? '·' : 'AVHR'[v])).join('')).join('/');
function everyCell(P, visit) {
  const slots = 2 * P, total = 5 ** slots;
  for (let n = 0; n < total; n++) {
    const cell = [Array(P).fill(null), Array(P).fill(null)];
    let k = n;
    for (let i = 0; i < slots; i++) { const v = k % 5; k = (k - v) / 5; cell[i % 2][(i - (i % 2)) / 2] = v === 4 ? null : v; }
    visit(cell);
  }
}
// Every way to put the starting Fs (as a multiset) in the cell's places.
function everyArrangement(cell, visit) {
  const P = cell[0].length, places = [], forms = placed(cell).map(f => formOf(f.O)).sort();
  for (let c = 0; c < P; c++) for (let r = 0; r < 2; r++) places.push([c, r]);
  const seen = new Set();
  (function go(i, rest, now) {
    if (!rest.length) { const key = show(now); if (!seen.has(key)) { seen.add(key); visit(now.map(row => [...row])); } return; }
    if (i === places.length) return;
    go(i + 1, rest, now);
    for (const F of new Set(rest)) { const [c, r] = places[i]; now[r][c] = F; go(i + 1, rest.filter((v, k) => k !== rest.indexOf(F)), now); now[r][c] = null; }
  })(0, forms, [Array(P).fill(null), Array(P).fill(null)]);
}

// --- Certificates, by this reading ------------------------------------------
// A move's isometry from the copy's state, by where it sends place centres.
const isoOf = (P, g) => ({m: [g.s, g.f], t: [g.s === 1 ? 2 * g.u : 2 * g.u + 2 * P, 0]});
const centreX = c => 2 * c + 1, rowY = r => (r === 0 ? 1 : -1);
function instanceAt(cell, c, r) { const P = cell[0].length, F = cell[r][modP(c, P)]; return F === null ? null : FORM_MATRIX[F]; }
function certOk(q, cell, goal, pick, dist) {
  const P = cell[0].length;
  if (goal.type === 'centre') return Number.isInteger(pick) && matches(cell, {m: [-1, -1], t: [2 * pick, 0]});
  const [X, Y] = pick, OX = instanceAt(cell, X[0], X[1]);
  if (!OX) return false;
  if (goal.type === 'cant' && (goal.move === 'turn' || goal.move === 'mirror')) {
    const m = goal.move === 'turn' ? [-1, -1] : [-1, 1], need = [m[0] * OX[0], m[1] * OX[1]], row = goal.move === 'turn' ? 1 - X[1] : X[1];
    return FORM_MATRIX[Y][0] === need[0] && FORM_MATRIX[Y][1] === need[1] && !cell[row].some(F => F !== null && FORM_MATRIX[F][0] === need[0] && FORM_MATRIX[F][1] === need[1]);
  }
  if (goal.type === 'cant') {
    const list = goal.move === 'flip' ? [{m: [1, -1], t: [0, 0]}] : [2 * goal.by, -2 * goal.by].map(t => ({m: [1, 1], t: [t, 0]}));
    return list.some(iso => {
      if (iso.m[0] * centreX(X[0]) + iso.t[0] !== centreX(Y[0]) || iso.m[1] * rowY(X[1]) !== rowY(Y[1])) return false;
      const OY = instanceAt(cell, Y[0], Y[1]);
      return !(OY && OY[0] === iso.m[0] * OX[0] && OY[1] === iso.m[1] * OX[1]);
    });
  }
  // Shortest: Y has the F the move needs from X, as far as the copy went,
  // and no F of that kind in that row is nearer to X (searched over repeats).
  const m = goal.move === 'slide' ? [1, 1] : [1, -1], need = [m[0] * OX[0], m[1] * OX[1]], row = goal.move === 'slide' ? X[1] : 1 - X[1];
  const OY = instanceAt(cell, Y[0], Y[1]), d = Math.abs(Y[0] - X[0]);
  if (Y[1] !== row || !OY || OY[0] !== need[0] || OY[1] !== need[1] || d !== dist) return false;
  for (let c = X[0] - 3 * P; c <= X[0] + 3 * P; c++) { const O = instanceAt(cell, c, row); if (O && O[0] === need[0] && O[1] === need[1] && c !== X[0] && Math.abs(c - X[0]) < d) return false; }
  return d > 0;
}

// --- Playing ----------------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const sameBoardCell = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const bothRowsOf = cell => cell.every(row => row.some(v => v !== null));
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 80; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move`);
    assert.ok(h.text && !/undefined|NaN|null/.test(h.text), `${p.id} ${label}: hint words (${h.text})`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return {steps, a};
}
// Play hints until the next hint is a claim of this type (or a solve).
function untilClaim(p, a, types) {
  for (let k = 0; k < 80 && !isSolved(p, a.board); k++) {
    const h = nextHint(p, a);
    if (h.type !== 'move') return {a, h: null};
    if (types.includes(h.action.type)) return {a, h};
    a = play(p, a, h.action);
  }
  return {a, h: null};
}
// Every tap a claim could be made with, in the board's window: any place
// first (a gap too), then any other place, or one of the four forms.
function tapSpace(q, cell, goal) {
  const P = cell[0].length, {from, to} = M.windowOf(P), places = [];
  for (let c = from; c < to; c++) for (let r = 0; r < 2; r++) places.push([c, r]);
  if (goal.type === 'centre') return Array.from({length: 2 * (to - from) - 1}, (_, k) => 2 * from + 1 + k);
  const second = goal.type === 'cant' && (goal.move === 'turn' || goal.move === 'mirror') ? M.FORMS : places;
  return places.flatMap(X => second.filter(Y => !(Array.isArray(Y) && Y[0] === X[0] && Y[1] === X[1])).map(Y => [X, Y]));
}
// The taps a child makes by going down the page: the targets in the order
// the rendered page has them (the order Tab goes), and the form buttons.
function pageOrder(p, mech, board, i) {
  mech.reset(p);
  mech.ui(p, {claim: i});
  const html = mech.render(p, {board, hintLevel: 0, moves: 1});
  mech.reset(p);
  const slots = [...html.matchAll(/data-fz-slot="(-?\d+),(\d)"/g)].map(m => [Number(m[1]), Number(m[2])]);
  const points = [...html.matchAll(/data-fz-point="(-?\d+)"/g)].map(m => Number(m[1]));
  return {slots, points, forms: M.FORMS};
}
// Two naive orders: page order (the first F, then the next target, the next
// F for a Shortest, or the first form) and keyboard order (Enter on the first
// target and then on the next, or on the first form).
function orderPicks(q, cell, goal, order) {
  const has = ([c, r]) => instanceAt(cell, c, r) !== null;
  if (goal.type === 'centre') return {page: order.points[0], keys: order.points[0]};
  const k = order.slots.findIndex(has), X = order.slots[k];
  if (goal.type === 'cant' && M.isFamily(goal)) return {page: [X, order.forms[0]], keys: [order.slots[0], order.forms[0]]};
  const next = goal.type === 'shortest' ? order.slots.slice(k + 1).find(has) : order.slots[k + 1];
  return {page: [X, next], keys: [order.slots[0], order.slots[1]]};
}
// A board ready for every claim on this cell: each attempt and each match on
// record, the copy home.
function readyBoard(q, cell) {
  const tried = new Set();
  q.goals.forEach(g => { if (g.type === 'match') tried.add(M.showKey(g)); if (g.type === 'cant') tried.add(M.tryKey(g)); });
  return {cell, copy: {...M.HOME}, tried: [...tried].sort(), shown: q.goals.flatMap((g, i) => (g.type === 'match' && M.matchable(cell, g) ? [i] : [])), done: [], refused: [], last: null};
}

// The table in docs/friezes/README.md.
const TABLE = {
  'friezes-01': {slides: [3]},
  'friezes-02': {shortest: {slide: 2}},
  'friezes-03': {count: 20},
  'friezes-04': {count: 4},
  'friezes-05': {count: 40},
  'friezes-06': {count: 20},
  'friezes-07': {shortest: {slide: 4, glide: 2}},
  'friezes-08': {count: 36},
  'friezes-09': {count: 20},
  'friezes-10': {count: 24},
  'friezes-11': {shortest: {slide: 6, glide: 3}}
};

async function validateFriezes() {
  const pack = await loadPack();
  const puzzles = pack.puzzles.filter(p => p.mechanic === 'friezes');
  assert.ok(outlineHasNoSymmetry(), 'the F has no symmetry: no flip or half-turn maps it onto itself');
  const report = {puzzles: puzzles.length - 1, cellsSearched: 0, mechanicChecks: 0, tapShares: {}, orders: {}, hintSteps: {}, oneRowBoards: 0, trueWithoutCertificate: {}};
  assert.ok(puzzles.length - 1 >= 8 && puzzles.length - 1 <= 12, 'eight to twelve puzzles');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  const ids = new Set(pack.sources.map(s => s.id));
  for (const p of puzzles) {
    for (const k of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id}: ${k}`);
    assert.ok(p.hints.length >= 3 && p.hints.every(h => typeof h === 'string' && h.trim()), `${p.id}: hints`);
    for (const k of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[k]?.trim(), `${p.id}: parent ${k}`);
    assert.ok(p.parent.sourceIds.every(s => ids.has(s)), `${p.id}: sources`);
    assert.ok(p.visibleObjective.length < 150, `${p.id}: a short visible objective`);
    assert.ok(/^(Week 35|New)/.test(p.provenance), `${p.id}: provenance names the week or says new`);
    assert.ok(p.controls.startsWith('A border repeats'), `${p.id}: How to play opens with the mathematics`);
    assert.ok(!/press Can’t\.?$/i.test(p.hints[0]) && !/^Press /.test(p.hints[0]), `${p.id}: the first hint is not a claim`);
  }
  const sizes = new Set();

  // Every copy state on every cell of 2 places, and on many of 3 to 6: the
  // mechanic's match agrees with the plane.
  for (const P of [2, 3]) everyCell(P, cell => { for (const g of M.copyStates(P)) { assert.equal(M.fits(cell, g), matches(cell, isoOf(P, g)), `fits agrees on ${show(cell)} ${JSON.stringify(g)}`); report.mechanicChecks++; } });
  // With Fs in both rows, no move off the middle line or off the grid
  // matches, so the copy's moves are every symmetry the Fs have. (A border
  // with Fs in one row only can have more: a half-turn round a point of that
  // row's own line, say. Every answer has Fs in both rows; see below.)
  report.oneRowWithMore = 0;
  for (const P of [2, 3, 4]) {
    let n = 0;
    everyCell(P, cell => {
      if (P === 4 && n++ % 61) return;
      const fs = placed(cell);
      if (!fs.length) return;
      const set = borderSet(cell), both = fs.some(f => f.y === 1) && fs.some(f => f.y === -1);
      let more = false;
      for (const m of SIGNS) for (const ty of [-2, 2]) for (let tx = -2 * P; tx <= 2 * P; tx++) if (matches(cell, {m, t: [tx, ty]}, set, fs)) more = true;
      for (const m of SIGNS) for (const ty of [-1, 1]) assert.ok(!matches(cell, {m, t: [0, ty]}, set, fs), `${show(cell)}: rows stay on rows`);
      for (const m of SIGNS) for (let k = -2 * P; k <= 2 * P; k++) assert.ok(!matches(cell, {m, t: [k + 0.5, 0]}, set, fs), `${show(cell)}: no move off the grid`);
      if (both) assert.ok(!more, `${show(cell)}: with both rows, no move off the middle line`);
      else if (more && P < 4) report.oneRowWithMore++;
    });
  }

  for (const p of puzzles) {
    const q = p.parameters, mech = mechanicFor(p), fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: a valid start`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    const P = q.cell[0].length, row = TABLE[p.id];
    sizes.add(P);
    assert.ok(row, `${p.id}: in the table`);
    let pool = null;
    if (q.edit === 'none') {
      const f = facts(q.cell);
      if (row.slides) assert.deepEqual(matching(q.cell).filter(i => kind(i) === 'slide' && i.t[0] > 0 && i.t[0] <= 2 * P).map(i => i.t[0] / 2), row.slides, `${p.id}: the matching slides`);
      for (const [k, d] of Object.entries(row.shortest || {})) {
        assert.equal(k === 'slide' ? f.shortestSlide : f.shortestGlide, d, `${p.id}: shortest ${k}`);
        assert.equal(M.shortestOf(q.cell, k), d, `${p.id}: the app’s shortest ${k}`);
        assert.equal(p.solution[k], d, `${p.id}: the pack’s shortest ${k}`);
      }
      if (row.shortest?.glide) assert.equal(row.shortest.glide * 2, row.shortest.slide, `${p.id}: the glide is half the slide`);
      assert.ok(!f.flip || !row.shortest?.glide, `${p.id}: the flip alone fails`);
    } else {
      // Every candidate cell, by the plane; the app’s answers must agree.
      const found = [];
      let unshown = 0;
      const visit = cell => { report.cellsSearched++; const v = answerBy(q, cell); if (v.ok) found.push(show(cell)); if (v.unshown) unshown++; };
      if (q.edit === 'move') everyArrangement(q.cell, visit); else everyCell(P, visit);
      assert.equal(unshown, 0, `${p.id}: every true claim on an answer can be shown`);
      assert.equal(found.length, row.count, `${p.id}: how many borders work`);
      assert.deepEqual(M.answerCells(p).map(show).sort(), [...found].sort(), `${p.id}: the app finds the same borders`);
      assert.ok(!found.includes(show(q.cell)), `${p.id}: the start is not an answer`);
      pool = found;
      const cells = found.map(c => c.split('/').map(r => [...r].map(ch => (ch === '·' ? null : 'AVHR'.indexOf(ch)))));
      assert.ok(cells.every(c => placed(c).some(f => f.y === 1) && placed(c).some(f => f.y === -1)), `${p.id}: every answer has Fs in both rows`);
      if (q.crossing) for (const c of cells) assert.ok(facts(c).centres.includes(P), `${p.id}: ${show(c)} turns round the crossing`);
    }

    // The witness, as moves.
    let a = fresh;
    for (const action of p.solution.moves) a = play(p, a, action);
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves it`);
    assert.equal(show(a.board.cell), p.solution.witness, `${p.id}: the witness border`);
    if (pool) assert.ok(pool.includes(p.solution.witness), `${p.id}: the witness is an answer`);
    for (const d of a.board.done) { const goal = q.goals[d.goal]; assert.ok(certOk(q, a.board.cell, goal, d.pick, goal.type === 'shortest' ? M.shortestOf(a.board.cell, goal.move) : undefined), `${p.id}: the witness’s claim ${d.goal} holds by the plane`); }

    // Hints from fresh.
    report.hintSteps[p.id] = hintsSolve(p, fresh, 'from fresh').steps;
    // Every claim tap on the board where the hints make that claim: the app
    // and the plane agree, and few random taps pass.
    let b = fresh;
    const shares = [];
    for (let guard = 0; guard < 12; guard++) {
      const {a: at, h} = untilClaim(p, b, ['cant', 'shortest', 'centre']);
      if (!h) break;
      const goal = q.goals[h.action.goal], dist = goal.type === 'shortest' ? Math.abs(at.board.copy.u) : undefined;
      const space = tapSpace(q, at.board.cell, goal);
      let pass = 0;
      for (const pick of space) {
        const next = move(p, at, {type: goal.type, goal: h.action.goal, pick});
        const ok = certOk(q, at.board.cell, goal, pick, dist);
        assert.ok(next, `${p.id}: a claim tap is judged (${JSON.stringify(pick)})`);
        assert.equal(next.board.done.some(d => d.goal === h.action.goal), ok, `${p.id}: the app and the plane agree on ${JSON.stringify(pick)}`);
        if (!ok) {
          const r = next.board.refused.find(x => x.goal === h.action.goal);
          assert.ok(r && r.why, `${p.id}: a wrong tap is refused with a reason`);
          refuse(p, next, {type: goal.type, goal: h.action.goal, pick: h.action.pick}, 'a second claim while the refusal stands');
        }
        if (ok) pass++;
      }
      assert.ok(pass > 0, `${p.id}: the claim can be shown`);
      shares.push(`${goal.type}${goal.move ? ` ${goal.move}` : ''}: ${pass}/${space.length}`);
      // Down the page or by Tab and Enter, the taps fail (a family claim's
      // first form is right by chance on some borders; counted below).
      const naive = orderPicks(q, at.board.cell, goal, pageOrder(p, mech, at.board, h.action.goal));
      for (const [how, pick] of Object.entries(naive)) {
        assert.ok(pick !== undefined && (goal.type === 'centre' || pick.every(x => x !== undefined)), `${p.id}: a ${how}-order pick exists`);
        const next = move(p, at, {type: goal.type, goal: h.action.goal, pick});
        const right = !!next && next.board.done.some(d => d.goal === h.action.goal);
        assert.equal(right, certOk(q, at.board.cell, goal, pick, dist), `${p.id}: ${how} order judged as the plane does`);
        if (!M.isFamily(goal)) assert.equal(right, false, `${p.id}: the ${goal.type} claim in ${how} order fails`);
      }
      b = play(p, at, h.action);
    }
    report.tapShares[p.id] = shares;
    // Over every answer (a build) or the border (fixed): how often page order
    // and keyboard order would pass each claim.
    const orders = [];
    const cellsFor = pool ? pool.map(t => t.split('/').map(r => [...r].map(ch => (ch === '·' ? null : 'AVHR'.indexOf(ch))))) : [q.cell];
    q.goals.forEach((goal, i) => {
      if (goal.type === 'match') return;
      let page = 0, keys = 0, n = 0;
      for (const cell of cellsFor) {
        let board = readyBoard(q, cell);
        if (goal.type === 'shortest') { const d = M.shortestOf(cell, goal.move); board = {...board, copy: {s: 1, f: goal.move === 'slide' ? 1 : -1, u: d}, tried: [...new Set([...board.tried, goal.move, `${goal.move}:${d}`])].sort()}; }
        assert.ok(validBoard(p, board) && M.canClaim(q, board, i), `${p.id}: a board ready for claim ${i} on ${show(cell)}`);
        const naive = orderPicks(q, cell, goal, pageOrder(p, mech, board, i)), dist = goal.type === 'shortest' ? Math.abs(board.copy.u) : undefined;
        assert.ok([naive.page, naive.keys].every(pick => pick !== undefined && (goal.type === 'centre' || pick.every(x => x !== undefined))), `${p.id}: order picks exist on ${show(cell)}`);
        const judged = pick => { const next = mech.move(p, board, {type: goal.type, goal: i, pick}); assert.equal(!!next && next.done.some(d => d.goal === i), certOk(q, cell, goal, pick, dist), `${p.id}: ${JSON.stringify(pick)} judged as the plane does`); return certOk(q, cell, goal, pick, dist); };
        if (judged(naive.page)) page++;
        if (judged(naive.keys)) keys++;
        n++;
      }
      if (!M.isFamily(goal)) assert.ok(page === 0 && keys === 0, `${p.id}: claim ${i} never passes in page or keyboard order`);
      else assert.ok(page <= n / 4 && keys <= n / 4, `${p.id}: the family claim's first form passes no more than by chance`);
      orders.push(`${goal.type}${goal.move ? ` ${goal.move}` : ''}: page ${page}/${n}, keys ${keys}/${n}`);
    });
    report.orders[p.id] = orders;
    for (const s of shares) { const [n, d] = s.split(': ')[1].split('/').map(Number); assert.ok(n / d <= (/^(centre|cant turn|cant mirror|shortest)/.test(s) ? 0.25 : 0.2), `${p.id}: few random taps pass (${s})`); }

    // Hints after wrong moves: a stray edit or a stray slide first.
    let w = fresh;
    if (q.edit === 'free') w = play(p, play(p, w, {type: 'put', c: P - 1, r: 1, form: 1}), {type: 'put', c: 0, r: 1, form: 3});
    if (q.edit === 'move') { const [f0] = M.footprints(q.cell), gap = [...Array(2 * P).keys()].map(s => [s >> 1, s & 1]).find(([c, r]) => q.cell[r][c] === null && !(c === f0.c && r === f0.r)); w = play(p, w, {type: 'shift', from: [f0.c, f0.r], to: gap}); }
    w = play(p, w, {type: 'slide', by: 1});
    if (q.tools.includes('flip')) w = play(p, w, {type: 'flip'});
    hintsSolve(p, w, 'after wrong moves');
    // An attempt and then an edit: the copy still shows that move on the new
    // border, and that counts, so the Can't is on there (with both rows).
    if (q.edit !== 'none') q.goals.forEach((goal, i) => {
      if (goal.type !== 'cant') return;
      let t = play(p, fresh, goal.move === 'slide' ? {type: 'slide', by: goal.by} : {type: goal.move});
      const cell = t.board.cell, gaps = [...Array(2 * P).keys()].map(s => [s >> 1, s & 1]).filter(([c, r]) => cell[r][c] === null);
      if (q.edit === 'free') t = gaps.length ? play(p, t, {type: 'put', c: gaps[0][0], r: gaps[0][1], form: 0}) : play(p, t, {type: 'clear', c: 0, r: 0});
      else { const f0 = M.footprints(cell).find(x => gaps.some(([, r]) => r === x.r)); t = play(p, t, {type: 'shift', from: [f0.c, f0.r], to: gaps.find(([, r]) => r === f0.r)}); }
      assert.ok(t.board.tried.includes(M.tryKey(goal)), `${p.id}: after an edit the copy's ${goal.move} where it stands counts`);
      assert.equal(M.canClaim(q, t.board, i), bothRowsOf(t.board.cell), `${p.id}: after an attempt and an edit, Can't ${goal.move} is on with both rows`);
      hintsSolve(p, t, 'after an attempt and an edit');
    });
    // A refused claim: it stays through an edit and back, a slide and back,
    // and Undo (each puts the same board back, and the claim stays off);
    // Restart clears it; hints solve after each.
    const {a: before, h} = untilClaim(p, fresh, ['cant', 'shortest', 'centre']);
    if (h) {
      const i = h.action.goal, goal = q.goals[i], dist = goal.type === 'shortest' ? Math.abs(before.board.copy.u) : undefined;
      const wrong = tapSpace(q, before.board.cell, goal).find(pick => !certOk(q, before.board.cell, goal, pick, dist));
      const refused = play(p, before, {type: goal.type, goal: i, pick: wrong});
      assert.ok(refused.board.refused.some(r => r.goal === i) && refused.board.last?.ok === false, `${p.id}: the wrong claim is refused`);
      hintsSolve(p, refused, 'after a refused claim');
      let back = undo(refused);
      back = {...back, board: mech.carry(p, refused.board, back.board)};
      assert.ok(validBoard(p, back.board), `${p.id}: Undo keeps a valid board`);
      assert.ok(back.board.refused.some(r => r.goal === i), `${p.id}: Undo keeps the refusal`);
      assert.notDeepEqual(back.board, refused.board, `${p.id}: Undo changes the board`);
      refuse(p, back, h.action, 'a claim the refusal still holds after Undo');
      hintsSolve(p, back, 'after Undo');
      // Away and back: an edit undone by hand, or the copy slid away and back.
      let round = refused;
      if (q.edit === 'free') { const gap = [...Array(2 * P).keys()].map(s => [s >> 1, s & 1]).find(([c, r]) => round.board.cell[r][c] === null); round = play(p, play(p, round, {type: 'put', c: gap[0], r: gap[1], form: 0}), {type: 'clear', c: gap[0], r: gap[1]}); }
      if (q.edit === 'move') { const [f0] = M.footprints(round.board.cell), gap = [...Array(2 * P).keys()].map(s => [s >> 1, s & 1]).find(([c, r]) => round.board.cell[r][c] === null); round = play(p, play(p, round, {type: 'shift', from: [f0.c, f0.r], to: gap}), {type: 'shift', from: gap, to: [f0.c, f0.r]}); }
      if (q.edit === 'none') round = play(p, play(p, round, {type: 'slide', by: round.board.copy.u > 0 ? -1 : 1}), {type: 'slide', by: round.board.copy.u > 0 ? 1 : -1});
      assert.ok(sameBoardCell(round.board.cell, refused.board.cell) && M.sameCopy(round.board.copy, refused.board.copy), `${p.id}: back to the same board`);
      assert.equal(M.canClaim(q, round.board, i), false, `${p.id}: the claim stays off on the same board`);
      if (q.edit !== 'none') {
        // The edit started the attempts again from the copy where it stands.
        assert.deepEqual(round.board.tried, [...M.keysOf(round.board.copy)].sort(), `${p.id}: after an edit the copy's state where it stands is the attempt`);
      }
      hintsSolve(p, round, 'after going away and back');
      let again = restart(p, refused);
      again = {...again, board: mech.carryOnRestart(p, refused.board, again.board)};
      assert.ok(validBoard(p, again.board), `${p.id}: Restart keeps a valid board`);
      assert.deepEqual(again.board.refused, [], `${p.id}: Restart clears refusals`);
      hintsSolve(p, again, 'after Restart');
      // A Shortest refused at both places it can be claimed: the hint says
      // Restart, and after Restart the hints solve.
      if (goal.type === 'shortest') {
        let two = refused;
        for (let k = 0; k < 4 && nextHint(p, two).type === 'move' && nextHint(p, two).action.type !== 'shortest'; k++) two = play(p, two, nextHint(p, two).action);
        const at2 = two.board, d2 = Math.abs(at2.copy.u), wrong2 = tapSpace(q, at2.cell, goal).find(pick => !certOk(q, at2.cell, goal, pick, d2));
        two = play(p, two, {type: 'shortest', goal: i, pick: wrong2});
        assert.equal(nextHint(p, two).type, 'stuck', `${p.id}: refused both ways, the hint says Restart`);
        assert.match(nextHint(p, two).text, /Restart/);
        // The board says so too, beside the refusal and once the copy moves.
        const noteOf = a => { mech.reset(p); const html = mech.render(p, {board: a.board, hintLevel: 0, moves: 1}); mech.reset(p); return html.match(/<p class="fz-told[^"]*">([^<]*)<\/p>/)?.[1] || ''; };
        assert.match(noteOf(two), /Restart to try again/, `${p.id}: refused both ways, the board says Restart`);
        assert.match(noteOf(play(p, two, {type: 'slide', by: two.board.copy.u > 0 ? -1 : 1})), /Restart to try again/, `${p.id}: refused both ways, the board still says Restart after a slide`);
        assert.doesNotMatch(noteOf(refused), /Restart/, `${p.id}: refused one way, the board doesn't say Restart`);
        const fresh2 = {...restart(p, two), board: mech.carryOnRestart(p, two.board, freshAttempt(p).board)};
        hintsSolve(p, fresh2, 'after Restart from stuck');
        report.stuck = [...(report.stuck || []), p.id];
      }
    }

    // A border with a row empty: every claim is off and nothing is solved,
    // even with every attempt made (the judgement would be about the copy's
    // moves, not every symmetry; see oneRowWithMore).
    if (q.edit !== 'none') {
      const oneRow = [];
      if (q.edit === 'move') everyArrangement(q.cell, c => { if (!bothRowsOf(c)) oneRow.push(c); });
      else everyCell(P, c => { if (!bothRowsOf(c) && placed(c).length) oneRow.push(c); });
      for (const cell of oneRow) {
        const board = readyBoard(q, cell);
        assert.ok(validBoard(p, board), `${p.id}: ${show(cell)} with every attempt made is a board`);
        assert.equal(isSolved(p, board), false, `${p.id}: ${show(cell)} is not solved`);
        q.goals.forEach((goal, i) => {
          if (goal.type === 'match') return;
          assert.equal(M.canClaim(q, board, i), false, `${p.id}: no claim on ${show(cell)}`);
          for (const pick of tapSpace(q, cell, goal).slice(0, 40)) assert.equal(mech.move(p, board, {type: goal.type, goal: i, pick}), null, `${p.id}: no claim judged on ${show(cell)}`);
        });
        report.oneRowBoards++;
      }
      // Two-row borders where a family claim is true but no one F shows it:
      // its refusal must not say the claim is false (one text for every
      // wrong pick). None is an answer.
      q.goals.forEach(goal => {
        if (!M.isFamily(goal) || q.edit !== 'free') return;
        let n = 0;
        everyCell(P, c => { if (bothRowsOf(c) && M.claimTrue(c, goal) && !familyShown(c, goal.move)) n++; });
        report.trueWithoutCertificate[`${p.id} no ${goal.move}`] = n;
      });
    }

    checkIllegal(p, fresh, a);
    checkForged(p, fresh, a);
  }
  assert.ok(sizes.size >= 3, 'cells of several lengths');
  return report;
}

function checkIllegal(p, fresh, solvedAttempt) {
  const q = p.parameters, P = q.cell[0].length;
  refuse(p, fresh, {type: 'slide', by: 0}, 'a slide of nothing');
  refuse(p, fresh, {type: 'slide', by: P + 1}, 'a slide past a cell');
  refuse(p, fresh, {type: 'slide', by: 1.5}, 'half a place');
  for (const t of M.TOOLS) if (!q.tools.includes(t)) refuse(p, fresh, {type: t}, `the ${t} button it doesn’t have`);
  refuse(p, fresh, {type: 'period', P: 3}, 'a new cell length');
  refuse(p, fresh, {type: 'jump'}, 'an unknown move');
  refuse(p, fresh, null, 'no move');
  if (q.edit !== 'free') { refuse(p, fresh, {type: 'put', c: 0, r: 0, form: 2}, 'putting an F'); refuse(p, fresh, {type: 'clear', c: 0, r: 0}, 'taking an F away'); }
  if (q.edit !== 'move') refuse(p, fresh, {type: 'shift', from: [0, 0], to: [1, 1]}, 'moving an F');
  if (q.edit === 'free') {
    refuse(p, fresh, {type: 'put', c: P, r: 0, form: 0}, 'an F outside the cell');
    refuse(p, fresh, {type: 'put', c: 0, r: 2, form: 0}, 'a third row');
    refuse(p, fresh, {type: 'put', c: 0, r: 0, form: 4}, 'a fifth form');
    refuse(p, fresh, {type: 'clear', c: 0, r: 0}, 'taking away a gap');
  }
  if (q.edit === 'move') {
    const [f] = M.footprints(q.cell), other = M.footprints(q.cell)[1];
    refuse(p, fresh, {type: 'shift', from: [f.c, f.r], to: [other.c, other.r]}, 'an F onto an F');
    refuse(p, fresh, {type: 'shift', from: [f.c, f.r], to: [P, 0]}, 'an F out of the cell');
    const gap = [...Array(2 * P).keys()].map(s => [s >> 1, s & 1]).find(([c, r]) => q.cell[r][c] === null);
    refuse(p, fresh, {type: 'shift', from: gap, to: gap}, 'a gap moved');
  }
  q.goals.forEach((goal, i) => {
    if (goal.type === 'match') { refuse(p, fresh, {type: 'cant', goal: i, pick: [[0, 0], [0, 1]]}, 'a claim on a goal to show'); return; }
    // Before an attempt: no claim, whatever the taps.
    const pick = goal.type === 'centre' ? P : [[0, 0], goal.type === 'cant' && M.isFamily(goal) ? 3 : [0, 1]];
    refuse(p, fresh, {type: goal.type, goal: i, pick}, 'a claim before an attempt');
    refuse(p, fresh, {type: goal.type === 'cant' ? 'shortest' : 'cant', goal: i, pick}, 'a claim of the wrong kind');
  });
  refuse(p, fresh, {type: 'cant', goal: 9, pick: [[0, 0], [0, 1]]}, 'a goal that isn’t there');
  for (const action of [{type: 'slide', by: 1}, ...(q.tools.length ? [{type: q.tools[0]}] : [])]) refuse(p, solvedAttempt, action, 'a move after the solve');
}

function checkForged(p, fresh, solvedAttempt) {
  const q = p.parameters, P = q.cell[0].length, b = fresh.board, s = solvedAttempt.board;
  const reject = (board, why) => assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  reject({...b, extra: 1}, 'an extra field');
  reject({...b, copy: {s: 1, f: 1, u: P + 1}}, 'a copy past a cell');
  reject({...b, copy: {s: 2, f: 1, u: 0}}, 'a copy stretched');
  reject({...b, cell: [b.cell[0]]}, 'one row');
  reject({...b, cell: b.cell.map(row => [...row, null])}, 'a longer cell');
  reject({...b, cell: b.cell.map(row => row.map(() => 7))}, 'an unknown form');
  if (q.edit === 'none') reject({...b, cell: b.cell.map((row, r) => row.map((v, c) => (r === 0 && c === 0 ? (v === null ? 0 : null) : v)))}, 'a changed border');
  if (q.edit === 'move') reject({...b, cell: b.cell.map((row, r) => row.map((v, c) => (r === 0 && c === 0 ? (v === null ? 2 : null) : v)))}, 'an F more or less');
  reject({...b, copy: {s: 1, f: 1, u: 1}}, 'a copy slid but not tried');
  if (q.tools.includes('flip')) reject({...b, copy: {s: 1, f: -1, u: 0}}, 'a copy flipped but not tried');
  reject({...b, tried: ['teleport']}, 'an unknown attempt');
  reject({...b, tried: ['flip', 'flip']}, 'an attempt twice');
  q.goals.forEach((goal, i) => {
    if (goal.type === 'match') { if (!M.matchable(b.cell, goal)) reject({...b, shown: [i], tried: [M.showKey(goal)]}, `goal ${i} shown on a border where it can’t be`); return; }
    const pick = goal.type === 'centre' ? P : [[0, 0], M.isFamily(goal) ? 3 : [0, 1]];
    reject({...b, done: [{goal: i, pick}]}, `a forged done for goal ${i}`);
    const r = {goal: i, pick, why: 'nearer', cell: b.cell, ...(goal.type === 'shortest' ? {copy: b.copy} : {})};
    reject({...b, refused: [r, r], last: {goal: i, ok: false}}, `a forged refusal for goal ${i}`);
  });
  // A solved board with the attempts behind it taken away: none at all, a
  // shown move's own, or a Shortest's slide or glide by its length.
  reject({...s, tried: []}, 'a solve with nothing tried');
  q.goals.forEach((goal, i) => {
    if (goal.type === 'match') reject({...s, tried: s.tried.filter(k => k !== M.showKey(goal))}, `goal ${i} shown without its attempt`);
    if (goal.type === 'shortest') { const key = `${goal.move}:${M.shortestOf(s.cell, goal.move)}`; reject({...s, tried: s.tried.filter(k => k !== key)}, `a Shortest done without the copy going that far (goal ${i})`); }
  });
  if (M.fits(s.cell, s.copy)) reject({...s, tried: s.tried.filter(k => !M.keysOf(s.copy).includes(k))}, 'a matching copy whose own attempt is not on record');
  // Refusals: each about a board the puzzle can have, judged again on it.
  const claimIndex = q.goals.findIndex(g => g.type !== 'match');
  if (claimIndex >= 0) {
    const goal = q.goals[claimIndex], one = [Array(P).fill(0), Array(P).fill(null)];
    const pick = goal.type === 'centre' ? P : [[0, 0], M.isFamily(goal) ? 3 : [0, 1]];
    if (q.edit === 'free') reject({...b, refused: [{goal: claimIndex, pick, why: 'gap', cell: one}]}, 'a refusal on a border with a row empty');
    reject({...b, refused: [{goal: claimIndex, pick, why: 'there', cell: [[7], [7]]}]}, 'a refusal on a cell that can’t be');
    if (goal.type === 'shortest') reject({...b, refused: [{goal: claimIndex, pick: [[0, 0], [1, 0]], why: 'class', cell: b.cell}]}, 'a Shortest refusal without its copy');
  }
  // The solved board with one claim's pick or attempt taken away.
  for (const d of s.done) {
    const goal = q.goals[d.goal];
    const other = goal.type === 'centre' ? d.pick + 1 : M.isFamily(goal) ? [d.pick[0], (d.pick[1] + 1) % 4] : [d.pick[0], [d.pick[1][0] + 1, d.pick[1][1]]];
    reject({...s, done: s.done.map(x => (x === d ? {...x, pick: other} : x))}, `a done claim with the wrong pick (goal ${d.goal})`);
    if (goal.type === 'cant') reject({...s, tried: s.tried.filter(k => k !== M.tryKey(goal))}, `a done Can’t with no attempt (goal ${d.goal})`);
  }
  reject({...s, last: {goal: 0, ok: false}}, 'a last claim refused that wasn’t');
  if (s.done.length) reject({...s, done: [...s.done, ...s.done]}, 'a claim done twice');
  if (q.goals.some(g => g.type === 'match')) assert.equal(isSolved(p, {...s, shown: []}), false, `${p.id}: no solve with nothing shown`);
  // The review's forged saves (October 17).
  const forged = {
    'friezes-02': [{...b, done: [{goal: 0, pick: [[0, 0], [2, 0]]}], last: null}],
    'friezes-07': [{...b, done: [{goal: 0, pick: [[0, 0], [4, 0]]}, {goal: 1, pick: [[0, 0], [2, 1]]}], last: null}],
    'friezes-11': [{...b, done: [{goal: 0, pick: [[4, 0], [-2, 0]]}, {goal: 1, pick: [[4, 0], [7, 1]]}], last: null}],
    'friezes-03': [{...b, cell: [[0, null], [null, 2]], copy: {s: 1, f: -1, u: 0}, tried: ['flip'], shown: [0], done: [{goal: 1, pick: [[0, 0], [0, 1]]}], refused: [], last: null}],
    'friezes-10': [{...b, cell: [[null, 1, 0, null], [null, 3, 2, null]], copy: {s: 1, f: 1, u: 0}, tried: [], shown: [0, 1], done: [{goal: 2, pick: 4}], refused: [], last: null}]
  }[p.id] || [];
  for (const board of forged) { reject(board, 'the review’s forged save'); assert.equal(isSolved(p, board), false, `${p.id}: the review’s forged save is not solved`); }
  // A solved board made of forged claims on a border that isn't an answer.
  if (q.edit !== 'none') {
    const shown = q.goals.flatMap((g, i) => (g.type === 'match' ? [i] : []));
    reject({...b, shown, done: q.goals.flatMap((g, i) => (g.type === 'match' ? [] : [{goal: i, pick: s.done.find(d => d.goal === i).pick}])), tried: ['flip', 'glide', 'mirror', 'slide', 'slide:2', 'turn'].sort()}, 'a forged solve on the starting border');
  }
}

function checkPlayground(p, fresh) {
  const mech = mechanicFor(p);
  assert.equal(mech.noHint(p), true, `${p.id}: no Hint`);
  assert.equal(fresh.board.cell[0].length, p.parameters.start, `${p.id}: starts with its cell length`);
  let a = play(p, fresh, {type: 'put', c: 0, r: 0, form: 0});
  a = play(p, a, {type: 'put', c: 0, r: 1, form: 2});
  a = play(p, a, {type: 'flip'});
  assert.ok(M.fits(a.board.cell, a.board.copy), `${p.id}: the flip matches A over its flipped-down twin`);
  a = play(p, a, {type: 'mirror'});
  a = play(p, a, {type: 'turn'});
  a = play(p, a, {type: 'slide', by: 2});
  a = play(p, a, {type: 'clear', c: 0, r: 1});
  for (const n of M.PERIODS) if (n !== a.board.cell[0].length) { const b = play(p, a, {type: 'period', P: n}); assert.equal(b.board.cell[0].length, n, `${p.id}: a cell of ${n}`); assert.ok(M.sameCopy(b.board.copy, M.HOME), `${p.id}: the copy goes home`); }
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  refuse(p, a, {type: 'period', P: 7}, 'a cell of 7');
  refuse(p, a, {type: 'period', P: a.board.cell[0].length}, 'the same length');
  refuse(p, a, {type: 'cant', goal: 0, pick: [[0, 0], [0, 1]]}, 'a claim');
  refuse(p, a, {type: 'shift', from: [0, 0], to: [1, 0]}, 'moving an F');
  for (const [board, why] of [[{...a.board, tried: []}, 'a puzzle field'], [{...a.board, cell: [[0], [1]]}, 'a cell of 1'], [{cell: a.board.cell}, 'no copy']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

export default validateFriezes;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateFriezes(), null, 1));
