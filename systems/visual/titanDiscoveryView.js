import { getRequiredTitanRevealTiles } from "./titanDiscoveryEncounter.js";
import { fitTitanChamberScale } from "./titanChamberGeometry.js";

export function createTitanDiscoveryView(
  scene,
  worldModel,
  zone,
  config,
  experienceConfig
) {
  const definition = zone.definition;
  const tileSize = worldModel.tileSize;
  const baseX = zone.centerXTile * tileSize;
  const baseY = zone.centerYTile * tileSize;
  const widthPx = (zone.rightExclusive - zone.left) * tileSize;
  const heightPx = (zone.bottomExclusive - zone.top) * tileSize;
  const sprite = scene.add.image(baseX, baseY, definition.asset.key);
  const glowSprite = scene.add.image(baseX, baseY, definition.asset.key);
  const baseScale = fitTitanChamberScale(
    sprite,
    widthPx * config.backdrop.fitFraction,
    heightPx * config.backdrop.fitFraction
  );
  sprite
    .setDepth(config.backdrop.spriteDepth)
    .setScale(baseScale)
    .setAlpha(config.backdrop.hiddenAlpha);
  glowSprite
    .setDepth(config.backdrop.glowDepth)
    .setScale(baseScale)
    .setTint(definition.glowTint)
    .setBlendMode("ADD")
    .setAlpha(0);
  return {
    zone,
    definition,
    sprite,
    glowSprite,
    baseX,
    baseY,
    settledX: baseX,
    baseScale,
    tileSize,
    leftPx: zone.left * tileSize,
    topPx: zone.top * tileSize,
    widthPx,
    heightPx,
    remaining: zone.cells.length,
    revealed: 0,
    requiredReveal: getRequiredTitanRevealTiles(
      zone.cells.length,
      experienceConfig
    ),
    progress: 0,
    ready: false,
    discovered: false,
    animating: false,
  };
}

export function syncTitanDiscoveryViews(
  worldModel,
  views,
  discovered,
  encounterMode,
  config
) {
  for (const view of views) {
    view.remaining = view.zone.cells.reduce(
      (total, cell) => total + (worldModel.isSolid(cell.tx, cell.ty) ? 1 : 0),
      0
    );
    view.revealed = view.zone.cells.length - view.remaining;
    view.progress = 1 - view.remaining / Math.max(1, view.zone.cells.length);
    view.discovered = discovered.has(view.definition.id);
    view.ready = !view.discovered && (
      encounterMode === "legacy"
        ? view.remaining === 0
        : view.revealed >= view.requiredReveal
    );
    if (view.animating) continue;
    if (view.discovered) {
      view.settledX = view.baseX + view.definition.travelDirection
        * view.definition.travelTiles
        * view.tileSize;
      view.sprite
        .setX(view.settledX)
        .setAlpha(config.backdrop.discoveredAlpha);
      view.glowSprite.setX(view.settledX).setAlpha(0);
      continue;
    }
    view.settledX = view.baseX;
    view.sprite
      .setX(view.baseX)
      .setAlpha(
        config.backdrop.hiddenAlpha
        + config.backdrop.progressAlpha * view.progress
      );
    view.glowSprite.setX(view.baseX).setAlpha(0);
  }
}
