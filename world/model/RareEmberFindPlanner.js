import { CAVE_GAMEPLAY_CONFIG } from "../../values/caveGameplay.js";
import { hashUint } from "../../values/deterministicMath.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

function isInRange(worldModel, zone, range, topAirRows) {
  const depth = Math.max(0, Number(zone?.cy) - topAirRows);
  const levelTwoLeftTile = Number.isFinite(worldModel.config?.levelTwoLeftTile)
    ? worldModel.config.levelTwoLeftTile
    : Number.POSITIVE_INFINITY;
  const sourceMatches = range.caveSource === "second-world"
    ? zone?.source === "second-world"
    : zone?.source !== "second-world" && Number(zone?.cx) < levelTwoLeftTile;
  return sourceMatches
    && depth >= range.minDepth
    && depth < range.maxDepthExclusive;
}

function candidateScore(worldModel, seam, bandIndex, salt) {
  return hashUint(
    worldModel.config.seed || 133742,
    seam.tx,
    seam.ty,
    salt + bandIndex * 1009,
  );
}

/** Replaces one ordinary cave seam per broad depth band with a rare Ember. */
export function applyRareEmberFinds(
  worldModel,
  gameplayConfig = CAVE_GAMEPLAY_CONFIG,
) {
  const config = gameplayConfig.rareEmberFinds;
  worldModel.rareEmberFinds = [];
  if (!config?.enabled) return worldModel.rareEmberFinds;

  const emberType = TILE_TYPES[config.tileTypeKey];
  if (!Number.isInteger(emberType)) return worldModel.rareEmberFinds;
  const topAirRows = Number(worldModel.topAirRows) || 0;
  const salt = gameplayConfig.salts.rareEmber;

  for (const range of config.ranges || []) {
    const zones = (worldModel.caveZones || [])
      .filter(zone => isInRange(worldModel, zone, range, topAirRows));
    for (
      let bandStart = range.minDepth, bandIndex = 0;
      bandStart < range.maxDepthExclusive;
      bandStart += range.bandSize, bandIndex += 1
    ) {
      const bandEnd = Math.min(range.maxDepthExclusive, bandStart + range.bandSize);
      const candidates = zones.flatMap(zone => (zone.resourceSeams || [])
        .filter(seam => {
          const depth = seam.ty - topAirRows;
          const levelTwoLeftTile = Number.isFinite(worldModel.config?.levelTwoLeftTile)
            ? worldModel.config.levelTwoLeftTile
            : Number.POSITIVE_INFINITY;
          return depth >= bandStart
            && depth < bandEnd
            && (range.caveSource === "second-world" || seam.tx < levelTwoLeftTile);
        })
        .map(seam => ({ zone, seam })));
      if (!candidates.length) continue;
      candidates.sort((a, b) => (
        candidateScore(worldModel, a.seam, bandIndex, salt)
        - candidateScore(worldModel, b.seam, bandIndex, salt)
      ));
      const selected = candidates[0];
      const hp = worldModel.getTileMaxHp(
        selected.seam.tx,
        selected.seam.ty,
        emberType,
      );
      worldModel.setTile(selected.seam.tx, selected.seam.ty, emberType, hp);
      selected.seam.tileType = emberType;
      selected.seam.rareFind = true;
      selected.seam.rewardSource = config.source;
      worldModel.rareEmberFinds.push(Object.freeze({
        id: `${range.id}:${bandIndex + 1}`,
        rangeId: range.id,
        caveId: selected.zone.id,
        tx: selected.seam.tx,
        ty: selected.seam.ty,
        depth: selected.seam.ty - topAirRows,
      }));
    }
  }
  return worldModel.rareEmberFinds;
}
