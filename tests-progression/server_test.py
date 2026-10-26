"""Real HTTP regression: atomic skills, ownership and stale main snapshots."""
import concurrent.futures, copy, json, sys, threading, unittest, urllib.request, urllib.error
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
from http.server import ThreadingHTTPServer
class ProgressionServer(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.http=ThreadingHTTPServer(('127.0.0.1',0),server.Handler);cls.base='http://127.0.0.1:'+str(cls.http.server_port);threading.Thread(target=cls.http.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls):cls.http.shutdown();cls.http.server_close()
 def api(self,path,body=None):
  req=urllib.request.Request(self.base+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json'})
  try:
   with urllib.request.urlopen(req) as r:return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def setUp(self):
  _,h=self.api('/api/rooms',{'name':'test host'});self.code=h['room']['code'];_,g=self.api('/api/rooms/'+self.code+'/join',{'name':'test guest'})
  self.h={k:h[k] for k in ('playerId','playerSecret')};self.g={k:g[k] for k in ('playerId','playerSecret')};self.url='/api/rooms/'+self.code
  for auth,hero in [(self.h,'warrior'),(self.g,'mage')]:self.api(self.url+'/select',{**auth,'heroId':hero})
  self.api(self.url+'/start',self.h);self.initial={'started':True,'players':[{'id':'warrior','masteryPoints':10,'learnedAbilities':[]},{'id':'mage','masteryPoints':70,'learnedAbilities':[]}],'order':['warrior','mage'],'currentIndex':0,'territories':{},'areas':[]}
  self.api(self.url+'/game/init',{**self.h,'state':self.initial})
 def learn(self,node,auth=None):return self.api(self.url+'/game/ability',{**(auth or self.g),'nodeId':node})
 def test_offturn_independent_branches_and_stale_snapshot(self):
  for node in ['n5_R8','n5_R10','n5_Q8']:
   code,data=self.learn(node);self.assertEqual(code,200,data)
  stale=copy.deepcopy(self.initial);stale['players'][1]['masteryPoints']=82
  code,_=self.api(self.url+'/game/state',{**self.h,'baseRevision':1,'state':stale});self.assertEqual(code,200)
  p=server.ROOMS[self.code]['gameState']['players'][1];self.assertEqual(p['masteryPoints'],82);self.assertEqual(p['learnedAbilities'],['n5_R8','n5_R10','n5_Q8'])
 def test_paths_sequential_exclusive_and_owner(self):
  self.assertEqual(self.learn('n5_C12')[0],409)
  self.assertEqual(self.learn('n1_C10')[0],409)
  self.assertEqual(self.learn('n5_L10')[0],200)
  self.assertEqual(self.learn('n5_N10')[0],409)
  self.assertEqual(self.learn('n5_L10')[0],409)
  self.assertEqual(self.learn('n5_N12')[0],409)
 def test_atomic_last_point(self):
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   outcomes=list(pool.map(lambda n:self.learn(n,self.h)[0],['n1_C10','n1_Q8']))
  self.assertEqual(sorted(outcomes),[200,409]);self.assertEqual(len(server.ROOMS[self.code]['gameState']['players'][0]['learnedAbilities']),1)
 def test_no_point_or_auth(self):
  server.ROOMS[self.code]['gameState']['players'][1]['masteryPoints']=0
  self.assertEqual(self.learn('n5_Q8')[0],409)
  self.assertEqual(self.learn('n5_Q8',{'playerId':self.g['playerId'],'playerSecret':'invalid'})[0],403)
 def test_six_players_and_map_slot(self):
  _,h=self.api('/api/rooms',{'name':'six players'});url='/api/rooms/'+h['room']['code'];auth={k:h[k] for k in ('playerId','playerSecret')}
  self.api(url+'/select',{**auth,'heroId':'warrior'})
  for hero in ['mage','dwarf','archer','rogue','paladin']:
   code,g=self.api(url+'/join',{'name':hero});self.assertEqual(code,200)
   code,_=self.api(url+'/select',{**{k:g[k] for k in ('playerId','playerSecret')},'heroId':hero});self.assertEqual(code,200)
  self.assertEqual(self.api(url+'/join',{'name':'seventh'})[0],409)
  self.assertEqual(self.api(url+'/map/join',{})[0],200)
  self.assertEqual(len(server.ROOMS[h['room']['code']]['players']),6)
  self.assertEqual(self.api(url+'/start',auth)[0],200)
 def test_atlas_endpoint(self):
  code,d=self.api('/api/hero-atlas');self.assertEqual(code,200);self.assertEqual(len(d['characters']),6);self.assertNotIn('%',json.dumps(d))
 def test_snapshot_cannot_forge_skills(self):
  stale=copy.deepcopy(self.initial);stale['players'][0]['learnedAbilities']=['n1_C16']
  self.api(self.url+'/game/state',{**self.h,'baseRevision':1,'state':stale})
  self.assertEqual(server.ROOMS[self.code]['gameState']['players'][0]['learnedAbilities'],[])
if __name__=='__main__':unittest.main(verbosity=2)
