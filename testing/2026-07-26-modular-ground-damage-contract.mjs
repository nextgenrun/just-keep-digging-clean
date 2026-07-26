import assert from "node:assert/strict";
import fs from "node:fs";
import {
  WORLD_VISUAL_DAMAGE,
  WORLD_VISUAL_DAMAGE_MODES,
  resolveWorldVisualDamageMode,
  resolveWorldVisualDamageStage,
  resolveWorldVisualDamageStateNumber,
} from "../values/worldVisualDamage.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";
import { WorldVisualDamagePainter } from "../world/rendering/scenic-world/WorldVisualDamagePainter.js";

class GraphicsStub {
  constructor() {
    this.calls = [];
    this.destroyed = false;
  }

  call(method, ...args) {
    this.calls.push([method, ...args]);
    return this;
  }

  setDepth(...args) { return this.call("setDepth", ...args); }
  setMask(...args) { return this.call("setMask", ...args); }
  setBlendMode(...args) { return this.call("setBlendMode", ...args); }
  clear(...args) { return this.call("clear", ...args); }
  fillStyle(...args) { return this.call("fillStyle", ...args); }
  fillEllipse(...args) { return this.call("fillEllipse", ...args); }
  fillCircle(...args) { return this.call("fillCircle", ...args); }
  fillTriangle(...args) { return this.call("fillTriangle", ...args); }
  lineStyle(...args) { return this.call("lineStyle", ...args); }
  beginPath(...args) { return this.call("beginPath", ...args); }
  moveTo(...args) { return this.call("moveTo", ...args); }
  lineTo(...args) { return this.call("lineTo", ...args); }
  strokePath(...args) { return this.call("strokePath", ...args); }
  destroy() { this.destroyed = true; return this.call("destroy"); }
}

function createPainter(search = "") {
  const originalLocation = globalThis.location;
  globalThis.location = { search };
  const graphics = [];
  const scene = {
    add: {
      graphics: () => {
        const layer = new GraphicsStub();
        graphics.push(layer);
        return layer;
      },
    },
  };
  const painter = new WorldVisualDamagePainter(scene, { id: "solid-mask" }, 2.45);
  painter.create();
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
  return { painter, graphics };
}

assert.equal(WORLD_VISUAL_DAMAGE.stateCount, 9);
assert.equal(WORLD_VISUAL_DAMAGE.stages.length, WORLD_VISUAL_DAMAGE.stateCount);
assert.equal(resolveWorldVisualDamageStateNumber(0), 0);
assert.equal(resolveWorldVisualDamageStateNumber(0.001), 1);
assert.equal(resolveWorldVisualDamageStateNumber(0.119), 1);
assert.equal(resolveWorldVisualDamageStateNumber(0.12), 2);
assert.equal(resolveWorldVisualDamageStateNumber(1), 9);
assert.equal(resolveWorldVisualDamageStage(Number.NaN), null);
for (let index = 1; index < WORLD_VISUAL_DAMAGE.stages.length; index += 1) {
  const previous = WORLD_VISUAL_DAMAGE.stages[index - 1];
  const current = WORLD_VISUAL_DAMAGE.stages[index];
  assert.ok(current.minDamage > previous.minDamage, "damage thresholds must rise monotonically");
  assert.ok(current.spanScale > previous.spanScale, "fracture span must rise monotonically");
  assert.ok(current.branchCount >= previous.branchCount, "branch count must never regress");
  assert.ok(current.chipCount >= previous.chipCount, "micro-flakes must never regress");
}

assert.equal(resolveWorldVisualDamageMode(undefined, ""), WORLD_VISUAL_DAMAGE_MODES.modular);
assert.equal(resolveWorldVisualDamageMode(undefined, "?groundDamage=layers"), WORLD_VISUAL_DAMAGE_MODES.modular);
assert.equal(resolveWorldVisualDamageMode(undefined, "?groundDamage=legacy"), WORLD_VISUAL_DAMAGE_MODES.legacy);

const modular = createPainter();
assert.equal(modular.graphics.length, 4, "damage must be split into four composable Graphics layers");
assert.ok(modular.graphics.every(layer => (
  layer.calls.some(([method, mask]) => method === "setMask" && mask.id === "solid-mask")
)), "every damage layer must share the authoritative solid-terrain mask");
assert.deepEqual(
  modular.graphics.map(layer => layer.calls.find(([method]) => method === "setBlendMode")?.[1]),
  ["MULTIPLY", "MULTIPLY", "SCREEN", "NORMAL"],
  "dark and light passes must adapt automatically to arbitrary underlying color"
);

for (const [index] of Object.keys(WORLD_VISUAL_MATERIALS).entries()) {
  assert.equal(modular.painter.draw(index, 0, 0.56, 94), true);
}
assert.equal(
  modular.painter.draw(Object.keys(WORLD_VISUAL_MATERIALS).length, 0, 0.56, 94),
  true,
  "an unregistered future material must use the same universal damage contract"
);
const midCalls = modular.graphics.flatMap(layer => layer.calls);
assert.ok(midCalls.some(([method]) => method === "fillEllipse"), "abrasion must be an independent layer");
assert.ok(midCalls.some(([method]) => method === "fillTriangle"), "surface flakes must be an independent layer");
assert.ok(midCalls.some(([method]) => method === "lineTo"), "fractures must be an independent layer");

const early = createPainter();
early.painter.draw(4, 7, 0.001, 94);
const critical = createPainter();
critical.painter.draw(4, 7, 1, 94);
const count = (layers, method) => layers.flatMap(layer => layer.calls)
  .filter(([name]) => name === method).length;
assert.ok(
  count(critical.graphics, "strokePath") > count(early.graphics, "strokePath"),
  "later states must accumulate more fracture paths"
);
assert.ok(
  count(critical.graphics, "fillCircle") + count(critical.graphics, "fillTriangle")
    > count(early.graphics, "fillCircle") + count(early.graphics, "fillTriangle"),
  "later states must accumulate more resting micro-flakes"
);

const painterSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualDamagePainter.js", import.meta.url),
  "utf8"
);
assert.doesNotMatch(
  painterSource,
  /worldVisualMaterials|TILE_TYPES|getTileType|materialId|textureKey/,
  "the painter must not know current material names, tile identities, or texture assets"
);
assert.doesNotMatch(
  painterSource,
  /erase|DESTINATION_OUT|fillRect|fillRoundedRect|createGeometryMask/,
  "pre-break damage must never cut a hole or paint a square cell"
);

const legacy = createPainter("?groundDamage=legacy");
assert.equal(legacy.painter.mode, WORLD_VISUAL_DAMAGE_MODES.legacy);
legacy.painter.draw(2, 3, 0.5, 94);
assert.ok(count(legacy.graphics, "lineTo") > 0, "legacy comparison must retain radial crack rendering");
assert.equal(count(legacy.graphics, "fillEllipse"), 0, "legacy mode must not mix modular abrasion");

modular.painter.setDepth(5);
assert.ok(modular.graphics.every(layer => (
  layer.calls.some(([method, depth]) => method === "setDepth" && depth >= 4.997)
)));
for (const harness of [modular, early, critical, legacy]) {
  harness.painter.destroy();
  assert.ok(harness.graphics.every(layer => layer.destroyed), "destroy must release every damage layer");
}

console.log("Modular ground damage contract passed: nine states, four adaptive layers, all current and future materials, no holes");
