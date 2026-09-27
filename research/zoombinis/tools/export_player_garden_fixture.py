#!/usr/bin/env python3
"""Export private Garden player fixtures using the native-validated model.

This exporter never executes the source binary. The source and model hashes
identify the independent comparison boundary; output stays under ignored local/.
"""
from copy import deepcopy
from pathlib import Path
import argparse
import hashlib
import json
import spec_io_garden as model


def export():
    cases = []
    for level in (1, 2, 3):
        for seed in (0, 1, 37, 0x7fffffff, 0x80000000, 0xffffffff):
            for count in (1, 5, 12):
                board = model.generate(seed, level, count)
                state = model.initial_state(board)
                steps = []
                for i, plant in enumerate(board['plants'][:count]):
                    probes = []
                    for coordinate in state['masks']:
                        trial = deepcopy(state)
                        feedback = model.place(board, trial, i, coordinate)
                        probes.append(dict(cell=':'.join(map(str, coordinate)), feedback=feedback,
                                           masks={':'.join(map(str, c)): v for c, v in trial['masks'].items()},
                                           wrong=trial['wrong']))
                    # This witness chooses identity coordinate labels; the first
                    # placement could choose any labels in actual play.
                    target = tuple(plant[board['axes'][d]] if d < level else 0 for d in range(3))
                    feedback = model.place(board, state, i, target)
                    steps.append(dict(plant=i, probes=probes, target=':'.join(map(str, target)), feedback=feedback))
                cases.append(dict(board=board, steps=steps))
    source = Path(model.__file__)
    return dict(schema=1, exporter='export_player_garden_fixture.py:1',
                boundary='Garden generator entry and settled placement/feedback; no animation timing.',
                evidence=model.sources(), model_sha256=hashlib.sha256(source.read_bytes()).hexdigest(), cases=cases)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=model.ROOT / 'local/analysis/player-garden-fixtures.json')
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    data = export()
    args.output.write_text(json.dumps(data, separators=(',', ':')) + '\n')
    print(f"Exported {len(data['cases'])} cases to {args.output}")
