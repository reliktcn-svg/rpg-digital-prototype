/* Deterministic rolling choreography. No materials, random rolls or DOM dependencies. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.FantasyDiceMotion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Right-handed world axes, viewed toward the origin from each positive axis:
  // X advances clockwise (negative angular velocity), Y counterclockwise.
  // Remaining angles approach zero to preserve the authoritative final face.
  const axis=Object.freeze([1,0,0]);
  function sample(progress,layout,index=0,style='bounce'){
    const t=Math.max(0,Math.min(1,progress)),size=layout.size;
    // Stay inside the die's own lane on phones and in multi-die rolls.
    const distance=Math.max(0,Math.min(size*2.5,layout.cellW*.5-size*1.16-8));
    const remaining=Math.pow(1-t,3),travel=distance*(1-remaining);
    const radius=size*.83;
    const turns=3.25,worldDistance=turns*Math.PI*2*radius;
    const worldTravel=worldDistance*(1-remaining);
    let bounce=0;
    if(t<.34){const u=t/.34;bounce=4*u*(1-u)*size*.15;}
    else if(t<.56){const u=(t-.34)/.22;bounce=4*u*(1-u)*size*.035;}
    return {x:layout.x-distance+travel,y:layout.y,size,
      rotation:{axis,angle:worldDistance*remaining/radius||0,secondaryAxis:[0,1,0],secondaryAngle:-1.75*Math.PI*2*remaining||0},lift:style==='roll'?0:bounce,
      // Height correction is supplied by the renderer from actual projected vertices.
      grounded:true,glow:t===1?.7:.2,travel,distance,worldTravel,cameraX:worldTravel-travel,turns,groundOrigin:layout.x,cellW:layout.cellW,progress:t,index};
  }
  return Object.freeze({sample,version:'1.1.1'});
});
