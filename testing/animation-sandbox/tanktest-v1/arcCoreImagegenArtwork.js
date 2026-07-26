import {
  ARC_CORE_ANIMATION_REVIEW,
  getArcCoreAnimationReviewMode,
} from "../../../values/arcCoreAnimationReview.js";

const ROOT_PREFIX = "../../../";
const TAU = Math.PI * 2;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smooth(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function directionAngle(direction) {
  return Math.atan2(direction.y, direction.x);
}

function perpendicular(direction) {
  return { x: -direction.y, y: direction.x };
}

function tileFace(target, direction, tileSize) {
  if (direction.x > 0) {
    return { x: target.tx * tileSize, y: (target.ty + 0.5) * tileSize };
  }
  if (direction.x < 0) {
    return { x: (target.tx + 1) * tileSize, y: (target.ty + 0.5) * tileSize };
  }
  return {
    x: (target.tx + 0.5) * tileSize,
    y: direction.y > 0 ? target.ty * tileSize : (target.ty + 1) * tileSize,
  };
}

function modeConfigs() {
  return [ARC_CORE_ANIMATION_REVIEW.small, ARC_CORE_ANIMATION_REVIEW.omega];
}

export function preloadArcCoreImagegenArtwork(scene) {
  for (const mode of modeConfigs()) {
    const artwork = mode.artwork;
    scene.load.spritesheet(
      artwork.assetKey,
      `${ROOT_PREFIX}${artwork.sheetPath}`,
      {
        frameWidth: artwork.frameWidth,
        frameHeight: artwork.frameHeight,
        endFrame: artwork.idleFrames.length + artwork.digFrames.length - 1,
      },
    );
  }
}

export function createArcCoreImagegenArtwork(scene) {
  const initial = ARC_CORE_ANIMATION_REVIEW.small.artwork;
  const primary = scene.add.sprite(0, 0, initial.assetKey, 0);
  const blend = scene.add.sprite(0, 0, initial.assetKey, 1);
  primary.setDepth(10.12).setVisible(false);
  blend.setDepth(10.13).setVisible(false);
  return {
    primary,
    blend,
    lastFrame: 0,
    nextFrame: 1,
    blendAmount: 0,
  };
}

export function hideArcCoreImagegenArtwork(state) {
  state?.primary?.setVisible(false);
  state?.blend?.setVisible(false);
}

function resolveFrameState(config, timeMs, active, progress) {
  const artwork = config.artwork;
  const frames = active ? artwork.digFrames : artwork.idleFrames;
  const phase = active
    ? clamp(progress) * (frames.length - 1)
    : (timeMs / artwork.idleFrameMs) % frames.length;
  const index = Math.floor(phase);
  const nextIndex = active
    ? Math.min(frames.length - 1, index + 1)
    : (index + 1) % frames.length;
  return {
    frame: frames[index],
    nextFrame: frames[nextIndex],
    blend: smooth(phase - index),
  };
}

function applySprite(sprite, texture, frame, transform, alpha) {
  sprite
    .setTexture(texture, frame)
    .setOrigin(transform.originX, transform.originY)
    .setPosition(transform.x, transform.y)
    .setDisplaySize(transform.width, transform.height)
    .setAngle(transform.angleDeg)
    .setAlpha(alpha)
    .setVisible(alpha > 0.002);
}

function drawAura(g, config, options, transform) {
  const { active, progress, timeMs, alpha } = options;
  const omega = config.id === ARC_CORE_ANIMATION_REVIEW.omega.id;
  const pulse = 0.5 + Math.sin(timeMs * (omega ? 0.0018 : 0.0085)) * 0.5;
  const charge = active ? smooth((progress - 0.04) / (omega ? 0.36 : 0.22)) : 0;
  const radius = config.artwork.displaySizePx * (omega ? 0.39 : 0.34);

  g.fillStyle(config.energyColor, alpha * (0.025 + charge * 0.055));
  g.fillCircle(transform.x, transform.y, radius + pulse * (omega ? 22 : 8));
  for (let index = 0; index < (omega ? 4 : 3); index += 1) {
    const start = timeMs * (omega ? 0.00022 : 0.0018)
      + index * TAU / (omega ? 4 : 3);
    g.lineStyle(omega ? 4 : 2, index % 2 ? config.accentColor : config.energyColor, alpha * 0.46);
    g.beginPath();
    g.arc(
      transform.x,
      transform.y,
      radius + index * (omega ? 10 : 5),
      start,
      start + (omega ? 0.58 : 1.1),
      false,
    );
    g.strokePath();
  }
}

function drawEnergyLanes(g, config, options, transform) {
  const { active, progress, direction, targets, tileSize, alpha } = options;
  if (!active || progress < 0.14 || progress > 0.92) return;
  const front = targets
    .filter(target => target.depthIndex === 0)
    .sort((a, b) => a.widthIndex - b.widthIndex);
  if (!front.length) return;

  const omega = config.id === ARC_CORE_ANIMATION_REVIEW.omega.id;
  const perp = perpendicular(direction);
  const energy = smooth((progress - 0.14) / (omega ? 0.34 : 0.2));
  const startDistance = config.artwork.displaySizePx * (omega ? 0.27 : 0.25);
  const spread = omega ? 31 : 15;

  for (const target of front) {
    const face = tileFace(target, direction, tileSize);
    const laneOffset = (target.widthIndex - (front.length - 1) * 0.5) * spread;
    const sx = transform.x + direction.x * startDistance + perp.x * laneOffset;
    const sy = transform.y + direction.y * startDistance + perp.y * laneOffset;
    const laneDelay = omega ? target.widthIndex * 0.018 : 0;
    const laneEnergy = smooth((progress - 0.18 - laneDelay) / (omega ? 0.28 : 0.17));
    const laneColor = target.widthIndex % 2 ? config.coreColor : config.energyColor;

    g.lineStyle(omega ? 16 : 11, config.energyColor, alpha * energy * 0.12);
    g.lineBetween(sx, sy, face.x, face.y);
    g.lineStyle((omega ? 3 : 2) + laneEnergy * 4, laneColor, alpha * (0.38 + laneEnergy * 0.52));
    g.lineBetween(sx, sy, face.x, face.y);
    g.lineStyle(1, 0xffffff, alpha * laneEnergy * 0.72);
    g.lineBetween(sx, sy, face.x, face.y);
  }
}

export function drawArcCoreImagegenArtwork(state, g, options) {
  const config = getArcCoreAnimationReviewMode(options.mode);
  if (!config?.artwork || !state) return false;

  const artwork = config.artwork;
  const frameState = resolveFrameState(
    config,
    options.timeMs,
    options.active,
    options.progress,
  );
  const omega = config.id === ARC_CORE_ANIMATION_REVIEW.omega.id;
  const activeAmount = options.active ? smooth(options.progress / (omega ? 0.24 : 0.14)) : 0;
  const idlePhase = options.timeMs / (artwork.idleFrameMs * artwork.idleFrames.length) * TAU;
  const bob = options.active ? 0 : Math.sin(idlePhase) * (omega ? 6 : 2.5);
  const recoil = options.active
    ? Math.sin(clamp((options.progress - 0.72) / 0.28) * Math.PI) * (omega ? 12 : 5)
    : 0;
  const scaleMultiplier = options.scaleMultiplier ?? 1;
  const squash = options.active ? Math.sin(clamp(options.progress) * Math.PI) : 0;
  const size = artwork.displaySizePx * scaleMultiplier;
  const alpha = clamp(options.alpha ?? 1);
  const transform = {
    x: options.cx - options.direction.x * recoil,
    y: options.cy + bob - options.direction.y * recoil,
    width: size * (1 + squash * (omega ? 0.018 : 0.035)),
    height: size * (1 - squash * (omega ? 0.012 : 0.022)),
    angleDeg: directionAngle(options.direction) * 180 / Math.PI
      + Math.sin(idlePhase) * (omega ? 0.8 : 2.4) * (1 - activeAmount),
    originX: artwork.originX,
    originY: artwork.originY,
  };

  drawAura(g, config, { ...options, alpha }, transform);
  drawEnergyLanes(g, config, { ...options, alpha }, transform);
  applySprite(
    state.primary,
    artwork.assetKey,
    frameState.frame,
    transform,
    alpha * (1 - frameState.blend),
  );
  applySprite(
    state.blend,
    artwork.assetKey,
    frameState.nextFrame,
    transform,
    alpha * frameState.blend,
  );
  state.lastFrame = frameState.frame;
  state.nextFrame = frameState.nextFrame;
  state.blendAmount = frameState.blend;
  return true;
}
