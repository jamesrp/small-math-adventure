#!/usr/bin/env python3
"""Finite-party structural analysis of the recovered Allergic Cliffs generator.

This measures hypothesis sets and ideal membership-query trees, not human
difficulty or the probability distribution of native generated rules. All 65
fixtures come from the differential test. No native code runs in this analysis.
"""
from __future__ import annotations

import argparse
from collections import Counter
from functools import lru_cache
import json
from pathlib import Path

from logical_bridge_generator import (
    LEVEL_NAMES, SOURCE_SHA256, logical_bridge_candidates,
    logical_bridge_features, logical_bridge_generate, logical_bridge_matches,
)
from test_logical_bridge_generator import logical_bridge_test_parties

ROOT = Path(__file__).resolve().parents[1]


class StateBudgetExceeded(Exception):
    pass


class ClassificationTree:
    """Exact minimax binary membership-query classification on a finite party.

    Each hypothesis is a bitmask telling which party members the lower bridge
    accepts. A query tests one coordinate. Free inference is allowed. The target
    is the membership vector, not the syntactic predicate behind it.
    """

    def __init__(self, hypotheses, member_count, state_budget=200000):
        self.hypotheses = tuple(sorted(set(hypotheses)))
        self.member_count = member_count
        self.initial = (1 << len(self.hypotheses)) - 1
        self.columns = [sum(1 << h for h, mask in enumerate(self.hypotheses)
                            if mask & (1 << member))
                        for member in range(member_count)]
        self.state_budget = state_budget
        self.states_visited = 0
        self.choices = {}

    def splits(self, state):
        # Coordinates with identical or reversed partitions need only one test.
        seen = set()
        result = []
        for member, column in enumerate(self.columns):
            yes = state & column
            no = state ^ yes
            if not yes or not no:
                continue
            key = min(yes, no)
            if key in seen:
                continue
            seen.add(key)
            result.append((max(yes.bit_count(), no.bit_count()), member, yes, no))
        return sorted(result)

    @lru_cache(None)
    def greedy(self, state):
        if state.bit_count() <= 1:
            return 0
        _, member, yes, no = self.splits(state)[0]
        return 1 + max(self.greedy(yes), self.greedy(no))

    @lru_cache(None)
    def exact(self, state):
        self.states_visited += 1
        if self.states_visited > self.state_budget:
            raise StateBudgetExceeded
        count = state.bit_count()
        if count <= 1:
            return 0
        splits = self.splits(state)
        best = self.greedy(state)
        self.choices[state] = (splits[0][1], 'greedy')
        lower = (count - 1).bit_length()
        if best == lower:
            return best
        for worst_size, member, yes, no in splits:
            if 1 + (worst_size - 1).bit_length() >= best:
                continue
            first, second = sorted((yes, no), key=int.bit_count, reverse=True)
            first_depth = self.exact(first)
            if 1 + first_depth >= best:
                continue
            depth = 1 + max(first_depth, self.exact(second))
            if depth < best:
                best = depth
                self.choices[state] = (member, 'exact')
                if best == lower:
                    break
        return best

    def witness(self, state=None, strategy='exact'):
        if state is None:
            state = self.initial
        if state.bit_count() == 1:
            return {'lower_acceptance_mask': self.hypotheses[state.bit_length() - 1]}
        if strategy == 'greedy':
            _, member, yes, no = self.splits(state)[0]
            child_strategy = 'greedy'
        else:
            member, child_strategy = self.choices[state]
            yes = state & self.columns[member]
            no = state ^ yes
        return {'member_index': member,
                'accepted': self.witness(yes, child_strategy),
                'rejected': self.witness(no, child_strategy)}

    def run(self):
        lower = (len(self.hypotheses) - 1).bit_length()
        upper = self.greedy(self.initial)
        try:
            depth = self.exact(self.initial)
            status = 'exact'
            tree = self.witness()
        except StateBudgetExceeded:
            depth = None
            status = 'state_budget_exceeded'
            tree = self.witness(strategy='greedy')
        attained_depth = 0
        for mask in self.hypotheses:
            node, used = tree, 0
            while 'member_index' in node:
                outcome = 'accepted' if mask & (1 << node['member_index']) else 'rejected'
                node = node[outcome]
                used += 1
            assert node['lower_acceptance_mask'] == mask
            attained_depth = max(attained_depth, used)
        assert attained_depth == (depth if depth is not None else upper)
        return {'status': status, 'optimal_worst_case_queries': depth,
                'binary_information_lower_bound': lower,
                'greedy_worst_case_queries': upper,
                'states_visited': self.states_visited,
                'state_budget': self.state_budget,
                'witness_tree': tree}


def verify_tree_solver():
    """Compare pruning solver to exhaustive recurrence for all 3-bit families."""
    checked = 0
    for family in range(1, 1 << 8):
        hypotheses = tuple(mask for mask in range(8) if family & (1 << mask))

        @lru_cache(None)
        def exhaustive(current):
            if len(current) <= 1:
                return 0
            depths = []
            for member in range(3):
                yes = tuple(mask for mask in current if mask & (1 << member))
                no = tuple(mask for mask in current if not mask & (1 << member))
                if yes and no:
                    depths.append(1 + max(exhaustive(yes), exhaustive(no)))
            return min(depths)

        result = ClassificationTree(hypotheses, 3).run()
        assert result['optimal_worst_case_queries'] == exhaustive(hypotheses)
        checked += 1
    for members in range(1, 7):
        assert ClassificationTree(range(1 << members), members).run()['optimal_worst_case_queries'] == members
        checked += 1
    return checked


def rank_orientation_witnesses(tie_count):
    """Construct initialized RNG states reaching every rank/orientation pair.

    For k>1, force the first post-LCG high word to rank (which is <k<65536),
    then vary its low word to reach either next-call orientation. Invert the
    first LCG step to obtain entry state. k=1 skips that first RNG advance.
    This proves support only; it does not assert a distribution over states.
    """
    inverse = pow(214013, -1, 1 << 32)
    result = []
    for rank in range(tie_count):
        if tie_count == 1:
            result.extend({'rank_zero_based': 0, 'orientation': orientation,
                           'rng_entry': (((orientation << 16) - 2531011) * inverse) & 0xffffffff}
                          for orientation in (0, 1))
            continue
        found = {}
        for low in range(65536):
            first_state = (rank << 16) | low
            second_state = (214013 * first_state + 2531011) & 0xffffffff
            orientation = (second_state >> 16) % 2
            if orientation not in found:
                found[orientation] = ((first_state - 2531011) * inverse) & 0xffffffff
            if len(found) == 2:
                break
        assert len(found) == 2
        result.extend({'rank_zero_based': rank, 'orientation': orientation,
                       'rng_entry': found[orientation]} for orientation in (0, 1))
    return result


def analyze_party(example, level, state_budget):
    party = example['party']
    n = len(party)
    full = (1 << n) - 1
    candidates = logical_bridge_candidates(level)
    masks = [sum(1 << i for i, z in enumerate(party)
                 if logical_bridge_matches(z, logical_bridge_features(candidate, level)))
             for candidate in candidates]
    baseline = logical_bridge_generate(party, level, 0)
    target = baseline.target_matches
    selected_indices = [i for i, mask in enumerate(masks) if mask.bit_count() == target]
    selected = Counter(masks[i] for i in selected_indices)
    oriented = Counter()
    for mask, count in selected.items():
        oriented[mask] += count
        oriented[mask ^ full] += count
    assert len(selected_indices) == baseline.tied_candidate_count
    assert sum(oriented.values()) == 2 * len(selected_indices)
    assert all(oriented[mask] == oriented[mask ^ full] for mask in oriented)
    queries = []
    for member in range(n):
        accepted = sum(bool(mask & (1 << member)) for mask in oriented)
        rejected = len(oriented) - accepted
        assert accepted == rejected
        queries.append({'member_index': member,
                        'distinct_hypotheses_if_accepted': accepted,
                        'distinct_hypotheses_if_rejected': rejected,
                        'worst_case_remaining_hypotheses': max(accepted, rejected),
                        'guaranteed_eliminated_hypotheses': min(accepted, rejected)})
    all_oriented = set(masks) | {mask ^ full for mask in masks}
    report = {
        'fixture': example['name'], 'party': party, 'party_size': n,
        'difficulty_native': level, 'difficulty_ui': level + 1,
        'difficulty_name': LEVEL_NAMES[level],
        'total_syntactic_candidates': len(candidates),
        'all_candidates_distinct_matching_vectors': len(set(masks)),
        'all_candidates_distinct_oriented_vectors': len(all_oriented),
        'candidate_match_count_histogram': dict(sorted(Counter(mask.bit_count() for mask in masks).items())),
        'selected_match_count': target,
        'party_split_sizes_sorted': sorted((target, n - target)),
        'selected_bucket_candidates': len(selected_indices),
        'selected_candidate_indices': selected_indices,
        'selected_distinct_matching_vectors': len(selected),
        'selected_candidate_orientation_pairs': 2 * len(selected_indices),
        'selected_distinct_oriented_vectors': len(oriented),
        'distinct_oriented_vectors_by_lower_acceptance_count': dict(sorted(Counter(mask.bit_count() for mask in oriented).items())),
        'oriented_vector_multiplicity_histogram': dict(sorted(Counter(oriented.values()).items())),
        'hypotheses': [{'lower_acceptance_mask': mask,
                        'orientation0_syntactic_candidates': selected[mask],
                        'orientation1_syntactic_candidates': selected[mask ^ full],
                        'syntactic_candidate_orientation_pairs': count}
                       for mask, count in sorted(oriented.items())],
        'single_query': {'hypothesis_count': len(oriented),
                         'queries': queries,
                         'best_worst_case_remaining_hypotheses': min(q['worst_case_remaining_hypotheses'] for q in queries)},
    }
    if n == 16:
        report['ideal_classification'] = ClassificationTree(oriented, n, state_budget).run()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state-budget', type=int, default=200000,
                        help='maximum exact decision-tree states per 16-member case')
    parser.add_argument('--output', type=Path,
                        default=ROOT / 'local/analysis/logical-journey-bridge/difficulty-analysis.json')
    args = parser.parse_args()
    solver_checks = verify_tree_solver()
    cases = [analyze_party(example, level, args.state_budget)
             for example in logical_bridge_test_parties() for level in range(4)]
    # One representative case for each distinct tied-bucket size is sufficient:
    # rank and orientation depend on k and entry state, not candidate contents.
    witnesses = {}
    model_witness_checks = 0
    for case in cases:
        k = case['selected_bucket_candidates']
        if k in witnesses:
            continue
        witnesses[k] = rank_orientation_witnesses(k)
        for witness in witnesses[k]:
            generated = logical_bridge_generate(case['party'], case['difficulty_native'], witness['rng_entry'])
            assert generated.chosen_rank - 1 == witness['rank_zero_based']
            assert generated.orientation == witness['orientation']
            model_witness_checks += 1
    summary = []
    for level in range(4):
        subset = [case for case in cases if case['difficulty_native'] == level]
        fields = ('selected_bucket_candidates', 'selected_distinct_matching_vectors',
                  'selected_distinct_oriented_vectors', 'all_candidates_distinct_matching_vectors',
                  'all_candidates_distinct_oriented_vectors')
        summary.append({'difficulty_native': level, 'difficulty_name': LEVEL_NAMES[level],
                        'total_syntactic_candidates': len(logical_bridge_candidates(level)),
                        'cases': len(subset),
                        **{field: {'minimum': min(c[field] for c in subset),
                                   'maximum': max(c[field] for c in subset),
                                   'histogram': dict(sorted(Counter(c[field] for c in subset).items()))}
                           for field in fields}})
    report = {
        'schema_version': 1,
        'source_sha256': SOURCE_SHA256,
        'generator_address': '0x407180',
        'fixture_source': 'tools/test_logical_bridge_generator.py:logical_bridge_test_parties',
        'party_count': 65, 'case_count': len(cases),
        'definitions': {
            'membership_vector': 'Integer bit i is 1 iff party member i is accepted by the lower bridge. Zero-based member indices preserve fixture order.',
            'syntactic_candidate': 'One native packed predicate before orientation; distinct syntax can agree on every member of this finite party.',
            'selected_bucket': 'All native candidates at the first eligible match count reached by the recovered balancing loop.',
            'hypothesis_set': 'Distinct membership vectors induced by all selected candidates and both orientations; equivalent syntactic rules count once.',
            'orientation': '0: lower bridge accepts matching set. 1: lower bridge accepts its complement. Complements already present are deduplicated.',
            'reachability': 'Every candidate rank and orientation pair has a constructive initialized-RNG-state witness. No claim about wall-clock seeds or preceding gameplay state distribution.',
            'single_query': 'An ideal binary acceptance query for one current party member. Counts use distinct vectors, without a probability prior; all queries split this complement-closed initial set equally.',
            'difficulty_indexing': 'difficulty_native is 0..3; difficulty_ui is 1..4 in the same order, from Not So Easy to Very, Very Hard.',
            'ideal_classification': 'Minimum worst-case number of adaptive individual bridge queries sufficient to identify the full party membership vector, assuming the solver knows the party, difficulty, native filtering algorithm and support. Any unqueried party member may be selected; both binary acceptance/rejection outcomes are observable and each attempt costs one query. Free deduction. Excludes six-mistake gameplay budget, crossing-removes-entity constraints, traversal/animation costs, syntactic-rule recovery and human strategy.',
            'optimality': 'Exact recurrence D(H)=0 for |H|<=1; otherwise 1+min_i max(D(H_i,0),D(H_i,1)) over nonconstant coordinates, with proved binary-information lower bounds and feasible greedy upper bounds. Budget exhaustion is labeled with bounds only.',
            'distribution': 'No probability or representative population claim: these are the 65 fixed native-parity fixtures, not a sample of live gameplay.',
        },
        'validation': {
            'solver_comparisons_to_exhaustive_small_families_and_full_cubes': solver_checks,
            'rank_orientation_model_witnesses_checked': model_witness_checks,
            'distinct_tie_counts_with_full_support_witnesses': len(witnesses),
            'exact_16_member_cases': sum(c.get('ideal_classification', {}).get('status') == 'exact' for c in cases),
            'bounded_16_member_cases': sum('ideal_classification' in c for c in cases),
            'failures': [],
        },
        'summary_by_level': summary,
        'rank_orientation_support_witnesses_by_tie_count': witnesses,
        'cases': cases,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), 'validation': report['validation'],
                      'level_ranges': [{key: ({'minimum': value['minimum'], 'maximum': value['maximum']}
                                              if isinstance(value, dict) else value)
                                        for key, value in entry.items()} for entry in summary],
                      'sixteen_member_cases': [{key: c[key] for key in (
                          'fixture', 'difficulty_ui', 'selected_bucket_candidates',
                          'selected_distinct_matching_vectors', 'selected_distinct_oriented_vectors',
                          'party_split_sizes_sorted')} | {'classification': {key: value for key, value in c['ideal_classification'].items() if key != 'witness_tree'}}
                          for c in cases if 'ideal_classification' in c]}, indent=2))


if __name__ == '__main__':
    main()
