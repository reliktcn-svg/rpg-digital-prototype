const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync(require('node:path').join(__dirname,'..','solo-saves.js'),'utf8');
const start=src.indexOf('function description(state){');
const end=src.indexOf('\n function write(',start);
assert(start>=0&&end>start);
const description=new Function(src.slice(start,end)+';return description;')();
for(const [level,xp] of [[1,0],[2,250],[16,9000],[17,10000],[18,11050]]){
 const desc=description({started:true,players:[{id:'warrior',name:'Воин',progressionVersion:2,masteryPoints:xp}],territories:{}});
 assert.equal(desc.level,level,`wrong level for XP=${xp}`);
}
console.log('5 solo save metadata level checks passed (including 17th level)');
