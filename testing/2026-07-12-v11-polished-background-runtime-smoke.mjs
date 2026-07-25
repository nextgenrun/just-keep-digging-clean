import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { WORLD_BACKGROUND_MASTER_TEST } from "../values/worldBackgroundMasterTest.js";
import { V11_POLISHED_SURFACE_RUNTIME_MANIFEST } from "../values/v11PolishedSurfaceRuntimeManifest.js";
import { V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST } from "../values/v11DepthBackgroundRuntimeManifest.js";
import { WorldBackgroundMasterSystem } from "../world/rendering/WorldBackgroundMasterSystem.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const surface = V11_POLISHED_SURFACE_RUNTIME_MANIFEST;
const depth = V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST;

assert.equal(surface.objectCount, 90);
assert.equal(surface.objects.length, 90);
assert.equal(depth.objectCount, 315);
assert.equal(depth.objects.length, 315);
assert.equal(depth.preparedDepthTiles, 2000);
assert.equal(depth.currentRuntimeDepthTiles, 1935);
assert.equal(depth.futureLevel2DepthTiles, 5000);
assert.equal(depth.futureLevel2Active, false);
assert.equal(depth.futureSources.length, 3);

const level1 = depth.objects.filter((entry) => entry.level === "level1");
const level2 = depth.objects.filter((entry) => entry.level === "level2");
assert.equal(level1.length, 126);
assert.equal(level2.length, 189);

for (const entries of [level1, level2]) {
  assert.equal(Math.min(...entries.map((entry) => entry.yTile)), 105);
  assert.equal(Math.max(...entries.map((entry) => entry.yTile + entry.heightTiles)), 2105);
}
assert.equal(Math.min(...level1.map((entry) => entry.xTile)), 41);
assert.equal(Math.max(...level1.map((entry) => entry.xTile + entry.widthTiles)), 153);
assert.equal(Math.min(...level2.map((entry) => entry.xTile)), 153);
assert.equal(Math.max(...level2.map((entry) => entry.xTile + entry.widthTiles)), 320);

for (const entry of depth.objects) {
  assert.equal(entry.widthPx, entry.widthTiles * 94);
  assert.equal(entry.heightPx, entry.heightTiles * 94);
  assert.equal(entry.sourceWidthPx, entry.widthTiles * 47);
  assert.equal(entry.sourceHeightPx, entry.heightTiles * 47);
  assert.equal(entry.scope, "underground-depth");
  await access(new URL(`../${entry.path}`, import.meta.url));
}
for (const entry of surface.objects) await access(new URL(`../${entry.path}`, import.meta.url));
for (const path of depth.futureSources) await access(new URL(`../${path}`, import.meta.url));

const previousLocation = globalThis.location;
try {
  globalThis.location = { search: "" };
  let system = new WorldBackgroundMasterSystem({});
  assert.equal(system.resolveEnabled(), true);
  assert.equal(system.resolveDepthEnabled(), true);

  globalThis.location = { search: "?worldDepthMaster=0" };
  system = new WorldBackgroundMasterSystem({});
  assert.equal(system.resolveEnabled(), true);
  assert.equal(system.resolveDepthEnabled(), false);

  globalThis.location = { search: "?worldMaster=0&worldDepthMaster=1" };
  system = new WorldBackgroundMasterSystem({});
  assert.equal(system.resolveEnabled(), false);
  assert.equal(system.resolveDepthEnabled(), true);
} finally {
  if (previousLocation === undefined) delete globalThis.location;
  else globalThis.location = previousLocation;
}

assert.equal(WORLD_BACKGROUND_MASTER_TEST.depthQueryParam, "worldDepthMaster");
console.log("v11 polished background runtime smoke: PASS");
