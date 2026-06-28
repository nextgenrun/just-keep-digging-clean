import os

ROOT = r'c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned\js'

# File-relative fix patterns: (file_relative, old_pattern, new_pattern)
fixes = [
    # CampfireSystem - wrong PhaserUiKit path
    (r'systems\environment\CampfireSystem.js', '"../PhaserUiKit', '"../../ui/PhaserUiKit'),
    # MilestoneBoardSystem - wrong PhaserUiKit path
    (r'systems\visual\MilestoneBoardSystem.js', '"../PhaserUiKit', '"../../ui/PhaserUiKit'),
    # UIMuteToggle - wrong UserSettings path
    (r'ui\hud\UIMuteToggle.js', '"../systems/UserSettings', '"../../systems/UserSettings'),
    # LevelUpPopup - wrong PhaserUiKit path
    (r'ui\overlays\LevelUpPopup.js', '"../PhaserUiKit', '"../ui/PhaserUiKit'),
    # SettingsPanelContent - wrong UserSettings path
    (r'ui\overlays\SettingsPanelContent.js', '"../systems/UserSettings', '"../../systems/UserSettings'),
    # ShopOverlay - wrong UserSettings path
    (r'ui\overlays\ShopOverlay.js', '"../systems/UserSettings', '"../../systems/UserSettings'),
    # UIInventoryPopup - wrong UserSettings path
    (r'ui\overlays\UIInventoryPopup.js', '"../systems/UserSettings', '"../../systems/UserSettings'),
    # MainMenuScene - wrong PhaserUiKit path
    (r'ui\scenes\MainMenuScene.js', '"../PhaserUiKit', '"../ui/PhaserUiKit'),
    # MenuAudioScene - wrong UserSettings path
    (r'ui\scenes\MenuAudioScene.js', '"../systems/UserSettings', '"../../systems/UserSettings'),
    # StartMenuScene - wrong PhaserUiKit path
    (r'ui\scenes\StartMenuScene.js', '"../PhaserUiKit', '"../ui/PhaserUiKit'),
]

for rel, old, new in fixes:
    fp = os.path.join(ROOT, rel)
    if not os.path.exists(fp):
        print('MISSING:', rel)
        continue
    c = open(fp, 'r', encoding='utf-8').read()
    if old in c:
        c = c.replace(old, new)
        open(fp, 'w', encoding='utf-8').write(c)
        print('FIXED:', rel, '|', old, '->', new)
    else:
        print('SKIP (pattern not found):', rel, '| looking for:', old)

print()
print('Done')

