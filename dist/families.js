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
  './families/blocks/blocks.js'
];

export const FAMILIES = await Promise.all(paths.map(path => import(path).then(module => module.default)));

// The satchel families the modules add, newest first. The newest starts open.
export const newFamilies = () => FAMILIES.filter(m => m.family).map(m => m.family).reverse();

// The app's single pack: the base pack, then each module's pack in registry order.
export function mergePacks(base, packs) {
  return {
    ...base,
    puzzles: [...base.puzzles, ...packs.flatMap(pack => pack.puzzles)],
    sources: [...base.sources, ...packs.flatMap(pack => pack.sources || [])],
    families: [...(base.families || []), ...packs.flatMap(pack => pack.families || [])]
  };
}
