export const WORLD_RENDER_PERFORMANCE = Object.freeze({
  streamWindow: Object.freeze({
    stagedEnabled: true,
    queryParam: "tileStreamStaging",
    queryEnableValues: Object.freeze(["1", "on", "true"]),
    queryDisableValues: Object.freeze(["0", "off", "false"]),
    heightTiles: 256,
    marginTiles: 48,
    stepTiles: 128,
    rowsPerFrame: 24,
    immediateShiftDistanceTiles: 256,
    excludedCollisionIndices: Object.freeze([-1, 0]),
    batchMetricName: "tile-stream-batch",
    shiftMetricName: "tile-stream-shift",
  }),
});

export function resolveTileStreamStagingEnabled(
  config = WORLD_RENDER_PERFORMANCE.streamWindow,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.stagedEnabled;
}
