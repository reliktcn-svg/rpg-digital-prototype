/* Voluntary support. No payment processing or gameplay changes. */
(()=>{
 'use strict';
 const methods={
  da:{name:'CloudTips',text:'Одна искра — ещё один шаг вперёд. Здесь можно разово поддержать разработку и оставить автору сообщение. Сумму выбираешь ты.',label:'Перейти в CloudTips',url:'https://pay.cloudtips.ru/p/0f172351'},
  boosty:{name:'Boosty',text:'Останься хранителем огня. На Boosty можно оформить ежемесячную поддержку разработки. Сумма и условия продления указаны на странице подписки.',label:'Перейти на Boosty',url:'https://boosty.to/the_heart_of_darkness'}
 };
 const overlay=document.createElement('div');overlay.id='authorSupport';overlay.hidden=true;
 overlay.innerHTML='<section class="author-support-card" role="dialog" aria-modal="true" aria-labelledby="authorSupportTitle"></section>';
 document.body.append(overlay);const card=overlay.firstElementChild;
 let opener=null,blocked=[];
 function render(key){const m=methods[key];card.replaceChildren();const h=document.createElement('h2');h.id='authorSupportTitle';h.textContent=m?m.name:'ПОДДЕРЖКА АВТОРА';card.append(h);
  const p=document.createElement('p');p.textContent=m?m.text:'Каждая искра помогает этому миру расти. Выбери свой путь поддержки.';card.append(p);
  if(m){const a=document.createElement('a');a.className='primary support-link';a.href=m.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=m.label+' ↗';card.append(a);addButton('Выбрать другой способ',()=>render('choose'));}
  else for(const [id,label] of [['da','CloudTips · разовый донат'],['boosty','Boosty · ежемесячная поддержка']])addButton(label,()=>render(id),id==='da'?'primary':'secondary');
  const hint=document.createElement('p');hint.className='hint';hint.textContent='Игра открыта каждому. Поддержка добровольная и не даёт игровых преимуществ.';card.append(hint);addButton('Поддержать позже',close,'ghost');card.querySelector('button,a').focus();
 }
 function addButton(text,action,cls='secondary'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=action;card.append(b);}
 function close(){overlay.hidden=true;for(const [el,was] of blocked)el.inert=was;blocked=[];document.body.classList.remove('author-support-open');if(opener?.isConnected)opener.focus();}
 function open(button,reminder=false){if(!overlay.hidden)return;opener=button||document.activeElement;blocked=[...document.body.children].filter(el=>el!==overlay&&el.tagName!=='SCRIPT').map(el=>[el,el.inert]);for(const [el] of blocked)el.inert=true;overlay.hidden=false;document.body.classList.add('author-support-open');if(reminder)renderReminder();else render('choose');}

 const seen=new Map();
 function ledger(key){if(!seen.has(key)){try{seen.set(key,new Set(JSON.parse(localStorage.getItem(key)||'[]')))}catch{seen.set(key,new Set())}}return seen.get(key);}
 function renderReminder(){card.replaceChildren();const h=document.createElement('h2');h.id='authorSupportTitle';h.textContent='Нравится игра?';const p=document.createElement('p');p.textContent='Поддержи автора «Сердца тьмы»! Поддержка всегда доступна в меню «Настройки» ⚙.';card.append(h,p);addButton('Поддержать',()=>render('choose'),'primary');addButton('Поддержать позже',close,'ghost');card.querySelector('button').focus();}
 function checkMilestone(){
  if(!overlay.hidden||document.hidden)return;const c=window.RPGSupportContext?.();if(!c||!c.key||!c.safe)return;
  if([...document.querySelectorAll('[role="dialog"],dialog[open],.journal-overlay,.roll-overlay,.modal,.sheet-drawer,.skill-tree-dialog,.skill-detail-dialog')].some(el=>el!==card&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'))return;
  const key='hod-support-milestones:'+c.key;const done=ledger(key);const due=[10,20,30,40].filter(n=>c.level>=n&&!done.has(n));if(!due.length)return;
  for(const n of due)done.add(n);try{localStorage.setItem(key,JSON.stringify([...done]))}catch{}open(document.activeElement,true);
 }
 // Local-only check: no network requests and no changes to the game state.
 setInterval(checkMilestone,1000);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-author-support]');if(b)open(b);});
 // Capture before existing game shortcuts, without pausing the network party.
 window.addEventListener('keydown',e=>{if(overlay.hidden||window.RPGPartyVoting?.modalOpen())return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}if(e.key==='Tab'){const all=[...card.querySelectorAll('button,a')],first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}e.stopImmediatePropagation();},true);
})();
