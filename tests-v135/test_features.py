"""Browser regression checks for Rune 223, area healing and NG+ recovery."""
from pathlib import Path
import re
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
    page=browser.new_page(viewport={'width':360,'height':800},is_mobile=True,has_touch=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    page.goto('about:blank');page.set_content(html)
    page.evaluate('''() => {const m=new Map;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})}''')
    for name,code in scripts:page.add_script_tag(content=code)
    D='window.__RPG_DEBUG__'
    def fresh():page.evaluate(f"{D}.startGame(['warrior'])")
    # area no healing from internal movement
    fresh()
    r=page.evaluate(f'''() => {{const d={D},p=d.currentPlayer(),s=d.getState();s.territories={{"ТК65":{{owner:p.id,areaId:40}},"ТК66":{{owner:p.id,areaId:40}}}};s.areas=[{{id:40,owner:p.id,ownerAreaNumber:1,hexes:['ТК65','ТК66']}}];p.currentHp=2;p.areaHealingCooldown={{}};const before=p.currentHp;d.applyAreaHealingOnStop(p,'ТК65','ТК66');return {{before,after:p.currentHp,cooldown:p.areaHealingCooldown,overlay:document.getElementById('rollOverlay')?.hidden}}}}''')
    assert r['after']==r['before'] and not r['cooldown'],r
    print('PASS movement inside same area: no healing')
    # entering from outside triggers actual healing
    r=page.evaluate(f'''() => {{const d={D},p=d.currentPlayer();const before=p.currentHp;d.applyAreaHealingOnStop(p,'ТК65','ЛГ01');return {{before,after:p.currentHp,cooldown:p.areaHealingCooldown}}}}''')
    assert r['after']>r['before'] and r['cooldown'].get('40') is True,r
    print('PASS entry from outside: one healing')
    # at full health: no dice popup and the visit counted
    fresh()
    r=page.evaluate(f'''() => {{const d={D},p=d.currentPlayer(),s=d.getState();s.territories={{"ТК65":{{owner:p.id,areaId:40}}}};s.areas=[{{id:40,owner:p.id,ownerAreaNumber:1,hexes:['ТК65']}}];p.currentHp=p.maxHp;p.areaHealingCooldown={{}};const before=p.currentHp,overlayBefore=document.getElementById('rollOverlay')?.hidden,rollBefore=document.getElementById('rollPopupTitle')?.textContent;d.applyAreaHealingOnStop(p,'ТК65','ЛГ01');return {{before,after:p.currentHp,cooldown:p.areaHealingCooldown,overlayBefore,rollBefore,rollAfter:document.getElementById('rollPopupTitle')?.textContent,overlay:document.getElementById('rollOverlay')?.hidden}}}}''')
    assert r['after']==r['before'] and r['cooldown'].get('40') is True and r['overlay']==r['overlayBefore'] and r['rollAfter']==r['rollBefore'],r
    print('PASS full health: healing skipped without die popup')
    # Regen retained in NG+, cooldown reset and active at second new-world round.
    fresh()
    r=page.evaluate(f'''() => {{const d={D},p=d.currentPlayer(),s=d.getState(),P=window.RPGProgression;
      const regen=P.hero(p.id).branches.find(x=>x.kind==='regeneration').nodes[0];
      p.masteryPoints=P.threshold(16);p.learnedAbilities.push(regen.id);p.lastRecoveryRound=400;
      s.gameOver={{winnerId:p.id}};const ok=d.startNewGamePlus({{confirmed:true}}),np=d.currentPlayer(),ns=d.getState();
      const old=np.lastRecoveryRound;np.currentHp-=4;ns.round=2;const before=np.currentHp,restored=d.recoverHealthForRound(np);
      return {{ok,old,before,after:np.currentHp,restored,selected:P.selected(np,'regeneration')?.level}}}}''')
    assert r['ok'] and r['old']==0 and r['selected']==1 and r['restored']==1 and r['after']==r['before']+1,r
    print('PASS NG+ regeneration old round tracking reset')
    # Rune effect selection 1 (attack)
    fresh()
    page.evaluate(f'''() => {{const d={D},p=d.currentPlayer();d.setSlotId(p,'weapon',223);d.combatStart(d.CARD_BY_ID[1]);d.combatFight()}}''')
    assert page.locator('#rpgLivingRuneChoice').is_visible()
    assert 'Живая руна героя' in page.locator('#rpgLivingRuneChoice').inner_text()
    page.locator('[data-rune-option="attack2"]').click(force=True)
    r=page.evaluate(f'''() => {{const c={D}.getState().combat;return {{choice:c.livingRune,phase:c.phase}}}}''')
    assert r['choice']=='attack2' and r['phase'] in ('enemy_ready','hero_turn'),r
    assert page.locator('#rpgLivingRuneChoice').count()==0
    print('PASS Rune effect 1: +2 attack before battle')
    # Rune effect selection 2 then once-per-combat healing with D10
    fresh()
    page.evaluate(f'''() => {{const d={D},p=d.currentPlayer();d.setSlotId(p,'weapon',223);d.combatStart(d.CARD_BY_ID[1]);d.combatFight()}}''')
    page.locator('[data-rune-option="healOnce"]').click(force=True)
    r=page.evaluate(f'''() => {{const d={D},p=d.currentPlayer(),c=d.getState().combat;c.phase='hero_turn';p.currentHp=1;const list=d.combatReactionList().map(x=>x.label);return {{phase:c.phase,choice:c.livingRune,list}}}}''')
    assert r['choice']=='healOnce' and any('D10' in x for x in r['list']),r
    r=page.evaluate(f'''() => {{const d={D},p=d.currentPlayer(),c=d.getState().combat;const before=p.currentHp;d.applyCombatItemEffect(p,223,{{where:'equipment',slot:'weapon'}});return {{before,after:p.currentHp,used:!!c.used['item:223'],roll:c.lastRoll,stillAvailable:d.combatReactionList().some(x=>x.label.includes('Живая руна'))}}}}''')
    assert r['after']>r['before'] and r['used'] and not r['stillAvailable'],r
    assert 'D10' in str(r['roll']),r
    print('PASS Rune effect 2: D10 once during combat')
    unrelated=[e for e in errors if 'Invalid URL' not in e and 'Failed to fetch' not in e]
    assert not unrelated,unrelated
    print('ALL v0.6.135 tests PASS')
    browser.close()
