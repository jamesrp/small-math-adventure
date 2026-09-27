"""Standard-library provenance helpers for Logical Journey family specs."""
import hashlib
import json
from pathlib import Path
from native_analysis import ROOT, BINARIES, KNOWN_SHA256


def family_assets(archive):
    base = ROOT / 'local/derived/logical-journey'
    resources = [json.loads(line) for line in (base / 'resources.jsonl').read_text().splitlines()]
    selected = [r for r in resources if r['archive'] == f'DATA/{archive}.mhk']
    return {'archive': f'DATA/{archive}.mhk', 'archive_sha256': selected[0]['archive_sha256'],
            'corpus_root': 'local/derived/logical-journey', 'resources': selected,
            'resource_count': len(selected),
            'rendering_boundary': 'Original indexed pixels, animation records and WAVs are locally preserved. Runtime palette composition, alpha/masks and event timing are not a complete renderer.'}


def source_evidence(out, ranges):
    source = ROOT / 'local/discs/logical-journey' / BINARIES['logical-journey']
    data = source.read_bytes()
    source_hash = hashlib.sha256(data).hexdigest()
    if source_hash != KNOWN_SHA256['logical-journey']:
        raise ValueError('unknown executable; re-establish native addresses')
    out.mkdir(parents=True, exist_ok=True)
    result = []
    for label, start, end in ranges:
        # This hash-guarded PE maps the relevant .text RVA to the same raw offset.
        payload = data[start - 0x400000:end - 0x400000]
        filename = f'{label}.bin'
        (out / filename).write_bytes(payload)
        result.append({'label': label, 'virtual_start': hex(start), 'virtual_end_exclusive': hex(end),
                       'file_offset': start - 0x400000, 'length': len(payload),
                       'sha256': hashlib.sha256(payload).hexdigest(), 'local_slice': filename})
    report = {'source': str(source.relative_to(ROOT)), 'source_sha256': source_hash,
              'image_base': '0x400000', 'slices': result,
              'full_static_listing': 'local/native-analysis/logical-journey/disassembly.txt',
              'decode_warning': 'Linear disassembly can misalign after data/jump tables; supplied starts are established code entries or instruction boundaries.'}
    (out / 'source-evidence.json').write_text(json.dumps(report, indent=2) + '\n')
    return report
