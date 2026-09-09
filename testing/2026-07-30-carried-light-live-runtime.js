import { getCarriedLightLiveComparisonFrameUrl } from
  "../values/carriedLightLiveComparison.js";
import { findDepthTarget, isStanding, nearestStanding } from
  "./2026-07-30-carried-light-live-depth.js";
import { prepareShallowMaterialGallery } from "./2026-08-15-shallow-material-gallery.js";
const sleep = durationMs => new Promise(resolve => setTimeout(resolve, durationMs));
function waitFor(probe, timeoutMs, label, pollIntervalMs) {
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      try {
        const value = probe();
        if (value) {
          resolve(value);
          return;
        }
      } catch {
        // Frames are briefly inaccessible while navigating.
      }
      if (performance.now() - startedAt >= timeoutMs) {
        reject(new Error(`Timed out waiting for ${label}`));
        return;
      }
      setTimeout(poll, pollIntervalMs);
    };
    poll();
  });
}
export function createCarriedLightLiveRuntime(frameEntries, CONFIG) {
  const state = { ready: false, target: null, fuelProfile: "full", weatherProfile: "clear",
    dayProfile: "day", depthProfile: CONFIG.defaultDepthProfile, resyncTimer: null };
  const gameFor = entry => entry.frame.contentWindow?.__phaserGame || null;
  const playSceneFor = entry => {
    const game = gameFor(entry);
    if (!game?.scene?.isActive?.("PlayScene")) return null;
    return game.scene.getScene("PlayScene");
  };
  const allScenes = () => frameEntries.map(playSceneFor).filter(Boolean);
  async function launch(entry) {
    const menu = await waitFor(() => gameFor(entry)?.scene?.getScenes?.(true)?.find(
      scene => ["MainMenuScene", "StartMenuScene"].includes(scene.scene.key)
    ), CONFIG.timing.bootTimeoutMs, `${entry.scenario.id} menu`, CONFIG.timing.pollIntervalMs);
    // Stop the menu before world loading releases its textures.
    menu.scene.start("WorldLoadScene", {
      saveSlot: entry.scenario.saveSlot,
      worldIdentity: CONFIG.world.identity,
      isNewSave: true,
      tutorialChoice: CONFIG.world.tutorialChoice,
    });
    await waitFor(() => {
      const scene = playSceneFor(entry);
      return scene?.lightSystem && entry.frame.contentWindow?.__jkdE2E
        ? scene
        : null;
    }, CONFIG.timing.playTimeoutMs, `${entry.scenario.id} PlayScene`, CONFIG.timing.pollIntervalMs);
  }
  function currentTile(scene) {
    const body = scene.playerController?.physicsBody;
    const tileSize = scene.config.tileSize;
    const worldX = body ? body.x + body.w * 0.5 : scene.player.x;
    const worldY = body ? body.y + body.h * 0.5 : scene.player.y;
    return scene.worldModel.worldToTile?.(worldX, worldY) || {
      tx: Math.floor(worldX / tileSize), ty: Math.floor(worldY / tileSize) };
  }
  function stabilizeLighting(scene) {
    const system = scene.lightSystem;
    const depth = Math.max(
      0, currentTile(scene).ty - scene.config.topAirRows + 1
    );
    const lighting = system._resolveLightingState(depth);
    system._latestDepth = depth;
    system._currentRadiusTiles = system._computeVisibilityRadius(lighting);
    system._currentGlowStrength = system._computeTargetGlow(lighting);
  }

  function forceScene(scene, target) {
    const win = scene.game.canvas.ownerDocument.defaultView;
    win.__jkdE2E.closeAll();
    win.__jkdE2E.forcePlayerState(target);
    scene.worldRenderer?.updateRenderWindow?.(target);
    scene.worldRenderer?.invalidate?.();
    scene.cameras.main.startFollow(scene.player, true);
    stabilizeLighting(scene);
  }

  function forceAll(target) {
    for (const scene of allScenes()) forceScene(scene, target);
    state.target = { ...target };
  }

  function setDepth(profileId) {
    const profile = CONFIG.depthProfiles?.[profileId];
    if (!profile || !state.ready) return false;
    const scenes = allScenes();
    const target = findDepthTarget(
      scenes[0], CONFIG.world, profile.depthTiles
    );
    if (!scenes.every(scene => isStanding(scene, target.tx, target.ty))) {
      throw new Error(`Generated worlds differ near ${profile.label}`);
    }
    forceAll(target);
    state.depthProfile = profileId;
    return true;
  }


  function setFuel(profileId) {
    const profile = CONFIG.fuelProfiles[profileId];
    if (!profile || !state.ready) return;
    for (const scene of allScenes()) {
      const maximum = scene.playerController.getGemPowerMax();
      scene.playerController.setGemPowerExact(maximum * profile.ratio,
        { silent: true, source: CONFIG.id });
    }
    state.fuelProfile = profileId;
  }

  function setWeather(profileId) {
    const profile = CONFIG.weatherProfiles[profileId];
    if (!profile || !state.ready) return;
    for (const scene of allScenes()) {
      scene.weatherSystem?.forceWeather?.(profile.id, profile.intensity,
        CONFIG.world.weatherDurationMs);
    }
    state.weatherProfile = profileId;
  }

  function setDayPhase(profileId) {
    const profile = CONFIG.dayProfiles[profileId];
    if (!profile || !state.ready) return;
    for (const scene of allScenes()) {
      const cycle = scene.dayNightCycle;
      cycle?.fromJSON?.({ currentTime: profile.time, day: cycle.getDay?.() || 1 });
    }
    state.dayProfile = profileId;
  }

  function setTorchActive(nextActive) {
    if (!state.ready) return;
    for (const scene of allScenes()) {
      if (scene.lightSystem.isTorchActive() !== nextActive) scene.lightSystem._toggleTorch();
      stabilizeLighting(scene);
    }
  }

  function toggleTorch() {
    const first = allScenes()[0];
    if (first) setTorchActive(!first.lightSystem.isTorchActive());
  }

  function step(direction) {
    const first = allScenes()[0];
    if (!first || !state.target) return;
    const target = nearestStanding(
      first,
      state.target.tx + direction * CONFIG.movement.stepTiles,
      state.target.ty,
      direction,
      CONFIG.movement
    );
    if (target && allScenes().every(
      scene => isStanding(scene, target.tx, target.ty)
    )) {
      forceAll(target);
    }
  }

  function resync() {
    const first = playSceneFor(frameEntries[0]);
    if (!first) return;
    const tile = currentTile(first);
    const target = nearestStanding(
      first, tile.tx, tile.ty, 1, CONFIG.movement
    ) || nearestStanding(
      first, tile.tx, tile.ty, -1, CONFIG.movement
    );
    if (target && allScenes().every(
      scene => isStanding(scene, target.tx, target.ty)
    )) {
      forceAll(target);
    }
  }

  function telemetry(entry) {
    const scene = playSceneFor(entry);
    if (!scene) return null;
    const light = scene.lightSystem.getFireLightSnapshot();
    const shader = scene.lightSystem.getShaderSnapshot();
    const maximum = scene.playerController.getGemPowerMax();
    const current = scene.playerController.getGemPowerExact();
    return {
      scenario: entry.scenario.id,
      runtimeId: light?.id || "unavailable",
      presentationId: light?.presentationId || null,
      active: scene.lightSystem.isTorchActive(),
      rays: light?.rays?.visibleRayCount || 0,
      authoredLayers: (light?.renderer?.visibleLayerCount || 0)
        + (light?.illumination?.visibleLayerCount || 0),
      proceduralWorldGlow: light?.proceduralWorldGlow === true,
      proceduralShaderMix: light?.proceduralShaderMix ?? 1,
      depth: shader.depth,
      torchBonusRadiusTiles:
        scene.lightSystem._preparedFrame?.lighting?.torchBonusRadius || 0,
      visibilityRadiusTiles: shader.torchRadiusPx
        / (scene.config.tileSize * (scene.cameras.main.zoomX || scene.cameras.main.zoom || 1)),
      darknessAlpha: shader.darknessAlpha,
      torchGlowStrength: shader.torchGlowStrength,
      gpRatio: maximum > 0 ? current / maximum : 0,
      eyeLuminance: light?.eyeAdaptation?.perceivedLuminance || 0,
      veilAlpha: light?.eyeAdaptation?.appliedDarkVeilAlpha
        ?? light?.eyeAdaptation?.darkVeilAlpha ?? 0,
      dayTime: scene.dayNightCycle?.currentTime || 0,
      nightAmount: scene.dayNightCycle?.getNightAmount?.() || 0,
      tile: currentTile(scene),
      rendererType: scene.game.renderer.type,
      uiErrors: [...(entry.frame.contentWindow?.__jkdUiErrors || [])],
    };
  }

  function snapshot() {
    return {
      ready: state.ready,
      target: state.target ? { ...state.target } : null,
      fuelProfile: state.fuelProfile,
      weatherProfile: state.weatherProfile,
      dayProfile: state.dayProfile,
      depthProfile: state.depthProfile,
      scenarios: frameEntries.map(telemetry),
    };
  }

  function forwardInput(event, type) {
    if (!CONFIG.movement.forwardedCodes.includes(event.code)) return false;
    for (const entry of frameEntries) {
      const win = entry.frame.contentWindow;
      win?.dispatchEvent(new win.KeyboardEvent(type, {
        key: event.key,
        code: event.code,
        shiftKey: event.shiftKey,
        bubbles: true,
        cancelable: true,
      }));
    }
    if (type === "keyup") {
      clearTimeout(state.resyncTimer);
      state.resyncTimer = setTimeout(
        resync,
        CONFIG.timing.inputReleaseResyncMs
      );
    }
    return true;
  }

  async function initialize(pageHref) {
    for (const entry of frameEntries) {
      entry.frame.src = getCarriedLightLiveComparisonFrameUrl(
        pageHref,
        entry.scenario
      );
    }
    for (const entry of frameEntries) await launch(entry);
    const scenes = allScenes();
    const initialProfile = CONFIG.depthProfiles?.[CONFIG.defaultDepthProfile];
    const requestedDepth = initialProfile?.depthTiles ?? CONFIG.world.startDepthOffsetTiles;
    const galleryTargets = CONFIG.world.captureGallery
      ? scenes.map(scene => prepareShallowMaterialGallery(scene, CONFIG.world, requestedDepth))
      : null;
    const target = galleryTargets?.[0] || findDepthTarget(
      scenes[0], CONFIG.world, requestedDepth
    );
    if (!scenes.every(scene => isStanding(scene, target.tx, target.ty))) {
      throw new Error("Generated comparison worlds do not share the target tile");
    }
    forceAll(target);
    state.ready = true;
    setFuel("full");
    setWeather("clear");
    setDayPhase("day");
    setTorchActive(true);
    await sleep(CONFIG.timing.settleMs);
  }

  return {
    get ready() { return state.ready; },
    initialize,
    snapshot,
    step,
    resync,
    setFuel,
    setWeather,
    setDayPhase,
    setDepth,
    setTorchActive,
    toggleTorch,
    forwardInput,
  };
}
