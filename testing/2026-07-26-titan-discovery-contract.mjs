import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TITAN_DEFINITIONS,
  TITAN_DISCOVERY_CONFIG,
  getTitanDiscoveryPreloadAssets,
  resolveTitanDiscoveriesEnabled,
} from "../values/titanDiscoveries.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { RetentionProgressSystem } from "../systems/progression/RetentionProgressSystem.js";
import { TitanDiscoverySystem } from "../systems/visual/TitanDiscoverySystem.js";
import { buildTitanDiscoveryZones } from "../systems/visual/titanDiscoveryZones.js";
import { WorldModel } from "../world/model/WorldModel.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class FakeGameObject {
  constructor(x = 0, y = 0, key = "") {
    this.x = x;
    this.y = y;
    this.key = key;
    this.width = 256;
    this.height = 256;
    this.alpha = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.destroyed = false;
  }

  setX(value) { this.x = value; return this; }
  setY(value) { this.y = value; return this; }
  setDepth(value) { this.depth = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setTint(value) { this.tint = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setOrigin(x, y) { this.origin = { x, y }; return this; }
  setStrokeStyle(...value) { this.stroke = value; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  destroy() { this.destroyed = true; }
}

function createFakeWorld() {
  const solid = new Set();
  return {
    width: 280,
    depth: 5065,
    topAirRows: 65,
    tileSize: 94,
    dugTiles: new Map(),
    solid,
    isDiggable(tx, ty) {
      return tx >= 0 && tx < this.width && ty > this.topAirRows && ty < this.depth;
    },
    isSolid(tx, ty) {
      return !solid.has(`${tx},${ty}`);
    },
  };
}

function applyTween(scene, config) {
  const targets = Array.isArray(config.targets) ? config.targets : [config.targets];
  for (const target of targets) {
    for (const key of ["x", "y", "alpha", "scaleX", "scaleY"]) {
      if (Number.isFinite(config[key])) target[key] = config[key];
    }
  }
  config.onComplete?.();
  return { stop() {} };
}

function createFakeScene(retentionProgressSystem) {
  const objects = [];
  const add = (object) => {
    objects.push(object);
    return object;
  };
  return {
    objects,
    retentionProgressSystem,
    saveRequests: 0,
    textures: { exists: () => true },
    add: {
      image: (x, y, key) => add(new FakeGameObject(x, y, key)),
      circle: (x, y) => add(new FakeGameObject(x, y, "circle")),
      ellipse: (x, y) => add(new FakeGameObject(x, y, "ellipse")),
    },
    tweens: {
      add(config) { return applyTween(this, config); },
      killTweensOf() {},
    },
    queueDugTilesSave() {
      this.saveRequests += 1;
    },
  };
}

assert.equal(TITAN_DEFINITIONS.length, 25);
assert.equal(new Set(TITAN_DEFINITIONS.map(entry => entry.id)).size, 25);
assert.equal(getTitanDiscoveryPreloadAssets().length, 25);
assert.equal(resolveTitanDiscoveriesEnabled(undefined, "?titans=0"), false);
assert.equal(resolveTitanDiscoveriesEnabled(undefined, "?titans=1"), true);

for (const definition of TITAN_DEFINITIONS) {
  const assetPath = path.join(ROOT, definition.asset.path);
  const png = fs.readFileSync(assetPath);
  assert.equal(png.readUInt32BE(16), 256, `${definition.id} width`);
  assert.equal(png.readUInt32BE(20), 256, `${definition.id} height`);
  assert.equal(png[25], 6, `${definition.id} must be RGBA`);
}

const world = createFakeWorld();
const zones = buildTitanDiscoveryZones(world);
assert.equal(zones.length, 25);
assert.equal(new Set(zones.map(zone => zone.definition.id)).size, 25);
assert.ok(zones.every(zone => (
  zone.cells.length >= TITAN_DISCOVERY_CONFIG.zoneSearch.minimumTrackedTiles
)));

const retention = new RetentionProgressSystem({ saveSlot: 1 });
assert.equal(retention.discoverTitan(TITAN_DEFINITIONS[0].id), true);
assert.equal(retention.discoverTitan(TITAN_DEFINITIONS[0].id), false);
assert.equal(retention.discoverTitan("not-a-titan"), false);
const restoredRetention = new RetentionProgressSystem({ saveSlot: 1 });
restoredRetention.loadSaveData(retention.getSaveData());
assert.deepEqual(restoredRetention.getDiscoveredTitans(), [TITAN_DEFINITIONS[0].id]);

const runtimeRetention = new RetentionProgressSystem({ saveSlot: 2 });
const scene = createFakeScene(runtimeRetention);
const system = new TitanDiscoverySystem(scene, world);
assert.equal(system.create(), true);
assert.equal(system.getSnapshot().zones.length, 25);

const firstView = system.zoneViews[0];
for (const cell of firstView.zone.cells) {
  const key = `${cell.tx},${cell.ty}`;
  world.solid.add(key);
  world.dugTiles.set(key, { tileX: cell.tx, tileY: cell.ty });
}
system.refresh();
system.update(1000, 16, {
  playerTile: {
    tx: firstView.zone.centerXTile,
    ty: firstView.zone.centerYTile,
  },
});
assert.equal(runtimeRetention.hasDiscoveredTitan(firstView.definition.id), true);
assert.equal(system.surfaceViews.size, 1);
assert.equal(scene.saveRequests, 1);
assert.equal(system.getSnapshot().discovered, 1);

const runtimeSource = fs.readFileSync(
  path.join(ROOT, "world/rendering/scenic-world/WorldVisualRuntime.js"),
  "utf8"
);
const bootSource = fs.readFileSync(path.join(ROOT, "ui/scenes/BootScene.js"), "utf8");
assert.match(runtimeSource, /new TitanDiscoverySystem/);
assert.match(runtimeSource, /titanDiscoverySystem\?\.update/);
assert.match(runtimeSource, /titanDiscoverySystem\?\.invalidateTile/);
assert.match(bootSource, /getTitanDiscoveryPreloadAssets/);

system.destroy();
assert.ok(scene.objects.every(object => object.destroyed));

const actualWorld = new WorldModel(GAME_CONFIG);
const actualZones = buildTitanDiscoveryZones(actualWorld);
assert.equal(actualZones.length, 25);
assert.deepEqual(
  actualZones.map(zone => zone.definition.id),
  TITAN_DEFINITIONS.map(definition => definition.id)
);
assert.ok(actualZones.every(zone => (
  zone.cells.length >= TITAN_DISCOVERY_CONFIG.zoneSearch.minimumTrackedTiles
)));

console.log("titan discovery contract: PASS");
