import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";

/** Draws the current territory's direct navigation link from player to Star. */
export function drawWorldMapStarNavigation({
  graphics,
  layout,
  playerTile,
  currentTerritory,
  worldToScreen,
  config = WORLD_MAP_CONFIG,
}) {
  if (!playerTile || !currentTerritory) return false;
  const presentation = config.starTerritories;
  const player = worldToScreen(playerTile.tx, playerTile.ty, layout);
  const target = worldToScreen(currentTerritory.tx, currentTerritory.ty, layout);
  const consumed = currentTerritory.state === "consumed";
  const color = consumed
    ? presentation.routeLostColor
    : (currentTerritory.discovered
      ? currentTerritory.color
      : presentation.routeSignalColor);
  graphics.lineStyle(presentation.routeWidthPx, color, presentation.routeAlpha);
  graphics.lineBetween(player.x, player.y, target.x, target.y);
  graphics.lineStyle(
    presentation.routeWidthPx,
    color,
    presentation.routeTargetAlpha,
  );
  graphics.strokeCircle(target.x, target.y, presentation.routeTargetRadiusPx);
  graphics.fillStyle(color, presentation.routeTargetAlpha);
  graphics.fillCircle(target.x, target.y, presentation.routeTargetInnerRadiusPx);
  return true;
}
