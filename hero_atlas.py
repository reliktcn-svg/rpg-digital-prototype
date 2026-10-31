"""Progression validation using local hero-abilities.js descriptions."""
import json, math, re
from pathlib import Path
NAMES={'warrior':'Воин','dwarf':'Дворф','archer':'Лучник','rogue':'Разбойник','mage':'Маг','paladin':'Паладин'}
def read_atlas(root):
    """Read the exact JSON object embedded in the bundled JS abilities file.

    The server and browser share a single local source. This function name is
    preserved for compatibility with the existing server-side progression code.
    """
    source=(Path(root)/'hero-abilities.js').read_text(encoding='utf-8')
    match=re.search(r'\bwindow\.RPG_HERO_ABILITIES\s*=\s*',source)
    if not match:
        raise ValueError('Файл hero-abilities.js не содержит данных способностей')
    try:
        data,_=json.JSONDecoder().raw_decode(source[match.end():].lstrip())
    except json.JSONDecodeError as exc:
        raise ValueError('Некорректные данные способностей') from exc
    if not isinstance(data,dict) or data.get('version')!=1 or not isinstance(data.get('characters'),list):
        raise ValueError('Неверный формат данных способностей')
    return data

BALANCE_VERSION=2
def ensure_progression(player):
    xp=max(0,int(player.get('masteryPoints') or 0))
    if player.get('progressionVersion')!=BALANCE_VERSION:
        bosses=min(xp//12,max(0,int(((player.get('stats') or {}).get('enemies') or {}).get('boss') or 0)))
        xp=xp*50+bosses*200
        player['progressionVersion']=BALANCE_VERSION
    player['masteryPoints']=xp
    return xp

def progression_level(player):
    return 1+math.floor((math.sqrt(81+.16*ensure_progression(player))-9)/2)

def node_cost(n,nodes,branches):
    level=1;q=n;seen=set()
    while q.get('parent'):
        if q['parent'] in seen or q['parent'] not in nodes:raise ValueError('Ошибка связей способностей')
        seen.add(q['parent']);q=nodes[q['parent']];level+=1
    if 'регенерац' in branches[n['branch']]['name'].lower():return level
    if 'сопротив' in branches[n['branch']]['name'].lower():return 2 if level>=3 else 1
    return 0 if level==1 else 1 if level==2 else 2 if level<=4 else 3


def learn_ability(root, player, node_id):
    atlas=read_atlas(root)
    hero=next((h for h in atlas['characters'] if h.get('name')==NAMES.get(player.get('id'))),None)
    if not hero:raise ValueError('Герой отсутствует в справочнике способностей')
    free=[];nodes={};branches={}
    for b in hero['abilities']:
        branches[b['id']]=b
        for n in b['nodes']:nodes[n['id']]={**n,'branch':b['id']}
        if not any(k in b['name'].lower() for k in ('сопротив','регенерац')):free.extend(n['id'] for n in b['nodes'] if not n.get('parent'))
    learned=list(dict.fromkeys(player.get('learnedAbilities') or []));known=set(free+learned)
    n=nodes.get(node_id)
    if not n:raise ValueError('Карточка отсутствует в справочнике способностей')
    if node_id in known:raise ValueError('Уже изучено')
    if n.get('parent') and n['parent'] not in known:raise ValueError('Сначала изучите предыдущую ступень этой ветки')
    ancestors=set();q=n
    while q.get('parent'):
        if q['parent'] in ancestors or q['parent'] not in nodes:raise ValueError('Ошибка связей способностей')
        ancestors.add(q['parent']);q=nodes[q['parent']]
    if any(x['id'] in known and x['id'] not in ancestors for x in branches[n['branch']]['nodes']):raise ValueError('В этой ветке уже выбран другой путь')
    level=progression_level(player);spent=sum(node_cost(nodes[x],nodes,branches) for x in learned if x in nodes);cost=node_cost(n,nodes,branches)
    if 'регенерац' in branches[n['branch']]['name'].lower() and level<cost*2+1:raise ValueError('Требуется '+str(cost*2+1)+' уровень героя')
    if level-1-spent<cost:raise ValueError('Недостаточно очков способности: требуется '+str(cost))
    learned.append(node_id);player['learnedAbilities']=learned
    return learned
