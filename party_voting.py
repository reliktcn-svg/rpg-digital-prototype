"""Server-owned unanimous votes and 20-minute suspended heroes.
All callers hold the room lock. State is persisted with the room snapshot.
"""
import copy, json, secrets, time, html
from pathlib import Path

VOTE_SECONDS=120
COOLDOWN=300
RETURN_SECONDS=1200
CATALOG=json.loads((Path(__file__).parent/'vote-card-decks.json').read_text())

def active(room):
    return [p for p in room['players'].values() if not p.get('exclusion')]

def bump(room):
    room['voteRevision']=int(room.get('voteRevision') or 0)+1
    if int(room.get('membershipRevision',0))!=int((room.get('gameState') or {}).get('membershipRevision',0)):
        room['gameRevision']=int(room.get('gameRevision') or 0)+1
    room['_http_cache']={}
    room['gameUpdatedAt']=int(time.time())
    project(room)

def journal(room,text,now):
    game=room.get('gameState')
    if game is not None:
        rows=game.setdefault('journal',[])
        rows.append({'id':'vote-'+secrets.token_hex(12),'ts':int(now*1000),'time':time.strftime('%H:%M',time.localtime(now)),'html':html.escape(text),'actorId':None})
        game['journal']=rows[-600:]

def name(room,pid):
    p=room['players'][pid]
    heroes={'warrior':'Воин','dwarf':'Дворф','mage':'Маг','archer':'Лучник','rogue':'Разбойник','paladin':'Паладин'}
    return heroes.get(p.get('heroId'),'Герой')+' · '+p['name']

def project(room):
    game=room.get('gameState')
    if game is None:return
    game['membershipRevision']=int(room.get('membershipRevision',0))
    game['excludedHeroes']={p['heroId']:{'until':p['exclusion']['until'],'expired':p['exclusion'].get('expired',False)} for p in room['players'].values() if p.get('exclusion') and p.get('heroId')}

def info(room,pid,now=None):
    now=time.time() if now is None else now
    vote=room.get('partyVote')
    public=None
    if vote:
        public={k:vote[k] for k in ('id','kind','target','initiator','endsAt','eligible')}
        public.update(targetName=name(room,vote['target']),initiatorName=name(room,vote['initiator']),answered=pid in vote['votes'])
    return {'revision':int(room.get('voteRevision',0)),'now':now,'vote':public,'cooldownUntil':room.get('voteCooldownUntil',0),'pending':bool(room.get('pendingExclusion')),
        'participants':[{'id':p['id'],'heroId':p.get('heroId'),'name':p['name'],'label':name(room,p['id']),'host':p.get('host',False),'exclusion':({k:p['exclusion'].get(k) for k in ('until','expired')} if p.get('exclusion') else None)} for p in room['players'].values()]}

def finish(room,result,now):
    vote=room.pop('partyVote',None)
    if not vote:return
    room['voteCooldownUntil']=now+COOLDOWN
    journal(room,('Исключение' if vote['kind']=='kick' else 'Возвращение')+' '+name(room,vote['target'])+': '+result,now)
    bump(room)

def start(room,pid,kind,target=None,now=None):
    now=time.time() if now is None else now
    tick(room,now)
    if not room.get('gameState') or not room.get('started'):raise ValueError('Голосование доступно после начала партии')
    if room.get('partyVote') or room.get('pendingExclusion'):raise ValueError('Дождитесь завершения текущего голосования или исключения')
    if now<room.get('voteCooldownUntil',0):raise ValueError('Повторное голосование возможно через 5 минут после предыдущего')
    account=room['players'][pid]
    if kind=='kick':
        if account.get('exclusion'):raise ValueError('Исключённый участник не голосует')
        if len(active(room))<3:raise ValueError('Для голосования нужны минимум три участника')
        if target==pid or target not in {p['id'] for p in active(room)}:raise ValueError('Выберите другого активного участника')
    elif kind=='return':
        target=pid
        ex=account.get('exclusion')
        if not ex or ex.get('expired') or now>=ex['until']:raise ValueError('Срок возвращения истёк или игрок не исключён')
    else:raise ValueError('Неизвестный вид голосования')
    eligible=[p['id'] for p in active(room) if p['id']!=target]
    if not eligible:raise ValueError('Нет участников для подтверждения')
    room['partyVote']={'id':secrets.token_hex(16),'kind':kind,'target':target,'initiator':pid,'eligible':eligible,'votes':({pid:True} if kind=='kick' else {}),'endsAt':min(now+VOTE_SECONDS,account['exclusion']['until']) if kind=='return' else now+VOTE_SECONDS}
    journal(room,name(room,pid)+(' предложил исключить '+name(room,target) if kind=='kick' else ' намерен вернуться в партию'),now)
    bump(room)

def cast(room,pid,vid,yes,now=None):
    now=time.time() if now is None else now
    tick(room,now)
    vote=room.get('partyVote')
    if not vote or vote['id']!=vid:raise ValueError('Голосование уже завершено')
    if pid not in vote['eligible'] or room['players'][pid].get('exclusion'):raise ValueError('У вас нет права голоса')
    if type(yes) is not bool:raise ValueError('Выберите ЗА или ПРОТИВ')
    if pid in vote['votes']:raise ValueError('Ваш голос уже принят')
    vote['votes'][pid]=yes
    if not yes:finish(room,'отклонено — голос ПРОТИВ',now);return
    if all(vote['votes'].get(p) is True for p in vote['eligible']):
        target=vote['target']
        if vote['kind']=='kick':
            room['pendingExclusion']={'target':target,'approvedAt':now}
            finish(room,'единогласно одобрено',now)
            tick(room,now)
        else:
            restore_hero(room,target,now)
            finish(room,'единогласно одобрено',now)
    else:bump(room)

def busy(game,hid):
    c=game.get('combat') or {}
    # Finish the currently committed dice-resolution phase before removal.
    return c.get('phase') in ('hero_roll','enemy_roll','enemy_guard_roll','ability_attack','ability_damage','secondary_damage','effect_check','entry_check')

def return_card(game,cid):
    key=CATALOG.get(str(cid))
    if not key:return
    d=game.setdefault('decks',{}).setdefault(key,{'draw':[],'discard':[]})
    d['draw'].insert(secrets.randbelow(len(d['draw'])+1),cid)

def exclude(room,pid,now):
    account=room['players'][pid];game=room['gameState'];hid=account['heroId']
    order=game['order'];old=list(order);current=old[game.get('currentIndex',0)%len(old)]
    hero=next(p for p in game['players'] if p['id']==hid)
    account['exclusion']={'until':now+RETURN_SECONDS,'expired':False,'hero':copy.deepcopy(hero)}
    room.setdefault('voteOriginalOrder',list(old))
    position=old.index(hid)
    successor=next((old[(position+i)%len(old)] for i in range(1,len(old)) if old[(position+i)%len(old)]!=hid),None)
    if account.get('host'):
        for p in room['players'].values():p['host']=p.get('heroId')==successor
        room['hostId']=next(p['id'] for p in room['players'].values() if p.get('host'))
    game['order']=[x for x in old if x!=hid]
    game['currentIndex']=game['order'].index(successor if current==hid else current)
    combat=game.get('combat') or {}
    if combat.get('heroId')==hid:
        if combat.get('phase')!='victory' and combat.get('cardId'):
            cid=combat['cardId']
            if not any(cid in d.get(part,[]) for d in game.get('decks',{}).values() for part in ('draw','discard')):return_card(game,cid)
        game['combat']=None
    if current==hid:
        if game['currentIndex']<=old.index(current):game['round']=int(game.get('round') or 1)+int(position==len(old)-1)
        for field in ('die','chosenPath','chosenMovePlan','moveOriginHex','moveTransit','pendingMoveAction','exploration','locationActivationHex','clearedThisTurnHex','inspectPlayerId','mapHighlight'):game[field]=None
        for field in ('rolled','turnMoved','movePending','turnLocked','locationUsedThisTurn'):game[field]=False
        game['movePoints']=0;game['reachable']=[]
    for field in ('foreignTerritoryPending','tributeConsentPending','tradeOpportunity','tradeDeal','dungeonEntryNotice','territoryBuiltNotice'):
        value=game.get(field)
        if value and hid in json.dumps(value,ensure_ascii=False):game[field]=None
    room.get('sidePlayerOverrides',{}).pop(hid,None);room.get('sideTerritoryOverrides',{}).pop(hid,None)
    room['membershipRevision']=int(room.get('membershipRevision',0))+1
    journal(room,name(room,pid)+' исключён. Возвращение с согласия отряда доступно 20 минут.',now)
    bump(room)

def restore_hero(room,pid,now):
    p=room['players'][pid];ex=p.get('exclusion')
    if not ex or ex.get('expired') or now>=ex['until']:raise ValueError('Срок возвращения истёк')
    game=room['gameState'];hid=p['heroId'];current=game['order'][game['currentIndex']]
    game['players']=[copy.deepcopy(ex['hero']) if h['id']==hid else h for h in game['players']]
    p.pop('exclusion');order=room.get('voteOriginalOrder',game['order']+[hid])
    permitted={a['heroId'] for a in active(room)}
    game['order']=[h for h in order if h in permitted];game['currentIndex']=game['order'].index(current)
    room['membershipRevision']=int(room.get('membershipRevision',0))+1
    journal(room,name(room,pid)+' вернулся: имущество и активность владений восстановлены.',now)
    bump(room)

def tick(room,now=None,settle=False):
    now=time.time() if now is None else now
    changed=False
    vote=room.get('partyVote')
    if vote and now>=vote['endsAt']:finish(room,'не состоялось — не собраны все голоса',now);changed=True
    pending=room.get('pendingExclusion')
    game=room.get('gameState') or {}
    order=game.get('order') or []
    current=order[int(game.get('currentIndex',0))%len(order)] if order else None
    current_account=next((p for p in room['players'].values() if p.get('heroId')==current),{})
    offline=now-current_account.get('_lastSeenAt',0)>16
    # A removed active player cannot veto the decision by holding a roll window
    # open forever. After the animation grace, use the last committed snapshot;
    # no new dice are generated and an unfinished fight awards no rewards.
    target_stalled=pending and room['players'][pending['target']].get('heroId')==current and now-pending['approvedAt']>=15
    if pending and ((settle and not busy(game,current)) or offline or target_stalled):
        room.pop('pendingExclusion');exclude(room,pending['target'],now);changed=True
    for account in room['players'].values():
        ex=account.get('exclusion')
        if not ex or ex.get('expired') or now<ex['until']:continue
        game=room['gameState'];hero=ex['hero'];hid=account['heroId']
        def cards(value):
            if isinstance(value,list):
                for v in value:yield from cards(v)
            elif isinstance(value,dict):
                for v in value.values():yield from cards(v)
            elif isinstance(value,int) and not isinstance(value,bool):yield value
        for value in (hero.get('equipment',{}),hero.get('backpack',[]),hero.get('pendingItems',[])):
            for cid in cards(value):return_card(game,cid)
        hero.update(equipment={'weapon':None,'armor':None,'amulet':None,'rings':[None,None],'artifact':None,'artifact2':None,'potions':[None,None,None,None,None],'mercenary':None},backpack=[],pendingItems=[],gold=0)
        for p in game['players']:
            if p['id']==hid:p.update(copy.deepcopy(hero))
        game['territories']={h:t for h,t in game.get('territories',{}).items() if t.get('owner')!=hid}
        game['areas']=[a for a in game.get('areas',[]) if a.get('owner')!=hid]
        ex['expired']=True
        room['membershipRevision']=int(room.get('membershipRevision',0))+1
        journal(room,name(room,account['id'])+': 20 минут истекли; имущество возвращено в колоды, владения удалены.',now)
        bump(room);changed=True
    return changed

def protect(room,incoming):
    """Old clients cannot reactivate a suspended hero or overwrite their property."""
    existing=room['gameState'];excluded={p['heroId']:p['exclusion'] for p in room['players'].values() if p.get('exclusion')}
    for hid,ex in excluded.items():
        incoming['players']=[copy.deepcopy(ex['hero']) if p['id']==hid else p for p in incoming.get('players',[])]
        if not any(p['id']==hid for p in incoming['players']):incoming['players'].append(copy.deepcopy(ex['hero']))
        incoming['territories']={h:t for h,t in incoming.get('territories',{}).items() if t.get('owner')!=hid}
        incoming['territories'].update({h:copy.deepcopy(t) for h,t in existing.get('territories',{}).items() if t.get('owner')==hid})
        incoming['areas']=[a for a in incoming.get('areas',[]) if a.get('owner')!=hid]+[copy.deepcopy(a) for a in existing.get('areas',[]) if a.get('owner')==hid]
    incoming['membershipRevision']=existing.get('membershipRevision',0)
    incoming['excludedHeroes']=copy.deepcopy(existing.get('excludedHeroes',{}))
    if any(h in excluded for h in incoming.get('order',[])):raise ValueError('Исключённый герой не может участвовать в очереди ходов')
