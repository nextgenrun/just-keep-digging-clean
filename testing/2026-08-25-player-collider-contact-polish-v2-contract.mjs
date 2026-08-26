import assert from "node:assert/strict";
import fs from "node:fs";
import { PlayerController } from "../player/PlayerController.js";
import { MovingSideDigStandOffController } from "../player/MovingSideDigStandOffController.js";
import { PlayerPhysicsBody } from "../player/PlayerPhysicsBody.js";
import {
  applyBodyCollisionProfile,
  captureBodyCollisionProfile,
} from "../systems/vehicles/arcCoreCollisionProfile.js";
import { runtimeAssetExists } from "../world/rendering/RuntimeAssetTextureRegistry.js";
import { RUNTIME_ASSET_LOADING } from "../values/runtimeAssetLoading.js";
import {
  PLAYER_COLLISION_POLISH_V2,
  resolvePlayerCollisionPolishV2Enabled,
} from "../values/playerCollision.js";

const config = {
  playerBodyWidthPx: 31,
  playerBodyHeightPx: 75,
  gravityY: 0,
  maxFallSpeedPxPerSec: 1000,
  walkSpeedPxPerSec: 200,
};
const unifiedProfile = {
  renderPipeline: PLAYER_COLLISION_POLISH_V2.requiredRenderPipeline,
};

assert.equal(resolvePlayerCollisionPolishV2Enabled(unifiedProfile, ""), true);
assert.equal(resolvePlayerCollisionPolishV2Enabled(unifiedProfile, "?colliderV2=0"), false);
assert.equal(resolvePlayerCollisionPolishV2Enabled({ renderPipeline: "legacy" }, ""), false);

const deferredSheetAsset = {
  key: "deferred-flight-sheet",
  frameConfig: { endFrame: 47 },
};
assert.equal(runtimeAssetExists({ textures: {
  exists: () => true,
  getFrame: (_key, frame) => frame === "0" ? { name: "0" } : { name: "__MISSING" },
} }, deferredSheetAsset, RUNTIME_ASSET_LOADING.types.spritesheet, RUNTIME_ASSET_LOADING), false);
assert.equal(runtimeAssetExists({ textures: {
  exists: () => true,
  getFrame: (_key, frame) => frame === "47" ? { name: "47" } : { name: "__MISSING" },
} }, deferredSheetAsset, RUNTIME_ASSET_LOADING.types.spritesheet, RUNTIME_ASSET_LOADING), true);

const body = new PlayerPhysicsBody(config, 100, 125);
const originalAnchor = body.getVisualAnchor();
for (const profileId of ["locomotion", "crouch", "flight", "airborne", "upright"]) {
  assert.equal(
    body.tryRectProfile(profileId, PLAYER_COLLISION_POLISH_V2.profiles[profileId], {
      isBodyOverlappingSolid: () => false,
    }),
    true,
  );
  assert.deepEqual(body.getVisualAnchor(), originalAnchor, `${profileId} shifted the visual anchor`);
}

body.forceRectProfile("crouch", PLAYER_COLLISION_POLISH_V2.profiles.crouch);
const crouchSnapshot = body.getCollisionProfileSnapshot();
assert.equal(
  body.tryRectProfile("upright", PLAYER_COLLISION_POLISH_V2.profiles.upright, {
    isBodyOverlappingSolid: (candidate) => candidate.h > 57,
  }),
  false,
  "standing into a solid ceiling must be rejected",
);
assert.deepEqual(body.getCollisionProfileSnapshot(), crouchSnapshot);

body.setPosition(100, 166);
body.forceRectProfile("flight", PLAYER_COLLISION_POLISH_V2.profiles.flight, {
  preserveVisualAnchor: false,
});
const flightBottom = body.y + body.h;
assert.equal(
  body.tryRectProfile("airborne", PLAYER_COLLISION_POLISH_V2.profiles.airborne, {
    isBodyOverlappingSolid: (candidate) => candidate.y + candidate.h > flightBottom,
  }, { allowBottomFallback: true }),
  true,
  "flight exit must recover against a floor without retaining the flight body",
);
assert.equal(body.y + body.h, flightBottom);

const controllerHarness = Object.create(PlayerController.prototype);
controllerHarness.collisionPolishV2Enabled = true;
controllerHarness.physicsBody = new PlayerPhysicsBody(config, 10, 10);
controllerHarness.physicsBody.forceRectProfile("crouch", PLAYER_COLLISION_POLISH_V2.profiles.crouch);
controllerHarness.state = {
  isFlightActive: () => false,
  isGrounded: () => true,
  getMotionState: () => "idle",
};
controllerHarness.input = { getVerticalAim: () => ({ up: false, down: false }) };
controllerHarness.collisionSystem = {
  isBodyOverlappingSolid: (candidate) => candidate.h > 57,
};
assert.equal(controllerHarness._updateCollisionPolishProfile(), false);
assert.equal(controllerHarness.requiresCrouchVisual(), true);
controllerHarness.collisionSystem.isBodyOverlappingSolid = () => false;
assert.equal(controllerHarness._updateCollisionPolishProfile(), true);
assert.equal(controllerHarness.physicsBody.collisionProfileId, "upright");
assert.equal(controllerHarness.requiresCrouchVisual(), false);

controllerHarness.physicsBody.forceRectProfile("flight", PLAYER_COLLISION_POLISH_V2.profiles.flight);
const savedRectProfile = captureBodyCollisionProfile(controllerHarness.physicsBody);
assert.equal(applyBodyCollisionProfile(controllerHarness.physicsBody, {
  kind: "circle",
  diameterPx: 60,
  radiusPx: 30,
}), true);
assert.equal(controllerHarness.physicsBody.collisionProfileId, "arc-core");
assert.equal(applyBodyCollisionProfile(controllerHarness.physicsBody, savedRectProfile), true);
assert.equal(controllerHarness.physicsBody.collisionProfileId, "flight");
assert.equal(
  controllerHarness.physicsBody.visualAnchorOffsetYPx,
  PLAYER_COLLISION_POLISH_V2.profiles.flight.visualAnchorOffsetYPx,
);

const standOffConfig = {
  enabled: true,
  distancePx: 21,
  epsilonPx: 0.01,
  releaseWhenTargetNotSolid: false,
  stopTowardVelocity: true,
  ...PLAYER_COLLISION_POLISH_V2.movingSideDigStandOff,
};
const standOffBody = new PlayerPhysicsBody(config, 80, 0);
const standOff = new MovingSideDigStandOffController(
  standOffBody,
  { isSolid: () => true },
  94,
  standOffConfig,
);
standOff.begin({ targetTile: { tx: 1, ty: 0 }, directionX: 1 });
const uprightCenterToFace = 94 - standOffBody.getCenterX();
standOff.end();
standOffBody.forceRectProfile("locomotion", PLAYER_COLLISION_POLISH_V2.profiles.locomotion);
standOffBody.x = 80;
standOff.begin({ targetTile: { tx: 1, ty: 0 }, directionX: 1 });
assert.equal(
  94 - standOffBody.getCenterX(),
  uprightCenterToFace,
  "a wider locomotion body must not move the approved attack/contact center",
);

const controllerSource = fs.readFileSync(new URL("../player/PlayerController.js", import.meta.url), "utf8");
const gameplaySource = fs.readFileSync(new URL("../world/playScene/PlaySceneGameplay.js", import.meta.url), "utf8");
assert.match(controllerSource, /_updateCollisionPolishProfile\(ledgeWasActive\)/);
assert.match(controllerSource, /allowBottomFallback: body\.collisionProfileId === "flight"/);
assert.match(controllerSource, /requiresCrouchVisual\(\)/);
assert.match(controllerSource, /const visualAnchor = this\.physicsBody\.getVisualAnchor/);
assert.match(gameplaySource, /forcedCrouchVisual/);

console.log("PLAYER_COLLIDER_CONTACT_POLISH_V2_CONTRACT_OK", {
  profiles: Object.keys(PLAYER_COLLISION_POLISH_V2.profiles),
  rollback: `?${PLAYER_COLLISION_POLISH_V2.queryParam}=0`,
});
