import assert from "node:assert/strict";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";
import { updateCaveLocomotionVisual } from "../world/playScene/CaveLocomotionAnimationRuntime.js";
import { UalActionRecoverySelector } from "../systems/visual/UalActionRecoverySelector.js";
import { resolveUalMiningRecoveryHoldUntilMs } from "../player/ualMiningActionCadence.js";
import { PLAYER_ASSET_PROFILES } from "../values/playerAssetProfiles.js";
import { MINING_CONFIG } from "../values/miningConfig.js";

const profile = PLAYER_ASSET_PROFILES.survivalUal;
const methods = {};
setupGameplayMethods(methods);
function fixture(animationKey) {
  const recovery = new UalActionRecoverySelector(profile, "");
  const scene = Object.create(methods);
  const controller = {
    physicsBody: { vx:0,vy:0 }, abilities: { isFlying:()=>false },
    isGrounded:()=>true, getMotionState:()=>"idle", isFacingRight:()=>true,
    getAimLabel:()=>"DOWN", getVerticalAim:()=>({up:false,down:true}),
    requiresCrouchVisual:()=>true,
  };
  const player = {
    angle:0,flipX:false,starts:[],
    anims: { currentAnim:{key:animationKey},currentFrame:{textureFrame:99},isPlaying:false,timeScale:1 },
    setAngle(value) { this.angle=value; },
    setFlipX(value) { this.flipX=value; },
    setDisplaySize() {},
    play(key,ignoreIfPlaying=false) {
      if(ignoreIfPlaying && this.anims.isPlaying && this.anims.currentAnim.key===key)return;
      this.starts.push(key);
      this.anims.currentAnim={key}; this.anims.currentFrame={textureFrame:0}; this.anims.isPlaying=true;
    },
  };
  const digSystem = { lastMineTime:0,getEffectiveCooldownMs:()=>MINING_CONFIG.mineCooldownMs };
  const holdUntilMs = resolveUalMiningRecoveryHoldUntilMs({digSystem});
  assert.equal(recovery.begin(animationKey,false,{holdUntilMs,holdCompletedAnimation:true}),true);
  Object.assign(scene,{
    player,playerController:controller,playerAssetProfile:profile,config:{playerDisplaySizePx:103},
    game:{loop:{delta:1000/60}},time:{now:800},
    playerDeferredAnimationAssetController:{resolveOrRequest:key=>key},
    anims:{exists:()=>true},
    playerMotionPolish:{
      resolveOverride:context=>recovery.resolve({
        nowMs:context.now,currentAnimationKey:context.currentAnimationKey,isPlaying:context.isPlaying,
        moving:context.motionState!=="idle" || !context.grounded,
      }),
    },
  });
  const runtime = {
    controller:{scene,playerController:controller,_actionUntilMs:0,_applyPlayerDisplaySize(){}},
    thunderStrikeRuntime:{isAnimating:false},actionRecovery:recovery,
  };
  return {scene,controller,player,runtime,holdUntilMs};
}

for(const animationKey of profile.digDownHitAnims) {
  for(const owner of ["main","cave"]) {
    const f=fixture(animationKey);
    const update=now=>{
      f.scene.time.now=now;
      if(owner==="main")f.scene.updatePlayerVisualState(true);
      else updateCaveLocomotionVisual(f.runtime,now,1000/60);
    };
    for(const now of [800,1000,1499,1500,f.holdUntilMs-1]) {
      update(now);
      assert.equal(f.player.anims.currentAnim.key,animationKey,
        owner+" must preserve downward cooldown pose over held-S crouch");
      assert.equal(f.player.anims.currentFrame.textureFrame,99,"Preserve the exact completed frame");
      assert.equal(f.player.anims.isPlaying,false,"Do not replay the one-shot during cooldown");
      assert.equal(f.player.starts.length,0);
    }
    update(f.holdUntilMs);
    assert.equal(f.player.anims.currentAnim.key,profile.crouchEnterAnim,
      "Holding S without another legal strike returns to authored crouch entry");
    f.controller.requiresCrouchVisual=()=>false;
    f.controller.getVerticalAim=()=>({up:false,down:false});
    update(f.holdUntilMs+20);
    assert.equal(f.player.anims.currentAnim.key,profile.crouchExitAnim,
      "Releasing S still exits crouch normally");
  }
}
console.log("DOWNWARD_MINING_HOLD_CONTRACT_OK", {
  scenes:2,variants:profile.digDownHitAnims.length,cooldownMs:MINING_CONFIG.mineCooldownMs,
  heldFrame:true,expiry:true,crouchRelease:true,
});
