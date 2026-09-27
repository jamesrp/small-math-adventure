#!/usr/bin/env python3
"""Planetarium normal generator, discrete callback contract, isolated x86 checks."""
from pathlib import Path
import argparse,copy,hashlib,itertools,json,struct
from island_generator import MsvcrtRandom
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'local/analysis/island-odyssey-planetarium'
EXE=ROOT/'local/discs/island-odyssey/HD/Win/Zoombinis Island Odyssey.exe'
HASHES=['619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2','e5586272015a08e3afa4ee9d260159dec9dfc1e8ac924230f3631f1c40cec609','2ee6780ac8cf09d2b5b9338df55181fc52f949c570dbd611884f0115eb4a64ac']
HELP=[1,2];NORMAL=[4,5,5,7,10,10];EXCEPTION=[4,5,7,7,10,10];DAY=[1,4,5,5,7,10,10]
FORBIDDEN=[(13,23),(13,23),(14,23),(15,23),(16,23),(17,23),(18,23),(19,23),(19,23),(20,23),(21,23),(22,23),(23,23),(-1,-1),(-1,-1),(-1,-1),(13,13),(13,14),(13,15),(13,16),(13,17),(13,17),(13,18),(13,19),(13,20),(13,21),(13,22),(13,23)]
def sources():
 paths=[EXE]+[ROOT/('local/discs/island-odyssey/HD/scripts/z3a3.'+x) for x in ('mps','xml')]
 r=[dict(path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in paths]
 if [x['sha256'] for x in r]!=HASHES:raise ValueError('Unknown source revision')
 return r

def hour_set(target,start):return EXCEPTION.copy() if (target-start)%24 in (18,23) else NORMAL.copy()
def shifted_draw(rng,n,target,label):
 x=rng.rand(label)%n
 return (x+1)%n if x==target else x

def generate(seed,level):
 if level not in (1,2,3):raise ValueError('level must be 1,2,3')
 rng=MsvcrtRandom(seed,True);days=[-1,-1];targetday=-1;pieces=[]
 if level==3:
  targetday=rng.rand('target-day')%28
  for e in range(2):
   days[e]=shifted_draw(rng,28,targetday,'start-day-'+str(e))
   pieces.extend([[1,v,e,i] for i,v in enumerate(DAY)])
 elif level==2:days=[7*(rng.rand('shared-moon-phase')%4)]*2
 target=rng.rand('target-hour')%24;hours=[]
 for e in range(2):
  if e==0 or level==1:x=shifted_draw(rng,24 if e==0 else 12,target,'start-hour-'+str(e))
  else:
   lo,hi=FORBIDDEN[days[1]]
   if lo==hi==-1:x=shifted_draw(rng,12,target,'start-hour-1')
   else:
    width=hi-lo+1;x=rng.rand('start-hour-1')%(24-width)
    if lo<=x<=hi:
     x=(x+width)%24
     while x==target or lo<=x<=hi:x=(x+1)%24
  hours.append(x);coins=(HELP if level==1 else [])+hour_set(target,x)
  pieces.extend([[0,v,e,i] for i,v in enumerate(coins)])
 return dict(seed=seed,level=level,target_hour=target,target_day=targetday,hours=hours,days=days,pieces=pieces,rng_values=[x['value'] for x in rng.trace],final_rng=dict(calls=rng.calls,state=rng.state))

def allocation(tokens,level):
 if not 1<=tokens<=12:raise ValueError('tokens must be 1..12')
 n=6 if level==3 else 3;q,r=divmod(tokens,n);a=[q]*n
 if n==3:
  for i in ([0] if r==1 else [1,2] if r==2 else []):a[i]+=1
 else:
  for i in [2,3,1,4,0][:r]:a[i]+=1
 return a

def initial_state(board,tokens=12):
 return dict(hours=board['hours'].copy(),days=board['days'].copy(),mode=[0,0],pending=[0,0],available=set(range(len(board['pieces']))),disabled=set(),reward_states=[1]*len(allocation(tokens,board['level'])),reward_passed=[0]*len(allocation(tokens,board['level'])),allocation=allocation(tokens,board['level']),moved=0,tokens=tokens,events=[])

def disabled_type(board,state,e,t):
 state['disabled'].update(i for i,p in enumerate(board['pieces']) if p[0]==t and p[2]==e)

def insert(board,state,index):
 if index not in state['available'] or index in state['disabled'] or state['moved']==state['tokens']:return False
 t,v,e,_=board['pieces'][index]
 # Same-denomination insertions can extend an existing advance. Opposite denominations cannot.
 if state['mode'][e] not in (0,t+1):return False
 state['available'].remove(index);state['mode'][e]=t+1;state['pending'][e]+=v
 forecast=(state['hours'][e] if t==0 else state['days'][e])+state['pending'][e]
 # Native forecast subtracts modulus ONCE, even for queued totals above 2*modulus.
 modulus=24 if t==0 else 28
 if forecast>=modulus:forecast-=modulus
 if forecast==(board['target_hour'] if t==0 else board['target_day']):disabled_type(board,state,e,t)
 return True

def solved_event(board,state,e,t,hit):
 idx=(1+e if board['level']<3 else ([1,4] if t==0 else [2,3])[e]);a=state['allocation'][idx];rs=state['reward_states'][idx]
 if rs==1:
  award=a if hit else max(1,a//2) if a else 0
  state['reward_passed'][idx]=award;state['reward_states'][idx]=2
 elif rs==2:
  award=a-state['reward_passed'][idx];state['reward_passed'][idx]=a;state['reward_states'][idx]=3
 else:award=0
 state['moved']+=award;state['events'].append(dict(exhibit=e,type=t,hit=hit,award=award))
 values=state['hours'] if t==0 else state['days'];target=board['target_hour'] if t==0 else board['target_day']
 if hit and values==[target,target]:
  bonus=0 if t==0 else 5;award=state['allocation'][bonus];state['moved']+=award
  state['events'].append(dict(bonus=bonus,award=award))

def unit_step(board,state,e):
 """Complete one queued hour/day unit; visual interpolation is an external boundary."""
 if not state['pending'][e]:return False
 t=state['mode'][e]-1;state['pending'][e]-=1
 if state['pending'][e]==0:state['mode'][e]=0
 if t==0:
  state['hours'][e]=(state['hours'][e]+1)%24
  if state['hours'][e]==0 and state['days'][e]!=-1:
   state['days'][e]=(state['days'][e]+1)%28
   if board['level']==3 and state['days'][e]==board['target_day']:
    disabled_type(board,state,e,1);solved_event(board,state,e,1,True)
 else:state['days'][e]=(state['days'][e]+1)%28
 value=state['hours'][e] if t==0 else state['days'][e];target=board['target_hour'] if t==0 else board['target_day']
 if value==target:
  hit=not state['pending'][e]
  if t==1 and hit:disabled_type(board,state,e,1)
  solved_event(board,state,e,t,hit)
 return True

class Oracle:
 def __init__(self):
  from native_oracle import NativeOracle
  from unicorn import UC_HOOK_CODE
  from unicorn.x86_const import UC_X86_REG_EIP,UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ECX
  self.m=m=NativeOracle('island-odyssey');m.uc.mem_map(0,4096);self.obj=m.alloc(0x200);self.ex=[m.alloc(0x200),m.alloc(0x200)];self.rng=MsvcrtRandom(0,True);self.pieces=[];self.events=[];self.disabled=[]
  m.hook_import('rand',lambda m:self.rng.rand('native'))
  m.hook(0x432d10,lambda m:0)
  m.hook(0x432650,lambda m:self.pieces.append([m.arg(i) for i in range(4)]) or 0,pop=16)
  def skip(uc,address,size,data):
   if address==0x432176:uc.reg_write(UC_X86_REG_EBP,m.u32(m.reg(UC_X86_REG_ESP)+0x24))
   uc.reg_write(UC_X86_REG_EIP,{0x432176:0x43220c,0x432223:0x432294,0x432426:0x4324a9,0x4324b3:0x43255c}[address])
  for a in (0x432176,0x432223,0x432426,0x4324b3):m.uc.hook_add(UC_HOOK_CODE,skip,begin=a,end=a)
  for a,pop in [(0x408230,8),(0x408350,4),(0x4351c0,0)]:m.hook(a,lambda m:0,pop=pop)
  m.hook(0x434310,lambda m:self.disabled.append([m.arg(0),m.arg(1)]) or 0,pop=8)
  def event(m):
   name=m.u32(0x4510a0)
   self.events.append(dict(solved=m.arg(0)==name,type=m.u32(self.obj+0xb8),exhibit=m.u32(self.obj+0xbc),hit=m.u32(self.obj+0xc0)))
   return 0
  m.hook_import('?sobPass@OMScriptableObject@@QBEHPBD@Z',event,pop=4)
  # Right exhibit's complete discrete unit handler, rendering/callback boundary supplied.
  m.hook(0x4313a0,lambda m:0)
  self.vtable=m.alloc(16);m.write_u32(self.vtable+4,0x430220)
 def generator(self,seed,level):
  m=self.m;m.write(self.obj,b'\0'*0x200)
  for off in (0x30,0x3c,0x40):m.write_u32(self.obj+off,0xffffffff)
  self.rng=MsvcrtRandom(seed,True);self.pieces=[]
  m.call(0x4320a0,[1,int(level==3),int(level>=2),int(level==1)],ecx=self.obj,stop_at=0x43255c)
  return dict(target_hour=m.u32(self.obj+0x2c),target_day=struct.unpack('<i',m.read(self.obj+0x30,4))[0],hours=list(struct.unpack('<2i',m.read(self.obj+0x34,8))),days=list(struct.unpack('<2i',m.read(self.obj+0x3c,8))),pieces=self.pieces.copy(),rng_values=[x['value'] for x in self.rng.trace],final_rng=dict(calls=self.rng.calls,state=self.rng.state))
 def callback(self,e,t,hour,day,targethour,targetday,mode,pending):
  m=self.m;m.write(self.obj,b'\0'*0x200);self.events=[];self.disabled=[]
  m.write_u32(self.obj+0x1c,1);m.write_u32(self.obj+0x20,1);m.write_u32(self.obj+0x2c,targethour);m.write_u32(self.obj+0x30,targetday)
  for i in range(2):m.write_u32(self.obj+0x44+4*i,self.ex[i])
  m.write(self.ex[e]+4,struct.pack('<4I',mode,hour,day,pending))
  m.call(0x433fe0 if t==0 else 0x4340d0,[e],ecx=self.obj)
  return self.events.copy(),self.disabled.copy()
 def step(self,t,hour,day,pending):
  m=self.m;x=self.ex[1];m.write(x,b'\0'*0x200);m.write_u32(x,self.vtable);m.write(x+4,struct.pack('<4i',t+1,hour,day,pending))
  m.call(0x431730,[t],ecx=x)
  return list(struct.unpack('<4i',m.read(x+4,16)))

def subset(values,residue,modulus,nonempty=True):
 for n in range(1 if nonempty else 0,len(values)+1):
  for ix in itertools.combinations(range(len(values)),n):
   if sum(values[i] for i in ix)%modulus==residue:return list(ix)
 return None

def validate(samples=100):
 sources();o=Oracle();counts=dict(generator_cases=0,native_callbacks=0,native_unit_steps=0,coin_subset_witnesses=0,model_complete_witnesses=0);initial_equal=[]
 for level in (1,2,3):
  for seed in list(range(samples))+[0x7fffffff,0x80000000,0xffffffff]:
   b=generate(seed,level);n=o.generator(seed,level)
   assert all(b[k]==v for k,v in n.items()),(level,seed,b,n);counts['generator_cases']+=1
   if b['hours'][1]==b['target_hour']:initial_equal.append([level,seed])
 for t in (0,1):
  for hour in range(24):
   for day in range(-1 if t==0 else 0,28):
    for pending in (1,2,10):
     got=o.step(t,hour,day,pending)
     nh=(hour+1)%24 if t==0 else hour;nd=(day+1)%28 if t==1 or (t==0 and nh==0 and day!=-1) else day
     assert got==[t+1 if pending>1 else 0,nh,nd,pending-1],(t,hour,day,pending,got);counts['native_unit_steps']+=1
 for e,t,match,mode,pending,hourzero in itertools.product(range(2),range(2),(False,True),range(3),(0,1,7),(False,True)):
  hour=0 if hourzero else 5;day=3;th=hour if match else (hour+1)%24;td=day if match else 4
  ev,dis=o.callback(e,t,hour,day,th,td,mode,pending)
  want=[];wd=[]
  if t==0 and hour==0 and day==td:want.append(dict(solved=True,type=1,exhibit=e,hit=int(not(mode==2 and pending>0))));wd.append([1,e]) if not(mode==2 and pending>0) else None
  hit=int(not(mode==t+1 and pending>0));want.append(dict(solved=match,type=t,exhibit=e,hit=hit))
  assert len(ev)==len(want)
  for a,b in zip(ev,want):assert a['solved']==b['solved'] and (not b['solved'] or a==b),(ev,want)
  if t==1 and match and hit:wd.append([1,e])
  assert dis==wd,(dis,wd);counts['native_callbacks']+=1
 for t in (0,1):
  for d in range(24 if t==0 else 28):
   vals=hour_set(d,0) if t==0 else DAY;assert subset(vals,d,24 if t==0 else 28) is not None;counts['coin_subset_witnesses']+=1
 witness_failures=[];witnesses=[]
 for level in (1,2,3):
  for seed in range(samples):
   b=generate(seed,level);s=initial_state(b);paths=[]
   for e in sorted(range(2),key=lambda e:b['hours'][e]!=b['target_hour']):
    indices=[i for i,p in enumerate(b['pieces']) if p[2]==e];seen=set()
    def search(st,path):
     own=[1+e] if level<3 else ([1,2] if e==0 else [4,3])
     if st['moved']==12 or (st['hours'][e]==b['target_hour'] and (level<3 or st['days'][e]==b['target_day']) and all(st['reward_passed'][i]==st['allocation'][i] for i in own)):return st,path
     key=(tuple(i for i in indices if i in st['available']),tuple(i for i in indices if i in st['disabled']),tuple(st['reward_passed'][i] for i in own))
     if key in seen:return None
     seen.add(key)
     for i in indices:
      ns=copy.deepcopy(st)
      if not insert(b,ns,i):continue
      while ns['pending'][e]:unit_step(b,ns,e)
      result=search(ns,path+[i])
      if result:return result
     return None
    result=search(s,[])
    if result is None:
     witness_failures.append(dict(level=level,seed=seed,exhibit=e,states=len(seen)));break
    s,path=result;paths.append(path)
   if s['moved']>=12:
    counts['model_complete_witnesses']+=1;witnesses.append(dict(level=level,seed=seed,paths=paths,script_passed_counter=s['moved'],individual_awards=s['reward_passed'],events=s['events']))
   elif not witness_failures or witness_failures[-1].get('seed')!=seed:witness_failures.append(dict(level=level,seed=seed,state=s))
 report=dict(status='passed',counts=counts,initial_right_hour_equals_target_samples=initial_equal,witness_search_failures=witness_failures,sources=sources(),scope='Original generator arithmetic, branches, RNG order and item selection with graphics construction skipped. Entire original right exhibit unit-step handler and main game hour/day callback handlers with presentation/event transports stubbed. MPS reward logic independently translated; searches yield at least twelve script passage calls, with traces retained. Port and incubator behavior are outside this test boundary.',limitations=['Generator graphics construction, script interpreter, real-time left-exhibit interpolation and full app are not emulated.','Entry RNG state supplied, not full-session RNG history.'])
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'solution-witnesses.json').write_text(json.dumps(witnesses,indent=2)+'\n');(OUT/'native-validation.json').write_text(json.dumps(report,indent=2)+'\n');return report

def export_spec():
 from spec_io_mps import decode
 ev=sources();OUT.mkdir(parents=True,exist_ok=True);script=decode(ROOT/'local/discs/island-odyssey/HD/scripts/z3a3.mps')
 (OUT/'decoded-script.json').write_text(json.dumps(script,indent=2)+'\n')
 raw=EXE.read_bytes();tables={}
 for name,va,fmt in [('helper_coins',0x451100,'2i'),('normal_coins',0x451128,'6i'),('exceptional_coins',0x451150,'6i'),('day_bills',0x451178,'7i'),('forbidden_right_hours',0x4511a8,'56i'),('moon_angle_by_day',0x45132c,'28f')]:
  tables[name]=dict(va=hex(va),file_offset=va-0x400000,values=list(struct.unpack_from('<'+fmt,raw,va-0x400000)))
 (OUT/'native-tables.json').write_text(json.dumps(tables,indent=2)+'\n')
 rp=OUT/'native-validation.json';report=json.loads(rp.read_text()) if rp.exists() else {}
 spec=dict(schema_version=1,game='island-odyssey',id='island-odyssey-z3a3',name='The Planetarium',
 state=dict(object='Two independently advanced exhibits, sharing an hour target and at level 3 a day target. Finite labeled coin/bill multisets are private to each exhibit.',hours='Integer 0..23; displayed civil hour is (internal+6)%24. A date increments when internal hour wraps 23 to 0, at displayed 6 a.m.',days='Integer 0..27; displayed lunar calendar is day+1. -1 means moon/date disabled.',dynamic=['Hour/day of each exhibit','Active denomination and remaining queued units per exhibit','Consumed and disabled items','Per-compartment first-pass/second-pass award state','Script passage counter'],observations='Left exhibit shows Earth rotation; right shows Sun position, with noon at the top of its arc. Moon phase and position provide additional time/date evidence at levels 2/3. Targets are explicitly displayed on the clock/calendar; the current exhibit values must be inferred from these representations.',native_layout={'target_hour':'+0x2c','target_day':'+0x30','stored_hours':'+0x34,+0x38','stored_days':'+0x3c,+0x40','exhibit_ptrs':'+0x44,+0x48','exhibit_mode_hour_day_pending':'+0x4,+0x8,+0xc,+0x10','item_value_type_exhibit':'+0x138,+0x13c,+0x140'}),
 inputs=dict(level=[1,2,3],tokens='Incoming group clamped to 12; practice uses 12. Normal generation does not depend on group size.',rng='MSVCRT rand state at generator entry.'),
 actions=[dict(name='Insert item',rule='Drag an enabled unused coin or bill into its own exhibit and denomination slot. Each accepted item is consumed. It adds its value to queued hours or days. The same denomination can be queued while an exhibit is moving; the opposite denomination is rejected until movement stops. The other exhibit remains independent.'),dict(name='Wait for unit callback',rule='Each hour adds one modulo 24 and increments the date on the internal-zero rollover; each day adds one modulo 28 while preserving the settled hour. Check target feedback at each completed unit, not merely after the whole inserted amount.'),dict(name='Leave',rule='Go is enabled after the first passage. Partial progress is retained.')],
 feedback=dict(hit='At each unit callback matching its target, hitTarget is true iff no units of that denomination remain. A date target reached by hour rollover counts as a hit because no day advance is active, even while more hours remain.',wrong='A nonmatching unit emits Wrong but consumes no separate strike budget.',disable='After insertion, forecast current+pending (subtract modulus once) matching target disables all remaining items of that denomination for that exhibit. An exact day callback also disables day bills. An intermediate date reached by hours therefore can permanently disable day bills.',partial_awards='First passage through a target gives floor(compartment/2), with minimum one if the compartment is nonempty. First exact stop gives all. A second target encounter gives its remainder; later encounters give zero. Exact stops additionally test whether both current exhibit values match that denomination target and award the shared bonus compartment.',bonus_quirk='The script has no already-paid guard for shared bonuses and does not clear their original counts. Repeated qualifying events can increment the local passage counter beyond incoming count. This is preserved as script behavior; actual extra port tokens or repeated visual moths are not claimed.'),
 success=dict(allocation='Levels 1/2: [both-hour, left-hour, right-hour]. Level 3: [both-hour, left-hour, left-day, right-day, right-hour, both-day]. Divide tokens evenly. Levels 1/2 remainder 1 adds to both-hour, remainder 2 to left/right. Level 3 extras go left-day,right-day,left-hour,right-hour,both-hour in that order.',implemented_allocation='allocation(tokens,level)',round='When script passage counter equals incoming count it disables game input. Progression calls occur when counter exceeds 11 in normal mode. These are script predicates, including the bonus-counter edge case.',objective='Obtain individual compartment awards and simultaneous matches for shared bonuses; crossing a target can earn partial rescue without matching it at rest.',solvability='All 24 hour residues have nonempty subset witnesses under the selected coin set, and all 28 day residues under the bill set. This alone does not prove coupled gameplay solvability: the disable-on-hit rule and day rollover can make particular move orders fail. Retained bounded searches test actual discrete rule sequences; no universal all-seed full-game solvability theorem is claimed.'),
 failure=dict(limit='Finite private item multisets; no strike counter or elapsed-time limit.',out_of_turns='When both exhibits are idle and no enabled pieces remain, the script emits PartCorrect if tokens remain.',traps='Spending wrong sums can remove the only remaining arithmetic solution. At level 3, hour rollover may hit the date early and disable bills before later hours move past that date.',invalid_drop='A drop outside the compatible own-exhibit slot or during the opposite denomination advance does not consume the piece.'),
 difficulty_levels=[dict(level=1,targets=['hour'],coins_per_exhibit=8,day_bills=0,moon=False,structure='Two independent subset sums modulo 24. Helper coins 1 and 2 add fine corrections. Right exhibit starts in internal hours 0..11.'),dict(level=2,targets=['hour'],coins_per_exhibit=6,day_bills=0,moon=True,structure='Same modular goal with no helper coins. Moon phase is one of four cardinal phases; interpreting day/night and moon position is required. A phase-specific forbidden-hour table restricts the right start.'),dict(level=3,targets=['hour','day'],coins_per_exhibit=6,day_bills=7,moon=True,structure='Two coupled coordinates modulo 24 and 28. Any of 28 initial moon phases/dates; hour sums may cross day boundaries. Four individual objectives and two simultaneous-match bonuses replace two individual objectives and one bonus. Order matters because hitting a target disables that kind of item.')],
 generation=dict(status='decoded_and_differentially_verified',entry='0x4320a0(doTargetHour,doTargetDay,showMoon,addHelperSet), thiscall',flags={'1':[1,0,0,1],'2':[1,0,1,0],'3':[1,1,1,0]},rng_calls={'1':3,'2':4,'3':6},implementation='tools/spec_io_planetarium.py:generate',ordered_steps=['Level 3: target day rand()%28; left then right day start via shifted draw N=28 excluding target, building each fixed day bill list immediately afterwards. Level 2 instead uses one shared day=7*(rand()%4). Level 1 uses -1 day sentinels.', 'Draw target hour rand()%24. Draw left hour with shifted draw N=24. Draw right hour with N=12 at level 1, or phase restriction below at levels 2/3. Build each exhibit coin list immediately after its start-hour draw.', 'Shifted draw is one rand()%N, increment modulo N iff equal to target; no rejection and therefore biased.', 'For right phase interval [lo,hi], use shifted draw N=12 if both are -1. Otherwise span=hi-lo+1, x=rand()%(24-span). Only if x lies in [lo,hi], shift x=(x+span)%24, then increment modulo 24 until outside the interval and unequal to target. The initial-outside branch skips the target exclusion, so starting at the target is possible.', 'Hour difference (target-start)%24 equal to 18 or 23 chooses [4,5,7,7,10,10]; otherwise [4,5,5,7,10,10]. Level 1 prepends [1,2]. Day bills always [1,4,5,5,7,10,10]. No item shuffle or solvability rejection.'],tables=tables,templates='Normal puzzle generator uses native constant tables. Optional z3a3in.xml is an absent debug input, not a shipped normal template.'),
 assets=dict(roots=['local/derived/island-odyssey/assets/z3a3','local/derived/island-odyssey/assets/z3a3cd'],background=14000,three_crystals=14020,six_crystals=14021,reward_light=14091,help_bindings='/Z3A3/Help/Level1..3 in source XML',manifest='local/derived/island-odyssey/assets-manifest.json; animation frames in animations-manifest.json.',native_visual_tables='Moon angular offsets by each day retained in native-tables.json at 0x45132c. Native visual/clock code 0x42f490..0x431890 maps internal values to frames and geometry; real-time interpolation is outside the discrete callback model.'),
 evidence=ev+[dict(kind='native',va='0x4320a0-0x43264f',meaning='Generator and flag branches'),dict(kind='native',va='0x433a60,0x4351a0',meaning='Item list selection and biased excluded draw'),dict(kind='native',va='0x433d60-0x433f5d',meaning='Slot eligibility, consumption, queuing and forecast disabling'),dict(kind='native',va='0x431730,0x430e40',meaning='Discrete hour/day advancement and callbacks'),dict(kind='native',va='0x433fe0-0x434194,0x434310',meaning='Target, partial/exact feedback and remaining-item disabling'),dict(kind='MPS',instructions='1547-1787,1806-1818,1877-2088',meaning='Level inputs, reward distribution, passages, progression, partial completion and bonus edge case'),dict(kind='manual',pdf_pages=[20,21,35])],
 validation=dict(status=report.get('status','not_run'),counts=report.get('counts',{}),scope=report.get('scope'),report=str(rp.relative_to(ROOT)),report_sha256=hashlib.sha256(rp.read_bytes()).hexdigest() if rp.exists() else None,reproduction='research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_planetarium.py --validate --samples 100; python3 research/zoombinis/tools/spec_io_planetarium.py --export'),
 open_questions=['Full-session seed history and rendering callback timing are outside the supplied entry-state/event boundary.', 'Script bonus overflow is established from decoded conditions; physical port accounting and incubator behavior for repeated bonus calls have not been emulated.'],
 completeness=dict(mathematical_gameplay='complete_at_discrete_callback_boundary',generation='complete_at_entry_rng_boundary',all_shipped_difficulties=True,full_game_runtime_parity=False))
 path=ROOT/'local/specs/island-odyssey/planetarium.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(spec,indent=2)+'\n');return dict(spec=str(path),completeness=spec['completeness'])

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--export',action='store_true');p.add_argument('--validate',action='store_true');p.add_argument('--samples',type=int,default=100);p.add_argument('--seed',type=int,default=1);p.add_argument('--level',type=int,default=1);a=p.parse_args()
 print(json.dumps(export_spec() if a.export else validate(a.samples) if a.validate else generate(a.seed,a.level),indent=2))
