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
import { TITAN_DISCOVERY_EXPERIENCE } from "../values/titanDiscoveryExperience.js";
import { TITAN_CLUE_CATALOG_CONFIG } from "../values/titanClueCatalog.js";
import { getTitanLoreEntry } from "../values/titanLore.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { RetentionProgressSystem } from "../systems/progression/RetentionProgressSystem.js";
import { TitanDiscoverySystem } from "../systems/visual/TitanDiscoverySystem.js";
import { buildTitanDiscoveryZones } from "../systems/visual/titanDiscoveryZones.js";
import { TitanArchiveView } from "../ui/overlays/TitanArchiveView.js";
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
    this.active = true;
    this.children = [];
    this.destroyed = false;
  }

  add(value) {
    this.children.push(...(Array.isArray(value) ? value : [value]));
    return this;
  }
  iterate(callback) { this.children.forEach(callback); return this; }
  removeAll(destroyChildren = false) {
    if (destroyChildren) this.children.forEach(child => child?.destroy?.(true));
    this.children = [];
    return this;
  }
  setX(value) { this.x = value; return this; }
  setY(value) { this.y = value; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setRotation(value) { this.rotation = value; return this; }
  setDepth(value) { this.depth = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setTint(value) { this.tint = value; return this; }
  clearTint() { delete this.tint; return this; }
  setTexture(value) { this.key = value; return this; }
  setText(value) { this.text = value; return this; }
  setColor(value) { this.color = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setOrigin(x, y) { this.origin = { x, y }; return this; }
  setStrokeStyle(...value) { this.stroke = value; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setSize(width, height) { this.width = width; this.height = height; return this; }
  setScrollFactor(value) { this.scrollFactor = value; return this; }
  setVisible(value) { this.visible = value; return this; }
  setInteractive() { this.interactive = true; return this; }
  disableInteractive() { this.interactive = false; return this; }
  on(event, handler) { this.events ||= {}; this.events[event] = handler; return this; }
  clear() { return this; }
  fillStyle() { return this; }
  fillRoundedRect() { return this; }
  lineStyle() { return this; }
  strokeRoundedRect() { return this; }
  lineBetween() { return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  destroy(destroyChildren = false) {
    if (destroyChildren) this.children.forEach(child => child?.destroy?.(true));
    this.destroyed = true;
    this.active = false;
  }
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
    applyDugTileKeys(keys) {
      return keys.map(key => {
        const [tx, ty] = key.split(",").map(Number);
        solid.add(key);
        this.dugTiles.set(key, { tileX: tx, tileY: ty });
        return { tx, ty };
      });
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
  const updatedTiles = [];
  const add = (object) => {
    objects.push(object);
    return object;
  };
  return {
    objects,
    retentionProgressSystem,
    saveRequests: 0,
    updatedTiles,
    scale: { width: 1280, height: 720 },
    textures: { exists: () => true },
    add: {
      image: (x, y, key) => add(new FakeGameObject(x, y, key)),
      circle: (x, y) => add(new FakeGameObject(x, y, "circle")),
      ellipse: (x, y) => add(new FakeGameObject(x, y, "ellipse")),
      rectangle: (x, y) => add(new FakeGameObject(x, y, "rectangle")),
      graphics: () => add(new FakeGameObject(0, 0, "graphics")),
      container: (x = 0, y = 0, children = []) => add(
        new FakeGameObject(x, y, "container").add(children),
      ),
      text: (x, y, text) => add(Object.assign(
        new FakeGameObject(x, y, "text"),
        { text },
      )),
    },
    tweens: {
      add(config) { return applyTween(this, config); },
      killTweensOf() {},
    },
    worldRenderer: {
      applyTileUpdate(tx, ty) {
        updatedTiles.push({ tx, ty });
      },
    },
    queueDugTilesSave() {
      this.saveRequests += 1;
    },
  };
}

assert.equal(TITAN_DEFINITIONS.length, 25);
assert.equal(new Set(TITAN_DEFINITIONS.map(entry => entry.id)).size, 25);
assert.equal(getTitanDiscoveryPreloadAssets().length, 54);
assert.equal(
  getTitanDiscoveryPreloadAssets(undefined, "?titans=0").length,
  0,
);
assert.equal(resolveTitanDiscoveriesEnabled(undefined, "?titans=0"), false);
assert.equal(resolveTitanDiscoveriesEnabled(undefined, "?titans=1"), true);

for (const definition of TITAN_DEFINITIONS) {
  const assetPath = path.join(ROOT, definition.asset.path);
  const png = fs.readFileSync(assetPath);
  assert.equal(png.readUInt32BE(16), 256, `${definition.id} width`);
  assert.equal(png.readUInt32BE(20), 256, `${definition.id} height`);
  assert.equal(png[25], 6, `${definition.id} must be RGBA`);
}
const plinthPath = path.join(ROOT, TITAN_DISCOVERY_CONFIG.assets.walkPlinth.path);
const plinthPng = fs.readFileSync(plinthPath);
assert.equal(plinthPng.readUInt32BE(16), 512, "Titan Walk plinth width");
assert.equal(plinthPng.readUInt32BE(20), 320, "Titan Walk plinth height");
assert.equal(plinthPng[25], 6, "Titan Walk plinth must be RGBA");
for (const [asset, width, height] of [
  [TITAN_DISCOVERY_CONFIG.assets.undergroundDais, 1024, 384],
  [TITAN_DISCOVERY_CONFIG.assets.coverResonance, 512, 512],
]) {
  const png = fs.readFileSync(path.join(ROOT, asset.path));
  assert.equal(png.readUInt32BE(16), width, `${asset.key} width`);
  assert.equal(png.readUInt32BE(20), height, `${asset.key} height`);
  assert.equal(png[25], 6, `${asset.key} must be RGBA`);
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
restoredRetention.loadSaveData({
  discoveries: {
    titans: [
      "not-a-titan",
      TITAN_DEFINITIONS[1].id,
      TITAN_DEFINITIONS[0].id,
      TITAN_DEFINITIONS[1].id,
    ],
  },
});
assert.deepEqual(
  restoredRetention.getDiscoveredTitans(),
  [TITAN_DEFINITIONS[0].id, TITAN_DEFINITIONS[1].id],
  "Titan saves must drop unknown ids, deduplicate, and restore canonical order",
);
assert.deepEqual(
  restoredRetention.getJournalSnapshot().discoveries.titans,
  restoredRetention.getDiscoveredTitans(),
  "the pause archive must receive Titan ids through the canonical journal snapshot",
);

const runtimeRetention = new RetentionProgressSystem({ saveSlot: 2 });
const scene = createFakeScene(runtimeRetention);
const system = new TitanDiscoverySystem(scene, world);
assert.equal(system.create(), true);
assert.equal(system.getSnapshot().zones.length, 25);
assert.equal(system.getSnapshot().surface.slots, 25);
assert.equal(system.getSnapshot().surface.ready, true);
assert.deepEqual(
  {
    status: globalThis[TITAN_DISCOVERY_CONFIG.health.globalKey].status,
    zones: globalThis[TITAN_DISCOVERY_CONFIG.health.globalKey].zones.length,
    surfaceSlots: globalThis[TITAN_DISCOVERY_CONFIG.health.globalKey].surface.slots,
  },
  { status: "healthy", zones: 25, surfaceSlots: 25 },
  "Titan readiness must be visible through the production health global",
);

const firstView = system.zoneViews[0];
system.update(0, 16, {
  playerTile: { tx: 0, ty: firstView.zone.centerYTile },
});
assert.ok(firstView.coverageTotal > 0);
assert.ok(firstView.coverageTotal < firstView.zone.cells.length);
assert.equal(
  firstView.coverageRequired,
  Math.ceil(
    firstView.coverageTotal
      * TITAN_DISCOVERY_EXPERIENCE.encounter.requiredClearRatio
  ),
);
assert.equal(firstView.sprite.key, firstView.definition.surfaceAsset.key);
assert.equal(firstView.daisSprite.key, TITAN_DISCOVERY_CONFIG.assets.undergroundDais.key);
assert.ok(
  firstView.daisSprite.displayWidth
    < Math.min(firstView.widthPx, firstView.heightPx)
      * TITAN_DISCOVERY_CONFIG.underground.titanFitFraction
      * 0.6,
  "the underground dais must remain substantially smaller than its Titan",
);
const initialCreatureAlpha = firstView.sprite.alpha;
for (const cell of firstView.coverageCells.slice(
  0,
  firstView.coverageRequired - 1
)) {
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
assert.equal(
  runtimeRetention.hasDiscoveredTitan(firstView.definition.id),
  false,
  "the Titan must remain sealed until half its covering silhouette is dug",
);
assert.equal(
  firstView.coverageCleared,
  firstView.coverageRequired - 1,
);
assert.ok(firstView.coverageProgress > 0);
assert.ok(
  firstView.sprite.alpha > initialCreatureAlpha,
  "the creature texture must visibly strengthen as covering tiles are removed",
);
assert.equal(
  system.getSnapshot().guidance.indicator.visible,
  false,
  "the location UI must disappear inside the chamber",
);
assert.equal(
  system.getSnapshot().coverGlow.visibleTiles,
  firstView.coverageRemaining,
  "every remaining covering tile must carry the authored resonance glow",
);
const thresholdCell = firstView.coverageCells[firstView.coverageRequired - 1];
const thresholdKey = `${thresholdCell.tx},${thresholdCell.ty}`;
world.solid.add(thresholdKey);
world.dugTiles.set(thresholdKey, {
  tileX: thresholdCell.tx,
  tileY: thresholdCell.ty,
});
system.refresh();
system.update(1100, 16, {
  playerTile: {
    tx: 0,
    ty: firstView.zone.centerYTile,
  },
});
assert.equal(runtimeRetention.hasDiscoveredTitan(firstView.definition.id), true);
assert.equal(firstView.coverageRemaining, 0);
assert.equal(
  scene.updatedTiles.length,
  firstView.coverageTotal - firstView.coverageRequired,
  "reaching 50% must destroy and redraw every remaining covering tile",
);
assert.ok(
  firstView.zoneRemaining > 0,
  "non-creature chamber tiles must not block a fully exposed Titan",
);
assert.equal(system.surfaceGallery.views.size, 25);
assert.equal(
  system.surfaceGallery.views.get(firstView.definition.id).discovered,
  true,
);
assert.equal(scene.saveRequests, 1);
assert.equal(system.getSnapshot().discovered, 1);

const archiveScene = createFakeScene(runtimeRetention);
const archiveHost = archiveScene.add.container(0, 0);
const archiveView = new TitanArchiveView(archiveScene, {
  x: -450,
  y: -210,
  width: 900,
  height: 420,
  parent: archiveHost,
  retention: runtimeRetention,
});
assert.equal(
  archiveView.getControls().length,
  TITAN_DEFINITIONS.length + 1,
  "the archive exposes every Titan slot plus the clue action",
);
assert.equal(
  archiveView.nameText.text,
  TITAN_DEFINITIONS[0].name.toUpperCase(),
  "the first persisted discovery must open as a real archive entry",
);
const firstLore = getTitanLoreEntry(TITAN_DEFINITIONS[0].id);
assert.equal(archiveView.epithetText.text, firstLore.epithet.toUpperCase());
assert.equal(archiveView.loreText.text, firstLore.archiveLore);
assert.ok(archiveView.inscriptionText.text.includes(firstLore.inscription));
assert.equal(archiveView.portrait.key, TITAN_DEFINITIONS[0].asset.key);
assert.ok(
  archiveView.controls[0].thumbnail.alpha
    > archiveView.controls[1].thumbnail.alpha,
  "discovered thumbnails must read more strongly than locked silhouettes",
);
const gridRight = -450 + 900 * TITAN_DISCOVERY_CONFIG.archive.gridWidthFraction;
assert.ok(
  archiveView.controls
    .slice(0, TITAN_DEFINITIONS.length)
    .every(control => (
    control.root.x + control.root.width / 2 < gridRight
  )),
  "all 25 archive slots must stay inside the grid panel",
);
archiveView.select(1);
assert.equal(archiveView.nameText.text, "UNDISCOVERED TITAN");
assert.equal(
  archiveView.loreText.text,
  TITAN_CLUE_CATALOG_CONFIG.copy.lockedLore,
);
assert.equal(archiveView.epithetText.visible, false);
assert.equal(archiveView.inscriptionText.visible, false);
archiveView.destroy();
assert.equal(archiveView.root.destroyed, true);

const runtimeSource = fs.readFileSync(
  path.join(ROOT, "world/rendering/scenic-world/WorldVisualRuntime.js"),
  "utf8"
);
const legacyRendererSource = fs.readFileSync(
  path.join(ROOT, "world/rendering/WorldRenderer.js"),
  "utf8"
);
const bootSource = fs.readFileSync(path.join(ROOT, "ui/scenes/BootScene.js"), "utf8");
const pauseSource = fs.readFileSync(
  path.join(ROOT, "world/playScene/PlaySceneUI.js"),
  "utf8"
);
const archiveSource = fs.readFileSync(
  path.join(ROOT, "ui/overlays/TitanArchiveView.js"),
  "utf8"
);
assert.match(runtimeSource, /new TitanDiscoverySystem/);
assert.match(runtimeSource, /titanDiscoverySystem\?\.update/);
assert.match(runtimeSource, /titanDiscoverySystem\?\.invalidateTile/);
assert.match(legacyRendererSource, /new TitanDiscoverySystem/);
assert.match(legacyRendererSource, /titanDiscoverySystem\?\.update/);
assert.match(legacyRendererSource, /titanDiscoverySystem\?\.invalidateTile/);
assert.match(legacyRendererSource, /titanDiscoverySystem\?\.refresh/);
assert.match(legacyRendererSource, /titanDiscoverySystem\?\.destroy/);
assert.match(bootSource, /getTitanDiscoveryPreloadAssets/);
assert.match(pauseSource, /new TitanArchiveView/);
assert.match(pauseSource, /resolveTitanDiscoveriesEnabled/);
assert.match(archiveSource, /columns/);
assert.match(archiveSource, /definition\.asset\.key/);
assert.doesNotMatch(
  fs.readFileSync(
    path.join(ROOT, "systems/visual/TitanSurfaceGallery.js"),
    "utf8"
  ),
  /add\.ellipse|add\.circle|add\.rectangle/,
  "the surface walk must use generated art instead of procedural plinth placeholders",
);

system.destroy();
assert.ok(scene.objects.every(object => object.destroyed));
assert.equal(
  globalThis[TITAN_DISCOVERY_CONFIG.health.globalKey].status,
  "destroyed",
);

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
