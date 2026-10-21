"""Compare the release with the supplied baseline ZIP. No extra dependencies."""
import hashlib,json,sys,zipfile,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
archive=Path(sys.argv[1])
with zipfile.ZipFile(archive) as z:
 protected=[n for n in z.namelist() if n.startswith(('assets/','icons/','arcana/')) or n in ['server.py','network-lobby.js','cards-data.js','map-data.js','location-placement.js','render.yaml','manifest.webmanifest']]
 changed=[n for n in protected if not (root/n).is_file() or (root/n).read_bytes()!=z.read(n)]
 old_ids=set(re.findall(r'id="([^"]+)"',z.read('index.html').decode()));new_ids=set(re.findall(r'id="([^"]+)"',(root/'index.html').read_text()))
 result={'protected_files':len(protected),'changed_protected_files':changed,'missing_original_DOM_ids':sorted(old_ids-new_ids),'baseline_zip_sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
 print(json.dumps(result,ensure_ascii=False,indent=2))
 assert not changed and not old_ids-new_ids
