// Optional browser regression suite; uses the same environment variables as browser-smoke.mjs.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {loadPack,newFamilies} from './packs.mjs';
const playwright=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await playwright[process.env.TEST_BROWSER||'chromium'].launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:process.env.TEST_PHONE?{width:390,height:844}:{width:1024,height:768},serviceWorkers:'block'});
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=process.env.TEST_URL||'http://127.0.0.1:4187';
// The newest family on the seam (dist/families.js) starts open.
const newest=(await loadPack()).puzzles.find(p=>(p.libraryFamily||p.mechanic)===newFamilies()[0].id).familyTitle;
const family=name=>page.locator('.satchel-family').filter({has:page.locator('summary strong').filter({hasText:new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`)})});
const openFamilies=()=>page.locator('.satchel-family[open] summary strong').allTextContents();
const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const back=async selector=>{await page.goBack();await page.locator(selector).waitFor();await settle();};
const forward=async selector=>{await page.goForward();await page.locator(selector).waitFor();await settle();};
const checks=[];
// On a phone the explorer's row (name, level, Grown-ups) sits behind the button with their initial.
const explorerRow=async()=>{const toggle=page.locator('.explorer-toggle[aria-expanded=false]:visible');if(await toggle.count())await toggle.click();};
try{
  await page.goto(base);
  await page.locator('#nickname').fill('Navigation');
  await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.caravan-nav [data-action=library]').click();
  await family(newest).locator('summary').click();
  await family('Clockwork Gates').locator('summary').click();
  await family('Cup swaps').locator('summary').click();
  const expected=await openFamilies();
  const clock=family('Clockwork Gates').locator('[data-id="clock-10"]');
  await clock.scrollIntoViewIfNeeded();
  await settle();
  const scroll=await page.evaluate(()=>scrollY);
  assert.ok(scroll>0,'test starts from a scrolled library');
  await clock.click();
  await page.locator('[data-puzzle-id="clock-10"]').waitFor();
  await back('.caravan-library');
  assert.deepEqual(await openFamilies(),expected,`Back restores every family, including closed ${newest}`);
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-scroll)<3,'Back restores the library scroll position');
  await forward('[data-puzzle-id="clock-10"]');
  await back('.caravan-library');
  assert.deepEqual(await openFamilies(),expected,'repeated Back/Forward preserves library state');
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-scroll)<3,'repeated Back/Forward restores scroll');
  checks.push('Clockwork Gates 10: groups and scroll through repeated Back/Forward');

  await page.reload();await page.locator('.caravan-library').waitFor();await settle();
  assert.deepEqual(await openFamilies(),expected,'reload preserves the history entry');
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-scroll)<3,'reload restores scroll');
  checks.push('reload restores groups and scroll');

  await page.locator('.caravan-nav [data-action=library]').click();
  assert.deepEqual(await openFamilies(),expected,'same-route navigation does not reset disclosures');
  await clock.click();await page.locator('[data-puzzle-id="clock-10"]').waitFor();
  await page.locator('.caravan-nav [data-action=library]').click();
  await page.locator('.caravan-library').waitFor();
  for(const details of await page.locator('.satchel-family[open]').all())await details.locator('summary').click();
  await page.locator('.caravan-nav [data-action=map]').click();
  await back('.caravan-library');
  assert.deepEqual(await openFamilies(),[],'an all-closed visit stays all closed');
  await page.reload();await page.locator('.caravan-library').waitFor();
  assert.deepEqual(await openFamilies(),[],'all-closed state also survives reload');
  await back('[data-puzzle-id="clock-10"]');
  await back('.caravan-library');
  assert.deepEqual(await openFamilies(),expected,'separate visits to the same URL have independent snapshots');
  await forward('[data-puzzle-id="clock-10"]');
  await forward('.caravan-library');
  assert.deepEqual(await openFamilies(),[],'Forward restores the later all-closed visit');
  checks.push('same-route render, all-closed state, independent history entries');

  await explorerRow();
  await page.getByRole('button',{name:'Grown-ups',exact:true}).click();
  await page.getByRole('button',{name:'I’m a grown-up',exact:true}).click();
  await page.locator('#catalog-band').selectOption('all');
  const note=page.locator('.puzzle-notes').first();
  await note.locator(':scope > summary').click();
  await note.locator('details > summary').click();
  const title=await note.locator(':scope > summary').textContent();
  await page.locator('#sound-toggle').check();
  assert.equal(await page.locator('#catalog-band').inputValue(),'all','save-triggered render preserves the catalog filter');
  assert.equal(await note.locator(':scope > summary').textContent(),title);
  assert.ok(await note.evaluate(node=>node.open),'save-triggered render preserves the note');
  assert.ok(await note.locator('details').evaluate(node=>node.open),'nested disclosure stays open');
  await page.locator('#sound-toggle').uncheck();
  await note.locator('[data-action=open-puzzle]').click();
  await page.locator('.board-panel').waitFor();
  await back('.parent-layout');
  assert.equal(await page.locator('#catalog-band').inputValue(),'all','Back restores the catalog filter');
  assert.ok(await note.evaluate(node=>node.open));
  assert.ok(await note.locator('details').evaluate(node=>node.open));
  await page.locator('#catalog-band').focus();
  await page.locator('#catalog-band').selectOption('45');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'catalog-band','filter changes keep keyboard focus');
  assert.equal(await page.locator('.puzzle-notes[open]').count(),0,'catalog state uses puzzle IDs, not list positions');
  await page.locator('#catalog-band').selectOption('all');
  assert.ok(await note.evaluate(node=>node.open),'switching filters retains notes for the original puzzles');
  checks.push('Grown-ups filter, nested notes, save rerenders and stable puzzle identities');

  await page.evaluate(async()=>{
    const {startJourney}=await import('./caravan-legacy.js');
    const {SAVE_KEY}=await import('./storage.js');
    const store=JSON.parse(localStorage.getItem(SAVE_KEY)),profile=store.profiles[0];
    startJourney(profile);profile.caravanJourney=profile.journey;delete profile.journey;
    localStorage.setItem(SAVE_KEY,JSON.stringify(store));
    location.hash='journal';
  });
  await page.reload();await page.locator('.earlier-journey').waitFor();
  await page.locator('.earlier-journey > summary').click();
  await page.locator('.caravan-nav [data-action=library]').click();
  await page.locator('.caravan-library').waitFor();
  await back('.journal-layout');
  assert.ok(await page.locator('.earlier-journey').evaluate(node=>node.open),'Journal archives survive navigation');
  checks.push('Journal archive disclosures');

  await page.locator('.caravan-nav [data-action=library]').click();
  await family(newest).locator('summary').click();
  await family('Clockwork Gates').locator('summary').click();
  await explorerRow();
  await page.locator('[data-action=profiles]').click();
  await page.locator('.caravan-add-profile > summary').click();
  await page.locator('.caravan-nav [data-action=library]').click();
  await page.locator('.caravan-library').waitFor();
  await back('.caravan-add-profile');
  assert.ok(await page.locator('.caravan-add-profile').evaluate(node=>node.open),'New explorer disclosure survives navigation');
  await page.locator('#nickname').fill('Second explorer');
  await page.locator('#profile-form button[type=submit]').click();
  await page.locator('.lr-overview').waitFor();
  await page.locator('.caravan-nav [data-action=library]').click();
  await page.locator('.caravan-library').waitFor();
  assert.deepEqual(await openFamilies(),[newest],'another explorer starts with fresh presentation state');
  await page.evaluate(()=>history.go(-3));
  await page.waitForURL('**/#library');await settle();
  assert.equal(await page.locator('.profile-label').textContent(),'Second explorer');
  assert.deepEqual(await openFamilies(),[newest],'old history cannot transfer presentation state across explorers');
  checks.push('New explorer disclosure and explorer isolation');

  // How to play belongs to the puzzle it opened on: Back, Forward and a hash
  // edit close it, and focus goes to the new page rather than into a stale dialog.
  const howTo=async()=>{await page.getByRole('button',{name:'How to play',exact:true}).click();await page.locator('dialog.modal[open]').waitFor();};
  const noDialog=async label=>{await settle();assert.equal(await page.locator('dialog.modal').count(),0,`${label}: How to play is closed`);assert.equal(await page.evaluate(()=>Boolean(document.activeElement?.closest('dialog'))),false,`${label}: focus is not in a dialog`);};
  await page.evaluate(()=>{location.hash='play/clock-10';});
  await page.locator('[data-puzzle-id="clock-10"]').waitFor();
  await howTo();
  assert.match(await page.locator('dialog.modal').innerText(),/Clockwork|gear|clock/i,'How to play shows the puzzle’s rules');
  await back('.caravan-library');
  await noDialog('Back');
  await forward('[data-puzzle-id="clock-10"]');
  await noDialog('Forward');
  await howTo();
  await page.evaluate(()=>{location.hash='play/swap-k1-01';});
  await page.locator('[data-puzzle-id="swap-k1-01"]').waitFor();
  await noDialog('a hash edit');
  await howTo();
  await back('[data-puzzle-id="clock-10"]');
  await noDialog('Back between puzzles');
  checks.push('How to play closes on Back, Forward and a hash edit');

  // The top bar on every screen that has it. On a phone it is one row: the
  // lantern, the three tabs and the explorer's initial, whose button opens the
  // explorer's row below the bar until the page changes. Tablets keep the full bar.
  for(const [width,height] of [[390,844],[375,667],[820,1180]]){
    const phone=width<=700,tag=`${width}×${height}`,barContext=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block'}),bar=await barContext.newPage();
    bar.on('pageerror',error=>errors.push(error.message));
    const header=bar.locator('.caravan-topbar'),toggle=header.getByRole('button',{name:'Explorer Zoë, puzzle level and Grown-ups',exact:true});
    const grownUps=header.getByRole('button',{name:'Grown-ups',exact:true}),level=header.getByRole('button',{name:'Puzzle level: grades K–1',exact:true}),chooser=header.getByRole('button',{name:'Choose explorer: Zoë',exact:true});
    const shape=()=>bar.evaluate(()=>{const head=document.querySelector('.caravan-topbar'),shown=[...head.querySelectorAll('button')].filter(b=>b.checkVisibility()),box=b=>b.getBoundingClientRect();return {height:head.getBoundingClientRect().height,middles:shown.map(b=>box(b).top+box(b).height/2),small:shown.filter(b=>box(b).width<40||box(b).height<40).map(b=>b.getAttribute('aria-label')||b.textContent.trim()),overflow:document.documentElement.scrollWidth>innerWidth+1};});
    try{
      await bar.goto(base);await bar.locator('#nickname').waitFor();
      let m=await shape();
      assert.ok(m.height<=(phone?64:100),`${tag} new explorer: the bar is ${m.height} px`);
      assert.ok(await grownUps.isVisible(),`${tag} new explorer: Grown-ups shows without an explorer`);
      await bar.locator('#nickname').fill('Zoë');await bar.locator('#profile-form button[type=submit]').click();await bar.locator('.lr-overview').waitFor();
      for(const [hash,ready] of [['map','.lr-overview'],['library','.caravan-library'],['journal','.lr-journal-view'],['play/nim-02','.board-panel'],['parents','.parent-layout'],['profiles','.caravan-saved-profiles']]){
        await bar.evaluate(next=>{location.hash=next;},hash);await bar.locator(ready).waitFor();await bar.evaluate(()=>document.fonts.ready);
        m=await shape();
        assert.equal(m.overflow,false,`${tag} ${hash}: no page overflow`);
        assert.deepEqual(m.small,[],`${tag} ${hash}: every bar button is at least 40 px`);
        for(const name of ['Road','Puzzles','Journal'])assert.ok(await header.getByRole('button',{name,exact:true}).isVisible(),`${tag} ${hash}: the ${name} tab shows`);
        if(phone){
          assert.ok(m.height<=64,`${tag} ${hash}: the bar is ${m.height} px, one row`);
          assert.ok(Math.max(...m.middles)-Math.min(...m.middles)<=4,`${tag} ${hash}: the bar's buttons share one row`);
          assert.ok(await toggle.isVisible(),`${tag} ${hash}: the explorer button shows`);
          assert.equal(await toggle.getAttribute('aria-expanded'),'false');
          assert.equal((await toggle.innerText()).trim().charAt(0),'Z',`${tag} ${hash}: the explorer button shows their initial`);
          for(const hidden of [grownUps,level,chooser])assert.equal(await hidden.isVisible(),false,`${tag} ${hash}: the explorer's row starts closed`);
        }else{
          assert.equal(m.height,96,`${tag} ${hash}: the tablet bar keeps its height`);
          assert.equal(await toggle.count(),0,`${tag} ${hash}: no explorer button on a tablet`);
          for(const shown of [grownUps,level,chooser])assert.ok(await shown.isVisible(),`${tag} ${hash}: the explorer's row shows`);
        }
      }
      if(phone){
        await bar.evaluate(()=>{location.hash='play/nim-02';});await bar.locator('.board-panel').waitFor();
        const boardTop=await bar.locator('.board-panel').evaluate(node=>node.getBoundingClientRect().top);
        await toggle.click();
        assert.equal(await toggle.getAttribute('aria-expanded'),'true');
        for(const shown of [chooser,level,grownUps])assert.ok(await shown.isVisible(),`${tag}: the explorer button opens name, level and Grown-ups`);
        m=await shape();assert.deepEqual(m.small,[],`${tag}: the explorer's row buttons are at least 40 px`);
        await level.focus();await bar.keyboard.press('Escape');
        assert.equal(await toggle.getAttribute('aria-expanded'),'false','Escape closes the explorer row');
        assert.equal(await bar.evaluate(()=>document.activeElement?.classList.contains('explorer-toggle')),true,'Escape leaves focus on the explorer button');
        await bar.keyboard.press('Enter');assert.equal(await toggle.getAttribute('aria-expanded'),'true','Enter opens the explorer row');
        await bar.keyboard.press('Tab');assert.equal(await bar.evaluate(()=>document.activeElement?.dataset.action),'profiles','Tab goes from the explorer button into its row');
        await bar.keyboard.press('Tab');await bar.keyboard.press('Enter');await bar.getByRole('button',{name:'Apply',exact:true}).click();
        assert.equal(await toggle.getAttribute('aria-expanded'),'true','the explorer row stays open after the level dialog');
        await grownUps.click();await bar.getByRole('button',{name:'Back to play',exact:true}).click();
        assert.equal(await toggle.getAttribute('aria-expanded'),'true','the explorer row stays open after the Grown-ups dialog');
        await header.getByRole('button',{name:'Road',exact:true}).click();await bar.locator('.lr-overview').waitFor();
        assert.equal(await toggle.getAttribute('aria-expanded'),'false','a new page closes the explorer row');
        await bar.goBack();await bar.locator('.board-panel').waitFor();
        assert.ok(Math.abs(await bar.locator('.board-panel').evaluate(node=>node.getBoundingClientRect().top)-boardTop)<2,'Back opens the puzzle with the row closed');
        await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
        await bar.screenshot({path:new URL(`../test-results/topbar-${width}x${height}.png`,import.meta.url).pathname});
      }
      checks.push(`top bar at ${tag}${phone?': one row, explorer row behind the initial, keyboard and Escape':': full bar unchanged'}`);
    }finally{await barContext.close();}
  }

  assert.deepEqual(errors,[]);
  await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
  const report={passed:true,browser:process.env.TEST_BROWSER||'chromium',viewport:page.viewportSize(),checks,errors};
  await writeFile(new URL(`../test-results/navigation-${report.browser}${process.env.TEST_PHONE?'-phone':''}.json`,import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
