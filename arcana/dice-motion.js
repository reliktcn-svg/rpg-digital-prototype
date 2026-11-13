/* Deterministic toss -> impacts -> settle. Reads resolved values elsewhere; no RNG. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.FantasyDiceMotion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=t=>Math.max(0,Math.min(1,t));
 function arc(t,a,b,height){if(t<a||t>b)return 0;const u=(t-a)/(b-a);return 4*u*(1-u)*height;}
 function sample(progress,layout,index=0,style='bounce'){
  const t=clamp(progress),size=layout.size,sides=layout.sides||6;
  const distance=Math.max(0,Math.min(size*2.1,layout.cellW*.5-size*.98-8));
  const q=Math.pow(1-t,2.45),travel=distance*(1-q);
  const tossed=style!=='roll';
  let lift=0;
  if(tossed){if(t<.34){const u=t/.34;lift=size*.48*(1-u*u);}else lift=arc(t,.34,.58,size*.18)+arc(t,.58,.78,size*.065)+arc(t,.78,.91,size*.018);}
  const rest=t>.91?(t-.91)/.09:0,wobble=t<1&&rest?Math.sin(rest*Math.PI*2)*(1-rest)*.035:0;
  const phase=index%3,axis=phase===0?[.84,.42,.24]:phase===1?[.48,-.73,.38]:[.65,.25,-.7];
  const turns=tossed?(sides===4?2.1:2.6)+phase*.15:distance/(size*.76)/(Math.PI*2);
  return {x:layout.x-distance+travel,y:layout.y+Math.sin(t*Math.PI)*size*(phase===1?-.06:.035),size,
   rotation:{axis,angle:turns*Math.PI*2*q+wobble,secondaryAxis:[0,1,0],secondaryAngle:tossed?Math.PI*1.35*q:0},
   lift,grounded:true,glow:t===1?.35:0,travel,distance,worldTravel:travel,cameraX:0,turns,groundOrigin:layout.x,cellW:layout.cellW,progress:t,index};
 }
 return Object.freeze({sample,version:'2.0.0'});
});
