// Use an isolated profile with solved fixtures; never modify a family save.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {freshAttempt,move,nextHint,isSolved} from '../dist/engine.js';
import {emptyStore,SAVE_KEY,parseBackup} from '../dist/storage.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:4187';
const {puzzles}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const attempts={};
for(const p of puzzles){
 let a=freshAttempt(p,()=>.5);
 for(let step=0;!isSolved(p,a.board)&&step<200;step++){const h=nextHint(p,a);a=move(p,a,h.action||h.pair,()=>.5);}
 assert.ok(isSolved(p,a.board),p.id);attempts[p.id]={...a,helpUsed:true,hintLevel:3};
}
const saved={...emptyStore(),activeProfileId:'qa',profiles:[{id:'qa',name:'Reattempt QA',avatar:0,band:'k1',sound:false,attempts}]};
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
await context.addInitScript(({origin,key,saved})=>{
 if(location.origin!==origin)return;
 if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(saved));
 window.randomDraws=0;window.randomSample=.01;
 Math.random=()=>{window.randomDraws++;return window.randomSample;};
},{origin:new URL(base).origin,key:SAVE_KEY,saved});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
const attempt=async id=>(await state()).profiles[0].attempts[id];
const goto=async id=>{await page.goto(`${base}/#play/${id}`);await page.locator(`[data-puzzle-id="${id}"] .board-panel`).waitFor();};
try{
 await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
 for(const p of puzzles){
  await goto(p.id);
  await page.locator('.solved-indicator').waitFor();
  assert.equal(await page.locator('#completion-heading').count(),0,p.id);
  assert.equal(await page.locator('.hint-card').count(),0,p.id);
  const a=await attempt(p.id);
  assert.deepEqual(a.board,freshAttempt(p,()=>.01).board,p.id);
  assert.equal(a.completed,true);assert.equal(a.helpUsed,true);assert.equal(a.moves,0);assert.equal(a.hintLevel,0);assert.deepEqual(a.history,[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,p.id);
 }
 // Reopening through the library also resets solved answers, with no route-only shortcut.
 await goto('swap-k1-01');await page.locator('[data-action=swap-pair]').first().click();await page.locator('#completion-heading').waitFor();
 await page.locator('[data-action=library]').first().click();
 const family=page.locator('.satchel-family').filter({has:page.locator('[data-id="swap-k1-01"]')});await family.locator('summary').click();
 await page.locator('[data-id="swap-k1-01"]').click();await page.locator('.solved-indicator').waitFor();
 assert.deepEqual((await attempt('swap-k1-01')).board,puzzles.find(p=>p.id==='swap-k1-01').start);
 await page.locator('[data-action=swap-pair]').first().click();await page.locator('#completion-heading').waitFor();
 await page.reload();await page.locator('.solved-indicator').waitFor();assert.equal(await page.locator('#completion-heading').count(),0);
 // An unfinished randomized replay survives a reload, including its actual observation.
 await goto('weigh-04');const initial=await attempt('weigh-04');
 for(let i=0;i<3;i++)await page.locator('[data-action=hint]').click();
 await page.locator('[data-action=apply-hint]').click();const measured=await attempt('weigh-04');
 assert.equal(measured.board.observations.length,1);assert.deepEqual(measured.board.secret,initial.board.secret);
 await page.reload();await page.locator('.balance-play').waitFor();assert.deepEqual(await attempt('weigh-04'),measured);
 await page.locator('[data-action=undo]').click();assert.deepEqual((await attempt('weigh-04')).board.secret,initial.board.secret);
 await page.evaluate(()=>{window.randomSample=.99;window.randomDraws=0;});await page.locator('[data-action=restart]').click();
 assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.evaluate(()=>window.randomDraws),1);
 const reset=await attempt('weigh-04');assert.notDeepEqual(reset.board.secret,initial.board.secret);assert.notEqual(reset.board.secret[1],initial.board.secret[1]);
 assert.deepEqual(reset.board.observations,[]);assert.equal(reset.board.answer,null);assert.equal(reset.completed,true);assert.deepEqual(reset.history,[]);assert.equal(reset.hintLevel,0);
 // Solving then replaying draws again; the completion indicator stays persistent.
 for(let i=0;i<3;i++)await page.locator('[data-action=hint]').click();
 for(let steps=0;!await page.locator('#completion-heading').count()&&steps<10;steps++)await page.locator('[data-action=apply-hint]').click();
 await page.locator('#completion-heading').waitFor();
 await page.evaluate(()=>{window.randomSample=.01;window.randomDraws=0;});await page.locator('[data-action=replay]').click();
 assert.equal(await page.evaluate(()=>window.randomDraws),1);assert.deepEqual((await attempt('weigh-04')).board.secret,initial.board.secret);
 assert.equal(await page.locator('#completion-heading').count(),0);await page.locator('.solved-indicator').waitFor();
 assert.doesNotThrow(()=>parseBackup(JSON.stringify(saved),puzzles));
 const live=await state();assert.doesNotThrow(()=>parseBackup(JSON.stringify(live),puzzles));
 await page.screenshot({path:new URL('../test-results/reattempt-balance-phone.png',import.meta.url).pathname,fullPage:true});
 assert.deepEqual(errors,[]);
 const report={passed:true,puzzles:puzzles.length,checks:['all completed puzzles reopen without solutions or hints','library reopening and reload','completion stays saved','random balance restart/replay','stable secret through reload and undo','immediate restart','phone layout'],errors};
 await writeFile(new URL('../test-results/reattempt-browser-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
