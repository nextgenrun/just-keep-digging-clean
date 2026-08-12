import { GraveborerWurmSystem } from "../../systems/environment/GraveborerWurmSystem.js";
import { GraveborerWurmHudSystem } from "../../systems/visual/GraveborerWurmHudSystem.js";
import { GraveborerWurmVisualSystem } from "../../systems/visual/GraveborerWurmVisualSystem.js";
import {
  USER_SETTINGS,
  keyToPhaserKey,
  normalizeKey,
} from "../../systems/UserSettings.js";
import {
  GRAVEBORER_WURM_CONFIG,
  GRAVEBORER_WURM_PHASES,
  sanitizeGraveborerWurmData,
} from "../../values/graveborerWurm.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { isHardcoreModeArmed } from "../../values/hardcoreMode.js";
import { handleGraveborerWurmEvents } from "./GraveborerWurmEventBridge.js";
import { hasEscapeClosableUi } from "./hasEscapeClosableUi.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";

function readBooleanQuery(params, name, fallback) {
  if (!params.has(name)) return fallback;
  const value = params.get(name);
  if (value === GRAVEBORER_WURM_CONFIG.featureFlags.queryEnabledValue) return true;
  if (value === GRAVEBORER_WURM_CONFIG.featureFlags.queryDisabledValue) return false;
  return fallback;
}

export function resolveGraveborerWurmFeatureFlags(
  search = globalThis.location?.search || "",
  debugMode = GAME_CONFIG.debugMode,
) {
  if (debugMode !== true) {
    return {
      enabled: GRAVEBORER_WURM_CONFIG.featureFlags.enabled,
      devTest10x: false,
    };
  }
  const params = new URLSearchParams(search);
  const flags = GRAVEBORER_WURM_CONFIG.featureFlags;
  return {
    enabled: readBooleanQuery(params, flags.enabledQuery, flags.enabled),
    devTest10x: isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.DEV_CHEATS)
      && readBooleanQuery(params, flags.devTest10xQuery, flags.devTest10x),
  };
}

export function resolveGraveborerWurmActivation(
  scene,
  playerTile,
  system,
  devForceActive = false,
) {
  const config = GRAVEBORER_WURM_CONFIG;
  const hardcoreArmed = isHardcoreModeArmed(scene.hardcoreModeData);
  const flightUnlocked = scene.upgradeSystem?.isGemPowerUnlocked?.() === true;
  const depth = Math.max(0, (playerTile?.ty || 0) - scene.config.topAirRows + 1);
  const encounterCommitted = system.phase === GRAVEBORER_WURM_PHASES.warning
    || system.phase === GRAVEBORER_WURM_PHASES.burrowing;
  const productionActive = hardcoreArmed
    && (!config.activation.requiresFlightUnlock || flightUnlocked)
    && (depth >= config.activation.minDepthTiles || encounterCommitted);
  const devOverride = isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.DEV_CHEATS)
    && (system.devTest10x === true || devForceActive === true);
  return {
    active: devOverride || productionActive,
    productionActive,
    hardcoreArmed,
    flightUnlocked,
    depth,
    depthEligible: depth >= config.activation.minDepthTiles,
    devOverride,
    devForceActive: devForceActive === true,
  };
}

export function forceGraveborerWurmEncounter(scene) {
  const runtime = scene.graveborerWurmRuntime;
  if (!runtime?.devToolsEnabled) return false;
  const controls = GRAVEBORER_WURM_CONFIG.devControls;
  if (!runtime.system.enabled) {
    scene.uiNotifications?.warning?.(
      GRAVEBORER_WURM_CONFIG.labels.devDisabled,
      { key: controls.disabledNoticeKey, durationMs: controls.noticeDurationMs },
    );
    return false;
  }
  runtime.forcedDevEncounter = true;
  runtime.devSaveIsolation = true;
  runtime.system.forceEncounter(scene.playerController?.getPlayerTile?.());
  scene.uiNotifications?.warning?.(
    GRAVEBORER_WURM_CONFIG.labels.devSummoned,
    { key: controls.summonNoticeKey, durationMs: controls.noticeDurationMs },
  );
  scene.soundSystem?.playTileHit?.();
  scene.shakeSystem?.shake?.(
    "earthquake.warning",
    controls.summonShakeIntensity,
  );
  return true;
}

function createDevSummonKeys(scene, enabled) {
  if (!enabled || !scene.input?.keyboard?.addKey) return [];
  const names = [
    ...new Set(
      (GRAVEBORER_WURM_CONFIG.devControls.summonKeyCandidates || [])
        .map(normalizeKey)
        .filter(Boolean),
    ),
  ];
  const bindings = names
    .map(name => ({ name, keyCode: keyToPhaserKey(name) }))
    .filter(binding => binding.keyCode)
    .map(binding => ({
      ...binding,
      key: scene.input.keyboard.addKey(binding.keyCode),
    }));
  scene.input.keyboard.addCapture?.(bindings.map(binding => binding.keyCode));
  return bindings;
}

function isConfiguredKey(name) {
  return Object.values(USER_SETTINGS.getKeybinds?.() || {})
    .some(boundKey => normalizeKey(boundKey) === name);
}

function consumeDevSummonInput(scene, runtime) {
  if (
    !runtime.devToolsEnabled
    || scene.gameState !== "playing"
    || scene._settingsKeyCaptureActive
    || hasEscapeClosableUi(scene)
  ) return false;
  const binding = runtime.devSummonKeys.find(candidate => !isConfiguredKey(candidate.name));
  return binding
    ? Phaser.Input.Keyboard.JustDown(binding.key) === true
    : false;
}

function installDiagnostics(scene, runtime) {
  const key = GRAVEBORER_WURM_CONFIG.diagnostics.globalKey;
  if (!runtime.devToolsEnabled || typeof globalThis.window === "undefined") return;
  const api = {
    snapshot: () => ({
      ...runtime.system.getSnapshot(),
      gate: { ...runtime.lastGate },
      flags: {
        enabled: runtime.system.enabled,
        devTest10x: runtime.system.devTest10x,
        devToolsEnabled: runtime.devToolsEnabled,
        forcedDevEncounter: runtime.forcedDevEncounter,
        saveIsolated: runtime.devSaveIsolation,
      },
      tilesCarved: runtime.tilesCarved,
      carveEventCount: runtime.carveEventCount,
      encountersCompleted: runtime.encountersCompleted,
      lastHit: runtime.lastHit ? { ...runtime.lastHit } : null,
    }),
    forceEncounter: () => forceGraveborerWurmEncounter(scene),
    addNoise: (source = "devForce") => runtime.system.recordNoise(
      source,
      scene.playerController?.getPlayerTile?.(),
    ),
    setEnabled: enabled => runtime.system.setEnabled(enabled === true),
    setDevTest10x: enabled => {
      const resolved = runtime.system.setDevTest10x(enabled === true);
      if (resolved) runtime.devSaveIsolation = true;
      return resolved;
    },
  };
  runtime.diagnosticsApi = api;
  globalThis.window[key] = api;
}

export function createGraveborerWurmRuntime(scene) {
  destroyGraveborerWurmRuntime(scene);
  const flags = resolveGraveborerWurmFeatureFlags();
  const system = new GraveborerWurmSystem(flags);
  const runtime = {
    system,
    visual: new GraveborerWurmVisualSystem(scene),
    hud: null,
    devToolsEnabled: GAME_CONFIG.debugMode === true
      && isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.DEV_CHEATS),
    devSummonKeys: [],
    forcedDevEncounter: false,
    devSaveIsolation: flags.devTest10x === true,
    lastGate: null,
    tilesCarved: 0,
    carveEventCount: 0,
    encountersCompleted: 0,
    lastHit: null,
    diagnosticsApi: null,
  };
  runtime.devSummonKeys = createDevSummonKeys(scene, runtime.devToolsEnabled);
  runtime.hud = new GraveborerWurmHudSystem(scene, GRAVEBORER_WURM_CONFIG);
  scene.graveborerWurmRuntime = runtime;
  scene.graveborerWurmSystem = system;
  scene.graveborerWurmData = system.getSaveData();
  installDiagnostics(scene, runtime);
  console.info(
    `[GraveborerWurm] runtime ready`
      + ` enabled=${system.enabled}`
      + ` devTest10x=${system.devTest10x}`
      + ` devTools=${runtime.devToolsEnabled}`,
  );
  return runtime;
}

export function updateGraveborerWurmRuntime(scene, time, delta, playerTile) {
  const runtime = scene.graveborerWurmRuntime;
  if (!runtime) return null;
  if (consumeDevSummonInput(scene, runtime)) {
    forceGraveborerWurmEncounter(scene);
  }
  runtime.lastGate = resolveGraveborerWurmActivation(
    scene,
    playerTile,
    runtime.system,
    runtime.forcedDevEncounter,
  );
  const snapshot = runtime.system.update(delta, {
    active: runtime.lastGate.active,
    playerTile,
    playerBounds: (() => {
      const body = scene.playerController?.physicsBody;
      const tileSize = scene.config?.tileSize;
      if (!body || !(tileSize > 0)) return null;
      return {
        left: body.x / tileSize,
        right: (body.x + body.w) / tileSize,
        top: body.y / tileSize,
        bottom: (body.y + body.h) / tileSize,
      };
    })(),
    worldWidthTiles: scene.config.worldWidthTiles,
    depth: runtime.lastGate.depth,
  });
  handleGraveborerWurmEvents(scene, runtime);
  runtime.visual.update(runtime.system.getRenderState(time), time);
  runtime.hud.update(snapshot, time);
  return snapshot;
}

export function recordGraveborerWurmMiningNoise(scene, source, tile) {
  const runtime = scene.graveborerWurmRuntime;
  if (!runtime) return 0;
  const devOverride = runtime.system.devTest10x === true;
  if (!devOverride) {
    const playerTile = scene.playerController?.getPlayerTile?.();
    const depth = Math.max(
      0,
      (playerTile?.ty || 0) - scene.config.topAirRows + 1,
    );
    if (
      !isHardcoreModeArmed(scene.hardcoreModeData)
      || scene.upgradeSystem?.isGemPowerUnlocked?.() !== true
      || depth < GRAVEBORER_WURM_CONFIG.activation.minDepthTiles
    ) {
      return runtime.system.noise;
    }
  }
  return runtime.system.recordNoise(source, tile);
}

export function loadGraveborerWurmSaveData(scene, data) {
  const loaded = scene.graveborerWurmRuntime?.system?.loadSaveData?.(data)
    || sanitizeGraveborerWurmData(data);
  scene.graveborerWurmData = loaded;
  return loaded;
}

export function getGraveborerWurmSaveData(scene) {
  const runtime = scene.graveborerWurmRuntime;
  if (!runtime) return sanitizeGraveborerWurmData(scene.graveborerWurmData);
  // The Wurm is Hardcore-only save data. Developer previews never contaminate
  // Casual or pending-oath slots, regardless of how the encounter was forced.
  if (
    runtime.devSaveIsolation === true
    || !isHardcoreModeArmed(scene.hardcoreModeData)
  ) {
    const cleanDevData = sanitizeGraveborerWurmData({
      cooldownMs: GRAVEBORER_WURM_CONFIG.timing.initialCooldownMs,
    });
    scene.graveborerWurmData = cleanDevData;
    return cleanDevData;
  }
  const saveData = runtime.system.getSaveData();
  scene.graveborerWurmData = saveData;
  return saveData;
}

export function destroyGraveborerWurmRuntime(scene) {
  const runtime = scene.graveborerWurmRuntime;
  if (!runtime) return;
  scene.graveborerWurmData = getGraveborerWurmSaveData(scene);
  scene.graveborerWurmRuntime = scene.graveborerWurmSystem = null;
  const key = GRAVEBORER_WURM_CONFIG.diagnostics.globalKey;
  if (
    typeof globalThis.window !== "undefined"
    && globalThis.window[key] === runtime.diagnosticsApi
  ) {
    delete globalThis.window[key];
  }
  runtime.visual?.destroy?.();
  runtime.hud?.destroy?.();
  runtime.devSummonKeys?.forEach(binding => binding.key?.destroy?.());
  runtime.devSummonKeys = [];
}
