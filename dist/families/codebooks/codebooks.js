// Codebooks (worksheet Week 18), a group inside Signal Lanterns. A key gives
// each picture a row of lit and dark lanterns. A changer may turn over at most
// t lanterns, unseen, and the receiver sees only the result. The receiver can
// always tell the picture exactly when every two rows differ in at least
// 2t + 1 places: then no row can come from two pictures. The child designs
// keys and the app plays the changer, or the child plays the changer.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const index = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const isRow = (row, n) => typeof row === 'string' && row.length === n && /^[01]*$/.test(row);
const lit = row => [...row].filter(c => c === '1').length;
const flip = (row, i) => row.slice(0, i) + (row[i] === '1' ? '0' : '1') + row.slice(i + 1);
export const MAX_LENGTH = 6;

export function distance(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}
const differ = (a, b) => [...a].flatMap((c, i) => c === b[i] ? [] : [i]);
export const words = n => Array.from({length: 2 ** n}, (_, i) => i.toString(2).padStart(n, '0'));
const gapOf = q => 2 * q.flips + 1;
const fits = (q, row) => q.weight == null || lit(row) === q.weight;

// The first two pictures the changer can confuse, and a row both can produce:
// walk from the first row toward the second, turning over at most t lanterns.
export function fooling(rows, t) {
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const d = differ(rows[i], rows[j]);
    if (d.length > 2 * t) continue;
    const fromA = d.slice(0, Math.min(t, d.length)), fromB = d.slice(fromA.length);
    return {a: i, b: j, row: fromA.reduce(flip, rows[i]), fromA, fromB};
  }
  return null;
}
export const works = (rows, t) => !fooling(rows, t);
// The pictures whose row the changer could turn into this one.
export const producers = (rows, row, t) => rows.flatMap((r, p) => distance(r, row) <= t ? [p] : []);

// Completes a key around the rows to keep: the first rows in counting order
// that keep every two at least `gap` apart. A node budget keeps hints quick;
// running out counts as no completion.
function complete(n, need, keep, gap, weight, budget = 200000) {
  const pool = words(n).filter(w => weight == null || lit(w) === weight), out = [...keep];
  let nodes = 0;
  const go = start => {
    if (out.length === need) return true;
    if (++nodes > budget) return false;
    for (let i = start; i < pool.length; i++) {
      if (!out.every(r => distance(r, pool[i]) >= gap)) continue;
      out.push(pool[i]);
      if (go(i + 1)) return true;
      out.pop();
    }
    return false;
  };
  return go(0) ? out : null;
}
const possibleMemo = new Map();
// Whether `pictures` rows of length n can keep every two `gap` apart (exhaustive).
export function possible(n, pictures, gap, weight = null) {
  const key = `${n}/${pictures}/${gap}/${weight}`;
  if (!possibleMemo.has(key)) possibleMemo.set(key, Boolean(complete(n, pictures, [], gap, weight, Infinity)));
  return possibleMemo.get(key);
}
export const fewest = q => q.lengths.find(n => possible(n, q.pictures, gapOf(q), q.weight));

// ---------------------------------------------------------------- design
// Board: {length, rows, checked, tried, found, claims, wrong}. `found` keeps a
// working key for each length where the child checked one; `claims` the
// lengths the child said cannot work (accepted only when true); `wrong` the
// length of a refused claim, shown until the next action.
const zeros = (n, m) => Array(m).fill('0'.repeat(n));
function designFresh(q) {
  return {length: q.lengths[0], rows: zeros(q.lengths[0], q.pictures), checked: false, tried: [], found: {}, claims: [], wrong: null};
}
function designValid(q, b) {
  if (!q.lengths.includes(b.length) || !Array.isArray(b.rows) || b.rows.length !== q.pictures || !b.rows.every(r => isRow(r, b.length))) return false;
  if (typeof b.checked !== 'boolean' || !Array.isArray(b.tried) || !Array.isArray(b.claims) || !object(b.found)) return false;
  if (!b.tried.every(n => q.lengths.includes(n)) || new Set(b.tried).size !== b.tried.length) return false;
  if (b.checked && !b.tried.includes(b.length)) return false;
  for (const [key, rows] of Object.entries(b.found)) {
    const n = Number(key);
    if (!q.lengths.includes(n) || !b.tried.includes(n) || !Array.isArray(rows) || rows.length !== q.pictures || !rows.every(r => isRow(r, n) && fits(q, r)) || !works(rows, q.flips)) return false;
  }
  if (!b.claims.every(n => b.tried.includes(n) && !possible(n, q.pictures, gapOf(q), q.weight))) return false;
  if (q.goal === 'key' && b.claims.length) return false;
  return b.wrong === null || (b.tried.includes(b.wrong) && possible(b.wrong, q.pictures, gapOf(q), q.weight) && !b.claims.includes(b.wrong));
}
function designSolved(q, b) {
  const n = q.lengths[0];
  if (q.goal === 'key') return Boolean(b.found[n]);
  if (q.goal === 'decide') return possible(n, q.pictures, gapOf(q), q.weight) ? Boolean(b.found[n]) : b.claims.includes(n);
  const least = fewest(q);
  return Boolean(b.found[least]) && (least === q.lengths[0] || b.claims.includes(least - 1));
}
function designMove(q, b, action) {
  const base = {...b, checked: false, wrong: null};
  if (action.type === 'lantern') {
    const p = index(action.picture), i = index(action.lantern);
    if (!integer(p) || p < 0 || p >= q.pictures || !integer(i) || i < 0 || i >= b.length) return null;
    return {...base, rows: b.rows.map((r, k) => k === p ? flip(r, i) : r)};
  }
  if (action.type === 'length') {
    const n = index(action.length);
    if (q.goal !== 'fewest' || !q.lengths.includes(n) || n === b.length) return null;
    return {...base, length: n, rows: b.found[n] ? [...b.found[n]] : zeros(n, q.pictures)};
  }
  if (action.type === 'check') {
    if (b.checked) return null;
    const tried = b.tried.includes(b.length) ? b.tried : [...b.tried, b.length].sort((x, y) => x - y);
    const good = b.rows.every(r => fits(q, r)) && works(b.rows, q.flips);
    return {...base, checked: true, tried, found: good ? {...b.found, [b.length]: [...b.rows]} : b.found};
  }
  if (action.type === 'claim') {
    if (q.goal === 'key' || !b.tried.includes(b.length) || b.claims.includes(b.length) || b.wrong === b.length) return null;
    if (possible(b.length, q.pictures, gapOf(q), q.weight)) return {...b, wrong: b.length};
    return {...b, wrong: null, claims: [...b.claims, b.length].sort((x, y) => x - y)};
  }
  return null;
}
// The next lantern toward a working key that keeps as many of the child's
// rows as it can (rows that clash with earlier ones are replaced).
function designTarget(q, b) {
  const gap = gapOf(q), keep = [];
  b.rows.forEach((r, p) => { if (fits(q, r) && keep.every(k => distance(b.rows[k], r) >= gap)) keep.push(p); });
  for (let size = keep.length; size >= 0; size--) {
    const kept = keep.slice(0, size), others = b.rows.map((_, p) => p).filter(p => !kept.includes(p));
    const done = complete(b.length, q.pictures, kept.map(p => b.rows[p]), gap, q.weight);
    if (!done) continue;
    const rows = [...b.rows];
    kept.forEach((p, k) => { rows[p] = done[k]; });
    others.forEach((p, k) => { rows[p] = done[kept.length + k]; });
    return rows;
  }
  return null;
}
function designHint(p, q, b) {
  if (q.goal !== 'key') return {type: 'note'};
  if (b.found[b.length]) return {type: 'done'};
  const target = designTarget(q, b);
  const pic = target.findIndex((r, k) => r !== b.rows[k]);
  if (pic < 0) return {type: 'move', action: {type: 'check'}, text: 'Check this key.'};
  const i = differ(b.rows[pic], target[pic])[0];
  return {type: 'move', action: {type: 'lantern', picture: pic, lantern: i}, text: `Turn ${b.rows[pic][i] === '1' ? 'off' : 'on'} lantern ${i + 1} in the ${SHAPES[pic].name}’s row.`};
}

// ---------------------------------------------------------------- changer
// Board: {round, row, sent, cant, won}. The child builds a row on the
// receiver's side and sends it, or says the key cannot be fooled.
function changerFresh(q) { return {round: 0, row: '0'.repeat(q.keys[0][0].length), sent: false, tried: false, cant: null, won: false}; }
const keyOf = (q, b) => q.keys[b.round];
function changerValid(q, b) {
  if (!integer(b.round) || b.round < 0 || b.round >= q.keys.length) return false;
  const key = keyOf(q, b);
  if (!isRow(b.row, key[0].length) || typeof b.sent !== 'boolean' || typeof b.tried !== 'boolean' || typeof b.won !== 'boolean' || ![null, 'yes', 'no'].includes(b.cant)) return false;
  if (b.sent && !b.tried) return false;
  const safe = works(key, q.flips);
  if (b.cant === 'yes' && !(safe && b.tried && b.won)) return false;
  if (b.cant === 'no' && (safe || b.won)) return false;
  if (b.won && b.cant !== 'yes' && !(b.sent && producers(key, b.row, q.flips).length > 1)) return false;
  return true;
}
const changerSolved = (q, b) => b.won && b.round === q.keys.length - 1;
function changerMove(q, b, action) {
  const key = keyOf(q, b);
  if (action.type === 'next') return b.won && b.round < q.keys.length - 1 ? {round: b.round + 1, row: '0'.repeat(q.keys[b.round + 1][0].length), sent: false, tried: false, cant: null, won: false} : null;
  if (b.won) return null;
  if (action.type === 'lantern') {
    const i = index(action.lantern);
    if (!integer(i) || i < 0 || i >= b.row.length) return null;
    return {...b, row: flip(b.row, i), sent: false, cant: null};
  }
  if (action.type === 'send') {
    if (b.sent) return null;
    return {...b, sent: true, tried: true, cant: null, won: producers(key, b.row, q.flips).length > 1};
  }
  if (action.type === 'cant') {
    if (!b.tried || b.cant) return null;
    return works(key, q.flips) ? {...b, sent: false, cant: 'yes', won: true} : {...b, sent: false, cant: 'no'};
  }
  return null;
}
function changerHint(q, b) {
  const key = keyOf(q, b);
  if (b.won) return {type: 'move', action: {type: 'next'}, text: 'On to the next key.'};
  const fool = fooling(key, q.flips);
  if (!fool) {
    if (!b.tried) return {type: 'move', action: {type: 'send'}, text: 'Send a row and see what the receiver says.'};
    const d = Math.min(...key.flatMap((r, i) => key.slice(i + 1).map(s => distance(r, s))));
    return {type: 'move', action: {type: 'cant'}, text: `Every two rows differ in at least ${d} places. Can ${q.flips === 1 ? 'one change' : 'two changes'} from each meet in the middle?`};
  }
  const d = differ(b.row, fool.row);
  if (!d.length || producers(key, b.row, q.flips).length > 1) return {type: 'move', action: {type: 'send'}, text: 'Send this row.'};
  const [x, y] = [SHAPES[fool.a].name, SHAPES[fool.b].name], gap = distance(key[fool.a], key[fool.b]);
  const text = !gap ? `The ${x} and the ${y} have the same row.` : gap === 1 ? `The ${x} and the ${y} differ in only 1 place: one change turns one into the other.` : `The ${x} and the ${y} differ in only ${gap} places. Build a row between them.`;
  return {type: 'move', action: {type: 'lantern', lantern: d[0]}, text};
}

// ---------------------------------------------------------------- partners
// Board: {round, row, list, checked}. One picture's row is given; the child
// collects every row the other picture could use, then checks once.
function partnersFresh(q) { return {round: 0, row: '0'.repeat(q.rounds[0].length), list: [], checked: false}; }
export const partnersOf = (given, t) => words(given.length).filter(w => distance(w, given) >= 2 * t + 1);
function partnersValid(q, b) {
  if (!integer(b.round) || b.round < 0 || b.round >= q.rounds.length || typeof b.checked !== 'boolean' || !Array.isArray(b.list)) return false;
  const n = q.rounds[b.round].length;
  return isRow(b.row, n) && b.list.every(r => isRow(r, n)) && new Set(b.list).size === b.list.length && b.list.length <= 2 ** n && (!b.checked || b.list.length > 0);
}
const sameSet = (a, b) => a.length === b.length && a.every(v => b.includes(v));
const partnersSolved = (q, b) => b.checked && sameSet(b.list, partnersOf(q.rounds[b.round], q.flips));
function partnersMove(q, b, action) {
  if (action.type === 'next') return b.checked ? {...partnersFresh(q), round: (b.round + 1) % q.rounds.length, row: '0'.repeat(q.rounds[(b.round + 1) % q.rounds.length].length)} : null;
  if (b.checked) return null;
  if (action.type === 'lantern') {
    const i = index(action.lantern);
    return integer(i) && i >= 0 && i < b.row.length ? {...b, row: flip(b.row, i)} : null;
  }
  if (action.type === 'add') return b.list.includes(b.row) ? null : {...b, list: [...b.list, b.row].sort()};
  if (action.type === 'remove') return b.list.includes(action.row) ? {...b, list: b.list.filter(r => r !== action.row)} : null;
  if (action.type === 'check') return b.list.length ? {...b, checked: true} : null;
  return null;
}

// ---------------------------------------------------------------- shared
const MODES = {
  design: {fresh: designFresh, valid: designValid, solved: designSolved, move: designMove},
  changer: {fresh: changerFresh, valid: changerValid, solved: changerSolved, move: changerMove},
  partners: {fresh: partnersFresh, valid: partnersValid, solved: partnersSolved, move: partnersMove}
};
const modeOf = p => MODES[p.parameters.mode];
const valid = (p, b) => object(b) && modeOf(p).valid(p.parameters, b);
const solved = (p, b) => valid(p, b) && modeOf(p).solved(p.parameters, b);
function move(p, b, action) {
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const next = modeOf(p).move(p.parameters, b, action);
  return next && valid(p, next) ? next : null;
}
function hint(p, b) {
  const q = p.parameters;
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart to clear the board.'};
  if (solved(p, b)) return {type: 'done'};
  if (q.mode === 'design') return designHint(p, q, b);
  if (q.mode === 'changer') return changerHint(q, b);
  return b.checked ? {type: 'move', action: {type: 'next'}, text: 'Try the next one.'} : {type: 'note'};
}

// ---------------------------------------------------------------- render
export const SHAPES = [
  {name: 'triangle', path: 'M12 3 21.5 20h-19z'},
  {name: 'square', path: 'M4 4h16v16H4z'},
  {name: 'circle', path: 'M12 3a9 9 0 1 0 .01 0z'},
  {name: 'star', path: 'M12 2.5l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7 6.2 20.1l1.5-6.5-5-4.4 6.6-.6z'},
  {name: 'diamond', path: 'M12 2 21 12 12 22 3 12z'},
  {name: 'moon', path: 'M15 3a9 9 0 1 0 6 15A7.5 7.5 0 0 1 15 3z'},
  {name: 'heart', path: 'M12 20.5C5 15.5 2.5 12 2.5 8.6A4.6 4.6 0 0 1 12 6.3a4.6 4.6 0 0 1 9.5 2.3c0 3.4-2.5 6.9-9.5 11.9z'},
  {name: 'cross', path: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z'}
];
const shape = (k, cls = '') => `<svg class="cb-shape s${k} ${cls}" viewBox="0 0 24 24" role="img" aria-label="${SHAPES[k].name}"><path d="${SHAPES[k].path}"/></svg>`;
const EYE = '<svg class="cb-eye" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const describe = row => [...row].map(c => c === '1' ? 'lit' : 'dark').join(', ');
// A row of lanterns. `act(i)` gives a lantern's action, or null for a picture.
function lanterns(row, act, ringed = [], label = '') {
  return `<span class="cb-row" role="group" aria-label="${esc(label || describe(row))}">${[...row].map((c, i) => {
    const cls = `cb-lantern${c === '1' ? ' on' : ''}${ringed.includes(i) ? ' ringed' : ''}`;
    const a = act?.(i);
    return a ? `<button type="button" class="${cls}" data-cb-move="${esc(JSON.stringify(a.action))}" data-focus="${esc(a.focus)}" aria-label="${esc(a.label)}" aria-pressed="${c === '1'}" ${a.disabled ? 'disabled' : ''}></button>` : `<span class="${cls}" aria-hidden="true"></span>`;
  }).join('')}</span>`;
}
const control = (label, action, cls = 'secondary', extra = '') => `<button type="button" class="${cls} cb-action" data-cb-move="${esc(JSON.stringify(action))}" data-focus="cb-${esc(action.type)}${action.length ? `-${action.length}` : ''}" ${extra}>${label}</button>`;
// The changer's trick: both rows, the lanterns turned over, and the shared row.
function trick(rows, fool, t) {
  const {a, b, row, fromA, fromB} = fool;
  const how = list => list.length ? `turn over ${list.length === 1 ? 'lantern' : 'lanterns'} ${list.map(i => i + 1).join(' and ')}` : 'change nothing';
  return `<div class="cb-trick" role="group" aria-label="How the changer fools this key">
    <div class="cb-trick-row">${shape(a)}${lanterns(rows[a], null, fromA)}<span class="cb-trick-how">${how(fromA)}</span></div>
    <div class="cb-trick-row cb-seen">${EYE}${lanterns(row)}<span class="cb-trick-how">the receiver sees</span></div>
    <div class="cb-trick-row">${shape(b)}${lanterns(rows[b], null, fromB)}<span class="cb-trick-how">${how(fromB)}</span></div>
    <p class="cb-say">${rows[a] === rows[b] ? `The ${SHAPES[a].name} and the ${SHAPES[b].name} have the same row.` : `Either way the receiver sees the same row, so it cannot tell the ${SHAPES[a].name} from the ${SHAPES[b].name}.`}</p>
  </div>`;
}
// Every row the receiver might see, with the pictures that could send it.
function catalogue(rows, n, t) {
  const cells = words(n).map(w => {
    const from = producers(rows, w, t);
    return `<li class="cb-cell${from.length > 1 ? ' clash' : from.length ? ' used' : ''}">${lanterns(w)}<span class="cb-from">${from.map(k => shape(k)).join('') || '<span class="cb-none">·</span>'}</span></li>`;
  }).join('');
  return `<details class="cb-catalogue" data-view-key="cb-catalogue" open><summary>Every row the receiver might see</summary><ul class="cb-cells n${n}">${cells}</ul></details>`;
}
function renderDesign(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), shown = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const hinted = shown?.action?.type === 'lantern' ? `${shown.action.picture}/${shown.action.lantern}` : null;
  const picker = q.goal === 'fewest' ? `<div class="cb-lengths" role="group" aria-label="Number of lanterns">${q.lengths.map(n => control(String(n), {type: 'length', length: n}, `secondary cb-length${b.claims.includes(n) ? ' claimed' : ''}${b.found[n] ? ' found' : ''}`, `aria-label="${plural(n, 'lantern')}${b.found[n] ? ', a key works' : ''}${b.claims.includes(n) ? ', cannot work' : ''}" aria-pressed="${b.length === n}" ${done ? 'disabled' : ''}`)).join('')}</div>` : '';
  const rows = b.rows.map((r, k) => `<div class="cb-key-row">${shape(k)}${lanterns(r, i => ({action: {type: 'lantern', picture: k, lantern: i}, focus: `cb-${k}-${i}`, label: `${SHAPES[k].name}, lantern ${i + 1}, ${r[i] === '1' ? 'lit' : 'dark'}`, disabled: done}), hinted?.startsWith(`${k}/`) ? [Number(hinted.split('/')[1])] : [])}</div>`).join('');
  let result = '';
  if (b.checked) {
    const fool = fooling(b.rows, q.flips), rule = !b.rows.every(r => fits(q, r));
    result = rule ? `<p class="cb-say" role="status">Each row needs exactly ${plural(q.weight, 'lit lantern')}.</p>`
      : fool ? `<div class="cb-result bad" role="status">${trick(b.rows, fool, q.flips)}</div>`
      : `<p class="cb-say good" role="status">The changer cannot fool this key.${q.goal === 'fewest' && !done ? ` It works with ${plural(b.length, 'lantern')}.` : ''}</p>`;
    if (!rule && b.length <= 5) result += catalogue(b.rows, b.length, q.flips);
  }
  if (b.wrong !== null) result += `<p class="cb-say" role="status">The changer cannot break every key with ${plural(b.wrong, 'lantern')}. Keep looking.</p>`;
  if (b.claims.includes(b.length)) result += `<p class="cb-say good" role="status">Right: no key with ${plural(b.length, 'lantern')} can stop the changer.</p>`;
  const claim = q.goal === 'key' || done ? '' : control(`No key with ${plural(b.length, 'lantern')}`, {type: 'claim'}, 'secondary cb-claim', b.tried.includes(b.length) && !b.claims.includes(b.length) ? '' : 'disabled');
  const check = done ? '' : control('Check', {type: 'check'}, `primary${shown?.action?.type === 'check' ? ' hinted' : ''}`, b.checked ? 'disabled' : '');
  return `<div class="codebook-puzzle mode-design" data-mechanic-wire="codebooks">${picker}<div class="cb-key" role="group" aria-label="The key">${rows}</div><div class="cb-tools">${check}${claim}</div>${result}</div>`;
}
function renderChanger(p, a) {
  const q = p.parameters, b = a.board, key = keyOf(q, b), done = solved(p, b);
  const shown = a.hintLevel >= 2 && !b.won ? hint(p, b) : null;
  const rows = key.map((r, k) => `<div class="cb-key-row">${shape(k)}${lanterns(r)}</div>`).join('');
  const editor = lanterns(b.row, i => ({action: {type: 'lantern', lantern: i}, focus: `cb-x-${i}`, label: `Lantern ${i + 1}, ${b.row[i] === '1' ? 'lit' : 'dark'}`, disabled: b.won}), shown?.action?.type === 'lantern' ? [shown.action.lantern] : [], 'The row to send');
  let result = '';
  if (b.sent) {
    const from = producers(key, b.row, q.flips);
    result = from.length > 1 ? `<div class="cb-result good" role="status"><p class="cb-say good">Fooled! The receiver cannot tell the ${SHAPES[from[0]].name} from the ${SHAPES[from[1]].name}.</p>${trick(key, {a: from[0], b: from[1], row: b.row, fromA: differ(key[from[0]], b.row), fromB: differ(key[from[1]], b.row)})}</div>`
      : from.length ? `<p class="cb-say" role="status">The receiver says ${shape(from[0], 'inline')} ${SHAPES[from[0]].name}, and is sure.</p>`
      : `<p class="cb-say" role="status">No picture becomes this row with ${q.flips === 1 ? 'one change' : `${q.flips} changes or fewer`}.</p>`;
  }
  if (b.cant === 'yes') result = `<p class="cb-say good" role="status">Right: the changer cannot fool this key.</p>`;
  if (b.cant === 'no') result = `<p class="cb-say" role="status">The changer can fool this key. Keep looking.</p>`;
  const tools = b.won ? (done ? '' : control('Next key', {type: 'next'}, 'primary')) : `${control('Send', {type: 'send'}, `primary${shown?.action?.type === 'send' ? ' hinted' : ''}`, b.sent ? 'disabled' : '')}${control('It can’t be fooled', {type: 'cant'}, `secondary cb-claim${shown?.action?.type === 'cant' ? ' hinted' : ''}`, b.tried && !b.cant ? '' : 'disabled')}`;
  const pips = q.keys.length > 1 ? `<p class="cb-pips" aria-label="Key ${b.round + 1} of ${q.keys.length}">${q.keys.map((_, k) => `<i class="${k < b.round || (k === b.round && b.won) ? 'done' : k === b.round ? 'now' : ''}"></i>`).join('')}</p>` : '';
  return `<div class="codebook-puzzle mode-changer" data-mechanic-wire="codebooks">${pips}<div class="cb-key given" role="group" aria-label="The key">${rows}</div><div class="cb-send">${EYE}${editor}</div><div class="cb-tools">${tools}</div>${result}</div>`;
}
function renderPartners(p, a) {
  const q = p.parameters, b = a.board, given = q.rounds[b.round], answer = partnersOf(given, q.flips), done = solved(p, b);
  const editor = lanterns(b.row, i => ({action: {type: 'lantern', lantern: i}, focus: `cb-x-${i}`, label: `Lantern ${i + 1}, ${b.row[i] === '1' ? 'lit' : 'dark'}`, disabled: b.checked}), [], `A row for the ${SHAPES[1].name}`);
  const list = b.list.map(r => {
    const mark = b.checked ? (answer.includes(r) ? ' right' : ' wrong') : '';
    return `<li class="cb-found${mark}">${lanterns(r)}${b.checked ? '' : `<button type="button" class="quiet cb-remove" data-cb-move="${esc(JSON.stringify({type: 'remove', row: r}))}" aria-label="Remove ${esc(describe(r))}">×</button>`}</li>`;
  }).join('');
  const missed = b.checked ? answer.filter(r => !b.list.includes(r)) : [];
  const reveal = missed.length ? `<p class="cb-say">Missing:</p><ul class="cb-list">${missed.map(r => `<li class="cb-found missed">${lanterns(r)}</li>`).join('')}</ul>` : '';
  const tools = b.checked ? (done ? '' : control('Next', {type: 'next'}, 'primary')) : `${control('Add row', {type: 'add'}, 'secondary', b.list.includes(b.row) ? 'disabled' : '')}${control('That’s every one', {type: 'check'}, 'primary', b.list.length ? '' : 'disabled')}`;
  const say = b.checked && !done ? `<p class="cb-say" role="status">Not quite.${missed.length ? '' : ' The crossed rows can be fooled.'}</p>` : '';
  return `<div class="codebook-puzzle mode-partners" data-mechanic-wire="codebooks"><div class="cb-key given"><div class="cb-key-row">${shape(0)}${lanterns(given)}</div><div class="cb-key-row cb-edit">${shape(1)}${editor}</div></div><div class="cb-tools">${tools}</div><ul class="cb-list">${list}</ul>${say}${reveal}</div>`;
}

function wire(root, p, api) {
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-cb-move]');
    if (!el || !root.contains(el) || el.disabled) return;
    try { api.apply(JSON.parse(el.dataset.cbMove)); } catch { /* malformed control */ }
  });
}

export const codebookMechanics = {
  codebook: {
    fresh: p => modeOf(p).fresh(p.parameters),
    valid,
    solved,
    move,
    hint,
    render: (p, a) => p.parameters.mode === 'design' ? renderDesign(p, a) : p.parameters.mode === 'changer' ? renderChanger(p, a) : renderPartners(p, a),
    wire,
    noUndo: p => p.parameters.mode === 'partners',
    demo: 'Tap a lantern to light it or put it out. Each picture gets its own row. Check lets the changer try to fool the receiver.'
  }
};

// The family seam entry (dist/families.js). The puzzles join Signal Lanterns
// as its Codebooks group, so the module adds no satchel family of its own.
export default {
  id: 'codebooks',
  mechanics: codebookMechanics,
  pack: new URL('./codebooks.json', import.meta.url).href,
  css: new URL('./codebooks.css', import.meta.url).href,
  focus: '.cb-lantern:not(:disabled),.codebook-puzzle .primary:not(:disabled)'
};
