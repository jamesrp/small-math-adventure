#!/usr/bin/env python3
"""Build an additive, versioned generator-parity overlay from local reports.

No native code runs. Counts and validation status come from report bytes, which
are hashed so the corpus can reject a stale overlay after a report changes.
First-pass per-game puzzle records are never modified.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

RECOVERIES = (
    dict(game='logical-journey', puzzle_id='allergic-cliffs',
         model='tools/logical_bridge_generator.py', oracle='tools/logical_bridge_oracle.py',
         tests='tools/test_logical_bridge_generator.py', notes='notes/logical-bridge-parity.md',
         report='analysis/logical-journey-bridge/parity-results.json',
         supporting_reports=('analysis/logical-journey-bridge/difficulty-analysis.json',),
         scope=['Complete rule generator and validator at a supplied incoming party and RNG entry state.',
                'Candidate enumeration, matching counts, native rule fields, balancing search, RNG consumption and bridge acceptance.'],
         limitations=['Actual arrival from prior gameplay, wall-clock seed and earlier RNG calls are outside parity.',
                      'Full crossing, failure, animation and session state machines are outside parity.']),
    dict(game='logical-journey', puzzle_id='pizza-pass',
         model='tools/logical_pizza_generator.py', oracle='tools/logical_pizza_generator.py',
         tests='tools/logical_pizza_generator.py', notes='notes/logical-pizza-parity.md',
         report='analysis/logical-journey-pizza/native-validation.json',
         supporting_reports=('analysis/logical-journey-pizza/difficulty-analysis.json',),
         scope=['Preference/active-ingredient generation, numeric feedback and native difficulty parameter branches.',
                'Pit constructor arguments and exact RNG consumption are compared; pit rendering is omitted.'],
         limitations=['RNG state is supplied at generator entry; full-session seeding and earlier calls are outside parity.',
                      'Later troll selection, speech and complete gameplay feedback remain outside parity.']),
    dict(game='mountain-rescue', puzzle_id='mountain-rescue/beetle-bug-alley',
         model='tools/mountain_generator.py', oracle='tools/mountain_generator.py',
         tests='tools/mountain_generator_test.py', notes='notes/mountain-generator-parity.md',
         report='analysis/mountain-rescue/beetle-native-parity.json',
         supporting_reports=('analysis/mountain-rescue/beetle-unreachable-native-proof.json',
                             'analysis/mountain-rescue/beetle-native-moves.json',
                             'analysis/mountain-rescue/beetle-native-fallback.json',
                             'analysis/mountain-rescue/beetle-goal-analysis.json',
                             'analysis/mountain-rescue/beetle-difficulty.json'),
         scope=['Table selection, move construction, scrambling, checker, rejection retries and RNG behavior at generator entry.',
                'All shipped gameplay-move/reversal patterns are compared on valid states; a separate native witness cannot reach the all-matched identity target. Partial exits are a separate objective.'],
         limitations=['Decoded ZTL records are marshaled into memory; the original file reader is outside parity.',
                      'RNG entry state is supplied; full-session seed and prior call history are outside parity.',
                      'The fourth table category is diagnostic; normal displayed difficulty uses categories 1 through 3.',
                      'Allocator and CRT thread-state access are isolated harness dependencies; full gameplay is outside parity.']),
    dict(game='island-odyssey', puzzle_id='island-odyssey-z3a4',
         model='tools/island_generator.py', oracle='tools/island_oracle.py',
         tests='tools/island_oracle.py', notes='notes/island-generator-parity.md',
         report='analysis/island-odyssey/greenhouse-parity-validation.json',
         supporting_reports=('analysis/island-odyssey/greenhouse-template-path-certificates.json',
                             'analysis/island-odyssey/greenhouse-difficulty-analysis.json'),
         scope=['Packed Greenhouse board, template transforms, zero fills, swap acceptance and four subsequent random lists.',
                'Exact board values and ordered RNG calls are compared before deterministic path annotation.'],
         limitations=['XML/text parsing and external MSVCRT RNG are explicit compatibility hooks.',
                      'The original external RNG DLL is not independently validated.',
                      'Path annotation, moving agents, spawn timing and operational win conditions remain outside parity.',
                      'Reachability and inverse-scramble witnesses are static certificates, not executable play schedules.']),
)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def research_reference(relative):
    path = ROOT / relative
    return dict(path=relative, relative_to='research_root', exists=path.is_file(),
                **({'sha256': digest(path.read_bytes())} if path.is_file() else {}))


def report_reference(local, relative, include_summary=False):
    path = local / relative
    result = dict(path=relative, relative_to='local', exists=path.is_file())
    if not path.is_file():
        result['status'] = 'missing'
        return result
    raw = path.read_bytes()
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError(f'Expected report object: {path}')
    result.update(sha256=digest(raw), status=data.get('status', 'reported'))
    result['source_hashes'] = {k: v for k, v in data.items() if k.endswith('sha256')}
    # Preserve report units instead of summing heterogeneous checks into an
    # inflated total. Supporting validations also expose their own counts.
    counts = dict(data.get('checks', {})) if isinstance(data.get('checks'), dict) else {}
    counts.update({k: v for k, v in data.items()
                   if isinstance(v, int) and not isinstance(v, bool)
                   and any(word in k for word in ('count', 'cases', 'compared', 'branches', 'certificates', 'checks', 'patterns'))})
    if counts:
        result['counts'] = counts
    if include_summary:
        result['report_summary'] = {k: v for k, v in data.items()
                                    if k not in ('cases', 'examples', 'asymmetric_balance_example')}
        if isinstance(data.get('cases'), list):
            result['case_records'] = len(data['cases'])
    return result


def build_overlay(local):
    entries = []
    for recovery in RECOVERIES:
        validation = report_reference(local, recovery['report'], include_summary=True)
        metadata = dict(
            status='isolated-functions-validated' if validation['status'] == 'passed' else 'not-validated',
            parity_level='isolated-functions', full_game_parity=False,
            scope=recovery['scope'], limitations=recovery['limitations'],
            references={key: research_reference(recovery[key]) for key in ('model', 'oracle', 'tests', 'notes')},
            validation=validation,
            supporting_reports=[report_reference(local, p) for p in recovery['supporting_reports']],
            first_pass_policy='The existing generator field is retained unchanged as first-pass evidence; this additive field records subsequent recovery.')
        entries.append(dict(game=recovery['game'], puzzle_id=recovery['puzzle_id'], generator_parity=metadata))
    return dict(schema_version=1, kind='generator-parity-overlay',
                description='Isolated function recovery; no record claims full-game or session replay parity.',
                entries=entries)


def load_base_puzzles(local):
    rows = []
    for game in sorted({entry['game'] for entry in RECOVERIES}):
        path = local / 'derived' / game / 'puzzles.json'
        data = json.loads(path.read_text())
        for row in data if isinstance(data, list) else data.get('puzzles', []):
            rows.append({**row, 'game': game})
    return rows


def merge_overlay(puzzles, overlay):
    """Match exact game/id pairs; preserve every prior field and record count."""
    if overlay.get('schema_version') != 1 or overlay.get('kind') != 'generator-parity-overlay':
        raise ValueError('Unsupported generator-parity overlay schema')
    original = {(p['game'], p['id']): p for p in puzzles}
    if len(original) != len(puzzles):
        raise ValueError('Duplicate game/id in base puzzle catalog')
    updates = {}
    for entry in overlay.get('entries', []):
        key = (entry['game'], entry['puzzle_id'])
        if key in updates:
            raise ValueError(f'Duplicate generator overlay: {key}')
        if key not in original:
            raise ValueError(f'Generator overlay has no exact catalog match: {key}')
        parity = entry['generator_parity']
        if parity.get('full_game_parity') is not False or parity.get('parity_level') != 'isolated-functions':
            raise ValueError(f'Unsupported parity claim: {key}')
        updates[key] = parity
    result = []
    for puzzle in puzzles:
        key = (puzzle['game'], puzzle['id'])
        row = deepcopy(puzzle)
        if key in updates:
            if 'generator_parity' in row:
                raise ValueError(f'Base record already contains generator_parity: {key}')
            row['generator_parity'] = deepcopy(updates[key])
        result.append(row)
    return result


def verify_report_snapshots(local, overlay):
    """A changed report must be reread before its counts enter the index."""
    resolved_root = local.resolve()
    for entry in overlay['entries']:
        metadata = entry['generator_parity']
        for report in [metadata['validation'], *metadata.get('supporting_reports', [])]:
            path = local / report['path']
            if not path.resolve().is_relative_to(resolved_root):
                raise ValueError(f'Report path escapes local corpus: {report["path"]}')
            if report['exists'] != path.is_file() or (path.is_file() and digest(path.read_bytes()) != report['sha256']):
                raise ValueError(f'Stale generator overlay for {report["path"]}; rerun generator_catalog.py')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local', type=Path, default=ROOT / 'local')
    args = parser.parse_args()
    overlay = build_overlay(args.local)
    puzzles = load_base_puzzles(args.local)
    merged = merge_overlay(puzzles, overlay)
    verify_report_snapshots(args.local, overlay)
    destination = args.local / 'generator-parity.json'
    destination.write_text(json.dumps(overlay, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(dict(output=str(destination), matched_overlays=len(overlay['entries']),
                          preserved_puzzle_count=len(merged),
                          validation_statuses={e['puzzle_id']:e['generator_parity']['validation']['status']
                                               for e in overlay['entries']}), indent=2))


if __name__ == '__main__':
    main()
