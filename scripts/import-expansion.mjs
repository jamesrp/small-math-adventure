// Deliberate adapter from the checked authoring specification to the shipped pack.
// Original puzzle IDs/revisions and contentVersion remain compatible: this is an
// additive catalog. Legacy Nim answers migrate explicitly in storage.js.
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
export async function importExpansion(){
  const pack=JSON.parse(await readFile(new URL('dist/puzzles.json',root),'utf8'));
  pack.puzzles=pack.puzzles.filter(p=>p.mechanic==='tile'||p.mechanic==='swap');
  pack.sources=pack.sources.filter(s=>!s.id.startsWith('expansion-'));
  const names={toggle:'Lantern Wires',clock:'Clockwork Gates',billiard:'Mirror Couriers',route:'Bridge Courier',latin:'Symbol Orchard',code:'Signal Lanterns',nim:'Pebble Duel',color:'Neighbor Lanterns',jug:'Spring-water Jugs',weigh:'Odd-pebble Balance'};
  const families=[];
  for(const file of ['motion','networks','deduction','measurement']){
    const doc=JSON.parse(await readFile(new URL(`docs/puzzle-expansion/${file}.json`,root),'utf8'));
    for(const f of doc.families){
      const refs=new Map();
      const sourceIds=f.sources.map((s,i)=>{
        const id=`expansion-${f.id}-${i+1}`;if(s.id)refs.set(s.id,id);
        pack.sources.push({id,title:s.title||`${s.path?.split('/').at(-1)||f.title} — ${s.section||'Source notes'}`,kind:s.path?'local curriculum':'mathematics',...(s.url?{url:s.url}:{}),...(s.path?{path:s.path}:{}),section:s.section||'',contribution:s.contribution||s.use||''});return id;
      });
      const rules=Array.isArray(f.rules)?f.rules:[f.rules];
      families.push({id:f.id,title:names[f.id],rules,mathematics:f.mathematics,prerequisites:f.prerequisites||f.instances[0].prerequisites||f.instances[0].readiness,sourceIds});
      for(const [i,p]of f.instances.entries())pack.puzzles.push({
        ...p,band:'all',mechanic:f.id,familyTitle:names[f.id],number:i+1,revision:1,
        instruction:p.prompt,idea:p.insight,rules,controls:f.child_prompt||rules[0],
        prerequisites:p.prerequisites||p.readiness||f.prerequisites,
        hints:[p.hint,'Look at what your latest move changed. You can undo and try another choice.','Ask for one next move from this position.'],
        parent:{notice:p.insight,prompt:p.insight,explanation:f.mathematics,extension:f.natural_variation||p.difficulty||p.difficulty_step||p.insight,connection:p.difficulty_step||p.difficulty||p.difficulty_reasoning||p.insight,sourceIds:p.source_refs?p.source_refs.map(id=>refs.get(id)).filter(Boolean):sourceIds},
        sourceDocument:`docs/puzzle-expansion/${file}.md`
      });
    }
  }
  const order=['toggle','clock','billiard','route','latin','code','nim','color','jug','weigh'];
  pack.families=families.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));pack.expansionVersion=2;
  await writeFile(new URL('dist/puzzles.json',root),JSON.stringify(pack,null,2)+'\n');
  return pack;
}
if(process.argv[1]===new URL(import.meta.url).pathname){const pack=await importExpansion();console.log(`Shipped ${pack.puzzles.length} puzzles, including ${pack.families.length} additional families.`);}
