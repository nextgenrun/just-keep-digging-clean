import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { USER_SETTINGS } from "../systems/UserSettings.js";
import { FloatingTextSystem } from "../systems/visual/FloatingTextSystem.js";
import { showMiningDamageFeedback } from "../systems/visual/miningDamageFeedback.js";
import { HUD_LAYOUT } from "../values/hudLayout.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";
import { SHADER_CONFIG } from "../values/shaderConfig.js";

function createText(worldX, worldY, value) {
  return {
    active: true,
    worldX,
    worldY,
    value,
    depth: null,
    alpha: null,
    setOrigin() { return this; },
    setDepth(depth) { this.depth = depth; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    destroy() { this.active = false; },
  };
}

const textObjects = [];
const tweens = [];
const scene = {
  time: { now: 1000 },
  add: {
    text(worldX, worldY, value) {
      const text = createText(worldX, worldY, value);
      textObjects.push(text);
      return text;
    },
    circle() {
      throw new Error("small damage must not request burst particles");
    },
  },
  tweens: {
    add(config) { tweens.push(config); return config; },
    killTweensOf() {},
  },
};

USER_SETTINGS.resetAll();
USER_SETTINGS.updateDisplay({ floatingTextMode: "full" });
const floating = new FloatingTextSystem(scene, 99);
floating.showDamage(100, 200, 12);

assert.equal(textObjects.length, 1, "FULL must create routine damage text");
assert.equal(textObjects[0].value, "12");
assert.equal(textObjects[0].depth, HUD_LAYOUT.floatingTextDepth);
assert.equal(floating.activeFloatingTexts.length, 1);
assert.equal(
  tweens.some(tween => tween.targets === textObjects[0] && tween.alpha === 1),
  true,
  "damage text must still receive its visible pop-in tween",
);

USER_SETTINGS.updateDisplay({ floatingTextMode: "reduced" });
floating.applyDisplaySettings();
scene.time.now += 1000;
floating.showDamage(100, 200, 13);
assert.equal(textObjects.length, 1, "REDUCED intentionally hides routine damage");

USER_SETTINGS.updateDisplay({ floatingTextMode: "off" });
floating.applyDisplaySettings();
scene.time.now += 1000;
floating.showDamage(100, 200, 14);
assert.equal(textObjects.length, 1, "OFF must hide routine damage");

USER_SETTINGS.updateDisplay({ floatingTextMode: "full" });
floating.applyDisplaySettings();
scene.time.now += 1000;
floating.showDamage(100, 200, 15);
assert.equal(textObjects.length, 2, "switching back to FULL must restore damage text immediately");
scene.time.now += 1000;
floating.showCriticalHit(100, 200, 24, 1.5);
scene.time.now += 1000;
floating.showHeavyPunchDamage(100, 200, 8);
assert.equal(textObjects.length, 4, "FULL must present normal, critical, and Heavy Punch damage");
assert.deepEqual(
  textObjects.slice(-2).map(text => text.depth),
  [HUD_LAYOUT.floatingTextDepth, HUD_LAYOUT.floatingTextDepth],
  "specialized damage styles must use the same visible world-feedback layer",
);

scene.time.now += 1000;
const beforeCriticalRoute = textObjects.length;
assert.equal(
  showMiningDamageFeedback(floating, 100, 200, {
    damage: 30,
    isCriticalHit: true,
    critMultiplier: 1.5,
  }),
  "critical",
);
assert.equal(
  textObjects.length,
  beforeCriticalRoute + 1,
  "one critical mining hit must create exactly one floating number",
);
assert.equal(textObjects.at(-1).value.trim(), "30");

const playSceneUpdateSource = readFileSync(
  new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url),
  "utf8",
);
const caveGameplaySource = readFileSync(
  new URL("../world/playScene/CaveGameplayController.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  playSceneUpdateSource,
  /floatingTextSystem\.show(?:Damage|CriticalHit)\(/,
  "main-world mining must route normal and critical numbers through one selector",
);
assert.doesNotMatch(
  caveGameplaySource,
  /floatingTextSystem\.show(?:Damage|CriticalHit)\(/,
  "compact-cave mining must route normal and critical numbers through one selector",
);

const darknessCeiling = Math.max(
  LIGHT_CONFIG.darknessRenderDepth,
  SHADER_CONFIG.layers.darknessLight.depth,
);
assert.ok(
  HUD_LAYOUT.floatingTextDepth > darknessCeiling,
  "floating damage must render above both darkness implementations",
);
assert.ok(
  HUD_LAYOUT.floatingTextDepth + 10 < SHADER_CONFIG.layers.lightningFlash.depth,
  "the elevated bonus-text tier must remain below lightning flashes",
);
assert.ok(
  HUD_LAYOUT.floatingTextDepth < HUD_LAYOUT.hudDepth,
  "world feedback must remain below the authored HUD",
);

console.log(JSON.stringify({
  pass: true,
  fullDamageStylesCreated: textObjects.length,
  floatingTextDepth: HUD_LAYOUT.floatingTextDepth,
  darknessCeiling,
  lightningDepth: SHADER_CONFIG.layers.lightningFlash.depth,
  hudDepth: HUD_LAYOUT.hudDepth,
}));
