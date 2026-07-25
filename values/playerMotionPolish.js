const frameSegment = (start, endExclusive) => Object.freeze(
  Array.from({ length: endExclusive - start }, (_, index) => start + index),
);

const idleFidget = (key, start, endExclusive) => Object.freeze({
  key,
  profileSheetKey: "idleTalkSheet",
  frames: frameSegment(start, endExclusive),
  frameRate: 30,
  repeat: 0,
});

export const PLAYER_MOTION_POLISH_CONFIG = Object.freeze({
  enabled: true,
  fallingVyThresholdPxPerSec: 60,
  postActionRecoverMs: 900,

  idle: Object.freeze({
    firstFidgetDelayMs: 4500,
    repeatDelaysMs: Object.freeze([8500, 11000, 9500]),
    breathTimeScaleMin: 0.97,
    breathTimeScaleMax: 1.03,
    breathCycleMs: 8000,
    fidgets: Object.freeze([
      idleFidget("ual-native-v1-idle-shift-fidget-anim", 64, 88),
      idleFidget("ual-native-v1-idle-survey-fidget-anim", 16, 40),
    ]),
  }),

  wallPush: Object.freeze({
    enterDelayMs: 140,
    releaseGraceMs: 80,
  }),

  hitReaction: Object.freeze({
    queueWindowMs: 450,
    cooldownMs: 750,
    externalKnockbackLockMs: 300,
  }),
});
