function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smooth(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
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

function drawAura(g, config, profile, options, anchor, size) {
  const progress = clamp(options.progress);
  const alpha = clamp(options.alpha ?? 1);
  const pulse = 0.5 + Math.sin(options.timeMs * 0.004) * 0.5;
  const charge = options.active ? smooth((progress - 0.04) / 0.3) : 0;
  const radius = size * profile.dig.auraRadiusRatio;

  g.fillStyle(config.energyColor, alpha * (0.025 + charge * 0.055));
  g.fillCircle(anchor.x, anchor.y, radius + pulse * size * 0.025);
  g.lineStyle(
    Math.max(2, size * 0.006),
    config.energyColor,
    alpha * (0.18 + charge * 0.22),
  );
  g.beginPath();
  g.arc(
    anchor.x,
    anchor.y,
    radius + size * 0.025,
    options.timeMs * 0.0005,
    options.timeMs * 0.0005 + Math.PI * 0.68,
  );
  g.strokePath();
}

function drawEnergyLanes(g, config, profile, options, anchor, size) {
  const progress = clamp(options.progress);
  if (!options.active || progress < 0.14 || progress > 0.94) return;
  const front = options.targets
    .filter(target => target.depthIndex === 0)
    .sort((a, b) => a.widthIndex - b.widthIndex);
  if (!front.length) return;

  const perp = perpendicular(options.direction);
  const energy = smooth((progress - 0.14) / 0.22);
  const startDistance = size * profile.dig.beamStartRatio;
  const centerIndex = (front.length - 1) * 0.5;

  for (const target of front) {
    const face = tileFace(target, options.direction, options.tileSize);
    const laneOffset = (
      target.widthIndex - centerIndex
    ) * profile.dig.beamSpreadPx;
    const sx = anchor.x
      + options.direction.x * startDistance
      + perp.x * laneOffset;
    const sy = anchor.y
      + options.direction.y * startDistance
      + perp.y * laneOffset;
    const lanePulse = 0.82
      + Math.sin(options.timeMs * 0.028 + target.widthIndex) * 0.18;
    const laneColor = target.widthIndex % 2
      ? config.coreColor
      : config.energyColor;

    g.lineStyle(
      profile.dig.beamGlowWidthPx,
      config.energyColor,
      energy * lanePulse * 0.13,
    );
    g.lineBetween(sx, sy, face.x, face.y);
    g.lineStyle(
      profile.dig.beamCoreWidthPx,
      laneColor,
      energy * (0.58 + lanePulse * 0.34),
    );
    g.lineBetween(sx, sy, face.x, face.y);
    g.lineStyle(1, 0xffffff, energy * lanePulse * 0.78);
    g.lineBetween(sx, sy, face.x, face.y);
    g.fillStyle(0xffffff, energy * lanePulse * 0.88);
    g.fillCircle(sx, sy, profile.dig.beamCoreWidthPx * 1.5);
  }
}

export function drawArcCoreSpriteEnergy(
  g,
  config,
  profile,
  options,
  anchor,
  size,
) {
  drawAura(g, config, profile, options, anchor, size);
  drawEnergyLanes(g, config, profile, options, anchor, size);
}
