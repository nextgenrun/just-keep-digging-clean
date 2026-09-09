import assert from "node:assert/strict";
import fs from "node:fs";
import { EventEmitter } from "node:events";
import { CelestialTalentTreeView } from "../../ui/overlays/CelestialTalentTreeView.js";
import { CelestialTalentProgressionSystem } from "../../systems/progression/CelestialTalentProgressionSystem.js";
import { CELESTIAL_TALENT_TREE_PRELOAD_ASSETS } from "../../values/celestialTalentTreeUi.js";
import { CELESTIAL_FOCUS_LAYOUT as G, CELESTIAL_FOCUS_FEEDBACK as F, CELESTIAL_FOCUS_CONTROLS as C, celestialFocusPoint } from "../../values/celestialTalentFocusUi.js";

const root = new URL("../../", import.meta.url);
const textures = new Map();
for (const asset of CELESTIAL_TALENT_TREE_PRELOAD_ASSETS) {
  const png = fs.readFileSync(new URL(asset.path, root));
  textures.set(asset.key, new Map([["__BASE", { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }]]));
}
const objects = [], sounds = [];
function object(type, x = 0, y = 0, key, frame = "__BASE") {
  const value = new EventEmitter(), data = new Map();
  Object.assign(value, { type, x, y, key, frame, width: 1, height: 1, scaleX: 1, scaleY: 1,
    visible: true, active: true, alpha: 1, list: [], input: { enabled: true } });
  value.setTexture = (key, frame = "__BASE") => {
    assert.ok(textures.has(key), key);
    const dimensions = textures.get(key).get(frame);
    assert.ok(dimensions, key + ":" + frame);
    Object.assign(value, { key, frame, width: dimensions.width, height: dimensions.height });
    return value;
  };
  if (key) value.setTexture(key, frame);
  value.setScale = (x, y = x) => { value.scaleX = x; value.scaleY = y; return value; };
  value.setDisplaySize = (width, height) => value.setScale(width / value.width, height / value.height);
  Object.defineProperties(value, {
    displayWidth: { get: () => value.width * value.scaleX },
    displayHeight: { get: () => value.height * value.scaleY },
  });
  value.setPosition = (x, y) => { value.x = x; value.y = y; return value; };
  value.setVisible = visible => { value.visible = visible; return value; };
  value.setAlpha = alpha => { value.alpha = alpha; return value; };
  value.setData = (key, dataValue) => { data.set(key, dataValue); return value; };
  value.getData = key => data.get(key);
  value.setText = text => { value.text = String(text); value.width = Math.max(1, value.text.length * 15); value.height = 25; return value; };
  for (const method of ["setTint", "clearTint", "setDepth", "setScrollFactor", "setOrigin", "setInteractive",
    "setRotation", "setBlendMode", "setColor"]) value[method] = () => value;
  value.add = children => {
    for (const child of Array.isArray(children) ? children : [children]) {
      child.parentContainer = value; value.list.push(child);
    }
    return value;
  };
  value.removeAll = destroy => {
    if (destroy) value.list.forEach(child => child.destroy());
    value.list = []; return value;
  };
  value.getWorldTransformMatrix = () => {
    let scale = value.scaleX, x = value.x, y = value.y, parent = value.parentContainer;
    while (parent) {
      x = parent.x + x * parent.scaleX; y = parent.y + y * parent.scaleY;
      scale *= parent.scaleX; parent = parent.parentContainer;
    }
    return { a: scale, b: 0, c: 0, d: scale, applyInverse: (px, py) => ({ x: (px - x) / scale, y: (py - y) / scale }) };
  };
  value.destroy = () => { if (!value.active) return; value.removeAll(true); value.emit("destroy"); value.active = false; value.removeAllListeners(); };
  objects.push(value); return value;
}
const scene = {
  events: new EventEmitter(), input: new EventEmitter(), scale: Object.assign(new EventEmitter(), { width: 1280, height: 720 }),
  game: { canvas: { width: 2560 } },
  textures: { exists: key => textures.has(key), get: key => ({
    has: frame => textures.get(key).has(frame),
    add: (frame, source, x, y, width, height) => {
      const size = textures.get(key).get("__BASE");
      assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= size.width && y + height <= size.height, key + ":" + frame);
      textures.get(key).set(frame, { width, height });
    },
  }) },
  add: { container: (x,y) => object("Container",x,y), image: (x,y,key,frame) => object("Image",x,y,key,frame),
    text: (x,y,text) => object("Text",x,y).setText(text) },
  soundSystem: { reviewedSfx: { warm() {}, play(id) { const sound = { key:id }; sounds.push(sound); return sound; } },
    stopTrackedSfx(sound) { sound.stopped = true; } },
};
const progression = new CelestialTalentProgressionSystem({ getPlayerLevel: () => 80, isGodModeActive: () => false });
progression.grantStars(5000);
let purchases = 0, controls = [], focusIndex = 0;
const view = new CelestialTalentTreeView(scene, { progression,
  onNodePurchased: () => purchases++,
  onControlsChanged: (next, index) => { controls = next; focusIndex = index; },
});
view.open();
assert.equal(view.getHealthSnapshot().mode, "selector");
assert.equal(view.visibleNodes.length, 0);
assert.equal(controls.length, 3);
assert.ok(view.nodes.every(node => !node.root.visible && !node.hit.input.enabled));
assert.equal(view.feedback.playCount, 0);
view.moveSelection(1,0);
assert.equal(view.selectedControlIndex, 1);
view.activateSelected();
assert.equal(view.activeBranchId, "hollow-sun");
assert.equal(view.visibleNodes.length, 12);
assert.equal(controls.length, 12);
assert.ok(view.visibleNodes.every(node => node.node.branchId === "hollow-sun"));
assert.equal(view.getHealthSnapshot().tooltipVisible, false);

function click(point) {
  scene.input.emit("pointerdown", {
    x: view.root.x + point.x * view.root.scaleX,
    y: view.root.y + point.y * view.root.scaleY,
  });
}
const core = view.nodesById.get("hollow-sun-root");
click(core.root);
assert.equal(purchases, 0, "Selecting an unowned node only inspects it");
assert.equal(view.detail.nodeId, core.node.id);
const cardAnchor = [view.detail.card.x, view.detail.card.y, view.detail.card.scaleX, view.detail.card.scaleY];
view.selectNode("hollow-eternal-eclipse");
assert.deepEqual([view.detail.card.x, view.detail.card.y], cardAnchor.slice(0,2), "The dossier stays docked for every node");
assert.equal(view.activateSelected().ok, false);
assert.equal(view.feedback.playCount, 0, "Blocked purchase has no success burst");
view.selectNode(core.node.id);
const before = progression.getSnapshot();
click(celestialFocusPoint(G.detailX, G.actionY));
assert.equal(core.snapshot.rank, 1);
assert.equal(progression.getSnapshot().talentPoints, before.talentPoints - 1);
assert.equal(purchases, 1);
assert.equal(view.feedback.playCount, 1);
assert.equal(sounds.length, 1);
assert.equal(view.detail.rank.frame, C.ranks[1].frame);
assert.equal(view.detail.action.frame, C.upgrade.frame);
assert.ok(view.detail.cost.displayWidth < G.priceWellSource[2] * view.detail.action.scaleX);
assert.ok(view.detail.cost.displayHeight < G.priceWellSource[3] * view.detail.action.scaleY,
  "The changing price fits the actual source-art well");
const pointsBeforeUpgrade = progression.getSnapshot().talentPoints;
const starsBefore = progression.getSnapshot().stars;
const cost = progression.getNodeAvailability(core.node.id).starsCost;
click(celestialFocusPoint(G.detailX, G.actionY));
assert.equal(core.snapshot.rank, 2);
assert.equal(progression.getSnapshot().stars, starsBefore - cost);
assert.equal(progression.getSnapshot().talentPoints, pointsBeforeUpgrade);
assert.equal(purchases, 2);
assert.equal(view.feedback.playCount, 2);
assert.equal(sounds.length, 2);
assert.equal(sounds[0].stopped, true, "Rapid upgrades replace the previous chime");
const geometry = [core.root.x, core.root.y, core.root.scaleX, core.root.scaleY, core.icon.scaleX, core.icon.scaleY];
scene.events.emit("update", 180, 180);
assert.ok(view.feedback.flash.alpha < 1 && view.feedback.ring.alpha > 0);
assert.deepEqual([core.root.x, core.root.y, core.root.scaleX, core.root.scaleY, core.icon.scaleX, core.icon.scaleY], geometry);
scene.events.emit("update", 1000, 1000);
assert.equal(view.feedback.active, false);
assert.equal(view.detail.status.root.alpha, 1);

const hiddenResult = view.purchaseNode("wayward-star-root");
assert.equal(hiddenResult.ok, false);
assert.equal(hiddenResult.reason, "hidden-node");
assert.equal(purchases, 2);
for (let index = 0; index < 15; index++) {
  view.moveSelection(index % 2 ? 1 : -1, 0);
  assert.equal(view.nodes[view.selectedIndex].node.branchId, "hollow-sun");
}
view.backToSelection();
assert.equal(controls.length, 3);
assert.ok(view.nodes.every(node => !node.root.visible && !node.hit.input.enabled));
assert.equal(view.getHealthSnapshot().feedback.active, false);
view.selectTree("comet-engine");
assert.ok(view.visibleNodes.every(node => node.node.branchId === "comet-engine"));
assert.equal(view.activateSelected().reason, "root-choice-locked");
assert.equal(view.feedback.playCount, 2);

scene.scale.width = 740; scene.scale.height = 720; view.resize();
assert.ok(view.root.scaleX * G.width <= 740);
assert.ok(view.root.scaleY * G.height <= 720);
for (const node of view.visibleNodes) assert.equal(node.icon.scaleX, node.icon.scaleY);
view.selectTree("hollow-sun");
view.selectNode(core.node.id);
globalThis.matchMedia = () => ({ matches:true });
view.activateSelected();
assert.equal(core.snapshot.rank, 3);
assert.equal(view.feedback.reduced, true);
assert.equal(view.feedback.flash.visible, false);
assert.equal(view.feedback.ring.visible, false);
scene.events.emit("update", 2000, F.reducedDurationMs + 1);
assert.equal(view.feedback.active, false);
assert.equal(view.detail.action.frame, C.mastered.frame);
assert.equal(view.activateSelected().reason, "max-rank");
assert.equal(view.feedback.playCount, 3);
delete globalThis.matchMedia;
view.destroy();
assert.equal(scene.events.listenerCount("update"), 0);
assert.equal(scene.input.listenerCount("pointerdown"), 0);
assert.equal(scene.scale.listenerCount("resize"), 0);
assert.equal(progression._listeners.size, 0);
assert.ok(objects.every(object => !object.active), "All authored display objects are destroyed");
const godProgression = new CelestialTalentProgressionSystem({ getPlayerLevel: () => 1, isGodModeActive: () => true });
const godView = new CelestialTalentTreeView(scene, { progression: godProgression });
godView.open(); godView.selectTree("wayward-star");
assert.equal(godView.detail.action.frame, C.free.frame, "A zero-cost unlock never shows a baked Talent Point charge");
godView.activateSelected();
assert.equal(godView.nodesById.get("wayward-star-root").snapshot.rank, 1);
assert.equal(godView.detail.cost.text, "0");
godView.destroy();
assert.equal(scene.events.listenerCount("update"), 0);
console.log("PASS focused Talents: 3 choices, 12 visible nodes, docked baked cards, inspect-before-purchase, guarded ranks/costs, feedback and reduced-motion cleanup.");
