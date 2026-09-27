#!/usr/bin/env python3
"""Catapult authored configurations and exact native frame-state transfer rules.

An event/phase model, not a wall-clock emulation of the Windows animation engine.
"""
from pathlib import Path
import argparse, hashlib, json, math, struct
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'local/analysis/island-odyssey-catapult'
EXE=ROOT/'local/discs/island-odyssey/HD/Win/Zoombinis Island Odyssey.exe'
SOURCE_HASHES={'HD/Win/Zoombinis Island Odyssey.exe':'619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2','HD/scripts/z3a1.mps':'db1d9468eac09275c52a37e43b34c17c09589664d7270d8aad40576fc2d4b278','HD/scripts/z3a1.xml':'4adf21175ec4bb42b8a85523f34057e233f4f690c9476c8efd7a6f754c6fae4a'}
TABLES={'catcher_type':(0x44fdec,13),'catcher_count':(0x44fe20,13),'cam_type':(0x44fe54,13),'cam_gear_type':(0x44fe88,13),'catcher_initial_offset':(0x44fca8,13),'catcher_resource':(0x44fc48,3),'gear_resource':(0x44febc,13),
'catcher_reset_lower':(0x44fcdc,3),'catcher_release_a':(0x44fce8,3),'catcher_release_b':(0x44fcf4,3),'bucket_offset_by_level':(0x44fcfc,4),'bucket_accept_low_by_level':(0x44fd08,4),'bucket_accept_high_by_level':(0x44fd14,4),
'paddle_a':(0x44fd24,5),'paddle_b':(0x44fd38,5),'paddle_c':(0x44fd4c,5),'paddle_d':(0x44fd60,5),'paddle_e':(0x44fd74,5),'paddle_f':(0x44fd88,5),'cam_initial_frame':(0x44fda8,5),'paddle_y':(0x44fc7c,5),'paddle_y_offset':(0x44ff04,5),
'rolling_initial_mud':(0x44fdbc,3),'rolling_initial_rock':(0x44fdc8,3),'bucket_ride_initial_mud':(0x44fdd4,2),'bucket_ride_initial_rock':(0x44fddc,2),'bucket_ride_alignment':(0x44fde4,2)}


def sources():
    out=[]
    for name,expected in SOURCE_HASHES.items():
        path=ROOT/'local/discs/island-odyssey'/name;actual=hashlib.sha256(path.read_bytes()).hexdigest()
        if actual!=expected:raise ValueError(f'Unrecognized source {name}')
        out.append(dict(path=str(path.relative_to(ROOT)),sha256=actual))
    return out


def load_data():
    sources();raw=EXE.read_bytes()
    tables={name:list(struct.unpack_from('<'+'i'*n,raw,va-0x400000)) for name,(va,n) in TABLES.items()}
    manifest=json.loads((ROOT/'local/derived/island-odyssey/animations-manifest.json').read_text())
    animations={int(Path(a['source']).stem):dict(source=a['source'],sha256=a['sha256'],frames=a['declared_frame_count']) for a in manifest['animations'] if '/z3a1/' in a['source'] or '/z3a1cd/' in a['source']}
    return tables,animations


def configuration(level,dataset,data=None):
    if level not in (0,1,2,3) or not 0<=dataset<13:raise ValueError('Invalid level/dataset')
    if level==0:level,dataset=1,8
    t,a=data or load_data();typ=t['catcher_type'][dataset];n=t['catcher_count'][dataset]
    cam=0 if level==1 else t['cam_type'][dataset];camgear=0 if level==1 else t['cam_gear_type'][dataset]
    period=a[t['catcher_resource'][typ]]['frames'];spacing=period//(4 if n==-3 else n)
    bucket_resource=10457 if level==3 else 10456;bucket_period=a[bucket_resource]['frames'];bucket_step=bucket_period//6
    cam_period=a[10425+cam]['frames']
    return dict(level=level,dataset=dataset,catcher_type=typ,catcher_count=abs(n),catcher_count_raw=n,catcher_period=period,
        catcher_initial_frames=[t['catcher_initial_offset'][dataset]+1+i*spacing for i in range(abs(n))],
        catcher_missing_fourth=(n==-3),cam_type=cam,cam_gear_type=camgear,cam_period=cam_period,cam_reversed=level!=3,cam_initial_frame=t['cam_initial_frame'][cam],
        bucket_period=bucket_period,bucket_initial_frames=[bucket_step//2+t['bucket_offset_by_level'][level]+1+i*bucket_step for i in range(6)],
        paddle_y=t['paddle_y'][cam]+(t['paddle_y_offset'][cam] if level!=3 else 0),
        phase_period=math.lcm(period,bucket_period,cam_period),
        resources=dict(catcher=t['catcher_resource'][typ],cam=10425+cam,bucket=bucket_resource,
            catcher_gear=10435+t['gear_resource'][dataset],cam_gear=10476+camgear,
            mud_rolling=10440+typ,rock_rolling=10446+typ,mud_bucket_ride=10444 if level==3 else 10443,rock_bucket_ride=10450 if level==3 else 10449))


def select_dataset(done,draws):
    """MPS1984..2046. Draws are inclusive RandomNumber(1,65) outputs."""
    if len(done)!=13:raise ValueError('Expected13 flags')
    done=list(done)
    if all(done):done=[False]*13
    consumed=[]
    for value in draws:
        if not 1<=value<=65:raise ValueError('Draw outside1..65')
        consumed.append(value)
        for i in range(1,14):
            if (value<5*i and not done[i-1]) or value==5*i:
                done[i-1]=True
                return dict(dataset=i-1,done=done,draws=consumed)
    raise ValueError('Draw sequence ended during rejection retry')


def release_gate(config,frames,used,tables):
    """Inspect catchers in ascending index, mutating use flags exactly."""
    typ=config['catcher_type'];used=list(used)
    for i,frame in enumerate(frames):
        if frame is None:continue
        if tables['catcher_reset_lower'][typ]<frame<tables['catcher_release_a'][typ]:used[i]=False
        if frame in (tables['catcher_release_a'][typ],tables['catcher_release_b'][typ]) and not used[i]:
            used[i]=True;return i,used
    return None,used


def bucket_gate(level,frames,tables):
    lo=tables['bucket_accept_low_by_level'][level];hi=tables['bucket_accept_high_by_level'][level]
    return next((i for i,f in enumerate(frames) if f is not None and lo<=f<=hi),None)


def paddle_intervals(config,tables):
    cam=config['cam_type'];p=config['cam_period'];v=[tables['paddle_'+k][cam] for k in 'abcdef']
    if config['level']==3:return [(v[0],v[1]),(v[2],v[3]),(v[4],v[5])]
    return [(p-v[1]+1,p-v[0]+1),(p-v[3]+1,p-v[2]+1),(p-v[5]+1,p-v[4]+1)]


def paddle_gate(config,frame,tables):
    return 1 if any(lo<=frame<=hi for lo,hi in paddle_intervals(config,tables)) else 2


def update_outcome(state,kind,delivered):
    """Finite boulder budget; mud is unbounded and cannot pass a token."""
    if kind not in ('mud','rock'):raise ValueError(kind)
    if kind=='mud':return 'splat' if delivered else 'splash'
    if state['remaining']<=0:raise ValueError('No unresolved boulders')
    state['remaining']-=1
    if delivered:state['passed']+=1
    return ('finishedCorrect' if delivered else 'finishedIncorrect') if state['remaining']==0 else ('correct' if delivered else 'incorrect')


class Oracle:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn.x86_const import UC_X86_REG_ECX,UC_X86_REG_EBX,UC_X86_REG_EBP,UC_X86_REG_ESI,UC_X86_REG_EDI
        self.R=(UC_X86_REG_ECX,UC_X86_REG_EBX,UC_X86_REG_EBP,UC_X86_REG_ESI,UC_X86_REG_EDI)
        self.m=m=NativeOracle('island-odyssey');m.uc.mem_map(0,4096);self.obj=m.alloc(0x400)
        self.anims=[m.alloc(0x200) for _ in range(6)];self.frame_map={}
        m.hook_import('?getFrame@OMAnimation@@QBEHXZ',lambda m:self.frame_map[m.reg(UC_X86_REG_ECX)])
        m.hook(0x41bdc5,lambda m:m.reg(UC_X86_REG_EBX))
        m.hook(0x41c2b9,lambda m:0xffffffff)
        m.hook(0x41a4c7,lambda m:m.reg(UC_X86_REG_EBP))
        m.hook(0x41a446,lambda m:0xffffffff)
        m.hook(0x41c374,lambda m:1)
        m.hook(0x41c3a7,lambda m:2)
    def setup(self,level,dataset):
        m=self.m;m.write(self.obj,b'\0'*0x400)
        m.write_u32(self.obj+0x2a0,level);m.write_u32(self.obj+0x2b0,dataset)
        m.call(0x4185b0,ecx=self.obj)
        return list(struct.unpack('<7i',m.read(self.obj+0x2a0,28)))
    def release(self,config,frames,used):
        m=self.m;self.setup(config['level'],config['dataset'])
        m.write_u32(self.obj+0x2b4,len(frames))
        for i,f in enumerate(frames):
            m.write_u32(self.obj+0x1f4+4*i,self.anims[i] if f is not None else 0)
            m.write_u32(self.obj+0x214+4*i,used[i]);self.frame_map[self.anims[i]]=f
        n=m.call(0x41bd47,registers={self.R[3]:self.obj})
        return (None if n==0xffffffff else n),[bool(m.u32(self.obj+0x214+4*i)) for i in range(len(frames))]
    def bucket(self,level,frames):
        m=self.m;m.write_u32(self.obj+0x2a0,level);m.write_u32(self.obj+0x2b8,len(frames))
        for i,f in enumerate(frames):
            m.write_u32(self.obj+0x258+4*i,self.anims[i] if f is not None else 0);self.frame_map[self.anims[i]]=f
        n=m.call(0x41a3ed,registers={self.R[4]:self.obj,self.R[2]:0})
        return None if n==0xffffffff else n
    def paddle(self,config,frame):
        from unicorn.x86_const import UC_X86_REG_EAX
        m=self.m;m.write_u32(self.obj+0x2a0,config['level']);m.write_u32(self.obj+0x2a8,config['cam_type'])
        return m.call(0x41c2d5,[0,0,0,frame],registers={self.R[3]:self.obj,UC_X86_REG_EAX:config['cam_period']})
    def input_blocked(self,frame):
        m=self.m;node=m.alloc(12)
        m.write_u32(self.obj+0x19c,node if frame is not None else 0);m.write_u32(node,self.anims[0]);self.frame_map[self.anims[0]]=frame
        return bool(m.call(0x41a250,[0],ecx=self.obj))


def validate():
    data=load_data();t,a=data;o=Oracle();counts=dict(native_configurations=0,native_release_phases=0,native_bucket_phases=0,native_paddle_phases=0,native_input_cases=0,selector_cases=0,outcome_cases=0)
    records=[]
    for level in (0,1,2,3):
        for ds in range(13):
            c=configuration(level,ds,data)
            assert o.setup(level,ds)==[c['level'],c['catcher_type'],c['cam_type'],c['cam_gear_type'],c['dataset'],c['catcher_count_raw'],6]
            counts['native_configurations']+=1
            if level==0:continue
            for tick in range(c['catcher_period']):
                frames=[(f-1+tick)%c['catcher_period']+1 for f in c['catcher_initial_frames']]
                for used in ([False]*len(frames),[True]*len(frames)):
                    assert o.release(c,frames,used)==release_gate(c,frames,used,t),(level,ds,tick)
                    counts['native_release_phases']+=1
            for frame in range(0,c['cam_period']+2):
                assert o.paddle(c,frame)==paddle_gate(c,frame,t),(level,ds,frame)
                counts['native_paddle_phases']+=1
            records.append(c|dict(paddle_active_intervals=paddle_intervals(c,t)))
    for level in (1,2,3):
        p=216 if level!=3 else 108
        for tick in range(p):
            frames=[(tick+i*p//6)%p+1 for i in range(6)]
            assert o.bucket(level,frames)==bucket_gate(level,frames,t),(level,tick)
            counts['native_bucket_phases']+=1
    for frame in [None]+list(range(51)):
        assert o.input_blocked(frame)==(frame is not None and frame<4)
        counts['native_input_cases']+=1
    # Every history flag combination and each single raw draw: exact selector bins.
    distribution=[]
    for mask in range(1<<13):
        done=[bool(mask&(1<<i)) for i in range(13)];weights=[0]*13;rejected=0
        for value in range(1,66):
            try:r=select_dataset(done,[value]);weights[r['dataset']]+=1
            except ValueError:rejected+=1
            counts['selector_cases']+=1
        assert sum(weights)+rejected==65
        if mask in (0,1,3,4095,8191):distribution.append(dict(mask=mask,accepted_draw_counts=weights,rejected_draws=rejected))
    for tokens in (1,5,12):
        for successes in range(tokens+1):
            s=dict(remaining=tokens,passed=0)
            for i in range(tokens):
                result=update_outcome(s,'rock',i<successes)
                assert result.startswith('finished')==(i==tokens-1)
            assert s==dict(remaining=0,passed=successes);counts['outcome_cases']+=1
    result=dict(status='passed',counts=counts,source_exe_sha256=o.m.sha256,configurations=records,selector_examples=distribution,
        scope='Full original parameter loader; original unmodified instruction blocks for catcher, bucket and paddle gates; full original input-spacing predicate. External current animation frames are supplied as data. No clock, display or movement DLL execution.',
        selector_scope='Exhaustive pure-model coverage of 8192 history masks and 65 draw outcomes; based on decoded MPS control flow, not a second interpreter or native script VM.',
        entrypoints=['0x4185b0','0x41bd47..0x41bdc5/0x41c2b9','0x41a3ed..0x41a4c7/0x41a446','0x41c2d5..0x41c374/0x41c3a7','0x41a250'])
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'native-validation.json').write_text(json.dumps(result,indent=2)+'\n')
    return result


def export_spec():
    from spec_io_mps import decode
    evidence=sources();t,a=load_data();OUT.mkdir(parents=True,exist_ok=True)
    script=decode(ROOT/'local/discs/island-odyssey/HD/scripts/z3a1.mps')
    (OUT/'decoded-script.json').write_text(json.dumps(script,indent=2)+'\n')
    configs=[]
    for level in (1,2,3):
        for ds in range(13):
            c=configuration(level,ds,(t,a));intervals=paddle_intervals(c,t)
            c.update(paddle_active_intervals=intervals,paddle_active_frame_count=sum(paddle_gate(c,f,t)==1 for f in range(1,c['cam_period']+1)),
                catcher_release_frame=t['catcher_release_a'][c['catcher_type']],catcher_reset_open_interval=[t['catcher_reset_lower'][c['catcher_type']],t['catcher_release_a'][c['catcher_type']]],
                bucket_accept_inclusive=[t['bucket_accept_low_by_level'][level],t['bucket_accept_high_by_level'][level]])
            configs.append(c)
    tables={k:dict(va=hex(TABLES[k][0]),file_offset=TABLES[k][0]-0x400000,values=v) for k,v in t.items()}
    (OUT/'authored-configurations.json').write_text(json.dumps(dict(sources=evidence,tables=tables,configurations=configs,animation_metadata=a),indent=2)+'\n')
    report_path=OUT/'native-validation.json';report=json.loads(report_path.read_text()) if report_path.exists() else {}
    spec=dict(schema_version=1,game='island-odyssey',id='island-odyssey-z3a1',name='The Catapult',
        state=dict(mathematical_object='Ordered two-symbol input word (boulder/mudball) processed by periodic catcher, bucket and cam gates.',
            dynamic=['FIFO chute items with current frames/rectangles and pause flags','Catcher use flags, preventing a second release on the same frame','Running/stopped gear state and current animation frames','Rolling, bucket-riding and falling items, including vertical position and bounce state','Finite unresolved boulders and passed Zoombinis'],
            phase_contract='Frames are one-based current OMAnimation sequence frames. The external animation engine supplies advancement and movement coordinates; this specification exposes the exact decision function at each callback/update.',
            native_layout={'level':'+0x2a0','catcher_type':'+0x2a4','cam_type':'+0x2a8','cam_gear_type':'+0x2ac','dataset':'+0x2b0','catcher_count':'+0x2b4','bucket_count':'+0x2b8','unresolved_rocks':'+0x2c0','catcher_animations':'+0x1f4','catcher_use_flags':'+0x214','cam_animation':'+0x24c','paddle':'+0x254','bucket_animations':'+0x258','scene_paused':'+0x2d4','gears_running':'+0x2f0'}),
        inputs=dict(level=[1,2,3],dataset='Native authored index 0..12; script-managed history selects the next visit.',incoming_tokens='At most 12, practice uses 12. One boulder per incoming Zoombini. Empty scene skips play.',
            first_tutorial='Normal level 1 before Z3A1Level1DS1Done uses native level 0; loader converts this to level 1, dataset 8. Practice bypasses this override.'),
        actions=[dict(name='Queue boulder or mudball',rule='Click an available item. Reject while last queued animation is before frame 4; otherwise append and disable further interaction with that item. Mudball dispenser replenishes indefinitely; boulders are finite.'),
            dict(name='Toggle lever',rule='Toggle gear-run flag and associated animation pause states without resetting phase. Chute items continue moving/queuing when the gears are stopped; head transfer requires running gears.'),
            dict(name='Leave',rule='Go is enabled after at least one successful launch, so partial passage is permitted.')],
        feedback=dict(stages=[
            'Chute followers pause when overlapping their predecessor according to the native rectangle/circle proximity predicate; otherwise advance until the final chute frame (50).',
            'For a waiting head at final frame, running gear catchers are checked in ascending order. Reset its used flag only when reset_lower < frame < release_frame. An unused catcher at release_frame consumes the head and sets used. Types 0/1/2 release at frames 29/59/89.',
            'Consumed items enter a rolling animation. At its completion, inspect six big-wheel buckets in ascending order. The first current frame in the level-specific inclusive interval catches it; no eligible bucket means first-hole failure.',
            'A caught item rides with initial frame 1 + bucket_frame - (157 on levels 1/2, 80 on level 3). Mud and rock have distinct resource IDs but identical gate conditions.',
            'After the ride, the falling item can bounce only if the paddle is active as it approaches its configuration-specific vertical threshold. The native update sets its movement limit to that threshold while active, otherwise to 520. Once the bounce has occurred its flag prevents a second bounce.',
            'A boulder reaching the launch trigger passes one Zoombini. Either hole loses the boulder. Mudballs produce splat/splash feedback and never pass Zoombinis or decrement the boulder budget.'],
            exact_predicates='tools/spec_io_catapult.py: release_gate, bucket_gate, paddle_gate, update_outcome',
            paddle='Frame 1 is active, frame 2 inactive. Three inclusive frame intervals per cam are read directly from the executable; levels 1/2 reverse each interval through N-frame+1, level 3 uses forward intervals.'),
        success=dict(per_boulder='Delivered rock fires correct, or finishedCorrect when it is the final unresolved rock.',round='All incoming Zoombinis pass only if every boulder is delivered.',progression='Script correctGuess/autoLevel and initial tutorial completion require 12 passed tokens. Smaller incoming groups can complete without advancing the level.'),
        failure=dict(per_boulder='A lost rock fires incorrect, or finishedIncorrect for the last unresolved rock.',limit='One boulder per incoming token. No independent wrong-answer, timer or mudball limit.',partial='Successful launches are retained. One lost boulder makes all-token completion of that round impossible, while later boulders can still rescue remaining tokens.'),
        difficulty_levels=[
            dict(level=1,catcher_datasets=13,bucket_period=216,bucket_accept=[154,162],cam='Forced type 0, 72 frames, reversed, 39 active frames.',insight='Predict the relation between repeated small-wheel releases and big-wheel bucket arrivals; unlimited mudballs test a pattern before risking the finite rocks.'),
            dict(level=2,catcher_datasets=13,bucket_period=216,bucket_accept=[153,162],cam='Dataset chooses cam types 1..4, reversed. Duty cycles 43/72, 39/108, 37/144 or 80/144.',insight='Coordinate the first transfer with a second independent periodic paddle condition. Some regular small-wheel arrivals must be filled with sacrificial mudballs.'),
            dict(level=3,catcher_datasets=13,bucket_period=108,bucket_accept=[77,84],cam='Same dataset cam types as level 2, forward instead of reversed. Paddle vertical thresholds change for types 2..4.',insight='Big-wheel period halves, changing relative arrival phases; reversing the cam sequence changes which input positions are safe even for a familiar apparatus.')],
        generation=dict(status='authored_configuration_and_script_selector_decoded',native_entry='0x4185b0',signature='void RCatapultGame::loadParameters(); level/dataset fields supplied on object; no normal-path RNG calls.',
            configurations='local/analysis/island-odyssey-catapult/authored-configurations.json',configuration_count=39,
            selection=dict(order='gGetDataset reads current visit configuration before gNextDataset draws and saves the next visit configuration. First visit current dataset is 0 unless tutorial override applies.',history='Thirteen persistent done flags. All true clears all flags before selection.',draws='Repeated external RandomNumber(1,65), inclusive. For i=1..13 ascending, accept i-1 when draw < 5*i and flag[i-1] is false, or when draw == 5*i regardless of flag; set selected flag and stop. Retry only if no index accepts.',
                distinction='This is not an ordinary independent 5:1 weighted draw. A used bin retains its equality endpoint; its four interior outcomes flow forward to the next unfinished index or are rejected at the end.',rng_boundary='Exact input-draw order is modeled. External RandomNumber implementation and ambient full-session stream are not claimed.'),
            table_semantics='Negative catcher count -3 means three catchers using four-way spacing, leaving one slot empty; normal positive counts use period/count spacing. Initial phases are authored per dataset, not random.',
            phase_period='LCM of catcher, bucket and cam frame counts, reported per configuration. This is a simultaneous one-frame phase period, not measured wall-clock duration or a claim of full animation-engine synchronization.'),
        assets=dict(roots=['local/derived/island-odyssey/assets/z3a1','local/derived/island-odyssey/assets/z3a1cd'],configuration_bindings='authored-configurations.json resources and animation_metadata retain source payload hashes and frame counts.',chute={'mud':10401,'rock':10402,'frames':50},rolling='10440..10442 mud, 10446..10448 rock; periods 11/22/33 and initial frames 1/3/5.',bucket_rides='10443/10449: 114 frames; 10444/10450: 57 frames. Exact first-frame normalization is delegated to OMAnimation.',archive_provenance='local/derived/island-odyssey/assets-manifest.json retains archive offsets and payload hashes.'),
        evidence=evidence+[dict(kind='native',va='0x4185b0-0x41877f',meaning='Normal configuration loader and level-0 tutorial override.'),dict(kind='native',va='0x418780-0x419e4f',meaning='Apparatus/resource construction and phase setup.'),dict(kind='native',va='0x41bb80-0x41c8c9',meaning='Queue handling, catcher release, paddle state and falling item decisions.'),dict(kind='native',va='0x41a280-0x41b49f',meaning='Rolling/ride callbacks, rock/mud outcomes.'),dict(kind='native',va='0x41b4a0-0x41b5c3',meaning='Queue collision proximity predicate.'),dict(kind='MPS',instructions='1687-1688,1977-2046',meaning='Current/next dataset order and exact history-dependent selector.'),dict(kind='manual',pdf_pages=[16,17,33,34])],
        validation=dict(status=report.get('status','not_run'),counts=report.get('counts',{}),report=str(report_path.relative_to(ROOT)),report_sha256=hashlib.sha256(report_path.read_bytes()).hexdigest() if report else None,
            scope=report.get('scope'),selector_scope=report.get('selector_scope'),reproduction='research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_catapult.py --validate; python3 research/zoombinis/tools/spec_io_catapult.py --export'),
        open_questions=['Absolute frame rate, movement interpolation, out-of-range initial-frame normalization, and animation callback scheduling inside TCX/Trinket remain outside the supplied frame-state contract. Therefore no complete input-time-to-rescue simulator or verified winning timing sequence is claimed.','External script RandomNumber algorithm and complete session RNG history are not recovered here.'],
        completeness=dict(configuration_and_selection='complete_at_explicit_draw_boundary',native_frame_gates='complete_and_differentially_verified',scene_outcomes='decoded',all_shipped_difficulties=True,full_time_evolution='not_complete_external_animation_engine_boundary',full_game_runtime_parity=False))
    output=ROOT/'local/specs/island-odyssey/catapult.json';output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(spec,indent=2)+'\n')
    return dict(spec=str(output),completeness=spec['completeness'])

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--validate',action='store_true');p.add_argument('--export',action='store_true');p.add_argument('--dataset',type=int,default=0);p.add_argument('--level',type=int,default=1)
    args=p.parse_args();r=export_spec() if args.export else validate() if args.validate else configuration(args.level,args.dataset)
    print(json.dumps({k:v for k,v in r.items() if k!='configurations'},indent=2))
