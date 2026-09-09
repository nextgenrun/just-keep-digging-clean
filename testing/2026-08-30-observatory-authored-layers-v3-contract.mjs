import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW = path.join(ROOT, "testing/animation-sandbox/2026-08-30-observatory-authored-layers-v3");
const PACK = path.join(REVIEW, "pack");
const REFERENCE = path.join(ROOT, "sprites/backgrounds/world-visual-v2/far/sky-cohesion-v1/2026-07-28-sky-13-level2-lower-iron-forge-haze-v1.webp");
const TOWN_VIDEO = path.join(ROOT, "sprites/backgrounds/start-zone-scenic-v1/living-background-v1/surface-town-air-v1.mp4");

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function pngInfo(filePath) {
  const bytes = await readFile(filePath);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG", `${filePath} is not PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

const manifest = JSON.parse(await readFile(path.join(PACK, "manifest-v3.json"), "utf8"));
const config = await readFile(path.join(ROOT, "values/observatoryAuthoredLayersReview.js"), "utf8");
const lightShader = await readFile(path.join(REVIEW, "observatoryAuthoredEmissiveShader.js"), "utf8");
const starShader = await readFile(path.join(REVIEW, "observatoryAuthoredSkyShader.js"), "utf8");
const streamShader = await readFile(path.join(REVIEW, "observatoryCloudStreamShader.js"), "utf8");
const cloudField = await readFile(path.join(REVIEW, "ObservatoryCloudStreamField.js"), "utf8");
const architectureField = await readFile(path.join(REVIEW, "ObservatoryArchitectureModuleField.js"), "utf8");
const interiorField = await readFile(path.join(REVIEW, "ObservatoryInteriorLifeField.js"), "utf8");
const runtime = await readFile(path.join(REVIEW, "main.js"), "utf8");

assert.equal(manifest.version, "observatory-authored-layers-v3");
assert.equal(manifest.reviewOnly, true);
assert.equal(manifest.runtimePixelReuseFromReference, false);
assert.equal(manifest.reference.referenceOnly, true);
assert.equal(manifest.reference.runtimePixelDonor, false);
assert.equal(manifest.reference.sha256, await sha256(REFERENCE));
assert.equal(manifest.townSquareGuard.sha256, await sha256(TOWN_VIDEO));
assert.equal(manifest.townSquareGuard.modified, false);
assert.equal(Object.keys(manifest.sources).length, 7);
assert.equal(new Set(Object.values(manifest.sources).map(source => source.sha256)).size, 7);
assert.ok(Object.values(manifest.sources).every(source => source.sha256 !== manifest.reference.sha256));
assert.equal(manifest.decomposition.cloudLayerCount, 4);
assert.ok(manifest.decomposition.cloudModuleCount >= 45, "cloud atlas is not sufficiently segmented");
assert.equal(manifest.decomposition.cloudModuleCount, Object.values(manifest.cloudModules).reduce((total, pack) => total + pack.modules.length, 0));
assert.ok(manifest.decomposition.starCount >= 600, "dedicated star layer is unexpectedly sparse");
assert.ok(manifest.decomposition.architectureModuleCount >= 10, "floating architecture is still a plate");
assert.equal(manifest.decomposition.architectureUnlit, true);
assert.equal(manifest.decomposition.architectureStatic, false);
assert.equal(manifest.decomposition.lightsSeparated, true);
assert.ok(manifest.decomposition.lightClusterCount >= 70, "individual building lights were not retained");

for (const [key, output] of Object.entries(manifest.outputs)) {
  const filePath = path.join(PACK, output.path);
  assert.equal(await sha256(filePath), output.sha256, `${key} output hash drifted`);
  const info = await pngInfo(filePath);
  assert.equal(info.height, 941);
  assert.equal(info.width, key === "comparison" ? 3344 : 1672);
}
for (const key of ["stars", "upper", "horizon", "lower", "near", "architecture", "emissive", "lightIds"]) {
  assert.equal((await pngInfo(path.join(PACK, manifest.outputs[key].path))).colorType, 6, `${key} must retain RGBA separation`);
}
for (const modulePack of Object.values(manifest.cloudModules)) {
  assert.equal(await sha256(path.join(PACK, modulePack.texturePath)), modulePack.textureSha256);
  assert.equal(await sha256(path.join(PACK, modulePack.atlasPath)), modulePack.atlasSha256);
  assert.ok(modulePack.modules.length > 0);
  JSON.parse(await readFile(path.join(PACK, modulePack.atlasPath), "utf8"));
  assert.ok(modulePack.modules.every(module => module.segment === "feathered-organic-wisp-v5"));
}
const architecturePack = manifest.architectureModules;
for (const [pathKey, hashKey] of [["texturePath", "textureSha256"], ["atlasPath", "atlasSha256"], ["emissiveTexturePath", "emissiveTextureSha256"], ["emissiveAtlasPath", "emissiveAtlasSha256"]]) {
  assert.equal(await sha256(path.join(PACK, architecturePack[pathKey])), architecturePack[hashKey]);
}
assert.equal(architecturePack.modules.length, manifest.decomposition.architectureModuleCount);
assert.equal(await sha256(path.join(PACK, manifest.interiorLife.texturePath)), manifest.interiorLife.textureSha256);
assert.equal(await sha256(path.join(PACK, manifest.interiorLife.atlasPath)), manifest.interiorLife.atlasSha256);
assert.equal(Object.keys(manifest.interiorLife.animations).length, 3);
for (const donor of Object.values(manifest.interiorLife.donors)) {
  assert.equal(await sha256(path.join(ROOT, donor.path)), donor.sha256);
}

assert.match(config, /loopSeconds:\s*48/);
assert.match(config, /cloudStreamPipelineKey/);
assert.match(config, /cloudLayers:\s*Object\.freeze/);
assert.match(config, /upper-cloud-wisps-v5\.png/);
assert.match(config, /travelX:\s*32\.0/);
assert.match(config, /resetFeather:\s*0\.1[79]0/);
assert.doesNotMatch(config, /cloudLayers:[\s\S]*cycleVariants:\s*3/);
assert.match(config, /interiorLife:\s*Object\.freeze/);
assert.match(config, /action:\s*"mine"/);
assert.match(config, /sparkleClassThreshold/);
assert.match(config, /motionSystems:\s*Object\.freeze/);
assert.match(config, /worldChronology:\s*Object\.freeze/);
assert.match(config, /cycleDays:\s*Object\.freeze\(\[28, 56, 84/);
assert.match(config, /weatherVisibility:/);
assert.match(config, /weatherCloudFlow:/);
assert.match(config, /architecture-unlit-v3\.png/);
assert.match(config, /architecture-emissive-ids-v4\.png/);
assert.match(config, /architecture-light-ids-v3\.png/);
assert.match(config, /architecture-unlit-modules-v4\.png/);
assert.match(config, /architecture-emissive-modules-v4\.png/);
assert.match(cloudField, /setSegmentState/);
assert.match(cloudField, /segmentCount/);
assert.match(streamShader, /float streamPhase = fract/);
assert.match(streamShader, /float resetFade = fadeIn \* fadeOut/);
assert.match(streamShader, /uv - streamOffset/);
assert.doesNotMatch(streamShader, /firstPhase|secondPhase|firstSample|secondSample|secondWeight/);
assert.doesNotMatch(streamShader, /regionalGain|horizontal|vertical|luminance/);
assert.doesNotMatch(lightShader, /uLightIdSampler/);
assert.match(lightShader, /float seed = source\.r/);
assert.match(lightShader, /float hash11/);
assert.match(lightShader, /occupancyGate/);
assert.match(lightShader, /slowRoomGate/);
assert.match(lightShader, /behaviorGate/);
assert.match(lightShader, /uOffIntensity/);
assert.match(lightShader, /uWorldTime/);
assert.match(lightShader, /uWeekPhase/);
assert.match(lightShader, /sin\(uPhase \* TAU/);
assert.doesNotMatch(lightShader, /cyclicNoise/);
assert.match(lightShader, /uBloomGain \* alpha/);
assert.doesNotMatch(starShader, /neighbours|uPointThreshold/);
assert.match(starShader, /float seed = source\.r/);
assert.match(starShader, /float hash11/);
assert.match(starShader, /steadyClass/);
assert.match(starShader, /deepClass/);
assert.match(starShader, /sparkleClass/);
assert.match(starShader, /deepGate/);
assert.match(starShader, /starTint \* alpha/);
assert.match(starShader, /source\.a < 0\.001/);
assert.match(starShader, /uTwinkleDepth/);
assert.match(architectureField, /setPosition/);
assert.match(architectureField, /setLightState/);
assert.match(architectureField, /profile\.groupCycles/);
assert.match(architectureField, /chronology\.day/);
assert.match(architectureField, /chronology\.weather/);
assert.match(architectureField, /lifecycleCount/);
assert.match(interiorField, /entry\.image\.setFrame/);
assert.match(interiorField, /entry\.module\.structure/);
assert.match(interiorField, /entry\.module\.structure\.alpha/);
assert.match(runtime, /architectureStatic:\s*false/);
assert.match(runtime, /ObservatoryArchitectureModuleField/);
assert.match(runtime, /ObservatoryCloudStreamPipeline/);
assert.match(runtime, /ObservatoryInteriorLifeField/);
assert.match(runtime, /cloudSegments/);
assert.match(runtime, /TIME_CONFIG\.dayDurationMs/);
assert.match(runtime, /worldDay/);
assert.match(runtime, /timeOfDay/);
assert.match(runtime, /cloudFlow/);
assert.match(runtime, /motionSystems/);
assert.match(runtime, /load\.atlas/);
assert.match(runtime, /runtimePixelReuseFromReference/);
assert.match(runtime, /Phaser\.BlendModes\.ADD/);
assert.doesNotMatch(runtime, /surface-town-air-v1\.mp4/);
assert.doesNotMatch(runtime, /ObservatoryAuthoredAtmospherePipeline|ObservatoryDepthMotionPipeline|architecture-mask-carrier/);

console.log("OBSERVATORY_AUTHORED_LAYERS_V3_CONTRACT_OK");
