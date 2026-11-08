const assert=require('node:assert/strict'),{engine}=require('../tests-mercenaries/engine.cjs');
function fresh(id='warrior'){const w=engine();w.Event=class{};const D=w.__RPG_DEBUG__;D.setState(D.freshState());D.startGame([id]);return {w,D,p:D.currentPlayer(),s:D.getState()}}
const {w,D,p,s}=fresh(),cards=D.CARD_BY_ID;
const triggers={1:[18,'Кровотечение'],14:[19,'Кровотечение'],20:[20,'Кровотечение'],34:[19,'Кровотечение'],36:[20,'Кровотечение'],38:[19,'Кровотечение'],42:[20,'Кровотечение'],48:[19,'Кровотечение'],51:[19,'Кровотечение'],4:[18,'Яд'],15:[18,'Яд'],18:[20,'Яд'],22:[20,'Яд'],35:[19,'Яд'],39:[19,'Яд'],40:[18,'Яд'],53:[19,'Яд'],12:[20,'Оглушение'],16:[20,'Оглушение'],24:[20,'Оглушение'],26:[20,'Оглушение'],41:[20,'Оглушение'],47:[20,'Оглушение'],52:[20,'Оглушение'],3:[20,'Горение'],8:[20,'Горение'],28:[20,'Горение'],30:[19,'Горение'],33:[19,'Горение'],50:[19,'Горение'],54:[20,'Горение']};
let count=0;
for(const [id,[min,status]] of Object.entries(triggers))for(let die=1;die<=20;die++){
 p.statuses=[];p.statusTimers={};D.combatStart(cards[id]);D.combatApplyEnemyTriggeredStatus(die,die===20?20:null,cards[id].fields['Эффект'],p);
 assert.equal(p.statuses.includes(status),die>=min,'trigger '+id+' '+die+' '+status);count++;
}
for(const [id,expected] of [[8,['Усталость','Горение']],[18,['Усталость','Яд']],[35,['Слабость','Яд']],[54,['Проклятие','Горение']]]){
 p.statuses=[];D.combatStart(cards[id]);D.combatApplyEnemyTriggeredStatus(20,20,cards[id].fields['Эффект'],p);expected.forEach(x=>assert(p.statuses.includes(x),id+' missing '+x));
}
p.statuses=['Проклятие'];D.combatStart(cards[54]);D.combatApplyEnemyTriggeredStatus(20,20,cards[54].fields['Эффект'],p,true);assert(p.statuses.includes('Горение'));
assert(!cards[33].fields['Эффект'].includes('Кровотечение'));assert(!cards[45].fields['Эффект'].includes('Яд'));
for(const card of Object.values(cards).filter(c=>c.category==='Враг'&&c.id!==281)){
 assert('Иммунитет' in card.fields);D.combatStart(card);const c=s.combat;
 for(const effect of ['Яд','Кровотечение','Оглушение','Горение']){
  const immune=D.enemyImmunities().includes(effect);assert.equal(D.combatApplyEnemyStatus(effect),!immune);
 }
 c.enemyHp=100;c.pendingResolvedDamage={kind:'ability',hit:{rule:{},returnPhase:'hero_turn'},amount:5,reduction:0};D.commitEnemyDamage();assert.equal(c.enemyHp,95,'immunity cancelled damage');
}
assert.deepEqual([...D.enemyImmunities(cards[39])],['Яд','Кровотечение']);assert.deepEqual([...D.enemyImmunities(cards[53])],['Кровотечение']);assert(D.enemyImmunities(cards[28]).includes('Горение'));
// Attempt is spent on failure, survives JSON, and only shrine resets it.
for(const id of [168,245]){
 const {w,D,p,s}=fresh();D.setSlotId(p,'ring0',id);w.Math.random=()=>0;
 assert(D.addStatus(p,'Яд'));assert(p.itemUsage[id]);const saved=JSON.parse(JSON.stringify(p.itemUsage));p.itemUsage=saved;
 D.resetItemUsage(p,'location');assert(p.itemUsage[id]);D.resetItemUsage(p,'shrine');assert(!p.itemUsage[id]);
 w.Math.random=()=>.99;p.statuses=[];assert.equal(D.addStatus(p,'Яд'),false);assert(p.itemUsage[id]);assert(D.addStatus(p,'Кровотечение'),'second effect should not get a second ring check');
}
{
 const {w,D,p}=fresh();D.setSlotId(p,'amulet',248);p.statuses=['Яд','Слабость'];w.Math.random=()=>0;
 D.useCleansingAmulet(p,{where:'equipment',slot:'amulet'},'Слабость');assert(p.itemUsage[248]);assert(p.statuses.includes('Слабость'));
 D.resetItemUsage(p,'shrine');w.Math.random=()=>.99;D.useCleansingAmulet(p,{where:'equipment',slot:'amulet'},'Слабость');assert.deepEqual([...p.statuses],['Яд']);assert(p.itemUsage[248]);
}
{
 const {w,D,p,s}=fresh();D.setSlotId(p,'armor',159);D.combatStart(D.CARD_BY_ID[1]);s.combat.phase='enemy_damage';s.combat.pendingEnemyDamage={amount:10};w.Math.random=()=>.99;
 D.applyCombatItemEffect(p,159,{where:'equipment',slot:'armor'});assert.equal(s.combat.pendingEnemyDamage.amount,6);assert(s.combat.lastRoll.title.includes('D4'));
}
for(let i=0;i<20;i++){const decks=D.initialDecks();assert(!decks.lootOuter.draw.includes(444));assert(decks.lootHeart.draw.includes(444));assert(decks.lootHeart.draw.includes(193));
 for(const key of ['lootOuter','lootHeart'])assert.equal(decks[key].draw.filter(id=>cards[id]?.potionRules?.kind==='respec').length,2);
 assert.equal([...decks.lootOuter.draw,...decks.lootHeart.draw].filter(id=>id>=453).length,36);
}
console.log('PASS',count,'trigger cases; combined effects; all enemy immunities; ring/amulet attempts/reset; D4 mantle; 20 deck shuffles');
