import { GRAVEBORER_WURM_PHASES } from "../../values/graveborerWurm.js";
import { resolveGraveborerWurmDifficulty } from "./graveborerWurmDifficulty.js";
import { copyGraveborerTile } from "./graveborerWurmPath.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function createRestingDifficulty(config, devTest10x) {
  return resolveGraveborerWurmDifficulty(
    config.activation.minDepthTiles,
    1,
    devTest10x,
    config,
  );
}

export function createGraveborerWurmInitialState(config, devTest10x) {
  return {
    active: false,
    phase: GRAVEBORER_WURM_PHASES.dormant,
    noise: 0,
    cooldownMs: config.timing.initialCooldownMs,
    warningRemainingMs: 0,
    progress: 0,
    encounterCount: 0,
    encounterDepthTiles: 0,
    passIndex: 0,
    passCount: 0,
    huntHitCount: 0,
    targetTile: null,
    lastNoiseTile: null,
    direction: 1,
    hitCount: 0,
    hitConsumed: false,
    difficulty: createRestingDifficulty(config, devTest10x),
    _lastCarveProgress: 0,
    _path: null,
  };
}

export function createGraveborerWurmForcedState(config, devTest10x) {
  return {
    phase: GRAVEBORER_WURM_PHASES.dormant,
    cooldownMs: 0,
    noise: config.noise.maximum,
    warningRemainingMs: 0,
    progress: 0,
    encounterDepthTiles: 0,
    passIndex: 0,
    passCount: 0,
    huntHitCount: 0,
    hitCount: 0,
    hitConsumed: false,
    difficulty: createRestingDifficulty(config, devTest10x),
    _lastCarveProgress: 0,
    _path: null,
  };
}

export function createGraveborerWurmCooldownState(config, devTest10x) {
  return {
    phase: GRAVEBORER_WURM_PHASES.cooldown,
    cooldownMs: config.timing.cooldownMs,
    warningRemainingMs: 0,
    progress: 0,
    noise: 0,
    encounterDepthTiles: 0,
    passIndex: 0,
    passCount: 0,
    huntHitCount: 0,
    targetTile: null,
    lastNoiseTile: null,
    hitCount: 0,
    hitConsumed: false,
    difficulty: createRestingDifficulty(config, devTest10x),
    _lastCarveProgress: 0,
    _path: null,
  };
}

export function createGraveborerWurmSnapshot(system) {
  return {
    enabled: system.enabled,
    devTest10x: system.devTest10x,
    activityMultiplier: system.getActivityMultiplier(),
    active: system.active,
    phase: system.phase,
    noise: system.noise,
    noiseRatio: clamp(system.noise / system.config.noise.threshold, 0, 1),
    cooldownMs: system.cooldownMs,
    warningRemainingMs: system.warningRemainingMs,
    progress: system.progress,
    encounterCount: system.encounterCount,
    encounterDepthTiles: system.encounterDepthTiles,
    passIndex: system.passIndex,
    passCount: system.passCount,
    huntHitCount: system.huntHitCount,
    difficulty: { ...system.difficulty },
    targetTile: copyGraveborerTile(system.targetTile),
    hitCount: system.hitCount,
    hitConsumed: system.hitConsumed,
  };
}
