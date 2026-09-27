#!/usr/bin/env python3
"""Turtle Hurdle's recovered puzzle boundary; original game is never launched.

Native arithmetic is compared in isolated x86 memory. SEH registration memory is
mapped, and a copied-character destructor is stubbed; neither changes trait logic.
"""
import argparse
from dataclasses import dataclass, asdict
import hashlib
import json
from pathlib import Path
import random
import struct

ROOT = Path(__file__).resolve().parents[1]
EXE = ROOT / 'local/discs/mountain-rescue/INSTALL/HD/zoombini2.exe'
SHA = '1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa'
OUT = ROOT / 'local/analysis/mountain-rescue-turtle-hurdle'


def guard():
    if hashlib.sha256(EXE.read_bytes()).hexdigest() != SHA:
        raise ValueError('Unrecognized executable: re-establish all addresses')


class Rand:
    def __init__(self, seed):
        self.state, self.trace = seed & 0xffffffff, []

    def next(self, modulus):
        self.state = (214013 * self.state + 2531011) & 0xffffffff
        value = (self.state >> 16) & 0x7fff
        self.trace.append({'rand': value, 'modulus': modulus, 'state': self.state})
        return value % modulus


def generate(level, seed):
    """401000/401060/401180; seed means RNG state immediately at entry."""
    if level not in (1, 2, 3, 4):
        raise ValueError('Levels 1..3 normal; 4 is diagnostic only')
    rng = Rand(seed)
    attributes = list(range(4))
    primary = attributes.pop(rng.next(4))
    def perm():
        remaining, result = list(range(1, 6)), []
        for count in range(5, 0, -1):
            result.append(remaining.pop(rng.next(count)))
        return result
    primary_order = perm()
    secondary = attributes[rng.next(3)]
    secondary_order = perm()
    clues, secondary_clues = [0] * 6, [0] * 6
    if level == 1:
        clues, mistakes = [1] * 6, 3
    elif level == 2:
        count = rng.next(2) + 1
        mistakes = 6 - count
        remaining = list(range(5))
        for _ in range(count):
            clues[remaining.pop(rng.next(len(remaining)))] = 1
    elif level == 3:
        mistakes = 6
        clues[rng.next(5)] = 1
        secondary_clues[rng.next(5)] = 1
    else:
        mistakes = 7
    return {'level': level, 'primary': primary, 'secondary': secondary,
            'primary_order': primary_order, 'secondary_order': secondary_order,
            'clues': clues, 'secondary_clues': secondary_clues,
            'mistakes': mistakes, 'rng_state': rng.state, 'rng_trace': rng.trace}


def key(config, traits):
    result = (config['primary_order'].index(traits[config['primary']]),)
    if config['level'] >= 3:
        result += (config['secondary_order'].index(traits[config['secondary']]),)
    return result


def ordered_party(config, party):
    return sorted(range(len(party)), key=lambda i: key(config, party[i]))


def accepts(config, party, character, slot):
    return key(config, party[character]) == key(config, party[ordered_party(config, party)[slot]])


@dataclass
class Board:
    config: dict
    party: list
    slots: list
    remaining_mistakes: int

    @classmethod
    def new(cls, config, party):
        if not 1 <= len(party) <= 16 or any(len(t) != 4 or any(v not in range(1, 6) for v in t) for t in party):
            raise ValueError('Party contains 1..16 four-trait characters, values1..5')
        return cls(config, party, [None] * len(party), config['mistakes'])

    def place(self, character, slot):
        if self.remaining_mistakes <= 0:
            raise ValueError('Dock collapsed')
        if character in self.slots or not 0 <= character < len(self.party):
            raise ValueError('Character is already placed or absent')
        if not 0 <= slot < len(self.slots) or self.slots[slot] is not None:
            raise ValueError('Choose an unoccupied turtle')
        correct = accepts(self.config, self.party, character, slot)
        target = slot
        if not correct:
            self.remaining_mistakes -= 1
            # Native loop 416013..41607c overwrites target for every free match.
            target = max(i for i, occupant in enumerate(self.slots)
                         if occupant is None and accepts(self.config, self.party, character, i))
        self.slots[target] = character
        return {'correct': correct, 'requested_slot': slot, 'actual_slot': target,
                'remaining_mistakes': self.remaining_mistakes,
                'complete': all(x is not None for x in self.slots),
                'stranded': [i for i in range(len(self.party)) if i not in self.slots]}


def config_bytes(config):
    data = bytearray(0xc4)
    def pack(offset, values):
        struct.pack_into('<' + 'I' * len(values), data, offset, *values)
    pack(0x50, config['primary_order'] + [0])
    pack(0x68, config['secondary_order'] + [0])
    pack(0x80, config['clues'])
    pack(0x98, config['secondary_clues'])
    pack(0xb0, [1 if config['level'] < 3 else 2, config['level'], config['primary'], config['secondary'], config['mistakes']])
    return data


def trait_bytes(traits):
    result = bytearray(0x9c)
    result[5:9] = bytes(traits)
    return result


def validate():
    guard()
    from native_oracle import NativeOracle
    from unicorn import UC_HOOK_CODE
    from unicorn.x86_const import UC_X86_REG_EAX
    m = NativeOracle('mountain-rescue')
    m.uc.mem_map(0, 0x1000)  # SEH chain, no exception handler is executed.
    thread, obj = m.alloc(256), m.alloc(0xc4)
    m.hook(0x46ec98, lambda _: thread)
    m.hook(0x45c080, lambda _: 0)  # destructor of by-value character copy
    trace = []
    def rand_return(uc, address, size, _):
        trace.append({'rand': m.reg(UC_X86_REG_EAX), 'state': m.u32(thread + 0x14)})
    m.uc.hook_add(UC_HOOK_CODE, rand_return, begin=0x46c7e1, end=0x46c7e1)
    seeds = [0, 1, 2, 0xffffffff, 0x7fffffff] + [random.Random(9127 + i).getrandbits(32) for i in range(95)]
    cases, predicates = [], 0
    party_memory = m.alloc(16 * 0x9c)
    prng = random.Random(981)
    for level in (1, 2, 3, 4):
        for seed in seeds:
            config = generate(level, seed)
            m.write(obj, bytes(0xc4))
            m.write_u32(thread + 0x14, seed)
            trace.clear()
            m.call(0x401000, [level], ecx=obj)
            assert m.read(obj, 0xc4) == config_bytes(config), (level, seed)
            assert trace == [{k: x[k] for k in ('rand', 'state')} for x in config['rng_trace']]
            assert m.u32(thread + 0x14) == config['rng_state']
            # All positions/all characters, including equal primary and secondary keys.
            n = 1 + seeds.index(seed) % 16
            party = [[prng.randrange(1, 6) for _ in range(4)] for _ in range(n)]
            if n > 1:
                party[-1] = party[0][:]  # twin equivalence is deliberate.
            m.write(party_memory, b''.join(trait_bytes(t) for t in party))
            for character in range(n):
                words = struct.unpack('<39I', trait_bytes(party[character]))
                for slot in range(n):
                    native = m.call(0x4012d0, [party_memory, n, *words, slot], ecx=obj)
                    assert native == accepts(config, party, character, slot), (level, seed, character, slot)
                    predicates += 1
            board = Board.new(config, party)
            while board.remaining_mistakes and None in board.slots:
                c = next(i for i in range(n) if i not in board.slots)
                s = next(i for i in range(n) if board.slots[i] is None)
                board.place(c, s)
                assert all(x is None or accepts(config, party, x, i) for i, x in enumerate(board.slots))
            cases.append({'level': level, 'seed': seed, 'party_size': n,
                          'rng_calls': len(trace), 'clues': config['clues'],
                          'mistakes': config['mistakes'], 'rng_state': config['rng_state']})
    result = {'status': 'passed', 'source_sha256': SHA, 'generator_cases': len(cases),
              'predicate_cases': predicates, 'cases': cases,
              'boundary': {'native': ['401000 complete constructor/generator and native CRT rand',
                                     '4012d0 complete trait validator including nested sort4016a0'],
                           'stubs': ['46ec98 returns isolated CRT thread state', '45c080 destructor of inert character copy'],
                           'not_native_compared': ['scene animation/rendering', 'settled wrong-placement transition (statically traced)']}}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'parity.json').write_text(json.dumps(result, indent=2) + '\n')
    return {k: v for k, v in result.items() if k != 'cases'}


def validate_actions():
    """Compare caller's settled placement decision, stopping before spline animation."""
    guard()
    from native_oracle import NativeOracle
    from unicorn.x86_const import UC_X86_REG_ECX
    m = NativeOracle('mountain-rescue')
    m.uc.mem_map(0, 0x1000)
    logic, scene = m.alloc(0xc4), m.alloc(0xbc9c)
    buttons, pointers = m.alloc(16 * 0x2c), m.alloc(16 * 4)
    characters = [m.alloc(0x9c) for _ in range(16)]
    m.write(pointers, struct.pack('<16I', *characters))
    m.write_u32(0x4e4914, pointers)
    m.write_u32(0x4e4918, pointers + 64)
    m.write_u32(0x4e4d30, buttons)
    m.write_u32(scene + 0x10, logic)
    m.hook(0x46cbda, lambda machine: machine.alloc(machine.arg(0)))
    m.hook(0x45c080, lambda _: 0)
    for address, pop in [(0x45c270, 8), (0x46c16c, 4), (0x45d470, 8), (0x45db20, 4)]:
        m.hook(address, lambda _: 0, pop=pop)
    rng, cases = random.Random(772), []
    for level in (1, 2, 3):
        for seed in range(15):
            config = generate(level, seed)
            party = [[rng.randrange(1, 6) for _ in range(4)] for _ in range(16)]
            party[-1] = party[0][:]
            board = Board.new(config, party)
            m.write(logic, config_bytes(config))
            for ptr, traits in zip(characters, party):
                m.write(ptr, trait_bytes(traits))
            while board.remaining_mistakes > 0 and None in board.slots:
                character = rng.choice([i for i in range(16) if i not in board.slots])
                slot = rng.choice([i for i, value in enumerate(board.slots) if value is None])
                for i, value in enumerate(board.slots):
                    m.write(buttons + i * 0x2c, bytes(0x2c))
                    m.write(buttons + i * 0x2c + 0x10, bytes([value is not None]))
                    m.write_u32(buttons + i * 0x2c + 0x1c, value if value is not None else 0xffffffff)
                # Shared drag system has tentatively occupied the clicked slot.
                m.write(buttons + slot * 0x2c + 0x10, b'\x01')
                m.write_u32(buttons + slot * 0x2c + 0x1c, character)
                m.write_u32(scene + 0xbc10, board.remaining_mistakes)
                m.write_u32(scene + 0xbc94, board.remaining_mistakes)
                correct = accepts(config, party, character, slot)
                expected = board.place(character, slot)
                m.call(0x415e70, [slot, character], ecx=scene,
                       stop_at=0x4162da if correct else 0x4160ef)
                assert m.u32(scene + 0xbc94) == expected['remaining_mistakes']
                if not correct:
                    assert m.u32(scene + 0x50) == expected['actual_slot']
                actual = [m.u32(buttons + i * 0x2c + 0x1c)
                          if m.read(buttons + i * 0x2c + 0x10, 1) == b'\x01' else None for i in range(16)]
                assert actual == board.slots
                cases.append({'level': level, 'seed': seed, **expected})
    result = {'status': 'passed', 'source_sha256': SHA, 'cases': len(cases),
              'correct': sum(c['correct'] for c in cases),
              'incorrect': sum(not c['correct'] for c in cases),
              'boundary': '415e70 complete validation/decrement/free-target decision; wrong branch stopped4160ef before animation allocation, correct branch4162da aftersuccess flag. Inert graphics/audio callbacks stubbed; actual4012d0 untouched.',
              'results': cases}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'action-parity.json').write_text(json.dumps(result, indent=2) + '\n')
    return {k: v for k, v in result.items() if k != 'results'}


def export_spec():
    guard()
    manifest = [json.loads(line) for line in (ROOT / 'local/derived/mountain-rescue/manifest.jsonl').read_text().splitlines()]
    assets = [{k: x[k] for k in ('source', 'source_sha256', 'format', 'status')} for x in manifest
              if '/crazy_turtle/' in x['source'].lower() or '/mystic_marsh/traits/' in x['source'].lower()]
    spec = {
        'schema_version': 1, 'game': 'mountain-rescue', 'id': 'mountain-rescue/turtle-hurdle', 'name': 'Turtle Hurdle',
        'state': {'party': 'Ordered incoming list, normally16, four traits each; native character bytes+5..8, values1..5.',
                  'hidden': 'Primary and distinct secondary trait axes, independent permutations of values1..5. Secondary axis only used by validator atlevels3/4.',
                  'board': 'One occupied-or-empty turtle per party member; successful placements are fixed. Remaining dock supports.',
                  'visible': 'Feature-order clue cells, positioned characters, remaining supports. Trait ties have no identity ordering.'},
        'inputs': {'level': [1, 2, 3], 'party_size_boundary_tested': [1, 16],
                   'seed': '32-bit CRT state at401000 entry; menu/ambient draws beforeentry are outside this boundary.'},
        'actions': [
            {'id': 'place', 'parameters': ['unplaced character', 'empty turtle'],
             'legal': 'Dock supports>0 and scene is not animating. Pick/drop shared UI handles occupancy.',
             'rule': 'Stable-sort party by primary rank, then secondary rank atlevel3. Accept if dropped character has same active trait key as any character in that sorted slot.',
             'correct': 'Fix character at requested position; no support consumed.',
             'incorrect': 'Consume one support, fix character at HIGHEST INDEX currently unoccupied slot accepting its active trait key. Even the last incorrect placement rescues that character. Input resumes after animation only if supports remain.'},
            {'id': 'continue', 'rule': 'After all characters placed or dock collapse, Go leaves with placed characters; unplaced characters are stranded.'}],
        'feedback': {'correct': 'Character remains on turtle.', 'incorrect': 'Turtle flips character, which resurfaces at a valid position; one dock support collapses.',
                     'clues': 'Initial clue mask only; mistakes reveal positions, not additional mask entries.',
                     'level3_render_detail': '4165ba checks only primary mask+0x80, then416661..416693 draws BOTH trait rows at that same index. The independently generated secondary mask+0x98 is unused by this renderer.'},
        'success': {'full': 'All incoming characters placed (all success bytes+0x5c=1); normal fullparty is16.',
                    'partial': 'On collapse, every alreadyplaced character including the final mistaken placement survives. Remaining characters do not.',
                    'tie_policy': 'All assignments preserving the active trait keys are valid; stable sort only supplies the reference key sequence.'},
        'failure': {'terminal': 'Support count reaches0; no more placements; any unplaced characters stranded.',
                    'attempt_limits': 'Incorrect placements only:3 atL1;5 or4 atL2;6 atL3. Correct moves unlimited until boardfilled.'},
        'difficulty_levels': [
            {'level': 1, 'axes': 1, 'clues': 'All5 primary value-order cells', 'mistake_limit': 3},
            {'level': 2, 'axes': 1, 'clues': 'k=rand()%2+1 distinctprimary cells sampledwithoutreplacement', 'mistake_limit': '6-k (5 or4)'},
            {'level': 3, 'axes': 2, 'clues': 'One primary index drawn; renderer showsboth value-order rows atthisindex. Separate secondarymask RNGdraw retained but notused byrenderer.', 'mistake_limit': 6}],
        'generation': {'status': 'exact pure Python model and original-function parity',
                       'entry': '0x401000', 'algorithm': [
                           'Draw primary axis rand()%4 from [0,1,2,3]; remove it from candidates.',
                           'Draw primary order by five removal draws with moduli5,4,3,2,1, starting [1,2,3,4,5].',
                           'Draw secondary axis rand()%3 from remaining axes, then secondary order by the samefive removal draws.',
                           'L1: setall6 primary-mask entries1 (sixth is sentinel, five rendered); supports3.',
                           'L2: drawk=rand()%2+1; samplek indices byremoval from[0..4]; supports6-k.',
                           'L3: primarymask[rand()%5]=1, secondarymask[rand()%5]=1; supports6.'],
                       'rng': {'recurrence': 'state=(214013*state+2531011) mod2^32; value=(state>>16)&0x7fff',
                               'calls': {'1': 12, '2': '14 ifk1;15 ifk2', '3': 14}},
                       'solvability': 'Sorting the actualparty provides a complete solution for every validparty. No rejection/fallback/reshuffling of puzzle parameters.',
                       'diagnostic_level4': 'Same two-axis sort, noinitialclues,7supports; notnormaldifficulty.'},
        'assets': {'corpus_manifest': 'local/derived/mountain-rescue/manifest.jsonl', 'files': assets,
                   'bindings': {'scene': 'crazy_turtle/area.bmt plusdock/turtle AN/ANM; sourcepaths/hashes above',
                                'traits': 'Native renderer scene+0xbc2c indexes6*axis+value; fouraxesvalues1..5; imagesfrommystic_marsh/TRAITS.',
                                'slot_coordinates_table': {'va': '0x48be60', 'file_offset': 0x8be60, 'record_size': 12, 'records': 16},
                                'clue_coordinates_table': {'va': '0x48bd90', 'file_offset': 0x8bd90, 'rows': 2, 'columns': 5}}},
        'evidence': {'executable': {'path': str(EXE.relative_to(ROOT)), 'sha256': SHA},
                     'manual': {'path': 'local/discs/mountain-rescue/INSTALL/Data/Zoombinimr.pdf', 'sha256': '59c8950e5b7e81eca6daa1d91028302584853a9cda4683ee813ec13cc43e44c3', 'pdf_pages': [15, 28, 29],
                                'correction': 'Manual callsL2 allowance4; nativehas5 whenonly1clue.'},
                     'native_ranges': {'generator': ['0x401000', '0x4012ba'], 'placement_validator': ['0x4012d0', '0x40191e'],
                                       'placement_callback': ['0x415e70', '0x41635e'], 'clue_renderer': ['0x416540', '0x4166ac'],
                                       'collapse_completion': ['0x415380', '0x4154e7'], 'scene_constructor': '0x4166b0'},
                     'offset_rule': 'For these text/data addresses, fileoffset=VA-0x400000; hashguard required.'},
        'validation': {'generator_and_predicate': json.loads((OUT / 'parity.json').read_text()),
                       'placement_transition': json.loads((OUT / 'action-parity.json').read_text())},
        'open_questions': [],
        'completeness': {'status': 'complete puzzle-logic boundary',
                         'covered': ['allnormal difficulty branches', 'exact generator and RNG sequence', 'allvalid trait-placement predicates', 'tiebehavior', 'mistakebudget', 'correctiontarget', 'fullandpartialsuccess'],
                         'excluded': ['pixelinteraction/animation timing', 'sharedcampaign menus/saves', 'arbitrary corrupttraitrecords oroutofrangelevels'],
                         'qualification': 'Placement transition native-compared through decision sideeffects; animationcompletion/Go flow staticallytraced. Normal incoming party16; validator also paritytested1..16.'}}
    output = ROOT / 'local/specs/mountain-rescue/turtle-hurdle.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(spec, indent=2) + '\n')
    return {'output': str(output), 'asset_files': len(assets), 'status': spec['completeness']['status']}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--validate', action='store_true')
    parser.add_argument('--validate-actions', action='store_true')
    parser.add_argument('--export', action='store_true')
    args = parser.parse_args()
    if args.validate:
        print(json.dumps(validate(), indent=2))
    if args.validate_actions:
        print(json.dumps(validate_actions(), indent=2))
    if args.export:
        print(json.dumps(export_spec(), indent=2))


if __name__ == '__main__':
    main()
