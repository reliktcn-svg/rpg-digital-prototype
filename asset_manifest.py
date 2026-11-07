"""Content manifest, rebuilt on startup/request; unchanged large files are not rehashed."""
from pathlib import Path
import hashlib,json,re,threading
_LOCK=threading.RLock();_HASHES={}
def sha(data):return hashlib.sha256(data).hexdigest()
def file_hash(p):
 st=p.stat();key=(str(p),st.st_mtime_ns,st.st_size)
 if key not in _HASHES:
  # One current entry per path, bounded by deployed resource count.
  for old in list(_HASHES):
   if old[0]==str(p):del _HASHES[old]
  _HASHES[key]=sha(p.read_bytes())
 return _HASHES[key]
def write_changed(p,data):
 if p.exists() and p.read_bytes()==data:return
 temp=p.with_name(p.name+'.tmp');temp.write_bytes(data);temp.replace(p)
def build_manifest(root):
 with _LOCK:
  root=Path(root)
  files=[p for p in root.iterdir() if p.is_file() and p.suffix in ('.js','.css')]
  files += [root/n for n in ('index.html','map.html','manifest.webmanifest')]
  for folder in ('assets','arcana','icons'):
   files += [p for p in (root/folder).rglob('*') if p.is_file() and p.suffix.lower() in ('.png','.webp','.jpg','.jpeg','.svg','.gif','.mp3','.ogg','.wav','.js','.css','.json','.woff','.woff2')]
  aliases=json.loads((root/'image-aliases.json').read_text()) if (root/'image-aliases.json').exists() else {}
  sources=json.loads((root/'image-source-hashes.json').read_text()) if (root/'image-source-hashes.json').exists() else {}
  aliases={old:new for old,new in aliases.items() if (root/new).is_file() and (root/old).is_file() and sources.get(old)==file_hash(root/old)}
  write_changed(root/'image-aliases-active.json',json.dumps(aliases,separators=(',',':')).encode())
  files=[p for p in files if p.relative_to(root).as_posix() not in aliases]
  files=sorted(set(files));htmls=[root/'index.html',root/'map.html']
  normalized={}
  for p in htmls:
   text=p.read_text()
   def versioned(m):
    path=m[2].split('?',1)[0];f=root/path
    return m[1]+path+'?v='+file_hash(f)[:16]+m[3] if f.is_file() else m[0]
   text=re.sub(r'((?:src|href)=\")([^\"]+\.(?:js|css)(?:\?[^\"]*)?)(\")',versioned,text)
   text=re.sub(r'<script id="rpg-build">.*?</script>','<script id="rpg-build"></script>',text,flags=re.S)
   normalized[p]=text
  version='v'+re.search(r'0\.6\.\d+',normalized[htmls[0]]).group(0)
  protocol=1
  identity=[(str(p.relative_to(root)),sha(normalized[p].encode()) if p in normalized else file_hash(p)) for p in files]
  build_id=sha(json.dumps({'protocol':protocol,'files':identity,'aliases':aliases},separators=(',',':')).encode())
  config={'id':build_id,'version':version,'protocol':protocol}
  for p,text in normalized.items():write_changed(p,text.replace('<script id="rpg-build"></script>','<script id="rpg-build">window.RPG_CLIENT_BUILD='+json.dumps(config,separators=(',',':'))+';</script>').encode())
  entries=[]
  for p in files:
   path=p.relative_to(root).as_posix();core=p.suffix in ('.js','.css','.html') or path=='manifest.webmanifest'
   entries.append({'path':path,'hash':file_hash(p),'size':p.stat().st_size,'core':core,'aliases':[old for old,new in aliases.items() if new==path]})
  result={'schema':1,'id':build_id,'version':version,'protocol':protocol,'files':entries}
  write_changed(root/'asset-manifest.json',json.dumps(result,ensure_ascii=False,separators=(',',':')).encode())
  return result
if __name__=='__main__':
 result=build_manifest(Path(__file__).resolve().parent);print(result['version'],result['id'],len(result['files']),'resources')
