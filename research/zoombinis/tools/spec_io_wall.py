#!/usr/bin/env python3
"""Recovered Island Odyssey Wall generation/gameplay, with bounded x86 oracle."""
from pathlib import Path
import argparse, hashlib, json, struct
from island_generator import MsvcrtRandom
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'local/analysis/island-odyssey-wall'
PARAMETERS={1:dict(glyphs=48,length=4,cluster=True,wrong_limit=5),2:dict(glyphs=56,length=4,cluster=False,wrong_limit=3),3:dict(glyphs=48,length=3,cluster=False,wrong_limit=2)}
SOURCE_HASHES={'HD/Win/Zoombinis Island Odyssey.exe':'619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2','HD/scripts/z3a2.mps':'32abe7d687a558d2d800d8558a5b9338da1158ca094442c9c9d919ddf84557db','HD/scripts/z3a2.xml':'cc3259c0224f948a4515ddb811e8d085fc7eab1a7bacca720fd4760281af201a'}


def sources():
    result=[]
    for relative,expected in SOURCE_HASHES.items():
        path=ROOT/'local/discs/island-odyssey'/relative
        actual=hashlib.sha256(path.read_bytes()).hexdigest()
        if actual!=expected:raise ValueError(f'Unrecognized source: {path}')
        result.append(dict(path=str(path.relative_to(ROOT)),sha256=actual))
    return result


def positions(board):
    p=board['parameters'];width=p['glyphs']//2
    return [r*width+c for r in range(2) for c in range(0,width-p['length']+1,p['length'] if p['cluster'] else 1)]


def matches(board,tile,start):
    return sum(a==board['mapping'][b] for a,b in zip(board['tiles'][tile],board['glyphs'][start:start+board['parameters']['length']]))


def initial_state(board,tokens=12):
    if not 1<=tokens<=12:raise ValueError('Normal playable incoming group is1..12; empty scene has no puzzle')
    return dict(tokens=tokens,passed=0,wrong=0,placements={},solved=[],ended=False)


def place(board,state,tile,start):
    """Discrete placement; start=None means return tile to floor. No rotation."""
    p=board['parameters'];length=p['length']
    if state['ended'] or tile in state['solved']:return 'disabled'
    if not 0<=tile<12:raise ValueError('Unknown tile')
    previous=state['placements'].pop(tile,None)
    occupied={k for other,s in state['placements'].items() for k in range(s,s+length)}
    if start is None:return 'floor'
    if start not in positions(board) or any(k in occupied for k in range(start,start+length)):
        if previous is not None:state['placements'][tile]=previous
        return 'invalid-drop'
    state['placements'][tile]=start
    count=matches(board,tile,start)
    if count==length:
        state['solved'].append(tile);state['passed']+=1
        state['ended']=state['passed']>=state['tokens']
        return 'solved'
    state['wrong']+=1
    state['ended']=state['wrong']>=p['wrong_limit']
    return f'wrong:{count}' if p['cluster'] else 'wrong'


def generate(seed,level):
    p=PARAMETERS[level];g=p['glyphs'];length=p['length'];width=g//2
    rng=MsvcrtRandom(seed,True)
    def rand(n,label):return rng.rand(label)%n
    def shuffle(values,label):
        for _ in range(len(values)):
            a,b=rand(len(values),label),rand(len(values),label)
            values[a],values[b]=values[b],values[a]
    glyphs=list(range(10))+[-1]*(g-10)
    for i in range(10):
        j=rand(g,'guaranteed-glyph-position');glyphs[i],glyphs[j]=glyphs[j],glyphs[i]
    for i in range(g):
        if glyphs[i]<0:glyphs[i]=rand(10,'fill-glyph')
    mapping=list(range(10));shuffle(mapping,'substitution-map')
    starts=[i*length for i in range(12)];copies=[]
    extra=(g-12*length)//2
    if extra>0:
        markers=[];starts=[]
        for row in range(2):
            gaps=[0]*7
            for _ in range(extra):gaps[rand(7,'gap-location')]+=1
            for i,count in enumerate(gaps):
                markers.extend([1]*count)
                if i<6:
                    starts.append(len(markers));markers.extend([2]+[3]*(length-1))
        assert len(markers)==g
        sources=list(range(12));shuffle(sources,'copy-source-permutation')
        sources=[starts[i] for i in sources[:3]]
        for start in sources:markers[start:start+length]=[4]+[5]*(length-1)
        for source in sources:
            ranges=[]
            for row in range(2):
                start=pos=row*width;count=0;end=start+width
                while pos<end:
                    if markers[pos]==4:
                        if count>=length:ranges.append((start,count-length+1))
                        pos+=length;start=pos;count=0
                    else:
                        count+=markers[pos]!=2;pos+=1
                if count>=length:ranges.append((start,count-length+1))
            rank=rand(sum(n for _,n in ranges),'copy-destination')+1
            for start,n in ranges:
                if rank<=n:break
                rank-=n
            pos=start
            while rank:
                while markers[pos]==2:pos+=1
                rank-=1;pos+=1
            target=pos-1
            for k in range(length):glyphs[target+k]=glyphs[source+k]
            markers[target:target+length]=[4]+[5]*(length-1)
            copies.append(dict(source=source,target=target,ranges=ranges))
    core_rng=dict(calls=rng.calls,state=rng.state)
    floor=list(range(12));shuffle(floor,'floor-permutation')
    return dict(seed=seed,level=level,parameters=p,glyphs=glyphs,mapping=mapping,starts=starts,
                tiles=[[mapping[x] for x in glyphs[s:s+length]] for s in starts],floor=floor,
                copies=copies,core_rng=core_rng,final_rng=dict(calls=rng.calls,state=rng.state),
                rng_values=[x['value'] for x in rng.trace])


class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        self.m=m=NativeOracle('island-odyssey');m.uc.mem_map(0,4096)
        self.obj=m.alloc(0x500);self.rng=MsvcrtRandom(1,True)
        m.hook_import('rand',lambda m:self.rng.rand('native-rand'))
        m.hook(0x43e78a,lambda m:m.alloc(m.arg(0)))
        m.hook(0x43e7a0,lambda m:0)
        m.hook(0x426080,lambda m:0) # clear previous display objects, no prior scene
    def run(self,seed,level):
        from unicorn.x86_const import UC_X86_REG_EBX
        m=self.m;p=PARAMETERS[level];self.rng=MsvcrtRandom(seed,True)
        m.write(self.obj,b'\0'*0x500)
        for off,val in [(0x408,10),(0x40c,p['glyphs']),(0x410,2),(0x414,p['length']),(0x418,12),(0x41c,int(p['cluster']))]:m.write_u32(self.obj+off,val)
        m.call(0x425900,ecx=self.obj,stop_at=0x425a37)
        def arr(addr,count):return list(struct.unpack('<'+'I'*count,m.read(addr,4*count)))
        return dict(glyphs=arr(self.obj+0x108,p['glyphs']),mapping=arr(self.obj+0x3a8,10),
                    starts=arr(m.u32(self.obj+0x3d0),12),floor=arr(m.reg(UC_X86_REG_EBX),12),
                    final_rng=dict(calls=self.rng.calls,state=self.rng.state),rng_values=[x['value'] for x in self.rng.trace])


def validate(samples):
    sources();oracle=Oracle();cases=[]
    for level in (1,2,3):
        for seed in list(range(samples))+[0x7fffffff,0x80000000,0xffffffff]:
            model=generate(seed,level);native=oracle.run(seed,level)
            checks={k:native[k]==model[k] for k in native}
            if not all(checks.values()):
                OUT.mkdir(parents=True,exist_ok=True);(OUT/'mismatch.json').write_text(json.dumps(dict(model=model,native=native,checks=checks),indent=2))
                raise AssertionError((seed,level,checks))
            cases.append(dict(seed=seed,level=level,rng_calls=model['final_rng']['calls'],board_sha256=hashlib.sha256(struct.pack('<'+'I'*len(model['glyphs']),*model['glyphs'])).hexdigest()))
    m=oracle.m;tile=m.alloc(0x110);match_cases=0;witness_cases=0;legality_cases=0
    for level in (1,2,3):
        for seed in range(5):
            board=generate(seed,level);oracle.run(seed,level);length=board['parameters']['length']
            m.write_u32(tile+0xe4,length)
            for t,values in enumerate(board['tiles']):
                m.write(tile+0xd4,struct.pack('<'+'I'*length,*values))
                for start in positions(board):
                    m.write_u32(tile+0xe8,start)
                    got=m.call(0x427e70,[tile],ecx=oracle.obj)
                    assert got==matches(board,t,start),(seed,level,t,start,got)
                    match_cases+=1
            for tokens in (1,5,12):
                state=initial_state(board,tokens)
                for t in range(tokens):assert place(board,state,t,board['starts'][t])=='solved'
                assert state['ended'] and state['passed']==tokens and state['wrong']==0
                witness_cases+=1
            state=initial_state(board)
            assert place(board,state,0,board['starts'][0])=='solved'
            assert place(board,state,0,None)=='disabled'
            assert place(board,state,1,board['starts'][0])=='invalid-drop'
            assert state['wrong']==0
            # All nonsolved placements persist and can be lifted without another penalty.
            wrong=next(s for s in positions(board) if matches(board,1,s)<length and not set(range(s,s+length))&set(range(board['starts'][0],board['starts'][0]+length)))
            for n in range(board['parameters']['wrong_limit']):
                assert place(board,state,1,wrong).startswith('wrong')
                if not state['ended']:assert place(board,state,1,None)=='floor'
            assert state['ended'] and state['wrong']==board['parameters']['wrong_limit']
            legality_cases+=1
    result=dict(status='passed',generator_cases=len(cases),native_match_cases=match_cases,model_solution_witness_cases=witness_cases,model_action_scenarios=legality_cases,source_exe_sha256=oracle.m.sha256,cases=cases,
                native_range='0x425900-0x425a37 including full core 0x426210',
                hooks=['Previous display cleanup0x426080 no-op in zeroed isolated object','new/delete memory-only allocator','External rand MSVCRT-compatible arithmetic'],
                scope='Exact glyphs, substitution, original tile starts, floor permutation and RNG values; stops before display object construction. Full original match predicate0x427e70 runs with no predicate hooks. Action scenarios use model translated from native drop handler and MPS scene rules, not an emulated UI.')
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'native-validation.json').write_text(json.dumps(result,indent=2)+'\n')
    return result


def export_spec():
    from spec_io_mps import decode
    evidence=sources();script=decode(ROOT/'local/discs/island-odyssey/HD/scripts/z3a2.mps')
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'decoded-script.json').write_text(json.dumps(script,indent=2)+'\n')
    report_path=OUT/'native-validation.json'
    report=json.loads(report_path.read_text()) if report_path.exists() else None
    levels=[]
    for level,p in PARAMETERS.items():
        levels.append(dict(level=level,**p,rows=2,values=10,tile_count=12,
            possible_empty_board_starts=len(positions(generate(1,level))),
            extra_wall_glyphs=p['glyphs']-12*p['length'],deliberate_copies=0 if level==1 else 3,
            required_insight=['Infer an unknown bijection from equality patterns; count-only feedback supports hypothesis testing.',
                'Infer the same bijection without feedback; choose nonoverlapping windows before irreversible acceptance.',
                'Three-character windows reveal fewer equality constraints; twelve unused glyph cells create more plausible placements and only two wrong guesses remain.'][level-1]))
    spec=dict(schema_version=1,game='island-odyssey',id='island-odyssey-z3a2',name='The Wall',
        state=dict(mathematical_object='Two words over ten glyphs, a hidden bijection to ten tile symbols, and twelve ordered fixed-length tile words.',
            dynamic=['Tile positions: floor or consecutive cells in one row','Occupied cells including wrong placed tiles','Locked solved tiles','Passed token count','Wrong-placement count'],
            native_layout={'glyphs':'+0x108','occupancy':'+0x1e8 (-1 empty)','substitution':'+0x3a8','original_starts_ptr':'+0x3d0','parameters':'+0x408..0x41c'},
            tile_layout={'symbols':'+0xd4','length':'+0xe4','start':'+0xe8 (-1 floor)','matching_count':'+0xec'}),
        inputs=dict(level=[1,2,3],incoming_tokens='Clamp port tokenCount to 12; practice mode uses 12; zero incoming tokens skips generation.',rng='MSVCRT rand state at generator entry; no local reseed.'),
        actions=[dict(name='Place',rule='Pick an unlocked tile, lift its old occupancy, then place without rotation or reflection in a legal empty consecutive row window. Level 1 starts must be multiples of4. Higher levels allow every integer start fitting the row.'),
            dict(name='Rearrange',rule='Wrong placed tiles remain movable. Floor rearrangement, pickup and drops outside a valid wall slot do not increment wrong count. Invalid occupied drops return to previous position; floor-region drops can leave tile on floor.'),
            dict(name='Leave',rule='After one Zoombini passes, Go becomes enabled; leaving can preserve partial passage.')],
        feedback=dict(match_predicate='sum(tile[k] == map[glyph[start+k]]) for k=0..length-1',
            level1='The number of correct corresponding positions is shown by flashing lights, without identifying which positions.',
            levels2_3='No match-count lights. Full equality accepts the tile; all other legal placements signal wrong.',
            success_animation='Accepted tile becomes untouchable, glyph animations play, door admits one Zoombini.'),
        success=dict(per_tile='Every position matches the hidden bijection; no global packing check is applied.',round='passed >= incoming_tokens. Correct placements consume no wrong allowance.',
            progression='correctGuess and autoLevel are called only after 12 tiles pass, not merely all of a smaller incoming group.',
            solvability='Original generator starts are pairwise disjoint and form an explicit12-tile witness. Alternate accepted placements may destroy remaining solvability; native code does not detect or reject that dead end.'),
        failure=dict(limit='Wrong count increments on every valid wall placement whose match count is below tile length. The5th/3rd/2nd wrong placement disables input and closes the door.',
            partial='Already passed tokens remain passed. Door closure does not retract successes.',
            no_other_limit='No time limit, move limit on rearrangement, or requirement to fill unused cells.',
            dead_end='An irreversible locally correct placement can block all-tile completion while still allowing partial success; original scene does not automatically terminate from packing infeasibility.'),
        difficulty_levels=levels,
        generation=dict(status='decoded_and_differentially_verified',implementation='tools/spec_io_wall.py:generate',
            native_entry='0x425900',native_core='0x426210-0x42699e',entry_signature='void RGlyphGame::generatePuzzle(); parameters in object, no stack args',
            ordered_steps=['Seed glyph array with 0..9 then holes; for each of first 10 cells swap with rand()%glyph_count.',
                'Fill holes ascending using rand()%10; exactly glyph_count total random calls through this step.',
                'Identity substitution is scrambled by 10 random-pair swaps, two rand()%10 calls each.',
                'Level 1 uses starts 0,4,...,44. Higher levels distribute extra_per_row glyphs among seven gaps using one rand()%7 call per extra, then insert six tiles per row.',
                'At higher levels shuffle 0..11 using12 random-pair swaps. Reserve first three source windows.',
                'For each source enumerate candidate ranges in ascending row order, excluding reserved blocks; count positions excluding authored tile starts. Draw rand()%total_weight+1 and copy the source into the selected consecutive window. Mark destination reserved. Exact unusual range weighting is implemented, not replaced by uniform valid-window choice.',
                'Generate each tile by mapping the final glyph word at its original start. Shuffle floor positions by 12 random-pair swaps.'],
            rng_calls={'1':92,'2':135,'3':131},templates='No authored normal-play XML templates; optional debug file path is separate.',
            distribution='Modulo reduction and repeated-pair shuffles are preserved exactly, including self-swaps; no rejection for unique solutions or difficulty.',
            ordering_note='The three copied windows intentionally create repeated matches. Generator witness remains available even though some alternative placements create dead ends.'),
        assets=dict(roots=['local/derived/island-odyssey/assets/z3a2','local/derived/island-odyssey/assets/z3a2cd'],
            background=12000,tile_symbols=12400,glyphs=12401,lights=12410,tiles={'3':12431,'4':12425},highlight={'3':12433,'4':12429},
            xml='HD/scripts/z3a2.xml /Z3A2/Help/Level1..3; /Scene/background; /Speech/{Correct,PartCorrect}',
            manifest='local/derived/island-odyssey/assets-manifest.json; original archive offsets, hashes, decoded frames retained there.'),
        evidence=evidence+[
            dict(kind='MPS',instructions='1552-1576,1679-1740',meaning='Parameters, practice/input clamp, generator invocation, wrong budget.'),
            dict(kind='MPS',instructions='1811-1849,1970-2052',meaning='Attempt count, token passing, termination and12-tile progression.'),
            dict(kind='native',va='0x427ee0-0x42822b',meaning='Quantized target selection and occupancy legality.'),
            dict(kind='native',va='0x427e70-0x427ed2',meaning='Complete positional match count.'),
            dict(kind='native',va='0x4282c0-0x42854c,0x428720-0x428838',meaning='Drop success/wrong/invalid branches, locking and occupancy updates.'),
            dict(kind='native',va='0x424f40-0x424fbb',meaning='Level 1 match-count lights controlled by clustering.'),
            dict(kind='manual',pdf_pages=[18,19,34])],
        validation=dict(report='local/analysis/island-odyssey-wall/native-validation.json',report_sha256=hashlib.sha256(report_path.read_bytes()).hexdigest() if report else None,
            counts={k:v for k,v in (report or {}).items() if k.endswith('_cases') or k.endswith('_scenarios')},status=(report or {}).get('status','not_run'),
            reproduction='research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_wall.py --validate --samples 100; then --export',
            boundary='Original generator and match functions; MPS/native-derived discrete placement and scene rules are model-tested. OS pixel hit-testing/animation timing and a full game session are not executed.'),
        open_questions=['External full-session RNG initialization/history is outside the puzzle-entry contract.','Exact screen-coordinate hitboxes and animation timing are outside this mathematical specification.'],
        completeness=dict(mathematical_gameplay='complete',generation='complete_at_entry_rng_boundary',all_shipped_difficulties=True,full_game_runtime_parity=False))
    output=ROOT/'local/specs/island-odyssey/wall.json';output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(spec,indent=2)+'\n')
    return dict(spec=str(output),completeness=spec['completeness'])

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--validate',action='store_true');p.add_argument('--export',action='store_true');p.add_argument('--samples',type=int,default=100);p.add_argument('--seed',type=int,default=1);p.add_argument('--level',type=int,default=1)
    a=p.parse_args();r=export_spec() if a.export else validate(a.samples) if a.validate else generate(a.seed,a.level)
    print(json.dumps({k:v for k,v in r.items() if k!='cases'},indent=2))
