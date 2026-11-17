/* Server-authoritative voting. Dialogs preserve underlying game windows. */
(()=>{
 'use strict';
 const button=document.getElementById('partyVotingButton');
 const layer=document.createElement('div');layer.id='partyVoting';layer.hidden=true;layer.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="partyVotingTitle"></section>';
 document.body.append(layer);const card=layer.firstElementChild;
 let connection=null,data=null,mode=null,blocked=[],opener=null,offset=0,busy=false,error='',lastMembership=null;
 const now=()=>Date.now()/1000+offset;
 function close(){layer.hidden=true;for(const [el,was] of blocked)el.inert=was;blocked=[];mode=null;opener?.focus();}
 function show(next){if(layer.hidden){opener=document.activeElement;blocked=[...document.body.children].filter(el=>el!==layer&&el.tagName!=='SCRIPT').map(el=>[el,el.inert]);for(const [el] of blocked)el.inert=true;}mode=next;layer.hidden=false;render();card.querySelector('button')?.focus();}
 function title(text){const h=document.createElement('h2');h.id='partyVotingTitle';h.textContent=text;card.append(h);}
 function text(value){const p=document.createElement('p');p.textContent=value;card.append(p);}
 function action(label,callback,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled||busy;b.onclick=callback;card.append(b);}
 function remaining(t){const seconds=Math.max(0,Math.ceil(t-now()));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
 async function send(payload){if(!connection||busy)return;const owner=connection;busy=true;error='';render();try{const response=await owner.send(payload);if(connection?.code!==owner.code)return;busy=false;close();receive(owner,response.voting,true);await window.RPGVotingRefresh?.();}catch(e){busy=false;error=e.message||'Не удалось отправить решение';render();}}
 function render(){if(!mode||!data)return;card.replaceChildren();const me=data.participants.find(p=>p.id===connection.playerId),v=data.vote;
  if(mode==='vote'&&v){title(v.kind==='kick'?'Голосование за исключение':'Возвращение в партию');text(v.kind==='kick'?'Игрок «'+v.initiatorName+'» предлагает исключить из партии «'+v.targetName+'».':'Игрок «'+v.targetName+'» намерен вернуться. Подтвердите возвращение.');text('Требуется единогласие. Осталось '+remaining(v.endsAt));action('ЗА',()=>send({action:'cast',voteId:v.id,yes:true}));action('ПРОТИВ',()=>send({action:'cast',voteId:v.id,yes:false}));}
  else if(mode==='excluded'&&me?.exclusion){const ex=me.exclusion;title(ex.expired?'Участие завершено':'Вы исключены из партии');text(ex.expired?'20 минут истекли. Возвращение в эту партию недоступно.':'Имущество сохранено. На возвращение осталось '+remaining(ex.until)+'. Требуется согласие всех остальных участников.');if(!ex.expired)action(data.vote?.target===me.id?'Запрос рассматривается':'Запросить возвращение',()=>send({action:'start',kind:'return'}),!!data.vote||!!data.pending||now()<data.cooldownUntil||now()>=ex.until);if(!ex.expired&&now()<data.cooldownUntil)text('Новый запрос доступен через '+remaining(data.cooldownUntil));action('Вернуться в главное меню',()=>{close();window.RPGNetworkReturnHome?.();});}
  else{title('Голосование');if(v)text('Голосование уже идёт. Ваш ответ '+(v.answered?'принят.':'ожидается.'));if(data.pending)text('Исключение одобрено. Завершается зафиксированное действие.');if(now()<data.cooldownUntil)text('Повторная попытка через '+remaining(data.cooldownUntil));const active=data.participants.filter(p=>!p.exclusion);if(active.length<3)text('Для исключения нужны минимум три участника.');for(const p of active){if(p.id===connection.playerId)continue;text(p.label+(p.host?' · хозяин комнаты':''));action('Предложить исключение',()=>send({action:'start',kind:'kick',target:p.id}),active.length<3||!!v||!!data.pending||now()<data.cooldownUntil);}action('Вернуться в журнал',close);}
  if(error){const e=document.createElement('p');e.setAttribute('role','alert');e.textContent=error;card.append(e);}
 }
 function receive(info,next,fresh=false){if(!next)return;if(connection?.code===info.code&&data&&next.revision<data.revision)return;if(connection&&connection.code!==info.code)close();connection=info;data=next;window.__RPG_VOTE_PENDING__=!!next.pending;if(fresh)offset=next.now-Date.now()/1000;button.hidden=false;const me=data.participants.find(p=>p.id===info.playerId);window.__RPG_VOTE_EXCLUDED__=!!me?.exclusion;
  if(me?.exclusion){if(mode!=='excluded')show('excluded');else render();return;}
  const vote=data.vote,need=vote&&vote.eligible.includes(info.playerId)&&!vote.answered;
  if(need){if(mode!=='vote'||layer.dataset.voteId!==vote.id){layer.dataset.voteId=vote.id;show('vote');}else render();}
  else if(!layer.hidden&&(mode==='vote'||mode==='excluded'))close();else if(mode==='panel')render();
 }
 button.onclick=()=>show('panel');
 window.RPGPartyVoting={receive,modalOpen:()=>!layer.hidden,reset(){close();connection=null;data=null;button.hidden=true;window.__RPG_VOTE_EXCLUDED__=false;window.__RPG_VOTE_PENDING__=false;}};
 window.addEventListener('keydown',e=>{if(layer.hidden)return;if(e.key==='Tab'){const all=[...card.querySelectorAll('button:not(:disabled)')],first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}if(e.key==='Escape'){e.preventDefault();if(mode==='panel')close();}e.stopImmediatePropagation()},true);
 setInterval(()=>{if(!layer.hidden&&!busy){const focused=document.activeElement,buttons=[...card.querySelectorAll('button')],ix=buttons.indexOf(focused);render();if(ix>=0)card.querySelectorAll('button')[ix]?.focus();}},1000);
})();
