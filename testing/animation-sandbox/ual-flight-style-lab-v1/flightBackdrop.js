function drawCaveEdge(ctx, width, height, top, timeMs, color, edgeColor) {
  const direction = top ? 1 : -1;
  const baseline = top ? 0 : height;
  const depth = height * 0.13;
  ctx.beginPath();
  ctx.moveTo(0, baseline);
  for (let x = 0; x <= width + 60; x += 58) {
    const noise = Math.sin((x * 0.037) + (timeMs * 0.00006)) * 18;
    const y = baseline + (direction * (depth + noise + ((x / width) * 12)));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, baseline);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, baseline, 0, baseline + (direction * depth * 1.4));
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, edgeColor);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = "rgba(92, 184, 255, 0.11)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawSkyAperture(ctx, width, height, palette) {
  const x = width * 0.84;
  const y = height * 0.22;
  const glow = ctx.createRadialGradient(x, y, 12, x, y, width * 0.32);
  glow.addColorStop(0, "rgba(130, 226, 255, 0.3)");
  glow.addColorStop(0.35, "rgba(49, 111, 218, 0.16)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = palette.white;
  for (let index = 0; index < 24; index += 1) {
    const starX = ((index * 109) % 530) + (width * 0.58);
    const starY = ((index * index * 17) % Math.max(120, height * 0.46)) + 34;
    const radius = index % 7 === 0 ? 1.8 : 0.8;
    ctx.globalAlpha = 0.24 + ((index % 5) * 0.1);
    ctx.beginPath();
    ctx.arc(starX, starY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWorldGrid(ctx, config, reviewScale, scrollPx) {
  const { width, height, tileSizePx, gridAlpha } = config.stage;
  const tile = tileSizePx * reviewScale;
  const offset = ((scrollPx % tile) + tile) % tile;
  ctx.save();
  ctx.strokeStyle = `rgba(112, 209, 255, ${gridAlpha})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 7]);
  for (let x = -offset; x <= width; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = height * 0.12; y <= height; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpeedStreaks(ctx, width, height, speed, facingSign, timeMs, palette) {
  const strength = Math.max(0, Math.min(1, (speed - 90) / 320));
  if (strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (let index = 0; index < 18; index += 1) {
    const phase = ((timeMs * (0.06 + (index * 0.004))) + (index * 101)) % (width + 260);
    const x = facingSign > 0 ? width - phase : phase - 260;
    const y = 70 + ((index * 83) % (height - 140));
    const length = (18 + ((index % 5) * 18)) * strength;
    ctx.globalAlpha = (0.06 + ((index % 4) * 0.025)) * strength;
    ctx.strokeStyle = index % 3 === 0 ? palette.violet : palette.cyan;
    ctx.lineWidth = index % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - (facingSign * length), y + Math.sin(index) * 3);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFlightBackdrop(ctx, config, options) {
  const { width, height } = config.stage;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#03070c");
  gradient.addColorStop(0.55, config.palette.cave);
  gradient.addColorStop(1, "#0b1830");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawSkyAperture(ctx, width, height, config.palette);
  const scrollPx = (options.timeMs / 1000) * options.speed * 0.34 * options.facingSign;
  if (options.showGuides) drawWorldGrid(ctx, config, options.reviewScale, scrollPx);
  drawSpeedStreaks(ctx, width, height, options.speed, options.facingSign, options.timeMs, config.palette);
  drawCaveEdge(ctx, width, height, true, options.timeMs, "#02050a", config.palette.caveEdge);
  drawCaveEdge(ctx, width, height, false, options.timeMs, "#02040a", "#12131d");

  const floorGlow = ctx.createLinearGradient(0, height * 0.72, 0, height);
  floorGlow.addColorStop(0, "rgba(172, 72, 255, 0)");
  floorGlow.addColorStop(1, "rgba(172, 72, 255, 0.07)");
  ctx.fillStyle = floorGlow;
  ctx.fillRect(0, height * 0.7, width, height * 0.3);
}
