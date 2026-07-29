import { GRAVEBORER_WURM_CONFIG } from "../../values/graveborerWurm.js";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const lerp = (start, end, ratio) => start + (end - start) * ratio;

/**
 * Resolves one committed Wurm pass. The profile is frozen when its warning
 * begins, so depth escalation never turns an already-marked line into a trap.
 */
export function resolveGraveborerWurmDifficulty(
  depthTiles,
  passIndex = 1,
  devTest10x = false,
  config = GRAVEBORER_WURM_CONFIG,
) {
  const cfg = config.difficulty;
  const minimumDepth = config.activation.minDepthTiles;
  const depth = Math.max(minimumDepth, Number(depthTiles) || minimumDepth);
  const depthRatio = clamp(
    (depth - minimumDepth) / Math.max(1, cfg.fullDangerDepthTiles - minimumDepth),
    0,
    1,
  );
  const passCount = clamp(
    cfg.passCountAtStart
      + Math.floor((depth - minimumDepth) / cfg.passCountDepthStepTiles),
    cfg.passCountAtStart,
    cfg.maximumPassCount,
  );
  const resolvedPassIndex = clamp(
    Math.floor(Number(passIndex) || 1),
    1,
    passCount,
  );
  const passOffset = resolvedPassIndex - 1;
  const productionWarningMs = Math.max(
    cfg.minimumWarningMs,
    Math.round(
      lerp(config.timing.warningMs, cfg.warningMsAtFullDepth, depthRatio)
        - passOffset * cfg.warningReductionPerPassMs,
    ),
  );
  const warningMs = devTest10x
    ? Math.max(
      cfg.minimumDevWarningMs,
      Math.min(config.timing.devWarningMs, productionWarningMs),
    )
    : productionWarningMs;
  const travelMs = Math.max(
    cfg.minimumTravelMs,
    Math.round(
      lerp(config.timing.travelMs, cfg.travelMsAtFullDepth, depthRatio)
        - passOffset * cfg.travelReductionPerPassMs,
    ),
  );

  return Object.freeze({
    depthTiles: depth,
    depthRatio,
    threatPercent: Math.round(
      lerp(cfg.threatPercentAtStart, cfg.threatPercentAtFullDepth, depthRatio),
    ),
    passIndex: resolvedPassIndex,
    passCount,
    warningMs,
    travelMs,
    headDamageRatio: Math.min(
      cfg.maximumHeadDamageRatio,
      lerp(
        config.combat.headDamageMaxGpRatio,
        cfg.headDamageRatioAtFullDepth,
        depthRatio,
      ) + passOffset * cfg.headDamageRatioPerPass,
    ),
    bodyDamageRatio: Math.min(
      cfg.maximumBodyDamageRatio,
      lerp(
        config.combat.bodyDamageMaxGpRatio,
        cfg.bodyDamageRatioAtFullDepth,
        depthRatio,
      ) + passOffset * cfg.bodyDamageRatioPerPass,
    ),
    minimumHeadDamageGp: Math.min(
      cfg.maximumMinimumHeadDamageGp,
      Math.round(
        lerp(
          config.combat.minimumHeadDamageGp,
          cfg.minimumHeadDamageAtFullDepth,
          depthRatio,
        ) + passOffset * cfg.minimumHeadDamagePerPass,
      ),
    ),
    minimumBodyDamageGp: Math.min(
      cfg.maximumMinimumBodyDamageGp,
      Math.round(
        lerp(
          config.combat.minimumBodyDamageGp,
          cfg.minimumBodyDamageAtFullDepth,
          depthRatio,
        ) + passOffset * cfg.minimumBodyDamagePerPass,
      ),
    ),
  });
}
