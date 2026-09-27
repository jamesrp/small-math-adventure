#!/usr/bin/env python3
"""Differential Greenhouse checks against isolated original x86 functions.

Needs research .venv with Unicorn. No executable process or UI is launched.
Native generator arithmetic, transforms, random call order, and swaps execute;
only external XML/libc operations are supplied as explicit memory-only hooks.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import struct
import xml.etree.ElementTree as ET
from island_generator import generate, load_templates, MsvcrtRandom, transform, TEMPLATES, OUT
from native_oracle import NativeOracle
from unicorn.x86_const import UC_X86_REG_ECX


class GreenhouseOracle:
    def __init__(self):
        self.machine = m = NativeOracle('island-odyssey')
        self.object = m.alloc(0x1500)
        self.tree = m.alloc(24)
        self.nodes = {}
        self.node_addresses = {}
        self.strings = {}
        self.root = ET.fromstring(TEMPLATES.read_bytes())
        for node in self.root.iter():
            address = m.alloc(16)
            self.nodes[address] = node
            self.node_addresses[id(node)] = address
        m.write_u32(self.tree, self.node_addresses[id(self.root)])
        m.write_u32(self.object+0x1300,self.tree)
        self.current=self.root
        self.rng=MsvcrtRandom(1,True)
        m.hook_import('rand',lambda machine:self.rng.rand('native_external_rand'))
        m.hook_import('atoi',lambda machine:int(self.cstr(machine.arg(0))))
        m.hook_import('sprintf',self.sprintf)
        m.hook_import('sscanf',self.sscanf)
        m.hook_import('?selectNode@OMXMLTree@@QAEPAVOMXMLNode@@PBV2@@Z',self.select_pointer,pop=4)
        m.hook_import('?selectNode@OMXMLTree@@QAEPAVOMXMLNode@@PBD@Z',self.select_name,pop=4)
        m.hook_import('?getChild@OMXMLNode@@QBEPAV1@PBD@Z',self.get_child,pop=4)
        m.hook_import('?getAttrValue@OMXMLNode@@QBEPBDPBD@Z',self.get_attribute,pop=4)
        self.buffer=m.alloc(144*4)

    def cstr(self,address):
        if not address:
            return ''
        result=bytearray()
        for i in range(8192):
            value=self.machine.read(address+i,1)
            if value==b'\0':
                return result.decode('ascii')
            result.extend(value)
        raise ValueError('Unterminated string')

    def string(self,text):
        if text not in self.strings:
            data=text.encode('ascii')+b'\0'
            self.strings[text]=self.machine.alloc(len(data),data)
        return self.strings[text]

    def sprintf(self,m):
        fmt=self.cstr(m.arg(1))
        values=tuple(m.arg(i+2) for i in range(fmt.count('%d')))
        rendered=fmt%values
        m.write(m.arg(0),rendered.encode('ascii')+b'\0')
        return len(rendered)

    def sscanf(self,m):
        values=[int(x) for x in self.cstr(m.arg(0)).split()]
        count=self.cstr(m.arg(1)).count('%d')
        assert len(values)==count
        for i,value in enumerate(values):
            m.write_u32(m.arg(i+2),value)
        return count

    def select_pointer(self,m):
        self.current=self.nodes[m.arg(0)]
        return m.arg(0)

    def select_name(self,m):
        name=self.cstr(m.arg(0))
        node=self.current.find(name)
        if node is None:
            raise ValueError(f'Missing XML child {self.current.tag}/{name}')
        self.current=node
        return self.node_addresses[id(node)]

    def get_child(self,m):
        node=self.nodes[m.reg(UC_X86_REG_ECX)]
        child=node.find(self.cstr(m.arg(0)))
        return self.node_addresses[id(child)] if child is not None else 0

    def get_attribute(self,m):
        node=self.nodes[m.reg(UC_X86_REG_ECX)]
        value=node.attrib.get(self.cstr(m.arg(0)))
        return self.string(value) if value is not None else 0

    def run(self,seed,level,with_lists=True):
        m=self.machine
        self.rng=MsvcrtRandom(seed,True)
        m.write(self.object,b'\0'*0x1500)
        m.write_u32(self.object+0x1300,self.tree)
        m.write_u32(self.object+0x1340,level)
        counts=(3,6,6) if level==3 else (3,4,5)
        m.call(0x405110,counts[1:],ecx=self.object,stop_at=0x4052b7)
        grid=list(struct.unpack('<144I',m.read(self.object+0xc28,144*4)))
        result=dict(grid=grid,rng_after_core=dict(calls=self.rng.calls,state=self.rng.state))
        if with_lists:
            lists=[]
            for count,start in [*[(n,1) for n in counts],(12,0)]:
                m.call(0x4052d0,(count,self.buffer,start),ecx=self.object)
                lists.append(list(struct.unpack('<'+'I'*count,m.read(self.buffer,count*4))))
            result.update(random_lists=lists,rng_after_random_lists=dict(calls=self.rng.calls,state=self.rng.state))
        result['rng_values']=[x['value'] for x in self.rng.trace]
        return result


def validate(samples=100):
    oracle=GreenhouseOracle()
    templates=load_templates()
    cases=[]
    seeds=list(range(1,samples+1))+[0,0x7fffffff,0x80000000,0xffffffff]
    for level in (1,2,3):
        for seed in seeds:
            expected=generate(seed,level,templates,trace=True)
            actual=oracle.run(seed,level)
            checks=dict(grid=actual['grid']==expected['grid'],
                core_rng=actual['rng_after_core']==expected['rng_after_core'],
                random_lists=actual['random_lists']==list(expected['trait_permutations'].values())+[expected['moth_order_permutation']],
                final_rng=actual['rng_after_random_lists']==expected['rng_after_random_lists'],
                random_call_trace=actual['rng_values']==[x['value'] for x in expected['rng_trace']])
            if not all(checks.values()):
                mismatch=dict(seed=seed,level=level,checks=checks,expected=expected,actual=actual)
                OUT.mkdir(parents=True,exist_ok=True)
                (OUT/'greenhouse-parity-mismatch.json').write_text(json.dumps(mismatch,indent=2)+'\n')
                raise AssertionError((seed,level,checks))
            cases.append(dict(seed=seed,level=level,calls=actual['rng_after_core']['calls'],
                              grid_sha256=hashlib.sha256(struct.pack('<144I',*actual['grid'])).hexdigest()))
    grid=[list(range(r*12,r*12+12)) for r in range(12)]
    for code in (0,1,2,3,90):
        oracle.machine.write(oracle.buffer,struct.pack('<144I',*sum(grid,[])))
        oracle.machine.call(0x404c10,(code,oracle.buffer),ecx=oracle.object)
        got=list(struct.unpack('<144I',oracle.machine.read(oracle.buffer,576)))
        assert got==sum(transform(grid,code),[]),code
    result=dict(status='passed',board_cases=len(cases),transform_cases=5,
        source_exe_sha256=oracle.machine.sha256,
        template_sha256=hashlib.sha256(TEMPLATES.read_bytes()).hexdigest(),cases=cases,
        native_ranges=['0x405110-0x4052b7','0x404ea0-0x40506d','0x404c10-0x404d5f','0x4052d0-0x40532f'],
        boundaries=['Original x86 board generation, template reading call flow, transforms, fill, swap acceptance and random-list algorithms execute.',
                    'External XML accessor and libc text parsing operations are memory-only hooks.',
                    'MSVCRT rand is a compatibility hook; this executable imports its RNG, so this does not independently prove that external DLL.',
                    'Stops before path-annotation helper0x407a70; subsequent display, agent motion and UI do not execute.'])
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'greenhouse-parity-validation.json').write_text(json.dumps(result,indent=2)+'\n')
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--samples',type=int,default=100)
    args=parser.parse_args()
    result=validate(args.samples)
    print(json.dumps({k:v for k,v in result.items() if k!='cases'},indent=2))
