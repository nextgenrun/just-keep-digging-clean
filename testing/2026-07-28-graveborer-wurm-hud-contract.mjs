import assert from "node:assert/strict";
import { GraveborerWurmHudSystem } from "../systems/visual/GraveborerWurmHudSystem.js";
import { GRAVEBORER_WURM_CONFIG } from "../values/graveborerWurm.js";

function createDisplayObject() {
  const events = new Map();
  return {
    scaleX: 1,
    scaleY: 1,
    visible: false,
    interactive: false,
    destroyed: false,
    children: [],
    setScrollFactor() { return this; },
    setDepth() { return this; },
    setOrigin() { return this; },
    setDisplaySize() { return this; },
    setTint(value) { this.tint = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setRotation(value) { this.rotation = value; return this; },
    setScale(x, y) { this.scaleX = x; this.scaleY = y; return this; },
    setColor(value) { this.color = value; return this; },
    setText(value) { this.text = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setInteractive(options) {
      this.interactive = true;
      this.interactiveOptions = options;
      return this;
    },
    disableInteractive() { this.interactive = false; return this; },
    add(children) { this.children.push(...children); return this; },
    on(name, listener) { events.set(name, listener); return this; },
    emit(name) { events.get(name)?.(); return this; },
    removeAllListeners() { events.clear(); return this; },
    destroy() { this.destroyed = true; return this; },
  };
}

function createHudScene() {
  const images = [];
  const texts = [];
  const containers = [];
  return {
    images,
    texts,
    containers,
    textures: { exists: () => true },
    time: { now: 1000 },
    add: {
      container: () => {
        const display = createDisplayObject();
        containers.push(display);
        return display;
      },
      image: () => {
        const display = createDisplayObject();
        images.push(display);
        return display;
      },
      text: () => {
        const display = createDisplayObject();
        texts.push(display);
        return display;
      },
    },
    scale: {
      on: () => {},
      off: () => {},
    },
  };
}

const devScene = createHudScene();
let summonCount = 0;
const devHud = new GraveborerWurmHudSystem(
  devScene,
  GRAVEBORER_WURM_CONFIG,
  {
    devToolsEnabled: true,
    onSummon: () => {
      summonCount += 1;
      return true;
    },
  },
);
devHud.update({
  active: false,
  enabled: true,
  devTest10x: true,
}, 1000);
assert.equal(devScene.images[0].interactive, true);
assert.deepEqual(
  devScene.images[0].interactiveOptions,
  { useHandCursor: true },
);
assert.equal(devScene.containers[0].visible, true);
assert.equal(devScene.texts[0].text, GRAVEBORER_WURM_CONFIG.labels.devReady);
assert.equal(devScene.texts[1].text, GRAVEBORER_WURM_CONFIG.labels.devBadge10x);
assert.equal(devScene.texts[1].visible, true);
devScene.images[0].emit("pointerover");
devHud.update({ active: false, enabled: true }, 1000);
assert.ok(devScene.images[0].scaleX > 1, "Hover must visibly lift the summon control");
devScene.images[0].emit("pointerdown");
assert.equal(summonCount, 1);
assert.ok(devHud.devPressUntilMs > devScene.time.now);
devScene.images[0].emit("pointerout");
devHud.destroy();
assert.equal(devScene.images[0].interactive, false);
assert.equal(devScene.containers[0].destroyed, true);

const liveScene = createHudScene();
const liveHud = new GraveborerWurmHudSystem(
  liveScene,
  GRAVEBORER_WURM_CONFIG,
  { devToolsEnabled: false, onSummon: () => assert.fail("Live summon fired") },
);
liveHud.update({ active: false, enabled: true }, 1000);
assert.equal(liveScene.images[0].interactive, false);
assert.equal(liveScene.containers[0].visible, false);
assert.equal(liveScene.texts[1].visible, false);
liveHud.destroy();

console.log("Graveborer Wurm developer HUD contract passed.");
