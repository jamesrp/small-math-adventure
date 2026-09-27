import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt,resumeAttempt,move,nextHint,undo,restart,isSolved,validBoard,undoToSolvable} from '../dist/engine.js';
import {emptyStore,validateStore,parseBackup} from '../dist/storage.js';
import {playView,mapView,parentView,catalogHTML} from '../dist/ui.js';
import {libraryView} from '../dist/caravan-ui.js';
const pack=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const puzzles=pack.puzzles,expanded=puzzles.filter(p=>p.band==='all');
function fixture(){return {...emptyStore(),activeProfileId:'test',profiles:[{id:'test',name:'Explorer',avatar:0,band:'k1',sound:false,attempts:{}}]};}
test('difficulty groups expose every expanded puzzle once from every grade trail, with saved completion',()=>{
 for(const band of ['k1','23','45']){
  const profile={...fixture().profiles[0],band,attempts:{'latin-12':{completed:true}}};
  const html=libraryView(profile,puzzles);
  assert.equal((html.match(/data-action="open-puzzle"/g)||[]).length,192);
  for(const p of expanded){
   assert.equal(html.split(`data-id="${p.id}"`).length-1,1,p.id);
   const label=p.difficulty_level[0].toUpperCase()+p.difficulty_level.slice(1);
   assert.ok(html.includes(`${p.familyTitle}, ${label}, puzzle ${p.number}`),p.id);
  }
  assert.match(html,/Hard, puzzle 12, completed/);
  for(const label of ['Easy','Medium','Hard'])assert.equal(html.split(`<h3>${label}</h3>`).length-1,10);
 }
});
test('every solved puzzle reopens fresh with completion retained; unfinished reattempts still resume',()=>{
 for(const p of puzzles){
  let a=freshAttempt(p,()=>0);
  for(let i=0;!isSolved(p,a.board)&&i<200;i++){const h=nextHint(p,a);a=move(p,a,h.action||h.pair,()=>0);}
  assert.ok(isSolved(p,a.board),p.id);
  a={...a,hintLevel:3,helpUsed:true};
  const original=JSON.stringify(a),reopened=resumeAttempt(p,a,()=>.99);
  assert.deepEqual(reopened.board,freshAttempt(p,()=>.99).board,p.id);
  assert.equal(reopened.completed,true);assert.equal(reopened.helpUsed,true);
  assert.equal(reopened.moves,0);assert.equal(reopened.hintLevel,0);assert.deepEqual(reopened.history,[]);
  assert.equal(JSON.stringify(a),original,'opening does not mutate the completed attempt');
  assert.equal(resumeAttempt(p,reopened),reopened,'an unfinished reattempt is not reset');
  for(const encounter of [null,{id:'revisit'}]){
   const html=playView(p,reopened,{pack,selected:null,message:'',encounter});
   assert.match(html,/class="solved-indicator"/);assert.doesNotMatch(html,/id="completion-heading"|previous-discovery|known-discovery/);
   assert.match(html,/data-action="restart"/);assert.match(html,/Puzzle play area/);
  }
 }
});
test('all 120 expansion boards, undo histories, hints, and completion round-trip through real saves',()=>{
 const store=fixture();
 for(const p of expanded){let a=freshAttempt(p);let steps=0;
  while(!isSolved(p,a.board)&&steps++<200){
   const h=nextHint(p,a);assert.equal(h.type,'move',p.id);const next=move(p,a,h.action);assert.ok(next,p.id);assert.deepEqual(undo(next).board,a.board);assert.equal(undo(next).moves,a.moves);
   a={...next,hintLevel:3,helpUsed:true};store.profiles[0].attempts[p.id]=a;
   assert.deepEqual(parseBackup(JSON.stringify(store),puzzles).profiles[0].attempts[p.id],a,p.id);
  }
  assert.ok(isSolved(p,a.board));assert.ok(a.completed);const replay=restart(p,a);assert.ok(replay.completed);assert.ok(replay.helpUsed);assert.equal(replay.history.length,0);assert.ok(!isSolved(p,replay.board));
  store.profiles[0].attempts[p.id]=replay;assert.doesNotThrow(()=>validateStore(store,puzzles));
 }
});
test('legacy version-one saves retain their boards and completions in the additive pack',()=>{
 const store=fixture(),p=puzzles.find(p=>p.id==='swap-k1-01');store.profiles[0].attempts[p.id]=move(p,freshAttempt(p),p.solution[0]);
 assert.deepEqual(parseBackup(JSON.stringify(store),puzzles),store);
});
test('every new board validator rejects corrupt data before import mutates anything',()=>{
 const store=fixture();
 for(const p of expanded){for(const board of [null,[],{},'board',42]){assert.equal(validBoard(p,board),false,p.id);store.profiles[0].attempts={[p.id]:{...freshAttempt(p),board}};assert.throws(()=>validateStore(store,puzzles));}}
});
test('all family boards and notes render from real authored content with accessible controls',()=>{
 const store=fixture(),pr=store.profiles[0],map=mapView(pr,puzzles);
 for(const p of expanded){assert.ok(map.includes(`data-id="${p.id}"`));const html=playView(p,freshAttempt(p),{pack,selected:null,message:''});assert.ok(html.includes(p.familyTitle));assert.ok(html.includes('Puzzle play area'));assert.ok(!html.includes('undefined'),p.id);assert.ok(!html.includes('NaN'),p.id);assert.match(html,/<button/);}
 assert.equal((catalogHTML('all',pack,pr).match(/class="puzzle-notes"/g)||[]).length,120);
 assert.ok(parentView(store,pr,pack).includes('<h2>Puzzle notes</h2>'));
});
test('route dead-end rescue undoes only as far as an extendable position',()=>{
 const p=puzzles.find(p=>p.id==='route-03'),a=move(p,freshAttempt(p),{vertex:'D'});assert.equal(nextHint(p,a).type,'deadend');const rescued=undoToSolvable(p,a);assert.deepEqual(rescued.board,freshAttempt(p).board);assert.equal(nextHint(p,rescued).type,'move');
});
test('runtime expansion preserves every checked parameter set and witness from authoring data',async()=>{
 for(const group of ['motion','networks','deduction','measurement']){const spec=JSON.parse(await readFile(new URL(`../docs/puzzle-expansion/${group}.json`,import.meta.url),'utf8'));for(const family of spec.families)for(const instance of family.instances){const runtime=puzzles.find(p=>p.id===instance.id);assert.deepEqual(runtime.parameters,instance.parameters);assert.deepEqual(runtime.solution,instance.solution);assert.equal(runtime.mechanic,family.id);assert.ok(runtime.prerequisites);}}
});
test('selecting the active palette does not create an undo step; malformed colors are not coerced',()=>{
 const p=puzzles.find(p=>p.id==='color-01'),a=freshAttempt(p);assert.equal(move(p,a,{type:'palette',color:1}),a);
 assert.equal(move(p,a,{vertex:'A',color:true}),null);assert.equal(move(p,a,{vertex:'A',color:null}),null);
});
test('offline precache includes all ten-family modules and styles',async()=>{
 const sw=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');const assets=JSON.parse(sw.match(/const ASSETS=(\[[^;]+\]);/)[1]);
 for(const asset of ['expansion.js','expansion-controls.js','expansion.css',...['motion','networks','deduction','measurement'].flatMap(group=>[group+'.js',group+'.css'])])assert.ok(assets.includes('./'+asset),asset);
});
