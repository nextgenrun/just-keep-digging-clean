/**
 * Small deterministic math helpers shared by procedural world generators.
 */

export function hashUint(a, b, c, d = 0) {
  let value = Math.imul(a | 0, 0x1f123bb5) ^ Math.imul(b | 0, 0x5f356495);
  value ^= Math.imul(c | 0, 0x6c8e9cf5) ^ Math.imul(d | 0, 0x27d4eb2d);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return (value ^ (value >>> 15)) >>> 0;
}

export function hash01(a, b, c, d = 0) {
  return hashUint(a, b, c, d) / 0x100000000;
}

export function isInsideEllipse(tx, ty, cx, cy, rx, ry) {
  const nx = (tx - cx) / Math.max(1, rx);
  const ny = (ty - cy) / Math.max(1, ry);
  return nx * nx + ny * ny <= 1;
}
