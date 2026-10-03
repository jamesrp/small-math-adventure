#!/usr/bin/env python3
"""Check the 66 authored motion puzzles using only Python's standard library.

Toggle minima use BFS over lamp states, not the supplied move witnesses.
Clock answers use direct finite-orbit simulation, not gcd/CRT formulas.
Billiards use exact rational collision events, not the gcd/bounce formulas.
"""
from collections import deque
from fractions import Fraction
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
    p, s = instance['parameters'], instance['solution']
    mode = p['mode']
    if mode == 'predict':
        width, height = p['width'], p['height']
        rise, run = p['rise'], p['run']
    elif mode == 'choose_width':
        width, height = s['width'], p['height']
        rise, run = p['rise'], p['run']
        answers = [w for w in range(p['width_min'], p['width_max']+1)
                   if trace(w, height, rise, run)[:2] == (p['target_corner'], p['target_bounces'])]
        assert answers == s['all_valid_widths'] and width in answers
    else:
        assert mode == 'choose_direction'
        width, height = p['width'], p['height']
        rise, run = s['rise'], s['run']
        answers = [[a, b] for a in range(p['component_min'], p['component_max']+1)
                   for b in range(p['component_min'], p['component_max']+1)
                   if trace(width, height, a, b)[:2] == (p['target_corner'], p['target_bounces'])]
        assert answers == s['all_valid_directions'] and [rise, run] in answers
    corner, bounces, path = trace(width, height, rise, run)
    assert corner == s['corner'] and bounces == s['bounces']
    assert serialize_path(path) == s['path']
    if mode != 'predict':
        assert (corner, bounces) == (p['target_corner'], p['target_bounces'])
    return f"{corner}, {bounces} bounces"


def main():
    data = json.loads(Path(__file__).with_name('motion.json').read_text())
    assert [f['id'] for f in data['families']] == ['toggle', 'clock', 'billiard']
    check = {'toggle': check_toggle, 'clock': check_clock, 'billiard': check_billiard}
    count = 0
    for family in data['families']:
        assert len(family['instances']) == (42 if family['id'] == 'toggle' else 12)
        for instance in family['instances']:
            result = check[family['id']](instance)
            print(f"{instance['id']}: OK ({result})")
            count += 1
    print(f'PASS: {count} solvable instances; all stated minima/first hits and complete choice sets checked.')


if __name__ == '__main__':
    main()
