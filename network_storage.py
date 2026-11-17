"""Server-side seven-day room snapshots. SQLite path must be on a persistent volume in production.
This module never stores client-supplied solo saves.
"""
import json, os, sqlite3, time, tempfile, hashlib
from contextlib import closing
from pathlib import Path

TTL=7*24*60*60
IDLE_TTL=3*60*60
PROJECT_TAG=hashlib.sha256(str(Path(__file__).resolve().parent).encode()).hexdigest()[:12]
PATH=Path(os.environ.get('RPG_SAVE_DB_PATH',str(Path(tempfile.gettempdir())/f'rpg-digital-network-{PROJECT_TAG}.sqlite3'))).expanduser().resolve()
if PATH.is_relative_to(Path(__file__).resolve().parent):
    raise RuntimeError('RPG_SAVE_DB_PATH должен указывать на папку вне публичного каталога игры')

def connect():
    PATH.parent.mkdir(parents=True,exist_ok=True)
    db=sqlite3.connect(str(PATH),timeout=8)
    os.chmod(PATH,0o600)
    db.execute('PRAGMA busy_timeout=8000')
    db.execute('CREATE TABLE IF NOT EXISTS room_saves (code TEXT PRIMARY KEY, updated_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, state TEXT NOT NULL)')
    return db

def expiry(room):
    t=int((room.get('lastPlayerSeenAt') or room.get('gameUpdatedAt') or room.get('lastActiveAt') or room.get('createdAt') or time.time()) if room.get('started') else (room.get('lastActiveAt') or room.get('createdAt') or time.time()))
    return t+(TTL if room.get('started') else IDLE_TTL)

def snapshot(room):
    # Drop ephemeral per-process HTTP projections and map-viewer secrets.
    result={k:v for k,v in room.items() if k not in ('_http_cache','mapViewers') and not k.startswith('_')}
    result['players']={pid:{k:v for k,v in p.items() if k!='_lastSeenAt'} for pid,p in room.get('players',{}).items()}
    return result

def save(room):
    entry=snapshot(room)
    updated=int(entry.get('gameUpdatedAt') or entry.get('lastActiveAt') or entry.get('createdAt') or time.time())
    with closing(connect()) as db, db:
        db.execute('INSERT OR REPLACE INTO room_saves(code,updated_at,expires_at,state) VALUES(?,?,?,?)',
                   (entry['code'],updated,expiry(entry),json.dumps(entry,ensure_ascii=False,separators=(',',':'))))

def remove(codes):
    if not codes:return
    with closing(connect()) as db, db:
        db.executemany('DELETE FROM room_saves WHERE code=?',[(c,) for c in codes])
        if db.execute("SELECT name FROM sqlite_master WHERE name='party_chat'").fetchone():db.executemany('DELETE FROM party_chat WHERE room=?',[(c,) for c in codes])

def restore(now=None):
    now=int(time.time() if now is None else now)
    with closing(connect()) as db, db:
        rows=db.execute('SELECT code,state FROM room_saves').fetchall()
        kept=[]
        for code,text in rows:
            try:
                record=json.loads(text)
                if record.get('started') and not record.get('lastPlayerSeenAt'):record['lastPlayerSeenAt']=int(record.get('gameUpdatedAt') or record.get('lastActiveAt') or record.get('createdAt') or 0)
                deadline=expiry(record)
                text=json.dumps(record,ensure_ascii=False,separators=(',',':'))
            except (ValueError,TypeError,KeyError):deadline=0
            if deadline<=now:
                db.execute('DELETE FROM room_saves WHERE code=?',(code,))
                if db.execute("SELECT name FROM sqlite_master WHERE name='party_chat'").fetchone():db.execute('DELETE FROM party_chat WHERE room=?',(code,))
            else:
                db.execute('UPDATE room_saves SET expires_at=? WHERE code=?',(deadline,code))
                kept.append((code,text))
        rows=kept
    output={}
    for code,text in rows:
        try:
            room=json.loads(text)
            if isinstance(room,dict) and room.get('code')==code and isinstance(room.get('players'),dict):output[code]=room
        except (ValueError,TypeError):pass
    return output
