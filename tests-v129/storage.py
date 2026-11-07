import sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from room_store import RoomStore,LazyRooms
class Storage(unittest.TestCase):
 def test_restart_deadline_and_heartbeat(self):
  with tempfile.TemporaryDirectory() as t:
   p=t+'/rooms.sqlite3';s=RoomStore(p);r={'code':'123456','createdAt':100,'players':{'p':{'secret':'secret'}},'gameState':{'round':8},'_http_cache':{}}
   with patch('time.time',return_value=100):s.save(r,action=True)
   with patch('time.time',return_value=80000):
    r['lastActiveAt']=80000;s.save(r);loaded=LazyRooms(RoomStore(p)).get('123456');self.assertEqual(loaded['gameState']['round'],8);self.assertEqual(loaded['lastActionAt'],100);self.assertNotIn('_http_cache',loaded)
   with patch('time.time',return_value=86500):self.assertIsNone(s.load('123456'))
 def test_new_action_extends(self):
  with tempfile.TemporaryDirectory() as t:
   s=RoomStore(t+'/save.db');r={'code':'a','createdAt':100}
   with patch('time.time',return_value=100):s.save(r,True)
   with patch('time.time',return_value=80000):s.save(r,True)
   with patch('time.time',return_value=90000):self.assertIsNotNone(s.load('a'))
unittest.main()
