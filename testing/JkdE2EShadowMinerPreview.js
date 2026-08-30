import {
  SHADOW_MINER_CONFIG,
  SHADOW_MINER_ENCOUNTER_BANDS,
} from "../values/shadowMiner.js";
import {
  resolvePlayerDisplaySizePx,
  resolvePlayerVisualOrigin,
} from "../values/playerAssetProfiles.js";
import { TILE_TYPES } from "../values/tileTypes.js";

function stageReplayChamber(scene, world, config) {
  const preview = config.preview;
  const desiredTy = scene.config.topAirRows + preview.depthOffsetTiles;
  const maximumStandingTy = Number.isFinite(world.depthTiles)
    ? world.depthTiles - 2
    : desiredTy;
  const standingTy = Math.min(maximumStandingTy, desiredTy);
  const startTx = preview.anchorTileX;
  const endTx = startTx + preview.trailDistanceTiles;
  const left = startTx - preview.chamberPaddingTiles;
  const right = endTx + preview.chamberPaddingTiles;
  const top = standingTy - preview.chamberAirRows + 1;

  for (let ty = top; ty <= standingTy; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      world.setTile(tx, ty, TILE_TYPES.AIR, 0);
      scene.worldRenderer?.applyTileUpdate?.(tx, ty);
    }
  }
  for (let tx = left; tx <= right; tx += 1) {
    const hp = world.getTileMaxHp(tx, standingTy + 1, TILE_TYPES.STONE);
    world.setTile(tx, standingTy + 1, TILE_TYPES.STONE, hp);
    scene.worldRenderer?.applyTileUpdate?.(tx, standingTy + 1);
  }
  scene.worldRenderer?.invalidate?.();
  return { startTx, endTx, ty: standingTy };
}

function normalizeAnimationFrames(scene, key, sheet, authoredFrames) {
  const animation = key && scene.anims?.exists?.(key)
    ? scene.anims.get(key)
    : null;
  const liveFrames = animation?.frames?.map(frame => ({
    textureKey: frame.textureKey || frame.frame?.texture?.key || sheet,
    frameName: frame.textureFrame ?? frame.frame?.name,
  })).filter(frame => frame.textureKey && frame.frameName !== undefined) || [];
  const fallbackFrames = (authoredFrames || []).map(frame => ({
    textureKey: typeof frame === "object" ? frame.key : sheet,
    frameName: typeof frame === "object" ? frame.frame : frame,
  })).filter(frame => frame.textureKey && frame.frameName !== undefined);
  return {
    frames: liveFrames.length > 0 ? liveFrames : fallbackFrames,
    frameRate: animation?.frameRate || null,
  };
}

function resolvePreviewClip(scene, profile, kind) {
  const walking = kind === "walk";
  const key = walking
    ? profile.walkLoopAnim || profile.walkAnim || profile.idleAnim
    : profile.digDownAnim || profile.digSidewaysAnim
      || profile.digAnims?.[0] || profile.idleAnim;
  const sheet = walking
    ? profile.walkLoopSheet || profile.walkSheet || profile.idleSheet
    : profile.digDownSheet || profile.digSheet || profile.idleSheet;
  const authoredFrames = walking
    ? profile.walkLoopFrames || profile.walkFrames || profile.idleFrames
    : profile.digDownFrames || profile.digFrames || profile.idleFrames;
  const resolved = normalizeAnimationFrames(scene, key, sheet, authoredFrames);
  const fallbackFrame = {
    textureKey: scene.player?.texture?.key,
    frameName: scene.player?.frame?.name,
  };
  return {
    key,
    frames: resolved.frames.length > 0 ? resolved.frames : [fallbackFrame],
    frameRate: resolved.frameRate || (walking
      ? profile.walkAnimation?.baseFps || profile.idleAnimationFps
      : profile.digAnimationFps || profile.idleAnimationFps),
  };
}

function buildReplaySamples(scene, chamber, now, config) {
  const profile = scene.playerAssetProfile || {};
  const preview = config.preview;
  const walk = resolvePreviewClip(scene, profile, "walk");
  const dig = resolvePreviewClip(scene, profile, "dig");
  const duration = preview.trailDurationMs;
  const walkingDuration = duration - preview.digHoldMs;
  const digStartsAt = duration * preview.digStartRatio;
  const digEndsAt = digStartsAt + preview.digHoldMs;
  const interval = config.history.sampleIntervalMs;
  const tileSize = scene.config.tileSize;
  const endX = scene.player.x;
  const startX = endX - preview.trailDistanceTiles * tileSize;
  const startAt = now - duration;
  const samples = [];

  for (let elapsed = 0; elapsed <= duration; elapsed += interval) {
    const walking = elapsed < digStartsAt || elapsed >= digEndsAt;
    const clip = walking ? walk : dig;
    const walkingElapsed = elapsed < digStartsAt
      ? elapsed
      : elapsed < digEndsAt
        ? digStartsAt
        : elapsed - preview.digHoldMs;
    const clipElapsed = walking ? walkingElapsed : elapsed - digStartsAt;
    const frameDuration = 1_000 / Math.max(1, clip.frameRate || 1);
    const frameIndex = Math.floor(clipElapsed / frameDuration) % clip.frames.length;
    const frame = clip.frames[frameIndex];
    const travelRatio = Math.min(1, walkingElapsed / walkingDuration);
    const textureKey = frame.textureKey || scene.player.texture.key;
    const origin = resolvePlayerVisualOrigin(profile, clip.key, textureKey, {
      x: scene.player.originX,
      y: scene.player.originY,
    });
    const displaySize = resolvePlayerDisplaySizePx(
      profile,
      scene.config.playerDisplaySizePx || scene.player.displayWidth,
      clip.key,
    );
    samples.push({
      time: startAt + elapsed,
      x: startX + (endX - startX) * travelRatio,
      y: scene.player.y,
      tileX: chamber.startTx + preview.trailDistanceTiles * travelRatio,
      tileY: chamber.ty,
      textureKey,
      frameName: frame.frameName ?? scene.player.frame.name,
      animationKey: clip.key,
      frameIndex,
      flipX: false,
      originX: origin.x,
      originY: origin.y,
      displayWidth: displaySize,
      displayHeight: displaySize,
      action: !walking,
    });
  }
  const last = samples.at(-1);
  if (last?.time !== now) samples.push({ ...last, time: now });
  return samples;
}

function captureTorch(scene) {
  return scene.lightSystem?.getTorchIntensitySnapshot?.() || {
    active: scene.lightSystem?.isTorchActive?.() === true,
    percent: SHADOW_MINER_CONFIG.preview.torchIntensityPercent,
  };
}

function setTorchActive(scene, active, percent) {
  scene.lightSystem?.setTorchIntensityPercent?.(percent);
  const currentlyActive = scene.lightSystem?.isTorchActive?.() === true;
  if (currentlyActive !== active) scene.lightSystem?._toggleTorch?.();
  return scene.lightSystem?.isTorchActive?.() === true;
}

function logSnapshot(label, system) {
  const snapshot = system.getHealthSnapshot();
  console.info(
    `[JkdE2EHarness] Shadow Miner ${label} `
    + `state=${snapshot.state} band=${snapshot.encounterBand || "none"} `
    + `distance=${Number(snapshot.distanceToPlayerTiles || 0).toFixed(2)} `
    + `delay=${Math.round(snapshot.playbackDelayMs || 0)}ms `
    + `animation=${snapshot.view?.animationKey || "none"} `
    + `frame=${snapshot.view?.frameName ?? "none"} `
    + `repelledBy=${snapshot.repelledBy || "none"} `
    + `lastRepellent=${snapshot.lastRepelledBy || "none"}`,
  );
  return snapshot;
}

function scheduleEvidence(scene, system, originalTorch, originalGp) {
  const preview = system.config.preview;
  scene.time.delayedCall(preview.evidenceDigDelayMs, () => {
    logSnapshot("dig replay evidence", system);
  });
  scene.time.delayedCall(preview.evidenceApproachDelayMs, () => {
    logSnapshot("approach evidence", system);
  });
  scene.time.delayedCall(preview.lightOnDelayMs, () => {
    scene.playerController?.fillGemPower?.();
    const lit = setTorchActive(scene, true, preview.torchIntensityPercent);
    console.info(`[JkdE2EHarness] Shadow Miner torch protection active=${lit}`);
  });
  scene.time.delayedCall(preview.evidenceFleeDelayMs, () => {
    logSnapshot("flee evidence", system);
  });
  scene.time.delayedCall(preview.evidenceCompleteDelayMs, () => {
    const complete = logSnapshot("completion evidence", system);
    setTorchActive(scene, originalTorch.active, originalTorch.percent);
    scene.playerController?.setGemPowerExact?.(originalGp, {
      silent: true,
      source: preview.restoreGpSource,
    });
    scene.playerController?.setControlsEnabled?.(true);
    console.info(
      `[JkdE2EHarness] Shadow Miner preview restored controls, torch, and GP; `
      + `completed=${complete.completedCount}`,
    );
  });
}

export function createShadowMinerE2EPreviewController(scene, callbacks = {}) {
  return Object.freeze({
    activate() {
      const system = scene.shadowMinerSystem;
      const world = scene.worldModel;
      if (!system?.mode?.enabled || !world) {
        console.warn("[JkdE2EHarness] Shadow Miner is disabled or unavailable");
        return null;
      }
      if (system.getHealthSnapshot().active) {
        console.warn("[JkdE2EHarness] Shadow Miner preview is already active");
        return system.getHealthSnapshot();
      }

      callbacks.closeUi?.();
      const originalTorch = captureTorch(scene);
      const originalGp = scene.playerController?.getGemPowerExact?.() || 0;
      setTorchActive(scene, false, originalTorch.percent);
      const chamber = stageReplayChamber(scene, world, system.config);
      callbacks.forcePlayer?.({ tx: chamber.endTx, ty: chamber.ty, controlsEnabled: false });
      const now = scene.time?.now || 0;
      const samples = buildReplaySamples(scene, chamber, now, system.config);
      system.history.replaceSamples(samples);
      const playerTile = scene.playerController?.getPlayerTile?.()
        || { tx: chamber.endTx, ty: chamber.ty };
      const spawned = system.forceSpawn(playerTile, now, {
        stressSnapshot: {
          armed: true,
          stressBand: SHADOW_MINER_ENCOUNTER_BANDS.CRITICAL,
          stressRatio: 1,
        },
        nearIntactStarLight: false,
        torchActive: false,
        torchIntensity: 0,
      });
      if (!spawned) {
        scene.playerController?.setControlsEnabled?.(true);
        setTorchActive(scene, originalTorch.active, originalTorch.percent);
        console.warn("[JkdE2EHarness] Shadow Miner replay trail was not ready");
        return null;
      }

      const initial = logSnapshot("preview spawned", system);
      console.info(
        `[JkdE2EHarness] Shadow Miner replay samples=${samples.length} `
        + `rateMultiplier=${initial.rateMultiplier} saveWrites=0 terrainDamage=0`,
      );
      scheduleEvidence(scene, system, originalTorch, originalGp);
      return initial;
    },
  });
}
