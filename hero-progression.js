/* Atlas-backed rules. Descriptions remain in the editable atlas HTML. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.RPGProgression=api;api.load(root.RPG_HERO_ATLAS)}})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const names={warrior:'Воин',dwarf:'Дворф',archer:'Лучник',rogue:'Разбойник',mage:'Маг',paladin:'Паладин'},statusNames=['Кровотечение','Яд','Горение','Оглушение'],statusKeys=['bleeding','poison','burning','stun'];
let project=null,revision=0,heroes=new Map();
function load(data){
 if(!data||data.version!==1||!Array.isArray(data.characters))throw Error('Неверный формат атласа');
 const next=new Map(),ids=new Set();
 for(const h of data.characters){
  const heroId=Object.keys(names).find(id=>names[id].toLowerCase()===String(h.name).trim().toLowerCase());
  if(!Array.isArray(h.abilities))throw Error('В атласе отсутствуют ветки');
  const branches=h.abilities.map((a,i)=>{
   if(!a.id||ids.has(a.id)||!Array.isArray(a.nodes))throw Error('Некорректный ID ветки');ids.add(a.id);
   const kind=/регенерац/i.test(a.name)?'regeneration':/натуральн/i.test(a.name)?'natural':/сопротив/i.test(a.name)?'resistance':'ability';
   const status=kind==='resistance'?(/кров/i.test(a.name)?0:/яд/i.test(a.name)?1:/гор/i.test(a.name)?2:/оглуш/i.test(a.name)?3:-1):-1;
   const nodes=a.nodes.map(n=>{if(!n.id||ids.has(n.id)||typeof n.description!=='string')throw Error('Некорректная карточка атласа');ids.add(n.id);return {...n,branchId:a.id,kind,status}}),map=new Map(nodes.map(n=>[n.id,n]));
   for(const n of nodes){let q=n,seen=new Set();n.level=1;while(q.parent){if(seen.has(q.id)||!map.has(q.parent))throw Error('Некорректная связь в атласе');seen.add(q.id);n.level++;q=map.get(q.parent)}}
   return {...a,kind,status,nodes};
  });
  if(heroId)next.set(heroId,{...h,gameId:heroId,branches,nodes:branches.flatMap(a=>a.nodes)});
 }
 heroes=next;project=data;revision++;return data;
}
function hero(id){return heroes.get(id)||null}
const BALANCE_VERSION=2;
function ensure(p){if(!p)return;const xp=Number(p.masteryPoints);p.masteryPoints=Number.isSafeInteger(xp)&&xp>=0?xp:0;if(!Array.isArray(p.learnedAbilities))p.learnedAbilities=[];p.learnedAbilities=[...new Set(p.learnedAbilities.filter(id=>typeof id==='string'))];
 if(p.progressionVersion!==BALANCE_VERSION){const old=p.masteryPoints,bosses=Math.min(Math.floor(old/12),Math.max(0,Math.floor(Number(p.stats?.enemies?.boss)||0)));p.masteryPoints=old*50+bosses*200;p.progressionVersion=BALANCE_VERSION;}
}
const threshold=level=>{const n=Math.max(0,Math.floor(level)-1);return 25*n*(n+9)};
const levelForXp=xp=>1+Math.floor((Math.sqrt(81+.16*Math.max(0,xp))-9)/2);
function cost(n){if(!n)return 0;if(n.kind==='regeneration')return n.level;if(n.kind==='resistance')return n.level>=3?2:1;return n.level<=1?0:n.level===2?1:n.level<=4?2:3}
function pointLabel(n){const a=n%100,b=n%10;return n+' '+(a>=11&&a<=14?'очков':b===1?'очко':b>=2&&b<=4?'очка':'очков')}
function info(p){ensure(p);const xp=p?.masteryPoints||0,level=levelForXp(xp),spent=(p?.learnedAbilities||[]).reduce((sum,id)=>sum+cost(node(p,id)),0);return {level,xp,next:threshold(level+1),floor:threshold(level),earned:level-1,spent,points:Math.max(0,level-1-spent)}}
function baseNodes(id){return (hero(id)?.branches||[]).filter(a=>['ability','natural'].includes(a.kind)).flatMap(a=>a.nodes.filter(n=>!n.parent).slice(0,1))}
function unlocked(p){ensure(p);return new Set([...baseNodes(p?.id).map(n=>n.id),...(p?.learnedAbilities||[])])}
function node(p,id){return hero(p?.id)?.nodes.find(n=>n.id===id)||null}
function canLearn(p,id){const n=node(p,id),h=hero(p?.id);if(!n||!h)return {ok:false,reason:'Карточка отсутствует в атласе'};const known=unlocked(p);if(n.kind==='regeneration'&&info(p).level<n.level*2+1)return {ok:false,reason:'Требуется '+(n.level*2+1)+' уровень героя'};if(known.has(id))return {ok:false,reason:'Уже изучено'};
 if(n.parent&&!known.has(n.parent))return {ok:false,reason:'Сначала изучите предыдущую ступень этой ветки'};
 const branch=h.branches.find(a=>a.id===n.branchId),ancestors=new Set();let q=n;while(q.parent){ancestors.add(q.parent);q=branch.nodes.find(x=>x.id===q.parent)}
 if(branch.nodes.some(x=>known.has(x.id)&&!ancestors.has(x.id)))return {ok:false,reason:'В этой ветке уже выбран другой путь'};
 if(info(p).points<cost(n))return {ok:false,reason:'Нужно '+pointLabel(cost(n))+' способности'};return {ok:true,reason:''};
}
function learn(p,id){const result=canLearn(p,id);if(!result.ok)return result;p.learnedAbilities.push(id);return {ok:true,...info(p)}}
function selected(p,kind,status=-1){const branch=hero(p?.id)?.branches.find(a=>a.kind===kind&&(kind!=='resistance'||a.status===status));if(!branch)return null;const known=unlocked(p);return branch.nodes.filter(n=>known.has(n.id)).sort((a,b)=>b.level-a.level)[0]||null}
function reward(enemy,combat={}){const rank=String(enemy?.fields?.['Ранг']||''),type=String(enemy?.fields?.['Тип']||'');if(/мини[\s-]*босс/i.test(rank+' '+type))return 600;if(combat.isBoss||enemy?.id===281)return 800;if(combat.elite||/элит|эпич/i.test(rank))return 400;if(/силь/i.test(rank))return 250;if(/обыч/i.test(rank))return 150;return 100}
function award(p,enemy,combat){ensure(p);if(combat?.masteryAwarded)return {amount:0,levels:0,...info(p)};const before=info(p),amount=reward(enemy,combat);p.masteryPoints+=amount;if(combat)combat.masteryAwarded=true;const after=info(p);return {...after,amount,levels:after.level-before.level}}
function roman(value){let n=Math.max(1,Math.floor(value)),s='';for(const [v,t] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){s+=t;n-=v}return s}
function chance(percent){if(percent>=100)return {sides:0,success:[],actual:100};if(percent===75)return {sides:6,success:[5,6],actual:100/3};if(percent===50)return {sides:4,success:[3,4],actual:50};return {sides:100,success:Array.from({length:Math.max(0,Math.min(100,percent))},(_,i)=>i+1),actual:percent}}
function rules(n){if(!n)return null;const text=n.description.replace(/\s+/g,' ').trim(),body=text.replace(/\(проверка[^)]+\)/gi,''),dice=body.match(/\b(\d*D\d+)\b/i)?.[1]?.toUpperCase()||null,percent=Number(text.match(/(\d+)\s*%/)?.[1]||0);const effect=/оглуш/i.test(text)?'Оглушение':/кровотеч/i.test(text)?'Кровотечение':/яд/i.test(text)?'Яд':/горени/i.test(text)?'Горение':null;
 const result={dice,healingRatio:/лечени[^.]*половин/i.test(text)?0.5:1,fixedReduction:Number(text.match(/защита\s+(\d+)(?!\d|D)/i)?.[1]||0),multiplier:Number(text.match(/D\d+\s*[хx×]\s*(\d+)/i)?.[1]||1),attackBonus:Number(text.match(/\+\s*(\d+)\s*к атаке/i)?.[1]||0),defenseBonus:Number(text.match(/\+\s*(\d+)\s*к защите/i)?.[1]||0),turns:Number(text.match(/на\s*(\d+)\s*ход/i)?.[1]||1),cleanse:/снять один|снять 1/i.test(text),enemyDisadvantage:Number(text.match(/(\d+)\s*атак[аи].*помех/i)?.[1]||0),effect,percent,chance:effect&&percent?chance(percent):null};
 const check=text.match(/проверка\s+D(\d+):\s*успех\s+([\d\s,–-]+)/i);if(check){const range=check[2].match(/(\d+)\s*[–-]\s*(\d+)/);result.chance={sides:Number(check[1]),success:range?Array.from({length:Number(range[2])-Number(range[1])+1},(_,i)=>Number(range[1])+i):(check[2].match(/\d+/g)||[]).map(Number)}}else if(/без проверки/i.test(text))result.chance={sides:0,success:[]};
 if(n.kind==='resistance'){
  const sides=Number(dice?.replace(/^\d*D/,'')),tail=text.split(/выпало/i)[1]?.split(/эффект/i)[0]||'',range=tail.match(/(\d+)\s*[-–]\s*(\d+)/),success=range?Array.from({length:Math.max(0,Number(range[2])-Number(range[1])+1)},(_,i)=>Number(range[1])+i):(tail.match(/\d+/g)||[]).map(Number);
  result.resistance={immune:percent===100||/полное сопротивление|иммунитет/i.test(text),sides,success:success.filter(v=>v>=1&&v<=sides)};
 }
 return result;
}
function icon(p,n){const name=n.kind==='ability'?p.id:n.kind==='natural'?'natural20':n.kind==='regeneration'?'regeneration':'resistance-'+statusKeys[n.status];return 'assets/ability-icons/'+name+'-'+n.level+'.png'}
function checkNote(n){const r=rules(n);if(r?.resistance?.immune)return 'Эффект предотвращается без броска.';if(r?.chance){const c=r.chance;return c.sides?'Проверка: D'+c.sides+'; успех '+c.success.join(', ')+'.':'Эффект накладывается без проверки.'}if(r?.resistance)return 'Проверка: D'+r.resistance.sides+'; эффект предотвращён на '+r.resistance.success.join(', ')+'.';return ''}
return {load,hero,ensure,info,threshold,levelForXp,cost,pointLabel,BALANCE_VERSION,baseNodes,unlocked,node,canLearn,learn,selected,reward,award,roman,rules,chance,icon,checkNote,statusNames,get revision(){return revision},get project(){return project}};
});
