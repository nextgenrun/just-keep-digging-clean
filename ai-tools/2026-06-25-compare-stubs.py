"""
Compare cleaned files vs backup to find stubs.
Checks line counts and critical method presence.
Prints summary. Copies full versions from backup if stubs found.
"""
import shutil, re
from pathlib import Path

ROOT = Path(r"c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned")
BACKUP = Path(r"c:\xampp\_Backups\dig-game-simple\back-ups-dig-game\25-06-2026-semistable-restore")

# Map of cleaned paths -> backup paths
# Backup used js/systems/ and js/scenes/PlayScene/
pairs = [
    # Player subsystem files
    ("player/PlayerInput.js",                  "js/systems/player/PlayerInput.js"),
    ("player/PlayerState.js",                  "js/systems/player/PlayerState.js"),
    ("player/PhysicsBody.js",                  "js/systems/PlayerPhysicsBody.js"),
    ("player/PlayerPhysicsBody.js",            "js/systems/PlayerPhysicsBody.js"),
    ("player/PlayerController.js",             "js/systems/PlayerController.js"),
    ("player/PlayerAbilities.js",              "js/systems/player/PlayerAbilities.js"),
    ("player/PlayerMovement.js",               "js/systems/player/PlayerMovement.js"),
    ("player/TileCollisionSystem.js",          "js/systems/TileCollisionSystem.js"),
    # World/PlayScene subsystem
    ("world/playScene/GameInputHandler.js",    "js/scenes/PlayScene/GameInputHandler.js"),
    ("world/playScene/PlayerInputHandler.js",  "js/scenes/PlayScene/PlayerInputHandler.js"),
    ("world/playScene/BackgroundRenderer.js",  "js/scenes/PlayScene/BackgroundRenderer.js"),
    ("world/playScene/NPCManager.js",          "js/scenes/PlayScene/NPCManager.js"),
    ("world/playScene/OverlayManager.js",      "js/scenes/PlayScene/OverlayManager.js"),
    # Systems that might be stubs
    ("systems/environment/EarthquakeSystem.js", "js/systems/EarthquakeSystem.js"),
]

results = []
copied = []

for clean_rel, backup_rel in pairs:
    clean_path = ROOT / clean_rel
    backup_path = BACKUP / backup_rel
    
    cf = clean_path.exists()
    bf = backup_path.exists()
    
    clean_lines = len(clean_path.read_text(encoding="utf-8").splitlines()) if cf else 0
    backup_lines = len(backup_path.read_text(encoding="utf-8").splitlines()) if bf else 0
    
    is_stub = (clean_lines < backup_lines * 0.5) if (cf and bf) else (not cf)
    
    results.append({
        "file": clean_rel,
        "clean_lines": clean_lines,
        "backup_lines": backup_lines,
        "is_stub": is_stub,
        "missing": not cf,
    })
    
    print(f"{clean_rel}: {clean_lines}L (clean) vs {backup_lines}L (backup) -> {'STUB!' if is_stub else 'OK'}")

print("\n" + "=" * 60)
print("REPLACING STUBS:")
print("=" * 60)

# Auto-replace stubs with backup versions
IMPORT_FIXES = [
    # Common path rewrites
    (r'["\']\.\./config/[^"\']*assetKeys\.js["\']',   '"../../values/assetKeys.js"'),
    (r'["\']\.\./config/core/tileTypes\.js["\']',      '"../../values/tileTypes.js"'),
    (r'["\']\.\./config/core/gameConfig\.js["\']',     '"../../values/gameConfig.js"'),
    (r'["\']\.\./config/player/playerStats\.js["\']',   '"../../values/playerStats.js"'),
    (r'["\']\.\./config/player/playerAbilities\.js["\']', '"../../values/playerAbilities.js"'),
    (r'["\']\.\./config/ui/hudLayout\.js["\']',         '"../../values/hudLayout.js"'),
    (r'["\']\.\./config/ui/uiColors\.js["\']',          '"../../values/uiColors.js"'),
    (r'["\']\.\./config/ui/uiConfig\.js["\']',          '"../../values/uiConfig.js"'),
    (r'["\']\.\./config/mining/miningConfig\.js["\']',  '"../../values/miningConfig.js"'),
    (r'["\']\.\./config/combo/comboConfig\.js["\']',    '"../../values/comboConfig.js"'),
    (r'["\']\.\./config/world/tileHealth\.js["\']',     '"../../values/tileHealth.js"'),
    (r'["\']\.\./config/world/dynamicSoil\.js["\']',    '"../../values/dynamicSoil.js"'),
    (r'["\']\.\./config/world/tileRender\.js["\']',     '"../../values/tileRender.js"'),
    (r'["\']\.\./config/world/worldGen\.js["\']',       '"../../values/worldGen.js"'),
    (r'["\']\.\./config/gamefeel/gamefeel\.js["\']',    '"../../values/gamefeel.js"'),
    (r'["\']\.\./config/gamefeel/cameraShake\.js["\']', '"../../values/cameraShake.js"'),
    (r'["\']\.\./config/input/keybindActions\.js["\']', '"../../values/keybindActions.js"'),
    (r'["\']\.\./config/audio/audioConfig\.js["\']',    '"../../values/audioConfig.js"'),
    (r'["\']\.\./config/resources/resourceSpawn\.js["\']', '"../../values/resourceSpawn.js"'),
    (r'["\']\.\./config/resources/resourcePrices\.js["\']', '"../../values/resourcePrices.js"'),
    (r'["\']\.\./config/upgrades/upgradeCategories\.js["\']', '"../../values/upgradeCategories.js"'),
    (r'["\']\.\./config/upgrades/upgradeDefinitions\.js["\']', '"../../values/upgradeDefinitions.js"'),
    (r'["\']\.\./config/upgrades/upgradeFormulas\.js["\']', '"../../values/upgradeFormulas.js"'),
    (r'["\']\.\./config/lighting/lightConfig\.js["\']', '"../../values/lightConfig.js"'),
    (r'["\']\.\./config/shaders/shaderConfig\.js["\']', '"../../values/shaderConfig.js"'),
    (r'["\']\.\./config/resources/specialBlocks\.js["\']', '"../../values/specialBlocks.js"'),
    (r'["\']\.\./config/progression/depthMilestones\.js["\']', '"../../values/depthMilestones.js"'),
    (r'["\']\.\./config/abilities/constellationBuffs\.js["\']', '"../../values/constellationBuffs.js"'),
    (r'["\']\.\./config/gem-power/gemPower\.js["\']', '"../../values/gemPower.js"'),
    (r'["\']\.\./config/gem-power/gemDash\.js["\']', '"../../values/gemDash.js"'),
    (r'["\']\.\./config/gem-power/gemVision\.js["\']', '"../../values/gemVision.js"'),
    (r'["\']\.\./config/leveling/levelConfig\.js["\']', '"../../values/levelConfig.js"'),
    (r'["\']\.\./config/shadowMiner/shadowMinerConfig\.js["\']', '"../../values/shadowMinerConfig.js"'),
    (r'["\']\.\./config/weather/weatherConfig\.js["\']', '"../../values/weatherConfig.js"'),
    (r'["\']\.\./config/time/timeConfig\.js["\']', '"../../values/timeConfig.js"'),
    (r'["\']\.\./config/merchants/[^"\']+\.js["\']', 'NO_MATCH'),  # handled case by case
    # System internal references
    (r'from\s+["\']\.\./systems/UserSettings\.js["\']', 'from "../UserSettings.js"'),
    (r'from\s+["\']\.\./ui/PhaserUiKit\.js["\']', 'from "../ui/PhaserUiKit.js"'),
    (r'from\s+["\']\.\./ui/GeneratedHudTextures\.js["\']', 'from "../ui/GeneratedHudTextures.js"'),
]

def fix_imports_in_content(content, file_rel):
    """Replace old config/ paths with cleaned values/ paths"""
    parts = Path(file_rel).parts
    depth_prefix = "/".join([".."] * (len(parts) - 1))
    
    fixed = content
    # Simple bulk replacement approach
    fixed = fixed.replace('"../config/assetKeys.js"', '"../../values/assetKeys.js"')
    fixed = fixed.replace('"../../config/assetKeys.js"', '"../../values/assetKeys.js"')
    fixed = fixed.replace('"../../config/core/tileTypes.js"', '"../../values/tileTypes.js"')
    fixed = fixed.replace('"./config/core/tileTypes.js"', '"./values/tileTypes.js"')
    fixed = fixed.replace('"../config/core/tileTypes.js"', '"../values/tileTypes.js"')
    fixed = fixed.replace('"../../../config/core/tileTypes.js"', '"../../../values/tileTypes.js"')
    fixed = fixed.replace('"../config/core/gameConfig.js"', '"../values/gameConfig.js"')
    fixed = fixed.replace('"../../config/core/gameConfig.js"', '"../../values/gameConfig.js"')
    fixed = fixed.replace('"../config/player/playerStats.js"', '"../values/playerStats.js"')
    fixed = fixed.replace('"../../config/player/playerStats.js"', '"../../values/playerStats.js"')
    fixed = fixed.replace('"../config/player/playerAbilities.js"', '"../values/playerAbilities.js"')
    fixed = fixed.replace('"../../config/player/playerAbilities.js"', '"../../values/playerAbilities.js"')
    fixed = fixed.replace('"../config/player/playerCharacters.js"', '"../values/playerCharacters.js"')
    fixed = fixed.replace('"../../config/player/playerCharacters.js"', '"../../values/playerCharacters.js"')
    fixed = fixed.replace('"../config/player/playerAssetProfiles.js"', '"../values/playerAssetProfiles.js"')
    fixed = fixed.replace('"../../config/player/playerAssetProfiles.js"', '"../../values/playerAssetProfiles.js"')
    fixed = fixed.replace('"../config/ui/hudLayout.js"', '"../values/hudLayout.js"')
    fixed = fixed.replace('"../../config/ui/hudLayout.js"', '"../../values/hudLayout.js"')
    fixed = fixed.replace('"../config/ui/uiColors.js"', '"../values/uiColors.js"')
    fixed = fixed.replace('"../../config/ui/uiColors.js"', '"../../values/uiColors.js"')
    fixed = fixed.replace('"../config/ui/uiConfig.js"', '"../values/uiConfig.js"')
    fixed = fixed.replace('"../config/mining/miningConfig.js"', '"../values/miningConfig.js"')
    fixed = fixed.replace('"../../config/mining/miningConfig.js"', '"../../values/miningConfig.js"')
    fixed = fixed.replace('"../config/combo/comboConfig.js"', '"../values/comboConfig.js"')
    fixed = fixed.replace('"../config/world/dynamicSoil.js"', '"../values/dynamicSoil.js"')
    fixed = fixed.replace('"../../config/world/dynamicSoil.js"', '"../../values/dynamicSoil.js"')
    fixed = fixed.replace('"../config/world/tileHealth.js"', '"../values/tileHealth.js"')
    fixed = fixed.replace('"../../config/world/tileHealth.js"', '"../../values/tileHealth.js"')
    fixed = fixed.replace('"../config/world/tileRender.js"', '"../values/tileRender.js"')
    fixed = fixed.replace('"../../config/world/tileRender.js"', '"../../values/tileRender.js"')
    fixed = fixed.replace('"../config/world/worldGen.js"', '"../values/worldGen.js"')
    fixed = fixed.replace('"../../config/world/worldGen.js"', '"../../values/worldGen.js"')
    fixed = fixed.replace('"../config/gamefeel/gamefeel.js"', '"../values/gamefeel.js"')
    fixed = fixed.replace('"../config/gamefeel/cameraShake.js"', '"../values/cameraShake.js"')
    fixed = fixed.replace('"../config/input/keybindActions.js"', '"../values/keybindActions.js"')
    fixed = fixed.replace('"../config/audio/audioConfig.js"', '"../values/audioConfig.js"')
    fixed = fixed.replace('"../config/resources/resourceSpawn.js"', '"../values/resourceSpawn.js"')
    fixed = fixed.replace('"../config/resources/resourcePrices.js"', '"../values/resourcePrices.js"')
    fixed = fixed.replace('"../config/resources/resourceRarity.js"', '"../values/resourceRarity.js"')
    fixed = fixed.replace('"../config/upgrades/upgradeCategories.js"', '"../values/upgradeCategories.js"')
    fixed = fixed.replace('"../config/upgrades/upgradeDefinitions.js"', '"../values/upgradeDefinitions.js"')
    fixed = fixed.replace('"../config/upgrades/upgradeFormulas.js"', '"../values/upgradeFormulas.js"')
    fixed = fixed.replace('"../config/lighting/lightConfig.js"', '"../values/lightConfig.js"')
    fixed = fixed.replace('"../config/shaders/shaderConfig.js"', '"../values/shaderConfig.js"')
    fixed = fixed.replace('"../config/resources/specialBlocks.js"', '"../values/specialBlocks.js"')
    fixed = fixed.replace('"../config/progression/depthMilestones.js"', '"../values/depthMilestones.js"')
    fixed = fixed.replace('"../config/abilities/constellationBuffs.js"', '"../values/constellationBuffs.js"')
    fixed = fixed.replace('"../config/gem-power/gemPower.js"', '"../values/gemPower.js"')
    fixed = fixed.replace('"../config/gem-power/gemDash.js"', '"../values/gemDash.js"')
    fixed = fixed.replace('"../config/gem-power/gemVision.js"', '"../values/gemVision.js"')
    fixed = fixed.replace('"../config/leveling/levelConfig.js"', '"../values/levelConfig.js"')
    fixed = fixed.replace('"../config/shadowMiner/shadowMinerConfig.js"', '"../values/shadowMinerConfig.js"')
    fixed = fixed.replace('"../config/weather/weatherConfig.js"', '"../values/weatherConfig.js"')
    fixed = fixed.replace('"../config/time/timeConfig.js"', '"../values/timeConfig.js"')
    # Player system references
    fixed = fixed.replace('"./PlayerInput.js"', '"./PlayerInput.js"')  # keep
    fixed = fixed.replace('"../systems/player/PlayerInput.js"', '"./PlayerInput.js"')
    fixed = fixed.replace('"../systems/player/PlayerMovement.js"', '"./PlayerMovement.js"')
    fixed = fixed.replace('"../systems/player/PlayerAbilities.js"', '"./PlayerAbilities.js"')
    fixed = fixed.replace('"../systems/player/PlayerState.js"', '"./PlayerState.js"')
    fixed = fixed.replace('"../systems/PlayerPhysicsBody.js"', '"../player/PlayerPhysicsBody.js"')
    fixed = fixed.replace('"../systems/TileCollisionSystem.js"', '"../player/TileCollisionSystem.js"')
    # Specific player references from systems context
    fixed = fixed.replace('"./UserSettings.js"', '"../UserSettings.js"')
    
    return fixed

for r in results:
    if not r["is_stub"]:
        continue
    
    clean_path = ROOT / r["file"]
    backup_path = BACKUP / backup_rel_for(r["file"])
    
    if not backup_path.exists():
        print(f"  SKIP: {r['file']} - backup not found at {backup_path}")
        continue
    
    content = backup_path.read_text(encoding="utf-8")
    fixed_content = fix_imports_in_content(content, r["file"])
    
    clean_path.parent.mkdir(parents=True, exist_ok=True)
    clean_path.write_text(fixed_content, encoding="utf-8")
    print(f"  REPLACED: {r['file']} ({r['clean_lines']}L -> {len(fixed_content.splitlines())}L)")
    copied.append(r["file"])

def backup_rel_for(clean_rel):
    for c, b in pairs:
        if c == clean_rel:
            return b
    return None

print(f"\nReplaced {len(copied)} stub files")