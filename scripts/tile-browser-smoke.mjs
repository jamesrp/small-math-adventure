// Isolated synthetic fixture; never modifies the shipped puzzle pack.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const pack=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const fixture={...pack.puzzles.find(p=>p.mechanic==='tile'),id:'tile-ui-fixture',tileShape:'l-tromino',rows:6,cols:6,cells:[0,1,6,5,11,4,35,34,29,30,24,31],solution:[[0,1,6],[5,11,4],[35,34,29],[30,24,31]],hints:['Start at a corner.']};
pack.puzzles.push(fixture);
const context=await browser.newContext({hasTouch:true,serviceWorkers:'block',viewport:{width:390,height:844}});
await context.route('**/puzzles.json',route=>route.fulfill({json:pack}));
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.TEST_URL||'http://127.0.0.1:4187';
const cell=n=>page.locator(`button[data-action=tile-cell][data-cell="${n}"]`);
const action=name=>page.locator(`[data-action="${name}"]`);
const board=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('small-math-adventure:saves:v1')).profiles[0].attempts['tile-ui-fixture'].board);
try{
 await page.goto(base);await page.locator('#nickname').fill('Tile tester');await page.locator('#profile-form button[type=submit]').click();
 await page.goto(`${base}/#play/${fixture.id}`);await cell(0).waitFor();
 const top=await cell(0).boundingBox(),bottom=await cell(30).boundingBox();
 assert.ok(bottom.y-top.y >= 5*top.height, 'Missing rows retain their board coordinates');
 await action('demo').click();assert.match(await page.locator('dialog').innerText(),/L-tromino/);assert.match(await page.locator('dialog').innerText(),/Rotate/);await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.evaluate(()=>{window.spoken='';window.SpeechSynthesisUtterance=class{constructor(text){window.spoken=text;}};window.speechSynthesis.speak=()=>{};});await action('speak').click();assert.match(await page.evaluate(()=>window.spoken),/L-trominoes/);assert.doesNotMatch(await page.evaluate(()=>window.spoken),/dominoes\.|two neighboring/);
 await cell(1).tap();assert.equal(await action('place-tile').isDisabled(),true);assert.ok(await page.locator('.tile-preview.invalid').count()>0);
 await cell(0).tap();assert.equal(await page.locator('.tile-preview').count(),3);await action('place-tile').tap();assert.deepEqual((await board())[0],[0,1,6]);
 assert.equal(await page.locator('.garden-l-cell').count(),3);
 await cell(6).tap();assert.deepEqual(await board(),[]);await action('undo').click();assert.equal((await board()).length,1);
 await action('restart').click();assert.deepEqual(await board(),[]);
 for(const [r,anchor] of [0,5,35,30].entries()){
   if(r){await action('rotate-tile').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'rotate-tile');}
   await cell(anchor).focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.tile-preview:not(.invalid)').count(),3);
   await action('place-tile').focus();await page.keyboard.press('Space');
 }
 await page.getByRole('heading',{name:'Solved',exact:true}).waitFor();assert.equal((await board()).length,4);assert.equal(await page.locator('.garden-l-cell').count(),12);
 await action('replay').click();
 // Rotation survives a replay; turn once from orientation 4 to orientation 1.
 for(const anchor of [0,5,35,30]){await action('rotate-tile').tap();await cell(anchor).tap();await action('place-tile').tap();}
 await page.getByRole('heading',{name:'Solved',exact:true}).waitFor();await action('replay').click();await action('hint').click();await action('hint').click();assert.equal(await page.locator('.garden-cell.hinted').count(),3);
 assert.equal((await page.locator('.hint-card').innerText()).match(/row /g).length,3);
 await action('hint').click();await action('apply-hint').click();assert.equal((await board())[0].length,3);
 await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});await page.screenshot({path:new URL('../test-results/l-tile-phone.png',import.meta.url).pathname,fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 const domino=pack.puzzles.find(p=>p.mechanic==='tile'&&!p.tileShape);await page.goto(`${base}/#play/${domino.id}`);await cell(domino.solution[0][0]).waitFor();assert.equal(await action('rotate-tile').count(),0);
 for(const c of domino.solution[0])await cell(c).tap();assert.equal(await page.locator('.garden-cell.planted').count(),2);assert.equal(await page.locator('.garden-domino').count(),1);
 await page.screenshot({path:new URL('../test-results/domino-phone.png',import.meta.url).pathname,fullPage:true});assert.deepEqual(errors,[]);
 console.log('Passed: L touch placement, four keyboard rotations, invalid previews, removal, undo, restart, completion, three-cell hints, Help/read-aloud, phone fit, legacy domino.');
}finally{await browser.close();}
