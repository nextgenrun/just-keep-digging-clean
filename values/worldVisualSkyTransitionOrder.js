// Defines the explicit world order and measured compatibility of sky features.

const freezeTransition = (
  fromAssetId,
  toAssetId,
  rgbDifference,
  lumaDifference,
  profile,
) => Object.freeze({
  fromAssetId,
  toAssetId,
  rgbDifference,
  lumaDifference,
  profile,
});

const HORIZONTAL_TRANSITIONS = Object.freeze([
  freezeTransition("sky04", "sky08", 32.3, 8.2, "foundation"),
  freezeTransition("sky03", "sky07", 24.8, 5.4, "haze"),
  freezeTransition("sky01", "sky06", 18.9, 4.4, "haze"),
  freezeTransition("sky02", "sky05", 17.8, 11.6, "direct"),
  freezeTransition("sky08", "sky12", 19.3, 9.0, "haze"),
  freezeTransition("sky07", "sky11", 13.4, 3.2, "direct"),
  freezeTransition("sky06", "sky10", 22.5, 12.4, "haze"),
  freezeTransition("sky05", "sky09", 17.3, 2.0, "direct"),
  freezeTransition("sky12", "sky16", 28.8, 4.1, "haze"),
  freezeTransition("sky11", "sky15", 20.2, 3.8, "haze"),
  freezeTransition("sky10", "sky14", 25.3, 7.2, "haze"),
  freezeTransition("sky09", "sky13", 28.3, 17.4, "haze"),
  freezeTransition("sky16", "sky20", 27.8, 17.4, "haze"),
  freezeTransition("sky15", "sky19", 14.1, 6.8, "direct"),
  freezeTransition("sky14", "sky18", 16.4, 2.9, "direct"),
  freezeTransition("sky13", "sky17", 27.2, 20.5, "haze"),
]);

const VERTICAL_TRANSITIONS = Object.freeze([
  freezeTransition("sky04", "sky03", 43.2, 36.6, "foundation"),
  freezeTransition("sky03", "sky01", 72.8, 71.4, "foundation"),
  freezeTransition("sky01", "sky02", 56.3, 50.8, "foundation"),
  freezeTransition("sky08", "sky07", 71.4, 63.9, "foundation"),
  freezeTransition("sky07", "sky06", 46.6, 46.3, "foundation"),
  freezeTransition("sky06", "sky05", 59.4, 53.6, "foundation"),
  freezeTransition("sky12", "sky11", 60.0, 51.7, "foundation"),
  freezeTransition("sky11", "sky10", 61.8, 56.8, "foundation"),
  freezeTransition("sky10", "sky09", 65.4, 58.9, "foundation"),
  freezeTransition("sky16", "sky15", 24.8, 16.3, "haze"),
  freezeTransition("sky15", "sky14", 35.2, 27.1, "foundation"),
  freezeTransition("sky14", "sky13", 46.5, 35.2, "foundation"),
  freezeTransition("sky20", "sky19", 19.6, 12.4, "haze"),
  freezeTransition("sky19", "sky18", 21.9, 17.2, "haze"),
  freezeTransition("sky18", "sky17", 24.3, 16.8, "haze"),
]);

const FEATURE_SLOTS = Object.freeze([
  Object.freeze({ id: "west-town", centerTile: 10, chapterId: "western" }),
  Object.freeze({ id: "west-titan", centerTile: 30, chapterId: "western" }),
  Object.freeze({ id: "east-titan", centerTile: 50, chapterId: "western" }),
  Object.freeze({ id: "level1-west", centerTile: 70, chapterId: "level1" }),
  Object.freeze({ id: "level1-east", centerTile: 90, chapterId: "level1" }),
  Object.freeze({ id: "central-gates", centerTile: 110, chapterId: "central" }),
  Object.freeze({ id: "central-handoff", centerTile: 130, chapterId: "central" }),
  Object.freeze({ id: "level2-arrival", centerTile: 150, chapterId: "level2" }),
  Object.freeze({ id: "level2-caravan", centerTile: 170, chapterId: "level2" }),
  Object.freeze({ id: "level2-starwell", centerTile: 190, chapterId: "level2" }),
  Object.freeze({ id: "level2-observatory", centerTile: 210, chapterId: "level2" }),
  Object.freeze({ id: "eastern-frontier", centerTile: 230, chapterId: "eastern" }),
  Object.freeze({ id: "eastern-ascent", centerTile: 250, chapterId: "eastern" }),
  Object.freeze({ id: "eastern-overlook", centerTile: 270, chapterId: "eastern" }),
]);

export const WORLD_VISUAL_SKY_TRANSITION_ORDER = Object.freeze({
  version: "sky-transition-order-v2-measured-2026-07-30",
  chapterOrder: Object.freeze([
    "western",
    "level1",
    "central",
    "level2",
    "eastern",
  ]),
  bandOrder: Object.freeze(["far", "upper", "middle", "lower"]),
  featureSlots: FEATURE_SLOTS,
  horizontalTransitions: HORIZONTAL_TRANSITIONS,
  verticalTransitions: VERTICAL_TRANSITIONS,
  profiles: Object.freeze({
    repeat: Object.freeze({
      id: "repeat",
      directBlend: false,
      foundationRequired: true,
    }),
    direct: Object.freeze({
      id: "direct",
      directBlend: true,
      foundationRequired: false,
    }),
    haze: Object.freeze({
      id: "haze",
      directBlend: false,
      foundationRequired: true,
    }),
    foundation: Object.freeze({
      id: "foundation",
      directBlend: false,
      foundationRequired: true,
    }),
  }),
});

export function resolveWorldVisualSkyTransition(
  fromAssetId,
  toAssetId,
  axis,
  order = WORLD_VISUAL_SKY_TRANSITION_ORDER,
) {
  if (!fromAssetId || !toAssetId) return null;
  if (fromAssetId === toAssetId) {
    return Object.freeze({
      fromAssetId,
      toAssetId,
      rgbDifference: null,
      lumaDifference: null,
      profile: "repeat",
    });
  }
  const transitions = axis === "vertical"
    ? order.verticalTransitions
    : order.horizontalTransitions;
  return transitions.find(item => (
    item.fromAssetId === fromAssetId && item.toAssetId === toAssetId
  )) || Object.freeze({
    fromAssetId,
    toAssetId,
    rgbDifference: null,
    lumaDifference: null,
    profile: "foundation",
  });
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function resolveWorldVisualSkyFeatureCells(
  worldWidthTiles,
  topAirRows,
  tileSize,
  config,
  order = WORLD_VISUAL_SKY_TRANSITION_ORDER,
) {
  const width = Math.max(1, Number(worldWidthTiles) || 1);
  const height = Math.max(1, Number(topAirRows) || 1);
  const tilePixels = Math.max(1, Number(tileSize) || 1);
  const safeFrame = config.source.safeFrame;
  const displayScale = config.worldGrid.sourceDensityScale;
  const displayWidthPx = safeFrame.widthPx * displayScale;
  const displayHeightPx = safeFrame.heightPx * displayScale;
  const widthTiles = displayWidthPx / tilePixels;
  const heightTiles = displayHeightPx / tilePixels;
  const slots = order.featureSlots.filter(slot => slot.centerTile < width);
  const chapters = new Map(config.columns.map(item => [item.id, item]));
  const cells = [];

  config.bands.forEach((band, rowIndex) => {
    slots.forEach((slot, columnIndex) => {
      const chapter = chapters.get(slot.chapterId);
      if (!chapter) {
        throw new Error(`[worldVisualSkyTransitionOrder] Unknown ${slot.chapterId}`);
      }
      const assetId = chapter.assetIds[rowIndex];
      const previousSlot = slots[columnIndex - 1];
      const previousChapter = previousSlot
        ? chapters.get(previousSlot.chapterId)
        : null;
      const previousHorizontalAssetId = previousChapter
        ? previousChapter.assetIds[rowIndex]
        : null;
      const previousVerticalAssetId = rowIndex > 0
        ? chapter.assetIds[rowIndex - 1]
        : null;
      const leftTile = clamp(
        slot.centerTile - widthTiles / 2,
        0,
        Math.max(0, width - widthTiles),
      );
      const topTile = clamp(
        band.centerTile - heightTiles / 2,
        0,
        Math.max(0, height - heightTiles),
      );
      cells.push(Object.freeze({
        id: `feature:${slot.id}:${band.id}`,
        slotId: slot.id,
        columnIndex,
        rowIndex,
        columnCount: slots.length,
        rowCount: config.bands.length,
        columnId: chapter.id,
        bandId: band.id,
        horizontalCenterTile: slot.centerTile,
        altitudeCenterTile: band.centerTile,
        asset: config.assets[assetId],
        sourceCrop: Object.freeze({ ...safeFrame }),
        displayScale,
        displayWidthPx,
        displayHeightPx,
        overlapXPx: config.composition.featureFeatherXPx,
        overlapYPx: config.composition.featureFeatherYPx,
        leftTile,
        rightTileExclusive: leftTile + widthTiles,
        topTile,
        bottomTileExclusive: topTile + heightTiles,
        renderOrder: rowIndex * slots.length + columnIndex,
        blendEdges: Object.freeze({
          left: true,
          right: true,
          top: true,
          bottom: true,
        }),
        incomingHorizontalTransition: resolveWorldVisualSkyTransition(
          previousHorizontalAssetId,
          assetId,
          "horizontal",
          order,
        ),
        incomingVerticalTransition: resolveWorldVisualSkyTransition(
          previousVerticalAssetId,
          assetId,
          "vertical",
          order,
        ),
      }));
    });
  });
  return cells;
}
