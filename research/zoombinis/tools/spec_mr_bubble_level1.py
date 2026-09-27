#!/usr/bin/env python3
"""Exact L1 builder traces plus independent candidate-selection verification.

The two roster builders remain original hash-checked code, not a claimed pure
Python port. The explicit entry-stack fill makes their scratch boundary visible.
"""
import argparse,hashlib,json,struct
from spec_mr_bubble_bumpers import Harness,Rand,OUT,SHA,authored_grid


def select_candidate(candidates):
    """441a8c..441b45: first strict maximum, early exit at exactly12."""
    best=None;best_quality=0
    for i,c in enumerate(candidates[:30]):
        if c['quality']==12:return i
        if c['quality']>best_quality:best=i;best_quality=c['quality']
    return best


class LevelOne:
    def __init__(self):
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX
        self.h=Harness();self.candidates=[];self.last_trace=1
        def candidate(uc,addr,size,data):
            h=self.h
            grid=h.snapshot()['cells']
            raw=struct.pack('<1152i',*sum(grid,[]))
            self.candidates.append(dict(quality=h.m.reg(UC_X86_REG_EAX),cells=grid,sha256=hashlib.sha256(raw).hexdigest(),
                                        rng_start=self.last_trace,rng_end=len(h.trace),rng_exit=h.m.u32(h.thread+20)))
            self.last_trace=len(h.trace)
        for addr in (0x441aad,0x441b17):self.h.m.uc.hook_add(UC_HOOK_CODE,candidate,begin=addr,end=addr)

    def generate(self,party,seed,stack_fill=0):
        if not 1<=len(party)<=8:raise ValueError('Normal incoming party1..8')
        h=self.h;h.init(party);m=h.m
        if not 0<=stack_fill<=255:raise ValueError('Stack fill is one byte')
        m.write(m.STACK+m.STACK_SIZE-0x10000,bytes([stack_fill])*0x10000)
        self.candidates=[];self.last_trace=1;h.trace.clear();m.write_u32(h.thread+20,seed)
        m.call(0x441a60,[1],ecx=h.obj,max_instructions=40000000,timeout_us=30000000)
        board=h.snapshot();index=select_candidate(self.candidates)
        # A zero-only quality sequence would read the uninitialized saved-grid
        # scratch. Do not replace that case with a fictional successful result.
        if index is None:raise ValueError('No positive candidate: native saved-grid scratch is unspecified')
        assert board['cells']==self.candidates[index]['cells']
        assert len(self.candidates)==30 or self.candidates[-1]['quality']==12
        assert all(c['quality']!=12 for c in self.candidates[:-1])
        assert h.trace[0]['rand']%2==m.u32(h.obj+8)
        return board|dict(level=1,party=party,seed=seed,variant=m.u32(h.obj+8),selected_candidate=index,
                          candidates=self.candidates,rng_state=m.u32(h.thread+20),rng_trace=h.trace.copy(),entry_stack_fill=stack_fill,
                          source_sha256=SHA,generator_backend='Original441a60 +441d70/442a30 with independent best-of30 selector; no complete independent builder-port claim.')


def validate(count=30):
    import random
    engine=LevelOne();cases=[];examples=[]
    for kind in ('mixed','twins','identical'):
        for n in (2,5,8):
            rnd=random.Random(730+n)
            party=[[rnd.randrange(1,6) for _ in range(4)] for _ in range(n)]
            if kind=='twins':party[-1]=party[0][:]
            if kind=='identical':party=[[1]*4 for _ in range(n)]
            for seed in range(count):
                board=engine.generate(party,seed)
                cases.append(dict(kind=kind,n=n,seed=seed,variant=board['variant'],candidate_count=len(board['candidates']),selected=board['selected_candidate'],
                                  qualities=[c['quality'] for c in board['candidates']],rng_calls=len(board['rng_trace']),rng_exit=board['rng_state']))
                if n==8 and seed<2:examples.append(board)
    # Independent selector exercises ties, early12 and the30-candidate cap.
    pure_cases=0
    for qualities in ([8,8,7],[5,9,9],[6,12,13],[1]*30+[12],[0,0,1],[0]*30):
        expected=[0,1,1,0,2,None][pure_cases]
        assert select_candidate([dict(quality=x) for x in qualities])==expected
        pure_cases+=1
    report=dict(status='passed',source_sha256=SHA,native_board_exports=len(cases),native_candidate_comparisons=sum(c['candidate_count'] for c in cases),
                pure_selector_cases=pure_cases,cases=cases,
                boundary='Native complete L1 generation, including all builder candidates and RNG. Independent selector checks final grid equals earliest strict maximum among up to30 candidates, or first quality12. Builders are exact source-backed exports at declared entry-stack fill0; independent full builder port outstanding.')
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'level1-parity.json').write_text(json.dumps(report,indent=2)+'\n')
    (OUT/'level1-examples.json').write_text(json.dumps(examples,indent=2)+'\n')
    return {k:v for k,v in report.items() if k!='cases'}


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--validate',action='store_true');p.add_argument('--count',type=int,default=30)
    p.add_argument('--party-json');p.add_argument('--seed',type=lambda s:int(s,0),default=0);p.add_argument('--stack-fill',type=lambda s:int(s,0),default=0);p.add_argument('--output')
    a=p.parse_args()
    if a.validate:print(json.dumps(validate(a.count),indent=2))
    if a.party_json:
        result=LevelOne().generate(json.loads(a.party_json),a.seed,a.stack_fill)
        if a.output:
            from pathlib import Path
            Path(a.output).write_text(json.dumps(result,indent=2)+'\n')
            print(json.dumps(dict(output=a.output,candidates=len(result['candidates']),selected=result['selected_candidate'])))
        else:print(json.dumps(result,indent=2))
