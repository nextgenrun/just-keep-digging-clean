import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EarthquakeSystem } from "../systems/environment/EarthquakeSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { EarthquakeTileFeedbackSystem } from "../systems/visual/EarthquakeTileFeedbackSystem.js";
import { EARTHQUAKE_FEEDBACK_CONFIG } from "../values/earthquakeFeedback.js";
import {
  EARTHQUAKE_CONFIG,
  EARTHQUAKE_SUPPRESSION_UPGRADE,
} from "../values/earthquakes.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readSource = relativePath => readFile(path.join(root, relativePath), "utf8");

function imageDouble() {
  return {
    active: true,
    visible: true,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    x: 0,
    y: 0,
    setOrigin() { return this; },
    setDepth() { return this; },
    setVisible(value) { this.visible = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setTexture(value) { this.texture = value; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      this.scaleX = width / 512;
      this.scaleY = height / 512;
      return this;
    },
    setRotation(value) { this.rotation = value; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    destroy() { this.active = false; },
  };
}

{
  let level = 98;
  let gateAccepted = true;
  const upgrades = new UpgradeSystem(null, {
    get level() { return level; },
    getLevel: () => level,
  });
  upgrades.setMoney(EARTHQUAKE_SUPPRESSION_UPGRADE.goldCost);
  upgrades.setProgressionStateProvider(() => ({
    isDepthGateAccepted: () => gateAccepted,
  }));

  assert.equal(
    upgrades.canPurchaseUpgrade(EARTHQUAKE_SUPPRESSION_UPGRADE.id).reason,
    "requires_player_level",
  );
  level = EARTHQUAKE_SUPPRESSION_UPGRADE.requiresLevel;
  gateAccepted = false;
  assert.equal(
    upgrades.canPurchaseUpgrade(EARTHQUAKE_SUPPRESSION_UPGRADE.id).reason,
    "requires_depth_gate",
  );
  gateAccepted = true;
  assert.equal(upgrades.purchaseUpgrade(EARTHQUAKE_SUPPRESSION_UPGRADE.id).success, true);
  assert.equal(
    upgrades.getUpgradeEffects()[EARTHQUAKE_SUPPRESSION_UPGRADE.effectType],
    1,
    "the one-time purchase must expose a permanent earthquake suppression effect",
  );

  const restored = new UpgradeSystem();
  restored.fromJSON(upgrades.toJSON());
  assert.equal(restored.getUpgradeLevel(EARTHQUAKE_SUPPRESSION_UPGRADE.id), 1);
  assert.equal(
    restored.getUpgradeEffects()[EARTHQUAKE_SUPPRESSION_UPGRADE.effectType],
    1,
    "suppression must round-trip through the existing upgrade save payload",
  );
}

{
  let cancelled = 0;
  let tileFxCleared = 0;
  const system = Object.create(EarthquakeSystem.prototype);
  Object.assign(system, {
    config: EARTHQUAKE_CONFIG,
    suppressed: false,
    nextEventMs: 1000,
    scene: {
      upgradeSystem: {
        getUpgradeLevel: upgradeId => (
          upgradeId === EARTHQUAKE_SUPPRESSION_UPGRADE.id ? 1 : 0
        ),
      },
      earthquakeTileFeedbackSystem: { clear: () => { tileFxCleared += 1; } },
    },
    cancelActiveHazards() { cancelled += 1; },
    _log() {},
  });

  assert.equal(system.syncSuppression(), true);
  assert.equal(cancelled, 1);
  assert.equal(tileFxCleared, 1);
  assert.equal(system.nextEventMs, Number.POSITIVE_INFINITY);
  assert.equal(system.start("major"), false, "debug starts must respect permanent suppression");
}

{
  const scene = {
    config: { tileSize: 94 },
    time: {
      now: 1000,
      delayedCall() { return { remove() {} }; },
    },
    cameras: {
      main: { worldView: { x: 0, y: 0, width: 1280, height: 720 } },
    },
    textures: { exists: () => true },
    add: { image: () => imageDouble() },
  };
  const feedback = new EarthquakeTileFeedbackSystem(scene);

  assert.equal(feedback.showDamage({ tx: 3, ty: 3, destroyed: false }), true);
  assert.equal(
    feedback.pool.find(entry => entry.active)?.image.texture,
    EARTHQUAKE_FEEDBACK_CONFIG.assets.tileFracture.key,
  );
  assert.equal(feedback.showDamage({ tx: 5, ty: 3, destroyed: true }), true);
  assert.equal(feedback.showRestore({ tx: 7, ty: 3 }), true);
  assert.equal(feedback.showCaveInFracture({ tx: 9, ty: 3 }), true);
  assert.equal(feedback.getStatus().active, 4);
  assert.equal(feedback.showDamage({ tx: 200, ty: 200 }), false, "offscreen effects must be culled");
  assert.equal(feedback.getStatus().capacity, EARTHQUAKE_FEEDBACK_CONFIG.tileFx.poolSize);
  feedback.destroy();
}

const [systemSource, setupSource, shopSource, tileFxSource, lifecycleSource] = await Promise.all([
  readSource("systems/environment/EarthquakeSystem.js"),
  readSource("world/playScene/PlaySceneSetup.js"),
  readSource("ui/overlays/ShopOverlay.js"),
  readSource("systems/visual/EarthquakeTileFeedbackSystem.js"),
  readSource("world/playScene/PlaySceneLifecycle.js"),
]);

assert.ok(systemSource.includes("syncSuppression()"));
assert.ok(systemSource.includes("this.scene.worldRenderer.applyTileUpdate(tx, ty);"));
assert.ok(systemSource.includes("earthquakeTileFeedbackSystem?.showDamage?.({"));
assert.ok(systemSource.includes("earthquakeTileFeedbackSystem?.showCaveInFracture?.({"));
assert.ok(systemSource.includes("earthquakeTileFeedbackSystem?.showRestore?.({"));
assert.ok(setupSource.includes("new EarthquakeTileFeedbackSystem(this)"));
assert.ok(lifecycleSource.includes('"earthquakeTileFeedbackSystem"'));
assert.ok(shopSource.includes("earthquakeSystem?.syncSuppression?.()"));
assert.ok(shopSource.includes("upgrade.purchaseCopy"));
assert.ok(!tileFxSource.includes("add.graphics"));
assert.ok(!tileFxSource.includes("fillCircle"));
assert.ok(!tileFxSource.includes("fillRect"));

console.log("earthquake polish and suppression contract passed");
