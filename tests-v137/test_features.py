"""Regression: Rune modal stacking and NG+ regeneration/XP, without changing source saves."""
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
styles='\n'.join((root/x).read_text() for x in ['styles.css','ui-v06106.css','ui-v06108.css'])
html=html.replace('</head>','<style>'+styles+'</style></head>')
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width,height in [(360,800),(393,873)]:
        page=browser.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
        page.on('dialog',lambda d:d.accept())
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('about:blank');page.set_content(html)
        page.evaluate('''() => {const m=new Map;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})}''')
        for name,code in scripts:page.add_script_tag(content=code)
        for effect in ['attack2','healOnce']:
            page.evaluate('''() => {const d=window.__RPG_DEBUG__;d.startGame(['warrior']);const p=d.currentPlayer();d.setSlotId(p,'weapon',223);d.combatStart(d.CARD_BY_ID[1]);d.combatFight()}''')
            rune=page.locator('#rpgLivingRuneChoice')
            assert rune.is_visible(), 'rune must appear'
            z=page.evaluate("getComputedStyle(document.querySelector('#rpgLivingRuneChoice')).zIndex")
            zcombat=page.evaluate("getComputedStyle(document.querySelector('#modal')).zIndex")
            assert int(z)>int(zcombat),(z,zcombat)
            # no force: verify a real hit target and actual click in mobile viewport
            button=page.locator(f'[data-rune-option="{effect}"]')
            button.click(timeout=5000)
            assert page.locator('#rpgLivingRuneChoice').count()==0
            v=page.evaluate('''() => {const c=window.__RPG_DEBUG__.getState().combat;return [c.livingRune,c.phase]}''')
            assert v[0]==effect and v[1] in ('hero_turn','enemy_ready'),v
            print('PASS Rune',effect,'mobile',width,'layer',z,'combat layer',zcombat,'phase',v[1])
        page.evaluate('''() => {const d=window.__RPG_DEBUG__,P=window.RPGProgression;d.startGame(['warrior']);const p=d.currentPlayer(),s=d.getState();p.learnedAbilities.push(P.hero(p.id).branches.find(b=>b.kind==='regeneration').nodes[0].id);s.ngPlusCycle=1;s.round=3;p.lastRecoveryRound=150;p.currentHp=p.maxHp-5;}''')
        before=page.evaluate('''() => {const d=window.__RPG_DEBUG__,p=d.currentPlayer();const x=p.currentHp,added=d.recoverHealthForRound(p);return {x,added,now:p.currentHp,last:p.lastRecoveryRound}}''')
        assert before['added']==1 and before['now']==before['x']+1 and before['last']==3,before
        again=page.evaluate('''() => window.__RPG_DEBUG__.recoverHealthForRound(window.__RPG_DEBUG__.currentPlayer())''')
        assert again==0,again
        print('PASS legacy NG+ regen future timestamp migrates; only once per round',width)
        result=page.evaluate('''() => {const d=window.__RPG_DEBUG__,s=d.getState();const p=d.currentPlayer();s.round=2;p.lastRecoveryRound=100;const old=structuredClone(s);d.normalizeIncomingState(old);return {saved:d.currentPlayer().lastRecoveryRound,round:d.getState().round}}''')
        assert result['saved']==0,result
        print('PASS NG+ saved state migration',width)
        regen2=page.evaluate('''() => {const d=window.__RPG_DEBUG__,P=window.RPGProgression,p=d.currentPlayer(),s=d.getState();const nodes=P.hero(p.id).branches.find(b=>b.kind==='regeneration').nodes;s.round=4;s.ngPlusCycle=1;p.learnedAbilities.push(...nodes.slice(0,2).map(n=>n.id));p.currentHp=p.maxHp-5;p.lastRecoveryRound=230;const before=p.currentHp,healed=d.recoverHealthForRound(p);return {before,after:p.currentHp,healed,rank:P.selected(p,'regeneration').level}}''')
        assert regen2['rank']==2 and regen2['healed']==2 and regen2['after']==regen2['before']+2,regen2
        print('PASS legacy NG+ regeneration rank 2',width)
        result=page.evaluate('''() => {const d=window.__RPG_DEBUG__,P=window.RPGProgression;d.startGame(['warrior']);const p=d.currentPlayer(),enemy=d.CARD_BY_ID[1];const base=P.award(p,enemy,{});d.getState().ngPlusCycle=1;const bonus=P.award(p,enemy,{}, {ngPlusCycle:d.getState().ngPlusCycle});return {base:base.amount,ng:bonus.amount}}''')
        assert result['base']==150 and result['ng']==225,result
        print('PASS progression normal vs NG+ experience',result)
        awarded=page.evaluate('''() => {const d=window.__RPG_DEBUG__,e=d.CARD_BY_ID[1];d.startGame(['warrior']);const p=d.currentPlayer();p.masteryPoints=0;d.getState().ngPlusCycle=1;d.recordEnemyVictory(p,e,{});const xp=p.masteryPoints;d.recordEnemyVictory(p,e,{masteryAwarded:true});return {xp,level:window.RPGProgression.info(p).level}}''')
        assert awarded['xp']==225,awarded
        print('PASS game victory handler awards NG+ experience',awarded)
        err=[e for e in errors if 'Failed to fetch' not in e and 'Invalid URL' not in e]
        assert not err,err
        page.close()
    browser.close()
