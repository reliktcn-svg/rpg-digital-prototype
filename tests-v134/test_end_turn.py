"""v0.6.134: turn completion on cleared hex and Camp; foreign transit is enforced."""
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
    dialogs=[];errors=[]
    page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('about:blank');page.set_content(html)
    page.evaluate('''() => {const m=new Map;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})}''')
    for name,code in scripts:page.add_script_tag(content=code)
    D='window.__RPG_DEBUG__'
    def fresh():page.evaluate(f"{D}.startGame(['warrior','dwarf'])")
    def setup(src,dest,path=None,clean=True,foreign=None):
        path=path or [src,dest]
        return page.evaluate(f'''([src,dest,path,clean,foreign]) => {{
            const d={D},s=d.getState(),p=d.currentPlayer();
            s.combat=null;s.gameOver=false;s.turnLocked=false;s.rolled=true;s.die=6;s.movePoints=6;
            s.turnMoved=true;s.movePending=true;s.moveOriginHex=src;
            s.foreignTerritoryPending=null;s.tributeConsentPending=null;s.moveTransit=null;s.pendingMoveAction=null;
            s.chosenPath=path;
            s.chosenMovePlan={{hex:dest,path:[...path],cost:path.length-1,
                segments:path.slice(1).map((to,i)=>({{from:path[i],to,cost:1,boundary:false}}))}};
            p.hex=dest;p.pendingItems=[];p.gold=50;
            s.cleaned={{}};s.territories={{}};s.locations={{}};
            if(clean)s.cleaned[dest]=true;
            if(foreign) s.territories[foreign.hex]={{owner:s.players.find(q=>q.id!==p.id).id}};
            d.updateUI();return {{pId:p.id,turn:p.personalTurn,dist:p.stats?.distanceTravelled||0}};
        }}''',[src,dest,path,clean,foreign])
    # 1. A cleared free hex can be the destination of a pending manual route.
    fresh();b=setup('ЛГ01','ТК65')
    assert not page.locator('#endTurnBtn').is_disabled(), 'End turn UI unexpectedly disabled on cleared hex'
    page.locator('#endTurnBtn').click(force=True)
    page.wait_for_timeout(100)
    r=page.evaluate(f'''() => {{const d={D},s=d.getState(),p=d.getPlayer('{b["pId"]}');return {{turn:p.personalTurn,hex:p.hex,pending:s.movePending,dist:p.stats.distanceTravelled}}}}''')
    assert r['turn']==b['turn']+1 and r['hex']=='ТК65' and not r['pending'] and r['dist']==b['dist']+1,r
    assert not any('подтвердите выбранное перемещение' in msg.lower() for msg in dialogs),dialogs
    print('PASS cleared free hex: completes pending route and turn',r)
    # 2. Return to the starting Camp ends movement & turn without extra action.
    fresh();b=setup('ТК65','ЛГ01',clean=False)
    page.locator('#endTurnBtn').click(force=True)
    page.wait_for_timeout(100)
    r=page.evaluate(f'''() => {{const d={D},s=d.getState(),p=d.getPlayer('{b["pId"]}');return {{turn:p.personalTurn,hex:p.hex,pending:s.movePending,dist:p.stats.distanceTravelled}}}}''')
    assert r['turn']==b['turn']+1 and r['hex']=='ЛГ01' and not r['pending'] and r['dist']==b['dist']+1,r
    print('PASS Camp: completes pending route and turn',r)
    # 3. Unexplored hexes still require a separate movement confirmation/exploration.
    fresh();b=setup('ЛГ01','ТК65',clean=False)
    assert page.locator('#endTurnBtn').is_disabled(), 'Unexplored hex should not allow end-turn UI'
    page.evaluate(f'{D}.endTurn(false)')
    page.wait_for_timeout(50)
    s=page.evaluate(f'''() => {{const d={D},s=d.getState();return {{turn:d.currentPlayer().personalTurn,pending:s.movePending}}}}''')
    assert s['turn']==b['turn'] and s['pending'],s
    assert any('подтвердите выбранное перемещение' in msg.lower() for msg in dialogs),dialogs
    print('PASS unresolved hex: pending route remains protected',s)
    # 4. Crossing an enemy-owned territory still requires tribute/pass permission.
    fresh();b=setup('ЛГ01','ТК59',['ЛГ01','ТК65','ТК59'],clean=True,foreign={'hex':'ТК65'})
    page.locator('#endTurnBtn').click(force=True)
    page.wait_for_timeout(50)
    s=page.evaluate(f'''() => {{const d={D},s=d.getState(),p=d.currentPlayer();return {{turn:p.personalTurn,foreign:s.foreignTerritoryPending?.hex,transit:!!s.moveTransit}}}}''')
    assert s['turn']==b['turn'] and s['foreign']=='ТК65' and s['transit'],s
    page.get_by_role('button',name='Заплатить дань 10',exact=True).click(force=True)
    page.wait_for_timeout(150)
    r=page.evaluate(f'''() => {{const d={D},s=d.getState(),p=d.getPlayer('{b["pId"]}');return {{turn:p.personalTurn,hex:p.hex,gold:p.gold,foreign:s.foreignTerritoryPending,pending:s.movePending}}}}''')
    assert r['turn']==b['turn']+1 and r['hex']=='ТК59' and r['gold']==40 and not r['foreign'] and not r['pending'],r
    print('PASS foreign transit: tribute required and honoured before end turn',r)
    unrelated=[e for e in errors if 'Invalid URL' not in e and 'Failed to fetch' not in e]
    assert not unrelated,unrelated
    browser.close()
    print('PASS all 4 end-turn scenarios')
