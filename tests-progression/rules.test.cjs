const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../hero-progression.js'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../hero-atlas-data.js'),'utf8'),ctx);P.load(JSON.parse(JSON.stringify(ctx.window.RPG_HERO_ATLAS)));let checks=0;function eq(a,b){assert.deepEqual(a,b);checks++}
const player=id=>({id,masteryPoints:0,learnedAbilities:[],progressionVersion:2});
for(const [xp,level,next] of [[0,1,250],[100,1,250],[249,1,250],[250,2,550],[549,2,550],[550,3,900],[900,4,1300],[1750,6,2250],[5800,12,6300],[6300,13,7150],[6600,13,7150]]){const p=player('warrior');p.masteryPoints=xp;const i=P.info(p);eq([i.level,i.next,i.points],[level,next,level-1])}
for(const id of ['warrior','dwarf','archer','rogue','mage','paladin']){
 const p=player(id),h=P.hero(id);eq(P.unlocked(p).size,2);eq(P.selected(p,'ability').level,1);eq(P.selected(p,'natural').level,1);eq(P.selected(p,'resistance',0),null);
 for(const b of h.branches)for(const n of b.nodes){eq(fs.existsSync(require('node:path').join(__dirname,'..',P.icon(p,n))),true);eq(/(?!100)\b\d+%/.test(n.description),false);const r=P.rules(n);if(b.kind==='resistance')eq(r.resistance.immune||r.resistance.success.length>0,true)}
 const own=h.branches[0].nodes;eq(P.learn(p,own[1].id).ok,false);p.masteryPoints=100000;eq(P.learn(p,own[2].id).ok,false);eq(P.learn(p,own[1].id).ok,true);eq(P.learn(p,own[1].id).ok,false);
 const poison=h.branches.find(b=>b.kind==='resistance'&&b.status===1).nodes,bleed=h.branches.find(b=>b.kind==='resistance'&&b.status===0).nodes;
 eq(P.learn(p,poison[0].id).ok,true);eq(P.learn(p,poison[1].id).ok,true);eq(P.learn(p,bleed[1].id).ok,false);eq(P.learn(p,bleed[0].id).ok,true);eq(P.selected(p,'resistance',1).level,2);eq(P.selected(p,'resistance',0).level,1);
 const nat=h.branches.find(b=>b.kind==='natural');eq(P.learn(p,nat.nodes[1].id).ok,true);eq(P.learn(p,nat.nodes[2].id).ok,false);
 const known=P.unlocked(p);for(const n of nat.nodes.filter(n=>n.level===3&&n.parent===nat.nodes[2].id))eq(P.canLearn(p,n.id).ok,false);
}
const p=player('warrior');const c={};eq(P.award(p,{fields:{'Ранг':'Слабый'}},c).amount,100);eq(P.award(p,{fields:{'Ранг':'Слабый'}},c).amount,0);eq(p.masteryPoints,100);
for(const [rank,reward] of [['Слабый',100],['Обычный',150],['Сильный',250],['Элитный',400],['Мини-босс',600]])eq(P.reward({fields:{'Ранг':rank}}),reward);
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

for(const id of ['warrior','dwarf','archer','rogue','mage','paladin']){
 const p=player(id);p.masteryPoints=6300;const h=P.hero(id);
 for(const [kind,levels] of [['ability',[0,1,2,2,3]],['natural',[0,1,2,2,3]],['resistance',[1,1,2]]])for(const n of h.branches.filter(b=>b.kind===kind).flatMap(b=>b.nodes))eq(P.cost(n),levels[n.level-1]);
 const main=h.branches[0],nat=h.branches[1],res=h.branches[2];
 for(const n of [...main.nodes.slice(1,4),nat.nodes[1],nat.nodes.find(n=>n.level===3&&n.parent===nat.nodes[1].id),...res.nodes])eq(P.learn(p,n.id).ok,true);
 eq([P.info(p).spent,P.info(p).points],[12,0]);eq(P.canLearn(p,main.nodes[4].id).ok,false);
}
const replay=player('paladin');for(const [rank,count] of [['Слабый',5],['Обычный',6],['Сильный',8],['Элитный',6]])for(let i=0;i<count;i++)P.award(replay,{fields:{'Ранг':rank}},{});eq(P.info(replay).xp,5800);eq(P.info(replay).level,12);P.award(replay,{id:281,fields:{}},{isBoss:true});eq(P.info(replay).xp,6600);eq(P.info(replay).level,13);eq(P.info(replay).points,12);
const old={id:'paladin',masteryPoints:128,learnedAbilities:['n6_C10'],stats:{enemies:{boss:1}}};eq(P.info(old).xp,6600);eq(P.info(old).level,13);eq(P.info(old).spent,1);eq(P.info(old).xp,6600);eq(old.progressionVersion,2);
const poor=player('warrior');poor.masteryPoints=550;P.learn(poor,'n1_C10');eq(P.info(poor).points,1);eq(P.canLearn(poor,'n1_C12').ok,false);eq(P.learn(poor,'n1_C12').ok,false);eq(poor.learnedAbilities.length,1);
console.log('Variable costs, exact 26-win replay, minimum XP and legacy migration passed');
