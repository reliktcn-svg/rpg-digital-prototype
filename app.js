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
  // Эти карты НИКОГДА не выдаются из внешних тайников, даже если старая
  // сетевая партия сохранила их там до исправления правил.
  const HEART_ONLY_LOOT_IDS=new Set([193,296,300,...CARDS.filter(c=>c.category==='Наёмники'&&/(эпичес|легендар|элитн)/i.test(c.fields?.['Редкость']||'')).map(c=>c.id)]);
  function heartOnlyLoot(card){return !!card&&HEART_ONLY_LOOT_IDS.has(Number(card.id))}
  function normalizeLegendaryHeartLoot(decks){
    if(!decks?.lootOuter||!decks?.lootHeart)return;
    for(const id of HEART_ONLY_LOOT_IDS){
      let found=false;
      for(const part of ['draw','discard']){
        const source=decks.lootOuter[part]||[];
        const filtered=source.filter(x=>Number(x)!==id);
        if(filtered.length!==source.length){decks.lootOuter[part]=filtered;found=true}
      }
      const already=['draw','discard'].some(part=>(decks.lootHeart[part]||[]).some(x=>Number(x)===id));
      // Не создаём дубликат: если карта уже у героя, она не лежит ни в одной колоде.
      if(found&&!already)decks.lootHeart.draw.push(id);
    }
    // Без повторного shuffle: все клиенты одной сетевой комнаты должны получать
    // одинаковую миграцию, а не разные случайные порядки колоды.

  }
  // Старые локации могут хранить уже выбранного запрещённого наёмника.
  function normalizeTavernMercenaries(){
    for(const [hex,loc] of Object.entries(state.locations||{})){
      if(loc?.name!=='Таверна'||!loc.tavernMercenaryId)continue;
      const merc=itemCard(loc.tavernMercenaryId),region=MAP.hexes?.[hex]?.region;
      if(merc&&itemType(merc)==='наёмник'&&region!=='cursed'&&
         (heartOnlyLoot(merc)||merc.deck==='Тайники Сердца тьмы')){
        const heart=state.decks?.lootHeart;
        if(heart&&!['draw','discard'].some(part=>(heart[part]||[]).some(id=>Number(id)===merc.id)))heart.draw.push(merc.id);
        delete loc.tavernMercenaryId;delete loc.tavernMercenaryDeckKey;
        loc.tavernNeedsRestock=false;
      }
    }
  }
  // При создании партии оставляем ровно половину карт-зелий в каждом регионе.
  // Выбираем экземпляры случайно, но сохраняем представительство всех видов:
  // 28 -> 14 во внешней колоде, 36 -> 18 в колоде Сердца тьмы.
  // Карт, исключённых при создании, нет в draw/discard — поэтому они не
  // возвращаются после использования и не попадают в ассортимент Торговца.
  function halvePotionsForNewGame(ids){
    const groups=new Map();
    for(const id of ids){
      const c=itemCard(id);
      if(itemType(c)!=='зелье')continue;
      const name=c.name;
      if(!groups.has(name))groups.set(name,[]);
      groups.get(name).push(id);
    }
    const total=[...groups.values()].reduce((n,a)=>n+a.length,0);
    const target=Math.floor(total/2);
    const slots=[...groups].map(([name,group])=>({name,ids:shuffled(group),count:Math.max(1,Math.floor(group.length/2)),fraction:group.length%2}));
    let left=target-slots.reduce((n,g)=>n+g.count,0);
    // Равные дробные остатки сортируем случайно, чтобы не одни и те же
    // виды постоянно получали лишний экземпляр.
    for(const g of shuffled(slots).sort((a,b)=>b.fraction-a.fraction)){
      if(left<=0)break;
      if(g.count<g.ids.length){g.count++;left--}
    }
    const included=new Set(slots.flatMap(g=>g.ids.slice(0,g.count)));
    return ids.filter(id=>itemType(itemCard(id))!=='зелье'||included.has(id));
  }
  function initialDecks(){
    const o={};
    for(const k of ['exploreOuter','exploreHeart','lootOuter','lootHeart']){
      let ids=(DECK_IDS[k]||[]).filter(id=>!isPermanentLocationCardId(id)&&!(k==='lootOuter'&&HEART_ONLY_LOOT_IDS.has(Number(id))));
      if(k==='lootOuter'||k==='lootHeart')ids=halvePotionsForNewGame(ids);
      o[k]={draw:shuffled(ids),discard:[]};
    }
    return o;
  }
  function freshState(){return {
    version:'0.6.85', started:false, players:[], order:[], currentIndex:0, rolled:false, die:null, movePoints:0, reachable:[], chosenPath:null, chosenMovePlan:null, turnMoved:false, movePending:false, moveOriginHex:null, moveTransit:null, pendingMoveAction:null, round:1,
    decks:initialDecks(), cleaned:{}, locations:{}, territories:{}, areas:[], nextAreaId:1, exploration:null, turnLocked:false, locationUsedThisTurn:false, locationActivationHex:null, portalPending:null, clearedThisTurnHex:null, foreignTerritoryPending:null, tributeConsentPending:null, tradeOpportunity:null, tradeDeal:null, dungeonEntryNotice:null, territoryBuiltNotice:null, inspectPlayerId:null, mapHighlight:null, mapZoom:1, combat:null, gameOver:false, locationPlacementVersion:3, sharedDifficulty:null, journal:[]
  };}
  let state=freshState();
  let sideInteraction=null;
  let onlineLocalHeroId=null;
  let journalFilterMode='mine';
  let modalOffturnOwnerId=null;
  let modalCloseAction=null;
  let combatWindowHidden=false;
  let combatWindowInstance=null;
  // Локальный выбор игрока: сетевые опросы не должны заново открывать закрытую
  // статистику, однако вручную итог партии можно показать из меню.
  let dismissedGameOverKey=null;
  let visibleGameOverKey=null;
  function currentGameOverKey(){
    const g=state.gameOver;
    return g?`${g.winnerId}|${g.round}|${g.personalTurn}`:null;
  }

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
  function hideCombatWindow(){if(!state.combat)return;if(arcanaBattleLayer&&!arcanaBattleLayer.hidden)stopArcanaBattlePresentation();combatWindowHidden=true;updateCombatRestoreButton();if(!els.modal.hidden&&els.modalContent.querySelector('.combat-shell'))closeModal();updateUI();renderBoard()}
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
    const deal=state.tradeDeal;
    if(deal&&['buyer_select','seller_offer','seller_review','buyer_final','completed','rejected','closed'].includes(deal.stage)&&[deal.buyerId,deal.sellerId].includes(heroId)){
      const ids=new Set([deal.buyerId,deal.sellerId].filter(Boolean));
      return{type:'playerTrade',ownerId:heroId,players:state.players.filter(q=>ids.has(q.id)).map(cloneJson),tradeDeal:cloneJson(deal),journal:cloneJson(state.journal||[])};
    }
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
  function locationCandidateEligible(hex,region){
    const h=MAP.hexes[hex];
    if(!h||h.region!==region||hex===MAP.startHex||hex===MAP.bossHex)return false;
    if(state.locations[hex]||state.territories[hex]||state.cleaned?.[hex])return false;
    if((state.players||[]).some(p=>p.hex===hex))return false;
    return true;
  }
  function generatePermanentLocations({preserve=true}={}){
    stripPermanentLocationCardsFromDecks(state.decks);
    normalizeLegendaryHeartLoot(state.decks);
    if(!preserve)state.locations={};
    const placement=window.RPG_LOCATION_PLACEMENT?.plan({
      map:MAP,counts:PERMANENT_LOCATION_COUNTS,existing:state.locations,
      eligible:locationCandidateEligible,distance:mapHexDistance,attempts:14
    });
    if(!placement?.ok){
      console.error('Не удалось распределить постоянные локации по пространственным зонам.',placement?.reason);
      return false;
    }
    for(const [hex,loc] of Object.entries(placement.placements)){
      state.locations[hex]={name:loc.name,cardId:LOCATION_CARD_ID[loc.name],generated:true};
    }
    state.locationPlacementVersion=3;
    return true;
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
    const used=healingExprFor(p,expr),total=/^\d*D\d+$/i.test(used)?rollDiceText(used):Number(used)||0;
    return{total,used,original:String(expr||''),reduced:used!==String(expr||'').toUpperCase()};
  }
  function removeStatus(p,status){ensurePlayerModel(p);p.statuses=(p.statuses||[]).filter(x=>x!==status);delete p.statusTimers[status];delete p.statusTickedTurn[status];if(state.combat?.heroStatusTimers)delete state.combat.heroStatusTimers[status];if(state.combat?.lastAppliedHeroStatus===status)state.combat.lastAppliedHeroStatus=null}
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
    if(!p.territoryBuildSeq||typeof p.territoryBuildSeq!=='object')p.territoryBuildSeq={kingdom:0,cursed:0};
    for(const r of ['kingdom','cursed']){
      const owned=Object.entries(state.territories||{}).filter(([h,t])=>t?.owner===p.id&&MAP.hexes[h]?.region===r).length;
      p.territoryBuildSeq[r]=Math.max(Number(p.territoryBuildSeq[r]||0),owned);
    }
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
  function sourceRemove(p,id,ctx){p=getPlayer(p?.id)||p;ensurePlayerModel(p);if(ctx?.where==='backpack')return removeId(p.backpack,id);if(ctx?.where==='pending')return removeId(p.pendingItems,id);if(ctx?.where==='equipment'&&ctx.slot){if(getSlotId(p,ctx.slot)===id){setSlotId(p,ctx.slot,null);return true}}return false}
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
  function combatCanChangeEquipment(p,card){
    const c=state.combat;if(!c||currentPlayer()?.id!==p.id)return false;
    if(itemType(card)==='зелье')return true;
    if(c.phase!=='hero_turn')return false;
    return ['оружие','щит','броня','кольцо','амулет','артефакт'].includes(itemType(card))&&c.equipmentChangeRound!==c.round;
  }
  function combatRecordEquipmentChange(card){const c=state.combat;if(c&&itemType(card)!=='зелье'){c.equipmentChangeRound=c.round;combatPush('Экипировка изменена: лимит одного предмета в этом боевом раунде использован.')}}
  function equipTransaction(p,newId,ctx,targetSlot,oldMode='backpack'){
    // A stale inventory button must never manufacture a second copy of an item.
    const live=getPlayer(p?.id);if(!live)return{ok:false,why:'Герой больше не доступен.'};p=live;
    if(!heldLocation(p,newId)||!ctx||!((ctx.where==='backpack'&&p.backpack.includes(newId))||(ctx.where==='pending'&&p.pendingItems.includes(newId))||(ctx.where==='equipment'&&getSlotId(p,ctx.slot)===newId)))return{ok:false,why:'Предмет уже перемещён. Обновите инвентарь.'};
    if(ctx.where==='equipment'&&ctx.slot===targetSlot)return{ok:false,why:'Предмет уже находится в этом слоте.'};
    if(heroIsActiveCombatant(p)&&(!combatCanChangeEquipment(p,itemCard(newId))||(!['potion0','potion1'].includes(targetSlot)&&oldMode!=='backpack')))return{ok:false,why:'В свой боевой раунд разрешено только одно изменение экипировки; заменённый предмет должен попасть в рюкзак.'};
    const oldId=getSlotId(p,targetSlot);const bp=[...p.backpack],pend=[...p.pendingItems];
    if(ctx?.where==='backpack'&&!removeId(bp,newId))return{ok:false,why:'Предмет уже отсутствует в рюкзаке.'};if(ctx?.where==='pending'&&!removeId(pend,newId))return{ok:false,why:'Предмет уже разобран.'};if(ctx?.where==='equipment'&&ctx.slot)setSlotId(p,ctx.slot,null);
    if(oldId!=null&&oldId!==newId){if(oldMode==='backpack')bp.push(oldId);else if(oldMode==='pending')pend.push(oldId)}
    const cap=finalBackpackCapacityAfter(p,targetSlot,newId);
    if(bp.length>cap){if(ctx?.where==='equipment'&&ctx.slot)setSlotId(p,ctx.slot,newId);return{ok:false,why:`После замены рюкзак превысит вместимость ${cap}.`}}
    if(oldId!=null&&oldId!==newId&&oldMode==='discard')discardHeldCard(itemCard(oldId));
    p.backpack=bp;p.pendingItems=pend;setSlotId(p,targetSlot,newId);
    if(heroIsActiveCombatant(p))combatRecordEquipmentChange(itemCard(newId));
    log(`${p.name} экипирует <b>${itemCard(newId)?.name||newId}</b> в слот «${SLOT_LABELS[targetSlot]}».`);return{ok:true};
  }
  function receiveTreasure(p,card){
    if(!card)return{immediate:true};
    ensurePlayerModel(p);ensurePlayerStats(p);p.stats.lootFound++;p.pendingItems.push(card.id);return{immediate:false,id:card.id};
  }
  function heldLocation(p,id){ensurePlayerModel(p);if(p.backpack.includes(id))return{where:'backpack'};if(p.pendingItems.includes(id))return{where:'pending'};for(const {slot,id:sid} of equippedEntries(p))if(sid===id)return{where:'equipment',slot};return null}

  HEROES.forEach((h,i)=>{const label=document.createElement('label');label.className='hero-option';label.style.setProperty('--hero-color',h.color);label.innerHTML=`<input type="checkbox" value="${h.id}" ${i<5?'checked':''}><img class="hero-choice-art" src="assets/heroes/${h.id}.webp" alt="${h.name}" loading="lazy"><span class="hero-choice-main"><span class="hero-name">${h.name}</span><span class="hero-choice-stats">ЗД ${h.hp} · ЗЩ ${h.defense} · Урон ${h.baseDamage}</span><span class="hero-choice-stats">СИЛ ${signed(h.str)} · ЛОВ ${signed(h.dex)} · МУД ${signed(h.wis)} · ХАР ${signed(h.cha)}</span></span><span class="hero-choice-check">✓</span>`;els.heroPicker.appendChild(label)});

  function rollInitiative(players){const used=new Set();players.forEach(p=>{let r=rand(20),rerolls=[];while(used.has(r)){rerolls.push(r);r=rand(20)}used.add(r);p.initiative=r;p.initiativeRerolls=rerolls});return [...players].sort((a,b)=>b.initiative-a.initiative).map(p=>p.id)}
  function startGame(forcedIds=null,options={}){
    const ids=Array.isArray(forcedIds)?[...forcedIds]:[...els.heroPicker.querySelectorAll('input:checked')].map(x=>x.value);
    if(ids.length<2||ids.length>5){els.setupError.textContent='Нужно выбрать от 2 до 5 героев.';return}
    state=freshState();dismissedGameOverKey=null;visibleGameOverKey=null;state.started=true;const sharedHard=options?.sharedDifficulty==='hard'||options?.hardMode===true;state.sharedDifficulty=Array.isArray(forcedIds)?(sharedHard?'hard':'normal'):null;
    state.players=ids.map(id=>{const h=HEROES.find(x=>x.id===id);return {...h,maxHp:h.hp,currentHp:h.hp,gold:0,hex:MAP.startHex,personalTurn:1,initiative:null,initiativeRerolls:[],statuses:[],statusTimers:{},statusTickedTurn:{},backpack:[],pendingItems:[],equipment:{weapon:null,armor:null,amulet:null,rings:[null,null],artifact:null,potions:[null,null],mercenary:null},temporaryEffects:[],combatEffects:[],itemUsage:{},hardMode:sharedHard,locationVisits:{},discoveredLocations:{},reexploreRiskHex:null,inDungeon:false,dungeonCard:null,dungeonEnteredTurn:null,notes:[],stats:freshPlayerStats(),territoryBuildSeq:{kingdom:0,cursed:0}}});
    generatePermanentLocations({preserve:false});
    state.order=rollInitiative(state.players);document.body.classList.add('game-running');els.setupSection.hidden=true;els.gameSection.hidden=false;els.saveBtn.disabled=false;els.inventoryBtn.hidden=true;els.sheetDrawer.hidden=true;setTimeout(()=>centerMapOnPlayer(currentPlayer(),'auto'),80);
    log(`<b>Партия v0.6.85 началась.</b> Игроков: ${state.players.length}. Колоды перемешаны. Все постоянные локации заранее размещены на карте для этой партии.`,null);
    state.order.forEach(id=>{const p=getPlayer(id);log(`Инициатива ${p.name}: D20 = <b>${p.initiative}</b>.`,p.id)});updateUI();renderBoard();
  }

  function movementFor(hexId,roll){const r=MAP.hexes[hexId]?.region;const p=currentPlayer();const bonus=p&&Number(getSlotId(p,'artifact'))===271&&['cursed','heart_of_darkness'].includes(r)?1:0;if(r==='cursed')return Math.max(1,Math.floor(roll/2))+bonus;if(r==='heart_of_darkness')return 1+bonus;return roll}
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
    if(!state.combat)showRollPopup('Движение · D6',state.die,`D6 = <b>${state.die}</b>`,`Доступно перемещение: ${state.movePoints}`);
  }
  function locationVisitStatus(p,hex){ensurePlayerModel(p);return p.locationVisits?.[hex]||'ready'}
  function canActivateLocationOnEntry(p,hex){
    const loc=state.locations[hex];if(!loc||loc.name==='Древний портал')return false;
    const st=locationVisitStatus(p,hex);return st==='ready'||st==='left';
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
      if((st==='left'||st==='cooldown')&&p.hex!==hex)p.locationVisits[hex]='ready';
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
    if(state.territories[final]?.owner===p.id){state.pendingMoveAction=null;updateUI();renderBoard();const canMerge=!state.territories[final]?.areaId&&affordableAreaCandidatesAt(p,final).length>0;if(canMerge)return false;const why=state.territories[final]?.areaId?'остановка в своей области':'остановка на своей территории';setTimeout(()=>{if(!els.rollOverlay.hidden)advanceTurnWithSideInteraction(p,'territory',why,[p.id]);else advanceTurnState(p,why)},0);return false}
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
    if(final!==startHex){markLocationDeparture(p,startHex);for(const h of realPath.slice(1,-1))markLocationDeparture(p,h);}
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
    if(deckKey==='lootOuter')normalizeLegendaryHeartLoot(state.decks);
    const d=state.decks[deckKey];if(!d)return null;
    if(!d.draw.length&&!recycleDiscardIntoDraw(deckKey))return null;
    const id=d.draw.pop(),card=CARD_BY_ID[id]||null;
    // Защита и на выдаче: карточка из неправильной колоды не попадёт герою.
    if(deckKey==='lootOuter'&&heartOnlyLoot(card)){
      returnCardToDeckRandom('lootHeart',card);
      return drawCard('lootOuter');
    }
    return card;
  }
  function discardCard(deckKey,card){if(!card)return;const key=deckKey==='lootOuter'&&heartOnlyLoot(card)?'lootHeart':deckKey;if(state.decks[key])state.decks[key].discard.push(card.id)}
  function returnCardToDeckRandom(deckKey,card){
    if(!card)return;
    const key=deckKey==='lootOuter'&&heartOnlyLoot(card)?'lootHeart':deckKey;
    if(!state.decks[key])return;
    state.decks[key].draw.push(card.id);
    state.decks[key].draw=shuffled(state.decks[key].draw);
  }
  function deckKeyForCard(card){if(card?.id===281||card?.category==='Босс')return'boss';if(card.deck==='Исследования внешних регионов')return'exploreOuter';if(card.deck==='Исследования Сердца тьмы')return'exploreHeart';if(card.deck==='Тайники внешних регионов')return'lootOuter';return'lootHeart'}
  function cleanCardFieldValue(v){return String(v??'').split(/\n={5,}/)[0].trim()}
  function displayCardFieldEntries(card){return Object.entries(card?.fields||{}).filter(([k])=>!['НОМЕР','Название','Колода','Категория','Номер в своей колоде','Регион','КОЛОДА'].includes(k)&&!k.startsWith('---')&&!/^=+$/.test(k)).map(([k,v])=>[k,cleanCardFieldValue(v)]).filter(([,v])=>v)}
  // v0.6.74: horizontal illustrated exploration cards including traps. Display-only: card actions
  // still use the original callbacks; no card rules or deck logic are changed.
  const STORY_CATEGORIES=new Set(['Ловушка','Событие','Темница','Элитная опасность','Тёмное испытание','Проклятый шаг','Золото и сокровища']);
  const STORY_ART_IDS=new Set([56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,93,94,95,96,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140]);
  function storyImageUrl(card){
    const id=Number(card?.id);
    if(STORY_ART_IDS.has(id))return `assets/story/${id}.webp`;
    if(card?.category==='Золото и сокровища'&&INVENTORY_IMAGE_IDS.has(id))return `assets/items/${id}.webp`;
    return '';
  }
  function storyTone(card){
    if(card?.category==='Ловушка')return 'trap';
    if(card?.category==='Событие')return 'event';
    if(card?.category==='Золото и сокровища')return 'treasure';
    return 'special';
  }
  // v0.6.74: visual shell for permanent locations; actions use the existing game handlers.
  function locationWindow(kind,p,content,footer,{cursed=false,title=null}={}){
    const names={merchant:'Торговец',tavern:'Таверна',shrine:'Святилище'};
    const actual=names[kind]||kind,shade=cursed?'cursed':'kingdom';
    const region=MAP.hexes?.[p?.hex]?.region;
    const regionLabel=region==='cursed'?'Проклятые территории':region==='heart_of_darkness'?'Сердце тьмы':'Территории королевства';
    const escaped=v=>escapeCombatText(v);
    const img=`assets/locations/${shade}-${kind}.webp`;
    // v0.6.75: mirror the live status labels beside the square location artwork
    // on narrow screens. The canonical labels inside loc-scroll remain for PC.
    const statusMatch=content.match(/<div class="loc-pills">([\s\S]*?)<\/div>/);
    const mobileStatus=statusMatch?`<div class="loc-mobile-status loc-pills" aria-label="Сведения о герое">${statusMatch[1]}</div>`:'';
    return `<div class="location-ui loc-${kind} ${cursed?'loc-cursed':''}">
      <div class="loc-art"><div class="loc-art-frame"><img src="${img}" alt="${escaped(actual)}" onerror="this.hidden=true"></div>
        ${mobileStatus}

      </div>
      <div class="loc-panel"><div class="loc-head"><div><div class="loc-kicker">ПОСТОЯННАЯ ЛОКАЦИЯ${cursed?' · ПРОКЛЯТАЯ':''}</div><h2>${escaped(title||actual)}</h2></div><button type="button" class="loc-close" title="Закрыть" aria-label="Закрыть">×</button></div>
        <div class="loc-scroll" tabindex="0">${content}</div><div class="loc-footer">${footer}</div>
      </div></div>`;
  }
  function locationStatusPills(parts){return `<div class="loc-pills">${parts.map(([label,value])=>`<span>${label}: <b>${escapeCombatText(value)}</b></span>`).join('')}</div>`}
  function locationActivateClose(kind){
    const b=els.modalContent.querySelector('.loc-close');if(!b)return;
    if(kind==='merchant')b.onclick=()=>document.getElementById('merchantDone')?.click();
    else if(kind==='tavern')b.onclick=()=>document.getElementById('tavernClose')?.click();
    else {b.disabled=true;b.title='Выберите действие или нажмите «Готово»';}
  }
  function showCard(card,extra='',actions=[]){
    modalOffturnOwnerId=null;modalCloseAction=null;
    const escapeText=v=>escapeCombatText(v);
    const entries=displayCardFieldEntries(card);
    const fields=entries.map(([k,v])=>`<div class="card-field"><b>${escapeText(k)}:</b> ${escapeText(v).replace(/\n/g,'<br>')}</div>`).join('');
    if(card?.locationVisualKind==='shrine'){
      const meta=card.locationVisualInfo||{},p=getPlayer(meta.playerId)||currentPlayer();
      const choice=actions.some(a=>/Лечение · D8 ЗД|Восстановить D8|Снять негативный эффект/.test(a.label));
      const oneClean=actions.some(a=>/^Снять:/.test(a.label));
      const statusLine=(p?.statuses||[]).length?`<div class="loc-section-title">Негативные эффекты героя</div><div class="loc-status-list">${p.statuses.map(s=>`<span>${escapeText(s)}</span>`).join('')}</div>`:'';
      const detail=choice?`<div class="loc-section-title">Выберите один эффект святилища</div>
        <div class="loc-option"><span class="loc-symbol">✚</span><div><b>Восстановление здоровья</b><small>Восстановить D8 ЗД. Бросок — после выбора.</small></div></div>
        <div class="loc-option"><span class="loc-symbol">✧</span><div><b>Очищение</b><small>Снять один выбранный негативный эффект.</small></div></div>${statusLine}`:
        oneClean?`<div class="loc-section-title">Выберите один негативный эффект</div>${statusLine}<div class="loc-option"><span class="loc-symbol">✧</span><div>${extra}</div></div>`:
        `<div class="loc-section-title">Результат посещения</div><div class="loc-option loc-visit-result"><span class="loc-symbol">✦</span><div class="loc-result-line">${extra||'Эффект Святилища применён.'}</div></div>${statusLine}`;
      const summary=locationStatusPills([['Герой',p?.name||'—'],['ЗД',`${p?.currentHp??'—'}/${p?.maxHp??'—'}`],['Негативных эффектов',String(p?.statuses?.length||0)]]);
      const content=summary+detail+`<div class="loc-note">Эффекты предметов, восстанавливаемые в Святилище, перезаряжаются по существующим правилам.</div>`;
      els.modalContent.innerHTML=locationWindow('shrine',p,content,'<div id="modalActions" class="loc-action-list"></div>',{cursed:!!meta.cursed});
      locationActivateClose('shrine');
    }else if(STORY_CATEGORIES.has(card?.category)){
      const tone=storyTone(card),src=storyImageUrl(card),number=Number(card.id)||0;
      const art=src?`<img src="${src}" alt="${escapeText(card.name)}" loading="eager" decoding="async" onerror="this.hidden=true;this.parentElement.classList.add('story-art-missing')">`:'';
      els.modalContent.innerHTML=`<div class="story-card-shell story-${tone}"><div class="story-card-art ${src?'':'story-art-missing'}">${art}<div class="story-art-placeholder"><span>Иллюстрация для карты №${number} пока не загружена</span></div><div class="story-number">КАРТА №${String(number).padStart(3,'0')}</div></div><div class="story-card-info"><div class="story-card-scroller"><div class="story-kicker">${escapeText(card.category)} · ${escapeText(card.region||card.fields?.['Регион']||'')}</div><h2 class="story-title">${escapeText(card.name)}</h2><div class="story-divider"></div><div class="story-field-list">${fields}</div>${extra?`<div class="story-extra">${extra}</div>`:''}</div><div class="story-card-actions modal-actions" id="modalActions"></div></div></div>`;
    }else{
      els.modalContent.innerHTML=`<div class="card-kicker">${escapeText(card.category)} · №${escapeText(card.id)} · ${escapeText(card.deck)}</div><div class="card-title">${escapeText(card.name)}</div><div class="card-fields">${fields}</div>${extra?`<div class="card-field" style="margin-top:10px">${extra}</div>`:''}<div class="modal-actions" id="modalActions"></div>`;
    }
    const box=els.modalContent.querySelector('#modalActions');
    actions.forEach(a=>{const b=document.createElement('button');b.className=a.className||'primary';b.textContent=a.label;b.disabled=!!a.disabled;b.onclick=()=>{if(!b.disabled)a.fn()};box.appendChild(b)});
    els.modal.hidden=false;
  }
  function closeModal(){if(arcanaBattleLayer&&!arcanaBattleLayer.hidden)stopArcanaBattlePresentation();delete els.modal.dataset.lootDraft;els.modal.hidden=true;els.modal.classList.remove('post-combat-prompt');els.modalContent.innerHTML='';els.modalClose.style.display='';modalOffturnOwnerId=null;modalCloseAction=null;visibleGameOverKey=null}
  function requestModalClose(){if(modalCloseAction){const fn=modalCloseAction;modalCloseAction=null;fn();return}if(state.gameOver&&els.modalContent.querySelector('.game-over-stats')){dismissedGameOverKey=currentGameOverKey();closeModal();return}if(!state.turnLocked)closeModal()}
  const rollPopupQueue=[];
  let rollPopupAfterClose=null;
  let rollPopupDisplaySeq=0;
  let infoDiceAnimator=null, infoDiceHost=null, infoDiceToken=0;
  function presentInfoDice(x,seq){
    const popup=els.rollOverlay.querySelector('.roll-popup-card');
    if(!popup)return false;
    if(!infoDiceHost){infoDiceHost=document.createElement('div');infoDiceHost.id='rollPopupArcana';infoDiceHost.className='arcana-popup-dice';}
    els.rollPopupTitle.insertAdjacentElement('afterend',infoDiceHost);
    const dice=arcanaDiceFromRoll(x.title,x.main,x.math,x.dice);
    if(!window.FantasyDice||!dice.length){popup.classList.remove('arcana-info-active','arcana-info-rolling');infoDiceHost.hidden=true;return false;}
    infoDiceHost.hidden=false;popup.classList.add('arcana-info-active','arcana-info-rolling');document.body.classList.add('arcana-info-presenting');
    if(!infoDiceAnimator){try{infoDiceAnimator=window.FantasyDice.create({container:infoDiceHost,duration:ARCANA_DURATION,controls:false,reducedMotion:'auto'});}catch(err){console.warn('Info dice:',err);popup.classList.remove('arcana-info-active','arcana-info-rolling');return false;}}
    const stamp=++infoDiceToken;
    const formula=dicePlainText(x.math);
    const summary=([formula,dicePlainText(x.detail)].filter(Boolean).join(' · ')||String(x.main)).slice(0,125);
    const parsedFinal=formula.match(/=\s*(-?\d+)\s*$/);
    const resultNumber=parsedFinal?Number(parsedFinal[1]):Number(x.main);
    const breakdown=Number.isFinite(resultNumber)?{kind:'result',formula,total:resultNumber}:null;
    // Dice animation is visual only: all values were already resolved by game logic.
    try{Promise.resolve(infoDiceAnimator.play({id:'info-'+stamp,label:String(x.title||'Бросок'),dice,total:summary,...(breakdown?{breakdown}:{})}))
      .then(()=>{if(infoDiceToken===stamp&&rollPopupDisplaySeq===seq){popup.classList.remove('arcana-info-rolling');document.body.classList.remove('arcana-info-presenting');els.rollPopupClose.disabled=false;}})
      .catch(()=>{if(infoDiceToken===stamp&&rollPopupDisplaySeq===seq){popup.classList.remove('arcana-info-rolling');document.body.classList.remove('arcana-info-presenting');els.rollPopupClose.disabled=false;}})}
    catch(err){console.warn('Info dice play:',err);popup.classList.remove('arcana-info-rolling');return false}
    return true;
  }

  function showRollPopup(title,main,math='',detail='',natural=null,onClose=null,buttonLabel='Продолжить',autoContinue=false,visualHeroId=null){
    rollPopupQueue.push({title,main:String(main),math,detail,natural,onClose,buttonLabel,autoContinue,visualHeroId});if(els.rollOverlay.hidden)showNextRollPopup();
  }
  function showNextRollPopup(){
    const x=rollPopupQueue.shift();if(!x){document.body.classList.remove('arcana-info-presenting');els.rollOverlay.hidden=true;els.rollOverlay.classList.remove('battle-results-popup','battle-results-illustrated');if(infoDiceHost)infoDiceHost.hidden=true;els.rollOverlay.querySelector('.roll-popup-card')?.classList.remove('arcana-info-active','arcana-info-rolling');rollPopupAfterClose=null;els.rollPopupClose.textContent='Продолжить';return}
    els.rollOverlay.classList.toggle('battle-results-popup',x.title==='Результаты боя');
    const visualHeroId=BATTLE_RESULT_HERO_IDS.has(x.visualHeroId)?x.visualHeroId:null;
    const outcomeArt=els.rollOverlay.querySelector('#rollPopupOutcomeArt');
    const outcomeImg=els.rollOverlay.querySelector('#rollPopupOutcomeImage');
    els.rollOverlay.classList.toggle('battle-results-illustrated',x.title==='Результаты боя'&&!!visualHeroId);if(visualHeroId)els.rollOverlay.style.setProperty('--result-hero-color',getPlayer(visualHeroId)?.color||'#bc9960');else els.rollOverlay.style.removeProperty('--result-hero-color');
    if(outcomeArt&&outcomeImg){outcomeArt.hidden=!visualHeroId;if(visualHeroId){outcomeImg.src=`assets/results/${visualHeroId}-victory.webp`;outcomeImg.alt='Иллюстрация победы героя';}else outcomeImg.removeAttribute('src');}
    els.rollPopupTitle.textContent=x.title||'Бросок';
    els.rollPopupMain.textContent=x.main;
    els.rollPopupMain.className='roll-popup-main'+(x.natural===20?' natural20':x.natural===1?' natural1':'');
    els.rollPopupMath.innerHTML=x.math||'';
    els.rollPopupDetail.innerHTML=x.detail||'';
    els.rollPopupClose.textContent=x.buttonLabel||'Продолжить';
    els.rollPopupClose.disabled=false;
    rollPopupAfterClose=typeof x.onClose==='function'?x.onClose:null;
    els.rollOverlay.hidden=false;
    // Purely informational dice popups never require an extra click in combat.
    // Results, choices and popups with a continuation callback still wait for the user.
    const seq=++rollPopupDisplaySeq;
    if(infoDiceHost)infoDiceHost.hidden=true;
    const animated=x.title!=='Результаты боя'&&presentInfoDice(x,seq);
    if(animated)els.rollPopupClose.disabled=true;
    else {document.body.classList.remove('arcana-info-presenting');els.rollOverlay.querySelector('.roll-popup-card')?.classList.remove('arcana-info-active','arcana-info-rolling')}
    if(x.autoContinue||(state.combat&&localControlsCombat()&&!rollPopupAfterClose&&x.title!=='Результаты боя')){
      setTimeout(()=>{if(seq===rollPopupDisplaySeq&&!els.rollOverlay.hidden&&!els.rollPopupClose.disabled&&(x.autoContinue||(state.combat&&localControlsCombat())))els.rollPopupClose?.click()},animated?ARCANA_DURATION+ARCANA_RESULT_HOLD:ARCANA_RESULT_HOLD);
    }

  }
  function announceCheck(title,d,statLabel,bonus,total,dc,ok,natural=null,extra='',onClose=null){
    recordNatural(currentPlayer(),natural);
    showRollPopup(title,d,`D20 <b>${d}</b> ${signed(bonus)} ${statLabel} = <b>${total}</b>`,`Сложность ${dc} · <b>${ok?'УСПЕХ':'ПРОВАЛ'}</b>${natural?` · Натуральная ${natural}`:''}${extra?`<br>${extra}`:''}`,natural,onClose);
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
    const hasAmulet=Number(getSlotId(p,'amulet'))===176;
    const hasTracker=Number(getSlotId(p,'mercenary'))===198&&p.trackerUsedTurn!==p.personalTurn;
    if(!hasAmulet&&!hasTracker)return false;
    // Эффект амулета действует перед КАЖДЫМ исследованием в любом регионе.
    // Следопыт-наёмник сохраняет собственное ограничение один раз за личный ход.
    const next=peekExploreTop(deckKey);if(!next)return false;
    const tracker=itemCard(hasAmulet?176:198);if(!hasAmulet)p.trackerUsedTurn=p.personalTurn;
    const preview=`<div class="recon-preview"><div class="card-kicker">Верхняя карта · №${next.id}</div><div class="card-title">${next.name}</div><div class="card-fields">${itemFieldsHtml(next)}</div></div>`;
    showCard(tracker,`<b>${hasAmulet?'Амулет следопыта':'Следопыт'}</b> позволяет посмотреть верхнюю карту выбранной колоды исследования в любом регионе.${hasAmulet?'':' Эффект наёмника действует один раз за личный ход.'}<br>${preview}<br><b>Сыграть карту или замешать её обратно?</b>`,[
      {label:'Сыграть',className:'success',fn:()=>{const d=state.decks[deckKey];if(d.draw[d.draw.length-1]===next.id)d.draw.pop();closeModal();log(`${tracker.name} · ${p.name}: сыграна верхняя карта №${next.id} «${next.name}».`);log(`Открыта карта №${next.id} «<b>${next.name}</b>» (${next.category}).`);resolveExploreCard(next)}},
      {label:'Замешать обратно',className:'secondary',fn:()=>{state.decks[deckKey].draw=shuffled(state.decks[deckKey].draw);closeModal();log(`${tracker.name} · ${p.name}: верхняя карта «${next.name}» замешана обратно в ${DECK_NAMES[deckKey]}.`);setTimeout(drawNextExplore,80)}}
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
    const p=currentPlayer(),boostId=key==='dex'?170:key==='str'?171:null;
    const canBoost=!!boostId&&combatHasEquipped(p,boostId)&&p.itemUsage?.[boostId]?.turn!==p.personalTurn;
    const armed=state.trapBonus?.cardId===card.id;
    const actions=[];
    if(canBoost||armed)actions.push({label:armed?'✓ +3 к проверке применено':'+3 к проверке',className:'secondary',disabled:armed,fn:()=>{
      if(!canBoost||state.trapBonus?.cardId===card.id)return;
      state.trapBonus={cardId:card.id,id:boostId,bonus:3};p.itemUsage=p.itemUsage||{};p.itemUsage[boostId]={turn:p.personalTurn};
      log(`${p.name} применяет ${itemCard(boostId)?.name||'бонус'}: +3 к проверке.`);resolveTrap(card);updateUI();
    }});
    actions.push({label:`Проверка · ${label} ${dc}+`,className:'success',fn:()=>performTrapCheck(card)});
    showCard(card,prep,actions);
  }
  function performTrapCheck(card,options={}){
    const p=currentPlayer(),ex=state.exploration,deckKey=ex?.deckKey,check=card.fields['Проверка']||'',key=statKeyFromText(check),dc=Number((check.match(/(\d+)\+/)||[])[1]||13);
    const pending=state.trapBonus?.cardId===card.id?state.trapBonus:null;let bonus=options.reroll?Number(options.bonusOverride||0):(key?effectiveStat(p,key):0)+(pending?.bonus||0);if(!options.reroll)state.trapBonus=null;
    let d20=rand(20),total=d20+bonus,natural=d20===20?20:d20===1?1:null,ok=natural===20?true:natural===1?false:total>=dc;
    // Cloak reroll is a real in-game choice AFTER the failed roll animation, never a browser prompt.

    const outcome=String(ok?(card.fields['Успех']||'Ловушка пройдена без последствий.'):(card.fields['Провал']||'Проверка провалена.'));
    const damageExpr=(outcome.match(/(D(?:4|6|8|10|12|20))\s+урона/i)||[])[1]||null;
    const damageRoll=damageExpr?rollDiceText(damageExpr):0;
    const criticalRoll=natural===1?rand(6):0;
    log(`${p.name}: ловушка «${card.name}» — D20 ${d20} + ${key?statName(key):'?'} ${signed(bonus)} = ${total} против ${dc}: <b>${ok?'успех':'провал'}</b>.`);
    // Gameplay effects and even death are delayed until the player has seen the check
    // and the damage animations. This is crucial on both mobile and network clients.
    const finishTrap=()=>{
      if(!state.exploration)return;recordNatural(p,natural);
      if(!ok)state.exploration.failedTrap=true;
      const effectResult=applyEffectText(p,outcome,deckKey,{skipDamage:true})||{};
      if(!ok)addTrapFutureEffect(p,card);
      if(natural===20){
        if(card.id===101){p.combatEffects.push({type:'nextBattleFirstDamageMultiplier',amount:2,label:card.name,sourceCardId:card.id});log(`${p.name}: Натуральная 20 «${card.name}» — первый урон следующего боя ×2.`)}
        else{const loot=drawCard(deckKey==='exploreHeart'?'lootHeart':'lootOuter');if(loot){receiveTreasure(p,loot);log(`${p.name}: Натуральная 20 на ловушке — найден тайник №${loot.id} «${loot.name}».`)}}
      }
      let incoming=damageRoll+criticalRoll,mitigation=0;
      if(incoming>0&&combatHasEquipped(p,195)&&!useBlocked(p,195)){mitigation=incoming;useMark(p,195,'shrine');log(`${p.name}: Оберег выжившего предотвращает урон ловушки.`)}
      const accept=()=>{
        const applied=Math.max(0,incoming-mitigation);
        if(applied>0){recordDamageTaken(p,applied);p.currentHp-=applied;log(`${p.name} получает ${applied} урона от ловушки.`)}
        if(p.currentHp<=0){handleDeath(p);return}
        const summary=`<b>${ok?'УСПЕХ':'ПРОВАЛ'}</b>. ${outcome}${criticalRoll?`<br>Натуральная 1: дополнительно ${criticalRoll} урона.`:''}${incoming?`<br>Итого получено <b>${applied} урона</b>${mitigation?` (защита уменьшила на ${mitigation})`:''}.`:''}${effectResult.statusesAdded?.length?`<br>Наложено: <b>${effectResult.statusesAdded.join(', ')}</b>.`:''}`;
        updateUI();if(!els.sheetDrawer.hidden&&sheetView.playerId===p.id)renderCharacterSheet(sheetView.mode,sheetView.bonusKey);
        if(p.pendingItems.length){showCard(card,summary+'<br>Найденный тайник можно разобрать перед продолжением.',[{label:'Разобрать тайник',className:'success',fn:()=>pauseExploreForPendingLoot(card,deckKey)}])}
        else showCard(card,summary,[{label:'Продолжить исследование',className:'success',fn:()=>continueExplore(card,deckKey)}]);
      };
      if(incoming>mitigation&&combatHasEquipped(p,165)){
        const reduced=rollDiceText('D4');mitigation+=Math.min(reduced,incoming-mitigation);
        showRollPopup('Кольцо стойкости · защита',reduced,`D4 = <b>${reduced}</b>`,`Урон уменьшен на ${Math.min(reduced,incoming)}.`,null,accept,'Продолжить',true);return;
      }
      accept();
    };
    const showCritical=()=>criticalRoll?showRollPopup('Ловушка · Натуральная 1',criticalRoll,`D6 = <b>${criticalRoll}</b>`,'Дополнительный урон',null,finishTrap,'Продолжить',true):finishTrap();
    const showDamage=()=>damageExpr?showRollPopup(`Ловушка · урон`,damageRoll,`${damageExpr} = <b>${damageRoll}</b>`,'Урон за провал проверки',null,showCritical,'Продолжить',true):showCritical();
    const canCloakReroll=!ok&&!options.reroll&&combatHasEquipped(p,163)&&p.itemUsage?.[163]?.turn!==p.personalTurn;
    const afterResult=()=>{
      if(!canCloakReroll){showDamage();return}
      showCard(card,`<b>ПРОВАЛ</b> проверки D20: ${d20} ${signed(bonus)} = ${total}, нужно ${dc}+. Плащ Тени №163 позволяет перебросить проверку один раз.`,[
        {label:'Перебросить · Плащ Тени',className:'success',fn:()=>{p.itemUsage=p.itemUsage||{};p.itemUsage[163]={turn:p.personalTurn};log(`${p.name}: Плащ Тени №163 — повторная проверка.`);performTrapCheck(card,{reroll:true,bonusOverride:bonus})}},
        {label:'Принять результат',className:'secondary',fn:()=>{closeModal();showDamage()}}
      ]);
    };
    closeModal();
    showRollPopup(`Ловушка · ${key?statName(key):'проверка'}`,d20,`D20 ${d20} ${signed(bonus)} ${key?statName(key):''} = <b>${total}</b>`,`Сложность ${dc} · <b>${ok?'УСПЕХ':'ПРОВАЛ'}</b>`,natural,afterResult,'Продолжить',false);
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
  // v0.6.82: the card is revealed BEFORE the player initiates a check. The
  // result is shown on the same event card AFTER the dice popup has finished.
  function resolveOldCache(card){
    const p=currentPlayer();
    showCard(card,'Сначала осмотрите старый тайник. Проверка МУД 13+ определит, из какой колоды будет награда.',[
      {label:'Поиск тайника · ПРОВЕРКА МУД 13+',className:'success',fn:()=>{
        const wis=effectiveStat(p,'wis'),d=rand(20),total=d+wis,natural=d===20?20:d===1?1:null;
        const ok=d===20?true:d===1?false:total>=13;
        // Preserve the original loot and natural-20/1 rules, but defer them
        // until after the first check's animation.
        const showOutcome=()=>{
          if(!state.exploration)return;
          const lootKey=ok?'lootHeart':'lootOuter',loot=drawCard(lootKey);
          if(loot){receiveTreasure(p,loot);log(`${p.name}: «${card.name}» — ${ok?'успех':'провал'} проверки МУД 13+, получен ${DECK_NAMES[lootKey]} №${loot.id} «${loot.name}».`)}
          let extra=null;
          if(natural===20){const extraKey=explorationLootKey();extra=drawCard(extraKey);if(extra){receiveTreasure(p,extra);log(`${p.name}: Натуральная 20 — «${card.name}»: +1 тайник региона №${extra.id} «${extra.name}».`)}}
          const finish=(dmg=0)=>{
            if(p.currentHp<=0){handleDeath(p);return}
            const extraText=extra?`<br><b>Натуральная 20:</b> дополнительно получен тайник региона №${extra.id} «${extra.name}».`:dmg?`<br><b>Натуральная 1:</b> получено D6 = ${dmg} урона.`:'';
            updateUI();showCard(card,`<b>${ok?'УСПЕХ':'ПРОВАЛ'}</b>. D20 ${d} + МУД ${signed(wis)} = <b>${total}</b>.<br>Получен: <b>${ok?'Тайник Сердца тьмы':'Тайник внешних регионов'}</b>${loot?` — №${loot.id} «${loot.name}»`:''}.${extraText}`,p.pendingItems.length?[{label:'Разобрать тайник',className:'success',fn:()=>pauseExploreForPendingLoot(card,state.exploration.deckKey)}]:[{label:'Продолжить',className:'success',fn:()=>continueExplore(card,state.exploration.deckKey)}]);
          };
          if(natural===1){const dmg=rand(6);damage(p,dmg);log(`${p.name}: Натуральная 1 — «${card.name}»: D6 = ${dmg} урона.`);showRollPopup('Старый тайник · Натуральная 1',dmg,`D6 = <b>${dmg}</b>`,`Получено ${dmg} урона`,1,()=>finish(dmg),'Продолжить');}
          else finish();
        };
        closeModal();announceCheck(`Событие · ${card.name}`,d,'МУД',wis,total,13,ok,natural,ok?'Тайник Сердца тьмы':'Тайник внешних регионов',showOutcome);
      }}
    ]);
  }
  function resolveAncientHeroTracks(card){
    const p=currentPlayer(),key='lootHeart',a=drawCard(key),b=drawCard(key),cards=[a,b].filter(Boolean);
    if(!cards.length){showCard(card,'Колода Тайников Сердца тьмы пуста.',[{label:'Продолжить',fn:()=>continueExplore(card,state.exploration.deckKey)}]);return}
    showCard(card,'Посмотрите открытые Тайники Сердца тьмы. Выберите один; второй будет замешан обратно.',cards.map((c,i)=>({label:`Взять №${c.id} · ${c.name}`,className:'success',fn:()=>{receiveTreasure(p,c);const other=cards[1-i];if(other)state.decks[key].draw.push(other.id),state.decks[key].draw=shuffled(state.decks[key].draw);log(`${p.name}: «${card.name}» — выбран тайник №${c.id} «${c.name}».`);pauseExploreForPendingLoot(card,state.exploration.deckKey)}})));
  }
  function resolveCheckedEvent(card){
    const p=currentPlayer(),check=card.fields['Проверка']||'',key=statKeyFromText(check),dc=Number((check.match(/(\d+)\+/)||[])[1]||13);
    const canRing=key==='dex'&&combatHasEquipped(p,170)&&p.itemUsage?.[170]?.turn!==p.personalTurn;
    const armed=state.eventDexBonus?.cardId===card.id;
    const actions=[];
    if(canRing||armed)actions.push({label:armed?'✓ +3 к проверке применено':'+3 к проверке',className:'secondary',disabled:armed,fn:()=>{
      if(!canRing||armed)return;state.eventDexBonus={cardId:card.id,bonus:3};p.itemUsage=p.itemUsage||{};p.itemUsage[170]={turn:p.personalTurn};
      log(`${p.name}: Кольцо лёгкого шага №170 — +3 к проверке события.`);resolveCheckedEvent(card);
    }});
    actions.push({label:`Проверка · ${key?statName(key):'характеристика'} ${dc}+`,className:'success',fn:()=>performCheckedEvent(card)});
    showCard(card,'Перед проверкой можно применить доступный бонус.',actions);
  }
  function performCheckedEvent(card){
    const p=currentPlayer(),check=card.fields['Проверка']||'',key=statKeyFromText(check),dc=Number((check.match(/(\d+)\+/)||[])[1]||13);
    const bonus=(key?effectiveStat(p,key):0)+(state.eventDexBonus?.cardId===card.id?Number(state.eventDexBonus.bonus||0):0);
    state.eventDexBonus=null;
    const d=rand(20),total=d+bonus,natural=d===20?20:d===1?1:null,ok=natural===20?true:natural===1?false:total>=dc;
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
    // №115: allow the player to choose just as they do in a normal Shrine.
    // Do not auto-heal a healthy hero who needs a curse/fear removed.
    if(Number(card.id)===115){
      const cleanse=p.statuses||[],canHeal=p.currentHp<p.maxHp;
      const result=(message)=>{updateUI();showCard(card,message,[{label:'Продолжить',className:'success',fn:()=>continueExplore(card,state.exploration.deckKey)}])};
      const choose=()=>{
        const actions=[
          {label:'Восстановить D10 ЗД',className:'success',disabled:!canHeal,fn:()=>{
            const hr=rollHealing(p,'D10');closeModal();
            showRollPopup('Покой мёртвого стража · лечение',hr.total,`${hr.used} = <b>${hr.total}</b>`,'Восстановление здоровья',null,()=>{
              const healed=heal(p,hr.total);
              log(`${p.name}: «Покой мёртвого стража» — восстановлено ${healed.restored} ЗД (${hr.used}).`);
              result(`Восстановлено <b>${healed.restored}</b> ЗД (${escapeCombatText(hr.used)})`);
            },'Продолжить');
          }},
          {label:'Снять негативный эффект',className:'danger',disabled:!cleanse.length,fn:()=>{
            showCard(card,'Выберите один негативный эффект:',(p.statuses||[]).map(st=>({label:`Снять: ${st}`,className:'danger',fn:()=>{
              removeStatus(p,st);log(`${p.name}: «Покой мёртвого стража» — снят эффект «${st}».`);
              result(`Снят негативный эффект: <b>${escapeCombatText(st)}</b>.`);
            }})).concat([{label:'Назад',className:'secondary',fn:choose}]));
          }},
          {label:'Продолжить без эффекта',className:'secondary',fn:()=>continueExplore(card,state.exploration.deckKey)}
        ];
        showCard(card,'Выберите одно действие карты. Лечение и очищение применяются только по выбору героя.',actions);
      };
      choose();return;
    }
    if(card.fields['Проверка']){resolveCheckedEvent(card);return}
    if(NON_STACKING_EVENT_EFFECTS.has(card.name)){const duplicate=(p.combatEffects||[]).some(e=>Number(e.sourceCardId)===Number(card.id)||e.label===card.name);if(duplicate){log(`${p.name}: дубль карты «${card.name}» — эффект уже активен и не суммируется.`);updateUI();showCard(card,`<b>Дубль карты «${card.name}».</b><br>Этот эффект уже есть у героя и не суммируется. Новая копия эффекта пропущена.`,[{label:'Продолжить',className:'success',fn:()=>continueExplore(card,state.exploration.deckKey)}]);return}const note=addNextBattleEventEffect(p,card);log(`${p.name}: «${card.name}» — ${note}`);updateUI();showCard(card,`<b>Эффект применён к герою.</b><br>${note}<br>Он будет виден в листе героя до начала следующего боя.`,[{label:'Продолжить',className:'success',fn:()=>continueExplore(card,state.exploration.deckKey)}]);return}
    // v0.6.84: Prayer Stone always offers a choice BEFORE resolving an effect.
    // Rendering uses a descriptive view card; the deck itself is not modified.
    if(card.name==='Молитвенный камень'){
      const displayCard={...card,fields:{...card.fields,'Эффект':'Выберите одно действие: снять Страх или Проклятие либо восстановить D6 ЗД.'}};
      const result=message=>{
        updateUI();
        showCard(displayCard,message,[{label:'Продолжить',className:'success',fn:()=>continueExplore(card,state.exploration.deckKey)}]);
      };
      const choose=()=>{
        const removable=(p.statuses||[]).filter(s=>s==='Страх'||s==='Проклятие');
        const canHeal=p.currentHp<p.maxHp;
        showCard(displayCard,'Выберите действие «Молитвенного камня»:',[
          {label:'Снять негативный эффект',className:'danger',disabled:!removable.length,fn:()=>{
            const effects=(p.statuses||[]).filter(s=>s==='Страх'||s==='Проклятие');
            showCard(displayCard,'Какой негативный эффект снять?',effects.map(s=>({
              label:`Снять: ${s}`,className:'danger',fn:()=>{
                removeStatus(p,s);
                log(`${p.name}: «Молитвенный камень» — снят эффект «${s}».`);
                result(`Снят негативный эффект: <b>${escapeCombatText(s)}</b>.`);
              }
            })).concat([{label:'Назад',className:'secondary',fn:choose}]));
          }},
          {label:'Лечение · D6 ЗД',className:'success',disabled:!canHeal,fn:()=>{
            if(p.currentHp>=p.maxHp)return choose();
            const hr=rollHealing(p,'D6');
            closeModal();
            showRollPopup('Молитвенный камень · лечение',hr.total,`${hr.used} = <b>${hr.total}</b>`,'Восстановление ЗД',null,()=>{
              const healed=heal(p,hr.total);
              log(`${p.name}: «Молитвенный камень» — восстановлено ${healed.restored} ЗД (${hr.used}).`);
              result(`Восстановлено <b>${healed.restored} ЗД</b> (${escapeCombatText(hr.used)}).`);
            },'Продолжить');
          }},
          {label:'Закрыть',className:'secondary',fn:()=>continueExplore(card,state.exploration.deckKey)}
        ]);
      };
      choose();return;
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

  function maybeOfferHeartCompass(p,card,kind,firstD20,firstTotal,wasSuccessful,bonus,resolveRoll){
    if(wasSuccessful||Number(getSlotId(p,'artifact'))!==264)return false;
    showCard(card,`<b>Сердечный компас №264</b>: ${kind} провалено (D20 ${firstD20} ${signed(bonus)} = ${firstTotal}).<br>Перебросить D20? Второй результат обязателен: он полностью заменит первый, в том числе натуральную 1 или 20.`,[
      {label:'Использовать компас · переброс D20',className:'success',fn:()=>{
        const reroll=rand(20),sum=reroll+bonus,success=reroll===20?true:reroll===1?false:sum>=14;
        log(`${p.name}: Сердечный компас №264 — переброс ${kind}: D20 ${firstD20} → <b>${reroll}</b>. Новый результат ${sum}, ${success?'успех':'провал'}.`);
        resolveRoll(reroll,sum,success);
      }},
      {label:'Не использовать · принять провал',className:'secondary',fn:()=>resolveRoll(firstD20,firstTotal,false)}
    ]);
    return true;
  }

  function resolveCursedStep(card){
    const p=currentPlayer();
    // The illustrated event card is shown BEFORE any dice are rolled.
    const performCheck=()=>{
      const wis=effectiveStat(p,'wis'),d20=rand(20),total=d20+wis,ok=d20===20?true:d20===1?false:total>=14;
    const resolveRoll=(roll,sum,success)=>{
      const natural=roll===20?20:roll===1?1:null,has=p.statuses.includes('Проклятие');
      announceCheck('Проклятый шаг',roll,'МУД',wis,sum,14,success,natural);
      if(success){if(has){removeStatus(p,'Проклятие');log(`${p.name}: Проклятие снято.`)}}
      else if(has){const dmg=rand(6);damage(p,dmg);showRollPopup('Проклятый шаг · урон',dmg,`D6 = ${dmg}`,`ЗД ${Math.max(0,p.currentHp)}/${p.maxHp}`);log(`${p.name}: провал Проклятого шага, ${dmg} урона.`)}
      else addStatus(p,'Проклятие');
      if(natural===1&&p.currentHp>0){const extra=rand(6);damage(p,extra);showRollPopup('Проклятый шаг · Натуральная 1',extra,`D6 = ${extra}`,'Дополнительный урон');log(`${p.name}: Натуральная 1 Проклятого шага — дополнительно ${extra} урона.`)}
      const finish=()=>showCard(card,`D20 ${roll} + МУД ${signed(wis)} = <b>${sum}</b>. ${success?'Успех':'Провал'}.`,[{label:'Продолжить',fn:()=>continueExplore(card,state.exploration.deckKey)}]);
      if(natural===20&&p.currentHp>0){const options=[...p.statuses];if(options.length){showCard(card,'Натуральная 20: проверка успешна. Дополнительно снимите 1 негативный эффект:',options.map(st=>({label:`Снять: ${st}`,className:'success',fn:()=>{removeStatus(p,st);log(`${p.name}: Натуральная 20 Проклятого шага — снят эффект «${st}».`);finish()}})));return}}
      if(state.exploration&&p.currentHp>0)finish();
    };
      if(maybeOfferHeartCompass(p,card,'Проклятый шаг',d20,total,ok,wis,resolveRoll))return;
      resolveRoll(d20,total,ok);
    };
    showCard(card,'Перед вами Проклятый шаг. Для разрешения события выполните проверку МУД 14+.',[
      {label:'ПРОВЕРКА МУД 14+',className:'success',fn:()=>{closeModal();performCheck()}}
    ]);
  }
  function resolveDarkTrial(card){
    const p=currentPlayer();showStatChoice(card,14,'Тёмное испытание',(key,d20,total,ok)=>{
      const bonus=effectiveStat(p,key);
      const resolveRoll=(roll,sum,success)=>{
        const natural=roll===20?20:roll===1?1:null;
        announceCheck('Тёмное испытание',roll,statName(key),bonus,sum,14,success,natural);
        if(!success){
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
        showCard(card,`Выбрано: ${statName(key)}. D20 ${roll} ${signed(bonus)} = <b>${sum}</b>. ${success?'Успех':'Провал'}.`,[{label:'Продолжить',fn:()=>continueExplore(card,state.exploration.deckKey)}]);
      };
      if(maybeOfferHeartCompass(p,card,'Тёмное испытание',d20,total,ok,bonus,resolveRoll))return;
      resolveRoll(d20,total,ok);
    });
  }
  function showStatChoice(card,dc,title,callback){
    showCard(card,`${title}. Выбери характеристику для проверки ${dc}+:`,['str','dex','wis','cha'].map(k=>({label:`${statName(k)} (${signed(effectiveStat(currentPlayer(),k))})`,fn:()=>{const p=currentPlayer(),bonus=effectiveStat(p,k),d=rand(20),t=d+bonus,ok=d===20?true:d===1?false:t>=dc;callback(k,d,t,ok)}})));
  }
  function resolveEnemy(card){ combatStart(card); }

  function applyTreasureImmediate(p,card){const eff=card.fields['Эффект']||'';const m=eff.match(/получи\s+(\d+)\s+золота/i);if(m){gainGold(p,Number(m[1]));log(`Тайник «${card.name}»: +${m[1]} золота.`)}}
  function applyEffectText(p,text,sourceDeckKey=null,options={}){
    const result={damage:0,healing:0,statusesAdded:[]};
    if(!text)return result; let m;
    if((m=text.match(/получи\s+(\d+)\s+золота/i))){gainGold(p,Number(m[1]));log(`${p.name} получает ${m[1]} золота.`)}
    if((m=text.match(/восстанови\s+(D\d+)\s+ЗД/i))){const hr=rollHealing(p,m[1]),healed=heal(p,hr.total);result.healing+=healed.restored;log(`${p.name} восстанавливает ${healed.restored} ЗД (${hr.used}${hr.reduced?', Проклятие уменьшило лечение':''}).`)}
    if(!options.skipDamage&&(m=text.match(/(D\d+)\s+урона/i))){const v=rollDiceText(m[1]);result.damage+=v;const died=damage(p,v);log(`${p.name} получает ${v} урона.`);if(died)return result}
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
  // v0.6.76: only change the presentation of battle outcomes; no impact on battle rules.
  const BATTLE_RESULT_HERO_IDS=new Set(['warrior','dwarf','mage','archer','rogue']);
  function battleOutcomeImage(hero,type){return BATTLE_RESULT_HERO_IDS.has(hero?.id)&&['victory','defeat'].includes(type)?`assets/results/${hero.id}-${type}.webp`:''}
  function battleFateArt(hero,type){const src=battleOutcomeImage(hero,type);return `<div class="battle-fate-art"><img src="${src}" alt="${escapeCombatText(hero?.name||'Герой')} · ${type==='victory'?'Победа':'Поражение'}" onerror="this.hidden=true" /></div>`;}
  function showDefeatPopup(p,enemy,loss,turnEnded=false){
    rollPopupQueue.length=0;rollPopupAfterClose=null;if(els.rollOverlay)els.rollOverlay.hidden=true;
    const source=enemy?`<b class="fate-hero-name">${escapeCombatText(p.name.toUpperCase())}</b> пал от <b class="defeat-enemy-rank ${enemyRankClass(enemy)}">${escapeCombatText(ENEMY_GENITIVE[enemy.id]||enemy.name)}</b>.`:`<b class="fate-hero-name">${escapeCombatText(p.name.toUpperCase())}</b> пал.`;
    modalOffturnOwnerId=p.id;modalCloseAction=null;
    els.modalContent.innerHTML=`<div class="battle-fate battle-fate-defeat" style="--result-hero-color:${p.color||'#a279c1'}">${battleFateArt(p,'defeat')}
      <div class="battle-fate-right"><div class="battle-fate-scroll"><h2>Результаты боя</h2><div class="battle-fate-kicker">ПОРАЖЕНИЕ</div>
        <div class="battle-fate-info">${source}</div><div class="battle-fate-info battle-fate-gold">Потеряно золота: <b>${loss}</b></div>
        <div class="battle-fate-note">Герой возвращается в лагерь залечивать раны.</div></div>
        <div class="battle-fate-footer"><button id="defeatContinue" type="button" class="success">Продолжить</button></div></div></div>`;
    els.modal.hidden=false;document.getElementById('defeatContinue').onclick=closeModal;
  }
  function gameOverStats(p){
    ensurePlayerStats(p);const e=p.stats.enemies||{},territories=Object.values(state.territories||{}).filter(t=>t.owner===p.id).length,areas=(state.areas||[]).filter(a=>a.owner===p.id).length;
    const totalEnemies=['weak','normal','strong','elite','boss'].reduce((s,k)=>s+Number(e[k]||0),0);
    return{turns:p.personalTurn,totalEnemies,weak:e.weak||0,normal:e.normal||0,strong:e.strong||0,elite:e.elite||0,boss:e.boss||0,goldEarned:p.stats.goldEarned||0,currentGold:p.gold,territories,areas,defeats:p.stats.defeats||0,damageDealt:p.stats.damageDealt||0,damageTaken:p.stats.damageTaken||0,natural20:p.stats.natural20||0,natural1:p.stats.natural1||0,lootFound:p.stats.lootFound||0,distanceTravelled:p.stats.distanceTravelled||0,locationVisitsTotal:p.stats.locationVisitsTotal||0,playerTrades:p.stats.playerTrades||0,bossAttempts:p.stats.bossAttempts||0,legacyIncomplete:!!p.stats.legacyIncomplete,extendedLegacyIncomplete:!!p.stats.extendedLegacyIncomplete};
  }
  function showGameOverPopup(p,{force=false}={}){
    if(!p)return;
    const key=currentGameOverKey();
    if(!force&&key&&dismissedGameOverKey===key)return;
    if(!force&&!els.modal.hidden&&key&&visibleGameOverKey===key&&els.modalContent.querySelector('.game-over-stats'))return;
    visibleGameOverKey=key;
    const s=gameOverStats(p);const winner=getPlayer(state.gameOver?.winnerId)||p;modalCloseAction=null;modalOffturnOwnerId=null;rollPopupQueue.length=0;rollPopupAfterClose=null;if(els.rollOverlay)els.rollOverlay.hidden=true;closeCharacterSheet();
    const legacy=s.legacyIncomplete?`<div class="notice compact-notice"><b>Важно:</b> эта партия была начата до v0.5.17. Ходы, территории и области восстановлены из сохранения, но исторические счётчики побед, заработанного золота и поражений учитываются только с момента перехода на новую систему статистики.</div>`:'';
    const extendedLegacy=s.extendedLegacyIncomplete?`<div class="notice compact-notice"><b>Дополнительная статистика:</b> партия была начата до v0.5.18, поэтому урон, натуральные броски, тайники, расстояние, посещения, сделки и попытки босса считаются только с момента перехода на v0.5.18.</div>`:'';
    const tabs=`<div class="game-over-hero-tabs" role="group" aria-label="Статистика персонажей">${state.players.map(hero=>`<button type="button" class="${hero.id===p.id?'active':''}" data-stats-hero="${hero.id}">${hero.name}</button>`).join('')}</div>`;
    els.modalContent.innerHTML=`<div class="card-kicker">ПАРТИЯ ЗАВЕРШЕНА</div><div class="card-title" style="color:${winner.color}">${winner.name} победил Владыку Сердца Тьмы!</div><h3>Статистика: ${p.name}</h3>${tabs}<div class="game-over-stats"><div><small>Личных ходов</small><b>${s.turns}</b></div><div><small>Врагов побеждено</small><b>${s.totalEnemies}</b></div><div><small>Золота заработано</small><b>${s.goldEarned}</b></div><div><small>Золота осталось</small><b>${s.currentGold}</b></div><div><small>Территорий</small><b>${s.territories}</b></div><div><small>Областей</small><b>${s.areas}</b></div><div><small>Поражений</small><b>${s.defeats}</b></div><div><small>Раунд партии</small><b>${state.round}</b></div><div><small>Нанесено урона</small><b>${s.damageDealt}</b></div><div><small>Получено урона</small><b>${s.damageTaken}</b></div><div><small>Натуральных 20</small><b>${s.natural20}</b></div><div><small>Натуральных 1</small><b>${s.natural1}</b></div><div><small>Найдено тайников</small><b>${s.lootFound}</b></div><div><small>Пройдено гексов</small><b>${s.distanceTravelled}</b></div><div><small>Посещений локаций</small><b>${s.locationVisitsTotal}</b></div><div><small>Сделок с игроками</small><b>${s.playerTrades}</b></div><div><small>Попыток босса</small><b>${s.bossAttempts}</b></div></div><h3>Побеждённые враги</h3><div class="game-over-enemies"><span>Слабых: <b>${s.weak}</b></span><span>Обычных: <b>${s.normal}</b></span><span>Сильных: <b>${s.strong}</b></span><span>Элитных: <b>${s.elite}</b></span><span>Боссов: <b>${s.boss}</b></span></div>${legacy}${extendedLegacy}<div class="modal-actions"><button id="gameOverClose" class="success">Закрыть статистику</button></div>`;
    els.modal.hidden=false;els.modalClose.style.display='';els.modalContent.querySelectorAll('[data-stats-hero]').forEach(b=>b.onclick=()=>showGameOverPopup(getPlayer(b.dataset.statsHero),{force:true}));document.getElementById('gameOverClose').onclick=()=>{dismissedGameOverKey=key;closeModal()};
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
    // Sanctuary interaction must remain owned by its visitor until the player closes
    // the result. The server must not hand off the main turn when the location opens.
    const shrineVisit=loc.name==='Святилище';
    let visitCompleted=false;
    if(shrineVisit&&handed)beginSideInteraction(p,'location',[p.id]);
    const done=()=>{
      if(visitCompleted)return;
      visitCompleted=true;
      if(shrineVisit&&handed){
        const visitor=getPlayer(p.id)||p;
        endSideInteraction();
        onDone();
        if(currentPlayer()?.id===visitor.id)advanceTurnState(visitor,'посещение Святилища');
        else {state.turnLocked=false;updateUI();renderBoard()}
        return;
      }
      if(!handed)state.turnLocked=false;onDone();if(handed)endSideInteraction();updateUI();renderBoard()
    };
    const handoff=()=>{if(handed)advanceTurnWithSideInteraction(p,'location',`посещение постоянной локации «${loc.name}»`,[p.id])};
    if(loc.name==='Таверна'){visitTavern(p,{mode:'normal',roll:null,total:null,natural:null,title:'Таверна'},done);handoff();return}
    const result=locationMode(p,hex,loc.name);
    if(loc.name==='Святилище'){visitShrine(p,result,done);return}
    if(loc.name==='Торговец'){visitMerchant(p,result,done);handoff();return}
    done();if(handed)advanceTurnState(p,`посещение постоянной локации «${loc.name}»`);
  }

  function visitShrine(p,result,onDone){
    resetItemUsage(p,'shrine');
    const fake={locationVisualKind:'shrine',locationVisualInfo:{playerId:p.id,cursed:MAP.hexes?.[p.hex]?.region==='cursed'},id:'—',name:result.title||'Святилище',category:'Постоянная локация',deck:'Поле',fields:{
      'Обычный':'выбери одно: восстанови D8 ЗД ИЛИ сними 1 негативный эффект.',
      'Проклятый':'восстанови D6 ЗД.',
      'Натуральная 20':'полностью восстанови ЗД; сними все негативные эффекты.',
      'Натуральная 1':'лечение 0; получи Проклятие; эффекты не снимаются.'
    }};
    if(result.natural===20){const before=p.currentHp,removed=[...p.statuses];p.currentHp=p.maxHp;p.statuses=[];p.statusTimers={};p.statusTickedTurn={};log(`${p.name}: Святилище, <b>натуральная 20</b> — полностью восстанавливает ЗД и снимает все негативные эффекты.`);showCard(fake,`ЗД: ${before} → <b>${p.currentHp}</b>.<br>${removed.length?`Сняты эффекты: <b>${removed.join(', ')}</b>.`:'Негативных эффектов не было.'}`,[{label:'Готово',className:'success',fn:()=>{closeModal();onDone()}}]);return}
    if(result.natural===1){addStatus(p,'Проклятие');log(`${p.name}: Святилище, <b>натуральная 1</b> — лечение 0, негативные эффекты не снимаются.`);showCard(fake,'Натуральная 1: лечение не получено. Герой получает Проклятие; негативные эффекты не снимаются.',[{label:'Готово',fn:()=>{closeModal();onDone()}}]);return}
    if(result.mode==='cursed'){
      const hr=rollHealing(p,'D6'),v=hr.total;closeModal();showRollPopup('Святилище · лечение',v,`${hr.used} = <b>${v}</b>`,'Лечение',null,()=>{const healed=heal(p,v);log(`${p.name} посещает проклятое Святилище и восстанавливает ${healed.restored} ЗД (${hr.used}).`);updateUI();showCard(fake,`Проклятый эффект: восстановлено <b>${healed.restored} ЗД</b>.`,[{label:'Готово',className:'success',fn:()=>{closeModal();onDone()}}])});return;
    }
    // v0.6.78: visiting a normal shrine NEVER heals before the user opens its window.
    // Keep the visit locked while the choice/result is displayed. Show all 3 actions,
    // disabling those that cannot be used; finishing or closing performs onDone once.
    // In an online room, remote updates may replace player objects while this
    // modal remains open. Resolve the live hero on each actual player action.
    const liveHero=()=>getPlayer(p.id)||p;
    let finished=false;
    const finish=()=>{if(finished)return;finished=true;closeModal();onDone()};
    const showResult=message=>{
      updateUI();showCard(fake,message,[{label:'Закрыть',className:'secondary',fn:finish}]);
      const done=document.getElementById('modalActions')?.querySelector('button');if(done)done.classList.add('shrine-close-action');
    };
    const chooseHeal=()=>{
      const hero=liveHero();if(hero.currentHp>=hero.maxHp){showChoices();return;}
      const hr=rollHealing(hero,'D8');closeModal();
      showRollPopup('Святилище · лечение',hr.total,`${hr.used} = <b>${hr.total}</b>`,'Лечение',null,()=>{
        const visitor=liveHero(),healed=heal(visitor,hr.total);
        log(`${visitor.name} выбирает лечение в Святилище: +${healed.restored} ЗД (${hr.used}).`);
        showResult(`Восстановлено <b>${healed.restored}</b> ЗД (<b>${escapeCombatText(hr.used)}</b>)`);
      },'Продолжить');
    };
    const chooseClean=()=>{
      showCard(fake,'Выберите 1 негативный эффект для снятия:',liveHero().statuses.map(st=>({
        label:`Снять: ${st}`,className:'danger',fn:()=>{
          const visitor=liveHero();removeStatus(visitor,st);
          log(`${visitor.name} снимает в Святилище эффект: <b>${st}</b>.`);
          showResult(`Снят негативный эффект: <b>${escapeCombatText(st)}</b>.`);
        }
      })).concat([{label:'Назад',className:'secondary',fn:showChoices}]));
    };
    const showChoices=()=>{
      const hero=liveHero();
      showCard(fake,'Выберите <b>одно</b> действие святилища.',[
        {label:'Лечение · D8 ЗД',className:'success',disabled:hero.currentHp>=hero.maxHp,fn:chooseHeal},
        {label:'Снять негативный эффект',className:'danger',disabled:!hero.statuses.length,fn:chooseClean},
        {label:'Закрыть',className:'secondary',fn:finish}
      ]);
    };
    showChoices();
  }

  function takeMercenaryFromDeck(deckKey,{allowLegendary=false,allowEpic=false}={}){
    const d=state.decks?.[deckKey];if(!d)return null;const options=[];
    for(const sourceName of ['draw','discard']){const source=d[sourceName]||[];for(let i=0;i<source.length;i++){const card=itemCard(source[i]),legendary=String(card?.fields?.['Редкость']||'').toLowerCase().includes('легендар');const epic=/(эпичес|элитн)/.test(String(card?.fields?.['Редкость']||'').toLowerCase());if(card&&itemType(card)==='наёмник'&&(allowLegendary||!legendary)&&(allowEpic||!epic))options.push({sourceName,index:i,card})}}
    if(!options.length)return null;const pick=options[Math.floor(Math.random()*options.length)],source=d[pick.sourceName];source.splice(pick.index,1);return{card:pick.card,key:deckKey};
  }
  function ensureTavernMercenary(hex){
    const loc=state.locations?.[hex];if(!loc||loc.name!=='Таверна')return null;
    const region=MAP.hexes?.[hex]?.region,heartRegion=region==='heart_of_darkness';
    const existing=itemCard(loc.tavernMercenaryId);
    // В обычной Таверне — только наёмники внешней колоды. Эпические и
    // элитные допустимы в Проклятых территориях, если пришли из колоды Сердца.
    const unsuitable=existing&&itemType(existing)==='наёмник'&&region!=='cursed'&&
      (existing.deck==='Тайники Сердца тьмы'||heartOnlyLoot(existing));
    if(unsuitable){
      returnCardToDeckRandom('lootHeart',existing);
      delete loc.tavernMercenaryId;delete loc.tavernMercenaryDeckKey;loc.tavernNeedsRestock=false;
    }else if(existing&&itemType(existing)==='наёмник')return{card:existing,key:loc.tavernMercenaryDeckKey||deckKeyForCard(existing)};
    if(loc.tavernNeedsRestock)return null;
    delete loc.tavernMercenaryId;delete loc.tavernMercenaryDeckKey;
    const keys=region==='cursed'?['lootHeart','lootOuter']:['lootOuter'];
    for(const key of keys){const entry=takeMercenaryFromDeck(key,{allowLegendary:false,allowEpic:region==='cursed'});if(entry){loc.tavernMercenaryId=entry.card.id;loc.tavernMercenaryDeckKey=entry.key;return entry}}
    return null;
  }
  function renderTavernVisit(p,hex,onDone,session){
    const loc=state.locations?.[hex],entry=ensureTavernMercenary(hex),merc=entry?.card||null,current=itemCard(getSlotId(p,'mercenary'));
    const price=merc?Number(merc.fields?.['Цена найма']||0):0,oldId=getSlotId(p,'mercenary'),oldLocked=oldId?isItemLocked(p,oldId):false;
    const canHire=!!merc&&p.gold>=price&&!oldLocked,canHeal=!session.healed&&p.gold>=4&&p.currentHp<p.maxHp;
    const hireWhy=!merc?'В таверне сейчас нет свободного наёмника.':oldLocked?'Текущий наёмник заблокирован для сброса. Сначала снимите блокировку.':p.gold<price?`Нужно ${price} золота.`:'';
    const healWhy=session.healed?'Лечение уже использовано в это посещение.':p.gold<4?'Нужно 4 золота.':p.currentHp>=p.maxHp?'ЗД уже полные.':'';
    const locCursed=MAP.hexes?.[hex]?.region==='cursed';
    const mercHtml=merc?`<div class="loc-section-title">В таверне сейчас — ${escapeCombatText(merc.name)}</div>
      <div class="loc-merc"><div class="loc-merc-art">${itemImageHtml(merc)}</div><div class="loc-merc-text"><strong>${escapeCombatText(merc.name)} <small>№${merc.id}</small></strong>
      <b class="loc-price">Найм: ${price} золота</b><span>${escapeCombatText(merc.fields?.['Эффект']||'—')}</span></div></div>`:
      '<div class="loc-empty">Сейчас в Таверне нет свободного наёмника. Новый появится, когда все герои покинут эту Таверну.</div>';
    const currentHtml=current?`Ваш спутник: <b>${escapeCombatText(current.name)}</b>${oldLocked?' · 🔒 заблокирован':''}`:'Ваш спутник: <b>нет</b>';
    const content=locationStatusPills([['Герой',p.name],['ЗД',`${p.currentHp}/${p.maxHp}`],['Золото',String(p.gold)]])+
      mercHtml+`<div class="loc-current">${currentHtml}${current?' · При наличии спутника доступна замена':''}</div>
      <div class="loc-heal"><b>✚ &nbsp; Лечение — 4 золота · D6 ЗД</b><small>Один раз за посещение · при неполных ЗД</small></div>
      ${session.healSummary?`<div class="loc-note">${session.healSummary}</div>`:''}
      <div class="loc-note">Новый наёмник появится после освобождения Таверны. Повторное лечение — после выхода и нового посещения.</div>`;
    const footer=`<button id="tavernHire" class="loc-hire" ${canHire?'':'disabled'} title="${escapeCombatText(hireWhy)}">${current?'Заменить наёмника':'Нанять'}${merc?` · ${price} зол.`:''}</button>
      <button id="tavernHeal" class="loc-healbtn" ${canHeal?'':'disabled'} title="${escapeCombatText(healWhy)}">Лечиться · 4</button>
      <button id="tavernClose" class="loc-done">Закрыть</button>`;
    els.modalContent.innerHTML=locationWindow('tavern',p,content,footer,{cursed:locCursed});
    els.modal.hidden=false;locationActivateClose('tavern');
    const hireBtn=document.getElementById('tavernHire');if(hireBtn)hireBtn.onclick=()=>{if(!canHire||!merc)return;const old=getSlotId(p,'mercenary');if(old&& !confirm(`Заменить наёмника «${itemCard(old)?.name}» на «${merc.name}»? Старый наёмник уйдёт в сброс.`))return;if(old){if(isItemLocked(p,old)){alert('Текущий наёмник заблокирован для сброса.');return}discardHeldCard(itemCard(old));delete p.itemUsage[old];delete p.lockedItems?.[old]}
      p.gold-=price;setSlotId(p,'mercenary',merc.id);delete loc.tavernMercenaryId;delete loc.tavernMercenaryDeckKey;loc.tavernNeedsRestock=true;log(`${p.name} нанимает в Таверне «${merc.name}» за ${price} золота. До тех пор, пока Таверна не опустеет, нового наёмника здесь не будет.`);updateUI();renderTavernVisit(p,hex,onDone,session)};
    const healBtn=document.getElementById('tavernHeal');if(healBtn)healBtn.onclick=()=>{if(!canHeal)return;const hr=rollHealing(p,'D6');closeModal();showRollPopup('Таверна · лечение',hr.total,`${hr.used} = <b>${hr.total}</b>`,'Лечение за 4 золота',null,()=>{p.gold-=4;const before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;session.healed=true;session.healSummary=`Лечение: ${hr.used} = <b>${hr.total}</b>. Восстановлено <b>${restored} ЗД</b>. ЗД ${p.currentHp}/${p.maxHp}.${hr.reduced?' Проклятие уменьшило кубик лечения.':''}`;log(`${p.name} лечится в Таверне за 4 золота: ${hr.used}=${hr.total}, восстановлено ${restored} ЗД.`);updateUI();renderTavernVisit(p,hex,onDone,session)})};
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
  function merchantBuyPrice(card){
    const price=numericItemPrice(card);if(price!=null)return price;
    const type=itemType(card);
    if(type==='наёмник'){const x=Number(card.fields?.['Цена найма']);return Number.isFinite(x)&&x>0?x:null;}
    if(type==='ценность'){const m=String(card.fields?.['Эффект']||'').match(/получи\s+(\d+)\s+золота/i);return m?Number(m[1]):null;}
    return null;
  }
  function merchantSaleMultiplier(p,plan){return equippedEntries(p).some(e=>Number(e.id)===242)?1:(1/3)}
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
  function drawMerchantStockCard(deckKey){
    if(deckKey==='lootOuter')normalizeLegendaryHeartLoot(state.decks);
    const d=state.decks[deckKey];if(!d)return null;
    if(!d.draw.length&&!recycleDiscardIntoDraw(deckKey))return null;
    for(let i=d.draw.length-1;i>=0;i--){
      const c=itemCard(d.draw[i]);
      if(!c||itemType(c)==='ценность')continue;
      if(deckKey==='lootOuter'&&heartOnlyLoot(c))continue;
      d.draw.splice(i,1);
      return c;
    }
    // Ценности остаются в тайниках, Торговец их не предлагает.
    return null;
  }
  function visitMerchant(p,result,onDone){
    const plan=merchantPlan(p,result),stock=[];plan.locationTitle=result.title||'Торговец';
    for(const key of plan.decks){const card=drawMerchantStockCard(key);if(card)stock.push({card,key})}
    log(`${p.name} посещает Торговца (${plan.label}). Открыто карт: ${stock.length}.`);
    // Важно: клиент онлайн-игры может применять очередное серверное состояние, заменяя
    // объекты героев. Никогда не держим объект героя в обработчиках торговли — только ID.
    showMerchantShop(p.id,stock,plan,onDone,{saving:false,unsaved:false,error:''});
  }
  function showMerchantShop(ownerId,stock,plan,onDone,shop){
    const p=getPlayer(ownerId);if(!p)return;
    const saleMultiplier=merchantSaleMultiplier(p,plan),saleLabel=merchantSaleLabel(p,plan);
    const blocked=shop.saving||shop.unsaved;
    const stockHtml=stock.length?stock.map((e,i)=>{const c=e.card,base=merchantBuyPrice(c),buyable=base!=null,cost=buyable?Math.ceil(base*plan.buyMultiplier):null;const why=base==null?'Цена отсутствует или требует утверждения.':'';return `<div class="loc-good ${itemColorClass(p,c)}"><div class="loc-good-art">${itemImageHtml(c)}<span class="loc-num">№${c.id}</span></div><strong>${escapeCombatText(c.name)}</strong><small>${escapeCombatText(c.fields?.['Тип']||c.category)} · ${buyable?`${cost} зол.`:'—'}</small><details class="loc-good-details"><summary>Описание карты</summary><div class="card-fields compact">${itemFieldsHtml(c)}</div></details><button data-buy-index="${i}" class="loc-buy" ${blocked||!buyable||p.gold<cost?'disabled':''}>${buyable?`Купить за ${cost}`:'Недоступно'}</button>${why?`<div class="loc-note">${why}</div>`:''}</div>`}).join(''):'<div class="empty-box">Ассортимент пуст.</div>';
    const sells=merchantSellEntries(p);
    const sellGroup=(rows,title)=>rows.length?`<div class="merchant-group-title">${title}</div>${rows.map(e=>{const i=sells.indexOf(e),chk=canSellMerchantItem(p,e),base=numericItemPrice(e.card),value=base==null?null:Math.floor(base*saleMultiplier);return `<div class="loc-sell ${itemColorClass(p,e.card)}"><div class="loc-mini-art">${itemImageHtml(e.card)}</div><details class="loc-sell-detail"><summary><b>${escapeCombatText(e.card.name)}</b><small>${escapeCombatText(e.where)} · №${e.id}${base!=null?` · цена ${base}`:''}</small></summary><div class="card-fields compact">${itemFieldsHtml(e.card)}</div></details><button data-sell-index="${i}" class="loc-sellbtn" ${blocked||!chk.ok?'disabled':''}>${value!=null?`Продать за ${value}`:'Нет цены'}</button>${!chk.ok?`<span class="loc-note">${escapeCombatText(chk.why)}</span>`:''}</div>`}).join('')}`:'';
    const sellHtml=sells.length?sellGroup(sells.filter(e=>e.ctx.where==='equipment'),'Экипированные предметы')+'<div class="merchant-sell-divider" role="separator"><span>Рюкзак</span></div>'+sellGroup(sells.filter(e=>e.ctx.where==='backpack'),'Предметы в рюкзаке'):'<div class="empty-box">Нет предметов для продажи.</div>';
    const savingLine=shop.saving?'<div class="notice">Сохраняем изменения на сервере…</div>':shop.unsaved?`<div class="notice" role="alert"><b>Изменения ещё не сохранены!</b> ${shop.error||'Проверьте соединение.'} Покупки и продажи не будут завершены до подтверждения сервера.</div>`:'';
    const regionCursed=MAP.hexes?.[p.hex]?.region==='cursed';
    const content=`${locationStatusPills([['Герой',p.name],['Золото',String(p.gold)],['Покупка',`${Math.round(plan.buyMultiplier*100)}%`],['Продажа',`${Math.round(saleMultiplier*100)}%`]])}
      <div class="loc-note">${escapeCombatText(saleLabel)}</div>${savingLine}
      <div class="loc-section-title" id="locBuySection">Товары торговца <small>${stock.length} карт</small></div>
      <div class="loc-goods">${stockHtml}</div>
      <div class="loc-section-title" id="locSellSection">Ваши предметы на продажу <small>Экипировка и рюкзак</small></div>
      <div class="loc-sell-list">${sellHtml}</div>
      <div class="loc-note">Покупка и продажа доступны в одном посещении. Купленные предметы поступают в неразобранные карты по действующим правилам.</div>`;
    const footer=`${shop.unsaved?'<button id="merchantRetry" class="loc-retry">Повторить сохранение</button>':''}
      <button type="button" class="loc-buy-nav" data-loc-jump="locBuySection">Покупка</button>
      <button type="button" class="loc-sell-nav" data-loc-jump="locSellSection">Продажа</button>
      <button id="merchantDone" class="loc-done" ${blocked?'disabled':''}>Готово</button>`;
    els.modalContent.innerHTML=locationWindow('merchant',p,content,footer,{cursed:regionCursed});
    const scroll=els.modalContent.querySelector('.loc-scroll');
    if(scroll){scroll.scrollTop=shop.scrollTop||0;scroll.onscroll=()=>{shop.scrollTop=scroll.scrollTop};}
    els.modalContent.querySelectorAll('[data-loc-jump]').forEach(btn=>{btn.onclick=()=>{
      const target=els.modalContent.querySelector('#'+btn.dataset.locJump);
      if(target&&scroll)scroll.scrollTop+=target.getBoundingClientRect().top-scroll.getBoundingClientRect().top;
    }});
    els.modal.hidden=false;
    modalOffturnOwnerId=ownerId;
    modalCloseAction=()=>document.getElementById('merchantDone')?.click();
    locationActivateClose('merchant');
    async function saveShop(){
      shop.saving=true;shop.unsaved=false;shop.error='';showMerchantShop(ownerId,stock,plan,onDone,shop);
      try{
        // Подтверждение записи обязательно. Данные нельзя заменить очередным
        // опросом комнаты прежде чем сервер получил последнюю сделку.
        if(typeof window.__RPG_NET_FLUSH_MERCHANT__==='function')await window.__RPG_NET_FLUSH_MERCHANT__(ownerId);
        shop.saving=false;shop.unsaved=false;shop.error='';showMerchantShop(ownerId,stock,plan,onDone,shop);
        return true;
      }catch(err){shop.saving=false;shop.unsaved=true;shop.error=String(err?.message||'Нет ответа сервера.');showMerchantShop(ownerId,stock,plan,onDone,shop);return false}
    }
    const retry=document.getElementById('merchantRetry');if(retry)retry.onclick=()=>saveShop();
    els.modalContent.querySelectorAll('[data-buy-index]').forEach(b=>b.onclick=async()=>{
      if(blocked)return;const live=getPlayer(ownerId),i=Number(b.dataset.buyIndex),entry=stock[i];if(!live||!entry)return;
      const base=merchantBuyPrice(entry.card);if(base==null)return;const cost=Math.ceil(base*plan.buyMultiplier);if(live.gold<cost)return;
      const kind=itemType(entry.card);
      if(kind==='наёмник'){
        const old=getSlotId(live,'mercenary');if(old&&isItemLocked(live,old)){alert('Текущий наёмник заблокирован.');return}
        if(old&&!confirm(`Заменить наёмника «${itemCard(old)?.name}»? Старый уйдёт в сброс.`))return;
        if(old)discardHeldCard(itemCard(old));setSlotId(live,'mercenary',entry.card.id);
      }else if(kind==='ценность'){
        applyTreasureImmediate(live,entry.card);discardHeldCard(entry.card);
      }else live.pendingItems.push(entry.card.id);
      live.gold-=cost;stock.splice(i,1);log(`${live.name} покупает у Торговца «${entry.card.name}» за ${cost} золота.`);
      window.dispatchEvent(new Event('rpg-local-mutation'));updateUI();await saveShop();
    });
    els.modalContent.querySelectorAll('[data-sell-index]').forEach(b=>b.onclick=async()=>{
      if(blocked)return;const live=getPlayer(ownerId),i=Number(b.dataset.sellIndex),entry=sells[i];if(!live||!entry)return;
      // Контекст берём заново: серверная синхронизация могла заменить модель героя.
      const fresh=merchantSellEntries(live).find(e=>Number(e.id)===Number(entry.id)&&e.ctx.where===entry.ctx.where&&e.ctx.slot===entry.ctx.slot);
      if(!fresh)return;const chk=canSellMerchantItem(live,fresh);if(!chk.ok)return;
      const base=numericItemPrice(fresh.card),value=Math.floor(base*merchantSaleMultiplier(live,plan));
      if(!sourceRemove(live,fresh.id,fresh.ctx))return;
      delete live.itemUsage[fresh.id];gainGold(live,value);returnCardToDeckRandom(deckKeyForCard(fresh.card),fresh.card);
      log(`${live.name} продаёт Торговцу «${fresh.card.name}» за ${value} золота.`);
      window.dispatchEvent(new Event('rpg-local-mutation'));updateUI();renderBoard();await saveShop();
    });
    document.getElementById('merchantDone').onclick=async()=>{
      if(shop.saving||shop.unsaved)return;
      // Возврат некупленного ассортимента тоже должен дойти до сервера ДО выхода.
      for(const e of stock)returnCardToDeckRandom(e.key,e.card);stock.length=0;
      window.dispatchEvent(new Event('rpg-local-mutation'));
      if(!await saveShop())return;
      closeModal();onDone();const live=getPlayer(ownerId);
      if(live?.pendingItems?.length)setTimeout(()=>openCharacterSheet('pending',null,ownerId),0);
    };
  }

  function canExploreHere(p){if(!state.turnMoved||state.turnLocked||p.inDungeon||p.pendingItems?.length)return false;if(p.hex===MAP.bossHex)return false;if(state.locations[p.hex])return false;if(state.territories[p.hex])return false;if(p.hex===MAP.startHex)return false;if(state.cleaned[p.hex]&&state.clearedThisTurnHex===p.hex)return false;return true}
  function exploreActions(p){
    const r=MAP.hexes[p.hex]?.region;if(r==='cursed')return [{label:'Исследовать: Внешние регионы',key:'exploreOuter'},{label:'Исследовать: Сердце тьмы',key:'exploreHeart'}];if(r==='heart_of_darkness')return[{label:'Исследовать Сердце тьмы',key:'exploreHeart'}];return[{label:'Исследовать внешние регионы',key:'exploreOuter'}]
  }

  function territoryBuildSequence(p,region){
    ensurePlayerModel(p);
    const owned=Object.entries(state.territories||{}).filter(([h,t])=>t?.owner===p.id&&MAP.hexes[h]?.region===region).length;
    return Math.max(owned,Number(p.territoryBuildSeq?.[region]||0));
  }
  function territoryBuildCost(p,hex){
    const r=MAP.hexes[hex]?.region,count=territoryBuildSequence(p,r);
    return r==='cursed'?20+count*10:10+count*5;
  }
  function canBuildAt(p,hex=p.hex){
    const r=MAP.hexes[hex]?.region;if(!(r==='kingdom'||r==='cursed'))return{ok:false,why:'В Сердце тьмы строить нельзя.'};if(hex===MAP.startHex)return{ok:false,why:'В Лагере строить нельзя.'};if(!state.cleaned[hex])return{ok:false,why:'Гекс не очищен.'};if(state.locations[hex])return{ok:false,why:state.locations[hex].name==='Древний портал'?'На гексе находится Древний портал.':'На постоянной локации строить нельзя.'};if(state.territories[hex])return{ok:false,why:'Территория уже построена.'};if(CAMP_ADJACENT.has(hex))return{ok:false,why:'На гексах вокруг Лагеря строить нельзя.'};
    const portalHexes=Object.entries(state.locations).filter(([,v])=>v.name==='Древний портал').map(([h])=>h);if(portalHexes.includes(hex))return{ok:false,why:'На гексе находится Древний портал.'};const nearPortal=portalHexes.find(ph=>MAP.hexes[ph].neighbors.includes(hex));if(nearPortal)return{ok:false,why:'Рядом находится Древний портал.'};
    const cost=territoryBuildCost(p,hex);if(p.gold<cost)return{ok:false,why:`Нужно ${cost} золота.`};return{ok:true,cost};
  }
  function buildTerritoryFor(p,hex,cost){
    if(!p||!hex)return false;
    ensurePlayerModel(p);const r=MAP.hexes[hex]?.region,seq=territoryBuildSequence(p,r)+1;
    p.gold-=cost;p.maxHp+=2;state.territories[hex]={owner:p.id,areaId:null};
    if(r==='kingdom'||r==='cursed')p.territoryBuildSeq[r]=Math.max(Number(p.territoryBuildSeq[r]||0),seq);
    state.territoryBuiltNotice=null;
    const territoryNumber=Object.values(state.territories).filter(t=>t.owner===p.id).length;
    log(`<b>${p.name} строит территорию №${territoryNumber} на ${hex}</b> за ${cost} золота. Максимум ЗД +2; текущее ЗД не изменяется (${p.currentHp}/${p.maxHp}).`);
    updateUI();renderBoard();return true;
  }
  function resolveTerritoryBuiltNotice(){state.territoryBuiltNotice=null}
  function showTerritoryBuiltNotice(){state.territoryBuiltNotice=null}
  function releaseTerritoryBuiltNotice(){state.territoryBuiltNotice=null}
  function maybeShowTerritoryBuiltNotice(){if(state.territoryBuiltNotice)state.territoryBuiltNotice=null}
  function buildTerritory(){
    if(state.movePending){commitPendingMove({type:'build'});return}
    const p=currentPlayer(),chk=canBuildAt(p);if(!chk.ok)return;
    if(buildTerritoryFor(p,p.hex,chk.cost))promptAreaMergeAfterBuild(p,p.hex,()=>advanceTurnState(p,'строительство территории'));
  }
  function postCombatBuildBlockedText(why=''){const t=String(why||'Строительство на этом гексе недоступно.').replace(/\.$/,'');return t}
  function showPostCombatTerritoryPrompt(){
    const c=state.combat,p=currentPlayer();if(!c||c.phase!=='victory'||c.isBoss||!p){finishCombatVictory();return}
    const chk=canBuildAt(p,p.hex);if(c)c.victoryUiStep='build';closeModal();els.modalClose.style.display='none';els.modal.classList.add('post-combat-prompt');
    if(!chk.ok){
      els.modalContent.innerHTML=`<div class="card-kicker">ПОСЛЕ БОЯ</div><div class="card-title">ПОСТРОЙКА ТЕРРИТОРИИ НЕВОЗМОЖНА</div><div class="card-field"><b>Причина:</b> ${postCombatBuildBlockedText(chk.why)}.</div><div class="modal-actions"><button id="postCombatBuildContinue" class="success">Продолжить</button></div>`;
      els.modal.hidden=false;document.getElementById('postCombatBuildContinue').onclick=()=>{closeModal();finishCombatVictory()};return;
    }
    els.modalContent.innerHTML=`<div class="card-kicker">ПОСЛЕ БОЯ</div><div class="card-title">Строить территорию за ${chk.cost} ЗОЛ?</div><div class="card-field">Гекс: <b>${p.hex}</b> · Золото героя: <b>${p.gold}</b>.<br>После выбора ход героя завершится.</div><div class="modal-actions"><button id="postCombatBuildYes" class="success">Да</button><button id="postCombatBuildNo" class="secondary">Нет</button></div>`;
    els.modal.hidden=false;
    document.getElementById('postCombatBuildYes').onclick=()=>{const live=getPlayer(p.id)||p;const fresh=canBuildAt(live,live.hex);if(fresh.ok){buildTerritoryFor(live,live.hex,fresh.cost);closeModal();promptAreaMergeAfterBuild(live,live.hex,()=>finishCombatVictory());return}closeModal();finishCombatVictory()};
    document.getElementById('postCombatBuildNo').onclick=()=>{closeModal();finishCombatVictory()};
  }

  function connectedTriple(hexes){const set=new Set(hexes),seen=new Set([hexes[0]]),q=[hexes[0]];while(q.length){const h=q.shift();for(const n of MAP.hexes[h].neighbors)if(set.has(n)&&!seen.has(n)){seen.add(n);q.push(n)}}return seen.size===3}
  function areaMergeCost(hexes){return MAP.hexes[hexes?.[0]]?.region==='cursed'?40:20}
  function areaCandidates(p){const own=Object.entries(state.territories).filter(([,t])=>t.owner===p.id&&!t.areaId).map(([h])=>h),out=[];for(let i=0;i<own.length;i++)for(let j=i+1;j<own.length;j++)for(let k=j+1;k<own.length;k++){const a=[own[i],own[j],own[k]],regions=new Set(a.map(h=>MAP.hexes[h]?.region));if(regions.size===1&&['kingdom','cursed'].includes(MAP.hexes[a[0]]?.region)&&connectedTriple(a))out.push(a)}return out}
  function areaCandidatesAt(p,hex=p.hex){return areaCandidates(p).filter(a=>a.includes(hex))}
  function affordableAreaCandidatesAt(p,hex=p.hex){return areaCandidatesAt(p,hex).filter(a=>p.gold>=areaMergeCost(a))}
  function finalizeArea(p,hexes,bonus,cost=areaMergeCost(hexes),onDone=null){if(!p||p.gold<cost)return false;p.gold-=cost;const id=state.nextAreaId++,ownerAreaNumber=Math.max(0,...state.areas.filter(a=>a.owner===p.id).map(a=>a.ownerAreaNumber||0))+1;hexes.forEach(h=>state.territories[h].areaId=id);state.areas.push({id,owner:p.id,ownerAreaNumber,hexes:[...hexes],bonus});const text=bonus.type==='defense'?`+${bonus.amount} ЗЩ`:`+${bonus.amount} ${statName(bonus.stat)}`;log(`<b>${p.name} создаёт область №${ownerAreaNumber}</b>: ${hexes.join(' + ')} за ${cost} золота. Бонус: <b>${text}</b>.`);updateUI();renderBoard();if(!els.sheetDrawer.hidden)renderCharacterSheet('overview');if(onDone)onDone();return true}
  function createArea(hexes,{player=currentPlayer(),onDone=null,onCancel=null}={}){const p=player,cost=areaMergeCost(hexes);if(!p||p.gold<cost){if(onCancel)onCancel();return false}const n=Math.max(0,...state.areas.filter(a=>a.owner===p.id).map(a=>a.ownerAreaNumber||0))+1;if(n%2===0)return finalizeArea(p,hexes,{type:'defense',amount:1},cost,onDone);const fake={id:'—',name:`Область №${n}`,category:'Бонус области',deck:'Поле',fields:{'Бонус':'+1 к характеристике на выбор'}};showCard(fake,`Объединение стоит <b>${cost} золота</b>.<br>Выберите постоянный бонус для области из ${hexes.join(' + ')}.`,['str','dex','wis','cha'].map(k=>({label:`+1 ${statName(k)}`,className:'success',fn:()=>{closeModal();finalizeArea(p,hexes,{type:'stat',stat:k,amount:1},cost,onDone)}})));if(onCancel)modalCloseAction=()=>{closeModal();onCancel()};return true}
  function promptAreaMergeAfterBuild(p,hex,onDone){
    p=getPlayer(p?.id)||p;const candidates=areaCandidatesAt(p,hex);
    if(!candidates.length){onDone();return}
    modalOffturnOwnerId=p.id;els.modalClose.style.display='none';els.modal.classList.add('post-combat-prompt');
    els.modalContent.innerHTML=`<div class="card-kicker">ПОСТРОЙКА ОБЛАСТИ</div><div class="card-title">Объединить территории в область?</div><div class="card-field">Построенная территория образует подходящую тройку. Золото героя: <b>${p.gold}</b>.<br>Если сейчас золота недостаточно, объединение можно выполнить позже, остановившись на одной из этих территорий.</div><div class="modal-actions" id="areaMergeAfterBuildActions"></div>`;
    const box=els.modalContent.querySelector('#areaMergeAfterBuildActions');
    for(const a of candidates){
      const cost=areaMergeCost(a),enough=p.gold>=cost,b=document.createElement('button');
      b.className='success';b.textContent=`Объединить ${a.join(' + ')} за ${cost} ЗОЛ`;b.disabled=!enough;
      if(!enough)b.title=`Не хватает ${cost-p.gold} золота`;
      b.onclick=()=>{const live=getPlayer(p.id)||p;if(live.gold<cost)return;createArea(a,{player:live,onDone:()=>{closeModal();onDone()},onCancel:()=>{closeModal();onDone()}})};
      box.appendChild(b);
    }
    const close=document.createElement('button');close.className='secondary';close.textContent='ЗАКРЫТЬ';close.onclick=()=>{closeModal();onDone()};box.appendChild(close);els.modal.hidden=false;
  }

  function resolveDungeonEntryNotice(p){
    if(!p)return;const wasCurrent=currentPlayer()?.id===p.id;if(state.dungeonEntryNotice?.heroId===p.id)state.dungeonEntryNotice=null;closeModal();
    if(wasCurrent){p.reexploreRiskHex=null;state.exploration=null;state.turnLocked=false;log('Исследование завершено: Темница.');advanceTurnState(p,'попадание в Темницу')}
    else{updateUI();renderBoard()}
  }
  function showDungeonEntryNotice(p,card){
    if(!p||!card)return;showCard(card,'<b>ИГРОК ПОПАЛ В ТЕМНИЦУ.</b><br>После закрытия этого окна ход сразу перейдёт к следующему игроку. Первая попытка выхода будет в следующий личный ход героя.',[{label:'Далее',className:'success',fn:()=>resolveDungeonEntryNotice(p)}]);
    modalOffturnOwnerId=p.id;modalCloseAction=()=>resolveDungeonEntryNotice(p);
  }
  function maybeShowDungeonEntryNotice(){
    const n=state.dungeonEntryNotice;if(!n)return;const hero=getPlayer(n.heroId);
    if(!hero?.inDungeon||(hero.dungeonEnteredTurn!=null&&hero.personalTurn>hero.dungeonEnteredTurn)){state.dungeonEntryNotice=null;return;}
    if(!els.modal.hidden)return;const localId=onlineLocalHeroId||currentPlayer()?.id;if(localId!==n.heroId)return;const p=getPlayer(n.heroId),card=itemCard(n.cardId);if(p&&card)showDungeonEntryNotice(p,card);
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
    closeModal();
    const bonus=effectiveStat(p,k);
    const verdict=/провал|не удался|остается|остаётся/i.test(resultText)?'ПРОВАЛ':'УСПЕХ';
    showRollPopup(`Темница · ${statName(k)}`,d,`${d} ${signed(bonus)} = <b>${total}</b>`,`<b>${verdict}</b> · ${resultText}`,natural,onDone,'Продолжить');
  }
  function attemptDungeonExit(k){
    const p=currentPlayer();if(!dungeonExitAvailable(p))return;
    const bonus=effectiveStat(p,k),d=rand(20),total=d+bonus;
    state.turnLocked=true;let resultText='',natural=null,natOneDamage=0;
    if(d===1){
      natural=1;natOneDamage=rand(6);
      resultText='Натуральная 1: выход не удался. Герой остаётся в Темнице. Сейчас будет бросок D6 урона.';
      log(`${p.name}: Темница, натуральная 1 — попытка выхода провалена, дополнительный бросок D6 урона.`);
    }
    else if(d===20){natural=20;p.inDungeon=false;p.dungeonCard=null;p.dungeonEnteredTurn=null;p.reexploreRiskHex=null;resultText='Натуральная 20: герой успешно выходит из Темницы и получает дополнительный ход исследования.';log(`${p.name}: <b>натуральная 20</b> — успешно выходит из Темницы и получает дополнительный ход исследования.`)}
    else if(total>=13){p.inDungeon=false;p.dungeonCard=null;p.dungeonEnteredTurn=null;p.reexploreRiskHex=null;resultText='Успех: герой выходит из Темницы.';log(`${p.name}: D20 ${d} + ${statName(k)} ${signed(bonus)} = ${total}. <b>Выход из Темницы успешен.</b>`)}
    else{resultText='Провал: герой остаётся в Темнице.';log(`${p.name}: D20 ${d} + ${statName(k)} ${signed(bonus)} = ${total}. Выход не удался.`)}
    recordNatural(p,natural);
    const finish=()=>{if(natural===20){beginBonusExplorationTurnAfterDungeon(p);return}endTurn(true)};
    const afterCheck=()=>{
      if(natOneDamage){
        // Show the damage die separately; only then apply the already-determined damage.
        showRollPopup('Темница · Натуральная 1 · урон',natOneDamage,`D6 = <b>${natOneDamage}</b>`,
          `Натуральная 1 — дополнительный урон. Герой остаётся в Темнице.`,1,()=>{
            recordDamageTaken(p,natOneDamage);p.currentHp-=natOneDamage;
            log(`${p.name}: Темница, натуральная 1 — D6 = ${natOneDamage} урона. ЗД ${Math.max(0,p.currentHp)}/${p.maxHp}.`);
            updateUI();
            if(p.currentHp<=0){handleDeath(p);return}
            finish();
          },'Продолжить',true);
        return;
      }
      finish();
    };
    showDungeonRollResult(p,k,d,total,resultText,natural,afterCheck);
  }

  function hexDistance(a,b){if(a===b)return 0;const q=[[a,0]],seen=new Set([a]);while(q.length){const[x,d]=q.shift();for(const n of MAP.hexes[x].neighbors){if(n===b)return d+1;if(!seen.has(n)){seen.add(n);q.push([n,d+1])}}}return 999}

  function resetItemUsage(p,place){ensurePlayerModel(p);for(const [id,u] of Object.entries(p.itemUsage||{})){const reset=Array.isArray(u?.reset)?u.reset:[u?.reset];if(reset.includes(place))delete p.itemUsage[id]}}
  function useMark(p,id,reset){ensurePlayerModel(p);p.itemUsage[id]={reset:Array.isArray(reset)?reset:[reset]}}
  function useBlocked(p,id){return !!p.itemUsage?.[id]}
  function consumeHeldItem(p,id,ctx){const card=itemCard(id);p=getPlayer(p?.id)||p;if(!card||!sourceRemove(p,id,ctx))return false;if(itemType(card)==='зелье'){const key=deckKeyForCard(card);returnCardToDeckRandom(key,card);log(`Использованное зелье «${card.name}» возвращается в колоду «${DECK_NAMES[key]}» и снова может быть найдено.`)}else discardHeldCard(card);return true}
  function supportedOutsideEffect(p,card,ctx){
    if(heroIsActiveCombatant(p))return supportedCombatEffect(p,card,ctx);
    if(!card||ctx?.where==='pending')return{supported:false,enabled:false,why:''};
    const eff=String(card.fields?.['Эффект']||''),id=card.id,t=itemType(card),equipped=ctx?.where==='equipment';
    if([174,226,263,169].includes(id)&&!equipped)return{supported:true,enabled:false,why:'Этот эффект работает только когда предмет экипирован.'};
    if([174,263].includes(id))return{supported:true,enabled:!useBlocked(p,id)&&p.statuses.length>0,why:useBlocked(p,id)?'Эффект уже использован. Восстановится после посещения Святилища.':(!p.statuses.length?'Нет негативных эффектов для снятия.':'')};
    if(id===226){const has=p.statuses.length>0;return{supported:true,enabled:!useBlocked(p,id)&&has,why:useBlocked(p,id)?'Эффект уже использован. Восстановится после посещения Святилища.':(!has?'Нет негативных эффектов для снятия.':'')}}
    if([193,345,346].includes(id))return{supported:true,enabled:false,why:'Этот артефакт используется только во время боя.'};
    if(id===347)return{supported:true,enabled:!state.combat&&currentPlayer()?.id===p.id&&equipped&&!useBlocked(p,id)&&p.currentHp<p.maxHp,why:!equipped?'Наденьте амулет в слот артефакта.':useBlocked(p,id)?'Эффект восстанавливается при следующем посещении Святилища.':p.currentHp>=p.maxHp?'ЗД уже полные.':''};
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
  function chooseStatusForItem(p,card,ctx,allowed=null,after=null){const statuses=p.statuses.filter(s=>!allowed||allowed.includes(s));if(!statuses.length){alert('Нет подходящего негативного эффекта.');return}els.sheetContent.innerHTML=`<div class="sheet-nav"><button class="ghost" id="cancelUseItem">← К предмету</button><b>${card.name}</b></div><div class="notice">Выберите эффект, который нужно снять.</div><div class="item-list" id="statusUseList"></div>`;document.getElementById('cancelUseItem').onclick=()=>showItemInSheet(card.id,ctx);const box=document.getElementById('statusUseList');for(const st of statuses){const b=document.createElement('button');b.className='item-row';b.innerHTML=`<span><b>${st}</b><small>Снять негативный эффект</small></span><span>›</span>`;b.onclick=()=>{removeStatus(p,st);if(after)after();log(`${p.name}: «${card.name}» снимает эффект <b>${st}</b>.`);window.dispatchEvent(new Event('rpg-local-mutation'));renderCharacterSheet('overview');updateUI()};box.appendChild(b)}}
  function applyItemEffect(p,id,ctx){
    p=getPlayer(p?.id)||p;if(ctx?.where==='equipment'&&getSlotId(p,ctx.slot)!==id)return;if(ctx?.where==='backpack'&&!p.backpack.includes(id))return;
    if(heroIsActiveCombatant(p))return applyCombatItemEffect(p,id,ctx);
    const card=itemCard(id);if(!card)return;const info=supportedOutsideEffect(p,card,ctx);if(!info.enabled){if(info.why)alert(info.why);return}const eff=String(card.fields?.['Эффект']||''),t=itemType(card);
    if(id===347){const hr=rollHealing(p,'D10'),before=p.currentHp;heal(p,hr.total);useMark(p,id,'shrine');log(`${p.name}: Амулет жизни восстанавливает ${p.currentHp-before} ЗД (D10=${hr.total}).`);window.dispatchEvent(new Event('rpg-local-mutation'));renderCharacterSheet('overview');updateUI();return;}
    if([174,263].includes(id)){chooseStatusForItem(p,card,ctx,null,()=>useMark(p,id,'shrine'));return}
    if(id===226){chooseStatusForItem(p,card,ctx,null,()=>useMark(p,id,'shrine'));return}
    if(id===169){const portals=Object.entries(state.locations||{}).filter(([,v])=>v.name==='Древний портал').map(([h])=>h);if(!portals.length)return;useMark(p,id,'shrine');state.turnLocked=true;state.portalPending={heroId:p.id,entryHex:p.hex,destinations:[...portals],remaining:0};log(`${p.name}: «${card.name}» — выберите любой портал на карте.`);closeCharacterSheet();updateUI();renderBoard();return}
    if(t==='зелье'){
      let m;if((m=eff.match(/восстанови\s+((?:\d+D\d+)|D\d+)\s+ЗД/i))){const hr=rollHealing(p,m[1]),v=hr.total,healed=heal(p,v);consumeHeldItem(p,id,ctx);log(`${p.name} использует «${card.name}» и восстанавливает ${healed.restored} ЗД.`);window.dispatchEvent(new Event('rpg-local-mutation'));renderCharacterSheet('overview');updateUI();return}
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
  function openCharacterSheet(mode='overview',bonusKey=null,playerId=null){if(!state.started)return;const active=currentPlayer(),sideTarget=sideInteractionOwnerId(),target=sideTarget||playerId||onlineLocalHeroId||(playerHardMode(active)?active.id:(state.inspectPlayerId||active.id));sheetView={mode,bonusKey,itemId:null,context:null,playerId:target};els.sheetDrawer.hidden=false;document.body.classList.toggle('sheet-over-combat',!!state.combat&&!els.modal.hidden);renderCharacterSheet(mode,bonusKey);RPGTabletop.syncTabs(true,mode)}
  function toggleCharacterSheet(mode='overview',playerId=null){
    if(!state.started)return;
    const requested=mode==='overview'?'overview':'inventory';
    const displayed=sheetView.mode==='overview'?'overview':'inventory';
    if(!els.sheetDrawer.hidden&&requested===displayed){closeCharacterSheet();return}
    openCharacterSheet(requested,null,playerId||sideInteractionOwnerId()||onlineLocalHeroId||currentPlayer()?.id);
  }
  function closeCharacterSheet(){const owner=sideInteractionOwnerId(),player=owner?getPlayer(owner):null;if(sideInteraction?.type==='loot'&&player&&!player.pendingItems?.length)endSideInteraction();els.sheetDrawer.hidden=true;document.body.classList.remove('sheet-over-combat');els.sheetContent.innerHTML='';sheetView={mode:'overview',bonusKey:null,itemId:null,context:null,playerId:null};updateSheetTabs('overview');RPGTabletop.syncTabs(false,null)}
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
  // v0.6.74 — Every image is linked by the approved card ID, not by a translated name.
  const INVENTORY_IMAGE_IDS=new Set([141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347]);
  function itemImageHtml(card){return card&&INVENTORY_IMAGE_IDS.has(Number(card.id))?`<img class="item-card-art" src="assets/items/${card.id}.webp" loading="lazy" decoding="async" alt="" onerror="this.hidden=true">`:''}
  function itemEffectSpent(p,id){
    if(!p||!id)return false;
    const use=p.itemUsage?.[id];
    if(use&&(use.reset||use.turn===p.personalTurn))return true;
    // Existing per-turn equipment triggers are tracked in dedicated player fields.
    if(Number(id)===201&&p.scoutBootsUsedTurn===p.personalTurn)return true;
    if(Number(id)===198&&p.trackerUsedTurn===p.personalTurn)return true;
    return !!(state.combat&&currentPlayer()?.id===p.id&&state.combat.used?.[`item:${id}`]);
  }
  function itemSpentBadgeHtml(p,id){return itemEffectSpent(p,id)?'<span class="item-art-used-flag" title="Эффект использован до перезарядки">✓ ЭФФЕКТ ИСПОЛЬЗОВАН</span>':''}
  function itemCardFrontHtml(card,p=null){
    const image=itemImageHtml(card),used=p?itemSpentBadgeHtml(p,card.id):'';
    return `<div class="inventory-card-front">${image||'<div class="item-art-fallback">Изображение ещё не подготовлено</div>'}<div class="item-art-title"><small>№${card.id} · ${escapeCombatText(card.fields?.['Тип']||card.category||'Предмет')}</small><strong>${escapeCombatText(card.name)}</strong></div>${used}</div>`;
  }

  function inventoryPictureTile(card,top,bottom,extra='',attrs=''){
    return `<button type="button" class="picture-item-tile ${card?'filled':''} ${extra}" ${attrs}>${itemImageHtml(card)}<span class="picture-item-caption">${escapeCombatText(top)}</span><b class="picture-item-name">${escapeCombatText(bottom)}</b>${card?`<small class="picture-item-id">№${card.id}</small>`:''}${extra.includes('item-ability-spent')?'<span class="item-tile-used-symbol" title="Эффект использован">✓</span>':''}</button>`;
  }
  function slotTile(p,slot){const id=getSlotId(p,slot),card=itemCard(id),used=id&&itemEffectSpent(p,id);return inventoryPictureTile(card,SLOT_LABELS[slot],card?.name||'—',`${card?itemColorClass(p,card):''} ${used?'item-ability-spent':''}`,`data-slot="${slot}" ${id?'':'disabled'}`)}
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
    els.sheetContent.querySelectorAll('[data-sheet-map-highlight]').forEach(b=>{const type=b.dataset.sheetMapHighlight;const active=()=>state.mapHighlight?.type===type&&state.mapHighlight?.playerId===p.id;const refresh=()=>{b.classList.toggle('map-highlight-active',active());b.setAttribute('aria-pressed',active()?'true':'false')};const set=()=>{state.mapHighlight={type,playerId:p.id};refresh();renderBoard()};const clear=()=>{if(active()){state.mapHighlight=null;refresh();renderBoard()}};refresh();if(!isMobileViewport()){b.onmouseenter=set;b.onmouseleave=clear}else{b.onmouseenter=null;b.onmouseleave=null}b.onclick=e=>{e.stopPropagation();if(active())state.mapHighlight=null;else state.mapHighlight={type,playerId:p.id};refresh();renderBoard()}});
  }
  function renderInventory(p){
    ensurePlayerModel(p);updateSheetTabs('inventory');const merc=itemCard(getSlotId(p,'mercenary'));const readOnly=sheetReadOnly(),readOnlyBanner=readOnly?`<div class="read-only-banner">Просмотр инвентаря героя <b>${p.name}</b>. Действия с предметами недоступны.</div>`:'';
    els.sheetContent.innerHTML=`${readOnlyBanner}<div class="inventory-head"><div><div class="eyebrow">ИНВЕНТАРЬ</div><h2 style="color:${p.color}">${p.name}</h2></div><div class="inventory-gold"><small>ЗОЛОТО</small><b>${p.gold}</b></div></div><h3 class="sheet-section-title">Экипировка</h3><div class="gear-grid inventory-gear">${slotTile(p,'weapon')}${slotTile(p,'armor')}${slotTile(p,'amulet')}${slotTile(p,'ring0')}${slotTile(p,'ring1')}${slotTile(p,'artifact')}${slotTile(p,'potion0')}${slotTile(p,'potion1')}<button type="button" class="picture-item-tile backpack-slot" id="backpackTile"><span class="picture-item-caption">Рюкзак</span><b class="picture-item-name">${p.backpack.length}/${backpackCapacity(p)}</b><span class="picture-item-placeholder" aria-hidden="true">▤</span></button></div><h3 class="sheet-section-title">Наёмник</h3><div class="merc-picture-grid">${inventoryPictureTile(merc,'Наёмник',merc?.name||'Отсутствует',`merc-picture-tile ${merc?itemColorClass(p,merc):''} ${merc&&itemEffectSpent(p,merc.id)?'item-ability-spent':''}`,`id="mercTile" ${merc?'':'disabled'}`)}</div><div class="sheet-section-row inventory-actions"><button class="secondary" id="openBackpack">Рюкзак (${p.backpack.length}/${backpackCapacity(p)})</button><button class="${p.pendingItems.length?'primary':'ghost'}" id="openPending">Неразобранные тайники (${p.pendingItems.length})</button></div>${p.pendingItems.length?'<div class="notice compact-notice"><b>Требуется разбор.</b> Движение и завершение хода заблокированы.</div>':''}`;
    els.sheetContent.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{const slot=b.dataset.slot,id=getSlotId(p,slot);if(id)showItemInSheet(id,{where:'equipment',slot})});
    document.getElementById('backpackTile').onclick=()=>renderCharacterSheet('backpack');document.getElementById('openBackpack').onclick=()=>renderCharacterSheet('backpack');document.getElementById('openPending').onclick=()=>renderCharacterSheet('pending');
    if(merc)document.getElementById('mercTile').onclick=()=>showItemInSheet(merc.id,{where:'equipment',slot:'mercenary'});
  }
  // Fill rows left-to-right, then the second row, and scroll horizontally when the
  // number of cards exceeds the visible width. For one or two cards, show one row.
  // Both the backpack and unresolved loot use the same small, square card grid.
  function twoRowItemGridHtml(items,kind,p){
    const cols=Math.max(2,Math.ceil(items.length/2));
    const rows=Math.min(2,Math.ceil(items.length/cols));
    const pending=kind==='pending';
    const gridClass=pending?'pending-picture-grid pending-card-grid':`inventory-two-row-grid backpack-picture-grid`;
    const tracks=pending?'':`style="--item-cols:${cols};--item-rows:${rows}"`;
    return `<div class="${gridClass}" ${tracks} aria-label="${pending?'Неразобранные карты':'Предметы рюкзака'}">${items.map(c=>inventoryPictureTile(c,c.fields?.['Тип']||c.category,c.name,`${itemColorClass(p,c)} ${itemEffectSpent(p,c.id)?'item-ability-spent':''}`,`data-item-id="${c.id}" aria-label="Взять карту ${escapeCombatText(c.name)} для просмотра"`)).join('')}</div>`;
  }
  function renderBackpack(p){
    ensurePlayerModel(p);updateSheetTabs('backpack');const items=p.backpack.map(id=>itemCard(id)).filter(Boolean);
    els.sheetContent.innerHTML=`<div class="sheet-nav"><button class="ghost" id="sheetBack">← Инвентарь</button><b>Рюкзак ${p.backpack.length}/${backpackCapacity(p)}</b></div>${items.length?twoRowItemGridHtml(items,'backpack',p):'<div class="empty-box">Рюкзак пуст.</div>'}`;
    document.getElementById('sheetBack').onclick=()=>renderCharacterSheet('inventory');
    els.sheetContent.querySelectorAll('[data-item-id]').forEach(b=>b.onclick=()=>showItemInSheet(Number(b.dataset.itemId),{where:'backpack'}));
  }
  function renderPending(p){
    ensurePlayerModel(p);updateSheetTabs('pending');const items=p.pendingItems.map(id=>itemCard(id)).filter(Boolean);
    els.sheetContent.innerHTML=`<div class="sheet-nav"><button class="ghost" id="sheetBack">← Инвентарь</button><b>Неразобранные тайники: ${items.length}</b></div>${items.length?`<div class="pending-help">Нажмите на карту, чтобы взять её в руку и рассмотреть. Сама карта останется здесь, пока вы не выберете действие.</div>${twoRowItemGridHtml(items,'pending',p)}`:'<div class="empty-box">Неразобранных тайников нет.</div>'}`;
    document.getElementById('sheetBack').onclick=()=>renderCharacterSheet('inventory');
    els.sheetContent.querySelectorAll('[data-item-id]').forEach(b=>b.onclick=()=>showItemInSheet(Number(b.dataset.itemId),{where:'pending'}));
  }
  function showItemInSheet(id,context){
    const pid=sheetView.playerId||currentPlayer().id;
    sheetView={mode:'item',bonusKey:null,itemId:id,context,playerId:pid,itemFlipped:false};
    updateSheetTabs('item');renderItemDetail(getPlayer(pid)||currentPlayer(),id,context);
  }
  function itemFieldsHtml(card){return displayCardFieldEntries(card).map(([k,v])=>`<div class="card-field"><b>${k}:</b> ${v.replace(/\n/g,'<br>')}</div>`).join('')}
  function inventoryCardBackHtml(card){
    const fields=card.fields||{}, esc=escapeCombatText;
    const type=fields['Тип']||card.category||'—';
    const who=fields['Для кого']||'—';
    const price=fields['Цена']!=null?`${fields['Цена']} зол.`:fields['Цена найма']!=null?`${fields['Цена найма']} зол. (найм)`:'—';
    const effect=fields['Эффект']||'—';
    const used=new Set(['Тип','Для кого','Цена','Цена найма','Эффект']);
    const extra=displayCardFieldEntries(card).filter(([key])=>!used.has(key));
    return `<div class="inventory-card-reverse"><div class="reverse-kicker">ОБОРОТ КАРТЫ · №${card.id}</div><div class="reverse-title">${esc(card.name)}</div><div class="reverse-properties"><div><small>ТИП</small><span>${esc(type)}</span></div><div><small>ДЛЯ КОГО</small><span>${esc(who)}</span></div><div><small>ЦЕНА</small><span>${esc(price)}</span></div><div><small>КАТЕГОРИЯ</small><span>${esc(card.category)}</span></div></div><div class="reverse-effect"><small>ЭФФЕКТ</small><span>${esc(effect)}</span></div>${extra.length?`<div class="reverse-extras">${extra.map(([key,val])=>`<div><b>${esc(key)}</b><span>${esc(val)}</span></div>`).join('')}</div>`:''}</div>`;
  }
  function renderItemDetail(p,id,ctx){const card=itemCard(id);if(!card){renderCharacterSheet('inventory');return}const readOnly=sheetReadOnly(),equip=canEquipCard(p,card),slots=targetSlots(card),actions=[],outside=readOnly?{supported:false,enabled:false,why:''}:supportedOutsideEffect(p,card,ctx),canLock=!readOnly&&ctx?.where!=='pending',locked=canLock&&isItemLocked(p,id),heroCombat=heroIsActiveCombatant(p);
    if(heroCombat){
      const canRegear=combatCanChangeEquipment(p,card);
      if(ctx?.where==='equipment'){const battle=supportedCombatEffect(p,card,ctx);if(battle.supported)actions.push({label:'Применить эффект',cls:'success',disabled:!battle.enabled,title:battle.why,fn:()=>applyCombatItemEffect(p,id,ctx)});const setName=card.fields?.['Сет'],setInfo=setName?setBonusActionInfo(p,setName):null;if(setInfo?.supported&&setName==='Тени')actions.push({label:'Применить бонус полного сета',cls:'success',disabled:!setInfo.enabled,title:setInfo.why,fn:()=>useSetBonus(p,setName)});}if(ctx?.where==='backpack'&&itemType(card)==='зелье'&&slots.length)actions.push({label:'Положить в быстрый слот',cls:'success',fn:()=>requestEquip(p,id,ctx)});
      if(ctx?.where==='backpack'&&itemType(card)!=='зелье'&&slots.length&&equip.ok&&['оружие','щит','броня','кольцо','амулет','артефакт'].includes(itemType(card)))actions.push({label:'Надеть / заменить (1 раз за раунд)',cls:'success',disabled:!canRegear,title:'Только в свой боевой ход до атаки; одно изменение за раунд.',fn:()=>requestEquip(p,id,ctx)});
      if(ctx?.where==='equipment'&&itemType(card)!=='зелье'&&['оружие','щит','броня','кольцо','амулет','артефакт'].includes(itemType(card)))actions.push({label:'Снять в рюкзак (1 раз за раунд)',cls:'secondary',disabled:!canRegear||!canUnequipToBackpack(p,id,ctx.slot),fn:()=>unequipToBackpack(p,id,ctx)});
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
    const reverse=!!sheetView.itemFlipped;
    const face=reverse?inventoryCardBackHtml(card):itemCardFrontHtml(card,p);
    const spent=itemEffectSpent(p,id);
    els.sheetContent.innerHTML=`${ro}<div class="sheet-nav"><button class="ghost" id="itemBack">← Назад</button><span>${origin}</span></div><div class="item-detail-card ${itemColorClass(p,card)}">${lockBtn}<button type="button" class="item-face-hit" id="itemFlip" aria-label="${reverse?'Показать изображение предмета':'Показать описание предмета'}">${face}</button>${lockNote}${spent?'<div class="item-use-badge">✓ Эффект использован · ожидает восстановления</div>':''}</div>${showEquipError?`<div class="error-box">${equip.why}</div>`:''}<div class="modal-actions" id="itemActions"></div>`;
    document.getElementById('itemFlip').onclick=()=>{sheetView.itemFlipped=!sheetView.itemFlipped;renderItemDetail(getPlayer(p.id)||p,id,ctx)};
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
  function claimValueTreasure(p,id,ctx){
    const live=getPlayer(p.id)||p,card=itemCard(id);
    if(!card||itemType(card)!=='ценность'||!sourceRemove(live,id,ctx))return;
    applyTreasureImmediate(live,card);discardHeldCard(card);log(`${live.name} забирает содержимое тайника «${card.name}».`);
    window.dispatchEvent(new Event('rpg-local-mutation'));renderAfterPendingResolution(live,ctx,'inventory');updateUI();
  }
  function moveToBackpack(p,id,ctx){
    const live=getPlayer(p.id)||p;if(!hasBackpackRoom(live)){alert('Рюкзак заполнен.');return}
    if(!sourceRemove(live,id,ctx)){renderCharacterSheet('inventory');return}
    live.backpack.push(id);log(`${live.name}: «${itemCard(id)?.name}» помещён в рюкзак.`);
    window.dispatchEvent(new Event('rpg-local-mutation'));renderAfterPendingResolution(live,ctx,'backpack');updateUI();
  }
  function unequipToPending(p,id,ctx){
    const live=getPlayer(p.id)||p;
    if(ctx?.slot==='artifact'&&id===191&&live.backpack.length>baseBackpackCapacity(live)){alert(`Сначала освободите рюкзак: без Журнала странника вместимость станет ${baseBackpackCapacity(live)}.`);return}
    if(!sourceRemove(live,id,ctx)){renderCharacterSheet('inventory');return}
    live.pendingItems.push(id);log(`${live.name} снимает «${itemCard(id)?.name}». Предмет оставлен в неразобранных.`);
    window.dispatchEvent(new Event('rpg-local-mutation'));renderCharacterSheet('pending');updateUI();
  }
  function unequipToBackpack(p,id,ctx){
    const live=getPlayer(p.id)||p;if(heroIsActiveCombatant(live)&&!combatCanChangeEquipment(live,itemCard(id))){alert('Снять предмет разрешено только один раз в свой боевой раунд до атаки.');return}if(!canUnequipToBackpack(live,id,ctx.slot)){alert('Недостаточно места в рюкзаке.');return}
    if(!sourceRemove(live,id,ctx)){renderCharacterSheet('inventory');return}
    live.backpack.push(id);if(heroIsActiveCombatant(live))combatRecordEquipmentChange(itemCard(id));log(`${live.name}: «${itemCard(id)?.name}» снят и помещён в рюкзак.`);
    window.dispatchEvent(new Event('rpg-local-mutation'));renderCharacterSheet('backpack');if(heroIsActiveCombatant(live))renderCombat();updateUI();
  }
  function discardItem(p,id,ctx){
    const live=getPlayer(p.id)||p,card=itemCard(id);
    if(isItemLocked(live,id)){alert('Предмет заблокирован для продажи и сброса.');return}
    if(!confirm(`Сбросить «${card?.name||id}»?`))return;
    if(ctx?.where==='equipment'&&ctx.slot==='artifact'&&id===191&&live.backpack.length>baseBackpackCapacity(live)){alert(`Нельзя сбросить Журнал странника, пока в рюкзаке больше ${baseBackpackCapacity(live)} предметов.`);return}
    if(!sourceRemove(live,id,ctx)){renderCharacterSheet('inventory');return}
    discardHeldCard(card);log(`${live.name} сбрасывает «${card?.name||id}».`);
    window.dispatchEvent(new Event('rpg-local-mutation'));renderAfterPendingResolution(live,ctx,'inventory');updateUI();
  }
  function requestEquip(p,id,ctx){const card=itemCard(id),check=canEquipCard(p,card),heroCombat=heroIsActiveCombatant(p);if(!check.ok){alert(check.why);return}if(heroCombat&&!combatCanChangeEquipment(p,card)){alert('Экипировку можно изменить один раз в свой боевой раунд до атаки. Зелья перекладываются без ограничения.');return}if(heroCombat&&ctx?.where!=='backpack'){alert('Во время боя надевать предмет можно только из рюкзака.');return}const slots=targetSlots(card);if(!slots.length)return;const empty=slots.find(s=>getSlotId(p,s)==null);if(empty){const r=equipTransaction(p,id,ctx,empty,'backpack');if(!r.ok){alert(r.why);return}if(heroCombat&&itemType(card)==='зелье'){state.combat.potionUnlockRound=state.combat.potionUnlockRound||{};state.combat.potionUnlockRound[id]=state.combat.round+1;combatPush(`«${card.name}» переложено из рюкзака в быстрый слот. Оно станет доступно в следующий боевой ход героя.`);renderCombat()}window.dispatchEvent(new Event('rpg-local-mutation'));renderAfterPendingResolution(getPlayer(p.id)||p,ctx,'inventory');if(heroCombat)renderCombat();updateUI();return}if(slots.length===1){renderReplaceChoice(p,id,ctx,slots[0]);return}els.sheetContent.innerHTML=`<div class="sheet-nav"><button class="ghost" id="cancelEquip">← К предмету</button><b>Выберите слот для замены</b></div><div class="replace-list">${slots.map(s=>{const c=itemCard(getSlotId(p,s));return `<button class="item-row ${c?itemColorClass(p,c):''}" data-replace-slot="${s}"><span><b>${SLOT_LABELS[s]}</b><small>${c?.name||'пусто'}${c?.fields?.['Эффект']?` · ${c.fields['Эффект']}`:''}</small></span><span>›</span></button>`}).join('')}</div>`;document.getElementById('cancelEquip').onclick=()=>showItemInSheet(id,ctx);els.sheetContent.querySelectorAll('[data-replace-slot]').forEach(b=>b.onclick=()=>renderReplaceChoice(p,id,ctx,b.dataset.replaceSlot))}
  function renderReplaceChoice(p,id,ctx,slot){const oldId=getSlotId(p,slot),old=itemCard(oldId),card=itemCard(id),heroCombat=heroIsActiveCombatant(p);els.sheetContent.innerHTML=`<div class="sheet-nav"><button class="ghost" id="cancelReplace">← Назад</button><b>Замена: ${SLOT_LABELS[slot]}</b></div><div class="compare-box compare-rich"><div class="compare-item-card ${old?itemColorClass(p,old):''}"><small>Сейчас</small><b>${old?.name||'—'}</b>${old?`<div class="card-fields compact">${itemFieldsHtml(old)}</div>`:''}</div><div class="compare-arrow">→</div><div class="compare-item-card ${card?itemColorClass(p,card):''}"><small>Новый</small><b>${card?.name||'—'}</b>${card?`<div class="card-fields compact">${itemFieldsHtml(card)}</div>`:''}</div></div><div class="modal-actions" id="replaceActions"></div>`;document.getElementById('cancelReplace').onclick=()=>showItemInSheet(id,ctx);const box=document.getElementById('replaceActions');const add=(label,cls,mode)=>{const b=document.createElement('button');b.textContent=label;b.className=cls;if(mode==='discard'&&isItemLocked(p,oldId)){b.disabled=true;b.title='Предмет заблокирован для продажи и сброса.'}b.onclick=()=>{if(mode==='discard'&&isItemLocked(p,oldId)){alert('Предмет заблокирован для продажи и сброса.');return}const live=getPlayer(p.id)||p;const r=equipTransaction(live,id,ctx,slot,mode);if(!r.ok){alert(r.why);return}if(heroCombat&&itemType(card)==='зелье'&&ctx?.where==='backpack'){state.combat.potionUnlockRound=state.combat.potionUnlockRound||{};state.combat.potionUnlockRound[id]=state.combat.round+1;combatPush(`«${card.name}» переложено из рюкзака в быстрый слот. Оно станет доступно в следующий боевой ход героя.`);renderCombat()}window.dispatchEvent(new Event('rpg-local-mutation'));renderAfterPendingResolution(p,ctx,'inventory');if(heroCombat)renderCombat();updateUI()};box.appendChild(b)};if(slot==='mercenary'){const b=document.createElement('button');b.textContent='Взять нового наёмника, старого распустить';b.className='success';if(isItemLocked(p,oldId)){b.disabled=true;b.title='Предмет заблокирован для продажи и сброса.'}b.onclick=()=>{if(isItemLocked(p,oldId)){alert('Предмет заблокирован для продажи и сброса.');return}const live=getPlayer(p.id)||p;const r=equipTransaction(live,id,ctx,slot,'discard');if(!r.ok){alert(r.why);return}window.dispatchEvent(new Event('rpg-local-mutation'));renderAfterPendingResolution(p,ctx,'inventory');if(heroCombat)renderCombat();updateUI()};box.appendChild(b);return}add('Заменить, старый в рюкзак','success','backpack');if(!heroCombat)add('Заменить и сбросить старый','danger','discard');}
  function territoryFullCost(hex){return fullAreaForTerritory(hex)?20:10}
  function fullAreaForTerritory(hex){const t=state.territories[hex];if(!t?.areaId)return null;return state.areas.find(a=>a.id===t.areaId&&a.owner===t.owner)||null}
  function tributeCostFor(hex){return fullAreaForTerritory(hex)?20:10}
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
    oldOwner.maxHp=Math.max(oldOwner.hp||1,oldOwner.maxHp-2);oldOwner.currentHp=Math.min(oldOwner.currentHp,oldOwner.maxHp);
    newOwner.maxHp+=2;newOwner.currentHp=Math.min(newOwner.maxHp,newOwner.currentHp+2);
    t.owner=newOwner.id;t.areaId=null;
    if(payment>0){const paid=transferGold(newOwner,oldOwner,payment);log(`${newOwner.name} выплачивает ${oldOwner.name} <b>${paid} золота</b> за территорию ${hex}.`)}
    log(`<b>${newOwner.name} захватывает территорию ${hex}</b>. Максимум ЗД: ${newOwner.maxHp}; у ${oldOwner.name}: ${oldOwner.maxHp}.`);return true;
  }
  // Resolve a contest as a complete turn, never continue a path after a capture or avoidance attempt.
  function finishTerritoryAttempt(p,reason){
    state.foreignTerritoryPending=null;state.moveTransit=null;state.pendingMoveAction=null;
    if(state.started&&!state.gameOver&&currentPlayer()?.id===p.id&&p.currentHp>0)advanceTurnState(p,reason);
    else{updateUI();renderBoard()}
  }
  function territoryAttemptDamage(p,amount,expr,reason,after){
    showRollPopup(reason,amount,`${expr} = <b>${amount}</b>`,`Урон герою ${p.name}`,null,()=>{
      const died=damage(p,amount);if(!died)after();
    },'Продолжить',false);
  }
  function attemptAvoidTribute(){
    const p=currentPlayer(),pend=state.foreignTerritoryPending;if(!pend||pend.heroId!==p.id)return;
    const owner=getPlayer(pend.ownerId),d=rand(20),cha=effectiveStat(p,'cha'),total=d+cha,failedCost=15;
    const natural=d===20?20:d===1?1:null,ok=d===20?true:d===1?false:total>=12;
    announceCheck(`Избегание дани · ${pend.hex}`,d,'ХАР',cha,total,12,ok,natural,ok?'Дань не платится':`При провале: ${failedCost} золота`,()=>{
      if(d===20){const pay=Math.floor(territoryFullCost(pend.hex)*.5);log(`${p.name}: избегание дани — натуральная 20, территория захвачена.`);transferTerritory(pend.hex,p.id,pay,owner.id);finishTerritoryAttempt(p,'автоматический захват территории');return}
      if(ok){log(`${p.name}: дань успешно избегнута (D20 ${d} + ${signed(cha)} = ${total}).`);finishTerritoryAttempt(p,'избегание дани');return}
      const paid=transferGold(p,owner,failedCost);
      if(d===1){const r1=rand(6),r2=rand(6);log(`${p.name}: натуральная 1 при избегании дани: выплачено ${paid} золота, получено 2D6=${r1+r2} урона.`);territoryAttemptDamage(p,r1+r2,'2D6','Избегание дани · Натуральная 1',()=>finishTerritoryAttempt(p,'неудачное избегание дани'));return}
      if(paid<failedCost){const dmg=rand(6);log(`${p.name}: избегание провалено: отдано всё золото (${paid}/${failedCost}), D6=${dmg} урона.`);territoryAttemptDamage(p,dmg,'D6','Не хватило золота · урон',()=>finishTerritoryAttempt(p,'неудачное избегание дани'));return}
      log(`${p.name}: избегание провалено, выплачено ${paid} золота.`);finishTerritoryAttempt(p,'неудачное избегание дани');
    });
  }
  function attemptCaptureTerritory(){
    const p=currentPlayer(),pend=state.foreignTerritoryPending;if(!pend||pend.heroId!==p.id)return;
    const owner=getPlayer(pend.ownerId),cost=territoryFullCost(pend.hex);if(p.gold<cost)return;
    const d=rand(20),cha=effectiveStat(p,'cha'),total=d+cha,natural=d===20?20:d===1?1:null,ok=d===20?true:d===1?false:total>=15;
    announceCheck(`Захват территории · ${pend.hex}`,d,'ХАР',cha,total,15,ok,natural,'',()=>{
      if(d===20){log(`${p.name}: натуральная 20 — автоматический захват без выплаты.`);transferTerritory(pend.hex,p.id,0,owner.id);finishTerritoryAttempt(p,'захват территории');return}
      if(d===1){const paid=transferGold(p,owner,cost),dmg=rand(6);log(`${p.name}: захват провален (натуральная 1), выплачено ${paid} золота, D6=${dmg} урона.`);territoryAttemptDamage(p,dmg,'D6','Захват · Натуральная 1',()=>finishTerritoryAttempt(p,'провал захвата'));return}
      if(ok){log(`${p.name}: захват успешен (D20 ${d} + ${signed(cha)} = ${total}).`);transferTerritory(pend.hex,p.id,cost,owner.id);finishTerritoryAttempt(p,'захват территории');return}
      const paid=transferGold(p,owner,cost);log(`${p.name}: захват провален — выплачено ${paid}/${cost} золота.`);finishTerritoryAttempt(p,'провал захвата');
    });
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
    document.getElementById('tradeRoleBuy').onclick=()=>{if(onlineLocalHeroId){startOnlineTradeDeal(active,other,'buyer_select');return}openTradeBuyerSelection(active,other,[])};
    document.getElementById('tradeRoleSell').onclick=()=>{if(onlineLocalHeroId){startOnlineTradeDeal(other,active,'seller_offer');return}openTradeBuyerSelection(other,active,[])};
    document.getElementById('tradeRoleClose').onclick=()=>{closeModal();endSideInteraction()};
  }
  function tradeGroupedCards(entries,renderEntry){
    const equipped=entries.filter(e=>e.ctx?.where==='equipment');
    const backpack=entries.filter(e=>e.ctx?.where==='backpack');
    const other=entries.filter(e=>e.ctx?.where!=='equipment'&&e.ctx?.where!=='backpack');
    const line=backpack.length?'<div class="trade-backpack-divider" role="separator"><span>Рюкзак</span></div>':'';
    return equipped.map(renderEntry).join('')+line+backpack.map(renderEntry).join('')+other.map(renderEntry).join('');
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
    els.modalContent.innerHTML=`<div class="card-kicker">Торговля · выбор покупателя</div><div class="card-title">${buyer.name} выбирает предметы у ${seller.name}</div><div class="merchant-summary"><span>Покупатель: <b>${buyer.name}</b><strong class="trade-gold">${buyer.gold} зол.</strong></span><span>Продавец: <b>${seller.name}</b><strong class="trade-gold">${seller.gold} зол.</strong></span><span>Выбрано: <b>${selected.size}</b></span><span>Максимум сделки: <b>${max} зол.</b></span></div><div class="merchant-grid">${entries.length?tradeGroupedCards(entries,e=>tradeSelectionCard(seller,e,selected.has(Number(e.id)))):'<div class="empty-box">У продавца нет предметов для торговли.</div>'}</div><div class="modal-actions"><button id="tradeBuyerContinue" class="success" ${selected.size?'':'disabled'}>Купить выбранное (${selected.size})</button><button id="tradeBuyerBack" class="secondary">Назад</button><button id="tradeBuyerClose" class="secondary">Закрыть</button></div>`;
    els.modal.hidden=false;
    els.modalContent.querySelectorAll('[data-trade-toggle]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.tradeToggle);if(selected.has(id))selected.delete(id);else selected.add(id);openTradeBuyerSelection(buyer,seller,[...selected])});
    document.getElementById('tradeBuyerContinue').onclick=()=>openTradeSellerReview(buyer,seller,[...selected],null);
    document.getElementById('tradeBuyerBack').onclick=()=>{const active=getPlayer(sideInteractionOwnerId())||buyer;openTradeRoleChoice(active.id===buyer.id?seller:buyer,active)};
    document.getElementById('tradeBuyerClose').onclick=()=>{closeModal();endSideInteraction()};
  }
  function tradeReviewItemsHtml(owner,entries,withRemove=false){
    return tradeGroupedCards(entries,e=>`<div class="merchant-card ${itemColorClass(owner,e.card)}"><div class="merchant-card-head"><div><small>№${e.card.id} · ${e.where}</small><b>${e.card.name}</b></div><div class="merchant-price">${numericItemPrice(e.card)} зол.</div></div><div class="card-fields compact">${itemFieldsHtml(e.card)}</div>${withRemove?`<button data-trade-remove="${e.id}" class="danger">🗑 Удалить из сделки</button>`:''}</div>`);
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


  // v0.6.35 — полноценная двусторонняя сетевая торговля.
  // Сделка живёт в общем состоянии партии, но изменяется участниками через side-sync,
  // поэтому она не блокирует ход следующего героя и не конфликтует с боем/движением.
  function tradeDealTouch(deal){if(!deal)return;deal.rev=Number(deal.rev||0)+1;deal.updatedAt=Date.now()}
  function tradeDealLocalId(){return onlineLocalHeroId||null}
  function tradeDealParticipants(deal){return [deal?.buyerId,deal?.sellerId].filter(Boolean)}
  function startOnlineTradeDeal(buyer,seller,stage='buyer_select'){
    if(!onlineLocalHeroId||!buyer||!seller)return;
    state.tradeDeal={id:`trade-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,rev:1,createdAt:Date.now(),updatedAt:Date.now(),hex:seller.hex,initiatorId:sideInteractionOwnerId()||onlineLocalHeroId,buyerId:buyer.id,sellerId:seller.id,stage,selectedIds:[],price:0,acks:{},resultText:''};
    closeModal();updateUI();renderBoard();setTimeout(maybeShowTradeDeal,0);
  }
  function setOnlineTradeStage(deal,stage,patch={}){
    if(!deal||state.tradeDeal?.id!==deal.id)return;deal=state.tradeDeal;Object.assign(deal,patch);deal.stage=stage;tradeDealTouch(deal);closeModal();updateUI();renderBoard();setTimeout(maybeShowTradeDeal,0);
  }
  function rejectOnlineTrade(reason='Сделка отклонена.'){
    const deal=state.tradeDeal;if(!deal)return;const buyer=getPlayer(deal.buyerId),seller=getPlayer(deal.sellerId);deal.resultText=reason;deal.acks={};deal.stage='rejected';tradeDealTouch(deal);log(`<b>Торговля:</b> ${reason} (${buyer?.name||'покупатель'} ↔ ${seller?.name||'продавец'}).`);closeModal();updateUI();setTimeout(maybeShowTradeDeal,0);
  }
  function onlineTradeShell(deal,stage,inner){return `<div class="player-trade-shell" data-trade-id="${deal.id}" data-trade-stage="${stage}">${inner}</div>`}
  function prepareOnlineTradeModal(ownerId,onClose){modalOffturnOwnerId=ownerId;modalCloseAction=onClose||(()=>rejectOnlineTrade('Участник закрыл окно и отменил сделку.'));els.modalClose.style.display='';els.modal.hidden=false}
  function renderOnlineTradeBuyerSelection(deal,selectedIds=null){
    deal=state.tradeDeal?.id===deal?.id?state.tradeDeal:null;if(!deal)return;
    const buyer=getPlayer(deal.buyerId),seller=getPlayer(deal.sellerId);if(!buyer||!seller)return rejectOnlineTrade('Один из участников сделки больше недоступен.');
    const selected=new Set((selectedIds??deal.selectedIds??[]).map(Number)),entries=tradeSellEntries(seller),live=new Set(entries.map(e=>Number(e.id)));for(const id of [...selected])if(!live.has(id))selected.delete(id);
    const selectedEntries=entries.filter(e=>selected.has(Number(e.id))),max=selectedEntries.reduce((sum,e)=>sum+(numericItemPrice(e.card)||0),0);
    els.modalContent.innerHTML=onlineTradeShell(deal,'buyer_select',`<div class="card-kicker">Сетевая торговля · выбор покупателя</div><div class="card-title">${buyer.name} выбирает предметы у ${seller.name}</div><div class="merchant-summary"><span>Покупатель: <b>${buyer.name}</b><strong class="trade-gold">${buyer.gold} зол.</strong></span><span>Продавец: <b>${seller.name}</b><strong class="trade-gold">${seller.gold} зол.</strong></span><span>Выбрано: <b>${selected.size}</b></span><span>Максимум: <b>${max} зол.</b></span></div><div class="merchant-grid">${entries.length?tradeGroupedCards(entries,e=>tradeSelectionCard(seller,e,selected.has(Number(e.id)))):'<div class="empty-box">У продавца нет предметов для торговли.</div>'}</div><div class="modal-actions"><button id="onlineTradeBuyerSend" class="success" ${selected.size?'':'disabled'}>Отправить продавцу (${selected.size})</button><button id="onlineTradeCancel" class="danger">Отменить сделку</button></div>`);
    prepareOnlineTradeModal(buyer.id,()=>rejectOnlineTrade(`${buyer.name} отменил сделку.`));
    els.modalContent.querySelectorAll('[data-trade-toggle]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.tradeToggle);if(selected.has(id))selected.delete(id);else selected.add(id);renderOnlineTradeBuyerSelection(deal,[...selected])});
    document.getElementById('onlineTradeBuyerSend').onclick=()=>{const live=state.tradeDeal?.id===deal.id?state.tradeDeal:null,sellerNow=live?getPlayer(live.sellerId):null;if(!live||!sellerNow)return closeModal();const check=tradeSelectionCheck(sellerNow,[...selected]);if(!check.ok){alert(check.why);renderOnlineTradeBuyerSelection(live,check.entries.map(e=>e.id));return}setOnlineTradeStage(live,'seller_review',{selectedIds:check.entries.map(e=>Number(e.id)),price:check.max,acks:{}})};
    document.getElementById('onlineTradeCancel').onclick=()=>rejectOnlineTrade(`${buyer.name} отменил сделку.`);
  }
  function renderOnlineTradeSellerOffer(deal,selectedIds=null){
    deal=state.tradeDeal?.id===deal?.id?state.tradeDeal:null;if(!deal)return;
    const buyer=getPlayer(deal.buyerId),seller=getPlayer(deal.sellerId);if(!buyer||!seller)return rejectOnlineTrade('Один из участников сделки больше недоступен.');
    const selected=new Set((selectedIds??deal.selectedIds??[]).map(Number)),entries=tradeSellEntries(seller),live=new Set(entries.map(e=>Number(e.id)));for(const id of [...selected])if(!live.has(id))selected.delete(id);
    const chosen=entries.filter(e=>selected.has(Number(e.id))),max=chosen.reduce((sum,e)=>sum+(numericItemPrice(e.card)||0),0);
    els.modalContent.innerHTML=onlineTradeShell(deal,'seller_offer',`<div class="card-kicker">Сетевая торговля · предложение продавца</div><div class="card-title">${seller.name}: выберите предметы для ${buyer.name}</div><div class="merchant-summary"><span>Продавец: <b>${seller.name}</b><strong class="trade-gold">${seller.gold} зол.</strong></span><span>Покупатель: <b>${buyer.name}</b><strong class="trade-gold">${buyer.gold} зол.</strong></span><span>Выбрано: <b>${selected.size}</b></span><span>Максимум: <b>${max} зол.</b></span></div><div class="merchant-grid">${entries.length?tradeGroupedCards(entries,e=>tradeSelectionCard(seller,e,selected.has(Number(e.id)))):'<div class="empty-box">Нет предметов для торговли.</div>'}</div><div class="modal-actions"><button id="onlineTradeSellerOfferNext" class="success" ${selected.size?'':'disabled'}>Продолжить (${selected.size})</button><button id="onlineTradeCancel" class="danger">Отменить сделку</button></div>`);
    prepareOnlineTradeModal(seller.id,()=>rejectOnlineTrade(`${seller.name} отменил сделку.`));
    els.modalContent.querySelectorAll('[data-trade-toggle]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.tradeToggle);if(selected.has(id))selected.delete(id);else selected.add(id);renderOnlineTradeSellerOffer(deal,[...selected])});
    document.getElementById('onlineTradeSellerOfferNext').onclick=()=>{const live=state.tradeDeal?.id===deal.id?state.tradeDeal:null,sellerNow=live?getPlayer(live.sellerId):null;if(!live||!sellerNow)return closeModal();const check=tradeSelectionCheck(sellerNow,[...selected]);if(!check.ok){alert(check.why);return}live.selectedIds=check.entries.map(e=>Number(e.id));live.price=check.max;live.stage='seller_review';tradeDealTouch(live);renderOnlineTradeSellerReview(live,live.selectedIds,live.price)};
    document.getElementById('onlineTradeCancel').onclick=()=>rejectOnlineTrade(`${seller.name} отменил сделку.`);
  }
  function renderOnlineTradeSellerReview(deal,selectedIds=null,proposedPrice=null){
    deal=state.tradeDeal?.id===deal?.id?state.tradeDeal:null;if(!deal)return;
    const buyer=getPlayer(deal.buyerId),seller=getPlayer(deal.sellerId);if(!buyer||!seller)return rejectOnlineTrade('Один из участников сделки больше недоступен.');
    const ids=(selectedIds??deal.selectedIds??[]).map(Number),check=tradeSelectionCheck(seller,ids);
    if(!check.ok&&ids.length){alert(check.why);return rejectOnlineTrade(`Сделка отменена: ${check.why}`)}
    const entries=check.ok?check.entries:[],max=check.ok?check.max:0;let price=proposedPrice==null?max:Math.floor(Number(proposedPrice));if(!Number.isFinite(price))price=max;price=Math.max(0,Math.min(max,price));
    const initiatorWasBuyer=deal.initiatorId===buyer.id;
    els.modalContent.innerHTML=onlineTradeShell(deal,'seller_review',`<div class="card-kicker">Сетевая торговля · подтверждение продавца</div><div class="card-title">${initiatorWasBuyer?`${buyer.name} хочет купить у ${seller.name}`:`${seller.name}: подтвердите своё предложение`}</div><div class="card-field">Продавец <b>${seller.name}</b> должен подтвердить состав и общую цену. Только после этого предложение отправится покупателю.</div><div class="merchant-summary"><span>Покупатель: <b>${buyer.name}</b><strong class="trade-gold">${buyer.gold} зол.</strong></span><span>Продавец: <b>${seller.name}</b><strong class="trade-gold">${seller.gold} зол.</strong></span><span>Предметов: <b>${entries.length}</b></span><span>Максимум: <b>${max} зол.</b></span></div><div class="merchant-grid">${entries.length?tradeReviewItemsHtml(seller,entries,true):'<div class="empty-box">В сделке не осталось предметов.</div>'}</div><div class="card-field trade-price-field"><b>Общая сумма продажи:</b><br><input id="onlineTradeTotalPrice" type="number" min="0" max="${max}" step="1" value="${price}"> <span class="muted">не более ${max} зол.</span></div><div class="modal-actions"><button id="onlineTradeSellerAccept" class="success" ${entries.length?'':'disabled'}>Отправить покупателю</button><button id="onlineTradeSellerReject" class="danger">Отклонить</button></div>`);
    prepareOnlineTradeModal(seller.id,()=>rejectOnlineTrade(`${seller.name} отклонил сделку.`));
    const currentPrice=()=>{let v=Math.floor(Number(document.getElementById('onlineTradeTotalPrice')?.value));if(!Number.isFinite(v))v=0;return Math.max(0,Math.min(max,v))};
    els.modalContent.querySelectorAll('[data-trade-remove]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.tradeRemove),next=ids.filter(x=>x!==id);renderOnlineTradeSellerReview(deal,next,currentPrice())});
    document.getElementById('onlineTradeSellerReject').onclick=()=>rejectOnlineTrade(`${seller.name} отклонил предложенную сделку.`);
    document.getElementById('onlineTradeSellerAccept').onclick=()=>{const live=state.tradeDeal?.id===deal.id?state.tradeDeal:null,sellerNow=live?getPlayer(live.sellerId):null;if(!live||!sellerNow)return closeModal();const nextCheck=tradeSelectionCheck(sellerNow,ids);if(!nextCheck.ok){alert(nextCheck.why);return}setOnlineTradeStage(live,'buyer_final',{selectedIds:nextCheck.entries.map(e=>Number(e.id)),price:Math.min(nextCheck.max,currentPrice()),acks:{}})};
  }
  function renderOnlineTradeBuyerFinal(deal){
    deal=state.tradeDeal?.id===deal?.id?state.tradeDeal:null;if(!deal)return;
    const buyer=getPlayer(deal.buyerId),seller=getPlayer(deal.sellerId);if(!buyer||!seller)return rejectOnlineTrade('Один из участников сделки больше недоступен.');
    const check=tradeSelectionCheck(seller,(deal.selectedIds||[]).map(Number));if(!check.ok)return rejectOnlineTrade(`Сделка отменена: ${check.why}`);const price=Math.max(0,Math.min(check.max,Math.floor(Number(deal.price)||0)));
    els.modalContent.innerHTML=onlineTradeShell(deal,'buyer_final',`<div class="card-kicker">Сетевая торговля · финальное подтверждение</div><div class="card-title">${buyer.name}: подтвердите покупку у ${seller.name}</div><div class="merchant-summary"><span>Продавец: <b>${seller.name}</b><strong class="trade-gold">${seller.gold} зол.</strong></span><span>Покупатель: <b>${buyer.name}</b><strong class="trade-gold">${buyer.gold} зол.</strong></span><span>Предметов: <b>${check.entries.length}</b></span><span>Цена: <b>${price} зол.</b></span></div><div class="merchant-grid">${tradeReviewItemsHtml(seller,check.entries,false)}</div><div class="card-field"><b>Итого к оплате:</b> ${price} золота.${buyer.gold<price?`<br><span class="merchant-note">Недостаточно золота: у ${buyer.name} только ${buyer.gold}.</span>`:''}</div><div class="modal-actions"><button id="onlineTradeBuyerAcceptFinal" class="success" ${buyer.gold<price?'disabled':''}>Подтвердить покупку</button><button id="onlineTradeBuyerRejectFinal" class="danger">Отклонить</button></div>`);
    prepareOnlineTradeModal(buyer.id,()=>rejectOnlineTrade(`${buyer.name} отклонил финальное предложение.`));
    document.getElementById('onlineTradeBuyerRejectFinal').onclick=()=>rejectOnlineTrade(`${buyer.name} отклонил финальное предложение.`);
    document.getElementById('onlineTradeBuyerAcceptFinal').onclick=()=>executeOnlineTradeDeal(deal);
  }
  function executeOnlineTradeDeal(deal){
    deal=state.tradeDeal?.id===deal?.id?state.tradeDeal:null;if(!deal||deal.stage!=='buyer_final')return;const buyer=getPlayer(deal.buyerId),seller=getPlayer(deal.sellerId);if(!buyer||!seller)return rejectOnlineTrade('Один из участников сделки больше недоступен.');
    const check=tradeSelectionCheck(seller,(deal.selectedIds||[]).map(Number));if(!check.ok){alert(check.why);return rejectOnlineTrade(`Сделка отменена: ${check.why}`)}const price=Math.max(0,Math.min(check.max,Math.floor(Number(deal.price)||0)));if(buyer.gold<price){alert(`${buyer.name}: недостаточно золота. Нужно ${price}, есть ${buyer.gold}.`);return}
    const backpackSnapshot=[...seller.backpack],equipmentSnapshot=JSON.parse(JSON.stringify(seller.equipment)),usageSnapshot={...seller.itemUsage};
    for(const e of check.entries){const fresh=tradeEntryMap(seller).get(Number(e.id));if(!fresh||!sourceRemove(seller,e.id,fresh.ctx)){seller.backpack=backpackSnapshot;seller.equipment=equipmentSnapshot;seller.itemUsage=usageSnapshot;alert('Не удалось передать все предметы. Сделка отменена.');return rejectOnlineTrade('Не удалось передать все предметы. Сделка отменена.')}}
    buyer.gold-=price;gainGold(seller,price);ensurePlayerStats(buyer);ensurePlayerStats(seller);buyer.stats.playerTrades++;seller.stats.playerTrades++;for(const e of check.entries){buyer.pendingItems.push(e.id);delete seller.itemUsage[e.id]}
    const names=check.entries.map(e=>`«${e.card.name}»`).join(', ');deal.price=price;deal.resultText=`${buyer.name} купил у ${seller.name} ${check.entries.length} предмет(а/ов) за ${price} золота: ${names}.`;deal.acks={};deal.stage='completed';tradeDealTouch(deal);log(`<b>Сделка:</b> ${deal.resultText}`);closeModal();updateUI();renderBoard();setTimeout(maybeShowTradeDeal,0);
  }
  function renderOnlineTradeResult(deal){
    deal=state.tradeDeal?.id===deal?.id?state.tradeDeal:null;if(!deal)return;
    const localId=tradeDealLocalId(),buyer=getPlayer(deal.buyerId),seller=getPlayer(deal.sellerId);if(!localId||![deal.buyerId,deal.sellerId].includes(localId))return;if(deal.acks?.[localId])return;
    const ok=deal.stage==='completed',title=ok?'Сделка завершена':'Сделка отклонена',text=deal.resultText||(ok?`${buyer?.name||'Покупатель'} и ${seller?.name||'продавец'} завершили сделку.`:'Сделка была отклонена одним из игроков.');
    els.modalContent.innerHTML=onlineTradeShell(deal,deal.stage,`<div class="card-kicker">Сетевая торговля</div><div class="card-title">${title}</div><div class="card-field">${text}</div><div class="modal-actions"><button id="onlineTradeResultDone" class="success">Закрыть</button></div>`);prepareOnlineTradeModal(localId,()=>ackOnlineTradeDeal(deal));document.getElementById('onlineTradeResultDone').onclick=()=>ackOnlineTradeDeal(deal);
  }
  function ackOnlineTradeDeal(deal){
    const localId=tradeDealLocalId();if(!deal||!localId||state.tradeDeal?.id!==deal.id)return closeModal();deal=state.tradeDeal;deal.acks=deal.acks||{};deal.acks[localId]=true;const both=tradeDealParticipants(deal).every(id=>deal.acks[id]);if(both)deal.stage='closed';tradeDealTouch(deal);closeModal();if(deal.stage==='closed'&&sideInteraction?.type==='trade')endSideInteraction();updateUI();renderBoard();if(deal.stage!=='closed'&&localId===deal.buyerId&&deal.stage==='completed'&&getPlayer(localId)?.pendingItems?.length)setTimeout(()=>openCharacterSheet('pending',null,localId),0);
  }
  function maybeShowTradeDeal(){
    const deal=state.tradeDeal,localId=tradeDealLocalId();if(!deal||!localId||![deal.buyerId,deal.sellerId].includes(localId))return;
    if(deal.stage==='closed')return;
    // Не перекрываем живой бой наблюдателю: после «Скрыть бой» сделка появится автоматически.
    if(state.combat&&!combatWindowHidden&&!localControlsCombat())return;
    const shown=els.modalContent.querySelector('.player-trade-shell');if(shown){const same=shown.dataset.tradeId===deal.id&&shown.dataset.tradeStage===deal.stage;if(same)return;closeModal()}
    if(!els.modal.hidden)return;
    if(deal.stage==='buyer_select'&&localId===deal.buyerId)return renderOnlineTradeBuyerSelection(deal);
    if(deal.stage==='seller_offer'&&localId===deal.sellerId)return renderOnlineTradeSellerOffer(deal);
    if(deal.stage==='seller_review'&&localId===deal.sellerId)return renderOnlineTradeSellerReview(deal);
    if(deal.stage==='buyer_final'&&localId===deal.buyerId)return renderOnlineTradeBuyerFinal(deal);
    if(['completed','rejected'].includes(deal.stage)&&!deal.acks?.[localId])return renderOnlineTradeResult(deal);
  }

  // ========================= v0.5 — БОЕВАЯ СИСТЕМА =========================
  const HERO_COMBAT={
    warrior:{ability:'Железная стойкость',effect:'1 раз за бой уменьши полученный урон на D4.',natural20:'Боевой напор — преимущество на 2 следующие атаки в этом бою.'},
    dwarf:{ability:'Каменная кровь',effect:'1 раз за бой уменьши полученный урон на D6.',natural20:'Оглушающий удар — враг оглушён и пропускает следующую атаку.'},
    mage:{ability:'Живительная искра',effect:'1 раз за бой восстанови D6 ЗД.',natural20:'Стихийный разряд — выбери Молнию (+D4 и Оглушение) или Огонь (+D4 и Горение).'},
    archer:{ability:'Меткий выстрел',effect:'1 раз за бой сделай следующую атаку с преимуществом.',natural20:'Двойная стрела — урон этой успешной атаки ×2.'},
    rogue:{ability:'Теневой обман',effect:'1 раз за бой следующая атака врага выполняется с помехой.',natural20:'Кровоточащий удар — урон ×2 и Кровотечение.'}
  };
  function inCombat(){return !!state.combat}
  function combatEnemy(){return state.combat?itemCard(state.combat.cardId):null}
  function combatEnemyType(){return String(combatEnemy()?.fields?.['Тип']||'').toLowerCase()}
  let combatJournalInstance=null,combatJournalVisible=false;
  function combatPush(text){const c=state.combat;if(!c)return;c.history=c.history||[];c.history.unshift(text);}
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
  // Display-only bridge: the core RPG rolls first; Arcana receives resolved values.
  const ARCANA_DURATION=1000, ARCANA_RESULT_HOLD=3000;
  // v0.6.54: attack results stay 1s longer; damage results 0.5s shorter.
  const ARCANA_ATTACK_HOLD=4000, ARCANA_DAMAGE_HOLD=2500;
  function arcanaCombatHold(roll,phase=''){
    const title=String(roll?.title||'').toLowerCase();
    if(phase==='hero_roll'||phase==='enemy_roll'||/^атака\s+(героя|врага)/.test(title))return ARCANA_ATTACK_HOLD;
    if(phase==='hero_damage'||phase==='enemy_damage'||/^урон\s+(героя|врага)/.test(title)||/атака врага.*урон/.test(title))return ARCANA_DAMAGE_HOLD;
    return ARCANA_RESULT_HOLD;
  }
  let arcanaHost=null,arcanaAnimator=null,arcanaPresentationKey='',arcanaPlaying=false;
  function dicePlainText(markup){const el=document.createElement('div');el.innerHTML=String(markup||'');return (el.textContent||'').replace(/\s+/g,' ').trim()}
  function combatArcanaDescription(c,roll){
    const formula=dicePlainText(roll.math),detail=dicePlainText(roll.detail);
    const outcome=combatRollOutcome();
    const status=outcome===null?'':(outcome?'ПОПАДАНИЕ':'ПРОМАХ');
    const comparison=roll.dice?.length>1&&roll.dice.every(d=>d.sides===20)?`D20: ${roll.dice.map(d=>d.value).join(' / ')} → ${roll.main}`:'';
    return [comparison,formula||`D20: ${roll.main}`,status,(!formula&&detail?detail:'')].filter(Boolean).join(' · ');
  }
  // Values are taken from the actual resolved attack, including dynamic bonuses and defense.
  // No extra die roll and no combat logic is performed here.
  function combatArcanaAttackDetails(c,roll){
    if(!c || !Array.isArray(roll.dice) || !roll.dice.length ||
      !roll.dice.every(d=>d.sides===20))return null;
    const hero=c.phase==='hero_roll' && c.attackRoll;
    const enemy=c.phase==='enemy_roll' && c.enemyAttackRoll;
    if(!hero && !enemy)return null;
    const a=hero?c.attackRoll:c.enemyAttackRoll;
    if(Number(roll.main)!==Number(a.chosen))return null;
    const modifiers=[];
    if(hero){
      const stat=Number(a.profile?.stat||0);
      modifiers.push({value:stat,label:statName(a.profile?.key)||'характеристика'});
      const remaining=Number(a.bonus||0)-stat;
      if(remaining)modifiers.push({value:remaining,label:'бонус'});
    }else modifiers.push({value:Number(a.bonus||0),label:'АТК'});
    return {
      kind:'attack',base:Number(a.chosen),modifiers,
      total:Number(a.total),defense:Number(a.target),
      outcome:hero?combatHeroAttackHits(c):combatEnemyAttackHits(c),
      natural:a.natural
    };
  }


  function arcanaDiceFromRoll(title,main,math,explicit){
    if(Array.isArray(explicit)&&explicit.length)return explicit.filter(x=>[4,6,8,10,12,20].includes(Number(x.sides))&&Number.isInteger(Number(x.value))&&Number(x.value)>=1&&Number(x.value)<=Number(x.sides)).map(x=>({sides:Number(x.sides),value:Number(x.value)}));
    const token=String(title).match(/(?:^|[^\d])(\d*)D(4|6|8|10|12|20)(?!\d)/i)||String(math).match(/(?:^|[^\d])(\d*)D(4|6|8|10|12|20)(?!\d)/i);
    if(!token)return [];
    const count=Number(token[1]||1),sides=Number(token[2]),value=Number(main);
    return count===1&&Number.isInteger(value)&&value>=1&&value<=sides?[{sides,value}]:[];
  }
  function combatSetRoll(title,main,math='',detail='',natural=null,dice=null){
    const c=state.combat;if(!c)return;
    c.rollPresentationSeq=(Number(c.rollPresentationSeq)||0)+1;
    c.lastRoll={title,main:String(main),math,detail,natural,seq:c.rollPresentationSeq,dice:arcanaDiceFromRoll(title,main,math,dice)};
  }
  // v0.6.54: compact, standalone dice overlay. It does not alter game logic.
  let arcanaBattleLayer=null,arcanaBattleHold=null,arcanaBattleStamp=0;
  function stopArcanaBattlePresentation(){
    ++arcanaBattleStamp;
    if(arcanaBattleHold!==null)clearTimeout(arcanaBattleHold);
    arcanaBattleHold=null;
    if(arcanaBattleLayer)arcanaBattleLayer.hidden=true;
    document.body.classList.remove('arcana-battle-presenting');
    arcanaPlaying=false;
  }
  function ensureArcanaBattleLayer(){
    if(!arcanaBattleLayer){
      arcanaBattleLayer=document.createElement('div');
      arcanaBattleLayer.className='arcana-battle-layer';
      arcanaBattleLayer.hidden=true;
      arcanaBattleLayer.innerHTML='<div class="arcana-battle-card" role="status" aria-label="Анимация броска кубика"></div>';
      document.body.appendChild(arcanaBattleLayer);
    }
    if(!arcanaHost){
      arcanaHost=document.createElement('div');
      arcanaHost.className='arcana-combat-dice';
      arcanaBattleLayer.querySelector('.arcana-battle-card').appendChild(arcanaHost);
    }
    if(!arcanaAnimator){
      try{arcanaAnimator=window.FantasyDice.create({container:arcanaHost,duration:ARCANA_DURATION,speed:1,controls:false,reducedMotion:'auto'})}
      catch(err){console.warn('Arcana combat:',err);return false}
    }
    return true;
  }
  function arcanaPresentCombat(c){
    if(!window.FantasyDice||!c?.lastRoll)return;
    const roll=c.lastRoll,key=`${c.instanceId||'combat'}:${roll.seq||0}`;
    if(!Array.isArray(roll.dice)||!roll.dice.length){
      if(arcanaPresentationKey!==key){arcanaPresentationKey=key;stopArcanaBattlePresentation()}
      return;
    }
    // The former inline combat result panel is gone. Dice remain in the independent
    // Arcana overlay, so no inline target is needed to present a roll.
    if(arcanaPresentationKey===key)return;
    arcanaPresentationKey=key;
    if(!ensureArcanaBattleLayer())return;
    stopArcanaBattlePresentation();
    const stamp=++arcanaBattleStamp;
    arcanaBattleLayer.hidden=false;
    // Align the desktop popup with the central combat panel, never the full browser viewport.
    const combatPane=els.modal?.querySelector('.modal-card:has(.combat-shell)') || els.modalContent;
    const paneRect=combatPane.getBoundingClientRect();
    arcanaBattleLayer.style.setProperty('--arcana-center-x',`${Math.round(paneRect.left+paneRect.width/2)}px`);
    // Slightly below the middle of the gameplay column, preserving the visible combat summary.
    arcanaBattleLayer.style.setProperty('--arcana-center-y',`${Math.round(paneRect.top+paneRect.height*.50)}px`);
    document.body.classList.add('arcana-battle-presenting');
    arcanaPlaying=true;
    // Outcome is passed as resolved data and is revealed ONLY after the animation settles.
    const original=String(roll.title||'Бросок');const owner=original.startsWith('Атака героя')||original.startsWith('Урон героя')?currentPlayer()?.name:original.startsWith('Атака врага')||original.startsWith('Урон врага')?combatEnemy()?.name:null;const label=owner?(original.toLowerCase().includes('урон')?`Урон · ${owner}`:`Атака · ${owner}`):original.replace('Атака врага · урон',`Урон · ${combatEnemy()?.name||'врага'}`);const payload={id:key,label,dice:roll.dice,total:combatArcanaDescription(c,roll).slice(0,125)};
    const breakdown=combatArcanaAttackDetails(c,roll);
    const formula=dicePlainText(roll.math);
    const lastNumber=formula.match(/=\s*(-?\d+)\s*$/);
    const rollFinal=lastNumber?Number(lastNumber[1]):Number(roll.main);
    if(breakdown)payload.breakdown=breakdown;
    else if(Number.isFinite(rollFinal))payload.breakdown={kind:'result',formula,total:rollFinal};
    try{
      Promise.resolve(arcanaAnimator.play(payload)).catch(error=>console.warn('Arcana combat playback:',error)).then(()=>{
        if(stamp!==arcanaBattleStamp)return;
        arcanaPlaying=false;
        arcanaBattleHold=setTimeout(()=>{if(stamp===arcanaBattleStamp){stopArcanaBattlePresentation();const extra=c.wanderingBonusAnimation;if(extra&&extra.rollSeq===roll.seq&&localControlsCombat()){c.wanderingBonusAnimation=null;showRollPopup('Бродячий наёмник · Натуральная 20',extra.value,`D4 = <b>${extra.value}</b>`,'Дополнительный урон после основного броска',null,null,'Продолжить',true)}}},arcanaCombatHold(roll,c.phase));
      });
    }catch(error){console.warn('Arcana combat payload:',error);stopArcanaBattlePresentation()}
  }

  function combatUsed(key){return !!state.combat?.used?.[key]}
  function combatMarkUsed(key){if(state.combat){state.combat.used=state.combat.used||{};state.combat.used[key]=true}}
  function combatHasEquipped(p,id){return equippedEntries(p).some(e=>Number(e.id)===Number(id))}
  function combatEnemyAttackHits(c=state.combat){const a=c?.enemyAttackRoll;if(!a)return false;return a.natural===20?true:a.natural===1?false:a.total>=a.target}
  function combatHeroAttackHits(c=state.combat){const a=c?.attackRoll;if(!a)return false;return a.natural===20?true:a.natural===1?false:a.total>=a.target}
  function combatRollOutcome(){const c=state.combat;if(!c)return null;if(['hero_roll','hero_damage_ready'].includes(c.phase)&&c.attackRoll)return combatHeroAttackHits(c);if(c.phase==='enemy_roll'&&c.enemyAttackRoll)return combatEnemyAttackHits(c);return null}
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
  function mandatoryLootCount(enemy,c=state.combat){if(enemy?.id===281)return 0;if(c?.elite)return 3;const r=String(enemy?.fields?.['Ранг']||'').toLowerCase();if(r.includes('слаб'))return 0;if(r.includes('обыч'))return 1;if(r.includes('силь'))return 2;if(r.includes('элит'))return 3;return Math.max(0,Number((String(enemy?.fields?.['Тайники']||'1').match(/^\s*(\d+)/)||[])[1]||1)-1)}
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
    if(id===143&&/звер/.test(type))flat+=1;if(id===144&&c.heroSuccessfulHits===0)flat+=3;if(id===152&&/(звер|чудовищ)/.test(type))flat+=2;if(id===150&&/(нежить|дух)/.test(type))flat+=2;if(id===151&&/(чудовищ|проклят)/.test(type))flat+=2;if(id===213&&c.heroSuccessfulHits===0&&type.includes('босс'))flat+=3;if(id===216&&p.statuses.includes('Проклятие'))dice.push('D4');if(id===215&&!c.heroWasFirst&&c.heroSuccessfulHits===0)flat+=2;if(id===221&&c.heroSuccessfulHits===0&&/(босс|демон|нежить|проклят)/.test(type))dice.push('D6');if(id===334&&c.heroSuccessfulHits===0&&/(босс|демон|нежить|проклят)/.test(type))dice.push('D12');if(id===336&&c.attackRoll?.chosen>=19)dice.push('D6');if(c.fateRiftReady){dice.push('D6');c.fateRiftReady=false;}
    if(combatHasEquipped(p,177)&&/(нежить|дух|проклят)/.test(type))flat+=2;if(combatHasEquipped(p,282)&&/(нежить|дух|проклят)/.test(type))flat+=3;if(combatHasEquipped(p,250)&&/(демон|культист|проклят)/.test(type))flat+=1;
    for(const b of (c.buffs||[]))if(b.type==='lightDamage'&&b.remaining>0&&/(нежить|демон|культист|проклят)/.test(type))dice.push('D4');
    if(fullSetEquipped(p,'Рассвета'))dice.push('D4');
    return{flat,dice};
  }
  function combatEnemyAttackModifier(p){const c=state.combat,e=combatEnemy();let b=Number(String(e?.fields?.['АТК']||'0').replace('+',''))||0;if(c.enemyAttackCount===0&&e?.id===2&&c.enemyWasFirst)b+=1;if(c.enemyAttackCount===0&&e?.id===13&&!c.heroWasFirst)b+=1;if(c.enemyAttackCount===0&&combatHasEquipped(p,229)){b-=2;combatMarkUsed('item:229');}if(combatHasEquipped(p,238))b-=2;if(combatHasEquipped(p,341))b-=2;if(e?.id===45&&p.statuses.length)b+=1;return b}
  function combatEffectiveDefense(p){const c=state.combat;return effectiveDefense(p)+combatPotionBuff('defense')+Number(c?.battleDefenseBonus||0)}
  function combatStart(card){
    for(let i=rollPopupQueue.length-1;i>=0;i--)if(/^Движение\s*·/.test(rollPopupQueue[i].title))rollPopupQueue.splice(i,1);
    if(!els.rollOverlay.hidden&&/^Движение\s*·/.test(els.rollPopupTitle.textContent||'')){els.rollOverlay.hidden=true;rollPopupAfterClose=null;++rollPopupDisplaySeq;}

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
  function combatHeroAttack(){const c=state.combat,p=currentPlayer();if(!c||c.phase!=='hero_turn')return;if(c.heroStunned>0){c.heroStunned--;removeStatus(p,'Оглушение');combatPush(`${p.name} пропускает атаку из-за Оглушения.`);combatTickBuffsAtHeroAttack();combatTickHeroStatuses();if(!state.combat)return;if(c.enemyHp<=0){combatVictory();return}c.phase='enemy_ready';renderCombat();return}
    const profile=combatAttackStatProfile(p),mode=combatHeroMode(),rr=rollD20WithMode(mode),bonus=profile.stat+combatAttackBonus(p,profile),total=rr.chosen+bonus,target=Number(combatEnemy()?.fields?.['ЗЩ']||0),natural=rr.mode==='normal'?(rr.chosen===20?20:rr.chosen===1?1:null):null;consumeHeroMode();c.heroAttackCount++;recordNatural(p,natural);c.attackRoll={rolls:rr.rolls,chosen:rr.chosen,mode,bonus,total,target,profile,natural};c.phase='hero_roll';combatSetRoll(`Атака героя · D20`,rr.chosen,`${rr.chosen} ${signed(bonus)} = ${total}`,`${statName(profile.key)} ${signed(profile.stat)} · против ЗЩ ${target}${rr.rolls.length>1?` · броски ${rr.rolls.join(' / ')} · натуральные 1/20 не срабатывают`:''}`,natural,rr.rolls.map(value=>({sides:20,value})));combatPush(`${p.name}: D20 ${rr.rolls.join('/')} → ${rr.chosen} ${signed(bonus)} = ${total} против ЗЩ ${target}.`);renderCombat()}
  function combatRerollHeroAttack(label){const c=state.combat;if(!c?.attackRoll)return;const d=rand(20),a=c.attackRoll;a.rolls=[d];a.chosen=d;a.mode='normal';a.natural=d===20?20:d===1?1:null;recordNatural(currentPlayer(),a.natural);a.total=d+a.bonus;combatSetRoll(`${label} · D20`,d,`${d} ${signed(a.bonus)} = ${a.total}`,`Новый результат против ЗЩ ${a.target}`,a.natural);combatPush(`${label}: новый D20 = ${d}, итог ${a.total}.`);renderCombat()}
  function finalizeHeroAttackRoll(){const c=state.combat,p=currentPlayer();if(!c||c.phase!=='hero_roll')return;const a=c.attackRoll,d=a.chosen,natural=a.natural;let hit=natural===20?true:natural===1?false:a.total>=a.target;
    if(natural===1){c.enemyAdvantage++;combatPush('<b>Натуральная 1:</b> автоматический промах; враг получает преимущество на следующую атаку.');}
    if(!hit){c.afterEnemyMiss=false;if(combatEnemy()?.id===46&&!combatUsed('enemy46miss')){combatMarkUsed('enemy46miss');combatApplyHeroStatus(p,'Усталость')}if(a.profile.weapon?.id===218)c.nextHeroAttackBonus=(c.nextHeroAttackBonus||0)+1;combatPush(`${p.name} промахивается.`);combatTickBuffsAtHeroAttack();combatTickHeroStatuses();if(!state.combat)return;if(c.enemyHp<=0){combatVictory();return}c.phase='enemy_ready';renderCombat();return}
    c.phase='hero_damage_ready';renderCombat();return;
  }
  // Display-only. Preserve the actual resolved dice and numeric bonuses;
  // no extra rolls or combat-rule changes are made here.
  function combatDamageFormula(dmg,flatBonus,multiplier,amount){
    const shownDice=(dmg.parts||[]).filter(x=>x.kind==='dice'&&x.sign>0);
    const rolls=shownDice.flatMap(x=>x.rolls);
    const rollsText=rolls.join(' / ');
    const label=String(dmg.expr||'D6').toUpperCase();
    const dieOnly=shownDice.reduce((acc,x)=>acc+x.rolls.reduce((a,b)=>a+b,0),0);
    const additive=Number(dmg.total)+Number(flatBonus||0);
    const components=[];
    if(rollsText)components.push(rollsText);
    else components.push(String(dmg.total));
    const extra=additive-dieOnly;
    if(extra)components.push(`${extra>0?'+':'−'} ${Math.abs(extra)}`);
    const sum=components.join(' ');
    const base=components.length>1||rolls.length>1?`${sum} = ${additive}`:sum;
    const multiplied=Number(multiplier)>1?`${base} × ${multiplier} = ${amount}`:base;
    return `${label} — ${multiplied}${Number(multiplier)===1&&amount!==additive?` = ${amount}`:''}`;
  }
  function combatRollHeroDamage(){
    const c=state.combat,p=currentPlayer();if(!c||c.phase!=='hero_damage_ready'||!c.attackRoll)return;
    const a=c.attackRoll,d=a.chosen,natural=a.natural;
    const dmg=rollExprDetailed(a.profile.damage),pass=combatPassiveDamageBonus(p,a.profile);let amount=dmg.total+pass.flat,detail=[`${dmg.expr}: ${dmg.text}`];for(const die of pass.dice){const r=rollExprDetailed(die);amount+=r.total;detail.push(`${die}: ${r.total}`)}let multiplier=1;
    if(natural===20){combatPush('<b>Натуральная 20 героя:</b> автоматическое попадание; срабатывают эффект героя и оружия.');const h=p.id;if(h==='warrior'){c.heroAdvantage+=2;combatPush('Боевой напор: преимущество на 2 следующие атаки.')}else if(h==='dwarf'){combatApplyEnemyStatus('Оглушение',1)}else if(h==='archer'){multiplier*=2;combatPush('Двойная стрела: урон этой атаки ×2.')}else if(h==='rogue'){multiplier*=2;combatApplyEnemyStatus('Кровотечение',3);combatPush('Кровоточащий удар: урон ×2 и Кровотечение.')}else if(h==='mage'){c.pendingMageNat20=true}}
    const wid=a.profile.weapon?.id;if(wid){if((wid===142&&natural===20)||(wid===217&&natural===20)||(wid===220&&natural===20)||(wid===333&&d>=18))combatApplyEnemyStatus('Оглушение',1);if((wid===145&&natural===20)||(wid===215&&natural===20))combatApplyEnemyStatus('Яд',3);if((wid===146&&d>=18)||(wid===218&&d>=18)||(wid===211&&d>=19)||(wid===212&&((p.currentHp<=p.maxHp/2&&d>=19)||natural===20)))combatApplyEnemyStatus(wid===212?'Горение':'Кровотечение',3);if(wid===219&&natural===20){const r=rollExprDetailed('D6');amount+=r.total;detail.push(`Чёрный лук D6: ${r.total}`)}if(wid===220&&d>=18){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`Книга молний D4: ${r.total}`)}if(wid===333&&d>=18){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`Громовой Разлом D4: ${r.total}`)}if(wid===335&&!c.fateRiftTriggered){c.fateRiftTriggered=true;c.fateRiftReady=true;combatPush('Разлом Судьбы: следующая атака +3 к атаке и +D6 урона.')}}
    if((c.firstHeroDamageMultiplier||1)>1){multiplier*=c.firstHeroDamageMultiplier;combatPush(`${c.firstHeroDamageMultiplierLabel||'Чёрная игла'}: первый урон героя ×${c.firstHeroDamageMultiplier}.`);c.firstHeroDamageMultiplier=1;c.firstHeroDamageMultiplierLabel=null}multiplier*=Math.max(1,Number(c.heroDamageMultiplier||1));amount*=multiplier;if(p.id==='rogue')amount=Math.max(2,amount);c.pendingHeroDamage={amount,base:dmg.total,multiplier,detail,profile:a.profile};c.phase='hero_damage';
    const formula=combatDamageFormula(dmg,amount/multiplier-dmg.total,multiplier,amount);
    combatSetRoll(`Урон героя · ${a.profile.damage}`,amount,formula,`Итоговый урон: ${amount}${detail.length>1?' · '+detail.slice(1).join(' · '):''}`,null,dmg.parts.filter(x=>x.kind==='dice'&&x.sign>0).flatMap(x=>x.rolls.map(value=>({sides:Number(x.expr.split('D')[1]),value}))));
    combatPush(`Бросок урона: ${formula}.`);
    if(c.pendingMageNat20){c.phase='mage_nat20'}renderCombat();
  }
  function chooseMageNat20(kind){const c=state.combat;if(!c||c.phase!=='mage_nat20')return;const r=rollExprDetailed('D4');c.pendingHeroDamage.amount+=r.total;c.pendingHeroDamage.detail.push(`${kind==='lightning'?'Молния':'Огонь'} D4: ${r.total}`);combatSetRoll(`Стихийный разряд · D4`,r.total,`D4 = ${r.total}`,kind==='lightning'?'Молния: +D4 и Оглушение':'Огонь: +D4 и Горение');if(kind==='lightning')combatApplyEnemyStatus('Оглушение',1);else combatApplyEnemyStatus('Горение',3);c.pendingMageNat20=false;c.phase='hero_damage';combatPush(`Стихийный разряд: ${kind==='lightning'?'Молния':'Огонь'}, +${r.total} урона.`);renderCombat()}
  function enemyDamageReduction(amount,profile){const c=state.combat,e=combatEnemy();let reduction=0,why=[];if(e?.id===16&&/D4/i.test(profile.damage)){reduction+=1;why.push('Каменный прислужник −1')}if(e?.id===47){reduction+=1;why.push('Голем −1')}if(!c.enemyFirstDamageReceived&&e?.id===23){reduction+=2;why.push('Рыцарь-разбойник −2')}if(!c.enemyFirstDamageReceived&&[44,52].includes(e?.id)){const die=e.id===44?'D4':'D6',r=rollExprDetailed(die);reduction+=r.total;why.push(`${e.name} ${die}=${r.total}`);const after=Math.max(0,amount-reduction);combatSetRoll(`Защита врага · ${die}`,r.total,`${die} = ${r.total}`,`Уменьшение входящего урона: ${amount} → ${after}`);showRollPopup(`${e.name} · уменьшение урона`,r.total,`${die} = <b>${r.total}</b>`,`Входящий урон: <b>${amount}</b> → <b>${after}</b>`)}c.enemyFirstDamageReceived=true;return{amount:Math.max(0,amount-reduction),reduction,why}}
  function applyHeroDamageNow(){const c=state.combat,p=currentPlayer();if(!c||c.phase!=='hero_damage'||!c.pendingHeroDamage)return;const pd=c.pendingHeroDamage,red=enemyDamageReduction(pd.amount,pd.profile),amount=red.amount;recordDamageDealt(p,amount);c.enemyHp-=amount;c.heroSuccessfulHits++;combatPush(`${combatEnemy()?.name} получает ${amount} урона${red.reduction?` (уменьшено на ${red.reduction})`:''}. Осталось ${Math.max(0,c.enemyHp)}/${c.enemyMaxHp}.`);c.pendingHeroDamage=null;
    if(c.enemyHp<=0){combatVictory();return}combatTickBuffsAtHeroAttack();combatTickHeroStatuses();if(!state.combat)return;if(c.enemyHp<=0){combatVictory();return}c.phase='enemy_ready';renderCombat()}
  function combatTickEnemyStatuses(){const c=state.combat,p=currentPlayer();if(!c)return;for(const [key,label] of [['enemyBleed','Кровотечение'],['enemyBurn','Горение']]){if(c[key]>0){recordDamageDealt(p,2);c.enemyHp-=2;c[key]--;combatPush(`${combatEnemy()?.name}: ${label} наносит 2 урона. Осталось ${Math.max(0,c.enemyHp)} ЗД.`)}}}
  function combatTickHeroStatuses(){const c=state.combat,p=currentPlayer();if(!c)return;ensurePlayerModel(p);for(const label of ['Кровотечение','Горение']){if(!p.statuses.includes(label)){delete p.statusTimers[label];delete c.heroStatusTimers?.[label];continue;}let n=p.statusTimers?.[label]??0;if(n>0&&p.statuses.includes(label)){recordDamageTaken(p,2);p.currentHp-=2;n--;p.statusTimers[label]=n;c.heroStatusTimers[label]=n;p.statusTickedTurn[label]=p.personalTurn;combatPush(`${p.name}: ${label} наносит 2 урона. Осталось ${Math.max(0,p.currentHp)} ЗД; длительность ${n}.`);if(n<=0)removeStatus(p,label)}}if(p.currentHp<=0)combatHeroDeath('периодический урон')}
  function combatEnemyTurn(){const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c||c.phase!=='enemy_ready')return;if(c.enemyStunned>0){c.enemyStunned--;combatSetRoll('Атака врага','⛔','Оглушение',`${e.name} пропускает атаку.`);combatPush(`${e.name} пропускает атаку из-за Оглушения.`);combatTickBuffsAtEnemyTurn();combatTickEnemyStatuses();if(c.enemyHp<=0){combatVictory();return}c.round++;combatRoundStartCheck();if(!state.combat)return;c.phase='hero_turn';renderCombat();return}
    const mode=combatEnemyMode(),rr=rollD20WithMode(mode),bonus=combatEnemyAttackModifier(p),total=rr.chosen+bonus,target=combatEffectiveDefense(p),natural=rr.mode==='normal'?(rr.chosen===20?20:rr.chosen===1?1:null):null;consumeEnemyMode();c.enemyAttackCount++;c.enemyAttackRoll={rolls:rr.rolls,chosen:rr.chosen,mode,bonus,total,target,natural};c.phase='enemy_roll';combatSetRoll(`Атака врага · D20`,rr.chosen,`${rr.chosen} ${signed(bonus)} = ${total}`,`против ЗЩ ${target}${rr.rolls.length>1?` · броски ${rr.rolls.join(' / ')} · натуральные 1/20 не срабатывают`:''}`,natural,rr.rolls.map(value=>({sides:20,value})));combatPush(`${e.name}: D20 ${rr.rolls.join('/')} → ${rr.chosen} ${signed(bonus)} = ${total} против ЗЩ ${target}.`);renderCombat();
  }
  function finalizeEnemyAttackRoll(){const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c||c.phase!=='enemy_roll'||!c.enemyAttackRoll)return;const a=c.enemyAttackRoll,d=a.chosen,natural=a.natural,hit=natural===20?true:natural===1?false:a.total>=a.target;
    if(natural===1){c.heroAdvantage++;combatPush('<b>Натуральная 1 врага:</b> промах; герой получает преимущество на следующий D20.');if([21,24].includes(e.id)){const r=e.id===21?{total:1,text:'1'}:rollExprDetailed('D4');c.enemyHp-=r.total;combatSetRoll(`Натуральная 1 врага · ${e.id===21?'урон':'D4'}`,r.total,e.id===21?'Враг получает 1 урон':`D4 = ${r.total}`,'Урон самому врагу');combatPush(`${e.name} получает ${r.total} урона из-за своей Натуральной 1.`)}if(e.id===9)c.enemyStunned=Math.max(c.enemyStunned,1);if(c.enemyHp<=0){combatVictory();return}c.afterEnemyMiss=true;c.phase='enemy_miss';renderCombat();return}
    if(!hit){c.afterEnemyMiss=true;c.phase='enemy_miss';combatPush(`${e.name} промахивается.`);renderCombat();return}
    // Shield №157: automatic once per combat on a NORMAL exact-armor hit.
    // An exact total equal to the current defense triggers this one-battle override.
    if(combatHasEquipped(p,157)&&!combatUsed('item:157')&&a.total===a.target){
      combatMarkUsed('item:157');
      c.afterEnemyMiss=true;c.phase='enemy_miss';
      combatPush(`<b>Щит №157 «${itemCard(157)?.name||'Щит'}»:</b> попадание ровно в ЗЩ ${a.target} отменено автоматически. Эффект использован до следующего боя.`);
      log(`${p.name}: автоматически применён эффект щита №157 — атака врага стала промахом.`);
      combatSetRoll('Щит №157 · атака отражена','✓',`Атака ${a.total} = ЗЩ ${a.target}`,'Эффект применился автоматически · 1 раз за бой');
      showRollPopup('Щит №157 · эффект применился','✓',`Атака ${a.total} = ЗЩ ${a.target}`,'Атака считается промахом. Эффект использован до следующего боя.',null,null,'Хорошо',true);
      renderCombat();updateUI();return;
    }
    c.enemyHitCount=(c.enemyHitCount||0)+1;
    combatEnemyHitDamage(d,false);
  }
  function combatEnemyHitDamage(directRoll=null,direct=false,multiplier=1,label='Атака врага'){
    const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c)return;const dr=rollExprDetailed(e.fields?.['Урон']||'D4');let amount=dr.total,detail=[`${e.fields?.['Урон']}: ${dr.text}`];
    if(c.enemySuccessfulHits===0&&[11,29].includes(e.id)){amount+=1;detail.push('первый успешный удар +1')}
    if(c.enemySuccessfulHits===0&&e.id===50){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`первый удар +D4=${r.total}`)}
    const natural=direct?null:c.enemyAttackRoll?.natural,kept=direct?null:c.enemyAttackRoll?.chosen,eff=String(e.fields?.['Эффект']||''),repeatCurse=!direct&&natural===20&&e.id===54&&p.statuses.includes('Проклятие');
    if(!direct&&natural===20){c.heroDisadvantage++;combatPush('<b>Натуральная 20 врага:</b> попадание; герой получает помеху на следующий D20.');if(e.id===17){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`нат.20 +D4=${r.total}`);c.wanderingBonusD4=r.total}if(repeatCurse){const r=rollExprDetailed('D6');amount+=r.total;detail.push(`повторное Проклятие +D6=${r.total}`)}if(e.id===51)combatLoseRandomEquippedItem(p)}
    if(!direct)combatApplyEnemyTriggeredStatus(kept,repeatCurse?null:natural,eff,p);
    if(e.id===10&&kept>=18){amount+=1;detail.push('18–20 +1 урон')}if(e.id===41&&c.enemyAttackCount%3===0){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`каждая 3-я атака +D4=${r.total}`)}if(e.id===281&&(c.enemyHitCount||0)%3===0){const r=rollExprDetailed('D4');amount+=r.total;detail.push(`Тёмный удар +D4=${r.total}`);combatPush(`Тёмный удар Владыки: каждая 3-я успешная атака получает +D4 (${r.total}) урона.`)}
    if(!direct&&c.nextEnemyHitBonus>0){const bonus=Number(c.nextEnemyHitBonus)||0;amount+=bonus;detail.push(`Зеркальный шип +${bonus}`);combatPush(`Зеркальный шип: следующая успешная атака врага получает +${bonus} урона.`);c.nextEnemyHitBonus=0;c.nextEnemyHitBonusLabel=null}
    amount*=multiplier;c.pendingEnemyDamage={amount,original:amount,detail,direct,label,enemyRollTotal:c.enemyAttackRoll?.total||null,enemyDefense:combatEffectiveDefense(p)};c.phase='enemy_damage';combatSetRoll(`${label} · урон`,dr.total,`${e.fields?.['Урон']} = ${dr.total}${multiplier>1?` · ×${multiplier}`:''}`,`Текущий входящий урон: ${amount}${detail.length>1?' · '+detail.slice(1).join(' · '):''}`,null,dr.parts.filter(x=>x.kind==='dice'&&x.sign>0).flatMap(x=>x.rolls.map(value=>({sides:Number(x.expr.split('D')[1]),value}))));combatPush(`Урон врага: ${dr.text}; текущий входящий урон ${amount}.`);if(c.wanderingBonusD4){c.wanderingBonusAnimation={value:c.wanderingBonusD4,rollSeq:c.lastRoll.seq};delete c.wanderingBonusD4}renderCombat();
  }
  function combatApplyEnemyTriggeredStatus(kept,natural,eff,p){const m=String(eff).match(/(18|19)[–-]20\s*—\s*(Кровотечение|Яд|Усталость|Слабость|Проклятие|Страх|Оглушение|Горение)/i);if(m&&kept>=Number(m[1])){combatApplyHeroStatus(p,m[2],3);return}const nat=String(eff).match(/Натуральная\s*20\s*—\s*(Кровотечение|Яд|Усталость|Слабость|Проклятие|Страх|Оглушение|Горение)/i);if(nat&&natural===20)combatApplyHeroStatus(p,nat[1],3)}
  function combatLoseRandomEquippedItem(p){const candidates=equippedEntries(p).filter(e=>!['mercenary','potion0','potion1'].includes(e.slot));if(!candidates.length)return;const x=candidates[Math.floor(Math.random()*candidates.length)];setSlotId(p,x.slot,null);discardHeldCard(itemCard(x.id));combatPush(`Натуральная 20: ${p.name} теряет надетый предмет «${itemCard(x.id)?.name}».`)}
  function passiveHeroDamageReduction(p,amount){const c=state.combat,e=combatEnemy();let r=0,why=[];if(combatHasEquipped(p,270)){r+=2;why.push('Ветеран щита −2')}if(!c.firstEnemyDamageTaken&&combatHasEquipped(p,155)){r+=1;why.push('Кольчуга −1');combatMarkUsed('item:155')}if(!c.firstEnemyDamageTaken&&combatHasEquipped(p,228)){const d=rollExprDetailed('D4');r+=d.total;why.push(`Рунная кольчуга −D4=${d.total}`);combatMarkUsed('item:228');combatSetRoll('Рунная кольчуга · D4',d.total,`D4 = ${d.total}`,'Автоматическое уменьшение первого урона')}if(combatHasEquipped(p,162)&&/(звер|чудовищ)/.test(combatEnemyType())){r+=1;why.push('Куртка Охотника −1')}if(combatHasEquipped(p,230)&&/(демон|звер|чудовищ)/.test(combatEnemyType())){r+=1;why.push('Доспех охотника −1')}if(combatHasEquipped(p,235)&&p.currentHp<=3){r+=3;why.push('Последний рубеж −3')}if(combatHasEquipped(p,340)){const d=rollExprDetailed('D4');r+=d.total;why.push(`Каменная Печать −D4=${d.total}`)}if(combatHasEquipped(p,344)&&p.currentHp<=3){r+=3;why.push('Последний Шанс −3')}c.firstEnemyDamageTaken=true;return{amount:Math.max(0,amount-r),reduction:r,why}}
  function finishEnemyTurnAfterDamage(){const c=state.combat;if(!c)return;combatTickBuffsAtEnemyTurn();combatTickEnemyStatuses();if(c.enemyHp<=0){combatVictory();return}if(!state.combat)return;c.round++;combatRoundStartCheck();if(!state.combat)return;c.phase='hero_turn';renderCombat();updateUI()}
  function acceptEnemyDamage(){const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c||c.phase!=='enemy_damage'||!c.pendingEnemyDamage)return;const pd=c.pendingEnemyDamage,red=passiveHeroDamageReduction(p,pd.amount);let amount=red.amount,extraNote='';if(c.heroIncomingHalf&&amount>0){const before=amount;amount=Math.ceil(amount/2);extraNote=`; Железная молитва: ${before} → ${amount}`;}c.pendingEnemyDamage=null;if(amount>0){recordDamageTaken(p,amount);p.currentHp-=amount;c.enemySuccessfulHits++;combatPush(`${p.name} получает ${amount} урона${red.reduction?` (автоматически уменьшено на ${red.reduction})`:''}${extraNote}. Осталось ${Math.max(0,p.currentHp)}/${p.maxHp}.`);if(combatHasEquipped(p,224)&&p.currentHp>0){heal(p,1);combatPush('Доспех Вампира: +1 ЗД после полученного урона.')}if(combatHasEquipped(p,343)&&p.currentHp>0){const hr=rollHealing(p,'D4'),before=p.currentHp;heal(p,hr.total);combatPush(`Доспех Живой Крови: восстановлено ${p.currentHp-before} ЗД.`)}if(p.id==='mage'&&Number(getSlotId(p,'weapon'))===338&&!combatUsed('item:338')&&p.currentHp>0){const r=rollExprDetailed('D8');c.enemyHp-=r.total;recordDamageDealt(p,r.total);combatMarkUsed('item:338');showRollPopup('Книга Отражённого Пламени',r.total,`D8 = ${r.total}`,`Ответный урон врагу: ${r.total}`);combatPush(`Книга Отражённого Пламени наносит ${r.total} ответного урона.`)}if([36,42,48].includes(e.id)||(e.id===38&&c.enemySuccessfulHits===1)){c.enemyHp=Math.min(c.enemyMaxHp,c.enemyHp+2);combatPush(`${e.name} восстанавливает 2 ЗД после успешной атаки.`)}if(c.mirrorQueued){const r=rollExprDetailed('D8');recordDamageDealt(p,r.total);c.enemyHp-=r.total;c.mirrorQueued=false;combatSetRoll('Зеркало мрака · D8',r.total,`D8 = ${r.total}`,'Ответный урон врагу');showRollPopup('Зеркало мрака · ответный урон',r.total,`D8 = ${r.total}`,`Враг получает ${r.total} урона в ответ.`);combatPush(`Зеркало мрака наносит ${r.total} ответного урона.`)}}else combatPush(`${p.name} не получает урона.`);
    if(p.currentHp<=0){combatHeroDeath('атака врага');return}if(c.enemyHp<=0){combatVictory();return}if(amount>0){c.phase='post_damage';c.lastAcceptedDamage=amount;combatSetRoll('Урон принят',amount,`ЗД ${p.currentHp}/${p.maxHp}`,'Полученный урон показан. Следующий раунд начнётся автоматически.');renderCombat();updateUI();return}finishEnemyTurnAfterDamage()}
  function combatAcceptDamageAndContinue(){const c=state.combat;if(!c||c.phase!=='enemy_damage')return;const after=c.pendingEnemyDamage?.after;acceptEnemyDamage();if(typeof after==='function'&&state.combat)after()}
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
    const base=mandatoryLootCount(e,c),d=base>0?rand(20):null,wis=effectiveStat(p,'wis'),total=d==null?null:d+wis,natural=d===20?20:d===1?1:null;
    const success=base>0&&(d===20||d!==1&&total>=13);
    let searchDamage=0,searchMishap='';
    if(d===1){searchDamage=rand(6);searchMishap=EXTRA_LOOT_NAT1_LINES[Math.floor(Math.random()*EXTRA_LOOT_NAT1_LINES.length)](p.name);combatPush(`${searchMishap} Натуральная 1: D6 = ${searchDamage} урона.`)}
    if(base>0)recordNatural(p,natural);
    const lootKey=c.deckKey==='exploreHeart'?'lootHeart':'lootOuter';
    // Ordinary success: +1 inspected card, no extra reward.
    // Natural 20: +1 kept item AND +1 inspected card (ordinary: choose 2 of 3).
    // Weak enemies: gold only; there is no wisdom search without basic loot.
    const nat20Bonus=base>0&&natural===20?1:0;
    const keepCount=base+nat20Bonus;
    const cardsToDraw=keepCount+(base>0&&success?1:0),candidates=[];
    for(let i=0;i<cardsToDraw;i++){const loot=drawCard(lootKey);if(loot)candidates.push(loot.id)}
    discardCard(c.deckKey,e);markExplorationSuccess(p.hex);p.reexploreRiskHex=null;
    c.phase='victory';
    c.victory={gold:goldEarned,baseLoot:base,extraLoot:nat20Bonus,bonusLoot:bonusLootCount,searchRoll:d,searchTotal:total,searchDamage,
      got:[],boss:false,lootDraft:{deckKey:lootKey,candidates,keep:Math.min(keepCount,candidates.length),selected:[],confirmed:false,carefulSearch:success&&base>0,natural20Bonus:!!nat20Bonus}};
    c.victoryUiStep='results';
    combatSetRoll('Результаты боя','✓',`${p.name} победил врага «${e.name}»`,`Заработано золота: ${goldEarned}`);
    combatPush(`<b>Победа!</b> +${goldEarned} золота, добыча: ${keepCount} ${lootWord(keepCount)}${nat20Bonus?' · Натуральная 20: +1 тайник':''}${success&&base>0?' · +1 карта для выбора':''}.`);
    const resultText=success?'УСПЕХ':'ПРОВАЛ',naturalText=natural?` · Натуральная ${natural}`:'',damageText=searchDamage?`<br><b>${searchMishap}</b><br>Получено D6 = <b>${searchDamage}</b> урона · ЗД ${Math.max(0,p.currentHp)}/${p.maxHp}`:'';
    closeModal();updateUI();
    const showVictoryResults=()=>{
      const finalDamageText=searchDamage?`<br><b>${searchMishap}</b><br>Получено D6 = <b>${searchDamage}</b> урона · ЗД ${Math.max(0,p.currentHp)}/${p.maxHp}`:'';
      showRollPopup('Результаты боя','✓',`<b style="color:${p.color||'#dfb86a'}">${escapeCombatText(p.name.toUpperCase())}</b> победил врага «<b class="defeat-enemy-rank ${enemyRankClass(e)}">${escapeCombatText(e.name)}</b>».<br>Заработано золота: <b class="result-gold">${goldEarned}</b>`,
        `${base===0?'Слабый враг: только золото, без Тщательного поиска.':`Тщательный поиск: D20 <b>${d}</b> ${signed(wis)} МУД = <b>${total}</b> · <b>${resultText}</b>${naturalText}`}<br>Награда: <b>${keepCount}</b> ${lootWord(keepCount)}${nat20Bonus?' (натуральная 20: +1 тайник)':''}.${success&&base>0?` Выбор из ${candidates.length} карт.`:''}${finalDamageText}`,
        null,()=>{if(searchDamage&&p.currentHp<=0){for(const id of candidates){const card=itemCard(id);if(card)returnCardToDeckRandom(lootKey,card)}state.combat=null;handleDeath(p);return}
          if(base>0&&candidates.length)openVictoryLootDraft();else showPostCombatTerritoryPrompt();},'К наградам',false,p.id);
    };
    if(base>0){
      const afterSearch=()=>{
        if(searchDamage>0)showRollPopup('Тщательный поиск · урон',searchDamage,`D6 = <b>${searchDamage}</b>`,searchMishap,null,()=>{recordDamageTaken(p,searchDamage);p.currentHp-=searchDamage;updateUI();showVictoryResults()},'Продолжить',true);
        else showVictoryResults();
      };
      showRollPopup('Тщательный поиск · МУД',d,`D20 ${d} ${signed(wis)} МУД = <b>${total}</b>`,`Проверка 13+ · <b>${resultText}</b>${naturalText}`,natural,afterSearch,'Продолжить',true);
    }else showVictoryResults();
  }
  // Flip is local presentation only; never mutates candidates, selection or server state.
  const victoryLootReversed=new Map();
  function openVictoryLootDraft(){
    const c=state.combat,p=currentPlayer(),draft=c?.victory?.lootDraft;
    if(!c||c.phase!=='victory'||!draft||draft.confirmed){showPostCombatTerritoryPrompt();return}
    if(!localControlsCombat())return;
    c.victoryUiStep='loot';
    const selected=new Set(draft.selected||[]),all=draft.candidates||[],max=draft.keep;
    els.modalClose.style.display='none';els.modal.dataset.lootDraft='true';
    const list=all.map((id,index)=>{
      const card=itemCard(id),chosen=selected.has(index);
      if(!card)return '';
      const key=`${c.instanceId}:${index}`,reverse=!!victoryLootReversed.get(key);
      return `<div class="loot-draft-card${chosen?' selected':''}" data-loot-card="${index}"><span class="loot-draft-number">КАРТА ${index+1} · №${card.id}</span><button type="button" class="loot-draft-art-action" data-loot-flip="${index}" title="${reverse?'Показать рисунок':'Посмотреть полное описание'}" aria-label="${reverse?'Показать рисунок':'Просмотреть описание'} №${card.id}">${reverse?inventoryCardBackHtml(card):itemCardFrontHtml(card)}</button><button type="button" class="loot-draft-select ${chosen?'secondary':'success'}" data-loot-choice="${index}" aria-pressed="${chosen}">${chosen?'✓ Выбрано · отменить':'Выбрать'}</button></div>`;
    }).join('');
    const complete=selected.size===max;
    els.modalContent.innerHTML=`<div class="card-kicker">ПОБЕДА · ТАЙНИКИ</div><div class="card-title">Выберите добычу</div><div class="card-field">Получить <b>${max} ${lootWord(max)}</b> из <b>${all.length}</b> ${lootWord(all.length)}.${draft.carefulSearch?' Тщательный поиск открыл дополнительную карту.':''}${draft.natural20Bonus?' Натуральная 20: +1 получаемый тайник.':''}<br>Невыбранные карты вернутся в колоду.</div><div class="loot-draft-grid" aria-label="Карты для выбора добычи">${list}</div><div class="modal-actions"><button id="lootDraftConfirm" class="success" ${complete?'':'disabled'}>Подтвердить (${selected.size}/${max})</button></div>`;
    els.modal.hidden=false;
    els.modalContent.querySelectorAll('[data-loot-flip]').forEach(b=>b.onclick=()=>{
      const index=Number(b.dataset.lootFlip),key=`${c.instanceId}:${index}`;
      victoryLootReversed.set(key,!victoryLootReversed.get(key));
      openVictoryLootDraft();
    });
    els.modalContent.querySelectorAll('[data-loot-choice]').forEach(b=>b.onclick=()=>{
      const n=Number(b.dataset.lootChoice),actual=state.combat?.victory?.lootDraft;if(!actual||actual.confirmed)return;
      const choice=new Set(actual.selected||[]);if(choice.has(n))choice.delete(n);else if(choice.size<actual.keep)choice.add(n);else if(actual.keep===1){choice.clear();choice.add(n)}else return;
      actual.selected=[...choice];openVictoryLootDraft();updateUI();
    });
    document.getElementById('lootDraftConfirm').onclick=()=>{
      const combat=state.combat,live=combat?.victory?.lootDraft,recipient=getPlayer(p.id);
      if(!combat||!recipient||combat.instanceId!==c.instanceId||!live||live.confirmed||new Set(live.selected).size!==live.keep)return;
      live.confirmed=true;const chosen=new Set(live.selected);const received=[];
      for(let i=0;i<live.candidates.length;i++){
        const card=itemCard(live.candidates[i]);if(!card)continue;
        if(chosen.has(i)){receiveTreasure(recipient,card);received.push(card.id)}else returnCardToDeckRandom(live.deckKey,card);
      }
      combat.victory.got=received;combat.victory.extraLoot=live.natural20Bonus?1:0;
      log(`${recipient.name} выбирает добычу: ${received.map(id=>`№${id} «${itemCard(id)?.name}»`).join(', ')||'нет карт'}.`);
      for(let i=0;i<live.candidates.length;i++)victoryLootReversed.delete(`${combat.instanceId}:${i}`);
      delete els.modal.dataset.lootDraft;closeModal();updateUI();showPostCombatTerritoryPrompt();
    };
  }
  function finishCombatVictory(){const c=state.combat,p=currentPlayer();if(!c||c.phase!=='victory')return;c.victoryUiStep='done';if(c.isBoss){state.combat=null;state.exploration=null;state.gameOver={winnerId:p.id,heroName:p.name,round:state.round,personalTurn:p.personalTurn};state.turnLocked=true;state.reachable=[];state.movePending=false;state.chosenPath=null;state.chosenMovePlan=null;closeModal();closeCharacterSheet();log(`<b>Партия завершена.</b> Победитель — ${p.name}.`);updateUI();renderBoard();showGameOverPopup(p);return}state.combat=null;state.turnLocked=false;closeModal();finishExplore(true,'Враг побеждён');if(p.pendingItems.length){advanceTurnWithSideInteraction(p,'loot','победа над врагом',[p.id]);setTimeout(()=>openCharacterSheet('pending',null,p.id),0)}else advanceTurnState(p,'победа над врагом')}
  function useHeroCombatAbility(){const c=state.combat,p=currentPlayer();if(!c||c.heroAbilityUsed)return;let ok=false;
    if(p.id==='warrior'&&c.phase==='enemy_damage'&&c.pendingEnemyDamage){const r=rollExprDetailed('D4');c.pendingEnemyDamage.amount=Math.max(0,c.pendingEnemyDamage.amount-r.total);combatSetRoll('Железная стойкость · D4',r.total,`D4 = ${r.total}`,`Входящий урон теперь ${c.pendingEnemyDamage.amount}`);ok=true}
    if(p.id==='dwarf'&&c.phase==='enemy_damage'&&c.pendingEnemyDamage){const r=rollExprDetailed('D6');c.pendingEnemyDamage.amount=Math.max(0,c.pendingEnemyDamage.amount-r.total);combatSetRoll('Каменная кровь · D6',r.total,`D6 = ${r.total}`,`Входящий урон теперь ${c.pendingEnemyDamage.amount}`);ok=true}
    if(p.id==='mage'&&['hero_turn','post_damage'].includes(c.phase)&&p.currentHp<p.maxHp){const hr=rollHealing(p,'D6'),before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;combatSetRoll(`Живительная искра · ${hr.used}`,hr.total,`${hr.used} = ${hr.total}`,`Восстановлено ${restored} ЗД · ЗД ${p.currentHp}/${p.maxHp}`);combatEnemyHealFromHeroHealing(restored);ok=true}
    if(p.id==='archer'&&c.phase==='hero_turn'){c.heroAdvantage++;ok=true}
    if(p.id==='rogue'&&c.phase==='hero_turn'){c.enemyDisadvantage++;ok=true}
    if(!ok){alert('Сейчас эту способность применить нельзя.');return}c.heroAbilityUsed=true;combatPush(`${p.name} использует способность «${HERO_COMBAT[p.id].ability}».`);renderCombat();updateUI()}
  function combatEnemyHealFromHeroHealing(amount){const c=state.combat,e=combatEnemy();if(c&&e?.id===37&&amount>0){c.enemyHp=Math.min(c.enemyMaxHp,c.enemyHp+1);combatPush(`${e.name}: герой лечится — враг восстанавливает 1 ЗД.`)}}
  function supportedCombatEffect(p,card,ctx){if(!state.combat||!card||ctx?.where!=='equipment')return{supported:false,enabled:false,why:''};const c=state.combat,id=card.id,t=itemType(card);if(t==='зелье'){if(!['potion0','potion1'].includes(ctx.slot))return{supported:true,enabled:false,why:'В бою зелья используются только из быстрых слотов.'};const unlock=c.potionUnlockRound?.[id];if(unlock!=null&&c.round<unlock)return{supported:true,enabled:false,why:`Это зелье переложено из рюкзака в этом боевом ходу. Оно станет доступно в боевом раунде ${unlock}.`};if(unlock!=null&&c.round>=unlock)delete c.potionUnlockRound[id];const eff=String(card.fields?.['Эффект']||'');if(/восстанови\s+(?:\d+D\d+|D\d+)\s+ЗД/i.test(eff))return{supported:true,enabled:['hero_turn','post_damage'].includes(c.phase)&&p.currentHp<p.maxHp,why:p.currentHp>=p.maxHp?'ЗД уже полные.':(!['hero_turn','post_damage'].includes(c.phase)?'Лечение доступно в свой боевой ход до атаки или после принятого урона; во время принятия урона оно заблокировано.':'')};if(/сними\s+1\s+негативный эффект/i.test(eff))return{supported:true,enabled:p.statuses.length>0,why:p.statuses.length?'':'Нет негативных эффектов.'};if(/\+(?:2|3)\s+к атаке|\+D4\s+урона/i.test(eff))return{supported:true,enabled:c.phase==='hero_turn',why:c.phase==='hero_turn'?'':'Это зелье нужно выпить до броска атаки.'};if(/\+(?:2|3)\s+ЗЩ/i.test(eff))return{supported:true,enabled:['hero_turn','enemy_ready'].includes(c.phase),why:['hero_turn','enemy_ready'].includes(c.phase)?'':'Зелье защиты нужно выпить до броска атаки врага.'};return{supported:true,enabled:false,why:'Сейчас эффект зелья неприменим.'}}
    const activeIds=[147,149,153,159,166,168,173,174,194,193,345,346,347,200,223,225,226,227,233,244,245,246,248,261,262,263,265,196,197,266,267,268,325,326,328,329,330,332,342];if(!activeIds.includes(id))return{supported:false,enabled:false,why:''};if(combatUsed(`item:${id}`))return{supported:true,enabled:false,why:'Эффект уже использован в этом бою.'};if(id===194&&useBlocked(p,id))return{supported:true,enabled:false,why:'Камень удачи уже использован. Он восстановится после посещения постоянной локации или своей территории.'};if([174,175,226,263].includes(id)&&useBlocked(p,id))return{supported:true,enabled:false,why:'Эффект уже использован и восстановится после соответствующей локации.'};let enabled=false;
    if([196,266,159,233,261,325,329,342].includes(id))enabled=c.phase==='enemy_damage'&&!!c.pendingEnemyDamage;if([200,267,246,328,332].includes(id))enabled=c.phase==='hero_damage'&&!!c.pendingHeroDamage;if(id===149){const n=Number(c.attackRoll?.chosen||0);enabled=c.phase==='hero_damage'&&!!c.pendingHeroDamage&&n>=10&&n<=20;}if(id===265)enabled=c.phase==='hero_damage'&&!!c.pendingHeroDamage&&/(босс|демон|нежить|проклят)/.test(combatEnemyType());if([197,268,193,345,346,347,326,330].includes(id))enabled=['hero_turn','post_damage'].includes(c.phase)&&p.currentHp<p.maxHp;if(id===248)enabled=['hero_turn','hero_roll','hero_damage','enemy_ready','enemy_damage','enemy_miss'].includes(c.phase)&&p.statuses.length>0;if([166,244,147,153,194].includes(id))enabled=c.phase==='hero_roll'&&!!c.attackRoll;if(id===194&&enabled)enabled=!combatHeroAttackHits(c);if(id===166&&enabled)enabled=!combatHeroAttackHits(c);if(id===147&&enabled){const n=Number(c.attackRoll?.chosen);enabled=Number.isInteger(n)&&n>=2&&n<=5&&c.attackRoll?.mode==='normal'}if(id===153&&enabled){const a=c.attackRoll;enabled=(a.chosen===1?true:a.total<a.target)}if(id===223)enabled=c.phase==='pre';if(id===168)enabled=c.phase==='enemy_damage'&&['Яд','Кровотечение'].includes(c.lastAppliedHeroStatus);if(id===225)enabled=c.phase==='enemy_damage'&&['Яд','Кровотечение','Горение'].includes(c.lastAppliedHeroStatus);if(id===245)enabled=c.phase==='enemy_damage'&&!!c.lastAppliedHeroStatus;if(id===173)enabled=c.phase==='enemy_miss'&&c.afterEnemyMiss;if(id===262)enabled=c.phase==='enemy_damage'&&!!c.pendingEnemyDamage;if(id===347)enabled=c.phase==='hero_turn'&&!useBlocked(p,id)&&p.currentHp<p.maxHp;if([174,263].includes(id))enabled=p.statuses.length>0;if(id===175)enabled=p.statuses.includes('Усталость');if(id===226)enabled=p.statuses.length>0;if(id===227)enabled=p.statuses.includes('Оглушение')||c.lastAppliedHeroStatus==='Оглушение'||c.heroStunned>0;return{supported:true,enabled,why:enabled?'':'Условие эффекта сейчас не выполнено.'}}
  function chooseCombatCleanseStatus(status){const c=state.combat,p=currentPlayer();if(!c?.pendingCleanse)return;const q=c.pendingCleanse;if(!q.options.includes(status))return;const card=itemCard(q.id);removeStatus(p,status);if(q.consume!==false)consumeHeldItem(p,q.id,q.ctx);else{if(q.markReset)useMark(p,q.id,q.markReset);combatMarkUsed(`item:${q.id}`)}combatPush(`${card?.name||'Очищение'}: снят эффект «${status}».`);c.pendingCleanse=null;c.phase=q.returnPhase;combatSetRoll(card?.name||'Очищение','✓','Негативный эффект снят',status);if(!els.sheetDrawer.hidden)renderCharacterSheet(sheetView.mode,sheetView.bonusKey);renderCombat();updateUI()}

  function applyCombatItemEffect(p,id,ctx){p=getPlayer(p?.id)||p;
    if(ctx?.where==='equipment'&&getSlotId(p,ctx.slot)!==id){renderCharacterSheet('inventory');return;}
    const c=state.combat,card=itemCard(id),info=supportedCombatEffect(p,card,ctx);if(!c||!info.enabled){if(info?.why)alert(info.why);return}const eff=String(card.fields?.['Эффект']||''),t=itemType(card);
    if(t==='зелье'){let m;if((m=eff.match(/восстанови\s+((?:\d+D\d+)|D\d+)\s+ЗД/i))){const hr=rollHealing(p,m[1]),before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;combatEnemyHealFromHeroHealing(restored);combatSetRoll(`${card.name} · ${hr.used}`,hr.total,`${hr.used} = ${hr.total}`,`Восстановлено ${restored} ЗД · ЗД ${p.currentHp}/${p.maxHp}`);consumeHeldItem(p,id,ctx)}else if(/сними\s+1\s+негативный эффект/i.test(eff)){const opts=[...p.statuses];if(!opts.length)return;if(opts.length===1){removeStatus(p,opts[0]);consumeHeldItem(p,id,ctx);combatSetRoll(`${card.name}`,'✓','Негативный эффект снят',opts[0]);combatPush(`${card.name}: снят эффект «${opts[0]}».`)}else{c.pendingCleanse={id,ctx:{...ctx},options:opts,returnPhase:c.phase};c.phase='cleanse_choice';renderCombat();return}}else if((m=eff.match(/на\s+(\d+)\s+хода?.*\+2\s+ЗЩ/i))){c.buffs.push({type:'defense',amount:2,remaining:Number(m[1]),label:card.name});consumeHeldItem(p,id,ctx)}else if(/до конца текущего боя.*\+3\s+ЗЩ/i.test(eff)){c.battleDefenseBonus+=3;c.battleDefenseLabel=card.name;consumeHeldItem(p,id,ctx)}else if((m=eff.match(/на\s+(\d+)\s+хода?.*\+2\s+к атаке/i))){c.buffs.push({type:'attack',amount:2,remaining:Number(m[1]),label:card.name});consumeHeldItem(p,id,ctx)}else if(/до конца текущего боя.*\+3\s+к атаке/i.test(eff)){c.buffs.push({type:'attack',amount:3,remaining:999,label:card.name});consumeHeldItem(p,id,ctx)}else if((m=eff.match(/на\s+(\d+)\s+хода?.*\+D4\s+урона/i))){c.buffs.push({type:'lightDamage',remaining:Number(m[1]),label:card.name});consumeHeldItem(p,id,ctx)}combatPush(`${p.name} использует «${card.name}».`);renderCharacterSheet('overview');renderCombat();updateUI();return}
    if([174,263].includes(id)){const opts=[...p.statuses];if(!opts.length)return;if(opts.length>1){c.pendingCleanse={id,ctx:{...ctx},options:opts,returnPhase:c.phase,consume:false,markReset:'shrine'};c.phase='cleanse_choice';renderCombat();return}removeStatus(p,opts[0]);useMark(p,id,'shrine');combatSetRoll(card.name,'✓','Негативный эффект снят',opts[0]);}
    else if(id===175){removeStatus(p,'Усталость');useMark(p,id,'shrine');combatSetRoll(card.name,'✓','Усталость проигнорирована','Эффект восстановится после Святилища');}
    else if(id===226){const opts=[...p.statuses];if(!opts.length)return;if(opts.length>1){c.pendingCleanse={id,ctx:{...ctx},options:opts,returnPhase:c.phase,consume:false,markReset:'shrine'};c.phase='cleanse_choice';renderCombat();return}removeStatus(p,opts[0]);useMark(p,id,'shrine');combatSetRoll(card.name,'✓','Негативный эффект снят',opts[0]);}
    else if(id===227){removeStatus(p,'Оглушение');c.heroStunned=0;if(c.lastAppliedHeroStatus==='Оглушение')c.lastAppliedHeroStatus=null;combatSetRoll(card.name,'✓','Оглушение проигнорировано','1 раз за бой');}
    else if([196,266,325,329,342].includes(id)){const die=id===196?'D6':id===266?'D8':id===325?'D12':id===329?'2D8':'D10',r=rollExprDetailed(die);c.pendingEnemyDamage.amount=Math.max(0,c.pendingEnemyDamage.amount-r.total);combatSetRoll(`${card.name} · ${die}`,r.total,`${die} = ${r.total}`,`Входящий урон теперь ${c.pendingEnemyDamage.amount}`)}
    else if(id===159){const r=rollExprDetailed('D6');c.pendingEnemyDamage.amount=Math.max(0,c.pendingEnemyDamage.amount-r.total);combatSetRoll(`${card.name} · D6`,r.total,`D6 = ${r.total}`,`Входящий урон теперь ${c.pendingEnemyDamage.amount}`)}else if(id===233)c.pendingEnemyDamage.amount=Math.max(0,c.pendingEnemyDamage.amount-2);else if(id===261)c.pendingEnemyDamage.amount=0;else if(id===262)c.mirrorQueued=true;
    else if([200,267,328,332].includes(id)){const die=id===200?'D6':id===267?'D8':id===328?'D12':'2D8',r=rollExprDetailed(die);c.pendingHeroDamage.amount+=r.total;combatSetRoll(`${card.name} · ${die}`,r.total,`${die} = ${r.total}`,`Текущий урон ${c.pendingHeroDamage.amount}`)}
    else if(id===149){const r=rollExprDetailed('D4');c.pendingHeroDamage.amount+=r.total;combatApplyEnemyStatus('Горение',3);combatSetRoll(`${card.name} · D4`,r.total,`D4 = ${r.total}`,`+D4 урона и Горение · текущий урон ${c.pendingHeroDamage.amount}`)}
    else if(id===246){const hr=rollHealing(p,'D4'),before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;combatEnemyHealFromHeroHealing(restored);combatSetRoll(`${card.name} · ${hr.used}`,hr.total,`${hr.used} = ${hr.total}`,`Восстановлено ${restored} ЗД · ЗД ${p.currentHp}/${p.maxHp}`)}
    else if(id===265){const r=rollExprDetailed('D12');c.pendingHeroDamage.amount+=r.total;combatSetRoll(`${card.name} · D12`,r.total,`D12 = ${r.total}`,`Текущий урон ${c.pendingHeroDamage.amount}`)}
    else if([197,268,193,345,346,347,326,330].includes(id)){const die=id===345?'D4':id===347?'D10':id===193?'D8':id===197||id===346?'D6':id===268?'D8':id===326?'D12':'2D8';if(id===347)useMark(p,id,'shrine');const hr=rollHealing(p,die),before=p.currentHp;heal(p,hr.total);const restored=p.currentHp-before;combatEnemyHealFromHeroHealing(restored);combatSetRoll(`${card.name} · ${hr.used}`,hr.total,`${hr.used} = ${hr.total}`,`Восстановлено ${restored} ЗД · ЗД ${p.currentHp}/${p.maxHp}`);combatPush(`${card.name}: восстановлено ${restored} ЗД.`)}
    else if(id===248){const d=rand(20),wis=effectiveStat(p,'wis'),tot=d+wis,natural=d===20?20:d===1?1:null,ok=d===20?true:d===1?false:tot>=10;combatSetRoll(`${card.name} · МУД 10+`,d,`${d} ${signed(wis)} = ${tot}`,ok?'Успех':'Провал',natural);announceCheck(card.name,d,'МУД',wis,tot,10,ok,natural);if(ok){const st=p.statuses[0];if(st)removeStatus(p,st)}}
    else if(id===166){c.attackRoll.bonus+=3;c.attackRoll.total+=3;combatSetRoll(`${card.name} · +3`,c.attackRoll.chosen,`${c.attackRoll.chosen} ${signed(c.attackRoll.bonus)} = ${c.attackRoll.total}`,`против ЗЩ ${c.attackRoll.target}`,c.attackRoll.natural)}
    else if(id===244){c.attackRoll.bonus+=5;c.attackRoll.total+=5;combatSetRoll(`${card.name} · +5`,c.attackRoll.chosen,`${c.attackRoll.chosen} ${signed(c.attackRoll.bonus)} = ${c.attackRoll.total}`,`против ЗЩ ${c.attackRoll.target}`,c.attackRoll.chosen)}
    else if(id===147){if(c.attackRoll.mode!=='normal'||c.attackRoll.chosen<2||c.attackRoll.chosen>5){alert('Рапира позволяет перебросить обычный D20 только при натуральном результате 2–5.');return}combatRerollHeroAttack(card.name)}
    else if(id===153){combatRerollHeroAttack(card.name)}
    else if(id===194){combatRerollHeroAttack(card.name);useMark(p,id,['location','ownTerritory'])}
    else if(id===173){c.heroAdvantage++;c.afterEnemyMiss=false}
    else if(id===225){const st=c.lastAppliedHeroStatus;if(st&&['Яд','Кровотечение','Горение'].includes(st)){removeStatus(p,st);c.lastAppliedHeroStatus=null}else{alert('Облачение Феникса может игнорировать только Яд, Кровотечение или Горение.');return}}
    else if([168,245].includes(id)){const st=c.lastAppliedHeroStatus;if(id===168&&!['Яд','Кровотечение'].includes(st)){alert('Кольцо чистой крови работает только против Яда или Кровотечения.');return}const dc=id===168?10:12,d=rand(20),wis=effectiveStat(p,'wis'),tot=d+wis,natural=d===20?20:d===1?1:null,ok=d===20?true:d===1?false:tot>=dc;combatSetRoll(`${card.name} · МУД ${dc}+`,d,`${d} ${signed(wis)} = ${tot}`,ok?'Успех':'Провал',natural);announceCheck(card.name,d,'МУД',wis,tot,dc,ok,natural);if(ok){removeStatus(p,st);c.lastAppliedHeroStatus=null;combatPush(`${card.name}: эффект «${st}» предотвращён.`)}}
    else if(id===223){const choice=prompt('Живая руна героя: введите 1 — +2 к атаке, 2 — после боя восстановить D6 ЗД','1');if(choice==='1')c.livingRune='attack2';else if(choice==='2')c.livingRune='healAfter';else return;combatPush(`Живая руна героя: выбран эффект ${choice==='1'?'+2 к атаке':'лечение D6 после боя'}.`)}
    combatMarkUsed(`item:${id}`);combatPush(`${p.name} использует «${card.name}».`);renderCharacterSheet('overview');renderCombat();updateUI();
  }
  function combatClassAbilityAvailable(p){const c=state.combat;if(!c||c.heroAbilityUsed||c.heroAbilityLocked)return false;if(p.id==='warrior'||p.id==='dwarf')return c.phase==='enemy_damage'&&!!c.pendingEnemyDamage;if(p.id==='mage')return ['hero_turn','post_damage'].includes(c.phase)&&p.currentHp<p.maxHp;if(p.id==='archer')return c.phase==='hero_turn';if(p.id==='rogue')return c.phase==='hero_turn';return false}
  function combatReactionList(){const c=state.combat,p=currentPlayer();if(!c)return[];const out=[];if(combatClassAbilityAvailable(p))out.push({label:`${HERO_COMBAT[p.id].ability} · ${HERO_COMBAT[p.id].effect}`,fn:useHeroCombatAbility});const shadow=setBonusActionInfo(p,'Тени');if(shadow.supported&&shadow.enabled)out.push({label:'Полный сет Тени: заставить врага перебросить успешную атаку',fn:()=>useSetBonus(p,'Тени')});for(const {slot,id} of equippedEntries(p)){const card=itemCard(id),info=supportedCombatEffect(p,card,{where:'equipment',slot});if(info.supported&&info.enabled)out.push({label:`${card.name}: ${card.fields?.['Эффект']||''}`,fn:()=>applyCombatItemEffect(p,id,{where:'equipment',slot})})}return out}
  const ATTACK_REACTION_IDS=new Set([166,244,147,153,194]);
  const DAMAGE_REACTION_IDS=new Set([200,267,328,332,149,265]);
  const DEFENSE_REACTION_IDS=new Set([159,196,266,233,261,262,325,329,342,168,225,245]);
  function combatDecisionOptions(phase=state.combat?.phase){
    const c=state.combat,p=currentPlayer();if(!c||!p)return[];
    const choices=[];
    if(phase==='enemy_miss'){for(const {slot,id} of equippedEntries(p)){if(Number(id)!==173)continue;const card=itemCard(id),info=supportedCombatEffect(p,card,{where:'equipment',slot});if(info.enabled)choices.push({label:`${card.name}: ${card.fields?.['Эффект']||''}`,fn:()=>applyCombatItemEffect(p,id,{where:'equipment',slot})})}return choices}
    if(phase==='enemy_roll'){
      const sh=setBonusActionInfo(p,'Тени');
      if(sh.supported&&sh.enabled)choices.push({label:'Полный сет Тени: перебросить атаку врага',fn:()=>useSetBonus(p,'Тени')});
      return choices;
    }
    if(phase==='enemy_damage'&&Number(c.pendingEnemyDamage?.amount||0)<=0)return [];
    if(phase==='enemy_damage'&&combatClassAbilityAvailable(p))choices.push({label:`${HERO_COMBAT[p.id].ability}: уменьшить урон`,fn:useHeroCombatAbility});
    const allowed=phase==='hero_roll'?ATTACK_REACTION_IDS:phase==='hero_damage'?DAMAGE_REACTION_IDS:phase==='enemy_damage'?DEFENSE_REACTION_IDS:null;
    if(!allowed)return choices;
    for(const {slot,id} of equippedEntries(p)){
      if(!allowed.has(Number(id)))continue;
      const card=itemCard(id),info=supportedCombatEffect(p,card,{where:'equipment',slot});
      if(info.supported&&info.enabled)choices.push({label:`${card.name}: ${card.fields?.['Эффект']||'Применить эффект'}`,fn:()=>applyCombatItemEffect(p,id,{where:'equipment',slot})});
    }
    return choices;
  }
  // All no-choice stages are driven by the current player's client only.
  // Observers never roll dice or mutate shared combat state.
  let combatAutoTimer=null,combatAutoKey='';
  function cancelCombatAuto(){if(combatAutoTimer!==null)clearTimeout(combatAutoTimer);combatAutoTimer=null;combatAutoKey=''}
  function scheduleCombatAuto(){
    const c=state.combat;
    if(!c||!localControlsCombat()){cancelCombatAuto();return}
    const phase=c.phase,decisions=combatDecisionOptions(phase);
    let step=null,wait=ARCANA_RESULT_HOLD;
    if(phase==='hero_roll'&&!decisions.length)step=finalizeHeroAttackRoll;
    else if(phase==='hero_damage'&&!decisions.length)step=applyHeroDamageNow;
    else if(phase==='enemy_ready'){step=combatEnemyTurn;wait=900}
    else if(phase==='enemy_roll'&&!decisions.length){step=finalizeEnemyAttackRoll}
    else if(phase==='enemy_miss'&&!decisions.length)step=combatContinueAfterEnemyMiss;
    else if(phase==='enemy_damage'&&!decisions.length){step=combatAcceptDamageAndContinue}
    else if(phase==='post_damage'){step=combatContinueAfterDamage;wait=ARCANA_RESULT_HOLD}
    if(!step){cancelCombatAuto();return}
    if(['hero_roll','enemy_roll','enemy_damage','hero_damage'].includes(phase)&&Array.isArray(c.lastRoll?.dice)&&c.lastRoll.dice.length)wait=ARCANA_DURATION+arcanaCombatHold(c.lastRoll,phase)+(Math.max(0,c.lastRoll.dice.length-1)*500);
    const key=[c.instanceId,phase,c.round,c.attackRoll?.chosen,c.enemyAttackRoll?.chosen,c.pendingEnemyDamage?.amount,c.pendingHeroDamage?.amount,c.lastRoll?.seq].join(':');
    if(combatAutoTimer!==null&&combatAutoKey===key)return;
    cancelCombatAuto();combatAutoKey=key;
    combatAutoTimer=setTimeout(()=>{
      combatAutoTimer=null;combatAutoKey='';
      const current=state.combat;
      const now=current&&[current.instanceId,current.phase,current.round,current.attackRoll?.chosen,current.enemyAttackRoll?.chosen,current.pendingEnemyDamage?.amount,current.pendingHeroDamage?.amount,current.lastRoll?.seq].join(':');
      if(current&&now===key&&localControlsCombat())step();
    },wait);
  }
  function skipCombatChoice(){
    const c=state.combat;if(!c||!localControlsCombat())return;
    if(c.phase==='hero_roll')finalizeHeroAttackRoll();
    else if(c.phase==='hero_damage')applyHeroDamageNow();
    else if(c.phase==='enemy_roll')finalizeEnemyAttackRoll();
    else if(c.phase==='enemy_damage')combatAcceptDamageAndContinue();
  }
  function combatAbilityButtonHtml(p){const h=HERO_COMBAT[p.id],available=combatClassAbilityAvailable(p);return h&&available?`<button id="combatHeroAbility" class="${p.id==='warrior'||p.id==='dwarf'?'success':'secondary'}">Способность: ${h.ability}</button>`:''}
  function enemyRankClass(e){const r=String(e?.fields?.['Ранг']||'').toLowerCase();if(r.includes('слаб'))return 'rank-weak';if(r.includes('обыч'))return 'rank-normal';if(r.includes('силь'))return 'rank-strong';if(r.includes('элит'))return 'rank-elite';if(e?.id===281||r.includes('босс'))return 'rank-boss';return ''}
  // Visual-only combat card helpers. IDs reference existing approved cards; no gameplay changes.
  let combatVisualUiState={combatId:null,heroBack:false,enemyBack:false};
  function getCombatVisualUiState(c){
    const combatId=c?.instanceId||null;
    if(combatVisualUiState.combatId!==combatId)combatVisualUiState={combatId,heroBack:false,enemyBack:false};
    return combatVisualUiState;
  }
  function toggleCombatVisualFace(side){
    const c=state.combat;if(!c)return;
    const ui=getCombatVisualUiState(c),key=side==='enemy'?'enemyBack':'heroBack';
    ui[key]=!ui[key];
    renderCombat(true);
  }
  function combatPortraitUrl(kind,id){
    if(kind==='hero'&&['warrior','dwarf','mage','archer','rogue'].includes(id))return `assets/heroes/${id}.webp`;
    if(kind==='enemy'&&Number.isInteger(Number(id))&&Number(id)>0)return `assets/enemies/enemy-${String(id).padStart(3,'0')}.webp`;
    return '';
  }
  function escapeCombatText(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function combatCardStageHtml(side,kind,id,name,c,backHtml,frontMetrics=''){
    const path=combatPortraitUrl(kind,id),ui=getCombatVisualUiState(c),back=side==='enemy'?ui.enemyBack:ui.heroBack;
    return `<button type="button" class="visual-card-stage ${back?'is-back':''}" data-visual-toggle="${side}" aria-pressed="${back?'true':'false'}" title="${back?'Показать портрет':'Показать описание'}"><span class="visual-card-face visual-card-front"><div class="visual-combat-portrait${path?'':' portrait-not-found'}">${path?`<img src="${path}" alt="${escapeCombatText(name)}" loading="eager" decoding="async" onerror="this.style.display='none';this.parentElement.classList.add('portrait-not-found')">`:''}<div class="portrait-placeholder">Портрет готовится</div></div>${frontMetrics}</span><span class="visual-card-face visual-card-back">${backHtml}</span></button>`;
  }
  // v0.6.80: tabletop battle card inspired by the approved Codex mockups.
  // All actions below the cards and the combat state machine stay unchanged.
  // v0.6.82 — live character statistics sit over the 1:1 portrait, not below it.
  // These values are read from the same game state as the old metrics; no combat rules change.
  function battleMetric(label,value,position,tone=''){
    return `<span class="battle-overlay-stat ${position} ${tone}" aria-label="${escapeCombatText(label)}: ${escapeCombatText(value)}"><span class="stat-label">${escapeCombatText(label)}</span><strong>${escapeCombatText(value)}</strong></span>`;
  }
  function battleHeroMetrics(p){
    const h=HEROES.find(x=>x.id===p.id)||p;
    return `<span class="battle-portrait-stats hero-portrait-stats" aria-label="Характеристики героя">
      ${battleMetric('ЗД',`${p.currentHp}/${p.maxHp}`,'stat-hp')}
      ${battleMetric('ЗЩ',String(combatEffectiveDefense(p)),'stat-defense')}
      ${battleMetric('УР',currentHeroDamage(p),'stat-damage')}
      ${battleMetric('АТ',statName(h.baseAttack||'str'),'stat-attack')}
      ${battleMetric('СИЛ',signed(effectiveStat(p,'str')),'stat-str')}
      ${battleMetric('ЛОВ',signed(effectiveStat(p,'dex')),'stat-dex')}
      ${battleMetric('МУД',signed(effectiveStat(p,'wis')),'stat-wis')}
      ${battleMetric('ХАР',signed(effectiveStat(p,'cha')),'stat-cha')}
    </span>`;
  }
  function battleEnemyMetrics(e,c){
    return `<span class="battle-portrait-stats enemy-portrait-stats" aria-label="Характеристики врага">
      ${battleMetric('ЗД',`${Math.max(0,c.enemyHp)}/${c.enemyMaxHp}`,'stat-hp')}
      ${battleMetric('ЗЩ',String(e.fields?.['ЗЩ']||'—'),'stat-defense')}
      ${battleMetric('УР',String(e.fields?.['Урон']||'—'),'stat-damage')}
      ${battleMetric('АТ',String(e.fields?.['АТК']||'—'),'stat-attack')}
    </span>`;
  }
  function battleBackRow(label,value,caption=''){
    return `<div class="battle-back-detail"><span>${escapeCombatText(label)}</span><strong>${escapeCombatText(value)}</strong>${caption?`<small>${escapeCombatText(caption)}</small>`:''}</div>`;
  }
  function combatHeroBackHtml(p,c){
    const h=HERO_COMBAT[p.id];if(!h)return '<div class="visual-card-back-wrap"></div>';
    const base=HEROES.find(x=>x.id===p.id)||{};
    const nat=h.natural20||'—',parts=nat.split(' — '),effects=combatActiveEffectsHtml(c,p);
    const used=!!c.heroAbilityUsed;
    return `<div class="visual-card-back-wrap hero-back battle-v080-back">
      <h4>Текущие характеристики</h4>
      ${battleBackRow('Здоровье',`${p.currentHp}/${p.maxHp}`,'Текущее / максимальное')}
      ${battleBackRow('ЗЩ',String(combatEffectiveDefense(p)),`База ${base.defense??'—'} · экипировка и эффекты учтены`)}
      ${battleBackRow('СИЛ',signed(effectiveStat(p,'str')),`База ${signed(base.str||0)}`)}
      ${battleBackRow('ЛОВ',signed(effectiveStat(p,'dex')),`База ${signed(base.dex||0)}`)}
      ${battleBackRow('МУД',signed(effectiveStat(p,'wis')),`База ${signed(base.wis||0)}`)}
      ${battleBackRow('ХАР',signed(effectiveStat(p,'cha')),`База ${signed(base.cha||0)}`)}
      ${battleBackRow('Атака',statName(base.baseAttack||'str'),`Урон ${currentHeroDamage(p)}`)}
      <div class="visual-back-block ${used?'ability-used':''}"><small>СПОСОБНОСТЬ ГЕРОЯ ${used?'· ИСПОЛЬЗОВАНА':''}</small><b>${escapeCombatText(h.ability)}</b><span>${escapeCombatText(h.effect)}</span></div>
      <div class="visual-back-block accent"><small>НАТУРАЛЬНАЯ 20</small><b>${escapeCombatText(parts[0]||'Эффект героя')}</b><span>${escapeCombatText(parts.length>1?parts.slice(1).join(' — '):nat)}</span></div>${effects}
    </div>`;
  }
  function combatEnemyBackHtml(e,c){
    const effect=String(e.fields?.['Эффект']||'').trim()||'Без постоянного эффекта';
    const extra=combatEnemyEffectsHtml(c);
    const rank=String(e.fields?.['Ранг']||(e.id===281?'Босс':'—'));const type=String(e.fields?.['Тип']||'—');
    return `<div class="visual-card-back-wrap enemy-back battle-v080-back"><h4>Характеристики врага</h4><div class="battle-enemy-taxonomy">${escapeCombatText(rank)} · ${escapeCombatText(type)}</div>
      ${battleBackRow('Здоровье',`${Math.max(0,c.enemyHp)}/${c.enemyMaxHp}`)}
      ${battleBackRow('ЗЩ',String(e.fields?.['ЗЩ']||'—'))}
      ${battleBackRow('АТК',String(e.fields?.['АТК']||'—'))}
      ${battleBackRow('Урон',String(e.fields?.['Урон']||'—'))}
      ${c.elite?'<div class="visual-card-warning">ЭЛИТНАЯ ОПАСНОСТЬ · АТАКУЕТ ПЕРВОЙ</div>':''}
      <div class="visual-back-block accent"><small>ПОСТОЯННЫЙ ЭФФЕКТ</small><span>${escapeCombatText(effect)}</span></div>${extra}
    </div>`;
  }
  // v0.6.86: presentation-only effect badges and segmented HP, adapted from
  // the supplied Codex combat-cards layout. Battle rules and actions are unchanged.
  const BATTLE_V086_EFFECT_PATHS={
    flame:'M12 2c2 6 8 8 8 13a8 8 0 0 1-16 0c0-3 2-6 4-8 0 5 4 5 4-5Z',
    drop:'M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13Z',
    star:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
    eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    poison:'M9 2h6m-5 0v6l-6 10q-1 3 3 3h10q4 0 3-3L14 8V2M7 15h10',
    moon:'M19 16A9 9 0 0 1 8 3a9 9 0 1 0 11 13Z',
    stun:'m8 2 2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1Zm10 12 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z',
    chain:'m9 15 6-6M8 17l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0m2-2 2-2a4 4 0 0 1 5 5l-5 5a4 4 0 0 1-5 0',
    clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 6v6l4 3',
    shield:'M12 3 21 6v6c0 5-9 9-9 9S3 17 3 12V6Z M12 7v10',
    sword:'m5 19 11-11 2-5-5 2L2 16m1-3 8 8m-6-2-2 2',
    heart:'M20 5c-3-3-6-1-8 1C10 4 7 2 4 5c-4 5 3 11 8 15 5-4 12-10 8-15Z',
    dex:'M4 3c15 1 15 17 0 18L14 12Z M2 12h20m-4-3 4 3-4 3',
    wis:'M12 6C8 3 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-6-1-10 2Zm0 0v15'
  };
  function battleV086EffectIcon(label,detail=''){
    const t=String(label)+' '+String(detail);
    return /Горение/i.test(t)?'flame':/Кровотечение/i.test(t)?'drop':/Яд/i.test(t)?'poison':/Оглушение/i.test(t)?'stun':/Проклятие/i.test(t)?'moon':/Усталость/i.test(t)?'clock':/Слабость/i.test(t)?'chain':/Страх|помех/i.test(t)?'eye':/блок|безмолви/i.test(t)?'chain':/защит|покров|стойк|кровь|ЗЩ/i.test(t)?'shield':/урон|атак|удар|ярост/i.test(t)?'sword':/лечени|здоровье|восстанов/i.test(t)?'heart':/ловкост|ЛОВ/i.test(t)?'dex':/мудрост|МУД/i.test(t)?'wis':'star';
  }
  function battleV086Badges(rows){
    if(!rows.length)return '';
    return `<span class="tabletop-effect-overlay" aria-label="Активные эффекты">${rows.map(({label,detail,tone})=>{
      const path=BATTLE_V086_EFFECT_PATHS[battleV086EffectIcon(label,detail)]||BATTLE_V086_EFFECT_PATHS.star;
      const description=escapeCombatText(`${label}${detail?' — '+detail:''}`);
      return `<span class="tabletop-effect-icon ${tone==='negative'?'negative':'positive'}" title="${description}" aria-label="${description}"><svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg></span>`;
    }).join('')}</span>`;
  }
  function battleV086HeroEffects(p,c){
    const out=[],seen=new Set();
    const add=(label,detail='',tone='positive')=>{if(!label)return;const key=`${label}|${detail}|${tone}`;if(seen.has(key))return;seen.add(key);out.push({label,detail,tone})};
    for(const st of p.statuses||[])add(st,'','negative');
    for(const e of p.temporaryEffects||[])add(e.label||'Временный эффект',e.amount?`${signed(e.amount)} ${BONUS_KEYS[e.key]||e.key||''}`:'',Number(e.amount)<0?'negative':'positive');
    for(const e of c.pendingStartEffects||[])add(e.label||'Боевой эффект',e.type||'',/Disadvantage|AbilityLocked|EnemyFirst|EnemyHit/.test(e.type||'')?'negative':'positive');
    for(const e of p.combatEffects||[])if(!String(e.type||'').startsWith('nextBattle'))add(e.label||'Боевой эффект',e.type||'','positive');
    for(const b of c.buffs||[])if(b.remaining>0)add(b.label||'Боевой эффект',b.type||'','positive');
    if(c.heroAllAdvantage)add(c.heroAllAdvantageLabel||'Преимущество');
    if(c.battleDefenseBonus>0)add(c.battleDefenseLabel||'Защита',`+${c.battleDefenseBonus} ЗЩ`);
    if(c.heroIncomingHalf)add(c.heroIncomingHalfLabel||'Защита от урона');
    if(c.heroDamageMultiplier>1)add(c.heroDamageMultiplierLabel||'Усиление атаки');
    if(c.heroDisadvantage>0)add(c.heroDisadvantageLabel||'Помеха','','negative');
    if(c.heroStunned>0&&!p.statuses?.includes('Оглушение'))add('Оглушение','','negative');
    if(c.heroAbilityLocked)add(c.heroAbilityLockedLabel||'Блок способности','','negative');
    if(c.heroAdvantage>0)add(c.heroAdvantageLabel||'Преимущество');
    if(c.freeEscape)add(c.freeEscapeLabel||'Свободный побег');
    return battleV086Badges(out);
  }
  function battleV086EnemyEffects(c){
    const out=[];
    for(const [key,label] of [['enemyBurn','Горение'],['enemyBleed','Кровотечение'],['enemyStunned','Оглушение'],['enemyDisadvantage','Помеха'],['enemyAdvantage','Преимущество']])if(c[key]>0)out.push({label,detail:`${c[key]}`,tone:key==='enemyAdvantage'?'positive':'negative'});
    if(c.enemyAllDisadvantage)out.push({label:'Помеха',detail:'Все атаки врага',tone:'negative'});
    return battleV086Badges(out);
  }
  function battleV086HealthSegments(hp,maxHp){
    const max=Math.max(1,Math.floor(Number(maxHp)||1)),now=Math.max(0,Math.min(max,Math.floor(Number(hp)||0)));
    const parts=Array.from({length:max},(_,i)=>`<span class="battle-v086-hp-segment${i<now?' filled':''}" aria-hidden="true"></span>`).join('');
    return `<div class="battle-v086-health" role="meter" aria-label="Здоровье: ${now} из ${max}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${now}" style="--battle-v086-hp-count:${max}" title="ЗД ${now}/${max}">${parts}</div>`;
  }
  function combatHeroVisualCard(p,c){
    const playerName=String(window.__RPG_HERO_PLAYER_NAMES__?.[p.id]||'').trim();
    const heroHeading=playerName&&playerName!==p.name?`${p.name} — ${playerName}`:p.name;
    // v0.6.83: the negative effects belong to the upper central area of the portrait,
    // while a spent class ability is crossed out on its OWN panel (not on the image).
    const portraitDetails=battleHeroMetrics(p)+battleV086HeroEffects(p,c);
    return `<section class="combatant hero visual-combat-card tabletop-battle-card" style="--visual-accent:${p.color||'#4f85dc'}"><div class="tabletop-card-heading"><h3 title="${escapeCombatText(heroHeading)}">${escapeCombatText(heroHeading)}</h3></div>${combatCardStageHtml('hero','hero',p.id,p.name,c,combatHeroBackHtml(p,c),portraitDetails)}${battleV086HealthSegments(p.currentHp,p.maxHp)}<div class="tabletop-card-note ${c.heroAbilityUsed?'ability-used':''}"><small>СПОСОБНОСТЬ · ${c.heroAbilityUsed?'ИСПОЛЬЗОВАНА':'ДОСТУПНА'}</small><strong>${escapeCombatText(HERO_COMBAT[p.id]?.ability||'—')}</strong><span>${escapeCombatText(HERO_COMBAT[p.id]?.effect||'')}</span></div></section>`;
  }
  function combatEnemyVisualCard(e,c){
    const isBoss=e.id===281,rank=String(e.fields?.['Ранг']||(isBoss?'Босс':'—')).toUpperCase();
    const type=String(e.fields?.['Тип']||'—').toUpperCase();
    const permanent=String(e.fields?.['Эффект']||'').trim();
    return `<section class="combatant enemy visual-combat-card tabletop-battle-card ${enemyRankClass(e)}" aria-label="Враг ${escapeCombatText(e.name)}"><div class="tabletop-card-heading"><h3 title="${escapeCombatText(e.name)}">${escapeCombatText(e.name)}</h3></div>${combatCardStageHtml('enemy','enemy',e.id,e.name,c,combatEnemyBackHtml(e,c),battleEnemyMetrics(e,c)+battleV086EnemyEffects(c))}${battleV086HealthSegments(c.enemyHp,c.enemyMaxHp)}${permanent?`<div class="tabletop-card-note enemy-note"><small>ПОСТОЯННЫЙ ЭФФЕКТ</small><strong>Особенность врага</strong><span>${escapeCombatText(permanent)}</span></div>`:''}</section>`;
  }
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
  function combatEnemyEffectsHtml(c){
    const rows=[];if((c.enemyBurn||0)>0)rows.push(`Горение (${c.enemyBurn})`);if((c.enemyBleed||0)>0)rows.push(`Кровотечение (${c.enemyBleed})`);if((c.enemyStunned||0)>0)rows.push('Оглушение');
    return rows.length?`<div class="combat-enemy-effects"><b>Активные эффекты:</b> ${rows.join(' · ')}</div>`:'';
  }
  function renderCombat(force=false){
    const c=state.combat,p=currentPlayer(),e=combatEnemy();if(!c||!e)return;if(c.phase==='victory'&&c.victoryUiStep==='loot'&&els.modal.dataset.lootDraft==='true')return;syncLocalCombatWindowState();if(combatWindowHidden&&!force){updateCombatRestoreButton();scheduleCombatAuto();return}if(force)combatWindowHidden=false;updateCombatRestoreButton();
    document.body.classList.add('combat-active');els.modalClose.style.display='none';const localCombatant=localControlsCombat(),reactions=localCombatant&&c.phase==='hero_turn'?combatReactionList():[];let phaseHtml='',actions='';
    const decisions=localCombatant?combatDecisionOptions(c.phase):[];
    if(localCombatant){
      if(c.phase==='pre')actions=`<button id="combatFight" class="success">Вступить в бой</button><button id="combatEscapeBefore" class="secondary">${c.freeEscape?'Сбежать':'Попытаться сбежать · ЛОВ 13+'}</button>`;
      else if(c.phase==='hero_turn')actions=`<button id="combatAttack" class="success">Атаковать</button><button id="combatEscape" class="secondary">${c.freeEscape?'Сбежать':'Сбежать · ЛОВ 15+'}</button>${combatAbilityButtonHtml(p)}`;
      else if(c.phase==='hero_damage_ready')actions=`<button id="combatRollDamage" class="success">Урон · бросить ${c.attackRoll?.profile?.damage||'кубик'}</button>`;
      else if(c.phase==='mage_nat20')actions=`<button id="mageLightning" class="success">Молния · +D4 и Оглушение</button><button id="mageFire" class="danger">Огонь · +D4 и Горение</button>`;
      else if(['hero_roll','hero_damage','enemy_roll','enemy_damage'].includes(c.phase)&&decisions.length){
        const skipText=c.phase==='hero_roll'?'Не использовать бонус атаки':c.phase==='hero_damage'?'Без бонуса — нанести урон':c.phase==='enemy_roll'?'Не перебрасывать атаку врага':`Не использовать защиту · принять ${c.pendingEnemyDamage?.amount||0} урона`;
        actions=`${decisions.map((x,i)=>`<button class="${/^(Каменная кровь|Железная стойкость)/.test(x.label)?'success':'secondary'} combat-choice" data-auto-choice="${i}">${x.label}</button>`).join('')}<button id="combatSkipChoice" class="${c.phase==='enemy_damage'?'danger':'success'}">${skipText}</button>`;
      }
      else if(c.phase==='enemy_miss'&&decisions.length)actions=`<div class="combat-decision-title">Доступна реакция на промах врага</div>${decisions.map((x,i)=>`<button class="${/^(Каменная кровь|Железная стойкость)/.test(x.label)?'success':'secondary'} combat-choice" data-auto-choice="${i}">${x.label}</button>`).join('')}<button id="combatContinueMiss" class="success">Не использовать</button>`;
      else if(c.phase==='post_damage')actions='';
      else if(c.phase==='enemy_ready'||c.phase==='enemy_roll'||c.phase==='enemy_miss'||c.phase==='enemy_damage'||c.phase==='hero_roll'||c.phase==='hero_damage')actions='';
      else if(c.phase==='escape_result')actions=`<button id="combatResolveEscape" class="success">Продолжить</button>`;
      else if(c.phase==='cleanse_choice')actions=(c.pendingCleanse?.options||[]).map((st,i)=>`<button data-cleanse-status="${i}" class="success">Снять: ${st}</button>`).join('');
      else if(c.phase==='victory'&&c.isBoss)actions=`<button id="combatFinishVictory" class="success">Завершить партию</button>`;
      else if(c.phase==='victory')actions=`<button id="combatPostVictory" class="success">Продолжить после победы</button>`;
      if(c.phase==='hero_damage')phaseHtml=`<div class="combat-pending damage-out"><b>Урон готов:</b> <b class="big">${c.pendingHeroDamage?.amount||0}</b>. До нажатия «Нанести урон» можно применить подходящие эффекты.</div>`;
      if(c.phase==='enemy_damage')phaseHtml=`<div class="combat-pending"><b>Входящий урон:</b> <b class="big">${c.pendingEnemyDamage?.amount||0}</b>. Игрок сам решает, тратить ли защитные эффекты.</div>`;
    }
    const mode=playerHardMode(p)?'Сложный режим · реакции скрыты':'Обычный режим · реакции включены';
    const observedName={warrior:'Воином',dwarf:'Дворфом',mage:'Магом',archer:'Лучником',rogue:'Разбойником'}[p.id]||p.name;
    const guide=localCombatant&&!playerHardMode(p)?`<div class="combat-effects-manual"><h4>Памятка боя</h4><div class="combat-note">Активные способности, предметы и наёмники применяет игрок. Натуральные 1 и 20 автоматические только при одиночном D20. Лечение доступно до атаки в свой боевой ход и после принятого нелетального урона.</div></div>`:'';
    const journalVisible=combatJournalInstance===c.instanceId?combatJournalVisible:!!c.journalOpen;const oldScroll=els.modalContent.querySelector('.combat-history')?.scrollTop||0;const history=journalVisible?`<div class="combat-history-wrap"><div class="combat-history">${(c.history||[]).map(x=>`<div>${x}</div>`).join('')||'<div>Записей пока нет.</div>'}</div></div>`:'';
    const controlBlock=localCombatant?`${reactions.length?`<div class="combat-reactions"><h4>РЕАКЦИИ — игра напоминает, но решение за игроком</h4><div class="combat-reaction-buttons">${reactions.map((r,i)=>`<button data-reaction="${i}" class="${/^(Каменная кровь|Железная стойкость)/.test(r.label)?'success':'secondary'}">${r.label}</button>`).join('')}</div></div>`:''}<div class="combat-actions">${actions}</div><div class="combat-sheet-actions"><button id="combatHeroSheet" class="secondary">Герой</button><button id="combatInventory" class="secondary">Инвентарь</button></div>${guide}`:'';
    els.modalContent.innerHTML=`<div class="combat-shell ${localCombatant?'combat-owner-view':'combat-observer-view'}"><div class="combat-summary"><span class="combat-mode-badge">${localCombatant?mode:`Наблюдение за ${observedName}`}</span><span class="combat-pill">Раунд ${c.round}</span><button id="combatHide" class="combat-hide ghost" type="button">Скрыть бой</button></div><div class="combat-head visual-combat-head">${combatHeroVisualCard(p,c)}<div class="combat-vs">VS</div>${combatEnemyVisualCard(e,c)}</div>${phaseHtml}${controlBlock}<div class="combat-journal-control"><button id="combatJournalToggle" class="${journalVisible?'secondary active':'ghost'}">Журнал боя${journalVisible?' ▲':' ▼'}</button></div>${history}</div>`;els.modal.hidden=false;if(journalVisible&&oldScroll)els.modalContent.querySelector('.combat-history')?.scrollTo(0,oldScroll);
    if(localCombatant){reactions.forEach((r,i)=>{const b=els.modalContent.querySelector(`[data-reaction="${i}"]`);if(b)b.onclick=r.fn});els.modalContent.querySelectorAll('[data-auto-choice]').forEach(b=>b.onclick=()=>decisions[Number(b.dataset.autoChoice)]?.fn());els.modalContent.querySelectorAll('[data-cleanse-status]').forEach(b=>b.onclick=()=>chooseCombatCleanseStatus((c.pendingCleanse?.options||[])[Number(b.dataset.cleanseStatus)]))}
    els.modalContent.querySelectorAll('[data-visual-toggle]').forEach(b=>b.onclick=()=>toggleCombatVisualFace(b.dataset.visualToggle));
    const bind=(id,fn)=>{const x=document.getElementById(id);if(x)x.onclick=fn};if(localCombatant){bind('combatFight',combatFight);bind('combatResolveEscape',resolveCombatEscapeResult);bind('combatEscapeBefore',combatEscapeBefore);bind('combatAttack',combatHeroAttack);bind('combatRollDamage',combatRollHeroDamage);bind('combatSkipChoice',skipCombatChoice);bind('combatEscape',combatEscapeDuring);bind('combatHeroAbility',useHeroCombatAbility);bind('combatFinalizeAttack',finalizeHeroAttackRoll);bind('mageLightning',()=>chooseMageNat20('lightning'));bind('mageFire',()=>chooseMageNat20('fire'));bind('combatApplyHeroDamage',applyHeroDamageNow);bind('combatEnemyTurn',combatEnemyTurn);bind('combatFinalizeEnemyRoll',finalizeEnemyAttackRoll);bind('combatAcceptDamage',combatAcceptDamageAndContinue);bind('combatContinueMiss',combatContinueAfterEnemyMiss);bind('combatContinueAfterDamage',combatContinueAfterDamage);bind('combatFinishVictory',finishCombatVictory);bind('combatPostVictory',()=>{if(c.victory?.lootDraft&&!c.victory.lootDraft.confirmed&&c.victory.lootDraft.keep>0)openVictoryLootDraft();else showPostCombatTerritoryPrompt()});bind('combatHeroSheet',()=>openCharacterSheet('overview'));bind('combatInventory',()=>openCharacterSheet('inventory'))}
    bind('combatHide',hideCombatWindow);bind('combatJournalToggle',()=>{combatJournalInstance=c.instanceId;combatJournalVisible=!journalVisible;c.journalOpen=combatJournalVisible;renderCombat(true)});if(localCombatant&&!els.sheetDrawer.hidden&&sheetView.playerId===p.id)renderCharacterSheet(sheetView.mode,sheetView.bonusKey);arcanaPresentCombat(c);scheduleCombatAuto();
  }
  function combatTickBuffsAtHeroAttack(){const c=state.combat;if(!c)return;for(const b of c.buffs||[])if(['attack','lightDamage','advantage'].includes(b.type)&&b.remaining>0)b.remaining--;c.buffs=(c.buffs||[]).filter(b=>b.remaining>0)}
  function combatTickBuffsAtEnemyTurn(){const c=state.combat;if(!c)return;for(const b of c.buffs||[])if(b.type==='defense'&&b.remaining>0)b.remaining--;c.buffs=(c.buffs||[]).filter(b=>b.remaining>0)}


  function updateActionPanel(){
    if(!state.started){renderTurnOrderBanner();return}const p=currentPlayer();renderTurnOrderBanner();els.actionPanel.innerHTML='';
    if(state.gameOver){const winner=getPlayer(state.gameOver.winnerId)||p;addActionBox('Партия завершена',`<b>${winner.name}</b> победил Владыку Сердца Тьмы. Дальнейшие ходы заблокированы.`,[{label:'Показать итог партии',className:'success',fn:()=>showGameOverPopup(winner,{force:true})}]);return}
    if(state.combat){return}
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
        {label:`Заплатить дань ${tribute}`,className:'secondary',disabled:p.gold<tribute,why:`Нужно ${tribute} золота`,fn:payTributeNow},
        {label:'Попытаться избежать дани · ХАР 12+',className:'primary',fn:attemptAvoidTribute},
        {label:`Попытаться захватить · ХАР 15+ (${full} зол.)`,className:'danger',disabled:p.gold<full,why:`Нужно ${full} золота`,fn:attemptCaptureTerritory},
        {label:'Попросить пройти бесплатно',className:'success',fn:requestPassagePermission}
      ]);
    }
    const sameHexHeroes=state.players.filter(q=>q.id!==p.id&&q.hex===p.hex);if(sameHexHeroes.length&&!state.foreignTerritoryPending)addActionBox('Торговля между игроками',`На гексе вместе с ${p.name} находится: <b>${sameHexHeroes.map(q=>q.name).join(', ')}</b>. Пока герои остаются на одном гексе, торговля доступна в ход любого из них.`,[{label:'Начать торговлю',className:'primary',fn:()=>openTrade(p,true)}]);
    if(foreign&&foreign.heroId===p.id&&foreign.hex===p.hex)return;
    const build=canBuildAt(p);
    if(build.ok&&!state.turnLocked){addActionBox('Строительство',`Очищенный гекс ${p.hex}. Стоимость: ${build.cost} золота.`,[{label:`Построить за ${build.cost}`,className:'success',fn:buildTerritory}])}
    else if(!state.turnLocked&&state.cleaned[p.hex]&&!state.territories[p.hex]&&MAP.hexes[p.hex]&&['kingdom','cursed'].includes(MAP.hexes[p.hex].region)){addActionBox('Строительство недоступно',build.why,[])}
    const candidates=affordableAreaCandidatesAt(p,p.hex);if(candidates.length&&!state.turnLocked){addActionBox('Область',`Можно объединить 3 граничащие территории в область.`,candidates.slice(0,8).map(c=>({label:`Объединить за ${areaMergeCost(c)} ЗОЛ · ${c.join(' + ')}`,className:'secondary',fn:()=>createArea(c,{player:p,onDone:()=>advanceTurnState(p,'создание области'),onCancel:()=>{updateUI();renderBoard()}})})))}
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
  function addActionBox(title,text,actions){const box=document.createElement('div');box.className='action-box';box.innerHTML=`<div class="action-title">${title}</div><div class="muted small">${text}</div><div class="action-buttons"></div>`;const bxs=box.querySelector('.action-buttons');actions.forEach(a=>{const b=document.createElement('button');b.textContent=a.label;b.className=a.className||'';b.disabled=!!a.disabled;if(a.disabled)b.title=a.why||'Недостаточно золота';b.onclick=a.disabled?null:a.fn;bxs.appendChild(b)});els.actionPanel.appendChild(box)}

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
    const active=currentPlayer(),next=[];
    for(let n=1;n<state.order.length;n++){const player=getPlayer(state.order[(state.currentIndex+n)%state.order.length]);if(player)next.push(player)}
    els.turnOrderBanner.hidden=false;
    const previousScroll=els.turnOrderBanner.querySelector('.table-turns')?.scrollLeft||0;
    const changedActive=els.turnOrderBanner.dataset.scrollKey!==String(active?.id);
    const roomCode=els.turnOrderBanner.dataset.roomCode||'';
    const bannerHtml=RPGTabletop.turns(active,next,state.round,roomCode);if(els.turnOrderBanner.dataset.lastMarkup===bannerHtml)return;els.turnOrderBanner.dataset.lastMarkup=bannerHtml;els.turnOrderBanner.innerHTML=bannerHtml;
    if(!changedActive&&previousScroll)els.turnOrderBanner.querySelector('.table-turns').scrollLeft=previousScroll;
    els.turnOrderBanner.querySelector('[data-table-journal]')?.addEventListener('click',()=>{renderJournal();els.journalOverlay.hidden=false});
    // Preserve horizontal scroll on mobile as the turn order refreshes.
    if(els.turnOrderBanner.dataset.scrollKey!==String(active?.id)){
      els.turnOrderBanner.dataset.scrollKey=String(active?.id);els.turnOrderBanner.querySelector('.table-turns')?.scrollTo({left:0,behavior:'instant'});
    }
  }

  function updateUI(){
    syncLocalCombatWindowState();document.body.classList.toggle('combat-active',!!state.combat);
    if(!state.started){renderTurnOrderBanner();return}const p=currentPlayer();renderTurnOrderBanner();
    ensurePlayerModel(p);els.turnCard.innerHTML=`<div class="turn-name" style="color:${p.color}">${p.name}</div><div>Личный ход: <b>${p.personalTurn}</b> · Раунд: <b>${state.round}</b></div><div>Позиция: <b>${p.hex}</b></div><div class="turn-meta">${regionName(MAP.hexes[p.hex].region)}</div><div class="statline"><span class="pill">ЗД ${p.currentHp}/${p.maxHp}</span><span class="pill">${statDisplay(p,'defense')}</span><span class="pill">Урон ${currentHeroDamage(p)}</span><span class="pill">${statDisplay(p,'str')}</span><span class="pill">${statDisplay(p,'dex')}</span><span class="pill">${statDisplay(p,'wis')}</span><span class="pill">${statDisplay(p,'cha')}</span><span class="pill">Золото ${p.gold}</span><button class="pill map-highlight-trigger" data-map-highlight="territories">Территории ${Object.values(state.territories).filter(t=>t.owner===p.id).length}</button><button class="pill map-highlight-trigger" data-map-highlight="areas">Области ${state.areas.filter(a=>a.owner===p.id).length}</button></div>${p.statuses.length?`<div class="turn-meta">Эффекты: ${statusSummary(p)}</div>`:''}${activeEffectRows(p).filter(x=>x.kind!=='Негативный эффект').length?`<div class="turn-meta">Активно: ${activeEffectRows(p).filter(x=>x.kind!=='Негативный эффект').map(x=>x.label).join(' · ')}</div>`:''}${p.inDungeon?'<div class="error"><b>Герой в Темнице.</b></div>':''}`;els.turnCard.querySelectorAll('[data-bonus-key]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openCharacterSheet('overview',b.dataset.bonusKey)}));els.turnCard.querySelectorAll('[data-map-highlight]').forEach(b=>{const type=b.dataset.mapHighlight;const active=()=>state.mapHighlight?.type===type&&state.mapHighlight?.playerId===p.id;const refresh=()=>{b.classList.toggle('map-highlight-active',active());b.setAttribute('aria-pressed',active()?'true':'false')};const set=()=>{state.mapHighlight={type,playerId:p.id};refresh();renderBoard()};const clear=()=>{if(active()){state.mapHighlight=null;refresh();renderBoard()}};refresh();if(!isMobileViewport()){b.addEventListener('mouseenter',set);b.addEventListener('mouseleave',clear)}b.addEventListener('click',e=>{e.stopPropagation();if(active())state.mapHighlight=null;else state.mapHighlight={type,playerId:p.id};refresh();renderBoard()})});
    els.diceResult.textContent=!state.rolled?'—':Math.max(0,(Number(state.movePoints)||0)-(state.movePending?Number(manualMovePlan(p)?.cost||0):0));els.diceResult.title='Осталось доступных шагов';els.moveRollBtn.disabled=!!state.gameOver||state.rolled||p.inDungeon||state.turnLocked||p.pendingItems.length>0||!!state.combat;const unresolvedHex=currentHexNeedsResolution(p);els.endTurnBtn.disabled=!!state.gameOver||!!state.combat||state.turnLocked||(p.inDungeon&&dungeonExitAvailable(p))||p.pendingItems.length>0||unresolvedHex||state.foreignTerritoryPending?.heroId===p.id||!!state.tributeConsentPending;
    els.moveHint.hidden=false;
    if(state.gameOver)els.moveHint.textContent='Партия завершена: Владыка Сердца Тьмы побеждён.';else if(state.foreignTerritoryPending?.heroId===p.id)els.moveHint.textContent=state.foreignTerritoryPending.transitKey?'Маршрут проходит через чужую территорию. Выберите: дань, избегание, захват или просьбу пройти бесплатно — после решения движение продолжится.':'Вы на чужой территории. Выберите: дань, избегание, захват или просьбу пройти бесплатно.';else if(p.pendingItems.length)els.moveHint.textContent=`Сначала разберите все неразобранные тайники (${p.pendingItems.length}). Движение и завершение хода заблокированы.`;else if(p.inDungeon&&!dungeonExitAvailable(p))els.moveHint.textContent='Герой только что попал в Темницу. Закройте окно попадания в Темницу — ход завершится автоматически.';else if(p.inDungeon)els.moveHint.textContent='Обычное движение недоступно. Выбери характеристику для попытки выхода — это займёт весь ход.';else if(state.movePending){const plan=manualMovePlan(p),route=plan.path.join(' → '),left=Math.max(0,state.movePoints-plan.cost);els.moveHint.textContent=`Маршрут: ${route}. Использовано ${plan.cost}/${state.movePoints}, осталось ${left}. Нажимайте следующий зелёный гекс, чтобы продолжить путь; нажмите уже выбранный гекс, чтобы сократить маршрут. Когда конечная точка выбрана — нажмите «Исследовать» или действие гекса.`;}else if(unresolvedHex)els.moveHint.textContent=`Гекс ${p.hex} ещё не исследован. Завершить ход нельзя — сначала проведите исследование.`;else if(!state.rolled)els.moveHint.textContent='Сначала брось кубик движения. На очищенном гексе можно построить территорию до броска.';else if(state.turnMoved)els.moveHint.textContent=`Перемещение завершено на ${p.hex}. Теперь можно активировать гекс или завершить ход.`;else els.moveHint.textContent=`Постройте путь вручную: нажимайте соседние зелёные гексы по одному. Можно использовать от 1 до ${state.movePoints} единиц движения. Игра не выбирает маршрут автоматически.`;
    els.initiativeList.innerHTML='';updateActionPanel();if(!els.sheetDrawer.hidden&&['overview','inventory'].includes(sheetView.mode))renderCharacterSheet(sheetView.mode,sheetView.bonusKey);maybeShowDungeonEntryNotice();maybeShowTradeDeal();
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
    // Preserve existing hero portrait DOM nodes between map refreshes, particularly on Safari iOS.
    const retainedTokens=document.createDocumentFragment();
    els.overlay.querySelectorAll('.table-token').forEach(node=>retainedTokens.appendChild(node));
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
    els.overlay.appendChild(retainedTokens);
    const liveIds=new Set(state.players.map(p=>p.id));
    els.overlay.querySelectorAll('.table-token').forEach(node=>{if(!liveIds.has(node.getAttribute('data-token-hero')))node.remove()});
    const groups={};state.players.forEach(p=>(groups[p.hex]??=[]).push(p));const tokenPositions={};Object.entries(groups).forEach(([hex,ps])=>{const h=MAP.hexes[hex];if(!h)return;const n=ps.length;ps.forEach((p,i)=>{const a=n===1?0:Math.PI*2*i/n,rad=n===1?0:24,x=h.x+Math.cos(a)*rad,y=h.y+Math.sin(a)*rad;tokenPositions[p.id]={x,y};RPGTabletop.token(els.overlay,p,x,y,p.id===currentPlayer().id,svgEl)})});RPGTabletop.rememberTokens(tokenPositions);applyMapZoom(false)
  }

  function saveGame(){if(!state.started)return;localStorage.setItem('rpgDigitalPrototypeV0648',JSON.stringify(state));log('Партия v0.6.48 сохранена в браузере.')}
  function loadGame(){
    const raw=localStorage.getItem('rpgDigitalPrototypeV0654')||localStorage.getItem('rpgDigitalPrototypeV0653')||localStorage.getItem('rpgDigitalPrototypeV0652')||localStorage.getItem('rpgDigitalPrototypeV0651')||localStorage.getItem('rpgDigitalPrototypeV0648')||localStorage.getItem('rpgDigitalPrototypeV0647')||localStorage.getItem('rpgDigitalPrototypeV0646')||localStorage.getItem('rpgDigitalPrototypeV0645')||localStorage.getItem('rpgDigitalPrototypeV0639')||localStorage.getItem('rpgDigitalPrototypeV0638')||localStorage.getItem('rpgDigitalPrototypeV0637')||localStorage.getItem('rpgDigitalPrototypeV0636')||localStorage.getItem('rpgDigitalPrototypeV0635')||localStorage.getItem('rpgDigitalPrototypeV0634')||localStorage.getItem('rpgDigitalPrototypeV0633')||localStorage.getItem('rpgDigitalPrototypeV0632')||localStorage.getItem('rpgDigitalPrototypeV0631')||localStorage.getItem('rpgDigitalPrototypeV063')||localStorage.getItem('rpgDigitalPrototypeV062')||localStorage.getItem('rpgDigitalPrototypeV060')||localStorage.getItem('rpgDigitalPrototypeV0522')||localStorage.getItem('rpgDigitalPrototypeV0521')||localStorage.getItem('rpgDigitalPrototypeV0520')||localStorage.getItem('rpgDigitalPrototypeV0519')||localStorage.getItem('rpgDigitalPrototypeV0518')||localStorage.getItem('rpgDigitalPrototypeV0517')||localStorage.getItem('rpgDigitalPrototypeV0516')||localStorage.getItem('rpgDigitalPrototypeV0515')||localStorage.getItem('rpgDigitalPrototypeV0514')||localStorage.getItem('rpgDigitalPrototypeV0513')||localStorage.getItem('rpgDigitalPrototypeV0512')||localStorage.getItem('rpgDigitalPrototypeV0511')||localStorage.getItem('rpgDigitalPrototypeV0510')||localStorage.getItem('rpgDigitalPrototypeV059')||localStorage.getItem('rpgDigitalPrototypeV058')||localStorage.getItem('rpgDigitalPrototypeV057')||localStorage.getItem('rpgDigitalPrototypeV056')||localStorage.getItem('rpgDigitalPrototypeV055')||localStorage.getItem('rpgDigitalPrototypeV054')||localStorage.getItem('rpgDigitalPrototypeV053')||localStorage.getItem('rpgDigitalPrototypeV052')||localStorage.getItem('rpgDigitalPrototypeV051')||localStorage.getItem('rpgDigitalPrototypeV050')||localStorage.getItem('rpgDigitalPrototypeV045')||localStorage.getItem('rpgDigitalPrototypeV044')||localStorage.getItem('rpgDigitalPrototypeV043')||localStorage.getItem('rpgDigitalPrototypeV042')||localStorage.getItem('rpgDigitalPrototypeV041')||localStorage.getItem('rpgDigitalPrototypeV040')||localStorage.getItem('rpgDigitalPrototypeV033')||localStorage.getItem('rpgDigitalPrototypeV032');
    if(!raw){alert('Сохранённой партии пока нет.');return}
    try{
      state=JSON.parse(raw);if(!state.locations)state.locations={};if(!state.territories)state.territories={};if(!state.areas)state.areas=[];stripPermanentLocationCardsFromDecks(state.decks);normalizeLegendaryHeartLoot(state.decks);normalizeTavernMercenaries();
      if(state.locationUsedThisTurn==null)state.locationUsedThisTurn=false;if(state.locationActivationHex===undefined)state.locationActivationHex=null;if(state.portalPending==null)state.portalPending=null;if(state.clearedThisTurnHex===undefined)state.clearedThisTurnHex=null;if(state.foreignTerritoryPending===undefined)state.foreignTerritoryPending=null;if(state.tradeOpportunity===undefined)state.tradeOpportunity=null;if(state.tradeDeal===undefined)state.tradeDeal=null;if(state.tributeConsentPending===undefined)state.tributeConsentPending=null;if(state.dungeonEntryNotice===undefined)state.dungeonEntryNotice=null;
      if(state.dungeonEntryNotice){const dh=state.players?.find(q=>q.id===state.dungeonEntryNotice.heroId);if(!dh?.inDungeon||(dh.dungeonEnteredTurn!=null&&dh.personalTurn>dh.dungeonEnteredTurn))state.dungeonEntryNotice=null;}
      state.territoryBuiltNotice=null;if(state.movePending===undefined)state.movePending=false;if(state.moveOriginHex===undefined)state.moveOriginHex=null;if(state.moveTransit===undefined)state.moveTransit=null;if(state.pendingMoveAction===undefined)state.pendingMoveAction=null;if(state.chosenMovePlan===undefined)state.chosenMovePlan=null;if(state.inspectPlayerId===undefined)state.inspectPlayerId=null;if(state.mapHighlight===undefined)state.mapHighlight=null;if(state.mapZoom===undefined)state.mapZoom=1;if(state.gameOver===undefined)state.gameOver=false;if(state.sharedDifficulty===undefined)state.sharedDifficulty=null;if(!Array.isArray(state.journal))state.journal=[];
      if(state.tradeOpportunity){if(state.tradeOpportunity.visitorId==null&&state.tradeOpportunity.buyerId!=null)state.tradeOpportunity.visitorId=state.tradeOpportunity.buyerId;if(!state.tradeOpportunity.otherIds&&state.tradeOpportunity.sellerIds)state.tradeOpportunity.otherIds=[...state.tradeOpportunity.sellerIds]}
      const legacyHard=!!state.hardMode;state.players.forEach(p=>{if(p.hardMode==null)p.hardMode=legacyHard;if(state.sharedDifficulty)p.hardMode=state.sharedDifficulty==='hard';ensurePlayerModel(p);for(const hex of Object.keys(p.locationVisits||{}))if(state.locations[hex])p.discoveredLocations[hex]=true;if(state.locations[p.hex])p.discoveredLocations[p.hex]=true});delete state.hardMode;
      if(state.gameWon&&!state.gameOver){state.gameOver={winnerId:state.gameWon.heroId,heroName:state.gameWon.heroName,round:state.gameWon.round||state.round,personalTurn:state.gameWon.personalTurn||getPlayer(state.gameWon.heroId)?.personalTurn||null};state.turnLocked=true}
      document.body.classList.add('game-running');els.setupSection.hidden=true;els.gameSection.hidden=false;els.saveBtn.disabled=false;els.inventoryBtn.hidden=true;if(playerHardMode(currentPlayer()))state.inspectPlayerId=null;if(state.combat===undefined)state.combat=null;if(state.combat&&state.combat.journalOpen==null)state.combat.journalOpen=false;
      state.version='0.6.85';if(state.rolled&&!state.turnLocked&&!state.moveTransit&&!state.portalPending&&!state.foreignTerritoryPending){if(!Array.isArray(state.chosenPath)||!state.chosenPath.length)state.chosenPath=[state.moveOriginHex||currentPlayer().hex];if(state.movePending&&state.chosenMovePlan?.path)state.chosenPath=[...state.chosenMovePlan.path];refreshManualMoveReachable(currentPlayer())}els.sheetDrawer.hidden=true;updateUI();renderBoard();setTimeout(()=>centerMapOnPlayer(currentPlayer(),'auto'),80);log('Сохранённая партия загружена в v0.6.85.');if(state.gameOver)setTimeout(()=>showGameOverPopup(getPlayer(state.gameOver.winnerId)||currentPlayer()),0);
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
    state=cloneJson(next||freshState());if(!state.locations)state.locations={};if(!state.territories)state.territories={};if(!state.areas)state.areas=[];stripPermanentLocationCardsFromDecks(state.decks);normalizeLegendaryHeartLoot(state.decks);normalizeTavernMercenaries();
    if(state.locationUsedThisTurn==null)state.locationUsedThisTurn=false;if(state.locationActivationHex===undefined)state.locationActivationHex=null;if(state.portalPending==null)state.portalPending=null;if(state.clearedThisTurnHex===undefined)state.clearedThisTurnHex=null;if(state.foreignTerritoryPending===undefined)state.foreignTerritoryPending=null;if(state.tradeOpportunity===undefined)state.tradeOpportunity=null;if(state.tradeDeal===undefined)state.tradeDeal=null;if(state.tributeConsentPending===undefined)state.tributeConsentPending=null;if(state.dungeonEntryNotice===undefined)state.dungeonEntryNotice=null;
      if(state.dungeonEntryNotice){const dh=state.players?.find(q=>q.id===state.dungeonEntryNotice.heroId);if(!dh?.inDungeon||(dh.dungeonEnteredTurn!=null&&dh.personalTurn>dh.dungeonEnteredTurn))state.dungeonEntryNotice=null;}
      state.territoryBuiltNotice=null;if(state.movePending===undefined)state.movePending=false;if(state.moveOriginHex===undefined)state.moveOriginHex=null;if(state.moveTransit===undefined)state.moveTransit=null;if(state.pendingMoveAction===undefined)state.pendingMoveAction=null;if(state.chosenMovePlan===undefined)state.chosenMovePlan=null;if(state.inspectPlayerId===undefined)state.inspectPlayerId=null;if(state.mapHighlight===undefined)state.mapHighlight=null;if(state.mapZoom===undefined)state.mapZoom=1;if(state.gameOver===undefined)state.gameOver=false;if(state.sharedDifficulty===undefined)state.sharedDifficulty=null;if(!Array.isArray(state.journal))state.journal=[];
    if(state.tradeOpportunity){if(state.tradeOpportunity.visitorId==null&&state.tradeOpportunity.buyerId!=null)state.tradeOpportunity.visitorId=state.tradeOpportunity.buyerId;if(!state.tradeOpportunity.otherIds&&state.tradeOpportunity.sellerIds)state.tradeOpportunity.otherIds=[...state.tradeOpportunity.sellerIds]}
    const legacyHard=!!state.hardMode;(state.players||[]).forEach(p=>{if(p.hardMode==null)p.hardMode=legacyHard;if(state.sharedDifficulty)p.hardMode=state.sharedDifficulty==='hard';ensurePlayerModel(p);for(const hex of Object.keys(p.locationVisits||{}))if(state.locations[hex])p.discoveredLocations[hex]=true;if(state.locations[p.hex])p.discoveredLocations[p.hex]=true});delete state.hardMode;
    if(state.gameWon&&!state.gameOver){state.gameOver={winnerId:state.gameWon.heroId,heroName:state.gameWon.heroName,round:state.gameWon.round||state.round,personalTurn:state.gameWon.personalTurn||getPlayer(state.gameWon.heroId)?.personalTurn||null};state.turnLocked=true}
    state.version='0.6.85';if(state.combat===undefined)state.combat=null;if(state.combat&&state.combat.journalOpen==null)state.combat.journalOpen=false;
    if(state.rolled&&!state.turnLocked&&!state.moveTransit&&!state.portalPending&&!state.foreignTerritoryPending){if(!Array.isArray(state.chosenPath)||!state.chosenPath.length)state.chosenPath=[state.moveOriginHex||currentPlayer()?.hex];if(state.movePending&&state.chosenMovePlan?.path)state.chosenPath=[...state.chosenMovePlan.path];if(currentPlayer())refreshManualMoveReachable(currentPlayer())}
  }
  function applyOnlineState(next){
    const localZoom=Number(state.mapZoom||1),localInspect=state.inspectPlayerId??null,localHighlight=state.mapHighlight??null,localJournal=state.combat?.journalOpen??false,mobileSheetWasOpen=isMobileViewport()&&!els.sheetDrawer.hidden;
    normalizeIncomingState(next);state.mapZoom=localZoom;state.inspectPlayerId=localInspect;state.mapHighlight=localHighlight;if(state.combat)state.combat.journalOpen=localJournal;
    const newCombat=syncLocalCombatWindowState();document.body.classList.add('game-running');els.setupSection.hidden=true;els.gameSection.hidden=false;els.saveBtn.disabled=false;els.inventoryBtn.hidden=true;if(playerHardMode(currentPlayer()))state.inspectPlayerId=null;
    if(isMobileViewport()&&(newCombat||!mobileSheetWasOpen))els.sheetDrawer.hidden=true;if(!state.tradeDeal&&sideInteraction?.type==='trade')endSideInteraction();if(!state.tradeDeal&&!els.modal.hidden&&els.modalContent.querySelector('.player-trade-shell'))closeModal();updateUI();renderBoard();renderJournal();if(state.combat){if(!combatWindowHidden&&!(state.combat.phase==='victory'&&(els.modal.classList.contains('post-combat-prompt')||els.modal.dataset.lootDraft==='true'||!els.rollOverlay.hidden||['build','loot'].includes(state.combat.victoryUiStep))))renderCombat();else updateCombatRestoreButton();if(state.combat.phase==='victory'&&state.combat.victoryUiStep==='loot'&&!els.modal.dataset.lootDraft&&els.rollOverlay.hidden&&localControlsCombat())openVictoryLootDraft()}else if(!els.modal.hidden&&els.modalContent.querySelector('.combat-shell'))closeModal();maybeShowDungeonEntryNotice();maybeShowTradeDeal();setTimeout(()=>centerMapOnPlayer(mapFocusPlayer(),'auto'),40);
    if(state.gameOver)setTimeout(()=>showGameOverPopup(getPlayer(state.gameOver.winnerId)||currentPlayer()),0);
  }
  function startOnlineGame(heroIds,options={}){startGame(heroIds,{sharedDifficulty:options?.hardMode?'hard':'normal',hardMode:!!options?.hardMode});return exportOnlineState()}

  function resetGame(){if(!confirm('Сбросить текущую партию?'))return;dismissedGameOverKey=null;visibleGameOverKey=null;endSideInteraction();combatWindowHidden=false;combatWindowInstance=null;modalOffturnOwnerId=null;modalCloseAction=null;state=freshState();document.body.classList.remove('game-running');rollPopupQueue.length=0;rollPopupAfterClose=null;if(els.journalOverlay)els.journalOverlay.hidden=true;if(els.rollOverlay)els.rollOverlay.hidden=true;els.setupSection.hidden=false;els.gameSection.hidden=true;els.saveBtn.disabled=true;els.inventoryBtn.hidden=true;els.log.innerHTML='';journalFilterMode='mine';closeModal();closeCharacterSheet();renderBoard();renderJournal()}

  if(els.sheetHeroTab)els.sheetHeroTab.addEventListener('click',()=>{toggleCharacterSheet('overview',sheetView.playerId||currentPlayer()?.id)});
  if(els.sheetInventoryTab)els.sheetInventoryTab.addEventListener('click',()=>{toggleCharacterSheet('inventory',sheetView.playerId||currentPlayer()?.id)});
  if(els.rollPopupClose)els.rollPopupClose.addEventListener('click',()=>{els.rollOverlay.hidden=true;document.body.classList.remove('arcana-info-presenting');infoDiceToken++;const after=rollPopupAfterClose;rollPopupAfterClose=null;els.rollPopupClose.textContent='Продолжить';if(after)after();if(els.rollOverlay.hidden)showNextRollPopup();if(sideInteraction?.type==='territory'&&els.rollOverlay.hidden&&!rollPopupQueue.length)endSideInteraction()});
  if(els.journalBtn)els.journalBtn.addEventListener('click',()=>{renderJournal();els.journalOverlay.hidden=false});
  if(els.journalMine)els.journalMine.addEventListener('click',()=>{journalFilterMode='mine';renderJournal()});
  if(els.journalAll)els.journalAll.addEventListener('click',()=>{journalFilterMode='all';renderJournal()});
  if(els.journalClose)els.journalClose.addEventListener('click',()=>{els.journalOverlay.hidden=true});
  if(els.journalOverlay)els.journalOverlay.addEventListener('click',e=>{if(e.target===els.journalOverlay)els.journalOverlay.hidden=true});
  if(els.mapZoomIn)els.mapZoomIn.addEventListener('click',()=>changeMapZoom(.1));
  if(els.mapZoomOut)els.mapZoomOut.addEventListener('click',()=>changeMapZoom(-.1));
  document.getElementById('tableCenter')?.addEventListener('click',()=>centerMapOnPlayer(mapFocusPlayer()));
  document.getElementById('desktopHeroBtn')?.addEventListener('click',()=>toggleCharacterSheet('overview'));
  document.getElementById('desktopInventoryBtn')?.addEventListener('click',()=>toggleCharacterSheet('inventory'));
  if(els.mobileHeroBtn)els.mobileHeroBtn.addEventListener('click',()=>toggleCharacterSheet('overview'));
  if(els.mobileInventoryBtn)els.mobileInventoryBtn.addEventListener('click',()=>toggleCharacterSheet('inventory'));
  if(els.mobileJournalBtn)els.mobileJournalBtn.addEventListener('click',()=>{renderJournal();els.journalOverlay.hidden=false});
  let resizeTimer=null;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{applyMapZoom(false);if(state.started&&isMobileViewport()&&els.sheetDrawer.hidden)centerMapOnPlayer(mapFocusPlayer(),'auto')},120)});
  let pinchStartDist=0,pinchStartZoom=1;const touchDistance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);if(els.boardWrap){els.boardWrap.addEventListener('touchstart',e=>{if(e.touches.length===2){pinchStartDist=touchDistance(e.touches);pinchStartZoom=Number(state.mapZoom||1)}},{passive:true});els.boardWrap.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinchStartDist>0){e.preventDefault();const ratio=touchDistance(e.touches)/pinchStartDist;state.mapZoom=Math.round(clamp(pinchStartZoom*ratio,.6,2)*20)/20;applyMapZoom(false)}},{passive:false});els.boardWrap.addEventListener('touchend',e=>{if(e.touches.length<2)pinchStartDist=0},{passive:true})}
  if('serviceWorker' in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  els.startBtn.addEventListener('click',startGame);els.moveRollBtn.addEventListener('click',rollMove);els.endTurnBtn.addEventListener('click',()=>endTurn(false));els.saveBtn.addEventListener('click',saveGame);els.loadBtn.addEventListener('click',loadGame);els.resetBtn.addEventListener('click',resetGame);[['sheetSaveBtn','saveBtn'],['sheetLoadBtn','loadBtn'],['sheetResetBtn','resetBtn']].forEach(([mirror,source])=>{const btn=document.getElementById(mirror);if(btn)btn.addEventListener('click',()=>els[source].click())});els.inventoryBtn.addEventListener('click',()=>toggleCharacterSheet('overview'));els.sheetClose.addEventListener('click',closeCharacterSheet);els.modalClose.addEventListener('click',requestModalClose);
  window.__RPG_DEBUG__={getState:()=>state,setState:v=>{state=v},freshState,HEROES,CARD_BY_ID,combatStart,combatFight,combatHeroAttack,finalizeHeroAttackRoll,combatRollHeroDamage,combatDamageFormula,inventoryCardBackHtml,applyHeroDamageNow,combatEnemyTurn,finalizeEnemyAttackRoll,acceptEnemyDamage,combatContinueAfterEnemyMiss,renderCombat,currentPlayer,getPlayer,ensurePlayerModel,supportedCombatEffect,applyCombatItemEffect,useHeroCombatAbility,combatReactionList,fullSetEquipped,completeSetNames,itemColorClass,mandatoryLootCount,setBonusActionInfo,useSetBonus,showRollPopup,heroImmuneStatus,combatPassiveDamageBonus,combatHeroDeath,combatVictory,movementFor,combatCanChangeEquipment,combatTickEnemyStatuses,equipTransaction,merchantSaleMultiplier,visitShrine,visitMerchant,showMerchantShop,renderTavernVisit,visitLocation,decorateNegativeEffects,generatePermanentLocations,locationVisibleToPlayer,revealLocationToPlayer,ensureTavernMercenary,restockTavernIfVacant,visitTavern,attemptDungeonExit,beginBonusExplorationTurnAfterDungeon,gameOverStats,showGameOverPopup,renderBoard,updateUI,openCharacterSheet,closeCharacterSheet,toggleCharacterSheet,renderTurnOrderBanner};
  window.__RPG_ONLINE__={startWithHeroes:startOnlineGame,exportState:exportOnlineState,applyState:applyOnlineState,currentPlayerId:()=>currentPlayer()?.id||null,isStarted:()=>!!state.started,sideInteractionOwnerId,sideInteractionActiveFor,exportSideState:sideInteractionPayload,endSideInteraction,refreshUI:()=>{renderJournal();updateUI();renderBoard()},setLocalHeroId:id=>{onlineLocalHeroId=id||null;if(onlineLocalHeroId){sheetView.playerId=onlineLocalHeroId;if(!els.sheetDrawer.hidden)renderCharacterSheet(sheetView.mode,sheetView.bonusKey)}renderJournal();updateUI();renderBoard()},canOffturnSharedAction:id=>!!id&&(state.tributeConsentPending?.ownerId===id||state.dungeonEntryNotice?.heroId===id),canOffturnModalActionFor,combatWindowIsHidden:()=>combatWindowHidden,showCombatWindow,hideCombatWindow};
  decorateNegativeEffects(document.body);negativeEffectObserver.observe(document.body,{childList:true,subtree:true});
  renderJournal();renderBoard();
})();
