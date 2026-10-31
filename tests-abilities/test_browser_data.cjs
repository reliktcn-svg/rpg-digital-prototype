const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),env={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(ROOT,'hero-abilities.js'),'utf8'),env);
vm.runInNewContext(fs.readFileSync(path.join(ROOT,'hero-progression.js'),'utf8'),env);
const P=env.window.RPGProgression;
assert(P&&P.project&&P.revision>=1);
for(const id of ['warrior','dwarf','archer','rogue','mage','paladin']){
 assert(P.hero(id));
 assert.strictEqual(P.hero(id).branches.length,7);
 const p={id,masteryPoints:5000,progressionVersion:2,learnedAbilities:[]};
 assert(P.info(p).level>=3);
 const n=P.hero(id).branches[0].nodes[1];
 assert(P.canLearn(p,n.id).ok);
 assert(P.learn(p,n.id).ok);
}
console.log('PASS: browser progression data and skill learning without HTML atlas');
