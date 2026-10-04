// Views for the Lantern Road: the map, the scene above each road puzzle, the
// solved strip, stop sheets, the journal and the fair finale.
import { BANDS, isSolved } from './engine.js';
import { STOPS, SIDE, CAST, TOOLS, BAND_KEYS, getProgress, medals, trailFor, stopOf, rivalScore, rivalVerdict, maxStars, starsFor, SCORE_UNITS, campaignId, withCampaignPuzzles, resolvePuzzle, canVisitEncounter, continueAfter } from './road.js';
import { pick } from './road-cast.js';
import { media, slots, asset } from './art.js';
import { keeperArt, sceneArt, mapArt, wagonArt, toolArt, finaleArt, MAP_POINTS } from './road-placeholders.js';
import { companionSvg } from './caravan-art.js';
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
const keeperPortrait = (id, wanted, key = 'keeper', nonce = '') => {
  const pose = [wanted, ...(wanted === 'talk' ? [] : ['talk']), 'idle'].find(p => asset(slots.keeper(id, p))) || wanted, once = pose === 'happy' || pose === 'oops';
  return media(slots.keeper(id, pose), keeperArt(id, pose, CAST[id]?.color), { key, cls: 'lr-portrait', then: once ? slots.keeper(id, 'idle') : null, loop: !once, nonce: once ? nonce : '' });
};

// Map -------------------------------------------------------------------------
function stopButton(stop, i, progress, profile, layout) {
  const [x, y] = MAP_POINTS[layout][stop.id], trail = progress.trail;
  const stage = progress.stages[i], lit = stage === stop.encounters.length, current = i === progress.stopIndex && !progress.complete;
  const reached = trail.started && i <= progress.stopIndex, earned = stop.encounters.reduce((sum, e) => sum + (trail.stars[e.id] || 0), 0);
  const won = medals(profile)[stop.id];
  const action = !reached ? '' : current ? 'continue-journey' : 'stop-sheet';
  const label = `${stop.title}${lit ? ', lit' : current ? ', next' : reached ? '' : ', ahead'}${reached ? `, ${earned} stars` : ''}`;
  return `<button type="button" class="lr-stop ${lit ? 'is-lit' : ''} ${current ? 'is-current' : ''} ${reached ? '' : 'is-ahead'}" style="--x:${x}%;--y:${y}%" data-action="${action || 'noop'}" data-id="${stop.id}" data-focus="stop-${layout}-${stop.id}" ${reached ? '' : 'disabled'} aria-label="${esc(label)}"><span class="lr-stop-name">${esc(stop.title)}</span>${reached ? `<span class="lr-stop-stars" aria-hidden="true">★ ${earned}</span>` : ''}${won.length ? `<span class="lr-medals" aria-hidden="true">${BAND_KEYS.map(b => `<i class="${won.includes(b) ? 'on' : ''} band-${b}"></i>`).join('')}</span>` : ''}</button>`;
}
function sideButton(side, progress, layout) {
  const [x, y] = MAP_POINTS[layout][side.stop], trail = progress.trail;
  const stars = trail.stars[side.id] || 0;
  return `<button type="button" class="lr-side ${side.done ? 'is-done' : side.unlocked ? 'is-open' : 'is-locked'}" style="--x:${x}%;--y:${y}%" data-action="open-encounter" data-id="${side.id}" data-focus="side-${layout}-${side.id}" aria-label="${esc(side.title)}${side.done ? `, ${stars} stars` : side.unlocked ? '' : `, needs the ${TOOLS[side.requires].name.toLowerCase()}`}">${media(slots.tool(side.requires), toolArt(side.requires), { key: `side-${layout}-${side.id}`, cls: 'lr-side-icon' })}${side.done ? '<span aria-hidden="true">★</span>' : side.unlocked ? '' : '<span class="lr-lock" aria-hidden="true">🔒</span>'}</button>`;
}
function mapLayer(progress, profile, layout) {
  const pts = MAP_POINTS[layout], here = progress.stop.id, plume = STOPS[progress.plumeAt].id;
  const wagon = (who, stopId, extra = '') => { const [x, y] = pts[stopId]; return `<div class="lr-wagon lr-wagon-${who} ${extra}" style="--x:${x}%;--y:${y}%" aria-hidden="true">${media(slots.wagon(who), wagonArt(who), { key: `wagon-${layout}-${who}` })}</div>`; };
  return `<div class="lr-map-layer lr-map-${layout}">${media(slots.map(layout), mapArt(layout, progress.litStops), { key: `map-${layout}`, cls: 'lr-map-art' })}${progress.started ? wagon('party', here, progress.complete ? 'at-finish' : '') : ''}${progress.complete ? '' : wagon('plume', plume, plume === here ? 'same-stop' : '')}${STOPS.map((s, i) => stopButton(s, i, progress, profile, layout)).join('')}${progress.sides.map(side => sideButton(side, progress, layout)).join('')}</div>`;
}
export function roadMapView(profile) {
  const progress = getProgress(profile);
  const cta = progress.complete
    ? button(`The Lantern Fair <span aria-hidden="true">✦</span>`, 'finale', 'primary lr-cta')
    : button(`${esc(progress.stop.title)} <span aria-hidden="true">→</span>`, progress.started ? 'continue-journey' : 'start-journey', 'primary lr-cta', `aria-label="${progress.started ? 'Continue at' : 'Start at'} ${esc(progress.stop.title)}"`);
  const tools = progress.tools.map(t => `<span class="lr-tool" role="img" aria-label="${esc(TOOLS[t].name)}">${media(slots.tool(t), toolArt(t), { key: `tool-${t}` })}</span>`).join('');
  return `<section class="lr-overview"><h1 class="sr-only">The Lantern Road</h1><div class="lr-bar">${button(`Grades ${esc(BANDS[profile.band].label)} <span aria-hidden="true">⌄</span>`, 'change-band', 'trail-choice')}${progress.started ? `<span class="lr-total" role="img" aria-label="${progress.stars} stars">★ ${progress.stars}</span>` : ''}${tools ? `<span class="lr-tools">${tools}</span>` : ''}${button('Journal', 'journal', 'lr-journal')}</div><div class="lr-atlas">${mapLayer(progress, profile, 'wide')}${mapLayer(progress, profile, 'tall')}<div class="lr-next">${cta}</div></div><div class="lr-crew" aria-hidden="true">${['pip', 'moss', 'rook', 'bea', 'fern', 'tumble'].map(id => media(slots.party(id), companionSvg(id), { key: `crew-${id}`, cls: `lr-crew-${id}` })).join('')}</div></section>`;
}

// Scene above a road puzzle -----------------------------------------------------
// What the speaker says now, with a stable voice ID for recorded audio
// (art manifest key "voice/<id>"; see docs/art/ROADMAP.md).
export function encounterLine(e, p, attempt, reaction) {
  const cast = CAST[e.speaker], solved = isSolved(p, attempt.board);
  const board = attempt.board, gameLost = (e.mechanic === 'nim' || e.mechanic === 'duel') && Array.isArray(board?.piles) && !board.piles.some(Boolean) && board.turns?.at(-1)?.player === 'opponent';
  const from = (kind, list, seed) => { const i = Math.abs(seed) % list.length; return { text: list[i], voice: `${e.speaker}/${kind}-${i + 1}` }; };
  if (solved) return { text: e.lines.win, pose: 'happy', voice: `${e.id}/win` };
  if (gameLost) return { ...from(cast.gloat ? 'gloat' : 'oops', cast.gloat || cast.oops, attempt.moves), pose: 'happy' };
  if (reaction?.kind === 'oops') return { ...from('oops', cast.oops, reaction.n), pose: 'oops' };
  if (reaction?.kind === 'hint') return { text: cast.hint, pose: 'talk', voice: `${e.speaker}/hint` };
  if (e.side && p.missingAbility) return { text: e.lines.locked, pose: 'talk', voice: `${e.id}/locked` };
  return { text: e.lines.open, pose: attempt.moves ? 'idle' : 'talk', voice: `${e.id}/open` };
}
export function encounterScene(e, profile, p, attempt, { reaction = null, changed = false } = {}) {
  const stop = stopOf(e.stop), trail = trailFor(profile, p.band), cast = CAST[e.speaker];
  const solved = isSolved(p, attempt.board), done = stop.encounters.filter(x => trail.completed.includes(x.id)).length;
  // The scene shows the stop's state; a just-solved main puzzle plays the change.
  const stage = e.side ? done : Math.min(stop.encounters.length, Math.max(done, e.step + (solved ? 1 : 0)));
  const sceneSlot = changed && !e.side && stage > 0 && asset(slots.sceneChange(stop.id, stage)) ? slots.sceneChange(stop.id, stage) : slots.scene(stop.id, stage);
  const said = encounterLine(e, p, attempt, reaction);
  const rival = rivalScore(e, p), unit = SCORE_UNITS[p.mechanic];
  const verdict = solved ? rivalVerdict(e, p, attempt) : null;
  const plumeCard = rival === null ? '' : `<div class="lr-rival ${verdict ? `is-${verdict.result}` : ''}" role="group" aria-label="Plume’s score: ${plural(rival, unit)}">${keeperPortrait('plume', verdict ? (verdict.result === 'lose' ? 'happy' : 'oops') : 'idle', 'rival')}<div><strong>${esc(plural(rival, unit))}</strong>${verdict ? `<span>${esc(pick(CAST.plume[verdict.result], verdict.mine + verdict.rival))}</span>` : ''}</div></div>`;
  return `<section class="lr-scene mood-${stop.id}" data-stop="${stop.id}" data-stage="${stage}" aria-label="${esc(stop.title)}">
    ${media(sceneSlot, sceneArt(stop.id, stage), { key: 'scene', cls: 'lr-scene-art', then: sceneSlot !== slots.scene(stop.id, stage) ? slots.scene(stop.id, stage) : null, loop: sceneSlot === slots.scene(stop.id, stage) })}
    <div class="lr-keeper">${keeperPortrait(e.speaker, said.pose, 'keeper', reaction?.n ?? '')}<p class="lr-bubble" role="status" aria-live="polite"><span class="lr-speaker">${esc(cast.name)}</span> ${esc(said.text)} <button type="button" class="lr-listen" data-action="hear-story" data-text="${esc(said.text)}" data-voice="voice/${esc(said.voice)}" aria-label="Listen to ${esc(cast.name)}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8"/></svg></button></p></div>
    ${plumeCard}
  </section>`;
}

// Solved strip ---------------------------------------------------------------------
// Stars for this play, with what each one was for; the best ever stays on the map.
export function encounterDone(e, profile, p, attempt, result) {
  const trail = trailFor(profile, p.band), best = trail.stars[e.id] || 0, max = maxStars(e, p), now = starsFor(e, p, attempt);
  const verdict = rivalVerdict(e, p, attempt), progress = getProgress(profile, p.band);
  const finale = e.id === 'fair-final' && progress.complete;
  const nextLabel = finale ? 'The Lantern Fair' : continueAfter(profile, e, p.band) && p.band === profile.band ? 'Next' : 'See the road';
  const reasons = [
    { icon: '✓', name: 'Solved', got: true },
    { icon: '💡', name: 'No hints', got: attempt.hintLevel === 0 },
    ...(verdict ? [{ icon: keeperArt('plume', 'idle', CAST.plume.color), name: verdict.result === 'tie' ? 'Tied Plume' : 'Beat Plume', got: verdict.result !== 'lose' }] : []),
  ].map(r => `<li class="${r.got ? 'got' : ''}"><span class="lr-reason-icon" aria-hidden="true">${r.icon}</span>${esc(r.name)}</li>`).join('');
  const tool = result?.grants ? `<div class="lr-tool-earned">${media(slots.tool(result.grants), toolArt(result.grants), { key: 'earned-tool' })}<strong>${esc(TOOLS[result.grants].name)}</strong></div>` : '';
  return `<section class="lr-done" aria-label="Puzzle completed"><h2 id="completion-heading" tabindex="-1">${starRow(now, max, 'big')}<span class="sr-only">Solved. ${now} of ${max} stars.</span></h2><ul class="lr-star-reasons">${reasons}</ul>${best > now ? `<p class="lr-best">Best ${starRow(best, max)}</p>` : ''}${tool}<div class="lr-done-actions">${button(`${nextLabel} <span aria-hidden="true">→</span>`, finale ? 'finale' : 'finish-encounter', 'primary lr-cta')}${button('Replay', 'replay', 'text-button')}</div></section>`;
}

// Stop sheet, journal, finale ---------------------------------------------------------
function encounterRow(e, profile, puzzles) {
  const trail = trailFor(profile), stars = trail.stars[e.id] || 0, done = e.side ? trail.side.includes(e.id) : trail.completed.includes(e.id);
  const base = withCampaignPuzzles(puzzles).find(p => p.id === campaignId(e.id, profile.band)), p = resolvePuzzle(base, profile);
  const open = canVisitEncounter(profile, e.id);
  return `<li class="lr-row">${keeperPortrait(e.speaker, 'idle', `row-${e.id}`)}<span class="lr-row-title">${esc(e.title)}</span>${p ? starRow(stars, maxStars(e, p)) : ''}${open ? button(done ? 'Replay' : 'Play', 'open-encounter', 'secondary small', `data-id="${e.id}" aria-label="${done ? 'Replay' : 'Play'} ${esc(e.title)}"`) : ''}</li>`;
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
export function finaleView(profile) {
  const progress = getProgress(profile), won = medals(profile);
  const nextBand = BAND_KEYS.find(b => !trailFor(profile, b).completed.length && b !== profile.band);
  return `<section class="lr-finale"><h1>The Lantern Fair</h1>${media(slots.finale(), finaleArt(), { key: 'finale', cls: 'lr-finale-art' })}<p class="lr-finale-stars" role="img" aria-label="${progress.stars} stars">★ ${progress.stars}</p><ul class="lr-medal-list">${BAND_KEYS.map(b => `<li class="${STOPS.every(s => won[s.id].includes(b)) ? 'on' : ''}"><i class="band-${b}" aria-hidden="true"></i>${esc(BANDS[b].label)}</li>`).join('')}</ul><div class="lr-done-actions">${nextBand ? button(`Grades ${esc(BANDS[nextBand].label)} <span aria-hidden="true">→</span>`, 'switch-band', 'primary lr-cta', `data-id="${nextBand}"`) : ''}${button('See the road', 'map', 'secondary')}</div></section>`;
}
export function trailOptions(profile) {
  return BAND_KEYS.map(key => { const t = trailFor(profile, key), stars = Object.values(t.stars).reduce((a, b) => a + b, 0); return `<label class="grade-option"><input type="radio" name="band" value="${key}" ${key === profile.band ? 'checked' : ''}><strong>${BANDS[key].label}</strong>${t.started ? `<span aria-label="${stars} stars">★ ${stars}</span>` : ''}</label>`; }).join('');
}
