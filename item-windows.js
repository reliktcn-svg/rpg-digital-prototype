/* Local presentation only: scroll snapshots and a separate readable item window. */
window.RPGItemWindows=(()=>{
  const selector='[data-preserve-scroll],.inventory-two-row-grid,.pending-picture-grid,.potion-bag-list,.inventory-card-reverse';
  let lastFocus=null;
  function capture(root){return {top:root.scrollTop,left:root.scrollLeft,children:[...root.querySelectorAll(selector)].map(n=>({top:n.scrollTop,left:n.scrollLeft})),cards:window.RPGCardInteraction?.capture(root)}}
  function restore(root,saved){if(!saved)return;root.scrollTop=saved.top;root.scrollLeft=saved.left;[...root.querySelectorAll(selector)].forEach((n,i)=>{if(saved.children[i]){n.scrollTop=saved.children[i].top;n.scrollLeft=saved.children[i].left}});if(saved.cards)window.RPGCardInteraction?.restore(root,saved.cards)}
  function close(){const layer=document.getElementById('reactionItemDetail');if(!layer)return;layer.remove();const target=lastFocus;lastFocus=null;if(target?.isConnected)target.focus({preventScroll:true})}
  function describe({name,meta='',effect='',image='',extra=''}){
    close();lastFocus=document.activeElement;
    const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const layer=document.createElement('div');layer.id='reactionItemDetail';layer.className='rpg-item-window';
    layer.innerHTML=`<section class="rpg-item-description" role="dialog" aria-modal="true" aria-label="${esc(name)}"><button class="rpg-item-window-close ghost" aria-label="Закрыть описание">×</button><header>${image?`<img src="${esc(image)}" alt="">`:''}<div><small>${esc(meta)}</small><h3>${esc(name)}</h3></div></header><div class="rpg-item-description-scroll"><p>${esc(effect)}</p>${extra}</div></section>`;
    document.body.append(layer);layer.querySelector('button').onclick=close;
    layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}if(e.key==='Tab'){const button=layer.querySelector('button');e.preventDefault();button.focus()}});
    layer.querySelector('button').focus({preventScroll:true});
  }
  // A pan starting on a thumbnail must never turn into a click on touch release.
  function guardPan(scroll){let start=null,dragged=false;scroll.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};dragged=false},{passive:true});scroll.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)dragged=true},{passive:true});scroll.addEventListener('pointercancel',()=>{dragged=true;start=null},{passive:true});scroll.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopImmediatePropagation();dragged=false}start=null},{capture:true});}
  return Object.freeze({capture,restore,describe,close,guardPan});
})();
