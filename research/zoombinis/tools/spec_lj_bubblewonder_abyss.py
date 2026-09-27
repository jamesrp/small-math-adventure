#!/usr/bin/env python3
"""Bubblewonder native generation backend and independent board transition core.

Generation runs hash-guarded source function slices in memory; it is not an
independent port. Pure node/rule helpers and saved exported boards need stdlib.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import random
import struct
from native_analysis import ROOT,KNOWN_SHA256,logical_journey_random
from spec_lj_provenance import family_assets,source_evidence
OUT=ROOT/'local/analysis/logical-journey-bubblewonder-abyss'
HASH=KNOWN_SHA256['logical-journey']

def template_id(level,count,visits=(0,0,0,0)):
    if level not in range(4) or not 1<=count<=16:raise ValueError('UI1..4/native0..3; party1..16')
    if level==3 and count<5:return 4,16609,0
    return level,16600+2*level+visits[level],visits[level]

def template(resource):
    path=ROOT/f'local/derived/logical-journey/resources/maze2/REGS/{resource:05}.bin'
    data=path.read_bytes();values=struct.unpack('>'+'h'*(len(data)//2),data)
    assert len(values)==10*(values[0]+1)
    return {'resource_id':resource,'sha256':hashlib.sha256(data).hexdigest(),'header':list(values[:10]),'records':[list(values[i:i+10]) for i in range(10,len(values),10)]}

def source_tables():
    p=ROOT/'local/discs/logical-journey/INSTALL/HD/Zoombinis Logical Journey.exe';b=p.read_bytes()
    if hashlib.sha256(b).hexdigest()!=HASH:raise ValueError('unrecognized native source')
    words=lambda start,n:list(struct.unpack_from('<'+'h'*n,b,start-0x400000))
    return {'trait_codes':[words(0x48d910+4*i,2) for i in range(21)],'color_bases':words(0x48d8f8,11),
            'launch_directions':words(0x48d604,14),'launch_ledges':words(0x48d674,14),'launch_positions':[words(0x48d6ec+4*i,2) for i in range(14)],'launch_pixel_positions':[words(0x48d594+4*i,2) for i in range(14)],'drag_bounds':[words(0x48d8d8+8*i,4) for i in range(4)],'edge_types':words(0x48d724,18),'edge_coordinates':[words(0x48d748+4*i,2) for i in range(18)]}

def build_nodes(t,traits,colors,tables):
    nodes=[];j=0
    for i,r in enumerate(t['records']):
        kind,x,y,group,*_=r;axis=value=0
        if kind==2:
            code=traits[j];axis0,value=tables['trait_codes'][code];axis=axis0+1;j+=1
        nodes.append({'index':i,'kind':kind,'x':x,'y':y,'group':group,'allowed_directions':r[4:8],
                      'direction':r[8],'cycles_after_use':bool(r[9]),'trait_axis':axis,'trait_value':value,
                      'color_sprite_base':colors[group-1] if 2<=group<=8 else colors[0], 'held_actor':None})
    return nodes

DXY=((0,-1),(1,0),(0,1),(-1,0))
def next_position(x,y,d):
    dx,dy=DXY[d];return [max(0,min(12,x+dx)),max(0,min(12,y+dy))]

def cycle(node):
    for n in range(1,5):
        d=(node['direction']+n)%4
        if node['allowed_directions'][d]:node['direction']=d;return d
    raise ValueError('native cycling loop has no enabled direction')

def arrival(node,traits,direction):
    """Local arrival effect; group release/collision scheduling belongs to session."""
    kind=node['kind'];out={'direction':direction,'held':False,'trigger_group':None,'return_to_ledge':False}
    if kind==1:out['return_to_ledge']=True
    elif kind==2:
        if traits[node['trait_axis']-1]==node['trait_value']:out['direction']=node['direction']
    elif kind in (3,4):
        out['direction']=node['direction']
        if node['cycles_after_use']:cycle(node)
    elif kind==5:out['held']=True
    elif kind==6:out['trigger_group']=node['group']
    return out

class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        self.m=NativeOracle('logical-journey');m=self.m;self.objects={};self.records=[];self.rng=[]
        self.party=m.alloc(68);m.hook(0x44a920,lambda m:self.party)
        m.hook(0x447c90,self.resource,pop=8);m.hook(0x455db0,self.construct,pop=32)
        m.hook(0x456380,lambda m:self.objects.get(m.arg(0)&65535,0),pop=4)
        m.hook(0x42b2b0,lambda m:0);m.hook(0x457400,lambda m:0)
        m.write_u16(0x48bc28,0);self.coords=m.alloc(13*13*4)
        def trace(uc,addr,size,data):
            maximum=m.arg(0)&65535;before=m.u32(0x4959d0);after,value=logical_journey_random(before,maximum)
            self.rng.append({'maximum':maximum,'state_before':before,'value':value,'state_after':after,'return_address':hex(m.u32(m.reg(__import__('unicorn.x86_const',fromlist=['UC_X86_REG_ESP']).UC_X86_REG_ESP)))})
        m.uc.hook_add(UC_HOOK_CODE,trace,begin=0x40f9a0,end=0x40f9a0)
    def resource(self,m):
        self.template=template(m.arg(0)&65535);t=self.template
        vals=t['header']+sum(t['records'],[]);data=struct.pack('<'+'h'*len(vals),*vals)
        return m.alloc(len(data),data)
    def construct(self,m):
        identity=len(self.objects)+1;p=m.alloc(0x200);self.objects[identity]=p
        m.write_u16(p+0x1a,identity)
        if m.arg(5):m.write(p+0x30,m.read(m.arg(5),0x108))
        self.records.append({'identity':identity,'speed':m.arg(4),'address':p});return identity
    def generate(self,party,level,state,visits=(0,0,0,0)):
        effective,rid,variant=template_id(level,len(party),visits);m=self.m
        m.hook(0x447d20,lambda m:0)
        m.write(0x499efc,bytes(0x1200));m.write_u32(0x49a20c,self.coords)
        m.write(self.party,struct.pack('<HH',len(party),0)+bytes(v for t in party for v in t))
        for i,v in enumerate(visits):m.write_u16(0x49b098+2*i,v)
        m.write_u16(0x49a39c,len(party));m.write_u16(0x49a3e2,effective);m.write_u16(0x49a9ea,1)
        m.write_u32(0x4959d0,state);self.rng=[];self.objects={};self.records=[]
        resource=m.call(0x4273f0,[effective]);assert self.template['resource_id']==rid
        m.write_u32(0x49aba8,resource);m.write_u16(0x49a3e0,self.template['header'][0])
        m.call(0x4274a0,[effective],stop_at=0x42761d)
        conditions=[m.u16(0x49a274+2*i) for i in range(m.u16(0x49a2ce))]
        colors=[m.u16(0x49a562+2*i) for i in range(8)]
        generation_end=m.u32(0x4959d0);generation_trace=list(self.rng)
        m.call(0x427650,[self.template['header'][0]])
        nodes=build_nodes(self.template,conditions,colors,source_tables())
        native=[]
        for record in self.records:
            p=record['address']+0x30;v=[m.u16(p+0x3c+2*i) for i in range(13)]
            native.append({'kind':v[0],'x':v[1],'y':v[2],'group':v[3],'allowed_directions':v[4:8],
                           'direction':v[8],'cycles_after_use':bool(v[9]),'color_sprite_base':v[10],
                           'trait_axis':v[11],'trait_value':v[12]})
        for pure,other in zip(nodes,native):
            keys=set(other)-({'trait_axis','trait_value'} if pure['kind']!=2 else set())
            assert all(pure[k]==other[k] for k in keys),(pure,other)
        return {'difficulty_native':level,'effective_native_difficulty':effective,'ui_level':level+1,'party':list(map(list,party)),
                'history_before':list(visits),'history_after':[m.u16(0x49b098+2*i) for i in range(4)],'variant':variant,
                'template':self.template,'conditions':conditions,'colors':colors,'nodes':nodes,
                'edge_cells':[{'kind':kind,'x':xy[0],'y':xy[1]} for kind,xy in zip(source_tables()['edge_types'],source_tables()['edge_coordinates'])],
                'rng_entry':state,'rng_after_rule_generation':generation_end,'rng_exit':m.u32(0x4959d0),
                'rng_trace':generation_trace,'actor_speed_trace':self.rng[len(generation_trace):],
                'backend':'hash-guarded original generator executed in isolated memory; independent node assembly comparison',
                'presentation_boundary':'42b2b0 draw and engine object construction stubbed; kind1/5 decorative frame counter excluded, logical node fields compared.'}

def validate_generation():
    oracle=Oracle();cases=[];counts=Counter();OUT.mkdir(parents=True,exist_ok=True)
    for level in range(4):
        for n in (1,4,5,16):
            party=[[(i//(5**k))%5+1 for k in range(4)] for i in range(n)]
            for variant in ((0,2) if level==3 else (0,1)):
                history=[0]*4;history[level]=variant
                for seed in (0,42,0xffffffff):
                    result=oracle.generate(party,level,seed,history)
                    assert len(result['nodes'])==result['template']['header'][0]
                    assert len(result['actor_speed_trace'])==len(result['nodes'])
                    assert all(v['maximum']==5 for v in result['actor_speed_trace'])
                    assert len([r for r in result['nodes'] if r['kind']==2])<=len(result['conditions'])
                    assert all(1<=r['trait_axis']<=4 and 1<=r['trait_value']<=5 for r in result['nodes'] if r['kind']==2)
                    counts[str(result['template']['resource_id'])]+=1
                    name=f'ui{level+1}-n{n}-v{variant}-s{seed}.json';(OUT/name).write_text(json.dumps(result,indent=2)+'\n')
                    cases.append({'path':name,'template':result['template']['resource_id'],'native_nodes':len(result['nodes'])})
    report={'status':'passed','source_sha256':HASH,'native_generator_exports':len(cases),'native_node_assembly_comparisons':sum(c['native_nodes'] for c in cases),'templates':dict(counts),'failures':[],
            'claim':'Generator backend is original native code, not independent generator parity. Independently assembled logical nodes equal native constructed nodes. Ordered RNG trace and full template/party/history preserved per case.'}
    (OUT/'native-generation-validation.json').write_text(json.dumps(report,indent=2)+'\n');(OUT/'exports.json').write_text(json.dumps(cases,indent=2)+'\n');print(json.dumps(report,indent=2))


GROUP_ARRAYS={2:(0x49a2c4,0x49ab74),3:(0x49a3a0,0x49a474),4:(0x49a28c,0x49a058),5:(0x49a398,0x49aadc),6:(0x49a81c,0x49ac44),7:(0x49a880,0x49a240),8:(0x49a87c,0x49a5a4)}

class EventOracle:
    """Source-backed logical event inputs; engine-generated event order is explicit.

    These calls run original callback code, not a fabricated fixed-rate clock.
    Events20/30/40/50 reserve;21/31/41/51/61 enqueue arrival. Reservation is
    conditional on actor word+c8==3, as in the source. Caller must not synthesize
    duplicate events: animation event sequencing belongs to the player's engine.
    """
    def __init__(self):
        from native_oracle import NativeOracle
        self.m=m=NativeOracle('logical-journey');self.objects={};self.presentation=[];self.visual_id=10000
        m.hook(0x455db0,self.visual,pop=32)
        m.hook(0x456380,lambda m:self.objects.get(m.arg(0)&65535,0),pop=4)
        for addr,pop in ((0x44b160,0),(0x44b3d0,0),(0x42b100,0),(0x419730,0),(0x4588d0,0),(0x456a60,0),(0x456e80,0),(0x457400,0),(0x456cb0,24),(0x4639c0,8)):
            m.hook(addr,lambda m,a=addr:self.presentation.append({'address':hex(a),'args':[m.arg(i) for i in range(4)]}) or 0,pop=pop)
        m.hook(0x447d20,lambda m:0)
        m.write(0x499efc,bytes(0x1200));m.write_u32(0x49a20c,m.alloc(13*13*4,bytes(13*13*4)))
    def visual(self,m):
        self.visual_id+=1;identity=self.visual_id;p=m.alloc(512,bytes(512));self.objects[identity]=p
        m.write_u16(p+0x1a,identity);return identity
    def entity(self,identity,traits=(1,1,1,1),x=6,y=6,direction=0,ledge=0):
        m=self.m;p=self.objects.get(identity)
        if p is None:p=m.alloc(512);self.objects[identity]=p
        m.write(p,bytes(512));m.write_u16(p+0x1a,identity);m.write(p+0xf0,bytes(traits))
        for offset,val in ((0x58,direction),(0x72,x),(0x74,y),(0x76,ledge),(0xc8,3)):m.write_u16(p+offset,val)
        return p
    def node(self,identity,node):
        p=self.entity(identity);m=self.m
        vals=[node['kind'],node['x'],node['y'],node.get('group',1),*node.get('allowed_directions',[1]*4),node.get('direction',0),int(node.get('cycles_after_use',False)),31,node.get('trait_axis',0),node.get('trait_value',0),node.get('held_actor') or 0]
        m.write(p+0x6c,struct.pack('<14H',*vals));cell=node['x']*13+node['y']
        m.write_u16(0x499efc+2*cell,node['kind']);m.write_u16(0x49a0b4+2*cell,identity)
        return p
    def group(self,group,identities):
        if group not in GROUP_ARRAYS:return
        count,base=GROUP_ARRAYS[group];self.m.write_u16(count,len(identities));self.m.write(base,struct.pack('<'+'H'*len(identities),*identities))
    def snapshot(self,identity):
        m=self.m;p=self.objects[identity]
        return {'direction':m.u16(p+0x58),'previous':[m.u16(p+0x6e),m.u16(p+0x70)],'position':[m.u16(p+0x72),m.u16(p+0x74)],'ledge':m.u16(p+0x76),'passed':bool(m.read(p+0x12c,1)[0]),'held_actor':m.u16(p+0x86),'node_direction':m.u16(p+0x7c),'callback':hex(m.u32(p+0x10))}
    def queue(self,count,base):return [self.m.u16(base+2*i) for i in range(self.m.u16(count))]
    def queues(self):
        return {'released':self.queue(0x49a470,0x49a2d0),'arrivals':self.queue(0x49a206,0x49a3a4),'collisions':self.queue(0x49ac76,0x49a83c),'landed':self.queue(0x49a54e,0x49a7d0),'active':self.queue(0x49abd4,0x49abd8)}
    def event(self,identity,event,callback=0x4270f0):
        if callback not in (0x4270f0,0x4267a0,0x426a80):raise ValueError('Unsupported source callback')
        self.m.call(callback,[self.objects[identity],event]);return self.queues()
    def drain(self):
        """Original queue pass from launch requests through collision dispatch.

        Animation service calls are logged only; caller supplies their future
        resource events via event(). This preserves original same-tick LIFO order.
        All queues must reference existing entity IDs and valid source states.
        """
        self.m.call(0x425897,stop_at=0x425db5)
        return self.queues()
    def step(self,identity,node_id=None):
        m=self.m;p=self.objects[identity];kind=m.u16(self.objects[node_id]+0x6c) if node_id else 0
        if kind==1:
            if not m.u16(p+0x82):m.write_u16(p+0x82,self.visual(m))
            m.call(0x42aac0,[p,node_id]);return self.snapshot(identity)
        if kind==6:m.call(0x42a950,[node_id]);kind=0
        addr={0:0x42a7a0,2:0x42abe0,3:0x42adc0,4:0x42adc0,5:0x42b010}.get(kind)
        if addr:m.call(addr,[p] if kind==0 else [p,node_id])
        elif 20<=kind<=23:m.call(0x425f30,[p,kind],stop_at=0x425f7f)
        else:raise ValueError(kind)
        return self.snapshot(identity)


def validate_events():
    import copy
    oracle=EventOracle();m=oracle.m;counts=Counter()
    rnd=random.Random(194204)
    for kind in (0,2,3,4,5):
        for i in range(180):
            traits=tuple(rnd.randrange(1,6) for _ in range(4));d=rnd.randrange(4);x,y=rnd.choice((0,6,12)),rnd.choice((0,6,12))
            flags=[rnd.randrange(2) for _ in range(4)]
            if not any(flags):flags[0]=1
            node={'kind':kind,'x':x,'y':y,'group':1,'allowed_directions':flags,'direction':rnd.randrange(4),'cycles_after_use':bool(i%2),'trait_axis':rnd.randrange(1,5),'trait_value':rnd.randrange(1,6)}
            oracle.entity(1,traits,x,y,d);oracle.node(2,node)
            m.write(0x499efc,bytes(338)) # prevent unrelated destination release
            expectednode=copy.deepcopy(node);expected=arrival(expectednode,traits,d)
            actual=oracle.step(1,2)
            pos=[x,y] if expected['held'] else next_position(x,y,expected['direction'])
            assert actual['position']==pos and actual['previous']==[x,y] and actual['direction']==expected['direction'],(kind,node,actual,expected)
            if kind in (3,4):assert m.u16(oracle.objects[2]+0x7c)==expectednode['direction']
            if kind==5:assert m.u16(oracle.objects[2]+0x86)==1
            counts['local_rule']+=1
    for kind in (0,2,3,4):
        for direction in range(4):
            x,y=6,6;tx,ty=next_position(x,y,direction)
            for occupied in (False,True):
                m.write(0x499efc,bytes(338));m.write_u16(0x49a470,0)
                oracle.entity(1,x=x,y=y,direction=direction);oracle.entity(4,direction=(direction+1)%4)
                node={'kind':kind,'x':x,'y':y,'direction':direction,'trait_axis':1,'trait_value':1}
                oracle.node(2,node);oracle.node(3,{'kind':5,'x':tx,'y':ty,'held_actor':4 if occupied else None})
                oracle.step(1,2)
                assert oracle.queues()['released']==([4] if occupied else [])
                if occupied:assert m.u16(oracle.objects[4]+0x58)==direction and m.u16(oracle.objects[3]+0x86)==0
                counts['destination_releases']+=1
    for group in range(1,9):
        for bits in range(1,16):
            m.write_u16(0x49a470,0);flags=[(bits>>i)&1 for i in range(4)]
            node={'kind':4,'x':5,'y':5,'group':group,'allowed_directions':flags,'direction':bits%4}
            oracle.node(2,node);oracle.node(3,{'kind':5,'x':4,'y':4,'group':group,'held_actor':4});oracle.node(5,{'kind':6,'x':6,'y':6,'group':group})
            oracle.group(group,[2,3,5]);m.call(0x42a950,[5]);expected=copy.deepcopy(node)
            if group!=1:cycle(expected)
            assert m.u16(oracle.objects[2]+0x7c)==expected['direction']
            assert oracle.queues()['released']==([4] if group!=1 else [])
            counts['color_trigger']+=1
    for event in (20,30,40,50,21,31,41,51,61,19,22,62):
        for phase in (0,3):
            m.write(0x49aca0,bytes(13*13*6));m.write_u16(0x49a206,0);m.write_u16(0x49ac76,0)
            for identity in (1,2,3):
                p=oracle.entity(identity);m.write_u16(p+0xc8,phase);oracle.event(identity,event)
            q=oracle.queues()
            expected=[1,2] if phase==3 and event in (20,30,40,50) else []
            assert q['collisions']==expected,(event,phase,q)
            assert q['arrivals']==([1,2,3] if event in (21,31,41,51,61) else [])
            counts['reservation_and_arrival_events']+=1
    for callback in (0x4267a0,0x426a80):
        for ledge in range(4):
            m.write_u16(0x49a54e,0);m.write_u16(0x49abd4,3);m.write(0x49abd8,struct.pack('<12H',1,2,3,*([0]*9)))
            p=oracle.entity(2,ledge=ledge);cell=6*13+6;m.write_u16(0x49aca0+6*cell,1);m.write_u16(0x49aca2+6*cell,2)
            oracle.event(2,92,callback);assert oracle.queues()['active']==[1,3];assert m.u16(0x49aca0+6*cell)==0
            expected=[2] if callback==0x4267a0 and ledge!=3 else []
            assert oracle.queues()['landed']==expected
            oracle.event(2,-1,callback);assert oracle.queues()['landed']==expected+[2]
            assert oracle.snapshot(2)['ledge']==ledge
            counts['cleanup_and_return_events']+=1
    for ledge in range(4):
        oracle.entity(1,ledge=ledge);oracle.node(2,{'kind':1,'x':6,'y':6})
        actual=oracle.step(1,2);assert actual['callback']=='0x426a80' and actual['ledge']==ledge and not actual['passed']
        counts['trap_dispatch']+=1
    for ledge in range(4):
        m.write_u16(0x49abd6,0);m.write_u16(0x49a794,0);oracle.entity(1);oracle.node(2,{'kind':20+ledge,'x':6,'y':6})
        actual=oracle.step(1,2);assert actual['ledge']==ledge and actual['passed']==(ledge==3)
        assert m.u16(0x49abd6)==int(ledge==3) and m.u16(0x49a794)==int(ledge==3)
        counts['landing']+=1
    # Same-tick arrivals are LIFO; a released actor waits for the next queue pass.
    for group in (2,8):
        m.write(0x499efc,bytes(0x1200));m.write_u32(0x49a20c,m.alloc(13*13*4,bytes(13*13*4)))
        oracle.entity(1,x=6,y=6);oracle.entity(2,x=6,y=6)
        oracle.node(3,{'kind':3,'x':6,'y':6,'direction':0,'cycles_after_use':True})
        oracle.event(1,21);oracle.event(2,21);oracle.drain()
        assert oracle.snapshot(2)['direction']==0 and oracle.snapshot(1)['direction']==1
        assert oracle.snapshot(3)['node_direction']==2
        oracle.entity(1,x=6,y=6,direction=1);oracle.entity(2,x=4,y=4,direction=2)
        oracle.node(4,{'kind':5,'x':4,'y':4,'group':group,'held_actor':2})
        oracle.node(5,{'kind':6,'x':6,'y':6,'group':group});oracle.group(group,[4,5])
        oracle.event(1,21);oracle.drain();assert oracle.queues()['released']==[2]
        assert oracle.snapshot(2)['position']==[4,4]
        oracle.drain();assert oracle.queues()['released']==[] and oracle.snapshot(2)['position']==[4,5]
        counts['native_queue_passes']+=3
    report={'status':'passed','source_sha256':HASH,'comparisons':dict(counts),'total':sum(counts.values()),'failures':[],
            'scope':'Local rule, holding release, group toggles, explicit native animation-event reservation/arrival/cleanup callbacks. No wall-clock schedule or full rendered game emulated.'}
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'native-event-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))


def write_spec():
    evidence=source_evidence(OUT,[('initialization-launch-binding',0x4245a0,0x425540),('queue-dispatch',0x425780,0x425f30),('landing-launch',0x425f30,0x4265c0),('animation-events',0x4265f0,0x427320),('template-selector',0x4273f0,0x4274a0),('generation-node-binding',0x4274a0,0x427a00),('condition-generators',0x427a00,0x429e00),('actor-rules',0x42a190,0x42b100),('native-constant-tables',0x48d594,0x48d9f0)])
    levels=[]
    for level,(resources,functions) in enumerate([([16600,16601],['0x427a00','0x427a00']),([16602,16603],['0x428030','0x4283a0']),([16604,16605],['0x4283a0','0x428d00']),([16606,16608],['0x429450','0x429450'])]):
        levels.append({'ui_level':level+1,'native_level':level,'legal_history_values':[0,2] if level==3 else [0,1],'templates':resources,'generator_functions':functions,'node_counts':[template(r)['header'][0] for r in resources],'node_types':[dict(Counter(row[0] for row in template(r)['records'])) for r in resources], 'small_party_override':{'condition':'party_count<5','effective_native_level':4,'template':16609,'generator':'0x428d00'} if level==3 else None})
    validation={p.stem:json.loads(p.read_text()) for p in (OUT/'native-generation-validation.json',OUT/'native-event-validation.json') if p.exists()}
    spec={'schema_version':1,'game':'logical-journey','id':'bubblewonder-abyss','name':'Bubblewonder Abyss',
      'state':{'board':'13x13 cells indexed13*x+y; authored nodes plus18 fixed landing cells','node_fields':['kind','x','y','group','allowed_directions[4]','direction','cycles_after_use','trait_axis1based','trait_value1..5','held_actor'], 'actors':'identity,traits[4],direction0..3,previous/current grid position,ledge0..3,passed flag,animation phase,callback','queues':'LIFO launch,released,visual-sort,cleanup,landed,arrivals,collision pairs; exact native arrays and event API in tool','max_active_bubbles':10,'global':'party ordered1..16,level,variant history,RNG state,active actor IDs,cell reservation count/first actor,GO flag,crossed count'},
      'inputs':{'generation':['nativelevel0..3','ordered party of1..16 trait tuples with values1..5','uint32 RNG entry state','four visit counters (0/1,0/1,0/1,0/2)'],'logical_play':['launch actor at authored enabled entry on its current ledge','source animation callback event (actor,event,callback)','drain native queue pass','GO'],'timing_boundary':'Events are explicit ordered inputs. SCRB marker-to-event semantics are native-verified in the shared animation-event contract; converting wall-clock time and linked-object ordering to the event stream is not yet integrated.'},
      'actions':{
       'launch':{'guard':'actor selectable and not in active list; active count<10;49ab52==0; valid empty drag slot from template header; drag bounds chosen by actor ledge','enabled_entries':'Nonzero template header words1..9,1based entry ID. Launch positions/directions/ledge tables fully exported below. Source42628b..4264e4. Entry remains busy until bubblemaker callback426cf7 clears49ab54[slot] and common occupancy.','effect':'Append actor to active list. Set direction from48d604; previous grid coordinate48d6ec; initial destination advances y by−1/+1 for dirs0/2, unchanged for dirs1/3, matching426432/426441/426450. Enqueue entry in launch queue; engine emits launch animation events.'},
       'arrival':{'0':'continue straight, clamp each coordinate to0..12','1':'pop animation, set callback426a80. Current ledge and passed flag unchanged. Event92 removes active bubble, −1 queues return to current ledge.','2':'if actor trait at node axis equals value, take node direction; otherwise continue incoming direction. No auto-cycle.','3,4':'take current node direction, then if cycles_after_use choose next enabled direction cyclically0,1,2,3','5':'hold actor at node until released; store identity, preserve direction','6':'activate group then continue straight; groups2..8 only,group1 is no-op','20..23':'land and set ledge=kind−20. Kind23 marks passed and increments crossed; first such arrival enables GO.'},
       'group_trigger':'Visit group members in reverse creation order. Kind4 rotates to next enabled direction regardless of cycles_after_use. Kind5 queues held actor for release and clears held ID, preserving actor direction. Other kinds unchanged.',
       'moving_into_held_node':'Before movement animation, if destination is kind5 with held actor, queue its release, clear held ID, copy incoming direction to that released actor. This occurs in straight/conditional/arrow movement.',
       'reservation':'Callback4270f0 events20/30/40/50 only if actor+c8==3: increment reservation count at destination. First stores actor ID. Second queues [first,second] as a collision pair and clears count/ID. Third after that reset begins a fresh reservation. Events21/31/41/51/61 append arrival regardless of phase.',
       'queue_pass':'Native425897..425db5 drains launch, released, visual sorting/cleanup, landed, arrivals, then collision pairs; each queue LIFO. A group trigger during arrivals adds released actors after released phase, so they wait one queue pass. Original collision dispatcher42a240 selects direction-dependent animations and callbacks; native backend retains it.',
       'cleanup':'Callback4267a0 event92 removes bubble from active list, clears owned cell reservation, queues landing only for ledge!=3; event91 does the same plus final cleanup on ledge3. Its−1 event queues landing. Trap callback426a80 event92 only removes active/reservation;−1 queues landing. Do not issue duplicate animation events: the native callbacks are not idempotent.',
       'go':'Allowed after first final-ledge landing. Sets journey next stage6, preserves passed subset; no requirement that all actors cross.'},
      'feedback':{'visible':'Conditional trait symbol, current arrow, post-use rotations, group color changes, holding/collision/pop, landed actor, GO availability','native_rule_feedback':'Explicit node/actor/queue state and logged animation-service calls from EventOracle'},
      'success':{'individual':'land on kind23, actor+0x12c=1','complete':'all party members marked passed and GO','partial':'GO after at least one passed'},
      'failure':{'attempt_limit':None,'timer':None,'blocked':'Unreleased holding nodes or route cycles can prevent remaining actors reaching final ledge; partial GO can leave them behind. Native trap/cleanup callbacks do not themselves decrement a mistake budget.','manual_caveat':'Manual32 broadly describes symbols sending actors to Shade Tree Base Camp. Isolated callbacks verified here preserve current ledge and queue its return; journey-level transfer of non-passed members occurs when leaving. No claim that every described symbol is individually permanent loss.'},
      'difficulty_levels':levels,
      'generation':{'implementation':'Oracle.generate executes hash-checked original selector/generation/node-construction code, with engine constructor/render services stubbed. It is an executable exact source backend, not an independently ported generator.','entry_points':['0x4273f0 selector','0x4274a0 initialization/generation','0x427650 node creation'],'resource_record':'big-endian signed16-bit;10word header[count,up to9 entry IDs],then count records of10words[kind,x,y,group,dirflags0..3,direction,cycleflag].','templates':[template(i) for i in range(16600,16610)],'unused_template':'16607 is preserved but unreachable from normal native3 visit history initialized0 and incremented2 modulo the0/2 cycle.','color_shuffle':'Group1 has fixed spritebase31; groups2..8 get rank-deleted permutation of52,73,94,115,136,157,178. This precedes rule generation.','condition_logic':'Exact branching, rejection and fallback order retained in original code427a00..429df0. Party filtering/count helpers427d20/427d80, maximum frequency bounded selector427ea0, same-axis selector427f10 (scan1..19), absent-trait choices427f70..428010. Full ordered random-call trace exported per instance.','condition_encoding':'1..20 maps axis=(code−1)//5+1,value=(code−1)%5+1; conditional nodes consume codes in authored node order.','rng':'state=(214013*state+2531011) mod2^32; inclusive bound, modulo reduction; singleton draw advances no state. Each constructed node consumes separate speed draw20..25 after rules.','constants':source_tables(),'saved_native_instances':'local/analysis/logical-journey-bubblewonder-abyss/exports.json'},
      'assets':{**family_assets('maze2'),'bindings':'REGS16600..16609 layout/templates, native source table sprite color bases, node sprite renderer42b2b0, bubble/Zoombini callbacks42a190..42b100; full SCRB/SCRS scripts and decoded frame triplets locally preserved. Help STRL2800/2820/2840/2860 in zoombini archive.','manual_pdf_pages':[32]},
      'evidence':evidence,'validation':validation,
      'open_questions':['Frame marker meanings are recovered and native-tested, but native clock/linked-object traversal has not been integrated into a standalone replay loop. Explicit ordered event inputs remain required; this is a material scheduling boundary.','Exact end-to-end route/collision traces using original frame markers, including direction-dependent collision completion and launch animation, need player integration verification.'],
      'completeness':{'full_spec':False,'generator':'source-backed exact backend and reproducible instance export','logical_rule_core':True,'all_difficulties':True,'event_callbacks_and_queue_order':'native executable backend plus isolated comparisons','standalone_complete_player':False,'boundary':'Complete node/rule and supplied-event state transition core; animation-to-event schedule remains material.'}}
    spec['animation_event_contract']={'export':'local/analysis/logical-journey-titanic-tattooed-toads/animation-event-contract.json','validation':'local/analysis/logical-journey-titanic-tattooed-toads/animation-marker-validation.json','implementation':'tools/spec_lj_toad_scheduler.py:animation_events','format':'FE-prefixed negative marker consumes optional sound word; low byte0 means no callback, otherwise callback event=(marker&255)-1. Callback+10 runs before per-frame callback+14. Native4585c6..4586a7.','clock':'458180 checks now4a47c0>=actor deadline+24; next frame deadline=now+step+28. Linked-actor sync uses actor+e0 and shared arrays4a37b4/4a32d0/4a349c.','verified':'3396 frames across293 lilly/maze2 SCRB resources; lilly10169 excluded for>=24layer continuation path. Shared validation count, do not double-count per family.','remaining':'Whole-engine object traversal and synchronization integration, launch/collision actor graphs and resource frame clock replay.'}
    path=ROOT/'local/specs/logical-journey/bubblewonder-abyss.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(spec,indent=2)+'\n');print(path)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--validate-native',action='store_true');p.add_argument('--validate-events',action='store_true');p.add_argument('--write-spec',action='store_true');p.add_argument('--generate',action='store_true');p.add_argument('--level',type=int,default=0);p.add_argument('--party-json',default='[[1,1,1,1]]');p.add_argument('--state',type=lambda s:int(s,0),default=0);p.add_argument('--history-json',default='[0,0,0,0]');a=p.parse_args()
    if a.validate_native:validate_generation()
    if a.validate_events:validate_events()
    if a.write_spec:write_spec()
    if a.generate:print(json.dumps(Oracle().generate(json.loads(a.party_json),a.level,a.state,json.loads(a.history_json)),indent=2))
