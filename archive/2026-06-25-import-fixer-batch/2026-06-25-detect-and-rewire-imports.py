"""
ONE PASS: Rewire ALL import paths in dig-game-dev-env-cleaned/js/
based on file depth from js/ root.

How it works:
- Walk every .js file
- Calculate its depth from js/ (e.g. world/playScene/X.js = depth 2)
- For every import path: strip existing prefix (./, ../, /, or none)
- Rebuild with correct prefix: N * ../ + bare_path
- Only rewrite files that actually changed
"""

import os, re

ROOT = r'c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned\js'

KNOWN_MODULES = {
    'values', 'player', 'systems', 'world', 'ui', 'shaders', 'testing'
}

def get_depth(rel_path):
    """Number of ../ needed to get from file back to js/ root"""
    return rel_path.replace('\\', '/').count('/')

def get_bare_path(import_path):
    """Strip ALL leading ./, ../, / from an import path and also any leading js/"""
    p = import_path.strip()
    while p.startswith('./') or p.startswith('../') or p.startswith('/'):
        p = p[p.index('/') + 1:]
    if p.startswith('js/'):
        p = p[3:]
    return p

def fix_file(fp, rel):
    with open(fp, 'r', encoding='utf-8') as f:
        c = f.read()
    orig = c
    depth = get_depth(rel)
    prefix = '../' * depth

    def replace_import(m):
        full = m.group(0)
        quote = m.group(2)
        path = m.group(3)
        bare = get_bare_path(path)
        first = bare.split('/')[0]
        if first in KNOWN_MODULES:
            new_path = prefix + bare
            old = quote + path + quote
            new = quote + new_path + quote
            return full.replace(old, new)
        return full

    # Match: import ... from "..."
    c = re.sub(r'(import\s+(?:\{[^}]*\}|[^;{]+?)\s+from\s+)(["\'])([^"\']+)(["\'])', replace_import, c)

    # Match bare quoted paths that reference known modules (e.g. "systems/UserSettings")
    # These appear in dynamic requires or string args
    for mod in KNOWN_MODULES:
        pattern = re.compile(r'(["\'])((?:\.{0,2}/)*' + re.escape(mod) + r'(?:/[^"\']*)?\.js)(["\'])')
        def make_replacer(m):
            q = m.group(1)
            p = m.group(2)
            bare = get_bare_path(p)
            new_path = prefix + bare
            return q + new_path + q
        c = pattern.sub(make_replacer, c)

    if c != orig:
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(c)
        return True
    return False

fixed = 0
scanned = 0
for d, _, fs in os.walk(ROOT):
    for fn in fs:
        if not fn.endswith('.js'):
            continue
        fp = os.path.join(d, fn)
        rel = os.path.relpath(fp, ROOT)
        scanned += 1
        if fix_file(fp, rel):
            fixed += 1
            print('Fixed:', rel)

print(f'\nScanned: {scanned}, Fixed: {fixed}')

