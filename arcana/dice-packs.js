/* Independent data-only dice packs. Names are editable; IDs are persistent. */
(function(global){
  'use strict';
  const catalogURL=new URL('api/dice-packs',document.baseURI).href,idPattern=/^[a-z0-9][a-z0-9_-]{0,63}$/;
  let packs=new Map(),byPath=new Map(),run=0,error='';
  function fingerprint(bytes){let a=2166136261,b=5381;for(const n of bytes){a=Math.imul(a^n,16777619);b=Math.imul(b,33)^n;}return (a>>>0).toString(16)+(b>>>0).toString(16);}
  async function imageAt(url){
    const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Не найден файл '+url.pathname.split('/').pop());
    const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>8*1024*1024)throw Error('Изображение больше 8 МБ');
    const blobURL=URL.createObjectURL(new Blob([bytes]));const image=new Image();
    try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Не удалось прочитать изображение'));image.src=blobURL;});}finally{URL.revokeObjectURL(blobURL);}
    if(image.naturalWidth!==1024||image.naturalHeight!==1024)throw Error('Слои должны быть 1024 × 1024');
    return {image,hash:fingerprint(bytes)};
  }
  async function loadPack(source){
    const url=new URL(source,document.baseURI);
    if(url.origin!==location.origin)throw Error('Набор должен находиться на сервере игры');
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw Error('Не удалось прочитать pack.json');
    const raw=await response.text();if(raw.length>32768)throw Error('Слишком большой pack.json');const manifest=JSON.parse(raw);
    if(manifest.format!=='rpg-dice-skin-v1'||typeof manifest.id!=='string'||!idPattern.test(manifest.id)||typeof manifest.name!=='string'||!manifest.name.trim()||manifest.name.length>80||!manifest.faces||Array.isArray(manifest.faces)||typeof manifest.faces!=='object')throw Error('Неверный формат pack.json');
    const faces={},hashes=[];
    await Promise.all(Object.entries(manifest.faces).map(async([sides,definition])=>{
      if(!['4','6','8','10','12','20'].includes(sides)||!definition||typeof definition!=='object')throw Error('Неизвестная форма кубика');
      if(!definition.face&&!definition.rim)throw Error('Укажите слой face или rim');
      const layers={};
      await Promise.all(['face','rim'].map(async(part)=>{
        if(definition[part]===undefined)return;
        if(typeof definition[part]!=='string'||!/^[-a-zA-Z0-9_]+\.(png|webp)$/i.test(definition[part]))throw Error('Недопустимое имя файла слоя');
        const loaded=await imageAt(new URL(definition[part],url));layers[part]=loaded.image;hashes.push(sides+part+loaded.hash);
      }));faces[sides]=Object.freeze(layers);
    }));
    if(!Object.keys(faces).length)throw Error('Набор не содержит ни одной формы');
    return Object.freeze({id:manifest.id,name:manifest.name.trim(),revision:hashes.sort().join('-'),faces:Object.freeze(faces)});
  }
  async function refresh(source=catalogURL){
    const ticket=++run;
    try{
      const url=new URL(source,document.baseURI);if(url.origin!==location.origin)throw Error('Каталог должен находиться на сервере игры');
      const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Каталог недоступен. Запустите игру через её server.py');
      const raw=await response.text();if(raw.length>262144)throw Error('Слишком большой каталог');
      const catalog=JSON.parse(raw);
      if(catalog.format!=='rpg-dice-catalog-v1'||!Array.isArray(catalog.packs)||catalog.packs.some(p=>typeof p!=='string'||!/^assets\/dice\/packs\/[a-z0-9][a-z0-9_-]{0,63}\/pack\.json$/.test(p)))throw Error('Неверный каталог кубиков');
      const paths=[...new Set(catalog.packs)],nextByPath=new Map(),problems=[];
      // Bound decode concurrency: a new collection must not freeze a phone.
      let cursor=0;
      await Promise.all(Array.from({length:Math.min(2,paths.length)},async()=>{
        while(cursor<paths.length){const path=paths[cursor++];try{nextByPath.set(path,await loadPack(path));}
          catch(e){if(byPath.has(path))nextByPath.set(path,byPath.get(path));problems.push(path.split('/').slice(-2,-1)[0]+': '+e.message);}}
      }));
      const groups=new Map();for(const [path,pack] of nextByPath){if(!groups.has(pack.id))groups.set(pack.id,[]);groups.get(pack.id).push([path,pack]);}
      const next=new Map();
      for(const [id,entries] of groups){if(entries.length===1)next.set(id,entries[0][1]);else{problems.push('Повторяется ID '+id+' — у каждого набора должен быть свой ID');for(const [path] of entries)nextByPath.delete(path);}}
      if(ticket===run){packs=next;byPath=nextByPath;error=problems.join('; ');global.dispatchEvent(new Event('rpg-dice-packs-change'));}
    }catch(e){if(ticket===run){error=e.message;global.dispatchEvent(new Event('rpg-dice-packs-change'));}}
    return list();
  }
  function list(){return [...packs.values()].sort((a,b)=>a.name.localeCompare(b.name,'ru')||a.id.localeCompare(b.id));}
  global.FantasyDicePacks=Object.freeze({refresh,list,get:id=>packs.get(id)||null,get error(){return error;}});
  global.FantasyDicePacks.refresh();
})(window);
