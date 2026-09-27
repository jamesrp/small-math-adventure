#!/usr/bin/env python3
"""Pipes of Paloo recovered generators and water rules. No game process runs."""
import argparse
import json
import random
import struct
from pathlib import Path
from spec_mr_turtle_hurdle import Rand, guard, SHA, EXE, ROOT, trait_bytes

OUT = ROOT / 'local/analysis/mountain-rescue-pipes-of-paloo'

def authored_graph():
    guard()
    raw = EXE.read_bytes()[0x92ab8:0x92cb8]
    return [list(struct.unpack_from('<8i', raw, i * 32))[1:6] for i in range(16)]

def find_partner(party, parent, available, rng):
    """433230. Fourth distinct tested attribute is excluded even when equal."""
    if parent == -1:
        return None
    for candidate in range(len(party)):
        if candidate == parent or not available[candidate]:
            continue
        seen = set()
        while len(seen) < 4:
            axis = rng.next(4) + 1
            seen.add(axis)
            if len(seen) == 4:
                break
            if party[parent][axis - 1] == party[candidate][axis - 1]:
                available[parent] = available[candidate] = False
                return [candidate, parent, axis, party[parent][axis - 1]]
    return None

def match_pair(party, a, b, rng):
    """433a30. Unlike find_partner, equality wins on fourth distinct test."""
    seen = set()
    while len(seen) < 4:
        axis = rng.next(4) + 1
        seen.add(axis)
        if party[a][axis - 1] == party[b][axis - 1]:
            return axis, party[a][axis - 1]
    return None

def shuffled_axes(rng):
    axes = [1, 2, 3, 4]
    for _ in range(400):
        a, b = rng.next(4), rng.next(4)
        axes[a], axes[b] = axes[b], axes[a]
    return axes

def generate_pairs(party, rng):
    n = len(party)
    if n == 1:
        return {'records': [], 'attempts': 0}
    deferred, remaining, pairs = [], list(range(n)), []
    attempts = 0
    while len(pairs) != n // 2 and attempts < 9:
        attempts += 1
        remaining, pairs = list(range(n)), []
        while deferred:
            c = deferred.pop(0)
            remaining.remove(c)
            remaining.insert(0, c)
        while len(remaining) > 1:
            a = remaining[0]
            match = None
            for b in remaining[1:]:
                axes = shuffled_axes(rng)
                axis = next((x for x in axes if party[a][x - 1] == party[b][x - 1]), None)
                if axis is not None:
                    match = b, axis
                    break
            remaining.remove(a)
            if match is None:
                deferred.append(a)
            else:
                b, axis = match
                remaining.remove(b)
                pairs.append([b, a, axis, party[a][axis - 1]])
    remaining += deferred
    while remaining:
        a = remaining.pop(0)
        if remaining:
            remaining.pop(0)
        # a=255 suppresses label; uninitialized native axis/value are irrelevant.
        pairs.append([255, a, None, None])
    if pairs:
        a, b = rng.next(len(pairs)), rng.next(len(pairs))
        pairs[a], pairs[b] = pairs[b], pairs[a]
    return {'records': pairs, 'attempts': attempts}

def generate_pairs_legacy(party, rng):
    """Nondefault zoombini2.cfg switch at576a58; ten passes, no reordering."""
    for attempt in range(1, 11):
        available = [True] * len(party)
        pairs = []
        for a in range(len(party)):
            if sum(available) <= 1:
                break
            if not available[a]:
                continue
            b = next((i for i in range(len(party)) if i != a and available[i]), None)
            if b is None:
                continue
            seen = set()
            while len(seen) < 4:
                axis = rng.next(4) + 1
                seen.add(axis)
                if party[a][axis-1] == party[b][axis-1]:
                    if len(seen) != 4:
                        pairs.append([b, a, axis, party[a][axis-1]])
                        available[a] = available[b] = False
                    break
        if sum(available) <= 1:
            break
    if sum(available) == 1:
        pairs.append([-1, available.index(True), None, None])
    pairs += [[255, 255, None, None] for _ in range(8-len(pairs))]
    return {'records': pairs, 'attempts': attempt}


def generate_branches(party, rng):
    n = len(party)
    records = [[-1] * 4 for _ in range(20)]
    for attempt in range(1, 101):
        available = [True] * n
        root = rng.next(n)
        records[15][0] = root
        available[root] = False
        missing = processed = 0
        for row in (2, 1, 0):
            for col in range((n + 1) // 3):
                parent = root if row == 2 else records[(row + 1) * 5 + col][0]
                result = find_partner(party, parent, available, rng)
                records[row * 5 + col] = result or [-1] * 4
                missing += result is None
                processed += 1
                if processed == n:
                    break
            if processed == n:
                break
        if not missing:
            break
    return {'records': records, 'attempts': attempt, 'missing': missing}

def generate_tree_candidate(party, rng, mode='AX'):
    graph = authored_graph()
    nodes = [-1] * 16
    available = [True] * len(party)
    root = 0 if mode[0] == 'A' else rng.next(len(party))
    nodes[0], available[root] = root, False
    edges, forced = [], 0
    while any(available):
        found = False
        for candidate in range(len(party)):
            if not available[candidate]:
                continue
            for node, parent in enumerate(nodes):
                if parent < 0:
                    continue
                match = match_pair(party, candidate, parent, rng)
                if match is None:
                    continue
                seen = set()
                while len(seen) < 5:
                    j = rng.next(5)
                    seen.add(j)
                    neighbor = graph[node][j]
                    if neighbor >= 0 and nodes[neighbor] < 0:
                        nodes[neighbor], available[candidate] = candidate, False
                        edges.append([node, neighbor, *match])
                        found = True
                        break
                if found:
                    break
            if found:
                break
        if not found:
            while True:
                node = rng.next(16)
                if nodes[node] >= 0:
                    continue
                neighbor = next((x for x in graph[node] if x >= 0 and nodes[x] >= 0), None)
                if neighbor is not None:
                    break
            candidate = available.index(True)
            nodes[node], available[candidate] = candidate, False
            edges.append([node, neighbor, 111, 111])
            forced += 1
    return {'edges': edges, 'nodes': nodes, 'forced': forced}

def generate_tree(party, rng):
    counts = []
    for parent in range(len(party)):
        available = [True] * len(party)
        counts.append(sum(find_partner(party, parent, available, rng) is not None
                          for _ in party))
    order = sorted(range(len(party)), key=lambda i: counts[i])
    sorted_party = [party[i] for i in order]
    attempts = []
    for mode in ('AX', 'BY'):
        result = generate_tree_candidate(sorted_party, rng, mode)
        attempts.append({'mode': mode, 'forced': result['forced']})
        if not result['forced']:
            return dict(result, order=order, attempts=attempts, counts=counts)
    best = None
    for _ in range(10):
        result = generate_tree_candidate(sorted_party, rng, 'AY')
        attempts.append({'mode': 'AY', 'forced': result['forced']})
        if best is None or result['forced'] < best['forced']:
            best = result
    return dict(best, order=order, attempts=attempts, counts=counts,
                last_candidate_nodes=result['nodes'])

def generate(level, party, seed, scene_shuffle=True, legacy=False):
    if level not in (1, 2, 3):
        raise ValueError('Normal levels are 1, 2, 3')
    if not 1 <= len(party) <= 16:
        raise ValueError('1..16 characters required')
    rng = Rand(seed)
    order = []
    if scene_shuffle:
        while len(order) != len(party):
            i = rng.next(len(party))
            if i not in order:
                order.append(i)
    else:
        order = list(range(len(party)))
    data = ((generate_pairs_legacy if legacy else generate_pairs)([party[i] for i in order], rng) if level == 1 else
            generate_branches(party, rng) if level == 2 else
            generate_tree([party[i] for i in order], rng))
    return dict(data, level=level, legacy=legacy, party_size=len(party), shuffle_order=order,
                rng_state=rng.state, rng_trace=rng.trace)

def available_positions(config):
    n = config['party_size']
    if config['level'] == 1:
        return list(range(n))
    if config['level'] == 2:
        return ([15] + [x for i in range(5) for x in (i, i+5, i+10)])[:n]
    return sorted({x for e in config['edges'] for x in e[:2]} or {0})


class Board:
    def __init__(self, config, party):
        self.config, self.party = config, party
        self.slots = [None] * (len(party) if config['level'] == 1 else 16)
        self.committed = False

    def move(self, character, node=None):
        if self.committed:
            raise ValueError('Valve already committed this board')
        if not 0 <= character < len(self.party):
            raise ValueError('Character is not in the arriving party')
        if node is not None and (node not in available_positions(self.config) or self.slots[node] is not None):
            raise ValueError('Choose an empty available basin')
        if character in self.slots:
            self.slots[self.slots.index(character)] = None
        if node is not None:
            self.slots[node] = character
        return feedback(self.config, self.party, self.slots)

    def pull_valve(self):
        if self.committed:
            raise ValueError('Valve already committed this board')
        state = feedback(self.config, self.party, self.slots)
        if not state['valve_enabled']:
            return dict(state, committed=False)
        self.committed = True
        return dict(state, committed=True)


def connections(config):
    n, level = config['party_size'], config['level']
    if level == 1:
        return [[i, i + (n + 1) // 2, config['records'][n // 2 - 1 - i][2]]
                for i in range(n // 2)]
    if level == 2:
        return [[a, b, config['records'][r * 5 + c][2]]
                for a, b, r, c in ([(i, i + 5, 1, i) for i in range(5)] +
                                   [(i + 5, i + 10, 0, i) for i in range(5)] +
                                   [(15, i, 2, i) for i in range(5)])]
    return [e[:3] for e in config['edges']]

def feedback(config, party, slots, raw_character_bytes=None):
    """Stable blue-pipe/water flags; no claim that generated witness is unique."""
    edges = connections(config)
    def matches(a, b, axis):
        if slots[a] is None or slots[b] is None:
            return False
        if axis in (None, -1):
            return True
        if axis == 111:
            # Original code compares byte0x73, not one of the four trait bytes.
            if raw_character_bytes is None:
                return True  # Scene45d520 writes animation index33 at+0x70; byte0x73=0.
            return raw_character_bytes[slots[a]][0x73] == raw_character_bytes[slots[b]][0x73]
        return party[slots[a]][axis - 1] == party[slots[b]][axis - 1]
    matched = [matches(*e) for e in edges]
    reached = set()
    if config['level'] == 1:
        live = matched
        if config['party_size'] % 2:
            reached.add(config['party_size'] // 2)
    else:
        root = 15 if config['level'] == 2 else 0
        if config['level'] == 2 and slots[root] is not None:
            reached.add(root)
        changed = True
        root_component = {root}
        while changed:
            before = set(root_component)
            for (a, b, _), enabled in zip(edges, matched):
                if enabled and (a in root_component or b in root_component):
                    root_component.update((a, b))
            changed = before != root_component
        live = [ok and a in root_component and b in root_component
                for (a, b, _), ok in zip(edges, matched)]
    for (a, b, _), enabled in zip(edges, live):
        if enabled:
            reached.update((a, b))
    rescued = sorted(slots[i] for i in reached if slots[i] is not None)
    if config['level'] == 1 and config['party_size'] == 1:
        rescued = [0]  # 438560 marks sole character even before placement.
    return {'matched_edges': matched, 'water_edges': live, 'rescued': rescued,
            'stranded': [i for i in range(len(party)) if i not in rescued],
            'valve_enabled': bool(rescued) and any(s is not None for s in slots), 'complete': len(rescued) == len(party)}

class Harness:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_ECX
        self.m = m = NativeOracle('mountain-rescue')
        m.uc.mem_map(0, 0x1000)
        self.thread, self.scene, self.vector = m.alloc(256), m.alloc(0xbe60), m.alloc(16)
        self.pointers = m.alloc(64)
        self.chars = [m.alloc(0x9c) for _ in range(16)]
        self.scratch = m.alloc(2000)
        m.write_u32(0x4b2320, self.scene)
        m.hook(0x46ec98, lambda _: self.thread)
        for addr in (0x46cbda, 0x46cf20):
            m.hook(addr, lambda mm: mm.alloc(max(16, mm.arg(0))))
        for addr in (0x46c7a8, 0x46ccc1, 0x46cc6f):
            m.hook(addr, lambda _: 0)
        m.hook(0x45acd0, lambda mm: mm.reg(UC_X86_REG_ECX), pop=16)
        m.hook(0x45b830, lambda mm: mm.reg(UC_X86_REG_ECX), pop=4)
        m.hook(0x45ba20, lambda _: 0)
        self.trace = []
        m.uc.hook_add(UC_HOOK_CODE, lambda uc, a, s, _: self.trace.append(
            {'rand': m.reg(UC_X86_REG_EAX), 'state': m.u32(self.thread + 0x14)}),
            begin=0x46c7e1, end=0x46c7e1)
    def setup(self, party, seed):
        m = self.m
        self.trace.clear()
        m.write_u32(self.thread + 0x14, seed)
        for i, traits in enumerate(party):
            data = trait_bytes(traits)
            struct.pack_into('<I', data, 0, i)
            data[0x38] = 1
            m.write(self.chars[i], data)
        m.write(self.pointers, struct.pack('<' + 'I' * len(party), *self.chars[:len(party)]))
        m.write(self.vector, struct.pack('<4I', 0, self.pointers, self.pointers + len(party) * 4,
                                        self.pointers + len(party) * 4))
        m.write(0x4e4910, m.read(self.vector, 16))
        m.write_u32(0x4b20e8, 0)
    def assert_rng(self, rng):
        assert self.m.u32(self.thread + 0x14) == rng.state, (len(self.trace), len(rng.trace))
        assert self.trace == [{k: r[k] for k in ('rand', 'state')} for r in rng.trace]
    def records(self, addr, count):
        return [list(struct.unpack('<hhii', self.m.read(addr + i * 20, 12))) for i in range(count)]

def validate_helpers():
    guard()
    h = Harness()
    r = random.Random(92932)
    cases = 0
    for n in range(1, 17):
        for j in range(10):
            seed = r.getrandbits(32)
            party = [[r.randrange(1, 6) for _ in range(4)] for _ in range(n)]
            if j == 0:
                party = [[1, 1, 1, 1] for _ in party]
            h.setup(party, seed)
            rng = Rand(seed)
            a = r.randrange(n)
            avail = [True] * n
            expected = find_partner(party, a, avail, rng)
            native = h.m.call(0x433230, [h.vector, a, h.scratch])
            assert bool(native & 255) == (expected is not None)
            if expected:
                assert h.records(h.scratch, 1)[0] == expected
            assert [bool(h.m.read(c + 0x38, 1)[0]) for c in h.chars[:n]] == avail
            h.assert_rng(rng)
            h.setup(party, seed)
            rng = Rand(seed)
            b = r.randrange(n)
            expected = match_pair(party, a, b, rng)
            native = h.m.call(0x433a30, [h.vector, a, b, h.scratch])
            assert bool(native & 255) == (expected is not None)
            if expected:
                assert tuple(h.records(h.scratch, 1)[0][2:]) == expected
            h.assert_rng(rng)
            cases += 2
    return {'status': 'passed', 'cases': cases, 'source_sha256': SHA}

def validate_generation():
    guard()
    h = Harness()
    r = random.Random(19730)
    cases = []
    for level in (2, 1, 3):
        for n in range(1, 17):
            for j in range(3):
                seed = r.getrandbits(32)
                party = [[r.randrange(1, 6) for _ in range(4)] for _ in range(n)]
                if j == 0:
                    party = [[1, 1, 1, 1] for _ in party]
                h.setup(party, seed)
                rng = Rand(seed)
                if level == 2:
                    expected = generate_branches(party, rng)
                    h.m.call(0x4369e0, [h.vector], max_instructions=20_000_000)
                    actual = h.records(0x4b2190, 20)
                    assert actual == expected['records'], (level, n, j, actual, expected)
                elif level == 1:
                    expected = generate_pairs(party, rng)
                    h.m.call(0x4387e0, [h.vector], ecx=h.scene, stop_at=0x439096,
                             max_instructions=20_000_000)
                    actual = h.records(0x4b20f0, len(expected['records']))
                    for a, e in zip(actual, expected['records']):
                        assert a[:2] == e[:2] and (e[0] == 255 or a == e), (level, n, j, actual, expected)
                else:
                    expected = generate_tree(party, rng)
                    h.m.call(0x435bf0, [h.vector], ecx=h.scene, stop_at=0x4361e1,
                             max_instructions=40_000_000)
                    actual = h.records(0x4af7d8, h.m.u32(h.scene + 0x1ac))
                    assert actual == expected['edges'], (level, n, j, actual, expected)
                h.assert_rng(rng)
                cases.append({'level': level, 'size': n, 'case': j, 'seed': seed,
                              'rng_calls': len(rng.trace), 'final_rng_state': rng.state})
    return {'status': 'passed', 'cases': cases, 'count': len(cases), 'source_sha256': SHA}

def validate_scene_prefix_and_legacy():
    from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_ESP
    h = Harness()
    r = random.Random(775510)
    cases, legacy_cases = 0, 0
    for n in range(1, 17):
        for j in range(5):
            seed = r.getrandbits(32)
            party = [[r.randrange(1,6) for _ in range(4)] for _ in range(n)]
            h.setup(party, seed)
            rng = Rand(seed)
            order = []
            while len(order) < n:
                i = rng.next(n)
                if i not in order:
                    order.append(i)
            h.m.call(0x43b71d, edx=h.pointers+n*4,
                     registers={UC_X86_REG_EAX: h.pointers}, stop_at=0x43b7af)
            sp = h.m.reg(UC_X86_REG_ESP)
            begin, end = h.m.u32(sp+0x20), h.m.u32(sp+0x24)
            actual = [h.chars.index(h.m.u32(p)) for p in range(begin,end,4)]
            assert actual == order, (n,j,actual,order)
            h.assert_rng(rng)
            cases += 1
            h.setup(party, seed)
            h.m.write_u32(0x576a58, 1)
            rng = Rand(seed)
            expected = generate_pairs_legacy(party,rng)
            h.m.call(0x4387e0,[h.vector],ecx=h.scene,stop_at=0x439096,
                     max_instructions=20_000_000)
            actual = h.records(0x4b20f0,8)
            for a,e in zip(actual,expected['records']):
                assert a[:2] == e[:2] and (e[0] in (-1,255) or a == e), (n,j,actual,expected)
            h.assert_rng(rng)
            legacy_cases += 1
            h.m.write_u32(0x576a58, 0)
    return {'status':'passed', 'shuffle_cases':cases, 'legacy_generator_cases':legacy_cases,
            'source_sha256':SHA}


def validate_feedback():
    guard()
    h = Harness()
    m = h.m
    buttons, container, contvec, layer = m.alloc(16 * 44), m.alloc(16), m.alloc(16), m.alloc(256)
    sprites = [m.alloc(256) for _ in range(16)]
    m.write_u32(h.scene + 8, container)
    m.write_u32(container + 4, contvec)
    m.write_u32(contvec, layer)
    m.write_u32(layer + 0x18, contvec)
    m.write_u32(h.scene + 0x19c, 0)
    m.write_u32(0x4e4d30, buttons)
    for addr, pop in ((0x45a3b0, 0), (0x45b260, 8), (0x45c270, 8),
                      (0x434080, 4), (0x46c16c, 4)):
        m.hook(addr, lambda _: 0, pop=pop)
    r = random.Random(661994)
    cases, valve_cases = [], 0
    for level in (1, 2, 3):
        for n in range(1, 17):
            party = [[r.randrange(1, 6) for _ in range(4)] for _ in range(n)]
            # Force111 fallback and unlabeled connections in a separate case.
            for variant in range(2):
                if variant:
                    party = [[1 + i % 5] * 4 for i in range(n)]
                config = generate(level, party, r.getrandbits(32), scene_shuffle=False)
                h.setup(party, 0)
                m.write_u32(0x4e4d34, n if level == 1 else 16)
                m.write_u32(h.scene + 0xbe04, 0x11223344)
                m.write_u32(0x4b20ec, 0x55667788)
                for i, ptr in enumerate(sprites):
                    m.write_u32(h.scene + 12 + i * 4, ptr)
                m.write_u32(h.scene + 0x1ac, len(config.get('edges', [])))
                records = config['edges'] if level == 3 else config['records']
                address = {1: 0x4b20f0, 2: 0x4b2190, 3: 0x4af7d8}[level]
                for i, record in enumerate(records):
                    a, b, axis, value = record
                    m.write(address + i * 20, struct.pack('<hhiiii', a, b, axis or 0, value or 0, 0, 0))
                positions = list(range(n)) if level == 1 else ([15] + [x for i in range(5) for x in (i, i+5, i+10)])[:n] if level == 2 else sorted({x for e in records for x in e[:2]} or {0})
                for j in range(20):
                    slots = [None] * (n if level == 1 else 16)
                    order = list(range(n))
                    r.shuffle(order)
                    for node, character in zip(positions, order):
                        if j == 0 or r.randrange(5):
                            slots[node] = character
                    raw = [bytearray(trait_bytes(t)) for t in party]
                    for i in range(n):
                        raw[i][0x73] = r.randrange(2) if j % 2 else 0
                        m.write(h.chars[i], raw[i])
                    m.write(buttons, bytes(16 * 44))
                    for i in range(16):
                        occupant = slots[i] if i < len(slots) else None
                        m.write(buttons + 44*i + 16, bytes([occupant is not None]))
                        m.write_u32(buttons + 44*i + 28, 0xffffffff if occupant is None else occupant)
                        m.write_u32(sprites[i] + 40, 0x11223344)
                    m.write_u32(0x4b20e8, 0)
                    if level == 1:
                        m.call(0x438170, ecx=h.scene, stop_at=0x43856c)
                    elif level == 2:
                        m.call(0x437480, ecx=h.scene, stop_at=0x437a53)
                    else:
                        m.call(0x4336f0, [0, 0], stop_at=0x43391f, max_instructions=10_000_000)
                    actual = [i for i in range(n) if m.read(h.chars[i]+0x79, 1)[0]]
                    expected = feedback(config, party, slots, raw)
                    assert actual == expected['rescued'], (level, n, variant, j, slots, actual, expected)
                    active = ([bool(m.read(address + i*20 + 16, 1)[0]) for i in range(len(records))]
                              if level == 3 else [m.u32(sprites[i]+40) == 0x55667788 for i in range(len(connections(config)))])
                    assert active == expected['water_edges'], (level,n,variant,j,'edges',active,expected)
                    # Real master-valve predicate and final success marking.
                    for ptr in h.chars[:n]:
                        m.write(ptr + 0x38, b'\1')
                        m.write(ptr + 0x5c, b'\0')
                    m.call(0x4330c0)
                    assert m.u32(0x4b20e8) == int(expected['valve_enabled'])
                    rescued = [i for i in range(n) if m.read(h.chars[i]+0x5c, 1)[0]]
                    assert rescued == (actual if expected['valve_enabled'] else [])
                    valve_cases += 1
                    cases.append({'level': level, 'size': n, 'variant': variant, 'case': j,
                                  'rescued': len(actual), 'total': n})
    return {'status': 'passed', 'count': len(cases), 'valve_cases': valve_cases,
            'source_sha256': SHA, 'cases': cases}


def export_spec():
    guard()
    manifest = [json.loads(s) for s in (ROOT/'local/derived/mountain-rescue/manifest.jsonl').read_text().splitlines()]
    assets = [{k:r[k] for k in ('source','source_sha256','source_size','format','frame_count') if k in r}
              for r in manifest if 'waterslide/' in r['source'].lower()]
    evidence = {'executable': {'path':str(EXE.relative_to(ROOT)), 'sha256':SHA},
                'manual': {'path':'local/discs/mountain-rescue/INSTALL/Data/Zoombinimr.pdf',
                           'sha256':'59c8950e5b7e81eca6daa1d91028302584853a9cda4683ee813ec13cc43e44c3',
                           'pdf_pages':[16,29]},
                'offset_rule':'For listed text/data VA, file offset = VA - 0x400000; guarded source version only.',
                'native': {'scene':'0x43b4e0', 'scene_dispatch':'0x46155b',
                           'shuffle':['0x43b71d','0x43b7af'], 'L1_generator':['0x4387e0','0x439096'],
                           'L2_generator':['0x4369e0','0x436b94'], 'L3_generator':['0x435bf0','0x4361e1'],
                           'tree_candidate':['0x433bb0','0x434080'], 'find_partner':'0x433230', 'match_pair':'0x433a30',
                           'L1_feedback':['0x438170','0x43856c'], 'L2_feedback':['0x437480','0x437a53'],
                           'L3_feedback':['0x4336f0','0x43391f'], 'valve':['0x4330c0','0x433192'],
                           'escape_completion':['0x436ba0','0x437046'],
                           'animation_state_reset':'0x45d530 writes dword33 to character+0x70',
                           'legacy_config':'0x463822 defaults576a58=0;0x463a14 reads config override'}}
    validation = {name:json.loads((OUT/file).read_text()) for name,file in
                  [('helpers','helper-parity.json'),('generators','generator-parity.json'),
                   ('water_and_valve','feedback-parity.json'),('prefix_and_legacy','prefix-legacy-parity.json')]}
    # Keep large generated cases in their local evidence file, avoid duplicating them.
    for name, value in validation.items():
        if isinstance(value.get('cases'),list):
            value.pop('cases')
    spec = {'schema_version':1, 'game':'mountain-rescue', 'id':'mountain-rescue/pipes-of-paloo', 'name':'Pipes of Paloo',
            'state': {'party':'Ordered incoming list of 1..16 characters, each with hair/eyes/nose/feet bytes1..5 at+5..8.',
                      'board':'Injective character-to-basin assignment; empty basins and waiting characters allowed.',
                      'labels':'Each pipe tests equality of the indicated attribute between its two occupants. Stored generator value is a witness, not a required value.',
                      'phase':'Editable=0; accepted valve commit sets1 and disables every character; phases2/3 perform escape then leave.',
                      'native_fields':{'scene_level':'+0x1a8','edge_count':'+0x1ac','water_count':'+0xbe54',
                                       'live_water_flag':'character+0x79','final_escape_flag':'character+0x5c',
                                       'phase_global':'0x4b20e8','scene_global':'0x4b2320'}},
            'inputs': {'level':[1,2,3], 'seed':'CRT RNG state at scene generation boundary, not campaign launch seed.',
                       'party':'Previous puzzle survivors; no random party is invented by this scene.',
                       'configuration':'L1 legacy generator if zoombini2.cfg integer loaded into576a58 is nonzero; default0.'},
            'actions': [{'id':'move','rule':'While phase0, pick a party character and place it in an empty available basin, or return it to the waiting group. Existing occupants may be moved. Recompute water on pickup/drop.'},
                        {'id':'pull-valve','rule':'Only acts if phase0, at least one character has water flag1, and at least one basin is occupied. Snapshot water flags into final success flags and disable all characters.'}],
            'feedback': {'L1':'Each occupied matching pair turns blue and gives both characters water. Unlabeled pair records a=255 accept any two occupants. The middle unpaired basin for odd n gives water independently.',
                         'L2':'Central basin15 gives its occupant water. Five three-edge branches extend15-i-(i+5)-(i+10). An occupant receives water only along an entirely occupied matching path to15. Missing generated labels axis=-1 are wildcards.',
                         'L3':'Blue edges are occupied equal-trait connections connected to root basin0. Characters incident to a blue edge receive water; no special isolated-root rescue in this callback.',
                         'fallback111':'No label is rendered. Native checker compares character byte0x73. Scene initialization writes animation state33 at+0x70, making byte0x73 zero, so normal resting occupants match. Raw-byte override in model preserves the exact exceptional predicate.',
                         'native_representation':'L2 visual flags must be cleared by normal pickup/recompute before replacing occupants; direct memory swaps are outside the legal action boundary.'},
            'success': {'full':'All arriving characters have final success flag1 after valve commit.',
                        'partial':'Any nonempty subset with water can be committed; those escape, others are stranded. Water connectivity is evaluated before the exit animations remove occupants.',
                        'not_required':'The generator witness assignment, exact stored trait values, and a unique arrangement are not required.'},
            'failure': {'attempt_limit':None, 'rule':'Mismatches do not consume attempts and can be rearranged without limit before valve commit. Pulling with no eligible water character has no effect.',
                        'terminal':'A committed partial arrangement strands every unmarked character; board cannot be edited further.',
                        'edge_case':'For n=1,L1 callback marks the sole character eligible even before placement but valve requires an occupied basin. L3 generator has zero edges and its checked feedback callback gives no water; do not infer whole-campaign handling from this isolated boundary.'},
            'difficulty_levels': [
                {'level':1, 'structure':'floor(n/2) independent paired basins; optional free middle basin.', 'constraints':'One shared trait per labeled pair; no source-connectivity dependency.'},
                {'level':2, 'structure':'Fixed five-branch tree, root15; first n nodes of [15,0,5,10,1,6,11,2,7,12,3,8,13,4,9,14].', 'constraints':'Up to three linked comparisons per branch; root occupant shared across all branches.'},
                {'level':3, 'structure':'Generated n-node tree embedded in authored16-node adjacency graph, source0.', 'constraints':'Trait matching and root connectivity over an irregular branched layout; generated unlabeled fallback edges allowed.'}],
            'generation': {'status':'Executable Python models plus original-function output and full RNG-trace parity.',
                           'model':'tools/spec_mr_pipes_of_paloo.py',
                           'rng':'state=(214013*state+2531011) mod2^32; rand=(state>>16)&32767; all selections use rand()%modulus.',
                           'scene_prefix':'Repeated rand()%n with rejection of already chosen indices, until a permutation is built. L1/L3 use this order. L2 consumes these calls but uses the original incoming order.',
                           'L1':'Up to9 greedy pairing passes. Deferred unmatched characters prepend in reverse order on retry. Each candidate comparison shuffles axes1..4 with400 random swaps (800 RNG draws), then takes first equal trait. Unmatchable leftovers become unlabeled pairs. Two final random pair indices are swapped once. n1 has no generated pair records.',
                           'L2':'Up to100 attempts. Draw root rand()%n, mark used. Build rows2,1,0 across floor((n+1)/3) branches, stopping after n processed slots. Partner search scans unused characters by index and draws attributes with replacement. Equality on the fourth distinct tested attribute is rejected. Unfilled entries stay -1. First zero-missing attempt wins, otherwise final attempt; no best-so-far retention.',
                           'L3':'Count possible partners using exact find_partner helper; stable sort ascending count. Try AX(root first) then BY(random root), accepting first with no forced edges. Otherwise try10 AY(root first) candidates; retain minimum forced count among these10, not the prior AX/BY. Candidate grows a tree by first compatible unused character, occupied node order, random open neighbor. When impossible, repeatedly choose an empty authored node adjacent to the tree, attach first unused character with axis/value111.',
                           'legacy_L1':'Nonzero config switch uses10 passes of a different greedy algorithm: for each unused parent, test only the first unused other character with random attribute draws; fourth-distinct equality rejected. Retry order remains unchanged because reorder helper is invoked with0. Unfilled records use255; odd final leftover record uses-1. Model and80 parity cases included.',
                           'authored_graph': {'va':'0x492ab8','file_offset':0x92ab8,'bytes':512,'record_format':'16 rows of8 signed32-bit ints:nodeID,5 neighbor slots,assignment=-1,spare=-1','decoded':authored_graph()},
                           'selection_quirks':'L3 final node-assignment scratch table can belong to the final candidate rather than retained best candidate. Generated edges are authoritative. Generator record padding and unused stack bytes are excluded from parity.'},
            'assets': {'manifest':'local/derived/mountain-rescue/manifest.jsonl','files':assets,
                       'bindings':{'root':'Data/Bmp/waterslide/', 'pipe_states':'pipes - grey, pipes - blue, pipes - red',
                                   'traits':'Native trait index selects four attribute icons; axis111/-1 suppresses labels.',
                                   'geometry_table':'L3 authored adjacency at0x492ab8; labels/slots generated by435bf0..4369df.',
                                   'frame_provenance':'Full offsets and decoded frame paths in the source manifest.'}},
            'evidence':evidence, 'validation':validation, 'open_questions':[],
            'completeness': {'status':'complete normal puzzle-logic boundary',
                             'covered':['all three normal generators','scene shuffle and RNG','nondefault legacyL1 generator','water predicates','root connectivity','all editable arrangements','actual valve gate and final success marking','unlimited rearrangement and partial exit'],
                             'excluded':['pixel hit-testing and animation timing','shared campaign/save progression','malformed character records','arbitrary out-of-range levels'],
                             'qualification':'144 normal generator cases,80 legacy,80 scene-prefix,320 helper comparisons,1920 water states and1920 valve commits. L1/L2 visual state tested after legal empty-slot reset. Diagnostic n1L3 callback behavior recorded without claiming campaign softlock.'}}
    path = ROOT/'local/specs/mountain-rescue/pipes-of-paloo.json'
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(spec,indent=2)+'\n')
    return {'output':str(path),'asset_files':len(assets),'status':spec['completeness']['status']}


def save(name, value):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(value, indent=2) + '\n')
    print(json.dumps({k: v for k, v in value.items() if k != 'cases'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--validate-helpers', action='store_true')
    ap.add_argument('--validate-generation', action='store_true')
    ap.add_argument('--validate-feedback', action='store_true')
    ap.add_argument('--validate-prefix', action='store_true')
    ap.add_argument('--export', action='store_true')
    args = ap.parse_args()
    if args.validate_helpers:
        save('helper-parity.json', validate_helpers())
    if args.validate_generation:
        save('generator-parity.json', validate_generation())

    if args.validate_feedback:
        save('feedback-parity.json', validate_feedback())

    if args.validate_prefix:
        save('prefix-legacy-parity.json', validate_scene_prefix_and_legacy())

    if args.export:
        print(json.dumps(export_spec()))
