const TAU = Math.PI * 2;
const wrap = value => ((value % 1) + 1) % 1;

export function rgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function drawFalls(ctx, canvas, card, cycle, strength) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let index = 0; index < card.motion.bandCount; index += 1) {
    const phase = wrap(cycle + index / card.motion.bandCount);
    const x = canvas.width * (0.13 + (index + 0.5) / card.motion.bandCount * 0.74);
    const sway = Math.sin((phase * TAU) + index) * 18 * strength;
    const bandWidth = card.motion.kind === "dust" ? 95 : 34;
    const gradient = ctx.createLinearGradient(x - bandWidth, 0, x + bandWidth, 0);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.5, rgba(card.accent, (0.018 + phase * 0.045) * strength));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x + sway - bandWidth, 0, bandWidth * 2, canvas.height * 0.9);
  }
  ctx.restore();
}

function drawOrganic(ctx, canvas, card, cycle, strength) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = rgba(card.accent, 0.12 * strength);
  ctx.lineWidth = 3;
  for (let index = 0; index < card.motion.bandCount; index += 1) {
    const offset = Math.sin((cycle + index * 0.17) * TAU) * 16 * strength;
    ctx.beginPath();
    ctx.moveTo(-20, canvas.height * (0.2 + index * 0.17));
    ctx.bezierCurveTo(
      canvas.width * 0.3,
      canvas.height * (0.12 + index * 0.19) + offset,
      canvas.width * 0.65,
      canvas.height * (0.34 + index * 0.1) - offset,
      canvas.width + 20,
      canvas.height * (0.22 + index * 0.16)
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawHeat(ctx, canvas, card, cycle, strength) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let index = 0; index < 3; index += 1) {
    const y = canvas.height * (0.45 + index * 0.15);
    const pulse = 0.5 + 0.5 * Math.sin((cycle + index * 0.24) * TAU);
    ctx.strokeStyle = rgba(card.accent, pulse * 0.12 * strength);
    ctx.lineWidth = 3 + pulse * 5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      canvas.width * 0.3,
      y - 65,
      canvas.width * 0.7,
      y + 58,
      canvas.width,
      y - 20
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawSurge(ctx, canvas, card, cycle, strength) {
  const x = canvas.width * wrap(cycle * 1.12);
  const gradient = ctx.createLinearGradient(x - 220, 0, x + 80, 0);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.72, rgba(card.accent, 0.08 * strength));
  gradient.addColorStop(1, rgba(card.accent, 0.62 * strength));
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(x - 220, canvas.height * 0.63, 300, 8);
  ctx.restore();
}

function drawPrism(ctx, canvas, card, cycle, strength) {
  ctx.save();
  ctx.translate(canvas.width * 0.71, canvas.height * 0.29);
  ctx.rotate(cycle * TAU * 0.18);
  ctx.globalCompositeOperation = "screen";
  for (let index = 0; index < 3; index += 1) {
    ctx.strokeStyle = rgba(
      index % 2 ? card.secondary : card.accent,
      (0.08 - index * 0.016) * strength
    );
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 110 + index * 42, index * 0.8, Math.PI * (1.2 + index * 0.18));
    ctx.stroke();
  }
  ctx.restore();
}

function drawCosmic(ctx, canvas, card, cycle, strength) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  [card.accent, card.secondary].forEach((color, index) => {
    const direction = index ? -1 : 1;
    const offset = Math.sin((cycle * direction + index * 0.3) * TAU) * 42 * strength;
    ctx.strokeStyle = rgba(color, 0.14 * strength);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-40, canvas.height * (0.42 + index * 0.2));
    ctx.bezierCurveTo(
      canvas.width * 0.25,
      canvas.height * (0.25 + index * 0.26) + offset,
      canvas.width * 0.72,
      canvas.height * (0.68 - index * 0.24) - offset,
      canvas.width + 40,
      canvas.height * (0.35 + index * 0.24)
    );
    ctx.stroke();
  });
  ctx.restore();
}

export function drawSignature(ctx, canvas, card, cycle, strength) {
  const kind = card.motion.kind;
  if (kind === "heat") return drawHeat(ctx, canvas, card, cycle, strength);
  if (kind === "surge") return drawSurge(ctx, canvas, card, cycle, strength);
  if (kind === "prism") return drawPrism(ctx, canvas, card, cycle, strength);
  if (kind === "cosmic") return drawCosmic(ctx, canvas, card, cycle, strength);
  if (kind === "organic") return drawOrganic(ctx, canvas, card, cycle, strength);
  return drawFalls(ctx, canvas, card, cycle, strength);
}
