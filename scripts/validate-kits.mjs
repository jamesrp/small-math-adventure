// Checks the Odd-pebble Balance weight kits pack (dist/families/kits/kits.json):
// content fields and sources; every puzzle's answers against a count of signed
// sums built weight by weight (the module lists placements instead); that each
// answer, played as moves, solves exactly when it should; That's all and its
// refusals; that changing the kit drops the records it breaks; that hints
// alone finish every puzzle from a fresh board and from wrong starts; illegal
// moves and forged saves.
// Run: node scripts/validate-kits.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
// How many placements of the kit give each total (target side counted as
// minus), built one weight at a time: every total so far moves up by w, stays,
// or moves down by w.
function counts(kit) {
  let table = new Map([[0, 1]]);
  for (const w of kit) {
    const next = new Map();
    for (const [s, c] of table) for (const d of [w, 0, -w]) next.set(s + d, (next.get(s + d) || 0) + c);
    table = next;
  }
  return table;
}
const ways = (kit, t) => counts(kit).get(t) || 0;
// One placement for t, found by walking back through the totals each prefix
// of the kit can make. Returns {left, right} or null.
function placeFor(kit, t) {
  const reach = [new Set([0])];
  for (const w of kit) reach.push(new Set([...reach.at(-1)].flatMap(s => [s + w, s, s - w])));
  if (!reach.at(-1).has(t)) return null;
  const left = [], right = [];
  for (let i = kit.length; i > 0; i--) {
    const w = kit[i - 1];
    if (reach[i - 1].has(t - w)) { right.push(w); t -= w; }
    else if (reach[i - 1].has(t)) continue;
    else { left.push(w); t += w; }
  }
  return {left: left.sort((a, b) => a - b), right: right.sort((a, b) => a - b)};
}
const subsets = (from, k) => k === 0 ? [[]] : from.flatMap((w, i) => subsets(from.slice(i + 1), k - 1).map(rest => [w, ...rest]));
const sorted = list => [...list].sort((a, b) => a - b);
// Moves that put a placement on the pans (from any pans), and a target.
function placeMoves(p, a, at) {
  const kit = mechanicFor(p) && kitNow(p, a.board);
  for (const w of kit) {
    const pan = at.left.includes(w) ? 'left' : at.right.includes(w) ? 'right' : 'off';
    const now = a.board.left.includes(w) ? 'left' : a.board.right.includes(w) ? 'right' : 'off';
    if (pan !== now) { a = move(p, a, {type: 'place', weight: w, pan}); assert.ok(a, `${p.id}: placing ${w} ${pan} is legal`); }
  }
  return a;
}
const kitNow = (p, b) => p.parameters.mode === 'choose' || p.parameters.mode === 'playground' ? sorted([...(p.parameters.fixed || []), ...b.pick]) : p.parameters.kit;
const target = (p, a, t) => a.board.target === t ? a : move(p, a, {type: 'target', target: t});
const choose = (p, a, pick) => {
  for (const w of a.board.pick.filter(w => !pick.includes(w))) a = move(p, a, {type: 'pick', weight: w});
  for (const w of pick.filter(w => !a.board.pick.includes(w))) a = move(p, a, {type: 'pick', weight: w});
  return a;
};
const hintRun = (p, a, label, limit = 200) => {
  let steps = 0;
  for (; steps < limit && !isSolved(p, a.board); steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${label}: hints keep naming a move`);
    assert.ok(h.text, `${label}: hint text`);
    a = move(p, a, h.action);
    assert.ok(a, `${label}: the hinted move ${JSON.stringify(h.action)} is legal`);
  }
  assert.ok(isSolved(p, a.board), `${label}: hints finish the puzzle`);
  assert.equal(nextHint(p, a).type, 'done');
  return steps;
};

export default async function validateKits() {
  const kits = JSON.parse(await readFile(new URL('../dist/families/kits/kits.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  const puzzles = kits.puzzles.filter(p => p.band !== 'playground'), play = kits.puzzles.find(p => p.band === 'playground');
  assert.equal(puzzles.length, 12);
  assert.deepEqual(puzzles.map(p => p.number), range(1, 12));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const s of kits.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  let hintSteps = 0, refusals = 0, forgeries = 0;
  for (const p of puzzles) {
    const q = p.parameters, label = p.id;
    assert.equal(p.id, `kits-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'kit'); assert.equal(p.libraryFamily, 'weigh'); assert.equal(p.group, 'Weight kits'); assert.equal(p.band, 'all');
    assert.equal(p.familyTitle, 'Odd-pebble Balance');
    for (const field of ['title', 'objective', 'visibleObjective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${label}: fresh board is valid`);
    assert.ok(!isSolved(p, fresh.board), `${label}: not solved at the start`);
    assert.ok(mechanicFor(p).render(p, fresh).length > 100, `${label}: renders`);

    if (q.mode === 'balance') {
      for (const t of q.targets) assert.ok(ways(q.kit, t) > 0, `${label}: target ${t} can balance`);
      assert.deepEqual(Object.keys(p.solution.ways).map(Number), q.targets);
      for (const t of q.targets) assert.equal(p.solution.ways[t].length, ways(q.kit, t), `${label}: ways for ${t}`);
      // Played target by target, the puzzle solves only after the last one.
      let a = fresh;
      for (const [i, t] of q.targets.entries()) {
        assert.ok(!isSolved(p, a.board));
        a = placeMoves(p, target(p, a, t), placeFor(q.kit, t));
        assert.ok(a.board.found.some(r => r.target === t), `${label}: target ${t} lights when it balances`);
        assert.equal(isSolved(p, a.board), i === q.targets.length - 1);
      }
      assert.equal(move(p, fresh, {type: 'done'}), null, `${label}: no That’s all`);
    }

    if (q.mode === 'which') {
      const can = q.targets.filter(t => ways(q.kit, t) > 0), cannot = q.targets.filter(t => !ways(q.kit, t));
      assert.deepEqual(p.solution.balance, can, `${label}: targets that balance`);
      assert.deepEqual(p.solution.cannot, cannot, `${label}: targets that cannot`);
      assert.ok(can.length >= 2 && cannot.length >= 1, `${label}: both kinds in the row`);
      // Certificate for each "cannot": no placement at all gives that total.
      for (const t of cannot) assert.equal(placeFor(q.kit, t), null);
      let a = fresh;
      for (const [i, t] of can.entries()) {
        const early = move(p, a, {type: 'done'});
        assert.ok(early && early.board.wrong && !isSolved(p, early.board), `${label}: That’s all is refused with ${can.length - i} still dark`);
        assert.match(mechanicFor(p).render(p, early), /Another target balances/);
        assert.equal(target(p, early, t === early.board.target ? q.targets.find(x => x !== t) : t).board.wrong, false, `${label}: the next move clears the refusal`);
        refusals++;
        a = placeMoves(p, target(p, a, t), placeFor(q.kit, t));
        assert.ok(a.board.found.some(r => r.target === t));
      }
      assert.ok(!isSolved(p, a.board), `${label}: lighting the targets is not yet a solve`);
      const done = move(p, a, {type: 'done'});
      assert.ok(isSolved(p, done.board), `${label}: That’s all after every target that can balance`);
      assert.match(mechanicFor(p).render(p, done), /cannot balance/);
      assert.equal(move(p, done, {type: 'target', target: q.targets[0]}), null, `${label}: nothing after the solve`);
      // Trying a target that cannot balance never lights it.
      for (const t of cannot) {
        let b = target(p, fresh, t);
        for (let code = 0; code < 3 ** q.kit.length; code++) {
          const digit = i => Math.floor(code / 3 ** i) % 3;
          b = placeMoves(p, b, {left: q.kit.filter((_, i) => digit(i) === 1), right: q.kit.filter((_, i) => digit(i) === 2)});
        }
        assert.ok(!b.board.found.some(r => r.target === t), `${label}: ${t} stays dark`);
      }
    }

    if (q.mode === 'ways') {
      const n = ways(q.kit, q.target);
      assert.equal(p.solution.ways.length, n, `${label}: the number of ways`);
      assert.ok(n >= 1);
      let a = fresh;
      for (const [i, at] of p.solution.ways.entries()) {
        assert.equal(q.target + at.left.reduce((s, w) => s + w, 0), at.right.reduce((s, w) => s + w, 0), `${label}: a listed way balances`);
        const early = move(p, a, {type: 'done'});
        assert.ok(early.board.wrong && !isSolved(p, early.board), `${label}: That’s all is refused with ${n - i} ways missing`);
        assert.match(mechanicFor(p).render(p, early), /There is another way/);
        refusals++;
        a = placeMoves(p, a, at);
        assert.equal(a.board.found.length, i + 1, `${label}: each new way joins the list`);
      }
      // Clearing and placing the first way again adds nothing.
      const again = placeMoves(p, move(p, a, {type: 'clear'}) || a, p.solution.ways[0]);
      assert.equal(again.board.found.length, n, `${label}: a way is listed once`);
      assert.ok(isSolved(p, move(p, a, {type: 'done'}).board), `${label}: That’s all after every way`);
    }

    if (q.mode === 'choose') {
      const options = q.choices.filter(w => !q.fixed.includes(w));
      const good = subsets(options, q.pick).filter(pick => q.targets.every(t => ways(sorted([...q.fixed, ...pick]), t) > 0));
      assert.deepEqual(p.solution.picks, good, `${label}: the kits that work`);
      assert.equal(good.length, 1, `${label}: one kit works`);
      // Every kit, played: it solves exactly when it works.
      for (const pick of subsets(options, q.pick)) {
        let a = choose(p, fresh, pick);
        assert.deepEqual(a.board.pick, pick);
        const kit = sorted([...q.fixed, ...pick]);
        for (const t of q.targets) {
          const at = placeFor(kit, t);
          if (at) a = placeMoves(p, target(p, a, t), at);
        }
        const works = good.some(g => g.join() === pick.join());
        assert.equal(isSolved(p, a.board), works, `${label}: kit ${kit} solves exactly when it works`);
        if (!works && q.pick === 1) {
          // Switching to the working kit drops every record that used the old weight.
          const lit = a.board.found.length;
          const switched = move(p, a, {type: 'pick', weight: good[0][0]});
          assert.ok(switched.board.found.every(r => [...r.left, ...r.right].every(w => kitNow(p, switched.board).includes(w))), `${label}: records keep only kit weights`);
          assert.ok(switched.board.found.length <= lit);
        }
      }
      if (q.pick > 1) {
        const full = choose(p, fresh, options.slice(0, q.pick));
        assert.equal(move(p, full, {type: 'pick', weight: options[q.pick]}), null, `${label}: no more than ${q.pick} weights`);
      }
      assert.equal(move(p, fresh, {type: 'pick', weight: 999}), null, `${label}: only offered weights`);
      if (q.fixed.length) assert.equal(move(p, fresh, {type: 'pick', weight: q.fixed[0]}), null, `${label}: a fixed weight stays`);
      assert.equal(move(p, fresh, {type: 'done'}), null, `${label}: no That’s all`);
      const wrong = choose(p, fresh, subsets(options, q.pick).find(s => s.join() !== good[0].join()));
      hintSteps += hintRun(p, wrong, `${label} from a wrong kit`);
    } else assert.equal(move(p, fresh, {type: 'pick', weight: q.kit[0]}), null, `${label}: no kit choice`);

    // Hints alone, from a fresh board and from misplaced weights.
    hintSteps += hintRun(p, fresh, label);
    const kit0 = kitNow(p, fresh.board);
    if (kit0.length) {
      const messy = kit0.reduce((a, w, i) => move(p, a, {type: 'place', weight: w, pan: i % 2 ? 'left' : 'right'}) || a, fresh);
      hintSteps += hintRun(p, messy, `${label} from misplaced weights`);
    }
    if (q.mode === 'which' || q.mode === 'ways') hintSteps += hintRun(p, move(p, fresh, {type: 'done'}), `${label} after a refused That’s all`);

    // Illegal moves.
    const k = kitNow(p, fresh.board), w0 = k[0] ?? (q.choices || [1])[0];
    for (const action of [{type: 'place', weight: 999, pan: 'left'}, {type: 'place', weight: w0, pan: 'up'}, {type: 'place', weight: w0, pan: 'off'}, {type: 'target', target: 999}, {type: 'target', target: fresh.board.target}, {type: 'clear'}, {type: 'tap', dot: 0}, {type: 'shrug'}, null, 'place']) {
      if (action?.type === 'place' && action.weight === w0 && !k.length) continue;
      assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
    }
    if (k.length) {
      const one = move(p, fresh, {type: 'place', weight: k[0], pan: 'right'});
      assert.ok(one);
      assert.deepEqual(undo(one).board, fresh.board, `${label}: Undo takes back a placement`);
      assert.equal(move(p, one, {type: 'place', weight: k[0], pan: 'right'}), null, `${label}: a weight already there`);
      assert.deepEqual(move(p, one, {type: 'clear'}).board.left.concat(move(p, one, {type: 'clear'}).board.right), [], `${label}: Clear pans`);
    }

    // Forged saves.
    const b = fresh.board, t0 = b.target, big = 99;
    const forged = [
      {...b, target: big}, {...b, left: [big]}, {...b, right: [big]}, {...b, left: [w0, w0]}, {...b, left: [w0], right: [w0]},
      {...b, found: [{target: t0, left: [], right: []}]}, {...b, found: [{target: big, left: [], right: [big]}]},
      {...b, found: 'none'}, {...b, done: true}, {...b, done: 'yes'}, {...b, wrong: 1}, {...b, found: Array(401).fill({target: t0, left: [], right: []})},
      q.mode === 'choose' ? {...b, pick: [big]} : {...b, pick: []}, q.mode === 'choose' ? {...b, pick: q.choices.slice(0, q.pick + 1)} : {...b, done: true, wrong: true}
    ];
    if (k.length >= 2) forged.push({...b, left: [k[1], k[0]]});
    if (q.mode === 'choose' && q.fixed.length) forged.push({...b, pick: [q.fixed[0]]});
    if (q.mode !== 'which' && q.mode !== 'ways') forged.push({...b, wrong: true});
    for (const f of forged) {
      assert.equal(validBoard(p, f), false, `${label}: rejects a forged save ${JSON.stringify(f).slice(0, 80)}`);
      forgeries++;
    }
    // A record whose placement does not balance, or a duplicate target.
    const kitFull = q.mode === 'choose' ? sorted([...q.fixed, ...p.solution.picks[0]]) : q.kit;
    const goodBoard = {...b, ...(q.mode === 'choose' ? {pick: p.solution.picks[0]} : {})};
    const t1 = targetsFor(q)[0], at1 = placeFor(kitFull, t1);
    if (at1) {
      assert.ok(validBoard(p, {...goodBoard, found: [{target: t1, ...at1}]}), `${label}: an honest record is valid`);
      if (q.mode !== 'ways') assert.equal(validBoard(p, {...goodBoard, found: [{target: t1, ...at1}, {target: t1, ...at1}]}), false, `${label}: one record per target`);
      else assert.equal(validBoard(p, {...goodBoard, found: [{target: t1, ...at1}, {target: t1, ...at1}]}), false, `${label}: one record per way`);
      assert.equal(validBoard(p, {...goodBoard, found: [{target: t1, left: at1.right, right: at1.left}]}), at1.left.length === 0 && at1.right.length === 0, `${label}: a record that tips is rejected`);
      forgeries += 2;
    }
  }

  // The playground: any kit of up to four, every target from 1 to 40, never solved.
  assert.ok(play, 'a playground');
  assert.equal(play.libraryFamily, 'weigh'); assert.equal(play.mechanic, 'kit'); assert.equal(play.parameters.mode, 'playground');
  let a = freshAttempt(play);
  assert.deepEqual(a.board.pick, [1, 3]);
  assert.equal(nextHint(play, a).type, 'note');
  a = choose(play, a, [1, 3, 9, 27]);
  for (const t of range(1, 40)) a = placeMoves(play, target(play, a, t), placeFor([1, 3, 9, 27], t));
  assert.equal(a.board.found.length, 40, 'the playground lights all 40 targets with 1, 3, 9, 27');
  assert.ok(!isSolved(play, a.board), 'the playground is never solved');
  assert.equal(move(play, a, {type: 'pick', weight: 2}), null, 'at most four weights');
  const dropped = move(play, a, {type: 'pick', weight: 27});
  assert.equal(dropped.board.found.length, 13, 'taking 27 out leaves the 13 targets 1, 3, 9 balance without it');
  assert.ok(mechanicFor(play).render(play, a).includes('kit-targets many'));
  for (const kit of subsets([1, 2, 3, 4, 5, 8, 9, 10, 27], 3)) assert.ok([...counts(kit).keys()].filter(s => s > 0).length <= 13, 'three weights balance at most 13 targets');
  return {puzzles: puzzles.length, hintSteps, refusals, forgeries};
}
const targetsFor = q => q.mode === 'ways' ? [q.target] : q.targets;

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateKits(), null, 2));
