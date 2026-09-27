"""Check authored water-pouring and weighing instances; Python standard library only."""
import json
from collections import deque
from functools import lru_cache
from itertools import combinations
from pathlib import Path


def jug_moves(state, capacities, source):
    for i in range(len(state)):
        if source:
            for value, name in [(0, 'empty'), (capacities[i], 'fill')]:
                nxt = list(state)
                nxt[i] = value
                if tuple(nxt) != state:
                    yield (name, i), tuple(nxt)
        for j in range(len(state)):
            if i == j:
                continue
            amount = min(state[i], capacities[j] - state[j])
            if amount:
                nxt = list(state)
                nxt[i] -= amount
                nxt[j] += amount
                yield ('pour', i, j), tuple(nxt)


def jug_goal(state, parameters):
    if 'target_state' in parameters:
        return list(state) == parameters['target_state']
    return parameters['target_amount'] in state


def shortest_jug(parameters):
    start = tuple(parameters['start'])
    queue = deque([(start, [])])
    seen = {start}
    while queue:
        state, path = queue.popleft()
        if jug_goal(state, parameters):
            return path
        for action, nxt in jug_moves(state, parameters['capacities'], parameters['source_and_drain']):
            if nxt not in seen:
                seen.add(nxt)
                queue.append((nxt, path + [action]))
    raise AssertionError('Unsolvable jug instance')


def hypotheses(parameters):
    deviations = [1] if parameters['odd_kind'] == 'heavy' else [-1, 1]
    return tuple((coin, delta) for coin in parameters['coins'] for delta in deviations)


def outcome(hypothesis, left, right):
    coin, delta = hypothesis
    sign = delta * ((coin in left) - (coin in right))
    return 'L' if sign > 0 else 'R' if sign < 0 else '='


def legal_weighings(coins):
    for size in range(1, len(coins) // 2 + 1):
        for left in combinations(coins, size):
            unused = [coin for coin in coins if coin not in left]
            for right in combinations(unused, size):
                if left < right:
                    yield left, right


def weighing_strategy(parameters):
    coins = tuple(parameters['coins'] + parameters['known_genuine'])
    options = list(legal_weighings(coins))

    @lru_cache(None)
    def solve(states, budget):
        if len(states) == 1:
            return {'coin': states[0][0], 'deviation': states[0][1]}
        if not budget or len(states) > 3 ** budget:
            return None
        ranked = []
        for left, right in options:
            parts = {key: tuple(s for s in states if outcome(s, left, right) == key) for key in ['L', '=', 'R']}
            sizes = [len(p) for p in parts.values()]
            if max(sizes) == len(states) or max(sizes) > 3 ** (budget - 1):
                continue
            ranked.append((max(sizes), sum(n*n for n in sizes), len(left), left, right, parts))
        for _, _, _, left, right, parts in sorted(ranked, key=lambda row: row[:5]):
            branches = {}
            for key, part in parts.items():
                if not part:
                    continue
                result = solve(part, budget - 1)
                if result is None:
                    break
                branches[key] = result
            else:
                return {'left': list(left), 'right': list(right), 'branches': branches}
        return None

    return solve(hypotheses(parameters), parameters['weighing_budget'])


def check_tree(tree, states, parameters, budget):
    if 'coin' in tree:
        assert states == ((tree['coin'], tree['deviation']),), (states, tree)
        return 0
    assert budget > 0
    left, right = tree['left'], tree['right']
    assert left and len(left) == len(right)
    assert len(set(left)) == len(left) and len(set(right)) == len(right)
    assert not set(left) & set(right)
    assert set(left + right) <= set(parameters['coins'] + parameters['known_genuine'])
    parts = {key: tuple(s for s in states if outcome(s, left, right) == key) for key in ['L', '=', 'R']}
    assert set(tree['branches']) == {key for key, part in parts.items() if part}
    return 1 + max(check_tree(tree['branches'][key], part, parameters, budget-1)
                   for key, part in parts.items() if part)


def verify():
    data = json.loads(Path(__file__).with_name('measurement.json').read_text())
    count = 0
    for family in data['families']:
        for instance in family['instances']:
            p, solution = instance['parameters'], instance['solution']
            if family['id'] == 'jug':
                state = tuple(p['start'])
                states = [list(state)]
                for action in solution['moves']:
                    legal = dict(jug_moves(state, p['capacities'], p['source_and_drain']))
                    assert tuple(action) in legal, (instance['id'], action, state)
                    state = legal[tuple(action)]
                    states.append(list(state))
                assert jug_goal(state, p)
                assert states == solution['states']
                assert len(shortest_jug(p)) == solution['minimum_moves'] == len(solution['moves'])
            else:
                depth = check_tree(solution['strategy'], hypotheses(p), p, p['weighing_budget'])
                assert depth == solution['worst_case_weighings']
                assert tuple(p['fixed_secret']) in hypotheses(p)
                shorter = dict(p, weighing_budget=p['weighing_budget']-1)
                assert weighing_strategy(shorter) is None, instance['id']
            count += 1
    print(f'Measurement: {count} instances checked; jug paths/minima and all weighing branches/budgets verified.')


if __name__ == '__main__':
    verify()
