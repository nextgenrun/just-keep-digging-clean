import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { MIXAMO_LEDGE_ASSIST_ANIMATION } from "../values/mixamoLedgeAssistAnimation.js";
import {
  PLAYER_TRAVERSAL_CONFIG,
  resolvePlayerLedgeAssistEnabled,
} from "../values/playerTraversal.js";
import { PlayerLedgeAssist } from "../player/PlayerLedgeAssist.js";

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
assert.equal(assist.getSnapshot().phase, "hang");
assert.deepEqual(assist.getSnapshot().support, { tx: 5, ty: 5 });
assert.equal(body.vx, 0);
assert.equal(body.vy, 0);

assist.updateActive(50, createInput({ jump: true }), { flightActive: false });
assert.equal(assist.getSnapshot().phase, "hang", "minimum hang window should be respected");
assist.updateActive(70, createInput(), { flightActive: false });
assert.equal(assist.getSnapshot().phase, "climb", "queued Space should start pull-up");
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
assert.equal(enabledProfile.ledgeClimbFrames.length, 35);

const sheet = await readFile(new URL(
  "../sprites/character/survival-character-blender-v2/runtime/survival-character-mixamo-v4-ledge-climb-sheet.png",
  import.meta.url,
));
assert.equal(
  createHash("sha256").update(sheet).digest("hex"),
  MIXAMO_LEDGE_ASSIST_ANIMATION.sheetSha256,
);

console.log("PLAYER_LEDGE_ASSIST_CONTRACT_OK");
