// Independent check of Mirror Couriers (base mechanic `billiard`). Answers are
// recomputed by walking the ball one tick at a time on a scaled lattice, not
// by the unfolding rule in dist/couriers.js; impossible targets are searched
// over every room up to 40 by 40; the corner-map certificates are checked
// against stopping corners found the same way and counted against random taps;
// hints must solve every puzzle from a fresh board, after wrong moves and from
// random states; illegal moves and forged saves (including a forged `done`)
// must be refused. Run: node scripts/validate-couriers.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { billiard, launchesHold } from '../dist/couriers.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The ball as a point moving `run` right and `rise` up per tick on a lattice
// scaled so every wall it can hit is met at a whole tick. It also keeps its
// unfolded position, in rooms, for the stopping copy corner.
const walks = new Map();
export function walk(width, height, rise = 1, run = 1) {
  const key = `${width} ${height} ${rise} ${run}`;
  if (walks.has(key)) return walks.get(key);
  const scale = rise * run, w = width * scale, h = height * scale;
  let x = 0, y = 0, dx = run, dy = rise, ux = 0, uy = 0, bounces = 0;
  for (let tick = 1; tick < 1e7; tick++) {
    x += dx; y += dy; ux += run; uy += rise;
    const side = x === 0 || x === w, end = y === 0 || y === h;
    if (side && end) {
      const out = { corner: `${y === h ? 'top' : 'bottom'}-${x === w ? 'right' : 'left'}`, bounces, across: ux / w, up: uy / h };
      walks.set(key, out);
      return out;
    }
    if (side) { dx = -dx; bounces++; }
    if (end) { dy = -dy; bounces++; }
  }
  throw new Error('the ball never reached a corner');
}
const hits = (out, t) => out.corner === t.corner && (t.bounces === undefined || out.bounces === t.bounces);
const rooms = (cols, rows) => Array.from({ length: rows }, (_, j) => Array.from({ length: cols }, (_, i) => [i + 1, j + 1])).flat();
const roomText = list => list.map(([w, h]) => `${w}×${h}`).sort();
// Aiming at the sheet point (across·width, up·height) is the direction from
// the start to that point: rise up for run across.
const aimWalk = (q, [a, b]) => { const rise = b * q.height, run = a * q.width, g = gcd(rise, run); return walk(q.width, q.height, rise / g, run / g); };

// Fold of copy corner (i, j) onto the room, from first principles: walking
// i room-widths right ends on the left wall when i is even.
const folds = ([i, j]) => `${j % 2 ? 'top' : 'bottom'}-${i % 2 ? 'right' : 'left'}`;

function answersOf(p) {
  const q = p.parameters;
  if (q.mode === 'shape') return roomText(rooms(q.cols, q.rows).filter(([w, h]) => hits(walk(w, h, q.rise ?? 1, q.run ?? 1), q.target)));
  if (q.mode === 'every') return roomText(rooms(q.cols, q.rows).filter(([w, h]) => walk(w, h).bounces === q.bounces));
  if (q.mode === 'aim') return rooms(...q.sheet).filter(c => hits(aimWalk(q, c), q.target)).filter(c => gcd(...c) === 1).map(c => c.join(',')).sort();
  const out = walk(q.width, q.height);
  return [`${out.across},${out.up}`];
}

let stats;
const fresh = p => billiard.fresh(p);
const play = (p, board, actions) => actions.reduce((b, a) => { const next = b && billiard.move(p, b, a); assert.ok(next, `${p.id}: ${JSON.stringify(a)} is legal`); return next; }, board);
function hintsSolve(p, board, label, limit = 60) {
  for (let i = 0; i < limit && !billiard.solved(p, board); i++) {
    const h = billiard.hint(p, board);
    assert.equal(h.type, 'move', `${p.id} ${label}: ${h.text}`);
    assert.ok(typeof h.text === 'string' && h.text.length > 8);
    const next = billiard.move(p, board, h.action);
    assert.ok(next, `${p.id} ${label}: hint ${JSON.stringify(h.action)} is legal`);
    board = next;
  }
  assert.ok(billiard.solved(p, board), `${p.id} ${label}: hints solve it`);
  stats.hintRuns++;
}

// A seeded generator, so every run checks the same random states.
let seed = 9;
const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = list => list[Math.floor(random() * list.length)];

function legalActions(p, b) {
  const q = p.parameters, out = [];
  if (q.mode === 'shape' || q.mode === 'every') for (const room of rooms(q.cols, q.rows)) out.push({ type: 'launch', room });
  if (q.mode === 'shape') { out.push({ type: 'cant' }, { type: 'done' }); for (const at of rooms(...q.map)) out.push({ type: 'tap', at }); }
  if (q.mode === 'every') { out.push({ type: 'done' }); for (const room of rooms(q.cols, q.rows)) out.push({ type: 'keep', room }); }
  if (q.mode === 'aim') for (const aim of rooms(...q.sheet)) out.push({ type: 'launch', aim });
  if (q.mode === 'cross') { out.push({ type: 'again' }); for (let j = 0; j <= q.sheet[1]; j++) for (let i = 0; i <= q.sheet[0]; i++) if (i || j) out.push({ type: 'tap', at: [i, j] }); }
  return out.filter(a => billiard.move(p, b, a));
}

export default async function validateCouriers() {
  const pack = JSON.parse(await readFile(new URL('../dist/puzzles.json', import.meta.url), 'utf8'));
  const puzzles = pack.puzzles.filter(p => p.mechanic === 'billiard');
  stats = { puzzles: puzzles.length, launches: 0, impossible: [], certificates: {}, oneRefusal: 0, finalPicks: 0, fallingTallies: 0, hintRuns: 0, refusedForgeries: 0, illegalMoves: 0 };
  seed = 9;
  for (const p of puzzles) check(p);
  return stats;
}

function check(p) {
  const q = p.parameters, forgedTold = [];
  // 1. Answers, by the lattice walk, match the catalog and the mechanic.
  const answers = answersOf(p);
  assert.deepEqual(answers, [...p.solution.answers].sort(), `${p.id}: answers`);
  if (q.mode === 'shape' || q.mode === 'every' || q.mode === 'aim') {
    const list = q.mode === 'aim' ? rooms(...q.sheet) : rooms(q.cols, q.rows);
    for (const c of list) {
      const action = q.mode === 'aim' ? { type: 'launch', aim: c } : { type: 'launch', room: c };
      const after = billiard.move(p, fresh(p), action);
      stats.launches++;
      assert.ok(after, `${p.id}: launch ${c}`);
      const out = q.mode === 'aim' ? aimWalk(q, c) : walk(c[0], c[1], q.rise ?? 1, q.run ?? 1);
      if (q.mode === 'every') assert.equal(after.done, false, 'a launch alone never finishes find-every');
      else assert.equal(after.done, hits(out, q.target), `${p.id}: launch ${c} is judged by where the ball stops`);
    }
  }
  if (q.mode === 'cross') {
    for (let j = 0; j <= q.sheet[1]; j++) for (let i = 0; i <= q.sheet[0]; i++) if (i || j) {
      const after = billiard.move(p, fresh(p), { type: 'tap', at: [i, j] });
      assert.equal(after.done, answers[0] === `${i},${j}`, `${p.id}: tap ${i},${j}`);
    }
    // The drawn 45° line (to the sheet's shorter side) meets at least two
    // points where a side wall and an end wall of the copies cross.
    let meets = 0;
    for (let t = 1; t <= Math.min(q.sheet[0] * q.width, q.sheet[1] * q.height); t++) if (t % q.width === 0 && t % q.height === 0) meets++;
    assert.ok(meets >= 2, `${p.id}: the line meets ${meets} crossing, so the first is no choice`);
    // A pick on the line past the first crossing is final: no further tap,
    // not even the right one, until Again; a pick off the line can be retried.
    const out = walk(q.width, q.height), [a, u] = [out.across, out.up];
    for (let j = 0; j <= q.sheet[1]; j++) for (let i = 0; i <= q.sheet[0]; i++) if (i || j) {
      const after = billiard.move(p, fresh(p), { type: 'tap', at: [i, j] });
      const later = i % a === 0 && j % u === 0 && i / a === j / u && i / a >= 2;
      if (after.done) continue;
      assert.equal(billiard.move(p, after, { type: 'tap', at: [a, u] }) === null, later, `${p.id}: after ${i},${j} the first crossing is ${later ? 'refused' : 'still open'}`);
      const again = billiard.move(p, after, { type: 'again' });
      assert.equal(again === null, !later, `${p.id}: Again only after a final pick`);
      if (later) {
        assert.deepEqual(again, fresh(p), `${p.id}: Again starts over`);
        const html = billiard.render(p, { board: after, hintLevel: 0 });
        assert.match(html, /class="cr-unfold"/, `${p.id}: the line is drawn to where it really stops`);
        assert.match(html, /data-focus="cr-again"/);
        stats.finalPicks++;
      }
    }
    assert.equal(billiard.noUndo(p), true, `${p.id}: a final pick has no Undo`);
  } else assert.equal(billiard.noUndo(p), false);

  // 1b. Every launch counts once, and Undo (the mechanic's carry) keeps the count.
  if (q.mode !== 'cross') {
    const launchesOf = list => list.map(c => (q.mode === 'aim' ? { type: 'launch', aim: c } : { type: 'launch', room: c }));
    const misses = (q.mode === 'aim' ? rooms(...q.sheet).filter(c => !hits(aimWalk(q, c), q.target)) : rooms(q.cols, q.rows).filter(([w, h]) => q.mode === 'every' || !hits(walk(w, h, q.rise ?? 1, q.run ?? 1), q.target))).slice(0, 3);
    let b = fresh(p);
    const line = [b];
    for (const action of launchesOf(misses)) { b = billiard.move(p, b, action); line.push(b); }
    assert.equal(b.launches, misses.length, `${p.id}: one count per launch`);
    for (let k = line.length - 2; k >= 0; k--) { b = billiard.carry(p, b, line[k]); assert.equal(b.launches, misses.length, `${p.id}: Undo keeps the launch count`); assert.ok(billiard.valid(p, b)); }
    // The saved line of play: tallies that never fall hold; a tally forged
    // below an earlier board's is refused.
    const history = line.slice(0, -1).map((board, moves) => ({ board, moves }));
    assert.equal(launchesHold({ history, board: line.at(-1) }), true);
    assert.equal(launchesHold({ history: history.slice(0, 1), board: b }), true, `${p.id}: after Undo the board keeps the higher tally`);
    assert.equal(launchesHold({ history, board: { ...line.at(-1), launches: history.at(-1).board.launches - 1 } }), false, `${p.id}: a tally lowered below the history is refused`);
    assert.equal(launchesHold({ history: [...history.slice(0, -1), { ...history.at(-1), board: { ...history.at(-1).board, launches: line.at(-1).launches + 5 } }], board: line.at(-1) }), false, `${p.id}: a history tally above the board's is refused`);
    stats.fallingTallies += 2;
  }

  // 2. Impossible targets: no room up to 40 by 40 meets them, and the corner
  // map's certificate holds for every stop found that way.
  if (q.mode === 'shape' && !answers.length) {
    stats.impossible.push(p.id);
    for (const [w, h] of rooms(40, 40)) {
      const out = walk(w, h, q.rise ?? 1, q.run ?? 1);
      assert.ok(!hits(out, q.target), `${p.id}: ${w}×${h} is a way`);
      assert.equal(folds([out.across, out.up]), out.corner, 'the stop folds from its copy corner');
      assert.equal(out.bounces, out.across + out.up - 2, 'one bounce per copy wall crossed');
      assert.equal(gcd(out.across, out.up), 1, 'the stop is the first copy corner on its line');
    }
    // Copy corners: which are a first stop, and after how many bounces.
    const map = rooms(...q.map), first = c => gcd(...c) === 1, bounces = ([i, j]) => i + j - 2;
    const claim = taps => {
      let b = play(p, fresh(p), [{ type: 'launch', room: q.start }, { type: 'cant' }]);
      for (const at of taps) { b = billiard.move(p, b, { type: 'tap', at }); if (!b) return false; if (b.done) return true; }
      if (q.target.bounces === undefined) return Boolean(b?.done);
      b = billiard.move(p, b, { type: 'done' });
      return Boolean(b?.done);
    };
    if (q.target.bounces !== undefined) {
      const need = map.filter(c => first(c) && bounces(c) === q.target.bounces), optional = map.filter(c => !first(c) && bounces(c) === q.target.bounces);
      assert.ok(need.length >= 2 && need.every(c => folds(c) !== q.target.corner), `${p.id}: the line holds no target corner`);
      assert.equal(claim(need), true, `${p.id}: the certificate is accepted`);
      if (optional.length) assert.equal(claim([...need, ...optional]), true, 'corners that are not first may be included');
      for (const c of need) assert.equal(claim(need.filter(x => x !== c)), false, `${p.id}: a missing corner is refused`);
      const extra = map.find(c => bounces(c) !== q.target.bounces);
      assert.equal(claim([...need, extra]), false, `${p.id}: a corner off the line is refused`);
      forgedTold.push({ code: 'wrong', sel: need });
      let wins = 0;
      const tries = 20000;
      for (let t = 0; t < tries; t++) {
        const size = 1 + Math.floor(random() * Math.min(map.length, need.length + optional.length + 3));
        const taps = [...map].sort(() => random() - .5).slice(0, size);
        if (claim(taps)) wins++;
      }
      stats.certificates[p.id] = `${wins} of ${tries} random tap sets`;
      assert.ok(wins / tries < .01, `${p.id}: random taps solve the certificate too often`);
    } else {
      const homes = map.filter(c => folds(c) === q.target.corner);
      for (const c of homes) {
        const before = map.filter(x => x[0] < c[0] && x[0] * c[1] === x[1] * c[0]);
        assert.ok(before.some(x => x[0] * 2 === c[0]), `${p.id}: halfway to ${c} is a copy corner`);
        for (const x of before) assert.equal(claim([c, x]), true, `${p.id}: ${c} then ${x}`);
        assert.equal(claim([c, map.find(x => !before.some(y => same(x, y)) && !same(x, c))]), false, `${p.id}: a corner off the way is refused`);
      }
      assert.equal(claim([[1, 1], [1, 2]]), false, `${p.id}: a first tap that is not the goal corner is refused`);
      let wins = 0, tries = 0;
      for (const a of map) for (const b of map) if (!same(a, b)) { tries++; if (claim([a, b])) wins++; }
      stats.certificates[p.id] = `${wins} of ${tries} tap pairs`;
      assert.ok(wins / tries < .03, `${p.id}: random pairs solve the certificate too often`);
    }
  }

  // 2b. A wrong line claim always gets the same refusal, without a ring: one
  // corner on the line and one corner off it are refused alike.
  if (q.mode === 'shape' && q.target.bounces !== undefined) {
    const map = rooms(...q.map), bounces = ([i, j]) => i + j - 2;
    const refusal = taps => {
      let b = play(p, fresh(p), [{ type: 'launch', room: rooms(q.cols, q.rows).find(([w, h]) => !hits(walk(w, h, q.rise ?? 1, q.run ?? 1), q.target)) }, { type: 'cant' }, ...taps.map(at => ({ type: 'tap', at }))]);
      b = billiard.move(p, b, { type: 'done' });
      assert.ok(b && !b.done && !b.way, `${p.id}: ${JSON.stringify(taps)} is refused`);
      const html = billiard.render(p, { board: b, hintLevel: 0 });
      assert.doesNotMatch(html, /refused/, `${p.id}: a refusal rings nothing`);
      return { told: b.told, status: html.match(/<p class="cr-status[^"]*" role="status">([^<]*)<\/p>/)[1] };
    };
    const on = map.find(c => gcd(...c) === 1 && bounces(c) === q.target.bounces), off = map.find(c => bounces(c) !== q.target.bounces);
    const a = refusal([on]), b = refusal([off]);
    assert.deepEqual([a.told.code, b.told.code, Object.keys(a.told).sort().join()], ['wrong', 'wrong', 'code,sel'], `${p.id}: one refusal`);
    assert.ok(a.status && a.status === b.status, `${p.id}: the refusal does not tell a missing corner from a wrong one`);
    stats.oneRefusal++;
  }

  // 3. Hints solve from a fresh board, after wrong moves and from random states.
  hintsSolve(p, fresh(p), 'fresh');
  const wrong = [];
  if (q.mode === 'shape' || q.mode === 'every') {
    const miss = rooms(q.cols, q.rows).find(([w, h]) => q.mode === 'every' ? walk(w, h).bounces !== q.bounces : !hits(walk(w, h, q.rise ?? 1, q.run ?? 1), q.target));
    wrong.push([{ type: 'launch', room: miss }]);
    if (q.mode === 'shape') {
      wrong.push([{ type: 'launch', room: miss }, { type: 'cant' }]);
      wrong.push([{ type: 'launch', room: miss }, { type: 'cant' }, { type: 'tap', at: [1, 1] }]);
      if (q.target.bounces !== undefined) wrong.push([{ type: 'launch', room: miss }, { type: 'cant' }, { type: 'tap', at: [1, 1] }, { type: 'done' }]);
    } else {
      wrong.push([{ type: 'keep', room: miss }], [{ type: 'keep', room: miss }, { type: 'done' }]);
    }
  } else if (q.mode === 'aim') {
    wrong.push([{ type: 'launch', aim: rooms(...q.sheet).find(c => !hits(aimWalk(q, c), q.target)) }]);
  } else {
    const out = walk(q.width, q.height);
    wrong.push([{ type: 'tap', at: [1, 0] }], [{ type: 'tap', at: [1, 1] }], [{ type: 'tap', at: [2 * out.across, 2 * out.up] }]);
  }
  for (const actions of wrong) hintsSolve(p, play(p, fresh(p), actions), `after ${JSON.stringify(actions)}`);
  for (let run = 0; run < 25; run++) {
    let b = fresh(p);
    for (let k = 0, n = 1 + Math.floor(random() * 10); k < n && !b.done; k++) { const moves = legalActions(p, b); if (!moves.length) break; b = billiard.move(p, b, pick(moves)); }
    if (!b.done) hintsSolve(p, b, `random state ${run}`);
  }

  // 4. Illegal moves are refused.
  const illegal = [null, {}, { type: 'fly' }, { type: 'launch' }, { type: 'launch', room: [0, 1] }, { type: 'launch', room: [1.5, 1] }, { type: 'launch', room: ['1', '1'] },
    { type: 'launch', aim: [0, 0] }, { type: 'tap', at: [-1, 0] }, { type: 'tap', at: [1, 1, 1] }, { type: 'keep', room: [99, 1] }, { type: 'again' }];
  if (q.mode === 'shape' || q.mode === 'every') illegal.push({ type: 'launch', room: [q.cols + 1, 1] }, { type: 'launch', room: [1, q.rows + 1] });
  if (q.mode === 'shape') illegal.push({ type: 'cant' }, { type: 'tap', at: [1, 1] }, { type: 'done' }, { type: 'keep', room: [1, 1] });
  if (q.mode === 'every') illegal.push({ type: 'done' }, { type: 'cant' });
  if (q.mode === 'aim') illegal.push({ type: 'launch', aim: [q.sheet[0] + 1, 1] }, { type: 'tap', at: [1, 1] });
  if (q.mode === 'cross') illegal.push({ type: 'tap', at: [q.sheet[0] + 1, 0] }, { type: 'tap', at: [0, 0] }, { type: 'launch', room: [1, 1] });
  for (const action of illegal) { assert.equal(billiard.move(p, fresh(p), action), null, `${p.id}: ${JSON.stringify(action)} is refused`); stats.illegalMoves++; }
  const solved = play(p, fresh(p), p.solution.moves);
  assert.ok(billiard.solved(p, solved));
  for (const action of legalActions(p, fresh(p)).slice(0, 5)) assert.equal(billiard.move(p, solved, action), null, `${p.id}: no move after the solve`);

  // 5. Forged saves are refused, including a forged done and a forged count.
  const forged = [];
  const base = fresh(p);
  forged.push({ ...base, done: true });
  forged.push({ ...base, extra: 1 });
  if (q.mode !== 'cross') forged.push({ ...base, launches: -1 }, { ...base, launches: 1.5 }, { ...base, launches: '1' }, { ...base, launches: 1e9 });
  if (q.mode === 'shape') {
    const miss = rooms(q.cols, q.rows).find(([w, h]) => !hits(walk(w, h, q.rise ?? 1, q.run ?? 1), q.target));
    forged.push({ ...base, room: miss, launches: 0 }, { ...base, room: miss, launches: 1, done: true }, { ...base, cert: [] }, { ...base, way: true }, { ...base, room: [q.cols + 1, 1], launches: 1 });
    forged.push({ ...base, room: miss, launches: 1, cert: [[1, 1]], told: { code: 'another', sel: [[1, 1]] } }, { ...base, room: miss, launches: 1, cert: [], told: { code: 'off', at: [1, 1], sel: [[1, 1]] } });
    for (const told of forgedTold) forged.push({ ...base, room: miss, launches: 1, cert: [], told });
    if (answers.length) {
      const [w, h] = answers[0].split('×').map(Number);
      forged.push({ ...base, room: [w, h], launches: 1, done: false }, { ...base, room: [w, h], launches: 0, done: true }, { ...base, room: [w, h], launches: 1, cert: [], done: true }, { ...base, room: miss, launches: 1, cert: [], way: false, done: true });
    } else {
      forged.push({ ...base, room: miss, launches: 1, way: true }, { ...base, room: miss, launches: 1, cert: [[1, 1]], done: true }, { ...base, room: miss, launches: 1, cert: [], done: true });
    }
  }
  if (q.mode === 'every') {
    const answerRooms = answers.map(a => a.split('×').map(Number));
    forged.push({ ...base, room: [1, 1], launches: 0 }, { ...base, kept: answerRooms.slice(1), done: true }, { ...base, kept: [...answerRooms, [1, 1]], done: true }, { ...base, kept: answerRooms, refused: [answerRooms.map(r => r.join(',')).sort().join(' ')] }, { ...base, told: { code: 'another' } }, { ...base, kept: [[1, 1], [1, 1]] });
  }
  if (q.mode === 'aim') {
    const miss = rooms(...q.sheet).find(c => !hits(aimWalk(q, c), q.target)), hit = answers[0].split(',').map(Number);
    forged.push({ aim: miss, done: true, launches: 1 }, { aim: null, done: true, launches: 1 }, { aim: [0, 1], done: false, launches: 1 }, { aim: hit, done: true, launches: 0 }, { aim: miss, done: false });
  }
  if (q.mode === 'cross') { const [a, u] = answers[0].split(',').map(Number); forged.push({ tap: [1, 1], done: true }, { tap: [0, 0], done: false }, { tap: [a, u], done: false }, { tap: [2 * a, 2 * u], done: true }); }
  for (const board of forged) {
    assert.equal(billiard.valid(p, board), false, `${p.id}: forged ${JSON.stringify(board)}`);
    assert.equal(billiard.solved(p, board), false);
    stats.refusedForgeries++;
  }
  // The legacy revision-1 board is not a current board.
  assert.equal(billiard.valid(p, { prediction: null }), false);
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateCouriers(), null, 2));
