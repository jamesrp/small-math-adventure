import test from 'node:test';
import assert from 'node:assert/strict';
import {lPreview, tileInstructions} from '../dist/tile-controls.js';
import {validTile} from '../dist/engine.js';
import {puzzleObjective, visiblePuzzleObjective} from '../dist/puzzle-copy.js';
const p={mechanic:'tile',tileShape:'l-tromino',rows:4,cols:4,cells:Array.from({length:16},(_,i)=>i)};
test('L preview rotates around the elbow and rejects overlap, holes and row wrapping',()=>{
 const shapes=new Set();
 for(let r=0;r<4;r++) {const preview=lPreview(p,[],5,r);assert.equal(preview.valid,true);assert.equal(validTile(p,preview.cells),true);assert.equal(preview.cells[0],5);shapes.add([...preview.cells].sort().join(','));}
 assert.equal(shapes.size,4);
 assert.equal(lPreview(p,[[0,1,4]],5,2).valid,false);
 assert.equal(lPreview({...p,cells:p.cells.filter(c=>c!==6)},[],5,0).valid,false);
 assert.equal(lPreview(p,[],3,0).valid,false);
 assert.equal(lPreview(p,[],0,2).valid,false);
 assert.equal(lPreview(p,[],null,0).valid,false);
});
test('tile Help and read-aloud use the configured shape without a duplicate visible objective',()=>{
 assert.match(tileInstructions(p),/three squares/);assert.doesNotMatch(tileInstructions(p),/domino|two neighboring/);
 assert.match(puzzleObjective(p),/L-trominoes/);assert.equal(visiblePuzzleObjective(p),'');
 assert.match(tileInstructions({...p,tileShape:undefined}),/two neighboring/);
 assert.match(puzzleObjective({...p,tileShape:undefined}),/dominoes/);
});

test('L renderer paints only occupied cells and exposes every hinted coordinate',async()=>{
 const {playView}=await import('../dist/ui.js');
 const {freshAttempt,move}=await import('../dist/engine.js');
 const fixture={...p,rows:2,cols:3,cells:[0,1,2,3,4,5],id:'fixture',band:'k1',number:1,hints:['Start at an edge.']};
 const context={pack:{puzzles:[fixture]},profile:{},selected:null,tileRotation:0};
 const attempt=move(fixture,freshAttempt(fixture),[0,1,3]);
 const rendered=playView(fixture,{...attempt,hintLevel:2},context);
 assert.equal((rendered.match(/garden-l-cell/g)||[]).length,3);
 assert.equal((rendered.match(/ hinted/g)||[]).length,3);
 for(const label of ['row 1, column 3','row 2, column 2','row 2, column 3'])assert.ok(rendered.includes(label));
 assert.ok(!rendered.includes('puzzle-goal'));
 const invalid=playView(fixture,freshAttempt(fixture),{...context,selected:2});
 assert.match(invalid,/data-action="place-tile"[^>]*disabled/);
 assert.match(invalid,/blocked L preview/);
});
