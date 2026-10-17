// Mirror twins (worksheet Week 37, tetrahedron chirality). A model is a rigid
// regular tetrahedron with a letter on each corner, drawn as the view from
// one corner: that corner sits in the middle, nearest the eye, and the other
// three make the triangle of the far face. Tapping a corner turns the model a
// third of the way round the axis through that corner. The four turns
// generate the twelve rotations of the tetrahedron, and never a reflection.
//
// Two models match when a rotation carries one onto the other, letter for
// letter. With four different letters the 24 labellings fall into two
// classes of twelve, each the mirror image of the other: seen from A, the
// other three run clockwise round A on one and anticlockwise on the other,
// and no turn changes that (a turn about A keeps the way round; any other
// turn moves A out of the middle). Make two letters equal and the model is
// its own mirror image (the mirror through the two equal corners' edge swaps
// them), so it matches its twin.
//
// The certificate for "can't match" is the child's own: with the same letter
// in the middle of both models, tap the same two letters round it on each;
// the arrows from the first through the second run opposite ways. A sort's
// right That's all asks for the same certificate on each two stacks with the
// same letters. Nothing is said about a set-up until the child asks for a
// hint: no hint is a dead end.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const MODES = ['pair', 'merges', 'sort', 'playground'];
export const LETTERS = ['A', 'B', 'C', 'D'];
// Positions on the picture: 0 the middle (the corner nearest the eye), then
// the far face's top, right and left corners.
export const WHERE = ['middle', 'top', 'right', 'left'];
export const ID = [0, 1, 2, 3];
// A tap on the corner at position k turns the model a third of the way round
// it, clockwise as seen looking at that corner from outside: the corner at
// position i goes to position TURN[k][i]. (Computed from the solid by
// Rodrigues' formula; the validator recomputes it.)
export const TURN = [[0, 2, 3, 1], [3, 1, 0, 2], [1, 3, 2, 0], [2, 0, 1, 3]];
// The outer corners in clockwise order on the screen: top, right, left.
const CLOCKWISE = TURN[0];
export const clockwise = (a, b) => CLOCKWISE[a] === b;

// --- Rotations and matching ---------------------------------------------------
// A rotation g sends position i to g[i]; `then(g, h)` is g followed by h.
const then = (g, h) => g.map(j => h[j]);
export const ROTATIONS = (() => {
  const seen = new Map([[ID.join(), ID]]), queue = [ID];
  for (let k = 0; k < queue.length; k++) for (const t of TURN) { const n = then(queue[k], t); if (!seen.has(n.join())) { seen.set(n.join(), n); queue.push(n); } }
  return [...seen.values()];
})();
const same = (x, y) => Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every((v, i) => v === y[i]);
export const isRotation = g => Array.isArray(g) && g.length === 4 && ROTATIONS.some(r => same(r, g));
// A pose lists the sticker (corner of the solid, numbered by where it
// started) at each position; a turn moves the stickers.
export const turned = (at, k) => { const next = []; at.forEach((s, i) => { next[TURN[k][i]] = s; }); return next; };
export const labelsOf = (letters, at) => at.map(s => letters[s]);
// Letters by position after turning by the rotation g.
export const rotated = (labels, g) => { const next = []; labels.forEach((x, i) => { next[g[i]] = x; }); return next; };
export const matches = (L, R) => same(L, R);
export const canMatch = (L, R) => ROTATIONS.some(g => same(rotated(R, g), L));
// The fewest taps that turn the labels R into labels satisfying `goal`, as
// positions tapped (memoised per board); null when no turn does.
const tapMemo = new Map();
function tapsWhere(R, goal, key) {
  const memoKey = `${R.join('·')}|${key}`;
  if (tapMemo.has(memoKey)) return tapMemo.get(memoKey);
  if (tapMemo.size > 5000) tapMemo.clear();
  let found = goal(R) ? [] : null;
  const seen = new Map([[R.join('·'), []]]), queue = [R];
  for (let n = 0; n < queue.length && !found; n++) {
    const path = seen.get(queue[n].join('·'));
    for (let k = 0; k < 4 && !found; k++) {
      const next = rotated(queue[n], TURN[k]), id = next.join('·');
      if (seen.has(id)) continue;
      seen.set(id, [...path, k]);
      if (goal(next)) found = [...path, k]; else queue.push(next);
    }
  }
  tapMemo.set(memoKey, found);
  return found;
}
export const tapsTo = (L, R) => tapsWhere(R, X => same(X, L), `to ${L.join('·')}`);
// The fewest taps (at least one) that put `letter` in the middle.
const tapsToMiddle = (R, letter) => R[0] === letter ? [0] : tapsWhere(R, X => X[0] === letter, `mid ${letter}`);

// --- The claim ----------------------------------------------------------------
// The child taps two letters round the middle of each model: an arrow from
// the first through the second. Judged once, when the last tap is in.
// `told` refusals are about the form of the claim and say nothing about the
// pair; `kind` refusals are wrong claims ("round": the arrows run the same
// way; "way": they run opposite, but repeated letters let the pair match).
export function judge(L, R, left, right) {
  if (L[0] !== R[0]) return {told: 'middle'};
  if (L[left[0]] !== R[right[0]] || L[left[1]] !== R[right[1]]) return {told: 'letters'};
  if (clockwise(...left) === clockwise(...right)) return {kind: 'round'};
  if (canMatch(L, R)) return {kind: 'way'};
  return {ok: true};
}
const isTrace = t => Array.isArray(t) && t.length === 2 && t.every(k => Number.isInteger(k) && k >= 1 && k <= 3) && t[0] !== t[1];
// The claim the hints make: the first two outer letters of the left model, in
// alphabetical order, traced on both.
function claimFor(L, R) {
  const outer = [1, 2, 3].sort((i, j) => L[i] < L[j] ? -1 : 1), [x, y] = outer.map(i => L[i]);
  return {left: [outer[0], outer[1]], right: [[1, 2, 3].find(k => R[k] === x), [1, 2, 3].find(k => R[k] === y)]};
}

// --- Sorting ------------------------------------------------------------------
// Cards that look exactly alike (the same letter on every position) stack.
export const cardLabels = (q, b, n) => labelsOf(q.cards[n], b.cards[n]);
export function stacksOf(q, b) {
  const groups = new Map();
  q.cards.forEach((_, n) => { const id = cardLabels(q, b, n).join('·'); if (!groups.has(id)) groups.set(id, []); groups.get(id).push(n); });
  return [...groups.values()];
}
// The turn-to-match classes of the cards, each listed in card order.
export function classesOf(cards) {
  const out = [];
  cards.forEach((L, n) => { const c = out.find(group => canMatch(cards[group[0]], L)); if (c) c.push(n); else out.push([n]); });
  return out;
}
const partitionKey = groups => groups.map(g => [...g].sort((x, y) => x - y).join(',')).sort().join('|');
const isPartition = (groups, n) => Array.isArray(groups) && groups.every(g => Array.isArray(g) && g.length && g.every(Number.isInteger)) && same(groups.flat().sort((x, y) => x - y), [...Array(n).keys()]);

// --- Boards -------------------------------------------------------------------
// pair:       {at, letters, left, tried, merged, placed, claim, told, wrong}
// merges:     {at, letters, left, tried, merged, found, refused, told, done}
// sort:       {cards, tried, refused, told, done, proof}
// playground: {left: {at, letters}, right: {at, letters}}
// The left model never turns; its letters are listed by position. The right
// model's letters are listed by sticker and `at` is its pose. `placed` counts
// the letters put on each side in a set-up (blank corners filled in order, or
// an A changed to D); `merged` is [drop, keep] once one letter has become
// another on both models. A claim is {ok, kind?, at, left, right}: the pose it
// was made in and the two traces; a turn clears a wrong one. `wrong` lists
// the letters (both models, by sticker) that a wrong claim was made on, and
// Can't stays off whenever the letters are one of them. `told` is the message
// the last move earned, so a turn or an Undo clears it. In merges and sort,
// `refused` is what That's all was refused on (the number of pairs found, or
// the stacks), and That's all stays off until that changes. A sort's `proof`
// is the certificate after a right That's all: {n, at, tried, claim}, the
// pair of stacks with the same letters being shown apart (n), the pose of
// the second one's model, whether it has turned, and the accepted claim.
const setupOf = (q, side) => q.place?.[side] || null;
export const setupDone = (q, b) => ['left', 'right'].every(side => !setupOf(q, side) || b.placed[side] === setupOf(q, side).letters.length);
const pairKey = b => `${b.left.join('·')}|${b.letters.join('·')}`;
const locked = b => b.wrong.includes(pairKey(b));
const startOf = q => ({at: [...ID], letters: [...q.right], left: [...q.left], tried: false, merged: null});
const PAIRS = ['AB', 'AC', 'AD', 'BC', 'BD', 'CD'];
export const pairOf = (x, y) => [x, y].sort().join('');
const merge = (list, drop, keep) => list.map(x => x === drop ? keep : x);
const bagOf = labels => [...labels].sort().join('');
// After a right sort, each two stacks with the same letters (so mirror twins),
// as the first model of each.
export function proofPairs(q, b) {
  const tops = stacksOf(q, b).map(g => g[0]), out = [];
  tops.forEach((n, i) => tops.slice(i + 1).forEach(m => { if (bagOf(cardLabels(q, b, n)) === bagOf(cardLabels(q, b, m))) out.push([n, m]); }));
  return out;
}
// The two models of a sort's proof: the first stack's look, and the second
// stack's look turned to the proof's pose.
function proofModels(q, b) {
  const [n, m] = proofPairs(q, b)[b.proof.n];
  return {n, m, L: cardLabels(q, b, n), R: labelsOf(cardLabels(q, b, m), b.proof.at)};
}

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'sort') return {cards: q.cards.map(() => [...ID]), tried: false, refused: null, told: null, done: false, proof: null};
  if (q.mode === 'playground') return {left: {at: [...ID], letters: [...q.left]}, right: {at: [...ID], letters: [...q.right]}};
  if (q.mode === 'merges') return {...startOf(q), found: [], refused: null, told: null, done: false};
  return {...startOf(q), placed: {left: 0, right: 0}, claim: null, told: null, wrong: []};
}

const keys = (b, list) => object(b) && Object.keys(b).sort().join() === list;
const letterList = (x, blank) => Array.isArray(x) && x.length === 4 && x.every(c => LETTERS.includes(c) || (blank && c === ''));
// The letters of both models follow from the start by the set-up and at most
// one merge.
function lettersFollow(q, b) {
  if (b.merged !== null) {
    if (!q.merge && q.mode !== 'merges') return false;
    if (!Array.isArray(b.merged) || b.merged.length !== 2) return false;
    const [drop, keep] = b.merged, all = [...q.left, ...q.right];
    if (!LETTERS.includes(drop) || !LETTERS.includes(keep) || drop === keep || !all.includes(drop) || !all.includes(keep)) return false;
    return same(b.left, merge(q.left, drop, keep)) && same(b.letters, merge(q.right, drop, keep)) && (!b.placed || (b.placed.left === 0 && b.placed.right === 0));
  }
  for (const side of ['left', 'right']) {
    const start = side === 'left' ? q.left : q.right, now = side === 'left' ? b.left : b.letters, s = setupOf(q, side);
    const changed = start.flatMap((x, i) => x === now[i] ? [] : [i]);
    const n = b.placed?.[side] ?? 0;
    if (!s) { if (changed.length || n) return false; continue; }
    if (!Number.isInteger(n) || n < 0 || n > s.letters.length || changed.length !== n) return false;
    if (!changed.every(i => start[i] === s.on)) return false;
    if (!same(changed.map(i => now[i]).sort(), s.letters.slice(0, n).sort())) return false;
  }
  return true;
}
// Each locked set of letters is a finished set-up (or the puzzle's own
// letters) on which the two models can match, so a wrong claim was possible.
function validWrong(q, b) {
  // Kept sorted, so each set of locks is saved one way.
  if (!Array.isArray(b.wrong) || !b.wrong.every((k, i) => !i || b.wrong[i - 1] < k)) return false;
  if (!q.cant) return b.wrong.length === 0;
  const placed = {left: setupOf(q, 'left')?.letters.length ?? 0, right: setupOf(q, 'right')?.letters.length ?? 0};
  return b.wrong.every(k => {
    const parts = typeof k === 'string' ? k.split('|') : [];
    if (parts.length !== 2) return false;
    const [left, letters] = parts.map(x => x.split('·'));
    return letterList(left) && letterList(letters) && lettersFollow(q, {left, letters, merged: null, placed}) && canMatch(left, letters);
  });
}
function validClaim(q, b) {
  const c = b.claim;
  if (c === null) return true;
  if (!q.cant || !setupDone(q, b) || !b.tried || !object(c) || typeof c.ok !== 'boolean' || !isRotation(c.at) || !same(c.at, b.at) || !isTrace(c.left) || !isTrace(c.right)) return false;
  if (Object.keys(c).sort().join() !== (c.ok ? 'at,left,ok,right' : 'at,kind,left,ok,right')) return false;
  const r = judge(b.left, labelsOf(b.letters, b.at), c.left, c.right);
  if (c.ok) return r.ok === true && b.told === null;
  return r.kind === c.kind && b.told === c.kind && locked(b);
}
// A message must fit the board it is on: a wrong claim's with that claim, and
// a form refusal's with the middles it was about.
function validTold(q, b) {
  const t = b.told, L = b.left, R = labelsOf(b.letters, b.at);
  if (t === null) return true;
  // Nothing is said on models that already match: that is a solve.
  if (!q.cant || !setupDone(q, b) || !b.tried || (q.goal === 'match' && matches(L, R))) return false;
  if (t === 'round' || t === 'way') return Boolean(b.claim) && !b.claim.ok;
  if (t !== 'middle' && t !== 'letters') return false;
  return b.claim === null && !locked(b) && (t === 'middle') === (L[0] !== R[0]);
}
function validPair(q, b) {
  if (!keys(b, 'at,claim,left,letters,merged,placed,told,tried,wrong') || !isRotation(b.at) || typeof b.tried !== 'boolean') return false;
  const blank = q.place?.right?.on === '' || q.place?.left?.on === '';
  if (!letterList(b.left, blank) || !letterList(b.letters, blank)) return false;
  if (!keys(b.placed, 'left,right') || !lettersFollow(q, b) || !validWrong(q, b)) return false;
  // No turn, claim or message during a set-up.
  if (!setupDone(q, b) && (!same(b.at, ID) || b.tried || b.claim !== null || b.told !== null)) return false;
  if (!same(b.at, ID) && !b.tried) return false;
  return validTold(q, b) && validClaim(q, b);
}
function validMerges(q, b) {
  if (!keys(b, 'at,done,found,left,letters,merged,refused,told,tried') || !isRotation(b.at) || typeof b.tried !== 'boolean' || typeof b.done !== 'boolean') return false;
  if (!letterList(b.left) || !letterList(b.letters) || !lettersFollow(q, b)) return false;
  if (!same(b.at, ID) && !b.tried) return false;
  if (!Array.isArray(b.found) || !b.found.every(x => PAIRS.includes(x)) || new Set(b.found).size !== b.found.length) return false;
  // A match with a merge is kept at once and the models start again.
  if (b.merged && matches(b.left, labelsOf(b.letters, b.at))) return false;
  if (b.done && (b.found.length !== PAIRS.length || b.told !== null)) return false;
  // That's all is refused only on a shelf short of a pair; pairs are only added.
  if (b.refused !== null && !(Number.isInteger(b.refused) && b.refused >= 1 && b.refused < PAIRS.length && b.refused <= b.found.length)) return false;
  const t = b.told;
  if (t === null) return true;
  if (t === 'more') return b.refused === b.found.length && !b.done;
  // The models at the start again, after a pair found already (anywhere on
  // the shelf) or just now (the last one on it).
  if (!object(t) || Object.keys(t).sort().join() !== 'kind,pair' || b.merged !== null || !same(b.at, ID) || !b.tried) return false;
  if (t.kind === 'again') return b.found.includes(t.pair);
  // A pair just found came after any refusal of the shelf.
  if (t.kind === 'new') return b.found.at(-1) === t.pair && b.refused !== b.found.length;
  return false;
}
function validSort(q, b) {
  if (!keys(b, 'cards,done,proof,refused,told,tried') || typeof b.tried !== 'boolean' || typeof b.done !== 'boolean') return false;
  if (!Array.isArray(b.cards) || b.cards.length !== q.cards.length || !b.cards.every(isRotation)) return false;
  if (!b.tried && (b.done || b.told !== null || b.proof !== null || b.cards.some(at => !same(at, ID)))) return false;
  const classes = classesOf(q.cards), stacks = stacksOf(q, b), right = stacks.length === classes.length;
  if (b.refused !== null) {
    // A refusal records the stacks it was given, which could still be joined.
    const r = b.refused, classOf = n => classes.findIndex(c => c.includes(n));
    if (!isPartition(r, q.cards.length) || !r.every(g => g.every(n => classOf(n) === classOf(g[0]))) || r.length <= classes.length) return false;
  }
  if (b.proof === null) {
    if (b.done) return right && !proofPairs(q, b).length && b.told === null;
    return b.told === null || (b.told === 'more' && b.refused !== null && partitionKey(b.refused) === partitionKey(stacks));
  }
  // The proof comes only after a right That's all, with the stacks as they were.
  const f = b.proof, pairs = right ? proofPairs(q, b) : [];
  if (!keys(f, 'at,claim,n,tried') || !Number.isInteger(f.n) || f.n < 0 || f.n >= pairs.length || !isRotation(f.at) || typeof f.tried !== 'boolean' || (!f.tried && !same(f.at, ID))) return false;
  const {L, R} = proofModels(q, b);
  if (b.done) {
    const c = f.claim;
    if (f.n !== pairs.length - 1 || b.told !== null || !f.tried || !keys(c, 'at,left,ok,right') || c.ok !== true || !same(c.at, f.at) || !isTrace(c.left) || !isTrace(c.right)) return false;
    return judge(L, R, c.left, c.right).ok === true;
  }
  if (f.claim !== null) return false;
  if (b.told === null) return true;
  return f.tried && (b.told === 'middle' ? L[0] !== R[0] : b.told === 'letters' && L[0] === R[0]);
}
function validPlay(q, b) {
  return keys(b, 'left,right') && ['left', 'right'].every(side => keys(b[side], 'at,letters') && isRotation(b[side].at) && letterList(b[side].letters));
}
function valid(p, b) {
  const q = p.parameters;
  if (q.mode === 'sort') return validSort(q, b);
  if (q.mode === 'playground') return validPlay(q, b);
  if (q.mode === 'merges') return validMerges(q, b);
  return validPair(q, b);
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'sort' || q.mode === 'merges') return b.done;
  if (!setupDone(q, b)) return false;
  return Boolean(b.claim?.ok) || (q.goal === 'match' && matches(b.left, labelsOf(b.letters, b.at)));
}

// --- Moves --------------------------------------------------------------------
const corner = k => Number.isInteger(k) && k >= 0 && k <= 3;
function place(q, b, action) {
  const side = action.side, s = setupOf(q, side);
  if (!['left', 'right'].includes(side) || !s || !corner(action.at) || b.placed[side] >= s.letters.length) return null;
  const letter = s.letters[b.placed[side]];
  const left = [...b.left], letters = [...b.letters];
  if (side === 'left') { if (left[action.at] !== s.on) return null; left[action.at] = letter; }
  else { const st = b.at[action.at]; if (letters[st] !== s.on) return null; letters[st] = letter; }
  return {...b, left, letters, placed: {...b.placed, [side]: b.placed[side] + 1}, claim: null, told: null};
}
function mergeMove(b, action) {
  const {drop, keep} = action, all = [...b.left, ...b.letters];
  if (b.merged || !LETTERS.includes(drop) || !LETTERS.includes(keep) || drop === keep || !all.includes(drop) || !all.includes(keep)) return null;
  return {...b, left: merge(b.left, drop, keep), letters: merge(b.letters, drop, keep), merged: [drop, keep]};
}
// A claim on two models: a form refusal, a wrong claim, or right.
function claim(L, R, action) {
  if (!isTrace(action.left) || !isTrace(action.right)) return null;
  return judge(L, R, action.left, action.right);
}
function movePair(q, b, action) {
  const t = action.type;
  // Start again: a set-up's letters go back as they were; locks stay.
  if (t === 'again') return q.place && b.placed.left + b.placed.right > 0 ? {...b, ...startOf(q), placed: {left: 0, right: 0}, claim: null, told: null} : null;
  if (t === 'place') return place(q, b, action);
  if (!setupDone(q, b)) return null;
  if (t === 'turn') return corner(action.at) ? {...b, at: turned(b.at, action.at), tried: true, claim: null, told: null} : null;
  if (t === 'merge') { if (!q.merge) return null; const next = mergeMove(b, action); return next && {...next, claim: null, told: null}; }
  if (t === 'cant') {
    if (!q.cant || !b.tried || locked(b)) return null;
    const r = claim(b.left, labelsOf(b.letters, b.at), action);
    if (!r) return null;
    if (r.told) return {...b, told: r.told};
    const made = {at: [...b.at], left: [...action.left], right: [...action.right]};
    if (r.ok) return {...b, claim: {ok: true, ...made}, told: null};
    return {...b, claim: {ok: false, kind: r.kind, ...made}, told: r.kind, wrong: [...b.wrong, pairKey(b)].sort()};
  }
  return null;
}
// Find every merge: a match with a merge keeps the pair of letters and the
// models start again; a pair found already says so.
function moveMerges(q, b, action) {
  const t = action.type;
  if (t === 'all') {
    if (!b.found.length || b.refused === b.found.length) return null;
    return b.found.length === PAIRS.length ? {...b, told: null, done: true} : {...b, refused: b.found.length, told: 'more'};
  }
  let next;
  if (t === 'turn') next = corner(action.at) ? {...b, at: turned(b.at, action.at), tried: true} : null;
  else if (t === 'merge') next = mergeMove(b, action);
  if (!next) return null;
  if (!next.merged || !matches(next.left, labelsOf(next.letters, next.at))) return {...next, told: null};
  const pair = pairOf(...next.merged), home = {...next, ...startOf(q), tried: true};
  return next.found.includes(pair) ? {...home, told: {kind: 'again', pair}} : {...home, found: [...next.found, pair], told: {kind: 'new', pair}};
}
function moveSort(q, b, action) {
  const f = b.proof;
  if (action.type === 'turn') {
    if (!corner(action.at)) return null;
    // During the proof, taps turn the second model of the pair.
    if (f) return action.card === undefined && !b.done ? {...b, proof: {...f, at: turned(f.at, action.at), tried: true}, told: null} : null;
    const n = action.card;
    if (!Number.isInteger(n) || n < 0 || n >= q.cards.length) return null;
    const cards = b.cards.map((at, i) => i === n ? turned(at, action.at) : at);
    return {...b, cards, tried: true, told: null};
  }
  if (action.type === 'all') {
    const stacks = stacksOf(q, b);
    if (f || !b.tried || (b.refused && partitionKey(b.refused) === partitionKey(stacks))) return null;
    if (stacks.length !== classesOf(q.cards).length) return {...b, refused: stacks, told: 'more'};
    return proofPairs(q, b).length ? {...b, told: null, proof: {n: 0, at: [...ID], tried: false, claim: null}} : {...b, told: null, done: true};
  }
  if (action.type === 'cant') {
    if (!f || !f.tried) return null;
    const {L, R} = proofModels(q, b), r = claim(L, R, action);
    if (!r) return null;
    if (r.told) return {...b, told: r.told};
    // The stacks of a right sort with the same letters are always twins.
    if (!r.ok) return null;
    if (f.n < proofPairs(q, b).length - 1) return {...b, told: null, proof: {n: f.n + 1, at: [...ID], tried: false, claim: null}};
    return {...b, told: null, done: true, proof: {...f, claim: {ok: true, at: [...f.at], left: [...action.left], right: [...action.right]}}};
  }
  return null;
}
function movePlay(q, b, action) {
  const side = action.side;
  if (!['left', 'right'].includes(side) || !corner(action.at)) return null;
  const m = b[side];
  if (action.type === 'turn') return {...b, [side]: {...m, at: turned(m.at, action.at)}};
  if (action.type === 'letter') {
    const st = m.at[action.at], letters = [...m.letters];
    letters[st] = LETTERS[(LETTERS.indexOf(letters[st]) + 1) % LETTERS.length];
    return {...b, [side]: {...m, letters}};
  }
  return null;
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const next = q.mode === 'sort' ? moveSort(q, b, action) : q.mode === 'playground' ? movePlay(q, b, action) : q.mode === 'merges' ? moveMerges(q, b, action) : movePair(q, b, action);
  if (next) {
    const s = ui(p);
    s.tracing = false; s.trace = {left: [], right: []}; s.lift = null;
    if (q.mode === 'sort' && action.type === 'turn' && Number.isInteger(action.card)) s.card = action.card;
  }
  return next;
}

// --- Hints --------------------------------------------------------------------
// No hint is a dead end: the app never says unasked whether a set-up can
// match. A set-up that can't reach its goal is shown by its own models (turn
// them to match, or bring the same letter to both middles) and then started
// again.
const TAP_WORDS = ['Tap the middle.', 'Tap the top corner.', 'Tap the right corner.', 'Tap the left corner.'];
const AT_WORDS = ['in the middle', 'at the top', 'on the right', 'on the left'];
const turnHint = k => ({type: 'move', action: {type: 'turn', at: k}, text: TAP_WORDS[k]});
const againHint = text => ({type: 'move', action: {type: 'again'}, text});
// Every way to finish a set-up from here, as the placements still to make.
function finishes(q, b) {
  const sides = ['left', 'right'].filter(side => setupOf(q, side) && b.placed[side] < setupOf(q, side).letters.length);
  const out = [];
  (function go(board, made) {
    if (setupDone(q, board)) { out.push({board, made}); return; }
    const side = sides.find(s => board.placed[s] < setupOf(q, s).letters.length), s = setupOf(q, side);
    const labels = side === 'left' ? board.left : labelsOf(board.letters, board.at);
    for (let k = 0; k < 4; k++) if (labels[k] === s.on) go(place(q, board, {side, at: k}), [...made, {side, at: k}]);
  })(b, []);
  return out;
}
// The next letter: towards a set-up that reaches the goal if one is left, and
// otherwise the first place it can go.
function setupHint(q, b) {
  const want = q.goal === 'apart' ? (L, R) => !canMatch(L, R) : (L, R) => canMatch(L, R);
  const all = finishes(q, b), ok = all.find(f => want(f.board.left, labelsOf(f.board.letters, f.board.at))) || all[0];
  const {side, at} = ok.made[0], s = setupOf(q, side), letter = s.letters[b.placed[side]];
  const text = s.on === '' ? `Put ${letter} ${AT_WORDS[at]}.` : `On the ${side} model, change the ${s.on} ${AT_WORDS[at]} to ${letter}.`;
  return {type: 'move', action: {type: 'place', side, at}, text};
}
// Why twins can't match, seen from the middle letter they share.
function reasonFor(L) {
  const {left} = claimFor(L, L), [x, y] = left.map(k => L[k]), z = [1, 2, 3].map(k => L[k]).find(c => c !== x && c !== y);
  return {x, y, text: `With ${L[0]} in the middle of both, ${x}, ${y} and ${z} go round opposite ways, and a turn never changes that.`};
}
function claimHint(L, R) {
  const {left, right} = claimFor(L, R), {x, y, text} = reasonFor(L);
  return {type: 'move', action: {type: 'cant', left, right}, text: `${text} Press Can’t, then tap ${x} and then ${y} on each.`};
}
function pairHint(p, b) {
  const q = p.parameters;
  if (!setupDone(q, b)) return setupHint(q, b);
  const L = b.left, R = labelsOf(b.letters, b.at), can = canMatch(L, R);
  if (q.merge && !b.merged) return {type: 'move', action: {type: 'merge', drop: q.hintMerge[0], keep: q.hintMerge[1]}, text: `Change ${q.hintMerge[0]} to ${q.hintMerge[1]}.`};
  if (q.goal === 'match' && can) return turnHint(tapsTo(L, R)[0]);
  // A set-up that can match when the goal is apart: turn until they visibly
  // match, then start again.
  if (q.goal === 'apart' && can) {
    const taps = tapsTo(L, R);
    return taps.length ? turnHint(taps[0]) : againHint('These two match. Press Start again.');
  }
  // Twins: first an attempt that puts the same letter in the middle of both.
  if (!b.tried || R[0] !== L[0]) return turnHint(tapsToMiddle(R, L[0])[0]);
  // A set-up that made twins when the goal is a match: the reason, then again.
  if (!q.cant && q.place) return againHint(`${reasonFor(L).text} So these two can’t match. Press Start again.`);
  return claimHint(L, R);
}
function mergesHint(p, b) {
  const q = p.parameters;
  if (b.merged) return turnHint(tapsTo(b.left, labelsOf(b.letters, b.at))[0]);
  const missing = q.order.find(pair => !b.found.includes(pair));
  if (!missing) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  const [keep, drop] = missing;
  return {type: 'move', action: {type: 'merge', drop, keep}, text: `Change ${drop} to ${keep}.`};
}
// Describe a card by its picture, with as few corners as tell it apart from
// the other stacks.
const SUBSETS = [[0], [1], [2], [3], [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], [0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3], [0, 1, 2, 3]];
const listWords = w => w.length < 2 ? w.join('') : `${w.slice(0, -1).join(', ')} and ${w.at(-1)}`;
function cardWords(q, b, n) {
  const L = cardLabels(q, b, n), others = stacksOf(q, b).map(g => cardLabels(q, b, g[0])).filter(X => !same(X, L));
  const used = SUBSETS.find(u => others.every(X => u.some(k => X[k] !== L[k])));
  return `the model with ${listWords(used.map(k => `${L[k]} ${AT_WORDS[k]}`))}`;
}
function sortHint(p, b) {
  const q = p.parameters, classes = classesOf(q.cards);
  if (b.proof) {
    const {L, R} = proofModels(q, b);
    if (!b.proof.tried || R[0] !== L[0]) return turnHint(tapsToMiddle(R, L[0])[0]);
    return claimHint(L, R);
  }
  for (const c of classes) {
    const goal = cardLabels(q, b, c[0]);
    for (const n of c.slice(1)) {
      if (same(cardLabels(q, b, n), goal)) continue;
      const k = tapsTo(goal, cardLabels(q, b, n))[0];
      return {type: 'move', action: {type: 'turn', card: n, at: k}, text: `Turn ${cardWords(q, b, n)} to look like ${cardWords(q, b, c[0])}: tap its ${WHERE[k] === 'middle' ? 'middle' : `${WHERE[k]} corner`}.`};
    }
  }
  return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
}
const hintMemo = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const key = `${p.id}|${JSON.stringify(b)}`;
  if (hintMemo.has(key)) return hintMemo.get(key);
  if (hintMemo.size > 2000) hintMemo.clear();
  const h = q.mode === 'sort' ? sortHint(p, b) : q.mode === 'merges' ? mergesHint(p, b) : pairHint(p, b);
  hintMemo.set(key, h);
  return h;
}

// --- View state ---------------------------------------------------------------
// Kept outside the save: Can't's tracing and its taps, the letter lifted for
// a merge, the card on the big board, the playground's tool.
const uiState = new Map();
function ui(p) {
  if (!uiState.has(p.id)) uiState.set(p.id, {tracing: false, trace: {left: [], right: []}, lift: null, card: 0, tool: 'turn'});
  return uiState.get(p.id);
}
// A tap while tracing: the first tap on a model marks where its arrow starts,
// the second draws it, a tap on the start takes it back, and a tap on a model
// with an arrow starts that arrow again. The claim is made when both arrows
// are drawn.
export function traceTap(trace, side, k) {
  const list = trace[side];
  const next = list.length === 2 ? [k] : list[0] === k ? [] : [...list, k];
  return {...trace, [side]: next};
}

// --- Drawing ------------------------------------------------------------------
// The picture is 100 × 88: the middle corner at (50, 52), the others 36 away.
export const SPOT = [[50, 52], [50, 16], [81.18, 70], [18.82, 70]];
const H = 88, f = n => Number(n.toFixed(2));
const FACES = [[0, 1, 2], [0, 2, 3], [0, 3, 1]];
const EDGES = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]];
const pt = k => `${SPOT[k][0]},${SPOT[k][1]}`;
// An arrow round the middle from corner a, through b, towards the third, on
// the ring between the middle disc and the others. It is drawn over the discs,
// on a pale halo.
export const ARROW_RADIUS = 20;
function arrow(a, b, cls) {
  const dir = clockwise(a, b) ? 1 : -1, r = ARROW_RADIUS, [cx, cy] = SPOT[0];
  const ang = k => Math.atan2(SPOT[k][1] - cy, SPOT[k][0] - cx);
  const t0 = ang(a) + dir * 0.34, t1 = ang(a) + dir * (4 * Math.PI / 3 - 0.6);
  const P = t => [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  const [x0, y0] = P(t0), [x1, y1] = P(t1), tip = P(t1 + dir * 0.44);
  const back = [Math.cos(t1), Math.sin(t1)], side = [-Math.sin(t1) * dir, Math.cos(t1) * dir];
  const head = [[tip[0], tip[1]], [x1 + back[0] * 4.4 - side[0] * 1.2, y1 + back[1] * 4.4 - side[1] * 1.2], [x1 - back[0] * 4.4 - side[0] * 1.2, y1 - back[1] * 4.4 - side[1] * 1.2]];
  const d = `M${f(x0)} ${f(y0)} A${r} ${r} 0 1 ${dir > 0 ? 1 : 0} ${f(x1)} ${f(y1)}`, points = head.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  return `<g class="tt-arrow ${cls}"><path class="halo" d="${d}"/><polygon class="halo" points="${points}"/><path d="${d}"/><polygon points="${points}"/></g>`;
}
function solid(over = '') {
  const faces = FACES.map((face, i) => `<polygon class="tt-face f${i}" points="${face.map(pt).join(' ')}"/>`).join('');
  const edges = EDGES.map(([u, v]) => `<line class="tt-edge" x1="${SPOT[u][0]}" y1="${SPOT[u][1]}" x2="${SPOT[v][0]}" y2="${SPOT[v][1]}"/>`).join('');
  const wire = EDGES.map(() => '<line class="tt-wire"/>').join('');
  return `<svg class="tt-solid" viewBox="0 0 100 ${H}" aria-hidden="true">${faces}${edges}<g class="tt-wires">${wire}</g>${over}</svg>`;
}
const spotStyle = k => `left:${SPOT[k][0]}%;top:${f(SPOT[k][1] / H * 100)}%`;
const letterText = x => x === '' ? '' : esc(x);
const sayLetter = x => x === '' ? 'blank' : x;
export const describe = labels => `${sayLetter(labels[0])} in the middle; ${sayLetter(labels[1])} top, ${sayLetter(labels[2])} right, ${sayLetter(labels[3])} left`;
// One model, large. `corners(k)` gives each corner's control: {attrs, label,
// cls} for a button, or null for a still corner. Arrows go on a layer above
// the discs.
function model({labels, stickers, key, at, side, label, cls = '', corners, over = '', pending = []}) {
  const discs = labels.map((x, k) => {
    const c = corners(k), tag = c ? 'button' : 'span', blank = x === '' ? ' blank' : '';
    const attrs = c ? `type="button" ${c.attrs} aria-label="${esc(c.label)}"` : 'aria-hidden="true"';
    return `<${tag} class="tt-corner p${k}${blank}${c?.cls ? ` ${c.cls}` : ''}" style="${spotStyle(k)}" data-sticker="${stickers[k]}" ${attrs}><span>${letterText(x)}</span></${tag}>`;
  }).join('');
  const layer = over ? `<svg class="tt-over" viewBox="0 0 100 ${H}" aria-hidden="true">${over}</svg>` : '';
  const waiting = pending.length ? `<div class="tt-pending" aria-hidden="true">${pending.map(x => `<span class="tt-sticker">${esc(x)}</span>`).join('')}</div>` : '';
  return `<div class="tt-model tt-${side}${cls ? ` ${cls}` : ''}" role="group" aria-label="${esc(label)}" ${key ? `data-tt-key="${esc(key)}" data-at="${at.join('')}"` : ''}><div class="tt-view">${solid()}${discs}${layer}</div>${waiting}</div>`;
}
const moveAttrs = (action, focus) => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${focus}"`;
const uiAttrs = (payload, focus) => `data-action="mechanic-ui" data-ui='${JSON.stringify(payload)}' data-focus="${focus}"`;
const button = (label, attrs, cls, enabled, hinted, extra = '') => `<button type="button" class="secondary tt-button ${cls}${hinted ? ' hinted' : ''}" ${attrs} ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;
const TOLD = {middle: 'Not the same letter in the middle.', letters: 'Follow the same letters on both.', round: 'Same way round.', way: 'There is a way.'};

// The two models of a claim: the other one still on its sun card (its outer
// corners trace while tracing), yours turning. `setup(side, k)` gives a
// set-up's corner controls while a set-up lasts.
function claimPair(p, {L, R, at, key, labels, done, canTrace, claimed, act, setup = null, pending = {left: [], right: []}}) {
  const st = ui(p);
  if (!canTrace) { st.tracing = false; st.trace = {left: [], right: []}; }
  const tracing = st.tracing, trace = st.trace;
  const arrows = side => {
    if (claimed) return arrow(...claimed[side], claimed.ok ? 'ok' : 'off');
    if (tracing && trace[side].length === 2) return arrow(...trace[side], 'drawing');
    return '';
  };
  const traceMark = (side, k) => (tracing && trace[side][0] === k && trace[side].length === 1 ? ' from' : '') + (act?.type === 'cant' && act[side].includes(k) ? ' hinted' : '');
  const tracer = (side, k, list) => k === 0 ? null : {attrs: `data-tt-trace="${side}" data-at="${k}" data-focus="tt-${side[0]}${k}" aria-pressed="${trace[side].includes(k)}"`, label: `${list[k]}, ${WHERE[k]}. ${trace[side].length === 1 ? 'Draw the arrow to here' : 'Start an arrow here'}`, cls: traceMark(side, k).trim()};
  const leftCorner = k => setup ? setup('left', k) : tracing ? tracer('left', k, L) : null;
  const rightCorner = k => {
    if (done) return null;
    if (setup) return setup('right', k);
    if (tracing) return tracer('right', k, R);
    return {attrs: moveAttrs({type: 'turn', at: k}, `tt-r${k}`), label: `${R[k]}, ${WHERE[k]}. Turn the model round it`, cls: act?.type === 'turn' && act.card === undefined && act.at === k ? 'hinted' : ''};
  };
  const left = model({labels: L, stickers: ID, side: 'left', cls: 'tt-goal', label: `${labels[0]}: ${describe(L)}`, corners: leftCorner, over: arrows('left'), pending: pending.left});
  const right = model({labels: R, stickers: at, key, at, side: 'right', label: `${labels[1]}: ${describe(R)}`, corners: rightCorner, over: arrows('right'), pending: pending.right});
  // Can't hands the keys to the first corner to trace, and back to your model.
  const cant = button('Can’t', uiAttrs({tracing: !tracing}, tracing ? 'tt-r1' : 'tt-l1'), 'tt-cant', canTrace, act?.type === 'cant', `aria-pressed="${tracing}" aria-label="Can’t match"`);
  return {pair: `<div class="tt-pair">${left}${right}</div>`, cant, tracing};
}

function renderPair(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const L = b.left, R = labelsOf(b.letters, b.at), ready = setupDone(q, b);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  const placing = (side, k) => {
    const s = setupOf(q, side), labels = side === 'left' ? L : R;
    if (!s || b.placed[side] >= s.letters.length || labels[k] !== s.on) return null;
    const letter = s.letters[b.placed[side]];
    return {attrs: moveAttrs({type: 'place', side, at: k}, `tt-${side[0]}${k}`), label: `${sayLetter(labels[k])}, ${WHERE[k]}. Put ${letter} here`, cls: act?.type === 'place' && act.side === side && act.at === k ? 'hinted' : ''};
  };
  const pendingOf = side => { const s = setupOf(q, side); return s ? s.letters.slice(b.placed[side]) : []; };
  const canTrace = q.cant && ready && b.tried && !locked(b) && !done;
  const {pair, cant, tracing} = claimPair(p, {L, R, at: b.at, key: `${p.id}:right`, labels: ['The other model', 'Your model'], done, canTrace, claimed: b.claim, act, setup: ready ? null : placing, pending: {left: pendingOf('left'), right: pendingOf('right')}});
  // Under the models: the letters to merge, Can't, and a set-up's Start again.
  let bar = '';
  if (!done && q.merge && !b.merged) bar += chips(p, b, act);
  if (!done && q.cant) bar += cant;
  if (!done && q.place) bar += button('Start again', moveAttrs({type: 'again'}, 'tt-again'), 'tt-again', b.placed.left + b.placed.right > 0, act?.type === 'again');
  // A message gives way while the next claim is traced.
  const told = b.told && !tracing ? TOLD[b.told] : '';
  const status = `Other model: ${describe(L)}. Your model: ${describe(R)}.${tracing ? ' Tap two letters round the middle of each model.' : ''}${told ? ` ${told}` : ''}${done && b.claim?.ok ? ' They can’t match: the arrows run opposite ways.' : ''}`;
  return `<div class="tt-puzzle${done ? ' solved' : ''}${tracing ? ' tracing' : ''}" data-mechanic-wire="tetra">${pair}${bar ? `<div class="tt-bar">${bar}</div>` : ''}${told ? `<p class="tt-told">${esc(told)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
// Letter chips for a merge: tap the letter to change, then the letter it becomes.
function chips(p, b, act) {
  const lift = ui(p).lift, present = LETTERS.filter(x => b.left.includes(x) || b.letters.includes(x));
  const items = present.map(x => {
    const hinted = act?.type === 'merge' && (act.drop === x || (act.keep === x && lift === act.drop)) ? ' hinted' : '';
    if (lift === x) return `<button type="button" class="tt-chip lifted${hinted}" ${uiAttrs({lift: null}, `tt-chip-${x}`)} aria-pressed="true" aria-label="${x}, chosen">${x}</button>`;
    if (lift) return `<button type="button" class="tt-chip${hinted}" ${moveAttrs({type: 'merge', drop: lift, keep: x}, `tt-chip-${x}`)} aria-label="Change ${lift} to ${x}">${x}</button>`;
    return `<button type="button" class="tt-chip${hinted}" ${uiAttrs({lift: x}, `tt-chip-${x}`)} aria-pressed="false" aria-label="Change ${x}">${x}</button>`;
  }).join('');
  return `<div class="tt-chips" role="group" aria-label="Letters">${items}</div>`;
}
function renderMerges(p, a) {
  const b = a.board, done = solved(p, b), st = ui(p), L = b.left, R = labelsOf(b.letters, b.at);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  const left = model({labels: L, stickers: ID, side: 'left', cls: 'tt-goal', label: `The other model: ${describe(L)}`, corners: () => null});
  const right = model({labels: R, stickers: b.at, key: `${p.id}:right`, at: b.at, side: 'right', label: `Your model: ${describe(R)}`, corners: k => done ? null : {attrs: moveAttrs({type: 'turn', at: k}, `tt-r${k}`), label: `${R[k]}, ${WHERE[k]}. Turn the model round it`, cls: act?.type === 'turn' && act.at === k ? 'hinted' : ''}});
  if (done) st.lift = null;
  // The pair just found is marked until the next move; one found already pops.
  const mark = pair => b.told?.pair === pair ? ` ${b.told.kind}` : '';
  const shelf = b.found.length ? `<div class="tt-shelf" role="list" aria-label="Pairs found">${b.found.map(pair => `<span class="tt-found${mark(pair)}" role="listitem" aria-label="${pair[0]} and ${pair[1]}"><i>${pair[0]}</i>=<i>${pair[1]}</i></span>`).join('')}</div>` : '';
  const all = done ? '' : button('That’s all', moveAttrs({type: 'all'}, 'tt-all'), 'tt-all', b.found.length > 0 && b.refused !== b.found.length, act?.type === 'all');
  const bar = `${!done && !b.merged ? chips(p, b, act) : ''}${all}`;
  const told = b.told === 'more' ? 'There is another.' : b.told?.kind === 'again' ? 'Found already.' : '';
  const shelved = b.told?.kind === 'new' ? ` ${b.told.pair[0]} and ${b.told.pair[1]} go on the shelf.` : '';
  const status = `Other model: ${describe(L)}. Your model: ${describe(R)}.${shelved}${b.found.length ? ` Found: ${b.found.map(x => `${x[0]} and ${x[1]}`).join('; ')}.` : ''}${told ? ` ${told}` : ''}`;
  return `<div class="tt-puzzle tt-merges${done ? ' solved' : ''}" data-mechanic-wire="tetra"><div class="tt-pair">${left}${right}</div>${bar ? `<div class="tt-bar">${bar}</div>` : ''}${told ? `<p class="tt-told">${esc(told)}</p>` : ''}${shelf}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
// A small picture of a card, for the row of cards.
function mini(labels, key) {
  const letters = labels.map((x, k) => `<text x="${SPOT[k][0]}" y="${f(SPOT[k][1] + 5.6)}">${esc(x)}</text>`).join('');
  const discs = SPOT.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13"/>`).join('');
  return `<span class="tt-mini" data-flip="${esc(key)}">${solid(`<g class="tt-mini-discs">${discs}</g><g class="tt-mini-letters">${letters}</g>`)}</span>`;
}
function renderSort(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), st = ui(p);
  if (!Number.isInteger(st.card) || st.card < 0 || st.card >= q.cards.length) st.card = 0;
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  const stacks = stacksOf(q, b), proof = b.proof;
  let top, bar = '', tracing = false, compared = [], ask = '';
  if (proof) {
    // After a right That's all: the certificate for two stacks with the same
    // letters, on one model of each.
    const {n, m, L, R} = proofModels(q, b);
    compared = [n, m];
    const c = claimPair(p, {L, R, at: proof.at, key: `${p.id}:proof${proof.n}`, labels: ['A model from one stack', 'A model from the other stack'], done, canTrace: !done && proof.tried, claimed: proof.claim, act});
    top = c.pair; tracing = c.tracing;
    if (!done) { bar = c.cant; ask = 'Show with Can’t that these two can’t match.'; }
  } else {
    const n = st.card, R = cardLabels(q, b, n);
    top = model({labels: R, stickers: b.cards[n], key: `${p.id}:card${n}`, at: b.cards[n], side: 'bench', label: `The chosen model: ${describe(R)}`, corners: k => done ? null : {attrs: moveAttrs({type: 'turn', card: n, at: k}, `tt-r${k}`), label: `${R[k]}, ${WHERE[k]}. Turn the model round it`, cls: act?.type === 'turn' && act.card === n && act.at === k ? 'hinted' : ''}});
    const refused = Boolean(b.refused) && partitionKey(b.refused) === partitionKey(stacks);
    if (!done) bar = button('That’s all', moveAttrs({type: 'all'}, 'tt-all'), 'tt-all', b.tried && !refused, act?.type === 'all');
  }
  const n = proof ? -1 : st.card, still = done || Boolean(proof);
  const cards = stacks.map(g => {
    const face = g.includes(n) ? n : g.at(-1), chosen = g.includes(n), hinted = act?.type === 'turn' && g.includes(act.card) && !chosen;
    const pick = compared.some(k => g.includes(k)) ? ' compared' : '';
    const layers = g.map((m, i) => `<span class="tt-layer" style="--k:${g.length - 1 - i}">${mini(cardLabels(q, b, m), `${p.id}:card${m}`)}</span>`).join('');
    const label = `${g.length === 1 ? 'A model' : `${g.length} models alike`}: ${describe(cardLabels(q, b, g[0]))}${chosen ? '. On the big board' : still ? '' : '. Put it on the big board'}`;
    return `<button type="button" class="tt-stack${chosen ? ' chosen' : ''}${pick}${hinted ? ' hinted' : ''}" style="--n:${Math.min(g.length, 4)}" ${uiAttrs({card: face}, `tt-card-${g[0]}`)} aria-pressed="${chosen}" aria-label="${esc(label)}" ${still ? 'disabled' : ''}>${layers}</button>`;
  }).join('');
  const told = b.told === 'more' ? 'Some can still match.' : b.told && !tracing ? TOLD[b.told] : '';
  const what = proof ? `Two stacks with the same letters: ${describe(proofModels(q, b).L)}, and ${describe(proofModels(q, b).R)}.${tracing ? ' Tap two letters round the middle of each model.' : ''}${done ? ' They can’t match: the arrows run opposite ways.' : ''}` : `On the big board: ${describe(cardLabels(q, b, st.card))}.`;
  const status = `${what} ${stacks.length} ${stacks.length === 1 ? 'stack' : 'stacks'} of models that look alike.${told ? ` ${told}` : ''}`;
  // The message sits by its button. While sorting, the small models come
  // before That's all; during the proof they come last, as a reminder of the
  // two stacks, below Can't.
  const row = bar || told ? `<div class="tt-bar">${bar}${told ? `<p class="tt-told">${esc(told)}</p>` : ''}</div>` : '';
  const shelf = `<div class="tt-cards" role="group" aria-label="Models">${cards}</div>`;
  return `<div class="tt-puzzle tt-sorting${proof ? ' tt-proving' : ''}${done ? ' solved' : ''}${tracing ? ' tracing' : ''}" data-mechanic-wire="tetra">${ask ? `<p class="tt-ask">${esc(ask)}</p>` : ''}${top}${proof ? `${row}${shelf}` : `${shelf}${row}`}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderPlay(p, a) {
  const b = a.board, st = ui(p), letters = st.tool === 'letters';
  const side = s => {
    const R = labelsOf(b[s].letters, b[s].at);
    return model({labels: R, stickers: b[s].at, key: `${p.id}:${s}`, at: b[s].at, side: s, label: `${s === 'left' ? 'Left' : 'Right'} model: ${describe(R)}`, corners: k => ({attrs: moveAttrs({type: letters ? 'letter' : 'turn', side: s, at: k}, `tt-${s[0]}${k}`), label: `${R[k]}, ${WHERE[k]}. ${letters ? 'Change the letter' : 'Turn the model round it'}`})});
  };
  const tool = button('Letters', uiAttrs({tool: letters ? 'turn' : 'letters'}, 'tt-tool'), 'tt-tool', true, false, `aria-pressed="${letters}"`);
  const status = `Left model: ${describe(labelsOf(b.left.letters, b.left.at))}. Right model: ${describe(labelsOf(b.right.letters, b.right.at))}.`;
  return `<div class="tt-puzzle tt-play${letters ? ' lettering' : ''}" data-mechanic-wire="tetra"><div class="tt-pair">${side('left')}${side('right')}</div><div class="tt-bar">${tool}</div><p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function render(p, a) {
  const mode = p.parameters.mode;
  return mode === 'sort' ? renderSort(p, a) : mode === 'playground' ? renderPlay(p, a) : mode === 'merges' ? renderMerges(p, a) : renderPair(p, a);
}

// --- The turn, shown ----------------------------------------------------------
// After each render, a model whose pose changed since the render before turns
// to its new pose: the letters move round the turn's axis and a wire frame of
// the solid turns with them. The solid's corners, unit vectors from its
// centre, with y up and the eye along z.
const RT = Math.sqrt(8) / 3, S3 = Math.sqrt(3) / 2;
export const SOLID = [[0, 0, 1], [0, RT, -1 / 3], [RT * S3, -RT / 2, -1 / 3], [-RT * S3, -RT / 2, -1 / 3]];
const project = v => [50 + v[0] * 36 / RT, 52 - v[1] * 36 / RT];
function spin(axis, angle, v) {
  const [x, y, z] = axis, c = Math.cos(angle), s = Math.sin(angle), dot = x * v[0] + y * v[1] + z * v[2];
  const cross = [y * v[2] - z * v[1], z * v[0] - x * v[2], x * v[1] - y * v[0]];
  return [0, 1, 2].map(i => v[i] * c + cross[i] * s + axis[i] * dot * (1 - c));
}
// The axis and angle of the rotation that sends position i to g[i].
function axisOf(g) {
  const fixed = g.findIndex((j, i) => j === i);
  if (g.every((j, i) => j === i)) return null;
  const close = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]) < 1e-6;
  if (fixed >= 0) {
    const other = (fixed + 1) % 4, axis = SOLID[fixed];
    const angle = close(spin(axis, 2 * Math.PI / 3, SOLID[other]), SOLID[g[other]]) ? 2 * Math.PI / 3 : -2 * Math.PI / 3;
    return {axis, angle};
  }
  const m = SOLID[0].map((x, i) => x + SOLID[g[0]][i]), len = Math.hypot(...m);
  return {axis: m.map(x => x / len), angle: Math.PI};
}
const seen = new Map();
let renders = 0;
function animate(el, from, to) {
  const g = ID.map(i => to.indexOf(from[i])), turn = axisOf(g);
  if (!turn) return;
  const view = el.querySelector('.tt-view'), box = view.getBoundingClientRect();
  if (!box.width) return;
  const steps = 12, at = t => ID.map(i => project(spin(turn.axis, turn.angle * t, SOLID[i])));
  // Letters: sticker s goes from position i to position g[i].
  for (const disc of el.querySelectorAll('.tt-corner')) {
    const s = Number(disc.dataset.sticker), i = from.indexOf(s), end = SPOT[g[i]];
    const frames = Array.from({length: steps + 1}, (_, n) => { const [x, y] = at(n / steps)[i]; return {translate: `${f((x - end[0]) / 100 * box.width)}px ${f((y - end[1]) / H * box.height)}px`}; });
    disc.animate?.(frames, {duration: 460, easing: 'ease-in-out'});
  }
  // The frame: the edges of the solid between the moving corners.
  const lines = [...el.querySelectorAll('.tt-wire')];
  el.classList.add('tt-turning');
  const start = performance.now();
  const frame = now => {
    const t = Math.min(1, (now - start) / 460), e = t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2, pts = at(e);
    EDGES.forEach(([u, v], n) => { const line = lines[n]; if (!line) return; line.setAttribute('x1', f(pts[u][0])); line.setAttribute('y1', f(pts[u][1])); line.setAttribute('x2', f(pts[v][0])); line.setAttribute('y2', f(pts[v][1])); });
    if (t < 1 && el.isConnected) requestAnimationFrame(frame); else el.classList.remove('tt-turning');
  };
  requestAnimationFrame(frame);
}
function wire(root, p, api) {
  renders++;
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const el of root.querySelectorAll('[data-tt-key]')) {
    const key = el.dataset.ttKey, at = [...el.dataset.at].map(Number), last = seen.get(key);
    if (!still && last && last.render === renders - 1 && !same(last.at, at)) animate(el, last.at, at);
    seen.set(key, {at, render: renders});
  }
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-tt-trace]');
    if (!t || !root.contains(t)) return;
    e.preventDefault();
    const st = ui(p);
    st.trace = traceTap(st.trace, t.dataset.ttTrace, Number(t.dataset.at));
    if (st.trace.left.length === 2 && st.trace.right.length === 2) {
      const action = {type: 'cant', left: st.trace.left, right: st.trace.right};
      st.tracing = false; st.trace = {left: [], right: []};
      api.apply(action);
    } else api.ui({});
  });
}

export const tetraMechanics = {
  tetra: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      const st = ui(p);
      if (typeof payload.tracing === 'boolean') { st.tracing = payload.tracing; st.trace = {left: [], right: []}; }
      if (payload.lift === null || LETTERS.includes(payload.lift)) st.lift = payload.lift;
      if (Number.isInteger(payload.card) && payload.card >= 0) st.card = payload.card;
      if (['turn', 'letters'].includes(payload.tool)) st.tool = payload.tool;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo takes back moves, never a refusal: the letters a wrong claim was
    // made on stay locked, and the pairs found and a refused That's all stay.
    // Only the message goes, so an Undo straight after a refusal still
    // changes the screen. In a sort the model whose turn is taken back goes
    // on the big board.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      if (q.mode === 'pair' && Array.isArray(from.wrong) && Array.isArray(to.wrong)) {
        const next = {...to, wrong: [...new Set([...to.wrong, ...from.wrong])].sort()};
        return locked(next) && (next.told === 'middle' || next.told === 'letters') ? {...next, told: null} : next;
      }
      if (q.mode === 'merges' && Array.isArray(from.found)) return {...to, found: [...from.found], refused: from.refused ?? null, told: to.told === 'more' || to.told?.kind === 'new' ? null : to.told, done: false};
      if (q.mode === 'sort' && Array.isArray(from.cards) && Array.isArray(to.cards)) {
        const n = from.cards.findIndex((at, i) => !same(at, to.cards[i] || []));
        if (n >= 0) ui(p).card = n;
        return from.refused ? {...to, refused: from.refused, told: null} : to;
      }
      return to;
    },
    // Restart keeps the locks too, so a refused claim is not had again by
    // starting over.
    carryOnRestart(p, from, to) {
      return p.parameters.mode === 'pair' && object(from) && object(to) && Array.isArray(from.wrong) ? {...to, wrong: [...from.wrong]} : to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'tetra',
  family: {id: 'tetra', symbol: '⧖'},
  mechanics: tetraMechanics,
  pack: new URL('./tetra.json', import.meta.url).href,
  css: new URL('./tetra.css', import.meta.url).href,
  focus: 'button.tt-corner:not([disabled]),button.tt-chip:not([disabled]),button.tt-stack:not([disabled])'
};
