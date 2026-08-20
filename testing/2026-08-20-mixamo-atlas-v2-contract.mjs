import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GROUND } from "./animation-sandbox/mixamo-atlas-v2/data-ground.js";
import { CROUCH } from "./animation-sandbox/mixamo-atlas-v2/data-crouch.js";
import { AIR } from "./animation-sandbox/mixamo-atlas-v2/data-air.js";
import { COMBAT } from "./animation-sandbox/mixamo-atlas-v2/data-combat.js";
import { ABILITIES } from "./animation-sandbox/mixamo-atlas-v2/data-abilities.js";
import { REACTIONS } from "./animation-sandbox/mixamo-atlas-v2/data-reactions.js";
import { IDLES } from "./animation-sandbox/mixamo-atlas-v2/data-idle.js";

const candidates = [...GROUND, ...CROUCH, ...AIR, ...COMBAT, ...ABILITIES, ...REACTIONS, ...IDLES];
const expectedGroups = { ground: 24, crouch: 14, air: 16, combat: 32, abilities: 18, reactions: 14, idle: 12 };
assert.equal(candidates.length, 130, "atlas must be exactly ten times the 13-row focused audit");
assert.equal(new Set(candidates.map(({ id }) => id)).size, 130, "candidate ids must be unique");

for (const [group, count] of Object.entries(expectedGroups)) {
  assert.equal(candidates.filter((candidate) => candidate.group === group).length, count, `${group} count`);
}

const stageCounts = Object.fromEntries(["v4", "source", "gated"].map((stage) => [
  stage, candidates.filter((candidate) => candidate.stage === stage).length,
]));
assert.deepEqual(stageCounts, { v4: 44, source: 82, gated: 4 });
assert(candidates.every((candidate) => candidate.currentKey), "every candidate needs a current runtime comparison");
assert(candidates.every((candidate) => candidate.localGif || candidate.sourceGif), "every candidate needs animated evidence");
assert(candidates.filter(({ stage }) => stage === "gated").every(({ gate }) => gate), "gate failures need an explicit reason");
assert(candidates.filter(({ referenceOnly }) => referenceOnly).every(({ id }) => id.includes("jump")), "reference-only candidates must stay jump-specific");

const pageRoot = new URL("./animation-sandbox/mixamo-atlas-v2/", import.meta.url);
for (const candidate of candidates.filter(({ stage }) => stage === "v4")) {
  const proofPath = fileURLToPath(new URL(candidate.localGif, pageRoot));
  assert(existsSync(proofPath), `${candidate.id} V4 proof is missing: ${proofPath}`);
}

const index = readFileSync(fileURLToPath(new URL("index.html", pageRoot)), "utf8");
const review = readFileSync(fileURLToPath(new URL("review.js", pageRoot)), "utf8");
assert.match(index, /review only · no runtime wiring/i);
assert.match(index, /130 role-mapped candidates/i);
assert.match(review, /productionChanged:\s*false/);
assert.match(review, /runtimeWired:\s*false/);
assert.doesNotMatch(review, /PlayerController|PlayScene|RuntimeAssetCatalog|registerAnimation/);

console.log(`MIXAMO_ATLAS_V2_OK candidates=${candidates.length} v4=${stageCounts.v4} source=${stageCounts.source} gated=${stageCounts.gated} productionChanged=false runtimeWired=false`);
