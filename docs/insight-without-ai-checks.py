#!/usr/bin/env python3
"""Checks for the numerical claims in docs/insight-without-ai.md.

Standard library only. Run: python3 docs/insight-without-ai-checks.py
"""
import itertools
import math
from collections import Counter, deque


def nbrs(c, cells):
    r, k = c
    for dr, dk in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        n = (r + dr, k + dk)
        if n in cells:
            yield n


def matching(cells, side=0):
    """Maximum matching from squares of one color; returns dict other->this."""
    match = {}

    def aug(u, seen):
        for v in nbrs(u, cells):
            if v in seen:
                continue
            seen.add(v)
            if v not in match or aug(match[v], seen):
                match[v] = u
                return True
        return False

    for u in [c for c in cells if sum(c) % 2 == side]:
        aug(u, set())
    return match


def coverable(cells):
    return len(cells) % 2 == 0 and 2 * len(matching(cells)) == len(cells)


def hall_set(cells):
    """Smallest alternating-path Hall violator found from either color."""
    best = None
    for side in (0, 1):
        m = matching(cells, side)
        matched = set(m.values())
        for u in [c for c in cells if sum(c) % 2 == side and c not in matched]:
            S, T, q = {u}, set(), deque([u])
            while q:
                x = q.popleft()
                for y in nbrs(x, cells):
                    if y in T:
                        continue
                    T.add(y)
                    x2 = m.get(y)
                    if x2 is not None and x2 not in S:
                        S.add(x2)
                        q.append(x2)
            if best is None or len(S) < len(best[0]):
                best = (S, T)
    return best


def board(n):
    return {(r, c) for r in range(n) for c in range(n)}


print("1. Gomory: two squares removed")
for n in (4, 6, 8):
    full = board(n)
    ok = all(coverable(full - {a, b}) == ((sum(a) + sum(b)) % 2 == 1)
             for a, b in itertools.combinations(sorted(full), 2))
    print(f"   {n}x{n}: coverable exactly when the two colors differ: {ok}")

print("2. Four squares removed from 6x6")
full = board(6)
balanced = failing = stranded = 0
for combo in itertools.combinations(sorted(full), 4):
    if sum(sum(c) % 2 == 0 for c in combo) != 2:
        continue
    balanced += 1
    cells = full - set(combo)
    if coverable(cells):
        continue
    failing += 1
    S, T = hall_set(cells)
    if len(S) == 1 and not T:
        (cell,) = S
        if cell in {(0, 0), (0, 5), (5, 0), (5, 5)}:
            stranded += 1
print(f"   balanced boards {balanced}, not coverable {failing} ({failing / balanced:.1%}),"
      f" of which a stranded corner square {stranded}")

print("3. Prototype gardens")
for holes in ([(0, 0), (5, 5)], [(0, 0), (0, 5)],
              [(0, 0), (0, 2), (2, 0), (2, 1), (2, 5), (3, 0)], [(2, 2), (3, 4)]):
    cells = full - set(holes)
    even = sum(sum(c) % 2 == 0 for c in cells)
    line = f"   holes {holes}: colors {even}/{len(cells) - even}, coverable {coverable(cells)}"
    if not coverable(cells) and even * 2 == len(cells):
        S, T = hall_set(cells)
        line += f", star set {sorted(S)} with partners {sorted(T)}"
    print(line)

print("4. Flip maps")
cells4 = [(0, 0), (0, 1), (1, 0), (1, 1)]
ideals = [frozenset(S) for k in range(5) for S in itertools.combinations(cells4, k)
          if all((i == 0 or (i - 1, j) in S) and (j == 0 or (i, j - 1) in S) for i, j in S)]
edges = [(a, b) for a, b in itertools.combinations(range(len(ideals)), 2)
         if len(ideals[a] ^ ideals[b]) == 1]
print(f"   2-2-1 hexagon: {len(ideals)} tilings, {len(edges)} flips;"
      f" every flip changes the cube count by one, so the map is two-colorable")


def domino_tilings(R, C):
    out = []

    def rec(filled, doms):
        free = [(r, c) for r in range(R) for c in range(C) if (r, c) not in filled]
        if not free:
            out.append(frozenset(doms))
            return
        r, c = free[0]
        for d in ((0, 1), (1, 0)):
            o = (r + d[0], c + d[1])
            if o[0] < R and o[1] < C and o not in filled:
                rec(filled | {(r, c), o}, doms + [((r, c), o)])

    rec(frozenset(), [])
    return out


def flips(t):
    s = set(t)
    for (a, b) in t:
        if a[0] == b[0]:
            e = ((a[0] + 1, a[1]), (a[0] + 1, b[1]))
            if e in s:
                yield frozenset(s - {(a, b), e} | {(a, e[0]), (b, e[1])})
        else:
            e = ((a[0], a[1] + 1), (b[0], b[1] + 1))
            if e in s:
                yield frozenset(s - {(a, b), e} | {(a, e[0]), (b, e[1])})


def dark_left(t):
    return sum(1 for a, b in t if a[0] == b[0] and sum(a) % 2 == 0)


for R, C in ((3, 4), (4, 4), (4, 6)):
    T = domino_tilings(R, C)
    ok = all(abs(dark_left(t) - dark_left(u)) == 1 for t in T for u in flips(t))
    print(f"   {R}x{C} dominoes: {len(T)} tilings; every flip changes the number of"
          f" horizontal dominoes with the dark square on the left by one: {ok}")

print("5. Other numbers")
P = sum(1 for p in itertools.product(range(1, 8), repeat=3) if p[0] ^ p[1] ^ p[2] == 0)
print(f"   Nim, three piles of 1-7: {P} of 343 starts lose for the player to move ({P / 343:.0%})")
f = [1, 1]
while len(f) <= 10:
    f.append(f[-1] + f[-2])
print(f"   2x10 strip coverings: {f[10]}")
print(f"   jumps visiting all 30 places: {[k for k in range(1, 30) if math.gcd(k, 30) == 1]}")


def jug_amounts(a, b):
    seen, q = {(0, 0)}, deque([(0, 0)])
    while q:
        x, y = q.popleft()
        t = min(x, b - y)
        u = min(y, a - x)
        for s in ((a, y), (x, b), (0, y), (x, 0), (x - t, y + t), (x + u, y - u)):
            if s not in seen:
                seen.add(s)
                q.append(s)
    return sorted({v for s in seen for v in s} - {0})


print(f"   amounts left in a jug with jugs 6 and 15: {jug_amounts(6, 15)}")
W = list(itertools.product((0, 1), repeat=3))
fewest = next(k for k in range(1, 9) if any(
    len({tuple(sum(x == y for x, y in zip(w, t)) for t in T) for w in W}) == 8
    for T in itertools.combinations(W, k)))
print(f"   fewest exact-match tests that separate all eight 3-lamp secrets: {fewest}")
print(f"   blind pass rate, six coin-flip boards: 1/{2 ** 6};"
      f" resampled to have one of each: 1/{2 ** 6 - 2}; eight boards: 1/{2 ** 8};"
      f" eight with a known 4/4 split: 1/{math.comb(8, 4)}")


def corner_and_bounces(w, h):
    g = math.gcd(w, h)
    p, q = w // g, h // g
    # The unfolded ray reaches (L, L), L = lcm(w, h): q room widths across, p room heights up.
    return ("top" if p % 2 else "bottom") + "-" + ("right" if q % 2 else "left"), p + q - 2


assert corner_and_bounces(2, 4) == ("top-left", 1)  # the app's billiard-01
tr = sorted({b for w in range(1, 13) for h in range(1, 13)
             for c, b in [corner_and_bounces(w, h)] if c == "top-right"})
print(f"   slope-1 billiards ending top-right use these bounce counts (rooms up to 12x12): {tr}")

print("6. Sorting rounds in prototypes/proof-tools.html (Python port of makeRound)")
import random

random.seed(7)
full6 = sorted(board(6))
corner_cells = [(0, 0), (0, 5), (5, 0), (5, 5)]


def stranded(cells):
    return any(not any(True for _ in nbrs(c, cells)) for c in cells)


pairs = [frozenset(p) for p in itertools.combinations(full6, 2)]
same2 = [p for p in pairs if sum(sum(c) for c in p) % 2 == 0]
opp2 = [p for p in pairs if sum(sum(c) for c in p) % 2 == 1]
tile4, hall4, color4 = [], [], []
for combo in itertools.combinations(full6, 4):
    cells = board(6) - set(combo)
    ev = sum(sum(c) % 2 == 0 for c in cells)
    if ev * 2 != len(cells):
        if not stranded(cells):
            color4.append(frozenset(combo))
    elif coverable(cells):
        tile4.append(frozenset(combo))
    else:
        hall4.append(frozenset(combo))
adjacent_corner_pairs = [frozenset(p) for p in itertools.combinations(corner_cells, 2)
                         if (sum(p[0]) + sum(p[1])) % 2 == 1]


def coins(min_yes, min_no):
    while True:
        L = [random.random() < .5 for _ in range(6)]
        if sum(L) >= min_yes and 6 - sum(L) >= min_no:
            return L


def make_round(level):
    out = []
    if level == 0:
        need_same = True
        for ok in coins(1, 1):
            if ok:
                out.append((random.choice(opp2), True))
            else:
                same = need_same or random.random() < .5
                need_same = False
                out.append((random.choice(same2), False) if same else
                           (frozenset(random.sample(full6, random.choice([1, 3]))), False))
    elif level == 1:
        need_corner = True
        for ok in coins(1, 1):
            if ok and need_corner:
                need_corner = False
                out.append((random.choice(adjacent_corner_pairs), True))
            else:
                out.append((random.choice(opp2 if ok else same2), ok))
    else:
        need = ["hall", "color"]
        for ok in coins(1, 2):
            if ok:
                out.append((random.choice(tile4), True))
            else:
                w = need.pop(0) if need else random.choice(["hall", "color"])
                out.append((random.choice(hall4 if w == "hall" else color4), False))
    return out


def colors_balance(h):
    cells = board(6) - set(h)
    return sum(sum(c) % 2 == 0 for c in cells) * 2 == len(cells)


rules = {
    0: {"odd holes => no, even => yes": lambda h: len(h) % 2 == 0,
        "true rule (balanced colors)": colors_balance},
    1: {"missing corner => no, else colors": lambda h: not any(c in corner_cells for c in h) and colors_balance(h),
        "true rule (balanced colors)": colors_balance},
    2: {"colors balance => yes": colors_balance,
        "stranded => no, ignore colors": lambda h: not stranded(board(6) - set(h)),
        "true rule (balanced, nothing stranded)": lambda h: colors_balance(h) and not stranded(board(6) - set(h))},
}
ROUNDS = 3000
for level in range(3):
    rounds = [make_round(level) for _ in range(ROUNDS)]
    for name, rule in rules[level].items():
        p = sum(all(rule(h) == ok for h, ok in r) for r in rounds) / ROUNDS
        print(f"   level {level + 1}: '{name}' passes {p:.1%} of rounds,"
              f" {p * p:.2%} of levels (two clean rounds)")


def two_try_pass(n, feedback):
    """Best blind pass probability within two tries, labels uniform on {0,1}^n."""
    total = 0
    for first_wrong in range(n + 1):
        ways = math.comb(n, first_wrong)
        if first_wrong == 0:
            total += ways
        elif feedback == "count":
            total += ways / math.comb(n, first_wrong)  # second try: guess within the known count
        elif feedback == "threshold":  # told only whether at most two are wrong
            group = sum(math.comb(n, k) for k in range(1, 3)) if first_wrong <= 2 else 2 ** n - 1 - sum(math.comb(n, k) for k in range(1, 3))
            total += ways / group
    return total / 2 ** n


for n in (6, 8):
    print(f"   blind pass within two tries, {n} boards: count feedback {two_try_pass(n, 'count'):.4f},"
          f" threshold feedback {two_try_pass(n, 'threshold'):.4f}; one try {1 / 2 ** n:.4f}")
