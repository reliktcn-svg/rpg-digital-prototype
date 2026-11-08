from pathlib import Path
import re,json
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1]
s=(r/'index.html').read_text('utf-8'); js=[]
for m in re.finditer(r'<script\b([^>]*)>(.*?)</script>',s,re.S|re.I):
 src=re.search(r'\bsrc=["\']([^"\']+)',m.group(1));n=src.group(1).split('?')[0] if src else 'inline'
 if n in ['network-lobby.js','update-client.js']:continue
 js.append((n,(r/n).read_text('utf-8') if src else m.group(2)))
html=re.sub(r'<script\b[^>]*>.*?</script>','',s,flags=re.S|re.I)
html=re.sub(r'<link\b[^>]*>','',html,flags=re.I)
with sync_playwright() as pl:
 b=pl.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 pg=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
 pg.on('dialog',lambda dialog:dialog.accept())
 pg.goto('about:blank');pg.set_content(html)
 pg.evaluate("""() => {const mem=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)}})}""")
 for name,code in js:pg.add_script_tag(content=code)
 assert pg.evaluate('!!window.__RPG_DEBUG__')
 pg.evaluate("window.__RPG_DEBUG__.startGame(['warrior'])")
 tests={}
 tests['initial_bag_artifact']=pg.evaluate("""() => {let d=window.__RPG_DEBUG__,p=d.currentPlayer();return [d.potionCapacity(p),d.backpackCapacity(p),d.carryingRank(p),d.hasArtifactEquipped(p,191)]} """)
 assert tests['initial_bag_artifact']==[2,10,0,False],tests
 tests['all_ranks']=pg.evaluate("""() => {let d=window.__RPG_DEBUG__,p=d.currentPlayer(),P=window.RPGProgression;let out=[];
  for(let i=1;i<=5;i++){p.masteryPoints=P.threshold([3,7,10,13,16][i-1]);let result=P.learn(p,'hero1_carry_'+i);out.push([result.ok,d.carryingRank(p),d.backpackCapacity(p),d.potionCapacity(p),P.cost(P.node(p,'hero1_carry_'+i))]);}return out} """)
 assert tests['all_ranks']==[[True,1,12,3,1],[True,2,14,3,1],[True,3,16,4,2],[True,4,18,4,2],[True,5,20,5,3]],tests
 pg.evaluate("window.__RPG_DEBUG__.openHeroProgression('warrior')")
 tests['skill_carry_view']=[pg.locator('.skill-carry').count(),pg.locator('.skill-carry .skill-node').count()]
 assert tests['skill_carry_view']==[1,5],tests
 pg.evaluate("window.RPGSkillTree.close()")
 tests['early_rank_denied']=pg.evaluate("""() => {let d=window.__RPG_DEBUG__,p=d.currentPlayer(),P=window.RPGProgression;p.masteryPoints=P.threshold(2);p.learnedAbilities=[];let result=P.canLearn(p,'hero1_carry_1');return !result.ok} """)
 assert tests['early_rank_denied']
 tests['two_artifacts']=pg.evaluate("""() => {let d=window.__RPG_DEBUG__,p=d.currentPlayer();p.masteryPoints=0;p.learnedAbilities=[];p.backpack=[191,192];let first=d.equipTransaction(p,191,{where:'backpack'},'artifact','backpack'),second=d.equipTransaction(p,192,{where:'backpack'},'artifact2','backpack');return [first.ok,second.ok,p.equipment.artifact,p.equipment.artifact2,d.backpackCapacity(p)]} """)
 assert tests['two_artifacts']==[True,True,191,192,15],tests
 tests['bag_upgrade']=pg.evaluate("""() => {let d=window.__RPG_DEBUG__,p=d.currentPlayer();p.learnedAbilities=['hero1_carry_1'];p.backpack=[179,180,181];let done=[];for(let i=0;i<3;i++)done.push(d.equipTransaction(p,179+i,{where:'backpack'},'potion'+i,'backpack').ok);return [done,p.equipment.potions.slice(0,3),d.potionCapacity(p)]} """)
 assert tests['bag_upgrade']==[[True,True,True],[179,180,181],3],tests
 pg.evaluate("window.__RPG_DEBUG__.openCharacterSheet('inventory')")
 assert pg.locator('#potionBagTile').count()==1
 assert pg.locator('[data-slot=artifact2]').count()==1
 pg.locator('#potionBagTile').click(force=True)
 tests['bag_ui']=pg.locator('#sheetContent').inner_text()[:250]
 assert pg.locator('[data-potion-slot=potion2]').count()==1,tests
 pg.locator('[data-potion-slot=potion2]').click(force=True)
 assert 'Ячейка 3' not in pg.locator('#sheetContent').inner_text()[:160]
 # Gear in-slot replacement list, compare and transaction.
 pg.evaluate("""() => {const d=window.__RPG_DEBUG__,p=d.currentPlayer();p.backpack=[155];d.setSlotId(p,'armor',154);d.openCharacterSheet('inventory')}""")
 pg.locator('[data-slot=armor]').click(force=True)
 tests['in_slot_candidates']=[pg.locator('.equipped-backpack-row').count(),pg.locator('.equipped-backpack-row [data-swap-id="155"]').count()]
 assert tests['in_slot_candidates']==[1,1]
 pg.locator('[data-swap-id="155"]').click(force=True)
 assert pg.locator('#replaceActions').count()==1
 assert 'Усиленная кираса' in pg.locator('#sheetContent').inner_text()
 assert 'Кольчуга' in pg.locator('#sheetContent').inner_text()
 pg.get_by_role('button',name='Заменить, старый в рюкзак').click(force=True)
 tests['swap_result']=pg.evaluate("""() => {const d=window.__RPG_DEBUG__,p=d.currentPlayer();return [p.equipment.armor,p.backpack]}""")
 assert tests['swap_result']==[155,[154]],tests
 # Ring only eligible on miss
 tests['ring244']=pg.evaluate("""() => {const d=window.__RPG_DEBUG__,p=d.currentPlayer();p.equipment.rings[0]=244;const state=d.getState();state.combat={heroId:p.id,phase:'hero_roll',round:1,used:{},attackRoll:{chosen:9,bonus:5,total:14,target:16,natural:null}};const miss=d.supportedCombatEffect(p,d.CARD_BY_ID?.[244]||window.CARDS_DATA.find(c=>c.id===244),{where:'equipment',slot:'ring0'});state.combat.attackRoll.total=19;const hit=d.supportedCombatEffect(p,window.CARDS_DATA.find(c=>c.id===244),{where:'equipment',slot:'ring0'});return [miss.enabled,hit.enabled]}""")
 assert tests['ring244']==[True,False],tests
 # Full 3-piece equipment set is recognized (5 sets) and Dawn creates an extra d4.
 tests['sets']=pg.evaluate("""() => {const d=window.__RPG_DEBUG__,p=d.currentPlayer(),C=window.CARDS_DATA,sets=[['Охотника',[152,162,172]],['Тени',[153,163,173]],['Вампира',[211,224,246]],['Феникса',[212,225,236]],['Рассвета',[213,226,247]]],out=[];for(const [name,ids] of sets){p.equipment.weapon=null;p.equipment.armor=null;p.equipment.amulet=null;p.equipment.rings=[null,null];for(const id of ids){const type=C.find(c=>c.id===id).fields['Тип'];d.setSlotId(p,{'оружие':'weapon','броня':'armor','амулет':'amulet','кольцо':'ring0'}[type],id)}out.push([name,d.fullSetEquipped(p,name)])}return out} """)
 assert all(r[1] for r in tests['sets']),tests
 tests['dawn_extra_die']=pg.evaluate("""() => {const d=window.__RPG_DEBUG__,p=d.currentPlayer(),state=d.getState();state.combat={heroId:p.id,phase:'hero_damage_ready',round:1,heroSuccessfulHits:0,cardId:1,enemyFields:{'Тип':'Человек'},attackRoll:{chosen:13,bonus:0,total:13,target:10,profile:{damage:'D6'}},used:{},buffs:[]};return d.combatPassiveDamageBonus(p,d.combatAttackStatProfile(p)).dice} """)
 assert 'D4' in tests['dawn_extra_die'],tests
 tests['sword334_types']=pg.evaluate("""() => {const d=window.__RPG_DEBUG__,p=d.currentPlayer(),c=d.getState().combat;p.equipment.weapon=334;let a={weapon:window.CARDS_DATA.find(c=>c.id===334)},out=[];for(let type of ['Человек','Животное','Насекомое','Демон','Нежить','Проклятый','Демон-насекомое']){c.enemyFields['Тип']=type;c.heroSuccessfulHits=0;out.push([type,d.combatPassiveDamageBonus(p,a).dice])}c.heroSuccessfulHits=1;c.enemyFields['Тип']='Демон';out.push(['second_hit',d.combatPassiveDamageBonus(p,a).dice]);return out} """)
 assert [bool(row[1]) for row in tests['sword334_types']]==[False,False,False,True,True,True,False,False],tests
 tests['dawn_visible_roll']=pg.evaluate("""() => {const d=window.__RPG_DEBUG__,p=d.currentPlayer(),s=d.getState();p.equipment.weapon=213;p.equipment.armor=226;p.equipment.rings=[247,null];p.equipment.amulet=null;const c=s.combat;c.enemyFields['Тип']='Человек';c.heroSuccessfulHits=0;c.phase='hero_damage_ready';c.attackRoll={chosen:10,mode:'normal',natural:null,profile:d.combatAttackStatProfile(p)};d.combatRollHeroDamage();return {dice:c.lastRoll?.dice?.map(x=>x.sides),rollMain:c.lastRoll?.main,detail:c.lastRoll?.detail,pending:c.pendingHeroDamage?.amount}} """)
 assert 4 in tests['dawn_visible_roll']['dice'],tests
 tests['sword334_visible_roll']=pg.evaluate("""() => {const d=window.__RPG_DEBUG__,p=d.currentPlayer(),c=d.getState().combat;p.equipment.weapon=334;p.equipment.armor=null;p.equipment.rings=[null,null];c.enemyFields['Тип']='Демон';c.heroSuccessfulHits=0;c.phase='hero_damage_ready';c.attackRoll={chosen:9,mode:'normal',natural:null,profile:d.combatAttackStatProfile(p)};d.combatRollHeroDamage();return {dice:c.lastRoll?.dice?.map(x=>x.sides),detail:c.lastRoll?.detail,pending:c.pendingHeroDamage.amount}} """)
 assert tests['sword334_visible_roll']['dice'].count(12)>=1 and 'D12:' in tests['sword334_visible_roll']['detail'],tests
 tests['merc332_visible_roll']=pg.evaluate("""() => {const d=window.__RPG_DEBUG__,p=d.currentPlayer(),s=d.getState(),c=s.combat;p.equipment.mercenary=332;c.phase='hero_damage';c.pendingHeroDamage={amount:8,base:8,multiplier:1,detail:[]};d.applyCombatItemEffect(p,332,{where:'equipment',slot:'mercenary'});return {dice:c.lastRoll?.dice?.map(x=>x.sides),title:c.lastRoll?.title,amount:c.pendingHeroDamage.amount}} """)
 assert tests['merc332_visible_roll']['dice']==[8,8],tests
 tests['own_area_button']=pg.evaluate("""() => {const d=window.__RPG_DEBUG__,s=d.getState(),p=d.currentPlayer();s.combat=null;s.rolled=true;s.turnMoved=true;s.movePending=true;s.territories[p.hex]={owner:p.id,areaId:777};s.areas=[{id:777,owner:p.id,hexes:[p.hex]}];d.updateActionPanel();return document.body.innerText.includes('Войти в область')} """)
 assert tests['own_area_button'],tests
 # Turn cannot end after d6 but before movement. Dialog accepted automatically.
 tests['turn_must_move']=pg.evaluate("""() => {const d=window.__RPG_DEBUG__,st=d.getState(),p=d.currentPlayer();st.combat=null;st.rolled=true;st.turnMoved=false;st.movePending=false;st.turnLocked=false;st.gameOver=false;const before=p.personalTurn;d.endTurn(false);return [before,p.personalTurn]} """)
 assert tests['turn_must_move'][0]==tests['turn_must_move'][1],tests
 print('PASS TESTS',json.dumps(tests,ensure_ascii=False,indent=2))
 print('PAGE ERRORS',errs[-12:])
 b.close()
