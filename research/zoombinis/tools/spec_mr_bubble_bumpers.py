#!/usr/bin/env python3
"""Source-guarded Bubble Bumpers grid/tick reconstruction and native experiments."""
import argparse, copy, hashlib, itertools, json, random, struct
from dataclasses import dataclass,field
from spec_mr_turtle_hurdle import ROOT,EXE,SHA,Rand,guard
OUT=ROOT/'local/analysis/mountain-rescue-bubble-bumpers'
DXY=[(-1,0),(1,0),(0,-1),(0,1),(0,0)]
TURN={24:[2,3,1,0],25:[3,2,0,1],26:[2,3,0,1],27:[3,2,1,0],28:[2,3,2,3]}
CYCLE={10:(11,3),11:(10,1),12:(13,3),13:(12,2),14:(15,1),15:(14,0),
 36:(37,1),37:(36,2),38:(39,3),39:(38,1),40:(41,1),41:(40,0),
 42:(43,2),43:(44,3),44:(42,0),45:(47,3),46:(45,1),47:(46,2),48:(50,1),49:(48,2),50:(49,0)}

def blank(party):
    return {'party':copy.deepcopy(party),'cells':[[1,4,0,0,0,0] for _ in range(192)],'positions':[[-1,-1] for _ in range(192)]}

def authored_grid(va):
    guard();v=struct.unpack('<1152i',EXE.read_bytes()[va-0x400000:va-0x400000+4608])
    return [list(v[(y*16+x)*6:(y*16+x+1)*6]) for x in range(16) for y in range(12)]

def best_trait(party,indices,limit):
    """444ea0: largest positive frequency strictly below limit; first tie."""
    best=(0,0);count=0
    for cat in range(1,5):
      for val in range(1,6):
        n=sum(party[i][cat-1]==val for i in indices)
        if count<n<limit:best=(cat,val);count=n
    return best

def random_trait(party,indices,rng,absent=False):
    """444c20 present outside subset; 444d50 absent from entire party."""
    values=[[0]*5 for _ in range(4)]
    for traits in party:
        for c,v in enumerate(traits):values[c][v-1]=2
    for i in indices:
        for c,v in enumerate(party[i]):values[c][v-1]=1
    target=0 if absent else 2
    if not any(target in row for row in values):
        if absent:return (0,0)
        raise ValueError('Native rejection sampler has no qualifying trait')
    while True:
        c=rng.next(4);v=rng.next(5)
        if values[c][v]==target:return(c+1,v+1)

L2_PRUNE=[
 [[0xf0c,0xf24],[0x60c,0x63c,0xeac,0xf6c],[0xbc4,0xbf4],[0xb64,0xc0c,0x2ac,0x2dc],[0xdec,0xe04],[0x30c,0x42c,0xe4c,0xd8c]],
 [[0xd8c,0xdec,0xe04,0xe4c],[0x60c,0x63c],[0xbc4,0xbf4],[0xb64,0xc0c,0x2ac,0x2dc],[0xf0c,0xf24],[0x30c,0x42c,0xf6c,0xeac]],
 [[0xf0c,0xf24],[0xeac,0xf6c,0x60c,0x63c],[0xaa4,0xad4],[0x2ac,0x2dc,0xa44,0xaec],[0xdec,0xe04],[0x30c,0x42c,0xe4c,0xd8c]],
 [[12+(x*12+y)*24 for x,y in coords] for coords in [[(13,4),(13,5)],[(13,0),(13,8),(5,4),(5,6)],[(10,5),(10,7)],[(2,4),(2,6),(10,1),(10,8)],[(12,4),(12,5)],[(2,8),(3,8),(12,8),(12,0)]]]
]

def generate_level2(party,seed,pretrait_bytes=None):
    rng=Rand(seed);n=len(party);a=(n+1)//2;b=(n-a)//2;c=(a-b)//2
    pretrait_bytes=[0]*n if pretrait_bytes is None else pretrait_bytes
    f1=best_trait(party,range(n),a)
    selected=[i for i in range(n) if (party[i][f1[0]-1] if f1[0] else pretrait_bytes[i])==f1[1]]
    while len(selected)<a:
        i=rng.next(n)
        if i not in selected:selected.append(i)
    selected=selected[:a]
    f2=best_trait(party,selected,b) if b else (0,0)
    if not f2[0]:f2=random_trait(party,selected,rng)
    marked=[0]*a;second=[]
    for i,z in enumerate(selected):
        if party[z][f2[0]-1]==f2[1] and len(second)<b:second.append(i);marked[i]=1
    while len(second)<b:
        i=rng.next(a)
        if not marked[i]:second.append(i) # Original never marks random additions.
    f3=best_trait(party,second,c) if c else (0,0) # Positions used as party IDs.
    if not f3[0]:f3=random_trait(party,second,rng)
    variant=rng.next(4);out=blank(party);out['cells']=authored_grid(0x4965f0+4608*variant)
    def cell(off):return out['cells'][(off-12)//24]
    cell(0x99c)[3:5]=f1;cell([0x294,0x294,0x5f4,0x5f4][variant])[3:5]=f2
    cell(0x534)[0:2]=[14,0];cell(0x534)[5]=1
    off=[0xe1c,0xf3c,0xb94,0xa74][variant];cell(off)[0:2]=[7,1];cell(off)[3:5]=f3
    for cutoff,offsets in zip(range(7,1,-1),L2_PRUNE[variant]):
        if n<=cutoff:
            for off in offsets:cell(off)[:5]=[1,4,0,0,0]
    return out|{'level':2,'variant':variant+2,'rng_state':rng.state,'rng_trace':rng.trace,'pretrait_bytes':list(pretrait_bytes)}

def unique_pick(party,marked,rng):
    """445e50: one random index, not rejection over already marked indices."""
    z=rng.next(len(party))
    if marked[z]:return -1
    if any(i!=z and row==party[z] for i,row in enumerate(party)):
        marked[z]=2;return -1 # Native additionally writes mark[n]=2 beyond logical array.
    marked[z]=1;return z

def differing_pick(party,z,marked,rng,minimum):
    if z<0 and minimum==2:return -1
    traits=party[z] if z>=0 else [0]*4
    choices=[i for i,row in enumerate(party) if not marked[i] and sum(a!=b for a,b in zip(row,traits))>=minimum]
    if not choices:return -1
    result=choices[rng.next(len(choices))];marked[result]=1;return result

def generate_level3(party,seed):
    rng=Rand(seed);n=len(party);used=[0]*n;best_count=50;best_values=None
    def traits(z):return party[z] if z>=0 else [0]*4
    for tries in range(10000):
        marked=[0]*n;second_marks=[0]*n
        while True:
            z=unique_pick(party,marked,rng);w=differing_pick(party,z,second_marks,rng,2)
            if all(marked) or w>=0:break
        exhausted=all(marked);marked=[0]*n
        if exhausted and w<0:
            while True:
                z=unique_pick(party,marked,rng);w=differing_pick(party,z,second_marks,rng,1)
                if all(marked) or w>=0:break
        first,second=traits(z),traits(w)
        if w<0:
            z=rng.next(n);w=rng.next(n);s=rng.next(4)+1;b=rng.next(4)+1
            first,second=party[z],party[w]
            values=[first[s-1],second[s-1],first[s-1],second[s-1]]
            if s==b:raise ValueError('Original fallback loops forever when its first two category draws agree')
            break
        diffs=[c for c in (3,4,1,2) if first[c-1]!=second[c-1]]
        s=diffs[0] if diffs else 0;b=diffs[1] if len(diffs)>1 else 0
        if not b:
            while True:
                b=rng.next(4)+1
                if b!=s:break
        values=[first[s-1] if s else 0,second[s-1] if s else 0,first[b-1],second[b-1]]
        if z>=0:used[z]=1
        used[w]=1
        cross=sum(row[s-1]==values[0] and row[b-1]==values[3] for row in party) if s else 0
        if not cross:break
        if cross<best_count:best_count=cross;best_values=values[:]
        if all(used):values=best_values;break
    else:raise ValueError('Native pair-selection loop did not settle')
    while True:
        g=rng.next(4)+1;h=rng.next(4)+1
        if len({s,b,g,h})==4:break
    first,second=traits(z),traits(w)
    starts=[[values[0],values[1]],[values[2],values[3]],
            [first[g-1],second[g-1] if second[g-1]!=first[g-1] else 0],
            [first[h-1],second[h-1] if second[h-1]!=first[h-1] else 0]]
    for v in starts:
        if not v[0]:v[0]=rng.next(5)+1
        if not v[1]:
            while True:
                v[1]=rng.next(5)+1
                if v[1]!=v[0]:break
        while len(v)<5:
            q=rng.next(5)+1
            if q not in v:v.append(q)
    variant=rng.next(2);out=blank(party);out['cells']=authored_grid(0x49adf0+4608*variant)
    def cell(off):return out['cells'][(off-12)//24]
    prunes=[[0x204,0x21c,0xfc,0xe4],[0x6b4,0x594,0x474,0x234]][variant]
    for cutoff,off in zip(range(7,3,-1),prunes):
        if n<=cutoff:cell(off)[:5]=[1,4,0,0,0]
    for off,t,d,meta in ([(0x36c,11,3,2),(0x2f4,38,1,1)] if not variant else [(0x204,10,1,1),(0x354,36,2,1)]):
        cell(off)[0:2]=[t,d];cell(off)[5]=meta
    layouts=[
      [[(0xdec,6,0),(0x954,9,3),(0xc9c,9,3),(0xf0c,6,0),(0xe34,6,0)],[(0xcb4,9,3),(0x93c,8,2),(0xf54,6,0),(0xd2c,9,3),(0xd44,9,3)],[None,None,(0x9cc,8,2),(0x9e4,8,2),(0x774,6,0)],[None,None,(0x894,6,0),(0x72c,7,1),(0x84c,7,1)]],
      [[(0x81c,8,2),(0x63c,6,0),(0x5f4,6,0),(0x804,9,3),(0xb7c,8,2)],[(0x714,6,0),(0x75c,7,1),(0xb64,8,2),(0xcb4,6,0),(0xdd4,6,0)],[None,None,(0xcfc,7,1),(0xe1c,7,1),(0xc0c,8,2)],[None,None,(0x894,8,2),(0x8ac,8,2),None]]
    ]
    for cat,v,targets in zip((s,b,g,h),starts,layouts[variant]):
        for value,target in zip(v,targets):
            if target:
                off,t,d=target;cell(off)[0:2]=[t,d];cell(off)[3:5]=[cat,value]
    return out|{'level':3,'variant':variant+6,'rng_state':rng.state,'rng_trace':rng.trace}

def insert(b,x,y,z):
    if not(0<=x<16 and 0<=y<12 and 0<=z<len(b['party'])):return 1
    i=x*12+y
    if b['cells'][i][0] not in (60,61):return 1
    old=b['positions'][i][0];b['positions'][i]=[z if old==-1 else old+1000*z,b['cells'][i][1]];return 0

def tick(b):
    c=b['cells'];old=copy.deepcopy(b['positions']);new=[[-1,-1] for _ in range(192)];moved=[0]*len(b['party']);trigger=[False]*7
    changes=[];lost=[];saved=[];whirlpool=[]
    def move(i,d):
        z=old[i][0]
        if z==-1:return
        dx,dy=DXY[d] if d in range(5) else (0,0);x,y=divmod(i,12);j=(x+dx)*12+y+dy
        if not 0<=j<192:raise ValueError('Malformed board moves outside native grid')
        moved[z]=1;p=new[j][0];new[j]=[z if p==-1 else p+1000*z,d]
    for i,cell in enumerate(c):
        z,d=old[i];t,forced,_,cat,value,_=cell
        if z==-1 or 51<=t<=57:continue
        if t==1 or 20<=t<=23 or 29<=t<=35 or t in (60,61):move(i,d)
        elif 2<=t<=5 or 10<=t<=15 or 36<=t<=50:move(i,forced)
        elif 6<=t<=9:
            trait=b['party'][z][cat-1] if cat else b.get('pretrait_bytes',[0]*len(b['party']))[z]
            move(i,forced if trait==value else d)
        elif 16<=t<=19:move(i,forced);changes.append([i//12,i%12,forced,4]);cell[0]+=4;cell[1]=4
        elif t in TURN:move(i,TURN[t][d])
    for i,cell in enumerate(c):
        if 29<=cell[0]<=35 and old[i][0]!=-1:trigger[cell[0]-29]=True
    # The original repeats according to the final eligible magnet's result (DL),
    # not a Python any() reduction; keep source ordering exactly.
    for _ in range(193):
        again=False
        for i,cell in enumerate(c):
            z,d=old[i]
            if z==-1 or not 51<=cell[0]<=57 or moved[z]:continue
            if new[i][0]!=-1:move(i,new[i][1]);again=True
            elif trigger[cell[2]-29]:move(i,d);again=True
            else:again=False
        if not again:break
    else:raise ValueError('Magnet pass did not settle')
    for i,cell in enumerate(c):
        z=old[i][0]
        if z==-1:continue
        if cell[0]==62:saved.append(z)
        if cell[0]==58:whirlpool.extend([z%1000,z//1000] if z>=1000 else [z])
    for i,cell in enumerate(c):
        z=new[i][0]
        if z>=1000 and cell[0]!=58:
            pair=[z%1000,z//1000];lost+=pair;new[i][0]=-1
            for j in range(192):
                if old[j][0] in pair:old[j][0]=-1
                if new[j][0] in pair:new[j][0]=-1
    for i,(z,d) in enumerate(new):
        prior=old[i][0]
        if z==-1 or prior==-1:continue
        positions=[j for j,p in enumerate(old) if p[0]==z]
        if not positions:continue
        j=positions[-1]
        if new[j][0]==prior and prior!=z:
            lost.extend([z,prior]);old[j][0]=new[j][0]=old[i][0]=new[i][0]=-1
    for i,cell in enumerate(c):
        t=cell[0]
        activate=(10<=t<=15 and old[i][0]!=-1) or (36<=t<=50 and trigger[cell[2]-29])
        if activate:
            nt,nd=CYCLE[t];changes.append([i//12,i%12,next(v[1] for v in CYCLE.values() if v[0]==t),nd]);cell[0]=nt;cell[1]=nd
    for i,cell in enumerate(c):
        if cell[0] in (58,62):old[i][0]=-1
    for i,(z,d) in enumerate(old):
        if z!=-1 and not moved[z]:new[i]=[z,d]
    b['positions']=new
    return {'lost':lost,'saved':saved,'whirlpool':whirlpool,'changes':changes,'triggers':trigger}

class Harness:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX
        self.m=m=NativeOracle('mountain-rescue');m.uc.mem_map(0,0x1000);self.obj=m.alloc(0x1e44);self.party=m.alloc(156*16);self.thread=m.alloc(256);self.trace=[]
        m.hook(0x46ec98,lambda _:self.thread);m.hook(0x46cbda,lambda m:m.alloc(m.arg(0)));m.hook(0x46c7a8,lambda _:0)
        m.uc.hook_add(UC_HOOK_CODE,lambda uc,va,size,ud:self.trace.append({'rand':m.reg(UC_X86_REG_EAX),'state':m.u32(self.thread+20)}),begin=0x46c7e1,end=0x46c7e1)
    def init(self,party,pretrait_bytes=None):
        m=self.m;m.write(self.obj,bytes(0x1e44));m.write(self.party,bytes(16*156))
        for i,traits in enumerate(party):m.write(self.party+156*i+5,bytes(traits))
        m.call(0x441480,[self.party,len(party)],ecx=self.obj)
        if pretrait_bytes is not None:
            for i,v in enumerate(pretrait_bytes):m.write(m.u32(self.obj)+156*i+4,bytes([v]))
    def put(self,b):
        self.init(b['party'],b.get('pretrait_bytes'));m=self.m
        m.write(self.obj+12,struct.pack('<1152i',*sum(b['cells'],[])))
        m.write(self.obj+0x180c,struct.pack('<384i',*sum(b['positions'],[])))
    def snapshot(self):
        m=self.m;cells=list(struct.unpack('<1152i',m.read(self.obj+12,4608)));p=list(struct.unpack('<384i',m.read(self.obj+0x180c,1536)))
        return {'cells':[cells[i:i+6] for i in range(0,len(cells),6)],'positions':[p[i:i+2] for i in range(0,len(p),2)]}
    def tick(self):
        m=self.m;m.call(0x447600,ecx=self.obj);out=self.snapshot()
        events={}
        for name,ptr,count,size in [('lost',0x1e10,0x1e1c,1),('saved',0x1e14,0x1e20,1),('whirlpool',0x1e18,0x1e24,1),('changes',0x1e30,0x1e28,4)]:
            n=m.u32(self.obj+count);vals=list(struct.unpack('<'+'i'*n*size,m.read(m.u32(self.obj+ptr),n*size*4)))
            events[name]=vals if size==1 else [vals[i:i+size] for i in range(0,len(vals),size)]
        events['triggers']=[bool(x) for x in m.read(self.obj+0x1e38,7)];return out,events
    def generate(self,level,party,seed,pretrait_bytes=None):
        self.init(party,pretrait_bytes);m=self.m;self.trace.clear();m.write_u32(self.thread+20,seed)
        m.call(0x441a60,[level],ecx=self.obj,max_instructions=20000000,timeout_us=20000000)
        return self.snapshot()|{'party':party,'level':level,'variant':m.u32(self.obj+8),'rng_state':m.u32(self.thread+20),'rng_trace':self.trace[:]}

@dataclass
class Session:
    """Discrete rule actions, after animation gates settle. No pixel/timer model."""
    board:dict
    status:list=field(default_factory=list)
    def __post_init__(self):
        if not self.status:self.status=['waiting']*len(self.board['party'])
    def launch(self,z,x,y):
        if not 0<=z<len(self.status) or self.status[z]!='waiting':return False
        if insert(self.board,x,y,z):return False
        self.status[z]='active';return True
    def advance(self):
        result=tick(self.board)
        for z in result['lost']+result['whirlpool']:self.status[z]='lost'
        for z in result['saved']:self.status[z]='saved'
        return result
    def outcome(self):
        return {'all_resolved':all(v in ('lost','saved') for v in self.status),
          'full_success':all(v=='saved' for v in self.status),'continue':[i for i,v in enumerate(self.status) if v=='saved'],
          'return_to_rescue':[i for i,v in enumerate(self.status) if v!='saved']}

def validate_generators():
    guard();h=Harness();r=random.Random(20260920);cases={2:0,3:0};variants={2:set(),3:set()};draws={2:[],3:[]}
    parties=[]
    for n in range(2,13):
        parties.append(([[1+(i//5**c)%5 for c in range(4)] for i in range(n)],list(range(12))))
        for _ in range(4):
            p=[]
            while len(p)<n:
                row=[r.randrange(1,6) for _ in range(4)]
                if row not in p:p.append(row)
            parties.append((p,[0,1,2,31,42,65535,0xffffffff]))
    for party,seeds in parties:
      for seed in seeds:
       for level,fn in ((2,generate_level2),(3,generate_level3)):
        expected=fn(party,seed);actual=h.generate(level,party,seed)
        for key in ('cells','positions','variant','rng_state'):assert expected[key]==actual[key],(level,len(party),seed,key)
        assert [{k:v for k,v in t.items() if k!='modulus'} for t in expected['rng_trace']]==actual['rng_trace']
        cases[level]+=1;variants[level].add(actual['variant']);draws[level].append(len(actual['rng_trace']))
    result={'status':'passed','source_sha256':SHA,'cases':cases,'variants':{k:sorted(v) for k,v in variants.items()},
      'rng_draw_ranges':{k:[min(v),max(v)] for k,v in draws.items()},'normal_party_sizes':'2..8; 9..12 diagnostic',
      'comparison':'Full native441a60 dispatch for levels2/3; all192 cells ×6 fields, all192 occupancy/directions, variant, every raw RNG draw and state; independent Python trait selection and layout model.',
      'boundary':'Unique valid four-trait parties. Single-member and repeated-identical-trait native rejection/invalid-memory paths are not characterized as normal supported generator inputs.'}
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'generator-parity.json').write_text(json.dumps(result,indent=2)+'\n');return result

def validate_interactions():
    h=Harness();party=[[1,2,3,4],[2,3,4,5],[3,4,5,1],[4,5,1,2]];compound=0;traces=0;launches=0;insertion=0
    def check(b,label):
        expect=tick(b);actual,events=h.tick()
        assert actual=={k:b[k] for k in actual},(label,'state')
        assert events==expect,(label,'events',events,expect)
    for ids in [(0,1),(1,0),(1,2),(2,1)]:
      for target in [1,10,16,24,26,29,36,51,58,62]:
       for scenario in ['converge','swap','magnet','trigger','pushchain','holdchain']:
        b=blank(party);i=8*12+6;b['cells'][i]=[target,1,29,2,2,0]
        if scenario=='converge':b['positions'][i-12]=[ids[0],1];b['positions'][i+12]=[ids[1],0]
        elif scenario=='swap':b['positions'][i-12]=[ids[0],1];b['positions'][i]=[ids[1],0]
        elif scenario=='magnet':b['positions'][i]=[ids[0],1];b['positions'][i-12]=[ids[1],1];b['cells'][i][0]=51
        elif scenario=='trigger':b['positions'][i]=[ids[0],1];b['cells'][i][0]=51;b['positions'][i-12]=[ids[1],2];b['cells'][i-12][0]=29
        else:
            for j,z in zip([i-12,i],ids):b['positions'][j]=[z,1];b['cells'][j][0]=51;b['cells'][j][2]=29
            if scenario=='pushchain':b['positions'][i-24]=[3,1]
        h.put(b);check(b,(ids,target,scenario));compound+=1
    for t in range(63):
      for z in (-1,0,3,4):
       for occupied in (False,True):
        b=blank(party);b['cells'][8*12+6]=[t,1,0,0,0,0]
        if occupied:b['positions'][8*12+6]=[1,0]
        h.put(b);a=insert(b,8,6,z);native=h.m.call(0x447580,[8,6,z],ecx=h.obj)
        assert a==native and h.snapshot()['positions']==b['positions'];insertion+=1
    p=[[1+(i//5**c)%5 for c in range(4)] for i in range(8)]
    for level,fn in ((2,generate_level2),(3,generate_level3)):
     for seed in range(12):
      b=fn(p,seed);h.put(b);entry=[i for i,c in enumerate(b['cells']) if c[0] in (60,61)];waiting=list(range(8))
      for step in range(100):
        if waiting and step%3==0:
            candidates=[i for i in entry if b['positions'][i][0]==-1]
            if candidates:
                i=candidates[(step+seed)%len(candidates)];z=waiting.pop(0);x,y=divmod(i,12)
                assert insert(b,x,y,z)==h.m.call(0x447580,[x,y,z],ecx=h.obj);launches+=1
        check(b,(level,seed,step));traces+=1
    result={'status':'passed','source_sha256':SHA,'compound_tick_cases':compound,'entry_validation_cases':insertion,
      'generated_trace_boards':24,'generated_trace_ticks':traces,'generated_trace_launches':launches,
      'boundary':'Full tick+insertion native functions; simultaneous converging/swap collisions, magnet push/hold/trigger chains, whirlpool/exit interactions, source-order and zero-character-ID cases. Trace schedule inserts at most one bubble every three ticks.'}
    (OUT/'interaction-parity.json').write_text(json.dumps(result,indent=2)+'\n');return result

def validate_lifecycle():
    from unicorn.x86_const import UC_X86_REG_EDI
    h=Harness();m=h.m;scene=m.alloc(0xc300);vector=m.alloc(64);chars=[m.alloc(156) for _ in range(12)];save=m.alloc(0x2000)
    for i,p in enumerate(chars):m.write_u32(vector+4*i,p)
    m.write_u32(0x4e4914,vector);m.write_u32(0x575c54,save)
    m.write(0x576a6e,b'\1') # Normal campaign path; avoid unrelated cleanup branch.
    for addr in (0x461010,0x468b40,0x468f30):m.hook(addr,lambda _:0)
    done=0;progress=0
    for n in range(1,9):
      m.write_u32(0x4e4918,vector+4*n)
      for saved in range(n+1):
       for lost in range(n-saved+1):
        m.write(scene+0xc264,b'\0')
        for i,p in enumerate(chars):m.write(p+0x5c,bytes([int(i<saved)]));m.write(p+0x78,bytes([int(saved<=i<saved+lost)]))
        m.call(0x425fcc,registers={UC_X86_REG_EDI:scene},stop_at=0x42603c)
        assert bool(m.read(scene+0xc264,1)[0])==(saved+lost==n);done+=1
    for n in (7,8,9):
     m.write_u32(0x4e4918,vector+4*n)
     for all_saved in (False,True):
      for level in (1,2,3):
       for streak in (0,1,2):
        for i,p in enumerate(chars):m.write(p+0x5c,bytes([int(all_saved or i!=0)]))
        m.write_u32(save+0x1768,streak);m.write_u32(save+0x13e4,level)
        m.call(0x4251d5,stop_at=0x425263)
        qualifies=n==8 and all_saved;expected_streak=(streak+1)%3 if qualifies else streak
        expected_level=min(3,level+1) if qualifies and streak==2 else level
        assert (m.u32(save+0x1768),m.u32(save+0x13e4))==(expected_streak,expected_level);progress+=1
    result={'status':'passed','source_sha256':SHA,'resolved_branch_cases':done,'progression_branch_cases':progress,
      'boundary':'Original scene blocks425fcc..42603c and4251d5..425263; only sound/notification routines replaced; all-resolved and exact-eight saved progression predicates unchanged.'}
    (OUT/'lifecycle-parity.json').write_text(json.dumps(result,indent=2)+'\n');return result

def validate_metadata():
    party=[[1,2,3,4],[2,1,4,3]];h=Harness();count=0;tick_cases=0
    for meta in itertools.product((0,1,255),repeat=2):
      for seed in range(4):
        expected=generate_level2(party,seed,meta);actual=h.generate(2,party,seed,meta)
        for key in ('cells','positions','rng_state','variant'):assert expected[key]==actual[key],(meta,seed,key)
        count+=1
    for value in (0,1,255):
      for t in range(6,10):
        b=blank(party);b['pretrait_bytes']=[value,0];i=8*12+6;b['cells'][i]=[t,1,0,0,0,0];b['positions'][i]=[0,2]
        h.put(b);events=tick(b);actual,native_events=h.tick()
        assert events==native_events and actual=={k:b[k] for k in actual};tick_cases+=1
    result={'status':'passed','source_sha256':SHA,'cases':count,
      'conditional_category0_tick_cases':tick_cases,
      'field':'Byte4 of each156-byte INTERNAL roster record; constructor does not initialize this byte.',
      'boundary':'L2 category-zero first partition with two-member party; all0/1/255 byte combinations and four seeds. pretrait_bytes is explicit model input, applied after constructor and before generator.'}
    (OUT/'pretrait-byte-parity.json').write_text(json.dumps(result,indent=2)+'\n');return result

def validate_fallback():
    from unicorn import UC_HOOK_CODE
    h=Harness();branches={'best_values':0,'one_difference_fallback':0};cases=0
    h.m.uc.hook_add(UC_HOOK_CODE,lambda *args:branches.__setitem__('best_values',branches['best_values']+1),begin=0x4453b2,end=0x4453b2)
    h.m.uc.hook_add(UC_HOOK_CODE,lambda *args:branches.__setitem__('one_difference_fallback',branches['one_difference_fallback']+1),begin=0x4450ad,end=0x4450ad)
    parties=[[[a,b,c,1] for a,b,c in itertools.product((1,2),repeat=3)],
      [[a,b,c,d] for a,b,c,d in itertools.product((1,2),repeat=4)][:8],
      [[a,b,1,1] for a,b in itertools.product((1,2),repeat=2)],[[a,1,1,1] for a in range(1,6)]]
    for party in parties:
      for seed in range(64):
        expected=generate_level3(party,seed);actual=h.generate(3,party,seed)
        for key in ('cells','positions','variant','rng_state'):assert expected[key]==actual[key],(party,seed,key)
        assert [{k:v for k,v in t.items() if k!='modulus'} for t in expected['rng_trace']]==actual['rng_trace'];cases+=1
    assert branches['best_values'] and branches['one_difference_fallback']
    result={'status':'passed','source_sha256':SHA,'cases':cases,'native_branch_hits':branches,
      'boundary':'Dense unique binary-trait parties and one-category-only variation; full generation/RNG comparison with native4453b2 best-values and4450ad one-difference-fallback branch coverage.'}
    (OUT/'level3-fallback-parity.json').write_text(json.dumps(result,indent=2)+'\n');return result

def export():
    guard();OUT.mkdir(parents=True,exist_ok=True);data=EXE.read_bytes();templates=[];devices=[]
    for variant in range(8):
        va=0x4941f0+variant*4608;raw=data[va-0x400000:va-0x400000+4608]
        cells=authored_grid(va)
        templates.append({'variant':variant,'normal_level':1 if variant<2 else 2 if variant<6 else 3,
          'va':hex(va),'file_offset':va-0x400000,'length':4608,'sha256':hashlib.sha256(raw).hexdigest(),
          'source_sha256':SHA,'source_layout':'12 rows ×16columns ×6little-endian int32; exported xmajor index=x*12+y',
          'cells':cells,'entries':[divmod(i,12) for i,c in enumerate(cells) if c[0] in (60,61)]})
    for t in range(2,62):
        ptr=0x9069c+4*(t-2);off=struct.unpack_from('<I',data,ptr)[0]-0x400000;name=data[off:data.index(b'\0',off)].decode('ascii')
        devices.append({'id':t,'name':name,'pointer_table_offset':ptr,'name_offset':off,'source_sha256':SHA,
          'asset':f'Data/Bmp/mystic_marsh/SYMBOLS/{name}.rb'})
    (OUT/'authored-templates.json').write_text(json.dumps(templates,indent=2)+'\n')
    (OUT/'device-bindings.json').write_text(json.dumps(devices,indent=2)+'\n')
    manifest=ROOT/'local/derived/mountain-rescue/manifest.jsonl'
    assets=[json.loads(x) for x in manifest.read_text().splitlines() if 'mystic_marsh' in x.lower()]
    files=('tick-parity','generator-parity','interaction-parity','lifecycle-parity','pretrait-byte-parity','level3-fallback-parity','level1-parity','level1-trait-prefix-validation')
    validations={f:json.loads((OUT/(f+'.json')).read_text()) for f in files if (OUT/(f+'.json')).exists()}
    spec={'schema_version':1,'game':'mountain-rescue','id':'mountain-rescue/bubble-bumpers','name':'Bubble Bumpers',
      'state':{'grid':'16columns ×12rows. Each cell[type,forced_direction,trigger_id,trait_category,trait_value,auxiliary_metadata]. Xmajor cell index=x*12+y; auxiliary_metadata is preserved, unused by the movement rule.',
        'directions':{'0':'left','1':'right','2':'up','3':'down','4':'stationary'},
        'occupancy':'Per-cell[character_id,direction]; -1empty. Native temporarily encodes two occupants as old_id+1000*new_id; model preserves source-order and zero-ID behavior.',
        'roster':'Ordered four-trait tuples1..5. Normally eight characters, possibly fewer after previous losses. Waiting, active, rescued and lost status kept separately.',
        'memory':'Internal copied roster byte4 is not initialized by441480/441620/45bf00. Category0 accesses it. L2 model exposes pretrait_bytes; default0 specifies isolated zeroed heap, not guaranteed original allocator behavior.'},
      'inputs':{'normal_levels':[1,2,3],'rng':'32bit CRT state immediately at generation entry; shared cosmetic RNG means campaign seed alone is insufficient.',
        'entry_state':'For L1, native backend explicitly specifies stack_fill plus zero-initialized isolated heap. Independent L1 prefix inputs include four old value5 words, incoming BL, untouched B output category/value and extra existence-scan words. For L2, pretrait_bytes supports internal byte4. L3 validated for unique normal trait tuples; malformed/duplicate and one-member paths can reach extra native memory or nontermination.'},
      'actions':[{'id':'launch','legal':'A waiting Zoombini at an entry cell of type60/61, x0..15,y0..11; scene must have no pending launch.',
        'effect':'447580 installs character with entry direction. Once launched, no manual steering/removal is exposed. Scene426650 blocks overlapping launch callbacks using4acc0c and waits1000ms; tick waits for pending launch and movement animations to settle.'},
        {'id':'wait','legal':'Any active board','effect':'Advance one discrete native447600 tick. Multiple already-launched bubbles advance simultaneously in source xmajor order.'},
        {'id':'leave','effect':'Generic Go/scene exit keeps rescued characters, returns unsaved characters to rescue pool. A trapped bubble is not equivalent to a successful crossing.'}],
      'feedback':{'movement':'Visible path and direction, device rotations/disappearance, trait icons, trigger/magnet reactions; no hidden score or arbitrary wrong-answer limit.',
        'rules':{'1,20..23,29..35,60,61':'Continue incoming direction;29..35 also activate trigger0..6.',
          '2..5':'Always use forced direction.','6..9':'Use forced direction iff selected character trait equals value, otherwise continue incoming direction. Category0 reads internal byte4.',
          '10..15':'Use forced direction, then toggle device according to exported cycle map when an old occupant remains.',
          '16..19':'Use forced direction once, then become20..23 with direction4.',
          '24..28':'Direction mappings exported in turn_map; rotations, elbows and converger.',
          '36..50':'Use forced direction; change cycle state if linked trigger fired anywhere during tick.',
          '51..57':'Magnet holds old bubble until linked trigger or another bubble arrives. Incoming bubble replaces held bubble; held bubble moves in arriving bubble direction. Chained passes preserve the original last-eligible-magnet boolean termination behavior.',
          '58':'Whirlpool removes and loses old occupant(s). Two arrivals at this cell are not collision-popped before whirlpool processing next tick.',
          '62':'Exit rescues old occupant on next tick.','0,59':'No movement branch; carry old occupant forward if not removed.'},
        'turn_map':TURN,'cycle_map':CYCLE,
        'tick_order':['Snapshot old occupancy; clear next occupancy/output lists','Move nonmagnet bubbles, perform one-time mutations','Mark triggers from old occupied trigger cells','Process holding/releasing/pushed magnet chains','Record old exit and whirlpool occupants','Resolve cooccupancy and pairwise edge swaps as collisions','Apply occupied/triggered cyclic device mutations','Remove old exit/whirlpool occupants; carry unadvanced occupants; derive display events'],
        'collision':'Two bubbles converging on same nonwhirlpool destination or swapping adjacent positions are lost. Magnet replacement/pushing is handled before collision detection. See exact source-order implementation for ID0 temporary encoding.'},
      'success':{'full':'Every incoming character reaches type62 and is recorded rescued. Full normal roster means8.',
        'partial':'Any rescued subset survives scene exit; unresolved/trapped/lost characters do not. Rescue does not require all occupants to exit simultaneously.',
        'all_resolved':'Native42600f sets resolution flag when rescued-count + lost-flag-count equals incoming count. This condition is distinct from full success.',
        'progression':'Normal campaign scene exit counts a success only for exactly8 characters, each success flag set. Increment save+1768; when it reaches3 reset0 and increment save+13e4 capped3. Partial rescue does not count.'},
      'failure':{'individual':'Collision or whirlpool sets lost flag. An immobile held or cyclically circulating bubble can remain unresolved until scene exit.',
        'limits':'No global wrong-answer or move counter. Each roster member has one launch for this board. Native scene has10animation slots; normal party is8.',
        'generator_pathologies':'A rejection sampler with no eligible outside-subset trait has no native exit. Model raises ValueError for this condition. Actual heap/stack bytes influence some generator paths; no universal solvability claim is made.'},
      'difficulty_levels':[
        {'level':1,'templates':[0,1],'entry_count':1,'generation':'Random one of two template builders, best of up to30 candidates; first quality12 exits; exact native-backed entry-state contract, separately reconstructed selection and initial trait-selection prefix.',
          'mechanic':'Sequence trait-routed bubbles across alternating/cyclic devices; candidate quality is not equated to proven solvability.'},
        {'level':2,'templates':[2,3,4,5],'entry_count':3,'generation':'Build trait partitions of sizesceil(n/2),floor(floor(n/2)/2),floor((ceil(n/2)-second_size)/2); select one of4templates; bind3conditional traits; prune devices at n<=7,6,5,4,3,2.',
          'mechanic':'Multiple entry choices and interdependent trigger/magnet routes. Exact cell pruning tables in executable model.'},
        {'level':3,'templates':[6,7],'entry_count':2,'generation':'Select nonidentical character pair preferring>=2trait differences, fallback>=1. First two differing categories ordered3,4,1,2; rejection-fill remaining categories/values; choose one of2templates; prune devices at n<=7,6,5,4.',
          'mechanic':'Routes use all four trait categories with many conditional diversions. First two categories expose five comparisons; remaining categories use subsets, exactly as stored bindings.'}],
      'generation':{'status':'mixed_pure_and_native_backed_with_explicit_memory_contract','model':'tools/spec_mr_bubble_bumpers.py:generate_level2/generate_level3',
        'level1_model':'tools/spec_mr_bubble_level1.py:LevelOne.generate',
        'level1_trait_model':'tools/spec_mr_bubble_level1_traits.py',
        'rng':'state=(214013*state+2531011) mod2^32; rand=(state>>16)&32767; rand%modulus with original rejection order.',
        'level1_detail':'Initial trait selector and complete initial builder prefix independently ported in tools/spec_mr_bubble_level1_traits.py with explicit old stack BL, four uninitialized value5 table words, previous B output slots and extra existence-scan words. Same roster/seed can produce different selections under different incoming bytes. Full candidate builders remain native-backed.',
        'level1_early_return':{'source':'0x441ba0 helper; both0x441d70/0x442a30 caller prefixes',
          'example':{'party':[[5,5,5,5],[1,5,5,5]],'seed':0,'old_value5_words':[0,0,0,0],'selected_a':[1,1],'helper_return':1},
          'effect':'A exhausts the selectable table before B is selected; helper leaves B outputs untouched. Both builders then read previous B category at frame B+0x48 and value at B+0x3c. Independent/native comparisons cover old B=(0,0),(3,2),(4,5), both builders:6cases.',
          'prefix_consequence':'C and D, orientation, initial score and RNG retain the explicit old-B dependency. C selection leaves BL nonzero, so D accepts its first draw.'},
        'level1_rejection_diagnostics':{'evidence':'local/analysis/mountain-rescue-bubble-bumpers/level1-trait-prefix-validation.json',
          'cases':[{'party':[[5,5,5,5]],'extra_scan_word':0,'phase':'first sample'},
                   {'party':[[1,5,5,5]],'extra_scan_word':2,'phase':'second sample'}],
          'result':'Each original helper call exhausted a20000-instruction budget in its RNG/rejection loop. Independent model raises NoCandidate when no selectable table entry equals2; this is a model signal, not a native return value.',
          'reason':'Existence scans also read four output pointers and an extra caller word. An extra scanned2 can claim availability although no randomly selectable category/value is eligible. The bounded observations support the static loop analysis; they are not completed native generation comparisons.'},
        'level2_detail':'best_trait chooses first category/value with maximal positive frequency strictly less than limit. Fill first subset with rejection sampling and marks. Second subset stores indices within first subset, later interpreted as original roster IDs. Random additions to second subset are not marked and may repeat. Three traits inserted before party-size pruning; sixth cell field preserved by erase helper.',
        'level3_detail':'Pair search counts cross-trait combinations, accepting zero crossings, otherwise retaining best values when all examined members are covered. Categories are not saved with fallback best values, preserving source behavior. Unused sampled values still consume RNG. Helpers445e50/445fb0/4460d0 and full binding sequence are ported.',
        'templates':{'count':8,'bytes':36864,'start_va':'0x4941f0','file_offset':0x941f0,'export':'local/analysis/mountain-rescue-bubble-bumpers/authored-templates.json'},
        'diagnostic_level4':'446220 exists but is excluded from the three normal difficulty levels; not independently ported.'},
      'assets':assets,'evidence':[{'kind':'native','source':str(EXE.relative_to(ROOT)),'source_sha256':SHA,'addresses':{
        'constructor':'441480/441620','dispatcher':'441a60','level1':'441d70/442a30','level2':'443de0','level3':'444fa0',
        'insertion':'447580','tick':'447600','collision':'447ed0','launch_scene':'426650','scene_tick':'425420',
        'resolved':'425fcc..42603c','progression':'4251d5..42524b','device_names':'49069c'}},
        {'kind':'manual','pdf_pages':[20,32],'source_sha256':'59c8950e5b7e81eca6daa1d91028302584853a9cda4683ee813ec13cc43e44c3'}],
      'validation':validations,
      'open_questions':['Standalone high-level level1 candidate-builder port remains incomplete; original functions are the executable backend under specified stack/heap bytes.',
        'Original allocator/stack history is not reconstructed: same level/roster/seed is not sufficient for bit-identical game replay on memory-dependent paths, including untouched B output slots on the documented early-return path and extra existence-scan words.',
        'Repeated-identical trait and one-character level3 fallback paths can read outside the logical roster or fail to terminate; full concrete-memory characterization remains outside validated pure-model input domain.'],
      'completeness':{'status':'partial_generator_memory_boundary','complete':['All62 device types, simultaneous tick rules, insertion, full vs partial rescue and exact-eight difficulty progression','Pure level2/3 generation for declared validated domain, all8 authored normal templates and97resource bindings','Level1 original-function generator backend, all candidate traces and independently checked acceptance/selection'],
        'excluded':['Pixel hit-testing, animation interpolation/timing races, generic save/menu controls','Diagnostic fourth-level generation','Campaign replay with original stack/heap and cosmetic RNG history']}}
    path=ROOT/'local/specs/mountain-rescue/bubble-bumpers.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(spec,indent=2)+'\n')
    return {'spec':str(path),'templates':len(templates),'devices':len(devices),'assets':len(assets),'status':spec['completeness']['status']}

def validate():
    h=Harness();cases=0
    party=[[1,2,3,4],[2,3,4,5],[3,4,5,1],[4,5,1,2]]
    for t in range(1,63):
      for d in range(4):
       for match in (False,True):
        b=blank(party);i=8*12+6;b['cells'][i]=[t,1,29,2,2 if match else 1,0];b['positions'][i]=[1,d]
        # Trigger external switched devices as a separate simultaneous bubble.
        if match:b['cells'][2*12+2]=[29,4,0,0,0,0];b['positions'][2*12+2]=[2,1]
        h.put(b);expect=tick(b);actual,events=h.tick()
        assert actual=={k:b[k] for k in actual},(t,d,match,'state',[(k,i,a,v) for k in actual for i,(a,v) in enumerate(zip(actual[k],b[k])) if a!=v])
        assert events==expect,(t,d,match,'events',events,expect);cases+=1
    result={'status':'passed','source_sha256':SHA,'single_device_tick_cases':cases,'boundary':'Full original tick function447600; all62 device IDs,4 approach directions,with/without external trigger; compare grid,positions,rescue/loss lists,device changes and trigger flags.'}
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'tick-parity.json').write_text(json.dumps(result,indent=2)+'\n');return result

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--validate',action='store_true');p.add_argument('--validate-generators',action='store_true');p.add_argument('--validate-interactions',action='store_true');p.add_argument('--validate-lifecycle',action='store_true');p.add_argument('--validate-metadata',action='store_true');p.add_argument('--validate-fallback',action='store_true');p.add_argument('--export',action='store_true');a=p.parse_args()
    if a.validate:print(json.dumps(validate(),indent=2))
    if a.validate_generators:print(json.dumps(validate_generators(),indent=2))
    if a.validate_interactions:print(json.dumps(validate_interactions(),indent=2))
    if a.validate_lifecycle:print(json.dumps(validate_lifecycle(),indent=2))
    if a.validate_metadata:print(json.dumps(validate_metadata(),indent=2))
    if a.validate_fallback:print(json.dumps(validate_fallback(),indent=2))
    if a.export:print(json.dumps(export(),indent=2))
