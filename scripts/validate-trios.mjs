// Checks the Trios pack (dist/families/trios/trios.json): content fields and
// sources; every answer recomputed by methods unlike the mechanic's (trios
// as lines through a point in a direction, the rule tested on base-3
// strings, parallel classes for the splits, every subset of the nine tiles
// for caps, an include-or-skip search for the 27-card caps, every colouring
// and count design tested card by card, and a separate game tree); the
// facts the spec states (four trios through each tile, every stuck set of
// tiles has four, two colours fail, the opposite answer wins, random choices
// among the 27 stick at eight more often than not); witnesses played as
// moves; hint chains from fresh, after wrong moves and Can't refusals and
// after seeded random play; illegal moves; forged saves; Undo and Restart
// keeping a refused Can't; the playground.
// Run: node scripts/validate-trios.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, restart} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {trios as mechTrios, third as mechThird, splits as mechSplits, splitKey, capsOfSize, designs as mechDesigns, appClaim, replay} from '../dist/families/trios/trios.js';
import {loadPack} from './packs.mjs';

// --- An independent model ---------------------------------------------------
// A card is its base-3 string, one character per attribute (shape first).
const size = d => 3 ** d;
const words = new Map();
const word = (d, i) => { const key = d * 100 + i; if (!words.has(key)) words.set(key, [...i.toString(3).padStart(d, '0')].reverse().join('')); return words.get(key); };
const idOf = w => parseInt([...w].reverse().join(''), 3);
// The rule, attribute by attribute: all the same or all different.
const ruleHolds = (d, a, b, c) => {
  if (a === b || b === c || a === c) return false;
  const x = word(d, a), y = word(d, b), z = word(d, c);
  for (let k = 0; k < d; k++) if (!((x[k] === y[k] && y[k] === z[k]) || (x[k] !== y[k] && y[k] !== z[k] && x[k] !== z[k]))) return false;
  return true;
};
// Lines as {p, p + v, p + 2v} for every point p and every direction v whose
// first nonzero digit is 1; grouped by direction.
function linesByDirection(d) {
  const dirs = new Map();
  for (let v = 1; v < size(d); v++) {
    const vw = word(d, v), lead = [...vw].find(ch => ch !== '0');
    if (lead !== '1') continue;
    const keys = new Set();
    for (let p = 0; p < size(d); p++) {
      const pts = [0, 1, 2].map(t => idOf([...word(d, p)].map((ch, k) => (Number(ch) + t * Number(vw[k])) % 3).join('')));
      keys.add(pts.sort((x, y) => x - y).join('.'));
    }
    dirs.set(vw, [...keys].map(k => k.split('.').map(Number)));
  }
  return dirs;
}
const allLines = d => [...linesByDirection(d).values()].flat();
const lineKey = t => [...t].sort((x, y) => x - y).join('.');
// The third card by scanning the deck with the rule (tabled for the 9 and the 27).
const scans = new Map();
const scan = (d, a, b) => { for (let c = 0; c < size(d); c++) if (ruleHolds(d, a, b, c)) return c; return null; };
const thirdScan = (d, a, b) => {
  if (d > 3) return scan(d, a, b);
  if (!scans.has(d)) scans.set(d, Array.from({length: size(d) ** 2}, (_, k) => Math.floor(k / size(d)) === k % size(d) ? -1 : scan(d, Math.floor(k / size(d)), k % size(d))));
  return scans.get(d)[a * size(d) + b];
};
// A trio inside a set: every triple by the rule for the 81, each pair's
// scanned third card for the 9 and the 27.
const hasLine = (d, set) => {
  const s = [...set];
  if (d > 3) { for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) for (let k = j + 1; k < s.length; k++) if (ruleHolds(d, s[i], s[j], s[k])) return true; return false; }
  const has = new Set(s);
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) if (has.has(thirdScan(d, s[i], s[j]))) return true;
  return false;
};
const subsets = (n, k) => { const out = []; (function go(from, acc) { if (acc.length === k) { out.push([...acc]); return; } for (let i = from; i < n; i++) { acc.push(i); go(i + 1, acc); acc.pop(); } })(0, []); return out; };

// 27-card caps: include-or-skip from card 26 down, each new card checked
// against every chosen pair with a table built by the rule scan.
function capsBySkip(d, want) {
  const n = size(d), T = Array.from({length: n}, (_, a) => Array.from({length: n}, (_, b) => a === b ? -1 : thirdScan(d, a, b)));
  const out = [];
  const chosen = [];
  (function go(c) {
    if (chosen.length === want) { out.push([...chosen].sort((x, y) => x - y)); return; }
    if (c < 0 || c + 1 < want - chosen.length) return;
    let ok = true;
    for (let i = 0; ok && i < chosen.length; i++) for (let j = i + 1; j < chosen.length; j++) if (T[chosen[i]][chosen[j]] === c) { ok = false; break; }
    if (ok) { chosen.push(c); go(c - 1); chosen.pop(); }
    go(c - 1);
  })(n - 1);
  return out;
}

// The avoidance game on the nine tiles, by a separate tree over owned lists.
const LINES9 = allLines(2);
const ownsLine = list => LINES9.some(t => t.every(i => list.includes(i)));
const gameMemo = new Map();
// 'mover' or 'other': who wins with best play, the mover owning `me`.
function gameValue(me, other) {
  const key = `${[...me].sort()}|${[...other].sort()}`;
  if (gameMemo.has(key)) return gameMemo.get(key);
  const free = [...Array(9).keys()].filter(i => !me.includes(i) && !other.includes(i));
  // Nine tiles always end in a trio: five of one player's tiles hold one.
  const result = free.some(i => !ownsLine([...me, i]) && gameValue(other, [...me, i]) === 'other') ? 'mover' : 'other';
  gameMemo.set(key, result);
  return result;
}

// --- The puzzle table (docs/trios/README.md) -----------------------------------
const TABLE = {
  'trios-01': {mode: 'complete', answers: ['solid circle', 'open square', 'open square', 'solid circle']},
  'trios-02': {mode: 'through', count: 4},
  'trios-03': {mode: 'cap', possible: true, count: 54},
  'trios-04': {mode: 'split', count: 4},
  'trios-05': {mode: 'cap', possible: false},
  'trios-06': {mode: 'complete', answers: ['three open circles', 'three solid squares', 'one striped circle', 'one striped triangle']},
  'trios-07': {mode: 'paint', possible: false},
  'trios-08': {mode: 'paint', possible: true, count: 3762},
  'trios-09': {mode: 'cap', possible: true, count: 2106},
  'trios-10': {mode: 'cap', possible: true, count: 2106, startMost: 6},
  'trios-11': {mode: 'paint', possible: true, count: 162},
  'trios-12': {mode: 'game'}
};
const NAMES = {shape: ['circle', 'triangle', 'square'], fill: ['open', 'striped', 'solid'], count: ['one', 'two', 'three']};
const nameOf = (d, i) => { const w = word(d, i), s = NAMES.shape[w[0]], f = NAMES.fill[w[1]]; return d === 2 ? `${f} ${s}` : `${NAMES.count[w[2]]} ${f} ${s}${w[2] === '0' ? '' : 's'}`; };

// --- Helpers over the engine --------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
function hintsSolve(p, a, label, limit = 120) {
  let steps = 0;
  if (p.parameters.mode === 'cap' || p.parameters.mode === 'paint') assert.notEqual(nextHint(p, a).action?.type === 'cant' && a.moves === 0, true, `${p.id} ${label}: Can’t is not the first hint`);
  for (; !isSolved(p, a.board) && steps < limit; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: a hint has words`);
    assert.ok(!/press can/i.test(h.text), `${p.id} ${label}: no hint text says Press Can’t (${h.text})`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// A seeded generator for random play.
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// Candidate actions for random play: every tap the board could send.
function candidates(p, b, random) {
  const q = p.parameters, cards = n => [...Array(n).keys()];
  const triple = list => { const s = [...list].sort(() => random() - 0.5).slice(0, 3); return s.length === 3 ? s : null; };
  switch (q.mode) {
    case 'complete': return cards(size(q.deck)).map(card => ({type: 'pick', card}));
    case 'through': return [...cards(9).map(card => ({type: 'pick', card})), {type: 'all'}];
    case 'split': return [...cards(9).map(card => ({type: 'place', card})), ...cards(9).map(card => ({type: 'lift', card})), {type: 'all'}];
    case 'cap': return [...cards(size(q.deck)).map(card => ({type: 'pick', card})), ...(triple(b.chosen) ? [{type: 'cant', trio: triple(b.chosen)}] : [])];
    case 'paint': return [...cards(9).flatMap(tile => [...Array(q.values).keys()].map(value => ({type: 'paint', tile, value}))), {type: 'cant', trio: triple(cards(9))}];
    case 'game': return [...cards(9).map(tile => ({type: 'claim', tile})), {type: 'back'}];
    default: return [];
  }
}
function randomPlay(p, a, random, steps) {
  for (let k = 0; k < steps; k++) {
    const legal = candidates(p, a.board, random).map(action => [action, move(p, a, action)]).filter(([, next]) => next && next !== a && !isSolved(p, next.board));
    if (!legal.length) break;
    a = legal[Math.floor(random() * legal.length)][1];
  }
  return a;
}

export async function validateTrios() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/trios/trios.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-36')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('week-36/week-36-bonus.pdf')), 'the bonus');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-36.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'trios');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  // The geometry: lines by direction against the mechanic's trios.
  const facts = {};
  for (const [d, count] of [[2, 12], [3, 117], [4, 1080]]) {
    const lines = allLines(d);
    assert.equal(lines.length, count, `${count} trios among ${size(d)} cards`);
    assert.deepEqual(new Set(lines.map(lineKey)), new Set(mechTrios(d).map(lineKey)), `the mechanic's trios of ${size(d)} are the lines`);
    assert.ok(lines.every(t => ruleHolds(d, ...t)), 'every line keeps the rule');
  }
  for (const d of [2, 3]) for (let a = 0; a < size(d); a++) for (let b = 0; b < size(d); b++) if (a !== b) assert.equal(mechThird(d, a, b), thirdScan(d, a, b), `third card of ${a} and ${b}`);
  // Nine tiles: four trios through each tile; four splits, the parallel classes.
  for (let c = 0; c < 9; c++) assert.equal(LINES9.filter(t => t.includes(c)).length, 4, 'four trios through each tile');
  const classes = [...linesByDirection(2).values()].map(ls => ls.map(lineKey).sort().join('|')).sort();
  const disjointTriples = subsets(12, 3).filter(ix => new Set(ix.flatMap(i => LINES9[i])).size === 9).map(ix => ix.map(i => lineKey(LINES9[i])).sort().join('|')).sort();
  assert.deepEqual(disjointTriples, classes, 'the splits are the four directions');
  assert.deepEqual(mechSplits().map(splitKey).sort(), classes, 'the mechanic’s splits');
  // Caps among the nine, over all 512 subsets.
  const capsNine = k => subsets(9, k).filter(s => !hasLine(2, s));
  facts.fourCaps = capsNine(4).length;
  assert.equal(facts.fourCaps, 54, '54 fours with no trio');
  assert.equal(capsNine(5).length, 0, 'no five without a trio');
  assert.deepEqual(capsOfSize(2, 4).map(lineKey).sort(), capsNine(4).map(lineKey).sort(), 'the mechanic’s fours');
  // Every stuck set of tiles has four: smaller sets with no trio can grow.
  for (const k of [1, 2, 3]) for (const s of capsNine(k)) assert.ok([...Array(9).keys()].some(t => !s.includes(t) && !hasLine(2, [...s, t])), `a ${k}-set with no trio can grow`);
  for (const s of capsNine(3)) assert.equal([...Array(9).keys()].filter(t => !s.includes(t) && !hasLine(2, [...s, t])).length, 3, 'three tiles join any three with no trio');
  // Five tiles: one or two trios; their pairs' third tiles in four dishes of at most two.
  for (const s of subsets(9, 5)) {
    const inside = LINES9.filter(t => t.every(i => s.includes(i))).length;
    assert.ok(inside === 1 || inside === 2, 'five tiles hold one or two trios');
    const dishes = new Map();
    for (const [x, y] of subsets(5, 2).map(([i, j]) => [s[i], s[j]])) { const t = thirdScan(2, x, y); if (!s.includes(t)) dishes.set(t, (dishes.get(t) || 0) + 1); }
    assert.ok([...dishes.values()].every(n => n <= 2), 'no dish holds three pairs');
    assert.equal(10 - [...dishes.values()].reduce((x, y) => x + y, 0), 3 * inside, 'the pairs left over lie inside trios');
  }
  // 27 cards: nines by include-or-skip; no ten; the mechanic agrees.
  const nines = capsBySkip(3, 9);
  facts.nineCaps = nines.length;
  assert.equal(nines.length, 2106, '2,106 nines with no trio');
  assert.equal(capsBySkip(3, 10).length, 0, 'no ten');
  assert.deepEqual(new Set(capsOfSize(3, 9).map(lineKey)), new Set(nines.map(lineKey)), 'the mechanic’s nines');
  // Every stuck set of the 27 (no trio, nothing can join) has eight or nine
  // cards: a search over all 367,525 sets with no trio.
  {
    const complete = {};
    let sets = 0;
    // ruled: a bit mask of the chosen cards and the cards they rule out.
    (function grow(chosen, ruled) {
      sets++;
      if (ruled === 2 ** 27 - 1) complete[chosen.length] = (complete[chosen.length] || 0) + 1;
      for (let c = chosen.length ? chosen.at(-1) + 1 : 0; c < 27; c++) {
        if (ruled & (1 << c)) continue;
        let next = ruled | (1 << c);
        for (const x of chosen) next |= 1 << thirdScan(3, x, c);
        chosen.push(c); grow(chosen, next); chosen.pop();
      }
    })([], 0);
    assert.equal(sets, 367525, 'sets with no trio among the 27, with the empty set');
    assert.deepEqual(complete, {8: 44226, 9: 2106}, 'stuck sets have eight or nine cards');
    facts.stuckSets27 = complete;
  }
  // Random choices among the 27 stick at eight or nine, at eight more often.
  {
    const random = rng(36), runs = 4000, ends = {8: 0, 9: 0};
    for (let r = 0; r < runs; r++) {
      const chosen = [];
      for (;;) {
        const open = [...Array(27).keys()].filter(c => !chosen.includes(c) && !chosen.some((x, i) => chosen.slice(i + 1).some(y => thirdScan(3, x, y) === c)));
        if (!open.length) break;
        chosen.push(open[Math.floor(random() * open.length)]);
      }
      assert.ok(chosen.length === 8 || chosen.length === 9, 'every stuck set of the 27 has eight or nine');
      ends[chosen.length]++;
    }
    facts.randomStuckAtEight = `${ends[8]} of ${runs}`;
    assert.ok(ends[8] / runs > 0.6 && ends[8] / runs < 0.75, 'about two times in three');
  }
  // Colourings and count designs, card by card.
  const mono = values => { let n = 0; for (let k = 0; k < values ** 9; k++) { const c = [...Array(9)].map((_, i) => Math.floor(k / values ** i) % values); if (!LINES9.some(t => t.every(i => c[i] === c[t[0]]))) n++; } return n; };
  const countDesigns = () => { const out = []; for (let k = 0; k < 3 ** 9; k++) { const c = [...Array(9)].map((_, i) => Math.floor(k / 3 ** i) % 3), cards = c.map((v, i) => i + 9 * v); if (!hasLine(3, cards)) out.push(c); } return out; };
  assert.equal(mono(2), 0, 'no two-colouring');
  {
    let fewest = 9;
    for (let k = 0; k < 512; k++) fewest = Math.min(fewest, LINES9.filter(t => t.every(i => (k >> i & 1) === (k >> t[0] & 1))).length);
    assert.equal(fewest, 2, 'every two-colouring has at least two one-colour trios');
    let even = 0;
    for (let k = 0; k < 3 ** 9; k++) { const c = [...Array(9)].map((_, i) => Math.floor(k / 3 ** i) % 3); if ([0, 1, 2].every(v => c.filter(x => x === v).length === 3) && !LINES9.some(t => t.every(i => c[i] === c[t[0]]))) even++; }
    assert.equal(even, 1008, 'three of each colour: 1,008 colourings');
  }
  assert.equal(mono(3), 3762, '3,762 three-colourings');
  const counts = countDesigns();
  assert.equal(counts.length, 162, '162 count designs');
  assert.ok(counts.every(c => [0, 1, 2].map(v => c.filter(x => x === v).length).sort().join() === '1,4,4'), 'every count design uses counts 1, 4 and 4 times');
  assert.equal(mechDesigns(2, 'mono').length, 0);
  assert.equal(mechDesigns(3, 'mono').length, 3762);
  assert.deepEqual(mechDesigns(3, 'card').map(c => c.join('')).sort(), counts.map(c => c.join('')).sort(), 'the mechanic’s count designs');
  // The game: the first player wins; the opposite answer wins against every
  // reply, and they lose by their fourth tile.
  assert.equal(gameValue([], []), 'mover', 'the first player wins');
  let sequences = 0;
  for (let c = 0; c < 9; c++) (function oppose(you, app) {
    const free = [...Array(9).keys()].filter(i => !you.includes(i) && !app.includes(i));
    for (const x of free) {
      const them = [...app, x];
      if (ownsLine(them)) { assert.ok(them.length >= 3 && them.length <= 4, 'they lose by their fourth tile'); sequences++; continue; }
      const o = thirdScan(2, c, x);
      assert.ok(free.includes(o) && o !== x, 'the opposite is free');
      const mine = [...you, o];
      assert.ok(!ownsLine(mine), 'the opposite never gives you a trio');
      oppose(mine, them);
    }
  })([c], []);
  facts.oppositeGames = sequences;
  // At the first player's second turn the opposite is the only winning claim.
  for (let c = 0; c < 9; c++) for (let x = 0; x < 9; x++) if (x !== c) {
    const wins = [...Array(9).keys()].filter(t => t !== c && t !== x && gameValue([x], [c, t]) === 'other');
    assert.deepEqual(wins, [thirdScan(2, c, x)], 'one winning answer at the second turn: the opposite');
  }
  // The app plays its best: a winning claim whenever it has one, and a trio only when forced.
  for (const [you, app] of gamePositions()) {
    const free = [...Array(9).keys()].filter(i => !you.includes(i) && !app.includes(i)), claim = appClaim(mask(you), mask(app));
    const safe = free.filter(i => !ownsLine([...app, i]));
    if (!safe.length) continue;
    assert.ok(safe.includes(claim), 'the app avoids a trio while it can');
    if (safe.some(i => gameValue(you, [...app, i]) === 'other')) assert.equal(gameValue(you, [...app, claim]), 'other', 'the app takes a winning claim');
  }

  // --- Each puzzle ----------------------------------------------------------
  let hintSteps = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'trios');
    assert.ok(p.id.startsWith('trios-'));
    assert.equal(p.familyTitle, 'Trios');
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(!/[.!?]\s/.test(p.visibleObjective) && p.visibleObjective.length < 60, `${p.id}: one short sentence`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    assert.equal(nextHint(p, fresh).type, 'move', `${p.id}: a first hint`);
    assert.ok(!/press can/i.test(p.hints[0]), `${p.id}: the first hint is not Press Can’t`);
    const orders = q.order;
    assert.deepEqual([...orders].sort((x, y) => x - y), [...Array(size(q.deck || 2)).keys()], `${p.id}: the order holds every card once`);
    assert.ok(!neighbourTrio(q.deck || 2, orders), `${p.id}: no three neighbours make a trio`);
    const row = TABLE[p.id];
    assert.equal(q.mode, row.mode, `${p.id}: mode`);
    const checker = {complete: checkComplete, through: checkThrough, split: checkSplit, cap: checkCap, paint: checkPaint, game: checkGame}[q.mode];
    hintSteps += checker(p, fresh, row, {nines, counts});
    hintSteps += hintsSolve(p, fresh, 'from fresh');
    // Seeded random play, then hints.
    const random = rng(p.number * 101);
    for (let k = 0; k < 12; k++) hintSteps += hintsSolve(p, randomPlay(p, fresh, random, 1 + Math.floor(random() * 14)), `after random play ${k}`);
    checkForged(p, fresh);
  }
  return {trioPuzzles: puzzles.length, ...facts, hintSteps};
}

const mask = list => list.reduce((m, i) => m | (1 << i), 0);
// Every reachable position with the app to move (child first, the app's
// replies its own), for checking the app's choices.
function gamePositions() {
  const out = [];
  (function go(you, app) {
    const free = [...Array(9).keys()].filter(i => !you.includes(i) && !app.includes(i));
    for (const t of free) {
      const mine = [...you, t];
      if (ownsLine(mine)) continue;
      out.push([mine, app]);
      const reply = appClaim(mask(mine), mask(app));
      const theirs = [...app, reply];
      if (!ownsLine(theirs)) go(mine, theirs);
    }
  })([], []);
  return out;
}
function neighbourTrio(d, order) {
  if (d === 2) return order.some((_, k) => ruleHolds(2, order[k], order[(k + 1) % 9], order[(k + 2) % 9]));
  const cols = d === 3 ? 6 : 9, n = order.length;
  for (let k = 0; k < n; k++) {
    const r = Math.floor(k / cols), c = k % cols;
    if (c + 2 < cols && k + 2 < n && Math.floor((k + 2) / cols) === r && ruleHolds(d, order[k], order[k + 1], order[k + 2])) return true;
    if (k + 2 * cols < n && ruleHolds(d, order[k], order[k + cols], order[k + 2 * cols])) return true;
  }
  return false;
}

function checkComplete(p, fresh, row) {
  const q = p.parameters, d = q.deck;
  const answers = q.pairs.map(([x, y]) => thirdScan(d, x, y));
  assert.deepEqual(answers.map(i => nameOf(d, i)), row.answers, `${p.id}: the third cards`);
  assert.deepEqual(p.solution.answers, answers, `${p.id}: the stored witness`);
  let a = fresh, steps = 0;
  for (const [k, z] of answers.entries()) {
    const [x, y] = q.pairs[k];
    refuse(p, a, {type: 'pick', card: x}, 'a ringed card');
    const wrong = [...Array(size(d)).keys()].find(i => i !== x && i !== y && i !== z);
    const missed = play(p, a, {type: 'pick', card: wrong});
    assert.equal(missed.board.miss, wrong, `${p.id}: a wrong tap is marked`);
    assert.equal(missed.board.round, k, `${p.id}: and keeps the pair`);
    steps += hintsSolve(p, missed, `after a wrong tap in round ${k}`);
    a = play(p, a, {type: 'pick', card: z});
  }
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  for (const [action, why] of [[{type: 'pick', card: size(d)}, 'a card off the deck'], [{type: 'pick', card: '3'}, 'a card named by a string'], [{type: 'all'}, 'That’s all'], [{type: 'cant', trio: [0, 1, 2]}, 'Can’t'], [{type: 'claim', tile: 0}, 'a claim']]) refuse(p, fresh, action, why);
  return steps;
}

function checkThrough(p, fresh, row) {
  const q = p.parameters, c = q.centre;
  const through = LINES9.filter(t => t.includes(c)).map(t => t.filter(i => i !== c));
  assert.equal(through.length, row.count, `${p.id}: trios through the ringed tile`);
  let a = fresh, steps = 0;
  const early = play(p, fresh, {type: 'all'});
  assert.equal(early.board.told, 'more', `${p.id}: there is another`);
  refuse(p, early, {type: 'all'}, 'That’s all twice');
  steps += hintsSolve(p, early, 'after a wrong That’s all');
  // Undo after a wrong That's all keeps the answer.
  const kept = mechanicFor(p).carry(p, early.board, undo(early).board);
  assert.equal(kept.told, 'more', `${p.id}: Undo keeps “there is another”`);
  for (const [k, [x, y]] of through.entries()) {
    a = play(p, a, {type: 'pick', card: x});
    a = play(p, a, {type: 'pick', card: y});
    assert.equal(a.board.found.length, k + 1, `${p.id}: a trio is kept`);
    if (k === 0) {
      const again = play(p, play(p, a, {type: 'pick', card: y}), {type: 'pick', card: x});
      assert.equal(again.board.told, 'again', `${p.id}: found already`);
      const off = [...Array(9).keys()].find(i => i !== c && i !== x && i !== y && thirdScan(2, c, x) !== i);
      const bad = play(p, play(p, a, {type: 'pick', card: x}), {type: 'pick', card: off});
      assert.deepEqual(bad.board.pick, [x, off], `${p.id}: a pair that is not a trio stays picked`);
      steps += hintsSolve(p, bad, 'after a wrong pair');
    }
  }
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board), `${p.id}: That’s all after every trio`);
  for (const [action, why] of [[{type: 'pick', card: c}, 'the ringed tile'], [{type: 'pick', card: 9}, 'a tile off the board'], [{type: 'place', card: 0}, 'a tray move']]) refuse(p, fresh, action, why);
  return steps;
}

function checkSplit(p, fresh, row) {
  const classes = [...linesByDirection(2).values()];
  assert.equal(classes.length, row.count, `${p.id}: splits`);
  let a = fresh, steps = 0;
  const early = play(p, fresh, {type: 'all'});
  assert.equal(early.board.told, 'more');
  refuse(p, early, {type: 'all'}, 'That’s all twice');
  steps += hintsSolve(p, early, 'after a wrong That’s all');
  for (const [k, split] of classes.entries()) {
    for (const t of split) for (const i of t) a = play(p, a, {type: 'place', card: i});
    assert.equal(a.board.found.length, k + 1, `${p.id}: a split is kept`);
    assert.ok(a.board.trays.every(t => !t.length), `${p.id}: the trays empty`);
    if (k === 0) {
      let again = a;
      for (const t of [...split].reverse()) for (const i of t) again = play(p, again, {type: 'place', card: i});
      assert.equal(again.board.told, 'again', `${p.id}: found already, in another tray order`);
      // A wrong ninth tile: trays full but not three trios.
      const mixed = [[0, 1, 3], [2, 4, 5], [6, 7, 8]];
      let wrong = a;
      for (const t of mixed) for (const i of t) wrong = play(p, wrong, {type: 'place', card: i});
      assert.equal(wrong.board.trays.flat().length, 9, `${p.id}: a wrong split stays in the trays`);
      refuse(p, wrong, {type: 'place', card: 0}, 'a tile already in a tray');
      steps += hintsSolve(p, wrong, 'after a wrong split');
    }
  }
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  refuse(p, fresh, {type: 'lift', card: 0}, 'lifting a tile not in a tray');
  refuse(p, fresh, {type: 'place', card: 9}, 'a tile off the board');
  return steps;
}

function checkCap(p, fresh, row, {nines}) {
  const q = p.parameters, d = q.deck, n = size(d);
  const caps = d === 2 ? subsets(9, q.target).filter(s => !hasLine(2, s)) : q.target === 9 ? nines : null;
  assert.equal(caps.length > 0, row.possible, `${p.id}: possible or not`);
  if (row.count) assert.equal(caps.length, row.count, `${p.id}: how many`);
  let steps = 0;
  if (q.start) {
    assert.ok(!hasLine(d, q.start) && q.start.length === 8, `${p.id}: the start is eight with no trio`);
    assert.ok([...Array(n).keys()].every(c => q.start.includes(c) || hasLine(d, [...q.start, c])), `${p.id}: the start is stuck`);
    assert.equal(Math.max(...nines.map(s => s.filter(i => q.start.includes(i)).length)), row.startMost, `${p.id}: at most six of the start in any nine`);
    assert.deepEqual(fresh.board.chosen, [...q.start].sort((x, y) => x - y));
  }
  // Witness or a full try for Can't.
  const start = fresh.board.chosen;
  const reach = target => { let a = fresh; for (const i of start) if (!target.includes(i)) a = play(p, a, {type: 'pick', card: i}); for (const i of target) if (!a.board.chosen.includes(i)) a = play(p, a, {type: 'pick', card: i}); return a; };
  if (row.possible) {
    assert.ok(!hasLine(d, p.solution.witness) && p.solution.witness.length === q.target, `${p.id}: the stored witness`);
    assert.ok(isSolved(p, reach(p.solution.witness).board), `${p.id}: the witness solves`);
    assert.ok(isSolved(p, reach(caps.at(-1)).board), `${p.id}: any answer is accepted`);
  }
  if (q.dim) {
    // Dimmed cards can't be chosen.
    const a = q.start ? fresh : play(p, play(p, fresh, {type: 'pick', card: 0}), {type: 'pick', card: 1});
    const chosen = a.board.chosen, blocked = [...Array(n).keys()].filter(c => !chosen.includes(c) && hasLine(d, [...chosen, c]));
    assert.equal(blocked.length, q.start ? n - 8 : 1, `${p.id}: the dimmed cards`);
    for (const c of blocked) refuse(p, a, {type: 'pick', card: c}, 'a dimmed card');
  }
  if (q.can) {
    refuse(p, fresh, {type: 'cant', trio: [0, 1, 2]}, 'Can’t before a full try');
    // A full try holding a trio.
    const tri = LINES9[0], extra = [...Array(9).keys()].filter(i => !tri.includes(i)).slice(0, q.target - 3);
    const full = reach([...tri, ...extra]);
    refuse(p, full, {type: 'pick', card: [...Array(9).keys()].find(i => !full.board.chosen.includes(i))}, 'a tile past the count');
    const notTrio = findNonTrio(full.board.chosen);
    const wrong = play(p, full, {type: 'cant', trio: notTrio});
    assert.equal(wrong.board.told, 'not', `${p.id}: a certificate that is not a trio is refused`);
    assert.equal(move(p, wrong, {type: 'cant', trio: notTrio}), wrong, `${p.id}: a second wrong certificate is judged and refused the same way`);
    assert.equal(play(p, full, {type: 'cant', trio: [tri[0], tri[1], [...Array(9).keys()].find(i => !full.board.chosen.includes(i))]}).board.told, 'not', `${p.id}: a certificate off the chosen tiles is refused`);
    const claimed = play(p, full, {type: 'cant', trio: tri});
    if (row.possible) {
      assert.equal(claimed.board.told, 'way', `${p.id}: Can’t is refused when it can be done`);
      assert.ok(!isSolved(p, claimed.board));
      refuse(p, claimed, {type: 'cant', trio: tri}, 'Can’t after a refusal');
      const back = mechanicFor(p).carry(p, claimed.board, undo(claimed).board);
      assert.equal(back.told, 'way', `${p.id}: Undo keeps the refusal`);
      assert.ok(validBoard(p, back));
      const again = mechanicFor(p).carryOnRestart(p, claimed.board, restart(p, claimed).board);
      assert.equal(again.told, 'way', `${p.id}: Restart keeps the refusal`);
      steps += hintsSolve(p, {...claimed}, 'after a refused Can’t');
    } else {
      assert.ok(isSolved(p, claimed.board), `${p.id}: Can’t with a trio in a full try`);
      steps += hintsSolve(p, wrong, 'after a wrong certificate');
      // The hint chain reaches a full try before it names Can't.
      let a = fresh, k = 0;
      for (; k < 20; k++) { const h = nextHint(p, a); if (h.action.type === 'cant') break; a = play(p, a, h.action); }
      assert.equal(a.board.chosen.length, q.target, `${p.id}: hints make a full try first`);
      assert.match(nextHint(p, a).text, /^The .+ make a trio\.$/, `${p.id}: the reason comes with Can’t, which the second level marks`);
    }
    steps += hintsSolve(p, full, 'from a full try with a trio');
  } else refuse(p, fresh, {type: 'cant', trio: [0, 1, 2]}, 'Can’t in a puzzle without it');
  refuse(p, fresh, {type: 'pick', card: n}, 'a card off the deck');
  refuse(p, fresh, {type: 'paint', tile: 0, value: 1}, 'painting');
  return steps;
}
const findNonTrio = chosen => { for (const [i, j, k] of subsets(chosen.length, 3)) if (!ruleHolds(2, chosen[i], chosen[j], chosen[k])) return [chosen[i], chosen[j], chosen[k]]; return null; };

function checkPaint(p, fresh, row, {counts}) {
  const q = p.parameters;
  let steps = 0;
  if (q.rule === 'card') assert.equal(counts.length, row.count, `${p.id}: count designs`);
  else if (row.possible) assert.equal(p.solution.count, row.count, `${p.id}: colourings`);
  const flaggedBy = paint => q.rule === 'card' ? LINES9.filter(t => paint.every(v => v !== null) && ruleHolds(3, ...t.map(i => i + 9 * paint[i]))) : LINES9.filter(t => paint[t[0]] !== null && t.every(i => paint[i] === paint[t[0]]));
  const paintTo = target => target.reduce((a, v, t) => a.board.paint[t] === v ? a : play(p, a, {type: 'paint', tile: t, value: v}), fresh);
  if (row.possible) {
    assert.equal(flaggedBy(p.solution.witness).length, 0, `${p.id}: the stored witness`);
    assert.ok(isSolved(p, paintTo(p.solution.witness).board), `${p.id}: the witness solves`);
  }
  if (q.can) {
    refuse(p, fresh, {type: 'cant', trio: LINES9[0]}, 'Can’t before every tile is coloured');
    const flat = paintTo(Array(9).fill(0));
    const wrongTrio = [0, 1, 3];
    const wrong = play(p, flat, {type: 'cant', trio: wrongTrio});
    assert.equal(wrong.board.told, 'not', `${p.id}: three tiles that are not a trio are refused`);
    const claimed = play(p, flat, {type: 'cant', trio: LINES9[0]});
    if (row.possible) {
      assert.equal(claimed.board.told, 'way', `${p.id}: Can’t is refused when it can be done`);
      refuse(p, claimed, {type: 'cant', trio: LINES9[0]}, 'Can’t after a refusal');
      assert.equal(mechanicFor(p).carry(p, claimed.board, undo(claimed).board).told, 'way', `${p.id}: Undo keeps the refusal`);
      assert.equal(mechanicFor(p).carryOnRestart(p, claimed.board, restart(p, claimed).board).told, 'way', `${p.id}: Restart keeps the refusal`);
      steps += hintsSolve(p, claimed, 'after a refused Can’t');
    } else {
      assert.ok(isSolved(p, claimed.board), `${p.id}: Can’t with a one-colour trio`);
      // A mixed colouring: Can't needs a trio all one colour.
      const mixedTo = paintTo([0, 0, 1, 0, 0, 1, 1, 1, 0]);
      const bad = flaggedBy(mixedTo.board.paint), notMono = LINES9.find(t => !bad.some(b => lineKey(b) === lineKey(t)));
      assert.ok(bad.length >= 1, `${p.id}: a two-colouring always has a one-colour trio`);
      assert.equal(play(p, mixedTo, {type: 'cant', trio: notMono}).board.told, 'not', `${p.id}: a mixed trio is not a certificate`);
      steps += hintsSolve(p, wrong, 'after a wrong certificate');
      let a = fresh, k = 0;
      for (; k < 20; k++) { const h = nextHint(p, a); if (h.action.type === 'cant') break; a = play(p, a, h.action); }
      assert.ok(a.board.paint.every(v => v !== null), `${p.id}: hints colour every tile first`);
    }
  } else refuse(p, fresh, {type: 'cant', trio: LINES9[0]}, 'Can’t in a puzzle without it');
  refuse(p, fresh, {type: 'paint', tile: 0, value: q.values}, 'a value out of range');
  refuse(p, fresh, {type: 'paint', tile: 9, value: 0}, 'a tile off the board');
  if (q.start) refuse(p, fresh, {type: 'paint', tile: 0, value: q.start[0]}, 'the value a tile already has');
  return steps;
}

function checkGame(p, fresh) {
  let steps = 0;
  assert.ok(replay(p.solution.turns)?.over === 'won', `${p.id}: the stored game is a win`);
  let a = fresh;
  for (let k = 0; k < p.solution.turns.length; k += 2) a = play(p, a, {type: 'claim', tile: p.solution.turns[k]});
  assert.ok(isSolved(p, a.board), `${p.id}: the witness wins`);
  // Every first tile wins with best play; a losing second claim is answered by Back in the hints.
  for (let c = 0; c < 9; c++) {
    const one = play(p, fresh, {type: 'claim', tile: c});
    assert.equal(one.board.turns.length, 2, `${p.id}: the app answers at once`);
    const app = [one.board.turns[1]];
    for (const t of [...Array(9).keys()].filter(i => i !== c && i !== app[0])) {
      const two = play(p, one, {type: 'claim', tile: t});
      // After the app's answer the child is to move: 'mover' means the child still wins.
      const wins = gameValue(two.board.turns.filter((_, k) => k % 2 === 0), two.board.turns.filter((_, k) => k % 2)) === 'mover';
      const h = nextHint(p, two);
      assert.equal(h.type, 'move', `${p.id}: a losing claim is not a dead end shown at once`);
      assert.equal(h.action.type === 'back', !wins, `${p.id}: hints take back a claim exactly when it loses`);
      if (t === thirdScan(2, c, app[0])) assert.ok(wins, `${p.id}: the opposite keeps the win`);
    }
    if (c < 2) steps += hintsSolve(p, one, `after opening with tile ${c}`);
  }
  // A lost game: hints take back the losing tile.
  let lost = fresh;
  for (let k = 0; k < 6 && !replay(lost.board.turns).over; k++) {
    const s = replay(lost.board.turns), mine = [...Array(9).keys()].filter(i => s.you >> i & 1);
    const free = [...Array(9).keys()].filter(i => !((s.you | s.app) >> i & 1));
    lost = play(p, lost, {type: 'claim', tile: free.find(i => ownsLine([...mine, i])) ?? free[0]});
  }
  assert.equal(replay(lost.board.turns).over, 'lost', `${p.id}: a game played carelessly is lost`);
  {
    refuse(p, lost, {type: 'claim', tile: [...Array(9).keys()].find(i => !lost.board.turns.includes(i))}, 'a claim after a loss');
    assert.equal(nextHint(p, lost).action.type, 'back', `${p.id}: hints take back a losing tile`);
    steps += hintsSolve(p, lost, 'after a loss');
  }
  refuse(p, fresh, {type: 'back'}, 'Back before a turn');
  const one = play(p, fresh, {type: 'claim', tile: 4});
  refuse(p, one, {type: 'claim', tile: 4}, 'a tile you own');
  refuse(p, one, {type: 'claim', tile: one.board.turns[1]}, 'their tile');
  refuse(p, fresh, {type: 'claim', tile: 9}, 'a tile off the board');
  return steps;
}

function checkForged(p, fresh) {
  const q = p.parameters, B = fresh.board;
  const bad = [[null, 'nothing'], [{...B, extra: 1}, 'an unknown field']];
  if (q.mode === 'complete') bad.push([{...B, round: q.pairs.length + 1}, 'a round past the end'], [{...B, miss: third0(q)}, 'a “wrong” tap that was right'], [{...B, miss: q.pairs[0][0]}, 'a ringed card as a miss'], [{...B, round: -1}, 'a negative round']);
  if (q.mode === 'through') {
    const [x, y] = LINES9.find(t => t.includes(q.centre)).filter(i => i !== q.centre);
    bad.push([{...B, found: ['0.1']}, 'a found pair that is not a trio'], [{...B, pick: [x, y]}, 'a trio left picked'], [{...B, done: true}, 'That’s all too soon'], [{...B, found: [`${Math.min(x, y)}.${Math.max(x, y)}`, `${Math.min(x, y)}.${Math.max(x, y)}`]}, 'a trio found twice'], [{...B, pick: [q.centre]}, 'the ringed tile picked'], [{...B, told: 'again'}, '“found already” with nothing found']);
  }
  if (q.mode === 'split') bad.push([{...B, trays: [[0, 1, 2], [3, 4, 5], [6, 7, 8]]}, 'a split left in the trays'], [{...B, found: ['0.1.2|3.4.5|6.7.9']}, 'a forged split'], [{...B, trays: [[0, 0], [], []]}, 'a tile twice'], [{...B, done: true}, 'That’s all too soon'], [{...B, trays: [[0, 1, 2, 3], [], []]}, 'four in a tray']);
  if (q.mode === 'cap') {
    const some = [...Array(q.target).keys()];
    bad.push([{...B, chosen: [...Array(q.target + 1).keys()]}, 'too many'], [{...B, chosen: [2, 1]}, 'an unsorted list'], [{...B, chosen: some.map(i => i + 3), claim: LINES9[0], told: null}, 'a claim whose trio is not chosen'], [{...B, chosen: some, claim: LINES9[0], told: null}, TABLE[p.id].possible || !q.can ? 'a claim where it can be done' : null], [{...B, told: 'way'}, TABLE[p.id].possible && q.can ? null : 'a refusal where it can’t be done']);
    if (q.dim) bad.push([{...B, chosen: [0, 1, 2]}, 'a chosen trio with dimming']);
    if (q.can && !TABLE[p.id].possible) bad.push([{...B, chosen: [0, 1, 2], claim: [0, 1, 2], told: null}, 'a claim before a full try']);
  }
  if (q.mode === 'paint') bad.push([{...B, paint: Array(9).fill(q.values)}, 'a colour out of range'], [{...B, paint: Array(8).fill(0)}, 'eight tiles'], [{...B, claim: LINES9[0], told: null, paint: Array(9).fill(0)}, TABLE[p.id].possible ? 'a claim where it can be done' : null], [{...B, told: 'not'}, q.can ? (B.paint.every(v => v !== null) ? null : 'a wrong certificate before every tile is coloured') : 'a certificate without Can’t']);
  if (q.mode === 'paint' && q.start) bad.push([{...B, paint: [null, ...B.paint.slice(1)]}, 'a blank tile where every tile starts with a count']);
  if (q.mode === 'game') bad.push([{turns: [0, 0]}, 'a tile claimed twice'], [{turns: [0]}, 'a turn without the app’s answer'], [{turns: [0, (appClaim(1, 0) + 1) % 9 || 2]}, 'an answer the app would not give'], [{turns: [9, 0]}, 'a tile off the board']);
  for (const [board, why] of bad) if (why) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}
const third0 = q => thirdScan(q.deck, ...q.pairs[0]);

function checkPlayground(p, fresh) {
  const q = p.parameters;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  assert.equal(nextHint(p, fresh).type, 'done');
  for (const d of [2, 3, 4]) {
    assert.deepEqual([...q.orders[d]].sort((x, y) => x - y), [...Array(size(d)).keys()], `${p.id}: the ${size(d)} order`);
    assert.ok(!neighbourTrio(d, q.orders[d]), `${p.id}: no three neighbours make a trio in the ${size(d)}`);
    let a = d === fresh.board.deck ? fresh : play(p, fresh, {type: 'deck', deck: d});
    assert.deepEqual(a.board, {deck: d, chosen: []});
    // Choose in order until stuck: every refusal is a card ruled out by a chosen pair.
    for (let c = 0; c < size(d); c++) {
      const blocked = hasLine(d, [...a.board.chosen, c]);
      const next = move(p, a, {type: 'pick', card: c});
      assert.equal(next === null, blocked, `${p.id}: card ${c} of ${size(d)} ${blocked ? 'is dimmed' : 'can be chosen'}`);
      if (next) a = next;
    }
    assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
    if (d === 2) assert.equal(a.board.chosen.length, 4, `${p.id}: the nine stick at four`);
    const off = play(p, a, {type: 'pick', card: a.board.chosen[0]});
    assert.equal(off.board.chosen.length, a.board.chosen.length - 1, `${p.id}: a tap puts a card back`);
    assert.deepEqual(play(p, a, {type: 'clear'}).board.chosen, []);
    refuse(p, play(p, a, {type: 'clear'}), {type: 'clear'}, 'Clear with nothing chosen');
  }
  refuse(p, fresh, {type: 'deck', deck: 2}, 'the same deck');
  refuse(p, fresh, {type: 'deck', deck: 5}, 'an unknown deck');
  refuse(p, fresh, {type: 'pick', card: 9}, 'a card off the nine');
  refuse(p, fresh, {type: 'cant', trio: [0, 1, 2]}, 'Can’t in the playground');
  for (const [board, why] of [[{deck: 2, chosen: [0, 1, 2]}, 'a chosen trio'], [{deck: 5, chosen: []}, 'an unknown deck'], [{deck: 2, chosen: [9]}, 'a card off the deck'], [{deck: 3, chosen: [1, 0]}, 'an unsorted list'], [{deck: 2, chosen: [], told: 'more'}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

export default validateTrios;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateTrios(), null, 2));
