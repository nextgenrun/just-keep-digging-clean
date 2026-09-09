import { isGameplayLevelEnabled } from "../../values/gameplayDevFlags.js";
import {
  LEVEL_ONE_BIOME_FIELD,
  resolveLevelOneBiomeFieldAtTile,
  resolveLevelOneBiomeFieldEnabled,
} from "../../values/levelOneBiomeField.js";
import { TITAN_DEFINITIONS } from "../../values/titanDiscoveries.js";
import { V11_SKY_ISLAND_LAYOUT } from "../../values/v11SkyIslandLayout.js";
import { WORLD_MAP_CONFIG } from "../../values/worldMapConfig.js";
import { WORLD_MAP_COPY } from "../../values/playerFacingCopy.js";
import {
  WORLD_VISUAL_LANDMARKS,
  resolveWorldVisualLandmarksEnabled,
} from "../../values/worldVisualLandmarks.js";
import {
  WORLD_VISUAL_SURFACE_HERO_LANDMARKS,
  resolveWorldVisualSurfaceHeroLandmarksEnabled,
} from "../../values/worldVisualSurfaceHeroLandmarks.js";
import { resolveWorldMapPlayerTile } from "./resolveWorldMapPlayerTile.js";

const TITAN_BY_ID = new Map(TITAN_DEFINITIONS.map(definition => [definition.id, definition]));

function getWorldDimensions(worldModel) {
  return {
    width: Number(worldModel?.widthTiles ?? worldModel?.width) || 0,
    depth: Number(worldModel?.depthTiles ?? worldModel?.depth) || 0,
  };
}

function isTileInWorld(worldModel, tileX, tileY) {
  const { width, depth } = getWorldDimensions(worldModel);
  return tileX >= 0 && tileY >= 0 && tileX < width && tileY < depth;
}

function tileToWorld(worldModel, tileX, tileY) {
  if (typeof worldModel?.tileToWorld === "function") {
    return worldModel.tileToWorld(tileX, tileY);
  }
  const tileSize = Number(worldModel?.tileSize ?? worldModel?.config?.tileSize) || 1;
  return {
    x: tileX * tileSize + tileSize * 0.5,
    y: tileY * tileSize + tileSize * 0.5,
  };
}

function createMarker(worldModel, marker) {
  if (!isTileInWorld(worldModel, marker.tileX, marker.tileY)) return null;
  const world = tileToWorld(worldModel, marker.tileX, marker.tileY);
  return {
    ...marker,
    worldX: world.x,
    worldY: world.y,
  };
}

function resolveMineEntrance(worldModel) {
  const entry = WORLD_VISUAL_LANDMARKS.entries[0];
  if (!entry || !resolveWorldVisualLandmarksEnabled()) return null;
  const standaloneOnly = entry.anchor?.kind === "shallowestStandaloneCaveMouth";
  const zone = (worldModel?.caveZones || [])
    .filter(candidate => candidate?.mouthAnchor && (!standaloneOnly || candidate.standaloneScene))
    .filter(candidate => {
      const tile = candidate.entry || {
        tx: Math.ceil(candidate.mouthAnchor.tx),
        ty: candidate.mouthAnchor.ty,
      };
      return typeof worldModel?.isSolid !== "function"
        || (!worldModel.isSolid(tile.tx, tile.ty) && worldModel.isSolid(tile.tx, tile.ty + 1));
    })
    .sort((a, b) => a.mouthAnchor.ty - b.mouthAnchor.ty || a.mouthAnchor.tx - b.mouthAnchor.tx)[0];
  if (!zone) return null;
  return {
    tileX: zone.mouthAnchor.tx + entry.anchor.xDeltaTiles,
    tileY: zone.mouthAnchor.ty,
  };
}

function getLandmarkMarkers({ worldModel }) {
  const config = WORLD_MAP_CONFIG;
  const frames = config.symbolAtlas.frames;
  const priorities = config.annotations.markerPriorities;
  const surfaceTileY = Number(worldModel?.topAirRows ?? worldModel?.config?.topAirRows) || 0;
  const markers = [];
  const town = config.landmarks.townSquare;
  markers.push(createMarker(worldModel, {
    id: town.id,
    tileX: town.tileX,
    tileY: surfaceTileY,
    label: town.label,
    detail: town.detail,
    iconFrame: frames.landmark,
    iconSizeKey: "landmark",
    priority: priorities.town,
    alwaysVisible: true,
  }));

  const mineEntrance = resolveMineEntrance(worldModel);
  if (mineEntrance) {
    markers.push(createMarker(worldModel, {
      id: "mine-entrance",
      ...mineEntrance,
      label: config.landmarks.mineEntranceLabel,
      detail: config.landmarks.mineEntranceDetail,
      iconFrame: frames.landmark,
      iconSizeKey: "landmark",
      priority: priorities.mineEntrance,
    }));
  }

  for (const level of V11_SKY_ISLAND_LAYOUT.levels) {
    if (!isGameplayLevelEnabled(level.levelId)) continue;
    markers.push(createMarker(worldModel, {
      id: `sky-island-${level.levelId}`,
      tileX: level.pillarTileX,
      tileY: level.pillarTileY,
      label: config.landmarks.skyIslandLabels[level.levelId],
      detail: config.landmarks.skyIslandDetail,
      iconFrame: frames.landmark,
      iconSizeKey: "landmark",
      priority: priorities.skyIsland,
    }));
  }

  const enabled = resolveWorldVisualSurfaceHeroLandmarksEnabled();
  for (const placement of WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements) {
    if (placement.level === "level2" && !isGameplayLevelEnabled(2)) continue;
    if (!enabled[placement.assetId]) continue;
    markers.push(createMarker(worldModel, {
      id: placement.id,
      tileX: placement.tileX,
      tileY: surfaceTileY,
      label: config.landmarks.surfaceHeroLabels[placement.assetId] || placement.chapterId,
      iconFrame: frames.landmark,
      iconSizeKey: "landmark",
      priority: priorities.landmark,
    }));
  }
  return markers.filter(Boolean);
}

function getPortalMarkers({ scene, worldModel }) {
  const config = WORLD_MAP_CONFIG;
  const frame = config.symbolAtlas.frames.portal;
  const priority = config.annotations.markerPriorities.portal;
  const portals = scene?.specialTileSystem?.getActivatedPortals?.() || [];
  return portals.map(portal => createMarker(worldModel, {
    id: portal.key,
    tileX: portal.tx,
    tileY: portal.ty,
    label: portal.label,
    detail: `${portal.depth}m ${config.landmarks.portalDepthSuffix}`,
    iconFrame: frame,
    iconSizeKey: "portal",
    priority,
    alwaysVisible: true,
  })).filter(Boolean);
}

function getStarMarkers({ scene, worldModel, discoverySystem }) {
  const markers = scene?.worldMapStarTerritorySystem?.getMarkers?.(
    discoverySystem,
    resolveWorldMapPlayerTile(scene),
  ) || [];
  return markers.map(marker => createMarker(worldModel, marker)).filter(Boolean);
}

function getTitanBiomeLabel(tileX, tileY, definition) {
  if (!resolveLevelOneBiomeFieldEnabled()) return definition.regionLabel;
  return resolveLevelOneBiomeFieldAtTile(tileX, tileY, LEVEL_ONE_BIOME_FIELD)?.label
    || definition.regionLabel;
}

function getTitanMarkers({ scene, worldModel }) {
  const config = WORLD_MAP_CONFIG;
  const frames = config.symbolAtlas.frames;
  const priorities = config.annotations.markerPriorities;
  const snapshot = scene?.worldRenderer?.getTitanDiscoverySnapshot?.();
  const zones = Array.isArray(snapshot?.zones) ? snapshot.zones : [];
  const discovered = new Set(scene?.retentionProgressSystem?.getDiscoveredTitans?.() || []);
  const trackedId = scene?.titanClueSystem?.getActiveClueId?.() || null;
  const surfaceTileY = Number(worldModel?.topAirRows ?? worldModel?.config?.topAirRows) || 0;
  const markers = [];

  for (const zone of zones) {
    const definition = TITAN_BY_ID.get(zone.id);
    if (!definition) continue;
    const isDiscovered = zone.discovered === true || discovered.has(zone.id);
    const tracked = trackedId === zone.id;
    const resonating = Number(zone.coverageProgress) > 0 || Number(zone.revealed) > 0;
    if (!isDiscovered && !tracked && !resonating) continue;
    const tileX = zone.left + zone.width * 0.5;
    const tileY = zone.top + zone.height * 0.5;
    const depth = Math.max(0, Math.round(tileY - surfaceTileY));
    const label = isDiscovered ? definition.name : WORLD_MAP_COPY.titanResonance;
    const detail = tracked
      ? `${WORLD_MAP_COPY.tracked} · ${depth}m`
      : `${getTitanBiomeLabel(tileX, tileY, definition)} · ${depth}m`;
    markers.push(createMarker(worldModel, {
      id: zone.id,
      tileX,
      tileY,
      label,
      detail,
      iconFrame: isDiscovered ? frames.titan : frames.resonance,
      iconSizeKey: isDiscovered ? "titan" : "resonance",
      priority: tracked
        ? priorities.trackedTitan
        : (isDiscovered ? priorities.discoveredTitan : priorities.resonance),
      alwaysVisible: true,
      state: tracked ? "tracked" : (isDiscovered ? "discovered" : "resonance"),
    }));
  }
  return markers.filter(Boolean);
}

export function registerWorldMapCoreActivities(activityRegistry) {
  if (!activityRegistry?.register) return Object.freeze([]);
  const providers = [
    ["landmarks", getLandmarkMarkers],
    ["portals", getPortalMarkers],
    ["titans", getTitanMarkers],
    ["stars", getStarMarkers],
  ];
  return Object.freeze(providers.map(([id, getMarkers]) => {
    const presentation = WORLD_MAP_CONFIG.coreActivities[id];
    return activityRegistry.register(id, {
      ...presentation,
      iconFrame: WORLD_MAP_CONFIG.symbolAtlas.frames[presentation.iconFrame],
      getMarkers,
    });
  }));
}
