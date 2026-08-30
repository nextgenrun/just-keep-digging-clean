import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { WORLD_VISUAL_ABOVE_GROUND_LIVING_RUNTIME_REVIEW as REVIEW } from
  "../values/worldVisualAboveGroundLivingRuntimeReview.js";
import { WORLD_VISUAL_ABOVE_GROUND_PIECEMEAL_MERGE_PLAN as PLAN } from
  "../values/worldVisualAboveGroundPiecemealMergePlan.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const files = {
  html: join(root, "testing/2026-08-30-above-ground-living-runtime-simulation.html"),
  main: join(root, "testing/2026-08-30-above-ground-living-runtime-simulation.js"),
  systems: join(root, "testing/2026-08-30-above-ground-living-runtime-systems.js"),
  hud: join(root, "testing/2026-08-30-above-ground-living-runtime-hud.js"),
};
const source = Object.fromEntries(await Promise.all(
  Object.entries(files).map(async ([id, path]) => [id, await readFile(path, "utf8")]),
));

assert.equal(REVIEW.reviewOnly, true);
assert.equal(REVIEW.productionChanged, false);
assert.equal(REVIEW.assetPolicy, "checked-in-runtime-assets-only");
assert.equal(REVIEW.compositionPolicy, "one-background-owner-per-camera-band");
assert.equal(REVIEW.celestialPolicy, "baked-sky-owns-celestial-bodies");
assert.match(source.html, /libs\/phaser\.js/);
assert.match(source.html, /Placement map/);
assert.doesNotMatch(source.html, /data:image|placeholder/i);

for (const system of [
  "WorldVisualSkyCohesionLayer",
  "WorldVisualSurfaceStage",
  "WeatherSystem",
  "DayNightCycle",
  "AtmosphereSystem",
  "WorldVisualSurfaceAtmosphereLayer",
  "V11SkyIslandVisualSystem",
]) {
  assert.match(source.systems, new RegExp(system));
}
assert.match(source.systems, /surface\.far\.forEach\(image => image\.setVisible\(false\)\)/);
assert.match(source.systems, /sunSprite\.setVisible\(false\)/);
assert.match(source.systems, /moonSprite\.setVisible\(false\)/);
assert.match(source.systems, /_applyExclusiveHeavenblockSkyOwnership/);
assert.match(source.systems, /WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3/);
assert.match(source.systems, /filter\(item => item\.floating\)/);
assert.match(source.systems, /_ensureFullReviewSkyIslandSupport/);
assert.match(source.main, /townVideoChanged: false/);
assert.match(source.hud, /__ABOVE_GROUND_LIVING_RUNTIME__/);

for (const [id, text] of Object.entries(source)) {
  if (id === "html") continue;
  const lines = text.trimEnd().split(/\r?\n/).length;
  assert.ok(lines <= 360, `${id} should stay focused; received ${lines} lines`);
}

const townVideo = await readFile(join(root, PLAN.townVideo.path));
const hash = createHash("sha256").update(townVideo).digest("hex");
assert.equal(hash, PLAN.townVideo.sha256);
assert.equal(REVIEW.townVideoPolicy, "preserve-production-town-air-byte-for-byte");

console.log("ABOVE_GROUND_LIVING_RUNTIME_CONTRACT_OK", JSON.stringify({
  productionSystems: 7,
  weatherPresets: REVIEW.weatherPresets.length,
  townVideoSha256: hash,
  productionChanged: REVIEW.productionChanged,
}));
