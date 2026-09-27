#!/usr/bin/env python3
"""Snowboard Gulch event-state contract, without rendering or spline timing.

Transport supplies arrival, exit completion, collision contact, speech busy and
Norf animation busy. Event order and puzzle flags follow the original scene.
No assumption of one collision per descent or one opening per descent is made.
"""
import argparse
from copy import deepcopy
import hashlib
import itertools
import json
from spec_mr_snowboard_gulch import ROOT, SHA, Rand, route, open_route

OUT = ROOT / 'local/analysis/mountain-rescue-snowboard-gulch'
PHASES = {0:'first descents', 1:'install first opening', 2:'blockers active',
          3:'close pending', 4:'closed', 5:'collision speech'}


def new_state(level, rules, party, seed=0):
    if level not in (1,2,3) or not 1 <= len(party) <= 8:
        raise ValueError('Normal level 1..3 and party 1..8 required')
    return dict(level=level, rules=deepcopy(rules), party=deepcopy(party),
                available=list(range(len(party))), rescued=[], exit_pending=[],
                active=None, launch_ready=True, phase=0, descents=0,
                mistakes=0, collision_pair_count=0, pending_open=False,
                open_route=None, rng_state=seed & 0xffffffff, blocked=None)


def launch(state, character):
    s=deepcopy(state)
    if s['blocked'] or type(character) is not int or character not in s['available'] or not s['launch_ready']:
        raise ValueError('Character cannot launch')
    if s['active'] is not None and s['active'] not in s['available']:
        raise ValueError('A descent is active')
    s['active']=character
    # 42baad temporarily sets +38=1 for a one-actor histogram; 42bb1d
    # clears it before the descent, excluding this actor from future openings.
    s['available'].remove(character)
    s['launch_ready']=False
    return s, dict(route=route(s['rules'],s['party'][character]))


def tick(state, *, speech_busy=False, norf_busy=False, arrival=False,
         collision=False, completed_exits=()):
    """One logical scene tick with explicit transport observations.

    `norf_busy` means any of four queried Norf hit animations reports active.
    `collision` means geometric contact at the post-movement collision check;
    it is ignored outside phase2. `arrival` and `collision` are exclusive.
    Opening on an empty population returns an explicit nontermination state:
    the original has no terminating rejection result for that input.
    """
    s=deepcopy(state);events=[]
    if s['blocked']:
        raise ValueError('Original opening rejection cannot advance this state')
    if arrival and collision:
        raise ValueError('Arrival bypasses the collision check in this tick')
    for i in completed_exits:
        if i not in s['exit_pending']:
            raise ValueError('No pending exit for character')
        s['exit_pending'].remove(i)
        if i not in s['rescued']:s['rescued'].append(i)
        events.append(dict(kind='rescued',character=i))
    if s['phase']==4:
        return s,events

    def opening(reason):
        if not s['available']:
            s['blocked']='empty-population-opening-rejection'
            events.append(dict(kind='nonterminating_opening',reason=reason))
            return False
        result=open_route(s['rules'],s['party'],s['available'],s['rng_state'])
        s['open_route']=result['route'];s['rng_state']=result['rng_exit']
        events.append(dict(kind='opening',reason=reason,route=result['route'],rng_trace=result['rng_trace']))
        return True

    # The pending request is checked BEFORE phase1/3/5 processing.
    if s['phase']!=5 and s['pending_open'] and not norf_busy:
        if not opening('pending'):return s,events
        s['pending_open']=False
    if s['phase']==1:
        s['phase']=2
        if not opening('initial'):return s,events
    if s['phase']==3:
        s['phase']=4
        events.append(dict(kind='closed'))
    if s['phase']==5 and not speech_busy:
        s['phase']=2
        events.append(dict(kind='speech_finished'))
    # Native phase3->4 continues here; normal closure already cleared active.
    if s['launch_ready']:
        return s,events
    if s['active'] is None:raise ValueError('Moving state requires active actor')
    i=s['active']
    if arrival:
        if i in s['available']:s['available'].remove(i)
        s['descents']+=1
        if s['descents']==2:s['phase']=1
        if s['descents']<len(s['party']) and s['phase']==2:s['pending_open']=True
        if s['descents']==len(s['party']):
            s['phase']=4
            events.append(dict(kind='all_descended'))
        s['exit_pending'].append(i)
        events.append(dict(kind='exit_attached',character=i))
        if s['mistakes']>(2 if s['level']==1 else 4):
            s['available']=[];s['phase']=3
        s['active']=None;s['launch_ready']=True
    elif collision and s['phase']==2:
        rng=Rand(s['rng_state']);audio=rng.next(3)+1;s['rng_state']=rng.state
        s['mistakes']+=1;s['collision_pair_count']+=1
        if s['collision_pair_count']==2:
            s['pending_open']=True;s['collision_pair_count']=0
        s['phase']=5
        events.append(dict(kind='collision',character=i,audio_variant=audio,rng_trace=rng.trace))
    return s,events


class EventOracle:
    """Execute original event blocks; transport/rendering calls are bounded stubs."""
    def __init__(self):
        from spec_mr_snowboard_gulch import Oracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import (UC_X86_REG_EAX,UC_X86_REG_EBX,UC_X86_REG_ECX,
             UC_X86_REG_EDX,UC_X86_REG_EDI,UC_X86_REG_ESI,UC_X86_REG_EIP)
        self.base=Oracle();self.m=m=self.base.m
        self.R=dict(eax=UC_X86_REG_EAX,ebx=UC_X86_REG_EBX,ecx=UC_X86_REG_ECX,
                    edx=UC_X86_REG_EDX,edi=UC_X86_REG_EDI,esi=UC_X86_REG_ESI,eip=UC_X86_REG_EIP)
        self.render=m.alloc(32);m.write_u32(self.render+4,self.render)
        self.open_calls=[];self.attached=[];self.speech_busy=False;self.norf_busy=False
        self.reject_launch=False
        m.hook(0x45a250,lambda q:int(self.norf_busy if 100<=q.arg(0)<104 else True),pop=4)
        for addr,pop in [(0x45a2a0,12),(0x45a170,4),(0x456c20,8),
                         (0x42c2f0,0),(0x468b40,0),(0x468f30,0),(0x461010,0),
                         (0x46c16c,4),(0x46cc6f,0)]:m.hook(addr,lambda q:0,pop=pop)
        m.hook(0x468f80,lambda q:int(self.speech_busy))
        def attach(q):
            self.attached.append(q.u32(self.base.scene+0x2c))
            # Transport boundary. Original attachment's +114 write is checked
            # separately; allocating/rendering spline objects is excluded.
            q.write(self.base.scene+0x114,b'\1');return 0
        m.hook(0x42be70,attach,pop=12)
        def point(uc,a,size,data):
            if a==0x42b7d0:self.open_calls.append(None)
            elif a==0x42b8b4:self.open_calls[-1]=m.reg(self.R['edi'])-3
            elif a==0x42bcde:
                self.reject_launch=True;uc.reg_write(self.R['eip'],0x42ba39)
            elif a==0x42c684:uc.reg_write(self.R['eip'],0x42c89c) # closed ambient celebration only
        for addr in (0x42b7d0,0x42b8b4,0x42bcde,0x42c684):
            m.uc.hook_add(UC_HOOK_CODE,point,begin=addr,end=addr)

    def load(self,state):
        self.state=deepcopy(state);o=self.base;m=self.m;s=o.scene
        o.histogram(state['level'],state['rules'],state['party'])
        m.write_u32(s+0x38,self.render);m.write_u32(s+0x19c,999)
        for i in range(4):m.write_u32(s+0x40+4*i,100+i)
        m.write_u32(0x4ad028,o.norfs);m.write(o.norfs,bytes(128))
        for j in range(4):m.write(o.norfs+24*j+0x14,bytes([state['open_route'] is not None and j!=state['open_route']]))
        for name,offset in [('phase',0x110),('mistakes',0x20),('collision_pair_count',0x34)]:m.write_u32(s+offset,state[name])
        m.write_u32(s+0x1c,2 if state['level']==1 else 4);m.write_u32(s+0xc,2)
        m.write_u32(s+0x2c,0xffffffff if state['active'] is None else state['active'])
        m.write(s+0x30,bytes([state['launch_ready']]));m.write(s+0x115,bytes([state['pending_open']]))
        m.write(s+0x10d,bytes([state['descents']]));m.write_u32(o.thread+0x14,state['rng_state'])
        for i,c in enumerate(o.chars[:len(state['party'])]):
            m.write(c+0x38,bytes([i in state['available']]))
            m.write(c+0x5c,bytes([i in state['rescued']]))
        m.write_u32(0x4e4d34,0)
        self.open_calls=[];self.attached=[];self.base.trace.clear()

    def snapshot(self,blocked=None):
        m=self.m;s=self.base.scene;n=len(self.state['party'])
        return dict(available=[i for i,c in enumerate(self.base.chars[:n]) if m.read(c+0x38,1)==b'\1'],
                    rescued=[i for i,c in enumerate(self.base.chars[:n]) if m.read(c+0x5c,1)==b'\1'],
                    active=None if m.u32(s+0x2c)==0xffffffff else m.u32(s+0x2c),
                    launch_ready=bool(m.read(s+0x30,1)[0]),phase=m.u32(s+0x110),
                    descents=m.read(s+0x10d,1)[0],mistakes=m.u32(s+0x20),collision_pair_count=m.u32(s+0x34),
                    pending_open=bool(m.read(s+0x115,1)[0]),rng_state=m.u32(self.base.thread+0x14),blocked=blocked)

    def launch(self,state,character):
        self.load(state);m=self.m;s=self.base.scene;self.reject_launch=False
        m.call(0x42b9ff,registers={self.R['eax']:self.base.chars[character],self.R['edi']:s},
               ecx=character,edx=self.base.vector,stop_at=0x42ba39)
        if self.reject_launch:return None
        m.call(0x42bb0e,registers={self.R['edi']:s},stop_at=0x42bb21)
        m.call(0x42bc3f,registers={self.R['edi']:s,self.R['eax']:route(state['rules'],state['party'][character])+3},stop_at=0x42bc46)
        return self.snapshot()

    def tick(self,state,**inputs):
        self.load(state);m=self.m;s=self.base.scene
        self.speech_busy=inputs.get('speech_busy',False);self.norf_busy=inputs.get('norf_busy',False)
        for i in inputs.get('completed_exits',()):
            from unicorn.x86_const import UC_X86_REG_EBP
            m.call(0x42c64a,registers={self.R['esi']:s,UC_X86_REG_EBP:i},stop_at=0x42c66a)
        try:m.call(0x42c679,registers={self.R['esi']:s},stop_at=0x42c89c,max_instructions=30000)
        except RuntimeError as error:
            if not self.open_calls or self.open_calls[-1] is not None or self.snapshot()['available']:
                raise
            if 'budget exhausted' not in str(error):raise
            assert len(self.base.trace)>20
            return self.snapshot('empty-population-opening-rejection'),dict(openings=self.open_calls,attached=[],bounded_rejections=len(self.base.trace))
        if not state['launch_ready'] and state['phase']!=4:
            if inputs.get('arrival'):
                m.call(0x42ca66,registers={self.R['esi']:s,self.R['ebx']:2},stop_at=0x42cccf)
            elif inputs.get('collision') and m.u32(s+0x110)==2:
                m.call(0x42cf89,registers={self.R['esi']:s},stop_at=0x42cff4)
                m.call(0x42d006,registers={self.R['esi']:s},stop_at=0x42d037)
        return self.snapshot(),dict(openings=self.open_calls,attached=self.attached)


def compare(expected,actual):
    for key,value in actual.items():
        # A nonterminating native rejection keeps consuming RNG; its budgeted
        # sample has no final RNG state to compare to the symbolic model.
        if key=='rng_state' and actual['blocked']:continue
        want=sorted(expected[key]) if key in ('rescued','available') else expected[key]
        assert want==value,(key,want,value,expected)


def validate():
    oracle=EventOracle();cases=[];launch_cases=0;event_cases=0;stalls=0
    rules=[dict(axis=0,values=[1]),dict(axis=1,values=[1]),dict(axis=1,values=[1])]
    party=[[1,1,1,1],[1,2,1,1],[2,1,1,1],[2,2,1,1]]*2
    # Exhaustive finite control combinations with an active actor. Prepared
    # states are diagnostic, not a claim every one is reachable by shipped timing.
    for level,phase,pending,speech,norf,arrival,collision in itertools.product((1,2,3),range(6),(False,True),(False,True),(False,True),(False,True),(False,True)):
        if arrival and collision:continue
        s=new_state(level,rules,party,17);s.update(phase=phase,pending_open=pending,active=2,launch_ready=False,available=[3,4,5,6,7],descents=2,open_route=0,mistakes=2 if level==1 else 4,collision_pair_count=1)
        inp=dict(speech_busy=speech,norf_busy=norf,arrival=arrival,collision=collision)
        expected,events=tick(s,**inp);actual,details=oracle.tick(s,**inp);compare(expected,actual)
        assert details['openings']==[e['route'] for e in events if e['kind']=='opening']
        assert details['attached']==[e['character'] for e in events if e['kind']=='exit_attached']
        event_cases+=1
    for level in (1,2,3):
        for n in (1,2,3,8):
            for ready,available in itertools.product((False,True),(False,True)):
                s=new_state(level,rules,party[:n]);s['launch_ready']=ready
                if not available:s['available'].remove(0)
                try:expected,_=launch(s,0)
                except ValueError:expected=None
                actual=oracle.launch(s,0)
                assert (expected is None)==(actual is None)
                if expected is not None:compare(expected,actual)
                launch_cases+=1
        # Native blank-population loop is deliberately instruction-bounded.
        for phase in (1,2,3):
            s=new_state(level,rules,party,1);s.update(phase=phase,available=[],pending_open=phase!=1,descents=7)
            expected,events=tick(s);actual,details=oracle.tick(s);compare(expected,actual);stalls+=1
            cases.append(dict(kind='empty-opening',level=level,phase=phase,events=events,details=details))
        # Last-costly descent still receives final success after budget closure.
        s=new_state(level,rules,party,1);s.update(phase=2,active=2,launch_ready=False,available=[3,4,5,6,7],descents=2,mistakes=2 if level==1 else 4,open_route=0)
        sequence=[]
        for inp in [dict(collision=True),dict(arrival=True,speech_busy=True),dict(completed_exits=[2],norf_busy=True)]:
            expected,events=tick(s,**inp);actual,details=oracle.tick(s,**inp);compare(expected,actual)
            sequence.append(dict(inputs=inp,events=events,state=expected));s=expected;event_cases+=1
        assert s['rescued']==[2] and s['phase']==4 and not s['available']
        cases.append(dict(kind='last-costly-descent',level=level,sequence=sequence))
        # Complete each exit, observe first two free descents, then deliberately
        # collide while speech spans arrival: no unconditional next-opening draw.
        s=new_state(level,rules,party,9);sequence=[]
        for i in range(3):
            expected,event=launch(s,i);actual=oracle.launch(s,i);compare(expected,actual);s=expected;launch_cases+=1
            if i==2:
                expected,events=tick(s,collision=True);actual,_=oracle.tick(s,collision=True);compare(expected,actual);s=expected;event_cases+=1
            for inp in [dict(arrival=True,speech_busy=True),dict(completed_exits=[i],speech_busy=True),dict(speech_busy=False),dict()]:
                expected,events=tick(s,**inp);actual,details=oracle.tick(s,**inp);compare(expected,actual)
                sequence.append(dict(inputs=inp,events=events,state=expected));s=expected;event_cases+=1
        assert len([e for row in sequence for e in row['events'] if e['kind']=='opening'])==1
        cases.append(dict(kind='speech-spans-arrival',level=level,sequence=sequence))
    # Final arrival and final success across small parties, speech phases and
    # both sides of the budget threshold; all-descended does not cancel exit.
    for level,n,phase,budget_side in itertools.product((1,2,3),(1,2,3,8),(0,2,5),(-1,0,1)):
        s=new_state(level,rules,party[:n],71)
        s.update(phase=phase,active=n-1,launch_ready=False,available=[],descents=n-1,
                 mistakes=(2 if level==1 else 4)+budget_side,open_route=0)
        for inp in [dict(arrival=True,speech_busy=True),dict(completed_exits=[n-1],norf_busy=True)]:
            expected,events=tick(s,**inp);actual,details=oracle.tick(s,**inp);compare(expected,actual)
            assert details['attached']==[e['character'] for e in events if e['kind']=='exit_attached']
            s=expected;event_cases+=1
        assert n-1 in s['rescued'] and s['phase']==4
    from native_inspect import NativeImage
    im=NativeImage('mountain-rescue');evidence=[]
    for name,start,end in [('launch-control',0x42b9ff,0x42bb21),('launch-flags',0x42bc3f,0x42bc46),('tick-prefix',0x42c4c0,0x42c89c),('arrival',0x42ca66,0x42cccf),('collision',0x42cf89,0x42d037),('opening-rejection',0x42b848,0x42b8b4),('exit-attachment',0x42c1ed,0x42c1ff)]:
        filename=f'events-{name}.txt';(OUT/filename).write_text(im.disassembly(start,end-start)+'\n')
        evidence.append(dict(path=str((OUT/filename).relative_to(ROOT)),virtual_start=hex(start),virtual_end_exclusive=hex(end),sha256=hashlib.sha256((OUT/filename).read_bytes()).hexdigest()))
    report=dict(status='passed',source_sha256=SHA,native_launch_cases=launch_cases,native_event_cases=event_cases,
                native_empty_population_cases=stalls,failures=[],evidence=evidence,
                model='tools/spec_mr_snowboard_events.py:launch/tick',
                boundary='Original launch eligibility/availability, ordered phase prefix, real opening RNG/histogram, arrival/closure, collision counter and audio RNG, exit success writes. Explicit transport observations; spline, renderer and actual sound duration excluded. Empty opening executes a bounded native rejection trace; nontermination follows zero population and the loop having no fallback.',
                stubs=['Norf animation busy query45a250 supplied as input; rendering45a2a0/45a170/456c20 and chart42c2f0 suppressed','Audio presentation468b40/468f30/46c16c, formatting46cc6f, scene effect461010 suppressed; speech query468f80 supplied as input','Exit allocation42be70 records attachment and sets transport flag; success writes run original42c64a. Original attachment flag write is preserved in source evidence.','Closed-phase celebration42c684 skipped; its ambient RNG is outside event entry parity.','Inherited native Oracle allocation/free/thread accessor boundaries apply.'])
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'event-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    (OUT/'event-witnesses.json').write_text(json.dumps(cases,indent=2)+'\n')
    contract=dict(schema_version=1,source_sha256=SHA,phase_values=PHASES,
        source_fields={'phase':'scene+110 dword','launch_ready':'scene+30 byte','active_index':'scene+2c signed dword, -1 absent',
                       'descents':'scene+10d byte','mistakes':'scene+20 dword','mistake_threshold':'scene+1c dword, 2/4/4',
                       'collision_pair_count':'scene+34 dword','pending_open':'scene+115 byte','exit_active':'scene+114 byte',
                       'launch_eligible':'character+38 byte','success':'character+5c byte'},
        tick_order=['Finish supplied exit paths first, writing character success even if phase is closed.',
                    'Phase4 exits puzzle logic; only excluded ambient celebrations follow.',
                    'If phase!=5 and opening pending, wait while any of four Norf hit animations is busy; otherwise select an opening, then clear pending.',
                    'Phase1 changes to2 and selects first opening. Phase3 changes to4. Phase5 changes to2 only when speech is no longer busy.',
                    'If a descent is active, process supplied movement arrival; otherwise process supplied contact only in phase2.'],
        launch='Native eligibility uses character+38 and scene+30, plus current-index guard. Classification temporarily sets +38=1 for a one-character histogram, but launch clears +38 before movement; active descender is excluded from all later opening populations.',
        arrival='Increment descents. Exactly2 sets phase1; any nonfinal arrival in phase2 sets pending. Final arrival sets phase4. Install exit path before budget check. Over-budget disables all launch eligibility and sets phase3. Clear active index and allow launch input (remaining flags still govern eligibility).',
        collision='A geometric contact in phase2 consumes one audio rand()%3+1, increments mistakes and pair counter. Every second collision requests opening and resets pair counter. Enter phase5. Core control has no one-collision-per-descent flag; actual contacts depend on supplied motion.',
        demonstrated_outcomes=['Last costly descender still receives success after budget closure.',
                               'Arrival during phase5 need not request a new opening; subsequent speech completion alone does not create one.',
                               'Phase5 suppresses pending opening before its speech-completion transition, so an unblocked pending request runs no earlier than the next tick.',
                               'Opening selection runs before phase3 closes, and has no empty-population fallback. With no launchable characters it keeps rejecting forever; API exposes a nonterminating state rather than hanging.',
                               'Busy inputs can postpone or suppress a pending opening when phase3 transitions to4.'],
        boundary='Exact core event transitions for supplied transport observations. Whether a particular busy/contact/arrival ordering occurs with shipped audio, animation and spline timing is not claimed; diagnostic empty-population states are not asserted to be reachable in ordinary play.',
        validation='local/analysis/mountain-rescue-snowboard-gulch/event-validation.json',
        witnesses='local/analysis/mountain-rescue-snowboard-gulch/event-witnesses.json')
    (OUT/'event-contract.json').write_text(json.dumps(contract,indent=2)+'\n')
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--validate',action='store_true');args=parser.parse_args()
    if args.validate:print(json.dumps(validate(),indent=2))
