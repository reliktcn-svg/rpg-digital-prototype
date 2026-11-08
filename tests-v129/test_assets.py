"""Static validation: the converted game art is present and included in Smart Cache manifest."""
import sys,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
class AssetsTests(unittest.TestCase):
 def test_all_bosses_converted(self):
  from pathlib import Path
  images=list((ROOT/'assets/bosses').glob('boss_*.webp'))
  self.assertGreaterEqual(len(images),33)
  self.assertFalse(list((ROOT/'assets/bosses').glob('boss_*.png')))
 def test_item_art_converted(self):
  for id in range(372,486):
   # Not every ID is an art card, only those present in this edition.
   if (ROOT/'assets/items'/f'{id}.webp').exists():self.assertGreater((ROOT/'assets/items'/f'{id}.webp').stat().st_size,0)
  self.assertFalse(list((ROOT/'assets/items').glob('*.png')))
 def test_map_optimized(self):
  self.assertTrue((ROOT/'assets/map-visual-v0691.webp').is_file())
  self.assertIn('map-visual-v0691.webp',(ROOT/'map.html').read_text())
  self.assertIn('map-visual-v0691.webp',(ROOT/'index.html').read_text())
 def test_manifest_has_all_images(self):
  m=json.loads((ROOT/'asset-manifest.json').read_text());paths={x['path'] for x in m['files']}
  for p in (ROOT/'assets').rglob('*'):
   if p.is_file():self.assertIn(p.relative_to(ROOT).as_posix(),paths)
  self.assertEqual(m['version'],'v0.6.131')
if __name__=='__main__':unittest.main()
