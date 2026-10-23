/* Appearance only. Motion and dice values never depend on this registry. */
(function(root){
  'use strict';
  let defaultId='classic';
  const skins=new Map(),defaults={face:[35,43,49],rim:['#ddc49a','#897451','#b69a6d','#3b342c'],number:'#e5dfd0',numberSelected:'#fff2c9',numberOutline:'#04070a',font:'Georgia, "Times New Roman", serif',inset:.86,grain:.055,wear:0,texture:null,textureOpacity:.75};
  function register(id,definition){
    if(typeof id!=='string'||!id.trim()||!definition||typeof definition!=='object')throw new TypeError('A skin ID and definition are required');
    const s={...defaults,...definition};
    if(!Array.isArray(s.face)||s.face.length!==3||!s.face.every(n=>Number.isFinite(n)&&n>=0&&n<=255))throw new TypeError('face must be RGB [0..255,0..255,0..255]');
    if(!Array.isArray(s.rim)||s.rim.length!==4||!s.rim.every(c=>typeof c==='string'))throw new TypeError('rim requires four CSS colors');
    for(const key of ['number','numberSelected','numberOutline','font'])if(typeof s[key]!=='string')throw new TypeError(key+' must be text');
    for(const key of ['inset','grain','wear','textureOpacity'])if(!Number.isFinite(s[key])||s[key]<0||s[key]>1)throw new TypeError(key+' must be 0..1');
    if(s.texture&&!((s.texture.width||s.texture.naturalWidth)>0))throw new TypeError('Load texture via load() before registering');
    const skin=Object.freeze({...s,id,face:Object.freeze(s.face.slice()),rim:Object.freeze(s.rim.slice())});skins.set(id,skin);return skin;
  }
  function get(id='classic'){if(!skins.has(id))throw new RangeError('Unknown dice skin: '+id);return skins.get(id);}
  async function load(id,definition){
    const s={...definition};if(s.textureUrl){
      const img=new Image();img.crossOrigin='anonymous';
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Cannot load dice texture: '+s.textureUrl));img.src=s.textureUrl;});
      s.texture=img;delete s.textureUrl;
    }
    return register(id,s);
  }
  register('classic',{});
  register('satin-red',{face:[150,19,28],rim:['#e0e4e6','#8b969e','#c7cdd1','#525c65'],number:'#171b20',numberSelected:'#171b20',numberOutline:'#899299',grain:.025});
  register('worn-crimson',{face:[114,21,33],rim:['#636464','#25292b','#424649','#14191b'],number:'#f2eee5',numberSelected:'#fffaf0',numberOutline:'#381117',grain:.04,wear:.12});
  root.FantasyDiceSkins=Object.freeze({register,load,get,list:()=>[...skins.keys()],get defaultId(){return defaultId},setDefault(id){get(id);defaultId=id;}});
  // Change this line to choose the game's skin; animation files stay unchanged.
  root.FantasyDiceSkins.setDefault('classic');
})(typeof window!=='undefined'?window:globalThis);
