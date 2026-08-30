import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { WORLD_VISUAL_ABOVE_GROUND_FIDELITY_GATE_REVIEW as FIDELITY } from
  "../values/worldVisualAboveGroundFidelityGateReview.js";
import { WORLD_VISUAL_SKY_COHESION } from "../values/worldVisualSkyCohesion.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const sha256 = async path => createHash("sha256").update(await readFile(path)).digest("hex");
const plate = WORLD_VISUAL_SKY_COHESION.assets[FIDELITY.plate.assetId];

assert.equal(FIDELITY.reviewOnly, true);
assert.equal(FIDELITY.productionChanged, false);
assert.equal(FIDELITY.acceptance.backgroundOwners, 1);
assert.equal(FIDELITY.acceptance.repeatedSkyCards, 0);
assert.equal(FIDELITY.acceptance.generatedCelestialSprites, 0);
assert.equal(FIDELITY.acceptance.decorativePropCount, 0);
assert.equal(FIDELITY.acceptance.heroLandmarks, 1);
assert.equal(await sha256(`${root}${plate.path}`), FIDELITY.plate.sha256);
assert.equal(await sha256(`${root}${FIDELITY.townVideo.path}`), FIDELITY.townVideo.sha256);

const systemPath = `${root}testing/2026-08-30-above-ground-fidelity-gate-systems.js`;
const systemSource = await readFile(systemPath, "utf8");
assert.match(systemSource, /WorldVisualSurfaceStage/);
assert.match(systemSource, /WeatherSystem/);
assert.match(systemSource, /AtmosphereSystem/);
assert.match(systemSource, /WorldVisualSurfaceAtmosphereLayer/);
assert.match(systemSource, /WorldVisualSurfaceHeroRuntime/);
assert.doesNotMatch(systemSource, /WorldVisualSkyCohesionLayer/);
assert.doesNotMatch(systemSource, /WorldVisualSurfacePropLayer/);

const html = await readFile(
  `${root}testing/2026-08-30-above-ground-fidelity-gate.html`,
  "utf8",
);
assert.match(html, /Unchanged source/);
assert.match(html, /Runtime composite/);
assert.match(html, /above-ground-fidelity-gate\.js/);

console.log("ABOVE_GROUND_FIDELITY_GATE_OK");
