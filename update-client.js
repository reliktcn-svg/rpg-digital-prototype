(()=>{
 const build=window.RPG_CLIENT_BUILD;if(!build||!('serviceWorker' in navigator)||!window.isSecureContext)return;
 let registration,worker,target=null,deferred=false,busy=false,incompatible=false,lastResult=null;
 const panel=document.createElement('section');panel.id='rpgUpdateWindow';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Обновление игры');
 panel.innerHTML='<div class="rpg-update-panel"><h2></h2><p class="rpg-update-text"></p><div class="rpg-update-spinner" aria-label="Загрузка"></div><p class="rpg-update-detail" aria-live="polite"></p><div class="rpg-update-actions"><button class="primary" data-update-main></button><button class="ghost" data-update-later>Позже</button></div></div>';document.body.append(panel);
 const q=s=>panel.querySelector(s),main=q('[data-update-main]');
 function show(state){lastResult=state;if(state.first&&state.state!=='ready')return;if(deferred&&!incompatible)return;
  panel.hidden=false;q('h2').textContent=state.state==='loading'?'Новая версия игры '+state.version:state.state==='ready'?'Обновление завершено':'Не удалось обновить игру';
  q('.rpg-update-text').textContent=state.state==='loading'?'Идёт загрузка обновления...':state.state==='ready'?'Перезагрузите игру, чтобы применить новую версию.':state.message||'Проверьте связь и повторите загрузку.';
  q('.rpg-update-spinner').hidden=state.state!=='loading';q('.rpg-update-detail').textContent=state.state==='loading'&&state.total?`Подготовлено файлов: ${state.completed||0} из ${state.total}`:'';
  main.hidden=state.state==='loading';main.textContent=state.state==='ready'?'Перезагрузить игру':'Повторить загрузку';main.onclick=state.state==='ready'?apply:()=>{deferred=false;check()};q('[data-update-later]').hidden=incompatible;
 }
 q('[data-update-later]').onclick=()=>{deferred=true;panel.hidden=true};
 function send(type,extra={}){return new Promise((resolve,reject)=>{const channel=new MessageChannel(),timeout=setTimeout(()=>reject(Error('Загрузка занимает слишком много времени. Повторите попытку.')),180000);channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data)};worker.postMessage({rpgUpdate:true,type,id:build.id,...extra},[channel.port2])})}
 async function check(){if(busy||!worker)return;busy=true;try{try{await registration.update()}catch{}if(registration.installing){const installing=registration.installing;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Не удалось установить Service Worker')),30000);const changed=()=>{if(['installed','activated','redundant'].includes(installing.state)){clearTimeout(timer);resolve()}};installing.addEventListener('statechange',changed);changed()})}worker=registration.waiting||registration.active||worker;await send('HELLO');const r=await send('CHECK');lastResult=r;if(r.state==='ready'){target=r.id;show(r)}else if(r.state==='error')show(r)}catch(e){show({state:'error',message:e.message})}finally{busy=false}}
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
 window.RPGUpdates={check:()=>{deferred=false;return check()},diagnostics:async()=>({client:build,worker:worker?.state,scope:registration?.scope,lastResult,...await send('DIAG')})};
 (async()=>{try{
  registration=await navigator.serviceWorker.register(new URL('sw.js',document.baseURI),{updateViaCache:'none'});try{await registration.update()}catch{}
  if(registration.installing){const installing=registration.installing;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Не удалось установить Service Worker')),30000);const changed=()=>{if(['installed','activated','redundant'].includes(installing.state)){clearTimeout(timer);resolve()}};installing.addEventListener('statechange',changed);changed()})}
  worker=registration.waiting||registration.active;
  if(!worker){await navigator.serviceWorker.ready;worker=registration.active}
  if(!worker)return;
  await send('HELLO');await check();
 }catch(e){console.warn('Smart Cache:',e.message)}})();
})();
