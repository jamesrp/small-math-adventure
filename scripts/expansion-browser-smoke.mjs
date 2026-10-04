// Runs entirely against a temporary browser profile and the local app.
import assert from 'node:assert/strict';
import {waitForOffline} from './browser-offline.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.TEST_URL||'http://127.0.0.1:4187',key='small-math-adventure:saves:v1';
const {puzzles}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const expanded=puzzles.filter(p=>p.band==='all');
const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const goto=async id=>{await page.goto(`${base}/#play/${id}`);await page.locator('.expansion-board').waitFor();};
const fit=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${label}: no page overflow`);
// Nim pebbles: lift the pebble that leaves `remove` above it, then Take.
const takeNim=async(id,pile,remove)=>{const size=(await state()).profiles[0].attempts[id].board.piles[pile-1];await page.locator(`.duel-pebble[data-ui='${JSON.stringify({pick:{pile,from:size-remove}})}']`).click();await clickMove({type:'choose',pile,remove});};
const clickMove=async action=>{const button=page.locator('[data-action="expansion-move"]').filter({visible:true});const moves=await button.evaluateAll(nodes=>nodes.map(n=>n.dataset.move));const index=moves.indexOf(JSON.stringify(action));assert.ok(index>=0,`UI control ${JSON.stringify(action)}`);await button.nth(index).click();};
try{
 await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
 await page.goto(base);await page.locator('#nickname').fill('Expansion QA');await page.locator('#profile-form button[type=submit]').click();await page.locator('[data-action=library]').first().click();await page.locator('.caravan-library').waitFor();assert.equal(await page.locator('.satchel-family').count(),12);const familyIds=[...new Set(expanded.map(p=>p.mechanic))];assert.equal(familyIds.length,10);for(const id of familyIds){const family=page.locator('.satchel-family').filter({has:page.locator(`[data-id="${id}-01"]`)});assert.equal(await family.count(),1);assert.equal(await family.locator('.library-band:not(.library-proofs) [data-action=open-puzzle]').count(),expanded.filter(p=>p.mechanic===id).length);}await fit('satchel');
 await waitForOffline(page);
 await page.locator('button[data-id=toggle-01]').click();await page.locator('.expansion-board').waitFor();
 // Exercise direct controls for all ten types before using the shared hint flow.
 await goto('toggle-01');assert.equal(await page.locator('.motion-controls').count(),0);await page.locator('.wire-hit').first().focus();await page.keyboard.press('Enter');await page.locator('#completion-heading').waitFor();
 await page.getByRole('button',{name:'Replay',exact:true}).click();await clickMove({edge:0});await page.locator('#completion-heading').waitFor();
 await page.getByRole('button',{name:'Replay',exact:true}).click();await page.locator('.wire-hit').first().focus();await page.keyboard.press('Space');await page.locator('#completion-heading').waitFor();
 await goto('clock-01');await page.locator('[name=activations]').fill('3');await page.locator('form[data-puzzle-form] button[type=submit]').click();await page.locator('#completion-heading').waitFor();
 await goto('billiard-01');assert.equal(await page.locator('.billiard-path').count(),0);await page.locator('[name=corner]').selectOption('top-left');await page.locator('[name=bounces]').fill('1');await page.locator('form[data-puzzle-form] button[type=submit]').click();await page.locator('#completion-heading').waitFor();
 await goto('route-01');for(const vertex of ['E','A','B','C','D','A'])await clickMove({vertex});await page.locator('#completion-heading').waitFor();
 await goto('latin-01');for(const [cell,value]of [[1,2],[2,2],[3,1]]){await page.locator(`.latin-cell[data-cell="${cell}"]`).click();await page.getByRole('button',{name:`Mark ${value}`,exact:true}).click();}await page.locator('#completion-heading').waitFor();
 await goto('latin-06');assert.equal(await page.locator('.latin-puzzle select').count(),0);
 await page.locator('.latin-cell[data-cell="0"]').click();await page.keyboard.press('5');assert.equal((await state()).profiles[0].attempts['latin-06'].board.cells[0],5);
 await page.keyboard.press('Backspace');assert.equal((await state()).profiles[0].attempts['latin-06'].board.cells[0],0);
 await page.getByRole('button',{name:'Mark 1',exact:true}).click();await page.getByRole('button',{name:'Clear square',exact:true}).click();assert.equal((await state()).profiles[0].attempts['latin-06'].board.cells[0],0);
 await goto('code-01');await clickMove({type:'toggle',position:0});await clickMove({type:'toggle',position:1});await clickMove({type:'toggle',position:1});await clickMove({type:'submit'});await page.locator('#completion-heading').waitFor();
 await goto('nim-01');await takeNim('nim-01',2,1);assert.equal(await page.locator('#completion-heading').count(),0);const remaining=(await state()).profiles[0].attempts['nim-01'].board.piles;await takeNim('nim-01',remaining.findIndex(Boolean)+1,1);await page.locator('#completion-heading').waitFor();
 await goto('nim-02');await takeNim('nim-02',2,4);assert.deepEqual((await state()).profiles[0].attempts['nim-02'].board.piles,[1,1]);
 await takeNim('nim-02',1,1);assert.equal(await page.locator('#completion-heading').count(),0);assert.match(await page.locator('.nim-status').innerText(),/Opponent took the last pebble/);
 await page.getByRole('button',{name:'↶ Undo',exact:true}).click();assert.deepEqual((await state()).profiles[0].attempts['nim-02'].board.piles,[1,1]);
 await page.reload();await page.locator('.nim-piles').waitFor();assert.deepEqual((await state()).profiles[0].attempts['nim-02'].board.piles,[1,1]);
 await page.getByRole('button',{name:'↶ Undo',exact:true}).click();assert.deepEqual((await state()).profiles[0].attempts['nim-02'].board.piles,[2,5]);
 await goto('color-01');for(const [i,vertex]of ['A','B','C','D','E'].entries()){const color=i%2+1;if(i)await clickMove({type:'palette',color});await clickMove({vertex});}await page.locator('#completion-heading').waitFor();
 await goto('jug-01');await clickMove({type:'fill',jug:0});await clickMove({type:'pour',from:0,to:1});await page.locator('#completion-heading').waitFor();
 await goto('weigh-01');await clickMove({type:'place',coin:'A',pan:'left'});await clickMove({type:'place',coin:'B',pan:'right'});await clickMove({type:'weigh'});const balanceResult=(await state()).profiles[0].attempts['weigh-01'].board.observations[0].result;await page.locator(`input[name=coin][value="${balanceResult==='L'?'A':balanceResult==='R'?'B':'C'}"]`).check({force:true});await page.locator('form[data-puzzle-form] button[type=submit]').click();await page.locator('#completion-heading').waitFor();
 console.log('Direct controls passed for all ten families.');
 await goto('clock-01');assert.equal(await page.locator('#completion-heading').count(),0);await page.locator('.solved-indicator').waitFor();
 await page.setViewportSize({width:390,height:480});await page.locator('[name=activations]').fill('3');
 const scroll=await page.evaluate(async()=>{window.scrollTo(0,100);const before=scrollY;document.querySelector('form[data-puzzle-form]').requestSubmit();await new Promise(requestAnimationFrame);return {before,after:scrollY,focused:document.activeElement.id};});
 assert.equal(scroll.after,scroll.before,'animated completion keeps the viewport in place');assert.equal(scroll.focused,'completion-heading');
 await page.setViewportSize({width:390,height:844});
 // Every instance must render, be operable, save/reload, and finish with live hints.
 for(const p of expanded){
  await goto(p.id);await fit(p.id);
  if(p.mechanic==='route'&&p.number>=7){
   const obscured=await page.locator('.network-graph').evaluate(graph=>{
    const nodes=[...graph.querySelectorAll('button')].map(node=>node.getBoundingClientRect());
    return [...graph.querySelectorAll('svg text')].filter(label=>{
     const r=label.getBoundingClientRect();
     return nodes.some(n=>r.left<n.right&&r.right>n.left&&r.top<n.bottom&&r.bottom>n.top);
    }).map(label=>label.textContent);
   });
   assert.deepEqual(obscured,[],`${p.id}: every road length remains readable beside the junction controls`);
  }
  if(await page.locator('#completion-heading').count())await page.getByRole('button',{name:'Replay',exact:true}).click();
  if(p.mechanic==='toggle'){assert.equal(await page.locator('.wire-hit[role=button]').count(),p.parameters.edges.length);assert.equal(await page.locator('.wire-hit').first().evaluate(n=>getComputedStyle(n).strokeWidth),'44px');}else{const minTarget=await page.locator('.expansion-board button:visible').evaluateAll(nodes=>Math.min(...nodes.map(n=>Math.min(n.getBoundingClientRect().height,n.getBoundingClientRect().width))));assert.ok(minTarget>=43.9,`${p.id}: target ${minTarget}`);}
  if(p.number===1){await page.getByRole('button',{name:'How to play',exact:true}).click();await page.getByRole('heading',{name:'How to play',exact:true}).waitFor();await page.getByRole('button',{name:'Done',exact:true}).click();}
  if(p.number===12)await page.screenshot({path:new URL(`../test-results/expansion-${p.mechanic}-phone.png`,import.meta.url).pathname,fullPage:true});
  const hintButton=page.getByRole('button',{name:'Hint',exact:true});for(let i=0;i<3;i++)await hintButton.click();
  const before=(await state()).profiles[0].attempts[p.id];await page.reload();await page.locator('.hint-card').waitFor();assert.deepEqual((await state()).profiles[0].attempts[p.id],before,`${p.id}: reload state`);
  let steps=0;while(!await page.locator('#completion-heading').count()&&steps++<100)await page.getByRole('button',{name:'Apply hint',exact:true}).click();
  assert.ok(await page.locator('#completion-heading').count(),`${p.id}: completed`);assert.equal(await page.evaluate(()=>document.activeElement.id),'completion-heading');assert.ok((await state()).profiles[0].attempts[p.id].completed);
  console.log(`Passed ${p.id}: saved, resumed, and solved.`);
 }
 await context.setOffline(true);await page.setViewportSize({width:768,height:1024});
 for(const p of expanded.filter(p=>p.number===12)){await goto(p.id);await fit(`offline ${p.id}`);await page.locator('.solved-indicator').waitFor();assert.equal(await page.locator('#completion-heading').count(),0);await page.screenshot({path:new URL(`../test-results/expansion-${p.mechanic}-ipad.png`,import.meta.url).pathname,fullPage:true});}
 assert.deepEqual(errors,[]);const result={passed:true,instances:expanded.length,families:10,checks:['native direct controls','all instances via live hints','save/reload','completion focus without scrolling','wire tap and keyboard','Latin keypad and keyboard','Nim win/loss and round undo','phone/iPad layout','44px touch targets','offline each family'],errors};await writeFile(new URL('../test-results/expansion-browser-report.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
