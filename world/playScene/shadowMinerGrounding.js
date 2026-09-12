function isInBounds(world, tx, ty) {
  return typeof world?.inBounds !== "function" || world.inBounds(tx, ty);
}

/** Keep replay poses on an open tile directly above natural terrain. */
export function resolveShadowMinerGroundedPose(scene, config, pose) {
  if (!pose) return null;
  const world = scene?.worldModel;
  const tileSize = Number(scene?.config?.tileSize);
  const grounding = config?.admission?.grounding;
  if (
    typeof world?.isSolid !== "function"
    || !Number.isFinite(tileSize)
    || tileSize <= 0
    || !grounding
  ) return { ...pose };

  const tx = Math.floor(pose.x / tileSize);
  const firstSupportTy = Math.floor((pose.y + grounding.supportProbePx) / tileSize);
  for (let offset = 0; offset <= grounding.maximumDropTiles; offset += 1) {
    const supportTy = firstSupportTy + offset;
    if (!isInBounds(world, tx, supportTy) || !world.isSolid(tx, supportTy)) continue;
    let clear = true;
    for (let row = 1; row <= grounding.clearanceTiles; row += 1) {
      const ty = supportTy - row;
      if (!isInBounds(world, tx, ty) || world.isSolid(tx, ty)) {
        clear = false;
        break;
      }
    }
    if (!clear) continue;
    return {
      ...pose,
      y: supportTy * tileSize + grounding.baselineOffsetPx,
      tileX: tx,
      tileY: supportTy - grounding.clearanceTiles,
      grounded: true,
    };
  }
  return null;
}
