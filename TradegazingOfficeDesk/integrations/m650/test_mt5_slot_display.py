import unittest

from fleet_desk.health import mt5_slot, normalize


class Mt5SlotDisplayTests(unittest.TestCase):
    def test_uses_the_slot_directory_of_the_mt5_executable(self):
        self.assertEqual(mt5_slot(r'C:\Program Files\MetaTrader 5 Slot1\terminal64.exe'), 1)
        self.assertEqual(mt5_slot(r'D:\Apps\METATRADER 5 SLOT 12\terminal.EXE'), 12)
        for path in (None, 7, r'C:\Apps\MetaTrader 5\terminal64.exe',
                     r'C:\Apps\MetaTrader 5 Slot2\metatester64.exe',
                     r'C:\Apps\MetaTrader 5 Slot3\other\terminal64.exe',
                     r'MetaTrader 5 Slot1\terminal64.exe'):
            with self.subTest(path=path):
                self.assertIsNone(mt5_slot(path))

    def test_new_process_keeps_the_slot_and_does_not_inherit_the_old_binding(self):
        executable = r'C:\Program Files\MetaTrader 5 Slot1\terminal64.exe'
        config = {'sources': [{'terminal_id': 'configured-terminal',
                               'process': {'pid': 5244, 'started_at': '2026-11-25T18:00:00Z',
                                           'executable': executable}}]}
        raw = {'observed_at': '2026-11-25T20:00:00Z', 'host_boot': 'boot', 'processes': [
            {'pid': 4528, 'started_at': '2026-11-25T19:00:00Z', 'executable': executable}]}
        process = normalize(raw, None, config)['processes'][0]
        self.assertEqual(process['mt5_slot'], 1)
        self.assertEqual(process['binding'], 'UNBOUND')
        self.assertIsNone(process['terminal_id'])
        self.assertNotIn('executable', process)


if __name__ == '__main__':
    unittest.main()
