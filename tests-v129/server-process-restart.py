import subprocess,os,time,json,urllib.request,sqlite3
from pathlib import Path
root=Path('work/rpg-v06129-mobile-save').resolve();db='/tmp/rpg129-test2.sqlite3'
rows=sqlite3.connect(db).execute('select payload from rooms').fetchall();room=next(json.loads(x[0]) for x in rows if json.loads(x[0]).get('gameState'))
p=next(iter(room['players'].values()));from urllib.parse import urlencode
url='http://127.0.0.1:8844/api/rooms/'+room['code']+'/game?'+urlencode({'playerId':p['id'],'playerSecret':p['secret']})
previous=None
for run in range(2):
 env={**os.environ,'PORT':'8844','RPG_SAVE_DB':db};proc=subprocess.Popen(['/Users/macbook/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',str(root/'server.py')],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  for i in range(100):
   try:
    with urllib.request.urlopen(url) as response:data=json.load(response)
    break
   except Exception:time.sleep(.1)
  else:raise RuntimeError('server not ready')
  snapshot=data['state'];assert snapshot['round']==20
  if previous is not None:assert snapshot==previous
  previous=snapshot
 finally:proc.terminate();proc.wait(timeout=10)
print('PASS two separate server processes reopen same SQLite file, authenticate returning player, restore identical four-player round-20 state')
