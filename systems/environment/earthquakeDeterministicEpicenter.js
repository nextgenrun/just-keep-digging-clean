export function selectDeterministicEarthquakeEpicenter(scene, system, config) {
  const model = scene.worldModel;
  if (!model) return null;
  const spawn = config.worldSpawn || {};
  const margin = Math.max(0, Math.floor(spawn.horizontalMarginTiles ?? 0));
  const bottomMargin = Math.max(1, Math.floor(spawn.bottomMarginTiles ?? 1));
  const minTx = Math.min(margin, Math.max(0, model.widthTiles - 1));
  const maxTx = Math.max(minTx, model.widthTiles - 1 - margin);
  const minTy = Math.min(
    model.depthTiles - bottomMargin,
    Math.max(model.topAirRows, model.topAirRows + config.minimumDepth - 1),
  );
  const maxTy = Math.max(minTy, model.depthTiles - 1 - bottomMargin);
  const player = scene.playerController?.getPlayerTile?.();
  const origin = {
    tx: Math.max(minTx, Math.min(maxTx, player?.tx ?? minTx)),
    ty: Math.max(minTy, Math.min(maxTy, player?.ty ?? minTy)),
  };
  const maxRadius = Math.max(maxTx - minTx, maxTy - minTy);
  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (let ty = origin.ty - radius; ty <= origin.ty + radius; ty += 1) {
      for (let tx = origin.tx - radius; tx <= origin.tx + radius; tx += 1) {
        if (Math.max(Math.abs(tx - origin.tx), Math.abs(ty - origin.ty)) !== radius) {
          continue;
        }
        if (tx < minTx || tx > maxTx || ty < minTy || ty > maxTy) continue;
        if (system._isCavityAnchor(tx, ty)) return system._makeEpicenter(tx, ty);
      }
    }
  }
  return null;
}
