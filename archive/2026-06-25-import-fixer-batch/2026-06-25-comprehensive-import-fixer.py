import os, re

ROOT = r'c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned\js'

# Map of old import patterns (relative from file location) to corrected paths
# Format: (directory_pattern, old_import_fragment, new_import_fragment)
# directory_pattern is checked with: if normalized_file_path.contains(pattern)
# old_import is the string fragment to find/replace

# Comprehensive fix map: for each file, list the (old_fragment, new_fragment) pairs
fix_map = {
    # === world/playScene/ files ===
    # They import from ../system/X -> ../../system/category/X
    # and from ../values/X -> ../../values/X
    # and from ../world/X -> ../../world/X
    
    # === player/ files ===
    # PlayerController imports from ./player/PlayerInput -> ./PlayerInput
    # PlayerPhysicsBody imports from ./TileCollisionSystem -> ../systems/mining/TileCollisionSystem
    
    # === systems/*/ files ===
    # Many import UserSettings from ../systems/UserSettings -> ../UserSettings
    # Some import PhaserUiKit from ../../PhaserUiKit -> ../../ui/PhaserUiKit
    
    # === ui/ files ===
    # ui/scenes/ import from ../ui/X -> ../X
    # ui/hud/ import from ../systems/UserSettings -> ../../systems/UserSettings
    # ui/overlays/ import from ../systems/UserSettings -> ../../systems/UserSettings
}

def find_double_js_js(rel_path, content):
    """Find instances of /js/ in import paths that shouldn't be there"""
    return 'js/config/' in content or 'js/systems/' in content or 'js/ui/' in content or 'js/values/' in content

def fix_file(fp, rel):
    c = open(fp, 'r', encoding='utf-8').read()
    orig = c
    
    # FIX 1: Double player/player/ paths (when inside player/ dir)
    c = c.replace('./player/', './')
    c = c.replace('../player/', './')
    
    # FIX 2: Bare /systems/UserSettings.js (root-relative, missing js/)
    # If any file imports '/systems/UserSettings' it becomes <root>/systems/UserSettings
    # Fix: replace any import of just 'systems/UserSettings' with '../../systems/UserSettings'
    # This is tricky - only fix if path starts with /
    c = re.sub(r'''["']/systems/UserSettings''', '"../../systems/UserSettings', c)
    c = re.sub(r"""["']/systems/UserSettings""", '"../../systems/UserSettings', c)
    
    # FIX 3: world/systems/save-system -> world/model/
    c = c.replace('world/systems/save-system/', 'world/model/')
    
    # FIX 4: js/ prefix in import paths (file in js/ imports ./js/x creating /js/js/x)
    c = c.replace('"js/', '"../')
    c = c.replace("'js/", "'../")
    # Reverse: if we created ../../js that's bad
    c = c.replace('"../../js/', '"../../')
    
    # FIX 5: systems/shaders/ -> ../shaders/
    c = c.replace('../../systems/shaders/', '../shaders/')
    
    # FIX 6: systems/values/ -> values/
    c = c.replace('"../systems/values/', '"../values/')
    
    # FIX 7: systems/ui/ -> ui/
    c = c.replace('../../systems/ui/', '../ui/')
    
    # FIX 8: systems/save-system/ -> world/model/
    c = c.replace('../systems/save-system/', '../world/model/')
    
    # FIX 9: player/player/X -> player/X
    c = c.replace('"../player/player/', '"../player/')
    c = c.replace("'../player/player/", "'../player/")
    
    # FIX 10: Fix stale config/ references that might remain
    for sub_dir in ['player/', 'core/', 'ui/', 'world/', 'mining/',
                     'audio/', 'input/', 'combo/', 'weather/', 'lighting/',
                     'gamefeel/', 'gem-power/', 'upgrades/', 'resources/',
                     'shaders/', 'shadowMiner/', 'abilities/', 'progression/',
                     'time/', 'leveling/', 'merchants/']:
        c = c.replace('values/' + sub_dir, 'values/')
        c = c.replace('config/' + sub_dir, 'values/')
    
    # FIX 11: Specific wrong paths based on actual 404s
    c = c.replace('"../PhaserUiKit.js"', '"../../ui/PhaserUiKit.js"')
    c = c.replace("'../PhaserUiKit.js'", "'../../ui/PhaserUiKit.js'")
    c = c.replace('"../SettingsPanelContent.js"', '"../../ui/overlays/SettingsPanelContent.js"')
    c = c.replace("'../SettingsPanelContent.js'", "'../../ui/overlays/SettingsPanelContent.js'")
    
    if c != orig:
        open(fp, 'w', encoding='utf-8').write(c)
        return True
    return False

fixed = 0
for d, _, fs in os.walk(ROOT):
    for f in fs:
        if not f.endswith('.js'):
            continue
        fp = os.path.join(d, f)
        rel = os.path.relpath(fp, ROOT)
        if fix_file(fp, rel):
            fixed += 1
            print('Fixed:', rel)

print(f'\nFixed {fixed} files')
