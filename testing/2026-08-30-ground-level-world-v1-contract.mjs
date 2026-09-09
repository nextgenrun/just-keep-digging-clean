import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW_DIR = path.join(ROOT, "testing/animation-sandbox/2026-08-30-ground-level-world-v1");
const moduleFromRoot = relative => import(pathToFileURL(path.join(ROOT, relative)).href);

const { WORLD_VISUAL_GROUND_LEVEL_RUNTIME_REVIEW: review } = await moduleFromRoot(
  "values/worldVisualGroundLevelRuntimeReview.js",
);
const { WORLD_VISUAL_GROUND_BACKGROUND_MOTION_REVIEW: backgrounds } = await moduleFromRoot(
  "values/worldVisualGroundBackgroundMotionReview.js",
);

const main = await readFile(path.join(REVIEW_DIR, "main.js"), "utf8");
const motion = await readFile(path.join(REVIEW_DIR, "GroundLevelMotionField.js"), "utf8");
const background = await readFile(path.join(REVIEW_DIR, "GroundLevelBackgroundField.js"), "utf8");
const atmosphere = await readFile(path.join(REVIEW_DIR, "GroundLevelAuthoredAtmosphereField.js"), "utf8");
const html = await readFile(path.join(REVIEW_DIR, "index.html"), "utf8");
const readme = await readFile(path.join(REVIEW_DIR, "readme.md"), "utf8");
const observatory = await readFile(path.join(ROOT, "values/observatoryAuthoredLayersReview.js"), "utf8");
const backgroundPack = JSON.parse(await readFile(path.join(REVIEW_DIR, "background-pack/manifest-v1.json"), "utf8"));

assert.equal(review.reviewOnly, true);
assert.equal(review.productionChanged, false);
assert.equal(review.worldWidthTiles, 280);
assert.equal(review.chapters.length, 14);
assert.equal(review.motion.observatoryBenchmarkMultiplier, 1.5);
assert.equal(review.motion.displayedDefaultPercent, 100);
assert.equal(review.townVideoPolicy, "preserve-surface-town-air-v1-byte-for-byte");
assert.equal(review.hardBakedSurfaceChunkPolicy, "excluded");
assert.equal(review.actorPolicy, "none-background-review");
assert.equal(review.overlayPolicy, "legacy-and-archive-overlays-excluded");
assert.equal(review.motion.foregroundPropMotion, false);
assert.deepEqual(Object.keys(review.composition), ["weatherAtlas"]);

review.chapters.forEach((chapter, index) => {
  assert.equal(chapter.leftTile, index * 20);
  assert.equal(chapter.rightTile, (index + 1) * 20);
  assert.equal(chapter.centerTile, index * 20 + 10);
});

assert.equal(backgrounds.genericFallback, false);
assert.equal(backgrounds.repeatedBackdropAllowed, false);
assert.equal(backgrounds.defaultStaticPolicy, "unsegmented-pixels-never-move");
assert.equal(backgrounds.profiles.length + 1, 14);
assert.equal(new Set(backgrounds.profiles.map(profile => profile.source.path)).size, 13);
const observatoryBackground = backgrounds.profiles.find(profile => profile.chapterId === "observatory");
assert.equal(observatoryBackground.renderMode, "segmented-runtime");
assert.deepEqual(observatoryBackground.immutable, ["moon", "mountains", "forest", "terrain-geometry"]);
assert.equal(backgrounds.observatoryAtmosphere.sprites.length, 10);
assert.equal(backgroundPack.runtimePixelReuseFromReference, false);
assert.equal(backgroundPack.sourceProvenance.approvedPanelPixelsCopied, false);
assert.deepEqual(backgroundPack.base.immutable, ["moon", "mountains", "forest", "terrain-geometry"]);
assert.equal(backgroundPack.atmosphere.length, 10);

for (const asset of [backgroundPack.base, backgroundPack.stars, ...backgroundPack.atmosphere]) {
  const bytes = await readFile(path.join(REVIEW_DIR, "background-pack", asset.path));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
}
for (const profile of backgrounds.profiles.filter(item => item.chapterId !== "observatory")) {
  assert.equal(profile.renderMode, "approved-reference-static");
  assert.equal(profile.activeMotion.length, 0);
  const bytes = await readFile(path.join(ROOT, profile.source.path));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), profile.source.sha256);
}
const observatoryBytes = await readFile(path.join(ROOT, observatoryBackground.source.path));
assert.equal(createHash("sha256").update(observatoryBytes).digest("hex"), observatoryBackground.source.sha256);

const townVideo = await readFile(path.join(
  ROOT,
  "sprites/backgrounds/start-zone-scenic-v1/living-background-v1/surface-town-air-v1.mp4",
));
const townHash = createHash("sha256").update(townVideo).digest("hex");
assert.equal(townHash, review.townVideoSha256);

for (const removedFile of ["GroundLevelPropField.js", "GroundLevelStructureField.js"]) {
  await assert.rejects(access(path.join(REVIEW_DIR, removedFile)), error => error?.code === "ENOENT");
}

assert.match(main, /surface\.far\.forEach\(image => image\.setVisible\(false\)\)/);
assert.match(main, /WorldVisualSurfaceStage/);
assert.match(main, /dataset\.runtimeSnapshot/);
assert.match(main, /GroundLevelBackgroundField/);
assert.match(main, /getGroundBackgroundPreloadAssets/);
assert.match(main, /setTownStageEnabled/);
assert.match(main, /legacyPropOverlays:\s*0/);
assert.match(main, /legacyStructureOverlays:\s*0/);
assert.match(main, /floatingLegacyProps:\s*0/);
assert.doesNotMatch(main, /GroundLevelPropField|GroundLevelStructureField|createGroundLevelPropField/);
assert.doesNotMatch(main, /ASSET_KEYS|TITAN_DISCOVERY_CONFIG|WORLD_VISUAL_PROP|WORLD_VISUAL_SURFACE_HERO/);
assert.doesNotMatch(main, /bobo-npc-house|merchant-npc-house|monster-npc-house|mine-entrance-front/);
assert.doesNotMatch(main, /GroundLevelPeopleField|ground-person-|\.people\b/);
assert.doesNotMatch(main, /farBackdrop|composition\.cloudAtlases/);
assert.doesNotMatch(main, /WorldBackgroundMasterSystem|V11_POLISHED_SURFACE_RUNTIME_MANIFEST/);
assert.doesNotMatch(main, /WorldVisualSkyCohesionLayer/);
assert.match(motion, /observatoryBenchmarkMultiplier/);
assert.match(motion, /foregroundPropMotion:\s*false/);
assert.match(motion, /independentPracticalLights:\s*0/);
assert.match(motion, /legacyPropSources:\s*0/);
assert.doesNotMatch(motion, /propEntries|createEmissiveLayers|updateLights|this\.emissives/);
assert.match(background, /sourcePixelsAnimated:\s*false/);
assert.match(background, /placeholderActors:\s*0/);
assert.match(background, /mountainDisplacementPx:\s*0/);
assert.match(background, /genericFallback:\s*false/);
assert.doesNotMatch(background, /setPostPipeline|mountainMask|forestMask/);
assert.match(atmosphere, /ObservatoryAuthoredSkyPipeline/);
assert.match(atmosphere, /resetPolicy:\s*"fully-offscreen-only"/);
assert.match(atmosphere, /single-forward-stream-no-left-right-wobble/);
assert.match(atmosphere, /mountainMotionPixels:\s*0/);
assert.match(html, /100% here = 150% of Observatory V15/);
assert.match(html, /0 NPC placeholders/);
assert.match(html, /0 LEGACY OVERLAYS/);
assert.match(readme, /zero legacy prop overlays and zero legacy structure overlays/);
assert.match(observatory, /resetFeather:\s*0\.1[79]0/);
assert.doesNotMatch(observatory, /cloudLayers:[\s\S]*cycleVariants:\s*3/);

console.log("GROUND_LEVEL_WORLD_V1_CONTRACT_OK", JSON.stringify({
  chapters: review.chapters.length,
  backgroundProfiles: backgrounds.profiles.length + 1,
  observatoryCloudSegments: backgrounds.observatoryAtmosphere.sprites.length,
  mountainMotionPixels: 0,
  legacyPropOverlays: 0,
  legacyStructureOverlays: 0,
  floatingLegacyProps: 0,
  placeholderActors: 0,
  displayedMotionPercent: 100,
  effectiveObservatoryMultiplier: 1.5,
  townVideoSha256: townHash,
}));
