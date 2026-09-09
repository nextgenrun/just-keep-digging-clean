import { hashUint } from "../../values/deterministicMath.js";
import {
  RANDOM_EVENT_TYPES,
  RANDOM_WORLD_EVENT_CONFIG,
} from "../../values/randomWorldEvents.js";

import { planSignalEvent } from "./SignalEventPlanner.js";

const OFFSETS = Object.freeze([
  Object.freeze({ tx: 1, ty: 0 }),
  Object.freeze({ tx: -1, ty: 0 }),
  Object.freeze({ tx: 0, ty: 1 }),
  Object.freeze({ tx: 0, ty: -1 }),
]);
const tileKey = (tx, ty) => `${tx},${ty}`;
const distance = (a, b) => Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);

function viewportBounds(scene, playerTile) {
  const tileSize = scene.config.tileSize;
  const margin = RANDOM_WORLD_EVENT_CONFIG.eligibility.viewportMarginTiles;
  const view = scene.cameras?.main?.worldView;
  if (view && Number.isFinite(view.x) && Number.isFinite(view.width)) {
    return {
      left: Math.floor(view.x / tileSize) + margin,
      right: Math.floor((view.x + view.width) / tileSize) - margin,
      top: Math.floor(view.y / tileSize) + margin,
      bottom: Math.floor((view.y + view.height) / tileSize) - margin,
    };
  }
  const cfg = RANDOM_WORLD_EVENT_CONFIG.eligibility;
  return {
    left: playerTile.tx - cfg.fallbackRadiusXTiles,
    right: playerTile.tx + cfg.fallbackRadiusXTiles,
    top: playerTile.ty - cfg.fallbackRadiusYTiles,
    bottom: playerTile.ty + cfg.fallbackRadiusYTiles,
  };
}

function inBounds(bounds, tx, ty) {
  return tx >= bounds.left && tx <= bounds.right && ty >= bounds.top && ty <= bounds.bottom;
}

function resolveOpenStart(worldModel, playerTile) {
  if (!worldModel.isSolid(playerTile.tx, playerTile.ty)) return { ...playerTile };
  for (const offset of OFFSETS) {
    const tx = playerTile.tx + offset.tx;
    const ty = playerTile.ty + offset.ty;
    if (!worldModel.isSolid(tx, ty)) return { tx, ty };
  }
  return null;
}

export function buildReachableOpenCells(scene, playerTile) {
  const worldModel = scene.worldModel;
  const start = resolveOpenStart(worldModel, playerTile);
  if (!start) return null;
  const bounds = viewportBounds(scene, playerTile);
  const queue = [start];
  const cells = [];
  const visited = new Set([tileKey(start.tx, start.ty)]);
  const flightUnlocked = scene.openingFlightArtifactSystem?.isArtifactCollected?.() === true
    || scene.upgradeSystem?.isGemPowerUnlocked?.() === true;
  const limit = RANDOM_WORLD_EVENT_CONFIG.eligibility.maxReachableCells;

  for (let cursor = 0; cursor < queue.length && cells.length < limit; cursor += 1) {
    const cell = queue[cursor];
    cells.push(cell);
    for (const offset of OFFSETS) {
      if (!flightUnlocked && offset.ty < 0) continue;
      const tx = cell.tx + offset.tx;
      const ty = cell.ty + offset.ty;
      const key = tileKey(tx, ty);
      if (visited.has(key) || !inBounds(bounds, tx, ty)) continue;
      if (!worldModel.inBounds(tx, ty) || worldModel.isSolid(tx, ty)) continue;
      visited.add(key);
      queue.push({ tx, ty });
    }
  }
  return { start, cells, bounds };
}

function zoneIdentity(zone) {
  if (!zone) return null;
  return String(zone.id || zone.key || `${zone.cx},${zone.cy},${zone.rx || zone.width},${zone.ry || zone.height}`);
}

function selectSpaced(points, count, seed, serial, minimumDistance = 2) {
  const ordered = [...points].sort((a, b) => (
    hashUint(a.tx, a.ty, seed, serial) - hashUint(b.tx, b.ty, seed, serial)
  ));
  const selected = [];
  for (const point of ordered) {
    if (selected.every(existing => distance(existing, point) >= minimumDistance)) selected.push(point);
    if (selected.length >= count) break;
  }
  return selected;
}

export function planCrystalChoir(scene, reachable, depth, serial) {
  const cfg = RANDOM_WORLD_EVENT_CONFIG.crystalChoir;
  const playerZoneId = zoneIdentity(scene.worldModel.getCaveZoneAtTile?.(
    reachable.start.tx,
    reachable.start.ty,
  ));
  if (!playerZoneId) return null;
  const candidates = [];
  const seen = new Set();
  for (const approach of reachable.cells) {
    if (zoneIdentity(scene.worldModel.getCaveZoneAtTile?.(approach.tx, approach.ty)) !== playerZoneId) continue;
    for (const offset of OFFSETS) {
      const tx = approach.tx + offset.tx;
      const ty = approach.ty + offset.ty;
      const key = tileKey(tx, ty);
      if (seen.has(key) || !scene.worldModel.isDiggable(tx, ty)) continue;
      seen.add(key);
      candidates.push({ tx, ty });
    }
  }
  const anchors = selectSpaced(candidates, cfg.anchorCount, scene.worldModel.config.seed, serial, 2);
  if (anchors.length !== cfg.anchorCount) return null;
  const length = depth >= cfg.deepDepth
    ? cfg.deepSequenceLength
    : depth >= cfg.middleDepth ? cfg.middleSequenceLength : cfg.shallowSequenceLength;
  const sequence = anchors.map((_, index) => index)
    .sort((a, b) => hashUint(a, serial, depth, 293) - hashUint(b, serial, depth, 293))
    .slice(0, length);
  return { anchors, sequence, choirId: playerZoneId };
}

export function planBlackoutBloom(scene, reachable, playerTile, serial) {
  const cfg = RANDOM_WORLD_EVENT_CONFIG.blackoutBloom;
  const candidates = reachable.cells.filter(cell => (
    distance(cell, playerTile) >= RANDOM_WORLD_EVENT_CONFIG.eligibility.minAnchorDistanceTiles
    && scene.worldModel.isSolid(cell.tx, cell.ty + 1)
  ));
  const anchors = selectSpaced(candidates, cfg.anchorCount, scene.worldModel.config.seed, serial, 4);
  return anchors.length === cfg.anchorCount ? { anchors } : null;
}

export function buildRandomEventPlans(scene, playerTile, director) {
  const reachable = buildReachableOpenCells(scene, playerTile);
  if (!reachable) return {};
  const depth = Math.max(0, playerTile.ty - scene.config.topAirRows + 1);
  const serial = director.state.serial + 1;
  const plans = {};
  const choirPlan = planCrystalChoir(scene, reachable, depth, serial);
  plans[RANDOM_EVENT_TYPES.CRYSTAL_CHOIR] = choirPlan && !director.hasCompletedChoir(choirPlan.choirId)
    ? choirPlan : null;
  plans[RANDOM_EVENT_TYPES.SIGNAL] = planSignalEvent(scene, playerTile, serial);
  return { plans, depth };
}

export function tileManhattanDistance(a, b) { return distance(a, b); }
