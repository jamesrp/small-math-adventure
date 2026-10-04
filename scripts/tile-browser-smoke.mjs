// Synthetic garden fixture supplements the shipped-pack completion check.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {freshAttempt,move,isSolved,nextHint} from '../dist/engine.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const pack=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const l={...pack.puzzles.find(p=>p.mechanic==='tile'),id:'tile-ui-fixture',tileShape:'l-tromino',rows:6,cols:6,cells:[0,1,6,5,11,4,35,34,29,30,24,31],solution:[[0,1,6],[5,11,4],[35,34,29],[30,24,31]],hints:['Start at a corner.']};
pack.puzzles.push(l);
const graze={...l,id:'tile-graze-fixture',rows:2,cols:3,cells:[0,1,2,3,4,5],solution:[[0,1,3],[2,4,5]]};pack.puzzles.push(graze);
const dominoGraze={...l,id:'tile-domino-graze-fixture',tileShape:'domino',rows:3,cols:3,cells:[0,1,3,4,6,7],solution:[[0,1],[3,4],[6,7]]};pack.puzzles.push(dominoGraze);
const domino=pack.puzzles.find(p=>p.mechanic==='tile'&&!p.tileShape&&p.solution.length>1);
const shippedL=pack.puzzles.find(p=>p.id==='tile-k1-04');
const base=process.env.TEST_URL||'http://127.0.0.1:4187';
const context=await browser.newContext({hasTouch:true,serviceWorkers:'block',viewport:{width:390,height:844}});
await context.route('**/puzzles.json',route=>route.fulfill({json:pack}));
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const cell=n=>page.locator(`.garden-cell[data-cell="${n}"]`),action=n=>page.locator(`[data-action="${n}"]`);
const attempt=id=>page.evaluate(id=>JSON.parse(localStorage.getItem('small-math-adventure:saves:v1')).profiles[0].attempts[id],id);
const centre=async n=>{const b=await cell(n).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};};
const enter=async n=>{const p=await centre(n);await page.mouse.move(p.x,p.y,{steps:5});};
const sorted=xs=>[...xs].sort((a,b)=>a-b);
const preview=()=>page.locator('.garden-cell.tile-preview').evaluateAll(nodes=>nodes.map(n=>({cell:Number(n.dataset.cell),color:[...n.classList].find(c=>/^tile-color-/.test(c))})));
const painted=(p,color)=>page.locator(`.garden-domino.${color}`).evaluateAll((nodes,cols)=>nodes.flatMap(n=>{
 const row=Number(n.style.gridRowStart)-1,col=Number(n.style.gridColumnStart)-1;
 const height=Number(n.style.gridRowEnd.match(/span (\d+)/)?.[1]||1),width=Number(n.style.gridColumnEnd.match(/span (\d+)/)?.[1]||1);
 return Array.from({length:height*width},(_,i)=>(row+Math.floor(i/width))*cols+col+i%width);
}),p.cols);
async function assertPlacedPreview(p,snapshot,index){
 const color=`tile-color-${index%6}`,cells=sorted(snapshot.map(x=>x.cell));
 assert.ok(snapshot.every(x=>x.color===color),`${p.id}: preview color ${color}`);
 assert.deepEqual(sorted(await painted(p,color)),cells,`${p.id}: painted cells and color match preview`);
 assert.deepEqual(sorted((await attempt(p.id)).board[index]),cells,`${p.id}: saved cells match preview`);
}
async function stroke(cells,{cancel=false,extraPointer=false,inspect}={}){
 await enter(cells[0]);await page.mouse.down();
 if(extraPointer)await page.evaluate(()=>document.querySelector('.tile-board').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:99,isPrimary:false,button:0})));
 for(const n of cells.slice(1))await enter(n);
 if(inspect)await inspect();
 if(cancel)await page.evaluate(()=>{const board=document.querySelector('.tile-board');board.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1}));});
 else await page.mouse.up();
}
async function reset(p){await page.goto(`${base}/#play/${p.id}`);await cell(p.cells[0]).waitFor();await action('restart').click();}
async function checkShape(p,piece,invalid){
 await reset(p);const id=p.id,size=piece.length;
 assert.equal(await action('rotate-tile').count(),0);assert.equal(await action('place-tile').count(),0);
 assert.equal(await page.locator('.tile-piece-picture').getAttribute('aria-label'),size===3?'L-tromino, 3 squares':'Domino, 2 squares');
 assert.equal((await page.locator('.tile-piece-guide').innerText()).trim(),`Drag across ${size} squares`);
 assert.equal(await page.locator('.tile-board').evaluate(n=>getComputedStyle(n).touchAction),'none');
 await action('demo').click();const help=await page.locator('dialog').innerText();assert.match(help,/drag/i);assert.match(help,/tap/i);assert.doesNotMatch(help,/click|rotate/i);await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.evaluate(()=>{window.spoken='';window.SpeechSynthesisUtterance=class{constructor(text){window.spoken=text;}};window.speechSynthesis.speak=()=>{};});await action('speak').click();assert.match(await page.evaluate(()=>window.spoken),/drag/i);assert.doesNotMatch(await page.evaluate(()=>window.spoken),/click|rotate/i);
 let before=await attempt(id),node=await page.locator('.tile-board').elementHandle(),firstPreview;
 await stroke(piece,{extraPointer:true,inspect:async()=>{
  assert.equal(await page.locator('.tile-board').evaluate((n,original)=>n===original,node),true,'board node retained during drag');
  assert.deepEqual(await attempt(id),before,'drag has not saved');
  firstPreview=await preview();
  assert.deepEqual(sorted(firstPreview.map(n=>n.cell)),sorted(piece));
 }});
 await assertPlacedPreview(p,firstPreview,0);
 assert.deepEqual([...((await attempt(id)).board[0])].sort((a,b)=>a-b),[...piece].sort((a,b)=>a-b));
 assert.equal((await attempt(id)).moves,before.moves+1);assert.equal(await page.locator('.tile-piece-guide').innerText(),'');
 const second=size===3?[4,5,11]:p.solution[1],secondBefore=await attempt(id);let secondPreview;
 await stroke(second,{inspect:async()=>{secondPreview=await preview();assert.deepEqual(sorted(secondPreview.map(x=>x.cell)),sorted(second));assert.deepEqual(await attempt(id),secondBefore);}});
 await assertPlacedPreview(p,secondPreview,1);assert.equal((await attempt(id)).moves,secondBefore.moves+1,'second color advances one move');
 await action('undo').click();
 const other=p.cells.find(n=>!piece.includes(n));before=await attempt(id);
 await stroke([other,piece[0]],{inspect:async()=>assert.ok(await page.locator('.tile-preview.invalid').count()>0,'occupied-cell stroke is blocked')});
 assert.deepEqual(await attempt(id),before,'occupied-cell stroke does not change the board');
 await action('undo').click();assert.equal((await attempt(id)).board.length,0);assert.match(await page.locator('.tile-piece-guide').innerText(),/Drag across/);
 // Revisited cells are kept, both for out-and-back and the L corner return.
 const returnPath=size===3?[piece[0],piece[1],piece[0],piece[2]]:[piece[0],piece[1],piece[0]];
 await stroke(returnPath);assert.equal((await attempt(id)).board.length,1);await action('undo').click();
 if(size===3){await stroke([piece[1],piece[0],piece[2]]);assert.equal((await attempt(id)).board.length,1);await action('undo').click();}
 for(const path of [[piece[0]],...(size===3?[[piece[0],piece[1]]]:[]),invalid,[...piece,other]]){
  before=await attempt(id);await stroke(path,{inspect:async()=>{if(path===invalid)assert.ok(await page.locator('.tile-preview.invalid').count()>0);}});
  assert.deepEqual(await attempt(id),before,'rejected gesture leaves save and history intact');
  assert.equal(await page.locator('.tile-preview').count(),0);assert.equal(await page.locator('.feedback').innerText(),'');
 }
 const box=await page.locator('.tile-board').boundingBox();before=await attempt(id);
 await enter(piece[0]);await page.mouse.down();await page.mouse.move(box.x-8,box.y-8);
 assert.ok(await page.locator('.tile-preview.invalid').count()>0,'leaving garden blocks the stroke');
 await page.mouse.up();assert.deepEqual(await attempt(id),before);
 {
  before=await attempt(id);await enter(piece[0]);await page.mouse.down();
  const hole=await page.locator('.garden-hole').first().boundingBox();assert.ok(hole,`${id}: hole fixture required`);await page.mouse.move(hole.x+hole.width/2,hole.y+hole.height/2);
  assert.ok(await page.locator('.tile-preview.invalid').count()>0,'entering a hole blocks the stroke');
  await page.mouse.up();assert.deepEqual(await attempt(id),before);
 }
 before=await attempt(id);await stroke(piece,{cancel:true});assert.deepEqual(await attempt(id),before,'pointercancel does not place');await page.mouse.up();
 // Taps toggle, restart incompatible selections, and work in either order.
 await cell(piece[0]).click();assert.equal(await cell(piece[0]).getAttribute('aria-pressed'),'true');await cell(piece[0]).click();assert.equal(await cell(piece[0]).getAttribute('aria-pressed'),'false');
 await cell(piece[0]).click();await cell(invalid.at(-1)).click();assert.equal(await cell(invalid.at(-1)).getAttribute('aria-pressed'),'true');assert.equal(await cell(piece[0]).getAttribute('aria-pressed'),'false');
 await cell(invalid.at(-1)).click();for(const n of [...piece].reverse()){await cell(n).focus();await page.keyboard.press(n===piece[0]?'Space':'Enter');}
 assert.equal((await attempt(id)).board.length,1);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.cell),String(piece[0]));
 await cell(piece[1]).click();assert.equal((await attempt(id)).board.length,0,'occupied cell lifts whole tile');
 await action('hint').click();assert.match(await page.locator('.hint-card').innerText(),/empty patch with only one possible tile placement/i,'first hint text');
 await action('hint').click();assert.match(await page.locator('.hint-card').innerText(),/glowing patches/i,'second hint text');assert.equal((await attempt(id)).board.length,0,'hint does not auto-place');assert.equal(await page.locator('.garden-cell.hinted').count(),size);
 await action('hint').click();await action('apply-hint').click();assert.equal((await attempt(id)).board.length,1);
 await action('restart').click();assert.equal((await attempt(id)).board.length,0);
 await page.reload();await cell(piece[0]).waitFor();assert.equal((await attempt(id)).board.length,0);
}
try{
 await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
 await page.goto(base);await page.locator('#nickname').fill('Tile tester');await page.locator('#profile-form button[type=submit]').click();
 await checkShape(l,[0,1,6],[0,1,5]);
 await page.screenshot({path:new URL('../test-results/l-tile-phone.png',import.meta.url).pathname,fullPage:true});
 await checkShape(dominoGraze,[0,1],[0,4]);
 await page.screenshot({path:new URL('../test-results/domino-phone.png',import.meta.url).pathname,fullPage:true});
 for(const puzzle of [l,dominoGraze]){
  await page.setViewportSize({width:390,height:500});await reset(puzzle);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),true,'short viewport can scroll');
  await page.evaluate(()=>scrollTo(0,0));const start=await centre(puzzle.solution[0][0]),scrollBefore=await page.evaluate(()=>scrollY);
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x,start.y+90,{steps:6});
  assert.equal(await page.evaluate(()=>scrollY),scrollBefore,`${puzzle.id}: board drag does not scroll`);
  await page.mouse.up();await page.mouse.move(15,30);await page.mouse.wheel(0,350);
  await page.waitForFunction(before=>scrollY>before,scrollBefore);await page.setViewportSize({width:390,height:844});
 }
 for(const puzzle of [graze,dominoGraze]){
  await reset(puzzle);await enter(0);await page.mouse.down();await enter(1);
  const fourth=await cell(4).boundingBox();await page.mouse.move(fourth.x+fourth.width*.1,fourth.y+fourth.height*.1);
  assert.deepEqual(sorted((await preview()).map(n=>n.cell)),[0,1],`${puzzle.id}: corner graze stays outside the cell`);
  if(puzzle===graze)await enter(3);
  await page.mouse.up();assert.deepEqual(sorted((await attempt(puzzle.id)).board[0]),puzzle===graze?[0,1,3]:[0,1]);
  await action('undo').click();await enter(0);await page.mouse.down();await enter(1);await enter(4);
  assert.deepEqual(sorted((await preview()).map(n=>n.cell)),[0,1,4],`${puzzle.id}: deliberate centre entry joins the stroke`);
  if(puzzle===graze)await enter(3);
  assert.ok(await page.locator('.tile-preview.invalid').count()>0,`${puzzle.id}: excess cells blocked`);await page.mouse.up();
  assert.equal((await attempt(puzzle.id)).board.length,0);
 }
 await page.setViewportSize({width:768,height:1024});await reset(l);
 assert.equal(await page.locator('.tile-piece-picture').getAttribute('aria-label'),'L-tromino, 3 squares');
 assert.equal((await page.locator('.tile-piece-guide').innerText()).trim(),'Drag across 3 squares');
 assert.ok((await page.locator('.tile-piece-guide').boundingBox()).height<=46,'iPad L guide stays compact');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'iPad L layout fits width');
 await page.screenshot({path:new URL('../test-results/l-tile-ipad.png',import.meta.url).pathname,fullPage:true});
 await page.setViewportSize({width:390,height:844});
 // A current in-progress attempt retains its board and undo history on reload.
 await reset(l);for(const n of l.solution[0])await cell(n).click();
 const savedL=await attempt(l.id);await page.reload();await cell(l.solution[0][0]).waitFor();
 assert.deepEqual((await attempt(l.id)).board,savedL.board);assert.deepEqual((await attempt(l.id)).history,savedL.history);
 for(const n of l.solution[1])await cell(n).click();assert.equal((await attempt(l.id)).board.length,2);
 await reset(shippedL);for(const n of shippedL.solution[0])await cell(n).click();
 const savedShippedL=await attempt(shippedL.id);assert.equal(shippedL.revision,2);
 await page.reload();await cell(shippedL.solution[0][0]).waitFor();
 assert.deepEqual(await attempt(shippedL.id),savedShippedL,'current revision-2 L save retains board and history');
 for(const n of shippedL.solution[1])await cell(n).click();assert.equal((await attempt(shippedL.id)).completed,true,'revision-2 L save continues to completion');
 await reset(domino);for(const n of domino.solution[0])await cell(n).click();
 const savedDomino=await attempt(domino.id);await page.reload();await cell(domino.solution[0][0]).waitFor();
 assert.deepEqual((await attempt(domino.id)).board,savedDomino.board);assert.deepEqual((await attempt(domino.id)).history,savedDomino.history);
 const [da,db]=await Promise.all(domino.solution[0].map(n=>cell(n).boundingBox()));
 const gap=da.y===db.y?{x:(Math.min(da.x,db.x)+da.width+Math.max(da.x,db.x))/2,y:da.y+da.height/2}:{x:da.x+da.width/2,y:(Math.min(da.y,db.y)+da.height+Math.max(da.y,db.y))/2};
 await page.mouse.click(gap.x,gap.y);assert.equal((await attempt(domino.id)).board.length,0,'painted domino gap lifts tile');
 // Chromium's CDP touch input exercises the touch pointer route with a fresh board.
 let cdpTouch='not exercised';const cdp=await context.newCDPSession(page);
 for(const puzzle of [l,domino]){
  await reset(puzzle);const points=[];for(const n of puzzle.solution[0])points.push(await centre(n));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1}]});
  for(const p of points.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal((await attempt(puzzle.id)).board.length,1,`CDP touch stroke places ${puzzle.id}`);
 }
 cdpTouch='Chromium CDP L and domino strokes passed; real iPad check outstanding';
 // The road's Old Workshop floor is an L-tromino garden: reach it with a saved
 // trail, then cover it by taps and check the trail records the encounter.
 const {startJourney,beginEncounter,recordSolve,campaignId}=await import('../dist/road.js');
 const {mechanicFor}=await import('../dist/expansion.js');
 const proofPack=JSON.parse(await readFile(new URL('../dist/proofs.json',import.meta.url),'utf8')),roadPuzzles=[...pack.puzzles,...proofPack.puzzles];
 const traveler={id:'road',name:'Road garden',avatar:0,band:'k1',sound:false,attempts:{}};startJourney(traveler);
 for(let i=0;i<12;i++){const o=beginEncounter(traveler,roadPuzzles);let a=freshAttempt(o.puzzle);for(let k=0;k<300&&!isSolved(o.puzzle,a.board);k++)a=move(o.puzzle,a,mechanicFor(o.puzzle)?.solve?mechanicFor(o.puzzle).solve(o.puzzle,a.board):(h=>h.action||h.pair)(nextHint(o.puzzle,a)));traveler.attempts[o.puzzle.id]=a;recordSolve(traveler,o.puzzle.id,o.encounter.id,roadPuzzles);}
 const storyContext=await browser.newContext({viewport:{width:768,height:1024},serviceWorkers:'block'});
 await storyContext.addInitScript(value=>{if(!localStorage.getItem('small-math-adventure:saves:v1'))localStorage.setItem('small-math-adventure:saves:v1',value);},JSON.stringify({schemaVersion:1,contentVersion:1,activeProfileId:'road',profiles:[traveler]}));
 const story=await storyContext.newPage();story.on('pageerror',e=>errors.push(e.message));
 await story.goto(base);await story.locator('[data-action="continue-journey"]:visible').first().click();await story.locator('.garden-cell').first().waitFor();
 assert.match(story.url(),new RegExp(`#play/${campaignId('workshop-floor','k1')}/workshop-floor$`));
 const storyPuzzle=pack.puzzles.find(p=>p.id==='tile-k1-04');
 for(const piece of storyPuzzle.solution)for(const n of piece)await story.locator(`.garden-cell[data-cell="${n}"]`).click();
 await story.locator('#completion-heading').waitFor();
 const journey=await story.evaluate(()=>JSON.parse(localStorage.getItem('small-math-adventure:saves:v1')).profiles[0].journey);
 assert.ok(journey.trails.k1.completed.includes('workshop-floor'));await storyContext.close();
 assert.deepEqual(errors,[]);const report={passed:true,shapes:['L-tromino','domino'],errors,touch:cdpTouch};
 await writeFile(new URL('../test-results/tile-browser-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
