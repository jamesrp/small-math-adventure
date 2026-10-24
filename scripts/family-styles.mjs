// Every family's stylesheet is loaded on every screen (dist/main.js,
// familyStyles), so a rule in one family's stylesheet must only reach that
// family's elements. This reads every stylesheet under dist/ and the class
// names every script there can put on an element, and reports:
//
// - a selector in a family's stylesheet that names nothing of the family's
//   own: neither its board's root, [data-mechanic-wire="<one of its
//   mechanics>"], nor a class no other family's stylesheet or script and no
//   shared stylesheet or script uses (a family's mechanic ids count as its
//   classes, since the board panel carries them). Classes inside :not() don't
//   count; a bare element selector names nothing.
// - an @keyframes name in a family's stylesheet that another stylesheet also
//   defines (the last one loaded wins everywhere).
//
// A script "uses" a class when it writes it in a class="…" attribute or in a
// string that is only class names (' on', `ps-cell hinted`, classList.add('x')).
// A name built as `s${k}` counts as every class it can make with digits or one
// or two letters after the stem (s0, s1, sA). Shared boards (graph-board,
// cases, sq-grid, …) and the app shell are shared by design: families may put
// their classes on elements, but a family rule that styles them must also
// name the family. tests/family-styles.test.mjs runs this; run it directly
// for the same report: node scripts/family-styles.mjs
import {readFile, readdir} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

// The stylesheets under dist/ that are not a family's, each shared by design.
export const SHARED_STYLESHEETS = {
  'style.css': 'the app shell',
  'play.css': 'the play screen and the cups and tiles (imported by style.css)',
  'expansion.css': 'the ten base expansion mechanics',
  'motion.css': 'the base toggle, clock and Mirror Couriers boards',
  'networks.css': 'the base route and colour boards',
  'deduction.css': 'the base Latin, code and Pebble Duel boards, with the duel piles the Proofs duel shares',
  'measurement.css': 'the base jug and balance boards',
  'caravan.css': 'the caravan shell, satchel and journal',
  'caravan-integration.css': 'the caravan around a puzzle, and the satchel playground button',
  'road.css': 'the Lantern Road',
  'boards.css': 'one board look for every puzzle',
  'graph-board.css': 'the shared graph board (docs/graph-board.md)',
  'tri-grid.css': 'the shared triangle grid (docs/tri-grid.md)',
  'sq-grid.css': 'the shared square grid (docs/sq-grid.md)',
  'bead-ring.css': 'the shared bead ring (docs/bead-ring.md)',
  'cases.css': 'the shared case-listing engine (docs/cases.md)',
  'portal-board.css': 'the shared portal board'
};

const CLASS = /^-?[_a-zA-Z][\w-]*$/;

// Style rules with their selector lists, and @keyframes names, from a stylesheet.
export function parseCss(text) {
  text = text.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ''));
  const rules = [], keyframes = [], nested = [];
  let i = 0;
  const lineAt = k => text.slice(0, k).split('\n').length;
  const skipString = q => { i++; while (i < text.length && text[i] !== q) { if (text[i] === '\\') i++; i++; } i++; };
  const prelude = () => {
    const start = i; let depth = 0;
    while (i < text.length) {
      const c = text[i];
      if (c === '"' || c === "'") { skipString(c); continue; }
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (!depth && (c === '{' || c === ';' || c === '}')) break;
      i++;
    }
    return text.slice(start, i).trim();
  };
  const skipBlock = () => {
    const start = i; let depth = 0;
    while (i < text.length) {
      const c = text[i];
      if (c === '"' || c === "'") { skipString(c); continue; }
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { i++; break; }
      i++;
    }
    return text.slice(start + 1, i - 1);
  };
  const block = at => {
    while (i < text.length) {
      while (/\s/.test(text[i] || '')) i++;
      if (i >= text.length) return;
      if (text[i] === '}') { i++; return; }
      const line = lineAt(i), head = prelude();
      if (text[i] !== '{') { i++; continue; }
      if (head.startsWith('@')) {
        const name = head.match(/^@([\w-]+)/)[1].toLowerCase();
        if (name.endsWith('keyframes')) { keyframes.push({name: head.replace(/^@[\w-]+\s*/, ''), line}); skipBlock(); }
        else if (['media', 'supports', 'container', 'layer'].includes(name)) { i++; block([...at, head]); }
        else skipBlock();
      } else {
        const body = skipBlock();
        if (body.replace(/(["'])(?:\\.|(?!\1).)*\1/g, '').includes('{')) nested.push({selector: head, line});
        rules.push({selectors: splitList(head), at, line});
      }
    }
  };
  block([]);
  return {rules, keyframes, nested};
}

export function splitList(s) {
  const out = []; let depth = 0, start = 0, quote = '';
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (quote) { if (c === '\\') k++; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && !depth) { out.push(s.slice(start, k).trim()); start = k + 1; }
  }
  out.push(s.slice(start).trim());
  return out.filter(Boolean);
}

// The mechanic ids in [data-mechanic-wire="…"] and the class names a selector
// names; with scoping true, what is inside :not() is left out.
export function selectorNames(sel, scoping = false) {
  if (scoping) {
    let out = '';
    for (let k = 0; k < sel.length; k++) {
      if (!sel.startsWith(':not(', k)) { out += sel[k]; continue; }
      let depth = 0, j = k + 4;
      for (; j < sel.length; j++) { if (sel[j] === '(') depth++; else if (sel[j] === ')' && --depth === 0) break; }
      k = j;
    }
    sel = out;
  }
  const wires = [...sel.matchAll(/\[\s*data-mechanic-wire\s*=\s*(["']?)([^"'\]\s]*)\1\s*\]/g)].map(m => m[2]);
  const classes = [...sel.replace(/\[[^\]]*\]/g, '[]').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]);
  return {wires, classes};
}

// Every string in a script: quoted strings, and template text with \0 where an
// interpolation sits. Comments and regular expressions are skipped.
export function jsStrings(src) {
  const pieces = [], n = src.length;
  let i = 0, last = '', word = '';
  const quoted = q => { let s = ''; i++; while (i < n && src[i] !== q && src[i] !== '\n') { if (src[i] === '\\') { s += src[i + 1] || ''; i += 2; continue; } s += src[i++]; } i++; pieces.push(s); };
  const template = () => {
    let s = ''; i++;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { s += src[i + 1] || ''; i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') { i += 2; s += '\0'; code('}'); continue; }
      s += src[i++];
    }
    i++; pieces.push(s);
  };
  const regexAllowed = () => !last || /[(,=:[!&|?{};+\-*%<>~^]/.test(last) || /^(return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await)$/.test(word);
  const regex = () => {
    i++; let inClass = false;
    while (i < n && src[i] !== '\n') {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '[') inClass = true; else if (c === ']') inClass = false; else if (c === '/' && !inClass) break;
      i++;
    }
    i++; while (/[a-z]/.test(src[i] || '')) i++;
  };
  function code(end) {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
      if (c === '"' || c === "'") { quoted(c); last = 'x'; word = ''; continue; }
      if (c === '`') { template(); last = 'x'; word = ''; continue; }
      if (c === '/' && regexAllowed()) { regex(); last = 'x'; word = ''; continue; }
      if (/[\w$]/.test(c)) { let w = ''; while (i < n && /[\w$]/.test(src[i])) w += src[i++]; word = w; last = 'x'; continue; }
      if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) { if (!depth && c === end) { i++; return; } depth--; }
      if (!/\s/.test(c)) { last = c; word = ''; }
      i++;
    }
  }
  code('');
  return pieces;
}

// The class names a script can put on an element, and the stems of names it
// builds (`s${k}` gives the stem "s").
export function jsClasses(src) {
  const names = new Set(), stems = new Set();
  const take = value => {
    for (const t of value.split(/\s+/)) {
      if (!t) continue;
      const parts = t.split('\0');
      if (parts.length > 1) { if (CLASS.test(parts[0])) { names.add(parts[0]); stems.add(parts[0]); } continue; }
      if (CLASS.test(t)) names.add(t);
    }
  };
  for (const s of jsStrings(src)) {
    for (const m of s.matchAll(/\bclass\s*=\s*(["'])/g)) {
      const from = m.index + m[0].length, to = s.indexOf(m[1], from);
      take(s.slice(from, to < 0 ? undefined : to));
    }
    const words = s.replace(/\0/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length && words.every(t => CLASS.test(t))) take(s);
  }
  return {names, stems};
}

const stemMakes = (stem, c) => c.startsWith(stem) && /^(\d+|[A-Za-z]{1,2})$/.test(c.slice(stem.length));

// families: [{id, mechanics, css: {name, text}, js: [{name, text}]}];
// shared: {css: [{name, text}], js: [{name, text}]}. Returns {leaks, keyframes, nested}.
export function check(families, shared) {
  const users = new Map(), stems = [];
  const use = (c, owner, where) => {
    if (!users.has(c)) users.set(c, new Map());
    const m = users.get(c); if (!m.has(owner)) m.set(owner, new Set()); m.get(owner).add(where);
  };
  const parsed = new Map();
  const styled = (owner, file) => {
    const p = parseCss(file.text); parsed.set(file, p);
    for (const r of p.rules) for (const s of r.selectors) for (const c of selectorNames(s).classes) use(c, owner, file.name);
  };
  const scripted = (owner, file) => {
    const got = jsClasses(file.text);
    for (const c of got.names) use(c, owner, file.name);
    for (const stem of got.stems) stems.push({owner, stem, where: `${file.name} (${stem}…)`});
  };
  for (const f of families) {
    styled(f.id, f.css);
    for (const file of f.js) scripted(f.id, file);
    for (const m of f.mechanics) use(m, f.id, 'its mechanic id');
  }
  for (const file of shared.css) styled('shared', file);
  for (const file of shared.js) scripted('shared', file);
  const others = (c, id) => {
    const out = new Map();
    for (const [owner, where] of users.get(c) || []) if (owner !== id) out.set(owner, [...where]);
    for (const s of stems) if (s.owner !== id && stemMakes(s.stem, c)) { if (!out.has(s.owner)) out.set(s.owner, []); out.get(s.owner).push(s.where); }
    return out;
  };
  const leaks = [], keyframes = [], nested = [];
  for (const f of families) {
    const p = parsed.get(f.css);
    for (const r of p.rules) for (const selector of r.selectors) {
      const {wires, classes} = selectorNames(selector, true);
      if (wires.some(w => f.mechanics.includes(w))) continue;
      if (classes.some(c => !others(c, f.id).size)) continue;
      leaks.push({family: f.id, file: f.css.name, line: r.line, selector, shared: [...new Set(classes)].map(c => ({name: c, users: others(c, f.id)}))});
    }
    for (const k of p.keyframes) {
      const also = [...parsed].filter(([file, q]) => file !== f.css && q.keyframes.some(x => x.name === k.name)).map(([file]) => file.name);
      if (also.length) keyframes.push({family: f.id, file: f.css.name, line: k.line, name: k.name, also});
    }
    for (const x of p.nested) nested.push({family: f.id, file: f.css.name, line: x.line, selector: x.selector});
  }
  return {leaks, keyframes, nested};
}

// The families, their stylesheets and scripts, and the shared files, from dist/.
export async function readDist(distUrl = new URL('../dist/', import.meta.url)) {
  const dist = fileURLToPath(distUrl);
  const {FAMILIES} = await import(pathToFileURL(path.join(dist, 'families.js')).href);
  const rel = file => path.relative(path.dirname(dist), file);
  const read = async file => ({name: rel(file), text: await readFile(file, 'utf8')});
  const families = [], own = new Set();
  for (const m of FAMILIES.filter(m => m.css)) {
    const css = fileURLToPath(m.css), dir = path.dirname(css);
    const js = path.basename(path.dirname(dir)) === 'families'
      ? (await readdir(dir)).filter(f => f.endsWith('.js')).map(f => path.join(dir, f))
      : [css.replace(/\.css$/, '.js')];
    [css, ...js].forEach(f => own.add(f));
    families.push({id: m.id, mechanics: Object.keys(m.mechanics || {}), css: await read(css), js: await Promise.all(js.map(read))});
  }
  const top = (await readdir(dist)).map(f => path.join(dist, f)).filter(f => !own.has(f));
  const css = top.filter(f => f.endsWith('.css')), js = top.filter(f => f.endsWith('.js') && path.basename(f) !== 'sw.js');
  return {families, shared: {css: await Promise.all(css.map(read)), js: await Promise.all(js.map(read))}, unlisted: css.map(f => path.basename(f)).filter(f => !SHARED_STYLESHEETS[f])};
}

const usersText = users => {
  const all = [...users].sort(([a], [b]) => (a === 'shared') - (b === 'shared')).map(([owner, where]) => `${owner === 'shared' ? 'shared files' : owner} (${[...new Set(where.map(w => path.basename(w)))].join(', ')})`);
  return all.length > 4 ? `${all.slice(0, 4).join(', ')} and ${all.length - 4} more` : all.join(', ');
};
export function report({leaks, keyframes, nested}) {
  const lines = [];
  for (const l of leaks) {
    const named = l.shared.length ? l.shared.map(s => `.${s.name} is also used by ${usersText(s.users)}`).join('; ') : 'it names no class';
    lines.push(`${l.file}:${l.line} ${l.selector}\n    ${named}`);
  }
  for (const k of keyframes) lines.push(`${k.file}:${k.line} @keyframes ${k.name}\n    also defined in ${k.also.map(f => path.basename(f)).join(', ')}; the last one loaded wins everywhere`);
  for (const x of nested) lines.push(`${x.file}:${x.line} ${x.selector}\n    uses CSS nesting, which this check can't read; write the nested rules out`);
  return lines.join('\n');
}
export const HOW_TO_FIX = 'Every family stylesheet loads on every screen. Start each of these selectors with the board root, [data-mechanic-wire="<mechanic>"], or with a class only this family uses (pick a class prefix no other family uses), and give @keyframes a name of the family\'s own. See docs/ADDING-A-FAMILY.md.';

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const {families, shared, unlisted} = await readDist();
  const result = check(families, shared), text = report(result);
  if (unlisted.length) console.log(`Not a family's stylesheet and not in SHARED_STYLESHEETS: ${unlisted.join(', ')}`);
  console.log(text ? `${text}\n\n${HOW_TO_FIX}` : `${families.length} family stylesheets, each scoped to its own family.`);
  if (text || unlisted.length) process.exitCode = 1;
}
