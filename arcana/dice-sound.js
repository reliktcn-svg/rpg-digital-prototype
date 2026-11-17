/* Synthesized tabletop foley. Never uses the game's random generator. */
(()=>{
 'use strict';
 let ctx,enabled=true;const live=new Set();
 try{enabled=localStorage.getItem('rpg-dice-sound-v1')!=='off'}catch{}
 function unlock(){
  try{
   if(!enabled||document.hidden)return Promise.resolve(false);
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio)return Promise.resolve(false);
   const fresh=!ctx||ctx.state==='closed';if(fresh)ctx=new Audio();
   const needsResume=ctx.state!=='running';
   const resumed=needsResume?ctx.resume():Promise.resolve();
   // Prime WebKit's output inside the original user gesture, before async UI work.
   if(fresh||needsResume){const source=ctx.createBufferSource();source.buffer=ctx.createBuffer(1,1,ctx.sampleRate);source.connect(ctx.destination);source.onended=()=>source.disconnect();source.start(0);}
   return Promise.resolve(resumed).then(()=>ctx.state==='running',()=>false);
  }catch{return Promise.resolve(false)}
 }
 for(const event of ['pointerdown','touchend','click','keydown'])document.addEventListener(event,unlock,{capture:true,passive:true});
 function stop(nodes){for(const node of [...nodes]){try{node.stop()}catch{}nodes.delete(node);live.delete(node)}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop(live);else if(ctx)unlock()});
 window.addEventListener('pageshow',()=>{if(ctx)unlock()});
 function hit(sides,strength,count,skin,nodes){
  if(!enabled||!ctx||ctx.state!=='running'||document.hidden)return;
  try{
   const duration=.07,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
   let seed=(sides*12345+Math.floor(ctx.currentTime*1000))>>>0;
   for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1)*Math.exp(-i/(ctx.sampleRate*.012))}
   const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
   source.buffer=buffer;filter.type='bandpass';filter.frequency.value=(skin==='satin-red'?2100:skin==='worn-crimson'?1000:1550)+sides*15;filter.Q.value=.65;
   gain.gain.value=.32*strength/Math.sqrt(Math.max(1,count));
   source.connect(filter).connect(gain).connect(ctx.destination);nodes.add(source);live.add(source);
   source.onended=()=>{nodes.delete(source);live.delete(source);source.disconnect();filter.disconnect();gain.disconnect()};
   source.start();source.stop(ctx.currentTime+duration);
  }catch{}
 }
 window.RPGDiceSound={
  get enabled(){return enabled},get state(){return ctx?.state||'idle'},unlock,
  set(value){enabled=!!value;try{localStorage.setItem('rpg-dice-sound-v1',enabled?'on':'off')}catch{}if(!enabled)stop(live);else unlock()},
  landing(dice,skin){const nodes=new Set();dice.forEach(d=>hit(d.sides,.65,dice.length,skin,nodes))},
  track(){
   unlock();const nodes=new Set(),last=[];
   return{
    frame(elapsed,duration,stagger,dice,motion,skin){
     const beats=motion==='roll'?[.12,.28,.48,.72,.90]:[.34,.58,.78,.91];
     dice.forEach((d,i)=>{const t=(elapsed-i*stagger)/Math.max(1,duration),prior=last[i]??-1;last[i]=t;if(t<0||t>=1)return;
      if(beats.some(b=>b>prior&&b<=t))hit(d.sides,Math.max(.18,1-t),dice.length,skin,nodes);
     });
    },stop(){stop(nodes)}
   };
  }
 };
})();
