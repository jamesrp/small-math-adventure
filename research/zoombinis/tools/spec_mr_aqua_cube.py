#!/usr/bin/env python3
"""Version-guarded Aqua Cube generator and discrete gameplay boundary."""
import argparse
import copy
import hashlib
import itertools
import json
import random
import struct
from dataclasses import dataclass, field
from spec_mr_turtle_hurdle import ROOT, EXE, SHA, Rand, guard

OUT = ROOT/'local/analysis/mountain-rescue-aqua-cube'


def tables(level):
    guard()
    b = EXE.read_bytes()
    parameters = list(struct.unpack_from('<6I', b, 0x89098 + level*24))
    va = 0x489240 if level < 3 else 0x489480
    data = b[va-0x400000:va-0x400000+parameters[0]*72]
    vertices = []
    for i in range(parameters[0]):
        d = data[i*72:(i+1)*72]
        w = struct.unpack('<18i', d)
        vertices.append({'index':i,'neighbors':list(w[:parameters[1]]),
                         'xy':list(w[4:6]),'label':d[44:52].split(b'\0')[0].decode(),
                         'bits':list(w[13:17]),'kind':1,'characters':[], 'fleen_type':0})
    return parameters, vertices, {'virtual_address':hex(va),'file_offset':va-0x400000,
            'length':len(data),'sha256':hashlib.sha256(data).hexdigest()}


def generate(level, size, seed):
    if level not in (1,2,3,4) or not 1 <= size <= 16:
        raise ValueError('Normal levels1..3; diagnostic4. Incoming party1..16.')
    p, vertices, provenance = tables(level)
    rng, axes, orientation = Rand(seed), [], []
    letters = {}
    for _ in range(p[1]):
        while (axis := rng.next(p[1])) in axes:
            pass
        axes.append(axis)
        value = rng.next(2)
        orientation.append(value)
        a,b = [('U','D'),('L','R'),('F','B'),('X','C')][axis]
        letters[a], letters[b] = value, 1-value
    for vertex in vertices:
        vertex['bits'][:p[1]] = [letters[ch] for ch in vertex['label']]
    def find(bits):
        return next(v for v in vertices if v['bits'][:p[1]] == list(bits))
    def fleen(bits, subtype):
        v = find(bits)
        v['kind'], v['fleen_type'] = 3, subtype
    if level < 3:
        fleen((1,1,1),1)
        start = (0,0,0) if level == 1 else [(0,0,1),(0,1,0),(1,0,0)][rng.next(3)]
    else:
        fleen((1,1,1,1),1)
        candidates = [(1,1,1,0),(1,1,0,1),(1,0,1,1),(0,1,1,1)]
        candidates += [tuple(1-x for x in v) for v in candidates]
        chosen = candidates[rng.next(4)]
        fleen(chosen,2)
        fleen(tuple(1-x for x in chosen),3)
        while find(chosen := candidates[rng.next(8)])['kind'] != 1:
            pass
        fleen(chosen,4)
        start = (0,0,0,0)
        if level == 4:
            while find(start := candidates[4+rng.next(4)])['kind'] == 3:
                pass
    start_vertex = find(start)
    start_vertex['kind'] = 2
    available = [v for v in vertices if v['kind'] == 1]
    for i in range(size):
        v = available[i%len(available)]
        v['kind'] = 0
        v['characters'].append(i)
    return {'level':level,'size':size,'parameters':p,'axes':axes,'orientation':orientation,
            'vertices':vertices,'start':start_vertex['index'],'table':provenance,
            'rng_state':rng.state,'rng_trace':rng.trace}


@dataclass
class Board:
    config:dict
    vertices:list
    current:int
    turns:int=0
    warps:int=0
    rescued:set=field(default_factory=set)
    lost:set=field(default_factory=set)
    pending:set|None=None

    @classmethod
    def new(cls, config):
        return cls(config,copy.deepcopy(config['vertices']),config['start'])

    @property
    def exhausted(self):
        return self.turns >= self.config['parameters'][4]

    @property
    def ended(self):
        return self.exhausted or len(self.rescued|self.lost)==self.config['size']

    def begin_warp(self):
        if self.ended or self.pending is not None or self.warps >= self.config['parameters'][5]:
            raise ValueError('Warp unavailable')
        self.warps += 1
        self.pending = set()

    def lever(self, lever):
        if self.ended or lever not in range(self.config['parameters'][1]):
            raise ValueError('Lever unavailable')
        if self.pending is not None:
            self.pending.add(lever) # Native sets a byte to1; repeats do not toggle it.
            return {'queued':sorted(self.pending)}
        self.current = self.vertices[self.current]['neighbors'][self.config['axes'][lever]]
        return self.arrive()

    def finish_warp(self):
        if self.pending is None:
            raise ValueError('No warp is being programmed')
        for lever in sorted(self.pending):
            self.current = self.vertices[self.current]['neighbors'][self.config['axes'][lever]]
        self.pending = None
        return self.arrive()

    def arrive(self):
        self.turns += 1
        vertex = self.vertices[self.current]
        picked, scattered = [], []
        if vertex['kind'] == 0:
            picked = vertex['characters'][:]
            self.rescued.update(picked)
            vertex['characters'].clear()
        elif vertex['kind'] == 3:
            vertex['kind'] = 1
            scattered = sorted(self.rescued)
            self.lost.update(self.rescued)
            self.rescued.clear()
        return {'vertex':self.current,'picked_up':picked,'scattered':scattered,
                'rescued':sorted(self.rescued),'lost':sorted(self.lost),'turns':self.turns,
                'exhausted':self.exhausted,'ended':self.ended,'complete':len(self.rescued)==self.config['size']}


class Harness:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_ESP,UC_X86_REG_EIP
        self.m = m = NativeOracle('mountain-rescue')
        m.uc.mem_map(0,0x1000)
        self.scene,self.thread = m.alloc(0x400),m.alloc(256)
        self.chars = [m.alloc(0x9c) for _ in range(16)]
        self.vector = m.alloc(64,struct.pack('<16I',*self.chars))
        m.hook(0x46ec98,lambda _:self.thread)
        m.hook(0x45c270,lambda _:0,pop=8)
        self.trace=[]
        def rand_end(uc,address,size,_):
            self.trace.append({'rand':m.reg(UC_X86_REG_EAX),'state':m.u32(self.thread+20)})
        m.uc.hook_add(UC_HOOK_CODE,rand_end,begin=0x46c7e1,end=0x46c7e1)
        def skip_graphics(uc,address,size,_):
            m.write_u32(m.reg(UC_X86_REG_ESP)+0x18,0)
            uc.reg_write(UC_X86_REG_EBX,0)
            uc.reg_write(UC_X86_REG_EIP,0x404bf1)
        m.uc.hook_add(UC_HOOK_CODE,skip_graphics,begin=0x4040c2,end=0x4040c2)

    def install_gameplay_stubs(self):
        from unicorn.x86_const import UC_X86_REG_ECX
        m = self.m
        # No puzzle branch is replaced: only allocators, sound, sprite updates,
        # narrator/UI updates. Position writes are retained for Fleen predicates.
        m.hook(0x46cbda,lambda x:x.alloc(x.arg(0)))
        m.hook(0x46c7a8,lambda _:0)
        for va,pop in [(0x46c16c,4),(0x46c1dd,4),(0x45b260,8),(0x45a2a0,12),
                       (0x45a170,4),(0x456c20,8),(0x4569a0,16),(0x45d470,8),
                       (0x468b40,0),(0x468f30,0),(0x461010,0)]:
            m.hook(va,lambda _:0,pop=pop)
        m.hook(0x45a250,lambda _:0,pop=4)
        def position(x):
            ptr=x.reg(UC_X86_REG_ECX)
            x.write_u32(ptr+0x20,x.arg(0));x.write_u32(ptr+0x24,x.arg(1))
            return 0
        m.hook(0x45c270,position,pop=8)
        self.dummy=m.alloc(0x100)
        for offset in range(0,0x100,4):
            m.write_u32(self.dummy+offset,self.dummy)

    def load_board(self,c):
        self.setup(c)
        m=self.m;va=int(c['table']['virtual_address'],16)
        for offset in (0x15c,0x184,0x194):
            m.write_u32(self.scene+offset,self.dummy)
        m.write_u32(self.scene+0x1dc,c['start'])
        for i,axis in enumerate(c['axes']):
            m.write_u32(self.scene+0x174+i*4,axis)
        for v in c['vertices']:
            addr=va+72*v['index']
            m.write_u32(addr+24,v['kind']);m.write_u32(addr+28,len(v['characters']))
            m.write_u32(addr+68,v['fleen_type'])
            for j,k in enumerate(v['characters']):
                m.write_u32(addr+32+j*4,k)
                m.write_u32(self.chars[k]+0x20,v['xy'][0]);m.write_u32(self.chars[k]+0x24,v['xy'][1])

    def setup(self,config,seed=0):
        m = self.m
        m.write(self.scene,bytes(0x400))
        m.write_u32(self.scene+0x160,config['level'])
        m.write_u32(0x4ac084,self.scene)
        va = int(config['table']['virtual_address'],16)
        original = EXE.read_bytes()[va-0x400000:va-0x400000+config['table']['length']]
        m.write(va,original)
        m.write_u32(0x4ac080,va)
        m.write_u32(0x4e4914,self.vector)
        m.write_u32(0x4e4918,self.vector+config['size']*4)
        for ptr in self.chars:
            m.write(ptr,bytes(0x9c))
        m.write_u32(self.thread+20,seed)
        self.trace.clear()


def validate_generation():
    from unicorn.x86_const import UC_X86_REG_ESI
    h=Harness(); m=h.m
    cases=[]
    for level,size,seed in itertools.product((1,2,3,4),(1,2,6,11,16),[0,1,2,0xffffffff]+[random.Random(903+i).getrandbits(32) for i in range(16)]):
        c=generate(level,size,seed)
        h.setup(c,seed)
        m.call(0x403f73,registers={UC_X86_REG_ESI:h.scene},stop_at=0x4055ba)
        va=int(c['table']['virtual_address'],16)
        assert [m.u32(h.scene+0x174+i*4) for i in range(c['parameters'][1])] == c['axes']
        assert [m.u32(h.scene+0x164+i*4) for i in range(c['parameters'][1])] == c['orientation']
        assert m.u32(h.scene+0x1dc)==c['start'],(level,seed,'start')
        for v in c['vertices']:
            addr=va+v['index']*72
            assert m.u32(addr+24)==v['kind'],(level,seed,v,'kind')
            assert m.u32(addr+28)==len(v['characters'])
            assert [m.u32(addr+32+i*4) for i in range(len(v['characters']))]==v['characters']
            assert list(struct.unpack('<4i',m.read(addr+52,16)))==v['bits']
            assert m.u32(addr+68)==v['fleen_type']
        assert h.trace==[{k:t[k] for k in ('rand','state')} for t in c['rng_trace']],(level,seed,h.trace,c['rng_trace'])
        assert m.u32(h.thread+20)==c['rng_state']
        cases.append({'level':level,'size':size,'seed':seed,'draws':len(h.trace)})
    return {'status':'passed','count':len(cases),'source_sha256':SHA,'cases':cases,
            'boundary':'403f73..4055ba; graphics-only4040c2..404bf1 skipped;45c270 character positioning stubbed; original RNG/coordinate/placement branches executed.'}


def validate_actions():
    from unicorn.x86_const import UC_X86_REG_ESI,UC_X86_REG_EBX
    h=Harness();h.install_gameplay_stubs();m=h.m
    counts={'single_edge':0,'arrival':0,'fleen_scatter':0,'warp_subsets':0,'warp_queue_repeats':0,'warp_activation_gates':0}
    for level in (1,2,3):
        c=generate(level,16,98765)
        for vertex,axis in itertools.product(c['vertices'],range(c['parameters'][1])):
            h.load_board(c)
            m.write_u32(h.scene+0x1dc,vertex['index'])
            m.call(0x4019e0,[axis],ecx=h.scene)
            assert m.u32(h.scene+0x1dc)==vertex['neighbors'][axis]
            counts['single_edge']+=1
        # Whole traces include first/final moves, empty revisits, Fleen collisions,
        # and collected characters being removed from the retained rescue set.
        for case in range(100):
            c=generate(level,1+case%16,case)
            h.load_board(c);board=Board.new(c)
            r=random.Random(812+case)
            for turn in range(c['parameters'][4]):
                lever=r.randrange(c['parameters'][1])
                before_kind=board.vertices[board.vertices[board.current]['neighbors'][c['axes'][lever]]]['kind']
                expected=board.lever(lever)
                m.call(0x4019e0,[c['axes'][lever]],ecx=h.scene)
                m.call(0x402260,ecx=h.scene)
                if before_kind==3:
                    m.call(0x4037a0,ecx=h.scene)
                    counts['fleen_scatter']+=1
                    # Original update402e5a..402e68 resets count after Fleen exit.
                    m.write_u32(h.scene+0x26c,0)
                actual=[i for i in range(c['size']) if m.read(h.chars[i]+0x5c,1)[0]]
                assert actual==expected['rescued'],(level,case,turn,actual,expected)
                assert m.u32(h.scene+0x1dc)==board.current
                assert m.u32(h.scene+0x1e4)==board.turns
                assert bool(m.read(h.scene+0x1e8,1)[0])==board.exhausted
                m.call(0x4027b6,registers={UC_X86_REG_ESI:h.scene,UC_X86_REG_EBX:1},stop_at=0x40283f)
                assert bool(m.read(h.scene+0x1e8,1)[0])==board.ended
                va=int(c['table']['virtual_address'],16)
                for v in board.vertices:
                    assert m.u32(va+72*v['index']+28)==len(v['characters'])
                    assert m.u32(va+72*v['index']+24)==v['kind']
                counts['arrival']+=1
                if board.ended:
                    break
        if level>1:
            from unicorn import UC_HOOK_CODE
            from unicorn.x86_const import UC_X86_REG_EDI,UC_X86_REG_ESP,UC_X86_REG_EIP
            for mask in range(1<<c['parameters'][1]):
                c=generate(level,16,98765);h.load_board(c);board=Board.new(c)
                board.begin_warp()
                for lever in range(c['parameters'][1]):
                    if mask>>lever&1:
                        board.lever(lever);board.lever(lever)
                        m.write(h.scene+0x1f0+lever,b'\1')
                m.write(h.scene+0x1f4,b'\1');m.write(h.scene+0x1e9,b'\1')
                # Run actual warp dispatcher until one edge launches, settling
                # only its animation pointer before re-entering dispatch.
                def stop_after_dispatch(uc,address,size,_):
                    uc.reg_write(UC_X86_REG_EIP,0x71000000)
                hk=m.uc.hook_add(UC_HOOK_CODE,stop_after_dispatch,begin=0x4033bb,end=0x4033bb)
                while m.read(h.scene+0x1f4,1)[0]:
                    m.call(0x403027,registers={UC_X86_REG_EDI:h.scene})
                    m.write_u32(h.scene+0x1d0,0)
                m.uc.hook_del(hk)
                expected=board.finish_warp()
                if c['vertices'][board.current]['kind']==3:
                    m.call(0x4037a0,ecx=h.scene)
                assert m.u32(h.scene+0x1dc)==board.current
                assert m.u32(h.scene+0x1e4)==1
                assert [i for i in range(16) if m.read(h.chars[i]+0x5c,1)[0]]==expected['rescued']
                counts['warp_subsets']+=1
    from unicorn.x86_const import UC_X86_REG_EDI,UC_X86_REG_ESI,UC_X86_REG_EBX
    click=m.alloc(16)
    for level,busy,used in itertools.product((1,2,3),(0,1),range(4)):
        c=generate(level,16,1);h.load_board(c)
        m.write(h.scene+0x1e9,bytes([busy]));m.write_u32(h.scene+0x1f8,used)
        m.write(h.scene+0x1f0,b'\1'*4)
        m.call(0x4034cd,registers={UC_X86_REG_EDI:h.scene,UC_X86_REG_ESI:click},stop_at=0x40356a)
        allowed=not busy and used<c['parameters'][5]
        assert m.u32(h.scene+0x1f8)==used+allowed
        assert bool(m.read(h.scene+0x1e9,1)[0])==bool(busy or allowed)
        assert m.read(h.scene+0x1f0,4)==(bytes(4) if allowed else b'\1'*4)
        counts['warp_activation_gates']+=1
    for level in (2,3):
        c=generate(level,16,1);h.load_board(c)
        m.write(h.scene+0x1e9,b'\1')
        for lever in range(c['parameters'][1]):
            for repeat in range(3):
                m.call(0x4035d2,registers={UC_X86_REG_EDI:h.scene,UC_X86_REG_ESI:lever,
                        UC_X86_REG_EBX:h.scene+0x174+lever*4},stop_at=0x4035f0)
                assert m.read(h.scene+0x1f0+lever,1)==b'\1'
                counts['warp_queue_repeats']+=1
    return {'status':'passed','source_sha256':SHA,'counts':counts,
            'boundary':'4019e0 full edge move;402260 full arrival;4037a0 full scatter callback;403027..4033bb warp dispatcher. Graphics/audio/narrator stubs; animation settlement externalized; original decisions and coordinate writes retained.'}


def minimum_warps(config):
    """All-character rescue in the tight move budget; exact subset DP.

    All16 characters fill every safe target, so each turn must visit a new target.
    A cube-edge arrival costs0warps; any other distinct destination costs1warp.
    The warp subset can realize every destination, while ignoring intermediates.
    """
    targets=[v['index'] for v in config['vertices'] if v['characters']]
    dp={(0,config['start']):(0,[])}
    for mask in range(1<<len(targets)):
        for last in [config['start']]+targets:
            if (mask,last) not in dp:
                continue
            cost,path=dp[mask,last]
            for i,target in enumerate(targets):
                if mask>>i&1:
                    continue
                candidate=(cost+int(target not in config['vertices'][last]['neighbors']),path+[target])
                key=(mask|1<<i,target)
                if key not in dp or candidate[0]<dp[key][0]:
                    dp[key]=candidate
    return min((dp[((1<<len(targets))-1,last)] for last in targets),key=lambda x:x[0])


def difficulty_analysis():
    cases=[]
    for level,total in ((1,1),(2,3),(3,24)):
        seen=set();seed=0
        while len(seen)<total:
            c=generate(level,16,seed);seed+=1
            key=tuple(tuple(v['bits'][:c['parameters'][1]]) for v in sorted(c['vertices'],key=lambda x:x['fleen_type']) if v['fleen_type'])
            key+=(tuple(c['vertices'][c['start']]['bits'][:c['parameters'][1]]),)
            if key in seen:
                continue
            seen.add(key)
            minimum,path=minimum_warps(c)
            assert minimum<=c['parameters'][5],(level,seed,minimum)
            # Replay a genuine lever/warp witness through the executable model.
            board=Board.new(c);actions=[]
            for target in path:
                current=board.current
                selected=[lever for lever,axis in enumerate(c['axes']) if c['vertices'][current]['label'][[1,0,2,3][axis]] != c['vertices'][target]['label'][[1,0,2,3][axis]]]
                if len(selected)==1:
                    board.lever(selected[0]);actions.append({'lever':selected[0]})
                else:
                    board.begin_warp()
                    for lever in selected:board.lever(lever)
                    board.finish_warp();actions.append({'warp':selected})
                assert board.current==target
            assert len(board.rescued)==16
            cases.append({'level':level,'seed':seed-1,'logical_fleens_and_start':key,
                          'minimum_warps':minimum,'turns':len(path),'witness':actions})
    return {'status':'proved_by_exhaustive_subset_DP','cases':cases,
            'objective':'Rescue all16characters within native6/11totalturns, known lever mapping, no Fleen landing.',
            'coverage':'All1/3/24logical generator choices for levels1/2/3; coordinate reflections/lever permutations are graph isomorphisms.',
            'histograms':{str(level):{str(n):sum(x['level']==level and x['minimum_warps']==n for x in cases) for n in range(3)} for level in (1,2,3)}}


def export_spec():
    guard()
    manifest=[json.loads(line) for line in (ROOT/'local/derived/mountain-rescue/manifest.jsonl').read_text().splitlines()]
    assets=[{k:v[k] for k in ('source','source_sha256','source_size','format','frame_count') if k in v}
            for v in manifest if '/aquacube/' in v['source'].lower()]
    validation={key:json.loads((OUT/name).read_text()) for key,name in
                [('generation','generator-parity.json'),('actions','action-parity.json'),('difficulty','difficulty-analysis.json')]}
    for v in validation.values():v.pop('cases',None)
    spec={'schema_version':1,'game':'mountain-rescue','id':'mountain-rescue/aqua-cube','name':'Aqua Cube',
          'state':{'input_party':'Ordered 1–16 characters; visible traits do not affect this puzzle.',
                   'graph':'Authored cube or4-cube adjacency. Each lever is assigned one adjacency column.',
                   'vertices':'Kind 0 holds characters, 1 is empty, 2 starts the light, 3 holds a Fleen; each vertex has a list of party indices.',
                   'dynamic':'Current vertex; consumed turns and warps; pending lever set; retained rescues; permanently scattered characters; collected-ever flags.',
                   'native_fields':{'level':'+160','axis_map':'+174..180','reflection_bits':'+164..170','current_vertex':'+1dc',
                                    'used_turns':'+1e4','ended':'+1e8','programming_warp':'+1e9','pending_levers':'+1f0..1f3',
                                    'execute_warp':'+1f4','used_warps':'+1f8','rescued_count':'+26c',
                                    'character_success':'+5c','character_collected_ever':'+64'}},
          'inputs':{'generation':['level 1–3','incoming party size 1–16','CRT RNG state immediately at 0x403f73'],
                    'actions':['pull lever','activate warp','select levers during timer','timer expiry','continue after completion']},
          'actions':{'lever':'While idle and not ended, follow current_vertex.neighbors[axis_map[lever]], evaluate arrival, and spend one turn.',
                     'warp':'Available at levels 2 and 3 with uses left. Activation spends one warp, clears the pending set, and opens programming. Repeated lever clicks set the same byte to 1. Timer expiry executes each selected lever once in index order. Evaluate only the final vertex and spend one turn, including an empty selection.',
                     'revisit':'Legal; spends one turn. A collected vertex has count zero and gives no further rescue.',
                     'continue':'The scene ends when turns equal the budget or every character has its collected-ever flag. Only characters with success byte +0x5c advance; others return to the pool. The shared Go/UI transition is excluded.',
                     'timer':'Seven timer frames are configured for 0x359 (857) clock units each at 0x405a24–0x405a9d, with callback 0x403cc0; nominal total 5,999 units. The model exposes a finish_warp event.',
                     'gates':'Input update 0x4033bb–0x403483 ignores input during movement, rescue, Fleen animations, and ended state. Pixel hit rectangles and asynchronous input during warp execution are excluded.'},
          'feedback':{'safe_arrival':'Set each held character’s success byte +0x5c, collected-ever byte +0x64, and hidden byte +0x78; place it on shore; clear the vertex count.',
                      'Fleen_arrival':'The Fleen vertex becomes empty. Callback 0x4037a0 clears the success flag for every character on shore (y < 100); after the swim-away animation the retained count becomes zero. Previously collected characters never return to bubbles.',
                      'move_counter':'The counter increments before processing the arrival vertex; the last turn still collects its characters.',
                      'display':'The light path reveals the lever axis; the gauge shows consumed turns. Speech 8-E1 means retained count equals party size; 8-E2 means partial rescue.'},
          'success':{'full':'Every arriving character is retained at exit (success byte +0x5c).',
                     'partial':'Only characters still retained on shore advance. Prior rescues scattered by a Fleen are lost.',
                     'early_end':'Every character has been collected at least once (+0x64), even if some were later scattered; checker 0x4027b6–0x40283f.'},
          'failure':{'turn_limit':'Six total turns at levels 1 and 2; eleven at level 3. A warp consumes one of these turns.',
                     'Fleens':'Lose all retained rescues, then continue if turns and uncollected characters remain. That Fleen is removed.',
                     'no_other_attempt_limit':True},
          'difficulty_levels':[{'level':level,'vertices':tables(level)[0][0],'levers':tables(level)[0][1],
                                'safe_including_start':tables(level)[0][2],'fleens':tables(level)[0][3],
                                'total_turns':tables(level)[0][4],'warps':tables(level)[0][5],
                                'minimum_required_warps_for_full16party':0 if level==1 else 1}
                               for level in (1,2,3)],
          'generation':{'status':'exactmodel_with_original_function_parity',
                        'rng':'state = (214013*state + 2531011) mod 2^32; rand = (state >> 16) & 32767. Modulo and rejection draws are preserved.',
                        'lever_map':'For each lever, draw rand % d until an unused axis, then rand % 2 for reflection. Reflection letter pairs are UD, LR, FB, XC. Adjacency columns are LR, UD, FB, XC; coordinate bit order and adjacency column order differ.',
                        'L1':'Fleen 111; start 000. No further draws.',
                        'L2':'Fleen 111; one rand % 3 selects start 001, 010, or 100.',
                        'L3':'Fleen 1111; rand % 4 selects 1110/1101/1011/0111 (type 2), and its complement (type 3). Repeated rand % 8 selects among those four followed by their four complements until unused (type 4). Start 0000.',
                        'party_distribution':'Scan physical vertex indices in ascending order, skip Fleens and start, and distribute party indices cyclically across the rest; up to three characters per bubble. No character permutation or trait matching.',
                        'tables':{'parameter_table':{'virtual_address':'0x4890b0','file_offset':0x890b0,'record_size':24,'records':3},
                                  'vertices':[tables(1)[2],tables(3)[2]]},
                        'diagnostic4':'Extra native branch uses level 3 parameters; choose a one-hot start with rand % 4, rejecting Fleens. Validated separately; not a normal difficulty.',
                        'cosmetic_rng':'Decorative update 0x402850 consumes RNG during play. The seed specifies this generation entry, not whole-game reproducibility.'},
          'assets':assets,
          'evidence':{'executable':{'path':str(EXE.relative_to(ROOT)),'sha256':SHA},
                      'manual':{'path':'local/discs/mountain-rescue/INSTALL/Data/Zoombinimr.pdf','sha256':'59c8950e5b7e81eca6daa1d91028302584853a9cda4683ee813ec13cc43e44c3','pdf_pages':[17,30]},
                      'offset_rule':'For the guarded version, listed VA minus 0x400000 equals raw file offset.',
                      'native':{'generator':['0x403f73','0x4055ba'],'move':'0x4019e0','arrival':'0x402260',
                                'scatter':'0x4037a0','warp_input':['0x4034cd','0x40362d'],
                                'warp_execute':['0x403027','0x4033bb'],'all_collected_end':['0x4027b6','0x40283f'],
                                'campaign_level':'Save offset +0x13dc, capped at 3; the third full-16 success increments difficulty at 0x401fec–0x402052.'}},
          'validation':validation,'open_questions':[],
          'completeness':{'status':'complete_at_discrete_normal_puzzle_boundary',
                          'covered':['all normal generators and RNG draws','all lever and warp subsets','repeat-click and warp-count gates','arrival and Fleen loss','early and budget completion','full-versuspartial rescue','authored geometry','all logical difficulty choices'],
                          'excluded':['pixel hit testing','animation interpolation and clock scheduling','asynchronous input interleavings during warp execution','shared campaign Go/save engine','malformed states']}}
    path=ROOT/'local/specs/mountain-rescue/aqua-cube.json';path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(spec,indent=2)+'\n')
    (OUT/'authored-geometry.json').write_text(json.dumps({str(level):{'parameters':tables(level)[0],'vertices':tables(level)[1],'provenance':tables(level)[2]} for level in (1,2,3)},indent=2)+'\n')
    return {'path':str(path),'assets':len(assets),'status':spec['completeness']['status']}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--validate-generation',action='store_true')
    parser.add_argument('--validate-actions',action='store_true')
    parser.add_argument('--analyze-difficulty',action='store_true')
    parser.add_argument('--export',action='store_true')
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    if args.validate_generation:
        result=validate_generation()
        (OUT/'generator-parity.json').write_text(json.dumps(result,indent=2)+'\n')
        print({k:v for k,v in result.items() if k!='cases'})
    if args.validate_actions:
        result=validate_actions()
        (OUT/'action-parity.json').write_text(json.dumps(result,indent=2)+'\n')
        print(result)
    if args.analyze_difficulty:
        result=difficulty_analysis()
        (OUT/'difficulty-analysis.json').write_text(json.dumps(result,indent=2)+'\n')
        print({k:v for k,v in result.items() if k!='cases'})
    if args.export:
        print(export_spec())


if __name__=='__main__':
    main()
