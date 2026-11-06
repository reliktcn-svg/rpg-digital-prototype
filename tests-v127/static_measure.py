import http.client,json
from pathlib import Path
results={}
for label,port in [('before',8835),('after',8834)]:
 results[label]={}
 for path in ['/app.js','/styles.css','/assets/map-visual-v0691.png','/assets/bosses/boss_unknown.webp']:
  c=http.client.HTTPConnection('127.0.0.1',port);c.request('GET',path,headers={'Accept-Encoding':'gzip'});r=c.getresponse();raw=r.read();tag=r.getheader('ETag');entry={'first_status':r.status,'first_body_bytes':len(raw),'encoding':r.getheader('Content-Encoding'),'etag':bool(tag)};c.close()
  c=http.client.HTTPConnection('127.0.0.1',port);c.request('GET',path,headers={'Accept-Encoding':'gzip',**({'If-None-Match':tag} if tag else {})});r=c.getresponse();entry.update(repeat_status=r.status,repeat_body_bytes=len(r.read()));c.close();results[label][path]=entry
Path(__file__).with_name('static-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
