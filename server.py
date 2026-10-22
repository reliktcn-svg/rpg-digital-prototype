#!/usr/bin/env python3
import json, os, random, string, threading, time, urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
ROOMS = {}
LOCK = threading.RLock()
ROOM_IDLE_TTL = max(30, int(os.environ.get('RPG_ROOM_IDLE_TTL', '10800')))  # 3 часа без активности

HERO_IDS = ['warrior','dwarf','mage','archer','rogue']


def token(n=20):
    alphabet = string.ascii_letters + string.digits
    return ''.join(random.choice(alphabet) for _ in range(n))

def room_code():
    with LOCK:
        while True:
            c=''.join(random.choice(string.digits) for _ in range(6))
            if c not in ROOMS:
                return c


def touch_room(room):
    room['lastActiveAt']=int(time.time())

def cleanup_rooms(now=None):
    # Комната хранит серверный снимок партии 3 часа с момента последней активности.
    # Любой heartbeat/polling от хотя бы одного игрока продлевает срок ещё на 3 часа.
    # Если все игроки отсутствуют дольше TTL, партия считается закрытой и удаляется.
    now=int(now or time.time())
    stale=[code for code,room in ROOMS.items() if now-int(room.get('lastActiveAt') or room.get('createdAt') or now)>ROOM_IDLE_TTL]
    for code in stale:
        ROOMS.pop(code,None)
    return stale

def public_room(room, include_recovery=False):
    data={
        'code': room['code'],
        'started': room['started'],
        'createdAt': room['createdAt'],
        'lastActiveAt': int(room.get('lastActiveAt') or room['createdAt']),
        'players': [
            {'id':p['id'],'name':p['name'],'heroId':p.get('heroId'),'host':p.get('host',False)}
            for p in room['players'].values()
        ],
        'hardMode': bool(room.get('hardMode', False)),
        'gameReady': room.get('gameState') is not None,
        'gameRevision': int(room.get('gameRevision') or 0),
        'roomIdleTtl': ROOM_IDLE_TTL,
        'mapViewers': len(room.get('mapViewers') or {}),
    }
    if include_recovery:
        data['recoveryKey']=room.get('recoveryKey')
    return data

def authorized_player(room, pid, secret):
    pl=room.get('players',{}).get(pid)
    return pl if pl and pl.get('secret')==secret else None

def merge_journal(existing_game, incoming_game, limit=600):
    existing = existing_game.get('journal', []) if isinstance(existing_game, dict) else []
    incoming = incoming_game.get('journal', []) if isinstance(incoming_game, dict) else []
    by_id = {}
    for entry in list(existing) + list(incoming):
        if not isinstance(entry, dict):
            continue
        key = str(entry.get('id') or f"legacy-{entry.get('ts','')}-{entry.get('time','')}-{entry.get('html','')}")
        by_id[key] = entry
    merged = sorted(by_id.values(), key=lambda e: (int(e.get('ts') or 0), str(e.get('id') or '')))[-limit:]
    if isinstance(incoming_game, dict):
        incoming_game['journal'] = merged
    return merged

def public_map_snapshot(room):
    """Read-only field projection: never publish inventories, decks or hidden locations."""
    game=room.get('gameState') or {}
    heroes=[{
        'id':p.get('id'), 'name':p.get('name'), 'hex':p.get('hex'),
        'color':p.get('color'), 'initial':p.get('initial'),
        'inDungeon':bool(p.get('inDungeon')),
    } for p in game.get('players', []) if isinstance(p, dict)]
    hidden=bool(room.get('hardMode'))
    discovered=set()
    if hidden:
        for p in game.get('players', []):
            if not isinstance(p, dict):continue
            for hex_id,value in (p.get('discoveredLocations') or {}).items():
                if value:discovered.add(hex_id)
    locations={hid:{'name':loc.get('name')} for hid,loc in (game.get('locations') or {}).items()
               if isinstance(loc,dict) and (not hidden or hid in discovered)}
    order=game.get('order') or []
    index=int(game.get('currentIndex') or 0)
    active=order[index%len(order)] if order else None
    move=game.get('mapLastMove') or None
    if not isinstance(move,dict):move=None
    if move:
        path=move.get('path')
        move={'heroId':move.get('heroId'),'path':path if isinstance(path,list) else [],
              'at':move.get('at'),'teleport':bool(move.get('teleport'))}
    return {
        'started':bool(room.get('started')), 'ready':bool(room.get('gameState')),
        'revision':int(room.get('gameRevision') or 0), 'round':game.get('round',1),
        'activeHeroId':active,'players':heroes,'locations':locations,
        'territories':{hid:{'owner':t.get('owner'),'areaId':t.get('areaId')}
                       for hid,t in (game.get('territories') or {}).items() if isinstance(t,dict)},
        'areas':[{'id':a.get('id'),'owner':a.get('owner'),'ownerAreaNumber':a.get('ownerAreaNumber'),'hexes':a.get('hexes',[])}
                 for a in (game.get('areas') or []) if isinstance(a,dict)],
        'mapLastMove':move
    }

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        print('%s - - [%s] %s' % (self.address_string(), self.log_date_time_string(), fmt%args))

    def _json(self, status, data):
        raw=json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store')
        self.end_headers(); self.wfile.write(raw)

    def _body(self):
        try:
            n=int(self.headers.get('Content-Length','0'))
            return json.loads(self.rfile.read(n).decode('utf-8') or '{}')
        except Exception:
            return {}

    def do_GET(self):
        p=urllib.parse.urlparse(self.path)
        with LOCK: cleanup_rooms()
        if p.path == '/api/health':
            return self._json(200, {'ok':True,'rooms':len(ROOMS)})
        # Spectator-only endpoint, completely separate from player game access.
        if p.path.startswith('/api/rooms/') and p.path.endswith('/map'):
            parts=[x for x in p.path.split('/') if x]
            code=parts[2] if len(parts)==4 else ''
            q=urllib.parse.parse_qs(p.query)
            wid=(q.get('viewerId') or [''])[0];secret=(q.get('viewerSecret') or [''])[0]
            with LOCK:
                room=ROOMS.get(code)
                if not room:return self._json(404, {'error':'Комната не найдена'})
                viewer=(room.get('mapViewers') or {}).get(wid)
                if not viewer or viewer.get('secret')!=secret:
                    return self._json(403, {'error':'Нет доступа к карте'})
                viewer['lastSeenAt']=int(time.time())
                return self._json(200, public_map_snapshot(room))
        if p.path.startswith('/api/rooms/') and p.path.endswith('/game'):
            parts=[x for x in p.path.split('/') if x]
            code=parts[2] if len(parts)>=4 else ''
            q=urllib.parse.parse_qs(p.query)
            pid=(q.get('playerId') or [''])[0]; secret=(q.get('playerSecret') or [''])[0]
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                if not authorized_player(room,pid,secret): return self._json(403, {'error':'Нет доступа'})
                touch_room(room)
                if not room.get('started'): return self._json(409, {'error':'Партия ещё не началась'})
                if room.get('gameState') is None: return self._json(202, {'ready':False,'revision':int(room.get('gameRevision') or 0)})
                return self._json(200, {'ready':True,'revision':int(room.get('gameRevision') or 0),'state':room.get('gameState'),'sideVersions':{hid:int(entry.get('seq') or 0) for hid,entry in (room.get('sidePlayerOverrides') or {}).items()}})
        if p.path.startswith('/api/rooms/'):
            code=p.path.split('/')[-1]; q=urllib.parse.parse_qs(p.query)
            pid=(q.get('playerId') or [''])[0]; secret=(q.get('playerSecret') or [''])[0]
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                auth_pl=authorized_player(room,pid,secret) if pid and secret else None
                if auth_pl: touch_room(room)
                return self._json(200, public_room(room, bool(auth_pl)))
        return super().do_GET()

    def do_POST(self):
        p=urllib.parse.urlparse(self.path).path
        with LOCK: cleanup_rooms()
        body=self._body()
        if p == '/api/rooms':
            code=room_code(); pid=token(12); secret=token(24)
            name=(body.get('name') or 'Хозяин').strip()[:24] or 'Хозяин'
            with LOCK:
                ROOMS[code]={
                    'code':code,'createdAt':int(time.time()),'started':False,'hostId':pid,'hardMode':False,
                    'players':{pid:{'id':pid,'secret':secret,'name':name,'heroId':None,'host':True}},
                    'gameState':None,'gameRevision':0,'gameUpdatedAt':None,'lastActiveAt':int(time.time()),'recoveryKey':token(32)
                }
                data=public_room(ROOMS[code], True)
            return self._json(201, {'room':data,'playerId':pid,'playerSecret':secret})
        if p.endswith('/resume') and p.startswith('/api/rooms/'):
            code=p.split('/')[-2]; pid=body.get('playerId'); secret=body.get('playerSecret'); rkey=body.get('recoveryKey'); recovery=body.get('recovery') or {}
            now=int(time.time())
            with LOCK:
                room=ROOMS.get(code)
                if room:
                    pl=authorized_player(room,pid,secret)
                    if not pl and rkey and rkey==room.get('recoveryKey') and pid in room.get('players',{}):
                        pl=room['players'][pid]; pl['secret']=secret
                    if not pl: return self._json(403, {'error':'Нет доступа к сохранённой партии'})
                    touch_room(room)
                    return self._json(200, {'room':public_room(room, True),'revived':False})
                if not isinstance(recovery,dict) or not rkey or rkey!=recovery.get('recoveryKey'):
                    return self._json(404, {'error':'Комната не найдена'})
                last=int(recovery.get('lastActiveAt') or 0)
                if last<=0 or now-last>ROOM_IDLE_TTL:
                    return self._json(410, {'error':'Сохранение комнаты старше 3 часов и уже закрыто'})
                rr=recovery.get('room') or {}; players=rr.get('players') or []
                if not isinstance(players,list) or not players:
                    return self._json(400, {'error':'Нет данных игроков для восстановления'})
                restored={}
                host_id=None
                for item in players[:5]:
                    if not isinstance(item,dict) or not item.get('id'): continue
                    qid=str(item.get('id')); host=bool(item.get('host'))
                    restored[qid]={'id':qid,'secret':None,'name':str(item.get('name') or 'Игрок')[:24],'heroId':item.get('heroId'),'host':host}
                    if host: host_id=qid
                if pid not in restored:
                    return self._json(403, {'error':'Сохранённый игрок не найден в этой партии'})
                restored[pid]['secret']=secret
                if not host_id: host_id=pid; restored[pid]['host']=True
                game=recovery.get('state') if isinstance(recovery.get('state'),dict) else None
                room={
                    'code':code,'createdAt':int(rr.get('createdAt') or now),'started':bool(rr.get('started')),'hostId':host_id,
                    'hardMode':bool(rr.get('hardMode')),'players':restored,'gameState':game,
                    'gameRevision':max(0,int(recovery.get('revision') or rr.get('gameRevision') or (1 if game else 0))),
                    'gameUpdatedAt':now if game else None,'lastActiveAt':now,'recoveryKey':rkey
                }
                ROOMS[code]=room
                return self._json(200, {'room':public_room(room, True),'revived':True})
        # An unlimited-turn, read-only map observer. No hero, no player slot.
        if p.endswith('/map/join') and p.startswith('/api/rooms/'):
            code=p.split('/')[-3]
            with LOCK:
                room=ROOMS.get(code)
                if not room:return self._json(404, {'error':'Комната не найдена'})
                viewers=room.setdefault('mapViewers', {})
                now=int(time.time())
                for wid,record in list(viewers.items()):
                    if now-int(record.get('lastSeenAt') or now)>600:viewers.pop(wid,None)
                if len(viewers)>=8:return self._json(409, {'error':'Слишком много подключённых экранов карты'})
                wid=token(12);secret=token(24)
                viewers[wid]={'secret':secret,'lastSeenAt':now}
                return self._json(200, {'code':code,'viewerId':wid,'viewerSecret':secret,
                                        'started':bool(room.get('started'))})
        if p.endswith('/join') and p.startswith('/api/rooms/'):
            code=p.split('/')[-2]; name=(body.get('name') or 'Игрок').strip()[:24] or 'Игрок'
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                if room['started']: return self._json(409, {'error':'Партия уже началась'})
                if len(room['players'])>=5: return self._json(409, {'error':'В комнате уже 5 игроков'})
                pid=token(12); secret=token(24)
                room['players'][pid]={'id':pid,'secret':secret,'name':name,'heroId':None,'host':False}
                touch_room(room); data=public_room(room, True)
            return self._json(200, {'room':data,'playerId':pid,'playerSecret':secret})
        # Convert an already-joined non-host lobby player into the Map role.
        # This frees the hero slot and preserves the familiar "choose a role" UX.
        if p.endswith('/map/convert') and p.startswith('/api/rooms/'):
            code=p.split('/')[-3];pid=body.get('playerId');secret=body.get('playerSecret')
            with LOCK:
                room=ROOMS.get(code)
                if not room:return self._json(404, {'error':'Комната не найдена'})
                account=authorized_player(room,pid,secret)
                if not account:return self._json(403, {'error':'Нет доступа'})
                if account.get('host'):return self._json(409, {'error':'Хозяин комнаты должен остаться игроком. Для карты откройте второе устройство.'})
                if room.get('started'):return self._json(409, {'error':'После старта нельзя менять героя на карту'})
                viewers=room.setdefault('mapViewers',{})
                now=int(time.time())
                for wid,record in list(viewers.items()):
                    if now-int(record.get('lastSeenAt') or now)>600:viewers.pop(wid,None)
                if len(viewers)>=8:return self._json(409, {'error':'Слишком много подключённых экранов карты'})
                wid=token(12);vs=token(24)
                viewers[wid]={'secret':vs,'lastSeenAt':now}
                room['players'].pop(pid,None)
                touch_room(room)
                return self._json(200, {'code':code,'viewerId':wid,'viewerSecret':vs})
        if p.endswith('/select') and p.startswith('/api/rooms/'):
            code=p.split('/')[-2]; pid=body.get('playerId'); secret=body.get('playerSecret'); hero=body.get('heroId')
            if hero not in HERO_IDS: return self._json(400, {'error':'Неизвестный герой'})
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                pl=room['players'].get(pid)
                if not pl or pl.get('secret')!=secret: return self._json(403, {'error':'Нет доступа'})
                touch_room(room)
                for q in room['players'].values():
                    if q['id']!=pid and q.get('heroId')==hero:
                        return self._json(409, {'error':'Этот герой уже занят'})
                pl['heroId']=hero
                data=public_room(room, True)
            return self._json(200, {'room':data})
        if p.endswith('/mode') and p.startswith('/api/rooms/'):
            code=p.split('/')[-2]; pid=body.get('playerId'); secret=body.get('playerSecret'); hard=bool(body.get('hardMode'))
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                pl=room['players'].get(pid)
                if not pl or pl.get('secret')!=secret or pid!=room['hostId']:
                    return self._json(403, {'error':'Режим партии может менять только хозяин'})
                touch_room(room)
                if room.get('started'): return self._json(409, {'error':'После старта режим партии изменить нельзя'})
                room['hardMode']=hard
                data=public_room(room, True)
            return self._json(200, {'room':data})
        if p.endswith('/start') and p.startswith('/api/rooms/'):
            code=p.split('/')[-2]; pid=body.get('playerId'); secret=body.get('playerSecret')
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                pl=room['players'].get(pid)
                if not pl or pl.get('secret')!=secret or pid!=room['hostId']:
                    return self._json(403, {'error':'Начать игру может только хозяин'})
                touch_room(room)
                players=list(room['players'].values())
                if len(players)<2: return self._json(409, {'error':'Нужно минимум 2 игрока'})
                if any(not q.get('heroId') for q in players): return self._json(409, {'error':'Не все игроки выбрали героя'})
                room['started']=True
                data=public_room(room, True)
            return self._json(200, {'room':data})
        if p.endswith('/game/init') and p.startswith('/api/rooms/'):
            code=p.split('/')[-3]; pid=body.get('playerId'); secret=body.get('playerSecret'); game=body.get('state')
            if not isinstance(game,dict): return self._json(400, {'error':'Некорректное состояние партии'})
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                pl=authorized_player(room,pid,secret)
                if not pl or pid!=room.get('hostId'): return self._json(403, {'error':'Инициализировать партию может только хозяин'})
                touch_room(room)
                if not room.get('started'): return self._json(409, {'error':'Сначала запустите комнату'})
                if room.get('gameState') is None:
                    room['gameState']=game; room['gameRevision']=1; room['gameUpdatedAt']=int(time.time())
                return self._json(200, {'revision':room['gameRevision'],'state':room['gameState']})
        if p.endswith('/game/side') and p.startswith('/api/rooms/'):
            code=p.split('/')[-3]; pid=body.get('playerId'); secret=body.get('playerSecret'); side=body.get('side') or {}
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                account=authorized_player(room,pid,secret)
                if not account: return self._json(403, {'error':'Нет доступа'})
                touch_room(room)
                game=room.get('gameState')
                if not room.get('started') or not isinstance(game,dict): return self._json(409, {'error':'Сетевая партия ещё не готова'})
                owner=side.get('ownerId')
                if not owner or owner!=account.get('heroId'): return self._json(403, {'error':'Фоновое действие разрешено только своему герою'})
                current_players={q.get('id'):q for q in game.get('players',[]) if isinstance(q,dict)}
                owner_cur=current_players.get(owner)
                if not owner_cur: return self._json(409, {'error':'Герой не найден в партии'})
                mutable={'gold','maxHp','currentHp','statuses','statusTimers','statusTickedTurn','backpack','pendingItems','equipment','temporaryEffects','combatEffects','itemUsage','lockedItems','locationVisits','discoveredLocations','reexploreRiskHex','notes','stats','areaHealingCooldown','scoutBootsUsedTurn'}
                changed_by_hero={}
                for incoming in side.get('players') or []:
                    if not isinstance(incoming,dict): continue
                    hid=incoming.get('id'); cur=current_players.get(hid)
                    if not cur: continue
                    # Помимо своего героя разрешаем менять только героя на том же гексе — это нужно для сделки между игроками.
                    if hid!=owner and cur.get('hex')!=owner_cur.get('hex'): continue
                    for key in mutable:
                        if key in incoming and cur.get(key)!=incoming[key]:
                            cur[key]=incoming[key]
                            changed_by_hero.setdefault(hid,{})[key]=incoming[key]
                # Victory rewards/building are handled after the turn moves on.
                # Merge only territories and areas created by the off-turn winner;
                # never overwrite another hero's active-turn edits.
                if side.get('type')=='victory':
                    current_territories=game.setdefault('territories',{})
                    incoming_territories=side.get('territories') or {}
                    new_territories={}
                    for hex_id,entry in incoming_territories.items():
                        if not isinstance(entry,dict) or entry.get('owner')!=owner:continue
                        current=current_territories.get(hex_id)
                        # The winner can add a new territory or assign their
                        # existing territory to an area after combat.
                        if current is None or (current.get('owner')==owner and current.get('areaId')!=entry.get('areaId')):
                            current_territories[hex_id]=entry
                            new_territories[hex_id]=entry
                    existing_areas=game.setdefault('areas',[])
                    incoming_areas=side.get('areas') or []
                    known_ids={a.get('id') for a in existing_areas if isinstance(a,dict)}
                    new_areas=[]
                    for area in incoming_areas:
                        if isinstance(area,dict) and area.get('owner')==owner and area.get('id') not in known_ids:
                            existing_areas.append(area)
                            known_ids.add(area.get('id'))
                            new_areas.append(area)
                    if new_areas or new_territories:
                        game['nextAreaId']=max(int(game.get('nextAreaId') or 1),int(side.get('nextAreaId') or 1))
                        pending=room.setdefault('sideTerritoryOverrides',{})
                        record=pending.setdefault(owner,{'territories':{},'areas':[],'nextAreaId':1})
                        record['territories'].update(new_territories)
                        ids={a.get('id') for a in record['areas']}
                        record['areas'].extend(a for a in new_areas if a.get('id') not in ids)
                        record['nextAreaId']=max(record['nextAreaId'],game['nextAreaId'])
                if isinstance(side.get('decks'),dict): game['decks']=side['decks']
                if isinstance(side.get('locations'),dict): game['locations']=side['locations']
                if isinstance(side.get('journal'),list):
                    incoming={'journal':side.get('journal')}; merge_journal(game,incoming); game['journal']=incoming['journal']
                # Уведомление о построенной территории закрывает только построивший герой.
                if 'territoryBuiltNotice' in side:
                    existing_notice=game.get('territoryBuiltNotice')
                    incoming_notice=side.get('territoryBuiltNotice')
                    if isinstance(existing_notice,dict) and existing_notice.get('heroId')==owner:
                        if incoming_notice is None or (isinstance(incoming_notice,dict) and incoming_notice.get('heroId')==owner):
                            game['territoryBuiltNotice']=incoming_notice
                # Сетевая торговля — двустороннее состояние. Менять её может только участник сделки.
                if 'tradeDeal' in side:
                    incoming_deal=side.get('tradeDeal')
                    current_deal=game.get('tradeDeal')
                    allowed=False
                    if isinstance(incoming_deal,dict):
                        participants=[incoming_deal.get('buyerId'),incoming_deal.get('sellerId')]
                        current_rev=int(current_deal.get('rev') or 0) if isinstance(current_deal,dict) else -1
                        incoming_rev=int(incoming_deal.get('rev') or 0)
                        allowed=owner in participants and all(x in current_players for x in participants if x) and incoming_rev>=current_rev
                        if allowed and incoming_deal.get('stage')=='closed': game['tradeDeal']=None
                        elif allowed: game['tradeDeal']=incoming_deal
                    elif incoming_deal is None and isinstance(current_deal,dict):
                        allowed=owner in [current_deal.get('buyerId'),current_deal.get('sellerId')]
                        if allowed: game['tradeDeal']=None
                # Запоминаем только реально изменённые side-поля. Следующий full-state от другого
                # героя не должен откатить инвентарь/торговлю назад из-за устаревшего снимка.
                if changed_by_hero:
                    room['sideMutationCounter']=int(room.get('sideMutationCounter') or 0)+1
                    side_seq=room['sideMutationCounter']
                    overlays=room.setdefault('sidePlayerOverrides',{})
                    deal_rev=int((side.get('tradeDeal') or {}).get('rev') or 0) if isinstance(side.get('tradeDeal'),dict) else 0
                    for hid,changes in changed_by_hero.items():
                        entry=overlays.setdefault(hid,{'fields':{},'dealRev':0})
                        entry.setdefault('fields',{}).update(changes)
                        entry['seq']=side_seq
                        if deal_rev: entry['dealRev']=max(int(entry.get('dealRev') or 0),deal_rev)
                # Важно: side-sync НЕ меняет основную gameRevision. Иначе фоновая работа
                # инвентаря/торговли создаёт 409 для активного игрока и теряются бой/переход хода.
                # Клиенты всё равно видят side-изменения по сравнению снимка gameState.
                room['gameUpdatedAt']=int(time.time())
                return self._json(200, {'revision':room['gameRevision'],'sideVersions':{hid:int(entry.get('seq') or 0) for hid,entry in (room.get('sidePlayerOverrides') or {}).items()}})
        if p.endswith('/game/state') and p.startswith('/api/rooms/'):
            code=p.split('/')[-3]; pid=body.get('playerId'); secret=body.get('playerSecret'); game=body.get('state'); base=int(body.get('baseRevision') or 0)
            if not isinstance(game,dict): return self._json(400, {'error':'Некорректное состояние партии'})
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                if not authorized_player(room,pid,secret): return self._json(403, {'error':'Нет доступа'})
                touch_room(room)
                if not room.get('started') or room.get('gameState') is None: return self._json(409, {'error':'Сетевая партия ещё не готова'})
                if base!=int(room.get('gameRevision') or 0):
                    return self._json(409, {'error':'Состояние партии уже изменилось','revision':room.get('gameRevision')})
                existing=room.get('gameState') or {}
                account=authorized_player(room,pid,secret) or {}
                actor=account.get('heroId')
                order=existing.get('order') or []
                ix=int(existing.get('currentIndex') or 0)
                active=order[ix % len(order)] if order else None
                dungeon=existing.get('dungeonEntryNotice') or {}
                tribute=existing.get('tributeConsentPending') or {}
                can_offturn=(isinstance(dungeon,dict) and dungeon.get('heroId')==actor) or (isinstance(tribute,dict) and tribute.get('ownerId')==actor)
                if active and actor!=active and not can_offturn:
                    return self._json(409, {'error':'Ход уже перешёл другому герою. Повторно отправлять его нельзя.','revision':room.get('gameRevision')})
                existing_deal=existing.get('tradeDeal') if isinstance(existing,dict) else None
                incoming_deal=game.get('tradeDeal') if isinstance(game,dict) else None
                existing_deal_rev=int(existing_deal.get('rev') or 0) if isinstance(existing_deal,dict) else -1
                incoming_deal_rev=int(incoming_deal.get('rev') or 0) if isinstance(incoming_deal,dict) else -1
                # Если фоновая торговля успела продвинуться после последнего снимка активного игрока,
                # сохраняем более свежую сделку, а не стираем её устаревшим full-state.
                if existing_deal_rev>incoming_deal_rev:
                    game['tradeDeal']=existing_deal
                incoming_players={q.get('id'):q for q in game.get('players',[]) if isinstance(q,dict)}
                overlays=room.get('sidePlayerOverrides') or {}
                side_acks=body.get('sideAcks') or {}
                if not isinstance(side_acks,dict):side_acks={}
                for hid,entry in list(overlays.items()):
                    inc=incoming_players.get(hid)
                    if not inc or not isinstance(entry,dict): continue
                    overlay_deal_rev=int(entry.get('dealRev') or 0)
                    # Свой full-state очищает старый обычный off-turn overlay. Торговый overlay
                    # очищается только если клиент уже видел не менее свежую версию сделки.
                    caught_up=(hid==actor and int(side_acks.get(hid) or 0)>=int(entry.get('seq') or 0) and (not overlay_deal_rev or incoming_deal_rev>=overlay_deal_rev))
                    # Once the authoritative state includes a side patch, it is safe
                    # to forget it even when the actor is a different hero.
                    if all(inc.get(key)==value for key,value in (entry.get('fields') or {}).items()):
                        caught_up=True
                    if caught_up:
                        overlays.pop(hid,None);continue
                    for key,value in (entry.get('fields') or {}).items(): inc[key]=value
                if overlays: room['sidePlayerOverrides']=overlays
                else: room.pop('sidePlayerOverrides',None)
                # Do not let a stale full-state from the newly active hero erase
                # a territory/area just built by the previous winner.
                current_territories=game.setdefault('territories',{})
                current_areas=game.setdefault('areas',[])
                existing_area_ids={a.get('id') for a in current_areas if isinstance(a,dict)}
                for off_owner,record in list((room.get('sideTerritoryOverrides') or {}).items()):
                    changes=record.get('territories') or {}
                    known_original=all(current_territories.get(h)==entry for h,entry in changes.items())
                    for h,entry in changes.items():
                        current=current_territories.get(h)
                        if current is None or (current.get('owner')==off_owner and current.get('areaId')!=entry.get('areaId')):
                            current_territories[h]=entry
                    for area in record.get('areas') or []:
                        if area.get('id') not in existing_area_ids:
                            current_areas.append(area)
                            existing_area_ids.add(area.get('id'))
                    game['nextAreaId']=max(int(game.get('nextAreaId') or 1),int(record.get('nextAreaId') or 1))
                    if known_original and all(any(a.get('id')==item.get('id') for a in game['areas']) for item in record.get('areas') or []):
                        # Overlay is now part of an authoritative main snapshot.
                        room['sideTerritoryOverrides'].pop(off_owner,None)
                merge_journal(existing, game)
                room['gameState']=game; room['gameRevision']=base+1; room['gameUpdatedAt']=int(time.time())
                return self._json(200, {'revision':room['gameRevision']})
        return self._json(404, {'error':'Неизвестный запрос'})

if __name__ == '__main__':
    port=int(os.environ.get('PORT','8080'))
    os.chdir(ROOT)
    print(f'RPG Online Lobby: http://0.0.0.0:{port}')
    print('Оставьте это окно Терминала открытым.')
    ThreadingHTTPServer(('0.0.0.0',port), Handler).serve_forever()
