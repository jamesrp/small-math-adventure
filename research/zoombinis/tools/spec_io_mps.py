#!/usr/bin/env python3
"""Lossless structural decoder for the Island Odyssey compiled MPS scripts.

Opcode numbers are retained; mnemonic labels are analysis conveniences, not a
claim of a complete VM. Three implicit symbol slots precede serialized symbols.
"""
from pathlib import Path
import struct

ROOT=Path(__file__).resolve().parents[1]


def decode(path):
    raw=Path(path).read_bytes()
    if raw[0]!=2: raise ValueError('Unsupported MPS version')
    n=struct.unpack_from('<I',raw,1)[0]
    instructions=[struct.unpack_from('<BH',raw,5+3*i) for i in range(n)]
    pos=5+3*n
    pool_count=struct.unpack_from('<I',raw,pos)[0];pos+=4
    pool=struct.unpack_from('<'+'H'*pool_count,raw,pos);pos+=2*pool_count
    count=struct.unpack_from('<I',raw,pos)[0];pos+=4
    symbols=[dict(id=i,name=f'$implicit{i}') for i in range(3)]
    def integer():
        nonlocal pos
        value=struct.unpack_from('<i',raw,pos)[0];pos+=4
        return value
    def string():
        nonlocal pos
        length=integer()
        if length==-1:return None
        if length<0 or pos+length>len(raw):raise ValueError('MPS string out of bounds')
        text=raw[pos:pos+length].decode('latin1');pos+=length
        return text
    for i in range(3,count):
        start=pos;kind=integer();typ=integer()
        value=integer() if typ==3 else None
        metadata=[integer() for _ in range(4)]
        name=string();expression=string();refs_count=integer()
        if refs_count < -1:raise ValueError('MPS reference count invalid')
        refs=[struct.unpack_from('<H',raw,pos+2*j)[0] for j in range(max(0,refs_count))]
        pos+=2*max(0,refs_count)
        symbols.append(dict(id=i,offset=start,kind=kind,type=typ,value=value,
                            metadata=metadata,name=name,expression=expression,refs=refs))
    if pos!=len(raw):raise ValueError(f'MPS trailing data: {pos}/{len(raw)}')
    rows=[]
    for i,(opcode,index) in enumerate(instructions):
        refs=[]
        for ref in (() if opcode in (0x0a,0x0b,0x0d,0x0f) else pool[index:]):
            if ref==65535:break
            if ref>=len(symbols):raise ValueError('MPS symbol reference out of bounds')
            refs.append(ref)
        else:
            if opcode not in (0x0a,0x0b,0x0d,0x0f):raise ValueError('MPS argument list is unterminated')
        rows.append(dict(index=i,offset=5+3*i,opcode=opcode,pool_index=index,refs=refs,
                         args=[symbols[r]['name'] for r in refs]))
    return dict(version=2,instructions=rows,symbols=symbols,pool=list(pool))


if __name__=='__main__':
    import argparse,json
    p=argparse.ArgumentParser();p.add_argument('scene');p.add_argument('--start',type=int,default=0);p.add_argument('--end',type=int)
    a=p.parse_args();data=decode(ROOT/f'local/discs/island-odyssey/HD/scripts/{a.scene}.mps')
    for r in data['instructions'][a.start:a.end]:
        print(f'{r["index"]:4d} {r["offset"]:08x} {r["opcode"]:02x} operand={r["pool_index"]:<5d} '+ ' | '.join(r['args']))
