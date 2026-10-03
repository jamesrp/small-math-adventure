// Uses a disposable browser profile; never touches the player's saved explorer.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {waitForOffline} from './browser-offline.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=process.env.TEST_URL||'http://127.0.0.1:4187',key='small-math-adventure:saves:v1';
const {puzzles}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
const added=puzzles.filter(p=>p.worksheet),out=new URL('../test-results/lanterns/',import.meta.url);
const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const attempt=async id=>(await state()).profiles[0].attempts[id];
const open=async id=>{await page.goto(`${base}/#play/${id}`);await page.locator('.toggle-board').waitFor();};
const wire=index=>page.locator('.wire-hit').nth(index);
// Horizontal/vertical SVG lines have zero-area geometry; tap their stroked midpoint.
const clickWire=async index=>{
  await page.locator('.lantern-picture').first().scrollIntoViewIfNeeded();
  const point=await wire(index).evaluate(node=>{const r=node.getBoundingClientRect();return {x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};});
  await page.touchscreen.tap(point.x,point.y);
};
const undo=()=>page.getByRole('button',{name:'↶ Undo',exact:true}).click();
const solveWithHints=async()=>{
  for(let steps=0;!await page.locator('#completion-heading').count()&&steps<20;steps++)
    await page.getByRole('button',{name:'Apply hint',exact:true}).click();
  assert.equal(await page.locator('#completion-heading').count(),1,'Hints finish within 20 presses');
};
try{
  await mkdir(out,{recursive:true});
  await page.goto(base);await page.locator('#nickname').fill('Lantern QA');
  await page.locator('#profile-form button[type=submit]').click();
  await page.locator('[data-action=library]').first().click();await page.locator('.caravan-library').waitFor();
  const family=page.locator('.satchel-family').filter({has:page.locator('[data-id="toggle-01"]')});
  assert.equal(await family.locator('[data-action=open-puzzle]').count(),42);
  for(const p of added)assert.equal(await family.locator(`[data-id="${p.id}"]`).count(),1);
  await waitForOffline(page);
  for(const p of added){
    await open(p.id);
    // Every wire's midpoint must select that wire, including narrow layouts.
    for(const width of [320,390,600,768]){
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${p.id}: ${width}px overflow`);
      await page.locator('.lantern-picture').first().scrollIntoViewIfNeeded();
      const misses=await page.locator('.wire-hit').evaluateAll(nodes=>nodes.flatMap((node,index)=>{
        const r=node.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
        return document.elementFromPoint(x,y)===node?[]:[index];
      }));
      assert.deepEqual(misses,[],`${p.id}: ${width}px wire midpoints`);
    }
    await page.setViewportSize({width:390,height:844});
    if(['toggle-16','toggle-25','toggle-33','toggle-42'].includes(p.id))await page.screenshot({path:new URL(`${p.id}-phone.png`,out).pathname,fullPage:true});
    // Exercise a real keyboard press, restore it, and verify persisted history.
    const trial=p.solution.minimum_presses===1?1:0;
    await wire(trial).focus();await page.keyboard.press(p.number%2?'Enter':'Space');
    const saved=await attempt(p.id);assert.deepEqual(saved.board.presses,[trial]);
    await page.reload();await page.locator('.toggle-board').waitFor();assert.deepEqual(await attempt(p.id),saved);
    await undo();assert.deepEqual((await attempt(p.id)).board.presses,[]);
    // Use actual hit targets to apply the source witness, with no injected moves.
    for(const edge of p.solution.presses){
      const index=p.parameters.edges.findIndex(e=>e.every(v=>edge.includes(v)));
      await clickWire(index);
    }
    await page.locator('#completion-heading').waitFor();
    assert.ok((await attempt(p.id)).completed,p.id);
    await page.getByRole('button',{name:'Replay',exact:true}).click();
    assert.deepEqual((await attempt(p.id)).board.on,p.parameters.initial_on);
    assert.ok((await attempt(p.id)).completed);
    console.log(`Passed ${p.id}: pointer, keyboard, undo, reload, replay and four viewport widths.`);
  }
  // Minimum budget exhaustion recovers via Undo, then live hints solve.
  await open('toggle-36');await clickWire(0);await clickWire(0);
  assert.equal(await page.locator('.wire-hit[aria-disabled="true"]').count(),8);
  await undo();await undo();
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Hint',exact:true}).click();
  await solveWithHints();
  // Reopen after reload while offline: all data/modules come from precache.
  await context.setOffline(true);await page.setViewportSize({width:768,height:1024});
  for(const id of ['toggle-28','toggle-34','toggle-42']){
    await open(id);await page.reload();await page.locator('.toggle-board').waitFor();
    for(let i=0;i<3;i++)await page.getByRole('button',{name:'Hint',exact:true}).click();
    await solveWithHints();
  }
  await page.screenshot({path:new URL('star-ipad.png',out).pathname,fullPage:true});
  assert.deepEqual(errors,[]);
  const report={passed:true,added:added.length,familyTotal:42,viewports:[320,390,600,768],checks:['every wire midpoint','pointer and keyboard solves','undo and saved reload','replay preserves completion','minimum-budget recovery','current-state hints','offline solves'],errors};
  await writeFile(new URL('report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
