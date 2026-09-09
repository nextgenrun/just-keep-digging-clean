import assert from "node:assert/strict";
import { WORLDROOT_SANCTUARY_CONFIG as config, resolveSanctuaryTreeGrowth }
  from "../values/worldrootSanctuary.js";
import { updateWorldrootSurfaceFraming } from "../world/playScene/worldrootSurfaceFraming.js";
import { CameraShakeSystem } from "../systems/visual/CameraShakeSystem.js";

const young = resolveSanctuaryTreeGrowth({ knownStarCount: 0, campfireLevel: 1 });
const mature = resolveSanctuaryTreeGrowth({ knownStarCount: 50, campfireLevel: 10 });
assert.ok(mature.height / young.height > 1.5);
assert.deepEqual(mature, { width: 1, height: 1 });
assert.deepEqual(resolveSanctuaryTreeGrowth({ knownStarCount: 50, consumedStarCount: 50,
  campfireLevel: 10 }), mature, "death exposes a grown ruin rather than shrinking it away");
for (let level = 2; level <= 10; level++) {
  const before = resolveSanctuaryTreeGrowth({ knownStarCount: 50, campfireLevel: level - 1 });
  const after = resolveSanctuaryTreeGrowth({ knownStarCount: 50, campfireLevel: level });
  assert.ok(after.height > before.height && after.width > before.width);
}

const camera = { height: 720, zoom: 1, followOffset: { x: 0, y: 0 },
  scrollX: 123, scrollY: 456, deadzone: { width: 128, height: 129.6 },
  setFollowOffset(x, y) { this.followOffset = { x, y }; },
  setDeadzone() { throw new Error("Phaser setDeadzone snaps follow scroll; do not call it per frame"); },
};
const scene = {
  config: { tileSize: 94, viewportWidth: 1280, viewportHeight: 720,
    cameraDeadzoneXFrac: 0.10, cameraDeadzoneYFrac: 0.18 },
  player: { x: 2021, y: 6070 }, cameras: { main: camera }, time: { now: 0 },
  game: { loop: { actualFps: 60 } },
  starPillarSystem: { _townWorldVisual: { sanctuaryView: { enabled: true,
    transform: { hearthX: 2021, surfaceY: 6110, tileSize: 94 } } } },
};
scene.shakeSystem = new CameraShakeSystem(scene);
const settle = () => { for (let frame = 0; frame < 300; frame++) {
  updateWorldrootSurfaceFraming(scene, 16); scene.shakeSystem.update(frame * 16, 16);
} };
settle();
assert.ok(Math.abs(camera.followOffset.y + 40 + 360 - 720 * config.camera.groundScreenFraction) < 0.01);
assert.ok(camera.deadzone.height < 0.01, "surface framing cannot be swallowed by the follow deadzone");
assert.equal(camera.zoom, 1, "the HUD and gameplay scale stay unchanged");
assert.deepEqual([camera.scrollX, camera.scrollY], [123, 456],
  "framing updates must not bypass Phaser follow/deadzone by writing scroll");
const framed = camera.followOffset.y;
scene.shakeSystem.shake("earthquake.major", 1, { force: true });
scene.shakeSystem.update(50, 16);
assert.ok(Math.abs(camera.followOffset.y - framed) < 40);
scene.shakeSystem.stop();
assert.equal(camera.followOffset.y, framed, "ending shake restores framing, not zero");
scene.player.y = 6500;
settle();
assert.ok(Math.abs(camera.followOffset.y) < 0.01, "underground camera returns to normal");
assert.ok(Math.abs(camera.deadzone.height - 720 * 0.18) < 0.01);
scene.player.y = 6070;
scene.player.x = 2021 + 94 * 12;
settle();
assert.ok(Math.abs(camera.followOffset.y) < 0.01, "distant town camera returns to normal");
scene.player.x = 2021;
camera.height = 640;
settle();
assert.ok(Math.abs(camera.followOffset.y + 40 + 320 - 640 * config.camera.groundScreenFraction) < 0.01);
scene.shakeSystem.destroy();
assert.deepEqual(camera.followOffset, { x: 0, y: 0 });
console.log("WORLDROOT_GROWTH_AND_SURFACE_FRAMING_OK");
