#!/usr/bin/env python3
"""Index the 24 detailed specifications without overwriting first-pass evidence.

This is a provenance/completeness check, not a claim of full-game parity. Each
family's explicit completeness boundary and open questions remain visible.
"""
import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path

from generator_catalog import ROOT, RECOVERIES, load_base_puzzles

REQUIRED = {'schema_version','game','id','name','state','inputs','actions','feedback',
            'success','failure','difficulty_levels','generation','assets','evidence',
            'validation','open_questions','completeness'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def reference(root, path):
    if not path.resolve().is_relative_to(root.resolve()) or not path.is_file():
        raise ValueError(f'Missing or escaped specification reference: {path}')
    return {'path':str(path.relative_to(root)), 'sha256':digest(path)}


def referenced_files(value, root):
    """Resolve explicit local/research paths, never prose or external locations."""
    found={}
    if isinstance(value,dict):
        for v in value.values():found.update(referenced_files(v,root))
    elif isinstance(value,list):
        for v in value:found.update(referenced_files(v,root))
    elif isinstance(value,str) and value.startswith(('local/','tools/','notes/')):
        # A callable reference such as tools/model.py:generate still binds the
        # containing model. Paths with spaces (including source EXEs) stay whole.
        candidate=value.split(':',1)[0]
        path=root/candidate
        if path.is_file():found[candidate]=reference(root,path)
        # Many fields describe directories or command lines. The required spec
        # and note files, and explicit validation report, are checked separately.
    return found


def build_overlay(local, puzzles, require_complete=True):
    root=local.parent
    base={(p['game'],p['id']) for p in puzzles}
    prior={(p['game'],p['puzzle_id']) for p in RECOVERIES}
    expected=base-prior
    found=set();entries=[]
    for path in sorted((local/'specs').glob('*/*.json')):
        spec=json.loads(path.read_text())
        missing=REQUIRED-set(spec)
        if missing:raise ValueError(f'{path}: missing fields {sorted(missing)}')
        if spec['schema_version']!=1:raise ValueError(f'Unsupported spec schema: {path}')
        key=(spec['game'],spec['id'])
        if key not in expected:raise ValueError(f'Unexpected specification game/id: {key}')
        if key in found:raise ValueError(f'Duplicate specification: {key}')
        if path.parent.name!=spec['game']:raise ValueError(f'Specification directory/game mismatch: {path}')
        if not spec['difficulty_levels'] or not spec['completeness']:
            raise ValueError(f'Empty difficulty/completeness contract: {key}')
        found.add(key)
        note=root/'notes/specs'/f'{spec["game"]}-{path.stem}.md'
        refs=referenced_files(spec,root)
        for required in (path,note):refs[str(required.relative_to(root))]=reference(root,required)
        # Several families embed their report data instead of naming a report.
        # Bind the complete family evidence directory as well, so later native
        # results cannot silently drift away from the indexed specification.
        analysis=local/'analysis'/f'{spec["game"]}-{path.stem}'
        for artifact in sorted(analysis.rglob('*')):
            if artifact.is_file():refs[str(artifact.relative_to(root))]=reference(root,artifact)
        prefix={'logical-journey':'lj','mountain-rescue':'mr','island-odyssey':'io'}[spec['game']]
        model=root/'tools'/f'spec_{prefix}_{path.stem.replace("-","_")}.py'
        if model.is_file():refs[str(model.relative_to(root))]=reference(root,model)
        report=spec['validation'].get('report') if isinstance(spec['validation'],dict) else None
        if report:
            report_path=root/report if report.startswith('local/') else local/report
            refs[str(report_path.relative_to(root))]=reference(root,report_path)
            claimed=spec['validation'].get('report_sha256',spec['validation'].get('sha256'))
            if claimed and digest(report_path)!=claimed:
                raise ValueError(f'Stale validation report hash in {path}')
        entries.append({'game':key[0],'puzzle_id':key[1],
                        'puzzle_specification':deepcopy(spec),
                        'references':sorted(refs.values(),key=lambda r:r['path'])})
    missing=sorted(expected-found)
    if require_complete and missing:raise ValueError(f'Missing specifications: {missing}')
    return {'schema_version':1,'kind':'puzzle-specification-overlay',
            'expected_count':len(expected),'actual_count':len(entries),
            'missing':[{'game':g,'puzzle_id':i} for g,i in missing],
            'full_game_parity':False,'entries':entries}


def verify_snapshots(local, overlay):
    root=local.parent
    for entry in overlay['entries']:
        for ref in entry['references']:
            path=root/ref['path']
            current=reference(root,path)
            if current['sha256']!=ref['sha256']:
                raise ValueError(f'Stale specification overlay for {ref["path"]}; rerun specification_catalog.py')


def merge_overlay(puzzles,overlay):
    if overlay.get('schema_version')!=1 or overlay.get('kind')!='puzzle-specification-overlay':
        raise ValueError('Unsupported puzzle-specification overlay schema')
    keys={(p['game'],p['id']) for p in puzzles}
    if len(keys)!=len(puzzles):raise ValueError('Duplicate base game/id')
    updates={}
    for entry in overlay['entries']:
        key=(entry['game'],entry['puzzle_id'])
        if key not in keys or key in updates:raise ValueError(f'Unmatched/duplicate specification overlay: {key}')
        spec=entry['puzzle_specification']
        if (spec['game'],spec['id'])!=key:raise ValueError(f'Specification identity mismatch: {key}')
        updates[key]=spec
    result=deepcopy(puzzles)
    for p in result:
        key=(p['game'],p['id'])
        if key in updates:
            if 'puzzle_specification' in p:raise ValueError(f'Existing specification field: {key}')
            p['puzzle_specification']=deepcopy(updates[key])
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--local',type=Path,default=ROOT/'local')
    p.add_argument('--allow-partial',action='store_true')
    args=p.parse_args()
    puzzles=load_base_puzzles(args.local)
    overlay=build_overlay(args.local,puzzles,not args.allow_partial)
    merge_overlay(puzzles,overlay);verify_snapshots(args.local,overlay)
    out=args.local/'puzzle-specifications.json'
    out.write_text(json.dumps(overlay,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({k:v for k,v in overlay.items() if k!='entries'},indent=2))


if __name__=='__main__':main()
