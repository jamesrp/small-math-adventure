import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt,move,nextHint,isSolved,restart,undo,validBoard} from '../dist/engine.js';
import {COMPANIONS,CHAPTERS,ROUTES,freshJourney,getEncounter,getProgress,puzzleForEncounter,startJourney,chooseRoute,beginEncounter,completeEncounter,validateJourney,hasPump,withCampaignPuzzles,resolvePuzzle,canVisitEncounter} from '../dist/caravan.js';
import * as legacy from '../dist/caravan-legacy.js';
import {emptyStore,validateStore,parseBackup,importProfiles} from '../dist/storage.js';
import {libraryView,journalView} from '../dist/caravan-ui.js';
import {playView} from '../dist/ui.js';

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
function finishNext(pr){
  const opened=beginEncounter(pr,puzzles);assert.ok(opened);
  pr.attempts[opened.puzzle.id]=solve(opened.puzzle,pr.attempts[opened.puzzle.id]||freshAttempt(opened.puzzle));
  assert.equal(completeEncounter(pr,opened.puzzle.id,opened.encounter.id,puzzles),true);
  return opened;
}
function atLift(band='k1',route='reeds'){
  const pr=profile(band);startJourney(pr);finishNext(pr);finishNext(pr);
  assert.equal(chooseRoute(pr,route),true);finishNext(pr);
  assert.equal(getProgress(pr).needsLiftVisit,true);
  const opened=beginEncounter(pr,puzzles);assert.equal(opened.encounter.id,'tower-lift');
  pr.attempts[opened.puzzle.id]=freshAttempt(opened.puzzle);return {pr,...opened};
}

test('rescue has three acts, an earned ally, and a real persistent capability',()=>{
  assert.equal(CHAPTERS.length,3);assert.equal(COMPANIONS.length,6);
  assert.equal(new Set(CHAPTERS.flatMap(c=>c.encounters.map(e=>e.id))).size,11);
  for(const route of ROUTES)for(const chapter of CHAPTERS)for(const e of chapter.encounters){
    const authored=getEncounter(e.id,{...freshJourney(),route:route.id});
    for(const text of [authored.title,authored.intro,authored.success,authored.keepsake.text])assert.ok(text.length>5);
    assert.ok(COMPANIONS.some(c=>c.id===authored.speaker));
  }
  assert.match(getEncounter('escape-ballast',{route:'reeds',completed:[]}).success,/Luma/);
  assert.match(getEncounter('escape-ballast',{route:'ridge',completed:[]}).success,/Bracken/);
  assert.equal(getEncounter('unknown'),null);
});

test('both routes and every band complete with live solves, distinct bindings and save round trips',()=>{
  for(const band of ['k1','23','45'])for(const route of ROUTES){
    const pr=profile(band),seen=new Set();startJourney(pr);
    for(let count=0;count<11;count++){
      if(count===2){assert.equal(beginEncounter(pr,puzzles),null);assert.equal(chooseRoute(pr,route.id),true);}
      if(count===3){
        assert.equal(getProgress(pr).needsLiftVisit,true);
        assert.equal(beginEncounter(pr,puzzles,'workshop-lock'),null);
        const preview=beginEncounter(pr,puzzles);assert.equal(preview.puzzle.missingAbility,'pump');
        pr.attempts[preview.puzzle.id]=freshAttempt(preview.puzzle);
        assert.equal(completeEncounter(pr,preview.puzzle.id,'tower-lift',puzzles),false);
      }
      const {puzzle,encounter}=finishNext(pr);
      assert.ok(!seen.has(puzzle.id),`${route.id}/${band}: distinct encounter`);seen.add(puzzle.id);
      assert.equal(getProgress(pr).completedCount,count+1);
      assert.equal(hasPump(pr),count>=4);
      assert.equal(getProgress(pr).party.includes('fern'),count>=8);
      assert.deepEqual(parseBackup(JSON.stringify(storeFor(pr)),puzzles),storeFor(pr));
      assert.equal(completeEncounter(pr,puzzle.id,encounter.id,puzzles),false);
    }
    assert.equal(getProgress(pr).complete,true);assert.equal(getProgress(pr).encounter,null);
    const before=copy(pr.journey),replay=beginEncounter(pr,puzzles,'tower-lift');
    assert.equal(replay.puzzle.parameters.source_and_drain,true);
    pr.attempts[replay.puzzle.id]=restart(replay.puzzle,pr.attempts[replay.puzzle.id]);
    assert.equal(completeEncounter(pr,replay.puzzle.id,replay.encounter.id,puzzles),false);
    assert.deepEqual(pr.journey,before);assert.doesNotThrow(()=>validateStore(storeFor(pr),puzzles));
  }
});

test('the sealed lift is mathematically impossible, never suggests retrying, and rejects pump moves',()=>{
  const {pr,puzzle:p}=atLift();
  const queue=[freshAttempt(p)],seen=new Set();
  for(let i=0;i<queue.length;i++){
    const a=queue[i],key=a.board.amounts.join(',');if(seen.has(key))continue;seen.add(key);
    assert.equal(isSolved(p,a.board),false);assert.equal(nextHint(p,a).type,'equipment');
    assert.match(nextHint(p,a).text,/pump/);assert.doesNotMatch(nextHint(p,a).text,/Undo|start again/);
    for(let j=0;j<2;j++){
      for(const type of ['fill','empty'])assert.equal(move(p,a,{type,jug:j}),null);
      const next=move(p,a,{type:'pour',from:j,to:1-j});if(next)queue.push(next);
    }
  }
  assert.deepEqual([...seen].sort(),['2,3','5,0']);
  const a=move(p,pr.attempts[p.id],{type:'pour',from:0,to:1});pr.attempts[p.id]=a;
  assert.doesNotThrow(()=>validateStore(storeFor(pr),puzzles));
  const html=playView(p,a,{pack,profile:pr,encounter:getEncounter('tower-lift',pr.journey)});
  assert.match(html,/Find the workshop/);assert.doesNotMatch(html,/data-move="[^\"]*(?:fill|empty)/);
});

test('earning the pump expands the same saved lift, preserving moves, history and grade binding',()=>{
  const {pr,puzzle:sealed}=atLift();
  pr.attempts[sealed.id]=move(sealed,pr.attempts[sealed.id],{type:'pour',from:0,to:1});
  const before=copy(pr.attempts[sealed.id]);
  finishNext(pr);finishNext(pr);assert.equal(hasPump(pr),true);
  assert.equal(canVisitEncounter(pr,'tower-lift'),false,'try the pump before returning');
  assert.deepEqual(pr.attempts[sealed.id],before);
  finishNext(pr);pr.band='45';
  const opened=beginEncounter(pr,puzzles);assert.equal(opened.puzzle.id,sealed.id);
  assert.equal(opened.puzzle.parameters.source_and_drain,true);
  assert.equal(validBoard(opened.puzzle,before.board),true);
  assert.ok(move(opened.puzzle,before,{type:'empty',jug:1}));
  const restored=parseBackup(JSON.stringify(storeFor(pr)),puzzles).profiles[0];
  assert.deepEqual(restored.attempts[sealed.id],before);assert.equal(hasPump(restored),true);
  finishNext(pr);assert.equal(getProgress(pr).encounter.id,'fern-message');
  pr.attempts[sealed.id]=undo(pr.attempts[sealed.id]);
  assert.doesNotThrow(()=>validateStore(storeFor(pr),puzzles));
});

test('custom witnesses solve the pump instances with the claimed shortest paths',()=>{
  for(const p of all.filter(p=>p.campaignOnly)){
    let a=freshAttempt(p);assert.equal(nextHint(p,a).remaining,p.solution.minimum_moves);
    for(const [type,first,second]of p.solution.moves)a=move(p,a,type==='pour'?{type,from:first,to:second}:{type,jug:first});
    assert.ok(a&&isSolved(p,a.board),p.id);
  }
  assert.equal((libraryView(profile(),all).match(/data-action="open-puzzle"/g)||[]).length,192);
});

test('new capabilities cannot be forged by free play, save flags, or a future encounter binding',()=>{
  const {pr}=atLift();finishNext(pr);
  const cases=[
    j=>{j.version=99;},j=>{j.started=false;},j=>{j.route='other';},j=>{j.route=null;},j=>{j.route='ridge';},
    j=>{j.completed.reverse();},j=>{j.completed.push('pump-repair');},j=>{j.seenLift=false;},
    j=>{j.bindings['escape-ballast']='rescue-escape-ballast';},j=>{j.bindings['tower-lift']='jug-03';},
    j=>{delete j.bindings['tower-lift'];},j=>{j.bindings.unknown='toggle-01';}
  ];
  for(const mutate of cases){const broken=copy(pr);mutate(broken.journey);assert.throws(()=>validateStore(storeFor(broken),puzzles));}
  const forged=copy(pr);forged.journey.pump=true;assert.equal(hasPump(forged),false);
  assert.equal(validateStore(storeFor(forged),puzzles).profiles[0].journey.pump,undefined);
  const cheating=copy(pr),open=all.find(p=>p.id==='rescue-tower-lift');
  cheating.attempts[open.id]=solve(open);assert.throws(()=>validateStore(storeFor(cheating),puzzles));
  assert.equal(beginEncounter(pr,puzzles,'escape-ballast'),null);
  const p=puzzles.find(p=>p.id==='jug-03');pr.attempts[p.id]=solve(p);assert.equal(hasPump(pr),false);
  assert.throws(()=>validateJourney(null,pr,puzzles));
});

test('bound grade choices stay stable; old catalog completion cannot silently advance a new encounter',()=>{
  const pr=profile();startJourney(pr);const opened=beginEncounter(pr,puzzles);
  pr.band='45';assert.equal(beginEncounter(pr,puzzles).puzzle.id,opened.puzzle.id);
  pr.attempts[opened.puzzle.id]=restart(opened.puzzle,solve(opened.puzzle));
  assert.equal(completeEncounter(pr,opened.puzzle.id,opened.encounter.id,puzzles),false);
  finishNext(pr);assert.equal(beginEncounter(pr,puzzles).puzzle.number,4);
  assert.doesNotThrow(()=>validateStore(storeFor(pr),puzzles));
});

test('older journeys migrate to a readable archive without changing a single puzzle attempt',()=>{
  for(const route of ['reeds','ridge'])for(const count of [0,3,4,9,18]){
    const pr=profile();legacy.startJourney(pr);
    for(let i=0;i<count;i++){
      if(i===3)legacy.chooseRoute(pr,route);
      const opened=legacy.beginEncounter(pr,puzzles);pr.attempts[opened.puzzle.id]=solve(opened.puzzle);
      assert.equal(legacy.completeEncounter(pr,opened.puzzle.id,opened.encounter.id,puzzles),true);
    }
    const original=copy(pr),migrated=parseBackup(JSON.stringify(storeFor(pr)),puzzles).profiles[0];
    assert.deepEqual(pr,original,'migration does not mutate the input');
    assert.deepEqual(migrated.attempts,original.attempts);
    assert.deepEqual(migrated.caravanJourney,original.journey);assert.deepEqual(migrated.journey,freshJourney());
    assert.match(journalView(migrated),/earlier caravan journey/);
    assert.deepEqual(validateStore(storeFor(migrated),puzzles),storeFor(migrated));
    const imported=importProfiles(emptyStore(),storeFor(migrated),()=> 'new');
    imported.profiles[0].caravanJourney.completed.push('different');
    assert.deepEqual(migrated.caravanJourney,original.journey);
  }
  const untouched=profile();assert.deepEqual(validateStore(storeFor(untouched),puzzles),storeFor(untouched));
});
