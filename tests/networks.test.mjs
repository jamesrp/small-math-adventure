import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {networkMechanics,solveRoute,solveColor,routeInfo} from '../dist/networks.js';
const doc=JSON.parse(await readFile(new URL('../docs/puzzle-expansion/networks.json',import.meta.url),'utf8'));
const puzzles=doc.families.flatMap(f=>f.instances.map(p=>({...p,mechanic:f.id})));
const get=id=>puzzles.find(p=>p.id===id);
test('every network witness satisfies the runtime rules; route reversals and color permutations also win',()=>{
  for(const p of puzzles){const h=networkMechanics[p.mechanic];let b=h.fresh(p);assert.ok(h.valid(p,b));assert.ok(!h.solved(p,b));
    if(p.mechanic==='route'){
      for(const vertex of p.solution.route.slice(p.parameters.start?1:0)){b=h.move(p,b,{vertex});assert.ok(b,p.id);}
      assert.ok(h.solved(p,b));assert.equal(routeInfo(p,b).cost,p.parameters.target_cost);
      const path=[...p.solution.route].reverse();if(!p.parameters.start||path[0]===p.parameters.start)assert.ok(h.solved(p,{path}));
    }else{
      b.colors=p.parameters.vertices.map(v=>p.solution.colors[v]);assert.ok(h.solved(p,b),p.id);
      b.colors=b.colors.map(c=>c%p.parameters.palette_size+1);assert.ok(h.solved(p,b),'colors are interchangeable');
    }
  }
});
test('route solver repairs from the current route and rejects the early bridge trap',()=>{
  for(const p of puzzles.filter(p=>p.mechanic==='route')){const h=networkMechanics.route;let b=h.fresh(p);for(let step=0;!h.solved(p,b)&&step<30;step++){const hint=h.hint(p,b);assert.equal(hint.type,'move',p.id);b=h.move(p,b,hint.action);assert.ok(b);}assert.ok(h.solved(p,b));}
  const p=get('route-03'),h=networkMechanics.route,b=h.move(p,h.fresh(p),{vertex:'D'});assert.ok(b,'bridge is a legal wrong turn');assert.equal(solveRoute(p,b),null);assert.equal(h.hint(p,b).type,'deadend');
});
test('routes reject teleporting, extra repeats, over-budget travel, invalid starts and forged saves',()=>{
  const p=get('route-02'),h=networkMechanics.route,b=h.fresh(p),saved=JSON.stringify(b);
  assert.equal(h.move(p,b,{vertex:'F'}),null);assert.equal(JSON.stringify(b),saved);
  assert.equal(h.valid(p,{path:['A']}),false);assert.equal(h.valid(p,{path:['B','A','B']}),false);
  for(const invalid of [null,[],{}, {path:'ABC'},{path:[null]},{path:['B','C','F']}])assert.equal(h.valid(p,invalid),false);
  const q=get('route-06');assert.equal(h.valid(q,{path:['A','C','D','C','D','A']}),false);
  assert.ok(h.move(q,{path:['A','C']},{vertex:'A'}),'repeats allowed for route inspection');
});
test('hints preserve extendable colors and repair legal dead ends without forcing a witness',()=>{
  for(const p of puzzles.filter(p=>p.mechanic==='color')){const h=networkMechanics.color;let b=h.fresh(p);b.colors[0]=p.parameters.palette_size;
    for(let steps=0;!h.solved(p,b)&&steps<60;steps++){const hint=h.hint(p,b);assert.equal(hint.type,'move');b=h.move(p,b,hint.action);assert.ok(b);}assert.ok(h.solved(p,b),p.id);assert.equal(b.colors[0],p.parameters.palette_size);}
  const p=get('color-03'),h=networkMechanics.color,b={colors:[1,2,1,3,0],selectedColor:1};assert.ok(h.valid(p,b));assert.equal(solveColor(p,b.colors),null);const hint=h.hint(p,b);assert.equal(hint.action.color,0);assert.ok(solveColor(p,h.move(p,b,hint.action).colors));
});
test('conflicts stay editable but cannot complete; all malformed colors are rejected',()=>{
  const p=get('color-01'),h=networkMechanics.color,b={colors:[1,1,1,1,1],selectedColor:1};assert.ok(h.valid(p,b));assert.equal(h.solved(p,b),false);assert.equal(h.hint(p,b).type,'move');
  for(const invalid of [null,[],{}, {colors:[1,2],selectedColor:1},{colors:[1,2,3,1,2],selectedColor:1},{colors:[1,2,1,2,1],selectedColor:9}])assert.equal(h.valid(p,invalid),false);
  assert.equal(h.move(p,b,{vertex:'missing',color:1}),null);assert.equal(h.move(p,b,{vertex:'A',color:8}),null);
});
