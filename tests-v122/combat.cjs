const assert=require('node:assert/strict'),{engine}=require('../tests-mercenaries/engine.cjs');
const w=engine(),D=w.__RPG_DEBUG__,B=w.RPGBoss;w.Event=class{};
const statuses={bleed:'Кровотечение',poison:'Яд',burn:'Горение',stun:'Оглушение',curse:'Проклятие',fear:'Страх',weak:'Слабость',fatigue:'Усталость'};
for(const [key,status] of Object.entries(statuses))for(let die=1;die<=20;die++){
 D.startGame(['warrior']);const s=D.getState(),p=D.currentPlayer();s.boss.effectKeys=[key];s.boss.effectText=B.effects[key].text;D.combatStart(D.CARD_BY_ID[281]);const c=s.combat;c.enemyAttackRoll={chosen:die,natural:die===20?20:die===1?1:null};c.enemyHitCount=1;D.combatEnemyHitDamage(die);
 assert.equal(p.statuses.includes(status),key==='stun'?die===20:die>=19,key+' die='+die);
}
for(const hit of [1,2,3,4,5,6]){
 D.startGame(['warrior']);const s=D.getState();s.boss.damage='D10';s.boss.effectKeys=['dark'];s.boss.effectText=B.effects.dark.text;D.combatStart(D.CARD_BY_ID[281]);const c=s.combat;c.enemyHitCount=hit;c.enemyAttackRoll={chosen:12,natural:null};w.Math.random=()=>0;D.combatEnemyHitDamage(12);assert.equal(c.pendingEnemyDamage.amount,hit%3===0?2:1,'dark hit '+hit);
}
D.startGame(['warrior']);const s=D.getState(),p=D.currentPlayer();s.boss.effectKeys=['burn','curse'];s.boss.effectText=B.effects.burn.text+' '+B.effects.curse.text;D.combatStart(D.CARD_BY_ID[281]);s.combat.enemyAttackRoll={chosen:20,natural:20};s.combat.enemyHitCount=3;w.Math.random=()=>0;D.combatEnemyHitDamage(20);assert(p.statuses.includes('Горение'));assert(p.statuses.includes('Проклятие'));assert(!s.combat.pendingEnemyDamage.detail.some(x=>x.includes('Тёмный удар')));
console.log('PASS: 160 boss status thresholds; every-third-hit D4 only when selected; simultaneous effects; no inherited fixed-boss bonus');
