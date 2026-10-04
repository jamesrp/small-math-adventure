import test from 'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{freshAttempt,move,undo,restart}from'../dist/engine.js';
import{emptyStore,validateStore,parseBackup,importProfiles,loadStore,persistStore,SAVE_KEY,BACKUP_KEY}from'../dist/storage.js';
import{startJourney,beginEncounter,recordSolve as completeEncounter}from'../dist/road.js';
import{nextHint,isSolved}from'../dist/engine.js';
const{puzzles}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const p=puzzles.find(p=>p.id==='swap-k1-01');
function fixture(){const s=emptyStore();s.activeProfileId='one';s.profiles=[{id:'one',name:'Explorer',avatar:0,band:'k1',sound:false,attempts:{}}];return s;}
function memory(){const values=new Map();return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
test('board, hints, undo, assistance and completion round-trip',()=>{
 const s=fixture();s.profiles[0].attempts[p.id]={...move(p,freshAttempt(p),p.edges[0]),hintLevel:2,helpUsed:true};const storage=memory();assert.equal(persistStore(storage,s,puzzles),'');assert.deepEqual(loadStore(storage,puzzles).store,s);const back=undo(s.profiles[0].attempts[p.id]);assert.equal(back.completed,true);assert.equal(back.helpUsed,true);
});
test('import restores new independent profiles; malformed imports do not mutate existing saves',()=>{
 const s=fixture();s.profiles[0].attempts[p.id]=move(p,freshAttempt(p),p.edges[0]);const original=JSON.stringify(s),parsed=parseBackup(original,puzzles);const merged=importProfiles(s,parsed,()=> 'two');assert.equal(s.profiles.length,1);assert.equal(merged.profiles.length,2);assert.equal(merged.profiles[1].id,'two');merged.profiles[1].attempts[p.id].board.reverse();assert.equal(JSON.stringify(s),original);
 for(const invalid of ['broken','{}',JSON.stringify({...s,contentVersion:99}),JSON.stringify({...s,profiles:[s.profiles[0],s.profiles[0]]})])assert.throws(()=>parseBackup(invalid,puzzles));assert.equal(JSON.stringify(s),original);
});
test('reject nonmonotonic histories and invalid saved boards',()=>{
 const s=fixture();s.profiles[0].attempts[p.id]={...freshAttempt(p),moves:3,history:[{board:[1,0],moves:2},{board:[1,0],moves:1}]};assert.throws(()=>validateStore(s,puzzles));s.profiles[0].attempts[p.id]={...freshAttempt(p),board:[0,0]};assert.throws(()=>validateStore(s,puzzles));
});
test('truncated undo stacks remain saveable through undo, resume, and new moves',()=>{
 const s=fixture();let a=freshAttempt(p);for(let i=0;i<130;i++)a=move(p,a,p.edges[0]);
 for(let i=0;i<120;i++){a=undo(a);s.profiles[0].attempts[p.id]=a;assert.doesNotThrow(()=>validateStore(s,puzzles));}
 assert.equal(a.moves,10);assert.equal(a.history.length,0);a=move(p,a,p.edges[0]);s.profiles[0].attempts[p.id]=a;assert.doesNotThrow(()=>validateStore(s,puzzles));
});
test('corrupt primary recovers previous good save; failures are reported without erasing data',()=>{
 const s=fixture(),storage=memory();persistStore(storage,s,puzzles);s.profiles[0].name='New name';persistStore(storage,s,puzzles);storage.setItem(SAVE_KEY,'corrupt');assert.equal(loadStore(storage,puzzles).store.profiles[0].name,'Explorer');assert.ok(loadStore(storage,puzzles).warning);assert.ok(storage.getItem(BACKUP_KEY));const blocked={getItem(){throw Error('Blocked');},setItem(){throw Error('Quota');}};assert.ok(loadStore(blocked,puzzles).warning);assert.ok(persistStore(blocked,s,puzzles));
});
test('optional caravan journeys persist beside old puzzle attempts and corrupt journey data recovers a good backup',()=>{
 const s=fixture(),storage=memory(),pr=s.profiles[0];
 assert.equal(persistStore(storage,s,puzzles),'');
 assert.equal(Object.hasOwn(loadStore(storage,puzzles).store.profiles[0],'journey'),false);
 startJourney(pr);const opened=beginEncounter(pr,puzzles);let a=freshAttempt(opened.puzzle);
 while(!isSolved(opened.puzzle,a.board)){const hint=nextHint(opened.puzzle,a);a=move(opened.puzzle,a,hint.action||hint.pair);}
 pr.attempts[opened.puzzle.id]=a;assert.equal(completeEncounter(pr,opened.puzzle.id,opened.encounter.id,puzzles).first,true);
 assert.equal(persistStore(storage,s,puzzles),'');assert.deepEqual(loadStore(storage,puzzles).store,s);
 assert.equal(persistStore(storage,s,puzzles),'');
 const broken=JSON.parse(storage.getItem(SAVE_KEY));broken.profiles[0].journey.trails.k1.completed.push('tree-lights');storage.setItem(SAVE_KEY,JSON.stringify(broken));
 const restored=loadStore(storage,puzzles);assert.ok(restored.warning);assert.deepEqual(restored.store,s);
});
test('legacy Nim answers migrate to fresh matches without losing discoveries or accepting corrupt saves',()=>{
 const nim=puzzles.find(p=>p.id==='nim-02'),s=fixture();
 const old={...freshAttempt(nim),board:{choice:{pile:2,remove:3}},history:[{board:{choice:null},moves:0}],moves:1,completed:true,helpUsed:true,hintLevel:2};
 s.profiles[0].attempts[nim.id]=old;
 const original=JSON.stringify(s),restored=parseBackup(original,puzzles).profiles[0].attempts[nim.id];
 assert.deepEqual(restored.board,freshAttempt(nim).board);
 assert.deepEqual(restored.history,[]);assert.equal(restored.moves,0);
 assert.equal(restored.completed,true);assert.equal(restored.helpUsed,true);assert.equal(restored.hintLevel,2);assert.equal(restored.lastPlayed,old.lastPlayed);
 assert.equal(JSON.stringify(s),original,'migration leaves its input unchanged');
 const storage=memory();storage.setItem(SAVE_KEY,original);assert.equal(loadStore(storage,puzzles).warning,'');
 assert.deepEqual(loadStore(storage,puzzles).store.profiles[0].attempts[nim.id],restored);
 for(const choice of [{pile:2,remove:6},{pile:'2',remove:3},{pile:1,remove:0}]){
  s.profiles[0].attempts[nim.id]={...old,board:{choice}};assert.throws(()=>parseBackup(JSON.stringify(s),puzzles));
 }
 s.profiles[0].attempts[nim.id]={...old,history:[{board:{choice:{pile:4,remove:1}},moves:0}]};
 assert.throws(()=>validateStore(s,puzzles));
});
test('Nim in-progress matches and opponent replies survive save, reload, undo and replay',()=>{
 const nim=puzzles.find(p=>p.id==='nim-02'),s=fixture(),storage=memory();
 const round=move(nim,freshAttempt(nim),{type:'choose',pile:2,remove:3},()=>0.99);
 s.profiles[0].attempts[nim.id]=round;assert.equal(persistStore(storage,s,puzzles),'');
 const loaded=loadStore(storage,puzzles).store.profiles[0].attempts[nim.id];
 assert.deepEqual(loaded,round);assert.equal(loaded.board.turns.length,2);
 assert.deepEqual(undo(loaded).board,freshAttempt(nim).board);
});
test('balance secrets survive reload and undo; restart draws a fresh secret and clears evidence',()=>{
 const balance=puzzles.find(p=>p.id==='weigh-04'),s=fixture(),storage=memory();
 const start=freshAttempt(balance,()=>0),weighed=move(balance,start,{type:'weigh',left:['A'],right:['B']});
 s.profiles[0].attempts[balance.id]=weighed;
 assert.equal(persistStore(storage,s,puzzles),'');
 const loaded=loadStore(storage,puzzles).store.profiles[0].attempts[balance.id];
 assert.deepEqual(loaded,weighed);
 assert.deepEqual(undo(loaded).board,start.board);
 const reset=restart(balance,{...loaded,completed:true},()=>.99);
 assert.notDeepEqual(reset.board.secret,start.board.secret);assert.equal(reset.completed,true);
 assert.deepEqual(reset.board.observations,[]);assert.deepEqual(reset.history,[]);assert.equal(reset.board.answer,null);
 const forged=structuredClone(s);forged.profiles[0].attempts[balance.id].history[0].board.secret=reset.board.secret;
 assert.throws(()=>validateStore(forged,puzzles),/hidden pebble/);
});
test('legacy balance saves and undo history retain their original secret and evidence',()=>{
 const balance=puzzles.find(p=>p.id==='weigh-01'),s=fixture();
 const start=freshAttempt(balance,()=>.99),weighed=move(balance,start,{type:'weigh',left:['A'],right:['B']});
 delete weighed.board.secret;for(const h of weighed.history)delete h.board.secret;
 s.profiles[0].attempts[balance.id]=weighed;
 const original=JSON.stringify(s),restored=parseBackup(original,puzzles).profiles[0].attempts[balance.id];
 assert.equal(JSON.stringify(s),original);
 assert.deepEqual(restored.board.secret,balance.parameters.fixed_secret);
 assert.deepEqual(restored.history[0].board.secret,balance.parameters.fixed_secret);
 assert.deepEqual(restored.board.observations,weighed.board.observations);
 const storage=memory();storage.setItem(SAVE_KEY,original);
 assert.equal(loadStore(storage,puzzles).warning,'');
 assert.deepEqual(loadStore(storage,puzzles).store.profiles[0].attempts[balance.id],restored);
});
