/* v0.6.77: presentation-only elements ported from the tabletop prototype.
 * No changes to random draws, decks, player state, or network messages. */
window.RPGTabletop = (() => {
  'use strict';
  const escape = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let lastTokens={};
  function turns(active,next,round,room){
    if(!active)return '';
    const card=(p,i)=>`<div class="table-turn ${i===0?'is-active':''}" data-turn-hero="${escape(p.id)}" style="--hero-color:${escape(p.color||'#b58e4f')}"><img src="assets/heroes/${escape(p.id)}.webp" alt=""><span><small>${i===0?'СЕЙЧАС ХОДИТ':`СЛЕДУЮЩИЙ · ${i}`}</small><b>${escape(p.name)}</b><em>♥ ${escape(p.currentHp)}/${escape(p.maxHp)} <strong>● ${escape(p.gold)} зол.</strong></em></span></div>`;
    return `<div class="table-round"><small>РАУНД</small><strong>${Number(round)||1}</strong></div><div class="table-turns" role="group" aria-label="Очередь героев">${[active,...next].map(card).join('')}</div>${room?`<div class="turn-order-code">КОД ${escape(room)}</div>`:''}<button class="table-journal" type="button" data-table-journal>Журнал</button>`;
  }
  function token(svg,p,x,y,active,create){
    // Reuse the actual SVG image element instead of replacing it on every state update.
    // WebKit sometimes flashes newly attached SVG images until the first movement has cached them.
    const preserved=[...svg.querySelectorAll('.table-token')].find(node=>node.getAttribute('data-token-hero')===p.id);
    if(preserved){
      const prev=lastTokens[p.id];
      preserved.setAttribute('transform',`translate(${x} ${y})`);
      preserved.setAttribute('class',`table-token ${active?'active':''}`);
      preserved.setAttribute('aria-label',`${p.name}, ${p.hex}`);
      const outer=preserved.querySelector('circle[stroke]');
      if(outer){outer.setAttribute('stroke',active?'#f4d491':'#201b16');outer.setAttribute('stroke-width',active?5:3)}
      if(prev&&Math.hypot(prev.x-x,prev.y-y)>1&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&preserved.animate){
        preserved.animate([{transform:`translate(${prev.x}px,${prev.y}px)`},{transform:`translate(${x}px,${y}px)`}],{duration:450,easing:'cubic-bezier(.22,.61,.36,1)'});
      }
      // Re-appending an already mounted portrait invalidates SVG image compositing in WebKit.
      return;
    }
    const g=create('g',{class:`table-token ${active?'active':''}`,transform:`translate(${x} ${y})`,'data-token-hero':p.id,'aria-label':`${p.name}, ${p.hex}`});
    const mask='table-portrait-'+p.id;
    const defs=create('defs');const clip=create('clipPath',{id:mask});clip.appendChild(create('circle',{cx:0,cy:-3,r:15}));defs.appendChild(clip);g.appendChild(defs);
    g.appendChild(create('ellipse',{cx:0,cy:16,rx:21,ry:7,fill:'#000',opacity:'.45'}));
    g.appendChild(create('circle',{cx:0,cy:0,r:19,fill:p.color||'#71869c',stroke:active?'#f4d491':'#201b16','stroke-width':active?5:3}));
    g.appendChild(create('image',{href:`assets/heroes/${p.id}.webp`,x:-15,y:-23,width:30,height:45,preserveAspectRatio:'xMidYMid slice','clip-path':`url(#${mask})`}));
    const label=create('text',{x:0,y:19,'text-anchor':'middle',class:'table-token-label'});label.textContent=p.initial||String(p.name||'').slice(0,1);g.appendChild(label);
    svg.appendChild(g);
    const prev=lastTokens[p.id];const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(prev&&Math.hypot(prev.x-x,prev.y-y)>1&&!reduced&&g.animate){
      // SVG CSS transforms follow the same source coordinate system as the underlying hex map.
      g.animate([{transform:`translate(${prev.x}px,${prev.y}px)`},{transform:`translate(${x}px,${y}px)`}],{duration:450,easing:'cubic-bezier(.22,.61,.36,1)'});
    }
  }
  function rememberTokens(positions){lastTokens=positions}
  function syncTabs(open,mode){
    const inventory=open&&mode!=='overview';const hero=open&&!inventory;
    for(const [id,on] of [['desktopHeroBtn',hero],['mobileHeroBtn',hero],['desktopInventoryBtn',inventory],['mobileInventoryBtn',inventory]]){
      const button=document.getElementById(id);if(!button)continue;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));
    }
  }
  return {turns,token,rememberTokens,syncTabs};
})();
