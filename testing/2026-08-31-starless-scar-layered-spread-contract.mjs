import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { resolveStarScarBoundaryEdges } from
  "../systems/environment/starScarTerritory.js";
import {
  createStarlessScarSpread,
  filterStarlessScarCellsByRadius,
  resolveStarlessScarHoldRadius,
  resolveStarlessScarPostBreakSpread,
  revealStarlessScarSpreadCells,
} from "../systems/visual/starlessScarSpread.js";
import { STAR_SANCTUARY_CONFIG } from "../values/starSanctuary.js";

const spreadConfig = STAR_SANCTUARY_CONFIG.scar.spread;
const profile = { key: "10,10", tx: 10, ty: 10 };
const startRadius = resolveStarlessScarHoldRadius(0, spreadConfig);
const middleRadius = resolveStarlessScarHoldRadius(0.5, spreadConfig);
const endRadius = resolveStarlessScarHoldRadius(1, spreadConfig);
assert.equal(startRadius, spreadConfig.holdStartRadiusTiles);
assert.ok(middleRadius > startRadius && middleRadius < endRadius);
assert.equal(endRadius, spreadConfig.holdEndRadiusTiles);

const state = createStarlessScarSpread(profile, 1000);
const postStart = resolveStarlessScarPostBreakSpread(
  state,
  1000,
  spreadConfig,
);
const postMiddle = resolveStarlessScarPostBreakSpread(
  state,
  1000 + spreadConfig.postBreakDurationMs * 0.5,
  spreadConfig,
);
const postEnd = resolveStarlessScarPostBreakSpread(
  state,
  1000 + spreadConfig.postBreakDurationMs,
  spreadConfig,
);
assert.equal(postStart.radiusTiles, spreadConfig.postBreakStartRadiusTiles);
assert.ok(postMiddle.radiusTiles > postStart.radiusTiles);
assert.equal(postEnd.radiusTiles, spreadConfig.postBreakEndRadiusTiles);
assert.equal(postEnd.complete, true);

const site = { ...profile };
const otherSite = { key: "30,10", tx: 30, ty: 10 };
const cells = [];
for (let tx = 4; tx <= 16; tx += 1) {
  cells.push({ tx, ty: 10, siteKey: site.key, site });
}
cells.push({ tx: 30, ty: 10, siteKey: otherSite.key, site: otherSite });
const localCells = filterStarlessScarCellsByRadius(cells, profile, 2, 0);
assert.ok(localCells.some(cell => cell.tx === 10));
assert.ok(localCells.every(cell => cell.siteKey === site.key));
assert.ok(localCells.every(cell => Math.abs(cell.tx - 10) <= 2));

const earlyReveal = revealStarlessScarSpreadCells(cells, {
  ...state,
  complete: false,
  radiusTiles: 2,
}, 0);
assert.ok(earlyReveal.some(cell => cell.siteKey === otherSite.key));
assert.ok(earlyReveal.length < cells.length);
assert.equal(
  revealStarlessScarSpreadCells(cells, postEnd).length,
  cells.length,
);

const boundaryCells = [
  { tx: 0, ty: 0, siteKey: site.key, site },
  { tx: 1, ty: 0, siteKey: site.key, site },
];
const edges = resolveStarScarBoundaryEdges(boundaryCells);
assert.equal(edges.filter(edge => edge.kind === "outer").length, 6);
assert.ok(edges.every(edge => (
  ["top", "right", "bottom", "left"].includes(edge.side)
)));
assert.ok(edges.every(edge => Number.isFinite(edge.outwardX)));

const assets = STAR_SANCTUARY_CONFIG.scar.visual.assets;
assert.deepEqual(Object.keys(assets), [
  "ground",
  "corruption",
  "center",
  "frontier",
]);
assert.equal(new Set(Object.values(assets).map(asset => asset.key)).size, 4);
assert.match(assets.ground.path, /walkable-ground-v3\.png$/);
assert.match(assets.center.path, /dead-center-v3\.png$/);
assert.match(assets.frontier.path, /frontier-edge-v3\.png$/);

async function pngHeader(path) {
  const bytes = await readFile(new URL(`../${path}`, import.meta.url));
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
}

const ground = await pngHeader(assets.ground.path);
const center = await pngHeader(assets.center.path);
const frontier = await pngHeader(assets.frontier.path);
assert.deepEqual([ground.width, ground.height], [1254, 1254]);
assert.deepEqual([center.width, center.height], [1254, 1254]);
assert.deepEqual([frontier.width, frontier.height], [1254, 1254]);
assert.equal(ground.colorType, 2, "walkable ground must stay fully opaque RGB");
assert.equal(center.colorType, 6, "center decal must retain RGBA transparency");
assert.equal(frontier.colorType, 6, "frontier decal must retain RGBA transparency");

const bridgeSource = await readFile(
  new URL("../world/playScene/StarSanctuaryBridge.js", import.meta.url),
  "utf8",
);
const bootSource = await readFile(
  new URL("../ui/scenes/BootScene.js", import.meta.url),
  "utf8",
);
const viewSource = await readFile(
  new URL("../systems/visual/StarlessScarView.js", import.meta.url),
  "utf8",
);
assert.match(bridgeSource, /event\.type === "star-consumed"/);
assert.match(bridgeSource, /runtime\.view\.startSpread/);
assert.match(bootSource, /scar\.visual\.assets/);
assert.match(viewSource, /StarlessScarAssetLayer/);
assert.match(viewSource, /resolvePendingStarlessScarPreview/);

console.log("starless scar layered spread contract: ok");
