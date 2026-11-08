const assert=require('node:assert/strict'),{engine}=require('../tests-mercenaries/engine.cjs');
const w=engine(),D=w.__RPG_DEBUG__,B=w.RPGBoss;w.Event=class{};
assert.equal(B.variants.length,33);assert.equal(new Set(B.variants.map(v=>v.key)).size,33);
const seen=new Set();
for(let i=0;i<10000;i++){const b=B.generate(w.Math.random);seen.add(b.key);assert(b.hp>=50&&b.hp<=80);assert([16,17,18].includes(b.defense));assert([6,7,8].includes(b.attack));assert(['D10','D12','2D8'].includes(b.damage));assert(b.effectKeys.length>=1&&b.effectKeys.length<=2);assert.equal(new Set(b.effectKeys).size,b.effectKeys.length);assert.equal(b.immunities.length,0);for(const e of b.effectKeys)assert(b.types.some(t=>B.pools[t].includes(e)));assert.deepEqual([...B.view(b)],Array(6).fill('—'))}
assert.equal(seen.size,33);
D.startGame(['warrior','mage']);const s=D.getState(),p=s.players[0];p.masteryPoints=0;assert.equal(s.boss.found.length,0);assert(!D.heartAccessAllowed());
const beforeBoss=JSON.stringify(B.values(s.boss));
for(let i=0;i<6;i++){
 p.masteryPoints=w.RPGProgression.threshold(B.clues[i][1]-1);D.syncBossClues();assert(!s.boss.injected.includes(i));
 p.masteryPoints=w.RPGProgression.threshold(B.clues[i][1]);D.syncBossClues();D.syncBossClues();
 assert(s.boss.injected.includes(i));assert.equal(s.decks.exploreOuter.draw.filter(id=>id===B.ids(i)[0]).length,1);assert.equal(s.decks.exploreHeart.draw.filter(id=>id===B.ids(i)[1]).length,1);
 assert(!B.reveal(s,i+1));assert(B.reveal(s,i));assert(!B.reveal(s,i));
 for(const d of Object.values(s.decks))for(const part of ['draw','discard'])assert(!d[part].some(id=>B.ids(i).includes(id)));
 assert.equal(D.heartAccessAllowed(),i>=3);assert.equal(B.view(s.boss).filter(v=>v!=='—').length,i+1);
}
assert.equal(JSON.stringify(B.values(s.boss)),beforeBoss);
// Persisted boss and clue decks survive network/save normalization unchanged.
const saved=JSON.parse(JSON.stringify(s));D.normalizeIncomingState(saved);assert.equal(JSON.stringify(D.getState().boss),JSON.stringify(saved.boss));assert.equal(JSON.stringify(D.getState().decks),JSON.stringify(saved.decks));
const current=D.currentPlayer();current.masteryPoints=w.RPGProgression.threshold(30);D.combatStart(D.CARD_BY_ID[281]);const c=D.getState().combat;assert.equal(c.enemyMaxHp,saved.boss.hp);assert.equal(+c.enemyFields['ЗЩ'],saved.boss.defense);assert.equal(c.enemyFields['Урон'],saved.boss.damage);assert.equal(c.enemyLevel,null);assert.equal(D.enemyImmunities().length,0);for(const effect of ['Яд','Кровотечение','Оглушение','Горение'])assert(D.combatApplyEnemyStatus(effect));
// Gating normal paths and manual movement. Exiting is always allowed.
D.startGame(['warrior']);const st=D.getState(),hero=D.currentPlayer(),map=w.MAP_DATA;
const edge=Object.keys(map.hexes).find(h=>map.hexes[h].region==='cursed'&&map.hexes[h].neighbors.some(n=>map.hexes[n].region==='heart_of_darkness'));
const heart=map.hexes[edge].neighbors.find(n=>map.hexes[n].region==='heart_of_darkness');hero.hex=edge;st.movePoints=6;assert(!D.manualMoveStepOptions(hero,{hex:edge,cost:0,stopped:false,jumpUsed:false})[heart]);assert(!D.movementPlans(edge,6,hero)[heart]);
st.boss.found=[0,1,2,3];assert(D.manualMoveStepOptions(hero,{hex:edge,cost:0,stopped:false,jumpUsed:false})[heart]);
// No expiry for missed clues even at a much higher level; low-level teammate may discover.
D.startGame(['warrior','mage']);const high=D.getState();high.players[1].masteryPoints=w.RPGProgression.threshold(25);D.syncBossClues();assert.deepEqual([...high.boss.injected],[0]);assert(B.reveal(high,0));D.syncBossClues();assert.deepEqual([...high.boss.injected],[0,1]);
// Legacy retains fixed boss, no retroactive gate.
const legacy=JSON.parse(JSON.stringify(high));delete legacy.boss;D.setState(legacy);D.ensureBossState();assert(D.getState().boss.legacy);assert(D.heartAccessAllowed());assert.equal(D.getState().boss.hp,40);
console.log('PASS: 10,000 generated bosses / 33 types, ranges/pools, all clue thresholds, duplicate removal, persistence, fixed combat stats, immunities, movement gate, shared max level, legacy migration');
