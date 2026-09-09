import { MERCHANT_ACTIVITY_MOTION as A } from '../../values/merchantActivityMotion.js';
import { smooth } from './merchantMotionMath.js';

export function sampleMerchantActivityBlend(elapsedMs, durationMs) {
  if (elapsedMs < 0) return 0;
  const fadeOutAt = Math.max(A.fadeInDelayMs + A.fadeInMs, durationMs - A.calmTailMs - A.fadeOutMs);
  return smooth(A.fadeInDelayMs, A.fadeInDelayMs + A.fadeInMs, elapsedMs)
    * (1 - smooth(fadeOutAt, fadeOutAt + A.fadeOutMs, elapsedMs));
}

export function createMerchantActivityCast(cast) {
  return { ...cast, motion: {
    body: { idleAngle: A.bodyAngle, idleY: A.bodyLift, angle: A.shopBodyAngles },
    head: { idleAngle: A.headAngle, idleY: A.headLift, angle: A.shopHeadAngles },
  } };
}

export function chooseMerchantActivity(ids, weights, previous, random) {
  const fresh = ids.filter(id => id !== previous);
  const eligible = fresh.length ? fresh : ids;
  const total = eligible.reduce((sum, id) => sum + weights[id], 0);
  let choice = random() * total;
  for (const id of eligible) {
    choice -= weights[id];
    if (choice <= 0) return id;
  }
  return eligible.at(-1);
}
