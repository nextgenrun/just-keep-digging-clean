"""Fix PlayerInput.js and PhysicsBody.js stubs causing runtime errors."""
import shutil
from pathlib import Path

ROOT = Path(r"c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned")
BK = Path(r"c:\xampp\_Backups\dig-game-simple\back-ups-dig-game\25-06-2026-semistable-restore")

def import_fix(content):
    """Replace old config/ paths"""
    c = content
    # config -> values
    c = c.replace('"../config/', '"../../values/')
    c = c.replace('"../../config/', '"../../values/')
    c = c.replace('"../../../config/', '"../../../values/')
    c = c.replace('"./config/', '"./values/')
    # systems internal references
    c = c.replace('"../systems/UserSettings.js"', '"../UserSettings.js"')
    c = c.replace('"./UserSettings.js"', '"../UserSettings.js"')
    # ui refs
    c = c.replace('"../ui/PhaserUiKit.js"', '"../ui/PhaserUiKit.js"')
    return c

# File 1: PlayerInput.js (missing hasMovementInput)
fp = ROOT / "player" / "PlayerInput.js"
bp = BK / "js" / "systems" / "player" / "PlayerInput.js"
print(f"PlayerInput.js: clean={len(fp.read_text(encoding='utf-8').splitlines()) if fp.exists() else 0}L, backup={len(bp.read_text(encoding='utf-8').splitlines()) if bp.exists() else 0}L")
if bp.exists():
    fixed = import_fix(bp.read_text(encoding='utf-8'))
    fp.write_text(fixed, encoding='utf-8')
    print(f"  REPLACED: {len(fixed.splitlines())} lines")

# File 2: PlayerPhysicsBody.js / PhysicsBody.js (missing getCenterX)
# Check which one exists and fix the one PlayerState.js imports
# PlayerState.js probably imports PlayerPhysicsBody.js
ps = ROOT / "player" / "PlayerState.js"
if ps.exists():
    ps_content = ps.read_text(encoding='utf-8')
    if 'PlayerPhysicsBody' in ps_content:
        target = "PlayerPhysicsBody.js"
    elif 'PhysicsBody' in ps_content:
        target = "PhysicsBody.js"
    else:
        target = "PlayerPhysicsBody.js"
    print(f"PlayerState.js imports from: {target}")

# Fix PlayerPhysicsBody.js
fpp = ROOT / "player" / "PlayerPhysicsBody.js"
bpp = BK / "js" / "systems" / "PlayerPhysicsBody.js"
print(f"PlayerPhysicsBody.js: clean={len(fpp.read_text(encoding='utf-8').splitlines()) if fpp.exists() else 0}L, backup={len(bpp.read_text(encoding='utf-8').splitlines()) if bpp.exists() else 0}L")
if bpp.exists():
    fixed = import_fix(bpp.read_text(encoding='utf-8'))
    fpp.write_text(fixed, encoding='utf-8')
    print(f"  REPLACED: {len(fixed.splitlines())} lines")

# File 3: PlayerState.js itself
fps = ROOT / "player" / "PlayerState.js"
bps = BK / "js" / "systems" / "player" / "PlayerState.js"
print(f"PlayerState.js: clean={len(fps.read_text(encoding='utf-8').splitlines()) if fps.exists() else 0}L, backup={len(bps.read_text(encoding='utf-8').splitlines()) if bps.exists() else 0}L")
if bps.exists():
    fixed = import_fix(bps.read_text(encoding='utf-8'))
    fps.write_text(fixed, encoding='utf-8')
    print(f"  REPLACED: {len(fixed.splitlines())} lines")

# File 4: GameInputHandler.js - this calls playerInput.hasMovementInput
fg = ROOT / "world" / "playScene" / "GameInputHandler.js"
bg = BK / "js" / "scenes" / "PlayScene" / "GameInputHandler.js"
print(f"GameInputHandler.js: clean={len(fg.read_text(encoding='utf-8').splitlines()) if fg.exists() else 0}L, backup={len(bg.read_text(encoding='utf-8').splitlines()) if bg.exists() else 0}L")
if bg.exists():
    fixed = import_fix(bg.read_text(encoding='utf-8'))
    fg.write_text(fixed, encoding='utf-8')
    print(f"  REPLACED: {len(fixed.splitlines())} lines")

# File 5: PlayerInputHandler.js
fpi = ROOT / "world" / "playScene" / "PlayerInputHandler.js"
bpi = BK / "js" / "scenes" / "PlayScene" / "PlayerInputHandler.js"
print(f"PlayerInputHandler.js: clean={len(fpi.read_text(encoding='utf-8').splitlines()) if fpi.exists() else 0}L, backup={len(bpi.read_text(encoding='utf-8').splitlines()) if bpi.exists() else 0}L")
if bpi.exists():
    fixed = import_fix(bpi.read_text(encoding='utf-8'))
    fpi.write_text(fixed, encoding='utf-8')
    print(f"  REPLACED: {len(fixed.splitlines())} lines")

print("\nDone. Refresh browser to test.")