import sys,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests-progression'))
from server_test import ProgressionServer,server
class Scaling(ProgressionServer):
 def test_scaling(self):
  room=server.ROOMS[self.code];room['started']=False
  code,data=self.api(self.url+'/mode',{**self.h,'hardMode':False,'enemyScaling':False});self.assertEqual(code,200);self.assertFalse(data['room']['enemyScaling'])
  self.assertEqual(self.api(self.url+'/mode',{**self.g,'enemyScaling':True})[0],403)
  self.api(self.url+'/start',self.h);room['gameState']=None
  self.api(self.url+'/game/init',{**self.h,'state':self.initial});self.assertFalse(room['gameState']['enemyScaling'])
  self.assertEqual(self.api(self.url+'/mode',{**self.h,'enemyScaling':True})[0],409)
  incoming=copy.deepcopy(room['gameState']);incoming['enemyScaling']=True
  code,data=self.api(self.url+'/game/state',{**self.h,'baseRevision':1,'state':incoming});self.assertEqual(code,200,data);self.assertFalse(room['gameState']['enemyScaling'])
if __name__=='__main__':
 server.Handler.log_message=lambda *a:None
 unittest.main()
