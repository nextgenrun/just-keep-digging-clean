import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LocalRecoverySystem } from "../systems/onboarding/LocalRecoverySystem.js";
import { FirstFiveMinutesTutorialBridge } from "../systems/onboarding/FirstFiveMinutesTutorialBridge.js";
import { RetentionProgressSystem } from "../systems/progression/RetentionProgressSystem.js";
import {
  FIRST_SESSION_MILESTONES,
  sanitizeFirstSessionRouteState,
} from "../systems/progression/firstSessionRouteState.js";
import {
  getMiningBlockerCopy,
  resolveMiningBlockerReason,
} from "../values/firstSessionSafety.js";
import { TOWN_TUTORIAL_CHOICES } from "../values/retentionConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = relative => readFile(path.join(root, relative), "utf8");

{
  const retention = new RetentionProgressSystem();
  assert.equal(retention.configureTutorialChoice(TOWN_TUTORIAL_CHOICES.YES), true);
  retention.recordFirstSessionAssist("unsafe-descent", "recover");
  retention.recordFirstSessionStop("confusion");
  assert.equal(retention.recordTutorialMovement(2), true);
  retention.onFirstTileBroken();
  assert.equal(retention.recordTutorialFlight(), true);
  retention.recordPortalActivated("Starter Return Gate");
  retention.recordSale(3, 3);
  retention.recordUpgrade("Agility Training", { beforeDamage: 16, afterDamage: 16 });
  assert.equal(retention.recordTutorialPortalResume(), true);

  const route = retention.getFirstSessionRouteSnapshot();
  assert.ok(route.startedAt > 0);
  assert.ok(route.completedAt > 0);
  assert.equal(route.stopReason, null);
  assert.equal(route.assistCounts["unsafe-descent"], 1);
  assert.equal(route.milestones.recover.assistCount, 1);
  FIRST_SESSION_MILESTONES.forEach(id => {
    assert.ok(route.milestones[id].completedAt > 0, `${id} milestone is missing`);
  });

  const restored = new RetentionProgressSystem();
  restored.loadSaveData(retention.getSaveData());
  assert.deepEqual(restored.getFirstSessionRouteSnapshot(), route);
  assert.deepEqual(
    sanitizeFirstSessionRouteState({ assistCounts: { "BAD KEY": 9 } }).assistCounts,
    {},
  );
}

{
  const notices = [];
  const teleports = [];
  const resources = { dirt: 17, stone: 4 };
  let playerTile = { tx: 5, ty: 67 };
  let assists = 0;
  const scene = {
    time: { now: 1000 },
    config: { topAirRows: 65 },
    playerController: {
      getPlayerTile: () => playerTile,
      teleportToTile: (tx, ty) => { teleports.push({ tx, ty }); return true; },
    },
    worldModel: {
      inBounds: () => true,
      getTileType: (tx, ty) => (
        ty === 65 && tx === 6 ? TILE_TYPES.FLOOR_TOWN_1 : TILE_TYPES.AIR
      ),
      isSolid: () => false,
    },
    digSystem: { getResourceTotals: () => resources },
    retentionProgressSystem: {
      recordFirstSessionAssist: () => { assists += 1; },
    },
    uiNotifications: { warning: (...args) => notices.push(args) },
  };
  const recovery = new LocalRecoverySystem(scene);
  const result = recovery.recover();
  assert.equal(result.success, true);
  assert.equal(result.cargoLossRatio, 0);
  assert.deepEqual(teleports, [{ tx: 6, ty: 64 }]);
  assert.deepEqual(resources, { dirt: 17, stone: 4 });
  assert.equal(assists, 1);
  assert.match(notices[0][0], /NO CARGO LOST/);
  assert.equal(recovery.recover().reason, "cooldown");
  playerTile = { tx: 5, ty: 70 };
  scene.time.now = 10000;
  assert.equal(recovery.recover().reason, "outside-town-zone");
  recovery.destroy();
}

{
  assert.equal(resolveMiningBlockerReason(TILE_TYPES.BEDROCK), "permanent-boundary");
  assert.equal(resolveMiningBlockerReason(TILE_TYPES.GEODE_WALL), "tool-gate");
  assert.equal(resolveMiningBlockerReason(TILE_TYPES.FLOOR_TOWN_1), "protected-structure");
  assert.equal(resolveMiningBlockerReason(TILE_TYPES.CAVE_WALL), "protected-structure");
  assert.equal(resolveMiningBlockerReason(-1), "temporary-state");
  assert.match(getMiningBlockerCopy("permanent-boundary").detail, /FIND ANOTHER ROUTE/);
}

{
  const bridge = Object.create(FirstFiveMinutesTutorialBridge.prototype);
  bridge.enabled = true;
  bridge.search = "";
  bridge.retention = { getTutorialState: () => ({ stage: "upgrade" }) };
  bridge.scene = {
    upgradeSystem: {
      getUpgradeEffects: () => ({ digDamageAdditive: 0, pickaxeDamage: 0 }),
      getProjectedUpgradeEffects: () => ({ digDamageAdditive: 2, pickaxeDamage: 0 }),
    },
    config: { topAirRows: 65 },
    worldModel: {
      dugTiles: new Map([["12,65", true]]),
      getTileMaxHp: () => 64,
    },
    worldRenderer: { clearTutorialTileVisual() {} },
  };
  assert.deepEqual(bridge.getUpgradePreview("strength"), {
    beforeDamage: 16,
    afterDamage: 18,
    beforeHits: 4,
    afterHits: 4,
  });
}

const [digSource, gameplaySource, blockerSource, uiSource, setupSource] = await Promise.all([
  source("systems/mining/DigSystem.js"),
  source("world/playScene/PlaySceneGameplay.js"),
  source("world/playScene/MiningBlockerFeedback.js"),
  source("world/playScene/PlaySceneUI.js"),
  source("world/playScene/PlaySceneSetup.js"),
]);
assert.match(digSource, /blockerReason:\s*resolveMiningBlockerReason/);
assert.match(gameplaySource, /showMiningBlockerFeedback\(this, result, targetTile\)/);
assert.match(blockerSource, /mining-blocker-\$\{reason\}/);
assert.match(uiSource, /LOCAL RECOVERY\s+•\s+NO CARGO LOSS/);
assert.match(uiSource, /ABANDON EXPEDITION\s+•\s+LOSE 50% CARGO/);
assert.match(setupSource, /new LocalRecoverySystem\(this\)/);

console.log("FIRST_SESSION_ROUTE_CONTRACT_OK");
