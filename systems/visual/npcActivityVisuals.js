const TAU = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;

function moveTowards(current, target, distance) {
  if (Math.abs(target - current) <= distance) return target;
  return current + Math.sign(target - current) * distance;
}

function randomRange(random, min, max) {
  return min + random() * (max - min);
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
    currentX: presentation.x,
    displaySize: presentation.displaySize,
    state: "quiet",
    stateEndsAt: Number.POSITIVE_INFINITY,
    nextEventAt: null,
    reactionReadyAt: 0,
    reactedDuringVisit: false,
    playerNear: false,
    poseBlend: 0,
    walk: null,
    originalFlipX: Boolean(baseVisual.flipX),
  };
}

export function startNpcPose(actor, state, time) {
  actor.state = state;
  actor.stateEndsAt = time + actor.merchant.durationsMs[state];
  actor.walk = null;
  actor.currentX = actor.anchorX;
  actor.overlay.setTexture(actor.keys[state]).setVisible(true);
}

export function startNpcWalk(actor, time, scene, config, random) {
  const direction = random() < 0.5 ? -1 : 1;
  const distancePx = actor.merchant.roamTiles * scene.config.tileSize;
  actor.state = "walk";
  actor.stateEndsAt = Number.POSITIVE_INFINITY;
  actor.walk = {
    phase: "out",
    direction,
    targetX: actor.anchorX + direction * distancePx,
    pauseUntil: time,
  };
}

export function finishNpcActor(actor, time, config, random, snap = false) {
  actor.state = "quiet";
  actor.stateEndsAt = Number.POSITIVE_INFINITY;
  actor.walk = null;
  actor.currentX = actor.anchorX;
  actor.nextEventAt = time + randomRange(
    random,
    config.schedule.eventGapMinMs,
    config.schedule.eventGapMaxMs,
  );
  if (!snap) return;
  actor.poseBlend = 0;
  actor.overlay.setAlpha(0).setVisible(false);
  actor.baseVisual.setAlpha?.(1);
}

export function updateNpcWalk(actor, time, delta, scene, config, random) {
  const walk = actor.walk;
  if (!walk) return;
  const speed = config.walk.speedTilesPerSecond
    * scene.config.tileSize
    * delta / 1000;
  if (walk.phase === "out") {
    actor.currentX = moveTowards(actor.currentX, walk.targetX, speed);
    if (actor.currentX === walk.targetX) {
      walk.phase = "pause";
      walk.pauseUntil = time + randomRange(
        random,
        config.walk.pauseMinMs,
        config.walk.pauseMaxMs,
      );
    }
    return;
  }
  if (walk.phase === "pause") {
    if (time >= walk.pauseUntil) walk.phase = "home";
    return;
  }
  actor.currentX = moveTowards(actor.currentX, actor.anchorX, speed);
  if (actor.currentX === actor.anchorX) {
    finishNpcActor(actor, time, config, random, true);
  }
}

function resolveTransform(actor, time, config) {
  if (actor.state === "walk") {
    const moving = actor.walk?.phase !== "pause";
    const wave = moving
      ? Math.sin(time / 1000 * config.walk.stepHz * TAU)
      : 0;
    const lift = moving ? Math.abs(wave) * config.walk.bobPx : 0;
    return {
      y: -lift,
      rotation: (actor.walk?.direction || 0) * config.walk.leanDegrees * DEG_TO_RAD,
      scaleX: 1 + Math.abs(wave) * config.walk.squash,
      scaleY: 1 - Math.abs(wave) * config.walk.squash,
    };
  }
  const profile = config.motion[actor.state] || config.motion.quiet;
  const cycleMs = profile.cycleMs || actor.merchant.quietCycleMs;
  const phase = actor.merchant.breathPhase * TAU;
  const wave = Math.sin(time / cycleMs * TAU + phase);
  return {
    y: -wave * profile.bobPx,
    rotation: wave * profile.swayDegrees * DEG_TO_RAD,
    scaleX: 1 + wave * profile.scaleX,
    scaleY: 1 + wave * profile.scaleY,
  };
}

export function updateNpcActorVisual(actor, time, delta, config) {
  const activePose = actor.state !== "quiet" && actor.state !== "walk";
  actor.poseBlend = moveTowards(
    actor.poseBlend,
    activePose ? 1 : 0,
    delta / config.render.crossfadeMs,
  );
  const transform = resolveTransform(actor, time, config);
  const flipX = actor.state === "walk"
    ? actor.walk?.direction < 0
    : actor.originalFlipX;
  for (const visual of [actor.baseVisual, actor.overlay]) {
    visual.setPosition?.(actor.currentX, actor.anchorY + transform.y);
    visual.setRotation?.(transform.rotation);
    visual.setDisplaySize?.(
      actor.displaySize * transform.scaleX,
      actor.displaySize * transform.scaleY,
    );
    visual.setFlipX?.(flipX);
  }
  actor.baseVisual.setAlpha?.(1 - actor.poseBlend);
  actor.overlay.setAlpha(actor.poseBlend);
  actor.overlay.setVisible(actor.poseBlend > config.render.visibleAlphaThreshold);
}

export function restoreNpcBase(actor) {
  actor.baseVisual?.setPosition?.(actor.anchorX, actor.anchorY);
  actor.baseVisual?.setRotation?.(0);
  actor.baseVisual?.setDisplaySize?.(actor.displaySize, actor.displaySize);
  actor.baseVisual?.setFlipX?.(actor.originalFlipX);
  actor.baseVisual?.setAlpha?.(1);
}
