#!/usr/bin/env python3
"""Native-derived Titanic Tattooed Toads board and movement specification."""
from __future__ import annotations
import argparse
from collections import Counter, deque
import hashlib
import json
from pathlib import Path
import struct
import random
from dataclasses import dataclass, field
from logical_bridge_generator import SOURCE_SHA256, LEVEL_NAMES
from native_analysis import logical_journey_random

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / 'local/derived/logical-journey'
OUT = ROOT / 'local/analysis/logical-journey-titanic-tattooed-toads'


class Random:
    def __init__(self, state):
        self.state = state & 0xffffffff
        self.trace = []

    def draw(self, lo, hi):
        before = self.state
        self.state, value = logical_journey_random(self.state, hi - lo)
        value += lo
        self.trace.append({'minimum': lo, 'maximum': hi, 'result': value,
                           'state_before': before, 'state_after': self.state})
        return value


def templates():
    manifest = {r['raw_path']: r for r in map(json.loads, (CORPUS/'resources.jsonl').read_text().splitlines())}
    result = []
    for resource in (15000, 15001, 15002):
        relative = f'resources/lilly/REGS/{resource:05}.bin'
        raw = (CORPUS / relative).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == manifest[relative]['sha256']
        values = struct.unpack('>144h', raw)
        result.append([list(values[row*12:row*12+12]) for row in range(12)])
    return result


def transform(grid, operation):
    if operation == 'clockwise':
        return [[grid[11-col][row] for col in range(12)] for row in range(12)]
    if operation == 'half-turn':
        return [row[::-1] for row in grid[::-1]]
    if operation == 'horizontal-reflection':
        return [row[::-1] for row in grid]
    if operation == 'vertical-reflection':
        return [list(row) for row in grid[::-1]]
    raise ValueError(operation)


def generate(level, party_count, state, shared_swap_sound_counter=0):
    """Original0x41d930, starting after REGS loading and before toad creation.

    Board indices are native row/column0..11. The engine allocates a thirteenth
    column as padding; the model emits only the144 playable pads.
    """
    if level not in range(4) or party_count not in range(1,17):
        raise ValueError('nativelevel0..3 and partycount1..16 required')
    rng = Random(state)
    grids = templates()
    path_count = (party_count + 1) // 2
    rotated_family = 0
    crab_count = (0,0,2,3)[level]
    if level == 2:
        rotated_family = rng.draw(3,5) if path_count < 8 else 4
    elif level == 3:
        rotated_family = rng.draw(4,5) if path_count < 8 else 4
    transforms = []
    if rotated_family:
        grids[rotated_family-3] = transform(grids[rotated_family-3], 'clockwise')
        transforms.append({'family': rotated_family-3, 'operation': 'clockwise'})
    mode = rng.draw(0,2)
    if mode == 0:
        for group in range(3):
            grids[group] = transform(grids[group], 'half-turn')
            transforms.append({'family':group,'operation':'half-turn'})
    elif mode == 1:
        for group in range(3):
            op = ('horizontal-reflection','vertical-reflection')[rng.draw(0,1)]
            grids[group] = transform(grids[group],op)
            transforms.append({'family':group,'operation':op})
    intact = set(range(1,13))
    selection = list(range(1,13))
    for _ in range(12-path_count if level == 0 else 12):
        chosen = selection.pop(rng.draw(1,len(selection))-1)
        intact.remove(chosen)
    mapping = [None]
    for group,size in enumerate((3,4,5),1):
        pool = [(group,value,sum((3,4,5)[:group-1])+value) for value in range(size)]
        while pool:
            mapping.append(pool.pop(rng.draw(0,len(pool)-1)))
    mutations = [0]*13
    mutations[12] = shared_swap_sound_counter
    changes = []
    crabs = []
    board = []
    for row in range(12):
        out = []
        for col in range(12):
            attrs = [None,None,None]
            for group in range(3):
                feature = grids[group][row][col]
                if not feature:
                    continue
                changed = feature if rotated_family == group+3 else feature+1
                if changed > (3,7,12)[group]: changed = (1,4,8)[group]
                if row >= 2 and col >= 2 and feature not in intact and mutations[feature] < 2:
                    draw = rng.draw(0,100)
                    if draw > 75 or (row == 11 and mutations[feature] == 0):
                        mutations[feature] += 1
                        changes.append({'row':row,'column':col,'from_feature':feature,'to_feature':changed})
                        feature = changed
                typ,value,original = mapping[feature]
                attrs[typ-1] = value
                if row == 0 and len(crabs) < crab_count and rotated_family == group+3:
                    crabs.append({'column':col,'attribute':typ,'value':value,'original_feature_index':original})
            for a,max_value in enumerate((2,3,4)):
                if attrs[a] is None: attrs[a] = rng.draw(0,max_value)
            out.append(attrs)
        board.append(out)
    pre_swap = [[list(cell) for cell in row] for row in board]
    if level:
        # Two fixed native initialization swaps, before the stick is used.
        for first,second in (((4,4),(6,3)),((3,8),(5,10))):
            ar,ac=first; br,bc=second
            board[ar][ac],board[br][bc]=board[br][bc],board[ar][ac]
    threshold = (len(changes)+10)//6  # ceil((changes+5)/6)
    return {'difficulty_native':level,'difficulty_ui':level+1,'party_count':party_count,
            'rng_entry':state&0xffffffff,'rng_exit':rng.state,'rng_trace':rng.trace,
            'board':board,'board_before_initial_swaps':pre_swap,'feature_mapping':mapping[1:],
            'shared_swap_sound_counter_entry':shared_swap_sound_counter,
            'shared_swap_sound_counter_exit':mutations[12],
            'template_transforms':transforms,'rotated_family':rotated_family,
            'preserved_path_ids':sorted(intact),'mutations':changes,'crabs':crabs,
            'swaps_per_stick_segment':threshold,'stick_segments':0 if level==0 else 6,
            'total_swap_allowance':0 if level==0 else threshold*6}


def generate_roster(state):
    """0x41cb90: twelve distinct tattoos, rank deletion then idle-speed draw."""
    rng=Random(state)
    pool=[(attribute,value) for attribute,size in enumerate((3,4,5),1) for value in range(size)]
    actors=[]
    for index in range(12):
        attribute,value=pool.pop(rng.draw(0,len(pool)-1))
        actors.append({'attribute':attribute,'value':value,'idle_speed':rng.draw(3,6),
                       'resource_id':10043+index,'maximum_crossings':2})
    return {'actors':actors,'rng_exit':rng.state,'rng_trace':rng.trace}


class ToadOracle:
    def __init__(self):
        from native_oracle import NativeOracle
        m = self.machine = NativeOracle('logical-journey')
        self.grids = [m.alloc(288) for _ in range(3)]
        m.hook(0x456380, lambda m: 0, pop=4)
        m.hook(0x40fac0, lambda m: 0)
        xy = m.alloc(26, bytes(26))
        m.write_u32(0x4976f0,xy); m.write_u32(0x4976f4,xy)
        m.write_u16(0x48bc28,0)
        self.actor = m.alloc(1024)

    def roster(self,state):
        m=self.machine; speeds=[]
        m.hook(0x455db0,lambda m:speeds.append(m.arg(6)&65535) or 0,pop=32)
        m.write_u32(0x4959d0,state);m.write_u16(0x4972e4,12)
        m.call(0x41cb90)
        return {'actors':[{'attribute':m.u16(0x496aa0+2*i),'value':m.u16(0x497440+2*i),
                           'idle_speed':speeds[i],'resource_id':10043+i,'maximum_crossings':2} for i in range(12)],
                'rng_exit':m.u32(0x4959d0)}

    def plan(self,board,position,attribute,value,direction=1,axis=0):
        m=self.machine; actor=self.actor
        self.set_board(board)
        m.write(actor,bytes(1024));m.write_u16(actor+0xc4,axis)
        row,col=position
        m.write(actor+0xc7,bytes((col,row)))
        m.write(actor+0xda,bytes((direction,)))
        m.write(actor+0xe4,bytes((attribute,value)))
        m.call(0x41f4d0,[actor],max_instructions=3000000)
        return {'visits':[[m.u16(actor+0xf8+2*(r*13+c)) for c in range(12)] for r in range(12)],
                'furthest':m.read(actor+0xdb,1)[0],'sequence':m.u16(actor+0xdc),
                'backtrack_origin':list(reversed(m.read(actor+0xcb,2)))}

    def set_board(self,board,occupied=()):
        m=self.machine
        m.write(0x498b50,bytes(14*13*12))
        for r in range(12):
            for c in range(12):m.write(0x498b59+14*(r*13+c),bytes(board[r][c]))
        for r,c in occupied:m.write(0x498b58+14*(r*13+c),b'\1')

    def crab_routes(self,board,attribute,value):
        m=self.machine;self.set_board(board)
        m.call(0x41f570,[attribute,value])
        base=2*value*507
        return {key:[[m.u16(address+base+2*((r+1)*13+c)) for c in range(12)] for r in range(12)]
                for key,address in (('distance',0x497770),('parent_direction',0x4978c2),('component_bottom',0x497a14))}

    def crab_next(self,board,position,attribute,value,distance,occupied=()):
        m=self.machine;actor=self.actor;self.set_board(board,occupied)
        m.write(actor,bytes(1024));r,c=position
        m.write(actor+0xf7,bytes((c,r)));m.write(actor+0x114,bytes((attribute,value)))
        for row in range(12):m.write(0x497770+2*(507*value+(row+1)*13),struct.pack('<12H',*distance[row]))
        result=m.call(0x420160,[actor])&65535
        return {'animation':result,'direction':m.read(actor+0x10a,1)[0],
                'occupied':[(r,c) for r in range(12) for c in range(12) if m.read(0x498b58+14*(r*13+c),1)[0]]}

    def next_hop(self,board,position,attribute,value,visits,direction,occupied=(),exit_occupied=False):
        m=self.machine; actor=self.actor;row,col=position
        self.set_board(board,occupied)
        m.write(0x498b58+14*(row*13+12),bytes((int(exit_occupied),)))
        m.write(actor,bytes(1024));m.write(actor+0xc7,bytes((col,row)))
        m.write(actor+0xda,bytes((direction,)));m.write(actor+0xe4,bytes((attribute,value)))
        for r in range(12):
            m.write(actor+0xf8+2*r*13,struct.pack('<12H',*visits[r]))
        result=m.call(0x41c770,[actor])&65535
        return {'animation':result,'direction':m.read(actor+0xda,1)[0],
                'visits':[[m.u16(actor+0xf8+2*(r*13+c)) for c in range(12)] for r in range(12)],
                'occupied':[(r,c) for r in range(12) for c in range(13) if m.read(0x498b58+14*(r*13+c),1)[0]]}

    def generate(self,level,count,state,shared_swap_sound_counter=0):
        m=self.machine
        for pointer,grid,address in zip(self.grids,templates(),(0x4994bc,0x49945c,0x496abc)):
            m.write(pointer,struct.pack('<144h',*(x for row in grid for x in row)))
            m.write_u32(address,pointer)
        m.write_u16(0x48cf38,level+1);m.write_u16(0x496a98,count)
        m.write_u16(0x4972e4,0);m.write_u16(0x49731c,0)
        m.write(0x4972e8,bytes(24));m.write(0x498b50,bytes(14*13*12))
        m.write_u32(0x4959d0,state)
        m.write_u16(0x49989c,shared_swap_sound_counter)
        m.call(0x41d930,max_instructions=3000000)
        return {'board':[[list(m.read(0x498b59+14*(row*13+col),3)) for col in range(12)] for row in range(12)],
                'rng_exit':m.u32(0x4959d0),'feature_mapping':[list(struct.unpack('<hhh',m.read(0x496a4e+6*i,6))) for i in range(12)],
                'swaps_per_stick_segment':m.u16(0x4976c6),
                'crabs':[dict(zip(('column','attribute','value','original_feature_index'),struct.unpack('<hhhh',m.read(0x4972e8+8*i,8)))) for i in range((0,0,2,3)[level])],
                'rotated_family':m.u16(0x4994ec),
                'shared_swap_sound_counter_exit':m.u16(0x49989c)}


def validate_native():
    oracle=ToadOracle(); checks=Counter(); witnesses=[]
    for level in range(4):
        for count in (1,2,3,8,15,16):
            for state in (0,1,0xffffffff,0x12345678):
                model=generate(level,count,state);native=oracle.generate(level,count,state)
                for key in native:
                    expected=json.loads(json.dumps(model[key]))
                    assert native[key]==expected,(level,count,state,key,native[key],expected)
                checks['native_board_generation_cases']+=1
                witnesses.append({k:model[k] for k in ('difficulty_native','party_count','rng_entry','rng_exit','total_swap_allowance','rotated_family')})
    for level in range(4):
        for count in (1,16):
            for history in (1,2,3,100):
                model=generate(level,count,0x12345678,history)
                native=oracle.generate(level,count,0x12345678,history)
                assert all(native[k]==json.loads(json.dumps(model[k])) for k in native),(level,count,history)
                checks['native_shared_history_cases']+=1
    for state in (0,1,2,3,42,65535,0xffffffff,0x12345678):
        model=generate_roster(state);native=oracle.roster(state)
        assert all(native[k]==model[k] for k in native),(state,native,model)
        checks['native_roster_cases']+=1
    OUT.mkdir(parents=True,exist_ok=True)
    report={'status':'passed','source_sha256':SOURCE_SHA256,'checks':dict(checks),'failures':[],
            'boundaries':['Native0x41d930 and helper transforms/permutation execute; actual extracted REGS tables provided.',
                          'Coordinates are supplied zero buffers; logical cell attributes, RNG exit, feature mappings, crab seeds and swap allowance are compared.',
                          'Object lookup stub returns null during initial swaps, before toads exist.']}
    (OUT/'native-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    (OUT/'generation-witnesses.json').write_text(json.dumps(witnesses,indent=2)+'\n')
    print(json.dumps(report,indent=2))


DIRECTIONS=((-1,0),(0,1),(1,0),(0,-1))


def crab_routes(board,attribute,value):
    """0x41f570/0x41f750: multi-source BFS by descending bottommost row."""
    distance=[[0]*12 for _ in range(12)]
    parent=[[44]*12 for _ in range(12)]
    component=[[0]*12 for _ in range(12)]
    for row in reversed(range(12)):
        queue=deque()
        for col in range(12):
            if board[row][col][attribute-1]==value and not component[row][col]:
                queue.append((row,col));distance[row][col]=1
                parent[row][col]=2;component[row][col]=row+1
        while queue:
            r,c=queue.popleft()
            for direction,(dr,dc) in enumerate(DIRECTIONS):
                nr,nc=r+dr,c+dc
                if not (0<=nr<12 and 0<=nc<12):continue
                if board[nr][nc][attribute-1]!=value or component[nr][nc]:continue
                queue.append((nr,nc));distance[nr][nc]=distance[r][c]+1
                component[nr][nc]=component[r][c];parent[nr][nc]=(direction+2)%4
    return {'distance':distance,'parent_direction':parent,'component_bottom':component}


def crab_next(board,position,attribute,value,distance,occupied=()):
    r,c=position;occupied=set(map(tuple,occupied));animation=direction=0
    for d,(dr,dc) in enumerate(DIRECTIONS):
        nr,nc=r+dr,c+dc
        if d==2 and nr==12:
            animation=10069;break
        if not (0<=nr<12 and 0<=nc<12):continue
        if (nr,nc) in occupied or board[nr][nc][attribute-1]!=value:continue
        if distance[nr][nc]>=distance[r][c]:continue
        direction=d;animation=(10071,10077,10073,10075)[d]
        occupied.add((nr,nc));break
    return {'animation':animation,'direction':direction,'occupied':sorted(occupied)}


@dataclass
class ToadState:
    """Settled-event projection. Caller supplies actor step scheduling.

    Native animation event timing and repeated crab spawn scheduling are not
    represented. This API must not be used to claim whole-session replay parity.
    """
    generated: dict
    roster: dict
    launched_members: int=0
    passed_members: list=field(default_factory=list)
    active: dict=field(default_factory=dict)
    trips: list=field(default_factory=lambda:[0]*12)
    swaps_used: int=0
    departed: bool=False

    def launch(self,toad,row):
        if self.departed or toad not in range(12) or row not in range(12):raise ValueError('invalid launch')
        if self.launched_members>=self.generated['party_count'] or toad in self.active or self.trips[toad]>=2:raise ValueError('toad or rider unavailable')
        if any(a['position']==(row,0) for a in self.active.values()):raise ValueError('entry pad occupied')
        actor=self.roster['actors'][toad];board=self.generated['board']
        if board[row][0][actor['attribute']-1]!=actor['value']:raise ValueError('tattoo does not match entry pad')
        route=route_plan(board,(row,0),actor['attribute'],actor['value'])
        self.active[toad]={'position':(row,0),'direction':1,'visits':route['visits'],'member':self.launched_members}
        self.launched_members+=1

    def step(self,toad,external_occupancy=()):
        if self.departed or toad not in self.active:raise ValueError('no active toad')
        state=self.active[toad];actor=self.roster['actors'][toad]
        occupied=[a['position'] for a in self.active.values()]+list(external_occupancy)
        result=next_hop(self.generated['board'],state['position'],actor['attribute'],actor['value'],state['visits'],state['direction'],occupied)
        state['visits']=result['visits'];state['direction']=result['direction']
        if result['animation']==10031:
            self.passed_members.append(state['member']);self.trips[toad]+=1;del self.active[toad]
            return {'crossed':True,'member':state['member'],'toad_retired':self.trips[toad]==2}
        if not result['animation']:return {'crossed':False,'blocked':True}
        dr,dc=DIRECTIONS[state['direction']];r,c=state['position'];state['position']=(r+dr,c+dc)
        return {'crossed':False,'blocked':False,'position':state['position']}

    def swap(self,first,second,external_occupancy=()):
        if self.departed or self.swaps_used>=self.generated['total_swap_allowance']:raise ValueError('stick unavailable')
        occupied={a['position'] for a in self.active.values()}|set(map(tuple,external_occupancy))
        first,second=tuple(first),tuple(second)
        for position in (first,second):
            if len(position)!=2 or any(v not in range(12) for v in position) or position in occupied:raise ValueError('pad unavailable')
        if first==second:return {'consumed_swap':False}
        board=self.generated['board'];ar,ac=first;br,bc=second
        board[ar][ac],board[br][bc]=board[br][bc],board[ar][ac];self.swaps_used+=1
        for identity,state in self.active.items():
            actor=self.roster['actors'][identity];a=actor['attribute']-1;v=actor['value']
            state['visits'][ar][ac]=state['visits'][br][bc]=0
            if board[ar][ac][a]==v or board[br][bc][a]==v:
                state['visits']=route_plan(board,state['position'],a+1,v,state['direction'])['visits']
        return {'consumed_swap':True,'remaining':self.generated['total_swap_allowance']-self.swaps_used}

    def go(self):
        if self.departed or not self.passed_members:raise ValueError('GO requires a completed crossing')
        self.departed=True
        return {'passed_members':sorted(self.passed_members),
                'left_behind':sorted(set(range(self.generated['party_count']))-set(self.passed_members)),
                'complete':len(self.passed_members)==self.generated['party_count']}


def route_plan(board,position,attribute,value,direction=1,axis=0):
    """Visit-score planning0x41f4d0, its two walks, then path pruning.

    Occupancy is intentionally absent: actual next-hop validation handles it.
    Axis0 crosses columns; axis1 (crabs) crosses rows.
    """
    visits=[[0]*12 for _ in range(12)]
    start=tuple(position); backtrack=list(start); furthest=11; sequence=1
    progress=lambda p:p[1] if axis==0 else p[0]
    def walk(target):
        nonlocal furthest,sequence,backtrack
        current=start if furthest==11 else tuple(backtrack)
        maximum=progress(start)
        visits[current[0]][current[1]]=sequence
        count=sequence;walk_direction=direction
        for _ in range(200):
            if maximum>=target:break
            best=count;chosen=current;chosen_direction=walk_direction
            for offset in range(4):
                dr,dc=DIRECTIONS[(walk_direction+offset)%4]
                nr,nc=current[0]+dr,current[1]+dc
                if not (0<=nr<12 and 0<=nc<12):continue
                if board[nr][nc][attribute-1]!=value:continue
                if visits[nr][nc]>=best:continue
                best=visits[nr][nc];chosen=(nr,nc);chosen_direction=(walk_direction+offset)%4
                maximum=max(maximum,progress(chosen))
                if progress(chosen)<progress(backtrack):backtrack=list(chosen)
                if maximum>=target:break
            current=chosen;count+=1;walk_direction=chosen_direction
            visits[current[0]][current[1]]=count
        furthest=maximum;sequence=visits[current[0]][current[1]]
    walk(11);walk(furthest)
    current=tuple(backtrack) if axis==0 else start
    visits[current[0]][current[1]]=0
    maximum=progress(start)
    for _ in range(200):
        if maximum>=furthest:break
        best=0;chosen=current
        for dr,dc in DIRECTIONS:
            nr,nc=current[0]+dr,current[1]+dc
            if 0<=nr<12 and 0<=nc<12 and visits[nr][nc]>best:
                best=visits[nr][nc];chosen=(nr,nc)
                maximum=max(maximum,progress(chosen))
        current=chosen;visits[current[0]][current[1]]=0
    visits[start[0]][start[1]]=sequence
    return {'visits':visits,'furthest':furthest,'sequence':sequence,'backtrack_origin':backtrack}


def next_hop(board,position,attribute,value,visits,direction,occupied=(),exit_occupied=False):
    visits=[row[:] for row in visits]; occupied=set(map(tuple,occupied));r,c=position
    if visits[r][c]>=10000:
        visits=[[0]*12 for _ in range(12)]
        visits[r][c]=1
    if visits[r][c]==0:visits[r][c]=1
    original=best=visits[r][c];chosen=None;choice=5;exit_reached=False
    for offset in range(4):
        d=(direction+offset)%4;dr,dc=DIRECTIONS[d];nr,nc=r+dr,c+dc
        if not (0<=nr<12 and 0<=nc<12):
            if d==1 and nc==12:exit_reached=True;break
            continue
        if (nr,nc) in occupied or board[nr][nc][attribute-1]!=value:continue
        if visits[nr][nc]>=best:continue
        best=visits[nr][nc];chosen=(nr,nc);choice=d
    if exit_reached:
        if exit_occupied:choice=5
        else:choice=4;occupied.add((r,12))
    if choice<4:
        visits[chosen[0]][chosen[1]]=original+1
        occupied.add(chosen)
        # Native direction-animation table0x48d1b8 +10*direction.
        animation=(10001,10002,10003,10004)[choice]
        direction=choice
    elif choice==4:
        animation=10031;direction=1
    else:animation=0
    return {'animation':animation,'direction':direction,'visits':visits,'occupied':sorted(occupied)}


def validate_movement():
    oracle=ToadOracle();checks=Counter();rnd=random.Random(0x70ad)
    for level in range(4):
        data=generate(level,16,0x12345678)
        board=data['board']
        for attribute,size in enumerate((3,4,5),1):
            for value in range(size):
                for axis in range(2):
                    position=(rnd.randrange(12),0) if axis==0 else (0,rnd.randrange(12))
                    direction=1 if axis==0 else 2
                    model=route_plan(board,position,attribute,value,direction,axis)
                    native=oracle.plan(board,position,attribute,value,direction,axis)
                    assert model==native,(level,attribute,value,axis,position,model,native)
                    checks['native_route_plan_cases']+=1
                routes=crab_routes(board,attribute,value)
                assert routes==oracle.crab_routes(board,attribute,value),(level,attribute,value)
                checks['native_crab_route_cases']+=1
        for _ in range(100):
            position=(rnd.randrange(12),rnd.randrange(12));attribute=rnd.randrange(1,4)
            value=rnd.randrange((3,4,5)[attribute-1]);direction=rnd.randrange(4)
            visits=[[rnd.randrange(20) for c in range(12)] for r in range(12)]
            occupied=[(r,c) for r in range(12) for c in range(12) if rnd.randrange(8)==0]
            exit_occupied=bool(rnd.randrange(2))
            model=next_hop(board,position,attribute,value,visits,direction,occupied,exit_occupied)
            native=oracle.next_hop(board,position,attribute,value,visits,direction,occupied,exit_occupied)
            if exit_occupied:native['occupied'].remove((position[0],12))
            assert model==native,(level,position,attribute,value,direction,model,native)
            checks['native_next_hop_cases']+=1
            routes=crab_routes(board,attribute,value)
            model=crab_next(board,position,attribute,value,routes['distance'],occupied)
            native=oracle.crab_next(board,position,attribute,value,routes['distance'],occupied)
            assert model==native,(level,position,attribute,value,model,native)
            checks['native_crab_next_cases']+=1
    OUT.mkdir(parents=True,exist_ok=True)
    report={'status':'passed','source_sha256':SOURCE_SHA256,'checks':dict(checks),'failures':[]}
    (OUT/'movement-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


def write_spec():
    from spec_lj_provenance import family_assets,source_evidence
    assets=family_assets('lilly')
    assets['bindings']=[
        {'role':'authored12x12 path planes','tag':'REGS','ids':[15000,15001,15002],'format':'144 big-endian signed16 words, row-major'},
        {'role':'pad sprite bank','tag':'tBMP','ids':[13000],'source':'0x419b01..0x419b21 and pad renderer0x41cfc0'},
        {'role':'pad coordinate vectors','tag':'REGS','ids':[100,101],'source':'0x419b10..0x419b26'},
        {'role':'toad idle actors in display order','tag':'SCRB','ids':list(range(10043,10055)),'source':'0x41cb90'},
        {'role':'toad hop animations N,E,S,W and exit','tag':'SCRB','ids':[10001,10002,10003,10004,10031]},
        {'role':'crab hop animations N,E,S,W and exit','tag':'SCRB','ids':[10071,10077,10073,10075,10069]},
        {'role':'stick segment states','tag':'SCRB','ids':list(range(10078,10085))},
        {'role':'difficulty help','archive':'DATA/zoombini.mhk','tag':'STRL','ids':[2100,2120,2140,2160]}]
    evidence=source_evidence(OUT,[('board-generator',0x41d930,0x41e04c),('feature-permutation',0x41e050,0x41e296),
        ('template-transforms',0x41e390,0x41e52a),('roster',0x41cb90,0x41cdd8),
        ('toad-next-hop',0x41c770,0x41cae6),('route-planner',0x41f4d0,0x41f56d),
        ('route-forward-walk',0x41f8f0,0x41fbf4),('route-prune',0x41fc10,0x41fdf5),
        ('crab-bfs',0x41f570,0x41f8d9),('crab-next-hop',0x420160,0x42041d),
        ('swap',0x41d590,0x41d88e),('swap-budget',0x41eb3b,0x41ebd8),
        ('crossing-completion',0x41c320,0x41c4dd),('go-gate',0x41ae9f,0x41af00),('actor-scheduler',0x41a71d,0x41ae00),('toad-events',0x41b290,0x41b550),('crab-events-and-frames',0x41b550,0x41b960),('crab-constructor',0x41cde0,0x41cf60),('special-crab-path',0x420440,0x420548)])
    spec={'schema_version':1,'game':'logical-journey','id':'titanic-tattooed-toads','name':'Titanic Tattooed Toads',
      'state':{'board':'12x12 playable pads; native14-byte cell at0x498b50+14*(row*13+column). Offsets0..7 rectangle,8 occupancy,9..11 three attributes,12 composite sprite. Thirteenth column is engine padding/exit reservations.',
               'attributes':'Native pad attribute1 values0..2, attribute2 values0..3, attribute3 values0..4. Labels/colors are resource-defined; indices are preserved.',
               'toads':'12 distinct tattoos:3+4+5 attribute/value pairs. Each has position, orientation, visit-score matrix, rider identity, completed crossings0..2, animation/reservation state.',
               'party':'Only count and member identity/order matter; Zoombini visual traits are not tested by this family.',
               'crabs':'Native levels2/3 seed2/3 perpendicular crab routes. Crab BFS maps depend on pad feature. Their reservations compete with toads.',
               'stick':'Native levels1..3 have6 segments, eachceil((mutation_count+5)/6) swaps; nativelevel0 no stick.',
               'shared_history':'u16at0x49989c is both path12 mutation counter and swap-sound cycling counter; it is an actual generator input.'},
      'inputs':{'difficulty_native':[0,1,2,3],'difficulty_ui':[1,2,3,4],'party_count':'1..16',
                'rng':'Initialized32-bit shared RNG state at board-generator or roster-generator entry. These are separate boundaries.',
                'shared_swap_sound_counter':'u16at0x49989c; default0 represents fresh process state, not every later visit.'},
      'actions':[
        {'id':'launch_toad','precondition':'Unused/returned toad with fewer than2 completed crossings; remaining rider; matching unoccupied pad in column0.','effect':'Next waiting rider boards; native route scores are computed; movement begins. Wrong unmatched entry pad is not accepted.'},
        {'id':'wait_or_advance_actor','effect':'Native animation events schedule toad/crab movement. Original actor scheduler and callbacks are executable in tools/spec_lj_toad_scheduler.py. Caller supplies native clock values and ordered frame/event callbacks; shared marker semantics are recovered and native-tested.'},
        {'id':'swap_pads','precondition':'UIlevel>=2, stick not exhausted, both selected pads unoccupied.','effect':'Exchange all3 attributes and composite sprite, leaving positions fixed. Same-pad cancellation consumes no swap. Clear those cells in actor visit maps; replan actors whose matching feature touches either changed cell; rebuild affected crab maps.'},
        {'id':'go','precondition':'At leastone completed crossing.','effect':'Advance crossed subset; unarrived members remain behind. Full-party departure is not required.'}],
      'feedback':{'entry':'Tattoo equality selects valid starting pads; occupied pads cannot be chosen.',
                  'toad_movement':'N,E,S,W directions0..3; scan cyclically beginning with current direction. Among unoccupied matching neighbors choose strictly lowest visit count below current count, first wins ties. Reserve destination and assign currentcount+1. At right edge, exit attempt takes priority once encountered; occupied exit waits. No eligible neighbor yields waiting, not immediate permanent loss.',
                  'planning':'0x41f4d0 clears scores, performs up to200 iterations of a visit-count walk toward column11, repeats toward its furthest reached column, then prunes a path by ascending recorded visit numbers. Code preserves the native two-walk/prune process and direction update.',
                  'crab_movement':'BFS starts from every matching pad on the lowest still-unassigned row, rows11 down0, neighborsN,E,S,W. Records shortest distance to that component bottom. Actual step selects first unoccupied matching N/E/S/W neighbor with lower distance; exits through bottom; otherwise waits.',
                  'crossing':'Increment crossed count and the toad crossing byte. First success returns toad to bank; second retires it. Source0x41c3af..0x41c406.',
                  'stick':'Every threshold swaps advancesone of6 depletion frames. The obsolete0/4/5/6 word0x497588 is never read by this executable.'},
      'success':{'full':'All incoming riders crossed, then GO.','partial':'GO with nonempty crossed subset.'},
      'failure':{'wrong_path':'Rider/toad may remain stranded; another swap can reopen a route on higherlevels while stick remains.',
                 'attempt_limit':'No global launch/rejection quota; eachtoad has2 successful crossings and allriders are finite.',
                 'swap_limit':'6*ceil((mutation_count+5)/6) actual swaps at UIlevels2..4; exhausted stick prevents more swaps.',
                 'time_limit':None,'dynamic_stall':'Blocked movement goes to a deferred queue. Exact source scheduler retries on its next matching phase; authored frame/time emission and global object traversal order remain explicit engine inputs.'},
      'difficulty_levels':[{'native':level,'ui':level+1,'name':LEVEL_NAMES[level],
          'preserved_authored_paths':'ceil(party_count/2)' if level==0 else 0,'crab_seed_count':(0,0,2,3)[level],
          'rotated_path_family':None if level<2 else ('draw[3,5] ifceil(count/2)<8 else4' if level==2 else 'draw[4,5] ifceil(count/2)<8 else4'),
          'stick_segments':0 if level==0 else 6} for level in range(4)],
      'generation':{'status':'native-parity-verified-board-roster-and-core-movement',
          'implementation':'tools/spec_lj_titanic_tattooed_toads.py',
          'steps':['Load three144-word authored REGS15000..15002 planes containing pathIDs1..3,4..7,8..12 and zero holes.',
                   'For UI3/4 select perpendicular path family as above and rotate its plane clockwise.',
                   'Draw[0,2]:0 rotates allplanes180degrees;1 reflects eachplane horizontally/vertically using3 draws[0,1];2 leaves them unchanged.',
                   'Choose pathIDs without replacement by rank deletion. UI1 marks12-ceil(count/2) paths for corruption; others mark all12.',
                   'Permute eachfamily feature labels by successive rank deletion, in family order3,4,5; singleton rank does not advance RNG.',
                   'Visit cells row-major and source planes in order. At row>=2,column>=2 for marked pathID with mutationcounter<2 draw[0,100]. Mutate when draw>75, or lastrow and counter0. Incrementcounter; ordinaryfamily pathcycles to nextID; perpendicularfamily retains itsID yet still counts mutation. Map pathID to permuted attribute/value.',
                   'Fill zero-hole attributes independently withdraw[0,2],draw[0,3],draw[0,4] in attribute order when missing.',
                   'Capture first2/3 perpendicularfamily labels at row0 as crab seeds. UI2..4 swap pads(row4,col4)<->(row6,col3) and(row3,col8)<->(row5,col10).',
                   'Compute swaps_per_segment=ceil((number_of_counted_mutations+5)/6).',
                   'Separate roster generator draws eachof12 remainingtattoos by rank deletion, then an idle-speed draw[3,6] for thattoad; nativeidlespeed consumes shared RNG even though it is presentation.'],
          'native_counter_alias':'memset at0x41d939 clears24 bytes at0x499884, while pathIDs1..12 index u16counters. Counter12 at0x49989c lies just past cleared bytes. Model preserves it as explicit history; no silent bugfix.',
          'rng':'state=(214013*state+2531011)mod2^32; inclusive bound uses(state>>16)mod(max+1); max0 no state advance.',
          'solvability':'Authored paths are modified and some deliberately stranded. No general rejection-until-solvable loop exists in recovered board generator; no guarantee is claimed for every dynamic schedule.'},
      'assets':assets,'evidence':evidence,
      'validation':{name:json.loads((OUT/name).read_text()) for name in ('native-validation.json','movement-validation.json','scheduler-validation.json','animation-marker-validation.json') if (OUT/name).exists()},
      'open_questions':[
          {'area':'engine integration','question':'Original actor scheduler, repeated crab creation, reservation events, special-crab path and crossing outcomes are now executable and tested. Full ordered engine object traversal, all resource-driven frame scheduling and interleaving with user actions are not integrated into a standalone replay loop. The earlier ToadState settled projection omits these dynamics; use SchedulerOracle for source-backed event work.','blocks_complete_gameplay_spec':True},
          {'area':'rendering','question':'Semantic names/colors of the three pad feature indices require renderer/resource annotation; hashes and original indices are complete.','blocks_core_generation':False},
          {'area':'shared journey','question':'Checkpoint progression and global seed/time initialization remain shared engine scope.','blocks_family_core':False}],
      'completeness':{'all_four_generator_branches':True,'board_and_roster_rng_order':True,'movement_planning_and_predicates':True,
                      'swap_formula_and_crossing_limits':True,'complete_dynamic_gameplay':False,'source_backed_actor_scheduler':True,'source_backed_callbacks_and_reservations':True,'whole_session_native_parity':False,
                      'status':'Exact generators, movement and original scheduler/callback backend; full engine object/frame traversal remains an integration gap.'}}
    spec['dynamic_event_contract']={
      'implementation':'tools/spec_lj_toad_scheduler.py:SchedulerOracle',
      'source_backend':'Hash-guarded original code; tick(now) executes41a71d..41acf2; event(actor,event,callback) executes original callback; crab_frame(actor,phase,now) executes41b660. Engine animation start is logged; no original process or OS calls.',
      'phase_order':'497768 toggles1->0 for toad phase and0->1 for crab phase. A nonzero4976ca suppresses this motion block. UI1/2 still alternate but crab phase returns without crab work.',
      'ready_order':'Ready queues LIFO. On its phase, append the previous deferred queue in reverse then drain ready LIFO; actors whose deadline is not reached or with no legal next step enter deferred. Existing deferred actors thus precede newly ready actors.',
      'toad_clock':'Ready iff native unsigned now>=actor+24. Hop completion event10 schedules next eligibility now+30. Event15 only enqueues without changing deadline.',
      'toad_events':{'11':'Copy previous cell, move current cell one step in selected direction; destination has already been reserved by next-hop function.','12':'Clear previous-cell occupancy midway through hop.','13,14':'Sprite coordinate interpolation only.','10':'Commit screen coordinates, append to ready queue, deadline=now+30.','15':'Append ready queue without changing deadline.'},
      'crab_spawning':'UI3/4 only and global4a2402<=0. Spawn attempt iff now>4994b8 and live_count<20. Take current seed column; if top pad free create normal crab. If occupied and authored marker49758c equals1, create special uncolored crab. Other occupied starts skip. Always rotate seed index after a due attempt; successful creation sets deadline=now+720 and increases live_count. Native constructor draws speed4..7, consuming shared RNG.',
      'spawn_traits':'Normal crab receives axis from the first seed record4972ea and current value on the actual top pad; all seeds in this family share that axis. Thus swaps can alter later crab labels. Special crab starts with modeword+62=1.',
      'special_crab_step':'420440: if mode-change flag+64 set, clear mode/flag and queue route replan; otherwise advance downward. A free next pad supplies its current feature value, reserves it and sets mode-change flag. An occupied next pad may still be entered when its authored marker is nonzero. Bottom row exits. This path differs materially from ordinary matching-feature BFS.',
      'crab_frames':{'0':'Move current cell according to selected hop program; save old cell.','6':'Release old-cell occupancy only for normal mode (+62==0).','7':'Commit position, append crab-ready and deadline=now+35; normal/special sprite visibility is separate.'},
      'crab_events':{'70':'Spawn animation completion appends crab-ready.','80':'Exit clears occupancy, removes crab from live array/count, queues engine deletion.'},
      'crossing':'Toad callback41c320 event30 increments success count, GO flag on first, tripbyte+110. Trip1 queues return; trip2 queues retirement. Linked rider sprite+4a identifies actual party actor, whose passed byte+12c is set. Original return/removal queues and callbacks are source-linked.',
      'resource_markers':{'export':'local/analysis/logical-journey-titanic-tattooed-toads/animation-event-contract.json','parser':'4585c6..458614; FE-prefixed negative marker consumes sound word; lowbyte0 means no event, else callbackevent=lowbyte−1. Marker callback precedes per-frame callback+14.','clock':'458180 checks native now4a47c0>=actor+24; next animation frame sets deadline=now+actor+28. Linked actor synchronization uses+e0 and global4a37b4/4a32d0/4a349c arrays and is preserved as source, not yet an independent replay engine.','validation':'3396 frame markers across293 SCRB resources passed; lilly10169 frame>=24layers explicitly excluded from bounded parser test.'},
      'boundary':'This closes the unknown spawn/rule/scheduler functions, not whole-engine ordering parity. Ordered resource frames and clock inputs remain explicit.'}
    path=ROOT/'local/specs/logical-journey/titanic-tattooed-toads.json';path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(spec,indent=2)+'\n');print(path)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--validate-native',action='store_true')
    parser.add_argument('--validate-movement',action='store_true')
    parser.add_argument('--write-spec',action='store_true')
    parser.add_argument('--difficulty',type=int,choices=range(4),default=0)
    parser.add_argument('--party-count',type=int,default=16)
    parser.add_argument('--state',type=lambda x:int(x,0),default=0)
    args=parser.parse_args()
    if args.validate_native: validate_native()
    elif args.validate_movement:validate_movement()
    elif args.write_spec:write_spec()
    else: print(json.dumps(generate(args.difficulty,args.party_count,args.state),indent=2))


if __name__=='__main__':main()
