#!/usr/bin/python3
"""Root-owned updater: fetch as unprivileged user, publish ONLY four static files.
Repository scripts, service files and collector updates require manual review.
"""
import fcntl
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.request

REPO = '/var/lib/observer-update/repo.git'
FILES = ('index.html', 'styles.css', 'app.js', 'topology.js')
ROOT = Path('/srv/observer')

def git(*args):
    return subprocess.check_output(['/usr/sbin/runuser', '-u', 'observer-update', '--',
        '/usr/bin/git', '-c', 'core.hooksPath=/dev/null', '--git-dir=' + REPO, *args], timeout=90)

def main():
    with open('/run/observer-update.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        git('fetch', '--no-tags', 'https://github.com/Anahiell/WebCheck.git', 'refs/heads/main')
        sha = git('rev-parse', 'FETCH_HEAD').decode().strip()
        if not re.fullmatch('[0-9a-f]{40}', sha):
            raise ValueError('Invalid commit')
        current = ROOT / 'current'
        previous = os.readlink(current) if current.is_symlink() else None
        if previous and Path(previous).name == sha:
            return
        if previous:
            # Reject rewritten history and rollbacks. First install is pinned by the operator.
            git('merge-base', '--is-ancestor', Path(previous).name, sha)
        release = ROOT / 'releases' / sha
        if not release.exists():
            staging = Path(tempfile.mkdtemp(prefix='.staging-', dir=ROOT / 'releases'))
            staging.chmod(0o755)
            for name in FILES:
                mode = git('ls-tree', sha, '--', name).decode().split()[0]
                if mode != '100644':
                    raise ValueError('Only regular static files allowed')
                data = git('show', sha + ':' + name)
                if not 0 < len(data) <= 1048576:
                    raise ValueError('Invalid static file size')
                (staging / name).write_bytes(data)
                (staging / name).chmod(0o644)
            if b'id="topology-svg"' not in (staging / 'index.html').read_bytes():
                raise ValueError('Missing dashboard')
            staging.rename(release)
        candidate = ROOT / '.current-next'
        candidate.unlink(missing_ok=True)
        candidate.symlink_to(release, target_is_directory=True)
        os.replace(candidate, current)
        try:
            with urllib.request.urlopen('http://127.0.0.1:8080/', timeout=5) as response:
                if response.status != 200 or b'id="topology-svg"' not in response.read():
                    raise ValueError('Health check failed')
        except Exception:
            if previous:
                candidate.symlink_to(previous, target_is_directory=True)
                os.replace(candidate, current)
            else:
                current.unlink()
            raise

if __name__ == '__main__':
    main()
