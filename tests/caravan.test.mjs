import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt,move,nextHint,isSolved,restart,validBoard} from '../dist/engine.js';
import {freshJourney,startJourney,beginEncounter,recordSolve,withCampaignPuzzles} from '../dist/road.js';
import * as road3 from '../dist/caravan-road3.js';
import * as legacy from '../dist/caravan-legacy.js';
import * as rescue from '../dist/caravan-rescue.js';
import {emptyStore,validateStore,parseBackup,importProfiles} from '../dist/storage.js';
import {caravanHeader} from '../dist/caravan-ui.js';

// Earlier stories (v1 caravan, v2 rescue, v3 lantern road) are archives: their
// saves stay valid and readable while the current road starts fresh.
const pack=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const puzzles=pack.puzzles,all=withCampaignPuzzles(puzzles);
const copy=value=>JSON.parse(JSON.stringify(value));
const profile=(band='k1')=>({id:'one',name:'Explorer',avatar:0,band,sound:false,attempts:{}});
const storeFor=p=>({...emptyStore(),activeProfileId:p.id,profiles:[p]});
function solve(p,initial=freshAttempt(p)){
  let a=initial;
  for(let i=0;!isSolved(p,a.board)&&i<200;i++){
    const h=nextHint(p,a);assert.equal(h.type,'move',p.id);a=move(p,a,h.action||h.pair);assert.ok(a,p.id);
  }
  assert.ok(isSolved(p,a.board),p.id);return {...a,helpUsed:true,hintLevel:3};
}
function finishNext(pr,model){
  const opened=model.beginEncounter(pr,puzzles);assert.ok(opened);
  pr.attempts[opened.puzzle.id]=solve(opened.puzzle,pr.attempts[opened.puzzle.id]||freshAttempt(opened.puzzle));
  assert.equal(model.completeEncounter(pr,opened.puzzle.id,opened.encounter.id,puzzles),true);
  return opened;
}
// One step on the current road (catalog-only pack: the first stops have no proof puzzles).
function roadStep(pr){
  const opened=beginEncounter(pr,puzzles);assert.ok(opened);
  pr.attempts[opened.puzzle.id]=solve(opened.puzzle,pr.attempts[opened.puzzle.id]||freshAttempt(opened.puzzle));
  assert.equal(recordSolve(pr,opened.puzzle.id,opened.encounter.id,puzzles).first,true);
}
function oldRescue(count,route='reeds',preview=true){
  const pr=profile();rescue.startJourney(pr);
  for(let i=0;i<count;i++){
    if(i===2)rescue.chooseRoute(pr,route);
    if(i===3){
      const lift=rescue.beginEncounter(pr,puzzles);
      pr.attempts[lift.puzzle.id]=move(lift.puzzle,freshAttempt(lift.puzzle),{type:'pour',from:0,to:1});
    }
    finishNext(pr,rescue);
  }
  if(count===3&&preview){
    const lift=rescue.beginEncounter(pr,puzzles);
    pr.attempts[lift.puzzle.id]=move(lift.puzzle,freshAttempt(lift.puzzle),{type:'pour',from:0,to:1});
  }
  return pr;
}

test('v3 lantern road saves move into an archive with their boards intact',()=>{
  for(const band of ['k1','23','45'])for(const count of [0,1,3,7,18]){
    const pr=profile(band);road3.startJourney(pr);
    for(let i=0;i<count;i++)finishNext(pr,road3);
    if(count<18){const open=road3.beginEncounter(pr,puzzles);pr.attempts[open.puzzle.id]=freshAttempt(open.puzzle);}
    const original=copy(pr),migrated=parseBackup(JSON.stringify(storeFor(pr)),puzzles).profiles[0];
    assert.deepEqual(pr,original,'input is not mutated');assert.deepEqual(migrated.attempts,original.attempts);
    assert.deepEqual(migrated.roadJourney,original.journey);assert.deepEqual(migrated.journey,freshJourney());
    assert.deepEqual(validateStore(storeFor(migrated),puzzles),storeFor(migrated));
    startJourney(migrated);roadStep(migrated);
    assert.deepEqual(parseBackup(JSON.stringify(storeFor(migrated)),puzzles),storeFor(migrated));
    for(const [id,attempt]of Object.entries(original.attempts))assert.deepEqual(migrated.attempts[id],attempt);
    const imported=importProfiles(emptyStore(),storeFor(migrated),()=> 'new');
    assert.deepEqual(imported.profiles[0].roadJourney,original.journey);
  }
});

test('archived v3 boards stay sealed: no new progress, no unreached boards, no second archive',()=>{
  const pr=profile();road3.startJourney(pr);finishNext(pr,road3);
  const migrated=parseBackup(JSON.stringify(storeFor(pr)),puzzles).profiles[0];
  const future=all.find(p=>p.id==='road-citadel-lanterns-k1');
  const forged=copy(migrated);forged.attempts[future.id]=solve(future);
  assert.throws(()=>validateStore(storeFor(forged),puzzles),/not been reached/);
  for(const mutate of [p=>{delete p.roadJourney;},p=>{p.roadJourney.completed.push('marsh-paths');},p=>{p.roadJourney.version=4;},p=>{p.journey=copy(p.roadJourney);}]){
    const broken=copy(migrated);mutate(broken);assert.throws(()=>validateStore(storeFor(broken),puzzles));
  }
  assert.equal(all.filter(p=>p.campaignVersion===3).length,54);
  assert.equal(all.filter(p=>p.campaignVersion===2).length,3);
  assert.equal(all.filter(p=>!p.campaignOnly).length,puzzles.length);
  assert.equal(withCampaignPuzzles(all),all);
  // Archived boards cannot be resolved into current road puzzles.
  const archivedBoard=all.find(p=>p.id==='road-ferry-cargo-k1');
  assert.equal(archivedBoard.campaignVersion,3);assert.ok(validBoard(archivedBoard,freshAttempt(archivedBoard).board));
});

test('v1 journeys migrate into an archive without changing their catalog attempts',()=>{
  for(const route of ['reeds','ridge'])for(const count of [0,3,4,9,18]){
    const pr=profile();legacy.startJourney(pr);
    for(let i=0;i<count;i++){
      if(i===3)legacy.chooseRoute(pr,route);
      finishNext(pr,legacy);
    }
    const original=copy(pr),migrated=parseBackup(JSON.stringify(storeFor(pr)),puzzles).profiles[0];
    assert.deepEqual(pr,original,'input is not mutated');assert.deepEqual(migrated.attempts,original.attempts);
    assert.deepEqual(migrated.caravanJourney,original.journey);assert.deepEqual(migrated.journey,freshJourney());
    assert.deepEqual(validateStore(storeFor(migrated),puzzles),storeFor(migrated));
    const imported=importProfiles(emptyStore(),storeFor(migrated),()=> 'new');
    imported.profiles[0].caravanJourney.completed.push('different');assert.deepEqual(migrated.caravanJourney,original.journey);
  }
  const untouched=profile();assert.deepEqual(validateStore(storeFor(untouched),puzzles),storeFor(untouched));
});

test('v2 saves retain all attempts, including sealed and earned-pump boards, through import and road play',()=>{
  for(const route of ['reeds','ridge'])for(const count of [0,2,3,4,5,6,7,11]){
    const pr=oldRescue(count,route),original=copy(pr);
    const migrated=parseBackup(JSON.stringify(storeFor(pr)),puzzles).profiles[0];
    assert.deepEqual(pr,original);assert.deepEqual(migrated.attempts,original.attempts);
    assert.deepEqual(migrated.rescueJourney,original.journey);assert.deepEqual(migrated.journey,freshJourney());
    assert.deepEqual(validateStore(storeFor(migrated),puzzles),storeFor(migrated));
    assert.equal(rescue.hasPump({...migrated,journey:migrated.rescueJourney}),count>=5);
    startJourney(migrated);roadStep(migrated);
    assert.deepEqual(validateStore(storeFor(migrated),puzzles),storeFor(migrated));
    for(const [id,attempt]of Object.entries(original.attempts))assert.deepEqual(migrated.attempts[id],attempt);
    const imported=importProfiles(emptyStore(),storeFor(migrated),()=> 'new');
    assert.deepEqual(imported.profiles[0].rescueJourney,original.journey);
  }
});

test('archived rescue capability and archive fields are validated independently of new progress',()=>{
  const pr=oldRescue(3),migrated=parseBackup(JSON.stringify(storeFor(pr)),puzzles).profiles[0];
  const full=all.find(p=>p.id==='rescue-tower-lift');
  const forged=copy(migrated);forged.attempts[full.id]=solve(full);
  assert.throws(()=>validateStore(storeFor(forged),puzzles),'unearned fill/empty cannot enter the sealed archive');
  for(const mutate of [p=>{delete p.rescueJourney;},p=>{p.rescueJourney.completed.push('pump-repair');},p=>{p.rescueJourney.route='unknown';}]){
    const broken=copy(migrated);mutate(broken);assert.throws(()=>validateStore(storeFor(broken),puzzles));
  }
  const both=copy(migrated),old=profile();legacy.startJourney(old);finishNext(old,legacy);
  both.caravanJourney=old.journey;Object.assign(both.attempts,old.attempts);
  assert.deepEqual(validateStore(storeFor(both),puzzles),storeFor(both));
});

test('an untouched v3 road is not archived; a touched one is',()=>{
  const fresh=profile();fresh.journey=road3.freshJourney();
  const migrated=parseBackup(JSON.stringify(storeFor(fresh)),puzzles).profiles[0];
  assert.equal(Object.hasOwn(migrated,'roadJourney'),false);assert.deepEqual(migrated.journey,freshJourney());
  const started=profile();road3.startJourney(started);
  assert.equal(Object.hasOwn(parseBackup(JSON.stringify(storeFor(started)),puzzles).profiles[0],'roadJourney'),false);
  const opened=profile();road3.startJourney(opened);const o=road3.beginEncounter(opened,puzzles);opened.attempts[o.puzzle.id]=freshAttempt(o.puzzle);
  assert.deepEqual(parseBackup(JSON.stringify(storeFor(opened)),puzzles).profiles[0].roadJourney,opened.journey);
});

// The phone top bar folds the explorer's row (name, level, Grown-ups) behind a
// button with their initial; caravan.css shows that button only at 700 px and below.
test('the header has one explorer button that opens the explorer row',()=>{
  const bar=(name,open)=>caravanHeader({...profile(),name},'library',open);
  const closed=bar('Zoë',false);
  assert.match(closed,/<header class="topbar caravan-topbar has-explorer">/);
  assert.match(closed,/data-action="explorer-menu"[^>]*aria-expanded="false" aria-controls="caravan-account" aria-label="Explorer Zoë, puzzle level and Grown-ups"><span class="caravan-avatar">Z<\/span>/);
  assert.match(closed,/<div class="caravan-account" id="caravan-account">/);
  for(const action of ['profiles','change-band','parents-gate','map','library','journal'])assert.equal(closed.split(`data-action="${action}"`).length,2,`${action} appears once`);
  assert.match(bar('Zoë',true),/caravan-topbar has-explorer account-open"[\s\S]*aria-expanded="true"/);
  assert.match(bar(' ella ',false),/<span class="caravan-avatar">E<\/span>/);
  assert.match(bar('👩‍🚀 Ada',false),/<span class="caravan-avatar">👩‍🚀<\/span>/);
  assert.match(bar('<b>',false),/<span class="caravan-avatar">&lt;<\/span>/);
  const none=caravanHeader(null,'journey',true);
  assert.doesNotMatch(none,/explorer-menu|has-explorer|account-open/);
  assert.match(none,/data-action="parents-gate"/);
});
