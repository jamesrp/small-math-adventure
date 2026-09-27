#!/usr/bin/env python3
"""Static x86 evidence for the puzzle generators. Does not execute game binaries."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BINARIES = {
    "logical-journey": "INSTALL/HD/Zoombinis Logical Journey.exe",
    "mountain-rescue": "INSTALL/HD/zoombini2.exe",
    "island-odyssey": "HD/Win/Zoombinis Island Odyssey.exe",
}
KNOWN_SHA256 = {
    "logical-journey": "82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3",
    "mountain-rescue": "1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa",
    "island-odyssey": "619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2",
}


def lcg_step(state):
    """The 32-bit update recovered in the two inspected executables."""
    return (214013 * state + 2531011) & 0xFFFFFFFF


def logical_journey_random(state, maximum):
    """After initialization: inclusive uint16 bound, no update for a zero bound.

    This models only the isolated random helper, not any puzzle generator, nor
    its lazy time-based seed initialization or sequence of callers.
    """
    maximum &= 0xFFFF
    if maximum == 0:
        return state, 0
    state = lcg_step(state)
    return state, (state >> 16) % (maximum + 1)


def mountain_rescue_random(state):
    state = lcg_step(state)
    return state, (state >> 16) & 0x7FFF


def pe_sections(data):
    pe = struct.unpack_from("<I", data, 60)[0]
    if data[:2] != b"MZ" or data[pe:pe + 4] != b"PE\0\0":
        raise ValueError("Not a PE image")
    count, optional_size = struct.unpack_from("<H", data, pe + 6)[0], struct.unpack_from("<H", data, pe + 20)[0]
    if struct.unpack_from("<H", data, pe + 24)[0] != 0x10B:
        raise ValueError("Expected PE32")
    base = struct.unpack_from("<I", data, pe + 52)[0]
    sections = []
    for n in range(count):
        offset = pe + 24 + optional_size + n * 40
        virtual_size, rva, size, file_offset = struct.unpack_from("<IIII", data, offset + 8)
        sections.append({"name": data[offset:offset + 8].rstrip(b"\0").decode("ascii"),
                         "rva": rva, "virtual_address": base + rva, "virtual_size": virtual_size,
                         "file_offset": file_offset, "file_size": size})
    return base, sections


def run(local, objdump):
    for slug, relative in BINARIES.items():
        source = local / "discs" / slug / relative
        output = local / "native-analysis" / slug
        output.mkdir(parents=True, exist_ok=True)
        data = source.read_bytes()
        if hashlib.sha256(data).hexdigest() != KNOWN_SHA256[slug]:
            raise ValueError(f"{slug}: unrecognized executable version; fixed addresses need re-analysis")
        base, sections = pe_sections(data)
        asm = subprocess.check_output([objdump, "-d", str(source)], text=True)
        headers = subprocess.check_output([objdump, "-p", str(source)], text=True)
        (output / "disassembly.txt").write_text(asm)
        (output / "pe-headers-imports.txt").write_text(headers)
        strings = []
        for match in re.finditer(rb"[ -~]{6,}", data):
            offset = match.start()
            section = next((s for s in sections if s["file_offset"] <= offset < s["file_offset"] + s["file_size"]), None)
            strings.append({"file_offset": offset, "virtual_address": (
                section["virtual_address"] + offset - section["file_offset"] if section else None),
                "text": match.group().decode("ascii")})
        (output / "strings.json").write_text(json.dumps(strings, indent=2))
        targets = {"logical-journey": {0x40F9A0: "bounded_random", 0x40FA10: "lazy_seed"},
                   "mountain-rescue": {0x46C7C0: "random", 0x46C7B3: "seed"},
                   "island-odyssey": {}}[slug]
        calls = []
        lines = asm.splitlines()
        for index, line in enumerate(lines):
            match = re.search(r"^\s*([0-9a-f]+):.*\bcalll?\s+0x([0-9a-f]+)", line)
            if match and int(match[2], 16) in targets:
                calls.append({"call_address": int(match[1], 16), "target": int(match[2], 16),
                              "target_label": targets[int(match[2], 16)],
                              "context": lines[max(0, index - 7):index + 9]})
        evidence = {"game": slug, "source": relative, "source_sha256": hashlib.sha256(data).hexdigest(),
                    "image_base": base, "sections": sections,
                    "status": "static-analysis-only; puzzle-specific call semantics not yet recovered",
                    "random_helpers": [{"address": address, "label": label} for address, label in targets.items()],
                    "random_calls": calls,
                    "limitations": ["Direct call sites are candidates, not a mapping to named puzzles.",
                                    "Indirect calls, inlined random code and runtime validation are not covered.",
                                    "No per-puzzle generator is claimed as reproduced by this stage."]}
        if slug == "logical-journey":
            evidence["recovered_helper"] = {"state_address": 0x4959D0,
                "lazy_initialization_flag": 0x48BC28,
                "state_update": "state = (214013 * state + 2531011) modulo 2^32",
                "output": "(state >> 16) modulo (uint16(maximum) + 1)",
                "zero_bound": "returns zero without advancing state (lazy initialization can still occur)",
                "evidence_address_range": [0x40F9A0, 0x40FA10]}
        elif slug == "mountain-rescue":
            evidence["recovered_helper"] = {"state_storage": "thread data at offset 0x14",
                "state_update": "state = (214013 * state + 2531011) modulo 2^32",
                "output": "(state >> 16) & 0x7fff", "evidence_address_range": [0x46C7C0, 0x46C7E2]}
        else:
            evidence["import_evidence"] = "PE import table includes MSVCRT.dll rand and srand; implementation not recovered here."
        (output / "analysis.json").write_text(json.dumps(evidence, indent=2) + "\n")
        print(f"{slug}: {len(strings)} strings; {len(calls)} direct calls to identified random/seed helpers")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local", type=Path, default=ROOT / "local")
    parser.add_argument("--objdump", default=shutil.which("objdump"))
    args = parser.parse_args()
    if not args.objdump:
        parser.error("LLVM objdump is required")
    run(args.local, args.objdump)
