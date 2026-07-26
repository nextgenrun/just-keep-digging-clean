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
  resolveGraveborerWurmFeatureFlags,
} from "../world/playScene/GraveborerWurmBridge.js";

function advance(system, durationMs, context) {
  let remaining = durationMs;
  while (remaining > 0) {
    const step = Math.min(80, remaining);
    system.update(step, context);
    remaining -= step;
  }
}

const targetTile = { tx: 70, ty: 180 };
const productionContext = {
  active: true,
  playerTile: targetTile,
  worldWidthTiles: 320,
};

const defaultFlags = resolveGraveborerWurmFeatureFlags("");
assert.deepEqual(defaultFlags, { enabled: true, devTest10x: false });
assert.deepEqual(
  resolveGraveborerWurmFeatureFlags("?wurm=0&wurm10x=1"),
  { enabled: false, devTest10x: true },
);
assert.deepEqual(
  resolveGraveborerWurmFeatureFlags("?wurm=1&wurm10x=0"),
  { enabled: true, devTest10x: false },
);

const casual = new GraveborerWurmSystem();
casual.recordNoise("devForce", targetTile);
advance(casual, 30000, { ...productionContext, active: false });
assert.equal(casual.getSnapshot().active, false);
assert.equal(casual.phase, GRAVEBORER_WURM_PHASES.dormant);
assert.equal(casual.encounterCount, 0, "Casual play must never start the Hardcore Wurm");

const production = new GraveborerWurmSystem();
production.forceEncounter(targetTile);
production.update(16, productionContext);
assert.equal(production.phase, GRAVEBORER_WURM_PHASES.warning);
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
  GRAVEBORER_WURM_CONFIG.timing.warningMs,
  productionContext,
);
assert.equal(production.phase, GRAVEBORER_WURM_PHASES.burrowing);
advance(
  production,
  GRAVEBORER_WURM_CONFIG.timing.travelMs * 0.7,
  productionContext,
);
const midPassEvents = production.drainEvents();
assert.ok(midPassEvents.some(event => event.type === "carve"));
assert.equal(
  midPassEvents.filter(event => event.type === "hit").length,
  1,
  "A committed Wurm pass may damage the player only once",
);
advance(
  production,
  GRAVEBORER_WURM_CONFIG.timing.travelMs,
  productionContext,
);
const endEvents = production.drainEvents();
assert.equal(production.phase, GRAVEBORER_WURM_PHASES.cooldown);
assert.ok(endEvents.some(event => event.type === "encounter-complete"));
assert.equal(endEvents.filter(event => event.type === "hit").length, 0);

const dev10x = new GraveborerWurmSystem({ devTest10x: true });
advance(dev10x, 2200, productionContext);
assert.equal(dev10x.getActivityMultiplier(), 10);
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

assert.equal(isHardcoreModeArmed(null), false);
assert.equal(
  isHardcoreModeArmed({ mode: "hardcore", armed: true }),
  true,
);
assert.deepEqual(
  sanitizeHardcoreModeData({ mode: "casual", armed: true }),
  { version: 1, mode: "hardcore", armed: true },
);

console.log("Graveborer Wurm Hardcore contract passed.");
