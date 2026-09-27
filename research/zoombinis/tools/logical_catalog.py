import json
from pathlib import Path
import argparse
parser = argparse.ArgumentParser(description='Create Logical Journey rule catalog from extracted disc evidence.')
parser.add_argument('--out', type=Path, required=True)
root=parser.parse_args().out
texts={r['resource_id']:r for r in map(json.loads,(root/'texts.jsonl').read_text().splitlines())}
levels=['Not So Easy','Oh So Hard','Very Hard','Very, Very Hard']
# Paraphrases of disc manual + recovered STRL help, not hypothetical generator code.
definition=[
('allergic-cliffs','Allergic Cliffs','bridge',1700,[16,36],
 'Infer a hidden Boolean rule over Zoombini traits and partition the band across two complementary bridges.',
 ['One accepted feature on one side, complement on the other.','Two values of the same attribute define the accepted set.','Two features from different attributes define the accepted set.','Three features define the accepted set.'],
 {'entities':'A Zoombini is a four-component tuple: hair, eyes, nose, feet; each component has five values.','predicate':'Bridge acceptance is complementary. Help identifies accepted feature sets; union-versus-other combination logic has not yet been proven from native code.'},
 ['Exact feature-selection distribution and rejection/resampling rules','Boolean connective at levels 3–4 and safeguards against trivial/impossible bands','Number of allowed failed crossings by difficulty']),
('stone-cold-caves','Stone Cold Caves','tunnels',1800,[17,37],
 'Combine two independent complementary classification rules to choose one of four caves.',
 ['Each opposing guardian pair tests one feature.','Two features per guardian pair.','Help repeats level 2 description; exact distinguishing rule remains unresolved.','Three features per guardian pair.'],
 {'predicate':'A cave succeeds only if both its horizontal and vertical guardian constraints are met. Each pair partitions the band complementarily.'},
 ['How independent feature sets are generated and combined','Precise distinction between levels 2 and 3','Failure budget and solvability/coverage constraints']),
('pizza-pass','Pizza Pass','pizza',1900,[18,37],
 'Identify the exact topping subsets preferred by pizza trolls using rejection and incomplete-answer feedback.',
 ['One troll; pizza toppings only.','Two trolls; pizza and sundae; their preferred toppings do not overlap.','Three trolls; pizza and sundae; each troll likes toppings the others dislike.','Three trolls, more toppings, and four rejected examples already in the pit.'],
 {'predicate':'A disliked selected topping triggers rejection; missing liked toppings produce incomplete feedback; exact preferred set succeeds.','parameter_relation':'At levels 2–4, a topping cannot be liked by more than one troll according to embedded help.'},
 ['Topping pool sizes and preferred-set size distributions','Whether every topping must belong to one troll or may be disliked by all','How seed examples are selected','Pizza-versus-sundae feedback priority']),
('captain-cajuns-ferryboat',"Captain Cajun’s Ferryboat",'ferry',2000,[21,38],
 'Seat Zoombinis in a graph so every connected pair shares at least one trait.',
 ['Adjacent seats require any common feature.','More links between seats.','More links; embedded help does not distinguish exact graph from level 2.','Still more links between seats.'],
 {'predicate':'For every seat edge (u,v), any(z[u][attribute] == z[v][attribute] for attribute in hair,eyes,nose,feet).'},
 ['Exact seat adjacency graph at every difficulty','Whether topology is fixed, selected from templates, or generated','How the game handles incoming bands with no complete arrangement']),
('titanic-tattooed-toads','Titanic Tattooed Toads','lilly',2100,[22,38],
 'Find orthogonal lily-pad paths that preserve a toad’s selected flower color, flower shape, or pad shape.',
 ['Trace matching orthogonal paths; some toads cannot cross.','Lily-pad swapping is available to construct paths.','Crabs follow matching pad shapes and can block toads; swaps can redirect crabs.','As level 3, with fewer allowed swaps.'],
 {'predicate':'A toad route uses only orthogonally adjacent pads matching its tattoo-selected property.','state':'Pad swaps alter the board; moving crabs create dynamic occupancy constraints.'},
 ['Grid layout and construction algorithm','Toad/crab counts, movement tie-breaking, and timing','Exact swap counts and solvability guarantees']),
('stone-rise','Stone Rise','slides',2200,[23,39],
 'Match named traits across stone connections and connect the resulting network to the power source.',
 ['Pair Zoombinis by the specific common attribute shown on a pad.','Shared-feature links; exact graph not identified in help.','Network connectivity to the source matters, according to manual.','Denser constraints; help suggests filling the two most-connected pads first.'],
 {'predicate':'Each labeled edge requires equality of its specified attribute; all required occupied stones must connect to the power source through valid edges.'},
 ['Exact level-specific graphs and which edges are required versus alternative','Attribute-label generation','Incoming-band conditioning and solvability checks']),
('fleens','Fleens!','fleens',2300,[25,40],
 'Deduce a hidden mapping from Zoombini traits to Fleen traits and lure the three Fleens off the beehive branch.',
 ['Same-attribute feature mapping.','Same-attribute matching, with mappings changing between puzzles.','Exactly one attribute maps to itself; the other three attribute domains are permuted.','No attribute maps to itself; all four attribute domains are mixed.'],
 {'predicate':'A Fleen corresponds to a Zoombini through per-attribute feature mappings plus a level-specific attribute permutation.','objective':'Lure three target Fleens; the retreat branch holds six Zoombinis before further guesses incur losses.'},
 ['Whether per-value maps are always bijections and how permutations are sampled','Exact level 1 fixed mappings','Target Fleen and distractor selection / guarantees']),
('hotel-dimensia','Hotel Dimensia','hotel',2400,[26,40],
 'Map one, two, or three Zoombini attributes to spatial coordinates in a hotel.',
 ['One attribute determines a room grouping.','Two attributes determine row and column.','Two dimensions with some rooms boarded up.','Three attributes determine floor, trunk/column, and doorway.'],
 {'predicate':'Zoombinis share a room only if equal on all currently selected attributes; values are mapped to the corresponding spatial dimension.'},
 ['Attribute and value-to-coordinate sampling','Boarded-room selection and incoming-band accommodation','Time/failure limits and placement capacity']),
('mudball-wall','Mudball Wall','net',2500,[27,41],
 'Infer a multidimensional mapping from mudball controls to wall coordinates and strike all targets.',
 ['Mudball color and shape identify row and column.','Two-variable pattern shifts diagonally.','Three controls: mudball color, shape, and shape color; five groups of five wall squares.','Three-variable mapping with diagonal shifts.'],
 {'predicate':'Deterministic mapping from two or three categorical controls to wall targets; level 2/4 introduce diagonal transformation.'},
 ['Exact modular equations and permutation direction','Target placement and quota generation','Attempt budgets and catapulted group counts']),
('lions-lair',"The Lion’s Lair",'caves',2600,[30,41],
 'Sort the band by a hidden categorical order, using available wall clues and corrective movement.',
 ['Group/sort on one attribute with ordering symbols visible.','One attribute with some wall clues missing.','Primary and secondary attribute ordering with symbols.','Primary/secondary ordering with all symbols removed.'],
 {'predicate':'Lexicographic ordering under selected attribute(s) and chosen orders of their five values.','feedback':'A wrongly placed Zoombini is moved to a correct position.'},
 ['How attributes and value orders are sampled','Exact missing-clue patterns at level 2','Tie handling, allowed mistakes, and placement validation']),
('mirror-machine','Mirror Machine','smoke',2700,[31,42],
 'Compose feature transformations so images reaching the central crystal are identical.',
 ['Directly match a Zoombini with its reflection plate.','Fixed filters transform traits before comparison.','Place up to three filters on each side; some use input-dependent trait transformations.','Choose filters that simultaneously work for two Zoombinis.'],
 {'predicate':'F_left(z_left) == F_right(z_right), with function composition in traversal order.','difficulty_4':'A single chosen filter arrangement must satisfy both simultaneous pairs.'},
 ['Exact set of fixed and cycling transformations','Filter inventory generation and simultaneous-pair selection','Whether solutions are constructed backwards or checked by search']),
('bubblewonder-abyss','Bubblewonder Abyss','maze2',2800,[32,42],
 'Sequence Zoombini launches through a stateful grid of trait-conditioned arrows, switches, and traps.',
 ['Trait arrows redirect matching Zoombinis; nonmatching ones continue straight; some arrows toggle after crossing.','Colored arrows can change when a Zoombini crosses a matching-colored trigger.','Same textual description as level 2; precise additional devices/layout remain unresolved.','Colored traps require corresponding triggers to release captives; an intermediate ledge has another bubble maker.'],
 {'predicate':'A conditional arrow redirects iff the Zoombini matches the displayed feature. Switches and traversal can modify future transition directions.','objective':'Choose entry points and launch order to deliver all Zoombinis through the mutable routing graph.'},
 ['Whether maps are procedural, templates, or hybrid','Exact device state transitions and trigger semantics','Level-specific layout distributions, level 2/3 difference, and solvability checks'])
]
rows=[]
for pid,name,archive,base,pages,mechanic,difficulties,rules,unknowns in definition:
 evidence=[];levels_data=[]
 for level,(label,description) in enumerate(zip(levels,difficulties),1):
  rid=base+20*(level-1);tr=texts[rid]
  src={'archive':'DATA/zoombini.mhk','tag':'STRL','resource_id':rid,'raw_path':tr['source'],'sha256':tr['source_sha256']}
  levels_data.append({'level':level,'name':label,'description':description,'evidence':src})
  evidence.append(src)
 rows.append({'id':pid,'game':'logical-journey','name':name,'mechanic':mechanic,'manual_pdf_pages':pages,'difficulty':levels_data,'rule_model':rules,
  'generator':{'status':'partial: rules and difficulty documented; exact per-puzzle native generation not yet recovered','evidence':evidence,'native_analysis_root':'../../native-analysis/logical-journey','unknowns':unknowns+['RNG call ordering, seed initialization, sampling distributions, and rejection loops for this puzzle are not reconstructed.']},
  'asset_roots':[f'resources/{archive}',f'images/{archive}',f'animations/{archive}',f'audio/{archive}','resources/zoombini','images/zoombini'],
  'asset_mapping_status':'archive mapping corroborated by decoded background and puzzle theme; shared character banks are global',
  'data_model':{'zoombini_attributes':['hair','eyes','nose','feet'],'values_per_attribute':5,'usual_party_size':16}})
(root/'puzzles.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False)+'\n')
print(len(rows),'puzzles',sum(len(r['difficulty']) for r in rows),'difficulty descriptions')
