"""Unit checks: persistent network room snapshots, 24h expiry, and private DB."""
import os, sys, tempfile, unittest, stat
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import network_storage as db

class RoomStorageTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.old=db.PATH;db.PATH=Path(self.tmp.name)/'network.sqlite3'
    def tearDown(self):
        db.PATH=self.old;self.tmp.cleanup()
    def room(self):
        return {'code':'123456','createdAt':10000,'lastActiveAt':10000,'gameUpdatedAt':10000,
                'started':True,'players':{'p':{'id':'p','secret':'token','heroId':'warrior','_lastSeenAt':123}},
                'gameState':{'started':True,'players':[{'id':'warrior','currentHp':9}], 'round':6},
                'gameRevision':7,'_http_cache':{'foo':'private'},'mapViewers':{'v':{'secret':'not-saved'}}}
    def test_save_restore_and_privacy(self):
        r=self.room();db.save(r);result=db.restore(10000)
        self.assertEqual(result['123456']['gameState'],r['gameState'])
        self.assertNotIn('_http_cache',result['123456'])
        self.assertNotIn('mapViewers',result['123456'])
        self.assertNotIn('_lastSeenAt',result['123456']['players']['p'])
        self.assertEqual(result['123456']['players']['p']['secret'],'token')
        self.assertEqual(stat.S_IMODE(db.PATH.stat().st_mode)&0o077,0)
    def test_24h_exact_expiry(self):
        db.save(self.room())
        self.assertIn('123456',db.restore(10000+86400-1))
        self.assertNotIn('123456',db.restore(10000+86400))
    def test_heartbeat_does_not_extend(self):
        r=self.room();r['lastActiveAt']=20000;db.save(r)
        self.assertNotIn('123456',db.restore(10000+86400))
    def test_completed_action_extends(self):
        r=self.room();r['gameUpdatedAt']=20000;db.save(r)
        self.assertIn('123456',db.restore(10000+86400))
        self.assertNotIn('123456',db.restore(20000+86400))
    def test_lobby_still_3h(self):
        r=self.room();r['started']=False;r['gameUpdatedAt']=None;db.save(r)
        self.assertIn('123456',db.restore(10000+10800-1))
        self.assertNotIn('123456',db.restore(10000+10800))
if __name__=='__main__':unittest.main()
