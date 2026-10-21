"""Isolated HTTP integration tests against the actual bundled server, using five clients."""
import importlib.util,json,threading,urllib.request,urllib.error,urllib.parse,copy
from pathlib import Path
spec=importlib.util.spec_from_file_location('rpg_server',Path(__file__).resolve().parents[1]/'server.py');server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)
server.Handler.log_message=lambda *args:None
http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
threading.Thread(target=http.serve_forever,daemon=True).start();base='http://127.0.0.1:'+str(http.server_port);checks=[]
def call(path,data=None):
 req=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
def ok(name,condition):
 checks.append({'name':name,'pass':bool(condition)})
 assert condition,name
try:
 status,h=call('/api/rooms',{'name':'QA Host'});code=h['room']['code'];prefix='/api/rooms/'+code;clients=[h]
 ok('Six-digit room code',status==201 and len(code)==6 and code.isdigit())
 for n in range(4):clients.append(call(prefix+'/join',{'name':'QA '+str(n+2)})[1])
 ok('Five players join',len(call(prefix)[1]['players'])==5)
 ok('Sixth player rejected',call(prefix+'/join',{'name':'Sixth'})[0]==409)
 auth=lambda c:{'playerId':c['playerId'],'playerSecret':c['playerSecret']}
 for hero,c in zip(server.HERO_IDS,clients):ok('Select '+hero,call(prefix+'/select',{**auth(c),'heroId':hero})[0]==200)
 ok('Duplicate hero rejected',call(prefix+'/select',{**auth(clients[1]),'heroId':'warrior'})[0]==409)
 ok('Only host can start',call(prefix+'/start',auth(clients[1]))[0]==403)
 ok('Difficulty selection by host',call(prefix+'/mode',{**auth(h),'hardMode':True})[0]==200)
 ok('Start with five heroes',call(prefix+'/start',auth(h))[0]==200)
 ok('Difficulty locked after start',call(prefix+'/mode',{**auth(h),'hardMode':False})[0]==409)
 game={'started':True,'players':[{'id':id,'hex':'ЛГ01','gold':10,'currentHp':12,'maxHp':12,'backpack':[],'pendingItems':[],'equipment':{}} for id in server.HERO_IDS],'order':server.HERO_IDS,'currentIndex':0,'journal':[],'combat':None,'decks':{},'locations':{}}
 status,init=call(prefix+'/game/init',{**auth(h),'state':game});ok('Host initializes state',status==200 and init['revision']==1)
 query=lambda c:'?'+urllib.parse.urlencode(auth(c))
 ok('All five clients read same state',all(call(prefix+'/game'+query(c))[1]['state']==game for c in clients))
 ok('Invalid credential rejected',call(prefix+'/game?playerId=x&playerSecret=x')[0]==403)
 changed=copy.deepcopy(game);changed['players'][0]['backpack']=[141];changed['combat']={'phase':'hero_turn','cardId':1,'enemyHp':5};changed['journal']=[{'id':'test-entry','ts':1,'html':'QA'}]
 ok('Off-turn state publication rejected',call(prefix+'/game/state',{**auth(clients[1]),'baseRevision':1,'state':changed})[0]==409)
 status,reply=call(prefix+'/game/state',{**auth(h),'baseRevision':1,'state':changed});ok('Active player publishes combat/item/journal',status==200)
 ok('Second client sees identical combat and inventory',call(prefix+'/game'+query(clients[1]))[1]['state']==changed)
 ok('Stale revision rejected',call(prefix+'/game/state',{**auth(h),'baseRevision':1,'state':changed})[0]==409)
 changed['currentIndex']=1
 status,reply=call(prefix+'/game/state',{**auth(h),'baseRevision':2,'state':changed});ok('Turn handed to second hero',status==200)
 changed['players'][1]['gold']=22
 ok('Second client publishes on own turn',call(prefix+'/game/state',{**auth(clients[1]),'baseRevision':3,'state':changed})[0]==200)
 ok('Former active client can no longer publish',call(prefix+'/game/state',{**auth(h),'baseRevision':4,'state':changed})[0]==409)
 status,resume=call(prefix+'/resume',{**auth(clients[2]),'recoveryKey':h['room']['recoveryKey']});ok('Disconnected client resumes existing room',status==200 and not resume['revived'])
 snapshot={'room':call(prefix)[1],'state':changed,'revision':4,'recoveryKey':h['room']['recoveryKey'],'lastActiveAt':int(server.time.time())}
 server.ROOMS.pop(code)
 status,reply=call(prefix+'/resume',{**auth(h),'recoveryKey':h['room']['recoveryKey'],'recovery':snapshot});ok('Room restored after simulated server restart',status==200 and reply['revived'])
 ok('Restored inventory and combat preserved',call(prefix+'/game'+query(h))[1]['state']==changed)
finally:
 http.shutdown();print('RESULT_JSON='+json.dumps({'checks':checks,'passed':sum(c['pass'] for c in checks),'total':len(checks)},ensure_ascii=False))
