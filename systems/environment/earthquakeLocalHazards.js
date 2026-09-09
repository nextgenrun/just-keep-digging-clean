import { TILE_TYPES } from "../../values/tileTypes.js";
import { resolveFallZoneGeometry } from "./earthquakeFallZoneMath.js";

export function collectLocalFallZones(system, limit) {
  if (limit <= 0) return [];
  const { scene, config } = system, world = scene.worldModel;
  const player = scene.playerController?.getPlayerTile?.();
  const origin = player || system.epicenter;
  if (!origin || !world) return [];
  const cfg = config.localHazards, spawn = config.worldSpawn;
  const ts = scene.config.tileSize;
  const vx = Number(scene.playerController?.physicsBody?.vx) || 0;
  const lead = Math.max(-cfg.maximumLeadTiles, Math.min(cfg.maximumLeadTiles, vx * cfg.leadSeconds / ts));
  const targetX = origin.tx + lead;
  const occupied = new Set([...system.caveIns, ...system.fallingRocks].map(zone => zone.tx));
  const candidates = [];
  for (let tx = origin.tx - cfg.searchHalfWidthTiles; tx <= origin.tx + cfg.searchHalfWidthTiles; tx += 1) {
    if (occupied.has(tx)) continue;
    for (let ty = origin.ty - spawn.ceilingSearchAboveTiles; ty <= origin.ty; ty += 1) {
      if (!world.inBounds(tx, ty) || !system._isMutableCeiling(tx, ty)) continue;
      const geometry = resolveFallZoneGeometry({
        worldModel: world, tx, sourceTy: ty, airType: TILE_TYPES.AIR,
        minimumAirTiles: spawn.minAirDropTiles, maximumAirTiles: spawn.maxAirDropTiles,
      });
      if (!geometry || geometry.landingTy < origin.ty) continue;
      candidates.push({ tx, ty, type: world.getTileType(tx, ty), ...geometry,
        originalType: world.getTileType(tx, ty),
        score: -Math.abs(tx - targetX) * cfg.horizontalPriority
          - Math.abs(ty - origin.ty) + Math.random() * cfg.scoreJitter });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const selected = [];
  for (const candidate of candidates) {
    if (selected.some(other => Math.abs(other.tx - candidate.tx) < spawn.caveInSpacingTiles)) continue;
    selected.push(candidate);
    if (selected.length >= limit) break;
  }
  return selected;
}

// A mined-away floor cannot suspend a rock in mid-air. New solid cover stops it.
export function resolveRockLandingRow(world, rock, tileSize, maximumFallTiles) {
  if (!world?.getTileType) return rock.landingTy;
  const start = Math.max(rock.ty + 1, Math.floor(rock.y / tileSize));
  const end = Math.min(Number.isFinite(world.depthTiles) ? world.depthTiles - 1 : Infinity, rock.ty + maximumFallTiles);
  for (let row = start; row <= end; row += 1) {
    if (world.getTileType(rock.tx, row) !== TILE_TYPES.AIR) return row;
  }
  return end;
}