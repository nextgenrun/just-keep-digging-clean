function phaseForTile(tx, ty) {
  let value = Math.imul(tx + 17, 374761393) ^ Math.imul(ty + 31, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (((value ^ (value >>> 16)) >>> 0) / 4294967295) * Math.PI * 2;
}

export function drawSpecialBlockAura(
  graphics,
  { cx, cy, size, nowMs, tx, ty, profile, highlightColor = 0xffffff },
) {
  if (!graphics || !profile) return false;
  const phase = phaseForTile(tx, ty);
  const pulse = Math.sin(
    (nowMs / Math.max(1, profile.pulsePeriodMs)) * Math.PI * 2 + phase,
  ) * 0.5 + 0.5;
  graphics.fillStyle(
    profile.color,
    profile.haloAlphaBase + pulse * profile.haloAlphaPulse,
  ).fillCircle(cx, cy, size * profile.haloRadiusScale);
  graphics.fillStyle(
    highlightColor,
    profile.coreAlphaBase * (0.7 + pulse * 0.3),
  ).fillCircle(cx, cy, size * profile.coreRadiusScale);
  graphics.lineStyle(
    Math.max(1, size * profile.ringWidthScale),
    profile.color,
    profile.ringAlphaBase * (0.6 + pulse * 0.4),
  ).strokeCircle(cx, cy, size * profile.ringRadiusScale * (0.94 + pulse * 0.08));

  graphics.fillStyle(highlightColor, 0.42 + pulse * 0.48);
  for (let index = 0; index < profile.sparkleCount; index += 1) {
    const angle = phase + index * Math.PI * 2 / profile.sparkleCount + nowMs * 0.00022;
    graphics.fillCircle(
      cx + Math.cos(angle) * size * profile.sparkleOrbitScale,
      cy + Math.sin(angle) * size * profile.sparkleOrbitScale,
      Math.max(1, size * profile.sparkleRadiusScale * (0.75 + pulse * 0.35)),
    );
  }
  return true;
}
