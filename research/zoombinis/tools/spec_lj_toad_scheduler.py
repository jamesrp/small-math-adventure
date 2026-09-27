#!/usr/bin/env python3
"""Source-backed Titanic Toads scheduler at explicit native-clock/event boundaries.

Imports native dependencies only when SchedulerOracle is instantiated. Exact
frame marker emission remains an external input; no original Windows process.
"""
import json
import struct
from collections import Counter
from spec_lj_titanic_tattooed_toads import ROOT,OUT,SOURCE_SHA256,ToadOracle,generate,next_hop,crab_next,crab_routes

QUEUES={'toad_ready':(0x496fd8,0x496fb0),'toad_deferred':(0x4996d0,0x49942c),'crab_ready':(0x499612,0x4996d4),'crab_deferred':(0x499428,0x4994f0),'crab_replan':(0x499424,0x497468),'delete':(0x49745a,0x496e8c),'toad_return':(0x4994e8,0x4994c0),'toad_retire':(0x499812,0x49946c)}

class SchedulerOracle(ToadOracle):
    def __init__(self,level=0,seed=0):
        super().__init__();m=self.machine;self.objects={};self.now=0;self.animations=[];self.created=[];self.next_id=100
        m.write(0x496a40,bytes(0x2e80))
        for a in (0x4976f0,0x4976f4,0x497310,0x497314):m.write_u32(a,m.alloc(4096,bytes(4096)))
        m.hook(0x456380,lambda m:self.objects.get(m.arg(0)&65535,0),pop=4)
        m.hook(0x40fb80,lambda m:self.now)
        m.hook(0x456a60,self.animation)
        m.hook(0x455db0,self.construct,pop=32)
        for a in (0x457400,0x4588d0,0x456e80):m.hook(a,lambda m:0)
        m.write_u16(0x48cf38,level+1);m.write_u16(0x48bc28,0);m.write_u32(0x4959d0,seed)
        m.write_u16(0x496a98,16)
    def construct(self,m):
        self.next_id+=1;identity=self.next_id;p=m.alloc(4096,bytes(4096));self.objects[identity]=p
        if m.arg(5):m.write(p+0x30,m.read(m.arg(5),0x22c))
        m.write_u16(p+0x1a,identity);m.write_u32(p+0x20,m.arg(0));self.created.append({'id':identity,'resource':m.arg(3),'speed':m.arg(6)})
        return identity
    def animation(self,m):
        p=m.arg(0);resource=m.arg(1)&65535
        self.animations.append({'id':m.u16(p+0x1a),'resource':resource,'clock':self.now})
        # The actor's current program word is consumed by native crab frame rules.
        m.write_u16(p+0x10e,resource)
        return 0
    def entity(self,identity,position=(5,5),attribute=1,value=0,direction=1,visits=None,crab=False):
        m=self.machine;p=self.objects.get(identity)
        if p is None:p=m.alloc(4096);self.objects[identity]=p
        m.write(p,bytes(4096));m.write_u16(p+0x1a,identity);r,c=position
        m.write(p+0xf7,bytes((c,r)));m.write(p+0x10a,bytes((direction,)));m.write(p+0x114,bytes((attribute,value)));m.write_u16(p+0xf4,int(crab))
        if visits:
            for row in range(12):m.write(p+0x128+2*13*row,struct.pack('<12H',*visits[row]))
        return p
    def queue(self,name,values):
        count,base=QUEUES[name];self.machine.write_u16(count,len(values));self.machine.write(base,struct.pack('<'+'H'*len(values),*values))
    def snapshot(self):
        m=self.machine
        return {'clock':self.now,'phase_next':m.u16(0x497768),'spawn_deadline':m.u32(0x4994b8),'seed_index':m.u16(0x499614),'crab_count':m.u16(0x4976c8),'rng':m.u32(0x4959d0),
          'queues':{name:[m.u16(base+2*i) for i in range(m.u16(count))] for name,(count,base) in QUEUES.items()},
          'occupied':[(r,c) for r in range(12) for c in range(13) if m.read(0x498b58+14*(r*13+c),1)[0]],'animations':list(self.animations),'created':list(self.created)}
    def tick(self,now):
        self.now=now&0xffffffff;self.animations=[];self.created=[]
        self.machine.call(0x41a71d,stop_at=0x41acf2,max_instructions=3000000)
        return self.snapshot()
    def event(self,identity,event,callback=0x41b290,now=None):
        if callback not in (0x41b290,0x41b550,0x41c320,0x41bbb0,0x41bc70,0x41bfa0,0x41c2c0,0x41c530):raise ValueError('unknown callback')
        if now is not None:self.now=now&0xffffffff
        self.machine.call(callback,[self.objects[identity],event],max_instructions=3000000)
        return self.snapshot()
    def crab_frame(self,identity,phase,now=None):
        if phase not in range(8):raise ValueError('native crab frame0..7')
        if now is not None:self.now=now&0xffffffff
        p=self.objects[identity];self.machine.write_u16(p+0xc8,phase);self.machine.call(0x41b660,[p]);return self.snapshot()


def validate():
    counts=Counter();witnesses=[]
    board=[[[0,0,0] for c in range(12)] for r in range(12)]
    for level in range(4):
        o=SchedulerOracle(level);m=o.machine;o.set_board(board)
        for phase in (0,1):
            m.write_u16(0x497768,phase);m.write_u32(0x4994b8,1000)
            result=o.tick(100);assert result['phase_next']==1-phase;assert not result['created'];counts['phase_alternation']+=1
    for now,deadline in ((99,100),(100,100),(101,100)):
        o=SchedulerOracle();m=o.machine;o.set_board(board,[(5,5)])
        visits=[[0]*12 for _ in range(12)];visits[5][5]=3
        p=o.entity(1,visits=visits);m.write_u32(p+0x24,deadline);m.write_u16(0x497768,1);o.queue('toad_ready',[1]);r=o.tick(now)
        if now<deadline:assert not r['animations'] and r['queues']['toad_deferred']==[1]
        else:
            expected=next_hop(board,(5,5),1,0,visits,1,[(5,5)])
            assert r['animations'][0]['resource']==expected['animation'];assert r['occupied']==expected['occupied']
        counts['toad_deadline']+=1
    # Occupied matching destination is reserved until mid-hop event12 frees source.
    for direction in range(4):
        o=SchedulerOracle();m=o.machine;o.set_board(board,[(5,5)]);p=o.entity(1,direction=direction)
        dest=(5+((-1,0,1,0)[direction]),5+((0,1,0,-1)[direction]));m.write(0x498b58+14*(dest[0]*13+dest[1]),b'\1')
        o.event(1,11);assert tuple(reversed(m.read(p+0xf7,2)))==dest
        assert (5,5) in o.snapshot()['occupied'];o.event(1,12);assert (5,5) not in o.snapshot()['occupied']
        o.event(1,10,now=100);assert m.u32(p+0x24)==130 and o.snapshot()['queues']['toad_ready']==[1]
        counts['toad_event_lifecycle']+=1
    # Repeated spawning uses strict clock comparison, cycles seeds, and max20 live.
    for level in range(4):
        for now,deadline in ((99,100),(100,100),(101,100)):
            for active in (0,19,20):
                o=SchedulerOracle(level,42);m=o.machine;o.set_board(board);m.write_u16(0x497768,0);m.write_u32(0x4994b8,deadline);m.write_u16(0x4976c8,active)
                seed_count=(0,0,2,3)[level];m.write_u16(0x49731c,seed_count)
                m.write(0x4972e8,struct.pack('<12H',2,1,0,1,6,1,0,1,9,1,0,1));r=o.tick(now)
                spawned=level>=2 and now>deadline and active<20
                assert bool(r['created'])==spawned,(level,now,active,r)
                if spawned:
                    assert r['crab_count']==active+1 and r['spawn_deadline']==now+720 and r['seed_index']==1
                    p=o.objects[r['created'][0]['id']];assert m.u16(p+0x62)==0 and m.read(p+0x114,2)==b'\1\0'
                    assert r['created'][0]['resource']==10067 and 4<=r['created'][0]['speed']<=7
                counts['crab_spawn_guard']+=1
    for occupied_marker in (0,1,2):
        o=SchedulerOracle(2,42);m=o.machine;o.set_board(board,[(0,2)]);m.write_u16(0x49758c+2*2,occupied_marker)
        m.write_u16(0x497768,0);m.write_u32(0x4994b8,100);m.write_u16(0x49731c,2);m.write(0x4972e8,struct.pack('<8H',2,1,0,1,6,1,0,1));r=o.tick(101)
        assert bool(r['created'])==(occupied_marker==1)
        if r['created']:assert m.u16(o.objects[r['created'][0]['id']]+0x62)==1
        assert r['seed_index']==1
        counts['crab_occupied_spawn']+=1
    # Blocked first seed still advances index; successful second seed wraps it.
    o=SchedulerOracle(2,42);m=o.machine;o.set_board(board,[(0,2)]);m.write_u16(0x49731c,2);m.write(0x4972e8,struct.pack('<8H',2,1,0,1,6,1,0,1));m.write_u16(0x497768,0)
    a=o.tick(1);assert not a['created'] and a['seed_index']==1 and a['spawn_deadline']==0
    o.tick(1);a=o.tick(1);assert a['created'] and a['seed_index']==0 and a['spawn_deadline']==721;counts['spawn_seed_rotation']+=1
    # Crab frame0 changes cell; frame6 releases old pad only for normal crab;
    # frame7 queues next move for now+35. Phase0 uses current hop resource.
    for direction,resource in enumerate((10071,10077,10073,10075)):
        for waiting in (0,1):
            o=SchedulerOracle(2);m=o.machine;o.set_board(board,[(5,5)]);p=o.entity(1,direction=direction,crab=True);m.write_u16(p+0x62,waiting);m.write_u16(p+0x10e,resource)
            o.crab_frame(1,0);dest=(5+((-1,0,1,0)[direction]),5+((0,1,0,-1)[direction]));assert tuple(reversed(m.read(p+0xf7,2)))==dest
            o.crab_frame(1,6);assert ((5,5) in o.snapshot()['occupied'])==bool(waiting)
            o.crab_frame(1,7,now=100);assert m.u32(p+0x24)==135 and o.snapshot()['queues']['crab_ready']==[1]
            counts['crab_frame_lifecycle']+=1
    for crossings in (0,1):
        o=SchedulerOracle();m=o.machine;o.set_board(board,[(5,11)]);p=o.entity(1,position=(5,11));m.write(p+0x110,bytes([crossings]));rider=o.entity(2);member=o.entity(3);m.write(p+0x117,b'\2');m.write_u16(rider+0x4a,3)
        o.event(1,30,0x41c320);s=o.snapshot();assert m.u16(0x4993f6)==1 and m.u16(0x49775e)==1 and m.read(member+0x12c,1)==b'\1'
        assert s['queues']['toad_return' if crossings==0 else 'toad_retire']==[1];counts['crossing_limits']+=1
    for position in ((0,0),(11,4)):
        o=SchedulerOracle(2);m=o.machine;o.set_board(board,[position]);p=o.entity(1,position,crab=True);o.entity(2,crab=True)
        m.write_u16(0x4976c8,2);m.write(0x497188,struct.pack('<3H',1,2,0));o.event(1,80,0x41b550);s=o.snapshot();assert s['crab_count']==1 and s['queues']['delete']==[1] and position not in s['occupied'];counts['crab_exit']+=1
    # Two toads target one pad: later ready entry reserves it first.
    o=SchedulerOracle();m=o.machine;blocked=[[[1,0,0] for c in range(12)] for r in range(12)]
    for pos in ((5,4),(5,5),(5,6)):blocked[pos[0]][pos[1]][0]=0
    o.set_board(blocked,[(5,4),(5,6)])
    for identity,pos,d in ((1,(5,4),1),(2,(5,6),3)):
        visits=[[0]*12 for _ in range(12)];visits[pos[0]][pos[1]]=2;o.entity(identity,pos,direction=d,visits=visits)
    m.write_u16(0x497768,1);o.queue('toad_ready',[1,2]);r=o.tick(0)
    assert [a['id'] for a in r['animations']]==[2] and r['queues']['toad_deferred']==[1] and (5,5) in r['occupied'];counts['competing_reservations']+=1
    # Special crab path follows downwards through reserved authored-marker cells.
    for row in (0,10,11):
        for occupied in (0,1):
            for marker in (0,1,2):
                o=SchedulerOracle(2);m=o.machine;o.set_board(board);p=o.entity(1,(row,4),crab=True);m.write_u16(p+0x62,1);m.write(0x4972ea,b'\1')
                if row<11:
                    m.write(0x498b58+14*((row+1)*13+4),bytes([occupied]));m.write_u16(0x49758c+2*((row+1)*13+4),marker)
                result=m.call(0x420440,[p])&65535
                expected=10069 if row==11 else (10073 if not occupied or marker else 0)
                assert result==expected,(row,occupied,marker,result)
                if row<11 and not occupied:assert m.u16(p+0x64)==1 and m.read(p+0x114,2)==b'\1\0'
                counts['special_crab_step']+=1
    o=SchedulerOracle(2);m=o.machine;p=o.entity(1,crab=True);m.write_u16(p+0x62,1);m.write_u16(p+0x64,1)
    assert m.call(0x420440,[p])&65535==0 and m.u16(p+0x62)==0 and m.u16(p+0x64)==0
    assert o.snapshot()['queues']['crab_replan']==[1];counts['special_crab_replan']+=1
    report={'status':'passed','source_sha256':SOURCE_SHA256,'cases':dict(counts),'total':sum(counts.values()),'failures':[],
       'boundary':'Original scheduler41a71d..41acf2, callbacks and crab-frame mutation execute with supplied native clock/frame/event inputs; animation service logs requests but does not generate its own marker sequence.'}
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'scheduler-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))


def animation_events(archive,resource):
    """0x4585c6: FE marker sound, low byte nonzero -> callback lowbyte−1."""
    path=ROOT/f'local/derived/logical-journey/animations/{archive}/SCRB/{resource:05}.json'
    data=json.loads(path.read_text())
    return {'resource':resource,'source_sha256':data['source_sha256'],'frames':[{'index':i,'event':(int(f['marker'],16)&255)-1 if int(f['marker'],16)&255 else None,'sound':f.get('marker_argument') or None,'has_layers':bool(f['layers'])} for i,f in enumerate(data['frames'])]}


def validate_markers():
    from native_oracle import NativeOracle
    from unicorn.x86_const import UC_X86_REG_ESI,UC_X86_REG_EBP,UC_X86_REG_EBX
    from spec_lj_provenance import source_evidence
    import hashlib
    m=NativeOracle('logical-journey');actor=m.alloc(4096,bytes(4096));locals_=m.alloc(128,bytes(128))+48
    events=[];sounds=[]
    m.hook(0x419730,lambda m:events.append(m.arg(1)&65535) or 0)
    m.hook(0x4588d0,lambda m:sounds.append(m.arg(0)&65535) or 0)
    m.write_u32(actor+0x10,0x419730);m.write_u16(actor+0xc2,1);m.write_u16(actor+0xc4,1)
    cases=[];frames=0;skipped=[]
    for archive in ('lilly','maze2'):
        for path in sorted((ROOT/f'local/derived/logical-journey/animations/{archive}/SCRB').glob('*.json')):
            r=json.loads(path.read_text())
            if any(len(f['layers'])>=24 for f in r['frames']):
                skipped.append({'archive':archive,'resource':r['resource_id'],'reason':'frame with24 or more layers requires native continuation semantics outside marker-fragment fixture'});continue
            raw=(ROOT/'local/derived/logical-journey'/r['source']).read_bytes();assert hashlib.sha256(raw).hexdigest()==r['source_sha256']
            vals=struct.unpack('>'+'h'*(len(raw)//2),raw);pointer=m.alloc(len(raw),struct.pack('<'+'h'*len(vals),*vals));m.write_u32(0x4a420c+4,pointer)
            cursor=1;expected=animation_events(archive,r['resource_id'])
            for f,e in zip(r['frames'],expected['frames']):
                if len(f['layers'])>=24:raise ValueError('24layer parser limit requires separate loop contract')
                events.clear();sounds.clear();m.write(locals_-32,bytes(64));m.write_u32(actor+0xcc,cursor)
                m.call(0x4584ec,registers={UC_X86_REG_ESI:actor,UC_X86_REG_EBP:locals_},stop_at=0x458614)
                cursor=(m.reg(UC_X86_REG_EBX)-pointer)//2
                assert events==([] if e['event'] is None else [e['event']]),(archive,r['resource_id'],e,events)
                assert sounds==([] if e['sound'] is None else [e['sound']]),(archive,r['resource_id'],e,sounds)
                frames+=1
            assert cursor==len(vals)
            cases.append({'archive':archive,**expected})
    report={'status':'passed','source_sha256':SOURCE_SHA256,'resources':len(cases),'skipped_resources':skipped,'native_frame_marker_comparisons':frames,'failures':[],
       'source':'4584ec..458614 original layer/marker parser, callback replaced with collector, decoded original resources endian converted as loader does; event order and optional sound compared for every frame in all lilly/maze2 SCRB resources with fewer than24 layers per frame. Skipped resources reported separately.'}
    (OUT/'animation-event-contract.json').write_text(json.dumps(cases,indent=2)+'\n');(OUT/'animation-marker-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    source_evidence(OUT/'animation-interpreter',[('frame-clock-and-parser',0x458180,0x4586aa),('small-script-parser',0x457b80,0x457cd0)])
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--validate-markers',action='store_true');a=p.parse_args()
    if a.validate_markers:validate_markers()
    else:validate()
