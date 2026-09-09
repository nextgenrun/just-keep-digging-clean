import { WURM_POLISH } from "../../values/graveborerWurmVariants.js";
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
  const path = {
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
  const count = pathConfig.arcSamples || WURM_POLISH.arcSamples;
  path.arc = [{ progress: 0, distance: 0 }];
  let previous = sampleRawGraveborerWurmPath(path, 0), length = 0;
  for (let index = 1; index <= count; index += 1) {
    const progress = index / count;
    const point = sampleRawGraveborerWurmPath(path, progress);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    path.arc.push({ progress, distance: length });
    previous = point;
  }
  path.length = length;
  return path;
}

export function sampleGraveborerWurmPath(path, progress) {
  if (!path?.arc) return sampleRawGraveborerWurmPath(path, progress);
  const distance = clamp(progress, 0, 1) * path.length;
  let low = 0, high = path.arc.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (path.arc[middle].distance < distance) low = middle;
    else high = middle;
  }
  const a = path.arc[low], b = path.arc[high];
  const ratio = (distance - a.distance) / Math.max(Number.EPSILON, b.distance - a.distance);
  return sampleRawGraveborerWurmPath(path, a.progress + (b.progress - a.progress) * ratio);
}

function sampleRawGraveborerWurmPath(path, progress) {
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
  const length = path?.length || 1;
  const lag = (config.path.segmentSpacingTiles || WURM_POLISH.segmentSpacingTiles) / length;
  const neck = (config.path.neckSpacingTiles || WURM_POLISH.neckSpacingTiles) / length;
  const bodies = Array.from(
    { length: config.path.segmentCount },
    (_, index) => makePart("body", progress - neck - index * lag, index),
  );
  const tailProgress = progress
    - neck - (config.path.segmentCount - 1) * lag
    - (config.path.tailSpacingTiles || WURM_POLISH.tailSpacingTiles) / length;
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
