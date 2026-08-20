import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { CraftingSystem } from "../systems/crafting/CraftingSystem.js";
import {
  createGameplayCapabilities,
  GAMEPLAY_PROFILE_IDS,
} from "../values/gameplayCapabilities.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const demo = createGameplayCapabilities(GAMEPLAY_PROFILE_IDS.DEMO);
const full = createGameplayCapabilities(GAMEPLAY_PROFILE_IDS.FULL_REVIEW);

const demoUpgrades = new UpgradeSystem(null, null, { gameplayCapabilities: demo });
const fullUpgrades = new UpgradeSystem(null, null, { gameplayCapabilities: full });
assert.equal(demoUpgrades.grantUpgrade("worldTwoTunnelAccess").success, false);
assert.equal(fullUpgrades.grantUpgrade("worldTwoTunnelAccess").success, true);
assert.equal(fullUpgrades.getUpgradeLevel("worldTwoTunnelAccess"), 1);

const demoCrafting = new CraftingSystem({ gameplayCapabilities: demo });
const fullCrafting = new CraftingSystem({ gameplayCapabilities: full });
assert.ok(fullCrafting.getRecipes().length > demoCrafting.getRecipes().length);
assert.ok(fullCrafting.getRecipes().some(recipe => recipe.output?.upgradeId === "arcCoreVehicle"));

assert.match(source("world/playScene/PlaySceneSetup.js"), /new WorldModel\(this\.config, this\.gameplayCapabilities\)/);
assert.match(source("world/playScene/PlaySceneSetup.js"), /gameplayCapabilities: this\.gameplayCapabilities/);
assert.match(source("world/model/WorldModel.js"), /this\.gameplayCapabilities = gameplayCapabilities/);
assert.match(source("testing/JkdE2EHarness.js"), /ualActionContactTimeline\?\.cancel/);
assert.match(
  source("world/playScene/HardcoreModalStateBridge.js"),
  /scene\._pausePanel \|\| scene\.gameState === "paused"\) scene\.resumeGame/,
);
assert.match(
  source("world/playScene/PlaySceneGameplay.js"),
  /playerDeferredAnimationAssetController\?\.resolveOrRequest/,
);
assert.match(
  source("world/playScene/PlaySceneGameplay.js"),
  /ualActionContactTimeline\.handleAnimationUpdate\(/,
  "PlayScene must sample an already-advanced action frame after arming its contact timeline",
);
assert.match(
  source("world/playScene/PlaySceneGameplay.js"),
  /fireContactFallback\(/,
  "PlayScene must recover an action whose animation stops before contact",
);

console.log("Gameplay capability injection and Robo checkpoint cleanup contract passed.");
