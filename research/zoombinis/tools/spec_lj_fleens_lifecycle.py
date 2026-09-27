#!/usr/bin/env python3
"""Fleens queue, overflow, victory and party serialization callback differential checks."""
import hashlib,json,struct
from pathlib import Path
from native_analysis import ROOT,KNOWN_SHA256
OUT=ROOT/'local/analysis/logical-journey-fleens'

class LifecycleOracle:
 def __init__(self):
  from native_oracle import NativeOracle
  from unicorn.x86_const import UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EDI
  self.m=m=NativeOracle('logical-journey');self.regs=(UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EDI)
  self.context=m.alloc(0xc000);self.z=[m.alloc(0x160) for _ in range(16)];self.f=[m.alloc(0x160) for _ in range(16)];self.bee=m.alloc(0x160);self.ids={100+i:p for i,p in enumerate(self.z)}|{200+i:p for i,p in enumerate(self.f)}|{300:self.bee}
  m.hook(0x456380,lambda m:self.ids.get(m.arg(0)&0xffff,0),pop=4)
  m.hook(0x44bf50,lambda m:self.ids.get(m.arg(0)&0xffff,0),pop=4)
  m.hook(0x456360,lambda m:self.z[0] if self.n else 0,pop=4)
  def iterate(m):
   if m.arg(0):self.it=0
   else:self.it+=1
   return self.z[self.it] if self.it<self.n else 0
  m.hook(0x456010,iterate,pop=4)
  # Rendering, animation attachment, z-order and sound only; mathematical helpers retained.
  for a in (0x40cd10,0x44b160,0x4137a0,0x457400,0x419730,0x4573c0,0x456a60):m.hook(a,lambda m:0)
  m.hook(0x448f30,lambda m:0,pop=16)
 def reset(self,n,targets):
  m=self.m;self.n=n;self.targets=targets;m.write(self.context,b'\0'*0xc000);m.write_u32(0x4a2818,self.context)
  for start,size in [(0x495ac4,0x70),(0x495b10,0x20),(0x495c18,0x20),(0x495d18,0x68),(0x4a204c,2),(0x4a23ea,2),(0x4a2402,2)]:m.write(start,b'\0'*size)
  m.write_u16(0x495ae8,n);m.write_u16(0x495c2a,max(0,3-n));m.write_u16(0x495af8,300)
  for i in range(n):
   for p in (self.z[i],self.f[i]):m.write(p,b'\0'*0x160);m.write_u16(p+0xe2,1);m.write(p+0xf3,b'\1')
   m.write_u32(self.z[i]+4,self.z[i+1] if i+1<n else 0);m.write_u32(self.z[i]+0x20,1);m.write_u16(self.z[i]+0x1a,100+i);m.write(self.z[i]+0xf0,bytes([(i//(5**k))%5+1 for k in range(4)]))
   m.write_u16(self.f[i]+0x1a,200+i);m.write(self.f[i]+0x12c,b'\1');m.write(self.f[i]+0x124,bytes([17+targets.index(i) if i in targets else 0]));m.write_u16(0x4a2060+2*i,100+i);m.write_u16(0x495ac8+2*i,200+i)
  for j,i in enumerate(targets):m.write_u16(0x495c18+2*j,i+1)
 def lure(self,i):
  m=self.m;assert m.read(self.z[i]+0x12c,1)==b'\0' and m.u16(self.z[i]+0xe2)==1
  m.write_u16(0x495c22,100+i);m.write_u16(0x495ac4,200+i)
  m.call(0x4128d1,registers={self.regs[0]:self.z[i],self.regs[1]:0,self.regs[2]:1},stop_at=0x412988)
  # Same original actor callback entry, carrying authored animation event codes.
  m.call(0x413fe0,[self.z[i],4]) # ground Fleen starts chase
  m.call(0x413fe0,[self.z[i],5]) # includes branch Fleen; clears its availability
  assert m.read(self.f[i]+0x12c,1)==b'\0'
  m.call(0x413fe0,[self.z[i],6]) # branch target clears; non-target is a no-op
  m.call(0x413fe0,[self.z[i],132]) # original six-slot overflow, shift and dispatch
  evicted=m.u16(0x495d2e)-100 if m.u16(0x495d2e) else None
  if evicted is not None and m.u16(self.z[evicted]+0xe2):
   m.call(0x414a90,[self.z[evicted],-1]);self.update()
   m.call(0x414c30,[self.z[evicted],-1]);self.update()
   m.call(0x414dd0,[self.z[evicted],60]) # paired Fleen escape animation
   m.call(0x414dd0,[self.z[evicted],-1]);self.update()
   m.call(0x415240,[self.z[evicted],-1]) # Zoombini leaves: actor enabled=0
  m.call(0x413fe0,[self.z[i],-1]) # clear pending lure globals
  return dict(tree=[m.u16(0x495d20+2*j)-100 for j in range(m.u16(0x495c24))],lost=[j for j in range(self.n) if not m.u16(self.z[j]+0xe2)],progress=m.u16(0x495c2a),won=bool(m.u16(0x495c28)))
 def update(self):
  m=self.m;m.call(0x412ae1,registers={self.regs[1]:0,self.regs[2]:1},stop_at=0x412c1e)
 def victory(self):
  m=self.m;m.call(0x4153f0,[self.bee,-1],stop_at=0x415432)
  return [i for i in range(self.n) if m.u16(self.z[i]+0xe2) and m.read(self.z[i]+0x12c,1)==b'\1']
 def serialize(self):
  m=self.m;m.write_u16(0x4a35b8,0);m.write_u16(0x4a2188,0);m.write_u16(0x49d5b2,0);m.write_u16(0x49b0e8,10)
  m.call(0x44a990,[1,0],stop_at=0x44abf2)
  return [dict(traits=list(m.read(self.context+0xb83c+20*i,4)),passed=bool(m.read(self.context+0xb844+20*i,1)[0])) for i in range(m.u16(self.context+0xb836))]
 def drain(self):
  m=self.m;order=[]
  while m.u16(0x495c24):
   i=m.u16(0x495d20+2*(m.u16(0x495c24)-1))-100
   m.call(0x414fa0);assert m.u32(self.z[i]+0x10)==0x415070
   m.call(0x415070,[self.z[i],131]);m.call(0x415070,[self.z[i],-1]);order.append(i)
  return order

def validate_markers(o):
 from unicorn.x86_const import UC_X86_REG_EAX,UC_X86_REG_EBP,UC_X86_REG_ESI
 m=o.m;frame=m.alloc(0x80)+0x40;actor=m.alloc(0x160);calls=[]
 def capture(m):calls.append((m.arg(0),m.arg(1)));return 0
 m.hook(0x419730,capture);m.write_u32(actor+0x10,0x419730)
 for marker in range(256):
  calls.clear();m.call(0x4585f2,registers={UC_X86_REG_EAX:0xff00+marker,UC_X86_REG_EBP:frame,UC_X86_REG_ESI:actor},stop_at=0x458614)
  assert calls==([] if marker==0 else [(actor,marker-1)]),(marker,calls)
 m.hook(0x419730,lambda m:0)
 records=[]
 for rid in list(range(7000,7010))+list(range(7026,7031))+list(range(7041,7046))+list(range(6000,6005)):
  path=ROOT/f'local/derived/logical-journey/animations/fleens/SCRS/{rid:05}.json';data=json.loads(path.read_text());raw=ROOT/'local/derived/logical-journey'/data['source']
  assert hashlib.sha256(raw.read_bytes()).hexdigest()==data['source_sha256']
  events=[dict(frame=i,marker=f['marker'],event=(int(f['marker'],16)&255)-1) for i,f in enumerate(data['frames']) if int(f['marker'],16)&255]
  records.append(dict(resource_id=rid,source=data['source'],source_sha256=data['source_sha256'],frame_count=data['frame_count'],events=events))
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'animation-events.json').write_text(json.dumps(dict(mapping='nonzero marker low byte minus one; zero emits no callback; end-of-stream callback is separately -1',native='0x4585f2–0x458614; completion0x45867c–0x458688',records=records),indent=2)+'\n')
 return 256

def validate():
 from spec_lj_fleens import generate,FleensState
 o=LifecycleOracle();cases=[];steps=0
 marker_cases=validate_markers(o)
 for n in (1,2,3,6,7,8,12,16):
  for k in range(min(3,n),n+1):
   for variant in range(3):
    # Two targets may be early/evicted; final target occupies the kth lure.
    perm=list(range(n));perm=perm[variant:]+perm[:variant];targets=perm[:min(2,n-1)]+[perm[k-1]];targets=list(dict.fromkeys(targets))
    if len(targets)!=min(3,n):continue
    g=generate([[(i//(5**a))%5+1 for a in range(4)] for i in range(n)],0,1);g['target_indices_1based']=[i+1 for i in targets]
    model=FleensState(g);o.reset(n,targets)
    for i in perm[:k]:
     model.lure(i);native=o.lure(i)
     assert native==dict(tree=model.tree,lost=sorted(model.lost),progress=len(model.cleared)+g['precleared_targets'],won=model.won),(n,k,variant,i,native,model)
     try:model.lure(i);raise AssertionError('repeat lure accepted')
     except ValueError:pass
     steps+=1
    expected=model.go();passed=o.victory();assert passed==expected['passed'],(expected,passed)
    serialized=o.serialize();actual_pass=[r['traits'] for r in serialized if r['passed']];wanted=[g['party'][i] for i in expected['passed']]
    assert actual_pass==wanted,(n,k,serialized,expected)
    assert o.drain()==list(reversed(expected['rescued_from_tree']))
    try:model.lure(perm[0]);raise AssertionError('repeat lure accepted')
    except ValueError:pass
    cases.append(dict(party=n,lures=k,targets=targets,lost=expected['lost'],passed=passed))
 report=dict(status='passed',source_sha256=KNOWN_SHA256['logical-journey'],native_lifecycle_cases=len(cases),native_lure_steps=steps,native_marker_dispatch_cases=marker_cases,failures=[],boundary='Original lure state writes; matched-Fleen availability, target, six-slot overflow and all eviction callbacks; victory 44b090; original party serialization through 44abf2; original LIFO tree drain. Authored callback events supplied explicitly. Presentation/animation/z-order/sound calls stubbed; no real-time player UI or complete engine run.',entries=['0x4128d1–0x412988','0x413fe0 events4/5/6/132/-1','0x414a90(-1)','0x414c30(-1)','0x414dd0(60/-1)','0x415240(-1)','0x412ae1–0x412c1e','0x4153f0(-1) through0x415432','0x44b090','0x44a990 through0x44abf2','0x414fa0','0x415070(131/-1)','0x4585f2–0x458614 marker dispatch'],stubs=['Actor lookup456380/44bf50 and linked-list/iterator access456360/456010','40cd10,44b160,4137a0,457400,419730,4573c0,456a60 presentation','448f30 drag transport (not reached by settled event tests)'])
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'lifecycle-validation.json').write_text(json.dumps(report,indent=2)+'\n');(OUT/'lifecycle-witnesses.json').write_text(json.dumps(cases,indent=2)+'\n');print(json.dumps(report,indent=2));return report

if __name__=='__main__':validate()
