import {esc, actionButton} from './expansion-controls.js';
const integer = value => (typeof value==='number'||typeof value==='string'&&/^\d+$/.test(value))&&Number.isInteger(Number(value)) ? Number(value) : NaN;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const edgeIndex = (q, a, b) => q.edges.findIndex(([u,v]) => (u===a&&v===b)||(u===b&&v===a));
export function routeInfo(p, board) {
  const q=p.parameters, uses=q.edges.map(()=>0); let cost=0;
  for(let i=1;i<board.path.length;i++){const edge=edgeIndex(q,board.path[i-1],board.path[i]);if(edge<0)return null;uses[edge]++;cost+=q.edges[edge][2];}
  return {uses,cost,current:board.path.at(-1),mask:uses.reduce((m,n,i)=>n?m|(1<<i):m,0)};
}
function validRoute(p,b){
  const q=p.parameters;
  if(!object(b)||!Array.isArray(b.path)||b.path.length>q.target_cost+1||!b.path.every(v=>q.vertices.includes(v)))return false;
  if(q.start && b.path[0]!==q.start)return false;
  const info=routeInfo(p,b);
  return !!info&&info.cost<=q.target_cost&&(q.mode!=='each_edge_once'||info.uses.every(n=>n<=1));
}
function solvedRoute(p,b){if(!validRoute(p,b))return false;const q=p.parameters,i=routeInfo(p,b);return i.uses.every(n=>n>0)&&i.cost===q.target_cost&&(!q.closed||i.current===b.path[0]);}
export function solveRoute(p,board){
  if(!validRoute(p,board))return null;
  const q=p.parameters,info=routeInfo(p,board),full=(1<<q.edges.length)-1;
  const starts=board.path.length?[info.current]:q.vertices;
  for(const start of starts){
    const failed=new Set(),home=board.path[0]||start;
    function search(at,mask,left){
      if(left===0)return mask===full&&(!q.closed||at===home)?[]:null;
      let needed=0;for(let i=0;i<q.edges.length;i++)if(!(mask&(1<<i)))needed+=q.edges[i][2];
      if(needed>left)return null;
      const key=`${at}|${mask}|${left}`;if(failed.has(key))return null;
      for(const [i,[u,v,w]]of q.edges.entries()){
        if((u!==at&&v!==at)||w>left||(q.mode==='each_edge_once'&&(mask&(1<<i))))continue;
        const next=u===at?v:u,rest=search(next,mask|(1<<i),left-w);
        if(rest)return [next,...rest];
      }
      failed.add(key);return null;
    }
    const rest=search(start,info.mask,q.target_cost-info.cost);
    if(rest)return board.path.length?rest:[start,...rest];
  }
  return null;
}
function moveRoute(p,b,action){
  if(!validRoute(p,b)||!object(action)||typeof action.vertex!=='string'||!p.parameters.vertices.includes(action.vertex)||solvedRoute(p,b))return null;
  const next={path:[...b.path,action.vertex]};return validRoute(p,next)?next:null;
}
function hintRoute(p,b){
  if(solvedRoute(p,b))return {type:'done'};
  const path=solveRoute(p,b);
  return path?.length?{type:'move',action:{vertex:path[0]},text:b.path.length?`Follow the road from ${b.path.at(-1)} to ${path[0]}. A complete route is still possible from there.`:`Start at ${path[0]}. This leaves a route that can visit every road.`,remaining:path.length}:{type:'deadend',text:'This route cannot finish within the rules. Undo to before a stranded road or an extra repeat, then choose another road.'};
}
function validColor(p,b){return object(b)&&Array.isArray(b.colors)&&b.colors.length===p.parameters.vertices.length&&b.colors.every(c=>Number.isInteger(c)&&c>=0&&c<=p.parameters.palette_size)&&Number.isInteger(b.selectedColor)&&b.selectedColor>=1&&b.selectedColor<=p.parameters.palette_size;}
const conflicts=(p,colors)=>p.parameters.edges.filter(([u,v])=>{const a=colors[p.parameters.vertices.indexOf(u)],b=colors[p.parameters.vertices.indexOf(v)];return a&&a===b;});
function solvedColor(p,b){return validColor(p,b)&&b.colors.every(Boolean)&&!conflicts(p,b.colors).length;}
export function solveColor(p,colors){
  const q=p.parameters,board=[...colors];if(conflicts(p,board).length)return null;
  const neighbors=q.vertices.map(v=>q.edges.filter(e=>e[0]===v||e[1]===v).map(([a,b])=>q.vertices.indexOf(a===v?b:a)));
  function search(){
    let cell=-1,choices;
    for(let i=0;i<board.length;i++)if(!board[i]){const options=Array.from({length:q.palette_size},(_,j)=>j+1).filter(c=>neighbors[i].every(n=>board[n]!==c));if(!options.length)return null;if(!choices||options.length<choices.length){cell=i;choices=options;}}
    if(cell<0)return [...board];
    for(const c of choices){board[cell]=c;const result=search();if(result)return result;}
    board[cell]=0;return null;
  }
  return search();
}
function moveColor(p,b,action){
  if(!validColor(p,b)||!object(action))return null;
  if(action.type==='palette'){const c=integer(action.color);return Number.isInteger(c)&&c>=1&&c<=p.parameters.palette_size?(c===b.selectedColor?b:{...b,selectedColor:c}):null;}
  const i=p.parameters.vertices.indexOf(action.vertex),color=action.color===undefined?b.selectedColor:integer(action.color);
  if(i<0||!Number.isInteger(color)||color<0||color>p.parameters.palette_size||b.colors[i]===color)return null;
  const colors=[...b.colors];colors[i]=color;return {...b,colors};
}
function hintColor(p,b){
  if(solvedColor(p,b))return {type:'done'};
  const completion=solveColor(p,b.colors);
  if(completion){const i=b.colors.indexOf(0);return {type:'move',action:{vertex:p.parameters.vertices[i],color:completion[i]},text:`Give ${p.parameters.vertices[i]} color ${completion[i]} (${marks[completion[i]-1]}). This choice fits a completion of your current picture.`};}
  // A locally legal partial coloring can still block the rest. Find one mark
  // whose removal restores a completion, without replacing a player's work.
  for(let i=0;i<b.colors.length;i++)if(b.colors[i]){const copy=[...b.colors];copy[i]=0;if(solveColor(p,copy))return {type:'move',action:{vertex:p.parameters.vertices[i],color:0},text:`Clear ${p.parameters.vertices[i]} and reconsider its neighbors. The other colors can still be finished.`};}
  const bad=conflicts(p,b.colors),i=bad.length?p.parameters.vertices.indexOf(bad[0][0]):b.colors.findLastIndex(Boolean);
  return {type:'move',action:{vertex:p.parameters.vertices[i],color:0},text:`Clear ${p.parameters.vertices[i]} to open up another possibility. Some earlier colors need to change.`};
}
const marks=['●','▲','■','◆'];
function positions(p){
  const q=p.parameters,ring=(names,r=39,phase=-Math.PI/2)=>Object.fromEntries(names.map((v,i)=>[v,[50+r*Math.cos(phase+i*2*Math.PI/names.length),50+r*Math.sin(phase+i*2*Math.PI/names.length)]]));
  if(q.positions)return q.positions;
  if(p.mechanic==='color'){
    if(p.id==='color-01')return Object.fromEntries(q.vertices.map((v,i)=>[v,[10+20*i,50]]));
    if(q.vertices.includes('H'))return {...ring(q.vertices.filter(v=>v!=='H')),H:[50,50]};
    if(q.vertices.includes('o0'))return {...ring(q.vertices.slice(0,5),42),...ring(q.vertices.slice(5),22)};
    return ring(q.vertices);
  }
  const layouts={
    'route-01':{A:[38,25],B:[78,25],C:[78,75],D:[38,75],E:[12,48]},
    'route-02':{A:[50,40],B:[88,40],C:[88,85],D:[50,85],E:[12,40],F:[30,10]},
    'route-03':{A:[12,18],B:[12,82],C:[39,50],D:[61,50],E:[88,18],F:[88,82]},
    'route-04':{S:[12,50],T:[88,50],A:[50,15],B:[50,50],C:[50,85]},
    'route-05':{A:[10,25],B:[37,25],C:[63,25],D:[90,25],a:[10,75],b:[37,75],c:[63,75],d:[90,75]},
    'route-06':{A:[50,10],B:[10,85],C:[90,85],D:[50,57]}
  };return layouts[p.id]||ring(q.vertices);
}
function graph(p,b){
  const q=p.parameters,xy=positions(p),info=p.mechanic==='route'?routeInfo(p,b):null;
  const lines=q.edges.map(([u,v,w],i)=>{const [x,y]=xy[u],[a,z]=xy[v],used=info?.uses[i]||0,conflict=p.mechanic==='color'&&b.colors[q.vertices.indexOf(u)]&&b.colors[q.vertices.indexOf(u)]===b.colors[q.vertices.indexOf(v)];return `<line x1="${x}" y1="${y}" x2="${a}" y2="${z}" class="${used?'road-used':''} ${conflict?'link-conflict':''}"/>${info?`<text x="${(x+a)/2}" y="${(y+z)/2-2}">${w}${used?` · ✓${used>1?used:''}`:''}</text>`:''}`;}).join('');
  const dots=q.vertices.map((v,i)=>{const [x,y]=xy[v],color=b.colors?.[i]||0,current=info?.current===v;const allowed=!info||!info.current||q.edges.some(([u,w],e)=>(u===info.current&&w===v||w===info.current&&u===v)&&(q.mode!=='each_edge_once'||!info.uses[e])&&info.cost+q.edges[e][2]<=q.target_cost);
    return actionButton(`${esc(v)}${p.mechanic==='color'?`<span aria-hidden="true">${color?marks[color-1]:'○'}</span>`:current?'<span aria-hidden="true">✦</span>':''}`,{vertex:v},`style="left:${x}%;top:${y}%" aria-label="${esc(info?`${current?'Current junction. ':''}${info.current?`Travel to ${v}`:`Start at ${v}`}`:`Lantern ${v}, ${color?`color ${color}, ${marks[color-1]}`:'uncolored'}. Apply selected color ${b.selectedColor}`)}" ${!allowed||info&&solvedRoute(p,b)?'disabled':''} data-node="${esc(v)}" data-color="${color}" ${current?'aria-current="location"':''}`);
  }).join('');
  return `<div class="network-graph ${p.id}" role="group" aria-label="${p.mechanic==='route'?'Road map':'Linked lanterns'}"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${dots}</div>`;
}
function renderRoute(p,a){
  const b=a.board,q=p.parameters,info=routeInfo(p,b);
  return `${graph(p,b)}${q.mode==='each_edge_once'?'':`<p class="network-score">Distance ${info.cost}</p>`}<p class="sr-only" role="status">${b.path.map(esc).join(' → ')}</p>`;
}
function routeHelp(p,a){
  const b=a.board,q=p.parameters,info=routeInfo(p,b);
  return `<details><summary>Roads</summary>${b.path.length?`<p>${b.path.map(esc).join(' → ')}</p>`:''}<ul>${q.edges.map(([u,v,w],i)=>`<li>${esc(u)}–${esc(v)}: length ${w}, visited ${info.uses[i]} ${info.uses[i]===1?'time':'times'}</li>`).join('')}</ul></details>`;
}
function renderColor(p,a){
  const b=a.board,bad=conflicts(p,b.colors);
  return `<div class="color-palette" role="group" aria-label="Choose a color">${Array.from({length:p.parameters.palette_size},(_,i)=>actionButton(`${marks[i]} ${i+1}`,{type:'palette',color:i+1},`data-color="${i+1}" aria-label="Select color ${i+1}, ${marks[i]}" aria-pressed="${b.selectedColor===i+1}"`)).join('')}</div>${graph(p,b)}<p class="sr-only" role="status">${bad.length?`Matching neighbors: ${bad.map(([u,v])=>`${esc(u)}–${esc(v)}`).join(', ')}`:''}</p>`;
}
function colorHelp(p){
  return `<details><summary>Links</summary><p>${p.parameters.edges.map(([u,v])=>`${esc(u)}–${esc(v)}`).join(', ')}</p></details>`;
}
export const networkMechanics={
  route:{fresh:p=>({path:p.parameters.start?[p.parameters.start]:[]}),valid:validRoute,solved:solvedRoute,move:moveRoute,hint:hintRoute,render:renderRoute,help:routeHelp,demo:'Tap a labeled dot to travel along a road. The visited roads change appearance. Undo takes you back one junction. Watch the distance target when repeated trips are allowed.'},
  color:{fresh:p=>({colors:p.parameters.vertices.map(()=>0),selectedColor:1}),valid:validColor,solved:solvedColor,move:moveColor,hint:hintColor,render:renderColor,help:colorHelp,demo:'Choose a color or shape, then tap a lantern. Give every lantern a color. Check every link: its ends must be different. Recolor freely or use Undo.'}
};
