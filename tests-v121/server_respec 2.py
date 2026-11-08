import sys,copy,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests-progression'))
from server_test import ProgressionServer,server
class RespecServer(ProgressionServer):
 def test_respec_atomic_and_old_snapshot(self):
  game=server.ROOMS[self.code]['gameState'];p=game['players'][1]
  p.update(masterystuff=1,masteryPoints=1300,learnedAbilities=['n5_R8'],backpack=[485],equipment={'potions':[None,None]})
  game['decks']={'lootOuter':{'draw':[],'discard':[]},'lootHeart':{'draw':[],'discard':[]}}
  old=copy.deepcopy(game)
  code,data=self.api(self.url+'/game/respec',{**self.g,'cardId':485});self.assertEqual(code,200,data)
  self.assertEqual(data['player']['learnedAbilities'],[]);self.assertEqual(data['player']['masteryPoints'],1300);self.assertNotIn(485,data['player']['backpack'])
  code,data=self.api(self.url+'/game/state',{**self.h,'baseRevision':1,'state':old});self.assertEqual(code,200,data)
  current=server.ROOMS[self.code]['gameState'];self.assertEqual(current['players'][1]['learnedAbilities'],[]);self.assertNotIn(485,current['players'][1]['backpack']);self.assertIn(485,current['decks']['lootOuter']['discard'])
  self.assertEqual(self.api(self.url+'/game/respec',{**self.g,'cardId':485})[0],409)
 def test_cannot_reset_without_potion_or_in_combat(self):
  game=server.ROOMS[self.code]['gameState'];p=game['players'][1];p['learnedAbilities']=['n5_R8'];p['backpack']=[]
  self.assertEqual(self.api(self.url+'/game/respec',{**self.g,'cardId':485})[0],409)
  p['backpack']=[485];game['combat']={'heroId':'mage'}
  self.assertEqual(self.api(self.url+'/game/respec',{**self.g,'cardId':485})[0],409);self.assertEqual(p['backpack'],[485]);self.assertEqual(p['learnedAbilities'],['n5_R8'])
if __name__=='__main__':
 server.Handler.log_message=lambda *a:None
 unittest.main()
