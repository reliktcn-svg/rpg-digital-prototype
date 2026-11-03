const assert=require('node:assert/strict'),{engine}=require('../tests-mercenaries/engine.cjs');
const w=engine(),D=w.__RPG_DEBUG__,P=w.RPGProgression;
w.Event=class{};D.setState(D.freshState());D.startGame(['warrior','dwarf']);const s=D.getState(),p=D.currentPlayer();
for(const id of ['paladin','rogue','archer']){
 const nodes=P.hero(id).branches.find(b=>b.kind==='ability').nodes;
 assert.equal(nodes.length,5);
 nodes.forEach((n,i)=>{const r=P.rules(n);assert.equal(r.dice,['D6','D8','D10','D12','D12'][i]);assert.equal(r.multiplier,1);
 if(id==='paladin')assert.equal(r.healingRatio,i===4?1:.5);
 else{assert.equal(r.effect,id==='rogue'?'Кровотечение':'Яд');assert.equal(r.chance.sides,i<2?6:i<4?4:0);assert.deepEqual([...r.chance.success],i<2?[5,6]:i<4?[3,4]:[])}});
}
p.gold=1000;s.locations={};
const hex=Object.keys(w.MAP_DATA.hexes).find(h=>{s.cleaned[h]=true;return D.canBuildAt(p,h).ok});
p.hex=hex;s.rolled=false;s.turnMoved=false;
const before=s.currentIndex;assert(D.buildTerritory(p.id));assert.equal(s.currentIndex,before);assert.equal(s.rolled,false);assert.equal(s.territories[hex].owner,p.id);
delete s.territories[hex];D.rollMove();assert(!D.canPurchaseTerritory(p).ok,'cannot buy origin after roll');
// Return only on a later personal turn.
p.personalTurn++;s.rolled=false;s.turnMoved=false;assert(D.canPurchaseTerritory(p).ok);
const other=s.players.find(x=>x.id!==p.id);s.currentIndex=s.order.indexOf(other.id);
s.combat={heroId:other.id,phase:'hero_turn'};const c=s.combat,index=s.currentIndex;
assert(D.buildTerritory(p.id));assert.equal(s.currentIndex,index);assert.equal(s.combat,c);assert.equal(s.territories[hex].owner,p.id);
// Enemy speed uses the combat hero, not the observer or current settings owner.
w.RPGDiceSettings={get:id=>({speed:id==='paladin'?4:1})};
assert.equal(D.enemyDicePreferences({fields:{'Ранг':'слабый'}},{heroId:'paladin'}).speed,4);
assert.equal(D.enemyDicePreferences({fields:{'Ранг':'слабый'}},{heroId:'warrior'}).speed,1);
console.log('PASS: 15 ability ranks; purchase before movement; origin blocked; later turn; off-turn during other combat; actor dice speed');
for(const id of ['rogue','archer','paladin'])for(let level=1;level<=5;level++){
 const w=engine(),D=w.__RPG_DEBUG__,P=w.RPGProgression;D.setState(D.freshState());D.startGame([id]);const p=D.currentPlayer();
 p.learnedAbilities=P.hero(id).branches[0].nodes.slice(0,level).map(n=>n.id);p.maxHp=100;p.currentHp=10;
 D.combatStart(D.CARD_BY_ID[1]);const c=D.getState().combat;c.enemyHp=c.enemyMaxHp=100;
 c.phase=id==='paladin'?'post_damage':'hero_turn';c.paladinCounterOpportunity=true;c.lastAcceptedDamage=2;
 w.Math.random=()=>.99;D.useHeroCombatAbility();assert.equal(c.phase,'ability_attack');D.resolveHeroAbilityAttack();
 const damage=[6,8,10,12,12][level-1];assert.equal(c.enemyHp,100);
 if(id==='paladin'){D.resolvePaladinCounter();assert.equal(p.currentHp,10+(level===5?damage:Math.floor(damage/2)));assert.equal(c.phase,'hero_turn')}
 else{D.resolveHeroAbilityDamage();if(level<5){assert.equal(c.phase,'effect_check');assert.equal(c.lastRoll.dice[0].sides,level<3?6:4);D.resolveHeroEffectCheck()}assert.equal(c.phase,'hero_turn');assert.equal(c[id==='rogue'?'enemyBleed':'enemyPoison'],id==='rogue'?2:6)}
 assert.equal(c.enemyHp,100-damage);
}
console.log('PASS: all 15 combat abilities, damage deferred until confirmation, effect dice and healing, normal attack remains');
{
 const w=engine(),D=w.__RPG_DEBUG__;w.Event=class{};D.setState(D.freshState());D.startGame(['warrior','dwarf']);const s=D.getState(),p=D.currentPlayer();p.gold=100;s.locations={};
 p.hex=Object.keys(w.MAP_DATA.hexes).find(h=>{s.cleaned[h]=true;return D.canBuildAt(p,h).ok});s.rolled=true;s.turnMoved=true;
 const before=p.id;assert(D.buildTerritory());assert.notEqual(D.currentPlayer().id,before,'purchase after movement must finish turn');
}
for(const damage of [0,1,2,3,5,12]){
 const w=engine(),D=w.__RPG_DEBUG__;D.setState(D.freshState());D.startGame(['paladin']);const p=D.currentPlayer();p.maxHp=100;p.currentHp=5;D.combatStart(D.CARD_BY_ID[1]);
 const c=D.getState().combat;c.enemyHp=100;c.pendingResolvedDamage={kind:'paladin',hit:{healingRatio:.5,label:'test'},amount:damage,reduction:0};
 D.commitEnemyDamage();assert.equal(p.currentHp,5+Math.floor(damage/2),'paladin heal '+damage);
}
console.log('PASS: post-movement purchase ends turn; healing rounds down including one damage');
