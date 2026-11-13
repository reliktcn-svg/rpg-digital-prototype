/* Local-only two-slot solo saves. No network requests or static-cache coupling. */
(()=>{'use strict';
 const NAME='rpg-solo-v1',STORE='slots',SLOTS=[1,2];
 let active=null,queue=Promise.resolve(),dialog=null,busy=false,lastError='';
 const openDB=()=>new Promise((resolve,reject)=>{
  if(!('indexedDB' in window))return reject(Error('Браузер не поддерживает IndexedDB'));
  const req=indexedDB.open(NAME,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'slot'})};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Не удалось открыть хранилище'));
 });
 async function transaction(mode,action){const db=await openDB();return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let result;
  try{const request=action(store);if(request){request.onsuccess=()=>{result=request.result};request.onerror=()=>{}}}catch(e){db.close();reject(e);return}
  tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>{db.close();reject(tx.error||Error('Не удалось сохранить'))};tx.onabort=()=>{db.close();reject(tx.error||Error('Запись отменена'))};
 })}
 const get=slot=>transaction('readonly',s=>s.get(slot));
 const records=async()=>{const items=await Promise.all(SLOTS.map(get));return items.map(rec=>{if(!rec?.state)return rec;try{const current=description(JSON.parse(rec.state));return {...rec,hero:current.hero,level:current.level}}catch{return rec}})};
 function validate(state){if(!state||typeof state!=='object'||Array.isArray(state)||state.started!==true||!Array.isArray(state.players)||state.players.length!==1||state.mode==='network'||!state.players[0]?.id)throw Error('Файл не содержит корректного соло-сохранения');}
 function description(state){const hero=state.players[0],owned=Object.values(state.territories||{}).filter(t=>t&&t.owner===hero.id).length;
  return {hero:String(hero.name||hero.id).slice(0,80),level:Number(hero.progressionVersion===2&&Number.isFinite(Number(hero.masteryPoints)) ? 1+Math.floor((Math.sqrt(81+0.16*Math.max(0,Number(hero.masteryPoints)))-9)/2) : hero.level||hero.progressionLevel||owned+1)||1};}
 function write(slot,state){validate(state);const info=description(state);const record={slot,schema:1,updatedAt:Date.now(),hero:info.hero,level:info.level,state:JSON.stringify(state)};
  return transaction('readwrite',s=>s.put(record)).then(()=>record)}
 function writeActive(state){if(!active)return Promise.resolve(false);const slot=active;queue=queue.catch(()=>{}).then(()=>write(slot,state));return queue.then(()=>true)}
 function reset(){active=null;lastError=''}
 function close(){if(dialog){dialog.remove();dialog=null}busy=false}
 function panel(title){close();dialog=document.createElement('div');dialog.className='solo-save-overlay';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',title);
  dialog.innerHTML='<section class="solo-save-panel"><header><h2></h2><button class="ghost" data-close type="button" aria-label="Закрыть">×</button></header><p class="solo-save-hint"></p><div class="solo-save-slots"></div><div class="solo-save-actions"><button class="ghost" type="button" data-import>Импорт файла</button><input type="file" accept=".json,application/json" hidden></div><div class="solo-save-error" role="alert"></div></section>';
  dialog.querySelector('h2').textContent=title;dialog.querySelector('[data-close]').onclick=close;document.body.appendChild(dialog);return dialog;}
 function error(e){if(dialog)dialog.querySelector('.solo-save-error').textContent=String(e?.message||e);lastError=String(e?.message||e)}
 const stamp=ts=>new Date(ts).toLocaleString('ru-RU');
 function showSlots(recs,mode,click){const box=dialog.querySelector('.solo-save-slots');box.replaceChildren();for(let i=0;i<2;i++){const slot=i+1,rec=recs[i],wrap=document.createElement('div');wrap.className='solo-save-slot';
  const button=document.createElement('button');button.className='solo-save-select';button.type='button';button.textContent=rec?`Слот ${slot} · ${rec.hero} · уровень ${rec.level} · ${stamp(rec.updatedAt)}${slot===active?' · активный':''}`:`Слот ${slot} · Пустой слот`;button.disabled=mode==='load'&&!rec;button.onclick=()=>click(slot,rec);wrap.append(button);
  if(rec){const dl=document.createElement('button');dl.className='ghost solo-save-export';dl.textContent='Экспорт';dl.onclick=async()=>{try{await exportRecord(rec)}catch(e){error(e)}};wrap.append(dl)}box.append(wrap)}}
 async function exportRecord(rec){const obj={format:'rpg-digital-solo-save',schema:1,exportedAt:new Date().toISOString(),state:JSON.parse(rec.state)};
  const url=URL.createObjectURL(new Blob([JSON.stringify(obj)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`RPG_solo_${rec.hero.replace(/[^a-zA-Zа-яА-ЯёЁ0-9_-]/g,'_')}_slot${rec.slot}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}
 async function promptImport(callback){const input=dialog.querySelector('input[type=file]');input.onchange=async()=>{try{const file=input.files?.[0];if(!file)return;if(file.size>12*1024*1024)throw Error('Файл слишком большой');const data=JSON.parse(await file.text());if(data?.format!=='rpg-digital-solo-save'||data.schema!==1)throw Error('Неизвестный формат файла');validate(data.state);await callback(data.state)}catch(e){error(e)}finally{input.value=''}};dialog.querySelector('[data-import]').onclick=()=>input.click()}
 async function saveUI(getState){if(busy)return;const root=panel('Сохранить соло-партию');root.querySelector('.solo-save-hint').textContent='Выберите один из двух слотов. После выбора все следующие действия будут сохраняться автоматически.';
  const refresh=async()=>{try{const recs=await records();if(!dialog||dialog!==root)return;showSlots(recs,'save',async(slot,old)=>{if(busy)return;
    if(old&&active!==slot&&!confirm('Перезаписать сохранение?'))return;
    busy=true;try{const state=getState();validate(state);await write(slot,state);active=slot;close()}catch(e){busy=false;error(e)}})}catch(e){error(e)}};
  await refresh();await promptImport(async state=>{const slot=Number(prompt('В какой слот импортировать сохранение? Введите 1 или 2.'));if(!SLOTS.includes(slot))return;const old=await get(slot);if(old&&!confirm('Перезаписать сохранение?'))return;await write(slot,state);await refresh()});}
 async function loadUI(onLoad,legacy){if(busy)return;const root=panel('Загрузить соло-партию');root.querySelector('.solo-save-hint').textContent='Выберите сохранение. Локальные слоты не зависят от сервера.';
  const refresh=async()=>{try{const recs=await records();if(root!==dialog)return;showSlots(recs,'load',async(slot,rec)=>{if(busy||!rec)return;busy=true;try{validate(JSON.parse(rec.state));const loaded=await onLoad(JSON.parse(rec.state));if(loaded===false){busy=false;return}active=slot;close()}catch(e){busy=false;error(e)}});
   if(legacy?.()&&!root.querySelector('[data-legacy]')){const btn=document.createElement('button');btn.className='ghost';btn.dataset.legacy='1';btn.textContent='Перенести старое сохранение';btn.onclick=async()=>{try{const state=JSON.parse(legacy());validate(state);const slot=Number(prompt('Выберите слот для старого сохранения: 1 или 2'));if(!SLOTS.includes(slot))return;const old=await get(slot);if(old&&!confirm('Перезаписать сохранение?'))return;await write(slot,state);await refresh()}catch(e){error(e)}};root.querySelector('.solo-save-actions').prepend(btn)}
  }catch(e){error(e)}};
  await refresh();await promptImport(async state=>{const slot=Number(prompt('В какой слот импортировать сохранение? Введите 1 или 2'));if(!SLOTS.includes(slot))return;const old=await get(slot);if(old&&!confirm('Перезаписать сохранение?'))return;await write(slot,state);await refresh()});}
 window.RPGSoloSaves={get active(){return active},get lastError(){return lastError},saveUI,loadUI,writeActive,reset,records};
})();
