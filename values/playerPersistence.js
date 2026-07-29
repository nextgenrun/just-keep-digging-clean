export const PLAYER_PERSISTENCE_CONFIG = Object.freeze({
  version: 1,
  maximumCoordinatePx: 100000000,
  maximumGemPower: 1000000,
});

function finiteInRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

export function sanitizePlayerPersistenceData(data) {
  if (!data || typeof data !== "object") return null;
  const maxCoordinate = PLAYER_PERSISTENCE_CONFIG.maximumCoordinatePx;
  const bodyX = finiteInRange(data.bodyX, 0, maxCoordinate);
  const bodyY = finiteInRange(data.bodyY, 0, maxCoordinate);
  const gemPower = finiteInRange(
    data.gemPower,
    0,
    PLAYER_PERSISTENCE_CONFIG.maximumGemPower,
  );
  if (bodyX === null || bodyY === null || gemPower === null) return null;
  return {
    version: PLAYER_PERSISTENCE_CONFIG.version,
    bodyX,
    bodyY,
    gemPower,
    facingRight: data.facingRight !== false,
  };
}
