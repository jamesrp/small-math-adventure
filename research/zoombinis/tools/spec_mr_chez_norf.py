#!/usr/bin/env python3
"""Source-guarded Chez Norf templates, clue records, generator and meal rules."""
import argparse, functools, hashlib, itertools, json, struct
from dataclasses import dataclass, field
from spec_mr_turtle_hurdle import ROOT, EXE, SHA, Rand, guard
OUT=ROOT/'local/analysis/mountain-rescue-chez-norf'
IDS=[11,12,13,14,21,22,23,24,31,32,33,34]
CLUE_TABLES=[0x4e1de0,0x4e0788,0x4dea50,0x4dc9a8,0x4d9460,0x4d5f18,0x4d24a8,0x4cdac0,0x4c90d8,0x4c46f0,0x4c1a40,0x4bdfd0]
INITIALIZERS=[0x448ad0,0x449130,0x449780,0x449f90,0x44a8a0,0x44b7c0,0x44c6f0,0x44d7c0,0x44ec90,0x450190,0x451650,0x4522f0]
FOODS=['sandwich','fish','salad','coffee','orange juice','milk','fruit pie','watermelon','ice cream']

class Assignments:
    """Restricted static evaluator for authored MOV/copy initialization, not x86 runtime."""
    def __init__(self):
        from capstone import Cs, CS_ARCH_X86, CS_MODE_32
        guard(); self.raw=EXE.read_bytes();self.mem=bytearray(0x180000)
        self.mem[:0xad000]=self.raw[:0xad000]; self.base=0x400000
        self.c=Cs(CS_ARCH_X86,CS_MODE_32);self.c.detail=True
        self.regs={k:0 for k in ['eax','ebx','ecx','edx','esi','edi','ebp','esp']}
        self.writes=[]; self.sources=set()
    def read(self,addr,n):
        assert self.base<=addr and addr+n<=self.base+len(self.mem)
        return bytes(self.mem[addr-self.base:addr-self.base+n])
    def write(self,addr,data,pc):
        assert self.base<=addr and addr+len(data)<=self.base+len(self.mem)
        self.mem[addr-self.base:addr-self.base+len(data)]=data;self.writes.append((pc,addr,len(data)))
    def run(self,start,stop_call=None):
        from capstone.x86 import X86_OP_REG,X86_OP_MEM,X86_OP_IMM
        pc=start
        def addr(op):
            q=op.mem
            return q.disp+(self.regs[self.c.reg_name(q.base)] if q.base else 0)+(self.regs[self.c.reg_name(q.index)]*q.scale if q.index else 0)
        def value(op):
            if op.type==X86_OP_IMM:return op.imm
            if op.type==X86_OP_REG:
                name=self.c.reg_name(op.reg)
                return self.regs.get(name, self.regs.get('e'+name,0)) & ((1<<(8*op.size))-1)
            self.sources.add(addr(op));return int.from_bytes(self.read(addr(op),op.size),'little')
        for count in range(20000):
            ins=next(self.c.disasm(self.raw[pc-self.base:pc-self.base+15],pc));pc+=ins.size
            op=ins.operands; name=ins.mnemonic
            if name=='mov':
                v=value(op[1])&((1<<(8*op[0].size))-1)
                if op[0].type==X86_OP_REG:self.regs[self.c.reg_name(op[0].reg)]=v
                else:self.write(addr(op[0]),v.to_bytes(op[0].size,'little'),ins.address)
            elif name=='xor':
                assert op[0].reg==op[1].reg;self.regs[self.c.reg_name(op[0].reg)]=0
            elif name.split()[-1] in ('movsd','movsw','movsb','stosd','stosw','stosb'):
                word=name.split()[-1];size={'d':4,'w':2,'b':1}[word[-1]]
                n=self.regs['ecx'] if name.startswith('rep ') else 1
                if word.startswith('movs'):
                    src=self.regs['esi'];data=self.read(src,n*size);self.sources.add(src);self.regs['esi']+=n*size
                else:data=(self.regs['eax']&((1<<(8*size))-1)).to_bytes(size,'little')*n
                self.write(self.regs['edi'],data,ins.address);self.regs['edi']+=n*size
                if name.startswith('rep '):self.regs['ecx']=0
            elif name=='jmp':pc=value(op[0])
            elif name in ('push','pop','nop'):pass
            elif name=='ret':return ins.address
            elif name=='call':
                assert value(op[0])==stop_call,(hex(ins.address),ins.op_str);return ins.address
            else:raise AssertionError((hex(ins.address),name,ins.op_str))
        raise AssertionError('Static assignment bound exceeded')

@functools.lru_cache(maxsize=1)
def authored():
    a=Assignments();result={}
    for tid,va,init in zip(IDS,CLUE_TABLES,INITIALIZERS):
        a.regs={k:0 for k in a.regs};a.writes=[];a.sources=set();end=a.run(init)
        records=[];i=0
        while (key:=struct.unpack('<4i',a.read(va+i*440,16)))[0]:
            data=a.read(va+i*440,440)
            records.append({'key':list(key),'text':data[16:166].split(b'\0')[0].decode('cp1252'),
              'stored_audio':data[166:424].split(b'\0')[0].decode('cp1252'),
              'metadata':list(struct.unpack_from('<4i',data,424)),
              'runtime_address':hex(va+i*440),'record_index':i,'sha256':hashlib.sha256(data).hexdigest()})
            i+=1
            assert i<100
        clue_class=a.raw[0x54200+tid-11];answer_class=a.raw[0x5466c+tid-11]
        clue_entry=struct.unpack_from('<I',a.raw,0x541cc+4*clue_class)[0]
        answer_entry=struct.unpack_from('<I',a.raw,0x54638+4*answer_class)[0]
        base=0x560000;a.write(base,bytes(0x28c),init);a.write(base+8,struct.pack('<9i',*range(9)),init)
        a.regs.update(esi=base,ecx=8,edx=tid,eax=clue_class)
        a.run(clue_entry,0x454220)
        a.regs.update(ecx=base);a.run(answer_entry,0xDEADBEEF)
        count=4 if tid<30 else 6
        result[tid]={'id':tid,'orders':[list(struct.unpack('<6i',a.read(base+0x44+n*24,24))) for n in range(count)],'clues':records,
          'provenance':{'source_sha256':SHA,'initializer_start':hex(init),'initializer_end':hex(end),'initializer_file_offset':init-0x400000,
             'runtime_table_address':hex(va),'runtime_record_size':440,'clue_assignment':hex(clue_entry),'answer_assignment':hex(answer_entry)}}
    return result


def generate(level,seed):
    assert level in (1,2,3)
    rng=Rand(seed);tid=level*10+1+rng.next(4);p=[]
    for base in (0,3,6):
        chosen=[]
        while len(chosen)<3:
            x=base+rng.next(3)
            if x not in chosen:chosen.append(x)
        p+=chosen
    t=authored()[tid]
    orders=[[p[x] if x<9 else x for x in row] for row in t['orders']]
    return {'level':level,'template':tid,'permutation':p,'orders':orders,'total_trays':[8,7,8][level-1],
      'quotas':[[2]*4,[2]*4,[2,2,1,1,1,1]][level-1],'rng_state':rng.state,'rng_trace':rng.trace}


def accepts(config,norf,meal):
    expected=config['orders'][norf][:3]
    return meal[0]==expected[0] and meal[1]==expected[1] and (meal[2]==expected[2] or (meal[2]==-1 and expected[2]==9))


def clue(config,norf):
    key=[norf+1]+config['orders'][norf][3:]
    matches=[r for r in authored()[config['template']]['clues'] if r['key']==key]
    assert len(matches)==1,(config['template'],key,len(matches))
    rec=dict(matches[0]);voice=norf+1+(2 if config['level']<3 else 0)
    audio=f'7-N{voice}-{config["template"]:2d}'
    for food in key[1:]:
        if food<9:audio+=f'-{"abc"[food//3]}{food%3+1}'
    if config['template']==13 and norf==2:audio+='-a0'
    if config['template']==33 and norf==1:audio+='-c0'
    rec['audio']=audio+'.wav';return rec


@dataclass
class Board:
    config:dict
    party_size:int=8
    trays_used:int=0
    served:set=field(default_factory=set)
    retained:int=0
    notes:list=field(default_factory=list)
    workspace:list=field(default_factory=list)
    selected:int|None=None
    def __post_init__(self):
        if not self.notes:self.notes=[[0]*len(self.config['orders']) for _ in range(9)]
        if not self.workspace:self.workspace=[[-1,-1,-1] for _ in self.config['orders']]
    @property
    def ended(self):return self.trays_used>=self.config['total_trays'] or len(self.served)==len(self.config['orders']) or self.retained>=self.party_size
    def mark(self,food,norf):
        if food//3==2 and self.config['level']==1:raise ValueError('Dessert unavailable')
        self.notes[food][norf]=(self.notes[food][norf]+1)%4
        return self.notes[food][norf]
    def prepare(self,tray,food):
        if self.ended or self.selected is not None:raise ValueError('Workspace unavailable')
        if food not in range(6 if self.config['level']==1 else 9):raise ValueError('Food unavailable')
        self.workspace[tray][food//3]=food
    def pickup(self,tray):
        if self.ended or self.selected is not None:raise ValueError('Pickup unavailable')
        meal=self.workspace[tray]
        if any(x==-1 for x in meal[:2 if self.config['level']==1 else 3]):raise ValueError('Incomplete meal')
        self.selected=tray
    def return_tray(self):
        self.selected=None
    def serve(self,norf,meal=None):
        if meal is None:
            if self.selected is None:raise ValueError('No selected tray')
            meal=self.workspace[self.selected][:]

        if self.ended or norf in self.served:raise ValueError('Norf unavailable')
        if meal[0] not in range(3) or meal[1] not in range(3,6) or (meal[2] not in range(6,9) and not(self.config['level']==1 and meal[2]==-1)):
            raise ValueError('Incomplete or invalid meal')
        self.trays_used+=1;self.selected=None;ok=accepts(self.config,norf,meal)
        if ok:
            self.retained=min(self.party_size,self.retained+self.config['quotas'][len(self.served)]);self.served.add(norf)
        return {'accepted':ok,'rescued':self.retained,'trays_used':self.trays_used,'ended':self.ended,'full_success':self.retained==self.party_size}

class Harness:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX
        self.m=m=NativeOracle('mountain-rescue');self.obj=m.alloc(0x28c);self.scene=m.alloc(0x400);self.thread=m.alloc(256);self.trace=[]
        m.hook(0x46ec98,lambda _:self.thread)
        m.uc.hook_add(UC_HOOK_CODE,lambda uc,va,size,ud:self.trace.append({'rand':m.reg(UC_X86_REG_EAX),'state':m.u32(self.thread+20)}),begin=0x46c7e1,end=0x46c7e1)
        for init in INITIALIZERS:m.call(init)
        # Only sprintf is replaced; authored record lookup and suffix construction run natively.
        def sprintf(x):
            fmt=x.read(x.arg(1),100).split(b'\0')[0].decode('ascii')
            out=(fmt%(x.arg(2),x.arg(3))).encode()+b'\0';x.write(x.arg(0),out);return len(out)-1
        m.hook(0x46cc6f,sprintf)
    def generate(self,l,s):
        m=self.m;m.write(self.obj,bytes(0x28c));m.write_u32(self.thread+20,s);self.trace.clear();m.call(0x453640,args=[l],ecx=self.obj)
        n=4 if l<3 else 6
        return {'template':m.u32(self.obj),'total_trays':m.u32(self.obj+4),'permutation':list(struct.unpack('<9i',m.read(self.obj+8,36))),
          'orders':[list(struct.unpack('<6i',m.read(self.obj+0x44+i*24,24))) for i in range(n)],'rng_state':m.u32(self.thread+20),'rng_trace':self.trace[:]}
    def clue(self,n):
        m=self.m;m.call(0x454690,args=[n+1],ecx=self.obj)
        return {'text':m.read(self.obj+0xe4,150).split(b'\0')[0].decode('cp1252'),'audio':m.read(self.obj+0x17a,258).split(b'\0')[0].decode('cp1252'),
          'metadata':list(struct.unpack('<4i',m.read(self.obj+0x27c,16)))}


def validate():
    h=Harness();m=h.m;gen=pred=clues=limits=0;seen=set()
    # Independent static initializer reconstruction compared byte-for-byte to original x86 initializers.
    a=Assignments()
    for init,va,tid in zip(INITIALIZERS,CLUE_TABLES,IDS):
        a.run(init);n=len(authored()[tid]['clues'])
        assert a.read(va,(n+1)*440)==m.read(va,(n+1)*440)
    seeds=list(range(80))+[0x7fffffff,0x80000000,0xfffffffe,0xffffffff]
    for l in (1,2,3):
        for seed in seeds:
            p=generate(l,seed);actual=h.generate(l,seed)
            expected={k:p[k] for k in actual};expected['rng_trace']=[{k:r[k] for k in ('rand','state')} for r in p['rng_trace']]
            assert actual==expected,(l,seed,actual,p)
            gen+=1;seen.add(p['template'])
            for n in range(len(p['orders'])):
                expected=clue(p,n);actual=h.clue(n)
                assert actual=={k:expected[k] for k in actual},(l,seed,n,actual,expected)
                clues+=1
            if seed<12:
                for n in range(len(p['orders'])):
                    for meal in itertools.product(range(-1,4),range(2,7),range(-1,10)):
                        result=m.call(0x4535d0,args=[n+1,*meal],ecx=h.obj)
                        assert bool(result)==accepts(p,n,meal),(l,seed,n,meal);pred+=1
        for counter in range(-7,7):
            m.write_u32(h.scene+12,l);m.write_u32(h.scene+0x238,counter)
            result=m.call(0x4109f0,ecx=h.scene)&255
            assert bool(result)==(counter==[-3,-3,-5][l-1]);limits+=1
    result={'source_sha256':SHA,'status':'pass','generator_rng_cases':gen,'meal_predicate_cases':pred,'clue_output_cases':clues,'tray_exhaustion_cases':limits,'templates_covered':sorted(seen),'authored_initializer_cases':12,
      'boundary':'Original generator, record initialization/selection/audio naming, exact meal validator, and exhaustion predicate. Scene animations and OS/UI calls excluded.'}
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'native-parity.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

def validate_actions():
    from unicorn.x86_const import UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EDI
    h=Harness();m=h.m;marks=food_writes=tray_counts=quotas=0
    for l in (1,2,3):
        cfg=generate(l,0)
        for norf in range(len(cfg['orders'])):
            for course in range(2 if l==1 else 3):
                for food_index in range(3):
                    food=course*3+food_index;off=0x4ac680+food*24+norf*4
                    for mark in range(4):
                        m.write_u32(off,mark)
                        start=[0x412900,0x4129c8,0x412ab5][course]
                        stop=[0x412927,0x4129ef,0x412ad8][course]
                        m.call(start,registers={UC_X86_REG_EDI:food_index,UC_X86_REG_EBX:norf},stop_at=stop)
                        assert m.u32(off)==(mark+1)%4;marks+=1
        for tray in range(len(cfg['orders'])):
            for food in range(6 if l==1 else 9):
                course=[0,2,1][food//3]
                m.write(h.scene,bytes(0x400));m.write_u32(h.scene+0x1d8,tray);m.write_u32(h.scene+0x1dc,course);m.write_u32(h.scene+0x1cc,food)
                m.call(0x412b46,registers={UC_X86_REG_ESI:h.scene},stop_at=0x412b62)
                assert m.u32(h.scene+0xec+tray*32+course*4)==food;food_writes+=1
        for count in range(1,cfg['total_trays']+1):
            m.write_u32(h.scene+0x238,[5,4,3][l-1]-count+1)
            m.call(0x412191,registers={UC_X86_REG_ESI:h.scene},stop_at=0x4121a0)
            assert m.u32(h.scene+0x238)==([5,4,3][l-1]-count)&0xffffffff;tray_counts+=1
        for served in range(len(cfg['orders'])):
            m.write_u32(h.scene+12,l);m.write_u32(h.scene+0x23c,served)
            m.call(0x41013e,registers={UC_X86_REG_EDI:h.scene,UC_X86_REG_EBX:0},stop_at=0x410162)
            assert m.u32(h.scene+0x240)==cfg['quotas'][served];quotas+=1
    result={'source_sha256':SHA,'status':'pass','notepad_transitions':marks,'food_replacements':food_writes,'tray_decrements':tray_counts,'release_quota_lookups':quotas,
      'boundary':'Original branch slices with explicit input registers and stop addresses; graphics and mouse coordinates excluded.'}
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'action-parity.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))


def export_spec():
    guard();OUT.mkdir(parents=True,exist_ok=True)
    data=authored();(OUT/'authored-templates.json').write_text(json.dumps(data,indent=2)+'\n')
    manifest=[json.loads(x) for x in (ROOT/'local/derived/mountain-rescue/manifest.jsonl').read_text().splitlines()]
    assets=[{k:a[k] for k in ('source','source_sha256','source_size','format','frame_count') if k in a} for a in manifest if '/chez_norf/' in a['source'].lower()]
    spec={'schema_version':1,'game':'mountain-rescue','id':'mountain-rescue/chez-norf','name':'Chez Norf',
      'state':{'party':'Ordered 1–8 remaining characters; traits are irrelevant. Quota rescues stop when the party is empty.',
        'orders':'4 or 6 Norfs, each with an exact main/drink/dessert order and three clue selector arguments. Sentinel 9 marks unused data.',
        'tray':'4 or 6 workspace trays; each has main, drink and dessert fields initialized to -1. Food placement replaces one course. Finished tray can be picked up and put back before serving.',
        'dynamic':'Served-Norf bitset; served count; remaining party; total trays spent; per-food/per-Norf independent notepad entries 0..3.',
        'native_fields':{'rule_object':'+0xd8','norf_count':'+0xd4','selected_tray':'+0x19c','tray_record':'scene+0xdc+32*i; main+0xec, dessert+0xf0, drink+0xf4','served_flags':'+0x230..235','tray_counter':'+0x238','served_count':'+0x23c','next_rescue_quota':'+0x240','remaining_party':'+0x244'}},
      'inputs':{'generation':['difficulty 1–3','CRT state at 0x453640'],'actions':['listen to a Norf','mark order pad','place or replace food on tray','pick up complete tray','return tray to workspace','serve an unserved Norf','Go after end']},
      'actions':{'listen':'Return the record selected by template, Norf index, and the three generated clue arguments. Repeat without cost. Exact authored text, pointing metadata and audio binding are in the local template corpus.',
        'notes':'Independent cycle 0 → 1 → 2 → 3 → 0. These marks do not affect order validation; dessert rows are inactive at level 1. Four-Norf levels keep unused columns zero.',
        'food':'Choose one of three foods per enabled course. Place it in the matching course slot of an available workspace tray; replaces any prior food. No action removes a placed item. Dropping outside a slot changes no meal.',
        'pickup':'Requires main and drink, and also dessert except at level 1. Merely picking up/returning a tray does not spend it.',
        'serve':'Drop complete tray on an unserved Norf. Decrement tray counter when dispatching the tray to the Norf, before evaluation. Both correct and incorrect meals cost one tray. A correct Norf cannot be served again.',
        'continue':'Retained rescues advance; unrescued characters return to the shared pool. Shared Go/save UI engine excluded.'},
      'feedback':{'correct':'All enabled course IDs must equal the generated answer. Correct meal sets the Norf served flag and releases the next quota of characters. Speech 7-N{voice}-G03.',
        'wrong':'No course-specific correctness feedback: rejection animation and 7-N{voice}-G01/G02, selected by whether this was the last tray. Recipe remains unchanged.',
        'predicate_exception':'At level 1, expected dessert 9 accepts either exactly 9 or submitted -1. Normal UI submits -1; 9 is only a direct-validator diagnostic.',
        'voice_index':'Norf index is 1-based; add 2 for four-Norf levels. No addition for six-Norf level.'},
      'success':{'full':'Every incoming character is rescued; with eight characters this requires every Norf.',
        'partial':'Each accepted meal permanently rescues the next quota. These rescues survive subsequent wrong meals and tray exhaustion.',
        'quota_order':'By number of previously served Norfs, independent of which Norf was served.'},
      'failure':{'budget':'Total submitted trays: 8, 7, 8 at levels 1, 2, 3. This is not a separate rejection counter.',
        'native_counter':'Initial scene+0x238 is 5,4,3. Each dispatch decrements it; terminal values are -3,-3,-5. 0x4109f0 checks equality to these values.',
        'manual_distinction':'Four/three/two extra trays are the slack after all required correct meals. The level-3 manual says two incorrect meals before firing; native logic instead tracks eight total submissions.',
        'end':'After final-tray animation or all Norfs served (or no characters left), input ends. Lost characters are only those never rescued.'},
      'difficulty_levels':[{'level':l,'norfs':4 if l<3 else 6,'courses':2 if l==1 else 3,'foods_per_course':3,'total_trays':[8,7,8][l-1],
        'extra_trays_for_full_party':[4,3,2][l-1],'release_quotas':[[2]*4,[2]*4,[2,2,1,1,1,1]][l-1],
        'templates':[l*10+i for i in range(1,5)],'template_food_permutations':216,'visible_permutations_per_template':36 if l==1 else 216} for l in (1,2,3)],
      'generation':{'status':'exactmodel_with_original_function_parity','entry':'0x453640','rng':'CRT recurrence 214013*s+2531011 modulo 2^32, result (s>>16)&32767.',
        'sequence':'Draw rand%4 once and select level*10+1+variant. Then independently permute IDs 0..2, 3..5, 6..8: draw rand%3 until each new position differs from prior positions. All nine positions are sampled; even level 1 consumes dessert draws.',
        'construction':'Compiled straight-line assignments bind the permuted foods to answer and clue selector fields. No runtime constraint solver or rejection of complete puzzles.',
        'authored':{'path':'local/analysis/mountain-rescue-chez-norf/authored-templates.json','templates':len(data),'clue_records':sum(len(t['clues']) for t in data.values()),
          'format':'Runtime 440-byte record: four int32 key fields; text[150]; stored_audio[258]; four int32 pointing/timing fields. Tables live in zero-filled .data and are constructed by twelve static initializers; runtime addresses are not raw file offsets.'},
        'clue_binding':'Select exact [Norf index, selector0, selector1, selector2]. Audio = 7-N{voice}-{template} plus -a1..a3/-b1..b3/-c1..c3 for non-9 selectors, then .wav. Template13/Norf3 adds -a0; template33/Norf2 adds -c0.',
        'foods':dict(enumerate(FOODS)),'cosmetic_rng':'Idle Norf animation at 0x41114b draws rand%norf_count. Entry seed is not a whole-game replay seed.'},
      'assets':assets,
      'evidence':{'executable':{'path':str(EXE.relative_to(ROOT)),'sha256':SHA},'manual':{'pdf_pages':[19,31],'sha256':'59c8950e5b7e81eca6daa1d91028302584853a9cda4683ee813ec13cc43e44c3'},
        'native':{'template_generator':'0x453640','permutations':'0x453cc0','answers':'0x454220','meal_predicate':'0x4535d0','clue_lookup':'0x4537c0','clue_dispatch':'0x454690','scene_evaluate':'0x410500','tray_dispatch_decrement':'0x412191','exhaustion':'0x4109f0','release':'0x410130','note_cycle':'0x412900/0x4129c8/0x412ab5','food_replace':'0x412b46','normal_level_cap':'0x40f7b6: save +0x13f0 capped at 3 after every third full-eight success (+0x1774).'},
        'provenance_rule':'Text/code VA minus 0x400000 is file offset in guarded executable. Clue tables are initialized runtime storage; use recorded initializer ranges plus source hash, not fabricated raw offsets.'},
      'validation':{name:json.loads((OUT/file).read_text()) for name,file in [('native','native-parity.json'),('actions','action-parity.json')]},
      'open_questions':[],
      'completeness':{'status':'complete_at_discrete_normal_puzzle_boundary','covered':['all 12 templates','all course permutations and RNG calls','exact acceptance','all clue records and audio names','notepad cycle and food replacement','total attempt budget','release quotas and partial/full success','three difficulty levels'],
        'excluded':['pixel drag geometry','animation interpolation and asynchronous events','shared Go/save engine','semantic NLP solver for clue sentences','invalid or corrupted states']}}
    path=ROOT/'local/specs/mountain-rescue/chez-norf.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(spec,indent=2)+'\n')
    return {'path':str(path),'assets':len(assets),'clue_records':spec['generation']['authored']['clue_records']}

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--validate',action='store_true');ap.add_argument('--validate-actions',action='store_true');ap.add_argument('--export',action='store_true');args=ap.parse_args()
    if args.validate:validate()
    if args.validate_actions:validate_actions()
    if args.export:print(export_spec())
