"""Guarded streamed replacement of the one explicitly named live game directory."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys

ROOT = Path('/home/customer/www/nextgen.run/public_html/diggame-beta-1')
LIMIT = 10_000_000_000
BUILD = '9ed9ed4a7893'
MAINTENANCE = b'ErrorDocument 503 "The game is updating. Please reload in a moment."\nRewriteEngine On\nRewriteRule ^ - [R=503,L]\n'
CONFIG = b'Options -Indexes\n<IfModule mod_expires.c>\n<FilesMatch "^(index[.]html|player-data[.]php)$">\nExpiresActive Off\n</FilesMatch>\n</IfModule>\n<IfModule mod_headers.c>\n<FilesMatch "^(index[.]html|player-data[.]php)$">\nHeader set Cache-Control "no-store, private"\n</FilesMatch>\n</IfModule>\n'
ALLOWED = {'ai-tools', 'archive', 'assets', 'css', 'exports', 'libs', 'player',
           'sound', 'sprites', 'systems', 'testing', 'ui', 'values', 'world',
           'visual-approval-previews', 'api', 'server', 'main.js', 'main.js.gz',
           'index.html', 'index.html.gz', 'session-logging.js',
           'build-manifest.json', 'build-manifest.json.gz'}


def target(name):
    p = PurePosixPath(name)
    if p.is_absolute() or '..' in p.parts or not p.parts or str(p) != name:
        raise RuntimeError('Unsafe relative path: ' + name)
    q = ROOT.joinpath(*p.parts)
    if ROOT.resolve() != ROOT or not q.resolve().is_relative_to(ROOT):
        raise RuntimeError('Target escaped the verified game root')
    for ancestor in [q, *q.parents]:
        if ancestor == ROOT:
            break
        if ancestor.is_symlink():
            raise RuntimeError('Symlink target: ' + name)
    return q


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def inventory(hashes=True):
    if not ROOT.is_dir() or ROOT.resolve() != ROOT:
        raise RuntimeError('Live root does not match the verified directory')
    result = {}
    for directory, dirs, files in os.walk(ROOT):
        for name in dirs + files:
            if (Path(directory) / name).is_symlink():
                raise RuntimeError('Unexpected symlink in live game')
        for name in files:
            p = Path(directory) / name
            rel = p.relative_to(ROOT).as_posix()
            if rel == '.htaccess':
                if p.read_bytes() not in (CONFIG, MAINTENANCE):
                    raise RuntimeError('Unrecognized live configuration; preserve and inspect')
                continue
            if PurePosixPath(rel).parts[0] not in ALLOWED:
                raise RuntimeError('Unclassified live file; preserve and inspect: ' + rel)
            stat = p.stat()
            result[rel] = {'size': stat.st_size, 'mtime_ns': stat.st_mtime_ns}
            if hashes:
                result[rel]['sha256'] = digest(p)
    return result


def exact_read(stream, count):
    result = bytearray()
    while len(result) < count:
        data = stream.read(count - len(result))
        if not data:
            raise RuntimeError('Upload ended before the declared bytes arrived')
        result.extend(data)
    return bytes(result)


def verify(expected):
    current = inventory()
    if set(current) != set(expected):
        raise RuntimeError('Final file list differs from the compact package')
    for name, record in expected.items():
        if any(current[name][k] != record[k] for k in ('size', 'sha256')):
            raise RuntimeError('Final content mismatch: ' + name)
    size = sum(v['size'] for v in current.values()) + len(CONFIG)
    if size > LIMIT:
        raise RuntimeError('Final game exceeds the size limit')
    if json.loads(target('build-manifest.json').read_text())['buildId'] != BUILD:
        raise RuntimeError('Unexpected final build ID')
    for name in expected:
        if name.endswith('.php'):
            subprocess.run(['php', '-l', str(target(name))], check=True,
                           stdout=subprocess.DEVNULL)
    return {'buildId': BUILD, 'fileCount': len(current) + 1, 'bytes': size}


def apply(plan):
    expected, before = plan['expected'], plan['before']
    if plan['root'] != str(ROOT) or plan['buildId'] != BUILD:
        raise RuntimeError('Incorrect deployment identity')
    if sum(v['size'] for v in expected.values()) + len(CONFIG) > LIMIT:
        raise RuntimeError('Package exceeds the size limit')
    for name in expected:
        if PurePosixPath(name).parts[0] not in ALLOWED:
            raise RuntimeError('Unexpected package root: ' + name)
        target(name)
    lock = target('.compact-deploy-lock')
    lock.mkdir()
    partial = target('.compact-deploy.part')
    try:
        current = inventory(False)
        if current != {n: {k: v[k] for k in ('size', 'mtime_ns')} for n, v in before.items()}:
            raise RuntimeError('Live files changed after inventory; regenerate the plan')
        changes = plan['changes']
        changed = {n for n in expected if n not in before or
                   any(expected[n][k] != before[n][k] for k in ('size', 'sha256'))}
        if len(changes) != len(changed) or set(changes) != changed:
            raise RuntimeError('Changed-file plan does not match the manifests')
        obsolete = set(before) - set(expected)
        used = sum(v['size'] for n, v in before.items() if n not in obsolete)
        peak = used + len(MAINTENANCE)
        for name in changes:
            peak = max(peak, used + expected[name]['size'] + len(MAINTENANCE))
            used += expected[name]['size'] - before.get(name, {}).get('size', 0)
        if peak > LIMIT:
            raise RuntimeError('Temporary upload footprint would exceed 10 GB')
        if shutil.disk_usage(ROOT).free < max(0, peak - sum(v['size'] for v in before.values())) + max(v['size'] for v in expected.values()) + 1_000_000_000:
            raise RuntimeError('Insufficient free filesystem space')
        target('.htaccess').write_bytes(MAINTENANCE)
        for name in sorted(obsolete):
            target(name).unlink()
        print(json.dumps({'maintenance': True, 'removedFiles': len(obsolete), 'peakBytes': peak}), flush=True)
        for i, name in enumerate(changes):
            dest, record = target(name), expected[name]
            dest.parent.mkdir(parents=True, exist_ok=True)
            h, remaining = hashlib.sha256(), record['size']
            with partial.open('xb') as f:
                while remaining:
                    block = exact_read(sys.stdin.buffer, min(remaining, 1024 * 1024))
                    f.write(block)
                    h.update(block)
                    remaining -= len(block)
                f.flush()
                os.fsync(f.fileno())
            if h.hexdigest() != record['sha256']:
                raise RuntimeError('Incoming content mismatch: ' + name)
            partial.chmod(0o644)
            os.replace(partial, dest)
            if (i + 1) % 250 == 0:
                print(json.dumps({'uploadedFiles': i + 1, 'total': len(changes)}), flush=True)
        for directory, dirs, files in os.walk(ROOT, topdown=False):
            p = Path(directory)
            if p not in (ROOT, lock):
                try:
                    p.rmdir()
                except OSError:
                    pass
        result = verify(expected)
        result['maintenance'] = True
        print(json.dumps(result), flush=True)
    finally:
        if partial.exists():
            partial.unlink()
        lock.rmdir()


mode = sys.argv[1]
if mode == 'inventory':
    print(json.dumps({'root': str(ROOT), 'files': inventory()}))
else:
    length = int(sys.stdin.buffer.readline())
    if not 0 < length < 12_000_000:
        raise RuntimeError('Invalid manifest length')
    plan = json.loads(exact_read(sys.stdin.buffer, length))
    if mode == 'apply':
        apply(plan)
    elif mode == 'finish':
        result = verify(plan['expected'])
        target('.htaccess').write_bytes(CONFIG)
        result['maintenance'] = False
        result['diskUsageBytes'] = int(subprocess.check_output(['du', '-sb', str(ROOT)]).split()[0])
        if result['diskUsageBytes'] > LIMIT:
            target('.htaccess').write_bytes(MAINTENANCE)
            raise RuntimeError('Directory overhead exceeds the size limit')
        print(json.dumps(result), flush=True)
    else:
        raise RuntimeError('Unknown mode')
