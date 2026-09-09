import { PlayerPhysicsBody } from "../../player/PlayerPhysicsBody.js";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createFreesoundFixture } from "../audio-review-2026-09-03/freesound-fixture.mjs";
import { CORE_ACTION_AUDIO as C } from "../../values/coreActionAudio.js";
import { FREESOUND_RUNTIME_ASSETS as A } from "../../values/freesoundAudio.js";
import { REVIEWED_AUDIO_ASSETS as R } from "../../values/reviewedAudioAssets.js";
const checks = [];
const check = (name, run) => { run(); checks.push(name); };
check("Routine XP and level-up arrivals do not add UI ticks", () => {
 const f = createFreesoundFixture(); f.keys.add("sfx-ui-select");
 for (let n = 0; n < 30; n++) { f.tick(200); assert.equal(f.system.playXpGather({ segmentIndex: n % 10 }), null); }
 assert.equal(f.system.playXpGather({ special: true, levelUp: true }), null);
 assert.equal(f.played.length, 0); f.system.destroy();
});
check("Resource arrivals have an 850ms gap and special XP never adds a queued tail", () => {
 const f = createFreesoundFixture();
 for (let n = 0; n < 15; n++) {
  f.tick(400); f.system.playResourcePickup();
  f.tick(40); f.system.playXpGather({ special: true }); f.tick(40);
 }
 assert.equal(f.played.length, 8);
 for (let n = 1; n < f.played.length; n++) assert.ok(f.played[n].at - f.played[n - 1].at >= 850);
 assert.ok(f.played.every(e => e.key === R.libResourcePop.key));
 assert.ok(f.system.reviewedSfx.history.every(e => e.gain <= 0.024));
 f.tick(6000); assert.equal(f.played.length, 8); f.system.destroy();
});
check("Shop bursts yield one short physical receipt, independent of biome", () => {
 const f = createFreesoundFixture();
 for (const biome of ["default", "amberDepths", "cave", "void"]) {
  f.system.freesoundAudio.setContext({ biome }); f.tick(2000);
  const before = f.played.length;
  for (let n = 0; n < 4; n++) { f.tick(160); n % 2 ? f.system.playCoinReward() : f.system.playPurchase(); }
  assert.equal(f.played.length - before, 1);
 }
 f.tick(1000); assert.ok(f.system.playCoinReward());
 for (const event of f.system.freesoundAudio.history) {
  const asset = A[event.id]; assert.equal(event.context, "shop");
  assert.ok(asset.duration < 0.28); assert.ok(asset.gain < 0.033);
  assert.equal(asset.palette, "https://freesound.org/apiv2/packs/32282/");
 }
 f.system.destroy();
});
check("Cold coin receipts warm silently and mute never consumes a future pickup", () => {
 const f = createFreesoundFixture({ loaded: false });
 assert.equal(f.system.playPurchase(), null); f.finishLoads(); assert.equal(f.played.length, 0);
 assert.ok(f.system.playPurchase()); f.tick(1000); f.system.toggleSfx(false);
 assert.equal(f.system.playResourcePickup(), null); assert.equal(f.system.playXpGather({ special: true }), null);
 f.system.toggleSfx(true); assert.ok(f.system.playResourcePickup());
 f.tick(1000); f.system.audioSuspended = true; assert.equal(f.system.playCoinReward(), null);
 assert.equal(f.system.playResourcePickup(), null); f.system.destroy();
});
check("A scene clock rewind cannot suppress pickup and coin channels", () => {
 const f = createFreesoundFixture(); f.tick(9000);
 assert.ok(f.system.playResourcePickup()); assert.ok(f.system.playCoinReward());
 f.scene.time.now = 0;
 assert.ok(f.system.playResourcePickup()); assert.ok(f.system.playCoinReward()); f.system.destroy();
});
check("Rollback coin fallbacks also retain the quieter mix and burst limit", () => {
 const f = createFreesoundFixture(); f.system.freesoundAudio.enabled = false;
 assert.ok(f.system.playPurchase()); f.tick(160); assert.equal(f.system.playCoinReward(), null);
 f.tick(800); assert.ok(f.system.playCoinReward());
 assert.ok(f.system.reviewedSfx.history.every(e => e.gain <= 0.034)); f.system.destroy();
});
check("Current review cards report pickup and fallback reward gains from the runtime", () => {
 const catalog = JSON.parse(readFileSync(new URL("../audio-runtime-reaudit-2026-09-04/catalog.json", import.meta.url)));
 for (const [id, factor] of [["libResourcePop", C.pickups.resourceGain], ["libPurchaseCoin", C.pickups.purchaseFallbackGain], ["libRewardCoins", C.pickups.rewardFallbackGain]]) {
  const row = catalog.items.find(i => i.path === R[id].path);
  assert.ok(Math.abs(row.runtimeGain - R[id].gain * factor * 0.9) < 0.0001);
 }
 for (const role of ["coinPickup", "coinReward"]) assert.equal(Object.values(A).filter(a => a.role === role).length, 2);
});
check("Review playback preserves very quiet and zero gains instead of boosting them", () => {
 const source = readFileSync(new URL("../audio-runtime-reaudit-2026-09-04/review.js", import.meta.url), "utf8");
 const body = source.slice(source.indexOf("function selectedGain("), source.indexOf("function listeningGain("));
 const select = new Function("$", "tunedGain", body + "; return selectedGain;");
 for (const mode of ["current", "suggested"]) {
  const gain = select(() => ({ value: mode }), () => 0);
  assert.equal(gain({ runtimeGain: 0, suggestedGain: 0 }), 0);
  assert.equal(gain({ runtimeGain: 0.004, suggestedGain: 0.004 }), 0.004);
 }
 assert.equal(select(() => ({ value: "suggested" }), () => 0)({ runtimeGain: 0.18, suggestedGain: 0 }), 0);
});
check("The real w/h collision body probes under its feet for footsteps and landings", () => {
 const f = createFreesoundFixture();
 const body = new PlayerPhysicsBody({ playerBodyWidthPx: 40, playerBodyHeightPx: 80 }, 84, 14);
 body.vx = 130;
 const controller = { physicsBody: body, isGrounded: () => true };
 const probes = [];
 const world = { tileSize: 94, getTileType: (x, y) => { probes.push([x, y]); return x === 1 && y === 1 ? 1 : 0; } };
 assert.ok(f.system.playFootstep({ controller, worldModel: world }));
 assert.deepEqual(probes, [[1, 1]]);
 assert.ok(C.banks.footstepDirt.some(id => A[id].key === f.played[0].key));
 f.tick(1000); assert.ok(f.system.playLanding(controller, 700, world));
 assert.equal(f.played.at(-1).key, R.libDirtBreak.key); f.system.destroy();
});
const report = { passed: true, totalChecks: checks.length, checks, manualPlaythrough: false, listeningApproved: false };
writeFileSync(new URL("verification.json", import.meta.url), JSON.stringify(report, null, 2));
console.log("PICKUP_FOOTSTEP_FOLLOWUP_OK", JSON.stringify(report));
