import base64
import json
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock

from fleet_desk.mac_desk import SshReader


class SlotSshTests(unittest.TestCase):
    def setUp(self):
        tmp = TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        key = Path(tmp.name) / 'key'
        key.write_text('test-key')
        self.runner = Mock()
        self.reader = SshReader({'ssh_host': 'test-vps', 'vps_token_file': str(key)}, self.runner)

    def capture(self, payload, metadata=None, malformed=None):
        text = json.dumps(payload)
        if metadata is not None or malformed is not None:
            text += '\r\nFLEET_MT5_SLOTS ' + (malformed if malformed is not None else json.dumps(metadata))
        self.runner.return_value = subprocess.CompletedProcess([], 0, stdout=text.encode(), stderr=b'')

    def script(self):
        args, options = self.runner.call_args
        self.assertNotIn('test-key', ' '.join(args[0]))
        match = re.search(r"FromBase64String\('([^']+)'\)", options['input'].decode())
        return base64.b64decode(match[1]).decode()

    def test_only_current_health_matches_pid_and_native_start(self):
        live = {'pid': 4528, 'started_at': 'new', 'slot': 1}
        old = {'pid': 4528, 'started_at': 'old', 'mt5_slot': None}
        current = {**old, 'started_at': 'new'}
        self.capture({'windows': [{'last': {'processes': [old, current]}}]}, [live])
        processes = self.reader.fetch('/v1/current?part=health')['windows'][0]['last']['processes']
        self.assertIsNone(processes[0]['mt5_slot'])
        self.assertEqual(processes[1]['mt5_slot'], 1)
        self.assertNotIn('executable', processes[1])
        self.assertIn('Get-CimInstance Win32_Process -Filter', self.script())

    def test_empty_metadata_preserves_health_and_other_reads_have_no_process_query(self):
        health = {'windows': [{'last': {'processes': [{'pid': 4528, 'started_at': 'new', 'mt5_slot': 1}]}}]}
        self.capture(health, [])
        self.assertEqual(self.reader.fetch('/v1/current?part=health'), health)
        self.capture({'cursor': 'already-authorized-history'})
        self.assertEqual(self.reader.fetch('/v1/history?hours=24'), {'cursor': 'already-authorized-history'})
        self.assertNotIn('Get-CimInstance', self.script())

    def test_bad_or_missing_metadata_leaves_health_available(self):
        health = {'windows': [{'last': {'processes': [{'pid': 4528, 'started_at': 'new'}]}}]}
        for metadata, malformed in [(None, None), ({'unexpected': True}, None),
                                     ([None, {}, {'pid': [], 'started_at': 'new', 'slot': 1}], None),
                                     (None, 'garbage')]:
            with self.subTest(metadata=metadata, malformed=malformed):
                self.capture(health, metadata, malformed)
                self.assertEqual(self.reader.fetch('/v1/current?part=health'), health)

    def test_incomplete_health_windows_are_left_to_original_validation(self):
        metadata = [{'pid': 4528, 'started_at': 'new', 'slot': 1}]
        for health in (None, {'windows': None}, {'windows': [
                None, {'last': None}, {'last': {'processes': None}},
                {'last': {'processes': [None, {'pid': [], 'started_at': 'new'}]}}]}):
            with self.subTest(health=health):
                self.capture(health, metadata)
                self.assertEqual(self.reader.fetch('/v1/current?part=health'), health)


if __name__ == '__main__':
    unittest.main()
