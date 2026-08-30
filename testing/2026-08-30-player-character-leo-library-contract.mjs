import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

import {
  PLAYER_VOICE_CHARACTER,
  PLAYER_VOICE_CONFIG,
  PLAYER_VOICE_FAMILY_IDS,
  PLAYER_VOICE_LIBRARY,
  PLAYER_VOICE_SOURCE_SHA256,
} from "../values/playerVoiceCharacterLeoV1.generated.js";

const root = new URL("../", import.meta.url);
const sourceUrl = new URL("values/playerVoiceCharacterLeoV1.json", root);
const sourceBytes = await readFile(sourceUrl);
const source = JSON.parse(sourceBytes.toString("utf8"));
const sha256 = payload => createHash("sha256").update(payload).digest("hex").toUpperCase();
const sortJson = value => {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortJson(value[key])]));
};
const canonicalSourceBytes = Buffer.from(
  JSON.stringify(sortJson(source)).replace(/[\u007f-\uffff]/g, character => (
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  )),
  "utf8",
);

assert.equal(source.libraryId, "player-character-leo-v1");
assert.equal(source.voice, "leo");
assert.equal(source.clips.length, 96);
assert.equal(source.families.length, 16);
assert.equal(PLAYER_VOICE_FAMILY_IDS.length, 16);
assert.equal(PLAYER_VOICE_SOURCE_SHA256, sha256(sourceBytes));
assert.equal(PLAYER_VOICE_CHARACTER.id, source.character.id);
assert.equal(PLAYER_VOICE_CONFIG.legacyPlayerRandomEnabled, false);
assert.equal(PLAYER_VOICE_CONFIG.merchantOpenChance, 0.35);
assert.equal(PLAYER_VOICE_CONFIG.stressMode, "stress10x");
assert.equal(PLAYER_VOICE_CONFIG.modes.stress10x.chanceMultiplier, 10);
assert.equal(PLAYER_VOICE_CONFIG.modes.stress10x.cooldownDivisor, 10);

const transcriptSet = new Set();
for (const family of source.families) {
  const clips = source.clips.filter(clip => clip.family === family.id);
  assert.equal(clips.length, 6, `${family.id} must keep six variants`);
  assert.equal(PLAYER_VOICE_LIBRARY[family.id].length, 6);
  for (const clip of clips) {
    assert.ok(clip.text.length >= 45);
    assert.ok(Array.isArray(clip.tags) && clip.tags.length > 0);
    assert.ok(clip.delivery);
    assert.doesNotMatch(clip.text, /\b(?:cooldown|keybind|objective|percent)\b/i);
    assert.equal(transcriptSet.has(clip.text), false, `duplicate transcript: ${clip.id}`);
    transcriptSet.add(clip.text);
  }
  for (const runtimeClip of PLAYER_VOICE_LIBRARY[family.id]) {
    assert.equal(runtimeClip.voice, "leo");
    assert.equal(runtimeClip.speaker, "player");
    assert.match(runtimeClip.path, /^sound\/voice-lines\/player-character-leo-v1\/audio\//);
  }
}

const titan = source.clips.find(clip => clip.id === "titan-discovery-01");
assert.equal(
  titan.text,
  "That is no statue. The stone is breathing around it, as though the entire chamber is trying not to wake it.",
);
assert.equal(
  titan.reuseFrom,
  "sound/voice-lines/event-driven-grok-v2/audio/titan-discovery-leo-v01.mp3",
);

const providerCharacters = source.clips
  .filter(clip => !clip.reuseFrom)
  .reduce((sum, clip) => sum + clip.text.length, 0);
const plannedCost = providerCharacters * source.priceUsdPerMillionCharacters / 1_000_000;
assert.equal(providerCharacters, 9239);
assert.equal(plannedCost, 0.138585);
assert.ok(plannedCost < source.localBatchCapUsd);
assert.ok(source.localBatchCapUsd < source.userMaximumSpendEur);

const manifestUrl = new URL(
  "sound/voice-lines/player-character-leo-v1/2026-08-30-player-character-leo-v1-manifest.json",
  root,
);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
assert.equal(manifest.completed, true);
assert.equal(manifest.completedRequests, 96);
assert.equal(manifest.plannedRequests, 96);
assert.equal(manifest.voice, "leo");
assert.equal(manifest.sourceCatalogSha256, sha256(canonicalSourceBytes));
assert.equal(manifest.apiKeyStored, false);
assert.ok(manifest.estimatedProviderCostUsd <= plannedCost);
assert.equal(manifest.clips.filter(clip => clip.generationSource === "approved-local-reuse").length, 1);

for (const clip of manifest.clips) {
  const audioUrl = new URL(`sound/voice-lines/player-character-leo-v1/audio/${clip.file}`, root);
  const audio = await readFile(audioUrl);
  assert.ok((await stat(audioUrl)).size > 1024, `${clip.id} audio is too small`);
  assert.equal(sha256(audio), clip.sha256, `${clip.id} hash mismatch`);
}
const approvedSource = await readFile(new URL(titan.reuseFrom, root));
const approvedTarget = await readFile(
  new URL(`sound/voice-lines/player-character-leo-v1/audio/${titan.file}`, root),
);
assert.equal(sha256(approvedTarget), sha256(approvedSource));

const callsiteMap = {
  firstDescent: "world/playScene/PlayerVoiceRetentionBridge.js",
  digMomentum: "world/playScene/PlaySceneSetup.js",
  rareMaterialDiscovery: "world/playScene/PlayerVoiceRetentionBridge.js",
  starRelease: "world/playScene/PlaySceneSetup.js",
  titanDiscovery: "systems/visual/TitanDiscoverySystem.js",
  biomeFirstEntry: "systems/environment/BiomeSystem.js",
  depthMilestone: "world/playScene/PlaySceneUpdate.js",
  depthRecord: "world/playScene/PlayerVoiceRetentionBridge.js",
  earthquakeWarning: "systems/environment/EarthquakeSystem.js",
  earthquakeAftermath: "world/playScene/PlayerVoiceRetentionBridge.js",
  hardcoreDanger: "world/playScene/HardcoreModeBridge.js",
  hardcoreRecovery: "world/playScene/HardcoreModeBridge.js",
  inventoryCritical: "world/playScene/PlayerVoiceInventoryBridge.js",
  deepReturn: "world/playScene/PlayerVoiceRetentionBridge.js",
  meaningfulPurchase: "ui/overlays/ShopOverlay.js",
  campfireRest: "systems/environment/CampfireSystem.js",
};
for (const [eventId, relativePath] of Object.entries(callsiteMap)) {
  const code = await readFile(new URL(relativePath, root), "utf8");
  assert.match(code, new RegExp(`(?:eventIds|ids)\\.${eventId}`), `${eventId} callsite missing`);
  assert.match(code, /playPlayerVoiceEvent/, `${eventId} does not route through the director`);
}

console.log("PLAYER_CHARACTER_LEO_LIBRARY_CONTRACT_OK");
