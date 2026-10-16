#!/usr/bin/python3
"""Publish an allowlisted snapshot. No robot imports, shell commands or CAN sockets."""
import datetime
import json
import os
from pathlib import Path
import time
import urllib.request

OUT = Path('/var/lib/observer/status.json')
CACHE = Path('/var/lib/observer/repository.json')
API = 'https://api.github.com/repos/Anahiell/RobotProj'

def get_json(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Robot-Observatory', 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.load(response)

def repository():
    try:
        if CACHE.exists() and time.time() - CACHE.stat().st_mtime < 300:
            return json.loads(CACHE.read_text())
        repo = get_json(API)
        commit = get_json(API + '/commits/' + repo['default_branch'])
        runs = get_json(API + '/actions/runs?head_sha=' + commit['sha'] + '&per_page=5')
        result = {'name': 'Anahiell/RobotProj', 'branch': repo['default_branch'],
                  'sha': commit['sha'], 'committed_at': commit['commit']['committer']['date'],
                  'url': 'https://github.com/Anahiell/RobotProj',
                  'checks': [{'name': r['name'], 'status': r['status'], 'conclusion': r['conclusion']}
                             for r in runs['workflow_runs']],
                  'observed_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'stale': False}
        atomic(CACHE, result)
        return result
    except Exception:
        try:
            result = json.loads(CACHE.read_text())
            result['stale'] = True
            return result
        except (OSError, ValueError):
            return {'name': 'Anahiell/RobotProj', 'stale': True}

def atomic(path, data):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data), encoding='utf-8')
    temporary.chmod(0o644)
    os.replace(temporary, path)

def cpu_sample():
    numbers = list(map(int, Path('/proc/stat').read_text().splitlines()[0].split()[1:]))
    return sum(numbers), numbers[3] + numbers[4]

def metrics():
    a, idle_a = cpu_sample()
    time.sleep(0.25)
    b, idle_b = cpu_sample()
    mem = {line.split(':')[0]: int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines()}
    try:
        temperature = int(Path('/sys/class/thermal/thermal_zone0/temp').read_text()) / 1000
    except (OSError, ValueError):
        temperature = None
    return {'cpu_percent': round(100 * (1 - (idle_b-idle_a)/max(1, b-a)), 1),
            'memory_used_gib': round((mem['MemTotal']-mem['MemAvailable'])/1048576, 2),
            'memory_total_gib': round(mem['MemTotal']/1048576, 2),
            'temperature_c': temperature, 'uptime_seconds': int(float(Path('/proc/uptime').read_text().split()[0]))}

def main():
    data = {'schema': 1, 'host': metrics(), 'repository': repository(),
            'robot': {'connected': False, 'reason': 'No actuation or CAN connection'},
            'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    atomic(OUT, data)

if __name__ == '__main__':
    main()
