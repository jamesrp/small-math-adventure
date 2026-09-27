#!/usr/bin/env python3
"""Fleens: native trait mapping and target generation, settled queue projection."""
import argparse
from dataclasses import dataclass, field
import hashlib
import json
import struct
from native_analysis import ROOT, KNOWN_SHA256, logical_journey_random
from spec_lj_provenance import family_assets, source_evidence

OUT=ROOT/'local/analysis/logical-journey-fleens'
SOURCE_SHA256=KNOWN_SHA256['logical-journey']

class Random:
    def __init__(self,state):self.state=state&0xffffffff;self.trace=[]
    def draw(self,lo,hi):
        self.state,value=logical_journey_random(self.state,hi-lo);value+=lo
        self.trace.append({'min':lo,'max':hi,'value':value});return value

def positions(resource):
    path=ROOT/f'local/derived/logical-journey/resources/fleens/REGS/{resource:05}.bin'
    data=path.read_bytes();values=struct.unpack('>'+'H'*(len(data)//2),data)
    return [list(values[i:i+2]) for i in range(1,len(values),2)]

def generate(party,level,state,history=None):
    """0x413990. Traits and saved offsets/categories are native one-based values."""
    if level not in range(4) or not 1<=len(party)<=16:raise ValueError('level0..3, party1..16')
    if any(len(t)!=4 or any(v not in range(1,6) for v in t) for t in party):raise ValueError('four traits1..5')
    rng=Random(state);n=len(party);targets=[]
    while len(targets)<min(3,n):
        index=rng.draw(1,n)
        if index not in targets:targets.append(index)
    saved=list(history or [0]*8);offsets=saved[:4];categories=saved[4:]
    if not offsets[0] or level in (1,3):offsets=[rng.draw(1,5) for _ in range(4)]
    if level>1:
        if not categories[0] or level==3:
            first=rng.draw(2,4);categories=[first];used={first-1}
            for _ in range(3):
                pick=rng.draw(0,3)
                while pick in used:pick=(pick+1)%4
                used.add(pick);categories.append(pick+1)
    else:categories=[0]*4
    tops,ground=positions(5000),positions(5001);a=b=0;fleens=[]
    for i,traits in enumerate(party):
        mapped=[0]*4
        for k,v in enumerate(traits):mapped[(categories[k]-1) if categories[k] else k]=(v+offsets[k]-2)%5+1
        if i+1 in targets:slot=17+a;point=tops[a];a+=1
        else:slot=b;point=ground[b];b+=1
        idle=rng.draw(0,80)
        fleens.append({'party_index':i,'traits':mapped,'slot':slot,'position':point,'idle_phase':idle,'target':i+1 in targets})
    return {'difficulty_native':level,'ui_level':level+1,'party':list(map(list,party)),'target_indices_1based':targets,
            'precleared_targets':max(0,3-n),'value_offsets':offsets,'category_targets':categories,'saved_mapping':offsets+categories,
            'fleens':fleens,'rng_entry':state,'rng_exit':rng.state,'rng_trace':rng.trace}

@dataclass
class FleensState:
    """Settled six-slot tree queue; exact callback scheduling is outside this API."""
    generated:dict
    tree:list=field(default_factory=list)
    lured:set=field(default_factory=set)
    cleared:set=field(default_factory=set)
    lost:set=field(default_factory=set)
    departed:bool=False
    def lure(self,identity):
        if self.departed or self.won or identity not in range(len(self.generated['party'])) or identity in self.lured:raise ValueError('lure unavailable')
        self.lured.add(identity);self.tree.append(identity)
        if identity+1 in self.generated['target_indices_1based']:self.cleared.add(identity)
        evicted=self.tree.pop(0) if len(self.tree)==7 else None
        if evicted is not None:self.lost.add(evicted)
        return {'matched_fleen':identity,'target_cleared':identity in self.cleared,'evicted_from_tree':evicted,'won':self.won}
    @property
    def won(self):return len(self.cleared)+self.generated['precleared_targets']==3
    def go(self):
        if self.departed or not self.won:raise ValueError('clear all three target positions first')
        self.departed=True
        return {'passed':[i for i in range(len(self.generated['party'])) if i not in self.lost], 'lost':sorted(self.lost), 'rescued_from_tree':list(self.tree)}

class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        self.m=NativeOracle('logical-journey');m=self.m
        self.context=m.alloc(0xc000);m.write_u32(0x4a2818,self.context)
        self.resources={}
        for rid in (5000,5001):
            points=positions(rid);data=struct.pack('<H',len(points))+b''.join(struct.pack('<HH',*p) for p in points)
            self.resources[rid]=m.alloc(len(data),data)
        m.hook(0x4481a0,lambda m:self.count)
        m.hook(0x447c90,lambda m:self.resources[m.arg(0)&0xffff],pop=8)
        m.hook(0x413de0,self.construct,pop=4)
        m.write_u16(0x48bc28,0)
    def construct(self,m):
        p=m.arg(0);self.records.append({'traits':list(m.read(p+0xc0,4)),'slot':m.read(p+0xf4,1)[0],
                                      'position':[m.u16(p+0xa8),m.u16(p+0xaa)],'idle_phase':m.read(p+0xfd,1)[0]})
        return len(self.records)
    def generate(self,party,level,state,history=None):
        m=self.m;self.count=len(party);self.records=[]
        m.write(self.context,b'\0'*0xc000);m.write(self.context+0xe,bytes(history or [0]*8))
        for i,t in enumerate(party):m.write(self.context+0xb83c+20*i,bytes(t));m.write(self.context+0xb844+20*i,b'\1')
        for a in (0x495c18,0x495c1a,0x495c1c,0x495c2a,0x495d32):m.write_u16(a,0)
        m.write_u16(0x495d6c,level);m.write_u32(0x4959d0,state)
        m.call(0x413990,stop_at=0x413d58)
        return {'records':self.records,'saved_mapping':list(m.read(self.context+0xe,8)),
                'target_indices_1based':[m.u16(0x495c18+2*i) for i in range(min(3,len(party)))],
                'precleared_targets':m.u16(0x495c2a),'rng_exit':m.u32(0x4959d0)}

def validate():
    oracle=Oracle();cases=[]
    for level in range(4):
        for n in (1,2,3,8,16):
            party=[[(i//(5**k))%5+1 for k in range(4)] for i in range(n)]
            for seed in (0,1,42,0xffffffff,0x12345678):
                for history in (None,[2,4,5,1,2,1,4,3]):
                    model=generate(party,level,seed,history);native=oracle.generate(party,level,seed,history)
                    for key in ('saved_mapping','target_indices_1based','precleared_targets','rng_exit'):assert model[key]==native[key],(level,n,seed,history,key,model[key],native[key])
                    wanted=[{k:r[k] for k in ('traits','slot','position','idle_phase')} for r in model['fleens']]
                    assert wanted==native['records'],(level,n,seed,wanted,native['records'])
                    cases.append({k:model[k] for k in ('ui_level','rng_entry','rng_exit','saved_mapping','target_indices_1based')})
    OUT.mkdir(parents=True,exist_ok=True)
    report={'status':'passed','source_sha256':SOURCE_SHA256,'native_generation_cases':len(cases),'failures':[],
            'boundary':'Original0x413990 and RNG execute until0x413d58; actual REGS5000/5001 supplied; object constructor captures records; renderer and animation excluded.'}
    (OUT/'native-validation.json').write_text(json.dumps(report,indent=2)+'\n');(OUT/'witnesses.json').write_text(json.dumps(cases,indent=2)+'\n');print(json.dumps(report,indent=2))

def write_spec():
    evidence=source_evidence(OUT,[('generator',0x413990,0x413dd9),('lure_and_targets',0x412891,0x4129c8),('tree_capacity',0x414307,0x41442b),('go_and_drag',0x412d24,0x413025),('callbacks',0x413fe0,0x414614),('eviction_dispatch',0x412ae1,0x412c1e),('escape_and_victory',0x414a90,0x415477),('party_serialization',0x44a990,0x44abf2),('mark_survivors',0x44b090,0x44b160),('marker_dispatch',0x4585c6,0x458692)])
    report=json.loads((OUT/'native-validation.json').read_text()) if (OUT/'native-validation.json').exists() else {'status':'not_run'}
    lifecycle_path=OUT/'lifecycle-validation.json'
    lifecycle=json.loads(lifecycle_path.read_text()) if lifecycle_path.exists() else {'status':'not_run'}
    validation={'generation':report,'lifecycle':lifecycle,'report_files':[{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in (OUT/'native-validation.json',lifecycle_path) if p.exists()]}
    spec={'schema_version':1,'game':'logical-journey','id':'fleens','name':'Fleens',
          'state':{'party':'1..16 four-tuples, native values1..5','mapping':'saved journey context+0x0e..0x15 (eight bytes)','targets':'up to three unique party indices; missing positions precleared','tree':'ordered distinct-identity lure queue, capacity6; oldest evictions enter lost set','lost':'Evicted Zoombinis are disabled (actor+0xe2=0), excluded from departure success; survivors include current tree queue and never-lured party','target_progress':'0..3','native_globals':{'targets':'0x495c18[3]','target_progress':'0x495c2a','tree_size':'0x495c24','tree_members':'0x495d20','paired_fleens':'0x495b18'}},
          'inputs':['party','native difficulty0..3 / UI1..4','32-bit RNG entry state','eight saved mapping bytes; zero bytes denote unset'],
          'actions':[{'id':'lure','rule':'Drag an available Zoombini onto the sole lure slot. Its paired Fleen is selected by identity, not by runtime trait search. Each identity can lure once: its paired Fleen becomes unavailable. Disable new lures after target_progress3. Model consumes a fully settled chase/overflow callback sequence.'},{'id':'reposition','rule':'Other legal ground drags reposition Zoombinis without changing the mapping.'},{'id':'go','rule':'Enabled only after all three target positions cleared and callback phase allows it.'}],
          'feedback':['Paired Fleen chases the dragged Zoombini; its traits are cyclic shifts followed by the generated category permutation.','A targeted Fleen increases target progress.','When queue grows to7, oldest pair is shifted out and size reduced to6. The old Zoombini later becomes inactive/lost. Clearing a target is permanent even if that lure is subsequently evicted.'],
          'success':{'condition':'target_progress==3','transfer':'After victory settles, mark all still-active Zoombinis successful; GO saves those successes. Current tree queue is rescued in last-in-first-out animation order; never-lured active Zoombinis also pass. Evicted inactive Zoombinis do not pass.', 'passed_count':'If the third target is cleared by lure k, passed=n-max(0,k-6). Choosing the three known targets first preserves the entire party; fewer than three incoming actors have absent target positions precleared.', 'partial':'When more than six distinct lures are required, the oldest k-6 Zoombinis are lost; at least the final six survive for k>=6. There is no early GO before all three targets clear.'},
          'failure':{'fixed_attempt_limit':None,'cost':'Each distinct lure beyond six evicts and loses the oldest queued Zoombini. No generic wrong-answer budget, replacement/retry of the same identity, or elapsed time limit. Target progress survives eviction.'},
          'difficulty_levels':[{'ui_level':i+1,'native_index':i,'value_offsets':('reuse saved if set; otherwise four draws1..5' if i in (0,2) else 'four new draws1..5 every encounter'),'categories':('identity (saved four bytes zeroed)' if i<2 else ('reuse saved if set; otherwise new permutation' if i==2 else 'new permutation every encounter'))} for i in range(4)],
          'generation':{'implementation':'tools/spec_lj_fleens.py:generate','native':'0x413990','rng_order':['Select min(3,n) distinct1-based target indices using draws1..n, rejecting repeats.','Refresh4cyclic offsets if first saved offset zero or UI2/UI4.','UI3/UI4 category refresh if first saved category zero or UI4: draw first destination2..4; three draws0..3 each scanned upward wrapping until unused. UI1/UI2 use identity.','Iterate party order; map each trait by1+((value+offset-2)%5); put it in destination category or same category when zero. Assign targets to REGS5000 in party order, other Fleens REGS5001 in party order. Draw idle phase0..80 per member.'],
                        'important':'Not arbitrary value permutations: only cyclic shifts. Category permutation excludes first category staying fixed but does not require all categories move. Prior mapping persistence is difficulty-specific.'},
          'assets':family_assets('fleens'),'evidence':evidence,'validation':validation,
          'open_questions':['Frame timing, arbitrary overlapping UI actions, idle Fleen movement and sound RNG interleaving are outside the settled action/generator entry contracts.'],
          'completeness':{'generation':'complete for supplied state, native compared','core_action_lifecycle':'Complete at sequential settled action boundary; original callback, active/success flags and party serialization compared','full_spec':True,'full_spec_scope':'Puzzle mathematics, legal settled actions, outcomes and entry-state generation; runtime animation/UI excluded','full_game_runtime_parity':False}}
    spec['assets']['bindings']={'positions':['REGS5000 three target positions','REGS5001 seventeen other positions'],'fleen_sprite_bank':'tBMP4000','fleen_animation_streams':'SCRS4000..4058, runtime multipart composition','zoombini_animation_streams':'SCRS6000..6004 and7000..7045; chase7000..7009/7041..7045, saved tree drain7026..7030','callback_events':'local/analysis/logical-journey-fleens/animation-events.json; source hashes and zero-based frame indices. Nonzero marker low byte minus1 -> callback; ff00 no event. Overflow132 comes fromff85 in ordinary/final chase; drain131 fromff84; completion-1 supplied by engine.','help':'zoombini STRL2300/2320/2340/2360'}
    path=ROOT/'local/specs/logical-journey/fleens.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(spec,indent=2)+'\n')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--validate-native',action='store_true');p.add_argument('--write-spec',action='store_true');a=p.parse_args()
    if a.validate_native:validate()
    if a.write_spec:write_spec()
