const contact = (textureFrame, sequenceIndex, sourceAction, markerGroup) => Object.freeze({
  textureFrame,
  sequenceIndex,
  sourceAction,
  markerGroup,
});

export const UAL_NATIVE_ACTION_TUNING = Object.freeze({
  cadence: Object.freeze({
    frameRate: 30,
    normal: Object.freeze({
      minDurationMs: 360,
      minTimeScale: 0.65,
      maxTimeScale: 2.25,
      recoveryCancelDelayMs: 100,
    }),
    quickslash: Object.freeze({
      minDurationMs: 220,
      minTimeScale: 1,
      maxTimeScale: 2.4,
    }),
  }),

  combo: Object.freeze({
    resetAfterMs: 950,
    resetOnTargetChange: false,
    resetOnDirectionChange: true,
  }),

  contact: Object.freeze({
    punchJab: contact(7, 7, "punch-jab", "hands"),
    punchCross: contact(9, 9, "punch-cross", "hands"),
    meleeHook: contact(8, 8, "melee-hook", "hands"),
    meleeKick: contact(10, 10, "melee-kick", "feet"),
    digUp: contact(4, 6, "punch-uppercut", "hands"),
    digUpSide: contact(4, 6, "punch-uppercut", "hands"),
    digDown: contact(18, 14, "ground-strike", "hands"),
    quickslash: contact(7, 4, "punch-jab", "hands"),
    thunderStrike: contact(18, 11, "ground-strike", "hands"),
  }),

  thunderStrike: Object.freeze({
    chargeFrameCount: 30,
    strikeFrameCount: 34,
    frameRate: 42,
    holdMs: Math.ceil((34 / 42) * 1000),
  }),

  flight: Object.freeze({
    referenceSpeedPxPerSec: 252,
    hoverBaseTimeScale: 1,
    travelBaseTimeScale: 1.2,
    speedExponent: 0.5,
    minTimeScale: 0.85,
    maxTimeScale: 2,
    travelEnterHorizontalSpeedPxPerSec: 72,
    travelExitHorizontalSpeedPxPerSec: 38,
    horizontalDominanceRatio: 0.8,
    travelBankDegrees: 10,
    hoverBankDegrees: 3,
    bankResponsePerSecond: 20,
    bankMaxDeltaMs: 100,
    bankFallbackDeltaMs: 1000 / 60,
  }),
});

export function resolveUalActionContact(profile, animationKey, kind = "normal") {
  const contacts = UAL_NATIVE_ACTION_TUNING.contact;
  if (kind === "quickslash" || animationKey === profile?.quickslashAnim) return contacts.quickslash;
  if (kind === "thunderstrike" || animationKey === profile?.thunderStrikeStrikeAnim) return contacts.thunderStrike;
  if (animationKey === profile?.digDownAnim || animationKey === profile?.attackDownAnim) return contacts.digDown;

  const variant = profile?.digAnimationVariants?.find((entry) => entry.key === animationKey);
  const sheet = variant?.sheet;
  if (sheet === profile?.digUpSheet) return contacts.digUp;
  if (sheet === profile?.meleeKickSheet) return contacts.meleeKick;
  if (sheet === profile?.meleeHookSheet) return contacts.meleeHook;
  if (sheet === profile?.punchCrossSheet) return contacts.punchCross;
  return contacts.punchJab;
}

export function resolveUalActionTimeScale({
  frameCount,
  frameRate = UAL_NATIVE_ACTION_TUNING.cadence.frameRate,
  effectiveCooldownMs,
  kind = "normal",
}) {
  const cadence = kind === "quickslash"
    ? UAL_NATIVE_ACTION_TUNING.cadence.quickslash
    : UAL_NATIVE_ACTION_TUNING.cadence.normal;
  const sourceDurationMs = (Math.max(1, frameCount) / Math.max(1, frameRate)) * 1000;
  const targetDurationMs = Math.max(cadence.minDurationMs, effectiveCooldownMs || cadence.minDurationMs);
  return Math.min(cadence.maxTimeScale, Math.max(cadence.minTimeScale, sourceDurationMs / targetDurationMs));
}

export function resolveUalFlightTimeScale(speedPxPerSec, travel = false) {
  const flight = UAL_NATIVE_ACTION_TUNING.flight;
  const speedRatio = Math.max(0.01, Math.abs(speedPxPerSec) / flight.referenceSpeedPxPerSec);
  const base = travel ? flight.travelBaseTimeScale : flight.hoverBaseTimeScale;
  const scaled = base * Math.pow(speedRatio, flight.speedExponent);
  return Math.min(flight.maxTimeScale, Math.max(flight.minTimeScale, scaled));
}

export function resolveUalFlightBankAlpha(deltaMs) {
  const flight = UAL_NATIVE_ACTION_TUNING.flight;
  const resolvedDeltaMs = Number.isFinite(deltaMs)
    ? Math.max(0, Math.min(flight.bankMaxDeltaMs, deltaMs))
    : flight.bankFallbackDeltaMs;
  return 1 - Math.exp(-flight.bankResponsePerSecond * resolvedDeltaMs / 1000);
}

export function resolveUalFlightTravel({
  horizontalSpeedPxPerSec,
  verticalSpeedPxPerSec,
  wasTraveling = false,
} = {}) {
  const flight = UAL_NATIVE_ACTION_TUNING.flight;
  const horizontal = Math.abs(Number(horizontalSpeedPxPerSec) || 0);
  const vertical = Math.abs(Number(verticalSpeedPxPerSec) || 0);
  const threshold = wasTraveling
    ? flight.travelExitHorizontalSpeedPxPerSec
    : flight.travelEnterHorizontalSpeedPxPerSec;
  return horizontal >= threshold
    && horizontal >= vertical * flight.horizontalDominanceRatio;
}
