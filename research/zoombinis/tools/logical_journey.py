#!/usr/bin/env python3
"""Reproducible local extraction of Zoombinis Logical Journey Mohawk archives.

Format references: ScummVM engines/mohawk/{resource.cpp,bitmap.cpp,bitmap.h}.
All assets are emitted to an explicitly selected local-only output directory.
No original executable or installer is run. Resource coordinates refer to bytes
in the extracted disc file, so source hashes + offsets preserve provenance.
"""
from __future__ import annotations
import argparse, collections, hashlib, json, re, struct
from pathlib import Path


def logical_hash(data):
    return hashlib.sha256(data).hexdigest()


def logical_u16(data, at):
    return struct.unpack_from('>H', data, at)[0]


def logical_u32(data, at):
    return struct.unpack_from('>I', data, at)[0]


def logical_mhk(path):
    data = path.read_bytes()
    if data[:4] != b'MHWK' or data[8:12] != b'RSRC':
        raise ValueError('not a Mohawk archive')
    assert logical_u16(data, 12) == 0x100
    base = logical_u32(data, 20)
    ft = base + logical_u16(data, 24)
    files = []
    for i in range(logical_u32(data, ft)):
        p = ft + 4 + 10*i
        offset = logical_u32(data, p)
        size = logical_u16(data, p+4) + (data[p+6] << 16) + ((data[p+7] & 7) << 24)
        assert offset + size <= len(data), (path, i, offset, size)
        files.append({'offset': offset, 'size': size, 'flags': data[p+7], 'unknown': logical_u16(data, p+8)})
    string_base = base + logical_u16(data, base)
    resources = []
    for t in range(logical_u16(data, base+2)):
        at = base + 4 + t*8
        raw_tag = data[at:at+4]
        tag = raw_tag.decode('latin1').replace('\0','')
        rt, nt = (base+logical_u16(data, at+k) for k in (4,6))
        names = {}
        for j in range(logical_u16(data, nt)):
            p = nt+2+4*j
            no = string_base + logical_u16(data,p)
            names[logical_u16(data,p+2)] = data[no:data.index(b'\0', no)].decode('latin1')
        for j in range(logical_u16(data,rt)):
            p = rt+2+4*j
            rid, index = logical_u16(data,p), logical_u16(data,p+2)
            entry = files[index-1]
            payload = data[entry['offset']:entry['offset']+entry['size']]
            resources.append({'tag':tag, 'tag_hex':raw_tag.hex(), 'id':rid, 'file_table_index':index,
                'name':names.get(index,''), **entry, 'sha256':logical_hash(payload), 'payload':payload})
    return data, resources


def logical_strings(data):
    return [{'offset':m.start(), 'text':m.group().decode('ascii')} for m in re.finditer(rb'[\x20-\x7e]{5,}', data)]


def logical_lz(data, size):
    """Mohawk's 1024-byte LZSS ring, zero-initialized, LSB-first flags."""
    if size > 256*1024*1024:
        raise ValueError('unreasonable decompressed size')
    ring, result = bytearray(1024), bytearray()
    cursor = pos = flags = 0
    while len(result) < size:
        flags >>= 1
        if not flags & 0x100:
            flags = data[cursor] | 0xff00
            cursor += 1
        if flags & 1:
            chunk = [data[cursor]]
            cursor += 1
            ring[pos] = chunk[0]
            pos = (pos+1)&1023
            result.extend(chunk)
        else:
            code = logical_u16(data,cursor)
            cursor += 2
            source = (code+66)&1023
            length = min((code>>10)+3,size-len(result))
            for _ in range(length):
                value = ring[source]
                source = (source+1)&1023
                result.append(value)
                ring[pos] = value
                pos = (pos+1)&1023
    return bytes(result)


def logical_bitmap_payload(data):
    width, height, stride, fmt = struct.unpack_from('>HHHH',data)
    width, height, stride = width&0x3fff, height&0x3fff, stride&0x3ffe
    at = 8
    palette = None
    if fmt & 8:
        palette = [tuple(data[at+4+i*3:at+7+i*3][::-1]) for i in range(256)]
        at += 772
    pack = fmt&0xf00
    if pack == 0x100:
        size, compressed, dictionary = struct.unpack_from('>IIH',data,at)
        if dictionary != 1024:
            raise ValueError('unsupported LZ dictionary')
        payload = logical_lz(data[at+10:],size)
    elif pack == 0:
        payload = data[at:]
    else:
        raise ValueError(f'unsupported pack {pack:x}')
    return {'width':width,'height':height,'stride':stride,'format':fmt}, payload, palette


def logical_is_compound(header, data):
    count = header['width']
    if not 0 < count <= 10000 or len(data) < count*4:
        return False
    offsets = [logical_u32(data,i*4) for i in range(count)]
    return offsets[0] == count*4+8 and all(a<=b for a,b in zip(offsets,offsets[1:])) and offsets[-1] < len(data)+8


def logical_bitmap_pixels(header, data):
    from PIL import Image
    width, height, stride, fmt = (header[k] for k in ('width','height','stride','format'))
    if not 0 < width*height <= 32000000 or fmt&7 != 2:
        raise ValueError(f'unsupported image {header}')
    draw = fmt&0xf0
    if draw == 0:
        if len(data)<stride*height:
            raise ValueError('short raw pixels')
        result = b''.join(data[y*stride:y*stride+width] for y in range(height))
    elif draw == 0x10:
        result = bytearray()
        at = 0
        for y in range(height):
            end = at+2+logical_u16(data,at)
            at += 2
            row = bytearray()
            while len(row)<width:
                code = data[at]; at += 1
                n = min((code&127)+1,width-len(row))
                if code&128:
                    row.extend([data[at]]*n); at += 1
                else:
                    row.extend(data[at:at+n]); at += n
            if at > end:
                raise ValueError('RLE row exceeded declared byte count')
            at = end
            result.extend(row)
    else:
        raise ValueError(f'unsupported draw {draw:x}')
    return Image.frombytes('P',(width,height),bytes(result))


def logical_palette(payload, skip=0):
    start, count = struct.unpack_from('>HH',payload,skip)
    assert skip+4+count*4 == len(payload)
    assert start+count <= 256
    colors = {start+i:list(payload[skip+4+i*4:skip+7+i*4]) for i in range(count)}
    return {'start':start,'count':count,'colors':colors}


def logical_animation(payload, tag):
    """Structurally validated frame records; marker semantics remain provisional."""
    expected = logical_u16(payload,0)
    at = 4 if tag == 'SCRS' else 2
    frames, layers = [], []
    while at < len(payload):
        word = logical_u16(payload,at); at += 2
        if word>>8 in (254,255):
            frame = {'layers':layers, 'marker':f'{word:04x}'}
            if word>>8 == 254:
                frame['marker_argument'] = logical_u16(payload,at); at += 2
            frames.append(frame)
            layers = []
        else:
            x,y = struct.unpack_from('>hh',payload,at); at += 4
            layers.append({'shape_index':word,'x':x,'y':y})
    assert at == len(payload) and not layers and len(frames) == expected
    result = {'frame_count':expected,'frames':frames,'status':'frame boundaries and triplets verified; marker semantics, timing, sprite bank resolution not recovered'}
    if tag == 'SCRS':
        result['header_word_2'] = logical_u16(payload,2)
    return result


def logical_audio(payload):
    assert payload[:4] == b'MHWK' and payload[8:12] == b'WAVE'
    at = 12
    chunks = []
    while at < len(payload):
        tag = payload[at:at+4].decode('ascii')
        size = logical_u32(payload,at+4)
        chunks.append({'tag':tag,'offset':at,'size':size})
        at += 8
        if tag == 'Data':
            rate, samples, bits, channels, encoding, loops, start, end = struct.unpack_from('>HIBBHHII',payload,at)
            data = payload[at+20:at+size]
            assert encoding == 0 and bits == 8 and channels == 1
            assert len(data) == samples
            return {'sample_rate':rate,'sample_count':samples,'bits':bits,'channels':channels,'encoding':encoding,'loop_count':loops,'loop_start':start,'loop_end':end,'chunks':chunks},data
        at += size
    raise ValueError('no Data chunk')


def logical_derive(disc, out, records):
    from PIL import Image, ImageDraw
    import wave
    palettes = []
    for r in records:
        if r['tag'] not in ('SHPL','tPAL'):
            continue
        payload = (out/r['raw_path']).read_bytes()
        p = logical_palette(payload,4 if r['tag']=='SHPL' else 0)
        p.update({'archive':r['archive'],'resource_id':r['id'],'tag':r['tag'],'source':r['raw_path']})
        palettes.append(p)
    (out/'palettes.json').write_text(json.dumps(palettes,indent=2)+'\n')
    # Infer only entries that agree across every main-puzzle palette. Keep all
    # original indices; unresolved entries get a documented gray placeholder.
    primary = {'basecamp','bctwo','bridge','caves','ferry','fleens','hotel','lilly','maze2','net','pizza','rodmap','slides','smoke','tunnels'}
    agreeing = [p for p in palettes if Path(p['archive']).stem in primary and p['count']>100 and p['tag']=='SHPL']
    common = dict(agreeing[0]['colors']) if agreeing else {}
    for p in agreeing[1:]:
        common = {i:rgb for i,rgb in common.items() if p['colors'].get(i)==rgb}
    (out/'shared-palette-evidence.json').write_text(json.dumps({'status':'inferred runtime use; entries are byte-identical across cited palettes','sources':[p['source'] for p in agreeing],'colors':common},indent=2)+'\n')
    images, animations, audio, texts, errors = [], [], [], [], []
    previews = []
    for r in records:
        payload = (out/r['raw_path']).read_bytes()
        archive = Path(r['archive']).stem
        identity = {'archive':r['archive'],'resource_id':r['id'],'tag':r['tag'],'source':r['raw_path'],'source_sha256':r['sha256']}
        try:
            if r['tag']=='tBMP':
                h,data,embedded = logical_bitmap_payload(payload)
                compound = logical_is_compound(h,data)
                if compound:
                    offsets = [logical_u32(data,i*4)-8 for i in range(h['width'])]+[len(data)]
                    frames = [logical_bitmap_payload(data[a:b]) for a,b in zip(offsets,offsets[1:])]
                else:
                    offsets = [0]
                    frames = [(h,data,embedded)]
                choices = [p for p in palettes if p['archive']==r['archive'] and p['count']>32]
                exact = [p for p in choices if p['resource_id']==r['id']]
                earlier = [p for p in choices if p['resource_id']<=r['id']]
                chosen = exact[0] if exact else max(earlier,key=lambda p:p['resource_id']) if earlier else choices[0] if choices else None
                palette_status = 'matching resource id' if exact else 'inferred preceding palette within archive' if chosen else 'inferred shared palette entries; remaining indices grayscale'
                for i,(fh,fd,fp) in enumerate(frames):
                    im = logical_bitmap_pixels(fh,fd)
                    palette = [(v,v,v) for v in range(256)]
                    supplied = set()
                    for ix,rgb in common.items():
                        palette[int(ix)] = rgb; supplied.add(int(ix))
                    if chosen:
                        for ix,rgb in chosen['colors'].items():
                            palette[int(ix)] = rgb; supplied.add(int(ix))
                    if fp:
                        palette=fp; supplied=set(range(256))
                    im.putpalette([c for color in palette for c in color])
                    dest = Path('images')/archive/f'{r["id"]:05d}'/f'{i:04d}.png'
                    (out/dest).parent.mkdir(parents=True,exist_ok=True)
                    im.save(out/dest)
                    used = set(im.tobytes())
                    item = {**identity,'frame_index':i,'compound':compound,'width':im.width,'height':im.height,'path':str(dest),'pixel_indices_sha256':logical_hash(im.tobytes()),'palette_status':'embedded' if fp else palette_status,'palette_source':chosen['source'] if chosen else None,'unresolved_used_palette_indices':sorted(used-supplied),'transparency':'index data preserved; no inferred alpha applied','visual_status':'unverified palette/image fidelity: picker resource 1001 has noisy colors' if archive=='picker' and r['id']==1001 else 'not individually inspected'}
                    if compound:
                        item['unpacked_container_offset'] = offsets[i]+8
                    images.append(item)
                    if im.size==(640,480) and not (archive=='picker' and r['id']==1001) and len([x for x in previews if x[0]==archive])<1:
                        previews.append((archive,im.convert('RGB').copy(),str(dest)))
            elif r['tag'] in ('SCRB','SCRS'):
                obj = logical_animation(payload,r['tag'])
                dest=Path('animations')/archive/r['tag']/f'{r["id"]:05d}.json'
                (out/dest).parent.mkdir(parents=True,exist_ok=True)
                (out/dest).write_text(json.dumps({**identity,**obj},separators=(',',':'))+'\n')
                animations.append({**identity,'frame_count':obj['frame_count'],'path':str(dest)})
            elif r['tag']=='SND':
                info,samples = logical_audio(payload)
                dest=Path('audio')/archive/f'{r["id"]:05d}.wav'
                (out/dest).parent.mkdir(parents=True,exist_ok=True)
                with wave.open(str(out/dest),'wb') as wav:
                    wav.setnchannels(info['channels']);wav.setsampwidth(info['bits']//8);wav.setframerate(info['sample_rate']);wav.writeframes(samples)
                audio.append({**identity,**info,'path':str(dest),'sample_bytes_sha256':logical_hash(samples)})
            elif r['tag']=='STRL':
                parts = payload[1:].split(b'\0')
                assert not parts[-1] and len(parts)-1==payload[0]
                texts.append({**identity,'strings':[p.decode('cp1252') for p in parts[:-1]]})
        except Exception as e:
            errors.append({**identity,'error':str(e),'exception':type(e).__name__})
    for name,items in [('images',images),('animations',animations),('audio',audio),('texts',texts)]:
        (out/(name+'.jsonl')).write_text(''.join(json.dumps(x)+'\n' for x in items))
    exe=disc/'INSTALL/HD/Zoombinis Logical Journey.exe'
    if exe.exists():
        ed=exe.read_bytes()
        evidence={'source':str(exe.relative_to(disc)),'sha256':logical_hash(ed),'strings':logical_strings(ed)}
        (out/'executable-strings.json').write_text(json.dumps(evidence,indent=2)+'\n')
    if previews:
        sheet=Image.new('RGB',(960,264*((len(previews)+2)//3)),(235,235,235));draw=ImageDraw.Draw(sheet)
        for i,(name,im,path) in enumerate(previews):
            x,y=i%3*320,i//3*264;im.thumbnail((320,240));sheet.paste(im,(x,y));draw.text((x+6,y+243),name,fill=(0,0,0))
        sheet.save(out/'contact-sheet.png')
    summary={'resource_count':len(records),'image_count':len(images),'bitmap_resource_count':sum(r['tag']=='tBMP' for r in records),'compound_bitmap_count':len(set((x['archive'],x['resource_id']) for x in images if x['compound'])),'animation_resource_count':len(animations),'animation_frame_records':sum(x['frame_count'] for x in animations),'audio_count':len(audio),'text_resource_count':len(texts),'palette_resource_count':len(palettes),'errors':errors}
    (out/'decode-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps(summary,indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--disc', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    summary, all_records = [], []
    for path in sorted((args.disc/'DATA').glob('*.mhk')):
        data, records = logical_mhk(path)
        archive = {'path':str(path.relative_to(args.disc)), 'sha256':logical_hash(data), 'size':len(data),
            'resource_count':len(records), 'types':dict(collections.Counter(r['tag'] for r in records))}
        summary.append(archive)
        for record in records:
            payload = record.pop('payload')
            relative = Path('resources')/path.stem/record['tag']/f'{record["id"]:05d}.bin'
            target = args.out/relative
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(payload)
            record.update({'archive':archive['path'], 'archive_sha256':archive['sha256'], 'raw_path':str(relative)})
            all_records.append(record)
        print(path.name, len(records), archive['types'])
    (args.out/'archives.json').write_text(json.dumps(summary,indent=2)+'\n')
    (args.out/'resources.jsonl').write_text(''.join(json.dumps(r)+'\n' for r in all_records))
    print('total', len(all_records))
    logical_derive(args.disc,args.out,all_records)
    import subprocess,sys
    subprocess.run([sys.executable,str(Path(__file__).with_name('logical_catalog.py')),'--out',str(args.out)],check=True)

if __name__ == '__main__':
    main()
