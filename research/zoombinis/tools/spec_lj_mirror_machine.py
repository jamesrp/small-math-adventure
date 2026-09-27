#!/usr/bin/env python3
"""Executable Mirror Machine logic recovered from the supplied LJ executable.

Values 1..5 encode features; zero is a transparent channel. A cycling channel
increments its incoming value in Z/5. Arrays retain native row numbering.
"""
import argparse
from collections import Counter
import itertools
import json
import struct
from native_analysis import ROOT, KNOWN_SHA256, logical_journey_random


class Random:
    def __init__(self, state):
        self.state, self.trace = state & 0xffffffff, []

    def draw(self, lo, hi):
        self.state, value = logical_journey_random(self.state, hi - lo)
        self.trace.append([lo, hi, value + lo])
        return value + lo


def inc(value):
    return value % 5 + 1


def dec(value):
    return value - 1 if value > 1 else 5


def apply_filter(traits, values, cycle=None):
    result = list(traits)
    for j, value in enumerate(values):
        if j == cycle:
            result[j] = inc(result[j])
        elif value:
            result[j] = value
    return result


def transform(traits, filters):
    for card in filters:
        traits = apply_filter(traits, card['values'], card.get('cycle'))
    return list(traits)


def matches(left, target, left_filters=(), right_filters=()):
    """Filters listed in physical left-to-right order on both sides."""
    return transform(left, left_filters) == transform(target, reversed(right_filters))


def solve(inputs, targets, filters):
    """Enumerate every ordered chain of <=3 distinct cards on each side.

    Empty-slot positions are quotiented out because they are transparent.
    Right chains are reported in physical left-to-right order.
    """
    chains = [p for n in range(4) for p in itertools.permutations(range(len(filters)), n)]
    right_outputs = {}
    for p in chains:
        output = tuple(tuple(transform(t, (filters[i] for i in reversed(p)))) for t in targets)
        right_outputs.setdefault(output, []).append((p, sum(1 << i for i in p)))
    count, best, histogram = 0, None, Counter()
    for p in chains:
        output = tuple(tuple(transform(t, (filters[i] for i in p))) for t in inputs)
        mask = sum(1 << i for i in p)
        for q, qmask in right_outputs.get(output, []):
            if mask & qmask:
                continue
            count += 1
            length = len(p) + len(q)
            histogram[length] += 1
            if best is None or length < len(best[0]) + len(best[1]):
                best = [list(p), list(q)]
    return {'ordered_chain_solutions': count, 'minimum_filters': None if best is None else sum(map(len, best)),
            'witness': best, 'solutions_by_filter_count': dict(sorted(histogram.items()))}


def difficulty_report(count):
    reports = []
    for level in (3, 4):
        for single in (False, True):
            minimum, solutions, failed = Counter(), [], []
            for seed in range(count):
                first = [1, 2, 3, 4]
                second = [0]*4 if single else [5, 4, 3, 2]
                row = advanced(level, seed, first, second)
                inputs = [first] + ([second] if level == 4 and not single else [])
                targets = [row['A'][7]] + ([row['B'][8]] if len(inputs) == 2 else [])
                result = solve(inputs, targets, row['filters'])
                minimum[result['minimum_filters']] += 1
                solutions.append(result['ordered_chain_solutions'])
                if result['witness'] is None:
                    failed.append(seed)
            reports.append({'level': level, 'single_remaining_input': single, 'samples': count,
                            'first': first, 'second': second,
                            'minimum_filter_histogram': {str(k): v for k, v in minimum.items()},
                            'solution_count_range': [min(solutions), max(solutions)],
                            'unsolvable_seed_states': failed})
    return {'scope': 'Exact enumeration of all disjoint ordered chains of <=3 cards/side for the specified seeded core instances. Samples are not a distributional claim.', 'samples': reports}


def advanced(level, seed, first, second=(0, 0, 0, 0)):
    assert level in (3, 4)
    rng = Random(seed)
    A, B, C = ([[0] * 4 for _ in range(9)] for _ in range(3))
    A[0], B[0] = list(first), list(second)
    P, Q = list(first), list(second)
    for row in (1, 2):
        pool, count, cycling = list(range(8)), 0, False
        special = rng.draw(0, 4)
        for j in range(4):
            if count == 2:
                continue
            index = rng.draw(1, 5 - count)
            if j == special and rng.draw(0, 100) > 70 and not cycling:
                cycling = True
                A[row][j] = inc(P[j] or first[j])
                if Q[j]:
                    B[row][j] = inc(Q[j])
                else:
                    # 0x444290 writes A, not B, when second input is absent.
                    A[row][j] = second[j] + 1
                C[row][j] = A[row][j]
            elif rng.draw(0, 100) > 40 or (j == 3 and count == 0):
                A[row][j] = B[row][j] = pool[index]
            if A[row][j]:
                P[j], Q[j] = A[row][j], B[row][j]
                count += 1
                pool.pop(index)
    R, S = P.copy(), Q.copy()
    for row in (3, 4):
        pool, count, cycling = list(range(8)), 0, False
        rng.draw(0, 4)  # consumed but unused
        for j in range(4):
            if count == 2:
                continue
            index = rng.draw(1, 5 - count)
            choose_cycle = rng.draw(0, 100) > 70 or (j == 3 and count == 0)
            ordinary_forward = any(A[r][j] and not C[r][j] for r in (2, 1))
            if choose_cycle and not cycling:
                cycling = True
                if row == 4 and C[3][j]:
                    A[row][j], B[row][j] = dec(R[j]), dec(S[j])
                elif row == 4 and A[3][j]:
                    A[row][j] = B[row][j] = pool[index]
                else:
                    A[row][j] = R[j] or first[j]
                    B[row][j] = S[j] if R[j] else second[j]
                C[row][j] = A[row][j]
            elif row == 4 and C[3][j]:
                if not cycling:
                    cycling = True
                    A[row][j], B[row][j] = dec(R[j]), dec(S[j])
                    C[row][j] = A[row][j]
            elif row == 4 and A[3][j]:
                A[row][j] = B[row][j] = pool[index]
            elif ordinary_forward:
                A[row][j], B[row][j] = R[j], S[j]
            if A[row][j]:
                R[j], S[j] = A[row][j], B[row][j]
                count += 1
                pool.pop(index)
    for matrix, current, target_row in [(A, R, 7)] + ([(B, S, 8)] if second[0] else []):
        for j in range(4):
            if C[4][j]:
                value = dec(matrix[4][j])
            elif matrix[4][j]:
                value = rng.draw(1, 5)
            elif C[3][j]:
                value = dec(matrix[3][j])
            elif matrix[3][j]:
                value = rng.draw(1, 5)
            else:
                value = current[j]
            matrix[target_row][j] = value
    if level == 3:
        for row in (5, 6):
            pool, count = list(range(8)), 0
            special = rng.draw(0, 3)
            for j in range(4):
                if count == 2:
                    continue
                index = rng.draw(1, 5 - count)
                if j == special and rng.draw(0, 100) > 70:
                    A[row][j] = C[row][j] = pool[index]
                elif rng.draw(0, 100) > 40 or (j == 3 and count == 0):
                    A[row][j] = pool[index]
                if A[row][j]:
                    count += 1
                    pool.pop(index)
    else:
        side = rng.draw(0, 1)
        source = rng.draw(1, 2) if side else rng.draw(3, 4)
        row, other = (5, 6) if side else (6, 5)
        for j in range(4):
            if C[source][j]:
                A[row][j] = C[row][j] = A[source][j]
            elif A[source][j]:
                A[row][j] = inc(A[source][j])
        rng.draw(3, 4) if side else rng.draw(1, 2)  # unused source draw
        attr = rng.draw(0, 3)
        A[other][attr] = rng.draw(1, 5)
    cards = [{'values': A[r], 'cycle': next((j for j in range(4) if C[r][j]), None)} for r in range(1, 7)]
    return {'level': level, 'A': A, 'B': B, 'C': C, 'filters': cards,
            'targets': [A[7]] + ([B[8]] if level == 4 and second[0] else []),
            'rng_exit': rng.state, 'rng_trace': rng.trace}


def basic(level, seed, first, *, refresh_remaining=None):
    assert level in (1, 2)
    rng, target = Random(seed), list(first)
    filters, overlay, reference = [], [0] * 4, [0] * 4
    if level == 2:
        if refresh_remaining is None:
            rng.draw(0, 3)  # type-2 object-group selection, value unused
        for row in range(4):
            attrs, values, card = list(range(5)), list(range(1, 7)), [0] * 4
            remaining = original = rng.draw(1, 2)
            for attempt in range(4):
                if remaining <= 0:
                    break
                vi, ai = rng.draw(0, 4 - attempt), rng.draw(0, 3 - attempt)
                if row < 2:
                    attr, value = attrs[ai], values[vi]
                    if overlay[attr] != value:
                        card[attr] = overlay[attr] = value
                        remaining -= 1
                else:
                    attr = rng.draw(0, 3)
                    if not overlay[attr] or rng.draw(0, 100) > 65 or (remaining == original and attempt == 3):
                        card[attr] = reference[attr] = overlay[attr] or target[attr]
                        remaining -= 1
                attrs.pop(ai)
                values.pop(vi)
            filters.append({'values': card, 'cycle': None})
            target = [overlay[j] or target[j] for j in range(4)]
        reference = transform(reference, reversed(filters[2:]))
        target = [0 if target[j] == reference[j] else target[j] for j in range(4)]
    guaranteed = rng.draw(0, 7 if refresh_remaining is None else min(refresh_remaining, 8) - 1)
    maximum = 5 if refresh_remaining is None else 4
    plates = []
    for i in range(8):
        plate = [rng.draw(1, maximum) for _ in range(4)]
        if i == guaranteed:
            plate = [v or rng.draw(1, maximum) for v in target]
        plates.append(plate)
    if refresh_remaining is None:
        rng.draw(0, 1)  # type-4 slots
        rng.draw(0, 1)  # type-5 output objects
    return {'level': level, 'filters': filters, 'target_mask': target,
            'plates': plates, 'guaranteed_index': guaranteed,
            'rng_exit': rng.state, 'rng_trace': rng.trace}


class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX
        self.m = m = NativeOracle('logical-journey')
        self.desc = m.alloc(0x180)
        self.objects = {i: m.alloc(0x180) for i in range(1, 17)}
        self.descriptors = []
        def create(machine):
            self.descriptors.append(machine.read(machine.arg(0), 0x110))
            return 0
        m.hook(0x444fb0, create, pop=4)
        m.hook(0x456380, lambda machine: self.objects.get(machine.arg(0) & 65535, 0), pop=4)
        self.trace, self.pending = [], []
        m.write_u16(0x48bc28, 0)
        def before(uc, address, size, unused):
            self.pending.append([m.arg(0) & 65535, m.arg(1) & 65535])
        def after(uc, address, size, unused):
            self.trace.append(self.pending.pop() + [m.reg(UC_X86_REG_EAX) & 65535])
        m.uc.hook_add(UC_HOOK_CODE, before, begin=0x401070, end=0x401070)
        # range helper has one return (verified in native_inspect).
        m.uc.hook_add(UC_HOOK_CODE, after, begin=0x401084, end=0x401084)

    def advanced(self, level, seed, first, second):
        m = self.m
        self.trace.clear()
        m.write(0x49ca20, bytes(0x360))
        m.write_u32(0x4959d0, seed)
        m.write_u16(0x49cd30, level)
        m.write(0x49cd60, bytes(first) + bytes(second))
        m.call(0x444070, [self.desc, 1])
        result = {}
        for name, address in [('A', 0x49cc54), ('B', 0x49caa0), ('C', 0x49cb64)]:
            values = struct.unpack('<36H', m.read(address, 72))
            result[name] = [list(values[i:i + 4]) for i in range(0, 36, 4)]
        result.update(rng_exit=m.u32(0x4959d0), rng_trace=self.trace.copy())
        return result

    def basic(self, level, seed, first, *, refresh_remaining=None):
        m = self.m
        self.trace.clear()
        self.descriptors.clear()
        m.write(0x49ca20, bytes(0x360))
        m.write_u32(0x4959d0, seed)
        m.write_u16(0x49cd30, level)
        m.write(0x49cd60, bytes(first))
        if refresh_remaining is None:
            m.call(0x443b20, [level])
            offset = 4 if level == 2 else 0
            cards = [list(d[0xc0:0xc4]) for d in self.descriptors]
            filters = cards[:offset]
            plates = cards[offset:offset + 8]
        else:
            filters = []
            if level == 2:
                for row in range(4):
                    m.call(0x443710, [self.desc, row])
                    filters.append(list(m.read(self.desc + 0xc0, 4)))
            for i in range(8):
                m.write_u16(0x49cbc4 + i * 2, i + 1)
            m.call(0x4435b0, [refresh_remaining])
            plates = [list(m.read(self.objects[i + 1] + 0xf0, 4)) for i in range(8)]
        return {'filters': [{'values': v, 'cycle': None} for v in filters],
                'plates': plates, 'target_mask': list(m.read(0x49cd60, 4)),
                'rng_exit': m.u32(0x4959d0), 'rng_trace': self.trace.copy()}

    def compare(self, first, target, left, right):
        m = self.m
        m.write(0x49ca7c, bytes(16))
        rows = [list(first)] + [[0]*4 for _ in range(6)] + [list(target)]
        for side, cards in [(0, left), (3, right)]:
            for slot, card in enumerate(cards, side):
                entity_id = slot + 1
                obj = self.objects[entity_id]
                m.write(obj, bytes(0x180))
                m.write(obj + 0xf0, bytes(card['values']))
                m.write_u16(obj + 0x12a, 0 if card.get('cycle') is None else card['cycle'] + 1)
                m.write_u16(0x49ca7c + slot*2, entity_id)
                rows[entity_id] = card['values'].copy()
        m.write(0x49cbf4, struct.pack('<32H', *sum(rows, [])))
        for i in (7, 8):
            m.write(self.objects[i], bytes(0x180))
        m.write_u16(0x49ca88, 7)
        m.write_u16(0x49ca8a, 8)
        m.call(0x442400)
        m.call(0x4424f0)
        result = m.call(0x442f20) & 65535
        return result, list(m.read(self.objects[7]+0xf0, 4)), list(m.read(self.objects[8]+0xf0, 4))


def validate(count=100):
    oracle, cases, witnesses, absent_second = Oracle(), 0, 0, 0
    examples, basic_cases, comparison_cases = [], 0, 0
    for level in (1, 2):
        for first in ([1, 2, 3, 4], [5]*4):
            for remaining in (None, 1, 7, 16):
                for seed in range(count):
                    expected = basic(level, seed, first, refresh_remaining=remaining)
                    actual = oracle.basic(level, seed, first, refresh_remaining=remaining)
                    for key, value in actual.items():
                        assert value == expected[key], (level, seed, remaining, key, value, expected[key])
                    basic_cases += 1
                    assert any(matches(first, t, expected['filters'][:2], expected['filters'][2:]) for t in expected['plates'])
    for level in (3, 4):
        for first, second in [([1, 2, 3, 4], [5, 4, 3, 2]), ([5]*4, [1]*4), ([2]*4, [2]*4), ([1, 3, 5, 2], [0]*4)]:
            for seed in list(range(count)) + [0xffffffff, 0x80000000]:
                expected = advanced(level, seed, first, second)
                actual = oracle.advanced(level, seed, first, second)
                for key, value in actual.items():
                    assert value == expected[key], (level, seed, first, second, key, value, expected[key])
                cases += 1
                for permutation in [(0, 1, 2, 3), (5, 2, 0, 4), (0, 1, 4, 2, 3, 5)]:
                    nleft = len(permutation)//2
                    left = [expected['filters'][i] for i in permutation[:nleft]]
                    right = [expected['filters'][i] for i in permutation[nleft:]]
                    a, b = transform(first, left), transform(expected['A'][7], reversed(right))
                    assert oracle.compare(first, expected['A'][7], left, right) == (0 if a == b else 2, a, b)
                    comparison_cases += 1
                if second[0]:
                    assert matches(first, expected['A'][7], expected['filters'][:2], expected['filters'][2:4])
                    if level == 4:
                        assert matches(second, expected['B'][8], expected['filters'][:2], expected['filters'][2:4])
                    witnesses += 1
                else:
                    absent_second += 1
                if seed == 0:
                    examples.append(expected)
    return {'status': 'passed', 'source_sha256': KNOWN_SHA256['logical-journey'],
            'advanced_generation_cases': cases, 'constructed_witness_cases': witnesses,
            'basic_initial_and_refresh_cases': basic_cases, 'native_transformation_comparison_cases': comparison_cases,
            'absent_second_input_cases': absent_second, 'examples': examples,
            'boundary': 'Original 0x444070 with original RNG and complete A/B/C matrices; no generator stubs. Basic 0x443b20 replaces graphical card factory with descriptor recorder returning0. Refresh executes443710 and4435b0 with allocated entity lookup. Comparison executes442400,4424f0,442f20 with allocated entity lookup. Initialized RNG state supplied. Model solution witness uses rows1,2 on left and rows3,4 on right.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--count', type=int, default=100)
    parser.add_argument('--analyze', action='store_true')
    args = parser.parse_args()
    report = difficulty_report(args.count) if args.analyze else validate(args.count)
    path = ROOT / 'local/analysis/logical-journey-mirror-machine' / ('difficulty.json' if args.analyze else 'validation.json')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'examples'}, indent=2))
