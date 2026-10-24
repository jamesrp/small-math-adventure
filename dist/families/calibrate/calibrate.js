// Hidden machines (worksheet Week 94, calibration lab), a group in Ruler strips. A
// hidden machine takes a strip's length L and reports c·L + e: c copies of the
// strip and then e more units. Reports share one extra, so (x + t, e − t)
// read the same: two reports fix only the difference of two hidden lengths,
// and one known strip fixes the extra. Two different known lengths fix c and
// e; one request does so for every machine with c in 1–3 and e in 0–6 exactly
// when L ≥ 7. Three reports from one machine can be checked, and a wrong one
// repaired: one way for an extra-only machine, up to three ways for a stretch
// and a shift. Displays off by up to 1 leave the stretch in a range 4/D wide
// for references D apart.
//
// The machine in the request puzzles is slippery: it keeps every machine that
// fits the reports so far and answers each request in the way that leaves the
// most doubt, so a round is won only by requests that always work.
// See docs/calibrate/README.md.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (a, b) => Object.keys(a).sort().join() === Object.keys(b).sort().join();
export const MODES = ['find', 'every', 'build', 'repair', 'stretch'];
const range = (lo, hi, step = 1) => { const out = []; for (let v = lo; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(4))); return out; };

// --- Machines -------------------------------------------------------------------
export const machinesOf = q => q.copies.flatMap(c => range(q.extras[0], q.extras[1]).map(e => [c, e]));
export const report = ([c, e], L) => c * L + e;
export const keyOf = m => m.join(',');
export const lengthOf = (q, strips) => strips.reduce((t, s) => t + q.kit[s], 0);
// Every request the kit can make: a set of different strips laid end to end.
export function requestsOf(q) {
  const letters = Object.keys(q.kit), out = [];
  for (let mask = 1; mask < 1 << letters.length; mask++) {
    const strips = letters.filter((_, i) => mask & 1 << i);
    if (strips.length <= q.tray) out.push(strips);
  }
  return out;
}
export const requestLengths = q => [...new Set(requestsOf(q).map(r => lengthOf(q, r)))].sort((a, b) => a - b);
const groupBy = (ms, L) => { const g = new Map(); for (const m of ms) { const r = report(m, L); g.set(r, [...(g.get(r) || []), m]); } return g; };
// The fewest further requests that always leave one machine, or Infinity past `most`.
const neededCache = new Map();
export function needed(q, ms, most) {
  if (ms.length <= 1) return 0;
  if (most <= 0) return Infinity;
  const key = JSON.stringify([q.kit, q.tray, ms, most]);
  if (neededCache.has(key)) return neededCache.get(key);
  let best = Infinity;
  for (const L of requestLengths(q)) {
    const groups = [...groupBy(ms, L).values()];
    if (groups.length === 1) continue;
    const worst = Math.max(...groups.map(g => needed(q, g, most - 1)));
    best = Math.min(best, 1 + worst);
    if (best === 1) break;
  }
  neededCache.set(key, best);
  return best;
}
// The slippery machine's answer to a request: the report whose machines are
// hardest to tell apart with the requests left, then the most machines. Among
// answers that are just as good it takes one that turns with the request and
// the position, so no report (and no start of the dials) is always right.
export function answer(q, ms, L, left) {
  const groups = [...groupBy(ms, L).entries()].sort((x, y) => x[0] - y[0]);
  const score = ([, g]) => [needed(q, g, Math.max(left, 0)), g.length];
  const best = groups.map(score).reduce((a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] >= b[1]) ? a : b);
  const tied = groups.filter(x => { const k = score(x); return k[0] === best[0] && k[1] === best[1]; });
  return tied[(L * 7 + Math.max(left, 0) * 3 + ms.length * 5) % tied.length];
}
// The reports a list of requests gets, and the machines that still fit.
export function play(q, requests) {
  let ms = machinesOf(q);
  const reports = [];
  requests.forEach((strips, k) => {
    const [r, g] = answer(q, ms, lengthOf(q, strips), q.budget - k - 1);
    reports.push(r); ms = g;
  });
  return {reports, alive: ms};
}
// A request from here after which the round can still always be won with the
// requests left: fewest requests to finish, then fewest strips, then shortest.
export function winningRequest(q, ms, left) {
  const cost = r => { const groups = [...groupBy(ms, lengthOf(q, r)).values()]; return 1 + Math.max(...groups.map(g => needed(q, g, left - 1))); };
  const ok = requestsOf(q).map(r => [r, cost(r)]).filter(([, c]) => c <= left);
  ok.sort(([a, x], [b, y]) => x - y || a.length - b.length || lengthOf(q, a) - lengthOf(q, b));
  return ok.length ? ok[0][0] : null;
}

// --- Builds, repairs and stretches -----------------------------------------------
// build: rows {name, report, length?}; a row with a length is a known strip.
export const rowFits = (row, len, e) => (row.length ?? len[row.name]) + e === row.report;
export const hidden = q => q.rows.filter(r => r.length === undefined).map(r => r.name);
export function buildAnswers(q) {
  const out = [];
  for (const e of range(q.extras[0], q.extras[1])) {
    const len = Object.fromEntries(hidden(q).map(n => [n, q.rows.find(r => r.name === n).report - e]));
    if (Object.values(len).every(v => v >= 1) && q.rows.every(r => rowFits(r, len, e))) out.push({...len, e});
  }
  return out;
}
export const buildKey = (q, x) => [...hidden(q).map(n => x[n]), x.e].join(',');
// every: the machines that fit every given request and report.
export const fitsGiven = (q, m) => q.given.every(([L, r]) => report(m, L) === r);
export const everyAnswers = q => machinesOf(q).filter(m => fitsGiven(q, m));
// repair: rows [[x, y]...]; a list fits an extra-only machine when every y − x
// is the same allowed extra, a stretch-and-shift machine when the points lie on
// one line going up.
export function fitsList(q, ys) {
  const xs = q.rows.map(([x]) => x);
  if (q.machine === 'extra') { const d = ys.map((y, i) => y - xs[i]); return d.every(v => v === d[0]) && d[0] >= q.extras[0] && d[0] <= q.extras[1]; }
  const s = (ys[1] - ys[0]) / (xs[1] - xs[0]);
  return s > 0 && xs.every((x, i) => Math.abs(ys[0] + s * (x - xs[0]) - ys[i]) < 1e-9);
}
export const repairKey = ([i, v]) => `${i}:${v}`;
export function repairAnswers(q) {
  const out = [];
  q.rows.forEach(([, y], i) => {
    for (const v of range(q.lo, q.hi, q.step)) if (v !== y && fitsList(q, q.rows.map(([, w], j) => j === i ? v : w))) out.push([i, v]);
  });
  return out;
}
// stretch: references [[x, shown]...]; each true report within err of what is shown.
export const stretchOf = (q, t) => (t[1] - t[0]) / (q.refs[1][0] - q.refs[0][0]);
export function stretchExtremes(q) {
  const opts = q.refs.map(([, d]) => range(d - q.err, d + q.err, q.step));
  let lo = Infinity, hi = -Infinity;
  for (const a of opts[0]) for (const b of opts[1]) { const s = stretchOf(q, [a, b]); lo = Math.min(lo, s); hi = Math.max(hi, s); }
  return {lo, hi};
}

// --- Boards ---------------------------------------------------------------------
// find:    {tray, requests, dials, named}      every: {dials, found, told, done}
// build:   {len, e, found?, told?, done?}       repair: {pick, value, found, told, done}
// stretch: {t, pins, told}
// Reports in find puzzles are never saved: they are replayed from the
// requests. A pair, machine or repair is kept the moment it is made, and Undo
// keeps it; That’s all is judged on the press, and a wrong one stays off until
// something new is kept. Pins are judged together, as in Ruler strips.
const catalog = q => q.mode === 'every' || q.mode === 'repair' || (q.mode === 'build' && q.every);
export function answersOf(q) {
  if (q.mode === 'every') return everyAnswers(q).map(keyOf);
  if (q.mode === 'repair') return repairAnswers(q).map(repairKey);
  if (q.mode === 'build') return buildAnswers(q).map(x => buildKey(q, x));
  return null;
}
const dialsFit = (q, d) => q.copies.includes(d.c) && Number.isInteger(d.e) && d.e >= q.extras[0] && d.e <= q.extras[1];
const startDials = q => ({c: q.copies[0], e: q.extras[0]});
// In a request round the dials start unset (copies fixed when there is one choice), so no start is ever a fit.
const freshDials = q => ({c: q.copies.length === 1 ? q.copies[0] : null, e: null});
const dialOk = (q, d) => (d.c === null || q.copies.includes(d.c)) && (d.e === null || (Number.isInteger(d.e) && d.e >= q.extras[0] && d.e <= q.extras[1]));
const dialsSet = d => d.c !== null && d.e !== null;
// The dials can be named only when they meet every report, and there is at least one:
// a loss then always means a machine that fits was named while another fits too.
const dialsFitReports = (q, b) => b.requests.length > 0 && dialsSet(b.dials) && play(q, b.requests).alive.some(m => keyOf(m) === keyOf([b.dials.c, b.dials.e]));
function credit(q, b) {
  let key = null;
  if (q.mode === 'every' && fitsGiven(q, [b.dials.c, b.dials.e])) key = keyOf([b.dials.c, b.dials.e]);
  if (q.mode === 'build' && b.e !== null && hidden(q).every(n => b.len[n] !== null) && q.rows.every(r => rowFits(r, b.len, b.e))) key = buildKey(q, {...b.len, e: b.e});
  if (q.mode === 'repair' && b.pick !== null && b.value !== q.rows[b.pick][1] && fitsList(q, q.rows.map(([, y], j) => j === b.pick ? b.value : y))) key = repairKey([b.pick, b.value]);
  if (key === null || !q.every && q.mode === 'build' || b.found.includes(key)) return b;
  const order = answersOf(q);
  return {...b, found: [...b.found, key].sort((x, y) => order.indexOf(x) - order.indexOf(y)), told: null};
}
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'find') return {tray: [], requests: [], dials: freshDials(q), named: null};
  if (q.mode === 'every') return {dials: startDials(q), found: [], told: null, done: false};
  if (q.mode === 'build') return {len: Object.fromEntries(hidden(q).map(n => [n, null])), e: null, ...(q.every ? {found: [], told: null, done: false} : {})};
  if (q.mode === 'repair') return {pick: null, value: null, found: [], told: null, done: false};
  return {t: q.refs.map(([, d]) => d), pins: [], told: null};
}
const sortedBy = (list, order) => list.every((x, i) => i === 0 || order.indexOf(list[i - 1]) < order.indexOf(x));
function validShelf(q, b) {
  const order = answersOf(q);
  if (!Array.isArray(b.found) || typeof b.done !== 'boolean' || !(b.told === null || b.told === 'more')) return false;
  if (!b.found.every(k => order.includes(k)) || new Set(b.found).size !== b.found.length || !sortedBy(b.found, order)) return false;
  if (b.done && b.found.length !== order.length) return false;
  return !(b.told && (b.done || !b.found.length || b.found.length === order.length));
}
const onStep = (q, v) => Number.isFinite(v) && Math.abs(v / q.step - Math.round(v / q.step)) < 1e-9;
export function judge(q, pins) {
  const e = stretchExtremes(q), s = pins.map(t => stretchOf(q, t));
  if (Math.max(...s) < e.hi) return 'steeper';
  if (Math.min(...s) > e.lo) return 'shallower';
  return null;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'find') {
    if (!sameKeys(b, {tray: 0, requests: 0, dials: 0, named: 0}) || !object(b.dials) || !sameKeys(b.dials, {c: 0, e: 0}) || !dialOk(q, b.dials)) return false;
    if (q.copies.length === 1 && b.dials.c !== q.copies[0]) return false;
    const strips = list => Array.isArray(list) && list.every(s => Object.hasOwn(q.kit, s)) && new Set(list).size === list.length && list.length <= q.tray;
    if (!strips(b.tray) || !Array.isArray(b.requests) || b.requests.length > q.budget || !b.requests.every(r => strips(r) && r.length > 0)) return false;
    if (b.named === null) return b.requests.length < q.budget || b.tray.length === 0;
    if (!['won', 'lost'].includes(b.named) || b.tray.length || !dialsFitReports(q, b)) return false;
    return b.named === verdict(q, b);
  }
  if (q.mode === 'every') return sameKeys(b, {dials: 0, found: 0, told: 0, done: 0}) && object(b.dials) && sameKeys(b.dials, {c: 0, e: 0}) && dialsFit(q, b.dials) && validShelf(q, b);
  if (q.mode === 'build') {
    if (!sameKeys(b, {len: 0, e: 0, ...(q.every ? {found: 0, told: 0, done: 0} : {})}) || !object(b.len) || !sameKeys(b.len, Object.fromEntries(hidden(q).map(n => [n, 0])))) return false;
    if (!Object.values(b.len).every(v => v === null || (Number.isInteger(v) && v >= 1 && v <= q.longest))) return false;
    if (!(b.e === null || (Number.isInteger(b.e) && b.e >= q.extras[0] && b.e <= q.extras[1]))) return false;
    return !q.every || validShelf(q, b);
  }
  if (q.mode === 'repair') {
    if (!sameKeys(b, {pick: 0, value: 0, found: 0, told: 0, done: 0})) return false;
    if (b.pick === null) { if (b.value !== null) return false; }
    else if (!Number.isInteger(b.pick) || b.pick < 0 || b.pick >= q.rows.length || !onStep(q, b.value) || b.value < q.lo || b.value > q.hi) return false;
    return validShelf(q, b);
  }
  if (!sameKeys(b, {t: 0, pins: 0, told: 0}) || !Array.isArray(b.t) || b.t.length !== 2) return false;
  const inBars = t => Array.isArray(t) && t.length === 2 && t.every((v, i) => onStep(q, v) && Math.abs(v - q.refs[i][1]) <= q.err + 1e-9);
  if (!inBars(b.t) || !Array.isArray(b.pins) || b.pins.length > 2 || !b.pins.every(inBars)) return false;
  if (b.pins.length === 2 && judge(q, b.pins)) return false;
  return b.told === null || (['steeper', 'shallower'].includes(b.told) && !b.pins.length);
}
// A round is over, and lost, when every request is used and two machines still fit.
const over = (q, b) => b.named === null && b.requests.length === q.budget && play(q, b.requests).alive.length > 1;
const lostRound = (q, b) => b.named === 'lost' || over(q, b);
// A named machine wins when it is the one machine that fits every report.
function verdict(q, b) {
  const {alive} = play(q, b.requests);
  return alive.length === 1 && keyOf(alive[0]) === keyOf([b.dials.c, b.dials.e]) ? 'won' : 'lost';
}
function solved(p, b) {
  const q = p.parameters;
  if (!valid(p, b)) return false;
  if (q.mode === 'find') return b.named === 'won';
  if (q.mode === 'build' && !q.every) return b.e !== null && hidden(q).every(n => b.len[n] !== null) && q.rows.every(r => rowFits(r, b.len, b.e));
  if (q.mode === 'stretch') return b.pins.length === 2;
  return b.done;
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || !object(action)) return null;
  if (q.mode === 'find' && action.type === 'again') return lostRound(q, b) ? fresh(p) : null;
  if (solved(p, b)) return null;
  const {type} = action;
  if (q.mode === 'find') {
    if (b.named || over(q, b)) return null;
    if (type === 'strip') {
      if (!Object.hasOwn(q.kit, action.strip) || b.requests.length >= q.budget) return null;
      const tray = b.tray.includes(action.strip) ? b.tray.filter(s => s !== action.strip) : [...b.tray, action.strip];
      // A tray for one strip swaps it; a longer tray refuses one too many.
      if (tray.length > q.tray) return q.tray === 1 ? {...b, tray: [action.strip]} : null;
      return {...b, tray};
    }
    if (type === 'send') return b.tray.length && b.requests.length < q.budget ? {...b, tray: [], requests: [...b.requests, b.tray]} : null;
    if (type === 'dial') {
      const dials = {...b.dials, [action.which]: action.value};
      return ['c', 'e'].includes(action.which) && action.value !== null && dialOk(q, dials) && dials[action.which] !== b.dials[action.which] ? {...b, dials} : null;
    }
    if (type === 'name') { if (!dialsFitReports(q, b)) return null; const next = {...b, tray: []}; return {...next, named: verdict(q, next)}; }
    return null;
  }
  if (type === 'all' && catalog(q)) {
    if (!b.found.length || b.told) return null;
    return b.found.length === answersOf(q).length ? {...b, done: true} : {...b, told: 'more'};
  }
  if (q.mode === 'every' && type === 'dial') {
    const dials = {...b.dials, [action.which]: action.value};
    return ['c', 'e'].includes(action.which) && dialsFit(q, dials) && dials[action.which] !== b.dials[action.which] ? credit(q, {...b, dials}) : null;
  }
  if (q.mode === 'build' && type === 'set') {
    const v = action.value;
    if (action.which === 'e') { if (!Number.isInteger(v) || v < q.extras[0] || v > q.extras[1] || v === b.e) return null; return credit(q, {...b, e: v}); }
    if (!hidden(q).includes(action.which) || !Number.isInteger(v) || v < 1 || v > q.longest || v === b.len[action.which]) return null;
    return credit(q, {...b, len: {...b.len, [action.which]: v}});
  }
  if (q.mode === 'repair') {
    if (type === 'pick') { if (!Number.isInteger(action.row) || action.row < 0 || action.row >= q.rows.length || action.row === b.pick) return null; return {...b, pick: action.row, value: q.rows[action.row][1]}; }
    if (type === 'step') {
      if (b.pick === null || ![1, -1].includes(action.by)) return null;
      const value = Number((b.value + action.by * q.step).toFixed(4));
      return value < q.lo || value > q.hi ? null : credit(q, {...b, value});
    }
    return null;
  }
  if (q.mode === 'stretch') {
    if (type === 'step') {
      const i = action.ref, t = [...b.t];
      if (![0, 1].includes(i) || ![1, -1].includes(action.by)) return null;
      t[i] = Number((t[i] + action.by * q.step).toFixed(4));
      return Math.abs(t[i] - q.refs[i][1]) > q.err + 1e-9 ? null : {...b, t, told: null};
    }
    if (type === 'pin') {
      const pins = [...b.pins, [...b.t]];
      if (pins.length < 2) return {...b, pins, told: null};
      const wrong = judge(q, pins);
      return wrong ? {...b, pins: [], told: wrong} : {...b, pins, told: null};
    }
  }
  return null;
}

// --- Words ----------------------------------------------------------------------
export function fmt(v) {
  const w = Math.floor(v + 1e-9), r = Number((v - w).toFixed(4));
  if (!r) return String(w);
  const glyph = {0.25: '¼', 0.5: '½', 0.75: '¾'}[r];
  if (glyph) return w ? `${w}${glyph}` : glyph;
  // A stretch such as 2 1/16: the smallest denominator up to 64 that gives it.
  for (let d = 2; d <= 64; d++) { const n = Math.round(r * d); if (Math.abs(n / d - r) < 1e-9) return w ? `${w} ${n}/${d}` : `${n}/${d}`; }
  return String(v);
}
// The same number in a line of text: a fraction such as 1/16 drawn small, in the style of ½.
export function fmtHtml(v) {
  const s = fmt(v), m = s.match(/^(?:(\d+) )?(\d+)\/(\d+)$/);
  return m ? `${m[1] || ''}<span class="cb-frac"><sup>${m[2]}</sup>⁄<sub>${m[3]}</sub></span>` : esc(s);
}
export const machineWords = (q, [c, e]) => q.copies.length > 1 ? `copies ${c}, extra ${e}` : `extra ${e}`;
const COLORS = {A: 'sun', B: 'sky', C: 'rose', D: 'sage', P: 'lilac', Q: 'mint', K: 'sun'};

// --- Hints ----------------------------------------------------------------------
function plan(p, b) {
  const q = p.parameters;
  if (q.mode === 'find') {
    if (lostRound(q, b)) return {type: 'move', action: {type: 'again'}, text: 'Start a new round.'};
    const {alive} = play(q, b.requests), left = q.budget - b.requests.length;
    if (alive.length === 1) {
      const [c, e] = alive[0];
      if (b.dials.c !== c) return {type: 'move', action: {type: 'dial', which: 'c', value: c}, text: `Set the copies to ${c}.`};
      if (b.dials.e !== e) return {type: 'move', action: {type: 'dial', which: 'e', value: e}, text: `Set the extra to ${e}.`};
      return {type: 'move', action: {type: 'name'}, text: 'Only this machine fits every report.'};
    }
    const goal = left > 0 ? winningRequest(q, alive, left) : null;
    if (!goal) return {type: 'deadend', text: 'Two machines can still fit every report. Start a new round.'};
    const extra = b.tray.find(s => !goal.includes(s)), missing = goal.find(s => !b.tray.includes(s));
    if (missing && q.tray === 1) return {type: 'move', action: {type: 'strip', strip: missing}, text: `Put ${missing} in the tray.`};
    if (extra) return {type: 'move', action: {type: 'strip', strip: extra}, text: `Take ${extra} out of the tray.`};
    if (missing) return {type: 'move', action: {type: 'strip', strip: missing}, text: `Put ${missing} in the tray.`};
    const L = lengthOf(q, goal);
    return {type: 'move', action: {type: 'send'}, text: left === 1 ? `A request ${L} long gets a different report from every machine that still fits.` : `After a request ${L} long, one more request can always tell the machines apart.`};
  }
  if (q.mode === 'every') {
    const missing = everyAnswers(q).filter(m => !b.found.includes(keyOf(m)));
    if (!missing.length) return {type: 'move', action: {type: 'all'}, text: 'Every machine that fits is on the shelf.'};
    const [c, e] = missing.find(m => m[0] === b.dials.c) || missing[0];
    if (b.dials.c !== c) return {type: 'move', action: {type: 'dial', which: 'c', value: c}, text: `Set the copies to ${c}.`};
    return {type: 'move', action: {type: 'dial', which: 'e', value: e}, text: `Set the extra to ${e}.`};
  }
  if (q.mode === 'build') {
    const answers = buildAnswers(q), have = new Set(q.every ? b.found : []), missing = answers.filter(x => !have.has(buildKey(q, x)));
    if (!missing.length) return {type: 'move', action: {type: 'all'}, text: 'Every pair is on the shelf.'};
    const near = x => (b.e === x.e ? 0 : 1) + hidden(q).filter(n => b.len[n] !== x[n]).length;
    const goal = missing.reduce((x, y) => near(y) < near(x) ? y : x);
    if (b.e !== goal.e) return {type: 'move', action: {type: 'set', which: 'e', value: goal.e}, text: `Set the extra to ${goal.e}.`};
    const n = hidden(q).find(m => b.len[m] !== goal[m]);
    return {type: 'move', action: {type: 'set', which: n, value: goal[n]}, text: `Make ${n} ${goal[n]} long.`};
  }
  if (q.mode === 'repair') {
    const missing = repairAnswers(q).filter(x => !b.found.includes(repairKey(x)));
    if (!missing.length) return {type: 'move', action: {type: 'all'}, text: 'Every repair is on the shelf.'};
    const [i, v] = missing.find(([j]) => j === b.pick) || missing[0];
    if (b.pick !== i) return {type: 'move', action: {type: 'pick', row: i}, text: `Change the ${fmt(q.rows[i][0])} → ${fmt(q.rows[i][1])} report.`};
    const by = v > b.value ? 1 : -1;
    return {type: 'move', action: {type: 'step', by}, text: `Make it ${by > 0 ? 'bigger' : 'smaller'}: ${fmt(v)}.`};
  }
  const e = stretchExtremes(q);
  // The settings of the steepest and the shallowest line: the bars' opposite ends.
  const steep = [q.refs[0][1] - q.err, q.refs[1][1] + q.err], flat = [q.refs[0][1] + q.err, q.refs[1][1] - q.err];
  // The pins are judged together, so a first pin that is neither line is never
  // called wrong (a dead end would show at once): the hint goes on to the
  // steepest line, and the pair is refused when the second goes in.
  const nearer = stretchOf(q, b.t) - e.lo <= e.hi - stretchOf(q, b.t) ? flat : steep, first = b.pins.length ? stretchOf(q, b.pins[0]) : null;
  const target = first === null ? nearer : first === e.hi ? flat : first === e.lo ? steep : steep;
  const told = first !== null && first !== e.hi && first !== e.lo ? 'The two pins are checked together. ' : '';
  const i = b.t.findIndex((v, k) => v !== target[k]);
  if (i >= 0) { const by = target[i] > b.t[i] ? 1 : -1; return {type: 'move', action: {type: 'step', ref: i, by}, text: `${told}Move the ${fmt(q.refs[i][0])} → ${fmt(b.t[i])} report ${by > 0 ? 'up' : 'down'}.`}; }
  return {type: 'move', action: {type: 'pin'}, text: `This is the ${target === steep ? 'steepest' : 'shallowest'} line: stretch ${fmt(stretchOf(q, target))}.`};
}
function hint(p, b) {
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solved(p, b)) return {type: 'done'};
  return plan(p, b);
}

// --- Drawing --------------------------------------------------------------------
// Bars: one ruler from 0, U across a unit; each row lays pieces end to end
// from 0 and has a report mark, a pine line with its number. Plots: lengths
// across, reports up.
const f = n => Number(n.toFixed(2));
const LEFT = 14, RIGHT = 9, ROW_H = 18, RULER_H = 16, BAR_W = 168;
function piecesRow(pieces, y, U) {
  let at = 0;
  return pieces.map(({w, cls, label}) => {
    const x = LEFT + at * U; at += w;
    return `<rect class="cb-piece ${cls}" x="${f(x)}" y="${y + 2}" width="${f(Math.max(w * U, 0.6))}" height="${ROW_H - 6}" rx="1.5"/>${label && w * U > 6 ? `<text class="cb-letter" x="${f(x + 2)}" y="${y + ROW_H / 2 + 2.6}">${esc(label)}</text>` : ''}`;
  }).join('');
}
const markAt = (v, y, U, cls = '') => `<g class="cb-mark ${cls}"><line x1="${f(LEFT + v * U)}" y1="${y}" x2="${f(LEFT + v * U)}" y2="${y + ROW_H - 1}"/></g>`;
// The rows of a bars board: [label, pieces, report, state] with state 'fit', 'off' or ''.
function barRows(q, b, spare = true) {
  if (q.mode === 'find' || q.mode === 'every') {
    const reqs = q.mode === 'find' ? b.requests.map((strips, k) => [strips, play(q, b.requests.slice(0, k + 1)).reports[k]]) : q.given.map(([L, r]) => [[{w: L}], r]);
    const rows = reqs.map(([strips, r]) => {
      const one = q.mode === 'find' ? strips.map(s => ({w: q.kit[s], cls: `s-${COLORS[s]}`, label: s})) : [{w: strips[0].w, cls: 's-sun', label: ''}];
      // The dials' own answer: copies of the request, then the extra, each once it is set;
      // until the copies are set, the row is labelled with what was sent.
      const pieces = b.dials.c === null ? [] : [...Array(b.dials.c)].flatMap(() => one).concat(b.dials.e ? [{w: b.dials.e, cls: 'cb-extra', label: ''}] : []);
      const end = pieces.reduce((t, x) => t + x.w, 0);
      return {pieces, report: r, state: dialsSet(b.dials) && end === r ? 'fit' : dialsSet(b.dials) ? 'off' : '', name: q.mode === 'find' && !pieces.length ? strips.join('') : undefined};
    });
    if (q.mode === 'find' && spare) for (let k = b.requests.length; k < q.budget; k++) rows.push({pieces: [], report: null, state: 'empty'});
    return rows;
  }
  if (q.mode === 'build') {
    return q.rows.map(r => {
      const len = r.length ?? b.len[r.name];
      // A row shows its strip, then the extra; a hidden strip not yet set shows nothing.
      const pieces = len ? [{w: len, cls: `s-${COLORS[r.name] || 'sun'}`, label: r.name}, ...(b.e ? [{w: b.e, cls: 'cb-extra', label: ''}] : [])] : [];
      const end = pieces.reduce((t, x) => t + x.w, 0);
      return {pieces, report: r.report, state: len && b.e !== null && end === r.report ? 'fit' : '', name: r.name};
    });
  }
  // repair, an extra-only machine: each length, then its extra up to the report.
  return q.rows.map(([x, y], i) => {
    const v = i === b.pick ? b.value : y;
    return {pieces: [{w: x, cls: 's-sun', label: ''}, ...(v > x ? [{w: v - x, cls: 'cb-extra', label: ''}] : [])], report: v, state: i === b.pick ? 'picked' : ''};
  });
}
function barsBoard(q, b, spare = true) {
  const rows = barRows(q, b, spare), U = BAR_W / q.ruler, W = LEFT + BAR_W + RIGHT, top = 4, bottom = top + rows.length * ROW_H + 3, H = bottom + RULER_H;
  const parts = [];
  for (let v = 0; v <= q.ruler; v++) parts.push(`<line class="cb-grid" x1="${f(LEFT + v * U)}" y1="${top}" x2="${f(LEFT + v * U)}" y2="${bottom}"/>`);
  rows.forEach((row, k) => {
    const y = top + k * ROW_H;
    if (row.state === 'empty') { parts.push(`<rect class="cb-empty" x="${LEFT}" y="${y + 2}" width="${BAR_W}" height="${ROW_H - 6}" rx="1.5"/>`); return; }
    if (row.name) parts.push(`<text class="cb-rowlabel" x="${LEFT - 4}" y="${y + ROW_H / 2 + 2.6}">${esc(row.name)}</text>`);
    parts.push(piecesRow(row.pieces, y, U));
    if (row.report !== null) {
      parts.push(markAt(row.report, y, U, row.state));
      parts.push(`<text class="cb-report${row.state === 'fit' ? ' fit' : ''}" x="${f(LEFT + row.report * U + 1.8)}" y="${y + 6.4}">${fmt(row.report)}</text>`);
    }
    if (row.state === 'fit') parts.push(`<text class="cb-tick" x="${W - 1}" y="${y + ROW_H / 2 + 3}">✓</text>`);
  });
  parts.push(`<line class="cb-ruler" x1="${LEFT}" y1="${bottom}" x2="${LEFT + BAR_W}" y2="${bottom}"/>`);
  const every = q.ruler > 24 ? 5 : q.ruler > 12 ? 2 : 1;
  for (let v = 0; v <= q.ruler; v++) parts.push(`<line class="cb-tick-line" x1="${f(LEFT + v * U)}" y1="${bottom}" x2="${f(LEFT + v * U)}" y2="${bottom + (v % every ? 1.8 : 3.4)}"/>${v % every ? '' : `<text class="cb-num" x="${f(LEFT + v * U)}" y="${bottom + 11}">${v}</text>`}`);
  return `<svg class="cb-board" viewBox="0 0 ${W} ${f(H)}" style="--cb-aspect:${f(W / H)}" role="img" aria-label="${esc(describeBars(q, b, rows))}">${parts.join('')}</svg>`;
}
function describeBars(q, b, rows) {
  return rows.filter(r => r.state !== 'empty').map(r => `${r.name ? `${r.name}: ` : ''}${r.pieces.reduce((t, x) => t + x.w, 0)} against the report ${fmt(r.report)}${r.state === 'fit' ? ', a fit' : ''}`).join('; ') || 'No requests yet.';
}
// A plot: lengths across from 0 to q.xmax, reports up from 0 to q.ymax.
function plotBoard(q, b) {
  const W = 180, H = 206, L = 18, B = 188, PW = W - L - 8, PH = B - 8;
  const px = x => L + x / q.xmax * PW, py = y => B - y / q.ymax * PH, parts = [];
  for (let x = 0; x <= q.xmax; x++) parts.push(`<line class="cb-grid" x1="${f(px(x))}" y1="${f(py(q.ymax))}" x2="${f(px(x))}" y2="${B}"/>`);
  for (let y = 0; y <= q.ymax; y += 2) parts.push(`<line class="cb-grid" x1="${L}" y1="${f(py(y))}" x2="${f(px(q.xmax))}" y2="${f(py(y))}"/>`);
  parts.push(`<line class="cb-ruler" x1="${L}" y1="${B}" x2="${f(px(q.xmax))}" y2="${B}"/><line class="cb-ruler" x1="${L}" y1="${B}" x2="${L}" y2="${f(py(q.ymax))}"/>`);
  for (let x = 0; x <= q.xmax; x += 2) parts.push(`<text class="cb-num" x="${f(px(x))}" y="${B + 8}">${x}</text>`);
  for (let y = 0; y <= q.ymax; y += 4) parts.push(`<text class="cb-num axis" x="${L - 3}" y="${f(py(y) + 2)}">${y}</text>`);
  const line = (pts, cls) => {
    const s = (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]), at = x => pts[0][1] + s * (x - pts[0][0]);
    let x1 = 0, x2 = q.xmax;
    const clip = x => Math.max(0, Math.min(q.xmax, x));
    if (at(x1) < 0) x1 = clip(pts[0][0] - pts[0][1] / s); if (at(x1) > q.ymax) x1 = clip(pts[0][0] + (q.ymax - pts[0][1]) / s);
    if (at(x2) > q.ymax) x2 = clip(pts[0][0] + (q.ymax - pts[0][1]) / s); if (at(x2) < 0) x2 = clip(pts[0][0] - pts[0][1] / s);
    return `<line class="${cls}" x1="${f(px(x1))}" y1="${f(py(at(x1)))}" x2="${f(px(x2))}" y2="${f(py(at(x2)))}"/>`;
  };
  if (q.mode === 'repair') {
    const ys = q.rows.map(([, y], i) => i === b.pick ? b.value : y), pts = q.rows.map(([x], i) => [x, ys[i]]);
    if (fitsList(q, ys)) parts.push(line(pts, 'cb-line'));
    pts.forEach(([x, y], i) => {
      if (i === b.pick && y !== q.rows[i][1]) parts.push(`<circle class="cb-was" cx="${f(px(x))}" cy="${f(py(q.rows[i][1]))}" r="2.2"/>`);
      parts.push(`<circle class="cb-point${i === b.pick ? ' picked' : ''}" cx="${f(px(x))}" cy="${f(py(y))}" r="2.6"/>`);
    });
  } else {
    // Each bar: every place the true report can be, with caps at its ends and the display across it.
    // Each bar is 14 wide, with a notch at every place the true report can stop.
    q.refs.forEach(([x, d]) => {
      const notches = range(d - q.err + q.step, d + q.err - q.step, q.step).map(v => `<line class="cb-notch" x1="${f(px(x) - 7)}" y1="${f(py(v))}" x2="${f(px(x) - 4.5)}" y2="${f(py(v))}"/><line class="cb-notch" x1="${f(px(x) + 4.5)}" y1="${f(py(v))}" x2="${f(px(x) + 7)}" y2="${f(py(v))}"/>`).join('');
      parts.push(`<rect class="cb-bar" x="${f(px(x) - 7)}" y="${f(py(d + q.err))}" width="14" height="${f(py(d - q.err) - py(d + q.err))}" rx="2"/>${notches}${[d - q.err, d + q.err].map(v => `<line class="cb-cap" x1="${f(px(x) - 9)}" y1="${f(py(v))}" x2="${f(px(x) + 9)}" y2="${f(py(v))}"/>`).join('')}<line class="cb-shown" x1="${f(px(x) - 7)}" y1="${f(py(d))}" x2="${f(px(x) + 7)}" y2="${f(py(d))}"/>`);
    });
    b.pins.forEach(t => parts.push(line(q.refs.map(([x], i) => [x, t[i]]), 'cb-pinned')));
    parts.push(line(q.refs.map(([x], i) => [x, b.t[i]]), 'cb-line'));
    q.refs.forEach(([x], i) => parts.push(`<circle class="cb-point true" cx="${f(px(x))}" cy="${f(py(b.t[i]))}" r="2.6"/>`));
  }
  const words = q.mode === 'repair' ? q.rows.map(([x, y], i) => `${fmt(x)} units: ${fmt(i === b.pick ? b.value : y)}`).join('; ') : `true reports ${b.t.map(fmt).join(' and ')}, stretch ${fmt(stretchOf(q, b.t))}`;
  return `<svg class="cb-board cb-plot" viewBox="0 0 ${W} ${H}" style="--cb-aspect:${f(W / H)}" role="img" aria-label="${esc(words)}">${parts.join('')}</svg>`;
}
const button = (label, action, {on = true, hinted = false, pressed = null, cls = 'secondary', aria = null} = {}) => `<button type="button" class="${cls} cb-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="cb-${esc(JSON.stringify(action))}"${pressed === null ? '' : ` aria-pressed="${pressed}"`}${aria ? ` aria-label="${esc(aria)}"` : ''} ${on ? '' : 'disabled'}>${label}</button>`;
const same = (x, y) => x && y && JSON.stringify(x) === JSON.stringify(y);
// A row of chips beside its name, or under it when they don't fit: one line
// where it fits, and on a narrow screen seven or more in two balanced lines
// (4 and 3, 5 and 4, 6 and 5), so no chip is left alone.
const chipRow = (name, chips, cls = '', aria = name) => `<div class="cb-dial${cls}" role="group" aria-label="${esc(aria)}"><span class="cb-dial-name">${name}</span><span class="cb-chips" style="--cols:${chips.length};--narrow:${chips.length <= 6 ? chips.length : Math.ceil(chips.length / 2)}">${chips.join('')}</span></div>`;
function dialRow(q, b, which, values, shown, live) {
  const name = which === 'c' ? 'Copies' : 'Extra';
  return chipRow(name, values.map(v => button(String(v), {type: 'dial', which, value: v}, {on: live, pressed: b.dials[which] === v, hinted: same(shown, {type: 'dial', which, value: v}), cls: 'cb-chip'})));
}
function stripChip(q, s, inTray, live, hinted) {
  const w = q.kit[s] * 9;
  return `<button type="button" class="cb-chip cb-strip-chip${inTray ? ' in' : ''}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'strip', strip: s}))}" data-focus="cb-strip-${s}" aria-pressed="${inTray}" aria-label="${s}, ${q.kit[s]} units" ${live ? '' : 'disabled'}><span class="cb-mini s-${COLORS[s]}" style="width:${w}px">${s}</span></button>`;
}
function controls(p, b, shown) {
  const q = p.parameters, done = solved(p, b);
  if (q.mode === 'find') {
    if (lostRound(q, b) || b.named) return '';
    const live = b.requests.length < q.budget;
    const tray = b.tray.length ? b.tray.map(s => `<span class="cb-mini s-${COLORS[s]}" style="width:${q.kit[s] * 9}px">${s}</span>`).join('') : '';
    // A full tray (of two or more) takes no other strip until one comes out,
    // so the others are drawn off, as Balance kits' and Water levels' full
    // pickers are (a tap there met the generic error).
    const room = s => b.tray.includes(s) || q.tray === 1 || b.tray.length < q.tray;
    return `<div class="cb-kit">${Object.keys(q.kit).map(s => stripChip(q, s, b.tray.includes(s), live && room(s), same(shown, {type: 'strip', strip: s}))).join('')}</div>`
      + `<div class="cb-trayline"><div class="cb-tray${b.tray.length ? '' : ' empty'}" aria-label="Tray">${tray}</div>${button('Send', {type: 'send'}, {on: b.tray.length > 0 && live, hinted: same(shown, {type: 'send'}), cls: 'primary'})}</div>`
      + (q.copies.length > 1 ? dialRow(q, b, 'c', q.copies, shown, true) : '') + dialRow(q, b, 'e', range(q.extras[0], q.extras[1]), shown, true)
      + `<div class="cb-bar-buttons">${button('That’s the machine', {type: 'name'}, {on: dialsFitReports(q, b), hinted: same(shown, {type: 'name'})})}</div>`;
  }
  if (done) return '';
  if (q.mode === 'every') return (q.copies.length > 1 ? dialRow(q, b, 'c', q.copies, shown, true) : '') + dialRow(q, b, 'e', range(q.extras[0], q.extras[1]), shown, true);
  if (q.mode === 'build') {
    const row = (which, label, values, now) => chipRow(label, values.map(v => button(String(v), {type: 'set', which, value: v}, {pressed: now === v, hinted: same(shown, {type: 'set', which, value: v}), cls: 'cb-chip'})));
    return hidden(q).map(n => row(n, n, range(1, q.longest), b.len[n])).join('') + row('e', 'Extra', range(q.extras[0], q.extras[1]), b.e);
  }
  if (q.mode === 'repair') {
    return `<div class="cb-dial" role="group" aria-label="Reports">${q.rows.map(([x, y], i) => button(`${fmt(x)} → ${fmt(i === b.pick ? b.value : y)}`, {type: 'pick', row: i}, {pressed: b.pick === i, hinted: same(shown, {type: 'pick', row: i}), cls: 'cb-chip cb-pair'})).join('')}</div>`
      + (b.pick === null ? '' : `<div class="cb-dial">${button('−', {type: 'step', by: -1}, {on: b.value - q.step >= q.lo - 1e-9, hinted: same(shown, {type: 'step', by: -1}), cls: 'cb-chip', aria: 'Smaller report'})}${button('+', {type: 'step', by: 1}, {on: b.value + q.step <= q.hi + 1e-9, hinted: same(shown, {type: 'step', by: 1}), cls: 'cb-chip', aria: 'Bigger report'})}</div>`);
  }
  // One row per reference, its name and both arrows together.
  // ▲ and ▼ are off at the ends of the error band (a press past it met the
  // generic error).
  const can = (i, by) => Math.abs(b.t[i] + by * q.step - q.refs[i][1]) <= q.err + 1e-9;
  const arrows = (x, i) => [button('▼', {type: 'step', ref: i, by: -1}, {on: can(i, -1), hinted: same(shown, {type: 'step', ref: i, by: -1}), cls: 'cb-chip', aria: `Lower the report for length ${fmt(x)}`}), button('▲', {type: 'step', ref: i, by: 1}, {on: can(i, 1), hinted: same(shown, {type: 'step', ref: i, by: 1}), cls: 'cb-chip', aria: `Raise the report for length ${fmt(x)}`})];
  return `<p class="cb-readout">Stretch ${fmtHtml(stretchOf(q, b.t))}${b.pins.length ? ` · pinned ${fmtHtml(stretchOf(q, b.pins[0]))}` : ''}</p>${q.refs.map(([x], i) => chipRow(`${fmt(x)} → ${fmt(b.t[i])}`, arrows(x, i), ' cb-ref', `Length ${fmt(x)}, report ${fmt(b.t[i])}`)).join('')}`
    + `<div class="cb-bar-buttons">${button('Pin', {type: 'pin'}, {hinted: same(shown, {type: 'pin'})})}</div>`;
}
function shelf(q, b, now) {
  if (!catalog(q) || !b.found.length) return '';
  const item = k => {
    if (q.mode === 'every') { const [c, e] = k.split(',').map(Number); return machineWords(q, [c, e]); }
    if (q.mode === 'repair') { const [i, v] = k.split(':'); return `${fmt(q.rows[i][0])} → ${fmt(Number(v))}`; }
    const vals = k.split(',').map(Number), names = hidden(q);
    return names.map((n, j) => `${n} ${vals[j]}`).join(', ');
  };
  return `<ul class="cb-shelf" aria-label="Found">${b.found.map(k => `<li class="cb-item${k === now ? ' now' : ''}">${esc(item(k))}</li>`).join('')}</ul>`;
}
const TOLD = {more: 'There is another.', steeper: 'A line can be steeper.', shallower: 'A line can be shallower.'};
function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const shown = a.hintLevel >= 2 && !done ? plan(p, b)?.action : null;
  const board = q.mode === 'stretch' || (q.mode === 'repair' && q.machine === 'line') ? plotBoard(q, b) : barsBoard(q, b);
  let note = '', after = '', lost = '';
  if (q.mode === 'find' && lostRound(q, b)) {
    // The certificate: two machines that fit every report (the named one
    // first), each drawn on the report rows with its ticks, in place of the board.
    const {alive} = play(q, b.requests), mine = alive.find(m => keyOf(m) === keyOf([b.dials.c, b.dials.e])) || alive[0];
    const pair = alive.length >= 2 ? [mine, alive.find(m => m !== mine)] : alive;
    note = pair.length >= 2 ? 'These both fit every report:' : 'This machine fits every report:';
    lost = `<div class="cb-lost">${pair.map(([c, e]) => `<figure class="cb-machine"><figcaption class="cb-item">${esc(machineWords(q, [c, e]))}</figcaption>${barsBoard(q, {...b, dials: {c, e}}, false)}</figure>`).join('')}</div>`;
    after = `<div class="cb-bar-buttons">${button('Again', {type: 'again'}, {cls: 'primary', hinted: same(shown, {type: 'again'})})}</div>`;
  } else if (b.told) note = TOLD[b.told];
  else if (q.mode === 'stretch' && b.pins.length === 1 && !done) note = '';
  const all = catalog(q) && !done ? `<div class="cb-bar-buttons">${button('That’s all', {type: 'all'}, {on: b.found.length > 0 && !b.told, hinted: same(shown, {type: 'all'})})}</div>` : '';
  const now = (() => {
    if (q.mode === 'every' && fitsGiven(q, [b.dials.c, b.dials.e])) return keyOf([b.dials.c, b.dials.e]);
    if (q.mode === 'repair' && b.pick !== null) return repairKey([b.pick, b.value]);
    if (q.mode === 'build' && q.every && b.e !== null) return buildKey(q, {...b.len, e: b.e});
    return null;
  })();
  const status = q.mode === 'find' ? `${b.requests.length} of ${q.budget} requests used.${b.named ? ` Named ${machineWords(q, [b.dials.c, b.dials.e])}: ${b.named === 'won' ? 'right' : 'another fits too'}.` : ''}` : q.mode === 'stretch' ? `Stretch ${fmt(stretchOf(q, b.t))}.${b.pins.length ? ` Pinned ${b.pins.map(t => fmt(stretchOf(q, t))).join(' and ')}.` : ''}` : `${catalog(q) ? `${b.found.length} found.` : ''}`;
  const top = lost ? `<p class="cb-note">${esc(note)}</p>${lost}` : `${board}${controls(p, b, shown)}${all}${note ? `<p class="cb-note">${esc(note)}</p>` : ''}`;
  return `<div class="cb-puzzle mode-${q.mode}${done ? ' solved' : ''}">${top}${after}${shelf(q, b, now)}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

export const calibrateMechanics = {
  calibrate: {
    fresh, valid, solved, move, hint, render,
    // Undo keeps what was kept (machines, pairs and repairs on the shelf, with
    // a refused That’s all) and a refused pair of pins while the line is where
    // the refusal found it. Request rounds have no Undo: a report can't be
    // taken back to ask again for free.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      let next = to;
      if (catalog(q)) next = {...to, found: from.found, told: from.told};
      else if (q.mode === 'stretch' && from.told && JSON.stringify(from.t) === JSON.stringify(to.t)) next = {...to, pins: [], told: from.told};
      return valid(p, next) ? next : to;
    },
    noUndo: p => p.parameters.mode === 'find'
  }
};

// The family seam entry (dist/families.js): a group in Ruler strips.
export default {
  id: 'calibrate',
  mechanics: calibrateMechanics,
  pack: new URL('./calibrate.json', import.meta.url).href,
  css: new URL('./calibrate.css', import.meta.url).href,
  focus: '.cb-chip:not([disabled]),.cb-button:not([disabled])'
};
