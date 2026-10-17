// Checks the Chip firing pack (dist/families/chips/chips.json): content fields
// and sources, every answer set against an independent brute-force simulator,
// the order-independence facts the notes rely on, hint chains to completion,
// illegal moves, Undo keeping discoveries and refusals, That's all judging the
// shelf as a whole, the Still boards group (capacity and the add-one cycle,
// with the certificate's chance of being tapped by luck), forged saves, and
// the playground boards.
// Run: node scripts/validate-chips.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {BOARDS, PLAYGROUND_BOARDS, GRID, answers, settleGrid, stillRun, stillAnswers} from '../dist/families/chips/chips.js';
import {loadPack} from './packs.mjs';

// An independent simulator: piles keyed by letter, edges read directly.
function sim(boardName) {
  const b = BOARDS[boardName], ids = Object.keys(b.nodes);
  const lines = id => b.edges.filter(e => e.includes(id)).map(([x, y]) => x === id ? y : x);
  const fire = (piles, id) => {
    const out = lines(id);
    if (piles[id] < out.length) return null;
    const next = {...piles, [id]: piles[id] - out.length};
    let sink = 0;
    for (const to of out) if (to === 'S') sink++; else next[to]++;
    return {piles: next, sink};
  };
  const ready = piles => ids.filter(id => piles[id] >= lines(id).length);
  const toPiles = list => Object.fromEntries(ids.map((id, i) => [id, list[i]]));
  const toList = piles => ids.map(id => piles[id]);
  // Every complete legal run (on boards with a sink), or a repeat check (without).
  const runs = start => {
    const out = [];
    (function walk(piles, word, sink) {
      const r = ready(piles);
      if (!r.length) { out.push({word, finish: toList(piles), sink}); return; }
      assert.ok(word.length < 200, `${boardName}: run terminates`);
      for (const id of r) { const n = fire(piles, id); walk(n.piles, word + id, sink + n.sink); }
    })(toPiles(start), '', 0);
    return out;
  };
  const loops = start => {
    let piles = toPiles(start);
    const seen = new Set([JSON.stringify(piles)]);
    for (let k = 0; k < 100; k++) {
      const r = ready(piles);
      if (!r.length) return false;
      piles = fire(piles, r[0]).piles;
      if (seen.has(JSON.stringify(piles))) return true;
      seen.add(JSON.stringify(piles));
    }
    throw new Error('no decision');
  };
  const splits = (total, slots) => slots === 1 ? [[total]] : Array.from({length: total + 1}, (_, k) => splits(total - k, slots - 1).map(rest => [k, ...rest])).flat();
  return {ids, lines, runs, loops, splits};
}
// The puzzle's answers, recomputed from scratch.
function expected(p) {
  const q = p.parameters, s = sim(q.board), keys = new Set();
  if (q.mode === 'orders') {
    const all = s.runs(q.start);
    // The stabilization theorem on this start: one finish, one count per circle.
    assert.equal(new Set(all.map(r => r.finish.join(','))).size, 1, `${p.id}: one finish`);
    assert.equal(new Set(all.map(r => s.ids.map(id => [...r.word].filter(c => c === id).length).join(','))).size, 1, `${p.id}: one firing count per circle`);
    for (const r of all) keys.add(r.word);
    return keys;
  }
  if (q.mode === 'avalanche') {
    const caps = s.ids.map(id => s.lines(id).length);
    const bases = caps.reduce((list, cap) => list.flatMap(base => Array.from({length: cap}, (_, k) => [...base, k])), [[]]);
    let best = 0;
    for (const base of bases) for (const [i, id] of s.ids.entries()) {
      const start = [...base]; start[i]++;
      const lengths = new Set(s.runs(start).map(r => r.word.length));
      assert.equal(lengths.size, 1, `${p.id}: one avalanche length`);
      const n = [...lengths][0];
      best = Math.max(best, n);
      if (n >= q.firings) keys.add(`${base.join(',')}+${id}`);
    }
    assert.equal(best, q.firings, `${p.id}: the target is the largest avalanche`);
    return keys;
  }
  let most = 0;
  for (const start of s.splits(q.chips, s.ids.length)) {
    if (q.mode === 'loop') { if (s.loops(start)) keys.add(start.join(',')); continue; }
    const all = s.runs(start), finish = all[0].finish.join(','), n = all[0].word.length;
    assert.ok(all.every(r => r.finish.join(',') === finish && r.word.length === n), `${p.id}: ${start} has one finish and one length`);
    most = Math.max(most, n);
    if (q.mode === 'finishes') keys.add(finish);
    if (q.mode === 'starts' && finish === q.finish.join(',')) keys.add(start.join(','));
    if (q.mode === 'firings' && n === q.firings) keys.add(start.join(','));
  }
  if (q.mode === 'firings') assert.equal(most, q.firings, `${p.id}: the target is the most firings`);
  return keys;
}

// A small seeded random source, so a failure can be replayed.
function seeded(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; }
// One step of Undo as the app takes it (undoPress in dist/engine.js): back a step, then the mechanic's carry.
const takeBack = (p, a) => { const b = undo(a); return b === a ? a : {...b, board: mechanicFor(p).carry(p, a.board, b.board)}; };
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next && next !== x, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, a);
const cpu = () => { const t = process.cpuUsage(); return (t.user + t.system) / 1000; };

// That's all on the shelf puzzles: off with nothing shelved, one refusal that
// names no count, off again until the shelf grows, kept by New run and Undo.
function checkThatsAll(p) {
  const q = p.parameters, m = mechanicFor(p);
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'all'}), null, `${p.id}: That's all is off with an empty shelf`);
  while (a.board.found.length < 1) a = move(p, a, nextHint(p, a).action);
  if (q.answers === 1) return;
  a = play(p, a, [{type: 'all'}]);
  assert.equal(a.board.claim, 'more', `${p.id}: an incomplete shelf is refused`);
  assert.equal(a.board.told, true, `${p.id}: the refusal is shown`);
  assert.equal(isSolved(p, a.board), false);
  assert.equal(move(p, a, {type: 'all'}), null, `${p.id}: That's all stays off until the shelf changes`);
  const back = takeBack(p, a);
  assert.equal(back.board.claim, 'more', `${p.id}: Undo keeps the lock`);
  assert.equal(back.board.told, undefined, `${p.id}: Undo takes away the refusal's line, so the screen changes`);
  assert.equal(move(p, back, {type: 'all'}), null, `${p.id}: and That's all stays off after Undo`);
  assert.equal(validBoard(p, {...back.board, told: 'yes'}), false, `${p.id}: a line is only ever true`);
  assert.equal(validBoard(p, {...freshAttempt(p).board, told: true, claim: 'all'}), false, `${p.id}: no line on a solve`);
  let b = a;
  while (b.board.found.length === a.board.found.length) {
    const hint = nextHint(p, b);
    b = move(p, b, hint.action);
    if (hint.action.type === 'again') assert.equal(b.board.claim, 'more', `${p.id}: New run keeps the refusal`);
  }
  assert.equal(b.board.claim, 'open', `${p.id}: a new answer on the shelf opens That's all`);
}

// An independent simulator for the Still boards group.
function stillSim(boardName) {
  const s = sim(boardName);
  const settle = start => { const all = s.runs(start); return all[0].finish; };
  const still = s.ids.reduce((list, id) => list.flatMap(b => Array.from({length: s.lines(id).length}, (_, n) => [...b, n])), [[]]);
  return {...s, settle, still};
}
// Plays a start and its additions at the drop circle with the mechanic's own moves.
function playCycle(p, start, additions, random = null, from = null) {
  const q = p.parameters, ids = Object.keys(BOARDS[q.board].nodes);
  let a = from || freshAttempt(p);
  start.forEach((n, i) => { for (let k = 0; k < n; k++) a = play(p, a, [{type: 'add', node: ids[i]}]); });
  for (let k = 0; k < additions && !stillRun(p, a.board).ended; k++) {
    a = play(p, a, [{type: 'drop'}]);
    for (let run = stillRun(p, a.board); run.ready.length; run = stillRun(p, a.board)) {
      const i = random ? run.ready[Math.floor(random() * run.ready.length)] : run.ready[0];
      a = play(p, a, [{type: 'fire', node: ids[i]}]);
    }
  }
  return a;
}
function checkCapacity(p) {
  const q = p.parameters, s = stillSim(q.board), m = mechanicFor(p);
  // The most: over every still board, and the certificate one circle at a time.
  const most = Math.max(...s.still.map(b => b.reduce((x, y) => x + y, 0)));
  assert.equal(q.most, most, `${p.id}: the most on a still board`);
  assert.equal(most, s.ids.reduce((t, id) => t + s.lines(id).length - 1, 0), `${p.id}: the most is the sum of lines less one at each circle`);
  assert.equal(s.still.filter(b => b.reduce((x, y) => x + y, 0) === most).length, 1, `${p.id}: one board holds the most`);
  for (const id of s.ids) {
    const piles = Object.fromEntries(s.ids.map(x => [x, 0])); piles[id] = s.lines(id).length;
    assert.ok(s.runs(s.ids.map(x => piles[x]))[0].word.length > 0, `${p.id}: ${id} fires once it holds a chip per line`);
  }
  // Every still board is reached by adds; Most is right only on the fullest, and a refusal holds.
  for (const b of s.still) {
    let a = freshAttempt(p);
    b.forEach((n, i) => { for (let k = 0; k < n; k++) a = play(p, a, [{type: 'add', node: s.ids[i]}]); });
    const total = b.reduce((x, y) => x + y, 0);
    if (!total) { assert.equal(move(p, a, {type: 'most'}), null, `${p.id}: Most needs a chip on the board`); continue; }
    a = play(p, a, [{type: 'most'}]);
    if (total === most) { assert.ok(isSolved(p, a.board), `${p.id}: ${b} holds the most`); continue; }
    assert.equal(a.board.claim, 'more', `${p.id}: ${b} is refused`);
    assert.equal(move(p, a, {type: 'most'}), null, `${p.id}: Most stays off on the same board`);
    assert.equal(a.board.told, true, `${p.id}: ${b} shows its refusal`);
    assert.equal(takeBack(p, a).board.claim, 'more', `${p.id}: Undo keeps Most off`);
    assert.equal(takeBack(p, a).board.told, undefined, `${p.id}: Undo takes away the line`);
    const short = b.findIndex((n, i) => n < s.lines(s.ids[i]).length - 1);
    assert.equal(play(p, a, [{type: 'add', node: s.ids[short]}]).board.claim, null, `${p.id}: a change of board lifts it`);
  }
  // Most is off while a circle glows; a glowing circle fires rather than takes a chip.
  const full = play(p, freshAttempt(p), s.ids.flatMap(id => Array(s.lines(id).length).fill({type: 'add', node: id})).slice(0, s.lines(s.ids[0]).length));
  assert.equal(move(p, full, {type: 'most'}), null, `${p.id}: no claim while ${s.ids[0]} glows`);
  assert.equal(move(p, full, {type: 'add', node: s.ids[0]}), null, `${p.id}: no chip onto a glowing circle`);
  assert.ok(move(p, full, {type: 'fire', node: s.ids[0]}), `${p.id}: a glowing circle fires`);
  // Forged saves.
  const cap = (piles, claim = null, more = {}) => ({piles, sink: 0, claim, ...more});
  for (const bad of [cap([4, 0, 0]), cap([0, 0, 0], null, {sink: 5}), cap([1, 0, 0], null, {sink: 1}), cap([2, 1, 2], null, {sink: 3, told: true}),cap([2, 1, 2], 'more'), cap([1, 1, 0], 'most'), cap([3, 0, 0], 'more'), cap([0, 0, 0], 'more'), cap([1, 0, 0], null, {told: true}), cap([1, 0, 0], 'more', {told: 1}),
    cap([31, 0, 0]), cap([1, 0]), cap([1.5, 0, 0]), cap([1, 0, 0], null, {sink: -1}), cap([1, 0, 0], null, {sink: 2.5}), cap([1, 0, 0], null, {extra: 1}), cap([1, 0, 0], null, {steps: ''}), {piles: [1, 0, 0], claim: null}, {steps: 'aab', claim: null}])
    assert.equal(validBoard(p, bad), false, `${p.id}: rejects ${JSON.stringify(bad)}`);
  return {most, longGame: checkLongGame(p, 300)};
}
// Long games never run out of room: random legal taps (adds and fires, and in
// the cycle only while placing a start) stay legal up to the chip cap, and
// hints still solve afterwards.
function checkLongGame(p, taps) {
  const random = seeded(29), ids = Object.keys(BOARDS[p.parameters.board].nodes);
  let a = freshAttempt(p), made = 0;
  for (let k = 0; k < taps; k++) {
    const run = stillRun(p, a.board), i = Math.floor(random() * ids.length);
    const action = run.ready.includes(i) ? {type: 'fire', node: ids[i]} : {type: 'add', node: ids[i]};
    const next = move(p, a, action);
    if (next) { a = next; made++; continue; }
    assert.ok(run.piles.reduce((x, y) => x + y, 0) >= 30, `${p.id}: tap ${k} (${JSON.stringify(action)}) refused below the chip cap on ${JSON.stringify(a.board)}`);
  }
  assert.ok(made >= taps * 0.9, `${p.id}: ${made} of ${taps} random taps were legal`);
  assert.ok(JSON.stringify(a.board).length < 400, `${p.id}: the board stays small after ${made} moves`);
  for (let n = 0; n < 200 && !isSolved(p, a.board); n++) a = play(p, a, [nextHint(p, a).action]);
  assert.ok(isSolved(p, a.board), `${p.id}: hints solve after a long game`);
  return made;
}
function checkCycle(p) {
  const q = p.parameters, s = stillSim(q.board), key = b => b.join(',');
  const drop = s.ids.indexOf(q.at);
  // The map on still boards: one chip at the drop circle, then settle (any order: the sim's first run).
  const next = b => { const start = [...b]; start[drop]++; return s.settle(start); };
  const image = new Map(s.still.map(b => [key(b), key(next(b))]));
  const comesBack = s.still.filter(b => { let x = key(b); for (let k = 0; k < s.still.length; k++) { x = image.get(x); if (x === key(b)) return true; } return false; }).map(key);
  assert.deepEqual([...stillAnswers(p).keys()].sort(), [...comesBack].sort(), `${p.id}: the starts that come back`);
  assert.equal(q.answers, comesBack.length);
  const merges = [];
  for (const [i, x] of s.still.entries()) for (const y of s.still.slice(i + 1)) if (image.get(key(x)) === image.get(key(y))) merges.push([key(x), key(y), image.get(key(x))]);
  if (q.board === 'triangle' && q.at === 'A') {
    assert.deepEqual(comesBack.sort(), ['0,1', '1,0', '1,1'], `${p.id}: the three that come back`);
    assert.deepEqual(merges, [['0,0', '1,1', '1,0']], `${p.id}: (0, 0) and (1, 1) both go to (1, 0), and no other two merge`);
  }
  // Every start, played with the mechanic's moves and random firing orders, gives the sim's orbit.
  const random = seeded(11);
  let shares = [];
  for (const start of s.still) {
    const orbit = [key(start)];
    while (!orbit.slice(0, -1).includes(orbit.at(-1)) || orbit.length === 1) orbit.push(image.get(orbit.at(-1)));
    const a = playCycle(p, start, 20, random), run = stillRun(p, a.board);
    assert.deepEqual(run.record.map(key), orbit, `${p.id}: the row from ${start}`);
    assert.equal(run.returned, comesBack.includes(key(start)), `${p.id}: ${start} comes back or not`);
    assert.deepEqual(a.board.found, run.returned ? [key(start)] : [], `${p.id}: only a start that came back is shelved`);
    // The certificate: of all ordered pairs of different boards in the row
    // (the same board twice is not a claim), how many would pass.
    const n = run.record.length;
    let pass = 0, pairs = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (orbit[i] !== orbit[j]) { pairs++; if (image.get(orbit[i]) === image.get(orbit[j])) pass++; }
    if (run.returned) assert.equal(pass, 0, `${p.id}: a row that comes back has no two boards that merge`);
    else { assert.ok(pass > 0, `${p.id}: a row that doesn't come back shows where it merges`); shares.push(pass / pairs); }
  }
  for (const share of shares) assert.ok(share <= 0.25, `${p.id}: a random pair of taps passes ${share}`);
  // Judging: a right pair with an incomplete shelf, a wrong pair, the full shelf.
  const pair = r => { for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) if (key(r[i]) !== key(r[j]) && image.get(key(r[i])) === image.get(key(r[j]))) return [i, j]; };
  // One start that comes back on the shelf, then a run from one that doesn't.
  const leak = s.still.find(b => !comesBack.includes(key(b)));
  let b = playCycle(p, s.still.find(b => comesBack.includes(key(b))), 20);
  assert.equal(b.board.found.length, 1);
  b = play(p, b, [{type: 'again'}]);
  const ids = s.ids;
  leak.forEach((n, i) => { for (let k = 0; k < n; k++) b = play(p, b, [{type: 'add', node: ids[i]}]); });
  while (!stillRun(p, b.board).ended) { const run = stillRun(p, b.board); b = play(p, b, [run.ready.length ? {type: 'fire', node: ids[run.ready[0]]} : {type: 'drop'}]); }
  const rec = stillRun(p, b.board).record, right = pair(rec);
  const wrong = [[0, 1], [1, 2], [0, 2]].find(([i, j]) => image.get(key(rec[i])) !== image.get(key(rec[j])));
  assert.equal(move(p, b, {type: 'claim', taps: [0, 0]}), null, `${p.id}: two taps on one board`);
  const twice = rec.findIndex(x => key(x) === key(rec.at(-1)));
  assert.equal(move(p, b, {type: 'claim', taps: [twice, rec.length - 1]}), null, `${p.id}: the same board twice in the row is not a pair (the interface says so)`);
  assert.equal(move(p, b, {type: 'claim', taps: [0, rec.length]}), null, `${p.id}: a tap off the row`);
  const apart = play(p, b, [{type: 'claim', taps: wrong}]);
  assert.equal(apart.board.claim, 'apart', `${p.id}: a wrong pair is refused`);
  assert.equal(apart.board.told, true);
  assert.equal(move(p, apart, {type: 'claim', taps: right}), null, `${p.id}: no second try on the same row`);
  let back = takeBack(p, apart);
  assert.equal(back.board.claim, 'apart', `${p.id}: Undo keeps a refused row locked`);
  assert.equal(back.board.told, undefined, `${p.id}: and takes away its line`);
  // The lock belongs to the row: it stands while Undo stays in the row, and goes with it.
  while (back.board.steps) { back = takeBack(p, back); assert.equal(back.board.claim, back.board.steps ? 'apart' : 'open', `${p.id}: the refused pair at ${JSON.stringify(back.board.steps)}`); }
  const renewed = play(p, apart, [{type: 'again'}]);
  assert.equal(renewed.board.claim, 'open', `${p.id}: New run starts a new row`);
  const past = takeBack(p, renewed);
  assert.equal(past.board.claim, 'apart', `${p.id}: Undo back to the refused row keeps its lock`);
  assert.equal(past.board.told, true, `${p.id}: and shows its line on the board the claim made`);
  assert.equal(takeBack(p, past).board.told, undefined, `${p.id}: the next Undo takes the claim press back`);
  const more = play(p, b, [{type: 'claim', taps: right}]);
  assert.equal(more.board.claim, 'more', `${p.id}: a right pair with a start missing from the shelf is refused`);
  assert.equal(isSolved(p, more.board), false);
  assert.equal(takeBack(p, more).board.claim, 'more', `${p.id}: Undo keeps That's all off`);
  assert.equal(takeBack(p, more).board.told, undefined, `${p.id}: and takes away There is another`);
  assert.equal(play(p, more, [{type: 'again'}]).board.claim, 'more', `${p.id}: New run keeps There is another`);
  // Illegal moves.
  const fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'claim', taps: [0, 1]}), null, `${p.id}: no claim before a run`);
  const started = play(p, fresh, [{type: 'drop'}]);
  assert.equal(move(p, started, {type: 'add', node: ids[0]}), null, `${p.id}: no placing once chips are added at ${q.at}`);
  const glowing = play(p, freshAttempt(p), [{type: 'drop'}, {type: 'drop'}]);
  assert.equal(move(p, glowing, {type: 'drop'}), null, `${p.id}: no chip at ${q.at} while a circle glows`);
  assert.equal(move(p, glowing, {type: 'fire', node: ids[1]}), null, `${p.id}: no firing a circle that can't`);
  assert.equal(move(p, b, {type: 'drop'}), null, `${p.id}: the run ends at a repeat`);
  // Forged saves.
  const zero = s.ids.map(() => 0), returner = playCycle(p, s.still.find(x => comesBack.includes(key(x))), 20).board;
  for (const bad of [
    {piles: zero, sink: 0, steps: '', found: ['0,0'], claim: 'open', taps: []},
    {piles: zero, sink: 0, steps: '', found: comesBack.slice(0, 1), claim: 'all', taps: [0, 3]},
    {...b.board, found: comesBack, claim: 'all', taps: [0, 1]},
    {...b.board, found: comesBack, claim: 'all', taps: [twice, rec.length - 1]},
    {...b.board, found: comesBack, claim: 'more', taps: []},
    {piles: zero, sink: 0, steps: '', found: [], claim: 'apart', taps: []},
    {piles: zero, sink: 0, steps: '', found: comesBack.slice(0, 1), claim: 'apart', taps: []},
    {...b.board, told: 'yes'},
    {...b.board, claim: 'all', told: true, taps: right, found: comesBack},
    {piles: zero, sink: 3, steps: '', found: [], claim: 'open', taps: []},
    {...returner, found: []},
    {piles: [2, 0], sink: 0, steps: '+', found: [], claim: 'open', taps: []},
    {piles: zero, sink: 0, steps: 'a+a', found: [], claim: 'open', taps: []},
    {piles: zero, sink: 0, steps: '', found: [], claim: 'open', taps: [], extra: true},
    {steps: '', found: [], claim: 'open', taps: []}
  ]) assert.equal(validBoard(p, bad), false, `${p.id}: rejects ${JSON.stringify(bad)}`);
  // A real solve with a sink that play can't give its start is rejected.
  let solve = play(p, b, [{type: 'again'}]);
  for (const k of comesBack) if (!solve.board.found.includes(k)) solve = play(p, playCycle(p, k.split(',').map(Number), 20, null, solve), [{type: 'again'}]);
  const empty = s.ids.map(() => 0);
  while (!stillRun(p, solve.board).ended) { const run = stillRun(p, solve.board); solve = play(p, solve, [run.ready.length ? {type: 'fire', node: ids[run.ready[0]]} : {type: 'drop'}]); }
  assert.deepEqual(stillRun(p, solve.board).record[0], empty);
  solve = play(p, solve, [{type: 'claim', taps: pair(stillRun(p, solve.board).record)}]);
  assert.ok(isSolved(p, solve.board), `${p.id}: the solve`);
  assert.equal(validBoard(p, {...solve.board, sink: 99}), false, `${p.id}: a solve whose empty start has chips in the sink`);
  return {comesBack: comesBack.length, merges: merges.length, certificateShare: Number(Math.max(...shares).toFixed(3)), longGame: checkLongGame(p, 300)};
}
// Hints alone solve from a fresh board, from random legal play, and after refusals.
function checkHints(p, starts) {
  let steps = 0;
  for (const start of starts) {
    let a = start;
    for (let i = 0; !isSolved(p, a.board) && i < 600; i++) {
      const hint = nextHint(p, a);
      assert.equal(hint.type, 'move', `${p.id}: ${hint.text}`);
      const next = move(p, a, hint.action);
      assert.ok(next && next !== a, `${p.id}: hint ${JSON.stringify(hint.action)} is legal from ${JSON.stringify(a.board)}`);
      a = next; steps++;
    }
    assert.ok(isSolved(p, a.board), `${p.id}: hints reach a solve`);
  }
  return steps;
}
function wander(p, seed, length) {
  const random = seeded(seed), ids = Object.keys(BOARDS[p.parameters.board].nodes);
  const options = [...ids.flatMap(node => [{type: 'add', node}, {type: 'fire', node}]), {type: 'drop'}, {type: 'again'}, {type: 'most'}];
  let a = freshAttempt(p);
  for (let k = 0; k < length; k++) {
    const legal = options.map(o => move(p, a, o)).filter(Boolean);
    if (!legal.length || isSolved(p, legal[0].board)) break;
    const next = legal[Math.floor(random() * legal.length)];
    if (isSolved(p, next.board)) break;
    a = next;
    if (random() < 0.15 && a.history.length) a = takeBack(p, a);
  }
  return a;
}


// Every Undo changes what the family draws: play a sequence, then press Undo
// to the start as the app does (undoPress, drawing with the family's own
// render), comparing before and after each press. Returns the presses that
// changed nothing and the number of presses.
function undoTrail(p, actions) {
  const m = mechanicFor(p), view = a => m.render(p, {...a, hintLevel: 0}, {});
  let a = play(p, freshAttempt(p), actions), shown = view(a), k = 0;
  const still = [];
  while (a.history.length) { k++; a = undoPress(p, a, view); const now = view(a); if (now === shown) still.push(k); shown = now; }
  return {still, presses: k};
}
function checkUndoTrails(byId) {
  const f = node => ({type: 'fire', node}), add = node => ({type: 'add', node}), drop = {type: 'drop'}, again = {type: 'again'};
  const empty = [drop, drop, f('A'), drop, drop, f('A'), f('B')];
  const trails = {
    'chips-03 A B A B, That’s all, New run': ['chips-03', [f('A'), f('B'), f('A'), f('B'), {type: 'all'}, again]],
    'chips-03 a refusal, then a second order (shelf still short)': ['chips-03', [f('A'), f('B'), f('A'), f('B'), {type: 'all'}, again, f('A'), f('B'), f('B'), f('A')]],
    'chips-s01 A, Most, add B': ['chips-s01', [add('A'), {type: 'most'}, add('B')]],
    'chips-s02 a wrong pair, New run': ['chips-s02', [add('A'), drop, f('A'), drop, drop, f('A'), f('B'), again, ...empty, {type: 'claim', taps: [0, 1]}, again]],
    'chips-s02 a right pair on a short shelf, New run': ['chips-s02', [add('A'), drop, f('A'), drop, drop, f('A'), f('B'), again, ...empty, {type: 'claim', taps: [0, 3]}, again]]
  };
  const report = {};
  for (const [label, [id, actions]] of Object.entries(trails)) {
    const {still} = undoTrail(byId(id), actions);
    assert.deepEqual(still, [], `${label}: Undo ${still.join(', ')} changed nothing`);
    report[label] = 'every Undo changes the board';
  }
  // A refusal, then the shelf completed: back over the claim press the refusal
  // no longer applies and nothing is drawn for it, so that step goes with the
  // next press, and six steps take five presses.
  const outgrown = undoTrail(byId('chips-01'), [f('A'), f('B'), {type: 'all'}, again, f('B'), f('A')]);
  assert.deepEqual(outgrown, {still: [], presses: 5}, 'chips-01: Undo passes over the claim press the shelf has outgrown');
  report['chips-01 refusal, then the shelf completed'] = `every Undo changes the board (six steps in ${outgrown.presses} presses)`;
  return report;
}
// Every board that play reaches (up to a small sink) is accepted when saved.
function checkReachableSaves(p) {
  const q = p.parameters, g = BOARDS[q.board], ids = Object.keys(g.nodes), m = mechanicFor(p), SINK = 8;
  const base = q.mode === 'capacity' ? {claim: null} : {steps: '', found: [], claim: 'open', taps: []};
  const start = {...freshAttempt(p).board};
  const seen = new Set([JSON.stringify([start.piles, start.sink])]), queue = [start];
  let n = 0;
  while (queue.length) {
    const b = queue.pop(); n++;
    assert.ok(validBoard(p, {...b, ...base}), `${p.id}: reachable ${JSON.stringify(b)} is accepted`);
    for (const node of ids) for (const type of ['add', 'fire']) {
      const next = m.move(p, {...b, ...base}, {type, node});
      if (!next || next.sink > SINK) continue;
      const k = JSON.stringify([next.piles, next.sink]);
      if (!seen.has(k)) { seen.add(k); queue.push({piles: next.piles, sink: next.sink}); }
    }
  }
  return n;
}

export async function validateChips() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const chips = await read('../dist/families/chips/chips.json'), {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'source ids are unique across the packs');
  for (const s of chips.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(chips.families.length, 1);
  const family = chips.families[0];
  assert.equal(family.id, 'chips'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = chips.puzzles.filter(p => p.band === 'all' && !p.group), playgrounds = chips.puzzles.filter(p => p.band === 'playground');
  const group = chips.puzzles.filter(p => p.group);
  assert.equal(playgrounds.length, 1); assert.equal(core.length + group.length + 1, chips.puzzles.length);
  assert.ok(core.length >= 8 && core.length <= 12, 'eight to twelve puzzles over Easy, Medium and Hard');
  assert.deepEqual(core.map(p => p.number), core.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(group.map(p => p.number), group.map((_, i) => i + 1), 'the group is numbered from 1');
  for (const p of group) { assert.equal(p.mechanic, 'chipstill'); assert.equal(p.libraryFamily, 'chips'); assert.equal(p.group, 'Still boards'); assert.equal(p.band, 'all'); assert.match(p.id, /^chips-s\d\d$/); }
  for (const level of ['easy', 'medium', 'hard']) assert.ok(core.some(p => p.difficulty_level === level), level);
  // Titles, objectives and first hints never print the answer.
  for (const p of group) for (const text of [p.title, p.objective, p.controls, p.hints[0]]) assert.doesNotMatch(text, p.parameters.mode === 'capacity' ? /\b5\b|five/i : /\b3\b|three|A 1|A 0/i, `${p.id}: no answer in ${text}`);
  let steps = 0;
  for (const p of chips.puzzles) {
    assert.ok(['chips', 'chipstill'].includes(p.mechanic)); assert.ok(isExpansion(p)); assert.equal(p.revision, 1);
    assert.match(p.controls, /^A circle can fire when it has at least one chip for each line touching it/, `${p.id}: How to play opens with the operation`);
    for (const key of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id} ${key}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3); p.hints.forEach(h => assert.ok(h.trim()));
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id} parent.${key}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
  }
  for (const p of core) {
    const q = p.parameters, want = expected(p), got = answers(p);
    assert.deepEqual([...got.keys()].sort(), [...want].sort(), `${p.id}: answer set`);
    if (['orders', 'finishes', 'starts'].includes(q.mode)) assert.equal(q.answers, want.size, `${p.id}: asks for every answer`);
    else assert.ok(q.answers === 1 && want.size >= 1, `${p.id}: one answer needed`);
    // Hints alone reach a solve, and every hint is a legal move.
    let a = freshAttempt(p);
    assert.ok(validBoard(p, a.board) && !isSolved(p, a.board), `${p.id}: valid unsolved start`);
    for (let i = 0; !isSolved(p, a.board) && i < 600; i++) {
      const hint = nextHint(p, a);
      assert.equal(hint.type, 'move', `${p.id}: ${hint.text}`);
      const next = move(p, a, hint.action);
      assert.ok(next && next !== a, `${p.id}: hint ${JSON.stringify(hint.action)} is legal`);
      a = next; steps++;
    }
    assert.ok(isSolved(p, a.board), `${p.id}: hints reach a solve`);
    assert.equal(a.board.found.length, q.answers);
    assert.equal(move(p, a, {type: 'again'}), null, `${p.id}: no moves after a solve`);
    // Illegal moves change nothing.
    const fresh = freshAttempt(p), m = mechanicFor(p);
    for (const bad of [{type: 'fire', node: 'S'}, {type: 'fire', node: 'Z'}, {type: 'add'}, {type: 'again'}, null, 'A']) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    if (q.mode === 'orders') assert.equal(move(p, fresh, {type: 'add', node: Object.keys(BOARDS[q.board].nodes)[0]}), null, `${p.id}: no adding`);
    else assert.equal(move(p, fresh, {type: 'fire', node: Object.keys(BOARDS[q.board].nodes)[0]}), null, `${p.id}: no firing while placing`);
    // Undo after a discovery keeps it.
    let b = freshAttempt(p);
    while (!b.board.found.length) b = move(p, b, nextHint(p, b).action);
    const back = undo(b), kept = {...back, board: m.carry(p, b.board, back.board)};
    assert.equal(kept.board.found.length, 1, `${p.id}: Undo keeps a found answer`);
    assert.ok(validBoard(p, kept.board), `${p.id}: board after Undo is valid`);
    // Saved boards with forged answers are rejected.
    assert.equal(validBoard(p, {...fresh.board, found: ['forged']}), false);
    if (['orders', 'finishes', 'starts'].includes(q.mode)) checkThatsAll(p);
  }
  // The Still boards group.
  const groupReport = {};
  for (const p of group) {
    const started = cpu();
    groupReport[p.id] = p.parameters.mode === 'capacity' ? checkCapacity(p) : checkCycle(p);
    groupReport[p.id].reachableSaves = checkReachableSaves(p);
    const starts = [freshAttempt(p), ...[1, 2, 3, 4, 5, 6, 7, 8].map(seed => wander(p, seed, 40))];
    if (p.parameters.mode === 'cycle') {
      // From each refusal: a wrong pair, and a right pair with the shelf incomplete.
      const ids = Object.keys(BOARDS[p.parameters.board].nodes);
      let a = play(p, freshAttempt(p), [{type: 'add', node: ids[1]}]);
      while (!stillRun(p, a.board).ended) { const run = stillRun(p, a.board); a = play(p, a, [run.ready.length ? {type: 'fire', node: ids[run.ready[0]]} : {type: 'drop'}]); }
      a = play(p, a, [{type: 'again'}]);
      while (!stillRun(p, a.board).ended) { const run = stillRun(p, a.board); a = play(p, a, [run.ready.length ? {type: 'fire', node: ids[run.ready[0]]} : {type: 'drop'}]); }
      const more = play(p, a, [{type: 'claim', taps: [0, 3]}]), apart = play(p, a, [{type: 'claim', taps: [1, 2]}]);
      assert.deepEqual([more, apart].map(x => x.board.claim), ['more', 'apart']);
      // And after Undo from each, and Undo past New run back to a refused row.
      starts.push(more, apart, takeBack(p, more), takeBack(p, apart), takeBack(p, takeBack(p, apart)), takeBack(p, play(p, apart, [{type: 'again'}])));
    }
    const hinted = checkHints(p, starts);
    steps += hinted;
    const ms = cpu() - started;
    groupReport[p.id].hintSteps = hinted;
    // Each tap is far under 100 ms: the checks above make many hundreds of moves and hints.
    assert.ok(ms / Math.max(1, hinted) < 20, `${p.id}: ${ms.toFixed(0)} ms of CPU for ${hinted} hint steps`);
  }
  // Playground: every board accepts adds and fires; Fire all stops (or
  // reports a repeat without a sink); the grid settles like an independent run.
  const [pg] = playgrounds;
  let a = freshAttempt(pg);
  assert.ok(validBoard(pg, a.board) && !isSolved(pg, a.board));
  for (const name of PLAYGROUND_BOARDS) {
    a = move(pg, a, {type: 'board', board: name}) || a;
    assert.equal(a.board.board, name);
    if (name === 'grid') {
      const center = Math.floor(GRID * GRID / 2);
      a = move(pg, a, {type: 'add', cell: center, amount: 1000});
      const piles = Array(GRID * GRID).fill(0); piles[center] = 1000;
      assert.deepEqual(a.board.piles, settleGrid(piles).piles);
      assert.equal(a.board.piles.reduce((x, y) => x + y, 0) + a.board.sink, 1000, 'grid conserves chips');
      // Four-fold symmetry of a centered pile.
      for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) assert.equal(a.board.piles[y * GRID + x], a.board.piles[x * GRID + (GRID - 1 - y)]);
      assert.equal(move(pg, a, {type: 'add', cell: -1, amount: 1}), null);
      assert.equal(move(pg, a, {type: 'add', cell: 0, amount: 7}), null);
      continue;
    }
    const ids = Object.keys(BOARDS[name].nodes);
    for (const id of ids) for (let k = 0; k < 3; k++) a = move(pg, a, {type: 'add', node: id});
    a = move(pg, a, {type: 'settle'});
    assert.ok(a, `${name}: Fire all`);
    if (BOARDS[name].sink) assert.equal(a.board.loop, false, `${name}: stops`);
    else assert.equal(a.board.loop, true, `${name}: 9 chips on a sinkless triangle repeat`);
    assert.equal(move(pg, a, {type: 'fire', node: 'Q'}), null);
  }
  const undoTrails = checkUndoTrails(id => chips.puzzles.find(p => p.id === id));
  return {chipPuzzles: core.length, stillPuzzles: group.length, playground: 1, sources: chips.sources.length, hintSteps: steps, still: groupReport, undoTrails};
}
export default validateChips;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateChips(), null, 2));
