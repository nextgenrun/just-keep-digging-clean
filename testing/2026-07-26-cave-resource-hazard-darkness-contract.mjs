import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CaveHazardSystem, resolveCaveHazardState } from "../systems/environment/CaveHazardSystem.js";
import { LightSystem } from "../systems/lighting/LightSystem.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { CAVE_GAMEPLAY_CONFIG } from "../values/caveGameplay.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";
import { RESOURCE_BY_TILE_TYPE } from "../values/resourceTypes.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WorldModel } from "../world/model/WorldModel.js";

const worldA = new WorldModel(GAME_CONFIG);
const worldB = new WorldModel(GAME_CONFIG);

const seamSignature = world => world.caveResourceSeams.map(seam => (
  `${seam.caveId}:${seam.tx},${seam.ty}:${seam.tileType}:${seam.formationIndex}`
));
const hazardSignature = world => world.caveHazardZones.map(hazard => (
  `${hazard.id}:${hazard.kind}:${hazard.startTx}-${hazard.endTx}:${hazard.phaseMs}`
));
assert.deepEqual(seamSignature(worldA), seamSignature(worldB), "resource seams are deterministic");
assert.deepEqual(hazardSignature(worldA), hazardSignature(worldB), "cave hazards are deterministic");

const levelOneCaves = worldA.caveZones.filter(zone => zone.source !== "second-world");
const levelOneChallengeCaves = levelOneCaves.filter(zone => zone.hazards?.length);
assert.ok(levelOneCaves.length >= 25, "Level One retains at least 25 integrated caves");
assert.ok(levelOneChallengeCaves.length >= 4, "Level One exposes several hazard rooms");
assert.ok(worldA.caveResourceSeams.length >= 500, "the world contains hundreds of real seam blocks");
assert.ok(worldA.caveHazardZones.length >= 60, "hazards remain meaningful without filling every cave");
assert.ok(
  worldA.caveHazardZones.length < worldA.caveZones.length,
  "safe caves remain common enough to preserve contrast",
);
assert.deepEqual(
  new Set(worldA.caveHazardZones.map(hazard => hazard.kind)),
  new Set(["timed-gate", "spike-run", "ember-vent"]),
  "timing, Flight, and vent challenge grammars all exist",
);

for (const seam of worldA.caveResourceSeams) {
  const cave = worldA.caveZones.find(zone => zone.id === seam.caveId);
  assert.ok(cave, `${seam.caveId} resolves to a live cave`);
  assert.ok(RESOURCE_BY_TILE_TYPE[seam.tileType], "seams use renderer-backed resource tile types");
  assert.equal(worldA.getTileType(seam.tx, seam.ty), seam.tileType);
  assert.ok(worldA.getTileHp(seam.tx, seam.ty) > 0, "seam blocks have real mining HP");
  assert.equal(worldA.authoredTileMask[worldA.index(seam.tx, seam.ty)], 0);
  assert.notEqual(seam.ty, Math.round(cave.cy), "seams preserve the cave travel lane");
}

for (const hazard of worldA.caveHazardZones) {
  assert.equal(hazard.leftCheckpoint.tx, hazard.startTx - 1);
  assert.equal(hazard.rightCheckpoint.tx, hazard.endTx + 1);
  for (const checkpoint of [hazard.leftCheckpoint, hazard.rightCheckpoint]) {
    assert.equal(checkpoint.ty, hazard.floorY - 1);
    assert.equal(worldA.getTileType(checkpoint.tx, checkpoint.ty), TILE_TYPES.AIR);
    assert.equal(worldA.isSolid(checkpoint.tx, checkpoint.ty + 1), true);
  }
  for (let tx = hazard.startTx; tx <= hazard.endTx; tx += 1) {
    assert.equal(worldA.getTileType(tx, hazard.floorY - 1), TILE_TYPES.AIR);
    assert.equal(worldA.isSolid(tx, hazard.floorY), true);
  }
}
assert.equal(
  worldA.caveLightZones.filter(zone => zone.isHazardLight).length,
  worldA.caveHazardZones.length,
  "every hazard has a synchronized darkness-mask light",
);
assert.equal(
  worldA.caveLightZones.filter(zone => !zone.isHazardLight).length,
  worldA.caveZones.filter(zone => zone.standaloneScene !== true).length,
  "every integrated cave retains one ambient cave light",
);

const timedHazard = {
  static: false,
  periodMs: 100,
  activeMs: 20,
  telegraphMs: 10,
  phaseMs: 0,
};
assert.equal(resolveCaveHazardState(timedHazard, 0).active, true);
assert.deepEqual(
  resolveCaveHazardState(timedHazard, 50),
  { active: false, telegraph: false, progress: 0 },
);
assert.equal(resolveCaveHazardState(timedHazard, 95).telegraph, true);
assert.equal(resolveCaveHazardState({ ...timedHazard, static: true }, 50).active, true);

const calls = {
  drain: 0,
  torch: [],
  teleports: [],
  warnings: [],
  danger: [],
  shake: [],
  sound: 0,
  status: [],
  floating: [],
  render: 0,
};
const testHazard = {
  id: "test-cave:hazard-1",
  caveId: "test-cave",
  archetypeId: "prism-nursery",
  kind: "spike-run",
  label: "Crystal Teeth",
  hint: "Fly over.",
  color: 0x7952c7,
  glowColor: 0x68edff,
  startTx: 10,
  endTx: 11,
  centerTx: 10.5,
  ceilingY: 18,
  floorY: 20,
  leftCheckpoint: { tx: 8, ty: 19 },
  rightCheckpoint: { tx: 13, ty: 19 },
  periodMs: 1,
  activeMs: 1,
  telegraphMs: 0,
  static: true,
  phaseMs: 0,
};
const fakeWorld = {
  caveHazardZones: [testHazard],
  getCaveHazardZonesInRange: () => [testHazard],
  getCaveZoneAtTile: () => ({ id: "test-cave", hazards: [testHazard] }),
};
const fakeScene = {
  config: { tileSize: 100 },
  playerController: {
    physicsBody: {
      getBounds: () => ({ left: 1030, right: 1090, top: 1900, bottom: 1999 }),
    },
    drainAllGemPower: () => {
      calls.drain += 1;
      return 73;
    },
    teleportToTile: (tx, ty) => calls.teleports.push({ tx, ty }),
    applyExternalKnockback: () => undefined,
  },
  lightSystem: {
    forceTorchOff: options => calls.torch.push(options),
  },
  shakeSystem: {
    shake: (...args) => calls.shake.push(args),
  },
  soundSystem: {
    playTileHit: () => {
      calls.sound += 1;
    },
  },
  uiNotifications: {
    warning: (...args) => calls.warnings.push(args),
    danger: (...args) => calls.danger.push(args),
  },
  hudSystem: {
    flashStatus: (...args) => calls.status.push(args),
  },
  floatingTextSystem: {
    showFloatingText: (...args) => calls.floating.push(args),
  },
};
const fakeView = {
  create: () => true,
  render: () => {
    calls.render += 1;
  },
  destroy: () => undefined,
};
const hazardSystem = new CaveHazardSystem(fakeScene, fakeView);
assert.equal(hazardSystem.create(fakeWorld), true);
hazardSystem.update(100, { tx: 10, ty: 19 }, true);
assert.equal(calls.drain, 1);
assert.deepEqual(calls.teleports, [{ tx: 8, ty: 19 }]);
assert.deepEqual(calls.torch, [{ manual: true, showStatus: false }]);
assert.equal(calls.warnings.length, 1);
assert.equal(calls.danger.length, 1);
assert.equal(calls.shake.length, 1);
assert.equal(calls.sound, 1);
assert.match(calls.floating[0][2], /-73 GP/);
assert.equal(hazardSystem.getSnapshot().failureCount, 1);
hazardSystem.destroy();

globalThis.Phaser = {
  Math: {
    Linear: (start, end, amount) => start + (end - start) * amount,
  },
};
const lightContext = { config: LIGHT_CONFIG };
const prismProfile = LIGHT_CONFIG.caveLights.archetypeProfiles["prism-nursery"];
const prismPeakTime = Math.PI * 0.5 / prismProfile.pulseRadiansPerMs;
const prismPeak = LightSystem.prototype._resolveCaveLightRatio.call(
  lightContext,
  prismPeakTime,
  { archetypeId: "prism-nursery", phase: 0 },
);
assert.ok(
  Math.abs(prismPeak - prismProfile.maximumRatio * (1 - prismProfile.darknessBoost)) < 0.000001,
  "archetype darkness affects the hard-black cave light reveal",
);
assert.equal(
  LightSystem.prototype._resolveCaveLightRatio.call(
    lightContext,
    0,
    { isHazardLight: true, static: true },
  ),
  LIGHT_CONFIG.caveLights.hazardLight.staticRatio,
);
assert.ok(
  new Set(
    Object.values(LIGHT_CONFIG.caveLights.archetypeProfiles)
      .map(profile => `${profile.minimumRatio}:${profile.maximumRatio}:${profile.darknessBoost}`),
  ).size >= 5,
  "cave families have meaningfully different darkness rhythms",
);
delete globalThis.Phaser;

const setupSource = await readFile(
  new URL("../world/playScene/PlaySceneSetup.js", import.meta.url),
  "utf8",
);
const updateSource = await readFile(
  new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url),
  "utf8",
);
assert.match(setupSource, /new CaveHazardSystem\(this, this\.caveHazardView\)/);
assert.match(updateSource, /caveHazardSystem\.update\(time, playerTile/);
assert.equal(CAVE_GAMEPLAY_CONFIG.hazards.hit.notification.includes("ALL GP LOST"), true);

console.log("cave resource, hazard, and darkness contract passed");
