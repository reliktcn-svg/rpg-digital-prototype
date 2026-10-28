/* The editable HTML is authoritative on Python servers, static hosts and file://. */
window.RPGAtlas=(()=>{
 'use strict';
 const P=window.RPGProgression,base=new URL('.',document.currentScript.src),filename='Атлас героев.html';
 let pending=null,signature=JSON.stringify(P.project),status={ok:false,source:'snapshot',error:''};
 function parse(html){const doc=new DOMParser().parseFromString(html,'text/html');for(const id of ['initial','seed']){const tag=doc.getElementById(id);if(tag){const data=JSON.parse(tag.textContent);if(data)return data}}throw Error('В файле отсутствуют данные атласа')}
 function notice(){
   let box=document.getElementById('atlasLoadNotice');
   if(status.ok){box?.remove();return}
   if(!box){box=document.createElement('div');box.id='atlasLoadNotice';box.className='atlas-load-notice';box.setAttribute('role','alert');document.body.append(box)}
   box.replaceChildren();const label=document.createElement('span');label.textContent='Не удалось обновить «'+filename+'». Показан последний доступный атлас. '+status.error+' ';const retry=document.createElement('button');retry.textContent='Повторить';retry.onclick=()=>refresh();box.append(label,retry);
 }
 function readFrame(){return new Promise((resolve,reject)=>{
   const frame=document.createElement('iframe'),token=crypto.randomUUID?.()||Date.now()+'-'+Math.random();frame.hidden=true;frame.setAttribute('aria-hidden','true');const url=new URL(filename,base);url.searchParams.set('rpg-atlas-read',token);
   const finish=(error,data)=>{clearTimeout(timer);removeEventListener('message',receive);frame.remove();error?reject(error):resolve(data)};
   const receive=e=>{if(e.source!==frame.contentWindow||e.data?.type!=='rpg-atlas-file'||e.data.token!==token)return;finish(e.data.error?Error(e.data.error):null,e.data.project)};
   const timer=setTimeout(()=>finish(Error('Файл не ответил. Используйте атлас из этой сборки или запустите server.py.')),5000);
   addEventListener('message',receive);frame.src=url.href;document.body.append(frame);
 })}
 async function readFile(){
   if(location.protocol==='file:')return readFrame();
   const url=new URL(filename,base);url.searchParams.set('atlas-refresh',Date.now()+'-'+Math.random());
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
   try{const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status+' — проверьте имя и расположение файла.');return parse(await response.text())}finally{clearTimeout(timer)}
 }
 function refresh(){
   if(pending)return pending;
   pending=(async()=>{try{
     const data=await readFile(),next=JSON.stringify(data),changed=next!==signature;
     if(changed){P.load(data);signature=next;window.RPG_HERO_ATLAS=data}
     status={ok:true,source:'html',error:''};notice();
     if(changed)dispatchEvent(new CustomEvent('rpg-atlas-updated'));
     return {...status,changed};
   }catch(error){status={ok:false,source:'snapshot',error:error.message};notice();return {...status,changed:false}}finally{pending=null}})();
   return pending;
 }
 const api={refresh,parse,get status(){return {...status}}};
 api.ready=refresh();return api;
})();
