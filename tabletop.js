/* Tabletop presentation. No random draws, mutations of game state or network requests. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reduced = () => document.body.classList.contains('table-reduced') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const symbols = {'Враг':'⚔','Босс':'♛','Ловушка':'◇','Событие':'✧','Постоянная локация':'⌂','Темница':'▥','Элитная опасность':'♜','Тёмное испытание':'☽','Проклятый шаг':'↟'};
  function art(card) {
    const id=Number(card.id);
    if(card.category==='Постоянная локация'){const loc=locationInfo(card.name,card.visualMode);if(loc)return loc.src}
    if(window.CARD_ART?.[id])return window.CARD_ART[id].src;
    if(id>=141 && id<=347 && id!==281)return `assets/items/${id}.webp`;
    if((id>=1&&id<=55)||id===281)return `assets/enemies/enemy-${String(id).padStart(3,'0')}.webp`;
    return '';
  }
  function cardBack(card,entries) {
    return `<div class="inventory-card-reverse table-card-back"><div class="reverse-kicker">${card.id!=null?`№${esc(card.id)} · `:''}${esc(card.category||'Карта')}</div><h3 class="reverse-title">${esc(card.name)}</h3>${card.deck?`<p class="table-card-deck">${esc(card.deck)}</p>`:''}<dl class="table-card-fields">${entries.map(([key,value])=>`<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></div>`;
  }
  function card(card,entries) {
    const image=art(card);
    return `<div class="table-card" data-table-card><div class="table-card-inner"><div class="table-card-face table-card-front">${image?`<img src="${image}" alt="${esc(card.name)}">`:`<div class="table-card-emblem" aria-hidden="true"><span>${symbols[card.category]||'✧'}</span></div>`}<div class="table-card-caption"><small>${esc(card.category||'Карта')} · №${esc(card.id)}</small><h3>${esc(card.name)}</h3></div></div><div class="table-card-face table-card-reverse" inert>${cardBack(card,entries)}</div></div></div><button class="table-flip secondary" type="button" data-table-flip aria-pressed="false">↻ Перевернуть · описание</button>`;
  }
  function locationInfo(name,mode='normal') {
    const names={'Таверна':'tavern','Торговец':'merchant','Святилище':'shrine','Древний портал':'portal'};
    const canonical=Object.keys(names).find(n=>String(name).startsWith(n));if(!canonical)return null;
    const variant=mode==='cursed'?'cursed':'normal';return {name:canonical,kind:'location',variant,src:`assets/locations/${names[canonical]}-${variant}.webp`};
  }
  function heroSummary(p) {
    if(!p)return '';return `<div class="table-visit-hero"><img src="assets/heroes/${esc(p.id)}.webp" alt=""><div><b>${esc(p.name)}</b><span>ЗД ${p.currentHp}/${p.maxHp} · ${p.gold} зол.</span></div>${p.statuses?.length?`<div class="table-visit-statuses">${p.statuses.map(st=>`<span>${esc(st)}</span>`).join('')}</div>`:'<small>Нет негативных эффектов</small>'}</div>`;
  }
  function locationFrame(name,mode,content,p) {
    const data=locationInfo(name,mode);if(!data)return content;
    return `<article class="table-venue ${mode==='cursed'?'is-cursed':''}" data-location-mode="${data.variant}"><figure class="table-venue-art"><img src="${data.src}" alt="${esc(data.name)} · ${data.variant==='cursed'?'проклятый вариант':'обычный вариант'}"><figcaption><small>ПОСТОЯННАЯ ЛОКАЦИЯ</small><strong>${esc(data.name)}</strong><span>${data.variant==='cursed'?'Проклятый вариант':'Обычный вариант'}</span></figcaption></figure><section class="table-venue-content">${heroSummary(p)}${content}</section></article>`;
  }
  function encounter(card,entries,extra,p) {
    const location=card.category==='Постоянная локация'?locationInfo(card.name,card.visualMode||(/Проклят/.test(card.name)?'cursed':'normal')):null;
    const data=location||window.CARD_ART?.[card.id];if(!data)return null;
    const fields=rows=>`<dl class="table-card-fields">${rows.map(([key,value])=>`<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
    let description=fields(entries);
    if(location?.name==='Святилище'&&card.visualMode){const key=card.visualNatural===20?'Натуральная 20':card.visualNatural===1?'Натуральная 1':card.visualMode==='cursed'?'Проклятый':'Обычный';description=fields(entries.filter(([k])=>k===key))+`<details class="table-location-rules"><summary>Все исходы святилища</summary>${fields(entries.filter(([k])=>k!==key))}</details>`;}
    return `<article class="table-story table-story--${data.kind} ${data.variant==='cursed'?'is-cursed':''}" data-story-id="${esc(card.id)}" ${location?`data-location-mode="${data.variant}"`:''}><figure class="table-story-art"><img src="${data.src}" alt="${esc(card.name)}" decoding="async"><figcaption><span>${symbols[card.category]||'◇'}</span> ${Number.isFinite(Number(card.id))?'№'+esc(card.id):'МЕСТО СИЛЫ'}</figcaption></figure><section class="table-story-content"><header><div class="card-kicker">${esc(card.category||'Приключение')} · ${location?(data.variant==='cursed'?'ПРОКЛЯТЫЙ ВАРИАНТ':'ОБЫЧНЫЙ ВАРИАНТ'):esc(card.region||'')}</div><h2>${esc(location?.name||card.name)}</h2></header>${location?heroSummary(p):''}<div class="table-story-copy">${description}${extra?`<div class="table-story-outcome">${extra}</div>`:''}</div><div class="modal-actions" id="modalActions"></div></section></article>`;
  }
  function deal(el,key) {
    if(!el||reduced())return;const source=document.querySelector(`[data-deck="${key}"]`);if(!source)return;
    const a=source.getBoundingClientRect(),b=el.getBoundingClientRect();
    el.animate([{opacity:.2,transform:`translate(${Math.max(-400,Math.min(400,a.x-b.x))}px,${Math.max(-400,Math.min(400,a.y-b.y))}px) scale(.2) rotate(-10deg)`},{opacity:1,transform:'none'}],{duration:340,easing:'cubic-bezier(.2,.75,.25,1)'});
  }
  function flipIn(el) {if(el&&!reduced())el.animate([{transform:'perspective(900px) rotateY(-65deg)',opacity:.3},{transform:'perspective(900px) rotateY(0)',opacity:1}],{duration:240,easing:'ease-out'});}
  function turns(active,next,round,room) {
    return `<div class="table-round"><small>РАУНД</small><b>${round}</b></div><div class="table-turns">${[active,...next].map((p,i)=>`<button type="button" class="table-turn ${!i?'is-active':''}" data-table-hero="${esc(p.id)}" style="--hero-color:${esc(p.color)}" ${!i?'aria-current="step"':''}><img src="assets/heroes/${p.id}.webp" alt=""><span><small>${!i?'СЕЙЧАС ХОДИТ':`ДАЛЕЕ · ${i}`}</small><b>${esc(p.name)}</b><em>♥ ${p.currentHp}/${p.maxHp} <span class="table-gold">● ${p.gold}</span>${p.statuses?.length?` · ${p.statuses.length} эфф.`:''}</em></span></button>`).join('')}</div>${room?`<span class="turn-order-code">КОД ${esc(room)}</span>`:''}<button type="button" data-table-journal class="table-journal">Журнал</button>`;
  }
  let deckSignature='';
  function decks(data,names) {
    const root=document.getElementById('tableDecks');if(!root||!data)return;
    const sig=JSON.stringify(Object.entries(data).map(([k,d])=>[k,d.draw?.length,d.discard?.length]));if(sig===deckSignature)return;deckSignature=sig;
    root.innerHTML=Object.entries(names).map(([key,name])=>`<details data-deck="${key}" class="table-deck ${key.includes('Heart')?'is-heart':''}"><summary><span class="table-deck-back" aria-hidden="true">${key.startsWith('loot')?'◇':'✧'}</span><span><small>${key.includes('Heart')?'СЕРДЦЕ ТЬМЫ':'ВНЕШНИЕ РЕГИОНЫ'}</small><b>${key.startsWith('loot')?'Тайники':'Исследования'}</b><em>${data[key]?.draw?.length||0} карт</em></span></summary><div class="table-deck-note"><b>${esc(name)}</b><p>В колоде: ${data[key]?.draw?.length||0}. В сбросе: ${data[key]?.discard?.length||0}.</p><p>Карта открывается действием героя. Порядок колоды скрыт.</p></div></details>`).join('');
  }
  function combatPhase(phase,round) {
    const names={pre:'Встреча с врагом',hero_turn:'Выберите действие',hero_roll:'Атака героя',hero_damage_ready:'Бросьте урон',hero_damage:'Урон героя',mage_nat20:'Выберите стихию',enemy_ready:'Ход врага',enemy_roll:'Атака врага',enemy_miss:'Промах врага',enemy_damage:'Защита героя',post_damage:'Последствия атаки',escape_result:'Результат побега',cleanse_choice:'Снятие эффекта',victory:'Победа'};
    const step=phase==='pre'?0:phase==='victory'?4:phase.startsWith('enemy')||phase==='post_damage'?3:phase.includes('damage')?2:1;
    return `<div class="table-battle-phase" role="status"><span>${esc(names[phase]||'Бой')} <small>· раунд ${round}</small></span><ol aria-label="Этап боя">${['Встреча','Атака','Урон','Ответ','Итог'].map((name,i)=>`<li ${i===step?'aria-current="step"':''} class="${i===step?'current':''}">${name}</li>`).join('')}</ol></div>`;
  }
  let positions={};
  function token(svg,p,x,y,active,make) {
    const group=make('g',{class:`table-token ${active?'active':''}`,transform:`translate(${x} ${y})`,'data-token-hero':p.id,'aria-label':`${p.name}, ${p.hex}`});
    const clip=make('clipPath',{id:`token-clip-${p.id}`});clip.appendChild(make('circle',{cx:0,cy:-3,r:18}));group.appendChild(clip);
    group.appendChild(make('ellipse',{cx:0,cy:19,rx:25,ry:9,fill:'#000',opacity:'.55'}));
    group.appendChild(make('circle',{cx:0,cy:0,r:23,fill:p.color,stroke:active?'#f4d491':'#201b16','stroke-width':active?5:3}));
    const image=make('image',{href:`assets/heroes/${p.id}.webp`,x:-18,y:-30,width:36,height:58,preserveAspectRatio:'xMidYMid slice','clip-path':`url(#token-clip-${p.id})`});group.appendChild(image);
    const label=make('text',{x:0,y:22,'text-anchor':'middle',class:'table-token-label'});label.textContent=p.initial;group.appendChild(label);
    svg.appendChild(group);const prev=positions[p.id];
    if(prev&&(prev.x!==x||prev.y!==y)&&!reduced())group.animate([{transform:`translate(${prev.x}px,${prev.y}px)`},{transform:`translate(${x}px,${y}px)`}],{duration:360,easing:'ease-out'});
  }
  function connect(api) {
    document.getElementById('tableCenter').onclick=api.center;
    new MutationObserver(()=>{const banner=document.getElementById('onlineTurnBanner');const heading=document.querySelector('.topbar>div');if(banner&&heading&&banner.parentElement!==heading)heading.appendChild(banner)}).observe(document.body,{childList:true});
    const motion=document.getElementById('motionToggle');
    try{document.body.classList.toggle('table-reduced',localStorage.getItem('rpgTabletopReducedMotion')==='true')}catch{}
    motion.setAttribute('aria-pressed',String(document.body.classList.contains('table-reduced')));
    motion.onclick=()=>{const on=document.body.classList.toggle('table-reduced');motion.setAttribute('aria-pressed',String(on));try{localStorage.setItem('rpgTabletopReducedMotion',String(on))}catch{}};
    document.addEventListener('click',e=>{
      const flip=e.target.closest('[data-table-flip]');if(flip){const card=flip.previousElementSibling;const back=card.classList.toggle('is-back');card.querySelector('.table-card-front').inert=back;card.querySelector('.table-card-reverse').inert=!back;flip.setAttribute('aria-pressed',String(back));flip.textContent=back?'↶ Показать рисунок':'↻ Перевернуть · описание';}
      if(!e.target.closest('.table-settings'))document.querySelector('.table-settings').open=false;
    });
    document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const journal=document.getElementById('journalOverlay'),sheet=document.getElementById('sheetDrawer');if(!journal.hidden)journal.hidden=true;else if(!sheet.hidden)api.closeSheet();else api.closeModal();});
    // Dragging moves the existing scroll viewport; both map images and SVG stay in one stage.
    const wrap=document.getElementById('boardWrap');let drag=null,suppressClick=false;
    wrap.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag={x:e.clientX,y:e.clientY,left:wrap.scrollLeft,top:wrap.scrollTop,id:e.pointerId,moved:false};});
    wrap.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<7)return;drag.moved=true;wrap.setPointerCapture(e.pointerId);wrap.classList.add('is-panning');wrap.scrollLeft=drag.left-dx;wrap.scrollTop=drag.top-dy;});
    const stop=()=>{if(!drag)return;suppressClick=drag.moved;drag=null;wrap.classList.remove('is-panning');setTimeout(()=>suppressClick=false,0);};
    wrap.addEventListener('pointerup',stop);wrap.addEventListener('pointercancel',stop);wrap.addEventListener('lostpointercapture',stop);
    wrap.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
    // Keyboard focus follows newly opened panels, without trapping the player away from reactions.
    const focusTargets=['modal','sheetDrawer','journalOverlay'];
    for(const id of focusTargets){const el=document.getElementById(id);let previous=null;new MutationObserver(records=>{if(!records.some(r=>r.attributeName==='hidden'))return;if(!el.hidden){previous=document.activeElement;const target=el.querySelector('button:not([disabled]),input');target?.focus({preventScroll:true})}else if(previous?.isConnected)previous.focus({preventScroll:true});}).observe(el,{attributes:true,attributeFilter:['hidden']});}
  }
  window.TabletopUI={art,locationInfo,locationFrame,heroSummary,encounter,deal,card,cardBack,turns,decks,combatPhase,flipIn,token,rememberTokens:v=>positions=v,connect};
})();
