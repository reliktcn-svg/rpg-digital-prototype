"""Run after editing JS/CSS: unchanged files retain the same cache URL."""
from pathlib import Path
import re,hashlib
ROOT=Path(__file__).resolve().parent
for name in ('index.html','map.html'):
 p=ROOT/name
 def replace(m):
  path=m[2].split('?',1)[0];f=ROOT/path
  if not f.is_file():return m[0]
  digest=hashlib.sha256(f.read_bytes()).hexdigest()[:16]
  return m[1]+path+'?v='+digest+m[3]
 p.write_text(re.sub(r'((?:src|href)=\")([^\"]+\.(?:js|css)(?:\?[^\"]*)?)(\")',replace,p.read_text()))
