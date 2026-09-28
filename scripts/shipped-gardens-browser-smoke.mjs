// Complete every shipped garden through the same cell controls a player uses.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {puzzles}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const gardens=puzzles.filter(p=>p.mechanic==='tile');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const base=process.env.TEST_URL||'http://127.0.0.1:4187';
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const cell=n=>page.locator(`.garden-cell[data-cell="${n}"]`);
const attempt=id=>page.evaluate(id=>JSON.parse(localStorage.getItem('small-math-adventure:saves:v1')).profiles[0].attempts[id],id);
async function drag(piece){
 const point=async n=>{const box=await cell(n).boundingBox();return {x:box.x+box.width/2,y:box.y+box.height/2};};
 const first=await point(piece[0]);await page.mouse.move(first.x,first.y);await page.mouse.down();
 for(const n of piece.slice(1)){const p=await point(n);await page.mouse.move(p.x,p.y,{steps:4});}
 await page.mouse.up();
}
try{
 await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
 await page.goto(base);await page.locator('#nickname').fill('Garden tester');await page.locator('#profile-form button[type=submit]').click();
 let lCount=0,drags=0,taps=0;
 for(const p of gardens){
  await page.goto(`${base}/#play/${p.id}`);await cell(p.cells[0]).waitFor();
  const size=p.tileShape==='l-tromino'?3:2;if(size===3)lCount++;
  assert.equal(await page.locator('.tile-piece-picture').getAttribute('aria-label'),size===3?'L-tromino, 3 squares':'Domino, 2 squares');
  assert.match(await page.locator('.tile-piece-guide').innerText(),new RegExp(`Drag across ${size} squares`));
  for(const [index,piece] of p.solution.entries()){
   const before=await attempt(p.id);
   if(index===0){await drag(piece);drags++;}else{for(const n of piece)await cell(n).click();taps++;}
   const after=await attempt(p.id);
   assert.equal(after.board.length,index+1,`${p.id}: piece ${index+1} placed`);
   assert.deepEqual([...after.board.at(-1)].sort((a,b)=>a-b),[...piece].sort((a,b)=>a-b),`${p.id}: witness cells`);
   assert.equal(after.moves,before.moves+1,`${p.id}: one move per piece`);
  }
  await page.getByRole('heading',{name:'Solved',exact:true}).waitFor();
  assert.equal((await attempt(p.id)).board.length,p.solution.length);
  if(p.id==='tile-k1-04'){
   const next=await page.locator('[data-action="open-puzzle"]:has-text("Next puzzle")').getAttribute('data-id');
   assert.ok(next&&next!==p.id,'solved card offers the next library puzzle');
   await page.locator(`[data-action="open-puzzle"][data-id="${next}"]`).click();
   assert.equal(new URL(page.url()).hash,`#play/${next}`,'next puzzle opens');
   await page.goto(`${base}/#play/${p.id}`);await page.getByRole('heading',{name:'Solved',exact:true}).waitFor();
  }
  if(['tile-k1-04','tile-23-08','tile-45-12','tile-k1-03'].includes(p.id)){
   await page.screenshot({path:new URL(`../test-results/${p.id}.png`,import.meta.url).pathname,fullPage:true});
   await page.locator('[data-action="replay"]').click();const before=await attempt(p.id);
   await page.locator('[data-action="hint"]').click();await page.locator('[data-action="hint"]').click();
   assert.equal((await attempt(p.id)).board.length,before.board.length,`${p.id}: hints do not place`);
   assert.equal(await page.locator('.garden-cell.hinted').count(),size);
   await page.locator('[data-action="hint"]').click();await page.locator('[data-action="apply-hint"]').click();
   assert.equal((await attempt(p.id)).board.length,1,`${p.id}: explicit hint application`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  }
 }
 assert.equal(gardens.length,36);assert.equal(lCount,9);assert.deepEqual(errors,[]);
 const report={passed:true,gardens:gardens.length,lGardens:lCount,dragPlacements:drags,tapPlacements:taps,errors};
 await writeFile(new URL('../test-results/shipped-gardens-browser-report.json',import.meta.url),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser.close();}
