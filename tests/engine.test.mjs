import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile}from'node:fs/promises';
import {validateContent}from'../scripts/validate-content.mjs';
import {freshAttempt,move,removeTile,undo,restart,isSolved,solveTiles,solveSwaps,nextHint,adjacent,undoToSolvable}from'../dist/engine.js';
const {puzzles}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
test('all 192 authored puzzles, source references, solution witnesses and exact swap minima',async()=>assert.equal((await validateContent()).puzzles,192));
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
 for(const p of puzzles.filter(p=>['tile','swap'].includes(p.mechanic))){const pairs=p.mechanic==='tile'?p.cells.flatMap(a=>p.cells.filter(b=>a<b&&adjacent(a,b,p.cols)).map(b=>[a,b])):p.edges;for(const pair of pairs){let a=move(p,freshAttempt(p),pair),hint=nextHint(p,a);if(hint.type==='deadend'){assert.equal(solveTiles(p,a.board),null);const recovered=undoToSolvable(p,a);assert.ok(solveTiles(p,recovered.board));}else if(hint.type==='move'){const path=p.mechanic==='tile'?solveTiles(p,a.board):solveSwaps(p,a.board);for(const pair of path){a=move(p,a,pair);assert.ok(a);}assert.ok(isSolved(p,a.board));}}}
});
test('illegal swap pairs rejected and 120-step undo cap stays consistent',()=>{
 const p=puzzles.find(p=>p.id==='swap-45-06');let a=freshAttempt(p);assert.equal(move(p,a,[0,4]),null);assert.equal(move(p,a,[1,1]),null);
 for(let i=0;i<150;i++)a=move(p,a,p.edges[0]);assert.equal(a.history.length,120);assert.equal(a.history[0].moves,30);for(let i=0;i<120;i++)a=undo(a);assert.equal(a.moves,30);assert.equal(a.history.length,0);
});
