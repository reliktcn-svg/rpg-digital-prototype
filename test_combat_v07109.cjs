const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/app.js','utf8');
function fn(name){const start=source.indexOf('  function '+name+'(');assert(start>=0,name);const end=source.indexOf('\n  function ',start+5);return source.slice(start,end)}
const c={phase:'hero_turn',round:4,buffs:[],used:{}},p={id:'mage'};
const ctx={state:{combat:c},itemCard:id=>({id,name:'Сержант'}),combatMarkUsed:key=>c.used[key]=true,combatSetRoll(){},combatPush(){},els:{sheetDrawer:{hidden:true}},renderCombat(){},updateUI(){}};
vm.runInNewContext(fn('applyNewMercenaryEffect')+fn('combatExpireRoundBuffs')+fn('combatTickBuffsAtHeroAttack')+fn('combatPotionBuff'),ctx);
ctx.applyNewMercenaryEffect(p,377,{where:'equipment',slot:'mercenary'});
assert(c.used['item:377']);assert.equal(ctx.combatPotionBuff('attack'),3);assert.equal(c.buffs[0].remaining,2);
c.buffs.push({type:'attack',amount:2,remaining:1});ctx.combatTickBuffsAtHeroAttack();
assert.equal(ctx.combatPotionBuff('attack'),3,'the Sergeant is not consumed by a single attack');
c.round=5;ctx.combatExpireRoundBuffs(c);assert.equal(c.buffs[0].remaining,1);assert.equal(ctx.combatPotionBuff('attack'),3);
ctx.state.combat=JSON.parse(JSON.stringify(c));ctx.state.combat.round=6;ctx.combatExpireRoundBuffs(ctx.state.combat);assert.equal(ctx.combatPotionBuff('attack'),0,'third hero turn has no bonus, including after a reload');
console.log('PASS: Sergeant +3 on activation and next hero turn; ordinary attack buffs unchanged; round expiry survives JSON restore.');

let pending=null,events=[],local=true,choices=[];
const auto={state:{combat:{instanceId:'test',phase:'hero_damage_ready',round:1}},combatAutoTimer:null,combatAutoKey:'',rollPopupQueue:[],els:{rollOverlay:{hidden:true}},window:{},combatWindowHidden:false,arcanaCompletedKey:'',ARCANA_RESULT_HOLD:1,
 localControlsCombat:()=>local,combatDecisionOptions:()=>choices,currentPlayer:()=>p,itemCard:()=>null,supportedCombatEffect:()=>({enabled:false}),combatClassAbilityAvailable:()=>false,
 setTimeout(fn,ms){pending={fn,ms};return 1},clearTimeout(){pending=null},
 combatRollHeroDamage(){events.push('roll');auto.state.combat.phase='hero_damage'},applyHeroDamageNow(){events.push('apply')},finalizeHeroAttackRoll(){events.push('finalize')},combatEnemyTurn(){events.push('enemy')},finalizeEnemyAttackRoll(){},combatContinueAfterEnemyMiss(){},combatAcceptDamageAndContinue(){},combatContinueAfterDamage(){},resolvePaladinCounter(){},resolveHeroAbilityAttack(){},resolveHeroAbilityDamage(){},resolveHeroEffectCheck(){},commitEnemyDamage(){},resolveSecondaryDamage(){},finishCombatStun(){}};
vm.runInNewContext(fn('cancelCombatAuto')+fn('scheduleCombatAuto'),auto);
auto.scheduleCombatAuto();assert(pending);assert.equal(pending.ms,0);const first=pending.fn;pending=null;first();assert.deepEqual(events,['roll']);first();assert.deepEqual(events,['roll'],'stale timer cannot roll twice');
choices=[{card:{id:383},label:'Наёмник'}];auto.cancelCombatAuto();auto.scheduleCombatAuto();assert.equal(pending,null,'damage reaction must wait for the player');
choices=[];auto.scheduleCombatAuto();assert(pending);const apply=pending.fn;pending=null;apply();assert.deepEqual(events,['roll','apply']);
auto.state.combat.phase='hero_roll';choices=[{card:{id:153}}];auto.cancelCombatAuto();auto.scheduleCombatAuto();assert.equal(pending,null,'reroll remains before the damage stage');
auto.state.combat.phase='hero_damage_ready';choices=[];local=false;auto.scheduleCombatAuto();assert.equal(pending,null,'observers never roll');
local=true;auto.els.rollOverlay.hidden=false;auto.scheduleCombatAuto();assert.equal(pending,null,'no new damage while another roll is open');
console.log('PASS: automatic damage roll, no duplicate stale roll, damage/reroll decisions pause, observers and open dice windows gated.');

const decline={state:{combat:{phase:'hero_damage',used:{}}},localControlsCombat:()=>true,applyHeroDamageNow(){this.state.combat.phase='enemy_ready'}};
// The decline action only advances the current step; it never marks the item used.
decline.applyHeroDamageNow=()=>decline.state.combat.phase='enemy_ready';
vm.runInNewContext(fn('skipCombatChoice'),decline);decline.skipCombatChoice();assert.equal(decline.state.combat.phase,'enemy_ready');assert.deepEqual(decline.state.combat.used,{});
console.log('PASS: declining a reaction advances combat without consuming the mercenary.');

for(const file of ['app.js','item-windows.js','cards-data.js'])new vm.Script(fs.readFileSync(__dirname+'/'+file,'utf8'),{filename:file});
