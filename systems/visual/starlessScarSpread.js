const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

function easedProgress(progress, exponent) {
  const ratio = clamp01(progress);
  return 1 - (1 - ratio) ** Math.max(1, Number(exponent) || 1);
}

function interpolateRadius(start, end, progress, exponent) {
  const minimum = Math.max(0, Number(start) || 0);
  const maximum = Math.max(minimum, Number(end) || minimum);
  return minimum + (maximum - minimum) * easedProgress(progress, exponent);
}

export function resolveStarlessScarHoldRadius(progress, config) {
  return interpolateRadius(
    config.holdStartRadiusTiles,
    config.holdEndRadiusTiles,
    progress,
    config.easingExponent,
  );
}

export function createStarlessScarSpread(profile, startedAtMs) {
  if (!profile?.key) return null;
  return {
    siteKey: profile.key,
    tx: Number(profile.tx) || 0,
    ty: Number(profile.ty) || 0,
    startedAtMs: Math.max(0, Number(startedAtMs) || 0),
  };
}

export function resolveStarlessScarPostBreakSpread(state, nowMs, config) {
  if (!state) return null;
  const durationMs = Math.max(1, Number(config.postBreakDurationMs) || 1);
  const progress = clamp01(
    (Math.max(0, Number(nowMs) || 0) - state.startedAtMs) / durationMs,
  );
  return {
    ...state,
    progress,
    complete: progress >= 1,
    radiusTiles: interpolateRadius(
      config.postBreakStartRadiusTiles,
      config.postBreakEndRadiusTiles,
      progress,
      config.easingExponent,
    ),
  };
}

export function filterStarlessScarCellsByRadius(
  cells,
  center,
  radiusTiles,
  paddingTiles = 0,
) {
  if (!center) return [];
  const radius = Math.max(0, Number(radiusTiles) || 0)
    + Math.max(0, Number(paddingTiles) || 0);
  const radiusSquared = radius ** 2;
  return cells.filter(cell => (
    (cell.tx + 0.5 - (center.tx + 0.5)) ** 2
      + (cell.ty + 0.5 - (center.ty + 0.5)) ** 2
      <= radiusSquared
  ));
}

export function revealStarlessScarSpreadCells(cells, spread, paddingTiles = 0) {
  if (!spread || spread.complete) return cells;
  const revealed = filterStarlessScarCellsByRadius(
    cells.filter(cell => cell.siteKey === spread.siteKey),
    spread,
    spread.radiusTiles,
    paddingTiles,
  );
  return [
    ...cells.filter(cell => cell.siteKey !== spread.siteKey),
    ...revealed,
  ];
}
