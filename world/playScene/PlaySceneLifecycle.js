import { SAVE_SCHEDULING_CONFIG } from "../../values/saveScheduling.js";
import { destroyGraveborerWurmRuntime } from "./GraveborerWurmBridge.js";
import { destroyHardcoreModeRuntime } from "./HardcoreModeBridge.js";

const SYSTEM_DISPOSAL_SEQUENCE = Object.freeze([
  "caveEntryController",
  "understarEndingSystem",
  "gameSaveCoordinator",
  "thunderStrikeActionRuntime",
  "ualActionContactTimeline",
  "complexDigAnimationRuntime",
  "worldMapOverlay",
  "randomEventBridge",
  "hardcoreMemorialSystem",
  "titanClueSystem",
  "npcManager",
  "overlayManager",
  "startZoneScenicBackgroundSystem",
  "levelOneGroundFacadeSystem",
  "startZoneGroundFacadeSystem",
  "deepWorldLivingBackdropSystem",
  "worldScenicFacadeSystem",
  "worldBackgroundAmbientMotionSystem",
  "levelOneLivingBackdropSystem",
  "v11SkyIslandVisualSystem",
  "worldRenderer",
  "bgObjectPlacer",
  "caveTemplateVisualSystem",
  "caveAtmosphereSystem",
  "caveHazardSystem",
  "caveInteriorOcclusionSystem",
  "specialBlockEffectsManager",
  "milestoneBoardSystem",
  "biomeSystem",
  "campfireSystem",
  "memoryReliquaryWorldSystem",
  "animatedCacheVisualSystem",
  "memoryReliquaryDiscoverySystem",
  "interactiveWorldStateTextureBank",
  "specialTileSystem",
  "heavenblocksAccessSystem",
  "heavenblocksPresentationSystem",
  "nextPromiseHudSystem",
  "miningIntentPreviewSystem",
  "_gpLabelText",
  "groundFootstepFxSystem",
  "tileDestructionFxSystem",
  "hitstopSystem",
  "screenFlashSystem",
  "screenRecordSystem",
  "pickaxeTrailSystem",
  "flightFootParticleSystem",
  "fullWorldMaterialSystem",
  "postFxSystem",
  "playerBodyLanguage",
  "playerContactShadow",
  "playerMotionPolish",
  "playerKinematicMotion",
  "playerRigContact",
  "playerSolidOcclusion",
  "ambientParticleSystem",
  "depthMilestoneCinematic",
  "_livingDrillOccluder",
  "celestialEngineController",
  "starPillarSystem",
  "celestialTalentProgressionSystem",
  "starHeartProgressionSystem",
  "lootPickupFxSystem",
  "rewardFlightMotionSystem",
  "relicDiscoveryFxSystem",
  "emberDiscoveryEventSystem",
  "floatingTextSystem",
  "worldMapDiscoverySystem",
  "worldMapStarTerritorySystem",
  "worldMapActivityRegistry",
  "weatherSystem",
  "lightFrameSync",
  "shaderSystem",
  "atmosphereSystem",
  "soundSystem",
  "hudSystem",
  "dayNightCycle",
  "lightSystem",
  "shadowMinerSystem",
  "voiceLineManager",
  "depthGateSystem",
  "surfaceTunnelDoorSystem",
  "openingFlightArtifactSystem",
  "firstSessionPortalSystem",
  "systemIntroductionSystem",
  "contextualMechanicTutorialSystem",
  "townSquareTutorialSystem",
  "arcCoreVehicleSystem",
  "earthquakeSystem",
  "earthquakeFeedbackUI",
  "earthquakeHazardOverlay",
  "earthquakeTileFeedbackSystem",
  "runtimeFeaturePrefetchSystem",
  "playerDeferredAnimationAssetController",
  "playerAbilityAssetController",
  "runtimeFeatureAssetManager",
  "runtimeAssetLoadCoordinator",
  "_recoveryOverlay",
  "framePhaseScheduler",
]);

const NULL_AFTER_DISPOSE = new Set([
  "worldMapOverlay",
  "randomEventBridge",
  "hardcoreMemorialSystem",
  "memoryReliquaryWorldSystem",
  "animatedCacheVisualSystem",
  "memoryReliquaryDiscoverySystem",
  "interactiveWorldStateTextureBank",
  "firstSessionPortalSystem",
  "runtimeFeaturePrefetchSystem",
  "playerDeferredAnimationAssetController",
  "playerAbilityAssetController",
  "runtimeFeatureAssetManager",
  "runtimeAssetLoadCoordinator",
  "_recoveryOverlay",
]);

function disposeSceneProperty(scene, property) {
  const resource = scene[property];
  if (typeof resource?.destroy === "function") resource.destroy();
  else resource?.dispose?.();
  if (NULL_AFTER_DISPOSE.has(property)) scene[property] = null;
}

function registerSystemDisposals(scene, registry) {
  for (const property of [...SYSTEM_DISPOSAL_SEQUENCE].reverse()) {
    registry.register(
      () => disposeSceneProperty(scene, property),
      { id: `system:${property}` },
    );
  }
}

function registerCustomDisposals(scene, registry) {
  registry.register(() => {
    if (!scene._activeParticleChips) return;
    scene._activeParticleChips.forEach(chip => {
      scene.tweens.killTweensOf(chip);
      chip.destroy();
    });
    scene._activeParticleChips = [];
  }, { id: "active-particle-chips" });
  registry.register(() => {
    scene._livingDrillTween?.stop?.();
    scene.shakeSystem?.stop?.();
    scene.ualLocomotionTransitionSelector?.reset?.();
    scene.ualLocomotionTransitionSelector = null;
    scene.ualMiningComboSelector?.reset?.();
    scene.ualMiningComboSelector = null;
    scene._ualFlightTravelVisual = false;
  }, { id: "motion-transients" });
  registry.register(() => destroyGraveborerWurmRuntime(scene), { id: "graveborer-runtime" });
  registry.register(() => destroyHardcoreModeRuntime(scene), { id: "hardcore-runtime" });
  registry.register(() => scene.destroySceneUI?.(), { id: "scene-ui" });
  registry.register(() => {
    scene.worldModel?.setTileDamageGuard?.(null);
    scene.specialTileSystem?.setChestEventHandler?.(null);
    scene.hardcoreMemorialStore = null;
  }, { id: "world-callback-ports" });
  registry.register(() => {
    if (scene.player && scene._onAnimComplete) {
      scene.player.off(Phaser.Animations.Events.ANIMATION_COMPLETE, scene._onAnimComplete);
    }
    if (scene._debugKey && scene._debugKeyHandler) {
      scene._debugKey.off("down", scene._debugKeyHandler);
    }
    if (scene._debugUiSmokeKeyHandler) {
      scene.input.keyboard.off("keydown", scene._debugUiSmokeKeyHandler);
      scene._debugUiSmokeKeyHandler = null;
    }
  }, { id: "legacy-listeners" });
}

export function installPlaySceneLifecycle(scene) {
  const registry = scene.lifecycleRegistry;
  if (!registry || registry.disposed) throw new Error("PlayScene lifecycle registry is unavailable");
  registerSystemDisposals(scene, registry);
  registerCustomDisposals(scene, registry);
  scene.runtimeAbortController = registry.register(new AbortController(), {
    id: "scene-async-jobs",
  });
  scene._autosaveInterval = registry.interval(
    () => scene.queueDugTilesSave?.(),
    SAVE_SCHEDULING_CONFIG.autosaveIntervalMs,
    globalThis,
    "autosave-interval",
  );
  registry.register(() => {
    scene._isShuttingDown = true;
    scene.queueDugTilesSave?.("scene-shutdown");
    void scene.flushDugTilesSave?.({ force: true, reason: "scene-shutdown" });
  }, { id: "last-valid-save-flush" });

  const shutdownEvent = Phaser.Scenes.Events.SHUTDOWN;
  const onShutdown = () => registry.dispose();
  scene.events.once(shutdownEvent, onShutdown);
  registry.register(() => scene.events.off(shutdownEvent, onShutdown), {
    id: "scene-shutdown-listener",
  });
  return registry;
}
