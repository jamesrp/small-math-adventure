// Rescue campaign. Catalog puzzles keep their identities and rules; the three
// campaign jug instances have separate saves and an earned pump capability.
import {isSolved} from './engine.js';
export {COMPANIONS} from './caravan-legacy.js';
import {COMPANIONS} from './caravan-legacy.js';

export const ROUTES = [
  {id:'reeds',title:'Through the water gate',description:'Signal Luma. Her boat can bring us in—and wait below the north drain.',friend:'Luma',scene:'water'},
  {id:'ridge',title:'Across the rooftops',description:'Reach Bracken. She can rig a cable back to the cliffs.',friend:'Bracken',scene:'roofs'}
];
const pick=(k1,middle,upper)=>({k1,'23':middle,'45':upper});
const beat=(id,title,mechanic,speaker,intro,success,selection,effect)=>({id,title,mechanic,speaker,intro,success,selection,effect,keepsake:{title,text:success}});
export const CHAPTERS=[
  {id:'get-inside',title:'Find a way in',scene:'citadel',description:'The Keeper takes every living light to his citadel. His ship leaves at dawn.',encounters:[
    beat('tree-cradle','Before the gates close','swap','fern','Fern is ready to carry the lantern tree aboard. Put the ferry’s cargo cradles in their marked places.','The tree is safely cradled. Before the ferry can leave, the Keeper’s crane takes it. Fern climbs after the tree. The citadel gates slam shut. His ship leaves at dawn—with both of them aboard.',pick(3,4,5),'capture'),
    beat('quay-lights','Under the watchlights','toggle','pip','Fern’s lamp is blinking in the tower. Set the quay lights to the marked pattern so the sentries follow the lit passage away from us.','The sentries turn down the lit passage. Pip leads everyone across the dark quay. The water gate and the rooftops both lead inside.',pick(2,3,4),'sneak'),
    beat('ally-entry','A light for Luma','billiard','rook','Luma is waiting beyond the water gate. Work out the mirror signal’s path so she can meet its light at the right window.','Luma catches the signal and rows us through the gate. “If the gates close, find the north drain. I’ll wait below it.” Inside, an old lift leads toward Fern’s window.',pick(2,3,5),'entry')
  ]},
  {id:'reach-fern',title:'Reach Fern',scene:'workshop',description:'The tower lift needs four units of water. Bea knows where to find a pump.',encounters:[
    beat('workshop-lock','The workshop door','code','bea','The lift needs a pump. The workshop’s lock records which symbols matched each tried code. Find a code that fits.','The workshop door opens. Bea finds a portable pump, but one of its balancing pebbles has the wrong weight. The Keeper’s ship sounds its first horn.',pick(1,3,4),'workshop'),
    beat('pump-repair','Bea’s pump','weigh','bea','Find the odd balancing pebble so Bea can repair the pump. Then we can add water to the lift—or take water away.','Bea replaces the faulty pebble. The pump starts! You can now Fill and Empty jugs wherever you carry it. Try it here before returning to the lift.',pick(1,2,4),'pump'),
    beat('pump-practice','Try the pump','jug','bea','The pump’s test chamber needs one unit. Fill and Empty are now available alongside Pour.','One unit reaches the test chamber. Bea packs the pump. “Back to the lift. Now we can change more than where the water is.”',null,'practice'),
    beat('tower-lift','The tower lift','jug','bea','The lift needs four units in one jug. These unmarked jugs hold five and three; a pour stops at empty or full.','Four units balance the lift. It rises past the locked floors. Fern’s lamp is just beyond the landing—but which window is hers?',null,'lift'),
    beat('fern-message','Fern’s signal','code','pip','Fern is sending a pattern through the shutters. Fit the recorded clues to read her signal.','“I can turn the inside handle,” Fern signals. “Open your bolt when mine lines up. But opening the door will ring the alarm.” She has already put the tree on its trolley.',pick(2,6,8),'contact'),
    beat('fern-door','Both sides of the door','clock','fern','Fern is turning the inside mechanism. Find the first bell when all markers reach their stars so both sides of the door open together.','The bolts line up. Fern rolls the tree out and joins us. The alarm rings! Shutters seal our entrance. We need the escape route our friend promised.',pick(3,5,6),'rescue')
  ]},
  {id:'get-out',title:'Get everyone out',scene:'escape',description:'Fern is free. The entrance is sealed. Our friend is still waiting outside.',encounters:[
    beat('decoy-lights','Send them the wrong way','toggle','tumble','Set the corridor lamps to the decoy pattern. The sentries will follow the light while we take the tree to the north drain.','The sentries hurry toward the empty loading bay. Luma’s bell answers from below the drain. Only the water gate stands between us and her boat.',pick(5,6,7),'decoy'),
    beat('escape-ballast','The last water gate','jug','bea','Use Bea’s pump to measure two units for the gate’s counterweight. Luma is holding the boat beneath us.','The counterweight lifts the gate. Luma catches the trolley, and everyone climbs aboard. At dawn the Keeper’s ship sails without Fern or the tree. Across the water, we plant its roots where every window can share its light.',null,'escape')
  ]}
];
CHAPTERS.forEach((chapter,chapterIndex)=>chapter.encounters.forEach(e=>{e.chapterIndex=chapterIndex;}));
const encounters=CHAPTERS.flatMap(c=>c.encounters);
const ids=encounters.map(e=>e.id);
const customIds={'pump-practice':'rescue-pump-practice','tower-lift':'rescue-tower-lift','escape-ballast':'rescue-escape-ballast'};
const knownRoutes=new Set(ROUTES.map(r=>r.id));
export const freshJourney=()=>({version:2,started:false,route:null,seenLift:false,completed:[],bindings:{}});
export function ensureJourney(profile){return profile.journey??=freshJourney();}
export const hasPump=profile=>profile.journey?.version===2&&profile.journey.completed.includes('pump-repair');

export function getEncounter(id,journey=freshJourney()){
  const e=encounters.find(e=>e.id===id);
  if(!e)return null;
  let next={...e};
  if(journey.route==='ridge'){
    if(id==='ally-entry')next={...next,title:'The rooftop crossing',mechanic:'clock',speaker:'rook',selection:pick(1,2,8),intro:'Bracken is across the rooftops. Find the first bell when the lookout markers all face their stars, leaving the crossing unwatched.',success:'Everyone crosses while the lookouts face away. Bracken hooks a cable to the north tower. “If the doors shut, I can get you back to the cliffs.” A lift below the tower could take us to Fern.'};
    if(id==='decoy-lights')next={...next,intro:'Set the corridor lamps to the decoy pattern. The sentries will follow the light while we take the tree to Bracken’s cable.',success:'The sentries hurry toward the empty loading bay. Bracken lowers a basket from the cliffs. Its water counterweight must be set before it can carry us.'};
    if(id==='escape-ballast')next={...next,title:'Bracken’s cable',intro:'Use Bea’s pump to measure two units for the cable’s counterweight. Bracken is holding the basket beside the tower.',success:'The counterweight settles. Bracken hauls the tree and all six friends across to the cliffs. At dawn the Keeper’s ship sails without Fern or the tree. Beyond the cliffs, we plant its roots where every window can share its light.'};
  }
  if(id==='tower-lift'&&!journey.completed.includes('pump-repair'))next={...next,intro:'The lift needs four units, but these jugs can only pour into each other. “We need a pump,” says Bea. “There’s a workshop along this passage.”'};
  return {...next,keepsake:{title:next.title,text:next.success}};
}

export function getProgress(profile){
  const journey=profile.journey||freshJourney(),count=journey.completed.length;
  const complete=count===ids.length,needsRoute=count===2&&!journey.route;
  const needsLiftVisit=count===3&&!journey.seenLift;
  const encounter=complete?null:getEncounter(needsLiftVisit?'tower-lift':ids[count],journey);
  const chapterIndex=complete?2:encounter.chapterIndex;
  const rescued=journey.completed.includes('fern-door');
  const party=COMPANIONS.map(c=>c.id).filter(id=>id!=='fern'||count===0||rescued);
  return {chapterIndex,chapter:CHAPTERS[chapterIndex],encounter,completedCount:count,total:ids.length,complete,needsRoute,needsLiftVisit,party,pump:hasPump(profile),rescued,route:journey.route,
    memories:journey.completed.map(id=>({...getEncounter(id,journey).keepsake,speaker:getEncounter(id,journey).speaker})),
    sceneCaption:complete?'Six friends and the lantern tree are beyond the citadel.':count===0?'Fern and the tree wait at the ferry.':rescued?'The alarm is ringing. Fern and the tree are with the escaping companions.':hasPump(profile)?'Bea carries the repaired pump toward Fern’s tower.':'Fern and the lantern tree are locked in the citadel. The companions search for a way in.'};
}

// Campaign-only instances reuse the checked jug model, with independent IDs.
// The lift is authored here with the pump; resolvePuzzle removes those moves
// until earned. Its two reachable sealed states are a deliberate preview.
const catalogs=new WeakMap();
export function withCampaignPuzzles(puzzles){
  if(puzzles.some(p=>p.id==='rescue-tower-lift'))return puzzles;
  if(catalogs.has(puzzles))return catalogs.get(puzzles);
  const specs=[
    ['rescue-pump-practice','jug-01','Pump test',[0,0],null],
    ['rescue-tower-lift','jug-03','Tower lift',[5,0],{moves:[['pour',0,1],['empty',1],['pour',0,1],['fill',0],['pour',0,1]],minimum_moves:5}],
    ['rescue-escape-ballast','jug-04','Escape counterweight',[0,0],null]
  ];
  const extras=specs.map(([id,source,title,start,solution])=>{
    const base=puzzles.find(p=>p.id===source);
    if(!base)throw Error(`Missing campaign source ${source}`);
    return {...base,id,title,campaignOnly:true,requiresAbility:'pump',parameters:{...base.parameters,start},...(solution?{solution}:{}),
      hints:id==='rescue-tower-lift'?['Keep two units in the small jug. That leaves space for just one more.','Pour the large jug into the small one, then empty the small one.','Move the two remaining units into the small jug; refill the large jug and top up the small one.']:base.hints,
      provenance:`Campaign adaptation of ${source}. The tower lift starts at [5,0]; its sealed preview has only [5,0] and [2,3]. The pump adds full-fill and full-empty operations.`,
      parent:{...base.parent,notice:id==='rescue-tower-lift'?'Before the pump, pouring only alternates between (5,0) and (2,3). After the pump, new states become reachable.':base.parent.notice}};
  });
  const all=[...puzzles,...extras];catalogs.set(puzzles,all);return all;
}
export function resolvePuzzle(puzzle,profile){
  if(!puzzle?.requiresAbility||hasPump(profile))return puzzle;
  return {...puzzle,parameters:{...puzzle.parameters,source_and_drain:false},missingAbility:'pump',hints:['Pouring alone cannot make four. Find Bea’s pump in the workshop.'],rules:['Pour until the source is empty or the destination is full.','Fill and Empty need Bea’s pump.'],equipmentHint:'Pouring alone cannot make four. Find Bea’s pump in the workshop.'};
}
export function puzzleForEncounter(encounter,profile,puzzles){
  if(!encounter)return null;
  const all=withCampaignPuzzles(puzzles),bound=profile.journey?.bindings[encounter.id];
  const puzzle=bound?all.find(p=>p.id===bound):customIds[encounter.id]?all.find(p=>p.id===customIds[encounter.id]):all.find(p=>p.mechanic===encounter.mechanic&&(p.band===profile.band||p.band==='all')&&p.number===encounter.selection[profile.band]);
  return puzzle?resolvePuzzle(puzzle,profile):null;
}
export function startJourney(profile){const j=ensureJourney(profile);j.started=true;return j;}
export function chooseRoute(profile,route){
  const j=ensureJourney(profile);
  if(!j.started||j.completed.length!==2||!knownRoutes.has(route)||(j.route&&j.route!==route))return false;
  j.route=route;return true;
}
export function canVisitEncounter(profile,id){
  const j=profile.journey;
  if(!j?.started||j.version!==2||!ids.includes(id))return false;
  if(j.completed.includes(id))return true;
  const progress=getProgress(profile);
  if(progress.needsRoute||progress.complete)return false;
  if(id==='tower-lift'&&j.completed.length>=3&&j.completed.length<5)return true;
  return progress.encounter?.id===id;
}
export function beginEncounter(profile,puzzles,encounterId){
  const j=ensureJourney(profile),progress=getProgress(profile),id=encounterId||progress.encounter?.id;
  if(!canVisitEncounter(profile,id))return null;
  if(id==='tower-lift')j.seenLift=true;
  const encounter=getEncounter(id,j),puzzle=puzzleForEncounter(encounter,profile,puzzles);
  if(!puzzle)return null;
  j.bindings[id]=puzzle.id;
  return {encounter,puzzle};
}
export function completeEncounter(profile,puzzleId,encounterId,puzzles){
  const j=ensureJourney(profile),progress=getProgress(profile);
  if(!j.started||progress.complete||progress.needsRoute||progress.needsLiftVisit||ids[j.completed.length]!==encounterId||j.bindings[encounterId]!==puzzleId)return false;
  const p=puzzleForEncounter(getEncounter(encounterId,j),profile,puzzles),a=profile.attempts[puzzleId];
  if(!p||p.missingAbility||!a?.completed||!isSolved(p,a.board))return false;
  j.completed.push(encounterId);return true;
}
export function validateJourney(value,profile,puzzles){
  const fail=()=>{throw Error('This rescue journey does not match the saved puzzles.');};
  if(!value||value.version!==2||typeof value.started!=='boolean'||typeof value.seenLift!=='boolean'||(value.route!==null&&!knownRoutes.has(value.route))||!Array.isArray(value.completed)||value.completed.length>ids.length||!value.bindings||typeof value.bindings!=='object'||Array.isArray(value.bindings))return fail();
  const count=value.completed.length;
  if(value.completed.some((id,i)=>id!==ids[i])||(!value.started&&(count||value.route||value.seenLift||Object.keys(value.bindings).length))||(count<2&&value.route!==null)||(count>2&&value.route===null)||(value.seenLift&&count<3)||(count>3&&!value.seenLift))return fail();
  const bindings={},validIds=new Set(value.completed);
  if(count<ids.length&&!(count===2&&!value.route)&&!(count===3&&!value.seenLift))validIds.add(ids[count]);
  if(count>=3&&value.seenLift)validIds.add('tower-lift');
  for(const [id,puzzleId]of Object.entries(value.bindings)){
    if(!validIds.has(id)||typeof puzzleId!=='string')return fail();
    const e=getEncounter(id,value),p=withCampaignPuzzles(puzzles).find(p=>p.id===puzzleId);
    if(!p||p.mechanic!==e.mechanic)return fail();
    if(customIds[id]?puzzleId!==customIds[id]:p.band==='all'?!Object.values(e.selection).includes(p.number):e.selection[p.band]!==p.number)return fail();
    if(value.completed.includes(id)&&profile.attempts[puzzleId]?.completed!==true)return fail();
    bindings[id]=puzzleId;
  }
  if(value.completed.some(id=>!Object.hasOwn(bindings,id))||(value.seenLift&&!Object.hasOwn(bindings,'tower-lift')))return fail();
  return {version:2,started:value.started,route:value.route,seenLift:value.seenLift,completed:[...value.completed],bindings};
}
