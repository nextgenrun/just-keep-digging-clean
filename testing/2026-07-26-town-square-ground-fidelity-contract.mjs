import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  WORLD_VISUAL_SURFACE_PACKS,
  resolveWorldVisualSurfacePack,
} from "../values/worldVisualSurfacePacks.js";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../values/worldVisualSemanticAssets.js";
import {
  resolveSurfacePackBeautyGeometry,
} from "../world/rendering/scenic-world/WorldVisualSurfacePackView.js";
import {
  resolveTownFloorGeometry,
} from "../world/rendering/scenic-world/WorldVisualTownFloorView.js";
import {
  cellIntersectsTownFloorOcclusion,
  resolveTownFloorOcclusionBounds,
} from "../world/rendering/scenic-world/WorldVisualTownFloorOcclusion.js";
import {
  WorldVisualSemanticAssetLayer,
} from "../world/rendering/scenic-world/WorldVisualSemanticAssetLayer.js";

const rootUrl = new URL("../", import.meta.url);
const pack = resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "");
const floor = pack.floor;
const assetUrl = new URL(`../${floor.asset.path}`, import.meta.url);
const manifestUrl = new URL(
  "../sprites/backgrounds/world-visual-v2/surface/"
    + "town-surface-edge-thin-v2.manifest.json",
  import.meta.url,
);
const manifest = JSON.parse(fs.readFileSync(manifestUrl, "utf8"));
const asset = fs.readFileSync(assetUrl);
const surfaceAssetUrl = new URL(`../${manifest.surfaceOutput}`, import.meta.url);
const surfaceAsset = fs.readFileSync(surfaceAssetUrl);
const source = fs.readFileSync(new URL(`../${manifest.source}`, import.meta.url));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(floor.asset.key, "world-visual-surface-pack-town-square-slate-strip-v3");
assert.equal(
  floor.asset.path,
  "sprites/backgrounds/start-zone-scenic-v1/town-square-slate-strip-v3.png",
);
assert.equal(asset.subarray(1, 4).toString("ascii"), "PNG");
assert.equal(asset.readUInt32BE(16), 1801, "runtime ground width");
assert.equal(asset.readUInt32BE(20), 48, "runtime ground height");
assert.equal(asset[25], 6, "runtime ground must remain RGBA");
assert.equal(sha256(asset), "ecd682e87520b3fdac08a3b35e3f6baa50210c127c3e57851eb1276ae46cd3ab");
assert.equal(surfaceAsset.readUInt32BE(16), 1672, "full-width repeat source width");
assert.equal(surfaceAsset.readUInt32BE(20), 48, "full-width repeat source height");
assert.equal(
  sha256(surfaceAsset),
  "b357f2df6900c83bb395405dd8ad3764cd0ddacf9669bcde9b27c9710c2faf79",
);
assert.equal(sha256(source), "b7b0bdefa23e4bfc5d1bb7301939f06ea9a1fbd4bfde33dda0b4b923ba12c1d7");

assert.equal(manifest.version, 3);
assert.equal(manifest.scope, "Thin full-width surface ground and Town Square handoff");
assert.deepEqual(manifest.sourceCrop, { x: 0, y: 468, width: 1672, height: 48 });
assert.equal(manifest.approvedCorePixelExact, true);
assert.equal(manifest.approvedCoreWidth, floor.approvedCoreSourceWidthPx);
assert.equal(manifest.handoffWidth, floor.handoffSourceWidthPx);
assert.deepEqual(
  manifest.townOutputSize,
  [floor.expectedSource.width, floor.expectedSource.height],
);
assert.deepEqual(manifest.surfaceOutputSize, [1672, 48]);
assert.deepEqual(manifest.invariants, {
  resizedApprovedPixels: false,
  repaintedApprovedPixels: false,
  includesUnderground: false,
  changesGameplayState: false,
});

const beautyGeometry = resolveSurfacePackBeautyGeometry(pack, 94);
const floorGeometry = resolveTownFloorGeometry(pack, beautyGeometry, 94, 65);
assert.equal(floor.expectedSource.width, pack.beauty.expectedSource.width);
assert.equal(floorGeometry.width, beautyGeometry.width);
assert.ok(
  Math.abs(floorGeometry.sourcePixelsPerWorldPixel - beautyGeometry.sourcePixelsPerWorldPixel)
    < 1e-9,
  "approved ground and town must preserve the same uniform scale",
);
assert.equal(
  floor.approvedCoreSourceWidthPx + floor.handoffSourceWidthPx,
  floor.expectedSource.width,
);
assert.ok(floor.depth > WORLD_VISUAL_SEMANTIC_ASSETS.render.specialBeautyDepth);
assert.ok(
  WORLD_VISUAL_SEMANTIC_ASSETS.render.townFloorOccludedEmissiveDepth < floor.depth,
);
assert.ok(
  floor.depth + floor.effectDepthStep * 2 < WORLD_VISUAL_RUNTIME.render.feedbackDepth,
  "ground must hide overlapping depth decoration while leaving damage feedback visible",
);

const scene = { config: { tileSize: 94, topAirRows: 65 } };
const occlusion = resolveTownFloorOcclusionBounds(scene, "");
assert.ok(cellIntersectsTownFloorOcclusion(occlusion, 12, 65, 94));
assert.equal(
  cellIntersectsTownFloorOcclusion(occlusion, 12, 66, 94),
  false,
  "the first underground row must retain its normal visuals",
);
assert.equal(
  cellIntersectsTownFloorOcclusion(occlusion, 30, 66, 94),
  false,
  "the correction must not alter shallow underground visuals outside Town Square",
);
assert.equal(
  resolveTownFloorOcclusionBounds(scene, "?surfacePack=current-v2"),
  null,
  "the existing surface-pack rollback must disable the exact-floor occlusion too",
);

class ImageStub {
  setAlpha(value) { this.alpha = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setDepth(value) { this.depth = value; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  setMask(value) { this.mask = value; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setTexture(key, frame) { this.key = key; this.frame = frame; return this; }
  setTint(value) { this.tint = value; return this; }
  setVisible(value) { this.visible = value; return this; }
}

const semanticScene = {
  config: scene.config,
  add: { image: () => new ImageStub() },
};
const semanticLayer = new WorldVisualSemanticAssetLayer(
  semanticScene,
  { getSkyTileRarity: () => 0 },
  { id: "solid-world-mask" },
);
semanticLayer._showStar(0, 12, 65, 94, { terrainTint: 0xffffff });
semanticLayer._showStar(1, 12, 66, 94, { terrainTint: 0xffffff });
assert.equal(
  semanticLayer.activeStars[0].emissive.depth,
  WORLD_VISUAL_SEMANTIC_ASSETS.render.townFloorOccludedEmissiveDepth,
  "the surface-row glow must render behind the thin approved cap",
);
assert.equal(
  semanticLayer.activeStars[1].emissive.depth,
  WORLD_VISUAL_SEMANTIC_ASSETS.render.starEmissiveDepth,
  "the first underground row glow must retain its normal emissive depth",
);
semanticLayer.setEmissiveDepth(901);
assert.equal(
  semanticLayer.activeStars[0].emissive.depth,
  WORLD_VISUAL_SEMANTIC_ASSETS.render.townFloorOccludedEmissiveDepth,
  "shader depth rebinding must not reintroduce glow bleed through the foundation",
);
assert.equal(semanticLayer.activeStars[1].emissive.depth, 901);

assert.equal(
  pack.beauty.asset.path,
  "sprites/backgrounds/start-zone-scenic-v1/npc-town-scenic-composite-v2.webp",
  "the ground-only correction must not replace houses or the scenic town",
);
assert.equal(
  pack.ground.asset.path,
  "sprites/backgrounds/world-scenic-regions-v1/"
    + "level1-ground-facade-01-v2.webp?v=benchmark-20260717",
  "the ground-only correction must not replace the diggable underground facade",
);

const floorViewSource = fs.readFileSync(
  new URL("world/rendering/scenic-world/WorldVisualTownFloorView.js", rootUrl),
  "utf8",
);
const semanticSource = fs.readFileSync(
  new URL("world/rendering/scenic-world/WorldVisualSemanticAssetLayer.js", rootUrl),
  "utf8",
);
assert.doesNotMatch(
  floorViewSource,
  /NPC|HUD|DepthBackdrop|MaterialBand|setTile|damageTile|setHp|save/,
  "the Town Square ground view must remain presentation-only and ground-scoped",
);
assert.match(semanticSource, /townFloorOccludedEmissiveDepth/);

console.log(
  "Town Square ground fidelity contract passed: exact Option A core, shared scale, "
    + "ground-only scope, and unchanged underground facade",
);
