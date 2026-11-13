/* One scroll owner per reverse. A pan never activates a card or its background. */
window.RPGCardInteraction=(()=>{
  const bound=new WeakSet(),slop=8;
  function backOf(surface){
    if(surface.matches('.visual-card-stage:not(.is-back)'))return null;
    return surface.matches('.boss-info-rows')?surface:surface.querySelector('.inventory-card-reverse,.visual-card-back');
  }
  function capture(root){
    const saved=new Map();
    for(const surface of root.querySelectorAll('.flip-surface[data-scroll-key]')){
      const owner=backOf(surface);if(owner)saved.set(surface.dataset.scrollKey,{top:owner.scrollTop,left:owner.scrollLeft});
    }
    return saved;
  }
  function restore(root,saved){
    for(const surface of root.querySelectorAll('.flip-surface[data-scroll-key]')){
      const owner=backOf(surface),position=saved.get(surface.dataset.scrollKey);
      if(owner&&position){owner.scrollTop=position.top;owner.scrollLeft=position.left;}
    }
  }
  function bind(surface,flip){
    if(!surface||bound.has(surface))return;bound.add(surface);surface.classList.add('flip-surface');
    const back=()=>backOf(surface);
    const control=target=>{
      const el=target instanceof Element?target.closest('a,button,input,select,textarea,summary,[data-no-flip],.negative-effect-term,[role="button"]'):null;
      return el&&el!==surface;
    };
    let pointer=null,touch=null,suppress=false;
    function activate(e){
      const focused=surface.contains(document.activeElement);
      const identity=surface.id?['id',surface.id]:['data-visual-toggle','data-loot-flip','data-boss-flip'].filter(a=>surface.hasAttribute(a)).map(a=>[a,surface.getAttribute(a)])[0];
      flip(e);
      if(focused&&identity){
        const [attr,value]=identity;
        const next=[...document.querySelectorAll(`[${attr}="${CSS.escape(value)}"]`)].find(n=>!n.closest('[inert]')&&n.getClientRects().length);
        next?.focus({preventScroll:true});
      }
    }
    surface.classList.toggle('flip-surface-back',!!back());
    surface.addEventListener('pointerdown',e=>{
      if(!e.isPrimary||e.button!==0||e.target.closest('input,textarea,select'))return;
      suppress=false;const owner=back();pointer={id:e.pointerId,x:e.clientX,y:e.clientY,top:owner?.scrollTop||0,owner,type:e.pointerType,moved:false};
    },{passive:true});
    surface.addEventListener('pointermove',e=>{
      if(!pointer||pointer.id!==e.pointerId)return;
      if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>slop){pointer.moved=true;suppress=true;}
      // Touch remains a native pan, with momentum. Mouse dragging also reads the back.
      if(pointer.moved&&pointer.type==='mouse'&&pointer.owner){
        if(e.cancelable)e.preventDefault();
        if(!surface.hasPointerCapture(e.pointerId))surface.setPointerCapture(e.pointerId);
        surface.classList.add('is-dragging');pointer.owner.scrollTop=pointer.top+pointer.y-e.clientY;
      }
    },{passive:false});
    function finish(e){
      if(pointer&&pointer.id===e.pointerId){
        suppress=suppress||pointer.moved||Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>slop;
        pointer=null;
      }
      surface.classList.remove('is-dragging');
      if(surface.hasPointerCapture(e.pointerId))surface.releasePointerCapture(e.pointerId);
    }
    surface.addEventListener('pointerup',finish,{passive:true});
    surface.addEventListener('pointercancel',e=>{suppress=true;finish(e)},{passive:true});
    surface.addEventListener('lostpointercapture',()=>{pointer=null;surface.classList.remove('is-dragging')},{passive:true});
    surface.addEventListener('scroll',()=>{if(pointer||touch)suppress=true},{capture:true,passive:true});
    surface.addEventListener('wheel',e=>{
      const owner=back();if(!owner||e.ctrlKey)return;
      const unit=e.deltaMode===1?16:e.deltaMode===2?owner.clientHeight:1;
      owner.scrollTop+=e.deltaY*unit;
      // Also consume a wheel at either boundary or on a short back. No scroll chaining.
      e.preventDefault();e.stopPropagation();
    },{passive:false});
    surface.addEventListener('touchstart',e=>{
      const owner=back();touch=owner&&e.touches.length===1?{owner,y:e.touches[0].clientY,startY:e.touches[0].clientY}:null;
    },{passive:true});
    surface.addEventListener('touchmove',e=>{
      if(!touch||e.touches.length!==1)return;
      const y=e.touches[0].clientY,dy=touch.y-y,owner=touch.owner;
      if(Math.abs(y-touch.startY)>slop)suppress=true;touch.y=y;
      const max=owner.scrollHeight-owner.clientHeight;
      // Fallback for WebKit overscroll: do not hand the boundary gesture to a parent.
      if((max<=1||dy<0&&owner.scrollTop<=0||dy>0&&owner.scrollTop>=max-1)&&e.cancelable)e.preventDefault();
    },{passive:false});
    surface.addEventListener('touchend',()=>{touch=null},{passive:true});
    surface.addEventListener('touchcancel',()=>{touch=null;suppress=true},{passive:true});
    surface.addEventListener('click',e=>{
      if(suppress){e.preventDefault();e.stopPropagation();return;}
      if(control(e.target))return;
      e.preventDefault();e.stopPropagation();activate(e);
    });
    surface.addEventListener('keydown',e=>{
      if(control(e.target))return;
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();e.stopPropagation();if(!e.repeat){suppress=false;activate(e)}return;
      }
      const owner=back();if(!owner)return;
      const delta={ArrowDown:40,ArrowUp:-40,PageDown:owner.clientHeight*.85,PageUp:-owner.clientHeight*.85};
      if(e.key in delta||e.key==='Home'||e.key==='End'){
        e.preventDefault();e.stopPropagation();owner.scrollTop=e.key==='Home'?0:e.key==='End'?owner.scrollHeight:owner.scrollTop+delta[e.key];
      }
    });
  }
  return Object.freeze({bind,capture,restore});
})();
