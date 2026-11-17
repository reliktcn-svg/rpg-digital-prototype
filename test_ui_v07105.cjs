const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname;
function audioEnvironment(initial='on'){
 const contexts=[],events={},stored=new Map([['rpg-dice-sound-v1',initial]]);let hits=0;
 const node=()=>({connect(target){return target},disconnect(){}});
 class AudioContext{
  constructor(){this.state='suspended';this.sampleRate=48000;this.currentTime=1;this.destination=node();this.resumes=0;contexts.push(this)}
  resume(){this.resumes++;this.state='running';return Promise.resolve()}
  createBuffer(channels,length){const data=new Float32Array(length);return{length,getChannelData:()=>data}}
  createBufferSource(){return Object.assign(node(),{buffer:null,start(){if(this.buffer.length>1)hits++},stop(){this.onended?.()}})}
  createBiquadFilter(){return Object.assign(node(),{frequency:{value:0},Q:{value:0}})}
  createGain(){return Object.assign(node(),{gain:{value:0}})}
 }
 const document={hidden:false,addEventListener(name,fn,options){events[name]={fn,options}}};
 const window={AudioContext,addEventListener(name,fn){events[name]={fn}}};
 const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('Audio must not consume game randomness')};
 const context={window,document,localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},Math:safeMath};
 vm.runInNewContext(fs.readFileSync(root+'/arcana/dice-sound.js','utf8'),context);
 return {window,document,events,contexts,stored,get hits(){return hits}};
}
(async()=>{
 const e=audioEnvironment(),sound=e.window.RPGDiceSound;
 await e.events.touchend.fn();assert.equal(sound.state,'running');assert.equal(e.events.click.options.capture,true);
 const roll=sound.track();roll.frame(400,1000,0,[{sides:6}],'bounce','classic');assert.equal(e.hits,1);
 const c=e.contexts[0],before=c.resumes;c.state='interrupted';await e.events.touchend.fn();assert.equal(c.resumes,before+1);assert.equal(sound.state,'running');
 sound.set(false);const muted=e.hits;sound.landing([{sides:20}],'classic');assert.equal(e.hits,muted);assert.equal(e.stored.get('rpg-dice-sound-v1'),'off');
 sound.set(true);await sound.unlock();sound.landing([{sides:20}],'classic');assert.equal(e.hits,muted+1);
 e.document.hidden=true;sound.landing([{sides:6}],'classic');assert.equal(e.hits,muted+1);
 e.document.hidden=false;c.state='closed';await sound.unlock();assert.equal(e.contexts.length,2);
 const off=audioEnvironment('off');await off.events.click.fn();assert.equal(off.contexts.length,0);
 console.log('PASS: trusted audio activation, interrupted/closed recovery, mute persistence, reduced-motion landing, no game RNG.');

 const source=fs.readFileSync(root+'/app.js','utf8');
 const functionText=source.slice(source.indexOf('function endTurn('),source.indexOf('function renderTurnOrderBanner('));
 let approve,turns=0;
 const p={id:'mage',personalTurn:1,pendingItems:[],hex:'ЛГ01'},state={started:true,rolled:false,turnMoved:false};
 const context={state,currentPlayer:()=>p,currentHexNeedsResolution:()=>false,advanceTurnState:()=>turns++,closeCharacterSheet(){},window:{RPGDialogs:{confirm:()=>new Promise(r=>approve=r)},dispatchEvent(){}},Event:class{}};
 vm.runInNewContext(functionText,context);
 context.endTurn();assert.equal(turns,0);approve(false);await Promise.resolve();assert.equal(turns,0);
 context.endTurn();approve(true);await Promise.resolve();assert.equal(turns,1);
 context.endTurn();p.personalTurn=2;approve(true);await Promise.resolve();assert.equal(turns,1,'stale confirmation must not end a later turn');
 console.log('PASS: end-turn confirmation waits, cancel preserves turn, stale approval ignored.');

 for(const file of ['app.js','solo-saves.js','update-client.js'])assert(!/(?<![.\w])(?:alert|confirm|prompt)\s*\(/.test(fs.readFileSync(root+'/'+file,'utf8')),file+' still calls a browser dialog');
 for(const file of ['app.js','game-dialogs.js','solo-saves.js','update-client.js','arcana/dice-sound.js','arcana/dice-animator.js'])new vm.Script(fs.readFileSync(root+'/'+file,'utf8'),{filename:file});
 const manifest=JSON.parse(fs.readFileSync(root+'/manifest.webmanifest','utf8'));
 for(const icon of manifest.icons)assert(fs.existsSync(root+'/'+icon.src));
 assert.equal(manifest.start_url,'./index.html');assert.equal(manifest.name,'Сердце тьмы');
 console.log('PASS: no native game dialogs; script syntax; versioned app icon references and stable launch URL.');
})().catch(error=>{console.error(error);throw error});
