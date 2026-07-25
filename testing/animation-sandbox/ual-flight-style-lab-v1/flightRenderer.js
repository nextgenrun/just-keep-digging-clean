import { getAverageRigPoint, getRigPoint } from "./flightAssets.js";
import { drawFlightBackdrop } from "./flightBackdrop.js";
import { drawFlightTrail, drawHoverboard } from "./flightEffects.js";

const TAU = Math.PI * 2;
const toRadians = degrees => degrees * Math.PI / 180;
const smoothstep = value => value * value * (3 - (2 * value));

function rotatePoint(x, y, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [(x * cosine) - (y * sine), (x * sine) + (y * cosine)];
}

function resolvePivot(variant, action, frameIndex, originSource) {
  if (variant.pivot === "pelvis") {
    return getRigPoint(action, frameIndex, "pelvis") || originSource;
  }
  if (variant.pivot === "feet") {
    return getAverageRigPoint(action, frameIndex, ["foot_l", "foot_r"], originSource);
  }
  return originSource;
}

function resolvePhaseAltitude(sample, tileSize, reviewScale) {
  const progress = smoothstep(Math.max(0, Math.min(1, sample.progress)));
  if (sample.phase === "takeoff") return (1 - progress) * tileSize * 0.42 * reviewScale;
  if (sample.phase === "land") return progress * tileSize * 0.42 * reviewScale;
  return 0;
}

function createPose(config, pack, sample, variant, controls, input, timeMs) {
  const action = sample.action;
  const frameWidth = action.frame_width || config.bodyFallback.frameWidth;
  const frameHeight = action.frame_height || config.bodyFallback.frameHeight;
  const reviewScale = controls.viewScale === "detail" ? config.stage.detailScale : config.stage.gameScale;
  const displaySize = pack.manifest.display_size_px || config.bodyFallback.displaySizePx;
  const spriteScale = (displaySize / frameWidth) * reviewScale;
  const visualOrigin = pack.manifest.visual_origin || [config.bodyFallback.originX, config.bodyFallback.originY];
  const originSource = [visualOrigin[0] * frameWidth, visualOrigin[1] * frameHeight];
  const pivotSource = resolvePivot(variant, action, sample.frameIndex, originSource);
  const facingSign = controls.faceLeft ? -1 : 1;
  const manualBankDeg = input.bank * config.input.maxBankDeg;
  const pitchDeg = (variant.pitchByPhase[sample.phase] ?? 0) + controls.pitch + manualBankDeg;
  const angle = toRadians(pitchDeg * facingSign);
  const bob = Math.sin(timeMs * 0.001 * config.input.bodyBobHz * TAU)
    * config.input.bodyBobPx * reviewScale;
  const anchor = {
    x: config.stage.width * config.stage.anchorXRatio,
    y: (config.stage.height * config.stage.anchorYRatio)
      + (input.lift * config.input.liftPx * reviewScale)
      + resolvePhaseAltitude(sample, config.stage.tileSizePx, reviewScale)
      + bob,
  };

  const worldPoint = (sourcePoint, rotate = true) => {
    const localX = (sourcePoint[0] - pivotSource[0]) * spriteScale * facingSign;
    const localY = (sourcePoint[1] - pivotSource[1]) * spriteScale;
    const [x, y] = rotate ? rotatePoint(localX, localY, angle) : [localX, localY];
    return { x: anchor.x + x, y: anchor.y + y };
  };

  const footSource = getAverageRigPoint(action, sample.frameIndex, ["foot_l", "foot_r"], originSource);
  const averageFootWorld = worldPoint(footSource);
  const originWorld = worldPoint(originSource, false);
  const boardAnchor = {
    x: averageFootWorld.x,
    y: averageFootWorld.y + (controls.boardY * reviewScale),
  };

  return {
    action,
    anchor,
    angle,
    facingSign,
    frameWidth,
    frameHeight,
    spriteScale,
    pivotSource,
    originWorld,
    averageFootWorld,
    boardAnchor,
    reviewScale,
    pitchDeg,
    manualBankDeg,
  };
}

function drawCharacterFrame(ctx, pose, frameIndex, options = {}) {
  const sourceX = (frameIndex % pose.action.columns) * pose.frameWidth;
  const sourceY = Math.floor(frameIndex / pose.action.columns) * pose.frameHeight;
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.globalCompositeOperation = options.composite || "source-over";
  ctx.translate(pose.anchor.x + (options.offsetX || 0), pose.anchor.y + (options.offsetY || 0));
  ctx.rotate(pose.angle);
  ctx.scale(pose.facingSign, 1);
  if (options.glow) {
    ctx.shadowColor = options.glow;
    ctx.shadowBlur = options.glowBlur || 12;
  }
  ctx.drawImage(
    pose.action.image,
    sourceX,
    sourceY,
    pose.frameWidth,
    pose.frameHeight,
    -pose.pivotSource[0] * pose.spriteScale,
    -pose.pivotSource[1] * pose.spriteScale,
    pose.frameWidth * pose.spriteScale,
    pose.frameHeight * pose.spriteScale,
  );
  ctx.restore();
}

function drawAfterimages(ctx, config, pose, controls, sample) {
  if (controls.effectScale < 0.35 || !["cruise", "boost"].includes(sample.phase)) return;
  const count = sample.phase === "boost" ? 4 : 2;
  const spacing = (13 + (controls.speed * 0.045)) * pose.reviewScale;
  for (let index = count; index >= 1; index -= 1) {
    drawCharacterFrame(ctx, pose, sample.frameIndex, {
      alpha: (0.035 + ((count - index) * 0.025)) * controls.effectScale,
      composite: "lighter",
      offsetX: -pose.facingSign * spacing * index,
      glow: index % 2 === 0 ? config.palette.violet : config.palette.cyan,
      glowBlur: 8 * controls.effectScale,
    });
  }
}

function drawColliderGuides(ctx, config, pack, pose, sample) {
  const body = pack.manifest.player_body || {};
  const reviewHitbox = sample.action.flightHitbox;
  const isFlightHull = Boolean(reviewHitbox);
  const physicsWidth = (reviewHitbox?.physicsAabbWidthPx || body.width_px || config.bodyFallback.colliderWidthPx)
    * pose.reviewScale;
  const physicsHeight = (reviewHitbox?.physicsAabbHeightPx || body.height_px || config.bodyFallback.colliderHeightPx)
    * pose.reviewScale;
  const physicsCenter = isFlightHull ? pose.anchor : {
    x: pose.originWorld.x,
    y: pose.originWorld.y - (physicsHeight * 0.5),
  };
  const x = physicsCenter.x - (physicsWidth * 0.5);
  const y = physicsCenter.y - (physicsHeight * 0.5);
  const targetHeight = config.stage.tileSizePx * 0.8 * pose.reviewScale;

  ctx.save();
  ctx.setLineDash([7, 5]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255, 184, 92, 0.95)";
  ctx.strokeRect(x, y, physicsWidth, physicsHeight);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255, 184, 92, 0.9)";
  ctx.font = "600 12px ui-monospace, Consolas, monospace";
  const physicsLabel = isFlightHull
    ? `safe tile AABB · ${reviewHitbox.physicsAabbWidthPx} × ${reviewHitbox.physicsAabbHeightPx}`
    : `${body.width_px || 31} × ${body.height_px || 75} collider`;
  ctx.fillText(physicsLabel, x + physicsWidth + 8, y + 14);

  let visualHull = null;
  if (isFlightHull) {
    const visualWidth = reviewHitbox.visualHullWidthPx * pose.reviewScale;
    const visualHeight = reviewHitbox.visualHullHeightPx * pose.reviewScale;
    ctx.save();
    ctx.translate(pose.anchor.x, pose.anchor.y);
    ctx.rotate(pose.angle);
    ctx.strokeStyle = "rgba(92, 236, 255, 0.95)";
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-(visualWidth * 0.5), -(visualHeight * 0.5), visualWidth, visualHeight);
    ctx.restore();
    ctx.fillStyle = "rgba(155, 238, 255, 0.92)";
    ctx.fillText(
      `visual flight hull · ${reviewHitbox.visualHullWidthPx} × ${reviewHitbox.visualHullHeightPx}`,
      x + physicsWidth + 8,
      y + 30,
    );
    visualHull = {
      center: { x: pose.anchor.x, y: pose.anchor.y },
      width: visualWidth,
      height: visualHeight,
      angleDeg: pose.pitchDeg,
    };
  }

  const bracketX = pose.originWorld.x + (42 * pose.reviewScale);
  ctx.strokeStyle = "rgba(92, 236, 255, 0.85)";
  ctx.beginPath();
  ctx.moveTo(bracketX, pose.originWorld.y);
  ctx.lineTo(bracketX, pose.originWorld.y - targetHeight);
  ctx.moveTo(bracketX - 6, pose.originWorld.y);
  ctx.lineTo(bracketX + 6, pose.originWorld.y);
  ctx.moveTo(bracketX - 6, pose.originWorld.y - targetHeight);
  ctx.lineTo(bracketX + 6, pose.originWorld.y - targetHeight);
  ctx.stroke();
  ctx.fillStyle = "rgba(155, 238, 255, 0.9)";
  ctx.fillText("0.8 tile", bracketX + 9, pose.originWorld.y - (targetHeight * 0.5));

  if (sample.boardOpacity > 0.05) {
    ctx.fillStyle = "rgba(182, 111, 255, 0.9)";
    ctx.fillText("board: visual only", pose.boardAnchor.x + 28, pose.boardAnchor.y + 28);
  }
  ctx.restore();
  return {
    physicsAabb: { x, y, width: physicsWidth, height: physicsHeight },
    visualHull,
    policy: reviewHitbox?.policy || "upright tile AABB",
  };
}

export class FlightRenderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.config = config;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
  }

  render(pack, sample, variant, controls, input, timeMs) {
    const speedFactor = this.config.phaseSpeedFactor[sample.phase] ?? 0;
    const effectiveSpeed = controls.speed * speedFactor;
    const pose = createPose(this.config, pack, sample, variant, controls, input, timeMs);
    drawFlightBackdrop(this.ctx, this.config, {
      timeMs,
      speed: effectiveSpeed,
      facingSign: pose.facingSign,
      reviewScale: pose.reviewScale,
      showGuides: controls.showCollider,
    });
    drawFlightTrail(this.ctx, this.config, pose, variant, controls, sample, timeMs);
    drawAfterimages(this.ctx, this.config, pose, controls, sample);
    drawHoverboard(this.ctx, this.config, pose, variant, controls, sample, timeMs);
    drawCharacterFrame(this.ctx, pose, sample.frameIndex, {
      glow: sample.phase === "boost" ? this.config.palette.cyan : null,
      glowBlur: 14 * controls.effectScale,
    });
    const collider = controls.showCollider
      ? drawColliderGuides(this.ctx, this.config, pack, pose, sample)
      : null;
    return {
      actionId: sample.action.id,
      frameIndex: sample.frameIndex,
      frameCount: sample.action.frame_count,
      pitchDeg: pose.pitchDeg,
      boardOpacity: sample.boardOpacity,
      effectiveSpeed,
      collider,
    };
  }
}
