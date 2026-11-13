(()=>{
 const build=window.RPG_CLIENT_BUILD;if(!build||!('serviceWorker' in navigator)||!window.isSecureContext)return;
 let readyResolve;const clientReady=new Promise(resolve=>{readyResolve=resolve});
 let registration,worker,target=null,deferred=false,busy=false,incompatible=false,lastResult=null;
 const panel=document.createElement('section');panel.id='rpgUpdateWindow';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Обновление игры');
 panel.innerHTML='<div class="rpg-update-panel"><h2></h2><p class="rpg-update-text"></p><div class="rpg-update-spinner" aria-label="Загрузка"></div><p class="rpg-update-detail" aria-live="polite"></p><div class="rpg-update-actions"><button class="primary" data-update-main></button><button class="ghost" data-update-later>Позже</button></div></div>';document.body.append(panel);
 const q=s=>panel.querySelector(s),main=q('[data-update-main]');
 function show(state){lastResult=state;if(state.first&&state.state!=='ready')return;if(deferred&&!incompatible)return;
  panel.hidden=false;panel.classList.toggle('rpg-update-required',incompatible||state.state==='loading'||state.state==='ready');panel.setAttribute('aria-modal','true');q('h2').textContent=state.state==='loading'?'Доступна новая версия игры '+state.version:state.state==='ready'?'Обновление завершено':'Не удалось обновить игру';
  q('.rpg-update-text').textContent=state.state==='loading'?'Идёт загрузка обновления...':state.state==='ready'?'Перезагрузите игру, чтобы применить новую версию.':state.message||'Проверьте связь и повторите загрузку.';
  q('.rpg-update-spinner').hidden=state.state!=='loading';q('.rpg-update-detail').textContent=state.state==='loading'&&state.total?`Подготовлено файлов: ${state.completed||0} из ${state.total}`:'';
  main.hidden=state.state==='loading';main.textContent=state.state==='ready'?'Перезагрузить игру':'Повторить загрузку';main.onclick=state.state==='ready'?apply:()=>{deferred=false;check()};q('[data-update-later]').hidden=incompatible||state.state==='loading';
 }
 q('[data-update-later]').onclick=async()=>{if(lastResult?.state!=='ready'){deferred=true;panel.hidden=true;return}try{const result=await send('APPLY',{id:target});if(result.state==='error')throw Error(result.message);deferred=true;panel.hidden=true}catch(e){show({state:'error',message:e.message})}};
 function send(type,extra={}){return new Promise((resolve,reject)=>{const channel=new MessageChannel(),timeout=setTimeout(()=>reject(Error('Загрузка занимает слишком много времени. Повторите попытку.')),180000);channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data)};worker.postMessage({rpgUpdate:true,type,id:build.id,...extra},[channel.port2])})}
 function backgroundPrefetch(){
  const network=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  // Never download hundreds of pictures on Data Saver / very slow metered connections.
  if(network?.saveData||['slow-2g','2g'].includes(network?.effectiveType))return;
  send('PREFETCH').catch(e=>console.warn('Фоновый кэш:',e.message));
 }
 async function detectServer(){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);try{const url=new URL('asset-manifest.json',document.baseURI);url.searchParams.set('check',Date.now());const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('Сервер не ответил на проверку версии (HTTP '+response.status+')');const manifest=await response.json();if(manifest.schema!==1||!manifest.id)throw Error('Некорректный манифест обновления');if(manifest.id!==build.id&&!deferred)show({state:'loading',version:manifest.version});return manifest}catch(e){throw Error(e.name==='AbortError'?'Не удалось проверить версию: сервер не ответил. Повторите попытку.':e.message)}finally{clearTimeout(timeout)}}
 let checkQueue=Promise.resolve();function check(){checkQueue=checkQueue.catch(()=>{}).then(runCheck);return checkQueue}
 async function runCheck(){if(!worker)return;busy=true;try{await detectServer();try{await registration.update()}catch{}if(registration.installing){const installing=registration.installing;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Не удалось установить Service Worker')),30000);const changed=()=>{if(['installed','activated','redundant'].includes(installing.state)){clearTimeout(timer);resolve()}};installing.addEventListener('statechange',changed);changed()})}worker=registration.waiting||registration.active||worker;await send('HELLO');const r=await send('CHECK');lastResult=r;if(r.state==='ready'){target=r.id;show(r)}else if(r.state==='error')show(r);else if(r.state==='current'){if(!incompatible)panel.hidden=true;backgroundPrefetch()}}catch(e){show({state:'error',message:e.message})}finally{busy=false}}
 async function apply(){main.disabled=true;try{
  if(window.__RPG_ONLINE__?.isStarted()){
   try{await window.RPGPrepareUpdateReload?.()}
   catch(e){if(!confirm('Не удалось подтвердить сохранение всех действий: '+e.message+'\nПерезагрузить игру всё равно?'))return}
  }
  const result=await send('APPLY',{id:target});if(result.state==='error')throw Error(result.message);
  // Reload is only reached from the explicit button. Other tabs remain pinned.
  location.reload();
 }catch(e){show({state:'error',message:e.message})}finally{main.disabled=false}}
 navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.rpgUpdate&&e.data.state==='loading')show(e.data)});
 window.addEventListener('rpg-incompatible',()=>{incompatible=true;deferred=false;panel.classList.add('rpg-update-required');show({state:'error',message:'Сервер требует новую версию игры. Загрузите обновление, чтобы продолжить.'});check()});
 let lastForegroundCheck=Date.now();function foreground(){if(document.hidden||deferred||Date.now()-lastForegroundCheck<2000)return;lastForegroundCheck=Date.now();check()}window.addEventListener('pageshow',foreground);window.addEventListener('online',foreground);document.addEventListener('visibilitychange',foreground);
 window.RPGUpdates={check:async()=>{deferred=false;await clientReady;return check()},diagnostics:async()=>({client:build,worker:worker?.state,scope:registration?.scope,lastResult,...await send('DIAG')})};
 (async()=>{try{
  await detectServer();
  registration=await navigator.serviceWorker.register(new URL('sw.js',document.baseURI),{updateViaCache:'none'});try{await registration.update()}catch{}
  if(registration.installing){const installing=registration.installing;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Не удалось установить Service Worker')),30000);const changed=()=>{if(['installed','activated','redundant'].includes(installing.state)){clearTimeout(timer);resolve()}};installing.addEventListener('statechange',changed);changed()})}
  worker=registration.waiting||registration.active;
  if(!worker){await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Не удалось запустить систему обновления. Повторите попытку.')),15000))]);worker=registration.active}
  if(!worker)return;
  await send('HELLO');readyResolve();await check();
 }catch(e){readyResolve();console.warn('Smart Cache:',e.message);show({state:'error',message:e.message});if(!worker)main.onclick=()=>location.reload()}})();
})();
