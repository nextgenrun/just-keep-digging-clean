function hashUnit(tx, ty, salt, config) {
  let value = Math.imul(tx + config.offsetX, config.primeX)
    ^ Math.imul(ty + config.offsetY, config.primeY)
    ^ Math.imul(salt + config.offsetSalt, config.primeSalt);
  value = Math.imul(value ^ (value >>> config.avalancheShift), config.avalanchePrime);
  return ((value ^ (value >>> config.finalShift)) >>> 0) / config.unsignedMax;
}

export function drawLegacyWorldVisualDamage(layer, tx, ty, damage, size, config) {
  const legacy = config.legacy;
  const hash = config.hash;
  const cx = (tx + 0.5) * size;
  const cy = (ty + 0.5) * size;
  const branches = legacy.branchBase + Math.floor(damage * legacy.branchDamageScale);
  const width = Math.max(
    legacy.minWidthPx,
    size * (legacy.baseWidthScale + damage * legacy.damageWidthScale)
  );
  layer.lineStyle(width, legacy.color, legacy.baseAlpha + damage * legacy.damageAlphaScale);
  for (let branch = 0; branch < branches; branch += 1) {
    const angle = hashUnit(tx, ty, legacy.angleSalt + branch, hash) * Math.PI * 2;
    const length = size * (legacy.baseLengthScale + damage * legacy.damageLengthScale) * (
      legacy.randomLengthMin
      + hashUnit(tx, ty, legacy.lengthSalt + branch, hash) * legacy.randomLengthRange
    );
    const bend = (hashUnit(tx, ty, legacy.bendSalt + branch, hash) - 0.5) * legacy.bendRadians;
    layer.beginPath()
      .moveTo(cx, cy)
      .lineTo(
        cx + Math.cos(angle) * length * legacy.midpoint,
        cy + Math.sin(angle) * length * legacy.midpoint
      )
      .lineTo(
        cx + Math.cos(angle + bend) * length,
        cy + Math.sin(angle + bend) * length
      )
      .strokePath();
  }
}
