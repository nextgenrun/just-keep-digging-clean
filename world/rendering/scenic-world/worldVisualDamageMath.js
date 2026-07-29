export function hashWorldVisualDamageUnit(tx, ty, salt, config) {
  let value = Math.imul(tx + config.offsetX, config.primeX)
    ^ Math.imul(ty + config.offsetY, config.primeY)
    ^ Math.imul(salt + config.offsetSalt, config.primeSalt);
  value = Math.imul(value ^ (value >>> config.avalancheShift), config.avalanchePrime);
  return ((value ^ (value >>> config.finalShift)) >>> 0) / config.unsignedMax;
}

export function resolveWorldVisualDamageIntensity(minimum, maximum, intensity) {
  const normalized = Math.max(0, Math.min(1, intensity));
  return minimum + (maximum - minimum) * normalized;
}
