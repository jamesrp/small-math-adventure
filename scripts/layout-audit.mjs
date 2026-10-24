// Layout audit: opens every puzzle of every module on the family seam
// (dist/families.js) and of the twelve base mechanics (dist/puzzles.json) at
// phone and tablet sizes with touch, and measures what a child has to hit and
// read: tap targets, text size, horizontal overflow, how far the board runs
// below the screen, wrapped button rows, clipped and overlapping labels. It
// reports; it does not fail. docs/layout-audit.md has the method, the known
// false positives and the latest ranked results.
//
//   node scripts/layout-audit.mjs                       # every module
//   TEST_FAMILY=seeds node scripts/layout-audit.mjs     # one module (or a comma list; base-tile for a base mechanic)
//   TEST_PUZZLE=seeds-03 node scripts/layout-audit.mjs  # one puzzle
//   node scripts/layout-audit.mjs report a.json b.json  # ranked Markdown from saved runs
//   TEST_FAMILY=road node scripts/layout-audit.mjs      # the Lantern Road's encounters (road-k1, road-23, road-45 for one trail)
//
// Road modules open each main road encounter as a child first meets it (the
// trail finished up to the stop before, played through the road's own rules),
// with its scene, keeper and stage, and add an iPad in landscape (1180 × 820).
// TEST_ROAD picks the encounters: "staged" (default: the four played inside
// their picture), "all", or a comma list of encounter ids. They are not part
// of the default run.
//
// Environment: TEST_URL (default http://127.0.0.1:4187), PLAYWRIGHT_MODULE,
// BROWSER_EXECUTABLE (as in browser-smoke.mjs), AUDIT_OUT (JSON path, default
// <os tmp>/layout-audit/<family or all>.json), AUDIT_SHOTS (folder for marked
// full-page screenshots of puzzles with findings, default <os tmp>/layout-audit/shots;
// 0 turns them off), AUDIT_VIEWPORTS (comma list of viewport names below).
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

// ---- Thresholds -------------------------------------------------------------
const VIEWPORTS=[
 {name:'390x844',width:390,height:844},   // iPhone 12–15
 {name:'375x667',width:375,height:667},   // iPhone SE
 {name:'820x1180',width:820,height:1180}  // iPad Air, portrait
];
// Road modules add an iPad in landscape, where the scene above the board matters most.
const LANDSCAPE={name:'1180x820',width:1180,height:820};
const ALL_VIEWPORTS=[...VIEWPORTS,LANDSCAPE];
const PHONE='390x844';  // the size on which a board running off the screen counts as a problem
const START=120;  // road modules: px of the board panel (all of it, if shorter) that must show on the first screen
const THRESHOLDS={
 target:40,      // a tap target whose effective hit area is thinner than this in any direction is flagged (the repo's floor)
 targetGoal:44,  // 40–43 px is noted separately as a near miss
 text:12,        // rendered font size, px, after SVG viewBox and CSS transform scaling
 crowd:40,       // another target's centre closer than this is noted as crowding
 crowdCount:2,   // ...when at least this many neighbours are that close (a dense cluster)
 overlap:1/3,    // two text boxes overlapping by more than this share of the smaller one
 clipLoss:4,     // px of a target or label cut off by an overflow:hidden box, an <svg> edge or the screen's side...
 clipShare:0.25, // ...and at least this share of its width or height
 probeReach:48   // px walked out from a target's centre in each direction when measuring its hit area
};
// ---- Selectors --------------------------------------------------------------
const SELECTORS={
 scope:'#main',                 // the play screen below the app's top bar: How to play, the board and its controls
 board:'.board-panel',          // the board's panel, for the below-the-fold measure
 controls:'.play-sidebar',      // Undo, Restart, Hint
 ready:id=>`[data-puzzle-id="${id}"] .board-panel`,
 // Natively interactive elements. tabindex="-1" marks focus landings (headings), not targets.
 native:'button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=checkbox],[role=radio],[role=switch],[role=slider],[role=tab],[role=menuitem],[role=option],[tabindex]:not([tabindex="-1"]),[data-action],[contenteditable=true]',
 // Single controls: a hit shape found by cursor or hook inside one of these is measured as part of it.
 control:'button,a[href],label,summary,[role=button],[role=link],[role=checkbox],[role=radio],[role=switch],[role=tab],[role=menuitem],[role=option],[role=slider]',
 // Boards make SVG and HTML marks tappable with a pointer cursor (boards.css look) ...
 cursors:['pointer','grab','grabbing','crosshair','move','cell','col-resize','row-resize','ew-resize','ns-resize'],
 // ... and with the data hooks their wire() handlers find through closest(): every
 // attribute selector passed to closest() in dist/ is read at start-up and used (class-only
 // selectors such as .gb-edge also find containers and lines, so they are left out), except
 // these containers, which hold targets rather than being one.
 // Classes skipped when naming an element in the report: the shared button looks and states.
 genericClasses:['secondary','expansion-action','primary','quiet','small','wide','text-button','hint-button','danger','selected','active','chosen','picked','current','hinted','done','on','off','act','empty','filled','disabled'],
 hookIgnore:['.board-panel','.clock-board','.latin-puzzle','.st-puzzle','.ns-row','.hills-col','.lr-keeper','.skip-link','[data-action]','[data-pb-view-board]','[data-gb-board],.av-keys','input,select,textarea','input,select,textarea,svg']
};

const here=dirname(fileURLToPath(import.meta.url)),dist=join(here,'../dist');
const out=process.env.AUDIT_OUT||join(tmpdir(),'layout-audit',`${process.env.TEST_PUZZLE||process.env.TEST_FAMILY||'all'}.json`.replace(/[^\w.,-]/g,'_'));
const shotDir=process.env.AUDIT_SHOTS==='0'?null:process.env.AUDIT_SHOTS||join(tmpdir(),'layout-audit','shots');

// Every selector the board code hands to closest(), read from dist/ so new families are covered.
function hookSelectors(){
 const files=[],walk=dir=>{for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory()&&e.name!=='art')walk(p);else if(e.name.endsWith('.js'))files.push(p);}};walk(dist);
 return Promise.all(files.map(f=>readFile(f,'utf8'))).then(texts=>[...new Set(texts.flatMap(t=>[...t.matchAll(/closest\((['"])([^'"]+)\1\)/g)].map(m=>m[2])))].filter(s=>s.includes('[')&&!SELECTORS.hookIgnore.includes(s)).sort());
}

// Runs in the page. Returns only what is flagged, plus counts.
function measure(cfg){
 const T=cfg.thresholds,S=cfg.selectors;
 scrollTo(0,0);
 const root=document.querySelector(S.scope)||document.body,vw=innerWidth,vh=innerHeight;
 const css=el=>getComputedStyle(el),R=el=>el.getBoundingClientRect(),round=v=>Math.round(v*10)/10;
 const shown=el=>el.checkVisibility?el.checkVisibility({opacityProperty:true,visibilityProperty:true}):true;
 // Screen-reader-only text and controls (.sr-only, .pebble-place-name: a 1 px box that clips or hides its overflow).
 const srOnly=el=>{for(let a=el;a&&a!==document.body;a=a.parentElement){const s=css(a),r=R(a);if((s.clip!=='auto'&&/absolute|fixed/.test(s.position)&&(r.width<=2||r.height<=2))||/inset\(50%/.test(s.clipPath)||(s.overflow!=='visible'&&(r.width<=2||r.height<=2)))return true;}return false;};
 const classes=el=>(el.getAttribute('class')||'').trim().split(/\s+/).filter(Boolean);
 // A name for "the same element" across puzzles: tag and first class that is not a shared button look
 // or a state, or the nearest classed ancestor's.
 const sig=el=>{const c=classes(el).find(c=>!S.genericClasses.includes(c)),tag=el.tagName.toLowerCase();if(c)return `${tag}.${c}`;const up=el.parentElement?.closest('[class]');return `${up?`.${classes(up)[0]} `:''}${tag}${el.dataset?.action?`[${el.dataset.action}]`:''}`;};
 const label=el=>(el.getAttribute('aria-label')||el.textContent||el.getAttribute('title')||'').replace(/\s+/g,' ').trim().slice(0,32);
 const box=r=>({x:Math.round(r.left),y:Math.round(r.top+scrollY),w:round(r.width),h:round(r.height)});
 // ---- clipping by overflow:hidden boxes, <svg> edges and the screen's sides
 const clipOf=(el,r,self)=>{let l=r.left,rt=r.right,tp=r.top,b=r.bottom;for(let a=self?el:el.parentElement;a&&a!==document.documentElement;a=a.parentElement){const s=css(a),ox=s.overflowX,oy=s.overflowY,svg=a.tagName.toLowerCase()==='svg';if(!svg&&ox==='visible'&&oy==='visible')continue;const ar=R(a);if(svg?s.overflow!=='visible':['hidden','clip'].includes(ox)){l=Math.max(l,ar.left);rt=Math.min(rt,ar.right);}if(svg?s.overflow!=='visible':['hidden','clip'].includes(oy)){tp=Math.max(tp,ar.top);b=Math.min(b,ar.bottom);}}l=Math.max(l,0);rt=Math.min(rt,vw);const lostW=r.width-Math.max(0,rt-l),lostH=r.height-Math.max(0,b-tp);return (lostW>T.clipLoss&&lostW>T.clipShare*r.width)||(lostH>T.clipLoss&&lostH>T.clipShare*r.height)?{lostW:round(lostW),lostH:round(lostH)}:null;};
 // ---- candidates
 const found=new Map(),take=(el,via)=>{if(!found.has(el))found.set(el,via);};
 for(const el of root.querySelectorAll(S.native))take(el,'native');
 for(const el of root.querySelectorAll('*')){const c=css(el).cursor;if(S.cursors.includes(c)&&el.parentElement&&css(el.parentElement).cursor!==c)take(el,'cursor');}
 // A hook alone marks a target only when the element also has a role, a name, focus or a pointer cursor, or
 // the hook names a drop zone (Square leftovers' [data-lo-drop] bins): the portal board puts data-pb-point on
 // every point so a finger slide can find it, but only acting points take taps.
 for(const sel of cfg.hooks){try{for(const el of root.querySelectorAll(sel))if(/drop/.test(sel)||el.matches('[role],[aria-label],[tabindex]:not([tabindex="-1"])')||S.cursors.includes(css(el).cursor))take(el,'hook');}catch{}}
 const targets=[];
 for(let [el,via] of found){
  // A hit shape inside a single control (a knot arc's path.kn-hit inside its role=button group) is part of
  // that control; inside a focusable board (svg tabindex=0 role=group) it is a target of its own.
  if(via!=='native'){const up=el.parentElement?.closest(S.control);if(up&&root.contains(up))continue;}
  if(el.matches('input')&&el.labels?.length&&(!shown(el)||srOnly(el)))el=el.labels[0];  // a styled radio or checkbox: its label is what is tapped
  else if(el.matches('input')&&el.closest('label'))el=el.closest('label');
  if(targets.some(t=>t.el===el))continue;
  if(!el.isConnected||!shown(el)||el.closest('[inert]')||srOnly(el))continue;
  if(el.matches(':disabled,[aria-disabled="true"]')||el.closest('[aria-disabled="true"],fieldset:disabled'))continue;
  if(css(el).pointerEvents==='none')continue;
  const r=R(el);if(r.width<1||r.height<1)continue;
  const lost=clipOf(el,r);if(lost&&lost.lostW>=r.width-1||lost&&lost.lostH>=r.height-1)continue;  // drawn outside its <svg> or box: not on screen at all
  targets.push({el,r,via});
 }
 // ---- effective hit area: walk out from a point inside the target until elementFromPoint stops landing in it
 const inside=(el,x,y)=>{if(x<0||y<0||x>=vw||y>=vh)return false;const h=document.elementFromPoint(x,y);return !!h&&(h===el||el.contains(h)||(el.control&&h===el.control));};
 const dirs=[[1,0],[0,1],[Math.SQRT1_2,Math.SQRT1_2],[Math.SQRT1_2,-Math.SQRT1_2]];
 const walk=(el,x,y,dx,dy)=>{let t=0;while(t<T.probeReach&&inside(el,x+dx*(t+4),y+dy*(t+4)))t+=4;while(t<T.probeReach&&inside(el,x+dx*(t+1),y+dy*(t+1)))t++;return t;};
 for(const t of targets){
  let r=R(t.el),cy=r.top+r.height/2;
  if(cy<80||cy>vh-80){scrollBy(0,cy-vh/2);r=R(t.el);}
  // Chords through a point in four directions; the thinnest is the target's width there. A chord may pass the
  // box (a ::after hit area, an overflowing child); one that reaches probeReach both ways stands for the box.
  const capped=T.probeReach*2+1,full=(c,side)=>c>=capped?Math.max(c,side):c;
  const at=([x,y])=>{const c=dirs.map(([dx,dy])=>walk(t.el,x,y,dx,dy)+walk(t.el,x,y,-dx,-dy)+1),w=full(c[0],r.width),h=full(c[1],r.height);return {w:round(w),h:round(h),min:round(Math.min(w,h,...c.slice(2).map(v=>v>=capped?Infinity:v)))};};
  let points=[[.5,.5],[.5,.3],[.5,.7],[.3,.5],[.7,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75],[.5,.1],[.5,.9],[.1,.5],[.9,.5]].map(([fx,fy])=>[r.left+r.width*fx,r.top+r.height*fy]).filter(([x,y])=>inside(t.el,x,y));
  // A thin ring or curve (a knot's loop) can miss every point of that grid: try points along its strokes.
  if(!points.length)for(const g of [t.el,...t.el.querySelectorAll('*')].filter(e=>e instanceof SVGGeometryElement)){const m=g.getScreenCTM(),len=g.getTotalLength?.()||0;if(!m||!len)continue;for(let k=0;k<24&&!points.length;k++){const q=g.getPointAtLength(len*k/24),x=m.a*q.x+m.c*q.y+m.e,y=m.b*q.x+m.d*q.y+m.f;if(inside(t.el,x,y))points=[[x,y]];}if(points.length)break;}
  if(!points.length){t.covered=r.left>=vw||r.right<=0?'offscreen':'covered';t.size={w:round(r.width),h:round(r.height),min:round(Math.min(r.width,r.height))};continue;}
  // An HTML box is widest at its centre. An SVG mark (a road, a badge on a line) or a box whose centre is
  // covered is measured where it is widest of the points that land in it.
  t.size=at(points[0]);
  if(t.size.min<T.targetGoal&&(t.el instanceof SVGElement||!inside(t.el,r.left+r.width/2,r.top+r.height/2)))for(const pt of points.slice(1)){const s=at(pt);if(s.min>t.size.min)t.size=s;if(t.size.min>=T.targetGoal)break;}
  t.bbox={w:round(r.width),h:round(r.height)};
  t.centre=[r.left+r.width/2,r.top+r.height/2+scrollY];
 }
 scrollTo(0,0);
 for(const t of targets)if(t.centre){const near=targets.filter(o=>o!==t&&o.centre&&Math.hypot(o.centre[0]-t.centre[0],o.centre[1]-t.centre[1])<T.crowd);t.crowd=near.length;}
 // ---- text
 const texts=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 for(let n;(n=walker.nextNode());){
  const text=n.nodeValue.replace(/\s+/g,' ').trim(),el=n.parentElement;
  if(!text||!el||el.closest('script,style,noscript,title,desc,metadata,option,template')||!shown(el)||srOnly(el))continue;
  const s=css(el),isSvg=el instanceof SVGElement;
  if(isSvg?(s.fill==='none'||/rgba\(.*,\s*0\)$/.test(s.fill)||Number(s.fillOpacity)===0)&&s.stroke==='none':/rgba\(.*,\s*0\)$/.test(s.color))continue;
  const range=document.createRange();range.selectNodeContents(n);
  const rects=isSvg?[R(el)]:[...range.getClientRects()].filter(r=>r.width>1&&r.height>1);
  if(!rects.length||rects.every(r=>r.right<0||r.bottom+scrollY<0))continue;
  let scale=1;
  if(isSvg){const m=el.getScreenCTM();if(m)scale=Math.sqrt(Math.abs(m.a*m.d-m.b*m.c));}
  else if(el.offsetWidth>0)scale=R(el).width/el.offsetWidth;  // a CSS transform: scale()
  const px=parseFloat(s.fontSize)*scale;
  texts.push({el,text:text.slice(0,40),px:round(px),rects,ariaHidden:!!el.closest('[aria-hidden="true"]')});
 }
 // ---- overlapping labels (a duplicate drawn under itself as a halo is not an overlap)
 const overlaps=[];
 const area=r=>r.width*r.height,cross=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
  const a=texts[i],b=texts[j];if(a.el===b.el||a.el.contains(b.el)||b.el.contains(a.el))continue;
  for(const ra of a.rects)for(const rb of b.rects){const c=cross(ra,rb);if(c>T.overlap*Math.min(area(ra),area(rb))&&!(a.text===b.text&&Math.abs(ra.left-rb.left)<2&&Math.abs(ra.top-rb.top)<2)){overlaps.push({a:{sig:sig(a.el),text:a.text,...box(ra)},b:{sig:sig(b.el),text:b.text,...box(rb)},share:Math.round(c/Math.min(area(ra),area(rb))*100)/100});break;}}
 }
 // ---- wrapped button rows: a flex-wrap row of targets laid out on more than one line
 const isTarget=new Set(targets.map(t=>t.el)),wraps=[];
 for(const el of root.querySelectorAll('*')){
  const s=css(el);if(!s.display.includes('flex')||!s.flexWrap.startsWith('wrap')||s.flexDirection.startsWith('column'))continue;
  const kids=[...el.children].filter(k=>{const r=R(k);return r.width>0&&r.height>0;});
  if(kids.length<2||kids.filter(k=>isTarget.has(k)||[...isTarget].some(t=>k.contains(t))).length<kids.length/2)continue;
  // Lines are counted by vertical extent, so items of different heights centred on one line are one line.
  let lines=0,bottom=-Infinity;for(const r of kids.map(R).sort((x,y)=>x.top-y.top)){if(r.top>=bottom-2){lines++;bottom=r.bottom;}else bottom=Math.max(bottom,r.bottom);}
  // extra: the height the wrapping adds over one line of its tallest item
  if(lines>1)wraps.push({sig:sig(el),rows:lines,items:kids.length,top:Math.round(R(el).top),bottom:Math.round(R(el).bottom),extra:Math.round(R(el).height-Math.max(...kids.map(k=>R(k).height))),labels:kids.slice(0,6).map(label)});
 }
 // ---- scroll strips: a box that scrolls sideways inside the page
 const strips=[];for(const el of root.querySelectorAll('*')){const s=css(el);if(['auto','scroll'].includes(s.overflowX)&&el.scrollWidth>el.clientWidth+2)strips.push({sig:sig(el),hidden:el.scrollWidth-el.clientWidth});}
 // ---- fit
 const board=document.querySelector(S.board),controls=document.querySelector(S.controls),br=board&&R(board),cr=controls&&R(controls);
 const scene=document.querySelector('.lr-stage,.lr-scene-art'),sr=scene&&R(scene);
 const fit={overflowX:Math.max(0,document.documentElement.scrollWidth-vw),boardTop:br?Math.round(br.top):null,boardHeight:br?Math.round(br.height):null,boardBelow:br?Math.round(br.bottom-vh):null,controlsBelow:cr&&cr.height?Math.round(cr.bottom-vh):null,pageHeight:document.documentElement.scrollHeight,...(sr?{sceneTop:Math.round(sr.top),sceneHeight:Math.round(sr.height),sceneWidth:Math.round(sr.width)}:{})};
 // ---- flagged output
 const flagged=targets.filter(t=>t.size&&!t.covered&&t.size.min<T.targetGoal).map(t=>({sig:sig(t.el),label:label(t.el),via:t.via,...t.size,bbox:t.bbox,crowd:t.crowd,at:box(t.el.getBoundingClientRect())}));
 const covered=targets.filter(t=>t.covered).map(t=>({sig:sig(t.el),label:label(t.el),why:t.covered,...t.size}));
 const crowded=targets.filter(t=>t.size&&t.size.min>=T.targetGoal&&t.crowd>=T.crowdCount).map(t=>({sig:sig(t.el),label:label(t.el),...t.size,crowd:t.crowd}));
 const clipped=[...targets.filter(t=>t.size).map(t=>({el:t.el,r:R(t.el),kind:'target'})),...texts.map(t=>({el:t.el,r:t.rects.reduce((a,b)=>a.width*a.height>=b.width*b.height?a:b),kind:'text',text:t.text}))].map(c=>{const lost=clipOf(c.el,c.r,c.kind==='text');return lost&&{sig:sig(c.el),kind:c.kind,label:c.text||label(c.el),...lost,w:round(c.r.width),h:round(c.r.height)};}).filter(Boolean);
 const small=texts.filter(t=>t.px<T.text).map(t=>({sig:sig(t.el),text:t.text,px:t.px,ariaHidden:t.ariaHidden,at:box(t.rects[0])}));
 return {fit,counts:{targets:targets.length,texts:texts.length},targets:flagged,covered,crowded,texts:small,overlaps,wraps,strips,clipped};
}

// Outlines what was flagged, for a screenshot a person can check.
function mark(data){
 const layer=document.createElement('div');layer.id='layout-audit-marks';layer.style.cssText='position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none';
 const put=(b,colour,tag)=>{const d=document.createElement('div');d.style.cssText=`position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;outline:2px solid ${colour};outline-offset:0;box-sizing:border-box`;if(tag){const s=document.createElement('span');s.textContent=tag;s.style.cssText=`position:absolute;left:0;top:-13px;font:bold 11px/12px sans-serif;color:#fff;background:${colour};padding:0 2px;white-space:nowrap`;d.append(s);}layer.append(d);};
 for(const t of data.texts)put(t.at,'#1f6feb',`${t.px}`);
 for(const t of data.targets)put(t.at,t.min<40?'#d1242f':'#bf8700',`${Math.round(t.w)}×${Math.round(t.h)}`);
 for(const o of data.overlaps){put(o.a,'#a21caf');put(o.b,'#a21caf');}
 document.documentElement.append(layer);
}

// The road's encounters, each with the save a child has when meeting it: the
// trail finished up to the encounter before, solved through the road's rules.
const STAGED=['ferry-seats','ferry-bell','ferry-lights','marsh-boardwalks'];
async function roadModules(){
 const road=await import('../dist/road.js'),{mechanicFor}=await import('../dist/expansion.js'),eng=await import('../dist/engine.js'),{emptyStore,SAVE_KEY}=await import('../dist/storage.js');
 const puzzles=[...JSON.parse(await readFile(join(dist,'puzzles.json'),'utf8')).puzzles,...JSON.parse(await readFile(join(dist,'proofs.json'),'utf8')).puzzles];
 const want=process.env.TEST_ROAD||'staged',ids=want==='all'?road.MAIN.map(e=>e.id):want==='staged'?STAGED:want.split(',');
 return road.BAND_KEYS.map(band=>{
  const profile={id:`audit-${band}`,name:'Explorer',band,avatar:0,sound:false,attempts:{}},saves={};road.startJourney(profile);
  for(const e of road.MAIN){
   if(ids.includes(e.id))saves[road.campaignId(e.id,band)]=JSON.stringify({...emptyStore(),activeProfileId:profile.id,profiles:[profile]});
   const o=road.beginEncounter(profile,puzzles);let a=eng.freshAttempt(o.puzzle);
   for(let i=0;i<500&&!eng.isSolved(o.puzzle,a.board);i++)a=eng.move(o.puzzle,a,mechanicFor(o.puzzle)?.solve?mechanicFor(o.puzzle).solve(o.puzzle,a.board):(h=>h.action||h.pair)(eng.nextHint(o.puzzle,a)));
   profile.attempts[o.puzzle.id]={...a,completed:true};road.recordSolve(profile,o.puzzle.id,o.encounter.id,puzzles);
  }
  return {id:`road-${band}`,road:true,saveKey:SAVE_KEY,puzzles:road.MAIN.filter(e=>ids.includes(e.id)).map(e=>({id:road.campaignId(e.id,band),encounter:e.id,save:saves[road.campaignId(e.id,band)]}))};
 });
}
async function modules(){
 if(process.env.TEST_FAMILY?.split(',').some(id=>id==='road'||id.startsWith('road-')))return (await roadModules()).map(m=>({...m,match:['road',m.id]}));
 const {FAMILIES}=await import('./packs.mjs');
 const list=[];
 for(const m of FAMILIES.filter(m=>m.pack))list.push({id:m.id,puzzles:JSON.parse(await readFile(new URL(m.pack),'utf8')).puzzles});
 const base=JSON.parse(await readFile(join(dist,'puzzles.json'),'utf8')).puzzles,mechanics=[...new Set(base.map(p=>p.mechanic))];
 for(const mech of mechanics)list.push({id:`base-${mech}`,puzzles:base.filter(p=>p.mechanic===mech)});
 return list;
}

async function audit(){
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
 const base=(process.env.TEST_URL||'http://127.0.0.1:4187').replace(/\/$/,''),only=process.env.TEST_FAMILY?.split(','),puzzleOnly=process.env.TEST_PUZZLE;
 const viewports=VIEWPORTS.filter(v=>!process.env.AUDIT_VIEWPORTS||process.env.AUDIT_VIEWPORTS.split(',').includes(v.name));
 const hooks=await hookSelectors(),cfg={thresholds:THRESHOLDS,selectors:{...SELECTORS,ready:undefined},hooks};
 const chosen=(await modules()).map(m=>({...m,puzzles:m.puzzles.filter(p=>!puzzleOnly||p.id===puzzleOnly)})).filter(m=>m.puzzles.length&&(!only||(m.match||[m.id]).some(id=>only.includes(id))));
 if(!chosen.length)throw new Error(`No module or puzzle matches ${puzzleOnly||only}`);
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const report={generated:new Date().toISOString(),url:base,thresholds:THRESHOLDS,viewports,hooks,modules:[]};
 try{
  for(const m of chosen){
   const result={id:m.id,puzzles:m.puzzles.length,results:[],errors:[]};
   for(const vp of m.road?[...viewports,...(!process.env.AUDIT_VIEWPORTS||process.env.AUDIT_VIEWPORTS.split(',').includes(LANDSCAPE.name)?[LANDSCAPE]:[])]:viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:true,...(m.road?{serviceWorkers:'block'}:{})});
    const page=await context.newPage();page.on('pageerror',e=>result.errors.push(`${vp.name}: ${e.message}`));let cdp=null;
    try{
     if(!m.road){await page.goto(base);await page.locator('#nickname').fill('Explorer');await page.locator('#profile-form button[type=submit]').click();await page.locator('#main').waitFor();}
     for(const p of m.puzzles){
      try{
       // A road encounter loads afresh with the save of a child arriving at it.
       if(m.road){if(page.url()==='about:blank')await page.goto(base);await page.evaluate(([k,v])=>localStorage.setItem(k,v),[m.saveKey,p.save]);await page.goto(`${base}/?audit=${p.id}#play/${p.id}/${p.encounter}`);}
       else await page.goto(`${base}/#play/${p.id}`);
       await page.locator(SELECTORS.ready(p.id)).waitFor({timeout:20000});
       // Let entrance animations, fonts and any fit-to-room pass settle before measuring.
       await page.evaluate(async()=>{await document.fonts?.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.race([Promise.all(document.getAnimations().filter(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))),new Promise(r=>setTimeout(r,1500))]);});
       await page.waitForTimeout(120);
       const data=await page.evaluate(measure,cfg),row={id:p.id,...(p.encounter?{encounter:p.encounter}:{}),viewport:vp.name,...data};
       const findings=data.targets.some(t=>t.min<THRESHOLDS.target)||data.texts.length||data.overlaps.length||data.clipped.length||data.fit.overflowX>0||(vp.name===PHONE&&data.fit.boardBelow>0)||(m.road&&data.fit.boardTop+Math.min(START,data.fit.boardHeight)>vp.height);
       if(shotDir&&findings){
        const path=join(shotDir,m.id,`${p.id}-${vp.name}.jpg`);await mkdir(dirname(path),{recursive:true});
        await page.evaluate(mark,data);await page.screenshot({path,fullPage:true,type:'jpeg',quality:60});await page.evaluate(()=>document.querySelector('#layout-audit-marks')?.remove());
        // A full-page screenshot drops Chromium's touch emulation, and with it
        // (pointer:coarse) and (hover:none): turn it back on for the next
        // puzzle (on a session kept open, since closing one clears it again).
        cdp||=await context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
        row.shot=path;
       }
       result.results.push(row);
      }catch(error){result.errors.push(`${p.id} ${vp.name}: ${error.message.split('\n')[0]}`);}
     }
    }finally{await context.close();}
   }
   report.modules.push(result);
   const s=summarise(result);console.log(JSON.stringify({module:m.id,puzzles:m.puzzles.length,problems:s.problems.length,nearMisses:s.near.length,errors:result.errors.length}));
  }
 }finally{await browser.close();}
 await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,1));
 console.log(`Wrote ${out}`);
}

// ---- summary: one entry per distinct problem (the same element across puzzles and sizes)
const ids=list=>{const groups=new Map();for(const id of list){const m=/^(.*?)(\d+)$/.exec(id);const key=m?m[1]:id;if(!groups.has(key))groups.set(key,[]);if(m)groups.get(key).push(Number(m[2]));}return [...groups].map(([k,nums])=>{if(!nums.length)return k;nums=[...new Set(nums)].sort((a,b)=>a-b);const runs=[];for(const n of nums){const last=runs.at(-1);if(last&&n===last[1]+1)last[1]=n;else runs.push([n,n]);}const pad=n=>String(n).padStart(2,'0');return `${k}${runs.map(([a,b])=>a===b?pad(a):`${pad(a)}–${pad(b)}`).join(', ')}`;}).join('; ');};
function summarise(module){
 const T=THRESHOLDS,groups=new Map();
 const add=(kind,key,vp,id,value,extra={})=>{const k=`${kind}|${key}`;if(!groups.has(k))groups.set(k,{kind,key,byVp:{},labels:new Set(),shown:false});const g=groups.get(k),v=g.byVp[vp]||(g.byVp[vp]={puzzles:new Set(),worst:null});v.puzzles.add(id);if(extra.label)g.labels.add(extra.label.slice(0,24));if(extra.shown!==false)g.shown=true;if(!v.worst||value.score<v.worst.score)v.worst=value;};
 for(const r of module.results){
  const short=r.encounter||(r.id.startsWith(`${module.id}-`)?r.id.slice(module.id.length+1):r.id),vh=ALL_VIEWPORTS.find(v=>v.name===r.viewport).height,board=r.fit.boardBelow+vh;
  // On the road, less than START px of the board (or less than all of a shorter one) on screen at first means scrolling before every move.
  const need=Math.min(START,r.fit.boardHeight??START);
  if(r.fit.sceneTop!==undefined&&r.fit.boardTop+need>vh)add('start','board panel',r.viewport,short,{score:-(r.fit.boardTop+need-vh),text:`board top at ${r.fit.boardTop} px of ${vh}`});
  for(const t of r.targets)add(t.min<T.target?'target':'near',t.sig,r.viewport,short,{score:t.min,text:`${Math.round(t.w)}×${Math.round(t.h)} px${t.min<Math.min(t.w,t.h)-1?` (${Math.round(t.min)} at its thinnest)`:''}`},{label:t.label});
  for(const t of r.crowded)add('crowd',t.sig,r.viewport,short,{score:-t.crowd,text:`${t.crowd} centres within ${T.crowd} px`},{label:t.label});
  for(const t of r.texts)add('text',t.sig,r.viewport,short,{score:t.px,text:`${t.px} px`},{label:t.text,shown:!t.ariaHidden});
  for(const o of r.overlaps)add('overlap',`${o.a.sig} / ${o.b.sig}`,r.viewport,short,{score:-o.share,text:`“${o.a.text}” and “${o.b.text}” ${Math.round(o.share*100)}%`});
  for(const c of r.clipped)add('clipped',`${c.kind} ${c.sig}`,r.viewport,short,{score:-Math.max(c.lostW,c.lostH),text:`${Math.round(Math.max(c.lostW,c.lostH))} of ${Math.round(c.w)}×${Math.round(c.h)} px`},{label:c.label});
  for(const c of r.covered)add('covered',c.sig,r.viewport,short,{score:0,text:c.why},{label:c.label});
  if(r.fit.overflowX>0)add('overflow','page',r.viewport,short,{score:-r.fit.overflowX,text:`${r.fit.overflowX} px`});
  if(r.fit.boardBelow>0)add('fold','board panel',r.viewport,short,{score:-r.fit.boardBelow,text:`${r.fit.boardBelow} px`});
  // A wrapped row counts when it sits in or above a board that, on a 390 × 844 phone, ends below the screen.
  for(const w of r.wraps)add(r.viewport===PHONE&&r.fit.boardBelow>0&&w.top<board?'wrap':'wraps',w.sig,r.viewport,short,{score:-w.extra,text:`${w.rows} rows, +${w.extra} px${r.fit.boardBelow>0?` (board ${r.fit.boardBelow} px off)`:''}`},{label:w.labels.join(' ')});
  for(const s of r.strips)add('strip',s.sig,r.viewport,short,{score:-s.hidden,text:`${s.hidden} px hidden`});
 }
 const all=[...groups.values()].map(g=>({...g,labels:[...g.labels].slice(0,3),byVp:Object.fromEntries(ALL_VIEWPORTS.filter(v=>g.byVp[v.name]).map(({name})=>{const v=g.byVp[name];return [name,{puzzles:[...v.puzzles],worst:v.worst.text,score:v.worst.score}];}))}));
 // A board below the screen counts on a 390 × 844 phone; on the short SE screen and the tablet it is a note.
 const counts=g=>['target','text','overlap','clipped','overflow','wrap','start'].includes(g.kind)||(g.kind==='fold'&&g.byVp[PHONE]);
 const order={overflow:0,start:1,target:1,text:2,clipped:3,overlap:4,fold:5,wrap:6},worst=g=>Math.min(...Object.values(g.byVp).map(v=>v.score));
 const problems=all.filter(counts).sort((a,b)=>order[a.kind]-order[b.kind]||worst(a)-worst(b));
 return {problems,near:all.filter(g=>g.kind==='near').sort((a,b)=>worst(a)-worst(b)),notes:all.filter(g=>!counts(g)&&g.kind!=='near'),instances:problems.reduce((n,g)=>n+Object.values(g.byVp).reduce((m,v)=>m+v.puzzles.length,0),0),errors:module.errors};
}

const KIND={start:'Board starts below the screen',target:'Tap target',near:'Near miss (40–43 px)',crowd:'Crowded targets',text:'Small text',overlap:'Overlapping labels',clipped:'Cut off',covered:'Pointer cursor but no hit at any probe point',overflow:'Page wider than the screen',fold:'Board below the screen',wrap:'Wrapped row above a board that runs off a 390 × 844 screen',wraps:'Wrapped row',strip:'Sideways scroll'};
// "Tap target `button.x` (“+”): 35×35 px at 390×844, 34×34 at 375×667; puzzles 03–09"
const describe=g=>{
 const union=[...new Set(Object.values(g.byVp).flatMap(v=>v.puzzles))];
 const sizes=Object.entries(g.byVp).map(([vp,v])=>`${v.worst} at ${vp.replace('x','×')}${v.puzzles.length<union.length?` (only ${ids(v.puzzles)})`:''}`).join(', ');
 return `${KIND[g.kind]}${['fold','overflow','start'].includes(g.kind)?'':` \`${g.key}\``}${g.labels.length?` (${g.labels.map(l=>`“${l}”`).join(', ')})`:''}${g.kind==='text'&&!g.shown?', aria-hidden':''}: ${sizes}; puzzles ${ids(union)}`;
};
// Classes that start a selector in two modules' stylesheets and in no shared one: each module's rules
// then reach the other's board (pantograph.css's .pg-board{display:block} flattened the Proofs gardens).
async function collisions(){
 const {FAMILIES}=await import('./packs.mjs'),roots=css=>{const out=new Set();for(const block of css.replace(/\/\*[\s\S]*?\*\//g,'').split('}')){const sel=block.split('{').at(-2);if(!sel||sel.trim().startsWith('@'))continue;for(const one of sel.split(',')){const m=/^\s*\.([\w-]+)/.exec(one);if(m)out.add(m[1]);}}return out;};
 const own=new Set(FAMILIES.filter(m=>m.css).map(m=>fileURLToPath(m.css))),shared=new Set();for(const f of readdirSync(dist).filter(f=>f.endsWith('.css')&&!own.has(join(dist,f))))for(const c of roots(await readFile(join(dist,f),'utf8')))shared.add(c);
 const owners=new Map();for(const m of FAMILIES.filter(m=>m.css))for(const c of roots(await readFile(new URL(m.css),'utf8'))){if(shared.has(c))continue;if(!owners.has(c))owners.set(c,[]);owners.get(c).push(m.id);}
 return [...owners].filter(([,o])=>o.length>1);
}
async function report(files){
 const mods=new Map();
 for(const f of files)for(const m of JSON.parse(await readFile(f,'utf8')).modules)mods.set(m.id,m);
 const rows=[...mods.values()].map(m=>({m,s:summarise(m)})).sort((a,b)=>b.s.problems.length-a.s.problems.length||b.s.instances-a.s.instances||a.m.id.localeCompare(b.m.id));
 const cell=t=>t.replace(/\|/g,'\\|');
 const lines=[`Audited ${rows.length} modules, ${rows.reduce((n,r)=>n+r.m.puzzles,0)} puzzles, ${rows.reduce((n,r)=>n+r.m.results.length,0)} puzzle views.`,'',`| Rank | Module | Puzzles | Problems | Near misses | Top issue |`,`|---|---|---|---|---|---|`];
 rows.forEach(({m,s},i)=>{if(s.problems.length)lines.push(`| ${i+1} | ${m.id} | ${m.puzzles} | ${s.problems.length} | ${s.near.length} | ${cell(describe(s.problems[0]))} |`);});
 const worst=rows.filter(r=>r.s.problems.length).slice(0,20);
 lines.push('',`## The ${worst.length} worst modules`,'');
 for(const {m,s} of worst){
  lines.push(`### ${m.id}: ${s.problems.length} problems over ${m.puzzles} puzzles`,'');
  for(const g of s.problems)lines.push(`- ${describe(g)}`);
  for(const g of s.near)lines.push(`- ${describe(g)}`);
  for(const g of s.notes)lines.push(`- Note. ${describe(g)}`);
  lines.push('');
 }
 lines.push('## Other modules with problems','');
 for(const {m,s} of rows.filter(r=>r.s.problems.length).slice(20))lines.push(`- **${m.id}** (${s.problems.length} problems${s.near.length?`, ${s.near.length} near misses`:''}): ${s.problems.map(describe).join(' · ')}`);
 const clean=rows.filter(r=>!r.s.problems.length);
 lines.push('',`## Modules with no problems (${clean.length})`,'',clean.map(({m,s})=>`${m.id}${s.near.length?` (near misses: ${s.near.map(g=>`\`${g.key}\` ${Object.values(g.byVp)[0].worst}`).join(', ')})`:''}`).join(', ')||'None.');
 const errs=rows.filter(r=>r.s.errors.length);if(errs.length)lines.push('','## Errors while auditing','',...errs.map(({m,s})=>`- ${m.id}: ${s.errors.slice(0,3).join('; ')}`));
 const shared=await collisions();if(shared.length)lines.push('','## Classes styled by more than one module','',...shared.map(([c,o])=>`- \`.${c}\`: ${o.join(', ')}`));
 console.log(lines.join('\n'));
}

if(process.argv[2]==='report')await report(process.argv.slice(3));
else await audit().catch(error=>{console.error(error);process.exitCode=1;});
