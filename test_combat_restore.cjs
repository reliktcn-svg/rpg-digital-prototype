const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/app.js','utf8');
const start=source.indexOf('function showCombatWindow(){'),end=source.indexOf('function canOffturnModalActionFor',start);
const restore=source.slice(start,end);
for(const controlled of [true,false])for(const phase of ['hero_damage_ready','hero_turn','enemy_roll']){
 const state={combat:{instanceId:'battle-1',phase,lastRoll:{seq:3,dice:[10]}}},before=JSON.stringify(state),controls=[];
 const ctx={state,combatWindowHidden:true,els:{modal:{hidden:false},modalContent:{querySelector:()=>({stale:true})}},window:{RPGUIMotion:{afterCombat(){}}},localControlsCombat:()=>controlled,parkModalForObservedCombat(){},updateCombatRestoreButton(){},renderCombat(){controls.push(state.combat.phase)}};
 vm.runInNewContext(restore+';showCombatWindow()',ctx);
 assert.deepEqual(controls,[phase],'restore must refresh stale buttons for '+phase);
 assert.equal(ctx.combatWindowHidden,false);assert.equal(JSON.stringify(state),before,'restoring must not reroll or mutate combat');
}
const cleanupStart=source.indexOf('const liveIds=new Set(state.players'),cleanupEnd=source.indexOf('const groups={}',cleanupStart);
for(const excluded of [false,true]){
 const removed=[],nodes=['warrior','mage','dwarf'].map(id=>({getAttribute:()=>id,remove:()=>removed.push(id)}));
 vm.runInNewContext(source.slice(cleanupStart,cleanupEnd),{state:{players:[{id:'warrior'},{id:'mage'},{id:'dwarf'}],excludedHeroes:excluded?{warrior:{until:Date.now()+1200000}}:{}},els:{overlay:{querySelectorAll:()=>nodes}}});
 assert.deepEqual(removed,excluded?['warrior']:[],'retained excluded token must disappear while belongings remain');
}
console.log('PASS: restored combat controls reflect current phase without rerolls; retained excluded tokens removed.');
