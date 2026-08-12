import assert from "node:assert/strict";

import { RuntimeFeatureResidency } from
  "../world/rendering/RuntimeFeatureResidency.js";

const residentKeys = new Set(["old-optional-pack", "recent-optional-pack"]);
const managedKeys = new Set(residentKeys);
const removedTextures = [];
const releasedSources = [];
const textures = {
  exists: key => residentKeys.has(key),
  remove(key) {
    removedTextures.push(key);
    residentKeys.delete(key);
  },
};
const textureMemory = {
  isManaged: key => managedKeys.has(key),
  sample() {
    const estimatedBytes = residentKeys.size > 1 ? 800 : 600;
    return {
      overBudget: estimatedBytes > 704,
      estimatedBytes,
      lowWatermarkBytes: 640,
    };
  },
};
const coordinator = {
  textureMemory,
  releaseDecodedSource: key => releasedSources.push(key),
};
const makeRecord = (key, lastUsedAtMs) => ({
  definition: { id: key, releaseWhenUnused: true },
  status: "ready",
  consumers: new Set(),
  loadedKeys: new Set([key]),
  lastUsedAtMs,
});
const oldest = makeRecord("old-optional-pack", 10);
const newest = makeRecord("recent-optional-pack", 20);
const records = new Map([
  [oldest.definition.id, oldest],
  [newest.definition.id, newest],
]);
let evictions = 0;
const residency = new RuntimeFeatureResidency(
  { textures },
  coordinator,
  records,
  () => { evictions += 1; },
);

assert.equal(residency.trimToBudget(), true);
assert.deepEqual(removedTextures, ["old-optional-pack"]);
assert.deepEqual(releasedSources, ["old-optional-pack"]);
assert.equal(oldest.status, "idle");
assert.equal(newest.status, "ready");
assert.equal(evictions, 1);
assert.equal(textureMemory.sample().estimatedBytes <= 640, true);

newest.consumers.add("open-feature");
residentKeys.add("old-optional-pack");
oldest.status = "ready";
oldest.loadedKeys.add("old-optional-pack");
oldest.consumers.add("active-world-owner");
assert.equal(residency.trimToBudget(), false, "active consumers must never be evicted");
assert.equal(residentKeys.size, 2);

const adoptedBoot = makeRecord("adopted-boot-texture", 5);
residentKeys.add("adopted-boot-texture");
records.set(adoptedBoot.definition.id, adoptedBoot);
assert.equal(residency.evict(adoptedBoot), false, "adopted boot textures are tracked but not evicted");
assert.equal(adoptedBoot.status, "ready");
assert.equal(residentKeys.has("adopted-boot-texture"), true);

console.log("runtime feature residency contract: PASS");
