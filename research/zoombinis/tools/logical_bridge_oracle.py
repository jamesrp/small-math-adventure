#!/usr/bin/env python3
"""Native boundary for the isolated Allergic Cliffs generator and validator."""
import struct
from native_oracle import NativeOracle


class LogicalBridgeOracle:
    def __init__(self):
        self.machine=NativeOracle('logical-journey')
        self.party_buffer=self.machine.alloc(4+16*4)
        self.entity_buffer=self.machine.alloc(512)
        self.allocations=[]
        self.machine.hook(0x476e50,self._allocate,pop=4)
        self.machine.hook(0x476de0,lambda m:0,pop=4)
        self.machine.hook(0x44a920,lambda m:self.party_buffer)
        self.machine.write_u16(0x48bc28,0)

    def _allocate(self,m):
        size=m.arg(0)
        address=m.alloc(size)
        self.allocations.append((address,size))
        return address

    def generate(self,party,difficulty,state,*,max_instructions=2000000):
        m=self.machine
        self.allocations.clear()
        m.write(self.party_buffer,struct.pack('<HH',len(party),0)+bytes(v for z in party for v in z))
        m.write_u16(0x49453c,difficulty)
        m.write_u32(0x4959d0,state)
        m.write(0x4945b0,bytes(30))
        m.call(0x407180,max_instructions=max_instructions)
        count=(20,40,150,500)[difficulty]
        candidates=struct.unpack('<'+str(count)+'I',m.read(self.allocations[0][0],4*count))
        matching_counts=struct.unpack('<'+str(count)+'H',m.read(self.allocations[1][0],2*count))
        return {'native_rule_hex':m.read(0x4945b0,30).hex(),'rng_exit':m.u32(0x4959d0),
                'unique_level1_rule':m.u32(0x4a21d0),'unique_level1_match_count':m.u16(0x4a21e0),
                'candidates':list(candidates),'matching_counts':list(matching_counts)}

    def validate(self,traits,native_rule_hex,bridge):
        m=self.machine
        m.write(0x4945b0,bytes.fromhex(native_rule_hex))
        m.write(self.entity_buffer+0xc0,bytes(traits))
        return m.call(0x407950,[0x4945b0,bridge,self.entity_buffer])&65535
