import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TITAN_DEFINITIONS,
  TITAN_DISCOVERY_CONFIG,
  getTitanDiscoveryPreloadAssets,
  getTitanGameplayPreloadAssets,
  resolveTitanEnvironmentEnabled,
} from "../values/titanDiscoveries.js";
import {
  WORLD_VISUAL_BACKDROP_ENHANCERS,
} from "../values/worldVisualBackdropEnhancers.js";
import {
  resolveTitanEnvironmentAssets,
} from "../systems/visual/titanEnvironmentAssets.js";
import { readWebpMetadata } from "./2026-07-28-webp-test-utils.mjs";
import { readRgbaPng } from "./titanCreatureFootprintFixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const environment = TITAN_DISCOVERY_CONFIG.environmentEnvelope;
const underground = TITAN_DISCOVERY_CONFIG.underground;
const expectedFamilies = environment.layers.map(layer => layer.family);
const validRegionIds = new Set(
  WORLD_VISUAL_BACKDROP_ENHANCERS.regions.map(region => region.id)
);

assert.equal(TITAN_DEFINITIONS.length, 25);
assert.equal(new Set(TITAN_DEFINITIONS.map(item => item.regionId)).size, 10);
assert.ok(TITAN_DEFINITIONS.every(item => validRegionIds.has(item.regionId)));
assert.equal(environment.assetVersion, "biome-backdrop-enhancers-v7");
assert.deepEqual(expectedFamilies, [
  "side-arches",
  "ceiling-crown",
  "hanging-network",
]);
assert.ok(environment.layers.every(layer => (
  layer.depth < underground.spriteDepth
)));

const assignments = TITAN_DEFINITIONS.flatMap(definition => {
  const resolved = resolveTitanEnvironmentAssets(definition);
  assert.equal(resolved.length, 3, definition.id);
  assert.deepEqual(
    resolved.map(item => item.profile.family),
    expectedFamilies,
    `${definition.id} layer families`,
  );
  assert.ok(resolved.every(item => item.regionId === definition.regionId));
  return resolved;
});
assert.equal(assignments.length, 75);
const selectedAssets = new Map(
  assignments.map(assignment => [
    assignment.asset.key,
    assignment.asset,
  ]),
);
assert.equal(selectedAssets.size, 30);
for (const asset of selectedAssets.values()) {
  const assetPath = path.join(ROOT, asset.path);
  assert.equal(fs.existsSync(assetPath), true, asset.path);
  assert.deepEqual(readWebpMetadata(assetPath), {
    width: 1536,
    height: 1024,
    alphaFlag: true,
    hasAlpha: true,
  });
  assert.equal(asset.blendMode, "NORMAL");
}

const contact = readRgbaPng(new URL(
  `../${TITAN_DISCOVERY_CONFIG.assets.groundContact.path}`,
  import.meta.url,
));
const resonance = readRgbaPng(new URL(
  `../${TITAN_DISCOVERY_CONFIG.assets.unlockResonance.path}`,
  import.meta.url,
));
assert.deepEqual([contact.width, contact.height], [1198, 292]);
assert.deepEqual([resonance.width, resonance.height], [1511, 1041]);
assert.ok(contact.rgba.some((value, index) => index % 4 === 3 && value > 0));
assert.ok(resonance.rgba.some((value, index) => index % 4 === 3 && value > 0));

const fullPreload = getTitanDiscoveryPreloadAssets();
const gameplayPreload = getTitanGameplayPreloadAssets();
assert.equal(fullPreload.length, 56);
assert.equal(gameplayPreload.length, 31);
assert.equal(new Set(fullPreload.map(asset => asset.key)).size, 56);
assert.ok(fullPreload.some(asset => (
  asset.key === TITAN_DISCOVERY_CONFIG.assets.groundContact.key
)));
assert.ok(fullPreload.some(asset => (
  asset.key === TITAN_DISCOVERY_CONFIG.assets.unlockResonance.key
)));

assert.equal(resolveTitanEnvironmentEnabled(undefined, ""), true);
assert.equal(
  resolveTitanEnvironmentEnabled(undefined, "?titanEnvironment=0"),
  false,
);
assert.equal(
  resolveTitanEnvironmentEnabled(undefined, "?titanEnvironment=off"),
  false,
);
assert.equal(
  resolveTitanEnvironmentEnabled(undefined, "?titans=0"),
  false,
);

assert.ok(underground.daisAlpha <= 0.3);
assert.ok(underground.contactDepth > underground.spriteDepth);
assert.ok(underground.contactDiscoveredAlpha >= 0.9);
assert.equal(Object.hasOwn(underground, "idleDriftPixels"), false);
assert.ok(underground.idleBreathScale <= 0.005);
assert.ok(
  TITAN_DISCOVERY_CONFIG.unlockFx.anticipationMs
    + TITAN_DISCOVERY_CONFIG.unlockFx.liftMs
    + TITAN_DISCOVERY_CONFIG.unlockFx.settleMs
    <= 1200,
);

const viewSource = fs.readFileSync(
  path.join(ROOT, "systems/visual/titanDiscoveryView.js"),
  "utf8",
);
const fxSource = fs.readFileSync(
  path.join(ROOT, "systems/visual/titanDiscoveryFx.js"),
  "utf8",
);
const systemSource = fs.readFileSync(
  path.join(ROOT, "systems/visual/TitanDiscoverySystem.js"),
  "utf8",
);
const streamSource = fs.readFileSync(
  path.join(ROOT, "systems/visual/TitanEnvironmentEnvelopeStream.js"),
  "utf8",
);
assert.match(viewSource, /setOrigin\(0\.5, 1\)/);
assert.match(viewSource, /groundBaselineInsetTiles/);
assert.match(viewSource, /groundContact/);
assert.match(viewSource, /syncTitanDiscoveryEnvironment/);
assert.match(viewSource, /mixWorldVisualTint/);
assert.match(fxSource, /resonanceAssetId/);
assert.match(fxSource, /compressionScaleY/);
assert.match(fxSource, /liftPixels/);
assert.match(fxSource, /settleMs/);
assert.doesNotMatch(
  fxSource,
  /scene\.add\.(circle|ellipse|rectangle|graphics)/,
);
assert.doesNotMatch(fxSource, /travelTiles|crossingMs/);
assert.match(systemSource, /environmentStream\.sync/);
assert.match(systemSource, /idleBreathScale/);
assert.doesNotMatch(systemSource, /idleDriftPixels/);
assert.match(streamSource, /maxResidentTitans/);
assert.match(streamSource, /resolveTitanEnvironmentAssets/);
assert.match(streamSource, /textureBank\.request/);

console.log(
  "Titan underground grounding polish contract: 25 bottom-anchored Titans, "
    + "75 biome-envelope mappings, authored ground contact, depth grading, "
    + "and weighted raster-only unlock motion passed",
);

