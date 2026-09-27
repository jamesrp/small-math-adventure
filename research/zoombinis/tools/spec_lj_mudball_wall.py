#!/usr/bin/env python3
"""Exact Mudball Wall board, mapping and shot semantics at native boundaries."""
import argparse
from collections import Counter
import itertools
import json
import struct
from native_analysis import ROOT, KNOWN_SHA256, logical_journey_random


class Random:
    def __init__(self, state):
        self.state, self.trace = state & 0xffffffff, []
    def draw(self, bound):
        self.state, value = logical_journey_random(self.state, bound)
        self.trace.append([bound, value])
        if len(self.trace) > 100000:
            raise RuntimeError('Native rejection loop research guard exceeded')
        return value


def groups(party_size):
    assert 1 <= party_size <= 16
    result, total = [], 0
    for value in itertools.cycle((3, 2, 1)):
        result.append(value)
        total += value
        if total >= party_size:
            break
    excess = total - party_size
    for i, value in enumerate(result):
        if excess and value >= 2:
            result[i] -= 1
            excess -= 1
    if excess:
        result = [1] * party_size
    return result


def generate(level, seed, party_size=16):
    assert 1 <= level <= 4
    rng, P, Q, unused = Random(seed), [], [], []
    for _ in range(5):
        while True:
            a, b, c = (rng.draw(4) for _ in range(3))
            if a not in P and b not in Q and (level <= 2 or c not in unused):
                P.append(a)
                Q.append(b)
                unused.append(c)
                break
    size = 25 if level <= 2 else 125
    A, B, C = [0]*size, [0]*size, [0]*size
    for index in range(size):
        if level <= 2:
            row, col = divmod(index, 5)
            A[index], B[index] = P[row], Q[col]
        else:
            row, remainder = divmod(index, 25)
            group, subcol = divmod(remainder, 5)
            # Native 42d866 deliberately retained: C uses b (ESI), not c.
            A[index], B[index], C[index] = P[row], Q[group], Q[subcol]
    shift = 0
    if level == 2:
        shift = rng.draw(1) + 2
        B = [Q[(col - shift*row) % 5] for row in range(5) for col in range(5)]
    if level == 4:
        shift = rng.draw(1) + 2
        rng.draw(1)  # result unused
        A = [P[(row - shift*subcol) % 5] for row in range(5) for group in range(5) for subcol in range(5)]
    target_groups = groups(party_size)
    targets = [0] * size
    for value in target_groups:
        while True:
            index = rng.draw(size - 1)
            if targets[index] == 0:
                targets[index] = value
                break
    if level <= 3:
        bindings = [2, 1, 0] if rng.draw(1) else [1, 2, 0]
    else:
        while True:
            bindings = [rng.draw(2) for _ in range(3)]
            if len(set(bindings)) == 3:
                break
    selector = rng.draw(5) if level == 4 else 0
    return {'level': level, 'party_size': party_size, 'A': A, 'B': B, 'C': C,
            'P': P, 'Q': Q, 'unused_third_sequence': unused, 'shift': shift,
            'targets': targets, 'groups': target_groups, 'bindings': bindings,
            'selector': selector, 'native_reserve_counter': len(target_groups) + 7 + (level == 4),
            # Launch is disabled only after this counter decrements below zero.
            'shots': len(target_groups) + 8 + (level == 4),
            'rng_exit': rng.state, 'rng_trace': rng.trace}


def controls_at(board, index):
    """Native control order: extra(49b3fa), middle(49b422), last(49b41c)."""
    a, b, c = (board[k][index] for k in ('A', 'B', 'C'))
    if board['level'] <= 2:
        return (0, b, a) if board['bindings'][0] == 2 else (0, a, b)
    return [(c,b,a), (c,a,b), (a,c,b), (b,c,a), (b,a,c), (a,b,c)][board['selector']]


def lookup(board, controls):
    for index in range(len(board['A'])):
        expected = controls_at(board, index)
        if (expected[1:] == tuple(controls[1:]) if board['level'] <= 2 else expected == tuple(controls)):
            return index
    return -1


def shoot(board, state, controls):
    """Settled state transition; every launched ball spends one shot."""
    if state['shots_left'] <= 0 or state['rescued'] >= board['party_size']:
        raise ValueError('Puzzle finished')
    index = lookup(board, controls)
    if index < 0:
        raise ValueError('Incomplete or invalid controls cannot be launched')
    result = dict(state, targets=state['targets'].copy(), history=state.get('history', []).copy())
    value = max(0, result['targets'][index])
    result['targets'][index] = -1
    result['shots_left'] -= 1
    result['rescued'] += value
    result['history'].append({'controls': list(controls), 'cell': index, 'rescued': value})
    return result


class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX
        self.m = m = NativeOracle('logical-journey')
        self.trace = []
        m.write_u16(0x48bc28, 0)
        m.hook(0x455db0, lambda m: 0, pop=32)
        m.hook(0x456380, lambda m: 0, pop=4)
        def before(uc, address, size, unused):
            self.trace.append([m.arg(0) & 65535, None])
        def after(uc, address, size, unused):
            self.trace[-1][1] = m.reg(UC_X86_REG_EAX) & 65535
        m.uc.hook_add(UC_HOOK_CODE, before, begin=0x40f9a0, end=0x40f9a0)
        for address in (0x40fa0d, 0x40f9c7):
            m.uc.hook_add(UC_HOOK_CODE, after, begin=address, end=address)

    def generate(self, level, seed, party_size):
        m = self.m
        m.write(0x49b100, bytes(0x800))
        size = 25 if level <= 2 else 125
        m.write_u16(0x49b242, level - 1)
        m.write_u16(0x49b350, party_size)
        m.write_u16(0x49b3f8, size)
        m.call(0x42ee60)
        group_count = m.u16(0x49b642)
        m.write_u32(0x4959d0, seed)
        self.trace.clear()
        m.call(0x42d6b0, timeout_us=5_000_000)
        result = {}
        for name, address in [('A', 0x49b760), ('B', 0x49b528), ('C', 0x49b42c), ('targets', 0x49b250)]:
            result[name] = list(struct.unpack('<' + str(size) + 'H', m.read(address, size*2)))
        result.update(groups=list(struct.unpack('<' + str(group_count) + 'H', m.read(0x49b64c, 2*group_count))),
                      bindings=[m.u16(a) for a in (0x49b12c, 0x49b13a, 0x49b130)],
                      selector=m.u16(0x49b86a), rng_exit=m.u32(0x4959d0), rng_trace=self.trace.copy())
        return result

    def lookup(self, controls):
        for address, value in zip((0x49b3fa, 0x49b422, 0x49b41c), controls):
            self.m.write_u16(address, value)
        value = self.m.call(0x42e540) & 65535
        return value if value < 32768 else value - 65536

    def hit(self, index, state):
        m = self.m
        m.write(0x49b250, struct.pack('<' + str(len(state['targets'])) + 'h', *state['targets']))
        m.write_u16(0x49b634, index)
        m.write_u16(0x49b35c, state['rescued'])
        m.call(0x42f0f0, [index])
        return (m.u16(0x49b35c), list(struct.unpack('<' + str(len(state['targets'])) + 'h', m.read(0x49b250, len(state['targets'])*2))))


def validate(count=100):
    oracle, generated, mapped, witnesses, hits = Oracle(), 0, 0, 0, 0
    from unicorn.x86_const import UC_X86_REG_EBX
    for level in range(1, 5):
        for party_size in range(1, 17):
            m = oracle.m
            m.write_u16(0x49b350, party_size)
            m.write(0x49b250, bytes(250))
            m.write_u16(0x49b242, level - 1)
            m.call(0x42ee60)
            n = m.u16(0x49b642)
            assert list(struct.unpack('<' + str(n) + 'H', m.read(0x49b64c, 2*n))) == groups(party_size)
            m.call(0x42c345, stop_at=0x42c37a)
            reserve = len(groups(party_size)) + 7 + (level == 4)
            assert m.u16(0x49b144) == reserve
            for _ in range(reserve + 1):
                m.call(0x42c7e9, stop_at=0x42c7f7, registers={UC_X86_REG_EBX: 0})
                reserve -= 1
                assert m.u16(0x49b144) == reserve & 65535
            assert reserve == -1  # jns at42c7f7 ceases to skip exhaustion.
    examples = []
    for level in range(1, 5):
        for party_size in (1, 2, 7, 16):
            for seed in range(count):
                row = generate(level, seed, party_size)
                native = oracle.generate(level, seed, party_size)
                for key, value in native.items():
                    assert value == row[key], (level, seed, party_size, key, value, row[key])
                generated += 1
                assert sum(row['targets']) == party_size
                assert len(set(controls_at(row, i) for i in range(len(row['A'])))) == len(row['A'])
                if seed < 4:
                    for i in range(len(row['A'])):
                        controls = controls_at(row, i)
                        assert oracle.lookup(controls) == i
                        mapped += 1
                    state = {'shots_left': row['shots'], 'rescued': 0, 'targets': row['targets'].copy()}
                    empty = next(i for i, value in enumerate(row['targets']) if not value)
                    for _ in range(2):
                        native_hit = oracle.hit(empty, state)
                        state = shoot(row, state, controls_at(row, empty))
                        assert native_hit == (state['rescued'], state['targets'])
                        hits += 1
                    for i, target in enumerate(row['targets']):
                        if target:
                            native_hit = oracle.hit(i, state)
                            state = shoot(row, state, controls_at(row, i))
                            assert native_hit == (state['rescued'], state['targets'])
                            hits += 1
                    assert state['rescued'] == party_size and state['shots_left'] == 6 + (level == 4)
                    witnesses += 1
                if seed == 0 and party_size == 16:
                    examples.append(row)
    return {'status': 'passed', 'source_sha256': KNOWN_SHA256['logical-journey'],
            'generation_cases': generated, 'native_mapping_cases': mapped, 'solution_witnesses': witnesses, 'native_hit_cases': hits,
            'native_group_and_reserve_branches': 64,
            'examples': examples, 'boundary': 'Original42ee60,42d6b0and42e540;graphicsfactory andentitylookupreturn0;logic/RNG/memset unchanged. Exact meaningful arrays,full RNGtrace/exit. Inputs1..16.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--count', type=int, default=100)
    args = parser.parse_args()
    report = validate(args.count)
    path = ROOT / 'local/analysis/logical-journey-mudball-wall/validation.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'examples'}, indent=2))
