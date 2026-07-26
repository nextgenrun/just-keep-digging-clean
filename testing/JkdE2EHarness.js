import { GAME_CONFIG } from "../values/gameConfig.js";
import { RESOURCE_BY_TILE_TYPE } from "../values/resourceTypes.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_LANDMARKS } from "../values/worldVisualLandmarks.js";
import { SECOND_WORLD_CONFIG } from "../values/secondWorldConfig.js";
import { V11_SKY_ISLAND_LAYOUT } from "../values/v11SkyIslandLayout.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../values/heavenblocksVisualConfig.js";
import { resolveWorldVisualLandmarkAnchor } from "../world/rendering/scenic-world/WorldVisualLandmarkLayer.js";

const BACKGROUND_PREVIEW_DEPTHS = Object.freeze([
  100, 350, 700, 1100, 1450, 1800, 2500, 3500, 4500, 4990,
]);
const BACKGROUND_PREVIEW_RANGES = Object.freeze({
  level1: Object.freeze({ minX: 1, maxX: 112 }),
  level2: Object.freeze({ minX: 113, maxX: 278 }),
});
const SURFACE_BENCHMARK_PREVIEW_TILES = Object.freeze([4, 12, 14, 33, 63]);

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
  scene.shopOverlay?.hide?.();
  scene.uiInventoryPopup?.close?.();
  scene.levelUpPopup?.hide?.();
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
    levelUpVisible: Boolean(scene.levelUpPopup?.visible),
    levelUpPendingChoice: Boolean(scene.levelUpPopup?.pendingChoice),
    campfireOpen: Boolean(scene.campfireSystem?.isSelecting?.()),
    milestoneOpen: Boolean(scene.milestoneBoardSystem?._isBoardOpen),
    starChartOpen: Boolean(scene._pillarViewActive || scene.starPillarSystem?._isViewOpen),
    starHeart: scene.starHeartProgressionSystem?.getSnapshot?.() || null,
    celestialEngine: scene.celestialEngineController?.getHealthSnapshot?.() || null,
    caveHazards: scene.caveHazardSystem?.getSnapshot?.() || null,
    depthGateOpen: Boolean(scene.depthGateSystem?.isOpen?.()),
    depthGateThreshold: scene.depthGateSystem?.activeGate?.threshold || null,
    dialogVisible: Boolean(scene.overlayManager?.overlayBackdrop?.visible),
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
      scene._pausePanel?.state?.tabs?.setActive?.(2);
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
      scene.levelUpPopup?.show?.(2, true, ["miningPower", "resourceLuck"]);
      break;
    case "levelContinue":
      scene.levelUpPopup?.show?.(3, false, [{ type: "milestone", reward: { description: "E2E milestone reward" } }]);
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

  let backgroundPreviewIndex = -1;
  let surfaceBenchmarkPreviewIndex = -1;
  let heavenblockPreviewIndex = -1;
  let caveHazardPreviewIndex = -1;
  let caveHazardKindPreviewIndex = -1;
  let currentCaveHazard = null;
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
    if (event.code === "F10") {
      event.preventDefault?.();
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
    if (!event.ctrlKey || !event.altKey) return;
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
  };

  window.__jkdE2E = harness;
  console.info("[JkdE2EHarness] Installed in save-safe mode; F2 cycles cave hazards; F3 enters the selected hazard; F4 cycles one example of each hazard family; F6/F7/F8 preview star/bedrock/resource semantics; F9 previews the scenic mine entrance; F10 cycles surface benchmark anchors; F11 forces clear-weather benchmark lighting; Ctrl+Alt+PageDown/PageUp preview backgrounds; Ctrl+Alt+T previews a Level 2 teleport; Ctrl+Alt+Insert/Delete preview the two Sky Islands; Ctrl+Alt+H cycles the three Heavenblocks; Ctrl+Alt+C/V remain cave-hazard aliases");
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener("keydown", handleBackgroundPreviewKey);
    if (window.__jkdE2E === harness) {
      delete window.__jkdE2E;
    }
  });
}
