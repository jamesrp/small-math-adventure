// Bead rings in a real browser: painting beads, kept rings and That’s all, the
// see-through copy turning and flipping, No ring can, fewest claims, window
// cards, keyboard play with focus kept on the bead, and the playground's sizes
// and colours on a phone. Uses the same environment variables as browser-smoke.mjs.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=(process.env.TEST_URL||'http://127.0.0.1:4187').replace(/\/$/,'');
const bead=i=>page.locator(`.br-bead[data-bead="${i}"]`),solved=()=>page.locator('#completion-heading').count();
const open=async id=>{await page.goto(`${base}/#play/${id}`);await page.locator(`[data-puzzle-id="${id}"] .br-ring`).waitFor();};
// Paint a ring from blank: A is one tap, B two, C three.
const paint=async word=>{for(const [i,c] of [...word].entries())for(let t=0;t<' ABC'.indexOf(c);t++)await bead(i).tap();};
const kept=()=>page.locator('.bd-found li').count();
const say=()=>page.locator('.bd-say').innerText();
const copy=()=>page.locator('.br-copy').getAttribute('data-copy').then(JSON.parse);
const fits=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${label}: no page overflow`);
const checks=[];
try{
 await page.goto(base);await page.locator('#nickname').fill('Beads QA');await page.locator('#profile-form button[type=submit]').click();
 await page.locator('.caravan-nav [data-action=library]').click();await page.locator('.caravan-library').waitFor();

 // Every ring: kept cards, a turned repeat lights its card, an early That’s all, then a solve.
 await open('beads-01');
 await paint('AAA');assert.equal(await kept(),1,'AAA is kept');
 await bead(2).tap();assert.equal(await kept(),2,'AAB is kept');
 await page.getByRole('button',{name:'That’s all'}).tap();
 assert.equal(await say(),'There is another.');
 await bead(1).tap();await bead(0).tap();assert.equal(await kept(),4,'ABB and BBB are kept');
 await bead(1).tap();
 assert.equal(await kept(),4,'BAB is ABB turned');
 assert.equal(await page.locator('.bd-found li.again').count(),1,'its card lights up');
 assert.deepEqual(JSON.parse(await page.locator('.bd-found li.again').getAttribute('data-match')),{kind:'turn',k:1});
 await page.getByRole('button',{name:'That’s all'}).tap();assert.equal(await solved(),1);checks.push('every ring');

 // The copy: Turn counts its steps and marks the beads its copy matches; a false No ring can.
 await open('beads-03');
 assert.equal(await page.getByRole('button',{name:'No ring can'}).isDisabled(),true,'no claim before a full ring');
 await paint('AAAA');
 await page.getByRole('button',{name:'No ring can'}).tap();
 assert.equal(await say(),'There is one.');
 await bead(1).tap();
 await page.getByRole('button',{name:'Turn the copy'}).tap();await page.getByRole('button',{name:'Turn the copy',exact:false}).tap();
 assert.deepEqual(await copy(),{flips:0,turns:2});
 assert.equal(await page.locator('.bd-turns').innerText(),'2');
 assert.equal(await page.locator('.br-bead.match').count(),2,'ABAA turned twice matches two beads');
 await page.locator('.br-ring.settled').waitFor();
 await bead(3).tap();assert.equal(await solved(),1,'ABAB solves');checks.push('turn the copy');

 // No ring can: three readouts is impossible on four beads.
 await open('beads-05');
 await paint('AABB');
 await page.getByRole('button',{name:'No ring can'}).tap();assert.equal(await solved(),1);checks.push('no ring can');

 // Window cards: green once, ochre more than once.
 await open('beads-12');
 assert.equal(await page.locator('.bd-window').count(),8);
 await paint('AAAAAAAA');
 assert.equal(await page.locator('.bd-window.more').count(),1,'AAA shows eight times');
 await bead(3).tap();await bead(5).tap();await bead(6).tap();await bead(7).tap();
 assert.equal(await page.locator('.bd-window.once').count(),8,'AAABABBB shows each card once');
 assert.equal(await kept(),1);await fits('beads-12');
 await page.screenshot({path:'test-results/beads-12-phone.png',fullPage:true});checks.push('windows');

 // Keyboard: Enter paints and focus stays on the bead.
 await open('beads-07');
 await bead(1).focus();await page.keyboard.press('Enter');
 assert.match(await bead(1).getAttribute('aria-label'),/green/);
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.bead),'1','focus stays on bead 2');
 await page.keyboard.press('Space');assert.match(await bead(1).getAttribute('aria-label'),/gold/);checks.push('keyboard');

 // Hidden turns: Flip turns the copy over, and a clockwise turn after a flip turns the other way on the ring.
 await open('beads-h06');
 await paint('AABAAA');
 await page.getByRole('button',{name:'Flip the copy'}).tap();
 assert.deepEqual(await copy(),{flips:1,turns:0});
 assert.match(await page.locator('.beads-puzzle > .sr-only').innerText(),/The copy is flipped/);
 await page.getByRole('button',{name:'Turn the copy'}).tap();
 assert.deepEqual(await copy(),{flips:1,turns:-1});
 await bead(5).tap();assert.equal(await solved(),1,'AABAAB has exactly two matching flips');checks.push('flip the copy');

 // Fewest: a true None with 2 colours, then a lopsided ring in three.
 await open('beads-h01');
 await paint('AABB');
 await page.getByRole('button',{name:'None with 2 colours'}).tap();
 assert.equal(await page.locator('.bd-record li.no').count(),1);
 await bead(3).tap();assert.equal(await solved(),1,'AABC with 2 ruled out solves');
 // A false claim says there is one.
 await open('beads-h04');
 await paint('AAAABBBB');
 await page.getByRole('button',{name:'None with 4 gold'}).tap();
 assert.equal(await say(),'There is one with 4 gold.');
 assert.equal(await solved(),0);checks.push('fewest');

 // Every lopsided ring, up to turns and flips.
 await open('beads-h05');
 await paint('AAAABABB');assert.equal(await kept(),1);
 await bead(3).tap();await bead(4).tap();
 assert.equal(await kept(),2,'AAABAABB is new');
 await fits('beads-h05');await page.screenshot({path:'test-results/beads-h05-phone.png',fullPage:true});checks.push('every lopsided');

 // Playground: sizes, colours, the copy, on a phone.
 await page.goto(`${base}/#play/beads-playground`);await page.locator('.br-ring').waitFor();
 for(const n of [3,8,12]){await page.getByRole('button',{name:`${n} beads`,exact:true}).tap();assert.equal(await page.locator('.br-bead').count(),n);await fits(`playground ${n}`);}
 await page.getByRole('button',{name:'3 colours'}).tap();
 await bead(0).tap();await bead(0).tap();await bead(0).tap();assert.match(await bead(0).getAttribute('aria-label'),/blue/);
 await page.getByRole('button',{name:'Flip the copy'}).tap();await page.getByRole('button',{name:'Turn the copy',exact:false}).tap();
 assert.deepEqual(await copy(),{flips:1,turns:-1});
 await page.getByRole('button',{name:'Clear'}).tap();assert.equal(await page.locator('.br-bead.br-c-empty').count(),12);
 await page.screenshot({path:'test-results/beads-playground-phone.png',fullPage:true});checks.push('playground');

 assert.deepEqual(errors,[]);
 await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
 await writeFile(new URL('../test-results/beads-browser.json',import.meta.url),JSON.stringify({passed:true,checks,errors},null,2));
 console.log(JSON.stringify({passed:true,checks,errors},null,2));
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();}
