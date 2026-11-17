const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname;
const policy=require(root+'/safe-save.js');
const safe={started:true,mode:'solo',players:[{id:'warrior',pendingItems:[],inDungeon:false}],order:['warrior'],currentIndex:0};
assert.equal(policy.allowed(safe),true);
for(const field of ['rolled','movePending','moveTransit','pendingMoveAction','chosenMovePlan','combat','exploration','tradeDeal','tradeOpportunity','tributeConsentPending','dungeonEntryNotice','portalPending','foreignTerritoryPending','locationActivationHex','territoryBuiltNotice','gameOver'])assert.equal(policy.allowed({...safe,[field]:true}),false,field);
for(const field of ['network','sideInteraction','rollOpen','modalOpen','rollQueued'])assert.equal(policy.allowed(safe,{[field]:true}),false,field);
assert.equal(policy.allowed({...safe,players:[{id:'warrior',inDungeon:true}]}),false);
assert.equal(policy.allowed({...safe,players:[{id:'warrior',pendingItems:[193]}]}),false);
for(const mode of ['network',null])assert.equal(policy.allowed({...safe,mode}),false);
// Each requested safe endpoint must pass only after the turn is fully resolved.
for(const location of ['бой и поиск','темница','святилище','таверна','торговец','портал','территория','область']){
 const s=structuredClone(safe);s.lastLocation=location;assert.equal(policy.allowed(s),true);s.rolled=true;assert.equal(policy.allowed(s),false);
}
const saved=new Map();const localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
let context={window:{},localStorage};vm.runInNewContext(fs.readFileSync(root+'/party-library.js','utf8'),context);
let lib=context.window.RPGPartyLibrary;
lib.migrate({code:'111111',playerId:'p1',playerSecret:'s1',savedAt:1},{code:'111111',recoveryKey:'key1',state:{huge:'must not copy'}});
lib.put({code:'222222',playerId:'p2',playerSecret:'s2',savedAt:2});
assert.equal(lib.all().length,2);assert.equal(lib.get('111111').recoveryKey,'key1');assert.equal(lib.get('111111').recovery,undefined);
lib.put({code:'111111',playerId:'p1',expiresAt:999});assert.equal(lib.all().length,2);assert.equal(lib.get('111111').playerSecret,'s1');assert.equal(lib.get('222222').playerSecret,'s2');
context={window:{},localStorage};vm.runInNewContext(fs.readFileSync(root+'/party-library.js','utf8'),context);assert.equal(context.window.RPGPartyLibrary.all().length,2);
// Execute the real queued writer with a deferred fake store: captures data/slot now.
(async()=>{
 const source=fs.readFileSync(root+'/solo-saves.js','utf8');const writer=source.match(/function writeSlot\(slot,state\)\{[^\n]+/)[0];
 const writes=[];const queueContext={SLOTS:[1,2],queue:Promise.resolve(),JSON,Promise,write:async(slot,state)=>{writes.push({slot,state})}};
 vm.runInNewContext(writer,queueContext);
 const s=structuredClone(safe);const first=queueContext.writeSlot(1,s);s.rolled=true;const second=queueContext.writeSlot(2,structuredClone(safe));await Promise.all([first,second]);
 assert.equal(writes[0].slot,1);assert.equal(writes[0].state.rolled,undefined);assert.equal(writes[1].slot,2);
 console.log('PASS: safe-save gates, requested endpoint fixtures, durable multiple-party migration, immutable serialized slot writes.');
})().catch(e=>{console.error(e);throw e});
