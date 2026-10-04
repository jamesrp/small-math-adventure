// Checks the Chip firing pack (dist/chips.json): content fields and sources,
// every answer set against an independent brute-force simulator, the
// order-independence facts the notes rely on, hint chains to completion,
// illegal moves, Undo keeping discoveries, and the playground boards.
// Run: node scripts/validate-chips.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {BOARDS, PLAYGROUND_BOARDS, GRID, answers, settleGrid} from '../dist/chips.js';

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

export async function validateChips() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const main = await read('../dist/puzzles.json'), proofs = await read('../dist/proofs.json'), chips = await read('../dist/chips.json');
  const all = [...main.puzzles, ...proofs.puzzles, ...chips.puzzles], sources = [...main.sources, ...proofs.sources, ...chips.sources];
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'source ids are unique across the packs');
  for (const s of chips.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(chips.families.length, 1);
  const family = chips.families[0];
  assert.equal(family.id, 'chips'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = chips.puzzles.filter(p => p.band === 'all'), playgrounds = chips.puzzles.filter(p => p.band === 'playground');
  assert.equal(playgrounds.length, 1); assert.equal(core.length + 1, chips.puzzles.length);
  assert.deepEqual(core.map(p => p.number), core.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(core.some(p => p.difficulty_level === level), level);
  let steps = 0;
  for (const p of chips.puzzles) {
    assert.equal(p.mechanic, 'chips'); assert.ok(isExpansion(p)); assert.equal(p.revision, 1);
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
  return {chipPuzzles: core.length, playground: 1, sources: chips.sources.length, hintSteps: steps};
}
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateChips(), null, 2));
