"""Disposable local update server. Never run against real players."""
from pathlib import Path
import shutil,sys,threading,time,json,os
PORT=int(os.environ.get("CACHE_TEST_PORT","8836"))
ROOT=Path(__file__).resolve().parents[1];TARGET=ROOT.parent/('rpg-v06128-cache-fixture-'+str(PORT))
if TARGET.exists():shutil.rmtree(TARGET)
shutil.copytree(ROOT,TARGET,ignore=shutil.ignore_patterns('__pycache__'))
(TARGET/'update-probe.js').write_text('window.UPDATE_PROBE="A";\n')
for name,color in [('test-used.svg','red'),('test-unused.svg','green')]:
 (TARGET/'assets'/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="{color}"/></svg>')
sys.path.insert(0,str(TARGET));import server
server.ROOT=str(TARGET);server.build_manifest(TARGET)
from http.server import ThreadingHTTPServer
bad=False
class H(server.Handler):
 def do_POST(self):
  global bad
  if self.path=='/__test/change':
   (TARGET/'update-probe.js').write_text('window.UPDATE_PROBE="B";\n')
   p=TARGET/'index.html';p.write_text(p.read_text().replace('v0.6.128','v0.6.129'))
   for name in ['test-used.svg','test-unused.svg']:
    p=TARGET/'assets'/name;p.write_text(p.read_text().replace('red','blue').replace('green','yellow'))
   worker=TARGET/'sw.js';worker.write_text(worker.read_text()+'\n// fixture worker update B\n');bad=True;server.build_manifest(TARGET);return self._json(200,{'changed':True})
  if self.path=='/__test/repair':bad=False;return self._json(200,{'repaired':True})
  return super().do_POST()
 def do_GET(self):
  if self.path.split('?')[0]=='/update-probe.js' and bad:
   time.sleep(.4);raw=b'corrupted';self.send_response(200);self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw);return
  return super().do_GET()
 def log_message(self,*args):pass
print(f'Smart cache disposable fixture: http://127.0.0.1:{PORT}/tests-v128/cache.html',flush=True)
ThreadingHTTPServer(('127.0.0.1',PORT),H).serve_forever()
