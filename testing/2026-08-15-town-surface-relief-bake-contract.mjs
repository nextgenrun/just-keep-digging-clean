import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getWorldVisualSurfacePackPreloadAssets,
  resolveWorldVisualSurfacePack,
  WORLD_VISUAL_SURFACE_PACKS,
} from "../values/worldVisualSurfacePacks.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "sprites/backgrounds/start-zone-scenic-v1/npc-town-scenic-composite-v2-relief-bake-v1.json",
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const defaultPack = resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "");
const reliefPack = resolveWorldVisualSurfacePack(
  WORLD_VISUAL_SURFACE_PACKS,
  "?surfaceRelief=1",
);
assert.equal(defaultPack.id, "town-benchmark-v1");
assert.equal(reliefPack.id, "town-benchmark-relief-v1");
assert.notEqual(reliefPack.beauty.asset.key, defaultPack.beauty.asset.key);
assert.equal(reliefPack.beauty.expectedSource, defaultPack.beauty.expectedSource);
assert.equal(reliefPack.floor, defaultPack.floor);
assert.equal(reliefPack.ground, defaultPack.ground);
assert.equal(
  resolveWorldVisualSurfacePack(
    WORLD_VISUAL_SURFACE_PACKS,
    "?surfacePack=current-v2&surfaceRelief=1",
  ),
  null,
  "the complete surface-pack rollback must override the review bake",
);

const preload = getWorldVisualSurfacePackPreloadAssets(
  WORLD_VISUAL_SURFACE_PACKS,
  "?surfaceRelief=1",
);
assert.equal(preload[0], reliefPack.beauty.asset);
assert.equal(preload.length, 3);

const sourcePath = path.join(root, manifest.source);
const outputPath = path.join(root, manifest.output);
assert.equal(hash(sourcePath), manifest.sourceSha256);
assert.equal(hash(outputPath), manifest.outputSha256);
assert.equal(manifest.width, 1801);
assert.equal(manifest.height, 941);
assert.ok(manifest.maximumPositiveCorrection <= 0.075);
assert.ok(manifest.maximumNegativeCorrection >= -0.06);
assert.ok(manifest.meanAbsoluteChannelDifference > 0.003);
assert.ok(manifest.meanAbsoluteChannelDifference < 0.006);

console.log(
  "town surface relief bake contract: exact active-asset derivation, default-off routing, "
  + "rollback precedence, aligned preload, hashes, and correction ceilings passed",
);
