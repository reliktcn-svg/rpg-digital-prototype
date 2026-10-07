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
                return self._json(200, {'ready':True,'revision':int(room.get('gameRevision') or 0),'state':room.get('gameState')})
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
                for incoming in side.get('players') or []:
                    if not isinstance(incoming,dict): continue
                    hid=incoming.get('id'); cur=current_players.get(hid)
                    if not cur: continue
                    # Помимо своего героя разрешаем менять только героя на том же гексе — это нужно для сделки между игроками.
                    if hid!=owner and cur.get('hex')!=owner_cur.get('hex'): continue
                    for key in mutable:
                        if key in incoming: cur[key]=incoming[key]
                if isinstance(side.get('decks'),dict): game['decks']=side['decks']
                if isinstance(side.get('locations'),dict): game['locations']=side['locations']
                if isinstance(side.get('journal'),list):
                    incoming={'journal':side.get('journal')}; merge_journal(game,incoming); game['journal']=incoming['journal']
                room['gameRevision']=int(room.get('gameRevision') or 0)+1; room['gameUpdatedAt']=int(time.time())
                return self._json(200, {'revision':room['gameRevision']})
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
                merge_journal(room.get('gameState') or {}, game)
                room['gameState']=game; room['gameRevision']=base+1; room['gameUpdatedAt']=int(time.time())
                return self._json(200, {'revision':room['gameRevision']})
        return self._json(404, {'error':'Неизвестный запрос'})

if __name__ == '__main__':
    port=int(os.environ.get('PORT','8080'))
    os.chdir(ROOT)
    print(f'RPG Online Lobby: http://0.0.0.0:{port}')
    print('Оставьте это окно Терминала открытым.')
    ThreadingHTTPServer(('0.0.0.0',port), Handler).serve_forever()
