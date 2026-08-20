/**
 * Returns whether Escape currently belongs to an in-game UI surface.
 *
 * This predicate is intentionally state-only so it can be sampled on the raw
 * key-down edge, before an overlay-specific listener closes its own surface.
 */
export function hasEscapeClosableUi(scene) {
  return Boolean(
    scene?._randomEventModalVisible
    || scene?.understarEndingSystem?.overlay?.isVisible
    || scene?._hardcoreRuntime?.modal?.isVisible
    || scene?.worldMapOverlay?.isOpen
    || scene?.depthGateSystem?.isOpen?.()
    || scene?.shopOverlay?.isVisible
    || scene?.campfireSystem?.isSelecting?.()
    || scene?.milestoneBoardSystem?._isBoardOpen
    || scene?.starHeartOverlay?.isOpen?.()
    || (scene?._pillarViewActive && scene?.starPillarSystem)
    || scene?.uiInventoryPopup?.isOpen
    || (
      scene?.gameState === "dialog"
      && scene?.overlayManager?.shell?.root?.visible
    )
    || scene?._pausePanel
    || scene?.gameState === "paused"
  );
}
