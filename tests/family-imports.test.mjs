// A family module that imports anything leading back to dist/families.js
// deadlocks the registry's top-level await: the app never starts and Node
// reports only "unsettled top-level await". This test reads the import graph
// as text, without loading the registry, so it can say which import is wrong.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const imports = url => [...readFileSync(url, 'utf8').matchAll(/^\s*(?:import|export)\s[^;]*?from\s*['"](\.[^'"]+)['"]/gm)].map(match => new URL(match[1], url));
const name = url => url.href.slice(dist.href.length);
function leadsBack(url, seen = new Set()) {
  if (url.href === new URL('families.js', dist).href) return [];
  if (seen.has(url.href)) return null;
  seen.add(url.href);
  for (const next of imports(url)) { const path = leadsBack(next, seen); if (path) return [name(next), ...path]; }
  return null;
}
const registry = new URL('families.js', dist);
const modules = [...readFileSync(registry, 'utf8').matchAll(/^\s*'(\.\/[^']+\.js)',?$/gm)].map(match => new URL(match[1], registry));
const safe = readdirSync(dist).filter(file => file.endsWith('.js') && file !== 'families.js' && file !== 'sw.js' && !leadsBack(new URL(file, dist))).sort();

test('no family module imports anything that leads back to the registry', () => {
  assert.ok(modules.length >= 2, 'the registry lists its modules');
  for (const module of modules) {
    const path = leadsBack(module);
    assert.equal(path, null, `${name(module)} imports ${path?.join(' → ')}. A family module may import only: ${safe.join(', ')}`);
  }
});
