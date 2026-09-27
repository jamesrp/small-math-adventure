#!/usr/bin/env python3
"""Math and regression checks for the recovered Beetle Bug Alley generator."""
import itertools
import unittest
from mountain_generator import (
    MountainRandom, mountain_records, mountain_generate, mountain_game_move,
    mountain_scramble_move, mountain_checker, mountain_permutation,
    mountain_distance_map, mountain_witness, mountain_cycles, mountain_group_stats)


class MountainGeneratorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.records = mountain_records()

    def test_native_known_generator_cases(self):
        # Fixed expectations taken from the independently executed original code.
        for category, seed, record, state, calls, final in [
            (1, 0, 0, (4, 2, 5, 3, 1, 0), 69, 366913975),
            (1, 1, 0, (0, 1, 4, 3, 2, 5), 50, 2597632883),
            (2, 1788458156, 10, (5, 6, 4, 3, 2, 0, 1), 14, 237733426),
        ]:
            result = mountain_generate(category, seed, self.records)
            self.assertEqual((result['record_index'], result['state'], result['rng_calls'], result['rng_final_state']),
                             (record, state, calls, final))

    def test_every_table_move_is_a_permutation_and_composes_correctly(self):
        moves = {(r['point_count'], tuple(tuple(t['raw']) for t in m['transfers']))
                 for r in self.records for p in r['move_variant_pools']
                 for v in p['variants'] for m in v['moves'] if m['transfers']}
        for n, move in moves:
            for candidate in (move, tuple((b, a, f) for a, b, f in move)):
                p = mountain_permutation(candidate, n)
                for state in itertools.islice(itertools.permutations(range(n)), 50):
                    self.assertEqual(mountain_game_move(state, candidate), tuple(p[x] for x in state))
                    self.assertEqual(sorted(mountain_scramble_move(state, candidate)), list(range(n)))

    def test_sequential_scramble_is_not_gameplay_rotation(self):
        move = ((0, 1, 0), (1, 2, 0), (2, 0, 0))
        state = (1, 0, 2)
        self.assertEqual(mountain_game_move(state, move), (2, 1, 0))
        self.assertEqual(mountain_scramble_move(state, move), (1, 2, 0))

    def test_exact_unreachable_native_example(self):
        result = mountain_generate(2, 1788458156, self.records)
        permutations = tuple(mountain_permutation(m, 7) for m in result['moves'])
        graph = mountain_distance_map(permutations)
        self.assertEqual([list(map(len, mountain_cycles(p))) for p in permutations], [[7], [3]])
        self.assertEqual(len(graph), 2520)
        self.assertNotIn(bytes(result['state']), graph)
        self.assertEqual(sorted(map(len, mountain_cycles(result['state']))), [2, 2, 2])
        self.assertEqual(result['attempts'][0]['checker_code'], 0)
        self.assertEqual(len(result['attempts']), 1)

    def test_reverse_bfs_distance_uses_only_legal_forward_buttons(self):
        # A single directed 3-cycle: the reverse of one click needs two clicks.
        permutations = (bytes((1, 2, 0)),)
        graph = mountain_distance_map(permutations)
        self.assertEqual(graph[bytes((1, 2, 0))], 2)
        self.assertEqual(mountain_witness((1, 2, 0), permutations, graph), [0, 0])
        self.assertEqual(mountain_witness((2, 0, 1), permutations, graph), [0])

    def test_checker_depth_is_first_dfs_witness_not_minimum(self):
        moves = (((0, 1, 1),), ((1, 2, 1),))
        code, depth, witness = mountain_checker((0, 2, 1), moves)
        self.assertEqual(code, 2)
        self.assertGreater(depth, 1)
        state = (0, 2, 1)
        for index in witness:
            state = mountain_game_move(state, moves[index])
        self.assertEqual(state, (0, 1, 2))

    def test_block_structure_is_distinct_from_full_eight_point_group(self):
        generators = (bytes((1, 2, 3, 0, 4, 5, 6, 7)),
                      bytes((1, 0, 2, 3, 4, 5, 6, 7)),
                      bytes((4, 5, 6, 7, 0, 1, 2, 3)))
        graph = mountain_distance_map(generators)
        stats = mountain_group_stats(generators, graph)
        self.assertEqual(stats['group_order'], 1152)
        self.assertEqual(stats['two_block_system'], [[0, 1, 2, 3], [4, 5, 6, 7]])
        self.assertTrue(stats['classification'].startswith('S4 wreath S2'))

    def test_six_solved_attempts_use_solved_fallback(self):
        # Synthetic 2-bead table isolates the otherwise rare fallback branch.
        record = {'index': 0, 'source_offset': None, 'category': 1, 'selection_weight': 1,
                  'point_count': 2, 'points': [[0, 0], [1, 0]],
                  'move_variant_pools': [{'pool_index': i, 'variants': [{'moves': [
                      {'transfers': [{'raw': [0, 1, 1]}] if i == 0 else []}]}]} for i in range(3)]}
        result = mountain_generate(1, 0, [record])
        self.assertTrue(result['fallback'])
        self.assertEqual(result['state'], (0, 1))
        self.assertEqual(result['rng_calls'], 57)
        self.assertEqual([a['checker_code'] for a in result['attempts']], [1] * 6)


if __name__ == '__main__':
    unittest.main()
