export const HARDCORE_PANIC_BOUNDARY = Object.freeze({
  referenceViewport: Object.freeze({ width: 1280, height: 720 }),
  renderDepth: 996.5,
  line: Object.freeze({
    sourceWidthPx: 1672,
    sourceCropHeightPx: 112,
    heightPx: 86,
    alphaMinimum: 0.9,
    alphaMaximum: 1,
    pulseHz: 0.62,
  }),
  marker: Object.freeze({
    marginXPx: 18,
    centerYPx: 62,
    widthPx: 448,
    heightPx: 58,
    iconX: -192,
    iconSizePx: 44,
    textX: -158,
    titleY: -10,
    detailY: 10,
    titleFontPx: 14,
    detailFontPx: 11,
  }),
  copy: Object.freeze({
    title: "PANIC STARTS HERE",
    detail: "DARKNESS BUILDS PANIC BELOW  •  TORCHLIGHT HOLDS IT BACK",
    depthUnit: "M",
  }),
});

const finite = (value, fallback = 0) => (
  Number.isFinite(value) ? value : fallback
);

export function resolveHardcorePanicBoundary(
  snapshot,
  worldConfig = {},
  options = {},
) {
  const basePanicStartDepth = Math.max(
    0,
    finite(options.basePanicStartDepth),
  );
  const panicResistanceMeters = Math.max(
    0,
    finite(snapshot?.panicResistanceMeters),
  );
  const panicStartDepth = Math.max(
    0,
    finite(
      snapshot?.panicStartDepth,
      basePanicStartDepth + panicResistanceMeters,
    ),
  );
  const topAirRows = Math.max(0, finite(worldConfig?.topAirRows));
  const tileSize = Math.max(0, finite(worldConfig?.tileSize));
  const firstPanicTileY = topAirRows + panicStartDepth - 1;
  const worldY = Math.max(0, firstPanicTileY * tileSize);
  const copy = HARDCORE_PANIC_BOUNDARY.copy;
  const visible = options.gameplayActive === true
    && snapshot?.isHardcore === true
    && snapshot?.armed === true
    && snapshot?.exhausted !== true
    && panicStartDepth > 0
    && tileSize > 0;
  return {
    visible,
    panicStartDepth,
    panicResistanceMeters,
    firstPanicTileY,
    worldY,
    title: `${copy.title}  •  ${Math.round(panicStartDepth)}${copy.depthUnit}`,
    detail: copy.detail,
  };
}
