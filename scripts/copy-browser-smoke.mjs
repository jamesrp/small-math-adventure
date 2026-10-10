// Verify the player's default view, using an isolated local browser profile.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {puzzleObjective} from '../dist/puzzle-copy.js';
import {loadPack} from './packs.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base=(process.env.TEST_URL||'http://127.0.0.1:4187').replace(/\/$/,'');
const {puzzles}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
// The satchel shows every pack on the family seam (dist/families.js) too.
const satchel=(await loadPack()).puzzles,satchelFamilies=new Set(satchel.map(p=>p.libraryFamily||p.mechanic)).size;
const output=new URL('../test-results/',import.meta.url);
const screenshots=[],objectiveCounts={zero:0,one:0};
const capture=async name=>{const filename=`copy-${name}.png`;await page.screenshot({path:new URL(filename,output).pathname,fullPage:true});screenshots.push(filename);};
const normalize=value=>value.replace(/\s+/g,' ').trim();
const assertFits=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${label}: no horizontal overflow`);
const captureSizes=async name=>{
 await capture(`${name}-ipad`);
 await page.setViewportSize({width:390,height:844});await assertFits(`${name}, phone`);await capture(`${name}-phone`);
 await page.setViewportSize({width:1024,height:768});
};
async function assertMinimalChrome(label){
 assert.equal(await page.locator('footer,.footer,#offline-status').count(),0,`${label}: no routine save/offline footer`);
 assert.deepEqual((await page.locator('.caravan-nav button').allTextContents()).map(normalize),['Road','Puzzles','Journal'],`${label}: concise navigation`);
 assert.equal(await page.locator('#main [data-action="map"],#main [data-action="library"]').count(),0,`${label}: persistent navigation is not duplicated`);
 assert.equal(await page.locator('#main [data-action="journal"]').count(),0,`${label}: the journal is a tab, not a button in the page`);
 assert.doesNotMatch(await page.locator('#main').innerText(),/Free play|Ready for offline play|Saved on this device|\b\d+\s+(?:of|\/)\s*\d+\s+(?:explored|completed)|\b\d+ puzzles\b/i,`${label}: no promotional or progress counters`);
}
async function assertEssentialConstraints(puzzle,goal){
 const p=puzzle.parameters,id=puzzle.id,board=page.locator('.board-panel'),text=normalize(await board.innerText());
 switch(puzzle.mechanic){
  case 'tile':
   assert.equal(goal,'',`${id}: the garden communicates its goal without a visible objective`);
   assert.equal(await page.locator('.tile-piece-picture[role="img"]').getAttribute('aria-label'),puzzle.tileShape==='l-tromino'?'L-tromino, 3 squares':'Domino, 2 squares',`${id}: accessible piece picture`);
   assert.equal(text.includes(`Drag across ${puzzle.tileShape==='l-tromino'?3:2} squares`),true,`${id}: empty-board gesture guidance`);
   assert.equal(await page.locator('.garden-cell').count(),puzzle.cells.length,`${id}: every playable square remains available`);
   break;
  case 'swap':
   assert.equal(await page.locator('.cup-button').count(),puzzle.start.length,`${id}: all cups visible`);
   assert.equal(await page.locator('[data-action="swap-pair"]').count(),puzzle.edges.length,`${id}: all legal swaps available`);
   assert.deepEqual((await page.locator('.cup-home').allTextContents()).map(value=>value.match(/[A-Z]/)?.[0]),puzzle.target.map(value=>String.fromCharCode(65+value)),`${id}: target cup order remains on the board`);
   break;
  case 'toggle':
   assert.equal(await page.locator('.goal-picture .lantern.lit').count(),p.target_on.length,`${id}: visual target retained`);
   assert.ok((await page.locator('.goal-picture svg').getAttribute('aria-label')).includes(`Bright: ${p.target_on.join(', ')||'none'}`),`${id}: accessible target retained`);
   if(p.press_budget==null)assert.equal(await page.locator('.motion-status').count(),0,`${id}: no unbounded press counter`);
   else assert.match(text,new RegExp(`\\b${p.press_budget} press(?:es)? remaining\\b`),`${id}: remaining press budget must be visible`);
   break;
  case 'clock':
   assert.match(goal,/first/i,`${id}: first landing/return condition`);
   if(p.mode==='choose_jump')assert.match(goal,new RegExp(`bell ${p.required_first_return}\\b`),`${id}: exact first-return bell`);
   else if(p.clocks.length>1)assert.match(goal,/every marker/i,`${id}: simultaneous landing condition`);
   break;
  case 'billiard':
   if(p.mode==='predict'){
    // Inspect the label's own text; nested option text is not part of the prompt.
    const corner=board.locator('select[name="corner"]');
    assert.equal(await corner.count(),1,`${id}: first-corner choice`);
    assert.equal(await corner.evaluate(node=>Array.from(node.closest('label').childNodes).filter(child=>child.nodeType===Node.TEXT_NODE).map(child=>child.textContent).join('').trim()),'First corner',`${id}: first-corner label`);
    assert.equal(await page.getByLabel('Bounces before corner',{exact:true}).count(),1,`${id}: bounce count excludes the stopping corner`);
   }else{
    assert.ok(goal.includes(p.target_corner.replace('-',' ')),`${id}: target corner`);
    assert.match(goal,new RegExp(`exactly ${p.target_bounces} bounces`),`${id}: exact bounce count`);
    assert.match(goal,/first/i,`${id}: first corner stops the ray`);
   }
   break;
  case 'route':
   assert.match(goal,/every road/i,`${id}: road coverage rule`);
   if(p.mode==='each_edge_once')assert.match(goal,/once/i,`${id}: each road used once`);
   else assert.ok(goal.includes(String(p.target_cost)),`${id}: exact distance target`);
   if(p.closed)assert.match(goal,new RegExp(`return(?:ing)? to ${p.start}\\b`),`${id}: return-to-start condition`);
   break;
  case 'color':
   assert.match(goal,/linked pairs differ/i,`${id}: adjacent colors differ`);
   assert.equal(await page.locator('.color-palette [data-color]').count(),p.palette_size,`${id}: allowed color count`);
   break;
  case 'latin':
   assert.ok(goal.includes(`1–${p.order}`),`${id}: allowed symbols`);
   assert.match(goal,/once in every row and column/i,`${id}: both Latin-square constraints`);
   break;
  case 'code':
   assert.match(text,/Exact matches/i,`${id}: exact-position feedback is labeled`);
   assert.equal(await page.locator('.code-transcript tbody tr').count(),p.transcript.length,`${id}: all recorded constraints retained`);
   for(let i=0;i<p.transcript.length;i++){
    const row=page.locator('.code-transcript tbody tr').nth(i);
    assert.equal(normalize(await row.locator('td').first().innerText()),String(p.transcript[i].matches),`${id}: recorded match count ${i+1}`);
    assert.equal((await row.locator('[role="img"]').getAttribute('aria-label')).replace(/, /g,''),p.transcript[i].guess,`${id}: recorded test ${i+1}`);
   }
   break;
  case 'nim':
   assert.match(goal,/last pebble.*win/i,`${id}: full-game winning condition`);
   assert.equal(await page.locator('.nim-puzzle .duel-bowl').count(),p.piles.length,`${id}: starting piles retained`);
   assert.equal(await page.locator('.nim-bundles').count(),0,`${id}: optional bundle explanation stays in Help`);
   break;
  case 'jug':
   if(p.target_state)for(const [i,amount]of p.target_state.entries())assert.ok(goal.includes(`${amount===0?'none':`${amount} ${amount===1?'unit':'units'}`} in ${String.fromCharCode(65+i)}`),`${id}: exact target in jug ${i+1}`);
   else assert.match(goal,new RegExp(`exactly ${p.target_amount} units? in either jug`),`${id}: exact target amount`);
   assert.equal(await page.locator('.jug-station').count(),p.capacities.length,`${id}: jug capacities remain visible`);
   if(!p.source_and_drain)assert.equal(await board.getByRole('button',{name:/^(Fill|Empty) jug/}).count(),0,`${id}: closed-water task has no fill/drain operation`);
   break;
  case 'weigh':
   assert.match(goal,p.odd_kind==='heavy'?/heavy pebble/i:/heavy or light/i,`${id}: odd-pebble possibilities`);
   assert.match(text,new RegExp(`\\b${p.weighing_budget} weighings? left\\b`),`${id}: weighing budget`);
   for(const coin of p.known_genuine)assert.ok((await page.locator('.balance-pebble legend').allTextContents()).some(value=>value.includes(coin)&&/Normal/.test(value)),`${id}: reference pebble is marked normal`);
   break;
 }
}
try{
 await mkdir(output,{recursive:true});
 await page.goto(base);await page.locator('#nickname').fill('Copy review');await page.locator('#profile-form button[type=submit]').click();await page.locator('.lr-overview').waitFor();
 await assertMinimalChrome('map');
 assert.equal(await page.locator('.journey-opening,.scene-caption,.scene-label,.camp-memory,.caravan-promise,.satchel-invitation,.stop-label,.stop-number,.caravan-section-heading').count(),0,'map: decorative headings, captions, and recaps removed');
 await capture('map');await captureSizes('map');
 for(const puzzle of puzzles){
  await page.goto(`${base}/#play/${puzzle.id}`);await page.locator(`.caravan-puzzle[data-puzzle-id="${puzzle.id}"] .board-panel`).waitFor();
  const goals=await page.locator('.puzzle-goal').count(),shouldBeImplicit=['swap','toggle','code'].includes(puzzle.mechanic)||(puzzle.mechanic==='billiard'&&puzzle.parameters.mode==='predict');
  assert.ok(goals<=1,`${puzzle.id}: at most one visible objective`);
  if(shouldBeImplicit)assert.equal(goals,0,`${puzzle.id}: the board or controls already communicate the task`);
  objectiveCounts[goals?'one':'zero']++;
  assert.equal(await page.locator('#main h1:not(.sr-only)').count(),goals,`${puzzle.id}: no extra visible page heading`);
  assert.equal(await page.locator('.puzzle-intro,.guide-card,.board-caption').count(),0,`${puzzle.id}: no duplicate instruction stack`);
  assert.equal(await page.locator('.play-heading .badge,.play-heading .eyebrow,.play-heading h1,.board-panel > .eyebrow').count(),0,`${puzzle.id}: no puzzle title, family eyebrow, or progress badge`);
  const goal=goals?await page.locator('.puzzle-goal').innerText():'';assert.ok(goal.length<150,`${puzzle.id}: concise objective when needed`);
  const lines=(await page.locator('#main').innerText()).split('\n').map(s=>s.trim());
  assert.ok(!lines.includes(puzzle.title),`${puzzle.id}: no authored puzzle name`);
  assert.equal(await page.locator('.feedback').innerText(),'',`${puzzle.id}: no unsolicited feedback`);
  await assertMinimalChrome(puzzle.id);await assertEssentialConstraints(puzzle,goal);await assertFits(puzzle.id);
  if((puzzle.band==='all'&&puzzle.number===6)||((puzzle.mechanic==='tile'||puzzle.mechanic==='swap')&&puzzle.band==='k1'&&puzzle.number===6)||['toggle-01','nim-03'].includes(puzzle.id))await captureSizes(puzzle.id);
  if(puzzle.id==='swap-k1-03')await captureSizes('cup-k1');
  assert.equal(await page.getByRole('button',{name:'Read instructions aloud',exact:true}).count(),1,`${puzzle.id}: read-aloud remains available`);
  await page.getByRole('button',{name:'How to play',exact:true}).click();const help=page.getByRole('dialog');await help.waitFor();
  // This is an integration boundary check: visible copy may disappear, but the
  // independently generated full objective must still reach the Help dialog.
  assert.ok(normalize(await help.innerText()).includes(normalize(puzzleObjective(puzzle))),`${puzzle.id}: Help retains the complete objective`);
  if(puzzle.mechanic==='swap')assert.match(await help.innerText(),/Only the listed pairs can swap/);
  await help.getByRole('button',{name:'Done',exact:true}).click();await page.locator('dialog').waitFor({state:'detached'});
 }
 await page.goto(`${base}/#library`);await page.locator('.caravan-library').waitFor();await assertMinimalChrome('library');
 assert.equal(await page.locator('[data-action=open-puzzle]:not(.library-proofs *)').count(),satchel.filter(p=>p.band!=='proofs').length,'library: every catalog and family puzzle remains selectable');
 assert.equal(await page.locator('.satchel-family').count(),satchelFamilies,`library: all ${satchelFamilies} families remain accessible`);
 assert.equal(await page.locator('#main h1:not(.sr-only),.library-heading,.library-note,.family-summary small,.satchel-family-content > p,.puzzle-card small').count(),0,'library: no redundant heading, family descriptions, or counters');
 for(const family of await page.locator('.satchel-family').all()){
  const wasOpen=await family.getAttribute('open')!==null;
  if(!wasOpen)await family.locator('summary').click();
  for(const play of await family.locator('.satchel-playground').all())assert.match(normalize(await play.innerText()),/^\S Playground$/,'library: a playground is labeled Playground');
  for(const card of await family.locator('[data-action="open-puzzle"]:not(.satchel-playground)').all())assert.match(normalize(await card.innerText()),/^\d{2}(?:\s*✓)?$/,'library: puzzle selection uses a number and completion mark only');
  if(!wasOpen)await family.locator('summary').click();
 }
 await capture('library');await captureSizes('library');
 await page.goto(`${base}/#journal`);await page.locator('.lr-journal-view').waitFor();await assertMinimalChrome('journal');
 assert.equal(await page.locator('#main h1:not(.sr-only),.journal-heading,.journal-cover,.journal-next').count(),0,'journal: no duplicate heading or decorative cover');
 await capture('journal');await captureSizes('journal');
 assert.deepEqual(errors,[]);
 const report={passed:true,puzzles:puzzles.length,objectiveCounts,helpDialogs:puzzles.length,checks:['zero objectives when the board communicates the task; at most one elsewhere','essential goals and constraints retained across twelve mechanics','no puzzle titles, duplicate headings, progress badges, back buttons, or routine footers','no idle encouragement or unbounded press counters','all catalog puzzles accessible without promotional descriptions or counts','complete objectives available in Help','representative family, K1, and menu screens fit tablet and phone'],screenshots,errors};
 await writeFile(new URL('copy-browser-report.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
