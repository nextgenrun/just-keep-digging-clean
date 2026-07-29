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

const SKY_ASSETS = Object.freeze(Object.fromEntries(
  Object.entries(SKY_FILES).map(([id, file]) => [
    id,
    Object.freeze({
      id,
      key: `world-visual-sky-cohesion-v1-${id}`,
      path: `${ASSET_ROOT}/${file}`,
      type: "image",
    }),
  ])
));

export const WORLD_VISUAL_SKY_COHESION = Object.freeze({
  enabledByDefault: true,
  runtimeMode: "world-grid",
  queryParam: "skyCohesion",
  disabledValues: DISABLED_QUERY_VALUES,
  assets: SKY_ASSETS,
  source: Object.freeze({
    widthPx: 1672,
    heightPx: 941,
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
    overlapRatioX: 0.125,
    overlapRatioY: 0.125,
    chapterShiftPerRow: 2,
    loadMarginTiles: 5,
  }),
  render: Object.freeze({
    depth: -9.6,
    depthStep: 0.000001,
    alpha: 1,
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

function segmentCount(spanPx, cardSizePx, stridePx) {
  if (spanPx <= cardSizePx) return 1;
  return Math.ceil((spanPx - cardSizePx) / stridePx) + 1;
}

function clampOverlapRatio(value) {
  return Math.max(0, Math.min(0.49, Number(value) || 0));
}

function resolveBandIndex(row, rowCount, bandCount) {
  return Math.min(
    bandCount - 1,
    Math.floor(row * bandCount / rowCount)
  );
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
  const displayWidthPx = config.source.widthPx * displayScale;
  const displayHeightPx = config.source.heightPx * displayScale;
  const overlapXPx = displayWidthPx
    * clampOverlapRatio(config.worldGrid.overlapRatioX);
  const overlapYPx = displayHeightPx
    * clampOverlapRatio(config.worldGrid.overlapRatioY);
  const strideXPx = Math.max(1, displayWidthPx - overlapXPx);
  const strideYPx = Math.max(1, displayHeightPx - overlapYPx);
  const columnCount = segmentCount(
    width * tilePixels,
    displayWidthPx,
    strideXPx
  );
  const rowCount = segmentCount(
    height * tilePixels,
    displayHeightPx,
    strideYPx
  );
  const chapterShift = Number(config.worldGrid.chapterShiftPerRow) || 0;
  const cells = [];
  for (let row = 0; row < rowCount; row += 1) {
    const bandIndex = resolveBandIndex(
      row,
      rowCount,
      config.bands.length
    );
    const band = config.bands[bandIndex];
    for (let column = 0; column < columnCount; column += 1) {
      const chapterIndex = (
        column + row * chapterShift
      ) % config.columns.length;
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
        asset: config.assets[chapter.assetIds[bandIndex]],
        displayScale,
        displayWidthPx,
        displayHeightPx,
        overlapXPx,
        overlapYPx,
        leftTile,
        rightTileExclusive: leftTile + displayWidthPx / tilePixels,
        topTile,
        bottomTileExclusive: topTile + displayHeightPx / tilePixels,
        renderOrder: row * columnCount + column,
        blendEdges: Object.freeze({
          left: column > 0,
          right: false,
          top: row > 0,
          bottom: false,
        }),
      }));
    }
  }
  return cells;
}

export function getWorldVisualSkyCohesionAssets(
  config = WORLD_VISUAL_SKY_COHESION
) {
  return Object.values(config.assets);
}
