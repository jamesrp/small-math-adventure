import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {freshAttempt,move,solveTiles,tilePlacements,isSolved,nextHint} from '../dist/engine.js';
import {emptyStore,validateStore,parseBackup,loadStore,importProfiles,SAVE_KEY} from '../dist/storage.js';
import {freshJourney} from '../dist/caravan.js';
const read = async path => JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const {puzzles}=await read('../dist/puzzles.json');
const originals=await read('./fixtures/gardens-v1.json');
const baseline=await read('./fixtures/pack-before-l.json');
const ids=['k1','23','45'].flatMap(b=>['04','08','12'].map(n=>`tile-${b}-${n}`));
test('only the nine selected garden records change; pack order and counts remain fixed',()=>{
 assert.equal(puzzles.length,192);assert.deepEqual(puzzles.map(p=>p.id),baseline.map(p=>p.id));
 assert.deepEqual(puzzles.filter((p,i)=>createHash('sha256').update(JSON.stringify(p)).digest('hex')!==baseline[i].hash).map(p=>p.id),ids);
 for(const band of ['k1','23','45']){const gardens=puzzles.filter(p=>p.band===band&&p.mechanic==='tile');assert.equal(gardens.length,12);assert.equal(gardens.filter(p=>p.tileShape==='l-tromino').length,3);}
});
for(const id of ids)test(`${id}: mandatory Ls, accepted witness, hints and consequential choices`,()=>{
 const p=puzzles.find(p=>p.id===id);assert.equal(p.revision,2);assert.equal(p.tileShape,'l-tromino');
 assert.ok(solveTiles(p));let a=freshAttempt(p);
 for(const t of p.solution){assert.equal(t.length,3);assert.equal(move(p,a,t.slice(0,2)),null);a=move(p,a,t);assert.ok(a);}
 assert.ok(isSolved(p,a.board));
 a=freshAttempt(p);for(let i=0;i<p.cells.length/3;i++){const hint=nextHint(p,a);assert.equal(hint.pair.length,3);a=move(p,a,hint.pair);assert.ok(a);}assert.ok(isSolved(p,a.board));
 assert.ok(tilePlacements(p).some(t=>solveTiles(p,[t])===null),'A legal placement can block completion');
 assert.doesNotMatch(p.instruction,/domino(?!es?)/);assert.equal(originals[id].revision,1);
});
function store(){return {...emptyStore(),activeProfileId:'one',profiles:[{id:'one',name:'Explorer',avatar:0,band:'k1',sound:false,journey:freshJourney(),attempts:{}}]};}
for(const id of ids)test(`${id}: legacy local saves and backups migrate, corrupt input stays rejected`,()=>{
 const old=originals[id],current=puzzles.find(p=>p.id===id);
 for(const mode of ['fresh','partial','completed']){
  const s=store();let a=freshAttempt(old);if(mode!=='fresh')a=move(old,a,old.solution[0]);if(mode==='completed')for(const t of old.solution.slice(1))a=move(old,a,t);
  a={...a,helpUsed:true,hintLevel:2};s.profiles[0].attempts[id]=a;
  const other=puzzles.find(p=>p.id==='tile-k1-01');s.profiles[0].attempts[other.id]=move(other,freshAttempt(other),other.solution[0]);
  s.profiles.push({...structuredClone(s.profiles[0]),id:'two',name:'Second',attempts:{}});
  const original=JSON.stringify(s),migrated=parseBackup(original,puzzles),m=migrated.profiles[0].attempts[id];
  assert.equal(m.revision,2);assert.deepEqual(m.board,[]);assert.deepEqual(m.history,[]);assert.equal(m.moves,0);
  for(const key of ['completed','helpUsed','hintLevel','lastPlayed'])assert.equal(m[key],a[key]);
  const expected=structuredClone(s);expected.profiles[0].attempts[id]=m;assert.deepEqual(migrated,expected);
  assert.deepEqual(loadStore({getItem:k=>k===SAVE_KEY?original:null},puzzles).store,migrated);
  assert.deepEqual(validateStore(migrated,puzzles),migrated);assert.equal(JSON.stringify(s),original);
  const merged=importProfiles(store(),migrated,(()=>{let n=0;return()=>`import-${++n}`;})());assert.equal(merged.profiles.length,3);assert.deepEqual(merged.profiles[1].attempts,migrated.profiles[0].attempts);
 }
 for(const corrupt of [a=>a.board=[[999,1000]],a=>a.board=[[old.cells[0],old.cells[0]]],a=>a.revision=0,a=>a.revision=3,a=>a.moves=-1,a=>a.completed='yes',a=>a.history=[{board:[[999,1000]],moves:0}],a=>a.history[0].moves=9,a=>{a.board=old.solution;a.completed=false;}]){
  const s=store();s.profiles[0].attempts[id]=move(old,freshAttempt(old),old.solution[0]);corrupt(s.profiles[0].attempts[id]);assert.throws(()=>parseBackup(JSON.stringify(s),puzzles));
 }
 const s=store();s.profiles[0].attempts[id]=move(current,freshAttempt(current),current.solution[0]);assert.deepEqual(validateStore(s,puzzles),s);
});
