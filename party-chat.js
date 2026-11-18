(()=>{
 'use strict';
 const button=document.getElementById('partyChatButton');
 const overlay=document.createElement('div');overlay.id='partyChat';overlay.hidden=true;
 overlay.innerHTML='<section class="party-chat-card" role="dialog" aria-modal="true" aria-labelledby="partyChatTitle"><header><h2 id="partyChatTitle">Чат отряда</h2><button type="button" data-chat-close>Закрыть чат</button></header><div class="chat-columns"><aside aria-label="Участники"></aside><div id="partyChatLog" role="log" aria-live="polite"></div></div><button type="button" data-chat-bottom hidden>Новые сообщения ↓</button><form><input aria-label="Сообщение отряду" maxlength="500" placeholder="Слово твоему отряду…"><button type="submit">ОТПРАВИТЬ</button></form><div id="partyChatError" role="alert"></div></section>';
 const toast=document.createElement('div');toast.id='partyChatToast';toast.hidden=true;toast.setAttribute('role','status');document.body.append(overlay,toast);
 const log=overlay.querySelector('#partyChatLog'),input=overlay.querySelector('input'),error=overlay.querySelector('#partyChatError'),bottom=overlay.querySelector('[data-chat-bottom]');
 let room=null,messages=[],readId=0,hideTimer,reminder,due=0,opener,blocked=[],sending=false,pending=null,followBottom=true,layoutFrame=0;
 const key=()=>room?'hod-chat-read:'+room.code+':'+room.playerId:'';
 const maxId=()=>messages.at(-1)?.id||0;
 const unread=()=>messages.filter(m=>m.id>readId&&m.playerId!==room?.playerId);
 const atBottom=()=>log.scrollHeight-log.scrollTop-log.clientHeight<40;
 function saveRead(){try{localStorage.setItem(key(),String(readId))}catch{}}
 function badge(){const n=unread().length;button.textContent='ЧАТ'+(n?' ('+n+')':'');}
 function stopNotice(){clearTimeout(hideTimer);clearTimeout(reminder);due=0;toast.hidden=true;}
 function markRead(){readId=maxId();saveRead();badge();stopNotice();bottom.hidden=true;}
 function notify(){const list=unread();if(!list.length||!overlay.hidden||document.hidden)return;const m=list.at(-1);toast.textContent='✉ '+m.name+': '+m.text.slice(0,110)+(list.length>1?' · '+list.length+' непрочитанных':'');positionNotice();toast.hidden=false;toast.style.opacity='1';clearTimeout(hideTimer);hideTimer=setTimeout(()=>{toast.style.opacity='0';hideTimer=setTimeout(()=>toast.hidden=true,150)},2000);}
 function schedule(){clearTimeout(reminder);due=Date.now()+300000;reminder=setTimeout(()=>{notify();if(unread().length)schedule()},300000);}
 function render(){const position=log.scrollTop,near=followBottom;log.replaceChildren();for(const m of messages){const a=document.createElement('article'),s=document.createElement('small'),p=document.createElement('p');s.textContent=m.name+' · '+new Date(m.time*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});p.textContent=m.text;a.append(s,p);log.append(a)}if(near)log.scrollTop=log.scrollHeight;else{log.scrollTop=position;bottom.hidden=atBottom();}if(!overlay.hidden&&near&&!document.hidden)markRead();}
 function close(){overlay.hidden=true;for(const [el,was] of blocked)el.inert=was;blocked=[];opener?.focus({preventScroll:true});if(unread().length)schedule();}
 function open(){if(!room||!overlay.hidden)return;opener=document.activeElement;blocked=[...document.body.children].filter(e=>e!==overlay&&e!==toast&&e.tagName!=='SCRIPT').map(e=>[e,e.inert]);for(const [e] of blocked)e.inert=true;overlay.hidden=false;followBottom=true;viewport();log.scrollTop=log.scrollHeight;markRead();input.focus({preventScroll:true});}
 button.onclick=open;overlay.querySelector('[data-chat-close]').onclick=close;bottom.onclick=()=>{followBottom=true;log.scrollTop=log.scrollHeight;markRead()};log.addEventListener('scroll',()=>{if(overlay.hidden)return;followBottom=atBottom();if(followBottom&&!document.hidden)markRead()});
 overlay.querySelector('form').onsubmit=async e=>{e.preventDefault();if(sending||!room)return;const text=input.value.trim();if(!text)return;if(!pending||pending.text!==text)pending={text,nonce:crypto.randomUUID()};const owner=room;const payload=pending;sending=true;error.textContent='';try{await owner.send(payload);if(room!==owner)return;pending=null;if(input.value.trim()===text)input.value='';followBottom=true;await window.RPGChatRefresh?.();}catch(e){if(room===owner)error.textContent=e.message||'Не удалось отправить сообщение';}finally{sending=false;}};
 window.addEventListener('keydown',e=>{if(overlay.hidden||window.RPGPartyVoting?.modalOpen())return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const els=[...overlay.querySelectorAll('button:not([hidden]),input')],first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}e.stopImmediatePropagation()},true);
 window.RPGPartyChat={cursor:()=>maxId(),reset(){close();stopNotice();room=null;messages=[];readId=0;pending=null;followBottom=true;button.hidden=true;log.replaceChildren();},receive(info,data){if(!room||room.code!==info.code||room.playerId!==info.playerId){this.reset();room=info;try{readId=Number(localStorage.getItem(key()))||0}catch{}button.hidden=false;}else room.send=info.send;const before=maxId();const known=new Map(messages.map(m=>[m.id,m]));for(const m of data.chat||[])known.set(m.id,m);messages=[...known.values()].sort((a,b)=>a.id-b.id).slice(-300);const aside=overlay.querySelector('aside');aside.replaceChildren();for(const p of data.players||[]){const el=document.createElement('p');el.textContent=((data.online||[]).includes(p.id)?'● ':'○ ')+p.name;aside.append(el)}render();badge();if(maxId()>before&&unread().length&&overlay.hidden){notify();schedule();}}};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(!overlay.hidden&&atBottom())markRead();else if(unread().length){notify();schedule();}window.RPGChatRefresh?.();}});
 // Anchor notices to the game field, below the hero bar and desktop title.
 function positionNotice(){
  const mobile=window.matchMedia('(max-width:1100px), (pointer:coarse)').matches;
  const anchor=document.querySelector(mobile?'.board-panel':'.side-panel'),bar=document.getElementById('turnOrderBanner');
  const a=anchor?.getBoundingClientRect(),b=bar&&!bar.hidden?bar.getBoundingClientRect():null,v=window.visualViewport;
  const left=Math.max(12,(a?.left||0)+(mobile?12:4)),top=Math.max((v?.offsetTop||0)+12,b?b.bottom+8:0,a?a.top+(mobile?8:4):0);
  toast.style.setProperty('--chat-notice-left',Math.min(left,Math.max(12,innerWidth-324))+'px');
  toast.style.setProperty('--chat-notice-top',Math.min(top,Math.max(12,(v?.height||innerHeight)+(v?.offsetTop||0)-90))+'px');
 }
 // Only the log shrinks. Header and composer stay outside its clipping boundary.
 function keepLatest(){if(!overlay.hidden&&followBottom){log.scrollTop=log.scrollHeight;if(!document.hidden)markRead()}}
 function viewport(){
  const v=window.visualViewport,height=v?.height||innerHeight;
  const stick=followBottom||document.activeElement===input;
  overlay.style.top=(v?.offsetTop||0)+'px';overlay.style.height=height+'px';overlay.style.bottom='auto';overlay.dataset.compact=String(height<360);
  positionNotice();cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(()=>{if(stick){followBottom=true;keepLatest()}});
 }
 window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);
 window.addEventListener('resize',viewport);window.addEventListener('scroll',positionNotice,{passive:true});
 input.addEventListener('focus',()=>{followBottom=true;viewport()});
 if(window.ResizeObserver){new ResizeObserver(keepLatest).observe(log);const bar=document.getElementById('turnOrderBanner');if(bar)new ResizeObserver(positionNotice).observe(bar)}
 viewport();
})();
