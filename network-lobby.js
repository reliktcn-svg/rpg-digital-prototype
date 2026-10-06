(()=>{
  const HEROES=[
    ['warrior','Воин','#4c83ff'],['dwarf','Дворф','#d34b45'],['mage','Маг','#9d5cff'],['archer','Лучник','#4db76d'],['rogue','Разбойник','#444b55']
  ];
  let session={mode:null,code:null,playerId:null,playerSecret:null,room:null,timer:null,gameTimer:null,gameEntered:false,lastRevision:0,lastSnapshot:'',lastServerActiveHero:null,syncBusy:false};
  const $=id=>document.getElementById(id);
  const overlay=$('onlineLobby');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const heroName=id=>(HEROES.find(h=>h[0]===id)||[])[1]||id||'—';
  const engine=()=>window.__RPG_ONLINE__||null;
  async function api(path,opts={}){
    const r=await fetch(path,{headers:{'Content-Type':'application/json'},cache:'no-store',...opts});
    const d=await r.json().catch(()=>({})); if(!r.ok) {const err=new Error(d.error||`Ошибка ${r.status}`);err.status=r.status;err.data=d;throw err} return d;
  }
  function showError(msg=''){ $('onlineError').textContent=msg; }
  function myPlayer(){return session.room?.players?.find(p=>p.id===session.playerId)||null}
  function myHeroId(){return myPlayer()?.heroId||null}
  function activeHeroFromState(st){return st?.order?.[st?.currentIndex??0]||null}
  function exported(){const e=engine();return e?e.exportState():null}
  function snap(st){try{return JSON.stringify(st)}catch{return ''}}
  function auth(){return{playerId:session.playerId,playerSecret:session.playerSecret}}

  function ensureTurnBanner(){
    let b=$('onlineTurnBanner');if(b)return b;
    b=document.createElement('div');b.id='onlineTurnBanner';b.className='online-turn-banner';b.hidden=true;document.body.appendChild(b);return b;
  }
  function updateTurnGuard(){
    if(!session.gameEntered)return;
    const b=ensureTurnBanner(),mine=myHeroId(),active=session.lastServerActiveHero||engine()?.currentPlayerId(),isMine=!!mine&&active===mine;
    document.body.classList.add('online-game');document.body.classList.toggle('online-not-my-turn',!isMine);
    b.hidden=false;b.classList.toggle('mine',isMine);
    b.innerHTML=isMine?`Ваш ход · <b>${esc(heroName(mine))}</b>`:`Сейчас ходит <b>${esc(heroName(active))}</b> · ваш герой: ${esc(heroName(mine))}`;
  }
  function showHome(){
    clearInterval(session.timer);clearInterval(session.gameTimer);session={mode:null,code:null,playerId:null,playerSecret:null,room:null,timer:null,gameTimer:null,gameEntered:false,lastRevision:0,lastSnapshot:'',lastServerActiveHero:null,syncBusy:false};
    $('onlineHome').hidden=false;$('onlineRoom').hidden=true;showError('');document.body.classList.remove('online-game','online-not-my-turn');const b=$('onlineTurnBanner');if(b)b.hidden=true;
  }
  function renderRoom(){
    const r=session.room;if(!r)return;
    $('onlineHome').hidden=true;$('onlineRoom').hidden=false;
    $('roomCode').textContent=r.code;
    const me=myPlayer();$('roomWho').textContent=me?`${me.name}${me.host?' · хозяин':''}`:'';
    $('roomPlayers').innerHTML=r.players.map(p=>`<div class="net-player ${p.id===session.playerId?'me':''}"><b>${esc(p.name)}</b><span>${p.heroId?esc(heroName(p.heroId)):'герой не выбран'}</span>${p.host?'<em>Хозяин</em>':''}</div>`).join('');
    const taken=new Map(r.players.filter(p=>p.heroId).map(p=>[p.heroId,p]));
    $('netHeroPicker').innerHTML=HEROES.map(([id,name,color])=>{
      const owner=taken.get(id), mine=owner?.id===session.playerId, disabled=owner&&!mine;
      return `<button class="net-hero ${mine?'selected':''}" data-hero="${id}" ${disabled||r.started?'disabled':''} style="--hc:${color}"><span class="net-hero-dot"></span><b>${name}</b><small>${disabled?'занят: '+esc(owner.name):mine?'выбран вами':'свободен'}</small></button>`;
    }).join('');
    $('netHeroPicker').querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>selectHero(b.dataset.hero));
    const isHost=!!me?.host, ready=r.players.length>=2&&r.players.every(p=>p.heroId);
    $('netStart').hidden=!isHost;$('netStart').disabled=!ready||r.started;$('netStart').textContent=r.started?'Комната запущена':'Начать сетевую игру';
    $('roomStatus').textContent=r.started?(r.gameReady?'Общая партия создана. Открываем карту…':'Комната запущена. Хозяин создаёт общую карту…'):ready?'Все готовы. Хозяин может начать.':`Игроков: ${r.players.length}/5. Нужно минимум 2 и каждый выбирает героя.`;
  }
  async function fetchGame(){
    return api(`/api/rooms/${session.code}/game?playerId=${encodeURIComponent(session.playerId)}&playerSecret=${encodeURIComponent(session.playerSecret)}`);
  }
  function enterGame(state,revision){
    const e=engine();if(!e||!state)return;
    e.applyState(state);session.gameEntered=true;session.lastRevision=Number(revision||0);session.lastSnapshot=snap(e.exportState());session.lastServerActiveHero=activeHeroFromState(state);
    overlay.hidden=true;document.body.classList.remove('net-lobby-open');updateTurnGuard();startGameSync();
  }
  async function ensureOnlineGame(){
    if(!session.room?.started)return;
    const e=engine();if(!e)return showError('Игровой модуль ещё загружается.');
    if(session.room.gameReady){
      if(session.gameEntered)return;
      try{const d=await fetchGame();if(d.ready&&d.state)enterGame(d.state,d.revision)}catch(err){showError(err.message)}
      return;
    }
    const me=myPlayer();
    if(me?.host&&!session.gameEntered){
      try{
        const ids=session.room.players.map(p=>p.heroId).filter(Boolean),initial=e.startWithHeroes(ids);
        const d=await api(`/api/rooms/${session.code}/game/init`,{method:'POST',body:JSON.stringify({...auth(),state:initial})});
        enterGame(d.state,d.revision);
      }catch(err){showError(err.message)}
    }
  }
  async function refresh(){
    if(!session.code)return;
    try{session.room=await api(`/api/rooms/${session.code}`);if(!session.gameEntered)renderRoom();if(session.room.started)await ensureOnlineGame()}catch(e){showError(e.message)}
  }
  function poll(){clearInterval(session.timer);session.timer=setInterval(refresh,900)}
  async function pullGame(force=false){
    if(!session.gameEntered||session.syncBusy)return;
    session.syncBusy=true;
    try{
      const d=await fetchGame();if(!d.ready)return;
      if(force||Number(d.revision)>session.lastRevision){
        engine().applyState(d.state);session.lastRevision=Number(d.revision||0);session.lastSnapshot=snap(engine().exportState());session.lastServerActiveHero=activeHeroFromState(d.state);updateTurnGuard();
      }
    }catch(e){if(e.status!==202)console.warn('online pull',e)}finally{session.syncBusy=false}
  }
  async function syncGame(){
    if(!session.gameEntered||session.syncBusy)return;
    const e=engine(),mine=myHeroId();if(!e||!mine)return;
    const local=e.exportState(),localSnap=snap(local),serverActor=session.lastServerActiveHero;
    if(localSnap!==session.lastSnapshot&&serverActor===mine){
      session.syncBusy=true;
      try{
        const d=await api(`/api/rooms/${session.code}/game/state`,{method:'POST',body:JSON.stringify({...auth(),baseRevision:session.lastRevision,state:local})});
        session.lastRevision=Number(d.revision||session.lastRevision+1);session.lastSnapshot=localSnap;session.lastServerActiveHero=activeHeroFromState(local);updateTurnGuard();
      }catch(e2){console.warn('online push',e2);session.syncBusy=false;await pullGame(true);return}finally{session.syncBusy=false}
    }
    await pullGame(false);
  }
  function startGameSync(){clearInterval(session.gameTimer);session.gameTimer=setInterval(syncGame,650)}
  async function createRoom(){
    const name=$('netName').value.trim()||'Хозяин';showError('');
    try{const d=await api('/api/rooms',{method:'POST',body:JSON.stringify({name})});Object.assign(session,{mode:'online',code:d.room.code,playerId:d.playerId,playerSecret:d.playerSecret,room:d.room});renderRoom();poll()}catch(e){showError(e.message)}
  }
  async function joinRoom(){
    const name=$('netName').value.trim()||'Игрок',code=$('netCodeInput').value.replace(/\D/g,'').slice(0,6);if(code.length!==6)return showError('Введите 6-значный код комнаты.');
    showError('');try{const d=await api(`/api/rooms/${code}/join`,{method:'POST',body:JSON.stringify({name})});Object.assign(session,{mode:'online',code:d.room.code,playerId:d.playerId,playerSecret:d.playerSecret,room:d.room});renderRoom();poll()}catch(e){showError(e.message)}
  }
  async function selectHero(heroId){
    try{const d=await api(`/api/rooms/${session.code}/select`,{method:'POST',body:JSON.stringify({...auth(),heroId})});session.room=d.room;renderRoom()}catch(e){showError(e.message);refresh()}
  }
  async function startRoom(){
    try{const d=await api(`/api/rooms/${session.code}/start`,{method:'POST',body:JSON.stringify(auth())});session.room=d.room;renderRoom();await ensureOnlineGame()}catch(e){showError(e.message)}
  }
  function localGame(){clearInterval(session.timer);clearInterval(session.gameTimer);overlay.hidden=true;document.body.classList.remove('net-lobby-open')}

  document.addEventListener('click',e=>{
    if(!session.gameEntered)return;
    const mine=myHeroId(),active=session.lastServerActiveHero||engine()?.currentPlayerId();if(!mine||mine===active)return;
    const t=e.target;if(!(t instanceof Element))return;
    if(t.closest('#mobileHeroBtn,#mobileInventoryBtn,#mobileJournalBtn,#inventoryBtn,#journalBtn,#sheetDrawer,#journalOverlay,.map-zoom-controls'))return;
    if(t.closest('#gameSection,#overlay,#modal')){e.preventDefault();e.stopImmediatePropagation();updateTurnGuard()}
  },true);

  $('netCreate').onclick=createRoom;$('netJoin').onclick=joinRoom;$('netStart').onclick=startRoom;$('netBack').onclick=showHome;$('netLocal').onclick=localGame;
  $('netCodeInput').addEventListener('input',e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,6));
  document.body.classList.add('net-lobby-open');overlay.hidden=false;showHome();
})();
