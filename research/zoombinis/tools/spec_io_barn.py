#!/usr/bin/env python3
"""Barn settled gameplay, exact generator and isolated original-function oracle."""
from pathlib import Path
import argparse,collections,hashlib,itertools,json,struct
from island_generator import MsvcrtRandom
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'local/analysis/island-odyssey-barn'
EXE=ROOT/'local/discs/island-odyssey/HD/Win/Zoombinis Island Odyssey.exe'
HASHES=['619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2','ad958a3a77ddcbff4d0dd8e6c3b182291dccbafa02adc938caa5def752969078','c7eb9e42b67b5e1eb85a988a06c1bb7856d6477a3940ae50dafa9a70c68b8962']
LIMITS=[[1,1,1],[1,1,1],[2,2,1],[4,4,3],[6,6,5],[8,8,6]]
def sources():
 ps=[EXE]+[ROOT/('local/discs/island-odyssey/HD/scripts/z3a7.'+x) for x in ('mps','xml')]
 r=[dict(path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in ps]
 if [v['sha256'] for v in r]!=HASHES:raise ValueError('Unknown source revision')
 return r

def dominant(a,b):return a if a==b or (a+1)%3==b else b

def offspring(left,right):
 if left is None and right is None:return [-1]*4
 if left is None:return [right[0],right[0],right[1],right[1]]
 if right is None:return [left[0],left[1],left[0],left[1]]
 return [dominant(a,b) for b in right for a in left]

def score(children,target):return sum((collections.Counter(children)&collections.Counter(target)).values())

def generate(seed,level,pairs=6,incoming=None):
 if level not in (1,2,3) or pairs not in range(1,7):raise ValueError('Invalid level/pair count')
 if incoming is not None and len(incoming)!=pairs*2:raise ValueError('Provide exactly two animals per pair')
 rng=MsvcrtRandom(seed,True);orders=[[rng.rand('ordinal-'+str(side)+'-'+str(i))%(pairs-i) for i in range(pairs)] for side in range(2)];animals=[];axis=1 if level<3 else 2
 for i in range(2*pairs):
  traits=[-1]*3 if incoming is None else list(incoming[i])
  for a,n in enumerate([1,3,3]):
   if traits[a]<0:traits[a]=rng.rand('trait-'+str(i)+'-'+str(a))%n
   elif traits[a]>=n:raise ValueError('Invalid supplied trait')
  primary=traits[axis];secondary=(primary+rng.rand('allele-'+str(i))%2)%3
  if secondary==primary:secondary=(primary+rng.rand('allele-retry-'+str(i))%2)%3
  animals.append(dict(id=i,tag=i if incoming is not None else -1,side=i%2,traits=traits,genes=[primary,secondary]))
 return dict(seed=seed,level=level,pairs=pairs,axis=axis,show_genes=level==1,max_wrong=LIMITS[pairs-1][level-1],orders=orders,animals=animals,rng_values=[x['value'] for x in rng.trace],final_rng=dict(calls=rng.calls,state=rng.state))

def state(board):
 s=dict(remaining=[[i for i in range(2*board['pairs']) if i%2==side] for side in range(2)],selected=[None,None],wrong=0,passed=[],round=0,target=[])
 set_target(board,s);return s

def set_target(b,s):
 if not s['remaining'][0]:s['target']=[];return
 ids=[s['remaining'][side][b['orders'][side][s['round']]] for side in range(2)]
 s['target']=offspring(*[b['animals'][i]['genes'] for i in ids])

def remove(s,side):s['selected'][side]=None

def place(b,s,animal,stone):
 if stone not in (0,1) or animal not in s['remaining'][stone] or s['selected'][stone] is not None or s['wrong']>=b['max_wrong']:return dict(result='invalid')
 s['selected'][stone]=animal
 if None in s['selected']:
  return dict(result='one_parent',genes=b['animals'][animal]['genes'] if b['show_genes'] else None)
 kids=offspring(*[b['animals'][i]['genes'] for i in s['selected']]);n=score(kids,s['target'])
 if n<4:s['wrong']+=1;return dict(result='wrong',offspring=kids,matching=n,exhausted=s['wrong']==b['max_wrong'])
 pair=s['selected'].copy()
 for side,i in enumerate(pair):s['remaining'][side].remove(i)
 s['passed']+=pair;s['selected']=[None,None];s['round']+=1;set_target(b,s)
 return dict(result='correct',offspring=kids,matching=4,passed=pair,complete=not s['target'])

class Oracle:
 def __init__(self):
  from native_oracle import NativeOracle
  from unicorn import UC_HOOK_CODE
  from unicorn.x86_const import UC_X86_REG_EIP,UC_X86_REG_ESP,UC_X86_REG_EBX,UC_X86_REG_ECX,UC_X86_REG_ESI
  self.m=m=NativeOracle('island-odyssey');m.uc.mem_map(0,4096);self.obj=m.alloc(0x200);self.rng=MsvcrtRandom(1,True);self.chars={}
  self.regs=(UC_X86_REG_ESI,UC_X86_REG_EBX);self.records=[]
  m.hook_import('rand',lambda m:self.rng.rand('native'));m.hook(0x43e78a,lambda m:m.alloc(m.arg(0)));m.hook(0x43e7a0,lambda m:0);m.hook(0x414360,lambda m:0)
  def skip(uc,address,size,data):
   if address==0x413315:
    sp=m.reg(UC_X86_REG_ESP);rec=m.reg(UC_X86_REG_EBX);char=m.alloc(0x150);traits=m.alloc(12,m.read(sp+0x24,12));desc=m.alloc(16);m.write_u32(desc+12,3);m.write_u32(char+0x138,desc);m.write_u32(char+0x13c,traits);m.write_u32(rec,char);self.records.append(rec);self.chars[rec]=list(struct.unpack('<3i',m.read(traits,12)))
   uc.reg_write(UC_X86_REG_EIP,{0x413141:0x413208,0x413315:0x41344c,0x41361b:0x41367f,0x4147ca:0x414856}[address])
  for a in (0x413141,0x413315,0x41361b,0x4147ca):m.uc.hook_add(UC_HOOK_CODE,skip,begin=a,end=a)
  for addr,pop in [(0x40cf50,12),(0x410470,12),(0x415810,4),(0x411450,4),(0x416d80,24)]:m.hook(addr,lambda m:0,pop=pop)
  self.events=[]
  m.hook_import('?sobPass@OMScriptableObject@@QBEHPBD@Z',lambda m:self.events.append(m.read(m.arg(0),80).split(b'\0')[0].decode()) or 0,pop=4)
 def _list(self,offset,records):
  m=self.m;nodes=[m.alloc(12) for _ in records]
  for i,(n,r) in enumerate(zip(nodes,records)):m.write(n,struct.pack('<3I',r,nodes[i-1] if i else 0,nodes[i+1] if i+1<len(nodes) else 0))
  m.write(self.obj+offset,struct.pack('<8I',0,nodes[0] if nodes else 0,nodes[-1] if nodes else 0,0,0,0,0xffffffff,len(nodes)))
 def generator(self,seed,level,pairs,incoming):
  m=self.m;m.write(self.obj,b'\0'*0x200);self.records=[];self.chars={};self.rng=MsvcrtRandom(seed,True)
  for offset in (0x30,0x50,0xb8):self._list(offset,[])
  if incoming is not None:self._list(0xb8,[m.alloc(16,struct.pack('<4i',*t,i)) for i,t in enumerate(incoming)])
  m.call(0x4130b0,[pairs,1 if level<3 else 2,int(level==1),LIMITS[pairs-1][level-1]],ecx=self.obj)
  animals=[dict(id=i,tag=struct.unpack('<i',m.read(rec+4,4))[0],side=m.u32(rec+8),traits=self.chars[rec],genes=list(struct.unpack('<2i',m.read(rec+12,8)))) for i,rec in enumerate(self.records)]
  orders=[list(struct.unpack('<'+str(pairs)+'I',m.read(m.u32(self.obj+o),4*pairs))) for o in (0xb0,0xb4)]
  return dict(animals=animals,orders=orders,rng_values=[x['value'] for x in self.rng.trace],final_rng=dict(calls=self.rng.calls,state=self.rng.state))
 def mate(self,a,b):
  m=self.m;rs=[m.alloc(24) if x is not None else 0 for x in (a,b)]
  for r,x in zip(rs,(a,b)):
   if r:m.write(r+12,struct.pack('<2i',*x))
  arr=m.alloc(8,struct.pack('<2I',*rs));out=m.alloc(16);m.call(0x4149e0,[arr,out],ecx=self.obj);return list(struct.unpack('<4i',m.read(out,16)))
 def compare(self,kids,target,selected=2):
  m=self.m;m.write_u32(self.obj+0xe0,int(selected>0));m.write_u32(self.obj+0xe8,int(selected>1));m.write(self.obj+0xfc,struct.pack('<4i',*kids));m.write(self.obj+0x124,struct.pack('<4i',*target));return m.call(0x414bc0,ecx=self.obj)
 def target(self,b,s):
  m=self.m;m.write_u32(self.obj+0x28,b['pairs']);rs=[]
  for side in range(2):
   side_rs=[]
   for i in s['remaining'][side]:
    r=m.alloc(24);m.write(r+12,struct.pack('<2i',*b['animals'][i]['genes']));side_rs.append(r)
   self._list(0x30+32*side,side_rs);a=m.alloc(4*b['pairs'],struct.pack('<'+str(b['pairs'])+'I',*b['orders'][side]));m.write_u32(self.obj+0xb0+4*side,a)
  m.call(0x414750,ecx=self.obj);return list(struct.unpack('<4i',m.read(self.obj+0x124,16)))

 def outcome(self,b,s,pair):
  m=self.m;self.events=[];m.write(self.obj,b'\0'*0x200);self.target(b,s)
  for offset in (0x70,0x90):self._list(offset,[])
  for side,i in enumerate(pair):
   node=m.u32(self.obj+0x34+32*side)
   for _ in range(s['remaining'][side].index(i)):node=m.u32(node+8)
   rec=m.u32(node);m.write_u32(rec,m.alloc(0x220));m.write_u32(rec+4,i+100);m.write_u32(rec+20,side);m.write_u32(self.obj+0xe0+8*side,rec)
  m.call(0x415d30,ecx=self.obj)
  return dict(tags=[m.u32(self.obj+0x170+4*i) for i in range(2)],remaining=[m.u32(self.obj+x) for x in (0x4c,0x6c)],selected=[m.u32(self.obj+x) for x in (0xe0,0xe8)],events=self.events.copy())
 def wrong(self,kids,target,wrong):
  m=self.m;self.events=[];self.compare(kids,target);m.write_u32(self.obj+0x24,wrong);m.write_u32(self.obj+0x184,0)
  m.call(0x4150cc,registers={self.regs[0]:self.obj,self.regs[1]:0},stop_at=0x415126)
  return m.u32(self.obj+0x24),self.events.copy()

def validate():
 sources();o=Oracle();counts=collections.Counter();witnesses=[]
 for level,pairs,mode in itertools.product(range(1,4),range(1,7),range(3)):
  incoming=None if mode==0 else [[0,(i+1)%3,i%3] if mode==1 else [0,-1,i%3] for i in range(2*pairs)]
  for seed in range(40):
   b=generate(seed,level,pairs,incoming);r=o.generator(seed,level,pairs,incoming)
   for key in r:assert r[key]==b[key],(level,pairs,mode,seed,key,r[key],b[key])
   counts['generator_cases']+=1
 genes=[None]+list(itertools.product(range(3),repeat=2))
 for a,b in itertools.product(genes,repeat=2):assert o.mate(a,b)==offspring(a,b),(a,b);counts['offspring_cases']+=1
 kids=list(itertools.product(range(3),repeat=4))
 for a,b in itertools.product(kids,repeat=2):assert o.compare(a,b)==score(a,b);counts['multiset_score_cases']+=1
 for selected in (0,1):assert o.compare([0]*4,[0]*4,selected)==0;counts['incomplete_selection_cases']+=1
 for level,pairs,seed in itertools.product(range(1,4),(1,3,6),range(20)):
  b=generate(seed,level,pairs);s=state(b);moves=[]
  while s['target']:
   assert o.target(b,s)==s['target'];counts['remaining_list_target_cases']+=1
   valid=[(i,j) for i,j in itertools.product(*s['remaining']) if score(offspring(b['animals'][i]['genes'],b['animals'][j]['genes']),s['target'])==4]
   # Deliberately prefer a different valid pair from the generator's witness.
   i,j=valid[-1]
   out=o.outcome(b,s,[i,j]);assert out['tags']==[i+100,j+100] and out['remaining']==[len(x)-1 for x in s['remaining']] and out['selected']==[0,0] and len(out['events'])==1,out;counts['native_success_lifecycle_cases']+=1
   place(b,s,i,0);r=place(b,s,j,1);assert r['result']=='correct';moves.append([i,j])
  assert len(s['passed'])==2*pairs and s['wrong']==0;counts['complete_model_witnesses']+=1
  witnesses.append(dict(level=level,pairs=pairs,seed=seed,moves=moves))
 for kids,target in [([0,0,1,1],[0,0,1,1]),([0,0,0,0],[1,1,1,1]),([0,1,2,0],[1,1,2,0])]:
  for old in range(8):
   new,events=o.wrong(kids,target,old);is_wrong=score(kids,target)<4;assert new==old+int(is_wrong) and len(events)==int(is_wrong);counts['native_wrong_counter_cases']+=1
 # A failed experiment consumes one turn, keeps both parents, and cannot be repeated without lifting/replacing.
 for level in (1,2,3):
  b=generate(4,level);s=state(b);bad=next((i,j) for i,j in itertools.product(*s['remaining']) if score(offspring(b['animals'][i]['genes'],b['animals'][j]['genes']),s['target'])<4)
  for _ in range(b['max_wrong']):
   remove(s,0);remove(s,1);place(b,s,bad[0],0);r=place(b,s,bad[1],1);assert r['result']=='wrong'
  remove(s,0);assert place(b,s,bad[0],0)['result']=='invalid';counts['model_limit_cases']+=1
 report=dict(status='passed',counts=dict(counts),sources=sources(),scope='Original generator arithmetic, incoming list consumption, allele generation, offspring, multiset validator and remaining-list target selection. Original success list removal, selected-stone clearing, port-tag emission and wrong-counter callback fragments also checked. Presentation constructors and external event transport omitted; Python settled lifecycle separately tested.',hooks=['Allocator/free and cleanup','413141→413208 gene display setup skipped','413315→41344c visual character construction/callbacks replaced with exact trait storage; native linked-list append retained','41361b→41367f presentation/initial target skipped; target tested independently','4147ca→414856 target presentation skipped after original calculation','Success callback presentation/animation functions stubbed; original list removal and tag writes retained; sobPass captured','Wrong fragment original 4150cc through 415126; list presentation operation 416d80 stubbed'],failures=[])
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'native-validation.json').write_text(json.dumps(report,indent=2)+'\n');(OUT/'solution-witnesses.json').write_text(json.dumps(witnesses,indent=2)+'\n');return report

def export():
 src=sources();OUT.mkdir(parents=True,exist_ok=True)
 from spec_io_mps import decode
 decoded=decode(ROOT/'local/discs/island-odyssey/HD/scripts/z3a7.mps');(OUT/'decoded-script.json').write_text(json.dumps(decoded,indent=2)+'\n')
 b=EXE.read_bytes();table=lambda addr,n:list(struct.unpack_from('<'+str(n)+'h',b,addr-0x400000))
 genes=[[a,a] for a in range(3)]+[[a,(a+1)%3] for a in range(3)]
 crossing=[dict(left=a,right=c,offspring=offspring(a,c),counts=[offspring(a,c).count(i) for i in range(3)]) for a,c in itertools.product(genes,repeat=2)]
 (OUT/'inheritance-table.json').write_text(json.dumps(crossing,indent=2)+'\n')
 tables=dict(attribute_descriptors=dict(va='0x451cc0',file_offset=0x51cc0,records=[list(struct.unpack_from('<3I',b,0x51cc0+12*i)) for i in range(3)]),parent_positions=dict(va='0x44f9f8',file_offset=0x4f9f8,xy=table(0x44f9f8,24)),gene_resource_bases=dict(va='0x44fae0',file_offset=0x4fae0,values=table(0x44fae0,6)),wheel_resource_bases=dict(va='0x44faec',file_offset=0x4faec,values=table(0x44faec,3)),max_wrong=LIMITS)
 (OUT/'native-tables.json').write_text(json.dumps(tables,indent=2)+'\n')
 report=OUT/'native-validation.json';validation=json.loads(report.read_text()) if report.exists() else dict(status='not_run')
 levels=[dict(level=l,target_attribute='feet' if l<3 else 'tail',attribute_index=1 if l<3 else 2,show_genes=l==1,max_wrong_by_pair_count=[x[l-1] for x in LIMITS],mathematics='Three-allele cyclic dominance; Cartesian product of parental allele pairs; offspring histogram matching.',information='Two alleles revealed when a parent is placed on its stone.' if l==1 else 'Only dominant phenotype initially visible; each parent has two possible genotypes. Predicted four offspring reveal information after an attempted pair.',difference='Direct computation using revealed genes.' if l==1 else 'Hidden genotype inference with same budget as level 1.' if l==2 else 'Same algebra/inference as level 2, using tails and reducing wrong budget for 3–6 pairs.') for l in (1,2,3)]
 spec=dict(schema_version=1,game='island-odyssey',id='island-odyssey-z3a7',name='Barn',
 state=dict(animals='Two ordered sides of p animals, 1<=p<=6. Each record holds original token tag, side, phenotype traits [type,feet,tail], primary/secondary target alleles and selected stone.',target='Four offspring phenotypes; comparison ignores their order.',counters='Wrong attempts persist across successful pairs; round index = initial pair count minus remaining left count.',information='Internal alleles remain fixed throughout puzzle; rendering may hide them.'),
 inputs=dict(levels=[1,2,3],incoming='Normal mode uses first 2*floor(min(tokenCount,12)/2) port tokens in iteration order; alternating left/right. Practice generates 12 animals. Valid supplied traits preserved; missing/invalid script traits become -1 and are sampled.',odd_token_count='An odd last token is not included in a pair. With fewer than two tokens MPS does not invoke generation.',seed='MSVCRT state at generator entry, not a full-session seed.'),
 actions=dict(place='Put an unpassed animal on its own side’s empty stone. Both stones occupied triggers one comparison. Wrong-side, occupied-stone and exhausted-budget drops are invalid.',remove='Lift an animal from a stone to change the experiment; removal itself consumes no wrong attempt.',experiment='No separate submit button; replacing a parent while the opposite stone remains occupied makes a new attempted pair. A repeated wrong pairing costs another mistake.',go='Normal mode Go becomes available after first successful pair; retains exactly those passed animals.'),
 feedback=dict(dominance='equal stays equal; 0 dominates 1, 1 dominates 2, 2 dominates 0.',offspring_order='[D(L0,R0), D(L1,R0), D(L0,R1), D(L1,R1)]',one_parent='L1 reveals the two genes on the stone. Normal pool prediction requires two parents. The offspring helper supports missing-parent repetition, but live single-parent preview is gated by global 0x4531f8, zero in the shipped BSS and with no write found in this executable.',match_score='sum(min(predictedCount[v],targetCount[v])) over v=0,1,2. Score 4 passes; code computes 0..4 but does not establish a displayed numeric score.',wrong='Both parents remain available and selected; pool shows prediction; wrong counter increments; genes do not change.'),
 success=dict(pair='Any pair producing the target multiset passes; original two port tags are emitted. Both are removed permanently from their side lists.',next_target='After removing actual chosen parents, use the precomputed next removal ordinal on each current remaining list, then calculate their four offspring. No new random draws.',solvability='Every target has a remaining-pair witness by construction. Any accepted pair preserves this property; target ordinals stay valid because each side loses exactly one.',completion='All p pairs can be rescued. Script full-success speech requires moved >= original capped token count; an odd unpaired token prevents that speech condition. Progression correctGuess/autoLevel requires moved>11, so only 12 passed triggers it.'),
 failure=dict(max_wrong_by_pairs=LIMITS,limit_semantics='Only nonmatching two-parent experiments consume budget. At max wrong, no further valid stone placement; native outOfTurns notification occurs when a selected parent is subsequently picked up/dropped. Pool depletion is attempt driven, not elapsed time.',partial='Passed pairs persist. Unpassed parents remain in the puzzle; they are not consumed by a wrong pairing. Go requires at least one passed pair.',no_pairs='No native puzzle generated when floor(tokenCount/2)==0.'),
 difficulty_levels=levels,
 generation=dict(status='independent Python port with isolated original-function differential parity',entry_va='0x4130b0',signature='thiscall generatePuzzle(pairs,targetAttribute,showGenes,maxWrong)',script_selector='MPS 1644–1658: floor token pairs, exact table, target [1,1,2], show [1,0,0].',steps=['For side 0 then side 1, draw p ordinals rand()%(p-i), i=0..p-1. Modulo 1 still consumes a draw.','For each i=0..p-1, create left then right animal, taking next queued incoming traits/tag or defaults [-1,-1,-1].','For attribute type/feet/tail in that order, sample each missing trait rand()%[1,3,3]. Known traits consume no draw.','Set primary allele to visible target phenotype. Set secondary=(primary+rand()%2)%3. If secondary==primary, draw once more and replace it with (primary+rand()%2)%3; no further rejection.','Append records to original ordered side lists; physical positions use fixed executable table.','For round r choose orders[side][r] in current remaining side list; form offspring. Target presentation rotation does not alter multiset.'],rng='Exact MSVCRT word sequence/call order including missing-trait branches, modulo-1 draws and optional second allele draw.',genotypes='Exactly six target genotypes: (a,a) and (a,a+1 mod3). Under independent unbiased binary draws allele branch gives homozygote 1/4 and heterozygote 3/4; seeded MSVCRT output itself is deterministic.',debug='Cheat/debug XML loader 0x4136a0 is a separate path; normal/practice generator only is specified and tested.'),
 assets=dict(roots=['assets/z3a7','assets/z3a7cd'],background_id=21000,trait_descriptor_va='0x451cc0',tables='local/analysis/island-odyssey-barn/native-tables.json',inheritance_table='local/analysis/island-odyssey-barn/inheritance-table.json',bindings='Gene resource base at 0x44fae0 indexed by 3*side+targetAttribute; add allele plus trait-count offset for distinct second gene. Wheel base at 0x44faec indexed targetAttribute. Source resource/PNG provenance remains in local/derived/island-odyssey manifests.'),
 evidence=dict(sources=src,manual_pdf_pages=[27,28,38],native=dict(generator='0x4130b0–0x413691',ordinal_draws='0x4142f0–0x41435d',genotypes='0x4146c0–0x414723',next_target='0x414750–0x41485d',offspring='0x4149e0–0x414ac4',dominance='0x414b80–0x414bae',multiset_match='0x414bc0–0x414c42',drop_wrong_increment='0x4150be–0x415126',legal_stone='0x41556f–0x415688',success_remove_and_port_tags='0x415d30–0x415f4c'),file_offset_rule='For listed source executable addresses, file offset = VA - 0x400000.',script='MPS 1633–1707 setup/incoming; 1708–1716 token move; 1751–1823 success, wrong and out-of-turns handlers.'),
 validation=dict(report=str(report.relative_to(ROOT)),sha256=hashlib.sha256(report.read_bytes()).hexdigest() if report.exists() else None,result=validation,model='tools/spec_io_barn.py',witnesses='local/analysis/island-odyssey-barn/solution-witnesses.json'),
 open_questions=['External TCX animation scheduling, physical dragging geometry and complete script event transport are outside the settled model; asynchronous feedback ordering is documented from callbacks but no whole-game execution is claimed.','Cheat/debug XML round-trip path is preserved in original source but is not a normal difficulty branch and is not ported.','No claim that finite wrong budgets permit guaranteed rescue with hidden information for every supplied party; construction guarantees a solution with known genes, not an error-free discovery strategy.'],
 completeness=dict(mathematical_rules='complete',normal_generator='complete_at_entry_seed',difficulty_branches='all_three',settled_lifecycle='complete_with_original_success_and_wrong_callback_checks',runtime_ui='excluded',full_game_parity=False))
 p=ROOT/'local/specs/island-odyssey/barn.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(spec,indent=2)+'\n');return spec

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--validate',action='store_true');p.add_argument('--export',action='store_true');p.add_argument('--seed',type=int);p.add_argument('--level',type=int,default=1);a=p.parse_args()
 if a.validate:print(json.dumps(validate(),indent=2))
 if a.export:export();print('Exported Barn spec and provenance.')
 if a.seed is not None:print(json.dumps(generate(a.seed,a.level),indent=2))
