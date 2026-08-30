import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW = path.join(ROOT, "testing/animation-sandbox/2026-08-30-observatory-realtime-depth-motion-v1");
const PACK = path.join(REVIEW, "pack");
const SOURCE = path.join(ROOT, "sprites/backgrounds/world-visual-v2/far/sky-cohesion-v1/2026-07-28-sky-13-level2-lower-iron-forge-haze-v1.webp");
const TOWN_VIDEO = path.join(ROOT, "sprites/backgrounds/start-zone-scenic-v1/living-background-v1/surface-town-air-v1.mp4");

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function pngInfo(filePath) {
  const bytes = await readFile(filePath);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG", `${filePath} is not PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

const manifest = JSON.parse(await readFile(path.join(PACK, "manifest-v2.json"), "utf8"));
const config = await readFile(path.join(ROOT, "values/observatoryLayeredAtmosphereReview.js"), "utf8");
const cloudShader = await readFile(path.join(REVIEW, "observatoryCloudFlowShader.js"), "utf8");
const lightShader = await readFile(path.join(REVIEW, "observatoryEmissiveShader.js"), "utf8");
const runtime = await readFile(path.join(REVIEW, "main.js"), "utf8");

assert.equal(manifest.status, "review-only");
assert.equal(manifest.version, 2);
assert.equal(manifest.source.sha256, await sha256(SOURCE));
assert.equal(manifest.townSquareGuard.sha256, await sha256(TOWN_VIDEO));
assert.equal(manifest.townSquareGuard.modified, false);
assert.equal(manifest.decomposition.cloudLayerCount, 5);
assert.ok(manifest.decomposition.lightClusterCount >= 20, "individual light groups were not retained");
assert.equal(manifest.decomposition.architectureSeparated, true);
assert.equal(manifest.decomposition.lightsSeparated, true);
assert.ok(manifest.reconstruction.meanAbsoluteRgb < 0.01);
assert.ok(manifest.reconstruction.pixelsOver12 < 0.005);

for (const [name, hash] of Object.entries(manifest.assets)) {
  assert.equal(await sha256(path.join(PACK, name)), hash, `${name} hash drifted`);
  assert.deepEqual((await pngInfo(path.join(PACK, name))).width, 1672);
  assert.deepEqual((await pngInfo(path.join(PACK, name))).height, 941);
}
for (const name of ["architecture-diffuse-v2.png", "architecture-emissive-v2.png", "upper-crown-v2.png", "cloud-sea-near-v2.png"]) {
  assert.equal((await pngInfo(path.join(PACK, name))).colorType, 6, `${name} must retain RGBA separation`);
}

assert.match(config, /cloudLayers:\s*Object\.freeze/);
assert.match(config, /architecture-emissive-v2\.png/);
assert.match(config, /architecture-light-id-v2\.png/);
assert.match(config, /loopSeconds:\s*32/);
assert.match(cloudShader, /waveA/);
assert.match(cloudShader, /waveB/);
assert.match(cloudShader, /uPhase\s*\*\s*uCycles/);
assert.doesNotMatch(cloudShader, /uDepthSampler|uDomainSampler/);
assert.match(lightShader, /uLightIdSampler/);
assert.match(lightShader, /seedFromId/);
assert.match(runtime, /Phaser\.BlendModes\.ADD/);
assert.match(runtime, /architectureStatic:\s*true/);
assert.doesNotMatch(runtime, /surface-town-air-v1\.mp4/);
assert.doesNotMatch(runtime, /ObservatoryDepthMotionPipeline/);

console.log("OBSERVATORY_SEGMENTED_ATMOSPHERE_CONTRACT_OK");
