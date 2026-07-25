const TAU = Math.PI * 2;

function drawRibbon(ctx, origin, facingSign, length, width, colors, phase, alpha = 1) {
  const endX = origin.x - (facingSign * length);
  const bend = Math.sin(phase) * width * 0.48;
  const gradient = ctx.createLinearGradient(origin.x, origin.y, endX, origin.y + bend);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.42, colors[1]);
  gradient.addColorStop(1, "rgba(50, 90, 255, 0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y - (width * 0.45));
  ctx.bezierCurveTo(
    origin.x - (facingSign * length * 0.28), origin.y - width,
    endX + (facingSign * length * 0.28), origin.y + bend - (width * 0.35),
    endX, origin.y + bend,
  );
  ctx.bezierCurveTo(
    endX + (facingSign * length * 0.3), origin.y + bend + (width * 0.25),
    origin.x - (facingSign * length * 0.22), origin.y + (width * 0.6),
    origin.x, origin.y + (width * 0.45),
  );
  ctx.closePath();
  ctx.fill();
}

function drawTrailParticles(ctx, origin, facingSign, length, amount, timeMs, palette) {
  const count = Math.round(8 + (amount * 18));
  for (let index = 0; index < count; index += 1) {
    const drift = ((index * 47) + (timeMs * (0.04 + ((index % 4) * 0.01)))) % length;
    const x = origin.x - (facingSign * drift);
    const y = origin.y + (Math.sin((index * 2.7) + (timeMs * 0.004)) * (5 + (drift * 0.05)));
    const radius = 0.8 + ((index % 3) * 0.7);
    ctx.globalAlpha = Math.max(0, 0.7 * (1 - (drift / length)));
    ctx.fillStyle = index % 3 === 0 ? palette.violet : palette.cyan;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }
}

export function drawFlightTrail(ctx, config, pose, variant, controls, sample, timeMs) {
  const phaseFactor = config.phaseSpeedFactor[sample.phase] ?? 0.1;
  const effectiveSpeed = controls.speed * phaseFactor;
  const length = (70 + (effectiveSpeed * 0.7)) * controls.trailScale * pose.reviewScale;
  const width = (8 + (effectiveSpeed * 0.035)) * controls.effectScale * pose.reviewScale;
  const heroOrigin = pose.averageFootWorld;
  const boardOrigin = pose.boardAnchor;
  const boardBlend = sample.boardOpacity;
  const phase = timeMs * 0.006;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (["wake", "hero", "hybrid"].includes(variant.trailStyle)) {
    const opacity = variant.trailStyle === "hybrid" ? Math.max(0.25, 1 - boardBlend) : 0.78;
    drawRibbon(
      ctx,
      heroOrigin,
      pose.facingSign,
      length * (variant.trailStyle === "hero" ? 1.18 : 0.86),
      width * (variant.trailStyle === "hero" ? 1.45 : 0.9),
      [config.palette.white, config.palette.cyan],
      phase,
      opacity * controls.effectScale,
    );
    drawRibbon(
      ctx,
      { x: heroOrigin.x, y: heroOrigin.y + (5 * pose.reviewScale) },
      pose.facingSign,
      length,
      width * 0.72,
      [config.palette.violet, config.palette.blue],
      phase + 1.7,
      opacity * 0.7 * controls.effectScale,
    );
  }

  if (["thrusters", "ribbon", "hybrid"].includes(variant.trailStyle) && boardBlend > 0.02) {
    const ribbonWidth = variant.trailStyle === "ribbon" ? width * 1.18 : width * 0.65;
    drawRibbon(
      ctx,
      boardOrigin,
      pose.facingSign,
      length * (variant.trailStyle === "ribbon" ? 1.08 : 0.72),
      ribbonWidth,
      [config.palette.white, config.palette.violet],
      phase + 0.8,
      boardBlend * controls.effectScale,
    );
  }

  drawTrailParticles(
    ctx,
    boardBlend > 0.35 ? boardOrigin : heroOrigin,
    pose.facingSign,
    Math.max(60, length),
    controls.effectScale * (sample.phase === "boost" ? 1.25 : 0.65),
    timeMs,
    config.palette,
  );
  ctx.restore();
}

function drawJet(ctx, x, y, length, width, colors, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const gradient = ctx.createLinearGradient(0, 0, 0, length);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.35, colors[1]);
  gradient.addColorStop(1, "rgba(40, 95, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-width * 0.5, 0);
  ctx.quadraticCurveTo(0, length * 0.72, 0, length);
  ctx.quadraticCurveTo(0, length * 0.72, width * 0.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawHoverboard(ctx, config, pose, variant, controls, sample, timeMs) {
  if (sample.boardOpacity <= 0.01) return;
  const board = config.board;
  const scale = pose.reviewScale * controls.boardScale;
  const width = board.widthPx * scale;
  const height = board.heightPx * scale;
  const bob = Math.sin(timeMs * 0.001 * board.hoverHz * TAU) * board.hoverBobPx * scale;
  const phaseFactor = config.phaseSpeedFactor[sample.phase] ?? 0;
  const tiltDeg = ((variant.pitchByPhase[sample.phase] ?? 0) * 0.35) + (pose.manualBankDeg * 0.45);

  ctx.save();
  ctx.globalAlpha = sample.boardOpacity;
  ctx.translate(pose.boardAnchor.x, pose.boardAnchor.y + bob);
  ctx.rotate((tiltDeg * Math.PI / 180) * pose.facingSign);
  ctx.scale(pose.facingSign, 1);
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = board.energy;
  ctx.shadowBlur = 22 * controls.effectScale;
  ctx.fillStyle = "rgba(170, 83, 255, 0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 1, width * 0.58, height * 1.05, 0, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "source-over";

  const deckGradient = ctx.createLinearGradient(0, -height, 0, height);
  deckGradient.addColorStop(0, board.deckTop);
  deckGradient.addColorStop(1, board.deckBottom);
  ctx.fillStyle = deckGradient;
  ctx.strokeStyle = board.rim;
  ctx.lineWidth = Math.max(1.2, scale * 0.8);
  ctx.beginPath();
  ctx.moveTo(-width * 0.48, -height * 0.2);
  ctx.quadraticCurveTo(-width * 0.55, -height * 0.8, -width * 0.42, -height * 0.72);
  ctx.lineTo(width * 0.36, -height * 0.62);
  ctx.quadraticCurveTo(width * 0.53, -height * 1.1, width * 0.49, height * 0.12);
  ctx.quadraticCurveTo(width * 0.18, height * 0.74, -width * 0.38, height * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = board.energy;
  ctx.lineWidth = Math.max(1, scale * 0.75);
  ctx.beginPath();
  ctx.moveTo(-width * 0.35, height * 0.18);
  ctx.quadraticCurveTo(0, height * 0.48, width * 0.4, 0);
  ctx.stroke();
  ctx.fillStyle = board.hotCore;
  for (const podX of [-board.jetOffsetXPx * scale, board.jetOffsetXPx * scale]) {
    ctx.beginPath();
    ctx.ellipse(podX, height * 0.42, 4.2 * scale, 2.1 * scale, 0, 0, TAU);
    ctx.fill();
    const jetAngle = (-0.08 - (phaseFactor * 0.38)) * pose.facingSign;
    drawJet(
      ctx,
      podX,
      height * 0.5,
      board.jetLengthPx * scale * (0.75 + phaseFactor),
      5.4 * scale,
      [board.hotCore, board.rim],
      jetAngle,
    );
  }
  ctx.restore();
}
