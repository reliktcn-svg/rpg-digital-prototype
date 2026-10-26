/* Per-hero local presentation preferences. Never changes shared game rules/state. */
(function(global){
  'use strict';
  const key='rpg-dice-preferences-v2',speeds=[1,2,4],motions=['bounce','roll'];
  const palette=Object.freeze([
    ['Белый','#FFFFFF'],['Чёрный','#141414'],['Серебряный','#C0C0C0'],
    ['Серый','#60646C'],['Красный','#D62828'],['Бордовый','#800020'],
    ['Оранжевый','#F77F00'],['Золотой','#D4AF37'],['Жёлтый','#F5D547'],
    ['Зелёный','#388E3C'],['Изумрудный','#00896B'],['Голубой','#45B8E8'],
    ['Синий','#2454C6'],['Фиолетовый','#8B45BD'],['Розовый','#E86AA6']
  ].map(([name,hex])=>Object.freeze({name,hex})));
  const defaults={skin:'classic',speed:2,motion:'bounce',colors:{rim:'#D4AF37',face:'#60646C',number:'#FFFFFF'}};
  const heroIds=new Set(['warrior','dwarf','mage','archer','rogue','paladin']);
  let context=()=>null,profiles={};
  function valid(value={}){
    if(!value||typeof value!=='object')value={};
    const colors={};for(const part of ['rim','face','number'])colors[part]=typeof value.colors?.[part]==='string'&&/^#[0-9a-f]{6}$/i.test(value.colors[part])?value.colors[part].toUpperCase():defaults.colors[part];
    const skin=value.skin==='custom'||['classic','satin-red','worn-crimson'].includes(value.skin)?value.skin:defaults.skin;
    return {skin,pack:value.pack==='custom'?'studio-sample':typeof value.pack==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/.test(value.pack)?value.pack:null,speed:speeds.includes(value.speed)?value.speed:defaults.speed,motion:motions.includes(value.motion)?value.motion:'bounce',colors};
  }
  try{const saved=JSON.parse(localStorage.getItem(key)||'{}');for(const id of heroIds)if(Object.hasOwn(saved||{},id))profiles[id]=valid(saved[id]);}catch(_){}
  global.addEventListener('storage',event=>{if(event.key!==key)return;try{const saved=JSON.parse(event.newValue||'{}');for(const id of heroIds)profiles[id]=valid(saved?.[id]);}catch(_){}});
  function owner(){return context()?.id||null;}
  function get(id=owner()){return valid(heroIds.has(id)?profiles[id]:null);}
  function set(value,id=owner()){
    if(!heroIds.has(id))return false;
    const previous=get(id);profiles[id]=valid({...previous,...value,colors:{...previous.colors,...value?.colors}});
    try{const saved=JSON.parse(localStorage.getItem(key)||'{}');for(const other of heroIds)if(other!==id&&Object.hasOwn(saved||{},other))profiles[other]=valid(saved[other]);localStorage.setItem(key,JSON.stringify(profiles));return true}catch(_){return false}
  }
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const shade=(hex,factor)=>'#'+rgb(hex).map(n=>Math.max(0,Math.min(255,Math.round(n*factor))).toString(16).padStart(2,'0')).join('');
  function resolveSkin(value){
    const s=valid(value);if(s.skin!=='custom')return withPack(s.skin,s);
    const c=s.colors,id='personal-'+[c.rim,c.face,c.number].map(v=>v.slice(1)).join('-');
    // Content-addressed materials keep an in-flight roll unchanged while editing.
    if(!FantasyDiceSkins.list().includes(id)){
      const n=rgb(c.number),light=n[0]*.2126+n[1]*.7152+n[2]*.0722>140;
      FantasyDiceSkins.register(id,{face:rgb(c.face),rim:[shade(c.rim,1.25),shade(c.rim,.65),c.rim,shade(c.rim,.4)],number:c.number,numberSelected:c.number,numberOutline:light?'#111111':'#EAEAEA',grain:.025});
    }
    return withPack(id,s);
  }
  function withPack(id,settings){
    const surfacePack=settings.pack?global.FantasyDicePacks?.get(settings.pack):null;if(!surfacePack)return id;
    const materialId=id+'-surface-'+surfacePack.revision;
    if(!FantasyDiceSkins.list().includes(materialId))FantasyDiceSkins.register(materialId,{...FantasyDiceSkins.get(id),surfacePack});
    return materialId;
  }
  global.RPGDiceSettings=Object.freeze({get,set,resolveSkin,palette,setContext(provider){context=provider;}});
  const button=document.getElementById('journalDiceBtn');if(!button)return;
  const dialog=document.createElement('dialog');dialog.className='dice-settings';dialog.setAttribute('aria-labelledby','diceSettingsTitle');
  dialog.innerHTML=`<header><div><small>ЛИЧНЫЙ КУБИК</small><h2 id="diceSettingsTitle">Кубик</h2><p id="diceSettingsOwner"></p></div><button type="button" data-close aria-label="Закрыть настройки кубика">×</button></header>
    <div class="dice-settings-fields"><label>Анимация<select id="diceMotion"><option value="bounce">Перекат с лёгким отскоком</option><option value="roll">Плавный перекат</option></select></label><label>Скорость<select id="diceSpeed"><option value="1">×1 — обычная</option><option value="2">×2 — быстро</option><option value="4">×4 — очень быстро</option></select></label><label class="dice-skin-field">Оформление<select id="diceSkin"><option value="custom">Свои цвета</option><option value="classic">Классический · тёмный / золото</option><option value="satin-red">Сталь · красный / чёрные цифры</option><option value="worn-crimson">Чёрный · бордовый / белые цифры</option></select></label></div>
    <div class="dice-color-tabs" aria-label="Цвета кубика"><button type="button" data-part="rim" aria-expanded="false" aria-controls="dicePalette"><i></i>Рамка</button><button type="button" data-part="face" aria-expanded="false" aria-controls="dicePalette"><i></i>Фон</button><button type="button" data-part="number" aria-expanded="false" aria-controls="dicePalette"><i></i>Цифра</button></div>
    <section id="dicePalette" class="dice-palette" hidden><p id="dicePaletteTitle"></p><div class="dice-swatches" role="group" aria-labelledby="dicePaletteTitle"></div></section>
    <div id="diceSettingsPreview"></div><footer><button type="button" id="diceSettingsRoll">Пробный бросок</button><p id="diceSettingsSaved" role="status"></p></footer><p class="dice-settings-note">Только для бросков этого героя. Сохраняется на устройстве и применяется со следующего броска.</p>`;
  document.body.append(dialog);
  const skin=dialog.querySelector('#diceSkin'),speed=dialog.querySelector('#diceSpeed'),motion=dialog.querySelector('#diceMotion'),status=dialog.querySelector('#diceSettingsSaved');
  function refreshPackOptions(){
    for(const option of [...skin.options])if(option.value.startsWith('pack:'))option.remove();
    for(const pack of global.FantasyDicePacks?.list()||[])skin.add(new Option(pack.name,'pack:'+pack.id));
    if(draft.pack&&!global.FantasyDicePacks?.get(draft.pack))skin.add(new Option('Недоступно · '+draft.pack,'pack:'+draft.pack));
    skin.value=draft.pack?'pack:'+draft.pack:draft.skin;
  }
  const paletteBox=dialog.querySelector('#dicePalette'),swatches=dialog.querySelector('.dice-swatches'),partNames={rim:'Рамка',face:'Фон',number:'Цифра'};
  let preview=null,editingHero=null,part=null,draft=valid();
  function play(){if(!preview)return;preview.setSkin(resolveSkin(draft));preview.setSpeed(draft.speed);preview.setMotion(draft.motion);preview.play({label:'Пробный D20',dice:[{sides:20,value:20}]});}
  function refresh(){
    refreshPackOptions();speed.value=String(draft.speed);motion.value=draft.motion;
    const material=FantasyDiceSkins.get(resolveSkin(draft));
    const visibleColors=draft.skin==='custom'?draft.colors:{rim:material.rim[0],face:'rgb('+material.face.join(',')+')',number:material.number};
    for(const b of dialog.querySelectorAll('[data-part]')){b.querySelector('i').style.backgroundColor=visibleColors[b.dataset.part];b.setAttribute('aria-expanded',String(b.dataset.part===part));}
    paletteBox.hidden=!part;
    if(part){dialog.querySelector('#dicePaletteTitle').textContent=partNames[part]+' · 15 цветов';for(const b of swatches.children)b.setAttribute('aria-pressed',String(draft.skin==='custom'&&b.dataset.color===draft.colors[part]));}
  }
  function save(){const saved=set(draft,editingHero);status.textContent=saved?'Сохранено для этого героя':'Применено на текущий сеанс';refresh();play();}
  for(const c of palette){const b=document.createElement('button');b.type='button';b.dataset.color=c.hex;b.title=c.name;b.setAttribute('aria-label',c.name);b.setAttribute('aria-pressed','false');const chip=document.createElement('i');chip.style.backgroundColor=c.hex;const name=document.createElement('span');name.textContent=c.name;b.append(chip,name);b.onclick=()=>{if(draft.skin!=='custom'){const material=FantasyDiceSkins.get(draft.skin);draft.colors={rim:material.rim[2].toUpperCase(),face:'#'+material.face.map(n=>Math.round(n).toString(16).padStart(2,'0')).join('').toUpperCase(),number:material.number.toUpperCase()};}draft.skin='custom';draft.colors[part]=c.hex;save();};swatches.append(b);}
  for(const b of dialog.querySelectorAll('[data-part]'))b.onclick=()=>{part=part===b.dataset.part?null:b.dataset.part;refresh();};
  button.addEventListener('click',()=>{global.FantasyDicePacks?.refresh();
    const hero=context();if(!heroIds.has(hero?.id)){button.title='Начните партию и выберите героя';return;}
    editingHero=hero.id;draft=get(editingHero);part=null;refresh();
    dialog.querySelector('#diceSettingsOwner').textContent=hero.name||hero.id;
    status.textContent='Личные настройки героя';dialog.showModal();
    preview?.destroy();preview=FantasyDice.create({container:dialog.querySelector('#diceSettingsPreview'),duration:2400,controls:false});play();
  });
  skin.addEventListener('change',()=>{if(skin.value.startsWith('pack:'))draft.pack=skin.value.slice(5);else{draft.skin=skin.value;draft.pack=null;}save();});
  for(const input of [speed,motion])input.addEventListener('change',()=>{draft.speed=Number(speed.value);draft.motion=motion.value;save();});
  global.addEventListener('rpg-dice-packs-change',()=>{if(dialog.open){refreshPackOptions();if(global.FantasyDicePacks.error)status.textContent='Проверка оформлений: '+global.FantasyDicePacks.error;}});
  dialog.querySelector('#diceSettingsRoll').onclick=play;dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{if(dialog.open)return;preview?.destroy();preview=null;editingHero=null;button.focus({preventScroll:true});});
})(window);
