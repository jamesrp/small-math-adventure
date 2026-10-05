// Slippery secrets (worksheet Week 6, code breaking), a group inside Signal
// Lanterns. A secret hides among a few shapes or numbers, or as a row of lit
// and dark lanterns. The child asks yes-or-no questions ("Is it one of
// these?") or tests a row of lanterns and hears how many places match. The
// secret is slippery: it may change at any moment, but only to one that fits
// every answer so far. So a round is won only by a way of asking that always
// works, and a lost round ends with two secrets that both fit. The app plays
// the secret by exact search: every answer keeps as much uncertainty as it can.
//   k yes-or-no answers make at most 2^k answer rows, so k questions can
//   always find one of 2^k things and never one of more.
//   A test of n lanterns has n + 1 possible scores, yet for 2, 3 and 4
//   lanterns n tests are needed; 5 lanterns need only 4, even chosen ahead.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const index = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const range = n => Array.from({length: n}, (_, i) => i);
const isRow = (row, n) => typeof row === 'string' && row.length === n && /^[01]*$/.test(row);
const flip = (row, i) => row.slice(0, i) + (row[i] === '1' ? '0' : '1') + row.slice(i + 1);
const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const uniqueSorted = (list, bound) => Array.isArray(list) && list.every(v => integer(v) && v >= 0 && v < bound) && list.every((v, i) => i === 0 || list[i - 1] < v);
export const words = n => range(2 ** n).map(i => i.toString(2).padStart(n, '0'));
// The score of a test: the number of places where it matches the secret.
export function score(test, secret) {
  let s = 0;
  for (let i = 0; i < test.length; i++) if (test[i] === secret[i]) s++;
  return s;
}

// ---------------------------------------------------------------- yes or no
// With m things left, the fewest questions that always find the secret.
export const askNeed = m => m <= 1 ? 0 : Math.ceil(Math.log2(m));
// The slippery answer to "Is it one of these?": the side that needs more
// questions, then the larger side, then no.
export function answer(live, pick) {
  const yes = live.filter(i => pick.includes(i)), no = live.filter(i => !pick.includes(i));
  const need = side => side.length ? askNeed(side.length) : -1;
  return need(yes) > need(no) || (need(yes) === need(no) && yes.length > no.length);
}
// The things that fit every answer, after replaying the questions.
export function liveAfter(count, asked) {
  let live = range(count);
  for (const {pick, yes} of asked) live = live.filter(i => pick.includes(i) === yes);
  return live;
}

// ---------------------------------------------------------------- tests
// need(n, hit, secrets): the fewest tests that always finish when the secret
// is one of `secrets`. To finish is to know the secret, or with `hit` to make
// a test that scores n. Exact search with memo, deepening one test at a time.
const memo = new Map();
function finishes(n, hit, secrets, budget) {
  if (hit ? secrets.length === 0 : secrets.length <= 1) return true;
  if (budget === 0) return false;
  if (!hit && secrets.length > (n + 1) ** budget) return false;
  const key = `${n}${hit ? 'h' : 'k'}${budget}:${secrets.join(',')}`;
  if (memo.has(key)) return memo.get(key);
  let ok = false;
  for (const t of words(n)) {
    const parts = split(n, hit, secrets, t);
    if (parts.every(part => part.secrets.length < secrets.length && finishes(n, hit, part.secrets, budget - 1))) { ok = true; break; }
  }
  memo.set(key, ok);
  return ok;
}
// The secrets grouped by the score a test would get. With `hit`, a test that
// scores n has finished the round, so that group drops out.
function split(n, hit, secrets, t) {
  const groups = new Map();
  for (const s of secrets) {
    const sc = score(t, s);
    if (hit && sc === n) continue;
    if (!groups.has(sc)) groups.set(sc, []);
    groups.get(sc).push(s);
  }
  return [...groups].map(([sc, list]) => ({score: sc, secrets: list}));
}
export function need(n, hit, secrets) {
  for (let b = 0; b <= n + 2; b++) if (finishes(n, hit, secrets, b)) return b;
  return Infinity;
}
// The slippery score for a test: the one that leaves the most tests needed,
// then the most secrets, then the lower score. A test that hits only when it
// is the one secret left.
export function scoreFor(n, hit, secrets, t) {
  const parts = split(n, hit, secrets, t);
  if (!parts.length) return n;
  let best = null;
  for (const part of parts) {
    const value = [need(n, hit, part.secrets), part.secrets.length, -part.score];
    if (!best || value[0] > best.value[0] || (value[0] === best.value[0] && (value[1] > best.value[1] || (value[1] === best.value[1] && value[2] > best.value[2])))) best = {value, score: part.score};
  }
  return best.score;
}
export const fitting = (n, tests) => words(n).filter(s => tests.every(t => score(t.row, s) === t.score));
// A test that keeps the most tests needed as low as possible, nearest the
// child's row (then first in counting order).
export function bestTest(n, hit, secrets, row) {
  let best = null;
  for (const t of words(n)) {
    const parts = split(n, hit, secrets, t);
    if (parts.some(part => part.secrets.length === secrets.length)) continue;
    const worst = Math.max(0, ...parts.map(part => need(n, hit, part.secrets)));
    const d = row.length - score(t, row);
    if (!best || worst < best.worst || (worst === best.worst && d < best.d)) best = {t, worst, d};
  }
  return best?.t ?? null;
}

// ---------------------------------------------------------------- rounds
// Ask and test puzzles are played in rounds. A board keeps the round in
// progress plus what earlier rounds earned: `tried` the budgets with a
// finished round, `wins` a winning round for each budget (replayed on load),
// `claims` the budgets the child said cannot always work (accepted only when
// true), `wrong` a refused claim, shown until the next action.
const goalSolved = (q, b, possible) => {
  const first = q.budgets[0];
  if (q.goal === 'find') return Boolean(b.wins[first]);
  if (q.goal === 'decide') return possible(first) ? Boolean(b.wins[first]) : b.claims.includes(first);
  const least = q.budgets.find(possible);
  return Boolean(b.wins[least]) && (least === first || b.claims.includes(least - 1));
};
function recordsValid(q, b, possible, replayWin) {
  if (!q.budgets.includes(b.budget) || !Array.isArray(b.tried) || !Array.isArray(b.claims) || !object(b.wins)) return false;
  if (!b.tried.every(k => q.budgets.includes(k)) || new Set(b.tried).size !== b.tried.length) return false;
  for (const [key, round] of Object.entries(b.wins)) {
    const k = Number(key);
    if (!q.budgets.includes(k) || !b.tried.includes(k) || !replayWin(k, round)) return false;
  }
  if (q.goal === 'find' && b.claims.length) return false;
  if (!b.claims.every(k => b.tried.includes(k) && !possible(k)) || new Set(b.claims).size !== b.claims.length) return false;
  return b.wrong === null || (b.tried.includes(b.wrong) && possible(b.wrong) && !b.claims.includes(b.wrong));
}
// Moves every round mode shares: a new budget, a claim, another round.
function roundMove(q, b, action, possible, ended, fresh) {
  if (action.type === 'budget') {
    const k = index(action.budget);
    if (q.goal !== 'fewest' || !q.budgets.includes(k) || k === b.budget) return null;
    return {...b, ...fresh(k), budget: k, wrong: null};
  }
  if (action.type === 'claim') {
    if (q.goal === 'find' || !b.tried.includes(b.budget) || b.claims.includes(b.budget) || b.wrong === b.budget) return null;
    return possible(b.budget) ? {...b, wrong: b.budget} : {...b, wrong: null, claims: [...b.claims, b.budget].sort((x, y) => x - y)};
  }
  if (action.type === 'again') return ended ? {...b, ...fresh(b.budget), wrong: null} : null;
  return undefined;
}
const finish = (b, won, round) => ({
  ...b,
  tried: b.tried.includes(b.budget) ? b.tried : [...b.tried, b.budget].sort((x, y) => x - y),
  wins: won && !b.wins[b.budget] ? {...b.wins, [b.budget]: round} : b.wins
});

// ---------------------------------------------------------------- ask mode
// Board: {budget, pick, asked: [{pick, yes}], tried, wins, claims, wrong}.
// The round ends by itself: won when one thing is left, lost when the
// questions run out first.
const askPossible = q => k => q.count <= 2 ** k;
function askState(q, b) {
  const live = liveAfter(q.count, b.asked);
  const won = live.length === 1, lost = !won && b.asked.length >= b.budget;
  return {live, won, lost, ended: won || lost};
}
function askReplay(q, asked, budget) {
  if (!Array.isArray(asked) || asked.length > budget) return false;
  for (let i = 0; i < asked.length; i++) {
    const {pick, yes} = asked[i] || {};
    const live = liveAfter(q.count, asked.slice(0, i));
    if (live.length <= 1 || !uniqueSorted(pick, q.count) || !pick.length || typeof yes !== 'boolean' || answer(live, pick) !== yes) return false;
  }
  return true;
}
const askFreshRound = () => ({pick: [], asked: []});
function askFresh(q) { return {budget: q.budgets[0], ...askFreshRound(), tried: [], wins: {}, claims: [], wrong: null}; }
function askValid(q, b) {
  if (!askReplay(q, b.asked, b.budget) || !uniqueSorted(b.pick, q.count)) return false;
  const s = askState(q, b);
  if (s.ended ? b.pick.length > 0 || !b.tried.includes(b.budget) : !b.pick.every(i => s.live.includes(i))) return false;
  return recordsValid(q, b, askPossible(q), (k, asked) => askReplay(q, asked, k) && liveAfter(q.count, asked).length === 1);
}
function askMove(q, b, action) {
  const s = askState(q, b), shared = roundMove(q, b, action, askPossible(q), s.ended, askFreshRound);
  if (shared !== undefined) return shared;
  if (s.ended) return null;
  if (action.type === 'item') {
    const i = index(action.item);
    if (!s.live.includes(i)) return null;
    return {...b, wrong: null, pick: b.pick.includes(i) ? b.pick.filter(x => x !== i) : [...b.pick, i].sort((x, y) => x - y)};
  }
  if (action.type === 'ask') {
    if (!b.pick.length) return null;
    const asked = [...b.asked, {pick: b.pick, yes: answer(s.live, b.pick)}], next = {...b, wrong: null, pick: [], asked};
    const after = askState(q, next);
    return after.ended ? finish(next, after.won, asked) : next;
  }
  return null;
}
// A question that still finishes in time: each side no bigger than the
// questions left can sort out, keeping as much of the child's basket as it
// can. When the round can no longer be won, the hints play it out.
function askHint(q, b) {
  const s = askState(q, b);
  if (s.ended) return {type: 'move', action: {type: 'again'}, text: 'Start a new round.'};
  const room = 2 ** (b.budget - b.asked.length - 1), m = s.live.length, inPick = s.live.filter(i => b.pick.includes(i));
  const text = 2 * room < m ? 'Too few questions are left to be sure. Finish this round and start again.' : `Ask about half of the ${q.items} that still fit.`;
  const lo = Math.max(1, m - room), hi = Math.min(room, m - 1);
  const size = inPick.length;
  if (lo <= hi ? size >= lo && size <= hi : size === Math.floor(m / 2) && size > 0) return {type: 'move', action: {type: 'ask'}, text};
  const goal = lo <= hi ? (size > hi ? hi : lo) : Math.max(1, Math.floor(m / 2));
  if (size > goal) return {type: 'move', action: {type: 'item', item: inPick.at(-1)}, text};
  return {type: 'move', action: {type: 'item', item: s.live.find(i => !b.pick.includes(i))}, text};
}

// ---------------------------------------------------------------- plan mode
// Board: {current, picks, asked}. Every question is chosen before any answer.
// Each thing gets a row of answers, lit for yes; the questions work exactly
// when no two things share a row.
const rowOf = (picks, i) => picks.map(pick => pick.includes(i) ? '1' : '0').join('');
export function planClasses(q, picks) {
  const groups = new Map();
  for (const i of range(q.count)) {
    const r = rowOf(picks, i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(i);
  }
  return groups;
}
// The slippery answers: the row shared by the most things (then the first).
export function planAnswers(q, picks) {
  let best = null;
  for (const [r, list] of planClasses(q, picks)) if (!best || list.length > best.list.length) best = {row: r, list};
  return best;
}
const planFresh = q => ({current: 0, picks: range(q.questions).map(() => []), asked: false});
function planValid(q, b) {
  return integer(b.current) && b.current >= 0 && b.current < q.questions && Array.isArray(b.picks) && b.picks.length === q.questions &&
    b.picks.every(pick => uniqueSorted(pick, q.count)) && typeof b.asked === 'boolean';
}
const planSolved = (q, b) => b.asked && planAnswers(q, b.picks).list.length === 1;
function planMove(q, b, action) {
  if (action.type === 'again') return b.asked && !planSolved(q, b) ? {...b, asked: false} : null;
  if (b.asked) return null;
  if (action.type === 'question') {
    const k = index(action.question);
    return integer(k) && k >= 0 && k < q.questions && k !== b.current ? {...b, current: k} : null;
  }
  if (action.type === 'item') {
    const k = action.question === undefined ? b.current : index(action.question), i = index(action.item);
    if (!integer(k) || k < 0 || k >= q.questions || !integer(i) || i < 0 || i >= q.count) return null;
    const pick = b.picks[k];
    return {...b, current: k, picks: b.picks.map((p, j) => j === k ? (pick.includes(i) ? pick.filter(x => x !== i) : [...pick, i].sort((x, y) => x - y)) : p)};
  }
  if (action.type === 'ask') return {...b, asked: true};
  return null;
}
// The nearest set of rows that are all different: keep each row the first
// time it appears, move the others to the nearest unused row.
function planTarget(q, b) {
  const rows = range(q.count).map(i => rowOf(b.picks, i)), used = new Set(), target = [];
  const moved = [];
  rows.forEach((r, i) => { if (used.has(r)) moved.push(i); else { used.add(r); target[i] = r; } });
  const free = words(q.questions).filter(r => !used.has(r));
  for (const i of moved) {
    free.sort((x, y) => (q.questions - score(x, rows[i])) - (q.questions - score(y, rows[i])));
    target[i] = free.shift();
  }
  return target;
}
function planHint(q, b) {
  if (b.asked) return {type: 'move', action: {type: 'again'}, text: 'Change the questions and ask again.'};
  const rows = range(q.count).map(i => rowOf(b.picks, i)), target = planTarget(q, b);
  const i = rows.findIndex((r, k) => r !== target[k]);
  if (i < 0) return {type: 'move', action: {type: 'ask'}, text: 'Every one has its own answers now. Ask.'};
  const k = [...rows[i]].findIndex((c, j) => c !== target[i][j]);
  const twin = rows.findIndex((r, j) => j !== i && r === rows[i]);
  const say = x => q.items === 'numbers' ? String(x + 1) : `the ${SHAPES[x].name}`;
  return {type: 'move', action: {type: 'item', question: k, item: i},
    text: twin >= 0 ? `${say(twin)[0].toUpperCase()}${say(twin).slice(1)} and ${say(i)} would get the same answers. ${rows[i][k] === '1' ? 'Take' : 'Put'} ${say(i)} ${rows[i][k] === '1' ? 'out of' : 'into'} question ${k + 1}.` : `${rows[i][k] === '1' ? 'Take' : 'Put'} ${say(i)} ${rows[i][k] === '1' ? 'out of' : 'into'} question ${k + 1}.`};
}

// ---------------------------------------------------------------- planned tests
// Board: {rows, asked}. Every test is chosen before any score; the secret
// then answers with the scores shared by the most secrets. The tests work
// exactly when every secret gets its own list of scores.
const scoresOf = (rows, s) => rows.map(r => score(r, s)).join(',');
export function testAnswers(n, rows) {
  const groups = new Map();
  for (const s of words(n)) {
    const key = scoresOf(rows, s);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  let best = null;
  for (const list of groups.values()) if (!best || list.length > best.length) best = list;
  return best;
}
// Every set of k tests that tells all secrets of length n apart.
const setsMemo = new Map();
export function workingSets(n, k) {
  const key = `${n}/${k}`;
  if (!setsMemo.has(key)) {
    // Scores as numbers, and each secret's list of scores as one number in
    // base n + 1, so the 35,960 sets for five lanterns take a moment, not a second.
    const all = words(n), table = all.map(t => all.map(s => score(t, s))), out = [], pick = [];
    const seen = new Int32Array((n + 1) ** k);
    let stamp = 0;
    const distinct = () => {
      stamp++;
      for (let s = 0; s < all.length; s++) {
        let code = 0;
        for (const t of pick) code = code * (n + 1) + table[t][s];
        if (seen[code] === stamp) return false;
        seen[code] = stamp;
      }
      return true;
    };
    const go = start => {
      if (pick.length === k) { if (distinct()) out.push(pick.map(t => all[t])); return; }
      for (let i = start; i < all.length; i++) { pick.push(i); go(i + 1); pick.pop(); }
    };
    go(0);
    setsMemo.set(key, out);
  }
  return setsMemo.get(key);
}
const orders = list => list.length <= 1 ? [list] : list.flatMap((x, i) => orders([...list.slice(0, i), ...list.slice(i + 1)]).map(rest => [x, ...rest]));
const plantestFresh = q => ({rows: range(q.tests).map(() => '0'.repeat(q.length)), asked: false});
const plantestValid = (q, b) => Array.isArray(b.rows) && b.rows.length === q.tests && b.rows.every(r => isRow(r, q.length)) && typeof b.asked === 'boolean';
const plantestSolved = (q, b) => b.asked && testAnswers(q.length, b.rows).length === 1;
function plantestMove(q, b, action) {
  if (action.type === 'again') return b.asked && !plantestSolved(q, b) ? {...b, asked: false} : null;
  if (b.asked) return null;
  if (action.type === 'lantern') {
    const j = index(action.test), i = index(action.lantern);
    if (!integer(j) || j < 0 || j >= q.tests || !integer(i) || i < 0 || i >= q.length) return null;
    return {...b, rows: b.rows.map((r, k) => k === j ? flip(r, i) : r)};
  }
  if (action.type === 'ask') return {...b, asked: true};
  return null;
}
// The working set of tests, in the order nearest the child's rows. Ties go to
// fewer lit lanterns first, then lower lanterns first (all dark, lantern 1,
// lantern 2, ...), as the authored hints say.
const weight = r => [...r].filter(c => c === '1').length;
const earlier = (x, y) => {
  for (let k = 0; k < x.length; k++) {
    if (x[k] === y[k]) continue;
    return weight(x[k]) !== weight(y[k]) ? weight(x[k]) < weight(y[k]) : x[k] > y[k];
  }
  return false;
};
function plantestTarget(q, b) {
  let best = null;
  for (const set of workingSets(q.length, q.tests)) for (const order of orders(set)) {
    const d = order.reduce((sum, r, k) => sum + q.length - score(r, b.rows[k]), 0);
    if (!best || d < best.d || (d === best.d && earlier(order, best.order))) best = {order, d};
  }
  return best.order;
}
function plantestHint(q, b) {
  if (b.asked) return {type: 'move', action: {type: 'again'}, text: 'Change a test and try again.'};
  const target = plantestTarget(q, b);
  const j = b.rows.findIndex((r, k) => r !== target[k]);
  if (j < 0) return {type: 'move', action: {type: 'ask'}, text: 'Every secret gets its own scores now. Test them all.'};
  const i = [...b.rows[j]].findIndex((c, k) => c !== target[j][k]);
  const twins = testAnswers(q.length, b.rows);
  return {type: 'move', action: {type: 'lantern', test: j, lantern: i},
    text: `${twins.length > 1 ? 'Some secrets still share their scores. ' : ''}${b.rows[j][i] === '1' ? 'Put out' : 'Light'} lantern ${i + 1} in test ${j + 1}.`};
}

// ---------------------------------------------------------------- test mode
// Board: {budget, row, tests: [{row, score}], named, tried, wins, claims,
// wrong}. To know: name the secret when sure (a guess while two fit loses).
// To hit: the round ends when a test scores n, or when the tests run out.
const testPossible = q => k => need(q.length, q.hit, words(q.length)) <= k;
function testState(q, b) {
  const n = q.length, secrets = fitting(n, b.tests);
  if (q.hit) {
    const won = b.tests.some(t => t.score === n);
    return {secrets, won, ended: won || b.tests.length >= b.budget};
  }
  const won = b.named !== null && secrets.length === 1 && secrets[0] === b.named;
  return {secrets, won, ended: b.named !== null};
}
function testReplay(q, tests, budget) {
  const n = q.length;
  if (!Array.isArray(tests) || tests.length > budget) return false;
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    if (!object(t) || !isRow(t.row, n) || !integer(t.score)) return false;
    const before = tests.slice(0, i);
    if (q.hit && before.some(x => x.score === n)) return false;
    if (scoreFor(n, q.hit, fitting(n, before), t.row) !== t.score) return false;
  }
  return true;
}
const testFreshRound = q => () => ({row: '0'.repeat(q.length), tests: [], named: null});
function testFresh(q) { return {budget: q.budgets[0], ...testFreshRound(q)(), tried: [], wins: {}, claims: [], wrong: null}; }
function testValid(q, b) {
  if (!isRow(b.row, q.length) || !testReplay(q, b.tests, b.budget) || !(b.named === null || (!q.hit && isRow(b.named, q.length)))) return false;
  if (testState(q, b).ended && !b.tried.includes(b.budget)) return false;
  return recordsValid(q, b, testPossible(q), (k, round) => object(round) && testReplay(q, round.tests, k) && testState(q, {...round, budget: k, named: round.named ?? null}).won);
}
function testMove(q, b, action) {
  const s = testState(q, b), shared = roundMove(q, b, action, testPossible(q), s.ended, testFreshRound(q));
  if (shared !== undefined) return shared;
  if (s.ended) return null;
  if (action.type === 'lantern') {
    const i = index(action.lantern);
    return integer(i) && i >= 0 && i < q.length ? {...b, wrong: null, row: flip(b.row, i)} : null;
  }
  if (action.type === 'test') {
    if (b.tests.length >= b.budget) return null;
    const tests = [...b.tests, {row: b.row, score: scoreFor(q.length, q.hit, s.secrets, b.row)}], next = {...b, wrong: null, tests};
    const after = testState(q, next);
    return after.ended ? finish(next, after.won, {tests}) : next;
  }
  if (action.type === 'name') {
    if (q.hit) return null;
    const next = {...b, wrong: null, named: b.row}, after = testState(q, next);
    return finish(next, after.won, {tests: b.tests, named: b.row});
  }
  return null;
}
function testHint(q, b) {
  const s = testState(q, b), n = q.length, left = b.budget - b.tests.length;
  if (s.ended) return {type: 'move', action: {type: 'again'}, text: 'Start a new round.'};
  const say = row => [...row].map(c => c === '1' ? 'lit' : 'dark').join(', ');
  const toward = (target, done, text) => {
    const i = [...b.row].findIndex((c, j) => c !== target[j]);
    return {type: 'move', action: i < 0 ? done : {type: 'lantern', lantern: i}, text};
  };
  if (s.secrets.length === 1) return toward(s.secrets[0], {type: q.hit ? 'test' : 'name'}, `Only one secret fits every score: ${say(s.secrets[0])}.`);
  if (!left) return toward(s.secrets[0], {type: 'name'}, 'More than one secret still fits. Name one to end this round, then start again.');
  const t = bestTest(n, q.hit, s.secrets, b.row);
  return toward(t, {type: 'test'}, need(n, q.hit, s.secrets) > left ? 'Too few tests are left to be sure. Finish this round and start again.' : `Test ${say(t)} next.`);
}

// ---------------------------------------------------------------- shared
const MODES = {
  ask: {fresh: askFresh, valid: askValid, move: askMove, solved: (q, b) => goalSolved(q, b, askPossible(q))},
  plan: {fresh: planFresh, valid: planValid, move: planMove, solved: planSolved},
  plantest: {fresh: plantestFresh, valid: plantestValid, move: plantestMove, solved: plantestSolved},
  test: {fresh: testFresh, valid: testValid, move: testMove, solved: (q, b) => goalSolved(q, b, testPossible(q))}
};
const modeOf = p => MODES[p.parameters.mode];
const valid = (p, b) => { try { return object(b) && modeOf(p).valid(p.parameters, b); } catch { return false; } };
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
  if (q.mode === 'plan') return planHint(q, b);
  if (q.mode === 'plantest') return plantestHint(q, b);
  // Hints never say whether a budget can always work.
  if (q.goal !== 'find') return {type: 'note'};
  return q.mode === 'ask' ? askHint(q, b) : testHint(q, b);
}

// ---------------------------------------------------------------- render
// The same eight pictures as the Codebooks group.
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
const shape = (k, cls = '') => `<svg class="sx-shape c${k} ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${SHAPES[k].path}"/></svg>`;
const nameOf = (q, i) => q.items === 'numbers' ? String(i + 1) : `the ${SHAPES[i].name}`;
const face = (q, i, cls = '') => q.items === 'numbers' ? `<span class="sx-number ${cls}">${i + 1}</span>` : shape(i, cls);
const both = (q, list) => list.length === 2 ? `${face(q, list[0], 'inline')} and ${face(q, list[1], 'inline')} both fit` : `${list.map(i => face(q, i, 'inline')).join(' ')} all fit`;
const ariaBoth = (q, list) => `${list.map(i => nameOf(q, i)).join(' and ')} ${list.length === 2 ? 'both' : 'all'} fit`;
const control = (label, action, cls = 'secondary', extra = '') => `<button type="button" class="${cls} sx-action" data-sx-move="${esc(JSON.stringify(action))}" data-focus="sx-${esc(action.type)}${action.budget ? `-${action.budget}` : ''}${action.question !== undefined && action.type === 'question' ? `-${action.question}` : ''}" ${extra}>${label}</button>`;
const lamp = (c, cls = '') => `<span class="sx-lantern${c === '1' ? ' on' : ''}${cls}" aria-hidden="true"></span>`;
const lamps = (row, label) => `<span class="sx-row" role="img" aria-label="${esc(label || [...row].map(c => c === '1' ? 'lit' : 'dark').join(', '))}">${[...row].map(c => lamp(c)).join('')}</span>`;
const hinted = (shown, test) => shown?.type === 'move' && test(shown.action) ? ' hinted' : '';
function picker(q, b, done, noun) {
  if (q.goal !== 'fewest') return '';
  return `<div class="sx-budgets" role="group" aria-label="Number of ${noun}s">${q.budgets.map(k => control(String(k), {type: 'budget', budget: k},
    `secondary sx-budget${b.claims.includes(k) ? ' claimed' : ''}${b.wins[k] ? ' found' : ''}`,
    `aria-label="${plural(k, noun)}${b.wins[k] ? ', always found' : ''}${b.claims.includes(k) ? ', cannot always work' : ''}" aria-pressed="${b.budget === k}" ${done ? 'disabled' : ''}`)).join('')}</div>`;
}
function claimTools(q, b, done, noun) {
  if (q.goal === 'find' || done) return '';
  return control(`${plural(b.budget, noun)} can’t always do it`, {type: 'claim'}, 'secondary sx-claim', b.tried.includes(b.budget) && !b.claims.includes(b.budget) && b.wrong !== b.budget ? '' : 'disabled');
}
function claimSay(b, noun) {
  if (b.wrong !== null) return `<p class="sx-say" role="status">There is a way that always works with ${plural(b.wrong, noun)}. Keep looking.</p>`;
  if (b.claims.includes(b.budget)) return `<p class="sx-say good" role="status">Right: ${plural(b.budget, noun)} can’t always do it.</p>`;
  return '';
}

function renderAsk(p, a) {
  const q = p.parameters, b = a.board, s = askState(q, b), done = solved(p, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const slots = range(b.budget).map(k => {
    const asked = b.asked[k];
    return asked ? `<li class="sx-slot">${lamp(asked.yes ? '1' : '0')}<span>${asked.yes ? 'yes' : 'no'}</span></li>` : '<li class="sx-slot open"><span class="sx-lantern empty" aria-hidden="true"></span><span></span></li>';
  }).join('');
  const items = range(q.count).map(i => {
    const out = !s.live.includes(i), picked = b.pick.includes(i);
    return `<button type="button" class="sx-item${out ? ' out' : ''}${s.won && !out ? ' found' : ''}${hinted(shown, x => x.type === 'item' && x.item === i)}" data-sx-move="${esc(JSON.stringify({type: 'item', item: i}))}" data-focus="sx-item-${i}" aria-label="${esc(nameOf(q, i))}${out ? ', ruled out' : ''}" aria-pressed="${picked}" ${out || s.ended ? 'disabled' : ''}>${face(q, i)}</button>`;
  }).join('');
  let result = '';
  if (s.won) result = `<p class="sx-say good" role="status">It’s ${face(q, s.live[0], 'inline')}<span class="sr-only">${esc(nameOf(q, s.live[0]))}</span>.</p>`;
  else if (s.lost) result = `<p class="sx-say" role="status" aria-label="${esc(ariaBoth(q, s.live.slice(0, 4)))}">${both(q, s.live.slice(0, 4))} every answer.</p>`;
  else if (b.asked.length) result = `<p class="sr-only" role="status">${b.asked.at(-1).yes ? 'Yes' : 'No'}</p>`;
  result += claimSay(b, 'question');
  const tools = s.ended
    ? `${done ? '' : control('Again', {type: 'again'}, `primary${hinted(shown, x => x.type === 'again')}`)}${claimTools(q, b, done, 'question')}`
    : `${control('Is it one of these?', {type: 'ask'}, `primary${hinted(shown, x => x.type === 'ask')}`, b.pick.length ? '' : 'disabled')}${claimTools(q, b, done, 'question')}`;
  return `<div class="secrets-puzzle mode-ask" data-mechanic-wire="secrets">${picker(q, b, done, 'question')}<ol class="sx-slots" aria-label="Answers">${slots}</ol><div class="sx-items items-${q.items} n${q.count}" role="group" aria-label="Tap to choose what to ask about">${items}</div><div class="sx-tools">${tools}</div>${result}</div>`;
}

function renderPlan(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const answers = b.asked ? planAnswers(q, b.picks) : null;
  const tabs = range(q.questions).map(k => {
    const yes = answers ? answers.row[k] : null;
    return `<button type="button" class="sx-tab${hinted(shown, x => x.type === 'item' && x.question === k)}" data-sx-move="${esc(JSON.stringify({type: 'question', question: k}))}" data-focus="sx-question-${k}" aria-label="Question ${k + 1}${yes ? `: ${yes === '1' ? 'yes' : 'no'}` : ''}" aria-pressed="${b.current === k}" ${b.asked ? 'disabled' : ''}>${yes ? lamp(yes) : `<span class="sx-tab-n">${k + 1}</span>`}</button>`;
  }).join('');
  const items = range(q.count).map(i => {
    const r = rowOf(b.picks, i), out = answers && r !== answers.row, picked = b.picks[b.current].includes(i);
    return `<button type="button" class="sx-item planned${out ? ' out' : ''}${done && !out ? ' found' : ''}${hinted(shown, x => x.type === 'item' && x.item === i)}" data-sx-move="${esc(JSON.stringify({type: 'item', item: i}))}" data-focus="sx-item-${i}" aria-label="${esc(nameOf(q, i))}, answers ${esc([...r].map(c => c === '1' ? 'yes' : 'no').join(', '))}" aria-pressed="${!b.asked && picked}" ${b.asked ? 'disabled' : ''}>${face(q, i)}<span class="sx-mini">${[...r].map((c, k) => lamp(c, k === b.current && !b.asked ? ' now' : '')).join('')}</span></button>`;
  }).join('');
  let result = '';
  if (answers) result = answers.list.length === 1
    ? `<p class="sx-say good" role="status">It’s ${face(q, answers.list[0], 'inline')}<span class="sr-only">${esc(nameOf(q, answers.list[0]))}</span>.</p>`
    : `<p class="sx-say" role="status" aria-label="${esc(ariaBoth(q, answers.list.slice(0, 4)))}">${both(q, answers.list.slice(0, 4))} every answer.</p>`;
  const tools = b.asked ? (done ? '' : control('Again', {type: 'again'}, `primary${hinted(shown, x => x.type === 'again')}`)) : control('Ask them all', {type: 'ask'}, `primary${hinted(shown, x => x.type === 'ask')}`);
  return `<div class="secrets-puzzle mode-plan" data-mechanic-wire="secrets"><div class="sx-tabs" role="group" aria-label="Questions">${tabs}</div><div class="sx-items items-${q.items} n${q.count}" role="group" aria-label="Tap to choose what question ${b.current + 1} asks about">${items}</div><div class="sx-tools">${tools}</div>${result}</div>`;
}

function renderTest(p, a) {
  const q = p.parameters, b = a.board, n = q.length, s = testState(q, b), done = solved(p, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const target = shown?.type === 'move' && shown.action.type === 'lantern' ? shown.action.lantern : -1;
  const rows = range(b.budget).map(k => {
    const t = b.tests[k];
    return t ? `<tr><th scope="row">${lamps(t.row)}</th><td class="sx-score">${t.score}</td></tr>`
      : `<tr class="open"><th scope="row"><span class="sx-row" aria-label="Test ${k + 1}, not used">${'<span class="sx-lantern empty" aria-hidden="true"></span>'.repeat(n)}</span></th><td class="sx-score"></td></tr>`;
  }).join('');
  const editor = `<span class="sx-row" role="group" aria-label="Your row">${[...b.row].map((c, i) => `<button type="button" class="sx-lantern${c === '1' ? ' on' : ''}${i === target ? ' hinted' : ''}" data-sx-move="${esc(JSON.stringify({type: 'lantern', lantern: i}))}" data-focus="sx-lantern-${i}" aria-label="Lantern ${i + 1}, ${c === '1' ? 'lit' : 'dark'}" aria-pressed="${c === '1'}" ${s.ended ? 'disabled' : ''}></button>`).join('')}</span>`;
  let result = '';
  if (s.ended) {
    const fit = s.secrets.filter(x => x !== b.named).slice(0, 3), shownFit = s.won ? [] : b.named !== null && s.secrets.includes(b.named) ? [b.named, ...fit].slice(0, 3) : fit;
    result = s.won ? `<p class="sx-say good" role="status">${q.hit ? `It scores ${n}.` : 'That’s the secret.'}</p>`
      : `<div class="sx-say" role="status"><p>${b.named !== null && !s.secrets.includes(b.named) ? `That row doesn’t fit every score. ${shownFit.length > 1 ? 'These both do:' : 'This does:'}` : shownFit.length > 1 ? 'These both fit every score:' : 'This fits every score:'}</p><div class="sx-fits">${shownFit.map(x => `<span class="sx-fit">${lamps(x)}</span>`).join('')}</div></div>`;
  }
  result += claimSay(b, 'test');
  const left = b.budget - b.tests.length;
  const tools = s.ended
    ? `${done ? '' : control('Again', {type: 'again'}, `primary${hinted(shown, x => x.type === 'again')}`)}${claimTools(q, b, done, 'test')}`
    : `${control('Test', {type: 'test'}, `primary${hinted(shown, x => x.type === 'test')}`, left ? '' : 'disabled')}${q.hit ? '' : control('That’s the secret', {type: 'name'}, `secondary${hinted(shown, x => x.type === 'name')}`)}${claimTools(q, b, done, 'test')}`;
  return `<div class="secrets-puzzle mode-test" data-mechanic-wire="secrets">${picker(q, b, done, 'test')}<table class="sx-tests"><caption class="sr-only">Tests and scores</caption><thead><tr><th scope="col"><span class="sr-only">Test</span></th><th scope="col">Score</th></tr></thead><tbody>${rows}</tbody></table><div class="sx-edit">${editor}</div><div class="sx-tools">${tools}</div>${result}</div>`;
}

function renderPlantest(p, a) {
  const q = p.parameters, b = a.board, n = q.length, done = solved(p, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const target = shown?.type === 'move' && shown.action.type === 'lantern' ? shown.action : null;
  const fits = b.asked ? testAnswers(n, b.rows) : null;
  const rows = b.rows.map((r, j) => `<tr><th scope="row"><span class="sx-row" role="group" aria-label="Test ${j + 1}">${[...r].map((c, i) => `<button type="button" class="sx-lantern${c === '1' ? ' on' : ''}${target && target.test === j && target.lantern === i ? ' hinted' : ''}" data-sx-move="${esc(JSON.stringify({type: 'lantern', test: j, lantern: i}))}" data-focus="sx-lantern-${j}-${i}" aria-label="Test ${j + 1}, lantern ${i + 1}, ${c === '1' ? 'lit' : 'dark'}" aria-pressed="${c === '1'}" ${b.asked ? 'disabled' : ''}></button>`).join('')}</span></th><td class="sx-score">${fits ? score(r, fits[0]) : ''}</td></tr>`).join('');
  let result = '';
  if (fits) result = fits.length === 1
    ? `<div class="sx-say good" role="status"><p>Only this fits every score:</p><div class="sx-fits"><span class="sx-fit">${lamps(fits[0])}</span></div></div>`
    : `<div class="sx-say" role="status"><p>These both fit every score:</p><div class="sx-fits">${fits.slice(0, 2).map(x => `<span class="sx-fit">${lamps(x)}</span>`).join('')}</div></div>`;
  const tools = b.asked ? (done ? '' : control('Again', {type: 'again'}, `primary${hinted(shown, x => x.type === 'again')}`)) : control('Test them all', {type: 'ask'}, `primary${hinted(shown, x => x.type === 'ask')}`);
  return `<div class="secrets-puzzle mode-plantest" data-mechanic-wire="secrets"><table class="sx-tests planned"><caption class="sr-only">Tests and scores</caption><thead><tr><th scope="col"><span class="sr-only">Test</span></th><th scope="col">Score</th></tr></thead><tbody>${rows}</tbody></table><div class="sx-tools">${tools}</div>${result}</div>`;
}

function wire(root, p, api) {
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-sx-move]');
    if (!el || !root.contains(el) || el.disabled) return;
    try { api.apply(JSON.parse(el.dataset.sxMove)); } catch { /* malformed control */ }
  });
}

export const secretMechanics = {
  secret: {
    fresh: p => modeOf(p).fresh(p.parameters),
    valid,
    solved,
    move,
    hint,
    render: (p, a) => ({ask: renderAsk, plan: renderPlan, plantest: renderPlantest, test: renderTest})[p.parameters.mode](p, a),
    wire,
    // Undo would let a child see an answer and take the question back.
    noUndo: p => !p.parameters.mode.startsWith('plan'),
    demo: 'Tap to choose, then ask or test. The secret may change, but only to one that fits every answer so far.'
  }
};

// The family seam entry (dist/families.js). The puzzles join Signal Lanterns
// as its Slippery secrets group, so the module adds no satchel family.
export default {
  id: 'secrets',
  mechanics: secretMechanics,
  pack: new URL('./secrets.json', import.meta.url).href,
  css: new URL('./secrets.css', import.meta.url).href,
  focus: '.sx-item:not(:disabled),.sx-lantern:not(:disabled),.secrets-puzzle .primary:not(:disabled)'
};
