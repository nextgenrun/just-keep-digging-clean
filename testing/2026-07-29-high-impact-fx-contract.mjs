import assert from "node:assert/strict";

import {
  HIGH_IMPACT_FX_CONFIG,
  resolveHighImpactFxEnabled,
} from "../values/highImpactFx.js";
import { THUNDER_STRIKE_CHAIN_CONFIG } from "../values/thunderStrikeChain.js";
import { ThunderStrikeAuthoredImpactView } from
  "../systems/visual/ThunderStrikeAuthoredImpactView.js";
import { ThunderStrikeImpactFxSystem } from
  "../systems/visual/ThunderStrikeImpactFxSystem.js";

class Emitter {
  constructor() {
    this.listeners = new Map();
  }
  on(event, callback) {
    const listeners = this.listeners.get(event) || new Set();
    listeners.add(callback);
    this.listeners.set(event, listeners);
  }
  once(event, callback) {
    const wrapped = (...args) => {
      this.off(event, wrapped);
      callback(...args);
    };
    this.on(event, wrapped);
  }
  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }
  emit(event, ...args) {
    [...(this.listeners.get(event) || [])].forEach((callback) => callback(...args));
  }
}

const chainableMethods = [
  "setOrigin", "setDepth", "setAlpha", "setScale", "setBlendMode",
  "setPosition", "setScrollFactor", "lineStyle", "strokeEllipse",
  "beginPath", "moveTo", "lineTo", "strokePath", "lineBetween",
];

function makeObject(kind, counters) {
  const object = {
    kind,
    active: true,
    scaleX: 1,
    scaleY: 1,
    destroy() {
      if (!this.active) return;
      this.active = false;
      counters.destroyed.push(this);
    },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      this.scaleX = width / 320;
      this.scaleY = height / 256;
      return this;
    },
  };
  chainableMethods.forEach((method) => {
    object[method] = function (...args) {
      if (method === "setScale") {
        this.scaleX = args[0];
        this.scaleY = args[1] ?? args[0];
      }
      return this;
    };
  });
  counters[kind].push(object);
  return object;
}

function makeHarness({ coordinatorEnabled = true } = {}) {
  const textureKeys = new Set(["external-texture"]);
  const requests = [];
  const releases = [];
  const removals = [];
  const cancelled = [];
  const loader = new Emitter();
  const counters = {
    image: [], graphics: [], circle: [], rectangle: [], text: [],
    destroyed: [], tweens: [], timers: [], shakes: 0,
  };
  const coordinator = {
    enabled: coordinatorEnabled,
    request(asset, options) {
      if (!this.enabled) return null;
      const request = { asset, options, cancelled: false };
      requests.push(request);
      return {
        cancel() {
          if (request.cancelled) return false;
          request.cancelled = true;
          cancelled.push(asset.key);
          return true;
        },
      };
    },
    releaseDecodedSource(key) {
      releases.push(key);
      return true;
    },
  };
  const scene = {
    config: { tileSize: 32, viewportWidth: 1280, viewportHeight: 720 },
    scale: { width: 1280, height: 720 },
    textures: {
      exists: (key) => textureKeys.has(key),
      remove(key) {
        removals.push(key);
        textureKeys.delete(key);
      },
    },
    load: loader,
    runtimeAssetLoadCoordinator: coordinator,
    add: {
      image: () => makeObject("image", counters),
      graphics: () => makeObject("graphics", counters),
      circle: () => makeObject("circle", counters),
      rectangle: () => makeObject("rectangle", counters),
      text: () => makeObject("text", counters),
    },
    tweens: {
      add(options) {
        const tween = {
          options,
          stopped: false,
          removed: false,
          stop() { this.stopped = true; },
          remove() { this.removed = true; },
        };
        counters.tweens.push(tween);
        return tween;
      },
    },
    time: {
      delayedCall(delayMs, callback) {
        const timer = {
          delayMs, callback, removed: false,
          remove() { this.removed = true; },
        };
        counters.timers.push(timer);
        return timer;
      },
    },
    cameras: {
      main: { shake: () => { counters.shakes += 1; } },
    },
  };
  return {
    scene, textureKeys, requests, releases, removals, cancelled, counters,
  };
}

function completeRequest(harness, index, success = true) {
  const request = harness.requests[index];
  request.options.onStart?.(request.asset);
  if (success) {
    harness.textureKeys.add(request.asset.key);
    request.options.onReady?.(request.asset);
  } else {
    request.options.onError?.(request.asset, new Error("expected-load-failure"));
  }
}

function playImpact(system) {
  system.play(
    { results: [{ tx: 2, ty: 3 }], chainEffectiveDamageMultiplier: 1 },
    { x: 80, y: 72 },
    0,
  );
}

const previousWindow = globalThis.window;
globalThis.window = {};

assert.equal(resolveHighImpactFxEnabled(HIGH_IMPACT_FX_CONFIG, ""), true);
for (const token of ["0", "off", "false", "procedural"]) {
  assert.equal(
    resolveHighImpactFxEnabled(
      HIGH_IMPACT_FX_CONFIG,
      `?${HIGH_IMPACT_FX_CONFIG.queryParam}=${token}`,
    ),
    false,
  );
}
assert.equal(new Set(HIGH_IMPACT_FX_CONFIG.assets.map(({ key }) => key)).size, 3);
assert.equal(HIGH_IMPACT_FX_CONFIG.assets.length, 3);

{
  const harness = makeHarness();
  const view = new ThunderStrikeAuthoredImpactView(harness.scene, {
    search: "?highImpactFx=procedural",
  });
  assert.equal(harness.requests.length, 0, "disabled FX must issue no requests");
  assert.equal(view.snapshot().state, "disabled");
  view.destroy();
}

{
  const harness = makeHarness({ coordinatorEnabled: false });
  const view = new ThunderStrikeAuthoredImpactView(harness.scene);
  assert.equal(harness.requests.length, 0);
  assert.equal(view.snapshot().state, "coordinator-disabled");
  assert.equal(view.play(0, 0, THUNDER_STRIKE_CHAIN_CONFIG.stages[0], 44), false);
  view.destroy();
}

{
  const harness = makeHarness();
  const view = new ThunderStrikeAuthoredImpactView(harness.scene);
  assert.equal(harness.requests.length, 3);
  assert.ok(harness.requests.every(
    ({ options }) => options.owner === HIGH_IMPACT_FX_CONFIG.owner
      && options.priority === HIGH_IMPACT_FX_CONFIG.priority,
  ));
  completeRequest(harness, 0);
  completeRequest(harness, 1);
  assert.equal(view.snapshot().atomicReady, false);
  completeRequest(harness, 2);
  assert.equal(view.snapshot().state, "ready");
  assert.equal(
    view.play(64, 96, THUNDER_STRIKE_CHAIN_CONFIG.stages[0], 44),
    true,
  );
  assert.equal(harness.counters.image.length, 4);
  assert.equal(view.snapshot().activeTweens, 4);
  assert.equal(globalThis.window.__jkdHighImpactFx.snapshot().state, "ready");
  assert.equal(globalThis.window.__jkdHighImpactFx.rollback(), true);
  assert.equal(view.snapshot().state, "rolled-back");
  assert.equal(view.snapshot().activeObjects, 0);
  assert.ok(harness.counters.tweens.every(({ stopped, removed }) => stopped && removed));
  assert.equal(harness.textureKeys.has("external-texture"), true);
  assert.ok(HIGH_IMPACT_FX_CONFIG.assets.every(
    ({ key }) => !harness.textureKeys.has(key) && harness.removals.includes(key),
  ));
  assert.equal(harness.releases.length, 3);
  assert.equal(view.play(64, 96, THUNDER_STRIKE_CHAIN_CONFIG.stages[0], 44), false);
  assert.equal(globalThis.window.__jkdHighImpactFx.restore(), true);
  assert.equal(harness.requests.length, 6);
  completeRequest(harness, 3);
  completeRequest(harness, 4);
  completeRequest(harness, 5);
  assert.equal(view.snapshot().atomicReady, true);
  view.destroy();
  assert.equal(globalThis.window.__jkdHighImpactFx, undefined);
  assert.doesNotThrow(() => view.destroy());
}

{
  const harness = makeHarness();
  const view = new ThunderStrikeAuthoredImpactView(harness.scene);
  completeRequest(harness, 0, false);
  assert.equal(view.snapshot().state, "failed");
  assert.equal(view.snapshot().atomicReady, false);
  assert.equal(harness.cancelled.length, 3);
  assert.equal(view.play(0, 0, THUNDER_STRIKE_CHAIN_CONFIG.stages[0], 44), false);
  view.destroy();
}

{
  const harness = makeHarness();
  const system = new ThunderStrikeImpactFxSystem(
    harness.scene,
    THUNDER_STRIKE_CHAIN_CONFIG,
    { search: "?highImpactFx=0" },
  );
  playImpact(system);
  assert.equal(harness.requests.length, 0);
  assert.equal(harness.counters.graphics.length, 4);
  assert.equal(harness.counters.circle.length, 12);
  assert.equal(harness.counters.rectangle.length, 1);
  assert.equal(harness.counters.text.length, 1);
  assert.equal(harness.counters.shakes, 1);
  system.destroy();
}

{
  const harness = makeHarness();
  const system = new ThunderStrikeImpactFxSystem(harness.scene);
  completeRequest(harness, 0);
  completeRequest(harness, 1);
  completeRequest(harness, 2);
  playImpact(system);
  assert.equal(harness.counters.image.length, 4);
  assert.equal(harness.counters.graphics.length, 2, "bolt and glow must remain");
  assert.equal(harness.counters.circle.length, 0, "authored crackles replace sparks");
  assert.equal(harness.counters.rectangle.length, 1, "flash must remain");
  assert.equal(harness.counters.text.length, 1, "damage label must remain");
  assert.equal(harness.counters.shakes, 1, "shake must remain");
  system.destroy();
}

{
  const harness = makeHarness();
  const view = new ThunderStrikeAuthoredImpactView(harness.scene, {
    reducedMotion: true,
  });
  completeRequest(harness, 0);
  completeRequest(harness, 1);
  completeRequest(harness, 2);
  assert.equal(view.play(0, 0, THUNDER_STRIKE_CHAIN_CONFIG.stages[9], 44), true);
  assert.equal(harness.counters.image.length, 3);
  assert.equal(harness.counters.tweens.length, 0);
  assert.equal(harness.counters.timers.length, 3);
  view.destroy();
}

{
  const harness = makeHarness();
  const view = new ThunderStrikeAuthoredImpactView(harness.scene);
  const activeRequest = harness.requests[0];
  activeRequest.options.onStart(activeRequest.asset);
  view.destroy();
  const releaseCount = harness.releases.filter(
    (key) => key === activeRequest.asset.key,
  ).length;
  harness.textureKeys.add(activeRequest.asset.key);
  harness.scene.load.emit(`filecomplete-image-${activeRequest.asset.key}`);
  assert.equal(
    harness.textureKeys.has(activeRequest.asset.key),
    false,
    "destroyed views must remove textures cached by a late Phaser completion",
  );
  assert.equal(
    harness.releases.filter((key) => key === activeRequest.asset.key).length,
    releaseCount + 1,
    "late Phaser completion must release its captured decoded source",
  );
  assert.equal(harness.textureKeys.has("external-texture"), true);
}
const restartHarness = makeHarness();
const restartView = new ThunderStrikeAuthoredImpactView(restartHarness.scene);
assert.ok(globalThis.window.__jkdHighImpactFx);
restartView.destroy();
assert.equal(globalThis.window.__jkdHighImpactFx, undefined);

globalThis.window = previousWindow;
console.log("HIGH_IMPACT_FX_CONTRACT_OK");
