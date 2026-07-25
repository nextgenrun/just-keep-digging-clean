import { calculateStrideMatchedTimeScale } from "../../../systems/visual/PlayerKinematicMotionSystem.js";
import { GAME_CONFIG } from "../../../values/gameConfig.js";
import { PLAYER_KINEMATIC_MOTION_CONFIG } from "../../../values/playerKinematicMotion.js";
import { SURVIVAL_RUN_REVIEW_CONFIG } from "../../../values/survivalRunReviewConfig.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../../../values/ualNativePlayerAssetProfile.js";

const config = SURVIVAL_RUN_REVIEW_CONFIG;
const runCadence = PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.run;
const frameSizePx = config.frameSizePx;
const bodyWidthPx = UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyWidthPx;
const bodyHeightPx = UAL_NATIVE_PLAYER_ASSET_PROFILE.playerBodyHeightPx;

function matchedTimeScale(metadata, state) {
  if (state.cadenceMode === config.cadenceModes.native) return 1;
  return calculateStrideMatchedTimeScale({
    speedPxPerSec: state.speedPxPerSec,
    frameCount: metadata.frameCount,
    frameRate: metadata.fps,
    stridePx: runCadence.strideTilesPerCycle * GAME_CONFIG.tileSize,
    minTimeScale: runCadence.minTimeScale,
    maxTimeScale: runCadence.maxTimeScale,
  });
}

function resizeCanvas(canvas) {
  const width = Math.max(280, canvas.clientWidth);
  const height = config.inspection.stageHeightPx;
  const ratio = Math.min(window.devicePixelRatio || 1, config.inspection.maxDevicePixelRatio);
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return { context, width, height };
}

function drawWorld(context, width, height, groundY, state) {
  const tile = GAME_CONFIG.tileSize * state.viewScale;
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#111f28");
  gradient.addColorStop(0.72, "#0b151b");
  gradient.addColorStop(1, "#080d10");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const direction = state.flipX ? 1 : -1;
  const offset = (direction * state.worldDistancePx * state.viewScale) % tile;
  context.lineWidth = 1;
  context.strokeStyle = "rgba(118, 172, 174, 0.12)";
  for (let x = -tile + offset; x <= width + tile; x += tile) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = groundY - tile; y >= 0; y -= tile) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.fillStyle = "#172027";
  context.fillRect(0, groundY, width, height - groundY);
  context.strokeStyle = "rgba(246, 183, 90, 0.36)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, groundY);
  context.lineTo(width, groundY);
  context.stroke();
}

function drawScaleGuide(context, width, groundY, state) {
  if (!state.showGuides) return;
  const tile = GAME_CONFIG.tileSize * state.viewScale;
  const x = width - 24;
  context.strokeStyle = "rgba(120, 216, 208, 0.72)";
  context.fillStyle = "rgba(120, 216, 208, 0.92)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x, groundY - tile);
  context.lineTo(x, groundY);
  context.moveTo(x - 5, groundY - tile);
  context.lineTo(x + 5, groundY - tile);
  context.moveTo(x - 5, groundY);
  context.lineTo(x + 5, groundY);
  context.stroke();
  context.font = "10px ui-monospace, monospace";
  context.textAlign = "right";
  context.fillText("1 tile", x - 8, groundY - tile / 2 + 3);
}

export function drawRunReviewCard(card, state) {
  const { context, width, height } = resizeCanvas(card.canvas);
  const metadata = card.metadata;
  const groundY = Math.round(
    height * config.inspection.groundYRatio
      + (state.viewScale - config.viewScales.live) * config.inspection.zoomGroundOffsetPx,
  );
  drawWorld(context, width, height, groundY, state);

  const timeScale = matchedTimeScale(metadata, state);
  const rawFrame = Math.floor(state.elapsedSeconds * metadata.fps * timeScale);
  const frame = ((rawFrame % metadata.frameCount) + metadata.frameCount) % metadata.frameCount;
  const sourceX = (frame % metadata.columns) * frameSizePx;
  const sourceY = Math.floor(frame / metadata.columns) * frameSizePx;
  const centerX = width * 0.5;
  const displaySize = card.candidate.displaySizePx * state.viewScale;
  const drawX = centerX - displaySize * 0.5;
  const drawY = groundY - displaySize * card.candidate.originY;

  context.save();
  if (state.flipX) {
    context.translate(centerX * 2, 0);
    context.scale(-1, 1);
  }
  context.drawImage(card.image, sourceX, sourceY, frameSizePx, frameSizePx, drawX, drawY, displaySize, displaySize);
  context.restore();

  if (state.showGuides) {
    context.fillStyle = "rgba(255, 120, 111, 0.08)";
    context.strokeStyle = "rgba(255, 120, 111, 0.86)";
    context.lineWidth = 1;
    const bodyWidth = bodyWidthPx * state.viewScale;
    const bodyHeight = bodyHeightPx * state.viewScale;
    const bodyX = centerX - bodyWidth / 2;
    const bodyY = groundY - bodyHeight;
    context.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);
    context.strokeRect(bodyX + 0.5, bodyY + 0.5, bodyWidth - 1, bodyHeight - 1);
  }
  drawScaleGuide(context, width, groundY, state);

  card.frameLabel.textContent = `frame ${frame + 1} / ${metadata.frameCount}`;
  card.timeScaleLabel.textContent = state.cadenceMode === config.cadenceModes.native
    ? "1.00× native"
    : `${timeScale.toFixed(2)}× live`;
}
