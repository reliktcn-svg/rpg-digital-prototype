(() => {
  const MAP = window.MAP_DATA;
  const CARDS = window.CARDS_DATA || [];
  const DECK_IDS = window.DECK_CARD_IDS || {};
  const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
  const BOSS_CARD = {
    id:281,
    name:'Владыка Сердца Тьмы',
    category:'Босс',
    deck:'Финальный босс',
    fields:{
      'Ранг':'босс',
      'Тип':'Босс / Проклятый',
      'ЗД':'40',
      'ЗЩ':'17',
      'АТК':'+7',
      'Урон':'D12',
      'Эффект':'Тёмный удар: каждая 3-я успешная атака босса наносит дополнительно D4 урона.',
      'Золото':'0',
      'Тайники':'0; МУД 13+ — +1 тайник.'
    }
  };
  CARD_BY_ID[BOSS_CARD.id]=BOSS_CARD;

  const HEROES = [
    {id:'warrior', name:'Воин', color:'#3f7bd9', initial:'В', hp:12, defense:13, str:3, dex:1, wis:1, cha:1, baseDamage:'D6', baseAttack:'str'},
    {id:'dwarf', name:'Дворф', color:'#c84a4a', initial:'Д', hp:14, defense:12, str:4, dex:0, wis:2, cha:0, baseDamage:'D8', baseAttack:'str'},
    {id:'mage', name:'Маг', color:'#9452c7', initial:'М', hp:8, defense:11, str:-1, dex:1, wis:4, cha:2, baseDamage:'D10', baseAttack:'wis'},
    {id:'archer', name:'Лучник', color:'#3f9d5f', initial:'Л', hp:11, defense:12, str:0, dex:3, wis:2, cha:1, baseDamage:'D6', baseAttack:'dex'},
    {id:'rogue', name:'Разбойник', color:'#555b63', initial:'Р', hp:10, defense:12, str:0, dex:3, wis:1, cha:2, baseDamage:'2D4', baseAttack:'dex'},
  ];
  const HERO_MAP_COLORS={
    warrior:{fill:'#73a8ff',stroke:'#2c5fab'},
    dwarf:{fill:'#f07a7a',stroke:'#9f2e2e'},
    archer:{fill:'#76d87f',stroke:'#2f8a39'},
    rogue:{fill:'#5a5a5a',stroke:'#111111'},
    mage:{fill:'#b07be9',stroke:'#6f37aa'}
  };
  const LOCATION_MAP_COLORS={
    'Таверна':{fill:'#f3d25c',stroke:'#2f8a39'},
    'Торговец':{fill:'#f3d25c',stroke:'#2d63b4'},
    'Святилище':{fill:'#f3d25c',stroke:'#b33a3a'},
    'Древний портал':{fill:'#f3d25c',stroke:'#7d43ba'}
  };

  const CAMP_ADJACENT = new Set(['ТК73','ТК65','ТК74','ТК92','ТК100','ТК91']);
  const DECK_NAMES = {
    exploreOuter:'Исследования внешних регионов', exploreHeart:'Исследования Сердца тьмы',
    lootOuter:'Тайники внешних регионов', lootHeart:'Тайники Сердца тьмы'
  };
  const LOCATION_SYMBOL = {'Таверна':'Т','Торговец':'$','Святилище':'С','Древний портал':'П'};
  const LOCATION_CARD_ID={'Таверна':81,'Торговец':85,'Святилище':89,'Древний портал':97};
  const PERMANENT_LOCATION_COUNTS={
    kingdom:{'Таверна':4,'Торговец':4,'Святилище':4,'Древний портал':4},
    cursed:{'Таверна':2,'Торговец':2,'Святилище':2,'Древний портал':2}
  };
  const LOCATION_DISTANCE_CHANCE={
    different:{1:50,2:60,3:70,4:75,5:80,6:85,7:90,8:95,9:98,10:100},
    same:{1:5,2:10,3:20,4:25,5:30,6:40,7:50,8:70,9:90,10:100},
    portal:{1:.5,2:2,3:5,4:8,5:10,6:12,7:15,8:20,9:25,10:30,11:40,12:50,13:100}
  };
  const NEGATIVE_EFFECT_INFO={
    'Страх':'−1 МУД. В следующем бою враг атакует первым. Снимается эффектами очищения или в Святилище.',
    'Проклятие':'−1 СИЛ, ЛОВ, МУД и ХАР. Кубик лечения уменьшается на одну ступень: D12→D10→D8→D6→D4→1.',
    'Слабость':'−1 СИЛ. Эффект действует, пока не будет снят.',
    'Усталость':'−1 ЛОВ. Полный сет Тени позволяет игнорировать этот штраф. Эффект действует, пока не будет снят.',
    'Яд':'В конце личного хода вне боя герой получает 2 урона. Обычно действует 3 срабатывания.',
    'Горение':'Наносит 2 урона в конце боевого хода героя и в конце личного хода вне боя. Обычно действует 3 срабатывания.',
    'Кровотечение':'Только в бою: в конце боевого хода героя перед ходом врага герой получает 2 урона. Обычно действует 3 срабатывания.',
    'Оглушение':'Герой пропускает следующую атаку в бою, после чего Оглушение снимается.'
  };
  const NEGATIVE_EFFECT_FORMS={
    'Страх':['Страх','Страха','Страху','Страхом','Страхе'],
    'Проклятие':['Проклятие','Проклятия','Проклятию','Проклятием','Проклятии'],
    'Слабость':['Слабость','Слабости','Слабостью'],
    'Усталость':['Усталость','Усталости','Усталостью'],
    'Яд':['Яд','Яда','Яду','Ядом','Яде'],
    'Горение':['Горение','Горения','Горению','Горением','Горении'],
    'Кровотечение':['Кровотечение','Кровотечения','Кровотечению','Кровотечением','Кровотечении'],
    'Оглушение':['Оглушение','Оглушения','Оглушению','Оглушением','Оглушении']
  };
  const NEGATIVE_EFFECT_CANONICAL={};
  for(const [canonical,forms] of Object.entries(NEGATIVE_EFFECT_FORMS))for(const form of forms)NEGATIVE_EFFECT_CANONICAL[form.toLowerCase()]=canonical;
  const escapeRegExp=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const NEGATIVE_EFFECT_RE=new RegExp(`(?<![А-Яа-яЁё])(${Object.values(NEGATIVE_EFFECT_FORMS).flat().sort((a,b)=>b.length-a.length).map(escapeRegExp).join('|')})(?![А-Яа-яЁё])`,'gi');
  function canonicalNegativeEffectForm(value){return NEGATIVE_EFFECT_CANONICAL[String(value||'').toLowerCase()]||null}
  const EXTRA_LOOT_NAT1_LINES=[
    name=>`${name} полез за тайником слишком уверенно и защемил палец крышкой.`,
    name=>`${name} дёрнул сундук на себя — и поймал его углом по колену.`,
    name=>`${name} проверил, есть ли ловушка, самым надёжным способом: рукой.`,
    name=>`${name} потянулся за блестяшкой и наступил на собственный плащ.`,
    name=>`${name} нашёл тайник. Тайник тоже нашёл ${name} — прямо по лбу.`,
    name=>`${name} решил вскрыть замок кинжалом. Замок оказался крепче, а пальцы — ближе.`,
    name=>`${name} услышал подозрительный щелчок и зачем-то наклонился посмотреть поближе.`,
    name=>`${name} слишком резко распахнул крышку и получил ею по носу.`,
    name=>`${name} уверенно сказал «тут точно безопасно» за секунду до неприятностей.`,
    name=>`${name} пытался открыть сундук, но героически пожертвовал ногтем.`
  ];
  const NON_STACKING_EVENT_EFFECTS=new Set(['Благословение путника','Следы врага','Разлом пути','Зов Сердца','Молитва истинного удара','Покров Стража','Печать возмездия','Железная молитва','Морок Сердца']);
  const ENEMY_GENITIVE={
    1:'Разбойника с ножом',2:'Лесного волка',3:'Пепельного бродяги',4:'Болотной гадюки',5:'Послушника культа',6:'Гнилого мертвеца',7:'Ворона-падальщика',8:'Малого беса',9:'Пьяного мародёра',10:'Бандита с топором',11:'Лесного кабана',12:'Разбойника с дубиной',13:'Лесного охотника',14:'Тёмного волка',15:'Заражённого паука',16:'Каменного прислужника',17:'Бродячего наёмника',18:'Травника-отступника',19:'Проклятого крестьянина',20:'Оборотня первой луны',21:'Лесного чудища',22:'Болотного духа',23:'Рыцаря-разбойника',24:'Безумного рыцаря',25:'Старшего культиста',26:'Костяного великана',27:'Культиста Сердца',28:'Пепельного мертвеца',29:'Твари из трещины',30:'Демона пепла',31:'Тёмного мага',32:'Духа без лица',33:'Пепельного зверя',34:'Теневого убийцы',35:'Червя тёмной земли',36:'Верховного вампира',37:'Пожирателя света',38:'Старшего оборотня',39:'Слизня из Глубины',40:'Матери пауков',41:'Полого великана',42:'Демона крови',43:'Верховного культиста',44:'Рыцаря без сердца',45:'Чёрного инквизитора',46:'Демона тени',47:'Голема забытого храма',48:'Кровавого зверя',49:'Ведьмы Сердца',50:'Хранителя тёмных врат',51:'Палача Сердца тьмы',52:'Стража Первой Печати',53:'Матери чёрных корней',54:'Безымянного демона',55:'Лича Малой Короны'
  };

  const els = {
    heroPicker:document.getElementById('heroPicker'), startBtn:document.getElementById('startBtn'), setupError:document.getElementById('setupError'),
    setupSection:document.getElementById('setupSection'), gameSection:document.getElementById('gameSection'), turnCard:document.getElementById('turnCard'),
    moveRollBtn:document.getElementById('moveRollBtn'), diceResult:document.getElementById('diceResult'), moveHint:document.getElementById('moveHint'), endTurnBtn:document.getElementById('endTurnBtn'),
    initiativeList:document.getElementById('initiativeList'), overlay:document.getElementById('overlay'), log:document.getElementById('log'), hoverInfo:document.getElementById('hoverInfo'),
    saveBtn:document.getElementById('saveBtn'), loadBtn:document.getElementById('loadBtn'), resetBtn:document.getElementById('resetBtn'), inventoryBtn:document.getElementById('inventoryBtn'), actionPanel:document.getElementById('actionPanel'),
    modal:document.getElementById('modal'), modalContent:document.getElementById('modalContent'), modalClose:document.getElementById('modalClose'),
    sheetDrawer:document.getElementById('sheetDrawer'), sheetContent:document.getElementById('sheetContent'), sheetClose:document.getElementById('sheetClose'), sheetHeroTab:document.getElementById('sheetHeroTab'), sheetInventoryTab:document.getElementById('sheetInventoryTab'),
    rollOverlay:document.getElementById('rollOverlay'), rollPopupTitle:document.getElementById('rollPopupTitle'), rollPopupMain:document.getElementById('rollPopupMain'), rollPopupMath:document.getElementById('rollPopupMath'), rollPopupDetail:document.getElementById('rollPopupDetail'), rollPopupClose:document.getElementById('rollPopupClose'),
    boardWrap:document.getElementById('boardWrap'), mapStage:document.getElementById('mapStage'), mapZoomIn:document.getElementById('mapZoomIn'), mapZoomOut:document.getElementById('mapZoomOut'), journalBtn:document.getElementById('journalBtn'), journalOverlay:document.getElementById('journalOverlay'), journalClose:document.getElementById('journalClose'), journalMine:document.getElementById('journalMine'), journalAll:document.getElementById('journalAll'), journalTitle:document.getElementById('journalTitle'), mobileHeroBtn:document.getElementById('mobileHeroBtn'), mobileInventoryBtn:document.getElementById('mobileInventoryBtn'), mobileJournalBtn:document.getElementById('mobileJournalBtn'), sheetMobileTitle:document.getElementById('sheetMobileTitle'), turnOrderBanner:document.getElementById('turnOrderBanner')
  };

  function shuffled(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function isPermanentLocationCardId(id){return CARD_BY_ID[Number(id)]?.category==='Постоянная локация'}
  function stripPermanentLocationCardsFromDecks(decks){if(!decks)return;for(const d of Object.values(decks)){if(!d)continue;d.draw=(d.draw||[]).filter(id=>!isPermanentLocationCardId(id));d.discard=(d.discard||[]).filter(id=>!isPermanentLocationCardId(id))}}
  function initialDecks(){
    const o={}; for(const k of ['exploreOuter','exploreHeart','lootOuter','lootHeart']) o[k]={draw:shuffled((DECK_IDS[k]||[]).filter(id=>!isPermanentLocationCardId(id))),discard:[]}; return o;
  }
  function freshState(){return {
    version:'0.6.34', started:false, players:[], order:[], currentIndex:0, rolled:false, die:null, movePoints:0, reachable:[], chosenPath:null, chosenMovePlan:null, turnMoved:false, movePending:false, moveOriginHex:null, moveTransit:null, pendingMoveAction:null, round:1,
    decks:initialDecks(), cleaned:{}, locations:{}, territories:{}, areas:[], nextAreaId:1, exploration:null, turnLocked:false, locationUsedThisTurn:false, locationActivationHex:null, portalPending:null, clearedThisTurnHex:null, foreignTerritoryPending:null, tributeConsentPending:null, tradeOpportunity:null, dungeonEntryNotice:null, inspectPlayerId:null, mapHighlight:null, mapZoom:1, combat:null, gameOver:false, locationPlacementVersion:2, sharedDifficulty:null, journal:[]
  };}
  let state=freshState();
  let sideInteraction=null;
  let onlineLocalHeroId=null;
  let journalFilterMode='mine';
  let modalOffturnOwnerId=null;
  let modalCloseAction=null;
  let combatWindowHidden=false;
  let combatWindowInstance=null;

  function localControlsCombat(){return !onlineLocalHeroId||onlineLocalHeroId===currentPlayer()?.id}
  function combatInstanceKey(){const c=state.combat;if(!c)return null;return String(c.instanceId||`${currentPlayer()?.id||''}:${c.cardId||''}:${c.startedAt||''}`)}
  function ensureCombatRestoreButton(){
    let b=document.getElementById('combatRestoreButton');if(b)return b;
    b=document.createElement('button');b.id='combatRestoreButton';b.className='combat-restore-button';b.type='button';b.textContent='Показать бой';b.hidden=true;b.onclick=showCombatWindow;document.body.appendChild(b);return b;
  }
  function updateCombatRestoreButton(){const b=ensureCombatRestoreButton();b.hidden=!(state.combat&&combatWindowHidden);document.body.classList.toggle('combat-window-hidden',!!state.combat&&combatWindowHidden)}
  function syncLocalCombatWindowState(){
    const key=combatInstanceKey();let isNew=false;
    if(key&&key!==combatWindowInstance){combatWindowInstance=key;combatWindowHidden=false;isNew=true}
    if(!key){combatWindowInstance=null;combatWindowHidden=false}
    updateCombatRestoreButton();return isNew;
  }
  function hideCombatWindow(){if(!state.combat)return;combatWindowHidden=true;updateCombatRestoreButton();if(!els.modal.hidden&&els.modalContent.querySelector('.combat-shell'))closeModal();updateUI();renderBoard()}
  function showCombatWindow(){if(!state.combat)return;combatWindowHidden=false;updateCombatRestoreButton();renderCombat(true)}
  function canOffturnModalActionFor(heroId){return !!heroId&&modalOffturnOwnerId===heroId}
  function beginSideInteraction(p,type,participantIds=[p?.id].filter(Boolean)){
    if(!p)return;sideInteraction={ownerId:p.id,type,participantIds:[...new Set(participantIds.filter(Boolean))]};
    document.body.classList.add('side-interaction-active');
    window.dispatchEvent(new CustomEvent('rpg-side-interaction-change',{detail:{active:true,ownerId:p.id,type}}));
  }
  function endSideInteraction(){
    if(!sideInteraction)return;const old=sideInteraction;sideInteraction=null;document.body.classList.remove('side-interaction-active');
    window.dispatchEvent(new CustomEvent('rpg-side-interaction-change',{detail:{active:false,ownerId:old.ownerId,type:old.type}}));
  }
  function sideInteractionOwnerId(){return sideInteraction?.ownerId||null}
  function sideInteractionActiveFor(heroId){return !!sideInteraction&&sideInteraction.ownerId===heroId}
  function sideInteractionPayload(heroId){
    if(sideInteractionActiveFor(heroId)){
      const ids=new Set(sideInteraction.participantIds||[heroId]);
      return{type:sideInteraction.type,ownerId:heroId,players:state.players.filter(q=>ids.has(q.id)).map(cloneJson),decks:cloneJson(state.decks),locations:cloneJson(state.locations),journal:cloneJson(state.journal||[])};
    }
    if(onlineLocalHeroId&&heroId===onlineLocalHeroId&&currentPlayer()?.id!==heroId){
      const mine=getPlayer(heroId);if(!mine)return null;
      return{type:'offturnInventory',ownerId:heroId,players:[cloneJson(mine)],decks:cloneJson(state.decks),locations:cloneJson(state.locations),journal:cloneJson(state.journal||[])};
    }
    return null;
  }
  const HEX_DISTANCE_CACHE=new Map();
  function mapHexDistance(a,b){
    if(a===b)return 0;const key=a<b?`${a}|${b}`:`${b}|${a}`;if(HEX_DISTANCE_CACHE.has(key))return HEX_DISTANCE_CACHE.get(key);
    const seen=new Set([a]),q=[[a,0]];while(q.length){const [h,d]=q.shift();for(const n of MAP.hexes[h]?.neighbors||[]){if(n===b){HEX_DISTANCE_CACHE.set(key,d+1);return d+1}if(!seen.has(n)){seen.add(n);q.push([n,d+1])}}}HEX_DISTANCE_CACHE.set(key,999);return 999;
  }
  function locationSpacingChance(a,b,d){
    let table;if(a==='Древний портал'&&b==='Древний портал')table=LOCATION_DISTANCE_CHANCE.portal;else if(a===b)table=LOCATION_DISTANCE_CHANCE.same;else table=LOCATION_DISTANCE_CHANCE.different;
    const keys=Object.keys(table).map(Number).sort((x,y)=>x-y);for(const k of keys)if(d<=k)return Number(table[k]);return 100;
  }
  function locationCandidateEligible(hex,region){
    const h=MAP.hexes[hex];if(!h||h.region!==region||hex===MAP.startHex||hex===MAP.bossHex)return false;if(state.locations[hex]||state.territories[hex])return false;if(state.cleaned?.[hex])return false;if((state.players||[]).some(p=>p.hex===hex))return false;return true;
  }
  function locationCandidateAccepted(hex,name){
    let cap=100;for(const [otherHex,loc] of Object.entries(state.locations||{}))cap=Math.min(cap,locationSpacingChance(name,loc.name,mapHexDistance(hex,otherHex)));return Math.random()*100<=cap;
  }
  function missingLocationTokens(region){
    const wanted=PERMANENT_LOCATION_COUNTS[region]||{},tokens=[];for(const [name,count] of Object.entries(wanted)){const have=Object.entries(state.locations||{}).filter(([hex,l])=>MAP.hexes[hex]?.region===region&&l.name===name).length;for(let i=have;i<count;i++)tokens.push(name)}return tokens;
  }
  function placePermanentLocationsInRegion(region){
    const missing=missingLocationTokens(region);if(!missing.length)return true;
    const baseline=new Set(Object.keys(state.locations||{}));
    for(let attempt=0;attempt<250;attempt++){
      for(const hex of Object.keys(state.locations||{}))if(!baseline.has(hex))delete state.locations[hex];
      let ok=true;for(const name of shuffled(missing)){
        const candidates=shuffled(Object.keys(MAP.hexes).filter(hex=>locationCandidateEligible(hex,region)));let chosen=null;
        for(const hex of candidates)if(locationCandidateAccepted(hex,name)){chosen=hex;break}
        if(!chosen){ok=false;break}
        state.locations[chosen]={name,cardId:LOCATION_CARD_ID[name],generated:true};
      }
      if(ok)return true;
    }
    for(const hex of Object.keys(state.locations||{}))if(!baseline.has(hex))delete state.locations[hex];
    return false;
  }
  function generatePermanentLocations({preserve=true}={}){
    stripPermanentLocationCardsFromDecks(state.decks);if(!preserve)state.locations={};
    const okKingdom=placePermanentLocationsInRegion('kingdom'),okCursed=placePermanentLocationsInRegion('cursed');state.locationPlacementVersion=2;
    if(!okKingdom||!okCursed)console.warn('Не удалось полностью разместить постоянные локации по заданным вероятностям.',{okKingdom,okCursed});
    return okKingdom&&okCursed;
  }
  function locationVisibleToPlayer(p,hex){if(!state.locations?.[hex])return false;if(!p)return true;ensurePlayerModel(p);return !playerHardMode(p)||!!p.discoveredLocations?.[hex]}
  function revealLocationToPlayer(p,hex){const loc=state.locations?.[hex];if(!p||!loc)return false;ensurePlayerModel(p);if(p.discoveredLocations[hex])return false;p.discoveredLocations[hex]=true;log(`${p.name} открывает постоянную локацию на ${hex}: <b>${loc.name}</b>.`);return true}
  function tavernIsVacant(hex){return !(state.players||[]).some(q=>q.hex===hex)}
  function restockTavernIfVacant(hex){const loc=state.locations?.[hex];if(!loc||loc.name!=='Таверна'||!loc.tavernNeedsRestock||!tavernIsVacant(hex))return null;loc.tavernNeedsRestock=false;const entry=ensureTavernMercenary(hex);if(entry)log(`В пустую Таверну на ${hex} приходит новый наёмник «${entry.card.name}».`);return entry}

  function rand(n){return Math.floor(Math.random()*n)+1}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function localViewHeroId(){return onlineLocalHeroId||null}
  function journalOwnerId(){return localViewHeroId()||currentPlayer()?.id||null}
  function renderJournal(){
    const roomCode=String(window.__RPG_ROOM_CODE__||'').trim();
    if(els.journalTitle)els.journalTitle.textContent=roomCode?`Журнал партии / комната №${roomCode}`:'Журнал партии';
    if(!els.log)return;const mine=journalOwnerId(),entries=Array.isArray(state.journal)?state.journal:[];
    const filtered=journalFilterMode==='all'?entries:entries.filter(e=>!e.actorId||e.actorId===mine);
    els.log.innerHTML='';for(const e of [...filtered].reverse()){
      const d=document.createElement('div');d.className='log-entry';d.innerHTML=`<span class="log-time">${e.time||''}</span>${e.html||''}`;els.log.appendChild(d)
    }
    if(!filtered.length)els.log.innerHTML='<div class="empty-box">Записей пока нет.</div>';
    if(els.journalMine)els.journalMine.classList.toggle('active',journalFilterMode==='mine');if(els.journalAll)els.journalAll.classList.toggle('active',journalFilterMode==='all');
  }
  function log(msg,actorId=undefined){
    if(!Array.isArray(state.journal))state.journal=[];const offturnActor=onlineLocalHeroId&&currentPlayer()?.id!==onlineLocalHeroId?onlineLocalHeroId:null,actor=actorId===null?null:(actorId||sideInteractionOwnerId()||offturnActor||currentPlayer()?.id||null),now=new Date();
    state.journal.push({id:`j-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,ts:Date.now(),time:now.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),actorId:actor,html:msg});
    if(state.journal.length>600)state.journal=state.journal.slice(-600);renderJournal();
  }
  function getPlayer(id){return state.players.find(p=>p.id===id)}
  function currentPlayer(){return getPlayer(state.order[state.currentIndex])}
  function decorateNegativeEffects(root=document.body){
    if(!root||root.nodeType!==1)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){const v=node.nodeValue||'',parent=node.parentElement;if(!parent||!v.trim()||parent.closest('script,style,textarea,.negative-effect-term,.negative-effect-tooltip'))return NodeFilter.FILTER_REJECT;NEGATIVE_EFFECT_RE.lastIndex=0;return NEGATIVE_EFFECT_RE.test(v)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}}),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){const value=node.nodeValue||'';NEGATIVE_EFFECT_RE.lastIndex=0;let last=0,m,changed=false;const frag=document.createDocumentFragment();while((m=NEGATIVE_EFFECT_RE.exec(value))){const canonical=canonicalNegativeEffectForm(m[0]);if(!canonical)continue;changed=true;if(m.index>last)frag.appendChild(document.createTextNode(value.slice(last,m.index)));const span=document.createElement('span');span.className='negative-effect-term';span.textContent=m[0];span.dataset.effect=canonical;frag.appendChild(span);last=m.index+m[0].length}if(changed){if(last<value.length)frag.appendChild(document.createTextNode(value.slice(last)));node.parentNode.replaceChild(frag,node)}}
  }
  const negativeEffectObserver=new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes){if(n.nodeType===1)decorateNegativeEffects(n);else if(n.nodeType===3&&n.parentElement)decorateNegativeEffects(n.parentElement)}});
  const negativeEffectTooltip=document.createElement('div');negativeEffectTooltip.className='negative-effect-tooltip';negativeEffectTooltip.hidden=true;document.body.appendChild(negativeEffectTooltip);
  function positionNegativeEffectTooltip(target){const r=target.getBoundingClientRect(),pad=10,w=Math.min(360,window.innerWidth-20);negativeEffectTooltip.style.maxWidth=`${w}px`;negativeEffectTooltip.style.left=`${Math.max(pad,Math.min(window.innerWidth-w-pad,r.left))}px`;negativeEffectTooltip.style.top=`${Math.min(window.innerHeight-100,r.bottom+8)}px`}
  document.addEventListener('mouseover',e=>{const t=e.target.closest?.('.negative-effect-term');if(!t)return;const key=t.dataset.effect||canonicalNegativeEffectForm(t.textContent)||t.textContent;negativeEffectTooltip.innerHTML=`<b>${key}</b><span>${NEGATIVE_EFFECT_INFO[key]||''}</span>`;negativeEffectTooltip.hidden=false;positionNegativeEffectTooltip(t)});
  document.addEventListener('mouseout',e=>{const t=e.target.closest?.('.negative-effect-term');if(t&&!t.contains(e.relatedTarget))negativeEffectTooltip.hidden=true});
  function playerHardMode(p=currentPlayer()){return !!p?.hardMode}
  function inspectedPlayer(){
    const active=currentPlayer(),local=onlineLocalHeroId?getPlayer(onlineLocalHeroId):null;
    if(local)return local;
    if(playerHardMode(active)||!state.inspectPlayerId)return active;
    return getPlayer(state.inspectPlayerId)||active;
  }
  function sheetPlayer(){return getPlayer(sheetView.playerId)||getPlayer(onlineLocalHeroId)||currentPlayer()}
  function sheetReadOnly(){const p=sheetPlayer(),active=currentPlayer();if(!p||!active)return false;if(onlineLocalHeroId&&p.id===onlineLocalHeroId)return false;return p.id!==active.id&&!sideInteractionActiveFor(p.id)}
  function heroIsActiveCombatant(p){return !!state.combat&&!!p&&currentPlayer()?.id===p.id}
  function regionName(r){return r==='kingdom'?'Территории королевства':r==='cursed'?'Проклятые территории':'Сердце тьмы'}
  function statName(k){return ({str:'СИЛ',dex:'ЛОВ',wis:'МУД',cha:'ХАР'})[k]||k}
  function statKeyFromText(s=''){if(s.includes('СИЛ'))return 'str';if(s.includes('ЛОВ'))return 'dex';if(s.includes('МУД'))return 'wis';if(s.includes('ХАР'))return 'cha';return null}
  function rollDiceText(expr){const m=String(expr||'').match(/(\d*)D(\d+)/i);if(!m)return 0;const n=Number(m[1]||1),s=Number(m[2]);let t=0;for(let i=0;i<n;i++)t+=rand(s);return t}
  function currentHeroDamage(p){
    const w=itemCard(getSlotId(p,'weapon'));
    if(w&&itemType(w)==='оружие'){
      let dmg=String(w.fields?.['Урон']||p.baseDamage||'D6').trim();
      const rogue=dmg.match(/\/\s*([0-9]*D\d+)\s*\(Разбойник\)/i);
      if(p.id==='rogue'&&rogue)return rogue[1];
      if(dmg.includes('/'))dmg=dmg.split('/')[0].trim();
      return dmg||p.baseDamage||'D6';
    }
    return p.baseDamage||'D6';
  }

  function healingExprFor(p,expr){
    const raw=String(expr||'').toUpperCase();if(!p?.statuses?.includes('Проклятие'))return raw;
    const step={D12:'D10',D10:'D8',D8:'D6',D6:'D4',D4:'1'};return step[raw]||raw;
  }
  function rollHealing(p,expr){
    const used=healingExprFor(p,expr),total=/^D\d+$/i.test(used)?rollDiceText(used):Number(used)||0;
    return{total,used,original:String(expr||''),reduced:used!==String(expr||'').toUpperCase()};
  }
  function removeStatus(p,status){ensurePlayerModel(p);p.statuses=(p.statuses||[]).filter(x=>x!==status);delete p.statusTimers[status];delete p.statusTickedTurn[status];if(state.combat?.heroStatusTimers)delete state.combat.heroStatusTimers[status]}
  function statusLabel(p,status){ensurePlayerModel(p);const n=p.statusTimers?.[status];return n!=null?`${status} (${n} х.)`:status}
  function statusSummary(p){return (p.statuses||[]).map(st=>statusLabel(p,st)).join(', ')}
  function activeEffectRows(p){
    ensurePlayerModel(p);const rows=[];
    const add=(kind,label,tone='positive')=>{if(label)rows.push({kind,label,tone})};
    for(const st of p.statuses||[])add('Негативный эффект',statusLabel(p,st),'negative');
    for(const e of p.temporaryEffects||[])add('Эффект',`${e.label||'Временный эффект'}${e.turnsRemaining!=null?` — осталось ${e.turnsRemaining} х.`:''}`,'positive');
    for(const e of p.combatEffects||[]){
      if(e.type==='nextBattleAttack')add('Следующий бой',`${e.label||'Эффект'} — +${e.amount||0} к атаке, первые ${e.attacksRemaining||e.remaining||0} атаки`);
      else if(e.type==='nextBattleAdvantage')add('Следующий бой',`${e.label||'Эффект'} — преимущество на первые ${e.attacksRemaining||e.remaining||0} атаки`);
      else if(e.type==='nextBattleFreeEscape')add('Следующий бой',`${e.label||'Разлом пути'} — побег без проверки`);
      else if(e.type==='nextBattleEnemyFirst')add('Следующий бой',`${e.label||'Эффект'} — враг атакует первым`,'negative');
      else if(e.type==='nextBattleDisadvantage')add('Следующий бой',`${e.label||'Эффект'} — следующая атака героя с помехой`,'negative');
      else if(e.type==='nextBattleAllAdvantage')add('Следующий бой',`${e.label||'Эффект'} — все атаки героя с преимуществом`);
      else if(e.type==='nextBattleDefense')add('Следующий бой',`${e.label||'Эффект'} — +${e.amount||0} ЗЩ`);
      else if(e.type==='nextBattleHeroDamageMultiplier')add('Следующий бой',`${e.label||'Эффект'} — урон атак героя ×${e.amount||2}`);
      else if(e.type==='nextBattleFirstDamageMultiplier')add('Следующий бой',`${e.label||'Эффект'} — первый урон героя ×${e.amount||2}`);
      else if(e.type==='nextBattleIncomingHalf')add('Следующий бой',`${e.label||'Эффект'} — получаемый урон уменьшается вдвое`);
      else if(e.type==='nextBattleEnemyDisadvantageAll')add('Следующий бой',`${e.label||'Эффект'} — все атаки врага с помехой`);
      else if(e.type==='nextBattleAbilityLocked')add('Следующий бой',`${e.label||'Эффект'} — классовая способность недоступна`,'negative');
      else if(e.type==='nextEnemyHitBonus')add('Следующий бой',`${e.label||'Эффект'} — следующая успешная атака врага +${e.amount||2} урона`,'negative');
      else if(e.type==='attackBonus')add('Эффект',`${e.label||'Боевой эффект'} — +${e.amount||0} к атаке${e.turnsRemaining!=null?`, осталось ${e.turnsRemaining} х.`:''}`);
      else if(e.type==='lightRage')add('Эффект',`${e.label||'Боевой эффект'} — +${e.die||'D4'} урона${e.turnsRemaining!=null?`, осталось ${e.turnsRemaining} х.`:''}`);
      else add('Боевой эффект',`${e.label||'Боевой эффект'}${e.turnsRemaining!=null?` — осталось ${e.turnsRemaining} х.`:''}`);
    }
    if(state.combat&&currentPlayer()?.id===p.id){const c=state.combat;
      for(const b of c.buffs||[])if(b.remaining>0){let txt=b.label||'Боевой эффект';if(b.type==='attack')txt+=` — +${b.amount||0} к атаке`;if(b.type==='advantage')txt+=' — преимущество';if(b.type==='defense')txt+=` — +${b.amount||0} ЗЩ`;if(b.type==='lightDamage')txt+=' — +D4 урона';txt+=` · осталось ${b.remaining} боев. х.`;add('В бою',txt)}
      if(c.freeEscape)add('В бою',`${c.freeEscapeLabel||'Разлом пути'} — побег без проверки`);
      if(c.heroAllAdvantage)add('В бою',`${c.heroAllAdvantageLabel||'Молитва истинного удара'} — все атаки героя с преимуществом`);
      if((c.battleDefenseBonus||0)>0)add('В бою',`${c.battleDefenseLabel||'Покров Стража'} — +${c.battleDefenseBonus} ЗЩ`);
      if((c.heroDamageMultiplier||1)>1)add('В бою',`${c.heroDamageMultiplierLabel||'Печать возмездия'} — урон атак героя ×${c.heroDamageMultiplier}`);
      if((c.firstHeroDamageMultiplier||1)>1)add('В бою',`${c.firstHeroDamageMultiplierLabel||'Чёрная игла'} — первый урон героя ×${c.firstHeroDamageMultiplier}`);
      if(c.heroIncomingHalf)add('В бою',`${c.heroIncomingHalfLabel||'Железная молитва'} — получаемый урон уменьшается вдвое`);
      if(c.enemyAllDisadvantage)add('В бою',`${c.enemyAllDisadvantageLabel||'Морок Сердца'} — все атаки врага с помехой`);
      if(c.heroAbilityLocked)add('В бою',`${c.heroAbilityLockedLabel||'Ловушка безмолвия'} — классовая способность недоступна`,'negative');
      if(c.nextEnemyHitBonus>0)add('В бою',`${c.nextEnemyHitBonusLabel||'Зеркальный шип'} — следующая успешная атака врага +${c.nextEnemyHitBonus} урона`,'negative');
      if((c.heroDisadvantage||0)>0)add('В бою',`${c.heroDisadvantageLabel||'Помеха'} — следующая атака героя с помехой`,'negative');
    }
    return rows;
  }


  const SLOT_LABELS={weapon:'Оружие',armor:'Броня',amulet:'Амулет',ring0:'Кольцо 1',ring1:'Кольцо 2',artifact:'Артефакт',potion0:'Зелье 1',potion1:'Зелье 2',mercenary:'Наёмник'};
  const BONUS_KEYS={defense:'ЗЩ',str:'СИЛ',dex:'ЛОВ',wis:'МУД',cha:'ХАР'};
  let sheetView={mode:'overview',bonusKey:null,itemId:null,context:null,playerId:null};

  function signed(v){return `${v>=0?'+':''}${v}`}
  function itemCard(id){return CARD_BY_ID[Number(id)]||null}
  function itemType(card){return String(card?.fields?.['Тип']||'').toLowerCase()}
  function freshPlayerStats(){return{goldEarned:0,defeats:0,enemies:{weak:0,normal:0,strong:0,elite:0,boss:0},damageDealt:0,damageTaken:0,natural20:0,natural1:0,lootFound:0,distanceTravelled:0,locationVisitsTotal:0,playerTrades:0,bossAttempts:0,legacyIncomplete:false,extendedLegacyIncomplete:false}}
  function ensurePlayerStats(p){
    if(!p.stats||typeof p.stats!=='object')p.stats={...freshPlayerStats(),legacyIncomplete:true,extendedLegacyIncomplete:true};
    if(!p.stats.enemies||typeof p.stats.enemies!=='object')p.stats.enemies={weak:0,normal:0,strong:0,elite:0,boss:0};
    for(const k of ['weak','normal','strong','elite','boss'])if(p.stats.enemies[k]==null)p.stats.enemies[k]=0;
    if(p.stats.goldEarned==null)p.stats.goldEarned=0;if(p.stats.defeats==null)p.stats.defeats=0;if(p.stats.legacyIncomplete==null)p.stats.legacyIncomplete=false;
    const extended=['damageDealt','damageTaken','natural20','natural1','lootFound','distanceTravelled','locationVisitsTotal','playerTrades','bossAttempts'];let missingExtended=false;for(const k of extended)if(p.stats[k]==null){p.stats[k]=0;missingExtended=true}if(p.stats.extendedLegacyIncomplete==null)p.stats.extendedLegacyIncomplete=missingExtended;
    return p.stats;
  }
  function recordNatural(p,natural){if(!p||!(natural===20||natural===1))return;ensurePlayerStats(p);if(natural===20)p.stats.natural20++;else p.stats.natural1++}
  function recordDamageDealt(p,amount){const v=Math.max(0,Number(amount)||0);if(!p||!v)return;ensurePlayerStats(p);p.stats.damageDealt+=v}
  function recordDamageTaken(p,amount){const v=Math.max(0,Number(amount)||0);if(!p||!v)return;ensurePlayerStats(p);p.stats.damageTaken+=v}
  function recordLocationVisit(p,hex){if(!p||!state.locations?.[hex])return;ensurePlayerStats(p);p.stats.locationVisitsTotal++}
  function gainGold(p,amount){const v=Math.max(0,Number(amount)||0);if(!v)return 0;ensurePlayerStats(p);p.gold+=v;p.stats.goldEarned+=v;return v}
  function enemyRankStatKey(enemy,c=state.combat){if(c?.isBoss||enemy?.id===281)return'boss';if(c?.elite)return'elite';const r=String(enemy?.fields?.['Ранг']||'').toLowerCase();if(r.includes('элит'))return'elite';if(r.includes('силь'))return'strong';if(r.includes('обыч'))return'normal';return'weak'}
  function recordEnemyVictory(p,enemy,c=state.combat){ensurePlayerStats(p);const k=enemyRankStatKey(enemy,c);p.stats.enemies[k]=(p.stats.enemies[k]||0)+1}
  function ensurePlayerModel(p){
    if(!p.backpack)p.backpack=[];if(!p.pendingItems)p.pendingItems=[];
    if(!p.equipment)p.equipment={weapon:null,armor:null,amulet:null,rings:[null,null],artifact:null,potions:[null,null],mercenary:null};
    if(!Array.isArray(p.equipment.rings))p.equipment.rings=[null,null];if(!Array.isArray(p.equipment.potions))p.equipment.potions=[null,null];
    if(!p.temporaryEffects)p.temporaryEffects=[];
    if(!p.combatEffects)p.combatEffects=[];
    {const seen=new Set();p.combatEffects=p.combatEffects.filter(e=>{if(!NON_STACKING_EVENT_EFFECTS.has(e?.label))return true;const key=e.label;if(seen.has(key))return false;seen.add(key);return true})}
    if(!p.itemUsage)p.itemUsage={};
    if(!p.lockedItems||typeof p.lockedItems!=='object')p.lockedItems={};
    if(p.hardMode==null)p.hardMode=false;
    if(!p.locationVisits)p.locationVisits={};
    if(!p.discoveredLocations||typeof p.discoveredLocations!=='object')p.discoveredLocations={};
    if(!p.statusTimers)p.statusTimers={};
    for(const st of ['Яд','Горение','Кровотечение'])if((p.statuses||[]).includes(st)&&p.statusTimers[st]==null)p.statusTimers[st]=3;
    if(!p.statusTickedTurn)p.statusTickedTurn={};
    if(!Array.isArray(p.notes))p.notes=[];
    if(p.trackerUsedTurn===undefined)p.trackerUsedTurn=null;
    if(p.scoutBootsUsedTurn===undefined)p.scoutBootsUsedTurn=null;
    if(!p.areaHealingCooldown||typeof p.areaHealingCooldown!=='object')p.areaHealingCooldown={};
    if(p.reexploreRiskHex===undefined)p.reexploreRiskHex=null;
    ensurePlayerStats(p);
  }
  function isItemLocked(p,id){ensurePlayerModel(p);return !!p.lockedItems?.[Number(id)]}
  function setItemLocked(p,id,locked){ensurePlayerModel(p);if(locked)p.lockedItems[Number(id)]=true;else delete p.lockedItems[Number(id)];return !!p.lockedItems?.[Number(id)]}
  function getSlotId(p,slot){ensurePlayerModel(p);if(slot==='ring0')return p.equipment.rings[0];if(slot==='ring1')return p.equipment.rings[1];if(slot==='potion0')return p.equipment.potions[0];if(slot==='potion1')return p.equipment.potions[1];return p.equipment[slot]??null}
  function setSlotId(p,slot,id){ensurePlayerModel(p);if(slot==='ring0')p.equipment.rings[0]=id;else if(slot==='ring1')p.equipment.rings[1]=id;else if(slot==='potion0')p.equipment.potions[0]=id;else if(slot==='potion1')p.equipment.potions[1]=id;else if(slot==='amulet'){const old=p.equipment.amulet;if(Number(old)!==178&&Number(id)===178)p.maxHp+=5;else if(Number(old)===178&&Number(id)!==178){p.maxHp=Math.max(Number(p.hp||1),p.maxHp-5);p.currentHp=Math.min(p.currentHp,p.maxHp)}p.equipment.amulet=id}else p.equipment[slot]=id}
  function equippedEntries(p){ensurePlayerModel(p);return Object.keys(SLOT_LABELS).map(slot=>({slot,id:getSlotId(p,slot)})).filter(x=>x.id!=null)}
  function baseBackpackCapacity(p){ensurePlayerModel(p);return playerHardMode(p)?5:10}
  function backpackCapacityWithArtifact(p,artifactId=getSlotId(p,'artifact')){return baseBackpackCapacity(p)+(Number(artifactId)===191?5:0)}
  function hardBackpackCapacity(p){ensurePlayerModel(p);return 5+(getSlotId(p,'artifact')===191?5:0)}
  function backpackCapacity(p){ensurePlayerModel(p);return backpackCapacityWithArtifact(p)}
  function hasBackpackRoom(p,n=1){return p.backpack.length+n<=backpackCapacity(p)}
  function bonusRegexSources(card,key){
    if(!card||itemType(card)==='зелье'||itemType(card)==='наёмник')return[];
    const label=BONUS_KEYS[key],text=String(card.fields?.['Эффект']||'');
    const re=new RegExp(`([+-]\\d+)\\s*${label}`,'gi');let m,out=[];
    while((m=re.exec(text)))out.push({label:`${card.name}`,amount:Number(m[1]),kind:'Предмет'});
    return out;
  }
  function setCards(setName){return CARDS.filter(c=>String(c.fields?.['Сет']||'')===String(setName))}
  function fullSetEquipped(p,setName){
    const pieces=setCards(setName);if(pieces.length<3)return false;
    const equipped=new Set(equippedEntries(p).map(e=>Number(e.id)));
    return pieces.every(c=>equipped.has(Number(c.id)));
  }
  function completeSetNames(p){return [...new Set(CARDS.map(c=>c.fields?.['Сет']).filter(Boolean))].filter(s=>fullSetEquipped(p,s))}
  function itemColorClass(p,card){
    if(!card)return'item-rarity-common';
    const setName=card.fields?.['Сет'];
    if(setName)return fullSetEquipped(p,setName)?'item-rarity-set-complete':'item-rarity-set';
    const rarity=String(card.fields?.['Редкость']||'').toLowerCase();
    if(rarity.includes('легендар'))return'item-rarity-legendary';
    if(rarity.includes('эпичес'))return'item-rarity-epic';
    if(rarity.includes('элит'))return'item-rarity-elite';
    if(card.deck==='Тайники Сердца тьмы')return'item-rarity-heart';
    if(card.deck==='Тайники внешних регионов'&&String(card.fields?.['Эффект']||'').trim())return'item-rarity-effect';
    return'item-rarity-common';
  }
  function modifierSources(p,key){
    ensurePlayerModel(p);const out=[];
    for(const {id} of equippedEntries(p)){const card=itemCard(id);out.push(...bonusRegexSources(card,key))}
    const areas=state.areas.filter(a=>a.owner===p.id&&a.bonus);
    for(const a of areas){if(a.bonus.type==='stat'&&a.bonus.stat===key)out.push({label:`Область №${a.ownerAreaNumber||a.id}`,amount:a.bonus.amount,kind:'Область'});if(a.bonus.type==='defense'&&key==='defense')out.push({label:`Область №${a.ownerAreaNumber||a.id}`,amount:a.bonus.amount,kind:'Область'})}
    for(const e of (p.temporaryEffects||[])){if(e.key===key)out.push({label:e.label||'Временный эффект',amount:e.amount,kind:'Временный эффект'})}
    const st=new Set(p.statuses||[]);
    if(key==='wis'&&st.has('Страх'))out.push({label:'Страх',amount:-1,kind:'Негативный эффект'});
    if(st.has('Проклятие')&&['str','dex','wis','cha'].includes(key))out.push({label:'Проклятие',amount:-1,kind:'Негативный эффект'});
    if(key==='str'&&st.has('Слабость'))out.push({label:'Слабость',amount:-1,kind:'Негативный эффект'});
    if(key==='dex'&&st.has('Усталость')&&!fullSetEquipped(p,'Тени'))out.push({label:'Усталость',amount:-1,kind:'Негативный эффект'});
    return out;
  }
  function modifierTotal(p,key){return modifierSources(p,key).reduce((a,b)=>a+b.amount,0)}
  function effectiveStat(p,key){return Number(p[key]||0)+modifierTotal(p,key)}
  function effectiveDefense(p){return Number(p.defense||0)+modifierTotal(p,'defense')}
  function statDisplay(p,key){const base=key==='defense'?p.defense:p[key],mod=modifierTotal(p,key);return `${key==='defense'?'ЗЩ':statName(key)} ${key==='defense'?base:signed(base)} <button class="modifier-link" data-bonus-key="${key}">(${signed(mod)})</button>`}
  function removeId(arr,id){const i=arr.indexOf(id);if(i>=0)arr.splice(i,1);return i>=0}
  function discardHeldCard(card){if(!card)return;discardCard(deckKeyForCard(card),card)}
  function sourceRemove(p,id,ctx){ensurePlayerModel(p);if(ctx?.where==='backpack')return removeId(p.backpack,id);if(ctx?.where==='pending')return removeId(p.pendingItems,id);if(ctx?.where==='equipment'&&ctx.slot){if(getSlotId(p,ctx.slot)===id){setSlotId(p,ctx.slot,null);return true}}return false}
  function canEquipCard(p,card){
    if(!card)return{ok:false,why:'Карта не найдена.'};const type=itemType(card);
    if(type==='ценность')return{ok:false,why:'Ценность не экипируется.'};
    if(type==='наёмник')return{ok:true};
    if(type==='броня'||type==='щит'){
      const who=String(card.fields?.['Для кого']||'любой герой').toLowerCase();
      if(!who.includes('любой')&&!who.includes(p.name.toLowerCase()))return{ok:false,why:`${card.name} не подходит герою ${p.name}.`};
    }
    return{ok:true};
  }
  function targetSlots(card){const t=itemType(card);if(t==='оружие'||t==='щит')return['weapon'];if(t==='броня')return['armor'];if(t==='кольцо')return['ring0','ring1'];if(t==='амулет')return['amulet'];if(t==='артефакт')return['artifact'];if(t==='зелье')return['potion0','potion1'];if(t==='наёмник')return['mercenary'];return[]}
  function finalBackpackCapacityAfter(p,targetSlot,newId){const artifactAfter=targetSlot==='artifact'?newId:getSlotId(p,'artifact');return backpackCapacityWithArtifact(p,artifactAfter)}
  function equipTransaction(p,newId,ctx,targetSlot,oldMode='backpack'){
    const oldId=getSlotId(p,targetSlot);const bp=[...p.backpack],pend=[...p.pendingItems];
    if(ctx?.where==='backpack')removeId(bp,newId);if(ctx?.where==='pending')removeId(pend,newId);if(ctx?.where==='equipment'&&ctx.slot)setSlotId(p,ctx.slot,null);
    if(oldId!=null&&oldId!==newId){if(oldMode==='backpack')bp.push(oldId);else if(oldMode==='pending')pend.push(oldId)}
    const cap=finalBackpackCapacityAfter(p,targetSlot,newId);
    if(bp.length>cap){if(ctx?.where==='equipment'&&ctx.slot)setSlotId(p,ctx.slot,newId);return{ok:false,why:`После замены рюкзак превысит вместимость ${cap}.`}}
    if(oldId!=null&&oldId!==newId&&oldMode==='discard')discardHeldCard(itemCard(oldId));
    p.backpack=bp;p.pendingItems=pend;setSlotId(p,targetSlot,newId);
    log(`${p.name} экипирует <b>${itemCard(newId)?.name||newId}</b> в слот «${SLOT_LABELS[targetSlot]}».`);return{ok:true};
  }
  function receiveTreasure(p,card){
    if(!card)return{immediate:true};
    ensurePlayerModel(p);ensurePlayerStats(p);p.stats.lootFound++;p.pendingItems.push(card.id);return{immediate:false,id:card.id};
  }
  function heldLocation(p,id){ensurePlayerModel(p);if(p.backpack.includes(id))return{where:'backpack'};if(p.pendingItems.includes(id))return{where:'pending'};for(const {slot,id:sid} of equippedEntries(p))if(sid===id)return{where:'equipment',slot};return null}

  HEROES.forEach((h,i)=>{const label=document.createElement('label');label.className='hero-option';label.style.setProperty('--hero-color',h.color);label.innerHTML=`<input type="checkbox" value="${h.id}" ${i<5?'checked':''}><span class="hero-dot" style="background:${h.color}"></span><span class="hero-choice-main"><span class="hero-name">${h.name}</span><span class="hero-choice-stats">ЗД ${h.hp} · ЗЩ ${h.defense} · Урон ${h.baseDamage}</span><span class="hero-choice-stats">СИЛ ${signed(h.str)} · ЛОВ ${signed(h.dex)} · МУД ${signed(h.wis)} · ХАР ${signed(h.cha)}</span></span><span class="hero-choice-check">✓</span>`;els.heroPicker.appendChild(label)});

  function rollInitiative(players){const used=new Set();players.forEach(p=>{let r=rand(20),rerolls=[];while(used.has(r)){rerolls.push(r);r=rand(20)}used.add(r);p.initiative=r;p.initiativeRerolls=rerolls});return [...players].sort((a,b)=>b.initiative-a.initiative).map(p=>p.id)}
  function startGame(forcedIds=null,options={}){
    const ids=Array.isArray(forcedIds)?[...forcedIds]:[...els.heroPicker.querySelectorAll('input:checked')].map(x=>x.value);
    if(ids.length<2||ids.length>5){els.setupError.textContent='Нужно выбрать от 2 до 5 героев.';return}
    state=freshState();state.started=true;const sharedHard=options?.sharedDifficulty==='hard'||options?.hardMode===true;state.sharedDifficulty=Array.isArray(forcedIds)?(sharedHard?'hard':'normal'):null;
    state.players=ids.map(id=>{const h=HEROES.find(x=>x.id===id);return {...h,maxHp:h.hp,currentHp:h.hp,gold:0,hex:MAP.startHex,personalTurn:1,initiative:null,initiativeRerolls:[],statuses:[],statusTimers:{},statusTickedTurn:{},backpack:[],pendingItems:[],equipment:{weapon:null,armor:null,amulet:null,rings:[null,null],artifact:null,potions:[null,null],mercenary:null},temporaryEffects:[],combatEffects:[],itemUsage:{},hardMode:sharedHard,locationVisits:{},discoveredLocations:{},reexploreRiskHex:null,inDungeon:false,dungeonCard:null,dungeonEnteredTurn:null,notes:[],stats:freshPlayerStats()}});
    generatePermanentLocations({preserve:false});
    state.order=rollInitiative(state.players);document.body.classList.add('game-running');els.setupSection.hidden=true;els.gameSection.hidden=false;els.saveBtn.disabled=false;els.inventoryBtn.hidden=true;if(isMobileViewport()){els.sheetDrawer.hidden=true}else openCharacterSheet('overview',null,currentPlayer().id);setTimeout(()=>centerMapOnPlayer(currentPlayer(),'auto'),80);
    log(`<b>Партия v0.6.34 началась.</b> Игроков: ${state.players.length}. Колоды перемешаны. Все постоянные локации заранее размещены на карте для этой партии.`,null);
    state.order.forEach(id=>{const p=getPlayer(id);log(`Инициатива ${p.name}: D20 = <b>${p.initiative}</b>.`,p.id)});updateUI();renderBoard();
  }

  function movementFor(hexId,roll){const r=MAP.hexes[hexId]?.region;if(r==='cursed')return Math.max(1,Math.floor(roll/2));if(r==='heart_of_darkness')return 1;return roll}
  // Единое правило границы: ТК <-> ПТ и ПТ <-> СТ.
  // Первый гекс нового региона достижим, но пересечение границы ВСЕГДА завершает движение.
  function isRegionBoundary(a,b){const x=MAP.hexes[a]?.region,y=MAP.hexes[b]?.region;if(!x||!y||x===y)return false;return (x==='kingdom'&&y==='cursed')||(x==='cursed'&&y==='kingdom')||(x==='cursed'&&y==='heart_of_darkness')||(x==='heart_of_darkness'&&y==='cursed')}
  function scoutBootsReady(p){ensurePlayerModel(p);return Number(getSlotId(p,'artifact'))===201&&p.scoutBootsUsedTurn!==p.personalTurn}
  function movementPlans(start,maxDist,p=null){
    const allowJump=!!p&&scoutBootsReady(p),bestState=new Map(),queue=[{hex:start,cost:0,jumpUsed:false,path:[start],segments:[],stopped:false}];
    const keyOf=x=>`${x.hex}|${x.jumpUsed?1:0}`;
    while(queue.length){
      queue.sort((a,b)=>a.cost-b.cost||Number(a.jumpUsed)-Number(b.jumpUsed));
      const cur=queue.shift(),key=keyOf(cur),old=bestState.get(key);
      if(old&&old.cost<=cur.cost)continue;
      bestState.set(key,cur);
      if(cur.stopped||cur.cost>=maxDist)continue;
      for(const n of MAP.hexes[cur.hex].neighbors){
        const cost=cur.cost+1;if(cost>maxDist)continue;
        const boundary=isRegionBoundary(cur.hex,n);
        queue.push({hex:n,cost,jumpUsed:cur.jumpUsed,path:[...cur.path,n],segments:[...cur.segments,{from:cur.hex,to:n,cost:1,jump:false,boundary}],stopped:boundary});
      }
      if(allowJump&&!cur.jumpUsed&&cur.cost+2<=maxDist){
        for(const over of MAP.hexes[cur.hex].neighbors){
          // Сапоги перепрыгивают именно один гекс, но не используются для пересечения границы региона.
          if(isRegionBoundary(cur.hex,over))continue;
          for(const dest of MAP.hexes[over].neighbors){
            if(dest===cur.hex||isRegionBoundary(over,dest))continue;
            queue.push({hex:dest,cost:cur.cost+2,jumpUsed:true,path:[...cur.path,dest],segments:[...cur.segments,{from:cur.hex,to:dest,cost:2,jump:true,over,boundary:false}],stopped:false});
          }
        }
      }
    }
    const byHex={};
    for(const st of bestState.values()){
      const prev=byHex[st.hex];
      if(!prev||st.cost<prev.cost||(st.cost===prev.cost&&Number(st.jumpUsed)<Number(prev.jumpUsed)))byHex[st.hex]=st;
    }
    return byHex;
  }
  function movementPlan(start,target,maxDist,p=null){return movementPlans(start,maxDist,p)[target]||null}
  function movementPath(start,target,maxDist,p=null){return movementPlan(start,target,maxDist,p)?.path||null}
  function movementPlanText(plan){
    if(!plan?.segments?.length)return plan?.path?.join(' → ')||'';
    let out=plan.path?.[0]||plan.segments[0].from;
    for(const seg of plan.segments)out+=seg.jump?` ⇢ ${seg.to} (через ${seg.over})`:` → ${seg.to}`;
    return out;
  }
  function reachableFor(p,maxDist){
    const plans=movementPlans(p.hex,maxDist,p);
    return Object.entries(plans).filter(([h,pl])=>h!==p.hex&&pl.cost<=maxDist).map(([h])=>h);
  }

  // v0.5.21: маршрут движения строит сам игрок, по одному шагу.
  // Игра больше не выбирает кратчайший путь к конечному гексу автоматически.
  function manualMovePlan(p=currentPlayer()){
    const origin=state.moveOriginHex||p?.hex;
    const path=Array.isArray(state.chosenPath)&&state.chosenPath.length?[...state.chosenPath]:(origin?[origin]:[]);
    const savedSegments=Array.isArray(state.chosenMovePlan?.segments)?state.chosenMovePlan.segments:[];
    const segments=savedSegments.slice(0,Math.max(0,path.length-1)).map(x=>({...x}));
    const cost=segments.reduce((sum,seg)=>sum+Number(seg.cost||1),0);
    return{origin,path,segments,cost,jumpUsed:segments.some(seg=>seg.jump),stopped:segments.some(seg=>seg.boundary),hex:path.at(-1)||origin};
  }
  function manualMoveStepOptions(p=currentPlayer(),plan=manualMovePlan(p)){
    const out={};if(!p||!plan?.hex)return out;
    const remaining=Math.max(0,Number(state.movePoints||0)-Number(plan.cost||0));
    if(remaining<1||plan.stopped)return out;
    const tip=plan.hex,neighbors=MAP.hexes[tip]?.neighbors||[];
    for(const n of neighbors){
      const boundary=isRegionBoundary(tip,n);
      out[n]={from:tip,to:n,cost:1,jump:false,boundary};
    }
    // Сапоги следопыта остаются ручным специальным шагом: можно щёлкнуть гекс
    // через один, потратив 2 единицы движения. Автомаршрут при этом не строится.
    if(remaining>=2&&scoutBootsReady(p)&&!plan.jumpUsed){
      for(const over of neighbors){
        if(isRegionBoundary(tip,over))continue;
        for(const dest of MAP.hexes[over]?.neighbors||[]){
          if(dest===tip||isRegionBoundary(over,dest)||neighbors.includes(dest))continue;
          if(!out[dest])out[dest]={from:tip,to:dest,cost:2,jump:true,over,boundary:false};
        }
      }
    }
    return out;
  }
  function refreshManualMoveReachable(p=currentPlayer()){
    state.reachable=Object.keys(manualMoveStepOptions(p));
  }
  function setManualMovePlan(p,path,segments){
    const origin=state.moveOriginHex||path[0]||p.hex,cost=segments.reduce((sum,seg)=>sum+Number(seg.cost||1),0),final=path.at(-1)||origin;
    state.chosenPath=[...path];
    state.chosenMovePlan=path.length>1?{hex:final,cost,jumpUsed:segments.some(seg=>seg.jump),path:[...path],segments:segments.map(x=>({...x})),stopped:segments.some(seg=>seg.boundary)}:null;
    state.movePending=path.length>1;state.turnMoved=path.length>1;p.hex=final;
    state.foreignTerritoryPending=null;state.tradeOpportunity=null;state.locationActivationHex=null;
    refreshManualMoveReachable(p);updateUI();renderBoard();
  }
  function rollMove(){
    if(state.gameOver)return;const p=currentPlayer(); if(p.inDungeon||state.turnLocked||p.pendingItems?.length)return;
    state.die=rand(6);state.movePoints=movementFor(p.hex,state.die);state.rolled=true;state.turnMoved=false;state.movePending=false;state.moveOriginHex=p.hex;state.moveTransit=null;state.pendingMoveAction=null;state.chosenPath=[p.hex];state.chosenMovePlan=null;
    refreshManualMoveReachable(p);
    log(`${p.name}, личный ход ${p.personalTurn}: D6 = <b>${state.die}</b>, движение 1–${state.movePoints}. Маршрут выбирает игрок по одному гексу.`);updateUI();renderBoard();
  }
  function locationVisitStatus(p,hex){ensurePlayerModel(p);return p.locationVisits?.[hex]||'ready'}
  function canActivateLocationOnEntry(p,hex){
    const loc=state.locations[hex];if(!loc||loc.name==='Древний портал')return false;
    const st=locationVisitStatus(p,hex);return st==='ready';
  }
  function consumeLocationEntry(p,hex){
    ensurePlayerModel(p);if(!state.locations[hex]||state.locations[hex].name==='Древний портал')return false;
    const ok=canActivateLocationOnEntry(p,hex);if(ok)p.locationVisits[hex]='cooldown';return ok;
  }
  function markLocationDeparture(p,hex){
    ensurePlayerModel(p);if(!state.locations[hex]||state.locations[hex].name==='Древний портал')return;
    if(p.locationVisits[hex]==='cooldown')p.locationVisits[hex]='left';
  }
  function refreshLocationRevisitsAtEndTurn(p){
    ensurePlayerModel(p);for(const [hex,st] of Object.entries(p.locationVisits||{})){
      if(st==='left'&&p.hex!==hex)p.locationVisits[hex]='ready';
    }
  }

  function areaForHeroAtHex(p,hex){
    const t=state.territories[hex];if(!t||t.owner!==p.id||!t.areaId)return null;
    return state.areas.find(a=>a.id===t.areaId&&a.owner===p.id)||null;
  }
  function applyAreaHealingOnStop(p,hex){
    ensurePlayerModel(p);const area=areaForHeroAtHex(p,hex);if(!area)return;
    const key=String(area.id);if(p.areaHealingCooldown[key])return;
    const hr=rollHealing(p,'D4'),before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;
    p.areaHealingCooldown[key]=true;
    log(`${p.name} завершает движение в своей области №${area.ownerAreaNumber||area.id} (${hex}): ${hr.used} = <b>${hr.total}</b>${hr.reduced?' (Проклятие уменьшило лечение)':''}, восстановлено ${restored} ЗД.`);
    showRollPopup(`Область №${area.ownerAreaNumber||area.id} · лечение`,hr.total,`${hr.used} = <b>${hr.total}</b>`,`Восстановлено <b>${restored} ЗД</b> · ЗД ${p.currentHp}/${p.maxHp}${hr.reduced?'<br>Проклятие уменьшило кубик лечения.':''}`);
  }
  function refreshAreaVisitsAtEndTurn(p){
    ensurePlayerModel(p);for(const key of Object.keys(p.areaHealingCooldown||{})){
      const area=state.areas.find(a=>String(a.id)===String(key)&&a.owner===p.id);
      if(!area||!area.hexes.includes(p.hex))delete p.areaHealingCooldown[key];
    }
  }
  function setTradeOpportunityForArrival(p,hex){
    const otherIds=state.players.filter(q=>q.id!==p.id&&q.hex===hex).map(q=>q.id);
    state.tradeOpportunity=otherIds.length?{visitorId:p.id,hex,otherIds}:null;
  }
  function setForeignTerritoryPending(p,hex,extra={}){
    const t=state.territories[hex];
    state.foreignTerritoryPending=t&&t.owner!==p.id?{heroId:p.id,hex,ownerId:t.owner,ownerDecision:null,...extra}:null;
  }

  // Ручное построение маршрута. Каждый обычный клик добавляет ровно один соседний
  // гекс к маршруту. Клик по уже выбранному гексу обрезает маршрут до него.
  // Перемещение окончательно фиксируется только при действии на конечном гексе
  // (например, «Исследовать») или при завершении хода.
  function moveTo(hexId){
    if(state.gameOver||!state.rolled||state.turnLocked)return;
    const p=currentPlayer(),plan=manualMovePlan(p),path=[...plan.path],segments=plan.segments.map(x=>({...x}));
    const existing=path.lastIndexOf(hexId);
    if(existing>=0){
      if(existing===path.length-1)return;
      const newPath=path.slice(0,existing+1),newSegments=segments.slice(0,existing);
      setManualMovePlan(p,newPath,newSegments);return;
    }
    const options=manualMoveStepOptions(p,plan),seg=options[hexId];if(!seg)return;
    path.push(hexId);segments.push({...seg});setManualMovePlan(p,path,segments);
  }


  function startBossBattle(p=currentPlayer()){
    if(!p||p.hex!==MAP.bossHex||state.combat)return false;
    ensurePlayerStats(p);p.stats.bossAttempts++;
    state.foreignTerritoryPending=null;
    state.tributeConsentPending=null;
    state.tradeOpportunity=null;
    state.locationActivationHex=null;
    state.turnLocked=true;
    state.exploration={hero:p.id,hex:p.hex,deckKey:'boss',elitePending:false,failedTrap:false,wasCleaned:!!state.cleaned[p.hex],resumeAfterLoot:false,boss:true};
    p.reexploreRiskHex=null;
    log(`<b>${p.name} достигает ${MAP.bossHex}.</b> Другие карты Сердца тьмы не разыгрываются — начинается финальный бой с Владыкой Сердца Тьмы.`);
    combatStart(BOSS_CARD);
    return true;
  }

  function foreignMoveCheckpointKey(p,hex){
    const t=state.territories[hex];if(!t||t.owner===p.id)return null;
    return t.areaId?`area:${t.areaId}:${t.owner}`:`territory:${hex}`;
  }
  function nextForeignMoveCheckpoint(p,transit){
    const path=transit?.plan?.path||[],resolved=new Set(transit?.resolvedKeys||[]);
    for(let i=Math.max(1,(transit?.pathIndex||0)+1);i<path.length;i++){
      const hex=path[i],key=foreignMoveCheckpointKey(p,hex);
      if(key&&!resolved.has(key))return{index:i,hex,key};
    }
    return null;
  }
  function runPendingMoveAction(){
    const action=state.pendingMoveAction;state.pendingMoveAction=null;if(!action||state.gameOver)return;
    if(action.type==='explore'){beginExplore(action.deckKey);return}
    if(action.type==='visitLocation'){
      const p=currentPlayer(),hex=action.hex||p.hex;
      if(state.locationActivationHex===hex){state.locationUsedThisTurn=true;state.locationActivationHex=null;visitLocation(hex,()=>{updateUI();renderBoard()},{player:p,handoff:true})}
      return;
    }
    if(action.type==='trade'){openTrade(currentPlayer(),true);return}
    if(action.type==='build'){buildTerritory();return}
    if(action.type==='endTurn'){endTurn(false);return}
  }
  function finishCommittedMove(transit){
    const p=currentPlayer(),plan=transit.plan,realPath=plan.path,startHex=realPath[0],final=realPath.at(-1),crossed=!!plan.segments?.some(seg=>seg.boundary);
    p.hex=final;
    if(final!==startHex){ensurePlayerStats(p);p.stats.distanceTravelled+=Number(plan.cost||0);restockTavernIfVacant(startHex)}
    applyAreaHealingOnStop(p,final);
    state.moveTransit=null;state.movePending=false;state.reachable=[];state.moveOriginHex=null;state.chosenMovePlan=null;state.foreignTerritoryPending=null;
    if(state.locations[final]&&final!==startHex){revealLocationToPlayer(p,final);recordLocationVisit(p,final);resetItemUsage(p,'location')}if(state.territories[final]?.owner===p.id)resetItemUsage(p,'ownTerritory')
    if(final===MAP.bossHex){
      state.pendingMoveAction=null;log(`${p.name} перемещается: <b>${movementPlanText(plan)}</b>.${crossed?' <b>Пересечена граница — движение закончено.</b>':''}`);startBossBattle(p);renderBoard();return false;
    }
    setTradeOpportunityForArrival(p,final);state.locationActivationHex=consumeLocationEntry(p,final)?final:null;
    log(`${p.name} перемещается: <b>${movementPlanText(plan)}</b>.${crossed?' <b>Пересечена граница — движение закончено.</b>':''}`);
    if(state.territories[final]?.owner===p.id){state.pendingMoveAction=null;updateUI();renderBoard();const why=state.territories[final]?.areaId?'остановка в своей области':'остановка на своей территории';setTimeout(()=>{if(!els.rollOverlay.hidden)advanceTurnWithSideInteraction(p,'territory',why,[p.id]);else advanceTurnState(p,why)},0);return false}
    if(state.locations[final]?.name==='Древний портал'){state.pendingMoveAction=null;handlePortalArrival(p,final,plan.cost,crossed);return false}
    updateUI();renderBoard();if(state.pendingMoveAction)setTimeout(runPendingMoveAction,0);return true;
  }
  function continueMoveTransit(){
    const transit=state.moveTransit,p=currentPlayer();if(!transit||!p||transit.heroId!==p.id)return false;
    const checkpoint=nextForeignMoveCheckpoint(p,transit);
    if(checkpoint){
      transit.pathIndex=checkpoint.index;p.hex=checkpoint.hex;setForeignTerritoryPending(p,checkpoint.hex,{transitKey:checkpoint.key});state.turnLocked=false;
      const owner=getPlayer(state.foreignTerritoryPending?.ownerId),area=fullAreaForTerritory(checkpoint.hex);
      log(`<b>${p.name} входит ${area?'в чужую область':'на чужую территорию'} ${checkpoint.hex}</b> игрока ${owner?.name||'—'}. Движение по выбранному маршруту приостановлено до решения вопроса о проходе.`);
      updateUI();renderBoard();return false;
    }
    return finishCommittedMove(transit);
  }
  function commitPendingMove(pendingAction=null){
    if(pendingAction)state.pendingMoveAction=pendingAction;
    if(!state.movePending){if(state.pendingMoveAction)setTimeout(runPendingMoveAction,0);return true}
    const p=currentPlayer(),plan=state.chosenMovePlan||movementPlan(state.moveOriginHex||p.hex,p.hex,state.movePoints,p),realPath=plan?.path;
    if(!plan||!Array.isArray(realPath)||realPath.length<2){state.movePending=false;state.chosenMovePlan=null;if(state.pendingMoveAction)setTimeout(runPendingMoveAction,0);return true}
    const startHex=realPath[0],final=realPath.at(-1);
    if(final!==startHex)markLocationDeparture(p,startHex);
    if(plan.jumpUsed){
      p.scoutBootsUsedTurn=p.personalTurn;const jump=plan.segments.find(seg=>seg.jump);
      if(jump)log(`${p.name}: <b>Сапоги следопыта</b> — перепрыгнут гекс ${jump.over}: ${jump.from} ⇢ ${jump.to}. Стоимость: 2 единицы движения.`);
    }
    p.hex=startHex;state.moveTransit={heroId:p.id,plan:{hex:plan.hex,cost:plan.cost,jumpUsed:plan.jumpUsed,path:[...plan.path],segments:plan.segments.map(x=>({...x})),stopped:plan.stopped},pathIndex:0,resolvedKeys:[]};
    state.movePending=false;state.reachable=[];state.moveOriginHex=null;state.chosenMovePlan=null;state.turnMoved=true;state.foreignTerritoryPending=null;state.tradeOpportunity=null;state.locationActivationHex=null;
    return continueMoveTransit();
  }

  function completePortalTeleport(p,entryHex,dest,remaining){
    p.hex=dest;revealLocationToPlayer(p,dest);recordLocationVisit(p,dest);state.portalPending=null;state.turnLocked=false;state.movePoints=remaining;setForeignTerritoryPending(p,dest);setTradeOpportunityForArrival(p,dest);
    log(`${p.name}: портал <b>${entryHex} → ${dest}</b>. Телепортация не расходует движение.${remaining>0?` Осталось движения: ${remaining}.`:''}`);
    if(remaining>0){state.turnMoved=false;state.movePending=false;state.moveOriginHex=dest;state.chosenPath=[dest];state.chosenMovePlan=null;refreshManualMoveReachable(p)}else{state.turnMoved=true;state.movePending=false;state.moveOriginHex=null;state.reachable=[];state.chosenPath=null;state.chosenMovePlan=null}
    updateUI();renderBoard();setTimeout(()=>{if(currentPlayer()?.id===p.id)advanceTurnState(p,'использование Древнего портала')},0);
  }
  function selectPortalDestination(dest){
    const pp=state.portalPending;if(!pp||!pp.destinations?.includes(dest))return;
    const p=getPlayer(pp.heroId)||currentPlayer();if(!p)return;
    completePortalTeleport(p,pp.entryHex,dest,pp.remaining||0);
  }
  function handlePortalArrival(p,entryHex,spentSteps,crossedBoundary){
    const portals=Object.entries(state.locations).filter(([h,v])=>v.name==='Древний портал'&&locationVisibleToPlayer(p,h)).map(([h])=>h);
    const destinations=portals.filter(h=>h!==entryHex);
    if(!destinations.length){updateUI();renderBoard();setTimeout(()=>{if(currentPlayer()?.id===p.id)advanceTurnState(p,'посещение Древнего портала')},0);return}
    const remaining=crossedBoundary?0:Math.max(0,state.movePoints-spentSteps);
    if(destinations.length===1){completePortalTeleport(p,entryHex,destinations[0],remaining);return}
    state.turnLocked=true;state.portalPending={heroId:p.id,entryHex,destinations:[...destinations],remaining};
    log(`${p.name}: открыт выбор портала. Выберите на карте один из фиолетово подсвеченных гексов: <b>${destinations.join(', ')}</b>.`);
    updateUI();renderBoard();
  }

  function requestPassagePermission(){
    const p=currentPlayer(),pend=state.foreignTerritoryPending;if(!pend||pend.heroId!==p.id)return;const owner=getPlayer(pend.ownerId);if(!owner)return;
    state.tributeConsentPending={kind:'passage',visitorId:p.id,ownerId:owner.id,hex:pend.hex};state.turnLocked=true;
    log(`${p.name} просит ${owner.name} разрешить бесплатный проход по территории ${pend.hex}. Ожидается решение владельца на его устройстве.`);updateUI();renderBoard();
  }
  function resolvePassagePermission(allow){
    const req=state.tributeConsentPending;if(!req)return;const owner=getPlayer(req.ownerId),visitor=getPlayer(req.visitorId);if(onlineLocalHeroId&&onlineLocalHeroId!==req.ownerId)return;
    state.tributeConsentPending=null;state.turnLocked=false;
    if(allow){log(`${owner?.name||'Владелец'} разрешает ${visitor?.name||'герою'} пройти по территории ${req.hex} без дани.`);clearForeignTerritoryPending()}
    else{log(`${owner?.name||'Владелец'} не разрешает ${visitor?.name||'герою'} пройти по территории ${req.hex}.`);updateUI();renderBoard()}
  }


  function recycleDiscardIntoDraw(deckKey){
    const d=state.decks[deckKey];if(!d||d.draw.length||!d.discard.length)return !!d?.draw?.length;
    d.draw=shuffled(d.discard);d.discard=[];
    log(`Колода «${DECK_NAMES[deckKey]}»: сброс случайным образом перемешан и стал новой колодой.`);
    return true;
  }
  function drawCard(deckKey){
    const d=state.decks[deckKey]; if(!d)return null;
    if(!d.draw.length&&!recycleDiscardIntoDraw(deckKey))return null;
    const id=d.draw.pop();return CARD_BY_ID[id]||null;
  }
  function discardCard(deckKey,card){if(card&&state.decks[deckKey])state.decks[deckKey].discard.push(card.id)}
  function returnCardToDeckRandom(deckKey,card){
    if(!card||!state.decks[deckKey])return;
    state.decks[deckKey].draw.push(card.id);
    state.decks[deckKey].draw=shuffled(state.decks[deckKey].draw);
  }
  function deckKeyForCard(card){if(card?.id===281||card?.category==='Босс')return'boss';if(card.deck==='Исследования внешних регионов')return'exploreOuter';if(card.deck==='Исследования Сердца тьмы')return'exploreHeart';if(card.deck==='Тайники внешних регионов')return'lootOuter';return'lootHeart'}
  function cleanCardFieldValue(v){return String(v??'').split(/\n={5,}/)[0].trim()}
  function displayCardFieldEntries(card){return Object.entries(card?.fields||{}).filter(([k])=>!['НОМЕР','Название','Колода','Категория','Номер в своей колоде','Регион','КОЛОДА'].includes(k)&&!k.startsWith('---')&&!/^=+$/.test(k)).map(([k,v])=>[k,cleanCardFieldValue(v)]).filter(([,v])=>v)}
  function showCard(card,extra='',actions=[]){
    modalOffturnOwnerId=null;modalCloseAction=null;
    const fields=displayCardFieldEntries(card).map(([k,v])=>`<div class="card-field"><b>${k}:</b> ${v.replace(/\n/g,'<br>')}</div>`).join('');
    els.modalContent.innerHTML=`<div class="card-kicker">${card.category} · №${card.id} · ${card.deck}</div><div class="card-title">${card.name}</div><div class="card-fields">${fields}</div>${extra?`<div class="card-field" style="margin-top:10px">${extra}</div>`:''}<div class="modal-actions" id="modalActions"></div>`;
    const box=els.modalContent.querySelector('#modalActions');actions.forEach(a=>{const b=document.createElement('button');b.className=a.className||'primary';b.textContent=a.label;b.onclick=()=>a.fn();box.appendChild(b)});els.modal.hidden=false;
  }
  function closeModal(){els.modal.hidden=true;els.modalContent.innerHTML='';els.modalClose.style.display='';modalOffturnOwnerId=null;modalCloseAction=null}
  function requestModalClose(){if(modalCloseAction){const fn=modalCloseAction;modalCloseAction=null;fn();return}if(!state.turnLocked)closeModal()}
  const rollPopupQueue=[];
  let rollPopupAfterClose=null;
  function showRollPopup(title,main,math='',detail='',natural=null,onClose=null,buttonLabel='Продолжить'){
    rollPopupQueue.push({title,main:String(main),math,detail,natural,onClose,buttonLabel});if(els.rollOverlay.hidden)showNextRollPopup();
  }
  function showNextRollPopup(){
    const x=rollPopupQueue.shift();if(!x){els.rollOverlay.hidden=true;rollPopupAfterClose=null;els.rollPopupClose.textContent='Продолжить';return}
    els.rollPopupTitle.textContent=x.title||'Бросок';
    els.rollPopupMain.textContent=x.main;
    els.rollPopupMain.className='roll-popup-main'+(x.natural===20?' natural20':x.natural===1?' natural1':'');
    els.rollPopupMath.innerHTML=x.math||'';
    els.rollPopupDetail.innerHTML=x.detail||'';
    els.rollPopupClose.textContent=x.buttonLabel||'Продолжить';
    rollPopupAfterClose=typeof x.onClose==='function'?x.onClose:null;
    els.rollOverlay.hidden=false;
  }
  function announceCheck(title,d,statLabel,bonus,total,dc,ok,natural=null,extra=''){
    recordNatural(currentPlayer(),natural);
    showRollPopup(title,d,`D20 <b>${d}</b> ${signed(bonus)} ${statLabel} = <b>${total}</b>`,`Сложность ${dc} · <b>${ok?'УСПЕХ':'ПРОВАЛ'}</b>${natural?` · Натуральная ${natural}`:''}${extra?`<br>${extra}`:''}`,natural);
  }

  function beginExplore(deckKey){
    if(state.movePending){commitPendingMove({type:'explore',deckKey});return}
    const p=currentPlayer();
    if(p.hex===MAP.bossHex){startBossBattle(p);return}
    state.turnLocked=true;state.exploration={hero:p.id,hex:p.hex,deckKey,elitePending:false,failedTrap:false,wasCleaned:!!state.cleaned[p.hex],resumeAfterLoot:false};p.reexploreRiskHex=state.cleaned[p.hex]?p.hex:null;
    log(`${p.name} начинает исследование <b>${p.hex}</b>: ${DECK_NAMES[deckKey]}.`);
    if(maybeUseTrackerBeforeExplore(p,deckKey))return;
    drawNextExplore();
  }
  function maybeUseTrackerBeforeExplore(p,deckKey){
    if(Number(getSlotId(p,'mercenary'))!==198||p.trackerUsedTurn===p.personalTurn)return false;
    const next=peekExploreTop(deckKey);if(!next)return false;p.trackerUsedTurn=p.personalTurn;
    const tracker=itemCard(198),preview=`<div class="recon-preview"><div class="card-kicker">Верхняя карта · №${next.id}</div><div class="card-title">${next.name}</div><div class="card-fields">${itemFieldsHtml(next)}</div></div>`;
    showCard(tracker,`<b>Следопыт</b> используется один раз за личный ход героя и смотрит верхнюю карту выбранной колоды исследования независимо от региона.<br>${preview}<br><b>Сыграть карту или замешать её обратно?</b>`,[
      {label:'Сыграть',className:'success',fn:()=>{const d=state.decks[deckKey];if(d.draw[d.draw.length-1]===next.id)d.draw.pop();closeModal();log(`Следопыт ${p.name}: сыграна верхняя карта №${next.id} «${next.name}».`);log(`Открыта карта №${next.id} «<b>${next.name}</b>» (${next.category}).`);resolveExploreCard(next)}},
      {label:'Замешать обратно',className:'secondary',fn:()=>{state.decks[deckKey].draw=shuffled(state.decks[deckKey].draw);closeModal();log(`Следопыт ${p.name}: верхняя карта «${next.name}» замешана обратно в ${DECK_NAMES[deckKey]}.`);setTimeout(drawNextExplore,80)}}
    ]);return true;
  }
  function drawNextExplore(){
    const ex=state.exploration;if(!ex)return;const card=drawCard(ex.deckKey);if(!card){finishExplore(false,'Колода пуста');return}
    log(`Открыта карта №${card.id} «<b>${card.name}</b>» (${card.category}).`);resolveExploreCard(card);
  }
  function continueExplore(card,deckKey,delay=true){discardCard(deckKey,card);closeModal();setTimeout(drawNextExplore,delay?120:0)}
  function pauseExploreForPendingLoot(card,deckKey){
    const p=currentPlayer();if(!p?.pendingItems?.length)return false;discardCard(deckKey,card);closeModal();if(state.exploration)state.exploration.resumeAfterLoot=true;log(`${p.name}: исследование приостановлено для разбора найденного тайника.`);openCharacterSheet('pending');updateUI();return true;
  }
  function addTrapFutureEffect(p,card){
    ensurePlayerModel(p);let effect=null;
    if(card.id===58)effect={type:'nextBattleEnemyFirst',label:card.name};
    else if(card.id===60)effect={type:'nextBattleDisadvantage',attacksRemaining:1,label:card.name};
    else if(card.id===106)effect={type:'nextBattleAbilityLocked',label:card.name};
    else if(card.id===108)effect={type:'nextEnemyHitBonus',amount:2,label:card.name};
    if(effect){p.combatEffects.push(effect);log(`${p.name}: «${card.name}» оставляет эффект на следующий бой.`);return true}return false;
  }

  function resolveExploreCard(card){
    const ex=state.exploration,p=currentPlayer(),deckKey=ex.deckKey;
    if(card.category==='Враг'){resolveEnemy(card);return}
    if(card.category==='Ловушка'){resolveTrap(card);return}
    if(card.category==='Событие'){resolveEvent(card);return}
    if(card.category==='Постоянная локация'){resolvePermanentLocation(card);return}
    if(card.category==='Темница'){p.inDungeon=true;p.dungeonCard=card.id;p.dungeonEnteredTurn=p.personalTurn;state.dungeonEntryNotice={heroId:p.id,cardId:card.id};discardCard(deckKey,card);log(`<b>${p.name} попадает в Темницу.</b> Карта уходит в сброс. В ЭТОТ ход проверка выхода не выполняется; первая попытка будет в следующий личный ход.`);showDungeonEntryNotice(p,card);return}
    if(card.category==='Элитная опасность'){
      state.exploration.elitePending=true;discardCard(deckKey,card);log('Следующий найденный враг будет <b>Элитной опасностью</b> и атакует первым.');
      showCard(card,'<b>Элитная опасность активирована.</b><br>Следующий найденный враг считается Элитной опасностью и атакует первым. Исследование продолжается до врага.',[{label:'Продолжить исследование',className:'danger',fn:()=>{closeModal();setTimeout(drawNextExplore,100)}}]);return
    }
    if(card.category==='Тёмное испытание'){resolveDarkTrial(card);return}
    if(card.category==='Проклятый шаг'){resolveCursedStep(card);return}
    discardCard(deckKey,card);showCard(card,'Эффект этой карты пока не автоматизирован. Карта будет сброшена, исследование продолжится.',[{label:'Продолжить',fn:()=>{closeModal();drawNextExplore()}}]);
  }

  function resolveTrap(card){
    const check=card.fields['Проверка']||'',key=statKeyFromText(check),dc=Number((check.match(/(\d+)\+/)||[])[1]||13);
    const label=key?statName(key):'характеристика';
    const prep=playerHardMode(currentPlayer())?'':`<div class="trap-prep-note"><b>Подготовка к ловушке.</b><br>До броска можно открыть вкладку «ИНВЕНТАРЬ» справа и изменить экипировку. Когда будете готовы, нажмите «Проверка».</div>`;
    showCard(card,prep,[
      {label:`Проверка · ${label} ${dc}+`,className:'success',fn:()=>performTrapCheck(card)}
    ]);
  }
  function performTrapCheck(card){
    const p=currentPlayer(),ex=state.exploration,deckKey=ex?.deckKey,check=card.fields['Проверка']||'',key=statKeyFromText(check),dc=Number((check.match(/(\d+)\+/)||[])[1]||13);
    let bonus=key?effectiveStat(p,key):0;
    const boostId=key==='dex'?170:key==='str'?171:null;
    if(boostId&&combatHasEquipped(p,boostId)&&p.itemUsage?.[boostId]?.turn!==p.personalTurn&&confirm(`${itemCard(boostId).name}: применить +3 к этой проверке?`)){bonus+=3;p.itemUsage[boostId]={turn:p.personalTurn}}
    let d20=rand(20),total=d20+bonus,natural=d20===20?20:d20===1?1:null,ok=natural===20?true:natural===1?false:total>=dc;
    if(!ok&&combatHasEquipped(p,163)&&confirm('Плащ Тени: перебросить проверку ловушки?')){d20=rand(20);total=d20+bonus;natural=d20===20?20:d20===1?1:null;ok=natural===20?true:natural===1?false:total>=dc;log(`${p.name}: Плащ Тени — переброс проверки ловушки.`)}
    const outcome=ok?(card.fields['Успех']||'Ловушка пройдена без последствий.'):(card.fields['Провал']||'Проверка провалена.');
    let extra=`Бросок: D20 <b>${d20}</b> + ${key?statName(key):'?'} ${bonus>=0?'+':''}${bonus} = <b>${total}</b> против ${dc}. <b>${ok?'УСПЕХ':'ПРОВАЛ'}</b>.<br>${ok?'<b>Результат:</b>':'<b>Провал:</b>'} ${outcome}`;
    let damageTaken=0;
    log(`${p.name}: ловушка «${card.name}» — D20 ${d20} + ${key?statName(key):'?'} ${bonus>=0?'+':''}${bonus} = ${total} против ${dc}: <b>${ok?'успех':'провал'}</b>.`);
    const naturalBonusText=natural===20&&card.id===101?' · Натуральная 20: следующий бой — первый урон героя ×2':'';announceCheck(`Ловушка · ${card.name}`,d20,key?statName(key):'характеристика',bonus,total,dc,ok,natural,`${ok?'Результат':'Провал'}: ${outcome}${naturalBonusText}`);
    if(!ok){
      if(state.exploration)state.exploration.failedTrap=true;
      const effectResult=applyEffectText(p,card.fields['Провал']||'')||{};damageTaken+=Number(effectResult.damage||0);addTrapFutureEffect(p,card);
    }else if(card.fields['Успех']){
      const effectResult=applyEffectText(p,card.fields['Успех'])||{};damageTaken+=Number(effectResult.damage||0);
    }
    if(!state.exploration||p.currentHp<=0){if(!els.sheetDrawer.hidden&&sheetView.playerId===p.id)renderCharacterSheet(sheetView.mode,sheetView.bonusKey);updateUI();return}
    if(natural===20){
      if(card.id===101){p.combatEffects.push({type:'nextBattleFirstDamageMultiplier',amount:2,label:card.name,sourceCardId:card.id});extra+=`<br><b>Натуральная 20:</b> в следующем бою первый урон героя ×2.`;log(`${p.name}: Натуральная 20 «${card.name}» — в следующем бою первый урон героя ×2.`)}
      else{const lootKey=deckKey==='exploreHeart'?'lootHeart':'lootOuter',loot=drawCard(lootKey);if(loot){receiveTreasure(p,loot);log(`${p.name}: Натуральная 20 на ловушке — найден тайник №${loot.id} «${loot.name}».`)}}
    }
    if(natural===1&&p.currentHp>0){const extraDmg=rand(6);damageTaken+=extraDmg;damage(p,extraDmg);log(`${p.name}: Натуральная 1 на ловушке — дополнительно D6 = ${extraDmg} урона.`);showRollPopup('Ловушка · Натуральная 1',extraDmg,`D6 = <b>${extraDmg}</b>`,'Дополнительный урон');}
    if(damageTaken>0&&combatHasEquipped(p,195)&&!useBlocked(p,195)){const restored=Math.min(damageTaken,Math.max(0,p.maxHp-p.currentHp));p.currentHp+=restored;useMark(p,195,'shrine');damageTaken=Math.max(0,damageTaken-restored);log(`${p.name}: Оберег выжившего игнорирует урон ловушки.`)}
    else if(damageTaken>0&&combatHasEquipped(p,165)){const r=rollExprDetailed('D4'),restored=Math.min(r.total,damageTaken,Math.max(0,p.maxHp-p.currentHp));p.currentHp+=restored;damageTaken-=restored;showRollPopup('Кольцо стойкости',r.total,`D4 = ${r.total}`,`Урон ловушки уменьшен на ${restored}`)}
    if(damageTaken>0)extra+=`<br><b>Получено ${damageTaken} урона.</b>`;
    if(!els.sheetDrawer.hidden&&sheetView.playerId===p.id)renderCharacterSheet(sheetView.mode,sheetView.bonusKey);
    updateUI();
    if(!state.exploration||p.currentHp<=0)return;
    if(p.pendingItems.length){showCard(card,extra+'<br><b>Найден тайник. Его можно разобрать до продолжения исследования.</b>',[{label:'Разобрать тайник',className:'success',fn:()=>pauseExploreForPendingLoot(card,deckKey)}]);return}
    showCard(card,extra,[{label:'Продолжить исследование',fn:()=>continueExplore(card,deckKey)}]);
  }
  function peekExploreTop(deckKey){const d=state.decks[deckKey];if(!d)return null;if(!d.draw.length&&!recycleDiscardIntoDraw(deckKey))return null;return itemCard(d.draw[d.draw.length-1])}
  function resolveReconnaissance(card){
    const ex=state.exploration;if(!ex)return;const deckKey=ex.deckKey,next=peekExploreTop(deckKey);
    if(!next){discardCard(deckKey,card);showCard(card,'Следующей карты нет: колода пуста.',[{label:'Продолжить',fn:()=>{closeModal();drawNextExplore()}}]);return}
    const preview=`<div class="recon-preview"><div class="card-kicker">Следующая карта · №${next.id}</div><div class="card-title">${next.name}</div><div class="card-fields">${itemFieldsHtml(next)}</div></div>`;
    showCard(card,`Разведка показывает верхнюю карту колоды:<br>${preview}<br><b>Сыграть её или сбросить?</b>`,[
      {label:'Сыграть',className:'success',fn:()=>{const d=state.decks[deckKey];if(d.draw[d.draw.length-1]===next.id)d.draw.pop();discardCard(deckKey,card);closeModal();log(`Разведка: игрок выбирает сыграть №${next.id} «${next.name}».`);log(`Открыта карта №${next.id} «<b>${next.name}</b>» (${next.category}).`);resolveExploreCard(next)}},
      {label:'Сбросить',className:'danger',fn:()=>{const d=state.decks[deckKey];if(d.draw[d.draw.length-1]===next.id)d.draw.pop();discardCard(deckKey,next);discardCard(deckKey,card);closeModal();log(`Разведка: №${next.id} «${next.name}» отправлена в сброс.`);setTimeout(drawNextExplore,80)}}
    ]);
  }
  function addNextBattleEventEffect(p,card){
    ensurePlayerModel(p);let effect=null,summary=null;
    if(card.name==='Благословение путника'){effect={type:'nextBattleAttack',amount:2,attacksRemaining:2,label:card.name,sourceCardId:card.id};summary='+2 к атаке на первые 2 атаки следующего боя.'}
    else if(card.name==='Следы врага'){effect={type:'nextBattleAdvantage',attacksRemaining:2,label:card.name,sourceCardId:card.id};summary='Преимущество на первые 2 атаки следующего боя.'}
    else if(card.name==='Разлом пути'){effect={type:'nextBattleFreeEscape',label:card.name,sourceCardId:card.id};summary='В следующем бою можно сбежать до боя или во время боя без проверки.'}
    else if(card.name==='Зов Сердца'){effect={type:'nextBattleAdvantage',attacksRemaining:1,label:card.name,sourceCardId:card.id};summary='Преимущество на следующую атаку.'}
    else if(card.name==='Молитва истинного удара'){effect={type:'nextBattleAllAdvantage',label:card.name,sourceCardId:card.id};summary='В следующем бою все атаки героя выполняются с преимуществом.'}
    else if(card.name==='Покров Стража'){effect={type:'nextBattleDefense',amount:3,label:card.name,sourceCardId:card.id};summary='В следующем бою герой получает +3 ЗЩ.'}
    else if(card.name==='Печать возмездия'){effect={type:'nextBattleHeroDamageMultiplier',amount:2,label:card.name,sourceCardId:card.id};summary='В следующем бою урон от атак героя удваивается.'}
    else if(card.name==='Железная молитва'){effect={type:'nextBattleIncomingHalf',label:card.name,sourceCardId:card.id};summary='В следующем бою получаемый героем урон уменьшается вдвое, округляя вверх.'}
    else if(card.name==='Морок Сердца'){effect={type:'nextBattleEnemyDisadvantageAll',label:card.name,sourceCardId:card.id};summary='В следующем бою все атаки врага выполняются с помехой.'}
    if(effect){p.combatEffects.push(effect);return summary}
    return null
  }

  function explorationLootKey(){return state.exploration?.deckKey==='exploreHeart'?'lootHeart':'lootOuter'}
  function applyTreasureSearchNatural(p,natural,label='Поиск тайника'){
    if(natural===20){const key=explorationLootKey(),extra=drawCard(key);if(extra){receiveTreasure(p,extra);log(`${p.name}: <b>Натуральная 20</b> — ${label}: +1 ${DECK_NAMES[key]} №${extra.id} «${extra.name}».`);return{extra}}}
    if(natural===1){const dmg=rand(6);damage(p,dmg);showRollPopup(`${label} · Натуральная 1`,dmg,`D6 = <b>${dmg}</b>`,`Получено ${dmg} урона · ЗД ${Math.max(0,p.currentHp)}/${p.maxHp}`);log(`${p.name}: <b>Натуральная 1</b> — ${label}: D6 = ${dmg} урона.`);return{damage:dmg}}
    return{};
  }
  function resolveOldCache(card){
    const p=currentPlayer(),wis=effectiveStat(p,'wis'),d=rand(20),total=d+wis,natural=d===20?20:d===1?1:null,ok=d===20?true:d===1?false:total>=13;
    const lootKey=ok?'lootHeart':'lootOuter',loot=drawCard(lootKey);
    announceCheck(`Событие · ${card.name}`,d,'МУД',wis,total,13,ok,natural,ok?'Тайник Сердца тьмы':'Тайник внешних регионов');
    if(loot){receiveTreasure(p,loot);log(`${p.name}: «${card.name}» — ${ok?'успех':'провал'} проверки МУД 13+, получен ${DECK_NAMES[lootKey]} №${loot.id} «${loot.name}».`)}
    const natResult=applyTreasureSearchNatural(p,natural,`«${card.name}»`);if(p.currentHp<=0)return;
    const extraText=natResult.extra?`<br><b>Натуральная 20:</b> дополнительно получен тайник региона №${natResult.extra.id} «${natResult.extra.name}».`:natResult.damage?`<br><b>Натуральная 1:</b> получено D6 = ${natResult.damage} урона.`:'';
    showCard(card,`D20 ${d} + МУД ${signed(wis)} = <b>${total}</b>.<br>Получен: <b>${ok?'Тайник Сердца тьмы':'Тайник внешних регионов'}</b>${loot?` — №${loot.id} «${loot.name}»`:''}.${extraText}`,p.pendingItems.length?[{label:'Разобрать тайник',className:'success',fn:()=>pauseExploreForPendingLoot(card,state.exploration.deckKey)}]:[{label:'Продолжить',className:'success',fn:()=>continueExplore(card,state.exploration.deckKey)}]);
  }
  function resolveAncientHeroTracks(card){
    const p=currentPlayer(),key='lootHeart',a=drawCard(key),b=drawCard(key),cards=[a,b].filter(Boolean);
    if(!cards.length){showCard(card,'Колода Тайников Сердца тьмы пуста.',[{label:'Продолжить',fn:()=>continueExplore(card,state.exploration.deckKey)}]);return}
    showCard(card,'Посмотрите открытые Тайники Сердца тьмы. Выберите один; второй будет замешан обратно.',cards.map((c,i)=>({label:`Взять №${c.id} · ${c.name}`,className:'success',fn:()=>{receiveTreasure(p,c);const other=cards[1-i];if(other)state.decks[key].draw.push(other.id),state.decks[key].draw=shuffled(state.decks[key].draw);log(`${p.name}: «${card.name}» — выбран тайник №${c.id} «${c.name}».`);pauseExploreForPendingLoot(card,state.exploration.deckKey)}})));
  }
  function resolveCheckedEvent(card){
    const p=currentPlayer(),check=card.fields['Проверка']||'',key=statKeyFromText(check),dc=Number((check.match(/(\d+)\+/)||[])[1]||13);
    const d=rand(20),bonus=key?effectiveStat(p,key):0,total=d+bonus,natural=d===20?20:d===1?1:null,ok=natural===20?true:natural===1?false:total>=dc;
    const resultText=ok?(card.fields['Успех']||''):(card.fields['Провал']||'');
    announceCheck(`Событие · ${card.name}`,d,key?statName(key):'характеристика',bonus,total,dc,ok,natural);
    log(`${p.name}: «${card.name}» — D20 ${d} + ${key?statName(key):'?'} ${signed(bonus)} = ${total} против ${dc}: <b>${ok?'успех':'провал'}</b>.`);
    const pendingBefore=p.pendingItems.length;applyEffectText(p,resultText,state.exploration?.deckKey);
    const isLootSearch=/Тайник/i.test(String(card.fields['Успех']||''))||/Тайник/i.test(String(card.fields['Эффект']||''));
    if(isLootSearch)applyTreasureSearchNatural(p,natural,`«${card.name}»`);
    if(!state.exploration||p.currentHp<=0)return;
    if(p.pendingItems.length>pendingBefore){showCard(card,`D20 ${d} + ${key?statName(key):'?'} ${signed(bonus)} = <b>${total}</b> против ${dc}.<br><b>${ok?'Успех':'Провал'}:</b> ${resultText||'без дополнительного эффекта'}.<br><b>Полученный тайник можно разобрать прямо сейчас.</b>`,[{label:'Разобрать тайник',className:'success',fn:()=>pauseExploreForPendingLoot(card,state.exploration.deckKey)}]);return}
    showCard(card,`D20 ${d} + ${key?statName(key):'?'} ${signed(bonus)} = <b>${total}</b> против ${dc}.<br><b>${ok?'Успех':'Провал'}:</b> ${resultText||'без дополнительного эффекта'}.`,[{label:'Продолжить',className:'success',fn:()=>continueExplore(card,state.exploration.deckKey)}]);
  }
  function resolveEvent(card){
    const p=currentPlayer(),eff=card.fields['Эффект']||'';
    if(card.name==='Разведка'){resolveReconnaissance(card);return}
    if(card.name==='Старый тайник'){resolveOldCache(card);return}
    if(card.name==='Следы древнего героя'){resolveAncientHeroTracks(card);return}
    if(card.fields['Проверка']){resolveCheckedEvent(card);return}
    if(NON_STACKING_EVENT_EFFECTS.has(card.name)){const duplicate=(p.combatEffects||[]).some(e=>Number(e.sourceCardId)===Number(card.id)||e.label===card.name);if(duplicate){log(`${p.name}: дубль карты «${card.name}» — эффект уже активен и не суммируется.`);updateUI();showCard(card,`<b>Дубль карты «${card.name}».</b><br>Этот эффект уже есть у героя и не суммируется. Новая копия эффекта пропущена.`,[{label:'Продолжить',className:'success',fn:()=>continueExplore(card,state.exploration.deckKey)}]);return}const note=addNextBattleEventEffect(p,card);log(`${p.name}: «${card.name}» — ${note}`);updateUI();showCard(card,`<b>Эффект применён к герою.</b><br>${note}<br>Он будет виден в листе героя до начала следующего боя.`,[{label:'Продолжить',className:'success',fn:()=>continueExplore(card,state.exploration.deckKey)}]);return}
    const prayer=/сними\s+Страх\s+или\s+Проклятие/i.test(eff);
    if(prayer){
      const removable=p.statuses.filter(s=>s==='Страх'||s==='Проклятие');
      if(removable.length){
        showCard(card,'Выбери негативный эффект, который нужно снять:',removable.map(s=>({label:`Снять: ${s}`,className:'success',fn:()=>{removeStatus(p,s);log(`${p.name} снимает эффект: <b>${s}</b>.`);continueExplore(card,state.exploration.deckKey)}})));
      }else{
        const hr=rollHealing(p,'D6'),healed=heal(p,hr.total);log(`${p.name}: Страха и Проклятия нет — ${hr.used}=${hr.total}, восстановлено ${healed.restored} ЗД.`);
        showCard(card,`Страха и Проклятия нет. ${hr.reduced?`Проклятие уменьшило бы лечение, но его нет.<br>`:''}Восстановлено <b>${hr.total} ЗД</b>.`,[{label:'Продолжить',fn:()=>continueExplore(card,state.exploration.deckKey)}]);
      }
      return;
    }
    const choiceHealGold=eff.match(/восстанови (D\d+) ЗД или получи (\d+) золота/i);
    if(choiceHealGold){showCard(card,'Выбери эффект:',[
      {label:`Лечение ${choiceHealGold[1]}`,className:'success',fn:()=>{const hr=rollHealing(p,choiceHealGold[1]),healed=heal(p,hr.total);log(`${p.name} восстанавливает ${healed.restored} ЗД (${hr.used}).`);continueExplore(card,state.exploration.deckKey)}},
      {label:`+${choiceHealGold[2]} золота`,fn:()=>{gainGold(p,Number(choiceHealGold[2]));log(`${p.name} получает ${choiceHealGold[2]} золота.`);continueExplore(card,state.exploration.deckKey)}}
    ]);return}
    const pendingBefore=p.pendingItems.length;applyEffectText(p,eff, state.exploration.deckKey);
    if(p.pendingItems.length>pendingBefore){showCard(card,'Найден тайник. Его можно разобрать до встречи со следующей картой исследования.',[{label:'Разобрать тайник',className:'success',fn:()=>pauseExploreForPendingLoot(card,state.exploration.deckKey)}]);return}
    showCard(card,'Эффект разрешён. Исследование продолжается.',[{label:'Продолжить',fn:()=>continueExplore(card,state.exploration.deckKey)}]);
  }

  function resolveCursedStep(card){
    const p=currentPlayer(),wis=effectiveStat(p,'wis'),d20=rand(20),total=d20+wis,natural=d20===20?20:d20===1?1:null,ok=natural===20?true:natural===1?false:total>=14,has=p.statuses.includes('Проклятие');
    announceCheck(`Проклятый шаг`,d20,'МУД',wis,total,14,ok,natural);
    if(ok){if(has){removeStatus(p,'Проклятие');log(`${p.name}: Проклятие снято.`)}}else{if(has){const dmg=rand(6);damage(p,dmg);showRollPopup('Проклятый шаг · урон',dmg,`D6 = ${dmg}`,`ЗД ${Math.max(0,p.currentHp)}/${p.maxHp}`);log(`${p.name}: провал Проклятого шага, ${dmg} урона.`)}else addStatus(p,'Проклятие')}
    if(natural===1&&p.currentHp>0){const extra=rand(6);damage(p,extra);showRollPopup('Проклятый шаг · Натуральная 1',extra,`D6 = ${extra}`,'Дополнительный урон');log(`${p.name}: Натуральная 1 Проклятого шага — дополнительно ${extra} урона.`)}
    const finish=()=>showCard(card,`D20 ${d20} + МУД ${signed(wis)} = <b>${total}</b>. ${ok?'Успех':'Провал'}.`,[{label:'Продолжить',fn:()=>continueExplore(card,state.exploration.deckKey)}]);
    if(natural===20&&p.currentHp>0){const options=[...p.statuses];if(options.length){showCard(card,'Натуральная 20: проверка успешна. Дополнительно снимите 1 негативный эффект:',options.map(st=>({label:`Снять: ${st}`,className:'success',fn:()=>{removeStatus(p,st);log(`${p.name}: Натуральная 20 Проклятого шага — снят эффект «${st}».`);finish()}})));return}}
    if(state.exploration&&p.currentHp>0)finish();
  }
  function resolveDarkTrial(card){
    const p=currentPlayer();showStatChoice(card,14,'Тёмное испытание',(key,d20,total,ok)=>{
      const natural=d20===20?20:d20===1?1:null;
      announceCheck(`Тёмное испытание`,d20,statName(key),effectiveStat(p,key),total,14,ok,natural);
      if(!ok){
        const equipped=equippedEntries(p).filter(e=>e.slot!=='mercenary').map(e=>({id:e.id,slot:e.slot,card:itemCard(e.id)})).filter(e=>e.card);
        if(equipped.length){
          const lost=equipped[Math.floor(Math.random()*equipped.length)];
          setSlotId(p,lost.slot,null);delete p.itemUsage[lost.id];discardHeldCard(lost.card);
          log(`${p.name} теряет случайный <b>надетый</b> предмет: ${lost.card.name} (${SLOT_LABELS[lost.slot]}).`);
        }else if(p.gold>0){const v=rand(6),loss=Math.min(p.gold,v);p.gold-=loss;showRollPopup('Тёмное испытание · потеря золота',v,`D6 = ${v}`,`Потеряно ${loss} золота`);log(`${p.name} теряет ${loss} золота.`)}
        else{const dmg=rand(6);damage(p,dmg);showRollPopup('Тёмное испытание · урон',dmg,`D6 = ${dmg}`,`ЗД ${Math.max(0,p.currentHp)}/${p.maxHp}`);log(`${p.name} получает ${dmg} урона.`)}
      }
      if(natural===20){p.combatEffects.push({type:'nextBattleAdvantage',attacksRemaining:1,label:'Тёмное испытание',sourceCardId:card.id});log(`${p.name}: Натуральная 20 Тёмного испытания — преимущество на первую атаку следующего боя.`)}
      if(natural===1&&p.currentHp>0){const dmg=rand(6);damage(p,dmg);showRollPopup('Тёмное испытание · Натуральная 1',dmg,`D6 = ${dmg}`,'Дополнительный урон');log(`${p.name}: Натуральная 1 Тёмного испытания — дополнительно ${dmg} урона.`)}
      if(!state.exploration||p.currentHp<=0)return;
      showCard(card,`Выбрано: ${statName(key)}. D20 ${d20} ${signed(effectiveStat(p,key))} = <b>${total}</b>. ${ok?'Успех':'Провал'}.`,[{label:'Продолжить',fn:()=>continueExplore(card,state.exploration.deckKey)}]);
    });
  }
  function showStatChoice(card,dc,title,callback){
    showCard(card,`${title}. Выбери характеристику для проверки ${dc}+:`,['str','dex','wis','cha'].map(k=>({label:`${statName(k)} (${signed(effectiveStat(currentPlayer(),k))})`,fn:()=>{const p=currentPlayer(),bonus=effectiveStat(p,k),d=rand(20),t=d+bonus,ok=d===20?true:d===1?false:t>=dc;callback(k,d,t,ok)}})));
  }
  function resolveEnemy(card){ combatStart(card); }

  function applyTreasureImmediate(p,card){const eff=card.fields['Эффект']||'';const m=eff.match(/получи\s+(\d+)\s+золота/i);if(m){gainGold(p,Number(m[1]));log(`Тайник «${card.name}»: +${m[1]} золота.`)}}
  function applyEffectText(p,text,sourceDeckKey=null){
    const result={damage:0,healing:0,statusesAdded:[]};
    if(!text)return result; let m;
    if((m=text.match(/получи\s+(\d+)\s+золота/i))){gainGold(p,Number(m[1]));log(`${p.name} получает ${m[1]} золота.`)}
    if((m=text.match(/восстанови\s+(D\d+)\s+ЗД/i))){const hr=rollHealing(p,m[1]),healed=heal(p,hr.total);result.healing+=healed.restored;log(`${p.name} восстанавливает ${healed.restored} ЗД (${hr.used}${hr.reduced?', Проклятие уменьшило лечение':''}).`)}
    if((m=text.match(/(D\d+)\s+урона/i))){const v=rollDiceText(m[1]);result.damage+=v;const died=damage(p,v);log(`${p.name} получает ${v} урона.`);if(died)return result}
    for(const st of ['Кровотечение','Яд','Усталость','Проклятие','Страх','Слабость','Оглушение','Горение']){
      const t=String(text).trim();
      const direct=new RegExp(`^${st}(?=\\s*(?:и\\s+|[.!;,]|$))`,'i');
      const receive=new RegExp(`(?:^|\\s)получи(?:те)?\\s+${st}(?=\\s*(?:и\\s+|[.!;,]|$))`,'i');
      const receives=new RegExp(`(?:^|\\s)получает\\s+${st}(?=\\s*(?:и\\s+|[.!;,]|$))`,'i');
      const andStatus=new RegExp(`(?:^|\\s)и\\s+${st}(?=\\s*(?:и\\s+|[.!;,]|$))`,'i');
      if(direct.test(t)||receive.test(t)||receives.test(t)||andStatus.test(t)){
        const had=(p.statuses||[]).includes(st);addStatus(p,st);if(!had&&(p.statuses||[]).includes(st))result.statusesAdded.push(st);
      }
    }
    if(/возьми\s+1\s+Тайник внешних регионов/i.test(text)){const loot=drawCard('lootOuter');if(loot){receiveTreasure(p,loot);log(`${p.name} получает тайник №${loot.id} ${loot.name}.`)}}
    if(/возьми\s+1\s+Тайник Сердца тьмы/i.test(text)){const loot=drawCard('lootHeart');if(loot){receiveTreasure(p,loot);log(`${p.name} получает тайник Сердца тьмы №${loot.id} ${loot.name}.`)}}
    const t=String(text||'').trim();
    if(/в следующем бою \+2 к атаке/i.test(t))p.combatEffects.push({type:'nextBattleAttack',amount:2,attacksRemaining:2,label:'Благословение путника'});
    else if(/в следующем бою первые 2 атаки героя — с преимуществом/i.test(t))p.combatEffects.push({type:'nextBattleAdvantage',attacksRemaining:2,label:'Следы врага'});
    else if(/в следующем бою можешь? сбежать без проверки/i.test(t))p.combatEffects.push({type:'nextBattleFreeEscape',label:'Разлом пути'});
    else if(/в следующем бою все атаки героя — с преимуществом/i.test(t))p.combatEffects.push({type:'nextBattleAllAdvantage',label:'Молитва истинного удара'});
    else if(/в следующем бою герой получает \+3 ЗЩ/i.test(t))p.combatEffects.push({type:'nextBattleDefense',amount:3,label:'Покров Стража'});
    else if(/в следующем бою урон от атак героя ×2/i.test(t))p.combatEffects.push({type:'nextBattleHeroDamageMultiplier',amount:2,label:'Печать возмездия'});
    else if(/в следующем бою получаемый героем урон уменьшается вдвое/i.test(t))p.combatEffects.push({type:'nextBattleIncomingHalf',label:'Железная молитва'});
    else if(/в следующем бою все атаки врага — с помехой/i.test(t))p.combatEffects.push({type:'nextBattleEnemyDisadvantageAll',label:'Морок Сердца'});
    else if(/следующем бою|следующие?\s+\d+\s+атак|развед/i.test(t))p.notes.push(text);
    return result;
  }
  function phoenixHealingBonus(p){return [getSlotId(p,'ring0'),getSlotId(p,'ring1')].some(id=>Number(id)===236)?2:0}
  function heal(p,v){
    const base=Math.max(0,Number(v)||0),before=p.currentHp,withoutBonus=Math.min(p.maxHp,before+base)-before,bonus=base>0?phoenixHealingBonus(p):0;
    p.currentHp=clamp(before+base+bonus,0,p.maxHp);const restored=p.currentHp-before,bonusRestored=Math.max(0,restored-withoutBonus);
    if(bonusRestored>0){const msg=`Кольцо Феникса: лечение дополнительно восстанавливает <b>+${bonusRestored} ЗД</b>.`;log(`${p.name}: ${msg}`);if(state.combat&&currentPlayer()?.id===p.id)combatPush(msg)}
    return{base,bonus,restored,bonusRestored};
  }
  function damage(p,v){recordDamageTaken(p,v);p.currentHp-=v;if(p.currentHp<=0){handleDeath(p);return true}return false}
  function addStatus(p,s,duration=null){
    ensurePlayerModel(p);if(heroImmuneStatus(p,s)){log(`${p.name}: эффект «${s}» проигнорирован экипировкой.`);return}if(!p.statuses.includes(s)){p.statuses.push(s);log(`${p.name} получает эффект: <b>${s}</b>.`)}
    const timed=['Яд','Горение','Кровотечение'];if(timed.includes(s)){p.statusTimers[s]=duration??3;log(`${p.name}: «${s}» — осталось ${p.statusTimers[s]} х.`)}
  }
  function showDefeatPopup(p,enemy,loss,turnEnded=false){
    rollPopupQueue.length=0;rollPopupAfterClose=null;if(els.rollOverlay)els.rollOverlay.hidden=true;
    const source=enemy?`<b>${p.name}</b> пал от <b>${ENEMY_GENITIVE[enemy.id]||enemy.name}</b>.`:`<b>${p.name}</b> пал.`;
    modalOffturnOwnerId=p.id;modalCloseAction=null;els.modalContent.innerHTML=`<div class="card-kicker">ПОРАЖЕНИЕ ГЕРОЯ</div><div class="card-title">${p.name} пал</div><div class="defeat-message">${source}<br>Он возвращается в <b>Лагерь</b> и теряет <b>${loss} золота</b>.${turnEnded?'<br><br><b>Ход уже завершён автоматически.</b>':''}</div><div class="modal-actions"><button id="defeatContinue" class="danger">Продолжить</button></div>`;els.modal.hidden=false;document.getElementById('defeatContinue').onclick=closeModal;
  }
  function gameOverStats(p){
    ensurePlayerStats(p);const e=p.stats.enemies||{},territories=Object.values(state.territories||{}).filter(t=>t.owner===p.id).length,areas=(state.areas||[]).filter(a=>a.owner===p.id).length;
    const totalEnemies=['weak','normal','strong','elite','boss'].reduce((s,k)=>s+Number(e[k]||0),0);
    return{turns:p.personalTurn,totalEnemies,weak:e.weak||0,normal:e.normal||0,strong:e.strong||0,elite:e.elite||0,boss:e.boss||0,goldEarned:p.stats.goldEarned||0,currentGold:p.gold,territories,areas,defeats:p.stats.defeats||0,damageDealt:p.stats.damageDealt||0,damageTaken:p.stats.damageTaken||0,natural20:p.stats.natural20||0,natural1:p.stats.natural1||0,lootFound:p.stats.lootFound||0,distanceTravelled:p.stats.distanceTravelled||0,locationVisitsTotal:p.stats.locationVisitsTotal||0,playerTrades:p.stats.playerTrades||0,bossAttempts:p.stats.bossAttempts||0,legacyIncomplete:!!p.stats.legacyIncomplete,extendedLegacyIncomplete:!!p.stats.extendedLegacyIncomplete};
  }
  function showGameOverPopup(p){
    if(!p)return;const s=gameOverStats(p);rollPopupQueue.length=0;rollPopupAfterClose=null;if(els.rollOverlay)els.rollOverlay.hidden=true;closeCharacterSheet();
    const legacy=s.legacyIncomplete?`<div class="notice compact-notice"><b>Важно:</b> эта партия была начата до v0.5.17. Ходы, территории и области восстановлены из сохранения, но исторические счётчики побед, заработанного золота и поражений учитываются только с момента перехода на новую систему статистики.</div>`:'';
    const extendedLegacy=s.extendedLegacyIncomplete?`<div class="notice compact-notice"><b>Дополнительная статистика:</b> партия была начата до v0.5.18, поэтому урон, натуральные броски, тайники, расстояние, посещения, сделки и попытки босса считаются только с момента перехода на v0.5.18.</div>`:'';
    els.modalContent.innerHTML=`<div class="card-kicker">ПАРТИЯ ЗАВЕРШЕНА</div><div class="card-title" style="color:${p.color}">${p.name} победил Владыку Сердца Тьмы!</div><div class="game-over-stats"><div><small>Личных ходов</small><b>${s.turns}</b></div><div><small>Врагов побеждено</small><b>${s.totalEnemies}</b></div><div><small>Золота заработано</small><b>${s.goldEarned}</b></div><div><small>Золота осталось</small><b>${s.currentGold}</b></div><div><small>Территорий</small><b>${s.territories}</b></div><div><small>Областей</small><b>${s.areas}</b></div><div><small>Поражений</small><b>${s.defeats}</b></div><div><small>Раунд партии</small><b>${state.round}</b></div><div><small>Нанесено урона</small><b>${s.damageDealt}</b></div><div><small>Получено урона</small><b>${s.damageTaken}</b></div><div><small>Натуральных 20</small><b>${s.natural20}</b></div><div><small>Натуральных 1</small><b>${s.natural1}</b></div><div><small>Найдено тайников</small><b>${s.lootFound}</b></div><div><small>Пройдено гексов</small><b>${s.distanceTravelled}</b></div><div><small>Посещений локаций</small><b>${s.locationVisitsTotal}</b></div><div><small>Сделок с игроками</small><b>${s.playerTrades}</b></div><div><small>Попыток босса</small><b>${s.bossAttempts}</b></div></div><h3>Побеждённые враги</h3><div class="game-over-enemies"><span>Слабых: <b>${s.weak}</b></span><span>Обычных: <b>${s.normal}</b></span><span>Сильных: <b>${s.strong}</b></span><span>Элитных: <b>${s.elite}</b></span><span>Боссов: <b>${s.boss}</b></span></div>${legacy}${extendedLegacy}<div class="modal-actions"><button id="gameOverClose" class="success">Закрыть статистику</button></div>`;
    els.modal.hidden=false;document.getElementById('gameOverClose').onclick=closeModal;
  }

  function handleDeath(p,defeatedBy=null){
    const autoAdvance=!!state.started&&!state.gameOver&&currentPlayer()?.id===p.id;ensurePlayerStats(p);p.stats.defeats++;
    const deathHex=p.hex;
    if(p.reexploreRiskHex&&p.reexploreRiskHex===deathHex&&state.cleaned[deathHex]){delete state.cleaned[deathHex];log(`<b>${deathHex} снова становится неочищенным:</b> герой погиб во время повторного исследования.`)}
    p.reexploreRiskHex=null;if(state.dungeonEntryNotice?.heroId===p.id)state.dungeonEntryNotice=null;state.foreignTerritoryPending=null;state.tributeConsentPending=null;state.tradeOpportunity=null;state.moveTransit=null;state.pendingMoveAction=null;state.movePending=false;state.reachable=[];
    p.combatEffects=(p.combatEffects||[]).filter(e=>e.type!=='nextBattleFreeEscape');
    const mercId=getSlotId(p,'mercenary');if(mercId){const merc=itemCard(mercId);setSlotId(p,'mercenary',null);discardHeldCard(merc);log(`${p.name}: наёмник «${merc?.name||mercId}» уходит в сброс после смерти героя.`)}
    const region=MAP.hexes[deathHex]?.region;const die=region==='heart_of_darkness'?10:region==='cursed'?8:6;const loss=Math.min(p.gold,rand(die));p.gold-=loss;p.hex=MAP.startHex;restockTavernIfVacant(deathHex);p.currentHp=p.maxHp;p.statuses=[];p.statusTimers={};p.statusTickedTurn={};p.inDungeon=false;p.dungeonCard=null;p.dungeonEnteredTurn=null;state.exploration=null;state.turnLocked=false;resetItemUsage(p,'camp');log(`<b>${p.name} погибает</b>, возвращается в ЛГ01, полностью лечится и теряет ${loss} золота.`);closeModal();closeCharacterSheet();if(autoAdvance)advanceTurnState(p,'поражение героя');else{updateUI();renderBoard()}showDefeatPopup(p,defeatedBy,loss,autoAdvance);
  }

  function markExplorationSuccess(hex){if(!MAP.hexes[hex]||hex===MAP.startHex)return;state.cleaned[hex]=true;state.clearedThisTurnHex=hex;log(`${hex} теперь <b>очищен</b>.`)}
  function finishExplore(success,reason){const p=currentPlayer();if(reason!=='Темница'&&p)p.reexploreRiskHex=null;state.exploration=null;state.turnLocked=false;log(`Исследование завершено: ${reason}.`);updateUI();renderBoard()}

  function resolvePermanentLocation(card){
    const p=currentPlayer(),hex=p.hex;
    state.locations[hex]={name:card.name,cardId:card.id};
    log(`На ${hex} открыта постоянная локация: <b>${card.name}</b>.`);
    if(card.name==='Древний портал'){
      showCard(card,'Портал установлен на карте. Когда будет открыт второй портал, вход в один портал перенесёт героя в другой; при трёх и более будет предложен выбор гекса назначения. После закрытия окна ход перейдёт дальше.',[{label:'Продолжить',fn:()=>{closeModal();finishExplore(false,'Постоянная локация');advanceTurnState(p,'открытие постоянной локации — Древний портал')}}]);
      return;
    }
    // Открытие локации считается входом на её гекс. Возможность воспользоваться эффектом
    // существует сейчас, но простое стояние здесь в следующий ход новым посещением не является.
    ensurePlayerModel(p);p.locationVisits[hex]='cooldown';state.locationActivationHex=hex;
    showCard(card,`Локация установлена на ${hex}.<br><br><b>Вы хотите сейчас посетить локацию?</b>`,[
      {label:'Да',className:'success',fn:()=>{state.locationUsedThisTurn=true;state.locationActivationHex=null;closeModal();finishExplore(false,'Постоянная локация');visitLocation(hex,()=>{}, {player:p,handoff:true})}},
      {label:'Нет',className:'secondary',fn:()=>{state.locationActivationHex=null;closeModal();finishExplore(false,'Постоянная локация');advanceTurnState(p,'открытие постоянной локации')}}
    ]);
  }

  function cursedLocationTitle(name,cursed){if(name==='Торговец')return `Торговец — ${cursed?'Проклятый':'Обычный'}`;if(name==='Святилище')return `Святилище — ${cursed?'Проклятое':'Обычное'}`;if(name==='Таверна')return `Таверна — ${cursed?'Проклятая':'Обычная'}`;return `${name} — ${cursed?'Проклятая':'Обычная'} локация`}
  function locationMode(p,hex,locationName='Локация'){
    const region=MAP.hexes[hex]?.region;
    if(region!=='cursed')return{mode:'normal',roll:null,total:null,natural:null,title:cursedLocationTitle(locationName,false)};
    const wis=effectiveStat(p,'wis'),d=rand(20),total=d+wis;
    const natural=d===20?20:d===1?1:null;
    const ok=d===20?true:d===1?false:total>=13;
    const special=natural?` · <b>натуральная ${natural}</b>`:'';
    log(`${p.name}: проверка локации в ПТ — D20 ${d} + МУД ${signed(wis)} = ${total}${special}: <b>${ok?'обычный':'проклятый'} эффект</b>.`);
    const title=cursedLocationTitle(locationName,!ok);announceCheck(title,d,'МУД',wis,total,13,ok,natural,ok?`${locationName}: обычный эффект`:`${title}`);
    return{mode:ok?'normal':'cursed',roll:d,total,natural,title};
  }

  function visitLocation(hex,onDone=()=>{},opts={}){
    const p=opts.player||currentPlayer(),loc=state.locations[hex];
    if(!loc){onDone();return}
    closeModal();state.turnLocked=true;state.locationActivationHex=null;
    const handed=!!opts.handoff;
    const done=()=>{if(!handed)state.turnLocked=false;onDone();if(handed)endSideInteraction();updateUI();renderBoard()};
    const handoff=()=>{if(handed)advanceTurnWithSideInteraction(p,'location',`посещение постоянной локации «${loc.name}»`,[p.id])};
    if(loc.name==='Таверна'){visitTavern(p,{mode:'normal',roll:null,total:null,natural:null,title:'Таверна'},done);handoff();return}
    const result=locationMode(p,hex,loc.name);
    if(loc.name==='Святилище'){visitShrine(p,result,done);handoff();return}
    if(loc.name==='Торговец'){visitMerchant(p,result,done);handoff();return}
    done();if(handed)advanceTurnState(p,`посещение постоянной локации «${loc.name}»`);
  }

  function visitShrine(p,result,onDone){
    resetItemUsage(p,'shrine');
    const fake={id:'—',name:result.title||'Святилище',category:'Постоянная локация',deck:'Поле',fields:{
      'Обычный':'выбери одно: восстанови D8 ЗД ИЛИ сними 1 негативный эффект.',
      'Проклятый':'восстанови D6 ЗД.',
      'Натуральная 20':'полностью восстанови ЗД; сними все негативные эффекты.',
      'Натуральная 1':'лечение 0; получи Проклятие; эффекты не снимаются.'
    }};
    if(result.natural===20){const before=p.currentHp,removed=[...p.statuses];p.currentHp=p.maxHp;p.statuses=[];p.statusTimers={};p.statusTickedTurn={};log(`${p.name}: Святилище, <b>натуральная 20</b> — полностью восстанавливает ЗД и снимает все негативные эффекты.`);showCard(fake,`ЗД: ${before} → <b>${p.currentHp}</b>.<br>${removed.length?`Сняты эффекты: <b>${removed.join(', ')}</b>.`:'Негативных эффектов не было.'}`,[{label:'Готово',className:'success',fn:()=>{closeModal();onDone()}}]);return}
    if(result.natural===1){addStatus(p,'Проклятие');log(`${p.name}: Святилище, <b>натуральная 1</b> — лечение 0, негативные эффекты не снимаются.`);showCard(fake,'Натуральная 1: лечение не получено. Герой получает Проклятие; негативные эффекты не снимаются.',[{label:'Готово',fn:()=>{closeModal();onDone()}}]);return}
    if(result.mode==='cursed'){
      const hr=rollHealing(p,'D6'),v=hr.total,healed=heal(p,v);log(`${p.name} посещает проклятое Святилище и восстанавливает ${healed.restored} ЗД (${hr.used}).`);
      showCard(fake,`Проклятый эффект: восстановлено <b>${v} ЗД</b>.`,[{label:'Готово',className:'success',fn:()=>{closeModal();onDone()}}]);return;
    }
    const canHeal=p.currentHp<p.maxHp,canClean=p.statuses.length>0;
    if(canHeal&&canClean){
      showCard(fake,'Обычное Святилище: выберите <b>ОДИН</b> эффект.',[
        {label:'Восстановить D8 ЗД',className:'success',fn:()=>{const hr=rollHealing(p,'D8'),v=hr.total,healed=heal(p,v);log(`${p.name} выбирает лечение в Святилище: +${healed.restored} ЗД (${hr.used}).`);closeModal();onDone()}},
        {label:'Снять негативный эффект',className:'primary',fn:()=>{showCard(fake,'Выберите 1 негативный эффект, который нужно снять:',p.statuses.map(st=>({label:`Снять: ${st}`,className:'success',fn:()=>{removeStatus(p,st);log(`${p.name} снимает в Святилище эффект: <b>${st}</b>.`);closeModal();onDone()}})))}}
      ]);return;
    }
    if(canHeal){const hr=rollHealing(p,'D8'),v=hr.total,healed=heal(p,v);log(`${p.name} посещает Святилище и восстанавливает ${healed.restored} ЗД (${hr.used}).`);showCard(fake,`Восстановлено <b>${healed.restored} ЗД</b>.`,[{label:'Готово',className:'success',fn:()=>{closeModal();onDone()}}]);return}
    if(canClean){showCard(fake,'ЗД полные. Выберите 1 негативный эффект, который нужно снять:',p.statuses.map(st=>({label:`Снять: ${st}`,className:'success',fn:()=>{removeStatus(p,st);log(`${p.name} снимает в Святилище эффект: <b>${st}</b>.`);closeModal();onDone()}})));return}
    showCard(fake,'ЗД полные, негативных эффектов нет. Святилище не даёт эффекта.',[{label:'Готово',fn:()=>{closeModal();onDone()}}]);
  }

  function takeMercenaryFromDeck(deckKey){
    const d=state.decks?.[deckKey];if(!d)return null;const options=[];
    for(const sourceName of ['draw','discard']){const source=d[sourceName]||[];for(let i=0;i<source.length;i++){const card=itemCard(source[i]);if(card&&itemType(card)==='наёмник')options.push({sourceName,index:i,card})}}
    if(!options.length)return null;const pick=options[Math.floor(Math.random()*options.length)],source=d[pick.sourceName];source.splice(pick.index,1);return{card:pick.card,key:deckKey};
  }
  function ensureTavernMercenary(hex){
    const loc=state.locations?.[hex];if(!loc||loc.name!=='Таверна')return null;
    const existing=itemCard(loc.tavernMercenaryId);if(existing&&itemType(existing)==='наёмник')return{card:existing,key:loc.tavernMercenaryDeckKey||deckKeyForCard(existing)};
    if(loc.tavernNeedsRestock)return null;
    delete loc.tavernMercenaryId;delete loc.tavernMercenaryDeckKey;
    const region=MAP.hexes?.[hex]?.region,keys=region==='cursed'?['lootHeart','lootOuter']:['lootOuter','lootHeart'];
    for(const key of keys){const entry=takeMercenaryFromDeck(key);if(entry){loc.tavernMercenaryId=entry.card.id;loc.tavernMercenaryDeckKey=entry.key;return entry}}
    return null;
  }
  function renderTavernVisit(p,hex,onDone,session){
    const loc=state.locations?.[hex],entry=ensureTavernMercenary(hex),merc=entry?.card||null,current=itemCard(getSlotId(p,'mercenary'));
    const price=merc?Number(merc.fields?.['Цена найма']||0):0,oldId=getSlotId(p,'mercenary'),oldLocked=oldId?isItemLocked(p,oldId):false;
    const canHire=!!merc&&p.gold>=price&&!oldLocked,canHeal=!session.healed&&p.gold>=4&&p.currentHp<p.maxHp;
    const hireWhy=!merc?'В таверне сейчас нет свободного наёмника.':oldLocked?'Текущий наёмник заблокирован для сброса. Сначала снимите блокировку.':p.gold<price?`Нужно ${price} золота.`:'';
    const healWhy=session.healed?'Лечение уже использовано в это посещение.':p.gold<4?'Нужно 4 золота.':p.currentHp>=p.maxHp?'ЗД уже полные.':'';
    const mercHtml=merc?`<div class="tavern-merc-card"><div class="card-kicker">В таверне сейчас</div><div class="card-title">${merc.name}</div><div class="card-field"><b>Цена найма:</b> ${price} золота</div><div class="card-field"><b>Эффект:</b> ${merc.fields?.['Эффект']||'—'}</div></div>`:`<div class="empty-box">Сейчас в Таверне нет свободного наёмника. Новый появится, когда все герои покинут эту Таверну.</div>`;
    const currentHtml=current?`Ваш спутник: <b>${current.name}</b>${oldLocked?' · 🔒 заблокирован':''}`:'Ваш спутник: <b>нет</b>';
    els.modalContent.innerHTML=`<div class="card-kicker">Постоянная локация · Таверна</div><div class="card-title">${loc?.name||'Таверна'}</div>${mercHtml}<div class="card-field tavern-current-merc">${currentHtml}</div>${session.healSummary?`<div class="notice compact-notice">${session.healSummary}</div>`:''}<div class="modal-actions tavern-actions"><button id="tavernHire" class="success" ${canHire?'':'disabled'} title="${hireWhy}">${current?'Нанять вместо текущего':'Нанять'}${merc?` — ${price} зол.`:''}</button><button id="tavernHeal" class="primary" ${canHeal?'':'disabled'} title="${healWhy}">Лечиться — 4 зол.</button><button id="tavernClose" class="secondary">Закрыть</button></div>`;
    els.modal.hidden=false;
    const hireBtn=document.getElementById('tavernHire');if(hireBtn)hireBtn.onclick=()=>{if(!canHire||!merc)return;const old=getSlotId(p,'mercenary');if(old&& !confirm(`Заменить наёмника «${itemCard(old)?.name}» на «${merc.name}»? Старый наёмник уйдёт в сброс.`))return;if(old){if(isItemLocked(p,old)){alert('Текущий наёмник заблокирован для сброса.');return}discardHeldCard(itemCard(old));delete p.itemUsage[old];delete p.lockedItems?.[old]}
      p.gold-=price;setSlotId(p,'mercenary',merc.id);delete loc.tavernMercenaryId;delete loc.tavernMercenaryDeckKey;loc.tavernNeedsRestock=true;log(`${p.name} нанимает в Таверне «${merc.name}» за ${price} золота. До тех пор, пока Таверна не опустеет, нового наёмника здесь не будет.`);updateUI();renderTavernVisit(p,hex,onDone,session)};
    const healBtn=document.getElementById('tavernHeal');if(healBtn)healBtn.onclick=()=>{if(!canHeal)return;p.gold-=4;const hr=rollHealing(p,'D6'),before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;session.healed=true;session.healSummary=`Лечение: ${hr.used} = <b>${hr.total}</b>. Восстановлено <b>${restored} ЗД</b>. ЗД ${p.currentHp}/${p.maxHp}.${hr.reduced?' Проклятие уменьшило кубик лечения.':''}`;log(`${p.name} лечится в Таверне за 4 золота: ${hr.used}=${hr.total}, восстановлено ${restored} ЗД.`);updateUI();renderTavernVisit(p,hex,onDone,session)};
    document.getElementById('tavernClose').onclick=()=>{closeModal();onDone()};
  }
  function visitTavern(p,result,onDone){
    const hex=p.hex;resetItemUsage(p,'tavern');ensureTavernMercenary(hex);log(`${p.name} заходит в Таверну. Лечение не применяется автоматически.`);renderTavernVisit(p,hex,onDone,{healed:false,healSummary:''});
  }

  function merchantPlan(p,result){
    const region=MAP.hexes[p.hex]?.region;let plan;
    if(region!=='cursed')plan={decks:['lootOuter','lootOuter','lootOuter'],buyMultiplier:1,saleMultiplier:.5,label:'обычный ассортимент'};
    else if(result.natural===20)plan={decks:['lootOuter','lootOuter','lootHeart'],buyMultiplier:1,saleMultiplier:1,label:'натуральная 20 — продажа за 100%'};
    else if(result.natural===1)plan={decks:['lootOuter','lootHeart'],buyMultiplier:2,saleMultiplier:.5,label:'натуральная 1 — товары за 200%'};
    else if(result.mode==='normal')plan={decks:['lootOuter','lootOuter','lootHeart'],buyMultiplier:1,saleMultiplier:.5,label:'успешная проверка'};
    else plan={decks:['lootOuter','lootHeart'],buyMultiplier:1,saleMultiplier:.5,label:'провал проверки'};
    if(Number(getSlotId(p,'artifact'))===192){plan.decks.push(region==='cursed'?'lootHeart':'lootOuter');plan.label+=' · Купеческая грамота +1 карта'}return plan;
  }
  function numericItemPrice(card){const raw=card?.fields?.['Цена'];const n=Number(raw);return Number.isFinite(n)?n:null}
  function merchantSaleMultiplier(p,plan){return equippedEntries(p).some(e=>Number(e.id)===242)?1:Number(plan?.saleMultiplier??.5)}
  function merchantSaleLabel(p,plan){return equippedEntries(p).some(e=>Number(e.id)===242)?`${plan.label} · Кольцо купца: продажа 100%`:plan.label}
  function merchantSellEntries(p){
    ensurePlayerModel(p);const out=[];
    for(const {slot,id} of equippedEntries(p)){if(slot==='mercenary')continue;const c=itemCard(id);if(c)out.push({id,card:c,ctx:{where:'equipment',slot},where:`Экипировано · ${SLOT_LABELS[slot]}`})}
    for(const id of p.backpack){const c=itemCard(id);if(c)out.push({id,card:c,ctx:{where:'backpack'},where:'Рюкзак'})}
    return out;
  }
  function canSellMerchantItem(p,entry){
    const price=numericItemPrice(entry.card);if(price==null)return{ok:false,why:'Цена предмета не утверждена.'};
    if(isItemLocked(p,entry.id))return{ok:false,why:'Предмет заблокирован для продажи и сброса.'};
    if(itemType(entry.card)==='наёмник')return{ok:false,why:'Наёмников Торговцу не продают.'};
    if(entry.ctx?.where==='equipment'&&entry.ctx.slot==='artifact'&&entry.id===191&&p.backpack.length>baseBackpackCapacity(p))return{ok:false,why:`Сначала освободите рюкзак: снятие Журнала уменьшит вместимость до ${baseBackpackCapacity(p)}.`};
    return{ok:true};
  }
  function visitMerchant(p,result,onDone){
    const plan=merchantPlan(p,result),stock=[];plan.locationTitle=result.title||'Торговец';
    for(const key of plan.decks){const card=drawCard(key);if(card)stock.push({card,key})}
    log(`${p.name} посещает Торговца (${plan.label}). Открыто карт: ${stock.length}.`);
    showMerchantShop(p,stock,plan,onDone);
  }
  function showMerchantShop(p,stock,plan,onDone){
    const saleMultiplier=merchantSaleMultiplier(p,plan),saleLabel=merchantSaleLabel(p,plan);
    const stockHtml=stock.length?stock.map((e,i)=>{const c=e.card,base=numericItemPrice(c),type=itemType(c),buyable=base!=null&&type!=='наёмник',cost=buyable?base*plan.buyMultiplier:null;let why='';if(type==='наёмник')why='Наёмников у Торговца покупать нельзя.';else if(base==null)why='Цена отсутствует или требует утверждения.';return `<div class="merchant-card ${itemColorClass(p,c)}"><div class="merchant-card-head"><div><small>№${c.id} · ${c.fields?.['Тип']||c.category}</small><b>${c.name}</b></div><div class="merchant-price">${buyable?`${cost} зол.`:'—'}</div></div><div class="card-fields compact">${itemFieldsHtml(c)}</div><button data-buy-index="${i}" class="success" ${!buyable||p.gold<cost?'disabled':''}>${buyable?`Купить за ${cost}`:'Недоступно'}</button>${why?`<div class="merchant-note">${why}</div>`:''}</div>`}).join(''):'<div class="empty-box">Ассортимент пуст.</div>';
    const sells=merchantSellEntries(p);
    const sellHtml=sells.length?sells.map((e,i)=>{const chk=canSellMerchantItem(p,e),base=numericItemPrice(e.card),value=base==null?null:Math.floor(base*saleMultiplier);return `<div class="merchant-sell-row ${itemColorClass(p,e.card)}"><div><b>${e.card.name}</b><small>${e.where}${base!=null?` · цена ${base}`:''}</small></div><button data-sell-index="${i}" class="secondary" ${!chk.ok?'disabled':''}>${value!=null?`Продать за ${value}`:'Нет цены'}</button>${!chk.ok?`<span class="merchant-note">${chk.why}</span>`:''}</div>`}).join(''):'<div class="empty-box">Нет предметов для продажи.</div>';
    els.modalContent.innerHTML=`<div class="card-kicker">Постоянная локация · Торговец</div><div class="card-title">${plan.locationTitle||'Торговец'}</div><div class="merchant-summary"><span>Золото: <b>${p.gold}</b></span><span>${saleLabel}</span><span>Продажа: <b>${Math.round(saleMultiplier*100)}%</b></span><span>Покупка: <b>${Math.round(plan.buyMultiplier*100)}%</b></span></div><h3>Купить</h3><div class="merchant-grid">${stockHtml}</div><h3 style="margin-top:18px">Продать</h3><div class="merchant-sell-list">${sellHtml}</div><div class="modal-actions"><button id="merchantDone" class="success">Готово</button></div>`;
    els.modal.hidden=false;
    els.modalContent.querySelectorAll('[data-buy-index]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.buyIndex),entry=stock[i];if(!entry)return;const base=numericItemPrice(entry.card);if(base==null||itemType(entry.card)==='наёмник')return;const cost=base*plan.buyMultiplier;if(p.gold<cost)return;p.gold-=cost;p.pendingItems.push(entry.card.id);stock.splice(i,1);log(`${p.name} покупает у Торговца «${entry.card.name}» за ${cost} золота.`);showMerchantShop(p,stock,plan,onDone);updateUI()});
    els.modalContent.querySelectorAll('[data-sell-index]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.sellIndex),entry=sells[i];if(!entry)return;const chk=canSellMerchantItem(p,entry);if(!chk.ok)return;const base=numericItemPrice(entry.card),value=Math.floor(base*merchantSaleMultiplier(p,plan));if(!sourceRemove(p,entry.id,entry.ctx))return;delete p.itemUsage[entry.id];gainGold(p,value);returnCardToDeckRandom(deckKeyForCard(entry.card),entry.card);log(`${p.name} продаёт Торговцу «${entry.card.name}» за ${value} золота.`);showMerchantShop(p,stock,plan,onDone);updateUI();renderBoard()});
    document.getElementById('merchantDone').onclick=()=>{for(const e of stock)returnCardToDeckRandom(e.key,e.card);closeModal();onDone();if(p.pendingItems.length)setTimeout(()=>openCharacterSheet('pending',null,p.id),0)};
  }

  function canExploreHere(p){if(!state.turnMoved||state.turnLocked||p.inDungeon||p.pendingItems?.length)return false;if(p.hex===MAP.bossHex)return false;if(state.locations[p.hex])return false;if(state.territories[p.hex])return false;if(p.hex===MAP.startHex)return false;if(state.cleaned[p.hex]&&state.clearedThisTurnHex===p.hex)return false;return true}
  function exploreActions(p){
    const r=MAP.hexes[p.hex]?.region;if(r==='cursed')return [{label:'Исследовать: Внешние регионы',key:'exploreOuter'},{label:'Исследовать: Сердце тьмы',key:'exploreHeart'}];if(r==='heart_of_darkness')return[{label:'Исследовать Сердце тьмы',key:'exploreHeart'}];return[{label:'Исследовать внешние регионы',key:'exploreOuter'}]
  }

  function canBuildAt(p,hex=p.hex){
    const r=MAP.hexes[hex]?.region;if(!(r==='kingdom'||r==='cursed'))return{ok:false,why:'В Сердце тьмы строить нельзя.'};if(hex===MAP.startHex)return{ok:false,why:'В Лагере строить нельзя.'};if(!state.cleaned[hex])return{ok:false,why:'Гекс не очищен.'};if(state.locations[hex])return{ok:false,why:state.locations[hex].name==='Древний портал'?'На гексе находится Древний портал.':'На постоянной локации строить нельзя.'};if(state.territories[hex])return{ok:false,why:'Территория уже построена.'};if(CAMP_ADJACENT.has(hex))return{ok:false,why:'На гексах вокруг Лагеря строить нельзя.'};
    const portalHexes=Object.entries(state.locations).filter(([,v])=>v.name==='Древний портал').map(([h])=>h);if(portalHexes.includes(hex))return{ok:false,why:'На гексе находится Древний портал.'};const nearPortal=portalHexes.find(ph=>MAP.hexes[ph].neighbors.includes(hex));if(nearPortal)return{ok:false,why:'Рядом находится Древний портал.'};
    const cost=r==='cursed'?20:10;if(p.gold<cost)return{ok:false,why:`Нужно ${cost} золота.`};return{ok:true,cost};
  }
  function buildTerritoryFor(p,hex,cost){if(!p||!hex)return false;p.gold-=cost;p.maxHp+=2;state.territories[hex]={owner:p.id,areaId:null};log(`<b>${p.name} строит территорию на ${hex}</b> за ${cost} золота. Максимум ЗД +2; текущее ЗД не изменяется (${p.currentHp}/${p.maxHp}).`);updateUI();renderBoard();return true}
  function buildTerritory(){if(state.movePending){commitPendingMove({type:'build'});return}const p=currentPlayer(),chk=canBuildAt(p);if(!chk.ok)return;buildTerritoryFor(p,p.hex,chk.cost)}
  function postCombatBuildBlockedText(why=''){const t=String(why||'Строительство на этом гексе недоступно.').replace(/\.$/,'');return t}
  function showPostCombatTerritoryPrompt(){
    const c=state.combat,p=currentPlayer();if(!c||c.phase!=='victory'||c.isBoss||!p){finishCombatVictory();return}
    const chk=canBuildAt(p,p.hex);closeModal();els.modalClose.style.display='none';
    if(!chk.ok){
      els.modalContent.innerHTML=`<div class="card-kicker">ПОСЛЕ БОЯ</div><div class="card-title">ПОСТРОЙКА ТЕРРИТОРИИ НЕВОЗМОЖНА</div><div class="card-field"><b>Причина:</b> ${postCombatBuildBlockedText(chk.why)}.</div><div class="modal-actions"><button id="postCombatBuildContinue" class="success">Продолжить</button></div>`;
      els.modal.hidden=false;document.getElementById('postCombatBuildContinue').onclick=()=>{closeModal();finishCombatVictory()};return;
    }
    els.modalContent.innerHTML=`<div class="card-kicker">ПОСЛЕ БОЯ</div><div class="card-title">Строить территорию за ${chk.cost} ЗОЛ?</div><div class="card-field">Гекс: <b>${p.hex}</b> · Золото героя: <b>${p.gold}</b>.<br>После выбора ход героя завершится.</div><div class="modal-actions"><button id="postCombatBuildYes" class="success">Да</button><button id="postCombatBuildNo" class="secondary">Нет</button></div>`;
    els.modal.hidden=false;
    document.getElementById('postCombatBuildYes').onclick=()=>{const fresh=canBuildAt(p,p.hex);if(fresh.ok)buildTerritoryFor(p,p.hex,fresh.cost);closeModal();finishCombatVictory()};
    document.getElementById('postCombatBuildNo').onclick=()=>{closeModal();finishCombatVictory()};
  }

  function connectedTriple(hexes){const set=new Set(hexes),seen=new Set([hexes[0]]),q=[hexes[0]];while(q.length){const h=q.shift();for(const n of MAP.hexes[h].neighbors)if(set.has(n)&&!seen.has(n)){seen.add(n);q.push(n)}}return seen.size===3}
  function areaCandidates(p){const own=Object.entries(state.territories).filter(([,t])=>t.owner===p.id&&!t.areaId).map(([h])=>h),out=[];for(let i=0;i<own.length;i++)for(let j=i+1;j<own.length;j++)for(let k=j+1;k<own.length;k++){const a=[own[i],own[j],own[k]];if(connectedTriple(a))out.push(a)}return out}
  function finalizeArea(hexes,bonus){const p=currentPlayer(),id=state.nextAreaId++,ownerAreaNumber=Math.max(0,...state.areas.filter(a=>a.owner===p.id).map(a=>a.ownerAreaNumber||0))+1;hexes.forEach(h=>state.territories[h].areaId=id);state.areas.push({id,owner:p.id,ownerAreaNumber,hexes:[...hexes],bonus});const text=bonus.type==='defense'?`+${bonus.amount} ЗЩ`:`+${bonus.amount} ${statName(bonus.stat)}`;log(`<b>${p.name} создаёт область №${ownerAreaNumber}</b>: ${hexes.join(' + ')}. Бонус: <b>${text}</b>.`);updateUI();renderBoard();if(!els.sheetDrawer.hidden)renderCharacterSheet('overview')}
  function createArea(hexes){const p=currentPlayer(),n=Math.max(0,...state.areas.filter(a=>a.owner===p.id).map(a=>a.ownerAreaNumber||0))+1;if(n%2===0){finalizeArea(hexes,{type:'defense',amount:1});return}const fake={id:'—',name:`Область №${n}`,category:'Бонус области',deck:'Поле',fields:{'Бонус':'+1 к характеристике на выбор'}};showCard(fake,`Выберите постоянный бонус для области из ${hexes.join(' + ')}. Закрытие окна отменит создание области.`,['str','dex','wis','cha'].map(k=>({label:`+1 ${statName(k)}`,className:'success',fn:()=>{closeModal();finalizeArea(hexes,{type:'stat',stat:k,amount:1})}})))}

  function resolveDungeonEntryNotice(p){
    if(!p)return;const wasCurrent=currentPlayer()?.id===p.id;if(state.dungeonEntryNotice?.heroId===p.id)state.dungeonEntryNotice=null;closeModal();
    if(wasCurrent){p.reexploreRiskHex=null;state.exploration=null;state.turnLocked=false;log('Исследование завершено: Темница.');advanceTurnState(p,'попадание в Темницу')}
    else{state.exploration=null;state.turnLocked=false;updateUI();renderBoard()}
  }
  function showDungeonEntryNotice(p,card){
    if(!p||!card)return;showCard(card,'<b>ИГРОК ПОПАЛ В ТЕМНИЦУ.</b><br>После закрытия этого окна ход сразу перейдёт к следующему игроку. Первая попытка выхода будет в следующий личный ход героя.',[{label:'Далее',className:'success',fn:()=>resolveDungeonEntryNotice(p)}]);
    modalOffturnOwnerId=p.id;modalCloseAction=()=>resolveDungeonEntryNotice(p);
  }
  function maybeShowDungeonEntryNotice(){
    const n=state.dungeonEntryNotice;if(!n||!els.modal.hidden)return;const localId=onlineLocalHeroId||currentPlayer()?.id;if(localId!==n.heroId)return;const p=getPlayer(n.heroId),card=itemCard(n.cardId);if(p&&card)showDungeonEntryNotice(p,card);
  }

  function dungeonExitAvailable(p){return !!p.inDungeon&&(p.dungeonEnteredTurn==null||p.personalTurn>p.dungeonEnteredTurn)}
  function showDungeonWaiting(p){
    els.actionPanel.innerHTML=`<div class="action-box"><div class="action-title">Темница</div><div class="muted small"><b>Герой только что попал в Темницу.</b><br>В этот же ход бросок на выход запрещён. Закройте окно «ИГРОК ПОПАЛ В ТЕМНИЦУ» — после этого ход автоматически перейдёт следующему игроку.</div></div>`;
  }
  function showDungeonActions(p){
    els.actionPanel.innerHTML=`<div class="action-box"><div class="action-title">Темница — выход</div><div class="muted small">Выберите способ выхода. Проверка 13+ или заплатите 6 золота. Любой способ занимает весь ход.</div><div class="action-buttons" id="dungeonButtons"></div></div>`;
    const box=document.getElementById('dungeonButtons');['str','dex','wis','cha'].forEach(k=>{const b=document.createElement('button');b.textContent=`Проверка ${statName(k)} (${signed(effectiveStat(p,k))})`;b.onclick=()=>attemptDungeonExit(k);box.appendChild(b)});
    const pay=document.createElement('button');pay.textContent='Заплатить 6 золота';pay.className='secondary';pay.disabled=p.gold<6;pay.title=p.gold<6?'Недостаточно золота':'';pay.onclick=payDungeonExit;box.appendChild(pay);
  }
  function beginBonusExplorationTurnAfterDungeon(p){
    state.turnLocked=false;const died=applyEndTurnPeriodicEffects(p);if(died)return;tickTurnEffects(p);refreshLocationRevisitsAtEndTurn(p);refreshAreaVisitsAtEndTurn(p);p.personalTurn++;
    state.rolled=false;state.die=null;state.movePoints=0;state.reachable=[];state.chosenPath=null;state.chosenMovePlan=null;state.turnMoved=false;state.movePending=false;state.moveOriginHex=null;state.moveTransit=null;state.pendingMoveAction=null;state.exploration=null;state.locationUsedThisTurn=false;state.locationActivationHex=null;state.clearedThisTurnHex=null;state.foreignTerritoryPending=null;state.tributeConsentPending=null;state.tradeOpportunity=null;state.inspectPlayerId=null;state.mapHighlight=null;
    log(`<b>${p.name} получает дополнительный ход исследования</b> за Натуральную 20 при выходе из Темницы.`);updateUI();renderBoard();
  }
  function payDungeonExit(){const p=currentPlayer();if(!dungeonExitAvailable(p)||p.gold<6)return;p.gold-=6;p.inDungeon=false;p.dungeonCard=null;p.dungeonEnteredTurn=null;p.reexploreRiskHex=null;log(`${p.name} платит <b>6 золота</b> и выходит из Темницы.`);endTurn(true)}
  function showDungeonRollResult(p,k,d,total,resultText,natural=null,onDone=null){
    els.modalClose.style.display='none';const natClass=natural===20?'natural20':natural===1?'natural1':'';
    els.modalContent.innerHTML=`<div class="dungeon-roll-shell"><div class="card-kicker">ТЕМНИЦА · попытка выхода</div><div class="card-title">Проверка ${statName(k)} 13+</div><div class="combat-dice-stage compact"><div class="combat-dice-title">D20 + ${statName(k)}</div><div class="combat-die-main ${natClass}">${d}</div><div class="combat-dice-math">${d} ${signed(effectiveStat(p,k))} = ${total}</div><div class="combat-dice-detail">${resultText}</div></div><div class="modal-actions"><button id="dungeonRollDone" class="success">Продолжить</button></div></div>`;
    els.modal.hidden=false;document.getElementById('dungeonRollDone').onclick=()=>{closeModal();if(onDone)onDone()};
  }
  function attemptDungeonExit(k){
    const p=currentPlayer();if(!dungeonExitAvailable(p))return;const bonus=effectiveStat(p,k),d=rand(20),total=d+bonus;state.turnLocked=true;let resultText='',natural=null,lethal=false;
    if(d===1){natural=1;const dmg=rand(6);recordDamageTaken(p,dmg);p.currentHp-=dmg;resultText=`Натуральная 1: выход не удался. D6 урона = ${dmg}. ЗД ${Math.max(0,p.currentHp)}/${p.maxHp}.`;log(`${p.name}: Темница, натуральная 1 — остаётся заперт и получает ${dmg} урона.`);lethal=p.currentHp<=0}
    else if(d===20){natural=20;p.inDungeon=false;p.dungeonCard=null;p.dungeonEnteredTurn=null;p.reexploreRiskHex=null;resultText='Натуральная 20: герой успешно выходит из Темницы и получает дополнительный ход исследования.';log(`${p.name}: <b>натуральная 20</b> — успешно выходит из Темницы и получает дополнительный ход исследования.`)}
    else if(total>=13){p.inDungeon=false;p.dungeonCard=null;p.dungeonEnteredTurn=null;p.reexploreRiskHex=null;resultText='Успех: герой выходит из Темницы.';log(`${p.name}: D20 ${d} + ${statName(k)} ${signed(bonus)} = ${total}. <b>Выход из Темницы успешен.</b>`)}
    else{resultText='Провал: герой остаётся в Темнице.';log(`${p.name}: D20 ${d} + ${statName(k)} ${signed(bonus)} = ${total}. Выход не удался.`)}
    recordNatural(p,natural);showDungeonRollResult(p,k,d,total,resultText,natural,()=>{if(lethal){handleDeath(p);return}if(natural===20){beginBonusExplorationTurnAfterDungeon(p);return}endTurn(true)});
  }
  function hexDistance(a,b){if(a===b)return 0;const q=[[a,0]],seen=new Set([a]);while(q.length){const[x,d]=q.shift();for(const n of MAP.hexes[x].neighbors){if(n===b)return d+1;if(!seen.has(n)){seen.add(n);q.push([n,d+1])}}}return 999}

  function resetItemUsage(p,place){ensurePlayerModel(p);for(const [id,u] of Object.entries(p.itemUsage||{})){const reset=Array.isArray(u?.reset)?u.reset:[u?.reset];if(reset.includes(place))delete p.itemUsage[id]}}
  function useMark(p,id,reset){ensurePlayerModel(p);p.itemUsage[id]={reset:Array.isArray(reset)?reset:[reset]}}
  function useBlocked(p,id){return !!p.itemUsage?.[id]}
  function consumeHeldItem(p,id,ctx){const card=itemCard(id);if(!card)return;sourceRemove(p,id,ctx);if(itemType(card)==='зелье'){const key=deckKeyForCard(card);returnCardToDeckRandom(key,card);log(`Использованное зелье «${card.name}» возвращается в колоду «${DECK_NAMES[key]}» и снова может быть найдено.`)}else discardHeldCard(card)}
  function supportedOutsideEffect(p,card,ctx){
    if(heroIsActiveCombatant(p))return supportedCombatEffect(p,card,ctx);
    if(!card||ctx?.where==='pending')return{supported:false,enabled:false,why:''};
    const eff=String(card.fields?.['Эффект']||''),id=card.id,t=itemType(card),equipped=ctx?.where==='equipment';
    if([174,226,263,169].includes(id)&&!equipped)return{supported:true,enabled:false,why:'Этот эффект работает только когда предмет экипирован.'};
    if([174,263].includes(id))return{supported:true,enabled:!useBlocked(p,id)&&p.statuses.length>0,why:useBlocked(p,id)?'Эффект уже использован. Восстановится после посещения Святилища.':(!p.statuses.length?'Нет негативных эффектов для снятия.':'')};
    if(id===226){const has=p.statuses.length>0;return{supported:true,enabled:!useBlocked(p,id)&&has,why:useBlocked(p,id)?'Эффект уже использован. Восстановится после посещения Святилища.':(!has?'Нет негативных эффектов для снятия.':'')}}
    if(id===193)return{supported:true,enabled:false,why:'Фляга вечного глотка используется только во время боя.'};
    if(id===169){const portals=Object.entries(state.locations||{}).filter(([,v])=>v.name==='Древний портал').map(([h])=>h),ownTurn=currentPlayer()?.id===p.id;return{supported:true,enabled:ownTurn&&equipped&&!useBlocked(p,id)&&portals.length>0&&!state.turnLocked,why:!ownTurn?'Перемещение через Кольцо портала доступно только в свой ход.':!equipped?'Кольцо должно быть экипировано.':useBlocked(p,id)?'Эффект восстановится после посещения Святилища.':(!portals.length?'На поле нет порталов.':(state.turnLocked?'Сейчас перемещение недоступно.':''))}}
    if(t==='зелье'){
      if(/восстанови\s+(?:\d+D\d+|D\d+)\s+ЗД/i.test(eff))return{supported:true,enabled:p.currentHp<p.maxHp,why:p.currentHp>=p.maxHp?'ЗД уже полностью восстановлены.':''};
      if(/сними\s+1\s+негативный эффект/i.test(eff))return{supported:true,enabled:p.statuses.length>0,why:p.statuses.length?'':'Нет негативных эффектов для снятия.'};
      if(/на\s+\d+\s+хода?.*\+2\s+ЗЩ/i.test(eff))return{supported:true,enabled:false,why:'Зелье защиты можно применить только во время боя.'};
      if(/на\s+\d+\s+хода?.*\+2\s+к атаке/i.test(eff))return{supported:true,enabled:false,why:'Зелье силы можно применить только во время боя.'};
      if(/на\s+\d+\s+хода?.*\+D4\s+урона/i.test(eff))return{supported:true,enabled:false,why:'Это боевое зелье можно применить только во время боя.'};
    }
    return{supported:false,enabled:false,why:''};
  }
  function chooseStatusForItem(p,card,ctx,allowed=null,after=null){const statuses=p.statuses.filter(s=>!allowed||allowed.includes(s));if(!statuses.length){alert('Нет подходящего негативного эффекта.');return}els.sheetContent.innerHTML=`<div class="sheet-nav"><button class="ghost" id="cancelUseItem">← К предмету</button><b>${card.name}</b></div><div class="notice">Выберите эффект, который нужно снять.</div><div class="item-list" id="statusUseList"></div>`;document.getElementById('cancelUseItem').onclick=()=>showItemInSheet(card.id,ctx);const box=document.getElementById('statusUseList');for(const st of statuses){const b=document.createElement('button');b.className='item-row';b.innerHTML=`<span><b>${st}</b><small>Снять негативный эффект</small></span><span>›</span>`;b.onclick=()=>{removeStatus(p,st);if(after)after();log(`${p.name}: «${card.name}» снимает эффект <b>${st}</b>.`);renderCharacterSheet('overview');updateUI()};box.appendChild(b)}}
  function applyItemEffect(p,id,ctx){
    if(heroIsActiveCombatant(p))return applyCombatItemEffect(p,id,ctx);
    const card=itemCard(id);if(!card)return;const info=supportedOutsideEffect(p,card,ctx);if(!info.enabled){if(info.why)alert(info.why);return}const eff=String(card.fields?.['Эффект']||''),t=itemType(card);
    if([174,263].includes(id)){chooseStatusForItem(p,card,ctx,null,()=>useMark(p,id,'shrine'));return}
    if(id===226){chooseStatusForItem(p,card,ctx,null,()=>useMark(p,id,'shrine'));return}
    if(id===169){const portals=Object.entries(state.locations||{}).filter(([,v])=>v.name==='Древний портал').map(([h])=>h);if(!portals.length)return;useMark(p,id,'shrine');state.turnLocked=true;state.portalPending={heroId:p.id,entryHex:p.hex,destinations:[...portals],remaining:0};log(`${p.name}: «${card.name}» — выберите любой портал на карте.`);closeCharacterSheet();updateUI();renderBoard();return}
    if(t==='зелье'){
      let m;if((m=eff.match(/восстанови\s+((?:\d+D\d+)|D\d+)\s+ЗД/i))){const hr=rollHealing(p,m[1]),v=hr.total,healed=heal(p,v);consumeHeldItem(p,id,ctx);log(`${p.name} использует «${card.name}» и восстанавливает ${healed.restored} ЗД.`);renderCharacterSheet('overview');updateUI();return}
      if(/сними\s+1\s+негативный эффект/i.test(eff)){chooseStatusForItem(p,card,ctx,null,()=>consumeHeldItem(p,id,ctx));return}
      if((m=eff.match(/на\s+(\d+)\s+хода?.*\+2\s+ЗЩ/i))){p.temporaryEffects.push({key:'defense',amount:2,label:card.name,turnsRemaining:Number(m[1]),sourceCardId:id});consumeHeldItem(p,id,ctx);log(`${p.name} использует «${card.name}»: +2 ЗЩ на ${m[1]} хода.`);renderCharacterSheet('overview');updateUI();return}
      if((m=eff.match(/на\s+(\d+)\s+хода?.*\+2\s+к атаке/i))){p.combatEffects.push({type:'attackBonus',amount:2,label:card.name,turnsRemaining:Number(m[1]),sourceCardId:id});consumeHeldItem(p,id,ctx);log(`${p.name} использует «${card.name}»: +2 к атаке на ${m[1]} хода (боевой эффект сохранён).`);renderCharacterSheet('overview');updateUI();return}
      if((m=eff.match(/на\s+(\d+)\s+хода?.*\+D4\s+урона/i))){p.combatEffects.push({type:'lightRage',die:'D4',label:card.name,turnsRemaining:Number(m[1]),sourceCardId:id});consumeHeldItem(p,id,ctx);log(`${p.name} использует «${card.name}»: боевой эффект на ${m[1]} хода сохранён.`);renderCharacterSheet('overview');updateUI();return}
    }
  }
  function tickTurnEffects(p){ensurePlayerModel(p);const tick=(arr)=>arr.filter(e=>{if(e.turnsRemaining==null)return true;e.turnsRemaining--;if(e.turnsRemaining<=0){log(`${p.name}: эффект «${e.label||'временный эффект'}» завершён.`);return false}return true});p.temporaryEffects=tick(p.temporaryEffects);p.combatEffects=tick(p.combatEffects)}

  function isMobileViewport(){return window.matchMedia('(max-width: 900px), (pointer: coarse)').matches}
  function sheetModeIsInventory(mode=sheetView.mode){return ['inventory','backpack','pending','item'].includes(mode)}
  function updateSheetTabs(mode=sheetView.mode){
    const inventory=sheetModeIsInventory(mode);if(els.sheetMobileTitle)els.sheetMobileTitle.textContent=inventory?'Инвентарь':'Герой';
    if(els.sheetHeroTab){els.sheetHeroTab.classList.toggle('active',!inventory);els.sheetHeroTab.setAttribute('aria-selected',String(!inventory))}
    if(els.sheetInventoryTab){els.sheetInventoryTab.classList.toggle('active',inventory);els.sheetInventoryTab.setAttribute('aria-selected',String(inventory))}
  }
  function openCharacterSheet(mode='overview',bonusKey=null,playerId=null){if(!state.started)return;const active=currentPlayer(),sideTarget=sideInteractionOwnerId(),target=sideTarget||playerId||onlineLocalHeroId||(playerHardMode(active)?active.id:(state.inspectPlayerId||active.id));sheetView={mode,bonusKey,itemId:null,context:null,playerId:target};els.sheetDrawer.hidden=false;renderCharacterSheet(mode,bonusKey)}
  function closeCharacterSheet(){const sideOwner=sideInteractionOwnerId(),sidePlayer=sideOwner?getPlayer(sideOwner):null;if(sideInteraction?.type==='loot'&&sidePlayer&&!sidePlayer.pendingItems?.length)endSideInteraction();if(state.started&&!isMobileViewport()){const active=currentPlayer(),target=sideInteractionOwnerId()||onlineLocalHeroId||(playerHardMode(active)?active.id:(state.inspectPlayerId||active.id));sheetView={mode:'overview',bonusKey:null,itemId:null,context:null,playerId:target};els.sheetDrawer.hidden=false;renderCharacterSheet('overview');return}els.sheetDrawer.hidden=true;els.sheetContent.innerHTML='';sheetView={mode:'overview',bonusKey:null,itemId:null,context:null,playerId:null};updateSheetTabs('overview')}
  function bonusBreakdownHtml(p,key){const src=modifierSources(p,key),total=modifierTotal(p,key),title=key==='defense'?'ЗЩ':statName(key);return `<div class="bonus-popover"><b>Модификатор ${title}: ${signed(total)}</b>${src.length?src.map(x=>`<div class="bonus-row"><span>${x.kind}: ${x.label}</span><b>${signed(x.amount)}</b></div>`).join(''):'<div class="muted small">Активных источников бонуса нет.</div>'}<div class="bonus-row total"><span>Итого</span><b>${signed(total)}</b></div></div>`}
  function restoreCombatModalIfNeeded(){if(state.combat)setTimeout(renderCombat,0)}
  function showHardModeCapacityWarning(p){
    const max=hardBackpackCapacity(p),fake={id:'—',name:'Сложный режим',category:'Настройки героя',deck:'Герой',fields:{'Рюкзак':`${p.backpack.length}/${max}`}};
    showCard(fake,`В рюкзаке героя <b>${p.name}</b> предметов больше максимального количества для сложной версии игры.<br><br>Очистите рюкзак до <b>${max}</b> предметов, затем включите сложный режим.`,[
      {label:'Открыть рюкзак',className:'success',fn:()=>{closeModal();renderCharacterSheet('backpack');restoreCombatModalIfNeeded()}},
      {label:'Отмена',className:'secondary',fn:()=>{closeModal();restoreCombatModalIfNeeded()}}
    ]);
  }
  function togglePlayerHardMode(p){
    if(state.sharedDifficulty)return;
    if(!p||p.id!==currentPlayer()?.id)return;
    ensurePlayerModel(p);
    if(!p.hardMode){const max=hardBackpackCapacity(p);if(p.backpack.length>max){showHardModeCapacityWarning(p);return}p.hardMode=true;state.inspectPlayerId=null;state.mapHighlight=null;log(`${p.name}: <b>сложный режим включён</b>.`)}
    else{p.hardMode=false;log(`${p.name}: <b>сложный режим выключен</b>.`)}
    renderCharacterSheet('overview');if(state.combat)renderCombat();updateUI();renderBoard();
  }
  function slotTile(p,slot){const id=getSlotId(p,slot),card=itemCard(id);return `<button class="gear-slot ${id?'filled':''} ${card?itemColorClass(p,card):''}" data-slot="${slot}" ${id?'':'disabled'}><span>${SLOT_LABELS[slot]}</span><b>${card?card.name:'—'}</b></button>`}
  function renderCharacterSheet(mode=sheetView.mode,bonusKey=sheetView.bonusKey){
    if(!state.started)return;const p=sheetPlayer();ensurePlayerModel(p);sheetView.mode=mode;sheetView.bonusKey=bonusKey;updateSheetTabs(mode);
    if(mode==='inventory'){renderInventory(p);return}if(mode==='backpack'){renderBackpack(p);return}if(mode==='pending'){renderPending(p);return}if(mode==='item'){renderItemDetail(p,sheetView.itemId,sheetView.context);return}
    const stats=['defense','str','dex','wis','cha'].map(k=>`<div class="sheet-stat"><span>${k==='defense'?'ЗЩ':statName(k)}: <b>${k==='defense'?p.defense:signed(p[k])}</b></span><button class="modifier-link big" data-sheet-bonus="${k}">(${signed(modifierTotal(p,k))})</button><span class="sheet-total">итого ${k==='defense'?effectiveDefense(p):signed(effectiveStat(p,k))}</span></div>`).join('');
    const hc=HERO_COMBAT[p.id],effects=activeEffectRows(p);const effectsHtml=effects.length?effects.map(x=>`<div class="hero-effect-row ${x.tone==='negative'?'negative':'positive'}"><span>${x.kind}: </span><b>${x.label}</b></div>`).join(''):'<div class="empty-box compact-empty">Активных эффектов нет.</div>';
    const readOnly=sheetReadOnly(),readOnlyBanner=readOnly?`<div class="read-only-banner">Просмотр героя <b>${p.name}</b>. Сейчас ходит <b>${currentPlayer().name}</b>.</div>`:'';
    const territoryCount=Object.values(state.territories).filter(t=>t.owner===p.id).length,areaCount=state.areas.filter(a=>a.owner===p.id).length,region=MAP.hexes[p.hex]?regionName(MAP.hexes[p.hex].region):'—';
    const heroMeta=`<div class="sheet-game-meta"><div class="meta-cell">Личный ход: <b>${p.personalTurn}</b></div><div class="meta-cell">Раунд: <b>${state.round}</b></div><div class="meta-cell">Позиция: <b>${p.hex}</b></div><div class="meta-cell">Регион: <b>${region}</b></div><button class="meta-cell" data-sheet-map-highlight="territories">Территории: <b>${territoryCount}</b></button><button class="meta-cell" data-sheet-map-highlight="areas">Области: <b>${areaCount}</b></button></div>`;
    const sharedLocked=!!state.sharedDifficulty;const difficultyControl=`<div class="hero-difficulty-row"><button id="playerHardModeBtn" class="hero-difficulty-btn ${p.hardMode?'active':''}" ${(readOnly||sharedLocked)?'disabled':''}>${sharedLocked?'Режим партии':'Сложный режим'}: ${p.hardMode?'СЛОЖНЫЙ':'ОБЫЧНЫЙ'}</button><span>${sharedLocked?'Режим выбран хозяином комнаты и заблокирован до конца партии. ':''}${p.hardMode?'Реакции и обучающие подсказки скрыты. Рюкзак: 5 базовых мест.':'Обычный режим. Рюкзак: 10 базовых мест.'}</span></div>`;
    els.sheetContent.innerHTML=`${readOnlyBanner}${difficultyControl}<div class="sheet-hero hero-only-head"><div><div class="eyebrow">ЛИСТ ГЕРОЯ</div><h2 style="color:${p.color}">${p.name}</h2></div><div class="sheet-hp"><span class="${p.currentHp<p.maxHp/2?'low-health':''}">ЗД <b>${p.currentHp}/${p.maxHp}</b></span><span>Урон <b>${currentHeroDamage(p)}</b></span></div></div>${heroMeta}<div class="sheet-stats">${stats}</div>${bonusKey?bonusBreakdownHtml(p,bonusKey):''}<div class="hero-abilities"><div class="hero-ability-card"><small>СПОСОБНОСТЬ ГЕРОЯ</small><b>${hc?.ability||'—'}</b><span>${hc?.effect||'—'}</span></div><div class="hero-ability-card nat20"><small>НАТУРАЛЬНАЯ 20</small><b>${hc?.natural20?.split(' — ')[0]||'Эффект героя'}</b><span>${hc?.natural20?.includes(' — ')?hc.natural20.split(' — ').slice(1).join(' — '):(hc?.natural20||'—')}</span></div></div><h3 class="sheet-section-title">Активные эффекты</h3><div class="hero-effects compact-effects">${effectsHtml}</div>`;
    const difficultyBtn=document.getElementById('playerHardModeBtn');if(difficultyBtn&&!readOnly&&!state.sharedDifficulty)difficultyBtn.onclick=()=>togglePlayerHardMode(p);
    els.sheetContent.querySelectorAll('[data-sheet-bonus]').forEach(b=>b.onclick=()=>renderCharacterSheet('overview',b.dataset.sheetBonus));
    els.sheetContent.querySelectorAll('[data-sheet-map-highlight]').forEach(b=>{const type=b.dataset.sheetMapHighlight;const set=()=>{state.mapHighlight={type,playerId:p.id};renderBoard()};const clear=()=>{if(state.mapHighlight?.type===type&&state.mapHighlight?.playerId===p.id){state.mapHighlight=null;renderBoard()}};b.onmouseenter=set;b.onmouseleave=clear;b.onclick=e=>{e.stopPropagation();if(state.mapHighlight?.type===type&&state.mapHighlight?.playerId===p.id)state.mapHighlight=null;else state.mapHighlight={type,playerId:p.id};renderBoard()}});
  }
  function renderInventory(p){
    ensurePlayerModel(p);updateSheetTabs('inventory');const merc=itemCard(getSlotId(p,'mercenary'));const readOnly=sheetReadOnly(),readOnlyBanner=readOnly?`<div class="read-only-banner">Просмотр инвентаря героя <b>${p.name}</b>. Действия с предметами недоступны.</div>`:'';
    els.sheetContent.innerHTML=`${readOnlyBanner}<div class="inventory-head"><div><div class="eyebrow">ИНВЕНТАРЬ</div><h2 style="color:${p.color}">${p.name}</h2></div><div class="inventory-gold"><small>ЗОЛОТО</small><b>${p.gold}</b></div></div><h3 class="sheet-section-title">Экипировка</h3><div class="gear-grid inventory-gear">${slotTile(p,'weapon')}${slotTile(p,'armor')}${slotTile(p,'amulet')}${slotTile(p,'ring0')}${slotTile(p,'ring1')}${slotTile(p,'artifact')}${slotTile(p,'potion0')}${slotTile(p,'potion1')}<button class="gear-slot filled backpack-slot" id="backpackTile"><span>Рюкзак</span><b>${p.backpack.length}/${backpackCapacity(p)}</b></button></div><h3 class="sheet-section-title">Наёмник</h3><button class="merc-slot ${merc?'filled':''} ${merc?itemColorClass(p,merc):''}" id="mercTile" ${merc?'':'disabled'}>${merc?`<b>${merc.name}</b><span>${merc.fields?.['Эффект']||''}</span>`:'Наёмник отсутствует'}</button><div class="sheet-section-row inventory-actions"><button class="secondary" id="openBackpack">Рюкзак (${p.backpack.length}/${backpackCapacity(p)})</button><button class="${p.pendingItems.length?'primary':'ghost'}" id="openPending">Неразобранные тайники (${p.pendingItems.length})</button></div>${p.pendingItems.length?'<div class="notice compact-notice"><b>Требуется разбор.</b> Движение и завершение хода заблокированы.</div>':''}`;
    els.sheetContent.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{const slot=b.dataset.slot,id=getSlotId(p,slot);if(id)showItemInSheet(id,{where:'equipment',slot})});
    document.getElementById('backpackTile').onclick=()=>renderCharacterSheet('backpack');document.getElementById('openBackpack').onclick=()=>renderCharacterSheet('backpack');document.getElementById('openPending').onclick=()=>renderCharacterSheet('pending');
    if(merc)document.getElementById('mercTile').onclick=()=>showItemInSheet(merc.id,{where:'equipment',slot:'mercenary'});
  }
  function renderBackpack(p){ensurePlayerModel(p);updateSheetTabs('backpack');const items=p.backpack.map(id=>itemCard(id)).filter(Boolean);els.sheetContent.innerHTML=`<div class="sheet-nav"><button class="ghost" id="sheetBack">← Инвентарь</button><b>Рюкзак ${p.backpack.length}/${backpackCapacity(p)}</b></div>${items.length?`<div class="item-list">${items.map(c=>{const price=numericItemPrice(c);return `<button class="item-row ${itemColorClass(p,c)}" data-item-id="${c.id}"><span><b>${c.name}</b><small>${c.category} · №${c.id} · стоимость: ${price==null?'—':price+' зол.'}</small></span><span>›</span></button>`}).join('')}</div>`:'<div class="empty-box">Рюкзак пуст.</div>'}`;document.getElementById('sheetBack').onclick=()=>renderCharacterSheet('inventory');els.sheetContent.querySelectorAll('[data-item-id]').forEach(b=>b.onclick=()=>showItemInSheet(Number(b.dataset.itemId),{where:'backpack'}))}
  function renderPending(p){ensurePlayerModel(p);updateSheetTabs('pending');const items=p.pendingItems.map(id=>itemCard(id)).filter(Boolean);els.sheetContent.innerHTML=`<div class="sheet-nav"><button class="ghost" id="sheetBack">← Инвентарь</button><b>Неразобранные тайники: ${items.length}</b></div>${items.length?`<div class="item-list">${items.map(c=>{const price=numericItemPrice(c);return `<button class="item-row pending ${itemColorClass(p,c)}" data-item-id="${c.id}"><span><b>${c.name}</b><small>${c.category} · №${c.id}${price!=null?` · стоимость: ${price} зол.`:''}</small></span><span>›</span></button>`}).join('')}</div>`:'<div class="empty-box">Неразобранных тайников нет.</div>'}`;document.getElementById('sheetBack').onclick=()=>renderCharacterSheet('inventory');els.sheetContent.querySelectorAll('[data-item-id]').forEach(b=>b.onclick=()=>showItemInSheet(Number(b.dataset.itemId),{where:'pending'}))}
  function showItemInSheet(id,context){const pid=sheetView.playerId||currentPlayer().id;sheetView={mode:'item',bonusKey:null,itemId:id,context,playerId:pid};updateSheetTabs('item');renderItemDetail(getPlayer(pid)||currentPlayer(),id,context)}
  function itemFieldsHtml(card){return displayCardFieldEntries(card).map(([k,v])=>`<div class="card-field"><b>${k}:</b> ${v.replace(/\n/g,'<br>')}</div>`).join('')}
  function renderItemDetail(p,id,ctx){const card=itemCard(id);if(!card){renderCharacterSheet('inventory');return}const readOnly=sheetReadOnly(),equip=canEquipCard(p,card),slots=targetSlots(card),actions=[],outside=readOnly?{supported:false,enabled:false,why:''}:supportedOutsideEffect(p,card,ctx),canLock=!readOnly&&ctx?.where!=='pending',locked=canLock&&isItemLocked(p,id),heroCombat=heroIsActiveCombatant(p);
    if(heroCombat){
      if(ctx?.where==='equipment'){const battle=supportedCombatEffect(p,card,ctx);if(battle.supported)actions.push({label:'Применить эффект',cls:'success',disabled:!battle.enabled,title:battle.why,fn:()=>applyCombatItemEffect(p,id,ctx)});const setName=card.fields?.['Сет'],setInfo=setName?setBonusActionInfo(p,setName):null;if(setInfo?.supported&&setName==='Тени')actions.push({label:'Применить бонус полного сета',cls:'success',disabled:!setInfo.enabled,title:setInfo.why,fn:()=>useSetBonus(p,setName)});}if(ctx?.where==='backpack'&&itemType(card)==='зелье'&&slots.length)actions.push({label:'Положить в быстрый слот',cls:'success',fn:()=>requestEquip(p,id,ctx)});
    }else if(outside.supported)actions.push({label:'Применить эффект',cls:'success',disabled:!outside.enabled,title:outside.why,fn:()=>applyItemEffect(p,id,ctx)});
    if(heroCombat){}
    else if(ctx?.where==='pending'){if(itemType(card)==='ценность')actions.push({label:'Взять',cls:'success',fn:()=>claimValueTreasure(p,id,ctx)});else{if(itemType(card)==='наёмник')actions.push({label:'Взять наёмника',cls:'success',fn:()=>requestEquip(p,id,ctx)});else if(slots.length&&equip.ok)actions.push({label:'Надеть',cls:'success',fn:()=>requestEquip(p,id,ctx)});if(itemType(card)!=='наёмник')actions.push({label:`В рюкзак (${p.backpack.length}/${backpackCapacity(p)})`,cls:'secondary',disabled:!hasBackpackRoom(p),fn:()=>moveToBackpack(p,id,ctx)});actions.push({label:'Сбросить',cls:'danger',fn:()=>discardItem(p,id,ctx)});}}
    else if(ctx?.where==='backpack'){if(slots.length&&equip.ok)actions.push({label:itemType(card)==='наёмник'?'Взять наёмника':'Надеть',cls:'success',fn:()=>requestEquip(p,id,ctx)});actions.push({label:'Сбросить',cls:'danger',disabled:locked,title:locked?'Предмет заблокирован для продажи и сброса.':'',fn:()=>discardItem(p,id,ctx)});}
    else if(ctx?.where==='equipment'){if(itemType(card)!=='наёмник'){actions.push({label:'Снять',cls:'secondary',fn:()=>unequipToPending(p,id,ctx)});actions.push({label:`В рюкзак (${p.backpack.length}/${backpackCapacity(p)})`,cls:'secondary',disabled:!canUnequipToBackpack(p,id,ctx.slot),fn:()=>unequipToBackpack(p,id,ctx)});}actions.push({label:itemType(card)==='наёмник'?'Распустить':'Сбросить',cls:'danger',disabled:locked,title:locked?'Предмет заблокирован для продажи и сброса.':'',fn:()=>discardItem(p,id,ctx)});}
    if(readOnly)actions.length=0;
    const origin=ctx?.where==='equipment'?`Экипировано: ${SLOT_LABELS[ctx.slot]}`:ctx?.where==='backpack'?'В рюкзаке':'Неразобранный тайник';
    const ro=readOnly?`<div class="read-only-banner">Режим просмотра: действия с предметом недоступны.</div>`:'';
    const showEquipError=!equip.ok&&itemType(card)!=='ценность';
    const lockBtn=canLock?`<button id="itemLockToggle" class="item-lock-toggle ${locked?'locked':''}" title="${locked?'Разблокировать продажу и сброс':'Заблокировать продажу и сброс'}">${locked?'🔒':'🔓'}</button>`:'';
    const lockNote=canLock?`<div class="item-lock-note ${locked?'locked':''}">${locked?'Предмет заблокирован: продавать и сбрасывать нельзя.':'Предмет не заблокирован для продажи и сброса.'}</div>`:'';
    updateSheetTabs('item');
    els.sheetContent.innerHTML=`${ro}<div class="sheet-nav"><button class="ghost" id="itemBack">← Назад</button><span>${origin}</span></div><div class="item-detail-card ${itemColorClass(p,card)}">${lockBtn}<div class="card-kicker">${card.category} · №${card.id} · ${card.deck}</div><div class="card-title">${card.name}</div><div class="card-fields">${itemFieldsHtml(card)}</div>${lockNote}</div>${showEquipError?`<div class="error-box">${equip.why}</div>`:''}<div class="modal-actions" id="itemActions"></div>`;
    document.getElementById('itemBack').onclick=()=>ctx?.where==='backpack'?renderCharacterSheet('backpack'):ctx?.where==='pending'?renderCharacterSheet('pending'):renderCharacterSheet('inventory');const lockToggle=document.getElementById('itemLockToggle');if(lockToggle)lockToggle.onclick=()=>{setItemLocked(p,id,!isItemLocked(p,id));renderItemDetail(p,id,ctx);updateUI()};const box=document.getElementById('itemActions');for(const a of actions){const b=document.createElement('button');b.textContent=a.label;b.className=a.cls||'primary';b.disabled=!!a.disabled;if(a.title)b.title=a.title;b.onclick=a.fn;box.appendChild(b)}const close=document.createElement('button');close.textContent='Закрыть';close.className='ghost';close.onclick=()=>renderCharacterSheet('inventory');box.appendChild(close);
  }
  function canUnequipToBackpack(p,id,slot){const cap=slot==='artifact'&&id===191?5:backpackCapacity(p);return p.backpack.length+1<=cap}
  function renderAfterPendingResolution(p,ctx,fallback='inventory'){
    if(ctx?.where==='pending'){
      if(p.pendingItems.length)renderCharacterSheet('pending');
      else if(state.exploration?.resumeAfterLoot){state.exploration.resumeAfterLoot=false;closeCharacterSheet();updateUI();setTimeout(drawNextExplore,80);}
      else renderCharacterSheet('inventory');
      return;
    }
    renderCharacterSheet(fallback);
  }
  function claimValueTreasure(p,id,ctx){const card=itemCard(id);if(!card||itemType(card)!=='ценность')return;sourceRemove(p,id,ctx);applyTreasureImmediate(p,card);discardHeldCard(card);log(`${p.name} забирает содержимое тайника «${card.name}».`);renderAfterPendingResolution(p,ctx,'inventory');updateUI()}
  function moveToBackpack(p,id,ctx){if(!hasBackpackRoom(p)){alert('Рюкзак заполнен.');return}sourceRemove(p,id,ctx);p.backpack.push(id);log(`${p.name}: «${itemCard(id)?.name}» помещён в рюкзак.`);renderAfterPendingResolution(p,ctx,'backpack');updateUI()}
  function unequipToPending(p,id,ctx){if(ctx?.slot==='artifact'&&id===191&&p.backpack.length>baseBackpackCapacity(p)){alert(`Сначала освободите рюкзак: без Журнала странника вместимость станет ${baseBackpackCapacity(p)}.`);return}sourceRemove(p,id,ctx);p.pendingItems.push(id);log(`${p.name} снимает «${itemCard(id)?.name}». Предмет оставлен в неразобранных.`);renderCharacterSheet('pending');updateUI()}
  function unequipToBackpack(p,id,ctx){if(!canUnequipToBackpack(p,id,ctx.slot)){alert('Недостаточно места в рюкзаке.');return}sourceRemove(p,id,ctx);p.backpack.push(id);log(`${p.name}: «${itemCard(id)?.name}» снят и помещён в рюкзак.`);renderCharacterSheet('backpack');updateUI()}
  function discardItem(p,id,ctx){const card=itemCard(id);if(isItemLocked(p,id)){alert('Предмет заблокирован для продажи и сброса.');return}if(!confirm(`Сбросить «${card?.name||id}»?`))return;if(ctx?.where==='equipment'&&ctx.slot==='artifact'&&id===191&&p.backpack.length>baseBackpackCapacity(p)){alert(`Нельзя сбросить Журнал странника, пока в рюкзаке больше ${baseBackpackCapacity(p)} предметов.`);return}sourceRemove(p,id,ctx);discardHeldCard(card);log(`${p.name} сбрасывает «${card?.name||id}».`);renderAfterPendingResolution(p,ctx,'inventory');updateUI()}
  function requestEquip(p,id,ctx){const card=itemCard(id),check=canEquipCard(p,card),heroCombat=heroIsActiveCombatant(p);if(!check.ok){alert(check.why);return}if(heroCombat&&itemType(card)!=='зелье'){alert('Во время боя менять оружие, броню, кольца, амулеты, артефакты и наёмника нельзя. Разрешено только перекладывать зелья из рюкзака в быстрые слоты.');return}if(heroCombat&&ctx?.where!=='backpack'){alert('Во время боя в быстрые слоты можно перекладывать только зелья из рюкзака.');return}const slots=targetSlots(card);if(!slots.length)return;const empty=slots.find(s=>getSlotId(p,s)==null);if(empty){const r=equipTransaction(p,id,ctx,empty,'backpack');if(!r.ok){alert(r.why);return}if(heroCombat&&itemType(card)==='зелье'){state.combat.potionUnlockRound=state.combat.potionUnlockRound||{};state.combat.potionUnlockRound[id]=state.combat.round+1;combatPush(`«${card.name}» переложено из рюкзака в быстрый слот. Оно станет доступно в следующий боевой ход героя.`);renderCombat()}renderAfterPendingResolution(p,ctx,'inventory');updateUI();return}if(slots.length===1){renderReplaceChoice(p,id,ctx,slots[0]);return}els.sheetContent.innerHTML=`<div class="sheet-nav"><button class="ghost" id="cancelEquip">← К предмету</button><b>Выберите слот для замены</b></div><div class="replace-list">${slots.map(s=>{const c=itemCard(getSlotId(p,s));return `<button class="item-row ${c?itemColorClass(p,c):''}" data-replace-slot="${s}"><span><b>${SLOT_LABELS[s]}</b><small>${c?.name||'пусто'}${c?.fields?.['Эффект']?` · ${c.fields['Эффект']}`:''}</small></span><span>›</span></button>`}).join('')}</div>`;document.getElementById('cancelEquip').onclick=()=>showItemInSheet(id,ctx);els.sheetContent.querySelectorAll('[data-replace-slot]').forEach(b=>b.onclick=()=>renderReplaceChoice(p,id,ctx,b.dataset.replaceSlot))}
  function renderReplaceChoice(p,id,ctx,slot){const oldId=getSlotId(p,slot),old=itemCard(oldId),card=itemCard(id),heroCombat=heroIsActiveCombatant(p);els.sheetContent.innerHTML=`<div class="sheet-nav"><button class="ghost" id="cancelReplace">← Назад</button><b>Замена: ${SLOT_LABELS[slot]}</b></div><div class="compare-box compare-rich"><div class="compare-item-card ${old?itemColorClass(p,old):''}"><small>Сейчас</small><b>${old?.name||'—'}</b>${old?`<div class="card-fields compact">${itemFieldsHtml(old)}</div>`:''}</div><div class="compare-arrow">→</div><div class="compare-item-card ${card?itemColorClass(p,card):''}"><small>Новый</small><b>${card?.name||'—'}</b>${card?`<div class="card-fields compact">${itemFieldsHtml(card)}</div>`:''}</div></div><div class="modal-actions" id="replaceActions"></div>`;document.getElementById('cancelReplace').onclick=()=>showItemInSheet(id,ctx);const box=document.getElementById('replaceActions');const add=(label,cls,mode)=>{const b=document.createElement('button');b.textContent=label;b.className=cls;if(mode==='discard'&&isItemLocked(p,oldId)){b.disabled=true;b.title='Предмет заблокирован для продажи и сброса.'}b.onclick=()=>{if(mode==='discard'&&isItemLocked(p,oldId)){alert('Предмет заблокирован для продажи и сброса.');return}const r=equipTransaction(p,id,ctx,slot,mode);if(!r.ok){alert(r.why);return}if(heroCombat&&itemType(card)==='зелье'&&ctx?.where==='backpack'){state.combat.potionUnlockRound=state.combat.potionUnlockRound||{};state.combat.potionUnlockRound[id]=state.combat.round+1;combatPush(`«${card.name}» переложено из рюкзака в быстрый слот. Оно станет доступно в следующий боевой ход героя.`);renderCombat()}renderAfterPendingResolution(p,ctx,'inventory');updateUI()};box.appendChild(b)};if(slot==='mercenary'){const b=document.createElement('button');b.textContent='Взять нового наёмника, старого распустить';b.className='success';if(isItemLocked(p,oldId)){b.disabled=true;b.title='Предмет заблокирован для продажи и сброса.'}b.onclick=()=>{if(isItemLocked(p,oldId)){alert('Предмет заблокирован для продажи и сброса.');return}const r=equipTransaction(p,id,ctx,slot,'discard');if(!r.ok){alert(r.why);return}renderAfterPendingResolution(p,ctx,'inventory');updateUI()};box.appendChild(b);return}add('Заменить, старый в рюкзак','success','backpack');add('Заменить и сбросить старый','danger','discard');}
  function territoryFullCost(hex){return MAP.hexes[hex]?.region==='cursed'?20:10}
  function fullAreaForTerritory(hex){const t=state.territories[hex];if(!t?.areaId)return null;return state.areas.find(a=>a.id===t.areaId&&a.owner===t.owner)||null}
  function tributeCostFor(hex){const base=MAP.hexes[hex]?.region==='cursed'?10:5;return fullAreaForTerritory(hex)?base*2:base}
  function transferGold(from,to,amount){const paid=Math.min(Math.max(0,amount),from.gold);from.gold-=paid;if(to)gainGold(to,paid);return paid}
  function clearForeignTerritoryPending(){
    const pend=state.foreignTerritoryPending;state.foreignTerritoryPending=null;
    if(state.moveTransit&&pend?.transitKey){const keys=state.moveTransit.resolvedKeys||(state.moveTransit.resolvedKeys=[]);if(!keys.includes(pend.transitKey))keys.push(pend.transitKey);updateUI();renderBoard();setTimeout(continueMoveTransit,0);return}
    updateUI();renderBoard();
  }
  function payTributeNow(){
    const p=currentPlayer(),pend=state.foreignTerritoryPending;if(!pend||pend.heroId!==p.id)return;const owner=getPlayer(pend.ownerId),cost=tributeCostFor(pend.hex),paid=transferGold(p,owner,cost);
    if(paid<cost){const dmg=rand(6);log(`${p.name} не хватает золота на дань ${cost}: отдаёт все ${paid} золота игроку ${owner?.name||'владельцу'} и получает D6 = <b>${dmg}</b> урона.`);damage(p,dmg);if(p.currentHp<=0)return}
    else log(`${p.name} платит дань <b>${cost} золота</b> игроку ${owner?.name||'владельцу'} за ${pend.hex}.`);
    clearForeignTerritoryPending();
  }
  function breakAreaById(areaId,reason='потеря территории'){
    if(!areaId)return;const area=state.areas.find(a=>a.id===areaId);if(!area)return;
    for(const h of area.hexes){if(state.territories[h]?.areaId===areaId)state.territories[h].areaId=null}
    state.areas=state.areas.filter(a=>a.id!==areaId);log(`<b>Область №${area.ownerAreaNumber||area.id} игрока ${getPlayer(area.owner)?.name||area.owner} распалась</b>: ${reason}.`);
  }
  function transferTerritory(hex,newOwnerId,payment=0,oldOwnerId=null){
    const t=state.territories[hex];if(!t)return false;const oldOwner=getPlayer(oldOwnerId||t.owner),newOwner=getPlayer(newOwnerId);if(!oldOwner||!newOwner||oldOwner.id===newOwner.id)return false;
    const oldAreaId=t.areaId;if(oldAreaId)breakAreaById(oldAreaId,`территория ${hex} сменила владельца`);
    oldOwner.maxHp=Math.max(oldOwner.hp||1,oldOwner.maxHp-1);oldOwner.currentHp=Math.min(oldOwner.currentHp,oldOwner.maxHp);
    newOwner.maxHp+=1;newOwner.currentHp=Math.min(newOwner.maxHp,newOwner.currentHp+1);
    t.owner=newOwner.id;t.areaId=null;
    if(payment>0){const paid=transferGold(newOwner,oldOwner,payment);log(`${newOwner.name} выплачивает ${oldOwner.name} <b>${paid} золота</b> за территорию ${hex}.`)}
    log(`<b>${newOwner.name} захватывает территорию ${hex}</b>. Максимум ЗД: ${newOwner.maxHp}; у ${oldOwner.name}: ${oldOwner.maxHp}.`);return true;
  }
  function attemptAvoidTribute(){
    const p=currentPlayer(),pend=state.foreignTerritoryPending;if(!pend||pend.heroId!==p.id)return;const owner=getPlayer(pend.ownerId),d=rand(20),cha=effectiveStat(p,'cha'),total=d+cha,cost=tributeCostFor(pend.hex),failedCost=cost*2,natural=d===20?20:d===1?1:null,ok=d===20?true:d===1?false:total>=12;
    announceCheck(`Избегание дани · ${pend.hex}`,d,'ХАР',cha,total,12,ok,natural,ok?'Дань не платится':`При провале: ${failedCost} золота`);
    if(d===20){const pay=Math.floor(territoryFullCost(pend.hex)*.5);log(`${p.name}: избегание дани — <b>натуральная 20</b>. Территория автоматически захвачена.`);transferTerritory(pend.hex,p.id,pay,owner.id);clearForeignTerritoryPending();return}
    if(d===1){const paid=transferGold(p,owner,failedCost);const dmg=rand(6)+rand(6);log(`${p.name}: избегание дани — <b>натуральная 1</b>. Выплачено ${paid}/${failedCost} золота; дополнительно 2D6 = <b>${dmg}</b> урона.`);damage(p,dmg);if(p.currentHp>0)clearForeignTerritoryPending();return}
    if(total>=12){log(`${p.name}: D20 ${d} + ХАР ${signed(cha)} = ${total}. <b>Дань успешно избегнута.</b>`);clearForeignTerritoryPending();return}
    const paid=transferGold(p,owner,failedCost);if(paid<failedCost){const dmg=rand(6);log(`${p.name}: избегание дани провалено. Требуется ${failedCost} золота: отдано ${paid}, дополнительно D6 = ${dmg} урона.`);damage(p,dmg);if(p.currentHp>0)clearForeignTerritoryPending();return}
    log(`${p.name}: D20 ${d} + ХАР ${signed(cha)} = ${total}. Избегание дани провалено — выплачено <b>${failedCost} золота</b>.`);clearForeignTerritoryPending();
  }
  function attemptCaptureTerritory(){
    const p=currentPlayer(),pend=state.foreignTerritoryPending;if(!pend||pend.heroId!==p.id)return;const owner=getPlayer(pend.ownerId),cost=territoryFullCost(pend.hex);if(p.gold<cost){alert(`Для попытки захвата нужно иметь не меньше ${cost} золота.`);return}
    const d=rand(20),cha=effectiveStat(p,'cha'),total=d+cha,natural=d===20?20:d===1?1:null,ok=d===20?true:d===1?false:total>=15;
    announceCheck(`Захват территории · ${pend.hex}`,d,'ХАР',cha,total,15,ok,natural);
    if(d===20){log(`${p.name}: захват ${pend.hex} — <b>натуральная 20</b>. Захват автоматический, без выплаты.`);transferTerritory(pend.hex,p.id,0,owner.id);clearForeignTerritoryPending();return}
    if(d===1){const paid=transferGold(p,owner,cost),dmg=rand(6);log(`${p.name}: захват ${pend.hex} — <b>натуральная 1</b>. Захват провален; выплачено ${paid} золота и получено D6 = <b>${dmg}</b> урона.`);damage(p,dmg);if(p.currentHp>0)clearForeignTerritoryPending();return}
    if(total>=15){log(`${p.name}: D20 ${d} + ХАР ${signed(cha)} = ${total}. <b>Захват успешен.</b>`);transferTerritory(pend.hex,p.id,cost,owner.id);clearForeignTerritoryPending();return}
    log(`${p.name}: D20 ${d} + ХАР ${signed(cha)} = ${total}. Захват провален — нужно заплатить дань.`);payTributeNow();
  }
  function tradeSellEntries(seller){
    const out=[];
    for(const {slot,id} of equippedEntries(seller)){
      if(slot==='mercenary')continue;
      const card=itemCard(id);
      if(card)out.push({id,card,ctx:{where:'equipment',slot},where:`Экипировано · ${SLOT_LABELS[slot]}`});
    }
    for(const id of seller.backpack){
      const card=itemCard(id);
      if(card)out.push({id,card,ctx:{where:'backpack'},where:'Рюкзак'});
    }
    return out;
  }
  function canPlayerTradeEntry(seller,e){
    const base=numericItemPrice(e.card);
    if(base==null)return{ok:false,why:'У предмета нет утверждённой стоимости.'};
    if(seller&&isItemLocked(seller,e.id))return{ok:false,why:'Предмет заблокирован для продажи и сброса.'};
    return{ok:true,base};
  }
  function tradeOpportunityPeople(active=currentPlayer()){return state.players.filter(q=>q.id!==active.id&&q.hex===active.hex)}
  function tradeEntryMap(seller){return new Map(tradeSellEntries(seller).map(e=>[e.id,e]))}
  function tradeSelectionCheck(seller,selectedIds){
    ensurePlayerModel(seller);
    const ids=[...new Set(selectedIds.map(Number))];
    if(!ids.length)return{ok:false,why:'Не выбрано ни одного предмета.',entries:[],max:0};
    const map=tradeEntryMap(seller),entries=[];
    for(const id of ids){
      const e=map.get(id);
      if(!e)return{ok:false,why:'Один из предметов больше не находится у продавца.',entries:[],max:0};
      const chk=canPlayerTradeEntry(seller,e);
      if(!chk.ok)return{ok:false,why:chk.why,entries:[],max:0};
      entries.push(e);
    }
    // Журнал странника увеличивает рюкзак. Его можно продать только если после всей сделки
    // оставшееся содержимое рюкзака помещается в новую вместимость.
    const chosen=new Set(ids);
    const artifactAfter=(getSlotId(seller,'artifact')===191&&chosen.has(191))?null:getSlotId(seller,'artifact');
    const backpackAfter=seller.backpack.filter(id=>!chosen.has(Number(id))).length;
    const capacityAfter=(playerHardMode(seller)?5:10)+(artifactAfter===191?5:0);
    if(backpackAfter>capacityAfter)return{ok:false,why:`После сделки рюкзак продавца будет переполнен: ${backpackAfter}/${capacityAfter}.`,entries,max:0};
    const max=entries.reduce((sum,e)=>sum+numericItemPrice(e.card),0);
    return{ok:true,entries,max};
  }
  function openTrade(activeOverride=null,handoff=true){
    const active=activeOverride||currentPlayer(),others=tradeOpportunityPeople(active);
    if(!others.length){state.tradeOpportunity=null;updateUI();return}
    const closeTrade=()=>{closeModal();endSideInteraction()};
    if(handoff){beginSideInteraction(active,'trade',[active.id,...others.map(q=>q.id)]);advanceTurnState(active,'начало торговли с другим игроком')}
    if(others.length===1){openTradeRoleChoice(others[0],active);return}
    const fake={id:'—',name:'Торговля между игроками',category:'Игроки',deck:'Поле',fields:{'Активный герой':active.name}};
    showCard(fake,'С кем торговать?',others.map(other=>({label:other.name,className:'primary',fn:()=>{closeModal();openTradeRoleChoice(other,active)}})).concat([{label:'Закрыть',className:'secondary',fn:closeTrade}]));
  }
  function openTradeRoleChoice(other,activeOverride=null){
    const active=activeOverride||getPlayer(sideInteractionOwnerId())||currentPlayer();
    els.modalContent.innerHTML=`<div class="card-kicker">Торговля между игроками</div><div class="card-title">${active.name} и ${other.name}</div><div class="card-field">Герои находятся на одном гексе <b>${active.hex}</b>. Выберите роль активного героя <b>${active.name}</b> в сделке.</div><div class="modal-actions"><button id="tradeRoleBuy" class="success">Покупка</button><button id="tradeRoleSell" class="primary">Продажа</button><button id="tradeRoleClose" class="secondary">Закрыть</button></div>`;
    els.modal.hidden=false;
    document.getElementById('tradeRoleBuy').onclick=()=>openTradeBuyerSelection(active,other,[]);
    document.getElementById('tradeRoleSell').onclick=()=>openTradeBuyerSelection(other,active,[]);
    document.getElementById('tradeRoleClose').onclick=()=>{closeModal();endSideInteraction()};
  }
  function tradeSelectionCard(seller,e,selected){
    const chk=canPlayerTradeEntry(seller,e),price=numericItemPrice(e.card);
    return `<div class="merchant-card ${itemColorClass(seller,e.card)} ${selected?'trade-selected':''}"><div class="merchant-card-head"><div><small>№${e.card.id} · ${e.where}</small><b>${e.card.name}</b></div><div class="merchant-price">${price==null?'—':price+' зол.'}</div></div><div class="card-fields compact">${itemFieldsHtml(e.card)}</div><button data-trade-toggle="${e.id}" class="${selected?'danger':'success'}" ${!chk.ok?'disabled':''}>${selected?'Убрать':'Добавить'}</button>${!chk.ok?`<div class="merchant-note">${chk.why}</div>`:''}</div>`;
  }
  function openTradeBuyerSelection(buyer,seller,selectedIds=[]){
    const selected=new Set(selectedIds.map(Number)),entries=tradeSellEntries(seller);
    // Удаляем из выбора предметы, которые успели перестать существовать у продавца.
    const liveIds=new Set(entries.map(e=>Number(e.id)));for(const id of [...selected])if(!liveIds.has(id))selected.delete(id);
    const selectedEntries=entries.filter(e=>selected.has(Number(e.id)));
    const max=selectedEntries.reduce((sum,e)=>sum+(numericItemPrice(e.card)||0),0);
    els.modalContent.innerHTML=`<div class="card-kicker">Торговля · выбор покупателя</div><div class="card-title">${buyer.name} выбирает предметы у ${seller.name}</div><div class="merchant-summary"><span>Покупатель: <b>${buyer.name}</b><strong class="trade-gold">${buyer.gold} зол.</strong></span><span>Продавец: <b>${seller.name}</b><strong class="trade-gold">${seller.gold} зол.</strong></span><span>Выбрано: <b>${selected.size}</b></span><span>Максимум сделки: <b>${max} зол.</b></span></div><div class="merchant-grid">${entries.length?entries.map(e=>tradeSelectionCard(seller,e,selected.has(Number(e.id)))).join(''):'<div class="empty-box">У продавца нет предметов для торговли.</div>'}</div><div class="modal-actions"><button id="tradeBuyerContinue" class="success" ${selected.size?'':'disabled'}>Купить выбранное (${selected.size})</button><button id="tradeBuyerBack" class="secondary">Назад</button><button id="tradeBuyerClose" class="secondary">Закрыть</button></div>`;
    els.modal.hidden=false;
    els.modalContent.querySelectorAll('[data-trade-toggle]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.tradeToggle);if(selected.has(id))selected.delete(id);else selected.add(id);openTradeBuyerSelection(buyer,seller,[...selected])});
    document.getElementById('tradeBuyerContinue').onclick=()=>openTradeSellerReview(buyer,seller,[...selected],null);
    document.getElementById('tradeBuyerBack').onclick=()=>{const active=getPlayer(sideInteractionOwnerId())||buyer;openTradeRoleChoice(active.id===buyer.id?seller:buyer,active)};
    document.getElementById('tradeBuyerClose').onclick=()=>{closeModal();endSideInteraction()};
  }
  function tradeReviewItemsHtml(owner,entries,withRemove=false){
    return entries.map(e=>`<div class="merchant-card ${itemColorClass(owner,e.card)}"><div class="merchant-card-head"><div><small>№${e.card.id} · ${e.where}</small><b>${e.card.name}</b></div><div class="merchant-price">${numericItemPrice(e.card)} зол.</div></div><div class="card-fields compact">${itemFieldsHtml(e.card)}</div>${withRemove?`<button data-trade-remove="${e.id}" class="danger">🗑 Удалить из сделки</button>`:''}</div>`).join('');
  }
  function openTradeSellerReview(buyer,seller,selectedIds,proposedPrice=null){
    const check=tradeSelectionCheck(seller,selectedIds);
    if(!check.ok){alert(check.why);openTradeBuyerSelection(buyer,seller,check.entries.map(e=>e.id));return}
    const {entries,max}=check;let price=proposedPrice==null?max:Math.floor(Number(proposedPrice));if(!Number.isFinite(price))price=max;price=Math.max(0,Math.min(max,price));
    els.modalContent.innerHTML=`<div class="card-kicker">Торговля · решение продавца</div><div class="card-title">${seller.name}: проверьте состав сделки</div><div class="merchant-summary"><span>Покупатель: <b>${buyer.name}</b><strong class="trade-gold">${buyer.gold} зол.</strong></span><span>Продавец: <b>${seller.name}</b><strong class="trade-gold">${seller.gold} зол.</strong></span><span>Предметов: <b>${entries.length}</b></span><span>Максимальная сумма: <b>${max} зол.</b></span></div><div class="merchant-grid">${tradeReviewItemsHtml(seller,entries,true)}</div><div class="card-field" style="margin-top:14px"><b>Общая сумма продажи:</b><br><input id="tradeTotalPrice" type="number" min="0" max="${max}" step="1" value="${price}" style="width:160px;margin-top:8px"> <span class="muted">не более ${max} зол.</span></div><div class="modal-actions"><button id="tradeSellerAccept" class="success">Сделка</button><button id="tradeSellerReject" class="danger">Отклонить</button></div>`;
    els.modal.hidden=false;
    const currentPrice=()=>{let v=Math.floor(Number(document.getElementById('tradeTotalPrice')?.value));if(!Number.isFinite(v))v=0;return Math.max(0,Math.min(max,v))};
    els.modalContent.querySelectorAll('[data-trade-remove]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.tradeRemove),next=selectedIds.filter(x=>Number(x)!==id);if(!next.length){openTradeBuyerSelection(buyer,seller,[]);return}openTradeSellerReview(buyer,seller,next,currentPrice())});
    document.getElementById('tradeSellerReject').onclick=()=>{log(`${seller.name} отклоняет предложенную сделку с ${buyer.name}.`);closeModal();endSideInteraction()};
    document.getElementById('tradeSellerAccept').onclick=()=>openTradeBuyerFinal(buyer,seller,entries.map(e=>e.id),currentPrice());
  }
  function openTradeBuyerFinal(buyer,seller,selectedIds,price){
    const check=tradeSelectionCheck(seller,selectedIds);
    if(!check.ok){alert(check.why);closeModal();return}
    price=Math.max(0,Math.min(check.max,Math.floor(Number(price)||0)));
    els.modalContent.innerHTML=`<div class="card-kicker">Торговля · подтверждение покупателя</div><div class="card-title">${buyer.name}: финальное предложение</div><div class="merchant-summary"><span>Продавец: <b>${seller.name}</b><strong class="trade-gold">${seller.gold} зол.</strong></span><span>Покупатель: <b>${buyer.name}</b><strong class="trade-gold">${buyer.gold} зол.</strong></span><span>Предметов: <b>${check.entries.length}</b></span><span>Цена сделки: <b>${price} зол.</b></span></div><div class="merchant-grid">${tradeReviewItemsHtml(seller,check.entries,false)}</div><div class="card-field" style="margin-top:14px"><b>Итого к оплате:</b> ${price} золота.${buyer.gold<price?`<br><span class="merchant-note">Недостаточно золота: у ${buyer.name} только ${buyer.gold}.</span>`:''}</div><div class="modal-actions"><button id="tradeBuyerAcceptFinal" class="success" ${buyer.gold<price?'disabled':''}>Сделка</button><button id="tradeBuyerRejectFinal" class="danger">Отклонить</button></div>`;
    els.modal.hidden=false;
    document.getElementById('tradeBuyerRejectFinal').onclick=()=>{log(`${buyer.name} отклоняет финальное предложение ${seller.name}.`);closeModal();endSideInteraction()};
    document.getElementById('tradeBuyerAcceptFinal').onclick=()=>executePlayerTrade(buyer,seller,selectedIds,price);
  }
  function executePlayerTrade(buyer,seller,selectedIds,price){
    const check=tradeSelectionCheck(seller,selectedIds);
    if(!check.ok){alert(check.why);closeModal();return}
    price=Math.max(0,Math.min(check.max,Math.floor(Number(price)||0)));
    if(buyer.gold<price){alert(`${buyer.name}: недостаточно золота. Нужно ${price}, есть ${buyer.gold}.`);return}
    const backpackSnapshot=[...seller.backpack],equipmentSnapshot=JSON.parse(JSON.stringify(seller.equipment)),usageSnapshot={...seller.itemUsage};
    for(const e of check.entries){
      const fresh=tradeEntryMap(seller).get(Number(e.id));
      if(!fresh||!sourceRemove(seller,e.id,fresh.ctx)){
        seller.backpack=backpackSnapshot;seller.equipment=equipmentSnapshot;seller.itemUsage=usageSnapshot;
        alert('Не удалось передать все предметы. Сделка отменена.');closeModal();updateUI();return;
      }
    }
    buyer.gold-=price;gainGold(seller,price);ensurePlayerStats(buyer);ensurePlayerStats(seller);buyer.stats.playerTrades++;seller.stats.playerTrades++;
    for(const e of check.entries){buyer.pendingItems.push(e.id);delete seller.itemUsage[e.id]}
    log(`<b>Сделка:</b> ${buyer.name} покупает у ${seller.name} ${check.entries.length} предмет(а/ов) за ${price} золота: ${check.entries.map(e=>`«${e.card.name}»`).join(', ')}.`);
    closeModal();updateUI();renderBoard();endSideInteraction();
    if(buyer.pendingItems?.length)setTimeout(()=>openCharacterSheet('pending',null,buyer.id),0);
  }

  // ========================= v0.5 — БОЕВАЯ СИСТЕМА =========================
  const HERO_COMBAT={
    warrior:{ability:'Железная стойкость',effect:'1 раз за бой уменьши полученный урон на D4.',natural20:'Боевой напор — преимущество на 2 следующие атаки в этом бою.'},
    dwarf:{ability:'Каменная кровь',effect:'1 раз за бой уменьши полученный урон на D6.',natural20:'Оглушающий удар — враг оглушён и пропускает следующую атаку.'},
    mage:{ability:'Живительная искра',effect:'1 раз за бой восстанови D6 ЗД.',natural20:'Стихийный разряд — выбери Молнию (+D8 и Оглушение) или Огонь (+D8 и Горение).'},
    archer:{ability:'Меткий выстрел',effect:'1 раз за бой сделай следующую атаку с преимуществом.',natural20:'Двойная стрела — урон этой успешной атаки ×2.'},
    rogue:{ability:'Теневой обман',effect:'1 раз за бой следующая атака врага выполняется с помехой.',natural20:'Кровоточащий удар — урон ×2 и Кровотечение.'}
  };
  function inCombat(){return !!state.combat}
  function combatEnemy(){return state.combat?itemCard(state.combat.cardId):null}
  function combatEnemyType(){return String(combatEnemy()?.fields?.['Тип']||'').toLowerCase()}
  function combatPush(text){const c=state.combat;if(!c)return;c.history=c.history||[];c.history.unshift(text);c.history=c.history.slice(0,14)}
  function rollExprDetailed(expr){
    const s=String(expr||'0').replace(/\s+/g,'');let total=0,parts=[];
    const re=/([+-]?)(\d*D\d+|\d+)/ig;let m;
    while((m=re.exec(s))){const sign=m[1]==='-'?-1:1,t=m[2];if(/D/i.test(t)){const [a,b]=t.toUpperCase().split('D'),n=Number(a||1),faces=Number(b);const rolls=[];for(let i=0;i<n;i++)rolls.push(rand(faces));const sub=rolls.reduce((x,y)=>x+y,0)*sign;total+=sub;parts.push({kind:'dice',expr:t.toUpperCase(),rolls,sign,value:sub})}else{const v=Number(t)*sign;total+=v;parts.push({kind:'flat',value:v})}}
    return{expr:String(expr||'0'),total,parts,text:parts.map(x=>x.kind==='dice'?`${x.sign<0?'-':''}${x.expr} = ${x.rolls.join('+')}`:signed(x.value)).join(' · ')};
  }
  function rollD20WithMode(mode='normal'){
    if(mode==='advantage'){const a=rand(20),b=rand(20);return{rolls:[a,b],chosen:Math.max(a,b),mode}}
    if(mode==='disadvantage'){const a=rand(20),b=rand(20);return{rolls:[a,b],chosen:Math.min(a,b),mode}}
    const a=rand(20);return{rolls:[a],chosen:a,mode:'normal'};
  }
  function combatSetRoll(title,main,math='',detail='',natural=null){const c=state.combat;if(!c)return;c.lastRoll={title,main:String(main),math,detail,natural};}
  function combatUsed(key){return !!state.combat?.used?.[key]}
  function combatMarkUsed(key){if(state.combat){state.combat.used=state.combat.used||{};state.combat.used[key]=true}}
  function combatHasEquipped(p,id){return equippedEntries(p).some(e=>Number(e.id)===Number(id))}
  function combatEnemyAttackHits(c=state.combat){const a=c?.enemyAttackRoll;if(!a)return false;return a.natural===20?true:a.natural===1?false:a.total>=a.target}
  function combatHeroAttackHits(c=state.combat){const a=c?.attackRoll;if(!a)return false;return a.natural===20?true:a.natural===1?false:a.total>=a.target}
  function combatRollOutcome(){const c=state.combat;if(!c)return null;if(c.phase==='hero_roll'&&c.attackRoll)return combatHeroAttackHits(c);if(c.phase==='enemy_roll'&&c.enemyAttackRoll)return combatEnemyAttackHits(c);return null}
  function lootWord(n){const a=Math.abs(Number(n)||0)%100,b=a%10;if(a>=11&&a<=14)return'тайников';if(b===1)return'тайник';if(b>=2&&b<=4)return'тайника';return'тайников'}
  function setBonusActionInfo(p,setName){
    const c=state.combat;if(!c||!fullSetEquipped(p,setName))return{supported:false,enabled:false,why:''};
    if(setName==='Тени'){const enabled=c.phase==='enemy_roll'&&combatEnemyAttackHits(c)&&!combatUsed('set:Тени');return{supported:true,enabled,why:combatUsed('set:Тени')?'Бонус полного сета уже использован в этом бою.':enabled?'':'Бонус доступен после успешного броска атаки врага, до броска урона.'}}
    return{supported:true,enabled:false,why:'Бонус полного сета пассивный или срабатывает автоматически.'};
  }
  function useSetBonus(p,setName){
    const c=state.combat,info=setBonusActionInfo(p,setName);if(!c||!info.enabled){if(info?.why)alert(info.why);return}
    if(setName==='Тени'){
      const a=c.enemyAttackRoll,rr=rollD20WithMode(a.mode||'normal');a.rolls=rr.rolls;a.chosen=rr.chosen;a.mode=rr.mode;a.natural=rr.mode==='normal'?(rr.chosen===20?20:rr.chosen===1?1:null):null;a.total=rr.chosen+a.bonus;
      combatMarkUsed('set:Тени');combatSetRoll('Сет Тени · переброс атаки врага',rr.chosen,`${rr.chosen} ${signed(a.bonus)} = ${a.total}`,`против ЗЩ ${a.target}${rr.rolls.length>1?` · броски ${rr.rolls.join(' / ')} · натуральные 1/20 не срабатывают`:''}`,a.natural);
      combatPush(`Полный сет Тени: атака врага переброшена. Новый итог ${a.total} против ЗЩ ${a.target}.`);renderCombat();return;
    }
  }
  function mandatoryLootCount(enemy,c=state.combat){if(enemy?.id===281)return 0;if(c?.elite)return 4;const r=String(enemy?.fields?.['Ранг']||'').toLowerCase();if(r.includes('слаб'))return 1;if(r.includes('обыч'))return 2;if(r.includes('силь'))return 3;if(r.includes('элит'))return 4;return Math.max(1,Number((String(enemy?.fields?.['Тайники']||'1').match(/^\s*(\d+)/)||[])[1]||1))}
  function combatIsQuickPotion(p,id){return ['potion0','potion1'].some(s=>Number(getSlotId(p,s))===Number(id))}
  function enemyTypeHas(...terms){const t=combatEnemyType();return terms.some(x=>t.includes(x))}
  function enemyImmuneStatus(status){const t=combatEnemyType();if(status==='Кровотечение')return /нежить|скелет|дух|призрак|конструкт|голем|камен/.test(t);if(status==='Яд')return /нежить|скелет|дух|призрак|конструкт|голем|камен/.test(t);if(status==='Оглушение')return /дух|призрак|бесплот/.test(t);return false}
  function heroImmuneStatus(p,status){for(const {id} of equippedEntries(p)){const c=itemCard(id),eff=String(c?.fields?.['Эффект']||'');if(new RegExp(`Игнорируй\\s+${status}`,'i').test(eff))return true}if(status==='Кровотечение'&&combatHasEquipped(p,234))return true;if(status==='Страх'&&(combatHasEquipped(p,249)||fullSetEquipped(p,'Рассвета')))return true;return false}
  function combatApplyHeroStatus(p,status,duration=3){if(heroImmuneStatus(p,status)){combatPush(`${p.name}: ${status} не действует благодаря экипировке.`);return false}addStatus(p,status,duration);state.combat.lastAppliedHeroStatus=status;if(status==='Оглушение')state.combat.heroStunned=Math.max(state.combat.heroStunned||0,1);if(['Кровотечение','Горение'].includes(status)){state.combat.heroStatusTimers=state.combat.heroStatusTimers||{};state.combat.heroStatusTimers[status]=duration;p.statusTimers[status]=duration}return true}
  function combatApplyEnemyStatus(status,duration=3){const c=state.combat;if(!c||enemyImmuneStatus(status)){if(c)combatPush(`${combatEnemy()?.name}: иммунитет к эффекту «${status}».`);return false}if(status==='Оглушение')c.enemyStunned=Math.max(c.enemyStunned||0,1);if(status==='Кровотечение')c.enemyBleed=Math.max(c.enemyBleed||0,duration);if(status==='Горение')c.enemyBurn=Math.max(c.enemyBurn||0,duration);combatPush(`${combatEnemy()?.name} получает эффект: ${status}.`);return true}
  function combatAttackStatProfile(p){
    const w=itemCard(getSlotId(p,'weapon')),isWeapon=itemType(w)==='оружие';let damage=currentHeroDamage(p),keys=[p.baseAttack||'str'];
    if(isWeapon){const a=String(w.fields?.['Атака']||'');keys=['str','dex','wis','cha'].filter(k=>a.includes(statName(k)));if(!keys.length)keys=[p.baseAttack||'str']}
    if(state.combat?.livingRune==='damageD12')damage='D12';let key=keys.sort((a,b)=>effectiveStat(p,b)-effectiveStat(p,a))[0];return{weapon:w,isWeapon,damage,key,stat:effectiveStat(p,key)};
  }
  function combatPotionBuff(type){const c=state.combat;if(!c)return 0;return (c.buffs||[]).filter(b=>b.type===type&&b.remaining>0).reduce((s,b)=>s+(b.amount||0),0)}
  function combatAttackBonus(p,profile){const c=state.combat,e=combatEnemy();let b=combatPotionBuff('attack');if(c.livingRune==='attack2')b+=2;const id=profile.weapon?.id,def=Number(e?.fields?.['ЗЩ']||0),type=combatEnemyType();
    if([142,214].includes(id)&&def>=14)b+=1;if(id===217&&(def>=15||type.includes('конструкт')))b+=2;if(id===222&&def>=15)b+=2;if(id===145&&c.heroAttackCount===0)b+=3;if(id===152&&/(звер|чудовищ)/.test(type))b+=2;
    if(combatHasEquipped(p,167)&&/(звер|чудовищ)/.test(type))b+=2;if(combatHasEquipped(p,177)&&/(нежить|дух|проклят)/.test(type))b+=2;if(combatHasEquipped(p,282)&&/(нежить|дух|проклят)/.test(type))b+=3;if(c.fateRiftReady){b+=3;}if(combatHasEquipped(p,239)&&/(маг|культист|демон)/.test(type))b+=1;if(combatHasEquipped(p,241)&&p.currentHp<=Math.floor(p.maxHp/2))b+=1;
    if(c.heroAttackCount===0&&e?.id===7)b-=1;if([22,32].includes(e?.id)&&!combatWeaponIsMagicLightSilver(profile.weapon))b-=1;if(e?.id===45&&p.statuses.length)b+=1;
    if(c.nextHeroAttackBonus){b+=c.nextHeroAttackBonus;c.nextHeroAttackBonus=0}return b;
  }
  function combatWeaponIsMagicLightSilver(w){if(!w)return false;const txt=`${w.name} ${w.fields?.['Эффект']||''}`.toLowerCase();return /серебр|свет|книга|посох|рун|маг|искр|молни|феникс|рассвет/.test(txt)}
  function combatPassiveDamageBonus(p,profile){const c=state.combat,e=combatEnemy(),id=profile.weapon?.id,type=combatEnemyType();let flat=0,dice=[];
    if(id===143&&/звер/.test(type))flat+=1;if(id===144&&c.heroSuccessfulHits===0)flat+=3;if(id===152&&/(звер|чудовищ)/.test(type))flat+=2;if(id===150&&/(нежить|дух)/.test(type))flat+=2;if(id===151&&/(чудовищ|проклят)/.test(type))flat+=2;if(id===213&&c.heroSuccessfulHits===0&&type.includes('босс'))flat+=3;if(id===216&&p.statuses.includes('Проклятие'))dice.push('D6');if(id===215&&!c.heroWasFirst&&c.heroSuccessfulHits===0)flat+=2;if(id===221&&c.heroSuccessfulHits===0&&/(босс|демон|нежить|проклят)/.test(type))dice.push('D6');if(id===334&&c.heroSuccessfulHits===0&&/(босс|демон|нежить|проклят)/.test(type))dice.push('D12');if(id===336&&c.attackRoll?.chosen>=19)dice.push('D6');if(c.fateRiftReady){dice.push('D6');c.fateRiftReady=false;}
    if(combatHasEquipped(p,177)&&/(нежить|дух|проклят)/.test(type))flat+=2;if(combatHasEquipped(p,282)&&/(нежить|дух|проклят)/.test(type))flat+=3;if(combatHasEquipped(p,250)&&/(демон|культист|проклят)/.test(type))flat+=1;
    for(const b of (c.buffs||[]))if(b.type==='lightDamage'&&b.remaining>0&&/(нежить|демон|культист|проклят)/.test(type))dice.push('D4');
    if(fullSetEquipped(p,'Рассвета'))dice.push('D4');
    return{flat,dice};
  }
  function combatEnemyAttackModifier(p){const c=state.combat,e=combatEnemy();let b=Number(String(e?.fields?.['АТК']||'0').replace('+',''))||0;if(c.enemyAttackCount===0&&e?.id===2&&c.enemyWasFirst)b+=1;if(c.enemyAttackCount===0&&e?.id===13&&!c.heroWasFirst)b+=1;if(c.enemyAttackCount===0&&combatHasEquipped(p,229))b-=2;if(combatHasEquipped(p,238))b-=2;if(combatHasEquipped(p,341))b-=2;if(e?.id===45&&p.statuses.length)b+=1;return b}
  function combatEffectiveDefense(p){const c=state.combat;return effectiveDefense(p)+combatPotionBuff('defense')+Number(c?.battleDefenseBonus||0)}
  function combatStart(card){
    const p=currentPlayer(),elite=!!state.exploration?.elitePending;
    // Совместимость со старыми сохранениями: сначала переносим текстовые заметки в структурированные эффекты,
    // и только после этого формируем набор эффектов для начинающегося боя.
    const keptNotes=[];for(const n of p.notes||[]){if(/следующем бою.*\+2 к атаке/i.test(n))p.combatEffects.push({type:'nextBattleAttack',amount:2,attacksRemaining:2,label:'Благословение путника'});else if(/следующем бою.*первые 2 атаки.*преимуществ/i.test(n))p.combatEffects.push({type:'nextBattleAdvantage',attacksRemaining:2,label:'Следы врага'});else if(/в следующем бою все атаки героя — с преимуществом/i.test(n))p.combatEffects.push({type:'nextBattleAllAdvantage',label:'Молитва истинного удара'});else if(/в следующем бою герой получает \+3 ЗЩ/i.test(n))p.combatEffects.push({type:'nextBattleDefense',amount:3,label:'Покров Стража'});else if(/в следующем бою урон от атак героя ×2/i.test(n))p.combatEffects.push({type:'nextBattleHeroDamageMultiplier',amount:2,label:'Печать возмездия'});else if(/в следующем бою первый урон.*×2/i.test(n))p.combatEffects.push({type:'nextBattleFirstDamageMultiplier',amount:2,label:'Чёрная игла'});else if(/в следующем бою получаемый героем урон уменьшается вдвое/i.test(n))p.combatEffects.push({type:'nextBattleIncomingHalf',label:'Железная молитва'});else if(/в следующем бою все атаки врага — с помехой/i.test(n))p.combatEffects.push({type:'nextBattleEnemyDisadvantageAll',label:'Морок Сердца'});else keptNotes.push(n)}p.notes=keptNotes;
    const futureTypes=['nextBattleAttack','nextBattleAdvantage','nextBattleFreeEscape','nextBattleDisadvantage','nextBattleAllAdvantage','nextBattleDefense','nextBattleHeroDamageMultiplier','nextBattleFirstDamageMultiplier','nextBattleIncomingHalf','nextBattleEnemyDisadvantageAll','nextBattleAbilityLocked','nextEnemyHitBonus'];
    const enemyFirstEffects=(p.combatEffects||[]).filter(e=>e.type==='nextBattleEnemyFirst');
    const preEffects=(p.combatEffects||[]).filter(e=>futureTypes.includes(e.type)).map(e=>({...e}));
    const enemyFirst=p.statuses.includes('Страх')||elite||/враг атакует первым/i.test(card.fields?.['Эффект']||'')||enemyFirstEffects.length>0;
    if(enemyFirstEffects.length)p.combatEffects=(p.combatEffects||[]).filter(e=>e.type!=='nextBattleEnemyFirst');
    const pendingStartEffects=preEffects,freeEscapeEffect=pendingStartEffects.find(e=>e.type==='nextBattleFreeEscape'),freeEscape=!!freeEscapeEffect;
    if(freeEscape)p.combatEffects=(p.combatEffects||[]).filter(e=>e.type!=='nextBattleFreeEscape');
    const abilityLockEffect=pendingStartEffects.find(e=>e.type==='nextBattleAbilityLocked'),enemyHitEffect=pendingStartEffects.find(e=>e.type==='nextEnemyHitBonus');
    state.combat={instanceId:`c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,startedAt:Date.now(),cardId:card.id,deckKey:card.id===281?'boss':(state.exploration?.deckKey||deckKeyForCard(card)),isBoss:card.id===281,elite,enemyHp:Number(card.fields?.['ЗД']||1),enemyMaxHp:Number(card.fields?.['ЗД']||1),round:1,phase:'pre',used:{},history:[],journalOpen:false,lastRoll:null,heroAdvantage:0,heroDisadvantage:0,enemyAdvantage:0,enemyDisadvantage:0,enemyStunned:0,heroStunned:0,enemyBleed:0,enemyBurn:0,heroStatusTimers:{Кровотечение:p.statusTimers?.['Кровотечение']||0,Горение:p.statusTimers?.['Горение']||0},heroAttackCount:0,heroSuccessfulHits:0,enemyAttackCount:0,enemyHitCount:0,enemySuccessfulHits:0,enemyWasFirst:enemyFirst,heroWasFirst:!enemyFirst,firstEnemyDamageTaken:false,firstEnemyDamageDealt:false,buffs:[],pendingStartEffects,battleEffectsActivated:false,potionUnlockRound:{},pendingHeroDamage:null,pendingEnemyDamage:null,attackRoll:null,mirrorQueued:false,afterEnemyMiss:false,pendingEscape:null,pendingCleanse:null,freeEscape,freeEscapeLabel:freeEscapeEffect?.label||null,heroAbilityLocked:!!abilityLockEffect,heroAbilityLockedLabel:abilityLockEffect?.label||null,heroAllAdvantage:false,heroAllAdvantageLabel:null,enemyAllDisadvantage:false,enemyAllDisadvantageLabel:null,battleDefenseBonus:0,battleDefenseLabel:null,heroDamageMultiplier:1,heroDamageMultiplierLabel:null,firstHeroDamageMultiplier:1,firstHeroDamageMultiplierLabel:null,heroIncomingHalf:false,heroIncomingHalfLabel:null,nextEnemyHitBonus:(enemyHitEffect?.amount||0),nextEnemyHitBonusLabel:enemyHitEffect?.label||null,heroDisadvantageLabel:null,fateRiftReady:false,fateRiftTriggered:false};
    state.turnLocked=true;combatPush(`Открыт враг №${card.id} «${card.name}».`);if(enemyFirstEffects.length)combatPush(`${enemyFirstEffects.map(x=>x.label||'Ловушка').join(', ')}: этот враг атакует первым. Эффект израсходован.`);log(`<b>БОЙ:</b> ${p.name} против «${card.name}» — ЗД ${card.fields?.['ЗД']}, ЗЩ ${card.fields?.['ЗЩ']}, АТК ${card.fields?.['АТК']}, урон ${card.fields?.['Урон']}.`);
    combatStartChecks();renderCombat();updateUI();
  }
  function activatePendingBattleEffects(){const c=state.combat,p=currentPlayer();if(!c||c.battleEffectsActivated)return;c.battleEffectsActivated=true;const pending=(c.pendingStartEffects||[]).filter(e=>e.type!=='nextBattleFreeEscape');for(const e of pending){
    if(e.type==='nextBattleAttack'){c.buffs.push({type:'attack',amount:e.amount||2,remaining:e.attacksRemaining||2,label:e.label||'Бонус следующего боя'});combatPush(`Активирован эффект «${e.label}»: +${e.amount||2} к атаке на ${e.attacksRemaining||2} атаки.`)}
    else if(e.type==='nextBattleAdvantage'){c.buffs.push({type:'advantage',remaining:e.attacksRemaining||2,label:e.label||'Преимущество следующего боя'});combatPush(`Активирован эффект «${e.label}»: преимущество на ${e.attacksRemaining||2} атаки.`)}
    else if(e.type==='nextBattleDisadvantage'){c.heroDisadvantage+=e.attacksRemaining||1;c.heroDisadvantageLabel=e.label||'Помеха';combatPush(`Активирован эффект «${e.label}»: следующая атака героя с помехой.`)}
    else if(e.type==='nextBattleAllAdvantage'){c.heroAllAdvantage=true;c.heroAllAdvantageLabel=e.label||'Молитва истинного удара';combatPush(`Активирован эффект «${e.label}»: все атаки героя в этом бою выполняются с преимуществом.`)}
    else if(e.type==='nextBattleDefense'){c.battleDefenseBonus+=(e.amount||0);c.battleDefenseLabel=e.label||'Покров Стража';combatPush(`Активирован эффект «${e.label}»: +${e.amount||0} ЗЩ до конца боя.`)}
    else if(e.type==='nextBattleHeroDamageMultiplier'){c.heroDamageMultiplier=Math.max(c.heroDamageMultiplier||1,e.amount||2);c.heroDamageMultiplierLabel=e.label||'Печать возмездия';combatPush(`Активирован эффект «${e.label}»: урон атак героя ×${e.amount||2} до конца боя.`)}
    else if(e.type==='nextBattleFirstDamageMultiplier'){c.firstHeroDamageMultiplier=Math.max(c.firstHeroDamageMultiplier||1,e.amount||2);c.firstHeroDamageMultiplierLabel=e.label||'Чёрная игла';combatPush(`Активирован эффект «${e.label}»: первый урон героя в этом бою ×${e.amount||2}.`)}
    else if(e.type==='nextBattleIncomingHalf'){c.heroIncomingHalf=true;c.heroIncomingHalfLabel=e.label||'Железная молитва';combatPush(`Активирован эффект «${e.label}»: получаемый героем урон уменьшается вдвое до конца боя.`)}
    else if(e.type==='nextBattleEnemyDisadvantageAll'){c.enemyAllDisadvantage=true;c.enemyAllDisadvantageLabel=e.label||'Морок Сердца';combatPush(`Активирован эффект «${e.label}»: все атаки врага в этом бою выполняются с помехой.`)}
    else if(e.type==='nextBattleEnemyFirst')combatPush(`Активирован эффект «${e.label}»: враг атакует первым.`);
    else if(e.type==='nextBattleAbilityLocked'){c.heroAbilityLocked=true;c.heroAbilityLockedLabel=e.label||'Ловушка безмолвия';combatPush(`Активирован эффект «${e.label}»: классовая способность героя недоступна до конца этого боя.`)}
    else if(e.type==='nextEnemyHitBonus'){c.nextEnemyHitBonus=e.amount||2;c.nextEnemyHitBonusLabel=e.label||'Зеркальный шип';combatPush(`Активирован эффект «${e.label}»: следующая успешная атака врага наносит +${e.amount||2} урона.`)};
  }
  if(pending.length){const ids=new Set(pending.map(e=>`${e.type}:${e.sourceCardId||e.label}`));p.combatEffects=(p.combatEffects||[]).filter(e=>!ids.has(`${e.type}:${e.sourceCardId||e.label}`))}c.pendingStartEffects=[]}

  function combatStartChecks(){const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c||!e)return;if([43,55].includes(e.id)){const dc=e.id===55?14:13,d=rand(20),wis=effectiveStat(p,'wis'),total=d+wis,natural=d===20?20:d===1?1:null,ok=d===20?true:d===1?false:total>=dc;combatSetRoll(`Начало боя · проверка МУД`,d,`${d} ${signed(wis)} = ${total}`,`Сложность ${dc}`,natural);announceCheck(`Начало боя · ${e.name}`,d,'МУД',wis,total,dc,ok,natural);combatPush(`Проверка МУД: D20 ${d} ${signed(wis)} = ${total} → ${ok?'успех':'провал'}.`);if(!ok)combatApplyHeroStatus(p,'Страх')}}
  function combatFight(){const c=state.combat;if(!c||c.phase!=='pre')return;activatePendingBattleEffects();c.phase=c.enemyWasFirst?'enemy_ready':'hero_turn';combatPush(c.enemyWasFirst?'Враг атакует первым.':'Герой атакует первым.');renderCombat()}
  function combatEscapeBefore(){const c=state.combat,p=currentPlayer();if(!c||c.phase!=='pre')return;if(c.freeEscape){c.freeEscape=false;combatPush('Разлом пути: побег до боя без проверки.');finishCombatEscape('Разлом пути — побег без проверки',false);return}const d=rand(20),dex=effectiveStat(p,'dex'),total=d+dex,natural=d===20?20:d===1?1:null;recordNatural(p,natural);let outcome=d===20?'nat20':d===1?'nat1':total>=13?'success':'fail';c.pendingEscape={kind:'before',d,total,dex,outcome};c.phase='escape_result';combatSetRoll('Побег до боя · D20',d,`${d} ${signed(dex)} = ${total}`,'Сложность 13',d);combatPush(`Побег до боя: ${d} ${signed(dex)} = ${total}.`);renderCombat()}
  function resolveCombatEscapeResult(){const c=state.combat,p=currentPlayer();if(!c||c.phase!=='escape_result'||!c.pendingEscape)return;const x=c.pendingEscape;c.pendingEscape=null;if(x.kind==='before'){
      if(x.outcome==='nat20'){const gold=Number(combatEnemy()?.fields?.['Золото']||0);gainGold(p,gold);combatPush(`Натуральная 20: побег успешен, +${gold} золота.`);finishCombatEscape('Натуральная 20 — побег до боя',true);return}
      if(x.outcome==='nat1'){activatePendingBattleEffects();combatPush('Натуральная 1: побег провален, враг немедленно наносит урон без броска атаки.');combatDirectEnemyDamage(1,'Натуральная 1 при побеге до боя',()=>{if(state.combat){state.combat.phase='hero_turn';renderCombat()}});return}
      if(x.outcome==='success'){finishCombatEscape('Побег до боя успешен',false);return}
      activatePendingBattleEffects();c.phase='enemy_ready';c.enemyWasFirst=true;c.heroWasFirst=false;combatPush('Побег провален: враг атакует первым.');renderCombat();return;
    }
    if(x.outcome==='nat20'){combatPush('Натуральная 20: автоматический побег с золотом и тайниками.');combatEscapeRewards();return}
    if(x.outcome==='nat1'){c.enemyAdvantage=0;combatPush('Натуральная 1: побег провален; враг наносит двойной обычный урон без проверки атаки.');combatDirectEnemyDamage(2,'Натуральная 1 при побеге',null);return}
    if(x.outcome==='success'){finishCombatEscape('Побег во время боя успешен',false);return}
    combatPush('Побег провален: враг наносит обычный урон без проверки атаки.');combatDirectEnemyDamage(1,'Провал побега',null)
  }
  function finishCombatEscape(reason,keepGold=false){const c=state.combat,card=combatEnemy();if(!c)return;discardCard(c.deckKey,card);state.combat=null;state.turnLocked=false;closeModal();finishExplore(false,reason);updateUI();renderBoard();setTimeout(()=>endTurn(true),0)}
  function combatHeroMode(){const c=state.combat;if(!c)return'normal';let adv=(c.heroAllAdvantage)||((c.heroAdvantage||0)>0)||(c.buffs||[]).some(b=>b.type==='advantage'&&b.remaining>0),dis=(c.heroDisadvantage||0)>0;if(adv&&dis)return'normal';return adv?'advantage':dis?'disadvantage':'normal'}
  function combatEnemyMode(){const c=state.combat;if(!c)return'normal';let adv=(c.enemyAdvantage||0)>0,dis=(c.enemyAllDisadvantage)||((c.enemyDisadvantage||0)>0);if(adv&&dis)return'normal';return adv?'advantage':dis?'disadvantage':'normal'}
  function consumeHeroMode(){const c=state.combat;if(c.heroAdvantage>0)c.heroAdvantage--;if(c.heroDisadvantage>0){c.heroDisadvantage--;if(c.heroDisadvantage<=0)c.heroDisadvantageLabel=null}}
  function consumeEnemyMode(){const c=state.combat;if(c.enemyAdvantage>0)c.enemyAdvantage--;if(c.enemyDisadvantage>0)c.enemyDisadvantage--}
  function combatHeroAttack(){const c=state.combat,p=currentPlayer();if(!c||c.phase!=='hero_turn')return;if(c.heroStunned>0){c.heroStunned--;removeStatus(p,'Оглушение');combatPush(`${p.name} пропускает атаку из-за Оглушения.`);combatTickBuffsAtHeroAttack();combatTickHeroStatuses();if(!state.combat)return;c.phase='enemy_ready';renderCombat();return}
    const profile=combatAttackStatProfile(p),mode=combatHeroMode(),rr=rollD20WithMode(mode),bonus=profile.stat+combatAttackBonus(p,profile),total=rr.chosen+bonus,target=Number(combatEnemy()?.fields?.['ЗЩ']||0),natural=rr.mode==='normal'?(rr.chosen===20?20:rr.chosen===1?1:null):null;consumeHeroMode();c.heroAttackCount++;recordNatural(p,natural);c.attackRoll={rolls:rr.rolls,chosen:rr.chosen,mode,bonus,total,target,profile,natural};c.phase='hero_roll';combatSetRoll(`Атака героя · D20`,rr.chosen,`${rr.chosen} ${signed(bonus)} = ${total}`,`${statName(profile.key)} ${signed(profile.stat)} · против ЗЩ ${target}${rr.rolls.length>1?` · броски ${rr.rolls.join(' / ')} · натуральные 1/20 не срабатывают`:''}`,natural);combatPush(`${p.name}: D20 ${rr.rolls.join('/')} → ${rr.chosen} ${signed(bonus)} = ${total} против ЗЩ ${target}.`);renderCombat()}
  function combatRerollHeroAttack(label){const c=state.combat;if(!c?.attackRoll)return;const d=rand(20),a=c.attackRoll;a.rolls=[d];a.chosen=d;a.mode='normal';a.natural=d===20?20:d===1?1:null;recordNatural(currentPlayer(),a.natural);a.total=d+a.bonus;combatSetRoll(`${label} · D20`,d,`${d} ${signed(a.bonus)} = ${a.total}`,`Новый результат против ЗЩ ${a.target}`,a.natural);combatPush(`${label}: новый D20 = ${d}, итог ${a.total}.`);renderCombat()}
  function finalizeHeroAttackRoll(){const c=state.combat,p=currentPlayer();if(!c||c.phase!=='hero_roll')return;const a=c.attackRoll,d=a.chosen,natural=a.natural;let hit=natural===20?true:natural===1?false:a.total>=a.target;
    if(natural===1){c.enemyAdvantage++;combatPush('<b>Натуральная 1:</b> автоматический промах; враг получает преимущество на следующую атаку.');}
    if(!hit){c.afterEnemyMiss=false;if(combatEnemy()?.id===46&&!combatUsed('enemy46miss')){combatMarkUsed('enemy46miss');combatApplyHeroStatus(p,'Усталость')}if(a.profile.weapon?.id===218)c.nextHeroAttackBonus=(c.nextHeroAttackBonus||0)+1;combatPush(`${p.name} промахивается.`);combatTickBuffsAtHeroAttack();combatTickHeroStatuses();if(!state.combat)return;c.phase='enemy_ready';renderCombat();return}
    const dmg=rollExprDetailed(a.profile.damage),pass=combatPassiveDamageBonus(p,a.profile);let amount=dmg.total+pass.flat,detail=[`${dmg.expr}: ${dmg.text}`];for(const die of pass.dice){const r=rollExprDetailed(die);amount+=r.total;detail.push(`${die}: ${r.total}`)}let multiplier=1;
    if(natural===20){combatPush('<b>Натуральная 20 героя:</b> автоматическое попадание; срабатывают эффект героя и оружия.');const h=p.id;if(h==='warrior'){c.heroAdvantage+=2;combatPush('Боевой напор: преимущество на 2 следующие атаки.')}else if(h==='dwarf'){combatApplyEnemyStatus('Оглушение',1)}else if(h==='archer'){multiplier*=2;combatPush('Двойная стрела: урон этой атаки ×2.')}else if(h==='rogue'){multiplier*=2;combatApplyEnemyStatus('Кровотечение',3);combatPush('Кровоточащий удар: урон ×2 и Кровотечение.')}else if(h==='mage'){c.pendingMageNat20=true}}
    const wid=a.profile.weapon?.id;if(wid){if((wid===142&&natural===20)||(wid===217&&natural===20)||(wid===220&&natural===20)||(wid===333&&d>=18))combatApplyEnemyStatus('Оглушение',1);if((wid===145&&natural===20)||(wid===215&&natural===20))combatApplyEnemyStatus('Яд',3);if((wid===146&&natural===20)||(wid===218&&d>=18)||(wid===211&&d>=19)||(wid===212&&((p.currentHp<=p.maxHp/2&&d>=19)||natural===20)))combatApplyEnemyStatus(wid===212?'Горение':'Кровотечение',3);if(wid===149&&natural===20)combatApplyEnemyStatus('Горение',3);if(wid===219&&natural===20){const r=rollExprDetailed('D6');amount+=r.total;detail.push(`Чёрный лук D6: ${r.total}`)}if(wid===220&&d>=18){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`Книга молний D4: ${r.total}`)}if(wid===333&&d>=18){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`Громовой Разлом D4: ${r.total}`)}if(wid===335&&!c.fateRiftTriggered){c.fateRiftTriggered=true;c.fateRiftReady=true;combatPush('Разлом Судьбы: следующая атака +3 к атаке и +D6 урона.')}}
    if((c.firstHeroDamageMultiplier||1)>1){multiplier*=c.firstHeroDamageMultiplier;combatPush(`${c.firstHeroDamageMultiplierLabel||'Чёрная игла'}: первый урон героя ×${c.firstHeroDamageMultiplier}.`);c.firstHeroDamageMultiplier=1;c.firstHeroDamageMultiplierLabel=null}multiplier*=Math.max(1,Number(c.heroDamageMultiplier||1));amount*=multiplier;c.pendingHeroDamage={amount,base:dmg.total,multiplier,detail,profile:a.profile};c.phase='hero_damage';combatSetRoll(`Урон героя · ${a.profile.damage}`,dmg.total,`${dmg.expr} = ${dmg.total}${multiplier>1?` · ×${multiplier}`:''}`,`Текущий урон: ${amount}${detail.length>1?' · '+detail.slice(1).join(' · '):''}`);combatPush(`Бросок урона: ${dmg.text}; текущий урон ${amount}.`);
    if(c.pendingMageNat20){c.phase='mage_nat20'}renderCombat();
  }
  function chooseMageNat20(kind){const c=state.combat;if(!c||c.phase!=='mage_nat20')return;const r=rollExprDetailed('D8');c.pendingHeroDamage.amount+=r.total;c.pendingHeroDamage.detail.push(`${kind==='lightning'?'Молния':'Огонь'} D8: ${r.total}`);combatSetRoll(`Стихийный разряд · D8`,r.total,`D8 = ${r.total}`,kind==='lightning'?'Молния: +D8 и Оглушение':'Огонь: +D8 и Горение');if(kind==='lightning')combatApplyEnemyStatus('Оглушение',1);else combatApplyEnemyStatus('Горение',3);c.pendingMageNat20=false;c.phase='hero_damage';combatPush(`Стихийный разряд: ${kind==='lightning'?'Молния':'Огонь'}, +${r.total} урона.`);renderCombat()}
  function enemyDamageReduction(amount,profile){const c=state.combat,e=combatEnemy();let reduction=0,why=[];if(e?.id===16&&/D4/i.test(profile.damage)){reduction+=1;why.push('Каменный прислужник −1')}if(e?.id===47){reduction+=1;why.push('Голем −1')}if(!c.enemyFirstDamageReceived&&e?.id===23){reduction+=2;why.push('Рыцарь-разбойник −2')}if(!c.enemyFirstDamageReceived&&[44,52].includes(e?.id)){const die=e.id===44?'D4':'D6',r=rollExprDetailed(die);reduction+=r.total;why.push(`${e.name} ${die}=${r.total}`);const after=Math.max(0,amount-reduction);combatSetRoll(`Защита врага · ${die}`,r.total,`${die} = ${r.total}`,`Уменьшение входящего урона: ${amount} → ${after}`);showRollPopup(`${e.name} · уменьшение урона`,r.total,`${die} = <b>${r.total}</b>`,`Входящий урон: <b>${amount}</b> → <b>${after}</b>`)}c.enemyFirstDamageReceived=true;return{amount:Math.max(0,amount-reduction),reduction,why}}
  function applyHeroDamageNow(){const c=state.combat,p=currentPlayer();if(!c||c.phase!=='hero_damage'||!c.pendingHeroDamage)return;const pd=c.pendingHeroDamage,red=enemyDamageReduction(pd.amount,pd.profile),amount=red.amount;recordDamageDealt(p,amount);c.enemyHp-=amount;c.heroSuccessfulHits++;combatPush(`${combatEnemy()?.name} получает ${amount} урона${red.reduction?` (уменьшено на ${red.reduction})`:''}. Осталось ${Math.max(0,c.enemyHp)}/${c.enemyMaxHp}.`);c.pendingHeroDamage=null;
    if(c.enemyHp<=0){combatVictory();return}combatTickBuffsAtHeroAttack();combatTickHeroStatuses();if(!state.combat)return;c.phase='enemy_ready';renderCombat()}
  function combatTickEnemyStatuses(){const c=state.combat,p=currentPlayer();if(!c)return;for(const [key,label] of [['enemyBleed','Кровотечение'],['enemyBurn','Горение']]){if(c[key]>0){recordDamageDealt(p,2);c.enemyHp-=2;c[key]--;combatPush(`${combatEnemy()?.name}: ${label} наносит 2 урона. Осталось ${Math.max(0,c.enemyHp)} ЗД.`)}}}
  function combatTickHeroStatuses(){const c=state.combat,p=currentPlayer();if(!c)return;ensurePlayerModel(p);for(const label of ['Кровотечение','Горение']){let n=p.statusTimers?.[label]??c.heroStatusTimers?.[label]??0;if(n>0&&p.statuses.includes(label)){recordDamageTaken(p,2);p.currentHp-=2;n--;p.statusTimers[label]=n;c.heroStatusTimers[label]=n;p.statusTickedTurn[label]=p.personalTurn;combatPush(`${p.name}: ${label} наносит 2 урона. Осталось ${Math.max(0,p.currentHp)} ЗД; длительность ${n}.`);if(n<=0)removeStatus(p,label)}}if(p.currentHp<=0)combatHeroDeath('периодический урон')}
  function combatEnemyTurn(){const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c||c.phase!=='enemy_ready')return;if(c.enemyStunned>0){c.enemyStunned--;combatPush(`${e.name} пропускает атаку из-за Оглушения.`);combatTickBuffsAtEnemyTurn();combatTickEnemyStatuses();if(c.enemyHp<=0){combatVictory();return}c.round++;combatRoundStartCheck();if(!state.combat)return;c.phase='hero_turn';renderCombat();return}
    const mode=combatEnemyMode(),rr=rollD20WithMode(mode),bonus=combatEnemyAttackModifier(p),total=rr.chosen+bonus,target=combatEffectiveDefense(p),natural=rr.mode==='normal'?(rr.chosen===20?20:rr.chosen===1?1:null):null;consumeEnemyMode();c.enemyAttackCount++;c.enemyAttackRoll={rolls:rr.rolls,chosen:rr.chosen,mode,bonus,total,target,natural};c.phase='enemy_roll';combatSetRoll(`Атака врага · D20`,rr.chosen,`${rr.chosen} ${signed(bonus)} = ${total}`,`против ЗЩ ${target}${rr.rolls.length>1?` · броски ${rr.rolls.join(' / ')} · натуральные 1/20 не срабатывают`:''}`,natural);combatPush(`${e.name}: D20 ${rr.rolls.join('/')} → ${rr.chosen} ${signed(bonus)} = ${total} против ЗЩ ${target}.`);renderCombat();
  }
  function finalizeEnemyAttackRoll(){const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c||c.phase!=='enemy_roll'||!c.enemyAttackRoll)return;const a=c.enemyAttackRoll,d=a.chosen,natural=a.natural,hit=natural===20?true:natural===1?false:a.total>=a.target;
    if(natural===1){c.heroAdvantage++;combatPush('<b>Натуральная 1 врага:</b> промах; герой получает преимущество на следующий D20.');if([21,24].includes(e.id)){const r=e.id===21?{total:1,text:'1'}:rollExprDetailed('D4');c.enemyHp-=r.total;combatSetRoll(`Натуральная 1 врага · ${e.id===21?'урон':'D4'}`,r.total,e.id===21?'Враг получает 1 урон':`D4 = ${r.total}`,'Урон самому врагу');combatPush(`${e.name} получает ${r.total} урона из-за своей Натуральной 1.`)}if(e.id===9)c.enemyStunned=Math.max(c.enemyStunned,1);if(c.enemyHp<=0){combatVictory();return}c.afterEnemyMiss=true;c.phase='enemy_miss';renderCombat();return}
    if(!hit){c.afterEnemyMiss=true;c.phase='enemy_miss';combatPush(`${e.name} промахивается.`);renderCombat();return}
    c.enemyHitCount=(c.enemyHitCount||0)+1;
    combatEnemyHitDamage(d,false);
  }
  function combatEnemyHitDamage(directRoll=null,direct=false,multiplier=1,label='Атака врага'){
    const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c)return;const dr=rollExprDetailed(e.fields?.['Урон']||'D4');let amount=dr.total,detail=[`${e.fields?.['Урон']}: ${dr.text}`];
    if(c.enemySuccessfulHits===0&&[11,29].includes(e.id)){amount+=1;detail.push('первый успешный удар +1')}
    if(c.enemySuccessfulHits===0&&e.id===50){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`первый удар +D4=${r.total}`)}
    const natural=direct?null:c.enemyAttackRoll?.natural,kept=direct?null:c.enemyAttackRoll?.chosen,eff=String(e.fields?.['Эффект']||''),repeatCurse=!direct&&natural===20&&e.id===54&&p.statuses.includes('Проклятие');
    if(!direct&&natural===20){c.heroDisadvantage++;combatPush('<b>Натуральная 20 врага:</b> попадание; герой получает помеху на следующий D20.');if(e.id===17){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`нат.20 +D4=${r.total}`)}if(repeatCurse){const r=rollExprDetailed('D6');amount+=r.total;detail.push(`повторное Проклятие +D6=${r.total}`)}if(e.id===51)combatLoseRandomEquippedItem(p)}
    if(!direct)combatApplyEnemyTriggeredStatus(kept,repeatCurse?null:natural,eff,p);
    if(e.id===10&&kept>=18){amount+=1;detail.push('18–20 +1 урон')}if(e.id===41&&c.enemyAttackCount%3===0){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`каждая 3-я атака +D4=${r.total}`)}if(e.id===281&&(c.enemyHitCount||0)%3===0){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`Тёмный удар +D4=${r.total}`);combatPush(`Тёмный удар Владыки: каждая 3-я успешная атака получает +D4 (${r.total}) урона.`)}
    if(!direct&&c.nextEnemyHitBonus>0){const bonus=Number(c.nextEnemyHitBonus)||0;amount+=bonus;detail.push(`Зеркальный шип +${bonus}`);combatPush(`Зеркальный шип: следующая успешная атака врага получает +${bonus} урона.`);c.nextEnemyHitBonus=0;c.nextEnemyHitBonusLabel=null}
    amount*=multiplier;c.pendingEnemyDamage={amount,original:amount,detail,direct,label,enemyRollTotal:c.enemyAttackRoll?.total||null,enemyDefense:combatEffectiveDefense(p)};c.phase='enemy_damage';combatSetRoll(`${label} · урон`,dr.total,`${e.fields?.['Урон']} = ${dr.total}${multiplier>1?` · ×${multiplier}`:''}`,`Текущий входящий урон: ${amount}${detail.length>1?' · '+detail.slice(1).join(' · '):''}`);combatPush(`Урон врага: ${dr.text}; текущий входящий урон ${amount}.`);renderCombat();
  }
  function combatApplyEnemyTriggeredStatus(kept,natural,eff,p){const m=String(eff).match(/(18|19)[–-]20\s*—\s*(Кровотечение|Яд|Усталость|Слабость|Проклятие|Страх|Оглушение|Горение)/i);if(m&&kept>=Number(m[1])){combatApplyHeroStatus(p,m[2],3);return}const nat=String(eff).match(/Натуральная\s*20\s*—\s*(Кровотечение|Яд|Усталость|Слабость|Проклятие|Страх|Оглушение|Горение)/i);if(nat&&natural===20)combatApplyHeroStatus(p,nat[1],3)}
  function combatLoseRandomEquippedItem(p){const candidates=equippedEntries(p).filter(e=>!['mercenary','potion0','potion1'].includes(e.slot));if(!candidates.length)return;const x=candidates[Math.floor(Math.random()*candidates.length)];setSlotId(p,x.slot,null);discardHeldCard(itemCard(x.id));combatPush(`Натуральная 20: ${p.name} теряет надетый предмет «${itemCard(x.id)?.name}».`)}
  function passiveHeroDamageReduction(p,amount){const c=state.combat,e=combatEnemy();let r=0,why=[];if(combatHasEquipped(p,270)){r+=2;why.push('Ветеран щита −2')}if(!c.firstEnemyDamageTaken&&combatHasEquipped(p,155)){r+=1;why.push('Кольчуга −1')}if(!c.firstEnemyDamageTaken&&combatHasEquipped(p,228)){const d=rollExprDetailed('D4');r+=d.total;why.push(`Рунная кольчуга −D4=${d.total}`);combatSetRoll('Рунная кольчуга · D4',d.total,`D4 = ${d.total}`,'Автоматическое уменьшение первого урона')}if(combatHasEquipped(p,162)&&/(звер|чудовищ)/.test(combatEnemyType())){r+=1;why.push('Куртка Охотника −1')}if(combatHasEquipped(p,230)&&/(демон|звер|чудовищ)/.test(combatEnemyType())){r+=1;why.push('Доспех охотника −1')}if(combatHasEquipped(p,235)&&p.currentHp<=3){r+=3;why.push('Последний рубеж −3')}if(combatHasEquipped(p,340)){const d=rollExprDetailed('D4');r+=d.total;why.push(`Каменная Печать −D4=${d.total}`)}if(combatHasEquipped(p,344)&&p.currentHp<=3){r+=3;why.push('Последний Шанс −3')}c.firstEnemyDamageTaken=true;return{amount:Math.max(0,amount-r),reduction:r,why}}
  function finishEnemyTurnAfterDamage(){const c=state.combat;if(!c)return;combatTickBuffsAtEnemyTurn();combatTickEnemyStatuses();if(c.enemyHp<=0){combatVictory();return}if(!state.combat)return;c.round++;combatRoundStartCheck();if(!state.combat)return;c.phase='hero_turn';renderCombat();updateUI()}
  function acceptEnemyDamage(){const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c||c.phase!=='enemy_damage'||!c.pendingEnemyDamage)return;const pd=c.pendingEnemyDamage,red=passiveHeroDamageReduction(p,pd.amount);let amount=red.amount,extraNote='';if(c.heroIncomingHalf&&amount>0){const before=amount;amount=Math.ceil(amount/2);extraNote=`; Железная молитва: ${before} → ${amount}`;}c.pendingEnemyDamage=null;if(amount>0){recordDamageTaken(p,amount);p.currentHp-=amount;c.enemySuccessfulHits++;combatPush(`${p.name} получает ${amount} урона${red.reduction?` (автоматически уменьшено на ${red.reduction})`:''}${extraNote}. Осталось ${Math.max(0,p.currentHp)}/${p.maxHp}.`);if(combatHasEquipped(p,224)&&p.currentHp>0){heal(p,1);combatPush('Доспех Вампира: +1 ЗД после полученного урона.')}if(combatHasEquipped(p,343)&&p.currentHp>0){const hr=rollHealing(p,'D4'),before=p.currentHp;heal(p,hr.total);combatPush(`Доспех Живой Крови: восстановлено ${p.currentHp-before} ЗД.`)}if(p.id==='mage'&&Number(getSlotId(p,'weapon'))===338&&!combatUsed('item:338')&&p.currentHp>0){const r=rollExprDetailed('D8');c.enemyHp-=r.total;recordDamageDealt(p,r.total);combatMarkUsed('item:338');showRollPopup('Книга Отражённого Пламени',r.total,`D8 = ${r.total}`,`Ответный урон врагу: ${r.total}`);combatPush(`Книга Отражённого Пламени наносит ${r.total} ответного урона.`)}if([36,42,48].includes(e.id)||(e.id===38&&c.enemySuccessfulHits===1)){c.enemyHp=Math.min(c.enemyMaxHp,c.enemyHp+2);combatPush(`${e.name} восстанавливает 2 ЗД после успешной атаки.`)}if(c.mirrorQueued){const r=rollExprDetailed('D8');recordDamageDealt(p,r.total);c.enemyHp-=r.total;c.mirrorQueued=false;combatSetRoll('Зеркало мрака · D8',r.total,`D8 = ${r.total}`,'Ответный урон врагу');showRollPopup('Зеркало мрака · ответный урон',r.total,`D8 = ${r.total}`,`Враг получает ${r.total} урона в ответ.`);combatPush(`Зеркало мрака наносит ${r.total} ответного урона.`)}}else combatPush(`${p.name} не получает урона.`);
    if(p.currentHp<=0){combatHeroDeath('атака врага');return}if(c.enemyHp<=0){combatVictory();return}if(amount>0){c.phase='post_damage';c.lastAcceptedDamage=amount;combatSetRoll('Урон принят',amount,`ЗД ${p.currentHp}/${p.maxHp}`,'Теперь можно применить лечение; если лечение не нужно — продолжите бой.');renderCombat();updateUI();return}finishEnemyTurnAfterDamage()}
  function combatContinueAfterDamage(){const c=state.combat;if(!c||c.phase!=='post_damage')return;finishEnemyTurnAfterDamage()}

  function combatRoundStartCheck(){const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c||!e)return;if(e.id===53&&c.round%2===0){const d=rand(20),str=effectiveStat(p,'str'),total=d+str,natural=d===20?20:d===1?1:null,ok=d===20?true:d===1?false:total>=13;combatSetRoll('Чёрные корни · СИЛ 13+',d,`${d} ${signed(str)} = ${total}`,ok?'Успех':'Провал',natural);announceCheck('Чёрные корни',d,'СИЛ',str,total,13,ok,natural);combatPush(`Матерь чёрных корней: СИЛ 13+ → ${total}, ${ok?'успех':'провал'}.`);if(!ok){const r=rollExprDetailed('D4');recordDamageTaken(p,r.total);p.currentHp-=r.total;showRollPopup('Чёрные корни · урон',r.total,`D4 = ${r.total}`,`ЗД ${Math.max(0,p.currentHp)}/${p.maxHp}`);combatPush(`Чёрные корни наносят ${r.total} урона.`);if(p.currentHp<=0)combatHeroDeath('Матерь чёрных корней')}}}
  function combatDirectEnemyDamage(multiplier,reason,after){const c=state.combat;if(!c)return;const dr=rollExprDetailed(combatEnemy()?.fields?.['Урон']||'D4'),amount=dr.total*multiplier;c.pendingEnemyDamage={amount,original:amount,direct:true,label:reason,after};c.phase='enemy_damage';combatSetRoll(`${reason} · урон`,dr.total,`${combatEnemy()?.fields?.['Урон']} = ${dr.total}${multiplier>1?` · ×${multiplier}`:''}`,`Входящий урон: ${amount}`);combatPush(`${reason}: урон ${amount}.`);renderCombat()}
  function combatContinueAfterEnemyMiss(){const c=state.combat;if(!c||c.phase!=='enemy_miss')return;c.afterEnemyMiss=false;combatTickBuffsAtEnemyTurn();combatTickEnemyStatuses();if(c.enemyHp<=0){combatVictory();return}if(!state.combat)return;c.round++;combatRoundStartCheck();if(!state.combat)return;c.phase='hero_turn';renderCombat()}
  function combatEscapeDuring(){const c=state.combat,p=currentPlayer();if(!c||c.phase!=='hero_turn')return;if(c.freeEscape){c.freeEscape=false;combatPush('Разлом пути: побег во время боя без проверки.');finishCombatEscape('Разлом пути — побег без проверки',false);return}const rr=rollD20WithMode(combatHeroMode()),d=rr.chosen,dex=effectiveStat(p,'dex'),total=d+dex,natural=rr.mode==='normal'?(d===20?20:d===1?1:null):null;recordNatural(p,natural);consumeHeroMode();const outcome=natural===20?'nat20':natural===1?'nat1':total>=15?'success':'fail';c.pendingEscape={kind:'during',d,total,dex,outcome};c.phase='escape_result';combatSetRoll('Побег во время боя · D20',d,`${d} ${signed(dex)} = ${total}`,`Сложность 15${rr.rolls.length>1?` · броски ${rr.rolls.join(' / ')} · натуральные 1/20 не срабатывают`:''}`,natural);combatPush(`Побег во время боя: ${d} ${signed(dex)} = ${total}.`);renderCombat()}
  function combatEscapeRewards(){const c=state.combat,p=currentPlayer(),e=combatEnemy(),baseGold=Number(e?.fields?.['Золото']||0),hunter=fullSetEquipped(p,'Охотника')&&/(звер|чудовищ)/.test(combatEnemyType()),gold=hunter?baseGold*2:baseGold;gainGold(p,gold);const base=mandatoryLootCount(e,c),lootKey=c.deckKey==='exploreHeart'?'lootHeart':'lootOuter';for(let i=0;i<base;i++){const loot=drawCard(lootKey);if(loot)receiveTreasure(p,loot)}if(!c.isBoss)discardCard(c.deckKey,e);state.combat=null;state.turnLocked=false;closeModal();finishExplore(false,'Натуральная 20 при побеге во время боя');if(p.pendingItems.length){advanceTurnWithSideInteraction(p,'loot','завершение боя и получение тайников',[p.id]);setTimeout(()=>openCharacterSheet('pending',null,p.id),0)}else setTimeout(()=>advanceTurnState(p,'завершение боя'),0)}
  function combatHeroDeath(reason){const c=state.combat,p=currentPlayer(),e=combatEnemy();if(c&&p&&fullSetEquipped(p,'Феникса')&&!combatUsed('set:Феникса')){combatMarkUsed('set:Феникса');p.currentHp=Math.max(1,Math.ceil(p.maxHp/2));combatSetRoll('Полный сет Феникса','↻','Возрождение',`ЗД ${p.currentHp}/${p.maxHp}`);combatPush(`Полный сет Феникса: ${p.name} возрождается с ${p.currentHp}/${p.maxHp} ЗД.`);c.phase='post_damage';renderCombat();updateUI();return false}if(c&&e&&!c.isBoss)discardCard(c.deckKey,e);state.combat=null;closeModal();handleDeath(p,e);return true}
  function combatVictory(){const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c||!e)return;
    recordEnemyVictory(p,e,c);
    const goldBefore=Number(p.gold||0),baseGold=Number(e.fields?.['Золото']||0),eliteGold=c.elite?baseGold*2:baseGold,hunter=fullSetEquipped(p,'Охотника')&&/(звер|чудовищ)/.test(combatEnemyType()),gold=hunter?eliteGold*2:eliteGold;gainGold(p,gold);
    if(hunter)combatPush(`Полный сет Охотника: золото за зверя/чудовище ×2.`);
    let bonusLootCount=0;if(combatHasEquipped(p,199))gainGold(p,5);if(combatHasEquipped(p,327))gainGold(p,15);if(combatHasEquipped(p,331))gainGold(p,gold);if(combatHasEquipped(p,172)&&/(звер|чудовищ)/.test(combatEnemyType())){const lk=c.deckKey==='exploreHeart'?'lootHeart':'lootOuter',bonusLoot=drawCard(lk);if(bonusLoot){receiveTreasure(p,bonusLoot);bonusLootCount=1;combatPush(`Кольцо Охотника: получен дополнительный тайник «${bonusLoot.name}».`)}}if(combatHasEquipped(p,237))heal(p,2);if(e.id===55){p.statuses=[];p.statusTimers={};p.statusTickedTurn={};}
    if(c.livingRune==='healAfter'){const rr=rollExprDetailed('D6'),before=p.currentHp;heal(p,rr.total);const restored=p.currentHp-before;combatSetRoll('Живая руна героя · D6',rr.total,`D6 = ${rr.total}`,`Восстановлено ${restored} ЗД`);showRollPopup('Живая руна героя · лечение',rr.total,`D6 = ${rr.total}`,`Восстановлено ${restored} ЗД`);combatPush(`Живая руна героя: после боя восстановлено ${restored} ЗД.`)}
    if(fullSetEquipped(p,'Вампира')){const hr=rollHealing(p,'D8'),before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;showRollPopup('Полный сет Вампира · лечение',hr.total,`${hr.used} = ${hr.total}`,`Восстановлено ${restored} ЗД · ЗД ${p.currentHp}/${p.maxHp}`);combatPush(`Полный сет Вампира: после боя восстановлено ${restored} ЗД.`)}
    const goldEarned=Math.max(0,Number(p.gold||0)-goldBefore);
    if(c.isBoss){markExplorationSuccess(p.hex);p.reexploreRiskHex=null;c.phase='victory';c.victory={gold:goldEarned,baseLoot:0,extraLoot:0,got:[],boss:true};state.gameWon={heroId:p.id,heroName:p.name,round:state.round,personalTurn:p.personalTurn};combatSetRoll('Финальный удар','✓','Владыка Сердца Тьмы побеждён',`${p.name} завершает партию победой.`);combatPush(`<b>ВЛАДЫКА СЕРДЦА ТЬМЫ ПОБЕЖДЁН.</b> Финальный удар нанёс ${p.name}.`);log(`<b>ВЛАДЫКА СЕРДЦА ТЬМЫ ПОБЕЖДЁН.</b> Финальный удар нанёс ${p.name}.`);renderCombat();updateUI();return}
    const base=mandatoryLootCount(e,c),d=rand(20),wis=effectiveStat(p,'wis'),total=d+wis,natural=d===20?20:d===1?1:null;let extra=0,searchDamage=0,searchMishap='';if(d===20||total>=13)extra=1;if(d===1){extra=0;searchDamage=rand(6);recordDamageTaken(p,searchDamage);p.currentHp-=searchDamage;searchMishap=EXTRA_LOOT_NAT1_LINES[Math.floor(Math.random()*EXTRA_LOOT_NAT1_LINES.length)](p.name);combatPush(`${searchMishap} Натуральная 1: D6 = ${searchDamage} урона.`)}
    recordNatural(p,natural);
    const lootKey=c.deckKey==='exploreHeart'?'lootHeart':'lootOuter',got=[];for(let i=0;i<base+extra;i++){const loot=drawCard(lootKey);if(loot){got.push(loot);receiveTreasure(p,loot)}}
    discardCard(c.deckKey,e);markExplorationSuccess(p.hex);p.reexploreRiskHex=null;c.phase='victory';c.victory={gold:goldEarned,baseLoot:base,extraLoot:extra,bonusLoot:bonusLootCount,searchRoll:d,searchTotal:total,searchDamage,got:got.map(x=>x.id),boss:false};combatSetRoll('Результаты боя','✓',`${p.name} победил врага «${e.name}»`,`Заработано золота: ${goldEarned}`);combatPush(`<b>Победа!</b> +${goldEarned} золота, обязательных тайников ${base}${extra?' + 1 дополнительный':''}.`);
    const totalLoot=got.length+bonusLootCount,rollResult=extra?'УСПЕХ':'ПРОВАЛ',naturalText=natural?` · Натуральная ${natural}`:'',damageText=searchDamage?`<br><b>${searchMishap}</b><br>Получено D6 = <b>${searchDamage}</b> урона · ЗД ${Math.max(0,p.currentHp)}/${p.maxHp}`:'';
    closeModal();updateUI();
    showRollPopup('Результаты боя','✓',`<b>${p.name}</b> победил врага «<b>${e.name}</b>».<br>Заработано золота: <b>${goldEarned}</b>`,`Поиск дополнительного тайника: D20 <b>${d}</b> ${signed(wis)} МУД = <b>${total}</b> · <b>${rollResult}</b>${naturalText}<br><b>${p.name}</b> нашёл <b>${totalLoot}</b> ${lootWord(totalLoot)}.${damageText}`,null,()=>{if(searchDamage&&p.currentHp<=0){state.combat=null;handleDeath(p);return}showPostCombatTerritoryPrompt()},'Продолжить');
  }
  function finishCombatVictory(){const c=state.combat,p=currentPlayer();if(!c||c.phase!=='victory')return;if(c.isBoss){state.combat=null;state.exploration=null;state.gameOver={winnerId:p.id,heroName:p.name,round:state.round,personalTurn:p.personalTurn};state.turnLocked=true;state.reachable=[];state.movePending=false;state.chosenPath=null;state.chosenMovePlan=null;closeModal();closeCharacterSheet();log(`<b>Партия завершена.</b> Победитель — ${p.name}.`);updateUI();renderBoard();showGameOverPopup(p);return}state.combat=null;state.turnLocked=false;closeModal();finishExplore(true,'Враг побеждён');if(p.pendingItems.length){advanceTurnWithSideInteraction(p,'loot','победа над врагом',[p.id]);setTimeout(()=>openCharacterSheet('pending',null,p.id),0)}else advanceTurnState(p,'победа над врагом')}
  function useHeroCombatAbility(){const c=state.combat,p=currentPlayer();if(!c||c.heroAbilityUsed)return;let ok=false;
    if(p.id==='warrior'&&c.phase==='enemy_damage'&&c.pendingEnemyDamage){const r=rollExprDetailed('D4');c.pendingEnemyDamage.amount=Math.max(0,c.pendingEnemyDamage.amount-r.total);combatSetRoll('Железная стойкость · D4',r.total,`D4 = ${r.total}`,`Входящий урон теперь ${c.pendingEnemyDamage.amount}`);ok=true}
    if(p.id==='dwarf'&&c.phase==='enemy_damage'&&c.pendingEnemyDamage){const r=rollExprDetailed('D6');c.pendingEnemyDamage.amount=Math.max(0,c.pendingEnemyDamage.amount-r.total);combatSetRoll('Каменная кровь · D6',r.total,`D6 = ${r.total}`,`Входящий урон теперь ${c.pendingEnemyDamage.amount}`);ok=true}
    if(p.id==='mage'&&['hero_turn','post_damage'].includes(c.phase)&&p.currentHp<p.maxHp){const hr=rollHealing(p,'D6'),before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;combatSetRoll(`Живительная искра · ${hr.used}`,hr.total,`${hr.used} = ${hr.total}`,`Восстановлено ${restored} ЗД · ЗД ${p.currentHp}/${p.maxHp}`);combatEnemyHealFromHeroHealing(restored);ok=true}
    if(p.id==='archer'&&c.phase==='hero_turn'){c.heroAdvantage++;ok=true}
    if(p.id==='rogue'&&['hero_turn','enemy_ready'].includes(c.phase)){c.enemyDisadvantage++;ok=true}
    if(!ok){alert('Сейчас эту способность применить нельзя.');return}c.heroAbilityUsed=true;combatPush(`${p.name} использует способность «${HERO_COMBAT[p.id].ability}».`);renderCombat();updateUI()}
  function combatEnemyHealFromHeroHealing(amount){const c=state.combat,e=combatEnemy();if(c&&e?.id===37&&amount>0){c.enemyHp=Math.min(c.enemyMaxHp,c.enemyHp+1);combatPush(`${e.name}: герой лечится — враг восстанавливает 1 ЗД.`)}}
  function supportedCombatEffect(p,card,ctx){if(!state.combat||!card||ctx?.where!=='equipment')return{supported:false,enabled:false,why:''};const c=state.combat,id=card.id,t=itemType(card);if(t==='зелье'){if(!['potion0','potion1'].includes(ctx.slot))return{supported:true,enabled:false,why:'В бою зелья используются только из быстрых слотов.'};const unlock=c.potionUnlockRound?.[id];if(unlock!=null&&c.round<unlock)return{supported:true,enabled:false,why:`Это зелье переложено из рюкзака в этом боевом ходу. Оно станет доступно в боевом раунде ${unlock}.`};if(unlock!=null&&c.round>=unlock)delete c.potionUnlockRound[id];const eff=String(card.fields?.['Эффект']||'');if(/восстанови\s+(?:\d+D\d+|D\d+)\s+ЗД/i.test(eff))return{supported:true,enabled:['hero_turn','post_damage'].includes(c.phase)&&p.currentHp<p.maxHp,why:p.currentHp>=p.maxHp?'ЗД уже полные.':(!['hero_turn','post_damage'].includes(c.phase)?'Лечение доступно в свой боевой ход до атаки или после принятого урона; во время принятия урона оно заблокировано.':'')};if(/сними\s+1\s+негативный эффект/i.test(eff))return{supported:true,enabled:p.statuses.length>0,why:p.statuses.length?'':'Нет негативных эффектов.'};if(/\+(?:2|3)\s+к атаке|\+D4\s+урона/i.test(eff))return{supported:true,enabled:c.phase==='hero_turn',why:c.phase==='hero_turn'?'':'Это зелье нужно выпить до броска атаки.'};if(/\+(?:2|3)\s+ЗЩ/i.test(eff))return{supported:true,enabled:['hero_turn','enemy_ready'].includes(c.phase),why:['hero_turn','enemy_ready'].includes(c.phase)?'':'Зелье защиты нужно выпить до броска атаки врага.'};return{supported:true,enabled:false,why:'Сейчас эффект зелья неприменим.'}}
    const activeIds=[147,149,153,157,159,166,168,173,174,194,193,200,223,225,226,227,233,244,245,246,248,261,262,263,265,196,197,266,267,268,325,326,328,329,330,332,342];if(!activeIds.includes(id))return{supported:false,enabled:false,why:''};if(combatUsed(`item:${id}`))return{supported:true,enabled:false,why:'Эффект уже использован в этом бою.'};if(id===194&&useBlocked(p,id))return{supported:true,enabled:false,why:'Камень удачи уже использован. Он восстановится после посещения постоянной локации или своей территории.'};if([174,175,226,263].includes(id)&&useBlocked(p,id))return{supported:true,enabled:false,why:'Эффект уже использован и восстановится после соответствующей локации.'};let enabled=false;
    if([196,266,159,233,261,325,329,342].includes(id))enabled=c.phase==='enemy_damage'&&!!c.pendingEnemyDamage;if(id===157)enabled=c.phase==='enemy_damage'&&!!c.pendingEnemyDamage&&c.pendingEnemyDamage.enemyRollTotal===combatEffectiveDefense(p);if([200,267,149,246,328,332].includes(id))enabled=c.phase==='hero_damage'&&!!c.pendingHeroDamage;if(id===265)enabled=c.phase==='hero_damage'&&!!c.pendingHeroDamage&&/(босс|демон|нежить|проклят)/.test(combatEnemyType());if([197,268,193,326,330].includes(id))enabled=['hero_turn','post_damage'].includes(c.phase)&&p.currentHp<p.maxHp;if(id===248)enabled=['hero_turn','hero_roll','hero_damage','enemy_ready','enemy_damage','enemy_miss'].includes(c.phase)&&p.statuses.length>0;if([166,244,147,153,194].includes(id))enabled=c.phase==='hero_roll'&&!!c.attackRoll;if(id===153&&enabled){const a=c.attackRoll;enabled=(a.chosen===1?true:a.total<a.target)}if(id===223)enabled=c.phase==='pre';if(id===168)enabled=c.phase==='enemy_damage'&&['Яд','Кровотечение'].includes(c.lastAppliedHeroStatus);if(id===225)enabled=c.phase==='enemy_damage'&&['Яд','Кровотечение','Горение'].includes(c.lastAppliedHeroStatus);if(id===245)enabled=c.phase==='enemy_damage'&&!!c.lastAppliedHeroStatus;if(id===173)enabled=c.phase==='enemy_miss'&&c.afterEnemyMiss;if(id===262)enabled=c.phase==='enemy_damage'&&!!c.pendingEnemyDamage;if([174,263].includes(id))enabled=p.statuses.length>0;if(id===175)enabled=p.statuses.includes('Усталость');if(id===226)enabled=p.statuses.length>0;if(id===227)enabled=p.statuses.includes('Оглушение')||c.lastAppliedHeroStatus==='Оглушение'||c.heroStunned>0;return{supported:true,enabled,why:enabled?'':'Условие эффекта сейчас не выполнено.'}}
  function chooseCombatCleanseStatus(status){const c=state.combat,p=currentPlayer();if(!c?.pendingCleanse)return;const q=c.pendingCleanse;if(!q.options.includes(status))return;const card=itemCard(q.id);removeStatus(p,status);if(q.consume!==false)consumeHeldItem(p,q.id,q.ctx);else{if(q.markReset)useMark(p,q.id,q.markReset);combatMarkUsed(`item:${q.id}`)}combatPush(`${card?.name||'Очищение'}: снят эффект «${status}».`);c.pendingCleanse=null;c.phase=q.returnPhase;combatSetRoll(card?.name||'Очищение','✓','Негативный эффект снят',status);if(!els.sheetDrawer.hidden)renderCharacterSheet(sheetView.mode,sheetView.bonusKey);renderCombat();updateUI()}

  function applyCombatItemEffect(p,id,ctx){const c=state.combat,card=itemCard(id),info=supportedCombatEffect(p,card,ctx);if(!c||!info.enabled){if(info?.why)alert(info.why);return}const eff=String(card.fields?.['Эффект']||''),t=itemType(card);
    if(t==='зелье'){let m;if((m=eff.match(/восстанови\s+((?:\d+D\d+)|D\d+)\s+ЗД/i))){const hr=rollHealing(p,m[1]),before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;combatEnemyHealFromHeroHealing(restored);combatSetRoll(`${card.name} · ${hr.used}`,hr.total,`${hr.used} = ${hr.total}`,`Восстановлено ${restored} ЗД · ЗД ${p.currentHp}/${p.maxHp}`);consumeHeldItem(p,id,ctx)}else if(/сними\s+1\s+негативный эффект/i.test(eff)){const opts=[...p.statuses];if(!opts.length)return;if(opts.length===1){removeStatus(p,opts[0]);consumeHeldItem(p,id,ctx);combatSetRoll(`${card.name}`,'✓','Негативный эффект снят',opts[0]);combatPush(`${card.name}: снят эффект «${opts[0]}».`)}else{c.pendingCleanse={id,ctx:{...ctx},options:opts,returnPhase:c.phase};c.phase='cleanse_choice';renderCombat();return}}else if((m=eff.match(/на\s+(\d+)\s+хода?.*\+2\s+ЗЩ/i))){c.buffs.push({type:'defense',amount:2,remaining:Number(m[1]),label:card.name});consumeHeldItem(p,id,ctx)}else if(/до конца текущего боя.*\+3\s+ЗЩ/i.test(eff)){c.battleDefenseBonus+=3;c.battleDefenseLabel=card.name;consumeHeldItem(p,id,ctx)}else if((m=eff.match(/на\s+(\d+)\s+хода?.*\+2\s+к атаке/i))){c.buffs.push({type:'attack',amount:2,remaining:Number(m[1]),label:card.name});consumeHeldItem(p,id,ctx)}else if(/до конца текущего боя.*\+3\s+к атаке/i.test(eff)){c.buffs.push({type:'attack',amount:3,remaining:999,label:card.name});consumeHeldItem(p,id,ctx)}else if((m=eff.match(/на\s+(\d+)\s+хода?.*\+D4\s+урона/i))){c.buffs.push({type:'lightDamage',remaining:Number(m[1]),label:card.name});consumeHeldItem(p,id,ctx)}combatPush(`${p.name} использует «${card.name}».`);renderCharacterSheet('overview');renderCombat();updateUI();return}
    if([174,263].includes(id)){const opts=[...p.statuses];if(!opts.length)return;if(opts.length>1){c.pendingCleanse={id,ctx:{...ctx},options:opts,returnPhase:c.phase,consume:false,markReset:'shrine'};c.phase='cleanse_choice';renderCombat();return}removeStatus(p,opts[0]);useMark(p,id,'shrine');combatSetRoll(card.name,'✓','Негативный эффект снят',opts[0]);}
    else if(id===175){removeStatus(p,'Усталость');useMark(p,id,'shrine');combatSetRoll(card.name,'✓','Усталость проигнорирована','Эффект восстановится после Святилища');}
    else if(id===226){const opts=[...p.statuses];if(!opts.length)return;if(opts.length>1){c.pendingCleanse={id,ctx:{...ctx},options:opts,returnPhase:c.phase,consume:false,markReset:'shrine'};c.phase='cleanse_choice';renderCombat();return}removeStatus(p,opts[0]);useMark(p,id,'shrine');combatSetRoll(card.name,'✓','Негативный эффект снят',opts[0]);}
    else if(id===227){removeStatus(p,'Оглушение');c.heroStunned=0;if(c.lastAppliedHeroStatus==='Оглушение')c.lastAppliedHeroStatus=null;combatSetRoll(card.name,'✓','Оглушение проигнорировано','1 раз за бой');}
    else if([196,266,325,329,342].includes(id)){const die=id===196?'D6':id===266?'D8':id===325?'D12':id===329?'2D8':'D10',r=rollExprDetailed(die);c.pendingEnemyDamage.amount=Math.max(0,c.pendingEnemyDamage.amount-r.total);combatSetRoll(`${card.name} · ${die}`,r.total,`${die} = ${r.total}`,`Входящий урон теперь ${c.pendingEnemyDamage.amount}`)}
    else if(id===159){const r=rollExprDetailed('D6');c.pendingEnemyDamage.amount=Math.max(0,c.pendingEnemyDamage.amount-r.total);combatSetRoll(`${card.name} · D6`,r.total,`D6 = ${r.total}`,`Входящий урон теперь ${c.pendingEnemyDamage.amount}`)}else if(id===233)c.pendingEnemyDamage.amount=Math.max(0,c.pendingEnemyDamage.amount-2);else if(id===261)c.pendingEnemyDamage.amount=0;else if(id===157&&c.pendingEnemyDamage.enemyRollTotal===combatEffectiveDefense(p))c.pendingEnemyDamage.amount=0;else if(id===262)c.mirrorQueued=true;
    else if([200,267,328,332].includes(id)){const die=id===200?'D6':id===267?'D8':id===328?'D12':'2D8',r=rollExprDetailed(die);c.pendingHeroDamage.amount+=r.total;combatSetRoll(`${card.name} · ${die}`,r.total,`${die} = ${r.total}`,`Текущий урон ${c.pendingHeroDamage.amount}`)}
    else if(id===149){const r=rollExprDetailed('D4');c.pendingHeroDamage.amount+=r.total;combatSetRoll(`${card.name} · D4`,r.total,`D4 = ${r.total}`,`Текущий урон ${c.pendingHeroDamage.amount}`)}
    else if(id===246){const hr=rollHealing(p,'D4'),before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;combatEnemyHealFromHeroHealing(restored);combatSetRoll(`${card.name} · ${hr.used}`,hr.total,`${hr.used} = ${hr.total}`,`Восстановлено ${restored} ЗД · ЗД ${p.currentHp}/${p.maxHp}`)}
    else if(id===265){const r=rollExprDetailed('D12');c.pendingHeroDamage.amount+=r.total;combatSetRoll(`${card.name} · D12`,r.total,`D12 = ${r.total}`,`Текущий урон ${c.pendingHeroDamage.amount}`)}
    else if([197,268,193,326,330].includes(id)){const die=id===197||id===193?'D6':id===268?'D8':id===326?'D12':'2D8',hr=rollHealing(p,die),before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;combatEnemyHealFromHeroHealing(restored);combatSetRoll(`${card.name} · ${hr.used}`,hr.total,`${hr.used} = ${hr.total}`,`Восстановлено ${restored} ЗД · ЗД ${p.currentHp}/${p.maxHp}`);combatPush(`${card.name}: восстановлено ${restored} ЗД.`)}
    else if(id===248){const d=rand(20),wis=effectiveStat(p,'wis'),tot=d+wis,natural=d===20?20:d===1?1:null,ok=d===20?true:d===1?false:tot>=10;combatSetRoll(`${card.name} · МУД 10+`,d,`${d} ${signed(wis)} = ${tot}`,ok?'Успех':'Провал',natural);announceCheck(card.name,d,'МУД',wis,tot,10,ok,natural);if(ok){const st=p.statuses[0];if(st)removeStatus(p,st)}}
    else if(id===166){c.attackRoll.bonus+=3;c.attackRoll.total+=3;combatSetRoll(`${card.name} · +3`,c.attackRoll.chosen,`${c.attackRoll.chosen} ${signed(c.attackRoll.bonus)} = ${c.attackRoll.total}`,`против ЗЩ ${c.attackRoll.target}`,c.attackRoll.natural)}
    else if(id===244){c.attackRoll.bonus+=5;c.attackRoll.total+=5;combatSetRoll(`${card.name} · +5`,c.attackRoll.chosen,`${c.attackRoll.chosen} ${signed(c.attackRoll.bonus)} = ${c.attackRoll.total}`,`против ЗЩ ${c.attackRoll.target}`,c.attackRoll.chosen)}
    else if(id===147){if(c.attackRoll.chosen<2||c.attackRoll.chosen>5){alert('Рапира позволяет переброс только при результате 2–5.');return}combatRerollHeroAttack(card.name)}
    else if(id===153){combatRerollHeroAttack(card.name)}
    else if(id===194){combatRerollHeroAttack(card.name);useMark(p,id,['location','ownTerritory'])}
    else if(id===173){c.heroAdvantage++;c.afterEnemyMiss=false}
    else if(id===225){const st=c.lastAppliedHeroStatus;if(st&&['Яд','Кровотечение','Горение'].includes(st)){removeStatus(p,st);c.lastAppliedHeroStatus=null}else{alert('Облачение Феникса может игнорировать только Яд, Кровотечение или Горение.');return}}
    else if([168,245].includes(id)){const st=c.lastAppliedHeroStatus;if(id===168&&!['Яд','Кровотечение'].includes(st)){alert('Кольцо чистой крови работает только против Яда или Кровотечения.');return}const dc=id===168?10:12,d=rand(20),wis=effectiveStat(p,'wis'),tot=d+wis,natural=d===20?20:d===1?1:null,ok=d===20?true:d===1?false:tot>=dc;combatSetRoll(`${card.name} · МУД ${dc}+`,d,`${d} ${signed(wis)} = ${tot}`,ok?'Успех':'Провал',natural);announceCheck(card.name,d,'МУД',wis,tot,dc,ok,natural);if(ok){removeStatus(p,st);c.lastAppliedHeroStatus=null;combatPush(`${card.name}: эффект «${st}» предотвращён.`)}}
    else if(id===223){const choice=prompt('Живая руна героя: введите 1 — +2 к атаке, 2 — после боя восстановить D6 ЗД','1');if(choice==='1')c.livingRune='attack2';else if(choice==='2')c.livingRune='healAfter';else return;combatPush(`Живая руна героя: выбран эффект ${choice==='1'?'+2 к атаке':'лечение D6 после боя'}.`)}
    combatMarkUsed(`item:${id}`);combatPush(`${p.name} использует «${card.name}».`);renderCharacterSheet('overview');renderCombat();updateUI();
  }
  function combatClassAbilityAvailable(p){const c=state.combat;if(!c||c.heroAbilityUsed||c.heroAbilityLocked)return false;if(p.id==='warrior'||p.id==='dwarf')return c.phase==='enemy_damage'&&!!c.pendingEnemyDamage;if(p.id==='mage')return ['hero_turn','post_damage'].includes(c.phase)&&p.currentHp<p.maxHp;if(p.id==='archer')return c.phase==='hero_turn';if(p.id==='rogue')return ['hero_turn','enemy_ready'].includes(c.phase);return false}
  function combatReactionList(){const c=state.combat,p=currentPlayer();if(!c||playerHardMode(p))return[];const out=[];if(combatClassAbilityAvailable(p))out.push({label:`${HERO_COMBAT[p.id].ability} · ${HERO_COMBAT[p.id].effect}`,fn:useHeroCombatAbility});const shadow=setBonusActionInfo(p,'Тени');if(shadow.supported&&shadow.enabled)out.push({label:'Полный сет Тени: заставить врага перебросить успешную атаку',fn:()=>useSetBonus(p,'Тени')});for(const {slot,id} of equippedEntries(p)){const card=itemCard(id),info=supportedCombatEffect(p,card,{where:'equipment',slot});if(info.supported&&info.enabled)out.push({label:`${card.name}: ${card.fields?.['Эффект']||''}`,fn:()=>applyCombatItemEffect(p,id,{where:'equipment',slot})})}return out}
  function combatAbilityButtonHtml(p){const h=HERO_COMBAT[p.id],used=state.combat?.heroAbilityUsed,available=combatClassAbilityAvailable(p);return h?`<button id="combatHeroAbility" class="secondary" ${(used||!available)?'disabled':''} title="${used?'Способность уже использована в этом бою.':available?'':'Сейчас способность применить нельзя.'}">Способность: ${h.ability}</button>`:''}
  function enemyRankClass(e){const r=String(e?.fields?.['Ранг']||'').toLowerCase();if(r.includes('слаб'))return 'rank-weak';if(r.includes('обыч'))return 'rank-normal';if(r.includes('силь'))return 'rank-strong';if(r.includes('элит'))return 'rank-elite';return ''}
  function combatHeroRulesHtml(p){const h=HERO_COMBAT[p.id];if(!h)return '';const nat=h.natural20||'—',parts=nat.split(' — ');return `<div class="combat-hero-rules"><div><small>СПОСОБНОСТЬ ГЕРОЯ</small><b>${h.ability}</b><span>${h.effect}</span></div><div><small>НАТУРАЛЬНАЯ 20</small><b>${parts[0]||'Эффект героя'}</b><span>${parts.length>1?parts.slice(1).join(' — '):nat}</span></div></div>`}
  function combatActiveEffectsHtml(c,p){
    const rows=[];const add=(label,desc,tone='positive')=>{if(label||desc)rows.push({label:label||'Эффект',desc,tone})};
    for(const st of p.statuses||[])add('Негативный эффект',statusLabel(p,st),'negative');
    for(const e of p.temporaryEffects||[])add(e.label||'Эффект',`${e.amount?`${signed(e.amount)} ${BONUS_KEYS[e.key]||e.key}`:''}${e.turnsRemaining!=null?` · осталось ${e.turnsRemaining} х.`:''}`,'positive');
    for(const e of c.pendingStartEffects||[]){const neg=['nextBattleDisadvantage','nextBattleAbilityLocked','nextEnemyHitBonus'].includes(e.type);let d=e.type==='nextBattleAttack'?`+${e.amount||2} к атаке`:e.type==='nextBattleAdvantage'?'преимущество':e.type==='nextBattleAllAdvantage'?'все атаки героя с преимуществом':e.type==='nextBattleDefense'?`+${e.amount||0} ЗЩ`:e.type==='nextBattleHeroDamageMultiplier'?`урон атак героя ×${e.amount||2}`:e.type==='nextBattleFirstDamageMultiplier'?`первый урон героя ×${e.amount||2}`:e.type==='nextBattleIncomingHalf'?'получаемый урон вдвое меньше':e.type==='nextBattleEnemyDisadvantageAll'?'все атаки врага с помехой':e.type==='nextBattleDisadvantage'?'следующая атака героя с помехой':e.type==='nextBattleAbilityLocked'?'классовая способность недоступна':e.type==='nextEnemyHitBonus'?`следующая атака врага +${e.amount||2} урона`:'';if(d)add(e.label||'Эффект',`${d} · при вступлении в бой`,neg?'negative':'positive')}
    for(const b of c.buffs||[])if(b.remaining>0)add(b.label||'Боевой эффект',`${b.type==='attack'?`+${b.amount||0} к атаке`:b.type==='advantage'?'преимущество':b.type==='defense'?`+${b.amount||0} ЗЩ`:b.type==='lightDamage'?'+D4 урона':'эффект'} · осталось ${b.remaining}`);
    if(c.freeEscape)add(c.freeEscapeLabel||'Разлом пути','побег без проверки');
    if(c.heroAllAdvantage)add(c.heroAllAdvantageLabel||'Молитва истинного удара','все атаки героя с преимуществом');
    if(c.battleDefenseBonus>0)add(c.battleDefenseLabel||'Покров Стража',`+${c.battleDefenseBonus} ЗЩ`);
    if(c.heroDamageMultiplier>1)add(c.heroDamageMultiplierLabel||'Печать возмездия',`урон атак героя ×${c.heroDamageMultiplier}`);
    if(c.firstHeroDamageMultiplier>1)add(c.firstHeroDamageMultiplierLabel||'Чёрная игла',`первый урон героя ×${c.firstHeroDamageMultiplier}`);
    if(c.heroIncomingHalf)add(c.heroIncomingHalfLabel||'Железная молитва','получаемый урон уменьшается вдвое');
    if(c.enemyAllDisadvantage)add(c.enemyAllDisadvantageLabel||'Морок Сердца','все атаки врага с помехой');
    if(c.heroAbilityLocked)add(c.heroAbilityLockedLabel||'Ловушка безмолвия','классовая способность недоступна','negative');
    if(c.nextEnemyHitBonus>0)add(c.nextEnemyHitBonusLabel||'Зеркальный шип',`следующая успешная атака врага +${c.nextEnemyHitBonus} урона`,'negative');
    if(c.heroDisadvantage>0)add(c.heroDisadvantageLabel||'Помеха','следующая атака героя с помехой','negative');
    if(!rows.length)return '';
    return `<div class="combat-active-effects"><b>Активные эффекты:</b><div class="combat-active-effect-list">${rows.map(x=>`<span class="combat-effect-chip ${x.tone}"><b>${x.label}:</b> ${x.desc}</span>`).join('')}</div></div>`;
  }
  function renderCombat(force=false){
    const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c||!e)return;syncLocalCombatWindowState();if(combatWindowHidden&&!force){updateCombatRestoreButton();return}if(force)combatWindowHidden=false;updateCombatRestoreButton();
    document.body.classList.add('combat-active');els.modalClose.style.display='none';const localCombatant=localControlsCombat(),lr=c.lastRoll||{title:'Бой начался',main:'—',math:'',detail:''};const natClass=Number(lr.natural)===20?'natural20':Number(lr.natural)===1?'natural1':'';const attackOutcome=combatRollOutcome(),outcomeHtml=attackOutcome==null?'':`<div class="combat-roll-outcome ${attackOutcome?'hit':'miss'}">${attackOutcome?'ПОПАДАНИЕ':'ПРОМАХ'}</div>`;const reactions=localCombatant?combatReactionList():[];let phaseHtml='',actions='';
    if(localCombatant){
      if(c.phase==='pre')actions=`<button id="combatFight" class="success">Вступить в бой</button><button id="combatEscapeBefore" class="secondary">${c.freeEscape?'Сбежать':'Попытаться сбежать · ЛОВ 13+'}</button>`;
      else if(c.phase==='hero_turn')actions=`<button id="combatAttack" class="success">Атаковать</button><button id="combatEscape" class="secondary">${c.freeEscape?'Сбежать':'Сбежать · ЛОВ 15+'}</button>${combatAbilityButtonHtml(p)}`;
      else if(c.phase==='hero_roll')actions=`<button id="combatFinalizeAttack" class="success">Завершить бросок атаки</button>${combatAbilityButtonHtml(p)}`;
      else if(c.phase==='mage_nat20')actions=`<button id="mageLightning" class="success">Молния · +D8 и Оглушение</button><button id="mageFire" class="danger">Огонь · +D8 и Горение</button>`;
      else if(c.phase==='hero_damage')actions=`<button id="combatApplyHeroDamage" class="success">Нанести урон (${c.pendingHeroDamage?.amount||0})</button>${combatAbilityButtonHtml(p)}`;
      else if(c.phase==='enemy_ready')actions=`<button id="combatEnemyTurn" class="danger">Бросок атаки врага</button>${combatAbilityButtonHtml(p)}`;
      else if(c.phase==='enemy_roll')actions=`<button id="combatFinalizeEnemyRoll" class="danger">${combatEnemyAttackHits(c)?'Продолжить атаку врага':'Завершить атаку врага'}</button>`;
      else if(c.phase==='enemy_damage')actions=`<button id="combatAcceptDamage" class="danger">Принять урон (${c.pendingEnemyDamage?.amount||0})</button>${combatAbilityButtonHtml(p)}`;
      else if(c.phase==='post_damage')actions=`<button id="combatContinueAfterDamage" class="success">Продолжить бой</button>${combatAbilityButtonHtml(p)}`;
      else if(c.phase==='enemy_miss')actions=`<button id="combatContinueMiss" class="success">Продолжить бой</button>`;
      else if(c.phase==='escape_result')actions=`<button id="combatResolveEscape" class="success">Продолжить</button>`;
      else if(c.phase==='cleanse_choice')actions=(c.pendingCleanse?.options||[]).map((st,i)=>`<button data-cleanse-status="${i}" class="success">Снять: ${st}</button>`).join('');
      else if(c.phase==='victory'&&c.isBoss)actions=`<button id="combatFinishVictory" class="success">Завершить партию</button>`;
      else if(c.phase==='victory')actions=`<button id="combatPostVictory" class="success">Продолжить после победы</button>`;
      if(c.phase==='hero_damage')phaseHtml=`<div class="combat-pending damage-out"><b>Урон готов:</b> <b class="big">${c.pendingHeroDamage?.amount||0}</b>. До нажатия «Нанести урон» можно применить подходящие эффекты.</div>`;
      if(c.phase==='enemy_damage')phaseHtml=`<div class="combat-pending"><b>Входящий урон:</b> <b class="big">${c.pendingEnemyDamage?.amount||0}</b>. Игрок сам решает, тратить ли защитные эффекты.</div>`;
      if(c.phase==='post_damage')phaseHtml=`<div class="combat-pending post-damage"><b>Урон принят.</b> Герой выжил. Сейчас доступны эффекты лечения; после этого нажмите «Продолжить бой».</div>`;
    }
    const mode=playerHardMode(p)?'Сложный режим · реакции скрыты':'Обычный режим · реакции включены';
    const guide=localCombatant&&!playerHardMode(p)?`<div class="combat-effects-manual"><h4>Памятка боя</h4><div class="combat-note">Активные способности, предметы и наёмники применяет игрок. Натуральные 1 и 20 автоматические только при одиночном D20. Лечение доступно до атаки в свой боевой ход и после принятого нелетального урона.</div></div>`:'';
    const history=c.journalOpen?`<div class="combat-history-wrap"><div class="combat-history">${(c.history||[]).map(x=>`<div>${x}</div>`).join('')||'<div>Записей пока нет.</div>'}</div></div>`:'';
    const controlBlock=localCombatant?`${reactions.length?`<div class="combat-reactions"><h4>РЕАКЦИИ — игра напоминает, но решение за игроком</h4><div class="combat-reaction-buttons">${reactions.map((r,i)=>`<button data-reaction="${i}" class="secondary">${r.label}</button>`).join('')}</div></div>`:''}<div class="combat-actions">${actions}</div><div class="combat-sheet-actions"><button id="combatHeroSheet" class="secondary">Герой</button><button id="combatInventory" class="secondary">Инвентарь</button></div>${guide}`:'';
    els.modalContent.innerHTML=`<div class="combat-shell ${localCombatant?'combat-owner-view':'combat-observer-view'}"><div class="combat-summary"><span class="combat-mode-badge">${localCombatant?mode:'НАБЛЮДЕНИЕ ЗА БОЕМ'}</span><span class="combat-pill">Раунд ${c.round}</span><span class="combat-pill">${c.heroWasFirst?'Герой начал бой':'Враг начал бой'}</span><button id="combatHide" class="combat-hide ghost" type="button">Скрыть бой</button></div><div class="combat-head"><div class="combatant hero"><h3 style="color:${p.color}">${p.name}</h3><div class="combat-hp">ЗД ${p.currentHp}/${p.maxHp}</div><div class="combat-meta">ЗЩ ${combatEffectiveDefense(p)} · Урон ${currentHeroDamage(p)} · СИЛ ${signed(effectiveStat(p,'str'))} · ЛОВ ${signed(effectiveStat(p,'dex'))} · МУД ${signed(effectiveStat(p,'wis'))} · ХАР ${signed(effectiveStat(p,'cha'))}</div>${combatHeroRulesHtml(p)}${combatActiveEffectsHtml(c,p)}</div><div class="combat-vs">VS</div><div class="combatant enemy ${enemyRankClass(e)}">${c.elite?'<div class="elite-danger-badge">ЭЛИТНАЯ ОПАСНОСТЬ · АТАКУЕТ ПЕРВОЙ</div>':''}<h3>${e.name}</h3><div class="combat-hp">ЗД ${Math.max(0,c.enemyHp)}/${c.enemyMaxHp}</div><div class="combat-meta">Ранг: ${e.fields?.['Ранг']||'—'}<br>ЗЩ ${e.fields?.['ЗЩ']} · АТК ${e.fields?.['АТК']} · Урон ${e.fields?.['Урон']}<br>${e.fields?.['Тип']||''}<br>Эффект: ${e.fields?.['Эффект']||'—'}</div></div></div><div class="combat-dice-stage"><div class="combat-dice-title">${lr.title}</div>${outcomeHtml}<div class="combat-die-main ${natClass}">${lr.main}</div><div class="combat-dice-math">${lr.math||''}</div><div class="combat-dice-detail">${lr.detail||''}</div></div>${phaseHtml}${controlBlock}<div class="combat-journal-control"><button id="combatJournalToggle" class="${c.journalOpen?'secondary active':'ghost'}">Журнал боя${c.journalOpen?' ▲':' ▼'}</button></div>${history}</div>`;els.modal.hidden=false;
    if(localCombatant){reactions.forEach((r,i)=>{const b=els.modalContent.querySelector(`[data-reaction="${i}"]`);if(b)b.onclick=r.fn});els.modalContent.querySelectorAll('[data-cleanse-status]').forEach(b=>b.onclick=()=>chooseCombatCleanseStatus((c.pendingCleanse?.options||[])[Number(b.dataset.cleanseStatus)]))}
    const bind=(id,fn)=>{const x=document.getElementById(id);if(x)x.onclick=fn};if(localCombatant){bind('combatFight',combatFight);bind('combatResolveEscape',resolveCombatEscapeResult);bind('combatEscapeBefore',combatEscapeBefore);bind('combatAttack',combatHeroAttack);bind('combatEscape',combatEscapeDuring);bind('combatHeroAbility',useHeroCombatAbility);bind('combatFinalizeAttack',finalizeHeroAttackRoll);bind('mageLightning',()=>chooseMageNat20('lightning'));bind('mageFire',()=>chooseMageNat20('fire'));bind('combatApplyHeroDamage',applyHeroDamageNow);bind('combatEnemyTurn',combatEnemyTurn);bind('combatFinalizeEnemyRoll',finalizeEnemyAttackRoll);bind('combatAcceptDamage',()=>{const after=c.pendingEnemyDamage?.after;acceptEnemyDamage();if(after&&state.combat)after()});bind('combatContinueMiss',combatContinueAfterEnemyMiss);bind('combatContinueAfterDamage',combatContinueAfterDamage);bind('combatFinishVictory',finishCombatVictory);bind('combatPostVictory',showPostCombatTerritoryPrompt);bind('combatHeroSheet',()=>openCharacterSheet('overview'));bind('combatInventory',()=>openCharacterSheet('inventory'))}
    bind('combatHide',hideCombatWindow);bind('combatJournalToggle',()=>{c.journalOpen=!c.journalOpen;renderCombat(true)});if(localCombatant&&!els.sheetDrawer.hidden&&sheetView.playerId===p.id)renderCharacterSheet(sheetView.mode,sheetView.bonusKey);
  }
  function combatTickBuffsAtHeroAttack(){const c=state.combat;if(!c)return;for(const b of c.buffs||[])if(['attack','lightDamage','advantage'].includes(b.type)&&b.remaining>0)b.remaining--;c.buffs=(c.buffs||[]).filter(b=>b.remaining>0)}
  function combatTickBuffsAtEnemyTurn(){const c=state.combat;if(!c)return;for(const b of c.buffs||[])if(b.type==='defense'&&b.remaining>0)b.remaining--;c.buffs=(c.buffs||[]).filter(b=>b.remaining>0)}


  function updateActionPanel(){
    if(!state.started){renderTurnOrderBanner();return}const p=currentPlayer();renderTurnOrderBanner();els.actionPanel.innerHTML='';
    if(state.gameOver){const winner=getPlayer(state.gameOver.winnerId)||p;addActionBox('Партия завершена',`<b>${winner.name}</b> победил Владыку Сердца Тьмы. Дальнейшие ходы заблокированы.`,[{label:'Показать итог партии',className:'success',fn:()=>showGameOverPopup(winner)}]);return}
    if(state.combat){addActionBox('Идёт бой',`Враг: <b>${combatEnemy()?.name||'—'}</b>. Вернитесь в окно боя для продолжения.`,[{label:'Вернуться в бой',className:'danger',fn:renderCombat},{label:'Герой',className:'secondary',fn:()=>openCharacterSheet('overview')}]);return}
    if(state.portalPending){addActionBox('Древний портал',`Выберите выход прямо на карте. Доступные порталы подсвечены <b>фиолетовой границей</b>: ${state.portalPending.destinations.join(', ')}.`,[]);return}
    if(state.tributeConsentPending){const req=state.tributeConsentPending,owner=getPlayer(req.ownerId),visitor=getPlayer(req.visitorId),mine=!onlineLocalHeroId||onlineLocalHeroId===req.ownerId;if(mine)addActionBox('Запрос на бесплатный проход',`<b>${visitor?.name||'Игрок'}</b> просит пройти бесплатно по территории <b>${req.hex}</b>. Решение принимает ${owner?.name||'владелец'}.`,[{label:'Разрешить проход',className:'success',fn:()=>resolvePassagePermission(true)},{label:'Отказать',className:'danger',fn:()=>resolvePassagePermission(false)}]);else addActionBox('Ожидание владельца территории',`Запрос отправлен игроку <b>${owner?.name||'владелец'}</b>. Пока он не ответит, движение приостановлено.`,[]);return}
    if(p.pendingItems?.length){addActionBox('Нужно разобрать тайники',`У героя осталось неразобранных предметов: ${p.pendingItems.length}. Пока каждый из них не будет надет, помещён в рюкзак или сброшен, продолжать ход нельзя.`,[{label:'Разобрать тайники',className:'primary',fn:()=>openCharacterSheet('pending')}]);return}
    if(p.inDungeon){if(dungeonExitAvailable(p))showDungeonActions(p);else showDungeonWaiting(p);return}
    if(state.movePending){
      // На специальных гексах нет кнопки «Исследовать», поэтому само игровое действие
      // подтверждает выбранный маршрут: посещение локации, портал или взаимодействие
      // с чужой территорией. Это сохраняет защиту от случайного клика без лишней
      // кнопки «Подтвердить перемещение».
      if(p.hex===MAP.bossHex){
        addActionBox('Финальный босс',`Герой достиг клетки босса <b>${MAP.bossHex}</b>. Никакие карты из колоды «Исследования Сердца тьмы» здесь не тянутся. После подтверждения сразу начинается бой с <b>Владыкой Сердца Тьмы</b>.`,[
          {label:'Вступить в бой с боссом',className:'danger',fn:()=>commitPendingMove()}
        ]);
        return;
      }
      const previewTerritory=state.territories[p.hex];
      if(previewTerritory&&previewTerritory.owner!==p.id){
        const owner=getPlayer(previewTerritory.owner),tribute=tributeCostFor(p.hex),full=territoryFullCost(p.hex);
        addActionBox('Чужая территория',`${p.hex} принадлежит игроку <b>${owner?.name||'—'}</b>. Вы можете выбрать этот гекс конечной точкой. При подтверждении перехода появятся варианты: заплатить дань, попытаться избежать её, захватить территорию или попросить бесплатный проход. Дань: <b>${tribute} золота</b>${fullAreaForTerritory(p.hex)?' (гекс входит в область владельца)':''}.`,[
          {label:'Войти на территорию',className:'primary',fn:()=>commitPendingMove()}
        ]);
        return;
      }

      const previewLoc=state.locations[p.hex];
      if(previewLoc&&!locationVisibleToPlayer(p,p.hex)){
        addActionBox('Неизвестный гекс','В сложном режиме содержимое этого гекса пока скрыто. Вход зафиксирует маршрут и откроет то, что здесь находится.',[{label:'Войти на гекс',className:'primary',fn:()=>commitPendingMove()}]);
        return;
      }
      if(previewLoc){
        if(previewLoc.name==='Древний портал'){
          addActionBox('Древний портал',`Маршрут ведёт на портал ${p.hex}. Вход в портал зафиксирует перемещение и активирует сеть порталов.`,[{label:'Войти в портал',className:'primary',fn:()=>commitPendingMove()}]);
        }else{
          const ready=canActivateLocationOnEntry(p,p.hex);
          addActionBox('Постоянная локация',`На выбранном гексе находится: <b>${previewLoc.name}</b>.${ready?' Посещение зафиксирует выбранный маршрут.':' Повторный эффект этой локации пока недоступен.'}`,ready?[{label:'Посетить локацию',className:'primary',fn:()=>commitPendingMove({type:'visitLocation',hex:p.hex})}]:[]);
        }
      }

      const previewOthers=state.players.filter(q=>q.id!==p.id&&q.hex===p.hex);
      if(previewOthers.length&&!previewLoc){
        addActionBox('Торговля между игроками',`На выбранном гексе находится другой герой. Начало торговли зафиксирует выбранный маршрут.`,[{label:'Начать торговлю',className:'primary',fn:()=>commitPendingMove({type:'trade'})}]);
      }
    }
    if(p.hex===MAP.bossHex&&!state.cleaned[p.hex]&&!state.combat){
      addActionBox('Финальный босс',`На клетке <b>${MAP.bossHex}</b> обычного исследования нет. Герой сразу сражается с <b>Владыкой Сердца Тьмы</b>; карты колоды СТ здесь не вытягиваются.`,[
        {label:'Вступить в бой с боссом',className:'danger',fn:()=>startBossBattle(p)}
      ]);
      return;
    }
    const foreign=state.foreignTerritoryPending;
    if(foreign&&foreign.heroId===p.id&&foreign.hex===p.hex){
      const owner=getPlayer(foreign.ownerId),tribute=tributeCostFor(foreign.hex),full=territoryFullCost(foreign.hex),transit=!!foreign.transitKey;
      addActionBox('Чужая территория',`${foreign.hex} принадлежит игроку <b>${owner?.name||'—'}</b>. ${transit?'После решения выбранный маршрут продолжится автоматически.':'Перед дальнейшими действиями нужно решить вопрос прохода.'} Дань: <b>${tribute} золота</b>${fullAreaForTerritory(foreign.hex)?' (территория входит в область владельца)':''}.`,[
        {label:`Заплатить дань ${tribute}`,className:'secondary',fn:payTributeNow},
        {label:'Попытаться избежать дани · ХАР 12+',className:'primary',fn:attemptAvoidTribute},
        {label:`Попытаться захватить · ХАР 15+ (${full} зол.)`,className:'danger',fn:attemptCaptureTerritory},
        {label:'Попросить пройти бесплатно',className:'success',fn:requestPassagePermission}
      ]);
    }
    const sameHexHeroes=state.players.filter(q=>q.id!==p.id&&q.hex===p.hex);if(sameHexHeroes.length&&!state.foreignTerritoryPending)addActionBox('Торговля между игроками',`На гексе вместе с ${p.name} находится: <b>${sameHexHeroes.map(q=>q.name).join(', ')}</b>. Пока герои остаются на одном гексе, торговля доступна в ход любого из них.`,[{label:'Начать торговлю',className:'primary',fn:()=>openTrade(p,true)}]);
    if(foreign&&foreign.heroId===p.id&&foreign.hex===p.hex)return;
    const build=canBuildAt(p);
    if(build.ok&&!state.turnLocked){addActionBox('Строительство',`Очищенный гекс ${p.hex}. Стоимость: ${build.cost} золота.`,[{label:`Построить за ${build.cost}`,className:'success',fn:buildTerritory}])}
    else if(!state.turnLocked&&state.cleaned[p.hex]&&!state.territories[p.hex]&&MAP.hexes[p.hex]&&['kingdom','cursed'].includes(MAP.hexes[p.hex].region)){addActionBox('Строительство недоступно',build.why,[])}
    const candidates=areaCandidates(p);if(candidates.length&&!state.turnLocked){addActionBox('Область',`Можно объединить 3 свободные территории в область.`,candidates.slice(0,8).map(c=>({label:c.join(' + '),className:'secondary',fn:()=>createArea(c)})))}
    if(canExploreHere(p)){addActionBox(state.cleaned[p.hex]?'Повторное исследование':'Исследование',`${state.cleaned[p.hex]?'Очищенный гекс можно исследовать заново или построить территорию.':'Гекс '+p.hex+'. Выбери колоду исследования.'}`,exploreActions(p).map(a=>({label:a.label,className:'primary',fn:()=>beginExplore(a.key)})))}
    if(state.locations[p.hex]&&state.turnMoved&&!state.movePending){
      const loc=state.locations[p.hex];
      const actions=[];
      const canUseNow=loc.name!=='Древний портал'&&state.locationActivationHex===p.hex;
      if(canUseNow)actions.push({label:'Посетить локацию',className:'primary',fn:()=>{state.locationUsedThisTurn=true;state.locationActivationHex=null;visitLocation(p.hex,()=>{updateUI();renderBoard()},{player:p,handoff:true})}});
      let note='';
      if(loc.name==='Древний портал')note=' Портал активируется при остановке на его гексе.';
      else if(canUseNow)note=' Вы только что вошли на гекс и можете воспользоваться локацией.';
      else note=' Нового посещения нет. Чтобы воспользоваться этой же локацией снова, нужно покинуть её, завершить хотя бы один последующий ход вне этого гекса и затем войти снова.';
      addActionBox('Постоянная локация',`На этом гексе находится: ${loc.name}.${note}`,actions)
    }
  }
  function addActionBox(title,text,actions){const box=document.createElement('div');box.className='action-box';box.innerHTML=`<div class="action-title">${title}</div><div class="muted small">${text}</div><div class="action-buttons"></div>`;const bxs=box.querySelector('.action-buttons');actions.forEach(a=>{const b=document.createElement('button');b.textContent=a.label;b.className=a.className||'';b.onclick=a.fn;bxs.appendChild(b)});els.actionPanel.appendChild(box)}

  function currentHexNeedsResolution(p){
    if(!state.turnMoved||p.inDungeon)return false;
    if(p.hex===MAP.startHex)return false;
    if(p.hex===MAP.bossHex)return !state.cleaned[p.hex];
    if(state.locations[p.hex]||state.territories[p.hex]||state.cleaned[p.hex])return false;
    return true;
  }

  function applyEndTurnPeriodicEffects(p){
    ensurePlayerModel(p);let died=false;for(const st of ['Яд','Горение']){let n=p.statusTimers?.[st]||0;if(!p.statuses.includes(st)||n<=0)continue;if(st==='Горение'&&p.statusTickedTurn?.[st]===p.personalTurn)continue;recordDamageTaken(p,2);p.currentHp-=2;n--;p.statusTimers[st]=n;log(`${p.name}: в конце хода «${st}» наносит <b>2 урона</b>. Осталось ЗД ${Math.max(0,p.currentHp)}/${p.maxHp}; длительность ${n}.`);if(n<=0)removeStatus(p,st);if(p.currentHp<=0){handleDeath(p);died=true;break}}return died
  }

  function advanceTurnState(p,reason=''){
    if(!p||!state.started||state.gameOver)return;if(state.dungeonEntryNotice?.heroId===p.id)state.dungeonEntryNotice=null;
    if(applyEndTurnPeriodicEffects(p))return;tickTurnEffects(p);refreshLocationRevisitsAtEndTurn(p);refreshAreaVisitsAtEndTurn(p);p.personalTurn++;
    state.currentIndex++;if(state.currentIndex>=state.order.length){state.currentIndex=0;state.round++;log(`<b>Раунд ${state.round}</b>.`,null)}
    state.rolled=false;state.die=null;state.movePoints=0;state.reachable=[];state.chosenPath=null;state.chosenMovePlan=null;state.turnMoved=false;state.movePending=false;state.moveOriginHex=null;state.moveTransit=null;state.pendingMoveAction=null;state.turnLocked=false;state.exploration=null;state.locationUsedThisTurn=false;state.locationActivationHex=null;state.clearedThisTurnHex=null;state.foreignTerritoryPending=null;state.tributeConsentPending=null;state.tradeOpportunity=null;state.inspectPlayerId=null;state.mapHighlight=null;
    if(reason)log(`<b>${p.name}: ход завершён автоматически</b> — ${reason}. Следующий: <b>${currentPlayer()?.name||'—'}</b>.`);
    updateUI();renderBoard();
  }
  function advanceTurnWithSideInteraction(p,type,reason,participantIds=[p?.id].filter(Boolean)){beginSideInteraction(p,type,participantIds);advanceTurnState(p,reason)}

  function endTurn(force=false){
    if(!state.started||state.gameOver)return;const p=currentPlayer();if(state.turnLocked&&!force)return;
    if(!force&&state.movePending){commitPendingMove({type:'endTurn'});return;}
    if(!force&&p.pendingItems?.length){openCharacterSheet('pending');alert('Сначала разберите все неразобранные тайники.');return}
    if(!force&&state.foreignTerritoryPending?.heroId===p.id){alert('Сначала разрешите взаимодействие с чужой территорией: дань, избегание дани, разрешение на проход или захват.');return}
    if(!force&&currentHexNeedsResolution(p)){alert(`Сначала исследуйте гекс ${p.hex}. На неисследованном гексе завершить ход нельзя.`);return}
    if(!force&&!state.rolled&&!state.turnMoved&&!p.inDungeon){if(!confirm('Вы точно хотите завершить ход, не бросая кубик движения?'))return}
    advanceTurnState(p);closeCharacterSheet();
  }

  function renderTurnOrderBanner(){
    if(!els.turnOrderBanner)return;
    if(!state.started||!state.order?.length){els.turnOrderBanner.hidden=true;return}
    const active=currentPlayer(),rot=[];for(let n=1;n<state.order.length;n++)rot.push(getPlayer(state.order[(state.currentIndex+n)%state.order.length]));
    els.turnOrderBanner.hidden=false;
    const roomCode=els.turnOrderBanner.dataset.roomCode||'';els.turnOrderBanner.innerHTML=`<div class="turn-order-active"><small>СЕЙЧАС ХОДИТ</small><strong>${String(active?.name||'—').toUpperCase()}</strong></div><div class="turn-order-next"><small>ДАЛЬШЕ</small><span>${rot.map(q=>q?.name||'—').join(' → ')}</span></div>${roomCode?`<div class="turn-order-code">КОД ${roomCode}</div>`:''}<button class="turn-order-journal" type="button">Журнал</button>`;const journal=els.turnOrderBanner.querySelector('.turn-order-journal');if(journal)journal.onclick=()=>{renderJournal();els.journalOverlay.hidden=false};
  }

  function updateUI(){
    syncLocalCombatWindowState();document.body.classList.toggle('combat-active',!!state.combat);
    if(!state.started){renderTurnOrderBanner();return}const p=currentPlayer();renderTurnOrderBanner();
    ensurePlayerModel(p);els.turnCard.innerHTML=`<div class="turn-name" style="color:${p.color}">${p.name}</div><div>Личный ход: <b>${p.personalTurn}</b> · Раунд: <b>${state.round}</b></div><div>Позиция: <b>${p.hex}</b></div><div class="turn-meta">${regionName(MAP.hexes[p.hex].region)}</div><div class="statline"><span class="pill">ЗД ${p.currentHp}/${p.maxHp}</span><span class="pill">${statDisplay(p,'defense')}</span><span class="pill">Урон ${currentHeroDamage(p)}</span><span class="pill">${statDisplay(p,'str')}</span><span class="pill">${statDisplay(p,'dex')}</span><span class="pill">${statDisplay(p,'wis')}</span><span class="pill">${statDisplay(p,'cha')}</span><span class="pill">Золото ${p.gold}</span><button class="pill map-highlight-trigger" data-map-highlight="territories">Территории ${Object.values(state.territories).filter(t=>t.owner===p.id).length}</button><button class="pill map-highlight-trigger" data-map-highlight="areas">Области ${state.areas.filter(a=>a.owner===p.id).length}</button></div>${p.statuses.length?`<div class="turn-meta">Эффекты: ${statusSummary(p)}</div>`:''}${activeEffectRows(p).filter(x=>x.kind!=='Негативный эффект').length?`<div class="turn-meta">Активно: ${activeEffectRows(p).filter(x=>x.kind!=='Негативный эффект').map(x=>x.label).join(' · ')}</div>`:''}${p.inDungeon?'<div class="error"><b>Герой в Темнице.</b></div>':''}`;els.turnCard.querySelectorAll('[data-bonus-key]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openCharacterSheet('overview',b.dataset.bonusKey)}));els.turnCard.querySelectorAll('[data-map-highlight]').forEach(b=>{const type=b.dataset.mapHighlight;const set=()=>{state.mapHighlight={type,playerId:p.id};renderBoard()};const clear=()=>{if(state.mapHighlight?.type===type&&state.mapHighlight?.playerId===p.id){state.mapHighlight=null;renderBoard()}};b.addEventListener('mouseenter',set);b.addEventListener('mouseleave',clear);b.addEventListener('click',e=>{e.stopPropagation();if(state.mapHighlight?.type===type&&state.mapHighlight?.playerId===p.id)state.mapHighlight=null;else state.mapHighlight={type,playerId:p.id};renderBoard()})});
    els.diceResult.textContent=state.die??'—';els.moveRollBtn.disabled=!!state.gameOver||state.rolled||p.inDungeon||state.turnLocked||p.pendingItems.length>0||!!state.combat;const unresolvedHex=currentHexNeedsResolution(p);els.endTurnBtn.disabled=!!state.gameOver||!!state.combat||state.turnLocked||(p.inDungeon&&dungeonExitAvailable(p))||p.pendingItems.length>0||unresolvedHex||state.foreignTerritoryPending?.heroId===p.id||!!state.tributeConsentPending;
    els.moveHint.hidden=false;
    if(state.gameOver)els.moveHint.textContent='Партия завершена: Владыка Сердца Тьмы побеждён.';else if(state.foreignTerritoryPending?.heroId===p.id)els.moveHint.textContent=state.foreignTerritoryPending.transitKey?'Маршрут проходит через чужую территорию. Выберите: дань, избегание, захват или просьбу пройти бесплатно — после решения движение продолжится.':'Вы на чужой территории. Выберите: дань, избегание, захват или просьбу пройти бесплатно.';else if(p.pendingItems.length)els.moveHint.textContent=`Сначала разберите все неразобранные тайники (${p.pendingItems.length}). Движение и завершение хода заблокированы.`;else if(p.inDungeon&&!dungeonExitAvailable(p))els.moveHint.textContent='Герой только что попал в Темницу. Закройте окно попадания в Темницу — ход завершится автоматически.';else if(p.inDungeon)els.moveHint.textContent='Обычное движение недоступно. Выбери характеристику для попытки выхода — это займёт весь ход.';else if(state.movePending){const plan=manualMovePlan(p),route=plan.path.join(' → '),left=Math.max(0,state.movePoints-plan.cost);els.moveHint.textContent=`Маршрут: ${route}. Использовано ${plan.cost}/${state.movePoints}, осталось ${left}. Нажимайте следующий зелёный гекс, чтобы продолжить путь; нажмите уже выбранный гекс, чтобы сократить маршрут. Когда конечная точка выбрана — нажмите «Исследовать» или действие гекса.`;}else if(unresolvedHex)els.moveHint.textContent=`Гекс ${p.hex} ещё не исследован. Завершить ход нельзя — сначала проведите исследование.`;else if(!state.rolled)els.moveHint.textContent='Сначала брось кубик движения. На очищенном гексе можно построить территорию до броска.';else if(state.turnMoved)els.moveHint.textContent=`Перемещение завершено на ${p.hex}. Теперь можно активировать гекс или завершить ход.`;else els.moveHint.textContent=`Постройте путь вручную: нажимайте соседние зелёные гексы по одному. Можно использовать от 1 до ${state.movePoints} единиц движения. Игра не выбирает маршрут автоматически.`;
    els.initiativeList.innerHTML='';updateActionPanel();if(!els.sheetDrawer.hidden&&['overview','inventory'].includes(sheetView.mode))renderCharacterSheet(sheetView.mode,sheetView.bonusKey);maybeShowDungeonEntryNotice();
  }

  function pCurrentHex(){const p=currentPlayer();return p?.hex||null}
  function svgEl(name,attrs={}){const e=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e}
  function getHeroMapColors(heroOrId){const id=typeof heroOrId==='string'?heroOrId:heroOrId?.id;return HERO_MAP_COLORS[id]||{fill:'#8ea0b7',stroke:'#4a5460'}}
  function getLocationMapColors(name){return LOCATION_MAP_COLORS[name]||{fill:'#f3d25c',stroke:'#8f7740'}}
  function hexPolygonPoints(h,r=62){const pts=[];for(let i=0;i<6;i++){const a=i*Math.PI/3;pts.push([h.x+Math.cos(a)*r,h.y+Math.sin(a)*r])}return pts}
  function angleDelta(a,b){let d=Math.abs(a-b)%360;return d>180?360-d:d}
  function areaHasNeighborOnSide(area,hex,normalDeg){const h=MAP.hexes[hex];for(const n of h.neighbors){if(!area.hexes.includes(n))continue;const nh=MAP.hexes[n],ang=(Math.atan2(nh.y-h.y,nh.x-h.x)*180/Math.PI+360)%360;if(angleDelta(ang,normalDeg)<18)return true}return false}
  function drawAreaOutline(area){const owner=getPlayer(area.owner),colors=getHeroMapColors(owner);for(const hex of area.hexes){const h=MAP.hexes[hex];if(!h)continue;const pts=hexPolygonPoints(h,62);for(let i=0;i<6;i++){const normal=(30+i*60)%360;if(areaHasNeighborOnSide(area,hex,normal))continue;const a=pts[i],b=pts[(i+1)%6],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,vx=h.x-mx,vy=h.y-my,len=Math.hypot(vx,vy)||1,shift=4,dx=vx/len*shift,dy=vy/len*shift;els.overlay.appendChild(svgEl('line',{x1:a[0]+dx,y1:a[1]+dy,x2:b[0]+dx,y2:b[1]+dy,class:'area-boundary',stroke:colors.stroke}))}els.overlay.appendChild(svgEl('circle',{cx:h.x+39,cy:h.y+28,r:13,class:'area-number-bg',fill:colors.stroke}));const t=svgEl('text',{x:h.x+39,y:h.y+29,class:'area-number-text'});t.textContent=String(area.ownerAreaNumber||area.id);els.overlay.appendChild(t)}}

  function drawPurpleHexOutline(hex,cls='map-purple-outline',radius=62){const h=MAP.hexes[hex];if(!h)return;els.overlay.appendChild(svgEl('polygon',{points:hexPolygonPoints(h,radius).map(x=>x.join(',')).join(' '),class:cls}))}
  function drawPurpleAreaOutline(area){for(const hex of area.hexes){const h=MAP.hexes[hex];if(!h)continue;const pts=hexPolygonPoints(h,64);for(let i=0;i<6;i++){const normal=(30+i*60)%360;if(areaHasNeighborOnSide(area,hex,normal))continue;const a=pts[i],b=pts[(i+1)%6];els.overlay.appendChild(svgEl('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'map-purple-area'}))}}}
  function mapFocusPlayer(){const local=onlineLocalHeroId?getPlayer(onlineLocalHeroId):null;if(local)return local;return playerHardMode(currentPlayer())?currentPlayer():inspectedPlayer()}
  function centerMapOnPlayer(p,behavior='smooth'){if(!p||!els.boardWrap||!els.mapStage)return;const h=MAP.hexes[p.hex];if(!h)return;requestAnimationFrame(()=>{const sw=els.mapStage.offsetWidth,sh=els.mapStage.offsetHeight;if(!sw||!sh)return;const x=h.x/2481*sw,y=h.y/1754*sh;els.boardWrap.scrollTo({left:Math.max(0,x-els.boardWrap.clientWidth/2),top:Math.max(0,y-els.boardWrap.clientHeight/2),behavior})})}
  function applyMapZoom(recenter=false){if(!els.mapStage)return;const z=Number(state.mapZoom||1);if(isMobileViewport()){const vw=Math.max(320,els.boardWrap?.clientWidth||window.innerWidth||390),base=Math.max(980,Math.min(1420,vw*3));els.mapStage.style.width=`${Math.round(base*z)}px`}else els.mapStage.style.width=`${Math.round(z*100)}%`;if(recenter)centerMapOnPlayer(mapFocusPlayer())}
  function changeMapZoom(delta){state.mapZoom=Math.round(clamp(Number(state.mapZoom||1)+delta,.6,2)*10)/10;applyMapZoom(true)}
  function renderBoard(){
    els.overlay.innerHTML='';if(state.chosenPath&&state.chosenPath.length>1){const pts=state.chosenPath.map(h=>`${MAP.hexes[h].x},${MAP.hexes[h].y}`).join(' ');els.overlay.appendChild(svgEl('polyline',{points:pts,class:'path-line'}))}
    const portalChoices=new Set(state.portalPending?.destinations||[]);
    Object.entries(MAP.hexes).forEach(([id,h])=>{
      if(state.cleaned[id]&&!state.territories[id]&&!state.locations[id]){els.overlay.appendChild(svgEl('circle',{cx:h.x+36,cy:h.y+27,r:13,class:'cleaned-badge'}));const mark=svgEl('text',{x:h.x+36,y:h.y+28,class:'cleaned-check'});mark.textContent='✓';els.overlay.appendChild(mark)}
      const portalChoice=portalChoices.has(id),routeSelected=state.movePending&&Array.isArray(state.chosenPath)&&state.chosenPath.slice(1).includes(id),routeFinal=state.movePending&&state.chosenMovePlan?.hex===id;const c=svgEl('circle',{cx:h.x,cy:h.y,r:31,class:'hex-hit'+(state.reachable.includes(id)?' reachable':'')+(routeSelected?' path-selected':'')+(routeFinal?' selected':'')+(portalChoice?' portal-choice-hit':'')});
      c.addEventListener('click',()=>{if(portalChoice){selectPortalDestination(id);return}if(state.portalPending)return;moveTo(id)});
      c.addEventListener('mouseenter',()=>{const bits=[`Гекс: ${id}`,regionName(h.region)];if(state.locations[id]&&locationVisibleToPlayer(currentPlayer(),id))bits.push(state.locations[id].name);if(state.territories[id])bits.push(`территория ${getPlayer(state.territories[id].owner)?.name||''}`);if(portalChoice)bits.push('выход из портала');els.hoverInfo.textContent=bits.join(' · ')});c.addEventListener('mouseleave',()=>els.hoverInfo.textContent='Гекс: —');els.overlay.appendChild(c)
    });
    Object.entries(state.territories).forEach(([id,t])=>{const h=MAP.hexes[id],colors=getHeroMapColors(getPlayer(t.owner));els.overlay.appendChild(svgEl('polygon',{points:hexPolygonPoints(h,29).map(x=>x.join(',')).join(' '),class:'territory-marker',fill:colors.fill,stroke:colors.stroke}))});state.areas.forEach(drawAreaOutline);
    if(state.mapHighlight?.type==='territories'){for(const [id,t] of Object.entries(state.territories))if(t.owner===state.mapHighlight.playerId)drawPurpleHexOutline(id,'map-purple-outline',64)}
    if(state.mapHighlight?.type==='areas'){for(const a of state.areas)if(a.owner===state.mapHighlight.playerId)drawPurpleAreaOutline(a)}
    const visibilityPlayer=onlineLocalHeroId?getPlayer(onlineLocalHeroId):currentPlayer();Object.entries(state.locations).forEach(([id,l])=>{if(!locationVisibleToPlayer(visibilityPlayer,id))return;const h=MAP.hexes[id],colors=getLocationMapColors(l.name);els.overlay.appendChild(svgEl('polygon',{points:hexPolygonPoints(h,29).map(x=>x.join(',')).join(' '),class:'location-marker',fill:colors.fill,stroke:colors.stroke}));const t=svgEl('text',{x:h.x,y:h.y+1,class:'location-text'});t.textContent=LOCATION_SYMBOL[l.name]||'●';els.overlay.appendChild(t)});
    for(const id of portalChoices)drawPurpleHexOutline(id,'portal-choice-outline',66);
    if(!state.started){applyMapZoom(false);return}
    const dungeonHexes=new Set(state.players.filter(p=>p.inDungeon).map(p=>p.hex));for(const hex of dungeonHexes){const h=MAP.hexes[hex];if(!h)continue;els.overlay.appendChild(svgEl('polygon',{points:hexPolygonPoints(h,47).map(x=>x.join(',')).join(' '),class:'dungeon-grate-bg'}));for(const dx of [-28,-10,10,28])els.overlay.appendChild(svgEl('line',{x1:h.x+dx,y1:h.y-31,x2:h.x+dx,y2:h.y+31,class:'dungeon-grate-line'}));for(const dy of [-20,0,20])els.overlay.appendChild(svgEl('line',{x1:h.x-36,y1:h.y+dy,x2:h.x+36,y2:h.y+dy,class:'dungeon-grate-line'}))}
    const groups={};state.players.forEach(p=>(groups[p.hex]??=[]).push(p));Object.entries(groups).forEach(([hex,ps])=>{const h=MAP.hexes[hex],n=ps.length;ps.forEach((p,i)=>{const a=n===1?0:Math.PI*2*i/n,rad=n===1?0:24,x=h.x+Math.cos(a)*rad,y=h.y+Math.sin(a)*rad;if(p.id===currentPlayer().id)els.overlay.appendChild(svgEl('circle',{cx:x,cy:y,r:25,class:'current-ring'}));els.overlay.appendChild(svgEl('circle',{cx:x,cy:y,r:17,fill:p.color,class:'player-marker'}));const t=svgEl('text',{x,y:y+1,class:'marker-label'});t.textContent=p.initial;els.overlay.appendChild(t)})});applyMapZoom(false)
  }

  function saveGame(){if(!state.started)return;localStorage.setItem('rpgDigitalPrototypeV0634',JSON.stringify(state));log('Партия v0.6.34 сохранена в браузере.')}
  function loadGame(){
    const raw=localStorage.getItem('rpgDigitalPrototypeV0634')||localStorage.getItem('rpgDigitalPrototypeV0633')||localStorage.getItem('rpgDigitalPrototypeV0632')||localStorage.getItem('rpgDigitalPrototypeV0631')||localStorage.getItem('rpgDigitalPrototypeV063')||localStorage.getItem('rpgDigitalPrototypeV062')||localStorage.getItem('rpgDigitalPrototypeV060')||localStorage.getItem('rpgDigitalPrototypeV0522')||localStorage.getItem('rpgDigitalPrototypeV0521')||localStorage.getItem('rpgDigitalPrototypeV0520')||localStorage.getItem('rpgDigitalPrototypeV0519')||localStorage.getItem('rpgDigitalPrototypeV0518')||localStorage.getItem('rpgDigitalPrototypeV0517')||localStorage.getItem('rpgDigitalPrototypeV0516')||localStorage.getItem('rpgDigitalPrototypeV0515')||localStorage.getItem('rpgDigitalPrototypeV0514')||localStorage.getItem('rpgDigitalPrototypeV0513')||localStorage.getItem('rpgDigitalPrototypeV0512')||localStorage.getItem('rpgDigitalPrototypeV0511')||localStorage.getItem('rpgDigitalPrototypeV0510')||localStorage.getItem('rpgDigitalPrototypeV059')||localStorage.getItem('rpgDigitalPrototypeV058')||localStorage.getItem('rpgDigitalPrototypeV057')||localStorage.getItem('rpgDigitalPrototypeV056')||localStorage.getItem('rpgDigitalPrototypeV055')||localStorage.getItem('rpgDigitalPrototypeV054')||localStorage.getItem('rpgDigitalPrototypeV053')||localStorage.getItem('rpgDigitalPrototypeV052')||localStorage.getItem('rpgDigitalPrototypeV051')||localStorage.getItem('rpgDigitalPrototypeV050')||localStorage.getItem('rpgDigitalPrototypeV045')||localStorage.getItem('rpgDigitalPrototypeV044')||localStorage.getItem('rpgDigitalPrototypeV043')||localStorage.getItem('rpgDigitalPrototypeV042')||localStorage.getItem('rpgDigitalPrototypeV041')||localStorage.getItem('rpgDigitalPrototypeV040')||localStorage.getItem('rpgDigitalPrototypeV033')||localStorage.getItem('rpgDigitalPrototypeV032');
    if(!raw){alert('Сохранённой партии пока нет.');return}
    try{
      state=JSON.parse(raw);if(!state.locations)state.locations={};if(!state.territories)state.territories={};if(!state.areas)state.areas=[];stripPermanentLocationCardsFromDecks(state.decks);
      if(state.locationUsedThisTurn==null)state.locationUsedThisTurn=false;if(state.locationActivationHex===undefined)state.locationActivationHex=null;if(state.portalPending==null)state.portalPending=null;if(state.clearedThisTurnHex===undefined)state.clearedThisTurnHex=null;if(state.foreignTerritoryPending===undefined)state.foreignTerritoryPending=null;if(state.tradeOpportunity===undefined)state.tradeOpportunity=null;if(state.tributeConsentPending===undefined)state.tributeConsentPending=null;if(state.dungeonEntryNotice===undefined)state.dungeonEntryNotice=null;if(state.movePending===undefined)state.movePending=false;if(state.moveOriginHex===undefined)state.moveOriginHex=null;if(state.moveTransit===undefined)state.moveTransit=null;if(state.pendingMoveAction===undefined)state.pendingMoveAction=null;if(state.chosenMovePlan===undefined)state.chosenMovePlan=null;if(state.inspectPlayerId===undefined)state.inspectPlayerId=null;if(state.mapHighlight===undefined)state.mapHighlight=null;if(state.mapZoom===undefined)state.mapZoom=1;if(state.gameOver===undefined)state.gameOver=false;if(state.sharedDifficulty===undefined)state.sharedDifficulty=null;if(!Array.isArray(state.journal))state.journal=[];
      if(state.tradeOpportunity){if(state.tradeOpportunity.visitorId==null&&state.tradeOpportunity.buyerId!=null)state.tradeOpportunity.visitorId=state.tradeOpportunity.buyerId;if(!state.tradeOpportunity.otherIds&&state.tradeOpportunity.sellerIds)state.tradeOpportunity.otherIds=[...state.tradeOpportunity.sellerIds]}
      const legacyHard=!!state.hardMode;state.players.forEach(p=>{if(p.hardMode==null)p.hardMode=legacyHard;if(state.sharedDifficulty)p.hardMode=state.sharedDifficulty==='hard';ensurePlayerModel(p);for(const hex of Object.keys(p.locationVisits||{}))if(state.locations[hex])p.discoveredLocations[hex]=true;if(state.locations[p.hex])p.discoveredLocations[p.hex]=true});delete state.hardMode;
      if(state.gameWon&&!state.gameOver){state.gameOver={winnerId:state.gameWon.heroId,heroName:state.gameWon.heroName,round:state.gameWon.round||state.round,personalTurn:state.gameWon.personalTurn||getPlayer(state.gameWon.heroId)?.personalTurn||null};state.turnLocked=true}
      document.body.classList.add('game-running');els.setupSection.hidden=true;els.gameSection.hidden=false;els.saveBtn.disabled=false;els.inventoryBtn.hidden=true;if(playerHardMode(currentPlayer()))state.inspectPlayerId=null;if(state.combat===undefined)state.combat=null;if(state.combat&&state.combat.journalOpen==null)state.combat.journalOpen=false;
      state.version='0.6.34';if(state.rolled&&!state.turnLocked&&!state.moveTransit&&!state.portalPending&&!state.foreignTerritoryPending){if(!Array.isArray(state.chosenPath)||!state.chosenPath.length)state.chosenPath=[state.moveOriginHex||currentPlayer().hex];if(state.movePending&&state.chosenMovePlan?.path)state.chosenPath=[...state.chosenMovePlan.path];refreshManualMoveReachable(currentPlayer())}if(isMobileViewport())els.sheetDrawer.hidden=true;else openCharacterSheet('overview',null,currentPlayer().id);updateUI();renderBoard();setTimeout(()=>centerMapOnPlayer(currentPlayer(),'auto'),80);log('Сохранённая партия загружена в v0.6.34.');if(state.gameOver)setTimeout(()=>showGameOverPopup(getPlayer(state.gameOver.winnerId)||currentPlayer()),0);
    }catch(e){console.error(e);alert('Не удалось загрузить сохранение.')}
  }
  function cloneJson(v){return JSON.parse(JSON.stringify(v))}
  function exportOnlineState(){
    const out=cloneJson(state);
    delete out.inspectPlayerId;delete out.mapHighlight;delete out.mapZoom;
    if(out.combat)delete out.combat.journalOpen;
    return out;
  }
  function normalizeIncomingState(next){
    state=cloneJson(next||freshState());if(!state.locations)state.locations={};if(!state.territories)state.territories={};if(!state.areas)state.areas=[];stripPermanentLocationCardsFromDecks(state.decks);
    if(state.locationUsedThisTurn==null)state.locationUsedThisTurn=false;if(state.locationActivationHex===undefined)state.locationActivationHex=null;if(state.portalPending==null)state.portalPending=null;if(state.clearedThisTurnHex===undefined)state.clearedThisTurnHex=null;if(state.foreignTerritoryPending===undefined)state.foreignTerritoryPending=null;if(state.tradeOpportunity===undefined)state.tradeOpportunity=null;if(state.tributeConsentPending===undefined)state.tributeConsentPending=null;if(state.dungeonEntryNotice===undefined)state.dungeonEntryNotice=null;if(state.movePending===undefined)state.movePending=false;if(state.moveOriginHex===undefined)state.moveOriginHex=null;if(state.moveTransit===undefined)state.moveTransit=null;if(state.pendingMoveAction===undefined)state.pendingMoveAction=null;if(state.chosenMovePlan===undefined)state.chosenMovePlan=null;if(state.inspectPlayerId===undefined)state.inspectPlayerId=null;if(state.mapHighlight===undefined)state.mapHighlight=null;if(state.mapZoom===undefined)state.mapZoom=1;if(state.gameOver===undefined)state.gameOver=false;if(state.sharedDifficulty===undefined)state.sharedDifficulty=null;if(!Array.isArray(state.journal))state.journal=[];
    if(state.tradeOpportunity){if(state.tradeOpportunity.visitorId==null&&state.tradeOpportunity.buyerId!=null)state.tradeOpportunity.visitorId=state.tradeOpportunity.buyerId;if(!state.tradeOpportunity.otherIds&&state.tradeOpportunity.sellerIds)state.tradeOpportunity.otherIds=[...state.tradeOpportunity.sellerIds]}
    const legacyHard=!!state.hardMode;(state.players||[]).forEach(p=>{if(p.hardMode==null)p.hardMode=legacyHard;if(state.sharedDifficulty)p.hardMode=state.sharedDifficulty==='hard';ensurePlayerModel(p);for(const hex of Object.keys(p.locationVisits||{}))if(state.locations[hex])p.discoveredLocations[hex]=true;if(state.locations[p.hex])p.discoveredLocations[p.hex]=true});delete state.hardMode;
    if(state.gameWon&&!state.gameOver){state.gameOver={winnerId:state.gameWon.heroId,heroName:state.gameWon.heroName,round:state.gameWon.round||state.round,personalTurn:state.gameWon.personalTurn||getPlayer(state.gameWon.heroId)?.personalTurn||null};state.turnLocked=true}
    state.version='0.6.34';if(state.combat===undefined)state.combat=null;if(state.combat&&state.combat.journalOpen==null)state.combat.journalOpen=false;
    if(state.rolled&&!state.turnLocked&&!state.moveTransit&&!state.portalPending&&!state.foreignTerritoryPending){if(!Array.isArray(state.chosenPath)||!state.chosenPath.length)state.chosenPath=[state.moveOriginHex||currentPlayer()?.hex];if(state.movePending&&state.chosenMovePlan?.path)state.chosenPath=[...state.chosenMovePlan.path];if(currentPlayer())refreshManualMoveReachable(currentPlayer())}
  }
  function applyOnlineState(next){
    const localZoom=Number(state.mapZoom||1),localInspect=state.inspectPlayerId??null,localHighlight=state.mapHighlight??null,localJournal=state.combat?.journalOpen??false,mobileSheetWasOpen=isMobileViewport()&&!els.sheetDrawer.hidden;
    normalizeIncomingState(next);state.mapZoom=localZoom;state.inspectPlayerId=localInspect;state.mapHighlight=localHighlight;if(state.combat)state.combat.journalOpen=localJournal;
    const newCombat=syncLocalCombatWindowState();document.body.classList.add('game-running');els.setupSection.hidden=true;els.gameSection.hidden=false;els.saveBtn.disabled=false;els.inventoryBtn.hidden=true;if(playerHardMode(currentPlayer()))state.inspectPlayerId=null;
    if(isMobileViewport()&&(newCombat||!mobileSheetWasOpen))els.sheetDrawer.hidden=true;updateUI();renderBoard();renderJournal();if(state.combat){if(!combatWindowHidden)renderCombat();else updateCombatRestoreButton()}else if(!els.modal.hidden&&els.modalContent.querySelector('.combat-shell'))closeModal();maybeShowDungeonEntryNotice();setTimeout(()=>centerMapOnPlayer(mapFocusPlayer(),'auto'),40);
    if(state.gameOver)setTimeout(()=>showGameOverPopup(getPlayer(state.gameOver.winnerId)||currentPlayer()),0);
  }
  function startOnlineGame(heroIds,options={}){startGame(heroIds,{sharedDifficulty:options?.hardMode?'hard':'normal',hardMode:!!options?.hardMode});return exportOnlineState()}

  function resetGame(){if(!confirm('Сбросить текущую партию?'))return;endSideInteraction();combatWindowHidden=false;combatWindowInstance=null;modalOffturnOwnerId=null;modalCloseAction=null;state=freshState();document.body.classList.remove('game-running');rollPopupQueue.length=0;rollPopupAfterClose=null;if(els.journalOverlay)els.journalOverlay.hidden=true;if(els.rollOverlay)els.rollOverlay.hidden=true;els.setupSection.hidden=false;els.gameSection.hidden=true;els.saveBtn.disabled=true;els.inventoryBtn.hidden=true;els.log.innerHTML='';journalFilterMode='mine';closeModal();closeCharacterSheet();renderBoard();renderJournal()}

  if(els.sheetHeroTab)els.sheetHeroTab.addEventListener('click',()=>{if(state.started)openCharacterSheet('overview',null,sheetView.playerId||currentPlayer().id)});
  if(els.sheetInventoryTab)els.sheetInventoryTab.addEventListener('click',()=>{if(state.started)openCharacterSheet('inventory',null,sheetView.playerId||currentPlayer().id)});
  if(els.rollPopupClose)els.rollPopupClose.addEventListener('click',()=>{els.rollOverlay.hidden=true;const after=rollPopupAfterClose;rollPopupAfterClose=null;els.rollPopupClose.textContent='Продолжить';if(after)after();showNextRollPopup();if(sideInteraction?.type==='territory'&&els.rollOverlay.hidden&&!rollPopupQueue.length)endSideInteraction()});
  if(els.journalBtn)els.journalBtn.addEventListener('click',()=>{renderJournal();els.journalOverlay.hidden=false});
  if(els.journalMine)els.journalMine.addEventListener('click',()=>{journalFilterMode='mine';renderJournal()});
  if(els.journalAll)els.journalAll.addEventListener('click',()=>{journalFilterMode='all';renderJournal()});
  if(els.journalClose)els.journalClose.addEventListener('click',()=>{els.journalOverlay.hidden=true});
  if(els.journalOverlay)els.journalOverlay.addEventListener('click',e=>{if(e.target===els.journalOverlay)els.journalOverlay.hidden=true});
  if(els.mapZoomIn)els.mapZoomIn.addEventListener('click',()=>changeMapZoom(.1));
  if(els.mapZoomOut)els.mapZoomOut.addEventListener('click',()=>changeMapZoom(-.1));
  if(els.mobileHeroBtn)els.mobileHeroBtn.addEventListener('click',()=>openCharacterSheet('overview',null,sideInteractionOwnerId()||onlineLocalHeroId||currentPlayer()?.id));
  if(els.mobileInventoryBtn)els.mobileInventoryBtn.addEventListener('click',()=>openCharacterSheet('inventory',null,sideInteractionOwnerId()||onlineLocalHeroId||currentPlayer()?.id));
  if(els.mobileJournalBtn)els.mobileJournalBtn.addEventListener('click',()=>{renderJournal();els.journalOverlay.hidden=false});
  let resizeTimer=null;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{applyMapZoom(false);if(state.started&&isMobileViewport()&&els.sheetDrawer.hidden)centerMapOnPlayer(mapFocusPlayer(),'auto')},120)});
  let pinchStartDist=0,pinchStartZoom=1;const touchDistance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);if(els.boardWrap){els.boardWrap.addEventListener('touchstart',e=>{if(e.touches.length===2){pinchStartDist=touchDistance(e.touches);pinchStartZoom=Number(state.mapZoom||1)}},{passive:true});els.boardWrap.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinchStartDist>0){e.preventDefault();const ratio=touchDistance(e.touches)/pinchStartDist;state.mapZoom=Math.round(clamp(pinchStartZoom*ratio,.6,2)*20)/20;applyMapZoom(false)}},{passive:false});els.boardWrap.addEventListener('touchend',e=>{if(e.touches.length<2)pinchStartDist=0},{passive:true})}
  if('serviceWorker' in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  els.startBtn.addEventListener('click',startGame);els.moveRollBtn.addEventListener('click',rollMove);els.endTurnBtn.addEventListener('click',()=>endTurn(false));els.saveBtn.addEventListener('click',saveGame);els.loadBtn.addEventListener('click',loadGame);els.resetBtn.addEventListener('click',resetGame);els.inventoryBtn.addEventListener('click',()=>openCharacterSheet('overview'));els.sheetClose.addEventListener('click',closeCharacterSheet);els.modalClose.addEventListener('click',requestModalClose);
  window.__RPG_DEBUG__={getState:()=>state,setState:v=>{state=v},freshState,HEROES,CARD_BY_ID,combatStart,combatFight,combatHeroAttack,finalizeHeroAttackRoll,applyHeroDamageNow,combatEnemyTurn,finalizeEnemyAttackRoll,acceptEnemyDamage,combatContinueAfterEnemyMiss,renderCombat,currentPlayer,getPlayer,ensurePlayerModel,supportedCombatEffect,applyCombatItemEffect,useHeroCombatAbility,combatReactionList,fullSetEquipped,completeSetNames,itemColorClass,mandatoryLootCount,setBonusActionInfo,useSetBonus,showRollPopup,heroImmuneStatus,combatPassiveDamageBonus,combatHeroDeath,combatVictory,merchantSaleMultiplier,decorateNegativeEffects,generatePermanentLocations,locationVisibleToPlayer,revealLocationToPlayer,ensureTavernMercenary,restockTavernIfVacant,visitTavern,attemptDungeonExit,beginBonusExplorationTurnAfterDungeon,gameOverStats,showGameOverPopup,renderBoard,updateUI};
  window.__RPG_ONLINE__={startWithHeroes:startOnlineGame,exportState:exportOnlineState,applyState:applyOnlineState,currentPlayerId:()=>currentPlayer()?.id||null,isStarted:()=>!!state.started,sideInteractionOwnerId,sideInteractionActiveFor,exportSideState:sideInteractionPayload,endSideInteraction,refreshUI:()=>{renderJournal();updateUI();renderBoard()},setLocalHeroId:id=>{onlineLocalHeroId=id||null;if(onlineLocalHeroId){sheetView.playerId=onlineLocalHeroId;if(!els.sheetDrawer.hidden)renderCharacterSheet(sheetView.mode,sheetView.bonusKey)}renderJournal();updateUI();renderBoard()},canOffturnSharedAction:id=>!!id&&(state.tributeConsentPending?.ownerId===id||state.dungeonEntryNotice?.heroId===id),canOffturnModalActionFor,combatWindowIsHidden:()=>combatWindowHidden,showCombatWindow,hideCombatWindow};
  decorateNegativeEffects(document.body);negativeEffectObserver.observe(document.body,{childList:true,subtree:true});
  renderJournal();renderBoard();
})();
