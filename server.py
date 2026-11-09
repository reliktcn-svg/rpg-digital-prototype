#!/usr/bin/env python3
import json, os, random, string, threading, time, urllib.parse
from http_transport import TransportMixin
from asset_manifest import build_manifest
from network_storage import save as persist_room, remove as remove_persisted, restore as restore_rooms, TTL as NETWORK_SAVE_TTL, PATH as NETWORK_DB_PATH
import hashlib, sqlite3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from dice_pack_catalog import dice_pack_catalog
from hero_atlas import read_atlas, learn_ability, ensure_progression, progression_level

ROOT = os.path.dirname(os.path.abspath(__file__))
ROOMS = restore_rooms()
LOCK = threading.RLock()
ROOM_IDLE_TTL = max(30, int(os.environ.get('RPG_ROOM_IDLE_TTL', '10800')))  # lobby: 3 hours; saved game: 24 hours

HERO_IDS = ['warrior','dwarf','mage','archer','rogue','paladin']


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
    # Gameplay updates the 24-hour recovery deadline. Polls do NOT extend it.
    # An actively connected session is not interrupted when its save expires.
    now=int(time.time() if now is None else now)
    stale=[]
    for code,room in list(ROOMS.items()):
        if room.get('started'):
            action_at=int(room.get('gameUpdatedAt') or room.get('createdAt') or now)
            expired=now-action_at>=NETWORK_SAVE_TTL
            # Allow currently connected clients to finish safely. GET requests
            # do not alter gameUpdatedAt and therefore cannot prolong recovery.
            playing=now-int(room.get('lastActiveAt') or 0)<120
            if expired and not playing:stale.append(code)
        elif now-int(room.get('lastActiveAt') or room.get('createdAt') or now)>ROOM_IDLE_TTL:stale.append(code)
    for code in stale:ROOMS.pop(code,None)
    if stale:remove_persisted(stale)
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
        'enemyScaling': room.get('enemyScaling', True),
        'gameReady': room.get('gameState') is not None,
        'gameRevision': int(room.get('gameRevision') or 0),
        'roomIdleTtl': ROOM_IDLE_TTL,
        'gameUpdatedAt': int(room.get('gameUpdatedAt') or room.get('createdAt') or 0),
        'networkRecoveryTtl': NETWORK_SAVE_TTL,
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
        'currentHp':p.get('currentHp',0),'maxHp':p.get('maxHp',p.get('hp',0)),
        'gold':p.get('gold',0),
        'level':progression_level(p),
        'territoryCount':sum(1 for t in (game.get('territories') or {}).values() if isinstance(t,dict) and t.get('owner')==p.get('id')),
        'areaCount':sum(1 for a in (game.get('areas') or []) if isinstance(a,dict) and a.get('owner')==p.get('id')),
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
        'activeHeroId':active,'order':order,'players':heroes,'locations':locations,
        'territories':{hid:{'owner':t.get('owner'),'areaId':t.get('areaId')}
                       for hid,t in (game.get('territories') or {}).items() if isinstance(t,dict)},
        'areas':[{'id':a.get('id'),'owner':a.get('owner'),'ownerAreaNumber':a.get('ownerAreaNumber'),'hexes':a.get('hexes',[])}
                 for a in (game.get('areas') or []) if isinstance(a,dict)],
        'mapLastMove':move
    }


def boss_clue_order(boss):
    order=boss.get('clueOrder')
    if isinstance(order,list) and len(order)==6 and all(type(i) is int for i in order) and sorted(order)==list(range(6)):return list(order)
    prefix=[]
    for i in (boss.get('found') or [])+(boss.get('injected') or []):
        if type(i) is int and 0<=i<6 and i not in prefix:prefix.append(i)
    seed=(boss.get('hp',0)*31+boss.get('defense',0)*17+boss.get('attack',0)*13+sum(ord(c) for c in str(boss.get('key',''))))&0xffffffff
    rest=[i for i in range(6) if i not in prefix]
    for i in range(len(rest)-1,0,-1):
        seed=(seed*1664525+1013904223)&0xffffffff
        j=int(seed/4294967296*(i+1));rest[i],rest[j]=rest[j],rest[i]
    return prefix+rest

def preserve_boss_state(existing, incoming):
    """The boss is immutable; discoveries follow the saved shuffled order."""
    old=existing.get('boss')
    if not isinstance(old,dict):return
    proposed=incoming.get('boss') or {}
    # Authorised main-turn sync may start a new cycle after defeating the boss.
    # In that case a fresh boss, with no clues found, is required.
    old_cycle=int(existing.get('ngPlusCycle') or 0)
    new_cycle=int(incoming.get('ngPlusCycle') or 0)
    if (existing.get('gameOver') and new_cycle==old_cycle+1
            and incoming.get('gameOver') is False and isinstance(proposed,dict)
            and proposed.get('schema')==1 and not proposed.get('found')
            and isinstance(incoming.get('ngPlusStartLevels'),dict)):
        return
    boss=json.loads(json.dumps(old))
    if not old.get('legacy'):
        order=boss_clue_order(old)
        boss['clueOrder']=order
        old_count=len(old.get('found') or [])
        proposed_found=proposed.get('found') or []
        count=len(proposed_found) if proposed_found==order[:len(proposed_found)] else old_count
        level=max([1]+[progression_level(p) for p in incoming.get('players',[]) if isinstance(p,dict)])
        thresholds=[2,4,7,9,12,15]
        count=max(old_count,min(6,count))
        while count>old_count and level<thresholds[count-1]:count-=1
        boss['found']=order[:count]
        injected=set(old.get('injected') or [])|set(proposed.get('injected') or [])
        boss['injected']=[i for i in order if i in injected and (i in order[:count] or (count<6 and i==order[count] and level>=thresholds[count]))]
        boss['heartUnlocked']=count>=4
        boss['fullyRevealed']=bool(old.get('fullyRevealed') or count==6 or (proposed.get('fullyRevealed') and (incoming.get('combat') or {}).get('isBoss')))
        records=boss.setdefault('clueRecords',{})
        for i in boss['found']:
            key=str(i)
            record=(proposed.get('clueRecords') or {}).get(key)
            if key not in records and isinstance(record,dict) and record.get('index')==i:
                records[key]=json.loads(json.dumps(record))
        if 'hpBand' not in boss:
            hp=boss.get('hp',50)
            boss['hpBand']=50 if hp<=60 else 60 if hp<=70 else 70
    incoming['boss']=boss
    remove_found_clues(incoming)

def remove_found_clues(game):
    found=(game.get('boss') or {}).get('found') or []
    removed={489+2*i+j for i in found for j in (0,1)}
    for d in (game.get('decks') or {}).values():
        if not isinstance(d,dict):continue
        for part in ('draw','discard'):
            if isinstance(d.get(part),list):d[part]=[i for i in d[part] if i not in removed]

def preserve_side_clue_decks(game,decks):
    # Off-turn inventory/trading does not change exploration decks. Preserve
    # order too: moving a pending clue to the top would alter its probability.
    incoming=json.loads(json.dumps(decks))
    if not game.get('boss') or game['boss'].get('legacy'):return incoming
    for key in ('exploreOuter','exploreHeart'):
        old=(game.get('decks') or {}).get(key)
        if isinstance(old,dict):incoming[key]=json.loads(json.dumps(old))
    return incoming


class Handler(TransportMixin, SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        print('%s - - [%s] %s' % (self.address_string(), self.log_date_time_string(), fmt%args))

    def _json(self, status, data):
        path=urllib.parse.urlparse(self.path).path
        parts=path.split('/')
        room=ROOMS.get(parts[3]) if len(parts)>3 and parts[1:3]==['api','rooms'] else None
        # Every POST response invalidates both projections, including side writes
        # which intentionally do not increment gameRevision. Cache never lives in gameState.
        if self.command=='POST' and 200<=status<300:
            try:
                if room is not None:
                    with LOCK:persist_room(room)
                elif path=='/api/rooms' and isinstance(data,dict) and data.get('room'):
                    new_room=ROOMS.get(data['room'].get('code'))
                    if new_room:
                        with LOCK:persist_room(new_room)
            except (OSError,ValueError,sqlite3.Error) as exc:
                print('RPG network snapshot failed:',exc)
                status=503;data={'error':'Не удалось записать сетевое сохранение. Проверьте постоянное хранилище.'}
        if self.command=='POST' and room is not None:room.pop('_http_cache',None)
        conditional=self.command=='GET' and path.endswith(('/game','/map')) and status==200
        cache=room.setdefault('_http_cache',{}) if conditional and room is not None else {}
        key=parts[-1]
        if conditional and key in cache:raw,digest=cache[key]
        else:
            raw=json.dumps(data, ensure_ascii=False, separators=(',',':')).encode('utf-8')
            digest=hashlib.sha256(raw).hexdigest()
            if conditional:cache[key]=(raw,digest)
        return self.send_bytes(status,raw,'application/json; charset=utf-8',conditional=conditional,private=True,digest=digest)

    def _body(self):
        try:
            n=int(self.headers.get('Content-Length','0'))
            return json.loads(self.rfile.read(n).decode('utf-8') or '{}')
        except Exception:
            return {}

    def client_compatible(self):
        try:protocol=int(self.headers.get('X-RPG-Protocol','1'))
        except ValueError:protocol=0
        return protocol>=int(os.environ.get('RPG_MIN_CLIENT_PROTOCOL','1'))

    def do_GET(self):
        if self.path.startswith('/api/rooms/') and not self.client_compatible():return self._json(426,{'error':'Обновите игру: версия клиента несовместима с сервером'})
        p=urllib.parse.urlparse(self.path)
        if p.path=='/asset-manifest.json':build_manifest(ROOT)
        with LOCK: cleanup_rooms()
        if p.path == '/api/dice-packs':
            return self._json(200, dice_pack_catalog(ROOT))
        if p.path == '/api/hero-atlas':
            try: data=read_atlas(ROOT)
            except (ValueError,OSError) as exc:return self._json(500, {'error':'Ошибка атласа: '+str(exc)})
            if p.path=='/api/hero-atlas':return self._json(200,data)
            payload=('window.RPG_HERO_ATLAS = '+json.dumps(data,ensure_ascii=False).replace('</','<\\/')+';').encode('utf-8')
            return self.send_bytes(200,payload,'application/javascript; charset=utf-8',conditional=True)
        if p.path == '/api/health':
            return self._json(200, {'ok':True,'rooms':len(ROOMS)})
        # Spectator-only endpoint, completely separate from player game access.
        if p.path.startswith('/api/rooms/') and p.path.endswith('/presence'):
            parts=[x for x in p.path.split('/') if x];code=parts[2] if len(parts)==4 else ''
            query=urllib.parse.parse_qs(p.query)
            pid=(query.get('playerId') or [''])[0];secret=(query.get('playerSecret') or [''])[0]
            with LOCK:
                room=ROOMS.get(code)
                if not room:return self._json(404,{'error':'Комната не найдена'})
                player=authorized_player(room,pid,secret)
                if not player:return self._json(403,{'error':'Нет доступа'})
                now=int(time.time());player['_lastSeenAt']=now;touch_room(room)
                connected=[k for k,v in room['players'].items() if now-int(v.get('_lastSeenAt') or 0)<=16]
                return self._json(200,{'online':connected,'total':len(room['players']),'players':[{'id':item['id'],'heroId':item.get('heroId'),'name':item.get('name')} for item in room['players'].values()]})
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
        if self.path.startswith('/api/rooms') and not self.client_compatible():return self._json(426,{'error':'Обновите игру: версия клиента несовместима с сервером'})
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
                    if not pl: return self._json(403, {'error':'Нет доступа к сохранённой партии'})
                    touch_room(room)
                    return self._json(200, {'room':public_room(room, True),'revived':False})
                return self._json(410, {'error':'Сетевая партия не найдена или срок восстановления истёк. Данные клиента не заменяют серверное сохранение.'})
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
                if len(room['players'])>=6: return self._json(409, {'error':'В комнате уже 6 игроков'})
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
                room['enemyScaling']=body.get('enemyScaling',room.get('enemyScaling',True)) is not False
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
                    
                    for hero in game.get('players',[]):ensure_progression(hero)
                    game['enemyScaling']=room.get('enemyScaling',True)
                    room['gameState']=game; room['gameRevision']=1; room['gameUpdatedAt']=int(time.time())
                return self._json(200, {'revision':room['gameRevision'],'state':room['gameState']})
        if p.endswith('/game/respec') and p.startswith('/api/rooms/'):
            code=p.split('/')[-3]
            with LOCK:
                room=ROOMS.get(code)
                if not room:return self._json(404,{'error':'Комната не найдена'})
                account=authorized_player(room,body.get('playerId'),body.get('playerSecret'))
                if not account:return self._json(403,{'error':'Нет доступа'})
                game=room.get('gameState') or {}
                player=next((q for q in game.get('players',[]) if q.get('id')==account.get('heroId')),None)
                if not player or (game.get('combat') or {}).get('heroId')==player['id']:
                    return self._json(409,{'error':'Перераспределение недоступно в бою'})
                if not player.get('learnedAbilities'):return self._json(409,{'error':'Нет изученных улучшений'})
                card_id=body.get('cardId')
                if card_id not in [485,486,487,488]:return self._json(409,{'error':'Нужно зелье перераспределения'})
                backpack=player.get('backpack') or []
                potions=(player.get('equipment') or {}).get('potions') or []
                if card_id in backpack:backpack.remove(card_id)
                elif card_id in potions:potions[potions.index(card_id)]=None
                else:return self._json(409,{'error':'Зелья нет у героя'})
                player['learnedAbilities']=[]
                deck=game.setdefault('decks',{}).setdefault('lootOuter' if card_id<=486 else 'lootHeart',{'draw':[],'discard':[]})
                if card_id not in deck['discard']:deck['discard'].append(card_id)
                room['gameUpdatedAt']=int(time.time())
                room['sideMutationCounter']=int(room.get('sideMutationCounter') or 0)+1
                entry=room.setdefault('sidePlayerOverrides',{}).setdefault(player['id'],{'fields':{},'dealRev':0})
                for field in ('learnedAbilities','backpack','equipment'):entry['fields'][field]=json.loads(json.dumps(player.get(field)))
                entry['seq']=room['sideMutationCounter']
                room.setdefault('respecDiscardOverrides',[]).append({'id':card_id,'key':'lootOuter' if card_id<=486 else 'lootHeart','heroId':player['id'],'seq':entry['seq']})
                touch_room(room)
                return self._json(200,{'player':player,'decks':game['decks'],'sideVersions':{hid:int(e.get('seq') or 0) for hid,e in room['sidePlayerOverrides'].items()}})
        if p.endswith('/game/ability') and p.startswith('/api/rooms/'):
            code=p.split('/')[-3]
            with LOCK:
                room=ROOMS.get(code)
                if not room:return self._json(404,{'error':'Комната не найдена'})
                account=authorized_player(room,body.get('playerId'),body.get('playerSecret'))
                if not account:return self._json(403,{'error':'Нет доступа'})
                game=room.get('gameState') or {}
                player=next((q for q in game.get('players',[]) if q.get('id')==account.get('heroId')),None)
                if not room.get('started') or not player:return self._json(409,{'error':'Партия ещё не готова'})
                try:learned=learn_ability(ROOT,player,body.get('nodeId'))
                except (ValueError,OSError) as exc:return self._json(409,{'error':str(exc)})
                room['gameUpdatedAt']=int(time.time())
                room['sideMutationCounter']=int(room.get('sideMutationCounter') or 0)+1
                entry=room.setdefault('sidePlayerOverrides',{}).setdefault(player['id'],{'fields':{},'dealRev':0})
                entry['fields']['learnedAbilities']=list(learned);entry['seq']=room['sideMutationCounter']
                touch_room(room)
                return self._json(200,{'heroId':player['id'],'learnedAbilities':learned,'sideVersions':{hid:int(e.get('seq') or 0) for hid,e in room['sidePlayerOverrides'].items()}})
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
                # Reject conflicting/remote purchases before changing gold or HP.
                for hex_id, entry in (side.get('territories') or {}).items():
                    if not isinstance(entry,dict) or entry.get('owner')!=owner:continue
                    prior=(game.get('territories') or {}).get(hex_id)
                    if prior and prior.get('owner')!=owner:
                        return self._json(409, {'error':'Территория уже принадлежит другому герою'})
                    if prior:continue
                    combat=game.get('combat') or {}
                    if (hex_id!=owner_cur.get('hex') or not (game.get('cleaned') or {}).get(hex_id)
                        or (game.get('locations') or {}).get(hex_id) or owner_cur.get('inDungeon')
                        or combat.get('heroId')==owner
                        or (owner_cur.get('purchaseBlockedHex')==hex_id and owner_cur.get('purchaseBlockedTurn')==owner_cur.get('personalTurn'))):
                        return self._json(409, {'error':'Покупка этой территории сейчас недоступна'})
                mutable={'gold','maxHp','currentHp','statuses','statusTimers','statusTickedTurn','backpack','pendingItems','equipment','temporaryEffects','combatEffects','itemUsage','lockedItems','locationVisits','discoveredLocations','reexploreRiskHex','notes','stats','areaHealingCooldown','scoutBootsUsedTurn','territoryBuildSeq'}
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
                if isinstance(side.get('territories'),dict):
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
                if isinstance(side.get('decks'),dict):
                    game['decks']=preserve_side_clue_decks(game,side['decks'])
                    remove_found_clues(game)
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
                # Starting NG+ is a special irreversible transition: only the
                # boss winner may reset the world, exactly one cycle at a time.
                old_cycle=int(existing.get('ngPlusCycle') or 0)
                new_cycle=int(game.get('ngPlusCycle') or 0)
                if new_cycle!=old_cycle:
                    old_winner=(existing.get('gameOver') or {}).get('winnerId') if isinstance(existing.get('gameOver'),dict) else None
                    if (new_cycle!=old_cycle+1 or not old_winner or actor!=old_winner
                            or game.get('gameOver') is not False):
                        return self._json(403, {'error':'Новую игру + может начать только победитель босса'})
                preserve_boss_state(existing,game)
                existing_deal=existing.get('tradeDeal') if isinstance(existing,dict) else None
                incoming_deal=game.get('tradeDeal') if isinstance(game,dict) else None
                existing_deal_rev=int(existing_deal.get('rev') or 0) if isinstance(existing_deal,dict) else -1
                incoming_deal_rev=int(incoming_deal.get('rev') or 0) if isinstance(incoming_deal,dict) else -1
                # Если фоновая торговля успела продвинуться после последнего снимка активного игрока,
                # сохраняем более свежую сделку, а не стираем её устаревшим full-state.
                if existing_deal_rev>incoming_deal_rev:
                    game['tradeDeal']=existing_deal
                incoming_players={q.get('id'):q for q in game.get('players',[]) if isinstance(q,dict)}
                for prior in existing.get('players',[]):
                    inc=incoming_players.get(prior.get('id'))
                    if inc is not None:inc['learnedAbilities']=list(prior.get('learnedAbilities') or [])
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
                pending_respec=[]
                for spent in room.get('respecDiscardOverrides',[]):
                    if int(side_acks.get(spent['heroId']) or 0)<spent['seq']:
                        decks=game.setdefault('decks',{})
                        for deck_state in decks.values():
                            for part in ('draw','discard'):
                                deck_state[part]=[x for x in deck_state.get(part,[]) if x!=spent['id']]
                        decks.setdefault(spent['key'],{'draw':[],'discard':[]})['discard'].append(spent['id'])
                        pending_respec.append(spent)
                room['respecDiscardOverrides']=pending_respec
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
                
                for hero in game.get('players',[]):ensure_progression(hero)
                game['enemyScaling']=existing.get('enemyScaling',room.get('enemyScaling',True))
                room['gameState']=game; room['gameRevision']=base+1; room['gameUpdatedAt']=int(time.time())
                return self._json(200, {'revision':room['gameRevision']})
        return self._json(404, {'error':'Неизвестный запрос'})

if __name__ == '__main__':
    build_manifest(ROOT)
    port=int(os.environ.get('PORT','8080'))
    os.chdir(ROOT)
    print(f'RPG Online Lobby: http://0.0.0.0:{port}')
    print('Оставьте это окно Терминала открытым.')
    print('Сетевые сохранения SQLite:',NETWORK_DB_PATH, '(на Render Free без постоянного диска рестарт не гарантирован)')
    ThreadingHTTPServer(('0.0.0.0',port), Handler).serve_forever()
