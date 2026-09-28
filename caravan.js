// The Lantern Road: one visible route, six friends, six places to light.
// Each encounter owns a checked catalog instance so campaign and library saves
// never overwrite one another. The original catalog remains unchanged.
import {isSolved} from './engine.js';
import {COMPANIONS} from './caravan-legacy.js';
import {withCampaignPuzzles as withRescuePuzzles} from './caravan-rescue.js';
export {COMPANIONS};
export const ROUTES=[];
const pick=(k1,middle,upper)=>({k1,'23':middle,'45':upper});
const beat=(id,title,mechanic,speaker,intro,success,selection,effect)=>({id,title,mechanic,speaker,intro,success,selection,effect,keepsake:{title,text:success}});
export const CHAPTERS=[
  {id:'ferry',title:'Sleepy Ferry',scene:'ferry',encounters:[
    beat('ferry-cargo','Cargo cradles','swap','fern','The tree travels in the ferry’s cargo cradles.','The tree is aboard.',pick(3,4,5),'cargo'),
    beat('ferry-bell','Departure bell','clock','rook','The ferry’s departure bell is stopped.','The ferry crosses the water.',pick(1,3,5),'crossing'),
    beat('ferry-lights','Landing lights','toggle','pip','The landing’s lamps share their wires.','The ferry landing is lit.',pick(2,3,5),'light')
  ]},
  {id:'marsh',title:'Reed Marsh',scene:'marsh',encounters:[
    beat('marsh-paths','Reed paths','route','moss','Each marsh path needs a lantern.','Lanterns mark the reed paths.',pick(1,3,5),'paths'),
    beat('marsh-garden','Lantern beds','latin','fern','The marsh lanterns grow in rows of different seeds.','The lantern beds are planted.',pick(2,3,5),'garden'),
    beat('marsh-water','Garden water','jug','bea','The lantern beds need water from these measuring tanks.','The marsh garden lights up.',pick(1,3,5),'light')
  ]},
  {id:'ridge',title:'Windy Ridge',scene:'ridge',encounters:[
    beat('ridge-balance','Cable weights','weigh','bea','One of the cable’s balancing stones has the wrong weight.','The cable carries everyone to the ridge.',pick(2,3,5),'cable'),
    beat('ridge-game','A game with Tumble','nim','tumble','Tumble has a pebble game for the rest stop.','The game is finished; the friends pack up.',pick(2,4,5),'game'),
    beat('ridge-lanterns','Ridge lanterns','color','rook','Linked ridge lanterns need different colors to tell the paths apart.','The ridge lanterns are lit.',pick(2,3,6),'light')
  ]},
  {id:'workshop',title:'Old Workshop',scene:'workshop',encounters:[
    beat('workshop-floor','Floor tiles','tile','tumble','The tree’s trolley needs a repaired workshop floor.','The trolley rolls inside.',pick(4,8,8),'floor'),
    beat('workshop-lock','Supply cupboard','code','bea','The spare lanterns are in the locked cupboard.','The supply cupboard opens.',pick(2,4,5),'cupboard'),
    beat('workshop-cradles','Lantern cradles','swap','moss','The workshop’s lanterns belong in their matching cradles.','The workshop windows glow.',pick(8,10,9),'light')
  ]},
  {id:'lighthouse',title:'Lighthouse',scene:'lighthouse',encounters:[
    beat('lighthouse-mirrors','Mirror room','billiard','pip','The lighthouse sends light through a room of mirrors.','Light reaches the beacon.',pick(2,4,5),'mirrors'),
    beat('lighthouse-turn','Beacon gears','clock','bea','The beacon’s turning gear has stopped.','The beacon turns across the bay.',pick(2,4,6),'beacon'),
    beat('lighthouse-lamps','Harbor lamps','toggle','rook','The harbor lamps share the lighthouse’s wires.','The lighthouse and harbor are lit.',pick(3,8,6),'light')
  ]},
  {id:'citadel',title:'Clockwork Citadel',scene:'citadel',encounters:[
    beat('citadel-streets','Lantern rounds','route','moss','Each citadel street needs a lantern.','Lanterns hang along every street.',pick(2,8,11),'streets'),
    beat('citadel-water','Courtyard fountain','jug','bea','Water balances the courtyard fountain’s lift.','The fountain carries the tree into the square.',pick(2,8,6),'fountain'),
    beat('citadel-lanterns','Square lanterns','color','fern','Linked square lanterns need different colors to mark the streets.','The citadel is lit; the whole lantern road is open.',pick(3,8,10),'light')
  ]}
];
CHAPTERS.forEach((chapter,chapterIndex)=>chapter.encounters.forEach((e,stepIndex)=>{e.chapterIndex=chapterIndex;e.stepIndex=stepIndex;}));
const encounters=CHAPTERS.flatMap(c=>c.encounters),ids=encounters.map(e=>e.id),bands=['k1','23','45'];
const campaignId=(id,band)=>`road-${id}-${band}`;
export const freshJourney=()=>({version:3,started:false,completed:[],bindings:{}});
export function ensureJourney(profile){return profile.journey??=freshJourney();}
// Retained imports are harmless while the old rescue remains a readable archive.
export const chooseRoute=()=>false;
export const hasPump=()=>false;
export function getEncounter(id){return encounters.find(e=>e.id===id)||null;}
export function getProgress(profile){
  const journey=profile.journey?.version===3?profile.journey:freshJourney(),count=journey.completed.length;
  const complete=count===ids.length,encounter=complete?null:getEncounter(ids[count]);
  const chapterIndex=complete?CHAPTERS.length-1:encounter.chapterIndex,chapter=CHAPTERS[chapterIndex];
  const litStops=CHAPTERS.filter(c=>c.encounters.every(e=>journey.completed.includes(e.id))).map(c=>c.id);
  const chapterCompleted=chapter.encounters.filter(e=>journey.completed.includes(e.id)).length;
  return {chapterIndex,chapter,encounter,completedCount:count,total:ids.length,complete,
    party:COMPANIONS.map(c=>c.id),litStops,chapterCompleted,localCompleted:chapterCompleted,
    needsRoute:false,needsLiftVisit:false,route:null,pump:false,rescued:false,
    memories:journey.completed.map(id=>({...getEncounter(id).keepsake,speaker:getEncounter(id).speaker})),
    sceneCaption:complete?'All six places on the lantern road are lit.':`The six friends and their lantern tree are at ${chapter.title}.`};
}
const catalogs=new WeakMap();
export function withCampaignPuzzles(puzzles){
  if(catalogs.has(puzzles))return catalogs.get(puzzles);
  const base=puzzles.filter(p=>!p.campaignOnly);
  const archived=withRescuePuzzles(base).filter(p=>p.campaignOnly).map(p=>({...p,campaignVersion:2}));
  const extras=encounters.flatMap(e=>bands.map(band=>{
    const source=base.find(p=>p.mechanic===e.mechanic&&(p.band===band||p.band==='all')&&p.number===e.selection[band]);
    if(!source)throw Error(`Missing Lantern Road source for ${e.id}/${band}`);
    return {...source,id:campaignId(e.id,band),title:e.title,band,campaignOnly:true,campaignVersion:3,campaignEncounter:e.id,sourceId:source.id};
  }));
  const all=[...base,...archived,...extras];catalogs.set(puzzles,all);catalogs.set(all,all);return all;
}
// Every road puzzle uses its authored operations immediately. Old rescue boards
// are resolved only by the frozen rescue module during saved-data validation.
export function resolvePuzzle(puzzle){return puzzle;}
export function puzzleForEncounter(encounter,profile,puzzles){
  if(!encounter)return null;
  const id=profile.journey?.bindings?.[encounter.id]||campaignId(encounter.id,profile.band);
  const p=withCampaignPuzzles(puzzles).find(p=>p.id===id);
  return p?.campaignEncounter===encounter.id?p:null;
}
export function startJourney(profile){const j=ensureJourney(profile);if(j.version===3)j.started=true;return j;}
export function canVisitEncounter(profile,id){
  const j=profile.journey;
  return !!(j?.version===3&&j.started&&ids.includes(id)&&(j.completed.includes(id)||ids[j.completed.length]===id));
}
export function beginEncounter(profile,puzzles,encounterId){
  const j=ensureJourney(profile),id=encounterId||getProgress(profile).encounter?.id;
  if(!canVisitEncounter(profile,id))return null;
  const encounter=getEncounter(id),puzzle=puzzleForEncounter(encounter,profile,puzzles);
  if(!puzzle)return null;
  j.bindings[id]=puzzle.id;
  return {encounter,puzzle};
}
export function completeEncounter(profile,puzzleId,encounterId,puzzles){
  const j=ensureJourney(profile);
  if(j.version!==3||!j.started||ids[j.completed.length]!==encounterId||j.bindings[encounterId]!==puzzleId)return false;
  const p=puzzleForEncounter(getEncounter(encounterId),profile,puzzles),a=profile.attempts[puzzleId];
  if(!p||!a?.completed||!isSolved(p,a.board))return false;
  j.completed.push(encounterId);return true;
}
export function validateJourney(value,profile,puzzles){
  const fail=()=>{throw Error('This lantern road does not match the saved puzzles.');};
  if(!value||value.version!==3||typeof value.started!=='boolean'||!Array.isArray(value.completed)||value.completed.length>ids.length||!value.bindings||typeof value.bindings!=='object'||Array.isArray(value.bindings))return fail();
  const count=value.completed.length;
  if(value.completed.some((id,i)=>id!==ids[i])||(!value.started&&(count||Object.keys(value.bindings).length)))return fail();
  const bindings={},validIds=new Set(value.completed),all=withCampaignPuzzles(puzzles);
  if(value.started&&count<ids.length)validIds.add(ids[count]);
  for(const [id,puzzleId]of Object.entries(value.bindings)){
    if(!validIds.has(id)||typeof puzzleId!=='string'||!bands.some(band=>puzzleId===campaignId(id,band)))return fail();
    const p=all.find(p=>p.id===puzzleId);
    if(!p||p.campaignEncounter!==id||p.mechanic!==getEncounter(id).mechanic)return fail();
    if(value.completed.includes(id)&&profile.attempts[puzzleId]?.completed!==true)return fail();
    bindings[id]=puzzleId;
  }
  if(value.completed.some(id=>!Object.hasOwn(bindings,id)))return fail();
  return {version:3,started:value.started,completed:[...value.completed],bindings};
}
