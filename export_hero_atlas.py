"""Refresh the static fallback after editing the portable atlas HTML."""
from pathlib import Path
import json
from hero_atlas import read_atlas
if __name__=='__main__':
    root=Path(__file__).resolve().parent
    data=read_atlas(root)
    (root/'hero-atlas-data.js').write_text('window.RPG_HERO_ATLAS = '+json.dumps(data,ensure_ascii=False).replace('</','<\\/')+';\n',encoding='utf-8')
    print('hero-atlas-data.js обновлён из Атлас героев.html')
