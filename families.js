// The family seam: every puzzle module added after the twelve base mechanics,
// oldest first, one line each. A module's default export describes it (see
// docs/ADDING-A-FAMILY.md); the app, the satchel, the build and the tests read
// everything else from there. A module must not import anything that leads
// back to this file (engine.js, ui.js, tile-controls.js and others), or the
// app never starts; tests/family-imports.test.mjs names what is safe.
const paths = [
  './proofs.js',
  './families/chips/chips.js',
  './families/flow/flow.js',
  './families/sorting/sorting.js',
  './families/pictures/pictures.js',
  './families/menus/menus.js',
  './families/stars/stars.js',
  './families/codebooks/codebooks.js',
  './families/firstfit/firstfit.js',
  './families/mst/mst.js',
  './families/mixup/mixup.js',
  './families/beads/beads.js',
  './families/rhombus/rhombus.js',
  './families/detours/detours.js',
  './families/braces/braces.js',
  './families/kits/kits.js',
  './families/orchard/orchard.js',
  './families/tank/tank.js',
  './families/shuffles/shuffles.js',
  './families/rainbow/rainbow.js',
  './families/bags/bags.js',
  './families/fences/fences.js',
  './families/paint/paint.js',
  './families/secrets/secrets.js',
  './families/cuts/cuts.js',
  './families/hills/hills.js',
  './families/copies/copies.js',
  './families/sides/sides.js',
  './families/blocks/blocks.js',
  './families/decks/decks.js',
  './families/offers/offers.js',
  './families/machines/machines.js',
  './families/lamplighter/lamplighter.js',
  './families/robot/robot.js',
  './families/elevators/elevators.js',
  './families/meeting/meeting.js',
  './families/portals/portals.js',
  './families/gapflood/gapflood.js',
  './families/matching/matching.js',
  './families/ends/ends.js',
  './families/towers/towers.js',
  './families/knots/knots.js',
  './families/cardmachines/cardmachines.js',
  './families/geoboard/geoboard.js',
  './families/squares/squares.js',
  './families/covers/covers.js',
  './families/sites/sites.js',
  './families/glued/glued.js',
  './families/shields/shields.js',
  './families/strands/strands.js',
  './families/averages/averages.js',
  './families/radon/radon.js',
  './families/ranges/ranges.js',
  './families/diffs/diffs.js',
  './families/sumsets/sumsets.js',
  './families/trios/trios.js',
  './families/nests/nests.js',
  './families/joins/joins.js',
  './families/strings/strings.js',
  './families/shares/shares.js',
  './families/stairs/stairs.js',
  './families/tropical/tropical.js',
  './families/shrink/shrink.js',
  './families/creases/creases.js',
  './families/aims/aims.js',
  './families/folds/folds.js',
  './families/holes/holes.js',
  './families/mobius/mobius.js',
  './families/islands/islands.js',
  './families/octagon/octagon.js',
  './families/rookrace/rookrace.js',
  './families/width/width.js',
  './families/globe/globe.js',
  './families/friezes/friezes.js',
  './families/corners/corners.js',
  './families/tetra/tetra.js',
  './families/buckets/buckets.js',
  './families/taquin/taquin.js',
  './families/hackenbush/hackenbush.js',
  './families/piles/piles.js',
  './families/cops/cops.js',
  './families/seeds/seeds.js',
  './families/loops/loops.js',
  './families/catches/catches.js',
  './families/primes/primes.js',
  './families/reshape/reshape.js',
  './families/knowledge/knowledge.js',
  './families/totals/totals.js',
  './families/rotor/rotor.js',
  './families/tent/tent.js',
  './families/pantograph/pantograph.js',
  './families/leftovers/leftovers.js',
  './families/votes/votes.js',
  './families/calibrate/calibrate.js'
];

export const FAMILIES = await Promise.all(paths.map(path => import(path).then(module => module.default)));

// The satchel families the modules add, newest first.
export const newFamilies = () => FAMILIES.filter(m => m.family).map(m => m.family).reverse();

// The areas of mathematics that Grown-ups groups the families' notes under. A
// module's family names one (`family.area`); the twelve base mechanics have
// theirs in dist/ui.js. A family without one is listed under More. (The
// Puzzles library has its own regions, REGIONS below.)
export const AREAS = {
  games: 'Games and strategy',
  logic: 'Logic and information',
  networks: 'Maps and networks',
  numbers: 'Numbers and measuring',
  patterns: 'Orders and patterns',
  shapes: 'Tilings and shapes',
  geometry: 'Geometry and symmetry',
  surfaces: 'Surfaces and knots',
  chance: 'Chance and fairness',
};

// The regions of the Puzzles library, in the order it shows them, named in a
// child's words. The keys are the worksheet catalog's eight areas
// (catalog/concepts.toml in the worksheets repository), which decide where a
// family goes: a module's family names one (`family.region`); the twelve base
// mechanics have theirs in dist/caravan-ui.js. docs/library.md lists every
// family's region and why.
export const REGIONS = {
  games: 'Games and choices',
  networks: 'Maps and networks',
  shape: 'Shapes and spaces',
  symmetry: 'Patterns and symmetry',
  number: 'Numbers',
  counting: 'Counting and arranging',
  logic: 'Codes and logic',
  chance: 'Chance and machines',
};

// The app's single pack: the base pack, then each module's pack in registry order.
export function mergePacks(base, packs) {
  return {
    ...base,
    puzzles: [...base.puzzles, ...packs.flatMap(pack => pack.puzzles)],
    sources: [...base.sources, ...packs.flatMap(pack => pack.sources || [])],
    families: [...(base.families || []), ...packs.flatMap(pack => pack.families || [])]
  };
}
