#!/usr/bin/env python3
"""Corral: product-filtered generator, finite experiments, feeding and Venn placement."""
from pathlib import Path
import argparse,hashlib,itertools,json,struct
from island_generator import MsvcrtRandom
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'local/analysis/island-odyssey-corral'
EXE=ROOT/'local/discs/island-odyssey/HD/Win/Zoombinis Island Odyssey.exe'
HASHES=['619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2','5458dda51721962948d4d5ec264b284f6c29e121068269ad27e5e5a030d615e7','b15f96e19d1a7c5c26a0e2bd5c967bd1b4bc324d4a79024d7bb53becab273b60']
NIBBLES=[15,240,3840];REGIONS={0:list(range(12)),1:list(range(12,17)),2:list(range(17,22)),4:list(range(22,27)),3:list(range(27,30)),5:list(range(30,33)),6:list(range(33,36)),7:[36]}
def sources():
 ps=[EXE]+[ROOT/('local/discs/island-odyssey/HD/scripts/z3a6.'+x) for x in ('mps','xml')];r=[dict(path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in ps]
 if [x['sha256'] for x in r]!=HASHES:raise ValueError('Unknown source revision')
 return r

def encode(b):return sum(1<<(4*a+v) for a,v in enumerate(b))
def accepted(level,axes,berry,preference,fed=False):return not fed and all(berry[a]==preference[a] for a in (axes[:2] if level==1 else range(3)))
def generate(seed,level,tokens=12):
 if level not in (1,2,3) or not 1<=tokens<=12:raise ValueError('Invalid level or token count')
 rng=MsvcrtRandom(seed,True);used=set();available=list(range(12));berries=[];animals=[];positions=[];jitter=[];counts=[0,0,0];previous=[-1]*3
 for i in range(tokens):
  while True:
   b=[rng.rand('berry-'+str(i)+'-'+str(a))%4 for a in range(3)];key=(b[0]+1)*(b[1]+1)*(b[2]+1)
   if key not in used:break
  used.add(key)
  animal=[rng.rand('feet-'+str(i))%3,rng.rand('tail-'+str(i))%3];pos=available.pop(rng.rand('position-'+str(i))%(12-i))
  for a in range(3):counts[a]+=int(previous[a]==b[a])
  for a in range(3):
   if counts[a]>=9 if a==0 else counts[a]==9:b[a]=(b[a]+1)%4
  previous=b.copy();berries.append(b);animals.append(animal);positions.append(pos)
  jitter.append([rng.rand('berry-y-'+str(i))%15,rng.rand('zerble-x-'+str(i))%15,rng.rand('zerble-y-'+str(i))%15])
 left=rng.rand('left-axis')%3;right=[a for a in range(3) if a!=left][rng.rand('right-axis')%2];rng.rand('unused-top-axis-draw');top=3-left-right
 return dict(seed=seed,level=level,tokens=tokens,berries=berries,animals=animals,positions=positions,jitter=jitter,axes=[left,right,top],power=11 if level==1 else 8,rng_values=[v['value'] for v in rng.trace],final_rng=dict(calls=rng.calls,state=rng.state))

def candidate_cells(preference,axes,projections):
 mask=sum(1<<i for i,b in enumerate(projections) if b is not None and preference[axes[i]]==b[axes[i]])
 if not mask:return REGIONS[0].copy()
 active=sum(1<<i for i,b in enumerate(projections) if b is not None)
 return [c for region in (1,2,4,3,5,6,7) if region&mask==mask and region&active==mask for c in REGIONS[region]]

def reposition(berries,axes,projections,positions,rng):
 choices=[candidate_cells(b,axes,projections) for b in berries];positions=positions.copy()
 for i,c in enumerate(choices):
  if positions[i] not in c:positions[i]=-1
 occupied=set(positions)-{-1}
 for i,c in enumerate(choices):
  while positions[i]==-1:
   dest=c[rng.rand('move-'+str(i))%len(c)]
   if dest not in occupied:positions[i]=dest;occupied.add(dest)
 return positions

def initial_state(b):return dict(remaining=set(range(b['tokens'])),fed=set(),projectors=[None]*3,positions=b['positions'].copy(),power=b['power'],passed=0)
def project(b,s,berry,projector,rng):
 if berry not in s['remaining'] or projector not in range(2 if b['level']==1 else 3) or s['projectors'][projector] is not None or s['power']<=0:return False
 if berry in s['projectors']:s['projectors'][s['projectors'].index(berry)]=None
 s['projectors'][projector]=berry;s['power']-=1
 s['positions']=reposition(b['berries'],b['axes'],[b['berries'][i] if i is not None else None for i in s['projectors']],s['positions'],rng)
 return True

def remove_projection(s,projector):
 s['projectors'][projector]=None # Native clears display/mask but leaves animals where they are until a placement.
def feed(b,s,berry,animal):
 if berry not in s['remaining'] or animal in s['fed']:return 'invalid'
 if berry in s['projectors']:remove_projection(s,s['projectors'].index(berry))
 s['remaining'].remove(berry)
 if accepted(b['level'],b['axes'],b['berries'][berry],b['berries'][animal]):s['fed'].add(animal);s['passed']+=1;return 'correct'
 return 'rejected'

class Oracle:
 def __init__(self):
  from native_oracle import NativeOracle
  from unicorn import UC_HOOK_CODE
  from unicorn.x86_const import UC_X86_REG_EIP,UC_X86_REG_ESP,UC_X86_REG_ECX,UC_X86_REG_ESI,UC_X86_REG_EDI,UC_X86_REG_EBP,UC_X86_REG_EAX
  self.regs=(UC_X86_REG_ESI,UC_X86_REG_EDI,UC_X86_REG_EBP,UC_X86_REG_EAX);self.m=m=NativeOracle('island-odyssey');m.uc.mem_map(0,4096);self.obj=m.alloc(0x600);self.answers=[m.alloc(8) for _ in range(12)];self.berries=[];self.animals=[];self.positions=[];self.rng=MsvcrtRandom(1,True)
  m.hook_import('rand',lambda m:self.rng.rand('native'));m.hook(0x43e78a,lambda m:m.alloc(m.arg(0)));m.hook(0x43e7a0,lambda m:0)
  def skip(uc,address,size,data):
   sp=m.reg(UC_X86_REG_ESP)
   if address==0x420708:
    self.berries.append([m.u32(sp+x) for x in (0x14,0x10,0x18)]);self.animals.append([m.u32(sp+x) for x in (0x48,0x44)])
    self.positions.append(m.u32(sp+0x8c+4*m.reg(UC_X86_REG_EDI)));return
   uc.reg_write(UC_X86_REG_EIP,{0x420747:0x420a7d,0x420b00:0x420b7c,0x420b91:0x420be7,0x420bee:0x420c39}[address])
  for a in (0x420708,0x420747,0x420b00,0x420b91,0x420bee):m.uc.hook_add(UC_HOOK_CODE,skip,begin=a,end=a)
  m.hook_import('?getValue@RAnswer@@QAEHXZ',lambda m:m.u32(m.reg(UC_X86_REG_ECX)))
  for addr,pop in [(0x40fa70,0),(0x40cf50,12),(0x410470,12)]:m.hook(addr,lambda m:0,pop=pop)
  # Balanced fragment boundary, feed match branch before any presentation.
  m.hook(0x421317,lambda m:1);m.hook(0x421358,lambda m:0)
 def generator(self,seed,level,tokens):
  m=self.m;m.write(self.obj,b'\0'*0x600);self.rng=MsvcrtRandom(seed,True);self.berries=[];self.animals=[];self.positions=[]
  m.call(0x420560,[level,tokens],ecx=self.obj)
  return dict(berries=self.berries,animals=self.animals,positions=self.positions,axes=list(struct.unpack('<3I',m.read(self.obj+0x26c,12))),power=m.u32(self.obj+0x424),rng_values=[x['value'] for x in self.rng.trace],final_rng=dict(calls=self.rng.calls,state=self.rng.state))
 def rearrange(self,berries,axes,projectors,positions,seed):
  m=self.m;m.write(self.obj,b'\0'*0x600);m.write_u16(self.obj+0x354,len(berries));self.rng=MsvcrtRandom(seed,True)
  m.write(self.obj+0x290,struct.pack('<37i',*([-1]*37)))
  for i,b in enumerate(berries):
   m.write_u32(self.answers[i],encode(b));m.write_u32(self.obj+0x148+4*i,self.answers[i]);m.write_u32(self.obj+0x324+4*i,positions[i]);m.write_u32(self.obj+0x290+4*positions[i],i)
  for i,b in enumerate(projectors):m.write_u32(self.obj+0x278+4*i,encode(b)&NIBBLES[axes[i]] if b is not None else 0)
  m.call(0x421b50,ecx=self.obj)
  return list(struct.unpack('<'+str(len(berries))+'i',m.read(self.obj+0x324,4*len(berries)))),[v['value'] for v in self.rng.trace]
 def match(self,level,axes,a,b,fed=False):
  m=self.m;m.write_u32(self.obj+0x25c,level);m.write(self.obj+0x26c,struct.pack('<3I',*axes));m.write_u32(self.obj+0x55c,int(fed))
  return bool(m.call(0x4212d9,registers={self.regs[0]:self.obj,self.regs[1]:0,self.regs[2]:encode(a),self.regs[3]:encode(b)}))

def validate(samples=100):
 sources();o=Oracle();counts=dict(generator_cases=0,feeding_cases=0,reposition_cases=0,model_perfect_matchings=0);examples=[]
 for level in (1,2,3):
  for tokens in (1,6,12):
   for seed in range(samples):
    b=generate(seed,level,tokens);n=o.generator(seed,level,tokens)
    assert all(b[k]==v for k,v in n.items()),(seed,level,tokens,b,n);counts['generator_cases']+=1
  for axes in itertools.permutations(range(3)):
   for a,b in itertools.product(itertools.product(range(4),repeat=3),repeat=2):
    assert accepted(level,axes,a,b)==o.match(level,axes,a,b);counts['feeding_cases']+=1
  for seed in range(10):
   b=generate(seed,level);s=initial_state(b)
   for i in range(12):assert feed(b,s,i,i)=='correct'
   assert s['passed']==12;counts['model_perfect_matchings']+=1
   positions=b['positions'];projections=[None]*3
   for turn in range(12):
    j=turn%(2 if level==1 else 3);projections[j]=b['berries'][turn]
    rng=MsvcrtRandom(seed*16+turn,True);want=reposition(b['berries'],b['axes'],projections,positions,rng);got,trace=o.rearrange(b['berries'],b['axes'],projections,positions,seed*16+turn)
    assert got==want and trace==[v['value'] for v in rng.trace],(level,seed,turn,want,got);positions=got;counts['reposition_cases']+=1
   if seed==0:examples.append(b)
 report=dict(status='passed',counts=counts,sources=sources(),scope='Original setup arithmetic and RNG stream with resource construction skipped; native feeding decision fragment and whole original Venn-cell rearranger, with value/visual interfaces marshaled.',boundaries=['No full application or MPS interpreter','Entry RNG state supplied; later movement RNG is checked from explicit event-entry state','Pixel drag targeting and visual timing supplied externally'])
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'native-validation.json').write_text(json.dumps(report,indent=2)+'\n');(OUT/'examples.json').write_text(json.dumps(examples,indent=2)+'\n');return report

def export_spec():
 from spec_io_mps import decode
 ev=sources();OUT.mkdir(parents=True,exist_ok=True);(OUT/'decoded-script.json').write_text(json.dumps(decode(ROOT/'local/discs/island-odyssey/HD/scripts/z3a6.mps'),indent=2)+'\n')
 raw=EXE.read_bytes();tables={}
 for name,va,n,fmt in [('turn_limits',0x4502e4,3,'i'),('attribute_masks',0x4502f0,3,'H'),('attribute_weights',0x4502f8,3,'H'),('value_bits',0x450300,4,'H'),('region_bits',0x450308,3,'H'),('berry_x',0x450144,12,'i'),('zerble_x',0x4501a4,37,'i'),('zerble_y',0x450238,37,'i')]:tables[name]=dict(va=hex(va),file_offset=va-0x400000,values=list(struct.unpack_from('<'+str(n)+fmt,raw,va-0x400000)))
 (OUT/'native-tables.json').write_text(json.dumps(tables,indent=2)+'\n');rp=OUT/'native-validation.json';r=json.loads(rp.read_text()) if rp.exists() else {}
 spec=dict(schema_version=1,game='island-odyssey',id='island-odyssey-z3a6',name='The Corral',
 state=dict(object='Identify hidden animal food preferences through finite attribute-membership experiments, then spend each berry to feed one compatible animal.',attributes=['shape','color','leaf'],values_per_attribute=4,preferences='Each generated animal is paired internally with the same-index generated berry. That berry specifies its preference; visible feet and tail are independently randomized and do not encode food preference.',dynamic=['Unspent berries, including berries on trays','Fed animals','One berry per projector and its selected attribute bit','Animal positions in 37 Venn-region cells','Projector placement budget'],encoding='Berry=sum(1<<(4*attribute+value)); masks 0x000f,0x00f0,0x0f00.',native_layout={'level':'+0x25c','axes':'+0x26c,+0x270,+0x274','projected_bits':'+0x278,+0x27c,+0x280','projected_berry_indices':'+0x284,+0x288,+0x28c','cell_occupants':'+0x290[37]','animal_cells':'+0x324[12]','initial_berry_animals_count':'+0x354 (i16)','berries_remaining':'+0x356 (i16)','animals_remaining':'+0x358 (i16)','projection_budget':'+0x424','fed_flags':'+0x55c[12]'}),
 inputs=dict(level=[1,2,3],tokens='Incoming count clamped to twelve by MPS. Exactly that many berries and animals are generated; unlike Garden this is not always twelve.',rng='MSVCRT state at setup entry; each later rearrangement consumes RNG from its supplied event-entry state.'),
 actions=[dict(name='Project a berry',rule='Place an unspent berry on an empty active projector. The first berry admitted spends one projection use, sets the projector to the bit for its assigned attribute, and rearranges animals. A second berry in an occupied projector or placement after power exhaustion is removed and returned without a valid experiment.'),dict(name='Remove a projected berry',rule='Removing the sole berry clears that projector bit and image without consuming power. Animals retain their current cells until the next accepted projection; their old positions are therefore not a fresh classification after removal.'),dict(name='Feed an animal',rule='Drop an unspent berry on an unfed, settled animal. Level 1 compares only the two projector-selected attributes; levels 2/3 compare all three. Correct and rejected feeds both consume the berry. A correct feed permanently removes the animal and passes one token.'),dict(name='Arrange berries',rule='Holding-area movements and invalid targets do not consume berries or power.'),dict(name='Leave',rule='Script enables Go only once the destination Barn token count reaches its configured minimum. This differs from the usual first-success navigation condition.')],
 feedback=dict(projection='For each active projector, animals whose preference contains the selected bit enter that circle; intersections encode conjunctions. Levels 1/2 highlight the selected attribute; level 3 hides all such highlights.',movement='Keep any animal in an already legal cell; free the illegal positions first, then process animals in index order, drawing uniformly modulo the candidate-list length and retrying occupied cells. Fed animals still reserve internal cells and consume relocation RNG, although their move animations are skipped.',candidate_cells='Outside all circles: cells0..11. Exclusive left/right/top:12..16/17..21/22..26. Pair intersections LR/LT/RT:27..29/30..32/33..35. Triple:36. If a matching animal has no bit for a projector with no berry, that inactive circle is a wildcard and its overlapping cells are also eligible. A zero-membership animal always uses outside cells.',accepted='Animal eats and walks away. The selected berry disappears. It emits correct and later updates completion counters on the walk-completion callback.',rejected='Animal spits the berry out; it is unavailable for all further feeding. No attribute-specific explanation is emitted.',power='Last two available placements trigger blinking feedback. Zero power disables further projector admission but retains feeding and the last experiment state. Animation milliseconds do not constitute a puzzle time budget.'),
 success=dict(per_animal='One passed token per correct feed. Incoming count all fed triggers normal progression, including groups smaller than twelve.',matching='The index pairing is an initial perfect matching. At level 1, compatibility is equality on two attributes, partitioning animals/berries into identical equivalence classes; any accepted feed removes one member of each corresponding class. At levels 2/3 exact triples match. Therefore correct feeds alone cannot destroy the remaining mathematical matching.',epistemic='This existence proof does not assert a guaranteed player strategy within the finite projector budget. The player must infer preferences from membership tests, correlations across berries, and elimination.',port_output='MPS writes token type 0 and currentZerbleFeet/currentZerbleTail to the outgoing token before moving it to Barn. Native currentZerble is updated at animal walk completion; exact external script-event scheduling relative to that callback is outside the model.'),
 failure=dict(projector_uses={'1':11,'2':8,'3':8},berries='Each wrong feed permanently reduces the maximum possible total rescue by at least one because berry count initially equals animal count.',finish='Native finished event when berry count or remaining animal count reaches zero. Script distinguishes all, some, and no successes. outOfTurns here is projection-power exhaustion; feeding can continue.',timer='No elapsed-time defeat condition; native time checks animate warning/startup flashes only.'),
 difficulty_levels=[dict(level=1,projectors=2,required_traits=2,hidden_axis_choices=6,highlight=True,power=11,structure='Two simultaneous equality classifications, one irrelevant trait. Alternative berries with equal selected traits are interchangeable.'),dict(level=2,projectors=3,required_traits=3,hidden_axis_choices=6,highlight=True,power=8,structure='All three traits must agree. Three-set intersections increase the information per experiment; the budget is smaller, requiring observations to be reused across animals.'),dict(level=3,projectors=3,required_traits=3,hidden_axis_choices=6,highlight=False,power=8,structure='Same acceptance rule and budget as level 2, but projector attribute identity is latent. Compare population counts and intersections against the available berry traits to infer which property each projector tests.')],
 generation=dict(status='decoded_and_differentially_verified',entry='0x420560(level,tokens), thiscall',helpers={'berry':'0x41f580(index,shape_out,color_out,leaf_out)','animal':'0x41fd90(index,feet_out,tail_out,position_array,available_positions)','axes':'0x4202b0()'},implementation='tools/spec_io_corral.py:generate',ordered_steps=['For each active token, draw shape,color,leaf independently rand()%4. Reject the whole triple while the product (shape+1)*(color+1)*(leaf+1) has been used. Mark the original product used. This is product uniqueness, not merely triple uniqueness; permutations and other factor collisions reject.', 'Draw feet rand()%3, tail rand()%3, then select a position from remaining ascending initial cells with rand()%(12-index), removing it from the available array.', 'Maintain cumulative counts of adjacent equal values per attribute, without resetting on inequality. If shape count>=9, or color/leaf count==9, increment that generated value modulo four. This post-correction does not update the product-use table. It is preserved despite being rare for the product-filtered normal generator.', 'Consume three placement-jitter draws rand()%15: berry y=535+2*r, animal x=cell_x-15+2*r, animal y=cell_y-15+2*r. These draws affect the subsequent puzzle stream even though coordinates are presentation data.', 'After all items, draw left attribute rand()%3; right from the other two in ascending order using rand()%2; consume one unused rand for the remaining top attribute. This third draw occurs at every difficulty.'],rng_calls='9*tokens+3 plus 3 for every rejected berry triple. Later rearrangements add a data-dependent number of calls.',templates='Native generation; absent optional input debug XML. Debug root is named Z3A5Data even though this is scene Z3A6.',tables=tables),
 assets=dict(roots=['local/derived/island-odyssey/assets/z3a6','local/derived/island-odyssey/assets/z3a6cd'],background=20000,berry_shape_color=20101,berry_leaf=20102,berry_frames='Shape/color resource frame = color+4*shape+1; leaf frame=leaf+1.',help='/Z3A6/Help/Level1..3',manifest='local/derived/island-odyssey/assets-manifest.json; payload hashes and archive offsets retained.'),
 evidence=ev+[dict(kind='native',va='0x41f580,0x41fd90,0x4202b0,0x420560',meaning='Random helpers and setup call order'),dict(kind='native',va='0x420d60-0x420fdd',meaning='Projector admission, power and removal'),dict(kind='native',va='0x4212d9-0x421317,0x4213c0-0x421543,0x421b10',meaning='Feeding compatibility, berry consumption and completion'),dict(kind='native',va='0x421b50-0x422079',meaning='Complete membership and random cell relocation'),dict(kind='MPS',instructions='1613-1625,1665-1687,1734-1772',meaning='Token inputs, transfer attributes, destination minimum, success/progression'),dict(kind='manual',pdf_pages=[25,26,37])],
 validation=dict(status=r.get('status','not_run'),counts=r.get('counts',{}),scope=r.get('scope'),report=str(rp.relative_to(ROOT)),report_sha256=hashlib.sha256(rp.read_bytes()).hexdigest() if rp.exists() else None,reproduction='research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_corral.py --validate --samples 100; python3 research/zoombinis/tools/spec_io_corral.py --export'),
 open_questions=['Entry RNG and settled action boundaries exclude session history and frame timing. Script-event transport ordering for the outgoing currentZerble attributes has not been emulated; the two source-side operations and addresses are explicit.'],
 completeness=dict(mathematical_gameplay='complete_at_settled_action_boundary',generation='complete_at_entry_rng_boundary',all_shipped_difficulties=True,full_game_runtime_parity=False))
 path=ROOT/'local/specs/island-odyssey/corral.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(spec,indent=2)+'\n');return dict(spec=str(path),completeness=spec['completeness'])

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--export',action='store_true');p.add_argument('--validate',action='store_true');p.add_argument('--samples',type=int,default=100);p.add_argument('--seed',type=int,default=1);p.add_argument('--level',type=int,default=1);a=p.parse_args();print(json.dumps(export_spec() if a.export else validate(a.samples) if a.validate else generate(a.seed,a.level),indent=2))
