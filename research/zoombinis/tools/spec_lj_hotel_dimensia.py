#!/usr/bin/env python3
"""Hotel Dimensia: native generator, incremental coordinate rules and mistake clock."""
import argparse
from dataclasses import dataclass,field
import json
import random
import struct
from native_analysis import ROOT,KNOWN_SHA256,logical_journey_random
from spec_lj_provenance import family_assets,source_evidence
OUT=ROOT/'local/analysis/logical-journey-hotel-dimensia'
HASH=KNOWN_SHA256['logical-journey']
class Random:
    def __init__(self,state):self.state=state&0xffffffff;self.trace=[]
    def draw(self,maximum):
        self.state,v=logical_journey_random(self.state,maximum);self.trace.append({'maximum':maximum,'value':v});return v

def generate(party,level,state):
    if level not in range(4) or not 1<=len(party)<=16:raise ValueError('level0..3, party1..16')
    counts=[len({t[k] for t in party}) for k in range(4)];rng=Random(state);rounds=0
    while True:
        a,b,c=[rng.draw(3) for _ in range(3)];rounds+=1
        if level==3:valid=len({a,b,c})==3
        elif level==2:valid=a!=b and (sum(v<4 for v in counts)>=3 or counts[a]>=4 and counts[b]>=4)
        else:valid=a!=b and (counts[a]==counts[b]==5 or sum(v<5 for v in counts)>=3 or counts[a]>=4 and counts[b]>=4)
        if valid:break
        if rounds>100000:raise RuntimeError('native rejection loop budget exceeded')
    blocked=[];styles=[];hidden=[[],[]]
    if level==2:
        for _ in range(5):
            x=rng.draw(4)+1
            while x in hidden[0]:x=rng.draw(4)+1
            y=rng.draw(4)+1
            while y in hidden[1]:y=rng.draw(4)+1
            hidden[0].append(x);hidden[1].append(y)
        used={(t[a],t[b]) for t in party}
        empty=[i for i in range(25) if (hidden[0][i%5],hidden[1][i//5]) not in used]
        n=min(8,rng.draw(len(empty)-1)+1,len(empty))
        for _ in range(n):
            i=empty[rng.draw(len(empty)-1)]
            while i in blocked:i=empty[rng.draw(len(empty)-1)]
            blocked.append(i);styles.append(rng.draw(3))
    return {'ui_level':level+1,'difficulty_native':level,'party':list(map(list,party)),'distinct_values':counts,
            'selected_traits':[a,b,c],'used_traits':[a] if level==0 else [a,b] if level<3 else [a,b,c],
            'axis_draw_rounds':rounds,'hidden_block_generation_labels':hidden,'blocked_selection_order':blocked,
            'blocked':sorted(blocked),'board_styles_in_sorted_room_order':styles,'initial_labels':[[0]*5 for _ in range(1 if level==0 else 2 if level<3 else 3)],
            'clock_after_first_acceptance':(5,2,4,2)[level],'rejections_to_close':(7,10,8,10)[level],
            'rng_entry':state,'rng_exit':rng.state,'rng_trace':rng.trace}

def coordinates(level,slot):
    if level==0:
        if slot not in range(5):raise ValueError('five floor slots0..4')
        return (slot,)
    if level in (1,2):
        if slot not in range(25):raise ValueError('25 room slots0..24')
        return slot%5,slot//5
    if slot not in range(125):raise ValueError('125 room slots0..124')
    return (slot%25)//5,slot//25,slot%5

def accepts(labels,coords,values,cheat=False):
    if cheat:return True
    return all((axis[pos]==value if axis[pos] else value not in axis) for axis,pos,value in zip(labels,coords,values))

def assign(labels,coords,values):
    for axis,pos,value in zip(labels,coords,values):axis[pos]=value

@dataclass
class HotelState:
    generated:dict
    labels:list=field(default_factory=list)
    placements:dict=field(default_factory=dict)
    mistakes:int=0
    departed:bool=False
    def __post_init__(self):
        if not self.labels:self.labels=[a[:] for a in self.generated['initial_labels']]
    @property
    def closed(self):return self.mistakes>=self.generated['rejections_to_close']
    def place(self,member,slot):
        if self.departed or self.closed or member in self.placements or member not in range(len(self.generated['party'])):raise ValueError('member unavailable')
        level=self.generated['difficulty_native'];coords=coordinates(level,slot)
        if slot in self.generated['blocked']:return {'accepted':False,'ignored':True,'reason':'boarded room; no clock cost'}
        values=[self.generated['party'][member][k] for k in self.generated['used_traits']]
        if accepts(self.labels,coords,values):
            assign(self.labels,coords,values);self.placements[member]=slot
            return {'accepted':True,'closed':False,'all_accommodated':len(self.placements)==len(self.generated['party'])}
        self.mistakes+=1
        return {'accepted':False,'ignored':False,'closed':self.closed,'mistakes':self.mistakes}
    def go(self):
        if self.departed or not self.placements:raise ValueError('GO needs at least one accommodated member')
        self.departed=True;return {'passed':sorted(self.placements),'left_behind':[i for i in range(len(self.generated['party'])) if i not in self.placements]}

class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        self.m=NativeOracle('logical-journey');m=self.m
        self.party=m.alloc(68);m.hook(0x44a920,lambda m:self.party)
        m.hook(0x455db0,lambda m:0,pop=32)
        z=m.alloc(256)
        for a in (0x496150,0x49614c):m.write_u32(a,z)
        m.write_u16(0x48bc28,0)
    def generation(self,party,level,state):
        m=self.m;m.write(self.party,struct.pack('<HH',len(party),0)+bytes(v for t in party for v in t))
        for a,size in ((0x495e8c,50),(0x496698,50),(0x4967ec,10),(0x496014,250),(0x495fe8,40)):m.write(a,bytes(size))
        m.write_u16(0x4967d6,level);m.write_u16(0x4967e6,125 if level==3 else 25);m.write_u32(0x4959d0,state)
        m.call(0x417230)
        blocked=[i for i in range(25) if m.u16(0x496014+2*i)==65535]
        return {'selected_traits':[m.u16(a) for a in (0x496686,0x49668c,0x4967e2)],'distinct_values':[m.u16(0x496690+2*i) for i in range(4)],
                'blocked':blocked,'board_styles_in_sorted_room_order':[m.u16(0x495fe8+2*i) for i in range(len(blocked))],'rng_exit':m.u32(0x4959d0)}
    def validator(self,labels,slot,values,level,cheat=False):
        m=self.m;m.write_u16(0x4967d4,cheat);m.write_u16(0x4967e6,25)
        if level<3:
            a=[labels[0][i%5] for i in range(25)];b=[labels[1][i//5] for i in range(25)]
            m.write(0x495e8c,struct.pack('<25H',*a));m.write(0x496698,struct.pack('<25H',*b))
            return bool(m.call(0x417f30,[*values,slot])&65535)
        for addr,axis in zip((0x495e8c,0x496698,0x4967ec),labels):m.write(addr,struct.pack('<5H',*axis))
        return bool(m.call(0x418610,[*values,slot])&65535)

def validate():
    oracle=Oracle();gc=vc=0;w=[]
    fixtures=[[[((i*(k*2+1)+i//5+k)%5)+1 for k in range(4)] for i in range(n)] for n in (1,2,3,8,16)]
    fixtures.extend([[[i%5+1,(i//5)%5+1,1,1] for i in range(16)],[[i%5+1,i%4+1,i%3+1,i%2+1] for i in range(16)]])
    for level in range(4):
        for party in fixtures:
            for seed in (0,1,42,0xffffffff,0x12345678):
                model=generate(party,level,seed);native=oracle.generation(party,level,seed)
                assert all(native[k]==model[k] for k in native),(level,party,seed,native,model)
                gc+=1;w.append({k:model[k] for k in ('ui_level','selected_traits','blocked','rng_entry','rng_exit','axis_draw_rounds')})
    r=random.Random(12025)
    for level in (1,3):
        for _ in range(1200):
            labels=[]
            for a in range(2 if level==1 else 3):
                axis=r.sample(range(1,6),5);labels.append([v if r.randrange(2) else 0 for v in axis])
            slot=r.randrange(25 if level==1 else 125);values=[r.randrange(1,6) for _ in labels];cheat=not r.randrange(15)
            expected=accepts(labels,coordinates(level,slot),values,cheat)
            got=oracle.validator(labels,slot,values,level,cheat)
            assert got==expected,(level,labels,slot,values,cheat,got,expected);vc+=1
    OUT.mkdir(parents=True,exist_ok=True)
    report={'status':'passed','source_sha256':HASH,'native_generator_cases':gc,'native_incremental_rule_cases':vc,'failures':[],
            'boundary':'Native417230 executes with supplied party; renderer constructor returns0. Original417f30/418610 validators compared on partial injection labels, including override flag. Clock and room transfer lifecycle statically traced.'}
    (OUT/'native-validation.json').write_text(json.dumps(report,indent=2)+'\n');(OUT/'generation-witnesses.json').write_text(json.dumps(w,indent=2)+'\n');print(json.dumps(report,indent=2))


def validate_lifecycle():
    from native_oracle import NativeOracle
    from unicorn.x86_const import UC_X86_REG_ESI,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_EBX,UC_X86_REG_ECX,UC_X86_REG_EDX
    m=NativeOracle('logical-journey');entity=m.alloc(512);context=m.alloc(256)
    m.write_u32(0x4a2818,context);m.write_u16(0x48bc28,0);m.write_u16(entity+0x1a,1)
    for addr,pop in ((0x456a20,16),(0x456cb0,24),(0x457cf0,0),(0x4588d0,0),(0x419110,0),(0x418940,0),(0x418970,0),(0x418060,0),(0x4557d0,0),(0x40fb50,16),(0x418cf0,0)):
        m.hook(addr,lambda m:1,pop=pop)
    m.hook(0x456380,lambda m:entity,pop=4)
    counts={'first_acceptance':0,'rejection_settlement':0,'acceptance_settlement':0,'pure_sessions':0}
    regs={UC_X86_REG_ESI:entity,UC_X86_REG_EBX:0,UC_X86_REG_EBP:1,UC_X86_REG_EDI:3}
    for level in range(4):
        baseline=(5,2,4,2)[level];m.write_u16(0x4967d6,level)
        for start in (1,6,11):
            for a,n in ((0x495e8c,50),(0x496698,50),(0x4967ec,10)):m.write(a,bytes(n))
            for a,v in ((0x496800,1),(0x4967d0,baseline),(0x496154,start),(0x496686,0),(0x49668c,1),(0x4967e2,2)):m.write_u16(a,v)
            m.write(entity+0xf0,bytes([2,3,4,5]))
            m.call((0x417947,0x417a0a,0x417a0a,0x417ae4)[level],registers={UC_X86_REG_ESI:entity,UC_X86_REG_EBP:0,UC_X86_REG_ECX:4,UC_X86_REG_EDX:8},stop_at=0x417be2)
            assert m.u16(0x496800)==0 and m.u16(0x496154)==baseline
            counts['first_acceptance']+=1
        for clock in range(baseline,12):
            for a,v in ((0x496154,clock),(0x496800,0),(0x495ec4,0),(0x495ebe,0)):m.write_u16(a,v)
            m.call(0x416807,registers=regs,stop_at=0x416af2)
            assert m.u16(0x496154)==clock+1 and m.u16(0x495ec4)==int(clock+1>=12),(level,clock,m.u16(0x496154),m.u16(0x495ec4))
            counts['rejection_settlement']+=1
        for occupancy in range(8):
            for a,v in ((0x496154,baseline),(0x496174,0),(0x495ebe,0),(0x496014,occupancy),(0x4967e4,2)):m.write_u16(a,v)
            m.write(entity+0x12c,b'\1')
            m.call(0x416755,registers=regs,stop_at=0x416af2)
            assert m.u16(0x496154)==baseline and m.u16(0x496174)==1 and m.u16(0x4967e4)==3
            assert m.u16(0x496014)==min(6,occupancy+1)
            counts['acceptance_settlement']+=1
        party=[[1,1,1,1],[2,2,2,2]];g=generate(party,level,123)
        valid=next(i for i in range((5,25,25,125)[level]) if i not in g['blocked'])
        state=HotelState(g);assert state.place(0,valid)['accepted']
        for i in range(g['rejections_to_close']):
            result=state.place(1,valid);assert result['closed']==(i==g['rejections_to_close']-1)
        assert state.go()=={'passed':[0],'left_behind':[1]};counts['pure_sessions']+=1
    report={'status':'passed','source_sha256':HASH,'checks':counts,'failures':[],
            'boundary':'Original first-acceptance branches, settled rejection0x416807 and acceptance0x416755 executed to0x416af2; visual/audio/palette/wait operations stubbed. Original clock, closure flag, room counts, accommodated count and GO flag execute.'}
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'lifecycle-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

def write_spec():
    evidence=source_evidence(OUT,[('generator',0x417230,0x417610),('axis_counts',0x418130,0x4181dd),('two_axes',0x417ec0,0x418053),('three_axes',0x418610,0x418910),('placement',0x417780,0x417c27),('clock_and_acceptance',0x41672f,0x416971),('initial_clock',0x415869,0x4158ba)])
    report=json.loads((OUT/'native-validation.json').read_text()) if (OUT/'native-validation.json').exists() else {'status':'not_run'}
    spec={'schema_version':1,'game':'logical-journey','id':'hotel-dimensia','name':'Hotel Dimensia',
          'state':{'party':'1..16 four-tuples1..5','trait_axes':'selected native trait indices0..3','axis_labels':'partial injective maps from five coordinates to trait values, zero initially','rooms':'1D5 floors / 2D25 rooms / 3D125 rooms; rooms can hold multiple matching members','blocked_rooms':'UI3 only','clock':'after first accepted placement5/2/4/2; every rule rejection advances1; hotel closes at12','native_addresses':{'axis_ids':['0x496686','0x49668c','0x4967e2'],'axis_labels':['0x495e8c','0x496698','0x4967ec'],'room_counts':'0x496014','clock':'0x496154','first_placement':'0x496800'}},
          'inputs':['party','native difficulty0..3 / UI1..4','RNG entry state','ordered placement actions'],
          'actions':[{'id':'place','rule':'Drag available member to a valid non-boarded room. Each already labelled coordinate must match the corresponding selected trait; an unlabelled coordinate may claim a trait value only if no other coordinate on that axis already claims it. Acceptance labels all selected coordinates and accommodates the member.','coordinates':'UI1 floor0..4 native room4+5*floor; UI2/3 slot0..24=(column, floor); UI4 slot0..124 axes=((slot%25)//5,slot//25,slot%5).'},{'id':'go','rule':'Enabled once any member has been accommodated. Transfer accommodated subset; unaccommodated members remain.'}],
          'feedback':['Accepted Zoombini enters room; shared rooms are allowed.','Rule rejection retracts ledge and drops member; clock advances1.','Blocked/outside destination is ignored before rule evaluation; no mistake cost.','Night closes hotel at clock12; no further placements.'],
          'success':{'complete':'all party members accommodated','partial':'GO with any positive accommodated count'},
          'failure':{'mistake_allowance':[7,10,8,10],'scope':'UI1..4 respectively, after first acceptance; final rejection closes hotel','realtime_timer':False,'note':'Native clock is event/mistake driven; ambient animation is not a wall-clock deadline.'},
          'difficulty_levels':[{'ui_level':i+1,'native_index':i,'dimensions':(1,2,2,3)[i],'room_count':(5,25,25,125)[i],'boarded':i==2,'clock_baseline':(5,2,4,2)[i],'rejections_to_close':(7,10,8,10)[i]} for i in range(4)],
          'generation':{'implementation':'tools/spec_lj_hotel_dimensia.py:generate','native':'0x417230','rng_order':['Count distinct values in each of four party traits. Repeatedly draw three indices0..3 even when fewer are used.','UI1/2 accept distinct first2 if both have5 values, or at least3 categories have fewer than5 values, or both chosen have>=4 values. UI3 accept distinct first2 if at least3categories have fewer than4 values or both chosen have>=4. UI4 requires all3distinct.','UI3: generate two permutations1..5 with separate rejection draws0..4, interleaved one pair per step; map to diagonal slots0,6,12,18,24 using417ec0.','Find all25 rooms unused by party under this temporary arrangement. Draw count1..number_unused capped8. Pick that many distinct unused rooms by repeated rank draws, rejecting already chosen. Draw board artwork0..3 immediately after each accepted choice. Artwork values are subsequently applied to sorted blocked-room order.','Clear temporary labels before play; placements construct the operative labels.'],
                        'no_hidden_final_mapping':'Except selected trait axes and blocked set, room value meanings are created by player placement.'},
          'assets':family_assets('hotel'),'evidence':evidence,'validation':{'generation_and_rules':report,'settled_lifecycle':json.loads((OUT/'lifecycle-validation.json').read_text()) if (OUT/'lifecycle-validation.json').exists() else {'status':'not_run'}},
          'open_questions':['Exact avatar stacking positions and special scripted tutorial/cheat input sequences are not replayed.','Complete animation event-loop replay has not been compared; puzzle state transitions are isolated and tested.'],
          'completeness':{'generation':'complete independent model, native compared','placement_predicate':'complete independent model, native compared','clock':'native settled lifecycle compared','full_spec':True,'boundary':'Core puzzle logic, generation, semantic feedback and transfer criterion; excludes rendering, exact animation scheduling and developer cheats.'}}
    spec['assets']['bindings']={'background':'tBMP5000','hotel_banks':['tBMP8000','UI3 tBMP11000','UI4 tBMP12000'],'boards':['SCRB11000..11003','UI4 alternate12000..12003'],'help':'zoombiniSTRL2400/2420/2440/2460','geometry':'REGS11000..11005 (UI3);9000..9003,12004/12005(UI4); native static positions0x48bfc0/0x48c028'}
    p=ROOT/'local/specs/logical-journey/hotel-dimensia.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(spec,indent=2)+'\n')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--validate-native',action='store_true');p.add_argument('--write-spec',action='store_true');p.add_argument('--validate-state',action='store_true');a=p.parse_args()
    if a.validate_native:validate()
    if a.validate_state:validate_lifecycle()
    if a.write_spec:write_spec()
