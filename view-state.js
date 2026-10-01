// Presentation state belongs to a browser-history entry, not to an explorer's
// saved puzzle attempts. Stable data-view-key attributes opt disclosures and
// filters in without relying on their position or visible text.
const STATE_KEY='mathAdventureView';
export function createViewState(root){
  let active,scrollTimer;
  const entries=new Map();
  history.scrollRestoration='manual';
  const current=()=>active&&history.state?.[STATE_KEY]?.id===active.id&&location.hash===active.hash;
  function persist(){
    if(current()&&JSON.stringify(history.state[STATE_KEY])!==JSON.stringify(active))history.replaceState({...history.state,[STATE_KEY]:active},'');
  }
  function capture(){
    if(!active)return;
    for(const node of root.querySelectorAll('details[data-view-key]'))active.details[node.dataset.viewKey]=node.open;
    for(const node of root.querySelectorAll('select[data-view-key]'))active.values[node.dataset.viewKey]=node.value;
    active.scroll=[window.scrollX,window.scrollY];
  }
  function save(){capture();persist();}
  root.addEventListener('toggle',event=>{
    // toggle is queued, does not bubble, and can arrive after a DOM replacement.
    if(current()&&root.contains(event.target))save();
  },true);
  root.addEventListener('change',()=>{if(current())save();});
  window.addEventListener('scroll',()=>{
    if(!current())return;
    active.scroll=[window.scrollX,window.scrollY];
    clearTimeout(scrollTimer);
    // Avoid history API rate limits during a long touch scroll. The in-memory
    // entry is current immediately, even if Back arrives before this flush.
    scrollTimer=setTimeout(persist,150);
  },{passive:true});
  window.addEventListener('pagehide',save);
  return {
    save,
    isCurrent:current,
    beforeRender(key){
      clearTimeout(scrollTimer);
      capture();
      const stored=history.state?.[STATE_KEY];
      const entry=entries.get(stored?.id)||stored;
      active=entry?.key===key?entry:{id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,key,hash:location.hash,details:{},values:{},scroll:[0,0]};
      entries.set(active.id,active);
      return active;
    },
    restore(){
      for(const node of root.querySelectorAll('details[data-view-key]')){
        const open=active.details[node.dataset.viewKey];
        if(typeof open==='boolean')node.open=open;
      }
      window.scrollTo(...active.scroll);
      capture();
      history.replaceState({...history.state,[STATE_KEY]:active},'');
    },
  };
}
