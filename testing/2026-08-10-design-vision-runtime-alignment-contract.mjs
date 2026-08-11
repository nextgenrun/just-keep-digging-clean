import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import {
  HARDCORE_MODE_CONFIG,
  consumeHardcoreDeath,
  createHardcoreModeData,
  resolveHardcoreModeFromSearch,
  sanitizeHardcoreModeData,
} from "../values/hardcoreMode.js";
import {
  OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
  OPENING_FLIGHT_TUTORIAL_CHOICES,
  createOpeningFlightTutorialData,
  shouldUseOpeningFlightGoldenSpawn,
} from "../values/openingFlightArtifact.js";
import { FIRST_SESSION_ROUTE_CONFIG } from "../values/firstSessionRoute.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { FirstSessionPortalSystem } from "../systems/onboarding/FirstSessionPortalSystem.js";
import { OpeningFlightTownExitBarrierSystem } from "../systems/onboarding/OpeningFlightTownExitBarrierSystem.js";

const hardcoreStart = createHardcoreModeData(HARDCORE_MODE_CONFIG.modes.hardcore);
assert.equal(hardcoreStart.livesRemaining, 2);
assert.equal(hardcoreStart.freeReviveAvailable, true);
assert.equal(hardcoreStart.armed, true);

const firstHardcoreDeath = consumeHardcoreDeath(hardcoreStart);
assert.equal(firstHardcoreDeath.outcome, "free-revive");
assert.equal(firstHardcoreDeath.livesRemaining, 2);
assert.equal(firstHardcoreDeath.data.freeReviveAvailable, false);
const secondHardcoreDeath = consumeHardcoreDeath(firstHardcoreDeath.data);
assert.equal(secondHardcoreDeath.outcome, "life-lost");
assert.equal(secondHardcoreDeath.livesRemaining, 1);
const finalHardcoreDeath = consumeHardcoreDeath(secondHardcoreDeath.data);
assert.equal(finalHardcoreDeath.outcome, "exhausted");
assert.equal(finalHardcoreDeath.livesRemaining, 0);
assert.equal(finalHardcoreDeath.data.armed, false);

const oneLifeDeath = consumeHardcoreDeath(
  createHardcoreModeData(HARDCORE_MODE_CONFIG.modes.oneLifeHardcore),
);
assert.equal(oneLifeDeath.outcome, "exhausted");
assert.equal(oneLifeDeath.data.deaths, 1);
assert.equal(resolveHardcoreModeFromSearch("?runMode=one-life-hardcore"), "one-life-hardcore");
assert.equal(consumeHardcoreDeath(null).outcome, "casual");
assert.equal(
  sanitizeHardcoreModeData({ mode: "casual", armed: true }).mode,
  HARDCORE_MODE_CONFIG.modes.hardcore,
  "legacy armed saves must retain Hardcore admission",
);

const guidedOpening = createOpeningFlightTutorialData(
  OPENING_FLIGHT_TUTORIAL_CHOICES.guided,
);
assert.equal(guidedOpening.tutorialChoice, "guided");
assert.equal(guidedOpening.onboardingComplete, false);
assert.equal(
  shouldUseOpeningFlightGoldenSpawn(
    { openingFlightArtifactData: guidedOpening },
    OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
    "",
  ),
  true,
);

const skippedOpening = createOpeningFlightTutorialData(
  OPENING_FLIGHT_TUTORIAL_CHOICES.skip,
);
assert.equal(skippedOpening.tutorialChoice, "skip");
assert.equal(skippedOpening.artifactCollected, true);
assert.equal(skippedOpening.cacheCollected, true);
assert.equal(skippedOpening.rewardGranted, true);
assert.equal(skippedOpening.onboardingComplete, true);
assert.equal(skippedOpening.trialRemainingMs, 0);
assert.equal(
  shouldUseOpeningFlightGoldenSpawn(
    { openingFlightArtifactData: skippedOpening },
    OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
    "",
  ),
  false,
);

function createWorldFixture() {
  const cells = new Map();
  const hp = new Map();
  const dugTileSource = new Map([["12,80", { type: TILE_TYPES.DIRT }]]);
  const updates = [];
  const worldModel = {
    config: { topAirRows: 65 },
    dugTileSource,
    inBounds: (tx, ty) => tx >= 0 && tx < 280 && ty >= 0 && ty < 5065,
    getTileType: (tx, ty) => cells.get(`${tx},${ty}`) ?? TILE_TYPES.AIR,
    getTileHp: (tx, ty) => hp.get(`${tx},${ty}`) ?? 0,
    getTileMaxHp: () => 999999999,
    setTile(tx, ty, type, tileHp = 0) {
      cells.set(`${tx},${ty}`, type);
      hp.set(`${tx},${ty}`, tileHp);
    },
  };
  return {
    cells,
    hp,
    updates,
    worldModel,
    scene: {
      worldModel,
      worldRenderer: { applyTileUpdate: (tx, ty) => updates.push(`${tx},${ty}`) },
      specialTileSystem: { getActivatedPortals: () => [] },
    },
  };
}

const portalFixture = createWorldFixture();
portalFixture.worldModel.setTile(12, 80, TILE_TYPES.DIRT, 5);
const portalSystem = new FirstSessionPortalSystem(portalFixture.scene);
const portalResult = portalSystem.create();
assert.deepEqual(portalResult.tile, { tx: 12, ty: 80 });
assert.equal(portalFixture.cells.get("12,80"), TILE_TYPES.TELEPORT_TILE);
assert.equal(portalFixture.worldModel.dugTileSource.has("12,80"), false);
assert.deepEqual(portalFixture.updates, ["12,80"]);
portalFixture.worldModel.setTile(12, 80, TILE_TYPES.AIR, 0);
portalSystem.update(FIRST_SESSION_ROUTE_CONFIG.starterPortal.protectIntervalMs);
assert.equal(
  portalFixture.cells.get("12,80"),
  TILE_TYPES.TELEPORT_TILE,
  "the universal portal must self-heal",
);

const barrierFixture = createWorldFixture();
const opening = { state: guidedOpening };
const barrier = new OpeningFlightTownExitBarrierSystem(barrierFixture.scene, opening);
barrier.create();
for (const ty of [62, 63, 64]) {
  assert.equal(barrierFixture.cells.get(`66,${ty}`), TILE_TYPES.BEDROCK);
}
barrierFixture.worldModel.setTile(66, 63, TILE_TYPES.AIR, 0);
barrier.update();
assert.equal(
  barrierFixture.cells.get("66,63"),
  TILE_TYPES.BEDROCK,
  "guided containment must self-heal before the ascent is proven",
);
opening.state.surfaceReturnCelebrated = true;
barrier.update();
for (const ty of [62, 63, 64]) {
  assert.equal(barrierFixture.cells.get(`66,${ty}`), TILE_TYPES.AIR);
}
assert.equal(barrier.getHealth().installed, false);

const skipBarrierFixture = createWorldFixture();
const skipBarrier = new OpeningFlightTownExitBarrierSystem(
  skipBarrierFixture.scene,
  { state: skippedOpening },
);
skipBarrier.create();
assert.equal(skipBarrier.getHealth().installed, false);

const sources = Object.fromEntries(await Promise.all([
  "../ui/components/NewRunSetupPanel.js",
  "../ui/scenes/StartMenuScene.js",
  "../ui/scenes/WorldLoadScene.js",
  "../world/playScene/PlaySceneSetup.js",
  "../world/playScene/PlaySceneUpdate.js",
  "../world/playScene/PlayerInputHandler.js",
  "../player/PlayerInput.js",
  "../systems/visual/HUDSystem.js",
  "../world/playScene/PlaySceneUI.js",
  "../world/playScene/GameInputHandler.js",
].map(async (path) => [path, await readFile(new URL(path, import.meta.url), "utf8")])));

assert.match(sources["../ui/components/NewRunSetupPanel.js"], /TYPE YES TO CONFIRM TUTORIAL SKIP/);
assert.match(sources["../ui/components/NewRunSetupPanel.js"], /ASSET_KEYS\.ui\.approvedHud\.worldState/);
assert.doesNotMatch(sources["../ui/components/NewRunSetupPanel.js"], /add\.graphics|add\.rectangle/);
assert.match(sources["../ui/scenes/StartMenuScene.js"], /createOpeningFlightTutorialData/);
assert.match(sources["../ui/scenes/WorldLoadScene.js"], /\.\.\.newRunData/);
assert.match(sources["../world/playScene/PlaySceneSetup.js"], /FirstSessionPortalSystem/);
assert.match(sources["../world/playScene/PlaySceneSetup.js"], /OpeningFlightTownExitBarrierSystem/);
assert.match(sources["../world/playScene/PlaySceneUpdate.js"], /firstSessionPortalSystem\?\.update/);
assert.match(sources["../world/playScene/PlayerInputHandler.js"], /KeyCodes\.LEFT/);
assert.match(sources["../world/playScene/PlayerInputHandler.js"], /KeyCodes\.SPACE/);
assert.match(sources["../player/PlayerInput.js"], /spaceMine\?\.isDown/);
assert.match(sources["../systems/visual/HUDSystem.js"], /uiInventoryPopup\?\.toggle/);
assert.match(sources["../systems/visual/HUDSystem.js"], /ESC  MENU/);
assert.match(sources["../world/playScene/PlaySceneUI.js"], /consumeHardcoreDeath/);
assert.match(sources["../world/playScene/PlaySceneUI.js"], /Save failed — retry before leaving the run/);
assert.match(sources["../world/playScene/GameInputHandler.js"], /justDown\(keys\.restart\) \|\| justDown\(keys\.enter\)/);

const canonicalDocs = [
  "../markdown/design-documents/readme.md",
  "../markdown/design-documents/2026-08-10-game-vision.md",
  "../markdown/design-documents/2026-08-10-player-journey.md",
  "../markdown/design-documents/2026-08-10-gameplay-systems.md",
  "../markdown/design-documents/2026-08-10-world-and-content.md",
  "../markdown/design-documents/2026-08-10-controls-and-interface.md",
  "../markdown/design-documents/2026-08-10-progression-economy-and-saves.md",
  "../markdown/design-documents/2026-08-10-runtime-alignment-register.md",
];
for (const path of canonicalDocs) {
  const info = await stat(new URL(path, import.meta.url));
  assert.ok(info.size > 1000, `${path} must be a substantive canonical document`);
}
await stat(new URL(
  "../archive/2026-08-10-superseded-design-document-drafts/INDEX.md",
  import.meta.url,
));

console.log("design vision/runtime alignment contract: PASS");
