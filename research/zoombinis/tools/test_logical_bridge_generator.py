#!/usr/bin/env python3
"""Differential tests against isolated native bridge generator/validator code.

Run via research/zoombinis/.venv/bin/python. On macOS the Unicorn JIT requires
execution outside the restrictive filesystem sandbox. No Windows process starts.
"""
from collections import Counter
from dataclasses import asdict
import itertools,json,random,struct
from pathlib import Path
from logical_bridge_generator import (logical_bridge_candidates,logical_bridge_features,
    logical_bridge_matches,logical_bridge_generate,logical_bridge_validate,SOURCE_SHA256)

ROOT=Path(__file__).resolve().parents[1]


def logical_bridge_test_parties():
    rnd=random.Random(0xB12D63)
    universe=list(itertools.product(range(1,6),repeat=4))
    parties=[]
    for size in range(1,17):
        for variant in range(4):
            if variant==0:party=rnd.sample(universe,size)
            elif variant==1:party=rnd.sample([z for z in universe if z[0]==3],size)
            elif variant==2:
                selected=rnd.sample(universe,(size+1)//2)
                party=[z for z in selected for _ in range(2)][:size]
            else:
                # Correlation, with a dominant value in the first attribute.
                dominant=rnd.sample([z for z in universe if z[0]==1],max(1,size*3//4))
                party=dominant+rnd.sample([z for z in universe if z[0]!=1],size-len(dominant))
            assert max(Counter(party).values())<=2
            parties.append({'name':f'n{size}-variant{variant}','party':party})
    asymmetric=[(1 if i<11 else 2+(i-11)%4,1+i%5,1+(i+i//5)%5,1+(2*i+i//5)%5) for i in range(16)]
    assert max(Counter(asymmetric).values())<=2
    parties.append({'name':'asymmetric-balance-counterexample','party':asymmetric})
    return parties


def main():
    from logical_bridge_oracle import LogicalBridgeOracle

    oracle=LogicalBridgeOracle()
    checks=Counter(); witnesses=[]; unique_tie_cases=0
    seeds=[0,1,2,0x12345678,0x7fffffff,0xffffffff]
    last_by_level={}
    for example in logical_bridge_test_parties():
        party=example['party']
        for level in range(4):
            for seed in seeds:
                model=asdict(logical_bridge_generate(party,level,seed))
                native=oracle.generate(party,level,seed)
                for key in ('native_rule_hex','rng_exit','unique_level1_rule','unique_level1_match_count'):
                    assert model[key]==native[key],(example['name'],level,seed,key,model[key],native[key])
                assert native['candidates']==list(logical_bridge_candidates(level))
                expected_counts=[sum(logical_bridge_matches(z,logical_bridge_features(c,level)) for z in party) for c in native['candidates']]
                assert native['matching_counts']==expected_counts
                checks['generator_cases']+=1
                checks['candidate_words_compared']+=len(native['candidates'])
                checks['candidate_match_counts_compared']+=len(expected_counts)
                unique_tie_cases+=int(model['tied_candidate_count']==1)
                last_by_level[level]=model
                if seed==0 and (len(party) in (1,16)):
                    witnesses.append({'case_name':example['name'],'model':model,'native':native})
                for bridge in (1,2):
                    for z in party:
                        actual=oracle.validate(z,model['native_rule_hex'],bridge)
                        expected=logical_bridge_validate(z,model['terms'],model['orientation'],bridge)
                        assert actual==expected
                        checks['generated_party_validator_cases']+=1
    # Exhaust every possible Zoombini against representative rules at each level,
    # both orientations, both bridges, plus out-of-range index normalization.
    for level,model in last_by_level.items():
        for orientation in (0,1):
            rule=bytearray.fromhex(model['native_rule_hex']);struct.pack_into('<H',rule,2,orientation)
            for z in itertools.product(range(1,6),repeat=4):
                for bridge in (1,2,0,-1,3,65538):
                    actual=oracle.validate(z,rule.hex(),bridge)
                    expected=logical_bridge_validate(z,model['terms'],orientation,bridge)
                    assert actual==expected,(level,orientation,z,bridge)
                    checks['exhaustive_representative_validator_cases']+=1
    # Each rule family: test every candidate's decoded predicate on the full trait
    # universe in the Python model (no claim that this replaces native coverage).
    for level in range(4):
        for candidate in logical_bridge_candidates(level):
            terms=logical_bridge_features(candidate,level)
            for z in itertools.product(range(1,6),repeat=4):
                assert logical_bridge_validate(z,terms,0,1)+logical_bridge_validate(z,terms,0,2)==1
                checks['all_candidates_complement_invariants']+=1
    # Illegal 16-identical party: the native loop cannot find an eligible count.
    pathological=[(1,1,1,1)]*16
    try:logical_bridge_generate(pathological,0,0)
    except ValueError:checks['nonterminating_input_model_guard']+=1
    else:raise AssertionError('guard missing')
    try:oracle.generate(pathological,0,0,max_instructions=100000)
    except RuntimeError as e:
        assert 'budget exhausted' in str(e)
        checks['nonterminating_input_native_budget_limit']+=1
    else:raise AssertionError('expected native budget exhaustion')
    asymmetric=logical_bridge_generate(logical_bridge_test_parties()[-1]['party'],0,0)
    counts=[sum(logical_bridge_matches(z,logical_bridge_features(c,0)) for z in asymmetric.party) for c in logical_bridge_candidates(0)]
    assert asymmetric.target_matches==4 and 11 in counts
    report={'status':'passed','source_sha256':SOURCE_SHA256,'generator_address':'0x407180','validator_address':'0x407950','checks':dict(checks),'party_count':65,'difficulty_count':4,'seed_count':len(seeds),'unique_tie_cases':unique_tie_cases,
      'boundary':{'native_code':'Complete generator0x407180 and validator0x407950, including unmodified RNG0x401070/0x40f9a0.','stubs':['0x476e50 allocation: isolated heap','0x476de0 free: no-op','0x44a920 party getter: supplied count/padding/four-byte trait records'],'initial_conditions':['Lazy seed flag0x48bc28 disabled','RNG state0x4959d0 supplied','Rule memory cleared as in bridge initialization'],'not_covered':['Actual arrival from prior gameplay','Wall-clock seeding','Full UI interactions and remaining-life behavior']},
      'asymmetric_balance_example':{'party':asymmetric.party,'candidate_match_counts':counts,'chosen_match_count':4,'closer_unselected_match_count':11},'failures':[]}
    output=ROOT/'local/analysis/logical-journey-bridge';output.mkdir(parents=True,exist_ok=True)
    (output/'parity-results.json').write_text(json.dumps(report,indent=2)+'\n')
    (output/'parity-witnesses.jsonl').write_text(''.join(json.dumps(w)+'\n' for w in witnesses))
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
