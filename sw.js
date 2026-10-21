const CACHE='rpg-digital-v0700locations3';
const ASSETS=['./card-art.js?v=0700locations3','./tabletop.css?v=0700locations3','./tabletop.js?v=0700locations3','./','./index.html','./styles.css?v=0700locations3','./app.js?v=0700locations3','./network-lobby.js?v=0700locations3','./map-data.js?v=0700locations3','./location-placement.js?v=0700locations3','./cards-data.js?v=0700locations3','./arcana/dice-renderer.js?v=0700locations3','./arcana/dice-animator.js?v=0700locations3','./assets/map.png','./assets/map-visual-v0654.png','./assets/heroes/warrior.webp','./assets/heroes/dwarf.webp','./assets/heroes/mage.webp','./assets/heroes/archer.webp','./assets/heroes/rogue.webp','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  const critical=event.request.mode==='navigate'||/\.(?:js|css|html)$/.test(url.pathname);
  event.respondWith(fetch(event.request,critical?{cache:'no-store'}:{}).then(resp=>{
    if(resp.ok){const copy=resp.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))}return resp;
  }).catch(async()=>{
    const exact=await caches.match(event.request);if(exact)return exact;
    if(event.request.mode==='navigate')return caches.match('./index.html');
    return Response.error();
  }));
});
