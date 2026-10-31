"""Server-side skill validation, including paid regeneration roots."""
import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from hero_atlas import learn_ability,read_atlas,node_cost
ROOT=Path(__file__).resolve().parents[1]
class Regeneration(unittest.TestCase):
 def test_all_heroes(self):
  for hero in ['warrior','dwarf','mage','archer','rogue','paladin']:
   p={'id':hero,'masteryPoints':0,'progressionVersion':2,'learnedAbilities':[]}
   for rank in (1,2,3):
    node=f'{hero}-regeneration-{rank}';low=rank*2;high=low+1
    p['masteryPoints']=25*(low-1)*(low+8)
    with self.assertRaisesRegex(ValueError,'уровень'):learn_ability(ROOT,p,node)
    p['masteryPoints']=25*(high-1)*(high+8)
    learn_ability(ROOT,p,node)
    self.assertEqual(len(p['learnedAbilities']),rank)
   with self.assertRaisesRegex(ValueError,'Уже изучено'):learn_ability(ROOT,p,node)
 def test_order_and_funds(self):
  p={'id':'warrior','masteryPoints':1050,'progressionVersion':2,'learnedAbilities':[]}
  with self.assertRaisesRegex(ValueError,'предыдущую'):learn_ability(ROOT,p,'warrior-regeneration-2')
  data=read_atlas(ROOT);h=data['characters'][0];ability=h['abilities'][0]
  # Four points at level five cannot buy a 3-point natural upgrade plus regeneration III.
  p['masteryPoints']=550;learn_ability(ROOT,p,'warrior-regeneration-1')
  self.assertIn('warrior-regeneration-1',p['learnedAbilities'])
if __name__=='__main__':unittest.main()
