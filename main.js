import { createViewState } from './view-state.js';
import { extendTileStroke, startTileStroke, tapTileSelection, tileInstructions, tileReleaseAction, tileStrokeTarget } from './tile-controls.js';
import {isExpansion,mechanicFor,playInstructions} from './expansion.js';
import {FAMILIES,mergePacks} from './families.js';
import {puzzleObjective} from './puzzle-copy.js';
import { BANDS,freshAttempt,resumeAttempt,isSolved,nextHint,move,removeTile,undo,restart,undoToSolvable } from './engine.js';
import { SAVE_KEY,BACKUP_KEY,emptyStore,loadStore,persistStore,parseBackup,importProfiles } from './storage.js';
import { esc,playView,parentView,notesHTML } from './ui.js';
import { getProgress, getEncounter, startJourney, beginEncounter, recordSolve, continueAfter, withCampaignPuzzles, resolvePuzzle, canVisitEncounter, stopOf, BAND_KEYS } from './road.js';
import { caravanHeader, caravanProfiles, libraryView } from './caravan-ui.js';
import { roadMapView, journalView, finaleView, stopSheet, trailOptions } from './road-ui.js';
import { loadArt, keepMedia, asset, artUrl } from './art.js';
import { createClockTimeline } from './clock-playback.js';
import { clockJumpArc, clockJumpFromPlace, clockPlaceAtPoint, clockStepJump } from './clock-geometry.js';
const app=document.querySelector('#app');
const viewState=createViewState(app);
let pack,puzzles,state,warning='',selected=null,highlighted=null,message='',checker=false,pwaMessage='Preparing offline play…',currentDialog;
let tileSelection=[],tileGesture=null;
const clockTimeline=createClockTimeline(()=>render());
let sessionCompleted=new Set(),activePlay=null;
// Road reactions last until the next move or page: what the keeper just said,
// what the last solve earned, and whether the scene should play its change.
let reaction=null,solveResult=null,oopsCount=0;
// A solve whose strip is still held back (bells still ringing) takes focus when it appears.
let focusDone=false;
let storage;
try{storage=window.localStorage;}catch{storage={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};}
const uid=()=>globalThis.crypto?.randomUUID?.()||`explorer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const profile=()=>state.profiles.find(p=>p.id===state.activeProfileId);
const route=()=>location.hash.slice(1).split('/');
const puzzle=()=>{
  const p=puzzles.find(p=>p.id===route()[1]),pr=profile();
  if(!pr||!p)return null;
  // Only current-road boards open; archived campaign boards stay in saves only.
  if(p.campaignOnly&&(p.campaignVersion!==4||p.campaignEncounter!==route()[2]||!canVisitEncounter(pr,route()[2],p.band)))return null;
  return resolvePuzzle(p,pr);
};
const attempt=p=>profile().attempts[p.id]||freshAttempt(p);
// The encounter lives in the URL as well as the save. Free play never advances a story.
function activeEncounter(){
  const pr=profile(),p=puzzle(),id=route()[2];
  if(!pr||!p||!id||p.campaignVersion!==4||p.campaignEncounter!==id)return null;
  return canVisitEncounter(pr,id,p.band)?getEncounter(id):null;
}
function save(){warning=persistStore(storage,state,puzzles);}
function put(p,a){profile().attempts[p.id]=a;save();}
function go(hash){viewState.save();clockTimeline.leave();focusDone=false;selected=null;tileSelection=[];tileGesture=null;highlighted=null;message='';reaction=null;solveResult=null;if(location.hash===`#${hash}`)render();else location.hash=hash;}
function render(){
  const savedView=viewState.beforeRender(`${state.activeProfileId||''}:${location.hash}`);
  tileGesture=null;
  const focus=document.activeElement?.dataset?.focus,focusedPair=document.activeElement?.dataset?.pair,view=route()[0],pr=profile(),p=puzzle();
  const playKey=view==='play'&&pr&&p?`${pr.id}/${location.hash}`:null;
  if(playKey!==activePlay){
    activePlay=playKey;tileSelection=[];
    if(playKey&&isExpansion(p))mechanicFor(p).reset?.(p);
    if(playKey){
      // A solved road scene is a persistent consequence. Replay is explicit;
      // refreshing between the solve and Next must not undo that scene.
      pr.attempts[p.id]=p.campaignOnly?(pr.attempts[p.id]||freshAttempt(p)):resumeAttempt(p,pr.attempts[p.id]);save();
    }
  }
  if(playKey&&p.mechanic==='clock')clockTimeline.enter(playKey,p,attempt(p).board.prediction);
  else if(clockTimeline.key)clockTimeline.leave();
  const encounter=activeEncounter();
  const here=location.hash,result=solveResult?.key===here?solveResult:null,said=reaction?.key===here?reaction:null;
  const content=view==='parents'?parentView(state,pr,pack,pwaMessage,savedView.values['catalog-band']):!pr||view==='profiles'?caravanProfiles(state,puzzles):view==='journal'?journalView(pr,puzzles):view==='finale'&&getProgress(pr).complete?finaleView(pr):view==='library'?libraryView(pr,puzzles):view==='play'&&p?playView(p,attempt(p),{pack,profile:pr,encounter,selected,tileSelection,highlighted,message,checker,sessionCount:sessionCompleted.size,clockPresentation:p.mechanic==='clock'?clockTimeline.presentation:undefined,reaction:said,result,changed:Boolean(result?.first)}):roadMapView(pr);
  document.body.dataset.view=view||'map';
  document.body.classList.toggle('on-encounter',Boolean(encounter));
  if(encounter)document.body.dataset.stop=encounter.stop;else delete document.body.dataset.stop;
  const flips=new Map([...app.querySelectorAll('[data-flip]')].map(node=>[node.dataset.flip,node.getBoundingClientRect()]));
  keepMedia(app,()=>{
    const kept=new Map([...app.querySelectorAll('[data-keep]')].map(node=>[node.dataset.keep,node]));
    app.innerHTML=caravanHeader(pr,view==='library'||(view==='play'&&!encounter)?'library':view==='journal'?'journal':'journey')+(warning?`<div class="error-banner" role="status">${esc(warning)}</div>`:'')+`<main class="shell" id="main">${content}</main>`;
    // An unchanged speech bubble or solved strip keeps its node, so its entrance
    // animation plays once instead of on every frame of a re-render.
    for(const node of [...app.querySelectorAll('[data-keep]')]){
      if(!app.contains(node))continue;
      const html=node.outerHTML,old=kept.get(node.dataset.keep);
      if(old&&old.keepHtml===html)node.replaceWith(old);else node.keepHtml=html;
    }
  });
  glide(flips);
  if(encounter&&isSolved(p,attempt(p).board)){
    app.querySelectorAll(':is(.board-panel,.lr-stage) :is(button,input,select)').forEach(control=>{control.disabled=true;});
    app.querySelectorAll(':is(.board-panel,.lr-stage) :is([role="button"],[role="slider"])').forEach(control=>{control.setAttribute('aria-disabled','true');control.setAttribute('tabindex','-1');});
  }
  if(focus){let target=(focusedPair?app.querySelector(`[data-pair="${CSS.escape(focusedPair)}"]`):app.querySelector(`[data-focus="${CSS.escape(focus)}"]`));if(!target||target.disabled||target.getAttribute('aria-disabled')==='true')target=app.querySelector('.latin-cell[aria-pressed="true"]:not(:disabled)')||app.querySelector('.nim-status')||app.querySelector('#completion-heading')||app.querySelector('.lr-stage :is(button,[role="button"]):not(:disabled):not([aria-disabled="true"])')||familyFocus()||app.querySelector('.duel-status')||app.querySelector('.garden-cell');target?.focus({preventScroll:true});}
  if(focusDone){const heading=app.querySelector('#completion-heading');if(heading){focusDone=false;heading.focus({preventScroll:true});}}
  wireForms();
  wireTileBoard();
  wireClockBoard();
  wireMechanic();
  viewState.restore();
}
// A piece that changed place (a traveler swapping seats, Hops walking a
// boardwalk) moves there from where it was instead of jumping.
function glide(before){
  if(!before.size||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  for(const node of app.querySelectorAll('[data-flip]')){
    const old=before.get(node.dataset.flip);if(!old)continue;
    const now=node.getBoundingClientRect(),dx=old.left-now.left,dy=old.top-now.top,far=Math.hypot(dx,dy);
    if(far<2)continue;
    node.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:`translate(${dx/2}px,${dy/2-Math.min(48,far/4)}px)`,offset:.5},{transform:'none'}],{duration:Math.min(720,320+far*.8),easing:'ease-in-out'});
  }
}
// Each family module names the control that takes focus when the focused one is gone.
// The open puzzle's own module goes first, so a selector another family shares can't win.
const familyFocus=()=>{const mechanic=puzzle()?.mechanic,own=FAMILIES.filter(m=>m.mechanics&&Object.hasOwn(m.mechanics,mechanic));return [...own,...FAMILIES].reduce((found,m)=>found||(m.focus?app.querySelector(m.focus):null),null);};
function tapTile(p,cell){
  const a=attempt(p);
  if(activeEncounter()&&isSolved(p,a.board))return;
  if(a.board.some(piece=>piece.includes(cell))){put(p,removeTile(p,a,cell));tileSelection=[];highlighted=null;message='';render();return;}
  const next=tapTileSelection(p,a.board,tileSelection,cell);
  tileSelection=next.status==='complete'?[]:next.cells;
  message='';
  if(next.status==='complete')applyPair(p,next.cells);else render();
}
function wireTileBoard(){
  const board=app.querySelector('.tile-board'),p=puzzle();
  if(!board||p?.mechanic!=='tile')return;
  const paint=()=>{
    board.querySelectorAll('.garden-cell').forEach(node=>{
      const cell=Number(node.dataset.cell),active=tileGesture?.stroke.cells.includes(cell);
      const chosen=!tileGesture&&tileSelection.includes(cell);
      node.classList.toggle('selected',chosen);
      node.setAttribute('aria-pressed',String(chosen));
      if(!node.classList.contains('planted')){
        node.setAttribute('aria-label',`Row ${Math.floor(cell/p.cols)+1}, column ${cell%p.cols+1}${chosen?', selected':', empty patch'}`);
        node.querySelector('span').textContent=chosen?'•':'';
      }
      node.classList.toggle('tile-preview',Boolean(active));
      node.classList.toggle('invalid',Boolean(active&&tileGesture.stroke.status==='blocked'));
      node.classList.toggle(`tile-color-${tileGesture?.color??0}`,Boolean(active&&tileGesture.stroke.status!=='blocked'));
      if(!tileGesture)node.classList.remove(...Array.from({length:6},(_,i)=>`tile-color-${i}`));
    });
  };
  const target=e=>tileStrokeTarget(board.getBoundingClientRect(),[...board.querySelectorAll('.garden-cell,.garden-hole')].map(node=>({cell:Number(node.dataset.cell),rect:node.getBoundingClientRect()})),e.clientX,e.clientY);
  board.addEventListener('pointerdown',e=>{
    if(tileGesture||!e.isPrimary||e.button!==0)return;
    const cell=e.target.closest('.garden-cell');
    if(!cell||!board.contains(cell)||cell.classList.contains('planted'))return;
    e.preventDefault();
    board.setPointerCapture(e.pointerId);
    tileGesture={id:e.pointerId,board,stroke:startTileStroke(p,attempt(p).board,Number(cell.dataset.cell)),color:attempt(p).board.length%6,multi:false,departed:false};
    paint();
  });
  board.addEventListener('pointermove',e=>{
    if(!tileGesture||tileGesture.id!==e.pointerId)return;
    const hit=target(e);
    if(hit===-1)tileGesture.departed=true;
    const before=tileGesture.stroke,after=extendTileStroke(p,attempt(p).board,before,hit);
    if(after!==before){tileGesture.stroke=after;if(after.cells.length>1&&!tileGesture.multi){tileGesture.multi=true;tileSelection=[];}paint();}
  });
  const finish=(e,cancel)=>{
    if(!tileGesture||tileGesture.id!==e.pointerId)return;
    const gesture=tileGesture,hit=cancel?-1:target(e);
    const start=board.querySelector(`.garden-cell[data-cell="${gesture.stroke.cells[0]}"]`);
    const rect=start?.getBoundingClientRect();
    const insideStart=rect&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
    const action=cancel?null:tileReleaseAction(gesture.stroke,gesture.multi,gesture.departed,hit,insideStart);
    tileGesture=null;
    if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);
    if(action?.type==='place')applyPair(p,action.cells);
    else if(action?.type==='tap')tapTile(p,action.cell);
    else paint();
  };
  board.addEventListener('pointerup',e=>finish(e,false));
  board.addEventListener('pointercancel',e=>finish(e,true));
  board.addEventListener('lostpointercapture',e=>finish(e,true));
}
// Proof mechanics attach their own pointer gestures after each render.
function wireMechanic(){const p=puzzle(),root=app.querySelector('[data-mechanic-wire]');if(!root||!p||!profile()||!isExpansion(p))return;mechanicFor(p).wire?.(root,p,{apply:action=>applyPair(p,action),ui:payload=>{mechanicFor(p).ui?.(p,payload);render();},attempt:()=>attempt(p),tile:{extendTileStroke,startTileStroke,tapTileSelection,tileReleaseAction,tileStrokeTarget}});}
function wireClockBoard(){
  const svg=app.querySelector('.clock-choose svg[role="slider"]'),p=puzzle();
  if(!svg||p?.mechanic!=='clock'||svg.getAttribute('aria-disabled')==='true')return;
  const {positions,start,jump_min,jump_max}=p.parameters;
  const board=svg.closest('.clock-board'),caption=board.querySelector('.clock-jump-caption');
  const field=board.querySelector('input[name="jump"]'),arrow=svg.querySelector('.clock-jump-arrow'),head=svg.querySelector('.clock-jump-head');
  const marker=svg.querySelector('.clock-marker'),count=svg.querySelector('.clock-center'),countLabel=svg.querySelector('.clock-center-label');
  let jump=Number(field.value),gesture=null;
  const paint=next=>{
    if(next===null||next===jump&&clockTimeline.presentation.count===0)return;
    jump=next;clockTimeline.edit(String(jump),false);
    const arc=clockJumpArc(positions,start,jump),angle=start*2*Math.PI/positions;
    arrow.setAttribute('d',arc.path);head.setAttribute('points',arc.head);
    caption.textContent=`Jump ${jump}`;field.value=String(jump);
    svg.setAttribute('aria-valuenow',String(jump));
    svg.setAttribute('aria-valuetext',`Jump ${jump} clockwise from ${start} to ${arc.to}`);
    svg.setAttribute('aria-label',`${positions} places, jump ${jump} clockwise from ${start} to ${arc.to}, star ${start}. Marker starts at ${start}.`);
    svg.querySelectorAll('.clock-trail,.clock-trail-head').forEach(node=>node.remove());
    marker.setAttribute('cx',String(160+110*Math.sin(angle)));
    marker.setAttribute('cy',String(160-110*Math.cos(angle)));
    count.textContent='0';countLabel.textContent='bells';
  };
  const target=e=>{
    const rect=svg.getBoundingClientRect(),x=(e.clientX-rect.left)*320/rect.width,y=(e.clientY-rect.top)*320/rect.height;
    const place=clockPlaceAtPoint(x,y,positions);
    return place===null?null:clockJumpFromPlace(positions,start,place,jump_min,jump_max);
  };
  svg.addEventListener('pointerdown',e=>{
    if(gesture!==null||!e.isPrimary||e.button!==0)return;
    const next=target(e);if(next===null)return;
    e.preventDefault();svg.setPointerCapture(e.pointerId);gesture=e.pointerId;paint(next);
  });
  svg.addEventListener('pointermove',e=>{if(gesture===e.pointerId)paint(target(e));});
  const finish=e=>{
    if(gesture!==e.pointerId)return;
    if(e.type==='pointerup')paint(target(e));
    gesture=null;
    if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
  };
  svg.addEventListener('pointerup',finish);
  svg.addEventListener('pointercancel',finish);
  svg.addEventListener('lostpointercapture',finish);
  svg.addEventListener('keydown',e=>{
    if(!['ArrowRight','ArrowUp','ArrowLeft','ArrowDown'].includes(e.key))return;
    e.preventDefault();paint(clockStepJump(jump,e.key,jump_min,jump_max));
  });
}
function wireForms(){
  document.querySelectorAll('form[data-puzzle-form]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const p=puzzle();if(p&&profile())applyPair(p,Object.fromEntries(new FormData(e.currentTarget)),p.mechanic==='clock'?'ring':null);}));
  document.querySelectorAll('input[name="activations"]').forEach(input=>input.addEventListener('change',e=>clockTimeline.edit(e.target.value)));
  document.querySelector('#profile-form')?.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.currentTarget),name=String(data.get('name')).trim();if(!name){document.querySelector('#nickname').focus();return;}if(state.profiles.length>=30){dialog('All save slots are full','<p>There is room for 30 explorers. Export and remove an unused save in the grown-up area.</p>');return;}const pr={id:uid(),name,band:data.get('band'),avatar:0,sound:false,attempts:{}};state.profiles.push(pr);state.activeProfileId=pr.id;save();go(['library','play'].includes(route()[0])?location.hash.slice(1):'map');});
  document.querySelector('#checker')?.addEventListener('change',e=>{checker=e.target.checked;document.querySelector('.tile-board')?.classList.toggle('show-checker',checker);});
  document.querySelector('#catalog-band')?.addEventListener('change',()=>render());
  document.querySelector('#sound-toggle')?.addEventListener('change',e=>{profile().sound=e.target.checked;save();render();});
  document.querySelector('#import-file')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error('Choose a backup smaller than 5 MB.');const backup=parseBackup(await file.text(),puzzles),next=importProfiles(state,backup,uid);state=next;save();render();dialog('Saves restored',`<p>${backup.profiles.length} ${backup.profiles.length===1?'explorer was':'explorers were'} added. Existing explorers are unchanged.</p>`);}catch(error){dialog('That backup could not be opened',`<p>${esc(error.message)}</p><p>Your existing saves have not changed.</p>`);}});
}
function dialog(title,body,actions=[{label:'Done'}]){
  currentDialog?.close();const previous=document.activeElement,d=document.createElement('dialog');d.className='modal';d.innerHTML=`<h2 id="dialog-title">${esc(title)}</h2><div class="dialog-body">${body}</div><div class="dialog-actions"></div>`;d.setAttribute('aria-labelledby','dialog-title');document.body.append(d);currentDialog=d;
  for(const [i,action]of actions.entries()){const b=document.createElement('button');b.type='button';b.className=action.danger?'danger':i===actions.length-1?'primary':'secondary';b.textContent=action.label;b.addEventListener('click',()=>{if(action.run?.(d)===false)return;d.close();});d.querySelector('.dialog-actions').append(b);}
  d.addEventListener('close',()=>{d.remove();if(currentDialog===d)currentDialog=null;if(previous?.isConnected)previous.focus();});d.showModal();return d;
}
function instructions(p){
  return isExpansion(p)?playInstructions(p):p.mechanic==='tile'?tileInstructions(p):'Tap two cups to swap them. Only the listed pairs can swap.';
}
function speak(p){
  if(!('speechSynthesis'in window)){message='Read-aloud unavailable. Open How to play.';render();return;}
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(`${puzzleObjective(p)} ${instructions(p)}`);utterance.rate=.85;
  utterance.onerror=event=>{if(['interrupted','canceled'].includes(event.error))return;message='Read-aloud unavailable. Open How to play.';render();};
  window.speechSynthesis.speak(utterance);
}
// A recorded line plays when the art manifest has one; otherwise the browser voice reads it.
let voiceClip=null;
function narrate(text,voiceId){
  window.speechSynthesis?.cancel();voiceClip?.pause();
  const recorded=voiceId&&asset(voiceId)?.audio;
  if(recorded){voiceClip=new Audio(artUrl(recorded));voiceClip.play().catch(()=>{voiceClip=null;narrate(text);});return;}
  if(!('speechSynthesis' in window)){dialog('Read it together',`<p>${esc(text)}</p>`);return;}
  window.speechSynthesis.cancel();
  const voice=new SpeechSynthesisUtterance(text);voice.rate=.86;
  voice.onerror=event=>{if(!['interrupted','canceled'].includes(event.error))dialog('Read it together',`<p>${esc(text)}</p>`);};
  window.speechSynthesis.speak(voice);
}
function openPuzzle(id){const p=puzzles.find(p=>p.id===id);if(!p||p.campaignOnly||!profile())return;if(!profile().attempts[id])profile().attempts[id]=freshAttempt(p);save();go(`play/${id}`);}
function openEncounter(id){
  if(!profile())return;
  const next=beginEncounter(profile(),puzzles,id);
  if(!next){go('map');return;}
  if(!profile().attempts[next.puzzle.id])profile().attempts[next.puzzle.id]=freshAttempt(next.puzzle);
  save();go(`play/${next.puzzle.id}/${next.encounter.id}`);
}
function applyPair(p,pair,intent=null){const a=attempt(p),encounter=activeEncounter();if(encounter&&isSolved(p,a.board))return;const next=move(p,a,pair);selected=p.mechanic==='latin'?Number(pair.cell):null;tileSelection=[];highlighted=null;if(!next){message=isExpansion(p)?'That move is not allowed. Check How to play.':p.mechanic==='tile'?'':'Choose a listed pair.';if(encounter)reaction={key:location.hash,kind:'oops',n:oopsCount++};render();return;}message='';if(next!==a)reaction=null;if(isSolved(p,next.board)&&!a.completed)sessionCompleted.add(p.id);profile().attempts[p.id]=next;if(encounter&&isSolved(p,next.board)){const result=recordSolve(profile(),p.id,encounter.id,puzzles);solveResult=result?{...result,key:location.hash}:null;}save();if(p.mechanic==='clock'){if(intent==='ring')clockTimeline.ring(p,next.board.prediction,window.matchMedia('(prefers-reduced-motion: reduce)').matches);else clockTimeline.restore(p,next.board.prediction);}else render();if(isSolved(p,next.board)){if(encounter)window.scrollTo(0,0);const heading=document.querySelector('#completion-heading');if(heading)heading.focus({preventScroll:true});else focusDone=true;}}
document.addEventListener('keydown',event=>{
  const wire=event.target.closest('.wire-hit');
  if(wire&&['Enter',' '].includes(event.key)){event.preventDefault();if(wire.getAttribute('aria-disabled')!=='true')wire.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}
  if(!event.target.closest('.latin-puzzle')||event.ctrlKey||event.metaKey||event.altKey)return;
  const p=puzzle(),cell=document.querySelector('.latin-cell[aria-pressed="true"]');
  if(!p||!cell||isSolved(p,attempt(p).board))return;
  const value=['Backspace','Delete','0'].includes(event.key)?0:/^[1-9]$/.test(event.key)?Number(event.key):null;
  if(value!==null&&value<=p.parameters.order){event.preventDefault();if(attempt(p).board.cells[Number(cell.dataset.cell)]!==value)applyPair(p,{type:'set',cell:Number(cell.dataset.cell),value});}
});
document.addEventListener('click',event=>{
  if(event.target.closest('.skip-link')){event.preventDefault();const main=document.querySelector('#main');main?.setAttribute('tabindex','-1');main?.focus();return;}
  const control=event.target.closest('[data-action]');if(!control)return;const action=control.dataset.action,p=puzzle(),a=p&&profile()?attempt(p):null;
  if(action==='home')go(profile()?'map':'profiles');
  else if(action==='profiles')go('profiles');
  else if(action==='map')go('map');
  else if(action==='library')go('library');
  else if(action==='journal')go('journal');
  else if((action==='start-journey'||action==='continue-journey')&&profile()){if(!getProgress(profile()).started)startJourney(profile());save();openEncounter();}
  else if(action==='open-encounter'&&profile()){currentDialog?.close();openEncounter(control.dataset.id);}
  else if(action==='finish-encounter'&&profile()){
    const encounter=activeEncounter();
    if(!encounter||!isSolved(p,a.board))return;
    recordSolve(profile(),p.id,encounter.id,puzzles);save();
    // Keep moving within a stop; a newly lit stop, a replay or a side puzzle returns to the map.
    const next=continueAfter(profile(),encounter,p.band);
    if(next&&p.band===profile().band)openEncounter(next.id);
    else go('map');
  }
  else if(action==='stop-sheet'&&profile()){const stop=stopOf(control.dataset.id);if(stop)dialog(stop.title,stopSheet(stop.id,profile(),puzzles),[{label:'Done'}]);}
  else if(action==='finale'&&profile())go('finale');
  else if(action==='switch-band'&&profile()&&BAND_KEYS.includes(control.dataset.id)){profile().band=control.dataset.id;save();go('map');}
  else if(action==='hear-story'&&profile()&&control.dataset.text)narrate(control.dataset.text,control.dataset.voice);
  else if(action==='families')document.querySelector('.family-adventures')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  else if(action==='choose-profile'){state.activeProfileId=control.dataset.id;sessionCompleted=new Set();save();go('map');}
  else if(action==='open-puzzle')openPuzzle(control.dataset.id);
  else if(action==='parents-gate')dialog('Grown-ups','',[{label:'Back to play'},{label:'I’m a grown-up',run:()=>go('parents')}]);
  else if(action==='change-band')dialog('Puzzle level',`<div class="grade-options road-trails">${trailOptions(profile())}</div>`,[{label:'Cancel'},{label:'Apply',run:d=>{profile().band=d.querySelector('input[name=band]:checked').value;save();render();}}]);
  else if(action==='tile-cell'&&p?.mechanic==='tile'){
    if(control.classList.contains('garden-domino')||control.classList.contains('planted')||event.detail===0)tapTile(p,Number(control.dataset.cell));
  }
  else if(action==='cup'&&p?.mechanic==='swap'){const cell=Number(control.dataset.cell);if(selected===cell){selected=null;render();}else if(selected===null){selected=cell;message='';render();}else applyPair(p,[selected,cell]);}
  else if(action==='latin-cell'&&p?.mechanic==='latin'){selected=Number(control.dataset.cell);message='';render();}
  else if(action==='mechanic-ui'&&p&&a&&isExpansion(p)){try{mechanicFor(p).ui?.(p,JSON.parse(control.dataset.ui));}catch{}message='';render();}
  else if(action==='expansion-move'&&p&&a){try{applyPair(p,JSON.parse(control.dataset.move));}catch{message='Choose a move using the controls above.';render();}}
  else if(action==='swap-pair'&&p?.mechanic==='swap')applyPair(p,control.dataset.pair.split(',').map(Number));
  else if(action==='undo'&&a&&!(isExpansion(p)&&mechanicFor(p).noUndo?.(p))){let next=undo(a);if(isExpansion(p)&&mechanicFor(p).carry&&next!==a)next={...next,board:mechanicFor(p).carry(p,a.board,next.board)};put(p,next);selected=null;tileSelection=[];highlighted=null;message='';if(p.mechanic==='clock')clockTimeline.restore(p,next.board.prediction);else render();}
  else if((action==='restart'||action==='replay')&&a){const encounter=activeEncounter(),next=restart(p,a);reaction=null;solveResult=null;if(isExpansion(p))mechanicFor(p).reset?.(p);put(p,next);selected=null;tileSelection=[];highlighted=null;message='';if(action==='replay'&&encounter&&!p.campaignOnly)go(`play/${p.id}`);else if(p.mechanic==='clock')clockTimeline.restore(p,next.board.prediction);else render();}
  else if(action==='hint'&&a){const next={...a,hintLevel:Math.min(a.hintLevel+1,3),helpUsed:true};put(p,next);const h=nextHint(p,next);highlighted=next.hintLevel>=2&&h.type==='move'?h.pair:null;message='';if(activeEncounter())reaction={key:location.hash,kind:'hint',n:next.hintLevel};render();}
  else if(action==='apply-hint'&&a){const h=nextHint(p,a);if(h.type==='move')applyPair(p,h.action||h.pair);}
  else if(action==='rescue'&&a&&!(isExpansion(p)&&mechanicFor(p).noUndo?.(p))){put(p,undoToSolvable(p,a));selected=null;highlighted=null;message='';render();}
  else if(action==='puzzle-notes'&&p)dialog(p.title,`<div class="note-body">${notesHTML(p,pack)}</div>`);
  else if(action==='speak'&&p)speak(p);
  else if(action==='demo'&&p)dialog('How to play',`<p>${esc(puzzleObjective(p))}</p><p>${esc(instructions(p))}</p>${isExpansion(p)?`${mechanicFor(p).help?.(p,a)||''}<details><summary>Rules</summary><ul>${p.rules.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></details>`:''}${p.band==='proofs'||p.proof?'':`<details><summary>For grown-ups</summary>${notesHTML(p,pack)}</details>`}`);
  else if(action==='export'){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`math-adventure-saves-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  else if(action==='import')document.querySelector('#import-file').click();
  else if(action==='delete-profile'){const target=state.profiles.find(pr=>pr.id===control.dataset.id);dialog(`Delete ${target.name}’s save?`,'<p>This removes this explorer’s progress here. Export a backup first if you want to keep it.</p>',[{label:'Keep save'},{label:'Delete this save',danger:true,run:()=>{state.profiles=state.profiles.filter(pr=>pr.id!==target.id);if(state.activeProfileId===target.id)state.activeProfileId=state.profiles[0]?.id||null;save();try{storage.removeItem(BACKUP_KEY);}catch{}render();}}]);}
  else if(action==='clear')dialog('Clear all adventure saves?','<p>This removes every explorer and their progress here, including the recovery copy. Other websites’ data is untouched. Export first if you want a backup.</p>',[{label:'Keep my saves'},{label:'Clear adventure data',danger:true,run:()=>{try{storage.removeItem(SAVE_KEY);storage.removeItem(BACKUP_KEY);state=emptyStore();warning='';sessionCompleted=new Set();go('profiles');}catch{warning='This browser did not allow data to be cleared.';render();}}}]);
  else if(action==='print')window.print();
});
function navigate(){if(!state||viewState.isCurrent())return;focusDone=false;selected=null;tileSelection=[];tileGesture=null;highlighted=null;message='';reaction=null;if(solveResult?.key!==location.hash)solveResult=null;window.speechSynthesis?.cancel();voiceClip?.pause();render();const heading=document.querySelector('#completion-heading')||document.querySelector('#main h1');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});if(route()[0]==='play'&&profile()?.sound&&puzzle()){const line=document.querySelector('.lr-listen');if(line)narrate(line.dataset.text,line.dataset.voice);else speak(puzzle());}}
// Restore on popstate before native history scrolling; hashchange also covers
// direct hash edits. A traversal can fire both, so render each entry only once.
window.addEventListener('popstate',navigate);
window.addEventListener('hashchange',navigate);
window.addEventListener('storage',event=>{if(event.key===SAVE_KEY||event.key===null){clockTimeline.leave();const loaded=loadStore(storage,puzzles);state=loaded.store;warning=loaded.warning;selected=null;highlighted=null;activePlay=null;render();}});
function setOfflineMessage(text){pwaMessage=text;const node=document.querySelector('#offline-status');if(node)node.textContent=text;}
async function setupOffline(){
  if(!window.isSecureContext||!('serviceWorker'in navigator)){setOfflineMessage('Offline install needs HTTPS');return;}
  try{const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;if(registration.waiting)setOfflineMessage('Update ready · close every app tab and reopen');const worker=registration.active;if(worker){const channel=new MessageChannel();channel.port1.onmessage=e=>setOfflineMessage(registration.waiting?'Update ready · close every app tab and reopen':e.data?.ready?'Ready for offline play':'Offline copy is still preparing');worker.postMessage({type:'CHECK_READY'},[channel.port2]);}registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)setOfflineMessage('Update ready · close every app tab and reopen');});});}catch{setOfflineMessage('Offline setup unavailable · online play works');}
}
function registerTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();for(const tool of [{name:'read_adventure_progress',description:'Read the active explorer’s trail and completed puzzle IDs without changing saves.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||Object.keys(input).length)throw Error('Expected an empty object.');const pr=profile();return pr?{name:pr.name,band:pr.band,completed:Object.entries(pr.attempts).filter(([,a])=>a.completed).map(([id])=>id)}:{profile:null};}},{name:'open_adventure_puzzle',description:'Open an authored puzzle for the active explorer, creating or resuming its saved attempt without solving it.',inputSchema:{type:'object',properties:{puzzleId:{type:'string'}},required:['puzzleId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input){if(!input||Object.keys(input).length!==1||typeof input.puzzleId!=='string'||!puzzles.some(p=>p.id===input.puzzleId&&!p.campaignOnly)||!profile())throw Error('Choose an existing puzzle and active explorer.');openPuzzle(input.puzzleId);await new Promise(resolve=>setTimeout(resolve,0));return {puzzleId:input.puzzleId,status:'opened'};}}]){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
// Family stylesheets (dist/families.js) go before the caravan styles, as the
// static links once did, and load before the first render.
function familyStyles(){const anchor=document.querySelector('link[href="./caravan.css"]');return Promise.all(FAMILIES.filter(m=>m.css).map(m=>new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href=m.css;link.onload=link.onerror=resolve;if(anchor)anchor.before(link);else document.head.append(link);})));}
async function loadPack(url){const response=await fetch(url);if(!response.ok)throw Error(`Puzzle pack unavailable: ${url}`);return response.json();}
try{const styles=familyStyles();const [base,...packs]=await Promise.all([loadPack('./puzzles.json'),...FAMILIES.filter(m=>m.pack).map(m=>loadPack(m.pack))]);pack=mergePacks(base,packs);puzzles=withCampaignPuzzles(pack.puzzles);await Promise.all([loadArt(),styles]);const loaded=loadStore(storage,puzzles);state=loaded.store;warning=loaded.warning;render();setupOffline();registerTools();}catch(error){app.innerHTML='<main class="shell"><section class="panel"><h1>The island couldn’t load.</h1><p class="spaced">Connect to the internet for the first visit, then try again. Your saved progress has not been changed.</p><button class="primary" onclick="location.reload()">Try again</button></section></main>';console.error(error);}
