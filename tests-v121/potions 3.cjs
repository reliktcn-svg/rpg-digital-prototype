const assert=require('node:assert/strict'),{engine}=require('../tests-mercenaries/engine.cjs');
(async()=>{
for(const id of [453,457,459,460,464,466,...Array.from({length:18},(_,i)=>467+i)]){
 const w=engine(),D=w.__RPG_DEBUG__;w.Event=class{};D.setState(D.freshState());D.startGame(['warrior']);const p=D.currentPlayer(),card=D.CARD_BY_ID[id],rule=card.potionRules;
 D.setSlotId(p,'potion0',id);D.combatStart(D.CARD_BY_ID[1]);const c=D.getState().combat;c.phase='hero_turn';c.enemyHp=1000;
 await D.useNewPotion(p,id,{where:'equipment',slot:'potion0'});assert.equal(p.equipment.potions[0],null);const buff=c.buffs[0];assert.equal(buff.remaining,rule.turns);
 if(rule.kind==='luck'){assert.equal(D.combatHeroMode(),'advantage');for(let i=0;i<rule.turns;i++)D.combatTickBuffsAtHeroAttack();assert.equal(D.combatHeroMode(),'normal')}
 if(rule.kind==='stealth'){assert.equal(D.combatEnemyMode(),'disadvantage');for(let i=0;i<rule.turns;i++)D.consumeEnemyMode();assert.equal(D.combatEnemyMode(),'normal')}
 if(rule.kind==='damage'){
  w.Math.random=()=>.5;D.combatHeroAttack();c.attackRoll.natural=null;c.phase='hero_damage_ready';D.combatRollHeroDamage();
  assert(c.pendingHeroDamage.amount>=rule.amount+1);const boosted=c.pendingHeroDamage.amount;
  c.buffs=[];c.phase='hero_damage_ready';w.Math.random=()=>.5;D.combatRollHeroDamage();assert.equal(boosted-c.pendingHeroDamage.amount,rule.amount);
 }
}
const w=engine(),D=w.__RPG_DEBUG__;w.Event=class{};D.setState(D.freshState());D.startGame(['warrior']);const p=D.currentPlayer(),P=w.RPGProgression;
p.masteryPoints=6000;p.progressionVersion=2;p.learnedAbilities=P.hero('warrior').branches[0].nodes.slice(0,3).map(n=>n.id);p.backpack=[485];
const before=P.info(p);await D.useNewPotion(p,485,{where:'backpack',index:0});const after=P.info(p);
assert.equal(after.level,before.level);assert.equal(after.xp,before.xp);assert(after.points>before.points);assert.equal(p.learnedAbilities.length,0);assert(!p.backpack.includes(485));assert(D.getState().decks.lootOuter.discard.includes(485));
assert(P.selected(p,'ability'));assert(P.selected(p,'natural'));
console.log('PASS: 24 potion variants and durations; damage deltas; respec refunds points, keeps XP and initial abilities, consumes potion');
})();
