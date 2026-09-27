#!/usr/bin/env python3
"""Static reconstruction of Island Odyssey Greenhouse board generation.

Reads local source templates; never runs the game. Core corresponds to
0x405110 through 0x4052b7, with XML loader/transform 0x404ea0/0x404c10.
Later random lists are reconstructed separately from 0x4052d0.
"""
from __future__ import annotations
import argparse
from collections import Counter, deque
import hashlib
import json
from pathlib import Path
import statistics
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = ROOT / 'local/discs/island-odyssey/HD/scripts/z3a4data.xml'
EXE = ROOT / 'local/discs/island-odyssey/HD/Win/Zoombinis Island Odyssey.exe'
OUT = ROOT / 'local/analysis/island-odyssey'
SHIFTS = (0, 2, 5)
MASKS = (3, 7, 7)
CHANNELS = ('leaf_count', 'flower_shape', 'flower_color')
SOURCE_HASHES = {
    'source_exe_sha256': '619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2',
    'template_sha256': 'cc09b738e07999301cc96555840d9e1cc6a738457560d8fc9e636e9618269274',
}


def source_metadata():
    actual = dict(source_exe_sha256=hashlib.sha256(EXE.read_bytes()).hexdigest(),
                  template_sha256=hashlib.sha256(TEMPLATES.read_bytes()).hexdigest())
    if actual != SOURCE_HASHES:
        raise ValueError(f'Unsupported source version: {actual}')
    return dict(schema_version=1, **actual,
                core_va='0x405110', core_stop_va='0x4052b7',
                random_list_va='0x4052d0', pe_image_base='0x400000')


class MsvcrtRandom:
    """MSVCRT-compatible generator; Wine misc.c corroborates recurrence.

    The disc imports rand/srand instead of supplying MSVCRT.dll; this models
    that dependency and exposes every call for differential checking.
    """
    def __init__(self, seed, trace=False):
        self.state = seed & 0xffffffff
        self.calls = 0
        self.trace = [] if trace else None

    def rand(self, purpose=''):
        self.state = (self.state * 214013 + 2531011) & 0xffffffff
        value = (self.state >> 16) & 0x7fff
        self.calls += 1
        if self.trace is not None:
            self.trace.append(dict(call=self.calls, purpose=purpose, value=value, state=self.state))
        return value


def load_templates(path=TEMPLATES):
    raw = path.read_bytes()
    if path == TEMPLATES and hashlib.sha256(raw).hexdigest() != SOURCE_HASHES['template_sha256']:
        raise ValueError('Unsupported Greenhouse template version')
    root = ET.fromstring(raw)
    result = {}
    for group in root:
        count = int(group.tag.removeprefix('Template'))
        result[count] = dict(num=int(group.attrib['Num']), children={})
        for node in group:
            grid = [[int(x) for x in node.attrib[f'line{i}'].split()] for i in range(1,13)]
            if len(grid) != 12 or any(len(row) != 12 for row in grid):
                raise ValueError('Templates must be 12 by 12')
            result[count]['children'][node.tag] = dict(grid=grid, BE=node.attrib.get('BE'))
    return result


def transform(grid, code):
    if code == 1:
        return [list(reversed(row)) for row in grid]
    if code == 2:
        return [row[:] for row in reversed(grid)]
    if code == 3:
        return [list(reversed(row)) for row in reversed(grid)]
    if code == 90:
        return [list(row) for row in zip(*reversed(grid))]
    return [row[:] for row in grid]


def random_list(rng, count, start, purpose):
    """Exact 0x4052d0: 10*n independent swaps, including self-swaps."""
    result = list(range(start, start + count))
    for i in range(10 * count):
        a = rng.rand(f'{purpose}:swap{i}:a') % count
        b = rng.rand(f'{purpose}:swap{i}:b') % count
        result[a], result[b] = result[b], result[a]
    return result


def channels(cell):
    return tuple((cell >> shift) & mask for shift, mask in zip(SHIFTS, MASKS))


def generate(seed, level, templates=None, trace=False, random_lists=True):
    """Generate packed core board; seed is the value passed to srand.

    In the original outer function a requested seed of zero is replaced by
    current time. This pure API deliberately treats zero as explicit srand(0).
    """
    if level not in (1, 2, 3):
        raise ValueError('level must be 1, 2, or 3')
    templates = templates or load_templates()
    counts = (3, 6, 6) if level == 3 else (3, 4, 5)
    rng = MsvcrtRandom(seed, trace)
    grid = [0] * 144
    selected = []
    for channel, (count, shift) in enumerate(zip(counts, SHIFTS)):
        group = templates[count]
        name = f'T{rng.rand(f"channel{channel}:template") % group["num"] + 1}'
        chosen = group['children'][name]
        code = 90 if level == 3 and channel == 0 else rng.rand(f'channel{channel}:transform') % 4
        transformed = transform(chosen['grid'], code)
        selected.append(dict(channel=CHANNELS[channel], template=f'Template{count}/{name}',
                             transform=code, BE=chosen['BE']))
        grid = [cell + (value << shift) for cell, value in zip(grid, sum(transformed, []))]
    zero_counts = [0, 0, 0]
    for index in range(144):
        for channel, (count, shift, mask) in enumerate(zip(counts, SHIFTS, MASKS)):
            if ((grid[index] >> shift) & mask) == 0:
                value = rng.rand(f'cell{index}:fill{channel}') % count + 1
                grid[index] = (grid[index] & ~(mask << shift)) | (value << shift)
                zero_counts[channel] += 1
    pre_shuffle = grid[:]
    swaps = []
    attempts = 0
    while level != 1 and len(swaps) < 20:
        a = rng.rand(f'board_swap{attempts}:a') % 144
        b = rng.rand(f'board_swap{attempts}:b') % 144
        attempts += 1
        if a == b or (level == 3 and (grid[a] & 3) != (grid[b] & 3)):
            continue
        grid[a], grid[b] = grid[b], grid[a]
        swaps.append([a, b])
    result = dict(seed=seed & 0xffffffff, level=level, dimensions=[12,12],
                  cardinalities=dict(zip(CHANNELS, counts)), selected_templates=selected,
                  zero_fills=dict(zip(CHANNELS, zero_counts)),
                  pre_shuffle_grid=pre_shuffle, grid=grid,
                  generation_swaps=swaps, candidate_swap_pairs=attempts,
                  rng_after_core=dict(calls=rng.calls, state=rng.state),
                  scope='packed board before deterministic path annotation; no running agents or UI')
    if random_lists:
        permutations = [random_list(rng,n,1,name) for n,name in zip(counts,CHANNELS)]
        order = random_list(rng,12,0,'moth_order_permutation')
        traits = []
        for i, perm in enumerate(permutations):
            if i == 0 and level == 3:
                continue
            for value in perm:
                traits.append(dict(channel=CHANNELS[i], value=value, encoded=value<<SHIFTS[i],
                                   display_trait_id=value+(0,3,9)[i]))
        result.update(trait_permutations=dict(zip(CHANNELS,permutations)),
                      moth_traits=traits, moth_order_permutation=order,
                      rng_after_random_lists=dict(calls=rng.calls,state=rng.state))
    if trace:
        result['rng_trace'] = rng.trace
    return result


def crossing(grid, channel, value, vertical=False):
    """Structural orthogonal reachability, not original moth navigation AI."""
    allowed = {i for i,cell in enumerate(grid) if channels(cell)[channel] == value}
    starts = sorted(i for i in allowed if (i//12 == 0 if vertical else i%12 == 0))
    goals = {i for i in allowed if (i//12 == 11 if vertical else i%12 == 11)}
    queue = deque(starts)
    parent = {i:None for i in starts}
    while queue:
        i = queue.popleft()
        if i in goals:
            path = []
            while i is not None:
                path.append(i)
                i = parent[i]
            return list(reversed(path))
        r,c=divmod(i,12)
        for r1,c1 in ((r-1,c),(r,c+1),(r+1,c),(r,c-1)):
            j=r1*12+c1
            if 0<=r1<12 and 0<=c1<12 and j in allowed and j not in parent:
                parent[j]=i;queue.append(j)
    return None


def metrics(result):
    counts=tuple(result['cardinalities'][name] for name in CHANNELS)
    records=[]
    for channel,count in enumerate(counts):
        for value in range(1,count+1):
            vertical = channel==0 and result['level']==3
            before=crossing(result['pre_shuffle_grid'],channel,value,vertical)
            after=crossing(result['grid'],channel,value,vertical)
            records.append(dict(channel=CHANNELS[channel], value=value,
                actor='beetle' if vertical else 'moth',
                before_crosses=before is not None, after_crosses=after is not None,
                shortest_crossing_edges=(len(after)-1) if after else None))
    # Undoing the actual scramble is a constructive <=20-swap certificate.
    restored=result['grid'][:]
    for a,b in reversed(result['generation_swaps']):
        restored[a],restored[b]=restored[b],restored[a]
    assert restored==result['pre_shuffle_grid']
    return dict(paths=records,
        moth_crossings_before=sum(x['actor']=='moth' and x['before_crosses'] for x in records),
        moth_crossings_after=sum(x['actor']=='moth' and x['after_crosses'] for x in records),
        beetle_crossings_after=sum(x['actor']=='beetle' and x['after_crosses'] for x in records),
        cells_changed=sum(a!=b for a,b in zip(result['grid'],result['pre_shuffle_grid'])),
        scramble_undo_witness=list(reversed(result['generation_swaps'])))


def certify_templates(output=OUT):
    """Witness every used fixed-template crossing before any random fill.

    Exhausting the allowed transforms proves pre-scramble reachability for
    every seed, because later fill only replaces zero entries. This checks
    graph paths, not the game's autonomous movement policy.
    """
    templates=load_templates()
    certificates=[]
    for count in (3,4,5,6):
        group=templates[count]
        for number in range(1,group['num']+1):
            name=f'T{number}'
            for code in ((0,1,2,3,90) if count==3 else (0,1,2,3)):
                grid=sum(transform(group['children'][name]['grid'],code),[])
                for value in range(1,count+1):
                    path=crossing([x<<2 for x in grid],1,value,code==90)
                    assert path, (count,name,code,value)
                    assert all(grid[i]==value for i in path)
                    assert all(abs(a//12-b//12)+abs(a%12-b%12)==1 for a,b in zip(path,path[1:]))
                    assert path[0]//12==0 and path[-1]//12==11 if code==90 else path[0]%12==0 and path[-1]%12==11
                    certificates.append(dict(template=f'Template{count}/{name}',
                        transform=code,value=value,direction='vertical' if code==90 else 'horizontal',
                        path=path,edges=len(path)-1))
    result=dict(**source_metadata(),status='passed',path_certificates=len(certificates),
                claim='All used transformed template traits have a crossing before zero fill.',
                certificates=certificates)
    output.mkdir(parents=True,exist_ok=True)
    (output/'greenhouse-template-path-certificates.json').write_text(json.dumps(result,indent=2)+'\n')
    return result


def analyze(samples, output=OUT):
    if samples<1:
        raise ValueError('samples must be positive')
    templates=load_templates()
    data=[]
    for level in (1,2,3):
        rows=[]
        for seed in range(1,samples+1):
            generated=generate(seed,level,templates)
            m=metrics(generated)
            rows.append(dict(seed=seed,initial_moth_crossings=m['moth_crossings_after'],
                preshuffle_moth_crossings=m['moth_crossings_before'],
                beetle_crossings=m['beetle_crossings_after'], cells_changed=m['cells_changed'],
                candidate_swap_pairs=generated['candidate_swap_pairs'],
                rng_core_calls=generated['rng_after_core']['calls']))
        data.append(dict(level=level,samples=samples,measurements=rows,
            summary={k:dict(min=min(x[k] for x in rows),max=max(x[k] for x in rows),
                            mean=statistics.mean(x[k] for x in rows),
                            histogram=dict(sorted(Counter(x[k] for x in rows).items())))
                     for k in rows[0] if k!='seed'}))
    output.mkdir(parents=True,exist_ok=True)
    metadata=dict(**source_metadata(),
        sample_seeds=[1,samples],method='MSVCRT-compatible PRNG; graph reachability, not behavioral moth-path parity',
        levels=data)
    (output/'greenhouse-difficulty-analysis.json').write_text(json.dumps(metadata,indent=2)+'\n')
    return metadata


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seed',type=int,default=1)
    parser.add_argument('--level',type=int,choices=(1,2,3),default=1)
    parser.add_argument('--trace',action='store_true')
    parser.add_argument('--samples',type=int,default=0)
    parser.add_argument('--certify-templates',action='store_true')
    parser.add_argument('--output',type=Path,default=OUT)
    args=parser.parse_args()
    if args.certify_templates:
        result=certify_templates(args.output)
        print(json.dumps({k:v for k,v in result.items() if k!='certificates'},indent=2))
    elif args.samples:
        stats=analyze(args.samples,args.output)
        print(json.dumps([dict(level=x['level'],summary=x['summary']) for x in stats['levels']],indent=2))
    else:
        result=generate(args.seed,args.level,trace=args.trace)
        result['source']=source_metadata()
        result['metrics']=metrics(result)
        args.output.mkdir(parents=True,exist_ok=True)
        target=args.output/f'greenhouse-level{args.level}-seed{args.seed}.json'
        target.write_text(json.dumps(result,indent=2)+'\n')
        print(target)


if __name__=='__main__':
    main()
