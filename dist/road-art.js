// The road is an interactive, original SVG map. Its lights and mechanisms are
// state, not baked into the scene artwork, so every solved stop changes the world.
import {isSolved} from './engine.js';
import {CHAPTERS,COMPANIONS} from './caravan.js';
import {companionDrawing} from './caravan-art.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let artId=0;
const ink='#29473c',gold='#f7cb69',dark='#466559';
const line=`stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
const star=(x,y,r=4)=>`<path d="M${x-r} ${y}h${r*2}m-${r} -${r}v${r*2}" stroke="#f4da8b" stroke-width="1.8"/>`;
const leaf=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" ${line}><path d="M0 0q-20-33-29-22Q-36-5 0 0q24-30 32-17Q37-2 0 0v19" fill="#88a37e"/></g>`;
const lamp=(x,y,lit=false,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" class="${lit?'lamp-lit':'lamp-dark'}">${lit?'<circle r="26" cy="-15" fill="#f8ce6a" opacity=".19"/><circle r="17" cy="-15" fill="#ffdc85" opacity=".23"/>':''}<path d="M0 19v-22m-7-4h14l-2-16H-5z" fill="${lit?gold:'#809489'}" ${line}/><path d="M-7-7h14M-3-24v-4h6v4" fill="none" ${line}/></g>`;
const window=(x,y,on=false)=>`<rect x="${x}" y="${y}" width="12" height="17" rx="5" fill="${on?gold:'#476958'}" stroke="${ink}" stroke-width="1.6"/>`;
export function lanternTree(x=0,y=0,s=1){return `<g transform="translate(${x} ${y}) scale(${s})" ${line}><circle cx="0" cy="-47" r="48" fill="#f4d881" opacity=".11"/><path d="M-12 15h27l5-27h-39z" fill="#b97854"/><path d="M0-11v-49m0 24-21-17m21 4 23-22m-23 8-8-18" fill="none" stroke="#705d42" stroke-width="5"/><path d="M-23-50q-34-12-22-31 27-7 30 25m37-12q0-29 27-23 10 22-27 30M-7-74q-23-25-6-40 24 10 13 37" fill="#8ca36b"/>${lamp(-22,-38,true,.8)}${lamp(24,-51,true,.85)}${lamp(-3,-73,true,.75)}</g>`;}

function landmark(id,stage=0){
 const lit=stage>=3;
 if(id==='ferry')return `<g ${line}><path d="M-76 42q30-15 60 0t58 0t51 0M-65 53q31-14 61 0t65 0" stroke="#72a29b" fill="none"/><g class="ferry-boat ${stage>=2?'is-moving':''}"><path d="M-56 8Q-66 39 0 38q55-1 67-23L45-7-30-13z" fill="#b0b489"/><path d="M-30-13q29-51 64-12l11 18" fill="#7b9579"/><path d="M-15-18q13-18 27-12M20-9q12-4 19 5" fill="none"/><path d="M47 8q8-5 13 0m-11 12q8 6 13-1" fill="none"/><path d="M-48 4h77v14h-77z" fill="#c9ab77"/>${stage>=1?'<path d="M-37 3v-15h17V3m6 0v-20H3V3m7 0v-12h15V3" fill="#d39567"/>':''}<path d="M-6-25v-24m-20 0h42" fill="none"/>${lamp(-5,-39,lit,.9)}</g><path d="M-85 0v46m22-46v43m-28-33h41" fill="none" stroke="#816e49" stroke-width="5"/>${lamp(-78,-8,lit,.7)}</g>`;
 if(id==='marsh')return `<g ${line}><ellipse cy="36" rx="83" ry="21" fill="#a6beb0" stroke="none"/><path d="M-54 19v-41h66v41z" fill="#c7c39c"/><path d="M-63-20l43-32 43 32z" fill="#899b74"/>${window(-40,-10,lit)}${window(-9,-10,lit)}${stage>=2?leaf(-43,16,.28)+leaf(-23,17,.28)+leaf(-3,16,.28):''}<path d="M-55 22h73M-46 22v15m48-15v15" fill="none" stroke-width="4"/><path d="M-72 23q28-22 58 10t64-7" fill="none" stroke="${stage>=1?'#d7b368':'#708c77'}" stroke-width="7"/>${[-78,-64,44,58,71].map((x,i)=>`<path d="M${x} 39q${i%2?8:-8}-22 0-43m0 43-9-23m9 15 11-21" fill="none"/><path d="M${x} -2v-11" stroke="#977f4c" stroke-width="5"/>`).join('')}${lamp(29,3,lit,1.1)}</g>`;
 if(id==='ridge')return `<g ${line}><path d="M-91 36l40-95 41 51 35-70 67 114z" fill="#a5b0a2"/><path d="m-66-23 15-36 15 20-16-7zm79-15 12-40 24 42-24-14z" fill="#e8e5d2" stroke="none"/><path d="M-65 24q66-20 127 6" stroke="#887b54" fill="none" stroke-width="6"/><path d="M-38 16v-47m0 4 24 9-24 9" fill="#91a082"/><path d="M13 26v-31m-15 0h30m-24-8 9 8 10-8" fill="none"/><path d="m-2-2-11 21H9zm30 0-11 21h22z" fill="#8fa090"/><path d="M-75-4 77 4" fill="none"/><g transform="translate(${stage>=1?43:-62} 0)"><path d="M0 0v10m-12 0h24v21h-24z" fill="#bda675"/><path d="M-9 13h18v8H-9z" fill="#dde0b6"/></g>${stage>=2?'<path d="m-63 29-7-14 16 4 15-4-6 14q14 15-5 17-22 0-13-17z" fill="#b89b72"/>':''}${lamp(57,5,lit,1.2)}</g>`;
 if(id==='workshop')return `<g ${line}><path d="M-63 35v-59h111v59z" fill="#c4b28c"/><path d="M-73-23-14-66 61-23z" fill="#7d9680"/><path d="M25-48v-21h14v33" fill="#a29278"/><path d="M-15 34V6Q-2-14 12 6v28" fill="${stage>=2?'#365342':'#a18361'}"/>${window(-45,-6,lit)}${window(26,-6,lit)}<g class="workshop-wheel " transform="translate(-57 27)"><circle r="22" fill="#b79a65"/><circle r="7" fill="#526854"/>${Array.from({length:8},(_,i)=>`<path d="M0-8v-16" transform="rotate(${i*45})"/>`).join('')}</g>${lamp(63,6,lit,1.05)}<path d="M-77 40h156" stroke="#8e9c7d"/>${stage>=1?'<path d="m-15 36-14 13H35L15 36z" fill="#ddc790"/><path d="M-6 36-3 49m9-13 8 13M-20 42h48" stroke-width="1"/>':''}${stage>=2?lamp(0,16,false,.65):''}</g>`;
 if(id==='lighthouse')return `<g ${line}>${stage>=1?`<path d="M-7-69-121-99v64L-7-54z${stage>=2?'M13-70 115-103v63L13-54z':''}" fill="#ffe393" opacity=".27" stroke="none" class="lighthouse-beam"/>`:''}<path d="M-59 39l21-38 35 10 33-19 36 47z" fill="#97a695"/><path d="M-18 28-10-64h29l10 92z" fill="#ded1aa"/><path d="m-13-30 34-9 3 21-38 9" fill="#a87458"/><path d="M-16-64v-26h40v26z" fill="${stage>=1?gold:'#628075'}"/><path d="m-23-90 27-21 29 21z" fill="#6a8274"/><path d="M-20-62h50m-25-30v30M0 26V8q7-11 13 0v18" fill="none"/><path d="M-40 19v-39m0 3 18 6-18 8" fill="#91a489"/>${lamp(47,20,lit,.7)}</g>`;
 return `<g ${line}><path d="M-78 36v-75h29V4h20v-79H28V4h20v-43h30v75z" fill="#b5b49a"/><path d="m-84-39 20-29 22 29M-35-75 36-75 0-111zM42-39l21-29 22 29" fill="#718c78"/><path d="M-13 36V8q14-22 27 0v28" fill="#405f4c"/>${[-65,53].map(x=>window(x,-19,lit)).join('')}${window(-6,-31,lit)}<circle cx="0" cy="-58" r="12" fill="#dfd4ae"/><path d="M0-65v7l7 3" fill="none"/><path d="M-82 40H83" fill="none"/><path d="M-13 39-36 55h78L14 39" fill="${stage>=1?'#d7be83':'#9faa8d'}"/>${stage>=1?lamp(-38,14,lit,.8)+lamp(38,14,lit,.8):''}${stage>=2?'<ellipse cy="43" rx="24" ry="8" fill="#a8c7ae"/><path d="M0 43v-17m-13 10q13-25 26 0" fill="none" stroke="#99c6b4"/>'+lanternTree(0,26,.3):''}${lit?star(-45,-86,5)+star(50,-91,4):''}</g>`;
}

const coordinates={
 desktop:[[120,430],[300,315],[440,160],[575,385],[780,335],[860,145]],
 mobile:[[118,708],[384,646],[182,471],[419,390],[166,249],[403,142]]
};
function routePath(a,b){const mx=(a[0]+b[0])/2;return `M${a[0]} ${a[1]} C${mx} ${a[1]+24} ${mx} ${b[1]+24} ${b[0]} ${b[1]}`;}
function mapTerrain(mobile){return mobile?`<path d="M-60 190Q160 150 272 297T659 352v591H-60z" fill="#d6ddbd"/><path d="M-30 473Q170 489 272 627T651 652v287H-30z" fill="#c1d0b0"/><path d="M-14 731Q88 619 213 732T631 727v154H-14z" fill="#b9cec1"/><path d="M-30 805Q110 705 270 799T657 776" stroke="#a4c5bb" stroke-width="55" fill="none"/><path d="M10 120 83 24 153 146 227 74 299 211" fill="#d9dece" stroke="none"/>`:`<path d="M-50 245Q190 100 349 257T693 263 1083 228v434H-50z" fill="#d6ddbd"/><path d="M-60 440Q129 265 348 405T713 340 1070 390v280H-60z" fill="#c5d2b2"/><path d="M-70 530Q150 417 356 519T755 437 1090 486v205H-70z" fill="#b9cec1"/><path d="M-40 480Q120 532 235 445T470 475 764 542 1100 489" stroke="#a4c5bb" stroke-width="66" fill="none"/><path d="M245 217 324 88 392 170 463 23 560 209" fill="#d7ddcd" stroke="none"/>`;}

export function roadMap(progress,profile,{preview=false}={}){
 return ['desktop','mobile'].map(layout=>{
  const mobile=layout==='mobile',width=mobile?600:1000,height=mobile?880:590,coords=coordinates[layout],uid=`road-${++artId}`;
  const completed=profile?.journey?.completed||[];
  const stages=CHAPTERS.map(c=>c.encounters.filter(e=>completed.includes(e.id)).length);
  const current=progress?.complete?5:progress?.chapterIndex||0;
  const route=coords.slice(1).map((pos,i)=>`<path d="${routePath(coords[i],pos)}" fill="none" stroke="#88967b" stroke-width="7" stroke-linecap="round"/><path d="${routePath(coords[i],pos)}" fill="none" stroke="${stages[i]===3?gold:'#eff0d6'}" stroke-width="3" stroke-dasharray="${stages[i]===3?'none':'2 10'}" stroke-linecap="round" class="${stages[i]===3?'lit-road':''}"/>`).join('');
  const scenery=coords.map(([x,y],i)=>`<g transform="translate(${x} ${y})"><ellipse cx="0" cy="33" rx="83" ry="25" fill="${stages[i]===3?'#ead193':'#9bb190'}" opacity=".45"/>${landmark(CHAPTERS[i].id,stages[i])}</g>`).join('');
  const plants=mobile?[[45,340,1],[520,515,1.4],[85,610,.6],[492,240,.8],[290,752,1]]:[[222,460,1],[360,230,.7],[660,460,1.4],[923,371,.8],[713,147,.8],[56,257,1.3]];
  return `<div class="road-map road-map-${layout} ${progress?.complete?'road-complete':''} ${preview?'road-map-preview':''}" ${preview?'aria-hidden="true"':`role="group" aria-label="The lantern road${progress?.complete?', all six stops lit':''}"`}>
  <svg class="road-map-art" viewBox="0 0 ${width} ${height}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${uid}-sky" x2="0" y2="1"><stop stop-color="#eee8d5"/><stop offset="1" stop-color="#dfe5c8"/></linearGradient><pattern id="${uid}-paper" width="17" height="19" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".65" fill="#526044" opacity=".08"/><circle cx="12" cy="14" r=".7" fill="#fffce7" opacity=".6"/></pattern></defs><rect width="${width}" height="${height}" fill="url(#${uid}-sky)"/><circle cx="${mobile?490:758}" cy="${mobile?54:62}" r="30" fill="#fbf2d4"/><path d="M15 91q65-30 107-9m-6 39q46-20 81-7M${width-250} 44q50-24 98-4" stroke="#ffffef" stroke-width="6" opacity=".4" fill="none" stroke-linecap="round"/>${mapTerrain(mobile)}${route}${plants.map(([x,y,s])=>leaf(x,y,s)).join('')}${scenery}<rect width="${width}" height="${height}" fill="url(#${uid}-paper)" pointer-events="none"/>${preview?'':`<g class="map-caravan" transform="translate(${coords[current][0]-32} ${coords[current][1]+91})">${lanternTree(0,-6,.44)}<g transform="translate(16 -34) scale(.34)">${companionDrawing('fern')}</g><g transform="translate(-60 -24) scale(.32)">${companionDrawing('moss')}</g></g>`}</svg>
  ${preview?'':CHAPTERS.map((c,i)=>{
    const lit=stages[i]===3,active=i===current&&!progress?.complete,locked=!lit&&!active;
    const action=active?(profile?.journey?.started?'continue-journey':'start-journey'):'open-encounter';
    return `<button type="button" class="road-stop ${lit?'is-lit':''} ${active?'is-current':''} ${locked?'is-locked':''}" style="--stop-x:${coords[i][0]/width*100}%;--stop-y:${(coords[i][1]+49)/height*100}%" data-action="${action}" data-id="${esc(c.encounters[0].id)}" data-stop="${c.id}" data-focus="map-${layout}-${c.id}" ${locked?'disabled':''} ${active?'aria-current="step"':''} aria-label="${esc(c.title)}${lit?', lit, revisit':active?', continue':', ahead on the road'}"><span>${lit?'<i aria-hidden="true">✦</i> ':''}${esc(c.title)}${active?' <i aria-hidden="true">→</i>':''}</span></button>`;
  }).join('')}
  </div>`;
 }).join('');
}

function sceneOperation(effect,solved,id){
 const on=solved?gold:'#81927b';
 const wheels='<circle cx="-34" cy="36" r="8" fill="#536b53"/><circle cx="34" cy="36" r="8" fill="#536b53"/>';
 const cradle=(x,color)=>`<g transform="translate(${x} 0)"><path d="M-17 0h34l-4 27h-26z" fill="${color}" ${line}/><path d="M-18 30h36" stroke="#7e8c69" stroke-width="4"/></g>`;
 const litLamps=(colorful=false)=>[-96,-48,0,48,96].map((x,i)=>`<g transform="translate(${x} 0)">${lamp(0,5,solved,.95)}${colorful&&solved?`<circle cy="-10" r="7" fill="${['#f6ca68','#a6ccb9','#d49a7c'][i%3]}"/>`:''}</g>`).join('');
 if(effect==='cargo')return `<g ${line}>${[-48,0,48].map((x,i)=>cradle(x,['#bd8562','#d8bc70','#8ba477'][solved?i:[2,0,1][i]])).join('')}${solved?lanternTree(0,-3,.43):'<path d="M-96 40h192" stroke="#a89a72"/>'}</g>`;
 if(effect==='crossing')return `<g ${line}><path d="M-35-35h70m-32 0V9" fill="none"/><g class="${solved?'bell-ringing':''}" transform="translate(0 3)"><path d="M-23 17q12-12 10-29Q0-33 13-12q-2 29 10 29z" fill="#d3ad5f"/><path d="M-27 18h54M0 20v7"/></g>${solved?'<path d="M-40-12q-14 15 0 29m80-29q14 15 0 29" stroke="#d7b45f" fill="none"/>':''}<path d="M-117 45q31-13 60 0t60 0t60 0t60 0" stroke="#7aaba0" fill="none"/></g>`;
 if(effect==='paths'||effect==='streets')return `<g ${line}><path d="M-110 36-55-10 0 25 55-17 110 28" fill="none" stroke="#b4a073" stroke-width="9"/>${[-90,-42,17,74].map((x,i)=>lamp(x,[22,0,20,0][i],solved,.84)).join('')}</g>`;
 if(effect==='garden')return `<g ${line}><path d="m-96 5 135-20 51 42-135 20z" fill="#a78561"/><path d="m-93 5 51 40m-9-51 51 40m-9-50 51 40m-103-9 130-18" fill="none" stroke="#d7bc8b"/>${solved?[-43,0,43].map((x,i)=>leaf(x,10-i*5,.5)).join(''):''}</g>`;
 if(effect==='cable')return `<g ${line}><path d="M-117-32 118 0M-117-38v78m235-47v47" fill="none" stroke-width="4"/><g class="cable-car" transform="translate(${solved?72:-72} ${solved?-6:-26})"><path d="M0 0v20m-25 5 25-8 25 8v36h-50z" fill="#b49a6a"/><path d="M-20 28h40v17h-40z" fill="#cbd3aa"/><circle r="7" fill="#9ba68c"/></g>${solved?star(93,38,4):''}</g>`;
 if(effect==='game')return `<g ${line}>${solved?'<path d="M-36 32q-15-18 9-31l-7-17 35 6 34-6-7 17q24 13 12 31z" fill="#b08d65"/><path d="M-7-8 0 10l8-18M0 10v21" fill="none"/>':`<path d="M-81 39-57-24l110 7 32 56z" fill="#cba27a"/>${[-43,-13,17,47].map((x,i)=>`<ellipse cx="${x}" cy="${10+i%2*14}" rx="10" ry="7" fill="#a9b2a2"/>`).join('')}`}</g>`;
 if(effect==='floor')return `<g ${line}><path d="m-101 26 31-38 137 0 30 38z" fill="#a2a786"/>${Array.from({length:6},(_,i)=>`<path d="m${-85+(i%3)*52} ${i<3?4:25} 16-18h40l-10 18z" fill="${solved||i%2===0?'#d0bc8e':'#77876a'}" stroke-width="1.2"/>`).join('')}<g transform="translate(${solved?47:-90} -8) scale(.7)"><path d="M-45 25h90m-49-5v-14" fill="none" stroke-width="5"/>${wheels}${lanternTree(0,0,.66)}</g></g>`;
 if(effect==='cupboard')return `<g ${line}><path d="M-44-37h88v80h-88z" fill="#ad8d62"/><path d="M-35-28h70v58h-70z" fill="#4b634d"/><path d="M-35 2h70" stroke="#bca072"/>${[-17,17].map(x=>lamp(x,7,true,.72)).join('')}${solved?'<path d="M-44-37-67-21v76l23-12m88-80 23 16v76l-23-12" fill="#bca071"/><path d="M-55 0v12m110-12v12" fill="none"/>':'<path d="M-43-36H0v78h-43zM0-36h43v78H0z" fill="#b29569"/><circle cx="-8" cy="5" r="3"/><circle cx="8" cy="5" r="3"/>'}</g>`;
 if(effect==='mirrors')return `<g ${line}><path d="M-116 24h30m1-30 30 30m60-52 30 30" fill="none" stroke="#b7c9b9" stroke-width="8"/><path d="${solved?'M-116 25H-70L20-22 105-22':'M-116 25H-70L-33 55'}" fill="none" stroke="#e9c567" stroke-width="4"/>${lamp(105,-13,solved,.9)}</g>`;
 if(effect==='beacon')return `<g ${line}><path d="M-19 33V-29h38v62zM-26-29 0-48l26 19z" fill="#a99d73"/>${solved?'<path d="M0-7 124-37v69L0 5zM0-7-124-37v69L0 5z" fill="#f9d978" stroke="none" opacity=".5" class="beacon-turning"/>':''}<circle cy="-2" r="12" fill="#f2d07c"/><path d="M-26 34h52"/></g>`;
 if(effect==='fountain')return `<g ${line}><ellipse cy="40" rx="89" ry="19" fill="#9dbbab"/><path d="M-34 37q0-14 34-14t34 14" fill="#b4ad86"/>${solved?'<path d="M0 28v-57m-8 40Q-16-18-35-1M8 14Q16-18 35-1" fill="none" stroke="#b0d4c1" stroke-width="7"/>':''}<g transform="translate(0 ${solved?-20:28})"><path d="M-43 0h86l-9 11h-68z" fill="#c6b48a"/>${lanternTree(0,-3,.53)}</g></g>`;
 return `<g ${line}><path d="M-122-41q122 17 244 0" fill="none" stroke="#a2976d"/>${litLamps(id==='ridge'||id==='citadel')}</g>`;
}

function foreground(encounter,solved,stage){
 const ground='<path d="M0 215Q136 174 295 202T600 197v83H0z" fill="#d9d9b9"/><path d="M0 262Q200 225 600 260" stroke="#c1c3a1" stroke-width="2" fill="none"/>';
 const crew=COMPANIONS.map((c,i)=>`<g class="scene-companion scene-companion-${c.id}" transform="translate(${28+i*88} ${i%2?171:182}) scale(.63)">${companionDrawing(c.id)}</g>`).join('');
 const id=CHAPTERS[encounter.chapterIndex].id;
 return `${ground}<g class="scene-mechanism" transform="translate(263 94) scale(1.15)">${sceneOperation(encounter.effect,solved,id)}</g>${lanternTree(506,164,.67)}${stage===3?star(430,82,5)+star(543,133,4):''}${crew}`;
}
function lightOverlay(id,stage){
 const lit=stage>=3,points={ferry:[[557,95]],marsh:[[563,153],[218,156]],ridge:[[146,198],[80,169],[319,181]],workshop:[[223,103],[484,128],[532,140]],lighthouse:[[423,57],[64,185],[83,188]],citadel:[[356,58],[315,245],[391,245],[54,112]]};
 const lights=lit?points[id].map(([x,y])=>`<g class="scene-lamp-glow"><circle cx="${x}" cy="${y}" r="25" fill="#ffd16a" opacity=".12"/><circle cx="${x}" cy="${y}" r="15" fill="#ffd16a" opacity=".2"/><ellipse cx="${x}" cy="${y}" rx="4" ry="8" fill="#ffe5a4" opacity=".7"/></g>`).join(''):'';
 const beam=id==='lighthouse'&&stage>=1?`<path d="M423 57 0 ${stage>=2?5:91}V${stage>=2?115:160}L423 66z" fill="#ffe08b" opacity=".24" class="${stage>=2?'harbor-beam':''}"/>`:'';
 return `<svg class="scene-light-overlay" viewBox="0 0 600 400" aria-hidden="true">${lights}${beam}</svg>`;
}
export function encounterScene(encounter,profile,puzzle,attempt){
 const chapter=CHAPTERS[encounter.chapterIndex]||CHAPTERS.find(c=>c.encounters.some(e=>e.id===encounter.id))||CHAPTERS[0];
 const index=chapter.encounters.findIndex(e=>e.id===encounter.id),solved=!!(puzzle&&attempt&&isSolved(puzzle,attempt.board));
 const stage=Math.max(0,index)+(solved?1:0),lit=stage>=3;
 const label=solved?encounter.success:encounter.intro;
 return `<aside class="encounter-scene ${solved?'scene-solved':''} ${lit?'stop-lit':''}" data-stop="${chapter.id}" data-stage="${stage}" data-solved="${solved}" aria-label="${esc(chapter.title)}">
   <figure class="road-scene-picture" role="img" aria-label="${esc(label)}"><img src="./assets/road/${chapter.id}.jpg" alt="" width="1536" height="1024"><div class="scene-atmosphere" aria-hidden="true"></div>${lightOverlay(chapter.id,stage)}${lit?'<div class="scene-shine" aria-hidden="true"></div>':''}</figure>
   <svg class="road-scene-foreground" viewBox="0 0 600 280" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${foreground(encounter,solved,stage)}</svg>
   <details class="scene-story"><summary>Story</summary><div><p>${esc(label)}</p><button type="button" data-action="hear-story" data-text="${esc(label)}" class="text-button" aria-label="Listen to story">Listen</button></div></details>
 </aside>`;
}
