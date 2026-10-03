// Isolated browser profiles only. Exercise the complete Lantern Road through
// actual controls, with historical migrations and independent free-play saves.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {waitForOffline} from './browser-offline.mjs';
import {CHAPTERS,COMPANIONS,getProgress,getEncounter,withCampaignPuzzles} from '../dist/caravan.js';
import {freshAttempt,nextHint,move,isSolved} from '../dist/engine.js';
import * as legacy from '../dist/caravan-legacy.js';
import * as rescue from '../dist/caravan-rescue.js';
import {emptyStore,parseBackup,SAVE_KEY} from '../dist/storage.js';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const base=process.env.TEST_URL||'http://127.0.0.1:4187';
const {puzzles}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const all=withCampaignPuzzles(puzzles),errors=[],results=[],checks=[];
const encounters=CHAPTERS.flatMap(c=>c.encounters),bands=(process.env.TEST_BANDS||'k1,23,45').split(',');
const output=new URL('../test-results/road/',import.meta.url);
await mkdir(output,{recursive:true});
const outputPath=name=>new URL(name,output).pathname;
const solve=(p,a=freshAttempt(p))=>{
  for(let steps=0;!isSolved(p,a.board)&&steps<300;steps++){
    const hint=nextHint(p,a);assert.equal(hint.type,'move',`${p.id}: fixture has a next move`);
    a=move(p,a,hint.action||hint.pair);
  }
  assert.ok(isSolved(p,a.board),`${p.id}: fixture solved`);return a;
};
function oldProfile(api,version,count){
  const profile={id:`old-${version}`,name:`Earlier story ${version}`,band:'k1',avatar:0,sound:false,attempts:{}};
  api.startJourney(profile);
  while(api.getProgress(profile).completedCount<count){
    let progress=api.getProgress(profile);
    if(progress.needsRoute)api.chooseRoute(profile,'reeds');
    progress=api.getProgress(profile);
    if(progress.needsLiftVisit){
      const opened=api.beginEncounter(profile,puzzles);
      profile.attempts[opened.puzzle.id]=move(opened.puzzle,freshAttempt(opened.puzzle),{type:'pour',from:0,to:1});
    }
    const opened=api.beginEncounter(profile,puzzles);
    profile.attempts[opened.puzzle.id]=solve(opened.puzzle,profile.attempts[opened.puzzle.id]);
    assert.equal(api.completeEncounter(profile,opened.puzzle.id,opened.encounter.id,puzzles),true);
  }
  return profile;
}
function wirePage(page){
  page.on('pageerror',error=>errors.push(error.message));
  return {
    action:name=>page.locator(`[data-action="${name}"]:visible`).first(),
    state:()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY),
    fit:async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${label}: no horizontal overflow`),
    imagesReady:()=>page.waitForFunction(()=>[...document.querySelectorAll('img')].every(img=>img.complete&&img.naturalWidth>0))
  };
}
try{
  for(const [api,version,count,archive]of [[legacy,1,4,'caravanJourney'],[rescue,2,6,'rescueJourney']]){
    const original=oldProfile(api,version,count),context=await browser.newContext({viewport:{width:1280,height:900}});
    await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:SAVE_KEY,value:JSON.stringify({...emptyStore(),activeProfileId:original.id,profiles:[original]})});
    const page=await context.newPage(),ui=wirePage(page);await page.goto(base);
    await page.locator('.road-map').first().waitFor({state:'attached'});
    await ui.action('journal').click();await page.locator('.earlier-journey').waitFor();
    await page.locator('.earlier-journey summary').click();assert.equal(await page.locator('.earlier-journey .journal-entry').count(),count);
    await ui.action('map').click();await ui.action('change-band').click();await page.getByRole('button',{name:'Apply',exact:true}).click();
    const migrated=(await ui.state()).profiles[0];
    assert.equal(migrated.journey.version,3);assert.deepEqual(migrated.attempts,original.attempts);assert.deepEqual(migrated[archive],original.journey);
    assert.deepEqual(migrated.journey.completed,[]);parseBackup(JSON.stringify(await ui.state()),puzzles);
    await page.reload();await page.locator('.road-map').first().waitFor({state:'attached'});
    assert.deepEqual((await ui.state()).profiles[0],migrated);
    await ui.imagesReady();await ui.fit(`migration ${version}`);await page.screenshot({path:outputPath(`migration-v${version}.png`),fullPage:true,animations:'disabled'});
    checks.push(`version-${version} migration, archive, attempts, reload`);await context.close();
  }
  assert.equal(encounters.length,18);assert.equal(CHAPTERS.length,6);
  for(const band of bands){
    const viewport=band==='k1'?{width:390,height:844}:band==='23'?{width:1024,height:768}:{width:1440,height:1000};
    const context=await browser.newContext({viewport,hasTouch:band!=='45',acceptDownloads:true}),page=await context.newPage(),ui=wirePage(page);
    const profile=async()=>{const state=await ui.state();return state.profiles.find(p=>p.id===state.activeProfileId);};
    const capture=async name=>{await ui.imagesReady();await ui.fit(`${band}/${name}`);await page.screenshot({path:outputPath(`${band}-${name}.png`),fullPage:true,animations:'disabled'});};
    const liveId=()=>page.evaluate(()=>location.hash.split('/')[1]);
    const solveUI=async label=>{
      for(let steps=0;!await page.locator('#completion-heading').count()&&steps<300;steps++)await ui.action('apply-hint').click();
      assert.equal(await page.locator('#completion-heading').count(),1,`${label}: completed through controls`);
    };
    const revealHint=async()=>{for(let i=0;i<3;i++)await ui.action('hint').click();};
    const verifyMap=async count=>{
      await page.locator('.road-overview').waitFor();
      await page.locator('.road-map').first().waitFor({state:'attached'});
      assert.equal(await page.locator('.road-map:visible .road-stop.is-lit').count(),Math.floor(count/3),`${band}: exactly the finished stops are lit`);
      assert.equal(await page.locator('.crew-member').count(),COMPANIONS.length);
      assert.equal(await page.locator('.crew-away,[data-action=choose-route],[data-action=pump-info]').count(),0);
      await ui.fit(`${band}/map/${count}`);
    };
    await page.goto(base);await page.locator('#nickname').fill(`Road ${band}`);await page.locator(`[name=band][value="${band}"]`).check();await page.locator('#profile-form button[type=submit]').click();
    await verifyMap(0);await capture('opening');await waitForOffline(page);
    for(let count=0;count<encounters.length;count++){
      if(await ui.action(count===0?'start-journey':'continue-journey').count())await ui.action(count===0?'start-journey':'continue-journey').click();
      await page.locator('.board-panel').waitFor();
      const id=await liveId(),encounterId=await page.evaluate(()=>location.hash.split('/')[2]),before=await profile();
      assert.equal(encounterId,encounters[count].id);assert.equal(id,`road-${encounterId}-${band}`);
      assert.equal(getProgress(before).completedCount,count);
      assert.equal(await page.locator('.encounter-scene').count(),1);
      assert.equal(await page.locator('.equipment-needed,[data-action=find-workshop]').count(),0);
      await ui.fit(`${band}/${id}/unsolved`);await ui.imagesReady();
      if(count%3===0)await capture(`stop-${Math.floor(count/3)+1}-puzzle`);
      await revealHint();
      const saved=(await profile()).attempts[id];
      await page.reload();await page.locator('.hint-card').waitFor();assert.deepEqual((await profile()).attempts[id],saved,`${id}: exact hints, board and undo history after reload`);
      // An unsolved move and Undo must preserve the journey as well as the board.
      if(count%3===0){
        await ui.action('apply-hint').click();
        if(!await page.locator('#completion-heading').count()){
          assert.ok((await profile()).attempts[id].history.length>saved.history.length,`${id}: move has history`);
          await ui.action('undo').click();
          const undone=(await profile()).attempts[id];
          assert.deepEqual(undone.board,saved.board,`${id}: Undo board`);assert.deepEqual(undone.history,saved.history,`${id}: Undo history`);assert.equal(undone.moves,saved.moves);
          assert.equal((await profile()).journey.completed.length,count);
          await page.reload();await page.locator('.hint-card').waitFor();assert.deepEqual((await profile()).attempts[id],undone);
        }
      }
      await solveUI(id);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'completion-heading',`${id}: accessible completion focus`);
      assert.equal((await profile()).journey.completed.length,count+1);
      assert.equal(await page.locator('[data-action=finish-encounter]').count(),1,`${id}: one continuation action`);
      assert.equal(await page.evaluate(()=>document.querySelector('[data-action=finish-encounter]').getBoundingClientRect().top<document.querySelector('.board-panel').getBoundingClientRect().top),true,`${id}: Next appears above the solved board`);
      if(band==='k1')assert.equal(await page.evaluate(()=>document.querySelector('[data-action=finish-encounter]').getBoundingClientRect().bottom<=innerHeight),true,`${id}: Next is visible without scrolling after solve`);
      assert.equal(await page.locator('.board-panel').count(),1,`${id}: board remains beside the consequence`);
      assert.equal(await page.locator('.board-panel button:enabled,.board-panel input:enabled,.board-panel select:enabled').count(),0,`${id}: solved road controls stay locked until Replay`);
      assert.equal(await page.locator('.board-panel [role=button]:not([aria-disabled=true])').count(),0,`${id}: solved SVG controls stay locked`);
      assert.equal(await page.locator('.encounter-scene').getAttribute('data-solved'),'true');
      assert.equal(await page.locator('.error-banner').count(),0);parseBackup(JSON.stringify(await ui.state()),puzzles);await ui.fit(`${id}/solved`);
      if(count%3===2){
        const solvedAttempt=structuredClone((await profile()).attempts[id]);
        await page.reload();await page.locator('#completion-heading').waitFor();
        assert.deepEqual((await profile()).attempts[id],solvedAttempt,`${id}: reload keeps the solved board until Next`);
        assert.equal(await page.locator('.encounter-scene').getAttribute('data-solved'),'true');
        await capture(`stop-${Math.floor(count/3)+1}-lit`);
      }
      results.push({band,id,encounterId,mechanic:getEncounter(encounterId,before.journey).mechanic});
      await ui.action('finish-encounter').click();
      if(count%3===2){
        await verifyMap(count+1);await capture(`map-${Math.floor(count/3)+1}`);
        if(count===2){
          const campaignBefore=structuredClone(await profile()),sourceId=all.find(p=>p.id===id).sourceId;
          assert.ok(sourceId,'campaign board records its catalog source');
          await ui.action('library').click();await page.locator('.caravan-library').waitFor();
          assert.equal(await page.locator('[data-action=open-puzzle]:not(.library-proofs *)').count(),192);
          await page.goto(`${base}/#play/${sourceId}`);await page.locator('.board-panel').waitFor();
          await revealHint();await solveUI(`${band}/source free play`);
          const afterLibrary=await profile();assert.deepEqual(afterLibrary.journey,campaignBefore.journey,'a source puzzle cannot advance a partly completed journey');
          for(const [campaignId,attempt]of Object.entries(campaignBefore.attempts))assert.deepEqual(afterLibrary.attempts[campaignId],attempt,`${campaignId}: source free play has a separate save`);
          await ui.action('map').click();await verifyMap(count+1);
        }
        if(count===8&&band==='23'){
          await context.setOffline(true);await page.reload();await verifyMap(count+1);checks.push('second half of middle trail completed offline after reload');
        }
      }else{
        await page.waitForFunction(expected=>location.hash.split('/')[2]===expected,encounters[count+1].id);
        await page.locator('.board-panel').waitFor();
      }
      console.log(`Passed ${band}: ${count+1}/${encounters.length} ${encounterId}`);
    }
    assert.equal(getProgress(await profile()).complete,true);assert.equal(new Set(results.filter(r=>r.band===band).map(r=>r.mechanic)).size,12);
    // Every destination is still visible and lit after reopening the finished road.
    await page.reload();await verifyMap(18);await capture('complete');
    const completedJourney=structuredClone((await profile()).journey),completedAttempts=structuredClone((await profile()).attempts);
    await ui.action('journal').click();await page.locator('.journal-pages').waitFor();assert.equal(await page.locator('.journal-pages [data-action=open-encounter]').count(),18);
    await page.locator(`[data-action=open-encounter][data-id="${encounters[0].id}"]`).click();await page.locator('.board-panel').waitFor();
    assert.equal(await page.locator('#completion-heading').count(),1);assert.deepEqual((await profile()).attempts[await liveId()],completedAttempts[await liveId()],'revisit retains the solved road board');
    await ui.action('replay').click();assert.equal(await page.locator('#completion-heading').count(),0);assert.equal((await profile()).attempts[await liveId()].moves,0);assert.deepEqual((await profile()).journey,completedJourney);
    await revealHint();await solveUI('replay');assert.deepEqual((await profile()).journey,completedJourney);await ui.action('finish-encounter').click();await verifyMap(18);
    await ui.action('library').click();await page.locator('.caravan-library').waitFor();assert.equal(await page.locator('[data-action=open-puzzle]:not(.library-proofs *)').count(),192);
    await page.goto(`${base}/#play/swap-k1-01`);await page.locator('.board-panel').waitFor();await page.locator('[data-action=swap-pair]').first().click();await page.locator('#completion-heading').waitFor();
    assert.deepEqual((await profile()).journey,completedJourney,'library solve cannot alter the campaign');
    for(const [id,attempt]of Object.entries(completedAttempts).slice(1))assert.deepEqual((await profile()).attempts[id],attempt,`${id}: free play leaves campaign attempts alone`);
    await ui.action('map').click();await verifyMap(18);await context.setOffline(false);
    await ui.action('parents-gate').click();await page.getByRole('button',{name:'I’m a grown-up',exact:true}).click();
    const downloadPromise=page.waitForEvent('download');await ui.action('export').click();const download=await downloadPromise,backupPath=outputPath(`${band}-backup.json`);await download.saveAs(backupPath);
    const backup=parseBackup(await readFile(backupPath,'utf8'),puzzles);assert.equal(backup.profiles[0].journey.completed.length,18);
    await page.locator('#import-file').setInputFiles(backupPath);await page.getByRole('button',{name:'Done',exact:true}).click();
    const imported=await ui.state();assert.equal(imported.profiles.length,2);assert.notEqual(imported.profiles[0].id,imported.profiles[1].id);assert.deepEqual(imported.profiles[1].journey,imported.profiles[0].journey);assert.deepEqual(imported.profiles[1].attempts,imported.profiles[0].attempts);
    checks.push(`${band}: full road, every mechanic, hint/reload/undo, solved-board protection, replay, library independence, backup round trip`);await context.close();
  }
  assert.deepEqual(errors,[]);
  const report={passed:true,bands,encounters:results.length,checks,errors,results};
  await writeFile(outputPath(bands.length===3?'results.json':`results-${bands.join('-')}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:undefined},null,2));
}finally{await browser.close();}
