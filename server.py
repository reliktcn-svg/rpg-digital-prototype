#!/usr/bin/env python3
import json, os, random, string, threading, time, urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
ROOMS = {}
LOCK = threading.RLock()

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

def public_room(room):
    return {
        'code': room['code'],
        'started': room['started'],
        'createdAt': room['createdAt'],
        'players': [
            {'id':p['id'],'name':p['name'],'heroId':p.get('heroId'),'host':p.get('host',False)}
            for p in room['players'].values()
        ],
        'gameReady': room.get('gameState') is not None,
        'gameRevision': int(room.get('gameRevision') or 0),
    }

def authorized_player(room, pid, secret):
    pl=room.get('players',{}).get(pid)
    return pl if pl and pl.get('secret')==secret else None

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
                if not room.get('started'): return self._json(409, {'error':'Партия ещё не началась'})
                if room.get('gameState') is None: return self._json(202, {'ready':False,'revision':int(room.get('gameRevision') or 0)})
                return self._json(200, {'ready':True,'revision':int(room.get('gameRevision') or 0),'state':room.get('gameState')})
        if p.path.startswith('/api/rooms/'):
            code=p.path.split('/')[-1]
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                return self._json(200, public_room(room))
        return super().do_GET()

    def do_POST(self):
        p=urllib.parse.urlparse(self.path).path
        body=self._body()
        if p == '/api/rooms':
            code=room_code(); pid=token(12); secret=token(24)
            name=(body.get('name') or 'Хозяин').strip()[:24] or 'Хозяин'
            with LOCK:
                ROOMS[code]={
                    'code':code,'createdAt':int(time.time()),'started':False,'hostId':pid,
                    'players':{pid:{'id':pid,'secret':secret,'name':name,'heroId':None,'host':True}},
                    'gameState':None,'gameRevision':0,'gameUpdatedAt':None
                }
                data=public_room(ROOMS[code])
            return self._json(201, {'room':data,'playerId':pid,'playerSecret':secret})
        if p.endswith('/join') and p.startswith('/api/rooms/'):
            code=p.split('/')[-2]; name=(body.get('name') or 'Игрок').strip()[:24] or 'Игрок'
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                if room['started']: return self._json(409, {'error':'Партия уже началась'})
                if len(room['players'])>=5: return self._json(409, {'error':'В комнате уже 5 игроков'})
                pid=token(12); secret=token(24)
                room['players'][pid]={'id':pid,'secret':secret,'name':name,'heroId':None,'host':False}
                data=public_room(room)
            return self._json(200, {'room':data,'playerId':pid,'playerSecret':secret})
        if p.endswith('/select') and p.startswith('/api/rooms/'):
            code=p.split('/')[-2]; pid=body.get('playerId'); secret=body.get('playerSecret'); hero=body.get('heroId')
            if hero not in HERO_IDS: return self._json(400, {'error':'Неизвестный герой'})
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                pl=room['players'].get(pid)
                if not pl or pl.get('secret')!=secret: return self._json(403, {'error':'Нет доступа'})
                for q in room['players'].values():
                    if q['id']!=pid and q.get('heroId')==hero:
                        return self._json(409, {'error':'Этот герой уже занят'})
                pl['heroId']=hero
                data=public_room(room)
            return self._json(200, {'room':data})
        if p.endswith('/start') and p.startswith('/api/rooms/'):
            code=p.split('/')[-2]; pid=body.get('playerId'); secret=body.get('playerSecret')
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                pl=room['players'].get(pid)
                if not pl or pl.get('secret')!=secret or pid!=room['hostId']:
                    return self._json(403, {'error':'Начать игру может только хозяин'})
                players=list(room['players'].values())
                if len(players)<2: return self._json(409, {'error':'Нужно минимум 2 игрока'})
                if any(not q.get('heroId') for q in players): return self._json(409, {'error':'Не все игроки выбрали героя'})
                room['started']=True
                data=public_room(room)
            return self._json(200, {'room':data})
        if p.endswith('/game/init') and p.startswith('/api/rooms/'):
            code=p.split('/')[-3]; pid=body.get('playerId'); secret=body.get('playerSecret'); game=body.get('state')
            if not isinstance(game,dict): return self._json(400, {'error':'Некорректное состояние партии'})
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                pl=authorized_player(room,pid,secret)
                if not pl or pid!=room.get('hostId'): return self._json(403, {'error':'Инициализировать партию может только хозяин'})
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
                game=room.get('gameState')
                if not room.get('started') or not isinstance(game,dict): return self._json(409, {'error':'Сетевая партия ещё не готова'})
                owner=side.get('ownerId')
                if not owner or owner!=account.get('heroId'): return self._json(403, {'error':'Фоновое действие разрешено только своему герою'})
                current_players={q.get('id'):q for q in game.get('players',[]) if isinstance(q,dict)}
                owner_cur=current_players.get(owner)
                if not owner_cur: return self._json(409, {'error':'Герой не найден в партии'})
                mutable={'gold','maxHp','currentHp','statuses','statusTimers','statusTickedTurn','backpack','pendingItems','equipment','temporaryEffects','combatEffects','itemUsage','locationVisits','discoveredLocations','reexploreRiskHex','notes','stats','areaHealingCooldown','scoutBootsUsedTurn'}
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
                room['gameRevision']=int(room.get('gameRevision') or 0)+1; room['gameUpdatedAt']=int(time.time())
                return self._json(200, {'revision':room['gameRevision']})
        if p.endswith('/game/state') and p.startswith('/api/rooms/'):
            code=p.split('/')[-3]; pid=body.get('playerId'); secret=body.get('playerSecret'); game=body.get('state'); base=int(body.get('baseRevision') or 0)
            if not isinstance(game,dict): return self._json(400, {'error':'Некорректное состояние партии'})
            with LOCK:
                room=ROOMS.get(code)
                if not room: return self._json(404, {'error':'Комната не найдена'})
                if not authorized_player(room,pid,secret): return self._json(403, {'error':'Нет доступа'})
                if not room.get('started') or room.get('gameState') is None: return self._json(409, {'error':'Сетевая партия ещё не готова'})
                if base!=int(room.get('gameRevision') or 0):
                    return self._json(409, {'error':'Состояние партии уже изменилось','revision':room.get('gameRevision')})
                room['gameState']=game; room['gameRevision']=base+1; room['gameUpdatedAt']=int(time.time())
                return self._json(200, {'revision':room['gameRevision']})
        return self._json(404, {'error':'Неизвестный запрос'})

if __name__ == '__main__':
    port=int(os.environ.get('PORT','8080'))
    os.chdir(ROOT)
    print(f'RPG Online Lobby: http://0.0.0.0:{port}')
    print('Оставьте это окно Терминала открытым.')
    ThreadingHTTPServer(('0.0.0.0',port), Handler).serve_forever()
