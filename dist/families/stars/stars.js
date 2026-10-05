// Star drawing (worksheet Week 4), a group inside Clockwork Gates. Dots sit
// evenly around a ring. A hop of k draws a straight line from a dot to the
// dot k places clockwise; keep hopping until the line comes back, then start
// again at a dot with no line until every dot has one. Each start draws one
// piece. On n dots, hop k makes gcd(n, k) pieces of n / gcd(n, k) dots each,
// so every hop draws a single piece exactly when n and k share no factor.
// A "decide" puzzle asks for a number of pieces that may be impossible: the
// child may claim that no hop makes it, after one finished drawing.
import {esc, actionButton} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const index = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const MAX_DOTS = 40, TAP_LIMIT = 200;

// Pieces of hop k on n dots, found by drawing: walk from each dot not yet
// reached until the walk comes back. (The validator checks this against gcd.)
export function pieces(n, k) {
  const seen = new Set(), out = [];
  for (let start = 0; start < n; start++) {
    if (seen.has(start)) continue;
    const piece = [];
    let at = start;
    do { piece.push(at); seen.add(at); at = (at + k) % n; } while (at !== start);
    out.push(piece);
  }
  return out;
}
const hopsWithOnePiece = n => Array.from({length: n - 1}, (_, i) => i + 1).filter(k => pieces(n, k).length === 1);
const ringAllOne = n => hopsWithOnePiece(n).length === n - 1;
// The answer to a one-check round: the hops (or rings) that draw one piece.
export function roundAnswer(q, round) {
  if (q.ask === 'hops') return hopsWithOnePiece(q.rounds[round]);
  const [lo, hi] = q.rounds[round];
  return Array.from({length: hi - lo + 1}, (_, i) => lo + i).filter(ringAllOne);
}
export const roundChoices = (q, round) => q.ask === 'hops' ? Array.from({length: q.rounds[round] - 1}, (_, i) => i + 1) : Array.from({length: q.rounds[round][1] - q.rounds[round][0] + 1}, (_, i) => q.rounds[round][0] + i);

const ringOf = (q, board) => q.mode === 'draw' || q.mode === 'starts' ? q.dots : board.ring;
const fixedHop = q => q.mode === 'draw' || q.mode === 'rings' ? q.hop : null;
// Replays the taps: which lines exist, where the pen is, the hop in use and
// the start of each piece. Returns null for a tap the rules don't allow.
export function replay(q, board) {
  const n = ringOf(q, board);
  if (!integer(n)) return board.taps.length ? null : {n: null, hop: fixedHop(q), lines: [], starts: [], pen: null, touched: new Set(), complete: false};
  let hop = fixedHop(q), pen = null, start = null;
  const lines = [], starts = [], touched = new Set();
  for (const raw of board.taps) {
    const d = raw;
    if (!integer(d) || d < 0 || d >= n) return null;
    if (pen === null) {
      if (touched.has(d)) return null;
      pen = d; start = d; starts.push(d);
      continue;
    }
    if (hop === null) { if (d === pen) return null; hop = (d - pen + n) % n; }
    else if (d !== (pen + hop) % n) return null;
    lines.push([pen, d, starts.length - 1]);
    touched.add(pen); touched.add(d);
    pen = d === start ? null : d;
  }
  return {n, hop, lines, starts, pen, touched, complete: pen === null && touched.size === n && lines.length > 0};
}
const sameChords = (n, a, b) => (a - b) % n === 0 || (a + b) % n === 0;
const decides = q => q.mode === 'starts' && q.decide === true;
export const startsPossible = q => Array.from({length: q.dots - 1}, (_, i) => i + 1).some(k => pieces(q.dots, k).length === q.starts);
function goalMet(q, run) {
  if (!run?.complete) return false;
  if (q.mode === 'draw') return true;
  if (q.mode === 'starts' || q.mode === 'rings') return run.starts.length === q.starts;
  if (q.mode === 'match') return run.n === q.target.dots && sameChords(run.n, run.hop, q.target.hop);
  return false;
}

function validBoard(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'every') {
    if (!integer(b.round) || b.round < 0 || b.round >= q.rounds.length || !Array.isArray(b.marked) || typeof b.checked !== 'boolean') return false;
    const choices = roundChoices(q, b.round);
    return new Set(b.marked).size === b.marked.length && b.marked.every(v => choices.includes(v)) && (!b.checked || b.marked.length > 0);
  }
  if (!Array.isArray(b.taps) || b.taps.length > TAP_LIMIT) return false;
  if (q.mode === 'rings' || q.mode === 'match') { if (!(b.ring === null || q.choices.includes(b.ring))) return false; }
  else if (Object.hasOwn(b, 'ring')) return false;
  const run = replay(q, b);
  if (!run) return false;
  if (!decides(q)) return !['tried', 'claimed', 'wrong'].some(key => Object.hasOwn(b, key));
  // Board: {taps, tried, claimed, wrong}. `tried` counts finished drawings;
  // a claim is saved only when it is true, a refused one only when false.
  if (!integer(b.tried) || b.tried < (run.complete ? 1 : 0) || b.tried > TAP_LIMIT || typeof b.claimed !== 'boolean' || typeof b.wrong !== 'boolean') return false;
  if (b.claimed && (startsPossible(q) || b.tried < 1 || b.wrong)) return false;
  return !b.wrong || (startsPossible(q) && b.tried >= 1);
}
function solvedBoard(p, b) {
  if (!validBoard(p, b)) return false;
  const q = p.parameters;
  if (q.mode === 'every') return b.checked && sameSet(b.marked, roundAnswer(q, b.round));
  return (decides(q) && b.claimed) || goalMet(q, replay(q, b));
}
const sameSet = (a, b) => a.length === b.length && a.every(v => b.includes(v));

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'every') return {round: 0, marked: [], checked: false};
  if (decides(q)) return {taps: [], tried: 0, claimed: false, wrong: false};
  return q.mode === 'rings' || q.mode === 'match' ? {ring: null, taps: []} : {taps: []};
}
function move(p, b, action) {
  const q = p.parameters;
  if (!validBoard(p, b) || solvedBoard(p, b) || !object(action)) return null;
  if (q.mode === 'every') {
    if (action.type === 'mark' && !b.checked) {
      const v = index(action.value);
      if (!roundChoices(q, b.round).includes(v)) return null;
      return {...b, marked: b.marked.includes(v) ? b.marked.filter(x => x !== v) : [...b.marked, v].sort((x, y) => x - y)};
    }
    if (action.type === 'check' && !b.checked && b.marked.length) return {...b, checked: true};
    if (action.type === 'next' && b.checked) return {round: (b.round + 1) % q.rounds.length, marked: [], checked: false};
    return null;
  }
  const clear = decides(q) ? {wrong: false} : {};
  if (action.type === 'again') return b.taps.length ? {...b, taps: [], ...clear} : null;
  if (action.type === 'claim') {
    if (!decides(q) || b.tried < 1 || b.wrong) return null;
    return startsPossible(q) ? {...b, wrong: true} : {...b, claimed: true};
  }
  if (action.type === 'ring') {
    const ring = index(action.ring);
    if (!(q.mode === 'rings' || q.mode === 'match') || !q.choices.includes(ring) || ring === b.ring) return null;
    return {ring, taps: []};
  }
  if (action.type === 'tap') {
    const next = {...b, taps: [...b.taps, index(action.dot)], ...clear};
    const run = next.taps.length > TAP_LIMIT ? null : replay(q, next);
    if (!run) return null;
    if (decides(q) && run.complete) next.tried = b.tried + 1;
    return next;
  }
  return null;
}

// The next tap of a drawing with hop k on n dots, continuing the board.
function nextTap(run, k) {
  if (run.pen === null) { for (let d = 0; d < run.n; d++) if (!run.touched.has(d)) return d; return null; }
  return (run.pen + k) % run.n;
}
const ordinal = d => d === 0 ? 'the top dot' : `the dot ${plural(d, 'place')} clockwise from the top`;
function hint(p, b) {
  const q = p.parameters;
  if (!validBoard(p, b)) return {type: 'deadend', text: 'Restart to clear the drawing.'};
  if (solvedBoard(p, b)) return {type: 'done'};
  if (q.mode === 'every') return b.checked ? {type: 'move', action: {type: 'next'}, text: 'Try the next one.'} : {type: 'note'};
  if (decides(q)) return {type: 'note'};
  const run = replay(q, b);
  // Which ring and hop reach the goal.
  let ring = run.n, hop = run.hop;
  if (q.mode === 'rings') {
    const good = q.choices.filter(n => pieces(n, q.hop).length === q.starts);
    if (!good.includes(ring)) return {type: 'move', action: {type: 'ring', ring: good[0]}, text: `Try the ring of ${good[0]} dots.${ring ? ` Hop ${q.hop} on ${ring} dots makes ${plural(pieces(ring, q.hop).length, 'piece')}.` : ''}`};
  }
  if (q.mode === 'match' && ring !== q.target.dots) return {type: 'move', action: {type: 'ring', ring: q.target.dots}, text: `Try the ring of ${q.target.dots} dots: the picture has ${plural(pieces(q.target.dots, q.target.hop).length, 'piece')} of ${pieces(q.target.dots, q.target.hop)[0].length} dots each.`};
  const wanted = q.mode === 'starts' ? k => pieces(ring, k).length === q.starts : q.mode === 'match' ? k => sameChords(ring, k, q.target.hop) : () => true;
  if (hop !== null && !wanted(hop)) return {type: 'move', action: {type: 'again'}, text: `Hop ${hop} on ${ring} dots makes ${plural(pieces(ring, hop).length, 'piece')}. Press Again and choose another hop.`};
  if (hop === null) {
    hop = Array.from({length: ring - 1}, (_, i) => i + 1).find(wanted);
    if (!b.taps.length) return {type: 'move', action: {type: 'tap', dot: 0}, text: `Start at the top dot, then hop ${hop}.`};
    const d = (run.pen + hop) % ring;
    return {type: 'move', action: {type: 'tap', dot: d}, text: `Try hop ${hop}: tap ${ordinal(d)}.`};
  }
  const d = nextTap(run, hop);
  return {type: 'move', action: {type: 'tap', dot: d}, text: run.pen === null ? `Start again at a dot with no line: ${ordinal(d)}.` : `Count ${hop} dots clockwise and tap ${ordinal(d)}.`};
}

const COLORS = 6;
const point = (n, d, r = 40) => [50 + r * Math.sin(2 * Math.PI * d / n), 50 - r * Math.cos(2 * Math.PI * d / n)];
// Chords for a list of [from, to, piece] lines on n dots, in viewBox units.
const chords = (n, lines) => lines.map(([a, b, k]) => {
  const [x1, y1] = point(n, a), [x2, y2] = point(n, b);
  return `<line class="star-line c${k % COLORS}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
}).join('');
// A picture of the whole drawing of hop k on n dots (the goal card).
export function figure(n, k, label) {
  const lines = pieces(n, k).flatMap((piece, j) => piece.map((d, i) => [d, piece[(i + 1) % piece.length], j]));
  return `<svg class="star-figure" viewBox="6 6 88 88" role="img" aria-label="${esc(label)}">${chords(n, lines)}</svg>`;
}
const centerCount = (q, run) => {
  const made = run.starts.length, target = q.mode === 'starts' || q.mode === 'rings' ? q.starts : null;
  const slots = target ? Math.max(target, made) : made;
  const dots = Array.from({length: slots}, (_, i) => `<i class="${i < made ? `c${i % COLORS}` : 'empty'}${target && i >= target ? ' extra' : ''}"></i>`).join('');
  const label = target ? `${plural(made, 'piece')} of ${target}` : plural(made, 'piece');
  return `<div class="star-count${target && run.complete && made !== target ? ' missed' : ''}" role="img" aria-label="${label}">${dots}</div>`;
};
function ringBoard(p, a, run, hinted) {
  const q = p.parameters, n = run.n, solved = solvedBoard(p, a.board);
  const size = n <= 10 ? 'big' : n <= 14 ? 'mid' : 'small';
  const dots = Array.from({length: n}, (_, d) => {
    const [x, y] = point(n, d), lined = run.touched.has(d), pen = run.pen === d;
    const label = `Dot ${d === 0 ? 'at the top' : `${d} clockwise from the top`}${pen ? ', pen is here' : lined ? ', has a line' : ''}`;
    return `<button type="button" class="star-dot${lined ? ' lined' : ''}${pen ? ' pen' : ''}${hinted === d ? ' hinted' : ''}" style="left:${x}%;top:${y}%" data-star-move="${esc(JSON.stringify({type: 'tap', dot: d}))}" data-focus="star-dot-${d}" aria-label="${esc(label)}" ${solved ? 'disabled' : ''}></button>`;
  }).join('');
  const hop = run.hop === null ? '' : `<span class="star-hop" aria-label="Hop ${run.hop}">Hop ${run.hop}</span>`;
  return `<div class="star-ring ${size}" role="group" aria-label="Ring of ${n} dots">
    <svg class="star-lines" viewBox="0 0 100 100" aria-hidden="true"><circle class="star-circle" cx="50" cy="50" r="40"/>${chords(n, run.lines)}</svg>
    ${dots}${centerCount(q, run)}</div>${hop}`;
}
const moveButton = (label, action, cls = 'secondary', extra = '') => `<button type="button" class="${cls} star-action" data-star-move="${esc(JSON.stringify(action))}" data-focus="star-${esc(action.type)}${action.ring ? `-${action.ring}` : ''}" ${extra}>${label}</button>`;
function renderDrawing(p, a) {
  const q = p.parameters, b = a.board, run = replay(q, b), solved = solvedBoard(p, b);
  const shown = a.hintLevel >= 2 && !solved ? hint(p, b) : null;
  const hinted = shown?.action?.type === 'tap' ? shown.action.dot : null;
  const picker = q.mode === 'rings' || q.mode === 'match' ? `<div class="star-picker" role="group" aria-label="Rings">${q.choices.map(n => moveButton(String(n), {type: 'ring', ring: n}, 'secondary star-pick', `aria-label="Ring of ${n} dots" aria-pressed="${b.ring === n}" ${solved ? 'disabled' : ''}`)).join('')}</div>` : '';
  const goal = q.mode === 'match' ? `<figure class="star-goal">${figure(q.target.dots, q.target.hop, 'Goal picture')}</figure>` : '';
  const given = fixedHop(q) !== null && run.n === null ? `<span class="star-hop">Hop ${q.hop}</span>` : '';
  const board = run.n === null ? `<div class="star-ring empty" aria-hidden="true"></div>${given}` : ringBoard(p, a, run, hinted);
  const again = b.taps?.length && !solved ? moveButton('<span aria-hidden="true">↺</span> Again', {type: 'again'}, `secondary star-again${shown?.action?.type === 'again' ? ' hinted' : ''}`) : '';
  const claim = decides(q) && !solved ? moveButton(`No hop makes ${q.starts}`, {type: 'claim'}, 'secondary star-claim', b.tried && !b.wrong ? '' : 'disabled') : '';
  const said = !decides(q) ? '' : b.claimed ? `Right: no hop makes ${plural(q.starts, 'piece')} on ${q.dots} dots.` : b.wrong ? `Some hop does make ${plural(q.starts, 'piece')}. Keep looking.` : '';
  const status = run.n === null ? 'Choose a ring.' : `${run.hop === null ? '' : `Hop ${run.hop}. `}${plural(run.starts.length, 'piece')}. ${run.touched.size} of ${run.n} dots have a line.${run.complete && !solved ? ' The drawing is finished but does not match the goal.' : ''}`;
  return `<div class="stars-puzzle mode-${q.mode}" data-mechanic-wire="stars">${goal}${picker}${board}<div class="star-tools">${again}${claim}</div>${said ? `<p class="star-note${b.claimed ? ' good' : ''}" role="status">${esc(said)}</p><p class="sr-only">${esc(status)}</p>` : `<p class="sr-only" role="status">${esc(status)}</p>`}</div>`;
}
function renderRound(p, a) {
  const q = p.parameters, b = a.board, answer = roundAnswer(q, b.round), solved = solvedBoard(p, b);
  const choices = roundChoices(q, b.round), reveal = b.checked;
  const right = v => answer.includes(v);
  const buttons = choices.map(v => {
    const marked = b.marked.includes(v), cls = `secondary star-mark${reveal ? (right(v) ? ' answer' : '') + (marked !== right(v) ? ' miss' : '') : ''}`;
    const label = q.ask === 'hops' ? `Hop ${v}` : `Ring of ${v} dots`;
    return actionButton(String(v), {type: 'mark', value: v}, `aria-pressed="${marked}" aria-label="${label}${reveal ? (right(v) ? ', one piece' : ', more than one piece') : ''}" ${reveal ? 'disabled' : ''}`).replace('class="secondary expansion-action"', `class="${cls} expansion-action"`);
  }).join('');
  const ring = q.ask === 'hops' ? `<div class="star-ring tiny" aria-hidden="true"><svg class="star-lines" viewBox="0 0 100 100"><circle class="star-circle" cx="50" cy="50" r="40"/>${Array.from({length: q.rounds[b.round]}, (_, d) => { const [x, y] = point(q.rounds[b.round], d); return `<circle class="star-pip" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.8"/>`; }).join('')}</svg><span class="star-ring-n">${q.rounds[b.round]}</span></div>` : '';
  const missed = reveal && !solved;
  const action = reveal ? (solved ? '' : actionButton('Next', {type: 'next'}).replace('class="secondary expansion-action"', 'class="primary expansion-action"')) : actionButton('Check', {type: 'check'}, b.marked.length ? '' : 'disabled').replace('class="secondary expansion-action"', 'class="primary expansion-action"');
  return `<div class="stars-puzzle mode-every${missed ? ' missed' : ''}">${ring}<div class="star-marks ${q.ask}" role="group" aria-label="${q.ask === 'hops' ? 'Hops' : 'Rings'}">${buttons}</div><div class="star-tools">${action}</div><p class="${missed ? 'star-note' : 'sr-only'}" role="status">${missed ? `Not quite. The outlined ${q.ask === 'hops' ? 'hops make' : 'rings make every hop'} one piece.` : ''}</p></div>`;
}

// Taps go through the module, so a tap on the wrong dot shakes it instead of
// reporting an illegal move. The line a tap draws is animated once.
let drew = null;
function wire(root, p, api) {
  if (drew === p.id) root.querySelector('.star-lines .star-line:last-of-type')?.classList.add('new');
  drew = null;
  root.addEventListener('click', e => {
    const control = e.target.closest('[data-star-move]');
    if (!control || !root.contains(control) || control.disabled) return;
    let action;
    try { action = JSON.parse(control.dataset.starMove); } catch { return; }
    if (action.type === 'tap' && !move(p, api.attempt().board, action)) {
      control.classList.remove('shake'); void control.offsetWidth; control.classList.add('shake');
      return;
    }
    drew = action.type === 'tap' ? p.id : null;
    api.apply(action);
  });
}

export const starMechanics = {
  star: {
    fresh,
    valid: validBoard,
    solved: solvedBoard,
    move,
    hint,
    render: (p, a) => p.parameters.mode === 'every' ? renderRound(p, a) : renderDrawing(p, a),
    wire,
    noUndo: p => p.parameters.mode === 'every',
    demo: 'Tap a dot to start. Then tap the dot the hop lands on, counting clockwise. When the line comes back, start again at a dot with no line.'
  }
};

// The family seam entry (dist/families.js). The puzzles join Clockwork Gates
// as its Stars group, so the module adds no satchel family of its own.
export default {
  id: 'stars',
  mechanics: starMechanics,
  pack: new URL('./stars.json', import.meta.url).href,
  css: new URL('./stars.css', import.meta.url).href,
  focus: '.star-dot:not(:disabled),.star-mark:not(:disabled),.stars-puzzle .primary'
};
