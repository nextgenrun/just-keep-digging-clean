import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { HeavenblocksPresentationSystem } from "../systems/visual/HeavenblocksPresentationSystem.js";
import { HeavenblockWorldVisualSystem } from "../systems/visual/HeavenblockWorldVisualSystem.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { HEAVENBLOCKS_ACCESS_CONFIG } from "../values/heavenblocksAccessConfig.js";
import {
  HEAVENBLOCK_CELL_MARKERS,
  HEAVENBLOCKS_WORLD_CONFIG,
} from "../values/heavenblocksWorldConfig.js";
import {
  HEAVENBLOCKS_VISUAL_CONFIG,
  resolveHeavenblocksVisualsEnabled,
} from "../values/heavenblocksVisualConfig.js";
import { WorldModel } from "../world/model/WorldModel.js";

globalThis.Phaser = {
  BlendModes: { ADD: "ADD" },
};

function expectedCellCount() {
  return HEAVENBLOCKS_WORLD_CONFIG.regions.reduce(
    (total, region) => total + region.layoutRows.reduce(
      (rowTotal, row) => rowTotal + Array.from(row)
        .filter((marker) => marker !== HEAVENBLOCK_CELL_MARKERS.AIR).length,
      0,
    ),
    0,
  );
}

function expectedProtectedCount() {
  return HEAVENBLOCKS_WORLD_CONFIG.regions.reduce(
    (total, region) => total + region.layoutRows.reduce(
      (rowTotal, row) => rowTotal + Array.from(row)
        .filter((marker) => marker === HEAVENBLOCK_CELL_MARKERS.PROTECTED).length,
      0,
    ),
    0,
  );
}

function createDisplayObject(x, y, key = "", sourceSize = 512) {
  return {
    x,
    y,
    key,
    width: sourceSize,
    height: sourceSize,
    scaleX: 1,
    scaleY: 1,
    visible: true,
    destroyed: false,
    setOrigin(xValue, yValue = xValue) {
      this.originX = xValue;
      this.originY = yValue;
      return this;
    },
    setDepth(value) { this.depth = value; return this; },
    setScrollFactor(value) { this.scrollFactor = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setTint(value) { this.tint = value; return this; },
    setFlipX(value) { this.flipX = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setBlendMode(value) { this.blendMode = value; return this; },
    setScale(xValue, yValue = xValue) {
      this.scaleX = xValue;
      this.scaleY = yValue;
      return this;
    },
    setCrop(left, top, width, height) {
      this.crop = { left, top, width, height };
      return this;
    },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      this.scaleX = width / this.width;
      this.scaleY = height / this.height;
      return this;
    },
    setTexture(value) { this.key = value; return this; },
    setPosition(nextX, nextY) { this.x = nextX; this.y = nextY; return this; },
    setText(value) { this.text = value; return this; },
    destroy() { this.destroyed = true; },
  };
}

function createHarness() {
  const textureKeys = new Set(ASSET_KEYS.tiles.dynamicSoil.cracks);
  for (const key of Object.values(ASSET_KEYS.tiles)) {
    if (typeof key === "string") textureKeys.add(key);
  }
  for (const region of HEAVENBLOCKS_WORLD_CONFIG.regions) {
    textureKeys.add(region.backdropKey);
    textureKeys.add(region.heartAssetKey);
    textureKeys.add(region.componentAssetKey);
    textureKeys.add(region.portalAssetKey);
  }
  textureKeys.add(ASSET_KEYS.ui.heavenblocks.ancientRelicToken);
  textureKeys.add(ASSET_KEYS.tiles.ancientRelicCache);
  const objects = [];
  const tweens = [];
  const scene = {
    textures: {
      exists: (key) => textureKeys.has(key),
    },
    add: {
      image(x, y, key) {
        const object = createDisplayObject(x, y, key);
        objects.push(object);
        return object;
      },
      text(x, y) {
        const object = createDisplayObject(x, y);
        objects.push(object);
        return object;
      },
    },
    tweens: {
      add(config) {
        tweens.push(config);
        return config;
      },
      killTweensOf() {},
    },
  };
  return { scene, objects, tweens };
}

assert.equal(resolveHeavenblocksVisualsEnabled(HEAVENBLOCKS_VISUAL_CONFIG, ""), true);
assert.equal(
  resolveHeavenblocksVisualsEnabled(HEAVENBLOCKS_VISUAL_CONFIG, "?heavenblocksVisuals=0"),
  false,
);
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.nativeTileMaskWired, true);
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.nativeTileRenderer, true);
assert.equal(HEAVENBLOCKS_VISUAL_CONFIG.bakedFacadeRuntime, false);

const originalLog = console.log;
let world;
try {
  console.log = () => {};
  world = new WorldModel(GAME_CONFIG);
} finally {
  console.log = originalLog;
}

const harness = createHarness();
const visuals = new HeavenblockWorldVisualSystem(harness.scene, world);
visuals.create();
const visualHealth = visuals.getHealthSnapshot();
assert.equal(visualHealth.enabled, true);
assert.equal(visualHealth.ready, true);
assert.equal(visualHealth.expectedCells, expectedCellCount());
assert.equal(visualHealth.tileCellCount, expectedCellCount());
assert.equal(visualHealth.crackCellCount, expectedCellCount() - expectedProtectedCount());
assert.equal(visualHealth.bakedFacadeCellCount, 0);
assert.equal(
  Object.values(visualHealth.topologyCounts).reduce((sum, count) => sum + count, 0),
  expectedCellCount(),
);
assert.equal(visualHealth.heartCount, 3);
assert.equal(visualHealth.relicCacheCount, 3);
assert.equal(visualHealth.vaultMarkerCount, 3);
assert.deepEqual(visualHealth.missingTextures, []);
assert.equal(visuals.backdrops.length, 3);
assert.equal(visuals.surfacePortals.size, 3);
assert.equal(visuals.islandPortals.size, 3);

const firstRegion = HEAVENBLOCKS_WORLD_CONFIG.regions[0];
let damageCell = null;
firstRegion.layoutRows.some((row, localY) => Array.from(row).some((marker, localX) => {
  if (marker !== HEAVENBLOCK_CELL_MARKERS.MATERIAL) return false;
  damageCell = { tx: firstRegion.leftTile + localX, ty: firstRegion.topTile + localY };
  return true;
}));
const damageKey = `${damageCell.tx},${damageCell.ty}`;
const originalTextureKey = visuals.tileCells.get(damageKey).textureKey;
const maxHp = world.getTileMaxHp(damageCell.tx, damageCell.ty);
world.damageTile(damageCell.tx, damageCell.ty, Math.max(1, Math.floor(maxHp / 2)));
visuals.invalidateCell(damageCell.tx, damageCell.ty);
assert.equal(
  visuals.tileCells.get(damageKey).textureKey !== originalTextureKey
    || visuals.crackCells.get(damageKey).visible,
  true,
  "damage must change the native HP texture or reveal a crack overlay",
);
world.damageTile(damageCell.tx, damageCell.ty, maxHp * 2);
visuals.invalidateCell(damageCell.tx, damageCell.ty);
assert.equal(visuals.tileCells.get(damageKey).image.visible, false);
const exposedNeighbor = visuals.tileCells.get(`${damageCell.tx},${damageCell.ty + 1}`);
assert.equal(exposedNeighbor.image.visible, true);
assert.equal(exposedNeighbor.role, "surface");

const relicDescriptor = (() => {
  for (const region of HEAVENBLOCKS_WORLD_CONFIG.regions) {
    for (let localY = 0; localY < region.heightTiles; localY += 1) {
      const localX = region.layoutRows[localY]
        .indexOf(HEAVENBLOCK_CELL_MARKERS.RELIC_CACHE);
      if (localX >= 0) {
        return { tx: region.leftTile + localX, ty: region.topTile + localY };
      }
    }
  }
  return null;
})();
const relicVisual = visuals.relicCacheSprites.get(
  `${relicDescriptor.tx},${relicDescriptor.ty}`,
);
assert.equal(relicVisual.plate.visible, true);
assert.equal(relicVisual.token.visible, true);
world.damageTile(
  relicDescriptor.tx,
  relicDescriptor.ty,
  world.getTileMaxHp(relicDescriptor.tx, relicDescriptor.ty) * 2,
);
visuals.invalidateCell(relicDescriptor.tx, relicDescriptor.ty);
assert.equal(relicVisual.plate.visible, false);
assert.equal(relicVisual.token.visible, false);

const progression = {
  state: "locked",
  getSaveData() { return { state: this.state }; },
  isRegionUnlocked: (id) => id === firstRegion.id,
  isRegionCompleted: (id) => id === firstRegion.id,
  isOmegaVaultOpened: () => false,
};
visuals.syncProgression(progression, true);
assert.equal(visuals.surfacePortals.get(firstRegion.id).alpha, 1);
assert.equal(visuals.islandPortals.get(firstRegion.id).visible, true);
assert.equal(visuals.vaultMarkers.get(firstRegion.id).visible, true);
assert.equal(visuals.islandPortals.get(HEAVENBLOCKS_WORLD_CONFIG.regions[1].id).visible, false);

const presentation = new HeavenblocksPresentationSystem(
  harness.scene,
  world,
  visuals,
  HEAVENBLOCKS_ACCESS_CONFIG,
);
presentation.create();
const objectiveProgression = {
  isRegionUnlocked: () => true,
  isRegionCompleted: () => false,
};
presentation.redrawAltars(objectiveProgression, true);
presentation.updateObjective(firstRegion.arrival, objectiveProgression);
presentation.setPrompt(firstRegion.surfaceGate, "Ascend to the Cloud Reef");
assert.match(presentation.promptText.text, /Ascend to the Cloud Reef/);
assert.match(presentation.objectiveText.text, /AETHER TURBINE HEART/);
assert.equal(presentation.objectiveIcon.visible, true);
presentation.playTransit(
  world.tileToWorld(firstRegion.surfaceGate.tx, firstRegion.surfaceGate.ty),
  firstRegion,
  true,
  900,
);
presentation.playComponentClaim(firstRegion);
assert.equal(presentation.getHealthSnapshot().promptReady, true);
assert.equal(presentation.getHealthSnapshot().worldVisualReady, true);
assert.equal(presentation.getHealthSnapshot().objectiveReady, true);
assert.equal(presentation.getHealthSnapshot().shaftBeaconCount, 3);
assert.equal(presentation.shaftBeacons.get(firstRegion.id).visible, true);
assert.ok(harness.tweens.length >= 6);

const presentationSource = readFileSync(
  new URL("../systems/visual/HeavenblocksPresentationSystem.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(presentationSource, /\.add\.(graphics|circle|rectangle)\s*\(/);
const v11Source = readFileSync(
  new URL("../systems/environment/V11SkyIslandVisualSystem.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(v11Source, /Heavenblock|heavenblock/);
const rendererSource = readFileSync(
  new URL("../world/rendering/WorldRenderer.js", import.meta.url),
  "utf8",
);
assert.match(rendererSource, /resolveHeavenblocksVisualsEnabled/);
assert.match(rendererSource, /tile\.alpha\s*=/);
assert.match(rendererSource, /getHeavenblockRegionAt/);
assert.match(rendererSource, /_syncDedicatedHeavenblockTileAlpha/);
const worldVisualSource = readFileSync(
  new URL("../systems/visual/HeavenblockWorldVisualSystem.js", import.meta.url),
  "utf8",
);
const tileVisualSource = readFileSync(
  new URL("../systems/visual/HeavenblockTileVisualLayer.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(worldVisualSource, /facadeKey|texture\.add|getSourceImage|cropLeft/);
assert.doesNotMatch(tileVisualSource, /facadeKey|texture\.add|getSourceImage|cropLeft/);
const configuredTileSlots = HEAVENBLOCKS_WORLD_CONFIG.regions.flatMap(
  (region) => Object.entries(region.tileStyle)
    .filter(([key]) => key.endsWith("AssetSlots"))
    .flatMap(([, slots]) => slots),
);
assert.ok(configuredTileSlots.includes("skyIslandCorner"));
assert.ok(configuredTileSlots.includes("skyIslandUnder"));
for (const relativePath of [
  "../world/rendering/scenic-world/WorldVisualMaterialField.js",
  "../world/rendering/scenic-world/WorldVisualSemanticAssetLayer.js",
  "../world/rendering/scenic-world/WorldVisualBedrockMaterialLayer.js",
]) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  assert.match(source, /getHeavenblockRegionAt/);
}

presentation.destroy();
visuals.destroy();
assert.equal(harness.objects.every((object) => object.destroyed), true);

globalThis.location = { search: "?heavenblocksVisuals=0" };
const disabledHarness = createHarness();
const disabled = new HeavenblockWorldVisualSystem(disabledHarness.scene, world);
disabled.create();
assert.equal(disabledHarness.objects.length, 0);
assert.equal(disabled.getHealthSnapshot().ready, true);
delete globalThis.location;

console.log(
  "Heavenblocks visual layout contract passed: live native tiles, topology edges, HP stages, relic caches, entry beacons, hearts, portals, and zero baked facade cells.",
);
