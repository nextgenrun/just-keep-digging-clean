import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createFreesoundFixture } from "../audio-review-2026-09-03/freesound-fixture.mjs";
import { setupGameplayMethods } from "../../world/playScene/PlaySceneGameplay.js";
import { dispatchCaveMineFeedback } from "../../world/playScene/caveMineFeedback.js";
import { FREESOUND_AUDIO_ASSETS as ALL, FREESOUND_RUNTIME_ASSETS as ACTIVE } from "../../values/freesoundAudio.js";
import { CORE_ACTION_AUDIO as CORE } from "../../values/coreActionAudio.js";
import { TILE_TYPES as T } from "../../values/tileTypes.js";
const methods = {}; setupGameplayMethods(methods);
const checks = [], root = new URL("../../", import.meta.url);
const read = path => readFileSync(new URL(path, root));
function check(name, run) { run(); checks.push(name); }
function movement(f) {
 let grounded = true;
 const body = { x: 0, y: 0, w: 40, h: 80, vx: 130, vy: 0 };
 const controller = { physicsBody: body, isGrounded: () => grounded };
 f.scene.playerController = controller;
 f.scene.worldModel = { tileSize: 94, getTileType: () => T.DIRT };
 f.scene.config = { tileSize: 94 };
 return { body, controller, ground: value => { grounded = value; } };
}
check("Original source approvals and all nine unfinished-review rejections are preserved", () => {
 assert.equal(Object.keys(ALL).length, 562);
 const review = JSON.parse(read("testing/audio-design-cleanup-2026-09-05/review-export-original.json"));
 const rejected = review.items.filter(item => item.decision === "reject");
 assert.equal(rejected.length, 9);
 for (const item of rejected) assert.ok(!Object.values(ACTIVE).some(asset => asset.path === item.path));
 assert.equal(Object.values(CORE.banks).flat().length, 19);
 assert.equal(Object.keys(ACTIVE).length, 341);
});
check("Each real main-world mining contact has exactly one primary impact", () => {
 for (const type of [T.DIRT, T.STONE, T.COPPER, T.GEODE_INTERIOR]) {
  const f = createFreesoundFixture();
  for (const destroyed of [false, true]) {
   f.tick(2000); const before = f.played.length;
   methods.playMineFeedbackAudio.call({ soundSystem: f.system }, { success: true, destroyed }, type);
   assert.equal(f.played.length - before, 1, `${type}/${destroyed}`);
  } f.system.destroy();
 }
});
check("Main-world and cave mining dispatch the same material and break cues", () => {
 for (const type of [T.DIRT, T.STONE, T.COPPER, T.GEODE_INTERIOR]) for (const destroyed of [false, true]) {
  const a = createFreesoundFixture(), b = createFreesoundFixture(); a.tick(1000); b.tick(1000);
  methods.playMineFeedbackAudio.call({ soundSystem: a.system }, { success: true, destroyed }, type);
  dispatchCaveMineFeedback({}, { soundSystem: b.system }, { success: true, destroyed, typeBeforeDamage: type }, { contactFeedback: true });
  assert.equal(a.played[0]?.key, b.played[0]?.key);
  assert.equal(a.played.length, 1); assert.equal(b.played.length, 1);
  a.system.destroy(); b.system.destroy();
 }
});
check("Star destruction stays a single approved special cue", () => {
 const f = createFreesoundFixture(); f.tick(1000);
 methods.playMineFeedbackAudio.call({ soundSystem: f.system }, { success: true, destroyed: true }, T.SKY_TILE);
 assert.equal(f.played.length, 1); assert.ok(f.played[0].key.includes("star-destruction")); f.system.destroy();
});
check("Stationary, airborne and duplicate animation contacts cannot spam footsteps", () => {
 const f = createFreesoundFixture(), m = movement(f); f.tick(1000);
 m.body.vx = 0; assert.equal(f.system.playFootstep(), null);
 m.body.vx = 130; m.ground(false); assert.equal(f.system.playFootstep(), null);
 m.ground(true);
 for (let n = 0; n < 200; n++) { f.system.playFootstep(); f.tick(5); }
 assert.equal(f.played.length, 5);
 for (let n = 1; n < f.played.length; n++) assert.ok(f.played[n].at - f.played[n - 1].at >= CORE.minFootstepMs);
 assert.ok(f.played.every(event => CORE.banks.footstepDirt.some(id => ACTIVE[id].key === event.key)));
 f.system.destroy();
});
check("A braked descent is quiet; all landing speeds use bounded ground contacts", () => {
 const f = createFreesoundFixture(), m = movement(f);
 const observe = (speed, grounded) => { m.body.vy = speed; m.ground(grounded); f.tick(80); f.system.reviewedAmbience.observeMotion(m.controller, 80); };
 observe(0, true);
 observe(700, false); observe(80, false); observe(80, false); observe(0, true);
 assert.equal(f.played.length, 0);
 f.tick(1000); observe(400, false); observe(400, false); observe(400, false); observe(0, true);
 assert.equal(f.played.length, 1); assert.ok(f.played[0].key.startsWith("fs-approved-"));
 f.tick(1000); observe(700, false); observe(700, false); observe(700, false); observe(0, true);
 assert.equal(f.played.length, 2); assert.ok(CORE.banks.footstepDirt.some(id => ACTIVE[id].key === f.played[1].key));
 assert.equal(f.system.playFootstep(), null);
 f.tick(1000); observe(700, false); observe(700, false); m.body.y += 1000; observe(0, true);
 assert.equal(f.played.length, 2); f.system.destroy();
});
check("Cold core contacts warm their intended material without random fallback or late playback", () => {
 const f = createFreesoundFixture({ loaded: false });
 assert.equal(f.system.playDig({ tileType: T.COPPER }), null); assert.equal(f.played.length, 0);
 f.finishLoads(); assert.equal(f.played.length, 0);
 assert.ok(f.system.playDig({ tileType: T.COPPER }));
 assert.ok(CORE.banks.mineMetal.some(id => ACTIVE[id].key === f.played[0].key)); f.system.destroy();
});
check("Proactive core loading respects the existing pending-work bound", () => {
 const f = createFreesoundFixture({ loaded: false });
 for (let n = 0; n < 10; n++) { f.update(); assert.ok(f.system.freesoundAudio.palette.pending.size <= 4); f.finishLoads(); }
 for (const role of Object.keys(CORE.banks)) for (const asset of f.system.freesoundAudio.palette.state(role, CORE.context).bank.slice(0, 3)) assert.ok(f.keys.has(asset.key), asset.id);
 f.system.destroy();
});
check("Core banks stay physical and exhaust their matched variants without repeats", () => {
 const f = createFreesoundFixture();
 for (const [role, ids] of Object.entries(CORE.banks)) {
  const seen = new Set(); let previous;
  for (let n = 0; n < 120; n++) {
   f.tick(10000); const asset = f.system.freesoundAudio.palette.pick(role, CORE.context);
   assert.ok(ids.includes(asset.id)); assert.notEqual(asset.id, previous); previous = asset.id; seen.add(asset.id);
   assert.doesNotMatch(asset.title, /guitar|walkie|reverse|drink|garbage|melodic/i);
  } assert.equal(seen.size, ids.length);
 } f.system.destroy();
});
check("Mute and suspension remain authoritative for movement and mining", () => {
 const f = createFreesoundFixture(); movement(f); f.tick(1000);
 f.system.toggleSfx(false);
 assert.equal(f.system.playFootstep(), null); assert.equal(f.system.playDig({ tileType: T.DIRT }), null);
 f.system.toggleSfx(true); f.system.audioSuspended = true;
 assert.equal(f.system.playFootstep(), null); assert.equal(f.system.playTileBreak({ tileType: T.STONE }), null);
 f.system.destroy();
});
check("Refreshed review cards retain physical-file IDs and report current core gains", () => {
 const old = JSON.parse(read("testing/audio-design-cleanup-2026-09-05/before/testing__audio-runtime-reaudit-2026-09-04__catalog.json"));
 const current = JSON.parse(read("testing/audio-runtime-reaudit-2026-09-04/catalog.json"));
 const prior = new Map(old.items.map(item => [item.path, item.id]));
 assert.equal(current.items.length, 753);
 for (const item of current.items) assert.equal(item.id, prior.get(item.path));
 for (const id of Object.values(CORE.banks).flat()) {
  const asset = ACTIVE[id], row = current.items.find(item => item.path === asset.path);
  assert.ok(Math.abs(row.runtimeGain - asset.gain * 0.9) < 0.0001);
 }
});
check("Hard ground excludes the long loud outlier and applies source calibration once", () => {
 const f = createFreesoundFixture(); movement(f);
 f.scene.worldModel.getTileType = () => T.STONE;
 for (const key of ["footsteps-0", "footsteps-1", "footsteps-2"]) f.keys.add(key);
 let previous;
 for (let n = 0; n < 4; n++) {
  f.tick(400); const sound = f.system.playFootstep();
  assert.ok(sound); assert.notEqual(sound.key, "footsteps-0"); assert.notEqual(sound.key, previous);
  previous = sound.key;
  const asset = CORE.hardFootsteps.find(asset => asset.key === sound.key);
  assert.ok(Math.abs(sound.volume - asset.gain * f.system.getSfxMixVolume()) < 0.00001);
 }
 f.system.destroy();
});
const report = { passed: true, checks, totalChecks: checks.length, manualPlaythrough: false, listeningApproved: false };
writeFileSync(new URL("verification.json", import.meta.url), JSON.stringify(report, null, 2));
console.log("CORE_AUDIO_CLEANUP_OK", JSON.stringify(report));
