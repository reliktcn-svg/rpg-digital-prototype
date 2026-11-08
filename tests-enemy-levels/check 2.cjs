const assert=require('node:assert/strict');
const {engine}=require('../tests-mercenaries/engine.cjs');
const w=engine(),D=w.__RPG_DEBUG__;
D.setState(D.freshState());D.startGame(['warrior']);
const p=D.currentPlayer(),s=D.getState();
const enemies=Object.values(D.CARD_BY_ID).filter(c=>c.fields?.['ЗД']&&c.fields?.['АТК']&&c.fields?.['Урон']);
assert(enemies.length>50);
let checks=0;
for(const e of enemies){
 const original=JSON.stringify(e);
 const parts=e.fields['Урон'].match(/^(\d*D\d+)([+-]\d+)?$/);
 assert(parts&&D.ENEMY_DAMAGE_STEPS.includes(parts[1]),e.name+' unknown damage '+e.fields['Урон']);
 for(const level of [1,2,4,5,9,10,14,15,16,20,30,45,210]){
  p.masteryPoints=25*(level-1)*(level+8);p.progressionVersion=2;
  D.combatStart(e);
  const c=s.combat,scaled=D.combatEnemy();
  assert.equal(c.enemyLevel,level);
  assert.equal(c.enemyHp,Number(e.fields['ЗД'])+level-1);
  assert.equal(c.enemyMaxHp,c.enemyHp);
  assert.equal(Number(scaled.fields['ЗЩ']),Number(e.fields['ЗЩ'])+Math.floor(level/5));
  assert.equal(Number(scaled.fields['АТК']),Number(e.fields['АТК'])+Math.floor(level/10));
  const idx=D.ENEMY_DAMAGE_STEPS.indexOf(parts[1]);
  assert.equal(scaled.fields['Урон'],D.ENEMY_DAMAGE_STEPS[Math.min(13,idx+Math.floor(level/15))]+(parts[2]||''));
  assert.equal(scaled.fields['Эффект'],e.fields['Эффект']);
  assert.equal(JSON.stringify(e),original);
  const snapshot=JSON.parse(JSON.stringify(s));
  p.masteryPoints=0;
  assert.equal(D.combatEnemy().fields['ЗД'],c.enemyMaxHp);
  D.setState(snapshot);
  assert.equal(D.combatEnemy().fields['Урон'],scaled.fields['Урон']);
  D.setState(s);
  checks++;
 }
}
const example=D.scaledEnemy({fields:{'ЗД':5,'ЗЩ':12,'АТК':'+3','Урон':'D10'}},16);
assert.equal(example.fields['ЗД'],20);assert.equal(example.fields['ЗЩ'],15);assert.equal(example.fields['АТК'],'+4');assert.equal(example.fields['Урон'],'D12');
// Legacy combat retains its original card.
delete s.combat.enemyFields;assert.equal(D.combatEnemy().fields['ЗД'],D.CARD_BY_ID[s.combat.cardId].fields['ЗД']);
console.log('PASS',enemies.length,'enemies;',checks,'level/combat/save checks; user level-16 example; legacy saves');
for(const level of [1,15,30,60,210]){
 p.masteryPoints=25*(level-1)*(level+8);p.statuses=[];p.statusTimers={};
 D.combatStart(D.CARD_BY_ID[1]);const c=s.combat,e=D.combatEnemy();
 c.phase='hero_turn';D.combatHeroAttack();assert.equal(c.attackRoll.target,Number(e.fields['ЗЩ']));
 assert.equal(D.combatEnemyAttackModifier(p),Number(e.fields['АТК']));
 D.combatEnemyHitDamage(null,true);
 const match=e.fields['Урон'].match(/^(\d*)D(\d+)$/),n=Number(match[1]||1),faces=Number(match[2]);
 assert(c.pendingEnemyDamage.amount>=n&&c.pendingEnemyDamage.amount<=n*faces);
}
console.log('PASS: actual hero attack target, enemy attack bonus and rolled damage across five levels');
