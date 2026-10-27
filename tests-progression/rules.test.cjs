const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../hero-progression.js'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../hero-atlas-data.js'),'utf8'),ctx);P.load(JSON.parse(JSON.stringify(ctx.window.RPG_HERO_ATLAS)));let checks=0;function eq(a,b){assert.deepEqual(a,b);checks++}
const player=id=>({id,masteryPoints:0,learnedAbilities:[]});
for(const [xp,level,next] of [[0,1,10],[2,1,10],[9,1,10],[10,2,25],[24,2,25],[25,3,45],[45,4,70],[70,5,100],[100,6,135],[270,10,325]]){const p=player('warrior');p.masteryPoints=xp;const i=P.info(p);eq([i.level,i.next,i.points],[level,next,level-1])}
for(const id of ['warrior','dwarf','archer','rogue','mage','paladin']){
 const p=player(id),h=P.hero(id);eq(P.unlocked(p).size,2);eq(P.selected(p,'ability').level,1);eq(P.selected(p,'natural').level,1);eq(P.selected(p,'resistance',0),null);
 for(const b of h.branches)for(const n of b.nodes){eq(fs.existsSync(require('node:path').join(__dirname,'..',P.icon(p,n))),true);eq(/(?!100)\b\d+%/.test(n.description),false);const r=P.rules(n);if(b.kind==='resistance')eq(r.resistance.immune||r.resistance.success.length>0,true)}
 const own=h.branches[0].nodes;eq(P.learn(p,own[1].id).ok,false);p.masteryPoints=1000;eq(P.learn(p,own[2].id).ok,false);eq(P.learn(p,own[1].id).ok,true);eq(P.learn(p,own[1].id).ok,false);
 const poison=h.branches.find(b=>b.kind==='resistance'&&b.status===1).nodes,bleed=h.branches.find(b=>b.kind==='resistance'&&b.status===0).nodes;
 eq(P.learn(p,poison[0].id).ok,true);eq(P.learn(p,poison[1].id).ok,true);eq(P.learn(p,bleed[1].id).ok,false);eq(P.learn(p,bleed[0].id).ok,true);eq(P.selected(p,'resistance',1).level,2);eq(P.selected(p,'resistance',0).level,1);
 const nat=h.branches.find(b=>b.kind==='natural');eq(P.learn(p,nat.nodes[1].id).ok,true);eq(P.learn(p,nat.nodes[2].id).ok,false);
 const known=P.unlocked(p);for(const n of nat.nodes.filter(n=>n.level===3&&n.parent===nat.nodes[2].id))eq(P.canLearn(p,n.id).ok,false);
}
const p=player('warrior');const c={};eq(P.award(p,{fields:{'Ранг':'Слабый'}},c).amount,2);eq(P.award(p,{fields:{'Ранг':'Слабый'}},c).amount,0);eq(p.masteryPoints,2);
for(const [rank,reward] of [['Слабый',2],['Обычный',3],['Сильный',5],['Элитный',8],['Мини-босс',12]])eq(P.reward({fields:{'Ранг':rank}}),reward);
const arch=P.hero('archer').branches[0].nodes;eq(P.rules(arch[2]).dice,'D10');eq(P.rules(arch[2]).effect,'Яд');eq(P.rules(arch[2]).chance,{sides:6,success:[4,5,6]});eq(P.rules(arch[3]).chance,{sides:4,success:[3,4]});eq(P.rules(arch[4]).chance.sides,0);
const nat=P.hero('mage').branches[1].nodes;eq(P.rules(nat[2]).dice,null);eq(P.rules(nat[2]).effect,'Оглушение');eq(P.rules(nat[3]).dice,'D6');eq(P.rules(nat[6]).enemyDisadvantage,2);
console.log(`${checks} progression assertions passed`);

for(const id of ['warrior','dwarf','archer','rogue','mage','paladin']){
 const h=P.hero(id),w=P.hero('warrior');
 for(let i=1;i<6;i++)eq(h.branches[i].nodes.map(n=>P.rules(n)),w.branches[i].nodes.map(n=>P.rules(n)));
 for(const b of h.branches.filter(b=>b.kind==='resistance'))eq(P.rules(b.nodes[2]).resistance.immune,true);
 eq(h.branches[0].nodes.some(n=>/раз за бой/.test(n.description)),false);
}
eq(P.rules(P.hero('warrior').branches[0].nodes[4]).fixedReduction,12);
console.log('Shared atlas, immunity and fixed reduction checks passed');

for(const n of P.hero("paladin").branches[0].nodes)eq(P.rules(n).healingRatio,0.5);
