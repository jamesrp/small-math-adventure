// Isolated test profiles only. Both rescue routes, capability acquisition,
// persistence, old saves, offline completion, and responsive scene checks.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {waitForOffline} from './browser-offline.mjs';
import {getProgress,getEncounter,hasPump,withCampaignPuzzles} from '../dist/caravan.js';
import {freshAttempt,nextHint,move,isSolved} from '../dist/engine.js';
import * as legacy from '../dist/caravan-legacy.js';
import {emptyStore,parseBackup,SAVE_KEY} from '../dist/storage.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const base=process.env.TEST_URL||'http://127.0.0.1:4187';
const {puzzles}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const all=withCampaignPuzzles(puzzles),errors=[],results=[];
await mkdir('test-results/rescue',{recursive:true});
try{
 // Load an actual earlier campaign, then persist the migration through the UI.
 const old={id:'old',name:'Earlier explorer',band:'k1',avatar:0,sound:false,attempts:{}};
 legacy.startJourney(old);
 for(let i=0;i<4;i++){
  if(i===3)legacy.chooseRoute(old,'reeds');
  const o=legacy.beginEncounter(old,puzzles);let a=freshAttempt(o.puzzle);
  for(let step=0;!isSolved(o.puzzle,a.board)&&step<200;step++){const h=nextHint(o.puzzle,a);a=move(o.puzzle,a,h.action||h.pair);}
  old.attempts[o.puzzle.id]=a;legacy.completeEncounter(old,o.puzzle.id,o.encounter.id,puzzles);
 }
 const oldContext=await browser.newContext({viewport:{width:1280,height:900}});
 await oldContext.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:SAVE_KEY,value:JSON.stringify({...emptyStore(),activeProfileId:old.id,profiles:[old]})});
 const oldPage=await oldContext.newPage();oldPage.on('pageerror',e=>errors.push(e.message));await oldPage.goto(base);
 await oldPage.locator('.migration-note').waitFor();await oldPage.locator('[data-action=journal]').first().click();await oldPage.locator('.earlier-journey').waitFor();
 await oldPage.locator('.earlier-journey summary').click();assert.equal(await oldPage.locator('.earlier-journey .journal-entry').count(),4);
 await oldPage.locator('[data-action=map]').first().click();await oldPage.locator('[data-action=change-band]').click();await oldPage.getByRole('button',{name:'Apply',exact:true}).click();
 const migrated=await oldPage.evaluate(key=>JSON.parse(localStorage.getItem(key)).profiles[0],SAVE_KEY);
 assert.equal(migrated.journey.version,2);assert.deepEqual(migrated.attempts,old.attempts);assert.deepEqual(migrated.caravanJourney,old.journey);
 await oldPage.screenshot({path:'test-results/rescue/migration-desktop.png',fullPage:true,animations:'disabled'});await oldContext.close();
 for(const route of ['reeds','ridge']){
  const context=await browser.newContext({viewport:route==='reeds'?{width:390,height:844}:{width:1024,height:768},hasTouch:true,acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const action=name=>page.locator(`[data-action="${name}"]`).first();
  const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  const profile=async()=>{const s=await state();return s.profiles.find(p=>p.id===s.activeProfileId);};
  const fit=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label);
  const imagesReady=()=>page.waitForFunction(()=>[...document.querySelectorAll('img')].every(img=>img.complete&&img.naturalWidth>0));
  const capture=async name=>{await fit(name);await imagesReady();await page.screenshot({path:`test-results/rescue/${route}-${name}.png`,fullPage:true,animations:'disabled'});};
  await page.goto(base);await page.locator('#nickname').fill(`Rescue ${route}`);await page.locator('#profile-form button[type=submit]').click();
  await action('start-journey').waitFor();await capture('opening');
  for(let count=0;count<11;count++){
   if(count===2){
    await page.locator(`[data-action="choose-route"][data-route="${route}"]`).click();
    assert.equal((await profile()).journey.route,route);
   }
   if(count===3){
    await action('continue-journey').click();await page.locator('.equipment-needed').waitFor();
    assert.equal(await page.locator('button[data-move*="fill"],button[data-move*="empty"]').count(),0);
    await page.locator('button[data-move*="pour"]').first().click();
    assert.deepEqual((await profile()).attempts['rescue-tower-lift'].board.amounts,[2,3]);
    const snapshot=(await profile()).attempts['rescue-tower-lift'];
    for(let i=0;i<3;i++)await action('hint').click();
    assert.match(await page.locator('.hint-card').innerText(),/pump/);
    assert.equal(await page.locator('[data-action=apply-hint]').count(),0);
    assert.equal(await page.locator('[data-action=rescue]').count(),0);
    await page.reload();await page.locator('.equipment-needed').waitFor();
    assert.deepEqual((await profile()).attempts['rescue-tower-lift'].board,snapshot.board);
    await capture('sealed-lift');await action('find-workshop').click();
   }else{
    await action(count===0?'start-journey':'continue-journey').click();
   }
   await page.locator('.board-panel').waitFor();
   await page.waitForFunction(()=>document.querySelector('[data-puzzle-id]')?.dataset.puzzleId===location.hash.split('/')[1]);
   const before=await profile(),id=await page.evaluate(()=>location.hash.split('/')[1]),encounterId=await page.evaluate(()=>location.hash.split('/')[2]);
   assert.equal(getProgress(before).completedCount,count);
   assert.equal(await page.locator('.encounter-scene').count(),1);
   await imagesReady();
   assert.equal(await page.locator('.story-caption p').innerText(),getEncounter(encounterId,before.journey).intro);
   assert.equal(await page.locator('[data-action=show-story]').count(),0);
   assert.equal(await page.getByRole('button',{name:'Listen to story',exact:true}).count(),1);
   assert.equal(await page.evaluate(()=>document.querySelector('.story-caption').getBoundingClientRect().bottom<=document.querySelector('.board-panel').getBoundingClientRect().top),true);
   if(count===7)await capture('fern-signal');
   if(count===5||count===6||count===10){
    assert.ok(hasPump(before));assert.ok(await page.locator('button[data-move*="fill"]').count());
    assert.ok(await page.locator('button[data-move*="empty"]').count());
    if(count===6){assert.deepEqual(before.attempts[id].board.amounts,[2,3]);assert.equal(before.attempts[id].moves,1);await capture('pump-lift');}
   }
   for(let i=0;i<3;i++)await action('hint').click();
   const saved=(await profile()).attempts[id];
   await page.reload();await page.locator('.hint-card').waitFor();
   assert.deepEqual((await profile()).attempts[id],saved,`${id}: resume without changes`);
   for(let steps=0;!await page.locator('#completion-heading').count()&&steps<200;steps++)await action('apply-hint').click();
   assert.equal(await page.locator('#completion-heading').count(),1,`${id}: completion`);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'completion-heading');
   assert.equal((await profile()).journey.completed.length,count+1);
   assert.equal(await page.locator('.encounter-scene').getAttribute('data-solved'),'true');
   assert.equal(await page.locator('.story-caption').count(),0);
   await imagesReady();
   assert.equal(await page.locator('.error-banner').count(),0);
   parseBackup(JSON.stringify(await state()),all);
   await fit(`${route}/${id}`);
   if([0,4,6,8,10].includes(count))await capture(['capture','','','','pump-earned','','lift-raised','','fern-free','','escape'][count]);
   results.push({route,id,encounterId});
   await action('finish-encounter').click();await page.locator('.caravan-hero').waitFor();
   parseBackup(JSON.stringify(await state()),all);
   if(count===4){
    await page.reload();await page.locator('.equipment-item').waitFor();assert.ok(hasPump(await profile()));
    await action('pump-info').click();assert.match(await page.locator('dialog').innerText(),/Fill/);await page.getByRole('button',{name:'Done',exact:true}).click();
    if(route==='ridge'){await waitForOffline(page);await context.setOffline(true);await page.reload();await page.locator('.caravan-hero').waitFor();}
   }
  }
  assert.equal(getProgress(await profile()).complete,true);await capture('home');
  await action('journal').click();await page.locator('.journal-pages').waitFor();
  assert.match(await page.locator('.journal-pages').innerText(),route==='reeds'?/Luma/:/Bracken/);
  await page.locator('[data-action=open-encounter][data-id=tower-lift]').click();await page.locator('.board-panel').waitFor();
  assert.equal(await page.locator('#completion-heading').count(),0);assert.ok(await page.locator('button[data-move*="fill"]').count());
  assert.equal((await profile()).journey.completed.length,11);
  await action('library').click();await page.locator('.caravan-library').waitFor();assert.equal(await page.locator('[data-action=open-puzzle]').count(),192);
  await context.setOffline(false);
  await action('parents-gate').click();await page.getByRole('button',{name:'I’m a grown-up',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');await action('export').click();const download=await downloadPromise;
  const backupPath=`test-results/rescue/${route}-backup.json`;await download.saveAs(backupPath);
  const backup=parseBackup(await readFile(backupPath,'utf8'),puzzles);assert.equal(backup.profiles[0].journey.completed.length,11);
  await page.locator('#import-file').setInputFiles(backupPath);await page.getByRole('button',{name:'Done',exact:true}).click();
  assert.equal((await state()).profiles.length,2);assert.equal((await state()).profiles[1].journey.completed.length,11);
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile('test-results/rescue/results.json',JSON.stringify({encounters:results,errors},null,2));
 console.log(JSON.stringify({routes:2,encounters:results.length,offlineRoute:'ridge',errors}));
}finally{await browser.close();}
