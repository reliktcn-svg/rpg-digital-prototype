const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
function engine(seed=1){
 let rng=seed>>>0;const random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296};
 const noop=()=>{};const element=()=>({hidden:true,value:'',innerHTML:'',textContent:'',dataset:{},style:{setProperty:noop},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},querySelector:()=>null,querySelectorAll:()=>[],appendChild:noop,addEventListener:noop,setAttribute:noop,removeAttribute:noop,remove:noop,getBoundingClientRect:()=>({width:1000,height:700}),contains:()=>false});
 const doc={getElementById:()=>element(),createElement:element,body:element(),documentElement:element(),querySelector:()=>null,querySelectorAll:()=>[],addEventListener:noop,createTreeWalker:()=>({nextNode:()=>null})};
 const ctx={console,document:doc,navigator:{},location:{protocol:'file:',search:''},localStorage:{getItem:()=>null,setItem:noop},sessionStorage:{getItem:()=>null,setItem:noop},setTimeout:()=>1,clearTimeout:noop,setInterval:()=>1,clearInterval:noop,queueMicrotask:noop,requestAnimationFrame:noop,MutationObserver:class{observe(){}},NodeFilter:{SHOW_TEXT:4,FILTER_ACCEPT:1,FILTER_REJECT:2},Node:{TEXT_NODE:3},matchMedia:()=>({matches:false,addEventListener:noop}),addEventListener:noop,dispatchEvent:noop,CustomEvent:class{},Math:Object.assign(Object.create(Math),{random}),performance:{now:()=>0},alert:noop,confirm:()=>false,URLSearchParams,structuredClone};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
 for(const f of ['map-data.js','location-placement.js','cards-data.js','hero-atlas-data.js','hero-progression.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
 // Headless adapter: retain production combat/rules, omit browser startup and presentation only.
 let source=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');const debug=source.match(/  window\.__RPG_DEBUG__=.*;\n/)[0];source=source.slice(0,source.indexOf('  if(els.rollPopupClose)'));
 const noops=['renderCombat','updateUI','renderBoard','renderJournal','renderCharacterSheet','closeModal','log','combatPush','showRollPopup','showHeroRollPopup','showStatusCheckPopup','announceCheck','scheduleCombatAuto','syncCombatStunNotice'];
 source+='\n'+noops.map(n=>n+'=()=>{};').join('\n')+`\ncombatVictory=()=>{state.combat.phase='sim_win'};
 const originalDeath=combatHeroDeath;combatHeroDeath=reason=>{const p=currentPlayer();if(fullSetEquipped(p,'Феникса')&&!combatUsed('set:Феникса'))return originalDeath(reason);state.combat.phase='sim_loss';return true};
 window.SIM={startCombatStun,resolveHeroEffectCheck,combatTickBuffsAtHeroAttack,chooseMageNat20,skipCombatChoice,passiveHeroDamageReduction,modifierSources,heal,heroAbilityAttackProfile};\n`+debug+'})();';
 vm.runInContext(source,ctx,{filename:'app.headless.js'});return ctx;
}
module.exports={engine,ROOT};
if(require.main===module){try{const c=engine();console.log(Object.keys(c).filter(x=>/atlas/i.test(x)),c.__RPG_DEBUG__.HEROES.length)}catch(e){console.error(e.stack);process.exit(1)}}
