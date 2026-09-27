import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { measurementMechanics } from '../dist/measurement.js';

const families = JSON.parse(readFileSync(new URL('../docs/puzzle-expansion/measurement.json', import.meta.url), 'utf8')).families;
const puzzles = families.flatMap(family => family.instances.map(p => ({...p, mechanic:family.id})));
const jugs = puzzles.filter(p => p.mechanic === 'jug'), balances = puzzles.filter(p => p.mechanic === 'weigh');
const {jug, weigh} = measurementMechanics;
const copy = value => JSON.parse(JSON.stringify(value));
const hypothesisList = p => p.parameters.coins.flatMap(coin => (p.parameters.odd_kind === 'heavy' ? [1] : [-1, 1]).map(sign => [coin, sign]));
const fixedBoard = p => weigh.fresh(p, () => (hypothesisList(p).findIndex(secret => JSON.stringify(secret) === JSON.stringify(p.parameters.fixed_secret)) + .5) / hypothesisList(p).length);
const withSecret = (p, secret) => ({...p, parameters:{...p.parameters, fixed_secret:secret}});
const asJugAction = ([type, first, second]) => type === 'pour' ? {type, from:first, to:second} : {type, jug:first};
const jugOptions = p => p.parameters.capacities.flatMap((_, i) => [
  {type:'fill', jug:i}, {type:'empty', jug:i},
  ...p.parameters.capacities.map((_, j) => ({type:'pour', from:i, to:j})),
]);

test('new balance attempts sample every legal pebble and sign independently', () => {
  for (const p of balances) {
    const possibilities = hypothesisList(p);
    const boards = possibilities.map((secret, i) => {
      let draws = 0;
      const board = weigh.fresh(p, () => { draws++; return (i + .5) / possibilities.length; });
      assert.equal(draws, 1);
      assert.deepEqual(board.secret, secret);
      assert.ok(weigh.valid(p, board));
      assert.ok(!p.parameters.known_genuine.includes(board.secret[0]));
      return board;
    });
    assert.equal(new Set(boards.map(board => JSON.stringify(board.secret))).size, possibilities.length);
    // New attempts start with identical visible information, whatever the secret.
    for (const board of boards) {
      assert.equal(weigh.render(p, {board}), weigh.render(p, {board:boards[0]}));
      assert.deepEqual(weigh.hint(p, board), weigh.hint(p, boards[0]));
    }
  }
});

test('balance rejects invalid hidden pebbles and weight signs', () => {
  for (const p of balances) {
    const board = weigh.fresh(p);
    for (const secret of [null, [], ['Z', 1], [p.parameters.coins[0], 0], [p.parameters.coins[0], '1'], [...board.secret, 1]]) {
      assert.equal(weigh.valid(p, {...board, secret}), false);
    }
    if (p.parameters.odd_kind === 'heavy') assert.equal(weigh.valid(p, {...board, secret:[p.parameters.coins[0], -1]}), false);
    if (p.parameters.known_genuine.length) assert.equal(weigh.valid(p, {...board, secret:[p.parameters.known_genuine[0], 1]}), false);
  }
});

test('all twenty-four shipped measurement boards render real pack metadata cleanly', () => {
  const pack = JSON.parse(readFileSync(new URL('../dist/puzzles.json', import.meta.url), 'utf8'));
  const measurement = pack.puzzles.filter(p => p.mechanic === 'jug' || p.mechanic === 'weigh');
  assert.equal(measurement.length, 24);
  for (const p of measurement) {
    const handler = measurementMechanics[p.mechanic];
    const html = handler.render(p, {board:handler.fresh(p)});
    assert.ok(!html.includes('undefined'), p.id);
    assert.ok(!html.includes('NaN'), p.id);
    assert.match(html, /aria-label/);
  }
});

for (const p of jugs) {
  test(`${p.id}: witness, exact stops, shortest live hint, and every reachable state`, () => {
    let board = jug.fresh(p);
    assert.equal(jug.valid(p, board), true);
    assert.equal(jug.solved(p, board), false);
    assert.equal(jug.hint(p, board).remaining, p.solution.minimum_moves);
    for (let i = 0; i < p.solution.moves.length; i++) {
      const before = copy(board), action = asJugAction(p.solution.moves[i]);
      board = jug.move(p, board, action);
      assert.deepEqual(before.amounts, p.solution.states[i]);
      assert.deepEqual(board.amounts, p.solution.states[i + 1]);
      assert.equal(jug.valid(p, copy(board)), true);
      if (action.type === 'pour') assert.ok(board.amounts[action.from] === 0 || board.amounts[action.to] === p.parameters.capacities[action.to]);
      if (!p.parameters.source_and_drain) assert.equal(board.amounts.reduce((a, b) => a + b, 0), p.parameters.start.reduce((a, b) => a + b, 0));
    }
    assert.equal(jug.solved(p, board), true);
    assert.equal(jug.hint(p, board).type, 'done');

    // Exhaust the actual state graph, then recover from every player choice.
    const queue = [jug.fresh(p)], seen = new Set([queue[0].amounts.join(',')]);
    for (let index = 0; index < queue.length; index++) {
      for (const action of jugOptions(p)) {
        const next = jug.move(p, queue[index], action);
        if (!next || seen.has(next.amounts.join(','))) continue;
        seen.add(next.amounts.join(','));
        queue.push(next);
      }
    }
    for (const state of queue) {
      assert.equal(jug.valid(p, state), true);
      let current = state, steps = 0;
      while (!jug.solved(p, current)) {
        const hint = jug.hint(p, current);
        assert.equal(hint.type, 'move', `${p.id} ${current.amounts}`);
        assert.ok(hint.text.length > 10);
        current = jug.move(p, current, hint.action);
        assert.ok(current);
        assert.ok(++steps <= queue.length, 'Hints must make progress');
      }
    }
    assert.match(jug.render(p, {board}), /role="status"/);
    assert.match(jug.render(p, {board}), /The pour stops when/);
  });
}

test('jug rejects illegal operations, partial pours, malformed saves, and forged feedback', () => {
  const p = jugs[0], board = jug.fresh(p);
  for (const action of [null, [], {}, {type:'pour', from:0, to:0}, {type:'pour', from:0, to:1}, {type:'fill', jug:-1}, {type:'fill', jug:2}, {type:'fill', jug:''}, {type:'fill', jug:null}, {type:'fill', jug:0.5}, {type:'other', jug:0}]) assert.equal(jug.move(p, board, action), null);
  const full = jug.move(p, board, {type:'fill', jug:'0'});
  assert.deepEqual(full.amounts, [3, 0]);
  const poured = jug.move(p, full, {type:'pour', from:'0', to:'1', amount:1});
  assert.deepEqual(poured.amounts, [1, 2], 'An amount field never permits a partial pour');
  assert.deepEqual(full.amounts, [3, 0], 'Moves must not mutate prior boards');
  for (const invalid of [null, [], {}, {amounts:[0, 0]}, {amounts:[0, 0], last:{}}, {amounts:[1, 1], last:null}, {amounts:[4, 0], last:null}, {amounts:[0, '0'], last:null}, {amounts:[1, 2], last:null}, {...poured, amounts:[2, 1]}, {...poured, last:{before:[3, 0], action:{type:'empty', jug:0}}}]) {
    assert.equal(jug.valid(p, invalid), false);
    assert.equal(jug.solved(p, invalid), false);
    assert.equal(jug.move(p, invalid, {type:'fill', jug:0}), null);
  }
  for (const p of jugs.filter(p => !p.parameters.source_and_drain)) {
    assert.equal(jug.move(p, jug.fresh(p), {type:'empty', jug:0}), null);
    assert.equal(jug.move(p, jug.fresh(p), {type:'fill', jug:1}), null);
  }
});

for (const source of balances) {
  test(`${source.id}: all authored strategy branches require justified identification`, () => {
    for (const secret of hypothesisList(source)) {
      const p = withSecret(source, secret);
      let board = fixedBoard(p), tree = p.solution.strategy;
      const lucky = weigh.move(p, board, {type:'answer', coin:secret[0], deviation:secret[1]});
      assert.equal(weigh.solved(p, lucky), false, 'A lucky first guess is unsupported');
      assert.match(weigh.render(p, {board:lucky}), /not yet justified/);
      while (tree.branches) {
        const before = copy(board);
        board = weigh.move(p, board, {type:'weigh', left:tree.left, right:tree.right});
        assert.ok(board);
        assert.equal(weigh.valid(p, copy(board)), true);
        assert.equal(board.observations.length, before.observations.length + 1);
        assert.equal(weigh.solved(p, board), false, 'Identification needs an explicit answer');
        tree = tree.branches[board.observations.at(-1).result];
        assert.ok(tree);
      }
      assert.deepEqual([tree.coin, tree.deviation], secret);
      const hint = weigh.hint(p, board);
      assert.equal(hint.action.type, 'answer');
      assert.deepEqual([hint.action.coin, hint.action.deviation], secret);
      const wrongCoin = p.parameters.coins.find(coin => coin !== secret[0]);
      const wrong = weigh.move(p, board, {type:'answer', coin:wrongCoin, deviation:secret[1]});
      assert.equal(weigh.solved(p, wrong), false);
      assert.match(weigh.render(p, {board:wrong}), /does not fit/);
      board = weigh.move(p, wrong, {type:'answer', coin:tree.coin, deviation:tree.deviation});
      assert.equal(weigh.solved(p, board), true);
      assert.equal(weigh.hint(p, board).type, 'done');
      assert.ok(board.observations.length <= p.parameters.weighing_budget);
      assert.equal(weigh.valid(p, copy(board)), true);
    }
  });

  test(`${source.id}: adaptive live hints solve every hidden possibility`, () => {
    for (const secret of hypothesisList(source)) {
      const p = withSecret(source, secret);
      let board = fixedBoard(p), moves = 0;
      while (!weigh.solved(p, board)) {
        const hint = weigh.hint(p, board);
        assert.equal(hint.type, 'move', `${p.id} ${secret}`);
        const before = copy(board);
        const next = weigh.move(p, board, hint.action);
        assert.deepEqual(board, before);
        board = next;
        assert.ok(board);
        assert.equal(weigh.valid(p, board), true);
        assert.ok(++moves <= p.parameters.weighing_budget + 1);
      }
    }
  });
}

test('balance accepts alternative experiments and follows their observations', () => {
  for (const source of balances) {
    for (const secret of hypothesisList(source)) {
      const p = withSecret(source, secret), reversed = p.solution.strategy;
      // Reverse pans and reverse pebble labels in the authored first experiment.
      // This is a legal symmetry but no longer the stored tree transcript.
      const reversedCoin = coin => p.parameters.coins.includes(coin) ? p.parameters.coins.at(-1 - p.parameters.coins.indexOf(coin)) : coin;
      let board = weigh.move(p, fixedBoard(p), {type:'weigh', left:reversed.right.map(reversedCoin), right:reversed.left.map(reversedCoin)});
      assert.ok(board);
      let steps = 0;
      while (!weigh.solved(p, board)) {
        const hint = weigh.hint(p, board);
        assert.equal(hint.type, 'move', `${p.id} ${secret} after an alternate first weighing`);
        board = weigh.move(p, board, hint.action);
        assert.ok(board);
        assert.ok(++steps <= p.parameters.weighing_budget);
      }
    }
  }
});

test('balance hints and candidate notebooks do not depend on the hidden answer', () => {
  const source = balances[5];
  const p = withSecret(source, ['A', 1]), q = withSecret(source, ['B', 1]);
  const action = {type:'weigh', left:['A', 'B', 'C'], right:['D', 'E', 'F']};
  const first = weigh.move(p, fixedBoard(p), action), second = weigh.move(q, fixedBoard(q), action);
  assert.notDeepEqual(first.secret, second.secret);
  assert.deepEqual(first.observations, second.observations);
  assert.deepEqual(weigh.hint(p, first), weigh.hint(q, second));
  assert.equal(weigh.render(p, {board:first}), weigh.render(q, {board:second}));
});

test('balance persists selection, notebook, answer and observations without spending selection budget', () => {
  const p = balances[0];
  let board = fixedBoard(p);
  board = weigh.move(p, board, {type:'place', coin:'A', pan:'left'});
  board = weigh.move(p, board, {type:'place', coin:'B', pan:'right'});
  board = weigh.move(p, board, {type:'notebook'});
  assert.equal(board.observations.length, 0);
  assert.equal(board.notebook, true);
  assert.deepEqual(copy(board), board);
  assert.equal(weigh.valid(p, copy(board)), true);
  assert.match(weigh.render(p, {board}), /id="candidate-notebook"/);
  assert.ok(!/aria-pressed="true"[^>]*disabled/.test(weigh.render(p, {board})), 'Selected pan buttons remain focusable for keyboard placement');
  const before = copy(board);
  board = weigh.move(p, board, {type:'weigh'});
  assert.deepEqual(before.observations, []);
  assert.deepEqual(board.observations, [{left:['A'], right:['B'], result:'='}]);
  assert.equal(weigh.move(p, board, {type:'weigh'}), null, 'Weighings cannot exceed the budget');
  board = weigh.move(p, board, {type:'answer', coin:'C', deviation:'1'});
  assert.equal(weigh.solved(p, board), true);
  assert.equal(weigh.valid(p, copy(board)), true);
});

test('balance rejects duplicate, overlapping, unknown, empty and unequal pans', () => {
  const p = balances[4], board = fixedBoard(p);
  for (const action of [null, [], {}, {type:'place', coin:'Z', pan:'left'}, {type:'place', coin:'A', pan:'middle'}, {type:'weigh'}, {type:'weigh', left:[], right:[]}, {type:'weigh', left:['A', 'B'], right:['C']}, {type:'weigh', left:['A'], right:['A']}, {type:'weigh', left:['A', 'A'], right:['B', 'C']}, {type:'weigh', left:['A'], right:['Z']}, {type:'weigh', left:'A', right:['B']}, {type:'answer', coin:'R', deviation:1}, {type:'answer', coin:'A', deviation:0}, {type:'answer', coin:'A', deviation:''}, {type:'answer', coin:'A', deviation:null}]) assert.equal(weigh.move(p, board, action), null, JSON.stringify(action));
  assert.ok(weigh.move(p, board, {type:'weigh', left:['A'], right:['R']}), 'The genuine reference is legal');
  const heavy = balances[0];
  assert.equal(weigh.move(heavy, fixedBoard(heavy), {type:'answer', coin:'A', deviation:-1}), null);
});

test('balance save validation replays evidence and rejects impossible or malformed records', () => {
  const p = balances[0], initial = fixedBoard(p), board = weigh.move(p, initial, {type:'weigh', left:['A'], right:['B']});
  const invalids = [null, [], {}, {...initial, notebook:'yes'}, {...initial, left:['A'], right:['A']}, {...initial, observations:null}, {...initial, observations:[null]}, {...initial, observations:[{left:['A'], right:['B'], result:'L'}]}, {...initial, observations:[{left:[], right:[], result:'='}]}, {...board, observations:[...board.observations, ...board.observations]}, {...initial, answer:{coin:'Z', deviation:1}}, {...initial, answer:{coin:'A', deviation:'1'}}, {...initial, answer:[]}, {...initial, observations:[{left:['A'], right:['B'], result:'?'}]}];
  for (const invalid of invalids) {
    assert.equal(weigh.valid(p, invalid), false, JSON.stringify(invalid));
    assert.equal(weigh.solved(p, invalid), false);
    assert.equal(weigh.move(p, invalid, {type:'notebook'}), null);
    assert.equal(weigh.hint(p, invalid).type, 'deadend');
  }
});

test('wasted weighings cannot unlock a lucky answer; hints report exhausted or insufficient budgets', () => {
  const p = balances[2];
  let board = weigh.move(p, fixedBoard(p), {type:'weigh', left:['A'], right:['B']});
  assert.equal(weigh.hint(p, board).type, 'deadend', 'Seven hypotheses cannot be guaranteed in one remaining weighing');
  board = weigh.move(p, board, {type:'weigh', left:['A'], right:['B']});
  assert.equal(weigh.hint(p, board).type, 'deadend');
  board = weigh.move(p, board, {type:'answer', coin:'H', deviation:1});
  assert.equal(weigh.solved(p, board), false);
  assert.match(weigh.render(p, {board}), /Undo a weighing or start again/);
  assert.equal(weigh.move(p, board, {type:'weigh', left:['H'], right:['J']}), null);
});
