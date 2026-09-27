#!/usr/bin/env python3
"""Source-guarded Magic Mirrors generator and discrete puzzle rules."""
import argparse, functools, hashlib, itertools, json, struct
from dataclasses import dataclass, field
from spec_mr_turtle_hurdle import ROOT, EXE, SHA, Rand, guard
OUT=ROOT/'local/analysis/mountain-rescue-magic-mirrors'

@functools.lru_cache(maxsize=1)
def templates():
    guard();raw=EXE.read_bytes()[0xa47e0:0xa47e0+123*80]
    return [{'id':i,'distractors':[list(struct.unpack_from('<4i',raw,i*80+j*16)) for j in range(5)],
      'source_offset':0xa47e0+i*80,'source_va':hex(0x4a47e0+i*80),'sha256':hashlib.sha256(raw[i*80:(i+1)*80]).hexdigest()} for i in range(123)]

def perm(r,n,base=0):
    a=[]
    while len(a)<n:
        v=r.next(n)+base
        if v not in a:a.append(v)
    return a

def generate(level,seed):
    assert level in (1,2,3,4)
    r=Rand(seed);w,h={1:(3,2),2:(9,6),3:(12,6),4:(12,6)}[level];alternate=0;tid=None
    if level==1:
        tid=r.next(123);pos=perm(r,6);cats=perm(r,4);values=[perm(r,5,1) for _ in range(4)]
        chars=[[0]*4 for _ in range(6)]
        for j,traits in enumerate(templates()[tid]['distractors']+[[0]*4]):
            for k,v in enumerate(traits):chars[pos[j]][cats[k]]=values[k][v]
        target=pos[5];alternate=pos[0]
    else:
        chars=[]
        while len(chars)<w*h:
            t=[r.next(5)+1 for _ in range(4)]
            if t not in chars:chars.append(t)
        target=r.next(w*h)
        if level==4:
            alternate=target
            while alternate==target:alternate=r.next(w*h)
    return {'level':level,'width':w,'height':h,'characters':chars,'target':target,'alternate':alternate,'template':tid,
      'shots':[0]*(w*h),'rng_state':r.state,'rng_trace':r.trace}

def compare(a,b):return sum(x==y for x,y in zip(a,b))

def evaluate(c,x,y,prior_shots,mark=True):
    if not(0<=x<c['width'] and 0<=y<c['height']):return -1
    i=y*c['width']+x
    if mark:
        if c['shots'][i]:return -1
        c['shots'][i]=1
        if c['level']==1 and i==c['target'] and prior_shots==0:c['target']=c['alternate']
    score=compare(c['characters'][i],c['characters'][c['target']])
    if c['level']==4:score+=10*compare(c['characters'][i],c['characters'][c['alternate']])
    return score

@dataclass
class Board:
    """Normal levels; action boundaries exclude animation, sound and wall-clock draws."""
    config:dict
    party:int=8
    balls:int|None=None
    panel:int=0
    attempts:int=0
    won:bool=False
    lost:bool=False
    pending_next:bool=False
    def __post_init__(self):
        assert self.config['level'] in (1,2,3)
        if self.balls is None:self.balls={1:12,2:8,3:6}[self.config['level']]
    def fire(self,x,y):
        if self.won or self.lost or self.pending_next:raise ValueError('Shot unavailable')
        score=evaluate(self.config,x,y,self.attempts);self.attempts+=1
        if score<0:return {'feedback':-1,'cost':0}
        if self.balls:self.balls-=1;cost='ball'
        elif self.party>1:self.party-=1;cost='zoombini'
        else:raise ValueError('No projectile')
        if score==4:
            if self.config['level']==1 and self.panel<5:self.pending_next=True
            else:self.won=True
        if not self.won and not self.pending_next and not self.balls and self.party==1:self.lost=True
        return {'feedback':score,'cost':cost,'balls':self.balls,'party':self.party,'won':self.won,'lost':self.lost,'next_panel':self.pending_next}
    def next_panel(self,entry_rng_state):
        if not self.pending_next:raise ValueError('No next panel')
        self.panel+=1;self.attempts=0;self.config=generate(1,entry_rng_state);self.pending_next=False
        if not self.balls and self.party==1:self.lost=True
    @property
    def rescued(self):return self.party if self.won else 0

class Harness:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX
        self.m=m=NativeOracle('mountain-rescue');m.uc.mem_map(0,0x1000)
        self.obj=m.alloc(0x1c);self.thread=m.alloc(256);self.trace=[]
        m.hook(0x46ec98,lambda _:self.thread);m.hook(0x46cbda,lambda m:m.alloc(m.arg(0)));m.hook(0x46c7a8,lambda _:0)
        m.uc.hook_add(UC_HOOK_CODE,lambda uc,va,size,ud:self.trace.append({'rand':m.reg(UC_X86_REG_EAX),'state':m.u32(self.thread+20)}),begin=0x46c7e1,end=0x46c7e1)
    def generate(self,l,s):
        m=self.m;m.write(self.obj,bytes(0x1c));m.write_u32(self.thread+20,s);self.trace.clear();m.call(0x4549d0,[l],ecx=self.obj)
        w=m.u32(self.obj);h=m.u32(self.obj+4);cp=m.u32(self.obj+8);sp=m.u32(self.obj+24)
        return {'level':m.u32(self.obj+20),'width':w,'height':h,'characters':[list(m.read(cp+i*156+5,4)) for i in range(w*h)],
          'target':m.u32(self.obj+12),'alternate':m.u32(self.obj+16),'shots':list(struct.unpack('<'+'I'*w*h,m.read(sp,w*h*4))),
          'rng_state':m.u32(self.thread+20),'rng_trace':self.trace[:]}
    def evaluate(self,x,y,prior,mark=True):
        v=self.m.call(0x455310 if mark else 0x455410,[x,y,prior],ecx=self.obj)
        return v if v<0x80000000 else v-0x100000000

def validate():
    h=Harness();m=h.m;gen=pred=readonly=0;seen=set();retarget=0
    for l in (1,2,3,4):
        for seed in list(range(80))+[0x7fffffff,0x80000000,0xfffffffe,0xffffffff]:
            p=generate(l,seed);actual=h.generate(l,seed)
            expected={k:p[k] for k in actual};expected['rng_trace']=[{k:r[k] for k in ('rand','state')} for r in p['rng_trace']]
            assert actual==expected,(l,seed,actual,p);gen+=1
            if l==1:seen.add(p['template'])
            # First-shot target must retarget at level 1; then visit every coordinate,
            # repeated cell and signed/out-of-bounds coordinates, comparing state too.
            coords=[(p['target']%p['width'],p['target']//p['width'])]+[(x,y) for y in range(p['height']) for x in range(p['width'])]+[(-1,0),(0,-1),(p['width'],0),(0,p['height'])]
            for n,(x,y) in enumerate(coords):
                assert h.evaluate(x,y,n,False)==evaluate(p,x,y,n,False);readonly+=1
                target=p['target'];expected=evaluate(p,x,y,n);actual=h.evaluate(x,y,n)
                assert actual==expected,(l,seed,n,x,y,actual,expected)
                assert m.u32(h.obj+12)==p['target'];retarget+=target!=p['target']
                sp=m.u32(h.obj+24);assert list(struct.unpack('<'+'I'*len(p['shots']),m.read(sp,len(p['shots'])*4)))==p['shots'];pred+=1
    exhaustive=0;seeds_by_template={}
    for seed in range(100000):
        seeds_by_template.setdefault(Rand(seed).next(123),seed)
        if len(seeds_by_template)==123:break
    assert len(seeds_by_template)==123
    for tid,seed in sorted(seeds_by_template.items()):
        for first in range(6):
            p=generate(1,seed);actual=h.generate(1,seed)
            assert p['characters']==actual['characters'] and p['template']==tid
            for prior,index in enumerate([first]+[x for x in range(6) if x!=first]):
                assert h.evaluate(index%3,index//3,prior)==evaluate(p,index%3,index//3,prior)
                assert m.u32(h.obj+12)==p['target'];exhaustive+=1
    result={'status':'passed','source_sha256':SHA,'full_generator_cases':gen,'normal_generator_cases':gen*3//4,'diagnostic_level4_cases':gen//4,
      'mutating_evaluator_cases':pred,'read_only_evaluator_cases':readonly,'first_shot_retargets':retarget,'level1_templates_sampled':len(seen),'all_template_first_shot_cases':exhaustive,'all_template_generator_cases':738,
      'boundary':['Original 4549d0 includes allocation, construction, generation, shot-flag reset; allocator/thread access isolated; source x86 RNG runs.',
        'Original 455310 and 455410 run without rule stubs, comparing every shot flag and target mutation.',
        'Level 4 is diagnostic only; normal campaign levels are 1..3.']}
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'native-parity.json').write_text(json.dumps(result,indent=2)+'\n');return result

def validate_actions():
    from unicorn.x86_const import UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EAX,UC_X86_REG_ECX,UC_X86_REG_EDX
    h=Harness();m=h.m;s=m.alloc(0x3ad00);party=m.alloc(32);characters=[m.alloc(156) for _ in range(8)]
    m.hook(0x45c080,lambda _:0);costs=0
    for n in range(1,9):
        for selected in [-1]+list(range(n)):
            m.write(s,bytes(0x3ad00));m.write(party,struct.pack('<8I',*characters));m.write_u32(0x4e4914,party);m.write_u32(0x4e4918,party+4*n)
            m.write_u32(s+0x3aa58,selected);m.write_u32(s+0x3aa64,5);m.write(0x576a6e,b'\0')
            m.call(0x431095,registers={UC_X86_REG_ESI:s,UC_X86_REG_EBX:4},stop_at=0x43114f)
            assert m.u32(s+0x3aa64)==5-(selected==-1)
            expect=characters[:n] if selected==-1 else characters[:selected]+characters[selected+1:n]
            assert m.u32(0x4e4918)==party+len(expect)*4
            assert list(struct.unpack('<'+'I'*len(expect),m.read(party,len(expect)*4)))==expect;costs+=1
    transitions=0;m.write_u32(0x4ad080,s)
    for level in (1,2,3):
        for panel in range(6):
            m.write_u32(s+0x10,level);m.write_u32(s+0x3ac34,panel)
            stop=0x42f3cc if level==1 and panel<5 else 0x42f3f9
            m.call(0x42f3ac,ecx=s,stop_at=stop)
            assert m.u32(s+0x3ac34)==panel+(level==1 and panel<5);transitions+=1
    exhaustion=0
    for n in range(1,9):
        for balls in (0,1):
            for state in (0,1,2,3):
                m.write_u32(s+0x3aa64,balls);m.write_u32(s+0x3ac30,state)
                lose=n==1 and balls==0 and state==0
                stop=0x431180 if lose else 0x43106a
                m.call(0x43114f,registers={UC_X86_REG_ESI:s,UC_X86_REG_EBX:4,UC_X86_REG_ECX:party+4*n,UC_X86_REG_EDX:party},stop_at=stop)
                exhaustion+=1
    result={'status':'passed','source_sha256':SHA,'projectile_cost_cases':costs,'exhaustion_branch_cases':exhaustion,'panel_transition_cases':transitions,
      'boundary':'Original cost block431095..43114f and transition branch42f3ac..42f3f9; rendering, destruction and campaign return are outside cost block test.'}
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'action-parity.json').write_text(json.dumps(result,indent=2)+'\n');return result

def export():
    guard();OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'authored-templates.json').write_text(json.dumps({'source_sha256':SHA,'templates':templates()},indent=2)+'\n')
    assets=[json.loads(x) for x in (ROOT/'local/derived/mountain-rescue/manifest.jsonl').read_text().splitlines() if any(q in json.loads(x)['source'].lower() for q in ('wall_of_fleens','/fleens/'))]
    evidence=[{'kind':'native','source_sha256':SHA,'address':a,'purpose':p} for a,p in [
      ('0x4549d0','Difficulty dispatch, allocation, initialization'),('0x454cd0','L1 authored template and permutations'),
      ('0x454f90','L2 unique tuples and target'),('0x4550b0','L3 unique tuples and target'),
      ('0x455310','Shot evaluator and first-shot retarget'),('0x455410','Read-only comparison'),
      ('0x430db4','Scene passes old shot count and increments it'),('0x430ddd','Correct-hit and final-board flags'),
      ('0x431095','Ball decrement or party-vector removal'),('0x43114f','One remaining, no balls, idle => failure'),
      ('0x431267','Reloading and exhaustion; final hit suppresses reload failure'),('0x42fca0','Last unrescued character exits on failure'),
      ('0x42f330','Six L1 boards, callback RNG and final completion'),('0x42f850','New-board reset preserves remaining projectiles'),
      ('0x4329a4','Initial party success flags'),('0x4329fa','12/8/6 normal cannonballs')]]
    result={'schema_version':1,'game':'mountain-rescue','id':'mountain-rescue/magic-mirrors','name':'Magic Mirrors',
      'state':{'board':'width*height distinct visible four-trait Fleens; hidden target index; shot bitmap and per-board shot count',
        'traits':'Four positional categories, values 1..5; equality, not trait labels, determines feedback.',
        'scene':'Level, zero-based panel, remaining cannonballs, ordered remaining party, won/lost/pending-next flags.'},
      'inputs':{'normal_levels':[1,2,3],'party_size':'Normally eight, inherited party may be smaller. Traits of party do not affect generator or shot scoring.',
        'rng':'32-bit CRT state at generator entry; shared animation calls can advance it between boards.'},
      'actions':[{'id':'fire','legal':'When scene accepts input, select an in-bounds unshot mirror.',
        'effect':'Set shot flag; count equal traits; spend one ball if available, otherwise sacrifice the automatically loaded last party member. Successful shots also spend their projectile.'},
        {'id':'invalid_or_repeat','effect':'Native evaluator returns -1 without marking, retargeting or scoring; caller increments attempt counter; no projectile launch.'},
        {'id':'advance_panel','effect':'After a L1 correct hit, increment panel unless already panel 5, reset shot count and generate new 3x2 board; retain ammunition and party.'},
        {'id':'go','effect':'Once completion/failure animation finishes, continue with surviving success-flagged party.'}],
      'feedback':{'normal':'Integer 0..4 counting matching trait categories, displayed in meter next to the struck mirror; 4 reveals real Fleen.',
        'first_shot_exception':'Level 1 only: if the first shot hits the initial target, replace target with the first authored distractor BEFORE scoring. This consumes no RNG.',
        'invalid':-1},
      'success':{'per_board':'Feedback 4 after possible retargeting. Unique tuples make this equivalent to shooting current target.',
        'full':'Complete all six level-1 boards, or the single level-2/3 board, without sacrificing any incoming Zoombini.',
        'partial':'Complete required boards after using Zoombinis as ammunition; remaining party continues. Completing some L1 boards alone does not rescue a subset.'},
      'failure':{'limit':'12/8/6 balls, then at most party_size-1 sacrifice shots. Last remaining Zoombini is not fired; unfinished scene with no balls ends with its success flag cleared.',
        'ordering':'A completed final hit suppresses subsequent reload failure. A nonfinal L1 completion moves to another board; zero balls/one character cannot continue.',
        'reset':'No board reroll action while solving. Animation and generic menu/replay controls outside discrete model.'},
      'difficulty_levels':[{'level':l,'width':w,'height':h,'boards':6 if l==1 else 1,'balls':b,'generator':g} for l,w,h,b,g in
        [(1,3,2,12,'123 authored five-distractor templates + implicit all-zero target, permuted positions/categories/values'),
         (2,9,6,8,'54 distinct random four-trait tuples from 625; hidden target random index'),
         (3,12,6,6,'72 distinct random four-trait tuples from 625; hidden target random index')]],
      'generation':{'status':'exact_within_entry_state_boundary','model':'tools/spec_mr_magic_mirrors.py:generate',
        'rng':'state=(214013*state+2531011) mod 2^32; rand=(state>>16)&32767; each reduction is rand % modulus, with original rejection order preserved.',
        'level1':'rand%123; rejection permutation of six positions; rejection permutation of four category slots; four rejection permutations of five values. Apply table rows 0..4 to first five permuted positions, all-zero row to sixth. Alternate target is first permuted position.',
        'levels2_3':'Draw four rand%5+1 values in trait order; reject entire tuple if already present. Repeat to fill board, then rand%(width*height) selects target. No solver/acceptance filter.',
        'template_provenance':{'va':'0x4a47e0','file_offset':0xa47e0,'count':123,'record_bytes':80,'table_bytes':9840,'local_export':str((OUT/'authored-templates.json').relative_to(ROOT))},
        'callback_rng':'42f330 consumes one rand%16+15 for idle timer before entering the next generator. Other elapsed-time/animation RNG calls mean a campaign seed alone is not a complete replay input.',
        'diagnostic_level4':'Implemented separately:72 unique tuples,two distinct random target indices, feedback matches_first+10*matches_second. Not part of normal three-level scope.'},
      'assets':assets,'evidence':evidence+[{'kind':'manual','pdf_pages':[21,32,33],'source_sha256':'59c8950e5b7e81eca6daa1d91028302584853a9cda4683ee813ec13cc43e44c3'}],
      'validation':{k:json.loads((OUT/f'{k}.json').read_text()) for k in ('native-parity','action-parity') if (OUT/f'{k}.json').exists()},
      'open_questions':[],
      'completeness':{'status':'complete_within_declared_boundary','boundary':'Normal discrete generation, legal mirror actions, feedback/retargeting, ammunition, six-panel progression and rescue outcome.',
        'excluded':['Pixel hit regions, animation interpolation and asynchronous event races','Bit-identical campaign replay including animation/sound RNG','Generic menu, save/Go infrastructure','Diagnostic level-four scene completion']}}
    path=ROOT/'local/specs/mountain-rescue/magic-mirrors.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(result,indent=2)+'\n')
    return {'templates':len(templates()),'assets':len(assets),'spec':str(path)}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--validate',action='store_true');p.add_argument('--validate-actions',action='store_true');p.add_argument('--export',action='store_true');a=p.parse_args()
    if a.validate:print(json.dumps(validate(),indent=2))
    if a.validate_actions:print(json.dumps(validate_actions(),indent=2))
    if a.export:print(json.dumps(export(),indent=2))
