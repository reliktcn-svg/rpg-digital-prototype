const assert=require('node:assert/strict');
require('../boss-rules.js');
const B=globalThis.RPGBoss;
const clueOrder=[3,0,5,1,4,2];
function game(cycle=1){return {ngPlusCycle:cycle,boss:{...B.generate(()=>.4),clueOrder:[...clueOrder],found:[],injected:[]},decks:{exploreOuter:{draw:[],discard:[]},exploreHeart:{draw:[],discard:[]}}}}
const identity=x=>x;
const s=game();
const visible=()=>s.boss.injected.length;
const count=(which)=>s.decks[which].draw.length;
assert.equal(B.inject(s,20,identity,0),0);assert.equal(visible(),0);
assert.equal(B.inject(s,21,identity,1),0);assert.equal(visible(),0);
for (let stage=1;stage<=6;stage++){
 const level=20+stage*2;
 assert.equal(B.inject(s,level,identity,stage*2),1,`NG+ stage ${stage}`);
 assert.equal(visible(),stage);assert.equal(count('exploreOuter'),stage);assert.equal(count('exploreHeart'),stage);
 assert.equal(B.inject(s,level,identity,stage*2),0,'duplicate injection');
}
assert.equal(B.inject(s,50,identity,30),0,'no seventh clue');
// Out-of-order discovery: second clue can be found before the first.
assert.ok(B.reveal(s,clueOrder[1]));
assert.equal(s.boss.found.length,1);
assert.equal(B.reveal(s,clueOrder[1]),false,'duplicate find');
assert.ok(B.reveal(s,clueOrder[0]));
assert.ok(B.reveal(s,clueOrder[3]));
assert.ok(B.reveal(s,clueOrder[2]));
assert.equal(s.boss.heartUnlocked,true,'four found clues unlock the heart');
assert.ok(!s.decks.exploreOuter.draw.includes(B.ids(clueOrder[1])[0]));
assert.ok(!s.decks.exploreHeart.draw.includes(B.ids(clueOrder[1])[1]));
// Ordinary games must preserve the old stage requirements and sequential reveal.
const ordinary=game(0);
assert.equal(B.inject(ordinary,1,identity),false);
assert.equal(B.inject(ordinary,2,identity),true);
assert.equal(B.inject(ordinary,3,identity),false);
assert.equal(B.reveal(ordinary,clueOrder[1]),false,'normal cannot skip clue');
assert.ok(B.reveal(ordinary,clueOrder[0]));
assert.equal(B.inject(ordinary,3,identity),false);
assert.equal(B.inject(ordinary,4,identity),true);
// Multi-level gain inserts more than one clue without finding previous ones.
const jump=game();assert.equal(B.inject(jump,26,identity,6),3);assert.equal(jump.boss.found.length,0);
console.log('PASS: NG+ levels 20/22/24/.../32; six clues, no duplicates, any draw order, standard game unchanged');
