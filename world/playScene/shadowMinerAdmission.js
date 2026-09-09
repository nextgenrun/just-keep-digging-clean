export function measureShadowMinerDistanceToPlayer(scene, pose) {
  const player = scene?.player;
  if (!pose || !Number.isFinite(player?.x) || !Number.isFinite(player?.y)) {
    return null;
  }
  return Math.hypot(pose.x - player.x, pose.y - player.y)
    / scene.config.tileSize;
}

export function isShadowMinerPoseInsideCamera(scene, config, pose) {
  const view = scene?.cameras?.main?.worldView;
  if (!view || !pose) return true;
  const width = Number(pose.displayWidth) || 0;
  const height = Number(pose.displayHeight) || 0;
  const originX = Number.isFinite(Number(pose.originX)) ? Number(pose.originX) : 0.5;
  const originY = Number.isFinite(Number(pose.originY)) ? Number(pose.originY) : 0.5;
  const centerX = pose.x + width * (0.5 - originX);
  const centerY = pose.y + height * (0.5 - originY);
  const margin = config.admission.cameraMarginTiles * scene.config.tileSize;
  const right = Number.isFinite(view.right) ? view.right : view.x + view.width;
  const bottom = Number.isFinite(view.bottom) ? view.bottom : view.y + view.height;
  return centerX >= view.x + margin
    && centerX <= right - margin
    && centerY >= view.y + margin
    && centerY <= bottom - margin;
}

export function selectShadowMinerAdmissionPose(
  history,
  scene,
  config,
  startTime,
  endTime,
  options = {},
) {
  const isGloballyAdmitted = pose => {
    const distanceTiles = measureShadowMinerDistanceToPlayer(scene, pose);
    return Number.isFinite(distanceTiles)
      && distanceTiles >= config.admission.minimumDistanceTiles
      && distanceTiles <= config.admission.maximumDistanceTiles
      && isShadowMinerPoseInsideCamera(scene, config, pose);
  };
  const targetDistance = Number(options.targetDistanceTiles);
  const tolerance = config.behavior.admissionTargetToleranceTiles;
  const isNearTarget = pose => {
    if (!isGloballyAdmitted(pose) || !Number.isFinite(targetDistance)) return false;
    const distanceTiles = measureShadowMinerDistanceToPlayer(scene, pose);
    return Math.abs(distanceTiles - targetDistance) <= tolerance;
  };
  const find = predicate => history.findFirstPose?.(
    startTime,
    endTime,
    predicate,
  ) || null;

  if (options.preferActionPose) {
    const targetedAction = find(pose => pose.action === true && isNearTarget(pose));
    if (targetedAction) return targetedAction;
  }
  const targetedPose = find(isNearTarget);
  if (targetedPose) return targetedPose;
  if (options.preferActionPose) {
    const admittedAction = find(pose => pose.action === true && isGloballyAdmitted(pose));
    if (admittedAction) return admittedAction;
  }
  return find(isGloballyAdmitted);
}
