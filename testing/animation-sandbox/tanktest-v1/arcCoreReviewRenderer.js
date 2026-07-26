import {
  ARC_CORE_ANIMATION_REVIEW,
  getArcCoreAnimationReviewMode,
} from "../../../values/arcCoreAnimationReview.js";

const TAU = Math.PI * 2;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from, to, amount) {
  return from + (to - from) * clamp(amount);
}

function smooth(amount) {
  const t = clamp(amount);
  return t * t * (3 - 2 * t);
}

function mixAngle(from, to, amount) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * clamp(amount);
}

function perpendicular(direction) {
  return { x: -direction.y, y: direction.x };
}

function tileFace(target, direction, tileSize) {
  if (direction.x > 0) return { x: target.tx * tileSize, y: (target.ty + 0.5) * tileSize };
  if (direction.x < 0) return { x: (target.tx + 1) * tileSize, y: (target.ty + 0.5) * tileSize };
  return {
    x: (target.tx + 0.5) * tileSize,
    y: direction.y > 0 ? target.ty * tileSize : (target.ty + 1) * tileSize,
  };
}

function drawArc(g, x, y, radius, start, end, color, alpha, width) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.arc(x, y, radius, start, end, false);
  g.strokePath();
}

function drawSmallFin(g, cx, cy, angle, config, charge) {
  const inner = config.bodyRadiusPx * 0.72;
  const outer = config.haloRadiusPx + charge * 6;
  const side = 7 + charge * 2;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const px = -uy;
  const py = ux;
  g.fillStyle(config.energyColor, 0.16 + charge * 0.12);
  g.fillTriangle(
    cx + ux * inner + px * side,
    cy + uy * inner + py * side,
    cx + ux * outer,
    cy + uy * outer,
    cx + ux * inner - px * side,
    cy + uy * inner - py * side,
  );
  g.lineStyle(2, config.accentColor, 0.8);
  g.beginPath();
  g.moveTo(cx + ux * inner + px * side, cy + uy * inner + py * side);
  g.lineTo(cx + ux * outer, cy + uy * outer);
  g.lineTo(cx + ux * inner - px * side, cy + uy * inner - py * side);
  g.strokePath();
  g.lineStyle(2, config.accentColor, 0.82);
  g.lineBetween(
    cx + ux * (inner + 2),
    cy + uy * (inner + 2),
    cx + ux * (outer - 3),
    cy + uy * (outer - 3),
  );
  g.fillStyle(config.coreColor, 0.78);
  g.fillCircle(cx + ux * (outer - 2), cy + uy * (outer - 2), 3 + charge);
}

function drawSmallCore(g, options, config) {
  const { cx, cy, timeMs, progress, active, direction } = options;
  const spin = (timeMs / config.idlePeriodMs) * TAU;
  const directionAngle = Math.atan2(direction.y, direction.x);
  const charge = active ? smooth((progress - 0.04) / 0.28) : 0;
  const lock = active ? smooth(progress / 0.2) : 0;
  const bob = active ? 0 : Math.sin(spin * 2) * 2.4;
  const coreX = cx - direction.x * charge * 3;
  const coreY = cy + bob - direction.y * charge * 3;

  g.fillStyle(config.energyColor, 0.08 + charge * 0.12);
  g.fillCircle(coreX, coreY, config.haloRadiusPx + 10 + charge * 7);
  for (let index = 0; index < 3; index += 1) {
    const idleAngle = spin + index * TAU / 3;
    const lockedAngle = directionAngle + Math.PI + (index - 1) * 0.48;
    drawSmallFin(g, coreX, coreY, mixAngle(idleAngle, lockedAngle, lock), config, charge);
  }

  drawArc(g, coreX, coreY, config.haloRadiusPx, spin, spin + Math.PI * 0.72, config.energyColor, 0.68, 2);
  drawArc(g, coreX, coreY, config.haloRadiusPx, spin + Math.PI, spin + Math.PI * 1.72, config.accentColor, 0.56, 2);
  drawArc(g, coreX, coreY, config.bodyRadiusPx + 5, -spin * 1.4, -spin * 1.4 + Math.PI * 1.28, config.accentColor, 0.66, 2);

  g.fillStyle(config.shellColor, 0.98);
  g.fillCircle(coreX, coreY, config.bodyRadiusPx);
  g.lineStyle(4, 0x03080b, 1);
  g.strokeCircle(coreX, coreY, config.bodyRadiusPx);
  g.lineStyle(3, config.accentColor, 0.92);
  g.strokeCircle(coreX, coreY, config.bodyRadiusPx - 7);
  g.fillStyle(config.energyColor, 0.28 + charge * 0.34);
  g.fillCircle(coreX, coreY, 14 + charge * 5);
  g.fillStyle(config.coreColor, 0.98);
  g.fillCircle(coreX, coreY, 8 + charge * 5);
  g.fillStyle(0xffffff, 0.86);
  g.fillCircle(coreX - 3, coreY - 4, 3);

  if (active && progress > 0.06 && progress < 0.84) {
    drawSmallBore(g, { ...options, cx: coreX, cy: coreY }, config);
  }
}

function drawSmallBore(g, options, config) {
  const { cx, cy, timeMs, progress, direction, targets, tileSize } = options;
  const perp = perpendicular(direction);
  const front = targets.filter(target => target.depthIndex === 0);
  const energy = smooth((progress - 0.1) / 0.34);
  const startX = cx + direction.x * (config.bodyRadiusPx + 2);
  const startY = cy + direction.y * (config.bodyRadiusPx + 2);

  for (const target of front) {
    const face = tileFace(target, direction, tileSize);
    const laneOffset = (target.widthIndex - (front.length - 1) * 0.5) * 11;
    const sx = startX + perp.x * laneOffset;
    const sy = startY + perp.y * laneOffset;
    const flicker = Math.sin(timeMs * 0.055 + target.widthIndex * 2.4);
    g.lineStyle(12 + energy * 8, config.energyColor, 0.1 + energy * 0.12);
    g.lineBetween(sx, sy, face.x, face.y);
    g.lineStyle(2 + energy * 5 + flicker, config.coreColor, 0.88);
    g.lineBetween(sx, sy, face.x, face.y);
    g.lineStyle(1, config.accentColor, 0.9);
    g.lineBetween(sx + perp.x * 4, sy + perp.y * 4, face.x, face.y);

    const deep = targets.find(candidate => (
      candidate.widthIndex === target.widthIndex && candidate.depthIndex === 1
    ));
    if (deep && progress > 0.38) {
      const deepCenterX = (deep.tx + 0.5) * tileSize;
      const deepCenterY = (deep.ty + 0.5) * tileSize;
      g.lineStyle(3, config.energyColor, 0.38 + energy * 0.32);
      g.lineBetween(face.x, face.y, deepCenterX, deepCenterY);
    }
  }

  const needleLength = lerp(4, 31, smooth((progress - 0.08) / 0.22));
  g.fillStyle(config.coreColor, 0.9);
  g.fillTriangle(
    startX + direction.x * needleLength,
    startY + direction.y * needleLength,
    startX + perp.x * 5,
    startY + perp.y * 5,
    startX - perp.x * 5,
    startY - perp.y * 5,
  );
}

function drawOmegaBastion(g, x, y, radius, config, energy, phase) {
  g.fillStyle(config.energyColor, 0.08 + energy * 0.12);
  g.fillCircle(x, y, radius + 12);
  g.fillStyle(config.shellColor, 0.98);
  g.beginPath();
  g.moveTo(x, y - radius);
  g.lineTo(x + radius, y);
  g.lineTo(x, y + radius);
  g.lineTo(x - radius, y);
  g.closePath();
  g.fillPath();
  g.lineStyle(4, config.accentColor, 0.74);
  g.strokePath();
  g.fillStyle(config.energyColor, 0.72 + energy * 0.2);
  g.fillCircle(x, y, radius * (0.3 + phase * 0.08));
  g.lineStyle(2, config.coreColor, 0.82);
  g.strokeCircle(x, y, radius * 0.56);
}

function drawOmegaCore(g, options, config) {
  const { cx, cy, timeMs, progress, active, direction } = options;
  const perp = perpendicular(direction);
  const tide = Math.sin((timeMs / config.idlePeriodMs) * TAU);
  const deploy = active ? smooth(progress / 0.2) : 0;
  const collapse = active ? smooth((progress - 0.16) / 0.24) : 0;
  const energy = active ? smooth((progress - 0.2) / 0.38) : 0.18 + tide * 0.05;
  const bob = active ? 0 : tide * 5;
  const coreX = cx - direction.x * deploy * 7;
  const coreY = cy + bob - direction.y * deploy * 7;
  const axial = config.frameRadiusPx * 0.55 + deploy * 18;
  const lateral = config.frameRadiusPx * 0.62 + deploy * 30;
  const nodes = [
    { x: coreX + direction.x * axial, y: coreY + direction.y * axial },
    { x: coreX - direction.x * axial, y: coreY - direction.y * axial },
    { x: coreX + perp.x * lateral, y: coreY + perp.y * lateral },
    { x: coreX - perp.x * lateral, y: coreY - perp.y * lateral },
  ];

  g.fillStyle(config.energyColor, 0.06 + energy * 0.1);
  g.fillCircle(coreX, coreY, config.bodyRadiusPx);
  g.lineStyle(9, config.energyColor, 0.1 + energy * 0.16);
  for (let index = 0; index < nodes.length; index += 1) {
    const next = nodes[(index + 1) % nodes.length];
    g.lineBetween(nodes[index].x, nodes[index].y, next.x, next.y);
  }
  g.lineStyle(2, config.accentColor, 0.52 + energy * 0.25);
  for (const node of nodes) g.lineBetween(coreX, coreY, node.x, node.y);

  const orbit = (timeMs / config.idlePeriodMs) * TAU;
  for (let index = 0; index < nodes.length; index += 1) {
    const phase = 0.5 + Math.sin(orbit + index * Math.PI * 0.5) * 0.5;
    drawOmegaBastion(g, nodes[index].x, nodes[index].y, 24 + deploy * 5, config, energy, phase);
  }

  for (let index = 0; index < 4; index += 1) {
    const start = orbit * 0.18 + index * Math.PI * 0.5 + 0.12;
    drawArc(g, coreX, coreY, config.frameRadiusPx, start, start + 0.9, index % 2 ? config.energyColor : config.accentColor, 0.54, 5);
  }

  g.fillStyle(0x030107, 0.98);
  g.fillCircle(coreX, coreY, config.coreRadiusPx + collapse * 8);
  g.lineStyle(7, config.energyColor, 0.52 + energy * 0.36);
  g.strokeCircle(coreX, coreY, config.coreRadiusPx + 8 - collapse * 5);
  g.lineStyle(3, config.accentColor, 0.76);
  g.strokeCircle(coreX, coreY, config.coreRadiusPx - 7 + energy * 4);
  g.fillStyle(config.coreColor, 0.24 + energy * 0.38);
  g.fillCircle(coreX, coreY, lerp(19, 8, collapse) + energy * 13);
  g.fillStyle(0xffffff, 0.82);
  g.fillCircle(coreX, coreY, 4 + energy * 4);

  if (active && progress > 0.16 && progress < 0.9) {
    drawOmegaBore(g, { ...options, cx: coreX, cy: coreY }, config);
  }
}

function drawOmegaBore(g, options, config) {
  const { cx, cy, progress, direction, targets, tileSize } = options;
  const perp = perpendicular(direction);
  const front = targets
    .filter(target => target.depthIndex === 0)
    .sort((a, b) => a.widthIndex - b.widthIndex);
  if (front.length === 0) return;

  const leadX = cx + direction.x * (config.frameRadiusPx * 0.72);
  const leadY = cy + direction.y * (config.frameRadiusPx * 0.72);
  const firstFace = tileFace(front[0], direction, tileSize);
  const lastFace = tileFace(front[front.length - 1], direction, tileSize);
  const spread = 18;

  g.fillStyle(config.energyColor, 0.05 + smooth((progress - 0.2) / 0.34) * 0.09);
  g.beginPath();
  g.moveTo(leadX - perp.x * spread * 3.5, leadY - perp.y * spread * 3.5);
  g.lineTo(firstFace.x, firstFace.y);
  g.lineTo(lastFace.x, lastFace.y);
  g.lineTo(leadX + perp.x * spread * 3.5, leadY + perp.y * spread * 3.5);
  g.closePath();
  g.fillPath();

  for (const target of front) {
    const lane = target.widthIndex;
    const laneEnergy = smooth((progress - 0.25 - lane * 0.018) / 0.24);
    const face = tileFace(target, direction, tileSize);
    const offset = (lane - (front.length - 1) * 0.5) * spread;
    const sx = leadX + perp.x * offset;
    const sy = leadY + perp.y * offset;
    g.lineStyle(14, config.energyColor, 0.06 + laneEnergy * 0.12);
    g.lineBetween(sx, sy, face.x, face.y);
    g.lineStyle(2 + laneEnergy * 5, lane % 2 ? config.coreColor : config.accentColor, 0.3 + laneEnergy * 0.62);
    g.lineBetween(sx, sy, face.x, face.y);

    const deep = targets.find(candidate => (
      candidate.widthIndex === lane && candidate.depthIndex === 7
    ));
    if (deep && progress > 0.48) {
      const dx = (deep.tx + 0.5) * tileSize;
      const dy = (deep.ty + 0.5) * tileSize;
      g.lineStyle(2 + laneEnergy * 2, config.energyColor, 0.22 + laneEnergy * 0.3);
      g.lineBetween(face.x, face.y, dx, dy);
    }
  }
}

export function drawArcCoreAnimationReview(g, options) {
  const config = getArcCoreAnimationReviewMode(options.mode);
  if (!config) return false;
  if (options.mode === ARC_CORE_ANIMATION_REVIEW.small.id) drawSmallCore(g, options, config);
  else drawOmegaCore(g, options, config);
  return true;
}
