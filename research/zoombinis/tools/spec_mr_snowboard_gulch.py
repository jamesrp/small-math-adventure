#!/usr/bin/env python3
"""Snowboard Gulch: original rule generation and settled mathematical actions."""
import argparse
import hashlib
import itertools
import json
import struct
from spec_mr_turtle_hurdle import Rand, ROOT, SHA, guard
OUT=ROOT/'local/analysis/mountain-rescue-snowboard-gulch'


def route(rules, traits):
    node=0
    while node<3:
        rule=rules[node]
        node=2*node+(1 if traits[rule['axis']] in rule['values'] else 2)
    return node-3


def population(rules, party):
    counts=[0]*4
    for traits in party:counts[route(rules,traits)]+=1
    return counts


def generate(level,seed,party):
    if level not in (1,2,3) or not 1<=len(party)<=8:raise ValueError('Normal levels 1..3, party 1..8')
    rng=Rand(seed)
    for attempt in range(1,5001):
        def rule(exclude=None):
            while True:
                axis=rng.next(4)
                if axis==exclude:continue
                values=[rng.next(5)+1]
                if level==3:
                    values.append(rng.next(5)+1)
                    if values[0]==values[1]:continue
                return dict(axis=axis,values=values)
        first=rule();second=rule(first['axis']);rules=[first,second,dict(axis=second['axis'],values=second['values'].copy())]
        counts=population(rules,party)
        result=dict(level=level,seed=seed,party=party,rules=rules,counts=counts,attempts=attempt,
                    rng_exit=rng.state,rng_trace=rng.trace)
        score=10-sum(3 if n==0 else 1 if n==1 else n-5 if n>5 else 0 for n in counts)
        if score>=7 or attempt==5000:
            return dict(result,status='generated',score=score,accepted_balance=score>=7)


def open_route(rules,party,remaining,seed):
    if not remaining:raise ValueError('No remaining launchable characters')
    rng=Rand(seed)
    counts=population(rules,[party[i] for i in remaining])
    while True:
        value=rng.next(4)
        if counts[value]:return dict(route=value,rng_exit=rng.state,rng_trace=rng.trace)


def settle(state,character,next_open=None):
    """Logical launch -> collision (if any) -> descent -> exit completion.

    This offline convention waits for speech and exit completion before the
    next launch, with any requested blocker change supplied explicitly. It is
    not an unconditional native transition: arrival during speech phase5 does
    not request a new opening. Use the event API for that logical timing.
    """
    from copy import deepcopy
    s=deepcopy(state)
    if type(character) is not int or not 0<=character<len(s['party']) or s.get('closed') or character in s['rescued']:raise ValueError('Character cannot launch')
    leaf=route(s['rules'],s['party'][character])
    collision=len(s['rescued'])>=2 and leaf!=s['open_route']
    if collision:
        s['mistakes']+=1
        s['collision_pair_count']=(s['collision_pair_count']+1)%2
    s['rescued'].append(character)
    s['closed']=s['mistakes']>(2 if s['level']==1 else 4) or len(s['rescued'])==len(s['party'])
    remaining=[i for i in range(len(s['party'])) if i not in s['rescued']]
    if not s['closed'] and len(s['rescued'])>=2:
        if next_open is None or not any(route(s['rules'],s['party'][i])==next_open for i in remaining):
            raise ValueError('Next open route must contain a remaining character')
        s['open_route']=next_open
    return s,dict(route=leaf,collision=collision,rescued=True,closed=s['closed'])


class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_ECX
        self.EAX,self.EBP,self.EBX,self.ESP,self.EIP,self.ECX=UC_X86_REG_EAX,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_ECX
        m=self.m=NativeOracle('mountain-rescue')
        self.thread=m.alloc(128);self.scene=m.alloc(0x200);self.rules=m.alloc(32);self.counts=m.alloc(16)
        self.chars=[m.alloc(0x9c) for _ in range(8)];self.vector=m.alloc(32)
        m.write(self.vector,struct.pack('<8I',*self.chars))
        m.hook(0x46ec98,lambda _:self.thread)
        self.pool=m.alloc(128)
        m.hook(0x46cbda,lambda _:self.pool)
        self.norfs=m.alloc(128)
        m.hook(0x46cf20,lambda machine:{4:self.counts,15:self.rules,96:self.norfs}[machine.arg(0)])
        m.hook(0x46c7a8,lambda _:0)
        m.hook(0x46ccc1,lambda _:0)
        self.trace=[];self.attempts=0
        m.uc.hook_add(UC_HOOK_CODE,lambda u,a,z,d:self.trace.append(dict(rand=m.reg(self.EAX),state=m.u32(self.thread+0x14))),begin=0x46c7e1,end=0x46c7e1)
        def attempt(u,a,z,d):self.attempts+=1
        m.uc.hook_add(UC_HOOK_CODE,attempt,begin=0x42eaa6,end=0x42eaa6)

    def prepare(self,level,party):
        m=self.m;m.write(self.scene,bytes(0x200));m.write(self.rules,bytes(32));m.write(self.counts,bytes(16))
        m.write_u32(self.scene+0x18,level);m.write(self.scene+0x10c,b'\x03');m.write_u32(self.scene+0x108,self.rules)
        m.write_u32(self.scene+0x14,4)
        m.write_u32(0x4e4914,self.vector);m.write_u32(0x4e4918,self.vector+4*len(party))
        for p,t in zip(self.chars,party):m.write(p,bytes(0x9c));m.write(p+5,bytes(t));m.write(p+0x38,b'\x01')

    def generate(self,level,seed,party):
        m=self.m;self.prepare(level,party)
        sp=m.STACK+m.STACK_SIZE-0x1000
        m.write(sp,bytes(0x80));m.write_u32(sp+0x14,4);m.write_u32(sp+0x18,self.counts);m.write_u32(sp+0x1c,0)
        m.write_u32(self.thread+0x14,seed);self.trace.clear();self.attempts=0
        m.call(0x42e99f,registers={self.EBP:self.scene},stop_at=0x42ede6,max_instructions=40000000,timeout_us=30000000)
        data=m.read(self.rules,15)
        rules=[dict(axis=data[5*i]-1,values=list(data[5*i+2:5*i+(4 if level==3 else 3)])) for i in range(3)]
        return dict(rules=rules,counts=list(m.read(self.counts,4)),attempts=self.attempts,rng_exit=m.u32(self.thread+0x14),rng_trace=self.trace.copy(),status='generated')

    def histogram(self,level,rules,party):
        self.prepare(level,party)
        b=bytearray(15)
        for i,r in enumerate(rules):b[5*i]=r['axis']+1;b[5*i+2:5*i+2+len(r['values'])]=bytes(r['values'])
        self.m.write(self.rules,b)
        self.m.call(0x42bd00,[self.counts,0x4e4910],ecx=self.scene)
        return list(self.m.read(self.counts,4))

    def opening(self,level,rules,party,remaining,seed):
        from unicorn.x86_const import UC_X86_REG_EDI
        self.histogram(level,rules,party)
        m=self.m;m.write(self.norfs,bytes(128));m.write_u32(0x4ad028,self.norfs)
        for i,c in enumerate(self.chars[:len(party)]):m.write(c+0x38,bytes([i in remaining]))
        m.write_u32(self.thread+0x14,seed);self.trace.clear()
        m.call(0x42b7d0,ecx=self.scene,stop_at=0x42b8b4)
        return dict(route=m.reg(UC_X86_REG_EDI)-3,rng_exit=m.u32(self.thread+0x14),rng_trace=self.trace.copy())


def validate(count=100):
    import random
    oracle=Oracle();cases=[];histograms=0;helper=0
    for level in (1,2,3):
        for kind in ('mixed','identical','sparse'):
            party=([[i%5+1,(i//2)%5+1,(i*3)%5+1,(i//3)%5+1] for i in range(8)] if kind=='mixed' else [[1]*4]*8 if kind=='identical' else [[1]*4,[2]*4,[3]*4])
            for seed in range(min(count,6) if kind!='mixed' else count):
                pure=generate(level,seed,party);native=oracle.generate(level,seed,party)
                for k in ('rules','counts','attempts','rng_exit','status'):assert pure[k]==native[k],(level,kind,seed,k,pure[k],native[k])
                assert native['rng_trace']==[{k:r[k] for k in ('rand','state')} for r in pure['rng_trace']]
                cases.append(dict(party_kind=kind,**{k:pure[k] for k in ('level','seed','status','attempts','counts','score','accepted_balance')}))
        # Exhaustive 625 tuples, partitioned into input batches <=8.
        config=generate(level,91,[[1,2,3,4],[2,3,4,5],[3,4,5,1]])
        universe=list(itertools.product(range(1,6),repeat=4))
        for i in range(0,len(universe),8):
            party=universe[i:i+8]
            assert oracle.histogram(level,config['rules'],party)==population(config['rules'],party)
            histograms+=len(party)
    # The apparent party-presence rejection compares unsigned 255 with -1.
    # Every value, present or absent, is returned after exactly one RNG call.
    for axis in range(4):
        for seed in range(100):
            m=oracle.m;oracle.prepare(1,[[1]*4]);m.write_u32(oracle.thread+0x14,seed);oracle.trace.clear()
            result=m.call(0x45be90,[0,oracle.vector,oracle.vector+4,oracle.vector+4,axis+1,1])&255
            rng=Rand(seed);assert result==rng.next(5)+1 and len(oracle.trace)==1
            helper+=1
    openings=0
    for level in (1,2,3):
        party=[[i%5+1,(i//2)%5+1,(i*3)%5+1,(i//3)%5+1] for i in range(8)]
        rules=generate(level,91,party)['rules']
        for mask in range(1,256):
            remaining=[i for i in range(8) if mask&(1<<i)]
            seed=mask*981
            pure=open_route(rules,party,remaining,seed);native=oracle.opening(level,rules,party,remaining,seed)
            assert (native['route'],native['rng_exit'])==(pure['route'],pure['rng_exit'])
            assert native['rng_trace']==[{k:r[k] for k in ('rand','state')} for r in pure['rng_trace']]
            openings+=1
    report=dict(status='passed',source_sha256=SHA,generation_cases=len(cases),native_partition_character_cases=histograms,native_value_helper_cases=helper,native_open_route_cases=openings,
                balanced=sum(r['accepted_balance'] for r in cases),fallbacks=sum(not r['accepted_balance'] for r in cases),cases=cases,
                boundary='Original setup42e99f through candidate generator, balance scoring and 5000-attempt fallback run unmodified; original CRT rand; allocation/free stubbed. No whole-session or rendered-time replay.')
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    return {k:v for k,v in report.items() if k!='cases'}



def validate_actions():
    from unicorn.x86_const import UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EDX,UC_X86_REG_EBP
    oracle=Oracle();m=oracle.m;s=oracle.scene
    collision_cases=arrival_cases=closure_cases=rescued_cases=0
    for level in (1,2,3):
        for mistakes in range(7):
            for pair_count in (0,1):
                oracle.prepare(level,[[1]*4]*8)
                m.write_u32(s+0x20,mistakes);m.write_u32(s+0x34,pair_count)
                m.call(0x42d006,registers={UC_X86_REG_ESI:s},stop_at=0x42d037)
                assert m.u32(s+0x20)==mistakes+1
                assert m.u32(s+0x34)==(pair_count+1)%2
                assert m.read(s+0x115,1)==bytes([pair_count==1])
                assert m.u32(s+0x110)==5
                collision_cases+=1
            for n in (1,2,5,8):
                oracle.prepare(level,[[1]*4]*n)
                limit=2 if level==1 else 4
                m.write_u32(s+0x20,mistakes);m.write_u32(s+0x1c,limit);m.write_u32(s+0x110,2)
                m.write_u32(0x4e4d34,0)
                m.call(0x42cc51,registers={UC_X86_REG_ESI:s,UC_X86_REG_EBX:2},ecx=oracle.vector,edx=oracle.vector+4*n,stop_at=0x42ccc0)
                assert m.u32(s+0x110)==(3 if mistakes>limit else 2)
                assert all(m.read(c+0x38,1)==bytes([mistakes<=limit]) for c in oracle.chars[:n])
                closure_cases+=1
        for n in (1,2,5,8):
            for arrived in range(n):
                oracle.prepare(level,[[1]*4]*n);m.write_u32(s+0xc,2);m.write_u32(s+0x2c,arrived)
                m.write(s+0x10d,bytes([arrived]));mode=0 if arrived<2 else 2;m.write_u32(s+0x110,mode)
                m.call(0x42ca66,registers={UC_X86_REG_ESI:s,UC_X86_REG_EBX:2},stop_at=0x42caf8)
                assert m.read(s+0x10d,1)==bytes([arrived+1])
                assert m.u32(s+0x110)==(1 if arrived+1==2 else mode)
                assert m.read(s+0x115,1)==bytes([arrived>=2 and arrived+1<n])
                assert m.read(oracle.chars[arrived]+0x38,1)==b'\0'
                arrival_cases+=1
                # Post-descent exit completion unconditionally rescues the actor.
                m.call(0x42c651,registers={UC_X86_REG_ESI:s,UC_X86_REG_EBP:arrived},stop_at=0x42c66a)
                assert m.read(oracle.chars[arrived]+0x5c,1)==b'\1'
                rescued_cases+=1
    report=dict(status='passed',source_sha256=SHA,collision_counter_cases=collision_cases,closure_cases=closure_cases,
                descent_arrival_cases=arrival_cases,exit_success_cases=rescued_cases,
                boundary='Original isolated collision counter, arrival flags, post-descent closure and exit success blocks. Curve interpolation, hit boxes and asynchronous overlap are excluded.')
    (OUT/'action-validation.json').write_text(json.dumps(report,indent=2)+'\n');return report


def export_spec():
    from native_inspect import NativeImage
    im=NativeImage('mountain-rescue');OUT.mkdir(parents=True,exist_ok=True)
    for name,start,end in [('generator',0x42e99f,0x42ede6),('trait-value-helper',0x45be90,0x45bef9),('histogram',0x42bd00,0x42be64),('opening',0x42b7d0,0x42b9c4),('descent-callback',0x42c4c0,0x42d037),('initialization',0x42d670,0x42d76a),('clue-cover',0x42ef0b,0x42ef18),('progression',0x42d2ec,0x42d361)]:
        (OUT/f'{name}.txt').write_text(im.disassembly(start,end-start)+'\n')
    manifest=[json.loads(x) for x in (ROOT/'local/derived/mountain-rescue/manifest.jsonl').read_text().splitlines()]
    assets=[{k:a[k] for k in ('source','source_sha256','format','status')} for a in manifest if '/snowboard/' in a['source'].lower()]
    reports={name:json.loads((OUT/name).read_text()) for name in ('validation.json','action-validation.json','event-validation.json')}
    event_contract=json.loads((OUT/'event-contract.json').read_text())
    spec=dict(schema_version=1,game='mountain-rescue',id='mountain-rescue/snowboard-gulch',name='Snowboard Gulch',
        state={'hidden':'Two distinct trait axes with one named value each at levels1/2, or two distinct named values each at level3. A depth-two binary tree uses the first test at the root and the identical second test at both children.',
               'party':'Ordered incoming four-trait characters, values1..5; normal party8. Launch eligibility uses character+38, rescued flag+5c.',
               'counters':'Descents+10d, mistakes+20, two-collision counter+34, phase+110, open leaf and active descent. Persistent rules for entire visit.',
               'visibility':'Level1 displays rule chart; levels2/3 draw board01 cover over it. First two descents have no active blocking collision.'},
        inputs={'levels':[1,2,3],'party_size_tested':[3,8],'seed':'CRT state at42e99f generator entry. Open-leaf draws supplied at their own entry boundary; no whole-session seed parity.'},
        actions={'launch':'Select a launchable character while no active descent. The character follows its deterministic trait route; player chooses character, not each fork.',
                 'route':'Tree node0, equality/membership =>2*node+1, nonmatch=>2*node+2; leaves3..6 map to routes0..3.',
                 'blockers':'First two descents are unblocked. Thereafter three Norfs block all but one route. Select open route by rejection sampling rand()%4 until at least one launchable remaining character uses it.',
                 'event_model':'tools/spec_mr_snowboard_events.py:launch/tick',
                 'event_contract':event_contract,
                 'event_witnesses':'local/analysis/mountain-rescue-snowboard-gulch/event-witnesses.json',
                 'settled_model':'tools/spec_mr_snowboard_gulch.py:settle consumes explicit next_open. Native arrival requests a new opening after a later descent only while phase2; arrival during speech phase5 does not set that request. Every second collision also requests a change during the moving phase; see timing boundary.'},
        feedback={'route':'Observe deterministic path and Norf collision. A collision increments both total and two-collision counters, chooses one of three audio variants, and temporarily enters speech phase5.',
                  'clues':'3 displayed value icons at levels1/2 (the two lower icons repeat); six at level3. Level1 chart visible; higher levels cover it. Ending reveals chart.'},
        success={'rescue':'Post-descent exit completion marks character+5c=1 even following a collision. The last costly descent still reaches this success callback; closure disables only later launch eligibility.',
                 'full':'All incoming characters finish. Normal progression requires exactly8 incoming with all success flags; save+177c increments, resets on3, then +13f8 increases capped3.',
                 'partial':'GO transfers successful characters through shared journey handling; unlaunched characters are stranded.',
                 'known_rule_witness':'At the supplied-event boundary: first two arbitrary descents, then wait for each requested opening before choosing a remaining character on it. That character exists by opening construction. With eventual idle/arrival/exit observations this gives a zero-collision full solution; it is not a proof about every physical event ordering.'},
        failure={'limits':[3,5,5],'semantics':'At descent completion close when mistakes>2 at level1 or>4 at levels2/3; no further launches. Correct descents do not spend mistakes. No fixed clock limit.',
                 'generator_fallback':'After5000 candidates accept the last candidate even if balance score<7; no assertion all four leaves have members.'},
        difficulty_levels=[{'level':l,'axes':2,'values_per_axis':1 if l<3 else 2,'candidate_semantic_rule_sets':300 if l<3 else 1200,'chart_visible':l==1,'initial_unblocked_descents':2,'mistake_limit':3 if l==1 else 5} for l in (1,2,3)],
        generation={'status':'Independent exact normal generator with native full-loop and ordered RNG comparisons.','model':'tools/spec_mr_snowboard_gulch.py:generate',
                    'steps':['Draw root axis rand()%4. Draw one value rand()%5+1 (levels1/2), or two values at level3; if equal retry root axis and both values.',
                             'Draw second axis rand()%4 until distinct from root. Draw its one/two values identically; at level3 equal values retry the second axis and its values.',
                             'Copy second rule to both child nodes. Compute all launchable-party leaf counts.',
                             'Score starts10; subtract3 for empty bin,1 for singleton, count-5 for bins greater than5. Stop if score>=7, otherwise retry up to5000 complete candidates; retain last.'],
                    'helper_quirk':'45be90 checks whether sampled value occurs in party, but unsigned255 is compared with signed-1 at45bee4. Rejection branch cannot fire. It always returns its one rand()%5+1 draw, including absent values.',
                    'balance':'A preference for spread across four bins, not a solvability test. Identical-party and fewer-than-five-member inputs cannot meet score7; normal loop still terminates at5000.',
                    'rng':'MSVCRT state=(214013*state+2531011) mod2^32; rand=(state>>16)&32767. Category/value rejection consumes all failed draws. Ambient, animation and audio draws outside entry boundary.'},
        assets={'corpus_manifest':'local/derived/mountain-rescue/manifest.jsonl','files':assets,'chart_cover':'Bmp/snowboard/board01.bmp and board01-a.bmp','paths':'Bmp/snowboard/pat/easy/<leaf3..6>.pat; shared exit coordinates at0x491668, copied to4ace98; original .pat coordinates and timing preserved in derived paths.'},
        evidence={'executable':{'path':str(im.source.relative_to(ROOT)),'sha256':SHA},'analysis':'local/analysis/mountain-rescue-snowboard-gulch','manual_pdf_pages':[22,33],
                  'addresses':{'generator':'42e99f..42ede6','classifier':'42bd00','opening':'42b7d0','collision':'42cf3d..42d037','arrival':'42ca33..42ccc0','rescue':'42c5e5..42c66a','clue_cover':'42ef0b,42c758','progression':'42d2ec..42d361'}},
        validation=reports,
        open_questions=['Actual audio duration, spline contacts and Norf animation completion must supply the event API observations. Native event order is compared, but a whole-engine movement trace is not. Diagnostic empty-population opening states are not asserted reachable with shipped timing.'],
        completeness={'generation':'Exact independent all-normal-level port including fallback.','actions':'Independent launch/tick model compared with native launch, ordered phase, opening RNG, collision, arrival, closure and exit blocks for supplied transport observations.','difficulty':'All three normal levels.','runtime_ui':'Excluded.','full_game_runtime_parity':False})
    output=ROOT/'local/specs/mountain-rescue/snowboard-gulch.json';output.write_text(json.dumps(spec,indent=2)+'\n')
    return dict(output=str(output),assets=len(assets))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--count',type=int,default=100)
    p.add_argument('--validate',action='store_true');p.add_argument('--validate-actions',action='store_true');p.add_argument('--export',action='store_true')
    p.add_argument('--level',type=int,choices=(1,2,3));p.add_argument('--seed',type=lambda s:int(s,0),default=0)
    p.add_argument('--party-json',type=str,help='JSON array of four-trait records')
    a=p.parse_args()
    if a.validate:print(json.dumps(validate(a.count),indent=2))
    if a.validate_actions:print(json.dumps(validate_actions(),indent=2))
    if a.export:print(json.dumps(export_spec(),indent=2))
    if a.level:
        if not a.party_json:p.error('--level requires --party-json')
        print(json.dumps(generate(a.level,a.seed,json.loads(a.party_json)),indent=2))
