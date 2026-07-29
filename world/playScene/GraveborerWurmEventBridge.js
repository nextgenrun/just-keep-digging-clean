import {
  GRAVEBORER_WURM_CONFIG,
  GRAVEBORER_WURM_PHASES,
} from "../../values/graveborerWurm.js";
import { RESOURCE_TILE_TYPE_VALUES } from "../../values/resourceTypes.js";

const CARVABLE_WURM_TILE_TYPES = new Set(RESOURCE_TILE_TYPE_VALUES);

function carveNaturalTerrain(scene, runtime, event) {
  const world = scene.worldModel;
  if (
    runtime.lastGate?.productionActive !== true
    || !world
    || !event?.point
    || !event?.tangent
  ) {
    return;
  }
  const normal = { x: -event.tangent.y, y: event.tangent.x };
  const dominantNormal = Math.abs(normal.x) >= Math.abs(normal.y)
    ? { x: Math.sign(normal.x) || 1, y: 0 }
    : { x: 0, y: Math.sign(normal.y) || 1 };
  const candidates = new Map();
  GRAVEBORER_WURM_CONFIG.path.carveLaneOffsetsTiles.forEach(offset => {
    const tx = Math.round(event.point.x) + dominantNormal.x * offset;
    const ty = Math.round(event.point.y) + dominantNormal.y * offset;
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
  const gpBeforeHit = Math.max(0, controller?.getGemPowerExact?.() || 0);
  const maxGp = Math.max(1, controller?.getGemPowerMax?.() || 1);
  const isHead = event.part === "head";
  const ratio = Number.isFinite(event.damageRatio)
    ? event.damageRatio
    : isHead
      ? GRAVEBORER_WURM_CONFIG.combat.headDamageMaxGpRatio
      : GRAVEBORER_WURM_CONFIG.combat.bodyDamageMaxGpRatio;
  const minimum = Number.isFinite(event.minimumDamageGp)
    ? event.minimumDamageGp
    : isHead
      ? GRAVEBORER_WURM_CONFIG.combat.minimumHeadDamageGp
      : GRAVEBORER_WURM_CONFIG.combat.minimumBodyDamageGp;
  const requested = Math.max(minimum, Math.ceil(maxGp * ratio));
  const consumed = controller?.consumeGemPower?.(requested, {
    source: "graveborerWurm",
    part: event.part,
    hazard: true,
  }) || 0;
  const casualDevSafety = runtime.lastGate?.devOverride === true
    && runtime.lastGate?.hardcoreArmed !== true;
  if (casualDevSafety) {
    controller?.setGemPowerExact?.(gpBeforeHit, {
      silent: true,
      source: "graveborer-dev-restore",
    });
  }
  const remaining = Math.max(0, controller?.getGemPowerExact?.() || 0);
  const remainingRatio = remaining / maxGp;
  const hitPrefix = remaining <= 0
    ? GRAVEBORER_WURM_CONFIG.labels.fatalHitPrefix
    : remainingRatio <= GRAVEBORER_WURM_CONFIG.combat.criticalRemainingMaxGpRatio
      ? GRAVEBORER_WURM_CONFIG.labels.criticalHitPrefix
      : GRAVEBORER_WURM_CONFIG.labels.hitPrefix;
  const dangerSuffix = remaining <= 1 && runtime.lastGate?.hardcoreArmed
    ? "  •  ONE TOUCH FROM PERMADEATH"
    : remaining <= 1
      ? "  •  CASUAL SAVE REMAINS SAFE"
      : "";
  scene.uiNotifications?.danger?.(
    `${hitPrefix}`
      + `  •  ${GRAVEBORER_WURM_CONFIG.labels.passPrefix} ${event.passIndex}/${event.passCount}`
      + `  •  -${Math.ceil(consumed)} GP`
      + `  •  ${Math.floor(remaining)} GP LEFT${dangerSuffix}`,
    { key: "graveborer-wurm-hit", durationMs: 5200 },
  );
  scene.soundSystem?.playTileBreak?.({ volume: 0.95, rate: 0.62 });
  scene.shakeSystem?.shake?.("earthquake.caveIn", 1.05);
  runtime.lastHit = {
    part: event.part,
    requestedGp: requested,
    consumedGp: consumed,
    remainingGp: remaining,
    remainingRatio,
    passIndex: event.passIndex,
    passCount: event.passCount,
  };
  scene.queueDugTilesSave?.();
}

export function handleGraveborerWurmEvents(scene, runtime) {
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
      scene.soundSystem?.playTileHit?.();
      scene.shakeSystem?.shake?.("earthquake.warning", 0.62);
      scene.queueDugTilesSave?.();
      return;
    }
    if (event.type === "phase" && event.phase === GRAVEBORER_WURM_PHASES.burrowing) {
      scene.soundSystem?.playTileBreak?.({ volume: 0.82, rate: 0.68 });
      scene.shakeSystem?.shake?.("earthquake.caveIn", 0.72);
      return;
    }
    if (event.type === "encounter-complete") {
      runtime.encountersCompleted += 1;
      runtime.forcedDevEncounter = false;
      if (runtime.tilesCarved > 0) scene.queueDugTilesSave?.();
      runtime.tilesCarved = 0;
    }
  });
}
