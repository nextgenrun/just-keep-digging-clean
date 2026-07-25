import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FlightFootParticleSystem } from "../systems/visual/FlightFootParticleSystem.js";
import { PLAYER_FLIGHT_FOOT_FX_CONFIG as config } from "../values/playerFlightFootFx.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const spawned = [];
const tweenConfigs = [];
const player = {
  x: 100,
  y: 200,
  displayWidth: 109,
  displayHeight: 109,
  depth: 30,
  angle: 0,
  rotation: 0,
  flipX: false,
  active: true,
  visible: true,
  texture: { key: "survival-blender-v2-fly-sheet" },
};
const scene = {
  add: {
    circle(x, y, radius, color, alpha) {
      const particle = {
        x, y, radius, color, alpha,
        destroyed: false,
        setDepth(value) { this.depth = value; return this; },
        setBlendMode(value) { this.blendMode = value; return this; },
        destroy() { this.destroyed = true; },
      };
      spawned.push(particle);
      return particle;
    },
  },
  tweens: {
    add(tween) { tweenConfigs.push(tween); return tween; },
    killTweensOf() {},
  },
};
const profile = {
  visualSkin: config.requiredVisualSkin,
  flySheet: "survival-blender-v2-fly-sheet",
};
const system = new FlightFootParticleSystem(scene, player, profile);
const originalRandom = Math.random;

try {
  Math.random = () => 0.5;
  system.update(16, false);
  assert.equal(spawned.length, 0, "inactive flight emitted particles");

  system.update(16, true);
  assert.equal(spawned.length, 2, "flight start did not emit one particle per foot");
  assert.ok(spawned.every((particle) => particle.x < player.x), "right-facing feet were not behind the player");
  assert.ok(spawned.every((particle) => particle.depth === player.depth + config.depthOffset));

  system.update(config.spawnIntervalMs, true);
  assert.equal(spawned.length, 4, "sustained flight cadence did not emit the next foot pair");

  system.update(0, false);
  player.flipX = true;
  system.update(0, true);
  assert.equal(spawned.length, 6);
  assert.ok(spawned.slice(-2).every((particle) => particle.x > player.x), "left-facing feet did not mirror");

  system.update(0, false);
  player.texture.key = "survival-blender-v2-idle-sheet";
  system.update(200, true);
  assert.equal(spawned.length, 6, "non-flight texture emitted foot particles");

  tweenConfigs.forEach((tween) => tween.onComplete());
  assert.ok(spawned.every((particle) => particle.destroyed), "completed particles were not destroyed");
  system.destroy();
} finally {
  Math.random = originalRandom;
}

const setup = readFileSync(resolve(root, "world/playScene/PlaySceneSetup.js"), "utf8");
const update = readFileSync(resolve(root, "world/playScene/PlaySceneUpdate.js"), "utf8");
const cave = readFileSync(resolve(root, "world/playScene/CaveGameplayController.js"), "utf8");
const inventoryReview = readFileSync(resolve(root, "testing/animation-sandbox/current-animation-inventory-v1/app.js"), "utf8");
assert.match(setup, /new FlightFootParticleSystem/);
assert.match(update, /flightFootParticleSystem\?\.update/);
assert.match(cave, /new FlightFootParticleSystem[\s\S]+flightFootParticleSystem\?\.update/);
assert.match(inventoryReview, /survival-ual-player-v1-flight-travel-loop-anim/);
assert.match(inventoryReview, /drawFlightFootTrails\(drawX, drawY, dw, dh\)/);
assert.match(inventoryReview, /live twin-foot trail preview/);
assert.ok(readFileSync(resolve(root, "systems/visual/FlightFootParticleSystem.js"), "utf8").split("\n").length <= 180);

console.log("PLAYER_FLIGHT_FOOT_PARTICLE_CONTRACT_OK", {
  footCount: config.footOffsets.length,
  spawnIntervalMs: config.spawnIntervalMs,
  mainWorld: true,
  compactCaves: true,
  liveInventoryPreview: true,
});
