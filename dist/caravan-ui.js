import {BANDS} from './engine.js';
import {PARTY} from './road-cast.js';
import {companionSvg,lanternSvg} from './caravan-art.js';
import {mapArt} from './road-placeholders.js';
import {media,slots} from './art.js';
import {newFamilies} from './families.js';
import {MAIN,SIDE,BAND_KEYS,trailFor,campaignId} from './road.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='',extra='')=>`<button type="button" class="${cls}" data-action="${action}" data-focus="action-${action}" ${extra}>${label}</button>`;
const familySymbols={tile:'▰',swap:'⇄',toggle:'☀',clock:'◷',billiard:'↗',route:'♧',latin:'▦',code:'◐',nim:'●',color:'◆',jug:'♒',weigh:'⚖',...Object.fromEntries(newFamilies().map(f=>[f.id,f.symbol]))};
const familyNames={tile:'Tile gardens',swap:'Cup swaps'};

// Road, Puzzles and Journal are the three places; the explorer's name and
// puzzle level sit together on the right. On a phone the bar is one row: the
// explorer's row (name, level, Grown-ups) folds behind a button with their
// initial, which opens it below the bar (`open`, kept until the page changes).
const initial=name=>{const text=String(name||'').trim();if(!text)return '?';const first=globalThis.Intl?.Segmenter?new Intl.Segmenter().segment(text)[Symbol.iterator]().next().value.segment:Array.from(text)[0];return first.toLocaleUpperCase();};
export function caravanHeader(profile,active='journey',open=false){
 const tab=(label,action,key)=>button(label,action,active===key?'active':'',active===key?'aria-current="page"':'');
 return `<a href="#main" class="skip-link">Skip to adventure</a><header class="topbar caravan-topbar${profile?' has-explorer':''}${profile&&open?' account-open':''}"><button type="button" class="caravan-brand" data-action="home" aria-label="The Lantern Caravan home"><span class="caravan-brand-mark">${lanternSvg()}</span><strong>The Lantern<br>Caravan</strong></button>${profile?`<nav class="caravan-nav" aria-label="Main navigation">${tab('Road','map','journey')}${tab('Puzzles','library','library')}${tab('Journal','journal','journal')}</nav>${button(`<span class="caravan-avatar">${esc(initial(profile.name))}</span><span class="explorer-chevron" aria-hidden="true">⌄</span>`,'explorer-menu','explorer-toggle',`aria-expanded="${Boolean(open)}" aria-controls="caravan-account" aria-label="Explorer ${esc(profile.name)}, puzzle level and Grown-ups"`)}`:''}<div class="caravan-account" id="caravan-account">${profile?`${button(`<span class="profile-label">${esc(profile.name)}</span>`,'profiles','profile-nav',`aria-label="Choose explorer: ${esc(profile.name)}"`)}${button(`<span class="trail-word">Grades </span>${esc(BANDS[profile.band]?.label)} <span aria-hidden="true">⌄</span>`,'change-band','trail-choice',`aria-label="Puzzle level: grades ${esc(BANDS[profile.band]?.label)}"`)}`:''}${button('Grown-ups','parents-gate','quiet grownup-link')}</div></header>`;
}
// An imported explorer that shares its name with another explorer carries the
// day it arrived, "(imported Oct 24)", with the time too when another copy
// arrived the same day, so a grown-up can tell the copies apart.
export function explorerNote(profiles,pr){
 if(!Number.isFinite(pr?.importedAt))return '';
 const key=p=>String(p.name).trim().toLocaleLowerCase(),same=profiles.filter(p=>p!==pr&&key(p)===key(pr));
 if(!same.length)return '';
 const when=(time,clock)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',...(new Date(time).getFullYear()===new Date().getFullYear()?{}:{year:'numeric'}),...(clock?{hour:'numeric',minute:'2-digit'}:{})}).format(time);
 return `(imported ${when(pr.importedAt,same.some(p=>Number.isFinite(p.importedAt)&&when(p.importedAt)===when(pr.importedAt)))})`;
}
function profileForm(){
 return `<form id="profile-form"><div class="form-row"><label class="field" for="nickname">Name</label><input class="text-input" id="nickname" name="name" maxlength="24" autocomplete="off" required></div><fieldset><legend class="field">Puzzle level</legend><div class="grade-options">${['k1','23','45'].map(key=>`<label class="grade-option"><input type="radio" name="band" value="${key}" ${key==='k1'?'checked':''}><strong>${BANDS[key].label}</strong></label>`).join('')}</div></fieldset><button class="primary caravan-cta wide" type="submit">Start <span aria-hidden="true">→</span></button></form>`;
}
// `adding` (the profiles/new page, from Grown-ups' New explorer) opens the
// form; main.js puts the cursor in the name field.
export function caravanProfiles(state,adding=false){
 return `<section class="caravan-welcome"><div class="welcome-story" aria-hidden="true"><div class="welcome-art">${media(slots.map('wide'),mapArt('wide'),{key:'welcome-map',cls:'welcome-map'})}</div><div class="welcome-crew">${PARTY.map(id=>media(slots.party(id),companionSvg(id),{key:`welcome-${id}`,cls:'welcome-traveler'})).join('')}</div></div><div class="welcome-boarding"><h1>${state.profiles.length?'Choose an explorer':'New explorer'}</h1>${state.profiles.length?`<div class="caravan-saved-profiles">${state.profiles.map(pr=>{const note=explorerNote(state.profiles,pr);return `<button type="button" class="caravan-profile-card" data-action="choose-profile" data-id="${esc(pr.id)}"><strong>${esc(pr.name)}</strong>${note?`<small class="explorer-note">${esc(note)}</small>`:''}<span class="profile-arrow" aria-hidden="true">→</span></button>`;}).join('')}</div><details class="caravan-add-profile" data-view-key="new-explorer" ${adding?'open':''}><summary>New explorer</summary>${profileForm()}</details>`:profileForm()}</div></section>`;
}
// Proof puzzles (band "proofs") join their family's satchel as a Proofs group
// above the grade or difficulty groups; puzzles with a `group` name form a
// group of that name below them. A family's playground (band "playground")
// opens from a button above its groups. Every family starts closed. A family
// carries no solved/total count (AGENTS.md: no counters in puzzle selection);
// each puzzle this explorer has solved shows the road's Solved mark, a ✓.
// Order (decided October 24, docs/ROAD.md): a From the road shelf of the
// families whose boards the explorer has opened on the road (any trail), in
// road order; then the road's other families in pack order; then the families
// on the seam (dist/families.js), newest first. Inside a graded family the
// explorer's own grade comes first after Proofs.
const familyOf=p=>p.libraryFamily||p.mechanic;
export function roadFamilies(profile,puzzles){
 const byId=new Map(puzzles.map(p=>[p.id,p])),met=[];
 for(const e of [...MAIN,...SIDE])for(const band of BAND_KEYS){
  const trail=trailFor(profile,band);
  if(!trail.completed.includes(e.id)&&!trail.side.includes(e.id)&&!profile.attempts?.[campaignId(e.id,band)])continue;
  const source=byId.get(e.selection[band]),id=source?familyOf(source):e.mechanic;
  if(!met.includes(id))met.push(id);
 }
 return met;
}
export function libraryView(profile,puzzles){
 puzzles=puzzles.filter(p=>!p.campaignOnly);
 const newest=newFamilies().map(f=>f.id),present=[...new Set(puzzles.map(familyOf))];
 const shelf=roadFamilies(profile,puzzles).filter(id=>present.includes(id));
 const rest=[...present.filter(id=>!newest.includes(id)),...newest.filter(id=>present.includes(id))].filter(id=>!shelf.includes(id));
 const own=BAND_KEYS.includes(profile.band)?profile.band:null,grades=own?[own,...BAND_KEYS.filter(b=>b!==own)]:BAND_KEYS;
 const familyHTML=id=>{
  const all=puzzles.filter(p=>familyOf(p)===id),play=all.find(p=>p.band==='playground'),family=all.filter(p=>p!==play),core=family.filter(p=>p.band!=='proofs'&&!p.group),title=(core[0]||family[0]).familyTitle||familyNames[id]||id;
  const graded=core.some(p=>p.band!=='all'),labels={easy:'Easy',medium:'Medium',hard:'Hard',proofs:'Proofs'};
  const named=[...new Set(family.filter(p=>p.band!=='proofs'&&p.group).map(p=>p.group))];
  const groups=[...(family.some(p=>p.band==='proofs')?['proofs']:[]),...(graded?grades:['easy','medium','hard']),...named.map(name=>({name}))];
  return `<details class="satchel-family" data-view-key="family-${esc(id)}"><summary><span class="family-ink-symbol" aria-hidden="true">${familySymbols[id]||'✦'}</span><strong>${esc(title)}</strong><span class="family-expand" aria-hidden="true">+</span></summary><div class="satchel-family-content">${play?`<button type="button" class="satchel-playground ${profile.attempts?.[play.id]?'started':''}" data-action="open-puzzle" data-id="${esc(play.id)}"><span aria-hidden="true">${familySymbols[id]||'✦'}</span> Playground</button>`:''}${groups.map(group=>{
   const proofs=group==='proofs',custom=typeof group==='object';
   const list=family.filter(p=>custom?p.band!=='proofs'&&p.group===group.name:proofs?p.band==='proofs':p.band!=='proofs'&&!p.group&&(graded?p.band===group:p.difficulty_level===group)).sort((a,b)=>a.number-b.number);
   if(!list.length)return '';
   const name=custom?group.name:proofs?labels.proofs:graded?`Grades ${BANDS[group].label}`:labels[group];
   return `<div class="library-band${proofs?' library-proofs':custom?' library-group':''}"><h2>${esc(name)}</h2><div class="puzzle-grid">${list.map(p=>{
    const a=profile.attempts?.[p.id];
    return `<button type="button" class="puzzle-card ${a?.completed?'complete':''}" data-action="open-puzzle" data-id="${esc(p.id)}" aria-label="${esc(title)}, ${custom?esc(group.name):proofs?'proofs':graded?`grades ${BANDS[group].label}`:labels[group]}, puzzle ${p.number}${a?.completed?', completed':a?', in progress':''}"><strong>${String(p.number).padStart(2,'0')}</strong>${a?.completed?'<span class="puzzle-check" aria-hidden="true">✓</span>':''}</button>`;
   }).join('')}</div></div>`;
  }).join('')}</div></details>`;
 };
 return `<h1 class="sr-only">Puzzles</h1><div class="caravan-library">${shelf.length?`<h2 class="library-shelf">From the road</h2>${shelf.map(familyHTML).join('')}<h2 class="library-shelf">More puzzles</h2>`:''}${rest.map(familyHTML).join('')}</div>`;
}
