import assert from "node:assert/strict";
import fs from "node:fs";

import { WORLD_VISUAL_DEPTH_BACKDROPS } from "../values/worldVisualDepthBackdrops.js";
import { WORLD_VISUAL_DEPTH_CAMERA_MOTION } from
  "../values/worldVisualDepthCameraMotion.js";
import { WorldVisualDepthCameraMotion } from
  "../world/rendering/scenic-world/WorldVisualDepthCameraMotion.js";

const profiles = WORLD_VISUAL_DEPTH_CAMERA_MOTION.profiles;
const regionIds = WORLD_VISUAL_DEPTH_BACKDROPS.regions.map(region => region.id);
assert.deepEqual(new Set(Object.keys(profiles)), new Set(regionIds));
assert.equal(
  Object.values(profiles).filter(profile => profile.mode === "anchored").length,
  3,
  "amber, slagworks and foundry remain visually heavy and world-anchored"
);
assert.ok(Object.values(profiles).every(profile => (
  profile.maxOffsetXPx <= 10 && profile.maxOffsetYPx <= 10
)), "camera response stays below the restrained ten-pixel ceiling");

const scene = {
  config: { tileSize: 94 },
  cameras: {
    main: {
      scrollX: 0,
      scrollY: 65 * 94,
      width: 1280,
      height: 720,
    },
  },
};
const region = id => WORLD_VISUAL_DEPTH_BACKDROPS.regions.find(entry => entry.id === id);
const motion = new WorldVisualDepthCameraMotion(scene);

assert.deepEqual(
  motion.update(0, [region("surface-entry")]),
  { x: 0, y: 0, mode: "soft-lag", regionId: "surface-entry" }
);
scene.cameras.main.scrollX += 50;
scene.cameras.main.scrollY += 50;
const rootsOffset = motion.update(16, [region("surface-entry")]);
assert.ok(rootsOffset.x > 0 && rootsOffset.x <= profiles["surface-entry"].maxOffsetXPx);
assert.ok(rootsOffset.y > 0 && rootsOffset.y <= profiles["surface-entry"].maxOffsetYPx);

scene.cameras.main.scrollY = 520 * 94;
const amberOffset = motion.update(32, [region("level1-amber")]);
assert.deepEqual(
  amberOffset,
  { x: 0, y: 0, mode: "anchored", regionId: "level1-amber" },
  "anchored biomes do not drift relative to their heavy architecture"
);

scene.cameras.main.scrollY = 4465 * 94;
motion.update(48, [region("level2-starfire")]);
scene.cameras.main.scrollX += 50;
scene.cameras.main.scrollY += 50;
const starfireOffset = motion.update(64, [region("level2-starfire")]);
assert.ok(starfireOffset.x > rootsOffset.x);
assert.ok(starfireOffset.y > rootsOffset.y);
assert.ok(starfireOffset.x <= profiles["level2-starfire"].maxOffsetXPx);
assert.ok(starfireOffset.y <= profiles["level2-starfire"].maxOffsetYPx);

scene.cameras.main.scrollY += WORLD_VISUAL_DEPTH_CAMERA_MOTION.snapDeltaTiles * 94 + 1;
assert.deepEqual(
  motion.update(80, [region("level2-starfire")]),
  { x: 0, y: 0, mode: "cosmic-lag", regionId: "level2-starfire" },
  "teleports reset the media transform instead of visibly sliding the backdrop"
);

const disabled = new WorldVisualDepthCameraMotion(
  scene,
  WORLD_VISUAL_DEPTH_CAMERA_MOTION,
  false
);
disabled.update(0, [region("level2-starfire")]);
scene.cameras.main.scrollX += 100;
assert.deepEqual(
  disabled.update(16, [region("level2-starfire")]),
  { x: 0, y: 0, mode: "anchored", regionId: "level2-starfire" },
  "the existing motion rollback disables camera response too"
);

const root = new URL("../", import.meta.url);
const helperSource = fs.readFileSync(
  new URL("world/rendering/scenic-world/WorldVisualDepthCameraMotion.js", root),
  "utf8"
);
const viewSource = fs.readFileSync(
  new URL("world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js", root),
  "utf8"
);
const stageSource = fs.readFileSync(
  new URL("world/rendering/scenic-world/WorldVisualDepthBackdropStage.js", root),
  "utf8"
);
assert.match(
  viewSource,
  /setPositionIfChanged\(segment\.backwall/,
  "camera motion must update the baked backdrop through the exact-state helper"
);
assert.match(stageSource, /WorldVisualDepthCameraMotion/);
assert.doesNotMatch(
  `${helperSource}\n${viewSource}\n${stageSource}`,
  /add\.graphics|fillCircle|lineStyle|requestAnimationFrame|document\.|<canvas|tweens|segment\.emissive|segment\.mist|BlendModes/
);
assert.doesNotMatch(
  `${helperSource}\n${viewSource}\n${stageSource}`,
  /setTile|damageTile|digTile|createTilemap|WorldModel/
);

console.log("underground actual-background camera motion contract passed");
