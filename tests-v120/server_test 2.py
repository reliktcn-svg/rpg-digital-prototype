import sys,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests-progression'))
from server_test import ProgressionServer,server,unittest
class TerritoryServer(ProgressionServer):
 def test_offturn_buy_survives_active_combat_snapshot(self):
  game=server.ROOMS[self.code]['gameState']
  game['players'][1].update(hex='ТК70',gold=100,maxHp=8,currentHp=8,personalTurn=2)
  game['cleaned']={'ТК70':True};game['locations']={};game['combat']={'heroId':'warrior','phase':'hero_turn','enemyHp':17}
  stale=copy.deepcopy(game)
  side={'type':'offturnInventory','ownerId':'mage','players':[{'id':'mage','gold':90,'maxHp':10,'territoryBuildSeq':{'kingdom':1}}],'territories':{'ТК70':{'owner':'mage','areaId':None}},'areas':[],'nextAreaId':1}
  code,data=self.api(self.url+'/game/side',{**self.g,'side':side});self.assertEqual(code,200,data)
  code,data=self.api(self.url+'/game/state',{**self.h,'baseRevision':1,'state':stale});self.assertEqual(code,200,data)
  game=server.ROOMS[self.code]['gameState'];p=game['players'][1]
  self.assertEqual(game['territories']['ТК70']['owner'],'mage');self.assertEqual(p['gold'],90);self.assertEqual(p['maxHp'],10)
  self.assertEqual(game['combat'],stale['combat']);self.assertEqual(game['currentIndex'],0)
 def test_invalid_buy_does_not_deduct_gold(self):
  game=server.ROOMS[self.code]['gameState'];game['players'][1].update(hex='ТК70',gold=100)
  code,_=self.api(self.url+'/game/side',{**self.g,'side':{'type':'offturnInventory','ownerId':'mage','players':[{'id':'mage','gold':90}],'territories':{'ТК71':{'owner':'mage'}}}})
  self.assertEqual(code,409);self.assertEqual(game['players'][1]['gold'],100)
if __name__=='__main__':unittest.main()
