"""The editable HTML atlas is the source of descriptions and skill paths."""
import json, math, re
from pathlib import Path
NAMES={'warrior':'Воин','dwarf':'Дворф','archer':'Лучник','rogue':'Разбойник','mage':'Маг','paladin':'Паладин'}
def read_atlas(root):
    html=(Path(root)/'Атлас героев.html').read_text(encoding='utf-8')
    data=None
    for tag in ('initial','seed'):
        m=re.search(r'<script\b[^>]*\bid=["\']'+tag+r'["\'][^>]*>(.*?)</script>',html,re.S)
        if m:
            data=json.loads(m[1])
            if data:break
    if not isinstance(data,dict) or data.get('version')!=1 or not isinstance(data.get('characters'),list):raise ValueError('Неверный формат атласа')
    return data

def learn_ability(root, player, node_id):
    atlas=read_atlas(root)
    hero=next((h for h in atlas['characters'] if h.get('name')==NAMES.get(player.get('id'))),None)
    if not hero:raise ValueError('Герой отсутствует в атласе')
    free=[];nodes={};branches={}
    for b in hero['abilities']:
        branches[b['id']]=b
        for n in b['nodes']:nodes[n['id']]={**n,'branch':b['id']}
        if 'сопротив' not in b['name'].lower():free.extend(n['id'] for n in b['nodes'] if not n.get('parent'))
    learned=list(dict.fromkeys(player.get('learnedAbilities') or []));known=set(free+learned)
    n=nodes.get(node_id)
    if not n:raise ValueError('Карточка отсутствует в атласе')
    if node_id in known:raise ValueError('Уже изучено')
    if n.get('parent') and n['parent'] not in known:raise ValueError('Сначала изучите предыдущую ступень этой ветки')
    ancestors=set();q=n
    while q.get('parent'):
        if q['parent'] in ancestors or q['parent'] not in nodes:raise ValueError('Ошибка связей атласа')
        ancestors.add(q['parent']);q=nodes[q['parent']]
    if any(x['id'] in known and x['id'] not in ancestors for x in branches[n['branch']]['nodes']):raise ValueError('В этой ветке уже выбран другой путь')
    xp=max(0,int(player.get('masteryPoints') or 0));level=math.floor((math.sqrt(9+1.6*xp)-1)/2)
    if level-1-len([x for x in learned if x not in free])<1:raise ValueError('Нужно 1 очко способности')
    learned.append(node_id);player['learnedAbilities']=learned
    return learned
