// Views for the Lantern Road: the map, the scene above each road puzzle, the
// solved strip, stop sheets, the journal and the fair finale.
import { BANDS, isSolved, boardCue, nextHint } from './engine.js';
import { STOPS, SIDE, MAIN, CAST, TOOLS, BAND_KEYS, getProgress, medals, trailFor, stopOf, rivalScore, rivalVerdict, maxStars, starsFor, SCORE_UNITS, campaignId, withCampaignPuzzles, resolvePuzzle, canVisitEncounter, continueAfter, scoreOf, hintCostsStar, plumeTaunt, starTally } from './road.js';
import { pick, KEEPERS } from './road-cast.js';
import { media, slots, asset } from './art.js';
import { keeperArt, sceneArt, mapArt, wagonArt, toolArt, finaleArt, MAP_POINTS, MAP_REGIONS, MAP_WAGON } from './road-placeholders.js';
import * as legacy from './caravan-legacy.js';
import * as rescue from './caravan-rescue.js';
import * as road3 from './caravan-road3.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const button = (label, action, cls = '', extra = '') => `<button type="button" class="${cls}" data-action="${action}" data-focus="action-${action}${extra.match(/data-id="([^"]+)"/) ? `-${extra.match(/data-id="([^"]+)"/)[1]}` : ''}" ${extra}>${label}</button>`;
const plural = (n, [one, many]) => `${n} ${n === 1 ? one : many}`;

export function starRow(earned, max, cls = '') {
  return `<span class="lr-stars ${cls}" role="img" aria-label="${earned} of ${max} stars">${Array.from({ length: max }, (_, i) => `<i class="${i < earned ? 'on' : ''}" aria-hidden="true">★</i>`).join('')}</span>`;
}
// Idle and talk loop; happy and oops play once and settle back to idle.
// A pose without finished art borrows talk or idle art before falling back to
// the drawn placeholder, so real and placeholder art never mix in one portrait.
// Talk's loop plays only while a voice is heard (`heard`); otherwise, and when
// another pose borrows it, talk shows its still.
const keeperPortrait = (id, wanted, key = 'keeper', nonce = '', heard = false) => {
  const pose = [wanted, ...(wanted === 'talk' ? [] : ['talk']), 'idle'].find(p => asset(slots.keeper(id, p))) || wanted, once = pose === 'happy' || pose === 'oops';
  // The keeper's colour fills the circle until the picture has loaded.
  return media(slots.keeper(id, pose), keeperArt(id, pose, CAST[id]?.color), { key, cls: 'lr-portrait', then: once ? slots.keeper(id, 'idle') : null, loop: !once, nonce: once ? nonce : '', motion: pose !== 'talk' || (wanted === 'talk' && heard) })
    .replace('<div class="art-slot lr-portrait"', `<div style="--keeper:${CAST[id]?.color || 'transparent'}" class="art-slot lr-portrait"`);
};

// The keeper's talk pose ----------------------------------------------------------
// Talk means speaking now (docs/art/ROADMAP.md, "Keeper poses"). A line that
// appears in the bubble (an opening, a hint, a locked side puzzle) is said
// once: the portrait talks for a beat about as long as the line (talkBeat),
// then settles to idle, whether or not the child has moved. While the line's
// recording or the browser voice plays, it talks until the voice stops; only
// then may a talk loop move the mouth, so a mouth never moves in silence. A
// reaction (oops, happy) shows its own face and talks only when Listen plays
// its line. dist/main.js calls wireKeeper after each render, sayLine and
// startTalk/stopTalk around a voice, and resetTalk on each new screen.
const talk = { line: null, on: false, heard: false, token: 0, timer: null, root: null };
export const talkBeat = text => {
  const words = String(text ?? '').split(/\s+/).filter(Boolean).length, pauses = (String(text ?? '').match(/…/g) || []).length;
  return Math.min(4500, Math.max(1200, 600 + 350 * (words + pauses)));
};
// The pose for the bubble's line: a line not yet said shows the pose it asks for.
export function talkPose(line, wanted) {
  if (talk.line !== line) return { pose: wanted, heard: false };
  return talk.on ? { pose: 'talk', heard: talk.heard } : { pose: 'idle', heard: false };
}
const portrait = (speaker, line, wanted, nonce) => { const { pose, heard } = talkPose(line, wanted); return keeperPortrait(speaker, pose, 'keeper', nonce, heard); };
function redrawKeeper() {
  const keeper = talk.root?.querySelector?.('.lr-keeper[data-line]'), slot = keeper?.querySelector(':scope > .art-slot');
  if (!slot) return;
  const template = document.createElement('template');
  template.innerHTML = portrait(keeper.dataset.speaker, keeper.dataset.line, keeper.dataset.pose, keeper.dataset.nonce);
  const next = template.content.firstElementChild;
  if (!next || next.dataset.artSrc === slot.dataset.artSrc) return;
  slot.replaceWith(next);
  next.querySelector('video')?.play?.().catch(() => {});
}
// A line is said: talk for its beat. A voice that starts takes over (startTalk).
export function sayLine(line, text) {
  if (!line) return;
  const token = ++talk.token;
  clearTimeout(talk.timer);
  Object.assign(talk, { line, on: true, heard: false });
  talk.timer = setTimeout(() => { if (talk.token === token) { talk.on = false; redrawKeeper(); } }, talkBeat(text));
  redrawKeeper();
}
export function startTalk(line) {
  if (!line) return 0;
  clearTimeout(talk.timer);
  Object.assign(talk, { line, on: true, heard: true, token: talk.token + 1 });
  redrawKeeper();
  return talk.token;
}
export function stopTalk(token) {
  if (!token || token !== talk.token) return;
  Object.assign(talk, { on: false, heard: false });
  redrawKeeper();
}
export function resetTalk() {
  clearTimeout(talk.timer);
  Object.assign(talk, { line: null, on: false, heard: false, token: talk.token + 1 });
}
// After a render: a new line in the bubble that asks to talk is said now.
export function wireKeeper(root) {
  talk.root = root;
  const keeper = root?.querySelector?.('.lr-keeper[data-line]');
  if (keeper && keeper.dataset.pose === 'talk' && keeper.dataset.line !== talk.line) sayLine(keeper.dataset.line, keeper.querySelector('.lr-listen')?.dataset.text);
}

// Map -------------------------------------------------------------------------
// The map carries no place names: each stop is a tappable region over its
// landmark. The next stop glows; stops already reached open their sheet.
// Once the road is finished the fair glows and opens its sheet, with the finale.
function stopButton(stop, i, progress, profile, layout) {
  const [x, y, w, h] = MAP_REGIONS[layout][stop.id], trail = progress.trail;
  const lit = progress.stages[i] === stop.encounters.length;
  const current = progress.complete ? stop.id === STOPS.at(-1).id : i === progress.stopIndex;
  const reached = trail.started && i <= progress.stopIndex, earned = stop.encounters.reduce((sum, e) => sum + (trail.stars[e.id] || 0), 0);
  const won = medals(profile)[stop.id], open = reached || current;
  // A stop further along answers a tap (dist/main.js, action "refuse").
  const action = !open ? 'refuse' : progress.complete || !current ? 'stop-sheet' : trail.started ? 'continue-journey' : 'start-journey';
  const label = `${stop.title}${lit ? ', lit' : current ? ', next' : reached ? '' : ', ahead'}${reached ? `, ${earned} stars` : ''}`;
  const badge = earned || won.length ? `<span class="lr-stop-badge" aria-hidden="true">${earned ? `<span class="lr-stop-stars">★ ${earned}</span>` : ''}${won.length ? `<span class="lr-medals">${BAND_KEYS.map(b => `<i class="${won.includes(b) ? 'on' : ''} band-${b}"></i>`).join('')}</span>` : ''}</span>` : '';
  return `<button type="button" class="lr-stop ${lit ? 'is-lit' : ''} ${current ? 'is-current' : ''} ${open ? '' : 'is-ahead'}" style="--x:${x}%;--y:${y}%;--w:${w}%;--h:${h}%" data-action="${action}" data-id="${stop.id}" data-focus="stop-${layout}-${stop.id}" ${open ? '' : 'data-text="That’s further on!" aria-disabled="true"'} aria-label="${esc(label)}"><span class="lr-stop-glow" aria-hidden="true"></span>${badge}</button>`;
}
function sideButton(side, progress, layout) {
  const [x, y] = MAP_POINTS[layout][side.stop], trail = progress.trail;
  const stars = trail.stars[side.id] || 0;
  return `<button type="button" class="lr-side ${side.done ? 'is-done' : side.unlocked ? 'is-open' : 'is-locked'}" style="--x:${x}%;--y:${y}%" data-action="open-encounter" data-id="${side.id}" data-focus="side-${layout}-${side.id}" aria-label="${esc(side.title)}${side.done ? `, ${stars} stars` : side.unlocked ? '' : `, needs the ${TOOLS[side.requires].name.toLowerCase()}`}">${media(slots.tool(side.requires), toolArt(side.requires), { key: `side-${layout}-${side.id}`, cls: 'lr-side-icon' })}${side.done ? '<span aria-hidden="true">★</span>' : side.unlocked ? '' : '<span class="lr-lock" aria-hidden="true">🔒</span>'}</button>`;
}
// The travelers' wagon waits at the ferry from the start, behind Plume's.
function mapLayer(progress, profile, layout) {
  const here = progress.stop.id, plume = STOPS[progress.plumeAt].id;
  const wagon = (who, stopId, extra = '') => { const [x, y] = MAP_WAGON[layout][stopId]; return `<div class="lr-wagon lr-wagon-${who} ${extra}" style="--x:${x}%;--y:${y}%" aria-hidden="true">${media(slots.wagon(who), wagonArt(who), { key: `wagon-${layout}-${who}` })}</div>`; };
  return `<div class="lr-map-layer lr-map-${layout}">${media(slots.map(layout), mapArt(layout, progress.litStops), { key: `map-${layout}`, cls: 'lr-map-art' })}${STOPS.map((s, i) => stopButton(s, i, progress, profile, layout)).join('')}${wagon('party', here, progress.complete ? 'at-finish' : '')}${progress.complete ? '' : wagon('plume', plume, plume === here ? 'same-stop' : '')}${progress.sides.map(side => sideButton(side, progress, layout)).join('')}</div>`;
}
// What the stops' trail medals mean, once there is one to read.
function medalKey(profile) {
  const won = medals(profile);
  if (!STOPS.some(s => won[s.id].length)) return '';
  return `<span class="lr-medal-key" role="img" aria-label="Medals: ${BAND_KEYS.map(b => `Grades ${BANDS[b].label}`).join(', ')}"><b>Medals</b>${BAND_KEYS.map(b => `<span><i class="band-${b}" aria-hidden="true"></i>${esc(BANDS[b].label)}</span>`).join('')}</span>`;
}
export function roadMapView(profile) {
  const progress = getProgress(profile);
  const tools = progress.tools.map(t => `<span class="lr-tool" role="img" aria-label="${esc(TOOLS[t].name)}">${media(slots.tool(t), toolArt(t), { key: `tool-${t}` })}</span>`).join('');
  const hud = progress.started ? `<div class="lr-hud"><span class="lr-total" role="img" aria-label="${progress.stars} stars">★ ${progress.stars}</span>${tools ? `<span class="lr-tools">${tools}</span>` : ''}${medalKey(profile)}</div>` : '';
  return `<section class="lr-overview"><h1 class="sr-only">The Lantern Road</h1><div class="lr-atlas">${mapLayer(progress, profile, 'wide')}${mapLayer(progress, profile, 'tall')}${hud}</div></section>`;
}

// Scene above a road puzzle -----------------------------------------------------
// What the speaker says now, with a stable voice ID for recorded audio
// (art manifest key "voice/<id>"; see docs/art/ROADMAP.md).
export function encounterLine(e, p, attempt, reaction, held = false) {
  const cast = CAST[e.speaker], solved = isSolved(p, attempt.board) && !held;
  const board = attempt.board, gameLost = (e.mechanic === 'nim' || e.mechanic === 'duel') && Array.isArray(board?.piles) && !board.piles.some(Boolean) && board.turns?.at(-1)?.player === 'opponent';
  const from = (kind, list, seed) => { const i = Math.abs(seed) % list.length; return { text: list[i], voice: `${e.speaker}/${kind}-${i + 1}` }; };
  if (solved) return { text: e.lines.win, pose: 'happy', voice: `${e.id}/win` };
  if (gameLost) return { ...from(cast.gloat ? 'gloat' : 'oops', cast.gloat || cast.oops, attempt.moves), pose: 'happy' };
  if (reaction?.kind === 'oops') return { ...from('oops', cast.oops, reaction.n), pose: 'oops' };
  // A keeper whose hint line names a place (Snooze's "Try here") says it only
  // when the hint shows a move; the first, free Hint shows none.
  if (reaction?.kind === 'hint') {
    const nudge = cast.nudge && !(attempt.hintLevel >= 2 && nextHint(p, attempt).type === 'move');
    return nudge ? { text: cast.nudge, pose: 'talk', voice: `${e.speaker}/nudge` } : { text: cast.hint, pose: 'talk', voice: `${e.speaker}/hint` };
  }
  // A board the keeper reacts to while it lasts (a proof garden's stuck cover).
  const cue = boardCue(p, board);
  if (cue && e.lines[cue]) return { text: e.lines[cue], pose: cue === 'stuck' ? 'happy' : 'talk', voice: `${e.id}/${cue}` };
  if (e.side && p.missingAbility) return { text: e.lines.locked, pose: 'talk', voice: `${e.id}/locked` };
  return { text: e.lines.open, pose: 'talk', voice: `${e.id}/open` };
}
// A line's Listen button: its recording when the manifest has one, else the browser voice.
const listenButton = (text, voice, name) => `<button type="button" class="lr-listen" data-action="hear-story" data-text="${esc(text)}" data-voice="voice/${esc(voice)}" aria-label="Listen to ${esc(name)}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8"/></svg></button>`;
// A count Undo can no longer rebuild (more than 120 moves back) shows as a dash.
const countShown = n => (Number.isFinite(n) ? n : '–');
// `board` draws a staged puzzle (dist/road-stage.js) in place of the scene picture.
export function encounterScene(e, profile, p, attempt, { reaction = null, changed = false, held = false, board = null } = {}) {
  const stop = stopOf(e.stop), trail = trailFor(profile, p.band), cast = CAST[e.speaker];
  const solved = isSolved(p, attempt.board) && !held, done = stop.encounters.filter(x => trail.completed.includes(x.id) && !(held && x.id === e.id)).length;
  // The scene shows the stop's state; a just-solved main puzzle plays the change.
  const stage = e.side ? done : Math.min(stop.encounters.length, Math.max(done, e.step + (solved ? 1 : 0)));
  const sceneSlot = changed && !e.side && stage > 0 && asset(slots.sceneChange(stop.id, stage)) ? slots.sceneChange(stop.id, stage) : slots.scene(stop.id, stage);
  const said = encounterLine(e, p, attempt, reaction, held), nonce = reaction?.n ?? '';
  // Each line the keeper says, including each hint press and each mistake.
  const line = [e.id, said.voice, reaction?.kind ?? '', nonce].join('|');
  const rival = rivalScore(e, p), unit = SCORE_UNITS[p.mechanic];
  const verdict = solved ? rivalVerdict(e, p, attempt) : null;
  // The race: the child's count beside Plume's, live while playing. Where the
  // card first appears, Plume says what the number is.
  const mine = rival === null ? null : countShown(scoreOf(p, attempt));
  const taunt = rival !== null && !verdict && !trail.completed.includes(e.id) ? plumeTaunt(e, p.band) : null;
  const plumeLine = verdict ? `<span class="lr-rival-line">${esc(pick(CAST.plume[verdict.result], verdict.mine + verdict.rival))}</span>` : taunt ? `<span class="lr-rival-line">${esc(taunt.text)} ${listenButton(taunt.text, taunt.voice, 'Plume')}</span>` : '';
  const plumeCard = rival === null ? '' : `<div class="lr-rival ${verdict ? `is-${verdict.result}` : ''} ${plumeLine ? 'has-line' : ''}" role="group" aria-label="You ${mine}, Plume ${esc(plural(rival, unit))}">${keeperPortrait('plume', verdict ? (verdict.result === 'lose' ? 'happy' : 'oops') : 'idle', 'rival')}<div class="lr-rival-body"><strong class="lr-race" aria-hidden="true"><span class="lr-race-you">You <b>${mine}</b></span> <span class="lr-race-sep">·</span> <span class="lr-race-plume">Plume <b>${rival}</b> ${esc(rival === 1 ? unit[0] : unit[1])}</span></strong>${plumeLine}</div></div>`;
  return `<section class="lr-scene mood-${stop.id} ${board ? 'is-staged' : ''}" data-stop="${stop.id}" data-stage="${stage}" aria-label="${esc(stop.title)}">
    ${board ? board(stage) : media(sceneSlot, sceneArt(stop.id, stage), { key: 'scene', cls: 'lr-scene-art', then: sceneSlot !== slots.scene(stop.id, stage) ? slots.scene(stop.id, stage) : null, loop: sceneSlot === slots.scene(stop.id, stage) })}
    <div class="lr-keeper" data-line="${esc(line)}" data-speaker="${esc(e.speaker)}" data-pose="${esc(said.pose)}" data-nonce="${esc(nonce)}">${portrait(e.speaker, line, said.pose, nonce)}<p class="lr-bubble" role="status" aria-live="polite" data-keep="bubble"><span class="lr-speaker">${esc(cast.name)}</span> ${esc(said.text)} ${listenButton(said.text, said.voice, cast.name)}</p></div>
    ${plumeCard}
  </section>`;
}

// Solved strip ---------------------------------------------------------------------
// Stars for this play, with what each one was for; the best ever stays on the map.
export function encounterDone(e, profile, p, attempt, result) {
  // Stars earned under an older rule stay in Best, even above today's most.
  const trail = trailFor(profile, p.band), best = trail.stars[e.id] || 0, max = maxStars(e, p), now = starsFor(e, p, attempt);
  const verdict = rivalVerdict(e, p, attempt), progress = getProgress(profile, p.band);
  const finale = e.id === 'fair-final' && progress.complete;
  const nextLabel = finale ? 'The Lantern Fair' : continueAfter(profile, e, p.band) && p.band === profile.band ? 'Next' : 'See the road';
  // A hint that cost a star can be won back on a replay; the race shows both counts.
  const unit = SCORE_UNITS[p.mechanic], hinted = hintCostsStar(attempt);
  const reasons = [
    { icon: '✓', name: 'Solved', got: true },
    { icon: '💡', name: 'No hints', got: !hinted, detail: hinted && best < max ? 'Replay to win it' : '' },
    ...(verdict ? [{ icon: keeperArt('plume', 'idle', CAST.plume.color), name: verdict.result === 'tie' ? 'Tied Plume' : 'Beat Plume', got: verdict.result !== 'lose', detail: `You ${countShown(verdict.mine)} · Plume ${plural(verdict.rival, unit)}` }] : []),
  ].map(r => `<li class="${r.got ? 'got' : ''}"><span class="lr-reason-icon" aria-hidden="true">${r.icon}</span><span>${esc(r.name)}${r.detail ? `<small class="lr-reason-detail">${esc(r.detail)}</small>` : ''}</span></li>`).join('');
  const tool = result?.grants ? `<div class="lr-tool-earned">${media(slots.tool(result.grants), toolArt(result.grants), { key: 'earned-tool' })}<strong>${esc(TOOLS[result.grants].name)}</strong></div>` : '';
  return `<section class="lr-done" aria-label="Puzzle completed" data-keep="done"><h2 id="completion-heading" tabindex="-1">${starRow(now, max, 'big')}<span class="sr-only">Solved. ${now} of ${max} stars.</span></h2><ul class="lr-star-reasons">${reasons}</ul>${best > now ? `<p class="lr-best">Best ${starRow(best, Math.max(max, best))}</p>` : ''}${tool}<div class="lr-done-actions">${button(`${nextLabel} <span aria-hidden="true">→</span>`, finale ? 'finale' : 'finish-encounter', 'primary lr-cta')}${button('Replay', 'replay', 'text-button')}</div></section>`;
}

// Stop sheet, journal, finale ---------------------------------------------------------
function encounterRow(e, profile, puzzles) {
  const trail = trailFor(profile), stars = trail.stars[e.id] || 0, done = e.side ? trail.side.includes(e.id) : trail.completed.includes(e.id);
  const base = withCampaignPuzzles(puzzles).find(p => p.id === campaignId(e.id, profile.band)), p = resolvePuzzle(base, profile);
  const open = canVisitEncounter(profile, e.id);
  // Replay of a finished puzzle starts a fresh attempt (data-replay). A side
  // puzzle still waiting for its tool shows what it needs, as its map tile
  // does, and still opens to be tried.
  const tool = e.side && !done && p?.missingAbility ? TOOLS[e.requires].name.toLowerCase() : null;
  const go = tool ? `<button type="button" class="secondary small lr-needs" data-action="open-encounter" data-id="${e.id}" data-focus="action-open-encounter-${e.id}" aria-label="${esc(e.title)}, needs the ${esc(tool)}">${media(slots.tool(e.requires), toolArt(e.requires), { key: `needs-${e.id}`, cls: 'lr-needs-icon' })}Needs the ${esc(tool)}</button>`
    : button(done ? 'Replay' : 'Play', 'open-encounter', 'secondary small', `data-id="${e.id}" ${done ? 'data-replay="1" ' : ''}aria-label="${done ? 'Replay' : 'Play'} ${esc(e.title)}"`);
  return `<li class="lr-row">${keeperPortrait(e.speaker, 'idle', `row-${e.id}`)}<span class="lr-row-title">${esc(e.title)}</span>${p ? starRow(stars, Math.max(maxStars(e, p), stars)) : ''}${open ? go : ''}</li>`;
}
export function stopSheet(stopId, profile, puzzles) {
  const stop = stopOf(stopId), sides = SIDE.filter(s => s.stop === stopId && getProgress(profile).sides.some(x => x.id === s.id));
  return `<ul class="lr-rows">${[...stop.encounters, ...sides].map(e => encounterRow(e, profile, puzzles)).join('')}</ul>`;
}
function archive(journey, module, label, key) {
  if (!journey) return '';
  const entries = (journey.completed || []).map(id => module.getEncounter(id, journey)).filter(Boolean);
  return `<details class="earlier-journey" data-view-key="${key}"><summary>${label}</summary>${entries.map(e => `<article class="journal-entry"><h3>${esc(e.keepsake?.title || e.title)}</h3><p>${esc(e.keepsake?.text || e.success)}</p></article>`).join('') || '<p>No entries.</p>'}</details>`;
}
export function journalView(profile, puzzles) {
  const progress = getProgress(profile);
  const stops = STOPS.filter((s, i) => progress.started && i <= progress.stopIndex);
  return `<div class="journal-layout lr-journal-view"><h1 class="sr-only">Journal</h1>${stops.length ? stops.map(s => `<section class="lr-journal-stop mood-${s.id}"><h2>${esc(s.title)}</h2>${stopSheet(s.id, profile, puzzles)}</section>`).join('') : '<p class="journal-empty">No stops yet.</p>'}${archive(profile.roadJourney, road3, 'Earlier lantern road', 'road3-archive')}${archive(profile.caravanJourney, legacy, 'Earlier caravan journey', 'caravan-archive')}${archive(profile.rescueJourney, rescue, 'Earlier citadel journey', 'rescue-archive')}</div>`;
}
// The end of a trail: each keeper says goodbye, Plume concedes, the trail's
// medal, the stars as "55 of 62" with the puzzles that still have stars to win
// (each starts a fresh replay), then this trail's Puzzles shelf and the next
// trail up. A trail never sends its finisher down to an easier one.
const medalArt = band => `<svg viewBox="0 0 64 80" aria-hidden="true"><path d="M20 2h10l6 26H26z" fill="#c8513b"/><path d="M34 2h10l-6 26H28z" fill="#3b6fb8"/><circle cx="32" cy="50" r="24" class="medal-disc band-${band}" stroke="#5a4320" stroke-width="3"/><circle cx="32" cy="50" r="16" fill="none" stroke="#fff8" stroke-width="2"/><path d="m32 38 3.6 7.4 8 1.1-5.8 5.6 1.4 8L32 56.3l-7.2 3.8 1.4-8-5.8-5.6 8-1.1z" fill="#fff6" stroke="#5a4320" stroke-width="1.5"/></svg>`;
export function finaleView(profile, puzzles) {
  const band = profile.band, won = medals(profile), tally = starTally(profile, puzzles, band);
  const nextBand = BAND_KEYS.slice(BAND_KEYS.indexOf(band) + 1).find(b => trailFor(profile, b).completed.length < MAIN.length);
  const say = (id, text, voice, pose) => `<li class="lr-bye">${keeperPortrait(id, pose, `bye-${id}`)}<p class="lr-bubble"><span class="lr-speaker">${esc(CAST[id].name)}</span> ${esc(text)} ${listenButton(text, voice, CAST[id].name)}</p></li>`;
  const goodbyes = [...KEEPERS.map(id => say(id, CAST[id].bye, `${id}/bye`, 'happy')), say('plume', CAST.plume.concede, 'plume/concede', 'oops')].join('');
  const missing = tally.missing.map(({ encounter: e, stars, max }) => `<li class="lr-row">${keeperPortrait(e.speaker, 'idle', `missing-${e.id}`)}<span class="lr-row-title">${esc(e.title)}</span>${starRow(stars, max)}${button(stars ? 'Replay' : 'Play', 'open-encounter', 'secondary small', `data-id="${e.id}" ${stars ? 'data-replay="1" ' : ''}aria-label="${stars ? 'Replay' : 'Play'} ${esc(e.title)}"`)}</li>`).join('');
  const others = BAND_KEYS.filter(b => b !== band && STOPS.every(s => won[s.id].includes(b)));
  return `<section class="lr-finale"><h1>The Lantern Fair</h1>${media(slots.finale(), finaleArt(), { key: 'finale', cls: 'lr-finale-art' })}<ul class="lr-byes">${goodbyes}</ul><div class="lr-medal-award band-${band}" role="img" aria-label="Grades ${esc(BANDS[band].label)} medal${others.length ? `, and ${others.map(b => `Grades ${BANDS[b].label}`).join(', ')}` : ''}">${medalArt(band)}<strong>Grades ${esc(BANDS[band].label)}</strong>${others.map(b => `<span class="lr-medal-other band-${b}"><i></i>${esc(BANDS[b].label)}</span>`).join('')}</div><p class="lr-finale-stars" role="img" aria-label="${tally.earned} of ${tally.max} stars">★ ${tally.earned} <span>of ${tally.max}</span></p>${missing ? `<ul class="lr-rows lr-missing">${missing}</ul>` : ''}<div class="lr-done-actions">${button('Puzzles', 'library', 'primary lr-cta')}${nextBand ? button(`Grades ${esc(BANDS[nextBand].label)} <span aria-hidden="true">→</span>`, 'switch-band', 'secondary', `data-id="${nextBand}"`) : ''}${button('See the road', 'map', 'text-button')}</div></section>`;
}
export function trailOptions(profile) {
  return BAND_KEYS.map(key => { const t = trailFor(profile, key), stars = Object.values(t.stars).reduce((a, b) => a + b, 0); return `<label class="grade-option"><input type="radio" name="band" value="${key}" ${key === profile.band ? 'checked' : ''}><strong>${BANDS[key].label}</strong>${t.started ? `<span aria-label="${stars} stars">★ ${stars}</span>` : ''}</label>`; }).join('');
}
