import { esc, selectField, submitButton } from './expansion-controls.js';

// Adapted from the locally consulted weeks 02, 04, and 09 worksheets and
// redesign notes. Instance-level provenance lives in the expansion catalog.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const numberInput = value => (typeof value === 'number' || typeof value === 'string' && /^\d+$/.test(value)) && integer(Number(value)) ? Number(value) : null;
const range = (min, max) => Array.from({ length: max - min + 1 }, (_, i) => min + i);
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const lcm = (a, b) => a / gcd(a, b) * b;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : word === 'press' ? 'es' : 's'}`;
const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const cornerName = value => value.replace('-', ' ');

function toggleState(p, presses) {
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
  if (topology === 'complete_binary_tree_depth_2') return [[180, 35], [95, 120], [265, 120], [45, 220], [135, 220], [225, 220], [315, 220]];
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
    if (!route || route.length > left) return { type: 'deadend', text: `This picture needs ${route ? plural(route.length, 'more press') : 'a new start'}, but only ${plural(left, 'press')} remain. Undo a press or start again.` };
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

function clockPeriod(parameters) {
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

function clockPicture(clock, count, label, animate) {
  const point = position => [140 + 101 * Math.sin(position * 2 * Math.PI / clock.positions), 140 - 101 * Math.cos(position * 2 * Math.PI / clock.positions)];
  const current = (clock.start + clock.jump * (count % clock.positions)) % clock.positions;
  const nodes = range(0, clock.positions - 1).map(position => {
    const [x, y] = point(position), target = clock.target === position;
    return `<g class="clock-position ${target ? 'clock-target' : ''}"><circle cx="${x}" cy="${y}" r="18"/><text x="${x}" y="${y + 5}">${position}</text>${target ? `<text class="clock-star" x="${x}" y="${y - 24}">★</text>` : ''}</g>`;
  }).join('');
  const [x, y] = point(current), visibleCount = Math.min(count, 48);
  const points = range(0, visibleCount).map(t => point((clock.start + clock.jump * t) % clock.positions));
  const motion = animate && count <= 48 ? `<circle class="clock-moving" r="10" cx="${x}" cy="${y}"><animate attributeName="cx" values="${points.map(p => p[0]).join(';')}" dur="${Math.max(1, Math.min(5, count * .3))}s" calcMode="discrete" fill="freeze"/><animate attributeName="cy" values="${points.map(p => p[1]).join(';')}" dur="${Math.max(1, Math.min(5, count * .3))}s" calcMode="discrete" fill="freeze"/></circle>` : '';
  return `<figure class="clock-picture"><figcaption>${esc(label)}Jump ${clock.jump}</figcaption><svg viewBox="0 0 280 280" role="img" aria-label="${esc(label)}: ${clock.positions} places, jump ${clock.jump}, start ${clock.start}, star ${clock.target}. Marker ${animate ? 'after prediction' : 'starts'} at ${current}."><circle class="clock-ring" cx="140" cy="140" r="101"/>${nodes}<circle class="clock-marker" cx="${x}" cy="${y}" r="23"/>${motion}<text class="clock-center" x="140" y="137">${count}</text><text class="clock-center-label" x="140" y="159">${count === 1 ? 'bell' : 'bells'}</text></svg></figure>`;
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
  render(p, attempt) {
    const params = p.parameters, prediction = attempt.board.prediction, gear = params.mode === 'choose_jump';
    const clocks = gear ? [{ positions: params.positions, start: params.start, target: params.start, jump: prediction ?? params.jump_min }] : params.clocks;
    const count = prediction === null ? 0 : gear ? params.required_first_return : prediction;
    const controls = gear ? selectField('jump', 'Fixed jump', range(params.jump_min, params.jump_max), prediction ?? params.jump_min) : `<label class="motion-field">Bell count<input name="activations" type="number" min="1" step="1" inputmode="numeric" value="${prediction ?? ''}"  required></label>`;
    let feedback = '';
    if (prediction !== null) {
      const correct = solvedClock(p, attempt.board);
      const first = gear ? params.positions / gcd(params.positions, prediction) : firstClockHit(params);
      const endpoint = clocks.map(clock => (clock.start + clock.jump * (count % clock.positions)) % clock.positions);
      feedback = correct ? '' : `<div class="motion-result" role="status">${gear ? `Jump ${prediction} first returns on bell ${first}.` : `After ${plural(prediction, 'bell')}: ${endpoint.join(' and ')}. ${endpoint.every((position, i) => position === clocks[i].target) ? 'The markers reached their stars on an earlier bell.' : 'The markers must land on their stars together.'}`}</div>`;
    }
    return `<div class="motion-board clock-board"><div class="clock-pictures">${clocks.map((item, i) => clockPicture(item, count, clocks.length>1?`Clock ${i + 1} · `:'', prediction !== null)).join('')}</div><form data-puzzle-form class="motion-form">${controls}${submitButton('Ring')}</form>${feedback}</div>`;
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
  demo: 'Choose a positive bell count before ringing. Starting places are bell zero. A star only counts when the marker lands there. Each bell moves every marker.'
};

const fraction = (numerator, denominator = 1) => {
  const divisor = gcd(Math.abs(numerator), denominator);
  return denominator / divisor === 1 ? String(numerator / divisor) : `${numerator / divisor}/${denominator / divisor}`;
};
const fractionNumber = value => { const [n, d = 1] = String(value).split('/').map(Number); return n / d; };
const foldFraction = (numerator, denominator, size) => {
  const remainder = numerator % (2 * size * denominator);
  return fraction(remainder <= size * denominator ? remainder : 2 * size * denominator - remainder, denominator);
};

// Exact unfolded wall events. Cross-products order rational times without
// floating-point corner tolerances; only the SVG projection uses decimals.
export function simulateBilliard(width, height, rise, run) {
  if (![width, height, rise, run].every(value => integer(value) && value > 0 && value <= 1000)) throw new RangeError('Positive integer room and direction components are required.');
  const divisor = gcd(rise * width, run * height);
  const roomsX = run * height / divisor, roomsY = rise * width / divisor;
  const path = [['0', '0']];
  let vertical = 1, horizontal = 1;
  while (vertical < roomsX || horizontal < roomsY) {
    const verticalTime = vertical * width * rise, horizontalTime = horizontal * height * run;
    if (vertical < roomsX && (horizontal >= roomsY || verticalTime < horizontalTime)) {
      path.push([String(vertical % 2 ? width : 0), foldFraction(rise * vertical * width, run, height)]);
      vertical++;
    } else {
      path.push([foldFraction(run * horizontal * height, rise, width), String(horizontal % 2 ? height : 0)]);
      horizontal++;
    }
  }
  path.push([String(roomsX % 2 ? width : 0), String(roomsY % 2 ? height : 0)]);
  return { corner: `${roomsY % 2 ? 'top' : 'bottom'}-${roomsX % 2 ? 'right' : 'left'}`, bounces: roomsX + roomsY - 2, path, roomsX, roomsY };
}

function validBilliard(p, board) {
  if (!object(board) || !Object.hasOwn(board, 'prediction')) return false;
  const choice = board.prediction, params = p.parameters;
  if (choice === null) return true;
  if (!object(choice)) return false;
  if (params.mode === 'predict') return corners.includes(choice.corner) && integer(choice.bounces) && choice.bounces >= 0;
  if (params.mode === 'choose_width') return integer(choice.width) && choice.width >= params.width_min && choice.width <= params.width_max;
  return ['rise', 'run'].every(key => integer(choice[key]) && choice[key] >= params.component_min && choice[key] <= params.component_max);
}

function billiardSetting(p, choice) {
  const params = p.parameters;
  return {
    width: params.mode === 'choose_width' ? choice?.width ?? params.width_min : params.width,
    height: params.height,
    rise: params.mode === 'choose_direction' ? choice?.rise ?? params.component_min : params.rise,
    run: params.mode === 'choose_direction' ? choice?.run ?? params.component_min : params.run
  };
}

function billiardResult(setting) { return simulateBilliard(setting.width, setting.height, setting.rise, setting.run); }
function solvedBilliard(p, board) {
  if (!validBilliard(p, board) || board.prediction === null) return false;
  const result = billiardResult(billiardSetting(p, board.prediction)), params = p.parameters;
  return params.mode === 'predict'
    ? board.prediction.corner === result.corner && board.prediction.bounces === result.bounces
    : result.corner === params.target_corner && result.bounces === params.target_bounces;
}

function roomPicture(setting, result) {
  const { width, height, rise, run } = setting, scale = Math.min(280 / width, 260 / height);
  const left = (360 - width * scale) / 2, top = 36, bottom = top + height * scale, right = left + width * scale;
  const xy = ([x, y]) => `${left + fractionNumber(x) * scale},${bottom - fractionNumber(y) * scale}`;
  const grids = [...range(1, width - 1).map(x => `<line x1="${left + x * scale}" y1="${top}" x2="${left + x * scale}" y2="${bottom}"/>`), ...range(1, height - 1).map(y => `<line x1="${left}" y1="${top + y * scale}" x2="${right}" y2="${top + y * scale}"/>`)].join('');
  const arrowLength = Math.min(46, width * scale / 2, height * scale / 2), norm = Math.hypot(run, rise);
  const arrow = `<line class="aim-line" x1="${left}" y1="${bottom}" x2="${left + arrowLength * run / norm}" y2="${bottom - arrowLength * rise / norm}"/><circle class="aim-tip" cx="${left + arrowLength * run / norm}" cy="${bottom - arrowLength * rise / norm}" r="4"/>`;
  const path = result ? `<polyline class="courier-path" pathLength="1" points="${result.path.map(xy).join(' ')}"/>${result.path.slice(1, -1).map((point, i) => { const [x, y] = xy(point).split(','); return `<circle class="bounce-dot" cx="${x}" cy="${y}" r="4"><title>Bounce ${i + 1}</title></circle>`; }).join('')}` : '';
  return `<figure class="courier-room"><figcaption>${width} × ${height} · ${rise} up, ${run} right</figcaption><svg viewBox="0 0 360 ${bottom + 45}" role="img" aria-label="${width} by ${height} room. Start bottom left, aim ${rise} up for ${run} right.${result ? ` First corner ${cornerName(result.corner)}, ${plural(result.bounces, 'wall bounce')}.` : ' Predict before revealing the path.'}"><g class="room-grid">${grids}</g><rect class="room-wall" x="${left}" y="${top}" width="${width * scale}" height="${height * scale}"/>${path}${arrow}<circle class="launch-dot" cx="${left}" cy="${bottom}" r="6"/><text class="room-label" x="16" y="${top - 14}" text-anchor="start">top left</text><text class="room-label" x="344" y="${top - 14}" text-anchor="end">top right</text><text class="room-label" x="16" y="${bottom + 24}" text-anchor="start">start · bottom left</text><text class="room-label" x="344" y="${bottom + 24}" text-anchor="end">bottom right</text></svg></figure>`;
}

function unfoldedPicture(setting, result) {
  const { width, height } = setting, { roomsX, roomsY } = result;
  const scale = Math.min(320 / (roomsX * width), 240 / (roomsY * height));
  const right = 20 + roomsX * width * scale, bottom = 20 + roomsY * height * scale;
  const grid = [...range(0, roomsX).map(x => `<line x1="${20 + x * width * scale}" y1="20" x2="${20 + x * width * scale}" y2="${bottom}"/>`), ...range(0, roomsY).map(y => `<line x1="20" y1="${20 + y * height * scale}" x2="${right}" y2="${20 + y * height * scale}"/>`)].join('');
  return `<details class="motion-route"><summary>Open the mirror rooms</summary><p>The light goes straight through copies of the room: ${plural(roomsX, 'room')} right and ${plural(roomsY, 'room')} up. It stops at the first crossing of both kinds of wall.</p><svg class="unfolded-rooms" viewBox="0 0 ${right + 20} ${bottom + 20}" role="img" aria-label="Unfolded path through ${roomsX} room widths and ${roomsY} room heights"><g class="room-grid">${grid}</g><line class="unfolded-path" x1="20" y1="${bottom}" x2="${right}" y2="20"/><circle class="launch-dot" cx="20" cy="${bottom}" r="4"/></svg></details>`;
}

const billiard = {
  fresh: () => ({ prediction: null }),
  valid: validBilliard,
  solved: solvedBilliard,
  move(p, board, action) {
    if (!validBilliard(p, board) || !object(action)) return null;
    const mode = p.parameters.mode;
    const prediction = mode === 'predict' ? { corner: action.corner, bounces: numberInput(action.bounces) }
      : mode === 'choose_width' ? { width: numberInput(action.width) }
        : { rise: numberInput(action.rise), run: numberInput(action.run) };
    return validBilliard(p, { prediction }) ? { prediction } : null;
  },
  hint(p, board) {
    if (!validBilliard(p, board)) return { type: 'deadend', text: 'Start again to restore the mirror room.' };
    if (solvedBilliard(p, board)) return { type: 'done' };
    const params = p.parameters;
    if (params.mode === 'predict') {
      const result = billiardResult(billiardSetting(p, null));
      return { type: 'move', action: { corner: result.corner, bounces: result.bounces }, text: `Follow ${plural(result.bounces + 1, 'straight piece')} to the ${cornerName(result.corner)} corner. Count ${plural(result.bounces, 'wall bounce')} before the corner.` };
    }
    const choices = params.mode === 'choose_width' ? range(params.width_min, params.width_max).map(width => ({ width })) : range(params.component_min, params.component_max).flatMap(rise => range(params.component_min, params.component_max).map(run => ({ rise, run })));
    const action = choices.find(prediction => solvedBilliard(p, { prediction }));
    if (!action) return { type: 'deadend', text: 'No setting in these controls reaches the requested corner and bounce count.' };
    return { type: 'move', action, text: params.mode === 'choose_width' ? `Try width ${action.width}. The height stays ${params.height}; count the straight pieces.` : `Aim ${action.rise} squares up for ${action.run} squares right. Open mirror copies of this room to follow the straight line.` };
  },
  render(p, attempt) {
    const params = p.parameters, prediction = attempt.board.prediction, setting = billiardSetting(p, prediction), result = prediction === null ? null : billiardResult(setting);
    const controls = params.mode === 'predict'
      ? `${selectField('corner', 'First corner', corners.map(value => ({ value, label: cornerName(value) })), prediction?.corner ?? 'top-left')}<label class="motion-field">Bounces before corner<input name="bounces" type="number" min="0" step="1" inputmode="numeric" value="${prediction?.bounces ?? ''}"  required></label>`
      : params.mode === 'choose_width'
        ? selectField('width', 'Room width', range(params.width_min, params.width_max), prediction?.width ?? params.width_min)
        : `${selectField('rise', 'Aim up (rise)', range(params.component_min, params.component_max), prediction?.rise ?? params.component_min)}${selectField('run', 'Aim right (run)', range(params.component_min, params.component_max), prediction?.run ?? params.component_min)}`;
    const feedback = result ? `${solvedBilliard(p,attempt.board)?'':`<div class="motion-result" role="status">First corner: <strong>${cornerName(result.corner)}</strong>. Wall bounces: <strong>${result.bounces}</strong>.</div>`}` : '';
    return `<div class="motion-board billiard-board">${roomPicture(setting, result)}<form data-puzzle-form class="motion-form">${controls}${submitButton('Launch')}</form>${feedback}</div>`;
  },
  help(p, attempt) {
    if (attempt.board.prediction === null) return '';
    const setting = billiardSetting(p, attempt.board.prediction);
    return `<div class="motion-board">${unfoldedPicture(setting, billiardResult(setting))}</div>`;
  },
  demo: 'Choose the first corner and the number of wall bounces, then launch. The path appears only after your prediction. At a wall one direction reverses; at the first corner the light stops. Design puzzles let you set the room or launch arrow.'
};

export const motionMechanics = { toggle, clock, billiard };
