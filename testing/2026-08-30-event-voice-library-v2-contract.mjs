import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { EVENT_VOICE_CONFIG } from "../values/audioConfig.js";
import { EVENT_VOICE_LIBRARY } from "../values/eventVoiceLibrary.js";

const libraryRoot = new URL("../sound/voice-lines/event-driven-grok-v2/", import.meta.url);
const source = JSON.parse(await readFile(
  new URL("2026-08-30-event-voice-library-v2-source.json", libraryRoot),
  "utf8",
));
const manifest = JSON.parse(await readFile(
  new URL("2026-08-30-event-voice-library-v2-manifest.json", libraryRoot),
  "utf8",
));
const sourceText = JSON.stringify(source);
const manifestText = JSON.stringify(manifest);

assert.equal(source.reviewOnly, true);
assert.equal(source.model, "x-ai/grok-voice-tts-1.0");
assert.deepEqual(source.voices, ["eve", "ara", "rex", "sal", "leo"]);
assert.equal(source.families.length, 11, "casting plus ten gameplay families must be present");
assert.equal(source.clips.length, 45, "the extensive demo library must retain all 45 candidates");
assert.equal(new Set(source.clips.map(clip => clip.id)).size, 45);
assert.equal(new Set(source.clips.map(clip => clip.file)).size, 45);

const totalCharacters = source.clips.reduce((sum, clip) => sum + clip.text.length, 0);
const estimatedCost = totalCharacters * source.priceUsdPerMillionCharacters / 1_000_000;
assert.equal(totalCharacters, 4538);
assert.equal(estimatedCost, 0.06807);
assert.ok(estimatedCost < source.localBatchCapUsd);
assert.equal(source.userMaximumSpendEur, 5);

assert.equal(manifest.reviewOnly, true);
assert.equal(manifest.reviewStatus, "candidate");
assert.equal(manifest.completed, true);
assert.equal(manifest.plannedRequests, 45);
assert.equal(manifest.completedRequests, 45);
assert.equal(manifest.charactersGenerated, totalCharacters);
assert.equal(manifest.estimatedGeneratedCostUsd, estimatedCost);
assert.equal(manifest.apiKeyStored, false);
assert.deepEqual(manifest.thisRun, { attempted: 45, generated: 45, reused: 0, failed: 0 });
assert.doesNotMatch(sourceText, /sk-or-v1-[A-Za-z0-9_-]{20,}/);
assert.doesNotMatch(manifestText, /sk-or-v1-[A-Za-z0-9_-]{20,}/);

const manifestById = new Map(manifest.clips.map(clip => [clip.id, clip]));
let totalBytes = 0;
for (const clip of source.clips) {
  const generated = manifestById.get(clip.id);
  assert.ok(generated, `missing generated manifest entry for ${clip.id}`);
  assert.equal(generated.text, clip.text);
  assert.equal(generated.voice, clip.voice);
  assert.equal(generated.family, clip.family);
  assert.equal(generated.contentType, "audio/mpeg");
  assert.match(generated.generationId, /^gen-tts-/);
  const audio = await readFile(new URL(`audio/${clip.file}`, libraryRoot));
  totalBytes += audio.length;
  assert.equal(audio.length, generated.bytes);
  assert.equal(
    createHash("sha256").update(audio).digest("hex").toUpperCase(),
    generated.sha256,
    `hash mismatch for ${clip.id}`,
  );
}
assert.ok(totalBytes > 4_000_000, "the library should contain substantial playable audio, not stubs");

const gameplayClips = source.clips.filter(clip => clip.family !== "voiceCasting");
const runtimeCandidates = Object.values(EVENT_VOICE_LIBRARY).flat();
assert.equal(gameplayClips.length, 40);
assert.equal(runtimeCandidates.length, 40);
const runtimeById = new Map(runtimeCandidates.map(candidate => [candidate.id, candidate]));
for (const clip of gameplayClips) {
  const candidate = runtimeById.get(clip.id);
  assert.ok(candidate, `runtime catalog missing ${clip.id}`);
  assert.equal(candidate.family, clip.family);
  assert.equal(candidate.voice, clip.voice);
  assert.equal(candidate.file, clip.file);
  assert.equal(candidate.path, `sound/voice-lines/event-driven-grok-v2/audio/${clip.file}`);
}

const sourceFamilies = new Map(source.families.map(family => [family.id, family]));
assert.deepEqual(Object.keys(EVENT_VOICE_CONFIG.events), Object.keys(EVENT_VOICE_LIBRARY));
for (const [familyId, definition] of Object.entries(EVENT_VOICE_CONFIG.events)) {
  const authored = sourceFamilies.get(familyId);
  assert.ok(authored, `source family missing ${familyId}`);
  assert.equal(definition.libraryId, familyId);
  assert.equal(definition.cooldownMs, authored.cooldownMs);
  assert.equal(definition.queueTtlMs, authored.queueTtlMs);
  assert.equal(definition.ambientQuietAfterMs, authored.quietTailMs);
  assert.equal(definition.priority, authored.priority);
}

const rejectedV1 = JSON.parse(await readFile(new URL(
  "../event-driven-grok-v1/2026-08-30-event-voice-sample-manifest.json",
  libraryRoot,
), "utf8"));
assert.equal(rejectedV1.reviewStatus, "rejected");
const assetKeysSource = await readFile(new URL("../values/assetKeys.js", import.meta.url), "utf8");
assert.doesNotMatch(assetKeysSource, /event-driven-grok-v1\/earthquake-warning-rex\.mp3/);

const reviewHtml = await readFile(new URL("review/index.html", libraryRoot), "utf8");
const reviewJs = await readFile(new URL("review/review.js", libraryRoot), "utf8");
assert.equal((reviewHtml.match(/<audio\b/g) || []).length, 1, "review must own one audio channel");
assert.match(reviewHtml, /Play filtered sequence/);
assert.match(reviewHtml, /Simulate 5 rapid triggers/);
assert.match(reviewJs, /PLAYLIST_GAP_MS = 750/);
assert.match(reviewJs, /RAPID_TRIGGER_COUNT = 5/);
assert.doesNotMatch(`${reviewHtml}\n${reviewJs}`, /localStorage|sessionStorage|indexedDB/);

const generator = await readFile(new URL(
  "../ai-tools/2026-08-30-generate-event-voice-library-v2.py",
  import.meta.url,
), "utf8");
const launcher = await readFile(new URL(
  "../ai-tools/2026-08-30-launch-event-voice-library-v2.ps1",
  import.meta.url,
), "utf8");
assert.match(generator, /MAX_REQUESTS = 50/);
assert.match(generator, /apiKeyStored/);
assert.match(launcher, /-AsSecureString/);
assert.match(launcher, /Remove-Item Env:OPENROUTER_API_KEY/);
assert.match(launcher, /ZeroFreeBSTR/);

console.log("EVENT_VOICE_LIBRARY_V2_CONTRACT_OK");
