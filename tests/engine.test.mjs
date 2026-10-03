import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile}from'node:fs/promises';
import {validateContent}from'../scripts/validate-content.mjs';
import {freshAttempt,move,removeTile,undo,restart,isSolved,solveTiles,solveSwaps,nextHint,adjacent,undoToSolvable,validBoard,tilePlacements,tileSize}from'../dist/engine.js';
const {puzzles}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
test('all 222 authored puzzles, source references, solution witnesses and exact swap minima',async()=>assert.equal((await validateContent()).puzzles,222));
test('every witness move is reversible and completion survives replay',()=>{
 for(const p of puzzles.filter(p=>['tile','swap'].includes(p.mechanic))){let a=freshAttempt(p);for(const pair of p.solution){const next=move(p,a,pair);assert.deepEqual(undo(next).board,a.board);assert.equal(undo(next).moves,a.moves);a=next;}assert.equal(a.completed,true);const replay=restart(p,a);assert.equal(replay.completed,true);assert.equal(isSolved(p,replay.board),false);}
});
test('accept alternate tilings, reject wrapping/overlap/corners without mutation',()=>{
 const p=puzzles.find(p=>p.id==='tile-k1-03');let a=freshAttempt(p);const snapshot=JSON.stringify(a);
 assert.equal(move(p,a,[0,3]),null);assert.equal(move(p,a,[1,2]),null);assert.equal(move(p,a,[-1,0]),null);assert.equal(JSON.stringify(a),snapshot);
 for(const solution of [[[0,1],[2,3]],[[0,2],[1,3]]]){a=freshAttempt(p);a=move(p,a,solution[0]);assert.equal(move(p,a,solution[0]),null);a=move(p,a,solution[1]);assert.ok(isSolved(p,a.board));const lifted=removeTile(p,a,0);assert.equal(lifted.board.length,1);assert.deepEqual(undo(lifted).board,a.board);}
 assert.equal(adjacent(3,4,4),false);
});
test('current-position hints remain legal after every single legal starting move',()=>{
 for(const p of puzzles.filter(p=>['tile','swap'].includes(p.mechanic))){const pairs=p.mechanic==='tile'?tilePlacements(p):p.edges;for(const pair of pairs){let a=move(p,freshAttempt(p),pair),hint=nextHint(p,a);if(hint.type==='deadend'){assert.equal(solveTiles(p,a.board),null);const recovered=undoToSolvable(p,a);assert.ok(solveTiles(p,recovered.board));}else if(hint.type==='move'){const path=p.mechanic==='tile'?solveTiles(p,a.board):solveSwaps(p,a.board);for(const pair of path){a=move(p,a,pair);assert.ok(a);}assert.ok(isSolved(p,a.board));}}}
});
test('illegal swap pairs rejected and 120-step undo cap stays consistent',()=>{
 const p=puzzles.find(p=>p.id==='swap-45-06');let a=freshAttempt(p);assert.equal(move(p,a,[0,4]),null);assert.equal(move(p,a,[1,1]),null);
 for(let i=0;i<150;i++)a=move(p,a,p.edges[0]);assert.equal(a.history.length,120);assert.equal(a.history[0].moves,30);for(let i=0;i<120;i++)a=undo(a);assert.equal(a.moves,30);assert.equal(a.history.length,0);
});

const lGarden = {mechanic:'tile', tileShape:'l-tromino', cols:3, rows:2, cells:[0,1,2,3,4,5]};
test('L-trominoes accept exactly the four rotations, in any cell order',()=>{
 const square={...lGarden,cols:2,cells:[0,1,2,3]};
 assert.equal(tilePlacements(square).length,4);
 for(let missing=0;missing<4;missing++){
  const cells=square.cells.filter(c=>c!==missing),p={...square,cells};
  const a=move(p,freshAttempt(p),[...cells].reverse());
  assert.ok(a);assert.ok(isSolved(p,a.board));assert.deepEqual(solveTiles(p,a.board),[]);
 }
});
test('L placements reject straight triples, wrapping, duplicates, overhang, holes and wrong shapes without mutation',()=>{
 const p={...lGarden,rows:3,cells:Array.from({length:9},(_,i)=>i)},a=freshAttempt(p),snapshot=JSON.stringify(a);
 for(const piece of [[0,1,2],[0,3,6],[2,3,5],[0,0,1],[0,1,9],[-1,0,3],[0,1],[0,1,3,4],[0,1,4.5],['0',1,3],null]){
  assert.equal(move(p,a,piece),null);assert.equal(validBoard(p,[piece]),false);
 }
 assert.equal(move({...p,cells:p.cells.filter(c=>c!==3)},a,[0,1,3]),null);
 const placed=move(p,a,[0,1,3]);assert.equal(move(p,placed,[1,2,4]),null);
 assert.equal(JSON.stringify(a),snapshot);
 assert.equal(move({...p,tileShape:'domino'},a,[0,1,3]),null);
 for(const tileShape of ['triangle',null,'']){
  const invalid={...p,tileShape};assert.equal(tileSize(invalid),null);assert.equal(validBoard(invalid,[]),false);assert.equal(solveTiles(invalid),null);
 }
});
test('L current-state solver and hints complete every extendable first move and identify dead ends',()=>{
 let solvable=0,deadends=0;
 for(const piece of tilePlacements(lGarden)){
  let a=move(lGarden,freshAttempt(lGarden),piece);const before=JSON.stringify(a),path=solveTiles(lGarden,a.board),hint=nextHint(lGarden,a);
  assert.equal(JSON.stringify(a),before);
  if(path){
   solvable++;assert.equal(hint.type,'move');assert.ok(move(lGarden,a,hint.pair));
   for(const step of path){a=move(lGarden,a,step);assert.ok(a);}
   assert.ok(isSolved(lGarden,a.board));assert.equal(nextHint(lGarden,a).type,'done');
  }else{
   deadends++;assert.equal(hint.type,'deadend');assert.deepEqual(undoToSolvable(lGarden,a).board,[]);
  }
 }
 assert.equal(solvable,4);assert.equal(deadends,4);
 assert.equal(solveTiles(lGarden,[[0,1,2]]),null);
 const p={...lGarden,cols:4,rows:4,cells:Array.from({length:15},(_,i)=>i+1)};
 let a=freshAttempt(p);for(const piece of solveTiles(p)){a=move(p,a,piece);assert.ok(a);}assert.ok(isSolved(p,a.board));
});
test('alternate L covers, removal from any cell, and undo preserve board and move count',()=>{
 for(const cover of [[[0,1,3],[2,4,5]],[[0,3,4],[1,2,5]]]){
  let a=freshAttempt(lGarden);
  for(const piece of cover){const previous=a;a=move(lGarden,a,piece);assert.deepEqual(undo(a).board,previous.board);assert.equal(undo(a).moves,previous.moves);}
  assert.ok(isSolved(lGarden,a.board));assert.ok(a.completed);
  for(const cell of lGarden.cells){const removed=removeTile(lGarden,a,cell);assert.equal(removed.board.length,1);assert.ok(validBoard(lGarden,removed.board));assert.ok(solveTiles(lGarden,removed.board));assert.deepEqual(undo(removed).board,a.board);assert.equal(undo(removed).moves,a.moves);}
  assert.equal(removeTile(lGarden,a,9),null);
 }
});
test('explicit domino metadata matches the legacy default',()=>{
 const p=puzzles.find(p=>p.id==='tile-k1-03'),explicit={...p,tileShape:'domino'};
 assert.deepEqual(tilePlacements(explicit),tilePlacements(p));assert.deepEqual(solveTiles(explicit),solveTiles(p));
 assert.equal(move(p,freshAttempt(p),[0,1,2]),null);
});
