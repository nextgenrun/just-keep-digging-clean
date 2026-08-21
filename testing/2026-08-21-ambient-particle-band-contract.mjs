import assert from "node:assert/strict";

import { AmbientParticleSystem } from "../systems/environment/AmbientParticleSystem.js";
import {
  AMBIENT_PARTICLE_CONFIG,
  resolveAmbientParticleDepthBand,
} from "../values/ambientParticleConfig.js";

globalThis.Phaser = {
  Scenes: { Events: { UPDATE: "update" } },
  BlendModes: { ADD: 1 },
};

assert.equal(resolveAmbientParticleDepthBand(3), null);
assert.equal(resolveAmbientParticleDepthBand(4)?.id, "shallow-earth");
assert.equal(resolveAmbientParticleDepthBand(500)?.id, "mineral-veins");
assert.equal(resolveAmbientParticleDepthBand(1000)?.id, "deep-forge");
assert.equal(resolveAmbientParticleDepthBand(3000)?.id, "abyssal-crystal");
assert.equal(new Set(AMBIENT_PARTICLE_CONFIG.depthBands.map((band) => band.moteColor)).size, 4);

let insideBuilding = false;
const particles = [];
const killed = [];
const listeners = new Map();
const scene = {
  config: { tileSize: 94, topAirRows: 0 },
  player: { x: 300, y: 1200 * 94 },
  game: { loop: { actualFps: 60 } },
  cameras: { main: { worldView: { x: 0, y: 0, width: 800, height: 600 } } },
  getEnvironmentOccupancySnapshot: () => ({ insideBuilding }),
  events: {
    on(event, listener) { listeners.set(event, listener); },
    off(event, listener) {
      if (listeners.get(event) === listener) listeners.delete(event);
    },
  },
  add: {
    circle(x, y, size, color, alpha) {
      const particle = {
        x,
        y,
        size,
        color,
        alpha,
        destroyed: false,
        setDepth() { return this; },
        setBlendMode() { return this; },
        destroy() { this.destroyed = true; },
      };
      particles.push(particle);
      return particle;
    },
  },
  tweens: {
    add() { return {}; },
    killTweensOf(particle) { killed.push(particle); },
  },
};

const config = {
  ...AMBIENT_PARTICLE_CONFIG,
  maxParticles: 2,
  spawnIntervalMs: 1,
  debris: { ...AMBIENT_PARTICLE_CONFIG.debris, enabled: false },
};
const system = new AmbientParticleSystem(scene, config);
system.create();
assert.equal(typeof listeners.get("update"), "function");

const originalRandom = Math.random;
Math.random = () => 0.5;
try {
  system._tick(2);
} finally {
  Math.random = originalRandom;
}

assert.equal(particles.length, 1);
assert.equal(particles[0].color, resolveAmbientParticleDepthBand(1200)?.moteColor);
assert.equal(system.getSnapshot().depthBandId, "deep-forge");
assert.equal(system.getSnapshot().admissionReason, "spawned");

insideBuilding = true;
system._tick(3);
assert.equal(system.getSnapshot().admissionReason, "inside-building");
assert.equal(system.getSnapshot().liveParticles, 0);
assert.equal(particles[0].destroyed, true);
assert.deepEqual(killed, [particles[0]]);

system.destroy();
assert.equal(listeners.has("update"), false);

console.log("AMBIENT_PARTICLE_BAND_CONTRACT_OK", {
  bands: AMBIENT_PARTICLE_CONFIG.depthBands.map((band) => band.id),
  buildingSuppression: true,
  diagnosticSnapshot: true,
});
