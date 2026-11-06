import sys,copy,unittest,http.client,json,gzip,urllib.parse,threading
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests-progression'))
from server_test import ProgressionServer,server
class Transport(ProgressionServer):
 def raw(self,path,headers=None,body=None):
  c=http.client.HTTPConnection('127.0.0.1',self.http.server_port);c.request('POST' if body is not None else 'GET',path,json.dumps(body) if body is not None else None,headers or {});r=c.getresponse();data=r.read();result=(r.status,dict(r.getheaders()),data);c.close();return result
 def gamepath(self,auth=None):return self.url+'/game?'+urllib.parse.urlencode(auth or self.h)
 def test_conditional_auth_side_and_main(self):
  path=self.gamepath();status,h,b=self.raw(path,{'Accept-Encoding':'gzip'});self.assertEqual(status,200);tag=h['ETag'];self.assertEqual(json.loads(gzip.decompress(b) if h.get('Content-Encoding')=='gzip' else b)['revision'],1)
  self.assertEqual(self.raw(path,{'If-None-Match':tag})[::2],(304,b''))
  self.assertEqual(self.raw(self.gamepath({**self.h,'playerSecret':'bad'}),{'If-None-Match':tag})[0],403)
  # Learning is a real off-turn mutation with unchanged main revision.
  code,d=self.learn('n5_L10');self.assertEqual(code,200,d)
  status,h,b=self.raw(path,{'If-None-Match':tag});self.assertEqual(status,200);state=json.loads(b);self.assertEqual(state['revision'],1);self.assertNotEqual(h['ETag'],tag)
  self.assertIn('n5_L10',state['state']['players'][1]['learnedAbilities'])
  tag=h['ETag'];self.assertEqual(self.raw(path,{'If-None-Match':tag})[0],304)
  incoming=copy.deepcopy(state['state']);incoming['round']=2
  code,d=self.api(self.url+'/game/state',{**self.h,'baseRevision':1,'state':incoming});self.assertEqual(code,200,d)
  self.assertEqual(self.raw(path,{'If-None-Match':tag})[0],200)
 def test_map_private_and_independent_rooms(self):
  _,v=self.api(self.url+'/map/join',{});path=self.url+'/map?'+urllib.parse.urlencode({k:v[k] for k in ['viewerId','viewerSecret']});status,h,b=self.raw(path);self.assertEqual(status,200);tag=h['ETag'];self.assertNotIn('decks',json.loads(b));self.assertEqual(self.raw(path,{'If-None-Match':tag})[0],304)
  _,other=self.api('/api/rooms',{'name':'other'});self.assertEqual(self.raw(path,{'If-None-Match':tag})[0],304)
  self.assertEqual(self.raw('/api/rooms/'+other['room']['code']+'/map?'+urllib.parse.urlencode(v),{'If-None-Match':tag})[0],403)
 def test_static_compression_and_update(self):
  for path in ['/app.js','/styles.css','/assets/bosses/boss_unknown.webp','/hero-atlas-data.js']:
   status,h,b=self.raw(path,{'Accept-Encoding':'gzip'});self.assertEqual(status,200);self.assertIn('ETag',h)
   self.assertEqual(self.raw(path,{'If-None-Match':h['ETag']})[::2],(304,b''))
   if path.endswith(('.js','.css')):self.assertEqual(h['Content-Encoding'],'gzip')
  p=Path(server.ROOT)/'tests-v127/cache-sample.txt'
  try:
   p.write_text('original');_,h,b=self.raw('/tests-v127/cache-sample.txt');p.write_text('changed')
   self.assertEqual(self.raw('/tests-v127/cache-sample.txt',{'If-None-Match':h['ETag']})[0],200)
  finally:p.unlink(missing_ok=True)
 def test_two_simultaneous_main_updates(self):
  import concurrent.futures
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   outcomes=list(pool.map(lambda n:self.api(self.url+'/game/state',{**self.h,'baseRevision':1,'state':{**self.initial,'round':n}})[0],[2,3]))
  self.assertEqual(sorted(outcomes),[200,409])
if __name__=='__main__':
 server.Handler.log_message=lambda *a:None
 unittest.main()
