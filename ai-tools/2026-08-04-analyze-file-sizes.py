import os

ROOT = os.getcwd()
DIRS = ["values", "world", "player", "systems", "ui", "sound"]
SKIP_PARTS = ["node_modules", "archive", "generated", "library-v2", "playlists", "soundEffects", "voice-lines"]

def count_lines(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0

files = []
for d in DIRS:
    base = os.path.join(ROOT, d)
    if not os.path.isdir(base):
        continue
    for root, dirs, names in os.walk(base):
        # prune skip dirs
        dirs[:] = [x for x in dirs if x not in SKIP_PARTS and not any(s in os.path.join(root, x) for s in SKIP_PARTS)]
        for name in names:
            if not name.endswith(".js"):
                continue
            full = os.path.join(root, name)
            if any(s in full for s in SKIP_PARTS):
                continue
            rel = os.path.relpath(full, ROOT).replace("\\", "/")
            files.append((count_lines(full), rel))

files.sort(reverse=True)
print("=== TOP 40 LARGEST .js FILES (by line count) ===")
for lines, rel in files[:40]:
    print(f"{lines:6d}  {rel}")

total = sum(l for l, _ in files)
print(f"\n=== TOTALS ===")
print(f"Total .js files scanned: {len(files)}")
print(f"Total lines: {total}")
over300 = [f for f in files if f[0] > 300]
print(f"Files over 300 lines (rule violation): {len(over300)}")
for lines, rel in over300:
    print(f"  {lines:6d}  {rel}")