import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  THUNDER_STRIKE_CHAIN_PHASES,
  resolveThunderStrikeDamage,
  resolveThunderStrikeEffectiveDamageMultiplier,
  resolveThunderStrikeSuccessDamageMultiplier,
  resolveThunderStrikeTimingBarScale,
} from "../values/thunderStrikeChain.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { UAL_NATIVE_ACTION_TUNING } from "../values/ualNativeActionTuning.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";
import { ThunderStrikeActionRuntime } from "../world/playScene/ThunderStrikeActionRuntime.js";
import { ThunderStrikeChainState } from "../world/playScene/ThunderStrikeChainState.js";

assert.equal(THUNDER_STRIKE_CHAIN_CONFIG.upfrontCostMultiplier, 3);
assert.equal(THUNDER_STRIKE_CHAIN_CONFIG.followUpCost, 0);
assert.equal(THUNDER_STRIKE_CHAIN_CONFIG.initialImpact.chargeTimeMs, 180);
assert.equal(THUNDER_STRIKE_CHAIN_CONFIG.stages.length, 10);
assert.deepEqual(
  THUNDER_STRIKE_CHAIN_CONFIG.stages.map((stage) => stage.damageMultiplier),
  [1, 3, 10, 12, 15, 20, 28, 40, 60, 100],
);
assert.deepEqual(
  THUNDER_STRIKE_CHAIN_CONFIG.timingBar.milestones.map(({ stageIndex }) => stageIndex),
  [0, 4, 9],
);
const openingPressToContactMs = THUNDER_STRIKE_CHAIN_CONFIG.initialImpact.chargeTimeMs
  + (
    UAL_NATIVE_ACTION_TUNING.contact.thunderStrike.sequenceIndex
    / UAL_NATIVE_ACTION_TUNING.thunderStrike.frameRate
  ) * 1000;
assert.ok(
  openingPressToContactMs < 500,
  `opening impact should land promptly, received ${openingPressToContactMs} ms`,
);
assert.equal(THUNDER_STRIKE_CHAIN_CONFIG.damage.successBuffPerTimingHit, 0.2);
assert.deepEqual(
  [0, 1, 4, 9].map(resolveThunderStrikeSuccessDamageMultiplier),
  [1, 1.2, 1.8, 2.8],
);
const timingWindows = THUNDER_STRIKE_CHAIN_CONFIG.stages
  .slice(1).map((entry) => entry.timing.windowMs);
assert.deepEqual(timingWindows, [280, 230, 190, 150, 90, 62, 42, 28, 16]);
assert.ok(timingWindows.slice(0, 4).every((windowMs) => windowMs >= 150));
assert.ok(
  timingWindows[4] < timingWindows[3] * 0.65,
  "Slam VI must begin the drastic post-V difficulty ramp",
);
for (let index = 4; index < timingWindows.length; index += 1) {
  assert.ok(timingWindows[index] < timingWindows[index - 1]);
}
assert.ok(timingWindows.at(-1) <= 16, "Slam X should remain nearly impossible");
assert.equal(THUNDER_STRIKE_CHAIN_PHASES.SETBACK, undefined);
assert.equal(THUNDER_STRIKE_CHAIN_CONFIG.recovery, undefined);
assert.ok(
  THUNDER_STRIKE_CHAIN_CONFIG.timingBar.depth > 3600,
  "the timing bar must render above transient notification toasts",
);
assert.equal(
  Object.keys(THUNDER_STRIKE_CHAIN_CONFIG.timingBar.indicatorArt.assetPaths).length,
  10,
);

// The pure chain accepts exact hits, ends on the first miss, and cannot skip
// from Slam I directly to the final tenth strike.
{
  const state = new ThunderStrikeChainState();
  state.beginCharge(0);
  assert.equal(state.markSlamStarted(0, 1000), true);
  state.beginContinuation(1800);
  assert.equal(state.phase, THUNDER_STRIKE_CHAIN_PHASES.TIMING);
  assert.equal(state.markSlamStarted(9, 1800), false);
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
  assert.equal(miss.failed, true);
  assert.equal(miss.reason, "miss");
  assert.equal(miss.recovered, undefined);
  assert.equal(state.phase, THUNDER_STRIKE_CHAIN_PHASES.FAILED);
  assert.equal(state.currentStageIndex, 1);
  assert.equal(state.completedStageIndex, 1);
  assert.equal(state.successfulContinuations, 1);
  assert.equal("setbacksRemaining" in miss.snapshot, false);
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
  let nowMs = 1800;
  for (let stageIndex = 1; stageIndex < 10; stageIndex += 1) {
    const continuation = state.beginContinuation(nowMs);
    assert.equal(continuation.complete, false);
    assert.equal(continuation.snapshot.progress, 0, "every timing bar restarts left");
    const attempt = state.attemptContinuation(state.challengeTargetMs);
    assert.equal(attempt.success, true);
    assert.equal(attempt.snapshot.successfulContinuations, stageIndex);
    assert.equal(state.markSlamStarted(stageIndex, state.challengeTargetMs), true);
    nowMs = state.challengeTargetMs + 800;
  }
  const finished = state.beginContinuation(nowMs);
  assert.equal(finished.complete, true);
  assert.equal(state.phase, THUNDER_STRIKE_CHAIN_PHASES.COMPLETE);
  assert.equal(state.completedStageIndex, 9);
  assert.equal(state.successfulContinuations, 9);
}

// Extra legacy arguments cannot restore retries: the first miss always disperses.
{
  const state = new ThunderStrikeChainState();
  state.beginCharge(0, 99);
  state.markSlamStarted(0, 1000);
  state.beginContinuation(1800);
  const miss = state.attemptContinuation(state.challengeStartMs);
  assert.equal(miss.failed, true);
  assert.equal(miss.recovered, undefined);
  assert.equal(miss.reason, "miss");
  assert.equal(state.phase, THUNDER_STRIKE_CHAIN_PHASES.FAILED);
}

{
  const state = new ThunderStrikeChainState();
  state.beginCharge(0);
  state.markSlamStarted(0, 1000);
  state.beginContinuation(1800);
  const timedOut = state.update(state.challengeEndMs + 1);
  assert.equal(timedOut.failed, true);
  assert.equal(timedOut.recovered, undefined);
  assert.equal(timedOut.reason, "timeout");
  assert.equal(state.phase, THUNDER_STRIKE_CHAIN_PHASES.FAILED);
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
    _thunderStrikeFollowUpSuccessCount: 0,
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

  const unauthorized = abilities.executeThunderStrike(9);
  assert.equal(unauthorized.success, false);
  assert.equal(unauthorized.reason, "follow-up-not-armed");
  assert.equal(abilities.gemPower, 700);

  for (let stageIndex = 1; stageIndex < 10; stageIndex += 1) {
    assert.equal(abilities.armThunderStrikeFollowUp(stageIndex, stageIndex), true);
    const strike = abilities.executeThunderStrike(stageIndex);
    const stage = THUNDER_STRIKE_CHAIN_CONFIG.stages[stageIndex];
    assert.equal(strike.success, true);
    assert.equal(strike.chainDamageMultiplier, stage.damageMultiplier);
    assert.equal(
      strike.chainEffectiveDamageMultiplier,
      resolveThunderStrikeEffectiveDamageMultiplier(stage.damageMultiplier, stageIndex),
    );
  }
  assert.equal(abilities.gemPower, 700);
  assert.deepEqual(
    damages.map((hit) => hit.damage),
    [150, 540, 2100, 2880, 4050, 6000, 9240, 14400, 23400, 42000],
  );
  assert.equal(
    new Set(damages.map((hit) => hit.tx)).size,
    1,
    "every slam must stay in the one vertical lane below the player",
  );

  abilities._thunderStrikeChargeStart = 1000;
  assert.equal(abilities.updateThunderStrikeCharge(1179).complete, false);
  assert.equal(abilities.updateThunderStrikeCharge(1180).complete, true);
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
    stageDamageMultiplier: 100,
    successDamageMultiplier: 2.8,
  }),
  42000,
  "nine successful timings add a cumulative 180% combo-local damage buff",
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
const gameplaySource = readFileSync(
  new URL("../world/playScene/PlaySceneGameplay.js", import.meta.url),
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
const caveGameplaySource = readFileSync(
  new URL("../world/playScene/CaveGameplayController.js", import.meta.url),
  "utf8",
);
const inputSource = readFileSync(
  new URL("../world/playScene/GameInputHandler.js", import.meta.url),
  "utf8",
);
const playerInputSource = readFileSync(
  new URL("../player/PlayerInput.js", import.meta.url),
  "utf8",
);
const keybindActionsSource = readFileSync(
  new URL("../values/keybindActions.js", import.meta.url),
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
const targetGateAsset = readFileSync(
  new URL(
    "../sprites/UI/thunderstrike-chain-v2/thunderstrike-target-gate-v2.webp",
    import.meta.url,
  ),
);
const needleAsset = readFileSync(
  new URL(
    "../sprites/UI/thunderstrike-chain-v2/thunderstrike-needle-v2.webp",
    import.meta.url,
  ),
);
const indicatorAssetNames = [
  "thunderstrike-milestone-dormant-v3.webp",
  "thunderstrike-milestone-challenge-v3.webp",
  "thunderstrike-milestone-completed-v3.webp",
  "thunderstrike-milestone-check-v3.webp",
  "thunderstrike-prompt-plate-v3.webp",
  "thunderstrike-stage-plate-v3.webp",
  "thunderstrike-badge-plate-v3.webp",
  "thunderstrike-glyph-i-v3.webp",
  "thunderstrike-glyph-v-v3.webp",
  "thunderstrike-glyph-x-v3.webp",
];
const indicatorAssets = indicatorAssetNames.map((name) => readFileSync(
  new URL(`../sprites/UI/thunderstrike-chain-v3/${name}`, import.meta.url),
));

assert.match(setupSource, /new ThunderStrikeActionRuntime\(this\)/);
assert.match(setupSource, /this\._isShuttingDown = false/);
assert.match(setupSource, /SHUTDOWN[\s\S]{0,120}this\._isShuttingDown = true/);
assert.match(
  gameplaySource,
  /this\._isShuttingDown \|\| !this\.player\?\.anims \|\| !this\.playerController/,
);
assert.match(
  setupSource,
  /thunderStrikeActionRuntime\?\.isAnimating[\s\S]{0,120}thunderStrikeStrikeAnim/,
);
assert.match(updateSource, /thunderStrikeActionRuntime\?\.update/);
assert.doesNotMatch(
  updateSource,
  /getHorizontalMovement[\s\S]{0,180}thunderStrikeActionRuntime\?\.cancel/,
  "held A/D must not abort the committed C strike on the next frame",
);
assert.match(caveSource, /new ThunderStrikeActionRuntime\(controller\.scene/);
assert.match(caveSource, /cancelThunderStrike\(time\)/);
assert.match(
  caveGameplaySource,
  /if \(escapePressed\)[\s\S]{0,120}cancelThunderStrike\(time\)/,
  "Escape remains the explicit cave strike cancel",
);
assert.doesNotMatch(
  caveGameplaySource,
  /horizontal\.(?:left|right)[\s\S]{0,120}cancelThunderStrike\(time\)/,
  "held cave locomotion must not cancel Thunder Strike",
);
assert.match(inputSource, /thunderStrikeActionRuntime\?\.cancel/);
assert.match(
  playerInputSource,
  /queueThunderStrikeInput\(\)[\s\S]{0,180}_queuedThunderStrikeInput = true/,
);
assert.match(
  playerInputSource,
  /return queued \|\| Phaser\.Input\.Keyboard\.JustDown\(this\.keys\.c\)/,
);
assert.match(
  keybindActionsSource,
  /id:\s*["']thunderStrike["'][\s\S]{0,120}defaultKey:\s*["']C["']/,
);
assert.match(timingBarSource, /getPresentedTimingSnapshot/);
assert.match(timingBarViewSource, /getKeyLabel\("thunderStrike"\)/);
assert.match(timingBarViewSource, /windowStartProgress/);
assert.match(timingBarViewSource, /thunderStrikeChainFrame/);
assert.match(timingBarViewSource, /thunderStrikeTargetGate/);
assert.match(timingBarViewSource, /thunderStrikeNeedle/);
assert.match(timingBarViewSource, /thunderStrikeIndicator/);
assert.match(timingBarViewSource, /milestoneChallenge/);
assert.match(timingBarViewSource, /promptPlate/);
assert.match(timingBarViewSource, /ui\.milestones/);
assert.doesNotMatch(timingBarViewSource, /add\.graphics|fillCircle|strokeCircle|lineBetween/);
assert.match(bootSource, /THUNDER_STRIKE_CHAIN_CONFIG\.timingBar\.assetPath/);
assert.match(bootSource, /THUNDER_STRIKE_CHAIN_CONFIG\.timingBar\.targetAssetPath/);
assert.match(bootSource, /THUNDER_STRIKE_CHAIN_CONFIG\.timingBar\.needleAssetPath/);
assert.match(bootSource, /timingBar\.indicatorArt\.assetPaths/);
assert.match(visualHarnessSource, /new ThunderStrikeTimingBarSystem\(this\)/);
assert.match(visualHarnessSource, /keydown-SPACE/);
assert.match(visualHarnessSource, /keydown-\$\{key\}/);
assert.match(visualHarnessSource, /keydown-M/);
assert.match(visualHarnessSource, /"ZERO"/);
assert.match(visualHarnessSource, /THUNDER_STRIKE_CHAIN_CONFIG\.stages\.length - 1/);
assert.match(visualHarnessSource, /successfulContinuations/);
assert.match(visualHarnessSource, /showFailure/);
assert.doesNotMatch(visualHarnessSource, /showSetback|setbacksRemaining|SETBACK/);
assert.match(
  visualHarnessHtml,
  /2026-07-26-thunderstrike-chain-visual-harness\.js/,
);
assert.match(impactSource, /stage\.visual\.shakeSignature/);
assert.match(impactSource, /stage\.visual\.sparkCount/);
assert.match(impactSource, /chainEffectiveDamageMultiplier/);
assert.equal(frameAsset.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(targetGateAsset.subarray(0, 4).toString("ascii"), "RIFF");
assert.equal(needleAsset.subarray(0, 4).toString("ascii"), "RIFF");
for (const indicatorAsset of indicatorAssets) {
  assert.equal(indicatorAsset.subarray(0, 4).toString("ascii"), "RIFF");
}

{
  const gameplayPrototype = {};
  setupGameplayMethods(gameplayPrototype);
  assert.equal(
    gameplayPrototype.updatePlayerVisualState.call({ _isShuttingDown: true }),
    false,
  );
  assert.equal(
    gameplayPrototype.updatePlayerVisualState.call({
      _isShuttingDown: false,
      player: {},
      playerController: {},
    }),
    false,
  );
}

// Phaser removes Sprite.anims before PlayScene's shutdown callback runs. The
// Thunder Strike teardown must cancel gameplay state without restoring visuals.
{
  let cancelledTimeline = 0;
  let cancelledAbility = 0;
  let resetVisuals = 0;
  let timingBarDestroyed = 0;
  let impactFxDestroyed = 0;
  const runtime = Object.assign(
    Object.create(ThunderStrikeActionRuntime.prototype),
    {
      scene: {
        _isShuttingDown: true,
        player: {},
        playerRigContact: { endAction() {} },
        pickaxeTrailSystem: { stop() {} },
      },
      adapter: {
        getTimeline: () => ({ cancel: () => { cancelledTimeline += 1; } }),
        getAbilities: () => ({
          cancelThunderStrikeChain: () => { cancelledAbility += 1; },
        }),
        setLocked() {},
        resetVisuals: () => { resetVisuals += 1; },
      },
      state: { reset() {} },
      timingBar: { destroy: () => { timingBarDestroyed += 1; } },
      impactFx: { destroy: () => { impactFxDestroyed += 1; } },
      animating: true,
      holdUntilMs: 100,
      facingFlipX: null,
      destroyed: false,
    },
  );

  assert.doesNotThrow(() => runtime.destroy());
  assert.doesNotThrow(() => runtime.destroy(), "Thunder Strike teardown must be idempotent");
  assert.equal(cancelledTimeline, 1);
  assert.equal(cancelledAbility, 1);
  assert.equal(resetVisuals, 0);
  assert.equal(timingBarDestroyed, 1);
  assert.equal(impactFxDestroyed, 1);
  assert.equal(runtime.scene, null);
}

console.log("THUNDERSTRIKE_THREE_SLAM_CONTRACT_OK");
