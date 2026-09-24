import { esc, actionButton, selectField, submitButton } from './expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
const integer = value => typeof value === 'number' && Number.isInteger(value) ? value : typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : NaN;
const jugName = i => String.fromCharCode(65 + i);
const jugGraphs = new Map();

function pourResult(parameters, amounts, action) {
  if (!object(action)) return null;
  const next = [...amounts], capacities = parameters.capacities;
  if (action.type === 'fill' || action.type === 'empty') {
    const index = integer(action.jug);
    if (!parameters.source_and_drain || index < 0 || index >= next.length || !Number.isInteger(index)) return null;
    next[index] = action.type === 'fill' ? capacities[index] : 0;
  } else if (action.type === 'pour') {
    const from = integer(action.from), to = integer(action.to);
    if (![from, to].every(i => Number.isInteger(i) && i >= 0 && i < next.length) || from === to) return null;
    const amount = Math.min(next[from], capacities[to] - next[to]);
    next[from] -= amount;
    next[to] += amount;
  } else return null;
  return same(next, amounts) ? null : next;
}

function jugActions(parameters) {
  return parameters.capacities.flatMap((_, jug) => [
    ...(parameters.source_and_drain ? [{type:'fill', jug}, {type:'empty', jug}] : []),
    ...parameters.capacities.flatMap((_, to) => to === jug ? [] : [{type:'pour', from:jug, to}]),
  ]);
}

function jugGraph(parameters) {
  const key = JSON.stringify([parameters.capacities, parameters.start, parameters.source_and_drain]);
  if (jugGraphs.has(key)) return jugGraphs.get(key);
  const actions = jugActions(parameters), graph = new Map(), queue = [parameters.start];
  const seen = new Set([parameters.start.join(',')]);
  for (let index = 0; index < queue.length; index++) {
    const amounts = queue[index], edges = [];
    for (const action of actions) {
      const next = pourResult(parameters, amounts, action);
      if (!next) continue;
      edges.push({action, next});
      const nextKey = next.join(',');
      if (!seen.has(nextKey)) { seen.add(nextKey); queue.push(next); }
    }
    graph.set(amounts.join(','), edges);
  }
  jugGraphs.set(key, graph);
  return graph;
}

function validAmounts(parameters, amounts) {
  return Array.isArray(amounts) && amounts.length === parameters.capacities.length && amounts.every((amount, i) => Number.isInteger(amount) && amount >= 0 && amount <= parameters.capacities[i]) && jugGraph(parameters).has(amounts.join(','));
}

function validJug(p, board) {
  if (!object(board) || !validAmounts(p.parameters, board.amounts)) return false;
  if (board.last === null) return same(board.amounts, p.parameters.start);
  if (!object(board.last) || !validAmounts(p.parameters, board.last.before)) return false;
  const next = pourResult(p.parameters, board.last.before, board.last.action);
  return next !== null && same(next, board.amounts);
}

function jugGoal(parameters, amounts) {
  return parameters.target_state ? same(amounts, parameters.target_state) : amounts.includes(parameters.target_amount);
}

function jugDescription(parameters, before, action) {
  const next = pourResult(parameters, before, action);
  if (!next) return '';
  if (action.type === 'fill') return `Fill ${jugName(Number(action.jug))} to its ${parameters.capacities[Number(action.jug)]}-unit capacity.`;
  if (action.type === 'empty') return `Empty all ${before[Number(action.jug)]} units from ${jugName(Number(action.jug))}.`;
  const from = Number(action.from), to = Number(action.to), amount = before[from] - next[from];
  const stop = next[from] === 0 && next[to] === parameters.capacities[to] ? `${jugName(from)} is empty and ${jugName(to)} is full` : next[from] === 0 ? `${jugName(from)} is empty` : `${jugName(to)} is full`;
  return `Pour ${jugName(from)} → ${jugName(to)}: ${amount} ${amount === 1 ? 'unit' : 'units'}. The pour stops when ${stop}.`;
}

const jug = {
  fresh: p => ({amounts:[...p.parameters.start], last:null}),
  valid: validJug,
  solved: (p, board) => validJug(p, board) && jugGoal(p.parameters, board.amounts),
  move(p, board, action) {
    if (!validJug(p, board)) return null;
    const amounts = pourResult(p.parameters, board.amounts, action);
    if (!amounts) return null;
    const normalized = action.type === 'pour' ? {type:'pour', from:integer(action.from), to:integer(action.to)} : {type:action.type, jug:integer(action.jug)};
    return {amounts, last:{before:[...board.amounts], action:normalized}};
  },
  hint(p, board) {
    if (!validJug(p, board)) return {type:'deadend', text:'Start again to restore these jugs.'};
    if (jugGoal(p.parameters, board.amounts)) return {type:'done'};
    if (p.missingAbility) return {type:'equipment', text:p.equipmentHint};
    const graph = jugGraph(p.parameters), queue = [{amounts:board.amounts, first:null, distance:0}], seen = new Set([board.amounts.join(',')]);
    for (let index = 0; index < queue.length; index++) {
      const state = queue[index];
      if (jugGoal(p.parameters, state.amounts)) return {type:'move', action:state.first, text:jugDescription(p.parameters, board.amounts, state.first), remaining:state.distance};
      for (const edge of graph.get(state.amounts.join(','))) {
        const key = edge.next.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push({amounts:edge.next, first:state.first || edge.action, distance:state.distance + 1});
      }
    }
    return {type:'deadend', text:'This water cannot reach the target. Undo or start again.'};
  },
  render(p, attempt) {
    const board = attempt.board, parameters = p.parameters;
    return `<div class="measurement-board jug-play"><div class="jug-rack">${parameters.capacities.map((capacity, i) => {
      const before = board.last?.before[i] ?? board.amounts[i];
      return `<section class="jug-station" aria-label="Jug ${jugName(i)}, ${board.amounts[i]} of ${capacity} units"><h3>${jugName(i)}</h3><div class="jug-vessel" aria-hidden="true"><div class="jug-water ${before !== board.amounts[i] ? 'jug-changing' : ''}" style="--water-before:${before / capacity * 100}%;--water-after:${board.amounts[i] / capacity * 100}%"></div><strong>${board.amounts[i]} / ${capacity}</strong></div>${parameters.source_and_drain ? `<div class="jug-service">${actionButton('Fill', {type:'fill', jug:i}, `${board.amounts[i] === capacity ? 'disabled' : ''} aria-label="Fill jug ${jugName(i)} to ${capacity} units"`)}${actionButton('Empty', {type:'empty', jug:i}, `${board.amounts[i] === 0 ? 'disabled' : ''} aria-label="Empty jug ${jugName(i)}"`)}</div>` : ''}<div class="jug-pours">${parameters.capacities.flatMap((_, to) => to === i ? [] : [actionButton(`→ ${jugName(to)}`,  {type:'pour', from:i, to}, `${pourResult(parameters, board.amounts, {type:'pour', from:i, to}) ? '' : 'disabled'} aria-label="Pour jug ${jugName(i)} into jug ${jugName(to)} until empty or full"`)]).join('')}</div></section>`;
    }).join('')}</div><p class="sr-only" role="status" aria-live="polite">${esc(board.last ? jugDescription(parameters, board.last.before, board.last.action) : '')}</p></div>`;
  },
  demo: 'Fill adds water up to the jug’s capacity. Empty removes every drop. Pour moves water until the source is empty or the destination is full. Use the numbers; you never need to estimate the waterline.',
};

const weighingModels = new Map();
const popcount = value => { let count = 0; for (; value; value &= value - 1) count++; return count; };
const outcome = (hypothesis, left, right) => {
  const sign = hypothesis[1] * (Number(left.includes(hypothesis[0])) - Number(right.includes(hypothesis[0])));
  return sign > 0 ? 'L' : sign < 0 ? 'R' : '=';
};

function combinations(items, count, start = 0, prefix = [], result = []) {
  if (!count) { result.push(prefix); return result; }
  for (let i = start; i <= items.length - count; i++) combinations(items, count - 1, i + 1, [...prefix, items[i]], result);
  return result;
}

function weighingModel(parameters) {
  const key = JSON.stringify([parameters.coins, parameters.known_genuine, parameters.odd_kind]);
  if (weighingModels.has(key)) return weighingModels.get(key);
  const coins = [...parameters.coins, ...parameters.known_genuine];
  const hypotheses = parameters.coins.flatMap(coin => (parameters.odd_kind === 'heavy' ? [1] : [-1, 1]).map(sign => [coin, sign]));
  const model = {coins, hypotheses, all:(1 << hypotheses.length) - 1, options:null, memo:new Map()};
  weighingModels.set(key, model);
  return model;
}

function weighingOptions(model) {
  if (model.options) return model.options;
  model.options = [];
  for (let size = 1; size <= Math.floor(model.coins.length / 2); size++) {
    for (const left of combinations(model.coins, size)) {
      const unused = model.coins.filter(coin => !left.includes(coin));
      for (const right of combinations(unused, size)) {
        // Swapping the pans only renames L and R; keep one of each pair.
        if (left.join(',') >= right.join(',')) continue;
        const masks = {'L':0, '=':0, 'R':0};
        model.hypotheses.forEach((hypothesis, i) => { masks[outcome(hypothesis, left, right)] |= 1 << i; });
        model.options.push({left, right, masks});
      }
    }
  }
  return model.options;
}

function findWeighing(model, mask, budget) {
  if (popcount(mask) === 1) return true;
  if (budget <= 0 || popcount(mask) > 3 ** budget) return null;
  const key = `${mask}:${budget}`;
  if (model.memo.has(key)) return model.memo.get(key);
  const ranked = [];
  for (const option of weighingOptions(model)) {
    const parts = ['L', '=', 'R'].map(result => mask & option.masks[result]), sizes = parts.map(popcount), max = Math.max(...sizes);
    if (max === popcount(mask) || max > 3 ** (budget - 1)) continue;
    ranked.push({option, parts, max, sum:sizes.reduce((sum, size) => sum + size * size, 0)});
  }
  ranked.sort((a, b) => a.max - b.max || a.sum - b.sum || a.option.left.length - b.option.left.length);
  for (const candidate of ranked) {
    if (candidate.parts.every(part => !part || findWeighing(model, part, budget - 1))) {
      model.memo.set(key, candidate.option);
      return candidate.option;
    }
  }
  model.memo.set(key, null);
  return null;
}

function validPans(parameters, left, right, requireEqual = false) {
  const coins = [...parameters.coins, ...parameters.known_genuine];
  return Array.isArray(left) && Array.isArray(right) && left.length + right.length <= coins.length && [...left, ...right].every(coin => typeof coin === 'string' && coins.includes(coin)) && new Set([...left, ...right]).size === left.length + right.length && (!requireEqual || (left.length > 0 && left.length === right.length));
}

function candidates(p, board) {
  return weighingModel(p.parameters).hypotheses.filter(hypothesis => board.observations.every(record => outcome(hypothesis, record.left, record.right) === record.result));
}

// Boards saved before randomized attempts used the authored example secret.
// Storage upgrades those boards and their undo history without changing evidence.
export const weighingSecret = (p, board) => Object.hasOwn(board, 'secret') ? board.secret : p.parameters.fixed_secret;

function validWeigh(p, board) {
  const parameters = p.parameters;
  if (!object(board) || typeof board.notebook !== 'boolean' || !validPans(parameters, board.left, board.right) || !Array.isArray(board.observations) || board.observations.length > parameters.weighing_budget) return false;
  const secret = weighingSecret(p, board);
  if (!Array.isArray(secret) || secret.length !== 2 || !weighingModel(parameters).hypotheses.some(hypothesis => same(hypothesis, secret))) return false;
  if (!board.observations.every(record => object(record) && validPans(parameters, record.left, record.right, true) && ['L', '=', 'R'].includes(record.result) && outcome(secret, record.left, record.right) === record.result)) return false;
  return board.answer === null || (object(board.answer) && parameters.coins.includes(board.answer.coin) && (board.answer.deviation === 1 || (parameters.odd_kind !== 'heavy' && board.answer.deviation === -1)));
}

function solvedWeigh(p, board) {
  if (!validWeigh(p, board) || !board.answer) return false;
  const remaining = candidates(p, board);
  return remaining.length === 1 && board.answer.coin === remaining[0][0] && board.answer.deviation === remaining[0][1];
}

function balanceFeedback(p, board) {
  const remaining = candidates(p, board), budget = p.parameters.weighing_budget - board.observations.length;
  if (board.answer) {
    if (remaining.length > 1) return `The observations still allow ${remaining.length} possibilities, so this answer is not yet justified. ${budget ? 'Make another weighing.' : 'Undo a weighing or start again to try another experiment.'}`;
    if (!solvedWeigh(p, board)) return 'That answer does not fit the observations. Check the notebook and choose again.';
    return '';
  }
  if (remaining.length === 1) return 'Your observations single out one possibility. Choose the pebble and submit your answer.';
  if (!budget) return `${remaining.length} possibilities still fit and no weighings remain. Undo a weighing or start again.`;
  return '';
}

const weigh = {
  fresh(p, random = Math.random) {
    const hypotheses = weighingModel(p.parameters).hypotheses;
    return {secret:[...hypotheses[Math.floor(random() * hypotheses.length)]], left:[], right:[], observations:[], answer:null, notebook:false};
  },
  valid: validWeigh,
  solved: solvedWeigh,
  move(p, board, action) {
    if (!validWeigh(p, board) || !object(action)) return null;
    if (action.type === 'notebook') return {...board, notebook:!board.notebook};
    if (action.type === 'clear') return board.left.length || board.right.length ? {...board, left:[], right:[]} : null;
    if (action.type === 'place') {
      if (![...p.parameters.coins, ...p.parameters.known_genuine].includes(action.coin) || !['left', 'right', 'off'].includes(action.pan)) return null;
      const left = board.left.filter(coin => coin !== action.coin), right = board.right.filter(coin => coin !== action.coin);
      if (action.pan === 'left') left.push(action.coin);
      if (action.pan === 'right') right.push(action.coin);
      if (same(left, board.left) && same(right, board.right)) return null;
      return {...board, left, right};
    }
    if (action.type === 'weigh') {
      const left = action.left ?? board.left, right = action.right ?? board.right;
      if (board.observations.length >= p.parameters.weighing_budget || !validPans(p.parameters, left, right, true)) return null;
      const record = {left:[...left], right:[...right], result:outcome(weighingSecret(p, board), left, right)};
      return {...board, left:[...left], right:[...right], observations:[...board.observations, record], answer:null};
    }
    if (action.type === 'answer') {
      const deviation = p.parameters.odd_kind === 'heavy' && action.deviation === undefined ? 1 : integer(action.deviation);
      const answer = {coin:action.coin, deviation}, next = {...board, answer};
      return validWeigh(p, next) && (!board.answer || board.answer.coin !== answer.coin || board.answer.deviation !== deviation) ? next : null;
    }
    return null;
  },
  hint(p, board) {
    if (!validWeigh(p, board)) return {type:'deadend', text:'Start again to restore the balance.'};
    if (solvedWeigh(p, board)) return {type:'done'};
    const model = weighingModel(p.parameters), possible = candidates(p, board), budget = p.parameters.weighing_budget - board.observations.length;
    if (possible.length === 1) return {type:'move', action:{type:'answer', coin:possible[0][0], deviation:possible[0][1]}, text:`Only ${possible[0][0]} ${possible[0][1] === 1 ? 'heavy' : 'light'} fits every observation. Submit that answer.`, remaining:0};
    let mask = 0;
    model.hypotheses.forEach((hypothesis, i) => { if (possible.includes(hypothesis)) mask |= 1 << i; });
    const option = findWeighing(model, mask, budget);
    if (!option) return {type:'deadend', text:budget ? `These observations leave no guaranteed plan within the ${budget} remaining ${budget === 1 ? 'weighing' : 'weighings'}. Undo a weighing or start again.` : 'More than one possibility still fits. Undo a weighing or start again.'};
    return {type:'move', action:{type:'weigh', left:[...option.left], right:[...option.right]}, text:`Weigh ${option.left.join(', ')} on the left against ${option.right.join(', ')} on the right. Every possible outcome leaves a way to finish within your budget.`, remaining:budget};
  },
  render(p, attempt) {
    const board = attempt.board, parameters = p.parameters, possible = candidates(p, board), left = board.left.join(', '), right = board.right.join(', ');
    const used = board.observations.length, latest = board.observations.at(-1);
    // A previous tilt applies only to the pebbles actually observed, not a new selection.
    const displayedResult = latest && same([...latest.left].sort(), [...board.left].sort()) && same([...latest.right].sort(), [...board.right].sort()) ? latest.result : null;
    const tilt = displayedResult === 'L' ? 'left-heavy' : displayedResult === 'R' ? 'right-heavy' : 'balanced';
    const resultLabel = result => result === 'L' ? 'Left pan heavier' : result === 'R' ? 'Right pan heavier' : 'Balanced';
    return `<div class="measurement-board balance-play"><p class="measurement-goal">${parameters.weighing_budget - used} ${parameters.weighing_budget - used === 1 ? 'weighing' : 'weighings'} left</p><div class="balance-scale ${tilt}" role="group" aria-label="Selected pebbles: left ${esc(left||'none')}; right ${esc(right||'none')}"><div class="balance-pan"><strong>Left</strong><span>${esc(left)}</span><small>${board.left.length} ${board.left.length === 1 ? 'pebble' : 'pebbles'}</small></div><div class="balance-pivot" aria-hidden="true">⚖</div><div class="balance-pan"><strong>Right</strong><span>${esc(right)}</span><small>${board.right.length} ${board.right.length === 1 ? 'pebble' : 'pebbles'}</small></div></div><div class="balance-pebbles">${[...parameters.coins, ...parameters.known_genuine].map(coin => {
      const pan = board.left.includes(coin) ? 'left' : board.right.includes(coin) ? 'right' : 'off';
      return `<fieldset class="balance-pebble"><legend><span class="pebble-token">${esc(coin)}</span>${parameters.known_genuine.includes(coin) ? ' Normal' : ''}</legend><div class="pebble-places">${[['left', 'Left'], ['off', 'Off'], ['right', 'Right']].map(([value, label]) => actionButton(label, {type:'place', coin, pan:value}, `aria-label="Put pebble ${esc(coin)} ${value === 'off' ? 'off the scale' : `on the ${value} pan`}" aria-pressed="${pan === value}"`)).join('')}</div></fieldset>`;
    }).join('')}</div><div class="balance-controls">${actionButton('Weigh', {type:'weigh'}, !validPans(parameters, board.left, board.right, true) || used >= parameters.weighing_budget ? 'disabled' : '')}${actionButton('Clear pans', {type:'clear'}, board.left.length || board.right.length ? '' : 'disabled')}</div><section class="balance-history" aria-label="Observation history">${used ? '<h3>Observations</h3>' : ''}${used ? `<ol>${board.observations.map(record => `<li><span><strong>${esc(record.left.join(', '))}</strong> vs <strong>${esc(record.right.join(', '))}</strong></span><span>${resultLabel(record.result)}</span></li>`).join('')}</ol>` : ''}</section><div class="balance-notebook">${actionButton('Candidates', {type:'notebook'}, `aria-expanded="${board.notebook}" aria-controls="candidate-notebook"`)}${board.notebook ? `<div id="candidate-notebook"><ul>${parameters.coins.map(coin => {
      const signs = possible.filter(hypothesis => hypothesis[0] === coin).map(hypothesis => hypothesis[1] === 1 ? 'heavy' : 'light');
      return `<li><strong>${esc(coin)}</strong>: ${signs.length ? signs.join(' or ') : 'normal'}</li>`;
    }).join('')}</ul></div>` : ''}</div><form data-puzzle-form class="balance-answer"><input type="hidden" name="type" value="answer">${selectField('coin', 'Pebble', [{value:'', label:'—'}, ...parameters.coins], board.answer?.coin || '')}${parameters.odd_kind === 'heavy' ? '<input type="hidden" name="deviation" value="1">' : selectField('deviation', 'Weight', [{value:'', label:'—'}, {value:1, label:'Heavy'}, {value:-1, label:'Light'}], board.answer?.deviation ?? '')}${submitButton('Check')}</form><p class="measurement-observation" role="status" aria-live="polite">${esc(balanceFeedback(p, board))}</p></div>`;
  },
  demo: 'Use Left, Off, and Right to place each pebble. Put equal numbers on both pans, then Weigh. A tilt tells you which pan is heavier. Open the candidate notebook to see what still fits. Submit an answer only when your observations single it out.',
};

export const measurementMechanics = {jug, weigh};
