#!/usr/bin/env python3
"""Build source-grounded Island Odyssey puzzle records and local art overview."""
from pathlib import Path
import json
import re
import sys
from island_odyssey import write_json, sha


PUZZLES = [
    ('The Catapult', [16,17,33,34], 'Schedule boulders and mudballs through coupled gears so boulders arrive at the catapult during its active phase.',
     ['Reason about the gear and cam periods.', 'Smaller-gear tooth counts and paddle timing can change.', 'A chain and extra gear make the big wheel advance two teeth for each small-gear tooth.'], 'RCatapultGame'),
    ('The Wall', [18,19,34], 'Infer a symbol-to-hieroglyph substitution, then tile the wall consistently using repeated-symbol patterns.',
     ['Tile indentations and indicator lights show placement and number of matches.', 'Indentations and match lights disappear; a locally matching tile can block the remaining tiling.', 'Tiles have three symbols, making overlaps and matching less informative.'], 'RGlyphGame'),
    ('The Planetarium', [20,21,35], 'Spend hour coins and day bills to advance two astronomical exhibits to a target time and, at higher difficulty, day.',
     ['Match an hour target in rotating-Earth and apparent-Sun views.', 'Moon motion appears in both exhibits.', 'Match day and hour with hour coins and day bills; the modeled lunar month has 28 phases.'], 'RPlanetariumGame'),
    ('The Greenhouse', [22,23,36], 'Find orthogonal paths through plants matching a moth trait; rearrange plants with a limited swap wand and manage beetles.',
     ['Trace complete paths; moths cannot move diagonally.', 'A limited wand swaps pairs of plants to create paths.', 'Additional flower colors/shapes and beetles traveling top-to-bottom complicate paths.'], 'native greenhouse implementation'),
    ('The Garden', [24,36,37], 'Infer a hidden classification of plants into holes by their root, stem, leaf, and flower attributes.',
     ['One relevant attribute groups plants by hole.', 'Two relevant attributes independently determine row and column.', 'Three attributes determine row, column, and one of four plots.'], 'RGardenGame'),
    ('The Corral', [25,26,37], 'Use projected overlapping sets to infer which berry traits each Zerble likes, then feed matching fruit.',
     ['Each Zerble requires two traits; projections highlight tested traits.', 'Each requires three traits; three projectors form intersecting sets.', 'Three traits remain required but projections no longer highlight which trait they test.'], 'RCorralGame'),
    ('The Barn', [27,28,38], 'Pair two diploid Zerbles so the four pairwise allele combinations produce a target phenotype distribution under cyclic dominance.',
     ['Parental alleles are revealed; dominance follows a rock-paper-scissors cycle.', 'Parental alleles are hidden and must be inferred from offspring previews.', 'Target traits switch from feet to tails.'], 'RBarnGame'),
]


def make_corpus(disc, output):
    manifest = json.loads((output / 'assets-manifest.json').read_text())['assets']
    exe_path = disc / 'HD/Win/Zoombinis Island Odyssey.exe'
    exe = exe_path.read_bytes()
    records = []
    for number, (name, pages, mechanic, levels, classname) in enumerate(PUZZLES, 1):
        source = f'HD/scripts/z3a{number}.xml'
        data = (disc / source).read_bytes()
        decoded = json.loads((output / f'xml/z3a{number}.json').read_text())['root']
        help_node = next(x for x in decoded['children'] if x['tag'] == 'Help')
        difficulty = []
        for level, summary in enumerate(levels, 1):
            xml_level = next(x for x in help_node['children'] if x['tag'] == f'Level{level}')
            difficulty.append(dict(level=level, summary=summary, source=source,
                source_sha256=sha(data), xml_path=f'/{decoded["tag"]}/Help/Level{level}',
                help_pages=[x for x in xml_level['children'] if x['tag']=='Page']))
        roots = [f'assets/z3a{number}', f'assets/z3a{number}cd']
        assets = [x for x in manifest if x['directory'].lower() in (f'z3a{number}', f'z3a{number}cd')]
        tokens = ['setupGame', 'generatePuzzle', classname, f'Z3A{number}Data']
        evidence = []
        for token in tokens:
            matches = [m.start() for m in re.finditer(re.escape(token.encode()+b'\0'), exe)]
            if matches:
                evidence.append(dict(source='HD/Win/Zoombinis Island Odyssey.exe',
                    source_sha256=sha(exe), token=token, file_offsets=matches,
                    meaning='verbatim native symbol string, not proof of full algorithm'))
        generator = dict(status='native_generation_not_fully_decoded', evidence=evidence,
                         unknowns=['Complete generation and rejection/solvability algorithm.',
                                   'All exact level parameters, PRNG call order, and seed parity.'])
        if number == 4:
            generator.update(status='template_data_and_core_grid_generation_statically_decoded',
                             exact_recovery='logic/greenhouse-generator.json',
                             unknowns=['Runtime parity has not been tested.',
                                       'Final trait permutation, moth/beetle setup, progression, and all rendering semantics remain to be recovered.'])
        scene = next(x for x in decoded['children'] if x['tag'] == 'Scene')
        background = next(x['text'] for x in scene['children'] if x['tag'] == 'background')
        records.append(dict(id=f'island-odyssey-z3a{number}', name=name, mechanic=mechanic,
                            manual_pdf_pages=pages, difficulty=difficulty, generator=generator,
                            script=f'HD/scripts/z3a{number}.mps',
                            script_evidence=f'scripts/z3a{number}.strings.json',
                            asset_roots=roots, resource_count=len(assets),
                            background=f'assets/z3bkgd/{background}.jpg'))
    write_json(output / 'puzzles.json', records)
    template_source = disc / 'HD/scripts/z3a4data.xml'
    xml = json.loads((output / 'xml/z3a4data.json').read_text())['root']
    templates = []
    for group in xml['children']:
        for item in group['children']:
            grid = [[int(x) for x in item['attributes'][f'line{i}'].split()] for i in range(1,13)]
            assert len(grid) == 12 and all(len(row) == 12 for row in grid)
            templates.append(dict(group=group['tag'], name=item['tag'],
                declared_num=int(group['attributes']['Num']), grid=grid,
                BE=[int(x) for x in item['attributes'].get('BE', '').split()],
                selected_by_shipped_random_path=item['tag']=='T1'))
    write_json(output / 'logic/greenhouse-templates.json', dict(
        source='HD/scripts/z3a4data.xml', sha256=sha(template_source.read_bytes()), templates=templates))
    write_json(output / 'logic/greenhouse-generator.json', dict(
        status='static_disassembly_recovery; not executed or runtime parity-tested',
        source='HD/Win/Zoombinis Island Odyssey.exe', sha256=sha(exe), image_base='0x400000',
        offset_mapping='For all addresses below, file_offset = virtual_address - 0x400000.',
        steps=[
            dict(address='0x40537c-0x405397', operation='Use supplied seed, or time(NULL) when it is zero; call MSVCRT srand.'),
            dict(address='0x4053a6-0x4053c9', operation='Level 3 selects template channel cardinalities 6 and 6; other levels select 4 and 5.'),
            dict(address='0x405110-0x405161', operation='Zero 144 grid cells, compose Template3 at shift 0, then selected templates at shifts 2 and 5. Shift table is three uint32 values (0,2,5) at file offset 0x4f4a8.'),
            dict(address='0x404ea0-0x404ff7', operation='Choose TemplateN; read Num; select T(rand()%Num+1); parse optional BE triple and twelve line1..line12 rows, twelve integers each. Every shipped group has Num=1; thus this path selects only T1 even though Template3 also stores T2 and T3.'),
            dict(address='0x405128-0x405161; 0x405000-0x40502c; 0x404c10-0x404d5f', operation='Template3 uses transform code90 at level3, otherwise rand()%4. The other two channels independently use rand()%4. Transform0 is identity,1 reverses columns,2 reverses rows,3 reverses both;90 rotates a 12x12 grid clockwise.'),
            dict(address='0x405031-0x40505e', operation='Add each transformed template value shifted by its channel bit offset to the packed grid.'),
            dict(address='0x404de0-0x404e9a; 0x40516e-0x4051fe', operation='For each zero channel in row-major grid order, fill rand()%cardinality+1. Channels are bits0..1,2..4,5..7 with cardinalities3,N1,N2 respectively.'),
            dict(address='0x405204-0x4052b1; 0x405070-0x4050ff', operation='At levels other than1, perform20 accepted swaps. Choose both indices with rand()%144; reject equal indices. At level3 also require both cells to have equal low-two-bit attributes. Swap complete packed cells. Failed candidates do not increment the successful-swap count.'),
            dict(address='0x4052b7; 0x40541a onward', operation='Further helper calls and attribute permutation follow; these are not yet reconstructed.')],
        caveats=['Semantic labels for packed channels have not been fully resolved.',
                 'No full generator or gameplay parity claim is made.']))
    disassembly = output / 'native/island-odyssey.disassembly.txt'
    if disassembly.exists():
        lines = []
        for line in disassembly.read_text().splitlines():
            match = re.match(r'\s*([0-9a-f]+):', line)
            if match and 0x404be0 <= int(match[1], 16) <= 0x40541a:
                lines.append(line)
        (output / 'logic/greenhouse-generator.asm').write_text('\n'.join(lines)+'\n')


def make_overview(output):
    from PIL import Image, ImageDraw
    sheet = Image.new('RGB', (1100, 960), '#e8e5dc')
    draw = ImageDraw.Draw(sheet)
    records = json.loads((output / 'puzzles.json').read_text())
    for i, (name, _, _, _, _) in enumerate(PUZZLES, 1):
        x, y = ((i-1)%3)*365+10, ((i-1)//3)*315+10
        path = output / records[i-1]['background']
        img = Image.open(path).convert('RGB'); img.thumbnail((345,270))
        sheet.paste(img, (x,y+25)); draw.text((x,y), f'{i}. {name}', fill='#202020')
    sheet.save(output / 'background-overview.jpg', quality=90)
    sheet = Image.new('RGB', (1000, 1000), '#e8e5dc')
    draw = ImageDraw.Draw(sheet)
    paths = []
    for n in range(1,8):
        candidates = sorted((output / f'frames/z3a{n}').glob('*/0000.png'))
        paths.extend(candidates[:7])
    for i,p in enumerate(paths):
        x,y=(i%7)*142,(i//7)*142
        img=Image.open(p);img.thumbnail((132,112))
        sheet.paste(img,(x+5+(132-img.width)//2,y+20+(112-img.height)//2),img)
        draw.text((x+4,y+3),f'{p.parent.parent.name}/{p.parent.name}',fill='#202020')
    sheet.save(output / 'sprite-overview.jpg', quality=90)


if __name__ == '__main__':
    root=Path(__file__).resolve().parents[1]
    disc=root/'local/discs/island-odyssey'
    output=root/'local/derived/island-odyssey'
    make_corpus(disc,output)
    if '--overview' in sys.argv:
        make_overview(output)
    print('Wrote seven puzzle records and Greenhouse generation evidence.')
