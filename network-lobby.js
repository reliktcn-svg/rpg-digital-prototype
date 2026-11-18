(()=>{
  const HEROES=[
    ['warrior','Воин','#4c83ff'],['dwarf','Дворф','#d34b45'],['mage','Маг','#9d5cff'],['archer','Лучник','#4db76d'],['rogue','Разбойник','#444b55'],['paladin','Паладин','#e9ca46']
  ];
  let session={mode:null,code:null,playerId:null,playerSecret:null,recoveryKey:null,room:null,timer:null,gameTimer:null,gameEntered:false,lastRevision:0,lastSnapshot:'',lastServerActiveHero:null,syncBusy:false,lastSideSnapshot:'',lastServerState:null,sideAcks:{}};
  const CLIENT_BUILD='0.6.6'; // v0.6.87: map observers are independent from this player session
  const SESSION_KEY='rpg-online-session';
  const RECOVERY_KEY='rpg-online-recovery-v0635';
  const LEGACY_RECOVERY_KEYS=['rpg-online-recovery-v0634'];
  const LEGACY_SESSION_KEYS=['rpg-online-session-v0632'];
  function saveResumeSession(){try{if(!session.code||!session.playerId||!session.playerSecret)return;const saved={code:session.code,playerId:session.playerId,playerSecret:session.playerSecret,recoveryKey:session.recoveryKey||session.room?.recoveryKey||null,name:myPlayer()?.name||$('netName')?.value||'',heroId:myHeroId(),participants:(session.room?.players||[]).map(p=>({name:p.name,heroId:p.heroId})),expiresAt:session.room?.expiresAt||0,build:CLIENT_BUILD,savedAt:Date.now()};localStorage.setItem(SESSION_KEY,JSON.stringify(saved));window.RPGPartyLibrary?.put(saved);saveRecoverySnapshot();renderResumeButton()}catch(e){console.warn('Не удалось записать список партий',e);}}
  function readResumeSession(){try{const keys=[SESSION_KEY,...LEGACY_SESSION_KEYS];for(const k of keys){const raw=localStorage.getItem(k);if(raw){const v=JSON.parse(raw);if(v?.code&&v?.playerId&&v?.playerSecret){if(k!==SESSION_KEY)localStorage.setItem(SESSION_KEY,raw);window.RPGPartyLibrary?.migrate(v,readRecoverySnapshot());return v}}}return null}catch{return null}}
  function readRecoverySnapshot(){try{for(const k of [RECOVERY_KEY,...LEGACY_RECOVERY_KEYS]){const raw=localStorage.getItem(k);if(raw){const v=JSON.parse(raw);if(k!==RECOVERY_KEY)localStorage.setItem(RECOVERY_KEY,raw);return v}}return null}catch{return null}}
  function saveRecoverySnapshot(stateOverride){try{
    if(!session.code||!session.playerId||!session.playerSecret||!session.room)return;
    const rkey=session.recoveryKey||session.room?.recoveryKey;if(!rkey)return;
    session.recoveryKey=rkey;
    const st=stateOverride!==undefined?stateOverride:(session.gameEntered?exported():null);
    const room={code:session.room.code,started:!!session.room.started,createdAt:session.room.createdAt||Math.floor(Date.now()/1000),lastActiveAt:session.room.lastActiveAt||Math.floor(Date.now()/1000),hardMode:false,enemyScaling:session.room.enemyScaling!==false,gameRevision:Number(session.lastRevision||session.room.gameRevision||0),gameUpdatedAt:Number(session.room.gameUpdatedAt||0),players:(session.room.players||[]).map(p=>({id:p.id,name:p.name,heroId:p.heroId||null,host:!!p.host}))};
    localStorage.setItem(RECOVERY_KEY,JSON.stringify({code:session.code,recoveryKey:rkey,playerId:session.playerId,playerSecret:session.playerSecret,lastActiveAt:Number(room.lastActiveAt||0),build:CLIENT_BUILD,savedAt:Date.now(),revision:Number(session.lastRevision||room.gameRevision||0),room,state:st||null}));
  }catch{}}
  function clearResumeSession(){try{localStorage.removeItem(SESSION_KEY);localStorage.removeItem(RECOVERY_KEY);for(const k of LEGACY_RECOVERY_KEYS)localStorage.removeItem(k);for(const k of LEGACY_SESSION_KEYS)localStorage.removeItem(k)}catch{}renderResumeButton()}
  function renderResumeButton(){readResumeSession();const rows=window.RPGPartyLibrary?.all()||[];const b=$('netResume');if(b){b.hidden=!rows.length;b.textContent='Мои партии · '+rows.length;}const front=$('heartParties');if(front){front.hidden=!rows.length;front.textContent='Мои партии · '+rows.length;}}
  function setRoomCodeUi(){const b=$('turnOrderBanner');if(b){if(session.code)b.dataset.roomCode=session.code;else delete b.dataset.roomCode}window.__RPG_ROOM_CODE__=session.code||'';engine()?.refreshUI?.()}
  const $=id=>document.getElementById(id);
  const overlay=$('onlineLobby');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const heroName=id=>(HEROES.find(h=>h[0]===id)||[])[1]||id||'—';
  const engine=()=>window.__RPG_ONLINE__||null;
  async function api(path,opts={}){
    const owner=session,controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const r=await fetch(path,{...opts,headers:{'Content-Type':'application/json','X-RPG-Protocol':String(window.RPG_CLIENT_BUILD?.protocol||1),...(opts.headers||{})},cache:'no-store',signal:controller.signal});
      if(owner!==session)throw Object.assign(new Error('Сессия уже закрыта'),{cancelled:true});
      if(r.status===304)return {notModified:true};
      const d=await r.json().catch(()=>({}));if(owner!==session)throw Object.assign(new Error('Сессия уже закрыта'),{cancelled:true});
      if(r.status===426)window.dispatchEvent(new CustomEvent('rpg-incompatible'));
      if(!r.ok){const err=new Error(d.error||`Ошибка ${r.status}`);err.status=r.status;err.data=d;throw err}
      const etag=r.headers.get('ETag');if(etag)d._etag=etag;return d;
    }finally{clearTimeout(timeout)}
  }
  function showError(msg=''){ $('onlineError').textContent=msg; }
  function myPlayer(){return session.room?.players?.find(p=>p.id===session.playerId)||null}
  function myHeroId(){return myPlayer()?.heroId||null}
  function activeHeroFromState(st){return st?.order?.[st?.currentIndex??0]||null}
  function exported(){const e=engine();return e?e.exportState():null}
  function snap(st){try{return JSON.stringify(st)}catch{return ''}}
  function sideSnap(e=engine(),heroId=myHeroId()){try{return snap(e?.exportSideState?.(heroId)||null)}catch{return ''}}
  // Send only fields changed by this device. A stale phone inventory view must
  // never overwrite poison/weakness/loot granted to its hero on another turn.
  function acknowledgeSideVersions(result){
    const versions=result?.sideVersions||{};const mine=myHeroId();if(mine&&versions[mine]!=null)session.sideAcks[mine]=Math.max(session.sideAcks[mine]||0,Number(versions[mine]||0));
  }
  function sideDelta(source){
    if(!source)return null;
    const baseline=session.lastServerState||{};
    const original=new Map((baseline.players||[]).map(p=>[p.id,p]));
    const allowed=new Set(['gold','maxHp','currentHp','statuses','statusTimers','statusTickedTurn','backpack','pendingItems','equipment','temporaryEffects','combatEffects','itemUsage','lockedItems','locationVisits','discoveredLocations','reexploreRiskHex','notes','stats','areaHealingCooldown','scoutBootsUsedTurn','territoryBuildSeq']);
    const out={type:source.type,ownerId:source.ownerId,players:[]};
    for(const item of source.players||[]){
      const was=original.get(item.id)||{};const patch={id:item.id};
      for(const key of allowed){if(Object.prototype.hasOwnProperty.call(item,key)&&snap(item[key])!==snap(was[key]))patch[key]=item[key]}
      if(Object.keys(patch).length>1)out.players.push(patch);
    }
    for(const key of ['decks','locations','tradeDeal','territories','areas','nextAreaId']){
      if(Object.prototype.hasOwnProperty.call(source,key)&&snap(source[key])!==snap(baseline[key]))out[key]=source[key];
    }
    if(Array.isArray(source.journal)&&snap(source.journal)!==snap(baseline.journal))out.journal=source.journal;
    return out;
  }

  function auth(){return{playerId:session.playerId,playerSecret:session.playerSecret}}
  function updateHeroPlayerNames(room){window.__RPG_HERO_PLAYER_NAMES__=Object.fromEntries((room?.players||[]).filter(p=>p.heroId&&p.name).map(p=>[p.heroId,p.name]));}
  function acceptRoom(room){session.room=room;updateHeroPlayerNames(room);if(room?.recoveryKey)session.recoveryKey=room.recoveryKey;saveResumeSession();return room}
  function validRecoveryFor(code){const x=readRecoverySnapshot();if(!x||String(x.code)!==String(code)||!x.recoveryKey||x.build!==CLIENT_BUILD)return null;const last=Number(x.room?.gameUpdatedAt||x.lastActiveAt||0);if(!last||Math.floor(Date.now()/1000)-last>604800)return null;return x}
  async function recoverSession(saved){const recovery=validRecoveryFor(saved?.code);const recoveryKey=saved?.recoveryKey||recovery?.recoveryKey;if(!recoveryKey)throw Object.assign(new Error('Нет актуального снимка партии для восстановления.'),{status:404});
    const d=await api(`/api/rooms/${saved.code}/resume`,{method:'POST',body:JSON.stringify({playerId:saved.playerId,playerSecret:saved.playerSecret,recoveryKey,recovery})});acceptRoom(d.room);return d;
  }

  function ensureTurnBanner(){
    let b=$('onlineTurnBanner');if(b)return b;
    b=document.createElement('div');b.id='onlineTurnBanner';b.className='online-turn-banner';b.hidden=true;document.body.appendChild(b);return b;
  }
  let presenceTimer=null,waitingPanel=null;
  function setWaiting(waiting,missing=[]){
    window.__RPG_NETWORK_WAITING__=!!waiting;
    if(!waitingPanel){waitingPanel=document.createElement('div');waitingPanel.id='rpgNetworkWaiting';waitingPanel.hidden=true;
      waitingPanel.innerHTML='<div class="rpg-waiting-panel"><h2>Ожидание подключения игроков</h2><p></p></div>';document.body.append(waitingPanel)}
    waitingPanel.hidden=!waiting;
    waitingPanel.querySelector('p').textContent=missing.length?`Ожидаем: ${missing.map(heroName).join(', ')}`:'Связь с сервером восстанавливается…';
  }
  async function checkPresence(){
    if(!session.gameEntered||!session.code)return;
    const own=session;
    try{const d=await api(`/api/rooms/${session.code}/presence?playerId=${encodeURIComponent(session.playerId)}&playerSecret=${encodeURIComponent(session.playerSecret)}&chatAfter=${window.RPGPartyChat?.cursor()||0}`);
      if(own!==session)return;
      receiveVoting(d,true);
      if(window.__RPG_VOTE_EXCLUDED__){setWaiting(false);await pullGame(true,true);return;}
      window.RPGPartyChat?.receive({code:session.code,playerId:session.playerId,send:payload=>api(`/api/rooms/${own.code}/chat`,{method:"POST",body:JSON.stringify({playerId:own.playerId,playerSecret:own.playerSecret,...payload})})},d);
      const missing=(d.players||session.room?.players||[]).filter(p=>!(d.online||[]).includes(p.id)).map(p=>p.heroId||p.name||p.id);
      const waiting=missing.length>0;
      setWaiting(waiting,missing);
      if(!waiting)syncGame();
    }catch(err){if(own===session)setWaiting(true)}
  }
  window.RPGChatRefresh=checkPresence;
  function receiveVoting(d,fresh=false){if(d?.voting&&session.room){for(const p of session.room.players||[]){const authoritative=d.voting.participants.find(a=>a.id===p.id);if(authoritative){p.host=authoritative.host;p.exclusion=!!authoritative.exclusion;}}}if(d?.voting)window.RPGPartyVoting?.receive({code:session.code,playerId:session.playerId,send:payload=>api(`/api/rooms/${session.code}/vote`,{method:'POST',body:JSON.stringify({...auth(),...payload})})},d.voting,fresh);}
  window.RPGVotingRefresh=async()=>{await checkPresence();await pullGame(true,false);};
  function startPresence(){clearInterval(presenceTimer);setWaiting(true);checkPresence();presenceTimer=setInterval(checkPresence,5000)}
  function stopPresence(){clearInterval(presenceTimer);presenceTimer=null;setWaiting(false)}
  function updateTurnGuard(){
    if(!session.gameEntered)return;
    const b=ensureTurnBanner(),mine=myHeroId(),active=session.lastServerActiveHero||engine()?.currentPlayerId(),isMine=!!mine&&active===mine;if(session.code){const q=$('turnOrderBanner');if(q&&q.dataset.roomCode!==session.code){q.dataset.roomCode=session.code;window.__RPG_ROOM_CODE__=session.code;engine()?.refreshUI?.()}else window.__RPG_ROOM_CODE__=session.code}
    document.body.classList.add('online-game');document.body.classList.toggle('online-not-my-turn',!isMine);
    b.hidden=false;b.classList.toggle('mine',isMine);
    b.innerHTML=isMine?`Ваш ход · <b>${esc(heroName(mine))}</b>`:`Сейчас ходит <b>${esc(heroName(active))}</b> · ваш герой: ${esc(heroName(mine))}`;
  }
  function showHome(){
    window.RPGPartyChat?.reset();window.RPGPartyVoting?.reset();
    stopPresence();clearInterval(session.timer);clearInterval(session.gameTimer);clearTimeout(session.kickTimer);clearTimeout(localMutationTimer);session={mode:null,code:null,playerId:null,playerSecret:null,recoveryKey:null,room:null,timer:null,gameTimer:null,gameEntered:false,lastRevision:0,lastSnapshot:'',lastServerActiveHero:null,syncBusy:false,lastSideSnapshot:'',lastServerState:null,sideAcks:{}};
    window.__RPG_HERO_PLAYER_NAMES__={};$('onlineHome').hidden=false;$('onlineRoom').hidden=true;showError('');document.body.classList.remove('online-game','online-not-my-turn');const b=$('onlineTurnBanner');if(b)b.hidden=true;const q=$('turnOrderBanner');if(q)delete q.dataset.roomCode;window.__RPG_ROOM_CODE__='';renderResumeButton();
  }
  function renderRoom(){
    const r=session.room;if(!r)return;$('partyLibraryPanel').hidden=true;updateHeroPlayerNames(r);
    $('heartFront').hidden=true;$('networkHeading').hidden=false;$('onlineHome').hidden=true;$('onlineRoom').hidden=false;
    $('roomCode').textContent=r.code;
    const me=myPlayer();$('roomWho').textContent=me?`${me.name}${me.host?' · хозяин':''}`:'';
    $('roomPlayers').innerHTML=r.players.map(p=>`<div class="net-player ${p.id===session.playerId?'me':''}"><b>${esc(p.name)}</b><span>${p.heroId?esc(heroName(p.heroId)):'герой не выбран'}</span>${p.host?'<em>Хозяин</em>':''}</div>`).join('')+((Number(r.mapViewers)||0)>0?`<div class="net-player net-map-observer"><b>🗺 Карта</b><span>Подключено экранов: ${Number(r.mapViewers)}</span></div>`:'');
    const taken=new Map(r.players.filter(p=>p.heroId).map(p=>[p.heroId,p]));
    $('netHeroPicker').innerHTML=HEROES.map(([id,name,color])=>{
      const owner=taken.get(id), mine=owner?.id===session.playerId, disabled=owner&&!mine;
      return `<button class="net-hero ${mine?'selected':''}" data-hero="${id}" ${disabled||r.started?'disabled':''} style="--hc:${color}"><img class="net-hero-art" src="assets/heroes/${id}.webp" alt="" loading="lazy"><b>${name}</b><small>${disabled?'занят: '+esc(owner.name):mine?'выбран вами':'свободен'}</small></button>`;
    }).join('')+`<button hidden class="net-hero net-hero-map" type="button" id="netSelectMap" style="--hc:#d7b570" ${me?.host||r.started?'disabled':''}><span class="net-map-art" aria-hidden="true">🗺</span><b>Карта</b><small>${me?.host?'Только с другого устройства':'Общее поле без выбора героя'}</small></button>`;
    $('netHeroPicker').querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>selectHero(b.dataset.hero));
    $('netSelectMap').onclick=convertToMap;

    const isHost=!!me?.host, ready=r.players.length>=2&&r.players.every(p=>p.heroId);
    const scaling=$('netEnemyScaling');scaling.value=r.enemyScaling===false?'no':'yes';scaling.disabled=!isHost||r.started;scaling.onchange=()=>setRoomMode(scaling.value!=='no');
    $('netStart').hidden=!isHost;$('netStart').disabled=!ready||r.started;$('netStart').textContent=r.started?'Комната запущена':'Начать сетевую игру';
    $('roomStatus').textContent=r.started?(r.gameReady?'Общая партия создана. Открываем карту…':'Комната запущена. Хозяин создаёт общую карту…'):ready?'Все готовы. Хозяин может начать приключение.':`Игроков: ${r.players.length}/6. Нужно минимум 2 и каждый выбирает героя.`;
  }
  async function fetchGame(conditional=false){
    const d=await api(`/api/rooms/${session.code}/game?playerId=${encodeURIComponent(session.playerId)}&playerSecret=${encodeURIComponent(session.playerSecret)}`,{headers:conditional&&session.gameETag?{'If-None-Match':session.gameETag}:{}});
    if(session.room){session.room.lastActiveAt=Math.floor(Date.now()/1000);if(Date.now()-(session.lastRecoveryHeartbeat||0)>60000){session.lastRecoveryHeartbeat=Date.now();saveRecoverySnapshot()}}
    return d;
  }
  function enterGame(state,revision){clearInterval(session.timer);session.timer=null;window.__RPG_NET_CONNECTED__=true;
    const e=engine();if(!e||!state)return;
    if(session.code){const q=$('turnOrderBanner');if(q)q.dataset.roomCode=session.code;window.__RPG_ROOM_CODE__=session.code}if(session.room?.recoveryKey)session.recoveryKey=session.room.recoveryKey;e.applyState(state);e.setLocalHeroId?.(myHeroId());session.gameEntered=true;session.lastRevision=Number(revision||0);session.lastServerState=state;session.lastSnapshot=snap(e.exportState());session.lastServerActiveHero=activeHeroFromState(state);session.lastSideSnapshot=sideSnap(e,myHeroId());saveResumeSession();saveRecoverySnapshot(e.exportState());
    overlay.hidden=true;document.body.classList.remove('net-lobby-open');updateTurnGuard();startGameSync();startPresence();
  }
  async function ensureOnlineGame(){
    if(!session.room?.started||session.entering)return;
    const owner=session;session.entering=true;try{
    const e=engine();if(!e)return showError('Игровой модуль ещё загружается.');
    if(session.room.gameReady){
      if(session.gameEntered)return;
      try{const d=await fetchGame();if(d.ready&&d.state)enterGame(d.state,d.revision)}catch(err){showError(err.message)}
      return;
    }
    const me=myPlayer();
    if(me?.host&&!session.gameEntered){
      try{
        const ids=session.room.players.map(p=>p.heroId).filter(Boolean),initial=e.startWithHeroes(ids,{hardMode:false,enemyScaling:session.room.enemyScaling!==false});
        const d=await api(`/api/rooms/${session.code}/game/init`,{method:'POST',body:JSON.stringify({...auth(),state:initial})});
        enterGame(d.state,d.revision);
      }catch(err){showError(err.message)}
    }
    }finally{owner.entering=false}
  }
  async function refresh(){
    if(!session.code||session.refreshBusy||session.gameEntered)return;
    const owner=session;session.refreshBusy=true;
    const qs=session.playerId&&session.playerSecret?`?playerId=${encodeURIComponent(session.playerId)}&playerSecret=${encodeURIComponent(session.playerSecret)}`:'';
    try{acceptRoom(await api(`/api/rooms/${session.code}${qs}`));if(!session.gameEntered)renderRoom();if(session.room.started)await ensureOnlineGame()}catch(e){if(e.status===404&&session.playerId&&session.playerSecret){try{const saved={code:session.code,playerId:session.playerId,playerSecret:session.playerSecret,recoveryKey:session.recoveryKey};await recoverSession(saved);if(!session.gameEntered)renderRoom();if(session.room.started)await ensureOnlineGame();showError('');return}catch(re){showError(re.message);return}}showError(e.message)}finally{owner.refreshBusy=false}
  }
  function poll(){clearInterval(session.timer);session.timer=setInterval(refresh,900)}
  async function pullGame(force=false,discardLocal=false){
    if(!session.gameEntered||session.syncBusy)return;
    const owner=session;session.syncBusy=true;
    try{
      const d=await fetchGame(!force);if(d.notModified||!d.ready)return;receiveVoting(d);const remoteRevision=Number(d.revision||0),remoteSnap=snap(d.state);
      // Side-sync (инвентарь/торговля) больше не двигает основную ревизию партии,
      // поэтому сравниваем не только revision, но и само серверное состояние.
      // A local sale/equip/loot change has not yet been acknowledged by the server.
      // Do not replace the local snapshot with an older poll response.
      const current=engine()?.exportState?.();
      if((current?.membershipRevision||0)!==(d.state?.membershipRevision||0))discardLocal=true;
      const unsent=current&&snap(current)!==session.lastSnapshot;
      const dirtySide=sideSnap(engine(),myHeroId())!==session.lastSideSnapshot;
      if(unsent&&!discardLocal&&(session.lastServerActiveHero===myHeroId()||engine()?.canOffturnSharedAction?.(myHeroId())||dirtySide))return;
      if(force||remoteRevision>session.lastRevision||remoteSnap!==session.lastSnapshot){
        const e=engine();e.applyState(d.state);session.gameETag=d._etag;acknowledgeSideVersions(d);session.lastServerState=d.state;session.lastRevision=remoteRevision;session.lastSnapshot=snap(e.exportState());session.lastServerActiveHero=activeHeroFromState(d.state);session.lastSideSnapshot=sideSnap(e,myHeroId());saveRecoverySnapshot(d.state);updateTurnGuard();
      }
      acknowledgeSideVersions(d);session.gameETag=d._etag;
    }catch(e){if(e.status===404){try{session.gameETag=null;await recoverSession({code:session.code,playerId:session.playerId,playerSecret:session.playerSecret,recoveryKey:session.recoveryKey})}catch(re){console.warn('online recovery',re)}}else if(e.status!==202)console.warn('online pull',e)}finally{owner.syncBusy=false}
  }
  async function settleVote(){if(!window.__RPG_VOTE_PENDING__||session.voteSettleBusy||myHeroId()!==session.lastServerActiveHero||!window.RPGVoteSafeBoundary?.()||snap(engine()?.exportState?.())!==session.lastSnapshot)return;const owner=session;owner.voteSettleBusy=true;try{const d=await api(`/api/rooms/${session.code}/vote`,{method:'POST',body:JSON.stringify({...auth(),action:'settle'})});if(owner===session){receiveVoting(d,true);session.gameETag=null;}}catch(e){if(owner===session)console.warn('vote safe boundary',e.message)}finally{owner.voteSettleBusy=false;}}
  async function syncGame(){
    if(!session.gameEntered||session.syncBusy)return;
    if(window.__RPG_VOTE_EXCLUDED__||(window.__RPG_NETWORK_WAITING__&&!window.__RPG_VOTE_PENDING__)){await pullGame();return;}
    await settleVote();
    if(window.__RPG_VOTE_EXCLUDED__)return;
    const syncOwner=session;
    const e=engine(),mine=myHeroId();if(!e||!mine)return;
    const local=e.exportState(),localSnap=snap(local),serverActor=session.lastServerActiveHero;
    const side=e.exportSideState?.(mine)||null;
    if(localSnap!==session.lastSnapshot&&(serverActor===mine||e.canOffturnSharedAction?.(mine))){
      session.syncBusy=true;session.gameETag=null;
      try{
        const d=await api(`/api/rooms/${session.code}/game/state`,{method:'POST',body:JSON.stringify({...auth(),baseRevision:session.lastRevision,sideAcks:session.sideAcks,state:local})});
        session.lastRevision=Number(d.revision||session.lastRevision+1);session.lastServerState=local;session.lastSnapshot=localSnap;session.lastServerActiveHero=activeHeroFromState(local);session.lastSideSnapshot=sideSnap(e,mine);saveRecoverySnapshot(local);updateTurnGuard();
      }catch(e2){if(e2.cancelled)return;console.warn('online push',e2);session.syncBusy=false;
        // 409 means another main-turn state is already authoritative. Do not
        // retry the obsolete turn forever, and do not replay its spent items.
        await pullGame(true,e2.status===409);return
      }finally{syncOwner.syncBusy=false}
      // User made more sales/moves while the request was in flight.
      // Keep the local state intact and commit it on the next tick.
      if(snap(e.exportState())!==localSnap){queueMicrotask(syncGame);return;}
    }
    const sideNow=e.exportSideState?.(mine)||null;
    if(sideNow){
      const ss=snap(sideNow);
      if(ss!==session.lastSideSnapshot){
        session.syncBusy=true;session.gameETag=null;
        try{
          const d=await api(`/api/rooms/${session.code}/game/side`,{method:'POST',body:JSON.stringify({...auth(),side:sideDelta(sideNow)})});
          session.lastRevision=Number(d.revision??session.lastRevision);acknowledgeSideVersions(d);session.lastSideSnapshot=ss;saveRecoverySnapshot(e.exportState());if(sideNow.type==='victory')e.acknowledgeVictorySide?.();
        }catch(err){if(err.cancelled)return;console.warn('online side push',err)}finally{syncOwner.syncBusy=false}
      }
      // После любого фонового изменения сразу забираем объединённое состояние сервера.
      // Это одновременно доставляет торговые подтверждения и не даёт клиенту повторно
      // отправлять только что полученный side-state.
      if(sideSnap(e,mine)!==ss){queueMicrotask(syncGame);return;}
      await pullGame(false);return;
    }
    session.lastSideSnapshot='';
    await pullGame(false);
  }
  // Явная надёжная фиксация операций торговца: не позволяем закрыть окно,
  // пока последняя версия золота, инвентаря и колод не записана сервером.
  async function flushMerchant(ownerId){
    if(!session.gameEntered)return true;
    if(!ownerId||ownerId!==myHeroId())throw new Error('Недоступно сохранение для другого героя.');
    const ownerSession=session,started=Date.now();
    while(session.syncBusy){if(ownerSession!==session)throw Error('Сессия закрыта');
      if(Date.now()-started>15000)throw new Error('Сервер долго занят. Попробуйте снова.');
      await new Promise(resolve=>setTimeout(resolve,45));
    }
    session.syncBusy=true;session.gameETag=null;
    try{
      const e=engine();let retries=0;
      while(retries++<4){
        const before=e?.exportSideState?.(ownerId);
        if(!before||before.ownerId!==ownerId)throw new Error('Торговая сессия уже закрыта.');
        const saved=await api(`/api/rooms/${session.code}/game/side`,{method:'POST',body:JSON.stringify({...auth(),side:sideDelta(before)})});acknowledgeSideVersions(saved);
        // Не только ответ 200: считываем состояние с сервера и сверяем
        // деньги/предметы с последним подтверждаемым действием.
        const verified=await fetchGame();acknowledgeSideVersions(verified);
        const wanted=(before.players||[]).find(p=>p.id===ownerId);
        const actual=(verified.state?.players||[]).find(p=>p.id===ownerId);
        const fields=['gold','backpack','equipment','pendingItems','itemUsage'];
        const matched=!!wanted&&!!actual&&fields.every(key=>snap(wanted[key]??null)===snap(actual[key]??null));
        if(!matched)continue;
        session.lastSideSnapshot=snap(before);
        session.lastServerState=verified.state;session.lastSnapshot=snap(e.exportState());
        saveRecoverySnapshot(e.exportState());
        if(snap(e.exportSideState?.(ownerId))===snap(before))return true;
      }
      throw new Error('Данные изменились во время сохранения. Повторите попытку.');
    }finally{ownerSession.syncBusy=false}
  }
  window.__RPG_NETWORK_PROGRESSION__={active:()=>session.gameEntered,learn:async(heroId,nodeId)=>{
    if(heroId!==myHeroId())throw Error('Можно развивать только своего героя');
    const ownerSession=session,started=Date.now();const waitIdle=async()=>{while(session.syncBusy){if(ownerSession!==session)throw Error('Сессия закрыта');if(Date.now()-started>15000)throw Error('Сервер занят. Попробуйте снова.');await new Promise(r=>setTimeout(r,40))}};
    await waitIdle();await syncGame();await waitIdle();session.syncBusy=true;session.gameETag=null;
    try{const result=await api(`/api/rooms/${session.code}/game/ability`,{method:'POST',body:JSON.stringify({...auth(),nodeId})});return result}finally{ownerSession.syncBusy=false}
  }};
  window.__RPG_NETWORK_PROGRESSION__.reset=async(heroId,cardId)=>{
    if(heroId!==myHeroId())throw Error('Можно перераспределить способности только своего героя');
    const ownerSession=session,start=Date.now();const idle=async()=>{while(session.syncBusy){if(ownerSession!==session)throw Error('Сессия закрыта');if(Date.now()-start>15000)throw Error('Сервер занят');await new Promise(r=>setTimeout(r,40))}};
    await idle();await syncGame();await idle();session.syncBusy=true;session.gameETag=null;
    try{
      const result=await api(`/api/rooms/${session.code}/game/respec`,{method:'POST',body:JSON.stringify({...auth(),cardId})});
      acknowledgeSideVersions(result);return result;
    }finally{ownerSession.syncBusy=false}
  };
  window.RPGPrepareUpdateReload=async()=>{
    if(!session.gameEntered){await engine()?.saveLocal?.();return}
    const owner=session,start=Date.now();const idle=async()=>{while(session.syncBusy){if(Date.now()-start>15000||owner!==session)throw Error('Нет подтверждения сервера');await new Promise(r=>setTimeout(r,40))}};
    await idle();await syncGame();await idle();
    if(snap(engine()?.exportState())!==session.lastSnapshot)throw Error('Остались неподтверждённые действия');
    saveRecoverySnapshot(engine()?.exportState());saveResumeSession();
  };
  window.__RPG_NET_FLUSH_MERCHANT__=flushMerchant;
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(session.gameEntered)syncGame();else refresh()}});
  window.addEventListener('online',()=>{session.gameETag=null;if(session.gameEntered)syncGame();else refresh()});
  let localMutationTimer=null;
  window.addEventListener('rpg-local-mutation',()=>{if(!session.gameEntered)return;clearTimeout(localMutationTimer);localMutationTimer=setTimeout(syncGame,30)});
  function startGameSync(){clearInterval(session.gameTimer);clearTimeout(session.kickTimer);session.gameTimer=setInterval(syncGame,400);session.kickTimer=setTimeout(syncGame,80)}
  async function createRoom(){
    const name=$('netName').value.trim()||'Хозяин';showError('');
    try{const d=await api('/api/rooms',{method:'POST',body:JSON.stringify({name})});Object.assign(session,{mode:'online',code:d.room.code,playerId:d.playerId,playerSecret:d.playerSecret,recoveryKey:d.room.recoveryKey||null,room:d.room});saveResumeSession();renderRoom();poll()}catch(e){showError(e.message)}
  }
  async function joinRoom(){
    const name=$('netName').value.trim()||'Игрок',code=$('netCodeInput').value.replace(/\D/g,'').slice(0,6);if(code.length!==6)return showError('Введите 6-значный код комнаты.');
    showError('');try{const d=await api(`/api/rooms/${code}/join`,{method:'POST',body:JSON.stringify({name})});Object.assign(session,{mode:'online',code:d.room.code,playerId:d.playerId,playerSecret:d.playerSecret,recoveryKey:d.room.recoveryKey||null,room:d.room});saveResumeSession();renderRoom();poll()}catch(e){showError(e.message)}
  }
  async function convertToMap(){
    try{
      const d=await api(`/api/rooms/${session.code}/map/convert`,{method:'POST',body:JSON.stringify(auth())});
      localStorage.setItem('rpg-map-viewer-v0687',JSON.stringify(d));
      clearResumeSession();
      location.href=`map.html?code=${encodeURIComponent(session.code)}`;
    }catch(e){showError(e.message);refresh()}
  }
  async function selectHero(heroId){
    try{const d=await api(`/api/rooms/${session.code}/select`,{method:'POST',body:JSON.stringify({...auth(),heroId})});acceptRoom(d.room);renderRoom()}catch(e){showError(e.message);refresh()}
  }
  async function setRoomMode(enemyScaling=session.room.enemyScaling!==false){
    try{const d=await api(`/api/rooms/${session.code}/mode`,{method:'POST',body:JSON.stringify({...auth(),hardMode:false,enemyScaling})});acceptRoom(d.room);renderRoom()}catch(e){showError(e.message);refresh()}
  }
  async function startRoom(){
    try{const d=await api(`/api/rooms/${session.code}/start`,{method:'POST',body:JSON.stringify(auth())});acceptRoom(d.room);renderRoom();await ensureOnlineGame()}catch(e){showError(e.message)}
  }
  async function resumeRoom(candidate=null){
    const saved=candidate?.code?candidate:readResumeSession();if(!saved?.code||!saved?.playerId||!saved?.playerSecret||saved.build!==CLIENT_BUILD)return showError('Нет сохранённой партии этой версии. Старые сохранения сохранены отдельно.');
    showError('Подключаемся к сохранённой партии…');
    try{
      const d=await recoverSession(saved),room=d.room,me=room.players?.find(p=>p.id===saved.playerId);if(!me){clearResumeSession();throw new Error('Сохранённый игрок больше не найден в этой комнате.')}
      Object.assign(session,{mode:'online',code:saved.code,playerId:saved.playerId,playerSecret:saved.playerSecret,recoveryKey:room.recoveryKey||saved.recoveryKey||session.recoveryKey,room});if($('netName'))$('netName').value=me.name||saved.name||'';saveResumeSession();renderRoom();poll();if(room.started)await ensureOnlineGame();showError(d.revived?'Партия восстановлена после перезапуска сервера.':'');
    }catch(err){showError(`Не удалось продолжить партию: ${err.message}`)}
  }
  function localGame(){showHome();window.__RPG_NET_CONNECTED__=false;overlay.hidden=true;document.body.classList.remove('net-lobby-open')}

  document.addEventListener('click',e=>{
    if(!session.gameEntered)return;
    const mine=myHeroId(),active=session.lastServerActiveHero||engine()?.currentPlayerId();if(!mine||mine===active)return;
    const t=e.target;if(!(t instanceof Element))return;
    const eng=engine(),sideMine=!!eng?.sideInteractionActiveFor?.(mine),sharedDecision=!!eng?.canOffturnSharedAction?.(mine),modalAllowed=!!eng?.canOffturnModalActionFor?.(mine);
    if(t.closest('[data-buy-territory]')?.dataset.buyTerritory===mine)return;
    if(sharedDecision&&t.closest('#actionPanel'))return;
    if(modalAllowed&&t.closest('#modal'))return;
    if(t.closest('#combatHide,#combatJournalToggle,#combatRestoreButton,#turnOrderBanner,#settingsOverlay,.dice-settings,#bossInfoOverlay'))return;
    if(sideMine&&t.closest('#modal,#sheetDrawer,#rollOverlay,#mobileHeroBtn,#mobileInventoryBtn'))return;
    if(t.closest('#mobileHeroBtn,#mobileInventoryBtn,#mobileJournalBtn,#inventoryBtn,#journalBtn,#sheetDrawer,#journalOverlay,#settingsOverlay,.skill-tree-dialog,.skill-detail-dialog,.map-zoom-controls'))return;
    if(t.closest('#gameSection,#overlay,#modal,#rollOverlay')){e.preventDefault();e.stopImmediatePropagation();updateTurnGuard()}
  },true);

  window.addEventListener('rpg-side-interaction-change',e=>{if(!session.gameEntered)return;if(e.detail?.active){session.lastSideSnapshot=''}else{session.lastSideSnapshot='';setTimeout(()=>syncGame(),80)}});

  window.RPGNetworkReturnHome=()=>{stopPresence();clearInterval(session.timer);clearInterval(session.gameTimer);session.gameEntered=false;window.__RPG_NET_CONNECTED__=false;overlay.hidden=false;document.body.classList.add('net-lobby-open');showHome();showFront();};
  $('netMapJoin').onclick=()=>{
    const code=$('netCodeInput').value.replace(/\D/g,'').slice(0,6);
    if(code.length!==6){showError('Введите 6-значный код комнаты для карты.');return}
    window.location.href=`map.html?code=${encodeURIComponent(code)}`;
  };
  $('netCreate').onclick=createRoom;$('netJoin').onclick=joinRoom;$('netResume').onclick=showPartyLibrary;$('netStart').onclick=startRoom;$('netBack').onclick=showHome;$('netLocal').onclick=localGame;
  $('netCodeInput').addEventListener('input',e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,6));

  function showFront(){if($('partyLibraryPanel'))$('partyLibraryPanel').hidden=true;overlay.hidden=false;document.body.classList.add('net-lobby-open');$('heartFront').hidden=false;$('networkHeading').hidden=true;$('onlineHome').hidden=true;$('onlineRoom').hidden=true;$('onlineError').textContent='';}
  $('heartCompany').onclick=()=>{showHome();$('heartFront').hidden=true;$('networkHeading').hidden=false;$('netName').focus();};
  $('heartSolo').onclick=()=>{localGame();document.getElementById('setupSection').scrollIntoView({block:'start'});document.querySelector('#heroPicker input:checked')?.focus();};
  $('heartBack').onclick=()=>{showHome();showFront();};
  $('soloMenuBack').onclick=()=>{showHome();showFront();};

  async function showPartyLibrary(){
    showHome();$('heartFront').hidden=true;$('onlineHome').hidden=true;$('onlineRoom').hidden=true;$('networkHeading').hidden=true;
    const panel=$('partyLibraryPanel');panel.hidden=false;panel.replaceChildren();
    const h=document.createElement('h2');h.textContent='Мои партии';panel.append(h);
    const note=document.createElement('p');note.className='hint';note.textContent='Список доступен на этом устройстве. Срок проверяется на сервере; просмотр карточек его не продлевает.';panel.append(note);
    const rows=window.RPGPartyLibrary?.all()||[];for(const record of rows.sort((a,b)=>b.savedAt-a.savedAt)){
      const card=document.createElement('section');card.className='saved-party-card';const title=document.createElement('h3');title.textContent='Комната '+record.code+' · '+heroName(record.heroId||'Герой');
      const members=document.createElement('p');members.textContent=(record.participants||[]).map(p=>p.name).join(', ')||record.name||'';
      const status=document.createElement('p');status.textContent='Проверяем срок хранения…';
      const play=document.createElement('button');play.type='button';play.textContent='Продолжить';play.disabled=true;play.onclick=()=>resumeRoom(record);card.append(title,members,status,play);panel.append(card);
      api(`/api/rooms/${record.code}/saved?`+new URLSearchParams({playerId:record.playerId,playerSecret:record.playerSecret})).then(d=>{if(panel.hidden||!card.isConnected)return;const deadline=d.room.expiresAt;status.textContent=d.access==='expired'?'Возвращение в эту партию недоступно':(d.access==='return'?'Требуется согласие отряда. ':'')+'Можно продолжить до '+new Date(deadline*1000).toLocaleString('ru-RU');play.disabled=d.access==='expired';play.textContent=d.access==='return'?'Запросить возвращение':'Продолжить';window.RPGPartyLibrary.put({...record,expiresAt:deadline,participants:d.room.players.map(p=>({name:p.name,heroId:p.heroId}))});}).catch(e=>{if(card.isConnected)status.textContent=e.status===404||e.status===410?'Сервер не нашёл сохранение партии. Срок хранения мог ещё не истечь.':e.status===403?'Нет доступа к этой партии.':'Сервер недоступен. Попробуйте открыть список позже.';});
    }
    if(!rows.length){const p=document.createElement('p');p.textContent='Здесь появятся ваши сетевые приключения.';panel.append(p);}
    const back=document.createElement('button');back.type='button';back.textContent='Вернуться к выбору пути';back.onclick=showFront;panel.append(back);
  }
  $('heartParties').onclick=showPartyLibrary;

  document.body.classList.add('net-lobby-open');overlay.hidden=false;showHome();showFront();
})();
