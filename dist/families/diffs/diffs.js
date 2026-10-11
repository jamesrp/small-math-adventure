// Gap rings (worksheet Week 49, four towers and differences: Ducci's
// four-number game). A ring of towers, each a whole number of blocks high, has
// an arrow from each tower to the next. The number on an arrow is the gap
// between its two towers, and the next ring puts each gap at the tower the
// arrow leaves: D(a, b, c, d) = (|a − b|, |b − c|, |c − d|, |d − a|).
//
// The app never runs the rule for the child. Every puzzle goes backward:
// build an old ring whose gaps make a given ring (or show none can), find
// every such ring under a height cap, or grow a run back from zero one ring at
// a time. Two facts give the certificates for "can't": the gaps of any ring
// have an even total (going round, a tower switches between odd and even at
// each odd gap and must come back to itself), and three gaps of 0 make all
// four towers equal, so the fourth gap is 0 too. In general a ring of gaps
// comes from some ring exactly when its numbers split into two groups with
// equal totals (choose for each arrow whether it climbs or falls).
//
// Four towers always reach all zeros: after four moves every height is even,
// and the tallest never grows, so halving shows the run ends. Three towers can
// go round for ever: (1, 0, 1) ← (0, 1, 1) ← (1, 1, 0) ← (1, 0, 1).
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = Number.isInteger;
export const LETTERS = ['A', 'B', 'C', 'D'];
export const MODES = ['make', 'every', 'grow', 'playground'];
export const PLAY_CAP = 5;
const MAX_RUN = 24;

// --- The rule -------------------------------------------------------------------
export const gaps = r => r.map((v, i) => Math.abs(v - r[(i + 1) % r.length]));
export const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
export const keyOf = r => r.join(',');
export const zero = n => Array(n).fill(0);
const isZero = r => r.every(v => v === 0);
export const complete = r => r.every(v => v !== null);
// Every ring of n towers with heights 0..cap, A first varying slowest.
const ringMemo = new Map();
export function allRings(n, cap) {
  const k = `${n}|${cap}`;
  if (!ringMemo.has(k)) {
    const out = [];
    const go = r => { if (r.length === n) { out.push(r); return; } for (let v = 0; v <= cap; v++) go([...r, v]); };
    go([]);
    ringMemo.set(k, out);
  }
  return ringMemo.get(k);
}
// The rings under the cap whose gaps make `target`, found by trying them all
// once and filing each ring under its gaps. The all-zero ring is left out: it
// makes only itself, and that is no move.
const predMemo = new Map();
export function predecessors(target, cap) {
  const k = `${target.length}|${cap}`;
  if (!predMemo.has(k)) {
    const table = new Map();
    for (const r of allRings(target.length, cap)) if (!isZero(r)) { const g = keyOf(gaps(r)); if (!table.has(g)) table.set(g, []); table.get(g).push(r); }
    predMemo.set(k, table);
  }
  return predMemo.get(k).get(keyOf(target)) || [];
}
// Moves until all zeros (Infinity if the run comes round without reaching zero).
export function movesToZero(r) {
  const seen = new Set();
  let s = r, k = 0;
  while (!isZero(s)) { if (seen.has(keyOf(s))) return Infinity; seen.add(keyOf(s)); s = gaps(s); k++; }
  return k;
}
// The longest run back from r under the cap (four towers, where runs never
// come round). A ring with no ring before it scores 0.
const deepMemo = new Map();
export function deepest(r, cap) {
  const k = `${keyOf(r)}|${cap}`;
  if (!deepMemo.has(k)) deepMemo.set(k, predecessors(r, cap).reduce((m, p) => Math.max(m, 1 + deepest(p, cap)), 0));
  return deepMemo.get(k);
}

// --- Certificates for Can't -------------------------------------------------------
// Marks are positions in the target ring. Odd: exactly the odd numbers, and an
// odd count of them. Zeros: all but one tower, every one 0, and the last not 0.
export const oddOnes = t => t.map((v, i) => v % 2 ? i : -1).filter(i => i >= 0);
export function certificate(t, marks) {
  if (!Array.isArray(marks) || !marks.length) return null;
  const odd = oddOnes(t);
  if (odd.length % 2 === 1 && same(marks, odd)) return 'odd';
  if (marks.length === t.length - 1 && marks.every(i => t[i] === 0) && t.some((v, i) => !marks.includes(i) && v !== 0)) return 'zeros';
  return null;
}
// Whether some ring, of any height, makes t: its numbers split into two
// groups with equal totals (the arrows that climb and the arrows that fall).
export const splits = t => { for (let m = 0; m < 1 << t.length; m++) if (t.reduce((s, v, i) => s + ((m >> i) & 1 ? v : -v), 0) === 0) return true; return false; };
// The reason a target has no ring before it, as marks to tap, or null.
export function reasonOf(t) {
  const odd = oddOnes(t);
  if (odd.length % 2 === 1) return {kind: 'odd', marks: odd};
  const zeros = t.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
  if (zeros.length === t.length - 1) return {kind: 'zeros', marks: zeros};
  return null;
}
const marksOk = (n, marks) => Array.isArray(marks) && marks.length > 0 && marks.every((i, k) => int(i) && i >= 0 && i < n && (k === 0 || i > marks[k - 1]));

// --- Boards ---------------------------------------------------------------------------
// make:  {old, claim, refused}   old is a ring with null for a tower not built;
//        claim is the accepted Can't marks, refused the marks of a refused one
//        (Can't then waits for a change of tower).
// every: {old, found, told, done}   found: the rings found, as sorted keys;
//        told: 'more' after a wrong That's all, until a new ring is found.
// grow and playground: {run, draft}   run: the rings built, newest first, each
//        made by the one before it; the last makes zero, or is the authored
//        start. draft: the ring being built.
const capOf = q => q.mode === 'playground' ? PLAY_CAP : q.cap;
const stationsOf = q => q.mode === 'playground' ? 4 : q.stations;
const blank = n => Array(n).fill(null);
const startOf = q => q.start || [];
const partOk = (q, r) => Array.isArray(r) && r.length === stationsOf(q) && r.every(v => v === null || (int(v) && v >= 0 && v <= capOf(q)));
const ringOk = (q, r) => partOk(q, r) && complete(r);
export const topOf = (q, b) => b.run[0] || zero(stationsOf(q));
const growing = q => q.mode === 'grow' || q.mode === 'playground';
const answerKeys = q => predecessors(q.target, q.cap).map(keyOf).sort();
// The loop: the newest ring is one already in the run.
const looped = run => run.length > 1 && run.slice(1).some(r => same(r, run[0]));

function fresh(p) {
  const q = p.parameters;
  if (growing(q)) return {run: startOf(q).map(r => [...r]), draft: blank(stationsOf(q))};
  if (q.mode === 'every') return {old: blank(q.stations), found: [], told: null, done: false};
  return {old: blank(q.stations), claim: null, refused: null};
}
function validRun(q, b) {
  const run = b.run, start = startOf(q);
  if (!Array.isArray(run) || run.length > (q.goal?.moves ?? MAX_RUN) || !run.every(r => ringOk(q, r) && !isZero(r))) return false;
  if (run.length < start.length || !start.every((r, k) => same(r, run[run.length - start.length + k]))) return false;
  for (let i = 0; i < run.length - 1; i++) if (!same(gaps(run[i]), run[i + 1])) return false;
  if (!start.length && run.length && !isZero(gaps(run.at(-1)))) return false;
  // Only the newest ring may repeat one before it, and that ends a loop puzzle.
  const keys = run.slice(1).map(keyOf);
  if (new Set(keys).size !== keys.length) return false;
  return !looped(run) || q.goal?.loop === true;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  const keys = Object.keys(b).sort().join();
  if (growing(q)) return keys === 'draft,run' && partOk(q, b.draft) && validRun(q, b);
  if (q.mode === 'every') {
    if (keys !== 'done,found,old,told' || !partOk(q, b.old) || typeof b.done !== 'boolean' || ![null, 'more'].includes(b.told)) return false;
    const all = answerKeys(q);
    if (!Array.isArray(b.found) || !b.found.every((f, k) => all.includes(f) && (k === 0 || b.found[k - 1] < f))) return false;
    // A ring is recorded the moment it is built.
    if (complete(b.old) && all.includes(keyOf(b.old)) && !b.found.includes(keyOf(b.old))) return false;
    if (b.told === 'more' && (b.found.length === all.length || b.done)) return false;
    return !b.done || b.found.length === all.length;
  }
  if (keys !== 'claim,old,refused' || !partOk(q, b.old)) return false;
  if (b.claim !== null && !(q.cant && marksOk(q.stations, b.claim) && certificate(q.target, b.claim) && complete(b.old))) return false;
  if (b.refused !== null && !(q.cant && marksOk(q.stations, b.refused) && !certificate(q.target, b.refused))) return false;
  return b.claim === null || b.refused === null;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'grow') return q.goal.loop ? looped(b.run) : b.run.length === q.goal.moves;
  if (q.mode === 'every') return b.done;
  return b.claim !== null || (complete(b.old) && same(gaps(b.old), q.target));
}

// --- Moves ------------------------------------------------------------------------------
// set {station, h}: build a tower (h null clears it). cant {marks}: Can't with
// the target's towers that show why. all: That's all. lift: take the newest
// ring of the run back to change it.
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const n = stationsOf(q), cap = capOf(q);
  if (action.type === 'set') {
    const i = action.station, h = action.h;
    if (!int(i) || i < 0 || i >= n || !(h === null || (int(h) && h >= 0 && h <= cap))) return null;
    const ring = growing(q) ? b.draft : b.old;
    if (ring[i] === h) return null;
    const next = ring.map((v, k) => k === i ? h : v);
    if (growing(q)) {
      // A draft whose gaps make the newest ring joins the run, and a fresh draft starts.
      if (complete(next) && !isZero(next) && same(gaps(next), topOf(q, b))) return {run: [next, ...b.run], draft: blank(n)};
      return {...b, draft: next};
    }
    if (q.mode === 'every') {
      const k = keyOf(next), isNew = complete(next) && answerKeys(q).includes(k) && !b.found.includes(k);
      return isNew ? {...b, old: next, found: [...b.found, k].sort(), told: null} : {...b, old: next};
    }
    return {...b, old: next, refused: null};
  }
  if (action.type === 'cant' && q.mode === 'make' && q.cant) {
    // Can't comes after an attempt (a whole ring built) and waits for a change after a refusal.
    if (!complete(b.old) || b.refused !== null || !marksOk(n, action.marks)) return null;
    return certificate(q.target, action.marks) ? {...b, claim: [...action.marks]} : {...b, refused: [...action.marks]};
  }
  if (action.type === 'all' && q.mode === 'every' && b.told !== 'more') {
    return b.found.length === answerKeys(q).length ? {...b, done: true, told: null} : {...b, told: 'more'};
  }
  if (action.type === 'lift' && growing(q) && b.run.length > startOf(q).length) return {run: b.run.slice(1), draft: [...b.run[0]]};
  return null;
}

// --- Hints ---------------------------------------------------------------------------------
// Each hint names one tower to set, toward the nearest ring that works; or
// Can't with its reason, after a whole ring is built; or That's all; or, in a
// run, taking back a ring that cannot go back far enough.
const off = (r, goal) => r.reduce((n, v, i) => n + (v === goal[i] ? 0 : 1), 0);
const nearest = (r, goals) => goals.reduce((best, g) => off(r, g) < off(r, best) ? g : best);
const setText = (i, h) => `Set ${LETTERS[i]} to ${h}.`;
// One tower toward goal: an empty one first, else the first wrong one. In a
// run, a tower whose setting would finish a ring that cannot go on comes last.
function toward(r, goal, bad = () => false) {
  const wrong = r.map((v, i) => v !== goal[i] ? i : -1).filter(i => i >= 0);
  const order = [...wrong.filter(i => r[i] === null), ...wrong.filter(i => r[i] !== null)];
  const i = order.find(k => !bad(r.map((v, j) => j === k ? goal[k] : v))) ?? order[0];
  return {type: 'move', action: {type: 'set', station: i, h: goal[i]}, text: setText(i, goal[i])};
}
export function reasonText(t) {
  const why = reasonOf(t);
  if (!why) return '';
  if (why.kind === 'zeros') return 'Three gaps of 0 would make all four towers equal, and then the last gap is 0 too.';
  const k = why.marks.length;
  return `Going round, a tower switches between odd and even at each odd gap. The ring on the right needs ${k} odd ${k === 1 ? 'gap' : 'gaps'}, so A would come back changed.`;
}
function makeHint(q, b) {
  const answers = predecessors(q.target, q.cap);
  if (answers.length) return toward(b.old, nearest(b.old, answers));
  // No ring works. First an attempt: the ring with the most gaps right.
  if (!complete(b.old)) {
    const score = r => gaps(r).filter((v, i) => v === q.target[i]).length;
    const best = allRings(q.stations, q.cap).reduce((top, r) => score(r) > score(top) || (score(r) === score(top) && off(b.old, r) < off(b.old, top)) ? r : top);
    return toward(b.old, best);
  }
  if (b.refused !== null) {
    const h = b.old[0] === q.cap ? 0 : b.old[0] + 1;
    return {type: 'move', action: {type: 'set', station: 0, h}, text: `Change a tower first. ${setText(0, h)}`};
  }
  return {type: 'move', action: {type: 'cant', marks: reasonOf(q.target).marks}, text: reasonText(q.target)};
}
function everyHint(q, b) {
  const left = predecessors(q.target, q.cap).filter(r => !b.found.includes(keyOf(r)));
  if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  return toward(b.old, nearest(b.old, left));
}
// The rings that can be built next on the way to a solve.
function growAims(q, b) {
  const top = topOf(q, b), before = predecessors(top, q.cap);
  if (q.goal.loop) {
    // Breadth-first back from the newest ring to a ring already in the run.
    const inRun = new Set(b.run.map(keyOf)), first = new Map(), queue = [];
    for (const r of before) { first.set(keyOf(r), r); queue.push(r); }
    for (let k = 0; k < queue.length; k++) {
      const r = queue[k], aim = first.get(keyOf(r));
      if (inRun.has(keyOf(r))) return [aim];
      for (const s of predecessors(r, q.cap)) if (!first.has(keyOf(s))) { first.set(keyOf(s), aim); queue.push(s); }
    }
    return [];
  }
  const need = q.goal.moves - b.run.length - 1;
  return before.filter(r => deepest(r, q.cap) >= need);
}
function growHint(q, b) {
  const aims = growAims(q, b);
  // A ring taken back that could go on as it is: clear a tower to build it again.
  if (aims.length && aims.every(r => same(r, b.draft))) return {type: 'move', action: {type: 'set', station: 0, h: null}, text: `Clear ${LETTERS[0]}, then build it again.`};
  if (aims.length) {
    const aimKeys = new Set(aims.map(keyOf)), top = topOf(q, b);
    // A ring that would join the run but is not one of the aims.
    const bad = r => complete(r) && !isZero(r) && same(gaps(r), top) && !aimKeys.has(keyOf(r));
    return toward(b.draft, nearest(b.draft, aims.filter(r => !same(r, b.draft))), bad);
  }
  const why = reasonOf(b.run[0]);
  const text = !predecessors(b.run[0], q.cap).length
    ? `No ring${splits(b.run[0]) ? ` with towers up to ${q.cap}` : ''} makes this one${why?.kind === 'odd' ? ': its numbers add up to an odd number' : why?.kind === 'zeros' ? ': it has three 0s' : ''}. Take it back.`
    : q.goal.loop ? 'The rings before this one never come back. Take it back.' : 'The rings before this one cannot go back far enough. Take it back.';
  return {type: 'move', action: {type: 'lift'}, text};
}
const hintMemo = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const k = `${p.id}|${JSON.stringify(b)}`;
  if (!hintMemo.has(k)) {
    if (hintMemo.size > 2000) hintMemo.clear();
    hintMemo.set(k, q.mode === 'grow' ? growHint(q, b) : q.mode === 'every' ? everyHint(q, b) : makeHint(q, b));
  }
  return hintMemo.get(k);
}

// --- Drawing ---------------------------------------------------------------------------------
// A ring is a small grid: four towers at the corners (A B over D C), or three
// in a triangle (A over C B), with an arrow from each tower to the next and
// its gap on it. A tower is a column of block cells over a floor; tapping a
// cell builds the tower to that height and tapping the floor makes it 0.
const ARROWS4 = ['→', '↓', '←', '↑'], ARROWS3 = ['↘', '←', '↗'];
const heightWords = v => v === null ? 'empty' : `${v} high`;
const view = new Map();
function ui(p) { if (!view.has(p.id)) view.set(p.id, {claiming: false, marks: []}); return view.get(p.id); }
const calm = p => Object.assign(ui(p), {claiming: false, marks: []});
const moveAttrs = (action, focus) => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${focus}"`;
const hinted = (shown, action) => shown && JSON.stringify(shown) === JSON.stringify(action) ? ' hinted' : '';

// s: {edit, cap, shown, gaps, label, cls, picking, marks, claimed
// (towers outlined after a right Can't), claimedArrows (their arrows)}
function station(r, i, s) {
  const v = r[i], cells = [];
  for (let t = s.cap; t >= 1; t--) {
    const look = `df-cell${v !== null && t <= v ? ' on' : ''}`;
    if (s.edit) {
      const action = {type: 'set', station: i, h: v === t ? null : t};
      cells.push(`<button type="button" class="${look}${hinted(s.shown, action)}" ${moveAttrs(action, `df-${i}-${t}`)} aria-label="${esc(v === t ? `Clear ${LETTERS[i]}` : `${LETTERS[i]}, ${t} high`)}"></button>`);
    } else cells.push(`<span class="${look}" aria-hidden="true"></span>`);
  }
  const floorLook = `df-floor${v === null ? ' unset' : ''}`;
  let floor;
  if (s.edit) {
    const action = {type: 'set', station: i, h: v === 0 ? null : 0};
    floor = `<button type="button" class="${floorLook}${hinted(s.shown, action)}" ${moveAttrs(action, `df-${i}-0`)} aria-label="${esc(v === 0 ? `Clear ${LETTERS[i]}` : `${LETTERS[i]}, 0 high`)}"></button>`;
  } else floor = `<span class="${floorLook}" aria-hidden="true"></span>`;
  const foot = `<span class="df-foot" aria-hidden="true"><i>${LETTERS[i]}</i><b>${v === null ? '' : v}</b></span>`;
  const mark = s.marks?.has(i) ? ' marked' : '', claimed = s.claimed?.has(i) ? ' claimed' : '';
  const body = `<span class="df-tower">${cells.join('')}</span>${floor}${foot}`;
  if (s.picking) return `<button type="button" class="df-st df-pick s${i}${mark}" data-action="mechanic-ui" data-ui='${JSON.stringify({mark: i})}' data-focus="df-mark-${i}" aria-pressed="${s.marks.has(i)}" aria-label="${esc(`${LETTERS[i]}, ${heightWords(v)}`)}">${body}</button>`;
  return `<div class="df-st s${i}${claimed}" role="group" aria-label="${esc(`${LETTERS[i]}, ${heightWords(v)}`)}">${body}</div>`;
}
function ringHtml(r, s) {
  const n = r.length, g = r.map((v, i) => v === null || r[(i + 1) % n] === null ? null : Math.abs(v - r[(i + 1) % n]));
  const arrows = r.map((_, i) => {
    const claimed = s.claimedArrows?.has(i) ? ' claimed' : '';
    return `<span class="df-arrow a${i}${claimed}" aria-hidden="true"><b class="df-gap${g[i] === null ? ' unset' : ''}">${g[i] ?? ''}</b><i>${(n === 4 ? ARROWS4 : ARROWS3)[i]}</i></span>`;
  });
  const gapWords = s.gaps && complete(r) ? ` Gaps ${g.join(', ')}.` : '';
  return `<div class="df-ring n${n}${s.edit ? ' df-edit' : ''}${s.cls ? ` ${s.cls}` : ''}" style="--cap:${s.cap}" role="group" aria-label="${esc(`${s.label}: ${r.map((v, i) => `${LETTERS[i]} ${heightWords(v)}`).join(', ')}.${gapWords}`)}">${r.map((_, i) => station(r, i, s)).join('')}${s.gaps ? arrows.join('') : ''}</div>`;
}
// A small ring of numbers, for the run and the rings found.
const miniHtml = (r, cls = '') => `<span class="df-mini n${r.length}${cls}" aria-hidden="true">${r.map((v, i) => `<i class="m${i}">${v}</i>`).join('')}</span>`;
const ringWords = r => r.map((v, i) => `${LETTERS[i]} ${v}`).join(', ');
const pair = (left, right) => `<div class="df-pair">${left}<span class="df-to" aria-hidden="true">→</span>${right}</div>`;

function renderMake(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const showCant = shown?.type === 'cant';
  // The towers on the right are tappable only after Can't, all alike: no tap of the certificate is marked.
  const picking = !done && q.cant && state.claiming && b.refused === null && complete(b.old);
  const claimed = b.claim ? new Set(b.claim) : null;
  const left = ringHtml(b.old, {edit: !done, cap: q.cap, shown, gaps: true, label: 'Your ring', claimedArrows: claimed});
  const right = ringHtml(q.target, {cap: q.cap, label: 'Make', picking, marks: new Set(state.marks), claimed, cls: 'df-target'});
  let tools = '';
  if (!done && q.cant) {
    const ready = complete(b.old) && b.refused === null;
    const submit = state.claiming && state.marks.length;
    const attrs = submit ? moveAttrs({type: 'cant', marks: [...state.marks].sort((x, y) => x - y)}, 'df-cant') : `data-action="mechanic-ui" data-ui='${JSON.stringify({claiming: !state.claiming})}' data-focus="df-cant"`;
    tools = `<div class="df-tools"><button type="button" class="secondary df-cant${showCant && !submit ? ' hinted' : ''}" ${attrs}${submit ? ' aria-label="Can’t: check marks"' : ''} aria-pressed="${Boolean(state.claiming && ready)}" ${ready ? '' : 'disabled'}>Can’t</button></div>`;
  }
  const why = b.claim ? certificate(q.target, b.claim) : null;
  const note = b.refused ? 'Those don’t rule it out.' : why === 'zeros' ? 'Three 0 gaps make all four towers equal.' : why === 'odd' ? 'Odd and even can’t swap an odd number of times round a ring.' : '';
  const status = `${ringWords(b.old.map(v => v ?? '–'))}.${complete(b.old) ? ` Gaps ${gaps(b.old).join(', ')}.` : ''}${note ? ` ${note}` : ''}`;
  return `<div class="df-board${done ? ' solved' : ''}${b.refused ? ' refused' : ''}" data-mechanic-wire="diffs">${pair(left, right)}${tools}${note ? `<p class="df-note${b.refused ? ' bad' : ''}">${esc(note)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderEvery(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const left = ringHtml(b.old, {edit: !done, cap: q.cap, shown, gaps: true, label: 'Your ring'});
  const right = ringHtml(q.target, {cap: q.cap, label: 'Make', cls: 'df-target'});
  const now = complete(b.old) ? keyOf(b.old) : null;
  const found = b.found.length ? `<ol class="df-found" aria-label="Rings found">${b.found.map(k => `<li${k === now ? ' class="now"' : ''} aria-label="${esc(ringWords(k.split(',')))}">${miniHtml(k.split(',').map(Number))}</li>`).join('')}</ol>` : '';
  const all = done ? '' : `<div class="df-tools"><button type="button" class="primary df-all${hinted(shown, {type: 'all'})}" ${moveAttrs({type: 'all'}, 'df-all')} ${b.told === 'more' ? 'disabled' : ''}>That’s all</button></div>`;
  const note = b.told === 'more' ? 'There is another.' : '';
  const status = `${ringWords(b.old.map(v => v ?? '–'))}.${complete(b.old) ? ` Gaps ${gaps(b.old).join(', ')}.` : ''}${note ? ` ${note}` : ''}`;
  return `<div class="df-board${done ? ' solved' : ''}" data-mechanic-wire="diffs">${pair(left, right)}${found}${all}${note ? `<p class="df-note bad">${note}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderGrow(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), cap = capOf(q), n = stationsOf(q);
  const shown = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b).action : null;
  const top = topOf(q, b), canLift = !done && b.run.length > startOf(q).length;
  const big = done ? `<div class="df-pair">${ringHtml(b.run[0], {cap, label: 'Start', gaps: true, cls: 'df-target'})}</div>`
    : pair(ringHtml(b.draft, {edit: true, cap, shown, gaps: true, label: 'Your ring'}), ringHtml(top, {cap, label: 'Make', cls: 'df-target'}));
  // The run, oldest first, then zero; empty slots stand for the rings still to build.
  const loopAt = done && q.goal?.loop ? b.run.findIndex((r, k) => k > 0 && same(r, b.run[0])) : -1;
  const items = b.run.map((r, k) => {
    const cls = k === 0 || k === loopAt ? (loopAt >= 0 ? ' loop' : '') : '';
    if (k === 0 && canLift) return `<li><button type="button" class="df-lift${hinted(shown, {type: 'lift'})}" ${moveAttrs({type: 'lift'}, 'df-lift')} aria-label="${esc(`Take back ${ringWords(r)}`)}">${miniHtml(r)}</button></li>`;
    return `<li aria-label="${esc(ringWords(r))}">${miniHtml(r, cls)}</li>`;
  });
  const slots = q.goal?.moves ? Array.from({length: q.goal.moves - b.run.length}, () => '<li class="slot" aria-hidden="true"><span class="df-mini empty"></span></li>') : [];
  const tail = startOf(q).length ? [] : [`<li class="zero" aria-label="All zeros">${miniHtml(zero(n))}</li>`];
  const strip = `<ol class="df-run${done ? ' solved' : ''}" aria-label="Run">${[...slots, ...items, ...tail].join('')}</ol>`;
  const status = done ? `Done: ${b.run.map(ringWords).join('; then ')}.` : `${ringWords(b.draft.map(v => v ?? '–'))}.${complete(b.draft) ? ` Gaps ${gaps(b.draft).join(', ')}.` : ''} Make ${ringWords(top)}. ${b.run.length} ${b.run.length === 1 ? 'ring' : 'rings'} built.`;
  return `<div class="df-board df-grow${done ? ' solved' : ''}" data-mechanic-wire="diffs">${big}${strip}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const render = (p, a) => growing(p.parameters) ? renderGrow(p, a) : p.parameters.mode === 'every' ? renderEvery(p, a) : renderMake(p, a);

export const diffMechanics = {
  diffs: {
    fresh, valid, solved, hint, render,
    move(p, b, action) { const next = move(p, b, action); if (next) calm(p); return next; },
    // Can't: press it, tap the towers on the right that show why, press it again.
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      if (typeof payload.claiming === 'boolean') Object.assign(state, {claiming: payload.claiming, marks: []});
      if (int(payload.mark)) state.claiming = true;
      if (int(payload.mark)) state.marks = state.marks.includes(payload.mark) ? state.marks.filter(i => i !== payload.mark) : [...state.marks, payload.mark].sort((x, y) => x - y);
    },
    reset: p => { view.delete(p.id); },
    // Undo takes back towers, never what was learned: a refused Can't stays
    // refused, the rings found stay found and That's all keeps waiting.
    carry(p, from, to) {
      calm(p);
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      if (q.mode === 'make' && from.refused) return {...to, refused: from.refused};
      if (q.mode === 'every' && Array.isArray(from.found)) {
        const found = [...new Set([...from.found, ...(complete(to.old) && answerKeys(q).includes(keyOf(to.old)) ? [keyOf(to.old)] : [])])].sort();
        return {...to, found, told: found.length === answerKeys(q).length ? null : from.told};
      }
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'diffs',
  family: {id: 'diffs', symbol: 'Δ'},
  mechanics: diffMechanics,
  pack: new URL('./diffs.json', import.meta.url).href,
  css: new URL('./diffs.css', import.meta.url).href,
  focus: '.df-edit button.df-cell,.df-edit button.df-floor,.df-lift'
};
