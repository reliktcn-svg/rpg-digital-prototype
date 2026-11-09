"""RPG v0.6.131 new behaviors. Run python tests-v131/ui_regression.py"""
from pathlib import Path
import re, json
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
with sync_playwright() as pl:
    browser=pl.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    page.on('dialog',lambda dialog:dialog.accept())
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('about:blank');page.set_content(html)
    page.evaluate("""() => { const data=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}}) }""")
    for name,code in scripts: page.add_script_tag(content=code)
    assert page.evaluate('!!window.__RPG_DEBUG__'), 'game did not load'
    d='window.__RPG_DEBUG__'
    page.evaluate(f"{d}.startGame(['warrior','dwarf'])")
    # single armor item preview => candidate compare, return directly to equipped armor + backpack candidate list.
    page.evaluate(f"""() => {{const d={d},p=d.currentPlayer();p.backpack=[155];d.setSlotId(p,'armor',154);d.openCharacterSheet('inventory')}}""")
    page.locator('[data-slot="armor"]').click(force=True)
    assert page.locator('[data-swap-id="155"]').count()==1
    page.locator('[data-swap-id="155"]').click(force=True)
    assert page.locator('#cancelReplace').count()==1
    page.locator('#cancelReplace').click(force=True)
    assert page.locator('#itemBack').count()==1
    assert page.locator('[data-swap-id="155"]').count()==1, 'comparison back did not return to equipped armor + replace list'
    assert 'Экипировано: Броня' in page.locator('#sheetContent').inner_text()
    page.locator('#itemBack').click(force=True)
    assert page.locator('[data-slot="armor"]').count()==1
    # selecting same candidate and successful swap remains return to main inventory
    page.locator('[data-slot="armor"]').click(force=True)
    page.locator('[data-swap-id="155"]').click(force=True)
    page.get_by_role('button',name='Заменить, старый в рюкзак').click(force=True)
    assert page.locator('[data-slot="armor"]').count()==1
    assert page.evaluate(f"{d}.currentPlayer().equipment.armor")==155

    # Exact user flow: a weapon comparison's Back returns to equipped weapon and candidates.
    weapon_ids=page.evaluate(f"""() => {{const d={d},p=d.currentPlayer();return window.CARDS_DATA.filter(c=>c.fields?.['Тип']==='оружие'&&d.canEquipCard(p,c).ok).slice(0,2).map(c=>c.id)}}""")
    assert len(weapon_ids)==2,weapon_ids
    page.evaluate(f"""([oldId,newId]) => {{const d={d},p=d.currentPlayer();d.setSlotId(p,'weapon',oldId);p.backpack=[newId];d.openCharacterSheet('inventory')}}""",weapon_ids)
    page.locator('[data-slot="weapon"]').click(force=True)
    page.locator(f'[data-swap-id="{weapon_ids[1]}"]').click(force=True)
    page.locator('#cancelReplace').click(force=True)
    assert 'Экипировано: Оружие' in page.locator('#sheetContent').inner_text()
    assert page.locator(f'[data-swap-id="{weapon_ids[1]}"]').count()==1

    # Both possible potion sources expose the requested string. Includes the combat branch.
    page.evaluate(f"""() => {{const d={d},p=d.currentPlayer();p.backpack=[179];d.openCharacterSheet('backpack');}}""")
    page.locator('[data-item-id="179"]').click(force=True)
    assert page.get_by_role('button',name='Надеть на пояс').count()==1
    page.evaluate(f"""() => {{const d={d},p=d.currentPlayer();p.pendingItems=[180];d.openCharacterSheet('pending');}}""")
    page.locator('[data-item-id="180"]').click(force=True)
    assert page.get_by_role('button',name='Надеть на пояс').count()==1

    # Owned territory without area: special action allowed after selecting move endpoint.
    own=page.evaluate(f"""() => {{const d={d},s=d.getState(),p=d.currentPlayer(),from=p.hex,to='ТК100';
      s.combat=null;s.gameOver=false;s.turnLocked=false;s.rolled=true;s.turnMoved=false;s.movePending=true;s.moveOriginHex=from;
      p.pendingItems=[];p.hex=to;s.territories[to]={{owner:p.id}};s.areas=[];delete s.locations[to];s.chosenMovePlan={{hex:to,path:[from,to],cost:1,segments:[{{from,to,cost:1}}]}};
      d.updateActionPanel();return {{html:document.getElementById('actionPanel').innerText,from,to,hero:p.id}} }}""")
    assert 'Войти на территорию' in own['html'],own
    assert 'Войти в область' not in own['html'],own
    page.get_by_role('button',name='Войти на территорию').click(force=True)
    assert page.evaluate(f"{d}.getPlayer('{own['hero']}').hex")==own['to'], 'arrival should keep hero on owned territory'
    page.wait_for_timeout(100)
    assert page.evaluate(f"{d}.getPlayer('{own['hero']}').personalTurn")>=2, 'turn should finish at own territory without area'

    # Foreign-owned territory route: choice must be completed before turn can finish.
    foreign=page.evaluate(f"""() => {{const d={d},s=d.getState(),p=d.currentPlayer(),other=s.players.find(q=>q.id!==p.id),from=p.hex,to='ТК65';
      s.combat=null;s.gameOver=false;s.turnLocked=false;s.rolled=true;s.turnMoved=false;s.movePending=true;s.moveOriginHex=from;
      p.hex=to;p.gold=99;s.territories[to]={{owner:other.id}};s.areas=[];delete s.locations[to];
      s.chosenMovePlan={{hex:to,path:[from,to],cost:1,segments:[{{from,to,cost:1}}]}};
      d.updateActionPanel();return {{html:document.getElementById('actionPanel').innerText,from,to,owner:other.id}} }}""")
    assert 'Войти на территорию' in foreign['html'],foreign
    page.get_by_role('button',name='Войти на территорию').click(force=True)
    assert page.get_by_role('button',name='Заплатить дань 10').count()==1
    assert page.locator('#endTurnBtn').is_disabled(), 'foreign rules cannot be bypassed'
    before=page.evaluate(f"{d}.currentPlayer().gold")
    page.get_by_role('button',name='Заплатить дань 10').click(force=True)
    page.wait_for_timeout(150)
    assert page.evaluate(f"{d}.currentPlayer().gold")==before-10
    assert page.evaluate(f"{d}.getState().foreignTerritoryPending")==None
    assert not page.locator('#endTurnBtn').is_disabled(), 'after tribute hero may end turn on foreign territory'

    # Exploration event #63: heal shows a D6 roll before the same card's result and continue.
    page.evaluate(f"""() => {{const d={d},s=d.getState(),p=d.currentPlayer();s.combat=null;s.rolled=false;s.movePending=false;s.turnLocked=true;
      p.currentHp=Math.max(1,p.maxHp-9);s.exploration={{hero:p.id,hex:p.hex,deckKey:'exploreOuter'}};
      d.resolveEvent(d.CARD_BY_ID[63]);}}""")
    assert page.get_by_role('button',name='Лечение D6').count()==1
    page.get_by_role('button',name='Лечение D6').click(force=True)
    assert page.locator('#rollOverlay').is_visible()
    assert 'Брошенный лагерь' in page.locator('#rollPopupTitle').inner_text()
    assert 'D6' in page.locator('#rollPopupMath').inner_text()
    if page.locator('#rollPopupClose').is_disabled(): page.wait_for_function('!document.getElementById("rollPopupClose").disabled',timeout=12000)
    # In a normal client autoContinue closes after animation. Manually close to assert results immediately.
    if page.locator('#rollOverlay').is_visible():page.locator('#rollPopupClose').click(force=True)
    assert page.locator('#modal').is_visible()
    msg=page.locator('#modalContent').inner_text()
    assert 'Результат лечения' in msg and 'Восстановлено' in msg and 'Продолжить' in msg,msg
    # Same effect on card 64 must finish the roll automatically, then return to the event card.
    page.evaluate(f"""() => {{const d={d},s=d.getState(),p=d.currentPlayer();s.exploration={{hero:p.id,hex:p.hex,deckKey:'exploreOuter'}};d.resolveEvent(d.CARD_BY_ID[64])}}""")
    page.get_by_role('button',name='Лечение D6').click(force=True)
    assert page.locator('#rollOverlay').is_visible()
    page.wait_for_function("document.getElementById('rollOverlay').hidden && document.getElementById('modalContent').innerText.includes('Результат лечения')",timeout=15000)
    assert 'Продолжить' in page.locator('#modalContent').inner_text()
    print('v0.6.131 PASS: equipped return, swap action, potion labels, own territory, foreign tribute, camp dice result')
    print('pageerror:',errors[-8:])
    browser.close()
