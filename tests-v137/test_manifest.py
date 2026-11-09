"""Verify the v0.6.137 cache update has a consistent version, IDs, and hashes."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'asset-manifest.json').read_text())
assert m['version']=='v0.6.137',m['version']
assert len(m['id'])==64
assert len(m['files'])>600,len(m['files'])
for f in m['files']:
    p=root/f['path']
    assert p.is_file(),f['path']
    assert p.stat().st_size==f['size'],f['path']
    assert hashlib.sha256(p.read_bytes()).hexdigest()==f['hash'],f['path']
for page in ['index.html','map.html']:
    t=(root/page).read_text()
    assert '0.6.137' in t,page
    assert '"id":"'+m['id']+'"' in t,page
for core in ['app.js','boss-rules.js','server.py']:
    assert (root/core).is_file(),core
print(f'PASS: v0.6.137 {len(m["files"])} resource hashes and both build IDs')
