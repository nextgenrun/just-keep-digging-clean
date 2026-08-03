// Builds a stable diagnostics snapshot without coupling callers to Phaser objects.

import { isCelestialActionBarOrderValid } from "../../values/celestialActionBar.js";

export function buildCelestialActionBarHealth(system) {
  const slots = [...system.slotsById.values()];
  const persistenceReady = typeof system.loadoutProvider?.setLoadout === "function"
    || typeof system.onLoadoutChange === "function";
  const activationReady = typeof system.onActivate === "function";
  const orderValid = isCelestialActionBarOrderValid(system.order);
  const missingTextures = [...(system.assetHealth?.missingTextures || [])];
  const draggableSlotCount = slots.filter(slot => slot.draggable).length;
  const metrics = system.metrics?.getSnapshot?.() || null;
  return Object.freeze({
    ready: system.mounted && !system.destroyed && orderValid
      && missingTextures.length === 0
      && draggableSlotCount === system.config.slotCount
      && persistenceReady && activationReady && metrics?.ready === true,
    mounted: system.mounted,
    destroyed: system.destroyed,
    metrics,
    visible: system.visible,
    expectedSlotCount: system.config.slotCount,
    slotCount: slots.length,
    draggableSlotCount,
    order: Object.freeze([...system.order]),
    orderValid,
    persistenceReady,
    activationReady,
    lockedCount: slots.filter(slot => slot.state?.unlocked !== true).length,
    tooltipVisible: system.tooltipVisible,
    fallbackEntryIds: system.assetHealth?.fallbackEntryIds || Object.freeze([]),
    missingTextures: Object.freeze(missingTextures),
    lastStateError: system.lastStateError,
    lastPersistenceError: system.lastPersistenceError,
    lastActivationError: system.lastActivationError,
  });
}
