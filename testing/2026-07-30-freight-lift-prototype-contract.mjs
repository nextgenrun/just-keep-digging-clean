import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FREIGHT_LIFT_PROTOTYPE } from
  "../values/freightLiftPrototype.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HARNESS_ROOT = path.join(
  ROOT,
  "testing",
  "animation-sandbox",
  "freight-lift-prototype-v1",
);
const config = FREIGHT_LIFT_PROTOTYPE;

assert.equal(config.reviewOnly, true);
const travelDistancePx = Math.abs(
  config.stops.lower.platformYPx - config.stops.upper.platformYPx,
);
assert.ok(travelDistancePx > config.viewport.heightPx);
assert.ok(travelDistancePx < config.viewport.heightPx * 2);
assert.ok(config.lift.platformWidthPx > config.player.bodyWidthPx);

for (const asset of Object.values(config.assets)) {
  assert.ok(
    fs.statSync(path.resolve(HARNESS_ROOT, asset.path)).isFile(),
    asset.path,
  );
}

const runtimeFiles = [
  "FreightLiftPrototypeScene.js",
  "FreightLiftPrototypeView.js",
  "bootstrap.js",
];
let combinedSource = "";
for (const file of runtimeFiles) {
  const source = fs.readFileSync(path.join(HARNESS_ROOT, file), "utf8");
  const lines = source.split(/\r?\n/).length;
  assert.ok(lines <= 300, `${file} exceeds 300 lines`);
  combinedSource += source;
}
assert.match(combinedSource, /wasRiding/);
assert.match(combinedSource, /player\.setY/);
assert.match(combinedSource, /_moveLiftTo/);
assert.doesNotMatch(combinedSource, /localStorage|queueDugTilesSave|setTile/);
assert.doesNotMatch(
  combinedSource,
  /KeyCodes\.SPACE|keys\.jump|jumpVelocity|teleport|portal/i,
);

const indexSource = fs.readFileSync(
  path.join(HARNESS_ROOT, "index.html"),
  "utf8",
);
assert.match(indexSource, /bootstrap\.js/);
assert.doesNotMatch(indexSource, /main\.js/);

const productionRoots = [
  "main.js",
  "player",
  "scenes",
  "systems",
  "ui",
  "world",
];
const productionReferences = [];
function scan(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return;
  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(absolutePath)) {
      scan(path.join(relativePath, child));
    }
    return;
  }
  if (!absolutePath.endsWith(".js")) return;
  if (fs.readFileSync(absolutePath, "utf8").includes("freightLiftPrototype")) {
    productionReferences.push(relativePath.replaceAll("\\", "/"));
  }
}
productionRoots.forEach(scan);
assert.deepEqual(productionReferences, []);

console.log(JSON.stringify({
  pass: true,
  stops: 2,
  travelScreens: Number(
    (travelDistancePx / config.viewport.heightPx).toFixed(2),
  ),
  persistent: false,
  productionReferences: 0,
}));
