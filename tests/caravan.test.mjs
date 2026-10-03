import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt,move,nextHint,isSolved,restart,validBoard} from '../dist/engine.js';
import {COMPANIONS,CHAPTERS,ROUTES,freshJourney,getEncounter,getProgress,puzzleForEncounter,startJourney,chooseRoute,beginEncounter,completeEncounter,validateJourney,hasPump,withCampaignPuzzles,resolvePuzzle,canVisitEncounter} from '../dist/caravan.js';
import * as legacy from '../dist/caravan-legacy.js';
import * as rescue from '../dist/caravan-rescue.js';
import {emptyStore,validateStore,parseBackup,importProfiles} from '../dist/storage.js';

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
function finishNext(pr,model={beginEncounter,completeEncounter}){
  const opened=model.beginEncounter(pr,puzzles);assert.ok(opened);
  pr.attempts[opened.puzzle.id]=solve(opened.puzzle,pr.attempts[opened.puzzle.id]||freshAttempt(opened.puzzle));
  assert.equal(model.completeEncounter(pr,opened.puzzle.id,opened.encounter.id,puzzles),true);
  return opened;
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

test('one route lights six places, keeps the six friends together, and uses every mechanic',()=>{
  assert.deepEqual(CHAPTERS.map(c=>c.id),['ferry','marsh','ridge','workshop','lighthouse','citadel']);
  assert.equal(COMPANIONS.length,6);assert.deepEqual(ROUTES,[]);
  const encounters=CHAPTERS.flatMap(c=>c.encounters);
  assert.equal(encounters.length,18);assert.equal(new Set(encounters.map(e=>e.id)).size,18);
  assert.equal(new Set(encounters.map(e=>e.mechanic)).size,12);
  for(const c of CHAPTERS){
    assert.equal(c.encounters.length,3);assert.equal(c.scene,c.id);
    for(const e of c.encounters){
      assert.ok(e.effect);assert.ok(COMPANIONS.some(friend=>friend.id===e.speaker));
      assert.ok(e.intro.length<120);assert.ok(e.success.length<100);
      assert.equal(getEncounter(e.id),e);
      for(const band of ['k1','23','45'])assert.ok(Number.isInteger(e.selection[band]));
    }
  }
  assert.equal(getEncounter('unknown'),null);assert.equal(chooseRoute(profile(),'ridge'),false);
});

test('all three grade journeys solve, light stops cumulatively, and round-trip every save',()=>{
  for(const band of ['k1','23','45']){
    const pr=profile(band),seen=new Set();startJourney(pr);
    for(let count=0;count<18;count++){
      const {puzzle,encounter}=finishNext(pr);
      assert.ok(!seen.has(puzzle.id),`${band}: each encounter has an independent board`);seen.add(puzzle.id);
      assert.equal(puzzle.band,band);assert.equal(puzzle.campaignVersion,3);
      assert.equal(pr.attempts[puzzle.sourceId],undefined,'campaign completion does not overwrite library completion');
      const progress=getProgress(pr);
      assert.equal(progress.completedCount,count+1);
      assert.deepEqual(progress.litStops,CHAPTERS.slice(0,Math.floor((count+1)/3)).map(c=>c.id));
      assert.deepEqual(progress.party,COMPANIONS.map(c=>c.id));
      assert.equal(progress.needsRoute,false);assert.equal(progress.needsLiftVisit,false);
      assert.deepEqual(parseBackup(JSON.stringify(storeFor(pr)),puzzles),storeFor(pr));
      assert.equal(completeEncounter(pr,puzzle.id,encounter.id,puzzles),false);
    }
    assert.equal(getProgress(pr).complete,true);assert.equal(getProgress(pr).encounter,null);
    assert.equal(getProgress(pr).chapterCompleted,3);
    const before=copy(pr.journey),replay=beginEncounter(pr,puzzles,'ferry-cargo');
    assert.ok(replay);pr.attempts[replay.puzzle.id]=restart(replay.puzzle,pr.attempts[replay.puzzle.id]);
    assert.equal(completeEncounter(pr,replay.puzzle.id,replay.encounter.id,puzzles),false);
    assert.deepEqual(pr.journey,before);assert.doesNotThrow(()=>validateStore(storeFor(pr),puzzles));
    pr.attempts[replay.puzzle.id]=solve(replay.puzzle,pr.attempts[replay.puzzle.id]);
    assert.equal(completeEncounter(pr,replay.puzzle.id,replay.encounter.id,puzzles),false);
  }
});

test('grade changes preserve opened bindings while subsequent encounters use the new grade',()=>{
  const pr=profile();startJourney(pr);const opened=beginEncounter(pr,puzzles);
  pr.attempts[opened.puzzle.id]=freshAttempt(opened.puzzle);pr.band='45';
  assert.equal(beginEncounter(pr,puzzles).puzzle.id,opened.puzzle.id);
  assert.equal(puzzleForEncounter(opened.encounter,pr,puzzles).band,'k1');
  finishNext(pr);const next=beginEncounter(pr,puzzles);assert.equal(next.puzzle.band,'45');
  assert.deepEqual(parseBackup(JSON.stringify(storeFor(pr)),puzzles),storeFor(pr));
});

test('library attempts, sibling encounter saves, and archived puzzles cannot advance the road',()=>{
  const pr=profile();startJourney(pr);const opened=beginEncounter(pr,puzzles),source=puzzles.find(p=>p.id===opened.puzzle.sourceId);
  pr.attempts[source.id]=solve(source);
  assert.equal(completeEncounter(pr,source.id,opened.encounter.id,puzzles),false);
  assert.equal(pr.attempts[opened.puzzle.id],undefined);
  assert.equal(beginEncounter(pr,puzzles,'citadel-lanterns'),null);
  assert.equal(canVisitEncounter(pr,'tower-lift'),false);
  assert.equal(beginEncounter(pr,puzzles,'tower-lift'),null);
  assert.equal(getProgress(pr).completedCount,0);
  const archived=all.find(p=>p.id==='rescue-tower-lift');
  const forged=copy(pr);forged.attempts[archived.id]=solve(archived);
  assert.throws(()=>validateStore(storeFor(forged),puzzles),/not been reached/);
  const future=all.find(p=>p.id==='road-citadel-lanterns-k1');
  const futureSave=copy(pr);futureSave.attempts[future.id]=solve(future);
  assert.throws(()=>validateStore(storeFor(futureSave),puzzles),/not been reached/);
  assert.doesNotThrow(()=>validateStore(storeFor(pr),puzzles));
});

test('invalid ordering, forged bindings and incomplete boards are rejected',()=>{
  const pr=profile();startJourney(pr);finishNext(pr);finishNext(pr);
  for(const mutate of [
    j=>{j.version=99;},j=>{j.started=false;},j=>{j.completed.reverse();},
    j=>{j.completed.push('ferry-lights');},j=>{j.bindings['citadel-water']='road-citadel-water-k1';},
    j=>{j.bindings['ferry-cargo']='swap-k1-03';},j=>{j.bindings['ferry-cargo']='road-workshop-cradles-k1';},
    j=>{delete j.bindings['ferry-cargo'];},j=>{j.bindings.unknown='road-ferry-cargo-k1';}
  ]){const broken=copy(pr);mutate(broken.journey);assert.throws(()=>validateStore(storeFor(broken),puzzles));}
  const opened=beginEncounter(pr,puzzles);pr.attempts[opened.puzzle.id]=freshAttempt(opened.puzzle);
  pr.attempts[opened.puzzle.id].completed=true;
  assert.equal(completeEncounter(pr,opened.puzzle.id,opened.encounter.id,puzzles),false,'historical completion is insufficient after restarting');
  assert.throws(()=>validateJourney(null,pr,puzzles));
  const unstarted=profile();unstarted.journey=freshJourney();unstarted.journey.bindings['ferry-cargo']='road-ferry-cargo-k1';
  assert.throws(()=>validateStore(storeFor(unstarted),puzzles));
});

test('road jug operations come from the instance, with no inherited pump gate',()=>{
  for(const band of ['k1','23','45'])for(const id of ['marsh-water','citadel-water']){
    const pr=profile(band),p=puzzleForEncounter(getEncounter(id),pr,puzzles);
    assert.equal(resolvePuzzle(p,pr),p);assert.equal(p.requiresAbility,undefined);assert.equal(p.missingAbility,undefined);
    const a=freshAttempt(p);assert.ok(validBoard(p,a.board));
    if(p.parameters.source_and_drain)assert.ok(move(p,a,{type:'fill',jug:0}));
    else assert.equal(move(p,a,{type:'fill',jug:0}),null);
    assert.ok(solve(p).completed);assert.equal(hasPump(pr),false);
  }
  assert.equal(all.filter(p=>p.campaignVersion===3).length,54);
  assert.equal(all.filter(p=>p.campaignVersion===2).length,3);
  assert.equal(all.filter(p=>!p.campaignOnly).length,puzzles.length);
  assert.equal(withCampaignPuzzles(all),all);
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
    startJourney(migrated);finishNext(migrated);
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
