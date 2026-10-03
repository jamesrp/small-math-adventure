import{readFile,writeFile,mkdir}from'node:fs/promises';
const{puzzles,sources}=JSON.parse(await readFile(new URL('../dist/puzzles.json',import.meta.url),'utf8'));
let text=`# All ${puzzles.length} authored puzzles\n\nCanonical shipped content: \`dist/puzzles.json\`. Coordinates and allowed swap positions below are one-based. All core boards are solvable; every legal completion is accepted. Hints here describe the initial board. In-app actionable hints are computed from the current board.\n\n`;
for(const band of ['k1','23','45']){
 text+=`## Grades ${{k1:'K–1','23':'2–3','45':'4–5'}[band]}\n\n`;
 const list=puzzles.filter(p=>p.band===band).sort((a,b)=>a.number-b.number||(a.mechanic==='tile'?-1:1));
 for(const[i,p]of list.entries()){
  text+=`### ${i+1}. ${p.title}\n\nID: \`${p.id}\` · ${p.mechanic==='tile'?(p.tileShape==='l-tromino'?'L-tromino garden':'Domino garden'):'Cup swaps'}\n\n**Child instruction:** ${p.instruction}\n\n**Idea:** ${p.idea}\n\n`;
  if(p.mechanic==='tile'){
   text+='```text\n'+Array.from({length:p.rows},(_,r)=>Array.from({length:p.cols},(_,c)=>p.cells.includes(r*p.cols+c)?'□':'·').join(' ')).join('\n')+'\n```\n\n';
   text+=`Garden: ${p.cells.length} cells, ${p.cells.length/(p.tileShape==='l-tromino'?3:2)} ${p.tileShape==='l-tromino'?'L-trominoes':'dominoes'}. A witness (row,column coordinates grouped by piece): ${p.solution.map(pair=>pair.map(c=>`(${Math.floor(c/p.cols)+1},${c%p.cols+1})`).join('–')).join('; ')}.\n\n`;
  }else{text+=`Start: **${p.start.map(n=>String.fromCharCode(65+n)).join(' ')}** → home: **${p.target.map(n=>String.fromCharCode(65+n)).join(' ')}**.\n\nAllowed positions: ${p.edges.map(([a,b])=>`${a+1}↔${b+1}`).join(', ')}. Exact minimum: **${p.minimumMoves}**. One shortest route: ${p.solution.map(([a,b])=>`${a+1}↔${b+1}`).join(', ')}.\n\n`;}
  text+='**Starting-board hints**\n\n'+p.hints.map((h,i)=>`${i+1}. ${h}`).join('\n')+'\n\n';
  for(const[key,label]of [['notice','Notice'],['prompt','Ask together'],['explanation','Explanation'],['extension','Extension'],['connection','Mathematical connection']])text+=`**${label}:** ${p.parent[key]}\n\n`;
  text+='**Sources:** '+p.parent.sourceIds.map(id=>sources.find(s=>s.id===id)).map(s=>`[${s.title}](${s.url})`).join('; ')+'.\n\n';
 }
}
text+='## Ten expanded puzzle families\n\nEach puzzle collection is available from every grade trail, grouped by Easy, Medium, and Hard. See [the expansion specification](puzzle-expansion/README.md) for exact source lineage and mathematical checks. Difficulty labels are relative within each family and await family playtesting. All valid completions are accepted; witnesses are examples, not answer templates.\n\n';
for(const mechanic of [...new Set(puzzles.filter(p=>p.band==='all').map(p=>p.mechanic))]){
 const list=puzzles.filter(p=>p.mechanic===mechanic).sort((a,b)=>a.number-b.number);
 text+=`### ${list[0].familyTitle}\n\n`;
 for(const p of list){
  text+=`#### ${p.number}. ${p.title}\n\nID: \`${p.id}\`\n\n**Task:** ${p.instruction}\n\n**Readiness:** ${p.prerequisites}\n\n**Rules:**\n\n${p.rules.map(r=>'- '+r).join('\n')}\n\n**Starting data:**\n\n\`\`\`json\n${JSON.stringify(p.parameters,null,2)}\n\`\`\`\n\n**Hint:** ${p.hints[0]}\n\n**Insight:** ${p.idea}\n\n**Mathematics:** ${p.parent.explanation}\n\n**Checked witness:**\n\n\`\`\`json\n${JSON.stringify(p.solution,null,2)}\n\`\`\`\n\n`;
  if(p.provenance)text+=`**Adaptation:** ${p.provenance}\n\n`;
  text+='**Sources:** '+p.parent.sourceIds.map(id=>sources.find(s=>s.id===id)).map(s=>`[${s.title}](${s.url||s.path})`).join('; ')+'.\n\n';
 }
}
await mkdir(new URL('../docs/',import.meta.url),{recursive:true});await writeFile(new URL('../docs/PUZZLES.md',import.meta.url),text);console.log(`Wrote ${puzzles.length} review entries.`);
