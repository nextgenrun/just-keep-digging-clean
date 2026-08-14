import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { RETENTION_CONFIG } from "../values/retentionConfig.js";

const hud = RETENTION_CONFIG.hud;
const authoredWidthPx = 1024;
const authoredHeightPx = 256;
const expectedBadgeCenterSourceX = 160;
const expectedTextRightSourceX = 950;
const scale = hud.width / authoredWidthPx;

assert.equal(hud.width / hud.height, authoredWidthPx / authoredHeightPx);
assert.ok(
  Math.abs(hud.badgeX - expectedBadgeCenterSourceX * scale) <= 0.5,
  "Next Promise badge copy must remain centered in the authored medallion",
);
assert.ok(
  hud.paddingX + hud.textWidth <= expectedTextRightSourceX * scale + 0.5,
  "Next Promise copy must end before the authored right plaque border",
);
assert.equal(hud.bottom, 84, "Next Promise panel must retain its gap above the currency rail");

const [pillarSource, portsSource, pauseSource] = await Promise.all([
  "../systems/visual/StarPillarSystem.js",
  "../ui/scenes/PlayScenePorts.js",
  "../world/playScene/PlaySceneUI.js",
].map(path => readFile(new URL(path, import.meta.url), "utf8")));

for (const source of [pillarSource, portsSource, pauseSource]) {
  assert.doesNotMatch(source, /StarlightTalentTreeView|starlight-mockup-foundation-v4/);
}
assert.match(pillarSource, /createCelestialTalentTreeView/);
assert.match(portsSource, /CelestialTalentTreeView/);
assert.match(pauseSource, /createCelestialTalentTreeView/);

console.log("PASS active UI alignment: HUD sockets measured; only Celestial tree admitted");
