#!/usr/bin/env python3
"""Boolie Boggle: exact generators, binary carry, and finite-horizon models."""
import argparse
from collections import Counter
import itertools
import json
import struct
from spec_mr_turtle_hurdle import ROOT, SHA, Rand

OUT=ROOT/'local/analysis/mountain-rescue-boolie-boggle'


def group_length(level):
    if level not in (1,2,3,4):raise ValueError('Normal levels 1..3; diagnostic level 4')
    return min(level+1,4)


def mood_rows(level,rng):
    k=group_length(level)
    rows=[]
    for _ in range(3):
        if level==1:
            r=~rng.next(3)
            row=[(r&1)+1,((r>>1)&1)+1,0,0]
        else:
            row=[rng.next(2)+1 for _ in range(k-1)]
            row.append(2 if all(v==1 for v in row) else rng.next(2)+1)
            row += [0]*(4-k)
        rows.append(row)
    return rows


def cluster(level,rng):
    if level==1:return rng.next(30)//10+1
    if level==2:return rng.next(4)+1
    if level==3:return rng.next(5)+1
    while True:
        result=rng.next(9)-2
        if result:return result


def budget(level,size):
    if not 1<=size<=16:raise ValueError('Incoming party must have 1..16 characters')
    group_length(level)
    if level==1:return 2*size+(size+3)//4+1
    if level==2:return 3*size+(size+1)//2+1
    if level==3:return 4*size+1
    return 3*size+(size+1)//2+4


def value(row):
    return sum((v==1)<<i for i,v in enumerate(row))


def generate(level,size,seed):
    rng=Rand(seed)
    current=cluster(level,rng)
    rows=mood_rows(level,rng)
    return dict(level=level,size=size,bits=group_length(level),budget=budget(level,size),
                current=current,rows=rows,values=[value(r) for r in rows],
                rng_state=rng.state,rng_trace=rng.trace)


def carry(row,amount):
    """Atomic completed cluster. Native order is low bit first, with overflow."""
    row=row.copy();events=[]
    active=next((i for i,x in enumerate(row) if x==0),len(row))
    for _ in range(abs(amount)):
        for bit in range(active):
            before=row[bit];row[bit]=3-before
            events.append((bit,row[bit]))
            if (amount>0 and before==2) or (amount<0 and before==1):break
    return dict(row=row,value=value(row),events=events,complete=all(v!=2 for v in row))


def first_boat(values,clusters,bits):
    """Exact finite-prefix reachability; no knowledge restriction or RNG model.

    A witness is a lane sequence. No witness proves only that this supplied
    increment prefix cannot make any boat, not that a game seed is unwinnable.
    """
    states={tuple(values):[]};maximum=(1<<bits)-1
    for amount in clusters:
        following={}
        for state,path in states.items():
            for lane in range(3):
                updated=list(state);updated[lane]=(updated[lane]+amount)&maximum
                candidate=path+[lane]
                if updated[lane]==maximum:return dict(witness=candidate,steps=len(candidate))
                following.setdefault(tuple(updated),candidate)
        states=following
    return dict(witness=None,reachable_states=len(states))


def settled_action(state,lane,amount,replacement=None):
    """Discrete completed launch, supplied cluster and replacement inputs.

    Waiting for carry and boarding to settle is part of this action contract.
    Earlier clicking during animations is not modeled as a new puzzle rule.
    """
    result={**state,'values':state['values'].copy()}
    level=state['level']
    support=range(1,level+3) if level<4 else (-2,-1,1,2,3,4,5,6)
    if amount not in support:raise ValueError('Cluster outside this level\'s support')
    if lane not in range(3) or state['used']>=state['budget'] or state['rescued']>=state['size']:
        raise ValueError('Launch unavailable')
    limit=(1<<state['bits'])-1
    result['values'][lane]=(result['values'][lane]+amount)&limit
    result['used']+=1
    reward=result['values'][lane]==limit
    if reward:
        result['rescued']+=1
        if result['rescued']<state['size']:
            if replacement is None or not 0<=replacement<limit:raise ValueError('A generated replacement row is required')
            result['values'][lane]=replacement
    result['last_reward']=int(reward)
    return result


class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX
        self.m=m=NativeOracle('mountain-rescue')
        self.scene=m.alloc(0x600);self.thread=m.alloc(256);self.trace=[]
        m.hook(0x46ec98,lambda _:self.thread)
        def record(uc,address,size,unused):
            self.trace.append(dict(rand=m.reg(UC_X86_REG_EAX),state=m.u32(self.thread+20)))
        m.uc.hook_add(UC_HOOK_CODE,record,begin=0x46c7e1,end=0x46c7e1)

    def call(self,address):
        from unicorn.x86_const import UC_X86_REG_ECX
        return self.m.call(address,registers={UC_X86_REG_ECX:self.scene})

    def reset(self,level,seed,size=16):
        m=self.m;m.write(self.scene,bytes(0x600));m.write_u32(self.scene+0xc,level)
        m.write_u32(self.scene+0x300,size);m.write_u32(self.thread+20,seed);self.trace.clear()

    def generate(self,level,size,seed):
        self.reset(level,seed,size);m=self.m;self.call(0x40de40)
        rows=[list(struct.unpack('<4I',m.read(0x48a470+16*i,16))) for i in range(3)]
        return dict(bits=m.u32(self.scene+0x2fc),budget=m.u32(self.scene+0x30c),
                    current=m.u32(self.scene+0x250),rows=rows,rng_state=m.u32(self.thread+20),rng_trace=self.trace.copy())

    def replacement(self,level,seed):
        self.reset(level,seed);self.call(0x40dc20);m=self.m
        return dict(rows=[list(struct.unpack('<4I',m.read(0x4ac178+16*i,16))) for i in range(3)],
                    rng_state=m.u32(self.thread+20),rng_trace=self.trace.copy())

    def carry(self,row,amount,lane=0):
        from unicorn.x86_const import UC_X86_REG_ECX
        m=self.m;m.write(0x4ac114,bytes(0x290));m.write_u32(self.scene+0x18c,0)
        k=next((i for i,x in enumerate(row) if x==0),len(row))
        m.write_u32(self.scene+0x2fc,k);m.write_u32(self.scene+0x250,amount&0xffffffff)
        for i,v in enumerate(row):m.write_u32(0x4ac198+36*(4*lane+i),v)
        for _ in range(abs(amount)):
            m.call(0x40d7d0,[4*lane],registers={UC_X86_REG_ECX:self.scene})
        result=[m.u32(0x4ac198+36*(4*lane+i)) for i in range(4)]
        return result

    def exhaustion(self,used,limit,already_ended=False):
        from unicorn.x86_const import UC_X86_REG_ESI
        m=self.m;m.write_u32(self.scene+0x308,used);m.write_u32(self.scene+0x30c,limit)
        m.write(self.scene+0x1a,bytes([already_ended]));m.write(self.scene+0x27a,b'\0')
        m.call(0x40c28f,registers={UC_X86_REG_ESI:self.scene},stop_at=0x40c2b3)
        return bool(m.read(self.scene+0x1a,1)[0]),bool(m.read(self.scene+0x27a,1)[0])

    def boarding_eligibility(self,rows,busy_lane=None,pending=0):
        from unicorn.x86_const import UC_X86_REG_ESI,UC_X86_REG_EDI
        m=self.m
        m.write(0x48a470,struct.pack('<12I',*(x for row in rows for x in row)))
        m.write(self.scene+0x2c0,bytes(int(i==busy_lane) for i in range(3)))
        m.write_u32(self.scene+0x18c,pending)
        m.hook(0x408aec,lambda _:1)
        m.hook(0x4090cd,lambda _:0)
        accepted=m.call(0x408a64,registers={UC_X86_REG_ESI:self.scene})
        return m.reg(UC_X86_REG_EDI) if accepted else None


def validate(count=100):
    o=Oracle();generators=replacements=carry_cases=budget_cases=boarding_cases=0
    for level in (1,2,3,4):
        for n in (1,2,7,8,16):
            for seed in range(count):
                native=o.generate(level,n,seed);pure=generate(level,n,seed)
                for key in ('bits','budget','rows','rng_state'):assert native[key]==pure[key],(level,n,seed,key)
                assert native['current']==pure['current']&0xffffffff
                assert native['rng_trace']==[{k:v for k,v in r.items() if k!='modulus'} for r in pure['rng_trace']]
                generators+=1
        for seed in range(count):
            rng=Rand(seed);rows=mood_rows(level,rng);native=o.replacement(level,seed)
            assert native['rows']==rows and native['rng_state']==rng.state
            assert native['rng_trace']==[{k:v for k,v in r.items() if k!='modulus'} for r in rng.trace]
            replacements+=1
        k=group_length(level)
        amounts=range(1,(3,4,5,6)[level-1]+1) if level<4 else (-2,-1,1,2,3,4,5,6)
        for bits in itertools.product((1,2),repeat=k):
            row=list(bits)+[0]*(4-k)
            for amount in amounts:
                for lane in range(3):
                    native=o.carry(row,amount,lane);pure=carry(row,amount)
                    assert native==pure['row'],(level,row,amount,lane,native,pure)
                    assert pure['value']==(value(row)+amount)%(1<<k)
                    carry_cases+=1
        for n in (1,2,7,8,16):
            limit=budget(level,n)
            for used in (0,limit-1,limit,limit+1):
                for ended in (False,True):
                    actual=o.exhaustion(used,limit,ended)
                    expected=ended or used>=limit
                    assert actual==(expected,not expected),(level,n,used,ended,actual)
                    budget_cases+=1
        for flags in itertools.product((False,True),repeat=3):
            rows=[([1]*k if full else [2]+[1]*(k-1))+[0]*(4-k) for full in flags]
            for busy in (None,0,1,2):
                for pending in (0,1):
                    actual=o.boarding_eligibility(rows,busy,pending)
                    expected=next((i for i,v in enumerate(flags) if v),None) if busy is None and not pending else None
                    assert actual==expected,(level,flags,busy,pending,actual,expected)
                    boarding_cases+=1
    # A minimal independent obstruction: all values and increments are even,
    # while the all-happy target is odd. The planner must not invent a witness.
    obstruction=first_boat([0,2,0],[2]*budget(1,1),2)
    assert obstruction['witness'] is None
    witnesses=0
    for bits in (2,3,4):
        limit=(1<<bits)-1
        for values in itertools.product(range(limit),repeat=3):
            result=first_boat(values,[1]*limit,bits)
            assert result['witness'] is not None
            v=list(values)
            for lane in result['witness']:v[lane]=(v[lane]+1)&limit
            assert limit in v
            witnesses+=1
    return dict(status='passed',source_sha256=SHA,generator_cases=generators,replacement_generator_cases=replacements,
                exhaustive_carry_cases=carry_cases,native_exhaustion_gates=budget_cases,first_boat_witnesses=witnesses,
                native_boarding_eligibility_cases=boarding_cases,
                unsatisfiable_increment_prefix=dict(bits=2,values=[0,2,0],clusters=[2]*budget(1,1),**obstruction),
                scope='Original full 40de40 generator, 40dc20 replacement generator, and 40d7d0 per-ball carry helper. No rendering or game process.')


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--count',type=int,default=100);args=p.parse_args()
    result=validate(args.count);OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
