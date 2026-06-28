"""
ONE PASS import rewriter for dig-game-dev-env-cleaned.

Strategy: For each .js file, compute its depth from js/ root.
Then rewrite every import path to use that depth prefix + the known target location.

No incremental fixes. No pattern guessing. Deterministic.
"""

import os, re

ROOT = r'c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned\js'

# Known top-level module directories under js/
KNOWN_MODULES = {
    'values', 'player', 'systems', 'world', 'ui', 'shaders', 'testing', 'libs'
}

def depth_from_root(rel_path):
    """How many ../ needed to go from this file back to js/ root"""
    parts = rel_path.replace('\\', '/').split('/')
    return len(parts) - 1  # -1 because the filename itself is last

def is_internal_import(path):
    """Check if an import looks like it points to a project module"""
    first_dir = path.split('/')[0]
    return first_dir in KNOWN_MODULES

def fix_imports_in_file(fp, rel):
    c = open(fp, 'r', encoding='utf-8').read()
    orig = c
    depth = depth_from_root(rel)
    prefix = '../' * depth

    # Pattern to match ES module import paths
    # import { X } from "path"
    # import X from "path"
    # Must be in quotes
    def replace_path(match):
        quote = match.group(2)
        old_path = match.group(4)
        new_path = resolve_path(old_path, prefix, depth)
        if new_path != old_path:
            return match.group(1) + quote + new_path + quote + match.group(5)
        return match.group(0)

    def replace_dynamic_path(match):
        quote = match.group(1)
        old_path = match.group(2)
        new_path = resolve_path(old_path, prefix, depth)
        if new_path != old_path:
            return quote + new_path + quote
        return match.group(0)

    def resolve_path(old_path, prefix, depth):
        # Strip leading ./, ../, / (root-relative)
        stripped = old_path
        while stripped.startswith('./') or stripped.startswith('../') or stripped.startswith('/'):
            if stripped.startswith('./') or stripped.startswith('../'):
                stripped = stripped[stripped.index('/') + 1:]
            elif stripped.startswith('/'):
                stripped = stripped[1:]

        # Remove any leading js/ (from stale restructured paths)
        if stripped.startswith('js/'):
            stripped = stripped[3:]

        # Now stripped should be something like "values/X.js" or "systems/audio/SoundSystem.js"
        # Check if it's a known module
        first = stripped.split('/')[0]
        if first in KNOWN_MODULES:
            new_path = prefix + stripped
            # Remove double prefix
            while new_path.startswith(prefix + prefix):
                new_path = new_path[len(prefix):]
            return new_path

        # For non-project imports (like libs), leave as-is
        return old_path

    # Fix import ... from "..." statements
    pattern = r'(import\s+(?:(?:\{[^}]*\}|[^;{]+)\s+from\s+))(["\'])([^"\']+)(["\'])'
    c = re.sub(pattern, replace_path, c)

    # Fix dynamic require or bare strings containing project paths
    # e.g. "../../systems/UserSettings" in function calls
    if depth > 0:
        # Replace bare paths in string contexts that point to known modules
        for mod in KNOWN_MODULES:
            # Match any quoted string containing the module path at varying depths
            # But only if it looks like a stale path (has wrong depth)
            for wrong_prefix in ['', './', '../', '../../', '../../../', '../../../../', '/']:
                wrong = wrong_prefix + mod
                right = prefix + mod
                if wrong != right:
                    c = c.replace('"' + wrong + '"', '"' + right + '"')
                    c = c.replace("'" + wrong + "'", "'" + right + "'")

    if c != orig:
        open(fp, 'w', encoding='utf-8').write(c)
        return True
    return False

fixed = 0
scanned = 0
for d, _, fs in os.walk(ROOT):
    for f in fs:
        if not f.endswith('.js'):
            continue
        fp = os.path.join(d, f)
        rel = os.path.relpath(fp, ROOT)
        scanned += 1
        if fix_imports_in_file(fp, rel):
            fixed += 1
            print('Fixed:', rel)

print(f'\nScanned: {scanned}, Fixed: {fixed}')
