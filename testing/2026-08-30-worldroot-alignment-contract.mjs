import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  WORLDROOT_GATE_B_CONFIG,
  WORLDROOT_GATE_C_CONFIG,
  resolveWorldrootNativeModuleBounds,
  resolveWorldrootNativeModuleGeometry,
} from "../values/worldrootModuleArt.js";
import { WORLDROOT_WHITEBOX_CONFIG } from "../values/worldrootWhitebox.js";

const require = createRequire(import.meta.url);
const sharp = (() => {
  try { return require("sharp"); } catch {
    return require(join(
      process.env.USERPROFILE || "",
      ".cache", "codex-runtimes", "codex-primary-runtime",
      "dependencies", "node", "node_modules", "sharp",
    ));
  }
})();

const configs = [WORLDROOT_GATE_B_CONFIG, WORLDROOT_GATE_C_CONFIG];
const tileSize = WORLDROOT_GATE_B_CONFIG.sourceTileSizePx;
const geometry = WORLDROOT_WHITEBOX_CONFIG;

function pointSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const denominator = dx * dx + dy * dy;
  const ratio = denominator > 0
    ? Math.max(0, Math.min(1, (
      (point.x - start.x) * dx + (point.y - start.y) * dy
    ) / denominator))
    : 0;
  return Math.hypot(
    point.x - (start.x + dx * ratio),
    point.y - (start.y + dy * ratio),
  );
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if ((currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < (
        (previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)
        / (previousPoint.y - currentPoint.y)
      ) + currentPoint.x) inside = !inside;
  }
  return inside;
}

function pointPolygonDistance(point, polygon) {
  if (pointInPolygon(point, polygon)) return 0;
  return Math.min(...polygon.map((start, index) => (
    pointSegmentDistance(point, start, polygon[(index + 1) % polygon.length])
  )));
}

function pointPolylineDistance(point, polyline) {
  return Math.min(...polyline.slice(0, -1).map((start, index) => (
    pointSegmentDistance(point, start, polyline[index + 1])
  )));
}

for (const connector of geometry.connectors) {
  const radius = connector.widthTiles / 2;
  for (const [side, endpoint] of [
    ["start", connector.points[0]],
    ["end", connector.points.at(-1)],
  ]) {
    const touchesSilhouette = geometry.silhouettes.some(silhouette => (
      pointPolygonDistance(endpoint, silhouette.points)
        <= radius + WORLDROOT_GATE_B_CONFIG.alignment.joinEpsilonTiles
    ));
    const touchesConnector = geometry.connectors.some(other => (
      other.id !== connector.id
      && pointPolylineDistance(endpoint, other.points)
        <= radius + other.widthTiles / 2
          + WORLDROOT_GATE_B_CONFIG.alignment.joinEpsilonTiles
    ));
    assert.ok(
      touchesSilhouette || touchesConnector,
      `${connector.id} ${side} is an unconnected whitebox endpoint`,
    );
  }
}

const art = [];
for (const config of configs) {
  assert.equal(config.runtimeScale, 1, `Gate ${config.gateLabel} must stay native scale`);
  for (const module of config.modules) {
    assert.ok(
      Math.abs(module.sourceOffsetYPx) <= config.maximumSourceOffsetPx,
      `${module.id} exceeds the bounded native source translation`,
    );
    const bounds = resolveWorldrootNativeModuleBounds(geometry, module, config);
    const assetPath = fileURLToPath(new URL(
      `../${module.path.split("?")[0]}`,
      import.meta.url,
    ));
    const alpha = await sharp(assetPath).ensureAlpha().extractChannel(3).raw().toBuffer();
    art.push({
      module,
      config,
      bounds,
      alpha,
      width: bounds.widthPx,
      moduleGeometry: resolveWorldrootNativeModuleGeometry(geometry, module),
    });
  }
}

function maximumWorldAlpha(worldX, worldY, radiusPx) {
  let maximum = 0;
  for (const entry of art) {
    const localX = Math.round(worldX - entry.bounds.worldLeftPx);
    const localY = Math.round(worldY - entry.bounds.worldTopPx);
    if (localX + radiusPx < 0 || localY + radiusPx < 0
      || localX - radiusPx >= entry.bounds.widthPx
      || localY - radiusPx >= entry.bounds.heightPx) continue;
    for (let dy = -radiusPx; dy <= radiusPx; dy += 1) {
      const y = localY + dy;
      if (y < 0 || y >= entry.bounds.heightPx) continue;
      for (let dx = -radiusPx; dx <= radiusPx; dx += 1) {
        const x = localX + dx;
        if (x < 0 || x >= entry.bounds.widthPx) continue;
        maximum = Math.max(maximum, entry.alpha[y * entry.width + x] || 0);
      }
    }
  }
  return maximum;
}

const paintedCountries = new Set(art.map(entry => entry.module.moduleId));
const paintedPlatforms = geometry.platforms.filter(platform => (
  paintedCountries.has(platform.moduleId)
));
for (const platform of paintedPlatforms) {
  const alignment = WORLDROOT_GATE_B_CONFIG.alignment;
  const left = Math.ceil(platform.leftTile * tileSize)
    + alignment.contactEndpointTolerancePx;
  const right = Math.floor(platform.rightTile * tileSize)
    - alignment.contactEndpointTolerancePx;
  const y = Math.round(platform.yTile * tileSize);
  const missing = [];
  for (let x = left; x <= right; x += 1) {
    if (maximumWorldAlpha(x, y, alignment.contactSampleRadiusPx)
      < WORLDROOT_GATE_B_CONFIG.build.visibleAlpha) missing.push(x);
  }
  assert.deepEqual(missing, [], `${platform.id} has ${missing.length} empty contact pixels`);
}

const paintedConnectorIds = new Set(art.flatMap(entry => (
  entry.moduleGeometry.connectors.map(connector => connector.id)
)));
for (const connector of geometry.connectors.filter(entry => paintedConnectorIds.has(entry.id))) {
  for (let segment = 0; segment < connector.points.length - 1; segment += 1) {
    const start = connector.points[segment];
    const end = connector.points[segment + 1];
    const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) * tileSize);
    for (let step = 0; step <= steps; step += 1) {
      const ratio = step / steps;
      const x = (start.x + (end.x - start.x) * ratio) * tileSize;
      const y = (start.y + (end.y - start.y) * ratio) * tileSize;
      assert.ok(
        maximumWorldAlpha(
          x,
          y,
          WORLDROOT_GATE_B_CONFIG.alignment.connectorSampleRadiusPx,
        ) >= WORLDROOT_GATE_B_CONFIG.build.visibleAlpha,
        `${connector.id} has empty art at segment ${segment}, sample ${step}`,
      );
    }
  }
}

console.log(
  `WORLDROOT_ALIGNMENT_CONTRACT_OK endpoints=${geometry.connectors.length * 2}`
  + ` platforms=${paintedPlatforms.length} connectors=${paintedConnectorIds.size}`,
);
