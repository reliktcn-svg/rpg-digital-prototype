"""Build gate: local regressions, then real PostgreSQL restart/lease tests.

The integration test creates its own temporary schema and never claims the
production writer lease. The database credential is read only from environment.
"""
import os
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def regressions():
    local = dict(os.environ)
    for key in ('DATABASE_URL', 'RPG_DATABASE_URL', 'RENDER', 'RPG_STORAGE_PERSISTENT'):
        local.pop(key, None)
    subprocess.run([sys.executable, '-m', 'unittest', 'test_retention.py', 'test_party_voting.py'],
                   cwd=ROOT, env=local, check=True)


def postgres_restart():
    import psycopg
    from psycopg import sql
    dsn = os.environ.get('RPG_DATABASE_URL') or os.environ.get('DATABASE_URL')
    if not dsn:
        raise RuntimeError('DATABASE_URL is required for the deployment test.')
    namespace = 'qa_restart_' + uuid.uuid4().hex
    env = dict(os.environ, RPG_DATABASE_SCHEMA=namespace, PYTHONPATH=str(ROOT))
    child = None
    with psycopg.connect(dsn, connect_timeout=15) as db:
        db.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(namespace)))
    try:
        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            writer = r'''
import json, sys, time
import network_storage as n
import party_chat as chat
n.restore()
now=int(time.time())
room={'code':'987654','started':True,'createdAt':now,'lastPlayerSeenAt':now,'gameUpdatedAt':now,'gameRevision':7,'players':{'p':{'id':'p','secret':'qa-only-secret','name':'QA hero','heroId':'warrior'}},'gameState':{'players':[{'id':'warrior','gold':27,'currentHp':9,'equipment':{'weapon':141},'backpack':[193]}],'territories':{'A':{'owner':'warrior','areaId':1}},'areas':[{'id':1,'owner':'warrior'}]}}
n.save(room)
assert chat.send(room['code'],room['players']['p'],'restart-check','nonce-original')>0
print('READY',flush=True)
sys.stdin.readline()
try:
 n.save(room)
 raise AssertionError('Replaced process overwrote the new deployment')
except n.StorageError:
 print('STALE_WRITE_BLOCKED',flush=True)
'''
            reader = r'''
import copy, time
from unittest.mock import patch
import network_storage as n
import party_chat as chat
rooms=n.restore()
r=rooms['987654'];g=r['gameState'];p=g['players'][0]
assert r['gameRevision']==7 and p['equipment']['weapon']==141
assert p['backpack']==[193] and p['gold']==27 and p['currentHp']==9
assert g['territories']['A']['owner']=='warrior' and g['areas'][0]['id']==1
history=chat.history(r['code']);assert len(history)==1
assert chat.send(r['code'],r['players']['p'],'restart-check','nonce-original')==history[0]['id']
with patch('postgres_storage.time.time',return_value=time.time()+10):
 chat.send(r['code'],r['players']['p'],'next-message','nonce-next-message')
 try:
  chat.send(r['code'],r['players']['p'],'too-fast','nonce-too-fast')
  raise AssertionError('Chat rate limit lost')
 except OverflowError:pass
assert len(chat.history(r['code']))==2
expired=copy.deepcopy(r);expired['code']='expired';expired['lastPlayerSeenAt']=int(time.time())-604801
n.save(expired);assert 'expired' not in n.restore()
p['gold']=28;n.save(r)
print('RESTART_CHAT_TTL_OK',flush=True)
'''
            child = subprocess.Popen([sys.executable, '-u', '-c', writer], cwd=first, env=env,
                                     stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            # First process writes the fixture, then waits while its replacement starts.
            import selectors
            ready = selectors.DefaultSelector()
            ready.register(child.stdout, selectors.EVENT_READ)
            if not ready.select(45) or child.stdout.readline().strip() != 'READY':
                raise RuntimeError('First storage-test process did not become ready.')
            ready.close()
            restored = subprocess.run([sys.executable, '-u', '-c', reader], cwd=second, env=env,
                                      capture_output=True, text=True, timeout=60)
            if restored.returncode or 'RESTART_CHAT_TTL_OK' not in restored.stdout:
                raise RuntimeError('PostgreSQL restart/chat/expiry test failed.')
            output, _ = child.communicate('\n', timeout=30)
            if child.returncode or 'STALE_WRITE_BLOCKED' not in output:
                raise RuntimeError('Replaced-writer protection test failed.')
            # Check the replaced process did not put the older gold total back.
            with psycopg.connect(dsn, connect_timeout=15) as db:
                row = db.execute(sql.SQL('SELECT state FROM {}.room_saves WHERE code=%s').format(sql.Identifier(namespace)), ('987654',)).fetchone()
                import json
                assert json.loads(row[0])['gameState']['players'][0]['gold'] == 28
            print('PASS: real PostgreSQL restart from a new directory; hero/gear/land/chat retained; expiry, nonce deduplication, rate limit and stale-writer protection.', flush=True)
    finally:
        if child is not None and child.poll() is None:
            child.kill()
            child.communicate()
        with psycopg.connect(dsn, connect_timeout=15) as db:
            db.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(namespace)))


if __name__ == '__main__':
    regressions()
    postgres_restart()
