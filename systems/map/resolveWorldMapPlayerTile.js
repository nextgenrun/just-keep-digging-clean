function isFiniteTile(tile) {
  return Number.isFinite(tile?.tx) && Number.isFinite(tile?.ty);
}

/**
 * Resolves the player's authoritative map tile from the collision body first.
 */
export function resolveWorldMapPlayerTile(scene) {
  const controllerTile = scene?.playerController?.getPlayerTile?.();
  if (isFiniteTile(controllerTile)) return controllerTile;

  const model = scene?.worldModel;
  if (!model?.worldToTile) return null;

  const bodyCenter = scene?.playerController?.physicsBody?.getCenter?.();
  if (Number.isFinite(bodyCenter?.x) && Number.isFinite(bodyCenter?.y)) {
    return model.worldToTile(bodyCenter.x, bodyCenter.y);
  }

  const player = scene?.playerController?.sprite || scene?.player;
  if (!Number.isFinite(player?.x) || !Number.isFinite(player?.y)) return null;
  return model.worldToTile(player.x, player.y);
}
