const CACHE='rpg-digital-v0681ui';
const ASSETS=['./','./index.html','./styles.css?v=0681ui','./location-ui.css?v=0681ui','./battle-result-ui.css?v=0681ui','./tabletop-enhancements.css?v=0681ui','./ui-fixes-v078.css?v=0681ui','./ui-fixes-v079.css?v=0681ui','./battle-tabletop-v080.css?v=0681ui','./battle-tabletop-v081.css?v=0681ui','./tabletop-enhancements.js?v=0681ui','./app.js?v=0681ui','./network-lobby.js?v=0681ui','./map-data.js?v=0681ui','./location-placement.js?v=0681ui','./cards-data.js?v=0681ui','./arcana/dice-renderer.js?v=0681ui','./arcana/dice-animator.js?v=0681ui','./assets/map.png','./assets/map-visual-v0654.png','./assets/locations/kingdom-merchant.webp','./assets/locations/cursed-merchant.webp','./assets/locations/kingdom-tavern.webp','./assets/locations/cursed-tavern.webp','./assets/locations/kingdom-shrine.webp','./assets/locations/cursed-shrine.webp','./assets/locations/kingdom-portal.webp','./assets/locations/cursed-portal.webp','./assets/heroes/warrior.webp','./assets/heroes/dwarf.webp','./assets/heroes/mage.webp','./assets/heroes/archer.webp','./assets/heroes/rogue.webp','./assets/results/warrior-victory.webp','./assets/results/warrior-defeat.webp','./assets/results/dwarf-victory.webp','./assets/results/dwarf-defeat.webp','./assets/results/mage-victory.webp','./assets/results/mage-defeat.webp','./assets/results/archer-victory.webp','./assets/results/archer-defeat.webp','./assets/results/rogue-victory.webp','./assets/results/rogue-defeat.webp','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
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
