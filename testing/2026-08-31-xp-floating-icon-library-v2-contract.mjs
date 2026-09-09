import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { basename } from "node:path";
import { readFile } from "node:fs/promises";

import {
  resolveXpFlightPose,
  resolveXpGatheringIconId,
  resolveXpGatheringVariation,
} from "../systems/visual/XPGatheringFxMath.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { XP_GATHERING_CONFIG } from "../values/xpGathering.js";

const manifest = JSON.parse(await readFile(
  new URL("../sprites/UI/xp-gathering-v2/xp-glyph-library-v2-manifest.json", import.meta.url),
  "utf8",
));
const expectedIds = Object.keys(XP_GATHERING_CONFIG.assetPaths);
const manifestById = new Map(manifest.outputs.map(output => [output.id, output]));

assert.equal(expectedIds.length, 12);
assert.equal(manifest.outputs.length, 12);
assert.deepEqual(new Set(Object.keys(ASSET_KEYS.ui.xpGathering)), new Set(expectedIds));
assert.deepEqual(new Set(manifestById.keys()), new Set([
  "routineCore", "routineFacet", "routineCompass", "routineKite",
  "clusterTwin", "clusterOrbit", "clusterTriad",
  "specialCore", "specialRune", "specialLegend", "levelCore", "levelCrown",
]));

const hashes = new Set();
let decodedBytes = 0;
for (const id of expectedIds) {
  const configPath = XP_GATHERING_CONFIG.assetPaths[id];
  const manifestId = id === "routine" ? "routineCore"
    : id === "special" ? "specialCore"
      : id === "levelUp" ? "levelCore" : id;
  const output = manifestById.get(manifestId);
  assert.ok(output, `missing manifest output for ${id}`);
  assert.equal(basename(configPath), output.file);
  const png = await readFile(new URL(`../${configPath}`, import.meta.url));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 256, `${id} width`);
  assert.equal(png.readUInt32BE(20), 256, `${id} height`);
  assert.equal(png[25], 6, `${id} must be RGBA`);
  const hash = createHash("sha256").update(png).digest("hex");
  assert.equal(hash, output.sha256);
  assert.ok(!hashes.has(hash), `${id} must be visually distinct`);
  hashes.add(hash);
  assert.ok(output.alphaCoverage >= 0.08 && output.alphaCoverage <= 0.78);
  decodedBytes += 256 * 256 * 4;
}
assert.ok(decodedBytes <= 4 * 1024 * 1024);

const variationCases = [
  ["routine", [{ xpGained: 18, resourceType: "copper" }]],
  ["cluster", [{ xpGained: 18 }, { xpGained: 32 }]],
  ["surge", [{ xpGained: XP_GATHERING_CONFIG.pickup.surgeThresholdXp }]],
  ["star", [{ xpGained: 48, skyTileRarity: 4 }]],
  ["special", [{ xpGained: 42, specialBlockEffect: "levelProgress" }]],
  ["legend", [{ xpGained: 42, specialBlockEffect: "legendLevelProgress" }]],
  ["levelUp", [{ xpGained: 42, levelUp: true, specialBlockEffect: "legendLevelUp" }]],
];
for (const [expected, entries] of variationCases) {
  assert.equal(resolveXpGatheringVariation(entries), expected);
  const profile = XP_GATHERING_CONFIG.pickup.variations[expected];
  const library = XP_GATHERING_CONFIG.iconLibraries[profile.iconLibrary];
  const selectSequence = () => {
    const recent = [];
    const selected = [];
    for (let sequence = 0; sequence < 48; sequence += 1) {
      const id = resolveXpGatheringIconId(expected, entries, sequence % 3, sequence, recent);
      assert.ok(library.includes(id));
      assert.ok(!recent.includes(id), `${expected} immediately repeated ${id}`);
      selected.push(id);
      recent.push(id);
      if (recent.length > XP_GATHERING_CONFIG.iconSelection.recentWindow) recent.shift();
    }
    return selected;
  };
  const first = selectSequence();
  assert.deepEqual(selectSequence(), first, `${expected} selection must be deterministic`);
  assert.deepEqual(new Set(first), new Set(library), `${expected} library must be reachable`);
}

const plan = {
  rotationRadians: 0.18,
  sample(t) {
    return {
      x: 120 + t * 520,
      y: 470 - t * 300 - Math.sin(Math.PI * t) * 72,
    };
  },
};
for (const [id, profile] of Object.entries(XP_GATHERING_CONFIG.pickup.flightProfiles)) {
  const start = resolveXpFlightPose(plan, 0, profile, 1);
  const end = resolveXpFlightPose(plan, 1, profile, 1);
  assert.deepEqual(start, { ...plan.sample(0), scaleX: 1, scaleY: 1, rotation: 0 });
  assert.ok(Math.abs(end.x - plan.sample(1).x) < 1e-9);
  assert.ok(Math.abs(end.y - plan.sample(1).y) < 1e-9);
  assert.ok(Math.abs(end.scaleX - 1) < 1e-9);
  assert.ok(Math.abs(end.scaleY - 1) < 1e-9);
  const middle = resolveXpFlightPose(plan, 0.53, profile, 1);
  const base = plan.sample(0.53);
  assert.ok(Math.hypot(middle.x - base.x, middle.y - base.y) > 0.1, `${id} must feel alive`);
  for (let frame = 0; frame <= 60; frame += 1) {
    const pose = resolveXpFlightPose(plan, frame / 60, profile, 2);
    assert.ok(pose.scaleX >= 0.88 && pose.scaleX <= 1.12, `${id} scaleX bound`);
    assert.ok(pose.scaleY >= 0.88 && pose.scaleY <= 1.12, `${id} scaleY bound`);
    assert.ok(Number.isFinite(pose.rotation));
  }
  const reduced = resolveXpFlightPose(plan, 0.53, profile, 1, true);
  assert.equal(reduced.x, base.x);
  assert.equal(reduced.y, base.y);
  assert.equal(reduced.scaleX, 1);
  assert.equal(reduced.scaleY, 1);
}

const [systemSource, flightSource, bootSource, barSource] = await Promise.all([
  readFile(new URL("../systems/visual/XPGatheringFxSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/XPGatheringFlightView.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/hud/XPProgressBar.js", import.meta.url), "utf8"),
]);
assert.ok(systemSource.split(/\r?\n/).length <= 300);
assert.ok(flightSource.split(/\r?\n/).length <= 300);
assert.match(systemSource, /resolveXpGatheringIconId/);
assert.match(systemSource, /const target = this\.targetProvider\?\.getGatheringTarget/);
assert.match(systemSource, /lastIconIds/);
assert.match(flightSource, /popEndScale \+ \(endScale - pickup\.popEndScale\) \* state\.t/);
assert.match(flightSource, /_emitDueTrails/);
assert.match(flightSource, /_emitDueEchoes/);
assert.match(flightSource, /reducedMotion\.mediaQuery/);
assert.match(bootSource, /Object\.entries\(XP_GATHERING_CONFIG\.assetPaths\)/);
assert.match(barSource, /getResolvedSegmentIndex/);
assert.match(barSource, /segmentIndex: index/);
assert.doesNotMatch(systemSource + flightSource, /gainXP\(|currentXP\s*=/);

console.log(
  `XP_FLOATING_ICON_LIBRARY_V2_OK icons=${expectedIds.length} decodedMiB=${(
    decodedBytes / 1024 / 1024
  ).toFixed(2)} variations=${variationCases.length}`,
);
