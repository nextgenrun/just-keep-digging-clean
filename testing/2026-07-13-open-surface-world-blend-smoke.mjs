import assert from "node:assert/strict";
import { WEATHER_CONFIG } from "../values/weatherConfig.js";
import { WORLD_BACKGROUND_MASTER_TEST } from "../values/worldBackgroundMasterTest.js";
import { WeatherOcclusionSampler } from "../systems/environment/WeatherOcclusionSampler.js";
import { WorldBackgroundMasterSystem } from "../world/rendering/WorldBackgroundMasterSystem.js";

assert.equal(WEATHER_CONFIG.surfaceLandingMask.enabled, false,
  "the removed indoor-town mask must not shelter the v11 surface");
assert.deepEqual(WEATHER_CONFIG.visualCovers, [],
  "legacy town-roof rectangles must not block surface rain");

const tileSize = 94;
const surfaceRow = 65;
const scene = {
  cameras: {
    main: {
      width: 1280,
      height: 720,
      scrollX: 0,
      scrollY: 60 * tileSize,
      worldView: { x: 0, y: 60 * tileSize, width: 1280, height: 720 },
    },
  },
  worldModel: {
    isSolid: (_tx, ty) => ty === surfaceRow,
  },
};
const sampler = new WeatherOcclusionSampler(
  scene,
  { tileSize, topAirRows: surfaceRow, worldDepthTiles: 2000, viewportWidth: 1280, viewportHeight: 720 },
  WEATHER_CONFIG,
);
sampler.update(0);
const rain = sampler.getSnapshot();
assert.equal(rain.coveredAmount, 0, "every visible surface column should remain open to weather");
assert.ok(rain.samples.some(sample => sample.source === "tile"),
  "rain should land on the real row-65 world tiles");
assert.ok(rain.samples.every(sample => !sample.source.startsWith("surfaceMask")),
  "no sample may use the obsolete authored landing mask");

const master = Object.create(WorldBackgroundMasterSystem.prototype);
master.config = WORLD_BACKGROUND_MASTER_TEST;
master.manifest = { tileSize, xOffsetPx: -40 * tileSize, yOffsetPx: -40 * tileSize };
const ground = master.getObjectRect({
  name: "level1-ground-04", xPx: 75 * tileSize, yPx: 94 * tileSize,
  widthPx: 12 * tileSize, heightPx: 11 * tileSize,
});
const town = master.getObjectRect({
  name: "town-ground-01", xPx: 43 * tileSize, yPx: 102 * tileSize,
  widthPx: 13 * tileSize, heightPx: 3 * tileSize,
});
assert.equal(ground.bottom / tileSize, surfaceRow + WORLD_BACKGROUND_MASTER_TEST.surfaceArtAlignment.groundDownshiftTiles,
  "painted terrain should sink behind the actual surface tiles");
assert.equal(town.bottom / tileSize, surfaceRow,
  "the NPC town foreground remains authored on the one shared surface row");
assert.ok(master.getObjectStyle({ name: "town-ground-01" }).alphaMultiplier < 1,
  "the former indoor-town card should blend with the shared outdoor landscape");

console.log("Open surface weather and world-blend smoke passed");
