import { esc, submitButton } from './expansion-controls.js';
import { clockJumpArc } from './clock-geometry.js';
import { clockRunCount, clockTrailStep, CLOCK_TRAIL_LIMIT } from './clock-playback.js';
import { billiard } from './couriers.js';

// Adapted from the locally consulted weeks 02, 04, and 09 worksheets and
// redesign notes. Instance-level provenance lives in the expansion catalog.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const numberInput = value => (typeof value === 'number' || typeof value === 'string' && /^\d+$/.test(value)) && integer(Number(value)) ? Number(value) : null;
const range = (min, max) => Array.from({ length: max - min + 1 }, (_, i) => min + i);
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const lcm = (a, b) => a / gcd(a, b) * b;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : word.endsWith('ss') ? 'es' : 's'}`;

export function toggleState(p, presses) {
  const { vertices, edges, initial_on } = p.parameters;
  const on = new Set(initial_on);
  for (const index of presses) for (const vertex of edges[index]) {
    if (on.has(vertex)) on.delete(vertex); else on.add(vertex);
  }
  return vertices.filter(vertex => on.has(vertex));
}

function validToggle(p, board) {
  if (!object(board) || !Array.isArray(board.on) || !Array.isArray(board.presses) || board.presses.length > 10000) return false;
  if (board.presses.some(edge => !integer(edge) || edge < 0 || edge >= p.parameters.edges.length)) return false;
  if (board.on.length !== new Set(board.on).size || board.on.some(vertex => !p.parameters.vertices.includes(vertex))) return false;
  const budget = p.parameters.press_budget;
  if (budget !== null && budget !== undefined && board.presses.length > budget) return false;
  const replay = toggleState(p, board.presses);
  return replay.length === board.on.length && replay.every(vertex => board.on.includes(vertex));
}

function solvedToggle(p, board) {
  return validToggle(p, board) && board.on.length === p.parameters.target_on.length && p.parameters.target_on.every(vertex => board.on.includes(vertex));
}

const toggleDistances = new Map();
function toggleRoute(p, board) {
  const { vertices, edges, target_on } = p.parameters;
  const mask = on => on.reduce((bits, vertex) => bits | 1 << vertices.indexOf(vertex), 0);
  const target = mask(target_on), start = mask(board.on);
  const moves = edges.map(edge => mask(edge));
  // Pair flips are reversible: one search from the goal serves every later
  // hint and dead-end check on this board, including larger grids.
  const key = JSON.stringify([vertices, edges, target_on]);
  if (!toggleDistances.has(key)) {
    const distances = new Map([[target, 0]]), queue = [target];
    for (let i = 0; i < queue.length; i++) {
      for (const edge of moves) {
        const next = queue[i] ^ edge;
        if (!distances.has(next)) { distances.set(next, distances.get(queue[i]) + 1); queue.push(next); }
      }
    }
    toggleDistances.set(key, distances);
  }
  const distances = toggleDistances.get(key), path = [];
  if (!distances.has(start)) return null;
  let state = start;
  while (state !== target) {
    const edge = moves.findIndex(move => distances.get(state ^ move) === distances.get(state) - 1);
    path.push(edge); state ^= moves[edge];
  }
  return path;
}

function togglePositions(parameters) {
  const { topology, vertices, rows } = parameters;
  // Authored worksheet coordinates use the same 360 × 280 SVG as the built-in layouts.
  if (parameters.positions) return parameters.positions;
  // The tree fills the picture, so sibling wires sit far enough apart for 40 px taps on a phone.
  if (topology === 'complete_binary_tree_depth_2') return [[180, 36], [84, 140], [276, 140], [36, 244], [132, 244], [228, 244], [324, 244]];
  if (topology === 'rectangular_grid') return vertices.map(vertex => {
    const row = rows.findIndex(line => line.includes(vertex));
    return [45 + rows[row].indexOf(vertex) * 270 / (rows[row].length - 1), 45 + row * 190 / (rows.length - 1)];
  });
  return vertices.map((_, i) => [180 + Math.sin(i * 2 * Math.PI / vertices.length) * 112, 142 - Math.cos(i * 2 * Math.PI / vertices.length) * 112]);
}

function lanternPicture(p, on, title, goal = false, disabled = false) {
  const { vertices, edges } = p.parameters, positions = togglePositions(p.parameters);
  const lines = edges.map(([a, b]) => {
    const [x1, y1] = positions[vertices.indexOf(a)], [x2, y2] = positions[vertices.indexOf(b)];
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join('');
  // The wires themselves are the tap and keyboard targets.
  const wireHits = goal ? '' : edges.map(([a, b], edge) => {
    const [x1, y1] = positions[vertices.indexOf(a)], [x2, y2] = positions[vertices.indexOf(b)];
    return `<line class="wire-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" role="button" tabindex="${disabled ? -1 : 0}" aria-label="Press wire ${esc(a)} to ${esc(b)}; flip both lanterns" aria-disabled="${disabled}" ${disabled ? '' : 'data-action="expansion-move"'} data-move="${esc(JSON.stringify({ edge }))}" data-focus="wire-${edge}"/>`;
  }).join('');
  const lamps = vertices.map((vertex, i) => {
    const [x, y] = positions[i], bright = on.includes(vertex);
    return `<g class="lantern ${bright ? 'lit' : ''}"><circle cx="${x}" cy="${y}" r="21"/><text x="${x}" y="${y + 6}">${esc(vertex)}</text>${bright ? `<path class="lamp-rays" d="M${x - 27} ${y}h-5 M${x + 27} ${y}h5 M${x} ${y - 27}v-5 M${x} ${y + 27}v5"/>` : ''}</g>`;
  }).join('');
  return `<figure class="lantern-picture ${goal ? 'goal-picture' : ''}"><figcaption>${esc(title)}</figcaption><svg viewBox="0 0 360 280" role="${goal ? 'img' : 'group'}" aria-label="${esc(title)}. Bright: ${esc(on.join(', ') || 'none')}. All other lanterns dark."><g class="lantern-wires">${lines}${wireHits}</g>${lamps}</svg></figure>`;
}

const toggle = {
  fresh: p => ({ on: [...p.parameters.initial_on], presses: [] }),
  valid: validToggle,
  solved: solvedToggle,
  move(p, board, action) {
    if (!validToggle(p, board) || !object(action)) return null;
    const edge = numberInput(action.edge), budget = p.parameters.press_budget;
    if (edge === null || edge < 0 || edge >= p.parameters.edges.length || board.presses.length >= 10000 || budget != null && board.presses.length >= budget) return null;
    const presses = [...board.presses, edge];
    return { on: toggleState(p, presses), presses };
  },
  hint(p, board) {
    if (!validToggle(p, board)) return { type: 'deadend', text: 'Start again to restore the lantern wires.' };
    if (solvedToggle(p, board)) return { type: 'done' };
    const route = toggleRoute(p, board), left = p.parameters.press_budget == null ? Infinity : p.parameters.press_budget - board.presses.length;
    // With a budget of the fewest presses every wasted press is a dead end at
    // once. While presses are left it is told only behind Hint (quiet), or the
    // line would judge each press and blind presses with Undo would solve;
    // once the budget is spent, the line says what is wrong.
    if (!route || route.length > left) return left > 0
      ? { type: 'deadend', quiet: true, text: `This picture needs ${route ? plural(route.length, 'more press') : 'a new start'}, but only ${plural(left, 'press')} ${left === 1 ? 'remains' : 'remain'}. Undo a press or start again.` }
      : { type: 'deadend', text: 'The lanterns don’t match the goal card. Undo.' };
    const edge = route[0];
    return { type: 'move', action: { edge }, remaining: route.length, text: `Press wire ${p.parameters.edges[edge].join('–')}. A route from this picture takes ${plural(route.length, 'press')}.` };
  },
  render(p, attempt) {
    const board = attempt.board, budget = p.parameters.press_budget;
    const full = budget != null && board.presses.length >= budget;
    return `<div class="motion-board toggle-board">${budget == null ? '' : `<p class="motion-status" role="status">${plural(budget - board.presses.length, 'press')} remaining</p>`}<div class="lantern-comparison">${lanternPicture(p, board.on, 'Your lanterns', false, full)}${lanternPicture(p, p.parameters.target_on, 'Goal card', true)}</div></div>`;
  },
  demo: 'Tap a wire: both lanterns at its ends change together. With a keyboard, Tab to a wire and press Enter or Space. Undo restores the previous picture and press budget.'
};

export function clockPeriod(parameters) {
  return parameters.clocks.reduce((period, clock) => lcm(period, clock.positions / gcd(clock.positions, clock.jump)), 1);
}

export function firstClockHit(parameters) {
  const period = clockPeriod(parameters);
  for (let count = 1; count <= period; count++) {
    if (parameters.clocks.every(clock => (clock.start + clock.jump * count) % clock.positions === clock.target)) return count;
  }
  return null;
}

function validClock(p, board) {
  if (!object(board) || !Object.hasOwn(board, 'prediction')) return false;
  if (board.prediction === null) return true;
  if (!integer(board.prediction) || board.prediction <= 0) return false;
  return p.parameters.mode !== 'choose_jump' || board.prediction >= p.parameters.jump_min && board.prediction <= p.parameters.jump_max;
}

function solvedClock(p, board) {
  if (!validClock(p, board) || board.prediction === null) return false;
  const params = p.parameters;
  return params.mode === 'choose_jump'
    ? params.positions / gcd(params.positions, board.prediction) === params.required_first_return
    : firstClockHit(params) === board.prediction;
}

// The drawing inside one clock: its places, the jump arrow, the trail of bells
// rung so far and the marker. Shared by the board below and the ferry's bell
// wheels on the Lantern Road (dist/road-stage.js).
// `big` draws larger places and numbers, for a wheel drawn small; `compact` does
// the same for the board's clocks laid side by side, with the count and its
// word spaced for larger type (motion.css .clock-compact).
export function clockFace(clock, count, total, { big = false, compact = false } = {}) {
  big ||= compact;
  const point = (position, radius = 110) => [160 + radius * Math.sin(position * 2 * Math.PI / clock.positions), 160 - radius * Math.cos(position * 2 * Math.PI / clock.positions)];
  const current = clockPlace(clock, count);
  const arrow = clockJumpArc(clock.positions, clock.start, clock.jump);
  const nodes = range(0, clock.positions - 1).map(position => {
    const [x, y] = point(position), target = clock.target === position;
    // The road's big wheels set their larger star further out, clear of its number.
    const [starX, starY] = point(position, compact ? 146 : big ? 150 : 138);
    return `<g class="clock-position ${target ? 'clock-target' : ''}"><circle cx="${x}" cy="${y}" r="${big ? 25 : 18}"/><text x="${x}" y="${y + (big ? 9 : 5)}">${position}</text>${target ? `<text class="clock-star" x="${starX}" y="${starY + 6}">★</text>` : ''}</g>`;
  }).join('');
  const [x, y] = point(current);
  const trail = range(1, Math.min(count, CLOCK_TRAIL_LIMIT)).map(bell => {
    const step = clockTrailStep(clock.positions, clock.start, clock.jump, bell, total);
    return `<path class="clock-trail" d="${step.path}"/><polygon class="clock-trail-head" points="${step.head}"/>`;
  }).join('');
  return `<circle class="clock-ring" cx="160" cy="160" r="110"/><path class="clock-jump-arrow" d="${arrow.path}"/><polygon class="clock-jump-head" points="${arrow.head}"/>${trail}${nodes}<circle class="clock-marker" cx="${x}" cy="${y}" r="${big ? 30 : 23}"/><text class="clock-center" x="160" y="${compact ? 154 : 157}">${count}</text><text class="clock-center-label" x="160" y="${compact ? 188 : 179}">${count === 1 ? 'bell' : 'bells'}</text>`;
}
export const clockPlace = (clock, count) => (clock.start + clock.jump * (count % clock.positions)) % clock.positions;

function clockPicture(clock, count, label, total, control = null, compact = false) {
  const arrow = clockJumpArc(clock.positions, clock.start, clock.jump), current = clockPlace(clock, count);
  const name = `${esc(label)}: ${clock.positions} places, jump ${clock.jump} clockwise from ${arrow.from} to ${arrow.to}, star ${clock.target}. Marker ${count ? 'at' : 'starts at'} ${current}.`;
  const role = control ? `role="slider" tabindex="0" data-focus="clock-jump" aria-valuemin="${control.min}" aria-valuemax="${control.max}" aria-valuenow="${clock.jump}" aria-valuetext="Jump ${clock.jump} clockwise from ${arrow.from} to ${arrow.to}"` : 'role="img"';
  return `<figure class="clock-picture${compact ? ' clock-compact' : ''}"><figcaption>${esc(label)}<span class="clock-jump-caption">Jump ${clock.jump}</span></figcaption><svg viewBox="0 0 320 320" ${role} aria-label="${name}">${clockFace(clock, count, total, { compact })}</svg></figure>`;
}

// Small count puzzles offer tap choices, marking the numbers already rung.
// Longer periods use one numeric control instead of a large answer bank.
export function bellChart(p, attempt, presentation = {}) {
  const chosen = Number(presentation.draft ?? attempt.board.prediction ?? 0);
  const length = Math.max(10, Math.ceil(clockPeriod(p.parameters) / 10) * 10);
  // A count outside the chart is refused with this line (dist/main.js), not the browser's tooltip.
  if (length > 20) return `<label class="bell-count">Bells<input type="number" name="activations" min="1" max="${length}" step="1" inputmode="numeric" value="${esc(presentation.draft ?? attempt.board.prediction ?? '')}" data-focus="bell-count" data-invalid="Choose 1 to ${length} bells." required></label>`;
  const tried = new Set([...(attempt.history || []).map(h => h.board.prediction), attempt.board.prediction].filter(n => n != null));
  return `<fieldset class="bell-chart"><legend class="sr-only">Bell count</legend>${range(1, length).map(n => `<label class="bell-number ${tried.has(n) ? 'is-tried' : ''}"><input type="radio" name="activations" value="${n}" data-focus="bell-${n}" data-invalid="Tap a number first." ${n === chosen ? 'checked' : ''} required><span>${n}</span>${tried.has(n) ? `<span class="sr-only"> (rung)</span>` : ''}</label>`).join('')}</fieldset>`;
}
// What a wrong ring showed, or '' for none or a solve.
export function clockFeedback(p, attempt) {
  const params = p.parameters, prediction = attempt.board.prediction, gear = params.mode === 'choose_jump';
  if (prediction === null || solvedClock(p, attempt.board)) return '';
  if (gear) return `Jump ${prediction} first returns on bell ${params.positions / gcd(params.positions, prediction)}.`;
  const endpoint = params.clocks.map(clock => clockPlace(clock, prediction)), one = params.clocks.length === 1;
  const early = endpoint.every((position, i) => position === params.clocks[i].target);
  return `After ${plural(prediction, 'bell')}: ${endpoint.join(' and ')}. ${early ? (one ? 'The marker reached its star on an earlier bell.' : 'The markers reached their stars on an earlier bell.') : one ? 'The marker must land on its star.' : 'The markers must land on their stars together.'}`;
}

const clock = {
  fresh: () => ({ prediction: null }),
  valid: validClock,
  solved: solvedClock,
  move(p, board, action) {
    if (!validClock(p, board) || !object(action)) return null;
    const prediction = numberInput(action[p.parameters.mode === 'choose_jump' ? 'jump' : 'activations']);
    const next = { prediction };
    return prediction !== null && validClock(p, next) ? next : null;
  },
  hint(p, board) {
    if (!validClock(p, board)) return { type: 'deadend', text: 'Start again to restore the clocks.' };
    if (solvedClock(p, board)) return { type: 'done' };
    const params = p.parameters;
    if (params.mode === 'choose_jump') {
      const jump = range(params.jump_min, params.jump_max).find(jump => params.positions / gcd(params.positions, jump) === params.required_first_return);
      return { type: 'move', action: { jump }, text: `Try a fixed jump of ${jump}. Follow its landings and check that the first return is bell ${params.required_first_return}.` };
    }
    const activations = firstClockHit(params);
    if (activations === null) return { type: 'deadend', text: 'These stars do not meet on the same bell.' };
    return { type: 'move', action: { activations }, text: `${params.clocks.length > 1 ? 'All markers first reach their stars together' : 'The marker first lands on its star'} after ${plural(activations, 'bell')}. The starting position is bell zero; count each landing after it.` };
  },
  render(p, attempt, ctx = {}) {
    const params = p.parameters, prediction = attempt.board.prediction, gear = params.mode === 'choose_jump';
    const presentation = ctx.clockPresentation ?? {};
    const clocks = gear ? [{ positions: params.positions, start: params.start, target: params.start, jump: Number(presentation.jump ?? presentation.draft ?? prediction ?? params.jump_min) }] : params.clocks;
    const submittedCount = clockRunCount(p, prediction);
    const count = presentation.count ?? submittedCount;
    const controls = gear ? `<input type="hidden" name="jump" value="${clocks[0].jump}">` : bellChart(p, attempt, presentation);
    const feedback = clockFeedback(p, attempt);
    return `<div class="motion-board clock-board${gear?' clock-choose':''}"><div class="clock-pictures${clocks.length > 1 ? ' clock-several' : ''}">${clocks.map((item, i) => clockPicture(item, count, clocks.length>1?`Clock ${i + 1} · `:'', submittedCount, gear ? { min: params.jump_min, max: params.jump_max } : null, clocks.length > 1)).join('')}</div><form data-puzzle-form class="motion-form" id="bell-form" novalidate>${controls}${submitButton('Ring')}</form>${feedback ? `<div class="motion-result" role="status">${feedback}</div>` : ''}</div>`;
  },
  help(p, attempt) {
    const params = p.parameters, prediction = attempt.board.prediction, gear = params.mode === 'choose_jump';
    if (prediction === null) return '';
    const clocks = gear ? [{ positions: params.positions, start: params.start, target: params.start, jump: prediction }] : params.clocks;
    const count = gear ? params.required_first_return : prediction;
    const routeLimit = Math.min(count, 48);
    const table = prediction === null ? '' : `<details class="motion-route"><summary>See every landing${count > routeLimit ? ` (first ${routeLimit} bells)` : ''}</summary><div class="motion-table-wrap"><table><caption>One bell moves every marker</caption><thead><tr><th scope="col">Bell</th>${clocks.map((_, i) => `<th scope="col">Clock ${i + 1}</th>`).join('')}</tr></thead><tbody>${range(0, routeLimit).map(t => `<tr><th scope="row">${t}${t === 0 ? ' · start' : ''}</th>${clocks.map(clock => `<td>${(clock.start + clock.jump * t) % clock.positions}${(clock.start + clock.jump * t) % clock.positions === clock.target ? ' ★' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
    return `<div class="motion-board">${table}</div>`;
  },
  demo: 'Choose a bell count, then ring. Starting places are bell zero. A star only counts when the marker lands there. Each bell moves every marker.'
};

// Mirror Couriers (billiard) lives in couriers.js; its geometry is re-exported
// here so existing imports keep working.
export { simulateBilliard, launchOutcome, firstCrossing, aimAt, unfoldLine, cornerMap } from './couriers.js';

export const motionMechanics = { toggle, clock, billiard };
