"""Rebuild instances 07–12 from deliberate designs; retain original 01–06.

Run before import-expansion.mjs. Searches compute witnesses, never runtime
content. Latin clues and code probes are fixed, reviewed inputs. The independent
verify_*.py programs check uniqueness, minima and complete strategy branches.
"""
import json
import math
import sys
from collections import deque
from functools import reduce
from itertools import combinations, product
from operator import xor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'docs/puzzle-expansion'
sys.path.insert(0, str(DATA))
sys.dont_write_bytecode = True
from verify_motion import edges_for, trace, serialize_path, orbit_period
from verify_networks import optimal_route, graph, can_color
from verify_deduction import latin_solutions, singles_closure, score, nim_moves
from verify_measurement import shortest_jug, jug_moves, weighing_strategy, check_tree, hypotheses

docs = {name: json.loads((DATA / f'{name}.json').read_text())
        for name in ('motion', 'networks', 'deduction', 'measurement')}
families = {f['id']: f for d in docs.values() for f in d['families']}
for f in families.values():
    f['instances'] = f['instances'][:6]
    # These are relative entry points within a family, not grade assignments.
    for i, p in enumerate(f['instances']):
        p['difficulty_level'] = 'easy' if i < 2 else 'medium' if i < 4 else 'hard'

families['toggle']['rules'][3] = 'When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.'
families['toggle']['prerequisites'] = 'Entry: distinguish bright/dark and follow a two-object change. Later: compare start and target, plan paths and cancellations, and count a budget up to six. Difficulty is relative within the family, not a grade ceiling.'
families['clock']['prerequisites'] = 'Entry: follow clockwise landings and count to four. Later: coordinate two or three repeating sequences, starting phases, and counts up to twenty-two. Multiplication, gcd, and congruence notation are optional strategies.'
families['route']['rules'] = 'Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.'
families['jug']['rules'] = 'A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.'
families['weigh']['rules'] = 'Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.'
families['code']['mathematics'] = 'A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.'

# The curriculum was moved after the original pack. Keep the existing source
# identities while resolving their paths to the current editable originals.
for f in families.values():
    for source in f['sources']:
        path = source.get('path', '')
        current = path.replace('/math-circle/worksheets/', '/math-circle/lowell-math-circle-year-2/source/').replace('/math-circle/nytimes/', '/math-circle/external-resources/nytimes/')
        if current != path and Path(current).is_file(): source['path'] = current


def add(family, title, parameters, solution, hint, insight, readiness, reasoning,
        level='hard', **extra):
    f = families[family]
    number = len(f['instances']) + 1
    p = dict(id=f'{family}-{number:02}', title=title, parameters=parameters,
             solution=solution, hint=hint, insight=insight, prerequisites=readiness,
             difficulty_level=level, difficulty_reasoning=reasoning,
             provenance='New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.', **extra)
    f['instances'].append(p)
    return p


def toggle(topology, vertices, initial, target, title, hint, insight, level='hard', rows=None):
    q = dict(topology=topology, vertices=list(vertices), initial_on=list(initial), target_on=list(target))
    if rows: q['rows'] = [list(row) for row in rows]
    q['edges'] = edges_for(q)
    bits = lambda names: sum(1 << q['vertices'].index(v) for v in names)
    start, goal = bits(initial), bits(target)
    todo, seen = deque([(start, [])]), {start}
    while todo:
        state, path = todo.popleft()
        if state == goal: break
        for edge in q['edges']:
            nxt = state ^ bits(edge)
            if nxt not in seen:
                seen.add(nxt); todo.append((nxt, path + [edge]))
    else: raise AssertionError('Unreachable toggle target')
    q['press_budget'] = len(path)
    add('toggle', title, q, dict(presses=path, minimum_presses=len(path)), hint, insight,
        'Compare two lamp patterns; plan cancellations within a fixed budget.', insight, level,
        prompt=f'Match the goal card in at most {len(path)} wire presses.')


toggle('cycle', '123456', '12', '2345', 'Repair only the differences',
       'Lantern 2 is already right. Compare which lamps differ before choosing wires.',
       'Solve the symmetric difference between the two pictures; a lamp already lit may need to stay lit.', 'medium')
toggle('complete_binary_tree_depth_2', ['R','A','B','C','D','E','F'], 'CDEF', 'AB', 'Work from the leaves',
       'Every leaf has just one wire. Decide those four wires before the two root wires.',
       'Leaf requirements force wire choices. Their combined parity then decides the parent edges.', 'medium')
toggle('rectangular_grid', 'ABCDEFGHI', '', 'ACGI', 'Pair across the square',
       'Connect the corner goals in pairs. Any middle lamps used along a path must change twice.',
       'Different shortest pairings give valid answers; sending every path through the center wastes presses.', rows=['ABC','DEF','GHI'])
toggle('rectangular_grid', 'ABCDEFGHI', 'BDFH', 'AI', 'Cancel through the center',
       'Mark the six lamps that differ. Decide which can be paired without leaving a long final connection.',
       'Both extinguishing and lighting count as odd endpoints. Overlapping routes cancel at intermediate lamps.', rows=['ABC','DEF','GHI'])
toggle('rectangular_grid', 'ABCDEFGHIJKL', '', 'ABDIJL', 'Plan all three pairs',
       'Pairing two neighbors is safe only if the four remaining goals can still fit the budget.',
       'Six required endpoints turn a local pairing choice into a comparison of complete plans.', rows=['ABCD','EFGH','IJKL'])
toggle('rectangular_grid', 'ABCDEFGHIJKL', 'BCEH', 'AFIK', 'Change the whole pattern',
       'Compare start and goal first, then look for disjoint short paths between the differing lamps.',
       'Several paths must cooperate; a shortest solution depends on the difference pattern, not on the goal alone.', rows=['ABCD','EFGH','IJKL'])


def clock(title, q, hint, insight, level='hard'):
    if q['mode'] == 'choose_jump':
        answers = [k for k in range(q['jump_min'], q['jump_max']+1)
                   if orbit_period(q['positions'], k)[0] == q['required_first_return']]
        s = dict(jump=answers[0], all_valid_jumps=answers,
                 orbit=orbit_period(q['positions'], answers[0], q['start'])[1])
        prompt = f'Choose a fixed jump whose first return takes {q["required_first_return"]} bells.'
    else:
        clocks = q['clocks']
        period = math.lcm(*(c['positions']//math.gcd(c['positions'], c['jump']) for c in clocks))
        route = [[(c['start']+t*c['jump']) % c['positions'] for c in clocks] for t in range(period+1)]
        t = next(t for t in range(1,period+1) if route[t] == [c['target'] for c in clocks])
        s = dict(activations=t, joint_route=route[:t+1], joint_period=period)
        prompt = 'Find the first positive bell count that lands every marker on its star.'
    add('clock', title, q, s, hint, insight, 'Track repeating landings and their starting phases.', insight, level, prompt=prompt)


clock('A five-landing orbit', dict(mode='choose_jump', positions=10, start=0, jump_min=1, jump_max=9, required_first_return=5),
      'Five landings on ten places means visiting half the ring. More than one jump can work.',
      'Different generators can have the same order. A return after five bells must be the first return.', 'medium')
def clocks(*rows):
    return dict(mode='choose_first_activation_count', clocks=[dict(zip(['positions','jump','start','target'], row)) for row in rows])
clock('The star just behind', clocks((12,5,9,4)), 'Find a jump that undoes +5 on this ring. How does that help reach a star five places behind?',
      'A nearby star can occur late in the orbit; spatial distance and number of activations differ.', 'medium')
clock('Reduced gears', clocks((12,4,1,9),(8,2,1,3)), 'List the bells that reach each star, using periods three and four.',
      'Shared factors shorten the orbits. Synchronize orbit periods rather than the printed ring sizes.')
clock('Meet after different laps', clocks((10,4,2,0),(12,3,1,10)), 'One star is reached on bells 2, 7, 12; compare that list with the other clock.',
      'Neither marker starts on its star. Two phase conditions must hold at the same positive time.')
clock('Three clocks together', clocks((6,2,1,3),(8,2,0,4),(5,1,4,1)), 'Match the first two clocks, then test those meeting bells on the third.',
      'A pairwise meeting need not solve three clocks. Filter one repeating set of meetings by the third orbit.')
clock('Three different gears', clocks((12,8,1,9),(10,6,3,7),(8,6,1,3)), 'The three orbit lengths are 3, 5, and 4. Each star has a different phase within its orbit.',
      'Three non-unit jumps require reducing each orbit and coordinating its phase; ring-size LCM alone gives the wrong first hit.')


def billiard(title, q, hint, insight, level='hard'):
    mode=q['mode']
    if mode=='predict':
        w,h,a,b=q['width'],q['height'],q['rise'],q['run']; s={}
    elif mode=='choose_width':
        h,a,b=q['height'],q['rise'],q['run']
        answers=[w for w in range(q['width_min'],q['width_max']+1) if trace(w,h,a,b)[:2]==(q['target_corner'],q['target_bounces'])]
        w=answers[0];s=dict(width=w,all_valid_widths=answers)
    else:
        w,h=q['width'],q['height']
        answers=[[a,b] for a in range(q['component_min'],q['component_max']+1) for b in range(q['component_min'],q['component_max']+1)
                 if trace(w,h,a,b)[:2]==(q['target_corner'],q['target_bounces'])]
        a,b=answers[0];s=dict(rise=a,run=b,all_valid_directions=answers)
    corner,bounces,path=trace(w,h,a,b)
    s.update(corner=corner,bounces=bounces,path=serialize_path(path))
    add('billiard',title,q,s,hint,insight,'Use reflected copies, room counts, and the direction arrow.',insight,level,
        prompt='Predict the first corner and bounce count.' if mode=='predict' else f'Reach {q["target_corner"]} first after exactly {q["target_bounces"]} bounces.')


billiard('A steeper launch',dict(mode='predict',width=4,height=3,rise=2,run=1),
         'In reflected rooms, the ray rises two units for every unit right. Find its first intersection of both wall grids.',
         'Non-unit slope changes the first simultaneous wall crossing; reducing room width and height alone is insufficient.','medium')
billiard('Design the opposite side',dict(mode='choose_width',height=6,width_min=1,width_max=12,rise=1,run=1,target_corner='bottom-right',target_bounces=3),
         'Three bounces means five whole room crossings in all. Bottom-right needs an odd horizontal count and an even vertical count.',
         'The corner and bounce count together determine reduced room proportions.','medium')
billiard('Several correct arrows',dict(mode='choose_direction',width=2,height=3,component_min=1,component_max=10,target_corner='top-right',target_bounces=6),
         'Look for coprime odd room counts adding to eight, then convert rooms into actual units.',
         'Different reduced slopes can satisfy the same corner and bounce target; every bounded valid direction is accepted.')
billiard('Change the room, keep the arrow',dict(mode='choose_width',height=8,width_min=1,width_max=12,rise=3,run=2,target_corner='top-left',target_bounces=5),
         'Top-left needs an even number of widths and an odd number of heights; their sum must be seven.',
         'Inverse room design must combine fixed slope, reduced crossing counts, parity, and the first-corner condition.')
billiard('Reject an early corner',dict(mode='choose_direction',width=4,height=3,component_min=1,component_max=12,target_corner='top-right',target_bounces=8),
         'Five widths and five heights share a factor and reach a corner too early. Try another pair adding to ten.',
         'Unreduced crossing counts can fit the endpoint but fail the first-corner requirement.')
billiard('Nine bounces, one aim',dict(mode='choose_direction',width=3,height=4,component_min=1,component_max=12,target_corner='bottom-right',target_bounces=9),
         'Try five widths and six heights. Convert those distances to an arrow, then reduce it.',
         'A bounded inverse problem joins parity, coprimality and aspect ratio; guessing the same slope as a unit square fails.')


def network(kind,title,vertices,edges,positions,hint,insight,level='hard',**params):
    q=dict(vertices=list(vertices),edges=[list(e) if len(e)==3 else [*e,1] for e in edges],positions=positions,**params)
    instance=dict(parameters=q)
    if kind=='route':
        cost,route=optimal_route(instance);q['target_cost']=cost
        s=dict(route=route,cost=cost,base_cost=sum(e[2] for e in q['edges']),extra_cost=cost-sum(e[2] for e in q['edges']),
               odd_vertices=[v for v in vertices if sum(v in e[:2] for e in q['edges'])%2])
        prompt='Walk every road exactly once.' if q['mode']=='each_edge_once' else f'Cover every road and return to {q["start"]} with total distance {cost}.'
    else:
        _,_,adj=graph(instance)
        k=next(k for k in range(1,5) if can_color(vertices,adj,k))
        q['palette_size']=k;s=dict(colors=can_color(vertices,adj,k),minimum_colors=k)
        prompt=f'Color every lantern using {k} colors so linked pairs differ.'
    return add(kind,title,q,s,hint,insight,'Track connections and revise a plan; line crossings are not junctions.',insight,level,prompt=prompt)


def ring(names,r=39,center=(50,50)):
    return {v:[round(center[0]+r*math.sin(i*2*math.pi/len(names)),2),round(center[1]-r*math.cos(i*2*math.pi/len(names)),2)] for i,v in enumerate(names)}
def cycle(names): return [(v,names[(i+1)%len(names)]) for i,v in enumerate(names)]
prism_edges=cycle('ABC')+cycle('DEF')+list(zip('ABC','DEF'))
prism_xy=dict(A=[50,10],B=[10,85],C=[90,85],D=[50,40],E=[32,66],F=[68,66])
network('route','Choose the house endpoints','ABCDE',cycle('ABCD')+[('D','E'),('E','C')],dict(A=[12,82],B=[88,82],C=[88,42],D=[12,42],E=[50,10]),
        'Only two junctions have an odd number of roads. Start at one of them.',
        'An Euler trail can revisit junctions while using each road once; the endpoints are forced by degree parity.','medium',
        mode='each_edge_once',start=None,closed=False,construction='A square with a triangular roof.')
network('route','Three loops to splice','ABCDEFG',cycle('ABC')+cycle('CDE')+cycle('EFG'),
        dict(A=[10,20],B=[10,80],C=[35,50],D=[50,12],E=[65,50],F=[90,20],G=[90,80]),
        'At C and E, visit the next loop before closing the one that brought you there.',
        'Returning home early can strand a whole loop; splice all three cycles into one closed walk.','medium',
        mode='each_edge_once',start='A',closed=True,construction='Three triangles in a chain, sharing one vertex at a time.')
network('route','Repair six odd junctions','ABCDEF',prism_edges,prism_xy,
        'All six junctions need one extra arrival or departure. Plan three repeated roads that touch each junction once.',
        'Six odd vertices require at least three extra crossings; a matching attains the bound on this prism.',
        mode='shortest_closed_cover',start='A',closed=True,construction='Triangular prism with unit roads.')
families['route']['instances'][6]['provenance'] = 'App adaptation of the house graph and Euler-trail task in Week 10 middle/facilitator sources. The graph is borrowed; app interaction and hint are newly written.'
families['route']['instances'][8]['provenance'] = 'App adaptation of the six-odd-vertex triangular-prism construction in Week 10 upper/facilitator sources. The graph and three-repeat bound are borrowed; the concrete interactive route task is new to the app.'
grid_edges=[(row[i],row[i+1]) for row in ['ABC','DEF','GHI'] for i in range(2)]+[(a,b) for a,b in zip('ABCDEF','DEFGHI')]
network('route','Pair through the grid','ABCDEFGHI',grid_edges,{v:[12+38*(i%3),12+38*(i//3)] for i,v in enumerate('ABCDEFGHI')},
        'The four side-middle junctions have odd degree. Compare the two-road paths that can pair them.',
        'Repeated connections can be paths through even junctions, not just roads between odd junctions.',
        mode='shortest_closed_cover',start='A',closed=True,construction='Complete 3 by 3 nearest-neighbor square grid.')
network('route','The shorter detour','ABCD',[('A','B',7),('A','C',1),('C','B',2),('A','D',2),('D','B',2)],
        dict(A=[12,50],B=[88,50],C=[50,12],D=[50,88]),
        'You must cross the long direct road once. For the extra trip between A and B, compare whole paths.',
        'The shortest parity repair can use two roads even when a direct road exists. Required coverage and cheapest repeats are different choices.',
        mode='shortest_closed_cover',start='A',closed=True,construction='A theta graph with three differently weighted A–B paths.')
network('route','Pair all six economically','ABCDEF',[(a,b,w) for (a,b),w in zip(prism_edges,[1,3,3,3,3,1,2,4,2])],prism_xy,
        'Compare complete pairings of all six odd junctions; the cheapest single road does not choose the other two pairs for you.',
        'Weighted six-vertex matching combines parity with shortest-path costs; an optimal augmentation must be planned globally.',
        mode='shortest_closed_cover',start='A',closed=True,construction='Weighted triangular prism; no roads removed.')

cube_edges=cycle('ABCD')+cycle('EFGH')+list(zip('ABCD','EFGH'))
network('color','Two squares, one coloring','ABCDEFGH',cube_edges,
        dict(A=[10,10],B=[90,10],C=[90,90],D=[10,90],E=[32,32],F=[68,32],G=[68,68],H=[32,68]),
        'Alternate around each square, then check the four joining links.',
        'Two even cycles must use compatible phases across their matching links.','medium',construction='Cube graph: two 4-cycles joined by matching spokes.')
network('color','Join two triangles','ABCDEF',prism_edges,prism_xy,
        'Each triangle uses all three colors. Rotate the second triangle’s colors to avoid matching across a spoke.',
        'Color names may be permuted on one component, but the connecting links constrain that permutation.','medium',construction='Triangular prism.')
network('color','Three pairs share colors','ABCDEF',[(a,b) for a,b in combinations('ABCDEF',2) if a+b not in ['AB','CD','EF']],ring('ACEBDF'),
        'Which pairs have no link? Can those pairs share the three colors?',
        'With three colors on the octahedral graph, each nonadjacent opposite pair must share a color.',construction='Complete tripartite graph K2,2,2 (octahedral graph).')
def square_cycle(n):
    vertices=[str(i+1) for i in range(n)]
    return vertices,[(vertices[i],vertices[j]) for i in range(n) for j in range(i+1,n) if min(j-i,n-j+i)<=2]
v,e=square_cycle(7)
network('color','Close a crowded ring',v,e,ring(v),
        'Every three consecutive dots need three different colors. Save room for the links that cross the closing seam.',
        'A three-color repeating pattern clashes when wrapped around seven positions; a fourth color must be placed to satisfy both seam links.',construction='Square of the 7-cycle: circular distances 1 and 2 are linked.')
v=list('ABCDEFG');cycle_pairs={frozenset(e) for e in cycle(v)}
network('color','Neighbors may share',v,[e for e in combinations(v,2) if frozenset(e) not in cycle_pairs],ring(v),
        'Only neighboring positions on the ring are unlinked. Pair those positions when sharing a color.',
        'Independent sets are small and must be chosen together. Coloring the complement of an odd cycle becomes a covering by neighboring pairs and a singleton.',construction='Complement of the 7-cycle: all pairs except ring neighbors are linked.')
v=list('ABCDEabcde')+['X'];e=cycle('ABCDE')
for a,b in cycle('ABCDE'): e.extend([(a,b.lower()),(b,a.lower())])
e.extend((u,'X') for u in 'abcde')
network('color','A fourth color without a triangle',v,e,{**ring('ABCDE',42),**ring('abcde',23),'X':[50,50]},
        'The center links to every lowercase dot. Try sharing its color with selected uppercase dots, then coordinate both rings.',
        'Copying each cycle vertex’s neighbors and adding a common neighbor forces a fourth color even though there is no triangle. The complete graph is small enough to check by search.',
        construction='Mycielski construction on the 5-cycle: uppercase cycle, independent lowercase neighbor copies, and X adjacent to all copies.')


# Fixed clue sets selected for deduction behavior, not board area. Entries 09,
# 11 and 12 are filled below from reviewed clue data, not generated at runtime.
latin_grids = json.loads((DATA / 'extended-latin-clues.json').read_text())
for index,grid in enumerate(latin_grids):
    n=len(grid);answers=latin_solutions(grid);assert len(answers)==1
    naked=singles_closure(grid,False);hidden=singles_closure(grid,True)
    facts=dict(cell_single_steps_before_stall=len(naked[1]),all_single_steps_before_stall=len(hidden[1]),all_singles_stall_unsolved=bool(hidden[2]))
    if hidden[2]:
        for (r,c),choices in hidden[2].items():
            wrong=next((v for v in sorted(choices) if v!=answers[0][r][c]),None)
            if wrong:
                facts['rejected_candidate']=[r+1,c+1,wrong];break
    stalled=bool(hidden[2]);level='hard' if stalled else 'medium'
    hint=(f'After the forced entries, try the possibilities in row {facts["rejected_candidate"][0]}, column {facts["rejected_candidate"][1]}. Keep an undo point.'
          if stalled else 'When no cell is forced, ask where a missing symbol can go in one row or column.')
    insight=('Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing.' if stalled
             else 'A sparse row can still be determined by exclusions from crossing columns; revisit rows after each deduction.')
    add('latin',['Rebuild an empty row','Find a symbol’s only home','A small board with no singles','Forced moves run out','Six symbols, no first single','A different pattern of trades'][index],
        dict(order=n,givens=grid,blank=0,coordinates='Rows and columns numbered from 1.'),dict(canonical_grid=answers[0],completion_count=1),hint,insight,
        f'Use {n} symbols; '+('follow a small case split and undo failed trials.' if stalled else 'compare exclusions across rows and columns.'),
        f'{len(naked[1])} cell singles and {len(hidden[1])} combined singles before stopping; '+('the unique completion still needs a stronger deduction or trial.' if stalled else 'singles finish the board.'),
        level,prompt=f'Complete the board with 1–{n} once in every row and column.',verification_claims=facts)


code_designs = json.loads((DATA / 'extended-code-probes.json').read_text())
for index,design in enumerate(code_designs):
    word=design['code'];n=len(word);probes=design['probes']
    transcript=[dict(guess=g,matches=score(word,g)) for g in probes]
    words=[''.join(bits) for bits in product('01',repeat=n)]
    assert [w for w in words if all(score(w,q['guess'])==q['matches'] for q in transcript)]==[word]
    add('code',design['title'],dict(length=n,alphabet=['0','1'],repetitions_allowed=True,feedback='total_exact_position_matches_only',transcript=transcript),
        dict(code=word,consistent_code_count=1),design['hint'],design['insight'],
        f'Count matches to {n}; combine overlapping groups of positions.',design['insight'],'medium' if index<2 else 'hard',
        prompt=f'Find the {n}-symbol code that fits every recorded test.',
        verification_claims=dict(no_giveaway_score=True,probes_resolve_every_code=len({tuple(score(w,g) for g in probes) for w in words})==2**n,irredundant_for_this_code=all(sum(all(score(w,q['guess'])==q['matches'] for j,q in enumerate(transcript) if j!=omit) for w in words)>1 for omit in range(len(probes)))))


nim_designs=[
    ([2,2,3,5],'Cancel the matching pair','The two piles of 2 cancel. Balance the other two piles.','Equal game components cancel even when other piles remain.','medium'),
    ([1,3,5,7,2],'A balanced group plus one','Check the 1,3,5,7 group in bundles. What remains outside that balanced group?','A whole collection can cancel even when no two piles match.','medium'),
    ([3,5,6,7],'Remove a whole component','Look at the first three piles as 4,2,1 bundles. Can one whole pile be removed to leave every column even?','A winning move can remove an entire pile while leaving three unequal piles.' ,'hard'),
    ([2,4,7,8],'Break the eight bundle','Try reducing 8 to 1, then compare the 8,4,2,1 columns.','Shrinking a pile across a power of two can switch several smaller binary columns on.','hard'),
    ([1,4,6,9,11],'Five piles, several repairs','Inspect the 1-bundle column first. Several piles can repair the imbalance.','More than one winning opening may exist; every opponent reply must still be balanced again.','hard'),
    ([3,5,8,10,12],'Rebundle across five piles','Find the highest unbalanced bundle column. Which pile can lose that bundle and repair the smaller columns too?','Choosing among multiple reductions requires coordinating all binary columns across five components.','hard')]
for piles,title,hint,insight,level in nim_designs:
    winners=[m for m in nim_moves(piles) if reduce(xor,m['after'],0)==0];assert winners
    add('nim',title,dict(piles=piles,pile_numbering='left to right, starting at 1',normal_play=True,task='win_game',allowed_removal='any positive amount from exactly one nonempty pile'),
        dict(canonical_move=winners[0],all_winning_moves=winners,nim_sum=reduce(xor,piles,0)),hint,insight,
        'Compare piles and use 8/4/2/1 bundles; continue a strategy through a full game.',insight,level,
        prompt='Win the game by taking the last pebble.',verification_claims=dict(winning_move_count=len(winners),independently_verified_by='backward recursion over all legal moves'))


jug_designs=[
    ([6,4],[0,0],True,2,'Measure in twos','Fill A and pour into B. Think of every quantity in two-unit bundles.','A common factor restricts reachable amounts; a two-unit target remains reachable.','medium'),
    ([4,3],[0,0],True,2,'Save the smaller remainder','Fill the smaller jug twice, saving the overflow from the second fill.','The receiving jug’s free space determines the remainder; starting with the largest jug is not always shortest.','medium'),
    ([9,5,4],[9,0,0],False,[3,2,4],'Leave three different amounts','First save two units in B, then fill C without disturbing that amount.','An exact distribution makes the location of each remainder matter, not just producing a target somewhere.','hard'),
    ([10,6,4],[0,6,4],False,[2,4,4],'Start with the storage full','A starts empty. Use it to free measuring space before restoring the requested amounts.','Empty storage is a resource; a sealed process can begin from a split supply rather than a full reservoir.','medium'),
    ([12,8,5],[12,0,0],False,[6,6,0],'Overlapping capacities','Try transferring between the two smaller jugs before refilling either one completely.','The smaller capacities exceed the supply together; reserve space deliberately to build and transfer a useful remainder.','hard'),
    ([12,7,5],[12,0,0],False,[6,6,0],'A one-unit measuring gap','Try to leave one unit in C. Its four empty spaces can turn a full B into three, then help build six.','Several remainders must be stored and reused to split an odd-capacity pair into two equal shares.','hard')]
for caps,start,source,target,title,hint,insight,level in jug_designs:
    q=dict(capacities=caps,start=start,source_and_drain=source)
    q['target_amount' if isinstance(target,int) else 'target_state']=target
    path=shortest_jug(q);state=tuple(start);states=[start]
    for action in path: state=dict(jug_moves(state,caps,source))[action];states.append(list(state))
    add('jug',title,q,dict(moves=[list(a) for a in path],states=states,minimum_moves=len(path)),hint,insight,
        'Track amounts and free space; pours stop only at an empty source or full destination.',insight,level,
        prompt=f'Leave exactly {target} units in either jug.' if isinstance(target,int) else 'Keep every drop and reach the displayed distribution.')


weigh_designs=[
    (6,'heavy',[],2,'Split into three pairs','Compare two pebbles against two, leaving a pair off the scale.','Each first outcome must leave no more than three candidates.','medium'),
    (3,'heavy_or_light',['R'],2,'Compare with a reference','A known normal pebble can separate heavy and light possibilities immediately.','References allow direct signed comparisons; preserve enough information to identify both the pebble and its sign.','medium'),
    (5,'heavy_or_light',[],3,'Build your own reference','Compare two against two. Pebbles eliminated by the outcome can be reused as normal references.','A tilt leaves heavy and light hypotheses on opposite pans; a balanced result creates trusted references.','hard'),
    (6,'heavy_or_light',[],3,'Move suspects between pans','After a tilt, moving a suspect to the other pan reverses the outcome predicted for that suspect.','Adaptive experiments distinguish signed hypotheses by switching some suspects and leaving others off.','hard'),
    (9,'heavy_or_light',['R'],3,'Use the trusted tenth pebble','Keep every first-outcome group small enough to separate with two more weighings. R can balance an uneven suspect count.','A reference changes the available partitions of signed hypotheses; every branch must fit the remaining information budget.','hard'),
    (12,'heavy_or_light',[],3,'Twelve pebbles, three questions','Start with four against four. After a tilt, compare a mixture of heavy-side and light-side suspects.','Twenty-four signed possibilities must be separated in three ternary experiments. A bad first partition leaves no guaranteed completion.','hard')]
for count,kind,genuine,budget,title,hint,insight,level in weigh_designs:
    coins=list('ABCDEFGHIJKL'[:count]);q=dict(coins=coins,odd_kind=kind,known_genuine=genuine,weighing_budget=budget,fixed_secret=[coins[-1],1 if kind=='heavy' else -1])
    strategy=weighing_strategy(q);assert strategy
    depth=check_tree(strategy,hypotheses(q),q,budget)
    add('weigh',title,q,dict(strategy=strategy,worst_case_weighings=depth),hint,insight,
        'Read balance outcomes; track which pebble and which direction of weight still fit.',insight,level,
        prompt=f'Find the odd pebble'+(' and whether it is heavy or light' if kind!='heavy' else '')+f' in at most {budget} weighings.')

for name,doc in docs.items():
    for f in doc['families']:
        assert len(f['instances'])==12
    (DATA/f'{name}.json').write_text(json.dumps(doc,indent=2,ensure_ascii=False)+'\n')
print('Authored 60 additional instances; each expansion family now has 12.')
