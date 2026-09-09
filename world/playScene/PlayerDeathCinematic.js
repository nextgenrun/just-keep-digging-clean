import { APPROVED_ASSET_POLISH } from "../../values/approvedAssetPolish.js";
import { resolvePlayerDisplaySizePx, resolvePlayerVisualOrigin } from
  "../../values/playerAssetProfiles.js?rev=20260821-moving-complex-dig-v1";

/** Plays the authored collapse before revealing the recap; never owns death or saves. */
export function startPlayerDeathCinematic(scene, reveal) {
  const player = scene.player;
  const profile = scene.playerAssetProfile;
  if (!player?.play || !profile?.deathAnim || !scene.time?.delayedCall) return false;
  const cfg = APPROVED_ASSET_POLISH.death;
  let finished = false;
  let loadTimer = null;
  let animationTimer = null;
  let holdTimer = null;
  let fallTween = null;
  const event = `animationcomplete-${profile.deathAnim}`;
  const cleanup = () => {
    clearTimeout(loadTimer);
    animationTimer?.remove?.(false);
    holdTimer?.remove?.(false);
    fallTween?.stop?.();
    player.off?.(event, collapsed);
    scene.events?.off?.("shutdown", cancel);
  };
  const cancel = () => { finished = true; cleanup(); };
  const complete = () => {
    if (finished) return;
    finished = true;
    cleanup();
    reveal();
  };
  const collapsed = () => {
    if (finished || holdTimer) return;
    animationTimer?.remove?.(false);
    holdTimer = scene.time.delayedCall(cfg.finalPoseHoldMs, complete);
  };
  scene.events?.once?.("shutdown", cancel);
  const play = () => {
    if (finished) return;
    clearTimeout(loadTimer);
    if (!scene.anims?.exists?.(profile.deathAnim) || player.active === false) {
      holdTimer = scene.time.delayedCall(cfg.fallbackHoldMs, complete);
      return;
    }
    player.once?.(event, collapsed);
    const size = resolvePlayerDisplaySizePx(profile, scene.config.playerDisplaySizePx, profile.deathAnim);
    const origin = resolvePlayerVisualOrigin(profile, profile.deathAnim, profile.deathSheet);
    player.play(profile.deathAnim, false);
    player.setDisplaySize(size, size).setOrigin(origin.x, origin.y).setAngle(0);
    player.anims.timeScale = 1;
    const duration = scene.anims.get?.(profile.deathAnim)?.duration
      || profile.deathFrames.length / profile.deathAnimationFps * 1000;
    animationTimer = scene.time.delayedCall(duration + cfg.animationSafetyMs, collapsed);
  };
  const prepare = () => {
    if (finished) return;
    if (scene.anims?.exists?.(profile.deathAnim)) { play(); return; }
    let settled = false;
    const ready = () => { if (settled) return; settled = true; play(); };
    loadTimer = setTimeout(ready, cfg.loadTimeoutMs);
    Promise.resolve(scene.playerDeferredAnimationAssetController?.ensureForAnimation?.(profile.deathAnim))
      .then(ready, ready);
  };
  // Move only the rendered body. Death/save coordinates and collision state stay authoritative.
  const body = scene.playerController?.physicsBody;
  const tileSize = scene.config?.tileSize;
  let drop = 0;
  if (body && tileSize && scene.worldModel?.isSolid && scene.tweens?.add) {
    const feet = body.y + body.h;
    const tx = Math.floor((body.x + body.w / 2) / tileSize);
    const firstRow = Math.floor(feet / tileSize);
    for (let row = firstRow; row <= firstRow + cfg.groundSearchTiles; row++) {
      if (scene.worldModel.isSolid(tx, row)) { drop = row * tileSize - feet; break; }
    }
  }
  if (drop > 0) {
    fallTween = scene.tweens.add({ targets: player, y: player.y + drop,
      duration: Math.min(cfg.maxFallMs, drop / tileSize * cfg.fallMsPerTile),
      ease: "Quad.easeIn", onComplete: prepare });
  } else prepare();
  return true;
}
