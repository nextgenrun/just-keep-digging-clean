import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTERACTIVE_WORLD_STATES } from "../values/interactiveWorldStates.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW_ROOT = path.join(
  ROOT,
  "visual-approval-previews",
  "interactive-world-states-v1"
);
const MANIFEST_PATH = path.join(
  REVIEW_ROOT,
  "2026-07-29-interactive-world-states-manifest-v1.json"
);
const PROMPT_MANIFEST_PATH = path.join(
  REVIEW_ROOT,
  "2026-07-29-interactive-world-states-prompts-v1.json"
);

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const prompts = JSON.parse(fs.readFileSync(PROMPT_MANIFEST_PATH, "utf8"));

assert.equal(manifest.version, 1);
assert.equal(manifest.reviewOnly, true);
assert.equal(manifest.runtimeWired, false);
assert.deepEqual(manifest.grid, [5, 2]);
assert.deepEqual(manifest.frameSize, [448, 448]);
assert.deepEqual(manifest.atlasSize, [2240, 896]);
assert.deepEqual(manifest.counts, {
  biomes: 10,
  familiesPerBiome: 10,
  sourceSheets: 100,
  atlases: 100,
  statesPerAtlas: 10,
  totalAssets: 1000,
  uniqueRgbaFrames: 1000,
  uniqueSourceSheets: 100,
});

assert.equal(manifest.biomes.length, 10);
assert.equal(manifest.families.length, 10);
assert.equal(manifest.atlases.length, 100);
assert.equal(manifest.entries.length, 1000);
assert.equal(prompts.records.length, 100);
assert.equal(prompts.formula.totalAssets, 1000);
assert.equal(prompts.formula.sourceSheets, 100);

const expectedStates = [
  "dormant",
  "proximity-ready",
  "activation-01",
  "activation-02",
  "activation-03",
  "active-loop-a",
  "active-loop-b",
  "resolved-success",
  "depleted-spent",
  "damaged-broken",
];
assert.deepEqual(manifest.stateIds, expectedStates);

const entryIds = new Set();
const rgbaHashes = new Set();
const sourceHashes = new Set();
const runtimeHashes = new Set();
const familyStateCounts = new Map();
const biomeCounts = new Map();

for (const atlas of manifest.atlases) {
  assert.equal(atlas.frameCount, 10);
  assert.ok(atlas.sourceSize[0] >= 1400);
  assert.ok(atlas.sourceSize[1] >= 800);
  assert.ok(atlas.runtimeBytes > 20_000);
  assert.ok(fs.statSync(path.join(ROOT, atlas.source)).isFile(), atlas.source);
  assert.ok(fs.statSync(path.join(ROOT, atlas.runtime)).isFile(), atlas.runtime);
  sourceHashes.add(atlas.sourceSha256);
  runtimeHashes.add(atlas.runtimeSha256);
}

for (const entry of manifest.entries) {
  assert.ok(!entryIds.has(entry.id), `duplicate entry id: ${entry.id}`);
  assert.ok(
    !rgbaHashes.has(entry.rgbaSha256),
    `duplicate RGBA frame: ${entry.id}`
  );
  assert.ok(entry.alphaCoverage >= 0.035, entry.id);
  assert.ok(entry.alphaCoverage <= 0.84, entry.id);
  assert.deepEqual(entry.crop.slice(2), [448, 448]);
  assert.ok(entry.widthTiles[0] >= 3, entry.id);
  assert.ok(entry.heightTiles[0] >= 3, entry.id);
  entryIds.add(entry.id);
  rgbaHashes.add(entry.rgbaSha256);
  const familyKey = `${entry.biomeId}/${entry.familyId}`;
  familyStateCounts.set(
    familyKey,
    (familyStateCounts.get(familyKey) || 0) + 1
  );
  biomeCounts.set(
    entry.biomeId,
    (biomeCounts.get(entry.biomeId) || 0) + 1
  );
}

assert.equal(entryIds.size, 1000);
assert.equal(rgbaHashes.size, 1000);
assert.equal(sourceHashes.size, 100);
assert.equal(runtimeHashes.size, 100);
assert.equal(familyStateCounts.size, 100);
assert.equal(biomeCounts.size, 10);
for (const count of familyStateCounts.values()) assert.equal(count, 10);
for (const count of biomeCounts.values()) assert.equal(count, 100);

const excludedDomains = [
  "particles and VFX",
  "mining and ability effects",
  "weather and hazards",
  "ambience and lighting-only companions",
  "UI and HUD states",
];
for (const domain of excludedDomains) {
  assert.ok(
    manifest.nonOverlapContract.companionLibraryOwns.includes(domain),
    `missing non-overlap domain: ${domain}`
  );
}

const productionRoots = [
  "main.js",
  "player",
  "scenes",
  "systems",
  "ui",
  "values/interactiveWorldStates.js",
  "world",
];
const forbiddenRuntimeNeedle = "interactive-world-states-v1";
const runtimeReferences = [];

function walkProduction(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return;
  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(absolutePath)) {
      walkProduction(path.join(relativePath, child));
    }
    return;
  }
  if (!absolutePath.endsWith(".js")) return;
  const source = fs.readFileSync(absolutePath, "utf8");
  if (source.includes(forbiddenRuntimeNeedle)) {
    runtimeReferences.push(relativePath.replaceAll("\\", "/"));
  }
}

for (const relativePath of productionRoots) walkProduction(relativePath);
assert.deepEqual(
  runtimeReferences,
  ["values/interactiveWorldStates.js"],
  "only the explicit production allowlist may reference the candidate library"
);
assert.deepEqual(
  INTERACTIVE_WORLD_STATES.approvedFamilies,
  ["cache", "memory-reliquary"],
);

console.log(JSON.stringify({
  pass: true,
  sourceSheets: manifest.atlases.length,
  atlases: manifest.atlases.length,
  assets: manifest.entries.length,
  uniqueFrames: rgbaHashes.size,
  runtimeWired: manifest.runtimeWired,
}));
