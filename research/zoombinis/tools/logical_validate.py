#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Validate Logical Journey archive slices, image index preservation and LZ output.

The LZ oracle, adapted from ScummVM engines/mohawk/bitmap.cpp (GPL-3.0-or-later),
uses absolute output offsets instead of the extractor's
circular dictionary. It follows the published Mohawk sliding-window format.
No original game code is executed. This is not proof of renderer equivalence.
"""
import argparse,collections,json,struct
from pathlib import Path
from PIL import Image
from logical_journey import logical_bitmap_payload,logical_bitmap_pixels,logical_hash,logical_u32


def logical_lz_absolute(data,size):
    output=bytearray(max(1024,size));src=written=flag=0
    while written<size:
        flag >>= 1
        if not flag&256:
            flag=data[src]|0xff00;src+=1
        if flag&1:
            output[written]=data[src];src+=1;written+=1
        else:
            code=int.from_bytes(data[src:src+2],'big');src+=2
            count=min((code>>10)+3,size-written)
            index=(code+66)&1023
            absolute=(written//1024)*1024+index
            if index>(written&1023):
                if written+count>=1024:
                    absolute-=1024
                elif index+count>1023:
                    for _ in range(count):
                        output[written]=output[absolute]
                        written+=1;absolute+=1
                        if absolute>1023:absolute=0
                    continue
            for _ in range(count):
                output[written]=output[absolute]
                written+=1;absolute+=1
    return bytes(output[:size])


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--disc',type=Path,required=True);parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    rows=list(map(json.loads,(args.out/'resources.jsonl').read_text().splitlines()))
    sources={}
    failures=[];counts=collections.Counter()
    for r in rows:
        if r['archive'] not in sources:
            sources[r['archive']]=(args.disc/r['archive']).read_bytes()
        raw=(args.out/r['raw_path']).read_bytes()
        assert raw==sources[r['archive']][r['offset']:r['offset']+r['size']]
        assert logical_hash(raw)==r['sha256']
        counts['resource_slices_and_sha256_verified']+=1
        if r['tag']=='tBMP':
            fmt=int.from_bytes(raw[6:8],'big')
            if fmt&0xf00==0x100:
                at=780 if fmt&8 else 8
                expected=logical_lz_absolute(raw[at+10:],logical_u32(raw,at))
                actual=logical_bitmap_payload(raw)[1]
                assert expected==actual, r['raw_path']
                counts['lz_resources_compared_to_absolute_offset_oracle']+=1
    for row in map(json.loads,(args.out/'images.jsonl').read_text().splitlines()):
        image=Image.open(args.out/row['path'])
        assert image.mode=='P' and image.size==(row['width'],row['height'])
        assert logical_hash(image.tobytes())==row['pixel_indices_sha256']
        counts['png_dimensions_and_index_hashes_verified']+=1
    import wave
    for row in map(json.loads,(args.out/'audio.jsonl').read_text().splitlines()):
        with wave.open(str(args.out/row['path']),'rb') as wav:
            data=wav.readframes(wav.getnframes())
            assert logical_hash(data)==row['sample_bytes_sha256']
        counts['wav_sample_hashes_verified']+=1
    report={'checks':dict(counts),'failures':failures,'limits':['Does not validate runtime palette selection, alpha, animation timing, or gameplay behavior.','picker/tBMP1001 looks noisy with its matching palette; visual fidelity unresolved.']}
    (args.out/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
