"""Build lossless WebP variants: no crop, colour change or lost transparency."""
from pathlib import Path
from PIL import Image
import json,hashlib,concurrent.futures
ROOT=Path(__file__).resolve().parent
files=[p for p in (ROOT/'assets').rglob('*') if p.suffix.lower() in ('.png','.jpg','.jpeg','.webp') and 'optimized' not in p.parts]
def convert(p):
 try:
  b=p.read_bytes();im=Image.open(p);out=ROOT/'assets/optimized'/p.relative_to(ROOT/'assets').with_suffix('.webp');out.parent.mkdir(parents=True,exist_ok=True)
  im.save(out,'WEBP',lossless=True,method=4,icc_profile=im.info.get('icc_profile',b''),exif=im.info.get('exif',b''))
  if out.stat().st_size>=len(b):out.unlink();return (p,len(b),len(b),None)
  # Verify decoded pixels exactly; source images remain in this distribution.
  if Image.open(out).convert('RGBA').tobytes()!=im.convert('RGBA').tobytes():out.unlink();return (p,len(b),len(b),None)
  return(p,len(b),out.stat().st_size,out.relative_to(ROOT).as_posix())
 except Exception:return(p,p.stat().st_size,p.stat().st_size,None)
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:rows=list(pool.map(convert,files))
 aliases={p.relative_to(ROOT).as_posix():target for p,a,b,target in rows if target}
 (ROOT/'image-source-hashes.json').write_text(json.dumps({old:hashlib.sha256((ROOT/old).read_bytes()).hexdigest() for old in aliases},separators=(',',':')))
 (ROOT/'image-aliases.json').write_text(json.dumps(aliases,separators=(',',':')))
 stats={'originalBytes':sum(a for p,a,b,t in rows),'optimizedBytes':sum(b for p,a,b,t in rows),'converted':len(aliases),'examined':len(rows),'mode':'lossless verified RGBA; original dimensions retained'}
 (ROOT/'IMAGE_OPTIMIZATION_v0.6.129.json').write_text(json.dumps(stats,indent=2));print(stats)
