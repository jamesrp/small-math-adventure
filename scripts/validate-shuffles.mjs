// Checks the Ticket shuffles pack (dist/families/shuffles/shuffles.json):
// content fields and sources; every puzzle's answer against a separate
// simulation (cups as an array moved by index, stories listed by counting in
// mixed radix); the theorems the notes rely on (the later-slot rule makes
// each order exactly once for two to six cups, the any-slot rule's 27 stories
// split 4, 5, 5, 5, 4, 4, n! does not divide nⁿ, the never-itself rule makes
// exactly the single loops, and exactly six designs pass for four cups);
// hint chains to a solve; illegal moves; forged saves; and the playground.
// Run: node scripts/validate-shuffles.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion} from '../dist/expansion.js';
import {targetKeys, passingDesigns} from '../dist/families/shuffles/shuffles.js';
import {loadPack} from './packs.mjs';

// A separate simulation. Cups are an array; a story is found by counting in
// mixed radix through the ticket cups.
const LETTERS = 'ABCDEFG';
function simulate(start, steps, story) {
  const cups = [...start];
  story.forEach((ticket, k) => { const i = steps[k].slot - 1, j = ticket - 1, x = cups[i]; cups[i] = cups[j]; cups[j] = x; });
  return cups.join('');
}
function allStories(steps) {
  const sizes = steps.map(s => s.tickets.length), total = sizes.reduce((x, y) => x * y, 1), out = [];
  for (let n = 0; n < total; n++) {
    let rest = n;
    const story = [];
    for (let k = steps.length - 1; k >= 0; k--) { story.unshift(steps[k].tickets[rest % sizes[k]]); rest = Math.floor(rest / sizes[k]); }
    out.push(story);
  }
  return out;
}
const orders = n => {
  const go = items => items.length ? items.flatMap((x, i) => go([...items.slice(0, i), ...items.slice(i + 1)]).map(r => x + r)) : [''];
  return go([...LETTERS.slice(0, n)]);
};
function tally(start, steps) {
  const out = Object.fromEntries(orders(start.length).map(r => [r, []]));
  for (const story of allStories(steps)) out[simulate(start, steps, story)].push(story.join(''));
  return out;
}
const factorial = n => n <= 1 ? 1 : n * factorial(n - 1);
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const later = n => range(1, n - 1).map(k => ({slot: k, tickets: range(k, n)}));
const any = n => range(1, n).map(k => ({slot: k, tickets: range(1, n)}));
const never = n => range(1, n - 1).map(k => ({slot: k, tickets: range(k + 1, n)}));
// The loops of an order: follow each cup to the slot its letter names.
function loops(row) {
  const seen = new Set();
  let count = 0;
  for (let i = 0; i < row.length; i++) {
    if (seen.has(i)) continue;
    count++;
    for (let j = i; !seen.has(j); j = LETTERS.indexOf(row[j])) seen.add(j);
  }
  return count;
}
const sorted = list => [...list].sort();

function theorems() {
  const facts = {};
  for (let n = 2; n <= 6; n++) {
    const start = LETTERS.slice(0, n), fy = tally(start, later(n));
    assert.ok(Object.values(fy).every(s => s.length === 1), `${n}: later-slot rule makes every order once`);
    // From every start, for three and four cups.
    if (n <= 4) for (const s of orders(n)) assert.ok(Object.values(tally(s, later(n))).every(x => x.length === 1), `${n}: fair from ${s}`);
    const cyc = tally(start, never(n));
    for (const [row, s] of Object.entries(cyc)) assert.equal(s.length, loops(row) === 1 ? 1 : 0, `${n}: never-itself makes ${row} iff it is one loop`);
    facts[n] = {orders: factorial(n), singleLoops: Object.values(cyc).filter(s => s.length).length};
  }
  for (let n = 3; n <= 8; n++) assert.notEqual(n ** n % factorial(n), 0, `${n}! does not divide ${n}^${n}`);
  const naive = tally('ABC', any(3));
  assert.deepEqual(Object.values(naive).map(s => s.length), [4, 5, 5, 5, 4, 4], 'ABC, ACB, BAC, BCA, CAB, CBA');
  // Four cups, three steps: every choice of ticket cups, checked by simulation.
  const subsets = range(1, 15).map(m => range(1, 4).filter(t => m >> (t - 1) & 1)), pass = [];
  for (const a of subsets) for (const b of subsets) for (const c of subsets) {
    const steps = [{slot: 1, tickets: a}, {slot: 2, tickets: b}, {slot: 3, tickets: c}];
    if (Object.values(tally('ABCD', steps)).every(s => s.length === 1)) pass.push([a, b, c].map(s => s.join('')).join(' '));
  }
  assert.equal(pass.length, 6, 'six four-cup designs pass');
  facts.designs = pass;
  facts.anySlot = Object.fromEntries(Object.entries(naive).map(([r, s]) => [r, s.length]));
  return facts;
}

// The answers each puzzle asks for, by the simulation.
function answer(q) {
  if (q.mode === 'design') return null;
  const t = tally(q.start, q.steps);
  if (q.mode === 'rows') return Object.keys(t).filter(r => t[r].length);
  if (q.mode === 'stories') return Object.values(t).flat();
  return t[q.target];
}
const expected = {
  'shuffles-01': ['33'], 'shuffles-02': ['12', '13', '22', '23', '32', '33'], 'shuffles-03': ['12', '13', '22', '23', '32', '33'],
  'shuffles-04': ['BAC', 'BCA', 'CAB', 'CBA'], 'shuffles-05': ['BCA', 'CAB'],
  'shuffles-06': ['123', '132', '213', '321'], 'shuffles-07': ['122', '133', '212', '231', '311'], 'shuffles-08': ['244']
};

export async function validateShuffles() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const pack = await read('../dist/families/shuffles/shuffles.json'), {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'source ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  const family = pack.families[0];
  assert.equal(family.id, 'shuffles'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = pack.puzzles.filter(p => p.band === 'all'), playgrounds = pack.puzzles.filter(p => p.band === 'playground');
  assert.equal(playgrounds.length, 1); assert.equal(core.length + 1, pack.puzzles.length);
  assert.ok(core.length >= 8 && core.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(core.map(p => p.number), core.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(core.some(p => p.difficulty_level === level), level);
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'shuffles'); assert.ok(isExpansion(p)); assert.equal(p.revision, 1);
    assert.ok(p.id === 'shuffles-playground' || p.id === `shuffles-${String(p.number).padStart(2, '0')}`, `${p.id}: id`);
    for (const key of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id} ${key}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3); p.hints.forEach(h => assert.ok(h.trim()));
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id} parent.${key}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
  }
  const facts = theorems();

  let hintSteps = 0;
  const answers = {};
  for (const p of core) {
    const q = p.parameters;
    if (q.mode === 'design') {
      assert.deepEqual(passingDesigns(q).map(s => s.map(x => x.join('')).join(' ')).sort(), [...facts.designs].sort(), `${p.id}: the passing designs`);
    } else {
      const want = answer(q);
      assert.deepEqual(sorted(targetKeys(q)), sorted(want), `${p.id}: what to find`);
      assert.deepEqual(sorted(want), sorted(expected[p.id]), `${p.id}: the notes' answer`);
      answers[p.id] = want.length;
    }

    // Hints alone reach a solve, and every hint is a legal move.
    let a = freshAttempt(p);
    assert.ok(validBoard(p, a.board) && !isSolved(p, a.board), `${p.id}: valid unsolved start`);
    for (let i = 0; !isSolved(p, a.board) && i < 200; i++) {
      const hint = nextHint(p, a);
      assert.equal(hint.type, 'move', `${p.id}: ${hint.text}`);
      const next = move(p, a, hint.action);
      assert.ok(next && next !== a, `${p.id}: hint ${JSON.stringify(hint.action)} is legal`);
      a = next; hintSteps++;
    }
    assert.ok(isSolved(p, a.board), `${p.id}: hints reach a solve`);
    for (const bad of [{type: 'draw', ticket: 1}, {type: 'again'}, {type: 'keep'}, {type: 'claim'}, {type: 'try'}, {type: 'toggle', step: 0, ticket: 1}]) assert.equal(move(p, a, bad), null, `${p.id}: no ${bad.type} after a solve`);
    if (q.mode === 'design') {
      const sets = a.board.sets.map(s => s.join('')).join(' ');
      assert.ok(facts.designs.includes(sets), `${p.id}: solved with a passing design`);
    } else if (q.mode === 'target') {
      assert.equal(simulate(q.start, q.steps, a.board.story), q.target, `${p.id}: the cups end at the target`);
    } else {
      assert.deepEqual(sorted(a.board.kept), sorted(answer(q)), `${p.id}: solved with everything, each once`);
    }

    // Illegal moves change nothing.
    const fresh = freshAttempt(p);
    if (q.mode === 'design') {
      // Toggling takes a ticket out or puts it back, never empties a cup, and
      // clears the last try; no story is drawn by hand.
      const out = move(p, fresh, {type: 'toggle', step: 2, ticket: 1});
      assert.ok(out && !out.board.sets[2].includes(1), `${p.id}: take a ticket out`);
      let lone = fresh;
      for (const t of [1, 2, 3]) lone = move(p, lone, {type: 'toggle', step: 0, ticket: t});
      assert.deepEqual(lone.board.sets[0], [4]);
      assert.equal(move(p, lone, {type: 'toggle', step: 0, ticket: 4}), null, `${p.id}: a cup keeps one ticket`);
      for (const bad of [null, 'try', {type: 'toggle', step: 3, ticket: 1}, {type: 'toggle', step: 0, ticket: 5}, {type: 'toggle', step: 0, ticket: 0}, {type: 'toggle', step: '0', ticket: 1}, {type: 'draw', ticket: 1}, {type: 'again'}, {type: 'keep'}, {type: 'claim'}, {type: 'load', key: '123'}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      const tried = move(p, fresh, {type: 'try'});
      assert.ok(tried && tried.board.tried && !isSolved(p, tried.board), `${p.id}: every ticket in every cup fails`);
      assert.equal(move(p, tried, {type: 'try'}), null, `${p.id}: not twice in a row`);
      assert.ok(!move(p, tried, {type: 'toggle', step: 1, ticket: 1}).board.tried, `${p.id}: a change clears the try`);
      const forged = [null, {...fresh.board, sets: [[1, 2, 3, 4], [1, 2, 3, 4]]}, {...fresh.board, sets: [[], [1], [1]]}, {...fresh.board, sets: [[2, 1], [1], [1]]}, {...fresh.board, sets: [[1, 1], [1], [1]]}, {...fresh.board, sets: [[5], [1], [1]]}, {...fresh.board, tried: 'yes'}, {...fresh.board, story: []}, {sets: fresh.board.sets}];
      for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      continue;
    }
    const steps = q.steps, outside = range(1, q.cups + 1).find(t => !steps[0].tickets.includes(t));
    for (const bad of [null, 'draw', {type: 'jump'}, {type: 'draw', ticket: outside}, {type: 'draw', ticket: '1'}, {type: 'draw'}, {type: 'again'}, {type: 'load', key: '12'}, {type: 'try'}, {type: 'toggle', step: 0, ticket: 1}, {type: 'cups', cups: 4}, {type: 'rule', rule: 'any'}, {type: 'clear'}, {type: 'random'}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    // Draw a whole story by its first tickets, then try the moves around it.
    let b = fresh;
    for (const s of steps) b = move(p, b, {type: 'draw', ticket: s.tickets[0]});
    assert.ok(b && b.board.story.length === steps.length, `${p.id}: a whole story`);
    assert.equal(move(p, b, {type: 'draw', ticket: steps[0].tickets[0]}), null, `${p.id}: no ticket after the last step`);
    const again = move(p, b, {type: 'again'});
    assert.ok(again && again.board.story.length === 0, `${p.id}: Again`);
    if (q.mode === 'target') {
      for (const bad of [{type: 'keep'}, {type: 'claim'}, {type: 'try'}]) assert.equal(move(p, b, bad), null, `${p.id}: no ${bad.type} in a make puzzle`);
      for (const board of [null, {story: [9]}, {story: [1, 2, 3, 4, 5]}, {story: [], kept: []}, {story: '33'}]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
      continue;
    }
    // Find-every puzzles: keep one that counts, refuse one that doesn't, an
    // early That's all once, Undo, and a kept story played again.
    const want = answer(q), key = s => q.mode === 'rows' ? simulate(q.start, q.steps, s) : s.join('');
    const good = allStories(q.steps).find(s => want.includes(key(s))), bad = allStories(q.steps).find(s => !want.includes(key(s)));
    let c = fresh;
    for (const t of good) c = move(p, c, {type: 'draw', ticket: t});
    const kept = move(p, c, {type: 'keep'});
    assert.ok(kept && kept.board.kept.length === 1, `${p.id}: Keep`);
    assert.equal(move(p, kept, {type: 'keep'}), null, `${p.id}: kept once`);
    if (bad) {
      let d = move(p, kept, {type: 'again'});
      for (const t of bad) d = move(p, d, {type: 'draw', ticket: t});
      assert.equal(move(p, d, {type: 'keep'}), null, `${p.id}: one that doesn't count can't be kept`);
    }
    const early = move(p, kept, {type: 'claim'});
    assert.ok(early && early.board.missed && !isSolved(p, early.board), `${p.id}: an early That’s all says there is another`);
    assert.equal(move(p, early, {type: 'claim'}), null, `${p.id}: not twice in a row`);
    assert.ok(!undo(early).board.missed, `${p.id}: Undo takes it back`);
    const cleared = move(p, kept, {type: 'again'});
    if (q.mode === 'rows') assert.equal(move(p, cleared, {type: 'load', key: kept.board.kept[0]}), null, `${p.id}: a kept row has no single story to play`);
    else assert.deepEqual(move(p, cleared, {type: 'load', key: kept.board.kept[0]}).board.story, good, `${p.id}: a kept story plays again`);
    const f = fresh.board, others = q.mode === 'rows' ? orders(q.cups).filter(r => !want.includes(r)) : allStories(q.steps).map(s => s.join('')).filter(k => !want.includes(k));
    // When every story counts (puzzles 2 and 3) there is nothing outside to keep.
    const forged = [null, [], {...f, story: [9]}, {...f, story: [...good, ...good]}, {...f, kept: [want[0], want[0]]}, {...f, kept: 'x'}, {...f, claimed: 'yes'}, {...f, claimed: true}, {...f, kept: want, missed: true}, {...f, missed: true}];
    if (others.length) forged.push({...f, kept: [others[0]]});
    for (const board of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${JSON.stringify(board)}`);
    assert.ok(validBoard(p, {...f, kept: want, claimed: true}), `${p.id}: a real solve is a valid save`);
  }

  // Playground: three or four cups, three rules; any story can be kept, once;
  // Draw finishes a story at random; it never counts as solved.
  const [pg] = playgrounds;
  let a = freshAttempt(pg);
  assert.ok(validBoard(pg, a.board) && !isSolved(pg, a.board));
  for (const cups of [3, 4]) for (const [rule, steps] of [['later', later(cups)], ['any', any(cups)], ['never', never(cups)]]) {
    a = move(pg, a, {type: 'cups', cups}) || a;
    a = move(pg, a, {type: 'rule', rule}) || a;
    assert.equal(a.board.cups, cups); assert.equal(a.board.rule, rule); assert.deepEqual(a.board.kept, []);
    assert.equal(move(pg, a, {type: 'keep'}), null, `${cups} ${rule}: no Keep before a whole story`);
    a = move(pg, a, {type: 'draw', ticket: steps[0].tickets.at(-1)});
    a = move(pg, a, {type: 'random'}, () => 0.99);
    assert.equal(a.board.story.length, steps.length, `${cups} ${rule}: Draw finishes the story`);
    assert.equal(move(pg, a, {type: 'random'}), null);
    a = move(pg, a, {type: 'keep'});
    assert.equal(move(pg, a, {type: 'keep'}), null, `${cups} ${rule}: kept once`);
    const first = a.board.kept[0];
    a = move(pg, move(pg, a, {type: 'again'}), {type: 'random'}, () => 0);
    if (a.board.story.join('') !== first) { a = move(pg, a, {type: 'keep'}); assert.equal(a.board.kept.length, 2); }
    a = move(pg, move(pg, a, {type: 'again'}), {type: 'load', key: first});
    assert.equal(a.board.story.join(''), first, `${cups} ${rule}: Load`);
    assert.ok(!isSolved(pg, a.board), 'the playground never counts as solved');
  }
  const cleared = move(pg, a, {type: 'clear'});
  assert.deepEqual(cleared.board.kept, []);
  assert.equal(move(pg, cleared, {type: 'clear'}), null);
  for (const bad of [{type: 'cups', cups: 5}, {type: 'cups', cups: a.board.cups}, {type: 'rule', rule: 'never'}, {type: 'rule', rule: 'fair'}, {type: 'draw', ticket: 9}, {type: 'load', key: '99'}, {type: 'claim'}]) assert.equal(move(pg, a, bad), null, `playground rejects ${JSON.stringify(bad)}`);
  for (const board of [{...a.board, cups: 5}, {...a.board, rule: 'fair'}, {...a.board, story: [9]}, {...a.board, kept: ['11', '11']}, {...a.board, kept: ['9']}]) assert.equal(validBoard(pg, board), false, `playground rejects ${JSON.stringify(board)}`);
  return {shufflesPuzzles: core.length, playground: 1, sources: pack.sources.length, toFind: answers, hintSteps, theorems: facts};
}
export default validateShuffles;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateShuffles(), null, 2));
