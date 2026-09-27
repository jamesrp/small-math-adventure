#!/usr/bin/env python3
"""Read-only unpacker for the Island Odyssey resource index and evidence corpus.

No game code is run. Archive payloads are private local research data. Offsets in
the manifest point into the extracted disc files, and all outputs are hashed.
"""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import struct
import subprocess
import xml.etree.ElementTree as ET


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + '\n')


def resource_index(data):
    """Parse the absolute-offset directory tree, not signature carving."""
    def u32(offset):
        return struct.unpack_from('<I', data, offset)[0]
    def cstr(offset):
        return data[offset:data.index(0, offset)].decode('ascii')
    seen = set()
    def safe_name(name):
        if name in ('', '.', '..') or any(c in name for c in ('/', '\\')):
            raise ValueError(f'Unsafe resource name: {name!r}')
        return name
    def walk(offset, parent=''):
        if offset in seen:
            raise ValueError(f'Repeated/cyclic resource node at {offset}')
        seen.add(offset)
        flags = struct.unpack_from('<H', data, offset)[0]
        if flags == 0x400:
            table = u32(offset + 2)
            directory = safe_name(cstr(offset + 6))
            count = u32(table)
            assert count < 10000
            for i in range(count):
                yield from walk(u32(table + 4 + i * 4), parent + '/' + directory)
        else:
            assert flags in (0x80, 0x280), (offset, flags)
            _, archive_id, start, size, reserved1, reserved2 = struct.unpack_from('<HHIIIH', data, offset)
            yield dict(index_offset=offset, flags=flags, archive_id=archive_id,
                       offset=start, length=size, directory=parent.strip('/'),
                       name=safe_name(cstr(offset + 18)), reserved=[reserved1, reserved2])
    for i in range(u32(0)):
        yield from walk(u32(4 + i * 4))


def ascii_strings(data, minimum=4):
    return [dict(offset=m.start(), text=m.group().decode('ascii'))
            for m in re.finditer(rb'[\x20-\x7e]{' + str(minimum).encode() + rb',}', data)]


def xml_node(node):
    return dict(tag=node.tag, attributes=node.attrib, text=(node.text or '').strip(),
                children=[xml_node(child) for child in node])


def decode_ao2c(data, offset):
    """Decode one validated AO2C chunk to RGBA; return image and chunk facts.

    Scanlines are runs of (u16 type, u16 count): 0 transparent; 1 RGB555;
    2 RGB555 plus one alpha byte. Color channels expand 5 -> 8 bits. The
    stored alpha byte is preserved unchanged (original compositor unverified).
    """
    from PIL import Image
    assert data[offset:offset + 4] == b'AO2C'
    size = struct.unpack_from('<I', data, offset + 4)[0]
    base = offset + 8
    fmt, width, height = struct.unpack_from('<HHI', data, base)
    assert fmt == 2 and 0 < width <= 4096 and 0 < height <= 4096
    assert base + size <= len(data)
    rows = list(struct.unpack_from('<' + 'I' * height, data, base + 8))
    # Two empty 1x1 sentinels store a zero row pointer but an explicit skip run.
    if width == height == 1 and size == 16 and rows == [0]:
        assert data[base + 12:base + 16] == b'\0\0\1\0'
        rows = [12]
    assert rows[0] == 8 + 4 * height and rows == sorted(rows)
    pixels = bytearray(width * height * 4)
    for y, (start, end) in enumerate(zip(rows, rows[1:] + [size])):
        cursor, limit, x = base + start, base + end, 0
        while cursor < limit:
            kind, count = struct.unpack_from('<HH', data, cursor)
            cursor += 4
            assert count > 0 and x + count <= width
            if kind == 0:
                x += count
                continue
            assert kind in (1, 2), kind
            for _ in range(count):
                color = struct.unpack_from('<H', data, cursor)[0]
                cursor += 2
                alpha = data[cursor] if kind == 2 else 255
                cursor += kind == 2
                r, g, b = (color >> 10) & 31, (color >> 5) & 31, color & 31
                at = (y * width + x) * 4
                pixels[at:at + 4] = bytes(((r << 3) | (r >> 2), (g << 3) | (g >> 2),
                                          (b << 3) | (b >> 2), alpha))
                x += 1
        assert cursor == limit and x == width, (y, cursor, limit, x, width)
    return Image.frombytes('RGBA', (width, height), bytes(pixels)), dict(
        ao_offset=offset, chunk_length=size + 8, width=width, height=height)


def export_frames(output, all_frames=False):
    manifest = []
    for path in sorted((output / 'assets').rglob('*.ao')):
        data = path.read_bytes()
        declared = struct.unpack_from('<H', data, 2)[0]
        starts = [m.start() for m in re.finditer(b'AO2C', data)]
        result = dict(source=str(path.relative_to(output)), sha256=sha(data),
                      declared_frame_count=declared, ao2c_chunks=len(starts), frames=[])
        if not starts:
            result['status'] = 'unsupported_palette_variant_preserved'
        else:
            assert len(starts) == declared, path
            result['status'] = 'all_frames_png' if all_frames else 'first_frame_png'
            result['color_encoding'] = 'RGB555 expanded to 8-bit channels; stored alpha byte unchanged'
            result['timing_status'] = 'not reconstructed; no invented playback timing'
            try:
                for number, offset in enumerate(starts):
                    if not all_frames and number:
                        break
                    image, facts = decode_ao2c(data, offset)
                    rel = Path('frames') / path.parent.name / path.stem / f'{number:04d}.png'
                    target = output / rel
                    target.parent.mkdir(parents=True, exist_ok=True)
                    image.save(target)
                    result['frames'].append(dict(index=number, output=str(rel),
                                                  sha256=sha(target.read_bytes()), **facts))
            except (AssertionError, struct.error, IndexError) as error:
                result['status'] = 'decode_failed'
                result['error'] = str(error)
        manifest.append(result)
    write_json(output / 'animations-manifest.json', dict(
        schema_version=1, animation_count=len(manifest),
        status_counts=dict(Counter(x['status'] for x in manifest)),
        frame_count=sum(len(x['frames']) for x in manifest), animations=manifest))
    return manifest


def native_evidence(disc, output):
    """Map PE imports/strings and annotate host-generated static disassembly."""
    path = disc / 'HD/Win/Zoombinis Island Odyssey.exe'
    data = path.read_bytes()
    pe = struct.unpack_from('<I', data, 0x3c)[0]
    section_count = struct.unpack_from('<H', data, pe + 6)[0]
    optional_size = struct.unpack_from('<H', data, pe + 20)[0]
    base = struct.unpack_from('<I', data, pe + 24 + 28)[0]
    sections = []
    for i in range(section_count):
        raw_name, virtual_size, rva, raw_size, offset = struct.unpack_from(
            '<8sIIII', data, pe + 24 + optional_size + i * 40)
        sections.append(dict(name=raw_name.rstrip(b'\0').decode(), rva=rva,
                             virtual_size=virtual_size, offset=offset, raw_size=raw_size))
    def rva_offset(rva):
        for sec in sections:
            if sec['rva'] <= rva < sec['rva'] + sec['raw_size']:
                return sec['offset'] + rva - sec['rva']
        raise ValueError(rva)
    def cstr(offset):
        return data[offset:data.index(0, offset)].decode('ascii')
    symbols = {}
    for text in ascii_strings(data):
        for sec in sections:
            if sec['name'] != '.text' and sec['offset'] <= text['offset'] < sec['offset'] + sec['raw_size']:
                symbols[base + sec['rva'] + text['offset'] - sec['offset']] = text['text']
    imports = []
    import_rva = struct.unpack_from('<I', data, pe + 24 + 104)[0]
    cursor = rva_offset(import_rva)
    while any(data[cursor:cursor + 20]):
        original, stamp, chain, name_rva, first = struct.unpack_from('<5I', data, cursor)
        dll = cstr(rva_offset(name_rva))
        thunk = rva_offset(original or first)
        index = 0
        while (value := struct.unpack_from('<I', data, thunk + index * 4)[0]):
            name = f'ordinal_{value & 0xffff}' if value & 0x80000000 else cstr(rva_offset(value) + 2)
            va = base + first + index * 4
            symbols[va] = dll + '!' + name
            imports.append(dict(dll=dll, name=name, iat_va=va))
            index += 1
        cursor += 20
    facts = dict(source=str(path.relative_to(disc)), sha256=sha(data), image_base=base,
                 sections=sections, imports=imports)
    write_json(output / 'native/pe-metadata.json', facts)
    try:
        result = subprocess.run(['objdump', '-d', '--x86-asm-syntax=intel', str(path)],
                                check=True, capture_output=True, text=True)
    except (OSError, subprocess.CalledProcessError):
        return
    lines = []
    for line in result.stdout.splitlines():
        addresses = {int(x, 16) for x in re.findall(r'0x([0-9a-f]+)', line)}
        labels = [symbols[x] for x in sorted(addresses) if x in symbols]
        lines.append(line + (' ; ' + ' | '.join(labels) if labels else ''))
    (output / 'native/island-odyssey.disassembly.txt').write_text('\n'.join(lines) + '\n')


def verify(disc, output):
    """Independently compare every payload and verify each saved PNG artifact."""
    from PIL import Image
    assets = json.loads((output / 'assets-manifest.json').read_text())['assets']
    archives = {}
    for item in assets:
        if item['source'] not in archives:
            archives[item['source']] = (disc / item['source']).read_bytes()
            assert sha(archives[item['source']]) == item['source_sha256']
        source = archives[item['source']]
        expected = source[item['payload_offset']:item['payload_offset'] + item['payload_length']]
        actual = (output / item['output']).read_bytes()
        assert expected == actual and sha(actual) == item['sha256'], item['output']
    animations = json.loads((output / 'animations-manifest.json').read_text())
    count = 0
    for animation in animations['animations']:
        for frame in animation['frames']:
            path = output / frame['output']
            assert sha(path.read_bytes()) == frame['sha256']
            with Image.open(path) as decoded:
                assert decoded.size == (frame['width'], frame['height'])
                decoded.verify()
            count += 1
    source = (output / 'assets/z3a1/10401.ao').read_bytes()
    offset = source.index(b'AO2C')
    corrupted = bytearray(source)
    struct.pack_into('<I', corrupted, offset + 4, len(source) + 10)
    rejected = False
    try:
        decode_ao2c(corrupted, offset)
    except AssertionError:
        rejected = True
    assert rejected
    scripts = json.loads((output / 'scripts-manifest.json').read_text())
    facts = dict(resource_payloads_exact=len(assets), png_hash_and_image_validation=count,
                 animation_statuses=animations['status_counts'],
                 out_of_range_chunk_rejected=rejected,
                 script_types=dict(Counter(Path(x['source']).suffix for x in scripts)),
                 recovered_xml_diagnostics=[x for x in scripts if 'parse_note' in x], errors=[])
    write_json(output / 'validation.json', facts)
    print(json.dumps(facts, indent=2))


def extract(disc, output):
    index_path = disc / 'HD/rsc/root.inx'
    index_data = index_path.read_bytes()
    records = list(resource_index(index_data))
    files = {p.name.lower(): p for p in disc.rglob('*.bul')}
    archives = {}
    for item in records:
        if item['flags'] == 0x280:
            path = files[item['name'].lower()]
            data = path.read_bytes()
            assert struct.unpack_from('<I', data)[0] == item['offset'], path
            archives[item['archive_id']] = (path, data, sha(data))
    manifest = []
    for item in records:
        if item['flags'] == 0x280:
            continue
        path, data, archive_sha = archives[item['archive_id']]
        start, end = item['offset'], item['offset'] + item['length']
        assert 4 <= start < end <= len(data), item
        prefix = item['name'].encode('ascii') + b'\0'
        assert data[start:start + len(prefix)] == prefix, item
        payload = data[start + len(prefix):end]
        relative = Path('assets') / item['directory'].lower() / item['name']
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
        manifest.append(dict(**item, source=str(path.relative_to(disc)),
                             source_sha256=archive_sha, payload_offset=start + len(prefix),
                             payload_length=len(payload), output=str(relative), sha256=sha(payload)))
    write_json(output / 'assets-manifest.json', dict(schema_version=1,
               source_index=str(index_path.relative_to(disc)), source_index_sha256=sha(index_data),
               archive_count=len(archives), count=len(manifest),
               extension_counts=dict(Counter(Path(x['name']).suffix.lower() for x in manifest)),
               assets=manifest))
    scripts = []
    for path in sorted((disc / 'HD/scripts').iterdir()):
        data = path.read_bytes()
        source = dict(source=str(path.relative_to(disc)), sha256=sha(data), length=len(data))
        if path.suffix.lower() == '.xml':
            try:
                parsed = xml_node(ET.fromstring(data))
                write_json(output / 'xml' / (path.stem.lower() + '.json'), dict(**source, root=parsed))
            except ET.ParseError as error:
                source['parse_error'] = str(error)
                # The game's permissive XML reader accepts <12Created> in z3p1.
                # Temporarily prefix digit-leading names for XML parsing, then
                # restore the exact tag in the JSON; never alter the source.
                names = set(re.findall(rb'</?([0-9][A-Za-z0-9_]*)[\s>]', data))
                if names:
                    compatible = data
                    for name in names:
                        compatible = compatible.replace(b'<' + name + b'>', b'<_digit_' + name + b'>')
                        compatible = compatible.replace(b'</' + name + b'>', b'</_digit_' + name + b'>')
                    root = ET.fromstring(compatible)
                    for node in root.iter():
                        if node.tag.startswith('_digit_'):
                            node.tag = node.tag[len('_digit_'):]
                    source['parse_note'] = 'Digit-leading source tag temporarily prefixed for parsing; original tag preserved in JSON.'
                    write_json(output / 'xml' / (path.stem.lower() + '.json'),
                               dict(**source, root=xml_node(root)))
        elif path.suffix.lower() == '.mps':
            strings = ascii_strings(data)
            write_json(output / 'scripts' / (path.stem.lower() + '.strings.json'),
                       dict(**source, status='verbatim strings with source offsets; not decompiled control flow', strings=strings))
            target = output / 'scripts' / (path.stem.lower() + '.strings.txt')
            target.write_text('\n'.join(f"{x['offset']:08x}\t{x['text']}" for x in strings) + '\n')
        scripts.append(source)
    write_json(output / 'scripts-manifest.json', scripts)
    for name in ['Zoombinis Island Odyssey.exe', 'PuzzleEngine.dll', 'trinket.dll', 'ompp32x.dll']:
        path = disc / 'HD/Win' / name
        data = path.read_bytes()
        write_json(output / 'native' / (name + '.strings.json'),
                   dict(source=str(path.relative_to(disc)), sha256=sha(data), strings=ascii_strings(data)))
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    root = Path(__file__).resolve().parents[1]
    parser.add_argument('--disc', type=Path, default=root / 'local/discs/island-odyssey')
    parser.add_argument('--output', type=Path, default=root / 'local/derived/island-odyssey')
    parser.add_argument('--frames', choices=['none', 'first', 'all'], default='none')
    parser.add_argument('--skip-unpack', action='store_true')
    parser.add_argument('--native', action='store_true', help='Map PE imports and statically disassemble if objdump exists')
    parser.add_argument('--verify', action='store_true', help='Verify extracted bytes, frame hashes/images, and malformed chunk rejection')
    args = parser.parse_args()
    if not args.skip_unpack:
        manifest = extract(args.disc, args.output)
        print(json.dumps(dict(asset_count=len(manifest), output=str(args.output)), indent=2))
    if args.frames != 'none':
        manifest = export_frames(args.output, all_frames=args.frames == 'all')
        print(json.dumps(dict(frame_count=sum(len(x['frames']) for x in manifest),
                              status_counts=dict(Counter(x['status'] for x in manifest))), indent=2))
    if args.native:
        native_evidence(args.disc, args.output)
    if args.verify:
        verify(args.disc, args.output)


if __name__ == '__main__':
    main()
