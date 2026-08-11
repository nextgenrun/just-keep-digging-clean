import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { CraftingSystem } from "../systems/crafting/CraftingSystem.js";
import { SurfaceTunnelDoorSystem } from "../systems/environment/SurfaceTunnelDoorSystem.js";
import { V11SkyIslandVisualSystem } from "../systems/environment/V11SkyIslandVisualSystem.js";
import { V11SkyPropSystem } from "../systems/environment/V11SkyPropSystem.js";
import { SpecialTileSystem } from "../systems/mining/SpecialTileSystem.js";
import { resolveJourneyGoals } from "../systems/progression/JourneyGoalResolver.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { ArcCoreVehicleSystem } from "../systems/vehicles/ArcCoreVehicleSystem.js";
import { ScreenRecordSystem } from "../systems/visual/ScreenRecordSystem.js";
import { NPCManager } from "../world/playScene/NPCManager.js";
import { SystemIntroductionSystem } from "../systems/onboarding/SystemIntroductionSystem.js";
import {
  applySecondWorldArea,
} from "../world/secondWorld/SecondWorldGenerator.js";
import { applySecondWorldTown } from "../world/secondWorld/SecondWorldTown.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { CRAFTING_RECIPE_IDS } from "../values/craftingRecipes.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  GAMEPLAY_DEV_FLAGS,
  GAMEPLAY_FEATURE_IDS,
  isDemoModeEnabled,
  isDemoShowcaseSystemFeature,
  isGameplayFeatureEnabled,
  isGameplayKeybindActionEnabled,
  isGameplayLevelEnabled,
  isGameplayUpgradeEnabled,
} from "../values/gameplayDevFlags.js";
import { KEYBIND_ACTIONS, createDefaultKeybinds } from "../values/keybindActions.js";
import {
  RANDOM_EVENT_TYPES,
  RANDOM_WORLD_EVENT_CONFIG,
  resolveRandomEventFlags,
} from "../values/randomWorldEvents.js";
import { SECOND_WORLD_CONFIG } from "../values/secondWorldConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";
import { WORLD_DEPTH_CONFIG } from "../values/worldDepthConfig.js";

assert.equal(GAMEPLAY_DEV_FLAGS.demoMode, true);
assert.equal(isDemoModeEnabled(), true);
assert.equal(GAME_CONFIG.demoMode, true);
assert.equal(GAME_CONFIG.debugMode, false);
assert.equal(GAME_CONFIG.rendererQuality.preserveDrawingBuffer, false);
assert.equal(isDemoShowcaseSystemFeature("campfire"), true);
assert.equal(isDemoShowcaseSystemFeature("constellations"), true);
assert.equal(isDemoShowcaseSystemFeature("caves"), false);
const demoPacing = Object.create(SystemIntroductionSystem.prototype);
demoPacing.demoShowcase = true;
assert.equal(demoPacing.isFeatureAvailable("campfire"), true);
assert.equal(demoPacing.isFeatureAvailable("constellations"), true);

for (const featureId of Object.values(GAMEPLAY_FEATURE_IDS)) {
  assert.equal(isGameplayFeatureEnabled(featureId), false, `${featureId} must be disabled`);
}
assert.equal(isGameplayLevelEnabled(1), true);
assert.equal(isGameplayLevelEnabled(2), false);
assert.equal(isGameplayUpgradeEnabled("worldTwoTunnelAccess"), false);
assert.equal(isGameplayUpgradeEnabled("arcCoreVehicle"), false);
assert.equal(isGameplayUpgradeEnabled("omegaArcCoreVehicle"), false);
assert.equal(isGameplayUpgradeEnabled("gemPowerUnlock"), true);
assert.equal(isGameplayKeybindActionEnabled("arcCoreVehicle"), false);
assert.equal(isGameplayKeybindActionEnabled("screenRecord"), false);

const keybindIds = new Set(KEYBIND_ACTIONS.map(action => action.id));
assert.equal(keybindIds.has("arcCoreVehicle"), false);
assert.equal(keybindIds.has("screenRecord"), false);
assert.equal(Object.hasOwn(createDefaultKeybinds(), "arcCoreVehicle"), false);
assert.equal(Object.hasOwn(createDefaultKeybinds(), "screenRecord"), false);

const upgradeSystem = new UpgradeSystem();
upgradeSystem.setUpgradeLevels({
  worldTwoTunnelAccess: 1,
  arcCoreVehicle: 1,
  omegaArcCoreVehicle: 1,
  gemPowerUnlock: 1,
});
assert.equal(upgradeSystem.getUpgradeLevel("worldTwoTunnelAccess"), 0);
assert.equal(upgradeSystem.getUpgradeLevel("arcCoreVehicle"), 0);
assert.equal(upgradeSystem.getUpgradeLevel("omegaArcCoreVehicle"), 0);
assert.equal(upgradeSystem.getUpgradeLevel("gemPowerUnlock"), 1);
assert.deepEqual(upgradeSystem.getOwnedUpgrades(), ["gemPowerUnlock"]);
assert.equal(upgradeSystem.grantUpgrade("worldTwoTunnelAccess").reason, "gameplay_mode_disabled");
assert.equal(upgradeSystem.grantUpgrade("arcCoreVehicle").reason, "gameplay_mode_disabled");
assert.equal(upgradeSystem.canPurchaseUpgrade("omegaArcCoreVehicle").reason, "gameplay_mode_disabled");
upgradeSystem.setGodMode(true);
assert.equal(upgradeSystem.isGodModeActive(), false);

const abilities = new PlayerAbilities({}, {}, { tileSize: 94 }, upgradeSystem);
abilities.setGodMode(true);
assert.equal(abilities.isGodModeActive(), false);

const craftingSystem = new CraftingSystem();
assert.deepEqual(craftingSystem.getRecipes(), []);
assert.equal(
  craftingSystem.getRecipeStatus(CRAFTING_RECIPE_IDS.ARC_CORE).reason,
  "gameplay_mode_disabled",
);
assert.equal(
  craftingSystem.getRecipeStatus(CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE).reason,
  "gameplay_mode_disabled",
);

const closedDoorTiles = [];
const door = new SurfaceTunnelDoorSystem({
  worldModel: {
    getTileType: () => TILE_TYPES.AIR,
    setTile: (tx, ty, type) => closedDoorTiles.push({ tx, ty, type }),
  },
  worldRenderer: { applyTileUpdate() {} },
});
assert.equal(door.create(), false);
assert.equal(door.isUnlocked(), false);
assert.equal(door.open(), false);
assert.equal(door.sprite, null);
assert.equal(closedDoorTiles.length, door.heightTiles * 2);
assert.equal(closedDoorTiles.every(tile => tile.type === TILE_TYPES.BEDROCK), true);

const arcCore = new ArcCoreVehicleSystem({});
assert.equal(arcCore.enabled, false);
assert.equal(arcCore.visuals, null);
assert.equal(arcCore.create(), false);
assert.equal(arcCore.isUnlocked(), false);
assert.equal(arcCore.isOmegaUnlocked(), false);
assert.deepEqual(arcCore.resolveDigTargets({ tx: 1, ty: 1 }, "RIGHT"), []);

const widthTiles = SECOND_WORLD_CONFIG.runtimeArea.leftTile + 8;
const depthTiles = WORLD_DEPTH_CONFIG.levelOneRuntimeDepthTiles + 2;
const tileCount = widthTiles * depthTiles;
const generatedTypes = new Uint8Array(tileCount);
const boundaryWorld = {
  widthTiles,
  depthTiles,
  skyTileOriginalType: new Uint8Array(tileCount),
  skyTileRarity: new Uint8Array(tileCount),
  skyTileIdentity: new Uint8Array(tileCount),
  inBounds(tx, ty) {
    return tx >= 0 && tx < widthTiles && ty >= 0 && ty < depthTiles;
  },
  index(tx, ty) { return ty * widthTiles + tx; },
  getTileMaxHp() { return 1; },
  setTile(tx, ty, type) { generatedTypes[this.index(tx, ty)] = type; },
};
const exclusion = applySecondWorldArea(boundaryWorld, { enabled: true });
assert.equal(exclusion.excluded, true);
assert.equal(exclusion.reason, "demo-mode");
assert.equal(
  generatedTypes[boundaryWorld.index(SECOND_WORLD_CONFIG.runtimeArea.leftTile, 0)],
  TILE_TYPES.BEDROCK,
);
assert.equal(
  generatedTypes[boundaryWorld.index(0, WORLD_DEPTH_CONFIG.levelOneRuntimeDepthTiles)],
  TILE_TYPES.BEDROCK,
);
assert.equal(applySecondWorldTown(boundaryWorld).excluded, true);

const levelTwoPair = { levelId: 2 };
assert.equal(
  SpecialTileSystem.prototype._hasUnlockedPortalForLevel.call({
    pairedTeleporters: new Map([["132,100", levelTwoPair]]),
  }, 2),
  false,
);
const skyToDungeonMap = new Map();
SpecialTileSystem.prototype._registerSkyTeleporterTiles.call({ skyToDungeonMap }, {
  levelId: 2,
  skyTx: 200,
  skyTy: 20,
}, "132,100");
assert.equal(skyToDungeonMap.size, 0);

let disabledPortalDestroyed = false;
const disabledPortal = { destroy() { disabledPortalDestroyed = true; } };
const portalResult = V11SkyIslandVisualSystem.prototype.setGroundPortalUnlocked.call({
  groundPortalSprites: new Map([[2, disabledPortal]]),
  sprites: [disabledPortal],
}, 2, true);
assert.equal(portalResult, null);
assert.equal(disabledPortalDestroyed, true);

const skyProps = new V11SkyPropSystem({});
assert.equal(
  skyProps.placements.some(item => item.worldRegion === "v11-level-2"),
  false,
);

const npcDefs = NPCManager.prototype._getNPCDefs.call({
  scene: { config: { topAirRows: 65 } },
  ASSET_KEYS,
});
assert.equal(npcDefs.length, TOWN_SQUARE_CONFIG.surfaceMerchantOrder.length);
assert.equal(npcDefs.some(npc => npc.merchantId === "magmaMoneyMonster"), false);

const journeyGoals = resolveJourneyGoals({
  progress: {
    acceptedDepthGates: [100, 300, 1000],
    bestDepth: 1500,
    ownedUpgradeCount: 1,
    portalLabels: ["Level One portal"],
    campfireLevel: 2,
    starsCollected: 0,
  },
});
const disabledGoalIds = new Set([
  "world-two-key",
  "heavenblock-discovery",
  "heavenblock-installation",
  "arc-core-forge",
  "omega-vaults",
  "omega-arc-core",
]);
assert.equal(journeyGoals.some(goal => disabledGoalIds.has(goal.id)), false);

const eventParams = new URLSearchParams();
eventParams.set(RANDOM_WORLD_EVENT_CONFIG.query.debug, "1");
eventParams.set(RANDOM_WORLD_EVENT_CONFIG.query.force, RANDOM_EVENT_TYPES.CRYSTAL_CHOIR);
const randomFlags = resolveRandomEventFlags(`?${eventParams.toString()}`);
assert.equal(randomFlags.debug, false);
assert.equal(randomFlags.forcedType, null);

const recorder = new ScreenRecordSystem({});
assert.equal(recorder.enabled, false);
assert.equal(await recorder.toggle(), false);

const setupSource = await readFile(
  new URL("../world/playScene/PlaySceneSetup.js", import.meta.url),
  "utf8",
);
const worldModelSource = await readFile(
  new URL("../world/model/WorldModel.js", import.meta.url),
  "utf8",
);
const bootSource = await readFile(
  new URL("../ui/scenes/BootScene.js", import.meta.url),
  "utf8",
);
const surfacePropLayerSource = await readFile(
  new URL("../world/rendering/scenic-world/WorldVisualSurfacePropLayer.js", import.meta.url),
  "utf8",
);
assert.match(setupSource, /resolveGameplayWorldBounds/);
assert.match(setupSource, /physics\.world\.setBounds\(0, 0, gameplayWorldBounds\.width, gameplayWorldBounds\.height\)/);
assert.match(setupSource, /cameras\.main\.setBounds\(0, 0, gameplayWorldBounds\.width, gameplayWorldBounds\.height\)/);
assert.match(worldModelSource, /applyGameplayModeBoundaries/);
assert.match(bootSource, /GAMEPLAY_FEATURE_IDS\.ARC_CORES/);
assert.match(bootSource, /GAMEPLAY_FEATURE_IDS\.LEVEL_TWO/);
assert.match(surfacePropLayerSource, /if \(!this\.enabled\[level\]\) continue/);

console.log("Demo mode contract passed");
