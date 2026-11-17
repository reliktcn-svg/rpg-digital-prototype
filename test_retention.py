import json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
import network_storage as storage

class RetentionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.old=storage.PATH;storage.PATH=Path(self.temp.name)/'rooms.sqlite3'
    def tearDown(self):
        storage.PATH=self.old;self.temp.cleanup()
    def room(self):
        return {'code':'111111','players':{'p':{'id':'p','secret':'s'}},'started':True,'createdAt':900,'gameUpdatedAt':950,'lastPlayerSeenAt':1000}
    def test_seven_days_and_exact_expiry(self):
        r=self.room();self.assertEqual(storage.expiry(r),605800)
        storage.save(r);self.assertIn(r['code'],storage.restore(605799));self.assertNotIn(r['code'],storage.restore(605800))
    def test_gameplay_and_anonymous_activity_do_not_extend_deadline(self):
        r=self.room();r['lastActiveAt']=9999;r['gameUpdatedAt']=9999
        self.assertEqual(storage.expiry(r),605800)
    def test_authenticated_return_persisted(self):
        r=self.room();r['lastPlayerSeenAt']=2000;storage.save(r)
        restored=storage.restore(2100)[r['code']];self.assertEqual(storage.expiry(restored),606800)
    def test_old_24_hour_database_migrates_to_seven_days(self):
        r=self.room();r.pop('lastPlayerSeenAt');storage.save(r)
        with storage.connect() as db:db.execute('UPDATE room_saves SET expires_at=1')
        restored=storage.restore(10000)[r['code']]
        self.assertEqual(restored['lastPlayerSeenAt'],950);self.assertEqual(storage.expiry(restored),605750)
    def test_unstarted_lobby_stays_three_hours(self):
        r=self.room();r['started']=False;r['lastActiveAt']=1500
        self.assertEqual(storage.expiry(r),12300)

if __name__=='__main__':unittest.main()
