// The app's merged puzzle pack, read from disk the way dist/main.js fetches
// it: the base pack, then each family module's pack (dist/families.js).
import {readFile} from 'node:fs/promises';
import {FAMILIES, mergePacks, newFamilies} from '../dist/families.js';

const read = async url => JSON.parse(await readFile(url, 'utf8'));
export async function loadPack() {
  const base = await read(new URL('../dist/puzzles.json', import.meta.url));
  return mergePacks(base, await Promise.all(FAMILIES.filter(m => m.pack).map(m => read(new URL(m.pack)))));
}
export {FAMILIES, newFamilies};
