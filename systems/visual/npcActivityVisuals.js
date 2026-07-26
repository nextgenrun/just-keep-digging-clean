function moveTowards(current, target, distance) {
  if (Math.abs(target - current) <= distance) return target;
  return current + Math.sign(target - current) * distance;
}

function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function randomRange(random, minimum, maximum) {
  return minimum + random() * (maximum - minimum);
}

function lockVisualToActor(visual, actor) {
  visual.setPosition?.(actor.anchorX, actor.anchorY);
  visual.setRotation?.(0);
  visual.setDisplaySize?.(actor.displaySize, actor.displaySize);
  visual.setFlipX?.(actor.originalFlipX);
}

export function createNpcActivityActor(
  scene,
  npc,
  merchant,
  keys,
  baseVisual,
  presentation,
  config,
) {
  const overlay = scene.add.image(presentation.x, presentation.y, keys.work);
  overlay
    .setOrigin(0.5, 1)
    .setDepth(presentation.depth + config.render.activityDepthOffset)
    .setDisplaySize(presentation.displaySize, presentation.displaySize)
    .setAlpha(0)
    .setVisible(false);
  return {
    npc,
    merchant,
    keys,
    baseVisual,
    overlay,
    anchorX: presentation.x,
    anchorY: presentation.y,
    displaySize: presentation.displaySize,
    state: "quiet",
    stateEndsAt: Number.POSITIVE_INFINITY,
    nextEventAt: null,
    reactionReadyAt: 0,
    reactedDuringVisit: false,
    playerNear: false,
    poseBlend: 0,
    originalFlipX: Boolean(baseVisual.flipX),
  };
}

export function startNpcPose(actor, state, time) {
  actor.state = state;
  actor.stateEndsAt = time + actor.merchant.durationsMs[state];
  actor.overlay.setTexture(actor.keys[state]).setVisible(true);
}

export function finishNpcActor(actor, time, config, random) {
  actor.state = "quiet";
  actor.stateEndsAt = Number.POSITIVE_INFINITY;
  actor.nextEventAt = time + randomRange(
    random,
    config.schedule.eventGapMinMs,
    config.schedule.eventGapMaxMs,
  );
}

export function updateNpcActorVisual(actor, _time, delta, config) {
  const activePose = actor.state !== "quiet";
  const crossfadeMs = activePose
    ? config.render.crossfadeInMs
    : config.render.crossfadeOutMs;
  actor.poseBlend = moveTowards(
    actor.poseBlend,
    activePose ? 1 : 0,
    delta / crossfadeMs,
  );
  for (const visual of [actor.baseVisual, actor.overlay]) {
    lockVisualToActor(visual, actor);
  }

  const baseAlpha = 1 - smoothstep(actor.poseBlend);
  actor.baseVisual.setAlpha?.(baseAlpha);
  actor.baseVisual.setVisible?.(
    baseAlpha > config.render.visibleAlphaThreshold,
  );
  const activityAlpha = smoothstep(actor.poseBlend);
  actor.overlay.setAlpha(activityAlpha);
  actor.overlay.setVisible(
    activityAlpha > config.render.visibleAlphaThreshold,
  );
}

export function restoreNpcBase(actor) {
  lockVisualToActor(actor.baseVisual, actor);
  actor.baseVisual?.setAlpha?.(1).setVisible?.(true);
}
