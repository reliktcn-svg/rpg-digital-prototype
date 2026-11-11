/* Synthesized tabletop dice foley; no game random generator is used. */
(()=>{'use strict';let ctx,enabled=true;const live=new Set();try{enabled=localStorage.getItem('rpg-dice-sound-v1')!=='off'}catch{}
 function unlock(){try{if(!enabled)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ctx||=new C();if(ctx.state==='suspended')ctx.resume().catch(()=>{})}catch{}}
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock,{passive:true});
 function stop(nodes){for(const n of nodes)try{n.stop()}catch{}nodes.clear()}
 function hit(sides,strength,count,skin,nodes){if(!enabled||!ctx||ctx.state!=='running'||document.hidden)return;try{
  const duration=.07,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);let seed=(sides*12345+Math.floor(ctx.currentTime*1000))>>>0;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1)*Math.exp(-i/(ctx.sampleRate*.012))}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=(skin==='satin-red'?2100:skin==='worn-crimson'?1000:1550)+sides*15;filter.Q.value=.65;gain.gain.value=.22*strength/Math.sqrt(Math.max(1,count));source.connect(filter).connect(gain).connect(ctx.destination);nodes.add(source);live.add(source);source.onended=()=>{nodes.delete(source);live.delete(source);source.disconnect();filter.disconnect();gain.disconnect()};source.start();source.stop(ctx.currentTime+duration);
 }catch{}}
 window.RPGDiceSound={get enabled(){return enabled},set(value){enabled=!!value;try{localStorage.setItem('rpg-dice-sound-v1',enabled?'on':'off')}catch{}if(!enabled)stop(live);else unlock()},track(){const nodes=new Set(),last=[];return{frame(elapsed,duration,stagger,dice,motion,skin){const beats=motion==='roll'?[.02,.10,.20,.32,.46,.62,.80,.96]:[.02,.34,.56,.76,.94];dice.forEach((d,i)=>{const t=(elapsed-i*stagger)/Math.max(1,duration),prior=last[i]??-1;last[i]=t;if(t<0||t>=1)return;const crossed=beats.filter(b=>b>prior&&b<=t);if(crossed.length)hit(d.sides,Math.max(.18,1-t),dice.length,skin,nodes)})},stop(){stop(nodes)}}}};
})();
