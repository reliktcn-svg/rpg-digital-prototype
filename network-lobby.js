(()=>{
  const HEROES=[
    ['warrior','Воин','#4c83ff'],['dwarf','Дворф','#d34b45'],['mage','Маг','#9d5cff'],['archer','Лучник','#4db76d'],['rogue','Разбойник','#444b55']
  ];
  let session={mode:null,code:null,playerId:null,playerSecret:null,recoveryKey:null,room:null,timer:null,gameTimer:null,gameEntered:false,lastRevision:0,lastSnapshot:'',lastServerActiveHero:null,syncBusy:false,lastSideSnapshot:''};
  const SESSION_KEY='rpg-online-session';
  const RECOVERY_KEY='rpg-online-recovery-v0635';
  const LEGACY_RECOVERY_KEYS=['rpg-online-recovery-v0634'];
  const LEGACY_SESSION_KEYS=['rpg-online-session-v0632'];
  function saveResumeSession(){try{if(!session.code||!session.playerId||!session.playerSecret)return;localStorage.setItem(SESSION_KEY,JSON.stringify({code:session.code,playerId:session.playerId,playerSecret:session.playerSecret,recoveryKey:session.recoveryKey||session.room?.recoveryKey||null,name:myPlayer()?.name||$('netName')?.value||'',savedAt:Date.now()}));saveRecoverySnapshot();renderResumeButton()}catch{}}
  function readResumeSession(){try{const keys=[SESSION_KEY,...LEGACY_SESSION_KEYS];for(const k of keys){const raw=localStorage.getItem(k);if(raw){const v=JSON.parse(raw);if(v?.code&&v?.playerId&&v?.playerSecret){if(k!==SESSION_KEY)localStorage.setItem(SESSION_KEY,raw);return v}}}return null}catch{return null}}
  function readRecoverySnapshot(){try{for(const k of [RECOVERY_KEY,...LEGACY_RECOVERY_KEYS]){const raw=localStorage.getItem(k);if(raw){const v=JSON.parse(raw);if(k!==RECOVERY_KEY)localStorage.setItem(RECOVERY_KEY,raw);return v}}return null}catch{return null}}
  function saveRecoverySnapshot(stateOverride){try{
    if(!session.code||!session.playerId||!session.playerSecret||!session.room)return;
    const rkey=session.recoveryKey||session.room?.recoveryKey;if(!rkey)return;
    session.recoveryKey=rkey;
    const st=stateOverride!==undefined?stateOverride:(session.gameEntered?exported():null);
    const room={code:session.room.code,started:!!session.room.started,createdAt:session.room.createdAt||Math.floor(Date.now()/1000),lastActiveAt:session.room.lastActiveAt||Math.floor(Date.now()/1000),hardMode:!!session.room.hardMode,gameRevision:Number(session.lastRevision||session.room.gameRevision||0),players:(session.room.players||[]).map(p=>({id:p.id,name:p.name,heroId:p.heroId||null,host:!!p.host}))};
    localStorage.setItem(RECOVERY_KEY,JSON.stringify({code:session.code,recoveryKey:rkey,playerId:session.playerId,playerSecret:session.playerSecret,lastActiveAt:Number(room.lastActiveAt||0),savedAt:Date.now(),revision:Number(session.lastRevision||room.gameRevision||0),room,state:st||null}));
  }catch{}}
  function clearResumeSession(){try{localStorage.removeItem(SESSION_KEY);localStorage.removeItem(RECOVERY_KEY);for(const k of LEGACY_RECOVERY_KEYS)localStorage.removeItem(k);for(const k of LEGACY_SESSION_KEYS)localStorage.removeItem(k)}catch{}renderResumeButton()}
  function renderResumeButton(){const b=$('netResume');if(!b)return;const x=readResumeSession();b.hidden=!x?.code;b.textContent=x?.code?`Продолжить партию · код ${x.code}`:'Продолжить последнюю партию'}
  function setRoomCodeUi(){const b=$('turnOrderBanner');if(b){if(session.code)b.dataset.roomCode=session.code;else delete b.dataset.roomCode}window.__RPG_ROOM_CODE__=session.code||'';engine()?.refreshUI?.()}
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
  function sideSnap(e=engine(),heroId=myHeroId()){try{return snap(e?.exportSideState?.(heroId)||null)}catch{return ''}}
  function auth(){return{playerId:session.playerId,playerSecret:session.playerSecret}}
  function acceptRoom(room){session.room=room;if(room?.recoveryKey)session.recoveryKey=room.recoveryKey;saveResumeSession();return room}
  function validRecoveryFor(code){const x=readRecoverySnapshot();if(!x||String(x.code)!==String(code)||!x.recoveryKey)return null;const last=Number(x.lastActiveAt||0);if(!last||Math.floor(Date.now()/1000)-last>10800)return null;return x}
  async function recoverSession(saved){const recovery=validRecoveryFor(saved?.code);const recoveryKey=saved?.recoveryKey||recovery?.recoveryKey;if(!recoveryKey)throw Object.assign(new Error('Нет актуального снимка партии для восстановления.'),{status:404});
    const d=await api(`/api/rooms/${saved.code}/resume`,{method:'POST',body:JSON.stringify({playerId:saved.playerId,playerSecret:saved.playerSecret,recoveryKey,recovery})});acceptRoom(d.room);return d;
  }

  function ensureTurnBanner(){
    let b=$('onlineTurnBanner');if(b)return b;
    b=document.createElement('div');b.id='onlineTurnBanner';b.className='online-turn-banner';b.hidden=true;document.body.appendChild(b);return b;
  }
  function updateTurnGuard(){
    if(!session.gameEntered)return;
    const b=ensureTurnBanner(),mine=myHeroId(),active=session.lastServerActiveHero||engine()?.currentPlayerId(),isMine=!!mine&&active===mine;if(session.code){const q=$('turnOrderBanner');if(q&&q.dataset.roomCode!==session.code){q.dataset.roomCode=session.code;window.__RPG_ROOM_CODE__=session.code;engine()?.refreshUI?.()}else window.__RPG_ROOM_CODE__=session.code}
    document.body.classList.add('online-game');document.body.classList.toggle('online-not-my-turn',!isMine);
    b.hidden=false;b.classList.toggle('mine',isMine);
    b.innerHTML=isMine?`Ваш ход · <b>${esc(heroName(mine))}</b>`:`Сейчас ходит <b>${esc(heroName(active))}</b> · ваш герой: ${esc(heroName(mine))}`;
  }
  function showHome(){
    clearInterval(session.timer);clearInterval(session.gameTimer);session={mode:null,code:null,playerId:null,playerSecret:null,recoveryKey:null,room:null,timer:null,gameTimer:null,gameEntered:false,lastRevision:0,lastSnapshot:'',lastServerActiveHero:null,syncBusy:false,lastSideSnapshot:''};
    $('onlineHome').hidden=false;$('onlineRoom').hidden=true;showError('');document.body.classList.remove('online-game','online-not-my-turn');const b=$('onlineTurnBanner');if(b)b.hidden=true;const q=$('turnOrderBanner');if(q)delete q.dataset.roomCode;window.__RPG_ROOM_CODE__='';renderResumeButton();
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
    const isHost=!!me?.host, ready=r.players.length>=2&&r.players.every(p=>p.heroId),hard=!!r.hardMode;
    const normalBtn=$('netModeNormal'),hardBtn=$('netModeHard');
    if(normalBtn){normalBtn.classList.toggle('selected',!hard);normalBtn.disabled=!isHost||r.started;normalBtn.onclick=()=>setRoomMode(false)}
    if(hardBtn){hardBtn.classList.toggle('selected',hard);hardBtn.disabled=!isHost||r.started;hardBtn.onclick=()=>setRoomMode(true)}
    if($('roomModeHint'))$('roomModeHint').textContent=`Режим партии: ${hard?'СЛОЖНЫЙ':'ОБЫЧНЫЙ'}. ${isHost&&!r.started?'Выбор хозяина применяется ко всем героям и блокируется после старта.':'Изменить режим во время партии нельзя.'}`;
    $('netStart').hidden=!isHost;$('netStart').disabled=!ready||r.started;$('netStart').textContent=r.started?'Комната запущена':'Начать сетевую игру';
    $('roomStatus').textContent=r.started?(r.gameReady?'Общая партия создана. Открываем карту…':'Комната запущена. Хозяин создаёт общую карту…'):ready?`Все готовы. Хозяин может начать · ${hard?'сложный':'обычный'} режим.`:`Игроков: ${r.players.length}/5. Нужно минимум 2 и каждый выбирает героя.`;
  }
  async function fetchGame(){
    return api(`/api/rooms/${session.code}/game?playerId=${encodeURIComponent(session.playerId)}&playerSecret=${encodeURIComponent(session.playerSecret)}`);
  }
  function enterGame(state,revision){
    const e=engine();if(!e||!state)return;
    if(session.code){const q=$('turnOrderBanner');if(q)q.dataset.roomCode=session.code;window.__RPG_ROOM_CODE__=session.code}if(session.room?.recoveryKey)session.recoveryKey=session.room.recoveryKey;e.applyState(state);e.setLocalHeroId?.(myHeroId());session.gameEntered=true;session.lastRevision=Number(revision||0);session.lastSnapshot=snap(e.exportState());session.lastServerActiveHero=activeHeroFromState(state);session.lastSideSnapshot=sideSnap(e,myHeroId());saveResumeSession();saveRecoverySnapshot(e.exportState());
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
        const ids=session.room.players.map(p=>p.heroId).filter(Boolean),initial=e.startWithHeroes(ids,{hardMode:!!session.room.hardMode});
        const d=await api(`/api/rooms/${session.code}/game/init`,{method:'POST',body:JSON.stringify({...auth(),state:initial})});
        enterGame(d.state,d.revision);
      }catch(err){showError(err.message)}
    }
  }
  async function refresh(){
    if(!session.code)return;
    const qs=session.playerId&&session.playerSecret?`?playerId=${encodeURIComponent(session.playerId)}&playerSecret=${encodeURIComponent(session.playerSecret)}`:'';
    try{acceptRoom(await api(`/api/rooms/${session.code}${qs}`));if(!session.gameEntered)renderRoom();if(session.room.started)await ensureOnlineGame()}catch(e){if(e.status===404&&session.playerId&&session.playerSecret){try{const saved={code:session.code,playerId:session.playerId,playerSecret:session.playerSecret,recoveryKey:session.recoveryKey};await recoverSession(saved);if(!session.gameEntered)renderRoom();if(session.room.started)await ensureOnlineGame();showError('');return}catch(re){showError(re.message);return}}showError(e.message)}
  }
  function poll(){clearInterval(session.timer);session.timer=setInterval(refresh,900)}
  async function pullGame(force=false){
    if(!session.gameEntered||session.syncBusy)return;
    session.syncBusy=true;
    try{
      const d=await fetchGame();if(!d.ready)return;const remoteRevision=Number(d.revision||0),remoteSnap=snap(d.state);
      // Side-sync (инвентарь/торговля) больше не двигает основную ревизию партии,
      // поэтому сравниваем не только revision, но и само серверное состояние.
      if(force||remoteRevision>session.lastRevision||remoteSnap!==session.lastSnapshot){
        const e=engine();e.applyState(d.state);session.lastRevision=remoteRevision;session.lastSnapshot=snap(e.exportState());session.lastServerActiveHero=activeHeroFromState(d.state);session.lastSideSnapshot=sideSnap(e,myHeroId());saveRecoverySnapshot(d.state);updateTurnGuard();
      }
    }catch(e){if(e.status!==202)console.warn('online pull',e)}finally{session.syncBusy=false}
  }
  async function syncGame(){
    if(!session.gameEntered||session.syncBusy)return;
    const e=engine(),mine=myHeroId();if(!e||!mine)return;
    const local=e.exportState(),localSnap=snap(local),serverActor=session.lastServerActiveHero;
    const side=e.exportSideState?.(mine)||null;
    if(localSnap!==session.lastSnapshot&&(serverActor===mine||e.canOffturnSharedAction?.(mine))){
      session.syncBusy=true;
      try{
        const d=await api(`/api/rooms/${session.code}/game/state`,{method:'POST',body:JSON.stringify({...auth(),baseRevision:session.lastRevision,state:local})});
        session.lastRevision=Number(d.revision||session.lastRevision+1);session.lastSnapshot=localSnap;session.lastServerActiveHero=activeHeroFromState(local);session.lastSideSnapshot=sideSnap(e,mine);saveRecoverySnapshot(local);updateTurnGuard();
      }catch(e2){console.warn('online push',e2);session.syncBusy=false;await pullGame(true);return}finally{session.syncBusy=false}
    }
    const sideNow=e.exportSideState?.(mine)||null;
    if(sideNow){
      const ss=snap(sideNow);
      if(ss!==session.lastSideSnapshot){
        session.syncBusy=true;
        try{
          const d=await api(`/api/rooms/${session.code}/game/side`,{method:'POST',body:JSON.stringify({...auth(),side:sideNow})});
          session.lastRevision=Number(d.revision??session.lastRevision);session.lastSideSnapshot=ss;saveRecoverySnapshot(e.exportState());
        }catch(err){console.warn('online side push',err)}finally{session.syncBusy=false}
      }
      // После любого фонового изменения сразу забираем объединённое состояние сервера.
      // Это одновременно доставляет торговые подтверждения и не даёт клиенту повторно
      // отправлять только что полученный side-state.
      await pullGame(false);return;
    }
    session.lastSideSnapshot='';
    await pullGame(false);
  }
  function startGameSync(){clearInterval(session.gameTimer);session.gameTimer=setInterval(syncGame,400);setTimeout(syncGame,80)}
  async function createRoom(){
    const name=$('netName').value.trim()||'Хозяин';showError('');
    try{const d=await api('/api/rooms',{method:'POST',body:JSON.stringify({name})});Object.assign(session,{mode:'online',code:d.room.code,playerId:d.playerId,playerSecret:d.playerSecret,recoveryKey:d.room.recoveryKey||null,room:d.room});saveResumeSession();renderRoom();poll()}catch(e){showError(e.message)}
  }
  async function joinRoom(){
    const name=$('netName').value.trim()||'Игрок',code=$('netCodeInput').value.replace(/\D/g,'').slice(0,6);if(code.length!==6)return showError('Введите 6-значный код комнаты.');
    showError('');try{const d=await api(`/api/rooms/${code}/join`,{method:'POST',body:JSON.stringify({name})});Object.assign(session,{mode:'online',code:d.room.code,playerId:d.playerId,playerSecret:d.playerSecret,recoveryKey:d.room.recoveryKey||null,room:d.room});saveResumeSession();renderRoom();poll()}catch(e){showError(e.message)}
  }
  async function selectHero(heroId){
    try{const d=await api(`/api/rooms/${session.code}/select`,{method:'POST',body:JSON.stringify({...auth(),heroId})});acceptRoom(d.room);renderRoom()}catch(e){showError(e.message);refresh()}
  }
  async function setRoomMode(hardMode){
    try{const d=await api(`/api/rooms/${session.code}/mode`,{method:'POST',body:JSON.stringify({...auth(),hardMode:!!hardMode})});acceptRoom(d.room);renderRoom()}catch(e){showError(e.message);refresh()}
  }
  async function startRoom(){
    try{const d=await api(`/api/rooms/${session.code}/start`,{method:'POST',body:JSON.stringify(auth())});acceptRoom(d.room);renderRoom();await ensureOnlineGame()}catch(e){showError(e.message)}
  }
  async function resumeRoom(){
    const saved=readResumeSession();if(!saved?.code||!saved?.playerId||!saved?.playerSecret)return showError('Нет сохранённого подключения.');
    showError('Подключаемся к сохранённой партии…');
    try{
      const d=await recoverSession(saved),room=d.room,me=room.players?.find(p=>p.id===saved.playerId);if(!me){clearResumeSession();throw new Error('Сохранённый игрок больше не найден в этой комнате.')}
      Object.assign(session,{mode:'online',code:saved.code,playerId:saved.playerId,playerSecret:saved.playerSecret,recoveryKey:room.recoveryKey||saved.recoveryKey||session.recoveryKey,room});if($('netName'))$('netName').value=me.name||saved.name||'';saveResumeSession();renderRoom();poll();if(room.started)await ensureOnlineGame();showError(d.revived?'Партия восстановлена после перезапуска сервера.':'');
    }catch(err){if(err.status===410||err.status===403)clearResumeSession();showError(`Не удалось продолжить партию: ${err.message}`)}
  }
  function localGame(){clearInterval(session.timer);clearInterval(session.gameTimer);overlay.hidden=true;document.body.classList.remove('net-lobby-open')}

  document.addEventListener('click',e=>{
    if(!session.gameEntered)return;
    const mine=myHeroId(),active=session.lastServerActiveHero||engine()?.currentPlayerId();if(!mine||mine===active)return;
    const t=e.target;if(!(t instanceof Element))return;
    const eng=engine(),sideMine=!!eng?.sideInteractionActiveFor?.(mine),sharedDecision=!!eng?.canOffturnSharedAction?.(mine),modalAllowed=!!eng?.canOffturnModalActionFor?.(mine);
    if(sharedDecision&&t.closest('#actionPanel'))return;
    if(modalAllowed&&t.closest('#modal'))return;
    if(t.closest('#combatHide,#combatJournalToggle,#combatRestoreButton'))return;
    if(sideMine&&t.closest('#modal,#sheetDrawer,#rollOverlay,#mobileHeroBtn,#mobileInventoryBtn'))return;
    if(t.closest('#mobileHeroBtn,#mobileInventoryBtn,#mobileJournalBtn,#inventoryBtn,#journalBtn,#sheetDrawer,#journalOverlay,.map-zoom-controls'))return;
    if(t.closest('#gameSection,#overlay,#modal,#rollOverlay')){e.preventDefault();e.stopImmediatePropagation();updateTurnGuard()}
  },true);

  window.addEventListener('rpg-side-interaction-change',e=>{if(!session.gameEntered)return;if(e.detail?.active){session.lastSideSnapshot=''}else{session.lastSideSnapshot='';setTimeout(()=>pullGame(true),80)}});

  $('netCreate').onclick=createRoom;$('netJoin').onclick=joinRoom;$('netResume').onclick=resumeRoom;$('netStart').onclick=startRoom;$('netBack').onclick=showHome;$('netLocal').onclick=localGame;
  $('netCodeInput').addEventListener('input',e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,6));
  document.body.classList.add('net-lobby-open');overlay.hidden=false;showHome();
})();
