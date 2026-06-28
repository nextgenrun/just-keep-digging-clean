import { GAME_CONFIG } from "../values/gameConfig.js";

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
  scene.campfireSystem?._closeBuffSelection?.();
  scene.milestoneBoardSystem?._closeBoardView?.();
  if (scene.depthGateSystem?.isOpen?.()) scene.depthGateSystem._decline?.();
  if (scene._pillarViewActive && scene.starPillarSystem?._isViewOpen) {
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
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    if (window.__jkdE2E === harness) {
      delete window.__jkdE2E;
    }
  });
}
