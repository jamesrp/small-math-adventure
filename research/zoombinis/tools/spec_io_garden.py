#!/usr/bin/env python3
"""Garden: exact generator and stateful dimension binding; isolated x86 checks."""
from pathlib import Path
import argparse,hashlib,itertools,json,struct
from island_generator import MsvcrtRandom
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'local/analysis/island-odyssey-garden'
EXE=ROOT/'local/discs/island-odyssey/HD/Win/Zoombinis Island Odyssey.exe'
EXPECTED_EXE='619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2'
EXPECTED_MPS='c2bc69ff945b92330a31da1e1a5906fe9df9493fe83710e00a6bba8e33857578'
EXPECTED_XML='58fe4d6484200af35dd443d6ae05ad0dc0b1c078251b86198f56ee4e25558803'
TRAITS=['flower','stem','leaf','root'];NIBBLES=[15,240,3840,61440]

def sources():
    paths=[EXE,ROOT/'local/discs/island-odyssey/HD/scripts/z3a5.mps',ROOT/'local/discs/island-odyssey/HD/scripts/z3a5.xml']
    records=[dict(path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in paths]
    if [r['sha256'] for r in records]!=[EXPECTED_EXE,EXPECTED_MPS,EXPECTED_XML]:raise ValueError('Unknown source revision')
    return records

def generate(seed,level,tokens=12):
    if level not in (1,2,3) or not 1<=tokens<=12:raise ValueError('Invalid normal-play inputs')
    rng=MsvcrtRandom(seed,True)
    plants=[[rng.rand('plant-'+str(i)+'-'+TRAITS[a])%4 for a in range(4)] for i in range(12)]
    col=rng.rand('column-attribute')%4
    row=[a for a in range(4) if a!=col][rng.rand('row-attribute')%3]
    section=[a for a in range(4) if a not in (col,row)][rng.rand('section-attribute')%2]
    axes=[col,row if level>1 else col,section if level>2 else col]
    return dict(seed=seed,level=level,tokens=tokens,plants=plants,axes=axes,rng_values=[v['value'] for v in rng.trace],final_rng=dict(calls=rng.calls,state=rng.state))

def coordinates(level):return list(itertools.product(range(4),range(4 if level>1 else 1),range(4 if level>2 else 1)))
def value(plant):return sum(1<<(4*a+v) for a,v in enumerate(plant))
def ignored(axes):return 65535^sum(NIBBLES[a] for a in set(axes))
def initial_state(board):return dict(masks={c:65535 for c in coordinates(board['level'])},filled=set(),placed={},wrong=0,remaining=board['tokens'])
def propagation(level,axes,masks,filled,plant,coordinate):
    masks=masks.copy();ignore=ignored(axes);pv=value(plant)
    if any(not (((masks[coordinate]&pv)|ignore)&n) for n in NIBBLES):return False,masks,set(filled)
    fixed=pv|ignore;masks[coordinate]=fixed;filled=set(filled)|{coordinate}
    for c in masks:
        if c in filled:continue
        bits=masks[c]&((~fixed)|ignore)
        for dimension in range(level):
            if c[dimension]==coordinate[dimension]:
                n=NIBBLES[axes[dimension]];bits=(bits&~n)|(fixed&n)
        masks[c]=bits&65535
    return True,masks,filled

def place(board,state,plant,coordinate):
    if not 0<=plant<board['tokens']:raise ValueError('Plant is not active in this incoming group')
    if state['remaining']==0 or state['wrong']>=(5 if board['level']==1 else 10) or plant in state['placed']:return 'disabled'
    if coordinate not in state['masks']:return 'floor'
    ok,masks,filled=propagation(board['level'],board['axes'],state['masks'],state['filled'],board['plants'][plant],coordinate)
    if not ok:
        state['wrong']+=1
        # Original speech discriminator compares per-hole capacity with literal 12.
        return 'incorrectEmpty' if board['tokens']==12 and coordinate not in state['filled'] else 'incorrectFilled'
    state.update(masks=masks,filled=filled);state['placed'][plant]=coordinate;state['remaining']-=1
    return 'finished' if state['remaining']==0 else 'correct'

class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn.x86_const import UC_X86_REG_ECX,UC_X86_REG_ESI,UC_X86_REG_EBP
        self.regs=(UC_X86_REG_ECX,UC_X86_REG_ESI,UC_X86_REG_EBP);self.m=m=NativeOracle('island-odyssey');m.uc.mem_map(0,4096)
        self.obj=m.alloc(0x400);self.traits=m.alloc(16);self.answer=m.alloc(16);self.containers={c:m.alloc(0x200) for c in coordinates(3)}
        self.true=m.alloc(8,b'true\0');self.false=m.alloc(8,b'false\0');self.filled=set()
        m.hook_import('rand',lambda m:self.rng.rand('native'))
        m.hook_import('?getValue@RAnswer@@QAEHXZ',lambda m:m.u32(self.answer))
        m.hook_import('?setUserData@OMMultiTrinket@@QAEXPBD@Z',self.mark,pop=4)
        m.hook_import('?getUserData@OMMultiTrinket@@QBEPBDXZ',lambda m:self.true if m.reg(self.regs[0]) in self.filled else self.false)
        m.hook(0x424276,lambda m:1);m.hook(0x4244d8,lambda m:0)
        m.hook(0x424515,lambda m:1);m.hook(0x424526,lambda m:0)
    def mark(self,m):self.filled.add(m.reg(self.regs[0]));return 0
    def generator(self,seed,level):
        m=self.m;m.write(self.obj,b'\0'*0x400);m.write_u32(self.obj+0x334,level);self.rng=MsvcrtRandom(seed,True);plants=[]
        for i in range(12):
            m.call(0x422db0,[i]+[self.traits+a*4 for a in range(4)],ecx=self.obj)
            plants.append(list(struct.unpack('<4I',m.read(self.traits,16))))
        m.call(0x423310,ecx=self.obj)
        return dict(plants=plants,axes=list(struct.unpack('<3I',m.read(self.obj+0x354,12))),rng_values=[x['value'] for x in self.rng.trace],final_rng=dict(calls=self.rng.calls,state=self.rng.state))
    def propagate(self,level,axes,masks,filled,plant,coordinate):
        m=self.m;m.write_u32(self.obj+0x334,level);m.write_u32(self.obj+0x338,0);m.write_u32(self.obj+0x23c,self.answer);m.write_u32(self.answer,value(plant))
        self.filled={self.containers[c] for c in filled}
        for i,n in enumerate((4,4 if level>1 else 1,4 if level>2 else 1)):m.write_u32(self.obj+0x340+4*i,n)
        m.write(self.obj+0x354,struct.pack('<3I',*axes));m.write_u16(self.obj+0x362,ignored(axes))
        for c,v in masks.items():
            x,y,z=c;ptr=self.containers[c];m.write_u32(self.obj+0x13c+4*(x+4*y+16*z),ptr);m.write_u32(ptr+0x180,v)
        target=self.containers[coordinate];args=[0]*22;args[21]=target
        ok=bool(m.call(0x42403a,args,registers={self.regs[1]:self.obj,self.regs[2]:target}))
        return ok,{c:m.u32(self.containers[c]+0x180) for c in masks},{c for c in masks if self.containers[c] in self.filled}
    def empty_feedback(self,capacity):
        target=self.containers[(0,0,0)];self.m.write_u32(target+0x17c,capacity)
        return bool(self.m.call(0x424503,registers={self.regs[1]:self.obj,self.regs[2]:target}))

def validate(samples=100):
    sources();o=Oracle();counts=dict(generator_cases=0,native_propagation_cases=0,native_feedback_cases=0,solution_witnesses=0,model_rejection_limit_cases=0)
    for capacity in range(13):
        assert o.empty_feedback(capacity)==(capacity==12);counts['native_feedback_cases']+=1
    for level in (1,2,3):
        for seed in list(range(samples))+[0x7fffffff,0x80000000,0xffffffff]:
            b=generate(seed,level);n=o.generator(seed,level)
            assert all(b[k]==v for k,v in n.items()),(level,seed,n,b);counts['generator_cases']+=1
        for seed in range(10):
            b=generate(seed,level);s=initial_state(b)
            # Every destination for each incoming plant before committing a correct one.
            for i,p in enumerate(b['plants']):
                for c in s['masks']:
                    want=propagation(level,b['axes'],s['masks'],s['filled'],p,c)
                    got=o.propagate(level,b['axes'],s['masks'],s['filled'],p,c)
                    assert want==got,(level,seed,i,c,want,got);counts['native_propagation_cases']+=1
                # Identity value-to-coordinate maps give a complete constructive witness.
                c=tuple(p[b['axes'][d]] if d<level else 0 for d in range(3))
                assert place(b,s,i,c) in ('correct','finished')
            assert s['remaining']==0 and s['wrong']==0;counts['solution_witnesses']+=1
            s=initial_state(b);c=(0,0,0);assert place(b,s,0,c)=='correct'
            wrong=next((i,q) for i in range(1,12) for q in s['masks'] if not propagation(level,b['axes'],s['masks'],s['filled'],b['plants'][i],q)[0])
            for _ in range(5 if level==1 else 10):assert place(b,s,*wrong).startswith('incorrect')
            assert place(b,s,*wrong)=='disabled';counts['model_rejection_limit_cases']+=1
    result=dict(status='passed',counts=counts,source_exe_sha256=o.m.sha256,scope='Full normal-path trait and axis helpers in original order; original acceptance and entire constraint propagation block 0x42403a..0x424276 with return at reject branch 0x4244d8. External answer value and hole filled-string accessors are marshaled; mathematical decisions and 16-bit mask writes are original instructions.',hooks=['rand arithmetic supplied by MSVCRT model','RAnswer::getValue from supplied encoded plant','UserData get/set for filled flag','Return hooks after mathematical decisions before animation/UI effects'],reproduction='research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_garden.py --validate --samples 100')
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'native-validation.json').write_text(json.dumps(result,indent=2)+'\n');return result

def export_spec():
    from spec_io_mps import decode
    evidence=sources();OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'decoded-script.json').write_text(json.dumps(decode(ROOT/'local/discs/island-odyssey/HD/scripts/z3a5.mps'),indent=2)+'\n')
    raw=EXE.read_bytes();table_addresses={'hole':0x4503fc,'root':0x450408,'stem':0x450414,'leaf':0x450420,'flower':0x45042c,'rejection_limit':0x450744}
    bindings={k:dict(va=hex(va),file_offset=va-0x400000,levels=list(struct.unpack_from('<3I',raw,va-0x400000+4))) for k,va in table_addresses.items()}
    report_path=OUT/'native-validation.json';r=json.loads(report_path.read_text()) if report_path.exists() else {}
    spec=dict(schema_version=1,game='island-odyssey',id='island-odyssey-z3a5',name='The Garden',
        state=dict(mathematical_object='An injective assignment of four-valued plant attributes to coordinate values, with one, two or three selected distinct attribute axes.',
            traits=TRAITS,values_per_trait=4,initial='All holes allow every value (16-bit mask 0xffff). No trait value has a preassigned column, row or plot.',
            dynamic=['Allowed-value mask per hole','Whether each hole has accepted a plant','Irreversible planted items, movable unplanted items','Remaining active plants and rejection allowance'],
            encoding='Plant value=sum(1 << (4*attribute+value)). Four nibbles correspond to flower, stem, leaf, root.',
            native_layout={'level':'+0x334','dimensions':'+0x340,+0x344,+0x348','remaining':'+0x350','column_row_plot_attributes':'+0x354,+0x358,+0x35c','ignore_mask':'+0x362','remaining_rejections':'+0x37c','hole_ptrs':'+0x13c + 4*(column+4*row+16*plot)','hole_allowed_values':'+0x180 on each hole'}),
        inputs=dict(level=[1,2,3],tokens='Port token count clamped to 12. All twelve plants are generated; only the first incoming-count plants are made visible. No local practice-count override in this script.',rng='MSVCRT rand state at puzzle-generation entry; no local reseed.'),
        actions=[dict(name='Plant',rule='Choose an unplanted active plant and any hole. It is accepted iff every selected attribute value is still allowed by that hole. Multiple plants may share a hole when all selected values agree.'),
            dict(name='Arrange holding area',rule='Unplanted plants may be freely moved in the holding area. A non-hole drop returns/repositions the item without testing the planting constraint or spending a rejection.'),
            dict(name='Leave',rule='After one successful planting the script enables Go, retaining partial progress.')],
        feedback=dict(accepted='The plant sticks permanently. The chosen hole binds the selected values; every unfilled hole removes those values, then restores a selected value exactly when its coordinate agrees on that attribute axis. Already filled holes retain their fixed masks.',
            rejected='The plant bounces back to its previous holding position. With twelve incoming plants, speech distinguishes a previously empty hole from an occupied one. The native discriminator is capacity==12, so groups smaller than twelve also receive the filled-hole speech for empty holes. No mismatching feature is named.',
            first_move='Every hole accepts the first plant. The player chooses the initial value-to-coordinate assignments while the hidden attribute-to-axis choice is fixed.'),
        success=dict(per_plant='One token passes after an accepted plant.',round='All incoming active plants have been planted. Script emits progression on completion even with fewer than twelve tokens.',
            solvability='Every accepted placement extends consistent partial bijections on selected axes. Each partial bijection can be extended to a full permutation of four values; placing each remaining plant at those coordinates is a witness. Thus accepted placements cannot create a mathematical dead end. Identical selected tuples legitimately share a hole.'),
        failure=dict(limits={'1':5,'2':10,'3':10},trigger='Only incompatible hole placements spend an allowance; decrement occurs after the rejection/snap animation callback. At zero all plant input is disabled and Sunset speech fires.',partial='Previously planted tokens remain passed. Failed plants remain available until the rejection budget is exhausted.',timer='Sunset is an error counter, not elapsed real time.'),
        difficulty_levels=[dict(level=l,dimensions=[4,4 if l>1 else 1,4 if l>2 else 1],holes=4**l,hidden_axis_assignments=[4,12,24][l-1],irrelevant_attributes=4-l,rejection_limit=5 if l==1 else 10,
            insight=['Identify which one of four traits partitions plants into four groups. A freely chosen first placement establishes the coordinate labels.',
                'Identify an ordered pair of distinct traits and maintain two simultaneous row/column classifications; apparent similarity in irrelevant traits does not justify co-placement.',
                'Identify an ordered triple of traits and interpret plot as a third independent coordinate. The same row/column classification repeats across plots.'][l-1]) for l in (1,2,3)],
        generation=dict(status='decoded_and_differentially_verified',implementation='tools/spec_io_garden.py:generate',setup_entry='0x423620(level, tokens)',
            helpers={'plant':'0x422db0(index, flower_out, stem_out, leaf_out, root_out), thiscall','axes':'0x423310(), thiscall'},
            ordered_steps=['Always generate twelve plants in index order; for each draw flower, stem, leaf, root independently with rand()%4, for 48 calls total.',
                'Draw column attribute rand()%4. Enumerate the three remaining attribute indices ascending and choose rand()%3 for row. Enumerate the two remaining ascending and choose rand()%2 for plot.',
                'At level 1 overwrite both row and plot attribute with column; at level 2 overwrite plot with column. These overwrites do not remove RNG calls.',
                'Initially set every hole mask to 0xffff. Compute ignore mask as complement of the union of selected attribute nibbles. No value permutations, solvability filtering, duplicate rejection, or random plant layout.'],
            rng_calls=51,templates='Normal generation needs no authored input XML. Optional z3a5in.xml is a debug override; absent from the disc.',
            invariants='Four values per attribute and duplicates allowed. Appearance remains four-dimensional even at level 1; increasing levels select more of those existing attributes, rather than increasing plant vocabulary.'),
        assets=dict(roots=['local/derived/island-odyssey/assets/z3a5','local/derived/island-odyssey/assets/z3a5cd'],background=18000,bindings=bindings,trait_frames='Trait value 0..3 uses animation frame value+1. Each composite plant uses the level-specific flower, stem, leaf and root resources.',manifest='local/derived/island-odyssey/assets-manifest.json retains payload hashes and source archive offsets.'),
        evidence=evidence+[dict(kind='native',va='0x422db0-0x42330c',meaning='Per-plant generator; normal branch consumes four independent modulo-four draws.'),dict(kind='native',va='0x423310-0x4235ff',meaning='Distinct axis draws, lower-level overwrites and ignored nibble mask.'),dict(kind='native',va='0x423620-0x423e40',meaning='Hole initialization, twelve plants before axes, visible-count limit, resources and rejection table.'),dict(kind='native',va='0x42403a-0x424276',meaning='Acceptance and full empty-hole mask propagation.'),dict(kind='native',va='0x424497-0x424535,0x424710-0x424804',meaning='Remaining-plant success events and rejection countdown.'),dict(kind='MPS',instructions='1631-1643,1724-1736,1798-1885',meaning='Incoming count, passage, partial navigation, completion progression and rejection feedback.'),dict(kind='manual',pdf_pages=[24,36,37])],
        validation=dict(status=r.get('status','not_run'),counts=r.get('counts',{}),scope=r.get('scope'),report=str(report_path.relative_to(ROOT)),report_sha256=hashlib.sha256(report_path.read_bytes()).hexdigest() if r else None,reproduction='research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_garden.py --validate --samples 100; python3 research/zoombinis/tools/spec_io_garden.py --export'),
        open_questions=['Full-session RNG initialization/history is outside the entry-state contract. Pixel hit-testing, holding-area geometry and animation timing are not emulated.'],
        completeness=dict(mathematical_gameplay='complete',generation='complete_at_entry_rng_boundary',all_shipped_difficulties=True,full_game_runtime_parity=False))
    path=ROOT/'local/specs/island-odyssey/garden.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(spec,indent=2)+'\n')
    return dict(spec=str(path),completeness=spec['completeness'])

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--validate',action='store_true');p.add_argument('--export',action='store_true');p.add_argument('--samples',type=int,default=100);p.add_argument('--seed',type=int,default=1);p.add_argument('--level',type=int,default=1);a=p.parse_args()
    print(json.dumps(export_spec() if a.export else validate(a.samples) if a.validate else generate(a.seed,a.level),indent=2))
