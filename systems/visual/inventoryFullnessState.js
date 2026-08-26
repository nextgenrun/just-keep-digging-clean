import { HUD_QUICK_CONTROLS } from "../../values/hudQuickControls.js";

const MAX_SAFE_CARGO_UNITS = Number.MAX_SAFE_INTEGER;

export function getInventoryCargoUnits(resources = {}) {
  if (!resources || typeof resources !== "object") return 0;
  return Object.values(resources).reduce((total, value) => {
    const units = Math.max(0, Math.floor(Number(value) || 0));
    return Math.min(MAX_SAFE_CARGO_UNITS, total + units);
  }, 0);
}

export function resolveInventoryFullnessState(
  resources = {},
  config = HUD_QUICK_CONTROLS.inventory.fullness,
) {
  const stateCount = Math.max(1, Math.floor(Number(config?.stateCount) || 1));
  const visualCapacityUnits = Math.max(
    1,
    Math.floor(Number(config?.visualCapacityUnits) || 1),
  );
  const cargoUnits = getInventoryCargoUnits(resources);
  const fullnessRatio = Math.min(1, cargoUnits / visualCapacityUnits);
  const stateIndex = cargoUnits <= 0
    ? 0
    : Math.min(stateCount - 1, Math.ceil(fullnessRatio * (stateCount - 1)));

  return Object.freeze({
    cargoUnits,
    fullnessPercent: Math.round(fullnessRatio * 100),
    fullnessRatio,
    stateCount,
    stateIndex,
    stateNumber: stateIndex + 1,
    visualCapacityUnits,
  });
}
