import io
import unittest
from contextlib import redirect_stderr

from fleet_desk.mac_desk import CurrentRead, VpsUnavailable


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


class Transport:
    def __init__(self, clock=None):
        self.calls, self.fail, self.clock, self.duration = 0, False, clock, 0

    def fetch(self, endpoint):
        self.calls += 1
        if self.clock is not None:
            self.clock.now += self.duration
        if self.fail:
            try:
                raise TimeoutError('ssh timed out after 30 s')
            except TimeoutError as error:
                raise VpsUnavailable('VPS-Datenabruf momentan nicht erreichbar') from error
        return {'accounts': [], 'windows': []}


class CurrentRefreshTests(unittest.TestCase):
    def setUp(self):
        self.clock = Clock()
        self.transport = Transport(self.clock)
        self.read = CurrentRead('desk', self.transport, self.clock, 300)

    def test_wait_until_next_due_read(self):
        self.assertEqual(self.read.wait_seconds(), 0.0)
        self.read.snapshot()
        self.clock.now += 120
        self.assertEqual(self.read.wait_seconds(), 180)
        self.clock.now += 500
        self.assertEqual(self.read.wait_seconds(), 1.0)

    def test_failure_is_logged_without_key_and_retried_after_30_seconds(self):
        self.read.snapshot()
        self.clock.now += 300
        self.transport.fail = True
        log = io.StringIO()
        with redirect_stderr(log):
            state = self.read.snapshot()['connection']['state']
        self.assertEqual(state, 'STALE')
        self.assertIn('current desk refresh failed: TimeoutError: ssh timed out', log.getvalue())
        self.assertNotIn('Bearer', log.getvalue())
        self.assertEqual(self.read.wait_seconds(), 30)
        self.transport.fail = False
        self.clock.now += 30
        self.assertEqual(self.read.snapshot()['connection']['state'], 'CURRENT')

    def test_slow_failure_still_waits_30_seconds_after_it_ended(self):
        self.read.snapshot()
        self.clock.now += 300
        self.transport.fail, self.transport.duration = True, 30
        with redirect_stderr(io.StringIO()):
            self.read.snapshot()
        self.assertEqual(self.read.wait_seconds(), 30)

    def test_log_write_failure_keeps_cached_response(self):
        class Broken(io.StringIO):
            def write(self, value):
                raise OSError('disk full')
        self.read.snapshot()
        self.clock.now += 300
        self.transport.fail = True
        with redirect_stderr(Broken()):
            self.assertEqual(self.read.snapshot()['connection']['state'], 'STALE')
        self.assertEqual(self.read.wait_seconds(), 30)

    def test_requests_in_between_never_make_the_background_skip_a_cycle(self):
        # Background loop follows wait_seconds(); requests arrive at arbitrary times.
        requests = [1290.0, 1301.0, 1599.0, 1605.0, 2207.0, 2210.0, 3100.0]
        refreshes, wake, end = [], self.clock.now, 4000.0
        while wake <= end:
            while requests and requests[0] < wake:
                self.clock.now = requests.pop(0)
                before = self.transport.calls
                self.read.snapshot()
                if self.transport.calls > before:
                    refreshes.append(self.clock.now)
            self.clock.now = wake
            before = self.transport.calls
            self.read.snapshot()
            if self.transport.calls > before:
                refreshes.append(self.clock.now)
            wake = self.clock.now + self.read.wait_seconds()
        gaps = [b - a for a, b in zip(refreshes, refreshes[1:])]
        self.assertLessEqual(max(gaps), 300)


if __name__ == '__main__':
    unittest.main()
