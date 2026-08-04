import os, re

ROOT = os.getcwd()
LAYERS = {
    "values": 0,
    "systems": 1,
    "world": 2,
    "player": 2,
    "ui": 3,
    "sound": 1,
}
SKIP_PARTS = ["node_modules", "archive", "generated", "library-v2", "playlists", "soundEffects", "voice-lines"]

IMPORT_RE = re.compile(r"""from\s+['"]([^'"]+)['"]""")

def layer_of(rel):
    parts = rel.split("/")
    return LAYERS.get(parts[0], -1)

def resolve_target(rel, imp):
    # imp is a relative path like ../values/x.js or ./y.js
    base_dir = os.path.dirname(rel)
    # normalize
    combined = os.path.normpath(os.path.join(base_dir, imp)).replace("\\", "/")
    # strip query string
    combined = combined.split("?")[0]
    # strip .js
    if combined.endswith(".js"):
        combined = combined[:-3]
    top = combined.split("/")[0]
    return top, combined

violations = []
total_imports = 0
for d in LAYERS:
    base = os.path.join(ROOT, d)
    if not os.path.isdir(base):
        continue
    for root, dirs, names in os.walk(base):
        dirs[:] = [x for x in dirs if x not in SKIP_PARTS]
        for name in names:
            if not name.endswith(".js"):
                continue
            full = os.path.join(root, name)
            if any(s in full for s in SKIP_PARTS):
                continue
            rel = os.path.relpath(full, ROOT).replace("\\", "/")
            src_layer = layer_of(rel)
            try:
                with open(full, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except Exception:
                continue
            for m in IMPORT_RE.finditer(content):
                imp = m.group(1)
                if imp.startswith("."):
                    total_imports += 1
                    target_top, _ = resolve_target(rel, imp)
                    target_layer = LAYERS.get(target_top, -1)
                    # Violation = importing from a HIGHER layer (target > source).
                    # Importing from a lower/equal layer is legal per the rules.
                    if target_layer != -1 and target_layer > src_layer:
                        violations.append((rel, imp, src_layer, target_layer))

print(f"Total relative imports scanned: {total_imports}")
print(f"Import-direction violations (importing from a higher layer): {len(violations)}")
print()
for rel, imp, sl, tl in violations:
    print(f"  {rel}\n      -> {imp}  (layer {sl} imports layer {tl})")