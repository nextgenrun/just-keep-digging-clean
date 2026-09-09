import assert from "node:assert/strict";
import { createUalNativePlayerAnimations } from "../player/UalNativePlayerAnimations.js";
import { UalMiningComboSelector } from "../player/UalMiningComboSelector.js";
import { resolveMovingSideDigAnimation } from "../player/UalMovingSideDigSelector.js";
import { PlayerRigContactSystem } from "../systems/visual/PlayerRigContactSystem.js";
import { MovingSideDigStandOffController } from "../player/MovingSideDigStandOffController.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from "../values/survivalUalPlayerAssetProfile.js";
import { COMPLEX_DIG_ANIMATIONS } from "../values/complexDigAnimations.js";
import { PLAYER_RIG_CONTACT_CONFIG } from "../values/playerRigContact.js";
import { resolveUalActionContact } from "../values/ualNativeActionTuning.js";
import { prewarmComplexDigSelection, resolveComplexDigSelection } from "../world/playScene/ComplexDigAnimationRuntime.js";

const registered = new Map();
createUalNativePlayerAnimations({
  anims: { exists: key => registered.has(key), create: spec => registered.set(spec.key, spec) },
  textures: { exists: () => true },
}, profile);
const legacyKeys = [...new Set(profile.digSidewaysHitAnims)];
assert.equal(legacyKeys.length, 2);
assert.deepEqual(profile.complexDigSideAnimationKeys, [
  ...COMPLEX_DIG_ANIMATIONS.sideSequence.map(id => COMPLEX_DIG_ANIMATIONS.clips[id].animationKey),
  ...legacyKeys,
]);
assert.notEqual(profile.quickslashAnim, profile.digSidewaysAnim);
assert.deepEqual(registered.get(profile.digSidewaysAnim).frames,
  profile.digSidewaysFrames.map(frame => ({ key: profile.digSidewaysSheet, frame })));
assert.equal(registered.get(profile.quickslashAnim).frames[0].key, profile.quickslashSheet);

const restoredAndMovingKeys = new Set(legacyKeys);
for (const directionX of [-1, 1]) {
  const aim = directionX < 0 ? "LEFT" : "RIGHT";
  const selection = resolveComplexDigSelection({ complexDigAnimationsEnabled: true },
    profile, "side", profile.digSidewaysHitAnims, profile.digSidewaysAnim);
  const warmed = [];
  const ownerScene = { playerDeferredAnimationAssetController: { ensureForAnimation: key => warmed.push(key) } };
  assert.equal(prewarmComplexDigSelection({ originScene: ownerScene }, selection), true);
  assert.ok(warmed.includes(COMPLEX_DIG_ANIMATIONS.clips.cross.animationKey));
  assert.ok(warmed.includes(profile.movingSideDigAnimationMap[profile.digSidewaysAnim]),
    "first moving legacy punch must be warmed by earlier SIDE swings");
  assert.equal(new Set(warmed).size, warmed.length, "do not duplicate pack requests");
  const selector = new UalMiningComboSelector();
  const cycle = Array.from({ length: selection.animationKeys.length + 1 }, (_, index) => selector.select({
    ...selection, direction: aim, targetTile: { tx: directionX, ty: 0 }, nowMs: index * 1500,
  }));
  assert.deepEqual(cycle, [...profile.complexDigSideAnimationKeys, profile.complexDigSideAnimationKeys[0]]);
  for (const animationKey of legacyKeys) {
    for (let phase = 0; phase < profile.movingSideDigConfig.phaseHandoff.runFrameCount; phase++) {
      const options = { profile, animationKey, aim, grounded: true,
        motionState: directionX < 0 ? "walk-left" : "walk-right", horizontalVelocity: directionX * 200,
        currentAnimationKey: profile.walkRunAnim, currentTextureFrame: phase, search: "" };
      const moving = resolveMovingSideDigAnimation(options);
      assert.equal(moving.movingSideDigActive, true);
      assert.equal(moving.targetDirectionX, directionX);
      assert.ok(registered.has(moving.animationKey), `unregistered moving phase ${moving.animationKey}`);
      restoredAndMovingKeys.add(moving.animationKey);
      const blocked = resolveMovingSideDigAnimation({ ...options, horizontalVelocity: 0 });
      assert.equal(blocked.animationKey, animationKey, "wall-blocked punch must keep planted feet");
      assert.equal(blocked.movingSideDigActive, false);
    }
  }
  // The real wall stand-off owner must hold the body under sustained input.
  const body = { x: directionX > 0 ? 70 : 100, y: 0,
    w: profile.playerBodyWidthPx, h: profile.playerBodyHeightPx, vx: directionX * 200 };
  const standOff = new MovingSideDigStandOffController(body, { isSolid: () => true }, 94,
    profile.movingSideDigConfig.movement.tileFaceStandOff);
  assert.equal(standOff.begin({ targetTile: { tx: directionX > 0 ? 1 : 0, ty: 0 }, directionX }), true);
  const plantedX = body.x;
  for (let frame = 0; frame < 120; frame++) {
    body.x += directionX * 3;
    body.vx = directionX * 200;
    standOff.update();
    assert.equal(body.x, plantedX);
    assert.equal(body.vx, 0);
  }
}

for (const animationKey of restoredAndMovingKeys) {
  const animation = registered.get(animationKey);
  assert.ok(animation, `${animationKey} must play independently of ability unlocks`);
  assert.equal(animation.repeat, 0);
  assert.ok(registered.has(profile.actionRecoveryAnimationByCompletedAnimation[animationKey]));
  const contact = resolveUalActionContact(profile, animationKey);
  assert.equal(contact.visualAlignmentEnabled, false, `${animationKey} must remain body-locked`);
  assert.deepEqual(profile.visualOriginBySheet[animation.frames[0].key], profile.unifiedAnimationRuntime.groundedOrigin);
  assert.ok((profile.displaySizePxByAnimation[animationKey] || profile.displaySizePx) > 0);
  for (const directionX of [-1, 1]) {
    // Start with a stale visual alignment offset from a previous action.
    const data = new Map([[PLAYER_RIG_CONTACT_CONFIG.visualOffsetDataKey, { x: 7, y: -3 }]]);
    const player = { x: 300, y: 420, flipX: directionX < 0,
      getData: key => data.get(key), setData: (key, value) => data.set(key, value) };
    const rig = new PlayerRigContactSystem({}, player, { _syncSpriteWithPhysics() {
      const offset = data.get(PLAYER_RIG_CONTACT_CONFIG.visualOffsetDataKey);
      player.x = 300 + (offset?.x || 0);
      player.y = 420 + (offset?.y || 0);
    } }, profile);
    assert.equal(rig.beginAction({ animationKey, contactSpec: contact,
      targetTile: { tx: directionX, ty: 0 }, direction: { x: directionX, y: 0 } }), true);
    for (const frame of animation.frames) {
      player.frame = { name: frame.frame };
      rig.update(1000 / animation.frameRate);
      assert.equal(data.get(PLAYER_RIG_CONTACT_CONFIG.visualOffsetDataKey), null);
      assert.deepEqual([player.x, player.y], [300, 420], `${animationKey} drifted at frame ${frame.frame}`);
    }
    rig.endAction();
    rig.update(1000);
    assert.deepEqual([player.x, player.y], [300, 420]);
  }
}
console.log("LEGACY_SIDE_PUNCH_CONTRACT_OK", {
  restoredPunches: legacyKeys.length, sideStages: profile.complexDigSideAnimationKeys.length,
  standingAndMovingClips: restoredAndMovingKeys.size, facings: 2, wallPressureFramesPerFacing: 120,
});
