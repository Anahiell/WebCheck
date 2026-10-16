"""Linux-only publication and rollback tests; never contact a real repository."""
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

if os.name == 'posix':
    spec = importlib.util.spec_from_file_location('updater', Path(__file__).parents[1] / 'deploy/update.py')
    u = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(u)

@unittest.skipUnless(os.name == 'posix', 'Linux updater')
class UpdateTests(unittest.TestCase):
    def exercise(self, healthy=True, mode='100644'):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'releases').mkdir()
            old = root / 'releases' / ('a'*40)
            old.mkdir()
            (root / 'current').symlink_to(old)
            def git(*args):
                if args[0] == 'rev-parse': return b'b'*40
                if args[0] == 'ls-tree': return (mode+' blob abc\t'+args[-1]).encode()
                if args[0] == 'show': return b'<div id="topology-svg"></div>'
                return b''
            # Lock is redirected into the disposable fixture.
            real_open = open
            def lock_open(path, *args, **kwargs):
                return real_open(root / 'lock' if path == '/run/observer-update.lock' else path, *args, **kwargs)
            with patch.object(u, 'ROOT', root), patch.object(u, 'git', side_effect=git), patch('builtins.open', side_effect=lock_open), patch.object(u.urllib.request, 'urlopen') as request:
                request.return_value.__enter__.return_value.status = 200
                request.return_value.__enter__.return_value.read.return_value = b'id="topology-svg"'
                if not healthy: request.side_effect = OSError('health failure')
                if not healthy or mode != '100644':
                    with self.assertRaises((OSError, ValueError)): u.main()
                    self.assertEqual((root / 'current').resolve(), old)
                else:
                    u.main()
                    published = (root / 'current').resolve()
                    self.assertEqual(published.name, 'b'*40)
                    self.assertEqual(sorted(p.name for p in published.iterdir()), sorted(u.FILES))
    def test_publish_only_static_allowlist(self): self.exercise()
    def test_failed_health_restores_previous_release(self): self.exercise(healthy=False)
    def test_reject_symlink_blob(self): self.exercise(mode='120000')
