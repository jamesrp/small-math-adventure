#!/usr/bin/env python3
"""Verify authored Latin, exact-position code, and Nim instances using only stdlib.

No application imports. Latin is enumerated by row/column exclusion; Nim is
solved by backward recursion independently of the XOR witness formula.
"""
from functools import lru_cache, reduce
from itertools import product
from operator import xor
from pathlib import Path
import json

DATA = Path(__file__).with_name('deduction.json')


def latin_solutions(grid, limit=2):
    n = len(grid)
    values = set(range(1, n + 1))
    assert all(len(row) == n for row in grid)
    assert all(set(row) <= values | {0} for row in grid)
    board = [row[:] for row in grid]
    for line in board + [list(col) for col in zip(*board)]:
        entries = [v for v in line if v]
        if len(entries) != len(set(entries)):
            return []
    solutions = []

    def search():
        best = None
        for r in range(n):
            for c in range(n):
                if board[r][c]:
                    continue
                choices = values - set(board[r]) - {board[i][c] for i in range(n)}
                if not choices:
                    return
                if best is None or len(choices) < len(best[2]):
                    best = r, c, choices
        if best is None:
            solutions.append([row[:] for row in board])
            return
        r, c, choices = best
        for v in sorted(choices):
            board[r][c] = v
            search()
            if len(solutions) >= limit:
                break
        board[r][c] = 0

    search()
    return solutions


def singles_closure(grid, include_hidden):
    """Apply cell-single and optionally row/column symbol-single deductions."""
    board = [row[:] for row in grid]
    n = len(board)
    values = set(range(1, n + 1))
    steps = []
    while True:
        candidates = {
            (r, c): values - set(board[r]) - {board[i][c] for i in range(n)}
            for r in range(n) for c in range(n) if not board[r][c]
        }
        assert all(candidates.values()), 'Deductions reached contradiction'
        move = next(((r, c, next(iter(v))) for (r, c), v in candidates.items()
                     if len(v) == 1), None)
        if move is None and include_hidden:
            for axis in (0, 1):
                for index in range(n):
                    for symbol in sorted(values):
                        places = [cell for cell, v in candidates.items()
                                  if cell[axis] == index and symbol in v]
                        if len(places) == 1:
                            move = *places[0], symbol
                            break
                    if move:
                        break
                if move:
                    break
        if move is None:
            return board, steps, candidates
        r, c, symbol = move
        board[r][c] = symbol
        steps.append([r + 1, c + 1, symbol])


def score(code, query):
    assert len(code) == len(query)
    return sum(a == b for a, b in zip(code, query))


def nim_moves(piles):
    for i, pile in enumerate(piles):
        for amount in range(1, pile + 1):
            after = list(piles)
            after[i] -= amount
            yield {'pile': i + 1, 'remove': amount, 'after': after}


@lru_cache(None)
def nim_winning(piles):
    return any(not nim_winning(tuple(move['after'])) for move in nim_moves(piles))


def verify(path=DATA):
    data = json.loads(Path(path).read_text())
    assert {f['id'] for f in data['families']} == {'latin', 'code', 'nim'}
    total = 0
    for family in data['families']:
        assert len(family['instances']) == 12
        for instance in family['instances']:
            total += 1
            p, s = instance['parameters'], instance['solution']
            if family['id'] == 'latin':
                grid = p['givens']
                assert p['order'] == len(grid)
                answers = latin_solutions(grid)
                assert answers == [s['canonical_grid']], instance['id']
                assert s['completion_count'] == 1
                naked = singles_closure(grid, False)
                hidden = singles_closure(grid, True)
                facts = instance['verification_claims']
                assert len(naked[1]) == facts['cell_single_steps_before_stall']
                assert len(hidden[1]) == facts['all_single_steps_before_stall']
                assert bool(hidden[2]) == facts['all_singles_stall_unsolved']
                if 'rejected_candidate' in facts:
                    r, c, value = facts['rejected_candidate']
                    branch = [row[:] for row in hidden[0]]
                    assert value in hidden[2][r - 1, c - 1]
                    branch[r - 1][c - 1] = value
                    assert latin_solutions(branch) == []
            elif family['id'] == 'code':
                n = p['length']
                assert p['alphabet'] == ['0', '1'] and p['repetitions_allowed']
                words = [''.join(bits) for bits in product('01', repeat=n)]
                for query in p['transcript']:
                    assert len(query['guess']) == n and set(query['guess']) <= {'0', '1'}
                    assert 0 <= query['matches'] <= n
                candidates = [w for w in words if all(
                    score(w, q['guess']) == q['matches'] for q in p['transcript'])]
                assert candidates == [s['code']], (instance['id'], candidates)
                if instance['verification_claims']['no_giveaway_score']:
                    assert all(0 < q['matches'] < n for q in p['transcript'])
                if instance['verification_claims']['probes_resolve_every_code']:
                    signatures = {tuple(score(w, q['guess']) for q in p['transcript']) for w in words}
                    assert len(signatures) == 2 ** n
                if instance['verification_claims'].get('irredundant_for_this_code'):
                    for omitted in range(len(p['transcript'])):
                        assert sum(all(score(w, q['guess']) == q['matches']
                                       for i, q in enumerate(p['transcript']) if i != omitted)
                                   for w in words) > 1
            else:
                piles = tuple(p['piles'])
                assert p['normal_play'] and p['task'] == 'win_game'
                assert nim_winning(piles)
                winning = [m for m in nim_moves(piles) if not nim_winning(tuple(m['after']))]
                assert winning == s['all_winning_moves'], (instance['id'], winning)
                assert s['canonical_move'] in winning
                assert all(reduce(xor, m['after'], 0) == 0 for m in winning)
                assert reduce(xor, piles, 0) == s['nim_sum']
        print(f"{family['id']}: 12 instances verified")
    print(f'PASS: {total} instances; Latin uniqueness and difficulty diagnostics; code uniqueness; all Nim winning moves.')
    return total


if __name__ == '__main__':
    verify()
