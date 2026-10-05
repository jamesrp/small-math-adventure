// Weight kits (worksheet Week 30), a group inside the Odd-pebble Balance. A
// target block sits on the left pan. Each weight of the kit may go beside the
// target, on the other pan, or stay off, and the scale balances when the
// target plus the weights beside it equals the weights opposite. So a target
// balances exactly when it is a signed sum of the kit, each weight counted
// +1, 0 or −1. The m weights 1, 3, 9, …, 3^(m−1) balance every target from 1
// to (3^m − 1)/2, each in exactly one way (balanced ternary), and no m weights
// can balance more targets, because their 3^m placements give at most
// (3^m − 1)/2 positive totals.
import {esc, actionButton} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sum = list => list.reduce((total, w) => total + w, 0);
const sorted = list => [...list].sort((a, b) => a - b);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const whole = value => Number.isSafeInteger(value) && value > 0;
const number = value => typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;
const ascending = list => Array.isArray(list) && list.every(whole) && list.every((v, i) => i === 0 || list[i - 1] < v);
export const RECORD_LIMIT = 400;

export const balances = (target, left, right) => target + sum(left) === sum(right);
// Every way to place a kit: each weight beside the target, off, or opposite.
export function placements(kit) {
  let out = [{left: [], right: []}];
  for (const w of kit) out = out.flatMap(at => [at, {left: [...at.left, w], right: at.right}, {left: at.left, right: [...at.right, w]}]);
  return out.map(at => ({left: sorted(at.left), right: sorted(at.right)}));
}
export const waysFor = (kit, target) => placements(kit).filter(at => balances(target, at.left, at.right));
export const reachable = (kit, target) => waysFor(kit, target).length > 0;

const picking = q => q.mode === 'choose' || q.mode === 'playground';
const tallies = q => q.mode === 'which' || q.mode === 'ways';
export const kitOf = (q, b) => picking(q) ? sorted([...(q.fixed || []), ...b.pick]) : q.kit;
export const targetsOf = q => q.mode === 'ways' ? [q.target] : q.targets;
const samePlacement = (a, b) => same(a.left, b.left) && same(a.right, b.right);
const panOf = (b, w) => b.left.includes(w) ? 'left' : b.right.includes(w) ? 'right' : 'off';

// What a solve needs: every target balanced (balance, choose), every target
// that can balance (which), or every way to balance the target (ways).
export function complete(q, b) {
  const kit = kitOf(q, b), has = t => b.found.some(r => r.target === t);
  if (q.mode === 'ways') return b.found.length === waysFor(kit, q.target).length;
  if (q.mode === 'which') return q.targets.every(t => has(t) || !reachable(kit, t));
  if (q.mode === 'playground') return false;
  return q.targets.every(has);
}

function validRecord(q, kit, r) {
  if (!object(r) || !targetsOf(q).includes(r.target) || !ascending(r.left) || !ascending(r.right)) return false;
  return [...r.left, ...r.right].every(w => kit.includes(w)) && !r.left.some(w => r.right.includes(w)) && balances(r.target, r.left, r.right);
}
function validBoard(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (picking(q)) {
    if (!ascending(b.pick) || b.pick.length > q.pick || !b.pick.every(w => q.choices.includes(w) && !(q.fixed || []).includes(w))) return false;
  } else if (Object.hasOwn(b, 'pick')) return false;
  const kit = kitOf(q, b);
  if (!targetsOf(q).includes(b.target) || !ascending(b.left) || !ascending(b.right)) return false;
  if (![...b.left, ...b.right].every(w => kit.includes(w)) || b.left.some(w => b.right.includes(w))) return false;
  if (!Array.isArray(b.found) || b.found.length > RECORD_LIMIT || !b.found.every(r => validRecord(q, kit, r))) return false;
  const unique = q.mode === 'ways' ? (r, i) => b.found.findIndex(s => samePlacement(r, s)) === i : (r, i) => b.found.findIndex(s => s.target === r.target) === i;
  if (!b.found.every(unique)) return false;
  if (typeof b.done !== 'boolean' || typeof b.wrong !== 'boolean' || (b.done && b.wrong)) return false;
  if (!tallies(q)) return !b.done && !b.wrong;
  return b.done ? complete(q, b) : !b.wrong || !complete(q, b);
}
const solvedBoard = (p, b) => validBoard(p, b) && (tallies(p.parameters) ? b.done : complete(p.parameters, b));

function fresh(p) {
  const q = p.parameters, target = targetsOf(q)[0];
  return {...(picking(q) ? {pick: [...(q.start || [])]} : {}), target, left: [], right: [], found: [], done: false, wrong: false};
}
// After every move, a balanced target is recorded: once per target, or once
// per placement when the puzzle asks for every way.
function record(q, b) {
  if (!balances(b.target, b.left, b.right)) return b;
  const r = {target: b.target, left: [...b.left], right: [...b.right]};
  const known = q.mode === 'ways' ? b.found.some(s => samePlacement(s, r)) : b.found.some(s => s.target === r.target);
  return known ? b : {...b, found: [...b.found, r].sort((x, y) => x.target - y.target)};
}
function move(p, b, action) {
  const q = p.parameters;
  if (!validBoard(p, b) || solvedBoard(p, b) || !object(action)) return null;
  const kit = kitOf(q, b), next = {...b, wrong: false};
  if (action.type === 'place') {
    const w = number(action.weight);
    if (!kit.includes(w) || !['left', 'off', 'right'].includes(action.pan) || panOf(b, w) === action.pan) return null;
    next.left = sorted([...b.left.filter(v => v !== w), ...(action.pan === 'left' ? [w] : [])]);
    next.right = sorted([...b.right.filter(v => v !== w), ...(action.pan === 'right' ? [w] : [])]);
    return record(q, next);
  }
  if (action.type === 'target') {
    const t = number(action.target);
    if (!targetsOf(q).includes(t) || t === b.target) return null;
    return record(q, {...next, target: t});
  }
  if (action.type === 'clear') return b.left.length || b.right.length ? record(q, {...next, left: [], right: []}) : null;
  if (action.type === 'pick') {
    const w = number(action.weight);
    if (!picking(q) || !q.choices.includes(w) || (q.fixed || []).includes(w)) return null;
    let pick;
    if (b.pick.includes(w)) pick = b.pick.filter(v => v !== w);
    else if (b.pick.length < q.pick) pick = sorted([...b.pick, w]);
    else if (q.pick === 1) pick = [w];
    else return null;
    // A weight that leaves the kit leaves the pans, and so do the records it made.
    const kept = w2 => (q.fixed || []).includes(w2) || pick.includes(w2);
    return record(q, {...next, pick, left: b.left.filter(kept), right: b.right.filter(kept), found: b.found.filter(r => [...r.left, ...r.right].every(kept))});
  }
  if (action.type === 'done') {
    if (!tallies(q)) return null;
    return complete(q, b) ? {...next, done: true} : {...next, wrong: true};
  }
  return null;
}

// Hints. Choose a kit that can work, then the target to balance, then the
// placement nearest the pans, moving the heaviest misplaced weight first.
const goodPicks = new Map();
export function pickAnswers(q) {
  const key = JSON.stringify([q.fixed, q.choices, q.pick, q.targets]);
  if (goodPicks.has(key)) return goodPicks.get(key);
  const options = q.choices.filter(w => !(q.fixed || []).includes(w));
  const subsets = (from, k) => k === 0 ? [[]] : from.flatMap((w, i) => subsets(from.slice(i + 1), k - 1).map(rest => [w, ...rest]));
  const good = subsets(options, q.pick).filter(pick => q.targets.every(t => reachable(sorted([...(q.fixed || []), ...pick]), t)));
  goodPicks.set(key, good);
  return good;
}
const distance = (b, at, kit) => kit.filter(w => panOf(b, w) !== panOf(at, w)).length;
const say = {left: w => `Put ${w} beside the target.`, right: w => `Put ${w} on the other pan.`, off: w => `Take ${w} off.`};
function plan(q, b) {
  const kit = kitOf(q, b);
  if (q.mode === 'choose') {
    const good = pickAnswers(q), works = q.targets.every(t => reachable(kit, t)) && b.pick.length === q.pick;
    if (!works) {
      const near = good.reduce((best, g) => g.filter(w => b.pick.includes(w)).length > best.filter(w => b.pick.includes(w)).length ? g : best, good[0]);
      const extra = b.pick.find(w => !near.includes(w));
      if (extra !== undefined && q.pick > 1) return {action: {type: 'pick', weight: extra}, text: `Take ${extra} out of the kit.`};
      const add = near.find(w => !b.pick.includes(w));
      return {action: {type: 'pick', weight: add}, text: `Try weight ${add}.`};
    }
  }
  const has = t => b.found.some(r => r.target === t);
  const open = q.mode === 'ways'
    ? (waysFor(kit, q.target).some(at => !b.found.some(r => samePlacement(r, at))) ? [q.target] : [])
    : targetsOf(q).filter(t => !has(t) && (q.mode !== 'which' || reachable(kit, t)));
  if (!open.length) return {action: {type: 'done'}, text: q.mode === 'ways' ? 'You have every way. Press That’s all.' : 'The other targets can’t balance with this kit. Press That’s all.'};
  if (!open.includes(b.target)) return {action: {type: 'target', target: open[0]}, text: `Try target ${open[0]}.`};
  const options = waysFor(kit, b.target).filter(at => q.mode !== 'ways' || !b.found.some(r => samePlacement(r, at)));
  const goal = options.reduce((best, at) => distance(b, at, kit) < distance(b, best, kit) ? at : best, options[0]);
  const w = [...kit].reverse().find(v => panOf(b, v) !== panOf(goal, v));
  const pan = panOf(goal, w);
  return {action: {type: 'place', weight: w, pan}, text: say[pan](w)};
}
function hint(p, b) {
  const q = p.parameters;
  if (!validBoard(p, b)) return {type: 'deadend', text: 'Restart to clear the scale.'};
  if (solvedBoard(p, b)) return {type: 'done'};
  if (q.mode === 'playground') return {type: 'note'};
  const next = plan(q, b);
  return {type: 'move', action: next.action, text: next.text};
}

// The scale, in the shared balance look (dist/boards.css): the target block
// and the weights beside it on the left pan, the other weights on the right.
// Each pan's total is written under it.
function weightShape(x, y, w, cls = '') {
  const width = 22 + 7 * String(w).length;
  return `<g class="kit-weight-art${cls}"><path d="M${x - width / 2} ${y + 9}L${x - width / 2 + 4} ${y - 9}H${x + width / 2 - 4}L${x + width / 2} ${y + 9}Z"/><circle cx="${x}" cy="${y - 13}" r="4"/><text x="${x}" y="${y + 5}">${w}</text></g>`;
}
function scaleArt(target, left, right) {
  const heavy = target + sum(left) - sum(right), angle = heavy > 0 ? -9 : heavy < 0 ? 9 : 0;
  const rad = angle * Math.PI / 180, cx = 180, cy = 46, arm = 120;
  const ends = [-1, 1].map(side => [cx + side * arm * Math.cos(rad), cy + side * arm * Math.sin(rad)]);
  const pan = ([x, y], items) => {
    const per = 4, art = items.map((item, i) => {
      const row = Math.floor(i / per), n = Math.min(per, items.length - row * per), col = i % per;
      const sx = x + (col - (n - 1) / 2) * 27, sy = y + 47 - row * 24;
      return item === 'target' ? `<g class="kit-target-art"><rect x="${sx - 13}" y="${sy - 12}" width="26" height="24" rx="3"/><text x="${sx}" y="${sy + 5}">${target}</text></g>` : weightShape(sx, sy, item);
    }).join('');
    return `<g class="balance-pan-art"><path class="balance-string" d="M${x} ${y}L${x - 50} ${y + 54}M${x} ${y}L${x + 50} ${y + 54}"/>${art}<path class="balance-dish" d="M${x - 58} ${y + 60}q58 26 116 0z"/></g>`;
  };
  const words = (items, lead) => [...(lead === undefined ? [] : [lead]), ...items].join(' + ') || '0';
  const label = `Left pan: target ${target}${left.length ? ` and ${left.join(', ')}` : ''}, total ${target + sum(left)}. Right pan: ${right.length ? right.join(', ') : 'empty'}, total ${sum(right)}. ${heavy ? `${heavy > 0 ? 'Left' : 'Right'} side heavier.` : 'Balanced.'}`;
  return `<svg class="balance-art kit-scale" viewBox="0 0 360 214" role="img" aria-label="${esc(label)}"><path class="balance-stand" d="M180 50V176M140 178h80"/><line class="balance-beam" x1="${ends[0][0].toFixed(1)}" y1="${ends[0][1].toFixed(1)}" x2="${ends[1][0].toFixed(1)}" y2="${ends[1][1].toFixed(1)}"/><circle class="balance-pivot-dot" cx="180" cy="46" r="7"/>${pan(ends[0], ['target', ...left])}${pan(ends[1], right)}<text class="kit-total" x="60" y="206">${esc(words(left, target))}</text>${heavy ? '' : '<text class="kit-total kit-equals" x="180" y="206">=</text>'}<text class="kit-total" x="300" y="206">${esc(words(right))}</text></svg>`;
}

// A weight as a small brass trapezoid with its number, for the picker and tray.
const token = (w, cls = '', attrs = '') => `<span class="kit-token${cls}" ${attrs}><svg viewBox="0 0 44 32" aria-hidden="true"><path d="M3 30L9 3H35L41 30Z"/></svg><b>${w}</b></span>`;
const hintedClass = (shown, action) => shown && JSON.stringify(shown) === JSON.stringify(action) ? ' hinted' : '';
function pickRow(q, b, shown, solved) {
  const options = q.choices.filter(w => !(q.fixed || []).includes(w)), full = b.pick.length >= q.pick && q.pick > 1;
  if (options.length > 10) {
    // A long range of choices is a stepper: − and + move one step.
    const at = b.pick[0], i = options.indexOf(at);
    const down = at === undefined ? options.at(-1) : i > 0 ? options[i - 1] : null, up = at === undefined ? options[0] : i < options.length - 1 ? options[i + 1] : null;
    const step = (label, w, name) => actionButton(label, {type: 'pick', weight: w}, `aria-label="${name}" ${w === null || solved ? 'disabled' : ''}`).replace('class="secondary expansion-action"', 'class="secondary expansion-action kit-step"');
    return `<div class="kit-picker kit-stepper" role="group" aria-label="New weight">${step('−', down, 'Lighter weight')}${token(at ?? '?', at === undefined ? ' empty' : '', `role="img" aria-live="polite" aria-label="${at === undefined ? 'No weight chosen' : `Weight ${at}`}"`)}${step('+', up, 'Heavier weight')}</div>`;
  }
  return `<div class="kit-picker" role="group" aria-label="Weights to choose">${options.map(w => {
    const on = b.pick.includes(w), action = {type: 'pick', weight: w};
    return actionButton(token(w), action, `aria-label="Weight ${w}" aria-pressed="${on}" ${(full && !on) || solved ? 'disabled' : ''}`).replace('class="secondary expansion-action"', `class="secondary expansion-action kit-pick${hintedClass(shown, action)}"`);
  }).join('')}</div>`;
}
function targetRow(q, b, kit, shown, solved) {
  const has = t => b.found.some(r => r.target === t), crossed = t => b.done && q.mode === 'which' && !has(t);
  return `<div class="kit-targets${q.targets.length > 16 ? ' many' : ''}" role="group" aria-label="Targets">${q.targets.map(t => {
    const action = {type: 'target', target: t}, state = has(t) ? ', balanced' : crossed(t) ? ', cannot balance' : '';
    return actionButton(String(t), action, `aria-label="Target ${t}${state}" aria-pressed="${b.target === t}" ${solved ? 'disabled' : ''}`).replace('class="secondary expansion-action"', `class="secondary expansion-action kit-target${has(t) ? ' found' : ''}${crossed(t) ? ' crossed' : ''}${hintedClass(shown, action)}"`);
  }).join('')}</div>`;
}
function tray(b, kit, shown, solved) {
  return `<div class="balance-pebbles kit-tray">${kit.map(w => {
    const pan = panOf(b, w);
    return `<fieldset class="balance-pebble pebble-on-${pan}"><legend>${token(w)}</legend><div class="pebble-places">${[['left', '◀', 'Beside the target'], ['off', '●', 'Off'], ['right', '▶', 'Other pan']].map(([value, icon, name]) => {
      const action = {type: 'place', weight: w, pan: value};
      return actionButton(`<span aria-hidden="true">${icon}</span><span class="pebble-place-name">${name}</span>`, action, `aria-label="Weight ${w}: ${name.toLowerCase()}" aria-pressed="${pan === value}" ${solved ? 'disabled' : ''}`).replace('class="secondary expansion-action"', `class="secondary expansion-action${hintedClass(shown, action)}"`);
    }).join('')}</div></fieldset>`;
  }).join('')}</div>`;
}
const equation = r => `${[r.target, ...r.left].join(' + ')} = ${r.right.join(' + ')}`;
function render(p, attempt) {
  const q = p.parameters, b = attempt.board, kit = kitOf(q, b), solved = solvedBoard(p, b);
  const shown = attempt.hintLevel >= 2 && !solved && q.mode !== 'playground' ? plan(q, b).action : null;
  const picker = picking(q) ? pickRow(q, b, shown, solved) : '';
  const targets = targetsOf(q).length > 1 ? targetRow(q, b, kit, shown, solved) : '';
  const clear = actionButton('Clear pans', {type: 'clear'}, b.left.length || b.right.length ? (solved ? 'disabled' : '') : 'disabled');
  const done = tallies(q) && !solved ? actionButton('That’s all', {type: 'done'}).replace('class="secondary expansion-action"', `class="primary expansion-action kit-done${hintedClass(shown, {type: 'done'})}"`) : '';
  const ways = q.mode === 'ways' && b.found.length ? `<ol class="kit-ways" aria-label="Ways found">${b.found.map(r => `<li>${esc(equation(r))}</li>`).join('')}</ol>` : '';
  const note = b.wrong ? (q.mode === 'ways' ? 'There is another way.' : 'Another target balances.') : '';
  const status = `Target ${b.target}. ${balances(b.target, b.left, b.right) ? 'Balanced.' : 'Not balanced.'}`;
  return `<div class="measurement-board kits-puzzle mode-${q.mode}">${picker}${targets}${scaleArt(b.target, b.left, b.right)}${kit.length ? tray(b, kit, shown, solved) : ''}<div class="balance-controls kit-tools">${clear}${done}</div>${ways}${note ? `<p class="kit-note" role="status">${esc(note)}</p>` : `<p class="sr-only" role="status">${esc(status)}</p>`}</div>`;
}

export const kitMechanics = {
  kit: {
    fresh,
    valid: validBoard,
    solved: solvedBoard,
    move,
    hint,
    render,
    demo: 'Each weight goes beside the target, on the other pan, or off. The scale balances when both pans hold the same total.'
  }
};

// The family seam entry (dist/families.js). The puzzles join the Odd-pebble
// Balance as its Weight kits group, so the module adds no satchel family.
export default {
  id: 'kits',
  mechanics: kitMechanics,
  pack: new URL('./kits.json', import.meta.url).href,
  css: new URL('./kits.css', import.meta.url).href,
  focus: '.kits-puzzle .pebble-places button:not(:disabled),.kit-target:not(:disabled)'
};
