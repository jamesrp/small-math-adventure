const CACHE='small-math-adventure-shell-de464b2f03a46b5f';
const ASSETS=["./","./assets/story/cable-escape.jpg","./assets/story/citadel-night.jpg","./assets/story/dawn-home.jpg","./assets/story/decoy-corridor.jpg","./assets/story/escape-counterweight.jpg","./assets/story/fern-door.jpg","./assets/story/fern-signal.jpg","./assets/story/harbor-boarding.jpg","./assets/story/lift-powered.jpg","./assets/story/lift-rising.jpg","./assets/story/lift-sealed.jpg","./assets/story/pump-broken.jpg","./assets/story/pump-ready.jpg","./assets/story/reunion-alarm.jpg","./assets/story/roof-entry.jpg","./assets/story/water-entry.jpg","./assets/story/water-escape.jpg","./assets/story/workshop-door.jpg","./caravan-art.js","./caravan-integration.css","./caravan-legacy.js","./caravan-ui.js","./caravan.css","./caravan.js","./deduction.css","./deduction.js","./engine.js","./expansion-controls.js","./expansion.css","./expansion.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/lantern.svg","./index.html","./main.js","./manifest.webmanifest","./measurement.css","./measurement.js","./motion.css","./motion.js","./networks.css","./networks.js","./play.css","./puzzle-copy.js","./puzzles.json","./rescue-art.js","./storage.js","./style.css","./ui.js"];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // addAll is atomic: a missing asset fails installation, never claiming readiness.
  await cache.addAll(ASSETS);
  // Updated workers wait for existing tabs to close; never replace a live puzzle.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('small-math-adventure-shell-')&&name!==CACHE)await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
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
