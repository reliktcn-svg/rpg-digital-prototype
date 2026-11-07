"""Host-independent atomic SQLite room snapshots. Put RPG_SAVE_DB on a persistent disk."""
import sqlite3,json,time,threading,os
class RoomStore:
 def __init__(self,path):
  os.makedirs(os.path.dirname(os.path.abspath(path)),exist_ok=True)
  self.lock=threading.RLock();self.db=sqlite3.connect(path,check_same_thread=False)
  self.db.execute('PRAGMA journal_mode=WAL')
  try:os.chmod(path,0o600)
  except OSError:pass
  self.db.execute('CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, payload TEXT NOT NULL, expires INTEGER NOT NULL)');self.db.commit()
 def save(self,room,action=False):
  now=int(time.time())
  if action:room['lastActionAt']=now
  room.setdefault('lastActionAt',room.get('createdAt',now))
  payload=json.dumps({k:v for k,v in room.items() if not k.startswith('_')},ensure_ascii=False,separators=(',',':'))
  with self.lock,self.db:self.db.execute('INSERT OR REPLACE INTO rooms VALUES(?,?,?)',(room['code'],payload,room['lastActionAt']+86400))
 def load(self,code):
  with self.lock:
   row=self.db.execute('SELECT payload,expires FROM rooms WHERE code=?',(code,)).fetchone()
   if not row or row[1]<=int(time.time()):return None
   return json.loads(row[0])
 def exists(self,code):
  with self.lock:return self.db.execute('SELECT 1 FROM rooms WHERE code=?',(code,)).fetchone() is not None
 def delete_expired(self,now):
  with self.lock,self.db:self.db.execute('DELETE FROM rooms WHERE expires<=?',(int(now),))
class LazyRooms(dict):
 def __init__(self,store):super().__init__();self.store=store
 def get(self,key,default=None):
  if not dict.__contains__(self,key):
   value=self.store.load(key)
   if value is not None:dict.__setitem__(self,key,value)
  return dict.get(self,key,default)
 def __contains__(self,key):return dict.__contains__(self,key) or self.store.exists(key)
