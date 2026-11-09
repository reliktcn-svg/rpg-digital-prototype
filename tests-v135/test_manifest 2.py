"""Verify hashes, build IDs, accurate client version and all assets."""
from pathlib import Path
import json,hashlib,re
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'asset-manifest.json').read_text())
assert m['version']=='v0.6.135'
assert len(m['id'])==64
for row in m['files']:
 p=root/row['path'];assert p.is_file(),row['path']
 assert p.stat().st_size==row['size'],row['path']
 assert hashlib.sha256(p.read_bytes()).hexdigest()==row['hash'],row['path']
assert all((root/'assets').rglob('*'))
for name in ['index.html','map.html']:
 h=(root/name).read_text()
 assert f'"id":"{m["id"]}"' in h
 assert '0.6.135' in h
for path in ['app.js','styles.css','cards-data.js']:
 assert path in [r['path'] for r in m['files']]
print(f'PASS v0.6.135 manifest {len(m["files"])} assets')
