import { TILE_TYPES } from "../../values/tileTypes.js";

function resolveDirection(aimDirection) {
  const label = String(aimDirection || "").toUpperCase();
  if (label.startsWith("UP")) return { x: 0, y: -1, label: "UP" };
  if (label.startsWith("DOWN")) return { x: 0, y: 1, label: "DOWN" };
  if (label.includes("LEFT")) return { x: -1, y: 0, label: "LEFT" };
  if (label.includes("RIGHT")) return { x: 1, y: 0, label: "RIGHT" };
  return null;
}

function resolveProjectileStates(empower) {
  const source = Array.isArray(empower?.projectileStates)
    ? empower.projectileStates
    : [];
  return source.map((state, index) => ({
    id: String(state?.id || `state-${index + 1}`),
    index,
    minimumDistanceTiles: Math.max(
      1,
      Math.floor(Number(state?.minimumDistanceTiles) || 1),
    ),
    damageMultiplier: Math.max(1, Number(state?.damageMultiplier) || 1),
  }));
}

function resolveProjectileState(distance, states) {
  let selected = null;
  for (const state of states) {
    if (distance < state.minimumDistanceTiles) break;
    selected = state;
  }
  return selected || {
    id: "violet-edge",
    index: 0,
    minimumDistanceTiles: 1,
    damageMultiplier: 1,
  };
}

function stateFields(state) {
  return {
    projectileStateId: state.id,
    projectileStateIndex: state.index,
    projectileStateDamageMultiplier: state.damageMultiplier,
  };
}

function resolveTraversalLimit(worldModel, direction, empower) {
  const configuredRange = Math.max(
    1,
    Math.floor(Number(empower.projectileRangeTiles) || 1),
  );
  const infiniteRange = empower.projectileInfiniteRange === true
    || !Number.isFinite(Number(empower.projectileRangeTiles));
  if (!infiniteRange) {
    return { configuredRange, infiniteRange, traversalLimit: configuredRange };
  }

  const worldSpan = direction.x !== 0
    ? Number(worldModel?.widthTiles ?? worldModel?.width)
    : Number(worldModel?.depthTiles ?? worldModel?.depth);
  const fallbackLimit = Math.max(
    1,
    Math.floor(Number(empower.projectileSafetyMaxTiles) || 1),
  );
  return {
    configuredRange: Number.POSITIVE_INFINITY,
    infiniteRange,
    traversalLimit: Number.isFinite(worldSpan) && worldSpan > 0
      ? Math.floor(worldSpan)
      : fallbackLimit,
  };
}

function buildProjectilePaths(digSystem, targetTile, direction, empower) {
  const range = resolveTraversalLimit(digSystem.worldModel, direction, empower);
  const states = resolveProjectileStates(empower);
  const sideLanes = Math.max(
    0,
    Math.floor(Number(empower.projectileSideLanes) || 0),
  );
  const perpendicular = { x: -direction.y, y: direction.x };
  const candidates = [];
  const blockedTiles = [];
  const endTiles = [];
  const visualPaths = [];
  const seen = new Set();

  for (let lane = -sideLanes; lane <= sideLanes; lane += 1) {
    let endTile = null;
    let previousStateIndex = -1;
    const transitions = [];
    for (let distance = 0; distance < range.traversalLimit; distance += 1) {
      const tx = targetTile.tx + perpendicular.x * lane + direction.x * distance;
      const ty = targetTile.ty + perpendicular.y * lane + direction.y * distance;
      if (!digSystem.worldModel.inBounds(tx, ty)) break;
      const travelled = distance + 1;
      const state = resolveProjectileState(travelled, states);
      endTile = { tx, ty, lane, distance: travelled, ...stateFields(state) };
      if (state.index !== previousStateIndex) {
        transitions.push({ ...endTile });
        previousStateIndex = state.index;
      }
      if (!digSystem.worldModel.isSolid(tx, ty)) continue;

      const tileType = digSystem.worldModel.getTileType(tx, ty);
      if (!digSystem.worldModel.isDiggable(tx, ty)) {
        if (
          empower.projectilePassesGeodeWalls === true
          && tileType === TILE_TYPES.GEODE_WALL
        ) continue;
        blockedTiles.push({ ...endTile, tileType });
        break;
      }

      const key = `${tx},${ty}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ ...endTile, tileType });
    }
    if (!endTile) continue;
    endTiles.push(endTile);
    visualPaths.push({ lane, transitions, endTile });
  }

  candidates.sort((a, b) => (
    a.distance - b.distance
    || Math.abs(a.lane) - Math.abs(b.lane)
    || a.lane - b.lane
  ));
  return {
    rangeTiles: range.configuredRange,
    infiniteRange: range.infiniteRange,
    traversalLimitTiles: range.traversalLimit,
    sideLanes,
    states,
    candidates,
    blockedTiles,
    endTiles,
    visualPaths,
  };
}

function compareLanes(left, right) {
  return Math.abs(left) - Math.abs(right) || left - right;
}

function truncateVisualPath(path, stopTile) {
  if (!stopTile || stopTile.distance >= path.endTile.distance) return path;
  return {
    ...path,
    transitions: path.transitions.filter(
      transition => transition.distance <= stopTile.distance,
    ),
    endTile: { ...stopTile },
  };
}

/**
 * Resolves one authoritative Star Lance volley. Each lane starts with one
 * normal mining hit. A destroyed tile passes only its exact overkill into the
 * next tile; a surviving tile consumes the lane and becomes its visual end.
 */
export function resolvePiercingMiningProjectile({
  digSystem,
  targetTile,
  nowMs,
  aimDirection,
  playerAbilities,
  empower,
  skipAbilityCost = false,
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
  const baseDamageMultiplier = Math.max(
    0.01,
    Number(empower.projectileDamageMultiplier) || 1,
  );
  const hits = [];
  const candidatesByLane = new Map();
  for (const candidate of paths.candidates) {
    if (!candidatesByLane.has(candidate.lane)) {
      candidatesByLane.set(candidate.lane, []);
    }
    candidatesByLane.get(candidate.lane).push(candidate);
  }
  for (const candidates of candidatesByLane.values()) {
    candidates.sort((left, right) => left.distance - right.distance);
  }

  const laneStops = new Map();
  const laneOrder = paths.visualPaths
    .map(path => path.lane)
    .sort(compareLanes);
  let abilityCostSpent = skipAbilityCost === true;
  let outOfGemPower = false;

  for (const lane of laneOrder) {
    const candidates = candidatesByLane.get(lane) || [];
    let carryDamage = null;
    for (const candidate of candidates) {
      const isFirstHit = carryDamage === null;
      if (!isFirstHit && carryDamage <= 0) break;
      const damageMultiplier = isFirstHit
        ? baseDamageMultiplier * candidate.projectileStateDamageMultiplier
        : null;
      const options = {
        ignoreCooldown: true,
        skipAbilityCost: abilityCostSpent,
        skipHeavyPunch: true,
        skipCelestialProjectile: true,
        suppressPlayerDigListener: true,
      };
      if (isFirstHit) options.damageMultiplier = damageMultiplier;
      else options.damageOverride = carryDamage;

      const result = digSystem.tryMine(
        candidate,
        nowMs,
        direction.label,
        playerAbilities,
        options,
      );
      abilityCostSpent = true;
      hits.push({
        ...candidate,
        damageMultiplier,
        carriedDamage: isFirstHit ? 0 : carryDamage,
        result,
      });

      if (result?.reason === "no-gp") {
        laneStops.set(lane, candidate);
        outOfGemPower = true;
        break;
      }
      if (!result?.success || result.destroyed !== true) {
        laneStops.set(lane, candidate);
        break;
      }
      carryDamage = Math.max(0, Math.floor(Number(result.overkillDamage) || 0));
      if (carryDamage <= 0) {
        laneStops.set(lane, candidate);
        break;
      }
    }
    if (outOfGemPower) break;
  }

  const visualPaths = paths.visualPaths.map(path =>
    truncateVisualPath(path, laneStops.get(path.lane)),
  );
  const endTiles = visualPaths.map(path => path.endTile);
  const reachedDistanceByLane = new Map(
    endTiles.map(tile => [tile.lane, tile.distance]),
  );
  const blockedTiles = paths.blockedTiles.filter(tile =>
    tile.distance <= (reachedDistanceByLane.get(tile.lane) ?? tile.distance),
  );

  const successfulHits = hits.filter(hit => hit.result?.success);
  const primaryHit = successfulHits[0] || hits[0] || null;
  const maximumStateMultiplier = paths.states.reduce(
    (maximum, state) => Math.max(maximum, state.damageMultiplier),
    1,
  );
  const projectile = {
    engineId: empower.engineId,
    activationId: empower.activationId,
    direction,
    targetTile: { tx: targetTile.tx, ty: targetTile.ty },
    rangeTiles: paths.rangeTiles,
    infiniteRange: paths.infiniteRange,
    traversalLimitTiles: paths.traversalLimitTiles,
    traversedRangeTiles: endTiles.reduce(
      (maximum, tile) => Math.max(maximum, tile.distance),
      0,
    ),
    sideLanes: paths.sideLanes,
    damageMultiplier: baseDamageMultiplier,
    maximumDamageMultiplier: baseDamageMultiplier * maximumStateMultiplier,
    projectileStateCount: Math.max(1, paths.states.length),
    hits,
    endTiles,
    visualPaths,
    blockedTiles,
    impactedCount: successfulHits.length,
    destroyedCount: successfulHits.filter(hit => hit.result.destroyed).length,
  };
  const fallbackReason = blockedTiles.length > 0 ? "blocked" : "no-target";
  return {
    ...(primaryHit?.result || { success: false, reason: fallbackReason }),
    hitTile: primaryHit ? { tx: primaryHit.tx, ty: primaryHit.ty } : null,
    celestialProjectile: projectile,
  };
}
