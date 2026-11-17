/* In-game notices and confirmations. Preserve underlying windows and focus. */
(()=>{
  const queue=[];let active=null;
  function next(){
    if(active||!queue.length)return;
    const request=active=queue.shift(),prior=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='rpg-game-dialog';
    dialog.setAttribute('aria-labelledby','rpgGameDialogTitle');
    dialog.innerHTML='<h2 id="rpgGameDialogTitle"></h2><p></p><div class="rpg-game-dialog-actions"></div>';
    dialog.querySelector('h2').textContent=request.title;
    dialog.querySelector('p').textContent=request.message;
    const actions=dialog.querySelector('div');
    let done=false;
    function finish(value){
      if(done)return;done=true;dialog.close();dialog.remove();active=null;
      if(prior?.isConnected&&!prior.closest('[inert]'))prior.focus({preventScroll:true});
      request.resolve(value);queueMicrotask(next);
    }
    for(const choice of request.choices){
      const button=document.createElement('button');button.type='button';
      button.textContent=choice.label;button.className=choice.value===request.cancel?'secondary':'success';
      button.onclick=()=>finish(choice.value);if(choice.value===request.cancel)button.autofocus=true;
      actions.append(button);
    }
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(request.cancel)});
    document.body.append(dialog);dialog.showModal();
  }
  function ask(message,{title='Сердце тьмы',choices,cancel=null}={}){
    return new Promise(resolve=>{queue.push({message:String(message),title,choices,cancel,resolve});next()});
  }
  window.RPGDialogs={
    alert(message){return ask(message,{choices:[{label:'Понятно',value:true}]})},
    confirm(message,{title='Подтверждение',accept='Подтвердить',cancel='Отмена'}={}){
      return ask(message,{title,choices:[{label:cancel,value:false},{label:accept,value:true}],cancel:false});
    },
    chooseSlot(message){return ask(message,{title:'Выберите слот',choices:[{label:'Слот 1',value:1},{label:'Слот 2',value:2},{label:'Отмена',value:null}]})}
  };
})();
