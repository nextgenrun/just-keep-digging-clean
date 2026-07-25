import assert from "node:assert/strict";
import { WORLD_BACKGROUND_MASTER_TEST } from "../values/worldBackgroundMasterTest.js";
import { V11_POLISHED_SURFACE_RUNTIME_MANIFEST } from "../values/v11PolishedSurfaceRuntimeManifest.js";
import { V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST } from "../values/v11DepthBackgroundRuntimeManifest.js";
import { WorldBackgroundMasterSystem } from "../world/rendering/WorldBackgroundMasterSystem.js";

const tileSize = V11_POLISHED_SURFACE_RUNTIME_MANIFEST.tileSize;
const camera = {
  zoom: 1,
  width: tileSize,
  height: tileSize,
  scrollX: 50 * tileSize,
  scrollY: 2064 * tileSize,
  worldView: { x: 50 * tileSize, y: 2064 * tileSize, width: tileSize, height: tileSize },
};
const scene = { cameras: { main: camera } };
const system = new WorldBackgroundMasterSystem(scene);
system.enabled = true;
system.activeObjects = system.objects.filter(({ entry }) => entry.active !== false);

const crop = system.getRuntimeCropBounds();
assert.equal(crop.bottom / tileSize, 5065, "crop must include the final playable deep-world row");

const probePositions = [
  [-200, -200],
  [0, 0],
  [50, 1999],
  [50, 2064],
  [500, 5000],
];
for (const [xTile, yTile] of probePositions) {
  camera.worldView.x = xTile * tileSize;
  camera.worldView.y = yTile * tileSize;
  const bounds = system.getCameraBounds(0, 0);
  assert.ok(bounds.left <= bounds.right, `horizontal bounds inverted at ${xTile},${yTile}`);
  assert.ok(bounds.top <= bounds.bottom, `vertical bounds inverted at ${xTile},${yTile}`);
}

camera.worldView.x = 50 * tileSize;
camera.worldView.y = 2064 * tileSize;
let queued = [];
system.syncLoadedObjects = () => {};
system.queueMissingTextures = (items) => { queued = items; };
system.unloadDistantObjects = () => {};
system.update();

const deepestLevelOne = queued.filter(({ entry }) => entry.level === "level1");
assert.ok(deepestLevelOne.length > 0, "deepest Level 1 camera must queue a background chunk");
assert.ok(
  deepestLevelOne.some(({ entry }) => {
    const top = entry.yTile + V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST.yOffsetTiles;
    return top <= 2064 && top + entry.heightTiles > 2064;
  }),
  "queued Level 1 background must cover runtime row 2064",
);

camera.worldView.x = 150 * tileSize;
camera.worldView.y = 5064 * tileSize;
queued = [];
system.update();
assert.ok(
  queued.some(({ entry }) => entry.deepContinuation
    && system.getObjectRect(entry).top <= 5064 * tileSize
    && system.getObjectRect(entry).bottom > 5064 * tileSize),
  "final playable row must queue a continued high-detail background plate",
);

assert.equal(WORLD_BACKGROUND_MASTER_TEST.depthEnabled, true);
console.log("v11 background depth streaming smoke: PASS (rows 2064 and 5064 covered, bounds ordered)");
