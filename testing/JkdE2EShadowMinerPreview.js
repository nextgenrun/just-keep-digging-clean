import {
  SHADOW_MINER_CONFIG,
  SHADOW_MINER_ENCOUNTER_BANDS,
} from "../values/shadowMiner.js";
import {
  resolvePlayerDisplaySizePx,
  resolvePlayerVisualOrigin,
} from "../values/playerAssetProfiles.js";
import { TILE_TYPES } from "../values/tileTypes.js";

export function stageShadowMinerReplayChamber(scene, world, config) {
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
  const originalTiles = new Map();
  const rememberTile = (tx, ty) => {
    const key = `${tx},${ty}`;
    if (originalTiles.has(key) || !world.inBounds?.(tx, ty)) return;
    originalTiles.set(key, {
      key,
      tx,
      ty,
      type: world.getTileType(tx, ty),
      hp: world.getTileHp(tx, ty),
      dugTile: world.dugTiles?.has(key) ? { ...world.dugTiles.get(key) } : null,
      rubbleTile: world.rubbleTiles?.has(key) ? { ...world.rubbleTiles.get(key) } : null,
      dugTileSource: world.dugTileSource?.has(key) ? world.dugTileSource.get(key) : null,
    });
  };

  for (let ty = top; ty <= standingTy; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      rememberTile(tx, ty);
      world.setTile(tx, ty, TILE_TYPES.AIR, 0);
      scene.worldRenderer?.applyTileUpdate?.(tx, ty);
    }
  }
  for (let tx = left; tx <= right; tx += 1) {
    rememberTile(tx, standingTy + 1);
    const hp = world.getTileMaxHp(tx, standingTy + 1, TILE_TYPES.STONE);
    world.setTile(tx, standingTy + 1, TILE_TYPES.STONE, hp);
    scene.worldRenderer?.applyTileUpdate?.(tx, standingTy + 1);
  }
  scene.worldRenderer?.invalidate?.();
  return {
    startTx,
    endTx,
    ty: standingTy,
    restore() {
      for (const tile of originalTiles.values()) {
        world.setTile(tile.tx, tile.ty, tile.type, tile.hp);
        world.dugTiles?.delete(tile.key);
        world.rubbleTiles?.delete(tile.key);
        world.dugTileSource?.delete(tile.key);
        if (tile.dugTile) world.dugTiles?.set(tile.key, tile.dugTile);
        if (tile.rubbleTile) world.rubbleTiles?.set(tile.key, tile.rubbleTile);
        if (tile.dugTileSource !== null) {
          world.dugTileSource?.set(tile.key, tile.dugTileSource);
        }
        scene.worldRenderer?.applyTileUpdate?.(tile.tx, tile.ty);
      }
      scene.worldRenderer?.invalidate?.();
    },
  };
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
      actionTargetOffsetX: walking ? null : 0,
      actionTargetOffsetY: walking ? null : 1,
      actionDirectionX: walking ? null : 0,
      actionDirectionY: walking ? null : 1,
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
  const behavior = snapshot.behavior || snapshot.lastBehavior;
  console.info(
    `[JkdE2EHarness] Shadow Miner ${label} `
    + `state=${snapshot.state} band=${snapshot.encounterBand || "none"} `
    + `depth=${Math.round(behavior?.depthMeters || 0)}m/`
    + `${behavior?.depthBandId || "none"} `
    + `personality=${behavior?.id || "none"} `
    + `target=${Number(behavior?.targetDistanceTiles || 0).toFixed(2)} `
    + `approach=${Number(behavior?.approachPlaybackRate || 0).toFixed(2)} `
    + `observe=${Math.round(behavior?.observeMs || 0)}ms `
    + `flee=${Number(behavior?.fleePlaybackRate || 0).toFixed(2)} `
    + `distance=${Number(snapshot.distanceToPlayerTiles || 0).toFixed(2)} `
    + `delay=${Math.round(snapshot.playbackDelayMs || 0)}ms `
    + `animation=${snapshot.view?.animationKey || "none"} `
    + `frame=${snapshot.view?.frameName ?? "none"} `
    + `entryVisible=${snapshot.lastEntryVisible === true} `
    + `observing=${snapshot.view?.observing === true} `
    + `recoil=${snapshot.view?.recoilActive === true} `
    + `lightReacting=${snapshot.view?.lightReacting === true} `
    + `light=${snapshot.lightInteraction?.source || "none"} `
    + `lightPressure=${Number(snapshot.lightInteraction?.pressure || 0).toFixed(2)} `
    + `lightExposure=${Number(snapshot.lightInteraction?.exposureProgress || 0).toFixed(2)} `
    + `repelDelay=${Math.round(snapshot.lightInteraction?.response?.repelDelayMs || 0)}ms `
    + `flipX=${snapshot.view?.flipX === true} `
    + `residue=${snapshot.view?.residue?.activeSprites || 0} `
    + `shadowBlock=${snapshot.view?.phantomDig?.activeBlock === true} `
    + `shadowBlockStage=${snapshot.view?.phantomDig?.stageIndex ?? "none"} `
    + `shadowBlocksBroken=${snapshot.view?.phantomDig?.breakCount || 0} `
    + `shadowBlockFailure=${snapshot.view?.phantomDig?.lastStartFailure || "none"} `
    + `shadowBlockArt=${snapshot.view?.phantomDig?.blockArtAvailable ?? "untested"} `
    + `shadowBlockArtSource=${snapshot.view?.phantomDig?.blockArtSource || "none"} `
    + `observeDig=${snapshot.observeAction?.active === true} `
    + `awareness=${snapshot.awarenessCue?.direction || "none"}`
    + `/${snapshot.awarenessCue?.labelCreated === true ? "label" : "hud"} `
    + `repelledBy=${snapshot.repelledBy || "none"} `
    + `lastRepellent=${snapshot.lastRepelledBy || "none"}`,
  );
  return snapshot;
}

function scheduleEvidence(
  scene,
  system,
  originalTorch,
  originalGp,
  restorePreview,
) {
  const preview = system.config.preview;
  scene.time.delayedCall(preview.evidenceTellDelayMs, () => {
    logSnapshot("arrival tell evidence", system);
  });
  scene.time.delayedCall(preview.evidenceDigDelayMs, () => {
    logSnapshot("dig replay evidence", system);
  });
  scene.time.delayedCall(preview.evidenceApproachDelayMs, () => {
    logSnapshot("approach evidence", system);
  });
  scene.time.delayedCall(preview.evidenceObserveDelayMs, () => {
    logSnapshot("recognition evidence", system);
  });
  scene.time.delayedCall(preview.lightOnDelayMs, () => {
    scene.playerController?.fillGemPower?.();
    const lit = setTorchActive(scene, true, preview.torchIntensityPercent);
    console.info(`[JkdE2EHarness] Shadow Miner torch protection active=${lit}`);
  });
  scene.time.delayedCall(preview.evidenceRecoilDelayMs, () => {
    logSnapshot("light recoil evidence", system);
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
    restorePreview();
    console.info(
      `[JkdE2EHarness] Shadow Miner preview restored staged tiles, position, `
      + `tutorial safety, controls, torch, and GP; `
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
      const originalPlayerTile = scene.playerController?.getPlayerTile?.() || null;
      const originalTorch = captureTorch(scene);
      const originalGp = scene.playerController?.getGemPowerExact?.() || 0;
      const tutorialSafety = scene.townSquareTutorialSystem?.firstFive?.surfaceSafety;
      const originalSafetyPolicy = tutorialSafety?.isBlocked || null;
      if (tutorialSafety) tutorialSafety.isBlocked = () => false;
      let chamber = null;
      let restored = false;
      const restorePreview = () => {
        if (restored) return;
        restored = true;
        chamber?.restore?.();
        if (originalPlayerTile) {
          callbacks.forcePlayer?.({
            tx: originalPlayerTile.tx,
            ty: originalPlayerTile.ty,
            controlsEnabled: true,
          });
          scene.cameras?.main?.centerOn?.(scene.player?.x, scene.player?.y);
        } else {
          scene.playerController?.setControlsEnabled?.(true);
        }
        if (tutorialSafety) tutorialSafety.isBlocked = originalSafetyPolicy;
      };
      setTorchActive(scene, false, originalTorch.percent);
      chamber = stageShadowMinerReplayChamber(scene, world, system.config);
      callbacks.forcePlayer?.({ tx: chamber.endTx, ty: chamber.ty, controlsEnabled: false });
      const camera = scene.cameras?.main;
      camera?.centerOn?.(scene.player?.x, scene.player?.y);
      camera?.preRender?.();
      const now = scene.time?.now || 0;
      const samples = buildReplaySamples(scene, chamber, now, system.config);
      const textureHealth = [...new Set(samples.map(sample => sample.textureKey))]
        .map(textureKey => ({
          textureKey,
          exists: scene.textures?.exists?.(textureKey) === true,
        }));
      console.info(
        `[JkdE2EHarness] Shadow Miner placement player=${Math.round(scene.player?.x || 0)},`
        + `${Math.round(scene.player?.y || 0)} camera=${Math.round(camera?.worldView?.x || 0)},`
        + `${Math.round(camera?.worldView?.y || 0)} chamber=${chamber.endTx},${chamber.ty} `
        + `textures=${JSON.stringify(textureHealth)}`,
      );
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
        restorePreview();
        setTorchActive(scene, originalTorch.active, originalTorch.percent);
        console.warn("[JkdE2EHarness] Shadow Miner replay trail was not ready");
        return null;
      }

      const initial = logSnapshot("preview spawned", system);
      console.info(
        `[JkdE2EHarness] Shadow Miner replay samples=${samples.length} `
        + `rateMultiplier=${initial.rateMultiplier} saveWrites=0 terrainDamage=0`,
      );
      scheduleEvidence(
        scene,
        system,
        originalTorch,
        originalGp,
        restorePreview,
      );
      return initial;
    },
  });
}
