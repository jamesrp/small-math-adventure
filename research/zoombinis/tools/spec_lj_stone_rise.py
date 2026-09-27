#!/usr/bin/env python3
"""Stone Rise exact native generator export and independent graph rule model.

The generator backend executes only the supplied, hash-checked code in memory.
It is not described as an independent high-level generator port. Generated
records, witnesses, topology, label rules and ordered RNG calls are exported.
"""
import argparse
from collections import Counter, deque
import json
import struct
from native_analysis import ROOT, KNOWN_SHA256
from spec_lj_mudball_wall import Random


def easy_pairing(party, seed):
    """Independent translation of 43b4d0, including accumulated-single retry quirk."""
    rng = Random(seed)
    axis = rng.draw(3)
    traits = [list(t) for t in party]
    singles_total = 0
    for attempt in range(10):
        used, labels, groups = [0]*len(party), [], []
        for i, current in enumerate(traits):
            if used[i]:
                continue
            for _ in range(4):
                axis = (axis+1)%4
                found = next((j for j in range(i+1,len(party)) if not used[j] and current[axis]==traits[j][axis]),None)
                if found is not None:
                    used[i]=used[found]=1
                    labels.append(510+axis)
                    groups.append([i,found])
                    break
            if not used[i]:
                used[i]=99
                labels.append(501)
                groups.append([i])
                singles_total+=1
        done = singles_total==0 or (singles_total==1 and len(party)%2)
        if not done:
            for j in reversed(range(len(party))):
                if used[j]==99 and used[0]!=99:
                    traits[0],traits[j]=traits[j],traits[0]
        if done or attempt==9:
            return dict(labels=labels,working_traits=traits,used=used,groups=groups,passes=attempt+1,
                        rng_trace=rng.trace,rng_exit=rng.state)


def decode_graph(records):
    pads = [i for i,r in enumerate(records) if r[1] in (506,507,508)]
    sources = [i for i,r in enumerate(records) if r[1] in (504,505)]
    labels=[]
    for i,r in enumerate(records):
        if r[1] not in (501,502):continue
        neighbors=[x for x in r[3:] if 0<=x<117 and records[x][1]!=500]
        axis=r[2]-510 if 510<=r[2]<=513 else None
        labels.append(dict(cell=i,axis=axis,neighbors=neighbors))
    return dict(pads=pads,sources=sources,links=labels)


def triple_pairing(party, seed):
    """Independent 43b810/43b9f0 labels and random consumption (UI level 2)."""
    rng=Random(seed)
    used=[False]*len(party)
    labels=[]
    start=0
    def match(source):
        axis=rng.draw(3)
        for _ in range(4):
            axis=(axis+1)%4
            for i,t in enumerate(party):
                if i!=source and not used[i] and t[axis]==party[source][axis]:
                    return i,axis
        return None,None
    for _ in range((len(party)+2)//3):
        used[start]=True
        second,axis=match(start)
        labels.append(501 if second is None else 510+axis)
        if second is None:
            second=next((i for i in range(1,len(party)) if not used[i]),None)
        if second is None:break
        used[second]=True
        if all(used):break
        third,axis=match(second)
        labels.append(501 if third is None else 510+axis)
        if third is None:
            third=max(i for i in range(1,len(party)) if not used[i])
        used[third]=True
        if all(used):break
        start=max(i for i in range(1,len(party)) if not used[i])
    return dict(labels=labels,used=used,rng_trace=rng.trace,rng_exit=rng.state)


def powered(board, placement):
    """Source-connected occupied pads; matching links conduct independently."""
    records, party = board['records'],board['party']
    pads=set(board['graph']['pads'])
    blocked=set()
    for i,r in enumerate(records):
        if r[1]==500 or (i in pads and i not in placement):
            blocked.add(i)
        elif r[1] in (501,502) and 510<=r[2]<=513:
            neighbors=[j for j in r[3:] if 0<=j<117 and j in pads]
            if len(neighbors)!=2 or any(j not in placement for j in neighbors):
                blocked.add(i)
            elif party[placement[neighbors[0]]][r[2]-510]!=party[placement[neighbors[1]]][r[2]-510]:
                blocked.add(i)
    reached=set(board['graph']['sources'])
    queue=deque(reached)
    while queue:
        i=queue.popleft()
        for j in records[i][3:]:
            if 0<=j<117 and j not in blocked and j not in reached:
                reached.add(j);queue.append(j)
    return sorted(pads&reached)


def move(board, placement, character, target=None):
    if not 0<=character<len(board['party']):
        raise ValueError('Unknown character')
    result={k:v for k,v in placement.items() if v!=character}
    if target is not None:
        if target not in board['graph']['pads'] or target in result:
            raise ValueError('Target must be an empty pad')
        result[target]=character
    return result


def player_records(board):
    """Normalize constructor occupants to the actual empty player-facing board."""
    records=[r.copy() for r in board['records']]
    for i in board['graph']['pads']:
        records[i][1]=506
        records[i][2]=0
    return records


def solve_strong(board, node_limit=200000):
    """Find a sufficient witness satisfying every named link, without requiring
    this stronger condition of players. Bounded failure is not unsolvability."""
    pads, party = board['graph']['pads'], board['party']
    constraints = {v:[] for v in pads}
    for edge in board['graph']['links']:
        ends=[v for v in edge['neighbors'] if v in constraints]
        if edge['axis'] is not None and len(ends)==2:
            a,b=ends
            constraints[a].append((b,edge['axis']));constraints[b].append((a,edge['axis']))
    placement={}; nodes=0
    def search(remaining):
        nonlocal nodes
        nodes+=1
        if nodes>node_limit:return None
        if not remaining:
            return placement.copy() if len(powered(board,placement))==len(party) else None
        best=None
        for v in pads:
            if v in placement:continue
            options=[i for i in remaining if all(w not in placement or party[i][axis]==party[placement[w]][axis] for w,axis in constraints[v])]
            if not options:return None
            candidate=(len(options),-len(constraints[v]),v,options)
            if best is None or candidate[:3]<best[:3]:best=candidate
        _,_,v,options=best
        seen=set()
        for i in options:
            signature=tuple(party[i])
            if signature in seen:continue
            seen.add(signature);placement[v]=i
            answer=search(remaining-{i})
            if answer is not None:return answer
            del placement[v]
        return None
    witness=search(set(range(len(party))))
    return dict(witness=witness,nodes=nodes,status='witness' if witness is not None else 'bounded-search-exhausted' if nodes>node_limit else 'no-all-links-witness')


class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX
        self.m=m=NativeOracle('logical-journey')
        self.entities={i+1:m.alloc(0x200) for i in range(16)}
        self.graphic=m.alloc(0x200)
        m.hook(0x456380,lambda m:self.entities.get(m.arg(0)&65535,self.graphic),pop=4)
        for address in (0x456a60,0x4588d0,0x43f630):
            m.hook(address,lambda m:0)
        m.hook(0x40fb80,lambda m:0)
        m.write_u16(0x48bc28,0)
        self.trace=[]
        def before(uc,address,size,unused):self.trace.append([m.arg(0)&65535,None])
        def after(uc,address,size,unused):self.trace[-1][1]=m.reg(UC_X86_REG_EAX)&65535
        m.uc.hook_add(UC_HOOK_CODE,before,begin=0x40f9a0,end=0x40f9a0)
        for a in (0x40fa0d,0x40f9c7):m.uc.hook_add(UC_HOOK_CODE,after,begin=a,end=a)

    def generate(self,level,seed,party):
        assert 1<=level<=4 and 1<=len(party)<=16
        m=self.m
        m.write(0x49bd80,bytes(0xd00))
        for i in range(117):m.write_u16(0x49bd82+18*i,500)
        for i,t in enumerate(party):
            m.write(self.entities[i+1]+0xf0,bytes(t));m.write_u16(self.entities[i+1]+0x1a,i+1)
        m.write_u16(0x49c784,level-1)
        m.write_u16(0x49c5d8,len(party))
        m.write(0x4a2060,struct.pack('<16H',*range(1,17)))
        m.write_u32(0x4959d0,seed)
        self.trace.clear()
        m.call(0x43d6d0,stop_at=0x43e986,max_instructions=5000000)
        records=[list(struct.unpack('<9h',m.read(0x49bd80+18*i,18))) for i in range(117)]
        graph=decode_graph(records)
        row=dict(level=level,seed=seed,party=[list(t) for t in party],records=records,graph=graph,
                 witness={i:r[2]-1 for i,r in enumerate(records) if r[1]==507 and r[2]>0},
                 labels=list(struct.unpack('<16h',m.read(0x49c788,32))),
                 ordered_slots=list(struct.unpack('<'+str(m.u16(0x49c81c))+'H',m.read(0x49c7b2,2*m.u16(0x49c81c)))),
                 color_variant=m.u16(0x49c980)-504,rng_exit=m.u32(0x4959d0),rng_trace=self.trace.copy(),
                 generator_backend='Original hash-checked 43d6d0; no high-level independent generator parity claim.')
        # Native stores initial witness in inactive pad data, then normalizes 507 to506 during graphics setup.
        return row

    def evaluate(self,board,placement):
        m=self.m
        # A saved board must not inherit party/level/slot state from the most
        # recently generated board in this reusable oracle.
        for i,t in enumerate(board['party']):
            m.write(self.entities[i+1]+0xf0,bytes(t));m.write_u16(self.entities[i+1]+0x1a,i+1)
        m.write_u16(0x49c784,board['level']-1)
        m.write_u16(0x49c5d8,len(board['party']))
        m.write_u16(0x49c980,504+board['color_variant'])
        m.write(0x4a2060,struct.pack('<16H',*range(1,17)))
        m.write(0x49c788,struct.pack('<16h',*board['labels']))
        slots=board['ordered_slots']
        m.write_u16(0x49c81c,len(slots))
        m.write(0x49c7b2,struct.pack('<'+str(len(slots))+'H',*slots))
        for i,r in enumerate(board['records']):
            r=r.copy();r[0]=1000+i
            if i in board['graph']['pads']:
                r[1]=507 if i in placement else 506
                r[2]=placement[i]+1 if i in placement else 0
            m.write(0x49bd80+18*i,struct.pack('<9h',*r))
        m.write_u16(0x49c5c8,1) # suppress success speech RNG; no rule effects
        m.write_u16(0x49c988,1) # suppress optional four-character celebration
        if board['level']<=2:
            for i,cell in enumerate(board['ordered_slots'],1):
                if cell in placement:
                    m.write_u16(0x49c75a,i);m.call(0x43b090)
        else:m.call(0x43bf30)
        return sorted(i for i in board['graph']['pads'] if m.u16(0x49bd82+18*i)==508)


def validate(count=30):
    oracle=Oracle()
    reports=[];generated=checks=pairings=triples=witnesses=0; witness_search=[]
    import random
    for level in range(1,5):
        for n in (1,2,5,7,16):
            for kind in ('mixed','identical','distinct'):
                party=[[1]*4 if kind=='identical' else [(i//(5**j)+i*j)%5+1 for j in range(4)] if kind=='mixed' else [(i+j)%5+1 for j in range(4)] for i in range(n)]
                for seed in range(count):
                    board=oracle.generate(level,seed,party);generated+=1
                    if level==1:
                        pure=easy_pairing(party,seed)
                        assert board['labels'][:len(pure['labels'])]==pure['labels'],(n,kind,seed,'labels',board['labels'],pure)
                        assert board['rng_trace']==pure['rng_trace'] and board['rng_exit']==pure['rng_exit']
                        pairings+=1
                    if level==2:
                        pure=triple_pairing(party,seed)
                        assert board['labels'][:len(pure['labels'])]==pure['labels'],(n,kind,seed,'triple-labels',board['labels'],pure)
                        assert board['rng_trace']==pure['rng_trace'] and board['rng_exit']==pure['rng_exit'],(n,kind,seed,'triple-rng')
                        triples+=1
                    if seed<3:
                        rng=random.Random(seed)
                        for trial in range(10):
                            pads=board['graph']['pads'].copy();rng.shuffle(pads)
                            order=list(range(n));rng.shuffle(order)
                            placement=dict(zip(pads[:trial*n//9],order))
                            expected=powered(board,placement);actual=oracle.evaluate(board,placement)
                            assert actual==expected,(level,n,kind,seed,trial,placement,actual,expected)
                            checks+=1
                    if seed==0:
                        result=solve_strong(board)
                        if result['witness'] is not None:
                            actual=oracle.evaluate(board,result['witness'])
                            assert len(actual)==n,(level,n,kind,'witness',actual,result)
                            witnesses+=1
                        witness_search.append(dict(level=level,n=n,party_kind=kind,**result))
                    if seed==0 and n==16:reports.append(board)
    return dict(status='passed',source_sha256=KNOWN_SHA256['logical-journey'],native_generator_exports=generated,
                independent_easy_pairing_cases=pairings,independent_triple_pairing_cases=triples,native_power_states=checks,native_solution_witnesses=witnesses,witness_search=witness_search,examples=reports)

if __name__=='__main__':
    from pathlib import Path
    parser=argparse.ArgumentParser();parser.add_argument('--count',type=int,default=30)
    parser.add_argument('--export-board',type=int,choices=(1,2,3,4),metavar='LEVEL')
    parser.add_argument('--party-json',type=Path,help='JSON list of four-trait records, values 1..5')
    parser.add_argument('--seed',type=lambda s:int(s,0),default=0)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    if args.export_board:
        if not args.party_json or not args.output:parser.error('--export-board requires --party-json and --output')
        party=json.loads(args.party_json.read_text())
        if not isinstance(party,list) or not 1<=len(party)<=16 or any(not isinstance(t,list) or len(t)!=4 or any(type(v) is not int or not 1<=v<=5 for v in t) for t in party):
            parser.error('Party must contain 1..16 four-trait records, each value 1..5')
        board=Oracle().generate(args.export_board,args.seed,party)
        board.update(schema_version=1,source_sha256=KNOWN_SHA256['logical-journey'],initial_placement={},initial_records=player_records(board))
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(board,indent=2)+'\n')
        print(json.dumps(dict(output=str(args.output),pads=len(board['graph']['pads']),rng_calls=len(board['rng_trace']))))
        raise SystemExit
    report=validate(args.count)
    out=ROOT/'local/analysis/logical-journey-stone-rise/validation.json'
    out.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k not in ('examples','witness_search')}))
