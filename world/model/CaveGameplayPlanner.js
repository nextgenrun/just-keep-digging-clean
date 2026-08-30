import { CAVE_GAMEPLAY_CONFIG } from "../../values/caveGameplay.js";
import { planCaveHazards } from "./CaveHazardPlanner.js";
import { applyCaveResourceSeams } from "./CaveResourceSeamPlanner.js";
import { applyRareEmberFinds } from "./RareEmberFindPlanner.js";

export function finalizeCaveGameplay(worldModel, gameplayConfig = CAVE_GAMEPLAY_CONFIG) {
  worldModel.caveHazardZones = [];
  for (const zone of worldModel.caveZones || []) {
    applyCaveResourceSeams(worldModel, zone, gameplayConfig);
    worldModel.caveHazardZones.push(...planCaveHazards(worldModel, zone, gameplayConfig));
  }
  applyRareEmberFinds(worldModel, gameplayConfig);
  const seamByCell = new Map();
  for (const zone of worldModel.caveZones || []) {
    for (const seam of zone.resourceSeams || []) {
      if (worldModel.getTileType(seam.tx, seam.ty) !== seam.tileType) continue;
      seamByCell.set(`${seam.tx},${seam.ty}`, seam);
    }
  }
  worldModel.caveResourceSeams = [...seamByCell.values()];
  for (const zone of worldModel.caveZones || []) {
    zone.resourceSeams = (zone.resourceSeams || []).filter(seam => (
      seamByCell.get(`${seam.tx},${seam.ty}`) === seam
    ));
  }
  const hazardLights = worldModel.caveHazardZones.map(hazard => ({
    id: `cave-hazard-light:${hazard.id}`,
    source: gameplayConfig.hazards.source,
    caveId: hazard.caveId,
    archetypeId: hazard.archetypeId,
    cx: hazard.centerTx,
    cy: (hazard.ceilingY + hazard.floorY) / 2,
    rx: Math.max(1, (hazard.endTx - hazard.startTx + 1) / 2),
    ry: Math.max(1, (hazard.floorY - hazard.ceilingY) / 2),
    color: hazard.glowColor,
    alpha: gameplayConfig.hazards.hazardLightAlpha,
    lightRadiusTiles: gameplayConfig.hazards.hazardLightRadiusTiles,
    isHazardLight: true,
    kind: hazard.kind,
    periodMs: hazard.periodMs,
    activeMs: hazard.activeMs,
    telegraphMs: hazard.telegraphMs,
    static: hazard.static,
    phaseMs: hazard.phaseMs,
  }));
  worldModel.caveLightZones = [
    ...(worldModel.caveLightZones || [])
      .filter(zone => zone.source !== gameplayConfig.hazards.source),
    ...hazardLights,
  ];
  return {
    resourceBlocks: worldModel.caveResourceSeams.length,
    hazards: worldModel.caveHazardZones.length,
  };
}
