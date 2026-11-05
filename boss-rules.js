/* Persistent, party-wide boss generation and clue deck rules. */
(function(root){
'use strict';
const types=['Человек','Зверь','Демон','Чудовище','Проклятый','Маг','Культист','Насекомое','Растение'];
const keys=['human','beast','demon','monster','cursed','mage','cultist','insect','plant'];
const pairs=[[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[1,2],[1,4],[1,7],[1,8],[2,4],[2,5],[2,7],[2,8],[3,4],[3,8],[4,5],[4,6],[4,7],[4,8],[5,6],[7,8]];
const variants=[...types.map((_,i)=>[i]),...pairs].map(a=>({key:a.map(i=>keys[i]).join('_'),types:a.map(i=>types[i])}));
const clues=[['Тип',2],['ЗД',4],['ЗЩ',7],['АТ',9],['УР',12],['Эффект',15]];
const effects={
 bleed:{text:'19–20 — Кровотечение.'},poison:{text:'19–20 — Яд.'},burn:{text:'19–20 — Горение.'},stun:{text:'Натуральная 20 — Оглушение.'},curse:{text:'19–20 — Проклятие.'},fear:{text:'19–20 — Страх.'},weak:{text:'19–20 — Слабость.'},fatigue:{text:'19–20 — Усталость.'},dark:{text:'Тёмный удар: каждая 3-я успешная атака наносит дополнительно D4 урона.'}
};
const pools={'Человек':['dark','stun','bleed'],'Зверь':['bleed','fear','dark'],'Демон':['burn','curse','dark'],'Чудовище':['bleed','stun','dark'],'Проклятый':['curse','weak','dark'],'Маг':['burn','stun','curse'],'Культист':['curse','fear','dark'],'Насекомое':['poison','weak','bleed'],'Растение':['poison','fatigue','stun']};
function generate(random=Math.random){
 const pick=a=>a[Math.floor(random()*a.length)],v=pick(variants),band=pick([50,60,70]),selected=[];
 for(const type of v.types){const pool=pools[type].filter(k=>!selected.includes(k));selected.push(pick(pool))}
 if(v.types.length===1&&random()<.5)selected.push(pick(pools[v.types[0]].filter(k=>!selected.includes(k))));
 return {schema:1,key:v.key,types:[...v.types],hpBand:band,hp:band+Math.floor(random()*11),defense:pick([16,17,18]),attack:pick([6,7,8]),damage:pick(['D10','D12','2D8']),effectKeys:selected,effectText:selected.map(k=>effects[k].text).join(' '),immunities:[],found:[],injected:[],heartUnlocked:false};
}
const ids=index=>[489+index*2,490+index*2];
const clueIndex=id=>Number(id)>=489&&Number(id)<=500?Math.floor((Number(id)-489)/2):-1;
function clueCards(){return clues.flatMap(([name],i)=>ids(i).map((id,j)=>({id,name:'Сведения о Владыке · '+name,category:'Подсказка Владыки',deck:j?'Исследования Сердца тьмы':'Исследования внешних регионов',bossClueIndex:i,fields:{'Подсказка':name,'Описание':'Раскрывает сведения для всех героев. Исследование продолжается.'}})))}
function removeClue(state,index){for(const deck of Object.values(state.decks||{}))for(const part of ['draw','discard'])if(Array.isArray(deck[part]))deck[part]=deck[part].filter(id=>!ids(index).includes(Number(id)))}
function inject(state,level,shuffle){const b=state.boss;if(!b||b.legacy)return false;const next=b.found.length;if(next>=6||level<clues[next][1]||b.injected.includes(next))return false;
 for(const [j,key] of ['exploreOuter','exploreHeart'].entries()){const d=state.decks[key];if(!d)return false}
 b.injected.push(next);for(const [j,key] of ['exploreOuter','exploreHeart'].entries()){state.decks[key].draw.push(ids(next)[j]);state.decks[key].draw=shuffle(state.decks[key].draw)}return true;
}
function reveal(state,index){const b=state.boss;if(!b||b.legacy||index!==b.found.length||!b.injected.includes(index))return false;b.found.push(index);b.heartUnlocked=b.found.length>=4;removeClue(state,index);b.clueRecords=b.clueRecords||{};b.clueRecords[index]=clueRecord(b,index);return true}
function values(b){return [b.types.join(' + '),String(b.hp),String(b.defense),'+'+b.attack,b.damage,b.effectText]}
function view(b){return values(b).map((v,i)=>b.legacy||b.found.includes(i)?v:'—')}
function clueRecord(b,index){
 const L=root.RPGBossLore;if(!L)return {index,title:clues[index][0],text:'',value:values(b)[index]};
 b.hpBand=b.hpBand|| (b.hp<=60?50:b.hp<=70?60:70);
 const texts=[L.types[variants.findIndex(v=>v.key===b.key)]||'Древняя летопись хранит свидетельство о Владыке.',L.hp[(b.hpBand-50)/10],L.defense[b.defense-16],L.attack[b.attack-6],L.damage[['D10','D12','2D8'].indexOf(b.damage)],(b.effectKeys||[]).map(k=>L.effects[k]).filter(Boolean).join('\n\n')];
 const assessment=['',['Здоровье — относительно невысокое','Здоровье — среднее','Здоровье — высокое'][(b.hpBand-50)/10],['Защита — относительно низкая','Защита — средняя','Защита — высокая'][b.defense-16],['Точность атаки — относительно невысокая','Точность атаки — высокая','Точность атаки — исключительная'][b.attack-6],['Урон — относительно невысокий','Урон — высокий','Урон — очень высокий'][['D10','D12','2D8'].indexOf(b.damage)],''][index]||'';
 return {index,title:L.titles[index],text:texts[index]||'',assessment,parameter:clues[index][0],value:values(b)[index],found:true};
}
function foundRecords(b){b.clueRecords=b.clueRecords||{};return b.found.map(i=>b.clueRecords[i]||(b.clueRecords[i]=clueRecord(b,i)))}
function card(b){return {id:281,name:'Владыка Сердца Тьмы',category:'Босс',deck:'Финальный босс',bossKey:b.key,generatedBoss:!b.legacy,effectKeys:b.effectKeys,fields:{'Ранг':'босс','Тип':b.types.join(' + '),'ЗД':String(b.hp),'ЗЩ':String(b.defense),'АТК':'+'+b.attack,'Урон':b.damage,'Эффект':b.effectText,'Иммунитет':(b.immunities||[]).join(', '),'Золото':'0','Тайники':'0; МУД 13+ — +1 тайник.'}}}
root.RPGBoss={types,variants,clues,effects,pools,generate,ids,clueIndex,clueCards,inject,reveal,removeClue,values,view,card,clueRecord,foundRecords};
})(typeof window==='undefined'?globalThis:window);
