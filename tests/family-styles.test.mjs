// Every family's stylesheet is loaded on every screen, so its rules must only
// reach its own elements. scripts/family-styles.mjs holds the rule and the
// report; docs/ADDING-A-FAMILY.md says how to keep to it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {check, readDist, report, HOW_TO_FIX, SHARED_STYLESHEETS, jsClasses, parseCss} from '../scripts/family-styles.mjs';

test('every stylesheet under dist/ is a family\'s or listed as shared by design', async () => {
  const {unlisted} = await readDist();
  assert.deepEqual(unlisted, [], `Add each to SHARED_STYLESHEETS in scripts/family-styles.mjs with what it styles, or load it as a family's css: ${unlisted.join(', ')}`);
  for (const [name, what] of Object.entries(SHARED_STYLESHEETS)) assert.ok(what, name);
});

test('no family stylesheet styles another family\'s elements', async () => {
  const {families, shared} = await readDist();
  assert.ok(families.length > 90, 'reads every family');
  const text = report(check(families, shared));
  assert.equal(text, '', `\n${text}\n\n${HOW_TO_FIX}\n`);
});

// The check itself, on small made-up families.
const family = (id, css, js = '', mechanics = [id]) => ({id, mechanics, css: {name: `${id}.css`, text: css}, js: [{name: `${id}.js`, text: js}]});
const none = {css: [], js: []};
const flagged = (families, shared = none) => check(families, shared).leaks.map(l => `${l.family} ${l.selector}`);

test('the check: two families styling one class unscoped are both reported', () => {
  const a = family('a', '.sh-puzzle{max-width:560px}', '`<div class="sh-puzzle">`');
  const b = family('b', '.sh-puzzle{width:100%}.sh-puzzle .sh-room{width:100%}', '`<div class="sh-puzzle"><i class="sh-room"></i></div>`');
  assert.deepEqual(flagged([a, b]), ['a .sh-puzzle', 'b .sh-puzzle'], 'b\'s .sh-room is its own, so that rule reaches only b');
});

test('the check: a rule under the board root or a class of its own is scoped', () => {
  const a = family('a', '[data-mechanic-wire="a"] .gl-wedge{fill:red}.ga-board .gl-wedge{stroke:red}', '`<svg class="ga-board" data-mechanic-wire="a"><path class="gl-wedge"/></svg>`');
  const b = family('b', '[data-mechanic-wire="b"] .gl-wedge{fill:blue}', '`<path class="gl-wedge">`');
  assert.deepEqual(flagged([a, b]), []);
  assert.deepEqual(flagged([family('c', '[data-mechanic-wire="b"] .gl-wedge{fill:none}'), b]), ['c [data-mechanic-wire="b"] .gl-wedge'], 'another family\'s root does not count');
});

test('the check: a class that only another family\'s markup uses, a shared board class, a bare element and :not() are reported', () => {
  const portal = {css: [{name: 'portal-board.css', text: '.pb-pad{display:grid}'}], js: [{name: 'portal-board.js', text: '`<div class="pb-pad">`'}]};
  const primes = family('primes', '.pb-pad{display:flex}svg{overflow:visible}:not(.pm-bag) .on{color:red}.pm-bag:not(.on){color:blue}', '`<div class="pm-bag">`');
  const stars = family('stars', '.c0{stroke:green}', '`<line class="star-line c${k}"/>`');
  const pictures = family('pictures', '.pic-cell{fill:none}', '`<rect class="pic-cell c${n}"/>` ; el.classList.add(\'on\')');
  assert.deepEqual(flagged([primes, stars, pictures], portal), ['primes .pb-pad', 'primes svg', 'primes :not(.pm-bag) .on', 'stars .c0']);
});

test('the check: a mechanic id is a family class, since the board panel carries it', () => {
  assert.deepEqual(flagged([family('a', '.ring{stroke:red}', ''), family('b', '.b-board{}', '', ['ring'])]), ['a .ring']);
});

test('the check: a keyframes name two stylesheets define is reported', () => {
  const motion = {css: [{name: 'motion.css', text: '@keyframes cr-fold{to{opacity:0}}'}], js: []};
  const {keyframes} = check([family('corners', '[data-mechanic-wire="corners"] .cr-x{animation:cr-fold 1s}@keyframes cr-fold{from{opacity:.25}}')], motion);
  assert.deepEqual(keyframes.map(k => [k.family, k.name, k.also]), [['corners', 'cr-fold', ['motion.css']]]);
});

test('the scanners read media queries, :is(), strings and template classes', () => {
  const {rules, keyframes} = parseCss('/* a { */\n@media (max-width:400px){.a,.b:is(.c,.d){x:"}"}}\n@keyframes k{from{}}\n.e::after{content:"{"}');
  assert.deepEqual(rules.map(r => [r.selectors, r.at.length, r.line]), [[['.a', '.b:is(.c,.d)'], 1, 2], [['.e::after'], 0, 4]]);
  assert.deepEqual(keyframes.map(k => k.name), ['k']);
  const {names, stems} = jsClasses("const re = /\"'/g; const cls = ['ps-cell', on ? 'on' : '']; return `<b class=\"tt-goal${x ? ' none' : ''} deck-${d}\">Tap here.</b>`; node.classList.toggle('lit', y);");
  assert.deepEqual([...names].sort(), ['deck-', 'lit', 'none', 'on', 'ps-cell', 'tt-goal']);
  assert.deepEqual([...stems].sort(), ['deck-', 'tt-goal']);
});
