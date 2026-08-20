const LAYERS = Object.freeze([
  Object.freeze({
    id: "understar-ending",
    active: scene => scene?.understarEndingSystem?.overlay?.isVisible === true,
    close: scene => scene.understarEndingSystem?.closeOverlay?.(),
  }),
  Object.freeze({
    id: "random-event",
    active: scene => scene?._randomEventModalVisible === true,
    close: scene => scene.randomEventBridge?.jackpot?.modal?.requestClose?.(),
  }),
  Object.freeze({
    id: "hardcore-modal",
    active: scene => scene?._hardcoreRuntime?.modal?.isVisible === true,
    close: (scene, reason) => scene._hardcoreRuntime.modal.close?.({
      cancelled: reason === "escape",
    }),
  }),
  Object.freeze({
    id: "world-map",
    active: scene => scene?._worldMapFeatureLoading === true
      || scene?.worldMapOverlay?.isOpen === true,
    close: scene => scene.hideWorldMap?.(),
  }),
  Object.freeze({
    id: "depth-gate",
    active: scene => scene?.depthGateSystem?.isOpen?.() === true,
    close: scene => scene.depthGateSystem?._decline?.(),
  }),
  Object.freeze({
    id: "shop",
    active: scene => scene?.shopOverlay?.isVisible === true,
    close: scene => {
      scene.soundSystem?.playUiConfirm?.();
      return scene.shopOverlay?.hide?.();
    },
  }),
  Object.freeze({
    id: "campfire",
    active: scene => scene?.campfireSystem?.isSelecting?.() === true,
    close: scene => scene.campfireSystem?._closeBuffSelection?.(),
  }),
  Object.freeze({
    id: "milestone-board",
    active: scene => scene?.milestoneBoardSystem?._isBoardOpen === true,
    close: scene => scene.milestoneBoardSystem?._closeBoardView?.(),
  }),
  Object.freeze({
    id: "star-heart",
    active: scene => scene?.starHeartOverlay?.isOpen?.() === true,
    close: scene => scene.starHeartOverlay?.close?.(),
  }),
  Object.freeze({
    id: "star-pillar",
    active: scene => Boolean(scene?._pillarViewActive && scene?.starPillarSystem),
    close: scene => scene.starPillarSystem?.closeConstellationView?.(),
  }),
  Object.freeze({
    id: "inventory",
    active: scene => scene?.uiInventoryPopup?.isOpen === true,
    close: scene => scene.uiInventoryPopup?.close?.(),
  }),
  Object.freeze({
    id: "game-dialog",
    active: scene => scene?.gameState === "dialog"
      && scene?.overlayManager?.shell?.root?.visible === true,
    close: scene => {
      scene.hideOverlay?.();
      scene.closeGameDialog?.();
      return true;
    },
  }),
  Object.freeze({
    id: "pause-menu",
    active: scene => Boolean(scene?._pausePanel || scene?.gameState === "paused"),
    close: scene => scene.resumeGame?.(),
  }),
]);

function activeLayers(scene) {
  return LAYERS.filter(layer => {
    try {
      return layer.active(scene) === true;
    } catch (error) {
      scene._uiLayerLastError = `${layer.id}:active:${error?.message || error}`;
      return false;
    }
  });
}

export function getTopUiLayer(scene) {
  return activeLayers(scene)[0] || null;
}

export function hasBlockingUiLayer(scene) {
  return getTopUiLayer(scene) !== null;
}

export function closeTopUiLayer(scene, reason = "escape") {
  const layer = getTopUiLayer(scene);
  if (!layer) return false;
  try {
    layer.close(scene, reason);
    scene._lastClosedUiLayer = Object.freeze({
      id: layer.id,
      reason: String(reason),
      at: Number(scene.time?.now) || 0,
    });
    scene._uiLayerLastError = null;
    return true;
  } catch (error) {
    scene._uiLayerLastError = `${layer.id}:close:${error?.message || error}`;
    console.error(`[UiLayerOwnership] Failed to close ${layer.id}:`, error);
    return false;
  }
}

export function getUiLayerOwnershipSnapshot(scene) {
  const active = activeLayers(scene).map(layer => layer.id);
  return Object.freeze({
    version: 1,
    active: Object.freeze(active),
    top: active[0] || null,
    count: active.length,
    settingsKeyCapture: scene?._settingsKeyCaptureActive === true,
    lastClosed: scene?._lastClosedUiLayer || null,
    lastError: scene?._uiLayerLastError || null,
  });
}

export function installUiLayerDiagnostics(scene, enabled = false) {
  if (!enabled || typeof window === "undefined") return () => {};
  const api = Object.freeze({
    snapshot: () => getUiLayerOwnershipSnapshot(scene),
  });
  window.__jkdUiLayers = api;
  return () => {
    if (window.__jkdUiLayers === api) delete window.__jkdUiLayers;
  };
}
