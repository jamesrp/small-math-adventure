#!/usr/bin/env python3
"""Independent Bubble Bumpers L1 predicate prefix, including stack inputs.

This is not the whole L1 board generator. Native tests stop before the builders'
subsequent grouping/scoring work. Models are standard-library only; native tests
load Unicorn lazily. Trait categories and values retain native one-based IDs.
"""
import argparse
import hashlib
import json
import random
import struct

from spec_mr_turtle_hurdle import ROOT, EXE, SHA, Rand, guard

OUT = ROOT / 'local/analysis/mountain-rescue-bubble-bumpers'
VALUE5_OFFSETS = (0x44, 0x5c, 0x74, 0x8c)


class NoCandidate(RuntimeError):
    """The original rejection sampler has no qualifying selectable cell."""


def select_pair(party, rng, value5=(0, 0, 0, 0), initial_b=(0, 0), extra_scan=(0,)):
    """441ba0. `value5` is the four previously unwritten stack dwords.

    `extra_scan` represents the fifth row read by the two existence scans. In
    ordinary calls it consists of four non-2 output pointers and one stack word.
    These entries can keep a native loop alive, but are never selectable.
    NoCandidate is an explicit bounded-model signal, not a native return value.
    """
    if len(value5) != 4:
        raise ValueError('Four native value-5 stack words are required')
    table = [[2 if any(row[c] == v for row in party) else 0
              for v in range(1, 5)] + [value5[c] & 0xffffffff]
             for c in range(4)]
    a, b = None, list(initial_b)
    first_trials = []

    def has_any():
        return any(2 in row for row in table) or 2 in extra_scan

    def pick():
        if not any(2 in row for row in table):
            raise NoCandidate('Native loops drawing categories 1..4 / values 1..5 with no table entry 2')
        while True:
            c, v = rng.next(4) + 1, rng.next(5) + 1
            if table[c - 1][v - 1] == 2:
                return [c, v]

    while True:
        a = pick()
        first_trials.append(a[:])
        table[a[0] - 1][a[1] - 1] = 3
        if not has_any():
            return {'a': a, 'b': b, 'return': 1, 'table': table, 'first_trials': first_trials}
        b = pick()
        # 441ce0 marks A again, not B. Failed A remains excluded on retry.
        table[a[0] - 1][a[1] - 1] = 3
        if not any(row[a[0] - 1] == a[1] and row[b[0] - 1] == b[1] for row in party):
            return {'a': a, 'b': b, 'return': 0, 'table': table, 'first_trials': first_trials}
        if not has_any():
            return {'a': a, 'b': b, 'return': 1, 'table': table, 'first_trials': first_trials}


def prefix(party, seed, value5=(0, 0, 0, 0), flag=0, initial_b=(0, 0), extra_scan=(0,)):
    """Common initial selection in 441d70 / 442a30, through orientation.

    flag is the incoming byte at builder frame B+0x5b. Category/value tests
    are literal source tests, including comparisons of values across categories.
    """
    rng = Rand(seed)
    result = select_pair(party, rng, value5, initial_b, extra_scan)
    a, b = result['a'], result['b']
    flag &= 255
    c_trials, d_trials = [], []
    while True:
        c = [rng.next(4) + 1, rng.next(5) + 1]
        c_trials.append(c)
        if c[0] != a[0] and c[0] != b[0]:
            flag = 1
        if c[1] != b[1]:
            flag = 1
        if flag:
            break
    while True:
        d = [rng.next(4) + 1, rng.next(5) + 1]
        d_trials.append(d)
        if d[0] not in (a[0], b[0], c[0]):
            flag = 1
        if d[1] not in (a[1], b[1], c[1]) or flag:
            break
    orientation = rng.next(2)
    return result | {'c': c, 'd': d, 'c_trials': c_trials, 'd_trials': d_trials,
                     'orientation': orientation, 'score_base': 10 - result['return'],
                     'rng_state': rng.state, 'rng_trace': rng.trace}


class TraitOracle:
    """Run exact source helper or either source prefix with explicit old stack."""
    def __init__(self):
        from spec_mr_bubble_bumpers import Harness
        self.h = Harness()
        self.m = self.h.m
        self.outputs = self.m.alloc(16)
        self.entry = self.m.STACK + self.m.STACK_SIZE - 0x1000

    def prepare(self, party, seed):
        self.h.init(party)
        self.h.trace.clear()
        self.m.write_u32(self.h.thread + 20, seed)
        self.m.write(self.entry - 0x800, bytes(0x880))

    def old_table(self, base, value5):
        for offset, word in zip(VALUE5_OFFSETS, value5):
            self.m.write_u32(base + offset, word)

    def trace(self):
        return {'rng_state': self.m.u32(self.h.thread + 20), 'rng_trace': self.h.trace[:]}

    def pair(self, party, seed, value5=(0, 0, 0, 0), initial_b=(0, 0), extra_word=0, max_instructions=2_000_000):
        self.prepare(party, seed)
        m = self.m
        base = self.entry - 0x90
        self.old_table(base, value5)
        m.write(self.outputs, struct.pack('<4I', *initial_b, 0, 0))
        m.write_u32(self.entry + 20, extra_word)
        status = m.call(0x441ba0, [self.outputs + 4 * i for i in range(4)], ecx=self.h.obj,
                        max_instructions=max_instructions)
        values = list(struct.unpack('<4I', m.read(self.outputs, 16)))
        table = [[m.u32(base + 0x34 + c * 0x18 + v * 4) for v in range(5)] for c in range(4)]
        return {'a': values[2:], 'b': values[:2], 'return': status, 'table': table} | self.trace()

    def prefix(self, variant, party, seed, value5=(0, 0, 0, 0), flag=0, initial_b=(0, 0)):
        from unicorn.x86_const import UC_X86_REG_EBX
        if variant not in (0, 1):
            raise ValueError('Native L1 variant is 0 or 1')
        self.prepare(party, seed)
        m = self.m
        base = self.entry - 0x12c
        # Helper entry is B-20, after four pointer pushes and call return address.
        self.old_table(base - 0xa4, value5)
        m.write(base + 0x5b, bytes([flag & 255]))
        m.write_u32(base + 0x48, initial_b[0])
        m.write_u32(base + 0x3c, initial_b[1])
        start, stop = ((0x441d70, 0x441f14), (0x442a30, 0x442bd8))[variant]
        m.call(start, ecx=self.h.obj, stop_at=stop)
        a = [m.u32(base + 0x44), m.u32(base + (0x54 if variant == 0 else 0x4c))]
        b = [m.u32(base + 0x48), m.u32(base + 0x3c)]
        c = [m.u32(base + (0x34 if variant == 0 else 0x38)), m.u32(base + (0x2c if variant == 0 else 0x30))]
        d = [m.u32(base + (0x28 if variant == 0 else 0x2c)), m.u32(base + 0x1c)]
        orientation = m.reg(UC_X86_REG_EBX) if variant == 0 else m.u32(base + 0x24)
        offset = 0x3e4 if variant == 0 else 0x2c4
        orientation_cell = [m.u32(self.h.obj + offset + delta) for delta in (0, 4, 20)]
        return {'a': a, 'b': b, 'c': c, 'd': d, 'orientation': orientation,
                'score_base': m.u32(base + (0x38 if variant == 0 else 0x34)),
                'orientation_cell': orientation_cell} | self.trace()


def native_trace(trace):
    return [{k: t[k] for k in ('rand', 'state')} for t in trace]


def fixtures():
    parties = [
        [[1, 1, 1, 1]],
        [[1, 1, 1, 1], [2, 2, 2, 2]],
        [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 1], [4, 5, 1, 2], [5, 1, 2, 3]],
        [[5, 5, 5, 5], [1, 5, 5, 5]],
        [[1, 1, 1, 1], [1, 2, 2, 2], [2, 1, 2, 2]],
    ]
    rnd = random.Random(441_600)
    for n in (2, 4, 8, 12, 16):
        party = []
        while len(party) < n:
            row = [rnd.randrange(1, 6) for _ in range(4)]
            if row not in party:
                party.append(row)
        parties.append(party)
    return parties


def validate():
    guard()
    oracle = TraitOracle()
    pairs = prefixes = 0
    flags = (0, 1, 255)
    stacks = ((0, 0, 0, 0), (2, 2, 2, 2), (0, 2, 3, 0xdeadbeef))
    seeds = (0, 1, 2, 42, 65535, 0xffffffff)
    for party in fixtures():
        for seed in seeds:
            for value5 in stacks:
                rng = Rand(seed)
                expected = select_pair(party, rng, value5)
                actual = oracle.pair(party, seed, value5)
                for key in ('a', 'b', 'return', 'table'):
                    assert expected[key] == actual[key], ('pair', party, seed, value5, key, expected, actual)
                assert actual['rng_state'] == rng.state
                assert actual['rng_trace'] == native_trace(rng.trace)
                pairs += 1
                for flag in flags:
                    expected = prefix(party, seed, value5, flag)
                    assert len(expected['d_trials']) == 1
                    for variant in (0, 1):
                        actual = oracle.prefix(variant, party, seed, value5, flag)
                        for key in ('a', 'b', 'c', 'd', 'orientation', 'score_base', 'rng_state'):
                            assert expected[key] == actual[key], ('prefix', variant, party, seed, value5, flag, key, expected, actual)
                        assert actual['rng_trace'] == native_trace(expected['rng_trace'])
                        assert actual['orientation_cell'] == ([13, 3, 1] if expected['orientation'] else [12, 2, 1])
                        prefixes += 1
    # Controlled examples use the same party and seed; only previous stack differs.
    party = [[1, 1, 1, 1], [2, 2, 2, 2]]
    examples = {}
    for seed in range(1000):
        zero = prefix(party, seed)
        nonzero = prefix(party, seed, flag=1)
        fives = prefix(party, seed, value5=(2, 2, 2, 2))
        keys = ('a', 'b', 'c', 'd', 'orientation', 'score_base', 'rng_state')
        if 'flag' not in examples and any(zero[k] != nonzero[k] for k in keys):
            a = oracle.prefix(0, party, seed, flag=0)
            b = oracle.prefix(0, party, seed, flag=1)
            assert a != b
            examples['flag'] = {'party': party, 'seed': seed, 'zero': a, 'one': b}
        if 'value5' not in examples and (fives['a'][1] == 5 or fives['b'][1] == 5):
            a = oracle.prefix(0, party, seed)
            b = oracle.prefix(0, party, seed, value5=(2, 2, 2, 2))
            assert a != b
            examples['value5'] = {'party': party, 'seed': seed, 'zeros': a, 'twos': b,
                'absence': 'The party has no trait value 5, yet a selected A or B predicate uses value 5.'}
        if len(examples) == 2:
            break
    assert len(examples) == 2
    # With one initialized present predicate, B's output slots are never written.
    party = [[5, 5, 5, 5], [1, 5, 5, 5]]
    old_b_cases = []
    for old_b in ((0, 0), (3, 2), (4, 5)):
        expected = prefix(party, 0, initial_b=old_b)
        assert expected['return'] == 1 and expected['b'] == list(old_b)
        for variant in (0, 1):
            actual = oracle.prefix(variant, party, 0, initial_b=old_b)
            for key in ('a', 'b', 'c', 'd', 'orientation', 'score_base', 'rng_state'):
                assert actual[key] == expected[key]
            assert actual['rng_trace'] == native_trace(expected['rng_trace'])
            old_b_cases.append({'variant': variant, 'initial_b': list(old_b),
                                'result': {k: v for k, v in actual.items() if k != 'rng_trace'}})
    stalls = []
    for party, extra_word, phase in (([[5, 5, 5, 5]], 0, 'first sample'),
                                     ([[1, 5, 5, 5]], 2, 'second sample')):
        try:
            select_pair(party, Rand(0), extra_scan=(extra_word,))
        except NoCandidate:
            pass
        else:
            raise AssertionError('Expected pure no-candidate detection')
        try:
            oracle.pair(party, 0, extra_word=extra_word, max_instructions=20_000)
        except RuntimeError as error:
            assert 'budget exhausted' in str(error), error
            stalls.append({'party': party, 'extra_scan_word': extra_word, 'phase': phase,
                           'native_result': str(error), 'instruction_limit': 20000,
                           'rng_calls': len(oracle.h.trace)})
        else:
            raise AssertionError('Expected native rejection-loop instruction limit')
    source = EXE.read_bytes()
    result = {'schema_version': 1, 'status': 'passed', 'source_sha256': SHA,
              'pair_cases': pairs, 'prefix_cases': prefixes,
              'untouched_b_cases': old_b_cases, 'bounded_no_candidate_cases': stalls,
              'native_examples': examples,
              'ranges': [{'start': hex(a), 'end_exclusive': hex(b),
                          'sha256': hashlib.sha256(source[a-0x400000:b-0x400000]).hexdigest()}
                         for a, b in ((0x441ba0, 0x441d6f), (0x441d70, 0x441f14), (0x442a30, 0x442bd8))],
              'comparison': 'A/B outputs, return status, final presence table, C/D predicates, orientation, initial score, every raw RNG result and state; both original builder prefixes.',
              'explicit_stack': {'value5_words': [list(v) for v in stacks], 'builder_flag_byte': list(flags),
                                 'other_stack': 'Zeroed; native helper fifth-row pointers are ordinary non-2 allocated addresses; trailing scan word 0.'},
              'boundaries': ['Whole L1 board grouping/scoring/best-of-30 is outside this tool.',
                             'The four unwritten value-5 words and incoming byte are explicit inputs, not a claimed actual-process distribution.',
                             'When A exhausts the selectable table before choosing B, B output slots are left untouched. Both caller prefixes then read their previous stack contents.',
                             'If the selectable presence table has no value 2, the native code has an unbounded rejection loop. The pure model raises NoCandidate instead.',
                             'Existence scans additionally read four pointer arguments and one caller word; a value 2 there can sustain a later rejection loop without a selectable candidate.']}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'level1-trait-prefix-validation.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--validate', action='store_true')
    args = parser.parse_args()
    if args.validate:
        result = validate()
        print(json.dumps({k: v for k, v in result.items() if k != 'native_examples'}, indent=2))
    else:
        party = [[1, 1, 1, 1], [2, 2, 2, 2]]
        print(json.dumps(prefix(party, 0), indent=2))


if __name__ == '__main__':
    main()
