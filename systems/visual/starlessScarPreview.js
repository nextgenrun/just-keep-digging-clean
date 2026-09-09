import {
  drawStarScarBoundaries,
  drawStarScarCellFill,
  starlessScarColor,
} from "./starlessScarPresentation.js";
import {
  filterStarlessScarCellsByRadius,
  resolveStarlessScarHoldRadius,
} from "./starlessScarSpread.js";

export function resolvePendingStarlessScarPreview({
  pending,
  bounds,
  territorySystem,
  config,
  collectCells,
}) {
  if (
    !["holding", "authorized"].includes(pending?.phase)
    || !pending.profile
  ) {
    return { pending: null, cells: [], radius: 0, allTerritories: false };
  }
  const state = territorySystem?.getStateSummary?.();
  const site = territorySystem?.getNearestSite?.(
    pending.profile.tx,
    pending.profile.ty,
  );
  const allTerritories = Boolean(
    config.scar.coversEntireTerritory
    && state?.intactCount === 1
    && site?.key === pending.profile.key,
  );
  const radius = resolveStarlessScarHoldRadius(
    pending.progress,
    config.scar.spread,
  );
  const cells = collectCells(bounds, {
    targetSiteKey: allTerritories ? "" : pending.profile.key,
    consumedOnly: false,
  });
  return {
    pending,
    allTerritories,
    radius,
    cells: filterStarlessScarCellsByRadius(
      cells,
      pending.profile,
      radius,
      config.scar.spread.cellPaddingTiles,
    ),
  };
}

export function drawPendingStarlessScarPreview({
  scene,
  worldModel,
  territorySystem,
  config,
  previewGraphics,
  maskGraphics,
  pending,
  cells,
  radius,
}) {
  if (!pending) return { visible: false, progress: 0, radius: 0 };
  const tileSize = Math.max(1, worldModel.tileSize || 1);
  const preview = config.consumption.preview;
  const cycle = (scene.time?.now || 0) / preview.pulsePeriodMs * Math.PI * 2;
  const pulse = preview.pulseMinimum
    + (preview.pulseMaximum - preview.pulseMinimum)
      * (Math.sin(cycle) * 0.5 + 0.5);
  const progress = Math.max(0, Math.min(1, pending.progress || 0));
  const warningColor = starlessScarColor(config.feedback.warningColor);
  if (cells.length) {
    drawStarScarCellFill(
      previewGraphics,
      cells,
      tileSize,
      config.scar.visual,
      config.scar.visual.baseColor,
      preview.fillAlpha * pulse * (0.55 + progress * 0.45),
    );
    drawStarScarBoundaries(
      previewGraphics,
      cells,
      tileSize,
      config.scar.visual,
      {
        color: warningColor,
        alpha: preview.boundaryAlpha * pulse,
        widthTiles: preview.ringWidthTiles,
      },
    );
    previewGraphics.lineStyle(
      Math.max(2, tileSize * preview.ringWidthTiles),
      warningColor,
      preview.ringAlpha * pulse,
    ).strokeCircle(
      (pending.profile.tx + 0.5) * tileSize,
      (pending.profile.ty + 0.5) * tileSize,
      radius * tileSize,
    );
    drawStarScarCellFill(
      maskGraphics,
      cells,
      tileSize,
      config.scar.visual,
      0xffffff,
      1,
    );
  } else if (!territorySystem) {
    const x = (pending.profile.tx + 0.5) * tileSize;
    const y = (pending.profile.ty + 0.5) * tileSize;
    previewGraphics.fillStyle(
      config.scar.visual.baseColor,
      preview.fillAlpha * pulse,
    ).fillCircle(x, y, radius * tileSize);
    previewGraphics.lineStyle(
      Math.max(2, tileSize * preview.ringWidthTiles),
      warningColor,
      preview.ringAlpha * pulse,
    ).strokeCircle(x, y, radius * tileSize);
    maskGraphics.fillStyle(0xffffff, 1).fillCircle(x, y, radius * tileSize);
  }
  return {
    visible: cells.length > 0 || !territorySystem,
    progress,
    radius,
  };
}
