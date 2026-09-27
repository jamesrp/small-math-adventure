#!/usr/bin/env python3
"""Captain Cajun's Ferryboat: authored layouts, derived graph and placement rules.

Pure commands use the locally extracted asset corpus and the standard library.
Native validation is explicit and limited to isolated family logic.
"""
from __future__ import annotations
import argparse
from collections import Counter
from dataclasses import dataclass, asdict
import hashlib
import itertools
import json
from pathlib import Path
import random
import struct

from logical_bridge_generator import SOURCE_SHA256, LEVEL_NAMES

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / 'local/derived/logical-journey'
OUT = ROOT / 'local/analysis/logical-journey-captain-cajuns-ferryboat'


def intersects(a, b):
    return max(a[0], b[0]) < min(a[2], b[2]) and max(a[1], b[1]) < min(a[3], b[3])


def adjacency(rectangles, level):
    """Reconstruction of0x4118f0 using the original strict rectangle overlap."""
    result = []
    for i, (left, top, right, bottom) in enumerate(rectangles):
        # Native signed integer division truncates toward zero.
        spread = int((bottom - top) / 2) - 2
        vertical = (left + spread, top - spread, right - spread, bottom + spread)
        horizontal = (left - spread, top + spread, right + spread, bottom - spread)
        broad_vertical = (left, top - spread, right, bottom + spread)
        neighbors = [j for j, rect in enumerate(rectangles) if i != j and (
            intersects(vertical, rect) or intersects(horizontal, rect) or
            (level >= 3 and intersects(broad_vertical, rect)))]
        result.append(neighbors[:8])
    return result


def layout(level, party_count, count_override=0):
    """Native0x4115c0 chooses one SCRB template without making an RNG call."""
    if level < 0 or level > 4:
        level = 0
    count = count_override or party_count
    if count < 16 or count > 20:
        count = 16
    # Native level4 passes only count-16; it is outside normal UI0..3.
    resource_id = 1510 + 5 * level + count - 16 if level < 4 else count - 16
    if level == 4:
        raise ValueError('native index4 is a debug/out-of-UI branch with resource IDs0..4')
    source = CORPUS / f'animations/ferry/SCRB/{resource_id:05}.json'
    decoded = json.loads(source.read_text())
    raw = CORPUS / decoded['source']
    assert hashlib.sha256(raw.read_bytes()).hexdigest() == decoded['source_sha256']
    # All20 shipped templates keep seat shapes1..3 in frame0; frame1 holds cargo.
    assert len(decoded['frames']) == 2
    assert not any(1 <= layer['shape_index'] <= 3 for layer in decoded['frames'][1]['layers'])
    seats = [dict(layer) for layer in decoded['frames'][0]['layers'] if 1 <= layer['shape_index'] <= 3]
    assert len(seats) == count
    images = [json.loads(line) for line in (CORPUS / 'images.jsonl').read_text().splitlines()]
    dimensions = {r['frame_index'] + 1: (r['width'], r['height']) for r in images
                  if r['archive'] == 'DATA/ferry.mhk' and r['resource_id'] == 1500}
    for i, seat in enumerate(seats):
        width, height = dimensions[seat['shape_index']]
        assert (width, height) == (44, 36)
        seat.update({'seat_index': i, 'native_slot': i + 1,
                     'sprite_resource': 1499 + seat['shape_index'],
                     'rectangle': [seat['x'], seat['y'], seat['x'] + width, seat['y'] + height],
                     'entity_anchor': [seat['x'] + 22, seat['y'] - 7]})
    graph = adjacency([seat['rectangle'] for seat in seats], level)
    return {'difficulty_native': level, 'difficulty_ui': level + 1,
            'party_count_input': party_count, 'count_override': count_override,
            'seat_count': count, 'resource_id': resource_id,
            'resource_sha256': decoded['source_sha256'], 'resource_source': decoded['source'],
            'seats': seats, 'adjacency': graph,
            'edges': [(i, j) for i, neighbors in enumerate(graph) for j in neighbors if i < j],
            'rng_calls': []}


def placement(traits, slot, occupants, graph):
    """Occupants maps zero-based seats to a four-trait tuple or None.

    Validate only occupied neighbors, in native ascending-slot order. The native
    hint bitmask accumulates matching attribute bits up to the first rejection.
    Destination occupancy is handled by drag/drop before this predicate.
    """
    if slot not in range(len(graph)):
        raise ValueError('seat outside layout')
    matching_bits = 0
    for neighbor in graph[slot]:
        other = occupants.get(neighbor)
        if other is None:
            continue
        common = sum(1 << i for i in range(4) if traits[i] == other[i])
        matching_bits |= common
        if not common:
            return {'accepted': False, 'first_conflicting_neighbor': neighbor,
                    'matching_attribute_bits': matching_bits}
    return {'accepted': True, 'first_conflicting_neighbor': None,
            'matching_attribute_bits': matching_bits}


@dataclass
class FerryState:
    party: list
    layout: dict
    seats: list
    departed: bool = False

    @classmethod
    def create(cls, party, level):
        data = layout(level, len(party))
        return cls([list(z) for z in party], data, [None] * data['seat_count'])

    def move(self, member, destination):
        """Logical pickup/drop: occupied destinations cannot be selected.

        destination=None places the member on the waiting bank. Removing the
        previous seat precedes validation, as in generic native drag/drop.
        """
        if self.departed or member not in range(len(self.party)):
            raise ValueError('member cannot be moved in this state')
        if destination is not None and (destination not in range(len(self.seats)) or
                (self.seats[destination] is not None and self.seats[destination] != member)):
            raise ValueError('destination must be a vacant seat')
        for seat, occupant in enumerate(self.seats):
            if occupant == member:
                self.seats[seat] = None
        if destination is None:
            return {'accepted': True, 'location': 'bank'}
        occupants = {seat: self.party[occupant] for seat, occupant in enumerate(self.seats) if occupant is not None}
        result = placement(self.party[member], destination, occupants, self.layout['adjacency'])
        if result['accepted']:
            self.seats[destination] = member
        return result

    def go(self):
        if self.departed or not any(member is not None for member in self.seats):
            raise ValueError('GO requires at least one seated member')
        self.departed = True
        passed = sorted(member for member in self.seats if member is not None)
        return {'passed_members': passed, 'left_behind': sorted(set(range(len(self.party))) - set(passed)),
                'complete': len(passed) == len(self.party)}


class FerryOracle:
    def __init__(self):
        from native_oracle import NativeOracle
        self.machine = m = NativeOracle('logical-journey')
        self.graph_buffer = m.alloc(160)
        self.objects = [m.alloc(512) for _ in range(21)]
        m.write_u32(0x495a7c, self.graph_buffer)
        m.hook(0x456380, lambda m: self.objects[(m.arg(0) & 65535) - 1] if 1 <= (m.arg(0) & 65535) <= 21 else 0, pop=4)
        m.hook(0x410c4f, lambda m: 0)
        m.hook(0x410ce7, lambda m: 1)
        context = m.alloc(128)
        m.write_u32(0x4a2818, context)
        self.constructor_events = []
        m.hook(0x457560, self._resource, pop=12)
        m.hook(0x455db0, self._construct, pop=32)
        m.hook(0x45fa60, lambda m: 0)

    def _resource(self, m):
        resource_id = m.arg(1) & 65535
        assert m.arg(2) == 0x53435242
        data = (CORPUS / f'resources/ferry/SCRB/{resource_id:05}.bin').read_bytes()
        values = struct.unpack('>' + 'H' * (len(data) // 2), data)
        host_data = struct.pack('<' + 'H' * len(values), *values)
        return m.alloc(len(data), host_data)

    def _construct(self, m):
        resource_id = m.arg(3) & 65535
        position = struct.unpack('<hh', m.read(m.arg(5), 4))
        self.constructor_events.append({'resource_id': resource_id, 'position': list(position)})
        return len(self.constructor_events)

    def template_selection(self, level, count, override):
        m = self.machine
        m.hook(0x447d20, lambda m: count)
        m.write_u16(0x495a98, level)
        m.write_u32(0x495a4c, override)
        selected = []
        m.hook(0x411660, lambda m: selected.append(m.arg(0) & 65535))
        try:
            m.call(0x4115c0)
        finally:
            m.uc.hook_del(m.hooks.pop(0x411660))
        assert len(selected) == 1
        return selected[0]

    def construct_layout(self, resource_id):
        self.constructor_events = []
        self.machine.call(0x411660, [resource_id])
        return [event for event in self.constructor_events if event['resource_id'] in (1500, 1501, 1502)]

    def graph(self, rectangles, level):
        m = self.machine
        m.write_u16(0x4a32b4, len(rectangles))
        m.write_u16(0x495a98, level)
        for index, rect in enumerate(rectangles):
            m.write_u16(0x495a1c + 2 * index, index + 1)
            m.write(self.objects[index] + 0xd0, struct.pack('<hhhh', *rect))
        m.call(0x4118f0, [0])
        return [[v - 1 for v in m.read(self.graph_buffer + 8 * index, 8) if v] for index in range(len(rectangles))]

    def placement(self, traits, slot, occupants, graph):
        from unicorn.x86_const import UC_X86_REG_ESI, UC_X86_REG_EAX
        m = self.machine
        for index, neighbors in enumerate(graph):
            m.write(self.graph_buffer + 8 * index, bytes(j + 1 for j in neighbors) + bytes(8 - len(neighbors)))
        m.write(0x4a3398, bytes(40))
        for index, other in occupants.items():
            if other is not None:
                m.write_u16(0x4a3398 + 2 * index, index + 1)
                m.write(self.objects[index] + 0xf0, bytes(other))
        entity = self.objects[20]
        m.write(entity + 0xf0, bytes(traits))
        m.write_u16(0x495a1a, slot + 1)
        accepted = m.call(0x410b9a, registers={UC_X86_REG_ESI: entity, UC_X86_REG_EAX: slot + 1})
        return bool(accepted), m.u16(0x495a48)


def validate_native():
    oracle = FerryOracle()
    checks = Counter()
    layouts = []
    rnd = random.Random(0xCA7A)
    for level in range(4):
        for count in range(16, 21):
            data = layout(level, count)
            assert oracle.template_selection(level, count, 0) == data['resource_id']
            checks['native_template_selection_cases'] += 1
            constructed = oracle.construct_layout(data['resource_id'])
            assert constructed == [{'resource_id': seat['sprite_resource'], 'position': [seat['x'], seat['y']]}
                                   for seat in data['seats']], (level, count, constructed, data['seats'])
            checks['native_template_constructor_cases'] += 1
            native_graph = oracle.graph([s['rectangle'] for s in data['seats']], level)
            assert native_graph == data['adjacency'], (level, count, native_graph, data['adjacency'])
            assert all(i in data['adjacency'][j] for i, ns in enumerate(data['adjacency']) for j in ns)
            checks['native_graph_cases'] += 1
            layouts.append(data)
            for slot in range(count):
                for variant in range(12):
                    traits = tuple(rnd.randint(1, 5) for _ in range(4))
                    occupants = {j: tuple(rnd.randint(1, 5) for _ in range(4)) for j in range(count) if j != slot and (variant == 0 or rnd.randrange(3))}
                    expected = placement(traits, slot, occupants, data['adjacency'])
                    actual = oracle.placement(traits, slot, occupants, data['adjacency'])
                    assert actual == (expected['accepted'], expected['matching_attribute_bits']), (level, count, slot, traits, occupants, actual, expected)
                    checks['native_placement_cases'] += 1
    report = {'status': 'passed', 'source_sha256': SOURCE_SHA256, 'checks': dict(checks),
              'boundaries': ['Native template selector0x4115c0 and complete layout constructor0x411660 with resource-loader and object-construction stubs; original frame walker0x456ef0 executes.',
                             'Complete native graph builder0x4118f0, supplied seat object rectangles from decoded44x36 art and authored SCRB coordinates.',
                             'Native placement branch0x410b9a..0x410ce7, stopped before animation/audio feedback.',
                             'Object lookup is stubbed to supplied entity/seat records; no rendering or pointer event loop.'],
              'failures': []}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'native-validation.json').write_text(json.dumps(report, indent=2) + '\n')
    (OUT / 'layouts.json').write_text(json.dumps(layouts, indent=2) + '\n')
    print(json.dumps(report, indent=2))


def write_spec():
    from spec_lj_provenance import family_assets, source_evidence
    evidence = source_evidence(OUT, [
        ('template-selector', 0x4115c0, 0x411647), ('template-constructor', 0x411660, 0x4118eb),
        ('graph-builder', 0x4118f0, 0x411b9f), ('placement', 0x410b9a, 0x410ce7),
        ('placement-feedback', 0x410c4f, 0x410de2), ('departure-gate', 0x410a24, 0x410a94),
        ('rect-intersection', 0x463890, 0x4638fc), ('resource-frame-walker', 0x456ef0, 0x456f69)])
    assets = family_assets('ferry')
    layouts = [layout(level, count) for level in range(4) for count in range(16, 21)]
    assets['bindings'] = [
        {'role': 'authored topology/layout templates', 'tag': 'SCRB', 'ids': list(range(1510, 1530)), 'source': '0x4115c0 and0x411660'},
        {'role': 'seat artwork, normal/matching-highlight/empty frames', 'tag': 'SCRB', 'ids': [1500, 1501, 1502], 'bitmap_bank': {'tag': 'tBMP', 'id': 1500}},
        {'role': 'decorative cargo actors', 'tag': 'SCRB', 'ids': list(range(1503, 1510)), 'source': 'Template shape4..10 maps to1499+shape; may be suppressed by context+0x22.'},
        {'role': 'help by difficulty', 'archive': 'DATA/zoombini.mhk', 'tag': 'STRL', 'ids': [2000, 2020, 2040, 2060]}]
    spec = {
        'schema_version': 1, 'game': 'logical-journey', 'id': 'captain-cajuns-ferryboat', 'name': 'Captain Cajun’s Ferryboat',
        'state': {'party': 'Distinct member identities with four native trait bytes, values1..5; fourth byte is feet, other trait labels not independently renderer-verified.',
                  'seats': '16..20 authored seats, each empty or occupied byone member. Each member occupies at mostone seat.',
                  'graph': 'Ordered neighbor lists derived from authored seat rectangles, up toeight neighbors per seat. Lists are symmetric on all shipped templates.',
                  'bank': 'Unseated members remain available for rearrangement.',
                  'departure': 'Active until GO; departure carries seated members.'},
        'inputs': {'difficulty_native': [0, 1, 2, 3], 'difficulty_ui': [1, 2, 3, 4],
                   'layout_count': 'Selector obtains eligible member count from0x447d20; nonzero override0x495a4c takes precedence. Counts outside16..20 select16.',
                   'traits': 'The family predicate reads entity bytes+0xf0..0xf3.',
                   'rng': 'No RNG input affects topology selection or acceptance.'},
        'actions': [
            {'id': 'place_or_move', 'precondition': 'Active session; member available and destination seat empty (own seat may first be vacated).', 'effect': 'Pickup frees the old occupancy. Drop temporarily assigns the destination; native family validation accepts or clears that destination. No swaps into occupied destinations.'},
            {'id': 'return_to_bank', 'precondition': 'Active session; movable member.', 'effect': 'Frees its seat, creating a waiting member; no puzzle penalty.'},
            {'id': 'go', 'precondition': 'At leastone seated member.', 'effect': 'Seated members advance. Unseated members are left behind, so a partial departure is legal.'}],
        'feedback': {'predicate': 'Every occupied neighbor must share at leastone of the four trait values with the proposed occupant. Unoccupied neighbors impose no constraint.',
                     'evaluation_order': 'Neighbor slots in ascending native index; return rejection at the first occupied incompatible neighbor.',
                     'matching_attribute_bits': 'Bit0..3 mark equal trait bytes; OR across examined neighbors until the first rejection. This is retained as the native feedback field0x495a48.',
                     'rejection': 'Clear temporary destination occupancy0x448e30; proposed member is not counted as seated. Captain speech/animation signals failure.',
                     'acceptance': 'Mark entity+0x12c=1 and retain destination occupancy. Optional matching-trait visual feedback uses accumulated bitmask.',
                     'speech_counter': 'Consecutive rejection counter0x495a6a influences speech. A draw in[3,5] can select special complaint0x717. This is not an attempt limit.',
                     'presentation_rng': 'Idle, acceptance and rejection speech consume shared RNG separately from the deterministic puzzle layout and predicate.'},
        'success': {'full': 'Every incoming member is seated compatibly, then GO.', 'partial': 'GO with any nonempty seated subset is allowed.'},
        'failure': {'attempt_limit': None, 'time_limit': None,
                    'invalid_placement': 'Rejection leaves the destination empty; no lives or finite placement quota are consumed.',
                    'unsatisfiable_party': 'The family does not search for or guarantee a seating solution for arbitrary supplied trait tuples. Partial departure remains possible.',
                    'terminal': 'No family-level failure counter forces departure.'},
        'difficulty_levels': [{'native': level, 'ui': level + 1, 'name': LEVEL_NAMES[level],
                               'templates': [{'seat_count': count, 'resource_id': data['resource_id'],
                                              'edge_count': len(data['edges'])}
                                             for count in range(16, 21)
                                             for data in [layouts[5 * level + count - 16]]],
                               'geometric_rule': 'Vertical and horizontal narrow overlap strips' + (' plus broad vertical strip' if level == 3 else ''),
                               'placement_rule_changes': False} for level in range(4)],
        'generation': {'status': 'native-parity-verified-authored-template-selection',
                       'type': 'Authored layouts; no procedural rule generation or random topology selection.',
                       'selector': 'resource_id=1510+5*native_level+(effective_count-16), effective_count=override_or_count when16<=count<=20 else16.',
                       'constructor': 'Native0x411660 traverses two SCRB frames, alternating runs at zero-shape separators; shapes1..3 instantiate seats, shapes4..10 cargo. All shipped templates place seats in frame0 and cargo in frame1. Seat order is frame0 nonzero seat order.',
                       'rectangles': 'Seat shapes1..3 are44x36 pixels. A seat at(x,y) has rectangle[x,y,x+44,y+36]; Zoombini anchor[x+22,y-7].',
                       'graph_algorithm': 'For rectangle(L,T,R,B), d=truncate((B-T)/2)-2. Connect distinct seats when their rectangles strictly overlap either(L+d,T-d,R-d,B+d) or(L-d,T+d,R+d,B-d). At nativelevel3 also test(L,T-d,R,B+d). Keep firsteight neighbors in ascending seat order.',
                       'rng_calls': [], 'conditioning': 'Only difficulty and effective count select topology; incoming trait values are not inspected by layout or adjacency construction.',
                       'layouts': layouts,
                       'out_of_ui_branch': 'Nativeindex4 is accepted by an initial range check but falls through to resources0..4. The model rejects this debug/out-of-UI branch; ordinary difficulties are0..3.'},
        'assets': assets, 'evidence': evidence,
        'validation': json.loads((OUT / 'native-validation.json').read_text()),
        'open_questions': [{'area': 'presentation/runtime', 'question': 'Pointer motion, exact return-to-bank animation and speech timing are not reimplemented; the shared drag helper source is preserved at local/analysis/logical-journey-shared-drag.txt.', 'blocks_logical_layout_or_predicate': False},
                           {'area': 'journey framework', 'question': 'Checkpoint population and global difficulty advancement occur outside this family specification.', 'blocks_logical_layout_or_predicate': False}],
        'completeness': {'logical_rules': True, 'all_four_difficulties': True, 'layout_selection': True,
                         'all_twenty_layouts': True, 'acceptance': True, 'attempt_limits': True,
                         'semantic_state_model': 'Logical occupancy transitions; native pointer/animation event loop excluded.',
                         'native_player_or_renderer': False}}
    path = ROOT / 'local/specs/logical-journey/captain-cajuns-ferryboat.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(spec, indent=2) + '\n')
    print(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--validate-native', action='store_true')
    parser.add_argument('--write-spec', action='store_true')
    parser.add_argument('--difficulty', type=int, choices=range(4), default=0)
    parser.add_argument('--party-count', type=int, default=16)
    args = parser.parse_args()
    if args.validate_native:
        validate_native()
    elif args.write_spec:
        write_spec()
    else:
        print(json.dumps(layout(args.difficulty, args.party_count), indent=2))


if __name__ == '__main__':
    main()
