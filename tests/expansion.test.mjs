import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt,resumeAttempt,move,nextHint,undo,restart,isSolved,validBoard,undoToSolvable} from '../dist/engine.js';
import {emptyStore,validateStore,parseBackup} from '../dist/storage.js';
import {playView,mapView,parentView,catalogHTML} from '../dist/ui.js';
import {libraryView} from '../dist/caravan-ui.js';
import {publicSourcePath} from '../scripts/import-expansion.mjs';
import {mechanicFor} from '../dist/expansion.js';
const pack=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const puzzles=pack.puzzles,expanded=puzzles.filter(p=>p.band==='all');
function fixture(){return {...emptyStore(),activeProfileId:'test',profiles:[{id:'test',name:'Explorer',avatar:0,band:'k1',sound:false,attempts:{}}]};}
test('source citations preserve repository filenames without host folder paths',()=>{
 assert.equal(publicSourcePath('/host/example/lowell-math-circle-year-2/source/week-02/week-02-k-1.tex'),'lowell-math-circle-year-2/source/week-02/week-02-k-1.tex');
 assert.equal(publicSourcePath('/host/example/plans/week-02-redesign.md'),'plans/week-02-redesign.md');
 assert.equal(publicSourcePath('/host/example/source.pdf'),'source.pdf');
 assert.ok(pack.sources.every(s=>!s.path||!s.path.startsWith('/')));
});
test('difficulty groups expose every expanded puzzle once from every grade trail, with saved completion',()=>{
 for(const band of ['k1','23','45']){
  const profile={...fixture().profiles[0],band,attempts:{'latin-12':{completed:true}}};
  const html=libraryView(profile,puzzles);
  assert.equal((html.match(/data-action="open-puzzle"/g)||[]).length,puzzles.length);
  for(const p of expanded){
   assert.equal(html.split(`data-id="${p.id}"`).length-1,1,p.id);
   const label=p.difficulty_level[0].toUpperCase()+p.difficulty_level.slice(1);
   assert.ok(html.includes(`${p.familyTitle}, ${label}, puzzle ${p.number}`),p.id);
  }
  assert.match(html,/Hard, puzzle 12, completed/);
  for(const label of ['Easy','Medium','Hard'])assert.equal(html.split(`<h2>${label}</h2>`).length-1,10);
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
test('all expansion boards, undo histories, hints, and completion round-trip through real saves',()=>{
 const store=fixture();
 for(const p of expanded){let a=freshAttempt(p);let steps=0;
  while(!isSolved(p,a.board)&&steps++<200){
   const h=nextHint(p,a);assert.equal(h.type,'move',p.id);const next=move(p,a,h.action);assert.ok(next,p.id);
   // A puzzle without Undo (a final first-crossing pick) keeps no history.
   if(mechanicFor(p).noUndo?.(p))assert.equal(next.history.length,0,p.id);else{assert.deepEqual(undo(next).board,a.board);assert.equal(undo(next).moves,a.moves);}
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
 assert.equal((catalogHTML('all',pack,pr).match(/class="puzzle-notes"/g)||[]).length,expanded.length);
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
test('Check again on the balance answer already given changes nothing and is not refused',()=>{
 const p=puzzles.find(p=>p.id==='weigh-01'),a=freshAttempt(p,()=>0),coin=p.parameters.coins.find(c=>c!==a.board.secret[0]);
 const answered=move(p,a,{type:'answer',coin,deviation:a.board.secret[1]});assert.ok(answered);assert.equal(isSolved(p,answered.board),false);
 assert.equal(move(p,answered,{type:'answer',coin,deviation:a.board.secret[1]}),answered,'the same answer again');
 assert.notEqual(move(p,answered,{type:'answer',coin:a.board.secret[0],deviation:a.board.secret[1]}),answered,'another answer is a move');
});
test('a lantern tapped with the colour it already has stays as it is, with no undo step and no refusal',()=>{
 for(const p of puzzles.filter(p=>p.mechanic==='color')){const v=p.parameters.vertices[0],a=move(p,freshAttempt(p),{vertex:v});assert.ok(a,p.id);assert.equal(move(p,a,{vertex:v}),a,`${p.id}: same colour again`);assert.equal(move(p,a,{vertex:v,color:a.board.colors[0]}),a);}
});
// The feedback line under the board, which shows a dead end unasked unless it is quiet.
const feedbackOf=(p,a)=>(playView(p,a,{pack,selected:null,message:''}).match(/<div class="feedback[^"]*"[^>]*>([\s\S]*?)<\/div>/)||[])[1]||'';
test('base dead ends wait behind Hint while a budget remains: Lantern Wires, the Symbol Orchard and the Odd-pebble Balance',()=>{
 // Lantern Wires: a wasted press with presses left is told only behind Hint; with none left, the line says what is wrong.
 const t=puzzles.find(p=>p.id==='toggle-03'),edges=t.parameters.edges.map((_,edge)=>edge);
 const wasted=edges.map(edge=>move(t,freshAttempt(t),{edge})).find(a=>nextHint(t,a).type==='deadend');
 assert.equal(feedbackOf(t,wasted),'','no line while presses remain');
 assert.match(playView(t,{...wasted,hintLevel:1},{pack,selected:null,message:''}),/This picture needs 2 more presses, but only 1 press remains\./);
 let spent=wasted;while(spent.board.presses.length<t.parameters.press_budget)spent=move(t,spent,{edge:edges.find(edge=>!isSolved(t,move(t,spent,{edge}).board))});
 assert.equal(feedbackOf(t,spent),'The lanterns don’t match the goal card. Undo.');
 // Symbol Orchard: a repeat is said once (on the board), and an unfinishable board with no repeat says nothing unasked.
 const l=puzzles.find(p=>p.id==='latin-06');
 const repeat=move(l,freshAttempt(l),{type:'set',cell:0,value:3}),html=playView(l,repeat,{pack,selected:null,message:''});
 assert.equal((html.match(/repeats/g)||[]).length,1,'the repeat line shows once');
 assert.equal(feedbackOf(l,repeat),'');
 const dead=move(l,freshAttempt(l),{type:'set',cell:0,value:1});assert.equal(nextHint(l,dead).type,'deadend');assert.equal(feedbackOf(l,dead),'');
 assert.match(playView(l,{...dead,hintLevel:1},{pack,selected:null,message:''}),/cannot lead to a complete orchard/);
 // Odd-pebble Balance: no line judges the weighings unasked, and none says the observations single out one pebble.
 for(const p of puzzles.filter(p=>p.mechanic==='weigh'))for(const secret of [0,0.5,0.99]){
  let a=freshAttempt(p,()=>secret);
  for(let i=0;i<p.parameters.weighing_budget;i++){
   const coins=[...p.parameters.coins,...p.parameters.known_genuine],n=Math.min(i+1,Math.floor(coins.length/2));
   const left=coins.slice(0,n),right=coins.slice(n,2*n),next=move(p,a,{type:'weigh',left,right});if(!next)break;a=next;
   const h=nextHint(p,a),line=feedbackOf(p,a),html=playView(p,a,{pack,selected:null,message:''});
   if(h.type==='deadend')assert.equal(h.quiet,true,`${p.id}: quiet`);
   assert.equal(line,'',`${p.id}: no unasked line after a weighing`);
   assert.doesNotMatch(html,/single out|\b1 possibilities\b/,`${p.id}`);
  }
 }
});
test('offline precache includes all ten-family modules and styles',async()=>{
 const sw=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');const assets=JSON.parse(sw.match(/const ASSETS=(\[[^;]+\]);/)[1]);
 for(const asset of ['expansion.js','expansion-controls.js','expansion.css',...['motion','networks','deduction','measurement'].flatMap(group=>[group+'.js',group+'.css'])])assert.ok(assets.includes('./'+asset),asset);
});
