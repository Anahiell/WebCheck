import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('collect', Path(__file__).parents[1] / 'deploy/collect.py')
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)

class SnapshotTests(unittest.TestCase):
    def test_host_allowlist(self):
        data = {'/proc/meminfo': 'MemTotal: 8388608 kB\nMemAvailable: 4194304 kB',
                '/proc/uptime': '1234.7 999', '/sys/class/thermal/thermal_zone0/temp': '42000'}
        with patch.object(c, 'cpu_sample', side_effect=[(100, 70), (200, 120)]), patch.object(c.time, 'sleep'), patch.object(Path, 'read_text', lambda p: data[str(p).replace('\\', '/')]):
            result = c.metrics()
        self.assertEqual(result, {'cpu_percent': 50, 'memory_used_gib': 4, 'memory_total_gib': 8, 'temperature_c': 42, 'uptime_seconds': 1234})

    def test_repository_failure_marks_cached_metadata_stale(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(c, 'CACHE', Path(directory) / 'repo.json'):
                c.atomic(c.CACHE, {'sha': 'abc', 'stale': False})
                with patch.object(c.time, 'time', return_value=c.CACHE.stat().st_mtime + 400), patch.object(c, 'get_json', side_effect=OSError):
                    result = c.repository()
                self.assertTrue(result['stale'])
                self.assertEqual(result['sha'], 'abc')

    def test_no_credentials_or_commit_message_published(self):
        responses = [{'default_branch': 'master', 'private': False, 'token': 'secret'},
                     {'sha': 'a'*40, 'commit': {'message': 'secret text', 'committer': {'date': '2026-10-16T00:00:00Z'}}}, {'workflow_runs': []}]
        with tempfile.TemporaryDirectory() as directory, patch.object(c, 'CACHE', Path(directory) / 'repo.json'), patch.object(c, 'get_json', side_effect=responses):
            result = c.repository()
        self.assertNotIn('secret', json.dumps(result))
        self.assertEqual(result['branch'], 'master')

if __name__ == '__main__':
    unittest.main()
