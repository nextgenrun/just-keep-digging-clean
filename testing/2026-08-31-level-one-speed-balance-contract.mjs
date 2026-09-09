import assert from "node:assert/strict";

import { DigSystem } from "../systems/mining/DigSystem.js";
import { PlayerLevelSystem } from "../systems/progression/PlayerLevelSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { GAMEFEEL_CONFIG } from "../values/gamefeel.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { PLAYER_ASSET_PROFILES } from "../values/playerAssetProfiles.js";
import { PLAYER_STATS_CONFIG } from "../values/playerStats.js";
import {
  UAL_NATIVE_ACTION_TUNING,
  resolveUalActionTimeScale,
} from "../values/ualNativeActionTuning.js";
import { getUpgradeCost } from "../values/upgradeFormulas.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";

const previousWalkSpeedPxPerSec = 200;
const previousMineCooldownMs = 750;

assert.equal(
  PLAYER_STATS_CONFIG.walkSpeedPxPerSec,
  previousWalkSpeedPxPerSec * 0.8,
  "level-1 movement must be reduced by 20%",
);
assert.equal(
  1000 / MINING_CONFIG.mineCooldownMs,
  (1000 / previousMineCooldownMs) * 0.5,
  "level-1 attacks per second must be reduced by 50%",
);
assert.equal(
  GAMEFEEL_CONFIG.animSpeed.baseCooldownMs,
  MINING_CONFIG.mineCooldownMs,
  "dig presentation must use the new gameplay cadence as its baseline",
);
assert.equal(
  UAL_NATIVE_ACTION_TUNING.cadence.normal.maxPlaybackDurationMs,
  previousMineCooldownMs,
  "slower gameplay cadence must not stretch an authored swing beyond its validated duration",
);
const oneSecondSourceScale = resolveUalActionTimeScale({
  frameCount: 30,
  frameRate: 30,
  effectiveCooldownMs: MINING_CONFIG.mineCooldownMs,
});
assert.equal(oneSecondSourceScale, 4 / 3);
assert.equal(
  1000 / oneSecondSourceScale,
  previousMineCooldownMs,
  "the 1500 ms dig cooldown must retain a readable 750 ms authored swing",
);
assert.equal(
  ASSET_KEYS.player.walkAnimation.baseSpeedPxPerSec,
  PLAYER_STATS_CONFIG.walkSpeedPxPerSec,
  "the fallback walk animation must share the authoritative movement baseline",
);

for (const profile of Object.values(PLAYER_ASSET_PROFILES)) {
  assert.equal(
    profile.walkAnimation.baseSpeedPxPerSec,
    PLAYER_STATS_CONFIG.walkSpeedPxPerSec,
    `${profile.characterId} must share the authoritative movement baseline`,
  );
}

const playerLevelSystem = new PlayerLevelSystem();
const digSystem = new DigSystem(
  null,
  null,
  MINING_CONFIG,
  null,
  playerLevelSystem,
);
assert.equal(playerLevelSystem.level, 1);
assert.equal(playerLevelSystem.getMiningSpeedBonus(), 0);
assert.equal(digSystem.getEffectiveCooldownMs(), MINING_CONFIG.mineCooldownMs);

const agilitySystem = new UpgradeSystem();
agilitySystem.setMoney(getUpgradeCost("agility", 0));
assert.equal(agilitySystem.purchaseUpgrade("agility").success, true);
assert.equal(
  agilitySystem.getEffectiveWalkSpeed(PLAYER_STATS_CONFIG.walkSpeedPxPerSec),
  180,
  "Agility level 1 must still add its full 20 px/s",
);

const reflexSystem = new UpgradeSystem();
reflexSystem.setMoney(getUpgradeCost("quickReflexes", 0));
assert.equal(reflexSystem.purchaseUpgrade("quickReflexes").success, true);
assert.equal(
  reflexSystem.getEffectiveMineCooldown(MINING_CONFIG.mineCooldownMs),
  MINING_CONFIG.mineCooldownMs * (1 - UPGRADES.quickReflexes.baseEffect),
  "Quick Reflexes level 1 must apply the current catalog's per-rank reduction",
);

await import("./2026-09-03-speed-block-regressions.js");

console.log("LEVEL_ONE_SPEED_BALANCE_OK", {
  walkSpeedPxPerSec: PLAYER_STATS_CONFIG.walkSpeedPxPerSec,
  attacksPerSecond: 1000 / MINING_CONFIG.mineCooldownMs,
  agilityLevelOneSpeedPxPerSec: agilitySystem.getEffectiveWalkSpeed(
    PLAYER_STATS_CONFIG.walkSpeedPxPerSec,
  ),
  quickReflexesLevelOneCooldownMs: reflexSystem.getEffectiveMineCooldown(
    MINING_CONFIG.mineCooldownMs,
  ),
});
