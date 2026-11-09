/* Smart Cache: immutable verified blobs + atomic manifest pointer, no game API cache. */
const META='rpg-smart-meta-v1',BLOBS='rpg-smart-blobs-v1',MAX_BYTES=192*1024*1024,MAX_FILES=800;
const base=self.registration.scope,metaURL=k=>new URL('__rpg_meta__/'+k,base).href,blobURL=h=>new URL('__rpg_blob__/'+h,base).href;
let job=null,preloadJob=null,memory=new Map(),stats={instance:Date.now()+":"+Math.random(),network:[],cache:[],errors:[],lastCheck:null,preload:{done:0,total:0,state:'idle'}};
async function get(k){const c=await caches.open(META),r=await c.match(metaURL(k));return r?await r.json():null}
async function put(k,v){const c=await caches.open(META);await c.put(metaURL(k),new Response(JSON.stringify(v),{headers:{'Content-Type':'application/json'}}))}
async function manifest(id){if(!id)return null;if(!memory.has(id))memory.set(id,await get('manifest/'+id));return memory.get(id)}
function note(kind,path){stats[kind].push(path);if(stats[kind].length>80)stats[kind].shift()}
function valid(m){return m&&m.schema===1&&/^[a-f0-9]{64}$/.test(m.id)&&Array.isArray(m.files)&&m.files.every(f=>typeof f.path==='string'&&!f.path.startsWith('/')&&!f.path.includes('..')&&!f.path.includes(':')&&/^[a-f0-9]{64}$/.test(f.hash)&&Number.isSafeInteger(f.size)&&f.size>=0)&&new Set(m.files.map(f=>f.path)).size===m.files.length}
async function digest(buffer){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function fetchFile(f){
 const r=await fetch(new URL(f.path,base),{cache:'no-cache'});if(!r.ok)throw Error('Не удалось загрузить '+f.path+' (HTTP '+r.status+')');
 const bytes=await r.arrayBuffer();if(bytes.byteLength!==f.size||await digest(bytes)!==f.hash)throw Error('Файл изменился или повреждён: '+f.path);
 const headers=new Headers(r.headers);headers.delete('Content-Encoding');headers.delete('Content-Length');
 note('network',f.path);return new Response(bytes,{status:200,headers});
}
async function cachedFile(f){const c=await caches.open(BLOBS),r=await c.match(blobURL(f.hash));if(r)note('cache',f.path);return r}
async function ensure(f){let r=await cachedFile(f);if(r)return r;const c=await caches.open(BLOBS);r=await fetchFile(f);await c.put(blobURL(f.hash),r.clone());return r}
async function announce(value){for(const c of await self.clients.matchAll({type:'window',includeUncontrolled:true}))c.postMessage({rpgUpdate:true,...value})}
async function pin(clientId,id){if(clientId&&id)await put('pin/'+clientId,id)}
async function pinned(clientId){return clientId&&await get('pin/'+clientId)||await get('installed')}
async function prune(){
 const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true}),clientIds=new Set(clients.map(c=>c.id));const ids=new Set([await get('installed'),await get('prepared'),await get('staging')]);for(const c of clients)ids.add(await get('pin/'+c.id));
 const protectedHashes=new Set(),allowed=new Map();for(const id of ids){const m=await manifest(id);if(!m)continue;for(const f of m.files){allowed.set(f.hash,f);if(f.core)protectedHashes.add(f.hash)}}
 const c=await caches.open(BLOBS),keys=await c.keys();let size=0,entries=[];
 for(const k of keys){const h=k.url.split('/').pop(),f=allowed.get(h);if(!f){await c.delete(k);continue}size+=f.size;entries.push({k,h,size:f.size})}
 for(const e of entries){if(size<=MAX_BYTES&&entries.length<=MAX_FILES)break;if(protectedHashes.has(e.h))continue;await c.delete(e.k);size-=e.size;entries=entries.filter(x=>x!==e)}
 const meta=await caches.open(META);for(const key of await meta.keys()){const relative=key.url.slice(metaURL('').length);if(relative.startsWith('manifest/')&&!ids.has(relative.slice(9))){await meta.delete(key);memory.delete(relative.slice(9))}if(relative.startsWith('pin/')&&!clientIds.has(relative.slice(4)))await meta.delete(key)}
 // Never erase localStorage, game saves or another application's caches.
}
async function prepare(){
 const current=await get('installed');let target;
 try{
  const response=await fetch(new URL('asset-manifest.json',base),{cache:'no-cache'});if(!response.ok)throw Error('Не удалось получить список обновления');target=await response.json();if(!valid(target))throw Error('Некорректный список обновления');stats.lastCheck={id:target.id,version:target.version,at:Date.now()};
  await put('manifest/'+target.id,target);memory.set(target.id,target);
  if(current===target.id){const blobs=await caches.open(BLOBS);for(const f of target.files.filter(f=>f.core))if(!await blobs.match(blobURL(f.hash)))await ensure(f);await prune();return {state:'current',id:current,version:target.version}}
  const existingPrepared=await get('prepared');
  if(existingPrepared===target.id){const c=await caches.open(BLOBS);let complete=true;for(const f of target.files.filter(f=>f.core))if(!await c.match(blobURL(f.hash)))complete=false;if(complete)return {state:'ready',id:target.id,version:target.version}}
  await put('staging',target.id);
  if(current)await announce({state:'loading',id:target.id,version:target.version});
  const prior=await manifest(current),priorByPath=new Map((prior?.files||[]).map(f=>[f.path,f]));const wanted=[];
  for(const f of target.files){if(f.core){wanted.push(f);continue}const old=priorByPath.get(f.path);if(old&&old.hash!==f.hash&&await cachedFile(old))wanted.push(f)}
  let index=0,finished=0;const worker=async()=>{while(index<wanted.length){const f=wanted[index++];await ensure(f);finished++;if(current)await announce({state:'loading',id:target.id,version:target.version,completed:finished,total:wanted.length})}};
  // Bounded download concurrency. Partial verified blobs may be reused after retry.
  const results=await Promise.allSettled([worker(),worker()]);const error=results.find(r=>r.status==='rejected');if(error)throw error.reason;
  if(!current){await put('installed',target.id);await put('staging',null);await prune();return {state:'current',id:target.id,version:target.version,first:true}}
  await put('prepared',target.id);return {state:'ready',id:target.id,version:target.version};
 }catch(e){note('errors',e.message);return {state:'error',message:e.name==='QuotaExceededError'?'Недостаточно места на устройстве. Освободите место и повторите загрузку.':e.message,version:target?.version,first:!current}}
}
// Background cache of ALL optimized artwork. Resumes on the next launch if interrupted.
async function prefetchImages(){
 const id=await get('installed'),m=await manifest(id);
 if(!m)return;
 const images=m.files.filter(f=>/^(?:assets|icons)\/.+\.(?:png|webp|jpg|jpeg|svg|gif)$/i.test(f.path));
 stats.preload={done:0,total:images.length,state:'running'};
 let cursor=0;
 const worker=async()=>{while(cursor<images.length){
  // Do not evict active core files or run alongside a version upgrade.
  if(job||await get('staging'))return;
  const f=images[cursor++];
  try{await ensure(f);stats.preload.done++}catch(err){note('errors','Фоновая загрузка: '+f.path+' '+err.message);continue}
  if(stats.preload.done%24===0)await prune();
 }};
 await Promise.all([worker(),worker()]);await prune();
 stats.preload.state=stats.preload.done===images.length?'complete':'partial';
}
self.addEventListener('install',()=>{}); // Never force takeover of existing game tabs.
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 const request=event.data||{},port=event.ports?.[0];if(!request.rpgUpdate)return;
 event.waitUntil((async()=>{try{
  let result;
  if(request.type==='HELLO'){await pin(event.source?.id,request.id);result={state:'hello',installed:await get('installed')}}
  else if(request.type==='CHECK'){
   if(!job)job=prepare().finally(()=>{job=null});result=await job;await put('lastResult',result);if(result.state==='current'&&request.id&&request.id!==result.id)result={...result,state:'ready'};
  }else if(request.type==='PREFETCH'){
   if(!job&&!await get('staging')){
    if(!preloadJob)preloadJob=prefetchImages().catch(e=>note('errors',e.message)).finally(()=>{preloadJob=null});
    event.waitUntil(preloadJob);
   }
   result={state:'prefetch-started'};
  }else if(request.type==='APPLY'){
   const id=request.id,m=await manifest(id);if(!m||(id!==await get('prepared')&&id!==await get('installed')))throw Error('Обновление не подготовлено');
   for(const f of m.files.filter(f=>f.core))if(!await cachedFile(f))throw Error('Кэш обновления был удалён. Повторите загрузку.');
   await put('installed',id);if(await get('prepared')===id)await put('prepared',null);await put('staging',null);await self.skipWaiting();result={state:'applied',id};
  }else if(request.type==='DIAG'){result={...stats,lastResult:await get('lastResult'),installed:await get('installed'),prepared:await get('prepared'),resources:(await (await caches.open(BLOBS)).keys()).length}}
  port?.postMessage(result||{});
 }catch(e){port?.postMessage({state:'error',message:e.message})}})());
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/')||url.pathname.endsWith('/asset-manifest.json')||url.pathname.endsWith('/sw.js'))return;
 if(!url.href.startsWith(base))return;
 event.respondWith((async()=>{
  const navigation=req.mode==='navigate';const id=navigation?await get('installed'):await pinned(event.clientId);const m=await manifest(id);let path=decodeURIComponent(url.pathname.slice(new URL(base).pathname.length));if(path===''||path.endsWith('/'))path+='index.html';
  const f=m?.files.find(x=>x.path===path);if(!f)return fetch(req);
  if(navigation)await pin(event.resultingClientId,id);
  const hit=await cachedFile(f);if(hit)return hit;
  try{const r=await fetchFile(f);if(f.size<=20*1024*1024){try{await (await caches.open(BLOBS)).put(blobURL(f.hash),r.clone());event.waitUntil(prune())}catch(e){note('errors','Кэш: '+e.message)}}return r}
  catch(e){note('errors',e.message);return new Response('Ресурс текущей версии недоступен. Проверьте связь или завершите обновление.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}
 })());
});
