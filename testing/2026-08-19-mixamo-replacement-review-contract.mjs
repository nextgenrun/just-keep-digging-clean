import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { MIXAMO_REPLACEMENT_REVIEW as review } from "../values/mixamoReplacementReview.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..");
const pageDir = path.join(testDir, "animation-sandbox", "mixamo-replacement-review-v1");

assert.equal(review.reviewOnly, true, "Mixamo comparison must remain review-only");
assert.equal(review.productionChanged, false, "Review config must not claim a production change");
assert.ok(review.candidates.length >= 20, "Expected a broad role-grounded draft library");
assert.deepEqual(new Set(review.verdicts), new Set(["accept", "maybe", "reject"]));

const requiredRoles = [
  "flight", "landing", "walkStart", "walkStop", "run", "idle", "crouch",
  "digSide", "digUp", "digDown", "wallPush", "thunder", "teleport", "hit", "death",
];
for (const role of requiredRoles) {
  assert.ok(review.current[role], `Missing current runtime comparison role: ${role}`);
}

const ids = new Set();
const motionIds = new Set();
for (const item of review.candidates) {
  assert.ok(!ids.has(item.id), `Duplicate candidate id: ${item.id}`);
  ids.add(item.id);
  assert.match(item.motionId, /^\d+$/, `Invalid Mixamo motion id: ${item.id}`);
  motionIds.add(item.motionId);
  assert.ok(["replacement", "addition"].includes(item.mode), `Invalid review mode: ${item.id}`);
  assert.ok(review.current[item.current], `Unknown current comparison asset: ${item.id}`);
  assert.ok(review.categories.some(({ id }) => id === item.category), `Unknown category: ${item.id}`);
  assert.match(item.thumbnail, new RegExp(`/motions/${item.motionId}/animated\\.gif$`));
}
assert.ok(motionIds.size >= 18, "Draft should contain distinct, useful source motions");

const descentCandidates = review.candidates.filter(({ name }) => /jumping down/i.test(name));
assert.ok(descentCandidates.length >= 2, "Expected descent/landing candidates");
for (const item of descentCandidates) {
  assert.ok(
    /landing|falling|descent|without adding a jump/i.test(`${item.role} ${item.rationale}`),
    `Jumping Down must be framed as descent/landing, not a new jump mechanic: ${item.id}`,
  );
}

for (const current of Object.values(review.current)) {
  await access(path.resolve(pageDir, current.file));
}

const [html, script] = await Promise.all([
  readFile(path.join(pageDir, "index.html"), "utf8"),
  readFile(path.join(pageDir, "review.js"), "utf8"),
]);
assert.match(html, /review\.js/);
assert.match(script, /mixamoReplacementReview\.js/);
assert.match(script, /localStorage/);
assert.match(html, />Accept</);
assert.match(html, />Maybe</);
assert.match(html, />Reject</);

console.log(`MIXAMO_REPLACEMENT_REVIEW_OK candidates=${review.candidates.length} motions=${motionIds.size}`);
