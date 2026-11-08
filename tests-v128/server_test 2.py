import sys,unittest,os,tempfile
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests-v127'))
from transport_test import Transport,server
sys.path.insert(0,str(ROOT))
from asset_manifest import build_manifest
class Updates(Transport):
 def test_protocol_blocks_before_mutation(self):
  with patch.dict(os.environ,{'RPG_MIN_CLIENT_PROTOCOL':'2'}):
   self.assertEqual(self.raw(self.gamepath(),{'X-RPG-Protocol':'1'})[0],426)
   self.assertEqual(self.raw('/api/rooms',{'X-RPG-Protocol':'1'}, {'name':'blocked'})[0],426)
   self.assertEqual(self.raw(self.gamepath(),{'X-RPG-Protocol':'2'})[0],200)
 def test_manifest_content_not_number(self):
  with tempfile.TemporaryDirectory() as tmp:
   r=Path(tmp)
   for n in ['index.html','map.html']:(r/n).write_text('<title>v0.6.128</title><script id="rpg-build"></script><script src="app.js"></script>')
   (r/'app.js').write_text('a');(r/'manifest.webmanifest').write_text('{}')
   first=build_manifest(r);self.assertEqual(first,build_manifest(r))
   (r/'app.js').write_text('b');second=build_manifest(r)
   self.assertNotEqual(first['id'],second['id']);self.assertEqual(first['version'],second['version']);self.assertEqual(second,build_manifest(r))
if __name__=='__main__':
 server.Handler.log_message=lambda *a:None
 unittest.main()
