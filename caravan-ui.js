import {BANDS} from './engine.js';
import {COMPANIONS,CHAPTERS,ROUTES,getProgress,getEncounter} from './caravan.js';
import {companionSvg,lanternSvg,landscape,routeIcon} from './caravan-art.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='',extra='')=>`<button type="button" class="${cls}" data-action="${action}" data-focus="action-${action}" ${extra}>${label}</button>`;
const findCompanion=id=>COMPANIONS.find(c=>c.id===id)||COMPANIONS[0];
const number=n=>String(n).padStart(2,'0');
const symbols=['✦','☀','❋','◆','☾','✿'];
const familySymbols={tile:'▰',swap:'⇄',toggle:'☀',clock:'◷',billiard:'↗',route:'♧',latin:'▦',code:'◐',nim:'●',color:'◆',jug:'♒',weigh:'⚖'};
const familyNames={tile:'Tile gardens',swap:'Cup swaps'};
const levelButton=profile=>button(`Grades ${esc(BANDS[profile.band]?.label)} <span aria-hidden="true">⌄</span>`,'change-band','trail-choice');
function illustration(progress,extra={}){return landscape(progress.chapter?.scene||'dock',{chapterIndex:progress.chapterIndex,complete:progress.complete,completedCount:progress.completedCount,party:progress.party,...extra});}

export function caravanHeader(profile,active='journey'){
  return `<a href="#main" class="skip-link">Skip to adventure</a><header class="topbar caravan-topbar"><button class="caravan-brand" data-action="home" aria-label="The Last Lantern Caravan home"><span class="caravan-brand-mark">${lanternSvg()}</span><span><strong>The Last Lantern<br class="brand-break"> Caravan</strong></span></button>${profile?`<nav class="caravan-nav" aria-label="Main navigation">${button('Journey','map',active==='journey'?'active':'',active==='journey'?'aria-current="page"':'')}${button('Journal','journal',active==='journal'?'active':'',active==='journal'?'aria-current="page"':'')}${button('Puzzles','library',active==='library'?'active':'',active==='library'?'aria-current="page"':'')}</nav>`:''}<div class="caravan-account">${profile?button(`<span class="caravan-avatar" aria-hidden="true">${symbols[profile.avatar]||'✦'}</span><span class="profile-label">${esc(profile.name)}</span>`,'profiles','profile-nav',`aria-label="Choose explorer: ${esc(profile.name)}"`):''}${button('Grown-ups','parents-gate','quiet grownup-link')}</div></header>`;
}
function profileForm(){
  return `<form id="profile-form"><div class="form-row"><label class="field" for="nickname">Name</label><input class="text-input" id="nickname" name="name" maxlength="24" autocomplete="off" required></div><fieldset class="avatar-picker"><legend class="field">Symbol</legend>${symbols.map((s,i)=>`<label><input type="radio" name="avatar" value="${i}" ${i===0?'checked':''}><span aria-label="Symbol ${i+1}">${s}</span></label>`).join('')}</fieldset><fieldset><legend class="field">Puzzle level</legend><div class="grade-options">${['k1','23','45'].map(key=>`<label class="grade-option"><input type="radio" name="band" value="${key}" ${key==='k1'?'checked':''}><strong>${BANDS[key].label}</strong></label>`).join('')}</div></fieldset><button class="primary caravan-cta wide" type="submit">Start <span aria-hidden="true">→</span></button></form>`;
}
export function caravanProfiles(state,puzzles){
  return `<section class="caravan-welcome">
    <div class="welcome-story">${state.profiles.length?'':'<h1>Find a home for the lantern tree.</h1>'}<div class="welcome-art">${landscape('dock')}</div></div>
    <div class="welcome-boarding"><h2>${state.profiles.length?'Choose an explorer':'New explorer'}</h2>
      ${state.profiles.length?`<div class="caravan-saved-profiles">${state.profiles.map(pr=>{
        return `<button class="caravan-profile-card" data-action="choose-profile" data-id="${esc(pr.id)}"><span class="caravan-avatar" aria-hidden="true">${symbols[pr.avatar]||'✦'}</span><span><strong>${esc(pr.name)}</strong></span><span class="profile-arrow" aria-hidden="true">→</span></button>`;
      }).join('')}</div><details class="caravan-add-profile"><summary>+ New explorer</summary>${profileForm()}</details>`:profileForm()}
    </div>
  </section>`;
}
function routeChoices(){
  return `<div class="route-choices">${ROUTES.map((r,i)=>`<button class="route-choice" data-action="choose-route" data-route="${esc(r.id)}"><span class="route-choice-art">${routeIcon(i===0?3:1)}</span><span><strong>${esc(r.title)}</strong><small>${esc(r.description||r.subtitle)}</small></span><span class="route-choice-arrow" aria-hidden="true">→</span></button>`).join('')}</div>`;
}
function dispatch(progress,profile,puzzles){
  if(progress.complete)return `<div class="caravan-dispatch finale-dispatch"><div class="dispatch-label">${levelButton(profile)}</div><h1>The lantern tree is home.</h1></div>`;
  if(progress.needsRoute)return `<div class="caravan-dispatch choice-dispatch"><div class="dispatch-label">${levelButton(profile)}</div><h1>Choose a path</h1>${routeChoices()}${button('▶ Listen','hear-story','text-button',`data-text="${esc(ROUTES.map(r=>r.title+'. '+r.description).join(' '))}"`)}</div>`;
  const encounter=progress.encounter,started=profile.journey?.started;
  return `<div class="caravan-dispatch">
    <div class="dispatch-label">${levelButton(profile)}${button('▶ Listen','hear-story','dispatch-listen',`data-text="${esc(encounter?.intro)}"`)}</div>
    <h1>${esc(encounter?.title||'The lantern landing')}</h1>
    <p class="dispatch-copy">${esc(encounter?.intro||'The ferry landing has gone dark. Light the dock so the caravan can cross.')}</p>
    <div class="dispatch-actions">${button(`${started?'Continue':'Start'} <span aria-hidden="true">→</span>`,started?'continue-journey':'start-journey','primary caravan-cta wide')}</div>
  </div>`;
}
function chapterRoute(progress,profile){
  const completed=profile.journey?.completed||[];
  return `<section class="caravan-route" aria-label="Chapters"><div class="route-stops">
    <svg class="route-thread" viewBox="0 0 1100 125" preserveAspectRatio="none" aria-hidden="true"><path d="M80 59C168-15 210 132 286 67S398-5 474 63 593 135 663 68 792 0 854 59 976 112 1023 55" fill="none" stroke="#b7b299" stroke-width="2" stroke-dasharray="4 7"/></svg>
    ${CHAPTERS.map((base,index)=>{
      const chapter=index===progress.chapterIndex?progress.chapter:index===1&&profile.journey?.route?{...base,...ROUTES.find(r=>r.id===profile.journey.route)}:base;
      const visited=completed.some(id=>base.encounters.some(e=>e.id===id));
      const done=completed.filter(id=>base.encounters.some(e=>e.id===id)).length>=base.encounters.length;
      const current=index===progress.chapterIndex&&!progress.complete,locked=index>progress.chapterIndex;
      const target=current?progress.encounter?.id:base.encounters[0]?.id;
      return `<div class="route-stop ${done?'is-done':''} ${current?'is-current':''} ${locked?'is-locked':''}">
        <button class="stop-marker" ${locked||(!visited&&!current)?'disabled':''} ${current?'data-action="continue-journey" aria-current="step"':`data-action="open-encounter" data-id="${esc(target)}"`} aria-label="${esc(chapter.title)}${locked?', locked':done?', revisit':', continue the story'}">${routeIcon(index)}${done?'<span class="stop-check" aria-hidden="true">✓</span>':''}</button>
        <h2>${esc(chapter.title)}</h2>
      </div>`;
    }).join('')}
  </div></section>`;
}
function crewRow(progress){
  return `<section class="caravan-crew" aria-label="Companions"><div class="crew-members">${COMPANIONS.map(c=>{
    const away=!progress.party.includes(c.id);
    return `<button class="crew-member ${away?'crew-away':''}" data-action="companion" data-id="${esc(c.id)}">${companionSvg(c.id)}<strong>${esc(c.name)}</strong>${away?'<span>Across the marsh</span>':''}</button>`;
  }).join('')}</div></section>`;
}
export function caravanMap(profile,puzzles){
  const progress=getProgress(profile,puzzles);
  return `<section class="caravan-hero" aria-label="Current encounter">
    <div class="hero-picture">${illustration(progress)}</div>
    ${dispatch(progress,profile,puzzles)}
  </section>${chapterRoute(progress,profile)}${crewRow(progress)}`;
}
export function encounterCompletion(encounter,profile,puzzles){
  const finale=encounter.id===CHAPTERS.at(-1)?.encounters.at(-1)?.id;
  return `<section class="completion-card caravan-completion" aria-label="A new part of your story"><div class="completion-portrait">${companionSvg(encounter.speaker)}<span aria-hidden="true">✦</span></div><h2 id="completion-heading" tabindex="-1">${finale?'The lantern tree is home.':'Solved'}</h2><p>${esc(encounter.success)}</p>${button('▶ Listen','hear-story','text-button completion-listen',`data-text="${esc(encounter.success)}"`)}${button(finale?'See our home →':'Continue →','finish-encounter','primary wide caravan-cta')}${button('Replay','replay','text-button wide')}</section>`;
}
export function journalView(profile,puzzles){
  const completed=profile.journey?.completed||[];
  return `<h1 class="sr-only">Journal</h1><div class="journal-layout"><section class="journal-pages" aria-label="Journey memories">${!completed.length?`<div class="journal-empty">${button('Start →','continue-journey','primary caravan-cta')}</div>`:CHAPTERS.map((base,index)=>{const entries=base.encounters.filter(e=>completed.includes(e.id)).map(e=>getEncounter(e.id,profile.journey)||e);if(!entries.length)return '';return `<section class="journal-chapter"><div class="journal-chapter-title">${routeIcon(index)}<div><h2>${esc(index===1&&profile.journey?.route?ROUTES.find(r=>r.id===profile.journey.route)?.title||base.title:base.title)}</h2></div></div>${entries.map(e=>`<article class="journal-entry"><span class="journal-pin" aria-hidden="true">✧</span><div><h3>${esc(e.keepsake?.title||e.title)}</h3><p>${esc(e.keepsake?.text||e.success)}</p>${button('Revisit →','open-encounter','text-button small',`data-id="${esc(e.id)}"`)}</div></article>`).join('')}</section>`;}).join('')}</section></div>`;
}
export function companionBody(id,profile,puzzles){
  const c=findCompanion(id),progress=getProgress(profile,puzzles),away=!progress.party.includes(c.id);
  const memories=(profile.journey?.completed||[]).map(e=>getEncounter(e,profile.journey)).filter(e=>e?.speaker===c.id);
  return `<div class="companion-biography">${companionSvg(c.id)}<p class="eyebrow">${esc(c.role||c.kind)}</p><p class="companion-description">${esc(c.description)}</p><blockquote>“${esc(c.quote)}”</blockquote>${away?'<p class="companion-whereabouts">Across the marsh with the other half of the caravan. The lanterns will help us find one another.</p>':''}${memories.length?`<div class="companion-memories"><h3>Memories</h3>${memories.slice(-3).map(e=>`<p><span aria-hidden="true">✧</span> ${esc(e.keepsake?.title||e.title)}</p>`).join('')}</div>`:''}</div>`;
}
export function libraryView(profile,puzzles){
  const families=[...new Set(puzzles.map(p=>p.mechanic))];
  return `<h1 class="sr-only">Puzzles</h1><div class="caravan-library">${families.map(id=>{
    const family=puzzles.filter(p=>p.mechanic===id),title=family[0].familyTitle||familyNames[id]||id;
    return `<details class="satchel-family" ${id==='toggle'?'open':''}><summary><span class="family-ink-symbol" aria-hidden="true">${familySymbols[id]||'✦'}</span><span class="family-summary"><strong>${esc(title)}</strong></span><span class="family-expand" aria-hidden="true">+</span></summary><div class="satchel-family-content">${(['tile','swap'].includes(id)?['k1','23','45']:['all']).map(band=>{
      const list=family.filter(p=>p.band===band).sort((a,b)=>a.number-b.number);
      return `<div class="library-band">${band!=='all'?`<h3>Grades ${BANDS[band].label}</h3>`:''}<div class="puzzle-grid">${list.map(p=>{
        const a=profile.attempts[p.id];
        return `<button class="puzzle-card ${a?.completed?'complete':''}" data-action="open-puzzle" data-id="${esc(p.id)}" aria-label="${esc(title)}, ${band==='all'?'':`grades ${BANDS[band].label}, `}puzzle ${p.number}${a?.completed?', completed':a?', in progress':''}"><strong>${number(p.number)}</strong>${a?.completed?'<span class="puzzle-check" aria-hidden="true">✓</span>':''}</button>`;
      }).join('')}</div></div>`;
    }).join('')}</div></details>`;
  }).join('')}</div>`;
}
