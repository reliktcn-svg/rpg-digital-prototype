"""Offline regression: gameplay does not require the editable HTML atlas."""
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT))
from hero_atlas import read_atlas, learn_ability

def test():
    data=read_atlas(ROOT)
    assert len(data['characters'])==6
    assert len(set(c['name'] for c in data['characters']))==6
    assert sum(len(c['abilities']) for c in data['characters'])==42
    assert not (ROOT/'Атлас героев.html').exists()
    assert not (ROOT/'hero-atlas-loader.js').exists()
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    assert 'hero-abilities.js' in html and 'hero-atlas-' not in html
    assert 'RPGAtlas?.refresh' not in (ROOT/'app.js').read_text(encoding='utf-8')
    assert 'RPGAtlas?.refresh' not in (ROOT/'hero-progression-ui.js').read_text(encoding='utf-8')
    for c,game_id in zip(data['characters'],['warrior','dwarf','archer','rogue','mage','paladin']):
        p={'id':game_id,'masteryPoints':5000,'progressionVersion':2,'learnedAbilities':[]}
        upgrade=c['abilities'][0]['nodes'][1]['id']
        assert upgrade in learn_ability(ROOT,p,upgrade)
    print('PASS: six heroes, 42 branches, local source, server upgrades, no HTML request')

if __name__=='__main__':test()
