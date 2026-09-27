#!/usr/bin/env python3
"""Read-only, version-guarded PE32 slices and immediate-address references.

Raw address matches are candidates, not proof of an executed reference. Decode
from known instruction boundaries; a linear listing may decode jump-table data.
"""
import argparse
import hashlib
from pathlib import Path
import struct
from native_analysis import ROOT, BINARIES, KNOWN_SHA256, pe_sections


class NativeImage:
    def __init__(self, game):
        self.game = game
        self.source = ROOT / 'local/discs' / game / BINARIES[game]
        self.data = self.source.read_bytes()
        self.sha256 = hashlib.sha256(self.data).hexdigest()
        if self.sha256 != KNOWN_SHA256[game]:
            raise ValueError('Unknown executable version')
        self.base, self.sections = pe_sections(self.data)

    def offset(self, address):
        s = next(s for s in self.sections if s['virtual_address'] <= address < s['virtual_address']+s['file_size'])
        return s['file_offset'] + address-s['virtual_address']

    def read(self, address, size):
        start = self.offset(address)
        assert self.offset(address+size-1) == start+size-1
        return self.data[start:start+size]

    def disassembly(self, address, size):
        from capstone import Cs, CS_ARCH_X86, CS_MODE_32
        return '\n'.join(f'{i.address:08x}  {i.bytes.hex():<24} {i.mnemonic} {i.op_str}'
                         for i in Cs(CS_ARCH_X86, CS_MODE_32).disasm(self.read(address,size),address))

    def references(self, address):
        needle = struct.pack('<I',address)
        hits=[]
        for s in self.sections:
            chunk=self.data[s['file_offset']:s['file_offset']+s['file_size']]
            pos=0
            while (pos:=chunk.find(needle,pos))>=0:
                hits.append((s['name'],s['virtual_address']+pos));pos+=1
        return hits


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('game',choices=BINARIES)
    p.add_argument('address',type=lambda v:int(v,0))
    p.add_argument('--size',type=lambda v:int(v,0),default=0x300)
    p.add_argument('--refs',action='store_true')
    p.add_argument('--out',type=Path)
    a=p.parse_args();im=NativeImage(a.game)
    if a.refs:
        result='\n'.join(f'{s} {v:#x}' for s,v in im.references(a.address))
    else:result=im.disassembly(a.address,a.size)
    if a.out:
        a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(result+'\n')
    else:print(result)


if __name__=='__main__':main()
