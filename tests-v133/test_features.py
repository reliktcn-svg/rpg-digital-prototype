from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
scripts=[]
for m in re.finditer(r'<script\b([^>]*)>(.*?)</script>',html,re.S|re.I):
 src=re.search(r'\bsrc=["\']([^"\']+)',m.group(1))
 name=src.group(1).split('?')[0] if src else 'inline'
 if name in ('network-lobby.js','update-client.js'):continue
 scripts.append((name,(root/name).read_text() if src else m.group(2)))
html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S|re.I)
html=re.sub(r'<link\b[^>]*>','',html,flags=re.I)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 pg=browser.new_page(viewport={'width':360,'height':800},is_mobile=True,has_touch=True)
 pg.on('dialog',lambda d:d.accept())
 errors=[]
 pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto('about:blank');pg.set_content(html)
 pg.evaluate("""()=>{let map=new Map;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}})}""")
 for name,code in scripts:pg.add_script_tag(content=code)
 pg.evaluate("window.__RPG_DEBUG__.startGame(['warrior'])")
 D='window.__RPG_DEBUG__'
 print('initial',pg.evaluate(f"()=>{{let d={D},s=d.getState(),p=d.currentPlayer();return {{version:s.version,level:window.RPGProgression.info(p).level,hero:p.name,boss:s.boss?.schema,started:s.started}}}}"))
 result=pg.evaluate(f"""()=>{{const d={D},s=d.getState(),p=d.currentPlayer(),P=window.RPGProgression;
 p.masteryPoints=P.threshold(16);p.gold=87;p.backpack=[155,179];p.equipment.armor=154;p.currentHp=23;p.maxHp=39;
 s.territories[p.hex]={{owner:p.id}};s.gameOver={{winnerId:p.id,heroName:p.name,round:5,personalTurn:18}};d.updateActionPanel();
 return {{buttons:[...document.querySelectorAll('#actionPanel button')].map(x=>x.textContent.trim()),level:P.info(p).level,hitpoints:p.maxHp}}}}""")
 print('before',result)
 assert any('Новая игра +' in x for x in result['buttons']),result
 outcome=pg.evaluate(f"""()=>{{let d={D},p=d.currentPlayer(),s=d.getState(),C=d.CARD_BY_ID[1];
 let old={{level:window.RPGProgression.info(p).level,exp:p.masteryPoints,gold:p.gold,items:p.backpack.slice(),boss:s.boss?.type}};
 let result=d.startNewGamePlus({{confirmed:true}}),np=d.currentPlayer(),ns=d.getState();
 let enemyLevel1=d.scaledEnemy(C,16).fields,enemyLevel2=d.scaledEnemy(C,17).fields;
 return {{ok:result,old,version:ns.version,cycle:ns.ngPlusCycle,level:window.RPGProgression.info(np).level,startLevel:ns.ngPlusStartLevels[np.id],gold:np.gold,items:np.backpack,maxHp:np.maxHp,curHp:np.currentHp,territories:Object.keys(ns.territories).length,areas:ns.areas.length,found:ns.boss.found,gameOver:ns.gameOver,enemyLevel1,enemyLevel2}}}}""")
 print('NG PLUS',json.dumps(outcome,ensure_ascii=False,indent=2))
 assert outcome['ok'] and outcome['cycle']==1
 assert outcome['gold']==outcome['old']['gold']+150
 assert outcome['level']==16 and outcome['startLevel']==16
 assert outcome['maxHp']<39 and outcome['maxHp']==outcome['curHp']
 assert outcome['territories']==0 and outcome['areas']==0 and not outcome['found']
 assert outcome['enemyLevel2']['ЗД']==outcome['enemyLevel1']['ЗД']+1
 assert outcome['enemyLevel2']['ЗЩ']==outcome['enemyLevel1']['ЗЩ']
 # Candidates used marker
 pg.evaluate(f"""()=>{{const d={D},p=d.currentPlayer();p.backpack=[155];d.setSlotId(p,'armor',154);p.itemUsage={{155:{{reset:['shrine']}}}};d.openCharacterSheet('inventory')}}""")
 pg.locator('[data-slot="armor"]').click(force=True)
 print('replace marker',pg.locator('.replace-used-check').all_text_contents())
 # Immune status no die.
 pg.evaluate(f"""()=>{{const d={D},s=d.getState(),p=d.currentPlayer();const immuneCard=window.CARDS_DATA.find(c=>/Яд/.test(c.fields?.['Иммунитет']||'') && c.fields?.['Категория']==='Враг');if(!immuneCard)throw Error('no poison immune enemy');d.combatStart(immuneCard);const c=s.combat;c.queuedHeroEffects=[{{effect:'Яд',chance:{{sides:6,success:[5,6]}}}}];c.effectContinuation='hero_turn';d.advanceHeroEffectSequence()}}""")
 print('immunity modal',pg.locator('#rpgEnemyImmunityNotice').inner_text())
 assert pg.locator('#rpgEnemyImmunityNotice').is_visible()
 assert 'иммунитет к «Яд»' in pg.locator('#rpgEnemyImmunityNotice').inner_text()
 assert pg.evaluate(f"{D}.getState().combat.pendingEffectCheck")==None
 pg.locator('#rpgEnemyImmunityNotice button').click(force=True)
 assert not pg.locator('#rpgEnemyImmunityNotice').is_visible()
 # Escape confirmation — precombat
 pg.evaluate(f"""()=>{{const d={D},c=d.getState().combat;c.phase='pre';d.requestCombatEscape('before')}}""")
 print('escape phase',pg.locator('.combat-escape-confirm').all_text_contents())
 assert 'Вы точно хотите попытаться сбежать?' in pg.locator('.combat-escape-confirm').inner_text()
 pg.locator('#combatEscapeNo').click(force=True)
 assert pg.evaluate(f"{D}.getState().combat.escapeConfirmation")==None
 assert pg.evaluate(f"{D}.getState().combat.phase")=='pre'
 pg.evaluate(f"{D}.requestCombatEscape('before')")
 assert pg.locator('#combatEscapeYes').is_visible()
 # Three connected purchased territories should never offer a merge if underfunded.
 area=pg.evaluate(f"""()=>{{const d={D},s=d.getState(),p=d.currentPlayer();s.combat=null;s.territories={{'ТК01':{{owner:p.id}},'ТК03':{{owner:p.id}},'ТК06':{{owner:p.id}}}};p.gold=0;let candidates=d.areaCandidatesAt(p,'ТК03').length,finished=false;d.promptAreaMergeAfterBuild(p,'ТК03',()=>finished=true);return {{candidates,finished,preview:d.getAreaPreview()}}}}""")
 assert area['candidates']>0 and area['finished'] and area['preview'] is None,area
 print('unaffordable merge suppressed',area)
 print('pageerrors',errors[-10:]);assert all('Invalid URL' in e for e in errors),errors
 browser.close()
 print('ALL PASS')
