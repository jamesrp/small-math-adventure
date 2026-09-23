import {isExpansion,mechanicFor,playInstructions} from './expansion.js';
import {puzzleObjective} from './puzzle-copy.js';
import { BANDS,freshAttempt,resumeAttempt,isSolved,nextHint,move,removeTile,undo,restart,undoToSolvable } from './engine.js';
import { SAVE_KEY,BACKUP_KEY,emptyStore,loadStore,persistStore,parseBackup,importProfiles } from './storage.js';
import { esc,bandOptions,playView,parentView,catalogHTML,notesHTML } from './ui.js';
import { COMPANIONS, getProgress, getEncounter, startJourney, chooseRoute, beginEncounter, completeEncounter } from './caravan.js';
import { caravanHeader, caravanProfiles, caravanMap, journalView, companionBody, libraryView } from './caravan-ui.js';
const app=document.querySelector('#app');
let pack,puzzles,state,warning='',selected=null,highlighted=null,message='',checker=false,pwaMessage='Preparing offline play…',currentDialog;
let sessionCompleted=new Set(),activePlay=null;
let storage;
try{storage=window.localStorage;}catch{storage={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};}
const uid=()=>globalThis.crypto?.randomUUID?.()||`explorer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const profile=()=>state.profiles.find(p=>p.id===state.activeProfileId);
const route=()=>location.hash.slice(1).split('/');
const puzzle=()=>puzzles.find(p=>p.id===route()[1]);
const attempt=p=>profile().attempts[p.id]||freshAttempt(p);
// The encounter lives in the URL as well as the save. Free play never advances a story.
function activeEncounter(){
  const pr=profile(),p=puzzle(),id=route()[2];
  if(!pr?.journey||!p||!id||pr.journey.bindings[id]!==p.id)return null;
  const progress=getProgress(pr,puzzles);
  return pr.journey.completed.includes(id)||progress.encounter?.id===id?getEncounter(id,pr.journey):null;
}
function save(){warning=persistStore(storage,state,puzzles);}
function put(p,a){profile().attempts[p.id]=a;save();}
function go(hash){selected=null;highlighted=null;message='';if(location.hash===`#${hash}`)render();else location.hash=hash;}
function render(){
  const focus=document.activeElement?.dataset?.focus,focusedPair=document.activeElement?.dataset?.pair,view=route()[0],pr=profile(),p=puzzle();
  const playKey=view==='play'&&pr&&p?`${pr.id}/${location.hash}`:null;
  if(playKey!==activePlay){
    activePlay=playKey;
    if(playKey){pr.attempts[p.id]=resumeAttempt(p,pr.attempts[p.id]);save();}
  }
  const encounter=activeEncounter();
  const content=view==='parents'?parentView(state,pr,pack,pwaMessage):!pr||view==='profiles'?caravanProfiles(state,puzzles):view==='journal'?journalView(pr,puzzles):view==='library'?libraryView(pr,puzzles):view==='play'&&p?playView(p,attempt(p),{pack,profile:pr,encounter,selected,highlighted,message,checker,sessionCount:sessionCompleted.size}):caravanMap(pr,puzzles);
  document.body.dataset.view=view||'map';
  document.body.classList.toggle('on-encounter',Boolean(encounter));
  app.innerHTML=caravanHeader(pr,view==='library'||(view==='play'&&!encounter)?'library':view==='journal'?'journal':'journey')+(warning?`<div class="error-banner" role="status">${esc(warning)}</div>`:'')+`<main class="shell" id="main">${content}</main>`;
  if(focus){let target=(focusedPair?app.querySelector(`[data-pair="${CSS.escape(focusedPair)}"]`):app.querySelector(`[data-focus="${CSS.escape(focus)}"]`));if(!target||target.disabled)target=app.querySelector('.latin-cell[aria-pressed="true"]:not(:disabled)')||app.querySelector('.nim-status')||app.querySelector('#completion-heading');target?.focus({preventScroll:true});}
  wireForms();
}
function wireForms(){
  document.querySelectorAll('form[data-puzzle-form]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const p=puzzle();if(p&&profile())applyPair(p,Object.fromEntries(new FormData(e.currentTarget)));}));
  document.querySelector('#profile-form')?.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.currentTarget),name=String(data.get('name')).trim();if(!name){document.querySelector('#nickname').focus();return;}if(state.profiles.length>=30){dialog('All save slots are full','<p>There is room for 30 explorers. Export and remove an unused save in the grown-up area.</p>');return;}const pr={id:uid(),name,band:data.get('band'),avatar:Number(data.get('avatar')),sound:false,attempts:{}};state.profiles.push(pr);state.activeProfileId=pr.id;save();go('map');});
  document.querySelector('#checker')?.addEventListener('change',e=>{checker=e.target.checked;document.querySelector('.tile-board')?.classList.toggle('show-checker',checker);});
  document.querySelector('#catalog-band')?.addEventListener('change',e=>document.querySelector('#catalog-list').innerHTML=catalogHTML(e.target.value,pack,profile()));
  document.querySelector('#sound-toggle')?.addEventListener('change',e=>{profile().sound=e.target.checked;save();render();});
  document.querySelector('#import-file')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error('Choose a backup smaller than 5 MB.');const backup=parseBackup(await file.text(),puzzles),next=importProfiles(state,backup,uid);state=next;save();render();dialog('Saves restored',`<p>${backup.profiles.length} ${backup.profiles.length===1?'explorer was':'explorers were'} added. Existing explorers are unchanged.</p>`);}catch(error){dialog('That backup could not be opened',`<p>${esc(error.message)}</p><p>Your existing saves have not changed.</p>`);}});
}
function dialog(title,body,actions=[{label:'Done'}]){
  currentDialog?.close();const previous=document.activeElement,d=document.createElement('dialog');d.className='modal';d.innerHTML=`<h2 id="dialog-title">${esc(title)}</h2><div class="dialog-body">${body}</div><div class="dialog-actions"></div>`;d.setAttribute('aria-labelledby','dialog-title');document.body.append(d);currentDialog=d;
  for(const [i,action]of actions.entries()){const b=document.createElement('button');b.type='button';b.className=action.danger?'danger':i===actions.length-1?'primary':'secondary';b.textContent=action.label;b.addEventListener('click',()=>{if(action.run?.(d)===false)return;d.close();});d.querySelector('.dialog-actions').append(b);}
  d.addEventListener('close',()=>{d.remove();if(currentDialog===d)currentDialog=null;if(previous?.isConnected)previous.focus();});d.showModal();return d;
}
function instructions(p){
  return isExpansion(p)?playInstructions(p):p.mechanic==='tile'?'Tap two neighboring empty squares to place a domino. Tap a domino to remove it.':'Tap two cups to swap them. Only the listed pairs can swap.';
}
function speak(p){
  if(!('speechSynthesis'in window)){message='Read-aloud unavailable. Open How to play.';render();return;}
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(`${puzzleObjective(p)} ${instructions(p)}`);utterance.rate=.85;
  utterance.onerror=event=>{if(['interrupted','canceled'].includes(event.error))return;message='Read-aloud unavailable. Open How to play.';render();};
  window.speechSynthesis.speak(utterance);
}
function narrate(text){
  if(!('speechSynthesis' in window)){dialog('Read the story together',`<p>${esc(text)}</p>`);return;}
  window.speechSynthesis.cancel();
  const voice=new SpeechSynthesisUtterance(text);voice.rate=.86;
  voice.onerror=event=>{if(!['interrupted','canceled'].includes(event.error))dialog('Read the story together',`<p>${esc(text)}</p>`);};
  window.speechSynthesis.speak(voice);
}
function openPuzzle(id){const p=puzzles.find(p=>p.id===id);if(!p||!profile())return;if(!profile().attempts[id])profile().attempts[id]=freshAttempt(p);save();go(`play/${id}`);}
function openEncounter(id){
  if(!profile())return;
  const next=beginEncounter(profile(),puzzles,id);
  if(!next){go('map');return;}
  if(!profile().attempts[next.puzzle.id])profile().attempts[next.puzzle.id]=freshAttempt(next.puzzle);
  save();go(`play/${next.puzzle.id}/${next.encounter.id}`);
}
function applyPair(p,pair){const a=attempt(p),encounter=activeEncounter(),next=move(p,a,pair);selected=p.mechanic==='latin'?Number(pair.cell):null;highlighted=null;if(!next){message=isExpansion(p)?'That move is not allowed. Check How to play.':p.mechanic==='tile'?'Choose two empty patches that share a side.':'Choose a listed pair.';render();return;}message='';if(isSolved(p,next.board)&&!a.completed)sessionCompleted.add(p.id);profile().attempts[p.id]=next;if(encounter&&isSolved(p,next.board))completeEncounter(profile(),p.id,encounter.id,puzzles);save();render();if(isSolved(p,next.board))document.querySelector('#completion-heading')?.focus({preventScroll:true});}
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
  else if(action==='start-journey'&&profile()){startJourney(profile());openEncounter();}
  else if(action==='continue-journey'&&profile()){if(!profile().journey?.started)startJourney(profile());openEncounter();}
  else if(action==='open-encounter'&&profile())openEncounter(control.dataset.id);
  else if(action==='choose-route'&&profile()){if(chooseRoute(profile(),control.dataset.route)){save();go('map');}}
  else if(action==='finish-encounter'&&profile()){const encounter=activeEncounter();if(encounter)completeEncounter(profile(),p.id,encounter.id,puzzles);save();go('map');}
  else if(action==='companion'&&profile()){const companion=COMPANIONS.find(c=>c.id===control.dataset.id);if(companion)dialog(companion.name,companionBody(companion.id,profile(),puzzles));}
  else if(action==='show-story'&&profile()){const e=activeEncounter();if(e)dialog('Story',`<p>${esc(e.intro)}</p><button class="text-button" data-action="hear-story" data-text="${esc(e.intro)}">Listen</button>`);}
  else if(action==='hear-story'&&profile()){
    const encounter=activeEncounter(),progress=getProgress(profile(),puzzles);
    const text=control.dataset.text||(encounter?`${encounter.title}. ${encounter.intro}`:`${progress.chapter.title}. ${progress.chapter.description}`);
    narrate(text);
  }
  else if(action==='families')document.querySelector('.family-adventures')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  else if(action==='choose-profile'){state.activeProfileId=control.dataset.id;sessionCompleted=new Set();save();go('map');}
  else if(action==='open-puzzle')openPuzzle(control.dataset.id);
  else if(action==='parents-gate')dialog('Grown-ups','',[{label:'Back to play'},{label:'I’m a grown-up',run:()=>go('parents')}]);
  else if(action==='change-band')dialog('Puzzle level',`<p>For future encounters.</p><div class="grade-options">${bandOptions(profile().band)}</div>`,[{label:'Cancel'},{label:'Apply',run:d=>{profile().band=d.querySelector('input[name=band]:checked').value;save();render();}}]);
  else if(action==='tile-cell'&&p?.mechanic==='tile'){const cell=Number(control.dataset.cell);if(a.board.some(pair=>pair.includes(cell))){put(p,removeTile(p,a,cell));selected=null;highlighted=null;message='';render();}else if(selected===cell){selected=null;render();}else if(selected===null){selected=cell;message='';render();}else applyPair(p,[selected,cell]);}
  else if(action==='cup'&&p?.mechanic==='swap'){const cell=Number(control.dataset.cell);if(selected===cell){selected=null;render();}else if(selected===null){selected=cell;message='';render();}else applyPair(p,[selected,cell]);}
  else if(action==='latin-cell'&&p?.mechanic==='latin'){selected=Number(control.dataset.cell);message='';render();}
  else if(action==='expansion-move'&&p&&a){try{applyPair(p,JSON.parse(control.dataset.move));}catch{message='Choose a move using the controls above.';render();}}
  else if(action==='swap-pair'&&p?.mechanic==='swap')applyPair(p,control.dataset.pair.split(',').map(Number));
  else if(action==='undo'&&a){put(p,undo(a));selected=null;highlighted=null;message='';render();}
  else if((action==='restart'||action==='replay')&&a){const encounter=activeEncounter();put(p,restart(p,a));selected=null;highlighted=null;message='';if(action==='replay'&&encounter)go(`play/${p.id}`);else render();}
  else if(action==='hint'&&a){const next={...a,hintLevel:Math.min(a.hintLevel+1,3),helpUsed:true};put(p,next);const h=nextHint(p,next);highlighted=next.hintLevel>=2&&h.type==='move'?h.pair:null;message='';render();}
  else if(action==='apply-hint'&&a){const h=nextHint(p,a);if(h.type==='move')applyPair(p,h.action||h.pair);}
  else if(action==='rescue'&&a){put(p,undoToSolvable(p,a));selected=null;highlighted=null;message='';render();}
  else if(action==='puzzle-notes'&&p)dialog(p.title,`<div class="note-body">${notesHTML(p,pack)}</div>`);
  else if(action==='speak'&&p)speak(p);
  else if(action==='demo'&&p)dialog('How to play',`<p>${esc(puzzleObjective(p))}</p><p>${esc(instructions(p))}</p>${isExpansion(p)?`${mechanicFor(p).help?.(p,a)||''}<details><summary>Rules</summary><ul>${p.rules.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></details>`:''}<details><summary>For grown-ups</summary>${notesHTML(p,pack)}</details>`);
  else if(action==='export'){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`math-adventure-saves-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  else if(action==='import')document.querySelector('#import-file').click();
  else if(action==='delete-profile'){const target=state.profiles.find(pr=>pr.id===control.dataset.id);dialog(`Delete ${target.name}’s save?`,'<p>This removes this explorer’s progress here. Export a backup first if you want to keep it.</p>',[{label:'Keep save'},{label:'Delete this save',danger:true,run:()=>{state.profiles=state.profiles.filter(pr=>pr.id!==target.id);if(state.activeProfileId===target.id)state.activeProfileId=state.profiles[0]?.id||null;save();try{storage.removeItem(BACKUP_KEY);}catch{}render();}}]);}
  else if(action==='clear')dialog('Clear all adventure saves?','<p>This removes every explorer and their progress here, including the recovery copy. Other websites’ data is untouched. Export first if you want a backup.</p>',[{label:'Keep my saves'},{label:'Clear adventure data',danger:true,run:()=>{try{storage.removeItem(SAVE_KEY);storage.removeItem(BACKUP_KEY);state=emptyStore();warning='';sessionCompleted=new Set();go('profiles');}catch{warning='This browser did not allow data to be cleared.';render();}}}]);
  else if(action==='print')window.print();
});
window.addEventListener('hashchange',()=>{selected=null;highlighted=null;message='';window.speechSynthesis?.cancel();render();window.scrollTo(0,0);const heading=document.querySelector('#completion-heading')||document.querySelector('#main h1');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});if(route()[0]==='play'&&profile()?.sound&&puzzle())speak(puzzle());});
window.addEventListener('storage',event=>{if(event.key===SAVE_KEY||event.key===null){const loaded=loadStore(storage,puzzles);state=loaded.store;warning=loaded.warning;selected=null;highlighted=null;activePlay=null;render();}});
function setOfflineMessage(text){pwaMessage=text;const node=document.querySelector('#offline-status');if(node)node.textContent=text;}
async function setupOffline(){
  if(!window.isSecureContext||!('serviceWorker'in navigator)){setOfflineMessage('Offline install needs HTTPS');return;}
  try{const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;if(registration.waiting)setOfflineMessage('Update ready · close every app tab and reopen');const worker=registration.active;if(worker){const channel=new MessageChannel();channel.port1.onmessage=e=>setOfflineMessage(registration.waiting?'Update ready · close every app tab and reopen':e.data?.ready?'Ready for offline play':'Offline copy is still preparing');worker.postMessage({type:'CHECK_READY'},[channel.port2]);}registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)setOfflineMessage('Update ready · close every app tab and reopen');});});}catch{setOfflineMessage('Offline setup unavailable · online play works');}
}
function registerTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();for(const tool of [{name:'read_adventure_progress',description:'Read the active explorer’s trail and completed puzzle IDs without changing saves.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||Object.keys(input).length)throw Error('Expected an empty object.');const pr=profile();return pr?{name:pr.name,band:pr.band,completed:Object.entries(pr.attempts).filter(([,a])=>a.completed).map(([id])=>id)}:{profile:null};}},{name:'open_adventure_puzzle',description:'Open an authored puzzle for the active explorer, creating or resuming its saved attempt without solving it.',inputSchema:{type:'object',properties:{puzzleId:{type:'string'}},required:['puzzleId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input){if(!input||Object.keys(input).length!==1||typeof input.puzzleId!=='string'||!puzzles.some(p=>p.id===input.puzzleId)||!profile())throw Error('Choose an existing puzzle and active explorer.');openPuzzle(input.puzzleId);await new Promise(resolve=>setTimeout(resolve,0));return {puzzleId:input.puzzleId,status:'opened'};}}]){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
try{const response=await fetch('./puzzles.json');if(!response.ok)throw Error('Puzzle pack unavailable');pack=await response.json();puzzles=pack.puzzles;const loaded=loadStore(storage,puzzles);state=loaded.store;warning=loaded.warning;render();setupOffline();registerTools();}catch(error){app.innerHTML='<main class="shell"><section class="panel"><h1>The island couldn’t load.</h1><p class="spaced">Connect to the internet for the first visit, then try again. Your saved progress has not been changed.</p><button class="primary" onclick="location.reload()">Try again</button></section></main>';console.error(error);}
