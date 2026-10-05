// Hidden pictures in a real browser: tapping squares, the two-tap switch with
// its partners and budget, That’s all, the lonely-picture corners, keyboard
// play with focus kept on the square, and the playground's tools and sizes on
// a phone. Uses the same environment variables as browser-smoke.mjs.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=(process.env.TEST_URL||'http://127.0.0.1:4187').replace(/\/$/,'');
const cell=i=>page.locator(`.pic-cell[data-cell="${i}"]`),solved=()=>page.locator('#completion-heading').count();
const open=async id=>{await page.goto(`${base}/#play/${id}`);await page.locator(`[data-puzzle-id="${id}"] .pic-grid`).waitFor();};
const fits=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${label}: no page overflow`);
const checks=[];
try{
 await page.goto(base);await page.locator('#nickname').fill('Pictures QA');await page.locator('#profile-form button[type=submit]').click();
 await page.locator('.caravan-nav [data-action=library]').click();await page.locator('.caravan-library').waitFor();

 // Tapping squares: counts turn green, and the puzzle solves on the last one.
 await open('pictures-01');
 for(const i of [0,1])await cell(i).tap();
 assert.equal(await page.locator('.pic-count.exact').count(),3,'row A and two columns are matched');
 await cell(2).tap();assert.equal(await page.locator('.pic-count.over').count(),1,'row A has too many');
 await cell(2).tap();await cell(5).tap();assert.equal(await solved(),1,'A1 A2 B3 solves');checks.push('tap to match');

 // Keyboard: Enter places a counter and focus stays on that square.
 await open('pictures-04');
 await cell(1).focus();await page.keyboard.press('Enter');
 assert.ok(await cell(1).evaluate(el=>el.classList.contains('on')),'Enter placed a counter');
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.cell),'1','focus stays on B… square');
 await page.keyboard.press('Space');assert.ok(!await cell(1).evaluate(el=>el.classList.contains('on')),'Space took it away');checks.push('keyboard');

 // The two-tap switch: pick, partners glow, switch, budget drops, rings fill.
 await open('pictures-07');
 assert.equal(await page.locator('.pic-cell.goal').count(),4);
 await cell(0).tap();
 assert.equal(await page.locator('.pic-cell.picked').count(),1);
 assert.deepEqual(await page.locator('.pic-cell.partner').evaluateAll(els=>els.map(e=>e.dataset.cell)),['6','7']);
 await cell(0).tap();assert.equal(await page.locator('.pic-cell.picked').count(),0,'tapping again puts it back');
 await cell(0).tap();await cell(6).tap();
 assert.equal(await page.locator('.pic-budget i.left').count(),1,'one switch left');
 assert.equal(await page.locator('.pic-cell.goal.home').count(),2,'two counters home');
 await cell(1).tap();await cell(7).tap();assert.equal(await solved(),1,'two switches solve');checks.push('switch');

 // A wasted switch: the budget runs out and the dead end says so.
 await open('pictures-10');
 await cell(0).tap();await cell(4).tap();await cell(1).tap();await cell(3).tap();
 assert.equal(await page.locator('.pic-budget i.left').count(),0);
 assert.match(await page.locator('.feedback').innerText(),/Undo/);
 assert.equal(await page.locator('.pic-cell:not([aria-disabled])').count(),0,'no switches past the budget');checks.push('budget');

 // Every picture: kept cards, an early That’s all, then a solve.
 await open('pictures-03');
 await cell(0).tap();await cell(3).tap();
 assert.equal(await page.locator('.pic-found li').count(),1);
 await page.getByRole('button',{name:'That’s all'}).tap();
 assert.equal(await page.locator('.pic-early').innerText(),'There is another.');
 await page.getByRole('button',{name:'Clear'}).tap();
 assert.equal(await page.locator('.pic-early').count(),0);
 await cell(1).tap();await cell(2).tap();
 assert.equal(await page.locator('.pic-found li').count(),2);
 await page.getByRole('button',{name:'That’s all'}).tap();assert.equal(await solved(),1);checks.push('every');

 // Lonely: a placement with a switch shows its four corners.
 await open('pictures-08');
 for(const i of [0,4,2,6])await cell(i).tap();
 assert.equal(await page.locator('.pic-cell.twin').count(),4);
 assert.equal(await page.locator('.pic-cell:not(.on):not([aria-disabled])').count(),0,'no fifth counter');
 for(const i of [4,6,1,3])await cell(i).tap();assert.equal(await solved(),1);checks.push('lonely');

 // Playground: draw, switch, sizes, the count of pictures, on a phone.
 await page.goto(`${base}/#play/pictures-playground`);await page.locator('.pic-grid').waitFor();
 await cell(0).tap();await cell(5).tap();
 assert.match(await page.locator('.pic-twins').getAttribute('aria-label'),/^2 pictures/);
 await page.getByRole('button',{name:'Switch',exact:false}).tap();
 await cell(0).tap();await cell(5).tap();
 assert.deepEqual(await page.locator('.pic-cell.on').evaluateAll(els=>els.map(e=>e.dataset.cell)),['1','4']);
 assert.match(await page.locator('.pic-twins').getAttribute('aria-label'),/^2 pictures/,'a switch keeps the number');
 for(const n of [3,5,6]){await page.getByRole('button',{name:`${n} by ${n}`}).tap();assert.equal(await page.locator('.pic-cell').count(),n*n);await fits(`playground ${n}`);}
 await page.screenshot({path:'test-results/pictures-playground-phone.png',fullPage:true});
 for(const id of ['pictures-09','pictures-11']){await open(id);await fits(id);await page.screenshot({path:`test-results/${id}-phone.png`,fullPage:true});}
 checks.push('playground');
 assert.deepEqual(errors,[]);
 await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
 await writeFile(new URL('../test-results/pictures-browser.json',import.meta.url),JSON.stringify({passed:true,checks,errors},null,2));
 console.log(JSON.stringify({passed:true,checks,errors},null,2));
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();}
