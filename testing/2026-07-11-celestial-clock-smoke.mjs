import assert from "node:assert/strict";

import { DayNightCycle } from "../systems/environment/DayNightCycle.js";
import { TIME_CONFIG } from "../values/timeConfig.js";

const cycle = Object.create(DayNightCycle.prototype);
cycle.timeConfig = TIME_CONFIG;
cycle.config = {
  tileSize: 94,
  topAirRows: 65,
  worldWidthTiles: 280,
  worldWidthPx: 280 * 94,
};
cycle.scene = {
  cameras: {
    main: {
      width: 1200,
      height: 800,
      zoom: 1,
      worldView: { x: 0, y: 5000 },
    },
  },
};
cycle.day = 1;

function sample(time) {
  cycle.currentTime = time;
  cycle.currentPhase = cycle._getCurrentPhase();
  const snapshot = cycle.getCelestialSnapshot();
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.sun));
  assert.ok(Object.isFrozen(snapshot.sun.worldPosition));
  assert.ok(Object.isFrozen(snapshot.sun.screenPosition));
  const opposition = (snapshot.moon.orbitTime - snapshot.sun.orbitTime + 1) % 1;
  assert.ok(Math.abs(opposition - 0.5) < 1e-9);
  return snapshot;
}

const midnight = sample(0);
assert.equal(midnight.phase, "midnight");
assert.equal(midnight.sun.aboveHorizon, false);
assert.equal(midnight.sun.alpha, 0);
assert.equal(midnight.moon.aboveHorizon, true);
assert.ok(midnight.moon.elevation > 0.999);

const sunrise = sample(TIME_CONFIG.celestial.riseTime);
assert.equal(sunrise.phase, "morning");
assert.equal(sunrise.sun.aboveHorizon, true);
assert.equal(sunrise.moon.aboveHorizon, true);
assert.ok(sunrise.sun.screenPosition.x < sunrise.moon.screenPosition.x);
assert.ok(Math.abs(sunrise.sun.elevation) < 1e-9);
assert.ok(Math.abs(sunrise.moon.elevation) < 1e-9);
assert.equal(sunrise.sun.alpha, 0);

const justBeforeRise = sample(TIME_CONFIG.celestial.riseTime - 0.00001);
const fadeAfterRise = sample(
  TIME_CONFIG.celestial.riseTime + TIME_CONFIG.celestial.horizonFadeFraction * 0.5
);
assert.equal(justBeforeRise.sun.alpha, 0);
assert.ok(fadeAfterRise.sun.alpha > 0 && fadeAfterRise.sun.alpha < 1);
assert.ok(
  Math.abs(justBeforeRise.sun.screenPosition.x - sunrise.sun.screenPosition.x) < 1,
  "sun must travel continuously to the horizon instead of teleporting"
);

const noon = sample(TIME_CONFIG.celestial.noonTime);
assert.equal(noon.phase, "afternoon");
assert.equal(noon.sun.aboveHorizon, true);
assert.ok(noon.sun.elevation > 0.999);
assert.ok(noon.sun.screenPosition.y < sunrise.sun.screenPosition.y);
assert.equal(noon.moon.aboveHorizon, false);
assert.equal(noon.moon.alpha, 0);

const anchoredWorldPosition = { ...noon.sun.worldPosition };
const firstProjection = { ...noon.sun.screenPosition };
cycle.scene.cameras.main.worldView.x += 250;
cycle.scene.cameras.main.worldView.y += 100;
const movedCameraNoon = sample(TIME_CONFIG.celestial.noonTime);
assert.deepEqual(movedCameraNoon.sun.worldPosition, anchoredWorldPosition);
assert.equal(movedCameraNoon.sun.screenPosition.x, firstProjection.x - 250);
assert.equal(movedCameraNoon.sun.screenPosition.y, firstProjection.y - 100);

const sunset = sample(TIME_CONFIG.celestial.setTime);
assert.equal(sunset.phase, "sunset");
assert.equal(sunset.sun.aboveHorizon, true);
assert.equal(sunset.moon.aboveHorizon, true);
assert.ok(sunset.sun.screenPosition.x > sunset.moon.screenPosition.x);
assert.ok(Math.abs(sunset.sun.elevation) < 1e-9);
assert.ok(Math.abs(sunset.moon.elevation) < 1e-9);
assert.equal(sunset.sun.alpha, 0);

const created = [];
const graphicsScene = {
  add: {
    graphics() {
      const gfx = {
        fillStyle() { return this; },
        fillCircle() { return this; },
        setScrollFactor(value) { this.scrollFactor = value; return this; },
        setDepth(value) { this.depth = value; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
      };
      created.push(gfx);
      return gfx;
    },
  },
};
const visualCycle = Object.create(DayNightCycle.prototype);
visualCycle.scene = graphicsScene;
visualCycle.timeConfig = TIME_CONFIG;
visualCycle._createSunMoon();

assert.equal(created.length, 2);
assert.strictEqual(visualCycle.sunSprite, created[0]);
assert.strictEqual(visualCycle.moonSprite, created[1]);
for (const body of created) {
  assert.equal(body.scrollFactor, 1);
  assert.equal(body.depth, TIME_CONFIG.celestial.renderDepth);
}

console.log("celestial clock smoke: world orbit, camera projection, horizon fades, and opposition passed");
