import {
  WORLD_VISUAL_SKY_TRANSITION_ORDER,
  resolveWorldVisualSkyFeatureCells,
} from "./worldVisualSkyTransitionOrder.js";

const DISABLED_QUERY_VALUES = Object.freeze([
  "0", "false", "off", "disabled", "legacy",
]);
const ASSET_ROOT = (
  "sprites/backgrounds/world-visual-v2/far/sky-cohesion-v1"
);

const SKY_FILES = Object.freeze({
  sky01: "2026-07-28-sky-flight-corridor-far-plate-v1.webp",
  sky02: "2026-07-28-sky-02-western-lower-mist-valleys-v1.webp",
  sky03: "2026-07-28-sky-03-western-upper-aurora-shelf-v1.webp",
  sky04: "2026-07-28-sky-04-western-stormbreak-edge-v1.webp",
  sky05: "2026-07-28-sky-05-level1-lower-cyan-approach-v1.webp",
  sky06: "2026-07-28-sky-06-level1-mid-cloud-reef-v1.webp",
  sky07: "2026-07-28-sky-07-level1-upper-ruin-beacons-v1.webp",
  sky08: "2026-07-28-sky-08-level1-quiet-departure-v1.webp",
  sky09: "2026-07-28-sky-09-central-lower-horizon-saddle-v1.webp",
  sky10: "2026-07-28-sky-10-central-mid-open-aurora-v1.webp",
  sky11: "2026-07-28-sky-11-central-upper-star-river-v1.webp",
  sky12: "2026-07-28-sky-12-central-transition-cloud-veil-v1.webp",
  sky13: "2026-07-28-sky-13-level2-lower-iron-forge-haze-v1.webp",
  sky14: "2026-07-28-sky-14-level2-mid-ruin-belt-v1.webp",
  sky15: "2026-07-28-sky-15-level2-upper-chain-citadels-v1.webp",
  sky16: "2026-07-28-sky-16-level2-stormbreak-corridor-v1.webp",
  sky17: "2026-07-28-sky-17-eastern-lower-expedition-overlook-v1.webp",
  sky18: "2026-07-28-sky-18-eastern-mid-thunder-sea-v1.webp",
  sky19: "2026-07-28-sky-19-eastern-upper-heavenblock-ascent-v1.webp",
  sky20: "2026-07-28-sky-20-eastern-far-crimson-atmosphere-v1.webp",
});

// Multiplicative atmosphere grades measured from the approved safe frames.
// They only darken/temper outliers (notably the bright eastern daylight
// plates), allowing the weather tint and the neighboring plate to share one
// continuous sky palette without modifying the source assets.
const SKY_ATMOSPHERE_TINTS = Object.freeze({
  sky01: 0xffe6fb,
  sky02: 0xffffff,
  sky03: 0xfbecdb,
  sky04: 0xafc4da,
  sky05: 0xfcdde8,
  sky06: 0xd3b4c2,
  sky07: 0xfffbf1,
  sky08: 0xcdd2de,
  sky09: 0x80daef,
  sky10: 0xffffff,
  sky11: 0xffffff,
  sky12: 0xffffff,
  sky13: 0xffffff,
  sky14: 0xe9fffa,
  sky15: 0xa8ffff,
  sky16: 0xffffff,
  sky17: 0x406c9f,
  sky18: 0xf7e9ff,
  sky19: 0x404f84,
  sky20: 0xafe3eb,
});

const SKY_ASSETS = Object.freeze(Object.fromEntries(
  Object.entries(SKY_FILES).map(([id, file]) => [
    id,
    Object.freeze({
      id,
      key: `world-visual-sky-cohesion-v1-${id}`,
      path: `${ASSET_ROOT}/${file}`,
      type: "image",
      atmosphereTint: SKY_ATMOSPHERE_TINTS[id] || 0xffffff,
    }),
  ])
));

export const WORLD_VISUAL_SKY_COHESION = Object.freeze({
  enabledByDefault: true,
  runtimeMode: "ordered-features",
  queryParam: "skyCohesion",
  disabledValues: DISABLED_QUERY_VALUES,
  compositionQueryParam: "skyComposition",
  orderedValues: Object.freeze(["ordered", "features", "ordered-features", "v2"]),
  gridValues: Object.freeze(["grid", "world-grid", "legacy", "v1"]),
  assets: SKY_ASSETS,
  foundation: Object.freeze({
    asset: Object.freeze({
      id: "sky-atmosphere-foundation-v2",
      key: "world-visual-sky-atmosphere-foundation-v2",
      path: (
        "sprites/backgrounds/world-visual-v2/far/sky-foundation-v2/"
        + "sky-atmosphere-foundation-v2.webp"
      ),
      type: "image",
    }),
    expectedSource: Object.freeze({
      widthPx: 1024,
      heightPx: 2048,
    }),
    // Stay beneath the restored moonlit forest plate at -10. Surface trees
    // remain the ground-level owner while the atmosphere fills all empty sky.
    depth: -10.2,
    alpha: 1,
    fallbackColor: 0x071a33,
    fallbackDepth: -10.21,
  }),
  source: Object.freeze({
    widthPx: 1672,
    heightPx: 941,
    // Keep the authored pixels at 1:1 while excluding the dark generation
    // falloff baked into the outer 12.5% of every plate.
    safeFrame: Object.freeze({
      xPx: 209,
      yPx: 118,
      widthPx: 1254,
      heightPx: 705,
    }),
  }),
  bands: Object.freeze([
    Object.freeze({ id: "far", centerTile: 14 }),
    Object.freeze({ id: "upper", centerTile: 30 }),
    Object.freeze({ id: "middle", centerTile: 46 }),
    Object.freeze({ id: "lower", centerTile: 61 }),
  ]),
  columns: Object.freeze([
    Object.freeze({
      id: "western",
      centerTile: 28,
      assetIds: Object.freeze(["sky04", "sky03", "sky01", "sky02"]),
    }),
    Object.freeze({
      id: "level1",
      centerTile: 84,
      assetIds: Object.freeze(["sky08", "sky07", "sky06", "sky05"]),
    }),
    Object.freeze({
      id: "central",
      centerTile: 126,
      assetIds: Object.freeze(["sky12", "sky11", "sky10", "sky09"]),
    }),
    Object.freeze({
      id: "level2",
      centerTile: 178,
      assetIds: Object.freeze(["sky16", "sky15", "sky14", "sky13"]),
    }),
    Object.freeze({
      id: "eastern",
      centerTile: 246,
      assetIds: Object.freeze(["sky20", "sky19", "sky18", "sky17"]),
    }),
  ]),
  worldGrid: Object.freeze({
    sourceDensityScale: 1,
    // A quarter-frame handoff gives palette and cloud silhouettes enough room
    // to become one field while every source pixel remains at native density.
    // Adjacent normalized weights are exact complements, including at corners.
    overlapXPx: 314,
    overlapYPx: 176,
    loadMarginTiles: 5,
  }),
  composition: Object.freeze({
    order: WORLD_VISUAL_SKY_TRANSITION_ORDER,
    featureFeatherXPx: 314,
    featureFeatherYPx: 176,
    // Lower cards are restrained so the older tree-bearing surface plate
    // remains legible behind the atmosphere near the ground line.
    bandAlpha: Object.freeze({
      far: 0.82,
      upper: 0.82,
      middle: 0.76,
      lower: 0.42,
    }),
    // Measured incompatible handoffs recede into the common atmosphere;
    // compatible direct pairs remain the strongest authored features.
    transitionAlphaScale: Object.freeze({
      repeat: 0.96,
      direct: 1,
      haze: 0.92,
      foundation: 0.84,
    }),
  }),
  blend: Object.freeze({
    mode: "normalized-additive",
    blendMode: "ADD",
    matteColor: 0x000000,
    maskResolutionScale: 0.32,
    featherXPx: 314,
    featherYPx: 176,
    textureKeyPrefix: "world-visual-sky-normalized-mask",
    edgeBits: Object.freeze({
      left: 1,
      right: 2,
      top: 4,
      bottom: 8,
    }),
  }),
  render: Object.freeze({
    depth: -9.6,
    matteDepth: -9.61,
    depthStep: 0.001,
    alpha: 1,
    featureBlendMode: "NORMAL",
  }),
});

function isDisabled(config, search) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  return Boolean(value && config.disabledValues.includes(value));
}

export function resolveWorldVisualSkyCohesionEnabled(
  config = WORLD_VISUAL_SKY_COHESION,
  search = globalThis.location?.search || ""
) {
  return config.enabledByDefault && !isDisabled(config, search);
}

export function resolveWorldVisualSkyRuntimeMode(
  config = WORLD_VISUAL_SKY_COHESION,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search)
    .get(config.compositionQueryParam)
    ?.trim()
    .toLowerCase();
  if (value && config.gridValues.includes(value)) return "world-grid";
  if (value && config.orderedValues.includes(value)) return "ordered-features";
  return config.runtimeMode;
}

function segmentCount(spanPx, cardSizePx, stridePx) {
  if (spanPx <= cardSizePx) return 1;
  return Math.ceil((spanPx - cardSizePx) / stridePx) + 1;
}

function resolveBandIndex(centerTile, bands) {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  bands.forEach((band, index) => {
    const distance = Math.abs(centerTile - band.centerTile);
    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  });
  return closestIndex;
}

function resolveChapterIndex(centerTile, columns) {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  columns.forEach((column, index) => {
    const distance = Math.abs(centerTile - column.centerTile);
    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  });
  return closestIndex;
}

export function multiplyWorldVisualSkyTints(leftTint, rightTint) {
  const left = Number.isFinite(leftTint) ? leftTint : 0xffffff;
  const right = Number.isFinite(rightTint) ? rightTint : 0xffffff;
  const channel = shift => Math.round(
    (((left >> shift) & 255) * ((right >> shift) & 255)) / 255
  );
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export function resolveWorldVisualSkyCohesionCells(
  worldWidthTiles,
  topAirRows,
  tileSize,
  config = WORLD_VISUAL_SKY_COHESION
) {
  const width = Math.max(1, Number(worldWidthTiles) || 1);
  const height = Math.max(1, Number(topAirRows) || 1);
  const tilePixels = Math.max(1, Number(tileSize) || 1);
  const displayScale = Math.min(
    1,
    Math.max(0, Number(config.worldGrid.sourceDensityScale) || 1)
  );
  const safeFrame = config.source.safeFrame || Object.freeze({
    xPx: 0,
    yPx: 0,
    widthPx: config.source.widthPx,
    heightPx: config.source.heightPx,
  });
  const displayWidthPx = safeFrame.widthPx * displayScale;
  const displayHeightPx = safeFrame.heightPx * displayScale;
  const overlapXPx = Math.min(
    displayWidthPx - 1,
    Math.max(0, Number(config.worldGrid.overlapXPx) || 0) * displayScale
  );
  const overlapYPx = Math.min(
    displayHeightPx - 1,
    Math.max(0, Number(config.worldGrid.overlapYPx) || 0) * displayScale
  );
  const requestedStrideXPx = Math.max(1, displayWidthPx - overlapXPx);
  const requestedStrideYPx = Math.max(1, displayHeightPx - overlapYPx);
  const columnCount = segmentCount(
    width * tilePixels,
    displayWidthPx,
    requestedStrideXPx
  );
  const rowCount = segmentCount(
    height * tilePixels,
    displayHeightPx,
    requestedStrideYPx
  );
  // Distribute the small tail remainder through the grid instead of letting
  // its final card overshoot the authored world. At the surface this anchors
  // the lower plate's horizon to the ground line rather than burying it below
  // terrain. The effective overlaps are passed to the normalized masks.
  const strideXPx = columnCount > 1
    ? (width * tilePixels - displayWidthPx) / (columnCount - 1)
    : 0;
  const strideYPx = rowCount > 1
    ? (height * tilePixels - displayHeightPx) / (rowCount - 1)
    : 0;
  const fittedOverlapXPx = displayWidthPx - strideXPx;
  const fittedOverlapYPx = displayHeightPx - strideYPx;
  const cells = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const altitudeCenterTile = (
        row * strideYPx + displayHeightPx / 2
      ) / tilePixels;
      // Asset families remain locked to their authored altitude. Normalized
      // vertical weights now remove the old fold without mixing a ground-level
      // horizon into a high-sky row.
      const bandIndex = resolveBandIndex(
        altitudeCenterTile,
        config.bands
      );
      const band = config.bands[bandIndex];
      const horizontalCenterTile = (
        column * strideXPx + displayWidthPx / 2
      ) / tilePixels;
      // Keep authored western, island, central, and eastern chapters near
      // their real world anchors. The previous row-shifted modulo selection
      // placed distant mountains and daylight palettes beside unrelated cards.
      const chapterIndex = resolveChapterIndex(
        horizontalCenterTile,
        config.columns
      );
      const chapter = config.columns[chapterIndex];
      const leftTile = column * strideXPx / tilePixels;
      const topTile = row * strideYPx / tilePixels;
      cells.push(Object.freeze({
        id: `${column}:${row}`,
        columnIndex: column,
        rowIndex: row,
        columnCount,
        rowCount,
        columnId: chapter.id,
        bandId: band.id,
        horizontalCenterTile,
        altitudeCenterTile,
        asset: config.assets[chapter.assetIds[bandIndex]],
        sourceCrop: Object.freeze({
          xPx: safeFrame.xPx,
          yPx: safeFrame.yPx,
          widthPx: safeFrame.widthPx,
          heightPx: safeFrame.heightPx,
        }),
        displayScale,
        displayWidthPx,
        displayHeightPx,
        overlapXPx: fittedOverlapXPx,
        overlapYPx: fittedOverlapYPx,
        leftTile,
        rightTileExclusive: leftTile + displayWidthPx / tilePixels,
        topTile,
        bottomTileExclusive: topTile + displayHeightPx / tilePixels,
        renderOrder: row * columnCount + column,
        blendEdges: Object.freeze({
          left: column > 0,
          right: column < columnCount - 1,
          top: row > 0,
          bottom: row < rowCount - 1,
        }),
      }));
    }
  }
  return cells;
}

export function resolveWorldVisualSkyCells(
  worldWidthTiles,
  topAirRows,
  tileSize,
  config = WORLD_VISUAL_SKY_COHESION,
  search = globalThis.location?.search || ""
) {
  return resolveWorldVisualSkyRuntimeMode(config, search) === "world-grid"
    ? resolveWorldVisualSkyCohesionCells(
      worldWidthTiles,
      topAirRows,
      tileSize,
      config
    )
    : resolveWorldVisualSkyFeatureCells(
      worldWidthTiles,
      topAirRows,
      tileSize,
      config,
      config.composition.order
    );
}

export function getWorldVisualSkyCohesionAssets(
  config = WORLD_VISUAL_SKY_COHESION
) {
  return [config.foundation.asset, ...Object.values(config.assets)];
}
