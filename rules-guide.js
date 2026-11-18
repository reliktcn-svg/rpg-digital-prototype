/* Short, revisitable lessons. No game-state mutations. */
(()=>{
 const settings=document.querySelector('#settingsOverlay .settings-card');if(!settings)return;
 const lessons=window.RPGRulesContent.lessons,button=document.createElement('button');
 button.type='button';button.className='ghost';button.textContent='Обучение';button.id='openTutorial';
 settings.querySelector('.settings-actions').insertBefore(button,document.getElementById('settingsResetBtn'));
 const dialog=document.createElement('dialog');dialog.id='rulesGuide';dialog.setAttribute('aria-labelledby','tutorialTitle');
 dialog.innerHTML='<header><div><small>СЕРДЦЕ ТЬМЫ</small><h2 id="tutorialTitle">Обучение</h2></div><button data-close aria-label="Закрыть обучение">×</button></header><label class="lesson-picker">Выбрать раздел<select aria-label="Раздел обучения"></select></label><div class="rules-layout"><nav aria-label="Шаги обучения"></nav><main tabindex="-1"></main></div><footer><button data-prev>Назад</button><span aria-live="polite"></span><button data-next class="success">Далее</button></footer>';
 document.body.append(dialog);const nav=dialog.querySelector('nav'),main=dialog.querySelector('main'),picker=dialog.querySelector('select'),prev=dialog.querySelector('[data-prev]'),next=dialog.querySelector('[data-next]');let index=0;
 lessons.forEach((lesson,i)=>{const b=document.createElement('button');b.type='button';b.textContent=(i+1)+'. '+lesson.title;b.onclick=()=>show(i);nav.append(b);picker.add(new Option((i+1)+'. '+lesson.title,String(i)))});
 function show(i,focus=true){
  index=Math.max(0,Math.min(i,lessons.length-1));picker.value=String(index);
  main.innerHTML='<h3 tabindex="-1">'+lessons[index].title+'</h3>'+lessons[index].html;main.scrollTop=0;
  [...nav.children].forEach((b,n)=>{b.classList.toggle('active',n===index);if(n===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
  prev.disabled=index===0;next.textContent=index===lessons.length-1?'К приключению':'Далее';dialog.querySelector('footer span').textContent=(index+1)+' / '+lessons.length;
  if(focus)main.querySelector('h3').focus({preventScroll:true});
 }
 picker.onchange=()=>show(Number(picker.value));prev.onclick=()=>show(index-1);next.onclick=()=>index===lessons.length-1?dialog.close():show(index+1);
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 button.onclick=()=>{document.getElementById('settingsOverlay').hidden=true;show(index,false);dialog.showModal();main.querySelector('h3').focus({preventScroll:true})};
 dialog.addEventListener('close',()=>document.querySelector('[data-table-settings],[data-turn-action="settings"]')?.focus());
})();
