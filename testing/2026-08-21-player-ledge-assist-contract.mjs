import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { MIXAMO_LEDGE_ASSIST_ANIMATION } from "../values/mixamoLedgeAssistAnimation.js";
import {
  PLAYER_TRAVERSAL_CONFIG,
  resolvePlayerLedgeAssistEnabled,
} from "../values/playerTraversal.js";
import { PlayerLedgeAssist } from "../player/PlayerLedgeAssist.js";
import { PlayerDeferredAnimationAssetController } from
  "../player/PlayerDeferredAnimationAssetController.js";
import { createUalNativePlayerAnimations } from "../player/UalNativePlayerAnimations.js";

const TILE_SIZE = 94;

class BodyStub {
  constructor() {
    this.x = 430;
    this.y = 440;
    this.w = 31;
    this.h = 75;
    this.vx = 80;
    this.vy = 60;
    this.onGround = false;
  }
  setPosition(x, y) { this.x = x; this.y = y; }
  resetVelocity() { this.vx = 0; this.vy = 0; }
}

function createWorld(extraSolid = []) {
  const solid = new Set(["5,5", ...extraSolid]);
  return {
    isSolid(tx, ty) { return solid.has(`${tx},${ty}`); },
  };
}

function createCollision(world) {
  return {
    config: { topAirRows: 5 },
    isBodyOverlappingSolid(body) {
      const left = Math.floor((body.x + 0.01) / TILE_SIZE);
      const right = Math.floor((body.x + body.w - 0.01) / TILE_SIZE);
      const top = Math.floor((body.y + 0.01) / TILE_SIZE);
      const bottom = Math.floor((body.y + body.h - 0.01) / TILE_SIZE);
      for (let ty = top; ty <= bottom; ty += 1) {
        for (let tx = left; tx <= right; tx += 1) {
          if (world.isSolid(tx, ty)) return true;
        }
      }
      return false;
    },
  };
}

function createInput({ jump = false, up = false, down = false, left = false, right = true } = {}) {
  let jumpQueued = jump;
  return {
    getHorizontalMovement: () => ({ left, right }),
    getVerticalAim: () => ({ up, down }),
    isUp: () => up,
    consumeJumpInput: () => {
      const value = jumpQueued;
      jumpQueued = false;
      return value;
    },
  };
}

function createAssist({ world = createWorld(), body = new BodyStub() } = {}) {
  return {
    body,
    assist: new PlayerLedgeAssist(
      body,
      world,
      createCollision(world),
      TILE_SIZE,
    ),
  };
}

delete globalThis.location;
const { body, assist } = createAssist();
assert.equal(assist.tryGrab({
  input: createInput(),
  grounded: false,
  flightActive: false,
  facingRight: true,
  actionLocked: false,
}), true, "descending player should catch the reachable right ledge");
assert.equal(assist.getSnapshot().phase, "catch");
assert.deepEqual(assist.getSnapshot().support, { tx: 5, ty: 5 });
assert.equal(body.vx, 0);
assert.equal(body.vy, 0);
const initialCatchOffset = assist.getVisualState().offset;
const initialCatchDistance = Math.hypot(initialCatchOffset.x, initialCatchOffset.y);
assert.ok(
  initialCatchDistance > 0,
  "catch should retain the pre-grab visual position",
);

assist.updateActive(50, createInput({ jump: true }), { flightActive: false });
assert.equal(assist.getSnapshot().phase, "catch", "catch animation should finish before pull-up");
const easedCatchOffset = assist.getVisualState().offset;
assert.ok(Math.hypot(easedCatchOffset.x, easedCatchOffset.y) < initialCatchDistance);
assist.updateActive(
  PLAYER_TRAVERSAL_CONFIG.ledgeAssist.catch.durationMs - 50,
  createInput(),
  { flightActive: false },
);
assert.equal(assist.getSnapshot().phase, "climb", "queued Space should start after grip settle");
for (let elapsed = 0; elapsed < PLAYER_TRAVERSAL_CONFIG.ledgeAssist.climb.durationMs + 60; elapsed += 16.67) {
  assist.updateActive(16.67, createInput(), { flightActive: false });
}
assert.equal(assist.isActive(), false, "pull-up should complete");
assert.equal(body.onGround, true, "completion should place the body on the top surface");
assert.ok(Math.abs(body.x - 501.5) < 0.001);
assert.ok(Math.abs(body.y - 395) < 0.001);

const dropCase = createAssist();
assert.equal(dropCase.assist.tryGrab({
  input: createInput(), grounded: false, flightActive: false, facingRight: true, actionLocked: false,
}), true);
assert.equal(
  dropCase.assist.updateActive(16.67, createInput({ down: true }), { flightActive: false }),
  "released",
);
assert.equal(dropCase.assist.isActive(), false);
assert.ok(dropCase.body.vy > 0);
assert.ok(dropCase.assist.getSnapshot().cooldownMs > 0);

// Only the configured top-surface candidate is excluded during its drop.
const surfaceDropCase = createAssist();
surfaceDropCase.body.surfaceDropThroughRow = 5;
const grabOptions = {
  input: createInput(), grounded: false, flightActive: false, facingRight: true, actionLocked: false,
};
assert.equal(surfaceDropCase.assist.tryGrab(grabOptions), false,
  "the active top-surface drop must not grab that same surface");
surfaceDropCase.body.surfaceDropThroughRow = null;
assert.equal(surfaceDropCase.assist.tryGrab(grabOptions), true,
  "the same surface retains its ordinary ledge trigger after the drop clears");
for (const ledgeRow of [4, 6]) {
  const otherBody = new BodyStub();
  otherBody.y += (ledgeRow - 5) * TILE_SIZE;
  otherBody.surfaceDropThroughRow = 5;
  const other = createAssist({
    body: otherBody,
    world: { isSolid: (tx, ty) => tx === 5 && ty === ledgeRow },
  });
  assert.equal(other.assist.tryGrab(grabOptions), true,
    "a top-surface drop must not suppress ledges at other heights");
  assert.deepEqual(other.assist.getSnapshot().support, { tx: 5, ty: ledgeRow });
}

const blocked = createAssist({ world: createWorld(["5,4"]) });
assert.equal(blocked.assist.tryGrab({
  input: createInput(), grounded: false, flightActive: false, facingRight: true, actionLocked: false,
}), false, "occupied lip must not be grabbed");

const flying = createAssist();
assert.equal(flying.assist.tryGrab({
  input: createInput(), grounded: false, flightActive: true, facingRight: true, actionLocked: false,
}), false, "Flight must remain authoritative");

assert.equal(resolvePlayerLedgeAssistEnabled("?ledgeAssist=0"), false);
assert.equal(resolvePlayerLedgeAssistEnabled("?ledgeAssist=false"), false);
assert.equal(resolvePlayerLedgeAssistEnabled("?ledgeAssist=off"), false);
assert.equal(resolvePlayerLedgeAssistEnabled("?ledgeAssist=1"), true);

globalThis.location = { search: "?ledgeAssist=0" };
const rollbackProfile = (await import("../values/survivalUalPlayerAssetProfile.js?ledge-contract-rollback")).SURVIVAL_UAL_PLAYER_ASSET_PROFILE;
assert.equal(rollbackProfile.ledgeAssistEnabled, false);
assert.equal(rollbackProfile.requiredSheets.includes(MIXAMO_LEDGE_ASSIST_ANIMATION.sheet.key), false);
assert.equal(rollbackProfile.sheetFiles.some(([property]) => property === "ledgeClimbSheet"), false);

globalThis.location = { search: "" };
const enabledProfile = (await import("../values/survivalUalPlayerAssetProfile.js?ledge-contract-enabled")).SURVIVAL_UAL_PLAYER_ASSET_PROFILE;
assert.equal(enabledProfile.ledgeAssistEnabled, true);
assert.equal(enabledProfile.requiredSheets.includes(MIXAMO_LEDGE_ASSIST_ANIMATION.sheet.key), true);
assert.deepEqual(enabledProfile.ledgeCatchFrames, [5, 4, 3, 2, 1, 0]);
assert.equal(enabledProfile.ledgeCatchAnim, MIXAMO_LEDGE_ASSIST_ANIMATION.animations.catch);
assert.equal(enabledProfile.ledgeClimbFrames.length, 35);
assert.equal(
  PLAYER_TRAVERSAL_CONFIG.ledgeAssist.catch.durationMs,
  MIXAMO_LEDGE_ASSIST_ANIMATION.sheet.catchFrames.length
    / MIXAMO_LEDGE_ASSIST_ANIMATION.sheet.frameRate * 1000,
);

const createdAnimations = [];
createUalNativePlayerAnimations({
  anims: {
    exists: () => false,
    create: (animation) => createdAnimations.push(animation),
  },
  textures: {
    exists: () => true,
    get: () => ({ setFilter() {} }),
  },
}, enabledProfile);
const catchAnimation = createdAnimations.find(
  (animation) => animation.key === enabledProfile.ledgeCatchAnim,
);
assert.deepEqual(catchAnimation.frames.map(({ frame }) => frame), [5, 4, 3, 2, 1, 0]);
assert.equal(catchAnimation.repeat, 0);

const deferredController = new PlayerDeferredAnimationAssetController({}, enabledProfile);
assert.deepEqual(
  deferredController.keysByPack.get("ledge-climb")?.filter((key) => [
    enabledProfile.ledgeCatchAnim,
    enabledProfile.ledgeHangAnim,
    enabledProfile.ledgeClimbAnim,
  ].includes(key)),
  [
    enabledProfile.ledgeCatchAnim,
    enabledProfile.ledgeHangAnim,
    enabledProfile.ledgeClimbAnim,
  ],
);

const [mainWorldSource, caveSource, controllerSource] = await Promise.all([
  readFile(new URL("../world/playScene/PlaySceneGameplay.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/CaveLocomotionAnimationRuntime.js", import.meta.url), "utf8"),
  readFile(new URL("../player/PlayerController.js", import.meta.url), "utf8"),
]);
assert.match(mainWorldSource, /ledgeVisual\.phase === "catch"/);
assert.match(caveSource, /ledgeVisual\.phase === "catch"/);
assert.match(mainWorldSource, /ensureForAnimation\?\.\(profile\.ledgeCatchAnim\)/);
assert.match(caveSource, /ensureForAnimation\?\.\(profile\.ledgeCatchAnim\)/);
assert.match(controllerSource, /const ledgeOffset = this\.ledgeAssist/);

const sheet = await readFile(new URL(
  "../sprites/character/survival-character-blender-v2/runtime/survival-character-mixamo-v4-ledge-climb-sheet.png",
  import.meta.url,
));
assert.equal(
  createHash("sha256").update(sheet).digest("hex"),
  MIXAMO_LEDGE_ASSIST_ANIMATION.sheetSha256,
);

console.log("PLAYER_LEDGE_ASSIST_CONTRACT_OK");
