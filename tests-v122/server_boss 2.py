import sys,copy,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests-progression'))
from server_test import ProgressionServer,server
class BossServer(ProgressionServer):
 def test_persist_boss_and_shared_clues(self):
  game=server.ROOMS[self.code]['gameState'];game['players'][0]['masteryPoints']=10000;game['players'][0]['progressionVersion']=2
  b={'schema':1,'key':'demon','types':['Демон'],'hp':67,'defense':17,'attack':7,'damage':'D12','effectKeys':['burn'],'effectText':'19–20 — Горение.','immunities':[],'found':[0,1,2],'injected':[0,1,2,3],'heartUnlocked':False}
  game['boss']=copy.deepcopy(b);game['decks']={'exploreOuter':{'draw':[1,495],'discard':[489]},'exploreHeart':{'draw':[496,33],'discard':[]}}
  incoming=copy.deepcopy(game);incoming['boss'].update(hp=999,key='plant',found=[0,1,2,3],heartUnlocked=False)
  code,data=self.api(self.url+'/game/state',{**self.h,'baseRevision':1,'state':incoming});self.assertEqual(code,200,data)
  current=server.ROOMS[self.code]['gameState'];self.assertEqual(current['boss']['hp'],67);self.assertEqual(current['boss']['key'],'demon');self.assertTrue(current['boss']['heartUnlocked']);self.assertNotIn(496,current['decks']['exploreHeart']['draw']);self.assertNotIn(489,current['decks']['exploreOuter']['discard'])
  stale=copy.deepcopy(current);stale['boss']['found']=[0];server.preserve_boss_state(current,stale);self.assertEqual(stale['boss']['found'],[0,1,2,3])
 def test_side_decks_keep_current_clues(self):
  game={'boss':{'found':[0]},'decks':{'exploreOuter':{'draw':[1,491],'discard':[]},'exploreHeart':{'draw':[492,33],'discard':[]}}}
  stale={'exploreOuter':{'draw':[489,1],'discard':[]},'exploreHeart':{'draw':[490,33],'discard':[]}}
  game['decks']=server.preserve_side_clue_decks(game,stale);server.remove_found_clues(game)
  self.assertEqual(game['decks']['exploreOuter']['draw'],[1,491]);self.assertEqual(game['decks']['exploreHeart']['draw'],[492,33])
if __name__=='__main__':
 server.Handler.log_message=lambda *a:None
 unittest.main()
