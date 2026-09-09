import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { NPC_ACTIVITY_CONFIG } from "../values/npcActivityConfig.js";
import { TITAN_DISCOVERY_CONFIG } from "../values/titanDiscoveries.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";
import {
  WORLDROOT_WHITEBOX_CONFIG,
  isWorldrootWhiteboxEnabled,
} from "../values/worldrootWhitebox.js";

const config = WORLDROOT_WHITEBOX_CONFIG;
const bounds = config.bounds;
const widthTiles = bounds.rightTile - bounds.leftTile;
const heightTiles = bounds.bottomTile - bounds.topTile;

assert.equal(isWorldrootWhiteboxEnabled(""), false, "Gate A must never replace the default Worldroot");
assert.equal(isWorldrootWhiteboxEnabled("?worldrootWhitebox=1"), true);
assert.equal(isWorldrootWhiteboxEnabled("?worldrootWhitebox=review"), true);
assert.ok(widthTiles >= 45 && widthTiles <= 55, "whitebox must retain the approved panoramic width");
assert.ok(heightTiles >= 18 && heightTiles <= 22, "whitebox must retain the approved inspectable height");
assert.equal(config.platforms.length, 12, "every broad branch contact must remain explicit");
assert.equal(config.starSockets.length, 50, "all fifty Level One Star memories need physical room");
assert.equal(config.systemSockets.length, 5, "Campfire, Talents, GP, Titans, and Crown need separate sockets");

assert.equal(new Set(config.platforms.map(entry => entry.id)).size, config.platforms.length);
assert.equal(new Set(config.starSockets.map(entry => entry.id)).size, 50);
assert.deepEqual(
  Object.fromEntries(config.modules.slice(0, 5).map(module => [
    module.id,
    config.starSockets.filter(socket => socket.moduleId === module.id).length,
  ])),
  { rootways: 10, cobalt: 10, amber: 10, mirror: 10, starfire: 10 },
  "each biome country needs ten unbaked Star sockets",
);
assert.deepEqual(
  config.systemSockets.map(socket => socket.id),
  ["campfire-current", "talent-access", "gp-current", "titan-chorus", "crown-star"],
);

const silhouetteById = new Map(config.silhouettes.map(entry => [entry.id, entry]));
for (const contact of config.platforms) {
  const silhouette = silhouetteById.get(contact.id);
  assert.ok(silhouette, `${contact.id} collision must have a visible matching branch`);
  assert.deepEqual(
    silhouette.points.slice(0, 2),
    [
      { x: contact.leftTile, y: contact.yTile },
      { x: contact.rightTile, y: contact.yTile },
    ],
    `${contact.id} collision must equal the flat silhouette top edge`,
  );
  assert.ok(contact.rightTile - contact.leftTile >= 3.1, `${contact.id} is too narrow to inspect`);
  assert.ok(contact.yTile < bounds.bottomTile, `${contact.id} cannot be buried in the surface`);
}

for (const module of config.modules.slice(1)) {
  assert.ok(
    config.connectors.some(connector => connector.moduleId === module.id),
    `${module.id} must visibly grow from another branch instead of floating`,
  );
}

const finalMerchantTile = Math.max(
  ...Object.values(TOWN_SQUARE_CONFIG.merchantSlots).map(slot => slot.tileX),
);
const merchantVisibleRightTile = finalMerchantTile + 0.5
  + NPC_ACTIVITY_CONFIG.render.displayScale / 2;
assert.ok(
  bounds.leftTile >= merchantVisibleRightTile + config.clearance.merchantGapTiles,
  "the root mass must start beyond the final merchant silhouette",
);

const gallery = TITAN_DISCOVERY_CONFIG.surfaceGallery;
const firstTitanLeftTile = gallery.startTileX
  - gallery.maxWidthTiles * gallery.maximumScaleMultiplier / 2;
const rootRightTile = Math.max(
  ...config.silhouettes
    .filter(entry => entry.moduleId === "rootways")
    .flatMap(entry => entry.points.map(item => item.x)),
);
assert.ok(
  rootRightTile <= firstTitanLeftTile - config.clearance.titanGroundGapTiles,
  "grounded roots must stop before Titan #1",
);

function sampleSegments(points, radiusTiles = 0) {
  const samples = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    for (let step = 0; step <= 40; step += 1) {
      const t = step / 40;
      samples.push({
        x: points[index].x + (points[index + 1].x - points[index].x) * t,
        y: points[index].y + (points[index + 1].y - points[index].y) * t + radiusTiles,
      });
    }
  }
  return samples;
}

const canopySamples = [
  ...config.silhouettes
    .filter(entry => entry.moduleId !== "rootways")
    .flatMap(entry => sampleSegments([...entry.points, entry.points[0]])),
  ...config.connectors
    .flatMap(entry => sampleSegments(entry.points, entry.widthTiles / 2)),
].filter(item => item.x >= firstTitanLeftTile);
const lowestCanopyTile = Math.max(...canopySamples.map(item => item.y));
const titanTopTile = 65 + gallery.baselineOffsetTiles - gallery.maxHeightTiles;
const canopyLimitTile = titanTopTile - config.clearance.titanCanopyAirGapTiles;
assert.ok(lowestCanopyTile <= canopyLimitTile, "the complete canopy must clear the tallest Titan by 1.5 tiles");
assert.ok(config.clearance.lowestCanopyBottomTile <= canopyLimitTile);

const serialized = JSON.stringify(config);
assert.doesNotMatch(serialized, /"(?:asset|texture|rotation|angle)"/, "whitebox cannot bake art or perspective transforms");
assert.equal(serialized.includes("fruit"), false, "fruit art remains separate from empty Star sockets");

const [worldVisualSource, whiteboxSource] = await Promise.all([
  readFile(new URL("../systems/visual/WorldrootWorldVisual.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/WorldrootWhiteboxView.js", import.meta.url), "utf8"),
]);
assert.match(worldVisualSource, /new WorldrootWhiteboxView\(this\.scene\)/);
assert.match(worldVisualSource, /whiteboxView\.getOneWayPlatforms\(\)/);
assert.match(whiteboxSource, /source: "worldroot-whitebox"/);
assert.match(whiteboxSource, /setScrollFactor\(0\)/, "review mode needs an unmistakable fixed legend");

console.log("Worldroot collision whitebox contract checks passed.");
