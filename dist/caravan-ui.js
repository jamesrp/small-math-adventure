import {BANDS} from './engine.js';
import {COMPANIONS,CHAPTERS,getProgress,getEncounter} from './caravan.js';
import {companionSvg,lanternSvg} from './caravan-art.js';
import {roadMap,lanternTree} from './road-art.js';
import * as legacy from './caravan-legacy.js';
import * as rescue from './caravan-rescue.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='',extra='')=>`<button type="button" class="${cls}" data-action="${action}" data-focus="action-${action}" ${extra}>${label}</button>`;
const symbols=['✦','☀','❋','◆','☾','✿'];
const familySymbols={tile:'▰',swap:'⇄',toggle:'☀',clock:'◷',billiard:'↗',route:'♧',latin:'▦',code:'◐',nim:'●',color:'◆',jug:'♒',weigh:'⚖'};
const familyNames={tile:'Tile gardens',swap:'Cup swaps'};
const levelButton=profile=>button(`Grades ${esc(BANDS[profile.band]?.label)} <span aria-hidden="true">⌄</span>`,'change-band','trail-choice');

export function caravanHeader(profile,active='journey'){
 return `<a href="#main" class="skip-link">Skip to adventure</a><header class="topbar caravan-topbar"><button type="button" class="caravan-brand" data-action="home" aria-label="The Lantern Caravan home"><span class="caravan-brand-mark">${lanternSvg()}</span><strong>The Lantern<br>Caravan</strong></button>${profile?`<nav class="caravan-nav" aria-label="Main navigation">${button('Road','map',active==='journey'?'active':'',active==='journey'?'aria-current="page"':'')}${button('Puzzles','library',active==='library'?'active':'',active==='library'?'aria-current="page"':'')}</nav>`:''}<div class="caravan-account">${profile?button(`<span class="caravan-avatar" aria-hidden="true">${symbols[profile.avatar]||'✦'}</span><span class="profile-label">${esc(profile.name)}</span>`,'profiles','profile-nav',`aria-label="Choose explorer: ${esc(profile.name)}"`):''}${button('Grown-ups','parents-gate','quiet grownup-link')}</div></header>`;
}
function profileForm(){
 return `<form id="profile-form"><div class="form-row"><label class="field" for="nickname">Name</label><input class="text-input" id="nickname" name="name" maxlength="24" autocomplete="off" required></div><fieldset class="avatar-picker"><legend class="field">Symbol</legend>${symbols.map((s,i)=>`<label><input type="radio" name="avatar" value="${i}" ${i===0?'checked':''}><span aria-label="Symbol ${i+1}">${s}</span></label>`).join('')}</fieldset><fieldset><legend class="field">Puzzle level</legend><div class="grade-options">${['k1','23','45'].map(key=>`<label class="grade-option"><input type="radio" name="band" value="${key}" ${key==='k1'?'checked':''}><strong>${BANDS[key].label}</strong></label>`).join('')}</div></fieldset><button class="primary caravan-cta wide" type="submit">Start <span aria-hidden="true">→</span></button></form>`;
}
export function caravanProfiles(state){
 return `<section class="caravan-welcome"><div class="welcome-story" aria-hidden="true"><div class="welcome-art">${roadMap(null,null,{preview:true})}<svg class="welcome-tree" viewBox="-95 -150 190 200">${lanternTree(0,0,1)}</svg></div><div class="welcome-crew">${COMPANIONS.map(c=>companionSvg(c.id)).join('')}</div></div><div class="welcome-boarding"><h1>${state.profiles.length?'Choose an explorer':'New explorer'}</h1>${state.profiles.length?`<div class="caravan-saved-profiles">${state.profiles.map(pr=>`<button type="button" class="caravan-profile-card" data-action="choose-profile" data-id="${esc(pr.id)}"><span class="caravan-avatar" aria-hidden="true">${symbols[pr.avatar]||'✦'}</span><strong>${esc(pr.name)}</strong><span class="profile-arrow" aria-hidden="true">→</span></button>`).join('')}</div><details class="caravan-add-profile" data-view-key="new-explorer"><summary>New explorer</summary>${profileForm()}</details>`:profileForm()}</div></section>`;
}
function crewRow(){
 return `<section class="caravan-crew" aria-label="Companions"><div class="crew-members">${COMPANIONS.map(c=>`<button type="button" class="crew-member" data-action="companion" data-id="${esc(c.id)}" aria-label="About ${esc(c.name)}">${companionSvg(c.id)}<strong>${esc(c.name)}</strong></button>`).join('')}</div></section>`;
}
export function caravanMap(profile,puzzles){
 const progress=getProgress(profile,puzzles),started=profile.journey?.started;
 return `<section class="road-overview"><h1 class="sr-only">The lantern road</h1><div class="road-toolbar">${levelButton(profile)}${button('Journal','journal','road-journal')}</div>${!started?'<p class="road-opening">Carry the lantern tree along the road. Light every stop.</p>':''}<div class="road-atlas"><div class="road-next">${progress.complete?'<p class="road-finale" role="status">The lantern road is lit.</p>':button(`${esc(progress.chapter.title)} <span aria-hidden="true">→</span>`,started?'continue-journey':'start-journey','primary caravan-cta',`aria-label="${started?'Continue at':'Start at'} ${esc(progress.chapter.title)}"`)}</div>${roadMap(progress,profile)}</div>${crewRow()}</section>`;
}
export function encounterCompletion(encounter,profile,puzzles){
 const chapter=CHAPTERS[encounter.chapterIndex],last=chapter?.encounters.at(-1)?.id===encounter.id;
 const finished=getProgress(profile,puzzles).complete,latest=profile.journey?.completed.at(-1)===encounter.id;
 return `<section class="completion-card caravan-completion" aria-label="Puzzle completed"><h2 id="completion-heading" tabindex="-1" class="sr-only">${esc(encounter.success||'Solved')}</h2>${button(`${finished||last||!latest?'See the road':'Next'} <span aria-hidden="true">→</span>`,'finish-encounter','primary caravan-cta')}${button('Replay','replay','text-button')}</section>`;
}
function archive(journey,module,label,key){
 if(!journey)return '';
 const entries=(journey.completed||[]).map(id=>module.getEncounter(id,journey)).filter(Boolean);
 return `<details class="earlier-journey" data-view-key="${key}"><summary>${label}</summary>${entries.map(e=>`<article class="journal-entry"><h3>${esc(e.keepsake?.title||e.title)}</h3><p>${esc(e.keepsake?.text||e.success)}</p></article>`).join('')||'<p>No entries.</p>'}</details>`;
}
export function journalView(profile){
 const completed=profile.journey?.completed||[];
 return `<div class="journal-layout"><h1 class="sr-only">Journal</h1><section class="journal-pages" aria-label="Journey memories">${!completed.length?'<p class="journal-empty">No stops lit yet.</p>':CHAPTERS.map(chapter=>{
  const entries=chapter.encounters.filter(e=>completed.includes(e.id)).map(e=>getEncounter(e.id,profile.journey));
  if(!entries.length)return '';
  return `<section class="journal-chapter"><h2>${esc(chapter.title)}</h2>${entries.map(e=>`<article class="journal-entry"><div><p>${esc(e.success)}</p>${button('Revisit','open-encounter','text-button',`data-id="${esc(e.id)}" aria-label="Revisit ${esc(e.title)}"`)}</div></article>`).join('')}</section>`;
 }).join('')}${archive(profile.caravanJourney,legacy,'Earlier caravan journey','caravan-archive')}${archive(profile.rescueJourney,rescue,'Earlier citadel journey','rescue-archive')}</section></div>`;
}
export function companionBody(id){
 const c=COMPANIONS.find(c=>c.id===id)||COMPANIONS[0];
 const descriptions={fern:'Fern tends the lantern tree. She carries seeds from each garden along the road.',bea:'Bea builds and repairs the road’s mechanisms. Her hat is full of useful screws.'};
 return `<div class="companion-biography">${companionSvg(c.id)}<p>${esc(descriptions[id]||c.description)}</p></div>`;
}
// Proof puzzles (band "proofs") join their family's satchel as a Proofs group
// above the grade or difficulty groups.
export function libraryView(profile,puzzles){
 puzzles=puzzles.filter(p=>!p.campaignOnly);
 const familyOf=p=>p.libraryFamily||p.mechanic;
 const families=[...new Set(puzzles.map(familyOf))];
 return `<h1 class="sr-only">Puzzles</h1><div class="caravan-library">${families.map(id=>{
  const family=puzzles.filter(p=>familyOf(p)===id),core=family.filter(p=>p.band!=='proofs'),title=(core[0]||family[0]).familyTitle||familyNames[id]||id;
  const graded=core.some(p=>p.band!=='all'),labels={easy:'Easy',medium:'Medium',hard:'Hard',proofs:'Proofs'};
  const groups=[...(family.some(p=>p.band==='proofs')?['proofs']:[]),...(graded?['k1','23','45']:['easy','medium','hard'])];
  return `<details class="satchel-family" data-view-key="family-${esc(id)}" ${id==='toggle'?'open':''}><summary><span class="family-ink-symbol" aria-hidden="true">${familySymbols[id]||'✦'}</span><strong>${esc(title)}</strong><span class="family-expand" aria-hidden="true">+</span></summary><div class="satchel-family-content">${groups.map(group=>{
   const proofs=group==='proofs';
   const list=family.filter(p=>proofs?p.band==='proofs':p.band!=='proofs'&&(graded?p.band===group:p.difficulty_level===group)).sort((a,b)=>a.number-b.number);
   if(!list.length)return '';
   const name=proofs?labels.proofs:graded?`Grades ${BANDS[group].label}`:labels[group];
   return `<div class="library-band${proofs?' library-proofs':''}"><h2>${name}</h2><div class="puzzle-grid">${list.map(p=>{
    const a=profile.attempts[p.id];
    return `<button type="button" class="puzzle-card ${a?.completed?'complete':''}" data-action="open-puzzle" data-id="${esc(p.id)}" aria-label="${esc(title)}, ${proofs?'proofs':graded?`grades ${BANDS[group].label}`:labels[group]}, puzzle ${p.number}${a?.completed?', completed':a?', in progress':''}"><strong>${String(p.number).padStart(2,'0')}</strong>${a?.completed?'<span class="puzzle-check" aria-hidden="true">✓</span>':''}</button>`;
   }).join('')}</div></div>`;
  }).join('')}</div></details>`;
 }).join('')}</div>`;
}
