const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function copyGraveborerTile(tile) {
  if (!Number.isInteger(tile?.tx) || !Number.isInteger(tile?.ty)) return null;
  return { tx: tile.tx, ty: tile.ty };
}

function quadraticPoint(start, control, end, t) {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * start.x
      + 2 * oneMinusT * t * control.x
      + t * t * end.x,
    y: oneMinusT * oneMinusT * start.y
      + 2 * oneMinusT * t * control.y
      + t * t * end.y,
  };
}

function quadraticTangent(start, control, end, t) {
  const x = 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x);
  const y = 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y);
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length, angle: Math.atan2(y, x) };
}

export function createGraveborerWurmPath(targetTile, direction, config) {
  if (!targetTile) return null;
  const pathConfig = config.path;
  const target = {
    x: targetTile.tx + direction * pathConfig.targetLeadTiles,
    y: targetTile.ty,
  };
  return {
    start: {
      x: target.x - direction * pathConfig.spawnDistanceTiles,
      y: target.y + pathConfig.verticalOffsetTiles,
    },
    controlIn: {
      x: target.x - direction * pathConfig.bendTiles,
      y: target.y - pathConfig.bendTiles,
    },
    target,
    controlOut: {
      x: target.x + direction * pathConfig.bendTiles,
      y: target.y + pathConfig.bendTiles,
    },
    end: {
      x: target.x + direction * pathConfig.exitDistanceTiles,
      y: target.y - pathConfig.verticalOffsetTiles,
    },
  };
}

export function sampleGraveborerWurmPath(path, progress) {
  if (!path) return null;
  const t = clamp(progress, 0, 1);
  const firstHalf = t <= 0.5;
  const localT = firstHalf ? t * 2 : (t - 0.5) * 2;
  const start = firstHalf ? path.start : path.target;
  const control = firstHalf ? path.controlIn : path.controlOut;
  const end = firstHalf ? path.target : path.end;
  const point = quadraticPoint(start, control, end, localT);
  const tangent = quadraticTangent(start, control, end, localT);
  return {
    ...point,
    tangentX: tangent.x,
    tangentY: tangent.y,
    angle: tangent.angle,
  };
}

export function createGraveborerWurmRenderState({
  active,
  phase,
  progress,
  path,
  config,
  timeMs = 0,
}) {
  const makePart = (kind, pathProgress, index = 0) => {
    if (pathProgress < 0 || pathProgress > 1 || !path) {
      return { kind, index, visible: false };
    }
    const sample = sampleGraveborerWurmPath(path, pathProgress);
    return {
      kind,
      index,
      visible: true,
      progress: pathProgress,
      x: sample.x,
      y: sample.y,
      angle: sample.angle,
      tangentX: sample.tangentX,
      tangentY: sample.tangentY,
      timeMs,
    };
  };
  const lag = config.path.segmentLagProgress;
  const bodies = Array.from(
    { length: config.path.segmentCount },
    (_, index) => makePart("body", progress - (index + 1) * lag, index),
  );
  const tailProgress = progress
    - (config.path.segmentCount + 1) * config.path.tailLagProgress;
  const warningPoints = path
    ? Array.from({ length: config.path.warningDecalCount }, (_, index) => {
        const span = config.path.warningEndProgress - config.path.warningStartProgress;
        const warningProgress = config.path.warningStartProgress
          + span * (index / Math.max(1, config.path.warningDecalCount - 1));
        return {
          ...sampleGraveborerWurmPath(path, warningProgress),
          progress: warningProgress,
          index,
        };
      })
    : [];
  return {
    active,
    phase,
    head: makePart("head", progress),
    bodies,
    tail: makePart("tail", tailProgress),
    warningPoints,
    timeMs,
  };
}
