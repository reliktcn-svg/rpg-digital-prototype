const CACHE='rpg-digital-v0694collection';
const ASSETS=['./arcana/dice-packs.js?v=0694collection','./arcana/dice-motion.js?v=0694collection','./arcana/dice-skins.js?v=0694collection','./arcana/dice-settings.js?v=0694collection','./arcana/dice-settings.css?v=0694collection','./','./index.html','./map.html','./map-viewer.css','./map-viewer.js','./styles.css?v=0694collection','./location-ui.css?v=0694collection','./battle-result-ui.css?v=0694collection','./tabletop-enhancements.css?v=0694collection','./ui-fixes-v078.css?v=0694collection','./ui-fixes-v079.css?v=0694collection','./battle-tabletop-v080.css?v=0694collection','./battle-tabletop-v081.css?v=0694collection','./battle-tabletop-v082.css?v=0694collection','./battle-tabletop-v083.css?v=0694collection','./battle-tabletop-v084.css?v=0694collection','./battle-tabletop-v085.css?v=0694collection','./battle-tabletop-v086.css?v=0694collection','./tabletop-enhancements.js?v=0694collection','./app.js?v=0694collection','./network-lobby.js?v=0694collection','./map-data.js?v=0694collection','./location-placement.js?v=0694collection','./cards-data.js?v=0694collection','./arcana/dice-renderer.js?v=0694collection','./arcana/dice-animator.js?v=0694collection','./assets/map.png','./assets/map-visual-v0691.png','./assets/locations/kingdom-merchant.webp','./assets/locations/cursed-merchant.webp','./assets/locations/kingdom-tavern.webp','./assets/locations/cursed-tavern.webp','./assets/locations/kingdom-shrine.webp','./assets/locations/cursed-shrine.webp','./assets/locations/kingdom-portal.webp','./assets/locations/cursed-portal.webp','./assets/heroes/warrior.webp','./assets/heroes/dwarf.webp','./assets/heroes/mage.webp','./assets/heroes/archer.webp','./assets/heroes/rogue.webp','./assets/results/warrior-victory.webp','./assets/results/warrior-defeat.webp','./assets/results/dwarf-victory.webp','./assets/results/dwarf-defeat.webp','./assets/results/mage-victory.webp','./assets/results/mage-defeat.webp','./assets/results/archer-victory.webp','./assets/results/archer-defeat.webp','./assets/results/rogue-victory.webp','./assets/results/rogue-defeat.webp','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  const critical=event.request.mode==='navigate'||/\.(?:js|css|html)$/.test(url.pathname);
  event.respondWith(fetch(event.request,critical?{cache:'no-store'}:{}).then(resp=>{
    if(resp.ok){const copy=resp.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))}return resp;
  }).catch(async()=>{
    const exact=await caches.match(event.request);if(exact)return exact;
    if(event.request.mode==='navigate')return caches.match('./index.html');
    return Response.error();
  }));
});
