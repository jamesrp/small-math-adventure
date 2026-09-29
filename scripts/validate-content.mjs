import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import {withCampaignPuzzles} from '../dist/caravan.js';
import { freshAttempt, move, isSolved, solveTiles, solveSwaps, nextHint, validBoard, tileSize } from '../dist/engine.js';
export async function validateContent(){
  const pack=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
  const {puzzles,sources}=pack;
  assert.equal(puzzles.length,192);assert.equal(new Set(puzzles.map(p=>p.id)).size,192);
  assert.equal(pack.families.length,10);for(const f of pack.families){
    const list=puzzles.filter(p=>p.mechanic===f.id);
    assert.equal(list.length,12);assert.deepEqual(list.map(p=>p.number),Array.from({length:12},(_,i)=>i+1));
    assert.ok(list.every(p=>p.band==='all'&&['easy','medium','hard'].includes(p.difficulty_level)));
    for(const level of ['easy','medium','hard'])assert.ok(list.some(p=>p.difficulty_level===level),`${f.id}: ${level}`);
    assert.equal(new Set(list.map(p=>JSON.stringify(p.parameters))).size,12,`${f.id}: distinct starting data`);
  }
  assert.equal(new Set(sources.map(s=>s.id)).size,sources.length);
  for(const source of sources){if(source.url)assert.match(source.url,/^https:\/\//);else assert.ok(source.path?.startsWith('/'));assert.ok(source.title);}
  let moves=0;
  for(const band of ['k1','23','45'])for(const mechanic of ['tile','swap']){
    const list=puzzles.filter(p=>p.band===band&&p.mechanic===mechanic);
    assert.equal(list.length,12);assert.deepEqual(list.map(p=>p.number).sort((a,b)=>a-b),Array.from({length:12},(_,i)=>i+1));
  }
  for(const p of puzzles){
    assert.equal(p.revision,/^tile-(k1|23|45)-(04|08|12)$/.test(p.id)?2:1);
    if (/^tile-(k1|23|45)-(04|08|12)$/.test(p.id)) assert.equal(p.tileShape,'l-tromino');for(const key of ['id','title','instruction','idea'])assert.ok(typeof p[key]==='string'&&p[key].trim(),`${p.id} ${key}`);
    assert.equal(p.hints.length,3);p.hints.forEach(h=>assert.ok(typeof h==='string'&&h.trim()));
    for(const key of ['notice','prompt','explanation','extension','connection'])assert.ok(p.parent[key]?.trim(),`${p.id} parent.${key}`);
    assert.ok(p.parent.sourceIds.length);for(const id of p.parent.sourceIds)assert.ok(sources.some(s=>s.id===id),`${p.id} ${id}`);
    if(!['tile','swap'].includes(p.mechanic)){
      let a=freshAttempt(p);assert.ok(validBoard(p,a.board),p.id);assert.ok(!isSolved(p,a.board),`${p.id} starts unsolved`);
      for(let i=0;!isSolved(p,a.board)&&i<200;i++){const hint=nextHint(p,a);assert.equal(hint.type,'move',`${p.id}: ${hint.text}`);a=move(p,a,hint.action);assert.ok(a,`${p.id}: next hint is legal`);moves++;}
      assert.ok(isSolved(p,a.board),`${p.id}: current-state hints reach a valid completion`);continue;
    }
    if(p.mechanic==='tile'){
      assert.ok(Number.isInteger(p.cols)&&p.cols>=1&&p.cols<=6&&Number.isInteger(p.rows)&&p.rows>=1&&p.rows<=6);
      assert.equal(new Set(p.cells).size,p.cells.length);assert.ok(tileSize(p), `${p.id}: unsupported tileShape`);assert.equal(p.cells.length%tileSize(p),0);assert.ok(p.cells.length<=24);
      assert.ok(p.cells.every(c=>Number.isInteger(c)&&c>=0&&c<p.cols*p.rows));assert.ok(solveTiles(p),p.id);
    }else{
      assert.ok(p.start.length>=2&&p.start.length<=6);assert.deepEqual([...p.start].sort((a,b)=>a-b),p.target);
      assert.equal(new Set(p.edges.map(e=>[...e].sort((a,b)=>a-b).join(','))).size,p.edges.length);
      assert.ok(p.edges.every(e=>e.length===2&&e[0]!==e[1]&&e.every(n=>Number.isInteger(n)&&n>=0&&n<p.start.length)));
      assert.equal(solveSwaps(p)?.length,p.minimumMoves,p.id);assert.equal(p.solution.length,p.minimumMoves,p.id);
    }
    let a=freshAttempt(p);assert.ok(!isSolved(p,a.board),`${p.id} should start unsolved`);
    for(const pair of p.solution){a=move(p,a,pair);assert.ok(a,`${p.id} invalid witness`);moves++;}
    assert.ok(isSolved(p,a.board),`${p.id} witness incomplete`);
  }
  const campaign=withCampaignPuzzles(puzzles).filter(p=>p.campaignOnly);
  for(const p of campaign){
    let a=freshAttempt(p);
    assert.ok(validBoard(p,a.board),`${p.id}: valid starting board`);
    for(let i=0;!isSolved(p,a.board)&&i<200;i++){
      const hint=nextHint(p,a);assert.equal(hint.type,'move',`${p.id}: ${hint.text}`);
      a=move(p,a,hint.action||hint.pair);assert.ok(a,`${p.id}: legal hint`);
    }
    assert.ok(isSolved(p,a.board),`${p.id}: checked solution`);
  }
  return {puzzles:puzzles.length,campaignPuzzles:campaign.length,gradeBands:3,mechanics:12,sources:sources.length,verifiedWitnessMoves:moves};
}
if(process.argv[1]===new URL(import.meta.url).pathname)console.log(JSON.stringify(await validateContent(),null,2));
