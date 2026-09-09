import assert from "node:assert/strict";
import { FREESOUND_RUNTIME_ASSETS } from "../values/freesoundAudio.js";
import { readFile } from "node:fs/promises";

import { buildActiveGametimeAudioCatalog } from "./audio-runtime-reaudit-2026-09-04/catalog-builder.mjs";

const catalogPath = new URL("./audio-runtime-reaudit-2026-09-04/catalog.json", import.meta.url);
const pagePath = new URL("./audio-runtime-reaudit-2026-09-04/index.html", import.meta.url);
const reviewPath = new URL("./audio-runtime-reaudit-2026-09-04/review.js", import.meta.url);
const [fresh, stored, page, review] = await Promise.all([
  buildActiveGametimeAudioCatalog(),
  readFile(catalogPath, "utf8").then(JSON.parse),
  readFile(pagePath, "utf8"),
  readFile(reviewPath, "utf8"),
]);

assert.equal(stored.catalogHash, fresh.catalogHash, "generated catalog drifted from current audio routing");
assert.equal(fresh.schemaVersion, 2, "volume-aware catalog schema is required");
assert.equal(stored.counts.total, fresh.counts.total, "stored catalog count drifted");
assert.equal(fresh.counts.missing, 0, "active catalog contains missing files");
assert.equal(new Set(fresh.items.map(item => item.path)).size, fresh.items.length, "physical paths must be unique");
const activeFreesoundPaths = Object.values(FREESOUND_RUNTIME_ASSETS).map(asset => asset.path).sort();
assert.deepEqual(fresh.items.filter(item => item.routes.some(route => route.source === "freesound-runtime"))
  .map(item => item.path).sort(), activeFreesoundPaths, "catalog must match active routing, not the approval archive");
assert.ok(fresh.items.length > activeFreesoundPaths.length + 350, "non-core gameplay audio disappeared");
assert.equal(fresh.items.filter(item => item.routes.some(route => route.source === "player-event-voice")).length, 96);
assert.equal(fresh.items.filter(item => item.routes.some(route => route.source === "recorded-weather")).length, 6);
assert.ok(fresh.items.filter(item => item.routes.some(route => route.source === "merchant-voice")).length > 100);
assert.ok(fresh.items.filter(item => item.kind === "music").length > 100);
assert.ok(fresh.items.every(item => !item.path.includes("SoundLibrary_Review")), "review inbox leaked into active catalog");
assert.ok(fresh.items.every(item => !item.path.includes("random-voice-lines")), "disabled legacy player lines leaked into catalog");
assert.ok(fresh.items.filter(item => item.kind === "music")
  .every(item => item.metadata.contexts.length || item.metadata.cues.length), "menu-only music leaked into catalog");
assert.ok(fresh.items.every(item => Number.isFinite(item.suggestedGain)
  && item.suggestedGain >= 0 && item.suggestedGain <= item.runtimeGain), "invalid per-clip volume suggestion");
assert.ok(fresh.items.every(item => item.routes.every(route => Number.isFinite(route.suggestedGain)
  && route.suggestedGain >= 0 && route.suggestedGain <= route.gain)), "invalid route volume suggestion");
assert.ok(fresh.items.filter(item => item.suggestedGain < item.runtimeGain).length > fresh.items.length * 0.92,
  "conservative first-pass trim was not applied broadly");
assert.ok(fresh.items.filter(item => item.kind === "music").every(item => item.suggestedGain <= 0.30),
  "music suggestion exceeds the gameplay headroom target");
assert.ok(fresh.items.filter(item => item.routes.some(route => route.source === "player-event-voice"))
  .every(item => item.suggestedGain <= 0.42), "player voice suggestion exceeds its starting cap");
assert.match(page, />KEEP · K</);
assert.match(page, />REJECT · R</);
assert.match(page, /id="tuned-gain"/);
assert.match(page, /A\/B current ↔ suggested/);
assert.match(review, /runtimeWired:\s*false/);
assert.match(review, /volumeTuning:/);
assert.match(review, /suggestedDbChange/);
assert.match(review, /VOLUME_STORE/);
assert.match(review, /localStorage\.setItem/);
assert.match(review, /visibilitychange/);

console.log(`ACTIVE_GAMETIME_AUDIO_REAUDIT_OK ${fresh.items.length} unique clips ${fresh.catalogHash}`);
