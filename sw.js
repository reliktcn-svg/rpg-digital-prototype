/* v0.6.105: lean, failure-tolerant app shell; large images cache on demand. */
const CACHE='rpg-digital-v06105offline1';
const ASSETS=["./hero-abilities.js?v=06105offline1","./assets/ability-icons/regeneration-1.png","./assets/ability-icons/regeneration-2.png","./assets/ability-icons/regeneration-3.png","./assets/ability-icons/archer-1.png","./assets/ability-icons/archer-2.png","./assets/ability-icons/archer-3.png","./assets/ability-icons/archer-4.png","./assets/ability-icons/archer-5.png","./assets/ability-icons/dwarf-1.png","./assets/ability-icons/dwarf-2.png","./assets/ability-icons/dwarf-3.png","./assets/ability-icons/dwarf-4.png","./assets/ability-icons/dwarf-5.png","./assets/ability-icons/mage-1.png","./assets/ability-icons/mage-2.png","./assets/ability-icons/mage-3.png","./assets/ability-icons/mage-4.png","./assets/ability-icons/mage-5.png","./assets/ability-icons/natural20-1.png","./assets/ability-icons/natural20-2.png","./assets/ability-icons/natural20-3.png","./assets/ability-icons/natural20-4.png","./assets/ability-icons/natural20-5.png","./assets/ability-icons/paladin-1.png","./assets/ability-icons/paladin-2.png","./assets/ability-icons/paladin-3.png","./assets/ability-icons/paladin-4.png","./assets/ability-icons/paladin-5.png","./assets/ability-icons/resistance-bleeding-1.png","./assets/ability-icons/resistance-bleeding-2.png","./assets/ability-icons/resistance-bleeding-3.png","./assets/ability-icons/resistance-burning-1.png","./assets/ability-icons/resistance-burning-2.png","./assets/ability-icons/resistance-burning-3.png","./assets/ability-icons/resistance-poison-1.png","./assets/ability-icons/resistance-poison-2.png","./assets/ability-icons/resistance-poison-3.png","./assets/ability-icons/resistance-stun-1.png","./assets/ability-icons/resistance-stun-2.png","./assets/ability-icons/resistance-stun-3.png","./assets/ability-icons/rogue-1.png","./assets/ability-icons/rogue-2.png","./assets/ability-icons/rogue-3.png","./assets/ability-icons/rogue-4.png","./assets/ability-icons/rogue-5.png","./assets/ability-icons/warrior-1.png","./assets/ability-icons/warrior-2.png","./assets/ability-icons/warrior-3.png","./assets/ability-icons/warrior-4.png","./assets/ability-icons/warrior-5.png","./assets/heroes/paladin.webp","./hero-progression.js?v=06105offline1","./hero-progression-ui.js?v=06105offline1","./hero-progression.css?v=06105offline1","./arcana/dice-packs.js?v=06105offline1","./arcana/dice-motion.js?v=06105offline1","./arcana/dice-skins.js?v=06105offline1","./arcana/dice-settings.js?v=06105offline1","./arcana/dice-settings.css?v=06105offline1","./","./index.html","./map.html","./map-viewer.css","./map-viewer.js","./styles.css?v=06105offline1","./location-ui.css?v=06105offline1","./battle-result-ui.css?v=06105offline1","./tabletop-enhancements.css?v=06105offline1","./ui-fixes-v078.css?v=06105offline1","./ui-fixes-v079.css?v=06105offline1","./battle-tabletop-v080.css?v=06105offline1","./battle-tabletop-v081.css?v=06105offline1","./battle-tabletop-v082.css?v=06105offline1","./battle-tabletop-v083.css?v=06105offline1","./battle-tabletop-v084.css?v=06105offline1","./battle-tabletop-v085.css?v=06105offline1","./battle-tabletop-v086.css?v=06105offline1","./tabletop-enhancements.js?v=06105offline1","./app.js?v=06105offline1","./network-lobby.js?v=06105offline1","./map-data.js?v=06105offline1","./location-placement.js?v=06105offline1","./cards-data.js?v=06105offline1","./arcana/dice-renderer.js?v=06105offline1","./arcana/dice-animator.js?v=06105offline1","./assets/heroes/warrior.webp","./assets/heroes/dwarf.webp","./assets/heroes/mage.webp","./assets/heroes/archer.webp","./assets/heroes/rogue.webp","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // Limit concurrent requests: one failed image/script must not prevent the
  // new service worker from being installed, even on a weak connection.
  let pos=0;
  async function worker(){while(pos<ASSETS.length){const url=ASSETS[pos++];try{await cache.add(url)}catch(e){/* runtime fetch can retry */}}}
  await Promise.all([worker(),worker(),worker()]);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('rpg-digital-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  event.respondWith((async()=>{
    try{
      // Network-first keeps releases fresh; use cached files when offline.
      const response=await fetch(event.request);
      if(response.ok){
        const clone=response.clone();
        event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,clone)).catch(()=>{}));
        return response;
      }
      const cached=await caches.match(event.request);
      return cached||response;
    }catch(e){
      const cached=await caches.match(event.request);
      if(cached)return cached;
      if(event.request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();
      return Response.error();
    }
  })());
});
