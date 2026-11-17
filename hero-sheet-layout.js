/* Fit the complete ability description after layout and font loading. */
(()=>{
  let card=null,observer=null,frame=0;
  const desktop=()=>matchMedia('(min-width:901px) and (pointer:fine), (orientation:landscape)').matches;
  function fit(){
    frame=0;
    if(!card?.isConnected)return;
    const title=card.querySelector('b'),text=card.querySelector('span');
    if(!title||!text)return;
    const dossier=card.closest('.hero-dossier');
    const portrait=dossier?.querySelector('.dossier-portrait');
    if(portrait)dossier.style.setProperty('--hero-portrait-height',portrait.getBoundingClientRect().height+'px');
    if(!desktop()){
      title.style.removeProperty('font-size');text.style.removeProperty('font-size');
      return;
    }
    if(card.clientWidth===0||card.clientHeight===0)return;
    const apply=size=>{
      text.style.setProperty('font-size',size+'px','important');
      title.style.setProperty('font-size',(size*1.3)+'px','important');
    };
    let low=11,high=17;
    apply(low);
    for(let i=0;i<6;i++){
      const mid=(low+high)/2;apply(mid);
      if(card.scrollHeight<=card.clientHeight+1&&card.scrollWidth<=card.clientWidth+1)low=mid;
      else high=mid;
    }
    apply(Math.floor(low*4)/4);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(fit);}
  window.RPGHeroSheetLayout={refresh(root){
    observer?.disconnect();card=root.querySelector('.hero-ability-card');
    if(!card)return;
    if(typeof ResizeObserver==='function'){observer=new ResizeObserver(schedule);observer.observe(card);}
    schedule();
  }};
  window.addEventListener('resize',schedule);
  document.fonts?.ready.then(schedule);
})();
