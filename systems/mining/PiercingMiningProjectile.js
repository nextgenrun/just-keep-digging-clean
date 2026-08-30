import { TILE_TYPES } from "../../values/tileTypes.js";

function resolveDirection(aimDirection) {
  const label = String(aimDirection || "").toUpperCase();
  if (label.startsWith("UP")) return { x: 0, y: -1, label: "UP" };
  if (label.startsWith("DOWN")) return { x: 0, y: 1, label: "DOWN" };
  if (label.includes("LEFT")) return { x: -1, y: 0, label: "LEFT" };
  if (label.includes("RIGHT")) return { x: 1, y: 0, label: "RIGHT" };
  return null;
}

function buildProjectilePaths(digSystem, targetTile, direction, empower) {
  const rangeTiles = Math.max(
    1,
    Math.floor(Number(empower.projectileRangeTiles) || 1),
  );
  const sideLanes = Math.max(
    0,
    Math.floor(Number(empower.projectileSideLanes) || 0),
  );
  const perpendicular = { x: -direction.y, y: direction.x };
  const candidates = [];
  const blockedTiles = [];
  const endTiles = [];
  const seen = new Set();

  for (let lane = -sideLanes; lane <= sideLanes; lane += 1) {
    let endTile = null;
    for (let distance = 0; distance < rangeTiles; distance += 1) {
      const tx = targetTile.tx + perpendicular.x * lane + direction.x * distance;
      const ty = targetTile.ty + perpendicular.y * lane + direction.y * distance;
      if (!digSystem.worldModel.inBounds(tx, ty)) break;
      endTile = { tx, ty, lane, distance: distance + 1 };
      if (!digSystem.worldModel.isSolid(tx, ty)) continue;

      const tileType = digSystem.worldModel.getTileType(tx, ty);
      if (!digSystem.worldModel.isDiggable(tx, ty)) {
        if (
          empower.projectilePassesGeodeWalls === true
          && tileType === TILE_TYPES.GEODE_WALL
        ) continue;
        blockedTiles.push({ tx, ty, lane, distance: distance + 1, tileType });
        break;
      }

      const key = `${tx},${ty}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ tx, ty, lane, distance: distance + 1, tileType });
    }
    if (endTile) endTiles.push(endTile);
  }

  candidates.sort((a, b) => (
    a.distance - b.distance
    || Math.abs(a.lane) - Math.abs(b.lane)
    || a.lane - b.lane
  ));
  return { rangeTiles, sideLanes, candidates, blockedTiles, endTiles };
}

/**
 * Resolves one instantaneous authoritative Star Lance ray. Every candidate is
 * a fresh normal mining transaction, so overkill on an earlier tile never
 * reduces the full hit applied to a later tile.
 */
export function resolvePiercingMiningProjectile({
  digSystem,
  targetTile,
  nowMs,
  aimDirection,
  playerAbilities,
  empower,
}) {
  const direction = resolveDirection(aimDirection);
  if (
    !direction
    || !targetTile
    || !Number.isInteger(targetTile.tx)
    || !Number.isInteger(targetTile.ty)
  ) {
    return { success: false, reason: "invalid-projectile-direction" };
  }

  const paths = buildProjectilePaths(digSystem, targetTile, direction, empower);
  const damageMultiplier = Math.max(
    1,
    Number(empower.projectileDamageMultiplier) || 1,
  );
  const hits = [];

  for (let index = 0; index < paths.candidates.length; index += 1) {
    const candidate = paths.candidates[index];
    const result = digSystem.tryMine(
      candidate,
      nowMs,
      direction.label,
      playerAbilities,
      {
        ignoreCooldown: true,
        skipAbilityCost: index > 0,
        skipHeavyPunch: true,
        skipCelestialProjectile: true,
        damageMultiplier,
      },
    );
    hits.push({ ...candidate, result });
    if (index === 0 && result?.reason === "no-gp") break;
  }

  const successfulHits = hits.filter(hit => hit.result?.success);
  const primaryHit = successfulHits[0] || hits[0] || null;
  const projectile = {
    engineId: empower.engineId,
    activationId: empower.activationId,
    direction,
    targetTile: { tx: targetTile.tx, ty: targetTile.ty },
    rangeTiles: paths.rangeTiles,
    sideLanes: paths.sideLanes,
    damageMultiplier,
    hits,
    endTiles: paths.endTiles,
    blockedTiles: paths.blockedTiles,
    impactedCount: successfulHits.length,
    destroyedCount: successfulHits.filter(hit => hit.result.destroyed).length,
  };
  const fallbackReason = paths.blockedTiles.length > 0 ? "blocked" : "no-target";
  return {
    ...(primaryHit?.result || { success: false, reason: fallbackReason }),
    hitTile: primaryHit ? { tx: primaryHit.tx, ty: primaryHit.ty } : null,
    celestialProjectile: projectile,
  };
}
