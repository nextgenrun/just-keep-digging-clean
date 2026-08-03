import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  mixWorldVisualTint,
  resolveWorldVisualDepthBackdropTint,
} from "../../values/worldVisualDepthBackdrops.js";
import {
  buildTitanCreatureCoverageCells,
  countRemainingTitanCoverage,
} from "./titanCreatureFootprint.js";
import { fitTitanChamberScale } from "./titanChamberGeometry.js?rev=20260729-native-density-v14";
import { getTitanCoverageRequired } from "./titanCoverageThreshold.js";

function fitContactScale(sprite, widthPx, heightPx) {
  return fitTitanChamberScale(sprite, widthPx, heightPx, 1);
}

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
  const chamberCenterY = zone.centerYTile * tileSize;
  const widthPx = (zone.rightExclusive - zone.left) * tileSize;
  const heightPx = (zone.bottomExclusive - zone.top) * tileSize;
  const coverageCells = buildTitanCreatureCoverageCells(zone);
  const renderAsset = definition.surfaceAsset;
  const underground = config.underground;
  const sprite = scene.add.image(baseX, chamberCenterY, renderAsset.key);
  const glowSprite = scene.add.image(baseX, chamberCenterY, renderAsset.key);
  sprite.setOrigin(0.5, 1);
  glowSprite.setOrigin(0.5, 1);
  const baseScale = fitTitanChamberScale(
    sprite,
    widthPx * underground.titanFitFraction,
    heightPx * underground.titanFitFraction,
    config.density.maxSourceScale
  );
  const groundY = (
    zone.bottomExclusive - underground.groundBaselineInsetTiles
  ) * tileSize;
  const baseY = groundY
    - underground.daisHeightTiles * tileSize
    + underground.stanceBottomPaddingPx * baseScale
    + underground.creatureContactInsetTiles * tileSize;
  sprite
    .setPosition(baseX, baseY)
    .setDepth(underground.spriteDepth)
    .setScale(baseScale)
    .setAlpha(underground.coveredAlpha);
  glowSprite
    .setPosition(baseX, baseY)
    .setDepth(underground.glowDepth)
    .setScale(baseScale)
    .setTint(definition.glowTint)
    .setBlendMode("ADD")
    .setAlpha(0);

  const daisSprite = scene.add.image(
    baseX,
    groundY,
    config.assets.undergroundDais.key
  );
  const daisGlowSprite = scene.add.image(
    baseX,
    groundY,
    config.assets.undergroundDais.key
  );
  [daisSprite, daisGlowSprite].forEach(image => image
    .setOrigin(0.5, 1)
    .setDisplaySize(
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

  const contactY = groundY + underground.contactDropTiles * tileSize;
  const contactSprite = scene.add.image(
    baseX,
    contactY,
    config.assets.groundContact.key
  );
  const contactGlowSprite = scene.add.image(
    baseX,
    contactY,
    config.assets.groundContact.key
  );
  contactSprite.setOrigin(0.5, 1);
  contactGlowSprite.setOrigin(0.5, 1);
  const contactScale = fitContactScale(
    contactSprite,
    underground.contactMaxWidthTiles * tileSize,
    underground.contactMaxHeightTiles * tileSize
  );
  contactSprite
    .setDepth(underground.contactDepth)
    .setScale(contactScale)
    .setAlpha(underground.contactCoveredAlpha);
  contactGlowSprite
    .setDepth(underground.contactGlowDepth)
    .setScale(contactScale)
    .setTint(definition.glowTint)
    .setBlendMode("ADD")
    .setAlpha(underground.contactGlowAlpha);

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
    contactSprite,
    contactGlowSprite,
    renderAsset,
    baseX,
    baseY,
    chamberCenterY,
    groundY,
    settledX: baseX,
    baseScale,
    contactScale,
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
    environmentTint: 0xffffff,
    environmentLayers: [],
    chamberSprite: null,
    chamberGlowSprite: null,
  };
}

export function syncTitanDiscoveryEnvironment(
  view,
  lighting,
  config
) {
  const environmentTint = resolveWorldVisualDepthBackdropTint(
    view.zone.centerYTile,
    lighting,
    WORLD_VISUAL_DEPTH_BACKDROPS
  );
  if (environmentTint === view.environmentTint) return environmentTint;
  view.environmentTint = environmentTint;
  const titanTint = mixWorldVisualTint(
    0xffffff,
    environmentTint,
    config.underground.titanEnvironmentTintMix
  );
  const structureTint = mixWorldVisualTint(
    0xffffff,
    environmentTint,
    config.underground.structureEnvironmentTintMix
  );
  view.sprite.setTint?.(titanTint);
  view.daisSprite.setTint?.(structureTint);
  view.contactSprite.setTint?.(structureTint);
  return environmentTint;
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
    view.settledX = view.baseX;
    view.sprite
      .setPosition(view.baseX, view.baseY)
      .setScale(view.baseScale)
      .setAlpha(view.discovered
        ? config.underground.discoveredAlpha
        : config.underground.coveredAlpha
          + config.underground.coverageProgressAlpha * view.coverageProgress);
    view.glowSprite
      .setPosition(view.baseX, view.baseY)
      .setScale(view.baseScale)
      .setAlpha(0);
    view.chamberSprite
      ?.setPosition(view.baseX, view.chamberCenterY)
      .setAlpha(view.discovered
        ? config.chambers.discoveredCardAlpha
        : config.chambers.lockedCardAlpha
          + config.chambers.lockedCardProgressAlpha * view.coverageProgress);
    view.chamberGlowSprite
      ?.setPosition(view.baseX, view.chamberCenterY)
      .setAlpha(0);
    view.daisSprite.setAlpha(config.underground.daisAlpha);
    view.daisGlowSprite.setAlpha(config.underground.daisGlowAlpha);
    view.contactSprite.setAlpha(view.discovered
      ? config.underground.contactDiscoveredAlpha
      : config.underground.contactCoveredAlpha
        + config.underground.contactProgressAlpha * view.coverageProgress);
    view.contactGlowSprite.setAlpha(config.underground.contactGlowAlpha);
  }
}
