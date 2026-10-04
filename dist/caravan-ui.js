import {BANDS} from './engine.js';
import {COMPANIONS} from './caravan-legacy.js';
import {companionSvg,lanternSvg} from './caravan-art.js';
import {mapArt} from './road-placeholders.js';
import {media,slots} from './art.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='',extra='')=>`<button type="button" class="${cls}" data-action="${action}" data-focus="action-${action}" ${extra}>${label}</button>`;
const symbols=['✦','☀','❋','◆','☾','✿'];
const familySymbols={chips:'◉',tile:'▰',swap:'⇄',toggle:'☀',clock:'◷',billiard:'↗',route:'♧',latin:'▦',code:'◐',nim:'●',color:'◆',jug:'♒',weigh:'⚖'};
const familyNames={tile:'Tile gardens',swap:'Cup swaps'};
const levelButton=profile=>button(`Grades ${esc(BANDS[profile.band]?.label)} <span aria-hidden="true">⌄</span>`,'change-band','trail-choice');

export function caravanHeader(profile,active='journey'){
 return `<a href="#main" class="skip-link">Skip to adventure</a><header class="topbar caravan-topbar"><button type="button" class="caravan-brand" data-action="home" aria-label="The Lantern Caravan home"><span class="caravan-brand-mark">${lanternSvg()}</span><strong>The Lantern<br>Caravan</strong></button>${profile?`<nav class="caravan-nav" aria-label="Main navigation">${button('Road','map',active==='journey'?'active':'',active==='journey'?'aria-current="page"':'')}${button('Puzzles','library',active==='library'?'active':'',active==='library'?'aria-current="page"':'')}</nav>`:''}<div class="caravan-account">${profile?button(`<span class="caravan-avatar" aria-hidden="true">${symbols[profile.avatar]||'✦'}</span><span class="profile-label">${esc(profile.name)}</span>`,'profiles','profile-nav',`aria-label="Choose explorer: ${esc(profile.name)}"`):''}${button('Grown-ups','parents-gate','quiet grownup-link')}</div></header>`;
}
function profileForm(){
 return `<form id="profile-form"><div class="form-row"><label class="field" for="nickname">Name</label><input class="text-input" id="nickname" name="name" maxlength="24" autocomplete="off" required></div><fieldset class="avatar-picker"><legend class="field">Symbol</legend>${symbols.map((s,i)=>`<label><input type="radio" name="avatar" value="${i}" ${i===0?'checked':''}><span aria-label="Symbol ${i+1}">${s}</span></label>`).join('')}</fieldset><fieldset><legend class="field">Puzzle level</legend><div class="grade-options">${['k1','23','45'].map(key=>`<label class="grade-option"><input type="radio" name="band" value="${key}" ${key==='k1'?'checked':''}><strong>${BANDS[key].label}</strong></label>`).join('')}</div></fieldset><button class="primary caravan-cta wide" type="submit">Start <span aria-hidden="true">→</span></button></form>`;
}
export function caravanProfiles(state){
 return `<section class="caravan-welcome"><div class="welcome-story" aria-hidden="true"><div class="welcome-art">${media(slots.map('wide'),mapArt('wide'),{key:'welcome-map',cls:'welcome-map'})}</div><div class="welcome-crew">${COMPANIONS.map(c=>companionSvg(c.id)).join('')}</div></div><div class="welcome-boarding"><h1>${state.profiles.length?'Choose an explorer':'New explorer'}</h1>${state.profiles.length?`<div class="caravan-saved-profiles">${state.profiles.map(pr=>`<button type="button" class="caravan-profile-card" data-action="choose-profile" data-id="${esc(pr.id)}"><span class="caravan-avatar" aria-hidden="true">${symbols[pr.avatar]||'✦'}</span><strong>${esc(pr.name)}</strong><span class="profile-arrow" aria-hidden="true">→</span></button>`).join('')}</div><details class="caravan-add-profile" data-view-key="new-explorer"><summary>New explorer</summary>${profileForm()}</details>`:profileForm()}</div></section>`;
}
// Proof puzzles (band "proofs") join their family's satchel as a Proofs group
// above the grade or difficulty groups. A family's playground (band
// "playground") opens from a button above its groups. Chip firing, the newest
// family, comes first and starts open.
export function libraryView(profile,puzzles){
 puzzles=puzzles.filter(p=>!p.campaignOnly);
 const familyOf=p=>p.libraryFamily||p.mechanic;
 const families=[...new Set(puzzles.map(familyOf))].sort((a,b)=>(b==='chips')-(a==='chips'));
 return `<h1 class="sr-only">Puzzles</h1><div class="caravan-library">${families.map(id=>{
  const all=puzzles.filter(p=>familyOf(p)===id),play=all.find(p=>p.band==='playground'),family=all.filter(p=>p!==play),core=family.filter(p=>p.band!=='proofs'),title=(core[0]||family[0]).familyTitle||familyNames[id]||id;
  const graded=core.some(p=>p.band!=='all'),labels={easy:'Easy',medium:'Medium',hard:'Hard',proofs:'Proofs'};
  const groups=[...(family.some(p=>p.band==='proofs')?['proofs']:[]),...(graded?['k1','23','45']:['easy','medium','hard'])];
  return `<details class="satchel-family" data-view-key="family-${esc(id)}" ${id==='chips'?'open':''}><summary><span class="family-ink-symbol" aria-hidden="true">${familySymbols[id]||'✦'}</span><strong>${esc(title)}</strong><span class="family-expand" aria-hidden="true">+</span></summary><div class="satchel-family-content">${play?`<button type="button" class="satchel-playground ${profile.attempts[play.id]?'started':''}" data-action="open-puzzle" data-id="${esc(play.id)}"><span aria-hidden="true">${familySymbols[id]||'✦'}</span> Playground</button>`:''}${groups.map(group=>{
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
