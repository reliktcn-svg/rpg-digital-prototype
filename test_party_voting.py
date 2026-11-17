import copy, json, unittest
import party_voting as v
import network_storage, tempfile
from pathlib import Path

def room(count=3):
    ids=['warrior','mage','dwarf','archer','rogue'][:count]
    return {'code':'123456','started':True,'hostId':'p0','createdAt':1,'gameRevision':0,
        'players':{f'p{i}':{'id':f'p{i}','name':f'Игрок {i}','secret':f's{i}','heroId':h,'host':i==0} for i,h in enumerate(ids)},
        'gameState':{'players':[{'id':h,'hex':'A1','equipment':{'weapon':193,'potions':[296,None]},'backpack':[300],'pendingItems':[],'gold':7,'masteryPoints':500} for h in ids], 'order':ids,'currentIndex':0,'round':1,'decks':{'lootHeart':{'draw':[],'discard':[]}},'territories':{'A1':{'owner':'warrior','areaId':1}},'areas':[{'id':1,'owner':'warrior','hexes':['A1']}],'journal':[]}}

def kick(r,target='p0',now=1000):
    initiator=next(p['id'] for p in v.active(r) if p['id']!=target)
    v.start(r,initiator,'kick',target,now)
    vid=r['partyVote']['id']
    for pid in list(r['partyVote']['eligible']):
        if pid!=initiator:v.cast(r,pid,vid,True,now+1)

class VotingTests(unittest.TestCase):
    def test_two_self_target_and_disconnected(self):
        with self.assertRaises(ValueError):v.start(room(2),'p0','kick','p1',1000)
        r=room()
        with self.assertRaises(ValueError):v.start(r,'p0','kick','p0',1000)
        v.start(r,'p1','kick','p0',1000)
        self.assertIn('p2',r['partyVote']['eligible'])
        v.tick(r,1121)
        self.assertNotIn('partyVote',r);self.assertNotIn('exclusion',r['players']['p0'])
        with self.assertRaises(ValueError):v.start(r,'p1','kick','p0',1122)
    def test_no_cancels_and_target_cannot_vote(self):
        r=room(5);v.start(r,'p1','kick','p0',1000);vid=r['partyVote']['id']
        with self.assertRaises(ValueError):v.cast(r,'p0',vid,True,1001)
        v.cast(r,'p2',vid,False,1001)
        self.assertNotIn('partyVote',r);self.assertNotIn('exclusion',r['players']['p0'])
        with self.assertRaises(ValueError):v.cast(r,'p3',vid,True,1002)
    def test_host_current_and_unanimous_return(self):
        r=room();original=copy.deepcopy(r['gameState']['players'][0]);kick(r)
        self.assertNotIn('warrior',r['gameState']['order'])
        self.assertEqual(r['hostId'],'p1');self.assertEqual(r['gameState']['order'][r['gameState']['currentIndex']],'mage')
        self.assertEqual(r['gameState']['territories']['A1']['owner'],'warrior')
        self.assertIn('warrior',r['gameState']['excludedHeroes'])
        # Restore persisted room, including immutable inventory and deadlines.
        r=json.loads(json.dumps(r))
        v.start(r,'p0','return',now=1400);vid=r['partyVote']['id']
        v.cast(r,'p1',vid,True,1401)
        self.assertIn('exclusion',r['players']['p0'])
        v.cast(r,'p2',vid,True,1402)
        self.assertNotIn('exclusion',r['players']['p0'])
        self.assertEqual(r['gameState']['players'][0],original)
        self.assertEqual(r['gameState']['order'],['warrior','mage','dwarf'])
        self.assertEqual(r['gameState']['order'][r['gameState']['currentIndex']],'mage')
        self.assertEqual(r['hostId'],'p1')
    def test_expiry_once_and_no_late_return(self):
        r=room();kick(r);deadline=r['players']['p0']['exclusion']['until']
        v.tick(r,deadline-1);self.assertIn('A1',r['gameState']['territories'])
        r=json.loads(json.dumps(r));v.tick(r,deadline)
        self.assertNotIn('A1',r['gameState']['territories']);self.assertEqual(r['gameState']['areas'],[])
        cards=r['gameState']['decks']['lootHeart']['draw'];self.assertCountEqual(cards,[193,296,300])
        snapshot=copy.deepcopy(r);v.tick(r,deadline+1000);self.assertEqual(r,snapshot)
        with self.assertRaises(ValueError):v.start(r,'p0','return',now=deadline+1)
    def test_return_rejected_then_cooldown(self):
        r=room();kick(r);v.start(r,'p0','return',now=1400);vid=r['partyVote']['id'];v.cast(r,'p1',vid,False,1401)
        self.assertIn('exclusion',r['players']['p0'])
        with self.assertRaises(ValueError):v.start(r,'p0','return',now=1402)
    def test_pending_roll_and_offline_boundary(self):
        r=room();r['gameState']['combat']={'heroId':'warrior','phase':'hero_roll','cardId':1}
        r['players']['p0']['_lastSeenAt']=1001;kick(r)
        self.assertIn('pendingExclusion',r)
        r['gameState']['combat']['phase']='hero_damage_ready';v.tick(r,1002,settle=True)
        self.assertIn('exclusion',r['players']['p0']);self.assertIsNone(r['gameState']['combat'])
        self.assertEqual(r['gameState']['decks']['exploreOuter']['draw'],[1])
        r2=room();r2['gameState']['combat']={'heroId':'warrior','phase':'enemy_roll','cardId':1};kick(r2)
        self.assertIn('exclusion',r2['players']['p0'])
    def test_offturn_and_stale_protection(self):
        r=room();r['gameState']['currentIndex']=1;kick(r)
        incoming=copy.deepcopy(r['gameState']);incoming['players'][0]['gold']=900;incoming['territories']={};incoming['areas']=[]
        v.protect(r,incoming)
        self.assertEqual(incoming['players'][0]['gold'],7);self.assertIn('A1',incoming['territories'])
        incoming['order'].append('warrior')
        with self.assertRaises(ValueError):v.protect(r,incoming)
    def test_last_turn_wrap_and_five_votes(self):
        r=room(5);r['gameState']['currentIndex']=4;kick(r,'p4')
        self.assertEqual(r['gameState']['currentIndex'],0);self.assertEqual(r['gameState']['round'],2)
        self.assertEqual(len(r['gameState']['order']),4)

    def test_votes_do_not_revise_gameplay_and_stall_cannot_veto(self):
        r=room();r['players']['p0']['_lastSeenAt']=1001
        v.start(r,'p1','kick','p0',1000)
        self.assertEqual(r['gameRevision'],0)
        v.cast(r,'p2',r['partyVote']['id'],True,1001)
        self.assertIn('pendingExclusion',r)
        r['players']['p0']['_lastSeenAt']=1016
        v.tick(r,1016)
        self.assertIn('exclusion',r['players']['p0'])

    def test_sqlite_preserves_vote_and_return_deadline(self):
        original=network_storage.PATH
        try:
            with tempfile.TemporaryDirectory() as d:
                network_storage.PATH=Path(d)/'room.sqlite3'
                r=room();v.start(r,'p1','kick','p0',1000)
                network_storage.save(r)
                restored=network_storage.restore(now=1001)['123456']
                self.assertEqual(restored['partyVote'],r['partyVote'])
                v.cast(restored,'p2',restored['partyVote']['id'],True,1002)
                network_storage.save(restored)
                second=network_storage.restore(now=1003)['123456']
                self.assertEqual(second['players']['p0']['exclusion']['until'],2202)
        finally:network_storage.PATH=original

if __name__=='__main__':unittest.main()
