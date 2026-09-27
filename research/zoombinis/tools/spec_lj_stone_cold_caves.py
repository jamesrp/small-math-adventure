#!/usr/bin/env python3
"""Stone Cold Caves native specification and reproducible isolated comparisons.

Pure model uses only Python's standard library. --validate-native uses the local
source executable with its SHA-256 guard and the isolated Unicorn oracle.
"""
from __future__ import annotations
import argparse
from collections import Counter
from dataclasses import asdict, dataclass, field
from functools import lru_cache
import itertools
import json
from pathlib import Path
import struct

from logical_bridge_generator import (SOURCE_SHA256, LEVEL_NAMES,
    logical_bridge_candidates, logical_bridge_features, logical_bridge_matches)
from native_analysis import logical_journey_random

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'local/analysis/logical-journey-stone-cold-caves'
GENERATORS = (0x452ec0, 0x453130, 0x453230, 0x453870)
ATTEMPT_LIMITS = (16, 18, 20, 22)


def candidates(level):
    if level not in range(4):
        raise ValueError('native difficulty must be 0..3')
    return logical_bridge_candidates(max(0, level - 1))


def features(packed, level):
    return logical_bridge_features(packed, max(0, level - 1))


@lru_cache(None)
def candidate_selection(party, level, previous_unique_rule=0, previous_unique_count=0):
    if not 1 <= len(party) <= 16 or any(len(z) != 4 or any(v not in range(1, 6) for v in z) for z in party):
        raise ValueError('expected1..16 native four-trait records, values1..5')
    pool = candidates(level)
    masks = [sum(1 << i for i, z in enumerate(party) if logical_bridge_matches(z, features(c, level))) for c in pool]
    if level == 0:
        counts = [mask.bit_count() for mask in masks]
        excluded = bool(previous_unique_rule and previous_unique_count and
                        any(count > 0 and count != previous_unique_count for count in counts))
        effective = [0 if excluded and count == previous_unique_count else count for count in counts]
        if not any(1 <= c <= min(15, len(party) // 2 + 1) for c in effective):
            raise ValueError('native balancing loop does not terminate for this party/history')
        target, delta = len(party) // 2, 1
        while not (1 <= target < 16 and target in effective):
            target += delta
            delta = -1 - delta
        selected = [(i,) for i, count in enumerate(effective) if count == target]
        return {'selected_indices': selected, 'target_matches': target,
                'previous_count_exclusion_applied': excluded,
                'candidate_match_counts': counts, 'effective_match_counts': effective}
    full = (1 << len(party)) - 1
    ranked = []
    for i, a in enumerate(masks):
        for j, b in enumerate(masks):
            if i == j:
                continue
            quadrant_counts = ((a & b).bit_count(), (a & (b ^ full)).bit_count(),
                               ((a ^ full) & b).bit_count(), ((a ^ full) & (b ^ full)).bit_count())
            occupied = sum(n > 0 for n in quadrant_counts)
            imbalance = sum(abs(a - b) for a, b in itertools.combinations(quadrant_counts, 2))
            ranked.append(((-occupied, imbalance), (i, j), quadrant_counts))
    best = min(row[0] for row in ranked)
    selected = [indices for score, indices, counts in ranked if score == best]
    return {'selected_indices': selected, 'maximum_nonempty_quadrants': -best[0],
            'minimum_pairwise_absolute_imbalance': best[1],
            'candidate_pair_count_including_excluded_diagonal': len(pool) ** 2,
            'distinct_ordered_candidate_pairs': len(ranked)}


def generate(party, level, state, previous_unique_rule=0, previous_unique_count=0):
    party = tuple(tuple(z) for z in party)
    selection = candidate_selection(party, level, previous_unique_rule, previous_unique_count)
    indices = selection['selected_indices']
    entry = state & 0xffffffff
    state, rank = logical_journey_random(entry, len(indices) - 1)
    trace = [{'minimum': 1, 'maximum': len(indices), 'result': rank + 1,
              'state_before': entry, 'state_after': state}]
    chosen = indices[rank]
    rules, raw = [], bytearray(30)
    struct.pack_into('<H', raw, 0, len(chosen))
    for axis, index in enumerate(chosen):
        packed = candidates(level)[index]
        terms = features(packed, level)
        before = state
        state, orientation = logical_journey_random(state, 1)
        trace.append({'minimum': 0, 'maximum': 1, 'result': orientation,
                      'state_before': before, 'state_after': state})
        struct.pack_into('<HB', raw, 2 + 14 * axis, orientation, len(terms))
        for t, (attribute, value) in enumerate(terms):
            raw[5 + 14 * axis + t] = attribute
            raw[10 + 14 * axis + t] = value
        rules.append({'packed': packed, 'candidate_index': index,
                      'terms': terms, 'orientation': orientation})
    return {'difficulty_native': level, 'difficulty_ui': level + 1,
            'rng_entry': entry, 'rng_exit': state, 'rules': rules,
            'rank_one_based': rank + 1, 'tied_candidates': len(indices),
            'selection': {k: v for k, v in selection.items() if k != 'selected_indices'},
            'rng_trace': trace, 'native_rule_hex': raw.hex()}


def validate(traits, rules, cave):
    """Native0x452ca0: return rejection flag and first-guardian acceptance flag.

    Cave IDs are1..4 in native enumeration. Invalid signed16 IDs become1.
    Two-axis target bits: cave1=(1,1),2=(1,0),3=(0,0),4=(0,1).
    Actual rule bits are match XOR (orientation==0).
    """
    cave = ((int(cave) + 32768) & 65535) - 32768
    if cave not in (1, 2, 3, 4):
        cave = 1
    bits = [bool(logical_bridge_matches(traits, rule['terms'])) ^ (rule['orientation'] == 0) for rule in rules]
    first_target, second_target = ((True, True), (True, False), (False, False), (False, True))[cave - 1]
    first_rejection = bits[0] != first_target
    second_rejection = len(bits) == 2 and bits[1] != second_target
    return int(first_rejection or second_rejection), int(not first_rejection)


def effective_feedback(traits, generated, cave, easy_fixed_axis):
    rejection, first_acceptance = validate(traits, generated['rules'], cave)
    if generated['difficulty_native'] == 0 and not rejection:
        # Native0x45119c..0x4511cd adds the fixed second-axis rejection.
        rejection = int(cave in ((1, 4) if easy_fixed_axis else (2, 3)))
    return {'accepted': not bool(rejection), 'first_guard_rejected': not bool(first_acceptance),
            'rejection_stage': 'first_guard' if not first_acceptance else ('second_guard' if rejection else None)}


@dataclass
class CaveState:
    party: list
    generated: dict
    easy_fixed_axis: int
    remaining_attempts: int
    passed: list
    departed: bool = False
    pending: list = field(default_factory=list)

    @classmethod
    def create(cls, party, generated, easy_fixed_axis):
        return cls([list(z) for z in party], generated, int(bool(easy_fixed_axis)),
                   ATTEMPT_LIMITS[generated['difficulty_native']], [])

    def attempt(self, member, cave):
        if self.departed or self.remaining_attempts == 0 or member in self.passed:
            raise ValueError('member cannot attempt a cave in this state')
        if member not in range(len(self.party)) or cave not in (1, 2, 3, 4):
            raise ValueError('invalid member or cave')
        result = effective_feedback(self.party[member], self.generated, cave, self.easy_fixed_axis)
        if result['accepted']:
            self.passed.append(member)
        else:
            self.remaining_attempts -= 1
        return result

    def enqueue(self, member, cave):
        if self.departed or self.remaining_attempts == 0 or member in self.passed:
            raise ValueError('member cannot enter a path')
        if member not in range(len(self.party)) or cave not in (1, 2, 3, 4):
            raise ValueError('invalid member or cave')
        if len(self.pending) >= 5 or any(m == member for m, _ in self.pending):
            raise ValueError('queue full or member already queued')
        if any(c == cave for _, c in self.pending[1:]):
            raise ValueError('path waiting spot occupied')
        self.pending.append((member, cave))

    def resolve_next(self):
        if not self.pending:
            raise ValueError('no queued attempt')
        member, cave = self.pending.pop(0)
        result = self.attempt(member, cave)
        if self.remaining_attempts == 0:
            result['cancelled_pending_members'] = [m for m, _ in self.pending]
            self.pending.clear()
        return result

    def go(self):
        if self.departed or not self.passed:
            raise ValueError('GO requires at least one member through the caves')
        self.departed = True
        self.pending.clear()
        return {'passed_members': sorted(self.passed),
                'left_behind': sorted(set(range(len(self.party))) - set(self.passed)),
                'complete': len(self.passed) == len(self.party)}


class CaveOracle:
    def __init__(self):
        from native_oracle import NativeOracle
        self.machine = m = NativeOracle('logical-journey')
        self.party = m.alloc(68)
        self.entity = m.alloc(512)
        self.first_rejection = m.alloc(2)
        self.heap_start = m.next_alloc
        m.hook(0x44a920, lambda m: self.party)
        m.hook(0x476e50, lambda m: m.alloc(m.arg(0)), pop=4)
        m.hook(0x476de0, lambda m: 0, pop=4)
        m.hook(0x457ed0, lambda m: 0)
        m.hook(0x450c89, lambda m: 0)
        m.hook(0x450c0c, lambda m: 0)
        m.write_u16(0x48bc28, 0)

    def generate(self, party, level, state, previous_unique_rule=0, previous_unique_count=0):
        m = self.machine
        m.next_alloc = self.heap_start
        m.write(self.party, struct.pack('<HH', len(party), 0) + bytes(v for z in party for v in z))
        m.write(0x4a2c48, bytes(30))
        m.write_u32(0x4959d0, state)
        m.write_u32(0x4a21d0, previous_unique_rule)
        m.write_u16(0x4a21e0, previous_unique_count)
        m.call(GENERATORS[level], max_instructions=50000000, timeout_us=30000000)
        return {'native_rule_hex': m.read(0x4a2c48, 30).hex(), 'rng_exit': m.u32(0x4959d0)}

    def validate(self, traits, rule_hex, cave):
        m = self.machine
        m.write(0x4a2c48, bytes.fromhex(rule_hex))
        m.write(self.entity + 0xc0, bytes(traits))
        m.write_u16(self.first_rejection, 999)
        rejected = m.call(0x452ca0, [0x4a2c48, cave, self.entity, self.first_rejection]) & 65535
        return rejected, m.u16(self.first_rejection)

    def fixed_axis_override(self, rejection, level, cave, fixed):
        from unicorn.x86_const import UC_X86_REG_EDX, UC_X86_REG_EBX
        m = self.machine
        m.write_u16(0x4a2b6a, level)
        m.write_u16(0x4a2c20, fixed)
        local = m.STACK + m.STACK_SIZE - 0x1000 + 0x10
        m.write_u32(local, rejection)
        m.call(0x45119c, registers={UC_X86_REG_EDX: rejection, UC_X86_REG_EBX: cave}, stop_at=0x4511d5)
        return m.u16(local)

    def consume_rejection(self, remaining, rejected):
        m = self.machine
        m.write_u16(0x4a2b68, remaining)
        m.write_u16(0x4a2b94, rejected)
        m.call(0x450bf1)
        return m.u16(0x4a2b68)

    def initialize(self, state, clear_prior, previous_rule, previous_count):
        m = self.machine
        m.write_u32(0x4959d0, state)
        m.write_u16(0x4a2188, clear_prior)
        m.write_u32(0x4a21d0, previous_rule)
        m.write_u16(0x4a21e0, previous_count)
        m.call(0x4505b0)
        return {'fixed_axis': m.u16(0x4a2c20), 'rng_exit': m.u32(0x4959d0),
                'previous_rule': m.u32(0x4a21d0), 'previous_count': m.u16(0x4a21e0)}


def validate_native():
    from test_logical_bridge_generator import logical_bridge_test_parties
    oracle = CaveOracle()
    fixtures = [p for p in logical_bridge_test_parties() if len(p['party']) in (1, 4, 16)]
    checks = Counter()
    witnesses = []
    for fixture in fixtures:
        for level in range(4):
            for seed in (0, 1, 0x12345678, 0xffffffff):
                model = generate(fixture['party'], level, seed)
                native = oracle.generate(fixture['party'], level, seed)
                for key, value in native.items():
                    assert model[key] == value, (fixture['name'], level, seed, key, model[key], value)
                checks['native_generator_cases'] += 1
                for traits in fixture['party']:
                    for cave in (1, 2, 3, 4, 0, -1, 65538):
                        actual = oracle.validate(traits, model['native_rule_hex'], cave)
                        expected = validate(traits, model['rules'], cave)
                        assert actual == expected, (fixture['name'], level, seed, traits, cave, model['rules'], actual, expected)
                        checks['native_validator_cases'] += 1
                if seed == 0:
                    witnesses.append({'fixture': fixture, 'model': model, 'native': native})
    # Previous uniquely-selected cliff count influences only easiest cave generator.
    for fixture in fixtures:
        for count in (1, 4, 8, 12):
            try:
                model = generate(fixture['party'], 0, 0xabc123, 1, count)
            except ValueError:
                continue
            native = oracle.generate(fixture['party'], 0, 0xabc123, 1, count)
            assert all(model[k] == v for k, v in native.items())
            checks['previous_cliff_history_cases'] += 1
    report = {'source_sha256': SOURCE_SHA256, 'status': 'passed', 'checks': dict(checks),
              'boundaries': ['Complete four native generator functions and complete validator0x452ca0.',
                             'Party getter and allocator/free stubs only; unmodified native RNG.',
                             'Initialized RNG state supplied, lazy wall-clock seeding disabled; rule storage cleared.',
                             'UI, audio scheduling, difficulty progression, and full animation state machine excluded.'],
              'failures': []}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'native-validation.json').write_text(json.dumps(report, indent=2) + '\n')
    (OUT / 'native-witnesses.json').write_text(json.dumps(witnesses, indent=2) + '\n')
    print(json.dumps(report, indent=2))


def validate_native_state():
    oracle = CaveOracle()
    checks = Counter()
    for level, cave, rejection, fixed in itertools.product(range(4), range(1, 5), range(2), range(2)):
        actual = oracle.fixed_axis_override(rejection, level, cave, fixed)
        expected = rejection or (level == 0 and cave in ((1, 4) if fixed else (2, 3)))
        assert actual == expected, (level, cave, rejection, fixed, actual, expected)
        checks['native_fixed_axis_override_cases'] += 1
    for remaining, rejected in itertools.product(range(1, 23), range(2)):
        assert oracle.consume_rejection(remaining, rejected) == remaining - rejected
        checks['native_rejection_budget_cases'] += 1
    for state, clear in itertools.product((0, 1, 0xffffffff, 0x12345678), range(2)):
        result = oracle.initialize(state, clear, 0x30000, 4)
        exit_state, fixed = logical_journey_random(state, 1)
        assert result == {'fixed_axis': fixed, 'rng_exit': exit_state,
                          'previous_rule': 0 if clear else 0x30000,
                          'previous_count': 0 if clear else 4}
        checks['native_initialization_cases'] += 1
    report = {'status': 'passed', 'source_sha256': SOURCE_SHA256, 'checks': dict(checks),
              'boundaries': ['Fixed-axis modifier0x45119c..0x4511d5; result flag supplied.',
                             'Attempt counter0x450bf1..0x450c0c; branches stopped before animation scheduling.',
                             'Reset0x4505b0 with resource reset stub0x457ed0; original memset and RNG execute.'],
              'failures': []}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'state-validation.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


def write_spec():
    from spec_lj_provenance import family_assets, source_evidence
    evidence = source_evidence(OUT, [
        ('reset', 0x4505b0, 0x45071e), ('difficulty-parameters', 0x4500d9, 0x45011d),
        ('generator-level0', 0x452ec0, 0x453129), ('generator-level1', 0x453130, 0x45322c),
        ('generator-level2', 0x453230, 0x453867), ('generator-level3', 0x453870, 0x453a27),
        ('pair-selector', 0x453a30, 0x453e69), ('validator', 0x452ca0, 0x452eaa),
        ('fixed-axis-modifier', 0x45119c, 0x4511d5), ('attempt-counter', 0x450bf1, 0x450c0c),
        ('queue-append', 0x452440, 0x452470), ('departure-gate', 0x450f2e, 0x450fe5),
        ('closure-transition', 0x450c9c, 0x450cfa)])
    assets = family_assets('tunnels')
    assets['bindings'] = [
        {'role': 'four path entry markers, native slots1..4 left to right', 'tag': 'SCRB', 'ids': [5000, 5001, 5002, 5003], 'source': '0x4501ff..0x450235 and0x450333..0x450367'},
        {'role': 'guardian base poses indexed0..3', 'tag': 'SCRB', 'ids': [6000, 6001, 6002, 6003], 'source': '0x450390..0x4503ea'},
        {'role': 'guardian animated banks', 'tag': 'SCRB/SND', 'ranges': [[4000, 4699]], 'source': '0x450131..0x450142,0x450164..0x450170'},
        {'role': 'collapse actor and state animations', 'tag': 'SCRB/SND', 'ids': [7000, 7001], 'source': '0x450413..0x45043b,0x450d35..0x450d90'},
        {'role': 'help by UI level', 'archive': 'DATA/zoombini.mhk', 'tag': 'STRL', 'ids': [1800, 1820, 1840, 1860]}]
    validation = {name: json.loads((OUT / name).read_text()) for name in ('native-validation.json', 'state-validation.json')}
    descriptions = ('One variable single-feature predicate plus one fixed coordinate.',
                    'Two independently oriented single-feature predicates.',
                    'Two independently oriented predicates, each OR of two values of one attribute.',
                    'Two independently oriented predicates, each OR of one value from two different attributes.')
    spec = {
        'schema_version': 1, 'game': 'logical-journey', 'id': 'stone-cold-caves', 'name': 'Stone Cold Caves',
        'state': {'party': '1..16 four-byte native trait tuples, values1..5; identities remain distinct even for duplicate traits.',
                  'rules': '30-byte native record at0x4a2c48: u16axis_count; each14-byte axis begins withu16orientation,u8term_count,5attribute bytes,5value bytes,padding.',
                  'fixed_axis': 'u16at0x4a2c20; generated during reset for every difficulty, used only nativelevel0.',
                  'remaining_rejections': 'u16at0x4a2b68; initially16/18/20/22 bynativelevel0..3.',
                  'members': 'Waiting, pending passage, or passed; passed members cannot be tried again.',
                  'queue': 'Native0x452440 caps the attempt-record queue at5; current actor plus four path waiting spots. Logical API resolves ordered attempts atomically; full callback timing remains outside the model.'},
        'inputs': {'difficulty_native': [0, 1, 2, 3], 'difficulty_ui': [1, 2, 3, 4],
                   'rng': 'Initialized32-bit LCG state at the selected generator entry, not a wall-clock seed.',
                   'history': 'Previous cliff unique-rule word0x4a21d0 and count0x4a21e0; reset clears both when context flag0x4a2188 is nonzero.',
                   'actions': 'Member identity and native caveID1..4; IDs correspond to left-to-right path markers5000..5003.'},
        'actions': [
            {'id': 'attempt', 'precondition': 'Active session, remaining budget>0, member not already passed, path slot available.', 'effect': 'Resolve first guardian, then second. Pass removes member from remaining party; rejection returns member and consumes exactlyone rejection budget.'},
            {'id': 'queue_attempt', 'precondition': 'Same rules; vacant waiting path slot and fewer than5 queued records.', 'effect': 'Native code stores rule outcome in an ordered attempt record; presentation subsequently resolves it.'},
            {'id': 'reposition_waiting_member', 'effect': 'No trait or rule change; waiting-area pointer geometry is outside the logical model.'},
            {'id': 'go', 'precondition': 'At leastone member has passed; during closure the collapse must finish.', 'effect': 'Passed subset advances; remaining members do not advance with that subset. GO can be used before the full party passes.'}],
        'feedback': {'native_validator': 'Returns0 for accepted and1 for rejected; separate output is1 iff first guardian accepted.',
                     'bits': 'For each axis: matching=OR of its feature equalities; bit=matching XOR(orientation==0).',
                     'cave_target_bits': {'1': [1, 1], '2': [1, 0], '3': [0, 0], '4': [0, 1]},
                     'easy_override': 'Nativelevel0 validator tests first bit only; gameplay then rejects caves1/4 when fixed_axis=1, or caves2/3 whenfixed_axis=0. Thus every trait tuple still hasone accepted cave.',
                     'priority': 'First-guardian failure is revealed before the second; passing first but failing second identifies the latter as rejecting guard.',
                     'presentation': 'Speech and animation resource selection consumes additional shared RNG in callbacks; it is separated from generator-entry parity and retained as native source evidence.'},
        'success': {'full': 'Every incoming member has passed.', 'partial': 'GO with nonempty passed subset advances that subset.'},
        'failure': {'rejection': 'Consumesone shared rejection budget, no permanent removal of that member before closure.',
                    'terminal': 'Zero budget seals paths; waiting/pending members are returned to the waiting side and cannot make more attempts in this visit.',
                    'zero_passed': 'No member can advance; ordinary journey navigation/retry occurs outside this family contract.',
                    'not_timed': 'Idle time does not decrement the rejection budget.'},
        'difficulty_levels': [{'native': level, 'ui': level + 1, 'name': LEVEL_NAMES[level],
                               'rule_family': descriptions[level], 'single_axis_candidate_count': len(candidates(level)),
                               'ordered_candidate_pairs': None if level == 0 else len(candidates(level)) ** 2,
                               'initial_rejection_budget': ATTEMPT_LIMITS[level],
                               'generator_address': hex(GENERATORS[level])} for level in range(4)],
        'generation': {'status': 'native-parity-verified', 'implementation': 'tools/spec_lj_stone_cold_caves.py:generate',
                       'candidate_order': 'Reuse exact native enumeration from logical_bridge_generator:20single features;40same-attribute value pairs;150cross-attribute feature pairs. Values ascend and native attribute IDs descend.',
                       'easy_filter': 'If prior unique cliff history is nonzero and any positive single-feature count differs from that prior count, zero every count equal to that prior count. Then examine counts floor(n/2),floor(n/2)+1,floor(n/2)-1,floor(n/2),floor(n/2)-2,...; eligible counts1..15. Select rank among first eligible count bucket.',
                       'higher_filter': 'Enumerate ordered pairs in row-major order, excluding equal candidate indices. Count party members in the four Boolean combinations. Maximize the number of nonempty combinations, then minimize the sum of six absolute pairwise count differences. Chooseone rank among exact ties.',
                       'rng_order': ['Reset0x4505b0 drawsrange[0,1] into fixed_axis, even on higher difficulties.', 'At core generator entry, drawrange[1,tie_count]. Singleton ranks do not advance the LCG.', 'Drawrange[0,1] for first axis orientation.', 'For nativelevels1..3 drawrange[0,1] for second axis orientation.'],
                       'rng_formula': 'state=(214013*state+2531011)mod2^32; bounded(max)=(state>>16)%(u16(max)+1). max0 returns0 without advancement.',
                       'solvability': 'Complementary coordinate rules give each valid trait tuple exactlyone accepted cave after easiest-level fixed-axis handling. Higher levels maximize occupied caves but do not require allfour when the party cannot populate them.',
                       'entry_boundary': 'Reset draw and core generator can be separated by engine initialization. Core parity accepts actual initialized state at generator entry, avoiding a claim that presentation RNG consumption has been reproduced.',
                       'unsupported_input': 'Model raises explicitly if the native easiest-level count search would never find an eligible count; arbitrary invalid parties are not silently repaired.'},
        'assets': assets, 'evidence': evidence, 'validation': validation,
        'open_questions': [{'area': 'presentation runtime', 'question': 'Exact pointer geometry, animation/audio callback timing and queue edit timing are preserved in native code but not reimplemented.', 'blocks_logical_rules_or_generation': False},
                           {'area': 'journey framework', 'question': 'Global checkpoint progression, zero-survivor navigation and mode/difficulty advancement are shared-game behavior outside this family specification.', 'blocks_logical_rules_or_generation': False}],
        'completeness': {'logical_rules': True, 'all_four_difficulties': True, 'procedural_generation': True,
                         'acceptance_and_feedback_priority': True, 'rejection_limits': True,
                         'semantic_state_model': 'Settled-action model plus ordered-queue projection; native callback scheduling is not claimed.',
                         'native_player_or_renderer': False}}
    path = ROOT / 'local/specs/logical-journey/stone-cold-caves.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(spec, indent=2) + '\n')
    print(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--validate-native', action='store_true')
    parser.add_argument('--validate-state', action='store_true')
    parser.add_argument('--write-spec', action='store_true')
    parser.add_argument('--party', type=Path)
    parser.add_argument('--difficulty', type=int, choices=range(4), default=0)
    parser.add_argument('--state', type=lambda x: int(x, 0), default=0)
    args = parser.parse_args()
    if args.validate_native:
        validate_native()
    elif args.validate_state:
        validate_native_state()
    elif args.write_spec:
        write_spec()
    elif args.party:
        print(json.dumps(generate(json.loads(args.party.read_text()), args.difficulty, args.state), indent=2))
    else:
        parser.error('supply --party or --validate-native')


if __name__ == '__main__':
    main()
