"""Room-scoped plain text chat. Same durable database as room recovery."""
import time
from contextlib import closing
from network_storage import connect

def setup(db):
    db.execute('CREATE TABLE IF NOT EXISTS party_chat (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT NOT NULL, player TEXT NOT NULL, name TEXT NOT NULL, hero TEXT, text TEXT NOT NULL, ts REAL NOT NULL, nonce TEXT NOT NULL, UNIQUE(room,player,nonce))')
    db.execute('CREATE INDEX IF NOT EXISTS chat_room_id ON party_chat(room,id)')

def history(code, after=0):
    with closing(connect()) as db, db:
        setup(db)
        rows=db.execute('SELECT id,player,name,hero,text,ts FROM (SELECT * FROM party_chat WHERE room=? ORDER BY id DESC LIMIT 300) WHERE id>? ORDER BY id',(code,after)).fetchall()
    return [dict(zip(('id','playerId','name','heroId','text','time'),row)) for row in rows]

def send(code, player, text, nonce):
    if not isinstance(text,str) or not text.strip() or len(text)>500:raise ValueError('Сообщение: от 1 до 500 символов')
    if not isinstance(nonce,str) or not 8<=len(nonce)<=80:raise ValueError('Некорректный идентификатор сообщения')
    with closing(connect()) as db, db:
        setup(db)
        db.execute('BEGIN IMMEDIATE')
        old=db.execute('SELECT id FROM party_chat WHERE room=? AND player=? AND nonce=?',(code,player['id'],nonce)).fetchone()
        if old:return old[0]
        now=time.time()
        last=db.execute('SELECT MAX(ts) FROM party_chat WHERE room=? AND player=?',(code,player['id'])).fetchone()[0]
        if last and now-last<1:raise OverflowError('Подожди секунду перед следующим сообщением')
        cur=db.execute('INSERT INTO party_chat(room,player,name,hero,text,ts,nonce) VALUES(?,?,?,?,?,?,?)',(code,player['id'],player['name'],player.get('heroId'),text.strip(),now,nonce))
        db.execute('DELETE FROM party_chat WHERE room=? AND id NOT IN (SELECT id FROM party_chat WHERE room=? ORDER BY id DESC LIMIT 300)',(code,code))
        return cur.lastrowid
