"""Run all expansion checks without touching shipped application content."""
import json
import runpy
import sys
from pathlib import Path

sys.dont_write_bytecode = True
base = Path(__file__).resolve().parent
expected = {'toggle', 'clock', 'billiard', 'latin', 'code', 'nim', 'route', 'color', 'jug', 'weigh'}
families = []
for part in ('motion', 'deduction', 'networks', 'measurement'):
    families.extend(json.loads((base / f'{part}.json').read_text())['families'])
assert len(families) == 10
assert {family['id'] for family in families} == expected
assert all(len(family['instances']) == 12 for family in families)
ids = [instance['id'] for family in families for instance in family['instances']]
assert len(ids) == len(set(ids)) == 120
for family in families:
    for instance in family['instances']:
        assert all(key in instance for key in ('id', 'prompt', 'parameters', 'solution', 'hint'))
for part in ('motion', 'deduction', 'networks', 'measurement', 'tiling'):
    runpy.run_path(str(base / f'verify_{part}.py'), run_name='__main__')
print('\nPASS: 10 new types / 120 instances + 6 Tile Garden revision probes.')
