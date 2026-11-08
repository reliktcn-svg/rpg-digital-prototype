"""v0.6.130 — server progression and asset compatibility smoke checks.
Run: python -m unittest discover -s tests-v130 -v
"""
import unittest
from pathlib import Path
import sys,json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from hero_atlas import NAMES,read_atlas,learn_ability,progression_level,node_cost

LEVELS=[3,7,10,13,16]
COSTS=[1,1,2,2,3]

class CarryingTests(unittest.TestCase):
 def xp_at(self,level):
  return 25*(level-1)*(level+8)
 def test_all_six_heroes_have_five_ranks(self):
  atlas=read_atlas(ROOT)
  self.assertEqual(len(atlas['characters']),6)
  ids=set()
  for hero in atlas['characters']:
   branches=[a for a in hero['abilities'] if 'Грузопод' in a['name']]
   self.assertEqual(len(branches),1)
   nodes=branches[0]['nodes'];self.assertEqual(len(nodes),5)
   for i,node in enumerate(nodes):
    self.assertNotIn(node['id'],ids);ids.add(node['id'])
    self.assertEqual(node['minHeroLevel'],LEVELS[i]);self.assertEqual(node['pointCost'],COSTS[i])
    self.assertTrue((ROOT/'assets/ability-icons'/f'capacity-{i+1}.png').is_file())
    if i:self.assertEqual(node['parent'],nodes[i-1]['id'])
 def test_server_cost_gates_and_point_budget(self):
  for hero_id in NAMES:
   p={'id':hero_id,'progressionVersion':2,'masteryPoints':self.xp_at(2),'learnedAbilities':[]}
   atlas=read_atlas(ROOT)
   hero=next(x for x in atlas['characters'] if x['name']==NAMES[hero_id])
   ranks=next(a['nodes'] for a in hero['abilities'] if 'грузопод' in a['name'].lower())
   with self.assertRaisesRegex(ValueError,'Требуется 3 уровень'):
    learn_ability(ROOT,p,ranks[0]['id'])
   for i,minimum in enumerate(LEVELS):
    p['masteryPoints']=self.xp_at(minimum)
    self.assertEqual(progression_level(p),minimum)
    self.assertEqual(len(learn_ability(ROOT,p,ranks[i]['id'])),i+1)
    with self.assertRaisesRegex(ValueError,'Уже изучено'):
     learn_ability(ROOT,p,ranks[i]['id'])
 def test_new_backpack_and_bag_images(self):
  for name in ['backpack.webp','potion-satchel.webp']:
   p=ROOT/'assets/ui'/name
   self.assertTrue(p.exists());self.assertGreater(p.stat().st_size,2000)
 def test_manifest_includes_new_assets(self):
  m=json.loads((ROOT/'asset-manifest.json').read_text())
  self.assertEqual(m['version'],'v0.6.131')
  names={f['path'] for f in m['files']}
  for path in ['mobile-carry-v130.css','assets/ui/backpack.webp','assets/ui/potion-satchel.webp','assets/ability-icons/capacity-1.png','assets/ability-icons/capacity-5.png']:
   self.assertIn(path,names)

if __name__=='__main__':unittest.main()
