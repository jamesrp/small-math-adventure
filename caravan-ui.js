import {BANDS} from './engine.js';
import {COMPANIONS,CHAPTERS,ROUTES,getProgress,getEncounter,hasPump} from './caravan.js';
import {companionSvg,lanternSvg,routeIcon} from './caravan-art.js';
import {rescueLandscape,pumpDrawing} from './rescue-art.js';
import {getEncounter as oldEncounter,CHAPTERS as OLD_CHAPTERS} from './caravan-legacy.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='',extra='')=>`<button type="button" class="${cls}" data-action="${action}" data-focus="action-${action}" ${extra}>${label}</button>`;
const findCompanion=id=>COMPANIONS.find(c=>c.id===id)||COMPANIONS[0];
const number=n=>String(n).padStart(2,'0');
const symbols=['✦','☀','❋','◆','☾','✿'];
const familySymbols={tile:'▰',swap:'⇄',toggle:'☀',clock:'◷',billiard:'↗',route:'♧',latin:'▦',code:'◐',nim:'●',color:'◆',jug:'♒',weigh:'⚖'};
const familyNames={tile:'Tile gardens',swap:'Cup swaps'};
const levelButton=profile=>button(`Grades ${esc(BANDS[profile.band]?.label)} <span aria-hidden="true">⌄</span>`,'change-band','trail-choice');
function illustration(progress){return rescueLandscape(progress);}

export function caravanHeader(profile,active='journey'){
  return `<a href="#main" class="skip-link">Skip to adventure</a><header class="topbar caravan-topbar"><button class="caravan-brand" data-action="home" aria-label="The Last Lantern Caravan home"><span class="caravan-brand-mark">${lanternSvg()}</span><span><strong>The Last Lantern<br class="brand-break"> Caravan</strong></span></button>${profile?`<nav class="caravan-nav" aria-label="Main navigation">${button('Journey','map',active==='journey'?'active':'',active==='journey'?'aria-current="page"':'')}${button('Journal','journal',active==='journal'?'active':'',active==='journal'?'aria-current="page"':'')}${button('Puzzles','library',active==='library'?'active':'',active==='library'?'aria-current="page"':'')}</nav>`:''}<div class="caravan-account">${profile?button(`<span class="caravan-avatar" aria-hidden="true">${symbols[profile.avatar]||'✦'}</span><span class="profile-label">${esc(profile.name)}</span>`,'profiles','profile-nav',`aria-label="Choose explorer: ${esc(profile.name)}"`):''}${button('Grown-ups','parents-gate','quiet grownup-link')}</div></header>`;
}
function profileForm(){
  return `<form id="profile-form"><div class="form-row"><label class="field" for="nickname">Name</label><input class="text-input" id="nickname" name="name" maxlength="24" autocomplete="off" required></div><fieldset class="avatar-picker"><legend class="field">Symbol</legend>${symbols.map((s,i)=>`<label><input type="radio" name="avatar" value="${i}" ${i===0?'checked':''}><span aria-label="Symbol ${i+1}">${s}</span></label>`).join('')}</fieldset><fieldset><legend class="field">Puzzle level</legend><div class="grade-options">${['k1','23','45'].map(key=>`<label class="grade-option"><input type="radio" name="band" value="${key}" ${key==='k1'?'checked':''}><strong>${BANDS[key].label}</strong></label>`).join('')}</div></fieldset><button class="primary caravan-cta wide" type="submit">Start <span aria-hidden="true">→</span></button></form>`;
}
export function caravanProfiles(state,puzzles){
  return `<section class="caravan-welcome">
    <div class="welcome-story">${state.profiles.length?'':'<h1>Rescue Fern.<br>Bring back the light.</h1>'}<div class="welcome-art">${rescueLandscape()}</div></div>
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
function dispatch(progress,profile){
  if(progress.complete)return `<div class="caravan-dispatch finale-dispatch"><h1>Everyone is out.</h1><p class="dispatch-copy">Fern plants the tree beyond the Keeper’s reach. Its light belongs to everyone.</p></div>`;
  if(progress.needsRoute)return `<div class="caravan-dispatch choice-dispatch"><h1>Choose a way in</h1>${routeChoices()}</div>`;
  const e=progress.encounter,started=profile.journey?.started;
  return `<div class="caravan-dispatch"><div class="dispatch-label">${levelButton(profile)}${button('▶ Listen','hear-story','dispatch-listen',`data-text="${esc(e.intro)}"`)}</div><h1>${esc(e.title)}</h1><p class="dispatch-copy">${esc(e.intro)}</p>${profile.caravanJourney&&!started?'<p class="migration-note">Your earlier journey is in Journal. Your puzzle progress is kept.</p>':''}<div class="dispatch-actions">${button(`${!started?'Start':progress.needsLiftVisit?'Inspect the lift':e.id==='tower-lift'?'Return to the lift':'Continue'} <span aria-hidden="true">→</span>`,started?'continue-journey':'start-journey','primary caravan-cta wide')}</div></div>`;
}
function chapterRoute(progress,profile){
  const completed=profile.journey?.completed||[];
  return `<nav class="caravan-route rescue-route" aria-label="Chapters"><div class="route-stops">${CHAPTERS.map((chapter,index)=>{
    const visited=chapter.encounters.some(e=>completed.includes(e.id)),done=chapter.encounters.every(e=>completed.includes(e.id));
    const current=index===progress.chapterIndex&&!progress.complete,locked=!visited&&!current;
    return `<div class="route-stop ${done?'is-done':''} ${current?'is-current':''} ${locked?'is-locked':''}"><button class="stop-marker" ${locked?'disabled':''} ${current?'data-action="continue-journey" aria-current="step"':`data-action="open-encounter" data-id="${esc(chapter.encounters[0].id)}"`} aria-label="${esc(chapter.title)}${locked?', locked':done?', revisit':', continue'}">${routeIcon([1,3,0][index])}${done?'<span class="stop-check" aria-hidden="true">✓</span>':''}</button><h2>${esc(chapter.title)}</h2></div>`;
  }).join('')}</div></nav>`;
}
function crewRow(progress){
  return `<section class="caravan-crew" aria-label="Companions"><div class="crew-members">${COMPANIONS.map(c=>{
    const away=!progress.party.includes(c.id);
    return `<button class="crew-member ${away?'crew-away':''}" data-action="companion" data-id="${esc(c.id)}">${companionSvg(c.id)}<strong>${esc(c.name)}</strong>${away?'<span>In the tower</span>':''}</button>`;
  }).join('')}</div></section>`;
}
export function caravanMap(profile,puzzles){
  const progress=getProgress(profile,puzzles),count=progress.completedCount;
  return `<section class="caravan-hero" aria-label="Current encounter"><div class="hero-picture">${illustration(progress)}</div>${dispatch(progress,profile)}</section>
    ${progress.pump?`<div class="equipment-bag">${button(`<svg viewBox="-42 -40 84 80" aria-hidden="true">${pumpDrawing()}</svg>Bea’s pump`,'pump-info','equipment-item')}</div>`:profile.journey?.seenLift&&count<5?`<div class="equipment-bag">${button('Inspect the lift','open-encounter','text-button','data-id="tower-lift"')}</div>`:''}
    ${chapterRoute(progress,profile)}${crewRow(progress)}`;
}
export function encounterCompletion(encounter,profile,puzzles){
  const finale=encounter.id==='escape-ballast';
  const heading=({capture:'Fern is in the tower.',pump:'Bea’s pump is ready.',rescue:'Fern is free.',escape:'Everyone is out.'})[encounter.effect]||'The way opens.';
  return `<section class="completion-card caravan-completion" aria-label="Story consequence"><h2 id="completion-heading" tabindex="-1">${heading}</h2><p>${esc(encounter.success)}</p>${encounter.effect==='pump'?`<div class="pump-earned"><svg viewBox="-45 -42 90 84" aria-hidden="true">${pumpDrawing()}</svg><strong>Fill · Empty</strong></div>`:''}${button('▶ Listen','hear-story','text-button completion-listen',`data-text="${esc(encounter.success)}"`)}${button(finale?'See our home →':'Continue →','finish-encounter','primary wide caravan-cta')}${button('Replay','replay','text-button wide')}</section>`;
}
export function journalView(profile){
  const completed=profile.journey?.completed||[],old=profile.caravanJourney;
  return `<h1 class="sr-only">Journal</h1><div class="journal-layout"><section class="journal-pages" aria-label="Journey memories">${hasPump(profile)?'<article class="journal-entry"><div><h2>Bea’s pump</h2><p>Fill and Empty are available on the tower lift, the test chamber, and the escape counterweight.</p></div></article>':''}${!completed.length?`<div class="journal-empty">${button('Start →','continue-journey','primary caravan-cta')}</div>`:CHAPTERS.map((chapter,index)=>{
    const entries=chapter.encounters.filter(e=>completed.includes(e.id)).map(e=>getEncounter(e.id,profile.journey));
    if(!entries.length)return '';
    return `<section class="journal-chapter"><div class="journal-chapter-title">${routeIcon([1,3,0][index])}<h2>${esc(chapter.title)}</h2></div>${entries.map(e=>`<article class="journal-entry"><div><h3>${esc(e.title)}</h3><p>${esc(e.success)}</p>${button('Revisit →','open-encounter','text-button small',`data-id="${esc(e.id)}"`)}</div></article>`).join('')}</section>`;
  }).join('')}${old?`<details class="earlier-journey"><summary>Your earlier caravan journey</summary>${OLD_CHAPTERS.flatMap(c=>c.encounters).filter(e=>old.completed.includes(e.id)).map(e=>oldEncounter(e.id,old)).map(e=>`<article class="journal-entry"><div><h3>${esc(e.keepsake.title)}</h3><p>${esc(e.keepsake.text)}</p></div></article>`).join('')||'<p>Your puzzle progress is kept in Puzzles.</p>'}</details>`:''}</section></div>`;
}
export function companionBody(id,profile){
  const c=findCompanion(id),progress=getProgress(profile),away=!progress.party.includes(c.id);
  const description=id==='fern'?'Fern tends the lantern tree. Inside the citadel, she sends signals and works the door’s inner handle.':id==='bea'?'Bea repairs the pump that lets us add and remove water. She carries it through the rescue.':c.description;
  return `<div class="companion-biography">${companionSvg(c.id)}<p>${esc(description)}</p>${away?'<p class="companion-whereabouts">Fern is with the tree in the tower. We need to reach her before the Keeper’s ship leaves.</p>':''}</div>`;
}
export function libraryView(profile,puzzles){
  puzzles=puzzles.filter(p=>!p.campaignOnly);
  const families=[...new Set(puzzles.map(p=>p.mechanic))];
  return `<h1 class="sr-only">Puzzles</h1><div class="caravan-library">${families.map(id=>{
    const family=puzzles.filter(p=>p.mechanic===id),title=family[0].familyTitle||familyNames[id]||id;
    const graded=['tile','swap'].includes(id),labels={easy:'Easy',medium:'Medium',hard:'Hard'};
    return `<details class="satchel-family" ${id==='toggle'?'open':''}><summary><span class="family-ink-symbol" aria-hidden="true">${familySymbols[id]||'✦'}</span><span class="family-summary"><strong>${esc(title)}</strong></span><span class="family-expand" aria-hidden="true">+</span></summary><div class="satchel-family-content">${(graded?['k1','23','45']:['easy','medium','hard']).map(group=>{
      const list=family.filter(p=>graded?p.band===group:p.difficulty_level===group).sort((a,b)=>a.number-b.number);
      return `<div class="library-band"><h3>${graded?`Grades ${BANDS[group].label}`:labels[group]}</h3><div class="puzzle-grid">${list.map(p=>{
        const a=profile.attempts[p.id];
        return `<button class="puzzle-card ${a?.completed?'complete':''}" data-action="open-puzzle" data-id="${esc(p.id)}" aria-label="${esc(title)}, ${graded?`grades ${BANDS[group].label}`:labels[group]}, puzzle ${p.number}${a?.completed?', completed':a?', in progress':''}"><strong>${number(p.number)}</strong>${a?.completed?'<span class="puzzle-check" aria-hidden="true">✓</span>':''}</button>`;
      }).join('')}</div></div>`;
    }).join('')}</div></details>`;
  }).join('')}</div>`;
}
