// Checks the Bead rings pack (dist/families/beads/beads.json): content fields
// and sources; every answer set, witness and fewest count against an
// independent model in which rings are lists of numbers and turns and flips
// are permutations found from the geometry of points on a circle; the
// theorems the notes rely on (the first matching turn divides n, necklace and
// coloured-cycle counting formulas, the de Bruijn count, distinguishing
// numbers of cycles, the possible numbers of matching flips); hint chains to a
// solve from fresh and scrambled boards; claims; illegal moves; Undo keeping
// what was found; forged saves; and the playground.
// Run: node scripts/validate-beads.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {answers, fewestOf, PLAY_SIZES} from '../dist/families/beads/beads.js';
import {loadPack} from './packs.mjs';
import {EMPTY} from '../dist/bead-ring.js';

// ---- An independent model. A ring is an array of colour numbers 0..c−1.
const LETTERS = 'ABC';
const toWord = r => r.map(x => LETTERS[x]).join('');
const fromWord = w => [...w].map(ch => LETTERS.indexOf(ch));
function* rings(n, c) { for (let x = 0; x < c ** n; x++) yield Array.from({length: n}, (_, i) => Math.floor(x / c ** i) % c); }
// The symmetries of a regular n-gon, as permutations found by moving the
// points (cos, sin) of the vertices and seeing where each lands.
const groups = new Map();
function symmetries(n) {
  if (groups.has(n)) return groups.get(n);
  const pts = Array.from({length: n}, (_, i) => [Math.cos(2 * Math.PI * i / n), Math.sin(2 * Math.PI * i / n)]);
  const land = ([x, y]) => pts.findIndex(([u, v]) => Math.hypot(u - x, v - y) < 1e-9);
  const rotations = [], reflections = [];
  for (let k = 0; k < n; k++) {
    const t = 2 * Math.PI * k / n, c = Math.cos(t), s = Math.sin(t);
    rotations.push(pts.map(([x, y]) => land([c * x - s * y, s * x + c * y])));
    // Reflection in the line at angle πk/n.
    const c2 = Math.cos(t), s2 = Math.sin(t);
    reflections.push(pts.map(([x, y]) => land([c2 * x + s2 * y, s2 * x - c2 * y])));
  }
  for (const perm of [...rotations, ...reflections]) assert.ok(perm.every(i => i >= 0) && new Set(perm).size === n, `n=${n}: every symmetry permutes the vertices`);
  const g = {rotations, reflections};
  groups.set(n, g);
  return g;
}
const act = (perm, r) => { const out = Array(r.length); perm.forEach((j, i) => { out[j] = r[i]; }); return out; };
const same = (a, b) => a.every((x, i) => x === b[i]);
const orbit = (r, flips) => { const g = symmetries(r.length); return [...g.rotations, ...(flips ? g.reflections : [])].map(perm => toWord(act(perm, r))); };
const classKey = (r, flips) => orbit(r, flips).sort()[0];
const fixedRotations = r => symmetries(r.length).rotations.filter(perm => same(act(perm, r), r)).length;
const fixedReflections = r => symmetries(r.length).reflections.filter(perm => same(act(perm, r), r)).length;
const firstReturn = r => { const n = r.length; for (let d = 1; d <= n; d++) if (same(act(symmetries(n).rotations[d % n], r), r)) return d; return n; };
const distinguishing = r => fixedRotations(r) === 1 && fixedReflections(r) === 0;
const used = r => new Set(r).size;
const neighboursDiffer = r => r.every((x, i) => x !== r[(i + 1) % r.length]);
const windowSet = (r, k) => new Set(r.map((_, i) => Array.from({length: k}, (_, j) => r[(i + j) % r.length]).join('')));
// The puzzle's goal, read from its parameters by this model.
function goal(p, r) {
  const q = p.parameters, count = x => r.filter(y => y === x).length;
  if (q.counts && Object.entries(q.counts).some(([ch, k]) => count(LETTERS.indexOf(ch)) !== k)) return false;
  if (q.mixed && used(r) < 2) return false;
  if (q.apart && !neighboursDiffer(r)) return false;
  if (q.windows && windowSet(r, q.windows).size !== r.length) return false;
  if (q.period && firstReturn(r) !== q.period) return false;
  if (q.sooner && firstReturn(r) >= r.length) return false;
  if (p.mechanic === 'lopsided') return q.flips === undefined ? distinguishing(r) : fixedReflections(r) === q.flips;
  return true;
}
const brute = p => { const keys = new Set(); for (const r of rings(p.parameters.n, p.parameters.colours)) if (goal(p, r)) keys.add(classKey(r, p.mechanic === 'lopsided')); return [...keys].sort(); };
const phi = n => { let k = 0; for (let i = 1; i <= n; i++) { let a = i, b = n; while (b) [a, b] = [b, a % b]; if (a === 1) k++; } return k; };
const divisors = n => Array.from({length: n}, (_, i) => i + 1).filter(d => n % d === 0);
const necklaces = (n, c) => divisors(n).reduce((s, d) => s + phi(d) * c ** (n / d), 0) / n;
const prime = n => n > 1 && divisors(n).length === 2;

export async function validateBeads() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/beads/beads.json', import.meta.url), 'utf8')), {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  const family = pack.families[0];
  assert.equal(family.id, 'beads'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = pack.puzzles.filter(p => p.band === 'all' && !p.group), hidden = pack.puzzles.filter(p => p.group), playgrounds = pack.puzzles.filter(p => p.band === 'playground');
  assert.equal(playgrounds.length, 1); assert.equal(core.length + hidden.length + 1, pack.puzzles.length);
  assert.ok(core.length >= 8 && core.length <= 12, '8 to 12 necklace puzzles');
  assert.ok(hidden.length >= 5 && hidden.length <= 12, 'a short set of Hidden turns');
  for (const list of [core, hidden]) {
    assert.deepEqual(list.map(p => p.number), list.map((_, i) => i + 1), 'numbers run 1..n');
    for (const level of ['easy', 'medium', 'hard']) assert.ok(list.some(p => p.difficulty_level === level), level);
  }
  for (const p of pack.puzzles) {
    assert.ok(isExpansion(p)); assert.equal(p.revision, 1); assert.match(p.id, /^beads-/);
    assert.equal(p.mechanic, p.group ? 'lopsided' : 'beads');
    if (p.group) { assert.equal(p.libraryFamily, 'beads'); assert.equal(p.band, 'all'); }
    for (const key of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id} ${key}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3); p.hints.forEach(h => assert.ok(h.trim()));
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id} parent.${key}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
  }

  // ---- Theorems the notes and puzzles rely on.
  let theoremChecks = 0;
  for (let n = 2; n <= 9; n++) for (const c of [2, 3]) {
    if (c ** n > 20000) continue;
    const list = [...rings(n, c)];
    // The first matching turn divides n; at a prime length a mixed ring needs all n.
    for (const r of list) { const d = firstReturn(r); assert.equal(n % d, 0, `n=${n}: first return ${d} divides n`); if (prime(n) && used(r) > 1) assert.equal(d, n); theoremChecks++; }
    // Necklaces: the Burnside count, and Fermat's c + (c^p − c)/p at a prime.
    const classes = new Set(list.map(r => classKey(r, false))).size;
    assert.equal(classes, necklaces(n, c), `necklaces of ${n} in ${c}`);
    if (prime(n)) assert.equal(classes, c + (c ** n - c) / n, `Fermat count at ${n}`);
    // Coloured cycles: (c − 1)^n + (−1)^n (c − 1) rows with no neighbours alike.
    assert.equal(list.filter(neighboursDiffer).length, (c - 1) ** n + (-1) ** n * (c - 1), `proper colourings of C${n}`);
    // Matching flips number 0 or the number of matching turns.
    for (const r of list) { const f = fixedReflections(r); assert.ok(f === 0 || f === fixedRotations(r), `n=${n}: ${toWord(r)} flips ${f}`); }
    theoremChecks += 3;
  }
  // Distinguishing colourings: three colours for 3, 4, 5 beads; two from 6 on,
  // and then the less common colour has at least three beads.
  for (let n = 3; n <= 10; n++) {
    const two = [...rings(n, 2)].filter(distinguishing);
    assert.equal(two.length > 0, n >= 6, `two colours on ${n}`);
    for (const r of two) assert.ok(Math.min(r.filter(x => x === 0).length, r.filter(x => x === 1).length) >= 3, `${toWord(r)}: three of each`);
    if (n <= 8) assert.ok([...rings(n, 3)].some(distinguishing), `three colours on ${n}`);
    theoremChecks++;
  }
  // De Bruijn rings for windows of k: 2^(2^(k−1) − k) up to turning.
  for (const k of [2, 3, 4]) {
    const n = 2 ** k, found = new Set([...rings(n, 2)].filter(r => windowSet(r, k).size === n).map(r => classKey(r, false)));
    assert.equal(found.size, 2 ** (2 ** (k - 1) - k), `de Bruijn rings for k=${k}`);
    theoremChecks++;
  }

  // ---- Each puzzle: answers, witnesses, hints, claims, illegal moves and saves.
  let hintSteps = 0, claims = 0;
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const p of [...core, ...hidden]) {
    const q = p.parameters, want = brute(p), m = mechanicFor(p), n = q.n;
    assert.deepEqual(answers(p), want, `${p.id}: answer set`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: valid unsolved start`);
    for (const bad of [{type: 'paint', bead: -1}, {type: 'paint', bead: n}, {type: 'paint', bead: 1.5}, {type: 'paint', bead: 0, colour: 'D'}, {type: 'paint', bead: 0, colour: q.colours === 2 ? 'C' : '.'}, {type: 'size', n: 5}, {type: 'clear'}, {type: 'done'}, {type: 'claim'}, null, 'A']) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)} at the start`);
    assert.equal(validBoard(p, {...fresh.board, ring: fresh.board.ring + '.'}), false, `${p.id}: wrong length rejected`);
    assert.equal(validBoard(p, {...fresh.board, ring: 'D'.repeat(n)}), false, `${p.id}: unknown colour rejected`);
    const paint = (a, word) => { for (let i = 0; i < n; i++) if (a.board.ring[i] !== word[i]) { const next = move(p, a, {type: 'paint', bead: i, colour: word[i]}); assert.ok(next, `${p.id}: paint ${word}`); a = next; } return a; };

    if (q.mode === 'every') {
      assert.ok(want.length, `${p.id}: something to find`);
      assert.equal(q.answers, want.length, `${p.id}: asks for every ring`);
      assert.deepEqual(p.solution.rings, want, `${p.id}: witness rings`);
      if (!q.counts && !q.apart && !q.windows && p.mechanic === 'beads') assert.equal(want.length, necklaces(n, q.colours), `${p.id}: necklace count`);
      if (q.apart && prime(n)) assert.equal(want.length, ((q.colours - 1) ** n - (q.colours - 1)) / n, `${p.id}: every coloured cycle has n readouts`);
      // Hints alone reach a solve, from fresh and scrambled boards.
      const solveFrom = (start, label) => {
        let a = start;
        for (let i = 0; !isSolved(p, a.board) && i < 400; i++) {
          const hint = nextHint(p, a);
          assert.equal(hint.type, 'move', `${p.id} ${label}: ${hint.text}`);
          const next = move(p, a, hint.action);
          assert.ok(next && next !== a, `${p.id} ${label}: hint ${JSON.stringify(hint.action)} is legal`);
          a = next; hintSteps++;
        }
        assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
        return a;
      };
      const done = solveFrom(fresh, 'fresh');
      assert.deepEqual([...done.board.found].sort(), want, `${p.id}: hints find every class`);
      for (let trial = 0; trial < 4; trial++) {
        let a = fresh;
        for (let k = 0; k < 2 * n; k++) { const next = move(p, a, {type: 'paint', bead: Math.floor(random() * n)}); if (next && !isSolved(p, next.board)) a = next; }
        solveFrom(a, `scrambled ${trial}`);
      }
      assert.equal(move(p, done, {type: 'paint', bead: 0}), null, `${p.id}: no moves after a solve`);
      // The last bead of a ring decides what is kept: a class not found yet,
      // not a turned copy of one already found, and never a ring that misses.
      const last = (found, word) => move(p, {...fresh, board: {...fresh.board, found, ring: EMPTY + word.slice(1)}}, {type: 'paint', bead: 0, colour: word[0]});
      let a = last([], want[0]);
      assert.deepEqual(a.board.found, [want[0]], `${p.id}: the first class is kept`);
      const turned = toWord(act(symmetries(n).rotations[1 % n], fromWord(want[0])));
      if (turned !== want[0]) assert.deepEqual(last([want[0]], turned).board.found, [want[0]], `${p.id}: a turned ring is not new`);
      const misfit = [...rings(n, q.colours)].find(r => !goal(p, r));
      if (misfit) assert.deepEqual(last([], toWord(misfit)).board.found, [], `${p.id}: a ring that misses is not kept`);
      // An early That's all is answered and changes nothing else.
      const early = move(p, a, {type: 'done'});
      if (want.length > 1) { assert.ok(early.board.early && !isSolved(p, early.board), `${p.id}: “There is another”`); assert.deepEqual(early.board.found, a.board.found); }
      // Forged saves.
      assert.equal(validBoard(p, {...fresh.board, found: ['forged']}), false, `${p.id}: forged ring rejected`);
      assert.equal(validBoard(p, {...fresh.board, found: [want[0], want[0]]}), false, `${p.id}: duplicate rejected`);
      if (want.length > 1) assert.equal(validBoard(p, {...fresh.board, found: [want[0]], claimed: true}), false, `${p.id}: an early claim cannot be saved as solved`);
      // Undo after a discovery keeps it.
      const back = undo(a), kept = {...back, board: m.carry(p, a.board, back.board)};
      assert.deepEqual(kept.board.found, [want[0]], `${p.id}: Undo keeps a found ring`);
      assert.ok(validBoard(p, kept.board), `${p.id}: board after Undo is valid`);
      continue;
    }

    // Make and fewest puzzles show the authored hints only.
    assert.equal(nextHint(p, fresh).type, 'note', `${p.id}: hints never say whether a ring exists`);
    if (q.fewest) {
      const measureOf = r => q.fewest === 'colours' ? used(r) : r.filter(x => x === LETTERS.indexOf(q.fewest)).length;
      const best = Math.min(...[...rings(n, q.colours)].filter(distinguishing).map(measureOf));
      assert.equal(fewestOf(p), best, `${p.id}: fewest`);
      assert.equal(p.solution.fewest, best);
      assert.ok(distinguishing(fromWord(p.solution.ring)) && measureOf(fromWord(p.solution.ring)) === best, `${p.id}: witness`);
      // The witness alone is noted but is not a solve, and has nothing to claim.
      const witness = paint(fresh, p.solution.ring);
      assert.ok(witness.board.found.includes(best) && !isSolved(p, witness.board), `${p.id}: the witness alone is not a solve`);
      assert.equal(move(p, witness, {type: 'claim'}), null, `${p.id}: no claim on a lopsided ring`);
      // Below the fewest every ring has a matching motion, so the claim is true.
      const below = [...rings(n, q.colours)].find(r => measureOf(r) === best - 1);
      let a = paint(fresh, toWord(below));
      assert.ok(!isSolved(p, a.board));
      a = move(p, a, {type: 'claim'}); claims++;
      assert.ok(a && a.board.claims.includes(best - 1), `${p.id}: a true claim is kept`);
      assert.ok(!isSolved(p, a.board), `${p.id}: the claim alone is not a solve`);
      // A false claim, at the fewest, is refused.
      const symmetric = [...rings(n, q.colours)].find(r => measureOf(r) === best && !distinguishing(r));
      const tried = paint(fresh, toWord(symmetric)), refused = move(p, tried, {type: 'claim'});
      assert.ok(refused && refused.board.wrong === best && !refused.board.claims.includes(best), `${p.id}: a false claim is refused`);
      // A lopsided ring with more than the fewest is noted but does not solve.
      const extra = [...rings(n, q.colours)].find(r => distinguishing(r) && measureOf(r) > best);
      if (extra) { const more = paint(fresh, toWord(extra)); assert.ok(more.board.found.includes(measureOf(extra)) && !isSolved(p, more.board), `${p.id}: more than the fewest is not a solve`); }
      const done = paint(a, p.solution.ring);
      assert.ok(isSolved(p, done.board), `${p.id}: witness plus claim solves`);
      assert.equal(move(p, done, {type: 'paint', bead: 0}), null, `${p.id}: no moves after a solve`);
      // Forged saves: a claim that is false, a ring never found.
      assert.equal(validBoard(p, {...fresh.board, tried: [best], claims: [best]}), false, `${p.id}: a false claim cannot be saved`);
      assert.equal(validBoard(p, {...fresh.board, tried: [best - 1], found: [best - 1]}), false, `${p.id}: an impossible ring cannot be saved`);
      const back = undo(done), kept = {...back, board: m.carry(p, done.board, back.board)};
      assert.ok(kept.board.claims.includes(best - 1) && validBoard(p, kept.board), `${p.id}: Undo keeps a true claim`);
      continue;
    }
    // Make: a witness when a ring exists, and a checked claim either way.
    const possible = want.length > 0;
    if (possible) {
      assert.ok(goal(p, fromWord(p.solution.ring)), `${p.id}: witness`);
      const done = paint(fresh, p.solution.ring);
      assert.ok(isSolved(p, done.board), `${p.id}: the witness solves`);
      assert.equal(move(p, done, {type: 'claim'}), null, `${p.id}: no moves after a solve`);
    } else assert.equal(p.solution.ring, null, `${p.id}: no ring`);
    const failing = [...rings(n, q.colours)].find(r => !goal(p, r));
    const tried = paint(fresh, toWord(failing));
    assert.ok(!isSolved(p, tried.board), `${p.id}: a ring that misses is not a solve`);
    const claim = move(p, tried, {type: 'claim'}); claims++;
    if (possible) { assert.ok(claim.board.wrong && !isSolved(p, claim.board), `${p.id}: a false claim is refused`); assert.equal(move(p, claim, {type: 'claim'}), null, `${p.id}: no second claim until something changes`); }
    else {
      assert.ok(isSolved(p, claim.board), `${p.id}: a true claim solves`);
      assert.equal(validBoard(p, {...fresh.board, claimed: true}), false, `${p.id}: a claim before any ring cannot be saved`);
    }
    assert.equal(validBoard(p, {...tried.board, claimed: possible, wrong: !possible}), false, `${p.id}: a forged claim is rejected`);
  }

  // ---- The playground: sizes, colours, painting, and nothing is ever solved.
  const [pg] = playgrounds;
  let a = freshAttempt(pg);
  assert.ok(validBoard(pg, a.board) && !isSolved(pg, a.board));
  for (const n of PLAY_SIZES) {
    a = move(pg, a, {type: 'size', n}) || a;
    assert.equal(a.board.n, n); assert.equal(a.board.ring.length, n);
    for (let i = 0; i < n; i += 2) a = move(pg, a, {type: 'paint', bead: i});
    assert.equal(move(pg, a, {type: 'paint', bead: n}), null);
    assert.ok(!isSolved(pg, a.board));
  }
  a = move(pg, a, {type: 'colours', colours: 3});
  assert.equal(a.board.colours, 3);
  a = move(pg, a, {type: 'paint', bead: 0}); a = move(pg, a, {type: 'paint', bead: 0});
  assert.equal(a.board.ring[0], 'C', 'three colours cycle to blue');
  a = move(pg, a, {type: 'colours', colours: 2});
  assert.ok(!a.board.ring.includes('C'), 'two colours repaint blue beads');
  assert.equal(move(pg, a, {type: 'size', n: 11}), null);
  assert.equal(move(pg, a, {type: 'colours', colours: 4}), null);
  assert.equal(validBoard(pg, {n: 6, colours: 2, ring: 'AAAA'}), false);
  return {necklacePuzzles: core.length, hiddenTurns: hidden.length, playground: 1, sources: pack.sources.length, hintSteps, claims, theoremChecks};
}
export default validateBeads;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateBeads(), null, 2));
