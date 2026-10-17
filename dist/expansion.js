import {motionMechanics} from './motion.js';
import {networkMechanics} from './networks.js';
import {deductionMechanics} from './deduction.js';
import {measurementMechanics} from './measurement.js';
import {FAMILIES} from './families.js';
// The ten base expansion mechanics, then every module on the family seam.
export const expansionMechanics=Object.assign({...motionMechanics,...networkMechanics,...deductionMechanics,...measurementMechanics},...FAMILIES.map(m=>m.mechanics));
export const isExpansion=p=>Boolean(p&&Object.hasOwn(expansionMechanics,p.mechanic));
export const mechanicFor=p=>expansionMechanics[p.mechanic];
// Short, instance-aware control instructions for the child-facing guide.
export function playInstructions(p){
  const q=p.parameters;
  switch(p.mechanic){
    case 'toggle':return 'Tap a wire to flip both lanterns at its ends. With a keyboard, Tab to a wire and press Enter or Space.';
    case 'clock':return (q.mode==='choose_jump'?'Tap a place or drag the red arrow to choose a jump, then Ring.':'Choose a bell count, then Ring.')+' The red arrow shows one clockwise jump; after Ring, red arrows trace each jump. Bell zero is the starting position; passing over a star does not count.';
    case 'billiard':return 'The ball rolls straight from the bottom-left corner and bounces off each wall like light in a mirror. Each wall it hits is one bounce; the first corner it reaches stops it. '+(q.mode==='cross'?'Tap a crossing on the sheet of copies of the room. At the right one, the rooms the line passed fold into the path.':q.mode==='aim'?'Tap a crossing on the sheet of copies of the room to aim at it, then Launch.':q.mode==='every'?'Drag the room’s corner and Launch to test it. Keep each room that works; press That’s all when you have them all.':'Drag the room’s corner, then Launch. If no room works, launch one, press Can’t and tap '+(q.target.bounces===undefined?'a copy of the goal corner, then the corner the ball reaches first on the way there.':'every copy corner where a ball could stop after that many bounces, then That’s all.'))+' Arrow keys move the corner or the dots; Enter taps.';
    case 'route':return 'Tap a labeled junction to follow a road; crossings are not junctions. '+(q.mode==='each_edge_once'?'You may revisit junctions.':'Repeated roads add to the distance.');
    case 'latin':return 'Tap a square, then a number to mark it. Dark squares are fixed. Clear erases the selected square. You can also type numbers or press Delete.';
    case 'code':return 'Choose 0 or 1 in each position, then Check. A match is the same symbol in the same position.';
    case 'nim':return 'Tap a pebble to choose how many to take, then Take. The opponent replies automatically. Take the last pebble to win. Undo takes back your move and the reply.';
    case 'color':return 'Choose a color or shape, then tap a lantern. Crossings do not add links.';
    case 'jug':return (q.source_and_drain?'Fill or empty a jug, or pour between jugs.':'Pour between jugs; no water can be added or removed.')+' A pour stops when its source is empty or its destination is full.';
    case 'weigh':return 'Place pebbles Left, Off, or Right. Put equal numbers on both pans, then Weigh. An answer must be the only possibility left by the observations.';
    default:return p.controls;
  }
}
