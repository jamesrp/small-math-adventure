import {motionMechanics} from './motion.js';
import {networkMechanics} from './networks.js';
import {deductionMechanics} from './deduction.js';
import {measurementMechanics} from './measurement.js';
export const expansionMechanics={...motionMechanics,...networkMechanics,...deductionMechanics,...measurementMechanics};
export const isExpansion=p=>Boolean(p&&Object.hasOwn(expansionMechanics,p.mechanic));
export const mechanicFor=p=>expansionMechanics[p.mechanic];
// Short, instance-aware control instructions for the child-facing guide.
export function playInstructions(p){
  const q=p.parameters;
  switch(p.mechanic){
    case 'toggle':return 'Tap a wire to flip both lanterns at its ends. With a keyboard, Tab to a wire and press Enter or Space.';
    case 'clock':return (q.mode==='choose_jump'?'Choose a fixed jump, then Ring.':'Enter a bell count, then Ring. Each bell moves every marker.')+' Bell zero is the starting position; passing over a star does not count.';
    case 'billiard':return (q.mode==='predict'?'Choose the corner and bounce count, then Launch.':q.mode==='choose_width'?'Choose the room width, then Launch.':'Choose how far to aim up and right, then Launch.')+' Walls reflect the light; the first corner stops it.';
    case 'route':return 'Tap a labeled junction to follow a road; crossings are not junctions. '+(q.mode==='each_edge_once'?'You may revisit junctions.':'Repeated roads add to the distance.');
    case 'latin':return 'Tap a square, then a number to mark it. Dark squares are fixed. Clear erases the selected square. You can also type numbers or press Delete.';
    case 'code':return 'Tap each lantern to set 0 or 1, then Check. A match is the same symbol in the same position.';
    case 'nim':return 'Take any positive number from one pile. The opponent replies automatically. Take the last pebble to win. Undo takes back your move and the reply.';
    case 'color':return 'Choose a color or shape, then tap a lantern. Crossings do not add links.';
    case 'jug':return (q.source_and_drain?'Fill or empty a jug, or pour between jugs.':'Pour between jugs; no water can be added or removed.')+' A pour stops when its source is empty or its destination is full.';
    case 'weigh':return 'Place pebbles Left, Off, or Right. Put equal numbers on both pans, then Weigh. An answer must be the only possibility left by the observations.';
    default:return p.controls;
  }
}
