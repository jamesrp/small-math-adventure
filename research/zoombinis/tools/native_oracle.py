#!/usr/bin/env python3
"""Bounded, memory-only execution of identified PE32 functions using Unicorn.

No Windows loader, original process, network, filesystem, or UI is emulated.
External imports fail unless an experiment explicitly supplies a stub. Results
only establish parity within the stated function/stub/input boundary.
"""
from pathlib import Path
import hashlib
import struct

import pefile
from unicorn import Uc, UcError, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE, UC_HOOK_INTR
from unicorn.x86_const import (UC_X86_REG_EAX, UC_X86_REG_EBX, UC_X86_REG_ECX,
    UC_X86_REG_EDX, UC_X86_REG_ESI, UC_X86_REG_EDI, UC_X86_REG_EBP,
    UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EFLAGS)
from native_analysis import ROOT, BINARIES, KNOWN_SHA256


class NativeOracle:
    STACK = 0x0F000000
    STACK_SIZE = 0x100000
    HEAP = 0x20000000
    HEAP_SIZE = 0x2000000
    IMPORTS = 0x70000000
    RETURN = 0x71000000

    def __init__(self, game, source=None):
        self.game = game
        self.source = Path(source) if source else ROOT / "local/discs" / game / BINARIES[game]
        data = self.source.read_bytes()
        self.sha256 = hashlib.sha256(data).hexdigest()
        if self.sha256 != KNOWN_SHA256[game]:
            raise ValueError("Unrecognized executable; native addresses must be re-established")
        self.pe = pefile.PE(data=data)
        self.base = self.pe.OPTIONAL_HEADER.ImageBase
        self.uc = Uc(UC_ARCH_X86, UC_MODE_32)
        self.uc.mem_map(self.base, (self.pe.OPTIONAL_HEADER.SizeOfImage + 4095) & ~4095)
        self.uc.mem_write(self.base, self.pe.get_memory_mapped_image())
        self.uc.mem_map(self.STACK, self.STACK_SIZE)
        self.uc.mem_map(self.HEAP, self.HEAP_SIZE)
        self.uc.mem_map(self.IMPORTS, 0x10000)
        self.uc.mem_map(self.RETURN, 0x1000)
        self.next_alloc = self.HEAP
        self.hooks, self.imports, self.events = {}, {}, []
        for n, entry in enumerate(item for dll in getattr(self.pe, "DIRECTORY_ENTRY_IMPORT", []) for item in dll.imports):
            name = entry.name.decode("ascii") if entry.name else f"ordinal:{entry.ordinal}"
            stub = self.IMPORTS + n * 16
            self.write_u32(entry.address, stub)
            self.imports[name] = stub
            self.hook(stub, self._unsupported(name), label=name)
        self.uc.hook_add(UC_HOOK_INTR, lambda uc, number, _: (_ for _ in ()).throw(RuntimeError(f"Unsupported interrupt {number}")))

    @staticmethod
    def _unsupported(name):
        def fail(machine):
            raise RuntimeError(f"Unmodeled import: {name}")
        return fail

    def alloc(self, size, data=None):
        address = (self.next_alloc + 15) & ~15
        self.next_alloc = address + max(size, 16)
        if self.next_alloc > self.HEAP + self.HEAP_SIZE:
            raise ValueError("Oracle heap exhausted")
        if data is not None:
            if len(data) > size:
                raise ValueError("Initial data exceeds allocation")
            self.uc.mem_write(address, bytes(data))
        return address

    def read(self, address, size):
        return bytes(self.uc.mem_read(address, size))

    def write(self, address, data):
        self.uc.mem_write(address, bytes(data))

    def u16(self, address):
        return struct.unpack("<H", self.read(address, 2))[0]

    def u32(self, address):
        return struct.unpack("<I", self.read(address, 4))[0]

    def write_u16(self, address, value):
        self.write(address, struct.pack("<H", value & 0xFFFF))

    def write_u32(self, address, value):
        self.write(address, struct.pack("<I", value & 0xFFFFFFFF))

    def reg(self, register):
        return self.uc.reg_read(register)

    def arg(self, index):
        return self.u32(self.reg(UC_X86_REG_ESP) + 4 + 4 * index)

    def hook(self, address, callback, *, pop=0, label=None):
        """Replace one function; callback(self) returns EAX or None for unchanged."""
        if address in self.hooks:
            self.uc.hook_del(self.hooks[address])
        def handler(uc, addr, size, _):
            result = callback(self)
            sp = self.reg(UC_X86_REG_ESP)
            target = self.u32(sp)
            if result is not None:
                uc.reg_write(UC_X86_REG_EAX, int(result) & 0xFFFFFFFF)
            uc.reg_write(UC_X86_REG_ESP, sp + 4 + pop)
            uc.reg_write(UC_X86_REG_EIP, target)
        self.hooks[address] = self.uc.hook_add(UC_HOOK_CODE, handler, begin=address, end=address)

    def hook_import(self, name, callback, *, pop=0):
        self.hook(self.imports[name], callback, pop=pop, label=name)

    def call(self, address, args=(), *, ecx=0, edx=0, registers=None, stop_at=None, max_instructions=2_000_000, timeout_us=3_000_000):
        sp = self.STACK + self.STACK_SIZE - 0x1000
        self.write(sp, struct.pack("<" + "I" * (len(args) + 1), self.RETURN, *[x & 0xFFFFFFFF for x in args]))
        for register in (UC_X86_REG_EAX, UC_X86_REG_EBX, UC_X86_REG_ESI, UC_X86_REG_EDI, UC_X86_REG_EBP):
            self.uc.reg_write(register, 0)
        self.uc.reg_write(UC_X86_REG_ECX, ecx)
        self.uc.reg_write(UC_X86_REG_EDX, edx)
        self.uc.reg_write(UC_X86_REG_ESP, sp)
        self.uc.reg_write(UC_X86_REG_EFLAGS, 2)
        for register, value in (registers or {}).items():
            self.uc.reg_write(register, value)
        end = stop_at or self.RETURN
        try:
            self.uc.emu_start(address, end, timeout=timeout_us, count=max_instructions)
        except UcError as error:
            raise RuntimeError(f"Native execution failed at {self.reg(UC_X86_REG_EIP):#x}: {error}") from error
        if self.reg(UC_X86_REG_EIP) != end:
            raise RuntimeError(f"Native execution budget exhausted at {self.reg(UC_X86_REG_EIP):#x}")
        return self.reg(UC_X86_REG_EAX)


def validate_random_helpers():
    from native_analysis import logical_journey_random, mountain_rescue_random
    lj = NativeOracle("logical-journey")
    lj.write_u16(0x48BC28, 0)
    cases = 0
    for seed in [0, 1, 2, 11000, 0x7FFFFFFF, 0xFFFFFFFF]:
        for maximum in [0, 1, 2, 5, 15, 255, 65535]:
            lj.write_u32(0x4959D0, seed)
            result = lj.call(0x40F9A0, [maximum]) & 0xFFFF
            expected_state, expected_value = logical_journey_random(seed, maximum)
            assert (lj.u32(0x4959D0), result) == (expected_state, expected_value)
            cases += 1
    mr = NativeOracle("mountain-rescue")
    thread = mr.alloc(256)
    mr.hook(0x46EC98, lambda m: thread)
    for seed in [0, 1, 2, 11000, 0x7FFFFFFF, 0xFFFFFFFF]:
        mr.write_u32(thread + 0x14, seed)
        for _ in range(100):
            result = mr.call(0x46C7C0)
            seed, expected = mountain_rescue_random(seed)
            assert (mr.u32(thread + 0x14), result) == (seed, expected)
            cases += 1
    return {"cases": cases, "status": "passed", "boundaries": [
        "LJ random helper: native arithmetic; lazy seed initialization disabled.",
        "MR random helper: native arithmetic; thread-data accessor returns isolated allocated state."]}


if __name__ == "__main__":
    import json
    result = validate_random_helpers()
    output = ROOT / "local/analysis/native-oracle-validation.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
