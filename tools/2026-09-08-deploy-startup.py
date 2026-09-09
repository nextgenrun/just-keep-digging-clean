"""Inventory, review, then stream changed compact-package files over saved SSH."""
import argparse
import hashlib
import json
from pathlib import Path
import shlex
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / 'dist-startup-20260908'
EVIDENCE = ROOT / '.tmp' / 'startup-production-deploy-20260908'
BUILD = '9ed9ed4a7893'
SSH = ['ssh', '-F', r'C:\Users\Mila\.ssh\config', '-o', 'BatchMode=yes',
       '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15',
       '-o', 'ServerAliveInterval=30', 'cline-local']
REMOTE = (ROOT / 'tools/2026-09-08-startup-remote.py').read_text()


def remote_command(mode):
    return SSH + ['python3 -u -c ' + shlex.quote(REMOTE) + ' ' + mode]


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def prepare():
    if json.loads((PACKAGE / 'build-manifest.json').read_text())['buildId'] != BUILD:
        raise RuntimeError('Compact package identity changed')
    expected = {}
    print('Hashing the verified local compact package...', flush=True)
    for p in sorted(PACKAGE.rglob('*')):
        if p.is_symlink():
            raise RuntimeError('Package contains a symlink')
        if p.is_file():
            expected[p.relative_to(PACKAGE).as_posix()] = {'size': p.stat().st_size, 'sha256': digest(p)}
    total = sum(v['size'] for v in expected.values())
    if total != 4_824_322_345 or len(expected) != 8502:
        raise RuntimeError('Verified compact package size or file count changed')
    print('Hashing the current live game over SSH; no remote changes...', flush=True)
    response = subprocess.run(remote_command('inventory'), check=True, capture_output=True, text=True)
    remote = json.loads(response.stdout)
    before = remote['files']
    changes = [n for n in expected if n not in before or
               any(expected[n][k] != before[n][k] for k in ('size', 'sha256'))]
    changes.sort(key=lambda n: (n in ('index.html', 'index.html.gz'),
                               expected[n]['size'] - before.get(n, {}).get('size', 0), n))
    plan = {'root': remote['root'], 'buildId': BUILD, 'expected': expected,
            'before': before, 'changes': changes}
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    (EVIDENCE / 'plan.json').write_text(json.dumps(plan), encoding='utf-8')
    obsolete = sorted(set(before) - set(expected))
    used = sum(v['size'] for n, v in before.items() if n not in obsolete)
    peak = used
    for n in changes:
        peak = max(peak, used + expected[n]['size'] + 1024)
        used += expected[n]['size'] - before.get(n, {}).get('size', 0)
    summary = {'root': remote['root'], 'buildId': BUILD, 'packageBytes': total,
               'currentBytes': sum(v['size'] for v in before.values()),
               'unchangedFiles': len(expected) - len(changes), 'uploadFiles': len(changes),
               'uploadBytes': sum(expected[n]['size'] for n in changes),
               'removeFiles': len(obsolete), 'removeBytes': sum(before[n]['size'] for n in obsolete),
               'maximumEstimatedBytes': peak, 'obsoleteRoots': sorted({n.split('/')[0] for n in obsolete})}
    (EVIDENCE / 'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    (EVIDENCE / 'obsolete-files.json').write_text(json.dumps(obsolete, indent=2), encoding='utf-8')
    print(json.dumps(summary, indent=2), flush=True)
    if peak > 10_000_000_000:
        raise RuntimeError('Planned transfer exceeds the size limit')


def send(mode):
    plan = json.loads((EVIDENCE / 'plan.json').read_text(encoding='utf-8'))
    payload = json.dumps(plan).encode('utf-8')
    process = subprocess.Popen(remote_command(mode), stdin=subprocess.PIPE)
    try:
        process.stdin.write(str(len(payload)).encode() + b'\n' + payload)
        if mode == 'apply':
            sent = 0
            for i, name in enumerate(plan['changes']):
                p = PACKAGE.joinpath(*name.split('/'))
                if not p.resolve().is_relative_to(PACKAGE) or p.is_symlink():
                    raise RuntimeError('Unsafe local upload path')
                with p.open('rb') as f:
                    for block in iter(lambda: f.read(1024 * 1024), b''):
                        process.stdin.write(block)
                        sent += len(block)
                if (i + 1) % 250 == 0:
                    print(json.dumps({'sentFiles': i + 1, 'sentBytes': sent}), flush=True)
        process.stdin.close()
        result = process.wait()
        if result:
            raise RuntimeError('Remote deployment failed; maintenance remains until repaired')
    except BaseException:
        try:
            process.stdin.close()
        except OSError:
            pass
        process.wait()
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['plan', 'apply', 'finish'])
    mode = parser.parse_args().mode
    prepare() if mode == 'plan' else send(mode)
