"""Browser integration: NG+ clues appear every +2 hero levels, including jumps."""
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
 page.evaluate("""() => {const m=new Map;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})}""")
 for name,code in scripts:page.add_script_tag(content=code)
 D='window.__RPG_DEBUG__'
 result=page.evaluate(f"""()=>{{const d={D},P=window.RPGProgression;d.startGame(['warrior']);
 let p=d.currentPlayer(),s=d.getState();p.masteryPoints=P.threshold(20);s.gameOver={{winnerId:p.id}};
 if(!d.startNewGamePlus({{confirmed:true}}))throw Error('NG+ refused');
 s=d.getState();p=d.currentPlayer();let measurements=[];
 for(let level=20;level<=32;level++){{p.masteryPoints=P.threshold(level);d.syncBossClues();measurements.push({{level,injected:s.boss.injected.length,outer:s.decks.exploreOuter.draw.filter(i=>i>=489&&i<=500).length,inner:s.decks.exploreHeart.draw.filter(i=>i>=489&&i<=500).length}})}}
 const order=s.boss.clueOrder.slice();
 const second=window.RPGBoss.reveal(s,order[1]);
 const first=window.RPGBoss.reveal(s,order[0]);
 const third=window.RPGBoss.reveal(s,order[2]);
 const fourth=window.RPGBoss.reveal(s,order[3]);
 return {{cycle:s.ngPlusCycle,base:s.ngPlusStartLevels[p.id],measurements,second,first,third,fourth,found:s.boss.found,heartUnlocked:s.boss.heartUnlocked}}}}""")
 assert result['cycle']==1 and result['base']==20,result
 for row in result['measurements']:
  exp=min(6,(row['level']-20)//2)
  assert row['injected']==exp and row['outer']==exp and row['inner']==exp,(row,exp)
 assert all(result[k] for k in ('second','first','third','fourth')),result
 assert result['heartUnlocked'] and len(result['found'])==4,result
 print('PASS NG+ level 20 -> 22,24,26,28,30,32: six injected across both decks; out-of-order four clues unlock heart')
 # NG++ starts new cadence at the new cycle's hero level.
 again=page.evaluate(f"""()=>{{const d={D},s=d.getState(),P=window.RPGProgression,p=d.currentPlayer();s.gameOver={{winnerId:p.id}};
 const ok=d.startNewGamePlus({{confirmed:true}}),n=d.getState(),q=d.currentPlayer();
 const start=P.info(q).level,begin=n.boss.injected.length;
 q.masteryPoints=P.threshold(start+2);d.syncBossClues();
 return {{ok,cycle:n.ngPlusCycle,start,base:n.ngPlusStartLevels[q.id],begin,after:n.boss.injected.length}}}}""")
 assert again['ok'] and again['cycle']==2 and again['start']==32 and again['base']==32 and again['begin']==0 and again['after']==1,again
 print('PASS NG++ milestones reset to new world start level')
 assert not [e for e in errors if 'Invalid URL' not in e and 'Failed to fetch' not in e],errors
 print('PASS browser integration, no unexpected JS errors')
 browser.close()
