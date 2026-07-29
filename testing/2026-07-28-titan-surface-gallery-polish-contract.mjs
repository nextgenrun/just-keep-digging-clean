import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { HUD_LAYOUT } from "../values/hudLayout.js";
import {
  TITAN_DEFINITIONS,
  TITAN_DISCOVERY_CONFIG,
  getTitanDiscoveryPreloadAssets,
} from "../values/titanDiscoveries.js";
import {
  TITAN_SURFACE_GALLERY_CLEAR_ZONE,
  WORLD_VISUAL_SURFACE_PROP_LAYOUT,
} from "../values/worldVisualSurfacePropLayout.js";
import { WORLD_VISUAL_SURFACE_PROPS } from "../values/worldVisualSurfaceProps.js";
import { TitanSurfaceGallery } from "../systems/visual/TitanSurfaceGallery.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readAlphaWebpMetadata(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  let offset = 12;
  let metadata = null;
  let hasAlphaChunk = false;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (type === "VP8X") {
      metadata = {
        width: 1 + buffer.readUIntLE(payload + 4, 3),
        height: 1 + buffer.readUIntLE(payload + 7, 3),
        hasAlphaFlag: Boolean(buffer[payload] & 0x10),
      };
    }
    if (type === "ALPH") hasAlphaChunk = true;
    offset = payload + size + (size % 2);
  }
  assert.ok(metadata, `${filePath} must expose a VP8X canvas`);
  return { ...metadata, hasAlphaChunk };
}

class FakeImage {
  constructor(x, y, key) {
    Object.assign(this, {
      x,
      y,
      key,
      width: key.includes("surface-stance") ? 768 : 512,
      height: key.includes("surface-stance") ? 768 : 320,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
    });
  }
  setOrigin(x, y) { this.origin = { x, y }; return this; }
  setDepth(value) { this.depth = value; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  setTint(value) { this.tint = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setY(value) { this.y = value; return this; }
  destroy() { this.destroyed = true; }
}

const runtimeManifest = JSON.parse(fs.readFileSync(
  path.join(
    ROOT,
    "sprites/backgrounds/titan-surface-stances-v1/"
      + "2026-07-28-titan-surface-stances-production-manifest-v1.json",
  ),
  "utf8",
));
assert.equal(runtimeManifest.complete, true);
assert.equal(runtimeManifest.count, 25);
assert.deepEqual(runtimeManifest.runtimeSize, [768, 768]);
assert.equal(new Set(runtimeManifest.stances.map(item => item.sha256)).size, 25);
assert.deepEqual(
  runtimeManifest.stances.map(item => item.id),
  TITAN_DEFINITIONS.map(item => item.id),
);

const preloadAssets = getTitanDiscoveryPreloadAssets();
assert.equal(preloadAssets.length, 54);
assert.equal(new Set(preloadAssets.map(asset => asset.key)).size, 54);
for (const definition of TITAN_DEFINITIONS) {
  assert.notEqual(definition.surfaceAsset.key, definition.asset.key);
  assert.ok(preloadAssets.some(asset => asset.key === definition.surfaceAsset.key));
  const filePath = path.join(ROOT, definition.surfaceAsset.path);
  assert.equal(fs.existsSync(filePath), true, definition.surfaceAsset.path);
  const manifestItem = runtimeManifest.stances.find(item => item.id === definition.id);
  assert.equal(manifestItem.runtime, definition.surfaceAsset.path);
  const runtimeBuffer = fs.readFileSync(filePath);
  assert.equal(runtimeBuffer.byteLength, manifestItem.bytes);
  assert.equal(
    crypto.createHash("sha256").update(runtimeBuffer).digest("hex"),
    manifestItem.sha256,
  );
  assert.deepEqual(
    readAlphaWebpMetadata(filePath),
    {
      width: 768,
      height: 768,
      hasAlphaFlag: true,
      hasAlphaChunk: true,
    },
    `${definition.id} surface stance`,
  );
}

const gallery = TITAN_DISCOVERY_CONFIG.surfaceGallery;
assert.equal(gallery.assetVersion, "titan-surface-stances-v1");
assert.equal(gallery.footingAssetId, "undergroundDais");
assert.equal(gallery.maxWidthTiles, 3.2);
assert.equal(gallery.maxHeightTiles, 4.25);
assert.equal(gallery.minimumScaleMultiplier, 0.92);
assert.equal(gallery.maximumScaleMultiplier, 1.18);
assert.equal(gallery.plinthWidthTiles, 2.1);
assert.equal(gallery.plinthHeightTiles, 0.36);
assert.ok(gallery.spacingTiles >= gallery.plinthWidthTiles);
assert.ok(
  gallery.maxWidthTiles * gallery.minimumScaleMultiplier > 0.86 * 3,
  "even the smallest revised Titan must exceed the former shared 3x envelope",
);
assert.ok(
  gallery.plinthWidthTiles
    < gallery.maxWidthTiles * gallery.minimumScaleMultiplier,
);
assert.ok(gallery.plinthHeightTiles < gallery.maxHeightTiles * 0.1);
const surfaceScaleValues = TITAN_DEFINITIONS.map(
  definition => definition.surfaceGalleryScale
);
assert.ok(surfaceScaleValues.every(value => (
  value >= gallery.minimumScaleMultiplier
  && value <= gallery.maximumScaleMultiplier
)));
assert.ok(
  new Set(surfaceScaleValues).size >= 10,
  "the surface gallery must preserve visibly different Titan sizes",
);
assert.equal(gallery.spriteBlendMode, "NORMAL");
assert.ok(gallery.discoveredAlpha >= 0.98);
assert.ok(gallery.pulseAlpha <= 0.02);
assert.ok(gallery.spriteDepth < HUD_LAYOUT.playerDepth);
assert.ok(gallery.spriteDepth > WORLD_VISUAL_SURFACE_PROPS.renderDepths.mid);

const townBand = WORLD_VISUAL_SURFACE_PROP_LAYOUT.existingVisualCoverageBands
  .find(item => item.id === "approved-town-benchmark");
const tunnelBand = WORLD_VISUAL_SURFACE_PROP_LAYOUT.existingVisualCoverageBands
  .find(item => item.id === "door-bridge-arc-core");
assert.ok(TITAN_SURFACE_GALLERY_CLEAR_ZONE.leftTile > townBand.rightTile);
assert.ok(TITAN_SURFACE_GALLERY_CLEAR_ZONE.rightTile < tunnelBand.leftTile);
assert.ok(gallery.startTileX - townBand.rightTile >= 5);
assert.equal(
  WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements
    .some(item => item.level === "level1"),
  false,
  "no modular surface prop may share the enlarged Titan Walk corridor",
);

const worldModel = { tileSize: 94, topAirRows: 65 };
const scene = {
  textures: { exists: () => true },
  add: { image: (x, y, key) => new FakeImage(x, y, key) },
  tweens: { killTweensOf() {} },
};
const surfaceGallery = new TitanSurfaceGallery(
  scene,
  worldModel,
  TITAN_DISCOVERY_CONFIG,
);
const firstDefinition = TITAN_DEFINITIONS[0];
surfaceGallery.sync(new Set([firstDefinition.id]), true);
assert.equal(surfaceGallery.views.size, 25);
const firstView = surfaceGallery.views.get(firstDefinition.id);
assert.equal(firstView.sprite.key, firstDefinition.surfaceAsset.key);
assert.equal(firstView.sprite.blendMode, "NORMAL");
assert.equal(firstView.sprite.alpha, gallery.discoveredAlpha);
assert.equal(firstView.sprite.depth, gallery.spriteDepth);
assert.equal(
  firstView.plinth.key,
  TITAN_DISCOVERY_CONFIG.assets.undergroundDais.key,
);
assert.equal(firstView.plinth.displayWidth, gallery.plinthWidthTiles * 94);
assert.equal(firstView.plinth.displayHeight, gallery.plinthHeightTiles * 94);
assert.ok(firstView.sprite.scaleY * 768 <= gallery.maxHeightTiles * 94 + 0.001);
assert.ok(firstView.sprite.scaleY * 768 > 0.86 * 3 * 94);
assert.ok(firstView.plinth.displayWidth < firstView.sprite.scaleX * 768);
const expectedFirstScale = gallery.maxWidthTiles
  * firstDefinition.surfaceGalleryScale
  * 94
  / 768;
assert.ok(Math.abs(firstView.baseScale - expectedFirstScale) < 0.000001);
const expectedFirstY = (
  worldModel.topAirRows + gallery.baselineOffsetTiles
) * 94
  - gallery.plinthHeightTiles * 94
  + gallery.stanceBottomPaddingPx * expectedFirstScale
  + gallery.creatureContactInsetTiles * 94;
assert.ok(Math.abs(firstView.baseY - expectedFirstY) < 0.000001);
assert.equal(firstView.plinth.x, gallery.startTileX * 94);
const secondView = surfaceGallery.views.get(TITAN_DEFINITIONS[1].id);
const smallestView = surfaceGallery.views.get("crowned-mole");
const largestView = surfaceGallery.views.get("magma-whale");
assert.ok(secondView.baseScale > firstView.baseScale);
assert.ok(smallestView.baseScale < firstView.baseScale);
assert.ok(largestView.baseScale > secondView.baseScale);
const lastView = surfaceGallery.views.get(TITAN_DEFINITIONS.at(-1).id);
assert.ok(lastView.plinth.x / 94 < TITAN_SURFACE_GALLERY_CLEAR_ZONE.rightTile);

const gallerySource = fs.readFileSync(
  path.join(ROOT, "systems/visual/TitanSurfaceGallery.js"),
  "utf8",
);
assert.match(gallerySource, /definition\.surfaceAsset/);
assert.match(gallerySource, /gallery\.footingAssetId/);
assert.match(gallerySource, /definition\.surfaceGalleryScale/);
assert.match(gallerySource, /gallery\.stanceBottomPaddingPx/);
assert.match(gallerySource, /setBlendMode\(gallery\.spriteBlendMode\)/);
assert.doesNotMatch(
  gallerySource,
  /scene\.add\.(graphics|circle|ellipse|rectangle)/,
  "Titan Walk creature presentation must remain raster-only",
);

surfaceGallery.destroy();
console.log(
  "Titan surface gallery polish contract: 25 ImageGen stances, compact shared "
    + "basalt dais, per-Titan scale, grounded contact, protected corridor, "
    + "raster-only rendering, and layer safety passed",
);
