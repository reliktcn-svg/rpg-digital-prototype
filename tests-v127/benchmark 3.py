"""Real timed HTTP benchmark. Bodies and HTTP response headers counted, not TLS/TCP."""
import sys,os,importlib.util,json,time,threading,http.client,gzip,urllib.parse,copy
from pathlib import Path
from http.server import ThreadingHTTPServer
base=Path(sys.argv[1]).resolve();seconds=int(sys.argv[2]) if len(sys.argv)>2 else 600
sys.path.insert(0,str(base));spec=importlib.util.spec_from_file_location('bench_server',base/'server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);m.Handler.log_message=lambda *a:None
srv=ThreadingHTTPServer(('127.0.0.1',0),m.Handler);threading.Thread(target=srv.serve_forever,daemon=True).start();port=srv.server_port
optimized='127' in base.name
fixture=json.loads((Path(__file__).parent/'fixture.json').read_text())
def request(path,body=None,tag=None):
 c=http.client.HTTPConnection('127.0.0.1',port,timeout=10);headers={'Accept-Encoding':'gzip'}
 if tag:headers['If-None-Match']=tag
 if body is not None:headers['Content-Type']='application/json'
 start=time.perf_counter();c.request('POST' if body is not None else 'GET',path,json.dumps(body) if body is not None else None,headers);r=c.getresponse();raw=r.read();elapsed=time.perf_counter()-start
 size=len(raw)+len(f'HTTP/1.0 {r.status} {r.reason}\r\n'.encode())+sum(len(k)+len(v)+4 for k,v in r.getheaders())+2
 decoded=gzip.decompress(raw) if r.getheader('Content-Encoding')=='gzip' else raw
 result={'status':r.status,'body':len(raw),'wire':size,'ms':elapsed*1000,'etag':r.getheader('ETag')};data=json.loads(decoded) if decoded else {};c.close();return result,data
_,created=request('/api/rooms',{'name':'benchmark'});code=created['room']['code'];auth={k:created[k] for k in ('playerId','playerSecret')};players=[auth]
for n in range(3):
 _,v=request('/api/rooms/'+code+'/join',{'name':f'player {n+2}'});players.append({k:v[k] for k in auth})
for a,h in zip(players,['warrior','dwarf','mage','archer']):request('/api/rooms/'+code+'/select',{**a,'heroId':h})
request('/api/rooms/'+code+'/start',auth);fixture['order']=['warrior','dwarf','mage','archer'];fixture['currentIndex']=0
request('/api/rooms/'+code+'/game/init',{**auth,'state':fixture})
_,v=request('/api/rooms/'+code+'/map/join',{});map_path='/api/rooms/'+code+'/map?'+urllib.parse.urlencode({k:v[k] for k in ('viewerId','viewerSecret')})
paths=['/api/rooms/'+code+'/game?'+urllib.parse.urlencode(a) for a in players]
results=[];lock=threading.Lock()
def poll(path,interval,duration,kind):
 start=time.monotonic();i=0;tag=None
 while time.monotonic()-start<duration:
  r,d=request(path,tag=tag if optimized else None);tag=r['etag'] or tag
  with lock:results.append({**r,'kind':kind})
  i+=1;time.sleep(max(0,start+i*interval-time.monotonic()))
threads=[threading.Thread(target=poll,args=(path,.4,seconds,'game')) for path in paths]
threads.append(threading.Thread(target=poll,args=(map_path,.65,seconds,'map')))
if not optimized:
 threads += [threading.Thread(target=poll,args=(path.replace('/game?','?'),.9,seconds,'room')) for path in paths]
start=time.monotonic()
for t in threads:t.start()
for t in threads:t.join()
summary={'duration_seconds':time.monotonic()-start,'version':base.name,'players':4,'map_devices':1,'fixture_bytes':len(json.dumps(fixture,ensure_ascii=False).encode()),'idle':{}}
for kind in ('game','map','room'):
 rows=[r for r in results if r['kind']==kind]
 if rows:summary['idle'][kind]={'requests':len(rows),'body_bytes':sum(r['body'] for r in rows),'http_bytes':sum(r['wire'] for r in rows),'mean_ms':sum(r['ms'] for r in rows)/len(rows),'304':sum(r['status']==304 for r in rows)}
# Active sequence: 120 real state commits and conditional follower reads, no artificial sleeps.
active=[];revision=1;tag=None
for i in range(120):
 fixture['players'][0]['gold']=i;fixture['journal'].append({'id':'active'+str(i),'ts':1000+i,'html':'Тест действия '+str(i)})
 r,d=request('/api/rooms/'+code+'/game/state',{**auth,'baseRevision':revision,'state':fixture});assert r['status']==200,(r,d);revision=d['revision']
 t=time.perf_counter();r,d=request(paths[1],tag=tag if optimized else None);assert d['revision']==revision;tag=r['etag'];active.append(r)
summary['active_120_changed_reads']={'body_bytes':sum(r['body'] for r in active),'http_bytes':sum(r['wire'] for r in active),'mean_ms':sum(r['ms'] for r in active)/len(active)}
out=Path(__file__).parent/('benchmark-after.json' if optimized else 'benchmark-before.json');out=out.with_name(sys.argv[3]) if len(sys.argv)>3 else out;out.write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2),flush=True);srv.shutdown()
