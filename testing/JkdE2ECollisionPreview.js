import { PLAYER_COLLISION_REVIEW_CONFIG as CONFIG } from "../values/playerCollisionReview.js";
import { PLAYER_COLLISION_CONFIG } from "../values/playerCollision.js";
import { DIG_IMPACT_FX_CONFIG } from "../values/digImpactFx.js";
import { MATERIAL_PARTICLE_POLISH } from "../values/materialParticlePolish.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { isLocalGameplayProfileHost } from "../values/gameplayCapabilities.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { HUD_LAYOUT } from "../values/hudLayout.js";

function presentationFingerprint(scene) {
  const player = scene.player;
  const body = scene.playerController.physicsBody;
  return JSON.stringify({
    sprite: [player.x, player.y, player.scaleX, player.scaleY,
      player.originX, player.originY, player.flipX, player.flipY],
    animation: [player.anims?.currentAnim?.key, player.frame?.name,
      player.anims?.currentFrame?.index, player.anims?.timeScale],
    body: [body.x, body.y, body.w, body.h, body.vx, body.vy],
  });
}

/** A/B the real player's terrain mask, including on one frozen gameplay frame. */
export function createCollisionE2EPreviewController(scene, {
  location = globalThis.location || {},
  production = globalThis.__DIG_GAME_PRODUCTION__ === true,
} = {}) {
  const query = new URLSearchParams(location.search || "");
  if (production || !isLocalGameplayProfileHost(location.hostname)
    || !query.has(CONFIG.harnessQueryParam)
    || query.get(CONFIG.queryParam) !== CONFIG.queryValue
    || scene._saveWritesBlocked !== true) return null;

  let caption = null;
  let frozen = false;
  let lastToggleUnchanged = null;
  let catchNextImpact = false;
  let lastImpact = null;
  let impactCapture = null;
  const particleReview = query.get(CONFIG.particle.queryParam) === CONFIG.particle.queryValue;
  let catchNextFoot = false, lastFoot = null, walkTimer = null, impactTimer = null;
  const footHistory = [];
  const releaseReviewWalk = () => {
    if (walkTimer === null) return;
    globalThis.clearTimeout(walkTimer);
    walkTimer = null;
    window.dispatchEvent(new KeyboardEvent("keyup", { code: CONFIG.particle.leftCode,
      key: CONFIG.particle.leftKey, keyCode: CONFIG.particle.leftKeyCode, which: CONFIG.particle.leftKeyCode, bubbles: true }));
  };
  const standOff = scene.playerController?.movingSideDigStandOff;
  const originalStandOffConfig = standOff?.config;
  const refreshCaption = () => {
    const text = CONFIG.caption;
    const mode = scene.playerSolidOcclusion?.mask ? text.maskOn : text.maskOff;
    const holdBack = standOff?.config?.enabled === true ? text.standOffOn : text.standOffOff;
    const checked = lastToggleUnchanged === null ? ""
      : `\n${lastToggleUnchanged ? text.unchanged : text.changed}`;
    const impactText = lastImpact
      ? `\n${text.contactPrefix}: ${lastImpact.animationKey} #${lastImpact.contactIndex + 1}/${lastImpact.contactCount}`
        + ` | frame ${lastImpact.contactFrame}/${lastImpact.visibleFrame} | ${lastImpact.point.x.toFixed(1)}, ${lastImpact.point.y.toFixed(1)}`
        + (lastImpact.feedback ? `\n${CONFIG.impactMetrics.prefix}: ${lastImpact.feedback.family}`
          + ` | ${CONFIG.impactMetrics.hold} ${lastImpact.feedback.hitstopMs.toFixed(1)} ms`
          + ` | ${CONFIG.impactMetrics.shake} ${lastImpact.feedback.intensityPx.toFixed(2)} px`
          + ` | ${scene.game.canvas.width}x${scene.game.canvas.height}` : "") : "";
    caption?.setText(`${text.title}\n${mode} | ${holdBack} | ${frozen ? text.frozen : text.running}`
      + `\n${text.controls}\n${catchNextImpact ? text.contactArmed : text.contactControls}`
      + `\n${text.physics}${checked}${impactText}`
      + (particleReview ? `\n${catchNextFoot ? CONFIG.particle.waiting : CONFIG.particle.controls}`
        + (lastFoot ? `\n${CONFIG.particle.prefix}: ${lastFoot.family} | frame ${lastFoot.frame}`
          + ` | ${lastFoot.x.toFixed(1)}, ${lastFoot.y.toFixed(1)} | recent ${footHistory.join(", ")}` : "") : ""));
  };
  const resume = () => {
    if (!frozen) return;
    frozen = false;
    scene.scene.resume();
    refreshCaption();
  };
  const onImpact = (snapshot) => {
    if (!caption) return;
    lastImpact = snapshot;
    impactCapture = catchNextImpact ? null : { started: scene.time.now,
      contactFrame: snapshot.contactFrame, visibleFrame: snapshot.visibleFrame,
      feedback: snapshot.feedback, samples: [] };
    if (catchNextImpact && !scene.scene.isPaused()) {
      catchNextImpact = false;
      const delay = Number(query.get(CONFIG.afterQueryParam));
      const freeze = () => { impactTimer = null; frozen = true; scene.scene.pause(); refreshCaption(); };
      if (CONFIG.afterDelaysMs.includes(delay)) impactTimer = scene.time.delayedCall(delay, freeze);
      else freeze();
    }
    refreshCaption();
  };
  scene.events?.on?.(DIG_IMPACT_FX_CONFIG.presentedEvent, onImpact);
  const onReviewRender = () => {
    if (!impactCapture || scene.scene.isPaused()) return;
    const capture = impactCapture, elapsed = scene.time.now - capture.started;
    const shake = scene.shakeSystem?.getStatus?.();
    capture.samples.push({ ms: Math.round(elapsed), frame: Number(scene.player.frame.name),
      held: scene.digImpactFxSystem?.feedback?.holding === true,
      x: shake?.offset?.x || 0, y: shake?.offset?.y || 0 });
    if (elapsed < CONFIG.impactMetrics.captureMs
      && capture.samples.length < CONFIG.impactMetrics.maximumSamples) return;
    console.info(CONFIG.impactMetrics.logPrefix, JSON.stringify({
      backing: [scene.game.canvas.width, scene.game.canvas.height],
      fps: Math.round(scene.game.loop.actualFps),
      contactFrame: capture.contactFrame, visibleFrame: capture.visibleFrame,
      feedback: capture.feedback, samples: capture.samples,
    }));
    impactCapture = null;
  };
  scene.events?.on?.(CONFIG.impactMetrics.renderEvent, onReviewRender);
  const onFoot = snapshot => {
    if (!particleReview || !caption) return;
    lastFoot = snapshot;
    footHistory.push(snapshot.frame);
    if (footHistory.length > CONFIG.particle.historyCount) footHistory.shift();
    if (catchNextFoot && !scene.scene.isPaused()) {
      catchNextFoot = false;
      frozen = true;
      scene.scene.pause();
    }
    refreshCaption();
  };
  if (particleReview) scene.events?.on?.(MATERIAL_PARTICLE_POLISH.foot.presentedEvent, onFoot);

  return {
    resume,
    stage(gallery) {
      if (!gallery?.ok) return false;
      resume();
      releaseReviewWalk();
      impactTimer?.remove?.(false);
      impactTimer = null;
      catchNextImpact = false;
      catchNextFoot = false;
      lastImpact = null;
      impactCapture = null;
      lastFoot = null;
      footHistory.length = 0;
      const controller = scene.playerController;
      const body = controller?.physicsBody;
      if (!body) return false;
      const { tx, ty } = gallery.playerTile;
      const facing = query.get(CONFIG.facingQueryParam) === CONFIG.leftFacingValue ? -1 : 1;
      const targetX = tx + CONFIG.targetOffsetX * facing;
      const requestedMaterial = query.get(CONFIG.materialQueryParam)?.toUpperCase();
      const materialName = CONFIG.materialNames.includes(requestedMaterial)
        ? requestedMaterial : CONFIG.materialNames[0];
      for (const cell of [[targetX, ty], [tx, ty + CONFIG.ceilingOffsetY]]) {
        const hp = query.get(CONFIG.breakQueryParam) === CONFIG.particle.queryValue ? CONFIG.breakTargetHp : CONFIG.targetHp;
        scene.worldModel.setTile(...cell, TILE_TYPES[materialName], hp);
        scene.worldRenderer.applyTileUpdate(...cell);
      }
      if (particleReview) {
        for (let dx = -CONFIG.particle.floorRadiusTiles; dx <= CONFIG.particle.floorRadiusTiles; dx += 1) {
          scene.worldModel.setTile(tx + dx, ty + 1, TILE_TYPES[materialName], CONFIG.targetHp);
          scene.worldRenderer.applyTileUpdate(tx + dx, ty + 1);
        }
      }
      // Put the existing body at the wall, not inside it. Its normal validator
      // remains authoritative. The high-HP fixture lets every combo be compared.
      const faceX = targetX * scene.config.tileSize;
      const bodyX = facing > 0 ? faceX - body.w - PLAYER_COLLISION_CONFIG.skinPx
        : faceX + scene.config.tileSize + PLAYER_COLLISION_CONFIG.skinPx;
      if (body.setPosition(bodyX, body.y) === false) {
        return false;
      }
      body.resetVelocity();
      controller.movement?.setFacingRight?.(facing > 0);
      controller._syncSpriteWithPhysics();
      if (!caption) {
        const font = APPROVED_HUD_SKIN.font;
        caption = scene.add.text(CONFIG.caption.x, CONFIG.caption.y, "", {
          fontFamily: font.family,
          fontSize: `${CONFIG.caption.fontSizePx}px`,
          color: font.gold,
          stroke: font.shadow,
          strokeThickness: font.strokeThickness,
        }).setScrollFactor(0).setDepth(HUD_LAYOUT.hudOverlayDepth)
          .setLineSpacing(CONFIG.caption.lineSpacing);
      }
      lastToggleUnchanged = null;
      refreshCaption();
      scene.worldRenderer.invalidate?.();
      return true;
    },
    handleKey(event) {
      if (particleReview && caption && event.ctrlKey
        && [CONFIG.particle.catchCode, CONFIG.particle.walkCode].includes(event.code)) {
        event.preventDefault?.();
        if (event.repeat) return true;
        resume();
        if (event.code === CONFIG.particle.catchCode) catchNextFoot = true;
        else {
          releaseReviewWalk();
          // Explicit, save-disabled authoring control through the normal keyboard path.
          // Real A/D, Space, Shift, motion and collision code are never replaced.
          window.dispatchEvent(new KeyboardEvent("keydown", { code: CONFIG.particle.leftCode,
            key: CONFIG.particle.leftKey, keyCode: CONFIG.particle.leftKeyCode, which: CONFIG.particle.leftKeyCode, bubbles: true }));
          walkTimer = globalThis.setTimeout(releaseReviewWalk, CONFIG.particle.walkDurationMs);
        }
        refreshCaption();
        return true;
      }
      if (!caption || ![CONFIG.standOffCode, CONFIG.toggleCode, CONFIG.freezeCode].includes(event.code)) return false;
      event.preventDefault?.();
      if (event.repeat) return true;
      if (event.code === CONFIG.standOffCode) {
        if (originalStandOffConfig) {
          standOff.end();
          standOff.config = standOff.config?.enabled === true
            ? { ...originalStandOffConfig, enabled: false } : originalStandOffConfig;
        }
        refreshCaption();
        return true;
      }
      if (event.code === CONFIG.freezeCode) {
        if (event.shiftKey) {
          resume();
          catchNextImpact = true;
          refreshCaption();
          return true;
        }
        catchNextImpact = false;
        if (frozen) resume();
        else if (!scene.scene.isPaused()) {
          frozen = true;
          refreshCaption();
          scene.scene.pause();
        }
        return true;
      }
      const occlusion = scene.playerSolidOcclusion;
      if (!occlusion) return true;
      const before = presentationFingerprint(scene);
      if (occlusion.mask) occlusion.destroy();
      else {
        occlusion.enabled = true;
        occlusion.create();
      }
      lastToggleUnchanged = before === presentationFingerprint(scene);
      refreshCaption();
      return true;
    },
    destroy() {
      impactCapture = null;
      scene.events?.off?.(CONFIG.impactMetrics.renderEvent, onReviewRender);
      releaseReviewWalk();
      impactTimer?.remove?.(false);
      impactTimer = null;
      scene.events?.off?.(MATERIAL_PARTICLE_POLISH.foot.presentedEvent, onFoot);
      // Scene shutdown owns the actual player/mask and clears a paused scene.
      frozen = false;
      catchNextImpact = false;
      scene.events?.off?.(DIG_IMPACT_FX_CONFIG.presentedEvent, onImpact);
      if (originalStandOffConfig) {
        standOff.end();
        standOff.config = originalStandOffConfig;
      }
      caption?.destroy();
      caption = null;
    },
  };
}
