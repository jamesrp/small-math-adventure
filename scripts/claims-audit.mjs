// Claims and refusals audit (docs/claims-audit.md): walks every family puzzle
// through the controls its board draws, in Node, and lists what a child meets.
//
//   node scripts/claims-audit.mjs [module ...] [--walks N] [--steps N] [--out file.json]
//
// For each puzzle it plays seeded random walks over the board's own
// `expansion-move` and `mechanic-ui` controls (with some hint moves mixed in so
// walks reach later boards), and at every board it records:
// - the control labels, and which claim-like ones are enabled on a fresh board;
// - every line shown above, on and under the board, and the control whose press
//   first made it appear (so refusals and confirmations can be read off);
// - claim-like controls that solve the puzzle when pressed on a fresh board;
// - unasked dead-end lines (a hint of type `deadend` without `quiet`);
// - presses of drawn, not-`disabled` controls that the mechanic refuses, which
//   the app answers with its generic "That move is not allowed" line;
// - claim-like controls whose second press restores the board (a double tap
//   would cancel the claim), and whether they carry `data-toggle`.
// Gestures that only `wire()` makes are not walked; read those in the code.
import {writeFileSync} from 'node:fs';
import {loadPack, FAMILIES} from './packs.mjs';
import {freshAttempt, move, nextHint, isSolved} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {mechanicFor} from '../dist/expansion.js';
import {motionMechanics} from '../dist/motion.js';
import {networkMechanics} from '../dist/networks.js';
import {deductionMechanics} from '../dist/deduction.js';
import {measurementMechanics} from '../dist/measurement.js';

// The ten base expansion mechanics, one entry each, then the family seam.
const BASE = Object.entries({...motionMechanics, ...networkMechanics, ...deductionMechanics, ...measurementMechanics}).map(([id, m]) => ({id, mechanics: {[id]: m}}));

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf(name); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const WALKS = Number(opt('--walks', 12)), STEPS = Number(opt('--steps', 40)), OUT = opt('--out', null);
const only = new Set(args);

const GENERIC = 'That move is not allowed. Check How to play.';
const CLAIM = /can.?t|cannot|that.?s (all|it|the)|no \w+ works|fewest|best|done|check|finish|impossible|every|none|stuck|submit|enough|answer|claim|prove|found|guess|that one|this one|same|different|never|always|forever|yes|no$|^no\b|win|lose|first|second|sure|fair|unfair|test/i;

function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
function attrs(s) { const out = {}; for (const m of s.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) out[m[1]] = decode(m[2] ?? m[3] ?? m[4] ?? ''); return out; }
const strip = s => decode(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

function controls(html) {
  const list = [];
  // The board's own controls: data-action expansion-move / mechanic-ui (main.js),
  // and the data-<prefix>-move buttons a family's wire() hands to api.apply.
  for (const m of html.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*\b(?:data-action\s*=\s*["'](?:expansion-move|mechanic-ui)["']|data-[a-z]+-move\s*=)[^>]*)>/g)) {
    const tag = m[1].toLowerCase(), at = attrs(m[2]);
    const own = Object.keys(at).find(k => /^data-[a-z]+-move$/.test(k));
    if (!at['data-action'] && own) { at['data-action'] = 'expansion-move'; at['data-move'] = at[own]; at['data-wired'] = own; }
    let label = at['aria-label'] || '';
    if (tag === 'button') { const end = html.indexOf('</button>', m.index); const inner = strip(html.slice(m.index + m[0].length, end)); label = inner || label; }
    let payload = null; try { payload = JSON.parse(at['data-action'] === 'mechanic-ui' ? at['data-ui'] : at['data-move']); } catch { payload = undefined; }
    list.push({tag, action: at['data-action'], payload, label: label.slice(0, 80), disabled: 'disabled' in at, ariaDisabled: at['aria-disabled'] === 'true', toggle: at['data-toggle'] || null, wired: at['data-wired'] || null, pressed: at['aria-pressed'] === 'true' || at['aria-current'] === 'true' || at['aria-checked'] === 'true' || /\b(chosen|selected|active|is-on|current)\b/.test(at.class || ''), key: `${at['data-action']}:${at['data-move'] ?? at['data-ui']}`});
  }
  return list;
}
function lines(html) {
  const out = [];
  const feedback = html.match(/<div class="feedback[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  const goal = html.match(/<h1 class="puzzle-goal">([\s\S]*?)<\/h1>/);
  if (goal) out.push(['objective', strip(goal[1])]);
  if (feedback && strip(feedback[1])) out.push(['feedback', strip(feedback[1])]);
  // Board text: segments that read as sentences or short labels with words.
  const board = html.replace(/<div class="feedback[\s\S]*$/, '').replace(/<h1 class="puzzle-goal">[\s\S]*?<\/h1>/, '').replace(/<button\b[\s\S]*?<\/button>/g, ' ').replace(/<(title|desc)\b[\s\S]*?<\/\1>/g, ' ');
  for (const seg of board.split(/<[^>]*>/)) { const t = decode(seg).replace(/\s+/g, ' ').trim(); if (t.length >= 6 && /[a-zA-Z]{2,}\S*\s+\S*[a-zA-Z]/.test(t)) out.push(['board', t]); }
  return out;
}
const sameBoard = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const profile = {id: 'audit', name: 'Audit', avatar: 0, band: 'k1', sound: false, attempts: {}};

export async function audit(pack, modules) {
  const report = {};
  for (const mod of modules) {
    const mechs = new Set(Object.keys(mod.mechanics));
    const puzzles = pack.puzzles.filter(p => mechs.has(p.mechanic));
    const r = report[mod.id] = {puzzles: puzzles.length, labels: {}, freshClaims: {}, freshOutcome: {}, lines: {}, deadends: {}, generic: [], ariaGeneric: [], toggles: [], errors: []};
    const seenLine = (p, kind, text, after) => { const k = `${kind}|${text}`; const e = r.lines[k] ||= {kind, text, after: {}, puzzles: []}; if (!e.puzzles.includes(p.id)) e.puzzles.push(p.id); if (after) e.after[after] = (e.after[after] || 0) + 1; };
    for (const p of puzzles) {
      const mech = mechanicFor(p), render = (a, message = '') => playView(p, a, {pack, profile, encounter: null, selected: null, tileSelection: [], highlighted: null, message, checker: false, sessionCount: 0, reaction: null, result: null, changed: false});
      for (let w = 0; w < WALKS; w++) {
        const random = rng(1000 * w + p.number + 7);
        try {
          mech.reset?.(p);
          let a = freshAttempt(p, random), message = '', prev = new Set();
          for (let step = 0; step < STEPS; step++) {
            let html = render(a, message);
            const cs = controls(html);
            const here = new Set(lines(html).map(([k, t]) => `${k}|${t}`));
            for (const c of cs) { const e = r.labels[c.label] ||= {n: 0, claim: CLAIM.test(c.label), freshEnabled: 0, disabledSeen: 0}; e.n++; if (c.disabled || c.ariaDisabled) e.disabledSeen++; if (step === 0 && w === 0 && !c.disabled && !c.ariaDisabled) e.freshEnabled++; if (step === 0 && w === 0 && e.claim && !c.disabled && !c.ariaDisabled) (r.freshClaims[c.label] ||= []).push(p.id); }
            for (const k of here) if (!prev.has(k)) { const [kind, ...rest] = k.split('|'); seenLine(p, kind, rest.join('|'), a.__last || (step === 0 ? '(fresh)' : null)); }
            const h = isSolved(p, a.board) ? {type: 'done'} : nextHint(p, a);
            if (h.type === 'deadend' && !h.quiet) (r.deadends[h.text] ||= []).includes(p.id) || r.deadends[h.text].push(p.id);
            if (isSolved(p, a.board)) break;
            prev = here;
            // Probe every enabled claim-like control from this board.
            for (const c of cs.filter(c => c.action === 'expansion-move' && CLAIM.test(c.label) && !c.disabled)) {
              const n1 = move(p, a, c.payload);
              if (!n1) { (c.ariaDisabled ? r.ariaGeneric : r.generic).push({puzzle: p.id, label: c.label, payload: c.payload, step}); continue; }
              if (step === 0 && w === 0) (r.freshOutcome[c.label] ||= {solved: [], refused: []})[isSolved(p, n1.board) ? 'solved' : 'refused'].push(p.id);
              const h1 = render({...n1, __last: undefined}), c2 = controls(h1).find(x => x.key === c.key && !x.disabled) || controls(h1).find(x => x.label === c.label && !x.disabled);
              for (const [kind, t] of lines(h1)) if (!here.has(`${kind}|${t}`)) seenLine(p, kind, t, `claim:${c.label}`);
              if (c2 && c2.action === 'expansion-move') { const n2 = move(p, n1, c2.payload); if (n2 && sameBoard(n2.board, a.board) && !sameBoard(n1.board, a.board)) { if (!r.toggles.some(t => t.puzzle === p.id && t.label === c.label)) r.toggles.push({puzzle: p.id, label: c.label, guarded: Boolean(c.toggle)}); } }
            }
            // Choose the next press: a hint move sometimes, else any enabled control.
            const usable = cs.filter(c => !c.disabled && c.payload !== undefined);
            let chosen = null;
            if (h.type === 'move' && h.action && random() < 0.35) chosen = {action: 'expansion-move', payload: h.action, label: '(hint)'};
            else if (usable.length) chosen = usable[Math.floor(random() * usable.length)];
            if (!chosen) break;
            if (chosen.action === 'mechanic-ui') { mech.ui?.(p, chosen.payload); message = ''; a = {...a, __last: `ui:${chosen.label}`}; continue; }
            const next = move(p, a, chosen.payload);
            if (!next) { if (chosen.label !== '(hint)') (chosen.ariaDisabled ? r.ariaGeneric : r.generic).push({puzzle: p.id, label: chosen.label, payload: chosen.payload, step, pressed: chosen.pressed, wired: chosen.wired || null}); message = GENERIC; a = {...a, __last: `refused:${chosen.label}`}; continue; }
            message = ''; a = {...next, __last: chosen.label};
          }
        } catch (error) { r.errors.push(`${p.id}: ${error.message}`); }
      }
    }
  }
  return report;
}

function summary(report) {
  const out = [];
  for (const [id, r] of Object.entries(report)) {
    out.push(`\n## ${id} (${r.puzzles} puzzles)`);
    out.push(`labels: ${Object.entries(r.labels).map(([l, e]) => `${e.claim ? '*' : ''}${l}${e.disabledSeen ? '(dis)' : ''}`).join(' | ')}`);
    for (const [l, ps] of Object.entries(r.freshClaims)) out.push(`fresh-enabled claim "${l}": ${ps.join(' ')}`);
    for (const [l, o] of Object.entries(r.freshOutcome)) if (o.solved.length) out.push(`ONE PRESS ON A FRESH BOARD SOLVES "${l}": ${o.solved.join(' ')} (refused in ${o.refused.length})`);
    for (const [t, ps] of Object.entries(r.deadends)) out.push(`UNASKED deadend "${t}": ${ps.join(' ')}`);
    // A pressed control is the option already chosen; a wired one goes through
    // the family's wire(), which may skip pressed controls or shake instead of
    // refusing (bags, copies, decks, machines, mixup, offers, shuffles, sides;
    // stars, firstfit, orchard, folds), so read those in the code.
    const gen = new Map(); for (const g of r.generic) { const k = `${g.label}${g.pressed ? ' [pressed]' : ''}${g.wired ? ` [${g.wired}]` : ''}`; gen.set(k, [...(gen.get(k) || []), g.puzzle]); }
    for (const [l, ps] of gen) out.push(`GENERIC on "${l}": ${[...new Set(ps)].join(' ')}`);
    const ag = new Map(); for (const g of r.ariaGeneric) { const k = g.label; ag.set(k, [...(ag.get(k) || []), g.puzzle]); }
    for (const [l, ps] of ag) out.push(`GENERIC on aria-disabled "${l}": ${[...new Set(ps)].join(' ')}`);
    for (const t of r.toggles) out.push(`TOGGLE "${t.label}" ${t.puzzle}${t.guarded ? ' (guarded)' : ''}`);
    for (const e of Object.values(r.lines)) if (e.kind !== 'board' || Object.keys(e.after).some(k => k.startsWith('claim:'))) out.push(`${e.kind}: "${e.text}" after [${Object.keys(e.after).slice(0, 4).join('; ')}] in ${e.puzzles.length}`);
    for (const e of r.errors.slice(0, 3)) out.push(`ERROR ${e}`);
  }
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pack = await loadPack();
  const modules = [...BASE, ...FAMILIES].filter(m => !only.size || only.has(m.id));
  const report = await audit(pack, modules);
  if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 1));
  console.log(summary(report));
}
