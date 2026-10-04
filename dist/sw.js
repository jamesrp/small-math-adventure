const CACHE='small-math-adventure-shell-f6da1556edce90c2';
const ASSETS=["./","./art-slots.js","./art.js","./art/manifest.json","./assets/story/cable-escape.jpg","./assets/story/citadel-night.jpg","./assets/story/dawn-home.jpg","./assets/story/decoy-corridor.jpg","./assets/story/escape-counterweight.jpg","./assets/story/fern-door.jpg","./assets/story/fern-signal.jpg","./assets/story/harbor-boarding.jpg","./assets/story/lift-powered.jpg","./assets/story/lift-rising.jpg","./assets/story/lift-sealed.jpg","./assets/story/pump-broken.jpg","./assets/story/pump-ready.jpg","./assets/story/reunion-alarm.jpg","./assets/story/roof-entry.jpg","./assets/story/water-entry.jpg","./assets/story/water-escape.jpg","./assets/story/workshop-door.jpg","./boards.css","./caravan-art.js","./caravan-integration.css","./caravan-legacy.js","./caravan-rescue.js","./caravan-road3.js","./caravan-ui.js","./caravan.css","./clock-geometry.js","./clock-playback.js","./deduction.css","./deduction.js","./engine.js","./expansion-controls.js","./expansion.css","./expansion.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/lantern.svg","./index.html","./main.js","./manifest.webmanifest","./measurement.css","./measurement.js","./motion.css","./motion.js","./networks.css","./networks.js","./play.css","./proofs.css","./proofs.js","./proofs.json","./puzzle-copy.js","./puzzles.json","./rescue-art.js","./road-cast.js","./road-placeholders.js","./road-ui.js","./road.css","./road.js","./storage.js","./style.css","./tile-controls.js","./ui.js","./view-state.js"];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // addAll is atomic: a missing asset fails installation, never claiming readiness.
  await cache.addAll(ASSETS);
  // Updated workers wait for existing tabs to close; never replace a live puzzle.
})()));
// Art videos are kept in their own cache once played, so a clip seen online
// also plays offline. Video and audio elements ask for byte ranges; Safari
// needs 206 answers, which are cut from the cached file (voice files are
// precached with the app; videos are cached on first play).
const ART_CACHE=CACHE.replace('-shell-','-art-');
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if((name.startsWith('small-math-adventure-shell-')&&name!==CACHE)||(name.startsWith('small-math-adventure-art-')&&name!==ART_CACHE))await caches.delete(name);
  await self.clients.claim();
})()));
async function artMedia(request){
  const url=new URL(request.url),key=url.origin+url.pathname,cache=await caches.open(ART_CACHE);
  let full=await caches.match(key);
  if(!full){
    try{const response=await fetch(key);if(response.status!==200)return response;await cache.put(key,response.clone());full=response;}
    catch{return fetch(request);}
  }
  const range=/^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range')||'');
  if(!range)return full;
  const body=await full.arrayBuffer(),size=body.byteLength;
  let start=range[1]===''?Math.max(0,size-Number(range[2])):Number(range[1]),end=range[1]!==''&&range[2]!==''?Math.min(Number(range[2]),size-1):size-1;
  if(start>=size||start>end)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  return new Response(body.slice(start,end+1),{status:206,headers:{'Content-Type':full.headers.get('Content-Type')||'video/mp4','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
}
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(/\/art\/.+\.(mp4|webm|mov|mp3|m4a)$/i.test(url.pathname)){event.respondWith(artMedia(event.request));return;}
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    if(event.request.mode==='navigate')return (await cache.match('./index.html'))||fetch(event.request);
    return fetch(event.request);
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='CHECK_READY')event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);const entries=await Promise.all(ASSETS.map(asset=>cache.match(asset)));
    event.ports[0]?.postMessage({ready:entries.every(Boolean),version:CACHE});
  })());
});
