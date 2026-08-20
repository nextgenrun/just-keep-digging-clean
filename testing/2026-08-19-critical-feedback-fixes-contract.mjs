import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { CelestialTalentProgressionSystem } from
  "../systems/progression/CelestialTalentProgressionSystem.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";
import {
  GAMEPLAY_DEV_INPUT,
  KEYBIND_STORAGE_VERSION,
  createDefaultKeybinds,
} from "../values/keybindActions.js";

const readSource = relativePath => readFile(new URL(relativePath, import.meta.url), "utf8");

assert.equal(KEYBIND_STORAGE_VERSION, 6);
assert.equal(createDefaultKeybinds().thunderStrike, "V");
assert.deepEqual(GAMEPLAY_DEV_INPUT, {
  godModeKey: "V",
  godModeRequiresShift: true,
});

const [inputSource, actionSource, userSettingsSource, loadCoordinatorSource, registrySource, backdropStageSource] =
  await Promise.all([
    readSource("../world/playScene/GameInputHandler.js"),
    readSource("../world/playScene/ThunderStrikeActionRuntime.js"),
    readSource("../systems/UserSettings.js"),
    readSource("../world/rendering/RuntimeAssetLoadCoordinator.js"),
    readSource("../world/rendering/RuntimeAssetTextureRegistry.js"),
    readSource("../world/rendering/scenic-world/WorldVisualDepthBackdropStage.js"),
  ]);
assert.match(inputSource, /godModeRequiresShift[\s\S]{0,100}keys\.shift\?\.isDown/);
assert.match(actionSource, /_waitForAbilityAssets\(abilities, nowMs\)/);
assert.match(actionSource, /inputBufferedUntilMs = Number\.POSITIVE_INFINITY/);
assert.match(actionSource, /controller\.ensure\?\.\([\s\S]{0,80}"thunderStrike"[\s\S]{0,80}interactive:\s*true/);
assert.match(userSettingsSource, /candidate\.version[\s\S]{0,80}KEYBIND_STORAGE_VERSION[\s\S]{0,120}thunderStrike[\s\S]{0,80}["']C["']/);
assert.match(loadCoordinatorSource, /!record\.asset\.normalMapPath/);
assert.match(loadCoordinatorSource, /record\.asset\.normalMapPath[\s\S]{0,100}phaserLoader\.completeEvent/);
assert.match(registrySource, /\[record\.asset\.path, record\.asset\.normalMapPath\]/);
assert.match(backdropStageSource, /deferTextureRelease:\s*true/);

const [hudSource, hudLayoutSource, approvedHudSource, assetKeysSource, audioConfigSource, soundSource, updateSource] =
  await Promise.all([
    readSource("../systems/visual/HUDSystem.js"),
    readSource("../values/hudLayout.js"),
    readSource("../systems/visual/ApprovedHudSkin.js"),
    readSource("../values/assetKeys.js"),
    readSource("../values/audioConfig.js"),
    readSource("../sound/SoundSystem.js"),
    readSource("../world/playScene/PlaySceneUpdate.js"),
  ]);
assert.doesNotMatch(hudSource, /weatherPanel|weatherText|weatherTemp|weatherSeason|weatherIntensity|LEGACY_WEATHER_ICONS/);
assert.doesNotMatch(hudLayoutSource, /weatherPanel|weatherTemp|weatherSeason|weatherFont|seasonX|seasonY/);
assert.doesNotMatch(approvedHudSource, /WEATHER_TEXTURE_KEYS|setWeatherKind|setWeatherVisible|weatherIcon/);
assert.doesNotMatch(assetKeysSource, /weatherClear|weatherDrizzle|weatherRain|weatherStorm|weatherSnow/);
assert.doesNotMatch(audioConfigSource, /levelUpReward/);
assert.doesNotMatch(soundSource, /playLevelUpReward/);
assert.doesNotMatch(updateSource, /playLevelUpReward/);
assert.match(updateSource, /feature === "abilities"[\s\S]{0,120}isGodModeActive/);

let godMode = false;
const progression = new CelestialTalentProgressionSystem({
  getPlayerLevel: () => 1,
  isGodModeActive: () => godMode,
});
const deepNode = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches.at(-1).nodes.at(-1);
assert.notEqual(deepNode.kind, "ability");
assert.equal(progression.getNodeAvailability(deepNode.id).available, false);
godMode = true;
const availability = progression.getNodeAvailability(deepNode.id);
assert.equal(availability.available, true);
assert.equal(availability.starsCost, 0);
assert.equal(availability.godMode, true);
const purchase = progression.purchaseNode(deepNode.id);
assert.equal(purchase.ok, true);
assert.equal(purchase.starsSpent, 0);
assert.equal(purchase.snapshot.stars, 0);
assert.equal(purchase.snapshot.spentStars, 0);
assert.equal(purchase.snapshot.godMode, true);
progression.destroy();

console.log("2026-08-19 critical feedback fixes contract: ok");
