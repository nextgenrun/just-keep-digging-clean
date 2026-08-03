import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TileDestructionFxSystem } from "../systems/visual/TileDestructionFxSystem.js";
import { FIRST_FIVE_MINUTES_CONFIG } from "../values/firstFiveMinutes.js";
import {
  TILE_DESTRUCTION_FX_CONFIG,
  getTileDestructionFxPreloadAssets,
  resolveTileDestructionFamily,
  resolveTileDestructionFxEnabled,
} from "../values/tileDestructionFx.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath));
const readText = relativePath => read(relativePath).toString("utf8");
const digest = contents => crypto.createHash("sha256").update(contents).digest("hex");

function pngSize(relativePath) {
  const bytes = read(relativePath);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

assert.equal(resolveTileDestructionFxEnabled(""), true);
for (const value of ["0", "false", "off", "legacy"]) {
  assert.equal(resolveTileDestructionFxEnabled(`?authoredMineImpact=${value}`), false);
}
assert.equal(resolveTileDestructionFxEnabled("?authoredMineImpact=1"), true);
assert.deepEqual(getTileDestructionFxPreloadAssets(), [
  {
    key: TILE_DESTRUCTION_FX_CONFIG.assets.core.key,
    path: TILE_DESTRUCTION_FX_CONFIG.assets.core.path,
  },
  {
    key: TILE_DESTRUCTION_FX_CONFIG.assets.shards.key,
    path: TILE_DESTRUCTION_FX_CONFIG.assets.shards.path,
  },
]);

const expectedFamilies = new Map([
  [TILE_TYPES.DIRT, "dirt"],
  [TILE_TYPES.STONE, "hard"],
  [TILE_TYPES.COPPER, "copper"],
  [TILE_TYPES.DARK_DIRT_NORMAL, "damp"],
  [TILE_TYPES.DARK_DIRT_STRONG, "damp"],
  [TILE_TYPES.BRONZE, "bronze"],
  [TILE_TYPES.STEEL, "steel"],
  [TILE_TYPES.IRON, "iron"],
  [TILE_TYPES.SILVER, "silver"],
  [TILE_TYPES.GOLD, "gold"],
  [TILE_TYPES.SKY_TILE, "crystal"],
  [TILE_TYPES.GEODE_INTERIOR, "geode"],
  [TILE_TYPES.LAVA_DIRT, "lava"],
  [TILE_TYPES.OBSIDIAN, "obsidian"],
  [TILE_TYPES.EMBER_ORE, "ember"],
  [TILE_TYPES.MAGMA_CRYSTAL, "magma"],
  [TILE_TYPES.ANCIENT_RELIC_CACHE, "relic"],
]);
for (const [tileType, family] of expectedFamilies) {
  assert.equal(resolveTileDestructionFamily(tileType), family);
}
for (const special of [
  TILE_TYPES.TELEPORT_TILE,
  TILE_TYPES.GAMBLE_TILE,
  TILE_TYPES.GEM_POWER_BLOCK,
  TILE_TYPES.SPEED_BLOCK,
  TILE_TYPES.XP_BLOCK,
  TILE_TYPES.CRIT_BLOCK,
  TILE_TYPES.BERSERK_BLOCK,
  TILE_TYPES.COMBO_BLOCK,
  TILE_TYPES.LEGEND_BLOCK,
]) {
  assert.equal(resolveTileDestructionFamily(special), "special");
}

assert.deepEqual(pngSize(TILE_DESTRUCTION_FX_CONFIG.assets.core.path), [1024, 3536]);
assert.deepEqual(pngSize(TILE_DESTRUCTION_FX_CONFIG.assets.shards.path), [400, 1360]);
const provenance = JSON.parse(readText("sprites/fx/tile-destruction-fx-v3/provenance.json"));
assert.equal(provenance.damageStateAssetsChanged, false);
assert.equal(provenance.families.length, 17);
assert.equal(provenance.runtime.core.sha256, digest(read(TILE_DESTRUCTION_FX_CONFIG.assets.core.path)));
assert.equal(provenance.runtime.shards.sha256, digest(read(TILE_DESTRUCTION_FX_CONFIG.assets.shards.path)));

const library = JSON.parse(readText(
  "visual-approval-previews/2026-07-29-high-impact-review-library-v2/manifest.json",
));
const sourceRecords = new Map(library.sources.map(record => [record.id, record]));
for (const selected of provenance.selectedSources) {
  const record = sourceRecords.get(selected.id);
  assert.ok(record, `${selected.id} must remain in the source library`);
  assert.equal(record.approvalStatus, "pending");
  assert.deepEqual(record.masterSpaceQa.warnings, []);
  assert.deepEqual(record.qa.warnings, []);
  assert.equal(record.sha256, selected.sha256);
}

const textureFrames = { core: new Set(), shards: new Set() };
function textureStore(target) {
  return {
    has: name => target.has(name),
    add(name) {
      target.add(name);
    },
  };
}
const images = [];
const timers = [];
const tweens = [];
const scene = {
  config: { tileSize: 94 },
  player: { x: 200, y: 94 },
  textures: {
    exists: () => true,
    get(key) {
      return key === TILE_DESTRUCTION_FX_CONFIG.assets.core.key
        ? textureStore(textureFrames.core)
        : textureStore(textureFrames.shards);
    },
  },
  add: {
    image(x, y, key, frame) {
      const image = {
        x,
        y,
        key,
        frame,
        frames: [frame],
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        active: true,
        setOrigin() { return this; },
        setDepth(value) { this.depth = value; return this; },
        setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
        setTint(value) { this.tint = value; return this; },
        setFlipX(value) { this.flipX = value; return this; },
        setAlpha(value) { this.alpha = value; return this; },
        setScale(xScale, yScale = xScale) { this.scaleX = xScale; this.scaleY = yScale; return this; },
        setRotation(value) { this.rotation = value; return this; },
        setFrame(value) { this.frame = value; this.frames.push(value); return this; },
        destroy() { this.active = false; },
      };
      images.push(image);
      return image;
    },
  },
  time: {
    delayedCall(delay, callback) {
      const timer = { delay, callback, remove() {} };
      timers.push(timer);
      return timer;
    },
  },
  tweens: {
    add(config) {
      const tween = { config, stop() {}, remove() {} };
      tweens.push(tween);
      return tween;
    },
  },
};

const system = new TileDestructionFxSystem(scene);
assert.equal(system.ready, true);
assert.equal(textureFrames.core.size, 17 * 4);
assert.equal(textureFrames.shards.size, 17 * 5);
assert.equal(system.play({ worldX: 94, worldY: 94, tileType: TILE_TYPES.COPPER }), true);
const core = images[0];
assert.equal(core.frame, "copper-p01");
assert.equal(core.flipX, true, "core must mirror toward a player standing to the right");

for (const timer of [...timers].sort((a, b) => a.delay - b.delay)) {
  if (timer.delay <= TILE_DESTRUCTION_FX_CONFIG.core.phaseTimesMs[2]) timer.callback();
}
assert.ok(core.frames.includes("copper-p02"));
assert.ok(core.frames.includes("copper-p03"));
const shards = images.slice(1);
assert.equal(shards.length, TILE_DESTRUCTION_FX_CONFIG.shards.count);
assert.deepEqual(shards.map(shard => shard.frame), [
  "copper-s01",
  "copper-s02",
  "copper-s03",
  "copper-s04",
  "copper-s05",
]);
assert.ok(shards.every(shard => shard.flipX === true));

const shardLaunches = tweens.filter(tween => shards.includes(tween.config.targets));
assert.equal(shardLaunches.length, shards.length);
for (const launch of shardLaunches) {
  assert.ok(launch.config.x > launch.config.targets.x, "fragments must launch toward the player");
  launch.config.onComplete();
}
const foregroundTweens = tweens.slice(-shards.length);
for (let index = 0; index < shards.length; index += 1) {
  assert.ok(
    foregroundTweens[index].config.scaleX > shardLaunches[index].config.scaleX,
    "foreground fragments must grow as they approach the camera/player plane",
  );
}
system.destroy();
assert.ok(images.every(image => image.active === false));

assert.equal(FIRST_FIVE_MINUTES_CONFIG.digSite.tileX, 12);
assert.equal("payoffSite" in FIRST_FIVE_MINUTES_CONFIG, false);

const gameplay = readText("world/playScene/PlaySceneGameplay.js");
const boot = readText("ui/scenes/BootScene.js");
const damageValues = readText("values/worldVisualDamage.js");
assert.match(gameplay, /tileDestructionFxSystem\?\.play/);
assert.doesNotMatch(gameplay, /EARTHQUAKE_FEEDBACK_CONFIG\.assets\.impactDebris/);
assert.match(boot, /getTileDestructionFxPreloadAssets/);
assert.doesNotMatch(damageValues, /tile-destruction-fx-v3/);

console.log("Tile destruction FX v3 contract passed.");
