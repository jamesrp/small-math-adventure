#!/usr/bin/env python3
"""Beetle Bug Alley generator reconstruction and isolated native parity checks.

All states are tuples mapping bead identity to its current position. Raw move
triples retain their on-disc order. Never replace the scramble with the gameplay
permutation: the original deliberately or accidentally uses different routines.
"""
import argparse
from collections import Counter, defaultdict, deque
from functools import lru_cache
import hashlib
import itertools
import json
import math
from pathlib import Path
import struct

from mountain_rescue import mountain_rand, mountain_ztl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'local/discs/mountain-rescue/Data/Bmp/magic_wall/DEFAULT.ZTL'
OUTPUT = ROOT / 'local/analysis/mountain-rescue'
TABLE_SHA = '951d5f5358feb8e85fd72e4c74a1ff820d2407ff1ba89e9aceced9692727fa35'
EXE_SHA = '1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa'


def mountain_provenance():
    addresses = {'weighted_record_selection': 0x440210, 'variant_build_and_reversal': 0x4402f0,
        'selected_record_setup': 0x4405e0, 'sequential_scramble': 0x440690,
        'candidate_checker': 0x4407c0, 'depth_first_search': 0x4408e0,
        'full_generator': 0x440ab0, 'actual_gameplay_move': 0x440f20,
        'solver_move': 0x4411a0, 'level_progression': 0x425239, 'random': 0x46c7c0,
        'all_matched_lamps': 0x41c5f0, 'door_predicate': 0x41cb20,
        'lever_batch': 0x41cbd0, 'lever_callback': 0x41d0b0, 'round_update': 0x41ba90}
    return {'table_source': 'local/discs/mountain-rescue/Data/Bmp/magic_wall/DEFAULT.ZTL',
        'table_sha256': TABLE_SHA,
        'executable_source': 'local/discs/mountain-rescue/INSTALL/HD/zoombini2.exe',
        'executable_sha256': EXE_SHA,
        'functions': {name: {'va': hex(va), 'file_offset': va - 0x400000} for name, va in addresses.items()},
        'table_offsets': 'Every selected record carries its byte offset within DEFAULT.ZTL; full triple offsets retained in original derived table.'}


def mountain_records():
    raw = SOURCE.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == TABLE_SHA
    return mountain_ztl(raw)['records']


class MountainRandom:
    def __init__(self, state):
        self.state = state & 0xffffffff
        self.trace = []

    def draw(self, modulus, purpose):
        self.state, value = mountain_rand(self.state)
        result = value % modulus
        self.trace.append({'purpose': purpose, 'state': self.state, 'rand': value,
                           'modulus': modulus, 'result': result})
        return result


def mountain_select(records, category, rng):
    choices = [r['index'] for r in records if r['category'] == category
               for _ in range(r['selection_weight'])]
    if not choices:
        raise ValueError('No positively weighted layouts for category')
    return records[choices[rng.draw(len(choices), 'layout')]]


def mountain_build_moves(record, rng):
    moves, variants = [], []
    for pool in record['move_variant_pools']:
        i = rng.draw(len(pool['variants']), f'variant:{pool["pool_index"]}')
        variants.append(i)
        selected = pool['variants'][i]['moves']
        # The native builder ignores a selected list whose first triple is null.
        if selected and selected[0]['transfers']:
            moves.extend(tuple(tuple(t['raw']) for t in move['transfers'])
                         for move in selected)
    reversed_moves = []
    for i, move in enumerate(moves):
        reverse = rng.draw(3, f'reverse:{i}') == 0
        reversed_moves.append(reverse)
        if reverse:
            moves[i] = tuple((b, a, flag) for a, b, flag in move)
    return tuple(moves), variants, reversed_moves


def mountain_game_move(state, move):
    """VA4411a0 on a valid permutation: each bead is transferred at most once."""
    result, marked = list(state), [False] * len(state)
    for a, b, flag in move:
        ai = [i for i, p in enumerate(result) if p == a and not marked[i]]
        if not ai:
            raise ValueError('Invalid transfer sequence: missing unmarked source')
        for i in ai:
            marked[i] = True
        if flag:
            bi = [i for i, p in enumerate(result) if p == b and not marked[i]]
            if not bi:
                raise ValueError('Invalid transfer sequence: missing unmarked target')
            for i in bi:
                marked[i] = True
            result[bi[-1]] = a
        result[ai[-1]] = b
    return tuple(result)


def mountain_scramble_move(state, move):
    """VA440690 transfer loop: sequential writes, last matching bead wins.

    No marker guard. For directed cycles this can differ from a gameplay move.
    The shipped table's moves always provide a source at each transfer; raise on
    missing sources instead of modeling undefined native stack/register values.
    """
    result = list(state)
    for a, b, flag in move:
        ai = [i for i, p in enumerate(result) if p == a]
        bi = [i for i, p in enumerate(result) if p == b] if flag else []
        if not ai or (flag and not bi):
            raise ValueError('Native scramble would use a stale source index')
        result[ai[-1]] = b
        if flag:
            result[bi[-1]] = a
    return tuple(result)


def mountain_scramble(n, moves, rng, attempt):
    length = rng.draw(7, f'scramble:{attempt}:length')
    while length < 4:
        length = rng.draw(7, f'scramble:{attempt}:length')
    state, sequence = tuple(range(n)), []
    for step in range(length):
        i = rng.draw(len(moves), f'scramble:{attempt}:move:{step}')
        sequence.append(i)
        state = mountain_scramble_move(state, moves[i])
    return state, sequence


def mountain_checker(state, moves):
    """VA4407c0/4408e0 result and first DFS witness depth (not shortest).

    Memoization eliminates repeated equivalent subtrees without changing the
    move-order-first result or depth. 0=no solution <=6; 1=already solved;
    2=found solution. A failed nontrivial root leaves native depth output 1.
    """
    identity = tuple(range(len(state)))
    if state == identity:
        return 1, 0, ()
    permutations = [mountain_game_move(identity, m) for m in moves]

    @lru_cache(None)
    def search(current, depth):
        for i, permutation in enumerate(permutations):
            nxt = tuple(permutation[x] for x in current)
            if nxt == identity:
                return (i,)
            if depth <= 4:
                tail = search(nxt, depth + 1)
                if tail is not None:
                    return (i,) + tail
        return None

    path = search(tuple(state), 0)
    return (2, len(path), path) if path is not None else (0, 1, None)


def mountain_generate(category, seed, records=None):
    """Pure reconstruction of VA440ab0, given RNG state at function entry."""
    records = records or mountain_records()
    rng = MountainRandom(seed)
    record = mountain_select(records, category, rng)
    moves, variants, reversed_moves = mountain_build_moves(record, rng)
    saved, attempts = None, []
    for attempt in range(6):
        state, sequence = mountain_scramble(record['point_count'], moves, rng, attempt)
        code, depth, witness = mountain_checker(state, moves)
        attempts.append({'state': state, 'scramble_move_indices': sequence,
                         'checker_code': code, 'checker_depth': depth,
                         'checker_witness': witness})
        if code == 0 or (code == 2 and depth >= 0):
            saved = state
        if code == 0:
            break
    final = state if saved is None else saved
    return {'category': category, 'seed_at_generator_entry': seed & 0xffffffff,
            'record_index': record['index'], 'record_source_offset': record['source_offset'],
            'point_count': record['point_count'], 'points': record['points'],
            'variant_indices': variants, 'reversed_moves': reversed_moves, 'moves': moves,
            'state': final, 'attempts': attempts, 'fallback': saved is None,
            'rng_final_state': rng.state, 'rng_calls': len(rng.trace), 'rng_trace': rng.trace}


def mountain_native_records(machine, records):
    """Marshal decoded records into the pointer structures read by native code."""
    def linked(payloads, size, next_offset, prev_offset):
        nodes = [machine.alloc(size, p) for p in payloads]
        for i, address in enumerate(nodes):
            machine.write_u32(address + next_offset, nodes[i + 1] if i + 1 < len(nodes) else 0)
            machine.write_u32(address + prev_offset, nodes[i - 1] if i else 0)
        return nodes[0] if nodes else 0

    def moves(moves):
        payloads = []
        for move in moves:
            triples = linked([struct.pack('<HHH', *t['raw']) for t in move['transfers']], 16, 8, 12)
            payloads.append(struct.pack('<I', triples))
        return linked(payloads, 12, 4, 8)

    base = machine.alloc(24 * len(records))
    for i, record in enumerate(records):
        address = base + i * 24
        machine.write(address, struct.pack('<HHH', record['category'], record['selection_weight'], record['point_count']))
        machine.write_u32(address + 8, machine.alloc(4 * record['point_count'],
            b''.join(struct.pack('<HH', *p) for p in record['points'])))
        for j, pool in enumerate(record['move_variant_pools']):
            variants = linked([struct.pack('<I', moves(v['moves'])) for v in pool['variants']], 12, 4, 8)
            machine.write_u32(address + 12 + j * 4, variants)
    return base


def mountain_native_moves(machine, obj):
    result = []
    node = machine.u32(machine.u32(obj + 0x14))
    while node:
        transfers, triple = [], machine.u32(node)
        while triple:
            transfers.append(struct.unpack('<HHH', machine.read(triple, 6)))
            triple = machine.u32(triple + 8)
        result.append(tuple(transfers))
        node = machine.u32(node + 4)
    return tuple(result)


def mountain_native_setup(records):
    from native_oracle import NativeOracle
    machine = NativeOracle('mountain-rescue')
    thread = machine.alloc(256)
    machine.hook(0x46ec98, lambda m: thread)
    sizes, free = {}, defaultdict(list)

    def allocate(m):
        size = m.arg(0)
        address = free[size].pop() if free[size] else m.alloc(size)
        sizes[address] = size
        return address

    def release(m):
        address = m.arg(0)
        if address in sizes:
            free[sizes.pop(address)].append(address)
        return 0

    machine.hook(0x46cbda, allocate)
    machine.hook(0x46c7a8, release)
    obj = machine.alloc(0x38)
    machine.write_u16(obj, len(records))
    machine.write_u32(obj + 4, mountain_native_records(machine, records))
    return machine, obj, thread


def mountain_native_validate(seeds=range(10), categories=range(1, 5)):
    from unicorn import UC_HOOK_CODE
    from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_ESP
    records, cases = mountain_records(), []
    machine, obj, thread = mountain_native_setup(records)
    native_random, native_attempts = [], []

    def random_return(uc, addr, size, data):
        native_random.append({'rand': machine.reg(UC_X86_REG_EAX), 'state': machine.u32(thread + 0x14)})

    def checked(uc, addr, size, data):
        n, state = machine.u16(obj + 0xc), machine.u32(obj + 0x20)
        native_attempts.append({'state': tuple(machine.u32(state + i * 12 + 4) for i in range(n)),
            'checker_code': machine.reg(UC_X86_REG_EAX),
            'checker_depth': machine.u32(machine.reg(UC_X86_REG_ESP) + 0x18),
            'scramble_length': machine.u32(obj + 0x34)})

    # PRNG ret and instruction immediately after bounded checker return.
    machine.uc.hook_add(UC_HOOK_CODE, random_return, begin=0x46c7e1, end=0x46c7e1)
    machine.uc.hook_add(UC_HOOK_CODE, checked, begin=0x440b4b, end=0x440b4b)
    for category, seed in itertools.product(categories, seeds):
        expected = mountain_generate(category, seed, records)
        native_random.clear()
        native_attempts.clear()
        machine.write_u32(thread + 0x14, seed)
        machine.call(0x440ab0, [category], ecx=obj, max_instructions=250_000_000, timeout_us=30_000_000)
        native_moves = mountain_native_moves(machine, obj)
        n, state = machine.u16(obj + 0xc), machine.u32(obj + 0x20)
        native_state = tuple(machine.u32(state + i * 12 + 4) for i in range(n))
        assert native_moves == expected['moves'], ('moves', category, seed, native_moves, expected['moves'])
        assert native_state == expected['state'], ('state', category, seed, native_state, expected['state'])
        assert machine.u32(thread + 0x14) == expected['rng_final_state'], ('RNG state', category, seed)
        assert native_random == [{k: t[k] for k in ('rand', 'state')} for t in expected['rng_trace']], ('RNG trace', category, seed)
        assert native_attempts == [{'state': a['state'], 'checker_code': a['checker_code'],
             'checker_depth': a['checker_depth'], 'scramble_length': len(a['scramble_move_indices'])}
             for a in expected['attempts']], ('attempts', category, seed, native_attempts, expected['attempts'])
        # Independently check the routine the actual scene calls, not only the
        # solver's equivalent evaluator. Restore state before each button.
        for i, move in enumerate(native_moves):
            for j, position in enumerate(native_state):
                machine.write_u32(state + j * 12 + 4, position)
            machine.call(0x440f20, [i], ecx=obj)
            moved = tuple(machine.u32(state + j * 12 + 4) for j in range(n))
            assert moved == mountain_game_move(native_state, move), ('gameplay move', category, seed, i)
        cases.append({'category': category, 'seed': seed, 'record_index': expected['record_index'],
                      'attempts': len(native_attempts), 'rng_calls': expected['rng_calls'],
                      'state': native_state, 'rng_final_state': expected['rng_final_state'],
                      'gameplay_move_checks': len(native_moves)})
    return {'status': 'passed', 'native_function': '0x440ab0', 'cases': cases,
            'case_count': len(cases), 'source_sha256': machine.sha256, 'table_sha256': TABLE_SHA,
            'compared': ['complete ordered move triples', 'final state', 'final RNG state',
                         'every RNG return and state', 'attempt states', 'checker return codes/depth', 'scramble lengths'],
            'boundaries': ['Original machine code for selection, move construction, scrambling, checker and retries.',
                'Input records marshaled from byte-exact ZTL decode; native file reader not invoked.',
                'Allocator/free replaced with isolated memory; CRT thread accessor supplies isolated RNG state.',
                'Seed is RNG state at generator entry, not a claim about full-session seed or call history.']}


def mountain_native_move_validate():
    """Exercise original scene move function on every distinct shipped move."""
    from native_oracle import NativeOracle
    machine = NativeOracle('mountain-rescue')
    records = mountain_records()
    move_set = {(r['point_count'], tuple(tuple(t['raw']) for t in m['transfers']))
                for r in records for p in r['move_variant_pools'] for v in p['variants']
                for m in v['moves'] if m['transfers']}
    move_set |= {(n, tuple((b, a, f) for a, b, f in move)) for n, move in move_set.copy()}
    cases = 0
    for n, move in sorted(move_set):
        obj, state = machine.alloc(0x38), machine.alloc(n * 12)
        machine.write_u16(obj + 0xc, n)
        machine.write_u32(obj + 0x20, state)
        triples = [machine.alloc(16, struct.pack('<HHH', *t)) for t in move]
        for i, address in enumerate(triples):
            machine.write_u32(address + 8, triples[i + 1] if i + 1 < len(triples) else 0)
        node = machine.alloc(12, struct.pack('<I', triples[0]))
        wrapper = machine.alloc(12, struct.pack('<I', node))
        machine.write_u32(obj + 0x14, wrapper)
        # Ascending, descending and deterministic swaps cover bead-order effects.
        states = [tuple(range(n)), tuple(reversed(range(n)))]
        rng = MountainRandom(n)
        current = list(range(n))
        for i in range(18):
            a, b = rng.draw(n, 'a'), rng.draw(n, 'b')
            current[a], current[b] = current[b], current[a]
            states.append(tuple(current))
        for candidate in states:
            for i, position in enumerate(candidate):
                machine.write(state + 12 * i, struct.pack('<III', i, position, 123))
            machine.call(0x440f20, [0], ecx=obj)
            output = tuple(machine.u32(state + 12 * i + 4) for i in range(n))
            assert output == mountain_game_move(candidate, move), (n, move, candidate, output)
            cases += 1
    return {'status': 'passed', 'function_va': '0x440f20', 'unique_moves_including_reversals': len(move_set),
        'case_count': cases, 'states_per_move': 20,
        'boundaries': 'Every unique raw move and reverse across all four table categories; valid permutations only. No function stubs required.',
        'provenance': mountain_provenance()}


def mountain_native_fallback_validate():
    """A synthetic valid 2-point record forces the six-solved-candidate branch."""
    record = {'index': 0, 'source_offset': None, 'category': 1, 'selection_weight': 1,
        'point_count': 2, 'points': [[0, 0], [1, 0]], 'move_variant_pools': [
            {'pool_index': i, 'variants': [{'moves': [{'transfers':
                [{'raw': [0, 1, 1]}] if i == 0 else []}]}]} for i in range(3)]}
    expected = mountain_generate(1, 0, [record])
    machine, obj, thread = mountain_native_setup([record])
    machine.write_u32(thread + 0x14, 0)
    machine.call(0x440ab0, [1], ecx=obj)
    state = machine.u32(obj + 0x20)
    native_state = tuple(machine.u32(state + i * 12 + 4) for i in range(2))
    assert expected['fallback'] and native_state == expected['state'] == (0, 1)
    assert machine.u32(thread + 0x14) == expected['rng_final_state']
    return {'status': 'passed', 'case_count': 1, 'synthetic_record': record,
        'seed': 0, 'state': native_state, 'rng_final_state': expected['rng_final_state'],
        'rng_calls': expected['rng_calls'], 'expected_attempts': expected['attempts'],
        'boundary': 'Original full generator with one synthetic two-point record. Final state and RNG state compared; sample is a branch test, not a shipped layout.',
        'provenance': mountain_provenance()}


def mountain_permutation(move, n):
    permutation = mountain_game_move(tuple(range(n)), move)
    assert sorted(permutation) == list(range(n))
    return bytes(permutation)


def mountain_inverse(permutation):
    result = bytearray(len(permutation))
    for i, j in enumerate(permutation):
        result[j] = i
    return bytes(result)


def mountain_cycles(permutation):
    unseen, cycles = set(range(len(permutation))), []
    while unseen:
        i = min(unseen)
        cycle = []
        while i in unseen:
            unseen.remove(i)
            cycle.append(i)
            i = permutation[i]
        if len(cycle) > 1:
            cycles.append(cycle)
    return cycles


def mountain_distance_map(permutations):
    """Exhaustive reverse BFS: exact shortest legal move count to identity.

    Reverse edges use inverse permutations solely for analysis; they do not add
    inverses to the player's buttons. Dictionary domain is the reachable group.
    bytes.translate implements p[state[i]] for every bead in C.
    """
    n = len(permutations[0])
    tables = [bytes.maketrans(bytes(range(n)), mountain_inverse(p))
              for p in sorted(set(permutations))]
    identity = bytes(range(n))
    distances, frontier = {identity: 0}, [identity]
    depth = 0
    while frontier:
        depth += 1
        nxt = []
        for state in frontier:
            for table in tables:
                candidate = state.translate(table)
                if candidate not in distances:
                    distances[candidate] = depth
                    nxt.append(candidate)
        frontier = nxt
    return distances


def mountain_group_stats(permutations, distances):
    n, unseen, orbits = len(permutations[0]), set(range(len(permutations[0]))), []
    while unseen:
        orbit, pending = set(), [min(unseen)]
        while pending:
            i = pending.pop()
            if i not in orbit:
                orbit.add(i)
                pending.extend(p[i] for p in permutations)
        unseen -= orbit
        orbits.append(sorted(orbit))
    signs = [(-1) ** sum(len(c) - 1 for c in mountain_cycles(p)) for p in permutations]
    order = len(distances)
    two_blocks = None
    if n % 2 == 0 and len(orbits) == 1 and order < math.factorial(n):
        domain = set(range(n))
        for rest in itertools.combinations(range(1, n), n // 2 - 1):
            block = {0, *rest}
            complement = domain - block
            if all({p[i] for i in block} in (block, complement) for p in permutations):
                two_blocks = [sorted(block), sorted(complement)]
                break
    if len(orbits) == 1 and order == math.factorial(n):
        classification = f'S{n} (all permutations)'
    elif len(orbits) == 1 and order == math.factorial(n) // 2 and set(signs) == {1}:
        classification = f'A{n} (even permutations)'
    elif order == math.prod(math.factorial(len(o)) for o in orbits):
        classification = 'independent full symmetric groups on the listed orbits'
    elif two_blocks and order == 2 * math.factorial(n // 2) ** 2:
        classification = f'S{n // 2} wreath S2 (arbitrary permutations within two blocks, and swapping blocks)'
    else:
        classification = 'proper subgroup; exact order and orbits given'
    return {'group_order': order, 'orbits': orbits, 'two_block_system': two_blocks, 'classification': classification,
            'generator_cycle_types': [[len(c) for c in mountain_cycles(p)] for p in permutations],
            'generator_signs': signs, 'directed_diameter': max(distances.values()),
            'distance_histogram': dict(sorted(Counter(distances.values()).items())),
            'mean_uniform_reachable_state_distance': sum(distances.values()) / order}


def mountain_witness(state, permutations, distances):
    state = bytes(state)
    if state not in distances:
        return None
    result = []
    tables = [bytes.maketrans(bytes(range(len(p))), p) for p in permutations]
    while distances[state]:
        for i, table in enumerate(tables):
            nxt = state.translate(table)
            if distances.get(nxt) == distances[state] - 1:
                result.append(i)
                state = nxt
                break
        else:
            raise AssertionError('BFS distance has no legal decreasing edge')
    return result


def mountain_objective_notes():
    return {
        'objective': 'All-bead restoration: every bead identity equals its current position (identity permutation). This opens all four doors in the same lever batch. Partial-door rescue is a separate objective.',
        'distance': 'Complete reverse BFS to the identity/all-bead restoration target. shortest_solution_length and shortest_witness retain legacy field names but mean minimum button presses to identity, not minimum to any partial rescue.',
        'unreachable': 'Identity is absent from the generated state reachable component, proved by exhaustive permutation-group enumeration. Does not mean no door can open or no characters can escape.',
        'native_goal': '0x41c658..0x41c6f1 compares identity/current_position directly and counts all matches; no color equivalence. 0x41cb20 tests door d at indices d,d+4,d+8, ignoring unused slots.',
        'native_round_transition': '0x41cbd0 tests all four doors against one board, disables move buttons; 0x41d1a9 schedules first-round replacement and 0x41bd27 regenerates via0x41d310. Partial rescues cannot accumulate different door subsets on the same board.'}


def mountain_door_mask(state):
    return sum(1 << d for d in range(4)
               if all(state[i] == i for i in range(d, len(state), 4)))


def mountain_goal_analysis():
    """Exact partial-door objectives for the native-confirmed odd example."""
    result = mountain_generate(2, 1788458156)
    permutations = [mountain_permutation(m, result['point_count']) for m in result['moves']]
    tables = [bytes.maketrans(bytes(range(len(p))), p) for p in permutations]
    start = bytes(result['state'])
    paths, queue = {start: ()}, deque([start])
    mask_examples, histogram = {}, Counter()
    while queue:
        state = queue.popleft()
        mask = mountain_door_mask(state)
        histogram[mask] += 1
        if mask not in mask_examples:
            mask_examples[mask] = {'state': tuple(state), 'open_doors_zero_based': [d for d in range(4) if mask & (1 << d)],
                                   'shortest_button_sequence': paths[state], 'length': len(paths[state])}
        for i, table in enumerate(tables):
            nxt = state.translate(table)
            if nxt not in paths:
                paths[nxt] = paths[state] + (i,)
                queue.append(nxt)
    best = max(mask.bit_count() for mask in histogram)
    best_example = min((x for mask, x in mask_examples.items() if mask.bit_count() == best), key=lambda x: x['length'])
    return {'status': 'exact_static_goal_and_exhaustive_graph_analysis', 'seed': 1788458156,
            'category': 2, 'record_index': 10, 'initial_state': result['state'], 'moves': result['moves'],
            'objective_notes': mountain_objective_notes(), 'reachable_state_count': len(paths),
            'initial_open_door_mask': mountain_door_mask(start), 'max_simultaneous_open_doors': best,
            'shortest_maximum_door_example': best_example,
            'door_mask_histogram': dict(sorted(histogram.items())), 'shortest_example_per_mask': mask_examples,
            'boundary': 'Door predicates and batch transition statically traced in original code. Graph computation uses native-validated button operations. No scene UI or departure animations emulated.'}


def mountain_difficulty(sample_count=100):
    records = mountain_records()
    variant_results = []
    for record in records:
        if record['category'] > 3 or not record['selection_weight']:
            continue
        pools = record['move_variant_pools']
        for indices in itertools.product(*(range(len(p['variants'])) for p in pools)):
            moves = []
            for p, i in zip(pools, indices):
                selected = p['variants'][i]['moves']
                if selected and selected[0]['transfers']:
                    moves.extend(tuple(tuple(t['raw']) for t in m['transfers']) for m in selected)
            permutations = tuple(mountain_permutation(m, record['point_count']) for m in moves)
            distances = mountain_distance_map(permutations)
            stats = mountain_group_stats(permutations, distances)
            variant_results.append({'category': record['category'], 'record_index': record['index'],
                'record_source_offset': record['source_offset'], 'variant_indices': indices,
                'point_count': record['point_count'], 'move_count': len(moves), **stats})
    # Cache only a few complete graphs. Each map may hold up to 9! states.
    @lru_cache(6)
    def graph(permutations):
        return mountain_distance_map(permutations)

    sample_results, examples = [], {}
    seeds = [0, 1, 2, 0x7fffffff, 0xffffffff]
    seeds.extend(((i + 1) * 0x9e3779b9) & 0xffffffff for i in range(max(0, sample_count - len(seeds))))
    seeds = seeds[:sample_count]
    for category, seed in itertools.product(range(1, 4), seeds):
        generated = mountain_generate(category, seed, records)
        permutations = tuple(mountain_permutation(m, generated['point_count']) for m in generated['moves'])
        distances = graph(permutations)
        state = bytes(generated['state'])
        witness = mountain_witness(state, permutations, distances)
        row = {'category': category, 'seed': seed, 'record_index': generated['record_index'],
            'variant_indices': generated['variant_indices'], 'reversed_moves': generated['reversed_moves'],
            'point_count': generated['point_count'], 'move_count': len(permutations),
            'group_order': len(distances), 'state': generated['state'],
            'shortest_solution_length': None if witness is None else len(witness),
            'shortest_witness': witness, 'attempts': len(generated['attempts']),
            'rng_calls': generated['rng_calls'], 'fallback': generated['fallback'],
            'checker_code': generated['attempts'][-1]['checker_code'],
            'scramble_lengths': [len(a['scramble_move_indices']) for a in generated['attempts']],
            'scramble_differs_from_gameplay': any(
                mountain_scramble_move(tuple(range(generated['point_count'])), m) !=
                mountain_game_move(tuple(range(generated['point_count'])), m)
                for m in generated['moves'])}
        sample_results.append(row)
        key = f'category-{category}-' + ('unreachable' if witness is None else 'reachable')
        if key not in examples or (witness and len(witness) > examples[key].get('shortest_solution_length', -1)):
            examples[key] = {**generated, 'shortest_solution_length': row['shortest_solution_length'],
                'shortest_witness': witness, **mountain_group_stats(permutations, distances)}

    summaries = []
    for category in range(1, 4):
        rows = [r for r in sample_results if r['category'] == category]
        variants = [r for r in variant_results if r['category'] == category]
        lengths = [r['shortest_solution_length'] for r in rows if r['shortest_solution_length'] is not None]
        summaries.append({'category': category, 'sample_count': len(rows),
            'sample_reachable': len(lengths), 'sample_unreachable': len(rows) - len(lengths),
            'sample_solution_length_histogram': dict(sorted(Counter(lengths).items())),
            'sample_mean_reachable_solution_length': sum(lengths) / len(lengths) if lengths else None,
            'sample_max_reachable_solution_length': max(lengths) if lengths else None,
            'sample_fallback_count': sum(r['fallback'] for r in rows),
            'sample_record_coverage': sorted(set(r['record_index'] for r in rows)),
            'exhaustive_variant_combination_count': len(variants),
            'point_count_range': [min(v['point_count'] for v in variants), max(v['point_count'] for v in variants)],
            'move_count_range': [min(v['move_count'] for v in variants), max(v['move_count'] for v in variants)],
            'group_order_histogram_over_variant_combinations': dict(sorted(Counter(v['group_order'] for v in variants).items())),
            'unreversed_direction_diameter_range': [min(v['directed_diameter'] for v in variants), max(v['directed_diameter'] for v in variants)]})
    return {'table_sha256': TABLE_SHA, 'status': 'exact_graphs_and_deterministic_sample',
            'method': {**mountain_objective_notes(), 'variant_graphs': 'All positive-weight record/variant combinations in categories1..3, with raw on-disc move directions. Group order is invariant under optional move inversions; distances/diameter can change.',
              'sample': 'Full reconstructed generator at specified deterministic entry RNG states. Samples are not asserted uniformly random over outputs.',
              'witness': 'Shortest witnesses use only original forward move buttons, even though reverse edges build the distance map.'},
            'summaries': summaries, 'variant_graphs': variant_results, 'samples': sample_results,
            'examples': examples}


def mountain_main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--native-validate', action='store_true')
    parser.add_argument('--native-seeds', type=int, default=10)
    parser.add_argument('--native-moves', action='store_true')
    parser.add_argument('--native-fallback', action='store_true')
    parser.add_argument('--native-unreachable-proof', action='store_true')
    parser.add_argument('--goal-analysis', action='store_true')
    parser.add_argument('--difficulty', action='store_true')
    parser.add_argument('--samples', type=int, default=100)
    parser.add_argument('--seed', type=lambda v: int(v, 0), default=1)
    parser.add_argument('--category', type=int, default=1)
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if args.goal_analysis:
        result = mountain_goal_analysis()
        output = OUTPUT / 'beetle-goal-analysis.json'
    elif args.native_unreachable_proof:
        result = mountain_native_validate([1788458156], [2])
        output = OUTPUT / 'beetle-unreachable-native-proof.json'
    elif args.native_fallback:
        result = mountain_native_fallback_validate()
        output = OUTPUT / 'beetle-native-fallback.json'
    elif args.native_moves:
        result = mountain_native_move_validate()
        output = OUTPUT / 'beetle-native-moves.json'
    elif args.native_validate:
        seeds = [0, 1, 2, 0x7fffffff, 0xffffffff]
        seeds.extend(((i + 1) * 0x9e3779b9) & 0xffffffff for i in range(max(0, args.native_seeds - len(seeds))))
        result = mountain_native_validate(seeds[:args.native_seeds])
        output = OUTPUT / 'beetle-native-parity.json'
    elif args.difficulty:
        result = mountain_difficulty(args.samples)
        output = OUTPUT / 'beetle-difficulty.json'
    else:
        result = mountain_generate(args.category, args.seed)
        result.update(table_sha256=TABLE_SHA)
        output = OUTPUT / f'beetle-category-{args.category}-seed-{args.seed}.json'
    result['provenance'] = mountain_provenance()
    output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'output': str(output), 'status': result.get('status', 'generated'),
                      'case_count': result.get('case_count')}))


if __name__ == '__main__':
    mountain_main()
