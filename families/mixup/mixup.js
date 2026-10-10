// Mixed-up cups (worksheet Week 63). Lettered cups stand on lettered homes,
// one cup per home. A row with no cup on its own home is a derangement. Tap two
// cups to swap them, keep the rows a puzzle asks for, and say That's all when
// none is missing. Requiring k named cups at home leaves (n − k)! rows, so the
// rows with none at home number n! − C(n,1)(n − 1)! + C(n,2)(n − 2)! − …: 2, 9
// and 44 for three, four and five cups. Fixing where cup E goes (to home A,
// say) splits the rest in two: A in home E leaves a smaller no-home row on the
// other n − 2 cups, and A elsewhere shrinks to one on n − 1 cups, so
// D(n) = (n − 1)(D(n − 1) + D(n − 2)). The shelf and catalog come from the
// shared case engine (dist/cases.js).
import {esc} from '../../expansion-controls.js';
import {LETTERS, letters, rowsOf, isRow, atHome, differences, keepCase, claimCases, missingCases, validShelf, nearestCase, shelfHTML, binsHTML, hoopsHTML, catalogHTML, wireCases, cupsBoard, cupMini, sayRow, andList, swapRow, wireCups} from '../../cases.js';

export const PLAY_CUPS = [3, 4, 5];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const home = (row, letter) => row[LETTERS.indexOf(letter)];

// A puzzle's rows: every row of its cups that leaves the pinned cups where the
// start has them, and the ones its rule asks for.
//   away: every listed cup is off its home
//   some-home: at least one listed cup is on its home
//   home-count: exactly `count` cups are on their homes
export function counts(rule, row) {
  if (rule.type === 'away') return [...rule.cups].every(c => home(row, c) !== c);
  if (rule.type === 'some-home') return [...rule.cups].some(c => home(row, c) === c);
  if (rule.type === 'home-count') return atHome(row).length === rule.count;
  return false;
}
const pinnedOf = q => [...(q.pinned || '')];
const keepsPins = (q, row) => pinnedOf(q).every(h => home(row, h) === home(q.start, h));
const cache = new Map();
export function universe(q) {
  const k = `${q.cups}:${q.pinned || ''}:${q.start}`;
  if (!cache.has(k)) cache.set(k, rowsOf(q.cups).filter(row => keepsPins(q, row)));
  return cache.get(k);
}
const targets = new Map();
export function targetRows(q) {
  const k = JSON.stringify([q.cups, q.pinned, q.start, q.rule]);
  if (!targets.has(k)) targets.set(k, universe(q).filter(row => counts(q.rule, row)));
  return targets.get(k);
}

// How the shelf is laid out:
//   list: in the order found
//   hoops: one hoop for each listed cup at home
//   bins by 'home': which cup is the one at home
//   bins by 'in-home': whether `cup` stands on `home`
//   bins by 'staying': which of the listed cups are at home
const tile = letter => `<i class="cm${LETTERS.indexOf(letter)}">${letter}</i>`;
function binsOf(q) {
  const s = q.shelf;
  if (s.by === 'home') return {bins: [...letters(q.cups)].map(c => ({id: c, label: `${tile(c)} home`})), bin: row => atHome(row)[0] ?? ''};
  if (s.by === 'in-home') return {bins: [{id: 'yes', label: `${tile(s.cup)} on ${s.home}`}, {id: 'no', label: `${tile(s.cup)} not on ${s.home}`}], bin: row => home(row, s.home) === s.cup ? 'yes' : 'no'};
  if (s.by === 'staying') {
    const [x, y] = [...s.cups], id = row => `${home(row, x) === x ? x : ''}${home(row, y) === y ? y : ''}`;
    return {bins: [{id: '', label: `${tile(x)}${tile(y)} away`}, {id: x, label: `${tile(x)} home`}, {id: y, label: `${tile(y)} home`}, {id: x + y, label: `${tile(x)}${tile(y)} home`}], bin: id};
  }
  return null;
}
const hoopsOf = q => [...q.shelf.cups].map(c => ({label: `${tile(c)} home`, say: `${c} at home`, has: row => home(row, c) === c}));
// The catalog shown after a solve: every row, in columns by the cup in one home.
const catalogHome = q => q.catalog || [...letters(q.cups)].find(h => !pinnedOf(q).includes(h));
function catalogColumns(q) {
  const h = catalogHome(q), cups = [...new Set(universe(q).map(row => home(row, h)))].sort();
  return {columns: cups.map(c => ({id: c, label: `${tile(c)} on ${h}`})), column: row => home(row, h)};
}

const describe = row => `${sayRow(row)}; ${atHome(row).length ? `${andList(atHome(row))} at home` : 'no cup at home'}`;
const said = {mini: cupMini, say: describe};

function freshPuzzle(p) {
  return {row: p.parameters.start, kept: [], claimed: false, missed: false};
}
function validPuzzle(p, b) {
  const q = p.parameters;
  return object(b) && isRow(q.cups, b.row) && keepsPins(q, b.row) && validShelf(b, targetRows(q), universe(q).length);
}
const solvedPuzzle = (p, b) => validPuzzle(p, b) && b.claimed;
const canKeep = (q, b) => counts(q.rule, b.row) && !b.kept.includes(b.row);
function movePuzzle(p, b, action) {
  if (!validPuzzle(p, b) || b.claimed || !object(action)) return null;
  const q = p.parameters, pins = pinnedOf(q);
  switch (action.type) {
    case 'swap': {
      const {a, b: c} = action, ok = i => Number.isInteger(i) && i >= 0 && i < q.cups && !pins.includes(LETTERS[i]);
      return ok(a) && ok(c) && a !== c ? {...b, row: swapRow(b.row, a, c)} : null;
    }
    case 'keep': {
      const kept = keepCase(b.kept, b.row, row => counts(q.rule, row) && keepsPins(q, row), universe(q).length);
      return kept ? {...b, kept, missed: false} : null;
    }
    case 'load':
      return b.kept.includes(action.row) && action.row !== b.row ? {...b, row: action.row} : null;
    case 'claim':
      return b.kept.length && !b.missed ? {...b, ...claimCases(targetRows(q), b.kept)} : null;
  }
  return null;
}

// Hints walk toward the missing row nearest the cups on the board.
function hintPuzzle(p, b) {
  if (solvedPuzzle(p, b)) return {type: 'done'};
  const q = p.parameters, missing = missingCases(targetRows(q), b.kept);
  if (!missing.length) return {type: 'move', action: {type: 'claim'}, text: 'You have found them all.'};
  if (missing.includes(b.row)) return {type: 'move', action: {type: 'keep'}, text: 'Keep this row.'};
  const goal = nearestCase(missing, b.row), h = [...b.row].findIndex((c, i) => c !== goal[i]), j = b.row.indexOf(goal[h]);
  return {type: 'move', action: {type: 'swap', a: h, b: j}, text: `Put ${goal[h]} in home ${LETTERS[h]}.`};
}

// The playground: three to five cups, any row kept, the shelf sorted by how
// many cups are at home.
function freshPlay(cups = 4) {
  return {cups, row: letters(cups), kept: []};
}
function validPlay(b) {
  return object(b) && PLAY_CUPS.includes(b.cups) && isRow(b.cups, b.row) && Array.isArray(b.kept) && b.kept.length <= rowsOf(b.cups).length && new Set(b.kept).size === b.kept.length && b.kept.every(row => isRow(b.cups, row));
}
function movePlay(b, action, random = Math.random) {
  if (!validPlay(b) || !object(action)) return null;
  switch (action.type) {
    case 'cups': return PLAY_CUPS.includes(action.cups) && action.cups !== b.cups ? freshPlay(action.cups) : null;
    case 'swap': {
      const {a, b: c} = action, ok = i => Number.isInteger(i) && i >= 0 && i < b.cups;
      return ok(a) && ok(c) && a !== c ? {...b, row: swapRow(b.row, a, c)} : null;
    }
    case 'shuffle': {
      const pool = rowsOf(b.cups).filter(row => row !== b.row);
      return {...b, row: pool[Math.floor(random() * pool.length) % pool.length]};
    }
    case 'keep': {
      const kept = keepCase(b.kept, b.row, row => isRow(b.cups, row), rowsOf(b.cups).length);
      return kept ? {...b, kept} : null;
    }
    case 'load': return b.kept.includes(action.row) && action.row !== b.row ? {...b, row: action.row} : null;
    case 'clear': return b.kept.length ? {...b, kept: []} : null;
  }
  return null;
}
const countBins = n => Array.from({length: n + 1}, (_, k) => ({id: String(k), label: `${k} home`}));

// View-only state: the cup chosen first.
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {pick: null}); return uiState.get(p.id); };
let pending = null;

const button = (label, action, cls = '', extra = '') => `<button type="button" class="secondary case-action ${cls}" data-mixup-move="${esc(JSON.stringify(action))}" data-focus="mixup-${action.type}${action.cups ?? ''}" ${extra}>${label}</button>`;
function shelfFor(q, b, o) {
  if (q.shelf.type === 'hoops') return hoopsHTML(b.kept, hoopsOf(q), o);
  const bins = binsOf(q);
  return bins ? binsHTML(b.kept, bins.bins, bins.bin, o) : shelfHTML(b.kept, o);
}
function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, solved = solvedPuzzle(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action;
  const hinted = h?.type === 'swap' ? [h.a, h.b] : [];
  const board = cupsBoard(b.row, {pinned: pinnedOf(q), picked: solved ? null : ui(p).pick, hinted, still: solved});
  const keepable = canKeep(q, b);
  const actions = solved ? '' : `<div class="case-actions">${button('Keep', {type: 'keep'}, h?.type === 'keep' ? 'hinted' : '', keepable ? '' : 'disabled')}${button('That’s all', {type: 'claim'}, h?.type === 'claim' ? 'hinted' : '', b.kept.length && !b.missed ? '' : 'disabled')}</div>`;
  const missed = b.missed ? '<p class="case-note" role="status">There’s another.</p>' : '';
  const shelf = shelfFor(q, b, {...said, current: solved ? null : b.row, load: !solved, label: 'Rows kept'});
  const cat = solved ? (({columns, column}) => catalogHTML(universe(q), columns, column, {...said, label: 'Every row', mark: row => counts(q.rule, row) ? 'yes' : 'no'}))(catalogColumns(q)) : '';
  const status = `${describe(b.row)}.${b.kept.includes(b.row) ? ' Kept.' : ''}`;
  return `<div class="mixup-puzzle" data-mechanic-wire="mixup">${board}${actions}${missed}${shelf}${cat}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderPlay(p, a) {
  const b = a.board;
  // Undo can take away the cup that was picked.
  if (ui(p).pick >= b.cups) ui(p).pick = null;
  const pickers = `<div class="case-tools" role="group" aria-label="Cups">${PLAY_CUPS.map(n => button(String(n), {type: 'cups', cups: n}, 'case-tool', `aria-pressed="${b.cups === n}" aria-label="${n} cups"`)).join('')}</div>`;
  const board = cupsBoard(b.row, {picked: ui(p).pick});
  const actions = `<div class="case-actions">${button('Keep', {type: 'keep'}, '', b.kept.includes(b.row) ? 'disabled' : '')}${button('Shuffle', {type: 'shuffle'})}${button('Clear', {type: 'clear'}, '', b.kept.length ? '' : 'disabled')}</div>`;
  const shelf = binsHTML(b.kept, countBins(b.cups), row => String(atHome(row).length), {...said, current: b.row, load: true, label: 'Rows kept', always: true});
  return `<div class="mixup-play" data-mechanic-wire="mixup">${pickers}${board}${actions}${shelf}<p class="sr-only" role="status">${esc(describe(b.row) + '.')}</p></div>`;
}

function wire(root, p, api) {
  const state = ui(p);
  const apply = action => { pending = {id: p.id, moves: api.attempt().moves, action}; state.pick = null; api.apply(action); };
  wireCups(root, {picked: () => state.pick, pick: h => api.ui({pick: h}), swap: (i, j) => apply({type: 'swap', a: i, b: j})});
  wireCases(root, row => { if (row !== api.attempt().board.row) apply({type: 'load', row}); });
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-mixup-move]');
    if (!el || !root.contains(el) || el.disabled || el.getAttribute('aria-pressed') === 'true') return;
    try { apply(JSON.parse(el.dataset.mixupMove)); } catch { /* malformed control data is ignored */ }
  });
  // A row just kept arrives on the shelf; two cups just swapped settle.
  const last = pending;
  pending = null;
  if (!last || last.id !== p.id || api.attempt().moves !== last.moves + 1) return;
  if (last.action.type === 'keep') root.querySelector(`[data-case="${CSS.escape(api.attempt().board.row)}"]`)?.classList.add('fresh');
  if (last.action.type === 'swap') for (const i of [last.action.a, last.action.b]) root.querySelector(`[data-cup="${i}"]`)?.classList.add('arrived');
}

const isPlay = p => p.parameters.mode === 'playground';
export const mixupMechanics = {
  mixup: {
    fresh: p => isPlay(p) ? freshPlay() : freshPuzzle(p),
    valid: (p, b) => isPlay(p) ? validPlay(b) : validPuzzle(p, b),
    solved: (p, b) => isPlay(p) ? false : solvedPuzzle(p, b),
    move: (p, b, action, random) => isPlay(p) ? movePlay(b, action, random) : movePuzzle(p, b, action),
    hint: (p, b) => isPlay(p) ? {type: 'done'} : hintPuzzle(p, b),
    render: (p, a) => isPlay(p) ? renderPlay(p, a) : renderPuzzle(p, a),
    wire,
    ui(p, payload) {
      if (!object(payload) || !Object.hasOwn(payload, 'pick')) return;
      ui(p).pick = Number.isInteger(payload.pick) ? payload.pick : null;
    },
    reset: p => { uiState.delete(p.id); },
    noHint: isPlay
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'mixup',
  family: {id: 'mixup', symbol: '≠'},
  mechanics: mixupMechanics,
  pack: new URL('./mixup.json', import.meta.url).href,
  css: new URL('./mixup.css', import.meta.url).href,
  focus: 'button.case-cup:not([aria-disabled]),.case-action:not([disabled])'
};
