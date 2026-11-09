"""v0.6.134 manifest integrity and new resource inclusion checks."""
from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'asset-manifest.json').read_text())
assert m['version']=='v0.6.134'
assert m['id'] and len(m['id'])==64
assert 'new-game-plus-v133.css' in {e['path'] for e in m['files']}
for entry in m['files']:
 p=root/entry['path']
 assert p.is_file(),entry['path']
 assert p.stat().st_size==entry['size'],entry['path']
 assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['hash'],entry['path']
for page in ['index.html','map.html']:
 h=(root/page).read_text()
 assert f'"id":"{m["id"]}"' in h,page
assert 'new-game-plus-v133.css' in (root/'index.html').read_text()
print('PASS manifest:',len(m['files']),'files, hashes and build IDs')
