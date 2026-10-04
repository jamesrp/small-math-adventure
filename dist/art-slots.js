// The catalog of art slots: every picture the road can show, with the shape
// and timing it needs. docs/art/ROADMAP.md describes how to make them;
// scripts/check-art.mjs checks finished files against this list. Each slot
// works without art (a drawn placeholder) until the manifest marks it ready.
import { STOPS, SIDE, CAST, PARTY } from './road.js';

// width × height for stills; videos use the same aspect at up to 1280 wide.
const SHAPES = {
  map_wide: { w: 2000, h: 840, video: 'loop' },
  map_tall: { w: 1200, h: 1800, video: 'loop' },
  scene: { w: 1800, h: 690, video: 'loop' },
  change: { w: 1800, h: 690, video: 'once' },
  portrait: { w: 512, h: 512, video: 'loop' },
  reaction: { w: 512, h: 512, video: 'once' },
  sticker: { w: 240, h: 180, video: null, transparent: true },
  icon: { w: 256, h: 256, video: null, transparent: true },
  traveler: { w: 256, h: 256, video: null, transparent: true },
  finale: { w: 1800, h: 780, video: 'loop' },
};
const slot = (id, shape, about) => ({ id, shape, ...SHAPES[shape], about });

export const POSES = { idle: 'portrait', talk: 'portrait', happy: 'reaction', oops: 'reaction' };

export function artSlots() {
  const list = [
    slot('map/wide', 'map_wide', 'The whole road on wide screens; stops at MAP_POINTS.wide.'),
    slot('map/tall', 'map_tall', 'The whole road on phones, bottom (Turtle Ferry) to top (the fair); stops at MAP_POINTS.tall.'),
    slot('map/wagon-party', 'sticker', 'The travelers’ wagon with the lantern tree, side view, facing right.'),
    slot('map/wagon-plume', 'sticker', 'Plume’s showy wagon with a tail-feather awning, side view, facing right.'),
    slot('finale/fair', 'finale', 'Everyone at the Lantern Fair: travelers, keepers and Plume, fireworks.'),
    ...['chalk', 'pump'].map(id => slot(`tool/${id}`, 'icon', id === 'chalk' ? 'A stick of white chalk (Rattle’s gift).' : 'Sprocket’s little portable pump with a hose and crank.')),
    ...PARTY.map(id => slot(`party/${id}`, 'traveler', `Traveler ${id}, standing, full body, facing the viewer.`)),
  ];
  for (const stop of STOPS) {
    for (let stage = 0; stage <= stop.encounters.length; stage++) list.push(slot(`scene/${stop.id}/${stage}`, 'scene', `${stop.title} after ${stage} of ${stop.encounters.length} puzzles.`));
    for (let stage = 1; stage <= stop.encounters.length; stage++) list.push(slot(`scene/${stop.id}/${stage - 1}-${stage}`, 'change', `${stop.title}: the change when “${stop.encounters[stage - 1].title}” is solved.`));
  }
  for (const id of Object.keys(CAST)) for (const [pose, shape] of Object.entries(POSES)) list.push(slot(`keeper/${id}/${pose}`, shape, `${CAST[id].name}, ${pose}.`));
  return list;
}
// Every line a character can say, with the voice ID the game looks up as
// "voice/<id>" in the manifest (an "audio" file) before falling back to the
// browser's voice.
export function voiceLines() {
  const lines = [];
  for (const e of [...STOPS.flatMap(s => s.encounters), ...SIDE]) for (const [kind, text] of Object.entries(e.lines)) lines.push({ id: `${e.id}/${kind}`, speaker: e.speaker, text });
  for (const [id, cast] of Object.entries(CAST)) {
    lines.push({ id: `${id}/hint`, speaker: id, text: cast.hint });
    for (const kind of ['oops', 'beat', 'tie', 'lose', 'gloat']) (cast[kind] || []).forEach((text, i) => lines.push({ id: `${id}/${kind}-${i + 1}`, speaker: id, text }));
  }
  return lines;
}
