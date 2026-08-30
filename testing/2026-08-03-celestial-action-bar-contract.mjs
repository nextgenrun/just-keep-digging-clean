import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CelestialActionBarSystem } from "../systems/visual/CelestialActionBarSystem.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { CAMPFIRE_CONFIG } from "../values/campfireConfig.js";
import {
  CELESTIAL_ACTION_BAR_ASSET_KEYS,
  CELESTIAL_ACTION_BAR_CONFIG,
  CELESTIAL_ACTION_BAR_DEFAULT_ORDER,
  CELESTIAL_ACTION_BAR_EAGER_ASSETS,
  isCelestialActionBarOrderValid,
  sanitizeCelestialActionBarOrder,
} from "../values/celestialActionBar.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../values/celestialTalentTreeUi.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

class FakeObject {
  constructor(type, x = 0, y = 0, key = null, frame = null, text = "") {
    Object.assign(this, { type, x, y, key, frame, text, visible: true, active: true });
    this.events = new Map();
    this.children = [];
  }

  setOrigin(x, y = x) { this.origin = { x, y }; return this; }
  setScrollFactor(value) { this.scrollFactor = value; return this; }
  setDepth(value) { this.depth = value; return this; }
  setSize(width, height) { this.width = width; this.height = height; return this; }
  setInteractive(config) { this.interactive = config; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  setAlpha(value) { this.alpha = value; return this; }
  setVisible(value) { this.visible = value; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setTint(value) { this.tint = value; return this; }
  clearTint() { this.tint = null; return this; }
  setTexture(key, frame = null) { this.key = key; this.frame = frame; return this; }
  setText(value) { this.text = String(value); return this; }
  add(children) { this.children.push(...(Array.isArray(children) ? children : [children])); return this; }
  on(eventName, handler) {
    const handlers = this.events.get(eventName) || [];
    handlers.push(handler);
    this.events.set(eventName, handlers);
    return this;
  }
  off(eventName, handler) {
    this.events.set(eventName, (this.events.get(eventName) || []).filter(item => item !== handler));
    return this;
  }
  emit(eventName, ...args) {
    for (const handler of this.events.get(eventName) || []) handler(...args);
    return this;
  }
  destroy() { this.active = false; this.destroyed = true; this.events.clear(); }
}

function makeScene(textureKeys) {
  const scale = new FakeObject("scale");
  scale.width = 1280;
  scale.height = 720;
  const scene = {
    scale,
    textures: { exists: key => textureKeys.has(key) },
    input: {
      setDraggable(target, enabled) { target.draggable = enabled; },
    },
    tweens: {
      killTweensOf() {},
      add(config) { config.onComplete?.(); return config; },
    },
    add: {
      container: (x, y) => new FakeObject("container", x, y),
      image: (x, y, key, frame) => new FakeObject("image", x, y, key, frame),
      text: (x, y, text) => new FakeObject("text", x, y, null, null, text),
    },
  };
  return scene;
}

function productionTextures() {
  return new Set([
    ...CELESTIAL_ACTION_BAR_EAGER_ASSETS.map(asset => asset.key),
    CELESTIAL_TALENT_TREE_UI_CONFIG.assets.tooltip.key,
    CELESTIAL_TALENT_TREE_UI_CONFIG.assets.nodeFrame.key,
    CAMPFIRE_CONFIG.spriteKeys[0],
    ASSET_KEYS.celestialEngines.waywardStar,
    ASSET_KEYS.celestialEngines.hollowSun,
    ASSET_KEYS.celestialEngines.cometEngine,
  ]);
}

function dragTo(system, sourceIndex, targetIndex) {
  const source = system.slotsById.get(system.order[sourceIndex]);
  const target = system.slotsById.get(system.order[targetIndex]);
  const pointer = { x: target.basePosition.x, y: target.basePosition.y };
  source.root.emit("pointerdown", pointer);
  source.root.emit("dragstart", pointer);
  source.root.emit("drag", pointer, pointer.x, pointer.y);
  source.root.emit("dragend", pointer);
  source.root.emit("pointerup", pointer);
}

{
  const expectedIds = [
    "quickslash",
    "thunderStrike",
    "wayward-star",
    "hollow-sun",
    "comet-engine",
    "campfire",
  ];
  assert.deepEqual(CELESTIAL_ACTION_BAR_DEFAULT_ORDER, expectedIds);
  assert.deepEqual(CELESTIAL_ACTION_BAR_CONFIG.entries.map(entry => entry.id), expectedIds);
  assert.deepEqual(
    sanitizeCelestialActionBarOrder(["hollow-sun", "bad", "hollow-sun"]),
    ["hollow-sun", "quickslash", "thunderStrike", "wayward-star", "comet-engine", "campfire"],
  );
  assert.equal(isCelestialActionBarOrderValid(expectedIds), true);
  assert.equal(isCelestialActionBarOrderValid([...expectedIds].reverse()), true);

  assert.deepEqual(CELESTIAL_ACTION_BAR_CONFIG.layout.slotCenterRatios, [
    0.158, 0.335, 0.5, 0.665, 0.842,
  ]);
  const { foundationWidthPx, foundationHeightPx } = CELESTIAL_ACTION_BAR_CONFIG.layout;
  assert.ok(Math.abs(foundationWidthPx / foundationHeightPx - 1024 / 320) < 0.001);
  assert.equal(new Set(CELESTIAL_ACTION_BAR_EAGER_ASSETS.map(asset => asset.key)).size, 6);
  assert.ok(CELESTIAL_ACTION_BAR_CONFIG.layout.tooltipWidthPx >= 440);
  assert.ok(CELESTIAL_ACTION_BAR_CONFIG.layout.tooltipHeightPx >= 132);
  assert.ok(CELESTIAL_ACTION_BAR_CONFIG.layout.tooltipMinimumScreenScale >= 0.78);
  assert.ok(CELESTIAL_ACTION_BAR_CONFIG.presentation.tooltipBodyFontSizePx >= 14);
  for (const asset of CELESTIAL_ACTION_BAR_EAGER_ASSETS) {
    assert.equal(asset.type, "image");
    assert.equal(existsSync(resolve(repoRoot, asset.path)), true, `missing eager asset ${asset.path}`);
  }
  assert.equal(CELESTIAL_ACTION_BAR_EAGER_ASSETS[0].key, CELESTIAL_ACTION_BAR_ASSET_KEYS.foundation);
}

{
  const sourceFiles = [
    "values/celestialActionBar.js",
    "systems/visual/celestialActionBarAssets.js",
    "systems/visual/celestialActionBarHealth.js",
    "systems/visual/CelestialActionBarMetricsView.js",
    "systems/visual/CelestialActionBarFoundationView.js",
    "systems/visual/CelestialActionBarSlotView.js",
    "systems/visual/CelestialActionBarTooltipView.js",
    "systems/visual/CelestialActionBarSystem.js",
  ];
  for (const relativePath of sourceFiles) {
    const source = readFileSync(resolve(repoRoot, relativePath), "utf8");
    assert.ok(source.split(/\r?\n/).length <= 300, `${relativePath} should stay focused`);
    if (!relativePath.startsWith("systems/visual/")) continue;
    assert.doesNotMatch(source, /\.add\.(?:rectangle|graphics)\s*\(/);
    assert.doesNotMatch(source, /createCanvas|data:image/);
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(match => match[1]);
    assert.ok(imports.every(path => path.startsWith("../../values/") || path.startsWith("./")));
  }
  const slotSource = readFileSync(
    resolve(repoRoot, "systems/visual/CelestialActionBarSlotView.js"),
    "utf8",
  );
  assert.doesNotMatch(slotSource, /slotSocket|this\.socket/);
  assert.doesNotMatch(slotSource, /lockImage/);
}

{
  const scene = makeScene(productionTextures());
  const persisted = [];
  const loadoutChanges = [];
  const activations = [];
  const blocked = [];
  const initialOrder = [
    "hollow-sun", "quickslash", "thunderStrike", "wayward-star", "comet-engine", "campfire",
  ];
  const system = new CelestialActionBarSystem(scene, {
    loadoutProvider: {
      getLoadout: () => initialOrder,
      setLoadout: (order, metadata) => { persisted.push({ order: [...order], metadata }); },
    },
    getAbilityState: entryId => entryId === "quickslash"
      ? { unlocked: false, unlockCondition: "Reach Bobo and buy Quick Slash." }
      : {
        unlocked: true,
        available: true,
        active: entryId === "hollow-sun",
        quantity: entryId === "campfire" ? 1 : null,
      },
    getMetrics: () => ({ gpCurrent: 72.8, gpMax: 100, miningDamage: 42 }),
    onActivate: (entryId, context) => { activations.push({ entryId, context }); },
    onBlockedActivate: (entryId, context) => { blocked.push({ entryId, context }); },
    onLoadoutChange: (order, metadata) => loadoutChanges.push({ order: [...order], metadata }),
  });

  const health = system.getHealthSnapshot();
  const layout = CELESTIAL_ACTION_BAR_CONFIG.layout;
  assert.equal(health.ready, true);
  assert.equal(health.slotCount, 6);
  assert.equal(health.draggableSlotCount, 6);
  assert.deepEqual(health.fallbackEntryIds, []);
  assert.equal(system.foundationView.foundation.key, CELESTIAL_ACTION_BAR_ASSET_KEYS.foundation);
  assert.equal(
    system.foundationView.foundation.displayWidth,
    layout.foundationWidthPx * system.uiScale,
  );
  assert.equal(
    system.foundationView.foundation.displayHeight,
    layout.foundationHeightPx * system.uiScale,
  );
  assert.equal(system.foundationView.detachedSlot.key, CELESTIAL_TALENT_TREE_UI_CONFIG.assets.nodeFrame.key);
  assert.equal(
    system.foundationView.detachedSlot.displayWidth,
    layout.detachedSlotFrameSizePx * system.uiScale,
  );
  assert.ok(system.uiScale < 0.52, "the rail-fit bar must be downsized at 1280x720");
  assert.ok(system.centerX > scene.scale.width / 2, "the bar belongs right of the XP rail");
  assert.ok(
    system.placement.bounds.left - system.placement.neighbors.xpRight
      >= system.placement.neighbors.neighborGap - 0.001,
    "the actionbar must clear the XP rail",
  );
  assert.ok(
    system.placement.neighbors.inventoryHitLeft - system.placement.bounds.right
      >= system.placement.neighbors.neighborGap - 0.001,
    "the actionbar must clear the inventory hit area",
  );
  assert.equal(health.metrics.ready, true);
  assert.equal(system.metrics.gpText.text, "GP 72/100");
  assert.equal(system.metrics.damageText.text, "MINE DMG 42");
  assert.equal(health.metrics.miningDamage, 42);

  initialOrder.forEach((entryId, index) => {
    const slot = system.slotsById.get(entryId);
    const expected = system.foundationView.getSlotPosition(index);
    assert.equal(slot.basePosition.x, expected.x);
    assert.equal(slot.basePosition.y, expected.y);
    assert.equal(slot.keyText.text, String(index + 1));
    assert.equal(slot.keyText.x, layout.keyOffsetXPx);
    assert.equal(slot.keyText.y, layout.keyOffsetYPx);
    assert.equal("socket" in slot, false);
  });
  const campfireSlot = system.slotsById.get("campfire");
  assert.equal(campfireSlot.quantityText.text, "1");
  assert.equal(campfireSlot.quantityText.visible, true);
  assert.equal(campfireSlot.icon.displayWidth, layout.campfireIconWidthPx);
  assert.equal(campfireSlot.icon.displayHeight, layout.campfireIconHeightPx);

  const lockedSlot = system.slotsById.get("quickslash");
  assert.equal(lockedSlot.icon.visible, false, "unowned abilities must leave empty sockets");
  assert.equal(lockedSlot.keyText.visible, true, "empty sockets retain their shortcut number");
  lockedSlot.root.emit("pointerover", { x: lockedSlot.basePosition.x, y: lockedSlot.basePosition.y });
  assert.equal(system.getHealthSnapshot().tooltipVisible, true);
  assert.match(system.tooltip.body.text, /Reach Bobo and buy Quick Slash/);
  const tooltipScale = Math.max(system.uiScale, layout.tooltipMinimumScreenScale);
  assert.ok(
    system.tooltip.root.x + layout.tooltipWidthPx * tooltipScale / 2
      <= system.placement.bounds.left - layout.tooltipGapPx * system.uiScale + 0.001,
    "the hover card must clear the actionbar and right-side quick controls",
  );
  lockedSlot.root.emit("pointerdown", {});
  lockedSlot.root.emit("pointerup", {});
  assert.equal(activations.length, 0);
  assert.equal(blocked.length, 1);

  const activeSlot = system.slotsById.get("hollow-sun");
  activeSlot.root.emit("pointerdown", {});
  activeSlot.root.emit("pointerup", {});
  assert.equal(activations.at(-1).entryId, "hollow-sun");
  assert.equal(activations.at(-1).context.source, "pointer");

  const activationCount = activations.length;
  dragTo(system, 0, 2);
  assert.deepEqual(system.getLoadout(), [
    "thunderStrike", "quickslash", "hollow-sun", "wayward-star", "comet-engine", "campfire",
  ]);
  assert.equal(activations.length, activationCount, "drag release must not activate a slot");
  assert.equal(persisted.length, 1);
  assert.equal(loadoutChanges.length, 1);
  assert.equal(persisted[0].metadata.reason, "slot-swap");

  system.activateSlot(1);
  assert.equal(activations.at(-1).entryId, "thunderStrike");
  assert.equal(activations.at(-1).context.source, "keyboard");

  scene.scale.width = 800;
  scene.scale.height = 600;
  system.resize();
  const xp = APPROVED_HUD_SKIN.layout.xp;
  const hudScale = Math.min(
    scene.scale.width / APPROVED_HUD_SKIN.referenceViewport.width,
    scene.scale.height / APPROVED_HUD_SKIN.referenceViewport.height,
  );
  assert.ok(system.placement.bounds.left > system.placement.neighbors.xpRight);
  assert.ok(system.placement.bounds.right < system.placement.neighbors.inventoryHitLeft);
  assert.equal(system.placement.bounds.bottom, scene.scale.height - xp.bottom * hudScale);

  system.destroy();
  system.destroy();
  assert.equal(system.getHealthSnapshot().destroyed, true);
  assert.equal(system.getHealthSnapshot().mounted, false);
  assert.equal(scene.scale.events.get("resize")?.length || 0, 0);
}

{
  const scene = makeScene(productionTextures());
  const original = [...CELESTIAL_ACTION_BAR_DEFAULT_ORDER];
  const system = new CelestialActionBarSystem(scene, {
    loadoutProvider: { getLoadout: () => original, setLoadout: () => false },
    getAbilityState: () => ({ unlocked: true, available: true }),
    onActivate() {},
  });
  dragTo(system, 0, 1);
  assert.deepEqual(system.getLoadout(), original, "failed persistence must roll back ordering");
  assert.match(system.getHealthSnapshot().lastPersistenceError, /could not be saved/i);
  system.destroy();
}

{
  const system = new CelestialActionBarSystem(makeScene(new Set()), {
    onActivate() {},
    onLoadoutChange() {},
  });
  const health = system.getHealthSnapshot();
  assert.equal(health.mounted, false);
  assert.ok(health.missingTextures.includes(CELESTIAL_ACTION_BAR_ASSET_KEYS.foundation));
  system.destroy();
}

console.log("PASS celestial actionbar: eager authored shell, empty unowned slots, activation, drag-save rollback, resize, teardown");
