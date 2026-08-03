import { GAME_CONFIG } from "../values/gameConfig.js";
import { RESOURCE_BY_TILE_TYPE } from "../values/resourceTypes.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_LANDMARKS } from "../values/worldVisualLandmarks.js";
import { SECOND_WORLD_CONFIG } from "../values/secondWorldConfig.js";
import { TITAN_DISCOVERY_CONFIG } from "../values/titanDiscoveries.js";
import { V11_SKY_ISLAND_LAYOUT } from "../values/v11SkyIslandLayout.js";
import { HEAVENBLOCKS_ACCESS_CONFIG } from "../values/heavenblocksAccessConfig.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../values/heavenblocksVisualConfig.js";
import { resolveWorldVisualLandmarkAnchor } from "../world/rendering/scenic-world/WorldVisualLandmarkLayer.js";
import { createTitanE2EPreviewController } from "./JkdE2ETitanPreview.js";

const BACKGROUND_PREVIEW_DEPTHS = Object.freeze([
  100, 350, 700, 1100, 1450, 1800, 2500, 3500, 4500, 4990,
]);
const BACKGROUND_PREVIEW_RANGES = Object.freeze({
  level1: Object.freeze({ minX: 1, maxX: 112 }),
  level2: Object.freeze({ minX: 113, maxX: 278 }),
});
const SURFACE_BENCHMARK_PREVIEW_TILES = Object.freeze([4, 12, 14, 33, 63]);
const SURFACE_PROP_PREVIEW_TILES = Object.freeze([
  40, 63, 89, 109,
  155, 169, 182, 195, 209, 231, 251, 271,
]);
const STAR_PILLAR_PREVIEW_COUNTS = Object.freeze([0, 1, 3, 5, 7, 10]);
const TEXTURE_AUDIT_RESOURCE_TYPES = Object.freeze([
  TILE_TYPES.STONE,
  TILE_TYPES.COPPER,
  TILE_TYPES.BRONZE,
  TILE_TYPES.IRON,
  TILE_TYPES.STEEL,
  TILE_TYPES.SILVER,
  TILE_TYPES.GOLD,
  TILE_TYPES.OBSIDIAN,
  TILE_TYPES.EMBER_ORE,
  TILE_TYPES.MAGMA_CRYSTAL,
]);
const TEXTURE_AUDIT_SPECIAL_TYPES = Object.freeze([
  TILE_TYPES.TELEPORT_TILE,
  TILE_TYPES.GAMBLE_TILE,
  TILE_TYPES.GEM_POWER_BLOCK,
  TILE_TYPES.SPEED_BLOCK,
  TILE_TYPES.XP_BLOCK,
  TILE_TYPES.CRIT_BLOCK,
  TILE_TYPES.BERSERK_BLOCK,
  TILE_TYPES.COMBO_BLOCK,
  TILE_TYPES.LEGEND_BLOCK,
  TILE_TYPES.ANCIENT_RELIC_CACHE,
]);

function e2eEnabled() {
  if (!GAME_CONFIG.debugMode || typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("jkd_e2e");
  } catch (_) {
    return false;
  }
}

function safeCall(fn, fallback = null) {
  try {
    return fn();
  } catch (error) {
    return fallback;
  }
}

function center(scene) {
  return {
    x: scene.config?.viewportWidth ? scene.config.viewportWidth / 2 : 640,
    y: scene.config?.viewportHeight ? scene.config.viewportHeight / 2 : 360,
  };
}

function closeTransientUi(scene) {
  if (!scene) return;
  const wasPaused = scene.gameState === "paused";
  scene.shopOverlay?.hide?.();
  scene.uiInventoryPopup?.close?.();
  scene.openingFlightArtifactSystem?.view?.hideHud?.();
  scene.campfireSystem?._closeBuffSelection?.();
  scene.milestoneBoardSystem?._closeBoardView?.();
  if (scene.depthGateSystem?.isOpen?.()) scene.depthGateSystem._decline?.();
  if (scene._pillarViewActive && scene.starPillarSystem) {
    scene.starPillarSystem.closeConstellationView?.();
  }
  scene.hidePauseMenu?.();
  if (scene.overlayManager?.overlayBackdrop?.visible) {
    scene.hideOverlay?.();
    if (scene.gameState === "dialog" || scene.gameState === "dead") {
      scene.gameState = "playing";
    }
  }
  if (wasPaused) scene.gameState = "playing";
  scene.playerController?.setControlsEnabled?.(scene.gameState === "playing");
}

function openDepthGate(scene, threshold) {
  const title = `DEPTH WARNING: ${threshold}M`;
  scene.depthGateSystem?._open?.({
    threshold,
    title,
    message: `E2E depth confirmation at ${threshold}m.`,
  });
}

function getTargets(scene) {
  const { x: cx, y: cy } = center(scene);
  return {
    pause: {
      generalTab: { x: cx - 120, y: cy - 158 },
      statsTab: { x: cx, y: cy - 158 },
      settingsTab: { x: cx + 120, y: cy - 158 },
      resume: { x: cx, y: cy - 92 },
      save: { x: cx, y: cy - 34 },
      unstuck: { x: cx, y: cy + 24 },
      mainMenu: { x: cx, y: cy + 82 },
    },
    settings: {
      audioTab: { x: cx - 104, y: cy - 84 },
      controlsTab: { x: cx, y: cy - 84 },
      displayTab: { x: cx + 104, y: cy - 84 },
      firstSlider: { x: cx + 160, y: cy - 56 },
      firstToggle: { x: cx + 158, y: cy + 84 },
      firstKeybind: { x: cx - 86, y: cy - 64 },
      resetSettings: { x: cx + 174, y: cy + 106 },
    },
    shop: {
      firstCard: { x: cx - 260, y: cy - 111 },
      secondCard: { x: cx, y: cy - 111 },
      prevPage: { x: cx - 250, y: cy + 270 },
      nextPage: { x: cx + 250, y: cy + 270 },
      close: { x: cx + 350, y: cy - 270 },
      sellAll: { x: cx + 300, y: cy + 206 },
      firstSell: { x: cx - 58, y: cy + 218 },
    },
    inventory: {
      close: { x: cx + 296, y: cy - 304 },
      backdrop: { x: 24, y: 24 },
    },
    levelUp: {
      option1: { x: cx - 142, y: cy + 63 },
      option2: { x: cx + 142, y: cy + 63 },
      continue: { x: cx, y: cy + 242 },
    },
    campfire: {
      close: { x: cx + 167, y: cy - 166 },
      firstBuff: { x: cx, y: cy - 86 },
    },
    milestone: {
      close: { x: cx + 238, y: cy - 222 },
    },
    depthGate: {
      yes: { x: cx - 82, y: cy + 46 },
      no: { x: cx + 88, y: cy + 46 },
    },
    overlay: {
      center: { x: cx, y: cy },
      close: { x: cx + 350, y: cy - 222 },
    },
    fullscreen: {
      button: { x: scene.config.viewportWidth - 28, y: scene.config.viewportHeight - 28 },
    },
  };
}

function getState(scene) {
  const playerTile = safeCall(() => scene.playerController?.getPlayerTile?.(), null);
  const playerBody = scene.playerController?.physicsBody || null;
  return {
    active: Boolean(scene?.scene?.isActive?.()),
    sceneKey: scene?.scene?.key || null,
    gameState: scene?.gameState || null,
    controlsEnabled: Boolean(scene.playerController?.input?.controlsEnabled),
    playerTile,
    playerPosition: playerBody ? { x: playerBody.x, y: playerBody.y } : null,
    pauseOpen: Boolean(scene._pausePanel),
    settingsCaptureActive: Boolean(scene._settingsKeyCaptureActive),
    shopVisible: Boolean(scene.shopOverlay?.isVisible),
    shopMerchant: scene.shopOverlay?.currentMerchant || null,
    shopMode: scene.shopOverlay?.moneyMonsterMode || null,
    inventoryOpen: Boolean(scene.uiInventoryPopup?.isOpen),
    level: scene.playerLevelSystem?.level || 1,
    levelUpBlocking: false,
    campfireOpen: Boolean(scene.campfireSystem?.isSelecting?.()),
    milestoneOpen: Boolean(scene.milestoneBoardSystem?._isBoardOpen),
    starChartOpen: Boolean(scene._pillarViewActive || scene.starPillarSystem?._isViewOpen),
    starHeart: scene.starHeartProgressionSystem?.getSnapshot?.() || null,
    celestialEngine: scene.celestialEngineController?.getHealthSnapshot?.() || null,
    caveHazards: scene.caveHazardSystem?.getSnapshot?.() || null,
    depthGateOpen: Boolean(scene.depthGateSystem?.isOpen?.()),
    depthGateThreshold: scene.depthGateSystem?.activeGate?.threshold || null,
    dialogVisible: Boolean(scene.overlayManager?.shell?.root?.visible),
    fullscreen: {
      isFullscreen: Boolean(window.__isGameFullscreen?.()),
      hasToggle: typeof window.__toggleGameFullscreen === "function",
    },
    errors: window.__jkdUiErrors || [],
  };
}

function openSurface(scene, surface, options = {}) {
  if (!scene?.scene?.isActive?.()) return { ok: false, reason: "play-scene-not-active" };

  closeTransientUi(scene);
  if (scene.gameState !== "playing") {
    scene.gameState = "playing";
    scene.playerController?.setControlsEnabled?.(true);
  }

  switch (surface) {
    case "pause":
      scene.showPauseMenu?.();
      break;
    case "pauseSettings":
      scene.showPauseMenu?.();
      scene._pausePanel?.state?.tabs?.setActive?.(
        Math.max(0, scene._pausePanel?.state?.tabKeys?.indexOf("settings") ?? 0),
      );
      if (options.settingsTab) {
        const tabIndex = { audio: 0, controls: 1, display: 2 }[options.settingsTab] ?? 0;
        const settingsContent = scene._pausePanel?.state?.contentObjects?.find(obj => obj?.tabs?.setActive);
        settingsContent?.setTab?.(tabIndex);
        if (options.captureAction) {
          settingsContent?.capture?.(options.captureAction);
        }
      }
      break;
    case "playerUpgrades":
    case "gearMerchant":
    case "gemPowerMerchant":
    case "boboMerchant":
      scene.shopOverlay?.show?.(surface);
      break;
    case "moneyMonster":
      scene.shopOverlay?.show?.("moneyMonster");
      if (options.sellMode !== false && scene.shopOverlay?.moneyMonsterMode === "buy") {
        scene.shopOverlay.toggleMoneyMonsterMode?.();
      }
      break;
    case "inventory":
      scene.uiInventoryPopup?.open?.();
      break;
    case "levelChoice":
    case "levelContinue":
      scene.hudSystem?.flashStatus?.(
        "LEVEL UPS ARE AUTOMATIC AND NONBLOCKING",
        "#76f4ff",
        1600,
      );
      break;
    case "campfire":
      scene.campfireSystem?._openBuffSelection?.();
      break;
    case "milestone":
      scene.milestoneBoardSystem?._openBoardView?.();
      break;
    case "starChart":
      scene.starPillarSystem?.openConstellationView?.();
      break;
    case "depth100":
      openDepthGate(scene, 100);
      break;
    case "depth300":
      openDepthGate(scene, 300);
      break;
    case "depth1000":
      openDepthGate(scene, 1000);
      break;
    case "dialog":
      scene.showGameDialog?.("E2E Dialog", "E2E modal dialog.\nPress any key or interact to close.");
      break;
    case "death":
      scene.gameState = "playing";
      scene.enterDeathState?.(999);
      break;
    default:
      return { ok: false, reason: `unknown-surface:${surface}` };
  }

  return { ok: true, state: getState(scene) };
}

function forcePlayerState(scene, options = {}) {
  const tx = Number.isFinite(options.tx)
    ? options.tx
    : (Number.isFinite(scene.config.playerSpawnTileX) ? scene.config.playerSpawnTileX : scene.config.spawnTileX);
  const ty = Number.isFinite(options.ty)
    ? options.ty
    : (Number.isFinite(scene.config.playerSpawnTileY) ? scene.config.playerSpawnTileY : scene.config.spawnTileY);
  scene.playerController?.teleportToTile?.(tx, ty);
  scene.playerController?.setControlsEnabled?.(options.controlsEnabled !== false);
  if (Number.isFinite(options.money)) {
    scene.upgradeSystem?.setMoney?.(options.money);
  } else if (Number.isFinite(options.addMoney)) {
    scene.upgradeSystem?.addMoney?.(options.addMoney);
  }
  if (options.resources && scene.digSystem?.setResourceTotals) {
    scene.digSystem.setResourceTotals(options.resources);
  }
  return getState(scene);
}

function buildTextureAuditGallery(scene, mode = "sparse") {
  const model = scene.worldModel;
  if (!model || !scene.worldRenderer) return { ok: false, reason: "world-not-ready" };
  closeTransientUi(scene);

  const left = Math.max(2, (scene.config.spawnTileX || 28) - 5);
  const top = Math.min(model.depth - 10, GAME_CONFIG.topAirRows + 16);
  const width = 12;
  const height = 8;
  const setTile = (tx, ty, type) => {
    const hp = type === TILE_TYPES.AIR ? 0 : model.getTileMaxHp(tx, ty, type);
    model.setTile(tx, ty, type, hp);
    scene.worldRenderer.applyTileUpdate(tx, ty);
  };

  for (let ty = top; ty < top + height; ty += 1) {
    for (let tx = left; tx < left + width; tx += 1) {
      setTile(tx, ty, TILE_TYPES.DARK_DIRT_NORMAL);
    }
  }

  if (mode === "dense") {
    for (let row = 1; row < height - 1; row += 1) {
      for (let column = 1; column < width - 1; column += 1) {
        const type = TEXTURE_AUDIT_RESOURCE_TYPES[
          (column - 1 + (row - 1) * (width - 2)) % TEXTURE_AUDIT_RESOURCE_TYPES.length
        ];
        setTile(left + column, top + row, type);
      }
    }
    for (let column = 1; column < width - 1; column += 1) {
      setTile(left + column, top + 3, TILE_TYPES.AIR);
      setTile(left + column, top + 4, TILE_TYPES.AIR);
    }
  } else {
    for (let column = 1; column < width - 1; column += 1) {
      setTile(left + column, top + 2, TEXTURE_AUDIT_SPECIAL_TYPES[column - 1]);
      setTile(left + column, top + 5, TEXTURE_AUDIT_RESOURCE_TYPES[column - 1]);
      setTile(left + column, top + 3, TILE_TYPES.AIR);
      setTile(left + column, top + 4, TILE_TYPES.AIR);
    }
  }

  const playerTile = { tx: left + Math.floor(width / 2), ty: top + 4 };
  forcePlayerState(scene, playerTile);
  scene.weatherSystem?.forceWeather?.("clear", 0, 10 * 60 * 1000);
  scene.worldRenderer?.invalidate?.();
  console.info(
    `[JkdE2EHarness] Opaque ImageGen texture audit ${mode} gallery at `
    + `${left},${top}; save writes remain disabled`
  );
  return { ok: true, mode, left, top, width, height, playerTile };
}

function findBackgroundPreviewTile(scene, level, depth) {
  const range = BACKGROUND_PREVIEW_RANGES[level];
  const targetY = GAME_CONFIG.topAirRows + depth;
  let best = null;
  for (let y = Math.max(GAME_CONFIG.topAirRows, targetY - 48); y <= Math.min(GAME_CONFIG.worldDepthTiles - 3, targetY + 48); y++) {
    for (let x = range.minX; x <= range.maxX; x++) {
      if (scene.worldModel?.isSolid?.(x, y) || !scene.worldModel?.isSolid?.(x, y + 1)) continue;
      let nearbyAir = 0;
      for (let oy = -3; oy <= 1; oy++) {
        for (let ox = -4; ox <= 4; ox++) {
          if (!scene.worldModel?.isSolid?.(x + ox, y + oy)) nearbyAir++;
        }
      }
      const score = nearbyAir * 10 - Math.abs(y - targetY) - Math.abs(x - (range.minX + range.maxX) / 2) * 0.02;
      if (!best || score > best.score) best = { tx: x, ty: y, score };
    }
  }
  return best || { tx: range.minX + 4, ty: targetY };
}

function findSemanticPreview(scene, predicate) {
  const model = scene.worldModel;
  if (!model) return null;
  const offsets = [];
  for (let radius = 1; radius <= 8; radius += 1) {
    for (let oy = -radius; oy <= radius; oy += 1) {
      for (let ox = -radius; ox <= radius; ox += 1) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== radius) continue;
        offsets.push({ ox, oy });
      }
    }
  }
  for (let ty = GAME_CONFIG.topAirRows; ty < model.depth; ty += 1) {
    for (let tx = 0; tx < model.width; tx += 1) {
      const type = model.getTileType(tx, ty);
      if (!predicate(type)) continue;
      for (const { ox, oy } of offsets) {
        const playerTx = tx + ox;
        const playerTy = ty + oy;
        if (playerTx < 1 || playerTx >= model.width - 1 || playerTy < 1 || playerTy >= model.depth - 1) continue;
        if (model.isSolid(playerTx, playerTy) || !model.isSolid(playerTx, playerTy + 1)) continue;
        return { targetTx: tx, targetTy: ty, playerTx, playerTy, type };
      }
    }
  }
  return null;
}

function findOpenAdjacentTile(scene, tx, ty) {
  const candidates = [
    { tx: tx - 1, ty },
    { tx: tx + 1, ty },
    { tx, ty: ty - 1 },
    { tx, ty: ty + 1 },
  ];
  return candidates.find((tile) => (
    scene.worldModel?.inBounds?.(tile.tx, tile.ty)
    && !scene.worldModel?.isSolid?.(tile.tx, tile.ty)
  )) || null;
}

function resetTestSave() {
  try {
    const prefixes = [
      "jkd-",
      "dig-game-",
      "just-keep-digging",
    ];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (prefixes.some(prefix => key?.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
    if (Array.isArray(window.__jkdUiErrors)) window.__jkdUiErrors.length = 0;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

export function installJkdE2EHarness(scene) {
  if (!e2eEnabled()) return;

  scene.pendingDugTileSave = false;
  scene.queueDugTilesSave = () => undefined;
  scene.flushDugTilesSave = async () => true;
  for (const threshold of [100, 300, 1000]) {
    scene.depthGateSystem?.accepted?.add?.(threshold);
  }

  let backgroundPreviewIndex = -1;
  let surfaceBenchmarkPreviewIndex = -1;
  let surfacePropPreviewIndex = -1;
  let surfaceAltarPreviewIndex = -1;
  let heavenblockPreviewIndex = -1;
  let starPillarPreviewIndex = -1;
  let caveHazardPreviewIndex = -1;
  let caveHazardKindPreviewIndex = -1;
  let currentCaveHazard = null;
  const titanPreview = createTitanE2EPreviewController(scene, {
    closeUi: () => closeTransientUi(scene),
    forcePlayer: options => forcePlayerState(scene, options),
  });
  const previewFirstUnlockedTitanStatue = () => {
    const discoveredIds = scene.retentionProgressSystem
      ?.getDiscoveredTitans?.() || [];
    const definition = TITAN_DISCOVERY_CONFIG.definitions.find(candidate => (
      discoveredIds.includes(candidate.id)
    ));
    if (!definition) {
      console.warn("[JkdE2EHarness] Unlock a Titan before previewing its plinth");
      return null;
    }
    const gallery = TITAN_DISCOVERY_CONFIG.surfaceGallery;
    const tx = gallery.startTileX
      + (definition.index - 1) * gallery.spacingTiles;
    closeTransientUi(scene);
    forcePlayerState(scene, {
      tx,
      ty: GAME_CONFIG.topAirRows - 1,
    });
    console.info(
      `[JkdE2EHarness] Titan plinth preview ${definition.index}/25 `
      + `at ${tx},${GAME_CONFIG.topAirRows - 1}`
    );
    scene.time?.delayedCall?.(180, () => {
      const playerTile = scene.playerController?.getPlayerTile?.();
      const distance = scene.worldRenderer
        ?.getTitanSurfaceInspectionDistance?.(playerTile);
      const surface = scene.worldRenderer
        ?.getTitanDiscoverySnapshot?.()?.surface;
      console.info(
        `[JkdE2EHarness] Titan plinth inspection: `
        + `distance=${Number.isFinite(distance) ? distance : "unavailable"} `
        + `inspectable=${surface?.inspectable ?? "unavailable"} `
        + `active=${surface?.activeInspection || "none"}`
      );
    });
    return { titanId: definition.id, titanIndex: definition.index, tx };
  };
  const previewHeavenblocksSurfaceAltar = () => {
    const gates = HEAVENBLOCKS_ACCESS_CONFIG.surfaceGates;
    const stageCount = 3;
    const previewCount = gates.length * stageCount;
    surfaceAltarPreviewIndex = (surfaceAltarPreviewIndex + 1) % previewCount;
    const gateIndex = Math.floor(surfaceAltarPreviewIndex / stageCount);
    const stageIndex = surfaceAltarPreviewIndex % stageCount;
    const gate = gates[gateIndex];
    closeTransientUi(scene);
    forcePlayerState(scene, {
      tx: gate.tx,
      ty: GAME_CONFIG.topAirRows - 1,
    });
    scene.heavenblocksPresentationSystem?._syncSurfaceAltar?.(gate, stageIndex);
    const health = scene.heavenblocksPresentationSystem?.getHealthSnapshot?.() || null;
    console.info(
      `[JkdE2EHarness] Heavenblocks surface altar preview: `
      + `${gate.label} stage ${stageIndex + 1}/3 at ${gate.tx},${gate.ty}; `
      + `ready=${health?.surfaceAltarsReady ?? "unavailable"}`,
    );
    return {
      gateIndex,
      stageIndex,
      gate,
      health,
    };
  };
  const activateCaveHazardPreview = (hazards, index) => {
    caveHazardPreviewIndex = index;
    currentCaveHazard = hazards[index];
    const openingView = scene.openingFlightArtifactSystem?.view;
    openingView?.hideHud?.();
    if (openingView && openingView.__jkdHudSuppressed !== true) {
      openingView.__jkdHudSuppressed = true;
      openingView.showHud = () => openingView.hideHud();
    }
    closeTransientUi(scene);
    for (const threshold of [100, 300, 1000]) {
      scene.depthGateSystem?.accepted?.add?.(threshold);
    }
    scene.playerController?.fillGemPower?.();
    forcePlayerState(scene, currentCaveHazard.leftCheckpoint);
    console.info(
      `[JkdE2EHarness] Cave hazard ${index + 1}/${hazards.length}: `
      + `${currentCaveHazard.label} (${currentCaveHazard.kind}) at `
      + `${currentCaveHazard.centerTx},${currentCaveHazard.floorY}`
    );
  };
  const getCaveHazards = () => {
    const hazards = scene.worldModel?.caveHazardZones || [];
    if (!hazards.length) {
      console.warn("[JkdE2EHarness] No cave hazards are available");
      return null;
    }
    return hazards;
  };
  const previewCaveHazard = () => {
    const hazards = getCaveHazards();
    if (!hazards) return;
    activateCaveHazardPreview(
      hazards,
      (caveHazardPreviewIndex + 1) % hazards.length,
    );
  };
  const previewCaveHazardKind = () => {
    const hazards = getCaveHazards();
    if (!hazards) return;
    const kinds = ["timed-gate", "spike-run", "ember-vent"];
    caveHazardKindPreviewIndex = (caveHazardKindPreviewIndex + 1) % kinds.length;
    const index = hazards.findIndex(hazard => (
      hazard.kind === kinds[caveHazardKindPreviewIndex]
    ));
    if (index >= 0) activateCaveHazardPreview(hazards, index);
  };
  const enterCaveHazard = () => {
    if (!currentCaveHazard) {
      console.warn("[JkdE2EHarness] Preview a cave hazard with F2 or Ctrl+Alt+C first");
      return;
    }
    scene.playerController?.fillGemPower?.();
    forcePlayerState(scene, {
      tx: Math.round(currentCaveHazard.centerTx),
      ty: currentCaveHazard.floorY - 1,
    });
    console.info(`[JkdE2EHarness] Entered cave hazard ${currentCaveHazard.id} for failure validation`);
  };
  const handleBackgroundPreviewKey = event => {
    if (event.code === "F1") {
      event.preventDefault?.();
      buildTextureAuditGallery(scene, event.shiftKey ? "dense" : "sparse");
      return;
    }
    if (event.code === "F5") {
      event.preventDefault?.();
      const preview = findSemanticPreview(
        scene,
        type => type === TILE_TYPES.SKY_TILE
      );
      if (!preview) {
        console.warn("[JkdE2EHarness] No Star Block release preview target is available");
        return;
      }
      forcePlayerState(scene, { tx: preview.playerTx, ty: preview.playerTy });
      const tileSize = scene.config?.tileSize || GAME_CONFIG.tileSize;
      const rarity = scene.worldModel?.getSkyTileRarity?.(
        preview.targetTx,
        preview.targetTy
      ) || 0;
      const originalType = scene.worldModel?.getSkyTileOriginalType?.(
        preview.targetTx,
        preview.targetTy
      );
      const resourceType = RESOURCE_BY_TILE_TYPE[originalType] || "dirt";
      scene.floatingTextSystem?.showCollectedSkyStarRelease?.(
        rarity,
        preview.targetTx * tileSize + tileSize / 2,
        preview.targetTy * tileSize + tileSize / 2,
        resourceType
      );
      console.info(
        `[JkdE2EHarness] F5 ImageGen Star Block release preview at `
        + `${preview.targetTx},${preview.targetTy} rarity=${rarity}`
      );
      return;
    }
    const semanticPredicate = event.code === "F6"
      ? type => type === TILE_TYPES.SKY_TILE
      : event.code === "F7"
        ? type => type === TILE_TYPES.BEDROCK
        : event.code === "F8"
          ? type => Boolean(RESOURCE_BY_TILE_TYPE[type]) && type !== TILE_TYPES.STONE
          : null;
    if (semanticPredicate) {
      event.preventDefault?.();
      const preview = findSemanticPreview(scene, semanticPredicate);
      if (!preview) {
        console.warn(`[JkdE2EHarness] No traversable ${event.code} semantic preview target is available`);
        return;
      }
      forcePlayerState(scene, { tx: preview.playerTx, ty: preview.playerTy });
      console.info(
        `[JkdE2EHarness] ${event.code} semantic preview target ${preview.targetTx},${preview.targetTy} `
        + `from ${preview.playerTx},${preview.playerTy}`
      );
      return;
    }
    if (event.code === "F11") {
      event.preventDefault?.();
      scene.weatherSystem?.forceWeather?.("clear", 0, 10 * 60 * 1000);
      console.info("[JkdE2EHarness] F11 clear-weather visual benchmark preview");
      return;
    }
    if (event.code === "F12") {
      event.preventDefault?.();
      scene.weatherSystem?.forceWeather?.("snow", 1, 10 * 60 * 1000);
      console.info("[JkdE2EHarness] F12 swept-collision snow preview");
      return;
    }
    if (event.code === "F10") {
      event.preventDefault?.();
      if (event.ctrlKey && event.altKey) {
        surfacePropPreviewIndex = (
          surfacePropPreviewIndex + 1
        ) % SURFACE_PROP_PREVIEW_TILES.length;
        const tx = SURFACE_PROP_PREVIEW_TILES[surfacePropPreviewIndex];
        closeTransientUi(scene);
        forcePlayerState(scene, { tx, ty: GAME_CONFIG.topAirRows - 1 });
        console.info(
          `[JkdE2EHarness] Modular surface prop preview at ${tx},${GAME_CONFIG.topAirRows - 1}`
        );
        return;
      }
      surfaceBenchmarkPreviewIndex = (
        surfaceBenchmarkPreviewIndex + 1
      ) % SURFACE_BENCHMARK_PREVIEW_TILES.length;
      const tx = SURFACE_BENCHMARK_PREVIEW_TILES[surfaceBenchmarkPreviewIndex];
      closeTransientUi(scene);
      forcePlayerState(scene, { tx, ty: GAME_CONFIG.topAirRows - 1 });
      console.info(`[JkdE2EHarness] F10 surface benchmark preview at ${tx},${GAME_CONFIG.topAirRows - 1}`);
      return;
    }
    if (event.code === "F9") {
      event.preventDefault?.();
      const entrance = resolveWorldVisualLandmarkAnchor(
        scene,
        scene.worldModel,
        WORLD_VISUAL_LANDMARKS.entries[0]
      );
      if (!entrance) {
        console.warn("[JkdE2EHarness] No traversable cave mouth is available for the F9 preview");
        return;
      }
      forcePlayerState(scene, { tx: Math.ceil(entrance.tileX), ty: entrance.floorTileY - 1 });
      console.info(
        `[JkdE2EHarness] Scenic mine-entrance pilot preview at ${entrance.zoneId} `
        + `${entrance.tileX},${entrance.floorTileY}`
      );
      return;
    }
    if (event.code === "F2") {
      event.preventDefault?.();
      previewCaveHazard();
      return;
    }
    if (event.code === "F3") {
      event.preventDefault?.();
      enterCaveHazard();
      return;
    }
    if (event.code === "F4") {
      event.preventDefault?.();
      previewCaveHazardKind();
      return;
    }
    if (event.code === "Digit9" || event.code === "Digit0") {
      event.preventDefault?.();
      const levelId = event.code === "Digit9" ? 1 : 2;
      const level = V11_SKY_ISLAND_LAYOUT.levels.find((entry) => entry.levelId === levelId);
      forcePlayerState(scene, level.groundPortal.skyArrivalTile);
      console.info(`[JkdE2EHarness] Level ${levelId} Sky Island preview`);
      return;
    }
    if (event.code === "Digit8") {
      event.preventDefault?.();
      starPillarPreviewIndex = (
        starPillarPreviewIndex + 1
      ) % STAR_PILLAR_PREVIEW_COUNTS.length;
      const unlockedCount = STAR_PILLAR_PREVIEW_COUNTS[starPillarPreviewIndex];
      const preview = scene.starPillarSystem?.previewWorldProgress?.(unlockedCount);
      console.info(
        `[JkdE2EHarness] Star Pillar visual preview: ${unlockedCount}/10 `
        + `(stage=${preview?.stageIndex ?? "unavailable"}, sockets=${preview?.socketCount ?? 0})`
      );
      return;
    }
    if (!event.ctrlKey || !event.altKey) return;
    if (event.code === "KeyA") {
      event.preventDefault?.();
      previewHeavenblocksSurfaceAltar();
      return;
    }
    if (event.code === "KeyU") {
      event.preventDefault?.();
      closeTransientUi(scene);
      forcePlayerState(scene, { money: 5000 });
      scene.uiResourceBar?.setMoney?.(scene.upgradeSystem?.getMoney?.() || 0);
      scene.showPauseMenu?.();
      console.info("[JkdE2EHarness] Funded Titan catalog preview opened");
      return;
    }
    if (event.code === "KeyY") {
      event.preventDefault?.();
      titanPreview.advance();
      return;
    }
    if (event.code === "KeyI") {
      event.preventDefault?.();
      previewFirstUnlockedTitanStatue();
      return;
    }
    if (event.code === "KeyS") {
      event.preventDefault?.();
      closeTransientUi(scene);
      const tx = SECOND_WORLD_CONFIG.runtimeArea.leftTile - 2;
      forcePlayerState(scene, {
        tx,
        ty: GAME_CONFIG.topAirRows - 1,
      });
      console.info(
        `[JkdE2EHarness] Save-safe surface drop-through preview triggered at `
        + `${tx},${GAME_CONFIG.topAirRows - 1}`
      );
      return;
    }
    if (event.code === "Home") {
      event.preventDefault?.();
      scene.activateDevCheat?.();
      forcePlayerState(scene, { tx: 146, ty: GAME_CONFIG.topAirRows - 1 });
      console.info("[JkdE2EHarness] Level 2 surface + godmode preview at 146,64");
      return;
    }
    if (event.code === "End") {
      event.preventDefault?.();
      scene.activateDevCheat?.();
      forcePlayerState(scene, { tx: 139, ty: GAME_CONFIG.topAirRows - 1 });
      scene.shopOverlay?.show?.("magmaMoneyMonster");
      scene.shopOverlay?.setMerchantMode?.("sell", true);
      console.info("[JkdE2EHarness] Molten Money Monster sell preview");
      return;
    }
    if (event.code === "KeyT") {
      event.preventDefault?.();
      scene.activateDevCheat?.();
      const anchor = SECOND_WORLD_CONFIG.generation.teleportAnchors[0];
      const preview = findOpenAdjacentTile(scene, anchor.tx, anchor.ty);
      if (!preview) {
        console.warn("[JkdE2EHarness] Level 2 teleport anchor has no open preview cell");
        return;
      }
      forcePlayerState(scene, preview);
      console.info(
        `[JkdE2EHarness] Level 2 teleport preview beside ${anchor.tx},${anchor.ty}`
      );
      return;
    }
    if (event.code === "Insert") {
      event.preventDefault?.();
      const level = V11_SKY_ISLAND_LAYOUT.levels.find((entry) => entry.levelId === 1);
      forcePlayerState(scene, level.groundPortal.skyArrivalTile);
      console.info("[JkdE2EHarness] Level 1 Sky Island preview");
      return;
    }
    if (event.code === "Delete") {
      event.preventDefault?.();
      const level = V11_SKY_ISLAND_LAYOUT.levels.find((entry) => entry.levelId === 2);
      forcePlayerState(scene, level.groundPortal.skyArrivalTile);
      console.info("[JkdE2EHarness] Level 2 Sky Island preview");
      return;
    }
    if (event.code === "KeyH") {
      event.preventDefault?.();
      heavenblockPreviewIndex = (
        heavenblockPreviewIndex + 1
      ) % HEAVENBLOCKS_VISUAL_CONFIG.regions.length;
      const region = HEAVENBLOCKS_VISUAL_CONFIG.regions[heavenblockPreviewIndex];
      const tileSize = scene.config?.tileSize || HEAVENBLOCKS_VISUAL_CONFIG.tileSize;
      const camera = scene.cameras?.main;
      camera?.stopFollow?.();
      camera?.centerOn?.(
        region.leftTile * tileSize + region.displayWidthPx / 2,
        region.topTile * tileSize + region.displayHeightPx / 2
      );
      console.info(`[JkdE2EHarness] Heavenblock preview: ${region.label}`);
      return;
    }
    if (event.code === "KeyC") {
      event.preventDefault?.();
      previewCaveHazard();
      return;
    }
    if (event.code === "KeyV") {
      event.preventDefault?.();
      enterCaveHazard();
      return;
    }
    const level = event.code === "PageDown" ? "level1" : (event.code === "PageUp" ? "level2" : null);
    if (!level) return;
    event.preventDefault?.();
    backgroundPreviewIndex = (backgroundPreviewIndex + 1) % BACKGROUND_PREVIEW_DEPTHS.length;
    const depth = BACKGROUND_PREVIEW_DEPTHS[backgroundPreviewIndex];
    const previewTile = findBackgroundPreviewTile(scene, level, depth);
    forcePlayerState(scene, {
      tx: previewTile.tx,
      ty: previewTile.ty,
    });
    console.info(`[JkdE2EHarness] Background preview ${level} near ${depth}m at ${previewTile.tx},${previewTile.ty}`);
  };
  window.addEventListener("keydown", handleBackgroundPreviewKey);

  const harness = {
    version: 1,
    getState: () => getState(scene),
    getTargets: () => getTargets(scene),
    open: (surface, options = {}) => openSurface(scene, surface, options),
    closeAll: () => {
      closeTransientUi(scene);
      return getState(scene);
    },
    resetTestSave,
    forcePlayerState: (options = {}) => forcePlayerState(scene, options),
    previewTextureAudit: (mode = "sparse") => buildTextureAuditGallery(scene, mode),
    advanceTitanPreview: () => titanPreview.advance(),
    previewFirstUnlockedTitanStatue,
    previewHeavenblocksSurfaceAltar,
  };

  window.__jkdE2E = harness;
  console.info("[JkdE2EHarness] Installed in save-safe mode; F1 opens the sparse opaque-ImageGen texture gallery and Shift+F1 shows the intentionally over-dense comparison; F2 cycles cave hazards; F3 enters the selected hazard; F4 cycles one example of each hazard family; F5 previews the ImageGen Star Block release without awarding it; F6/F7/F8 preview star/bedrock/resource semantics; F9 previews the scenic mine entrance; F10 cycles surface benchmark anchors; Ctrl+Alt+F10 cycles modular surface prop clusters; Ctrl+Alt+S previews the Level 1/2 surface drop-through seam; F11 forces clear-weather benchmark lighting; F12 forces the swept-collision snow preview; 9/0 or Ctrl+Alt+Insert/Delete preview the two Sky Islands; 8 cycles Star Pillar stages; Ctrl+Alt+A cycles all nine surface-altar art stages without save writes; Ctrl+Alt+U funds and opens the Titan catalog; Ctrl+Alt+Y advances sealed/partial/one-left/complete Titan cover; Ctrl+Alt+I previews the first unlocked Titan plinth; Ctrl+Alt+PageDown/PageUp preview backgrounds; Ctrl+Alt+T previews a Level 2 teleport; Ctrl+Alt+H cycles the three Heavenblocks; Ctrl+Alt+C/V remain cave-hazard aliases");
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener("keydown", handleBackgroundPreviewKey);
    if (window.__jkdE2E === harness) {
      delete window.__jkdE2E;
    }
  });
}
