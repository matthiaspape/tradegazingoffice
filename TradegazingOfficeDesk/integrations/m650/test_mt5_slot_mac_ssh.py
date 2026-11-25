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

    def capture(self, *values):
        stdout = '\r\n'.join(json.dumps(value) for value in values).encode()
        self.runner.return_value = subprocess.CompletedProcess([], 0, stdout=stdout, stderr=b'')

    def script(self):
        args, options = self.runner.call_args
        self.assertNotIn('test-key', ' '.join(args[0]))
        match = re.search(r"FromBase64String\('([^']+)'\)", options['input'].decode())
        return base64.b64decode(match[1]).decode()

    def test_only_current_health_matches_pid_and_native_start(self):
        live = {'pid': 4528, 'started_at': 'new', 'slot': 1}
        old = {'pid': 4528, 'started_at': 'old', 'mt5_slot': None}
        current = {**old, 'started_at': 'new'}
        self.capture([live], {'windows': [{'last': {'processes': [old, current]}}]})
        processes = self.reader.fetch('/v1/current?part=health')['windows'][0]['last']['processes']
        self.assertIsNone(processes[0]['mt5_slot'])
        self.assertEqual(processes[1]['mt5_slot'], 1)
        self.assertNotIn('executable', processes[1])
        self.assertIn('Get-CimInstance Win32_Process -Filter', self.script())

    def test_empty_metadata_preserves_health_and_other_reads_have_no_process_query(self):
        health = {'windows': [{'last': {'processes': [{'pid': 4528, 'started_at': 'new', 'mt5_slot': 1}]}}]}
        self.capture([], health)
        self.assertEqual(self.reader.fetch('/v1/current?part=health'), health)
        self.capture({'cursor': 'already-authorized-history'})
        self.assertEqual(self.reader.fetch('/v1/history?hours=24'), {'cursor': 'already-authorized-history'})
        self.assertNotIn('Get-CimInstance', self.script())


if __name__ == '__main__':
    unittest.main()
