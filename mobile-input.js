(()=>{
 const game=e=>document.body.classList.contains('game-running')&&e.target instanceof Element&&!e.target.closest('input,textarea');
 for(const type of ['gesturestart','gesturechange'])document.addEventListener(type,e=>{if(game(e)&&e.scale!==1)e.preventDefault()},{passive:false});
 // One-finger scrolling is never cancelled. The board retains its own two-finger zoom.
 document.addEventListener('touchmove',e=>{if(e.touches.length>1&&game(e)&&!e.target.closest('.board-wrap'))e.preventDefault()},{passive:false});
})();
