import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { HeavenblocksProgressionSystem } from "../systems/progression/HeavenblocksProgressionSystem.js";
import { HeavenblocksPortalVisualSystem } from "../systems/visual/HeavenblocksPortalVisualSystem.js";
import {
  getHeavenblocksNativePreloadAssets,
  HEAVENBLOCKS_VISUAL_CONFIG,
} from "../values/heavenblocksVisualConfig.js";
import { HEAVENBLOCKS_WORLD_CONFIG } from "../values/heavenblocksWorldConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { HeavenblocksTerrainRenderer } from "../world/rendering/HeavenblocksTerrainRenderer.js";

globalThis.location = { search: "" };
globalThis.Phaser = { BlendModes: { ADD: 1 } };

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

class Actor {
  constructor(x, y, key) {
    this.x = x;
    this.y = y;
    this.key = key;
    this.alpha = 1;
    this.destroyed = false;
  }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    this.scaleX = width / 384;
    this.scaleY = height / 384;
    return this;
  }
  setDepth(depth) { this.depth = depth; return this; }
  setAlpha(alpha) { this.alpha = alpha; return this; }
  setTint(tint) { this.tint = tint; return this; }
  clearTint() { this.tint = null; return this; }
  setBlendMode(mode) { this.blendMode = mode; return this; }
  setOrigin(x, y) { this.origin = { x, y }; return this; }
  setScale(scaleX, scaleY = scaleX) { this.scaleX = scaleX; this.scaleY = scaleY; return this; }
  destroy() { this.destroyed = true; }
}

function createScene() {
  const actors = [];
  const tweens = [];
  return {
    actors,
    tweensCreated: tweens,
    config: { tileSize: 10 },
    cameras: {
      main: {
        width: 1200,
        height: 650,
        zoom: 1,
        scrollX: 0,
        scrollY: 0,
        worldView: { x: 0, y: 0, width: 1200, height: 650 },
      },
    },
    time: { now: 0 },
    textures: { exists: () => true },
    add: {
      image(x, y, key) {
        const actor = new Actor(x, y, key);
        actors.push(actor);
        return actor;
      },
    },
    tweens: {
      add(config) {
        const tween = {
          config,
          removed: false,
          remove() { this.removed = true; },
        };
        tweens.push(tween);
        return tween;
      },
    },
  };
}

const tiles = new Map([
  ["20,14", TILE_TYPES.CLOUDSTONE],
  ["40,26", TILE_TYPES.ANCIENT_RELIC_CACHE],
  ["65,14", TILE_TYPES.HEAVEN_BARRIER],
  ["1,60", TILE_TYPES.ANCIENT_RELIC_CACHE],
]);
const hp = new Map([["20,14", 1000]]);
const world = {
  tileSize: 10,
  width: 280,
  depth: 65,
  getTileType(tx, ty) { return tiles.get(`${tx},${ty}`) ?? TILE_TYPES.AIR; },
  getTileHp(tx, ty) { return hp.get(`${tx},${ty}`) ?? 1000; },
  getTileMaxHp() { return 1000; },
};
const scene = createScene();
const terrain = new HeavenblocksTerrainRenderer(scene, world);
terrain.create();
assert.equal(terrain.getHealthSnapshot().ready, true);
assert.equal(terrain.cells.has("20,14"), true);
assert.equal(terrain.cells.has("40,26"), true);
assert.equal(terrain.cells.has("65,14"), true);
assert.equal(
  terrain.cells.has("1,60"),
  false,
  "deep-world relics remain owned by the existing semantic renderer",
);
assert.equal(terrain.cells.get("40,26").aura !== null, true);
assert.equal(terrain.cells.get("65,14").aura !== null, true);

hp.set("20,14", 500);
terrain.invalidateCell(20, 14);
assert.equal(terrain.cells.get("20,14").crack !== null, true);
const dugRecord = terrain.cells.get("20,14");
tiles.set("20,14", TILE_TYPES.AIR);
terrain.invalidateCell(20, 14);
assert.equal(terrain.cells.has("20,14"), false);
assert.equal(dugRecord.image.destroyed, true, "digging removes exactly the mutated native tile view");

const progression = new HeavenblocksProgressionSystem({ relicCount: 3 });
const portals = new HeavenblocksPortalVisualSystem(scene, progression);
portals.create();
assert.equal(portals.getHealthSnapshot().ready, true);
assert.equal(portals.portalSockets.size, 8);
const firstSlot = HEAVENBLOCKS_WORLD_CONFIG.levels[0].portalSlots[0];
portals.setSkyPortalSlotActive(firstSlot.id, true);
assert.equal(portals.portalSockets.get(firstSlot.id).active, false);
assert.equal(progression.activateSkyGate().success, true);
portals.refreshProgressionVisuals();
assert.equal(portals.portalSockets.get(firstSlot.id).active, true);
const activePortal = portals.portalSockets.get(firstSlot.id);
assert.equal(
  activePortal.tween.config.scaleX,
  activePortal.baseScaleX * HEAVENBLOCKS_VISUAL_CONFIG.artifacts.portalPulseScale,
  "portal pulse preserves the authored display size instead of resetting to source pixels",
);
portals.setGroundPortalUnlocked(1, true);
assert.equal(portals.groundPortals.has(1), true);
const groundPortal = portals.groundPortals.get(1);
portals.setGroundPortalUnlocked(1, false);
assert.equal(portals.groundPortals.has(1), false);
assert.equal(groundPortal.image.destroyed, true);

const preloadAssets = getHeavenblocksNativePreloadAssets();
assert.equal(preloadAssets.length, 48);
assert.equal(new Set(preloadAssets.map(({ key }) => key)).size, 48);
assert.equal(preloadAssets.some(({ path }) => /facade|platform/i.test(path)), false);
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.nativeTileRenderer, true);
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.bakedFacadeRuntime, false);
assert.equal(existsSync(join(ROOT, "sprites/backgrounds/heavenblocks-v1")), false);
assert.equal(existsSync(join(ROOT, "sprites/backgrounds/heavenblocks-v2")), false);
assert.equal(existsSync(join(ROOT, "systems/environment/V11SkyIslandVisualSystem.js")), false);
assert.equal(existsSync(join(ROOT, "systems/environment/HeavenblocksAtmosphereSystem.js")), false);

portals.destroy();
terrain.destroy();
assert.equal(terrain.cells.size, 0);
assert.equal(portals.portalSockets.size, 0);
console.log(
  "Heavenblocks visual contract passed: modular assets, cell-level dig updates, native portals, and no baked facade runtime",
);
