#!/usr/bin/env python3
"""Recovered Allergic Cliffs generator for Logical Journey's 2001 executable.

Source SHA-256: 82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3
Generator: 0x407180..0x407916. Validator: 0x407950..0x4079d9.
The API takes the initialized RNG state at generator entry, not a wall-clock seed.
Tuple positions are native attribute IDs 1,2,3,4; values are 1..5.
See notes/logical-bridge-parity.md for scope and native parity evidence.
"""
from __future__ import annotations
import argparse
from dataclasses import asdict,dataclass
from functools import lru_cache
import itertools
import json
from pathlib import Path
from native_analysis import logical_journey_random

SOURCE_SHA256='82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3'
LEVEL_NAMES=('Not So Easy','Oh So Hard','Very Hard','Very, Very Hard')


@lru_cache(None)
def logical_bridge_candidates(level: int) -> tuple[int,...]:
    """Return candidate bit patterns in exact native enumeration order."""
    if level==0:
        return tuple(value << shift for shift in (0,8,16,24) for value in range(1,6))
    if level==1:
        pairs=[(a<<4)|b for a in range(1,6) for b in range(a+1,6)]
        return tuple(pair << shift for shift in (0,8,16,24) for pair in pairs)
    if level==2:
        return tuple((a<<(8*lo))+(b<<(8*hi))
                     for lo,hi in itertools.combinations(range(4),2)
                     for b in range(1,6) for a in range(1,6))
    if level==3:
        return tuple((a<<(8*lo))+(b<<(8*middle))+(c<<(8*hi))
                     for lo,middle,hi in itertools.combinations(range(4),3)
                     for c in range(1,6) for b in range(1,6) for a in range(1,6))
    raise ValueError('Native difficulty must be 0, 1, 2, or 3')


def logical_bridge_features(candidate: int, level: int) -> tuple[tuple[int,int],...]:
    terms=[]
    for byte_index in range(4):
        value=(candidate>>(byte_index*8))&255
        if value:
            terms.append((4-byte_index,value&15))
            if level==1:
                terms.append((4-byte_index,(value>>4)&15))
    return tuple(terms)


def logical_bridge_matches(traits,terms):
    return any(traits[attribute-1]==value for attribute,value in terms)


def logical_bridge_validate(traits,terms,orientation,bridge):
    """Exact valid/invalid result of 0x407950 for generated rule structures.

    Native bridge 1 is lower, 2 upper. Other signed-16-bit bridge values are
    normalized to 1. Orientation 0 means lower accepts matching traits; 1 upper.
    """
    bridge=((int(bridge)+32768)&65535)-32768
    if bridge not in (1,2):bridge=1
    matched=logical_bridge_matches(traits,terms)
    value=bool(orientation) if matched else not bool(orientation)
    if bridge==2:value=not value
    return int(not value)


@dataclass
class LogicalBridgeResult:
    difficulty:int
    difficulty_name:str
    party:list
    rng_entry:int
    rng_exit:int
    candidate_count:int
    target_matches:int
    tied_candidate_count:int
    chosen_rank:int
    chosen_candidate_index:int
    packed_rule:int
    terms:list
    orientation:int
    matching_bridge:int
    native_rule_hex:str
    unique_level1_rule:int
    unique_level1_match_count:int
    native_random_calls:list


def logical_bridge_generate(party, difficulty, state):
    """Reconstruct native candidate construction, balancing and rank sampling.

    No rejection sampling occurs. Counts are examined in the order floor(n/2),
    floor(n/2)+1, floor(n/2)-1, floor(n/2), floor(n/2)-2, ...; the
    native step alternates +1,-2. Only 1..15 are eligible,
    independently of party size. Tied candidates retain native enumeration order.
    """
    party=[tuple(z) for z in party]
    if not 1<=len(party)<=16 or any(len(z)!=4 or any(v not in range(1,6) for v in z) for z in party):
        raise ValueError('Expected 1..16 Zoombinis, each four native values in 1..5')
    candidates=logical_bridge_candidates(difficulty)
    terms=[logical_bridge_features(c,difficulty) for c in candidates]
    counts=[sum(logical_bridge_matches(z,t) for z in party) for t in terms]
    # The executable would keep searching indefinitely if no count1..15 exists.
    # Raise explicitly for synthetic unsupported parties instead of hanging.
    if not any(1<=count<=min(15,len(party)//2+1) for count in counts):
        raise ValueError('Native balancing loop has no eligible candidate for this party')
    target=len(party)//2
    delta=1
    while not (1<=target<16 and target in counts):
        target+=delta
        delta=-1-delta
    tied=[i for i,count in enumerate(counts) if count==target]
    entry=state&0xffffffff
    state,rank0=logical_journey_random(entry,len(tied)-1)
    calls=[{'minimum':1,'maximum':len(tied),'result':rank0+1,'state_before':entry,'state_after':state}]
    chosen=tied[rank0]
    before=state
    state,orientation=logical_journey_random(state,1)
    calls.append({'minimum':0,'maximum':1,'result':orientation,'state_before':before,'state_after':state})
    import struct
    rule=bytearray(30)
    struct.pack_into('<HHB',rule,0,1,orientation,len(terms[chosen]))
    for i,(attribute,value) in enumerate(terms[chosen]):
        rule[5+i]=attribute;rule[10+i]=value
    unique=difficulty==0 and len(tied)==1
    return LogicalBridgeResult(difficulty,LEVEL_NAMES[difficulty],[list(z) for z in party],entry,state,len(candidates),target,len(tied),rank0+1,chosen,candidates[chosen],[list(t) for t in terms[chosen]],orientation,1+orientation,rule.hex(),candidates[chosen] if unique else 0,target if unique else 0,calls)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--party',type=Path,required=True,help='JSON array of four-value native attribute tuples')
    parser.add_argument('--difficulty',type=int,choices=range(4),required=True,help='zero-based native difficulty')
    parser.add_argument('--state',type=lambda v:int(v,0),required=True,help='initialized RNG state at generator entry')
    args=parser.parse_args()
    print(json.dumps(asdict(logical_bridge_generate(json.loads(args.party.read_text()),args.difficulty,args.state)),indent=2))

if __name__=='__main__':main()
