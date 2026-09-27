"""Exact-cover checks for the six proposed Tile Garden revision probes."""
from collections import Counter
from functools import lru_cache
from itertools import combinations

# Letters are distinct pieces; '.' is a missing square. Counts are (domino, L).
PROBES = [
    ('tile-probe-01', ['AAB', 'ABB'], (0, 2), 2, (4, 4)),
    ('tile-probe-02', ['.ABB', 'AACB', 'DCCE', 'DDEE'], (0, 5), 1, (5, 28)),
    ('tile-probe-03', ['AABB', 'A.CB', 'DCCE', 'DDEE'], (0, 5), 1, (5, 19)),
    ('tile-probe-04', ['AAB', 'CDB', 'CDD'], (3, 1), 8, (16, 12)),
    ('tile-probe-05', ['AABB', 'CDDE', 'CDEE'], (3, 2), 40, (37, 4)),
    ('tile-probe-06', ['AABB', 'CCDD', 'CEDF', 'EEFF'], (2, 4), 96, (56, 4)),
]


def piece_type(cells):
    if len(cells) == 2:
        a, b = list(cells)
        return 'D' if sum(abs(a[i]-b[i]) for i in (0, 1)) == 1 else None
    if len(cells) == 3:
        rs, cs = zip(*cells)
        return 'L' if max(rs)-min(rs) == max(cs)-min(cs) == 1 else None
    return None


def verify():
    for name, diagram, inventory, expected_count, expected_first in PROBES:
        cells = frozenset((r, c) for r, row in enumerate(diagram)
                          for c, value in enumerate(row) if value != '.')
        labels = set(''.join(diagram)) - {'.'}
        actual = Counter()
        for label in labels:
            kind = piece_type({(r,c) for r,c in cells if diagram[r][c] == label})
            assert kind is not None, (name, label)
            actual[kind] += 1
        assert (actual['D'], actual['L']) == inventory
        pieces = [(piece_type(p), frozenset(p)) for n in (2,3)
                  for p in combinations(sorted(cells), n) if piece_type(p)]

        @lru_cache(None)
        def count(remaining, dominos, trominos):
            if not remaining:
                return int(dominos == trominos == 0)
            if dominos < 0 or trominos < 0:
                return 0
            anchor = min(remaining)
            return sum(count(remaining-p, dominos-(kind=='D'), trominos-(kind=='L'))
                       for kind, p in pieces if anchor in p and p <= remaining)

        assert count(cells, *inventory) == expected_count
        live = dead = 0
        for kind, placement in pieces:
            d, l = inventory
            if (kind == 'D' and not d) or (kind == 'L' and not l):
                continue
            if count(cells-placement, d-(kind=='D'), l-(kind=='L')):
                live += 1
            else:
                dead += 1
        assert (live, dead) == expected_first
    print('Tile Garden: 6 revision probes checked; witnesses, counts, and first-placement dead ends verified.')


if __name__ == '__main__':
    verify()
