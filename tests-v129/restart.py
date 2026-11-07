import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests-v127'))
from transport_test import Transport,server
class Restart(Transport):
 def test_room_reloaded_and_authenticated(self):
  before=self.raw(self.gamepath())[2]
  server.ROOMS.pop(self.url.split('/')[-1],None)
  self.assertEqual(self.raw(self.gamepath())[0],200)
  self.assertEqual(self.raw(self.gamepath())[2],before)
  self.assertEqual(self.raw(self.gamepath({**self.h,'playerSecret':'bad'}))[0],403)
if __name__=='__main__':
 server.Handler.log_message=lambda *a:None
 unittest.main()
