#!/usr/bin/env python3
"""Pizza Pass preference generator recovered from supplied Logical Journey PE32.

Native 0x434030 calls union sampler 0x435340 and group sampler 0x434420.
UI levels are 1..4 here, native levels 0..3. Source: SHA-256 recorded below.
The seed argument is initialized RNG state at generator entry, not a game seed.
The native oracle runs original arithmetic and preferences; only the final pit
renderer is replaced by an argument recorder, since UI is outside this scope.
"""
import argparse
from collections import Counter
import hashlib
import itertools
import json
from math import comb, log2
from pathlib import Path
import struct
from native_analysis import ROOT, BINARIES, KNOWN_SHA256, logical_journey_random, pe_sections

PARAMETERS = {
    1: {"slots": 5, "minimum_active": 2, "threshold": 500, "trolls": 1, "excluded_slot": None},
    2: {"slots": 7, "minimum_active": 3, "threshold": 800, "trolls": 2, "excluded_slot": 4},
    3: {"slots": 7, "minimum_active": 3, "threshold": 1000, "trolls": 3, "excluded_slot": None},
    4: {"slots": 8, "minimum_active": 4, "threshold": 1000, "trolls": 3, "excluded_slot": None},
}


class PizzaRandom:
    def __init__(self, seed):
        self.state = seed & 0xFFFFFFFF
        self.trace = []

    def draw(self, maximum):
        self.state, value = logical_journey_random(self.state, maximum)
        self.trace.append([maximum, value])
        if len(self.trace) > 100000:
            raise RuntimeError("Research model iteration guard exceeded")
        return value


def generate(level, seed):
    p = PARAMETERS[level]
    n = p["slots"]
    rng = PizzaRandom(seed)
    active, remaining = [0] * n, p["minimum_active"]
    passes = 0
    # Every pass visits every slot and consumes a draw, even already-selected
    # and excluded slots. The stop test is after a complete pass.
    while True:
        passes += 1
        for i in range(n):
            if rng.draw(1000) < p["threshold"] and not active[i] and i != p["excluded_slot"]:
                active[i] = 1
                remaining -= 1
        if remaining <= 0:
            break
    groups = [[0] * n for _ in range(3)]
    if level == 1:
        groups[0] = active.copy()
    else:
        for i, chosen in enumerate(active):
            if chosen:
                groups[rng.draw(p["trolls"] - 1)][i] = 1
    repair_moves = []
    if level >= 3:
        # Empty groups are repaired by moving a randomly probed member of the
        # larger other group; a tie chooses the latter of the two listed donors.
        while any(not any(g) for g in groups):
            for recipient in range(3):
                if any(groups[recipient]):
                    continue
                others = [i for i in range(3) if i != recipient]
                a, b = others
                donor = a if sum(groups[a]) > sum(groups[b]) else b
                while True:
                    i = rng.draw(n - 1)
                    if groups[donor][i]:
                        break
                groups[donor][i], groups[recipient][i] = 0, 1
                repair_moves.append({"slot": i, "from": donor, "to": recipient})
    pit_tuple, pit_pairs = [], []
    if level == 4:
        # Ties choose the lowest-numbered largest group.
        largest = max(range(3), key=lambda i: sum(groups[i]))
        def sample(group):
            while True:
                index = rng.draw(n - 1)
                if groups[group][index]:
                    return index
        first = sample(largest)
        second = sample(largest)
        while second == first:
            second = sample(largest)
        others = [i for i in range(3) if i != largest]
        other_a, other_b = sample(others[0]), sample(others[1])
        pit_tuple = [first, other_a, second, other_b]
        pit_pairs = [[pit_tuple[i], pit_tuple[(i+1) % 4]] for i in range(4)]
    return {"level": level, "seed": seed & 0xFFFFFFFF, "parameters": p,
            "active": active, "preferences": groups[:p["trolls"]],
            "sampler_passes": passes, "repair_moves": repair_moves,
            "pit_tuple": pit_tuple, "pit_pairs": pit_pairs,
            "rng_state_after": rng.state, "rng_draws": len(rng.trace), "rng_trace": rng.trace}


def feedback(preference, proposal):
    """Exact numeric return of 0x4344a0, excluding later audio/UI routing."""
    unwanted = sum(bool(x) and not bool(want) for x, want in zip(proposal, preference))
    liked = sum(bool(x) and bool(want) for x, want in zip(proposal, preference))
    if unwanted == 1:
        return 0
    if unwanted > 1:
        return 4
    return 2 if liked == sum(bool(x) for x in preference) else 1


class PizzaOracle:
    def __init__(self):
        from native_oracle import NativeOracle
        from unicorn import UC_HOOK_CODE
        from unicorn.x86_const import UC_X86_REG_EAX
        self.machine = NativeOracle("logical-journey")
        self.pit = []
        self.trace = []
        self.machine.hook(0x437A00, self.record_pit)
        self.machine.write_u16(0x48BC28, 0)
        def before(uc, address, size, unused):
            self.trace.append([self.machine.arg(0) & 0xFFFF, None])
        def after(uc, address, size, unused):
            self.trace[-1][1] = self.machine.reg(UC_X86_REG_EAX) & 0xFFFF
        self.machine.uc.hook_add(UC_HOOK_CODE,before,begin=0x40F9A0,end=0x40F9A0)
        for address in [0x40FA0D,0x40F9C7]:
            self.machine.uc.hook_add(UC_HOOK_CODE,after,begin=address,end=address)

    def record_pit(self, m):
        self.pit = [m.arg(i) & 0xFFFF for i in range(4)]
        return 0

    def generate(self, level, seed):
        m, p = self.machine, PARAMETERS[level]
        self.pit = []
        self.trace = []
        for address, value in [(0x49BC36, level-1), (0x49BC56,p["slots"]),
                               (0x49BA0A,p["minimum_active"]), (0x49BB6C,p["threshold"])]:
            m.write_u16(address, value)
        m.write_u32(0x4959D0, seed)
        m.call(0x434030)
        def vector(address):
            return list(struct.unpack("<" + "H" * p["slots"], m.read(address, 2*p["slots"])))
        return {"active": vector(0x49BBC8),
                "preferences": [vector(a) for a in [0x49BA34,0x49BB44,0x49BC38]][:p["trolls"]],
                "pit_tuple": self.pit, "rng_state_after": m.u32(0x4959D0), "rng_trace": self.trace}

    def feedback(self, group, proposal):
        m = self.machine
        m.write(0x49BC24, struct.pack("<" + "H" * len(proposal), *proposal))
        return m.call(0x4344A0, [group]) & 0xFFFF


def validate(seeds):
    oracle = PizzaOracle()
    from native_oracle import NativeOracle
    from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_ESI, UC_X86_REG_EDI
    params = NativeOracle("logical-journey")
    params.hook(0x455DB0, lambda m: 0, pop=32)
    for level, address in enumerate([0x431C9E,0x431D90,0x431EA9,0x431FD1], 1):
        params.call(address, stop_at=0x432138, registers={UC_X86_REG_EBP:1,UC_X86_REG_ESI:7,UC_X86_REG_EDI:3})
        for name, pointer in [("slots",0x49BC56),("minimum_active",0x49BA0A),("threshold",0x49BB6C)]:
            assert params.u16(pointer) == PARAMETERS[level][name], (level,name)
    generation_cases = feedback_cases = 0
    examples = []
    for level in PARAMETERS:
        for seed in seeds:
            python = generate(level, seed)
            native = oracle.generate(level, seed)
            for key in native:
                assert native[key] == python[key], (level, seed, key, native[key], python[key])
            generation_cases += 1
            if seed in [0, 1, 0xFFFFFFFF]:
                examples.append({k:v for k,v in python.items() if k != "rng_trace"})
            if seed in [0,1,7,31,0xFFFFFFFF]:
                for group, preference in enumerate(python["preferences"]):
                    for proposal in itertools.product([0,1], repeat=len(preference)):
                        expected = feedback(preference, proposal)
                        actual = oracle.feedback(group, proposal)
                        assert actual == expected, (level, seed, group, proposal, actual, expected)
                        feedback_cases += 1
    return {"status":"passed", "source_sha256": KNOWN_SHA256["logical-journey"],
            "generation_cases": generation_cases, "feedback_cases": feedback_cases, "native_parameter_branches":4,
            "seed_count_per_level":len(seeds), "examples":examples,
            "scope": "Native 0x434030 including original 0x435340, 0x434420, RNG and memset; exact preferences, active mask, pit constructor arguments, complete RNG trace and exit state. Native 0x4344a0 numeric feedback. Four native parameter initialization branches.",
            "stubs": ["0x437a00 records four pit-constructor arguments; graphics/pit rendering omitted.","Parameter-branch tests replace graphics factory 0x455db0 with a zero-returning stdcall stub and supply documented entry register values."],
            "limitations": ["Entry RNG state is supplied; session-level seed and pre-entry random calls are not modeled.",
                            "Preference feedback is numeric helper output; later troll selection, food-specific speech and UI feedback are not fully mapped."]}


def analyze(count):
    reports = []
    for level, p in PARAMETERS.items():
        totals = Counter()
        sizes, unused, passes, groups, repairs = Counter(), Counter(), Counter(), Counter(), Counter()
        unique = set()
        for seed in range(count):
            row = generate(level, seed)
            sizes[sum(row["active"])] += 1
            unused[p["slots"]-sum(row["active"])] += 1
            passes[row["sampler_passes"]] += 1
            groups[tuple(sum(g) for g in row["preferences"])] += 1
            repairs[len(row["repair_moves"])] += 1
            totals["empty_preference_sets"] += sum(not any(g) for g in row["preferences"])
            totals["rng_draws"] += row["rng_draws"]
            unique.add(tuple(tuple(g) for g in row["preferences"]))
        n = p["slots"] - (p["excluded_slot"] is not None)
        if level == 1:
            structural_space = sum(comb(n,k) for k in range(2,n+1))
        elif level == 2:
            structural_space = sum(comb(n,k)*2**k for k in range(3,n+1))
        else:
            structural_space = sum(comb(n,k)*(3**k-3*2**k+3) for k in range(p["minimum_active"],n+1))
        reports.append({"level":level,"parameters":p,"seeds":count,
            "active_slot_histogram":dict(sorted(sizes.items())),"unused_slot_histogram":dict(sorted(unused.items())),
            "full_sampler_passes_histogram":dict(sorted(passes.items())),
            "preference_size_tuples":{str(k):v for k,v in sorted(groups.items())},
            "repair_transfer_histogram":dict(sorted(repairs.items())),
            "empty_preference_sets":totals["empty_preference_sets"],
            "mean_rng_draws":totals["rng_draws"]/count, "distinct_preferences_in_sample":len(unique),
            "structural_hypothesis_space":structural_space,"log2_structural_hypotheses":log2(structural_space),
            "hypothesis_space_note":"Combinatorial upper space consistent with decoded structural rules; not a claim of uniform generation or all states reachable by 32-bit seeds; level4 before supplied pit evidence.",
            "measurement_note":"Deterministic consecutive integer entry states, not a claim about actual play-session seed distribution."})
    return {"source_sha256":KNOWN_SHA256["logical-journey"],"levels":reports}


def write_provenance(output):
    """Retain original slices and freshly aligned listings in ignored local/."""
    from capstone import Cs, CS_ARCH_X86, CS_MODE_32
    source = ROOT / "local/discs/logical-journey" / BINARIES["logical-journey"]
    data = source.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != KNOWN_SHA256["logical-journey"]:
        raise ValueError("Unrecognized Logical Journey executable")
    _, sections = pe_sections(data)
    ranges = [
        ("parameter-branches", 0x431C9E, 0x432138, True),
        ("generator", 0x434030, 0x43440F, True),
        ("generator-jump-table", 0x434410, 0x434420, False),
        ("group-sampler", 0x434420, 0x434497, True),
        ("feedback", 0x4344A0, 0x434601, True),
        ("union-sampler", 0x435340, 0x4353F6, True),
        ("pit-constructor", 0x437A00, 0x437D28, True),
    ]
    entries, decoder = [], Cs(CS_ARCH_X86, CS_MODE_32)
    for name, start, end, code in ranges:
        section = next(s for s in sections if s["virtual_address"] <= start
                       and end <= s["virtual_address"] + s["file_size"])
        offset = section["file_offset"] + start - section["virtual_address"]
        raw = data[offset:offset + end-start]
        (output / f"{name}-native.bin").write_bytes(raw)
        if code:
            (output / f"{name}-disassembly.txt").write_text("\n".join(
                f"{i.address:08x}  {i.bytes.hex():<24} {i.mnemonic} {i.op_str}"
                for i in decoder.disasm(raw, start)) + "\n")
        entries.append({"name":name, "start_va":start, "end_va_exclusive":end,
                        "file_offset":offset, "size":len(raw),
                        "sha256":hashlib.sha256(raw).hexdigest(), "code":code})
    (output / "native-provenance.json").write_text(json.dumps({
        "source_relative_to_local":str(source.relative_to(ROOT / "local")),
        "source_sha256":digest, "ranges":entries,
        "note":"Native bytes and listings remain local. Constructor listing is static evidence; generator tests record its arguments without rendering."},indent=2)+"\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--native", action="store_true")
    parser.add_argument("--seeds", type=int, default=128)
    parser.add_argument("--analysis-seeds", type=int, default=10000)
    parser.add_argument("--provenance", action="store_true", help="Save versioned native slices/listings (requires capstone)")
    args = parser.parse_args()
    if args.seeds < 1 or args.analysis_seeds < 1:
        parser.error("Seed counts must be positive")
    output = ROOT / "local/analysis/logical-journey-pizza"
    output.mkdir(parents=True, exist_ok=True)
    if args.native or args.provenance:
        write_provenance(output)
    if args.native:
        result = validate(list(range(args.seeds)) + [0x7FFFFFFF,0xFFFFFFFF])
        (output/"native-validation.json").write_text(json.dumps(result,indent=2)+"\n")
        print({k:v for k,v in result.items() if k != "examples"}, flush=True)
    result = analyze(args.analysis_seeds)
    (output/"difficulty-analysis.json").write_text(json.dumps(result,indent=2)+"\n")
    print([(x["level"],x["structural_hypothesis_space"],x["active_slot_histogram"],x["empty_preference_sets"]) for x in result["levels"]])


if __name__ == "__main__":
    main()
