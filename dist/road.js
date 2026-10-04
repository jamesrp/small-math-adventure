// The Lantern Road (version 4): seven stops on the way to the Lantern Fair.
// Each grade trail (K–1, 2–3, 4–5) is its own run of the same road with its own
// stars, so finishing one trail invites the next. Keepers set the puzzles,
// Plume (the rival caravan) leaves a score to beat, and two tools earned on the
// road open two side puzzles you could only try before.
//
// Campaign boards are copies of checked catalog instances. Their saves never
// touch the library's saves, and solving in the library never moves the road.
import { isSolved, freshAttempt, nextHint } from './engine.js';
import { withCampaignPuzzles as withRoad3Puzzles } from './caravan-road3.js';
import { COMPANIONS } from './caravan-legacy.js';
import { CAST, PARTY } from './road-cast.js';
export { COMPANIONS, CAST, PARTY };

export const BAND_KEYS = ['k1', '23', '45'];
const pick = (k1, b23, b45) => ({ k1, '23': b23, '45': b45 });

// Plume's lead shrinks along the road: early scores are easy to beat; by the
// lighthouse Plume plays perfectly and only a best solve ties.
const SLACK = { ferry: 2, marsh: 2, ridge: 1, hollow: 1, workshop: 1, lighthouse: 0, fair: 0 };
const PREDICTION_SLACK = { ferry: 2, marsh: 2, ridge: 1, hollow: 1, workshop: 1, lighthouse: 0, fair: 0 };

// What Plume's number counts, by mechanic. Families without a natural count
// (routes and weighings already fix their budget; games and proofs have no
// count) have no score card.
export const SCORE_UNITS = {
  swap: ['swap', 'swaps'], toggle: ['press', 'presses'], jug: ['step', 'steps'], tile: ['move', 'moves'],
  latin: ['mark', 'marks'], color: ['color', 'colors'], clock: ['ring', 'rings'], billiard: ['launch', 'launches'], code: ['try', 'tries'],
};
const PREDICTION = new Set(['clock', 'billiard', 'code']);

const encounter = (id, mechanic, speaker, title, selection, lines, extra = {}) => ({ id, mechanic, speaker, title, selection, lines, ...extra });

export const STOPS = [
  {
    id: 'ferry', title: 'Turtle Ferry', keeper: 'snooze', mood: 'morning',
    encounters: [
      encounter('ferry-seats', 'swap', 'snooze', 'Seats on the shell', pick('swap-k1-05', 'swap-23-04', 'swap-45-04'),
        { open: 'All aboard. Wiggly passengers make me seasick.', win: 'Everyone’s on. No wiggling.' }, { party: true }),
      encounter('ferry-bell', 'clock', 'snooze', 'Wake-up bell', pick('clock-01', 'clock-03', 'clock-05'),
        { open: 'Zzz… only the right bell wakes me… zzz…', win: 'Hmm? Oh! I’m up. I’m up.' }),
      encounter('ferry-lights', 'toggle', 'snooze', 'Landing lamps', pick('toggle-02', 'toggle-03', 'toggle-05'),
        { open: 'I don’t swim in the dark. Lamps, please.', win: 'Lovely. Off we go.' }),
    ],
  },
  {
    id: 'marsh', title: 'Glowworm Marsh', keeper: 'hops', mood: 'night',
    encounters: [
      encounter('marsh-boardwalks', 'route', 'hops', 'Boardwalk lamps', pick('route-01', 'route-03', 'route-05'),
        { open: 'My lamps! Every boardwalk, please. I’m terribly late.', win: 'Every lamp lit. Splendid.' }),
      encounter('marsh-lilies', 'latin', 'hops', 'Lily pads', pick('latin-02', 'latin-03', 'latin-05'),
        { open: 'Plant the lily pads neatly. I do like neat.', win: 'Neat as a pin.' }),
      encounter('marsh-water', 'jug', 'hops', 'Pond water', pick('jug-01', 'jug-03', 'jug-05'),
        { open: 'Measure it exactly. I’ll know if you don’t.', win: 'Exactly right. I checked twice.' }),
    ],
  },
  {
    id: 'ridge', title: 'Windy Ridge', keeper: 'billie', mood: 'day',
    encounters: [
      encounter('ridge-stones', 'weigh', 'billie', 'Cable-car stones', pick('weigh-02', 'weigh-03', 'weigh-05'),
        { open: 'One stone’s the wrong weight! Find it or we wobble!', win: 'Found it! Up we go!' }),
      encounter('ridge-duel', 'nim', 'plume', 'Pebbles with Plume', pick('nim-02', 'nim-04', 'nim-05'),
        { open: 'You caught up? Pebble game! I never lose. Your move.', win: 'Best two out of three? …No? Fine.' }, { rival: true }),
      encounter('ridge-kites', 'color', 'billie', 'Kites', pick('color-02', 'color-03', 'color-06'),
        { open: 'Kite time! Make them easy to tell apart!', win: 'Look at them fly!' }),
    ],
  },
  {
    id: 'hollow', title: 'Spooky Hollow', keeper: 'rattle', mood: 'spooky',
    encounters: [
      encounter('hollow-pumpkins', 'toggle', 'rattle', 'Pumpkin patch', pick('toggle-16', 'toggle-08', 'toggle-42'),
        { open: 'Light my pumpkins… if you dare.', win: 'Oooh. Spooky-pretty.' }),
      encounter('hollow-crypt', 'code', 'rattle', 'Crypt door', pick('code-02', 'code-04', 'code-05'),
        { open: 'My crypt door can’t keep a secret. Heh heh.', win: 'Creeeak! It opens!' }),
      encounter('hollow-plots', 'proofgarden', 'rattle', 'The garden nobody covered', pick('proof-garden-01', 'proof-garden-03', 'proof-garden-03'),
        { open: 'Nobody has EVER covered my garden. Mwahaha!', win: 'You PROVED it?! Keep the chalk.' }, { grants: 'chalk' }),
    ],
  },
  {
    id: 'workshop', title: 'Old Workshop', keeper: 'sprocket', mood: 'rain',
    encounters: [
      encounter('workshop-floor', 'tile', 'sprocket', 'Floor patch', pick('tile-k1-04', 'tile-23-08', 'tile-45-08'),
        { open: 'Patch the floor! I keep falling in that hole.', win: 'No more falling! Thanks!' }),
      encounter('workshop-pump', 'jug', 'sprocket', 'The new pump', pick('jug-02', 'jug-08', 'jug-04'),
        { open: 'New pump! Fills! Empties! Try it!', win: 'It works! Keep it. I’ll build another.' }, { grants: 'pump' }),
      encounter('workshop-parts', 'swap', 'sprocket', 'Turntable parts', pick('swap-k1-12', 'swap-23-10', 'swap-45-09'),
        { open: 'Parts in their slots! Quick, before it goes bang!', win: 'Sorted! Nothing went bang!' }),
    ],
  },
  {
    id: 'lighthouse', title: 'Stormy Lighthouse', keeper: 'wick', mood: 'storm',
    encounters: [
      encounter('lighthouse-mirrors', 'billiard', 'wick', 'Mirror room', pick('billiard-02', 'billiard-04', 'billiard-05'),
        { open: 'The ships need light. Send it to the right corner.', win: 'The ships see us. Good.' }),
      encounter('lighthouse-gears', 'clock', 'wick', 'Beacon gears', pick('clock-02', 'clock-04', 'clock-06'),
        { open: 'The beacon turns on these gears. Set them.', win: 'Steady. Good.' }),
      encounter('lighthouse-lamps', 'toggle', 'wick', 'Harbor lamps', pick('toggle-15', 'toggle-09', 'toggle-12'),
        { open: 'Harbor lamps. Match the card, please.', win: 'Hoo. Well done.' }),
    ],
  },
  {
    id: 'fair', title: 'The Lantern Fair', keeper: 'plume', mood: 'fair',
    encounters: [
      encounter('fair-prizes', 'weigh', 'billie', 'Prize booth', pick('weigh-03', 'weigh-08', 'weigh-12'),
        { open: 'Billie’s booth! One prize is a fake! Spot it, it’s yours!', win: 'The real one’s yours! Ha!' }),
      encounter('fair-stalls', 'route', 'hops', 'Every stall', pick('route-02', 'route-08', 'route-11'),
        { open: 'The fair lamps are mine too. Every path, please.', win: 'Splendid. Not a lamp missed.' }),
      encounter('fair-final', 'duel', 'plume', 'Plume’s rematch', pick('proof-duel-01', 'proof-duel-02', 'proof-duel-03'),
        { open: 'I practiced every night. Three in a row, if you can.', win: 'You beat me fair and square. Rematch next year?' }, { rival: true }),
    ],
  },
];

// Side puzzles appear once their stop is reached and stay optional. Each needs a
// tool earned later on the road; before that they can be tried, not finished.
export const SIDE = [
  encounter('ferry-bath', 'jug', 'snooze', 'Snooze’s bath', pick('road4-bath-k1', 'road4-bath-23', 'road4-bath-45'),
    { open: 'A pump! Now we can fill and empty. Bath time.', locked: 'Bath time? These jugs only pour into each other.', win: 'Ahhh. Just right.' },
    { stop: 'ferry', requires: 'pump' }),
  encounter('marsh-garden', 'proofgarden', 'hops', 'The other garden', pick('proof-garden-02', 'proof-garden-05', 'proof-garden-06'),
    { open: 'Chalk! Then show me why nobody can.', locked: 'Nobody has ever covered that garden. Many have tried.', win: 'Well! Now I know why.' },
    { stop: 'marsh', requires: 'chalk' }),
];

export const TOOLS = {
  chalk: { name: 'Chalk', from: 'hollow-plots' },
  pump: { name: 'Pump', from: 'workshop-pump' },
};

STOPS.forEach((stop, stopIndex) => stop.encounters.forEach((e, step) => Object.assign(e, { stop: stop.id, stopIndex, step, side: false })));
SIDE.forEach(e => Object.assign(e, { stopIndex: STOPS.findIndex(s => s.id === e.stop), step: null, side: true }));
export const MAIN = STOPS.flatMap(s => s.encounters);
const ALL = [...MAIN, ...SIDE];
const MAIN_IDS = MAIN.map(e => e.id), SIDE_IDS = SIDE.map(e => e.id);
export const getEncounter = id => ALL.find(e => e.id === id) || null;
export const stopOf = id => STOPS.find(s => s.id === id) || null;
export const campaignId = (encounterId, band) => `road4-${encounterId}-${band}`;

// Saves -------------------------------------------------------------------

export const freshJourney = () => ({ version: 4, trails: {} });
const freshTrail = () => ({ started: false, completed: [], side: [], stars: {} });
export const ensureJourney = profile => (profile.journey?.version === 4 ? profile.journey : (profile.journey = freshJourney()));
export function trailFor(profile, band = profile.band) {
  const journey = profile.journey?.version === 4 ? profile.journey : null;
  return journey?.trails?.[band] || freshTrail();
}
function writableTrail(profile, band = profile.band) {
  const journey = ensureJourney(profile);
  return journey.trails[band] ??= freshTrail();
}
export const hasTool = (trail, tool) => Boolean(TOOLS[tool] && trail.completed.includes(TOOLS[tool].from));
export const toolsOf = trail => Object.keys(TOOLS).filter(tool => hasTool(trail, tool));

export function startJourney(profile) {
  const trail = writableTrail(profile);
  trail.started = true;
  return profile.journey;
}

// Index of the stop the caravan is at (the next encounter's stop), or the last
// stop once the trail is finished.
function currentStopIndex(trail) {
  const next = MAIN[trail.completed.length];
  return next ? next.stopIndex : STOPS.length - 1;
}
export function stopReached(trail, stopId) {
  const index = STOPS.findIndex(s => s.id === stopId);
  return trail.started && index >= 0 && index <= currentStopIndex(trail);
}

export function getProgress(profile, band = profile.band) {
  const trail = trailFor(profile, band), count = trail.completed.length, complete = count === MAIN.length;
  const encounter = complete ? null : MAIN[count], stopIndex = currentStopIndex(trail), stop = STOPS[stopIndex];
  const stages = STOPS.map(s => s.encounters.filter(e => trail.completed.includes(e.id)).length);
  const litStops = STOPS.filter((s, i) => stages[i] === s.encounters.length).map(s => s.id);
  // Plume waits at the ridge and at the fair; otherwise the rival is one stop ahead.
  const plumeAt = complete ? STOPS.length - 1 : stop.id === 'ridge' && !trail.completed.includes('ridge-duel') ? stopIndex : Math.min(stopIndex + 1, STOPS.length - 1);
  const earned = Object.entries(trail.stars).reduce((sum, [, n]) => sum + n, 0);
  return { band, trail, started: trail.started, complete, completedCount: count, total: MAIN.length, encounter, stop, stopIndex, stages, litStops,
    plumeAt, tools: toolsOf(trail), stars: earned, sides: SIDE.filter(e => stopReached(trail, e.stop)).map(e => ({ ...e, done: trail.side.includes(e.id), unlocked: hasTool(trail, e.requires) })) };
}
// A stop is lit on a trail when its three main encounters are done. Medals show
// which trails have lit each stop.
export function medals(profile) {
  return Object.fromEntries(STOPS.map(s => [s.id, BAND_KEYS.filter(band => s.encounters.every(e => trailFor(profile, band).completed.includes(e.id)))]));
}

export function canVisitEncounter(profile, id, band = profile.band) {
  const trail = trailFor(profile, band), e = getEncounter(id);
  if (!e || !trail.started) return false;
  if (e.side) return stopReached(trail, e.stop);
  return MAIN_IDS.indexOf(id) <= trail.completed.length;
}

// Campaign puzzles -----------------------------------------------------------

const BATH = {
  k1: { capacities: [4, 3], start: [4, 0], target_amount: 2, moves: [['pour', 0, 1], ['empty', 1], ['pour', 0, 1], ['fill', 0], ['pour', 0, 1]],
    hints: ['Pouring alone only trades between two pictures. You need the pump.', 'Pour the big jug into the small one, then empty the small one.', 'Put the last unit into the small jug. Fill the big jug, then top up the small one.'] },
  '23': { capacities: [5, 3], start: [5, 0], target_amount: 4, moves: [['pour', 0, 1], ['empty', 1], ['pour', 0, 1], ['fill', 0], ['pour', 0, 1]],
    hints: ['Pouring alone only trades between two pictures. You need the pump.', 'Keep two units in the small jug. That leaves room for just one more.', 'Move the two remaining units into the small jug; refill the large jug and top up the small one.'] },
  '45': { capacities: [9, 4], start: [9, 0], target_amount: 6, moves: [['pour', 0, 1], ['empty', 1], ['pour', 0, 1], ['empty', 1], ['pour', 0, 1], ['fill', 0], ['pour', 0, 1]],
    hints: ['Pouring alone only trades between two pictures. You need the pump.', 'Each pour from the big jug into the empty small one takes away 4.', 'Leave 1 unit in the small jug, fill the big jug, and top up the small one.'] },
};
function bathPuzzle(base, band) {
  const spec = BATH[band], [a, b] = spec.capacities;
  const pourOnly = `(${spec.start.join(',')}) and (${spec.start[0] - b},${b})`;
  return {
    ...base, id: `road4-bath-${band}`, title: 'Snooze’s bath', band, number: 0, revision: 1,
    prompt: `Use the ${a}- and ${b}-unit jugs to leave exactly ${spec.target_amount} units in either jug.`,
    instruction: `Use the ${a}- and ${b}-unit jugs to leave exactly ${spec.target_amount} units in either jug.`,
    parameters: { capacities: spec.capacities, start: spec.start, source_and_drain: true, target_amount: spec.target_amount },
    solution: { moves: spec.moves, minimum_moves: spec.moves.length },
    hints: spec.hints, hint: spec.hints[0],
    idea: 'A new operation changes which amounts can be reached.',
    insight: 'A new operation changes which amounts can be reached.',
    rules: ['A pour continues until the source is empty or the destination is full.', 'Fill and Empty need the pump from the Old Workshop.'],
    prerequisites: 'Pouring between two jugs; the pump is earned at the Old Workshop.',
    parent: {
      ...base.parent,
      notice: `Before the pump, pouring only alternates between ${pourOnly}. The target is not among them.`,
      prompt: `Why can’t pouring alone ever make ${spec.target_amount}?`,
      explanation: `With no way to add or remove water, every pour ends with one jug empty or full, so from (${spec.start.join(',')}) only ${pourOnly} are reachable. Fill and Empty add the integer combinations of ${a} and ${b}; because gcd(${a},${b}) = 1, every amount up to ${a} becomes reachable (Bézout).`,
      extension: `Which amounts could you reach if the jugs held ${a + 1} and ${b + 1}? When does the pump not help?`,
      connection: 'Reachable sets in state graphs; how adding a generator enlarges the set of reachable states.',
    },
    provenance: 'New Lantern Road instance (October 2026), adapted from the sealed tower lift in the archived rescue campaign and the Spring-water Jugs family.',
  };
}

const PROOF_MECHANICS = new Set(['proofgarden', 'duel', 'flipmap', 'sortgarden']);
const catalogs = new WeakMap();
export function withCampaignPuzzles(puzzles) {
  if (catalogs.has(puzzles)) return catalogs.get(puzzles);
  const archived = withRoad3Puzzles(puzzles.filter(p => !p.campaignOnly));
  const base = archived.filter(p => !p.campaignOnly);
  const byId = new Map(base.map(p => [p.id, p]));
  const jugBase = byId.get('jug-03');
  const extras = ALL.flatMap(e => BAND_KEYS.flatMap(band => {
    const sourceId = e.selection[band];
    const source = sourceId.startsWith('road4-bath-') ? (jugBase ? bathPuzzle(jugBase, band) : null) : byId.get(sourceId);
    // A pack without proof puzzles (older tests) simply has no copies of them.
    if (!source) return [];
    const copy = { ...source, id: campaignId(e.id, band), title: e.title, band, campaignOnly: true, campaignVersion: 4, campaignEncounter: e.id, sourceId: source.id };
    if (source.band === 'proofs') copy.proof = true;
    if (e.requires) copy.requiresTool = e.requires;
    // Checker in the side garden is earned by the painted proof at the Hollow.
    if (copy.parameters?.checkerAfter) copy.parameters = { ...copy.parameters, checkerAfter: campaignId('hollow-plots', band) };
    return [copy];
  }));
  const all = [...archived, ...extras];
  catalogs.set(puzzles, all); catalogs.set(all, all);
  return all;
}

// Tools change a puzzle's rules. The stored definition is the tool-ready one;
// without the tool the jug loses Fill/Empty and the garden loses its proof mode.
export function resolvePuzzle(puzzle, profile) {
  if (!puzzle || puzzle.campaignVersion !== 4 || !puzzle.requiresTool) return puzzle;
  if (hasTool(trailFor(profile || {}, puzzle.band), puzzle.requiresTool)) return puzzle;
  if (puzzle.requiresTool === 'pump') {
    return { ...puzzle, parameters: { ...puzzle.parameters, source_and_drain: false }, missingAbility: 'pump',
      equipmentHint: 'Pouring alone can’t make it. The Old Workshop has a pump.', hints: ['Pouring alone can’t make it. The Old Workshop has a pump.', ...puzzle.hints.slice(1)],
      rules: ['A pour continues until the source is empty or the destination is full.', 'Fill and Empty need the pump from the Old Workshop.'] };
  }
  const text = 'Nobody has managed to cover it. Spooky Hollow has chalk.';
  return { ...puzzle, parameters: { ...puzzle.parameters, proveLocked: true }, missingAbility: 'chalk', equipmentHint: text, hints: [text, text, text] };
}

export function puzzleForEncounter(e, band, puzzles) {
  if (!e) return null;
  return withCampaignPuzzles(puzzles).find(p => p.id === campaignId(e.id, band)) || null;
}

export function beginEncounter(profile, puzzles, id) {
  const progress = getProgress(profile), target = id ? getEncounter(id) : progress.encounter;
  if (!target || !canVisitEncounter(profile, target.id)) return null;
  const puzzle = puzzleForEncounter(target, profile.band, puzzles);
  return puzzle ? { encounter: target, puzzle: resolvePuzzle(puzzle, profile) } : null;
}

// Scores and stars -------------------------------------------------------------

// The number Plume's card counts, read from the current line of play. Undo
// removes a move from the count; a lift or erase is a move.
export function scoreOf(p, attempt) {
  if (!attempt || !SCORE_UNITS[p.mechanic]) return null;
  const line = [...attempt.history.map(h => h.board), attempt.board];
  const truncated = attempt.history.length < attempt.moves;
  switch (p.mechanic) {
    case 'toggle': return attempt.board.presses.length;
    case 'code': return truncated ? Infinity : line.filter(b => b.submitted).length;
    case 'color': return truncated ? Infinity : line.slice(1).filter((b, i) => b.colors.join() !== line[i].colors.join()).length;
    default: return attempt.moves;
  }
}

const optimumCache = new Map();
export function optimumOf(p) {
  const key = p.sourceId || p.id;
  if (optimumCache.has(key)) return optimumCache.get(key);
  let value = null;
  switch (p.mechanic) {
    case 'swap': value = p.minimumMoves; break;
    case 'tile': value = p.cells.length / (p.tileShape === 'l-tromino' ? 3 : 2); break;
    case 'latin': value = p.parameters.givens.flat().filter(x => !x).length; break;
    case 'color': value = p.parameters.vertices.length; break;
    case 'clock': case 'billiard': case 'code': value = 1; break;
    case 'toggle': case 'jug': { const h = nextHint(p, freshAttempt(p)); value = h.type === 'move' ? h.remaining : null; break; }
  }
  optimumCache.set(key, value);
  return value;
}

// Plume's number for this encounter on this trail, or null when there is no card.
export function rivalScore(e, p) {
  if (!e || e.side || e.rival || !SCORE_UNITS[p.mechanic]) return null;
  const best = optimumOf(p);
  if (best === null) return null;
  const slack = PREDICTION.has(p.mechanic) ? PREDICTION_SLACK[e.stop] : SLACK[e.stop];
  const budget = p.parameters?.press_budget;
  return budget == null ? best + slack : Math.min(best + slack, budget);
}
export const maxStars = (e, p) => (rivalScore(e, p) === null ? 2 : 3);
export function starsFor(e, p, attempt) {
  if (!attempt || !isSolved(p, attempt.board)) return 0;
  const rival = rivalScore(e, p);
  return 1 + (attempt.hintLevel === 0 ? 1 : 0) + (rival !== null && scoreOf(p, attempt) <= rival ? 1 : 0);
}
export function rivalVerdict(e, p, attempt) {
  const rival = rivalScore(e, p);
  if (rival === null || !attempt || !isSolved(p, attempt.board)) return null;
  const mine = scoreOf(p, attempt);
  return { rival, mine, result: mine < rival ? 'beat' : mine === rival ? 'tie' : 'lose' };
}

// Record a solved board. A first solve of the current encounter advances the
// trail; replays and side puzzles only raise stars. Returns what changed.
// The trail is the board's own band, which can differ from the current
// puzzle level when a board from another trail is still open.
export function recordSolve(profile, puzzleId, encounterId, puzzles) {
  const e = getEncounter(encounterId), base = withCampaignPuzzles(puzzles).find(p => p.id === puzzleId), band = base?.band;
  if (!e || !base || base.campaignVersion !== 4 || !canVisitEncounter(profile, encounterId, band) || puzzleId !== campaignId(encounterId, band)) return null;
  const attempt = profile.attempts[puzzleId];
  const p = resolvePuzzle(base, profile);
  if (!p || !attempt?.completed || !isSolved(p, attempt.board)) return null;
  const trail = writableTrail(profile, band), before = trail.stars[encounterId] || 0;
  let first = false;
  if (e.side) { if (!trail.side.includes(e.id)) { trail.side.push(e.id); first = true; } }
  else if (MAIN_IDS[trail.completed.length] === e.id) { trail.completed.push(e.id); first = true; }
  const stars = Math.max(before, starsFor(e, p, attempt));
  trail.stars[encounterId] = stars;
  const stop = stopOf(e.stop);
  return { first, stars, newStars: stars - before, max: maxStars(e, p), grants: first && e.grants ? e.grants : null,
    stopLit: first && !e.side && stop.encounters.every(x => trail.completed.includes(x.id)), finished: first && trail.completed.length === MAIN.length };
}

// After a solved road puzzle: the next encounter at the same stop when this
// was the latest one finished on its trail, otherwise null (back to the map).
export function continueAfter(profile, e, band) {
  if (!e || e.side) return null;
  const trail = trailFor(profile, band), next = MAIN[trail.completed.length];
  return trail.completed.at(-1) === e.id && next?.stop === e.stop ? next : null;
}

// Validation -------------------------------------------------------------------

export function validateJourney(value, profile, puzzles) {
  const fail = () => { throw Error('This lantern road does not match the saved puzzles.'); };
  if (!value || value.version !== 4 || !value.trails || typeof value.trails !== 'object' || Array.isArray(value.trails)) return fail();
  const trails = {};
  for (const [band, trail] of Object.entries(value.trails)) {
    if (!BAND_KEYS.includes(band) || !trail || typeof trail.started !== 'boolean' || !Array.isArray(trail.completed) || !Array.isArray(trail.side) || !trail.stars || typeof trail.stars !== 'object' || Array.isArray(trail.stars)) return fail();
    if (trail.completed.length > MAIN.length || trail.completed.some((id, i) => id !== MAIN_IDS[i])) return fail();
    if (!trail.started && (trail.completed.length || trail.side.length || Object.keys(trail.stars).length)) return fail();
    const copy = { started: trail.started, completed: [...trail.completed], side: [...trail.side], stars: {} };
    if (new Set(copy.side).size !== copy.side.length || copy.side.some(id => !SIDE_IDS.includes(id) || !stopReached(copy, getEncounter(id).stop) || !hasTool(copy, getEncounter(id).requires))) return fail();
    const done = new Set([...copy.completed, ...copy.side]);
    for (const [id, stars] of Object.entries(trail.stars)) {
      if (!done.has(id) || !Number.isInteger(stars) || stars < 1 || stars > 3) return fail();
      copy.stars[id] = stars;
    }
    if ([...done].some(id => !Object.hasOwn(copy.stars, id))) return fail();
    for (const id of done) if (profile.attempts?.[campaignId(id, band)]?.completed !== true) return fail();
    trails[band] = copy;
  }
  return { version: 4, trails };
}
// Saved attempts for road boards must belong to an encounter that trail has reached.
export function campaignAttemptReachable(profile, puzzle) {
  if (puzzle?.campaignVersion !== 4) return false;
  return canVisitEncounter(profile, puzzle.campaignEncounter, puzzle.band);
}
export const isProofMechanic = mechanic => PROOF_MECHANICS.has(mechanic);
export const partyFor = n => PARTY.slice(0, n);
export const castOf = e => CAST[e?.speaker] || null;
