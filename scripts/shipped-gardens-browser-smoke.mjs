// Uses the shipped pack without interception, a fresh browser context, and a localhost server.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {lPreview} from '../dist/tile-controls.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {puzzles}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
try {
 const context=await browser.newContext({hasTouch:true,serviceWorkers:'block',viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.TEST_URL||'http://127.0.0.1:4187';
 const cell=n=>page.locator(`button[data-action=tile-cell][data-cell="${n}"]`),action=name=>page.locator(`[data-action="${name}"]`);
 const attempt=id=>page.evaluate(id=>JSON.parse(localStorage.getItem('small-math-adventure:saves:v1')).profiles[0].attempts[id],id);
 await page.goto(base);await page.locator('#nickname').fill('Garden tester');await page.locator('#profile-form button[type=submit]').click();
 await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
 for(const id of ['tile-k1-04','tile-23-08','tile-45-12']){
  const p=puzzles.find(p=>p.id===id);await page.goto(`${base}/#play/${id}`);await cell(p.cells[0]).waitFor();
  await action('demo').click();assert.match(await page.locator('dialog').innerText(),/L-tromino/);await page.getByRole('button',{name:'Done',exact:true}).click();
  // Place the witness via actual controls, including rotation and keyboard activation.
  let rotation=0,rotations=0;
  for(const piece of p.solution){
   let chosen;
   for(const anchor of piece)for(let r=0;r<4;r++){const preview=lPreview(p,[],anchor,r);if(preview.valid&&preview.cells.every(c=>piece.includes(c)))chosen={anchor,r};}
   assert.ok(chosen);while(rotation!==chosen.r){await action('rotate-tile').focus();await page.keyboard.press('Enter');rotation=(rotation+1)%4;rotations++;}
   await cell(chosen.anchor).tap();assert.equal(await page.locator('.tile-preview:not(.invalid)').count(),3);await action('place-tile').focus();await page.keyboard.press('Space');
  }
  assert.ok(rotations>0);await page.getByRole('heading',{name:'Solved',exact:true}).waitFor();assert.equal((await attempt(id)).board.length,p.cells.length/3);
  await page.screenshot({path:new URL(`../test-results/${id}.png`,import.meta.url).pathname,fullPage:true});
  await action('replay').click();for(let i=0;i<3;i++)await action('hint').click();assert.equal(await page.locator('.garden-cell.hinted').count(),3);await action('apply-hint').click();assert.equal((await attempt(id)).board[0].length,3);
  while((await attempt(id)).board.length<p.cells.length/3)await action('apply-hint').click();await page.getByRole('heading',{name:'Solved',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 }
 const p=puzzles.find(p=>p.id==='tile-k1-03');await page.goto(`${base}/#play/${p.id}`);await cell(p.cells[0]).waitFor();assert.equal(await action('rotate-tile').count(),0);
 for(const piece of p.solution)for(const c of piece)await cell(c).tap();await page.getByRole('heading',{name:'Solved',exact:true}).waitFor();assert.equal((await attempt(p.id)).board.length,2);assert.deepEqual(errors,[]);
 console.log('Passed shipped K–1, 2–3, 4–5 L gardens: rotation, touch/keyboard placement, hints, completion, Help, phone fit; unchanged domino completion.');
} finally {await browser.close();}
