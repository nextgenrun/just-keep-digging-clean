#!/usr/bin/env python3
"""
Bulk migration script: reads old files from dig-game-dev-env/js/
and writes them to dig-game-dev-env-cleaned/ with corrected import paths.
"""
import os, re, shutil

OLD_BASE = os.path.join(os.path.dirname(__file__), "..", "dig-game-dev-env", "js")
NEW_BASE = os.path.dirname(__file__)

# Map old file paths to new file paths and path fix rules
# (old_relative, new_relative, [(old_import_pattern, new_import_pattern), ...])
MIGRATIONS = [
    # === PROGRESSION ===
    ("systems/progression/UpgradeSystem.js", "systems/progression/UpgradeSystem.js", [
        ('"../config/upgrades/upgradeFormulas.js"', '"../../values/upgradeFormulas.js"'),
        ('"../config/gem-power/gemVision.js"', '"../../values/gemVision.js"'),
    ]),
    ("systems/progression/DepthGateSystem.js", "systems/progression/DepthGateSystem.js", [
        ('"../config/ui/uiColors.js"', '"../../values/uiColors.js"'),
    ]),
    
    # === COMBO ===
    ("systems/combo/ComboSystem.js", "systems/combo/ComboSystem.js", [
        ('"../config/combo/comboConfig.js"', '"../../values/comboConfig.js"'),
    ]),
    ("systems/combo/HitstopSystem.js", "systems/combo/HitstopSystem.js", []),
    
    # === USER SETTINGS ===
    ("systems/UserSettings.js", "systems/UserSettings.js", []),
    
    # === VISUAL SYSTEMS ===
    ("systems/visual/FloatingTextSystem.js", "systems/visual/FloatingTextSystem.js", []),
    ("systems/visual/CameraShakeSystem.js", "systems/visual/CameraShakeSystem.js", []),
    ("systems/visual/ScreenFlashSystem.js", "systems/visual/ScreenFlashSystem.js", []),
    ("systems/visual/PickaxeTrailSystem.js", "systems/visual/PickaxeTrailSystem.js", []),
    ("systems/visual/ClimbTrailSystem.js", "systems/visual/ClimbTrailSystem.js", []),
    ("systems/visual/StarPillarSystem.js", "systems/visual/StarPillarSystem.js", [
        ('"./UserSettings.js"', '"../UserSettings.js"'),
    ]),
    ("systems/visual/MilestoneBoardSystem.js", "systems/visual/MilestoneBoardSystem.js", [
        ('"./UserSettings.js"', '"../UserSettings.js"'),
    ]),
    
    # === AUDIO SYSTEMS ===
    ("systems/audio/SoundLibraryManager.js", "systems/audio/SoundLibraryManager.js", []),
    ("systems/audio/VoiceLineManager.js", "systems/audio/VoiceLineManager.js", []),
    ("systems/audio/SoundSystem.js", "systems/audio/SoundSystem.js", []),
    
    # === ENVIRONMENT SYSTEMS ===
    ("systems/environment/DayNightCycle.js", "systems/environment/DayNightCycle.js", []),
    ("systems/environment/WeatherSystem.js", "systems/environment/WeatherSystem.js", []),
    ("systems/environment/AtmosphereSystem.js", "systems/environment/AtmosphereSystem.js", []),
    ("systems/environment/BiomeSystem.js", "systems/environment/BiomeSystem.js", []),
    ("systems/environment/CampfireSystem.js", "systems/environment/CampfireSystem.js", [
        ('"./UserSettings.js"', '"../UserSettings.js"'),
    ]),
    ("systems/environment/SurfaceTunnelDoorSystem.js", "systems/environment/SurfaceTunnelDoorSystem.js", []),
    ("systems/environment/EarthquakeSystem.js", "systems/environment/EarthquakeSystem.js", []),
    ("systems/environment/AboveGroundDecorationSystem.js", "systems/environment/AboveGroundDecorationSystem.js", []),
    
    # === LIGHTING SYSTEMS ===
    ("systems/lighting/LightSystem.js", "systems/lighting/LightSystem.js", []),
    ("systems/lighting/ShaderSystem.js", "systems/lighting/ShaderSystem.js", []),
    
    # === PLAYER ===
    ("player/PlayerController.js", "player/PlayerController.js", [
        ('"../values/core/gameConfig.js"', '"../values/gameConfig.js"'),
        ('"../values/player/playerStats.js"', '"../values/playerStats.js"'),
    ]),
    ("player/PlayerPhysicsBody.js", "player/PlayerPhysicsBody.js", [
        ('"../../config/core/gameConfig.js"', '"../values/gameConfig.js"'),
    ]),
    
    # === PLAYER SUBSYSTEM (player/player/*) ===
    ("player/player/PlayerInput.js", "player/player/PlayerInput.js", [
        ('"../../config/', '"../values/'),
        ('"../../values/player/playerStats.js"', '"../values/playerStats.js"'),
    ]),
    ("player/player/PlayerMovement.js", "player/player/PlayerMovement.js", [
        ('"../../config/', '"../values/'),
    ]),
    ("player/player/PlayerAbilities.js", "player/player/PlayerAbilities.js", [
        ('"../../values/player/playerStats.js"', '"../values/playerStats.js"'),
        ('"../../config/', '"../values/'),
        ('"../../systems/UserSettings.js"', '"../systems/UserSettings.js"'),
    ]),
    ("player/player/PlayerState.js", "player/player/PlayerState.js", []),
    
    # === SHADOW MINER ===
    ("player/ShadowMiner/ShadowMinerSystem.js", "player/ShadowMiner/ShadowMinerSystem.js", [
        ('"../../config/', '"../../values/'),
    ]),
    ("player/ShadowMiner/ShadowMinerPhysicsBody.js", "player/ShadowMiner/ShadowMinerPhysicsBody.js", []),
    
    # === WORLD MODEL ===
    ("world/model/WelcomeMessageGenerator.js", "world/model/WelcomeMessageGenerator.js", []),
    
    # === WORLD PLAYSCENE ===
    ("world/playScene/BackgroundRenderer.js", "world/playScene/BackgroundRenderer.js", []),
    ("world/playScene/GameInputHandler.js", "world/playScene/GameInputHandler.js", [
        ('"../../values/constants.js"', '"../../values/gameConfig.js"'),
    ]),
    ("world/playScene/NPCManager.js", "world/playScene/NPCManager.js", [
        ('"../../config/', '"../../values/'),
    ]),
    ("world/playScene/OverlayManager.js", "world/playScene/OverlayManager.js", []),
    ("world/playScene/PlayerInputHandler.js", "world/playScene/PlayerInputHandler.js", [
        ('"../../values/constants.js"', '"../../values/gameConfig.js"'),
    ]),
    ("world/playScene/PlaySceneSetup.js", "world/playScene/PlaySceneSetup.js", [
        ('"../../values/constants.js"', '"../../values/gameConfig.js"'),
        ('"../model/WelcomeMessageGenerator.js"', '"../model/WelcomeMessageGenerator.js"'),
        # Also fix ../values/player/... style paths
        ('"../values/', '"../../values/'),
        # Fix ./PlayerInputHandler.js etc from world/playScene/
        ('"./PlayerInputHandler.js"', '"./PlayerInputHandler.js"'),
    ]),
    ("world/playScene/PlaySceneUI.js", "world/playScene/PlaySceneUI.js", [
        ('"../systems/save-system/WelcomeMessageGenerator.js"', '"../model/WelcomeMessageGenerator.js"'),
        ('"../../values/ui/uiConfig.js"', '"../../values/uiConfig.js"'),
        ('"../../values/ui/uiColors.js"', '"../../values/uiColors.js"'),
        ('"../ui/PhaserUiKit.js"', '"../../ui/PhaserUiKit.js"'),
        ('"../ui/SettingsPanelContent.js"', '"../../ui/overlays/SettingsPanelContent.js"'),
        ('"../../systems/UserSettings.js"', '"../../systems/UserSettings.js"'),
    ]),
    ("world/playScene/PlaySceneGameplay.js", "world/playScene/PlaySceneGameplay.js", [
        ('"../../values/core/tileTypes.js"', '"../../values/tileTypes.js"'),
        ('"../../values/mining/miningConfig.js"', '"../../values/miningConfig.js"'),
        ('"../../values/ui/uiConfig.js"', '"../../values/uiConfig.js"'),
    ]),
    ("world/playScene/PlaySceneUpdate.js", "world/playScene/PlaySceneUpdate.js", [
        ('"../../values/ui/uiConfig.js"', '"../../values/uiConfig.js"'),
    ]),
    
    # === WORLD RENDERING ===
    ("world/rendering/WorldRenderer.js", "world/rendering/WorldRenderer.js", []),
    
    # === UI ===
    ("ui/GeneratedHudTextures.js", "ui/GeneratedHudTextures.js", [
        ('"../values/', '"../values/'),
    ]),
    ("ui/PhaserUiKit.js", "ui/PhaserUiKit.js", []),
    ("ui/UINotificationSystem.js", "ui/UINotificationSystem.js", [
        ('"../values/', '"../values/'),
    ]),
]

# UI overlay/hud/scene files - straightforward copy with import fix
UI_MIGRATIONS = [
    ("ui/hud/UIMuteToggle.js", "ui/hud/UIMuteToggle.js"),
    ("ui/hud/UIResourceBar.js", "ui/hud/UIResourceBar.js"),
    ("ui/hud/XPProgressBar.js", "ui/hud/XPProgressBar.js"),
    ("ui/overlays/LevelUpPopup.js", "ui/overlays/LevelUpPopup.js"),
    ("ui/overlays/SettingsPanelContent.js", "ui/overlays/SettingsPanelContent.js"),
    ("ui/overlays/ShopOverlay.js", "ui/overlays/ShopOverlay.js"),
    ("ui/overlays/UIInventoryPopup.js", "ui/overlays/UIInventoryPopup.js"),
    ("ui/scenes/BootScene.js", "ui/scenes/BootScene.js"),
    ("ui/scenes/MainMenuScene.js", "ui/scenes/MainMenuScene.js"),
    ("ui/scenes/MenuAudioScene.js", "ui/scenes/MenuAudioScene.js"),
    ("ui/scenes/StartMenuScene.js", "ui/scenes/StartMenuScene.js"),
    ("ui/scenes/WorldLoadScene.js", "ui/scenes/WorldLoadScene.js"),
]

def fix_imports(content, fixes):
    """Apply import path fixes."""
    for old_pattern, new_pattern in fixes:
        content = content.replace(old_pattern, new_pattern)
    return content

def fix_generic_imports(content, old_base_path="../../config/", new_base_path="../../values/"):
    """Fix any remaining config/ imports to values/ imports."""
    content = re.sub(r'"\.\./\.\./config/', '"../../values/', content)
    content = re.sub(r'"\.\./config/', '"../../values/', content)
    # Fix player/ paths relative to player/ 
    content = re.sub(r'"\.\./values/player/', '"../values/', content)
    # Fix any ../config/ references from specific depths
    content = re.sub(r'"\.\./\.\./config/', '"../../values/', content)
    return content

def migrate_file(old_rel, new_rel, fixes=None):
    """Copy a file from old to new with import fixes."""
    old_path = os.path.join(OLD_BASE, old_rel)
    new_path = os.path.join(NEW_BASE, new_rel)
    
    if not os.path.exists(old_path):
        print(f"  SKIP (not found): {old_path}")
        return False
    
    os.makedirs(os.path.dirname(new_path), exist_ok=True)
    
    with open(old_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    if fixes:
        content = fix_imports(content, fixes)
    
    # Apply generic fixes
    content = fix_generic_imports(content)
    
    with open(new_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"  OK: {old_rel} -> {new_rel}")
    return True

def main():
    print("=== Starting bulk migration ===")
    count = 0
    
    for old_rel, new_rel, fixes in MIGRATIONS:
        if migrate_file(old_rel, new_rel, fixes):
            count += 1
    
    for old_rel, new_rel in UI_MIGRATIONS:
        if migrate_file(old_rel, new_rel, []):
            count += 1
    
    print(f"\n=== Migration complete: {count} files written ===")

if __name__ == "__main__":
    main()