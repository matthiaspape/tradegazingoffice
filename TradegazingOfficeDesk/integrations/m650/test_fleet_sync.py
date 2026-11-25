from datetime import datetime, timedelta, timezone
import hashlib
import http.client
import json
from pathlib import Path
import sqlite3
from tempfile import TemporaryDirectory
from threading import Thread
import unittest
from urllib.parse import urlencode

from fleet_desk.collector import Service
from fleet_desk.health import Store
from fleet_desk.mac_desk import MacBackend
from fleet_desk.server import server
from fleet_desk.sync import History


class SplitFleetIntegration(unittest.TestCase):
    def setUp(self):
        tmp = TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        exports = root / 'exports'
        exports.mkdir()
        token = 'isolated-test-token-never-used-on-the-vps'
        self.headers = {'Authorization': 'Bearer ' + token}
        devices = root / 'devices.json'
        devices.write_text(json.dumps(dict(devices=[
            dict(owner='Matthias', enabled=True, sha256=hashlib.sha256(token.encode()).hexdigest())])))
        self.config = dict(
            host_id='test-vps',
            sources=[dict(source_id='nova', account_key='demo', environment='DEMO',
                          deployment_id='deployment', terminal_id='terminal', export_root=str(exports))],
            database=str(root / 'history.sqlite'), health_database=str(root / 'health.sqlite'),
            credentials_file=str(devices), fresh_seconds=600,
            health=dict(retention_days=7, max_bytes=8 * 1024**2))
        self.service = Service(self.config)
        self.addCleanup(self.service.close)
        self.host = Store(self.config)
        self.addCleanup(self.host.close)
        self.now = datetime.now(timezone.utc)
        self.vps = self.serve()
        self.requests = []
        owner = self

        class LoopbackTransport:
            unavailable = None

            def fetch(self, path):
                owner.requests.append(path)
                if path == self.unavailable:
                    raise OSError('Simulated Reader outage')
                status, payload = owner.get(owner.vps, path)
                if status != 200:
                    raise OSError(status)
                return payload

        self.transport = LoopbackTransport()
        self.mac = self.serve(MacBackend(self.config, self.transport, clock=lambda: self.now.timestamp()))

    def serve(self, backend=None):
        web = server(self.config, port=0, backend=backend, serve_ui=False)
        Thread(target=web.serve_forever, daemon=True).start()
        self.addCleanup(web.server_close)
        self.addCleanup(web.shutdown)
        return web

    def get(self, web, path, headers=None):
        client = http.client.HTTPConnection('127.0.0.1', web.server_port, timeout=5)
        try:
            client.request('GET', path, headers=self.headers if headers is None else headers)
            response = client.getresponse()
            return response.status, json.loads(response.read())
        finally:
            client.close()

    def stamp(self, offset):
        return (self.now + timedelta(seconds=offset)).isoformat().replace('+00:00', 'Z')

    def original(self, record_id, offset, kind='account_snapshot', supersedes=None, **payload):
        row = dict(record_id=record_id, record_type=kind, account_key='demo', environment='DEMO',
                   source_id='nova', deployment_id='deployment', session_id='session', quality={},
                   observed_at_utc=self.stamp(offset), payload=payload)
        if supersedes:
            row['supersedes_record_id'] = supersedes
        raw = json.dumps(row)
        with sqlite3.connect(self.config['database']) as db:
            cursor = db.execute('INSERT INTO originals(scope,record_id,fact,first_record,type,observed) VALUES(?,?,?,?,?,?)',
                                ('["demo","DEMO",null]', record_id, raw, raw, kind, row['observed_at_utc']))
            return cursor.lastrowid

    def health(self, offset, free):
        self.host.add(dict(observed_at=self.stamp(offset), available=True, cpu={'_Total': 18},
                           total_ram=1000, available_ram=free,
                           volumes=[dict(name='C:', size=100, free=50)]))

    def history(self, hours=24, cursor=None):
        query = {'hours': hours}
        if cursor:
            query['after'] = cursor
        status, result = self.get(self.mac, '/v1/history?' + urlencode(query))
        self.assertEqual(status, 200, result)
        return result

    def test_current_is_small_and_parts_fail_independently(self):
        self.original('old', -25, equity='1000', balance='995', position_mode='HEDGING', positions=0)
        self.original('heartbeat', -22, 'telemetry_health', source_state='RUNNING')
        self.health(-20, 250)
        self.assertEqual(self.get(self.mac, '/v1/current?part=desk', {})[0], 401)
        status, account = self.get(self.mac, '/v1/current?part=desk')
        self.assertEqual(status, 200)
        self.assertEqual(account['accounts'][0]['account']['equity'], '1000')
        self.assertEqual(account['accounts'][0]['source_state'], 'RUNNING')
        self.assertNotIn('series', account['accounts'][0])
        self.assertNotIn('journal', account)
        self.assertEqual(self.requests, ['/v1/current?part=desk'])
        self.assertEqual(self.get(self.mac, '/v1/current?part=health')[1]['connection']['state'], 'CURRENT')
        self.now += timedelta(seconds=301)
        self.transport.unavailable = '/v1/current?part=desk'
        self.health(-5, 400)
        stale = self.get(self.mac, '/v1/current?part=desk')[1]
        healthy = self.get(self.mac, '/v1/current?part=health')[1]
        self.assertEqual(stale['connection']['state'], 'STALE')
        self.assertEqual(stale['accounts'][0]['observed_at'], account['accounts'][0]['observed_at'])
        self.assertEqual(healthy['connection']['state'], 'CURRENT')
        self.assertEqual(healthy['windows'][-1]['last']['available_ram'], 400)

    def test_full_then_incremental_and_correction_upserts(self):
        self.original('yesterday', -90000, equity='999')
        self.original('previous', -800, equity='1000')
        self.original('latest', -190, equity='1001')
        self.health(-140, 250)
        full = self.history()
        self.assertTrue(full['reset'])
        self.assertEqual({p['value'] for _, _, p in full['equity']}, {'1000', '1001'})
        self.assertEqual(len(full['health']), 1)
        same = self.history(cursor=full['cursor'])
        self.assertEqual((same['reset'], same['equity'], same['health']), (False, [], []))
        self.assertEqual(same['cursor'], full['cursor'])
        self.original('late-correction', -800, supersedes='previous', equity='1005')
        self.health(-140, 400)
        diff = self.history(cursor=full['cursor'])
        self.assertFalse(diff['reset'])
        self.assertEqual([p['value'] for _, _, p in diff['equity']], ['1005'])
        self.assertEqual([p['ram'] for _, p in diff['health']], [60.0])
        self.assertTrue(self.history(168, diff['cursor'])['reset'])
        self.assertEqual(len(self.history(168)['equity']), 3)
        self.assertEqual(self.get(self.mac, '/v1/history?hours=24&after=invalid')[0], 400)

    def test_retention_removes_points_and_unknown_cursor_bootstraps(self):
        recorded = self.original('old', -1800, equity='100')
        initial = self.history()
        with sqlite3.connect(self.config['database']) as db:
            db.execute('DELETE FROM originals WHERE id=?', (recorded,))
            db.execute("INSERT INTO office_retention_state VALUES('cursor_floor',?)", (str(recorded),))
        response = self.history(cursor=initial['cursor'])
        self.assertFalse(response['reset'])
        self.assertEqual([point for _, _, point in response['equity']], [None])
        self.assertTrue(self.history(cursor='0'*32)['reset'])

    def test_cursor_cache_eviction_recovers_with_full_window(self):
        history = History(self.config)
        first = history.read(24, '')
        for i in range(14):
            self.original(f'change-{i}', -1600, equity=str(i))
            history.read(24, '')
        reset = history.read(24, first['cursor'])
        self.assertTrue(reset['reset'])
        self.assertEqual([point['value'] for _, _, point in reset['equity']], ['13'])


if __name__ == '__main__':
    unittest.main()
