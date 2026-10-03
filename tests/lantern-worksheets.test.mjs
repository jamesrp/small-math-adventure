import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {motionMechanics} from '../dist/motion.js';
import {freshAttempt,move,undoToSolvable,nextHint} from '../dist/engine.js';
const pack=JSON.parse(readFileSync(new URL('../dist/puzzles.json',import.meta.url)));
const puzzles=pack.puzzles.filter(p=>p.worksheet);
const h=motionMechanics.toggle;
const bits=(p,on)=>on.reduce((mask,v)=>mask|1<<p.parameters.vertices.indexOf(v),0);

test('30 worksheet targets cover the intended graphs, with only the five source minima required',()=>{
  assert.deepEqual(puzzles.map(p=>p.id),Array.from({length:30},(_,i)=>`toggle-${i+13}`));
  assert.deepEqual([...new Set(puzzles.map(p=>p.worksheet.graph))].sort(), ['square','ring5','ring6','ring7','ring8','tree8','grid9','islands8','path6','triangle_pair','triangle_bridge','two_squares','two_trees','star5','tree6','star7'].sort());
  assert.deepEqual(puzzles.filter(p=>p.parameters.press_budget!=null).map(p=>[p.worksheet.case,p.parameters.press_budget]),[['A',2],['B',4],['C',3],['D',5],['E',4]]);
  for(const p of puzzles){
    assert.equal(p.revision,1);assert.ok(p.provenance.includes(`Problem ${p.worksheet.problem}`));
    assert.equal(p.parent.sourceIds.length,1);
    assert.ok(pack.sources.find(s=>s.id===p.parent.sourceIds[0]).path.endsWith('.pdf'));
    const {vertices,edges,positions}=p.parameters;
    assert.equal(positions.length,vertices.length);
    assert.equal(new Set(edges.map(e=>[...e].sort().join('-'))).size,edges.length);
    for(const xy of positions){assert.equal(xy.length,2);assert.ok(xy.every(Number.isFinite));assert.ok(xy[0]>=35&&xy[0]<=325&&xy[1]>=35&&xy[1]<=245);}
    const html=h.render(p,freshAttempt(p));
    assert.equal((html.match(/class="wire-hit"/g)||[]).length,edges.length);
    for(const [i,[x,y]]of positions.entries())assert.ok(html.includes(`<circle cx="${x}" cy="${y}" r="21"`),`${p.id}: worksheet lamp ${vertices[i]}`);
  }
});

test('independent edge-subset enumeration verifies every worksheet minimum and accepts all solutions',()=>{
  for(const p of puzzles){
    const {vertices,edges,initial_on,target_on,press_budget}=p.parameters;
    const initial=bits(p,initial_on),goal=bits(p,target_on),masks=edges.map(e=>bits(p,e));
    let minimum=Infinity,solutions=0;
    for(let subset=0;subset<2**edges.length;subset++){
      const presses=[];let state=initial;
      for(let i=0;i<edges.length;i++)if(subset>>i&1){presses.push(i);state^=masks[i];}
      const on=vertices.filter((_,i)=>state>>i&1),matches=state===goal;
      if(matches){minimum=Math.min(minimum,presses.length);solutions++;}
      assert.equal(h.solved(p,{on,presses}),matches&&(press_budget==null||presses.length<=press_budget),`${p.id}: edge subset ${subset}`);
    }
    assert.equal(minimum,p.solution.minimum_presses,p.id);
    if(press_budget!=null)assert.equal(minimum,press_budget,p.id);
    if(['tree8','path6','two_trees','tree6','star7','star5'].includes(p.worksheet.graph))assert.equal(solutions,1,p.id);
    if(p.worksheet.graph.startsWith('ring')||p.worksheet.graph==='square')assert.equal(solutions,2,p.id);
  }
});

test('worksheet hints recover from experiments and from exhausted minimum budgets',()=>{
  for(const p of puzzles){
    for(let edge=0;edge<p.parameters.edges.length;edge++){
      let a=move(p,freshAttempt(p),{edge});
      a=move(p,a,{edge}); // same wire twice restores the picture, but uses two presses
      assert.ok(a,p.id);
      if(p.parameters.press_budget!=null){assert.equal(nextHint(p,a).type,'deadend');a=undoToSolvable(p,a);}
      for(let i=0;!h.solved(p,a.board)&&i<20;i++){
        const hint=nextHint(p,a);assert.equal(hint.type,'move',p.id);a=move(p,a,hint.action);assert.ok(a);
      }
      assert.ok(h.solved(p,a.board),p.id);
    }
  }
});
