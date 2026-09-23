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
    case 'toggle':return 'Tap a wire or its button to flip both lanterns at its ends.';
    case 'clock':return (q.mode==='choose_jump'?'Choose a fixed jump, then Ring.':'Enter a bell count, then Ring. Each bell moves every marker.')+' Bell zero is the starting position; passing over a star does not count.';
    case 'billiard':return (q.mode==='predict'?'Choose the corner and bounce count, then Launch.':q.mode==='choose_width'?'Choose the room width, then Launch.':'Choose how far to aim up and right, then Launch.')+' Walls reflect the light; the first corner stops it.';
    case 'route':return 'Tap a labeled junction to follow a road; crossings are not junctions. '+(q.mode==='each_edge_once'?'You may revisit junctions.':'Repeated roads add to the distance.');
    case 'latin':return 'Choose a square and a symbol, then Apply. Dark squares are fixed. Pencil marks keep possibilities; choose the same symbol again to erase a mark.';
    case 'code':return 'Tap each lantern to set 0 or 1, then Check. A match is the same symbol in the same position.';
    case 'nim':return 'Choose one pile and how many pebbles to take. Players alternate; taking the last pebble wins. Each try starts from the original piles.';
    case 'color':return 'Choose a color or shape, then tap a lantern. Crossings do not add links.';
    case 'jug':return (q.source_and_drain?'Fill or empty a jug, or pour between jugs.':'Pour between jugs; no water can be added or removed.')+' A pour stops when its source is empty or its destination is full.';
    case 'weigh':return 'Place pebbles Left, Off, or Right. Put equal numbers on both pans, then Weigh. An answer must be the only possibility left by the observations.';
    default:return p.controls;
  }
}
