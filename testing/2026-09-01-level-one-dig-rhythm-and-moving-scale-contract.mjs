import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  canStartUalMiningAction,
  resolveUalMiningRecoveryHoldUntilMs,
} from "../player/ualMiningActionCadence.js";
import { UalActionRecoverySelector } from
  "../systems/visual/UalActionRecoverySelector.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { UAL_NATIVE_ACTION_TUNING } from "../values/ualNativeActionTuning.js";
import {
  SURVIVAL_UNIFIED_ANIMATION_RUNTIME_V1,
} from "../values/survivalUnifiedAnimationRuntimeV1.js";
import {
  SURVIVAL_UAL_PLAYER_ASSET_PROFILE,
} from "../values/survivalUalPlayerAssetProfile.js";

const profile = SURVIVAL_UAL_PLAYER_ASSET_PROFILE;
const cadenceDigSystem = {
  lastMineTime: -Infinity,
  isMineCooldownReady(nowMs, abilities) {
    assert.equal(abilities?.id, "level-one");
    return nowMs - this.lastMineTime >= MINING_CONFIG.mineCooldownMs;
  },
  getEffectiveCooldownMs(abilities) {
    assert.equal(abilities?.id, "level-one");
    return MINING_CONFIG.mineCooldownMs;
  },
};
const abilities = Object.freeze({ id: "level-one" });
const visibleSwingStarts = [];

// A 750 ms authored swing must not replay halfway through the 1500 ms
// Level-1 cooldown. Every accepted visual start represents one real hit.
for (const nowMs of [0, 750, 1500, 2250, 3000]) {
  if (!canStartUalMiningAction({
    digSystem: cadenceDigSystem,
    nowMs,
    abilities,
    actionKind: "normal",
  })) continue;
  visibleSwingStarts.push(nowMs);
  cadenceDigSystem.lastMineTime = nowMs;
}
assert.deepEqual(visibleSwingStarts, [0, 1500, 3000]);
assert.equal(canStartUalMiningAction({
  digSystem: cadenceDigSystem,
  nowMs: 3250,
  abilities,
  actionKind: "quickslash",
}), true, "Quickslash must retain its independent sustained-action cadence");

cadenceDigSystem.lastMineTime = 0;
const recoveryHoldUntilMs = resolveUalMiningRecoveryHoldUntilMs({
  digSystem: cadenceDigSystem,
  abilities,
  actionKind: "normal",
});
assert.equal(
  recoveryHoldUntilMs,
  MINING_CONFIG.mineCooldownMs
    + UAL_NATIVE_ACTION_TUNING.cadence.normal.recoveryReleaseGraceMs,
);
assert.equal(resolveUalMiningRecoveryHoldUntilMs({
  digSystem: cadenceDigSystem,
  abilities,
  actionKind: "quickslash",
}), null, "Quickslash recovery must remain independent");

const recoveryProfile = Object.freeze({
  animationPolishConfig: Object.freeze({
    enabledByDefault: true,
    rollbackQuery: "animationPolish",
    disabledQueryValue: "0",
    actionRecovery: Object.freeze({
      enabledByDefault: true,
      rollbackQuery: "actionSettle",
      disabledQueryValue: "0",
    }),
  }),
  actionRecoveryAnimationByCompletedAnimation: Object.freeze({
    attack: "attack-settle",
  }),
});
const recovery = new UalActionRecoverySelector(recoveryProfile, "");
assert.equal(recovery.begin("attack", false, {
  holdUntilMs: recoveryHoldUntilMs,
  holdCompletedAnimation: true,
}), true);
assert.deepEqual(recovery.resolve({
  nowMs: 760,
  currentAnimationKey: "attack",
  isPlaying: false,
}), {
  animationKey: "attack",
  flipX: false,
  kind: "action-cooldown-hold",
  restart: false,
  holdCompleted: true,
});
assert.deepEqual(recovery.resolve({
  nowMs: 1000,
  currentAnimationKey: "attack",
  isPlaying: false,
}), {
  animationKey: "attack",
  flipX: false,
  kind: "action-cooldown-hold",
  restart: false,
  holdCompleted: true,
});
assert.deepEqual(recovery.resolve({
  nowMs: MINING_CONFIG.mineCooldownMs,
  currentAnimationKey: "attack",
  isPlaying: false,
}), {
  animationKey: "attack",
  flipX: false,
  kind: "action-cooldown-hold",
  restart: false,
  holdCompleted: true,
}, "the combat pose must cover the exact next-input boundary");
assert.equal(recovery.resolve({
  nowMs: recoveryHoldUntilMs,
  currentAnimationKey: "attack",
  isPlaying: false,
}), null, "the combat pose must release after the bounded handoff grace");

const settleRecovery = new UalActionRecoverySelector(recoveryProfile, "");
assert.equal(settleRecovery.begin("attack", false), true);
assert.deepEqual(settleRecovery.resolve({
  nowMs: 760,
  currentAnimationKey: "attack",
  isPlaying: false,
}), {
  animationKey: "attack-settle",
  flipX: false,
  kind: "action-settle",
  restart: true,
}, "non-mining recovery must retain the authored settle path");

const movingSize = SURVIVAL_UNIFIED_ANIMATION_RUNTIME_V1.movingComplexDisplaySizePx;
assert.equal(movingSize, 117);
assert.ok(profile.movingComplexDigAnimationKeys.length > 0);
for (const animationKey of profile.movingComplexDigAnimationKeys) {
  assert.equal(
    profile.displaySizePxByAnimation[animationKey],
    movingSize,
    `${animationKey} must use the running-side family calibration`,
  );
}
assert.equal(
  profile.displaySizePxByAnimation[profile.walkRunAnim],
  SURVIVAL_UNIFIED_ANIMATION_RUNTIME_V1.displaySizePx,
  "the size correction must not alter ordinary running",
);

const audit = JSON.parse(readFileSync(new URL(
  "./animation-sandbox/current-animation-inventory-v1/2026-08-30-animation-audit-report.json",
  import.meta.url,
), "utf8"));
const auditByKey = new Map(audit.animationMetrics.map(entry => [entry.key, entry]));
const runMetric = auditByKey.get(profile.walkRunAnim);
assert.ok(runMetric, "the active run metric must remain in the animation audit");
const adjustedMovingHeights = profile.movingComplexDigAnimationKeys.map((animationKey) => {
  const metric = auditByKey.get(animationKey);
  assert.ok(metric, `missing moving-side audit metric: ${animationKey}`);
  return metric.visibleHeightMedianPx * movingSize / metric.displaySizePx;
}).sort((a, b) => a - b);
const movingMedian = adjustedMovingHeights[Math.floor(adjustedMovingHeights.length / 2)];
assert.ok(
  Math.abs(movingMedian - runMetric.visibleHeightMedianPx) <= 1,
  `moving-side stature ${movingMedian}px must match run ${runMetric.visibleHeightMedianPx}px`,
);

for (const [sourceFile, firstSelectionToken] of [
  ["../world/playScene/PlaySceneGameplay.js", "selectComboAnim("],
  ["../world/playScene/CaveActionAnimationRuntime.js", "this.miningCombo.select({"],
]) {
  const source = readFileSync(new URL(sourceFile, import.meta.url), "utf8");
  assert.match(source, /canStartUalMiningAction\(\{/);
  assert.match(source, /actionKind:\s*action === "quickslash"|actionKind,/);
  assert.ok(
    source.indexOf("canStartUalMiningAction({") < source.indexOf(firstSelectionToken),
    `${sourceFile} must reject cooldown input before advancing its combo`,
  );
}

for (const sourceFile of [
  "../world/playScene/PlaySceneSetup.js",
  "../world/playScene/CaveActionAnimationRuntime.js",
]) {
  const source = readFileSync(new URL(sourceFile, import.meta.url), "utf8");
  assert.match(source, /holdCompletedAnimation:\s*actionKind === "normal"/);
}

for (const sourceFile of [
  "../world/playScene/PlaySceneUpdate.js",
  "../world/playScene/CaveGameplayController.js",
]) {
  const source = readFileSync(new URL(sourceFile, import.meta.url), "utf8");
  assert.match(
    source,
    /miningOptionsForAuthoredContact\(contactEvent,\s*time\)/,
    `${sourceFile} must keep cooldown authority on the accepted animation start`,
  );
  assert.match(source, /actionStartedAtMs/);
}

console.log("LEVEL_ONE_DIG_RHYTHM_AND_MOVING_SCALE_OK", {
  visibleSwingStarts,
  cooldownMs: MINING_CONFIG.mineCooldownMs,
  interAttackCombatPoseHoldMs: recoveryHoldUntilMs - 750,
  movingDisplaySizePx: movingSize,
  movingVisibleHeightMedianPx: movingMedian,
  runVisibleHeightMedianPx: runMetric.visibleHeightMedianPx,
});
