import { MERCHANT_MOTION_CONFIG as C } from '../../values/merchantMotion.js';

export const identity = () => [1,0,0, 0,1,0, 0,0,1];
export const modulo = (n, d) => ((n % d) + d) % d;
export function smooth(a, b, n) {
  const t = Math.max(0, Math.min(1, (n - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
export function multiply(a, b) {
  const out = new Array(9).fill(0);
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      for (let k = 0; k < 3; k++) out[col * 3 + row] += a[k * 3 + row] * b[col * 3 + k];
    }
  }
  return out;
}
export function transformPoint(matrix, x, y) {
  return [matrix[0] * x + matrix[3] * y + matrix[6], matrix[1] * x + matrix[4] * y + matrix[7]];
}
export function sampleTrack(track, time) {
  if (!track || time < 0 || time > C.actionDuration) return 0;
  for (let i = 1; i < track.length; i++) {
    if (time > track[i][0]) continue;
    const [t0, v0] = track[i - 1];
    const [t1, v1] = track[i];
    const t = Math.max(0, Math.min(1, (time - t0) / (t1 - t0)));
    const ease = t * t * t * (t * (t * 6 - 15) + 10);
    return v0 + (v1 - v0) * ease;
  }
  return track.at(-1)[1];
}
export function samplePose(cast, rig, time, actionTime, strength = 1) {
  const matrices = [identity()];
  const byName = new Map();
  const active = actionTime >= 0;
  const envelope = active ? strength * smooth(0, C.gestureEaseIn, actionTime) * (1 - smooth(C.gestureEaseOut, C.actionDuration, actionTime)) : 0;
  const blinkTime = modulo(time + cast.blinkPhase, C.blinkPeriod);
  const blink = blinkTime < C.blinkDuration ? Math.sin(blinkTime / C.blinkDuration * Math.PI) ** 2 : 0;
  for (const bone of rig) {
    const channel = cast.motion[bone.name] || {};
    const wave = Math.sin(time / cast.period * Math.PI * 2 + (channel.phase || 0));
    let angle = (channel.idleAngle || 0) * wave + strength * sampleTrack(channel.angle, actionTime);
    if (channel.wagAngle && active) angle += channel.wagAngle * envelope * Math.sin(actionTime / channel.wagPeriod * Math.PI * 2);
    const dx = strength * sampleTrack(channel.x, actionTime);
    const dy = (channel.idleY || 0) * wave + strength * sampleTrack(channel.y, actionTime);
    const sy = bone.name.startsWith('eye') ? 1 - blink * (1 - C.blinkClosedScale) : 1;
    angle *= Math.PI / 180;
    const c = Math.cos(angle), s = Math.sin(angle);
    const [px, py] = bone.pivot;
    const local = [c,s,0, -s*sy,c*sy,0, px-c*px+s*sy*py+dx,py-s*px-c*sy*py+dy,1];
    const parent = bone.parent ? byName.get(bone.parent) : matrices[0];
    if (!parent) throw new Error(`Unknown parent ${bone.parent} for ${bone.name}`);
    const matrix = multiply(parent, local);
    byName.set(bone.name, matrix);
    matrices.push(matrix);
  }
  const packed = new Float32Array(C.maxBones * 9);
  matrices.forEach((matrix, index) => packed.set(matrix, index * 9));
  return { matrices, packed, envelope, blink };
}
function regionWeight(bone, x, y) {
  const [cx, cy, rx, ry] = bone.field;
  const distance = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return 1 - smooth(bone.inner ?? C.maskInner, bone.outer ?? C.maskOuter, distance);
}
export function weightsAt(rig, x, y, foot) {
  const order = rig.map((bone, index) => ({ bone, id: index + 1 })).sort((a,b) => b.bone.priority - a.bone.priority);
  const pin = 1 - smooth(foot * C.groundPinStart, foot * C.groundPinEnd, y);
  const weights = [];
  let remaining = 1;
  for (const { bone, id } of order) {
    const fraction = regionWeight(bone, x, y);
    const weight = remaining * fraction * pin;
    if (weight > 0) weights.push([id, weight]);
    remaining *= 1 - fraction;
  }
  weights.push([0, 1 - weights.reduce((total, entry) => total + entry[1], 0)]);
  weights.sort((a,b) => b[1] - a[1]);
  const selected = weights.slice(0, C.influences);
  const total = selected.reduce((sum, entry) => sum + entry[1], 0);
  while (selected.length < C.influences) selected.push([0, 0]);
  return selected.map(([id, weight]) => [id, weight / total]);
}
export function createMesh(rig, foot) {
  if (rig.length + 1 > C.maxBones) throw new Error('Too many merchant joints');
  const n = C.meshResolution, stride = 2 + C.influences * 2;
  const vertices = new Float32Array((n + 1) ** 2 * stride);
  const indices = new Uint16Array(n * n * 6);
  let v = 0, f = 0;
  for (let row = 0; row <= n; row++) {
    for (let col = 0; col <= n; col++) {
      const x = col / n * C.referenceSize, y = row / n * C.referenceSize;
      const weights = weightsAt(rig, x, y, foot);
      vertices.set([x,y, ...weights.map(w => w[0]), ...weights.map(w => w[1])], v);
      v += stride;
      if (row < n && col < n) {
        const a = row * (n + 1) + col, b = a + 1, c = a + n + 1, d = c + 1;
        indices.set([a,b,c, b,d,c], f); f += 6;
      }
    }
  }
  return { vertices, indices, stride };
}
