import assert from "node:assert/strict";
import { DynamicEventRuntime } from "../world/playScene/DynamicEventRuntime.js";
import { EarthquakeFeedbackUI } from "../systems/visual/EarthquakeFeedbackUI.js";
import { EARTHQUAKE_FEEDBACK_CONFIG } from "../values/earthquakeFeedback.js";
import { DynamicEventDevPanel } from "../systems/visual/DynamicEventDevPanel.js";
import { DynamicEventAwarenessView } from "../systems/visual/DynamicEventAwarenessView.js";
import { DYNAMIC_EVENT_HEALTH } from "../values/dynamicEventHealth.js";
import { WURM_DIFFICULTIES } from "../values/graveborerWurmVariants.js";

class Display {
  constructor(x = 0, y = 0) { Object.assign(this, { x, y, visible: true, alpha: 1, scaleX: 1, scaleY: 1, active: true }); this.handlers = new Map(); this.children = []; this.scrollFactorX = 1; this.scrollFactorY = 1; }
  setScrollFactor(x, y = x) { this.scrollFactorX = x; this.scrollFactorY = y; return this; } setDepth() { return this; } setOrigin() { return this; }
  setVisible(value) { this.visible = value; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setText(value) {
    this.text = value;
    // Conservative font-metric fixture; browser captures remain the visual acceptance check.
    const lines = String(value).split("\n"), wrap = this.style?.wordWrap?.width || Infinity;
    const widths = lines.map(line => line.length * 9);
    this.width = Math.min(wrap, Math.max(0, ...widths));
    this.height = lines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length * 9 / wrap)), 0) * 18;
    return this;
  } setColor() { return this; }
  setTexture(key, frame) { this.texture = { key }; this.frame = { name: frame }; return this; }
  setInteractive() { this.input = true; return this; } add(child) { this.children.push(...[child].flat()); return this; }
  on(event, callback) { this.handlers.set(event, callback); return this; }
  destroy() { this.active = false; }
}
const keys = new Map();
const scene = {
  time: { now: 0 }, gameState: "playing",
  scale: { width: 1280, height: 720, on() {}, off() {} },
  add: { container: (x, y) => new Display(x, y), image: (x, y) => new Display(x, y),
    zone: (x, y) => new Display(x, y),
    text: (x, y, value, style) => { const text = new Display(x, y); text.style = style; return text.setText(value); } },
  input: { keyboard: { on: (key, handler) => keys.set(key, handler), off: key => keys.delete(key) } },
  textures: { exists: () => true }, config: { viewportWidth: 1280, viewportHeight: 720 },
};
scene.cameras = { main: { zoom: 0.65, width: 1280, height: 720, originX: 0.5, originY: 0.5 } };
const source = { state: "warning", stateRemaining: 5000, intensity: "minor", isPlayerAware: () => true };
const ui = new EarthquakeFeedbackUI(scene, source);
ui.update();
assert.equal(ui.root.visible, true);
assert.equal(ui.root.scaleX * scene.cameras.main.zoom, 1, "zoom does not shrink earthquake instructions");
assert.ok(Math.abs((ui.root.y - 360) * 0.65 + 360 - EARTHQUAKE_FEEDBACK_CONFIG.card.topY) < 0.001);
scene.time.now = EARTHQUAKE_FEEDBACK_CONFIG.timing.phaseVisibleMs.warning + 1; source.stateRemaining = 1000; ui.update();
assert.equal(ui.root.visible, false, "warning leaves room for play after its short cue");
source.state = "earthquake"; source.stateRemaining = 20000; ui.update();
assert.equal(ui.root.visible, true);
scene.time.now += EARTHQUAKE_FEEDBACK_CONFIG.timing.phaseVisibleMs.earthquake + 1; source.stateRemaining = 6000; ui.update();
assert.equal(ui.root.visible, false, "quake indication is brief rather than persistent");
assert.match(ui.detail.text, /LEAVE MARKED GROUND/);
source.state = "aftermath"; source.stateRemaining = 0; source.fallingRocks = [{ id: 1 }]; ui.update();
assert.equal(ui.detail.text, EARTHQUAKE_FEEDBACK_CONFIG.labels.pendingRocks);
scene.time.now += EARTHQUAKE_FEEDBACK_CONFIG.timing.phaseVisibleMs.aftermath + 1; ui.update();
assert.equal(ui.root.visible, false);
source.state = "idle"; source.fallingRocks = []; ui.update();
scene.time.now += 1000; ui.update();
assert.equal(ui.root.visible, false);
ui.destroy(); assert.equal(ui.destroyed, true);

// The local demo intentionally disables generic cheats; encounter QA remains available.
const originalLocation = globalThis.location;
globalThis.location = { hostname: "127.0.0.1" };
const localRuntime = new DynamicEventRuntime(scene);
assert.equal(localRuntime.devEnabled, true);
localRuntime.destroy();
globalThis.location = { hostname: "example.com" };
const remoteRuntime = new DynamicEventRuntime(scene);
assert.equal(remoteRuntime.devEnabled, false);
remoteRuntime.destroy();
// The production marker wins even on localhost with development modules already loaded.
const originalProduction = globalThis.__DIG_GAME_PRODUCTION__;
const originalWindow = globalThis.window;
try {
  globalThis.__DIG_GAME_PRODUCTION__ = true;
  globalThis.window = {};
  for (const hostname of ["127.0.0.1", "nextgen.run"]) {
    globalThis.location = { hostname, search: "?jkd_e2e=1&wurm=1&wurm10x=1" };
    const productionRuntime = new DynamicEventRuntime(scene);
    assert.equal(productionRuntime.devEnabled, false);
    assert.equal(productionRuntime.panel, null, "production constructs neither EVENTS button nor panel");
    assert.equal(keys.has("keydown-F2"), false, "production does not register the event shortcut");
    assert.equal(globalThis.window[DYNAMIC_EVENT_HEALTH.globalKey], undefined, "production exposes no manual-trigger API");
    for (const id of DYNAMIC_EVENT_HEALTH.ids) {
      assert.equal(productionRuntime.request(id), false, "production rejects manual " + id + " requests");
    }
    productionRuntime.destroy();
  }
} finally {
  if (originalProduction === undefined) delete globalThis.__DIG_GAME_PRODUCTION__;
  else globalThis.__DIG_GAME_PRODUCTION__ = originalProduction;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  globalThis.location = originalLocation;
}

const panel = new DynamicEventDevPanel(scene, { canUseShortcut: () => true, request() {}, cancel() {} });
assert.ok(keys.has("keydown-F2"));
assert.ok(!keys.has("keydown-F8") && !keys.has("keydown-F10"));
keys.get("keydown-F2")({ preventDefault() {} });
assert.equal(panel.open, true);
// Phaser hit tests read the interactive child scroll factor, independently of its container.
const pointerTargets = [...panel.root.children, ...panel.launcher.children].filter(child => child.input);
assert.equal(pointerTargets.length, DYNAMIC_EVENT_HEALTH.ids.length + 7);
assert.ok(pointerTargets.every(child => child.scrollFactorX === 0 && child.scrollFactorY === 0),
  "event buttons remain clickable at their rendered positions while the world camera scrolls");
for (let index = 0; index < WURM_DIFFICULTIES.length; index++) {
  panel.difficultyIndex = index; panel._labels();
  assert.ok(panel.difficultyButton.width * panel.difficultyButton.scaleX <= DYNAMIC_EVENT_HEALTH.dev.buttonTextWidth);
  assert.ok(panel.sizeButton.width * panel.sizeButton.scaleX <= DYNAMIC_EVENT_HEALTH.dev.buttonTextWidth);
}
panel.update({ ready: true, history: [{ id: "earthquake", outcome: "REQUEST ACCEPTED" }],
  events: Object.fromEntries(DYNAMIC_EVENT_HEALTH.ids.map(id => [id, {
    status: "QUEUED", starts: 100, completions: 99, reason: DYNAMIC_EVENT_HEALTH.labels.pending,
  }])) });
assert.ok(panel.heading.width * panel.heading.scaleX <= DYNAMIC_EVENT_HEALTH.dev.headingWidth);
for (const text of panel.rows.values()) {
  assert.ok(text.width * text.scaleX <= DYNAMIC_EVENT_HEALTH.dev.statusWidth);
  assert.ok(text.height * text.scaleY <= DYNAMIC_EVENT_HEALTH.dev.statusHeight);
}
panel.destroy();
assert.equal(keys.size, 0, "scene teardown unregisters its shortcut");

const awareness = new DynamicEventAwarenessView(scene);
const events = { shadow: { active: true, phase: "observing", detail: "LEFT · MINING", finishedAt: -Infinity } };
awareness.update({ events }, 1000);
assert.equal(awareness.cards.has("shadow"), false, "Shadowminer stays an in-world encounter");
events.earthquake = { active: false, finishedAt: 8000,
  result: { title: "EARTHQUAKE SETTLED", detail: "3 rocks fell · 2 hits" } };
awareness.update({ events }, 8100);
assert.equal(awareness.cards.get("earthquake").root.visible, true);
assert.equal(awareness.cards.get("earthquake").root.scaleX * scene.cameras.main.zoom, 1, "camera zoom does not shrink completion notices");
assert.equal(awareness.cards.get("earthquake").detail.text, "3 rocks fell · 2 hits");
events.wurm = { active: true, phase: "burrowing", detail: "Broodmother · 4/4 · Move off the marked tunnel now." };
awareness.update({ events }, 8150);
assert.equal(awareness.cards.has("wurm"), false, "Wurm stays an in-world hazard");
for (const card of awareness.cards.values()) {
  assert.ok(card.title.width * card.title.scaleX <= DYNAMIC_EVENT_HEALTH.notice.textWidth);
  assert.ok(card.detail.height * card.detail.scaleY <= DYNAMIC_EVENT_HEALTH.notice.detailHeight);
}
awareness.destroy();
console.log("brief earthquake cue, in-world Wurm and Shadowminer hazards, production-disabled F2/manual triggers, F2 cleanup and readable earthquake completion passed");
