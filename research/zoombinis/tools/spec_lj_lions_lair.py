#!/usr/bin/env python3
"""Lion's Lair generator, rank slots and settled placement semantics."""
import argparse
from collections import Counter
import json
import math
import struct
from native_analysis import ROOT, KNOWN_SHA256
from spec_lj_mirror_machine import Random


def generate(level, seed, party, first_visit=False):
    assert 1 <= level <= 4 and 1 <= len(party) <= 20
    assert all(len(t) == 4 and all(1 <= v <= 5 for v in t) for t in party)
    rng, axes, orders, pool = Random(seed), [], [], list(range(4))
    for j in range(2):
        index = rng.draw(0, len(pool)-1)
        if j == 0 and first_visit:
            index = 2
        axes.append(pool[index])
        if j == 0:
            pool.pop(index)
        values, order = list(range(1, 6)), []
        while values:
            order.append(values.pop(rng.draw(1, len(values))-1))
        orders.append(order)
    active = 1 if level <= 2 else 2
    keys = sorted([[t[axes[j]] for j in range(active)] for t in party],
                  key=lambda k: tuple(orders[j].index(v) for j, v in enumerate(k)))
    masks = [[0]*5 for _ in range(2)]
    if level == 1:
        masks[0] = [1]*5
    elif level in (2, 3):
        for j in range(active):
            values = list(range(5))
            for _ in range(rng.draw(2, 2)):
                masks[j][values.pop(rng.draw(1, len(values))-1)] = 1
    glyphs = [[orders[j][i]+5*axes[j] if masks[j][i] else 0 for i in range(5)] for j in range(2)]
    return dict(level=level, party=[list(t) for t in party], axes=axes, orders=orders,
                active_axes=active, first_slot=21-len(party), slot_keys=keys,
                clue_masks=masks, clue_glyphs=glyphs, mistake_limit=level+3,
                rng_exit=rng.state, rng_trace=rng.trace)


def valid_slots(board, traits, occupied):
    key = [traits[a] for a in board['axes'][:board['active_axes']]]
    return [board['first_slot']+i for i, expected in enumerate(board['slot_keys'])
            if expected == key and board['first_slot']+i not in occupied]


def evaluate(board, traits, requested, occupied, seed):
    choices = valid_slots(board, traits, occupied)
    rng = Random(seed)
    result = requested if requested in choices else choices[rng.draw(0, len(choices)-1)] if choices else 1
    return dict(slot=result, correct=requested == result, rng_exit=rng.state, rng_trace=rng.trace)


def place(board, state, character, requested):
    if state['mistakes'] >= board['mistake_limit'] or len(state['occupied']) == len(board['party']):
        raise ValueError('Puzzle is closed')
    if character in state['occupied'].values():
        raise ValueError('Seated characters cannot be moved')
    if not board['first_slot'] <= requested <= 20 or requested in state['occupied']:
        raise ValueError('Drag target must be an empty active slot')
    result = evaluate(board, board['party'][character], requested, state['occupied'], state['rng'])
    occupied = dict(state['occupied'])
    occupied[result['slot']] = character
    return dict(occupied=occupied, mistakes=state['mistakes']+int(not result['correct']),
                rng=result['rng_exit'], last=result)


class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX
        self.m = m = NativeOracle('logical-journey')
        self.party = m.alloc(84)
        self.entity = m.alloc(0x200)
        self.initial_first_visit = m.u16(0x48b766)
        m.hook(0x44a920, lambda m: self.party)
        m.hook(0x456380, lambda m: self.entity, pop=4)
        m.write_u16(0x48bc28, 0)
        self.trace = []
        def before(uc, address, size, unused):
            self.trace.append([m.arg(0)&65535, m.arg(1)&65535, None])
        def after(uc, address, size, unused):
            self.trace[-1][2] = m.reg(UC_X86_REG_EAX)&65535
        m.uc.hook_add(UC_HOOK_CODE, before, begin=0x401070, end=0x401070)
        m.uc.hook_add(UC_HOOK_CODE, after, begin=0x401084, end=0x401084)

    def generate(self, level, seed, party, first_visit=False):
        m, n = self.m, len(party)
        m.write(0x4945e8, bytes(0x294))
        m.write(self.party, struct.pack('<HH', n, 0)+bytes(v for t in party for v in t))
        m.call(0x409d90, [level])
        m.write_u16(0x494658, level)
        m.write_u16(0x494876, n)
        m.write_u16(0x49486e, 21-n)
        m.write_u16(0x48b766, first_visit)
        m.write_u32(0x4959d0, seed)
        self.trace.clear()
        m.call(0x409e70)
        m.call(0x40a090, [level])
        words = lambda a, n: list(struct.unpack('<'+'H'*n, m.read(a, 2*n)))
        active = m.u16(0x494858)
        primary, secondary = words(0x494720,21), words(0x49474a,21)
        return dict(axes=words(0x4945e8,2), orders=[words(0x4946cc,5),words(0x4946d6,5)],
                    active_axes=active, first_slot=21-n,
                    slot_keys=[[primary[i]]+([secondary[i]] if active==2 else []) for i in range(21-n,21)],
                    clue_masks=[words(0x4947f6,5),words(0x494800,5)],
                    clue_glyphs=[words(0x49465e,5),words(0x494668,5)],
                    mistake_limit=m.u16(0x494864), rng_exit=m.u32(0x4959d0),rng_trace=self.trace.copy())

    def evaluate(self, traits, requested, occupied, seed):
        m = self.m
        m.write(self.entity+0xf0, bytes(traits))
        m.write(0x49480c, struct.pack('<21H', *[int(i in occupied) for i in range(21)]))
        m.write_u32(0x4959d0, seed)
        self.trace.clear()
        slot = m.call(0x40a420, [1, requested])&65535
        return dict(slot=slot, correct=slot==requested, rng_exit=m.u32(0x4959d0),rng_trace=self.trace.copy())


def validate(count=100):
    oracle, generators, validators, witnesses, examples = Oracle(), 0, 0, 0, []
    for level in range(1, 5):
        for n in (1, 2, 7, 16, 20):
            for twin in (False, True):
                party = [[1]*4 if twin else [(i//(5**j)+i*j)%5+1 for j in range(4)] for i in range(n)]
                for seed in range(count):
                    first = seed % 2 == 0
                    row = generate(level, seed, party, first)
                    native = oracle.generate(level, seed, party, first)
                    for key, value in native.items():
                        assert value == row[key], (level,n,twin,seed,key,value,row[key])
                    generators += 1
                    if seed < 3:
                        for index, traits in enumerate(party):
                            occupied = {j: 1 for j in range(21-n, 21) if (j+index)%3==0}
                            for requested in (0, 21-n, 20, 21):
                                expected = evaluate(row, traits, requested, occupied, seed)
                                actual = oracle.evaluate(traits, requested, occupied, seed)
                                assert actual == expected, (level,n,seed,index,requested,actual,expected)
                                validators += 1
                        state = dict(occupied={},mistakes=0,rng=row['rng_exit'])
                        for index, traits in enumerate(party):
                            slot = valid_slots(row, traits, state['occupied'])[0]
                            state = place(row,state,index,slot)
                        assert len(state['occupied']) == n and state['mistakes']==0
                        witnesses += 1
                    if seed==0 and n==16 and not twin:
                        multiplicities = Counter(tuple(k) for k in row['slot_keys'])
                        examples.append(dict(board=row, valid_final_assignments=math.prod(math.factorial(v) for v in multiplicities.values())))
    # Exercise the original final-mistake gate after settled animation callbacks.
    m = oracle.m
    from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_EDI
    m.hook(0x4573f0, lambda m: 0)
    for level in range(1, 5):
        m.call(0x409d90,[level])
        for mistakes in range(level+4):
            m.write_u16(0x494866, mistakes)
            m.call(0x408ede)
            assert m.u16(0x494856) == int(mistakes==level+3)
    return dict(status='passed',source_sha256=KNOWN_SHA256['logical-journey'],
                generation_cases=generators,validator_cases=validators,solution_witnesses=witnesses,
                native_budget_gate_cases=sum(range(5,9)),initial_first_visit_flag=oracle.initial_first_visit,
                examples=examples,boundary='409d90;409e70;40a090;40a420 unchanged. Party and entity access replaced by exact trait records; native RNG retained. Settled gate408ede tested; whole animation callbacks not replayed.')

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--count',type=int,default=100)
    args=parser.parse_args()
    report=validate(args.count)
    out=ROOT/'local/analysis/logical-journey-lions-lair/validation.json'
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='examples'}))
