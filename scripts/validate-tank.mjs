// Checks the Spring-water Jugs full-jugs pack (dist/families/tank/tank.json):
// content fields and sources; every puzzle's answers against a sieve of the
// levels two jugs fill, counted ways and Sylvester's ab − a − b (the module
// lists ways recursively instead); that each answer, played as moves, solves
// exactly when it should; That's all, the last-gap claims and their refusals;
// that changing jugs keeps only honest records; that hints alone finish every
// puzzle from a fresh board and from wrong starts; illegal moves and forged
// saves.
// Run: node scripts/validate-tank.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const gcd = (a, b) => b ? gcd(b, a % b) : a;
// Which levels 0..n fill: a level fills when some jug's size below it fills.
function sieve([a, b], n) {
  const can = Array(n + 1).fill(false);
  can[0] = true;
  for (let k = 1; k <= n; k++) can[k] = (k >= a && can[k - a]) || (k >= b && can[k - b]);
  return can;
}
const fills = (jugs, n) => sieve(jugs, n)[n];
// Every way to fill n, as [count of a, count of b]: the count of a fixes the rest.
const ways = ([a, b], n) => range(0, Math.floor(n / a)).filter(i => (n - i * a) % b === 0).map(i => [i, (n - i * a) / b]);
// Sylvester: coprime a, b leave ab − a − b as the last gap; a shared factor leaves no last gap.
const sylvester = ([a, b]) => gcd(a, b) === 1 ? a * b - a - b : null;
const pairs = list => list.flatMap((a, i) => list.slice(i + 1).map(b => [a, b]));
const same = (x, y) => x.join() === y.join();
const picking = q => ['choose', 'design', 'playground'].includes(q.mode);
const jugsNow = (p, b) => picking(p.parameters) ? b.pick : p.parameters.jugs;

const target = (p, a, t) => a.board.target === t ? a : move(p, a, {type: 'target', target: t});
// Pours and take-backs that bring the tank from its counts to these counts.
function pourTo(p, a, counts) {
  const jugs = jugsNow(p, a.board);
  for (const [k, size] of jugs.entries()) while (a.board.counts[k] > counts[k]) { a = move(p, a, {type: 'back', jug: size}); assert.ok(a, `${p.id}: taking a ${size} back is legal`); }
  for (const [k, size] of jugs.entries()) while (a.board.counts[k] < counts[k]) { a = move(p, a, {type: 'pour', jug: size}); assert.ok(a, `${p.id}: pouring a ${size} is legal`); }
  return a;
}
const fillLevel = (p, a, t) => pourTo(p, target(p, a, t), ways(jugsNow(p, a.board), t)[0]);
const choose = (p, a, pick) => {
  for (const w of a.board.pick.filter(w => !pick.includes(w))) a = move(p, a, {type: 'pick', jug: w});
  for (const w of pick.filter(w => !a.board.pick.includes(w))) a = move(p, a, {type: 'pick', jug: w});
  return a;
};
const lit = (a, t) => a.board.found.some(r => r.target === t);
const hintRun = (p, a, label, limit = 400) => {
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
const claim = (p, a, type) => move(p, a, {type});

export default async function validateTank() {
  const tank = JSON.parse(await readFile(new URL('../dist/families/tank/tank.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  const puzzles = tank.puzzles.filter(p => p.band !== 'playground'), play = tank.puzzles.find(p => p.band === 'playground');
  assert.equal(puzzles.length, 12);
  assert.deepEqual(puzzles.map(p => p.number), range(1, 12));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const s of tank.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  // Sylvester's formula and the gap count agree with the sieve for every pair up to 12.
  for (const jugs of pairs(range(2, 12))) {
    const can = sieve(jugs, jugs[0] * jugs[1] + 20), gaps = can.map((c, n) => !c && n > 0 ? n : 0).filter(Boolean);
    if (gcd(...jugs) > 1) assert.ok(gaps.at(-1) > jugs[0] * jugs[1], `${jugs}: gaps go on`);
    else {
      assert.equal(gaps.at(-1), sylvester(jugs), `${jugs}: the last gap is ab − a − b`);
      assert.equal(gaps.length, (jugs[0] - 1) * (jugs[1] - 1) / 2, `${jugs}: (a − 1)(b − 1)/2 gaps`);
    }
  }
  let hintSteps = 0, refusals = 0, forgeries = 0;
  for (const p of puzzles) {
    const q = p.parameters, label = p.id;
    assert.equal(p.id, `tank-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'tank'); assert.equal(p.libraryFamily, 'jug'); assert.equal(p.group, 'Full jugs'); assert.equal(p.band, 'all');
    assert.equal(p.familyTitle, 'Spring-water Jugs');
    for (const field of ['title', 'objective', 'visibleObjective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${label}: fresh board is valid`);
    assert.ok(!isSolved(p, fresh.board), `${label}: not solved at the start`);
    assert.ok(mechanicFor(p).render(p, fresh).length > 100, `${label}: renders`);

    if (q.mode === 'fill') {
      assert.deepEqual(p.solution.ways, Object.fromEntries(q.targets.map(t => [t, ways(q.jugs, t)])), `${label}: the ways`);
      let a = fresh;
      for (const [i, t] of q.targets.entries()) {
        assert.ok(!isSolved(p, a.board));
        a = fillLevel(p, a, t);
        assert.ok(lit(a, t), `${label}: level ${t} lights on the line`);
        assert.equal(isSolved(p, a.board), i === q.targets.length - 1);
      }
      for (const type of ['all', 'last', 'never']) assert.equal(claim(p, fresh, type), null, `${label}: no ${type} claim`);
    }

    if (q.mode === 'which') {
      const can = q.targets.filter(t => fills(q.jugs, t)), cannot = q.targets.filter(t => !fills(q.jugs, t));
      assert.deepEqual(p.solution.fill, can, `${label}: levels that fill`);
      assert.deepEqual(p.solution.cannot, cannot, `${label}: levels that cannot`);
      assert.ok(cannot.some(t => t > Math.max(...q.jugs)), `${label}: a gap above both jugs`);
      let a = fresh;
      for (const [i, t] of can.entries()) {
        const early = claim(p, a, 'all');
        assert.ok(early && early.board.refusal && !isSolved(p, early.board), `${label}: That’s all is refused with ${can.length - i} still dark`);
        assert.match(mechanicFor(p).render(p, early), /Another level can be filled/);
        assert.equal(target(p, early, t === early.board.target ? q.targets.find(x => x !== t) : t).board.refusal, null, `${label}: the next move clears the refusal`);
        refusals++;
        a = fillLevel(p, a, t);
        assert.ok(lit(a, t));
      }
      assert.ok(!isSolved(p, a.board), `${label}: lighting the levels is not yet a solve`);
      const done = claim(p, a, 'all');
      assert.ok(isSolved(p, done.board), `${label}: That’s all after every level that fills`);
      assert.match(mechanicFor(p).render(p, done), /cannot be filled/);
      assert.equal(move(p, done, {type: 'target', target: q.targets[0]}), null, `${label}: nothing after the solve`);
      // Every tank level up to the cap, tried at each level that cannot fill: it stays dark.
      for (const t of cannot) {
        let b = target(p, fresh, t);
        for (const i of range(0, 8)) for (const j of range(0, 8)) if (i * q.jugs[0] + j * q.jugs[1] <= Math.max(...q.targets) + q.jugs[1]) b = pourTo(p, b, [i, j]);
        assert.ok(!lit(b, t), `${label}: ${t} stays dark`);
      }
    }

    if (q.mode === 'ways') {
      const all = ways(q.jugs, q.target);
      assert.deepEqual(p.solution.ways, all, `${label}: the ways`);
      assert.ok(all.length >= 2);
      let a = fresh;
      for (const [i, w] of all.entries()) {
        const early = claim(p, a, 'all');
        assert.ok(early.board.refusal && !isSolved(p, early.board), `${label}: That’s all is refused with ${all.length - i} ways missing`);
        assert.match(mechanicFor(p).render(p, early), /There is another way/);
        refusals++;
        a = pourTo(p, a, w);
        assert.equal(a.board.found.length, i + 1, `${label}: each new way joins the list`);
      }
      const again = pourTo(p, move(p, a, {type: 'empty'}), all[0]);
      assert.equal(again.board.found.length, all.length, `${label}: a way is listed once`);
      assert.ok(isSolved(p, claim(p, a, 'all').board), `${label}: That’s all after every way`);
      assert.equal(claim(p, fresh, 'last'), null, `${label}: no last-gap claim`);
    }

    if (q.mode === 'choose') {
      const good = pairs(q.choices).filter(jugs => q.targets.every(t => fills(jugs, t)));
      assert.deepEqual(p.solution.picks, good, `${label}: the pairs that work`);
      assert.ok(good.length >= 2 && good.length < pairs(q.choices).length, `${label}: some pairs work and some do not`);
      // Every pair, played: it solves exactly when it works.
      for (const pick of pairs(q.choices)) {
        let a = choose(p, fresh, pick);
        assert.deepEqual(a.board.pick, pick);
        for (const t of q.targets) if (fills(pick, t)) a = fillLevel(p, a, t);
        const works = good.some(g => same(g, pick));
        assert.equal(isSolved(p, a.board), works, `${label}: jugs ${pick} solve exactly when they work`);
        if (!works) {
          // Putting a jug back keeps the levels the other jug filled alone.
          const [x, y] = pick, back = move(p, a, {type: 'pick', jug: y});
          assert.deepEqual(back.board.found.map(r => r.target), a.board.found.filter(r => r.counts[1] === 0).map(r => r.target), `${label}: levels filled without the ${y}-jug stay lit`);
          assert.ok(back.board.found.every(r => r.counts.length === 1 && r.counts[0] * x === r.target));
          forgeries += validBoard(p, back.board) ? 0 : 1;
        }
      }
      const three = choose(p, fresh, q.choices.slice(0, 2));
      assert.equal(move(p, three, {type: 'pick', jug: q.choices[2]}), null, `${label}: no more than two jugs`);
      assert.equal(move(p, fresh, {type: 'pick', jug: 999}), null, `${label}: only offered jugs`);
      for (const type of ['all', 'last', 'never']) assert.equal(claim(p, three, type), null, `${label}: no ${type} claim`);
      const wrong = choose(p, fresh, pairs(q.choices).find(s => !good.some(g => same(g, s))));
      hintSteps += hintRun(p, wrong, `${label} from wrong jugs`);
    } else if (q.mode !== 'design') assert.equal(move(p, fresh, {type: 'pick', jug: q.jugs[0]}), null, `${label}: no jug choice`);

    if (q.mode === 'last') {
      const gap = sylvester(q.jugs), m = Math.min(...q.jugs), top = Math.max(...q.targets);
      assert.equal(p.solution.lastGap, gap, `${label}: the last gap`);
      assert.deepEqual(p.solution.cannot, q.targets.filter(t => !fills(q.jugs, t)), `${label}: levels that cannot`);
      assert.deepEqual(q.targets, range(1, top), `${label}: the row starts at 1 with no holes`);
      if (gap !== null) assert.ok(gap + m <= top, `${label}: the ${m} levels after ${gap} are in the row`);
      else assert.ok(q.targets.filter(t => fills(q.jugs, t)).length >= 3, `${label}: enough filled levels to see the pattern`);
      // Gaps never stop: refused for want of evidence, then accepted or refused by the truth.
      const early = claim(p, fresh, 'never');
      assert.equal(early.board.refusal?.why, 'evidence', `${label}: Gaps never stop needs the filled levels first`);
      assert.match(mechanicFor(p).render(p, early), /Fill every level you can first/);
      refusals++;
      let full = fresh;
      for (const t of q.targets) if (fills(q.jugs, t)) full = fillLevel(p, full, t);
      const never = claim(p, full, 'never');
      assert.equal(isSolved(p, never.board), gap === null, `${label}: Gaps never stop is accepted exactly when the jugs share a factor`);
      if (gap !== null) { assert.equal(never.board.refusal.why, 'stops'); assert.match(mechanicFor(p).render(p, never), /The gaps do stop/); refusals++; }
      // Each level claimed as the last gap, with every fillable level lit.
      for (const t of q.targets) {
        const said = claim(p, target(p, full, t), 'last');
        const why = fills(q.jugs, t) ? 'filled' : t === gap ? null : 'later';
        assert.equal(said.board.refusal?.why ?? null, why, `${label}: Last gap is ${t}`);
        assert.equal(isSolved(p, said.board), why === null, `${label}: Last gap is ${t} solves exactly when true`);
        if (why) refusals++;
      }
      if (gap !== null) {
        // The true last gap, claimed before the run after it is lit.
        let partial = fresh;
        for (const t of range(gap + 1, gap + m - 1)) partial = fillLevel(p, partial, t);
        const shy = claim(p, target(p, partial, gap), 'last');
        assert.equal(shy.board.refusal?.why, 'show', `${label}: the claim needs all ${m} levels after ${gap} lit`);
        assert.match(mechanicFor(p).render(p, shy), new RegExp(`Show that every level after ${gap} can be filled`));
        const shown = claim(p, target(p, fillLevel(p, partial, gap + m), gap), 'last');
        assert.ok(isSolved(p, shown.board), `${label}: ${m} lit levels after ${gap} are enough`);
        refusals++;
      }
    }

    if (q.mode === 'design') {
      const good = pairs(q.choices).filter(jugs => sylvester(jugs) === q.last);
      assert.deepEqual(p.solution.picks, good, `${label}: the pairs with last gap ${q.last}`);
      assert.deepEqual(good, pairs(q.choices).filter(([a, b]) => gcd(a, b) === 1 && (a - 1) * (b - 1) === q.last + 1), `${label}: (a − 1)(b − 1) = last + 1`);
      assert.ok(good.length >= 1);
      for (const pick of good) assert.ok(q.last + Math.min(...pick) <= Math.max(...q.targets), `${label}: the run after ${q.last} fits for ${pick}`);
      assert.equal(claim(p, fresh, 'last'), null, `${label}: no claim before two jugs`);
      // Every pair, with every fillable level lit: the claim holds exactly for the answers.
      for (const pick of pairs(q.choices)) {
        let a = choose(p, fresh, pick);
        for (const t of q.targets) if (fills(pick, t)) a = fillLevel(p, a, t);
        const said = claim(p, a, 'last');
        const works = good.some(g => same(g, pick));
        assert.equal(isSolved(p, said.board), works, `${label}: jugs ${pick} answer exactly when their last gap is ${q.last}`);
        if (!works) { assert.ok(['filled', 'later', 'show'].includes(said.board.refusal.why)); refusals++; }
      }
      assert.equal(claim(p, choose(p, fresh, good[0]), 'never'), null, `${label}: no Gaps never stop`);
      const wrong = choose(p, fresh, pairs(q.choices).find(s => !good.some(g => same(g, s))));
      hintSteps += hintRun(p, wrong, `${label} from wrong jugs`);
      hintSteps += hintRun(p, claim(p, wrong, 'last'), `${label} after a refused claim`);
    }

    // Hints alone, from a fresh board and from a tank poured too high.
    hintSteps += hintRun(p, fresh, label);
    const jugs0 = jugsNow(p, fresh.board);
    if (jugs0.length) {
      const messy = jugs0.reduce((a, size) => move(p, move(p, a, {type: 'pour', jug: size}), {type: 'pour', jug: size}) || a, fresh);
      hintSteps += hintRun(p, messy, `${label} from a tank poured too high`);
    }
    if (q.mode === 'which' || q.mode === 'ways') hintSteps += hintRun(p, claim(p, fresh, 'all'), `${label} after a refused That’s all`);
    if (q.mode === 'last') {
      hintSteps += hintRun(p, claim(p, fresh, 'never'), `${label} after a refused Gaps never stop`);
      hintSteps += hintRun(p, claim(p, target(p, fresh, q.targets.at(-1)), 'last'), `${label} after a refused Last gap`);
    }

    // Illegal moves.
    const w0 = jugs0[0] ?? q.choices[0];
    const illegal = [{type: 'pour', jug: 999}, {type: 'back', jug: w0}, {type: 'empty'}, {type: 'target', target: 999}, {type: 'target', target: fresh.board.target}, {type: 'place', weight: 1, pan: 'left'}, {type: 'shrug'}, null, 'pour'];
    if (!jugs0.length) illegal.push({type: 'pour', jug: w0});
    for (const action of illegal) assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
    if (jugs0.length) {
      const one = move(p, fresh, {type: 'pour', jug: jugs0[0]});
      assert.ok(one);
      assert.deepEqual(undo(one).board, fresh.board, `${label}: Undo takes back a pour`);
      assert.deepEqual(move(p, one, {type: 'empty'}).board.counts, jugs0.map(() => 0), `${label}: Empty`);
      // The tank holds at most the top level plus a jug.
      const cap = Math.max(...(q.targets || [q.target])) + Math.max(...(q.jugs || q.choices));
      let a = fresh, n = 0;
      while (move(p, a, {type: 'pour', jug: jugs0[0]})) { a = move(p, a, {type: 'pour', jug: jugs0[0]}); n++; }
      assert.ok(n * jugs0[0] <= cap && (n + 1) * jugs0[0] > cap, `${label}: the tank stops at ${cap}`);
    }

    // Forged saves.
    const jugsFull = picking(q) ? p.solution.picks[0] : q.jugs;
    const b = {...fresh.board, ...(picking(q) ? {pick: jugsFull, counts: [0, 0]} : {})}, t0 = b.target, big = 99;
    assert.ok(validBoard(p, b), `${label}: the forgeries start from a valid board`);
    const zero = [0, 0];
    const forged = [
      {...b, target: big}, {...b, counts: zero.map(() => -1)}, {...b, counts: [...zero, 0]}, {...b, counts: zero.map(() => big)},
      {...b, found: [{target: t0, counts: zero}]}, {...b, found: [{target: big, counts: zero}]},
      {...b, found: 'none'}, {...b, done: true}, {...b, done: {type: 'all', extra: 1}}, {...b, refusal: {claim: {type: 'all'}, why: 'nope'}},
      {...b, found: Array(201).fill({target: t0, counts: zero})}, {...b, done: undefined}, {...b, refusal: undefined},
      picking(q) ? {...b, pick: [big]} : {...b, pick: []}, picking(q) ? {...b, pick: q.choices.slice(0, 3), counts: [0, 0, 0]} : {...b, counts: [1.5, 0]}
    ];
    if (q.mode === 'which' || q.mode === 'ways' || q.mode === 'last') forged.push({...b, done: {type: q.mode === 'last' ? 'never' : 'all'}}, {...b, done: {type: 'last', target: t0}});
    if (q.mode === 'which') forged.push({...b, done: {type: 'all'}, refusal: {claim: {type: 'all'}, why: 'more'}});
    if (q.mode === 'fill' || q.mode === 'choose') forged.push({...b, done: {type: 'all'}}, {...b, refusal: {claim: {type: 'all'}, why: 'more'}});
    if (q.mode === 'design') forged.push({...b, pick: p.solution.picks[0], counts: [0, 0], done: {type: 'last', target: q.last}}, {...b, pick: p.solution.picks[0], counts: [0, 0], done: {type: 'last', target: q.last + 1}});
    for (const f of forged) {
      assert.equal(validBoard(p, f), false, `${label}: rejects a forged save ${JSON.stringify(f).slice(0, 90)}`);
      forgeries++;
    }
    // An honest record, a duplicate, and one off the line.
    const goodBoard = b;
    const t1 = (q.targets || [q.target]).find(t => fills(jugsFull, t)), w1 = ways(jugsFull, t1)[0];
    assert.ok(validBoard(p, {...goodBoard, found: [{target: t1, counts: w1}]}), `${label}: an honest record is valid`);
    assert.equal(validBoard(p, {...goodBoard, found: [{target: t1, counts: w1}, {target: t1, counts: w1}]}), false, `${label}: one record per ${q.mode === 'ways' ? 'way' : 'level'}`);
    assert.equal(validBoard(p, {...goodBoard, found: [{target: t1, counts: [w1[0] + 1, w1[1]]}]}), false, `${label}: a record off the line is rejected`);
    forgeries += 2;
  }

  // The playground: any two jugs, every level from 1 to 40, never solved.
  assert.ok(play, 'a playground');
  assert.equal(play.libraryFamily, 'jug'); assert.equal(play.mechanic, 'tank'); assert.equal(play.parameters.mode, 'playground');
  let a = freshAttempt(play);
  assert.deepEqual(a.board.pick, [3, 5]);
  assert.equal(nextHint(play, a).type, 'note');
  for (const t of range(1, 40)) if (fills([3, 5], t)) a = fillLevel(play, a, t);
  assert.equal(a.board.found.length, 40 - 4, 'the playground lights every level but 1, 2, 4 and 7 with 3 and 5');
  assert.ok(!isSolved(play, a.board), 'the playground is never solved');
  assert.equal(move(play, a, {type: 'pick', jug: 2}), null, 'at most two jugs');
  const dropped = move(play, a, {type: 'pick', jug: 5});
  assert.deepEqual(dropped.board.found.map(r => r.target), a.board.found.filter(r => r.counts[1] === 0).map(r => r.target), 'putting back the 5-jug keeps the levels filled with 3s alone');
  assert.ok(dropped.board.found.length >= 4 && dropped.board.found.every(r => r.target % 3 === 0));
  const added = move(play, dropped, {type: 'pick', jug: 2});
  assert.deepEqual(added.board.pick, [2, 3]);
  assert.ok(added.board.found.every(r => r.counts[0] === 0 && r.counts[1] * 3 === r.target), 'a new jug keeps the lit levels');
  for (const type of ['all', 'last', 'never']) assert.equal(claim(play, a, type), null, `the playground has no ${type} claim`);
  assert.ok(mechanicFor(play).render(play, a).includes('tank-targets many'));
  return {puzzles: puzzles.length, hintSteps, refusals, forgeries};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateTank(), null, 2));
