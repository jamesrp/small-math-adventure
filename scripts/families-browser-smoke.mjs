// Opens every puzzle from every module on the family seam (dist/families.js)
// in a real browser: its stylesheet and offline copy, the satchel, the board
// on a phone and a desktop, How to play, and a solve through live hints where
// the hints can play the moves. A family's own suite covers its interactions.
// Uses the same environment variables as browser-smoke.mjs.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {waitForOffline} from './browser-offline.mjs';
import {FAMILIES,newFamilies} from './packs.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=(process.env.TEST_URL||'http://127.0.0.1:4187').replace(/\/$/,''),only=process.env.TEST_FAMILY;
const modules=FAMILIES.filter(m=>m.pack&&(!only||m.id===only));
const fits=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${label}: no page overflow`);
const dist=new URL('../dist/',import.meta.url).href,relative=url=>'./'+url.slice(dist.length);
const report={modules:[],errors};
try{
 await page.goto(base);await page.locator('#nickname').fill('Family QA');await page.locator('#profile-form button[type=submit]').click();
 await page.locator('.caravan-nav [data-action=library]').click();await page.locator('.caravan-library').waitFor();
 await waitForOffline(page);
 const links=await page.evaluate(()=>[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>new URL(l.href).pathname.split('/').pop()));
 for(const m of FAMILIES.filter(m=>m.css)){const name=m.css.split('/').pop();assert.equal(links.filter(l=>l===name).length,1,`${m.id}: stylesheet loads once`);assert.ok(links.indexOf(name)<links.indexOf('caravan.css'),`${m.id}: stylesheet comes before caravan.css`);}
 const newest=newFamilies()[0];
 if(newest)assert.equal(await page.locator(`.satchel-family[data-view-key="family-${newest.id}"]`).getAttribute('open'),'','the newest family starts open');
 for(const f of newFamilies())assert.equal(await page.locator(`.satchel-family[data-view-key="family-${f.id}"] .family-ink-symbol`).innerText(),f.symbol,`${f.id}: in the satchel with its symbol`);
 for(const m of modules){
  const {puzzles}=JSON.parse(await readFile(new URL(m.pack),'utf8')),result={id:m.id,puzzles:puzzles.length,solvedByHints:0,notHintSolvable:[]};
  const cached=await page.evaluate(async urls=>{const out=[];for(const url of urls)out.push(Boolean(await caches.match(url)));return out;},[m.pack,m.css].filter(Boolean).map(relative));
  assert.ok(cached.every(Boolean),`${m.id}: pack and stylesheet are in the offline copy`);
  for(const p of puzzles){
   await page.setViewportSize({width:390,height:844});
   await page.goto(`${base}/#play/${p.id}`);await page.locator(`[data-puzzle-id="${p.id}"] .board-panel`).waitFor();await fits(`${p.id}, phone`);
   await page.getByRole('button',{name:'How to play',exact:true}).click();const help=page.locator('dialog');await help.waitFor();
   assert.ok((await help.innerText()).trim().length>20,`${p.id}: How to play explains it`);await help.getByRole('button',{name:'Done',exact:true}).click();await help.waitFor({state:'detached'});
   await page.setViewportSize({width:1024,height:768});await fits(`${p.id}, desktop`);
   const hint=page.getByRole('button',{name:'Hint',exact:true});
   if(!await hint.count()){result.notHintSolvable.push(p.id);continue;}
   for(let i=0;i<3;i++)await hint.click();
   const apply=page.getByRole('button',{name:'Apply hint',exact:true});
   let steps=0;while(!await page.locator('#completion-heading').count()&&await apply.count()&&steps++<300)await apply.click();
   if(await page.locator('#completion-heading').count())result.solvedByHints++;else result.notHintSolvable.push(p.id);
  }
  report.modules.push(result);console.log(JSON.stringify(result));
 }
 assert.deepEqual(errors,[]);
 await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
 await writeFile(new URL('../test-results/families-browser.json',import.meta.url),JSON.stringify({passed:true,...report},null,2));
 console.log(JSON.stringify({passed:true,modules:report.modules.map(m=>m.id),errors},null,2));
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();}
