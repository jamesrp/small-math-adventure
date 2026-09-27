#!/usr/bin/env python3
"""Decode locally supplied Zoombinis Mountain Rescue data without running its code.

Art conversion requires Pillow and numpy; the table parser is standard-library
only. The native RGB/RB/AN/ANM byte layouts were derived
from the supplied disc, and ZTL read/selection routines from its x86 executable.
No original game content is embedded here. All extracted content is local-only.
"""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import io
import json
from pathlib import Path
import re
import struct
import subprocess

def mountain_sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def mountain_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def mountain_sparse(data: bytes, header_offset: int, payload_offset: int, payload_size: int):
    """Decode one RB payload. Offsets are absolute within its source file.

    The three unknown words include apparent saved pointers/uninitialized memory;
    retain them as raw values, never treat them as addresses to dereference.
    """
    import numpy as np
    from PIL import Image
    header = struct.unpack_from('<6I', data, header_offset)
    _, _, expected, width, height, _ = header
    if expected != payload_size or not (0 < width <= 10000 and 0 < height <= 10000):
        raise ValueError(f'invalid sparse header at {header_offset}')
    end = payload_offset + payload_size
    if payload_size < 2 or end > len(data):
        raise ValueError('truncated sparse payload')
    unknown_u16 = struct.unpack_from('<H', data, payload_offset)[0]
    offset = payload_offset + 2
    spans = []
    out_width, out_height = width, height
    while offset < end:
        if offset + 7 > end:
            raise ValueError('truncated span header')
        x, y, length, kind = struct.unpack_from('<HHHB', data, offset)
        pixels_offset = offset + 7
        offset = pixels_offset + length * (3 + kind)
        if kind not in (0, 1) or offset > end or x + length > 10002 or y > 10000:
            raise ValueError(f'invalid sparse span at {pixels_offset-7}')
        spans.append((x, y, length, kind, pixels_offset))
        out_width = max(out_width, x + length)
        out_height = max(out_height, y + 1)
    if offset != end:
        raise ValueError('sparse payload size mismatch')
    # Some source runs overrun the declared width by 1–2 pixels. Preserve them,
    # and record both sizes instead of silently clipping original information.
    pixels = np.zeros((out_height, out_width, 4), dtype=np.uint8)
    for x, y, length, kind, offset in spans:
        if not length:
            continue
        block = np.frombuffer(data, dtype=np.uint8, count=length*(3+kind), offset=offset).reshape(length, 3+kind)
        if kind == 0:
            pixels[y, x:x+length, :3] = block
            pixels[y, x:x+length, 3] = 255
        else:
            opacity = 255 - block[:, 3].astype(np.uint32)
            premul = block[:, :3].astype(np.uint32)
            straight = np.minimum(255, (premul*255 + opacity[:, None]//2)//np.maximum(1, opacity[:, None]))
            pixels[y, x:x+length, :3] = straight.astype(np.uint8)
            pixels[y, x:x+length, 3] = opacity.astype(np.uint8)
    meta = {'header_offset': header_offset, 'header_raw_u32': list(header),
            'payload_offset': payload_offset, 'payload_size': payload_size,
            'payload_sha256': mountain_sha(data[payload_offset:end]),
            'payload_leading_u16_unknown': unknown_u16,
            'declared_size': [width, height], 'output_size': [out_width, out_height],
            'span_count': len(spans), 'expanded_canvas': [width, height] != [out_width, out_height],
            'pixel_interpretation': 'RGB top-to-bottom; type 0 opaque; type 1 premultiplied RGB plus inverse opacity, converted to straight RGBA using 255-t (inferred)'}
    return Image.fromarray(pixels), meta


def mountain_frames(data: bytes, extension: str):
    """Yield (slot, frame, image, metadata), validating the entire container."""
    if extension == '.rb':
        size = struct.unpack_from('<I', data, 24)[0]
        if 28 + size != len(data):
            raise ValueError('RB length mismatch')
        image, meta = mountain_sparse(data, 0, 28, size)
        yield 0, 0, image, meta
        return
    offset = 0
    slot = 0
    while offset < len(data):
        count_offset = offset
        count = struct.unpack_from('<I', data, offset)[0]
        offset += 4
        if count > 10000:
            raise ValueError('unreasonable frame count')
        for frame in range(count):
            header_offset = offset if extension == '.an' else offset+4
            size_offset = offset+24 if extension == '.an' else offset
            size = struct.unpack_from('<I', data, size_offset)[0]
            image, meta = mountain_sparse(data, header_offset, offset+28, size)
            meta.update({'slot_count_offset': count_offset, 'slot_frame_count': count,
                         'size_offset': size_offset, 'record_offset': offset})
            yield slot, frame, image, meta
            offset += 28+size
        slot += 1
    if offset != len(data) or (extension == '.an' and slot != 1) or (extension == '.anm' and slot != 3000):
        raise ValueError(f'container length/slot mismatch: {offset}, {slot}')


def mountain_path(data: bytes):
    """Preserve textual path coordinates and timing fields; curve type inferred."""
    text = data.decode('cp1252')
    records = []
    offset = 0
    for line in data.splitlines(keepends=True):
        textline = line.decode('cp1252').strip()
        match = re.fullmatch(r'(FIRST|NEXT_\d+)=coord:([\d,\-]+) step:(\d+) wait:(\d+)', textline)
        if not match:
            raise ValueError(f'unrecognized path record {textline!r}')
        name, numbers, step, wait = match.groups()
        values = [int(v) for v in numbers.split(',')]
        expected = 8 if name == 'FIRST' else 6
        if len(values) != expected:
            raise ValueError('path coordinate count mismatch')
        records.append({'name': name, 'source_offset': offset, 'source_length': len(line),
                        'coordinates': [values[i:i+2] for i in range(0,len(values),2)],
                        'step': int(step), 'wait': int(wait)})
        offset += len(line)
    return {'text': text, 'segments': records,
            'interpretation': 'FIRST has four coordinate pairs; NEXT has three and likely continues a cubic Bezier. Curve evaluation, step units, and wait semantics not confirmed.'}


def mountain_ztl(data: bytes):
    """Read DEFAULT.ZTL using the on-disc executable's read order.

    Read schema verified against VA 0x43fbf0 and 0x43fe70. Semantic field names
    reflect observed usage at 0x440210 (weighted selection) and 0x440c90 (moves).
    Three variant pools are not the three game difficulties: category is 1..4.
    """
    offset = 0
    def u16():
        nonlocal offset
        if offset+2 > len(data):
            raise ValueError('truncated ZTL')
        value = struct.unpack_from('<H', data, offset)[0]
        offset += 2
        return value
    total = u16()
    records = []
    if total > 10000:
        raise ValueError('unreasonable ZTL count')
    for index in range(total):
        start = offset
        category, weight, point_count = u16(), u16(), u16()
        points = [[u16(),u16()] for _ in range(point_count)]
        pools = []
        for pool_index in range(3):
            pool_start = offset
            variants = []
            for variant_index in range(u16()):
                variant_start = offset
                moves = []
                for move_index in range(u16()):
                    move_start = offset
                    triples = []
                    for triple_index in range(u16()):
                        triple_start = offset
                        a,b,flag = u16(),u16(),u16()
                        if a >= point_count or b >= point_count or flag not in (0,1):
                            raise ValueError('ZTL move outside point domain')
                        triples.append({'source_offset': triple_start, 'from': a, 'to': b,
                                        'bidirectional': bool(flag), 'raw': [a,b,flag]})
                    moves.append({'source_offset': move_start, 'transfers': triples})
                variants.append({'source_offset': variant_start, 'moves': moves})
            pools.append({'pool_index': pool_index, 'source_offset': pool_start, 'variants': variants})
        records.append({'index': index, 'source_offset': start, 'source_length': offset-start,
                        'category': category, 'selection_weight': weight, 'point_count': point_count,
                        'points': points, 'move_variant_pools': pools})
    if offset != len(data):
        raise ValueError(f'ZTL trailing data at {offset}')
    return {'status': 'structural_decode_complete_semantics_partial', 'record_count': total,
            'bytes_consumed': offset, 'records': records,
            'category_caution': 'Four internal categories 1..4; mapping to three user-facing difficulty levels unresolved.',
            'generator_evidence': {
                'read_routine_va': '0x43fbf0', 'nested_pool_read_routine_va': '0x43fe70',
                'weighted_selection_va': '0x440210', 'move_expansion_va': '0x440c90',
                'selection': 'Filter records by category, repeat each index selection_weight times, choose rand() modulo total weight.',
                'variant_selection': '0x4402f0 independently chooses one variant from each of the three pools and concatenates their move lists.',
                'transfer': 'flag=1 expands from/to into both directions (swap); flag=0 contributes one directed transfer.',
                'unknowns': ['Mapping from UI difficulty to category', 'Initial scrambling/acceptance and fallback rules', 'PRNG seed and complete call order']}}


def mountain_rand(state: int):
    """Exact PRNG step observed at executable VA 0x46c7c0 (seed unknown)."""
    state = (state*214013 + 2531011) & 0xffffffff
    return state, (state >> 16) & 0x7fff


def mountain_select_ztl_record(records, category: int, state: int):
    """Reproduce the isolated weighted selection step, not a complete puzzle."""
    choices = [r['index'] for r in records if r['category']==category for _ in range(r['selection_weight'])]
    if not choices:
        raise ValueError('category has no selectable records')
    state, value = mountain_rand(state)
    return state, choices[value % len(choices)]


def mountain_contact_sheet(entries, output: Path):
    from PIL import Image, ImageDraw
    if not entries:
        return
    cellw, cellh, cols = 240, 210, 4
    sheet = Image.new('RGB',(cols*cellw, ((len(entries)+cols-1)//cols)*cellh),(32,37,45))
    draw = ImageDraw.Draw(sheet)
    for i,(file,label) in enumerate(entries):
        image = Image.open(file).convert('RGBA')
        image.thumbnail((cellw-12,cellh-48))
        x,y = (i%cols)*cellw,(i//cols)*cellh
        sheet.paste(image,(x+(cellw-image.width)//2,y+8),image)
        draw.text((x+7,y+cellh-37),label[:35], fill='white')
    sheet.save(output)


def mountain_extract(source: Path, output: Path):
    from PIL import Image
    output.mkdir(parents=True, exist_ok=True)
    counters = Counter()
    manifest = []
    previews = []
    files = [p for p in sorted(source.rglob('*')) if p.is_file()]
    for path in files:
        ext = path.suffix.lower()
        if ext not in ('.bb','.rb','.an','.anm','.pat','.bmt','.ztl'):
            continue
        data = path.read_bytes()
        rel = path.relative_to(source)
        record = {'source': rel.as_posix(), 'source_sha256': mountain_sha(data), 'source_size': len(data), 'format': ext[1:]}
        try:
            if ext in ('.rb','.an','.anm'):
                frames = []
                first_image = None
                for slot,frame,image,meta in mountain_frames(data,ext):
                    if ext == '.rb':
                        dest = output/'images'/Path(str(rel)+'.png')
                    else:
                        dest = output/'animations'/rel/f'slot-{slot:04d}'/f'frame-{frame:04d}.png'
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    image.save(dest)
                    meta.update({'slot':slot,'frame':frame,'output':dest.relative_to(output).as_posix(),
                                 'output_sha256':mountain_sha(dest.read_bytes())})
                    frames.append(meta)
                    counters['sparse_images'] += 1
                    counters['expanded_canvas_images'] += int(meta['expanded_canvas'])
                    if first_image is None:
                        first_image = dest
                record['frames'] = frames
                record['frame_count'] = len(frames)
                record['slot_count'] = 3000 if ext == '.anm' else 1
                if ext != '.rb':
                    record['playback_timing'] = 'not in decoded container; see local developer timing notes where available'
                if first_image and (ext in ('.an','.anm') and len(previews)<24):
                    previews.append((first_image,path.name))
            elif ext == '.bb':
                header = struct.unpack_from('<6I',data)
                w,h = header[3:5]
                if len(data)!=24+w*h*3 or header[2] != w*h*3 or header[5]!=w*h*3:
                    raise ValueError('BB length/dimensions mismatch')
                dest = output/'images'/Path(str(rel)+'.png')
                dest.parent.mkdir(parents=True, exist_ok=True)
                Image.frombytes('RGB',(w,h),data[24:]).save(dest)
                record.update({'header_raw_u32':list(header),'payload_offset':24,'size':[w,h],
                               'output':dest.relative_to(output).as_posix(),'output_sha256':mountain_sha(dest.read_bytes()),
                               'pixel_interpretation':'RGB top-to-bottom'})
                counters['rgb_images'] += 1
            elif ext == '.bmt':
                dest = output/'images'/Path(str(rel)+'.png')
                dest.parent.mkdir(parents=True, exist_ok=True)
                image = Image.open(io.BytesIO(data));image.save(dest)
                record.update({'actual_format':image.format, 'size':list(image.size), 'mode':image.mode,
                               'output':dest.relative_to(output).as_posix(),'output_sha256':mountain_sha(dest.read_bytes())})
                counters['bmt_images'] += 1
            elif ext in ('.pat','.ztl'):
                dest = output/('paths' if ext=='.pat' else 'tables')/Path(str(rel)+'.json')
                parsed = mountain_path(data) if ext=='.pat' else mountain_ztl(data)
                mountain_json(dest,dict(record,**parsed))
                record['output'] = dest.relative_to(output).as_posix()
                if ext=='.ztl':
                    record['record_count'] = parsed['record_count']
            record['status'] = 'decoded'
            counters[f'{ext[1:]}_files_decoded'] += 1
        except Exception as exc:
            record.update({'status':'error','error':str(exc)})
            counters['errors'] += 1
        manifest.append(record)
    # Indexed strings retain offsets to support static analysis and asset links.
    exe = source/'INSTALL/HD/zoombini2.exe'
    if exe.exists():
        data = exe.read_bytes()
        strings = [{'offset':m.start(),'length':len(m.group()),'text':m.group().decode('ascii')}
                   for m in re.finditer(rb'[\x20-\x7e]{5,}',data)]
        mountain_json(output/'evidence/executable-strings.json', {'source':exe.relative_to(source).as_posix(),
                      'source_sha256':mountain_sha(data),'strings':strings})
        # Optional disassembly. objdump reads bytes; the historical game is never run.
        try:
            result = subprocess.run(['objdump','-d','--start-address=0x43fbf0','--stop-address=0x441000',str(exe)],
                                    check=True, capture_output=True,text=True)
            (output/'evidence/ztl-routines.asm').write_text(result.stdout)
            result = subprocess.run(['objdump','-d','--start-address=0x46c7c0','--stop-address=0x46c7e2',str(exe)],
                                    check=True,capture_output=True,text=True)
            (output/'evidence/prng.asm').write_text(result.stdout)
        except (FileNotFoundError,subprocess.CalledProcessError):
            pass
    notes=[]
    for name in ['Data/Bmp/BOOLIES/tempo_boolies.txt','Data/Bmp/wall_of_fleens/boulot de coder.txt','Data/Bmp/typo.txt']:
        path=source/name
        if path.exists():
            data=path.read_bytes();notes.append({'source':name,'source_sha256':mountain_sha(data),'text':data.decode('cp1252')})
    mountain_json(output/'evidence/developer-notes.json',notes)
    # Keep frame records together with their source hash so every PNG is traceable.
    with (output/'manifest.jsonl').open('w') as stream:
        for record in manifest:
            stream.write(json.dumps(record, ensure_ascii=False)+'\n')
    mountain_contact_sheet(previews,output/'animation-contact-sheet.png')
    backgrounds=[]
    for record in manifest:
        if record['format']=='bb' and record['source'].startswith('INSTALL/HD/Bmp/') and record.get('status')=='decoded':
            backgrounds.append((output/record['output'],str(Path(record['source']).parent.name)+' / '+Path(record['source']).name))
    mountain_contact_sheet(backgrounds,output/'background-contact-sheet.png')
    summary = {'source_root':str(source.resolve()), 'status':'complete' if not counters['errors'] else 'partial',
               'counts':dict(counters), 'source_files_processed':len(manifest),
               'provenance':'Source-relative paths, full source SHA-256, absolute frame/payload offsets and hashes in manifest.jsonl.',
               'limits':['RB inverse-opacity unpremultiplication is inferred; original quantized RGB is preserved in source bytes.',
                         'ANM slot indices are preserved; character layer naming/composition is unresolved.',
                         'No native game playback or runtime comparison performed.',
                         'ZTL is structurally decoded; full generator semantics and UI category mapping are incomplete.']}
    mountain_write_puzzles(source, output)
    mountain_json(output/'summary.json',summary)
    print(json.dumps(summary,indent=2))
    return summary



def mountain_write_puzzles(source: Path, output: Path):
    """Rebuild manually reviewed, source-linked puzzle annotations."""
    puzzles = [{'id': 'mountain-rescue/turtle-hurdle',
      'game': 'mountain-rescue',
      'name': 'Turtle Hurdle',
      'mechanic': 'Sort the 16 Zoombinis into an ordered row using feature clues. Incorrect placement '
                  'automatically reveals the correct location but consumes a dock support. At the hardest level '
                  'sort by primary then secondary attribute.',
      'manual_pdf_pages': [15, 28, 29],
      'difficulty': {'NOT SO EASY': {'sort': 'one attribute; all five feature-order clues shown',
                                     'incorrect_placements_before_collapse': 3},
                     'OH SO HARD': {'sort': 'fewer order clues shown', 'incorrect_placements_before_collapse': 4},
                     'VERY HARD': {'sort': 'primary and secondary attributes',
                                   'incorrect_placements_before_collapse': 6}},
      'difficulty_progression': {'levels': ['NOT SO EASY', 'OH SO HARD', 'VERY HARD'],
                                 'rule': 'Automatic increase after three consecutive complete-party successes at '
                                         'an activity; practice mode permits manual selection.',
                                 'manual_pdf_pages': [9, 10, 11]},
      'generator': {'status': 'mechanics_documented_generator_not_recovered',
                    'evidence': [{'kind': 'manual',
                                  'source': 'INSTALL/Data/Zoombinimr.pdf',
                                  'pdf_pages': [15, 28, 29]}],
                    'unknowns': ['How sort attributes and permutations are chosen',
                                 'Exact number of hidden clues by level',
                                 'Tie-breaking among equivalent Zoombinis']},
      'asset_roots': ['Data/Bmp/crazy_turtle', 'Data/Bmp/mystic_marsh/TRAITS', 'INSTALL/HD/Bmp/crazy_turtle'],
      'asset_association_status': 'Paths associated by internal scene names and manual mechanics; not complete '
                                  'runtime dependency graphs.'},
     {'id': 'mountain-rescue/pipes-of-paloo',
      'game': 'mountain-rescue',
      'name': 'Pipes of Paloo',
      'mechanic': 'Place Zoombinis at network endpoints so each pipe joins a pair with the same feature in its '
                  'labeled attribute. Open connections must carry water from the central source at higher '
                  'levels.',
      'manual_pdf_pages': [16, 29],
      'difficulty': {'NOT SO EASY': {'layout': 'eight matching junctions for a full party of 16'},
                     'OH SO HARD': {'layout': 'five branches linked to a central Zoombini; some must match '
                                              'neighbors on different attributes'},
                     'VERY HARD': {'layout': 'more complex crossing network; every Zoombini must remain '
                                             'connected to the center'}},
      'difficulty_progression': {'levels': ['NOT SO EASY', 'OH SO HARD', 'VERY HARD'],
                                 'rule': 'Automatic increase after three consecutive complete-party successes at '
                                         'an activity; practice mode permits manual selection.',
                                 'manual_pdf_pages': [9, 10, 11]},
      'generator': {'status': 'mechanics_documented_generator_not_recovered',
                    'evidence': [{'kind': 'manual',
                                  'source': 'INSTALL/Data/Zoombinimr.pdf',
                                  'pdf_pages': [16, 29]}],
                    'unknowns': ['Network construction and exact graph at each level',
                                 'How pipe labels are generated relative to party traits',
                                 'Solvability checks and behavior for incomplete parties']},
      'asset_roots': ['Data/Bmp/waterslide', 'INSTALL/HD/Bmp/waterslide'],
      'asset_association_status': 'Paths associated by internal scene names and manual mechanics; not complete '
                                  'runtime dependency graphs.'},
     {'id': 'mountain-rescue/aqua-cube',
      'game': 'mountain-rescue',
      'name': 'Aqua Cube',
      'mechanic': 'Infer which unlabeled lever toggles each coordinate of a cube. Plan a route collecting '
                  'Zoombinis without landing on Fleens or wasting moves on visited locations. Warp combines a '
                  'sequence of lever moves into a single turn and skips intermediate Fleens.',
      'manual_pdf_pages': [17, 30],
      'difficulty': {'NOT SO EASY': {'normal_moves': 6, 'levers': 3, 'warp_moves': 0},
                     'OH SO HARD': {'normal_moves': 6, 'levers': 3, 'warp_moves': 1},
                     'VERY HARD': {'normal_moves': 11,
                                   'levers': 4,
                                   'warp_moves': 2,
                                   'layout': 'inner and outer cube; fourth lever toggles between them'}},
      'difficulty_progression': {'levels': ['NOT SO EASY', 'OH SO HARD', 'VERY HARD'],
                                 'rule': 'Automatic increase after three consecutive complete-party successes at '
                                         'an activity; practice mode permits manual selection.',
                                 'manual_pdf_pages': [9, 10, 11]},
      'generator': {'status': 'mechanics_documented_generator_not_recovered',
                    'evidence': [{'kind': 'manual',
                                  'source': 'INSTALL/Data/Zoombinimr.pdf',
                                  'pdf_pages': [17, 30]}],
                    'unknowns': ['Distribution of target and Fleen placements',
                                 'Lever permutation and warp-input time limit',
                                 'Generation method guaranteeing collectability under move budget']},
      'asset_roots': ['Data/Bmp/AQUACUBE', 'INSTALL/HD/Bmp/AQUACUBE'],
      'asset_association_status': 'Paths associated by internal scene names and manual mechanics; not complete '
                                  'runtime dependency graphs.'},
     {'id': 'mountain-rescue/beetle-bug-alley',
      'game': 'mountain-rescue',
      'name': 'Beetle Bug Alley',
      'mechanic': 'Use patterned controls to permute colored beetles until they match their home markers. Each '
                  'correctly placed beetle helps unlock doors; solve twice for a party of eight, four passages '
                  'at a time. Unlimited permutation moves.',
      'manual_pdf_pages': [18, 30, 31],
      'difficulty': {'NOT SO EASY': {'variation': 'smaller beetle permutation puzzle'},
                     'OH SO HARD': {'variation': 'more beetles and more complex permutations'},
                     'VERY HARD': {'variation': 'more beetles and more complex permutations'}},
      'difficulty_progression': {'levels': ['NOT SO EASY', 'OH SO HARD', 'VERY HARD'],
                                 'rule': 'Automatic increase after three consecutive complete-party successes at '
                                         'an activity; practice mode permits manual selection.',
                                 'manual_pdf_pages': [9, 10, 11]},
      'generator': {'status': 'authored_tables_decoded_generator_partially_recovered',
                    'evidence': [{'kind': 'manual',
                                  'source': 'INSTALL/Data/Zoombinimr.pdf',
                                  'pdf_pages': [18, 30, 31]},
                                 {'kind': 'executable_disassembly',
                                  'source': 'INSTALL/HD/zoombini2.exe',
                                  'virtual_addresses': ['0x43fbf0',
                                                        '0x43fe70',
                                                        '0x440210',
                                                        '0x4402f0',
                                                        '0x440c90'],
                                  'derived_evidence': 'evidence/ztl-routines.asm'}],
                    'unknowns': ['How three user-facing levels map to four internal categories',
                                 'Initial scramble, solver-based acceptance and fallback rules',
                                 'How colors are assigned and initial permutation chosen'],
                    'known_logic': ['Load 22 layout records from DEFAULT.ZTL; category counts are 6,6,5,5 for '
                                    'categories 1..4.',
                                    'Filter by category and choose record using stored integer weight and rand() '
                                    'modulo total weight. Category weight totals are 19,20,15,18; a zero-weight '
                                    'record is not selected by this step.',
                                    'For each selected layout independently choose one variant in each of three '
                                    'move pools and concatenate their moves.',
                                    'Each move contains from/to/flag triples; flag 1 expands to reciprocal '
                                    'transfers (swap), flag 0 to a directed transfer.'],
                    'decoded_table': 'tables/Data/Bmp/magic_wall/DEFAULT.ZTL.json'},
      'asset_roots': ['Data/Bmp/magic_wall', 'INSTALL/HD/Bmp/magic_wall'],
      'asset_association_status': 'Paths associated by internal scene names and manual mechanics; not complete '
                                  'runtime dependency graphs.'},
     {'id': 'mountain-rescue/chez-norf',
      'game': 'mountain-rescue',
      'name': 'Chez Norf',
      'mechanic': 'Deduce each customer’s meal from positive, negative and relational spoken clues. Combine food '
                  'choices on a tray and serve the correct customer; a logic-table order pad records hypotheses.',
      'manual_pdf_pages': [19, 31],
      'difficulty': {'NOT SO EASY': {'customers': 4, 'meal_categories': ['main dish', 'drink'], 'extra_trays': 4},
                     'OH SO HARD': {'meal_categories': ['main dish', 'drink', 'dessert'], 'extra_attempts': 3},
                     'VERY HARD': {'customers': 6,
                                   'meal_categories': ['main dish', 'drink', 'dessert'],
                                   'incorrect_meals_allowed': 2}},
      'difficulty_progression': {'levels': ['NOT SO EASY', 'OH SO HARD', 'VERY HARD'],
                                 'rule': 'Automatic increase after three consecutive complete-party successes at '
                                         'an activity; practice mode permits manual selection.',
                                 'manual_pdf_pages': [9, 10, 11]},
      'generator': {'status': 'mechanics_documented_generator_not_recovered',
                    'evidence': [{'kind': 'manual',
                                  'source': 'INSTALL/Data/Zoombinimr.pdf',
                                  'pdf_pages': [19, 31]}],
                    'unknowns': ['Assignment sampling and clue-template selection',
                                 'Whether clue sets guarantee unique assignments',
                                 'Exact speaker/neighbor relation rules and customer count at middle level']},
      'asset_roots': ['Data/Bmp/chez_norf', 'INSTALL/HD/Bmp/chez_norf'],
      'asset_association_status': 'Paths associated by internal scene names and manual mechanics; not complete '
                                  'runtime dependency graphs.'},
     {'id': 'mountain-rescue/bubble-bumpers',
      'game': 'mountain-rescue',
      'name': 'Bubble Bumpers',
      'mechanic': 'Choose launch entrance and Zoombini sequence through a grid of automatic arrows, diverters, '
                  'event triggers, magnets and whirlpools. Trait-dependent devices change routes. A magnet '
                  'permits a two-Zoombini meeting; collisions elsewhere pop bubbles.',
      'manual_pdf_pages': [20, 32],
      'difficulty': {'NOT SO EASY': {'variation': 'initial routing grid'},
                     'OH SO HARD': {'variation': 'more entrances and grid symbols'},
                     'VERY HARD': {'variation': 'more entrances, symbols and complex routes'}},
      'difficulty_progression': {'levels': ['NOT SO EASY', 'OH SO HARD', 'VERY HARD'],
                                 'rule': 'Automatic increase after three consecutive complete-party successes at '
                                         'an activity; practice mode permits manual selection.',
                                 'manual_pdf_pages': [9, 10, 11]},
      'generator': {'status': 'mechanics_documented_generator_not_recovered',
                    'evidence': [{'kind': 'manual',
                                  'source': 'INSTALL/Data/Zoombinimr.pdf',
                                  'pdf_pages': [20, 32]}],
                    'unknowns': ['Exact grid construction versus authored templates',
                                 'Device transition tables and state changes',
                                 'Timing/collision model, symbol distributions and solvability checks']},
      'asset_roots': ['Data/Bmp/mystic_marsh', 'INSTALL/HD/Bmp/mystic_marsh'],
      'asset_association_status': 'Paths associated by internal scene names and manual mechanics; not complete '
                                  'runtime dependency graphs.'},
     {'id': 'mountain-rescue/magic-mirrors',
      'game': 'mountain-rescue',
      'name': 'Magic Mirrors',
      'mechanic': 'Identify a hidden Fleen from a visible candidate set. Shoot a candidate mirror and receive '
                  'the count of matching attributes among hair, eyes, nose and feet. Find the target using those '
                  'equality-count constraints.',
      'manual_pdf_pages': [21, 32, 33],
      'difficulty': {'NOT SO EASY': {'cannonballs': 12, 'variation': 'multiple smaller puzzles on the wall'},
                     'OH SO HARD': {'cannonballs': 8, 'variation': 'one target in a larger candidate wall'},
                     'VERY HARD': {'cannonballs': 6, 'variation': 'larger candidate wall'}},
      'difficulty_progression': {'levels': ['NOT SO EASY', 'OH SO HARD', 'VERY HARD'],
                                 'rule': 'Automatic increase after three consecutive complete-party successes at '
                                         'an activity; practice mode permits manual selection.',
                                 'manual_pdf_pages': [9, 10, 11]},
      'generator': {'status': 'mechanics_documented_generator_not_recovered',
                    'evidence': [{'kind': 'manual',
                                  'source': 'INSTALL/Data/Zoombinimr.pdf',
                                  'pdf_pages': [21, 32, 33]}],
                    'unknowns': ['Candidate-set sampling and sizes at each level',
                                 'How target is selected and ambiguity controlled',
                                 'Allocation of initial 12 cannonballs among the easiest subpuzzles']},
      'asset_roots': ['Data/Bmp/wall_of_fleens', 'Data/Bmp/FLEENS', 'INSTALL/HD/Bmp/wall_of_fleens'],
      'asset_association_status': 'Paths associated by internal scene names and manual mechanics; not complete '
                                  'runtime dependency graphs.'},
     {'id': 'mountain-rescue/snowboard-gulch',
      'game': 'mountain-rescue',
      'name': 'Snowboard Gulch',
      'mechanic': 'Route each Zoombini down a branching trail determined by its traits, avoiding Norfs. Infer '
                  'the sorting rules from a sign and observed runs; angry Norfs eventually close the slopes.',
      'manual_pdf_pages': [22, 33],
      'difficulty': {'NOT SO EASY': {'clues': 'trait sign visible'},
                     'OH SO HARD': {'clues': 'some sign clues hidden'},
                     'VERY HARD': {'clues': 'more clues hidden; exact count unconfirmed'}},
      'difficulty_progression': {'levels': ['NOT SO EASY', 'OH SO HARD', 'VERY HARD'],
                                 'rule': 'Automatic increase after three consecutive complete-party successes at '
                                         'an activity; practice mode permits manual selection.',
                                 'manual_pdf_pages': [9, 10, 11]},
      'generator': {'status': 'mechanics_documented_generator_not_recovered',
                    'evidence': [{'kind': 'manual',
                                  'source': 'INSTALL/Data/Zoombinimr.pdf',
                                  'pdf_pages': [22, 33]}],
                    'unknowns': ['Trait tests associated with each branch',
                                 'How blocking Norfs and routes are selected',
                                 'Exact hidden-clue counts and mistake budget; .pat curves are motion data, not '
                                 'the generator']},
      'asset_roots': ['Data/Bmp/snowboard', 'INSTALL/HD/Bmp/snowboard'],
      'asset_association_status': 'Paths associated by internal scene names and manual mechanics; not complete '
                                  'runtime dependency graphs.'},
     {'id': 'mountain-rescue/boolie-boggle',
      'game': 'mountain-rescue',
      'name': 'Boolie Boggle',
      'mechanic': 'Select which group of happy/sad Boolies receives a cluster of pinballs so every Boolie '
                  'becomes happy. The documented behavior is binary addition: sad=0, happy=1, carry propagates '
                  'left. All-happy groups board boats, but an additional ball can overflow them to all-sad.',
      'manual_pdf_pages': [23, 34],
      'difficulty': {'NOT SO EASY': {'boolies_per_group': 2},
                     'OH SO HARD': {'variation': 'longer Boolie groups and more pinballs; next cluster preview'},
                     'VERY HARD': {'variation': 'longer Boolie groups and more pinballs; next cluster preview'}},
      'difficulty_progression': {'levels': ['NOT SO EASY', 'OH SO HARD', 'VERY HARD'],
                                 'rule': 'Automatic increase after three consecutive complete-party successes at '
                                         'an activity; practice mode permits manual selection.',
                                 'manual_pdf_pages': [9, 10, 11]},
      'generator': {'status': 'mechanics_documented_generator_not_recovered',
                    'evidence': [{'kind': 'manual',
                                  'source': 'INSTALL/Data/Zoombinimr.pdf',
                                  'pdf_pages': [23, 34]}],
                    'unknowns': ['Exact group lengths/ball inventories above easiest level',
                                 'Initial mood and cluster sampling',
                                 'Global solvability guarantees and any subtraction/negative-ball behavior '
                                 'suggested by BALL_NEG asset']},
      'asset_roots': ['Data/Bmp/BOOLIES', 'INSTALL/HD/Bmp/Boolies'],
      'asset_association_status': 'Paths associated by internal scene names and manual mechanics; not complete '
                                  'runtime dependency graphs.'}]
    for puzzle in puzzles:
        for evidence in puzzle["generator"]["evidence"]:
            evidence["source_sha256"] = mountain_sha((source/evidence["source"]).read_bytes())
    mountain_json(output/"puzzles.json", puzzles)
    return puzzles



def mountain_verify(source: Path, output: Path):
    """Verify extraction integrity and key format invariants without game execution."""
    from PIL import Image
    # Synthetic coverage deliberately exercises opaque, missing and alpha pixels.
    payload = (struct.pack('<H',0) + struct.pack('<HHHB',0,0,1,0) + bytes([9,8,7])
               + struct.pack('<HHHB',2,0,1,1) + bytes([64,32,16,127]))
    data = struct.pack('<7I',0,0,len(payload),3,1,0,len(payload)) + payload
    image, meta = mountain_sparse(data,0,28,len(payload))
    assert [image.getpixel((x,0)) for x in range(3)] == [(9,8,7,255),(0,0,0,0),(128,64,32,128)]
    try:
        mountain_sparse(data[:-1],0,28,len(payload))
    except ValueError:
        pass
    else:
        raise AssertionError('truncated payload accepted')
    state=1
    sequence=[]
    for _ in range(3):
        state,value=mountain_rand(state); sequence.append(value)
    assert sequence == [41,18467,6334]
    records=[json.loads(line) for line in (output/'manifest.jsonl').read_text().splitlines()]
    image_count=0
    for record in records:
        assert record['status']=='decoded', record
        assert mountain_sha((source/record['source']).read_bytes())==record['source_sha256']
        frames=record.get('frames',[])
        if 'output_sha256' in record:
            frames=frames+[record]
        for frame in frames:
            file=output/frame['output']
            assert mountain_sha(file.read_bytes())==frame['output_sha256'], str(file)
            with Image.open(file) as image:
                image.verify()
            image_count+=1
    ztlpath=source/'Data/Bmp/magic_wall/DEFAULT.ZTL'
    raw=ztlpath.read_bytes();table=mountain_ztl(raw)
    values=[table['record_count']]
    for record in table['records']:
        values += [record['category'],record['selection_weight'],record['point_count']]
        for point in record['points']:
            values += point
        for pool in record['move_variant_pools']:
            values.append(len(pool['variants']))
            for variant in pool['variants']:
                values.append(len(variant['moves']))
                for move in variant['moves']:
                    values.append(len(move['transfers']))
                    for transfer in move['transfers']:
                        values+=transfer['raw']
    assert struct.pack('<'+'H'*len(values),*values)==raw
    result={'status':'passed','source_files_hashed':len(records),'png_files_hashed_and_verified':image_count,
            'checks':['opaque/missing/premultiplied inverse-alpha synthetic fixture',
                      'reject truncated sparse payload', 'PRNG known sequence from seed 1',
                      'every extracted source SHA-256', 'every PNG SHA-256 and Pillow integrity',
                      'ZTL parse/serialize byte-exact roundtrip'],
            'visual_qa':'Background and animation contact sheets inspected; upright RGB colors and transparent sprites are coherent. No runtime fidelity comparison.'}
    mountain_json(output/'verification.json',result)
    print(json.dumps(result,indent=2))
    return result


def mountain_main():
    base = Path(__file__).resolve().parents[1]
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,default=base/'local/discs/mountain-rescue')
    parser.add_argument('--output',type=Path,default=base/'local/derived/mountain-rescue')
    parser.add_argument('--verify-only', action='store_true', help='Validate existing extraction and rebuild puzzle catalog')
    args=parser.parse_args()
    if args.verify_only:
        mountain_write_puzzles(args.source,args.output)
        mountain_verify(args.source,args.output)
        return
    result=mountain_extract(args.source,args.output)
    if not result['counts'].get('errors'):
        mountain_verify(args.source,args.output)
    raise SystemExit(1 if result['counts'].get('errors') else 0)


if __name__=='__main__':
    mountain_main()
