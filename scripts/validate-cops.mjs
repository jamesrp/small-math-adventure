// Validates Cops and robbers (worksheet Week 86) by methods independent of
// the mechanic's own search: a game solver by rounds with its own move lists,
// brute-force automorphisms and isomorphisms, every order of folds, and a
// concrete check of each escape certificate over every position, with the
// child's answers turned by the symmetry. Also: every claim against every
// connected map on up to six dots, the perfect robber from every reachable
// position, budgets, hints alone from fresh and after mistakes, illegal moves
// and forged saves. Run by `npm run build`, or alone:
// node scripts/validate-cops.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as game from '../dist/families/cops/game.js';
import {copsMechanics, gameOf, escapeState, chase, twoChase, flee} from '../dist/families/cops/cops.js';

const INF = Infinity;
// --- An independent model -----------------------------------------------------
// A map as dot ids and neighbour sets (staying included), built here.
function model(spec) {
  const ids = Object.keys(spec.nodes), at = new Map(ids.map((id, i) => [id, i])), nb = ids.map((_, i) => new Set([i]));
  for (const [u, v] of spec.roads) { nb[at.get(u)].add(at.get(v)); nb[at.get(v)].add(at.get(u)); }
  return {ids, at, nb: nb.map(s => [...s].sort((x, y) => x - y)), n: ids.length};
}
// Rounds: W[k] holds the positions (C to move on c, R on r) from which C
// catches within k moves; the value is the first k, or INF if none.
function rounds(M) {
  const {n, nb} = M, val = Array.from({length: n}, () => Array(n).fill(INF));
  for (let k = 1; k <= n * n + 1; k++) {
    const next = val.map(row => [...row]);
    let grew = false;
    for (let c = 0; c < n; c++) for (let r = 0; r < n; r++) {
      if (c === r || val[c][r] < INF) continue;
      if (nb[c].some(c2 => c2 === r || nb[r].every(r2 => r2 === c2 || val[c2][r2] < k))) { next[c][r] = k; grew = true; }
    }
    for (let c = 0; c < n; c++) val[c] = next[c];
    if (!grew) break;
  }
  return val;
}
const startValue = (M, val, c) => Math.max(...M.ids.map((_, r) => r === c ? -1 : val[c][r]));
const best = (M, val) => Math.min(...M.ids.map((_, c) => startValue(M, val, c)));
function rounds2(M) {
  const {n, nb} = M, val = Array.from({length: n}, () => Array.from({length: n}, () => Array(n).fill(INF)));
  for (let k = 1; k <= n * n * n + 1; k++) {
    const hits = [];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let r = 0; r < n; r++) {
      if (r === a || r === b || val[a][b][r] < INF) continue;
      if (nb[a].some(a2 => nb[b].some(b2 => a2 === r || b2 === r || nb[r].every(r2 => r2 === a2 || r2 === b2 || val[a2][b2][r2] < k)))) hits.push([a, b, r]);
    }
    if (!hits.length) break;
    for (const [a, b, r] of hits) val[a][b][r] = k;
  }
  return val;
}
// Automorphisms by trying every permutation (maps here have at most 8 dots).
function perms(n) {
  const out = [], p = [...Array(n).keys()];
  (function go(i) { if (i === n) { out.push([...p]); return; } for (let j = i; j < n; j++) { [p[i], p[j]] = [p[j], p[i]]; go(i + 1); [p[i], p[j]] = [p[j], p[i]]; } })(0);
  return out;
}
const permCache = new Map();
const allPerms = n => { if (!permCache.has(n)) permCache.set(n, perms(n)); return permCache.get(n); };
const edgeSet = M => new Set(M.nb.flatMap((list, i) => list.filter(j => j > i).map(j => `${i},${j}`)));
function autos(M) {
  const E = edgeSet(M);
  return allPerms(M.n).filter(s => [...E].every(e => { const [i, j] = e.split(',').map(Number); const [x, y] = [s[i], s[j]].sort((a, b) => a - b); return E.has(`${x},${y}`); }));
}
function isomorphic(A, B) {
  if (A.n !== B.n) return false;
  const EA = edgeSet(A), EB = edgeSet(B);
  if (EA.size !== EB.size) return false;
  return allPerms(A.n).some(s => [...EA].every(e => { const [i, j] = e.split(',').map(Number); const [x, y] = [s[i], s[j]].sort((a, b) => a - b); return EB.has(`${x},${y}`); }));
}
// Every order of folds, by brute force: the set of dot counts it can end at.
function foldEnds(M) {
  const ends = new Set(), seen = new Set();
  (function go(gone) {
    const key = [...gone].sort().join();
    if (seen.has(key)) return;
    seen.add(key);
    let any = false;
    for (let v = 0; v < M.n; v++) for (let u = 0; u < M.n; u++) {
      if (u === v || gone.has(u) || gone.has(v)) continue;
      if (M.nb[v].every(w => gone.has(w) || M.nb[u].includes(w))) { any = true; gone.add(v); go(gone); gone.delete(v); }
    }
    if (!any) ends.add(M.n - gone.size);
  })(new Set());
  return ends;
}

// --- A concrete check of an escape certificate --------------------------------
// The answers are replayed through the mechanic's exploration to collect what
// was asked and answered: R's start for each C start, and R's reply to each
// position after a C move. Each answer is then turned by every symmetry onto
// every position like it, and every position R can reach from every C start
// is checked: no C move ever lands on R.
function certificate(spec, answers) {
  const M = model(spec), G = gameOf(spec), S = autos(M), place = new Map(), reply = new Map();
  for (let k = 0; k <= answers.length; k++) {
    const e = escapeState(G, answers.slice(0, k));
    if (k === answers.length) { assert.equal(e.status, 'done', 'the answers finish the exploration'); break; }
    const a = M.at.get(answers[k]);
    if (e.status === 'place') for (const s of S) { if (!place.has(s[e.c])) place.set(s[e.c], s[a]); }
    else if (e.status === 'reply') for (const s of S) { const key = `${s[e.c]},${s[e.r]}`; if (!reply.has(key)) reply.set(key, s[a]); }
    else assert.fail(`unexpected ${e.status}`);
  }
  let positions = 0;
  for (let c0 = 0; c0 < M.n; c0++) {
    assert.ok(place.has(c0), `a start for R against C on ${M.ids[c0]}`);
    const r0 = place.get(c0);
    assert.ok(r0 !== c0, 'R never starts on C');
    const seen = new Set([`${c0},${r0}`]), queue = [[c0, r0]];
    while (queue.length) {
      const [c, r] = queue.shift();
      positions++;
      for (const c2 of M.nb[c]) {
        assert.notEqual(c2, r, `C on ${M.ids[c]} catches R on ${M.ids[r]}`);
        const r2 = reply.get(`${c2},${r}`);
        assert.ok(r2 !== undefined, `an answer to C on ${M.ids[c2]} with R on ${M.ids[r]}`);
        assert.ok(M.nb[r].includes(r2) && r2 !== c2, 'the answer is a legal move');
        const key = `${c2},${r2}`;
        if (!seen.has(key)) { seen.add(key); queue.push([c2, r2]); }
      }
    }
  }
  return positions;
}
// Random children: answers drawn at random among the legal ones. A finished
// exploration must always pass the concrete check, and on a map where C wins
// the exploration must always end in a catch.
function randomChildren(spec, tries, rand) {
  const G = gameOf(spec), copWin = best(model(spec), rounds(model(spec))) < INF;
  let done = 0, caught = 0;
  for (let t = 0; t < tries; t++) {
    const answers = [];
    for (let k = 0; k < 400; k++) {
      const e = escapeState(G, answers);
      if (e.status === 'done') { assert.ok(!copWin, 'no escape on a map where C wins'); certificate(spec, answers); done++; break; }
      if (e.status === 'caught') { caught++; break; }
      const options = e.status === 'place' ? G.ids.filter((_, i) => i !== e.c) : G.nb[e.r].filter(i => i !== e.c).map(i => G.ids[i]);
      answers.push(options[Math.floor(rand() * options.length)]);
    }
  }
  return {done, caught};
}
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// --- The pack -----------------------------------------------------------------
function play(m, p, b, actions) {
  for (const a of actions) { const next = m.move(p, b, a); assert.ok(next, `${p.id}: ${JSON.stringify(a)} is legal`); b = next; }
  return b;
}
function hintsSolve(m, p, b, label) {
  for (let k = 0; k < 200 && !m.solved(p, b); k++) {
    const h = m.hint(p, b);
    assert.equal(h.type, 'move', `${p.id} ${label}: hint ${k} is a move (${h.text})`);
    b = m.move(p, b, h.action);
    assert.ok(b, `${p.id} ${label}: hint ${k} is legal`);
  }
  assert.ok(m.solved(p, b), `${p.id} ${label}: hints solve it`);
  return b;
}

export default async function validateCops() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/cops/cops.json', import.meta.url), 'utf8'));
  const puzzles = pack.puzzles, stats = {puzzles: puzzles.length, maps: 0, certificates: 0, positionsChecked: 0, graphs: 0};
  assert.equal(new Set(puzzles.map(p => p.id)).size, puzzles.length);
  const one = copsMechanics.cops, fold = copsMechanics.copsfold, two = copsMechanics.copstwo;

  // Every claim on every connected map with up to six dots: C wins with one
  // cop exactly when the map folds to one dot, every order of folds ends at
  // the same size, and the mechanic's values match the rounds.
  for (let n = 1; n <= 6; n++) {
    const pairs = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
    for (let mask = 0; mask < 1 << pairs.length; mask++) {
      const roads = pairs.filter((_, k) => mask >> k & 1).map(([i, j]) => [`v${i}`, `v${j}`]);
      const spec = {nodes: Object.fromEntries(Array.from({length: n}, (_, i) => [`v${i}`, [0, 0]])), roads}, M = model(spec);
      const reach = new Set([0]), queue = [0];
      for (let k = 0; k < queue.length; k++) for (const v of M.nb[queue[k]]) if (!reach.has(v)) { reach.add(v); queue.push(v); }
      if (reach.size !== n) continue;
      stats.graphs++;
      const val = rounds(M), G = gameOf(spec), V = game.oneCop(G).V;
      let same = true;
      for (let c = 0; c < n; c++) for (let r = 0; r < n; r++) if (c !== r && V[c][r] !== val[c][r]) same = false;
      if (!same) assert.fail(`values on ${JSON.stringify(roads)}`);
      // Greedy folding (the mechanic's list) against cop-win; every order on maps up to five dots.
      const gone = new Set();
      for (let open = game.folds(G, gone); open.length; open = game.folds(G, gone)) gone.add(open[0][0]);
      if ((gone.size === n - 1) !== (best(M, val) < INF)) assert.fail(`cop-win exactly when it folds to one dot: ${JSON.stringify(roads)}`);
      if (n <= 5 && foldEnds(M).size !== 1) assert.fail(`every fold order ends at one size: ${JSON.stringify(roads)}`);
    }
  }

  for (const p of puzzles) {
    const q = p.parameters;
    if (p.mechanic === 'copsfold') {
      const M = model(q), ends = [...foldEnds(M)], copWin = best(M, rounds(M)) < INF;
      assert.equal(ends.length, 1, `${p.id}: every fold order ends at one size`);
      assert.equal(ends[0] === 1, copWin, `${p.id}: folds down exactly when C wins`);
      const b = hintsSolve(fold, p, fold.fresh(p), 'from fresh');
      assert.equal(b.claim === 'stuck', !copWin, `${p.id}: the solve is Can’t exactly when C does not win`);
      // A refused Can't stands until a fold, and a fold past it clears it.
      if (copWin) {
        const refused = fold.move(p, fold.fresh(p), {type: 'cant'});
        assert.equal(refused.claim, 'refused', `${p.id}: Can’t with a fold left is refused`);
        assert.equal(fold.move(p, refused, {type: 'cant'}), null, `${p.id}: Can’t waits for a fold`);
        assert.equal(fold.carry(p, refused, fold.fresh(p)).claim, 'refused', `${p.id}: Undo keeps the refusal on the same map`);
        hintsSolve(fold, p, refused, 'after a refused Can’t');
      }
      // Every illegal fold is refused, with a dot the second dot misses.
      const G = gameOf(q);
      for (let v = 0; v < G.n; v++) for (let u = 0; u < G.n; u++) {
        if (u === v) continue;
        const legal = M.nb[v].every(w => M.nb[u].includes(w));
        assert.equal(Boolean(fold.move(p, fold.fresh(p), {type: 'fold', v: G.ids[v], u: G.ids[u]})), legal, `${p.id}: fold ${G.ids[v]} into ${G.ids[u]}`);
        if (!legal) { const w = game.missed(G, new Set(), v, u); assert.ok(w >= 0 && M.nb[v].includes(w) && !M.nb[u].includes(w), `${p.id}: the missed dot`); }
      }
      for (const forged of [{folds: [['a', 'a']], claim: null}, {folds: [], claim: 'stuck'}, {folds: [['z', 'a']], claim: null}, {folds: [], claim: null, extra: 1}]) assert.equal(fold.valid(p, forged), false, `${p.id}: forged ${JSON.stringify(forged)}`);
      stats.maps++;
      continue;
    }
    if (p.mechanic === 'copstwo') {
      const M = model(q), val = rounds2(M), s = M.at.get(q.start), G = gameOf(q), V2 = game.twoCops(G).V;
      for (let a = 0; a < M.n; a++) for (let b = 0; b < M.n; b++) for (let r = 0; r < M.n; r++) if (r !== a && r !== b) assert.equal(V2[a][b][r], val[a][b][r], `${p.id}: two-cop values`);
      const worst = Math.max(...M.ids.map((_, r) => r === s ? -1 : val[s][s][r]));
      assert.equal(q.budget, worst, `${p.id}: the budget is the best guarantee from ${q.start}`);
      // R's start and every reply hold out longest.
      const r0 = twoChase(G, q.start, []).r;
      assert.equal(val[s][s][r0], worst, `${p.id}: R starts where it holds out longest`);
      (function every(moves) {
        const t = twoChase(G, q.start, moves);
        if (t.caught || moves.length >= q.budget) return;
        for (const a2 of M.nb[t.a]) for (const c2 of M.nb[t.c]) {
          if (a2 === t.r || c2 === t.r) continue;
          const next = twoChase(G, q.start, [...moves, [G.ids[a2], G.ids[c2]]]);
          const top = Math.max(...M.nb[t.r].filter(r2 => r2 !== a2 && r2 !== c2).map(r2 => val[a2][c2][r2]));
          assert.equal(val[a2][c2][next.r], top, `${p.id}: R’s reply holds out longest`);
          if (moves.length < 2) every([...moves, [G.ids[a2], G.ids[c2]]]);
        }
      })([]);
      hintsSolve(two, p, two.fresh(p), 'from fresh');
      // After a slow first turn (both cops stay), Hint says so quietly, and Undo recovers.
      const slow = two.move(p, two.fresh(p), {type: 'go', c1: q.start, c2: q.start});
      assert.equal(two.hint(p, slow).type, 'deadend', `${p.id}: a wasted turn is a quiet dead end`);
      assert.equal(two.move(p, two.fresh(p), {type: 'go', c1: q.start, c2: 'zz'}), null, `${p.id}: unknown dot`);
      const far = M.ids.find((_, i) => !M.nb[s].includes(i));
      assert.equal(two.move(p, two.fresh(p), {type: 'go', c1: far, c2: q.start}), null, `${p.id}: a cop moves one road at most`);
      assert.equal(two.valid(p, {moves: [[q.start, q.start], [q.start, q.start], [q.start, q.start], [q.start, q.start], [q.start, q.start]]}), false, `${p.id}: no turns past the budget`);
      stats.maps++;
      continue;
    }
    if (q.mode === 'playground') {
      for (const [name, spec] of Object.entries(q.maps)) {
        const M = model(spec), val = rounds(M), G = gameOf(spec);
        for (let c = 0; c < M.n; c++) for (let r = 0; r < M.n; r++) if (c !== r) assert.equal(game.oneCop(G).V[c][r], val[c][r], `playground ${name}: values`);
        if (best(M, val) === INF) {
          // As R against the app's C, a safe reply every time keeps R free.
          let b = {map: name, side: 'robber', moves: []};
          for (let k = 0; k < 30; k++) {
            const f = flee(G, b.moves);
            assert.notEqual(f.status, 'caught', `playground ${name}: R escapes the app’s C`);
            const next = f.status === 'place' ? game.escapePlaces(G, f.c)[0] : game.escapeReplies(G, f.c, f.r)[0];
            b = one.move(p, b, {type: 'r', at: G.ids[next]});
            assert.ok(b, `playground ${name}: a safe reply is legal`);
          }
        } else {
          // As C from a best start, the best move every time catches R in the fewest moves.
          const s0 = game.bestStarts(G)[0];
          let b = one.move(p, {map: name, side: 'cop', moves: []}, {type: 'start', at: G.ids[s0]});
          for (let k = 0; k < startValue(M, val, s0); k++) { const c = chase(G, b.moves[0], b.moves.slice(1)); b = one.move(p, b, {type: 'move', to: G.ids[game.copMoves(G, c.c, c.r)[0]]}); }
          assert.ok(chase(G, b.moves[0], b.moves.slice(1)).caught, `playground ${name}: C catches R`);
        }
      }
      assert.equal(one.valid(p, {map: 'nowhere', side: 'cop', moves: []}), false, 'playground: unknown map');
      assert.equal(one.solved(p, one.fresh(p)), false, 'the playground is never solved');
      continue;
    }
    // The cops mechanic: catch, escape and roads.
    const M = model(q), val = rounds(M), G = gameOf(q), V = game.oneCop(G).V;
    for (let c = 0; c < M.n; c++) for (let r = 0; r < M.n; r++) if (c !== r) assert.equal(V[c][r], val[c][r], `${p.id}: values`);
    if (q.mode === 'catch') {
      const target = q.start ? startValue(M, val, M.at.get(q.start)) : best(M, val);
      if (target < INF) assert.equal(q.budget, target, `${p.id}: the budget is the fewest moves`);
      else assert.ok(q.cant, `${p.id}: a robber-win map offers Can’t`);
      // R starts where it holds out longest, and every reply does too, against every C play within the budget.
      const startsToTry = q.start ? [M.at.get(q.start)] : M.ids.map((_, i) => i);
      for (const s0 of startsToTry) {
        const c0 = chase(G, M.ids[s0], []);
        assert.equal(val[s0][c0.r], startValue(M, val, s0), `${p.id}: R’s start against C on ${M.ids[s0]}`);
        (function every(moves) {
          const c = chase(G, M.ids[s0], moves);
          if (c.caught || moves.length >= Math.min(q.budget, 4)) return;
          for (const c2 of M.nb[c.c]) {
            const next = chase(G, M.ids[s0], [...moves, M.ids[c2]]);
            if (!next.caught) assert.equal(val[c2][next.r], Math.max(...M.nb[c.r].filter(r2 => r2 !== c2).map(r2 => val[c2][r2])), `${p.id}: R holds out longest`);
            every([...moves, M.ids[c2]]);
          }
        })([]);
      }
      // A catch within the budget exists exactly from the best starts.
      if (!q.start && target < INF) for (let c0 = 0; c0 < M.n; c0++) {
        const b = one.move(p, one.fresh(p), {type: 'start', at: M.ids[c0]});
        const h = one.hint(p, b);
        assert.equal(h.type === 'move', startValue(M, val, c0) <= q.budget, `${p.id}: from ${M.ids[c0]} a hint ${startValue(M, val, c0) <= q.budget ? 'moves' : 'is a dead end'}`);
      }
    }
    if (q.mode === 'roads') {
      const ids = M.ids, cand = [];
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (!M.nb[i].includes(j)) cand.push([ids[i], ids[j]]);
      const sets = [];
      (function choose(from, set) { sets.push(set); if (set.length === q.add) return; for (let i = from; i < cand.length; i++) choose(i + 1, [...set, cand[i]]); })(0, []);
      const good = sets.filter(set => { const N = model({...q, roads: [...q.roads, ...set]}); return best(N, rounds(N)) <= q.budget; });
      assert.equal(sets.filter(set => set.length < q.add && good.includes(set)).length, 0, `${p.id}: fewer roads never work`);
      for (const set of good) { const N = model({...q, roads: [...q.roads, ...set]}), v = rounds(N); assert.ok(N.ids.every((_, c) => startValue(N, v, c) <= q.budget), `${p.id}: every start works on a good set`); }
      if (q.cant) {
        const full = sets.filter(s => s.length === q.add).map(s => model({...q, roads: [...q.roads, ...s]}));
        assert.ok(full.every(F => isomorphic(full[0], F)), `${p.id}: every full set of roads gives the same map, so Can’t on the child’s roads speaks for all`);
      }
      // A crossing pair, or a wrong road, then hints.
      if (q.add === 2) {
        const crossing = sets.find(s => s.length === 2 && !good.includes(s));
        let b = play(one, p, one.fresh(p), [{type: 'add', road: crossing[0]}, {type: 'add', road: crossing[1]}, {type: 'play'}]);
        hintsSolve(one, p, b, 'after a crossing pair');
        assert.equal(one.move(p, b, {type: 'cant'}), null, `${p.id}: no Can’t without Can’t offered`);
      }
    }
    // Escape certificates on the solves the hints make, and random children.
    const b = hintsSolve(one, p, one.fresh(p), 'from fresh');
    if (q.mode === 'escape' || b.cant) {
      const spec = q.mode === 'roads' ? {...q, roads: [...q.roads, ...b.added]} : q;
      stats.positionsChecked += certificate(spec, q.mode === 'escape' ? b.answers : b.cant);
      stats.certificates++;
      const r = randomChildren(spec, 60, mulberry(p.number * 7919));
      assert.ok(r.caught > 0, `${p.id}: random answers get caught sometimes`);
    }
    if (q.cant && q.mode === 'catch' && best(M, val) < INF) {
      // Can't on a map where C wins: the app's C catches R whatever R does.
      const r = randomChildren(q, 40, mulberry(p.number));
      assert.equal(r.done, 0, `${p.id}: no escape where C wins`);
      let a = one.move(p, one.fresh(p), {type: 'cant'});
      assert.equal(one.hint(p, a).type, 'deadend', `${p.id}: Hint after a wrong Can’t is a quiet dead end`);
      assert.ok(one.hint(p, a).quiet, `${p.id}: quiet`);
    }
    // Forged saves and illegal moves.
    const forged = q.mode === 'escape'
      ? [{answers: ['a']}, {answers: ['zz']}, {answers: [], extra: 1}]
      : q.mode === 'roads'
        ? [{added: [['a', 'b']], play: false, start: null, moves: [], cant: null}, {added: [], play: false, start: 'a', moves: [], cant: null}, {added: [], play: true, start: null, moves: [], cant: []}]
        : [{start: 'a', moves: ['a', 'a', 'a', 'a', 'a', 'a', 'a', 'a'], cant: null}, {start: 'zz', moves: [], cant: null}, ...(q.cant ? [] : [{start: null, moves: [], cant: []}])];
    for (const f of forged) assert.equal(one.valid(p, f), false, `${p.id}: forged ${JSON.stringify(f)}`);
    if (q.mode === 'catch' && !q.start) {
      const far = M.ids.findIndex((_, i) => !M.nb[0].includes(i));
      if (far >= 0) assert.equal(one.move(p, one.move(p, one.fresh(p), {type: 'start', at: M.ids[0]}), {type: 'move', to: M.ids[far]}), null, `${p.id}: C moves one road at most`);
    }
    assert.ok(!/Can’t/.test(p.hints[0]), `${p.id}: the first hint never says Can’t`);
    stats.maps++;
  }
  return stats;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(await validateCops());
