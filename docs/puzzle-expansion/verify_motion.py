#!/usr/bin/env python3
"""Check the 66 authored motion puzzles using only Python's standard library.

Toggle minima use BFS over lamp states, not the supplied move witnesses.
Clock answers use direct finite-orbit simulation, not gcd/CRT formulas.
Billiards use exact rational collision events, not the gcd/bounce formulas.
"""
from collections import deque
from fractions import Fraction
from math import gcd
from pathlib import Path
import json


def edges_for(p):
    if p['topology'] == 'cycle':
        v = p['vertices']
        return [[v[i], v[(i + 1) % len(v)]] for i in range(len(v))]
    if p['topology'] == 'complete_binary_tree_depth_2':
        return [['R', 'A'], ['R', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'E'], ['B', 'F']]
    if p['topology'] == 'rectangular_grid':
        rows = p['rows']
        return ([[row[j], row[j+1]] for row in rows for j in range(len(row)-1)]
                + [[rows[i][j], rows[i+1][j]] for i in range(len(rows)-1)
                   for j in range(len(rows[0]))])
    if p['topology'] == 'worksheet_graph':
        assert len(p['positions']) == len(p['vertices'])
        assert all(len(xy) == 2 and all(isinstance(n, (int, float)) for n in xy) for xy in p['positions'])
        assert len({frozenset(e) for e in p['edges']}) == len(p['edges'])
        assert all(len(e) == len(set(e)) == 2 for e in p['edges'])
        return p['edges']
    raise AssertionError('unrecognized topology')


def check_toggle(instance):
    p, s = instance['parameters'], instance['solution']
    vertices = p['vertices']
    edges = edges_for(p)
    assert {frozenset(e) for e in edges} == {frozenset(e) for e in p['edges']}
    assert len(vertices) == len(set(vertices))
    ix = {v: i for i, v in enumerate(vertices)}
    def bits(lamps):
        assert len(lamps) == len(set(lamps)) and set(lamps) <= set(vertices)
        return sum(1 << ix[v] for v in lamps)
    edge_masks = [bits(e) for e in edges]
    start, goal = bits(p['initial_on']), bits(p['target_on'])
    state = start
    for e in s['presses']:
        assert frozenset(e) in {frozenset(f) for f in edges}
        state ^= bits(e)
    assert state == goal
    distances = {start: 0}
    q = deque([start])
    while q:
        state = q.popleft()
        for m in edge_masks:
            nxt = state ^ m
            if nxt not in distances:
                distances[nxt] = distances[state] + 1
                q.append(nxt)
    assert distances[goal] == s['minimum_presses']
    assert len(s['presses']) == s['minimum_presses']
    if p.get('press_budget') is not None:
        assert len(s['presses']) <= p['press_budget']
        assert p['press_budget'] == distances[goal]
    return f"minimum {distances[goal]} presses"


def orbit_period(n, k, start=0):
    x, route = start, [start]
    while True:
        x = (x + k) % n
        route.append(x)
        if x == start:
            return len(route)-1, route
        assert len(route) <= n + 1


def check_clock(instance):
    p, s = instance['parameters'], instance['solution']
    if p['mode'] == 'choose_jump':
        answers = []
        for k in range(p['jump_min'], p['jump_max'] + 1):
            period, route = orbit_period(p['positions'], k, p['start'])
            if period == p['required_first_return']:
                answers.append(k)
        assert answers == s['all_valid_jumps']
        assert s['jump'] in answers
        assert orbit_period(p['positions'], s['jump'], p['start'])[1] == s['orbit']
        return f"valid jumps {answers}"
    assert p['mode'] == 'choose_first_activation_count'
    clocks = p['clocks']
    start = tuple(c['start'] for c in clocks)
    target = tuple(c['target'] for c in clocks)
    state, seen, t, first, routes = start, {start}, 0, None, [list(start)]
    while True:
        t += 1
        state = tuple((x + c['jump']) % c['positions'] for x, c in zip(state, clocks))
        routes.append(list(state))
        if state == target and first is None:
            first = t
        if state == start:
            break
        assert state not in seen
        seen.add(state)
    assert first is not None and first == s['activations']
    assert routes[:first+1] == s['joint_route']
    assert t == s['joint_period']
    return f"first hit {first}; joint period {t}"


def trace(width, height, rise=1, run=1):
    """Start bottom-left, reflect at a wall, stop at the first corner."""
    w, h = Fraction(width), Fraction(height)
    x = y = Fraction(0)
    dx, dy = Fraction(run), Fraction(rise)
    path, bounces = [[x, y]], 0
    for _ in range(10000):
        tx = ((w if dx > 0 else 0) - x) / dx
        ty = ((h if dy > 0 else 0) - y) / dy
        assert tx > 0 and ty > 0
        dt = min(tx, ty)
        x, y = x + dt * dx, y + dt * dy
        path.append([x, y])
        if tx == ty:
            corner = ('top' if y == h else 'bottom') + '-' + ('right' if x == w else 'left')
            return corner, bounces, path
        bounces += 1
        if tx < ty:
            dx = -dx
        else:
            dy = -dy
    raise AssertionError('rational direction failed to reach a corner')


def serialize_path(path):
    return [[str(x), str(y)] for x, y in path]


def check_billiard(instance):
    """Mirror Couriers revision 2 (docs/couriers/README.md): rooms, aims and
    crossings are recomputed with the exact wall-collision trace above."""
    p, s = instance['parameters'], instance['solution']
    mode = p['mode']
    hit = lambda out, t: out[0] == t['corner'] and ('bounces' not in t or out[1] == t['bounces'])
    rooms = lambda cols, rows: [(w, h) for h in range(1, rows + 1) for w in range(1, cols + 1)]
    if mode in ('shape', 'every'):
        rise, run = p.get('rise', 1), p.get('run', 1)
        if mode == 'shape':
            answers = [f'{w}×{h}' for w, h in rooms(p['cols'], p['rows']) if hit(trace(w, h, rise, run), p['target'])]
        else:
            answers = [f'{w}×{h}' for w, h in rooms(p['cols'], p['rows']) if trace(w, h)[1] == p['bounces']]
        if mode == 'shape' and not answers:
            # Impossible: no room up to 30 by 30 either.
            assert not any(hit(trace(w, h, rise, run), p['target']) for w, h in rooms(30, 30))
    elif mode == 'aim':
        def aim(a, b):
            rise, run = b * p['height'], a * p['width']
            g = gcd(rise, run)
            return trace(p['width'], p['height'], rise // g, run // g)
        answers = [f'{a},{b}' for a, b in rooms(*p['sheet']) if gcd(a, b) == 1 and hit(aim(a, b), p['target'])]
    else:
        assert mode == 'cross'
        corner, bounces, path = trace(p['width'], p['height'])
        # The unfolded line meets its first copy corner after bounces + 1 wall pieces:
        # one copy wall per bounce, so across + up = bounces + 2.
        end_x = sum(abs(b[0] - a[0]) for a, b in zip(path, path[1:]))
        end_y = sum(abs(b[1] - a[1]) for a, b in zip(path, path[1:]))
        a, b = int(end_x / p['width']), int(end_y / p['height'])
        assert a + b == bounces + 2
        answers = [f'{a},{b}']
    assert sorted(answers) == sorted(s['answers']), (instance['id'], answers, s['answers'])
    return f"{mode}: {' '.join(answers) or 'impossible'}"


def main():
    data = json.loads(Path(__file__).with_name('motion.json').read_text())
    assert [f['id'] for f in data['families']] == ['toggle', 'clock', 'billiard']
    check = {'toggle': check_toggle, 'clock': check_clock, 'billiard': check_billiard}
    count = 0
    for family in data['families']:
        assert len(family['instances']) == {'toggle': 42, 'billiard': 18}.get(family['id'], 12)
        for instance in family['instances']:
            result = check[family['id']](instance)
            print(f"{instance['id']}: OK ({result})")
            count += 1
    print(f'PASS: {count} instances; all stated minima/first hits, complete choice sets and impossible targets checked.')


if __name__ == '__main__':
    main()
