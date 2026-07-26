import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  THUNDER_STRIKE_CHAIN_PHASES,
  resolveThunderStrikeDamage,
  resolveThunderStrikeSuccessDamageMultiplier,
  resolveThunderStrikeTimingBarScale,
} from "../values/thunderStrikeChain.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { ThunderStrikeChainState } from "../world/playScene/ThunderStrikeChainState.js";

assert.equal(THUNDER_STRIKE_CHAIN_CONFIG.upfrontCostMultiplier, 3);
assert.equal(THUNDER_STRIKE_CHAIN_CONFIG.followUpCost, 0);
assert.deepEqual(
  THUNDER_STRIKE_CHAIN_CONFIG.stages.map((stage) => stage.damageMultiplier),
  [1, 3, 10],
);
assert.equal(THUNDER_STRIKE_CHAIN_CONFIG.damage.successBuffPerTimingHit, 0.2);
assert.deepEqual(
  [0, 1, 2].map(resolveThunderStrikeSuccessDamageMultiplier),
  [1, 1.2, 1.4],
);
assert.ok(
  THUNDER_STRIKE_CHAIN_CONFIG.stages[1].timing.windowMs >= 200,
  "Slam II must be readable and consistently achievable",
);
assert.ok(
  THUNDER_STRIKE_CHAIN_CONFIG.stages[2].timing.windowMs >= 120,
  "Slam III must be difficult without being frame-perfect",
);
assert.ok(
  THUNDER_STRIKE_CHAIN_CONFIG.stages[2].timing.windowMs
    < THUNDER_STRIKE_CHAIN_CONFIG.stages[1].timing.windowMs,
  "Slam III remains the harder continuation",
);
assert.ok(
  THUNDER_STRIKE_CHAIN_CONFIG.timingBar.depth > 3600,
  "the timing bar must render above transient notification toasts",
);

// The pure chain accepts exact hits, rejects an early press immediately, and
// cannot skip from Slam I directly to the final 10x strike.
{
  const state = new ThunderStrikeChainState();
  state.beginCharge(0);
  assert.equal(state.markSlamStarted(0, 1000), true);
  state.beginContinuation(1800);
  assert.equal(state.phase, THUNDER_STRIKE_CHAIN_PHASES.TIMING);
  assert.equal(state.markSlamStarted(2, 1800), false);
  const presented = state.getSnapshot(state.challengeTargetMs);
  const slamTwo = state.attemptContinuationAtProgress(presented.progress);
  assert.equal(slamTwo.success, true);
  assert.equal(slamTwo.stageIndex, 1);
  assert.equal(slamTwo.snapshot.successfulContinuations, 1);
  assert.equal(state.markSlamStarted(1, state.challengeTargetMs), true);
  state.beginContinuation(2800);
  const tooEarly = state.challengeTargetMs
    - THUNDER_STRIKE_CHAIN_CONFIG.stages[2].timing.windowMs / 2
    - 1;
  const miss = state.attemptContinuation(tooEarly);
  assert.equal(miss.success, false);
  assert.equal(miss.reason, "miss");
  assert.equal(state.phase, THUNDER_STRIKE_CHAIN_PHASES.FAILED);
}

// Timing authority follows the position drawn on the previous rendered frame,
// not a later wall-clock sample that can arrive after browser/input latency.
{
  const state = new ThunderStrikeChainState();
  state.beginCharge(0);
  state.markSlamStarted(0, 1000);
  state.beginContinuation(1800);
  const presented = state.getSnapshot(state.challengeTargetMs);
  const laterWallClock = state.challengeTargetMs
    + THUNDER_STRIKE_CHAIN_CONFIG.stages[1].timing.windowMs;
  assert.equal(state.attemptContinuation(laterWallClock).success, false);

  state.beginCharge(0);
  state.markSlamStarted(0, 1000);
  state.beginContinuation(1800);
  const visuallyFair = state.attemptContinuationAtProgress(presented.progress);
  assert.equal(visuallyFair.success, true);
}

{
  const state = new ThunderStrikeChainState();
  state.beginCharge(0);
  state.markSlamStarted(0, 1000);
  state.beginContinuation(1800);
  let attempt = state.attemptContinuation(state.challengeTargetMs);
  state.markSlamStarted(attempt.stageIndex, state.challengeTargetMs);
  state.beginContinuation(2800);
  assert.equal(state.getSnapshot(2800).progress, 0, "each timing bar restarts at the left edge");
  attempt = state.attemptContinuation(state.challengeTargetMs);
  assert.equal(attempt.snapshot.successfulContinuations, 2);
  state.markSlamStarted(attempt.stageIndex, state.challengeTargetMs);
  const finished = state.beginContinuation(3800);
  assert.equal(finished.complete, true);
  assert.equal(state.phase, THUNDER_STRIKE_CHAIN_PHASES.COMPLETE);
  assert.equal(state.completedStageIndex, 2);
  assert.equal(state.successfulContinuations, 2);
}

{
  const state = new ThunderStrikeChainState();
  state.beginCharge(0);
  state.markSlamStarted(0, 1000);
  state.beginContinuation(1800);
  const timedOut = state.update(state.challengeEndMs + 1);
  assert.equal(timedOut.failed, true);
  assert.equal(timedOut.reason, "timeout");
}

// Only Slam I spends GP. Follow-ups must be explicitly armed by a successful
// timing event, and their damage scales against the same contacted tile.
{
  const damages = [];
  const tileSize = 64;
  const abilities = Object.create(PlayerAbilities.prototype);
  Object.assign(abilities, {
    _thunderStrikeCharging: true,
    _thunderStrikeFollowUpStageIndex: null,
    _godMode: false,
    gemPower: 1000,
    body: {
      x: 10 * tileSize + 16,
      y: 11 * tileSize - 48,
      w: 32,
      h: 48,
    },
    config: { tileSize },
    worldModel: {
      depth: 30,
      isDiggable: (tx, ty) => tx === 10 && ty === 11,
      getTileType: () => TILE_TYPES.DIRT,
      damageTile(tx, ty, damage) {
        damages.push({ tx, ty, damage });
        return {
          destroyed: false,
          typeBeforeDamage: TILE_TYPES.DIRT,
          wasRubble: false,
        };
      },
    },
    upgradeSystem: { getUpgradeLevel: () => 0 },
    getConstellationStats: () => ({}),
    _getNormalMiningDamageForTile: () => 100,
  });

  assert.equal(abilities.getThunderStrikeCost(), 300);
  abilities.getConstellationStats = () => ({ thunderstrikeCostReduction: 30 });
  assert.equal(abilities.getThunderStrikeCost(), 270, "flat constellation cost reduction stays flat");
  abilities.getConstellationStats = () => ({});
  const first = abilities.executeThunderStrike(0);
  assert.equal(first.success, true);
  assert.equal(first.chainDamageMultiplier, 1);
  assert.equal(first.chainEffectiveDamageMultiplier, 1);
  assert.equal(abilities.gemPower, 700);

  const unauthorized = abilities.executeThunderStrike(2);
  assert.equal(unauthorized.success, false);
  assert.equal(unauthorized.reason, "follow-up-not-armed");
  assert.equal(abilities.gemPower, 700);

  assert.equal(abilities.armThunderStrikeFollowUp(1), true);
  const second = abilities.executeThunderStrike(1);
  assert.equal(second.success, true);
  assert.equal(second.chainDamageMultiplier, 3);
  assert.equal(second.chainSuccessDamageMultiplier, 1.2);
  assert.equal(second.chainEffectiveDamageMultiplier, 3.6);
  assert.equal(abilities.gemPower, 700);

  assert.equal(abilities.armThunderStrikeFollowUp(2), true);
  const third = abilities.executeThunderStrike(2);
  assert.equal(third.success, true);
  assert.equal(third.chainDamageMultiplier, 10);
  assert.equal(third.chainSuccessDamageMultiplier, 1.4);
  assert.equal(third.chainEffectiveDamageMultiplier, 14);
  assert.equal(abilities.gemPower, 700);
  assert.deepEqual(damages.map((hit) => hit.damage), [150, 540, 2100]);
}

assert.equal(
  resolveThunderStrikeDamage({
    baseDamage: 100,
    normalDamageMultiplier: 1.5,
    bonusDamageMultiplier: 1.2,
    stageDamageMultiplier: 3,
    falloffPerTile: 0.1,
    distance: 2,
  }),
  432,
);
assert.equal(
  resolveThunderStrikeDamage({
    baseDamage: 100,
    normalDamageMultiplier: 1.5,
    bonusDamageMultiplier: 1.2,
    stageDamageMultiplier: 10,
    falloffPerTile: 0.1,
    distance: 20,
  }),
  360,
  "distance falloff clamps at the configured 20% damage floor",
);
assert.equal(
  resolveThunderStrikeDamage({
    baseDamage: 100,
    normalDamageMultiplier: 1.5,
    bonusDamageMultiplier: 1,
    stageDamageMultiplier: 10,
    successDamageMultiplier: 1.4,
  }),
  2100,
  "two successful timings add a cumulative 40% combo-local damage buff",
);

const wideScale = resolveThunderStrikeTimingBarScale(1672, 940);
const standardScale = resolveThunderStrikeTimingBarScale(1280, 720);
const compactScale = resolveThunderStrikeTimingBarScale(960, 540);
assert.equal(wideScale, 1);
assert.ok(standardScale > 0.9 && standardScale <= 1);
assert.ok(compactScale >= THUNDER_STRIKE_CHAIN_CONFIG.timingBar.minimumScale);
assert.ok(compactScale < standardScale);

const setupSource = readFileSync(
  new URL("../world/playScene/PlaySceneSetup.js", import.meta.url),
  "utf8",
);
const updateSource = readFileSync(
  new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url),
  "utf8",
);
const caveSource = readFileSync(
  new URL("../world/playScene/CaveActionAnimationRuntime.js", import.meta.url),
  "utf8",
);
const timingBarSource = readFileSync(
  new URL("../systems/visual/ThunderStrikeTimingBarSystem.js", import.meta.url),
  "utf8",
);
const timingBarViewSource = readFileSync(
  new URL("../systems/visual/ThunderStrikeTimingBarView.js", import.meta.url),
  "utf8",
);
const impactSource = readFileSync(
  new URL("../systems/visual/ThunderStrikeImpactFxSystem.js", import.meta.url),
  "utf8",
);
const bootSource = readFileSync(
  new URL("../ui/scenes/BootScene.js", import.meta.url),
  "utf8",
);
const visualHarnessSource = readFileSync(
  new URL("./2026-07-26-thunderstrike-chain-visual-harness.js", import.meta.url),
  "utf8",
);
const visualHarnessHtml = readFileSync(
  new URL("./2026-07-26-thunderstrike-chain-visual-harness.html", import.meta.url),
  "utf8",
);
const frameAsset = readFileSync(
  new URL(
    "../sprites/UI/thunderstrike-chain-v1/thunderstrike-chain-frame-v1.webp",
    import.meta.url,
  ),
);

assert.match(setupSource, /new ThunderStrikeActionRuntime\(this\)/);
assert.match(
  setupSource,
  /thunderStrikeActionRuntime\?\.isAnimating[\s\S]{0,120}thunderStrikeStrikeAnim/,
);
assert.match(updateSource, /thunderStrikeActionRuntime\?\.update/);
assert.match(caveSource, /new ThunderStrikeActionRuntime\(controller\.scene/);
assert.match(timingBarSource, /getPresentedTimingSnapshot/);
assert.match(timingBarViewSource, /getKeyLabel\("thunderStrike"\)/);
assert.match(timingBarViewSource, /windowStartProgress/);
assert.match(timingBarViewSource, /thunderStrikeChainFrame/);
assert.match(bootSource, /THUNDER_STRIKE_CHAIN_CONFIG\.timingBar\.assetPath/);
assert.match(visualHarnessSource, /new ThunderStrikeTimingBarSystem\(this\)/);
assert.match(visualHarnessSource, /keydown-SPACE/);
assert.match(visualHarnessSource, /successfulContinuations/);
assert.match(
  visualHarnessHtml,
  /2026-07-26-thunderstrike-chain-visual-harness\.js/,
);
assert.match(impactSource, /stage\.visual\.shakeSignature/);
assert.match(impactSource, /stage\.visual\.sparkCount/);
assert.match(impactSource, /chainEffectiveDamageMultiplier/);
assert.equal(frameAsset.subarray(0, 4).toString("ascii"), "RIFF");

console.log("THUNDERSTRIKE_THREE_SLAM_CONTRACT_OK");
