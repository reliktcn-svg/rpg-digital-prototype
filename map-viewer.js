/* RPG v0.6.87 — spectator screen. Never loads the gameplay engine or publishes game state. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const MAP=window.MAP_DATA;
  const STORAGE='rpg-map-viewer-v0687';
  const NS='http://www.w3.org/2000/svg';
  const HERO_COLORS={
    warrior:{fill:'#73a8ff',stroke:'#2c5fab'},dwarf:{fill:'#f07a7a',stroke:'#9f2e2e'},
    archer:{fill:'#76d87f',stroke:'#2f8a39'},rogue:{fill:'#5a5a5a',stroke:'#111111'},
    mage:{fill:'#b07be9',stroke:'#6f37aa'}
  };
  const HERO_PALETTE={warrior:'#3f7bd9',dwarf:'#c84a4a',archer:'#3f9d5f',rogue:'#555b63',mage:'#9452c7'};
  const LOC_COLORS={'Таверна':{fill:'#f3d25c',stroke:'#2f8a39'},'Торговец':{fill:'#f3d25c',stroke:'#2d63b4'},'Святилище':{fill:'#f3d25c',stroke:'#b33a3a'},'Древний портал':{fill:'#f3d25c',stroke:'#7d43ba'}};
  const SYMBOLS={'Таверна':'Т','Торговец':'$','Святилище':'С','Древний портал':'П'};
  let creds=null,connection=null,timer=null,fetching=false,lastMap=null,lastLayout='',lastMovement='',lastRevision=-1;
  const tokens=new Map();
  const terrain=$('fieldTerrain'),heroes=$('fieldHeroes');
  const status=$('miniStatus'),statusRoom=$('miniRoom'),login=$('mapLogin'),waiting=$('mapWaiting'),input=$('mapRoomCode');
  const codeFromUrl=new URLSearchParams(location.search).get('code')?.replace(/\D/g,'').slice(0,6)||'';
  input.value=codeFromUrl;
  function svg(name,attrs={}){const e=document.createElementNS(NS,name);for(const [key,val] of Object.entries(attrs))e.setAttribute(key,val);return e}
  function pos(hex){return MAP.hexes[hex]||null}
  function polygon(h,r=49.8){const pts=[];for(let i=0;i<6;i++){const a=i*Math.PI/3;pts.push([h.x+Math.cos(a)*r,h.y+Math.sin(a)*r])}return pts}
  function polyAttr(h,r=49.8){return polygon(h,r).map(([x,y])=>`${x},${y}`).join(' ')}
  function add(parent,element){parent.appendChild(element);return element}
  function line(a,b,attrs={}){return svg('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],...attrs})}
  function areaNeighbor(area,hex,angle){const h=pos(hex);if(!h)return false;return (h.neighbors||[]).some(n=>{
    if(!area.hexes?.includes(n))return false;
    const nh=pos(n);if(!nh)return false;
    const actual=(Math.atan2(nh.y-h.y,nh.x-h.x)*180/Math.PI+360)%360;
    const diff=Math.abs(actual-angle)%360;return Math.min(diff,360-diff)<18;
  })}
  function redrawTerrain(state){
    const key=JSON.stringify([state.territories,state.areas,state.locations,(state.players||[]).filter(p=>p.inDungeon).map(p=>p.hex)]);
    if(key===lastLayout)return;
    lastLayout=key;terrain.replaceChildren();
    for(const [hex,t] of Object.entries(state.territories||{})){
      const h=pos(hex);if(!h)continue;
      const colors=HERO_COLORS[t.owner]||{fill:'#8ea0b7',stroke:'#4a5460'};
      add(terrain,svg('polygon',{points:polyAttr(h,23),class:'territory-marker',fill:colors.fill,stroke:colors.stroke}));
    }
    for(const area of state.areas||[]){
      const colors=HERO_COLORS[area.owner]||{stroke:'#4a5460'};
      for(const hex of area.hexes||[]){
        const h=pos(hex);if(!h)continue;
        const pts=polygon(h,49.8);
        for(let i=0;i<6;i++){
          const normal=(30+i*60)%360;if(areaNeighbor(area,hex,normal))continue;
          const a=pts[i],b=pts[(i+1)%6],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
          const vx=h.x-mx,vy=h.y-my,len=Math.hypot(vx,vy)||1,shift=3;
          add(terrain,line([a[0]+vx/len*shift,a[1]+vy/len*shift],[b[0]+vx/len*shift,b[1]+vy/len*shift],{class:'area-boundary',stroke:colors.stroke}));
        }
        add(terrain,svg('circle',{cx:h.x+30,cy:h.y+21,r:10,class:'area-number-bg',fill:colors.stroke}));
        const t=add(terrain,svg('text',{x:h.x+30,y:h.y+22,class:'area-number-text'}));t.textContent=String(area.ownerAreaNumber||area.id||'');
      }
    }
    for(const [hex,l] of Object.entries(state.locations||{})){
      const h=pos(hex);if(!h)continue;
      const colors=LOC_COLORS[l.name]||{fill:'#f3d25c',stroke:'#8f7740'};
      add(terrain,svg('polygon',{points:polyAttr(h,23),class:'location-marker',fill:colors.fill,stroke:colors.stroke}));
      const t=add(terrain,svg('text',{x:h.x,y:h.y+1,class:'location-text'}));t.textContent=SYMBOLS[l.name]||'●';
    }
    const dungeon=new Set((state.players||[]).filter(p=>p.inDungeon).map(p=>p.hex));
    for(const hex of dungeon){
      const h=pos(hex);if(!h)continue;
      add(terrain,svg('polygon',{points:polyAttr(h,37),class:'dungeon-grate-bg'}));
      for(const dx of [-21,-8,8,21])add(terrain,line([h.x+dx,h.y-24],[h.x+dx,h.y+24],{class:'dungeon-grate-line'}));
      for(const dy of [-15,0,15])add(terrain,line([h.x-27,h.y+dy],[h.x+27,h.y+dy],{class:'dungeon-grate-line'}));
    }
  }
  function createToken(p,x,y){
    const g=svg('g',{'data-token-hero':p.id,class:'tablet-token',transform:`translate(${x} ${y})`});
    const defs=add(g,svg('defs'));const clip=add(defs,svg('clipPath',{id:'viewer-portrait-'+p.id}));add(clip,svg('circle',{cx:0,cy:-3,r:15}));
    add(g,svg('ellipse',{cx:0,cy:16,rx:21,ry:7,fill:'#000',opacity:'.45'}));
    add(g,svg('circle',{cx:0,cy:0,r:19,fill:HERO_PALETTE[p.id]||'#71869c',stroke:'#201b16','stroke-width':3}));
    add(g,svg('image',{href:`assets/heroes/${encodeURIComponent(p.id)}.webp`,x:-15,y:-23,width:30,height:45,preserveAspectRatio:'xMidYMid slice','clip-path':`url(#viewer-portrait-${p.id})`}));
    const label=add(g,svg('text',{x:0,y:19,class:'tablet-token-label'}));label.textContent=p.initial||String(p.name||'').slice(0,1);
    add(heroes,g);
    const entry={g,x,y,hex:p.hex,animation:null};tokens.set(p.id,entry);return entry;
  }
  function movePoint(entry,x,y){entry.x=x;entry.y=y;entry.g.setAttribute('transform',`translate(${x} ${y})`)}
  function animatePath(entry,path,teleport=false,finalPoint=null){
    if(entry.animation)cancelAnimationFrame(entry.animation);
    const origin={x:entry.x,y:entry.y};
    const steps=path.map(hex=>pos(hex)).filter(Boolean).map(h=>({x:h.x,y:h.y}));
    if(!steps.length)return;
    if(finalPoint&&Math.hypot(finalPoint.x-steps.at(-1).x,finalPoint.y-steps.at(-1).y)>0.5)steps.push(finalPoint);
    if(Math.hypot(origin.x-steps[0].x,origin.y-steps[0].y)>1)steps.unshift(origin);
    else steps[0]=origin;
    const segmentCount=Math.max(1,steps.length-1),ms=teleport?320:Math.max(450,segmentCount*470);
    const begin=performance.now();
    function frame(now){
      const t=Math.min(1,(now-begin)/ms),scaled=t*segmentCount,i=Math.min(segmentCount-1,Math.floor(scaled));
      const local=scaled-i,smooth=local*local*(3-2*local);
      const a=steps[i]||origin,b=steps[i+1]||steps.at(-1);
      if(teleport)entry.g.style.opacity=String(t<.5?1-t*1.75:(t-.5)*1.75+.125);
      movePoint(entry,a.x+(b.x-a.x)*smooth,a.y+(b.y-a.y)*smooth);
      if(t<1)entry.animation=requestAnimationFrame(frame);
      else{entry.animation=null;entry.g.style.opacity='';}
    }
    entry.animation=requestAnimationFrame(frame);
  }
  function redrawHeroes(state){
    const groups=new Map();for(const p of state.players||[]){if(pos(p.hex)){const group=groups.get(p.hex)||[];group.push(p);groups.set(p.hex,group)}}
    const next=new Set();
    const move=state.mapLastMove;
    const moveKey=move?`${move.heroId}:${move.at}`:'';
    const novelMove=moveKey&&moveKey!==lastMovement;
    if(moveKey)lastMovement=moveKey;
    for(const [hex,ps] of groups){
      const center=pos(hex),n=ps.length;
      ps.forEach((p,i)=>{
        const angle=n===1?0:Math.PI*2*i/n,dist=n===1?0:18,target={x:center.x+Math.cos(angle)*dist,y:center.y+Math.sin(angle)*dist};
        next.add(p.id);
        let entry=tokens.get(p.id);
        if(!entry)entry=createToken(p,target.x,target.y);
        entry.g.setAttribute('class',`tablet-token${p.id===state.activeHeroId?' active':''}`);
        const border=entry.g.querySelector('circle[stroke]');if(border){border.setAttribute('stroke',p.id===state.activeHeroId?'#f4d491':'#201b16');border.setAttribute('stroke-width',p.id===state.activeHeroId?5:3)}
        const changed=entry.hex!==p.hex||Math.hypot(entry.x-target.x,entry.y-target.y)>1;
        if(changed&&(!entry.animation||entry.hex!==p.hex)){
          let path=null;
          if(novelMove&&move?.heroId===p.id&&Array.isArray(move.path)&&move.path.length>1){
            path=[entry.hex,...move.path.slice(1)].filter(h=>pos(h));
            // If a long-running transit began from another position, begin at the observer's real last position.
            if(path.at(-1)!==p.hex)path.push(p.hex);
          }
          if(!path)path=[entry.hex,p.hex];
          // Multiple heroes occupying the destination share the same hex with slight offset.
          animatePath(entry,path,!!(move?.teleport&&novelMove&&move?.heroId===p.id),target);
        }
        entry.hex=p.hex;
      });
    }
    for(const [id,entry] of tokens){if(!next.has(id)){if(entry.animation)cancelAnimationFrame(entry.animation);entry.g.remove();tokens.delete(id)}}
  }
  function draw(state){if(!state?.ready)return;redrawTerrain(state);redrawHeroes(state);lastRevision=state.revision}
  function saveCreds(obj){try{localStorage.setItem(STORAGE,JSON.stringify(obj))}catch{}}
  function readCreds(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'null');return x?.code&&x.viewerId&&x.viewerSecret?x:null}catch{return null}}
  async function getJson(url,opts={}){
    const r=await fetch(url,{...opts,cache:'no-store'});let data={};try{data=await r.json()}catch{}
    if(!r.ok){const e=new Error(data.error||`Ошибка сервера (${r.status})`);e.status=r.status;throw e}
    return data;
  }
  function setError(message){$('mapError').textContent=message||''}
  function setConnected(ok){status.classList.toggle('disconnected',!ok);statusRoom.textContent=`Комната ${connection?.code||creds?.code||''}${ok?'':' · нет связи'}`}
  async function join(code){
    const r=await getJson(`/api/rooms/${code}/map/join`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    creds={code,viewerId:r.viewerId,viewerSecret:r.viewerSecret};saveCreds(creds);return creds;
  }
  async function pull(){
    if(!connection||fetching)return;
    fetching=true;
    try{
      const q=new URLSearchParams({viewerId:connection.viewerId,viewerSecret:connection.viewerSecret});
      const data=await getJson(`/api/rooms/${connection.code}/map?${q}`);
      setConnected(true);lastMap=data;
      if(data.ready){waiting.hidden=true;draw(data)}
      else waiting.hidden=false;
    }catch(e){
      if(e.status===403){try{connection=await join(connection.code);return await pullAgain()}catch(err){e=err}}
      setConnected(false);
      if(e.status===404){stop();login.hidden=false;waiting.hidden=true;setError('Комната закрылась или не найдена. Уточните код и подключитесь снова.')} 
    }finally{fetching=false}
  }
  async function pullAgain(){const q=new URLSearchParams({viewerId:connection.viewerId,viewerSecret:connection.viewerSecret});const d=await getJson(`/api/rooms/${connection.code}/map?${q}`);setConnected(true);if(d.ready){waiting.hidden=true;draw(d)}else waiting.hidden=false}
  function stop(){if(timer)clearInterval(timer);timer=null;connection=null}
  async function connect(code){
    if(code.length!==6){setError('Введите 6 цифр кода комнаты.');return}
    $('mapConnect').disabled=true;setError('Подключаем карту…');
    try{
      const stored=readCreds();connection=stored?.code===code?stored:await join(code);
      // Check a saved observer token before dismissing login. A stale token can be replaced.
      try{const q=new URLSearchParams({viewerId:connection.viewerId,viewerSecret:connection.viewerSecret});await getJson(`/api/rooms/${code}/map?${q}`)}
      catch(e){if(e.status!==403)throw e;connection=await join(code)}
      setError('');login.hidden=true;status.hidden=false;setConnected(true);
      history.replaceState(null,'',`map.html?code=${encodeURIComponent(code)}`);
      stopTimerOnly();timer=setInterval(pull,650);await pull();
    }catch(e){setError(e.message);connection=null}
    finally{$('mapConnect').disabled=false}
  }
  function stopTimerOnly(){if(timer)clearInterval(timer);timer=null}
  $('mapConnect').onclick=()=>connect(input.value.replace(/\D/g,'').slice(0,6));
  input.addEventListener('input',()=>input.value=input.value.replace(/\D/g,'').slice(0,6));
  input.addEventListener('keydown',e=>{if(e.key==='Enter')$('mapConnect').click()});
  $('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{})};
  // Preserve the previous spectator connection on refresh, without taking a hero slot.
  const saved=readCreds();if(codeFromUrl.length===6)connect(codeFromUrl);
  else if(saved?.code){input.value=saved.code;connect(saved.code)}
})();
