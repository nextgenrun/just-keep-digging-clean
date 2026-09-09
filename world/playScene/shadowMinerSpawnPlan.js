import { createShadowMinerBehaviorPlan } from "./shadowMinerBehaviorPlan.js";

export function createShadowMinerSpawnPlan({
  config,
  history,
  scene,
  mode,
  random,
  time,
  encounterBand,
  encounterProfile,
  depthProfile,
  depthMeters,
  forced,
  selectAdmissionPose,
}) {
  const behaviorPlan = createShadowMinerBehaviorPlan(
    config,
    encounterBand,
    encounterProfile,
    {
      random,
      forcedBehaviorId: mode.behaviorId,
      depthProfile,
      depthMeters,
    },
  );
  if (!behaviorPlan) return null;

  const replayEndAt = time - config.interaction.minimumTrailingDelayMs;
  let replayStartAt = time - behaviorPlan.replayDelayMs;
  let replayWindow = history.getWindowSummary(replayStartAt, replayEndAt);
  if (!replayWindow.ready || !replayWindow.startPose) {
    replayStartAt = Math.max(time - config.history.retentionMs, history.samples?.[0]?.time ?? replayStartAt);
    replayWindow = history.getWindowSummary(replayStartAt, replayEndAt);
    if (!replayWindow.ready || !replayWindow.startPose) return null;
  }

  let admissionPose = forced && !config.admission.enforceOnForcedSpawn
    ? replayWindow.startPose
    : selectAdmissionPose(
      history,
      scene,
      config,
      replayStartAt,
      replayEndAt,
      {
        targetDistanceTiles: behaviorPlan.targetDistanceTiles,
        preferActionPose: behaviorPlan.preferActionPose,
      },
    );
  if (!admissionPose) {
    replayStartAt = Math.max(time - config.history.retentionMs, history.samples?.[0]?.time ?? replayStartAt);
    admissionPose = selectAdmissionPose(history, scene, config, replayStartAt, replayEndAt, {
      targetDistanceTiles: behaviorPlan.targetDistanceTiles,
      preferActionPose: behaviorPlan.preferActionPose,
    });
  }
  if (!admissionPose) return null;

  const admittedWindow = history.getWindowSummary(
    admissionPose.time,
    replayEndAt,
  );
  if (!admittedWindow.ready) return null;
  return Object.freeze({
    behaviorPlan,
    replayStartAt,
    admissionPose,
    admittedWindow,
  });
}
