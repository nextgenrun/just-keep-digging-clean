export const HARDCORE_PANIC_PRESENTATION = Object.freeze({
  referenceViewport: Object.freeze({ width: 1280, height: 720 }),
  percentageMaximum: 100,
  thresholds: Object.freeze({
    uneaseStartStressRatio: 0.24, frayingStartStressRatio: 0.42,
    severeStartStressRatio: 0.7,
    peripheralStartStressRatio: 0.18, peripheralFullStressRatio: 0.96,
    echoStartStressRatio: 0.46, echoFullStressRatio: 0.96,
    realitySlipStartStressRatio: 0.74, realitySlipFullStressRatio: 0.99,
    bannerStartStressRatio: 0.76, bannerFullStressRatio: 0.92,
    extremeSanityPercent: 10,
    nearDeathVisualIntensity: 0.92,
    visibilityEpsilon: 0.002,
  }),
  status: Object.freeze({
    titleY: -11, detailY: 11,
    calmIconSizePx: 50, warningIconSizePx: 50, criticalIconSizePx: 54,
    pulseHzMinimum: 0.55, pulseHzMaximum: 1.75,
    pulseScaleMaximum: 0.025,
    iconPulseScale: 0.055,
    frameAlphaLossMaximum: 0.07,
    millisecondsPerSecond: 1000,
  }),
  overlay: Object.freeze({
    edgeDepth: 997, bannerDepth: 3602,
    bannerY: 115, bannerWidth: 430, bannerHeight: 76,
    iconX: -179, iconSizePx: 50,
    textX: -139, titleY: -13, detailY: 13,
    titleFontPx: 18, detailFontPx: 12,
    millisecondsPerSecond: 1000,
    pulseHzMinimum: 0.85, pulseHzMaximum: 1.9,
    transitionRisePerSecond: 5.5, transitionFallPerSecond: 3.2,
    maximumFrameDeltaSeconds: 0.1,
    edgeAlphaMaximum: 0.82,
    edgeIntensityExponent: 1.6,
    edgePulseAlphaMinimum: 0.86, edgePulseAlphaMaximum: 1,
    echoAlphaMaximum: 0.12,
    echoScaleMaximum: 0.01,
    echoDriftMaximumPx: 1.5,
    echoDriftXHz: 0.31,
    echoDriftYHz: 0.39,
    slipAlphaMaximum: 0.15,
    slipScaleMaximum: 0.018,
    slipDriftMaximumPx: 4,
    slipDriftXHz: 0.73,
    slipDriftYHz: 0.91,
    bannerAlphaMinimum: 0.72,
    bannerAlphaMaximum: 1,
    bannerAlphaExponent: 0.55,
    bannerScaleMinimum: 0.985,
    bannerPulseScale: 0.022,
    iconPulseScale: 0.075,
    textDriftMaximumPx: 1,
    textDriftHz: 0.82,
  }),
  colors: Object.freeze({
    calmTitle: "#f4e8c8", uneaseTitle: "#e6d6ad",
    frayingTitle: "#f1c985", warningTitle: "#ffd36f",
    criticalTitle: "#fff0ec",
    neutralDetail: "#b9c8d3", uneaseDetail: "#c8bfa9",
    frayingDetail: "#e0bd85", warningDetail: "#ffc47a",
    criticalDetail: "#ff8b7f",
    endedTitle: "#ff7468",
  }),
  copy: Object.freeze({
    endedTitle: "HARDCORE RUN ENDED",
    endedDetail: "YOUR SAVE IS SAFE  •  EXPORT OR CLEAR IT FROM SAVE SLOTS",
    pendingTitle: "HARDCORE STARTS WITH FLIGHT",
    pendingDetail: "UNLOCK FLIGHT TO BEGIN THE CHALLENGE",
    hardcorePrefix: "HARDCORE",
    sanityPrefix: "SANITY",
    uneasePrefix: "UNEASE RISING",
    frayingPrefix: "THOUGHTS FRAYING",
    warningPrefix: "SANITY FRACTURING",
    severePrefix: "MIND STRAINING",
    criticalPrefix: "MIND UNRAVELLING",
    extremePrefix: "YOU ARE LOSING YOUR MIND",
    deathClosePrefix: "DEATH IS CLOSE",
    deathImminentPrefix: "DEATH IS IMMINENT",
    lifeSingular: "LIFE",
    lifePlural: "LIVES",
    uneaseAction: "SOMETHING FEELS WRONG  •  LIGHT KEEPS YOU STEADY",
    frayingAction: "FOCUS IS SLIPPING  •  RETURN TO LIGHT",
    warningAction: "LIGHT STABILISES SANITY  •  SLOW YOUR DESCENT",
    severeAction: "VISION IS NARROWING  •  FIND LIGHT NOW",
    criticalAction: "FIND LIGHT OR LOSE A LIFE",
    drainPrefix: "LOSING",
    gpLeftSuffix: "GP LEFT",
    deathAtZero: "0 GP TAKES A LIFE",
    panicLinePrefix: "PANIC STARTS", levelResistancePrefix: "LEVEL PROTECTION",
    deadzonePanicPrefix: "SCAR PANIC", deadzoneAction: "USE YOUR TORCH OR LEAVE", depthUnit: "M",
    lifeRisk: "LIFE AT RISK",
  }),
});
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp01 = value => Math.max(0, Math.min(1, finite(value)));
const smoothstepRange = (start, end, value) => {
  const width = Math.max(end - start, Number.EPSILON);
  const amount = clamp01((value - start) / width);
  return amount * amount * (3 - 2 * amount);
};
export function resolveHardcorePanicView(snapshot, gp = 0, risk = {}) {
  const presentation = HARDCORE_PANIC_PRESENTATION;
  const copy = presentation.copy;
  const colors = presentation.colors;
  const visible = snapshot?.isHardcore === true;
  const exhausted = snapshot?.exhausted === true;
  const pending = snapshot?.armed !== true && !exhausted;
  const stressRatio = clamp01(snapshot?.stressRatio);
  const sanityRatio = clamp01(finite(snapshot?.sanityRatio, 1 - stressRatio));
  const sanityPercent = Math.round(sanityRatio * presentation.percentageMaximum);
  const band = snapshot?.stressBand === "critical"
    ? "critical"
    : snapshot?.stressBand === "warning"
      ? "warning"
      : "calm";
  const lives = Math.max(0, Math.floor(finite(snapshot?.livesRemaining)));
  const lifeLabel = `${lives} ${lives === 1 ? copy.lifeSingular : copy.lifePlural}`;
  const gpAmount = Math.max(0, finite(gp));
  const riskCopy = copy.lifeRisk;
  const drain = Math.max(0, finite(snapshot?.stressGpDrainPerSecond));
  if (!visible) return {
    visible: false,
    band: "calm",
    critical: false,
    edgeVisible: false,
    overlayVisible: false,
    panicIntensity: 0,
  };
  if (exhausted) {
    return {
      visible: true,
      band: "calm",
      critical: false,
      edgeVisible: false,
      overlayVisible: false,
      panicIntensity: 0,
      iconRole: "crest",
      title: copy.endedTitle,
      detail: copy.endedDetail,
      titleColor: colors.endedTitle,
      detailColor: colors.neutralDetail,
    };
  }
  if (pending) {
    return {
      visible: true,
      band: "calm",
      critical: false,
      edgeVisible: false,
      overlayVisible: false,
      panicIntensity: 0,
      iconRole: "crest",
      title: copy.pendingTitle,
      detail: copy.pendingDetail,
      titleColor: colors.warningTitle,
      detailColor: colors.neutralDetail,
    };
  }
  const isCritical = band === "critical";
  const nearDeathThreshold = Math.max(0, finite(risk.nearDeathGpThreshold));
  const lastBreathThreshold = Math.max(0, finite(risk.lastBreathGpThreshold));
  const nearDeath = gpAmount <= nearDeathThreshold;
  const lastBreath = gpAmount <= lastBreathThreshold;
  const extreme = isCritical
    && sanityPercent <= presentation.thresholds.extremeSanityPercent;
  const panicIntensity = Math.max(
    stressRatio,
    nearDeath ? presentation.thresholds.nearDeathVisualIntensity : 0,
  );
  const peripheralIntensity = smoothstepRange(
    presentation.thresholds.peripheralStartStressRatio,
    presentation.thresholds.peripheralFullStressRatio, panicIntensity,
  );
  const echoIntensity = smoothstepRange(
    presentation.thresholds.echoStartStressRatio,
    presentation.thresholds.echoFullStressRatio, panicIntensity,
  );
  const realitySlipIntensity = smoothstepRange(
    presentation.thresholds.realitySlipStartStressRatio,
    presentation.thresholds.realitySlipFullStressRatio, panicIntensity,
  );
  const statusCueIntensity = smoothstepRange(
    presentation.thresholds.uneaseStartStressRatio,
    presentation.thresholds.bannerStartStressRatio, panicIntensity,
  );
  const overlayVisible = isCritical || nearDeath;
  const bannerIntensity = overlayVisible
      ? smoothstepRange(
        presentation.thresholds.bannerStartStressRatio,
        presentation.thresholds.bannerFullStressRatio, panicIntensity,
      )
    : 0;
  const edgeVisible = peripheralIntensity > presentation.thresholds.visibilityEpsilon;
  const severity = extreme
    ? "extreme"
    : isCritical
      ? "critical"
      : stressRatio >= presentation.thresholds.severeStartStressRatio
        ? "severe"
        : band === "warning"
          ? "fracturing"
          : stressRatio >= presentation.thresholds.frayingStartStressRatio
            ? "fraying"
            : stressRatio >= presentation.thresholds.uneaseStartStressRatio
              ? "uneasy"
              : "stable";
  const gpLeft = `${Math.ceil(gpAmount)} ${copy.gpLeftSuffix}`;
  const zeroOutcome = copy.deathAtZero;
  const nearDeathPrefix = copy.deathClosePrefix;
  const lastBreathPrefix = copy.deathImminentPrefix;
  const criticalPrefix = extreme ? copy.extremePrefix : copy.criticalPrefix;
  const panicStartDepth = Math.max(0, Math.round(finite(snapshot?.panicStartDepth, finite(risk.panicStartDepth))));
  const panicResistance = Math.max(0, Math.round(finite(snapshot?.panicResistanceMeters)));
  const deadzoneMultiplier = Math.max(1, Math.round(finite(snapshot?.consumedStarStressMultiplier, 1)));
  const stableAction = snapshot?.insideConsumedStarScar === true ? `${copy.deadzonePanicPrefix} ${deadzoneMultiplier}X  •  ${copy.deadzoneAction}` : `${copy.panicLinePrefix} ${panicStartDepth}${copy.depthUnit}  •  ${copy.levelResistancePrefix} +${panicResistance}${copy.depthUnit}`;
  const statusPrefix = severity === "severe"
    ? copy.severePrefix
    : severity === "fracturing"
      ? copy.warningPrefix
      : severity === "fraying"
        ? copy.frayingPrefix
        : severity === "uneasy"
          ? copy.uneasePrefix
          : copy.hardcorePrefix;
  const statusAction = severity === "severe"
    ? copy.severeAction
    : severity === "fracturing"
      ? copy.warningAction
      : severity === "fraying"
        ? copy.frayingAction
        : severity === "uneasy"
          ? copy.uneaseAction
          : stableAction;
  const title = lastBreath
    ? `${lastBreathPrefix}  •  ${copy.sanityPrefix} ${sanityPercent}%`
    : nearDeath
      ? `${nearDeathPrefix}  •  ${copy.sanityPrefix} ${sanityPercent}%`
      : isCritical
        ? `${criticalPrefix}  •  ${copy.sanityPrefix} ${sanityPercent}%`
        : severity === "stable"
          ? `${statusPrefix}  •  ${lifeLabel}  •  ${copy.sanityPrefix} ${sanityPercent}%`
          : `${statusPrefix}  •  ${copy.sanityPrefix} ${sanityPercent}%  •  ${lifeLabel}`;
  const detail = lastBreath
    ? `${gpLeft}  •  ${zeroOutcome}`
    : nearDeath
      ? `${gpLeft}  •  ${riskCopy}  •  ${copy.criticalAction}`
      : isCritical
        ? `${copy.drainPrefix} ${drain.toFixed(1)} GP/S  •  ${copy.criticalAction}`
        : statusAction;
  const statusTitleColor = severity === "severe" || severity === "fracturing"
    ? colors.warningTitle
    : severity === "fraying"
      ? colors.frayingTitle
      : severity === "uneasy" ? colors.uneaseTitle : colors.calmTitle;
  const statusDetailColor = severity === "severe" || severity === "fracturing"
    ? colors.warningDetail
    : severity === "fraying"
      ? colors.frayingDetail
      : severity === "uneasy" ? colors.uneaseDetail : colors.neutralDetail;
  return {
    visible: true,
    band,
    critical: isCritical,
    extreme,
    nearDeath,
    lastBreath,
    severity,
    sanityPercent,
    panicIntensity,
    peripheralIntensity,
    echoIntensity,
    realitySlipIntensity,
    bannerIntensity,
    statusCueIntensity,
    edgeVisible,
    overlayVisible,
    iconRole: overlayVisible
      ? "critical"
      : severity === "stable" || severity === "uneasy" ? "crest" : "warning",
    title,
    detail,
    titleColor: overlayVisible
      ? colors.criticalTitle
      : statusTitleColor,
    detailColor: overlayVisible
      ? colors.criticalDetail
      : statusDetailColor,
    overlayTitle: title,
    overlayDetail: detail,
  };
}
