import assert from "node:assert/strict";
import {
  GraveborerWurmSystem,
} from "../systems/environment/GraveborerWurmSystem.js";
import {
  GRAVEBORER_WURM_CONFIG,
  GRAVEBORER_WURM_PHASES,
  sanitizeGraveborerWurmData,
} from "../values/graveborerWurm.js";
import {
  isHardcoreModeArmed,
  sanitizeHardcoreModeData,
} from "../values/hardcoreMode.js";
import {
  getGraveborerWurmSaveData,
  forceGraveborerWurmEncounter,
  resolveGraveborerWurmActivation,
  resolveGraveborerWurmFeatureFlags,
} from "../world/playScene/GraveborerWurmBridge.js";
import {
  resolveGraveborerWurmCollision,
  resolveGraveborerWurmSweptCollision,
} from "../systems/environment/graveborerWurmPath.js";
import {
  resolveGraveborerWurmDifficulty,
} from "../systems/environment/graveborerWurmDifficulty.js";
import {
  handleGraveborerWurmEvents,
} from "../world/playScene/GraveborerWurmEventBridge.js";

function advance(system, durationMs, context) {
  let remaining = durationMs;
  while (remaining > 0) {
    const step = Math.min(GRAVEBORER_WURM_CONFIG.timing.maxFrameMs, remaining);
    system.update(step, context);
    remaining -= step;
  }
}

const targetTile = { tx: 70, ty: 180 };
const productionContext = {
  active: true,
  playerTile: targetTile,
  worldWidthTiles: 320,
  depth: GRAVEBORER_WURM_CONFIG.activation.minDepthTiles,
};

const defaultFlags = resolveGraveborerWurmFeatureFlags("", true);
assert.deepEqual(defaultFlags, { enabled: true, devTest10x: false });
assert.deepEqual(
  resolveGraveborerWurmFeatureFlags("?wurm=0&wurm10x=1", true),
  { enabled: false, devTest10x: true },
);
assert.deepEqual(
  resolveGraveborerWurmFeatureFlags("?wurm=1&wurm10x=0", true),
  { enabled: true, devTest10x: false },
);
assert.deepEqual(
  resolveGraveborerWurmFeatureFlags("?wurm=0&wurm10x=1", false),
  { enabled: true, devTest10x: false },
  "Production must ignore both developer Wurm query flags",
);
const disabledByFlag = new GraveborerWurmSystem(
  resolveGraveborerWurmFeatureFlags("?wurm=0&wurm10x=1", true),
);
advance(disabledByFlag, 30000, {
  active: true,
  playerTile: { tx: 50, ty: 184 },
  worldWidthTiles: 320,
});
assert.equal(disabledByFlag.getSnapshot().active, false);
assert.equal(disabledByFlag.encounterCount, 0);

const gateSystem = new GraveborerWurmSystem();
const gateScene = {
  config: { topAirRows: 65 },
  hardcoreModeData: { mode: "casual", armed: false },
  upgradeSystem: { isGemPowerUnlocked: () => true },
};
assert.equal(
  resolveGraveborerWurmActivation(gateScene, { tx: 50, ty: 184 }, gateSystem).active,
  false,
  "The production Wurm must be absent from Casual play",
);
gateScene.hardcoreModeData = { mode: "hardcore", armed: true };
gateScene.upgradeSystem.isGemPowerUnlocked = () => false;
assert.equal(
  resolveGraveborerWurmActivation(gateScene, { tx: 50, ty: 184 }, gateSystem).active,
  false,
  "Hardcore Wurm must wait for Flight unlock",
);
gateScene.upgradeSystem.isGemPowerUnlocked = () => true;
assert.equal(
  resolveGraveborerWurmActivation(gateScene, { tx: 50, ty: 183 }, gateSystem).active,
  false,
  "Hardcore Wurm must wait until the configured minimum depth",
);
assert.equal(
  resolveGraveborerWurmActivation(gateScene, { tx: 50, ty: 184 }, gateSystem).active,
  true,
);
gateSystem.setDevTest10x(true);
gateScene.hardcoreModeData = { mode: "casual", armed: false };
gateScene.upgradeSystem.isGemPowerUnlocked = () => false;
assert.equal(
  resolveGraveborerWurmActivation(gateScene, { tx: 50, ty: 65 }, gateSystem).active,
  true,
  "The explicit 10x developer flag must bypass mode, Flight, and depth gates",
);
gateSystem.setDevTest10x(false);
assert.equal(
  resolveGraveborerWurmActivation(
    gateScene,
    { tx: 50, ty: 65 },
    gateSystem,
    true,
  ).active,
  true,
  "The dev summon button must bypass gates only for its forced hunt",
);

const casual = new GraveborerWurmSystem();
casual.recordNoise("devForce", targetTile);
const casualNoiseBeforeDecay = casual.noise;
advance(casual, 30000, { ...productionContext, active: false });
assert.equal(casual.getSnapshot().active, false);
assert.equal(casual.phase, GRAVEBORER_WURM_PHASES.dormant);
assert.equal(casual.encounterCount, 0, "Casual play must never start the Hardcore Wurm");
assert.ok(casual.noise < casualNoiseBeforeDecay, "Inactive surface noise must decay instead of freezing");

const production = new GraveborerWurmSystem();
production.forceEncounter(targetTile);
production.update(16, productionContext);
assert.equal(production.phase, GRAVEBORER_WURM_PHASES.warning);
assert.equal(production.passIndex, 1);
assert.equal(
  production.passCount,
  GRAVEBORER_WURM_CONFIG.difficulty.passCountAtStart,
  "Even the first production hunt must make multiple committed passes",
);
assert.deepEqual(production.targetTile, targetTile);
const committedTarget = { ...production.targetTile };
advance(production, 1200, {
  ...productionContext,
  playerTile: { tx: targetTile.tx + 8, ty: targetTile.ty - 5 },
});
assert.deepEqual(
  production.targetTile,
  committedTarget,
  "The Wurm warning must commit and never home onto the player",
);

advance(
  production,
  production.warningRemainingMs,
  productionContext,
);
assert.equal(production.phase, GRAVEBORER_WURM_PHASES.burrowing);
advance(
  production,
  production.difficulty.travelMs * 0.7,
  productionContext,
);
const midPassEvents = production.drainEvents();
assert.ok(midPassEvents.some(event => event.type === "carve"));
assert.equal(
  midPassEvents.filter(event => event.type === "hit").length,
  1,
  "A committed Wurm pass may damage the player only once",
);
const firstPassDirection = production.direction;
const secondTarget = { tx: targetTile.tx + 12, ty: targetTile.ty + 3 };
advance(
  production,
  production.difficulty.travelMs
    * (GRAVEBORER_WURM_CONFIG.path.encounterEndProgress - production.progress)
    + GRAVEBORER_WURM_CONFIG.timing.maxFrameMs,
  { ...productionContext, playerTile: secondTarget },
);
const repeatEvents = production.drainEvents();
assert.equal(production.phase, GRAVEBORER_WURM_PHASES.warning);
assert.equal(production.passIndex, 2);
assert.deepEqual(production.targetTile, secondTarget);
assert.equal(production.direction, -firstPassDirection);
assert.ok(
  repeatEvents.some(event => event.type === "phase" && event.repeatedPass === true),
  "The Wurm must visibly re-telegraph every repeated pass",
);
const secondCommittedTarget = { ...production.targetTile };
advance(production, 1000, {
  ...productionContext,
  playerTile: { tx: secondTarget.tx + 20, ty: secondTarget.ty - 12 },
});
assert.deepEqual(
  production.targetTile,
  secondCommittedTarget,
  "A repeated pass must remain committed after its new warning begins",
);
const dodgeContext = {
  ...productionContext,
  playerTile: { tx: secondTarget.tx + 30, ty: secondTarget.ty - 20 },
};
advance(production, production.warningRemainingMs, dodgeContext);
assert.equal(production.phase, GRAVEBORER_WURM_PHASES.burrowing);
advance(
  production,
  production.difficulty.travelMs
    * GRAVEBORER_WURM_CONFIG.path.encounterEndProgress
    + GRAVEBORER_WURM_CONFIG.timing.maxFrameMs,
  dodgeContext,
);
const endEvents = production.drainEvents();
assert.equal(production.phase, GRAVEBORER_WURM_PHASES.cooldown);
const completedHunt = endEvents.find(event => event.type === "encounter-complete");
assert.equal(completedHunt?.completedPasses, 2);
assert.equal(completedHunt?.huntHitCount, 1);

const shallowDanger = resolveGraveborerWurmDifficulty(120, 1);
const deepDanger = resolveGraveborerWurmDifficulty(
  GRAVEBORER_WURM_CONFIG.difficulty.fullDangerDepthTiles,
  1,
);
const finalDeepPass = resolveGraveborerWurmDifficulty(
  GRAVEBORER_WURM_CONFIG.difficulty.fullDangerDepthTiles,
  deepDanger.passCount,
);
assert.equal(shallowDanger.passCount, 2);
assert.equal(
  deepDanger.passCount,
  GRAVEBORER_WURM_CONFIG.difficulty.maximumPassCount,
);
assert.ok(deepDanger.warningMs < shallowDanger.warningMs);
assert.ok(deepDanger.travelMs < shallowDanger.travelMs);
assert.ok(deepDanger.headDamageRatio > shallowDanger.headDamageRatio);
assert.ok(finalDeepPass.warningMs <= deepDanger.warningMs);
assert.ok(finalDeepPass.travelMs <= deepDanger.travelMs);
assert.ok(finalDeepPass.headDamageRatio > deepDanger.headDamageRatio);
assert.ok(
  shallowDanger.warningMs <= 3600,
  "The first live pass must give at most 3.6 seconds of warning",
);
assert.ok(
  finalDeepPass.warningMs <= 1200,
  "The final deep pass must shrink to a 1.2-second lethal telegraph",
);
assert.ok(
  shallowDanger.travelMs <= 1900,
  "Even a shallow Wurm must cross its path much faster than the old profile",
);
assert.ok(
  finalDeepPass.travelMs <= 550,
  "A final deep pass must become a near-instant committed breach",
);
assert.ok(
  shallowDanger.headDamageRatio >= 0.95,
  "A first-pass shallow head strike must leave at most critical GP",
);
assert.ok(
  shallowDanger.bodyDamageRatio >= 0.75,
  "Even a shallow body clip must remove most max GP",
);
assert.ok(
  deepDanger.headDamageRatio >= 1,
  "A deep direct head strike must kill from full GP",
);
assert.ok(
  finalDeepPass.bodyDamageRatio >= 1,
  "Late deep body contact must also become instantly fatal",
);
assert.ok(
  finalDeepPass.headDamageRatio
    <= GRAVEBORER_WURM_CONFIG.difficulty.maximumHeadDamageRatio,
  "Lethal depth danger must remain bounded by its explicit cap",
);

function applyContractWurmHit(difficulty, part, initialGp = 1000) {
  let gp = initialGp;
  const notices = [];
  const damageContexts = [];
  const runtime = {
    lastGate: { hardcoreArmed: true, devOverride: false },
    system: {
      drainEvents: () => [{
        type: "hit",
        part,
        damageRatio: part === "head"
          ? difficulty.headDamageRatio
          : difficulty.bodyDamageRatio,
        minimumDamageGp: part === "head"
          ? difficulty.minimumHeadDamageGp
          : difficulty.minimumBodyDamageGp,
        passIndex: difficulty.passIndex,
        passCount: difficulty.passCount,
      }],
    },
  };
  const scene = {
    playerController: {
      getGemPowerExact: () => gp,
      getGemPowerMax: () => 1000,
      consumeGemPower: (amount, context) => {
        const consumed = Math.min(gp, amount);
        gp -= consumed;
        damageContexts.push(context);
        return consumed;
      },
    },
    uiNotifications: {
      danger: message => notices.push(message),
    },
    soundSystem: { playTileBreak: () => {} },
    shakeSystem: { shake: () => {} },
    queueDugTilesSave: () => {},
  };
  handleGraveborerWurmEvents(scene, runtime);
  return { gp, notices, damageContexts, lastHit: runtime.lastHit };
}

const shallowHeadHit = applyContractWurmHit(shallowDanger, "head");
assert.equal(shallowHeadHit.gp, 40);
assert.match(
  shallowHeadHit.notices[0],
  new RegExp(GRAVEBORER_WURM_CONFIG.labels.criticalHitPrefix),
);
assert.equal(shallowHeadHit.damageContexts[0]?.source, "graveborerWurm");

const woundedShallowHeadHit = applyContractWurmHit(shallowDanger, "head", 800);
assert.equal(
  woundedShallowHeadHit.gp,
  0,
  "A shallow direct strike must execute a player who was not nearly full",
);
assert.match(
  woundedShallowHeadHit.notices[0],
  new RegExp(GRAVEBORER_WURM_CONFIG.labels.fatalHitPrefix),
);

const deepHeadHit = applyContractWurmHit(deepDanger, "head");
assert.equal(deepHeadHit.gp, 0, "Deep head contact must trigger zero-GP death");

const finalDeepBodyHit = applyContractWurmHit(finalDeepPass, "body");
assert.equal(
  finalDeepBodyHit.gp,
  0,
  "A final deep body hit must trigger zero-GP death",
);

const productionFrequency = new GraveborerWurmSystem().getActivityMultiplier();
const devFrequency = new GraveborerWurmSystem({ devTest10x: true })
  .getActivityMultiplier();
assert.equal(
  productionFrequency / devFrequency,
  GRAVEBORER_WURM_CONFIG.frequency.liveOccurrenceRatioVsDev,
  "Live eligibility and cooldown progression must be 90% lower than 10x dev",
);

const dev10x = new GraveborerWurmSystem({ devTest10x: true });
advance(dev10x, 2200, productionContext);
assert.equal(
  dev10x.getActivityMultiplier(),
  GRAVEBORER_WURM_CONFIG.frequency.devActivityMultiplier,
);
assert.equal(
  dev10x.phase,
  GRAVEBORER_WURM_PHASES.warning,
  "10x dev mode should quickly self-trigger without mining",
);
assert.ok(
  dev10x.warningRemainingMs <= GRAVEBORER_WURM_CONFIG.timing.devWarningMs
    && dev10x.warningRemainingMs
      >= GRAVEBORER_WURM_CONFIG.timing.devWarningMs - 600,
);

const summonedSystem = new GraveborerWurmSystem();
const summonNotices = [];
const summonScene = {
  graveborerWurmRuntime: {
    system: summonedSystem,
    devToolsEnabled: true,
    forcedDevEncounter: false,
    devSaveIsolation: false,
  },
  playerController: { getPlayerTile: () => targetTile },
  uiNotifications: {
    warning: message => summonNotices.push(message),
  },
  soundSystem: { playTileHit: () => {} },
  shakeSystem: { shake: () => {} },
};
assert.equal(forceGraveborerWurmEncounter(summonScene), true);
assert.equal(summonScene.graveborerWurmRuntime.forcedDevEncounter, true);
assert.equal(summonScene.graveborerWurmRuntime.devSaveIsolation, true);
assert.equal(summonedSystem.noise, GRAVEBORER_WURM_CONFIG.noise.maximum);
assert.deepEqual(summonedSystem.lastNoiseTile, targetTile);
assert.deepEqual(summonNotices, [GRAVEBORER_WURM_CONFIG.labels.devSummoned]);
summonScene.hardcoreModeData = { mode: "hardcore", armed: true };
const isolatedDevSave = getGraveborerWurmSaveData(summonScene);
assert.equal(isolatedDevSave.phase, GRAVEBORER_WURM_PHASES.dormant);
assert.equal(isolatedDevSave.passCount, 0);
assert.equal(
  isolatedDevSave.cooldownMs,
  GRAVEBORER_WURM_CONFIG.timing.initialCooldownMs,
  "A dev-button hunt must not contaminate even an armed Hardcore save",
);
assert.equal(
  forceGraveborerWurmEncounter({
    graveborerWurmRuntime: {
      system: new GraveborerWurmSystem(),
      devToolsEnabled: false,
    },
  }),
  false,
  "The summon function must be unavailable outside the development runtime",
);

const restored = new GraveborerWurmSystem();
restored.loadSaveData({
  phase: GRAVEBORER_WURM_PHASES.burrowing,
  targetTile,
  progress: 0.48,
  direction: -1,
  hitConsumed: false,
});
assert.equal(restored.phase, GRAVEBORER_WURM_PHASES.warning);
assert.equal(
  restored.warningRemainingMs,
  GRAVEBORER_WURM_CONFIG.timing.restoredWarningMinMs,
  "Reloaded lethal passes must be re-telegraphed",
);
assert.equal(restored.passIndex, 1);
assert.equal(restored.passCount, 2);
const restoredAfterHit = new GraveborerWurmSystem();
restoredAfterHit.loadSaveData({
  phase: GRAVEBORER_WURM_PHASES.burrowing,
  targetTile,
  direction: -1,
  encounterDepthTiles: 800,
  passIndex: 1,
  passCount: 3,
  hitCount: 1,
  huntHitCount: 1,
  hitConsumed: true,
});
assert.equal(restoredAfterHit.phase, GRAVEBORER_WURM_PHASES.warning);
assert.equal(restoredAfterHit.passIndex, 2);
assert.equal(restoredAfterHit.passCount, 3);
assert.equal(restoredAfterHit.direction, 1);
assert.equal(restoredAfterHit.hitCount, 0);
assert.equal(restoredAfterHit.hitConsumed, false);
assert.equal(
  restoredAfterHit.warningRemainingMs,
  GRAVEBORER_WURM_CONFIG.timing.restoredWarningMinMs,
  "Reloading after a hit must advance to the next owed pass without double-hitting",
);
const restoredOneMsWarning = new GraveborerWurmSystem();
restoredOneMsWarning.loadSaveData({
  phase: GRAVEBORER_WURM_PHASES.warning,
  targetTile,
  warningRemainingMs: 1,
  hitCount: 0,
});
assert.equal(
  restoredOneMsWarning.warningRemainingMs,
  GRAVEBORER_WURM_CONFIG.timing.restoredWarningMinMs,
  "A saved 1 ms warning must not breach on the first loaded frame",
);

const tailOnlyCollision = resolveGraveborerWurmCollision({
  head: { kind: "head", visible: false },
  bodies: [],
  tail: { kind: "tail", visible: true, x: 9.5, y: 9.5 },
}, {
  left: 9.9,
  right: 10.2,
  top: 9.9,
  bottom: 10.2,
}, GRAVEBORER_WURM_CONFIG);
assert.equal(tailOnlyCollision?.part, "tail", "The visible tail must share body collision");

const highSpeedPreviousState = {
  head: { kind: "head", visible: true, x: 2, y: 5 },
  bodies: [],
  tail: { kind: "tail", visible: false },
};
const highSpeedCurrentState = {
  head: { kind: "head", visible: true, x: 8, y: 5 },
  bodies: [],
  tail: { kind: "tail", visible: false },
};
const crossedPlayerBounds = {
  left: 5,
  right: 5.2,
  top: 5.2,
  bottom: 5.8,
};
assert.equal(
  resolveGraveborerWurmCollision(
    highSpeedPreviousState,
    crossedPlayerBounds,
    GRAVEBORER_WURM_CONFIG,
  ),
  null,
);
assert.equal(
  resolveGraveborerWurmCollision(
    highSpeedCurrentState,
    crossedPlayerBounds,
    GRAVEBORER_WURM_CONFIG,
  ),
  null,
);
assert.equal(
  resolveGraveborerWurmSweptCollision(
    highSpeedPreviousState,
    highSpeedCurrentState,
    crossedPlayerBounds,
    GRAVEBORER_WURM_CONFIG,
  )?.part,
  "head",
  "A fast Wurm must not tunnel through the player between rendered frames",
);
assert.equal(
  resolveGraveborerWurmSweptCollision(
    highSpeedPreviousState,
    highSpeedCurrentState,
    {
      left: 5,
      right: 5.2,
      top: 6.4,
      bottom: 6.8,
    },
    GRAVEBORER_WURM_CONFIG,
  ),
  null,
  "Swept collision must not punish a player who cleared the committed line",
);

const cleanSavedState = sanitizeGraveborerWurmData({
  noise: Number.POSITIVE_INFINITY,
  progress: -8,
  direction: 7,
  hitConsumed: true,
});
assert.equal(cleanSavedState.noise, 0);
assert.equal(cleanSavedState.progress, 0);
assert.equal(cleanSavedState.direction, 1);
assert.equal(cleanSavedState.hitConsumed, true);
assert.equal(cleanSavedState.hitCount, 1);
assert.deepEqual(
  getGraveborerWurmSaveData({
    graveborerWurmRuntime: null,
    graveborerWurmData: cleanSavedState,
  }),
  cleanSavedState,
  "A queued shutdown save must retain cached Wurm state after runtime teardown",
);

assert.equal(isHardcoreModeArmed(null), false);
assert.equal(
  isHardcoreModeArmed({ mode: "hardcore", armed: true }),
  true,
);
assert.deepEqual(
  sanitizeHardcoreModeData({ mode: "casual", armed: true }),
  {
    version: 3,
    mode: "casual",
    armed: false,
    stress: 0,
    peakStress: 0,
    selectedAt: 0,
    armedAt: 0,
    lastUnstuckAt: 0,
    activePlayMs: 0,
    unstuckUses: 0,
    paidTeleports: 0,
    teleportMoneySpent: 0,
  },
);

console.log("Graveborer Wurm Hardcore contract passed.");
