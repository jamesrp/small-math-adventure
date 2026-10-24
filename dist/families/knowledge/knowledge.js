// Who knows (worksheet Week 84, public knowledge). The cards on the table are
// the possible worlds: every deal of YES/NO cups in the café, every
// arrangement of blue and red headbands for the dolls. A person knows
// something when every card that fits what they can see agrees on it. The
// café's people answer "Does everyone want a cup?" in turn (YES, NO or NOT
// YET); the dolls see every headband but their own and show PROVE BLUE only
// when every card that fits what they see gives them blue, all together each
// round. After every public event (an announcement, an answer, a round of
// replies) the child removes the cards it rules out and presses Next, which
// checks the removal: a card wrongly kept or wrongly removed is marked with
// the answers it would have given. The puzzles ask for the deals that fit a
// café conversation, a conversation that exactly two deals fit, the dolls'
// replies round by round until every blue doll proves blue (with each doll's
// own headband hidden while the child chooses its reply), the deal behind a
// list of replies, and, with no announcement, Can't: a round that removes no
// card repeats for ever.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = b => Object.keys(b).sort().join();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const MODES = ['fit', 'design', 'coach', 'playground'];
export const ROUND_CAP = 8;
const SIZES = [2, 3, 4];

// --- Worlds ---------------------------------------------------------------------
// A world is a string, one letter per position: Y/N for café cards, B/R for
// headbands. The table lists them in binary order, all-YES or all-blue first.
export const letters = kind => (kind === 'cafe' ? ['Y', 'N'] : ['B', 'R']);
export function worlds(kind, n) {
  const [a, b] = letters(kind);
  return Array.from({length: 2 ** n}, (_, i) => Array.from({length: n}, (_, j) => ((i >> (n - 1 - j)) & 1 ? b : a)).join(''));
}
export const blues = w => [...w].filter(c => c === 'B').length;
const allYes = w => !w.includes('N');

// --- What people say ---------------------------------------------------------------
// S is the list of cards on the table before the speaker speaks.
// Café: person i sees their own card; the cards that fit are those with the
// same card in place i.
export function cafeReply(S, i, w) {
  const fits = S.filter(v => v[i] === w[i]);
  if (fits.every(allYes)) return 'yes';
  if (!fits.some(allYes)) return 'no';
  return 'notyet';
}
// Dolls: doll k sees every headband but its own; the cards that fit agree
// with w everywhere except place k.
export const fitsDoll = (S, k, w) => S.filter(v => [...v].every((c, j) => j === k || c === w[j]));
export function dollReply(S, k, w) {
  return fitsDoll(S, k, w).every(v => v[k] === 'B') ? 'prove' : 'notyet';
}
export const roundOf = (S, w) => [...w].map((_, k) => dollReply(S, k, w));

// --- Events -----------------------------------------------------------------------
// {type: 'announce', least}   everyone hears "at least <least> headbands are blue"
// {type: 'say', who, reply}   café person <who> answers
// {type: 'round', replies}    the dolls' replies, shown together
export function gives(S, ev, w) {
  if (ev.type === 'announce') return blues(w) >= ev.least;
  if (ev.type === 'say') return cafeReply(S, ev.who, w);
  return roundOf(S, w);
}
export const keeps = (S, ev, w) => (ev.type === 'announce' ? gives(S, ev, w) : same(gives(S, ev, w), ev.type === 'say' ? ev.reply : ev.replies));
export const after = (S, ev) => S.filter(w => keeps(S, ev, w));
export const ruledOut = (S, ev) => S.filter(w => !keeps(S, ev, w));
// What a Next press finds wrong: a card that should have gone first, else one
// that should have stayed.
export function fault(S, ev, out) {
  const gone = new Set(ruledOut(S, ev)), off = new Set(out);
  const kept = S.find(w => gone.has(w) && !off.has(w));
  if (kept) return {why: 'kept', card: kept};
  const wrong = S.find(w => off.has(w) && !gone.has(w));
  return wrong ? {why: 'removed', card: wrong} : null;
}
// What a refused Next shows. A card the child changed since the last Next
// press in this step (taken off, or put back), if it is wrong, is marked with
// the answers it would give; otherwise the line says only whether a card left
// should go or a card taken off should stay, so checking the cards stays the
// child's work (Hint level 2 marks a card). `base` is the cards that were off
// at the last press; the first press of a step compares with none.
export function nextRefusal(S, ev, out, base = []) {
  const gone = new Set(ruledOut(S, ev)), off = new Set(out), was = new Set(base);
  const wrong = w => gone.has(w) !== off.has(w);
  const mine = S.find(w => off.has(w) !== was.has(w) && wrong(w));
  if (mine) return {why: off.has(mine) ? 'removed' : 'kept', cards: [mine]};
  if (S.some(w => wrong(w) && !off.has(w))) return {why: 'kept', cards: []};
  if (S.some(w => wrong(w) && off.has(w))) return {why: 'removed', cards: []};
  return null;
}
// A café answer can be given only if some card on the table gives it.
export const possible = (S, who, reply) => S.some(w => cafeReply(S, who, w) === reply);

// --- A run, replayed from the save ------------------------------------------------
const sizeOf = (q, b) => (q.mode === 'playground' ? b.n : q.n);
const dealOf = (q, b) => (q.mode === 'playground' ? b.deal : q.deal);
const leastOf = (q, b) => (q.mode === 'playground' ? b.least : q.least || 0);
export function fixedEvents(q) {
  if (q.kind === 'cafe') return q.said.map((reply, who) => ({type: 'say', who, reply}));
  return [...(q.least ? [{type: 'announce', least: q.least}] : []), ...q.rounds.map(replies => ({type: 'round', replies}))];
}
const coaching = q => q.mode === 'coach' || q.mode === 'playground';
// The event at step k, given the table S before it (null past the end).
function eventAt(q, b, k, S) {
  if (q.mode === 'fit') return fixedEvents(q)[k] || null;
  if (q.mode === 'design') return k < b.said.length ? {type: 'say', who: k, reply: b.said[k]} : null;
  const least = leastOf(q, b);
  if (least && k === 0) return {type: 'announce', least};
  if (k - (least ? 1 : 0) >= ROUND_CAP) return null;
  return {type: 'round', replies: roundOf(S, dealOf(q, b))};
}
// Everything the board shows, derived from the save: the table before each
// step (`tables`), the events heard (`heard`), the current event and phase.
export function runOf(q, b) {
  const n = sizeOf(q, b), all = worlds(q.kind, n);
  let S = all;
  const tables = [S], heard = [];
  for (let k = 0; k < b.steps; k++) {
    const ev = eventAt(q, b, k, S);
    if (!ev) return null;
    const next = after(S, ev);
    if (!next.length) return null;
    heard.push(ev); S = next; tables.push(S);
  }
  const deal = coaching(q) ? dealOf(q, b) : null, least = leastOf(q, b);
  const event = eventAt(q, b, b.steps, S);
  let phase;
  if (q.mode === 'fit') phase = event ? 'remove' : 'done';
  else if (q.mode === 'design') phase = b.steps === n ? 'done' : b.said.length === b.steps ? 'say' : 'remove';
  else if (b.cant) phase = 'cant';
  else if (!event) phase = 'capped';
  else if (event.type === 'announce') phase = 'remove';
  else if (!b.shown) phase = 'reply';
  else phase = blues(deal) > 0 && event.replies.every((r, k) => deal[k] !== 'B' || r === 'prove') ? 'proved' : 'remove';
  const round = coaching(q) && event?.type === 'round' ? b.steps - (least ? 1 : 0) + 1 : 0;
  return {n, all, S, tables, heard, event, phase, deal, least, round};
}
// Can't is right once a whole round has removed no card: the table, and so
// every reply, is the same in every later round.
export function claimable(q, b, run = runOf(q, b)) {
  if (!coaching(q) || !run || run.phase !== 'reply' && run.phase !== 'capped') return false;
  const rounds = run.heard.filter(ev => ev.type === 'round').length;
  return rounds > 0 && run.tables.at(-1).length === run.tables.at(-2).length;
}
// The first doll whose chosen reply is wrong, with the cards that show why.
export function replyFault(run, replies) {
  for (let k = 0; k < run.n; k++) {
    const truth = run.event.replies[k];
    if (replies[k] === truth) continue;
    const fits = fitsDoll(run.S, k, run.deal);
    return truth === 'prove' ? {why: 'can', doll: k, cards: fits} : {why: 'could', doll: k, cards: [fits.find(v => v[k] === 'R')]};
  }
  return null;
}

// --- Answers (for the build, the notes and the hints) -------------------------------
// fit: the cards left after each step. coach: the round in which every blue
// doll proves, or null if none ever does (the table stops changing first).
export function fitTables(q) {
  let S = worlds(q.kind, q.n);
  const out = [S];
  for (const ev of fixedEvents(q)) { S = after(S, ev); out.push(S); }
  return out;
}
export function coachRun(q, deal = q.deal, least = q.least || 0, n = q.n) {
  let S = worlds('dolls', n);
  const tables = [S], rounds = [];
  if (least) { S = after(S, {type: 'announce', least}); tables.push(S); }
  for (let r = 1; r <= ROUND_CAP; r++) {
    const replies = roundOf(S, deal);
    rounds.push(replies);
    if (blues(deal) > 0 && replies.every((x, k) => deal[k] !== 'B' || x === 'prove')) return {tables, rounds, proved: r};
    const next = after(S, {type: 'round', replies});
    tables.push(next);
    if (next.length === S.length) return {tables, rounds, proved: null, still: r};
    S = next;
  }
  return {tables, rounds, proved: null};
}
// Café design: every conversation (answers that some card gives, in turn),
// with the cards left at its end.
export function conversations(n) {
  const out = [];
  (function walk(S, said) {
    if (said.length === n) { out.push({said, left: S}); return; }
    for (const reply of ['notyet', 'no', 'yes']) if (possible(S, said.length, reply)) walk(after(S, {type: 'say', who: said.length, reply}), [...said, reply]);
  })(worlds('cafe', n), []);
  return out;
}

// --- Boards -----------------------------------------------------------------------------
// fit:        {steps, out}
// design:     {said, steps, out}
// coach:      {steps, replies, shown, out, cant}
// playground: {n, deal, least, steps, replies, shown, out}
// `out` holds the cards taken off the table in the step not yet checked.
const blank = n => Array(n).fill(null);
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'fit') return {steps: 0, out: []};
  if (q.mode === 'design') return {said: [], steps: 0, out: []};
  if (q.mode === 'coach') return {steps: 0, replies: blank(q.n), shown: false, out: [], cant: false};
  return {n: 3, deal: 'BBR', least: 1, steps: 0, replies: blank(3), shown: false, out: []};
}
const FIELDS = {fit: 'out,steps', design: 'out,said,steps', coach: 'cant,out,replies,shown,steps', playground: 'deal,least,n,out,replies,shown,steps'};
const REPLY = {cafe: ['notyet', 'no', 'yes'], dolls: ['notyet', 'prove']};
function valid(p, b) {
  const q = p.parameters;
  if (!object(b) || keys(b) !== FIELDS[q.mode]) return false;
  if (!Number.isInteger(b.steps) || b.steps < 0 || !Array.isArray(b.out)) return false;
  if (q.mode === 'playground') {
    if (!SIZES.includes(b.n) || typeof b.deal !== 'string' || !new RegExp(`^[BR]{${b.n}}$`).test(b.deal) || ![0, 1].includes(b.least)) return false;
    if (b.least && !b.deal.includes('B')) return false;
  }
  if (q.mode === 'design') {
    if (!Array.isArray(b.said) || b.said.length > q.n || !b.said.every(r => REPLY.cafe.includes(r)) || (b.said.length !== b.steps && b.said.length !== b.steps + 1)) return false;
    // Each answer must be one some card on the table gives.
    let S = worlds('cafe', q.n);
    for (let k = 0; k < b.said.length; k++) { if (!possible(S, k, b.said[k])) return false; S = after(S, {type: 'say', who: k, reply: b.said[k]}); }
  }
  if (coaching(q)) {
    const n = sizeOf(q, b);
    if (!Array.isArray(b.replies) || b.replies.length !== n || !b.replies.every(r => r === null || REPLY.dolls.includes(r)) || typeof b.shown !== 'boolean') return false;
    if (q.mode === 'coach' && typeof b.cant !== 'boolean') return false;
  }
  const run = runOf(q, b);
  if (!run) return false;
  if (!b.out.every(w => typeof w === 'string' && run.S.includes(w)) || new Set(b.out).size !== b.out.length) return false;
  if (b.out.length && run.phase !== 'remove') return false;
  if (coaching(q)) {
    const ev = run.event;
    if ((!ev || ev.type === 'announce' || b.cant) && (b.shown || b.replies.some(r => r !== null))) return false;
    if (b.shown && !same(b.replies, ev.replies)) return false;
    if (b.cant && (!q.cant || !claimable(q, {...b, cant: false}))) return false;
  }
  return true;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  const run = runOf(q, b);
  if (q.mode === 'fit') return run.phase === 'done';
  if (q.mode === 'design') return run.phase === 'done' && run.S.length === q.target;
  return run.phase === 'proved' || run.phase === 'cant';
}
const pristine = b => b.steps === 0 && b.out.length === 0 && !b.shown && b.replies.every(r => r === null);
const begun = (q, b) => (q.mode === 'design' ? b.said.length > 0 || b.out.length > 0 : !pristine(b));
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const run = runOf(q, b), t = action.type;
  let next = null;
  if (t === 'card') {
    if (keys(action) !== 'card,type' || run.phase !== 'remove' || !run.S.includes(action.card)) return null;
    next = {...b, out: b.out.includes(action.card) ? b.out.filter(w => w !== action.card) : [...b.out, action.card]};
  } else if (t === 'next') {
    if (keys(action) !== 'type' || run.phase !== 'remove' || fault(run.S, run.event, b.out)) return null;
    next = {...b, steps: b.steps + 1, out: []};
    if (coaching(q)) next = {...next, replies: blank(run.n), shown: false};
  } else if (t === 'reply') {
    const k = action.doll;
    if (keys(action) !== 'doll,reply,type' || run.phase !== 'reply' || !Number.isInteger(k) || k < 0 || k >= run.n || !REPLY.dolls.includes(action.reply) || b.replies[k] === action.reply) return null;
    next = {...b, replies: b.replies.map((r, i) => (i === k ? action.reply : r))};
  } else if (t === 'show') {
    if (keys(action) !== 'type' || run.phase !== 'reply' || replyFault(run, b.replies)) return null;
    next = {...b, shown: true};
  } else if (t === 'cant') {
    if (keys(action) !== 'type' || q.mode !== 'coach' || !q.cant || !claimable(q, b, run)) return null;
    next = {...b, cant: true, replies: blank(run.n)};
  } else if (t === 'say') {
    if (keys(action) !== 'reply,type' || q.mode !== 'design' || run.phase !== 'say' || !REPLY.cafe.includes(action.reply) || !possible(run.S, b.steps, action.reply)) return null;
    next = {...b, said: [...b.said, action.reply]};
  } else if (t === 'again') {
    if (keys(action) !== 'type' || (q.mode !== 'design' && q.mode !== 'playground') || !begun(q, b)) return null;
    next = q.mode === 'design' ? {said: [], steps: 0, out: []} : {...b, steps: 0, replies: blank(b.n), shown: false, out: []};
  } else if (t === 'size' || t === 'flip' || t === 'announce') {
    if (q.mode !== 'playground' || !pristine(b)) return null;
    if (t === 'size') {
      if (keys(action) !== 'n,type' || !SIZES.includes(action.n) || action.n === b.n) return null;
      const deal = action.n > b.n ? b.deal + 'R'.repeat(action.n - b.n) : b.deal.slice(0, action.n);
      next = {...b, n: action.n, deal: b.least && !deal.includes('B') ? 'B' + deal.slice(1) : deal, replies: blank(action.n)};
    } else if (t === 'flip') {
      const k = action.doll;
      if (keys(action) !== 'doll,type' || !Number.isInteger(k) || k < 0 || k >= b.n) return null;
      const deal = b.deal.slice(0, k) + (b.deal[k] === 'B' ? 'R' : 'B') + b.deal.slice(k + 1);
      if (b.least && !deal.includes('B')) return null;
      next = {...b, deal};
    } else {
      if (keys(action) !== 'on,type' || typeof action.on !== 'boolean' || action.on === !!b.least || (action.on && !b.deal.includes('B'))) return null;
      next = {...b, least: action.on ? 1 : 0};
    }
  } else return null;
  return valid(p, next) ? next : null;
}

// --- Words ------------------------------------------------------------------------------
const WORD = {Y: 'yes', N: 'no', B: 'blue', R: 'red'};
export const cardWords = w => [...w].map(c => WORD[c]).join(', ');
const cardName = w => (/[YN]/.test(w) ? [...w].map(c => (c === 'Y' ? 'YES' : 'NO')).join(', ') : [...w].join(', '));
const SAY = {yes: 'Yes', no: 'No', notyet: 'Not yet', prove: 'Prove blue'};
const who = (q, k) => `${q.kind === 'cafe' ? 'Person' : 'Doll'} ${k + 1}`;
const announceText = least => (least === 1 ? 'At least one is blue.' : 'At least two are blue.');

// --- Hints ----------------------------------------------------------------------------------
// Removal: put back a card that fits, then take off one that doesn't, then
// Next. Replies: fix the first wrong doll, then Show. Café design: answers
// toward a conversation with the goal's number of cards, or Again.
function removalHint(q, run, b, last) {
  const gone = new Set(ruledOut(run.S, run.event));
  const back = b.out.find(w => !gone.has(w));
  if (back) return {type: 'move', action: {type: 'card', card: back}, text: `Put back ${cardName(back)}.`};
  const off = run.S.find(w => gone.has(w) && !b.out.includes(w));
  if (off) return {type: 'move', action: {type: 'card', card: off}, text: `Remove ${cardName(off)}.`};
  return {type: 'move', action: {type: 'next'}, text: last ? 'Every card left fits.' : 'Press Next.'};
}
function designAims(q, S, k) {
  return ['notyet', 'no', 'yes'].filter(reply => possible(S, k, reply) && conversationsFrom(q.n, after(S, {type: 'say', who: k, reply}), k + 1).some(left => left.length === q.target));
}
function conversationsFrom(n, S, k) {
  if (k === n) return [S];
  return ['notyet', 'no', 'yes'].filter(r => possible(S, k, r)).flatMap(r => conversationsFrom(n, after(S, {type: 'say', who: k, reply: r}), k + 1));
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const run = runOf(q, b);
  if (q.mode === 'fit') return removalHint(q, run, b, b.steps === fixedEvents(q).length - 1);
  if (q.mode === 'design') {
    const again = {type: 'move', action: {type: 'again'}, text: 'Press Again.'};
    if (run.phase === 'done') return again;
    // The answers so far must still lead to a conversation the goal's number of cards fit.
    const S0 = run.tables[b.steps];
    const alive = conversationsFrom(q.n, run.phase === 'remove' ? after(S0, run.event) : S0, run.phase === 'remove' ? b.steps + 1 : b.steps).some(left => left.length === q.target);
    if (!alive) return again;
    if (run.phase === 'remove') return removalHint(q, run, b, b.steps === q.n - 1);
    const reply = designAims(q, run.S, b.steps)[0];
    return {type: 'move', action: {type: 'say', reply}, text: `${who(q, b.steps)} says ${SAY[reply]}.`};
  }
  // Coach.
  if (q.cant && claimable(q, b, run)) return {type: 'move', action: {type: 'cant'}, text: 'No card left the table last round, so every round will be the same.'};
  if (run.phase === 'capped') return {type: 'note'};
  if (run.phase === 'remove') return removalHint(q, run, b, false);
  const k = b.replies.findIndex((r, i) => r !== run.event.replies[i]);
  if (k >= 0) return {type: 'move', action: {type: 'reply', doll: k, reply: run.event.replies[k]}, text: `${who(q, k)}: ${SAY[run.event.replies[k]]}.`};
  return {type: 'move', action: {type: 'show'}, text: 'Press Show.'};
}

// --- View state (outside the save) ------------------------------------------------------------
// `told` is a refusal and the cards that explain it; it lasts until the next
// move of any kind (a card, Undo, Again), so it is keyed to the attempt's move
// count and time as well as the board. `coach` is the doll whose reply is
// being chosen, kept for the board it was chosen on. `base` is the cards off
// the table at the last refused Next (see nextRefusal).
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {told: null, coach: null, base: null}); return uiState.get(p.id); }
// A doll tapped on this board stays coached. Otherwise: a new round starts at
// doll 1, a reply moves on to the first doll without one, and once every doll
// has one the last doll tapped (or the last doll) stays.
function coachedDoll(state, b, drawn) {
  const c = state.coach, n = b.replies.length, mine = c && c.doll < n ? c.doll : null;
  if (mine !== null && c.at === drawn) return mine;
  const open = b.replies.findIndex(r => r === null);
  if (open < 0) return mine ?? n - 1;
  if (b.replies.every(r => r === null)) return 0;
  return mine !== null && b.replies[mine] === null ? mine : open;
}
const TOLD = {
  kept: (q, ev, t) => (t.cards.length
    ? (ev.type === 'announce' ? (ev.least === 1 ? 'No headband is blue on this card.' : 'Fewer than two are blue on this card.') : ev.type === 'say' ? 'This card gives another answer.' : 'This card gives other replies.')
    : (ev.type === 'announce' ? (ev.least === 1 ? 'A card on the table has no blue.' : 'A card on the table has fewer than two blues.') : ev.type === 'say' ? 'A card on the table gives another answer.' : 'A card on the table gives other replies.')),
  removed: (q, ev, t) => (t.cards.length
    ? (ev.type === 'announce' ? (ev.least === 1 ? 'This card has a blue.' : 'This card has two blues.') : ev.type === 'say' ? 'This card gives the same answer.' : 'This card gives the same replies.')
    : (ev.type === 'announce' ? (ev.least === 1 ? 'A card you took off has a blue.' : 'A card you took off has two blues.') : ev.type === 'say' ? 'A card you took off gives the same answer.' : 'A card you took off gives the same replies.')),
  can: (q, ev, t) => `Doll ${t.doll + 1} can prove blue.`,
  could: (q, ev, t) => `Doll ${t.doll + 1} could be red.`,
  never: () => 'Cards left the table last round.',
  cannot: () => 'No deal gives that answer.'
};

// --- Drawing ------------------------------------------------------------------------------------
let drawnFor = '', moment = '';
const uiAttr = payload => `data-ui='${esc(JSON.stringify({...payload, at: drawnFor, seen: moment}))}'`;
const moveAttr = action => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}"`;
const button = (label, action, cls, {enabled = true, hinted = false, primary = false, pressed = null, told = null, extra = {}, aria = ''} = {}) =>
  `<button type="button" class="${primary ? 'primary' : 'secondary'} wk-button ${cls}${hinted ? ' hinted' : ''}" ${told ? `data-action="mechanic-ui" ${uiAttr({told, ...extra})}` : moveAttr(action)} data-focus="${cls}"${pressed === null ? '' : ` aria-pressed="${pressed}"`}${aria ? ` aria-label="${esc(aria)}"` : ''}${enabled ? '' : ' disabled'}>${label}</button>`;

// A figure: a doll with its headband (B, R or ? when hidden), or a café person
// holding a face-down card.
function figure(kind, k, colour) {
  const band = colour === 'B' ? 'wk-band-b' : colour === 'R' ? 'wk-band-r' : 'wk-band-hidden';
  const body = '<path class="wk-body" d="M10 59 C10 45 16 40 24 40 C32 40 38 45 38 59 Z"/>';
  const head = '<circle class="wk-head" cx="24" cy="22" r="15"/><circle class="wk-eye" cx="19" cy="25.5" r="1.7"/><circle class="wk-eye" cx="29" cy="25.5" r="1.7"/><path class="wk-smile" d="M19.5 30.5 Q24 34 28.5 30.5"/>';
  if (kind === 'cafe') {
    return `<svg class="wk-figure" viewBox="0 0 48 60" aria-hidden="true">${body}${head}<rect class="wk-held" x="15" y="41.5" width="18" height="15.5" rx="2"/><text class="wk-held-q" x="24" y="49.6">?</text></svg>`;
  }
  return `<svg class="wk-figure" viewBox="0 0 48 60" aria-hidden="true">${body}${head}<path class="${band}" d="M8.6 14 Q24 3.5 39.4 14 L39.8 24.5 Q24 16 8.2 24.5 Z"/><text class="wk-band-letter" x="24" y="14.8">${colour || '?'}</text></svg>`;
}
const chip = (reply, extra = '') => `<span class="wk-chip wk-${reply}${extra}">${SAY[reply]}</span>`;
// A card's face: one letter per person, Y or N on a green or rose tile in the
// café, B or R in a blue or red disc for the dolls (the letter, not only the
// colour, carries it).
function cardFace(w, {focus = -1} = {}) {
  return [...w].map((c, i) => `<span class="${/[YN]/.test(c) ? 'wk-yn' : 'wk-hb'} wk-${c}${i === focus ? ' focus' : ''}">${c}</span>`).join('');
}
const miniCard = w => `<span class="wk-mini" role="img" aria-label="${esc(`Card ${cardWords(w)}`)}">${cardFace(w)}</span>`;

function tableHTML(q, b, run, {live, told, hintedCard, focus, reveal}) {
  const gone = new Set(run.all.filter(w => !run.S.includes(w))), marks = told ? told.cards : [];
  const cols = Math.min(4, run.all.length);
  return `<div class="wk-table" style="--cols:${cols}" role="group" aria-label="Cards on the table">${run.all.map(w => {
    if (gone.has(w)) return '<span class="wk-card gone" aria-hidden="true"></span>';
    const off = b.out.includes(w), cls = ['wk-card', off ? 'out' : '', marks.includes(w) ? 'marked' : '', hintedCard === w ? 'hinted' : '', reveal === w ? 'deal' : ''].filter(Boolean).join(' ');
    const face = cardFace(w, {focus});
    if (live) return `<button type="button" class="${cls}" ${moveAttr({type: 'card', card: w})} data-focus="wk-card-${w}" aria-pressed="${off}" aria-label="${esc(`${cardWords(w)}${off ? ', taken off' : ''}`)}">${face}</button>`;
    return `<span class="${cls}" role="img" aria-label="${esc(cardWords(w))}">${face}</span>`;
  }).join('')}</div>`;
}

// The box: the figures, then a row for each event heard (and the current one).
const announceToggle = b => `<button type="button" class="wk-announce wk-toggle${b.least ? ' now' : ' off'}" style="grid-column:1 / -1" ${moveAttr({type: 'announce', on: !b.least})} data-focus="wk-announce" aria-pressed="${!!b.least}"${!b.least && !b.deal.includes('B') ? ' disabled' : ''}>${esc(announceText(1))}</button>`;
function boxHTML(q, b, run, {coachK, told, hintedDoll, setup}) {
  const n = run.n, dolls = q.kind === 'dolls', rows = [];
  const cells = [];
  const labelCol = dolls;
  const style = `--n:${n}`;
  // Figures.
  const fig = k => {
    const hidden = q.mode === 'fit' ? !(run.phase === 'done' && run.S.length === 1) : coaching(q) && run.phase === 'reply' && k === coachK;
    const colour = !dolls ? null : q.mode === 'fit' ? (hidden ? null : run.S[0][k]) : hidden ? null : run.deal[k];
    const label = dolls ? `${who(q, k)}${colour ? `, ${WORD[colour]}` : ', headband hidden'}` : who(q, k);
    const inner = `${figure(q.kind, k, colour)}<span class="wk-num">${k + 1}</span>`;
    if (coaching(q) && run.phase === 'reply') return `<button type="button" class="wk-who${k === coachK ? ' coached' : ''}${hintedDoll === k ? ' hinted' : ''}" data-action="mechanic-ui" ${uiAttr({coach: k})} data-focus="wk-who-${k}" aria-pressed="${k === coachK}" aria-label="${esc(label)}">${inner}</button>`;
    return `<span class="wk-who" role="img" aria-label="${esc(label)}">${inner}</span>`;
  };
  cells.push(`${labelCol ? '<span class="wk-label"></span>' : ''}${Array.from({length: n}, (_, k) => fig(k)).join('')}`);
  const tick = '<span class="wk-tick" aria-label="Done">✓</span>';
  const events = q.mode === 'fit' ? fixedEvents(q) : run.heard.concat(run.event && run.phase !== 'cant' ? [run.event] : []);
  let roundNo = 0;
  // In the playground's set-up the announcement is a switch, drawn off too.
  if (setup && !b.least) cells.push(announceToggle(b));
  events.forEach((ev, k) => {
    const done = k < b.steps, now = k === b.steps && run.phase !== 'done';
    const state = done ? ' done' : now ? ' now' : ' later';
    if (ev.type === 'announce') {
      if (setup) cells.push(announceToggle(b));
      else cells.push(`<span class="wk-announce${state}" style="grid-column:1 / -1">${esc(announceText(ev.least))}${done ? tick : ''}</span>`);
      return;
    }
    if (ev.type === 'say') return; // café answers share one row, drawn below
    roundNo++;
    const current = coaching(q) && now;
    const shown = !current || b.shown;
    cells.push(`<span class="wk-label${state}">Round ${roundNo}${done ? tick : ''}</span>${ev.replies.map((r, d) => {
      if (shown) return `<span class="wk-slot${state}">${chip(r)}</span>`;
      const chosen = b.replies[d];
      return `<span class="wk-slot now${d === coachK ? ' coached' : ''}${hintedDoll === d ? ' hinted' : ''}">${chosen ? chip(chosen) : '<span class="wk-chip wk-empty" aria-label="No reply yet"></span>'}</span>`;
    }).join('')}`);
  });
  if (q.kind === 'cafe') {
    const said = q.mode === 'fit' ? q.said : b.said;
    cells.push(Array.from({length: n}, (_, k) => {
      const done = k < b.steps, now = k === b.steps && run.phase !== 'done';
      const state = done ? ' done' : now ? ' now' : ' later';
      return `<span class="wk-slot${state}">${said[k] ? chip(said[k]) : '<span class="wk-chip wk-empty" aria-label="No answer yet"></span>'}${done ? tick : ''}</span>`;
    }).join(''));
  }
  // A refused Next: the marked card's own answers, under the ones heard.
  if (told && (told.why === 'kept' || told.why === 'removed') && told.cards.length && run.event.type !== 'announce') {
    const w = told.cards[0], g = gives(run.S, run.event, w);
    if (run.event.type === 'say') {
      cells.push(`<span class="wk-whatif wk-whatif-line" style="grid-column:1 / -1">${miniCard(w)}<span class="wk-arrow" aria-hidden="true">→</span><span class="wk-sr">${esc(who(q, run.event.who))}:</span>${chip(g, g !== run.event.reply ? ' differ' : '')}</span>`);
    } else {
      cells.push(`<span class="wk-label wk-whatif">${miniCard(w)}</span>${g.map((r, k) => `<span class="wk-slot wk-whatif">${chip(r, r !== run.event.replies[k] ? ' differ' : '')}</span>`).join('')}`);
    }
  }
  return `<div class="wk-box${labelCol ? ' wk-labelled' : ''}" style="${style}">${cells.join('')}</div>`;
}

function statusOf(q, b, run, note) {
  const on = run.S.filter(w => !b.out.includes(w)).map(cardWords).join('; ');
  const off = b.out.length ? ` Taken off: ${b.out.map(cardWords).join('; ')}.` : '';
  let now = '';
  const ev = run.event;
  if (run.phase === 'remove' && ev) now = ev.type === 'announce' ? `Heard: ${announceText(ev.least)}` : ev.type === 'say' ? `Heard: person ${ev.who + 1} says ${SAY[ev.reply]}.` : `Round ${run.round}: ${ev.replies.map((r, k) => `doll ${k + 1} ${SAY[r]}`).join(', ')}.`;
  if (run.phase === 'reply') now = `Round ${run.round}. Replies chosen: ${b.replies.map((r, k) => `doll ${k + 1} ${r ? SAY[r] : 'none'}`).join(', ')}.`;
  if (run.phase === 'say') now = `Person ${b.steps + 1} answers next.`;
  return `${now} On the table: ${on}.${off}${note ? ` ${note}` : ''}`;
}

function render(p, a) {
  const q = p.parameters, b = a.board, run = runOf(q, b), done = solved(p, b), state = ui(p);
  drawnFor = JSON.stringify(b);
  moment = `${a.lastPlayed ?? ''}|${a.moves ?? ''}|${drawnFor}`;
  const told = !done && state.told && state.told.seen === moment ? state.told : null;
  const h = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  const coachK = coaching(q) && run.phase === 'reply' ? coachedDoll(state, b, drawnFor) : -1;
  const setup = q.mode === 'playground' && pristine(b);
  const live = !done && run.phase === 'remove';
  const lastStep = q.mode === 'fit' ? b.steps === fixedEvents(q).length - 1 : q.mode === 'design' ? b.steps === q.n - 1 : false;
  let note = told ? TOLD[told.why](q, run.event, told) : '';
  const parts = [];
  if (q.kind === 'cafe') parts.push('<p class="wk-question">Does everyone want a cup?</p>');
  // The playground's set-up: how many dolls, their headbands and the
  // announcement, until the first move.
  if (setup) {
    const sizes = SIZES.map(n => `<button type="button" class="wk-size" ${n === b.n ? `data-action="mechanic-ui" ${uiAttr({noop: true})}` : moveAttr({type: 'size', n})} data-focus="wk-size-${n}" aria-pressed="${n === b.n}" aria-label="${n} dolls">${'<i></i>'.repeat(n)}</button>`).join('');
    const bands = [...b.deal].map((c, k) => `<button type="button" class="wk-hb wk-${c} wk-flip" ${moveAttr({type: 'flip', doll: k})} data-focus="wk-flip-${k}" aria-label="${esc(`Doll ${k + 1}: ${WORD[c]}`)}"${b.least && c === 'B' && blues(b.deal) === 1 ? ' disabled' : ''}>${c}</button>`).join('');
    parts.push(`<div class="wk-setup" role="group" aria-label="Set up"><span class="wk-group">${sizes}</span><span class="wk-group">${bands}</span></div>`);
  }
  parts.push(boxHTML(q, b, run, {coachK, told, hintedDoll: act?.type === 'reply' ? act.doll : -1, setup}));
  // Reply buttons for the doll being coached, or the café answers in a design.
  if (coachK >= 0 && !done) {
    parts.push(`<div class="wk-replies" role="group" aria-label="${esc(`Reply for doll ${coachK + 1}`)}">${['notyet', 'prove'].map(r => {
      const pressed = b.replies[coachK] === r;
      const hinted = act?.type === 'reply' && act.doll === coachK && act.reply === r;
      return pressed ? `<button type="button" class="secondary wk-button wk-reply wk-r-${r}" data-action="mechanic-ui" ${uiAttr({coach: coachK})} data-focus="wk-reply-${r}" aria-pressed="true">${SAY[r]}</button>`
        : button(SAY[r], {type: 'reply', doll: coachK, reply: r}, `wk-reply wk-r-${r}`, {pressed: false, hinted});
    }).join('')}</div>`);
  }
  if (q.mode === 'design' && run.phase === 'say') {
    parts.push(`<div class="wk-replies" role="group" aria-label="${esc(`Answer for person ${b.steps + 1}`)}">${['yes', 'no', 'notyet'].map(r => button(SAY[r], {type: 'say', reply: r}, `wk-say wk-r-${r}`, {hinted: act?.type === 'say' && act.reply === r, told: possible(run.S, b.steps, r) ? null : {why: 'cannot', cards: []}})).join('')}</div>`);
  }
  // A refused Show marks the cards that fit what the doll sees.
  const reveal = q.mode === 'fit' && q.kind === 'dolls' && run.phase === 'done' && run.S.length === 1 ? run.S[0] : null;
  parts.push(tableHTML(q, b, run, {live, told, hintedCard: act?.type === 'card' ? act.card : null, focus: coachK, reveal}));
  // The bar.
  const bar = [];
  if (!done && run.phase === 'remove') {
    // After a refusal Next waits for a change; the press records what was off.
    const evKey = JSON.stringify(run.event), base = state.base && state.base.steps === b.steps && state.base.event === evKey ? state.base.out : [];
    const f = nextRefusal(run.S, run.event, b.out, base), waiting = told?.why === 'kept' || told?.why === 'removed';
    bar.push(button(lastStep ? 'That’s all' : 'Next', {type: 'next'}, 'wk-next', {primary: true, enabled: !waiting, hinted: act?.type === 'next', told: f, extra: {base: {steps: b.steps, event: evKey, out: b.out}}}));
  }
  if (!done && run.phase === 'reply') {
    const f = replyFault(run, b.replies), ready = b.replies.every(r => r !== null);
    bar.push(button('Show', {type: 'show'}, 'wk-show', {primary: ready, enabled: ready, hinted: act?.type === 'show', told: ready && f ? f : null}));
  }
  if (!done && q.mode === 'coach' && q.cant && (run.phase === 'reply' || run.phase === 'capped')) {
    const rounds = run.heard.filter(ev => ev.type === 'round').length;
    bar.push(button('Can’t', {type: 'cant'}, 'wk-cant', {enabled: rounds > 0, hinted: act?.type === 'cant', told: claimable(q, b, run) ? null : {why: 'never', cards: []}}));
  }
  if (!done && (q.mode === 'design' || q.mode === 'playground')) {
    const finished = run.phase === 'done' || run.phase === 'proved' || run.phase === 'capped';
    bar.push(button('Again', {type: 'again'}, 'wk-again', {enabled: begun(q, b), primary: finished, hinted: act?.type === 'again'}));
  }
  if (bar.length) parts.push(`<div class="wk-bar">${bar.join('')}</div>`);
  if (note) parts.push(`<p class="wk-told">${esc(note)}</p>`);
  const missed = q.mode === 'design' && run.phase === 'done' && !done;
  return `<div class="wk-puzzle wk-${q.kind} wk-${q.mode} wk-n${run.n}${done ? ' solved' : ''}${missed ? ' missed' : ''}" data-mechanic-wire="knowledge">${parts.join('')}<p class="sr-only" role="status">${esc(statusOf(q, b, run, note))}</p></div>`;
}

export const knowledgeMechanics = {
  knowledge: {
    fresh, valid, solved, move, hint, render,
    ui(p, payload) {
      if (!object(payload) || payload.noop) return;
      const state = ui(p);
      if (Number.isInteger(payload.coach)) { state.coach = {doll: payload.coach, at: payload.at}; state.told = null; return; }
      const t = payload.told;
      state.told = object(t) && TOLD[t.why] && Array.isArray(t.cards) ? {...t, seen: payload.seen} : null;
      if (state.told && object(payload.base) && Array.isArray(payload.base.out)) state.base = payload.base;
    },
    reset: p => { uiState.delete(p.id); },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'knowledge',
  family: {id: 'knowledge', symbol: '⊨'},
  mechanics: knowledgeMechanics,
  pack: new URL('./knowledge.json', import.meta.url).href,
  css: new URL('./knowledge.css', import.meta.url).href,
  focus: 'button.wk-card,.wk-reply:not([disabled]),.wk-say:not([disabled]),.wk-show:not([disabled]),.wk-next:not([disabled])'
};
