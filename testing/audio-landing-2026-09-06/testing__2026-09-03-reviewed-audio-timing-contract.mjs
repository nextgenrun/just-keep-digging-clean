import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { REVIEWED_AUDIO_ASSETS as ASSETS } from "../values/reviewedAudioAssets.js";
import { REVIEWED_AUDIO_MIX as MIX } from "../values/reviewedAudioMix.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";
import { createRuntime } from "./audio-review-2026-09-03/runtime-fixture.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const decisions = JSON.parse(read("testing/audio-review-2026-09-03/decisions.json"));
const manifest = JSON.parse(read("sound/soundEffects/approved-review-2026-09-03/manifest.json"));
const checks = [];
function check(name, callback) { callback(); checks.push(name); }

check("Every promoted source has explicit approval and an unchanged production hash", () => {
  assert.equal(Object.keys(ASSETS).length, 51);
  const covered = new Set();
  for (const asset of Object.values(ASSETS)) {
    assert.ok(asset.approvedBy.length);
    asset.approvedBy.forEach(id => { assert.equal(decisions.decisions[id], "approved", id); covered.add(id); });
    assert.doesNotMatch(asset.path, /SoundLibrary_Review/);
    const entry = manifest.assets.find(item => item.id === asset.id);
    const hash = createHash("sha256").update(readFileSync(new URL(asset.path, root))).digest("hex");
    assert.equal(hash, entry.sha256, asset.id);
  }
  assert.equal(covered.size, 47);
});

const f = createRuntime();
const prototype = {};
setupGameplayMethods(prototype);
const contact = (result, tileType) => prototype.playMineFeedbackAudio.call({ soundSystem: f.system }, result, tileType);
check("No sound for cooldown or absent target; contact and material break share authoritative dispatch", () => {
  contact({ reason: "cooldown" }, 1); contact({ reason: "no-target" }, 1);
  assert.equal(f.played.length, 0);
  contact({ success: true, destroyed: true }, 1);
  assert.equal(f.played.length, 1);
  assert.equal(f.played.at(-1).key, ASSETS.libDirtBreak.key);
  assert.ok(f.played.every(entry => entry.at === f.scene.time.now));
  f.tick(300); contact({ success: true, destroyed: true }, 2);
  assert.equal(f.played.at(-1).key, ASSETS.libStoneBreak.key);
  assert.equal(f.played.length, 2); // One break each; no normal contact/tool layer on final hits.
});
check("Star destruction emits one cue, never generic material break", () => {
  const before = f.played.length;
  contact({ success: true, destroyed: true }, 16);
  assert.equal(f.played.length - before, 1);
  assert.equal(f.played.at(-1).key, ASSETS.starDestruction.key);
});
check("Repeated UI events are throttled and active tails are bounded", () => {
  f.tick(1000); const start = f.played.length;
  for (let index = 0; index < 100; index++) f.system.playUiSelect();
  assert.equal(f.played.length - start, 1);
  for (let index = 0; index < 100; index++) { f.tick(101); f.system.playUiSelect(); }
  assert.ok(f.system.activeSfxMixer.active.size <= MIX.maxOneShots);
  assert.equal(f.system.reviewedSfx.groups.get("ui").length, 1);
});
check("Late loads warm the next event; they never replay a stale transient", () => {
  const late = createRuntime({ missing: ["libDirtBreak"] });
  late.system.reviewedSfx.play("libDirtBreak");
  late.tick(500); late.ready("libDirtBreak");
  assert.equal(late.played.length, 0);
  late.system.reviewedSfx.play("libDirtBreak");
  assert.equal(late.played.length, 1);
  late.system.destroy();
});
check("Rejected solo stems cannot be played outside their approved composite", () => {
  for (const id of ["caveEerie", "evilSpell", "panicTimber"]) assert.equal(f.system.reviewedSfx.play(id), null);
  assert.equal(f.system.reviewedSfx.play("libChainWarning"), null);
  assert.equal(f.system.reviewedSfx.play("libTunnelWind"), null);
  assert.equal(f.system.reviewedSfx.play("panicTimber", { mix: "deepCave" }), null);
  f.system.reviewedAmbience.bus.update([{ asset: ASSETS.caveEerie, gain: 0.08 }], 100);
  assert.equal(f.system.reviewedAmbience.bus.tracks.size, 0);
});
check("Variant bags exhaust alternatives and an active cave clock keeps cooldowns alive", () => {
  const sample = createRuntime();
  const choices = MIX.cave.vocalDetails.map(() => sample.system.reviewedSfx.choose("test-detail", MIX.cave.vocalDetails));
  assert.equal(new Set(choices).size, MIX.cave.vocalDetails.length);
  let caveTime = 1000; sample.system.reviewedClock = () => caveTime;
  sample.system.playUiSelect(); caveTime += 101; sample.system.playUiSelect();
  assert.equal(sample.played.length, 2); assert.equal(sample.scene.time.now, 0);
  sample.system.destroy();
});
check("Contact-source leading silence stays within one 30 ms onset budget", () => {
  for (const id of ["digOne", "digTwo", "libDirtBreak", "libToolContact", "libStoneBreak", "libUiClick", "starDestruction"]) {
    assert.ok(manifest.assets.find(row => row.id === id).after.onsetMs <= 30, id);
  }
});
check("Composite loop loading is atomic, and surface depth clears cave layers", () => {
  const cold = createRuntime({ missing: ["evilSpell"] });
  const cave = cold.system.reviewedAmbience;
  cave.preset = 3;
  cave.update({ depth: 520, time: 0, delta: 16 });
  assert.equal(cave.bus.tracks.size, 0);
  cold.ready("evilSpell");
  cave.update({ depth: 520, time: 16, delta: 16 });
  assert.equal(cave.bus.tracks.size, 4);
  for (let i = 0; i < 40; i++) cave.update({ depth: 0, time: 32 + i * 100, delta: 100 });
  assert.equal(cave.bus.tracks.size, 0);
  cold.system.destroy();
});
check("Landing requires a real airborne downward interval; spawn/teleport are silent", () => {
  const sample = createRuntime(); let grounded = true;
  const controller = { physicsBody: { x: 0, y: 0, vy: 0 }, isGrounded: () => grounded };
  const observe = () => sample.system.reviewedAmbience.observeMotion(controller, 80);
  observe(); observe(); assert.equal(sample.played.length, 0);
  grounded = false; controller.physicsBody.vy = 700;
  for (let i = 0; i < 3; i++) { controller.physicsBody.y += 25; observe(); }
  grounded = true; controller.physicsBody.vy = 0; observe();
  assert.equal(sample.played.length, 1);
  sample.tick(1000); grounded = false; controller.physicsBody.vy = 700; observe(); observe();
  controller.physicsBody.y += 1000; grounded = true; observe();
  assert.equal(sample.played.length, 1);
  sample.system.destroy();
});
check("Mute, pause and destroy cancel all managed SFX and loops", () => {
  f.system.reviewedAmbience.update({ depth: 500, time: f.scene.time.now, delta: 100 });
  f.system.toggleSfx(false);
  assert.equal(f.system.activeSfxMixer.active.size, 0);
  assert.equal(f.system.reviewedAmbience.bus.tracks.size, 0);
  assert.equal(f.system.playUiClick(), null);
  f.system.toggleSfx(true); f.tick(300); f.system.playUiClick();
  f.scene.events.emit("pause"); assert.equal(f.system.activeSfxMixer.active.size, 0);
  f.system.destroy(); assert.equal(f.scene.events.listenerCount("postupdate"), 0);
});
check("Success-only purchase/save/arrival hooks and calm recovery route are present", () => {
  assert.match(read("ui/overlays/ShopOverlay.js"), /playPurchase/);
  assert.match(read("world/playScene/PlaySceneUI.js"), /if \(saved !== false\).*playManualSave/);
  assert.match(read("systems/visual/LootPickupFxSystem.js"), /context.index === 0 && !context.isStarResource.*playResourcePickup/);
  assert.match(read("world/playScene/HardcoreModeBridge.js"), /event.band === "calm"\) scene.soundSystem\?\.stopSeismicWarning/);
});
const report = { audit: "timing-and-lifecycle", passed: true, checks, totalChecks: checks.length };
writeFileSync(new URL("testing/audio-review-2026-09-03/timing-audit.json", root), JSON.stringify(report, null, 2) + "\n");
console.log("REVIEWED_AUDIO_TIMING_OK", JSON.stringify(report));
