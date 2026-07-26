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

function quietLayers(actor) {
  return [actor.baseVisual, actor.quietOverlay];
}

function lockVisualToActor(visual, actor) {
  visual.setPosition?.(actor.anchorX, actor.anchorY);
  visual.setRotation?.(0);
  visual.setDisplaySize?.(actor.displaySize, actor.displaySize);
  visual.setFlipX?.(actor.originalFlipX);
}

function resetQuietFrame(actor, frameId) {
  for (const visual of quietLayers(actor)) {
    visual.setTexture?.(actor.keys[frameId]);
  }
  actor.quietFrameId = frameId;
  actor.quietSequenceIndex = 0;
  actor.quietVisibleLayerIndex = 0;
  actor.quietOutgoingLayerIndex = 1;
  actor.quietTransitionBlend = 1;
  actor.quietTransitioning = false;
}

function startQuietFrameTransition(actor, frameId) {
  const incomingIndex = 1 - actor.quietVisibleLayerIndex;
  const layers = quietLayers(actor);
  layers[incomingIndex].setTexture?.(actor.keys[frameId]).setVisible?.(true);
  actor.quietOutgoingLayerIndex = actor.quietVisibleLayerIndex;
  actor.quietVisibleLayerIndex = incomingIndex;
  actor.quietFrameId = frameId;
  actor.quietTransitionBlend = 0;
  actor.quietTransitioning = true;
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
  baseVisual.setTexture?.(keys.quiet0);
  const quietOverlay = scene.add.image(
    presentation.x,
    presentation.y,
    keys.quiet0,
  );
  quietOverlay
    .setOrigin(0.5, 1)
    .setDepth(presentation.depth)
    .setDisplaySize(presentation.displaySize, presentation.displaySize)
    .setAlpha(0)
    .setVisible(false);
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
    quietOverlay,
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
    quietFrameId: "quiet0",
    quietSequenceIndex: 0,
    quietVisibleLayerIndex: 0,
    quietOutgoingLayerIndex: 1,
    quietTransitionBlend: 1,
    quietTransitioning: false,
    nextQuietFrameAt: null,
    originalFlipX: Boolean(baseVisual.flipX),
  };
}

export function startNpcPose(actor, state, time) {
  actor.state = state;
  actor.stateEndsAt = time + actor.merchant.durationsMs[state];
  actor.overlay.setTexture(actor.keys[state]).setVisible(true);
}

export function finishNpcActor(actor, time, config, random, snap = false) {
  actor.state = "quiet";
  actor.stateEndsAt = Number.POSITIVE_INFINITY;
  actor.nextEventAt = time + randomRange(
    random,
    config.schedule.eventGapMinMs,
    config.schedule.eventGapMaxMs,
  );
  resetQuietFrame(actor, config.quietLoop.sequence[0]);
  actor.nextQuietFrameAt = time + randomRange(
    random,
    config.quietLoop.initialHoldMinMs,
    config.quietLoop.initialHoldMaxMs,
  );
  if (!snap) return;
  actor.poseBlend = 0;
  actor.overlay.setAlpha(0).setVisible(false);
  actor.baseVisual.setAlpha?.(1).setVisible?.(true);
  actor.quietOverlay.setAlpha?.(0).setVisible?.(false);
}

export function updateNpcQuietLoop(actor, time, config, random) {
  if (actor.state !== "quiet") return;
  const loop = config.quietLoop;
  if (actor.nextQuietFrameAt === null) {
    actor.nextQuietFrameAt = time + randomRange(
      random,
      loop.initialHoldMinMs,
      loop.initialHoldMaxMs,
    );
    return;
  }
  let advanced = 0;
  while (
    time >= actor.nextQuietFrameAt
    && advanced < loop.maxFramesPerUpdate
  ) {
    actor.quietSequenceIndex = (
      actor.quietSequenceIndex + 1
    ) % loop.sequence.length;
    const frameId = loop.sequence[actor.quietSequenceIndex];
    startQuietFrameTransition(actor, frameId);
    let holdMs = loop.frameDurationsMs[actor.quietSequenceIndex];
    if (actor.quietSequenceIndex === 0) {
      holdMs += randomRange(
        random,
        loop.loopGapMinMs,
        loop.loopGapMaxMs,
      );
    }
    actor.nextQuietFrameAt += holdMs;
    advanced += 1;
  }
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
  if (actor.quietTransitioning) {
    actor.quietTransitionBlend = moveTowards(
      actor.quietTransitionBlend,
      1,
      delta / config.quietLoop.transitionMs,
    );
    if (actor.quietTransitionBlend >= 1) {
      actor.quietTransitioning = false;
    }
  }

  for (const visual of [
    actor.baseVisual,
    actor.quietOverlay,
    actor.overlay,
  ]) {
    lockVisualToActor(visual, actor);
  }

  const quietAlpha = 1 - smoothstep(actor.poseBlend);
  const layers = quietLayers(actor);
  if (actor.quietTransitioning) {
    const frameBlend = smoothstep(actor.quietTransitionBlend);
    const outgoing = layers[actor.quietOutgoingLayerIndex];
    const incoming = layers[actor.quietVisibleLayerIndex];
    outgoing.setAlpha?.((1 - frameBlend) * quietAlpha);
    outgoing.setVisible?.(
      (1 - frameBlend) * quietAlpha
        > config.render.visibleAlphaThreshold,
    );
    incoming.setAlpha?.(frameBlend * quietAlpha);
    incoming.setVisible?.(
      frameBlend * quietAlpha > config.render.visibleAlphaThreshold,
    );
  } else {
    layers.forEach((visual, index) => {
      const alpha = index === actor.quietVisibleLayerIndex ? quietAlpha : 0;
      visual.setAlpha?.(alpha);
      visual.setVisible?.(alpha > config.render.visibleAlphaThreshold);
    });
  }

  const activityAlpha = smoothstep(actor.poseBlend);
  actor.overlay.setAlpha(activityAlpha);
  actor.overlay.setVisible(
    activityAlpha > config.render.visibleAlphaThreshold,
  );
}

export function restoreNpcBase(actor) {
  actor.baseVisual?.setTexture?.(actor.keys.quiet0);
  lockVisualToActor(actor.baseVisual, actor);
  actor.baseVisual?.setAlpha?.(1).setVisible?.(true);
}
