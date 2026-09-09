import assert from "node:assert/strict";
import { ShadowMinerRuntime } from "../world/playScene/ShadowMinerRuntime.js";
import { SHADOW_MINER_CONFIG } from "../values/shadowMiner.js";
import { SHADOW_MINER_WORK } from "../values/shadowMinerWork.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from "../values/playerAssetProfiles.js";
import { DynamicEventHealthSystem } from "../systems/health/DynamicEventHealthSystem.js";
import { DYNAMIC_EVENT_HEALTH } from "../values/dynamicEventHealth.js";
import { DYNAMIC_EVENT_REVIEW as cfg } from "../values/dynamicEventReview.js";
import { createReviewWorld, seedReviewTrail } from "./dynamic-event-sandbox/reviewWorld.js";

const world = createReviewWorld(300), ts = cfg.world.tileSize, floorY = (world.standingTy + 1) * ts;
let saves = 0, rewards = 0, gpCalls = 0;
const pose = { x: 36 * ts, y: floorY, textureKey: profile.idleSheet, frameName: 0,
  originX: 0.5, originY: 0.890625, displayWidth: 109, displayHeight: 109, action: false };
const clips = new Map([
  [profile.idleAnim, profile.idleFrames.map(frame => ({ textureKey: profile.idleSheet, textureFrame: frame }))],
  [profile.digSidewaysAnim, profile.digSidewaysFrames.map(frame => ({ textureKey: profile.digSidewaysSheet, textureFrame: frame }))],
  [profile.digDownAnim, profile.digDownFrames.map(frame => ({ textureKey: profile.digDownSheet, textureFrame: frame }))],
]);
const view = {
  anchor: null, currentPose: null, visible: false,
  spawn({ pose: next }) { this.visible = true; this.applyPose(next); return true; },
  applyPose(next) { this.anchor = { x: next.x, y: next.y }; this.currentPose = { ...next }; return true; },
  beginObserve() {}, update() {}, setLightExposure() {}, beginFlee() {},
  applyFleePose(next) { return this.applyPose(next); },
  vanish() {}, hide() { this.visible = false; }, destroy() {},
  getSnapshot() { return { visible: this.visible, frameName: this.currentPose?.frameName }; },
};
const scene = {
  config: { ...cfg.world }, worldModel: world, clockMs: 18000, time: { now: 18000 },
  player: { ...pose, setPosition(x, y) { this.x = x; this.y = y; return this; }, texture: { key: profile.idleSheet }, frame: { name: 0 }, anims: { currentAnim: { key: profile.idleAnim } } },
  playerController: { getPlayerTile: () => ({ tx: Math.floor(scene.player.x / ts), ty: world.standingTy }),
    physicsBody: { x: 36 * ts, y: floorY - 75, w: 31, h: 75 }, consumeGemPower() { gpCalls++; } },
  cameras: { main: { worldView: { x: 20 * ts, y: floorY - 10 * ts, width: 35 * ts, height: 18 * ts } } },
  textures: { exists: () => true },
  anims: { get: key => clips.has(key) ? { frames: clips.get(key) } : null },
  queueDugTilesSave() { saves++; }, worldRenderer: { applyTileUpdate() {} },
  digSystem: { processDestroyedTile() { rewards++; } },
  controls: { patrol: false },
};
const runtime = new ShadowMinerRuntime(scene, {
  mode: { enabled: true, review: false, dev10x: false, behaviorId: "mimic" }, random: () => 0.5, view,
});
scene.shadow = runtime;
seedReviewTrail(scene);
assert.equal(runtime.forceSpawn(scene.playerController.getPlayerTile(), scene.clockMs, { torchActive: true, torchIntensity: 1 }), true);
const start = scene.clockMs;
for (let time = start; time < start + 5500; time += 25) {
  scene.clockMs = scene.time.now = time;
  runtime.update(time, 25, scene.playerController.getPlayerTile(), { torchActive: true, torchIntensity: 1 });
}
assert.equal(runtime.state, "observing", "a distant torch must not erase the encounter");
assert.equal(runtime.fleeCount, 0);
assert.ok(runtime.workLoop.frameChanges > 20, "standing Shadowminer continues to animate");
assert.ok(runtime.workLoop.blocksMined >= 1, "visible mining removes actual ordinary terrain");
assert.ok(runtime.workLoop.blocksMined <= SHADOW_MINER_WORK.maximumBlocks);
assert.equal(rewards, 0); assert.equal(gpCalls, 0);
assert.equal(saves, runtime.workLoop.blocksMined);

scene.player.x = view.anchor.x + ts * 2;
for (let time = scene.clockMs; time < start + 8500 && runtime.fleeCount === 0; time += 25) {
  scene.clockMs = scene.time.now = time;
  runtime.update(time, 25, scene.playerController.getPlayerTile(), { torchActive: true, torchIntensity: 1 });
}
assert.equal(runtime.fleeCount, 1, "bringing the torch close repels the miner");
assert.equal(runtime.lastRepelledBy, "torch");
runtime.destroy();

const health = new DynamicEventHealthSystem();
for (const id of DYNAMIC_EVENT_HEALTH.ids) health.observe(id, { active: false, phase: "idle", pulse: 1, blocked: true, monitor: false }, 0);
for (const id of DYNAMIC_EVENT_HEALTH.ids) health.observe(id, { active: false, phase: "idle", pulse: 1, blocked: true, monitor: false }, 50000);
assert.equal(health.snapshot().ready, true, "normal gates must not be reported as failures");
health.observe("wurm", { active: true, phase: "warning", pulse: 2, monitor: true }, 50025);
health.observe("wurm", { active: true, phase: "warning", pulse: 2, monitor: true }, 57000);
assert.equal(health.snapshot().events.wurm.status, "FAULT", "a missing heartbeat is detected");
health.observe("wurm", { active: true, phase: "burrowing", pulse: 3, monitor: true }, 57025);
health.markCancelled("wurm", 57030);
health.observe("wurm", { active: false, phase: "cooldown", pulse: 4, monitor: true }, 57050);
assert.equal(health.snapshot().events.wurm.completions, 0, "cancellation cannot masquerade as success");
console.log(JSON.stringify({ passed: "animated bounded Shadowminer mining, distance-aware torch, healthy gates and failed heartbeat",
  mined: saves, rewards, gpCalls, minimumObserveMs: SHADOW_MINER_WORK.minimumObserveMs }));