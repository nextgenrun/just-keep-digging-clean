import {
  buildTitanCreatureCoverageCells,
  countRemainingTitanCoverage,
} from "./titanCreatureFootprint.js";
import { fitTitanChamberScale } from "./titanChamberGeometry.js?rev=20260729-native-density-v14";
import { getTitanCoverageRequired } from "./titanCoverageThreshold.js";

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
  const coverageCells = buildTitanCreatureCoverageCells(zone);
  const renderAsset = definition.surfaceAsset;
  const underground = config.underground;
  const sprite = scene.add.image(baseX, baseY, renderAsset.key);
  const glowSprite = scene.add.image(baseX, baseY, renderAsset.key);
  const baseScale = fitTitanChamberScale(
    sprite,
    widthPx * underground.titanFitFraction,
    heightPx * underground.titanFitFraction,
    config.density.maxSourceScale,
  );
  sprite
    .setDepth(underground.spriteDepth)
    .setScale(baseScale)
    .setAlpha(underground.coveredAlpha);
  glowSprite
    .setDepth(underground.glowDepth)
    .setScale(baseScale)
    .setTint(definition.glowTint)
    .setBlendMode("ADD")
    .setAlpha(0);
  const daisY = (
    zone.bottomExclusive - underground.daisCenterInsetTiles
  ) * tileSize;
  const daisSprite = scene.add.image(
    baseX,
    daisY,
    config.assets.undergroundDais.key
  );
  const daisGlowSprite = scene.add.image(
    baseX,
    daisY,
    config.assets.undergroundDais.key
  );
  [daisSprite, daisGlowSprite].forEach(image => image.setDisplaySize(
    underground.daisWidthTiles * tileSize,
    underground.daisHeightTiles * tileSize
  ));
  daisSprite
    .setDepth(underground.daisDepth)
    .setAlpha(underground.daisAlpha);
  daisGlowSprite
    .setDepth(underground.daisGlowDepth)
    .setTint(definition.glowTint)
    .setBlendMode("ADD")
    .setAlpha(underground.daisGlowAlpha);
  const coverageRequired = getTitanCoverageRequired(
    coverageCells.length,
    experienceConfig.encounter.requiredClearRatio
  );
  return {
    zone,
    definition,
    sprite,
    glowSprite,
    daisSprite,
    daisGlowSprite,
    renderAsset,
    baseX,
    baseY,
    settledX: baseX,
    baseScale,
    tileSize,
    leftPx: zone.left * tileSize,
    topPx: zone.top * tileSize,
    widthPx,
    heightPx,
    coverageCells,
    coverageTotal: coverageCells.length,
    coverageRequired,
    coverageRemaining: coverageCells.length,
    coverageCleared: 0,
    coverageProgress: 0,
    coverageValid: (
      coverageCells.length
      >= experienceConfig.encounter.minimumCoverageTiles
    ),
    legacyModeId: experienceConfig.encounter.legacyModeId,
    zoneRemaining: zone.cells.length,
    remaining: coverageCells.length,
    revealed: 0,
    progress: 0,
    ready: false,
    discovered: false,
    animating: false,
    chamberSprite: null,
    chamberGlowSprite: null,
  };
}

export function syncTitanCoverageState(worldModel, view) {
  view.coverageRemaining = countRemainingTitanCoverage(
    worldModel,
    view.coverageCells
  );
  view.coverageCleared = view.coverageTotal - view.coverageRemaining;
  view.coverageProgress = view.coverageCleared
    / Math.max(1, view.coverageTotal);
  view.remaining = view.coverageRemaining;
  view.revealed = view.coverageCleared;
  view.progress = view.coverageProgress;
}

export function syncTitanDiscoveryViews(
  worldModel,
  views,
  discovered,
  encounterMode,
  config
) {
  for (const view of views) {
    view.zoneRemaining = view.zone.cells.reduce(
      (total, cell) => total + (worldModel.isSolid(cell.tx, cell.ty) ? 1 : 0),
      0
    );
    syncTitanCoverageState(worldModel, view);
    view.discovered = discovered.has(view.definition.id);
    view.ready = !view.discovered && (
      encounterMode === view.legacyModeId
        ? view.zoneRemaining === 0
        : view.coverageValid
          && view.coverageCleared >= view.coverageRequired
    );
    if (view.animating) continue;
    if (view.discovered) {
      view.settledX = view.baseX + view.definition.travelDirection
        * view.definition.travelTiles
        * view.tileSize;
      view.sprite
        .setX(view.settledX)
        .setAlpha(config.underground.discoveredAlpha);
      view.glowSprite.setX(view.settledX).setAlpha(0);
      view.chamberSprite
        ?.setX(view.baseX)
        .setAlpha(config.chambers.discoveredCardAlpha);
      view.chamberGlowSprite?.setX(view.baseX).setAlpha(0);
      view.daisSprite.setAlpha(config.underground.daisAlpha);
      view.daisGlowSprite.setAlpha(config.underground.daisGlowAlpha);
      continue;
    }
    view.settledX = view.baseX;
    view.sprite
      .setX(view.baseX)
      .setAlpha(
        config.underground.coveredAlpha
        + config.underground.coverageProgressAlpha * view.coverageProgress
      );
    view.glowSprite.setX(view.baseX).setAlpha(0);
    view.chamberSprite
      ?.setX(view.baseX)
      .setAlpha(
        config.chambers.lockedCardAlpha
        + config.chambers.lockedCardProgressAlpha * view.coverageProgress
      );
    view.chamberGlowSprite?.setX(view.baseX).setAlpha(0);
    view.daisSprite.setAlpha(config.underground.daisAlpha);
    view.daisGlowSprite.setAlpha(config.underground.daisGlowAlpha);
  }
}
