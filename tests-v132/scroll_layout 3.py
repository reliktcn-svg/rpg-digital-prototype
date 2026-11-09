"""Smoke test for mobile Hero/Inventory scrolling via real CSS and synthetic touches.

Requires playwright, an installed Chromium, and a local browser executable.
This does NOT replace testing on a physical Android phone.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,os
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
styles=[m.split('?')[0] for m in re.findall(r'<link\s+rel="stylesheet"\s+href="([^"]+)',html)]
css='\n'.join((root/p).read_text(encoding='utf-8') for p in styles if (root/p).is_file())
assert 'mobile-scroll-v132.css' in styles

def document(kind):
    if kind=='hero': rows=''.join(f'<div class="sheet-stat" style="min-height:75px">Характеристика и способность {i}</div>' for i in range(30))
    else: rows=''.join(f'<div class="equipped-backpack-row" style="min-height:95px">Предмет экипировки {i}</div>' for i in range(30))
    return f'''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>{css}</style></head><body class="tabletop-upgrade game-running"><aside id="sheetDrawer" class="sheet-drawer"><div class="sheet-drawer-head">{kind}</div><div id="sheetContent" class="sheet-content">{rows}</div></aside></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
    try:
        for width,height in [(320,694),(360,800),(390,844),(393,873)]:
            context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,is_mobile=True,has_touch=True)
            try:
                page=context.new_page()
                for kind in ['hero','inventory']:
                    page.set_content(document(kind))
                    sizes=page.evaluate('''()=>{const a=document.querySelector('#sheetDrawer'),b=document.querySelector('#sheetContent');return {aDisplay:getComputedStyle(a).display,aOverflow:getComputedStyle(a).overflowY,aExcess:a.scrollHeight-a.clientHeight,bOverflow:getComputedStyle(b).overflowY,bExcess:b.scrollHeight-b.clientHeight,bTop:b.getBoundingClientRect().top,bBottom:b.getBoundingClientRect().bottom}}''')
                    assert sizes['aDisplay']=='flex',sizes
                    assert sizes['aOverflow']=='hidden' and sizes['aExcess']<=2,sizes
                    assert sizes['bOverflow']=='auto' and sizes['bExcess']>100,sizes
                    assert sizes['bBottom']<=height+2,sizes
                    # A programmatic scroll confirms the internal scroller is the active owner.
                    page.evaluate("document.querySelector('#sheetContent').scrollTop=150")
                    assert page.evaluate("document.querySelector('#sheetContent').scrollTop")>100
                    print('OK',kind,width,height,'scroll available',round(sizes['bExcess']))
            finally:context.close()
    finally:browser.close()
