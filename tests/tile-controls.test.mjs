import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyTileCells, extendTileStroke, lPreview, startTileStroke, tapTileSelection, tileInstructions, tileStrokeTarget} from '../dist/tile-controls.js';
import {solveTiles, tilePlacements, validTile} from '../dist/engine.js';
import {puzzleObjective, visiblePuzzleObjective} from '../dist/puzzle-copy.js';
const p={mechanic:'tile',tileShape:'l-tromino',rows:4,cols:4,cells:Array.from({length:16},(_,i)=>i)};
const domino={...p,tileShape:undefined};
const permutations=cells=>cells.length===1?[cells]:cells.flatMap((cell,i)=>permutations(cells.filter((_,j)=>j!==i)).map(rest=>[cell,...rest]));

test('every L orientation and tap order, including diagonal first, completes',()=>{
 const square=[5,6,9,10];
 const orientations=square.map(missing=>square.filter(cell=>cell!==missing));
 assert.equal(orientations.length,4);
 assert.ok(orientations.every(piece=>tilePlacements(p).some(placement=>piece.every(cell=>placement.includes(cell)))));
 for(const piece of orientations)for(const order of permutations(piece)){
  let selection={cells:[],status:'extendable'};
  for(const cell of order)selection=tapTileSelection(p,[],selection.cells,cell);
  assert.equal(selection.status,'complete',order.join(','));
  assert.deepEqual(new Set(selection.cells),new Set(piece));
 }
 assert.equal(tapTileSelection(p,[],[5],10).status,'extendable'); // diagonal pair
});

test('tap toggles selected cells and restarts incompatible selections silently',()=>{
 assert.deepEqual(tapTileSelection(p,[],[0,1],1),{cells:[0],status:'extendable'});
 assert.deepEqual(tapTileSelection(p,[],[0,1],2),{cells:[2],status:'extendable'}); // straight triple
 assert.deepEqual(tapTileSelection(p,[],[0,1],15),{cells:[15],status:'extendable'});
 for(const order of [[5,6],[6,5]]){
  let selection=[];
  for(const cell of order)selection=tapTileSelection(domino,[],selection,cell).cells;
  assert.equal(classifyTileCells(domino,[],selection),'complete');
 }
 assert.deepEqual(tapTileSelection(domino,[],[5],5),{cells:[],status:'extendable'});
 assert.deepEqual(tapTileSelection(domino,[],[5],7),{cells:[7],status:'extendable'});
 const isolated={...domino,rows:2,cols:3,cells:[0,1,2,3,4,5]};
 assert.equal(classifyTileCells(isolated,[[1,2],[3,4]],[0]),'blocked');
});

test('strokes accumulate distinct cells and cannot recover after invalidation',()=>{
 for(const path of [[1,0,4],[0,1,0,4]]){
  let stroke=startTileStroke(p,[],path[0]);
  for(const cell of path.slice(1))stroke=extendTileStroke(p,[],stroke,cell);
  assert.deepEqual(new Set(stroke.cells),new Set([0,1,4]));
  assert.equal(stroke.status,'complete');
 }
 let stroke=startTileStroke(domino,[],5);
 stroke=extendTileStroke(domino,[],stroke,6);
 stroke=extendTileStroke(domino,[],stroke,5);
 assert.deepEqual(stroke,{cells:[5,6],status:'complete'});
 for(const [board,path] of [ [[],[0,1,2]], [[],[0,1,4,5]], [[],[0,-1,1,4]], [[[1,2,6]],[0,1,4]], [[],[0,1,6]] ]){
  let next=startTileStroke(p,board,path[0]);
  for(const cell of path.slice(1))next=extendTileStroke(p,board,next,cell);
  assert.equal(next.status,'blocked',path.join(','));
  assert.equal(extendTileStroke(p,board,next,path[0]).status,'blocked');
 }
 const hole={...p,cells:p.cells.filter(cell=>cell!==4)};
 assert.equal(extendTileStroke(hole,[],startTileStroke(hole,[],0),4).status,'blocked');
 assert.equal(extendTileStroke(p,[],startTileStroke(p,[],0),null).status,'extendable');
});

test('a legal piece is complete even when it strands the garden',()=>{
 const small={...p,rows:2,cols:3,cells:[0,1,2,3,4,5]};
 assert.equal(solveTiles(small,[[1,3,4]]),null);
 assert.equal(classifyTileCells(small,[],[1,3,4]),'complete');
});

test('stroke hit testing uses central 60% and leaves gutters neutral',()=>{
 const board={left:0,top:0,right:210,bottom:100};
 const rects=[{cell:0,rect:{left:0,top:0,right:100,bottom:100,width:100,height:100}},
  {cell:1,rect:{left:110,top:0,right:210,bottom:100,width:100,height:100}}];
 assert.equal(tileStrokeTarget(board,rects,50,50),0);
 assert.equal(tileStrokeTarget(board,rects,130,50),1);
 assert.equal(tileStrokeTarget(board,rects,125,19),null);
 assert.equal(tileStrokeTarget(board,rects,105,50),null);
 assert.equal(tileStrokeTarget(board,rects,211,50),-1);
 const four={left:0,top:0,right:205,bottom:205};
 const squareRects=[0,1,2,3].map(cell=>({cell,rect:{
  left:(cell%2)*105,top:Math.floor(cell/2)*105,
  right:(cell%2)*105+100,bottom:Math.floor(cell/2)*105+100,width:100,height:100
 }}));
 assert.equal(tileStrokeTarget(four,squareRects,101,101),null); // grazed corner
 assert.equal(tileStrokeTarget(four,squareRects,155,155),3); // deliberate entry
 assert.equal(tileStrokeTarget(four,squareRects,155,50),1);
});
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
