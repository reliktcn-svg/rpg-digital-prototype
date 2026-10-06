(()=>{
  const HEROES=[
    ['warrior','Воин','#4c83ff'],['dwarf','Дворф','#d34b45'],['mage','Маг','#9d5cff'],['archer','Лучник','#4db76d'],['rogue','Разбойник','#444b55']
  ];
  let session={mode:null,code:null,playerId:null,playerSecret:null,room:null,timer:null};
  const $=id=>document.getElementById(id);
  const overlay=$('onlineLobby');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(path,opts={}){
    const r=await fetch(path,{headers:{'Content-Type':'application/json'},...opts});
    const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||`Ошибка ${r.status}`); return d;
  }
  function showError(msg=''){ $('onlineError').textContent=msg; }
  function showHome(){
    clearInterval(session.timer); session={mode:null,code:null,playerId:null,playerSecret:null,room:null,timer:null};
    $('onlineHome').hidden=false; $('onlineRoom').hidden=true; showError('');
  }
  function renderRoom(){
    const r=session.room;if(!r)return;
    $('onlineHome').hidden=true;$('onlineRoom').hidden=false;
    $('roomCode').textContent=r.code;
    const me=r.players.find(p=>p.id===session.playerId);
    $('roomWho').textContent=me?`${me.name}${me.host?' · хозяин':''}`:'';
    $('roomPlayers').innerHTML=r.players.map(p=>`<div class="net-player ${p.id===session.playerId?'me':''}"><b>${esc(p.name)}</b><span>${p.heroId?esc((HEROES.find(h=>h[0]===p.heroId)||[])[1]||p.heroId):'герой не выбран'}</span>${p.host?'<em>Хозяин</em>':''}</div>`).join('');
    const taken=new Map(r.players.filter(p=>p.heroId).map(p=>[p.heroId,p]));
    $('netHeroPicker').innerHTML=HEROES.map(([id,name,color])=>{
      const owner=taken.get(id), mine=owner?.id===session.playerId, disabled=owner&&!mine;
      return `<button class="net-hero ${mine?'selected':''}" data-hero="${id}" ${disabled?'disabled':''} style="--hc:${color}"><span class="net-hero-dot"></span><b>${name}</b><small>${disabled?'занят: '+esc(owner.name):mine?'выбран вами':'свободен'}</small></button>`;
    }).join('');
    $('netHeroPicker').querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>selectHero(b.dataset.hero));
    const isHost=!!me?.host, ready=r.players.length>=2&&r.players.every(p=>p.heroId);
    $('netStart').hidden=!isHost; $('netStart').disabled=!ready||r.started;
    $('netStart').textContent=r.started?'Комната запущена':'Начать сетевую игру';
    $('roomStatus').textContent=r.started?'Комната готова. Следующий этап — синхронизация карты и ходов между устройствами.':ready?'Все готовы. Хозяин может начать.':`Игроков: ${r.players.length}/5. Нужно минимум 2 и каждый выбирает героя.`;
    if(r.started){ $('netHeroPicker').querySelectorAll('button').forEach(b=>b.disabled=true); }
  }
  async function refresh(){
    if(!session.code)return; try{session.room=await api(`/api/rooms/${session.code}`);renderRoom()}catch(e){showError(e.message)}
  }
  function poll(){ clearInterval(session.timer);session.timer=setInterval(refresh,900); }
  async function createRoom(){
    const name=$('netName').value.trim()||'Хозяин'; showError('');
    try{const d=await api('/api/rooms',{method:'POST',body:JSON.stringify({name})});Object.assign(session,{mode:'online',code:d.room.code,playerId:d.playerId,playerSecret:d.playerSecret,room:d.room});renderRoom();poll()}catch(e){showError(e.message)}
  }
  async function joinRoom(){
    const name=$('netName').value.trim()||'Игрок', code=$('netCodeInput').value.replace(/\D/g,'').slice(0,6);if(code.length!==6)return showError('Введите 6-значный код комнаты.');
    showError('');try{const d=await api(`/api/rooms/${code}/join`,{method:'POST',body:JSON.stringify({name})});Object.assign(session,{mode:'online',code:d.room.code,playerId:d.playerId,playerSecret:d.playerSecret,room:d.room});renderRoom();poll()}catch(e){showError(e.message)}
  }
  async function selectHero(heroId){
    try{const d=await api(`/api/rooms/${session.code}/select`,{method:'POST',body:JSON.stringify({playerId:session.playerId,playerSecret:session.playerSecret,heroId})});session.room=d.room;renderRoom()}catch(e){showError(e.message);refresh()}
  }
  async function startRoom(){
    try{const d=await api(`/api/rooms/${session.code}/start`,{method:'POST',body:JSON.stringify({playerId:session.playerId,playerSecret:session.playerSecret})});session.room=d.room;renderRoom()}catch(e){showError(e.message)}
  }
  function localGame(){ clearInterval(session.timer);overlay.hidden=true;document.body.classList.remove('net-lobby-open'); }
  $('netCreate').onclick=createRoom;$('netJoin').onclick=joinRoom;$('netStart').onclick=startRoom;$('netBack').onclick=showHome;$('netLocal').onclick=localGame;
  $('netCodeInput').addEventListener('input',e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,6));
  document.body.classList.add('net-lobby-open');overlay.hidden=false;showHome();
})();
