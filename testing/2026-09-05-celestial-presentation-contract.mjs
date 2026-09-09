import assert from "node:assert/strict";
import { CelestialStarVfx } from "../systems/celestial/CelestialStarVfx.js";
import { CELESTIAL_PRESENTATION as P } from "../values/celestialPresentation.js";

globalThis.Phaser = { BlendModes: { ADD: "ADD" } };
export function sceneFixture(failAt = Infinity) {
  const displays = [];
  const tweens = new Set();
  let serial = 0;
  function image(x, y, key, frame) {
    if (++serial === failAt) throw Error("injected allocation failure");
    const item = {
      x, y, key, frame, angle: 0, scaleX: 1, scaleY: 1, alpha: 1,
      setPosition(x, y) { Object.assign(this, { x, y }); return this; },
      setDepth(value) { this.depth = value; return this; },
      setBlendMode() { return this; },
      setDisplaySize(width, height) {
        this.displayWidth = width; this.displayHeight = height;
        this.scaleX = width / 512; this.scaleY = height / 512; return this;
      },
      setAlpha(value) { this.alpha = value; return this; },
      setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
      setTint(...tints) { this.tints = tints; return this; },
      setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; },
      setFrame(frame) { this.frame = frame; return this; },
      preFX: { addColorMatrix() { return { reset() { return this; }, hue(value) { this.hueDeg = value; return this; } }; } },
      destroy() { this.destroyed = true; },
    };
    displays.push(item);
    return item;
  }
  return {
    displays, tweens, time: { now: 0 }, textures: { exists: () => true, get: () => ({ has: () => true, add() {}, setFilter() {} }) },
    add: { image, circle: image },
    tweens: {
      active: tweens,
      add(config) { tweens.add(config); return config; },
      killTweensOf(target) {
        for (const tween of tweens) if (tween.targets === target) tweens.delete(tween);
      },
    },
  };
}
export function complete(scene, tween) {
  assert.ok(tween);
  scene.tweens.active.delete(tween);
  for (const key of ["value", "alpha", "scaleX", "scaleY", "x", "y"]) {
    if (typeof tween[key] === "number") tween.targets[key] = tween[key];
  }
  tween.onUpdate?.();
  tween.onComplete?.();
}
export function enter(scene, visual) {
  complete(scene, [...scene.tweens.active].find(t => t.targets === visual.envelope));
}
const scene = sceneFixture();
const star = new CelestialStarVfx({
  scene, x: 0, y: 0, assetKey: "star", size: 78, kind: "wayward",
});
assert.equal(star.sprite.alpha, 0, "creation stays hidden until arrival");
enter(scene, star);
const fullAlpha = star.sprite.alpha;
for (let i = 1; i <= 240; i += 1) {
  scene.time.now = i * 16;
  star.update(i * 16, 16, i * 20, 0);
  assert.equal(star.sprite.alpha, 1, "the core never fades during flight");
  assert.equal(star.sprite.displayWidth, star.size, "the core has no size drift");
  star.pulse(100);
}
assert.equal(star.trails.size, P.wayward.trailMaxLive, "trail allocation stays bounded");
assert.equal(star.pulses.size, P.pulse.maxLive, "overlapping contacts stay bounded");
assert.ok([...star.trails].every(image => image.key === "star"),
  "the wake keeps only matching star echoes, with no fire overlays");
for (const echo of star.trails) {
  const fade = [...scene.tweens.active].find(tween => tween.targets === echo);
  assert.equal(fade.alpha, 0);
  for (const key of ["scaleX", "scaleY", "angle"]) assert.equal(key in fade, false);
}
const samples = star.trailIndex;
star.update(5000, 16, star.x, star.y);
assert.equal(star.trailIndex, samples, "stationary stars do not accumulate a glow");
const companion = new CelestialStarVfx({
  scene, x: 0, y: 0, assetKey: "star", size: 45, kind: "wayward", passive: true,
});
enter(scene, companion);
assert.equal(companion.sprite.alpha, fullAlpha, "companion cores also stay solid");
companion.update(5000, 16, 60, 0);
assert.ok([...companion.trails].every(echo => echo.alpha < P.wayward.echoAlpha),
  "companion echoes remain quieter than active echoes");
assert.ok(companion.trails.size > 0);
let finished = 0;
star.finish(() => { finished += 1; star.destroy(); });
complete(scene, [...scene.tweens.active].find(t => t.targets === star.envelope));
assert.equal(finished, 1);
assert.equal(star.effects.size, 0);
assert.ok([...scene.tweens.active].every(t => !t.targets.destroyed));
companion.destroy();
assert.ok(scene.displays.every(image => image.destroyed));
assert.equal(scene.tweens.active.size, 0, "finish/destroy release all owned animations");

const hollowScene = sceneFixture();
const hollow = new CelestialStarVfx({
  scene: hollowScene, x: 10, y: 20, assetKey: "hollow", size: 136,
  kind: "hollow", coreRadius: 31, delay: 500,
});
hollow.update(300, 16, 40, 60);
assert.equal(hollow.sprite.alpha, 0, "delayed cluster arrivals stay hidden");
assert.deepEqual([hollow.core.x, hollow.core.y], [40, 60]);
enter(hollowScene, hollow);
hollowScene.time.now = 800;
assert.equal(hollow.pulse(200), true);
const pull = [...hollow.pulses][0];
complete(hollowScene, [...hollowScene.tweens.active].find(t => t.targets === pull));
const inward = [...hollowScene.tweens.active].find(t => t.targets === pull);
assert.ok(inward.scaleX < pull.scaleX, "gravity echoes contract toward the dark centre");
hollow.destroy();
assert.equal(hollowScene.tweens.active.size, 0);
assert.ok(hollowScene.displays.every(image => image.destroyed));
const failureScene = sceneFixture(2);
assert.throws(() => new CelestialStarVfx({
  scene: failureScene, x: 0, y: 0, assetKey: "star", size: 78, kind: "wayward",
}), /injected/);
assert.ok(failureScene.displays.every(image => image.destroyed), "partial construction rolls back");

console.log("CELESTIAL_PRESENTATION_CONTRACT_OK: colour trails, limits, quiet companions, delayed arrivals, inward pulses and teardown.");
