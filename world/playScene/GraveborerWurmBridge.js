import { GraveborerWurmSystem } from "../../systems/environment/GraveborerWurmSystem.js";
import { GraveborerWurmHudSystem } from "../../systems/visual/GraveborerWurmHudSystem.js";
import { GraveborerWurmVisualSystem } from "../../systems/visual/GraveborerWurmVisualSystem.js";
import {
  GRAVEBORER_WURM_CONFIG,
  GRAVEBORER_WURM_PHASES,
  sanitizeGraveborerWurmData,
} from "../../values/graveborerWurm.js";
import { isHardcoreModeArmed } from "../../values/hardcoreMode.js";
import { RESOURCE_TILE_TYPE_VALUES } from "../../values/resourceTypes.js";

const CARVABLE_WURM_TILE_TYPES = new Set(RESOURCE_TILE_TYPE_VALUES);

function readBooleanQuery(params, name, fallback) {
  if (!params.has(name)) return fallback;
  const value = params.get(name);
  if (value === GRAVEBORER_WURM_CONFIG.featureFlags.queryEnabledValue) return true;
  if (value === GRAVEBORER_WURM_CONFIG.featureFlags.queryDisabledValue) return false;
  return fallback;
}

export function resolveGraveborerWurmFeatureFlags(search = globalThis.location?.search || "") {
  const params = new URLSearchParams(search);
  const flags = GRAVEBORER_WURM_CONFIG.featureFlags;
  return {
    enabled: readBooleanQuery(params, flags.enabledQuery, flags.enabled),
    devTest10x: readBooleanQuery(params, flags.devTest10xQuery, flags.devTest10x),
  };
}

export function resolveGraveborerWurmActivation(scene, playerTile, system) {
  const config = GRAVEBORER_WURM_CONFIG;
  const hardcoreArmed = isHardcoreModeArmed(scene.hardcoreModeData);
  const flightUnlocked = scene.upgradeSystem?.isGemPowerUnlocked?.() === true;
  const depth = Math.max(0, (playerTile?.ty || 0) - scene.config.topAirRows + 1);
  const encounterCommitted = system.phase === GRAVEBORER_WURM_PHASES.warning
    || system.phase === GRAVEBORER_WURM_PHASES.burrowing;
  const productionActive = hardcoreArmed
    && (!config.activation.requiresFlightUnlock || flightUnlocked)
    && (depth >= config.activation.minDepthTiles || encounterCommitted);
  return {
    active: system.devTest10x === true || productionActive,
    productionActive,
    hardcoreArmed,
    flightUnlocked,
    depth,
    depthEligible: depth >= config.activation.minDepthTiles,
    devOverride: system.devTest10x === true,
  };
}

function carveNaturalTerrain(scene, runtime, event) {
  const world = scene.worldModel;
  if (!world || !event?.point || !event?.tangent) return;
  const normal = { x: -event.tangent.y, y: event.tangent.x };
  const offsets = [
    0,
    GRAVEBORER_WURM_CONFIG.path.carvePerpendicularTiles,
    -GRAVEBORER_WURM_CONFIG.path.carvePerpendicularTiles,
  ];
  const candidates = new Map();
  offsets.forEach(offset => {
    const tx = Math.round(event.point.x + normal.x * offset);
    const ty = Math.round(event.point.y + normal.y * offset);
    candidates.set(`${tx},${ty}`, { tx, ty });
  });

  let firstDestroyed = null;
  candidates.forEach(({ tx, ty }) => {
    if (!world.inBounds(tx, ty) || ty <= scene.config.topAirRows) return;
    const tileType = world.getTileType(tx, ty);
    if (!CARVABLE_WURM_TILE_TYPES.has(tileType)) return;
    const result = world.damageTile(tx, ty, Number.MAX_SAFE_INTEGER);
    if (!result?.destroyed) return;
    runtime.tilesCarved += 1;
    firstDestroyed ||= { tx, ty, tileType };
    scene.worldRenderer?.applyTileUpdate?.(tx, ty);
  });

  runtime.carveEventCount += 1;
  if (firstDestroyed && runtime.carveEventCount % 4 === 0) {
    const worldX = firstDestroyed.tx * scene.config.tileSize + scene.config.tileSize / 2;
    const worldY = firstDestroyed.ty * scene.config.tileSize + scene.config.tileSize / 2;
    scene._applyDestroyParticles?.(worldX, worldY, firstDestroyed.tileType);
    scene.soundSystem?.playTileBreak?.({
      volume: 0.5,
      rate: 0.72 + (runtime.carveEventCount % 3) * 0.08,
    });
  }
  if (firstDestroyed && runtime.carveEventCount % 9 === 0) {
    scene.shakeSystem?.shake?.("earthquake.rockImpact", 0.35);
  }
}

function applyWurmHit(scene, runtime, event) {
  const controller = scene.playerController;
  const maxGp = Math.max(1, controller?.getGemPowerMax?.() || 1);
  const isHead = event.part === "head";
  const ratio = isHead
    ? GRAVEBORER_WURM_CONFIG.combat.headDamageMaxGpRatio
    : GRAVEBORER_WURM_CONFIG.combat.bodyDamageMaxGpRatio;
  const minimum = isHead
    ? GRAVEBORER_WURM_CONFIG.combat.minimumHeadDamageGp
    : GRAVEBORER_WURM_CONFIG.combat.minimumBodyDamageGp;
  const requested = Math.max(minimum, Math.ceil(maxGp * ratio));
  const consumed = controller?.consumeGemPower?.(requested) || 0;
  const remaining = Math.max(0, controller?.getGemPowerRaw?.() || 0);
  const playerTile = controller?.getPlayerTile?.();
  if (playerTile && consumed > 0) {
    const x = playerTile.tx * scene.config.tileSize + scene.config.tileSize / 2;
    const y = playerTile.ty * scene.config.tileSize + scene.config.tileSize / 2;
    scene.floatingTextSystem?.showFloatingText?.(
      x,
      y - scene.config.tileSize,
      `-${Math.ceil(consumed)} GP`,
      "#ff5548",
      1500,
      25,
    );
  }
  scene.uiNotifications?.danger?.(
    `${GRAVEBORER_WURM_CONFIG.labels.hitPrefix}  •  -${Math.ceil(consumed)} GP`
      + `  •  ${remaining} GP LEFT`,
    { key: "graveborer-wurm-hit", durationMs: 5200 },
  );
  scene.hudSystem?.flashStatus?.(
    remaining <= 1 && runtime.lastGate?.hardcoreArmed
      ? `${remaining} GP — ONE TOUCH FROM PERMADEATH`
      : remaining <= 1
        ? `DEV WURM TEST — CASUAL SAVE SAFE AT ${remaining} GP`
      : `GRAVEBORER IMPACT — ${remaining} GP REMAINING`,
    "#ff5c50",
    4200,
  );
  scene.soundSystem?.playTileBreak?.({ volume: 0.95, rate: 0.62 });
  scene.shakeSystem?.shake?.("earthquake.caveIn", 1.05);
  runtime.lastHit = {
    part: event.part,
    requestedGp: requested,
    consumedGp: consumed,
    remainingGp: remaining,
  };
  scene.queueDugTilesSave?.();

  if (remaining <= 0 && runtime.lastGate?.hardcoreArmed) {
    const deathEvent = { source: "graveborer-wurm", part: event.part };
    scene.events?.emit?.("hardcore-gp-depleted", deathEvent);
    scene.handleHardcoreGpDepleted?.(deathEvent);
  }
}

function handleWurmEvents(scene, runtime) {
  runtime.system.drainEvents().forEach(event => {
    if (event.type === "carve") {
      carveNaturalTerrain(scene, runtime, event);
      return;
    }
    if (event.type === "hit") {
      applyWurmHit(scene, runtime, event);
      return;
    }
    if (event.type === "phase" && event.phase === GRAVEBORER_WURM_PHASES.warning) {
      scene.uiNotifications?.warning?.(
        "GRAVEBORER WURM  •  PATH MARKED  •  MOVE BEFORE IT BREACHES",
        { key: "graveborer-wurm-warning", durationMs: 4300 },
      );
      scene.soundSystem?.playTileHit?.();
      scene.shakeSystem?.shake?.("earthquake.warning", 0.62);
      scene.queueDugTilesSave?.();
      return;
    }
    if (event.type === "phase" && event.phase === GRAVEBORER_WURM_PHASES.burrowing) {
      scene.uiNotifications?.danger?.(
        "GRAVEBORER BREACH  •  FLY OR CLEAR THE COMMITTED LINE",
        { key: "graveborer-wurm-breach", durationMs: 3400 },
      );
      scene.soundSystem?.playTileBreak?.({ volume: 0.82, rate: 0.68 });
      scene.shakeSystem?.shake?.("earthquake.caveIn", 0.72);
      return;
    }
    if (event.type === "encounter-complete") {
      runtime.encountersCompleted += 1;
      if (!event.didHit) {
        scene.hudSystem?.flashStatus?.(
          GRAVEBORER_WURM_CONFIG.labels.missed,
          "#e7be78",
          2200,
        );
      }
      if (runtime.tilesCarved > 0) scene.queueDugTilesSave?.();
      runtime.tilesCarved = 0;
    }
  });
}

function installDiagnostics(scene, runtime) {
  const key = GRAVEBORER_WURM_CONFIG.diagnostics.globalKey;
  if (typeof globalThis.window === "undefined") return;
  const api = {
    snapshot: () => ({
      ...runtime.system.getSnapshot(),
      gate: { ...runtime.lastGate },
      flags: {
        enabled: runtime.system.enabled,
        devTest10x: runtime.system.devTest10x,
      },
      tilesCarved: runtime.tilesCarved,
      carveEventCount: runtime.carveEventCount,
      encountersCompleted: runtime.encountersCompleted,
      lastHit: runtime.lastHit ? { ...runtime.lastHit } : null,
    }),
    forceEncounter: () => runtime.system.forceEncounter(
      scene.playerController?.getPlayerTile?.(),
    ),
    addNoise: (source = "devForce") => runtime.system.recordNoise(
      source,
      scene.playerController?.getPlayerTile?.(),
    ),
    setEnabled: enabled => runtime.system.setEnabled(enabled === true),
    setDevTest10x: enabled => runtime.system.setDevTest10x(enabled === true),
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
    hud: new GraveborerWurmHudSystem(scene),
    lastGate: null,
    tilesCarved: 0,
    carveEventCount: 0,
    encountersCompleted: 0,
    lastHit: null,
    diagnosticsApi: null,
  };
  scene.graveborerWurmRuntime = runtime;
  scene.graveborerWurmSystem = system;
  installDiagnostics(scene, runtime);
  console.info(
    `[GraveborerWurm] runtime ready`
      + ` enabled=${system.enabled}`
      + ` devTest10x=${system.devTest10x}`,
  );
  return runtime;
}

export function updateGraveborerWurmRuntime(scene, time, delta, playerTile) {
  const runtime = scene.graveborerWurmRuntime;
  if (!runtime) return null;
  runtime.lastGate = resolveGraveborerWurmActivation(
    scene,
    playerTile,
    runtime.system,
  );
  const snapshot = runtime.system.update(delta, {
    active: runtime.lastGate.active,
    playerTile,
    worldWidthTiles: scene.config.worldWidthTiles,
  });
  handleWurmEvents(scene, runtime);
  runtime.visual.update(runtime.system.getRenderState(time), time);
  runtime.hud.update(snapshot, time);
  return snapshot;
}

export function recordGraveborerWurmMiningNoise(scene, source, tile) {
  const runtime = scene.graveborerWurmRuntime;
  if (!runtime) return 0;
  const devOverride = runtime.system.devTest10x === true;
  if (!devOverride && !isHardcoreModeArmed(scene.hardcoreModeData)) {
    return runtime.system.noise;
  }
  return runtime.system.recordNoise(source, tile);
}

export function loadGraveborerWurmSaveData(scene, data) {
  return scene.graveborerWurmRuntime?.system?.loadSaveData?.(data) || null;
}

export function getGraveborerWurmSaveData(scene) {
  const runtime = scene.graveborerWurmRuntime;
  if (!runtime) return sanitizeGraveborerWurmData(null);
  // Developer override encounters must never arm or contaminate a Casual save.
  if (runtime.system.devTest10x && !isHardcoreModeArmed(scene.hardcoreModeData)) {
    return sanitizeGraveborerWurmData({
      encounterCount: runtime.system.encounterCount,
      cooldownMs: GRAVEBORER_WURM_CONFIG.timing.initialCooldownMs,
    });
  }
  return runtime.system.getSaveData();
}

export function destroyGraveborerWurmRuntime(scene) {
  const runtime = scene.graveborerWurmRuntime;
  if (!runtime) return;
  const key = GRAVEBORER_WURM_CONFIG.diagnostics.globalKey;
  if (
    typeof globalThis.window !== "undefined"
    && globalThis.window[key] === runtime.diagnosticsApi
  ) {
    delete globalThis.window[key];
  }
  runtime.visual?.destroy?.();
  runtime.hud?.destroy?.();
  scene.graveborerWurmRuntime = null;
  scene.graveborerWurmSystem = null;
}
