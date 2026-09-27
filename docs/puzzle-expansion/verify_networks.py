#!/usr/bin/env python3
"""Independently check every network witness and claimed optimum (stdlib only)."""
import heapq
import json
from itertools import combinations
from collections import Counter
from pathlib import Path


def graph(instance):
    p = instance["parameters"]
    vertices, edges = p["vertices"], p["edges"]
    assert len(vertices) == len(set(vertices))
    assert len(edges) == len({frozenset(e[:2]) for e in edges})
    assert all(u in vertices and v in vertices and u != v and w > 0
               for u, v, w in edges)
    adjacency = {v: [] for v in vertices}
    for index, (u, v, weight) in enumerate(edges):
        adjacency[u].append((v, index, weight))
        adjacency[v].append((u, index, weight))
    seen, todo = set(), [vertices[0]]
    while todo:
        u = todo.pop()
        if u not in seen:
            seen.add(u)
            todo.extend(v for v, _, _ in adjacency[u])
    assert seen == set(vertices)
    return vertices, edges, adjacency


def optimal_route(instance):
    """Dijkstra over (current vertex, visited-edge mask); no parity formula used."""
    vertices, edges, adjacency = graph(instance)
    p = instance["parameters"]
    starts = [p["start"]] if p.get("start") else vertices
    best = None
    for start in starts:
        final_mask = (1 << len(edges)) - 1
        dist = {(start, 0): 0}
        parent = {}
        queue = [(0, start, 0)]
        while queue:
            cost, u, mask = heapq.heappop(queue)
            state = (u, mask)
            if dist.get(state) != cost:
                continue
            if mask == final_mask and (not p["closed"] or u == start):
                route = [u]
                while state in parent:
                    state = parent[state]
                    route.append(state[0])
                answer = (cost, list(reversed(route)))
                if best is None or answer[0] < best[0]:
                    best = answer
                break
            for v, edge, weight in adjacency[u]:
                if p["mode"] == "each_edge_once" and mask & (1 << edge):
                    continue
                new = (v, mask | (1 << edge))
                if cost + weight < dist.get(new, float("inf")):
                    dist[new] = cost + weight
                    parent[new] = (u, mask)
                    heapq.heappush(queue, (cost + weight, *new))
    return best


def can_color(vertices, adjacency, palette, initial=None):
    """Exhaustive coloring search, choosing the most constrained vertex next."""
    colors = dict(initial or {})

    def visit():
        if len(colors) == len(vertices):
            return dict(colors)
        u = max((v for v in vertices if v not in colors),
                key=lambda v: (len({colors[n] for n, _, _ in adjacency[v]
                                   if n in colors}), len(adjacency[v])))
        forbidden = {colors[n] for n, _, _ in adjacency[u] if n in colors}
        for c in range(1, palette + 1):
            if c not in forbidden:
                colors[u] = c
                found = visit()
                if found is not None:
                    return found
                del colors[u]
        return None

    return visit()


def verify_route(instance):
    _, edges, adjacency = graph(instance)
    p, solution = instance["parameters"], instance["solution"]
    route = solution["route"]
    assert not p.get("start") or route[0] == p["start"]
    assert not p["closed"] or route[0] == route[-1]
    lookup = {frozenset((u, v)): (i, w) for i, (u, v, w) in enumerate(edges)}
    counts = Counter()
    cost = 0
    for u, v in zip(route, route[1:]):
        index, weight = lookup[frozenset((u, v))]
        counts[index] += 1
        cost += weight
    assert set(counts) == set(range(len(edges)))
    if p["mode"] == "each_edge_once":
        assert set(counts.values()) == {1}
    assert cost == solution["cost"] == p["target_cost"]
    optimum, _ = optimal_route(instance)
    assert optimum == cost
    if "odd_vertices" in solution:
        assert sorted(solution["odd_vertices"]) == sorted(
            v for v in adjacency if len(adjacency[v]) % 2)
    if "base_cost" in solution:
        assert solution["base_cost"] == sum(w for _, _, w in edges)
        assert solution["extra_cost"] == cost - solution["base_cost"]
    if "pairing_costs" in solution:
        distances = {v: {u: float("inf") for u in adjacency} for v in adjacency}
        for v in adjacency:
            distances[v][v] = 0
        for u, v, weight in edges:
            distances[u][v] = distances[v][u] = weight
        for k in adjacency:
            for u in adjacency:
                for v in adjacency:
                    distances[u][v] = min(distances[u][v],
                                          distances[u][k] + distances[k][v])
        for pairing in solution["pairing_costs"]:
            assert pairing["cost"] == sum(distances[u][v] for u, v in pairing["pairs"])
        assert min(q["cost"] for q in solution["pairing_costs"]) == solution["extra_cost"]


def verify_color(instance):
    vertices, edges, adjacency = graph(instance)
    p, solution = instance["parameters"], instance["solution"]
    colors = solution["colors"]
    assert set(colors) == set(vertices)
    assert all(1 <= c <= p["palette_size"] for c in colors.values())
    assert all(colors[u] != colors[v] for u, v, _ in edges)
    assert len(set(colors.values())) == solution["minimum_colors"] == p["palette_size"]
    # Every smaller palette checked explicitly. No source theorem is assumed.
    for k in range(1, p["palette_size"]):
        assert can_color(vertices, adjacency, k) is None
    assert can_color(vertices, adjacency, p["palette_size"]) is not None
    if instance['id'] == 'color-12':
        links = {frozenset(e[:2]) for e in edges}
        assert not any(all(frozenset(pair) in links for pair in combinations(triple, 2))
                       for triple in combinations(vertices, 3)), 'The four-color example must remain triangle-free'
    partial = instance.get("author_checks", {}).get("unextendable_partial_coloring")
    if partial is not None:
        assert set(partial) <= set(vertices)
        assert all(1 <= c <= p["palette_size"] for c in partial.values())
        assert all(u not in partial or v not in partial or partial[u] != partial[v]
                   for u, v, _ in edges)
        assert can_color(vertices, adjacency, p["palette_size"], partial) is None


def main():
    payload = json.loads(Path(__file__).with_name("networks.json").read_text())
    assert {f["id"] for f in payload["families"]} == {"route", "color"}
    count = 0
    for family in payload["families"]:
        assert len(family["instances"]) == 12
        for instance in family["instances"]:
            (verify_route if family["id"] == "route" else verify_color)(instance)
            print(f"PASS {instance['id']}: witness and optimum verified")
            count += 1
    print(f"Verified {count} instances in 2 families.")


if __name__ == "__main__":
    main()
