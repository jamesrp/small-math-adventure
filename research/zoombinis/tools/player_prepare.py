#!/usr/bin/env python3
"""Prepare one explicitly supplied edition for the local player, without disc execution.

All writes go to a new output-local directory; existing corpus files are never replaced.
ISO structure parsing and all game-format decoding remain owned by canonical modules.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from corpus import iso_files, role, sha256, write_json

EDITIONS = {
    'logical-journey': 'a60243bfc272d468a574ce2de31f14073d86c016103696c3f8a72d29e0169131',
    'mountain-rescue': 'a02da8925ba5f92984e804c3931f4b7d2e1fc77c57c0a8ea51d483a3f779138f',
    'island-odyssey': '0617b232ccfeb89434d6aa433ac6f5e3e83944656a30d8ae8b9b2b28130277e8',
}
TOOLS = Path(__file__).resolve().parent


def prepare(game, iso, output):
    if sha256(iso) != EDITIONS[game]:
        raise ValueError('Unsupported ISO edition; no files extracted')
    # mkdir without exist_ok is intentional: this helper never mutates a prior corpus.
    output.mkdir(parents=True, exist_ok=False)
    inventory = iso_files(iso)
    inventory.update(id=game, iso_filename=iso.name, iso_size=iso.stat().st_size,
                     iso_sha256=EDITIONS[game], schema_version=1)
    disc = output / 'discs' / game
    disc.mkdir(parents=True)
    selected = []
    with iso.open('rb') as stream:
        for entry in inventory['files']:
            entry['role'] = role(game, entry['path'])
            if entry['role'] not in ('game-data', 'game-runtime', 'game-manual'):
                continue
            target = disc / entry['path']
            if not target.resolve().is_relative_to(disc.resolve()):
                raise ValueError('Extraction path escaped new disc root')
            target.parent.mkdir(parents=True, exist_ok=True)
            stream.seek(entry['iso_offset'])
            remaining, digest = entry['size'], hashlib.sha256()
            with target.open('xb') as destination:
                while remaining:
                    block = stream.read(min(remaining, 1024 * 1024))
                    if not block:
                        raise ValueError('Truncated source ISO')
                    destination.write(block)
                    digest.update(block)
                    remaining -= len(block)
            entry['sha256'] = digest.hexdigest()
            if sha256(target) != entry['sha256']:
                raise ValueError('Extracted source hash mismatch')
            selected.append(entry)
    inventory['files'] = selected
    inventory['extraction_scope'] = 'game-data, game-runtime, and game-manual only; installer/demo files excluded'
    write_json(output / 'manifests' / f'{game}.json', inventory)
    derived = output / 'derived' / game
    if game == 'logical-journey':
        command = ['logical_journey.py', '--disc', str(disc), '--out', str(derived)]
    elif game == 'mountain-rescue':
        command = ['mountain_rescue.py', '--source', str(disc), '--output', str(derived)]
    else:
        command = ['island_odyssey.py', '--disc', str(disc), '--output', str(derived), '--frames', 'all', '--verify']
    subprocess.run([sys.executable, str(TOOLS / command[0]), *command[1:]], check=True)
    write_json(output / 'prepared.json', {'schema': 1, 'game': game, 'iso_sha256': EDITIONS[game],
        'status': 'decoded', 'scope': inventory['extraction_scope'], 'source_files': len(selected),
        'decoder': command[0], 'decoder_sha256': sha256(TOOLS / command[0])})


def verify_logical(derived, relative):
    from PIL import Image
    from logical_journey import logical_palette, logical_bitmap_payload, logical_bitmap_pixels
    if Path(relative).is_absolute() or '..' in Path(relative).parts:
        raise ValueError('Unsafe image path')
    rows = [json.loads(line) for line in (derived / 'images.jsonl').read_text().splitlines()]
    row = next(r for r in rows if r['path'] == relative)
    image = Image.open(derived / relative)
    if image.mode != 'P' or image.size != (row['width'], row['height']) or hashlib.sha256(image.tobytes()).hexdigest() != row['pixel_indices_sha256']:
        raise ValueError('Logical Journey image indices/dimensions mismatch')
    payload = (derived / row['source']).read_bytes()
    header, pixels, _ = logical_bitmap_payload(payload)
    if logical_bitmap_pixels(header, pixels).tobytes() != image.tobytes():
        raise ValueError('Logical Journey image differs from independently re-decoded source bytes')
    # First-slice background uses a matching explicit SHPL palette. Compare every used index.
    palettes = json.loads((derived / 'palettes.json').read_text())
    palette = next(p for p in palettes if p['source'] == row['palette_source'])
    raw = (derived / row['palette_source']).read_bytes()
    decoded = logical_palette(raw, 4 if palette['tag'] == 'SHPL' else 0)
    colors = decoded['colors']
    actual = image.getpalette()
    for index in set(image.tobytes()):
        expected = colors.get(index)
        if expected is None or actual[index * 3:index * 3 + 3] != list(expected):
            raise ValueError(f'Logical Journey used palette index {index} mismatches source')
    print(json.dumps({'status': 'verified', 'path': relative, 'pixel_indices_sha256': row['pixel_indices_sha256']}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    p = commands.add_parser('prepare')
    p.add_argument('--game', choices=EDITIONS, required=True)
    p.add_argument('--iso', type=Path, required=True)
    p.add_argument('--output-local', type=Path, required=True)
    v = commands.add_parser('verify-logical')
    v.add_argument('--derived', type=Path, required=True)
    v.add_argument('--image', required=True)
    args = parser.parse_args()
    if args.command == 'prepare': prepare(args.game, args.iso, args.output_local)
    else: verify_logical(args.derived, args.image)


if __name__ == '__main__': main()
